// 0.9.9 (owner go 5 Nov 2026 ~20:40 UK, after the Codex + Gemini reviews — recording only, no rule reads any of this):
//   farm_wallets  — every wallet that sold inside a collapse (price ≥ 60% down within ≤ 4 slots) of a coin the books had entered, with the dump time. Rebuilt every 30 min
//                   from the tracker's trades table (tracker ≥ 0.19 stores every trade of any launch reaching 15 SOL of buys). "Previous dump participant" only — not ownership.
//   farm scores   — at every check, from the check's own trade list: share of buyers already in the list at that moment, share of buying SOL they put in, share of supply they
//                   still hold; the same three counting only dumps in the last 4 h (4 h = since the qualifying dump). Evidence frozen at decision time: only dumps BEFORE the check count.
//   funder history — launches this funder was seen behind (fd_watch), how many the books entered, how many resolved, severe losses (< 0.35x), runners (≥ 1.2x), unresolved.
//   fd_wallet_state — per check, per first-minute buyer: bought, sold, held, share of supply, first buy, SOL in/out, launch-group and farm flags.
//   fd_decisions   — per check, per rule: passed / failed / already entered / no price, with the rule version.
let db = null, tdb = null;
const now = () => Math.floor(Date.now() / 1000);
export const farmStat = { builds: 0, wallets: 0, dumps: 0, lastBuild: null, lastErr: "" };

export function initFarm(_db, _tdb) {
  db = _db; tdb = _tdb;
  db.exec(`CREATE TABLE IF NOT EXISTS farm_wallets (wallet TEXT, mint TEXT, dump_ts INTEGER, sold_sol REAL, drop_pct REAL, PRIMARY KEY (wallet, mint));
    CREATE INDEX IF NOT EXISTS fw_wallet ON farm_wallets(wallet, dump_ts);
    CREATE TABLE IF NOT EXISTS farm_dumps (mint TEXT PRIMARY KEY, name TEXT, entry_ts INTEGER, dump_ts INTEGER, slot0 INTEGER, slot1 INTEGER, drop_pct REAL, sellers INTEGER, sold_sol REAL, built_ts INTEGER);
    CREATE TABLE IF NOT EXISTS fd_wallet_state (mint TEXT, at INTEGER, wallet TEXT, bought_tok REAL, sold_tok REAL, held_tok REAL, held_pct REAL, first_ts INTEGER, sol_in REAL, sol_out REAL, early INTEGER, farm INTEGER, farm_4h INTEGER, PRIMARY KEY (mint, at, wallet));
    CREATE INDEX IF NOT EXISTS fws_mint ON fd_wallet_state(mint, at);
    CREATE TABLE IF NOT EXISTS fd_decisions (mint TEXT, at INTEGER, ts INTEGER, ver TEXT, rule TEXT, passed INTEGER, reason TEXT, PRIMARY KEY (mint, at, rule));`);
}

/** Rebuild the farm list from the tracker's trades for coins the books entered in the last `hours`. A dump = the worst price fall within ≤ 4 consecutive slots after the entry, if ≥ 60%. */
export function buildFarm(hours = 6) {
  if (!db || !tdb) return;
  const t = now(); let dumps = 0, wallets = 0;
  try {
    const mints = db.prepare("SELECT mint, MIN(entry_ts) e FROM chain_fill WHERE entry_ts>=? AND s_tokens IS NOT NULL GROUP BY mint").all(t - hours * 3600);
    const q = tdb.prepare("SELECT slot, ts, wallet, is_buy, sol, price_sol FROM trades WHERE mint=? AND ts>? ORDER BY slot, rowid LIMIT 8000");
    const insD = db.prepare("INSERT OR REPLACE INTO farm_dumps (mint, name, entry_ts, dump_ts, slot0, slot1, drop_pct, sellers, sold_sol, built_ts) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const insW = db.prepare("INSERT OR IGNORE INTO farm_wallets (wallet, mint, dump_ts, sold_sol, drop_pct) VALUES (?,?,?,?,?)");
    const tx = db.transaction(() => {
      for (const m of mints) {
        const rows = q.all(m.mint, m.e); if (rows.length < 10) continue;
        const p0 = rows[0].price_sol; if (!(p0 > 0)) continue;
        const bySlot = new Map(); for (const r of rows) { const a = bySlot.get(r.slot) || []; a.push(r); bySlot.set(r.slot, a); }
        const slots = [...bySlot.keys()].sort((a, b) => a - b); let best = { drop: 0, s0: null, s1: null };
        for (let i = 0; i < slots.length; i++) {
          const before = i > 0 ? Math.max(...bySlot.get(slots[i - 1]).map((r) => r.price_sol)) : Math.max(...bySlot.get(slots[i]).map((r) => r.price_sol));
          let j = i; while (j + 1 < slots.length && slots[j + 1] - slots[i] <= 3) j++;
          let after = Infinity; for (let k = i; k <= j; k++) for (const r of bySlot.get(slots[k])) if (r.price_sol < after) after = r.price_sol;
          const drop = before > 0 ? 1 - after / before : 0; if (drop > best.drop) best = { drop, s0: slots[i], s1: slots[j] };
        }
        if (best.drop < 0.6) continue;
        const sells = rows.filter((r) => !r.is_buy && r.slot >= best.s0 && r.slot <= best.s1); if (!sells.length) continue;
        const dumpTs = sells[0].ts, byW = new Map(); for (const r of sells) byW.set(r.wallet, (byW.get(r.wallet) || 0) + r.sol);
        const name = db.prepare("SELECT name FROM vol_paper WHERE mint=? LIMIT 1").get(m.mint)?.name || null;
        insD.run(m.mint, name, m.e, dumpTs, best.s0, best.s1, +best.drop.toFixed(4), byW.size, +[...byW.values()].reduce((a, c) => a + c, 0).toFixed(3), t);
        for (const [w, sol] of byW) insW.run(w, m.mint, dumpTs, +sol.toFixed(4), +best.drop.toFixed(4));
        dumps++; wallets += byW.size;
      }
    }); tx();
    farmStat.builds++; farmStat.dumps = db.prepare("SELECT COUNT(*) c FROM farm_dumps").get().c; farmStat.wallets = db.prepare("SELECT COUNT(DISTINCT wallet) c FROM farm_wallets").get().c; farmStat.lastBuild = new Date().toISOString();
  } catch (e) { farmStat.lastErr = e.message.slice(0, 160); }
}

/** Farm scores for one check from its trade list (trades = [{user, isBuy, sol, tok, t}] up to the check time). Only dumps recorded BEFORE `asOf` count. */
export function farmScores(trades, asOf) {
  if (!db) return {};
  const buyers = new Map(), held = new Map(); let solAll = 0;
  for (const x of trades) { if (x.isBuy) { buyers.set(x.user, (buyers.get(x.user) || 0) + (x.sol || 0) / 1e9); solAll += (x.sol || 0) / 1e9; } held.set(x.user, (held.get(x.user) || 0) + (x.isBuy ? (x.tok || 0) : -(x.tok || 0))); }
  if (!buyers.size) return {};
  const q = db.prepare("SELECT COUNT(*) n, MAX(dump_ts) last FROM farm_wallets WHERE wallet=? AND dump_ts<?");
  let fb = 0, fb4 = 0, fsol = 0, fsol4 = 0, ftok = 0, ftok4 = 0, totHeld = 0;
  for (const [w, sol] of buyers) {
    const h = Math.max(0, held.get(w) || 0); totHeld += h;
    const r = q.get(w, asOf); if (!r || !r.n) continue;
    fb++; fsol += sol; ftok += h; if (r.last >= asOf - 4 * 3600) { fb4++; fsol4 += sol; ftok4 += h; }
  }
  const SUPPLY = 1e15;
  return { farm_buyers_pct: +(100 * fb / buyers.size).toFixed(1), farm_sol_pct: solAll ? +(100 * fsol / solAll).toFixed(1) : null, farm_held_pct: +(100 * ftok / SUPPLY).toFixed(2),
    farm4h_buyers_pct: +(100 * fb4 / buyers.size).toFixed(1), farm4h_sol_pct: solAll ? +(100 * fsol4 / solAll).toFixed(1) : null, farm4h_held_pct: +(100 * ftok4 / SUPPLY).toFixed(2), farm_known: farmStat.wallets };
}

/** Funder history as known now: launches this funder was seen behind, entered by the books, resolved, severe (< 0.35x), runners (≥ 1.2x), unresolved. */
export function funderHistory(funder, beforeTs) {
  if (!db || !funder) return null;
  try {
    const seen = db.prepare("SELECT COUNT(*) c FROM fd_watch WHERE funder=? AND created_ts<?").get(funder, beforeTs).c;
    const ent = db.prepare("SELECT mint, MIN(entry_ts) e FROM vol_paper WHERE mint IN (SELECT mint FROM fd_watch WHERE funder=? AND created_ts<?) GROUP BY mint").all(funder, beforeTs);
    let resolved = 0, severe = 0, runners = 0;
    for (const m of ent) { const c = db.prepare("SELECT s_exit_x FROM chain_fill WHERE mint=? AND done=1 AND s_exit_x IS NOT NULL ORDER BY entry_ts LIMIT 1").get(m.mint); if (!c) continue; resolved++; if (c.s_exit_x < 0.35) severe++; else if (c.s_exit_x >= 1.2) runners++; }
    return { seen, entered: ent.length, resolved, severe, runners, unresolved: ent.length - resolved };
  } catch { return null; }
}

/** Per-check wallet state for the first-minute buyers (and anyone who bought ≥ 0.05 SOL), capped at 400 rows. */
export function recordWalletState(mint, at, trades, t0, earlySet, asOf) {
  if (!db) return;
  try {
    const per = new Map();
    for (const x of trades) { const p = per.get(x.user) || { b: 0, s: 0, si: 0, so: 0, first: null }; if (x.isBuy) { p.b += x.tok || 0; p.si += (x.sol || 0) / 1e9; if (p.first == null) p.first = x.t; } else { p.s += x.tok || 0; p.so += (x.sol || 0) / 1e9; } per.set(x.user, p); }
    const q = db.prepare("SELECT COUNT(*) n, MAX(dump_ts) last FROM farm_wallets WHERE wallet=? AND dump_ts<?");
    const ins = db.prepare("INSERT OR IGNORE INTO fd_wallet_state (mint, at, wallet, bought_tok, sold_tok, held_tok, held_pct, first_ts, sol_in, sol_out, early, farm, farm_4h) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
    const rows = [...per.entries()].filter(([w, p]) => p.si >= 0.05 || earlySet.has(w)).sort((a, b) => b[1].si - a[1].si).slice(0, 400);
    db.transaction(() => { for (const [w, p] of rows) { const held = Math.max(0, p.b - p.s), f = q.get(w, asOf); ins.run(mint, at, w, p.b, p.s, held, +(100 * held / 1e15).toFixed(3), p.first, +p.si.toFixed(4), +p.so.toFixed(4), earlySet.has(w) ? 1 : 0, f && f.n ? f.n : 0, f && f.n && f.last >= asOf - 4 * 3600 ? 1 : 0); } })();
  } catch (e) { farmStat.lastErr = ("wallet_state: " + e.message).slice(0, 160); }
}

export function recordDecision(mint, at, ts, ver, rule, passed, reason) {
  if (!db) return; try { db.prepare("INSERT OR REPLACE INTO fd_decisions (mint, at, ts, ver, rule, passed, reason) VALUES (?,?,?,?,?,?,?)").run(mint, at, ts, ver, rule, passed ? 1 : 0, reason || null); } catch {}
}
