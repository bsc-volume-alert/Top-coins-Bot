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
// v0.18.17 "fast-fail" on top of flow4: at the first tick FF_AT_S after entry, if price is below FF_BELOW x entry, sell there;
// otherwise identical to flow4. Recorded as x_flow4ff next to x_flow4 — a hypothesis from 20 trades, to be tested on the next 100.
export const FF_AT_S = 120, FF_BELOW = 0.90;
export function ffStep(e, x, mult, sinceS) {
  if (x.flow4ff != null) return;
  if (!e.ffDone && sinceS != null && sinceS >= FF_AT_S) { e.ffDone = true; if (mult < FF_BELOW) { x.flow4ff = mult; return; } }
  if (x.flow4 != null) x.flow4ff = x.flow4;
}
export const ffFinal = (x, flow4Final) => x.flow4ff ?? flow4Final;
// v0.18.22 "Project 3" exit (x_split), decided at SPLIT_AT_S after entry:
//   price < SPLIT_FAIL x entry  -> sell (fast-fail)
//   price >= SPLIT_RUN x entry  -> runner: hold with a SPLIT_TRAIL trail from the peak, cap at SPLIT_CAP
//   in between                  -> half out at 1.5x, the rest rides the same trail (stop = trail from peak before 1.5x)
// Before the mark: -40% hard stop. Branch recorded in e.splitBranch ("ff" | "run" | "mid" | "stop").
export const SPLIT_AT_S = 120, SPLIT_FAIL = 0.90, SPLIT_RUN = 1.20, SPLIT_TRAIL = 0.40, SPLIT_CAP = 4;
export function splitStep(e, x, mult, fromPeak, sinceS) { const before = x.split; _splitStep(e, x, mult, fromPeak, sinceS); if (x.split != null && before == null && e.splitAt == null) e.splitAt = Math.floor(Date.now() / 1000); }
function _splitStep(e, x, mult, fromPeak, sinceS) {
  if (x.split != null) return;
  if (!e.splitBranch) {
    if (mult <= 0.6) { x.split = mult; e.splitBranch = "stop"; e.splitAt = Math.floor(Date.now() / 1000); return; }
    if (sinceS == null || sinceS < SPLIT_AT_S) return;
    if (mult < SPLIT_FAIL) { x.split = mult; e.splitBranch = "ff"; e.splitAt = Math.floor(Date.now() / 1000); return; }
    e.splitBranch = mult >= SPLIT_RUN ? "run" : "mid"; e.splitHalf = false;
  }
  if (e.splitBranch === "run") { if (mult >= SPLIT_CAP) x.split = SPLIT_CAP; else if (fromPeak <= -SPLIT_TRAIL) x.split = mult; if (x.split != null) e.splitAt = Math.floor(Date.now() / 1000); return; }
  if (e.splitBranch === "mid") {
    if (!e.splitHalf && mult >= 1.5) e.splitHalf = true;
    if (!e.splitHalf) { if (fromPeak <= -SPLIT_TRAIL) x.split = mult; return; }
    if (mult >= SPLIT_CAP) x.split = 0.75 + 0.5 * SPLIT_CAP; else if (fromPeak <= -SPLIT_TRAIL) x.split = 0.75 + 0.5 * mult;
    if (x.split != null) e.splitAt = Math.floor(Date.now() / 1000);
  }
}
export const splitFinal = (e, x, mult) => x.split ?? (e.splitBranch === "mid" && e.splitHalf ? 0.75 + 0.5 * mult : mult);
// v0.18.30 dead-coin exit: after DEAD_AFTER_S, if the 5-minute volume stays below DEAD_VOL for DEAD_FOR_S, sell at market whatever the price.
// x_dead = that exit alone (else the hold value). x_p3d = Project 3 with the dead-coin branch added: whichever of split / dead fires first.
export const DEAD_AFTER_S = 600, DEAD_VOL = 25_000, DEAD_FOR_S = 300;
export function deadStep(e, x, mult, sinceS, v5Usd, now) {
  if (x.dead != null || sinceS == null || sinceS < DEAD_AFTER_S) return;
  if (v5Usd < DEAD_VOL) { if (!e.deadSince) e.deadSince = now; if (now - e.deadSince >= DEAD_FOR_S) { x.dead = mult; e.deadAt = now; } }
  else e.deadSince = null;
}
export function p3dFinal(e, x, mult) {
  if (x.split != null && (e.deadAt == null || (e.splitAt ?? 0) <= e.deadAt)) return x.split;            // split fired first (or only)
  if (x.dead != null) return e.splitBranch === "mid" && e.splitHalf ? 0.75 + 0.5 * x.dead : x.dead; // dead fired first; mid branch keeps its banked half
  return splitFinal(e, x, mult);
}
// v0.18.17 clean flow: a wallet that buys and sells the same coin within BOT_PAIR_S seconds is a sandwich/arb bot, and its $ is
// paired volume that says nothing about direction. Returns buy/sell $ on the rest, plus the share of $ volume that was bot pairs.
export const BOT_PAIR_S = 2;
export function cleanFlow(win) {
  const byW = new Map();
  for (const z of win) { if (!z.w || z.w.startsWith("tx:")) continue; let a = byW.get(z.w); if (!a) { a = { b: [], s: [] }; byW.set(z.w, a); } (z.b ? a.b : a.s).push(z.ts); }
  const near = (arr, t) => { for (const u of arr) if (Math.abs(u - t) <= BOT_PAIR_S) return true; return false; };
  let buy = 0, sell = 0, bot = 0, total = 0;
  for (const z of win) {
    total += z.usd;
    const a = z.w && !z.w.startsWith("tx:") ? byW.get(z.w) : null;
    if (a && near(z.b ? a.s : a.b, z.ts)) { bot += z.usd; continue; }
    if (z.b) buy += z.usd; else sell += z.usd;
  }
  return { buy, sell, bot, total, ratio: sell > 0 ? buy / sell : buy > 0 ? 99 : null, botShare: total > 0 ? bot / total : null, sellShare: buy + sell > 0 ? sell / (buy + sell) : null };
}
// v0.18.35 Project 5 exit "h2t40": −40% stop from entry until 2x; at 2x sell half (the initial back); the other half rides on a
// 40% trailing stop from its peak, no cap. Value is the blended multiple of the whole position (half at 2x = 1.0 + 0.5 × exit mult).
export function h2Step(e, x, mult, fromPeak) {
  if (x.h2t40 != null) return;
  if (!e.h2Half) { if (mult >= 2) e.h2Half = true; else if (mult <= 0.6) { x.h2t40 = mult; return; } }
  if (e.h2Half && fromPeak <= -0.40) x.h2t40 = 1 + 0.5 * mult;
}
export const h2Final = (e, x, mult) => x.h2t40 ?? (e.h2Half ? 1 + 0.5 * mult : mult);
// v0.18.49 "split" exit recorded beside Project 1 (x_s15be): −40% stop until 1.5x; at 1.5x sell half; the rest sells at 2x, or at the
// buy price if it falls back (stop moved to entry). Whole-position multiple: 0.75 + 0.5 × second-half exit.
export function s15Step(e, x, mult) {
  if (x.s15be != null) return;
  if (!e.s15Half) { if (mult >= 1.5) e.s15Half = true; else if (mult <= 0.6) { x.s15be = mult; return; } }
  if (e.s15Half) { if (mult >= 2) x.s15be = 1.75; else if (mult <= 1.0) x.s15be = 0.75 + 0.5 * mult; }
}
export const s15Final = (e, x, mult) => x.s15be ?? (e.s15Half ? 0.75 + 0.5 * Math.min(mult, 2) : mult);
// v0.18.81 "hold-5" exits (P5 analysis, 17 Oct): −40% stop until 1.5x; once 1.5x is seen never let it fall below the floor F; whatever is
// left is sold at T seconds after entry. Variants: h5 (5 min, floor 1.3), h5f12 (floor 1.2), h5f14 (floor 1.4), h3 (3 min, floor 1.3).
export const H5 = { h5: [300, 1.3], h5f12: [300, 1.2], h5f14: [300, 1.4], h3: [180, 1.3], h15: [900, 1.3] }; // v0.18.87: + hold-15
// v0.18.87 "fast starters run": the state 60 s after entry decides — up 30%+ → hold until the position itself closes (golden rule / −80% / 6 h), no stop;
// otherwise exactly hold-5 (floor 1.3). Recorded as x_h5fast. Before 60 s only the −40% stop applies.
export const H5_KEYS = [...Object.keys(H5), "h5fast"];
export function h5Step(e, x, mult, sinceS) {
  if (!e.h5Armed && mult >= 1.5) e.h5Armed = true;
  if (e.h5Fast == null && sinceS != null && sinceS >= 60) e.h5Fast = mult >= 1.3; // first tick at/after 60 s fixes the state (a restored position decides on its first tick)
  if (x.h5fast == null) {
    if (!e.h5Armed && mult <= 0.6 && e.h5Fast !== true) x.h5fast = mult;
    else if (e.h5Fast === false) { if (e.h5Armed && mult <= 1.3) x.h5fast = mult; else if (sinceS != null && sinceS >= 300) x.h5fast = mult; }
  }
  for (const [k, [T, F]] of Object.entries(H5)) {
    if (x[k] != null) continue;
    if (!e.h5Armed && mult <= 0.6) { x[k] = mult; continue; }
    if (e.h5Armed && mult <= F) { x[k] = mult; continue; }
    if (sinceS != null && sinceS >= T) x[k] = mult;
  }
}
export function h5Final(e, x, mult) { const o = {}; for (const k of H5_KEYS) o[k] = x[k] ?? mult; return o; }
export const h5Key = (x) => H5_KEYS.map((k) => x[k]).join("|");
export function stepExits(e, price, mc, v5Usd, buyUsd, sellUsd, sinceS = null) {
  if (price > e.peak) e.peak = price;
  const mult = price / e.entry, fromPeak = price / e.peak - 1, x = e.x;
  if (x.tp == null && mult >= 2) x.tp = 2;
  if (x.tsl25 == null && fromPeak <= -0.25) x.tsl25 = mult; // v0.17.4
  if (x.tp15 == null && mult >= 1.5) x.tp15 = 1.5;
  stopStep(x, mult); flowStep(e, x, mult, fromPeak, v5Usd, buyUsd, sellUsd); ffStep(e, x, mult, sinceS); splitStep(e, x, mult, fromPeak, sinceS); deadStep(e, x, mult, sinceS, v5Usd, Math.floor(Date.now() / 1000)); h2Step(e, x, mult, fromPeak); s15Step(e, x, mult); h5Step(e, x, mult, sinceS);
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
    h2t40: h2Final(e, x, mult), s15be: s15Final(e, x, mult), levels: levelsFinal(e.lv, mult), m1: x.m1 ?? mult, m1vol: x.m1vol ?? mult, volstop: x.volstop ?? mult, time: mult, combo: x.combo ?? (e.half ? 1 + 0.5 * mult : mult), tp15: x.tp15 ?? mult, tsl25: x.tsl25 ?? mult, flow: x.flow ?? mult, flow4: x.flow4 ?? (x.flow ?? mult), flow4ff: ffFinal(x, x.flow4 ?? (x.flow ?? mult)), split: splitFinal(e, x, mult), dead: x.dead ?? mult, p3d: p3dFinal(e, x, mult), ...stopFinal(x, mult, e.peak / e.entry), ...h5Final(e, x, mult),
  };
}
// v0.18.14: price path after entry — multiple at fixed seconds since entry (first tick at or after each mark), so any
// "if not up X by minute Y" rule can be evaluated offline on every trade. Returns true when a new mark was filled.
export const PATH_MARKS = [30, 60, 120, 180, 300, 600, 900, 1200]; // v0.18.81: 15 and 20 min added
export function pathStep(holder, entryTs, now, mult, v5Usd = null, sellShare = null, win = null) {
  holder.path ||= {}; let changed = false;
  for (const m of PATH_MARKS) if (now - entryTs >= m && holder.path[m] == null) {
    if (v5Usd == null) { holder.path[m] = +mult.toFixed(4); changed = true; continue; }
    const o = { m: +mult.toFixed(4), v: Math.round(v5Usd), s: sellShare == null ? null : +sellShare.toFixed(3) }; // v0.18.15: + 5m volume and sell share
    if (win) { const c = cleanFlow(win); o.cs = c.sellShare == null ? null : +c.sellShare.toFixed(3); o.bot = c.botShare == null ? null : +c.botShare.toFixed(3); o.cv = Math.round(c.buy + c.sell); } // v0.18.17: clean sell share, bot share, clean volume
    holder.path[m] = o; changed = true;
  }
  return changed;
}
export const pc = (m) => (m == null ? "—" : `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`);
