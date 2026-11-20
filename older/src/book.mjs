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
import { buyTokens, liqValue, sellSol, feeSrc, feeBuy } from "./fills.mjs";

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
  if (!(tok > 0)) { e.status = "cancelled"; e.flags.push("pool state could not price the buy"); return; }
  e.status = "filled";
  e.fill = { t: at, tok, cost: COST, delay_s: +delay.toFixed(3), state_age_s: +(at - st.t).toFixed(3), fee_buy: feeBuy(st), fee_src: feeSrc(st, "buy"), quote_sol: st.quote, base: st.base, px_sol: (S.STAKE_SOL / (1 + feeBuy(st))) / tok };
  const v0 = liqValue(st, tok); e.runner.maxX = v0 / COST;
  for (const v of e.versions) { v.tok = tok; v.peak = v0; v.maxX = v0 / COST; }
}
function trigger(v, t, reason, value) { v.status = "selling"; v.trigT = t; v.reason = reason; v.trigValue = value; v.schedT = t + S.SELL_DELAY_MS / 1000; }
function execSell(e, v, st, at, delay, cov) {
  if (v.status === "scaling") { // sell half the ORIGINAL tokens; trail the rest on a high-water mark normalised for the smaller holding
    const part = e.fill.tok * S.SCALE_FRACTION, before = liqValue(st, v.tok), sol = Math.max(0, sellSol(st, part) - S.TX_COST_SOL);
    v.got += sol; v.tok -= part; const after = liqValue(st, v.tok);
    v.peak = before > 0 ? v.peak * (after / before) : after; if (after > v.peak) v.peak = after;
    v.half = { t: at, sol, delay_s: +delay.toFixed(3), trigger_value: v.trigValue }; v.status = "open"; v.schedT = null; return;
  }
  const sol = v.tok > 0 ? Math.max(0, sellSol(st, v.tok) - S.TX_COST_SOL) : 0, total = v.got + sol;
  v.status = "closed"; v.tok = 0;
  v.exit = { t: at, sol: total, last_sol: sol, ret: total / COST - 1, delay_s: +delay.toFixed(3), state_age_s: +(at - st.t).toFixed(3), hold_s: Math.round(at - e.fill.t), trigger_value: v.trigValue ?? null, fee_src: feeSrc(st, "sell") };
  if (cov && cov.gapsIn(e.fill.t, at).length) v.exit.outage_during = true;
}

/** Everything scheduled at or before `upTo` is executed against `st`, the state in force until then. trusted(at) says whether
 *  that state is known-good at time `at`. Called before a new state replaces `st`, and on every clock tick. */
export function advance(e, upTo, st, trusted, cov) {
  if (e.status === "pending") {
    if (e.schedT > upTo) return;
    if (st && trusted(e.schedT)) fillBuy(e, st, e.schedT, 0);
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
        if (st && trusted(v.schedT)) { execSell(e, v, st, v.schedT, 0, cov); changed = true; }
        else if (upTo > v.schedT + S.SELL_UNRESOLVED_S) { v.status = "unresolved"; v.unresolvedWhy = "no trustworthy pool state for 24 h after the scheduled sale"; changed = true; }
      }
    }
    if (!changed) break;
  }
  if (!e.runner.horizonDone && upTo >= e.fill.t + S.RUNNER_HORIZON_S) { e.runner.horizonDone = true; if (cov && cov.gapsIn(e.fill.t, e.fill.t + S.RUNNER_HORIZON_S).length) e.runner.partial = true; }
}

/** A new trustworthy state `st` was observed at time t (after advance() ran with the previous state). */
export function observe(e, st, t, cov) {
  if (e.status === "pending") { // scheduled time passed without a trustworthy state: the first one within 5 s prices the buy
    if (t >= e.schedT && t <= e.schedT + S.BUY_PRICING_TIMEOUT_S) fillBuy(e, st, t, t - e.schedT);
    return;
  }
  if (e.status !== "filled") return;
  const full = liqValue(st, e.fill.tok), x = full / COST, age = t - e.fill.t;
  if (age <= S.RUNNER_HORIZON_S) { if (x > e.runner.maxX) e.runner.maxX = x; for (const k of S.RUNNER_X) if (x >= k && !e.runner.reached[k]) e.runner.reached[k] = Math.round(age); }
  for (const v of e.versions) {
    if ((v.status === "selling" || v.status === "scaling") && v.schedT <= t) { execSell(e, v, st, t, t - v.schedT, cov); if (v.status === "closed") continue; } // overdue order: first trustworthy state
    if (v.status !== "open" && v.status !== "scaling") continue;
    const val = liqValue(st, v.tok); if (val > v.peak) v.peak = val; if (x > v.maxX) v.maxX = x;
    if (val <= v.peak * (1 - v.stop)) trigger(v, t, "trail", val); // also replaces a pending half-sale: one order, never two on the same tokens
    else if (v.status === "open" && v.policy === "scale" && !v.half && full >= S.SCALE_AT_X * COST) { v.status = "scaling"; v.trigT = t; v.trigValue = full; v.schedT = t + S.SELL_DELAY_MS / 1000; }
  }
}
export const entryDone = (e) => e.status === "cancelled" || (e.status === "filled" && e.runner.horizonDone && e.versions.every((v) => !live(v)));
export const exposure = (e) => (e.status === "filled" ? e.versions.filter(live).length : 0);
