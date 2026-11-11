// c2paper.mjs — launcher 0.10.1 (owner's go 11 Nov 2026 14:51 UK: "add it onto the website and get this running"). The C2 paper book. PAPER ONLY, live OFF.
// Research basis: reports/books/NEXT_STRATEGY.md + branch next-strategy-20261111 @ 19f73453 (C2_SPEC_FROZEN.md, c2_check.py). Candidate found in a
// 12,576-combination search over 6–8 Nov and 9–10 Nov → NOT a confirmed edge; the frozen replay evaluation on fresh data still stands beside this book.
//
//   Decision  : the K books' own 5-minute decision (kpaper_decisions), so timeliness and clock usability are identical to K: status 'entered' or
//               'out of band' only (on time: available AND read ≤ create + 315 s; usable clock reading).
//   Band      : $20,000 ≤ mc5 < $40,000, any venue.
//   Demand    : at least one swap received by the tracker by the decision (recv_ms ≤ decision), and buys − sells (SOL) over the swaps received in the
//               120 s before the decision ≤ 20 SOL. Swaps are deduplicated by (sig, wallet, side, sol, tokens, venue, ev_idx) — overlapping capture
//               paths store the same swap twice. No swap received → not eligible ('unknown demand').
//   Entry     : 0.2 SOL (+ the independent 0.02 SOL position), one chainEntry: reserves re-read 1 s after the decision, curve or pool maths (fill-2).
//   Exit      : 25% trail on the position's own proceeds (TRAIL_OVR), sell lands 0.7 s after the trigger, 2-hour maximum; HALF is sold at the first
//               executable print ≥ 2× (chainfill s_half_x) — C2's result (s_r) = half at that print + half on the trail exit, two network fees.
import { chainEntry, setTrail, K_TRAIL } from "./chainfill.mjs";
const now = () => Math.floor(Date.now() / 1000);
export const C2_VER = "C2-1";
const BOOK = "C2", LO = 20000, HI = 40000, NET_MAX = 20, WIN_S = 120, TRAIL = 0.25;
export const c2Stat = { polled: 0, seen: 0, inBand: 0, unknownDemand: 0, netTooHigh: 0, entries: 0, errors: 0, lastErr: "", activated: null };
let db = null, tdb = null, lastRowid = 0;
export function initC2(d, t) {
  db = d; tdb = t; if (!tdb) return;
  db.exec("CREATE TABLE IF NOT EXISTS c2_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, avail_ts INTEGER, read_ts INTEGER, mc5 REAL, k_status TEXT, recv_swaps INTEGER, net2 REAL, status TEXT, ver TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)");
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, C2_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('C2_ACTIVATION', ?, ?)").run(t0, C2_VER);
  c2Stat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='C2_ACTIVATION'").get()?.since_ts ?? t0;
  try { lastRowid = db.prepare("SELECT MAX(rowid) r FROM kpaper_decisions").get().r || 0; } catch { lastRowid = 0; } // from now on: no backfill
  setInterval(poll, 2000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function poll() {
  if (!tdb || !db) return; c2Stat.polled++;
  let rows;
  try { rows = db.prepare("SELECT rowid AS rid, mint, create_ts, avail_ts, read_ts, mc5, status FROM kpaper_decisions WHERE rowid > ? ORDER BY rowid LIMIT 500").all(lastRowid);
    if (rows.length) lastRowid = rows[rows.length - 1].rid; }
  catch (e) { c2Stat.errors++; c2Stat.lastErr = ("poll " + e.message).slice(0, 120); return; }
  for (const r of rows) {
    c2Stat.seen++;
    try {
      if (r.status !== "entered" && r.status !== "out of band") continue;
      if (!(r.mc5 >= LO && r.mc5 < HI)) continue;
      c2Stat.inBand++;
      if (db.prepare("SELECT 1 FROM c2_decisions WHERE mint=?").get(r.mint)) continue;
      const msD = r.avail_ts * 1000, readTs = now();
      const sw = tdb.prepare("SELECT DISTINCT sig, wallet, is_buy, sol, tokens, venue, ev_idx, ts FROM trades WHERE mint=? AND recv_ms IS NOT NULL AND recv_ms <= ? AND ts <= ?").all(r.mint, msD, r.avail_ts);
      const rec = (status, net) => db.prepare("INSERT OR IGNORE INTO c2_decisions (mint, create_ts, avail_ts, read_ts, mc5, k_status, recv_swaps, net2, status, ver) VALUES (?,?,?,?,?,?,?,?,?,?)").run(r.mint, r.create_ts, r.avail_ts, readTs, r.mc5, r.status, sw.length, net, status, C2_VER);
      if (!sw.length) { c2Stat.unknownDemand++; rec("unknown demand: no swap received by the decision", null); continue; }
      const net = +sw.filter((x) => x.ts > r.avail_ts - WIN_S).reduce((a, x) => a + (x.is_buy ? x.sol : -x.sol), 0).toFixed(3);
      if (net > NET_MAX) { c2Stat.netTooHigh++; rec("net buying over 20 SOL", net); continue; }
      const su = solUsd(), px = r.mc5 / 1e9;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, r.mint, readTs, px, r.mc5, r.create_ts, +((readTs - r.create_ts) / 60).toFixed(2), JSON.stringify({ c2: { ver: C2_VER, mc5: r.mc5, avail_ts: r.avail_ts, read_ts: readTs, net2: net, recv_swaps: sw.length, k_status: r.status, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, r.mint)?.id;
      rec("entered", net);
      if (id) { setTrail(id, TRAIL); c2Stat.entries++; chainEntry(r.mint, [id], px, su, BOOK).catch(() => {}); }
    } catch (e) { c2Stat.errors++; c2Stat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
K_TRAIL[BOOK] = TRAIL; // restored on restart like the K books' trails (chainfill.initChainFill)
