// Tracks peak price for AFTER_CLOSE_H hours after every paper entry (regardless of close). Free: feeds already see every trade.
// v0.18.81/83: also records after_path — the multiple at 7/10/15/20/30 min after entry, the lowest since the first 1.5x and the seconds to 1.5x —
// whatever closed the paper position, so longer holds can be scored later.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { solUsdCached } from "./price.js"; // v0.18.88: P6 rows store a USD entry price; the feed ticks here are SOL prices
export const AFTER_MARKS = [420, 600, 900, 1200, 1800];
const W = new Map(); // mint -> [{id, entry, until, peak, peakMc, entryTs, ap}]
export function watch(mint, id, entryPrice, entryMc, until = null, peak = null, peakMc = null, entryTs = null, ap = null) {
  const now = Math.floor(Date.now() / 1000);
  const arr = W.get(mint) || []; if (arr.some((w) => w.id === id)) return;
  arr.push({ id, entry: entryPrice, until: until ?? now + CFG.AFTER_CLOSE_H * 3600, peak: peak ?? entryPrice, peakMc: peakMc ?? entryMc, dirty: false, last: null, lastSaved: 0,
    entryTs: entryTs ?? now, ap: (ap && typeof ap === "object") ? ap : {}, apDirty: false });
  W.set(mint, arr);
}
/** Fill the after-entry marks that are due. mult = price / entry. Safe to call often; only writes when something changes. */
export function apTick(w, mult, now) {
  const ap = w.ap; if (!ap || ap.done || !(mult > 0)) return;
  const since = now - w.entryTs; let changed = false;
  if (ap.h15 == null && mult >= 1.5) { ap.h15 = since; ap.lo = mult; changed = true; }
  if (ap.h15 != null && (ap.lo == null || mult < ap.lo)) { ap.lo = mult; changed = true; }
  for (const m of AFTER_MARKS) { if (since >= m && ap[m] == null) { ap[m] = { m: Math.round(mult * 1e4) / 1e4, lo: ap.lo ?? null }; changed = true; } }
  if (ap[AFTER_MARKS[AFTER_MARKS.length - 1]] != null) { ap.done = true; changed = true; }
  if (changed) w.apDirty = true;
}
export function tick(mint, price, mc) {
  const arr = W.get(mint); if (!arr || !(price > 0)) return;
  const now = Math.floor(Date.now() / 1000);
  for (const w of arr) {
    if (price > w.peak) { w.peak = price; w.peakMc = mc; w.dirty = true; }
    w.last = price; w.lastMc = mc; w.lastTs = now;
    try { apTick(w, price / w.entry, now); } catch {}
  }
}
// v0.18.39: the 24 h after-entry watch survives restarts — rebuilt from the database for every momentum / P5 entry still inside its window.
// v0.18.88: P6 added (its entry_price is USD per token → converted to SOL with the current SOL price; the 24-h after-figures for P6 are therefore in SOL terms, ± SOL's own move)
const qRe = db.prepare(`SELECT id, mint, strategy, entry_ts, entry_price, entry_mc, peak_mult, after_peak_mult, after_peak_mc, after_path FROM paper_trades WHERE strategy IN ('momentum','momconf','mom2m','p5e30','p5e50','p5e80','p5w30','p6') AND entry_price > 0 AND COALESCE(invalid,0)=0 AND entry_ts > ?`);
try { const now = Math.floor(Date.now() / 1000); let n = 0;
  for (const r of qRe.all(now - CFG.AFTER_CLOSE_H * 3600)) {
    const pk = Math.max(r.after_peak_mult || 1, r.peak_mult || 1, 1); let ap = null; try { ap = r.after_path ? JSON.parse(r.after_path) : null; } catch {}
    const ep = r.strategy === "p6" ? r.entry_price / Math.max(solUsdCached(), 1) : r.entry_price; if (!(ep > 0)) continue;
    watch(r.mint, r.id, ep, r.entry_mc, r.entry_ts + CFG.AFTER_CLOSE_H * 3600, ep * pk, r.after_peak_mc ?? r.entry_mc * pk, r.entry_ts, ap); n++;
  }
  if (n) console.log(`[aftercare] re-armed ${n} after-entry watches`);
} catch (e) { console.error("[aftercare restore]", e.message); }
setInterval(() => {
  try {
    const now = Math.floor(Date.now() / 1000);
    for (const [mint, arr] of W) {
      for (const w of arr) {
        if (w.dirty) { w.dirty = false; try { q.setAfter.run(w.peak / w.entry, w.peakMc, w.id); } catch {} }
        if (w.last && w.lastTs !== w.lastSaved) { w.lastSaved = w.lastTs; try { q.setAfterLast.run(w.last / w.entry, w.lastMc ?? null, w.lastTs, w.id); } catch {} } // v0.18.39 latest price seen
        if (w.last && w.ap && !w.ap.done) { try { apTick(w, w.last / w.entry, now); } catch {} } // v0.18.81: quiet coin — fill due marks with the last price seen
        if (w.apDirty) { w.apDirty = false; try { q.setAfterPath.run(JSON.stringify(w.ap), w.id); } catch {} }
      }
      const keep = arr.filter((w) => w.until > now); if (keep.length) W.set(mint, keep); else W.delete(mint);
    }
  } catch (e) { console.error("[aftercare]", e.message); } // never let this timer take the process down
}, 30_000);
export const afterStats = () => ({ watching: W.size });

export const memStats = () => { let n = 0; for (const a of W.values()) n += a.length; return { mints: W.size, watches: n }; }; // v0.18.21
