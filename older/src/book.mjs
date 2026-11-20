// book.mjs — shared entry inventory and independent exit versions.
// One ENTRY per (mint, decision observation, age group): every family whose candidate came from that same observation shares it.
// Each entry carries exit VERSIONS: one per trailing stop (20/25/30/40%), plus a second set with the 60-minute stall rule when
// CONT-STALL is among its families. Versions never affect each other. A family's result row reads the versions it owns:
// CONT-STALL → the stall set, every other family → the plain set.
import * as S from "./spec.mjs";
import { buyTokens, liqValue, sellSol } from "./fills.mjs";

let NEXT = 1;
export const COST = S.STAKE_SOL + S.TX_COST_SOL; // what an entry costs the wallet (stake + buy transaction)

export function newEntry({ mint, pool, ag, t, families, features, mc, px }) {
  const fam = [...new Set(families)];
  const versions = [];
  for (const stop of S.STOPS) {
    if (fam.some((f) => f !== "CONT-STALL")) versions.push(ver(stop, false));
    if (fam.includes("CONT-STALL")) versions.push(ver(stop, true));
  }
  return { id: NEXT++, mint, pool, ag, decisionT: t, schedT: t + S.BUY_DELAY_MS / 1000, families: fam, features, signalMc: mc, signalPx: px,
    status: "pending", fill: null, versions, runner: { maxX: null, horizonDone: false, partial: false, reached: {} }, flags: [] };
}
const ver = (stop, stall) => ({ stop, stall, status: "open", peak: null, trigT: null, reason: null, schedT: null, exit: null, stallChecked: false });
export const versionsFor = (e, family) => e.versions.filter((v) => v.stall === (family === "CONT-STALL"));
export function setNextId(n) { NEXT = Math.max(NEXT, n); }

/** a pool state arrived for this entry's coin (recv time t, seconds) */
export function onState(e, st, t, cov) {
  if (e.status === "pending") {
    if (t < e.schedT) return;
    if (t > e.schedT + S.ENTRY_STATE_MAX_WAIT_S) { e.status = "failed"; e.flags.push("no executable state within 600 s of the scheduled buy"); return; }
    const tok = buyTokens(st, S.STAKE_SOL);
    if (!(tok > 0)) { e.status = "failed"; e.flags.push("pool state could not price the buy"); return; }
    e.status = "filled";
    e.fill = { t, tok, cost: COST, delay_s: +(t - e.schedT).toFixed(3), fee_bps: st.feeBps ?? null, fee_src: st.feeBps == null ? "assumed" : "event",
      quote_sol: st.quote, base: st.base, px_sol: (S.STAKE_SOL / (1 + (st.feeBps ?? 30) / 1e4)) / tok };
    const v0 = liqValue(st, tok); e.runner.maxX = v0 / COST;
    for (const v of e.versions) v.peak = v0;
    return;
  }
  if (e.status !== "filled") return;
  const v = liqValue(st, e.fill.tok), x = v / COST, age = t - e.fill.t;
  if (age <= S.RUNNER_HORIZON_S) { if (x > e.runner.maxX) e.runner.maxX = x; for (const k of S.RUNNER_X) if (x >= k && !e.runner.reached[k]) e.runner.reached[k] = Math.round(age); }
  for (const vr of e.versions) {
    if (vr.status === "selling") {
      if (t >= vr.schedT) { // the first state at or after the scheduled sale
        const sol = Math.max(0, sellSol(st, e.fill.tok) - S.TX_COST_SOL);
        vr.status = "closed"; vr.exit = { t, sol, ret: sol / COST - 1, delay_s: +(t - vr.schedT).toFixed(3), hold_s: Math.round(t - e.fill.t), trigger_value: vr.trigValue };
        if (cov && cov.gapsIn(e.fill.t, t).length) vr.exit.outage_during = true;
      }
      continue;
    }
    if (vr.status !== "open") continue;
    if (v > vr.peak) vr.peak = v;
    let reason = null;
    if (v <= vr.peak * (1 - vr.stop)) reason = "trail";
    else if (vr.stall && !vr.stallChecked && age >= S.STALL_AT_S) { vr.stallChecked = true; if (vr.peak < S.STALL_MIN_PEAK_X * COST) reason = "stall"; }
    if (!reason && age >= S.MAX_HOLD_S) reason = "max-hold";
    if (reason) trigger(vr, t, reason, v);
  }
}
function trigger(vr, t, reason, value) { vr.status = "selling"; vr.trigT = t; vr.reason = reason; vr.trigValue = value; vr.schedT = t + S.SELL_DELAY_MS / 1000; }

/** clock tick (no state needed): fill timeouts, the 24 h maximum hold on quiet coins, runner horizon, unresolved exits */
export function onTick(e, now, cov) {
  if (e.status === "pending" && now > e.schedT + S.ENTRY_STATE_MAX_WAIT_S) { e.status = "failed"; e.flags.push("no executable state within 600 s of the scheduled buy"); }
  if (e.status !== "filled") return;
  const end = e.fill.t + S.MAX_HOLD_S;
  for (const vr of e.versions) {
    if (vr.status === "open" && now >= end) trigger(vr, end, "max-hold", null); // sells at the first state at/after end + 0.7 s
    if (vr.status === "selling" && now > vr.schedT + S.RUNNER_HORIZON_S) { vr.status = "unresolved"; vr.unresolvedWhy = "no pool state for 24 h after the scheduled sale"; }
  }
  if (!e.runner.horizonDone && now >= e.fill.t + S.RUNNER_HORIZON_S) { e.runner.horizonDone = true; if (cov && cov.gapsIn(e.fill.t, e.fill.t + S.RUNNER_HORIZON_S).length) e.runner.partial = true; }
}
export const entryDone = (e) => e.status === "failed" || (e.status === "filled" && e.runner.horizonDone && e.versions.every((v) => v.status === "closed" || v.status === "unresolved"));
