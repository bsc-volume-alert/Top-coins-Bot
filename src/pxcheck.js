// v0.18.43: peak cross-check. For every closed core / P4 / P5 trade whose recorded peak is 2.5x or more, compare it with the highest
// market cap seen on real large buys (>= 5 SOL, big_buys table) in the 6 h after entry. If that verified level is under peak / 2.5 the
// recorded peak most likely came from a bad price tick: px_suspect = 1 and px_verified_mult keeps the verified multiple. No large buys
// at all → left unverified (px_suspect NULL). Runs every 10 minutes over the last 3 days.
import { db } from "./db.js";
const qTodo = db.prepare(`SELECT id, mint, entry_ts, entry_mc, MAX(COALESCE(peak_mult,0), COALESCE(after_peak_mult,0)) pk FROM paper_trades
  WHERE closed=1 AND px_checked IS NULL AND entry_ts > ? AND entry_mc > 0 AND ((strategy='momentum' AND core=1) OR strategy IN ('momconf','mom2m'))
  AND MAX(COALESCE(peak_mult,0), COALESCE(after_peak_mult,0)) >= 2.5 LIMIT 200`);
const qBB = db.prepare(`SELECT MAX(mc) mx, COUNT(*) n FROM big_buys WHERE mint=? AND ts BETWEEN ? AND ?`);
const qSet = db.prepare(`UPDATE paper_trades SET px_checked=1, px_suspect=?, px_verified_mult=? WHERE id=?`);
export const pxc = { checked: 0, suspect: 0 };
function run() {
  try {
    const now = Math.floor(Date.now() / 1000);
    for (const r of qTodo.all(now - 3 * 86400)) {
      const b = qBB.get(r.mint, r.entry_ts, r.entry_ts + 6 * 3600); const v = b && b.n ? b.mx / r.entry_mc : null;
      const sus = v == null ? null : v < r.pk / 2.5 ? 1 : 0; qSet.run(sus, v, r.id); pxc.checked++; if (sus) pxc.suspect++;
    }
  } catch (e) { console.error("[pxcheck]", e.message); }
}
setTimeout(run, 60_000); setInterval(run, 10 * 60_000);
export { run as pxRun };
