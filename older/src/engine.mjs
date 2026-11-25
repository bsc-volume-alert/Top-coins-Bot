// engine.mjs — ties the feed to series, signals, entries and storage (spec older-2). One collector for every book.
// Input: reconstructed PumpSwap pool states (one per reserve-changing event: buy, sell, deposit, withdraw, boost) and a clock tick.
// The engine never fetches anything itself; providers (creation time, back-fill, SOL/USD, entry verification) are injected.
// Clocks: `t` is OUR receive time (seconds). A signal exists when our engine can use it, so execution delays start there, never at
// the transaction's block time. Both times are stored. Replayed (held) events update history but never create signals.
import * as S from "./spec.mjs";
import { Series, Coverage } from "./series.mjs";
import { newCoin, evaluate } from "./signals.mjs";
import { newEntry, advance, observe, entryDone, inventories, dueAt, unresolvedCount, requestManual, exposure, manualOpen } from "./book.mjs";
import { liquidityUsd, staticImpact } from "./fills.mjs";
import { feeKnown } from "./risk.mjs";
import { parseInfo, judge } from "./gates.mjs";
/** why a coin cannot be bought on the LIVE method (pool-state fills model no transfer fee), or null */
const LAG_EDGES = [1, 2, 3, 5, 10, 30, 60, Infinity]; // upper edges (seconds) of the stream-delay histogram kept for diagnostics
const liveBlock = (info) => { const rk = info?.risk; return rk?.status === "restricted" ? `restricted (${(rk.blocking || []).join(", ") || "transfer restriction"})` : rk?.fee_bps > 0 ? `a transfer fee of ${rk.fee_bps} bps, which the live method does not model` : !feeKnown(info) ? "transfer fee not known" : null; };
const ALL_ROWS = S.POLICIES.flatMap((p) => S.STOPS.map((s) => p + "|" + s)), ROWS = ALL_ROWS.length; // the rows of one book on one buy: exit policy × stop

const POLLED_UNSUPPORTED = new Set(["HH-BREAK", "HH-BREAK-4H", ...S.HH_FAST.map((x) => x[0]), ...S.ANY_AGE]), NEVER = () => false;
export class Engine {
  constructor({ store = null, solUsd = () => null, needCreation = () => {}, onFill = () => {}, onEntry = () => {}, log = () => {}, firstStart = null } = {}) {
    this.cov = new Coverage(); this.feedCov = new Coverage(); /* feed + restarts only: what pool-state trust and exit flags depend on */ this.coins = new Map(); this.entries = new Map(); this.byMint = new Map();
    this.store = store; this.solUsd = solUsd; this.needCreation = needCreation; this.onFill = onFill; this.onEntry = onEntry; this.log = log; this.firstStart = firstStart;
    this.stats = { events: 0, swaps: 0, otherPool: 0, noSolUsd: 0, noCreation: 0, evals: 0, cands: 0, entries: 0, notes: 0, replayed: 0, tooOld: 0, lastT: null, evalMsMax: 0 };
    this.dirtyBars = new Map(); this.usdDown = false; this.dirty = new Set(); this.lastCkpt = 0; this.entriesUntil = null; this.onOwnership = () => {};
    this.gates = null; this.readGate = null; this.clock = () => Date.now() / 1000; // older-11: the owner's gates (spec GATES_11) — null = nothing asked, nothing gated; readGate(mint) → the provider's token-info answer; clock = the receive clock the answers are timed on
    this.gateMode = "cancel"; this.readGateLate = null; // older-11: "cancel" = a buy that fails the gates or has no reading in time is cancelled; "label" = every signal is bought as before and carries the verdict (see _gateLabel)
    this.minAgeS = S.MIN_AGE_S; // older-11: the age from which the books that normally start at 8 hours are evaluated in this run (default: 8 hours, as always)
    this.inactive = new Set(S.FAMILIES.filter((f) => !S.BOOKS_LEGACY.includes(f))); // older-11: books that make no new buy in this run (default: the legacy 29 buy, VOL100K does not) — see setBooks
    this.stream = { at: null, lag: null, first: null, open: -Infinity, kind: "connect", need: 0, goodSince: null, promote: false, spans: [], acctAt: null, diag: { n: 0, sum: 0, max: 0, hist: LAG_EDGES.map(() => 0), secs: { current: 0, late: 0, recovering: 0, silence: 0, unknown: 0 }, spells: { late: 0, silence: 0, connect: 0 }, longest: { late: 0, silence: 0, connect: 0 }, recent: [] } }; this.cov.reasons.add("stream"); /* stream freshness: ONE state machine for pricing and for signal coverage — see tx() */ this.rebuy = true; /* spec REBUY: buying again after a sale; false = older-8 */ this.pollCov = new Coverage(); // continuity of PRICE POLLING (the Solana-wide adapter); independent of the PumpSwap WebSocket
    this.stats.prices = 0; this.stats.riskBlocked = 0; this.stats.quotes = 0;
  }
  /** the time the program was away. warm = the price memory was read back (warm.mjs): the signal coverage then closes the gap
   *  itself when the feed is up again (Coverage.resume / up), tolerated or not by its real length. Pool-state trust and exit
   *  flags (feedCov) always treat a restart as a plain gap. */
  restartGap(from, to, { warm = false } = {}) { if (from != null && to > from) { if (!warm) this.cov.gaps.push([from, to]); this.feedCov.gaps.push([from, to]); this.store?.feedEvent(to, warm ? "restart-gap (warm: price memory read back)" : "restart-gap", `${from}`); } }
  /** STREAM FRESHNESS (ninth review B; state machine corrected after Codex's review of 3537ada, findings B1, B3, B4).
   *  `t` is OUR receive time; every decoded transaction also carries its block time, so t − blockTs measures how far behind
   *  the chain the stream is running at that moment (normally 1.0–1.3 s). A stream can stay connected and still be late: on
   *  23 Nov 2026 it ran up to 112 s behind while every state looked 1 s old by receive time. Evidence is per transaction;
   *  a lifetime average says nothing about now.
   *
   *  ONE STATE MACHINE, used both for pricing (freshAt → trustedAt) and for signal coverage (cov reason "stream"):
   *    CURRENT        the delay is measured, within FEED_MAX_LAG_S, and the newest measurement is no older than that limit.
   *    INTERRUPTED    from one of three causes until it is over:
   *      "connect"  start-up or a reconnect: the delay of the connection is unknown. Over at the FIRST good measurement on
   *                 it (the written initial-connection policy; a reconnect is already a gap in pool-state trust).
   *      "late"     a measurement above the limit.
   *      "silence"  no transaction at all for longer than the limit while connected (starts at the last evidence).
   *                 "late" and "silence" are over only after a GOOD-EVIDENCE PERIOD of FEED_MAX_LAG_S seconds: it starts at
   *                 the first good measurement and starts again after a bad measurement, a silence longer than the limit
   *                 or a disconnect. One good measurement after a quiet stretch proves nothing (B4).
   *  While interrupted: pool states are still installed (the chain of reserves must stay continuous) but an observation
   *  creates no price history, no signal, no peak and no stop, and no order is priced from a pool state. A pending buy runs
   *  into the existing 5 s pricing timeout; a triggered sale stays pending with its real delay (24 h unresolved rule
   *  unchanged). The whole interruption is a gap in SIGNAL coverage — silence included (B3) — so no exact window and no
   *  fresh crossing spans it; hour-scale windows follow the declared policy for any non-warm gap.
   *  For POOL-STATE TRUST a late spell or a silence is not a gap in itself: if nothing was lost, a pool's state is valid
   *  again once the stream is current. Reconnects, lost events, overflow, chain discontinuities and quarantined states keep
   *  their own, stronger requirements (feedCov, coinLost, approx).
   *
   *  ORDER WITHIN ONE TRANSACTION (B1) — tx(): (1) its delay is noted — this can START an interruption at once but can only
   *  PROPOSE the end of one; (2) the transaction's committed pool states are installed; (3) only then does the end of the
   *  interruption take effect (txDone) and every open live position is valued once on the state NOW in force. A recovery
   *  therefore never prices an order on the state that the recovering transaction itself replaced.
   *
   *  What this does and does not see: a DELIVERED transaction that is too old is detected whichever pool it is on. An
   *  update that has not arrived cannot be detected by this check; one good measurement does not prove every pool is
   *  synchronised — the chain checks (reduceTx continuity) and the entry verification remain the per-pool evidence.
   *  Not a rule about quiet pools: an old, unchanged pool state stays valid while other transactions keep the delay measured. */
  tx(t, lagS = null, apply = null) { if (lagS != null) this._note(t, lagS);
    // UNKNOWN IS NOT CURRENT, PER TRANSACTION (review of 2328675, finding 2): a transaction whose own delay could not be measured
    // installs its pool states (the chain of reserves must stay continuous) and nothing else — its observations create no price
    // history, no signal, no peak and no stop, exactly like an observation on a stream that is not current. It never borrows
    // the freshness of another transaction. The next MEASURED transaction is judged on its own evidence.
    const un = lagS == null && !!apply; if (un) this._unmeasured = true; try { if (apply) apply(); } finally { if (un) this._unmeasured = false; this.txDone(t); } }
  /** a transaction that carries freshness evidence only (no state of a pool we follow) */
  noteLag(t, lagS) { this.tx(t, lagS); }
  _interrupt(from, kind, why) { const L = this.stream; L.open = kind === "late" ? from - 1e-6 : from; L.kind = kind; L.need = kind === "connect" ? 0 : S.FEED_MAX_LAG_S; L.goodSince = null; L.promote = false; L.diag.spells[kind]++; this.stats.lateSpells = L.diag.spells.late; this.stats.silences = L.diag.spells.silence;
    this.cov.drop(from, "stream"); if (kind !== "connect") this.store?.feedEvent(from, kind, `${why}: no signal and no pricing until the stream has been current for ${S.FEED_MAX_LAG_S} s`); }
  _note(t, lagS) {
    if (!(lagS >= 0) || !isFinite(lagS)) return; const L = this.stream, D = L.diag, LIM = S.FEED_MAX_LAG_S, late = lagS > LIM, prev = L.at, quiet = prev != null && t - prev > LIM;
    // bounded diagnostics: where the wall-clock time went, and the distribution of the delay
    if (L.acctAt != null && t > L.acctAt) D.secs[L.open === null ? (quiet ? "silence" : "current") : L.kind === "connect" ? "unknown" : L.goodSince != null && !quiet ? "recovering" : L.kind] += t - L.acctAt; L.acctAt = t;
    D.n++; D.sum += lagS; if (lagS > D.max) D.max = lagS; D.hist[LAG_EDGES.findIndex((x) => lagS <= x)]++;
    if (L.open === null && quiet) this._interrupt(prev, "silence", `no transaction for ${(t - prev).toFixed(1)} s on a connected stream`);
    L.at = t; L.lag = lagS; this.stats.streamLagS = +lagS.toFixed(2);
    if (late) { if (L.open === null) this._interrupt(t, "late", `stream ${lagS.toFixed(1)} s behind the chain (limit ${LIM} s)`); else if (L.kind !== "late") { L.kind = "late"; L.need = LIM; D.spells.late++; this.stats.lateSpells = D.spells.late; } L.goodSince = null; L.promote = false; return; }
    if (L.open === null) return; // current, and still current
    if (L.goodSince == null || quiet) L.goodSince = t; // the good-evidence period starts at the first good measurement — and again after bad evidence, a long silence or a disconnect
    L.promote = t - L.goodSince >= L.need; // proposed only: takes effect in txDone, after this transaction's states are installed
  }
  /** end of a transaction: a proposed end of the interruption takes effect now, with this transaction's states in force */
  txDone(t) { const L = this.stream; if (!L.promote) return; L.promote = false; const from = L.open, kind = L.kind, D = L.diag;
    if (from > -Infinity) { L.spans.push([from, t]); if (L.spans.length > 4000) L.spans.splice(0, 2000); if (t - from > D.longest[kind]) D.longest[kind] = +(t - from).toFixed(1); D.recent.push({ kind, from: +from.toFixed(1), to: +t.toFixed(1) }); if (D.recent.length > 30) D.recent.shift(); }
    if (L.first == null) L.first = t; L.open = null; L.kind = null; L.goodSince = null;
    this.cov.up(t, "stream"); if (!this.cov.down) for (const c of this.coins.values()) if (c.mode !== "polled") c.series.startLive(t);
    if (kind !== "connect") this.store?.feedEvent(t, "current", `stream current again: ${kind} interruption of ${(t - from).toFixed(1)} s`);
    this._revalue(t); }
  /** was the stream current at receive time `at`? */
  freshAt(at) { const L = this.stream; if (L.first == null || at < L.first) return false; if (L.open !== null) { if (at > L.open) return false; } else if (L.at == null || at > L.at + S.FEED_MAX_LAG_S) return false;
    for (let i = L.spans.length - 1; i >= 0; i--) { const [a, b] = L.spans[i]; if (b <= at) break; if (a < at) return false; } return true; }
  /** bounded diagnostics for the status report: enough for a delay distribution, the time spent in each state and the coverage cost.
   *  `now` = the time the report is made. The state and the seconds counters are given AS OF NOW: the time since the last
   *  measurement is added to the state it belongs to (without changing the engine), and a stream that has gone quiet for
   *  longer than the limit is reported as "silence" even if the clock has not run since. Without `now` the figures stop at
   *  the last measurement and say so (as_of). */
  streamStatus(now = null) { const L = this.stream, D = L.diag, LIM = S.FEED_MAX_LAG_S, at = now != null && L.at != null && now > L.at ? now : L.at, idle = at != null && L.at != null ? at - L.at : 0, quiet = idle > LIM;
    const key = L.open === null ? (quiet ? "silence" : "current") : L.kind === "connect" ? "unknown" : L.goodSince != null && !quiet ? "recovering" : L.kind;
    const secs = { ...D.secs }, t0 = L.acctAt; if (now != null && t0 != null && now > t0) secs[key] += now - t0;
    const state = key === "unknown" ? "unknown (delay not measured on this connection)" : key;
    return { state, as_of: now ?? L.at, lag_s: L.lag != null ? +L.lag.toFixed(2) : null, measured_at: L.at, since_last_measurement_s: L.at != null && at != null ? +idle.toFixed(1) : null, interrupted_since: L.open !== null && L.open > -Infinity ? +L.open.toFixed(1) : (L.open === null && quiet ? +L.at.toFixed(1) : null), limit_s: LIM,
      measurements: D.n, lag_mean_s: D.n ? +(D.sum / D.n).toFixed(3) : null, lag_max_s: +D.max.toFixed(1), lag_hist: Object.fromEntries(LAG_EDGES.map((x, i) => [x === Infinity ? ">60" : "<=" + x, D.hist[i]])),
      seconds: Object.fromEntries(Object.entries(secs).map(([k, v]) => [k, +v.toFixed(1)])), seconds_total: +Object.values(secs).reduce((a, b) => a + b, 0).toFixed(1), interruptions: { ...D.spells }, longest_s: { ...D.longest }, recent: D.recent.slice(-10), late_events_skipped: this.stats.lateEvents || 0 }; }
  /** ELIGIBILITY GATE shared by EVERY path that can fill a pending live buy — the ordinary run, a new state, and the
   *  revaluation at the end of an interruption (Codex B2: recovery used to fill without it). A pending buy on a coin that is
   *  now restricted, now known to charge a fee, or whose fee is no longer known is CANCELLED, never filled. Positions that
   *  are already filled are never cancelled here; a later change is recorded on them (riskUpdated). Returns true if cancelled. */
  _blocked(e, c, was, sig, ids, t = null) { if (e.exec === "routed-quote" || e.status !== "pending") return false; const bad = liveBlock(c.info);
    if (!bad) { const why = e.gate && t != null && t >= e.schedT ? (this.gateMode === "label" ? this._gateLabel(e, c) : this._gate(e)) : null; if (!why) return false; // older-11: the owner's gates, decided once, at the time of the buy
      e.status = "cancelled"; e.flags.push("cancelled before the buy: " + why); if (e.gate.verdict === "no reading") this._giveBack(e, c); this._after(e, was, sig, ids, c); return true; }
    e.status = "cancelled"; e.flags.push(`cancelled before the buy: the coin's transfer restrictions changed between the decision and the fill — now ${bad}`); this.stats.cancelledAtFill = (this.stats.cancelledAtFill || 0) + 1; this._after(e, was, sig, ids, c); return true; }
  /** older-11 — ask the provider for the coin's reading at the buy signal. Never awaited: the answer is stored on the entry with
   *  the time it arrived, and _gate reads whatever is there at the time of the buy. */
  _gateAsk(e, mint, t) {
    const g = (e.gate = { req_t: t, resp_t: null }), G = this._G(); G.asked++; const supply = this.coins.get(mint)?.state?.supply ?? null; // the coin's supply as the chain reported it with the latest swap (for the all-time-high market cap)
    const done = (fill) => { g.resp_t = this.clock(); g.ms = Math.max(0, Math.round((g.resp_t - g.req_t) * 1000)); fill(); G.ms_sum += g.ms; if (g.ms > G.ms_max) G.ms_max = g.ms;
      if (this.gateMode === "label") { this._labelArrived(e, mint, supply); this.store?.saveEntry(e); return; }
      if (g.verdict && g.verdict !== "pass" && g.verdict !== "fail" && !g.late) { g.late = true; G.late++; } // it arrived after the buy had been decided without it: kept as a record only
      this.store?.saveEntry(e); };
    let p; try { p = this.readGate ? Promise.resolve(this.readGate(mint)) : Promise.reject(new Error("no reader configured")); } catch (err) { p = Promise.reject(err); }
    p.then((info) => done(() => { g.reading = parseInfo(info, supply, this._pump(mint)); G.answered++; }), (err) => done(() => { g.error = String(err?.message || err).slice(0, 160); G.errors++; }));
  }
  /** older-11 — the gate verdict for a pending buy whose time has come (called from _blocked, once per entry). Returns null if
   *  the buy may go ahead for at least one of its books (books that fail are taken off the entry and recorded in gate.dropped),
   *  or the reason for cancelling it. A reading counts only if it had arrived by the scheduled buy (+ GATE_WAIT_S). */
  _gate(e) {
    // FAIL CLOSED (review of bbe1115, finding 4): only an explicit "pass" lets a buy through. Any other verdict already on the
    // entry — set before a restart, or by a call that was interrupted — cancels it. The counters exist whether or not this
    // process has asked for a reading itself (a pending buy restored from the database arrives here without one).
    const g = e.gate, G = this._G(), by = e.schedT + S.GATE_WAIT_S;
    if (g.verdict) return g.verdict === "pass" ? null : g.verdict === "fail" ? "the owner's gates: " + (g.fails || []).join("; ") : "no provider reading had arrived by the time of the buy (not treated as zero)";
    if (g.resp_t != null && g.resp_t > by && !g.late) { g.late = true; G.late++; } // it did arrive, but after the time of the buy: labelled late whenever that is found out
    if (g.resp_t == null || g.resp_t > by) { g.verdict = "no reading"; G.no_reading++; return g.resp_t == null ? "no provider reading had arrived by the time of the buy (not treated as zero)" : `the provider reading arrived ${(g.resp_t - e.schedT).toFixed(2)} s after the time of the buy`; }
    if (!g.reading) { g.verdict = "no reading"; G.no_reading++; return `the provider reading failed (${g.error || "no answer"}) — not treated as zero`; }
    const res = new Map(e.families.map((f) => [f, judge(g.reading, this.gates, f)])), ok = e.families.filter((f) => res.get(f).pass);
    const why = (f) => [...res.get(f).fails, ...res.get(f).missing.map((m) => m + " missing")];
    for (const f of e.families) if (!res.get(f).pass) for (const x of why(f)) { const k = x.includes(":") ? x.split(":")[0].replace(/ \$?[0-9.]+(%|K| SOL)$/, "") : x; G.fails[k] = (G.fails[k] || 0) + 1; } // counted by the gate's name ("top 10 holders", "total fees"…), without the figure
    g.options = res.get(ok[0] ?? e.families[0]).options;
    if (!ok.length) { g.verdict = "fail"; G.failed++; g.fails = [...new Set(e.families.flatMap(why))]; return "the owner's gates: " + g.fails.join("; "); }
    if (ok.length < e.families.length) { g.dropped = Object.fromEntries(e.families.filter((f) => !res.get(f).pass).map((f) => [f, why(f)])); e.families = ok; e.flags.push("books taken off this buy by their gates: " + Object.entries(g.dropped).map(([f, w]) => `${f} (${w.join("; ")})`).join(", ")); }
    g.verdict = "pass"; G.passed++; return null;
  }
  _G() { return (this.stats.gate ||= { asked: 0, answered: 0, errors: 0, late: 0, passed: 0, failed: 0, no_reading: 0, attempts_returned: 0, held: 0, ms_sum: 0, ms_max: 0, fails: {}, late_passed: 0, late_failed: 0, retries: 0, retry_errors: 0, rule_cancelled: 0 }); }
  /** is this a coin whose supply can only have fallen since its high? Only a coin observed on its canonical pump.fun pool
   *  (created with 1,000,000,000 tokens, minting closed). Anything else: the all-time-high market cap is not established. */
  _pump(mint) { const c = this.coins.get(mint); return !!c && c.mode !== "polled" && (c.info?.population ?? "pumpswap-canonical") === "pumpswap-canonical"; }
  /** ───────── LABEL, DON'T CANCEL (owner 25 Nov 2026 11:35 "keep the original and add the additional filters"; ChatGPT's second
   *  opinion of the same day) ─────────
   *  gateMode "label": every signal is paper-bought exactly as without the gates — the BASELINE. The provider reading is
   *  recorded on the buy and each of its books is labelled:
   *    passed IN TIME   the reading had arrived by the time of the buy (decision + 1 s) and passes that book's gates
   *    failed IN TIME   it had arrived and fails (the reasons are kept)
   *    passed / failed LATE   the reading arrived after the buy. Exploratory only: it can reflect what happened after the entry,
   *                     so it never counts as a usable filter result
   *    no reading       nothing arrived at all (kept apart from a genuine failure)
   *  If the first request fails (refused, not sent, error) ONE ordinary queued request is made for a buy that is still alive,
   *  so the label is late rather than missing. Nothing is cancelled for a label, no book is taken off a buy, no attempt is
   *  given back: the baseline is exactly the ungated run, and the filtered views are FIRST-OPPORTUNITY views of it (they cannot
   *  show a strategy that skips a first signal and buys a later one).
   *  ONE EXCEPTION, because it is the rule and not a filter: DIP15K bought on "the provider's all-time high" (no $100K peak
   *  was watched) needs that all-time high, in time, to be $100K or more — otherwise the rule itself is not established and
   *  that book is taken off the buy. Execution guards (transfer restrictions, untrusted prices) are untouched. */
  _judgeAll(e, late) { const g = e.gate, G = this._G(); g.by = {};
    for (const f of e.families) { const r = judge(g.reading, this.gates, f); g.by[f] = r.pass ? { pass: true } : { pass: false, why: [...r.fails, ...r.missing.map((m) => m + " missing")] }; if (!r.pass && !late) for (const x of g.by[f].why) { const k = x.includes(":") ? x.split(":")[0].replace(/ \$?[0-9.]+(%|K| SOL)$/, "") : x; G.fails[k] = (G.fails[k] || 0) + 1; } }
    const any = e.families.some((f) => g.by[f].pass); g.options = judge(g.reading, this.gates, e.families.find((f) => g.by[f].pass) ?? e.families[0]).options;
    g.verdict = any ? "pass" : "fail"; if (!any) g.fails = [...new Set(e.families.flatMap((f) => g.by[f].why))];
    if (late) { g.late = true; any ? G.late_passed++ : G.late_failed++; } else { g.timely = true; any ? G.passed++ : G.failed++; } }
  _gateLabel(e, c) {
    const g = e.gate, G = this._G(), by = e.schedT + S.GATE_WAIT_S; if (g.at_buy) return null; const timely = !!g.reading && g.resp_t != null && g.resp_t <= by; g.at_buy = timely ? "reading" : "none";
    // the DIP15K rule itself: without a watched peak, the provider's all-time high must be there, in time, and at $100K or more
    const needs = e.families.filter((f) => f === S.DIP && (e.cands || []).some((x) => x.family === f && /^provider/.test(x.detail?.peak_evidence || "")));
    if (needs.length && !(timely && g.reading.ath_usd >= S.DIP_PEAK_USD)) { const why = timely ? (g.reading.ath_usd == null ? "the provider gave no usable all-time high" : `the provider's all-time high is $${Math.round(g.reading.ath_usd / 1000)}K`) : "no provider reading had arrived by the time of the buy";
      G.rule_cancelled++; g.rule = `DIP15K not established: ${why} (it needs $100K or more)`;
      if (needs.length === e.families.length) { g.verdict = timely ? "fail" : "no reading"; if (!timely) G.no_reading++; return g.rule; }
      e.families = e.families.filter((f) => !needs.includes(f)); e.flags.push(g.rule); }
    if (timely) this._judgeAll(e, false); else { g.verdict = "no reading"; G.no_reading++; if (g.reading) this._judgeAll(e, true); } // a reading that is already here but arrived after the buy time is a late label at once
    return null; }
  /** label mode: a reading (or an error) has just arrived for this entry */
  _labelArrived(e, mint, supply) { const g = e.gate, G = this._G();
    if (g.reading) { if (g.at_buy && g.verdict === "no reading" && e.status !== "cancelled") this._judgeAll(e, true); else if (g.at_buy && !g.late && !g.timely) { g.late = true; G.late++; } return; } // before the buy: judged at the buy
    if (!g.retried && this.readGateLate && e.status !== "cancelled") { g.retried = true; g.first_error = g.error; G.retries++; // one ordinary, queued request: late is better than missing
      let p; try { p = Promise.resolve(this.readGateLate(mint)); } catch (err) { p = Promise.reject(err); }
      p.then((info) => { g.resp_t = this.clock(); g.ms = Math.max(0, Math.round((g.resp_t - g.req_t) * 1000)); g.reading = parseInfo(info, supply, this._pump(mint)); g.error = undefined; G.answered++; this._labelArrived(e, mint, supply); this.store?.saveEntry(e); },
        (err) => { g.error = String(err?.message || err).slice(0, 160); G.retry_errors++; this.store?.saveEntry(e); }); } }
  /** older-11, owner's decision 25 Nov 2026 11:30 UK: a buy cancelled because NO READING arrived in time (the provider refused,
   *  failed or answered late — never the coin's fault) does not use up the book's one buy of that coin. The book's mark for the
   *  coin and age group is taken back, in memory and in the database, and the cancelled entry says so. What it may then buy on
   *  is a FRESH signal, not the old one: the book is held on this coin until its rule has been seen NOT firing once (_decide),
   *  so a rule that stays true from one trade to the next (a volume level, a run of new highs) cannot re-ask on every trade.
   *  A coin that FAILED the gates keeps its mark: that is a decision about the coin, unchanged. */
  _giveBack(e, c) { const g = c.groups?.[e.ag]; for (const f of e.families) { if (g?.done) delete g.done[f]; (c.gateHold ||= {})[e.ag + "|" + f] = true; }
    e.attempt_returned = true; e.flags.push("no reading from the provider: this does not count as the book's one buy of this coin — it may buy on a fresh signal later"); this._G().attempts_returned++; this.store?.dropDecisions?.(e.id); }
  /** the stream is current again at t. For each open live position whose pool state is trusted now:
   *    1. its DUE CLOCK TRANSITIONS are run first (advance): a maximum-hold or clock-book deadline that passed during the
   *       interruption is triggered at its own time, exactly as a tick would have done — the clock may have been held up
   *       while the backlog was processed (Codex's review of 161d545: without this the position was still "open" here, the
   *       next tick triggered the sale with a scheduled time inside the interruption, and nothing priced it afterwards);
   *    2. then it is valued once on the state IN FORCE NOW (observe): peaks, stops, and every overdue order — priced with
   *       the delay it really had.
   *  Both steps go through the same eligibility gate (_blocked) and the same trust test as every other path. */
  _revalue(t) { for (const [mint, ids] of this.byMint) { if (!ids.size) continue; const c = this.coins.get(mint); if (!c || c.mode === "polled" || !this.trustedAt(c, t)) continue;
    for (const id of [...ids]) { const e = this.entries.get(id); if (!e || e.exec === "routed-quote") continue; const was = e.status, sig = e.versions.map((v) => v.status).join(); if (this._blocked(e, c, was, sig, ids, t)) continue;
      advance(e, t, c.state, (at) => this.trustedAt(c, at), this.feedCov); observe(e, c.state, t, this.feedCov);
      this._after(e, was, sig, ids, c, true); } } } // a price WAS observed here: a peak raised by the recovery is check-pointed like any other (review of 2328675, finding 1 — it used to be saved only if advance() had changed something, so a crash could lose the recovered high)
  /** the risk reader read this coin's mint account: a fee or restriction found on a coin already HELD on the live method is
   *  recorded on the position. The position, its exits and any unresolved exposure stay exactly as they are — nothing is
   *  deleted and no sale is invented. (A pending live buy is cancelled by _run.) */
  riskUpdated(mint) { const c = this.coins.get(mint), ids = this.byMint.get(mint); if (!c || !ids) return; const bad = liveBlock(c.info); if (!bad || !c.info.risk || c.info.risk.status === "missing") return;
    for (const id of ids) { const e = this.entries.get(id); if (!e || e.exec === "routed-quote" || e.status !== "filled" || e.riskAfter === bad) continue; e.riskAfter = bad; e.flags.push(`found after the buy: the coin now has ${bad} — this position's result does not model it`); e.touched = true; } }
  feedUp(t) { if (this.stream.acctAt == null) this.stream.acctAt = t; /* "unknown" seconds are counted from the first connect */ this.feedCov.up(t, "feed"); this.cov.up(t, "feed"); if (!this.cov.down) for (const c of this.coins.values()) if (c.mode !== "polled") c.series.startLive(t); /* a sampled coin's history starts at its own first sample, never at the PumpSwap feed's */ this.store?.feedEvent(t, "up"); }
  feedDown(t, why = "") { this.feedCov.drop(t, "feed"); this.cov.drop(t, "feed"); this.store?.feedEvent(t, "down", why);
    /* the delay of the next connection is unknown until measured; an interruption already open needs its good-evidence period again */ const L = this.stream; if (L.open === null) this._interrupt(t, "connect", why); else { L.goodSince = null; L.promote = false; } }
  /** a watched coin. mode "live" = decoded pool events (PumpSwap adapter); "polled" = sampled prices + routed quotes (Solana-wide adapter).
   *  A mint is observed in ONE mode; `info` carries the launchpad-neutral record (origin, venues, token program, sources, risk…). */
  coin(mint, { pool = null, createTs = null, mode = null, info = null, t = null } = {}) {
    let c = this.coins.get(mint);
    if (!c) {
      const polled = mode === "polled", cov = polled ? this.pollCov : this.cov, sr = new Series(mint, cov);
      if (polled) { if (t != null) sr.startLive(t); } else if (!cov.down && cov.upSince !== null) sr.startLive(cov.upSince);
      c = newCoin(mint, createTs, sr); c.pool = pool; c.lostAt = null; c.mode = polled ? "polled" : "live"; c.info = {}; this.coins.set(mint, c);
    }
    if (info) Object.assign(c.info, info);
    if (pool && !c.pool) c.pool = pool; if (createTs && !c.createTs) c.createTs = createTs;
    return c;
  }
  /** this coin's own data was lost from t (held swaps overflowed, state rejected…): its history and state restart at t */
  coinLost(mint, t) { const c = this.coin(mint); c.series.restartAt(t); c.series.raw = []; c.series.prevT = null; c.lostAt = t; this.stats.coinLost = (this.stats.coinLost || 0) + 1; }
  /** a pool created after the feed started: before it, the coin traded on the bonding curve, which this feed does not see */
  historyFrom(mint, t) { const c = this.coin(mint); if (c.series.histFrom === null || c.series.histFrom < t) c.series.restartAt(t); }
  /** RESTART SAFETY: a coin is observed by the method its unfinished entries were opened with. If the stored mode disagrees
   *  (it was not saved when the coin moved to live observation), the entry's method wins — otherwise the position would be
   *  stranded: ignored by the live adapter and never quoted by the sampled one. */
  forceMode(mint, mode, pool = null) { const c = this.coin(mint); if (c.mode === mode) return false; c.series = new Series(mint, mode === "polled" ? this.pollCov : this.cov); c.mode = mode; c.state = null; c.sw = null; c.rug = null; c.lostAt = null; c.info.monitoring_mode = mode; if (mode === "live") { Object.assign(c.info, { population: "pumpswap-canonical", price_source: "pool events" }); if (pool) c.pool = pool; } this.stats.modeForced = (this.stats.modeForced || 0) + 1; return true; }
  /** save every open position now (called on shutdown): a planned restart loses no peak */
  flush() { let n = 0; if (this.store) for (const e of this.entries.values()) { this.store.saveEntry(e); n++; } this.dirty.clear(); return n; }
  setRef(mint, ag, ref) { const c = this.coin(mint); const g = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); if (!g.ref || g.ref.status !== "OK") g.ref = ref; }
  restoreDone(mint, ag, family) { const c = this.coin(mint); (c.groups[ag] ||= { ref: null, done: {}, logged: {} }).done[family] = 1; }
  addEntry(e) { this.entries.set(e.id, e); let s = this.byMint.get(e.mint); if (!s) this.byMint.set(e.mint, (s = new Set())); s.add(e.id); }
  /** is the coin's current state known-good at time `at`? (observed, and nothing unknown between its observation and `at`) */
  /** is the coin's current state the one IN FORCE and known-good at time `at`? It must have been observed at or before `at`
   *  (a state that arrived later can never price an earlier moment), after any loss of the coin's data, with no feed gap in between.
   *  A state reconstructed from a boost event is NOT trusted for fills: it is only confirmed (or contradicted) by the next swap.
   *  And the STREAM must be current at `at` (freshAt): receipt time alone does not show that the stream had caught up. */
  trustedAt(c, at) { return !!c.state && !c.state.approx && !c.state.unmeasured && c.state.t <= at && (c.lostAt === null || c.state.t >= c.lostAt) && this.feedCov.gapsIn(c.state.t, at).length === 0 && this.freshAt(at); }
  _run(mint, upTo, c) {
    const ids = this.byMint.get(mint); if (!ids) return;
    // each entry keeps the execution method it was opened with: a routed-quote entry is NEVER priced from a pool state
    for (const id of ids) { const e = this.entries.get(id), was = e.status, sig = e.versions.map((v) => v.status).join(), q = e.exec === "routed-quote";
      if (this._blocked(e, c, was, sig, ids, upTo)) continue; // eligibility is checked again at the fill (see _blocked)
      const mut = advance(e, upTo, q ? undefined : c.state, q ? NEVER : (at) => this.trustedAt(c, at), q ? this.pollCov : this.feedCov); this._after(e, was, sig, ids, c, mut); }
  }
  /** `seen` = the entry's decision state may have changed without a status change: a price was observed (peak, last value,
   *  runner high), or advance() reported a change. A clock tick that changed nothing does NOT mark the entry for saving: before
   *  23 Nov 2026 every open position was re-written to the database every second whether or not anything had happened to it,
   *  which at 1,350 open positions was about 38 MB of writing per second and a full processor core (the feed fell behind). */
  _after(e, was, sig, ids, c, seen = true) {
    if (was === "pending" && e.status === "filled") { e.fill.pool = c.pool; if (c.info?.risk?.read_at) e.fill.risk_age_s = Math.round(e.fill.t - c.info.risk.read_at); /* age of the transfer-restriction reading the fill relied on */ this.onFill(e, c); }
    if (e.status !== was || e.versions.map((v) => v.status).join() !== sig || e.touched) { e.touched = false; this.store?.saveEntry(e); this.dirty.delete(e.id); }
    else if (e.status === "filled" && seen) this.dirty.add(e.id); // peaks, last values, runner highs: check-pointed at most CHECKPOINT_S after they change (see tick)
    if (entryDone(e)) { this.store?.saveEntry(e); ids.delete(e.id); this.entries.delete(e.id); /* finished entries live in the database only */ }
  }

  /** ev: { t, mint, pool, kind, state:{base, quote, feeBuy, feeSell, supply}, sol, isBuy, user, sig, slot, blockTs, replay } */
  onEvent(ev) {
    const t0 = performance.now(); this.stats.events++; this.stats.lastT = ev.t; if (ev.kind === "buy" || ev.kind === "sell") this.stats.swaps++;
    let c = this.coins.get(ev.mint);
    // OWNERSHIP: one observation method per mint. A coin first found by the sampled adapter stays sampled while it has any
    // pending or open entry; only when it has none does it move to live observation, with a fresh history (no mixed evidence).
    if (c && c.mode === "polled") {
      if (this.byMint.get(ev.mint)?.size) { this.stats.liveIgnoredSampled = (this.stats.liveIgnoredSampled || 0) + 1; return; }
      const sr = new Series(ev.mint, this.cov); sr.startLive(ev.t); c.series = sr; c.mode = "live"; c.state = null; c.sw = null; c.rug = null; c.lostAt = null; c.pool = ev.pool;
      Object.assign(c.info, { population: "pumpswap-canonical", monitoring_mode: "live", price_source: "pool events" }); this.stats.movedToLive = (this.stats.movedToLive || 0) + 1; this.onOwnership(ev.mint, "live");
      this.store?.setCoinMode(ev.mint, c.pool, c.info); // PERSISTED: after a restart this coin must come back as live, or a live position on it would be stranded
    }
    c = this.coin(ev.mint, { pool: ev.pool });
    if (c.pool && ev.pool !== c.pool) { this.stats.otherPool++; return; } // price and fills come from the canonical pool only
    if (c.series.lastT != null && ev.t <= c.series.lastT) ev = { ...ev, t: c.series.lastT + 1e-6 }; // strictly ordered observations per coin
    // 1) orders scheduled before this event execute against the state that was in force until now
    if (!ev.replay) this._run(ev.mint, ev.t, c);
    // 2) the new state
    const prev = c.state; const st = { ...ev.state, feeBuy: ev.state.feeBuy ?? prev?.feeBuy ?? null, feeSell: ev.state.feeSell ?? prev?.feeSell ?? null, supply: ev.state.supply ?? prev?.supply ?? null, t: ev.t,
      st_sig: ev.sig ?? null, st_slot: ev.slot ?? null,
      ...(this._unmeasured && !ev.replay ? { unmeasured: true } : {}) }; // a state installed by a transaction whose delay is unknown (see tx): kept for the continuity of the reserves, but it prices NOTHING (trustedAt) until a measured transaction of this pool replaces it // the transaction this state was committed by: lets a fill or a sale be checked later against that transaction's own balances (evidence only)
    c.state = st; if (st.supply) c.supply = st.supply;
    // QUARANTINE: a state rebuilt from a boost event is an estimate until the next swap confirms it — it prices no fill (trustedAt),
    // moves no peak or stop, and creates no price observation or signal. Counted.
    if (st.approx) { this.stats.approxStates = (this.stats.approxStates || 0) + 1; if (c.series.breakOpen(ev.t)) this.stats.priceBreaks = (this.stats.priceBreaks || 0) + 1; return; } // recorded on the coin as a price-history break
    c.series.breakClose(ev.t); // a confirmed state ends any quarantine; the interval itself stays unusable
    // STREAM NOT CURRENT (late, or its delay unknown — see noteLag): the state above is kept, nothing else is done with this
    // observation: no valuation, peak or stop, no price history, no signal.
    if (!ev.replay && !this.freshAt(ev.t)) { this.stats.lateEvents = (this.stats.lateEvents || 0) + 1; return; }
    if (!ev.replay && this._unmeasured) { this.stats.unmeasuredEvents = (this.stats.unmeasuredEvents || 0) + 1; return; } // this transaction's own delay is unknown (see tx)
    // 3) open positions see it (value, peaks, triggers) — in SOL, independent of the USD reference
    if (!ev.replay) { const ids = this.byMint.get(ev.mint); if (ids) for (const id of ids) { const e = this.entries.get(id); if (e.exec === "routed-quote") continue; const was = e.status, sig = e.versions.map((v) => v.status).join(); if (this._blocked(e, c, was, sig, ids, ev.t)) continue; observe(e, st, ev.t, this.feedCov); this._after(e, was, sig, ids, c); } }
    // 4) USD history and signals
    const su = this.solUsd(ev.t);
    if (!su) { this.stats.noSolUsd++; if (!this.usdDown) { this.usdDown = true; this.cov.drop(ev.t, "sol-usd"); this.store?.feedEvent(ev.t, "sol-usd stale: new entries suspended, positions still managed in SOL"); } return; }
    if (this.usdDown) { this.usdDown = false; this.cov.up(ev.t, "sol-usd"); this.store?.feedEvent(ev.t, "sol-usd back"); }
    const px = (st.quote / st.base) * su; // USD per token: pool spot price from effective reserves after this event
    c.series.add(ev.t, px, (ev.sol || 0) * su, ev.isBuy ?? null, ev.buyers?.length > 1 ? ev.buyers.map(([w, sol]) => [w, sol * su]) : (ev.buyers?.[0]?.[0] ?? ev.user ?? null)); // every buyer of the transaction, each with its own volume
    (this.dirtyBars.get(ev.mint) || this.dirtyBars.set(ev.mint, new Set()).get(ev.mint)).add(Math.floor(ev.t / 60));
    if (ev.replay) { this.stats.replayed++; return; }
    if (!c.createTs) { this.stats.noCreation++; this.needCreation(ev.mint); return; }
    const age = ev.t - c.createTs; if (!S.ageGroupAny(age)) { if (age >= S.MIN_AGE_S) this.stats.tooOld++; return; } // from migration on: the first 8 hours are evaluated for the any-age books only (signals.mjs)
    this.stats.evals++; if (age < S.MIN_AGE_S) this.stats.evalsYoung = (this.stats.evalsYoung || 0) + 1;
    const o = { t: ev.t, px, mc: px * c.supply, liqUsd: liquidityUsd(st, su), rtImpact: staticImpact(st) };
    // older-11: a run may evaluate the 8-hour books from an earlier age (this.minAgeS). Between that age and 8 hours the coin is in A0.
    const early = age < S.MIN_AGE_S && age >= this.minAgeS; if (early) this.stats.evalsEarly = (this.stats.evalsEarly || 0) + 1;
    this._decide(c, ev.mint, o, early ? { youngAll: true } : {}, { trigger: { t: ev.t, block_ts: ev.blockTs ?? null, sig: ev.sig ?? null, slot: ev.slot ?? null, kind: ev.kind ?? null, px_usd: px, sol_usd: su, base: st.base, quote_eff: st.quote, fee_buy: st.feeBuy, fee_sell: st.feeSell, supply: c.supply, age_s: Math.round(age), coverage: "covered" } },
      { pop: c.info.population || "pumpswap-canonical", mode: "live", exec: "reconstructed-pool-state", valuation: "pool price × on-chain base supply (from the swap event)", age_basis: c.info.create_src || "token creation (source not recorded)", state_approx: st.approx ?? null });
    const ms = performance.now() - t0; if (ms > this.stats.evalMsMax) this.stats.evalMsMax = +ms.toFixed(1);
  }
  /** MANUAL SALE, paper only (book.mjs, requestManual): the owner sells a quarter, half or all of what he still holds of one
   *  filled buy. Only the request is taken here; it is priced by the ordinary clock 0.7 s later, on a trustworthy state, like
   *  every sale. The rules' own rows of that buy are not touched. Returns { ok, why? }. */
  manualSell(id, frac, t = Date.now() / 1000) { const e = this.entries.get(id); if (!e) return { ok: false, why: "this buy is no longer held (it is finished, or its number is unknown)" };
    const r = requestManual(e, frac, t); const M = (this.stats.manual ||= { asked: 0, refused: 0 }); if (r.ok) { M.asked++; this.store?.saveEntry(e); } else M.refused++; return r; }
  /** older-11: choose the books that may make new buys in this run (a list from S.booksOf). Open positions of other books are untouched. */
  setBooks(list) { const on = new Set(list); this.inactive = new Set(S.FAMILIES.filter((f) => !on.has(f))); this.books = [...on]; }
  /** shared: evaluate the families on one observation and open the (shared) entry */
  _decide(c, mint, o, opts, evidenceExtra, tags) {
    if (this.entriesUntil != null && o.t >= this.entriesUntil) { this.stats.afterEntryWindow = (this.stats.afterEntryWindow || 0) + 1; return null; }
    // EVERY BUY PASSES THE GATES (review of bbe1115, finding 3): the provider reading is asked for and judged on the live method
    // only. With the gates on, a coin observed by sampling is therefore not entered at all — never bought ungated. Counted.
    if (this.gates && tags?.exec === "routed-quote") { this.stats.sampledNotGated = (this.stats.sampledNotGated || 0) + 1; if (!c.gateNoted) { c.gateNoted = true; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: the run's gates are not applied to coins observed by sampling", detail: {} }); } return null; } // the entry window has closed: positions and runner tracking continue, nothing new is opened
    // risk checks only stop entries whose EXECUTION assumption is unsupported (known transfer restrictions); they are not a quality filter
    if (c.info.risk?.status === "restricted") { if (!c.riskNoted) { c.riskNoted = true; this.stats.riskBlocked++; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: token transfer restrictions make the execution assumption unsupported", detail: { risk: c.info.risk } }); } return null; }
    // a transfer-fee coin is entered only where the fee is modelled: the sampled method (the fee is taken off its routed quotes)
    if (c.info.risk?.fee_bps > 0 && c.mode !== "polled") { if (!c.riskNoted) { c.riskNoted = true; this.stats.riskBlocked++; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: transfer-fee coin on the live method, where the fee is not modelled", detail: { fee_bps: c.info.risk.fee_bps } }); } return null; }
    // UNKNOWN IS NOT "NO FEE" (eighth review, B1 — sampled coins; ninth review, A — live coins too): a coin whose token program
    // or Token-2022 extensions have not been read from the chain is not entered. A live coin is marked for the mint-account
    // reader here (risk.riskQueue), so the first decision that needs the answer is what asks for it.
    if (!feeKnown(c.info)) { c.feeWanted = o.t; c.feeWantedFirst ??= o.t; if (!c.feeNoted) this.stats.feeUnknownCoins = (this.stats.feeUnknownCoins || 0) + 1; this.stats.feeUnknown = (this.stats.feeUnknown || 0) + 1; if (!c.feeNoted) { c.feeNoted = true; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: the coin's transfer fee has not been read from the chain yet", detail: { token_program: c.info.token_program ?? null } }); } return null; }
    // BUYING AGAIN (spec REBUY): which rows each book still holds on this coin. A row is held while its entry is pending or the row is
    // not closed. A book may buy again when at least one of its rows is free; the first buy per age group is decided as before.
    const busy = this._busy(mint), tNow = o.t, log24 = (c.rebuys ||= {});
    const again = this.rebuy === false ? null : (f) => { if (busy && (busy.get(f)?.size ?? 0) >= ROWS) return false; const L = log24[f]; if (L) { while (L.length && L[0] < tNow - 86400) L.shift(); if (L.length >= S.REBUY_MAX_PER_DAY) { if (!c.rebuyCapNoted?.[f]) { (c.rebuyCapNoted ||= {})[f] = 1; this.stats.rebuyCapped = (this.stats.rebuyCapped || 0) + 1; this.store?.saveNote(mint, { ag: null, family: f, t: tNow, reason: `safety limit: ${S.REBUY_MAX_PER_DAY} re-buys of this coin by this book in 24 hours — no further re-buy until one ages out`, detail: {} }); } return false; } } return true; };
    if (this.gates && !opts.skip) opts = { ...opts, peakByGate: true }; // older-11: with the owner's gates on, "has been to $100K" is tested on the provider's all-time high at the buy (live method only)
    const r = evaluate(c, o, again ? { ...opts, again } : opts); // engine.rebuy = false (OLDER_REBUY=0): older-8 behaviour, one buy per book, coin and age group
    for (const n of r.notes) { this.stats.notes++; this.store?.saveNote(mint, n); }
    // older-11: a book that is not active in this run makes no new buy. Applied to the finished candidates, so every active book
    // has decided exactly as it would with all books active; the book's own once-per-age-group mark is left as evaluate set it.
    if (this.inactive.size && r.cands.length) { const n = r.cands.length; r.cands = r.cands.filter((x) => !this.inactive.has(x.family)); if (r.cands.length !== n) this.stats.inactiveCands = (this.stats.inactiveCands || 0) + (n - r.cands.length); }
    // a book held on this coin after a buy that got no reading (_giveBack): released the first time its rule does not fire;
    // while it keeps firing without a break the candidate is dropped and the book's mark is taken back again
    if (c.gateHold) { const fired = new Set(r.cands.map((x) => x.ag + "|" + x.family)); for (const k of Object.keys(c.gateHold)) if (!fired.has(k)) delete c.gateHold[k];
      if (!Object.keys(c.gateHold).length) c.gateHold = null; else r.cands = r.cands.filter((x) => { if (!c.gateHold[x.ag + "|" + x.family]) return true; const g = c.groups?.[x.ag]; if (g?.done) delete g.done[x.family]; this._G().held++; return false; }); }
    if (!r.cands.length) return null;
    this.stats.cands += r.cands.length;
    const evidence = { ...r.evidence, ...evidenceExtra }; evidence.trigger.eval_t = Date.now() / 1000;
    // ONE BUY PER SET OF ROWS. A first-attempt candidate takes every row (older-8). A re-buy takes only the rows its book does not
    // hold. Books that fire together and take the same rows share one buy, as before; a clock book rides with its base book's buy
    // on its own tagged rows.
    const free = (x) => (x.again ? ALL_ROWS.filter((k) => !busy?.get(x.family)?.has(k)) : ALL_ROWS), groups = new Map(), clock = [];
    for (const x of r.cands) { const rows = free(x); if (!rows.length) continue; x.rows = rows; if (S.clockTag(x.family) !== false) { clock.push(x); continue; } const k = rows.join(","); (groups.get(k) || groups.set(k, []).get(k)).push(x); }
    for (const x of clock) { const base = S.CLOCK[x.family]?.base, g = [...groups.values()].find((G) => G.some((y) => y.family === base)) || [...groups.values()][0]; if (g) g.push(x); else groups.set("clock:" + x.family, [x]); }
    let firstEntry = null;
    for (const G of groups.values()) {
      const plain = G.filter((x) => S.clockTag(x.family) === false), plainRows = plain.length ? new Set(plain[0].rows) : null, tagRows = new Map(G.filter((x) => S.clockTag(x.family) !== false).map((x) => [S.clockTag(x.family), new Set(x.rows)]));
      const e = newEntry({ mint, pool: c.pool, ag: G[0].ag, t: o.t, families: G.map((x) => x.family), features: G[0].features, mc: o.mc, px: o.px, evidence, startup: this.firstStart != null && o.t < this.firstStart + S.STARTUP_TAG_S,
        pick: (tag, policy, stop) => { const set = tag === false ? plainRows : tagRows.get(tag); return !!set && set.has(policy + "|" + stop); } });
      e.cands = G.map((x) => ({ family: x.family, detail: x.detail }));
      const ag2 = G.filter((x) => x.again).map((x) => x.family); if (ag2.length) { e.again = Object.fromEntries(ag2.map((f) => [f, true])); for (const f of ag2) (log24[f] ||= []).push(o.t); this.stats.rebuys = (this.stats.rebuys || 0) + 1; }
      // WARM RESTART: a decision whose window contains a tolerated restart gap is marked, with the seconds that were not observed
      { const w = Math.max(0, ...G.map((x) => x.detail?.restart_gap_s || 0)); if (w > 0) { e.warm_gap_s = w; e.flags.push(`decision window includes a restart gap of ${w} s that was not observed (warm restart): ${G.filter((x) => x.detail?.restart_gap_s).map((x) => x.family).join(", ")}`); } }
      Object.assign(e, tags); e.token = { symbol: c.info.symbol ?? null, origin: c.info.origin ?? null, origin_evidence: c.info.origin_evidence ?? null, venues: c.info.venues ?? null, token_program: c.info.token_program ?? null, risk_read_at: c.info.risk?.read_at ?? null, risk_age_s: c.info.risk?.read_at ? Math.round(o.t - c.info.risk.read_at) : null, risk_status: c.info.risk?.status ?? "missing", xfer_bps: c.info.risk?.fee_bps || 0, create_src: c.info.create_src ?? null, cadence_s: c.info.cadence_s ?? null };
      this.addEntry(e); this.stats.entries++;
      if (this.gates && e.exec !== "routed-quote") this._gateAsk(e, mint, o.t); // older-11: one provider reading per buy signal, asked now, judged at the buy
      // ONE COMMIT: the entry and its one-buy flags are written together. A stop between the two used to leave a stored entry
      // without its flags, and the same coin could then be bought again by the same book (seventh review, 5).
      if (this.store) { const write = () => { this.store.saveEntry(e); for (const x of G) this.store.saveDecision(mint, x.ag, x.family, o.t, e.id, x.detail); }; this.store.tx ? this.store.tx(write) : write(); }
      this.log(`[entry ${e.id}] ${mint.slice(0, 6)} ${e.ag} ${e.families.join("+")}${e.again ? " (again: " + Object.keys(e.again).join("+") + (e.versions.length < ROWS ? ", " + e.versions.length + " rows" : "") + ")" : ""} mc $${Math.round(o.mc)} (${e.mode})`);
      if (!e.again || Object.keys(e.again).length < e.families.length) { try { this.onEntry(e, c); } catch {} } // background measurements only: never part of the decision (not repeated for a pure re-buy)
      firstEntry ??= e;
    }
    return firstEntry;
  }
  /** NEW-COIN BOOKS (spec NEW_COIN) — a buy decided OUTSIDE the signal evaluator: the caller (newcoin.mjs) has measured the coin
   *  at its age point and found every rule of `family` true. This only opens the paper buy, exactly like any other entry of a
   *  sampled coin: pending now, priced by a routed quote for the exact size requested at or after decision + 1 s, cancelled if
   *  none arrives within 5 s; the fill-time eligibility check (onQuote) applies. One buy per book and coin (the book's ordinary
   *  mark, kept in the database). Returns the entry, or null with the reason in `out.why`.
   *  The coin must already be registered (engine.coin) with its transfer restrictions known. */
  openDirect({ mint, family, t, mc, px, features = {}, detail = {}, trigger = {}, tags = {}, token = {} }, out = {}) {
    const c = this.coins.get(mint); if (!c) { out.why = "coin not registered"; return null; }
    if (this.entriesUntil != null && t >= this.entriesUntil) { this.stats.afterEntryWindow = (this.stats.afterEntryWindow || 0) + 1; out.why = "the run's entry window has closed"; return null; }
    if (this.inactive.has(family)) { out.why = "this book makes no new buy in this run"; return null; }
    if (c.info.risk?.status === "restricted") { out.why = "token transfer restrictions"; return null; } if (!feeKnown(c.info)) { out.why = "the coin's transfer fee is not known"; return null; }
    const ag = "A0", g = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); if (g.done[family]) { out.why = "this book has already bought this coin"; return null; } g.done[family] = 1;
    const e = newEntry({ mint, pool: c.pool, ag, t, families: [family], features, mc, px, evidence: { trigger: { t, eval_t: Date.now() / 1000, coverage: "measured once at the age point", ...trigger } }, startup: this.firstStart != null && t < this.firstStart + S.STARTUP_TAG_S });
    e.cands = [{ family, detail }]; Object.assign(e, { pop: S.NEW_POP, mode: "polled", exec: "routed-quote", valuation: "provider market cap at the measurement", age_basis: "first-pool creation (the launch curve of a launchpad coin is created with the coin); GMGN's creation time is recorded beside it" }, tags);
    e.token = { symbol: c.info.symbol ?? null, origin: c.info.origin ?? null, origin_evidence: c.info.origin_evidence ?? null, venues: c.info.venues ?? null, token_program: c.info.token_program ?? null, risk_read_at: c.info.risk?.read_at ?? null, risk_age_s: c.info.risk?.read_at ? Math.round(t - c.info.risk.read_at) : null, risk_status: c.info.risk?.status ?? "missing", xfer_bps: c.info.risk?.fee_bps || 0, create_src: c.info.create_src ?? null, cadence_s: null, ...token };
    this.addEntry(e); this.stats.entries++; this.stats.directEntries = (this.stats.directEntries || 0) + 1;
    if (this.store) { const write = () => { this.store.saveEntry(e); this.store.saveDecision(mint, ag, family, t, e.id, detail); }; this.store.tx ? this.store.tx(write) : write(); }
    this.log(`[entry ${e.id}] ${mint.slice(0, 6)} ${ag} ${family} mc $${Math.round(mc)} (new coin, routed quote)`);
    try { this.onEntry(e, c); } catch {}
    return e;
  }
  /** NEW-COIN BOOKS: the value of a buy whose every row is sold, ESTIMATED from the provider's price (spec NEW_RUNNER_S) — it
   *  only feeds the 24-hour "how high did it go" measurement of that buy, never a peak, a stop or a sale. x = value / cost. */
  runnerEstimate(id, x, t) { const e = this.entries.get(id); if (!e || e.status !== "filled" || !(x >= 0) || !isFinite(x) || exposure(e) !== 0 || manualOpen(e)) return false; const age = t - e.fill.t; if (age > S.RUNNER_HORIZON_S || e.runner.horizonDone) return false;
    e.runner.est = true; e.runner.estT = t; e.runner.lastX = +x.toFixed(4); let ch = false; if (x > e.runner.maxX) { e.runner.maxX = x; e.runner.maxEst = true; ch = true; } for (const k of S.RUNNER_X) if (x >= k && !e.runner.reached[k]) { e.runner.reached[k] = Math.round(age); ch = true; }
    if (ch) this.dirty.add(e.id); return true; }
  /** rows (exit policy | stop) each book currently holds on this coin: Map(family → Set). null when the coin has no unfinished entry. */
  _busy(mint) {
    const ids = this.byMint.get(mint); if (!ids?.size) return null; const m = new Map();
    for (const id of ids) { const e = this.entries.get(id); if (!e || e.status === "cancelled" || e.status === "failed") continue;
      for (const f of e.families) { const tag = S.clockTag(f); for (const v of e.versions) { if (v.stall !== tag || (e.status !== "pending" && v.status === "closed")) continue; let s = m.get(f); if (!s) m.set(f, (s = new Set())); s.add(v.policy + "|" + v.stop); } } }
    return m;
  }
  pollUp(t) { this.pollCov.up(t, "feed"); }
  pollDown(t, why = "") { this.pollCov.drop(t, "feed"); this.store?.feedEvent(t, "poll-down", why); }
  /** p: { t (response time), mint, px (USD), mc (USD, provider's stated definition), liqUsd, supply, src, cadence_s } */
  onPrice(p) {
    this.stats.prices++; const c = this.coins.get(p.mint); if (!c || c.mode !== "polled") return;
    c.series.add(p.t, p.px, 0, null, null); if (p.supply) c.supply = p.supply; c.info.cadence_s = p.cadence_s ?? c.info.cadence_s;
    (this.dirtyBars.get(p.mint) || this.dirtyBars.set(p.mint, new Set()).get(p.mint)).add(Math.floor(p.t / 60));
    if (!c.createTs) { this.stats.noCreation++; return; }
    // FEE COINS IN THEIR FIRST 8 HOURS (owner, 22 Nov 2026): a coin with a transfer fee of at most XFER_FEE_MAX_BPS is evaluated from
    // its first pool on (age group A0) by the same sampled-method rules; every other sampled coin starts at 8 hours as before
    const age = p.t - c.createTs, feeYoung = age >= 0 && age < S.MIN_AGE_S && c.info.risk?.fee_bps > 0 && c.info.risk.status !== "restricted";
    if (age < S.MIN_AGE_S && !feeYoung) return; if (!S.ageGroupAny(age)) { this.stats.tooOld++; return; } if (feeYoung) this.stats.evalsFeeYoung = (this.stats.evalsFeeYoung || 0) + 1;
    // VALUATION needs a real supply: without the provider's market cap or circulating supply the coin is NOT evaluated — the
    // default supply of a pump.fun coin is never assumed for a token found by sampling
    if (!(p.mc > 0)) { this.stats.noValuation = (this.stats.noValuation || 0) + 1; if (!c.noValNoted) { c.noValNoted = true; this.store?.saveNote(p.mint, { ag: null, family: "*", t: p.t, reason: "not evaluated: no market cap or circulating supply from the provider", detail: {} }); } return; }
    this.stats.evals++;
    const o = { t: p.t, px: p.px, mc: p.mc, liqUsd: p.liqUsd ?? null, rtImpact: null };
    // sampled prices carry no volume: HH-BREAK cannot be evaluated here and is NOT claimed (counted as unsupported for this mode)
    this._decide(c, p.mint, o, { skip: POLLED_UNSUPPORTED, youngAll: feeYoung }, { trigger: { t: p.t, px_usd: p.px, src: p.src ?? null, supply: c.supply, age_s: Math.round(age), cadence_s: p.cadence_s ?? null, coverage: "sampled" } },
      { pop: "solana-wide", mode: "polled", exec: "routed-quote", valuation: p.valuation || "provider market cap", age_basis: "first-pool creation: a lower bound on token age — the 8-hour minimum holds, the 90-day ceiling is NOT verified for this token" });
  }
  /** what the quote provider must price now: [{ id, mint, buy_sol | null, sells: [tok…], due }] — one request per DISTINCT size, never per row */
  quoteNeeds(now) {
    const out = [];
    for (const [mint, ids] of this.byMint) for (const id of ids) { const e = this.entries.get(id); if (e.exec !== "routed-quote") continue;
      if (e.status === "pending") { if (now >= e.schedT) out.push({ id, mint, buy_sol: S.STAKE_SOL, sells: [], due: e.schedT }); }
      else if (e.status === "filled") { const inv = inventories(e); if (inv.length) out.push({ id, mint, buy_sol: null, sells: inv, due: dueAt(e), unresolved: unresolvedCount(e) > 0, runner_only: exposure(e) === 0 && !manualOpen(e) }); } } // runner_only: every row is sold and nothing is waiting — only the 24-hour "how high did it go" measurement still needs a price
    return out;
  }
  /** st: { kind: "quote", reqT, t, buy?, sells } — a routed quote that became available at st.t */
  onQuote(id, st) {
    const e = this.entries.get(id); if (!e || e.exec !== "routed-quote") return; this.stats.quotes++;
    const c = this.coins.get(e.mint), ids = this.byMint.get(e.mint), was = e.status, sig = e.versions.map((v) => v.status).join();
    // ELIGIBILITY IS CHECKED AGAIN AT THE FILL (eighth review, B1): what was true at the decision may not be true a second later.
    // A pending buy on a coin that is now restricted (a fee over the limit, any other restriction) or whose fee is no longer
    // known is CANCELLED, never filled.
    if (e.status === "pending" && st.buy) { const rk = c?.info?.risk, bad = rk?.status === "restricted" ? `restricted (${(rk.blocking || []).join(", ") || "transfer restriction"})` : !feeKnown(c?.info) ? "transfer fee not known" : null;
      if (bad) { e.status = "cancelled"; e.flags.push(`cancelled before the buy: the coin's transfer restrictions changed between the decision and the fill — now ${bad}`); this.stats.cancelledAtFill = (this.stats.cancelledAtFill || 0) + 1; this._after(e, was, sig, ids, c); return; } }
    // ONE CLASSIFICATION: the fee recorded on the entry is the highest fee actually applied to any of its quotes, so the stored
    // tag, the accounting and the reports always agree (a buy tagged fee-free that is priced with a fee becomes a fee-coin buy)
    { const ap = Math.max(st.buy?.xfer_bps || 0, ...(st.sells || []).map((x) => x.xfer_bps || 0)); if (e.token && ap > (e.token.xfer_bps || 0)) { e.token.xfer_bps = ap; e.touched = true; } }
    observe(e, st, st.t, this.pollCov); this._after(e, was, sig, ids, c);
  }

  onSwap(ev) { this.onEvent({ ...ev, kind: ev.isBuy ? "buy" : "sell", state: ev.state ?? { base: ev.base, quote: ev.quote, feeBuy: ev.feeBuy ?? (ev.feeBps != null ? ev.feeBps / 1e4 : null), feeSell: ev.feeSell ?? (ev.feeBps != null ? ev.feeBps / 1e4 : null), supply: ev.supply ?? null } }); }

  tick(now) {
    // a silence is noticed by the CLOCK, not only when the next transaction arrives: status, signal coverage and the
    // seconds counters then say "silence" while it is happening (Codex's review of 161d545)
    { const L = this.stream; if (L.open === null && L.at != null && now - L.at > S.FEED_MAX_LAG_S) this._interrupt(L.at, "silence", `no transaction for ${(now - L.at).toFixed(1)} s on a connected stream (noticed by the clock)`); }
    for (const [mint, ids] of this.byMint) if (ids.size) this._run(mint, now, this.coins.get(mint));
    // CHECKPOINT: an open position's decision state (peak, last value, runner high) is saved at most 1 s after it changes, so a
    // restart resumes with the same high-water marks the uninterrupted run would have had
    if (this.store && this.dirty.size && now - this.lastCkpt >= S.CHECKPOINT_S) { for (const id of this.dirty) { const e = this.entries.get(id); if (e) this.store.saveEntry(e); } this.dirty.clear(); this.lastCkpt = now; }
    const curM = Math.floor(now / 60);
    if (this.store) for (const [mint, ms] of this.dirtyBars) { const c = this.coins.get(mint); for (const m of ms) if (m < curM) { const b = c.series.bars.get(m); if (b) this.store.saveBar(mint, m, b); ms.delete(m); } if (!ms.size) this.dirtyBars.delete(mint); }
  }
  /** memory housekeeping (call about once a minute) */
  prune(now) { for (const [mint, c] of this.coins) { c.series.prune(now); if (c.series.lastT !== null && now - c.series.lastT > S.BAR_KEEP_S && !this.byMint.get(mint)?.size && c.series.raw.length) { this.store?.saveLast(mint, c); c.series.raw = []; } } }
}
