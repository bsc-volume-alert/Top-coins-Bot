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
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import * as S from "./spec.mjs";
import { classifyJupToken, feeKnown } from "./risk.mjs";
import { parseInfo } from "./gates.mjs";
import { validDec } from "./polled.mjs";

const volOf = (st) => (st && (st.buyVolume != null || st.sellVolume != null) ? (st.buyVolume || 0) + (st.sellVolume || 0) : null);
/** what one provider record says about a coin at its age point (figures as given; null = the provider gave none) */
export function measure(tok) {
  const v1 = volOf(tok.stats1h), v5 = volOf(tok.stats5m), vol = v1 != null && v5 != null ? Math.max(v1, v5) : v1 ?? v5; // since creation: the 1-hour figure covers a coin's whole life when it is minutes old; the 5-minute figure is the fallback
  return { mc: tok.mcap ?? null, holders: tok.holders ?? null, vol, vol_basis: vol == null ? null : vol === v1 ? "1h statistics (whole life)" : "5m statistics", top_jup: tok.top_holders_pct != null ? tok.top_holders_pct / 100 : null, px: tok.px ?? null, liq: tok.liq_usd ?? null, traders: tok.stats1h?.numTraders ?? tok.stats5m?.numTraders ?? null, curve_pct: tok.curve_pct ?? null };
}
/** the provider-side rules of one book on one measurement: each true / false / null (figure missing) */
export function judgeMeasure(m, r) {
  const t = (v, f) => (v == null ? null : f(v));
  return { mc: t(m.mc, (v) => v > r.mc_min_usd), holders: t(m.holders, (v) => v > r.holders_min), vol: t(m.vol, (v) => v >= r.vol_min_usd), top_jup: t(m.top_jup, (v) => v >= r.top10[0] && v <= r.top10[1]) };
}
const fresh = () => ({ since: null, looks: 0, look_errors: 0, looks_no_overlap: 0, seen: 0, no_creation: 0, by_launchpad: {}, last_look: null, last_error: null, checks: {} });
const freshCheck = () => ({ reached: 0, too_late: 0, search_failed: 0, not_answered: 0, measured: 0,
  mc: 0, holders: 0, vol: 0, top_jup: 0, mc_holders: 0, mc_vol: 0, candidates: 0, // each rule on its own, two pairs, and all three provider-side rules together
  no_figure: { mc: 0, holders: 0, vol: 0, top_jup: 0 },
  gmgn_asked: 0, gmgn_ok: 0, gmgn_failed: 0, fees: 0, top10: 0, age_ok: 0, passed_all: 0, risk_unknown: 0, risk_blocked: 0, not_opened: 0, bought: 0,
  max: { mc: 0, holders: 0, vol: 0 }, recent: [] });
const timeout = (p, ms, what) => new Promise((res, rej) => { const h = setTimeout(() => rej(new Error(`${what} did not arrive within ${Math.round(ms / 1000)} s`)), ms); h.unref?.(); Promise.resolve(p).then((v) => { clearTimeout(h); res(v); }, (e) => { clearTimeout(h); rej(e); }); });

export class NewCoins {
  /** jup: { recent(), tokens(mints) } · quoter: the Poller that prices routed-quote buys (only its watch list is touched here)
   *  readInfo(mint) → GMGN token info · readRisk(mint) → classifyMintAccount result for the mint (transfer restrictions) */
  constructor({ engine, jup, quoter, readInfo, readRisk = null, store = null, now = () => Date.now() / 1000, log = () => {}, file = null, rules = S.NEW_COIN }) {
    Object.assign(this, { engine, jup, quoter, readInfo, readRisk, store, now, log, file, rules });
    this.young = new Map(); this.prevIds = null; this.inflight = new Set(); this.maxAt = Math.max(...rules.map((r) => r.at_s)); this.stats = fresh(); this.dirty = false;
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
      for (const r of this.rules) { if (c.done[r.family] || age < r.at_s) continue; if (age > r.at_s + S.NEW_CHECK_LATE_S) { c.done[r.family] = 1; const K = this.k(r.family); K.reached++; K.too_late++; this.dirty = true; continue; } jobs.push([c, r]); }
      if (age > this.maxAt + S.NEW_CHECK_LATE_S && this.rules.every((r) => c.done[r.family])) this.young.delete(c.mint); }
    if (!jobs.length) return 0;
    const mints = [...new Set(jobs.map((j) => j[0].mint))], rows = new Map(), failed = new Set(); let n = 0;
    for (let i = 0; i < mints.length; i += 100) { const batch = mints.slice(i, i + 100); try { for (const t of await this.jup.tokens(batch)) rows.set(t.mint, t); } catch (e) { for (const m of batch) failed.add(m); this.stats.last_error = "token data: " + String(e.message).slice(0, 100); } }
    const t = this.now(); this.dirty = true;
    for (const [c, r] of jobs) { const K = this.k(r.family);
      if (failed.has(c.mint)) { K.search_failed++; continue; } // the request itself failed: asked again at the next pass while the coin is still inside its window (then "too late")
      c.done[r.family] = 1; K.reached++; const tok = rows.get(c.mint); if (!tok) { K.not_answered++; continue; }
      const m = measure(tok), j = judgeMeasure(m, r), age = t - c.created; K.measured++; n++;
      for (const k of ["mc", "holders", "vol", "top_jup"]) { if (j[k] == null) K.no_figure[k]++; else if (j[k]) K[k]++; }
      for (const k of ["mc", "holders", "vol"]) if (m[k] > K.max[k]) K.max[k] = Math.round(m[k]);
      if (m.vol_basis && m.vol_basis.startsWith("5m")) K.vol_from_5m = (K.vol_from_5m || 0) + 1; // the provider gave no 1-hour statistics: the volume is the last 5 minutes only
      if (j.mc && j.holders) K.mc_holders++; if (j.mc && j.vol) K.mc_vol++;
      const rec = { t: Math.round(t), mint: c.mint, sym: tok.symbol ?? c.symbol ?? null, lp: c.launchpad, age_s: Math.round(age), mc: m.mc == null ? null : Math.round(m.mc), holders: m.holders, vol: m.vol == null ? null : Math.round(m.vol), top_jup: m.top_jup == null ? null : +m.top_jup.toFixed(4), ok: { mc: j.mc, holders: j.holders, vol: j.vol } };
      if (j.mc && j.holders && j.vol) { K.candidates++; const p = this.candidate(c, r, tok, m, rec).catch((e) => { rec.out = "error: " + String(e.message).slice(0, 100); this.note(K, rec); }).finally(() => { this.inflight.delete(p); this.dirty = true; }); this.inflight.add(p); }
      else if (j.mc) { rec.out = "not bought: " + [j.holders ? null : `holders ${m.holders ?? "?"} (needs over ${r.holders_min})`, j.vol ? null : `volume $${m.vol == null ? "?" : Math.round(m.vol / 1000) + "K"} (needs $${r.vol_min_usd / 1000}K)`].filter(Boolean).join(", "); this.note(K, rec); } } // the near misses are kept: a coin over the market-cap line that failed another rule
    return n;
  }
  note(K, rec) { K.recent.push(rec); if (K.recent.length > 25) K.recent.shift(); this.dirty = true; }
  /** every candidate still waiting for its GMGN reading or its buy (tests; a clean stop) */
  idle() { return Promise.all([...this.inflight]); }
  /** 3. BUY — a coin that passed market cap, holders and volume at its age point */
  async candidate(c, r, tok, m, rec) {
    const K = this.k(r.family), E = this.engine, t0 = this.now(); K.gmgn_asked++;
    let info; try { info = await timeout(this.readInfo(c.mint), S.NEW_GMGN_WAIT_S * 1000, "the GMGN reading"); } catch (e) { K.gmgn_failed++; rec.out = "not bought: no GMGN reading (" + String(e.message).slice(0, 80) + ")"; return this.note(K, rec); }
    const t1 = this.now(), g = parseInfo(info, null, false); K.gmgn_ok++;
    const created = g.created > 1e12 ? g.created / 1000 : g.created, gAge = created > 0 ? t1 - created : null;
    const feesOk = g.fees_sol != null && g.fees_sol >= r.fees_min_sol, topOk = g.top10 != null && g.top10 >= r.top10[0] && g.top10 <= r.top10[1], ageOk = gAge == null || gAge <= r.at_s + S.NEW_AGE_SLACK_S;
    if (feesOk) K.fees++; if (topOk) K.top10++; if (ageOk) K.age_ok++;
    Object.assign(rec, { fees: g.fees_sol, top10: g.top10, gmgn_ms: Math.round((t1 - t0) * 1000), gmgn_age_s: gAge == null ? null : Math.round(gAge) });
    if (!feesOk || !topOk || !ageOk) { rec.out = "not bought: " + [feesOk ? null : `fees ${g.fees_sol == null ? "?" : +g.fees_sol.toFixed(2)} SOL (needs ${r.fees_min_sol})`, topOk ? null : `top 10 holders ${g.top10 == null ? "?" : (g.top10 * 100).toFixed(1) + "%"} (needs ${r.top10[0] * 100}–${r.top10[1] * 100}%)`, ageOk ? null : `GMGN says the coin is ${Math.round(gAge / 60)} minutes old`].filter(Boolean).join(", "); return this.note(K, rec); }
    K.passed_all++;
    // the coin itself: an ordinary coin of the engine that simply has no pool yet (if it migrates, the pool books see it like any other)
    if (!validDec(tok.decimals)) { K.not_opened++; rec.out = "not bought: the provider gave no decimals for the coin (it cannot be quoted)"; return this.note(K, rec); }
    const had = E.coins.get(c.mint), origin = tok.launchpad || c.launchpad || "unknown";
    const coin = E.coin(c.mint, { createTs: c.created, info: had ? null : { symbol: tok.symbol ?? null, decimals: tok.decimals, circ_supply: tok.circ_supply ?? null, origin, origin_evidence: tok.launchpad ? "provider launchpad field" : "none", token_program: tok.token_program ?? null, discovery_source: "jupiter recent (first pool)", risk: classifyJupToken(tok), create_src: "jupiter firstPool.createdAt (for a launchpad coin its launch curve, created with the coin)" } });
    if (had && coin.info.decimals == null) coin.info.decimals = tok.decimals;
    if (!feeKnown(coin.info) && this.readRisk) { try { const k = await timeout(this.readRisk(c.mint), 8000, "the mint account"); if (k && k.status !== "missing") { k.read_at = Math.round(this.now()); coin.info.risk = k; if (k.program) coin.info.token_program = k.program; coin.riskRead = true; coin.riskAt = this.now(); } } catch (e) { rec.risk_err = String(e.message).slice(0, 80); } }
    this.store?.saveCoin(c.mint, { createTs: c.created, createSrc: "jupiter firstPool", pumpOrigin: origin, firstSeen: Math.floor(t1), info: coin.info });
    if (!feeKnown(coin.info)) { K.risk_unknown++; rec.out = "not bought: the coin's transfer restrictions could not be read from the chain"; return this.note(K, rec); }
    if (coin.info.risk?.status === "restricted") { K.risk_blocked++; rec.out = "not bought: the coin restricts transfers (" + ((coin.info.risk.blocking || []).join(", ") || "restriction") + ")"; return this.note(K, rec); }
    const t = this.now(), age = t - c.created, out = {};
    const detail = { rule: { ...r }, age_s: +age.toFixed(1), measured_at: rec.t, jupiter: { mc: m.mc, holders: m.holders, vol_usd: m.vol, vol_basis: m.vol_basis, top_holders: m.top_jup, liq_usd: m.liq, traders: m.traders, curve_pct: m.curve_pct, updated: tok.updated ?? null }, gmgn: { fees_sol: g.fees_sol, top10: g.top10, created: created ?? null, age_s: gAge == null ? null : +gAge.toFixed(1), asked: t0, answered: t1 } };
    this.watch(c.mint, tok.decimals, tok.circ_supply);
    const e = E.openDirect({ mint: c.mint, family: r.family, t, mc: m.mc, px: m.px, features: { age_s: Math.round(age), mc: m.mc, holders: m.holders, vol_usd: m.vol, fees_sol: g.fees_sol, top10: g.top10, liq_usd: m.liq }, detail, trigger: { px_usd: m.px, src: "jupiter token data + gmgn token info", age_s: Math.round(age), supply: tok.circ_supply ?? tok.total_supply ?? null }, token: { decimals: tok.decimals } }, out);
    if (!e) { K.not_opened++; rec.out = "not bought: " + (out.why || "the buy could not be opened"); if (!E.byMint.get(c.mint)?.size) this.quoter.watch.delete(c.mint); return this.note(K, rec); }
    // the reading the rule was judged on, kept on the buy in the same shape as the other books' GMGN reading (so the page shows it)
    e.gate = { kind: "new-coin rule", req_t: t0, resp_t: t1, ms: Math.round((t1 - t0) * 1000), reading: g, verdict: "pass", timely: true, at_buy: "reading", by: { [r.family]: { pass: true } } };
    this.store?.saveEntry(e); K.bought++; rec.out = "BOUGHT (paper), entry " + e.id; rec.entry = e.id; this.note(K, rec);
  }
  /** for the status report and the page */
  status() { const q = this.quoter?.stats || {}; return { on: true, rules: this.rules, look_s: S.NEW_LOOK_S, waiting: this.young.size, in_flight: this.inflight.size, quotes: { ok: q.quotesOk || 0, no_route: q.noRoute || 0, errors: q.quoteErr || 0, watched: this.quoter?.watch.size ?? 0 }, ...this.stats }; }
  start() { const loop = async () => { while (!this.stopped) { const t0 = Date.now(); try { await this.look(); await this.check(); this.save(); } catch (e) { this.log("[new coins] " + e.message); } await new Promise((r) => setTimeout(r, Math.max(1000, S.NEW_LOOK_S * 1000 - (Date.now() - t0)))); } }; loop(); }
}
