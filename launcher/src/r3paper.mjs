// r3paper.mjs — launcher 0.10.0. The R3C paper book ("buy on the run, still on the curve"). PAPER ONLY, live OFF.
// Research basis: reports/analysis/entry_winners/fable_11nov (trade-level and reserve-based replay, 6–8 Nov; reviewed by Codex and Gemini 11 Nov).
// Rules frozen at activation (fd_rules 'R3C', 'R3C_ACTIVATION'). Not a confirmed edge: judged at 100 coins / 7 days on net SOL against cash.
//
//   Population : launches the tracker retains (its `trades` table is written in real time for them: tier ≥ 1 or ≥ 15 SOL of buys).
//   p60        : the price (SOL/token) of the LAST trade at or before creation + 60 s. No trade by then → the coin is not eligible.
//   Trigger    : the first trade with venue = 'curve', creation + 60 s < ts ≤ creation + 900 s, price ≥ 3 × p60, on a standard curve print
//                (price ≤ 4.2e-7 SOL/token, and not more than 10× the previous print — decode guards from the replay).
//   Timeliness : the launcher reads the tracker's trades every 2 s. ON TIME only if read ≤ trigger ts + 5 s; otherwise LATE, recorded, not entered.
//   Entry      : 0.2 SOL (+ an independent 0.02 SOL position), one chainEntry: reserves re-read 1 s after the decision (BUY_LAND_MS), curve maths.
//                curveOnly: if the curve is already complete when the launcher reads it (graduated between trigger and read) → 'skipped-graduated', no fill.
//   Exit       : 30% trail on the position's own sale proceeds (any venue after migration); sell lands 0.7 s after the trigger; 2-hour maximum hold.
//   Events     : a later print ≥ 5 × p60 within 900 s is recorded as r5_ts on the decision (an event, never used to select).
//   Diagnostics at the trigger (recorded, not used): curve progress (vSol), buyers / buys / sells in the last 60 s, net SOL in the last 60 s,
//                distinct zero-buy sellers before the trigger (sells by wallets with no prior buy in the tracker's trades), and a chain holder
//                snapshot (getTokenLargestAccounts: the 20 largest token accounts, raw) with its read time — the curve's own token account is
//                normally the largest on an uncompleted curve; shares are reported with and without the single largest account.
import { chainEntry, setTrail, K_TRAIL } from "./chainfill.mjs";
import { conn, rpcStats } from "./rpc.mjs";
import { PublicKey } from "@solana/web3.js";
const now = () => Math.floor(Date.now() / 1000);
export const R3_VER = "R3C-1";
const BOOK = "R3C", RUN = 3, RUN5 = 5, T_MIN = 60, T_MAX = 900, LATE_S = 5, TRAIL = 0.30, CURVE_MAX_PX = 4.2e-7;
export const r3Stat = { polled: 0, trades: 0, coins: 0, eligible: 0, triggers: 0, late: 0, entries: 0, graduatedAtRead: 0, r5: 0, errors: 0, lastErr: "", activated: null, lastTrig: null };
let db = null, tdb = null, lastRowid = 0; const S = new Map(); // mint → { c, p60, p60ts, prev, done, trigTs, r5 }
export function initR3(d, t) {
  db = d; tdb = t; if (!tdb) return;
  db.exec(`CREATE TABLE IF NOT EXISTS r3_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, p60 REAL, p60_ts INTEGER, trig_ts INTEGER, trig_px REAL, run_x REAL, read_ts INTEGER, status TEXT,
    vsol REAL, buyers60 INTEGER, buys60 INTEGER, sells60 INTEGER, net60 REAL, zero_buy_sellers INTEGER, holders_json TEXT, holders_ts INTEGER, top1_pct REAL, top3_pct REAL, top5_pct REAL, top10_pct REAL,
    top3_ex1_pct REAL, top5_ex1_pct REAL, top10_ex1_pct REAL, r5_ts INTEGER, ver TEXT)`);
  db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)");
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, R3_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('R3C_ACTIVATION', ?, ?)").run(t0, R3_VER);
  r3Stat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='R3C_ACTIVATION'").get()?.since_ts ?? t0;
  try { lastRowid = tdb.prepare("SELECT MAX(rowid) r FROM trades").get().r || 0; } catch { lastRowid = 0; } // start from now: no backfill, no hindsight
  setInterval(poll, 2000); setInterval(sweep, 60000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function state(mint) {
  let s = S.get(mint); if (s) return s;
  const c = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?").get(mint)?.create_ts;
  s = { c: c || null, p60: null, p60ts: null, prev: null, done: !c, trigTs: null, r5: null, seen: now() }; S.set(mint, s); r3Stat.coins++; return s;
}
function sweep() { const t = now(); for (const [m, s] of S) if (t - s.seen > 1200 || (s.c && t > s.c + T_MAX + 600 && !s.trigTs)) S.delete(m); }
function diagnostics(mint, trigTs, trigRowid) {
  const d = {};
  try {
    const w = tdb.prepare("SELECT wallet, is_buy, sol FROM trades WHERE mint=? AND ts > ? AND ts <= ? AND rowid <= ?").all(mint, trigTs - 60, trigTs, trigRowid);
    d.buyers60 = new Set(w.filter((x) => x.is_buy).map((x) => x.wallet)).size; d.buys60 = w.filter((x) => x.is_buy).length; d.sells60 = w.length - d.buys60;
    d.net60 = +w.reduce((a, x) => a + (x.is_buy ? x.sol : -x.sol), 0).toFixed(3);
    const all = tdb.prepare("SELECT wallet, is_buy, tokens FROM trades WHERE mint=? AND rowid <= ? ORDER BY slot, rowid").all(mint, trigRowid);
    const bal = new Map(); const zb = new Set();
    for (const x of all) { const b = bal.get(x.wallet) || 0; if (x.is_buy) bal.set(x.wallet, b + x.tokens); else { if (b < x.tokens * 0.5) zb.add(x.wallet); bal.set(x.wallet, b - x.tokens); } }
    d.zero_buy_sellers = zb.size;
  } catch (e) { r3Stat.lastErr = ("diag " + e.message).slice(0, 120); }
  return d;
}
async function holders(mint) {
  rpcStats.calls++;
  const r = await conn.getTokenLargestAccounts(new PublicKey(mint), "processed"); const ts = now();
  const v = (r?.value || []).map((a) => ({ a: a.address.toBase58(), amt: Number(a.amount) })).sort((x, y) => y.amt - x.amt);
  const SUP = 1e15; // 1e9 tokens × 1e6 raw
  const sum = (k, from) => +(100 * v.slice(from, from + k).reduce((s, x) => s + x.amt, 0) / SUP).toFixed(3);
  return { json: JSON.stringify(v), ts, top1: sum(1, 0), top3: sum(3, 0), top5: sum(5, 0), top10: sum(10, 0), top3x: sum(3, 1), top5x: sum(5, 1), top10x: sum(10, 1) };
}
function poll() {
  if (!tdb) return; r3Stat.polled++;
  let rows;
  try { const mx = tdb.prepare("SELECT MAX(rowid) r FROM trades").get().r || lastRowid;
    rows = tdb.prepare("SELECT rowid AS rid, mint, ts, price_sol, venue FROM trades WHERE rowid > ? AND rowid <= ? ORDER BY rowid LIMIT 5000").all(lastRowid, mx);
    lastRowid = rows.length === 5000 ? rows[rows.length - 1].rid : mx; }
  catch (e) { r3Stat.errors++; r3Stat.lastErr = ("poll " + e.message).slice(0, 120); return; }
  const readTs = now(); r3Stat.trades += rows.length;
  for (const r of rows) {
    try {
      const s = state(r.mint); s.seen = readTs; if (s.done || !s.c) continue;
      const px = Number(r.price_sol); if (!(px > 0)) continue;
      if (r.ts <= s.c + T_MIN) { s.p60 = px; s.p60ts = r.ts; s.prev = px; continue; } // the last print at or before 60 s
      if (!(s.p60 > 0)) { s.done = true; continue; } // no print by 60 s: not eligible
      if (r.ts > s.c + T_MAX) { s.done = true; continue; }
      const decodeOk = px <= CURVE_MAX_PX && (s.prev == null || px <= 10 * s.prev); if (s.prev == null || px <= 10 * s.prev) s.prev = px;
      if (s.trigTs) { if (!s.r5 && px >= RUN5 * s.p60 && decodeOk) { s.r5 = r.ts; r3Stat.r5++; db.prepare("UPDATE r3_decisions SET r5_ts=? WHERE mint=? AND r5_ts IS NULL").run(r.ts, r.mint); } continue; }
      if (!(r.venue === "curve" || r.venue == null) || !decodeOk || px < RUN * s.p60) continue;
      // ---- trigger
      s.trigTs = r.ts; r3Stat.triggers++; r3Stat.lastTrig = r.mint.slice(0, 6);
      const runX = +(px / s.p60).toFixed(3), late = readTs > r.ts + LATE_S;
      const dg = diagnostics(r.mint, r.ts, r.rid); const vsol = (() => { try { const v = tdb.prepare("SELECT vsol FROM trades WHERE rowid=?").get(r.rid)?.vsol; return v ? Number(v) / 1e9 : null; } catch { return null; } })();
      db.prepare(`INSERT OR IGNORE INTO r3_decisions (mint, create_ts, p60, p60_ts, trig_ts, trig_px, run_x, read_ts, status, vsol, buyers60, buys60, sells60, net60, zero_buy_sellers, ver)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.mint, s.c, s.p60, s.p60ts, r.ts, px, runX, readTs, late ? "late: read after trigger + 5 s" : "entered", vsol, dg.buyers60 ?? null, dg.buys60 ?? null, dg.sells60 ?? null, dg.net60 ?? null, dg.zero_buy_sellers ?? null, R3_VER);
      holders(r.mint).then((h) => db.prepare("UPDATE r3_decisions SET holders_json=?, holders_ts=?, top1_pct=?, top3_pct=?, top5_pct=?, top10_pct=?, top3_ex1_pct=?, top5_ex1_pct=?, top10_ex1_pct=? WHERE mint=?").run(h.json, h.ts, h.top1, h.top3, h.top5, h.top10, h.top3x, h.top5x, h.top10x, r.mint)).catch((e) => { r3Stat.lastErr = ("holders " + e.message).slice(0, 120); });
      if (late) { r3Stat.late++; continue; }
      const su = solUsd(), usdPx = su ? px * su : null;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, r.mint, readTs, usdPx, su ? +(px * 1e9 * su).toFixed(0) : null, s.c, +((readTs - s.c) / 60).toFixed(2), JSON.stringify({ r3: { ver: R3_VER, p60: s.p60, trig_ts: r.ts, trig_px: px, run_x: runX, read_ts: readTs, vsol, ...dg, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, r.mint)?.id;
      if (id) { setTrail(id, TRAIL); r3Stat.entries++; chainEntry(r.mint, [id], usdPx, su, BOOK, { curveOnly: true }).then(() => { try { if (db.prepare("SELECT s_exit_reason FROM chain_fill WHERE vol_id=?").get(id)?.s_exit_reason === "skipped-graduated") { r3Stat.graduatedAtRead++; db.prepare("UPDATE r3_decisions SET status='graduated before read: no fill' WHERE mint=?").run(r.mint); } } catch {} }).catch(() => {}); }
    } catch (e) { r3Stat.errors++; r3Stat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
K_TRAIL[BOOK] = TRAIL; // restored on restart like the K books' trails (chainfill.initChainFill)
