// rbpaper.mjs — launcher 0.10.1. RB paper book: recovery after a single-wave sell-off, on renewed buying. PAPER ONLY, live OFF.
// Hypothesis under test: renewed buying after a big single-wave sell marks a cleaned cap table rather than a bounce. Historical: 54 entries, 37% severe
// losses (6–8 Nov) — this is the forward test of that, not an expectation. Every term is defined on information available at that moment.
//   Life      : ≥ 2× the 60-s price (p60 = last print at or before creation + 60 s) within 30 min of creation. From that print a running high H is kept.
//   Dump      : the first print at ≤ 0.65 × H whose time is within 60 s of the print that set H (a one-wave fall of ≥ 35%). Its time is tD.
//   Trough    : the lowest print from tD until recovery (updated as prints arrive); L.
//   Recovery  : the first print at ≥ L + 0.60 × (H − L) with ts ≤ tD + 180 s, AND ≥ 15 distinct wallets that bought in (tD, that print] and had NOT bought
//               before tD ("new buyers"). No recovery by tD + 180 s → the coin is dropped (recorded 'no recovery'). One decision per coin.
//   Timeliness: trades read every 2 s; entered only if read within 5 s of the recovery print, else LATE (recorded, not entered).
//   Entry     : 0.2 SOL (+ independent 0.02), reserves re-read 1 s after the decision, curve or pool maths.
//   Exit      : 30% trail on the position's own proceeds; sell lands 0.7 s after the trigger; 2-h horizon.
//   Recorded  : H, tD, L, the dump print, the recovery print, new-buyer count, and (as an event) a second ≥ 35% wave after entry (rb_decisions.second_dump_ts).
import { chainEntry, setPolicy, BOOK_POLICY } from "./chainfill.mjs";
import { onTradeRows, STREAM_START } from "./r3paper.mjs";
const now = () => Math.floor(Date.now() / 1000);
export const RB_VER = "RB-1", RB2_VER = "RB2-1"; const LIFE_X = 2, T_LIFE = 1800, DUMP_WIN = 60, RECL_WIN = 180, LATE_S = 5;
// 0.10.5: two independent state machines on the same stream — RB (dump >= 35%, reclaim 60%, 15 new buyers) and RB2 (dump >= 25%, reclaim 50%, 10 new buyers; owner + Codex go 12 Nov 17:07).
// An earlier qualifying dump under RB2 changes its trough, threshold and deadline, so RB2 is not a superset of RB: report RB-only, RB2-only and shared entries.
export const rbStat = { coins: 0, alive: 0, dumps: 0, recoveries: 0, noRecovery: 0, late: 0, entries: 0, errors: 0, lastErr: "", activated: null };
export const rb2Stat = { coins: 0, alive: 0, dumps: 0, recoveries: 0, noRecovery: 0, late: 0, entries: 0, errors: 0, lastErr: "", activated: null };
let db = null, tdb = null;
export function initRB(d, t) {
  db = d; tdb = t; if (!tdb) return;
  makeBook({ BOOK: "RB", VER: RB_VER, TABLE: "rb_decisions", DUMP: 0.65, RECL: 0.60, NEW_BUYERS: 15, stat: rbStat });
  makeBook({ BOOK: "RB2", VER: RB2_VER, TABLE: "rb2_decisions", DUMP: 0.75, RECL: 0.50, NEW_BUYERS: 10, stat: rb2Stat });
}
function makeBook({ BOOK, VER, TABLE, DUMP, RECL, NEW_BUYERS, stat }) {
  const S = new Map(); // mint → { c, p60, prev, alive, H, Hts, tD, dumpPx, L, buyersBefore: Set, newBuyers: Set, trig, post, done, seen }
  db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (mint TEXT PRIMARY KEY, create_ts INTEGER, p60 REAL, high_px REAL, high_ts INTEGER, dump_ts INTEGER, dump_px REAL, trough_px REAL, recl_ts INTEGER, recl_px REAL, new_buyers INTEGER, read_ts INTEGER, status TEXT, second_dump_ts INTEGER, ver TEXT)`);
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?, ?, ?)").run(BOOK + "_ACTIVATION", t0, VER);
  stat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k=?").get(BOOK + "_ACTIVATION")?.since_ts ?? t0;
  const solUsd = () => { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } };
  const rec = (s, mint, status, extra = {}) => db.prepare(`INSERT OR IGNORE INTO ${TABLE} (mint, create_ts, p60, high_px, high_ts, dump_ts, dump_px, trough_px, recl_ts, recl_px, new_buyers, read_ts, status, ver) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(mint, s.c, s.p60, s.H, s.Hts, s.tD, s.dumpPx, s.L, extra.reclTs ?? null, extra.reclPx ?? null, extra.newBuyers ?? null, extra.readTs ?? now(), status, VER);
  onTradeRows(onRows); setInterval(() => { const t = now();
    for (const [m, s] of S) { if (!s.done && !s.trig && s.tD != null && t > s.tD + RECL_WIN) { s.done = true; stat.noRecovery++; rec(s, m, "no recovery by dump + 180 s (no further trade)", { readTs: t }); } // 0.10.1 (review): silent coins expire on the clock, not on the next trade
      if (t - s.seen > 3600 || (s.done && t - s.seen > 600)) S.delete(m); } }, 15000);
  function onRows(rows, readTs) {
  for (const r of rows) {
    let s = S.get(r.mint);
    if (!s) { const c = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?").get(r.mint)?.create_ts; s = { c: c || null, p60: null, prev: null, alive: false, H: null, Hts: null, tD: null, dumpPx: null, L: null, buyersBefore: new Set(), newBuyers: new Set(), trig: null, post: null, done: !c || c < STREAM_START, seen: readTs }; S.set(r.mint, s); stat.coins++; }
    s.seen = readTs; if (s.done) continue;
    try {
      const px = Number(r.price_sol); if (!(px > 0)) continue;
      if (s.prev != null && (px > 10 * s.prev || px < 0.1 * s.prev)) continue; s.prev = px; // decode guard
      if (r.is_buy) (s.tD == null ? s.buyersBefore : s.newBuyers).add(r.wallet);
      if (s.trig) { // after entry: a second wave is an event
        if (px > s.post.H) { s.post.H = px; s.post.Hts = r.ts; } else if (!s.post.second && px <= s.post.H * DUMP && r.ts - s.post.Hts <= DUMP_WIN) { s.post.second = r.ts; db.prepare(`UPDATE ${TABLE} SET second_dump_ts=? WHERE mint=? AND second_dump_ts IS NULL`).run(r.ts, r.mint); }
        continue; }
      if (r.ts <= s.c + 60) { s.p60 = px; continue; }
      if (!(s.p60 > 0)) { s.done = true; continue; }
      if (!s.alive) { if (r.ts - s.c > T_LIFE) { s.done = true; continue; } if (px >= LIFE_X * s.p60) { s.alive = true; s.H = px; s.Hts = r.ts; stat.alive++; } continue; }
      if (s.tD == null) { // waiting for the dump
        if (px > s.H) { s.H = px; s.Hts = r.ts; }
        else if (px <= s.H * DUMP && r.ts - s.Hts <= DUMP_WIN) { s.tD = r.ts; s.dumpPx = px; s.L = px; stat.dumps++; }
        else if (r.ts - s.c > T_LIFE + RECL_WIN) { s.done = true; }
        continue; }
      // after the dump: trough and recovery deadline
      if (px < s.L) s.L = px;
      if (r.ts > s.tD + RECL_WIN) { s.done = true; stat.noRecovery++; rec(s, r.mint, "no recovery by dump + 180 s", { readTs }); continue; }
      const newB = [...s.newBuyers].filter((w) => !s.buyersBefore.has(w)).length;
      if (!(px >= s.L + RECL * (s.H - s.L) && newB >= NEW_BUYERS)) continue;
      // ---- trigger: recovery print
      s.trig = r.ts; s.post = { H: px, Hts: r.ts, second: null }; stat.recoveries++;
      const late = readTs > r.ts + LATE_S;
      rec(s, r.mint, late ? "late: read after trigger + 5 s" : "entered", { reclTs: r.ts, reclPx: px, newBuyers: newB, readTs });
      if (late) { stat.late++; continue; }
      const su = solUsd(), usdPx = su ? px * su : null;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, r.mint, readTs, usdPx, usdPx ? +(usdPx * 1e9).toFixed(0) : null, s.c, +((readTs - s.c) / 60).toFixed(2), JSON.stringify({ rb: { ver: VER, p60: s.p60, high: s.H, high_ts: s.Hts, dump_ts: s.tD, dump_px: s.dumpPx, trough: s.L, recl_ts: r.ts, recl_px: px, new_buyers: newB, read_ts: readTs, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, r.mint)?.id;
      if (id) { setPolicy(id, BOOK_POLICY[BOOK]); stat.entries++; chainEntry(r.mint, [id], usdPx, su, BOOK).catch(() => {}); }
    } catch (e) { stat.errors++; stat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
}
