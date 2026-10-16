// Tracks peak price for AFTER_CLOSE_H hours after every paper entry (regardless of close). Free: feeds already see every trade.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
const W = new Map(); // mint -> [{id, entry, until, peak, peakMc}]
export function watch(mint, id, entryPrice, entryMc, until = null, peak = null, peakMc = null) {
  const now = Math.floor(Date.now() / 1000);
  const arr = W.get(mint) || []; if (arr.some((w) => w.id === id)) return;
  arr.push({ id, entry: entryPrice, until: until ?? now + CFG.AFTER_CLOSE_H * 3600, peak: peak ?? entryPrice, peakMc: peakMc ?? entryMc, dirty: false, last: null, lastSaved: 0 }); W.set(mint, arr);
}
export function tick(mint, price, mc) {
  const arr = W.get(mint); if (!arr || !(price > 0)) return;
  const now = Math.floor(Date.now() / 1000);
  for (const w of arr) { if (price > w.peak) { w.peak = price; w.peakMc = mc; w.dirty = true; } w.last = price; w.lastMc = mc; w.lastTs = now; }
}
// v0.18.39: the 24 h after-entry watch survives restarts — rebuilt from the database for every momentum / P4 / P5 entry still inside its window.
const qRe = db.prepare(`SELECT id, mint, entry_ts, entry_price, entry_mc, peak_mult, after_peak_mult, after_peak_mc FROM paper_trades WHERE strategy IN ('momentum','momconf','mom2m') AND entry_price > 0 AND COALESCE(invalid,0)=0 AND entry_ts > ?`);
try { const now = Math.floor(Date.now() / 1000); let n = 0;
  for (const r of qRe.all(now - CFG.AFTER_CLOSE_H * 3600)) { const pk = Math.max(r.after_peak_mult || 1, r.peak_mult || 1, 1); watch(r.mint, r.id, r.entry_price, r.entry_mc, r.entry_ts + CFG.AFTER_CLOSE_H * 3600, r.entry_price * pk, r.after_peak_mc ?? r.entry_mc * pk); n++; }
  if (n) console.log(`[aftercare] re-armed ${n} after-entry watches`);
} catch (e) { console.error("[aftercare restore]", e.message); }
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [mint, arr] of W) {
    for (const w of arr) {
      if (w.dirty) { w.dirty = false; try { q.setAfter.run(w.peak / w.entry, w.peakMc, w.id); } catch {} }
      if (w.last && w.lastTs !== w.lastSaved) { w.lastSaved = w.lastTs; try { q.setAfterLast.run(w.last / w.entry, w.lastMc ?? null, w.lastTs, w.id); } catch {} } // v0.18.39 latest price seen
    }
    const keep = arr.filter((w) => w.until > now); if (keep.length) W.set(mint, keep); else W.delete(mint);
  }
}, 30_000);
export const afterStats = () => ({ watching: W.size });

export const memStats = () => { let n = 0; for (const a of W.values()) n += a.length; return { mints: W.size, watches: n }; }; // v0.18.21
