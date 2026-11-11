// m2paper.mjs — launcher 0.10.3 (owner + Codex go 11 Nov 2026 17:32 UK). The M2 paper book: "buy the chart going up". PAPER ONLY, live OFF.
// Research basis: branch next-strategy-v22 (momentum.py / momentum_post5.py / base_scale.py): up 2× in 15 min, near high, $10–50K, 25% trail —
// A +28% / B +13% a trade modeled, ~0 to −3% without the top 3. EXPLORATORY: those periods were examined before. A bounded forward test, not an edge.
//
//   Population : coins with an on-time K 5-minute decision (kpaper_decisions status 'entered' or 'out of band'), watched from that decision to
//                creation + 60 min. History loaded once at the decision from the tracker's trades RECEIVED by then; then the trade stream.
//   Check      : at the decision + 1 s, then every 30 s. Using swaps received so far (decode guard: a print > 10× the previous one is ignored):
//                last price ≥ 2 × the lowest price of the last 15 min (trade time), last price ≥ 0.9 × the highest price so far,
//                market cap (last price × 1e9 × SOL/USD) $10,000–$49,999, and a trade in the last 2 minutes. First signal per coin only.
//   Entry      : 0.2 SOL (+ independent 0.02), one chainEntry (reserves re-read 1 s after the decision), curve or pool.
//   Exit       : 25% trail on the position's own sale proceeds (TRAIL_OVR), sell lands 0.7 s after the trigger, 2-hour maximum.
//   Cohort     : the first 60 FILLED entries or 7 days from activation, whichever first; then no new entries, open positions finish.
import { chainEntry, setTrail, K_TRAIL } from "./chainfill.mjs";
const now = () => Math.floor(Date.now() / 1000);
export const M2_VER = "M2-1";
const BOOK = "M2", RUN = 2, WIN_S = 900, NEAR_HI = 0.9, LO = 10000, HI = 50000, QUIET_S = 120, END_S = 3600, STEP_S = 30, TRAIL = 0.25, COHORT = 60, DAYS = 7;
export const m2Stat = { polled: 0, decisions: 0, watching: 0, trades: 0, checks: 0, signals: 0, entries: 0, filled: 0, closed: false, closedWhy: "", errors: 0, lastErr: "", activated: null, lastSig: null };
let db = null, tdb = null, lastTrade = 0, lastDec = 0; const W = new Map(); // mint → { c, avail, next, hist: [[ts, px]], hi, prev, lastTs, lastPx }
export function initM2(d, t) {
  db = d; tdb = t; if (!tdb) return;
  db.exec("CREATE TABLE IF NOT EXISTS m2_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, avail_ts INTEGER, sig_ts INTEGER, age_s INTEGER, px REAL, mc REAL, low15 REAL, hi REAL, last_trade_ts INTEGER, sol_usd REAL, status TEXT, ver TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)");
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, M2_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('M2_ACTIVATION', ?, ?)").run(t0, M2_VER);
  m2Stat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='M2_ACTIVATION'").get()?.since_ts ?? t0;
  try { lastDec = db.prepare("SELECT MAX(rowid) r FROM kpaper_decisions").get().r || 0; } catch { lastDec = 0; } // from now on: no backfill
  try { lastTrade = tdb.prepare("SELECT MAX(rowid) r FROM trades").get().r || 0; } catch { lastTrade = 0; }
  setInterval(poll, 2000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function add(s, ts, px) {
  if (!(px > 0)) return;
  if (s.prev != null && px > 10 * s.prev) return; // decode guard
  s.prev = px; s.hist.push([ts, px]); if (px > s.hi) s.hi = px; if (ts >= s.lastTs) s.lastTs = ts; s.lastPx = px;
}
function cohortOpen(t) {
  if (m2Stat.closed) return false;
  if (t > m2Stat.activated + DAYS * 86400) { m2Stat.closed = true; m2Stat.closedWhy = "7 days from activation"; return false; }
  const entered = db.prepare("SELECT COUNT(*) n FROM vol_paper WHERE strat=?").get(BOOK).n;
  const unfilled = db.prepare("SELECT COUNT(*) n FROM chain_fill WHERE strat=? AND (s_tokens IS NULL OR s_tokens='0' OR s_tokens='')").get(BOOK).n;
  m2Stat.filled = db.prepare("SELECT COUNT(*) n FROM chain_fill WHERE strat=? AND s_tokens IS NOT NULL AND s_tokens NOT IN ('0','')").get(BOOK).n;
  if (m2Stat.filled >= COHORT) { m2Stat.closed = true; m2Stat.closedWhy = `${COHORT} filled entries`; return false; }
  return entered - unfilled < COHORT; // filled + in flight
}
function poll() {
  if (!tdb || !db) return; m2Stat.polled++; const t = now();
  try {
    // 1) new on-time 5-minute decisions → watch, with history received by now
    const decs = db.prepare("SELECT rowid AS rid, mint, create_ts, avail_ts, status FROM kpaper_decisions WHERE rowid > ? ORDER BY rowid LIMIT 500").all(lastDec);
    if (decs.length) lastDec = decs[decs.length - 1].rid;
    for (const d of decs) {
      if (d.status !== "entered" && d.status !== "out of band") continue;
      if (W.has(d.mint) || !d.create_ts || t > d.create_ts + END_S) continue;
      if (db.prepare("SELECT 1 FROM m2_decisions WHERE mint=?").get(d.mint)) continue;
      m2Stat.decisions++;
      const s = { c: d.create_ts, avail: d.avail_ts, next: d.avail_ts + 1, hist: [], hi: 0, prev: null, lastTs: 0, lastPx: null };
      for (const r of tdb.prepare("SELECT ts, price_sol FROM trades WHERE mint=? AND recv_ms IS NOT NULL AND recv_ms <= ? ORDER BY recv_ms, rowid").all(d.mint, t * 1000)) add(s, r.ts, Number(r.price_sol));
      W.set(d.mint, s);
    }
    // 2) the trade stream for watched coins
    const mx = tdb.prepare("SELECT MAX(rowid) r FROM trades").get().r || lastTrade;
    const rows = tdb.prepare("SELECT rowid AS rid, mint, ts, price_sol FROM trades WHERE rowid > ? AND rowid <= ? ORDER BY rowid LIMIT 20000").all(lastTrade, mx);
    lastTrade = rows.length === 20000 ? rows[rows.length - 1].rid : mx; m2Stat.trades += rows.length;
    for (const r of rows) { const s = W.get(r.mint); if (s) add(s, r.ts, Number(r.price_sol)); }
  } catch (e) { m2Stat.errors++; m2Stat.lastErr = ("poll " + e.message).slice(0, 120); return; }
  // 3) checkpoints
  let su = null;
  for (const [mint, s] of W) {
    try {
      if (t > s.c + END_S) { W.delete(mint); continue; }
      if (t < s.next) continue;
      while (s.next <= t) s.next += STEP_S; // one evaluation on the current state (≤ 2 s after the checkpoint)
      m2Stat.checks++;
      const cut = t - WIN_S; let i = 0; while (i < s.hist.length && s.hist[i][0] < cut) i++; if (i) s.hist.splice(0, i);
      if (s.lastPx == null || s.lastTs < t - QUIET_S || !s.hist.length) continue;
      su = su ?? solUsd(); if (!su) continue;
      const mc = s.lastPx * 1e9 * su; if (!(mc >= LO && mc < HI)) continue;
      const low = Math.min(...s.hist.map((h) => h[1]));
      if (!(s.lastPx >= RUN * low && s.lastPx >= NEAR_HI * s.hi)) continue;
      // ---- signal (first per coin)
      W.delete(mint); m2Stat.signals++; m2Stat.lastSig = mint.slice(0, 6);
      const open = cohortOpen(t);
      db.prepare("INSERT OR IGNORE INTO m2_decisions (mint, create_ts, avail_ts, sig_ts, age_s, px, mc, low15, hi, last_trade_ts, sol_usd, status, ver) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(mint, s.c, s.avail, t, t - s.c, s.lastPx, +mc.toFixed(0), low, s.hi, s.lastTs, su, open ? "entered" : "cohort closed: " + (m2Stat.closedWhy || "60 filled or in flight"), M2_VER);
      if (!open) continue;
      const usdPx = s.lastPx * su;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, mint, t, usdPx, +mc.toFixed(0), s.c, +((t - s.c) / 60).toFixed(2), JSON.stringify({ m2: { ver: M2_VER, avail_ts: s.avail, sig_ts: t, px: s.lastPx, low15: low, hi: s.hi, run_x: +(s.lastPx / low).toFixed(3), last_trade_ts: s.lastTs, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, mint)?.id;
      if (id) { setTrail(id, TRAIL); m2Stat.entries++; chainEntry(mint, [id], usdPx, su, BOOK).catch(() => {}); }
    } catch (e) { m2Stat.errors++; m2Stat.lastErr = `${mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
  m2Stat.watching = W.size;
}
K_TRAIL[BOOK] = TRAIL; // restored on restart like the other books' trails (chainfill.initChainFill)
