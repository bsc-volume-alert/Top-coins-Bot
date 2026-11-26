// newcoin.mjs — THE NEW-COIN BOOKS (spec NEW_COIN; owner 25 Nov 2026 16:07, 16:10, 18:37 UK). PAPER ONLY, like everything here.
// Three jobs, all through providers the bot already uses (no new service, nothing on the Helius stream):
//   1. LOOK      every NEW_LOOK_S seconds the provider's list of the newest coins is read (Jupiter /tokens/v2/recent — it reaches
//                back about a minute). Every coin on it is remembered with its creation time until its last age point has passed.
//   2. MEASURE   when a coin reaches an age point (5 minutes, 10 minutes — counted from creation) it is measured ONCE, in a batch
//                with the others that are due: market cap, holders, volume since creation, top holders (Jupiter token data).
//                EVERY coin is counted against EVERY rule, so the page can say how many coins a day meet each of them — whether
//                or not anything is bought. A coin that could not be measured within NEW_CHECK_LATE_S of its age point is counted
//                "too late" and never judged on later figures.
//   3. BUY       a coin that passes market cap, holders and volume gets ONE GMGN reading (fees, top 10 holders, creation time).
//                If that passes too, and the coin's transfer restrictions are known and allow it, the engine opens an ordinary
//                paper buy priced by routed quotes (engine.openDirect): 0.2 SOL, the five stops, both exit policies, the 24-hour
//                limit, the owner's sell button. Nothing is forced out at 45 minutes.
// What this does NOT see: a coin created while the program was not running, or (if the provider's list ever falls behind) a coin
// that never appeared on it — the second is counted ("looks with no coin in common with the one before").
// The counters live in a small file beside the database so a restart does not empty them; the coins waiting for an age point
// are in it too.
import { readFileSync, writeFileSync, existsSync, renameSync, appendFileSync } from "node:fs";
import { COST, lastSaleT } from "./book.mjs";
import * as S from "./spec.mjs";
import { classifyJupToken, feeKnown } from "./risk.mjs";
import { parseInfo } from "./gates.mjs";
import { validDec } from "./polled.mjs";

const volOf = (st) => (st && (st.buyVolume != null || st.sellVolume != null) ? (st.buyVolume || 0) + (st.sellVolume || 0) : null);
/** what one provider record says about a coin at its age point (figures as given; null = the provider gave none) */
export function measure(tok) {
  const v1 = volOf(tok.stats1h), v5 = volOf(tok.stats5m), vol = v1 != null && v5 != null ? Math.max(v1, v5) : v1 ?? v5; // since creation: the 1-hour figure covers a coin's whole life when it is minutes old; the 5-minute figure is the fallback
  const h = tok.stats1h || tok.stats5m || null; // the same statistics, split: bought, sold, number of buys and sells, organic volume (recorded with every measurement; no rule reads them)
  return { buy_vol: h?.buyVolume ?? null, sell_vol: h?.sellVolume ?? null, n_buys: h?.numBuys ?? null, n_sells: h?.numSells ?? null, net_buyers: h?.numNetBuyers ?? null, organic_vol: h && (h.buyOrganicVolume != null || h.sellOrganicVolume != null) ? (h.buyOrganicVolume || 0) + (h.sellOrganicVolume || 0) : null,
    mc: tok.mcap ?? null, holders: tok.holders ?? null, vol, v1h: v1, v5m: v5, vol_basis: vol == null ? null : vol === v1 ? "1h statistics (whole life)" : "5m statistics", top_jup: tok.top_holders_pct != null ? tok.top_holders_pct / 100 : null, px: tok.px ?? null, liq: tok.liq_usd ?? null, traders: tok.stats1h?.numTraders ?? tok.stats5m?.numTraders ?? null, curve_pct: tok.curve_pct ?? null };
}
/** the provider-side rules of one book on one measurement: each true / false / null (figure missing) */
export function judgeMeasure(m, r) {
  const t = (v, f) => (v == null ? null : f(v));
  return { mc: t(m.mc, (v) => v > r.mc_min_usd), holders: t(m.holders, (v) => v > r.holders_min), vol: t(m.vol, (v) => v >= r.vol_min_usd), top_jup: t(m.top_jup, (v) => v >= r.top10[0] && v <= r.top10[1]) };
}
/** one rule on one check, in words: "pass" | "fail" | "no figure" (the provider answered without it) — and, set where they apply,
 *  "not asked" (the reading was never requested because an earlier rule had failed) and "provider error" (asked, no answer in time) */
export const statusOf = (v) => (v == null ? "no figure" : v ? "pass" : "fail");
/** WHY one check did not buy, in one word — the FIRST rule it failed, in the order the rules are judged: market cap, holders,
 *  volume, top holders by Jupiter's figure (the first look), then GMGN's fees and top 10. "bought" = it bought. The runners list
 *  counts every check under exactly one of these, so "rejected by this rule" and "of those, reached $100K" add up. */
export const WHYS = ["bought", "market cap", "holders", "volume", "top holders (Jupiter)", "no GMGN answer", "fees", "top 10 (GMGN)", "not measured", "other"];
export function whyOf(r) { const st = r.st; if (String(r.out || "").startsWith("BOUGHT")) return "bought"; if (!st) return "other";
  if (st.mc === "provider error") return "not measured"; if (st.mc !== "pass") return "market cap"; if (st.holders !== "pass") return "holders"; if (st.vol !== "pass") return "volume"; if (st.top_pre === "fail") return "top holders (Jupiter)";
  if (st.fees === "provider error") return "no GMGN answer"; if (st.fees === "fail" || st.fees === "no figure") return "fees"; if (st.top10 === "fail" || st.top10 === "no figure") return "top 10 (GMGN)"; return "other"; }
const lean = (o) => { const out = {}; for (const [k, v] of Object.entries(o)) if (v != null) out[k] = v; return out; }; // a database row carries no empty fields
const USDK = (v) => (v == null ? "?" : "$" + (v >= 1000 ? Math.round(v / 1000) + "K" : Math.round(v)));
const fresh = () => ({ since: null, looks: 0, look_errors: 0, looks_no_overlap: 0, seen: 0, no_creation: 0, by_launchpad: {}, last_look: null, last_error: null, checks: {} });
const freshCheck = () => ({ reached: 0, too_late: 0, search_failed: 0, not_answered: 0, measured: 0,
  mc: 0, holders: 0, vol: 0, top_jup: 0, mc_holders: 0, mc_vol: 0, candidates: 0, // each rule on its own, two pairs, and all three provider-side rules together
  no_figure: { mc: 0, holders: 0, vol: 0, top_jup: 0 },
  top_pre_skipped: 0, gmgn_asked: 0, gmgn_ok: 0, gmgn_failed: 0, fees: 0, top10: 0, age_ok: 0, passed_all: 0, risk_unknown: 0, risk_blocked: 0, not_opened: 0, bought: 0,
  max: { mc: 0, holders: 0, vol: 0 }, recent: [] });
const timeout = (p, ms, what) => new Promise((res, rej) => { const h = setTimeout(() => rej(new Error(`${what} did not arrive within ${Math.round(ms / 1000)} s`)), ms); h.unref?.(); Promise.resolve(p).then((v) => { clearTimeout(h); res(v); }, (e) => { clearTimeout(h); rej(e); }); });

export class NewCoins {
  /** jup: { recent(), tokens(mints) } · quoter: the Poller that prices routed-quote buys (only its watch list is touched here)
   *  readInfo(mint) → GMGN token info · readRisk(mint) → classifyMintAccount result for the mint (transfer restrictions) */
  constructor({ engine, jup, quoter, readInfo, readRisk = null, store = null, now = () => Date.now() / 1000, log = () => {}, file = null, rules = S.NEW_COIN, solUsd = null }) {
    Object.assign(this, { engine, jup, quoter, readInfo, readRisk, store, now, log, file, rules }); this.solUsd = solUsd ?? ((t) => engine.solUsd(t));
    this.history = []; this.logFile = file ? file.replace(/\.json$/, "") + ".log.jsonl" : null; this.runner = { passes: 0, coins: 0, priced: 0, no_price: 0, errors: 0, last: null }; this.lastRunner = 0;
    if (this.logFile && existsSync(this.logFile)) try { const L = readFileSync(this.logFile, "utf8").split("\n").filter(Boolean).slice(-S.NEW_LOG_KEEP); for (const l of L) try { this.history.push(JSON.parse(l)); } catch {} } catch {}
    this.young = new Map(); this.prevIds = null; this.inflight = new Set(); this.maxAt = Math.max(...rules.map((r) => r.at_s)); this.stats = fresh(); this.dirty = false; this.confirmMax = S.NEW_CONFIRM_MAX; this.hits = new Map(); this.hitsLoaded = false; this.dbq = []; this.kept = 0; this.keepErr = null;
    this.load();
  }
  k(family) { return (this.stats.checks[family] ||= freshCheck()); }
  load() { if (!this.file || !existsSync(this.file)) { this.stats.since = this.now(); return; }
    try { const j = JSON.parse(readFileSync(this.file, "utf8")); if (j?.v !== 1) throw new Error("unknown format"); this.stats = { ...fresh(), ...j.stats }; for (const f of Object.keys(this.stats.checks)) this.stats.checks[f] = { ...freshCheck(), ...this.stats.checks[f] };
      for (const c of j.young || []) if (c?.mint && c.created > 0) this.young.set(c.mint, { mint: c.mint, created: c.created, launchpad: c.launchpad ?? null, symbol: c.symbol ?? null, done: c.done || {} }); }
    catch (e) { this.log("[new coins] counters file unreadable (" + e.message + "): counting starts again"); this.stats = fresh(); this.stats.since = this.now(); } }
  save() { if (!this.file || !this.dirty) return; this.dirty = false; try { const tmp = this.file + ".tmp"; writeFileSync(tmp, JSON.stringify({ v: 1, saved: this.now(), stats: this.stats, young: [...this.young.values()] })); renameSync(tmp, this.file); } catch (e) { this.log("[new coins] counters not saved: " + e.message); } }
  /** after a restart: every unfinished new-coin buy goes back on the quote list (it is priced by its own quotes only) */
  restore() { let n = 0; for (const e of this.engine.entries.values()) { if (e.pop !== S.NEW_POP || e.exec !== "routed-quote") continue; const dec = e.token?.decimals ?? this.engine.coins.get(e.mint)?.info?.decimals;
      if (validDec(dec)) { this.watch(e.mint, dec, null); n++; } else { const f = "new-coin buy restored without the coin's decimals: it cannot be quoted"; if (!e.flags.includes(f)) { e.flags.push(f); e.touched = true; } } } return n; }
  watch(mint, decimals, circ) { if (!this.quoter.watch.has(mint)) this.quoter.watch.set(mint, { decimals, circ: circ ?? null, hot: true, lastT: null, lastReq: 0, miss: 0, mc: null }); }

  /** 1. LOOK */
  async look() {
    const K = this.stats; let list; try { list = await this.jup.recent(); } catch (e) { K.look_errors++; K.last_error = String(e.message).slice(0, 120); this.dirty = true; return 0; }
    const now = this.now(); K.looks++; K.last_look = now; this.dirty = true; let n = 0;
    const ids = new Set(list.map((t) => t.mint)); if (this.prevIds && ids.size && ![...ids].some((i) => this.prevIds.has(i))) K.looks_no_overlap++; if (ids.size) this.prevIds = ids; // no coin in common with the look before: coins were created in between that no look showed
    for (const t of list) { if (!t.mint || this.young.has(t.mint)) continue; const created = t.first_pool?.created ?? null;
      if (!(created > 0)) { K.no_creation++; continue; } if (now - created > this.maxAt + S.NEW_CHECK_LATE_S) continue; // already past its last age point when first seen (the list after a long pause)
      this.young.set(t.mint, { mint: t.mint, created, launchpad: t.launchpad ?? null, symbol: t.symbol ?? null, done: {} }); K.seen++; n++; const lp = t.launchpad || "none"; K.by_launchpad[lp] = (K.by_launchpad[lp] || 0) + 1; }
    return n;
  }
  /** 2. MEASURE every coin that has reached an age point since the last pass. Returns the number of measurements made. */
  async check() {
    const now = this.now(), jobs = [];
    for (const c of this.young.values()) { const age = now - c.created;
      for (const r of this.rules) { if (c.done[r.family] || age < r.at_s) continue; if (age > r.at_s + S.NEW_CHECK_LATE_S) { c.done[r.family] = 1; const K = this.k(r.family); K.reached++; K.too_late++; this.dirty = true; this.keep({ book: r.family, t: Math.round(now), mint: c.mint, sym: c.symbol ?? null, lp: c.launchpad, age_s: Math.round(age), st: { mc: "provider error", holders: "provider error", vol: "provider error", top_pre: "provider error", fees: "not asked", top10: "not asked" }, out: "not measured: the coin could not be measured within " + S.NEW_CHECK_LATE_S + " s of its age point" }); continue; } jobs.push([c, r]); }
      if (age > this.maxAt + S.NEW_CHECK_LATE_S && this.rules.every((r) => c.done[r.family])) this.young.delete(c.mint); }
    if (!jobs.length) { this.flush(); return 0; }
    const mints = [...new Set(jobs.map((j) => j[0].mint))], rows = new Map(), failed = new Set(); let n = 0;
    for (let i = 0; i < mints.length; i += 100) { const batch = mints.slice(i, i + 100); try { for (const t of await this.jup.tokens(batch)) rows.set(t.mint, t); } catch (e) { for (const m of batch) failed.add(m); this.stats.last_error = "token data: " + String(e.message).slice(0, 100); } }
    const t = this.now(); this.dirty = true;
    for (const [c, r] of jobs) { const K = this.k(r.family);
      if (failed.has(c.mint)) { K.search_failed++; continue; } // the request itself failed: asked again at the next pass while the coin is still inside its window (then "too late")
      c.done[r.family] = 1; K.reached++; const tok = rows.get(c.mint); if (!tok) { K.not_answered++; this.keep({ book: r.family, t: Math.round(t), mint: c.mint, sym: c.symbol ?? null, lp: c.launchpad, age_s: Math.round(t - c.created), st: { mc: "provider error", holders: "provider error", vol: "provider error", top_pre: "provider error", fees: "not asked", top10: "not asked" }, out: "not measured: the provider returned no record of this coin" }); continue; }
      const m = measure(tok), j = judgeMeasure(m, r), age = t - c.created; K.measured++; n++;
      for (const k of ["mc", "holders", "vol", "top_jup"]) { if (j[k] == null) K.no_figure[k]++; else if (j[k]) K[k]++; }
      for (const k of ["mc", "holders", "vol"]) if (m[k] > K.max[k]) K.max[k] = Math.round(m[k]);
      if (m.vol_basis && m.vol_basis.startsWith("5m")) K.vol_from_5m = (K.vol_from_5m || 0) + 1; // the provider gave no 1-hour statistics: the volume is the last 5 minutes only
      if (j.mc && j.holders) K.mc_holders++; if (j.mc && j.vol) K.mc_vol++;
      const rec = { t: Math.round(t), mint: c.mint, sym: tok.symbol ?? c.symbol ?? null, lp: c.launchpad, age_s: Math.round(age), mc: m.mc == null ? null : Math.round(m.mc), holders: m.holders, vol: m.vol == null ? null : Math.round(m.vol), top_jup: m.top_jup == null ? null : +m.top_jup.toFixed(4), nb: m.buy_vol != null && m.sell_vol != null ? Math.round(m.buy_vol - m.sell_vol) : null, tx: m.n_buys != null || m.n_sells != null ? (m.n_buys || 0) + (m.n_sells || 0) : null, buys: m.n_buys, traders: m.traders, org: m.organic_vol == null ? null : Math.round(m.organic_vol), ok: { mc: j.mc, holders: j.holders, vol: j.vol } };
      const pre = m.top_jup == null || (m.top_jup >= S.NEW_TOP_PRE[0] && m.top_jup <= S.NEW_TOP_PRE[1]); // could it still pass the top-10 rule? (spec NEW_TOP_PRE)
      // RECORDED WITH EVERY CHECK (owner 26 Nov 2026 04:49–05:27 UK, second opinion the same morning): the two volume windows
      // separately, sells, liquidity, price, the provider's own update time and when this batch was asked and answered — and a
      // status in words for every rule, so "failed", "never asked" and "the provider did not answer" can never be confused.
      Object.assign(rec, { v1h: m.v1h == null ? null : Math.round(m.v1h), v5m: m.v5m == null ? null : Math.round(m.v5m), sells: m.n_sells, liq: m.liq == null ? null : Math.round(m.liq), px: m.px, curve: m.curve_pct, upd: tok.updated ?? null, req: tok.req == null ? null : +tok.req.toFixed(2), resp: tok.resp == null ? null : +tok.resp.toFixed(2),
        st: { mc: statusOf(j.mc), holders: statusOf(j.holders), vol: statusOf(j.vol), top_pre: m.top_jup == null ? "no figure" : pre ? "pass" : "fail", fees: "not asked", top10: "not asked" } });
      if (j.mc && j.holders && j.vol && !pre) { K.candidates++; K.top_pre_skipped++; rec.out = `not bought: top holders ${(m.top_jup * 100).toFixed(1)}% by Jupiter's figure (needs ${r.top10[0] * 100}–${r.top10[1] * 100}%; GMGN not asked)`; this.note(K, rec, r.family); }
      else if (j.mc && j.holders && j.vol) { K.candidates++; const p = this.candidate(c, r, tok, m, rec).catch((e) => { rec.out = "error: " + String(e.message).slice(0, 100); this.note(K, rec, r.family); }).finally(() => { this.inflight.delete(p); this.dirty = true; this.flush(); }); this.inflight.add(p); }
      else if (j.mc) { rec.out = "not bought: " + [j.holders ? null : `holders ${m.holders ?? "?"} (needs over ${r.holders_min})`, j.vol ? null : `volume $${m.vol == null ? "?" : Math.round(m.vol / 1000) + "K"} (needs $${r.vol_min_usd / 1000}K)`].filter(Boolean).join(", "); this.note(K, rec, r.family); } // the near misses are kept: a coin over the market-cap line that failed another rule
      else { rec.out = "not bought: " + [`market cap ${m.mc == null ? "?" : USDK(m.mc)} (needs over ${USDK(r.mc_min_usd)})`, j.holders ? null : `holders ${m.holders ?? "?"} (needs over ${r.holders_min})`, j.vol ? null : `volume ${USDK(m.vol)} (needs ${USDK(r.vol_min_usd)})`].filter(Boolean).join(", "); this.keep({ book: r.family, ...rec }); } } // under the market-cap line: in the database only (the lookup), never on the card or in the published file
    this.flush();
    return n;
  }
  /** every measurement of a coin over the market-cap line, with what happened to it: the last 25 per book on the card, the last
   *  NEW_LOG_KEEP in memory for the published file, and ALL of them as one line each in the log file beside the database */
  note(K, rec, family = null) { K.recent.push(rec); if (K.recent.length > 25) K.recent.shift(); this.dirty = true; const row = { book: family ?? rec.book ?? null, ...rec }; this.history.push(row); if (this.history.length > S.NEW_LOG_KEEP) this.history.shift(); this.keep(row);
    if (this.logFile) try { appendFileSync(this.logFile, JSON.stringify(row) + "\n"); } catch (e) { if (!this.logErr) { this.logErr = true; this.log("[new coins] log not written: " + e.message); } } }
  /** EVERY check goes to the database (table nc_checks) — also coins under the market-cap line and checks the provider did not
   *  answer — so the page's coin lookup can say at once what happened to any coin. Written in one transaction per pass. */
  keep(row) { const { ok, ...r } = row; this.dbq.push(lean(r.st ? r : row));
    if (row.book && row.st) { const W = (this.k(row.book).why ||= {}), w = whyOf(row); W[w] = (W[w] || 0) + 1; if (!this.stats.why_since) this.stats.why_since = row.t; } } // each check counted once under the first rule it failed (the runners list sets these beside the coins that reached $100K) // the true/false trio is the same information as the statuses: not stored twice
  flush() { if (!this.dbq.length) return 0; const rows = this.dbq; this.dbq = []; if (!this.store?.saveChecks) return 0; try { this.kept += this.store.saveChecks(rows); return rows.length; } catch (e) { this.keepErr = String(e.message).slice(0, 120); if (!this.keepLogged) { this.keepLogged = true; this.log("[new coins] checks not written to the database: " + e.message); } return 0; } }
  /** THE RUNNERS LIST (spec RUN_LINE_USD). The engine says when a coin's pool price first reaches the line (and at each new high
   *  a step above). If the new-coin books ever measured that coin it is written down once — when it got there, how old it was —
   *  and its highest value is kept. A coin they never measured (created before the bot ran, or never listed) is not theirs: skipped.
   *  sawUnder = false: the coin was already at the line when this process first saw it trade (a restart, or a deploy): the true
   *  moment is unknown and the record says so. No provider is asked; nothing here buys, sells or changes a rule. */
  loadHits() { if (this.hitsLoaded) return; this.hitsLoaded = true; try { for (const r of this.store?.runners?.() || []) this.hits.set(r.mint, r); } catch {} }
  runnerHit(mint, mc, t, sawUnder = null) { this.loadHits(); const had = this.hits.get(mint);
    if (had === null) return null; // looked up before: not a coin the new-coin books measured
    if (had) { if (mc > had.peak) { had.peak = Math.round(mc); had.peak_t = Math.round(t); try { this.store?.runnerPeak?.(mint, had.peak, had.peak_t); } catch {} } return had; }
    const checks = this.lookup(mint).checks; if (!checks.length) { this.hits.set(mint, null); return null; }
    const c0 = checks.find((c) => c.age_s != null) || null, created = c0 ? c0.t - c0.age_s : this.young.get(mint)?.created ?? null;
    const rec = { mint, t: Math.round(t), mc: Math.round(mc), created: created == null ? null : Math.round(created), peak: Math.round(mc), peak_t: Math.round(t), sym: checks.find((c) => c.sym)?.sym ?? null, lp: checks.find((c) => c.lp)?.lp ?? null, age_s: created == null ? null : Math.round(t - created), unseen_before: sawUnder === false ? true : undefined };
    this.hits.set(mint, rec); try { this.store?.saveRunner?.(rec); } catch (e) { this.log("[new coins] runner not written: " + e.message); } this.stats.runners = (this.stats.runners || 0) + 1; this.dirty = true; return rec; }
  /** for the page and the published file: the coins that reached the line within RUN_WINDOW_S of their creation (newest first),
   *  each with its checks and any buy, and the both-sides count — per book and rule: checks rejected, and how many of those coins got there */
  runnersView(now = this.now()) { this.loadHits(); const all = [...this.hits.values()].filter(Boolean), since = this.stats.why_since ?? null;
    const inWin = (r) => r.age_s != null && r.age_s <= S.RUN_WINDOW_S, list = all.filter(inWin).sort((a, b) => b.t - a.t), tally = {};
    for (const r of this.rules) tally[r.family] = Object.fromEntries(WHYS.map((w) => [w, { checks: this.k(r.family).why?.[w] || 0, reached: 0 }]));
    const out = []; let missed = 0;
    for (const r of list) { let checks = []; try { checks = this.lookup(r.mint).checks; } catch {}
      let buys = []; try { buys = (this.store?.entriesOf?.(r.mint) || []).filter((e) => e.pop === S.NEW_POP && e.status === "filled").map((e) => ({ id: e.id, book: e.families[0], t: e.decisionT, mc: Math.round(e.signalMc || 0), max: e.runner?.maxX != null ? +e.runner.maxX.toFixed(2) : null })); } catch {}
      const cs = checks.map((c) => ({ book: c.book, t: c.t, age_s: c.age_s ?? null, mc: c.mc ?? null, holders: c.holders ?? null, vol: c.vol ?? null, top_jup: c.top_jup ?? null, fees: c.fees ?? null, top10: c.top10 ?? null, why: whyOf(c), counted: !!c.st && since != null && c.t >= since, out: c.out ?? null }));
      for (const c of cs) if (c.counted && tally[c.book]?.[c.why]) tally[c.book][c.why].reached++; // only checks made since the counting began: both columns cover the same checks
      if (!buys.length) missed++; if (out.length < S.RUN_LIST) out.push({ ...r, bought: buys, checks: cs }); }
    return { on: true, at: now, line: S.RUN_LINE_USD, window_s: S.RUN_WINDOW_S, counting_since: since, reached: list.length, missed, bought: list.length - missed, later: all.length - list.length, unknown_time: list.filter((r) => r.unseen_before).length, whys: WHYS, tally, list: out }; }
  /** THE COIN LOOKUP (owner 26 Nov 2026 04:49 UK: "when I paste the contract, we need to know immediately why the coin was rejected
   *  or not"). Read-only, from the bot's own records — no provider is asked. Returns what the new-coin books know about one coin:
   *  whether it is on the waiting list and when its next checks fall due, and every check made of it with its figures and reason. */
  lookup(mint) {
    const now = this.now(), y = this.young.get(mint) || null, seen = new Set(), checks = [];
    const add = (r) => { const k = r.book + "|" + r.t; if (seen.has(k)) return; seen.add(k); checks.push(r); };
    if (this.store?.checksOf) try { for (const r of this.store.checksOf(mint)) add(r); } catch {}
    for (const r of this.dbq) if (r.mint === mint) add(r); // measured a moment ago, not yet written
    for (const r of this.history) if (r.mint === mint) add(r); // checks made before every check was kept in the database (coins over the market-cap line only)
    checks.sort((a, b) => a.t - b.t);
    const waiting = y ? { created: y.created, symbol: y.symbol, launchpad: y.launchpad, age_s: Math.round(now - y.created), next: this.rules.filter((r) => !y.done[r.family]).map((r) => ({ book: r.family, at: y.created + r.at_s, in_s: Math.round(y.created + r.at_s - now) })) } : null;
    return { on: true, now, since: this.stats.since, kept_since: (() => { try { return this.store?.checksSince ? this.store.checksSince() : null; } catch { return null; } })(), rules: this.rules.map((r) => ({ book: r.family, at_s: r.at_s, mc: r.mc_min_usd, holders: r.holders_min, vol: r.vol_min_usd, fees: r.fees_min_sol, top10: r.top10 })), waiting, checks };
  }
  /** AFTER THE SALE (spec NEW_FOLLOW_S, owner 26 Nov 2026 06:07 UK "2 hours is fine"): every buy whose rows are all sold is looked
   *  at every NEW_RUNNER_S seconds for two hours after its last sale — one token-data request for all of them, the value an
   *  estimate (price × tokens − one transaction cost). At the two-hour mark a buy worth less than it cost is finished; one still
   *  worth more is looked at every NEW_FOLLOW_LONG_EVERY_S up to NEW_FOLLOW_LONG_S. A new estimated high of NEW_CONFIRM_X or more
   *  gets one real sell quote (what it would actually have fetched). */
  async runnerPass() { const now = this.now(), E = this.engine, R = this.runner, need = [];
    for (const n of E.quoteNeeds(now)) { if (!n.runner_only) continue; const e = E.entries.get(n.id); if (e?.pop !== S.NEW_POP) continue;
      const since = now - (lastSaleT(e) ?? e.fill.t);
      if (since > S.NEW_FOLLOW_S) { if (e.runner.long == null) { e.runner.long = (e.runner.lastX ?? 0) >= 1; E.dirty.add(e.id); } // decided once, at the two-hour mark: is it still worth more than it cost?
        if (!e.runner.long || since > S.NEW_FOLLOW_LONG_S) { const mint = e.mint; if (E.runnerClose(e.id, now, e.runner.long ? "six hours after the last sale" : "two hours after the last sale, worth less than it cost")) { R.finished = (R.finished || 0) + 1; if (!E.byMint.get(mint)?.size) this.quoter.watch.delete(mint); } continue; }
        if (now - (e.runner.estT || 0) < S.NEW_FOLLOW_LONG_EVERY_S - 1) continue; }
      need.push(e); }
    R.following = need.length; if (!need.length) return 0; R.passes++; R.coins = need.length; const mints = [...new Set(need.map((e) => e.mint))], px = new Map(); let n = 0;
    for (let i = 0; i < mints.length; i += 100) try { for (const t of await this.jup.tokens(mints.slice(i, i + 100))) if (t.px > 0) px.set(t.mint, t.px); } catch (e) { R.errors++; this.stats.last_error = "token data (after the sale): " + String(e.message).slice(0, 80); }
    const t = this.now(), su = this.solUsd(t); if (!(su > 0)) { R.no_sol_usd = (R.no_sol_usd || 0) + 1; return 0; }
    const confirm = [];
    for (const e of need) { const p = px.get(e.mint); if (!(p > 0)) { R.no_price++; continue; } const x = Math.max(0, (p * e.fill.tok) / su - S.TX_COST_SOL) / COST, hi = e.runner.maxX; // price × tokens bought, in SOL, less one transaction cost — no fees or price impact: an upper estimate
      if (E.runnerEstimate(e.id, x, t)) { n++; R.priced++; if (x >= S.NEW_CONFIRM_X && x > (hi ?? 0) && x >= (e.runner.lastConfirm?.est_x ?? 0) * S.NEW_CONFIRM_STEP) confirm.push([e, x]); } }
    // a new estimated high worth confirming: ONE real sell quote for the whole original holding, the biggest first, a few per look at most
    confirm.sort((a, b) => b[1] - a[1]);
    for (const [e, x] of confirm.slice(0, this.confirmMax)) { const dec = e.token?.decimals ?? E.coins.get(e.mint)?.info?.decimals; if (!validDec(dec) || !this.jup.quote) continue;
      try { const q = await this.jup.quote(e.mint, "sell", e.fill.tok * 10 ** dec, {}); if (!q?.ok) { R.confirm_failed = (R.confirm_failed || 0) + 1; continue; }
        const xfer = E.coins.get(e.mint)?.info?.risk?.fee_bps || 0, keep = this.quoter?.feeInQuote === false ? 1 - xfer / 10_000 : 1, real = Math.max(0, (q.out / 1e9) * keep - S.TX_COST_SOL) / COST;
        if (E.runnerConfirm(e.id, real, q.t ?? this.now(), x)) R.confirmed = (R.confirmed || 0) + 1; } catch (err) { R.confirm_failed = (R.confirm_failed || 0) + 1; } }
    R.last = t; return n; }
  /** every candidate still waiting for its GMGN reading or its buy (tests; a clean stop) */
  idle() { return Promise.all([...this.inflight]); }
  /** 3. BUY — a coin that passed market cap, holders and volume at its age point */
  async candidate(c, r, tok, m, rec) {
    const K = this.k(r.family), E = this.engine, t0 = this.now(); K.gmgn_asked++;
    let info; try { info = await timeout(this.readInfo(c.mint), S.NEW_GMGN_WAIT_S * 1000, "the GMGN reading"); } catch (e) { K.gmgn_failed++; if (rec.st) { rec.st.fees = "provider error"; rec.st.top10 = "provider error"; } rec.out = "not bought: no GMGN reading (" + String(e.message).slice(0, 80) + ")"; return this.note(K, rec, r.family); }
    const t1 = this.now(), g = parseInfo(info, null, false); K.gmgn_ok++;
    const created = g.created > 1e12 ? g.created / 1000 : g.created, gAge = created > 0 ? t1 - created : null;
    const feesOk = g.fees_sol != null && g.fees_sol >= r.fees_min_sol, topOk = g.top10 != null && g.top10 >= r.top10[0] && g.top10 <= r.top10[1], ageOk = gAge == null || gAge <= r.at_s + S.NEW_AGE_SLACK_S;
    if (feesOk) K.fees++; if (topOk) K.top10++; if (ageOk) K.age_ok++;
    Object.assign(rec, { fees: g.fees_sol, top10: g.top10, gmgn_ms: Math.round((t1 - t0) * 1000), gmgn_age_s: gAge == null ? null : Math.round(gAge) });
    if (rec.st) { rec.st.fees = g.fees_sol == null ? "no figure" : feesOk ? "pass" : "fail"; rec.st.top10 = g.top10 == null ? "no figure" : topOk ? "pass" : "fail"; if (!ageOk) rec.st.age = "fail"; }
    // GMGN's own figures from the SAME answer (no extra request): its volume windows beside Jupiter's, and the wallet shares — recorded, no rule reads them
    rec.g = lean({ vol_5m: g.vol_5m, vol_1h: g.vol_1h, buy_vol_1h: g.buy_vol_1h, sell_vol_1h: g.sell_vol_1h, buys_1h: g.buys_1h, sells_1h: g.sells_1h, swaps_5m: g.swaps_5m, swaps_1h: g.swaps_1h, holders: g.holders, bundlers: g.bundlers, insiders: g.insiders, snipers: g.snipers, phishing: g.phishing, liq: g.liq_usd == null ? null : Math.round(g.liq_usd), asked: +t0.toFixed(2), answered: +t1.toFixed(2) });
    if (!feesOk || !topOk || !ageOk) { rec.out = "not bought: " + [feesOk ? null : `fees ${g.fees_sol == null ? "?" : +g.fees_sol.toFixed(2)} SOL (needs ${r.fees_min_sol})`, topOk ? null : `top 10 holders ${g.top10 == null ? "?" : (g.top10 * 100).toFixed(1) + "%"} (needs ${r.top10[0] * 100}–${r.top10[1] * 100}%)`, ageOk ? null : `GMGN says the coin is ${Math.round(gAge / 60)} minutes old`].filter(Boolean).join(", "); return this.note(K, rec, r.family); }
    K.passed_all++;
    // the coin itself: an ordinary coin of the engine that simply has no pool yet (if it migrates, the pool books see it like any other)
    if (!validDec(tok.decimals)) { K.not_opened++; rec.out = "not bought: the provider gave no decimals for the coin (it cannot be quoted)"; return this.note(K, rec, r.family); }
    const had = E.coins.get(c.mint), origin = tok.launchpad || c.launchpad || "unknown";
    const coin = E.coin(c.mint, { createTs: c.created, info: had ? null : { symbol: tok.symbol ?? null, decimals: tok.decimals, circ_supply: tok.circ_supply ?? null, origin, origin_evidence: tok.launchpad ? "provider launchpad field" : "none", token_program: tok.token_program ?? null, discovery_source: "jupiter recent (first pool)", risk: classifyJupToken(tok), create_src: "jupiter firstPool.createdAt (for a launchpad coin its launch curve, created with the coin)" } });
    if (had && coin.info.decimals == null) coin.info.decimals = tok.decimals;
    if (!feeKnown(coin.info) && this.readRisk) { try { const k = await timeout(this.readRisk(c.mint), 8000, "the mint account"); if (k && k.status !== "missing") { k.read_at = Math.round(this.now()); coin.info.risk = k; if (k.program) coin.info.token_program = k.program; coin.riskRead = true; coin.riskAt = this.now(); } } catch (e) { rec.risk_err = String(e.message).slice(0, 80); } }
    this.store?.saveCoin(c.mint, { createTs: c.created, createSrc: "jupiter firstPool", pumpOrigin: origin, firstSeen: Math.floor(t1), info: coin.info });
    if (!feeKnown(coin.info)) { K.risk_unknown++; rec.out = "not bought: the coin's transfer restrictions could not be read from the chain"; return this.note(K, rec, r.family); }
    if (coin.info.risk?.status === "restricted") { K.risk_blocked++; rec.out = "not bought: the coin restricts transfers (" + ((coin.info.risk.blocking || []).join(", ") || "restriction") + ")"; return this.note(K, rec, r.family); }
    const t = this.now(), age = t - c.created, out = {};
    const detail = { rule: { ...r }, age_s: +age.toFixed(1), measured_at: rec.t, jupiter: { mc: m.mc, holders: m.holders, vol_usd: m.vol, vol_basis: m.vol_basis, buy_vol: m.buy_vol, sell_vol: m.sell_vol, n_buys: m.n_buys, n_sells: m.n_sells, net_buyers: m.net_buyers, organic_vol: m.organic_vol, top_holders: m.top_jup, liq_usd: m.liq, traders: m.traders, curve_pct: m.curve_pct, updated: tok.updated ?? null }, gmgn: { fees_sol: g.fees_sol, top10: g.top10, created: created ?? null, age_s: gAge == null ? null : +gAge.toFixed(1), asked: t0, answered: t1 } };
    this.watch(c.mint, tok.decimals, tok.circ_supply);
    const e = E.openDirect({ mint: c.mint, family: r.family, t, mc: m.mc, px: m.px, features: { age_s: Math.round(age), mc: m.mc, holders: m.holders, vol_usd: m.vol, fees_sol: g.fees_sol, top10: g.top10, liq_usd: m.liq }, detail, trigger: { px_usd: m.px, src: "jupiter token data + gmgn token info", age_s: Math.round(age), supply: tok.circ_supply ?? tok.total_supply ?? null }, token: { decimals: tok.decimals } }, out);
    if (!e) { K.not_opened++; rec.out = "not bought: " + (out.why || "the buy could not be opened"); if (!E.byMint.get(c.mint)?.size) this.quoter.watch.delete(c.mint); return this.note(K, rec, r.family); }
    // the reading the rule was judged on, kept on the buy in the same shape as the other books' GMGN reading (so the page shows it)
    e.gate = { kind: "new-coin rule", req_t: t0, resp_t: t1, ms: Math.round((t1 - t0) * 1000), reading: g, verdict: "pass", timely: true, at_buy: "reading", by: { [r.family]: { pass: true } } };
    this.store?.saveEntry(e); K.bought++; rec.out = "BOUGHT (paper), entry " + e.id; rec.entry = e.id; this.note(K, rec, r.family);
  }
  /** for the status report and the page */
  status() { const q = this.quoter?.stats || {}; return { on: true, rules: this.rules, top_pre: S.NEW_TOP_PRE, look_s: S.NEW_LOOK_S, waiting: this.young.size, in_flight: this.inflight.size, quotes: { ok: q.quotesOk || 0, no_route: q.noRoute || 0, errors: q.quoteErr || 0, watched: this.quoter?.watch.size ?? 0, sizes: q.quoteSizes ?? 0, young: q.quoteYoung ?? 0, young_every_s: q.quoteYoungEvery ?? this.quoter?.quoteYoung ?? null, old_every_s: q.quoteOldEvery ?? null, old_every_max_s: q.quoteOldEveryMax ?? null, budget: this.quoter?.quoteBudget ?? null, at_a_time: this.quoter?.quotePar ?? 1 }, runner: { ...this.runner }, logged: this.history.length, runners_known: [...this.hits.values()].filter(Boolean).length, kept: this.kept, keep_error: this.keepErr, ...this.stats }; }
  start() { const loop = async () => { while (!this.stopped) { const t0 = Date.now(); try { await this.look(); await this.check(); this.save(); } catch (e) { this.log("[new coins] " + e.message); } await new Promise((r) => setTimeout(r, Math.max(1000, S.NEW_LOOK_S * 1000 - (Date.now() - t0)))); } }; loop();
    const follow = async () => { while (!this.stopped) { const t0 = Date.now(); try { this.lastRunner = this.now(); await this.runnerPass(); } catch (e) { this.log("[new coins] after the sale: " + e.message); } await new Promise((r) => setTimeout(r, Math.max(1000, S.NEW_RUNNER_S * 1000 - (Date.now() - t0)))); } }; follow(); } // its own clock: every NEW_RUNNER_S seconds whatever the looks and checks are doing
}
