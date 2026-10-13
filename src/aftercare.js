// Tracks peak price for AFTER_CLOSE_H hours after every paper entry (regardless of close). Free: feeds already see every trade.
import { CFG } from "./config.js";
import { q } from "./db.js";
const W = new Map(); // mint -> [{id, entry, until, peak, peakMc}]
export function watch(mint, id, entryPrice, entryMc) {
  const now = Math.floor(Date.now() / 1000);
  const arr = W.get(mint) || []; arr.push({ id, entry: entryPrice, until: now + CFG.AFTER_CLOSE_H * 3600, peak: entryPrice, peakMc: entryMc, dirty: false }); W.set(mint, arr);
}
export function tick(mint, price, mc) {
  const arr = W.get(mint); if (!arr) return;
  for (const w of arr) if (price > w.peak) { w.peak = price; w.peakMc = mc; w.dirty = true; }
}
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [mint, arr] of W) {
    for (const w of arr) if (w.dirty) { w.dirty = false; try { q.setAfter.run(w.peak / w.entry, w.peakMc, w.id); } catch {} }
    const keep = arr.filter((w) => w.until > now); if (keep.length) W.set(mint, keep); else W.delete(mint);
  }
}, 30_000);
export const afterStats = () => ({ watching: W.size });
