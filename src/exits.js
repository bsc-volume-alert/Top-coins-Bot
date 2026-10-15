// Shared parallel-exit math (used by copy strategy; early/momentum have their own inline copies).
import { CFG } from "./config.js";
import { levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
export function newExits(entry, entryMc, volAtEntry) {
  return { entry, entryMc, peak: entry, x: {}, half: false, s3: false, lv: newLevels(), volAtEntry: volAtEntry || 0, aboveFloor: false, armed: false };
}
// v0.18.3: target + hard stop pairs — sell everything at the target, or cut at the stop from ENTRY, whichever comes first
export const STOPS = { t15s25: [1.5, 0.25], t15s40: [1.5, 0.40], t15s60: [1.5, 0.60], t2s25: [2, 0.25], t2s40: [2, 0.40], t2s60: [2, 0.60] }; // v0.18.9: -40% added
export function stopStep(x, mult) { for (const [k, [t, s]] of Object.entries(STOPS)) if (x[k] == null) { if (mult >= t) x[k] = t; else if (mult <= 1 - s) x[k] = mult; } }
export function stopFinal(x, mult, peakMult) { const o = {}; for (const [k, [t]] of Object.entries(STOPS)) o[k] = x[k] ?? (peakMult >= t ? t : mult); return o; }
// v0.18.9 "flow" exit: after 1.5x, hold while the 5m volume stays >= FLOW_MIN_VOL and buys outweigh sells; sell when either fails.
// Before 1.5x: -40% hard stop. Backstop: 50% trail. Tracks the max drawdown before 1.5x (ddPre15) for the stop-width question.
export function flowStep(e, x, mult, fromPeak, v5Usd, buyUsd, sellUsd) {
  if (x.tp15 == null && (e.ddPre15 == null || mult < e.ddPre15)) e.ddPre15 = mult;
  if (x.flow4 == null && x.flow == null && mult >= CFG.FLOW_CAP) x.flow4 = CFG.FLOW_CAP; // v0.18.10: flow with a voluntary sell at FLOW_CAP
  if (x.flow != null) return;
  if (!e.flowArmed) { if (mult >= 1.5) { e.flowArmed = true; e.flowSince = Date.now(); } else if (mult <= 0.6) { x.flow = mult; if (x.flow4 == null) x.flow4 = mult; } return; }
  if (Date.now() - e.flowSince < 20_000) return; // give the window a moment after arming
  if (v5Usd < CFG.FLOW_MIN_VOL || (sellUsd > 0 && buyUsd / sellUsd < CFG.FLOW_BS_MIN) || fromPeak <= -0.50) { x.flow = mult; if (x.flow4 == null) x.flow4 = mult; }
}
export function stepExits(e, price, mc, v5Usd, buyUsd, sellUsd) {
  if (price > e.peak) e.peak = price;
  const mult = price / e.entry, fromPeak = price / e.peak - 1, x = e.x;
  if (x.tp == null && mult >= 2) x.tp = 2;
  if (x.tsl25 == null && fromPeak <= -0.25) x.tsl25 = mult; // v0.17.4
  if (x.tp15 == null && mult >= 1.5) x.tp15 = 1.5;
  stopStep(x, mult); flowStep(e, x, mult, fromPeak, v5Usd, buyUsd, sellUsd);
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tsl80 == null && fromPeak <= -0.80) x.tsl80 = mult;
  if (!e.half && mult >= 2) e.half = true;
  if (!e.s3 && mult >= 3) e.s3 = true;
  if (x.half60 == null && fromPeak <= -0.60) x.half60 = e.half ? 1 + 0.5 * mult : mult;
  if (x.twophase == null) { if (!e.half && fromPeak <= -0.40) x.twophase = mult; else if (e.half && fromPeak <= -0.60) x.twophase = 1 + 0.5 * mult; }
  if (x.ladder == null && fromPeak <= -0.60) x.ladder = (e.half ? 0.5 : 0) + (e.s3 ? 0.75 : 0) + (1 - (e.half ? 0.25 : 0) - (e.s3 ? 0.25 : 0)) * mult;
  x.levels = levelsStep(e.lv, e.entryMc, mc, mult, fromPeak);
  if (x.m1 == null) { if (mc >= CFG.M1_EXIT_USD) x.m1 = mult; else if (fromPeak <= -0.60) x.m1 = mult; }
  if (x.m1vol == null) { if (mc >= CFG.M1_EXIT_USD && v5Usd < CFG.M1_HOLD_VOL5M) x.m1vol = mult; else if (fromPeak <= -0.60) x.m1vol = mult; }
  if (x.volstop == null && fromPeak <= -0.60 && volStopExit(fromPeak, v5Usd, buyUsd, sellUsd, e.volAtEntry)) x.volstop = mult;
  // v0.17 combined rule: half at 2x, then out on 60% trail, or volume stop, or MC back under the floor after being above it
  if (mult >= CFG.COMBO_FLOOR_ARM) e.armed = true; if (e.armed && mc >= CFG.COMBO_FLOOR_MC) e.aboveFloor = true; // v0.17.1: floor only once in profit
  if (x.combo == null) {
    const half = e.half ? 1 + 0.5 * mult : mult;
    if (fromPeak <= -0.60) x.combo = half;
    else if (fromPeak <= -0.30 && volStopExit(fromPeak, v5Usd, buyUsd, sellUsd, e.volAtEntry)) x.combo = half;
    else if (e.aboveFloor && mc < CFG.COMBO_FLOOR_MC && fromPeak <= -0.20) x.combo = half;
  }
  return { mult, fromPeak, peakMult: e.peak / e.entry };
}
export function finalExits(e, mult) {
  const x = e.x;
  return {
    tp: x.tp ?? mult, tsl40: x.tsl40 ?? mult, tsl60: x.tsl60 ?? mult, tsl80: x.tsl80 ?? mult,
    half60: x.half60 ?? (e.half ? 1 + 0.5 * mult : mult), twophase: x.twophase ?? (e.half ? 1 + 0.5 * mult : mult),
    ladder: x.ladder ?? ((e.half ? 0.5 : 0) + (e.s3 ? 0.75 : 0) + (1 - (e.half ? 0.25 : 0) - (e.s3 ? 0.25 : 0)) * mult),
    levels: levelsFinal(e.lv, mult), m1: x.m1 ?? mult, m1vol: x.m1vol ?? mult, volstop: x.volstop ?? mult, time: mult, combo: x.combo ?? (e.half ? 1 + 0.5 * mult : mult), tp15: x.tp15 ?? mult, tsl25: x.tsl25 ?? mult, flow: x.flow ?? mult, flow4: x.flow4 ?? (x.flow ?? mult), ...stopFinal(x, mult, e.peak / e.entry),
  };
}
// v0.18.14: price path after entry — multiple at fixed seconds since entry (first tick at or after each mark), so any
// "if not up X by minute Y" rule can be evaluated offline on every trade. Returns true when a new mark was filled.
export const PATH_MARKS = [30, 60, 120, 180, 300, 600];
export function pathStep(holder, entryTs, now, mult, v5Usd = null, sellShare = null) {
  holder.path ||= {}; let changed = false;
  for (const m of PATH_MARKS) if (now - entryTs >= m && holder.path[m] == null) { holder.path[m] = v5Usd == null ? +mult.toFixed(4) : { m: +mult.toFixed(4), v: Math.round(v5Usd), s: sellShare == null ? null : +sellShare.toFixed(3) }; changed = true; } // v0.18.15: + 5m volume and sell share
  return changed;
}
export const pc = (m) => (m == null ? "—" : `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`);
