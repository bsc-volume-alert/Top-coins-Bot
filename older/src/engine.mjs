// engine.mjs — ties the feed to series, signals, entries and storage (spec older-2). One collector for every book.
// Input: reconstructed PumpSwap pool states (one per reserve-changing event: buy, sell, deposit, withdraw, boost) and a clock tick.
// The engine never fetches anything itself; providers (creation time, back-fill, SOL/USD, entry verification) are injected.
// Clocks: `t` is OUR receive time (seconds). A signal exists when our engine can use it, so execution delays start there, never at
// the transaction's block time. Both times are stored. Replayed (held) events update history but never create signals.
import * as S from "./spec.mjs";
import { Series, Coverage } from "./series.mjs";
import { newCoin, evaluate } from "./signals.mjs";
import { newEntry, advance, observe, entryDone, inventories, dueAt, unresolvedCount } from "./book.mjs";
import { liquidityUsd, staticImpact } from "./fills.mjs";
import { feeKnown } from "./risk.mjs";
/** why a coin cannot be bought on the LIVE method (pool-state fills model no transfer fee), or null */
const liveBlock = (info) => { const rk = info?.risk; return rk?.status === "restricted" ? `restricted (${(rk.blocking || []).join(", ") || "transfer restriction"})` : rk?.fee_bps > 0 ? `a transfer fee of ${rk.fee_bps} bps, which the live method does not model` : !feeKnown(info) ? "transfer fee not known" : null; };
const ALL_ROWS = S.POLICIES.flatMap((p) => S.STOPS.map((s) => p + "|" + s)), ROWS = ALL_ROWS.length; // the rows of one book on one buy: exit policy × stop

const POLLED_UNSUPPORTED = new Set(["HH-BREAK", "HH-BREAK-4H", ...S.HH_FAST.map((x) => x[0]), ...S.ANY_AGE]), NEVER = () => false;
export class Engine {
  constructor({ store = null, solUsd = () => null, needCreation = () => {}, onFill = () => {}, onEntry = () => {}, log = () => {}, firstStart = null } = {}) {
    this.cov = new Coverage(); this.feedCov = new Coverage(); /* feed + restarts only: what pool-state trust and exit flags depend on */ this.coins = new Map(); this.entries = new Map(); this.byMint = new Map();
    this.store = store; this.solUsd = solUsd; this.needCreation = needCreation; this.onFill = onFill; this.onEntry = onEntry; this.log = log; this.firstStart = firstStart;
    this.stats = { events: 0, swaps: 0, otherPool: 0, noSolUsd: 0, noCreation: 0, evals: 0, cands: 0, entries: 0, notes: 0, replayed: 0, tooOld: 0, lastT: null, evalMsMax: 0 };
    this.dirtyBars = new Map(); this.usdDown = false; this.dirty = new Set(); this.lastCkpt = 0; this.entriesUntil = null; this.onOwnership = () => {};
    this.stream = { at: null, lag: null, late: false, since: null, lastLate: null, spans: [], spells: 0, max: 0 }; /* stream freshness: see noteLag */ this.rebuy = true; /* spec REBUY: buying again after a sale; false = older-8 */ this.pollCov = new Coverage(); // continuity of PRICE POLLING (the Solana-wide adapter); independent of the PumpSwap WebSocket
    this.stats.prices = 0; this.stats.riskBlocked = 0; this.stats.quotes = 0;
  }
  /** the time the program was away. warm = the price memory was read back (warm.mjs): the signal coverage then closes the gap
   *  itself when the feed is up again (Coverage.resume / up), tolerated or not by its real length. Pool-state trust and exit
   *  flags (feedCov) always treat a restart as a plain gap. */
  restartGap(from, to, { warm = false } = {}) { if (from != null && to > from) { if (!warm) this.cov.gaps.push([from, to]); this.feedCov.gaps.push([from, to]); this.store?.feedEvent(to, warm ? "restart-gap (warm: price memory read back)" : "restart-gap", `${from}`); } }
  /** STREAM FRESHNESS (ninth review, B). `t` is OUR receive time; every decoded transaction also carries its block time, so
   *  t − blockTs measures how far behind the chain the stream is running at that moment (normally 1.0–1.3 s). A stream can stay
   *  connected and still be late: on 23 Nov 2026 it ran up to 112 s behind while every state looked 1 s old by receive time,
   *  and 88 buys were signalled more than 10 s late. A lifetime average says nothing about now, so the evidence is per measurement.
   *  The stream is CURRENT at time `at` (freshAt) only if
   *    (1) its delay has been measured since the last (re)connect                      — unknown is not current;
   *    (2) `at` is not inside a LATE SPELL: from the first measurement above FEED_MAX_LAG_S until measurements have stayed
   *        within the limit for FEED_MAX_LAG_S seconds; nor inside a SILENCE longer than the limit;
   *    (3) the newest measurement is no older than FEED_MAX_LAG_S before `at`         — a connected, silent stream proves nothing.
   *  While it is not current: pool states are still rebuilt (the chain of reserves must stay continuous), but a late
   *  observation creates no price history, no signal, no peak and no stop, and no order is priced. A pending buy runs into the
   *  existing 5 s pricing timeout; a triggered sale stays pending and is priced by the first current state, with the delay it
   *  really had (the 24 h unresolved rule is unchanged). For SIGNALS a late spell is a coverage gap exactly like an outage:
   *  no window and no fresh crossing spans it, so catch-up observations cannot manufacture a crossing. For POOL-STATE TRUST it
   *  is not a gap — nothing was lost, only late: once the stream is current again a quiet pool's last state is valid again, and
   *  every open position is valued once on its pool's current state (_revalue).
   *  This is not a rule about quiet pools: an old, unchanged pool state stays valid while the stream as a whole is current. */
  noteLag(t, lagS) {
    if (!(lagS >= 0) || !isFinite(lagS)) return; const L = this.stream, late = lagS > S.FEED_MAX_LAG_S;
    if (L.at != null && !L.late && t - L.at > S.FEED_MAX_LAG_S) L.spans.push([L.at, t]); // connected but silent for longer than the limit: that stretch is unverified
    L.at = t; L.lag = lagS; if (lagS > L.max) L.max = lagS; this.stats.streamLagS = +lagS.toFixed(2);
    if (late) { L.lastLate = t; if (!L.late) { L.late = true; L.since = t; L.spells++; this.stats.lateSpells = L.spells; this.cov.drop(t, "late"); this.store?.feedEvent(t, "late", `stream ${lagS.toFixed(1)} s behind the chain (limit ${S.FEED_MAX_LAG_S} s): no signal and no pricing until it is current again`); } }
    else if (L.late && t - L.lastLate >= S.FEED_MAX_LAG_S) { L.late = false; L.spans.push([L.since, t]); if (L.spans.length > 4000) L.spans.splice(0, 2000);
      this.cov.up(t, "late"); if (!this.cov.down) for (const c of this.coins.values()) if (c.mode !== "polled") c.series.startLive(t);
      this.store?.feedEvent(t, "current", `stream current again after ${(t - L.since).toFixed(1)} s late`); L.since = null; this._revalue(t); }
  }
  freshAt(at) { const L = this.stream; if (L.at == null || at > L.at + S.FEED_MAX_LAG_S) return false; if (L.late && L.since <= at) return false;
    for (let i = L.spans.length - 1; i >= 0; i--) { const [a, b] = L.spans[i]; if (b <= at) break; if (a < at) return false; } return true; }
  /** the stream is current again at t: each live position is valued once on its pool's state in force (peaks, stops, overdue orders) */
  _revalue(t) { for (const [mint, ids] of this.byMint) { if (!ids.size) continue; const c = this.coins.get(mint); if (!c || c.mode === "polled" || !this.trustedAt(c, t)) continue;
    for (const id of [...ids]) { const e = this.entries.get(id); if (!e || e.exec === "routed-quote") continue; const was = e.status, sig = e.versions.map((v) => v.status).join(); observe(e, c.state, t, this.feedCov); this._after(e, was, sig, ids, c); } } }
  /** the risk reader read this coin's mint account: a fee or restriction found on a coin already HELD on the live method is
   *  recorded on the position. The position, its exits and any unresolved exposure stay exactly as they are — nothing is
   *  deleted and no sale is invented. (A pending live buy is cancelled by _run.) */
  riskUpdated(mint) { const c = this.coins.get(mint), ids = this.byMint.get(mint); if (!c || !ids) return; const bad = liveBlock(c.info); if (!bad || !c.info.risk || c.info.risk.status === "missing") return;
    for (const id of ids) { const e = this.entries.get(id); if (!e || e.exec === "routed-quote" || e.status !== "filled" || e.riskAfter === bad) continue; e.riskAfter = bad; e.flags.push(`found after the buy: the coin now has ${bad} — this position's result does not model it`); e.touched = true; } }
  feedUp(t) { this.stream.at = null; this.stream.lag = null; /* the delay of the new connection is unknown until measured */ this.feedCov.up(t, "feed"); this.cov.up(t, "feed"); if (!this.cov.down) for (const c of this.coins.values()) if (c.mode !== "polled") c.series.startLive(t); /* a sampled coin's history starts at its own first sample, never at the PumpSwap feed's */ this.store?.feedEvent(t, "up"); }
  feedDown(t, why = "") { this.feedCov.drop(t, "feed"); this.cov.drop(t, "feed"); this.store?.feedEvent(t, "down", why); }
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
  trustedAt(c, at) { return !!c.state && !c.state.approx && c.state.t <= at && (c.lostAt === null || c.state.t >= c.lostAt) && this.feedCov.gapsIn(c.state.t, at).length === 0 && this.freshAt(at); }
  _run(mint, upTo, c) {
    const ids = this.byMint.get(mint); if (!ids) return;
    // each entry keeps the execution method it was opened with: a routed-quote entry is NEVER priced from a pool state
    for (const id of ids) { const e = this.entries.get(id), was = e.status, sig = e.versions.map((v) => v.status).join(), q = e.exec === "routed-quote";
      // ELIGIBILITY IS CHECKED AGAIN AT THE FILL, on the live method too (ninth review, A): a pending live buy on a coin that is
      // now restricted, now known to charge a fee, or whose fee is no longer known is CANCELLED, never filled.
      if (!q && e.status === "pending") { const bad = liveBlock(c.info); if (bad) { e.status = "cancelled"; e.flags.push(`cancelled before the buy: the coin's transfer restrictions changed between the decision and the fill — now ${bad}`); this.stats.cancelledAtFill = (this.stats.cancelledAtFill || 0) + 1; this._after(e, was, sig, ids, c); continue; } }
      const mut = advance(e, upTo, q ? undefined : c.state, q ? NEVER : (at) => this.trustedAt(c, at), q ? this.pollCov : this.feedCov); this._after(e, was, sig, ids, c, mut); }
  }
  /** `seen` = the entry's decision state may have changed without a status change: a price was observed (peak, last value,
   *  runner high), or advance() reported a change. A clock tick that changed nothing does NOT mark the entry for saving: before
   *  23 Nov 2026 every open position was re-written to the database every second whether or not anything had happened to it,
   *  which at 1,350 open positions was about 38 MB of writing per second and a full processor core (the feed fell behind). */
  _after(e, was, sig, ids, c, seen = true) {
    if (was === "pending" && e.status === "filled") { e.fill.pool = c.pool; this.onFill(e, c); }
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
    const prev = c.state; const st = { ...ev.state, feeBuy: ev.state.feeBuy ?? prev?.feeBuy ?? null, feeSell: ev.state.feeSell ?? prev?.feeSell ?? null, supply: ev.state.supply ?? prev?.supply ?? null, t: ev.t };
    c.state = st; if (st.supply) c.supply = st.supply;
    // QUARANTINE: a state rebuilt from a boost event is an estimate until the next swap confirms it — it prices no fill (trustedAt),
    // moves no peak or stop, and creates no price observation or signal. Counted.
    if (st.approx) { this.stats.approxStates = (this.stats.approxStates || 0) + 1; if (c.series.breakOpen(ev.t)) this.stats.priceBreaks = (this.stats.priceBreaks || 0) + 1; return; } // recorded on the coin as a price-history break
    c.series.breakClose(ev.t); // a confirmed state ends any quarantine; the interval itself stays unusable
    // STREAM NOT CURRENT (late, or its delay unknown — see noteLag): the state above is kept, nothing else is done with this
    // observation: no valuation, peak or stop, no price history, no signal.
    if (!ev.replay && !this.freshAt(ev.t)) { this.stats.lateEvents = (this.stats.lateEvents || 0) + 1; return; }
    // 3) open positions see it (value, peaks, triggers) — in SOL, independent of the USD reference
    if (!ev.replay) { const ids = this.byMint.get(ev.mint); if (ids) for (const id of ids) { const e = this.entries.get(id); if (e.exec === "routed-quote") continue; const was = e.status, sig = e.versions.map((v) => v.status).join(); observe(e, st, ev.t, this.feedCov); this._after(e, was, sig, ids, c); } }
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
    this._decide(c, ev.mint, o, {}, { trigger: { t: ev.t, block_ts: ev.blockTs ?? null, sig: ev.sig ?? null, slot: ev.slot ?? null, kind: ev.kind ?? null, px_usd: px, sol_usd: su, base: st.base, quote_eff: st.quote, fee_buy: st.feeBuy, fee_sell: st.feeSell, supply: c.supply, age_s: Math.round(age), coverage: "covered" } },
      { pop: c.info.population || "pumpswap-canonical", mode: "live", exec: "reconstructed-pool-state", valuation: "pool price × on-chain base supply (from the swap event)", age_basis: c.info.create_src || "token creation (source not recorded)", state_approx: st.approx ?? null });
    const ms = performance.now() - t0; if (ms > this.stats.evalMsMax) this.stats.evalMsMax = +ms.toFixed(1);
  }
  /** shared: evaluate the families on one observation and open the (shared) entry */
  _decide(c, mint, o, opts, evidenceExtra, tags) {
    if (this.entriesUntil != null && o.t >= this.entriesUntil) { this.stats.afterEntryWindow = (this.stats.afterEntryWindow || 0) + 1; return null; } // the entry window has closed: positions and runner tracking continue, nothing new is opened
    // risk checks only stop entries whose EXECUTION assumption is unsupported (known transfer restrictions); they are not a quality filter
    if (c.info.risk?.status === "restricted") { if (!c.riskNoted) { c.riskNoted = true; this.stats.riskBlocked++; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: token transfer restrictions make the execution assumption unsupported", detail: { risk: c.info.risk } }); } return null; }
    // a transfer-fee coin is entered only where the fee is modelled: the sampled method (the fee is taken off its routed quotes)
    if (c.info.risk?.fee_bps > 0 && c.mode !== "polled") { if (!c.riskNoted) { c.riskNoted = true; this.stats.riskBlocked++; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: transfer-fee coin on the live method, where the fee is not modelled", detail: { fee_bps: c.info.risk.fee_bps } }); } return null; }
    // UNKNOWN IS NOT "NO FEE" (eighth review, B1 — sampled coins; ninth review, A — live coins too): a coin whose token program
    // or Token-2022 extensions have not been read from the chain is not entered. A live coin is marked for the mint-account
    // reader here (risk.riskQueue), so the first decision that needs the answer is what asks for it.
    if (!feeKnown(c.info)) { c.feeWanted = o.t; this.stats.feeUnknown = (this.stats.feeUnknown || 0) + 1; if (!c.feeNoted) { c.feeNoted = true; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: the coin's transfer fee has not been read from the chain yet", detail: { token_program: c.info.token_program ?? null } }); } return null; }
    // BUYING AGAIN (spec REBUY): which rows each book still holds on this coin. A row is held while its entry is pending or the row is
    // not closed. A book may buy again when at least one of its rows is free; the first buy per age group is decided as before.
    const busy = this._busy(mint), tNow = o.t, log24 = (c.rebuys ||= {});
    const again = this.rebuy === false ? null : (f) => { if (busy && (busy.get(f)?.size ?? 0) >= ROWS) return false; const L = log24[f]; if (L) { while (L.length && L[0] < tNow - 86400) L.shift(); if (L.length >= S.REBUY_MAX_PER_DAY) { if (!c.rebuyCapNoted?.[f]) { (c.rebuyCapNoted ||= {})[f] = 1; this.stats.rebuyCapped = (this.stats.rebuyCapped || 0) + 1; this.store?.saveNote(mint, { ag: null, family: f, t: tNow, reason: `safety limit: ${S.REBUY_MAX_PER_DAY} re-buys of this coin by this book in 24 hours — no further re-buy until one ages out`, detail: {} }); } return false; } } return true; };
    const r = evaluate(c, o, again ? { ...opts, again } : opts); // engine.rebuy = false (OLDER_REBUY=0): older-8 behaviour, one buy per book, coin and age group
    for (const n of r.notes) { this.stats.notes++; this.store?.saveNote(mint, n); }
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
      Object.assign(e, tags); e.token = { symbol: c.info.symbol ?? null, origin: c.info.origin ?? null, origin_evidence: c.info.origin_evidence ?? null, venues: c.info.venues ?? null, token_program: c.info.token_program ?? null, risk_status: c.info.risk?.status ?? "missing", xfer_bps: c.info.risk?.fee_bps || 0, create_src: c.info.create_src ?? null, cadence_s: c.info.cadence_s ?? null };
      this.addEntry(e); this.stats.entries++;
      // ONE COMMIT: the entry and its one-buy flags are written together. A stop between the two used to leave a stored entry
      // without its flags, and the same coin could then be bought again by the same book (seventh review, 5).
      if (this.store) { const write = () => { this.store.saveEntry(e); for (const x of G) this.store.saveDecision(mint, x.ag, x.family, o.t, e.id, x.detail); }; this.store.tx ? this.store.tx(write) : write(); }
      this.log(`[entry ${e.id}] ${mint.slice(0, 6)} ${e.ag} ${e.families.join("+")}${e.again ? " (again: " + Object.keys(e.again).join("+") + (e.versions.length < ROWS ? ", " + e.versions.length + " rows" : "") + ")" : ""} mc $${Math.round(o.mc)} (${e.mode})`);
      if (!e.again || Object.keys(e.again).length < e.families.length) { try { this.onEntry(e, c); } catch {} } // background measurements only: never part of the decision (not repeated for a pure re-buy)
      firstEntry ??= e;
    }
    return firstEntry;
  }
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
      else if (e.status === "filled") { const inv = inventories(e); if (inv.length) out.push({ id, mint, buy_sol: null, sells: inv, due: dueAt(e), unresolved: unresolvedCount(e) > 0 }); } }
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
