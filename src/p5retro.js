// v0.18.81: score the "hold-5" exit family on P5 trades closed before the exits existed, from the recorded path marks.
// Approximate (marks every 30–120 s, so a floor is only seen at a mark); rows are flagged h5_retro=1 and the website labels them.
import { db, q } from "./db.js";
import { H5 } from "./exits.js";
const MARKS = [30, 60, 120, 180, 300, 600];
const qRows = db.prepare(`SELECT id, entry_price, exit_price, x_t15s40, t_hit15_s, path FROM paper_trades WHERE strategy IN ('p5e30','p5e50','p5e80') AND closed=1 AND x_h5 IS NULL AND path IS NOT NULL AND COALESCE(invalid,0)=0`);
export function scoreRow(r) {
  let path; try { path = JSON.parse(r.path); } catch { return null; }
  const m = (t) => { const v = path[t]; return v == null ? null : typeof v === "object" ? v.m : v; };
  const closeMult = r.exit_price > 0 && r.entry_price > 0 ? r.exit_price / r.entry_price : null;
  const out = {};
  for (const [k, [T, F]] of Object.entries(H5)) {
    if (r.x_t15s40 != null && r.x_t15s40 <= 0.6) { out[k] = r.x_t15s40; continue; } // −40% stop before 1.5x (tick level)
    const atT = m(T) ?? closeMult; if (atT == null) return null;
    const hit = r.x_t15s40 >= 1.5 && r.t_hit15_s != null && r.t_hit15_s <= T;
    if (hit) { const later = MARKS.filter((t) => t > r.t_hit15_s && t <= T).map(m).filter((v) => v != null); out[k] = later.some((v) => v < F) || atT < F ? F : atT; }
    else out[k] = atT;
  }
  return out;
}
export function retroScoreP5() {
  let n = 0;
  try { for (const r of qRows.all()) { const o = scoreRow(r); if (!o) continue; q.setH5Retro.run(o.h5, o.h5f12, o.h5f14, o.h3, r.id); n++; } } catch (e) { console.error("[p5 retro]", e.message); }
  if (n) console.log(`[p5 retro] hold-5 exits scored on ${n} earlier P5 trades from their path marks`);
  return n;
}
