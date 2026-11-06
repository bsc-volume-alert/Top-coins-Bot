// launcher 0.9.23 (6 Nov 2026, owner 13:33 UK "the main thing is to get all the coins that do get to 100k recorded"; Codex 13:35: an independent runner registry
// with MEASURED coverage — never "every runner" until demonstrated). Research only: no rule reads this, live is off.
//
// Sources, each recorded separately per coin with its own event time and first-detection time:
//   peaks   — the tracker's token_peaks (peak market cap over the coin's first 24 h, every launch, every trade; pruned after 2 days)
//   life    — the tracker's token_life checkpoints (60 s … 24 h, every launch): first checkpoint with mc ≥ $100K, first with graduated=1
//   tokens  — the tracker's tokens.graduated / peak_mc_usd (the older, window-bound marks)
//   pumpfun — pump.fun's public API, current market caps ≥ $100K and recently completed curves (a snapshot: a coin that crosses and collapses between pulls is missed — that is recorded as a limit, not hidden)
// The registry says, for each runner, whether our own records have it: launch recorded, trades kept (early evidence), fd_watch row, checked at 60 s, entered by any book.
import { studyStat } from "./study.mjs";
import { gget, gmgnOn } from "./gmgn.mjs";

export const regStat = { runs: 0, lastRun: null, lastErr: "", pumpfun: { ok: 0, fail: 0, rows: 0, pages: 0, lastErr: "" }, gmgn: { ok: 0, fail: 0, rows: 0, lastErr: "" }, registered: 0, lastNew: 0 };
const now = () => Math.floor(Date.now() / 1000);
const MC_USD = Number(process.env.LAUNCH_REG_MC_USD || 100000);

export function initRegistry(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS runner_registry (mint TEXT PRIMARY KEY, name TEXT, create_ts INTEGER, first_detect_ts INTEGER, last_seen_ts INTEGER,
    src_peaks INTEGER DEFAULT 0, src_life_mc INTEGER DEFAULT 0, src_life_grad INTEGER DEFAULT 0, src_tokens_grad INTEGER DEFAULT 0, src_tokens_peak INTEGER DEFAULT 0, src_pumpfun_mc INTEGER DEFAULT 0, src_pumpfun_complete INTEGER DEFAULT 0,
    peak_24h_usd REAL, life_mc_first_ts INTEGER, life_grad_first_ts INTEGER, pumpfun_mc_usd REAL, pumpfun_complete_ts INTEGER, migrated INTEGER DEFAULT 0, reached_mc INTEGER DEFAULT 0,
    launch_recorded INTEGER, trades_kept INTEGER, fd_recorded INTEGER, fd_grp TEXT, fd_checked INTEGER, fd_entered INTEGER, note TEXT);
    CREATE INDEX IF NOT EXISTS rr_detect ON runner_registry(first_detect_ts);`); for (const c of ["src_gmgn_mc INTEGER DEFAULT 0", "gmgn_mc_usd REAL"]) try { db.exec(`ALTER TABLE runner_registry ADD COLUMN ${c}`); } catch {} db.exec(`
    CREATE TABLE IF NOT EXISTS registry_runs (ts INTEGER PRIMARY KEY, src TEXT, ok INTEGER, rows INTEGER, pages INTEGER, new_mints INTEGER, err TEXT);`);
}

async function pumpfunList(params) {
  const u = `https://frontend-api-v3.pump.fun/coins?${new URLSearchParams(params)}`;
  const r = await fetch(u, { signal: AbortSignal.timeout(10000), headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`pump.fun ${r.status}`);
  const j = await r.json(); return Array.isArray(j) ? j : j?.coins || [];
}

/** one pass: internal sources from the tracker DB, then pump.fun (best effort), then the match against our own records */
export async function runRegistry(db, tdb) {
  if (!tdb) return; regStat.runs++; const t = now(), since = t - 48 * 3600; let newMints = 0;
  const up = db.prepare(`INSERT INTO runner_registry (mint, name, create_ts, first_detect_ts, last_seen_ts) VALUES (?,?,?,?,?) ON CONFLICT(mint) DO UPDATE SET last_seen_ts=excluded.last_seen_ts, name=COALESCE(runner_registry.name, excluded.name), create_ts=COALESCE(runner_registry.create_ts, excluded.create_ts)`);
  const exists = db.prepare("SELECT 1 FROM runner_registry WHERE mint=?");
  const add = (mint, name, create_ts) => { if (!exists.get(mint)) newMints++; const n = now(); up.run(mint, name || null, create_ts || null, n, n); }; // 0.9.25: first_detect_ts per coin = when THIS registry first wrote it (Codex: a run timestamp preceded a coin's creation)
  const set = (sql, ...a) => db.prepare(sql).run(...a);
  try {
    // internal sources
    for (const r of tdb.prepare("SELECT p.mint, p.create_ts, p.peak_24h, k.name FROM token_peaks p LEFT JOIN tokens k ON k.mint=p.mint WHERE p.peak_24h>=? AND p.create_ts>=?").all(MC_USD, since)) { add(r.mint, r.name, r.create_ts); set("UPDATE runner_registry SET src_peaks=1, peak_24h_usd=MAX(COALESCE(peak_24h_usd,0),?), reached_mc=1 WHERE mint=?", r.peak_24h, r.mint); }
    for (const r of tdb.prepare("SELECT l.mint, MIN(l.ts) ts, k.name, k.create_ts FROM token_life l LEFT JOIN tokens k ON k.mint=l.mint WHERE l.mc>=? AND l.ts>=? GROUP BY l.mint").all(MC_USD, since)) { add(r.mint, r.name, r.create_ts); set("UPDATE runner_registry SET src_life_mc=1, life_mc_first_ts=COALESCE(life_mc_first_ts, ?), reached_mc=1 WHERE mint=?", r.ts, r.mint); }
    for (const r of tdb.prepare("SELECT l.mint, MIN(l.ts) ts, k.name, k.create_ts FROM token_life l LEFT JOIN tokens k ON k.mint=l.mint WHERE l.graduated=1 AND l.ts>=? GROUP BY l.mint").all(since)) { add(r.mint, r.name, r.create_ts); set("UPDATE runner_registry SET src_life_grad=1, life_grad_first_ts=COALESCE(life_grad_first_ts, ?), migrated=1 WHERE mint=?", r.ts, r.mint); }
    for (const r of tdb.prepare("SELECT mint, name, create_ts, graduated, peak_mc_usd FROM tokens WHERE create_ts>=? AND (graduated=1 OR peak_mc_usd>=?)").all(since, MC_USD)) { add(r.mint, r.name, r.create_ts); set("UPDATE runner_registry SET src_tokens_grad=MAX(src_tokens_grad,?), src_tokens_peak=MAX(src_tokens_peak,?), migrated=MAX(migrated,?), reached_mc=MAX(reached_mc,?) WHERE mint=?", r.graduated === 1 ? 1 : 0, (r.peak_mc_usd || 0) >= MC_USD ? 1 : 0, r.graduated === 1 ? 1 : 0, (r.peak_mc_usd || 0) >= MC_USD ? 1 : 0, r.mint); }
  } catch (e) { regStat.lastErr = ("internal: " + e.message).slice(0, 160); }
  // pump.fun — snapshot of current caps and recent completions; recorded as a source with its own coverage, never as the truth
  for (const [kind, params] of [["mc", { sort: "market_cap", order: "DESC", includeNsfw: "true", limit: "50" }], ["complete", { complete: "true", sort: "last_trade_timestamp", order: "DESC", includeNsfw: "true", limit: "50" }]]) {
    let rows = 0, pages = 0, err = null;
    try {
      for (let off = 0; off < 300; off += 50) { const list = await pumpfunList({ ...params, offset: String(off) }); pages++; if (!list.length) break;
        let below = 0;
        for (const c of list) { rows++; const mint = c.mint, mc = Number(c.usd_market_cap ?? c.market_cap ?? 0), created = c.created_timestamp ? Math.floor(Number(c.created_timestamp) / 1000) : null;
          if (kind === "mc") { if (mc < MC_USD) { below++; continue; } if (created && created < since) continue; add(mint, c.name, created); set("UPDATE runner_registry SET src_pumpfun_mc=1, pumpfun_mc_usd=MAX(COALESCE(pumpfun_mc_usd,0),?), reached_mc=1 WHERE mint=?", mc, mint); }
          else { if (created && created < since) continue; add(mint, c.name, created); set("UPDATE runner_registry SET src_pumpfun_complete=1, pumpfun_complete_ts=COALESCE(pumpfun_complete_ts, ?), migrated=1 WHERE mint=?", c.complete_timestamp ? Math.floor(Number(c.complete_timestamp) / 1000) : t, mint); } }
        if (kind === "mc" && below === list.length) break; }
      regStat.pumpfun.ok++;
    } catch (e) { err = e.message.slice(0, 120); regStat.pumpfun.fail++; regStat.pumpfun.lastErr = err; }
    regStat.pumpfun.rows += rows; regStat.pumpfun.pages += pages;
    try { db.prepare("INSERT OR REPLACE INTO registry_runs (ts, src, ok, rows, pages, new_mints, err) VALUES (?,?,?,?,?,?,?)").run(t + (kind === "mc" ? 0 : 1), "pumpfun-" + kind, err ? 0 : 1, rows, pages, 0, err); } catch {}
  }
  // GMGN rank (0.9.25): a CURRENT ranking (top 100 by 5-min volume / by market cap), not historical crossings — a brief crossing between runs is missed; recorded as its own source
  for (const order of ["volume", "market_cap"]) { let rows = 0, err = null;
    try { const d = await gget("/v1/market/rank", { chain: "sol", interval: "5m", order_by: order, limit: "100" }); const list = Array.isArray(d?.rank) ? d.rank : Array.isArray(d) ? d : [];
      for (const c of list) { rows++; const mint = c.address, mc = Number(c.market_cap || 0), created = Number(c.creation_timestamp ?? c.open_timestamp) || null; if (!mint || mc < MC_USD) continue; if (created && created < since) continue;
        add(mint, c.name || c.symbol, created); set("UPDATE runner_registry SET src_gmgn_mc=1, gmgn_mc_usd=MAX(COALESCE(gmgn_mc_usd,0),?), reached_mc=1 WHERE mint=?", mc, mint); }
      regStat.gmgn.ok++; } catch (e) { err = e.message.slice(0, 120); regStat.gmgn.fail++; regStat.gmgn.lastErr = err; }
    regStat.gmgn.rows += rows; try { db.prepare("INSERT OR REPLACE INTO registry_runs (ts, src, ok, rows, pages, new_mints, err) VALUES (?,?,?,?,?,?,?)").run(t + (order === "volume" ? 3 : 4), "gmgn-" + order, err ? 0 : 1, rows, 1, 0, err); } catch {} }
  // match against our own records
  try {
    const tok = tdb.prepare("SELECT 1 FROM tokens WHERE mint=?"), tr = tdb.prepare("SELECT COUNT(*) c FROM trades WHERE mint=?"), fw = db.prepare("SELECT grp, checks FROM fd_watch WHERE mint=?"), en = db.prepare("SELECT COUNT(*) c FROM chain_fill WHERE mint=? AND s_err IS NULL");
    for (const r of db.prepare("SELECT mint FROM runner_registry WHERE last_seen_ts>=?").all(t)) {
      const w = fw.get(r.mint); let n = 0; try { n = JSON.parse(w?.checks || "[]").length; } catch {}
      set("UPDATE runner_registry SET launch_recorded=?, trades_kept=?, fd_recorded=?, fd_grp=?, fd_checked=?, fd_entered=? WHERE mint=?", tok.get(r.mint) ? 1 : 0, tr.get(r.mint).c, w ? 1 : 0, w?.grp || null, n, en.get(r.mint).c, r.mint); }
  } catch (e) { regStat.lastErr = ("match: " + e.message).slice(0, 160); }
  try { db.prepare("INSERT OR REPLACE INTO registry_runs (ts, src, ok, rows, pages, new_mints, err) VALUES (?,?,?,?,?,?,?)").run(t + 2, "all", 1, db.prepare("SELECT COUNT(*) c FROM runner_registry WHERE last_seen_ts>=?").get(t).c, 0, newMints, regStat.lastErr || null); } catch {}
  regStat.registered = db.prepare("SELECT COUNT(*) c FROM runner_registry").get().c; regStat.lastNew = newMints; regStat.lastRun = new Date().toISOString();
}

export function registryRows(db, hours = 48) {
  return db.prepare("SELECT * FROM runner_registry WHERE COALESCE(create_ts, first_detect_ts)>=? ORDER BY COALESCE(create_ts, first_detect_ts)").all(now() - hours * 3600);
}
/** coverage summary by UTC day: how many registered runners our own records hold at each stage, per source */
export function registryCoverage(db, hours = 48) { // 0.9.25: the SAME cohort as runner_registry.csv (Codex: 1,405 vs 1,338)
  const out = new Map();
  for (const r of registryRows(db, hours)) { const d = new Date((r.create_ts || r.first_detect_ts) * 1000).toISOString().slice(0, 10); const o = out.get(d) || out.set(d, { day: d, runners: 0, migrated: 0, reached_mc: 0, both: 0, src_peaks: 0, src_life: 0, src_tokens: 0, src_pumpfun: 0, src_gmgn: 0, external_only: 0, launch_recorded: 0, trades_kept: 0, fd_recorded: 0, fd_checked: 0, fd_entered: 0 }).get(d);
    o.runners++; o.migrated += r.migrated; o.reached_mc += r.reached_mc; o.both += r.migrated && r.reached_mc ? 1 : 0; o.src_peaks += r.src_peaks; o.src_life += r.src_life_mc || r.src_life_grad ? 1 : 0; o.src_tokens += r.src_tokens_grad || r.src_tokens_peak ? 1 : 0; o.src_pumpfun += r.src_pumpfun_mc || r.src_pumpfun_complete ? 1 : 0; o.src_gmgn += r.src_gmgn_mc ? 1 : 0;
    o.external_only += (r.src_pumpfun_mc || r.src_pumpfun_complete || r.src_gmgn_mc) && !(r.src_peaks || r.src_life_mc || r.src_life_grad || r.src_tokens_grad || r.src_tokens_peak) ? 1 : 0;
    o.launch_recorded += r.launch_recorded ? 1 : 0; o.trades_kept += r.trades_kept > 0 ? 1 : 0; o.fd_recorded += r.fd_recorded ? 1 : 0; o.fd_checked += r.fd_checked > 0 ? 1 : 0; o.fd_entered += r.fd_entered > 0 ? 1 : 0; }
  return [...out.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** 0.9.24: early checkpoints with ACTUAL observation times and completeness flags — one row per launch of the last `hours`, from the tracker's token_life.
 *  Each cp column: "ontime" (taken within 15 s of schedule), "late:<s>" (taken later — the metrics are from that later moment), "missing" (no trade after the offset while the launch was in memory, or launch before tracker 0.19.4). Values stay missing, never zero. */
export function earlyCheckpoints(tdb, hours = 24, cps = [15, 30, 60, 90, 120]) {
  if (!tdb) return []; const since = now() - hours * 3600, out = [], snap = now();
  const life = tdb.prepare("SELECT cp, ts, mc, buys5m, sells5m, buyers5m, buyers_total, graduated, obs_ts, src FROM token_life WHERE mint=? AND cp<=120");
  const obs3 = (() => { try { return tdb.prepare("SELECT MIN(ts) t FROM token_life WHERE cp=15").get()?.t ?? null; } catch { return null; } })(); // first 15-s row = when the new checkpoints went live
  for (const k of tdb.prepare("SELECT mint, name, create_ts FROM tokens WHERE create_ts>=? ORDER BY create_ts").all(since)) {
    const rows = new Map(life.all(k.mint).map((r) => [r.cp, r])), o = { mint: k.mint, name: k.name, create_ts: k.create_ts, tracker_epoch: obs3 && k.create_ts >= obs3 ? "obs-3" : "pre-obs-3", complete: 1 };
    for (const cp of cps) { const r = rows.get(cp), cut = k.create_ts + cp; o["cutoff" + cp] = cut;
      if (!r) { o["cp" + cp] = cut > snap ? "not-due" : "missing"; o["obs" + cp] = null; o["mc" + cp] = null; o["buys" + cp] = null; o["sells" + cp] = null; o["buyers" + cp] = null; if (cut <= snap && (o.tracker_epoch === "obs-3" || cp === 60)) o.complete = 0; continue; }
      const late = r.ts - cut, exact = r.src === "exact"; o["cp" + cp] = exact ? "exact" : late <= 15 ? "ontime:" + late : "late:" + late; o["obs" + cp] = r.obs_ts ?? r.ts; o["mc" + cp] = r.mc; o["buys" + cp] = r.buys5m; o["sells" + cp] = r.sells5m; o["buyers" + cp] = r.buyers5m; if (!exact && late > 15) o.complete = 0; }
    out.push(o); }
  return out;
}
