// book.mjs — shared entry inventory and independent exit versions (spec older-2).
// One ENTRY per (mint, decision observation, age group): every family whose candidate came from that same observation shares it.
// Each entry carries exit VERSIONS: stop (20/25/30/40%) × policy (trail | scale) and, when CONT-STALL is among its families,
// the same set again with the 60-minute stall rule. Versions never affect each other.
//
// EXECUTION MODEL (declared assumptions): buy at signal availability + 1 s, sell at trigger availability + 0.7 s, priced from
// the pool state IN FORCE at that scheduled moment (the latest reconstructed state — a pool can be traded without anyone else
// trading). The state must be trustworthy at that moment (continuous feed coverage since it was observed). If it is not:
//   buy  → the first trustworthy state within 5 s is used (delay recorded); otherwise a pricing/data timeout cancels the entry;
//   sell → stays triggered and waits for the first trustworthy state (delay recorded); unresolved after 24 h. Never dropped.
import * as S from "./spec.mjs";
import { buyTokens, liqValue, sellSol, feeSrc, feeBuy, isQuote } from "./fills.mjs";

let NEXT = 1;
export const COST = S.STAKE_SOL + S.TX_COST_SOL; // acquisition cost: stake + buy transaction

export function newEntry({ mint, pool, ag, t, families, features, mc, px, evidence = null, startup = false }) {
  const fam = [...new Set(families)], versions = [];
  const sets = []; if (fam.some((f) => f !== "CONT-STALL")) sets.push(false); if (fam.includes("CONT-STALL")) sets.push(true);
  for (const stall of sets) for (const policy of S.POLICIES) for (const stop of S.STOPS) versions.push({ stop, policy, stall, status: "open", tok: 0, got: 0, peak: null, maxX: null, half: null, trigT: null, reason: null, schedT: null, exit: null, stallChecked: false });
  return { id: NEXT++, mint, pool, ag, decisionT: t, schedT: t + S.BUY_DELAY_MS / 1000, families: fam, features, signalMc: mc, signalPx: px, evidence, startup,
    status: "pending", fill: null, versions, runner: { maxX: null, horizonDone: false, partial: false, reached: {} }, flags: [] };
}
export const versionsFor = (e, family, policy = "trail") => e.versions.filter((v) => v.stall === (family === "CONT-STALL") && v.policy === policy);
export function setNextId(n) { NEXT = Math.max(NEXT, n); }
const live = (v) => v.status === "open" || v.status === "scaling" || v.status === "selling";

function fillBuy(e, st, at, delay) {
  const tok = buyTokens(st, S.STAKE_SOL);
  if (tok == null) return false; // this state cannot price the 0.2 SOL buy (e.g. a quote state without a buy quote): keep waiting
  if (!(tok > 0)) { e.status = "cancelled"; e.flags.push("pool state could not price the buy"); return true; }
  e.status = "filled";
  const q = isQuote(st);
  e.fill = { t: at, tok, cost: COST, delay_s: +delay.toFixed(3), state_age_s: q ? null : +(at - st.t).toFixed(3), fee_buy: q ? null : feeBuy(st), fee_src: feeSrc(st, "buy"),
    quote_sol: q ? null : st.quote, base: q ? null : st.base, px_sol: q ? S.STAKE_SOL / tok : (S.STAKE_SOL / (1 + feeBuy(st))) / tok,
    exec: q ? "routed-quote" : "reconstructed-pool-state", ...(q ? { quote: { req_t: st.reqT, resp_t: st.t, route: st.buy.route ?? null, router: st.buy.router ?? null, fee_bps: st.buy.feeBps ?? null, impact: st.buy.impact ?? null } } : {}) };
  if (st.feeOdd) e.flags.push("unusual pool fee rate observed; used as observed");
  // the position's first valuation: from the same state when it can price the sale (pool state); a quote-priced entry starts at
  // cost and takes its first real valuation from its first sell quote — a missing valuation is never treated as a fall
  const v0 = liqValue(st, tok) ?? COST; e.runner.maxX = v0 / COST;
  for (const v of e.versions) { v.tok = tok; v.peak = v0; v.maxX = v0 / COST; }
  return true;
}
function trigger(v, t, reason, value) { v.status = "selling"; v.trigT = t; v.reason = reason; v.trigValue = value; v.schedT = t + S.SELL_DELAY_MS / 1000; }
/** returns false when this state cannot price the order (it then stays pending — a sale is never dropped or priced at zero) */
function execSell(e, v, st, at, delay, cov) {
  const q = isQuote(st), meta = q ? { exec: "routed-quote", quote: { req_t: st.reqT, resp_t: st.t } } : { exec: "reconstructed-pool-state", state_age_s: +(at - st.t).toFixed(3) };
  if (v.status === "scaling") {
    // SCALE-OUT FORMULA. part = half of the ORIGINAL tokens. One sale, one transaction cost:  got += sell(part) − TX.
    // High-water mark: peak_new = peak_old × value(remaining) / value(held before), both valued on this same state.
    // ⇒ drawdown from the peak is IDENTICAL before and after the sale: selling half neither creates a 50% "fall" nor resets the trail.
    const part = e.fill.tok * S.SCALE_FRACTION, gross = sellSol(st, part), before = liqValue(st, v.tok), after = liqValue(st, v.tok - part);
    if (gross == null || before == null || after == null) return false;
    const sol = Math.max(0, gross - S.TX_COST_SOL);
    v.got += sol; v.tok -= part; if (before > v.peak) v.peak = before; // a new high seen at execution counts before rescaling
    v.peak = before > 0 ? v.peak * (after / before) : after;
    v.half = { t: at, sol, delay_s: +delay.toFixed(3), trigger_value: v.trigValue, ...meta }; v.status = "open"; v.schedT = null; return true;
  }
  let sol = 0; if (v.tok > 0) { const g = sellSol(st, v.tok); if (g == null) return false; sol = Math.max(0, g - S.TX_COST_SOL); }
  const total = v.got + sol;
  v.status = "closed"; v.tok = 0;
  v.exit = { t: at, sol: total, last_sol: sol, ret: total / COST - 1, delay_s: +delay.toFixed(3), hold_s: Math.round(at - e.fill.t), trigger_value: v.trigValue ?? null, fee_src: feeSrc(st, "sell"), ...meta };
  if (cov && cov.gapsIn(e.fill.t, at).length) v.exit.outage_during = true;
  return true;
}

/** Everything scheduled at or before `upTo` is executed against `st`, the state in force until then. trusted(at) says whether
 *  that state is known-good at time `at`. Called before a new state replaces `st`, and on every clock tick. */
export function advance(e, upTo, st, trusted, cov) {
  if (e.status === "pending") {
    if (e.schedT > upTo) return;
    if (st && trusted(e.schedT) && fillBuy(e, st, e.schedT, 0)) { /* filled or cancelled */ }
    else if (upTo > e.schedT + S.BUY_PRICING_TIMEOUT_S) { e.status = "cancelled"; e.flags.push("pricing/data timeout: no trustworthy pool state within 5 s of the scheduled buy"); return; }
    else return;
  }
  if (e.status !== "filled") return;
  for (let guard = 0; guard < 6; guard++) {
    let changed = false;
    for (const v of e.versions) {
      if (v.status === "open" || v.status === "scaling") { // time-based triggers, in time order
        const stallT = e.fill.t + S.STALL_AT_S, endT = e.fill.t + S.MAX_HOLD_S;
        if (v.stall && !v.stallChecked && stallT <= upTo) { v.stallChecked = true; if (v.maxX < S.STALL_MIN_PEAK_X) { trigger(v, stallT, "stall", null); changed = true; continue; } }
        if (endT <= upTo) { trigger(v, endT, "max-hold", null); changed = true; continue; }
      }
      if ((v.status === "selling" || v.status === "scaling") && v.schedT != null && v.schedT <= upTo) {
        if (st && trusted(v.schedT) && execSell(e, v, st, v.schedT, 0, cov)) changed = true;
        else if (upTo > v.schedT + S.SELL_UNRESOLVED_S) { v.status = "unresolved"; v.unresolvedWhy = "no trustworthy pool state for 24 h after the scheduled sale"; changed = true; }
      }
    }
    if (!changed) break;
  }
  if (!e.runner.horizonDone && upTo >= e.fill.t + S.RUNNER_HORIZON_S) { e.runner.horizonDone = true; if (cov && cov.gapsIn(e.fill.t, e.fill.t + S.RUNNER_HORIZON_S).length) e.runner.partial = true; }
}

/** A new trustworthy state `st` was observed at time t (after advance() ran with the previous state).
 *  For a routed-quote state, t is when the RESPONSE became available and st.reqT when it was requested: an order may only be
 *  priced by a quote requested at or after its scheduled time (a later quote is never back-dated to the scheduled instant). */
export function observe(e, st, t, cov) {
  const q = isQuote(st), fresh = (sched) => !q || st.reqT >= sched;
  if (e.status === "pending") { // scheduled time passed without a trustworthy state: the first one within 5 s prices the buy
    if (t >= e.schedT && t <= e.schedT + S.BUY_PRICING_TIMEOUT_S && fresh(e.schedT)) fillBuy(e, st, t, t - e.schedT);
    return;
  }
  if (e.status !== "filled") return;
  const full = liqValue(st, e.fill.tok), age = t - e.fill.t;
  if (full != null) { const x = full / COST; if (age <= S.RUNNER_HORIZON_S) { if (x > e.runner.maxX) e.runner.maxX = x; for (const k of S.RUNNER_X) if (x >= k && !e.runner.reached[k]) e.runner.reached[k] = Math.round(age); } }
  for (const v of e.versions) {
    if ((v.status === "selling" || v.status === "scaling") && v.schedT <= t && fresh(v.schedT)) { execSell(e, v, st, t, t - v.schedT, cov); if (v.status === "closed") continue; } // overdue order: first trustworthy state
    if (v.status !== "open" && v.status !== "scaling") continue;
    const val = liqValue(st, v.tok); if (val == null) continue; // this state does not price this holding: no peak, no trigger
    if (val > v.peak) v.peak = val; if (full != null && full / COST > v.maxX) v.maxX = full / COST;
    if (val <= v.peak * (1 - v.stop)) trigger(v, t, "trail", val); // also replaces a pending half-sale: one order, never two on the same tokens
    else if (v.status === "open" && v.policy === "scale" && !v.half && full != null && full >= S.SCALE_AT_X * COST) { v.status = "scaling"; v.trigT = t; v.trigValue = full; v.schedT = t + S.SELL_DELAY_MS / 1000; }
  }
}
/** the distinct token quantities an entry currently needs a sell quote for (a routed-quote provider is asked for exactly these) */
export function inventories(e) { if (e.status !== "filled") return []; const s = new Set(); for (const v of e.versions) if (live(v) && v.tok > 0) { s.add(v.tok); if (v.status === "scaling" || (v.policy === "scale" && !v.half)) s.add(e.fill.tok * S.SCALE_FRACTION); } if (!e.runner.horizonDone) s.add(e.fill.tok); return [...s]; }
/** the earliest scheduled order still waiting for a price (buy or sell), or null */
export function dueAt(e) { if (e.status === "pending") return e.schedT; let m = null; if (e.status === "filled") for (const v of e.versions) if ((v.status === "selling" || v.status === "scaling") && v.schedT != null && (m === null || v.schedT < m)) m = v.schedT; return m; }
export const entryDone = (e) => e.status === "cancelled" || (e.status === "filled" && e.runner.horizonDone && e.versions.every((v) => !live(v)));
export const exposure = (e) => (e.status === "filled" ? e.versions.filter(live).length : 0);
