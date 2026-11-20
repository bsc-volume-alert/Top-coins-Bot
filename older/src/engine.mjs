// engine.mjs — ties the feed to series, signals, entries and storage (spec older-2). One collector for every book.
// Input: reconstructed PumpSwap pool states (one per reserve-changing event: buy, sell, deposit, withdraw, boost) and a clock tick.
// The engine never fetches anything itself; providers (creation time, back-fill, SOL/USD, entry verification) are injected.
// Clocks: `t` is OUR receive time (seconds). A signal exists when our engine can use it, so execution delays start there, never at
// the transaction's block time. Both times are stored. Replayed (held) events update history but never create signals.
import * as S from "./spec.mjs";
import { Series, Coverage } from "./series.mjs";
import { newCoin, evaluate } from "./signals.mjs";
import { newEntry, advance, observe, entryDone, inventories, dueAt } from "./book.mjs";
import { liquidityUsd, staticImpact } from "./fills.mjs";

const POLLED_UNSUPPORTED = new Set(["HH-BREAK"]);
export class Engine {
  constructor({ store = null, solUsd = () => null, needCreation = () => {}, onFill = () => {}, log = () => {}, firstStart = null } = {}) {
    this.cov = new Coverage(); this.feedCov = new Coverage(); /* feed + restarts only: what pool-state trust and exit flags depend on */ this.coins = new Map(); this.entries = new Map(); this.byMint = new Map();
    this.store = store; this.solUsd = solUsd; this.needCreation = needCreation; this.onFill = onFill; this.log = log; this.firstStart = firstStart;
    this.stats = { events: 0, swaps: 0, otherPool: 0, noSolUsd: 0, noCreation: 0, evals: 0, cands: 0, entries: 0, notes: 0, replayed: 0, tooOld: 0, lastT: null, evalMsMax: 0 };
    this.dirtyBars = new Map(); this.usdDown = false;
    this.pollCov = new Coverage(); // continuity of PRICE POLLING (the Solana-wide adapter); independent of the PumpSwap WebSocket
    this.stats.prices = 0; this.stats.riskBlocked = 0; this.stats.quotes = 0;
  }
  restartGap(from, to) { if (from != null && to > from) { this.cov.gaps.push([from, to]); this.feedCov.gaps.push([from, to]); this.store?.feedEvent(to, "restart-gap", `${from}`); } }
  feedUp(t) { this.feedCov.up(t, "feed"); this.cov.up(t, "feed"); if (!this.cov.down) for (const c of this.coins.values()) c.series.startLive(t); this.store?.feedEvent(t, "up"); }
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
  coinLost(mint, t) { const c = this.coin(mint); c.series.histFrom = t; c.series.raw = []; c.series.prevT = null; c.lostAt = t; this.stats.coinLost = (this.stats.coinLost || 0) + 1; }
  /** a pool created after the feed started: before it, the coin traded on the bonding curve, which this feed does not see */
  historyFrom(mint, t) { const c = this.coin(mint); if (c.series.histFrom === null || c.series.histFrom < t) c.series.histFrom = t; }
  setRef(mint, ag, ref) { const c = this.coin(mint); const g = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); if (!g.ref || g.ref.status !== "OK") g.ref = ref; }
  restoreDone(mint, ag, family) { const c = this.coin(mint); (c.groups[ag] ||= { ref: null, done: {}, logged: {} }).done[family] = 1; }
  addEntry(e) { this.entries.set(e.id, e); let s = this.byMint.get(e.mint); if (!s) this.byMint.set(e.mint, (s = new Set())); s.add(e.id); }
  /** is the coin's current state known-good at time `at`? (observed, and nothing unknown between its observation and `at`) */
  trustedAt(c, at) { return !!c.state && (c.lostAt === null || c.state.t >= c.lostAt) && this.feedCov.gapsIn(c.state.t, at).length === 0; }
  _run(mint, upTo, c) {
    const ids = this.byMint.get(mint); if (!ids) return;
    for (const id of ids) { const e = this.entries.get(id), was = e.status, sig = e.versions.map((v) => v.status).join(); advance(e, upTo, c.state, (at) => this.trustedAt(c, at), this.feedCov); this._after(e, was, sig, ids, c); }
  }
  _after(e, was, sig, ids, c) {
    if (was === "pending" && e.status === "filled") { e.fill.pool = c.pool; this.onFill(e, c); }
    if (e.status !== was || e.versions.map((v) => v.status).join() !== sig) this.store?.saveEntry(e);
    if (entryDone(e)) { this.store?.saveEntry(e); ids.delete(e.id); this.entries.delete(e.id); /* finished entries live in the database only */ }
  }

  /** ev: { t, mint, pool, kind, state:{base, quote, feeBuy, feeSell, supply}, sol, isBuy, user, sig, slot, blockTs, replay } */
  onEvent(ev) {
    const t0 = performance.now(); this.stats.events++; this.stats.lastT = ev.t; if (ev.kind === "buy" || ev.kind === "sell") this.stats.swaps++;
    const c = this.coin(ev.mint, { pool: ev.pool });
    if (c.pool && ev.pool !== c.pool) { this.stats.otherPool++; return; } // price and fills come from the canonical pool only
    // 1) orders scheduled before this event execute against the state that was in force until now
    if (!ev.replay) this._run(ev.mint, ev.t, c);
    // 2) the new state
    const prev = c.state; const st = { ...ev.state, feeBuy: ev.state.feeBuy ?? prev?.feeBuy ?? null, feeSell: ev.state.feeSell ?? prev?.feeSell ?? null, supply: ev.state.supply ?? prev?.supply ?? null, t: ev.t };
    c.state = st; if (st.supply) c.supply = st.supply;
    // 3) open positions see it (value, peaks, triggers) — in SOL, independent of the USD reference
    if (!ev.replay) { const ids = this.byMint.get(ev.mint); if (ids) for (const id of ids) { const e = this.entries.get(id), was = e.status, sig = e.versions.map((v) => v.status).join(); observe(e, st, ev.t, this.feedCov); this._after(e, was, sig, ids, c); } }
    // 4) USD history and signals
    const su = this.solUsd(ev.t);
    if (!su) { this.stats.noSolUsd++; if (!this.usdDown) { this.usdDown = true; this.cov.drop(ev.t, "sol-usd"); this.store?.feedEvent(ev.t, "sol-usd stale: new entries suspended, positions still managed in SOL"); } return; }
    if (this.usdDown) { this.usdDown = false; this.cov.up(ev.t, "sol-usd"); this.store?.feedEvent(ev.t, "sol-usd back"); }
    const px = (st.quote / st.base) * su; // USD per token: pool spot price from effective reserves after this event
    c.series.add(ev.t, px, (ev.sol || 0) * su, ev.isBuy ?? null, ev.user ?? null);
    (this.dirtyBars.get(ev.mint) || this.dirtyBars.set(ev.mint, new Set()).get(ev.mint)).add(Math.floor(ev.t / 60));
    if (ev.replay) { this.stats.replayed++; return; }
    if (!c.createTs) { this.stats.noCreation++; this.needCreation(ev.mint); return; }
    const age = ev.t - c.createTs; if (age < S.MIN_AGE_S) return; if (!S.ageGroupOf(age)) { this.stats.tooOld++; return; }
    this.stats.evals++;
    const o = { t: ev.t, px, mc: px * c.supply, liqUsd: liquidityUsd(st, su), rtImpact: staticImpact(st) };
    this._decide(c, ev.mint, o, {}, { trigger: { t: ev.t, block_ts: ev.blockTs ?? null, sig: ev.sig ?? null, slot: ev.slot ?? null, kind: ev.kind ?? null, px_usd: px, sol_usd: su, base: st.base, quote_eff: st.quote, fee_buy: st.feeBuy, fee_sell: st.feeSell, supply: c.supply, age_s: Math.round(age), coverage: "covered" } },
      { pop: c.info.population || "pumpswap-canonical", mode: "live", exec: "reconstructed-pool-state", valuation: "pool price × on-chain base supply (from the swap event)" });
    const ms = performance.now() - t0; if (ms > this.stats.evalMsMax) this.stats.evalMsMax = +ms.toFixed(1);
  }
  /** shared: evaluate the families on one observation and open the (shared) entry */
  _decide(c, mint, o, opts, evidenceExtra, tags) {
    // risk checks only stop entries whose EXECUTION assumption is unsupported (known transfer restrictions); they are not a quality filter
    if (c.info.risk?.status === "restricted") { if (!c.riskNoted) { c.riskNoted = true; this.stats.riskBlocked++; this.store?.saveNote(mint, { ag: null, family: "*", t: o.t, reason: "not evaluated for entry: token transfer restrictions make the execution assumption unsupported", detail: { risk: c.info.risk } }); } return null; }
    const r = evaluate(c, o, opts);
    for (const n of r.notes) { this.stats.notes++; this.store?.saveNote(mint, n); }
    if (!r.cands.length) return null;
    this.stats.cands += r.cands.length;
    const evidence = { ...r.evidence, ...evidenceExtra }; evidence.trigger.eval_t = Date.now() / 1000;
    const e = newEntry({ mint, pool: c.pool, ag: r.cands[0].ag, t: o.t, families: r.cands.map((x) => x.family), features: r.cands[0].features, mc: o.mc, px: o.px, evidence, startup: this.firstStart != null && o.t < this.firstStart + S.STARTUP_TAG_S });
    e.cands = r.cands.map((x) => ({ family: x.family, detail: x.detail }));
    Object.assign(e, tags); e.token = { origin: c.info.origin ?? null, origin_evidence: c.info.origin_evidence ?? null, venues: c.info.venues ?? null, token_program: c.info.token_program ?? null, risk_status: c.info.risk?.status ?? "missing", create_src: c.info.create_src ?? null, cadence_s: c.info.cadence_s ?? null };
    this.addEntry(e); this.stats.entries++;
    this.store?.saveEntry(e); for (const x of r.cands) this.store?.saveDecision(mint, x.ag, x.family, o.t, e.id, x.detail);
    this.log(`[entry ${e.id}] ${mint.slice(0, 6)} ${e.ag} ${e.families.join("+")} mc $${Math.round(o.mc)} (${e.mode})`);
    return e;
  }

  // ---------- Solana-wide adapter: sampled prices + routed quotes ----------
  pollUp(t) { this.pollCov.up(t, "feed"); }
  pollDown(t, why = "") { this.pollCov.drop(t, "feed"); this.store?.feedEvent(t, "poll-down", why); }
  /** p: { t (response time), mint, px (USD), mc (USD, provider's stated definition), liqUsd, supply, src, cadence_s } */
  onPrice(p) {
    this.stats.prices++; const c = this.coins.get(p.mint); if (!c || c.mode !== "polled") return;
    c.series.add(p.t, p.px, 0, null, null); if (p.supply) c.supply = p.supply; c.info.cadence_s = p.cadence_s ?? c.info.cadence_s;
    (this.dirtyBars.get(p.mint) || this.dirtyBars.set(p.mint, new Set()).get(p.mint)).add(Math.floor(p.t / 60));
    if (!c.createTs) { this.stats.noCreation++; return; }
    const age = p.t - c.createTs; if (age < S.MIN_AGE_S) return; if (!S.ageGroupOf(age)) { this.stats.tooOld++; return; }
    this.stats.evals++;
    const o = { t: p.t, px: p.px, mc: p.mc ?? p.px * c.supply, liqUsd: p.liqUsd ?? null, rtImpact: null };
    // sampled prices carry no volume: HH-BREAK cannot be evaluated here and is NOT claimed (counted as unsupported for this mode)
    this._decide(c, p.mint, o, { skip: POLLED_UNSUPPORTED }, { trigger: { t: p.t, px_usd: p.px, src: p.src ?? null, supply: c.supply, age_s: Math.round(age), cadence_s: p.cadence_s ?? null, coverage: "sampled" } },
      { pop: "solana-wide", mode: "polled", exec: "routed-quote", valuation: p.valuation || "provider market cap" });
  }
  /** what the quote provider must price now: [{ id, mint, buy_sol | null, sells: [tok…], due }] — one request per DISTINCT size, never per row */
  quoteNeeds(now) {
    const out = [];
    for (const [mint, ids] of this.byMint) for (const id of ids) { const e = this.entries.get(id); if (e.exec !== "routed-quote") continue;
      if (e.status === "pending") { if (now >= e.schedT) out.push({ id, mint, buy_sol: S.STAKE_SOL, sells: [], due: e.schedT }); }
      else if (e.status === "filled") { const inv = inventories(e); if (inv.length) out.push({ id, mint, buy_sol: null, sells: inv, due: dueAt(e) }); } }
    return out;
  }
  /** st: { kind: "quote", reqT, t, buy?, sells } — a routed quote that became available at st.t */
  onQuote(id, st) {
    const e = this.entries.get(id); if (!e) return; this.stats.quotes++;
    const c = this.coins.get(e.mint), ids = this.byMint.get(e.mint), was = e.status, sig = e.versions.map((v) => v.status).join();
    observe(e, st, st.t, this.pollCov); this._after(e, was, sig, ids, c);
  }

  onSwap(ev) { this.onEvent({ ...ev, kind: ev.isBuy ? "buy" : "sell", state: ev.state ?? { base: ev.base, quote: ev.quote, feeBuy: ev.feeBuy ?? (ev.feeBps != null ? ev.feeBps / 1e4 : null), feeSell: ev.feeSell ?? (ev.feeBps != null ? ev.feeBps / 1e4 : null), supply: ev.supply ?? null } }); }

  tick(now) {
    for (const [mint, ids] of this.byMint) if (ids.size) this._run(mint, now, this.coins.get(mint));
    const curM = Math.floor(now / 60);
    if (this.store) for (const [mint, ms] of this.dirtyBars) { const c = this.coins.get(mint); for (const m of ms) if (m < curM) { const b = c.series.bars.get(m); if (b) this.store.saveBar(mint, m, b); ms.delete(m); } if (!ms.size) this.dirtyBars.delete(mint); }
  }
  /** memory housekeeping (call about once a minute) */
  prune(now) { for (const [mint, c] of this.coins) { c.series.prune(now); if (c.series.lastT !== null && now - c.series.lastT > S.BAR_KEEP_S && !this.byMint.get(mint)?.size && c.series.raw.length) { this.store?.saveLast(mint, c); c.series.raw = []; } } }
}
