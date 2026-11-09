// kpaper.mjs — launcher 0.9.56 (owner's go 9 Nov 2026 21:45 UK; spec Codex 18:14 / 21:45). PROVISIONAL paper books, live OFF.
// Research basis: reports/analysis/100k/replay_9nov (v2.1) — exploratory, NOT confirmed. Rules frozen at activation (fd_rules 'K_ACTIVATION').
//
//   Population : launches the tracker retains (same as the replay cohort: token_life checkpoints exist only for them).
//   Decision   : the tracker's 5-minute checkpoint (token_life cp=300). Available at obs_ts (else ts). The launcher polls every 2 s and decides when it
//                reads the row. ON TIME only if the reading was available ≤ creation + 315 s AND read by the launcher ≤ creation + 315 s; otherwise the
//                coin is recorded as LATE and not entered (kpaper_decisions).
//   Bands      : market cap at 5 min (USD, token_life.mc) — K30-50T25: $30,000 ≤ mc < $50,000; K30-40T25 and K30-40T20: $30,000 ≤ mc < $40,000.
//   Entry      : ONE simulated fill per coin shared by every K book that takes it (one chainEntry call with all their vol_paper ids → identical tokens):
//                0.2 SOL (+ an independent 0.02 SOL position), reserves re-read 1 s after the decision (BUY_LAND_MS), curve maths on the curve,
//                pool maths on vault balances + virtual_quote_reserves with the pool's own fee rates after migration (chainfill.mjs, measurement fill-2/fill-3).
//   Exit       : fixed trail on the position's own sale proceeds — 25% (K30-50T25, K30-40T25) or 20% (K30-40T20) below their running high, on any venue;
//                sell lands 0.7 s after the trigger (SELL_LAND_MS); 2-hour maximum hold; migration keeps the token count (subscription moves to the pool).
//                The 0.02 SOL position has its OWN trail on its own proceeds (independent exit, i02_* columns).
//   Not applied (differs from the replay): no exclusion of coins already past $100K before 5 min, no non-SOL-pool exclusion (pump pools are SOL-quoted).
import { chainEntry, setTrail, K_TRAIL } from "./chainfill.mjs";
const now = () => Math.floor(Date.now() / 1000);
export const K_VER = "K-1";
export const kStat = { polled: 0, seen: 0, onTime: 0, late: 0, inBand: 0, entries: 0, errors: 0, lastErr: "", lastRow: null, activated: null };
const BOOKS = [{ k: "K30-50T25", lo: 30000, hi: 50000 }, { k: "K30-40T25", lo: 30000, hi: 40000 }, { k: "K30-40T20", lo: 30000, hi: 40000 }];
let db = null, tdb = null, lastRowid = 0;
export function initK(d, t) {
  db = d; tdb = t; if (!tdb) return;
  db.exec("CREATE TABLE IF NOT EXISTS kpaper_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, cp_ts INTEGER, avail_ts INTEGER, read_ts INTEGER, mc5 REAL, status TEXT, books TEXT, ver TEXT)");
  db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)");
  const t0 = now();
  for (const b of BOOKS) db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(b.k, t0, K_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('K_ACTIVATION', ?, ?)").run(t0, K_VER);
  kStat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='K_ACTIVATION'").get()?.since_ts ?? t0;
  try { lastRowid = tdb.prepare("SELECT MAX(rowid) r FROM token_life").get().r || 0; } catch { lastRowid = 0; }
  setInterval(poll, 2000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function poll() {
  if (!tdb) return; kStat.polled++;
  let rows = [];
  try { const mx = tdb.prepare("SELECT MAX(rowid) r FROM token_life").get().r || lastRowid; // read the ceiling FIRST, so rows written during the query are picked up next time
    rows = tdb.prepare("SELECT rowid AS rid, mint, ts, obs_ts, mc FROM token_life WHERE rowid > ? AND rowid <= ? AND cp = 300 ORDER BY rowid LIMIT 500").all(lastRowid, mx);
    lastRowid = rows.length === 500 ? rows[rows.length - 1].rid : mx; }
  catch (e) { kStat.errors++; kStat.lastErr = "poll: " + e.message.slice(0, 100); return; }
  const readTs = now();
  for (const r of rows) {
    kStat.seen++; kStat.lastRow = r.mint.slice(0, 6);
    try {
      if (db.prepare("SELECT 1 FROM kpaper_decisions WHERE mint=?").get(r.mint)) continue;
      const c = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?").get(r.mint)?.create_ts;
      const avail = r.obs_ts || r.ts, mc = Number(r.mc);
      const rec = (status, books) => db.prepare("INSERT OR IGNORE INTO kpaper_decisions (mint, create_ts, cp_ts, avail_ts, read_ts, mc5, status, books, ver) VALUES (?,?,?,?,?,?,?,?,?)").run(r.mint, c ?? null, r.ts, avail, readTs, mc || null, status, books || null, K_VER);
      if (!c) { rec("no creation time"); continue; }
      if (avail > c + 315 || readTs > c + 315) { kStat.late++; rec(avail > c + 315 ? "late: reading available after 315 s" : "late: read by launcher after 315 s"); continue; }
      kStat.onTime++;
      if (!(mc > 0)) { rec("no market cap"); continue; }
      const take = BOOKS.filter((b) => mc >= b.lo && mc < b.hi);
      if (!take.length) { rec("out of band"); continue; }
      kStat.inBand++;
      const su = solUsd(), px = su ? mc / 1e9 : null; // USD per token at the 5-min reading (1e9 supply), the paper entry price; the real fill is chainfill's
      const ids = [];
      for (const b of take) {
        db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
          .run(b.k, r.mint, readTs, px, mc, c, +((readTs - c) / 60).toFixed(2), JSON.stringify({ k: { ver: K_VER, mc5: mc, cp_ts: r.ts, avail_ts: avail, read_ts: readTs, sol_usd: su } }));
        const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(b.k, r.mint)?.id;
        if (id) { ids.push(id); setTrail(id, K_TRAIL[b.k]); }
      }
      rec("entered", take.map((b) => b.k).join(","));
      if (ids.length) { kStat.entries += ids.length; chainEntry(r.mint, ids, px, su, take.map((b) => b.k).join(",")).catch(() => {}); }
    } catch (e) { kStat.errors++; kStat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
