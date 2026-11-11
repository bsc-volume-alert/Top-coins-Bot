// g1paper.mjs — launcher 0.10.1. G1 paper book: the post-graduation scalp on executable pool reserves. PAPER ONLY, live OFF.
// Hypothesis under test: continuation after migration can be captured once the pool is readable, even though the first pool print (the pop) is not buyable.
// Historical: +8% / −1% in the light simulation, −18% with a trail against real reserves — the forward fills decide which.
//   Trigger   : the first pool trade (tracker trades.venue = 'pumpswap') of a coin ≤ 3600 s after creation. One decision per coin.
//   Timeliness: trades read every 2 s; entered only if read within 5 s of that print, else LATE (recorded, not entered).
//   Entry     : 0.2 SOL (+ independent 0.02) against the pool reserves re-read 1 s after the decision (pool maths, the pool's own fee rates).
//               If the pool is not yet readable the entry is a recorded data-failure row, not a fill.
//   Exit      : take profit at x ≥ 1.45; FIXED stop at x ≤ 0.50 (on the entry value — not a trail); stagnation: sold if 0.85 ≤ x ≤ 1.15 on any reading
//               between fill + 90 s and fill + 120 s. Outside that band after 90 s the position simply continues under the same take-profit / stop,
//               to the 2-h horizon. No trail (trail 1).
//   Recorded  : the last curve print before migration and the first pool print (the gap), and the curve/pool prints 60 s either side as diagnostics.
import { chainEntry, setPolicy, BOOK_POLICY } from "./chainfill.mjs";
import { onTradeRows } from "./r3paper.mjs";
const now = () => Math.floor(Date.now() / 1000);
export const G1_VER = "G1-1"; const BOOK = "G1", T_MAX = 3600, LATE_S = 5;
export const g1Stat = { coins: 0, triggers: 0, late: 0, entries: 0, errors: 0, lastErr: "", activated: null };
let db = null, tdb = null; const S = new Map(); // mint → { c, lastCurvePx, lastCurveTs, trig, seen }
export function initG1(d, t) {
  db = d; tdb = t; if (!tdb) return;
  db.exec("CREATE TABLE IF NOT EXISTS g1_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, trig_ts INTEGER, read_ts INTEGER, status TEXT, last_curve_px REAL, last_curve_ts INTEGER, first_pool_px REAL, pool_gap REAL, ver TEXT)");
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, G1_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('G1_ACTIVATION', ?, ?)").run(t0, G1_VER);
  g1Stat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='G1_ACTIVATION'").get()?.since_ts ?? t0;
  onTradeRows(onRows); setInterval(() => { const t = now(); for (const [m, s] of S) if (t - s.seen > T_MAX + 600) S.delete(m); }, 60000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function onRows(rows, readTs) {
  for (const r of rows) {
    let s = S.get(r.mint);
    if (!s) { const c = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?").get(r.mint)?.create_ts; s = { c: c || null, lastCurvePx: null, lastCurveTs: null, trig: null, seen: readTs }; S.set(r.mint, s); g1Stat.coins++; }
    s.seen = readTs; if (!s.c || s.trig) continue;
    try {
      const px = Number(r.price_sol) || null;
      if (r.venue !== "pumpswap") { if (px && px <= 4.2e-7) { s.lastCurvePx = px; s.lastCurveTs = r.ts; } continue; }
      if (r.ts - s.c > T_MAX) { s.trig = -1; continue; } // too old: never a G1 coin (pool trades are stored 24 h for every launch)
      // ---- trigger: the first pool print
      s.trig = r.ts; g1Stat.triggers++;
      const late = readTs > r.ts + LATE_S, gap = s.lastCurvePx && px ? +(px / s.lastCurvePx).toFixed(4) : null;
      db.prepare("INSERT OR IGNORE INTO g1_decisions (mint, create_ts, trig_ts, read_ts, status, last_curve_px, last_curve_ts, first_pool_px, pool_gap, ver) VALUES (?,?,?,?,?,?,?,?,?,?)").run(r.mint, s.c, r.ts, readTs, late ? "late: read after trigger + 5 s" : "entered", s.lastCurvePx, s.lastCurveTs, px, gap, G1_VER);
      if (late) { g1Stat.late++; continue; }
      const su = solUsd(), usdPx = su && px ? px * su : null;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, r.mint, readTs, usdPx, usdPx ? +(usdPx * 1e9).toFixed(0) : null, s.c, +((readTs - s.c) / 60).toFixed(2), JSON.stringify({ g1: { ver: G1_VER, trig_ts: r.ts, read_ts: readTs, first_pool_px: px, last_curve_px: s.lastCurvePx, pool_gap: gap, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, r.mint)?.id;
      if (id) { setPolicy(id, BOOK_POLICY[BOOK]); g1Stat.entries++; chainEntry(r.mint, [id], usdPx, su, BOOK).catch(() => {}); }
    } catch (e) { g1Stat.errors++; g1Stat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
