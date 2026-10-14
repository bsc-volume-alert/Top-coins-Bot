// Shared parallel-exit math (used by copy strategy; early/momentum have their own inline copies).
import { CFG } from "./config.js";
import { levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
export function newExits(entry, entryMc, volAtEntry) {
  return { entry, entryMc, peak: entry, x: {}, half: false, s3: false, lv: newLevels(), volAtEntry: volAtEntry || 0, aboveFloor: false, armed: false };
}
export function stepExits(e, price, mc, v5Usd, buyUsd, sellUsd) {
  if (price > e.peak) e.peak = price;
  const mult = price / e.entry, fromPeak = price / e.peak - 1, x = e.x;
  if (x.tp == null && mult >= 2) x.tp = 2;
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
    levels: levelsFinal(e.lv, mult), m1: x.m1 ?? mult, m1vol: x.m1vol ?? mult, volstop: x.volstop ?? mult, time: mult, combo: x.combo ?? (e.half ? 1 + 0.5 * mult : mult),
  };
}
export const pc = (m) => (m == null ? "—" : `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`);
