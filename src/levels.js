import { CFG } from "./config.js";
/** next level strictly above mc */
export const nextLevel = (mc) => CFG.LEVELS_USD.find((l) => l > mc) ?? null;
/** last level at or below mc */
export const lastLevel = (mc) => [...CFG.LEVELS_USD].reverse().find((l) => l <= mc) ?? null;
export const wallWarning = (mc) => { const l = nextLevel(mc); return l && (l / mc - 1) * 100 <= CFG.WALL_WARN_PCT ? `⚠️ $${l >= 1e6 ? (l / 1e6) + "M" : (l / 1e3) + "K"} wall ${((l / mc - 1) * 100).toFixed(0)}% above` : ""; };
/** Levels exit tracker: sells LEVEL_SLICE at 97% of each level crossed; remainder trails 60%. state = {sold:[{mult}], } */
export function levelsStep(lv, entryMc, mc, mult, fromPeak) {
  // lv: { sold: number (fraction sold), realized: number (sum fraction×mult), crossed: Set }
  for (const L of CFG.LEVELS_USD) {
    if (L <= entryMc) continue;
    const trigger = L * CFG.LEVEL_SELL_PCT;
    if (mc >= trigger && !lv.crossed.has(L) && lv.sold < 1 - 1e-9) {
      const slice = Math.min(CFG.LEVEL_SLICE, 1 - lv.sold);
      lv.crossed.add(L); lv.sold += slice; lv.realized += slice * (trigger / entryMc);
    }
  }
  if (lv.done == null && fromPeak <= -0.60) lv.done = lv.realized + (1 - lv.sold) * mult;
  return lv.done;
}
export const levelsFinal = (lv, mult) => lv.done ?? lv.realized + (1 - lv.sold) * mult;
export const newLevels = () => ({ sold: 0, realized: 0, crossed: new Set(), done: null });

/** vol-stop decision at <= -60% from peak. Returns true = exit now. */
export function volStopExit(fromPeak, v5Usd, buyUsd, sellUsd, volAtEntry) {
  if (fromPeak <= -CFG.VOLSTOP_HARD) return true;
  const ratio = buyUsd > 0 ? sellUsd / buyUsd : Infinity;
  if (v5Usd < CFG.VOLSTOP_EXIT_USD || ratio > CFG.VOLSTOP_SELL_RATIO * 1.0625) return true;   // ~1.7
  if (v5Usd >= CFG.VOLSTOP_STAY_USD && ratio <= CFG.VOLSTOP_SELL_RATIO) return false;
  return v5Usd < CFG.VOLSTOP_FRAC * (volAtEntry || 0);
}
