// launcher 0.8.0 (owner, 4 Nov 2026 10:04–10:15 UK: "what do we buy… 10–15 coins a day at 2x… come out at 2x… trailing stop"): FD — the FUNDED-DEV paper book.
// What the 214 census winners ($100K+, migrated) and 10,128 traced launches said (LAUNCHER.md 4 Nov 09:50 / 10:45 UK):
//   a winner is launched by a first-time creator wallet funded with a few SOL shortly before launch by a wallet that rarely launches (exchange or
//   private), the bundle commits 10–60% (not the self-bought 60%+ factory), and in its FIRST MINUTE it has big buyers (net ≥ 27 SOL, 2-SOL+ buys)
//   rather than a bot swarm; it graduates in ~3 min, peaks at ~minute 16 and is worthless by minute 30.
// So, for EVERY pump.fun launch the tracker records (~1,100 an hour):
//   1. at birth: the creator's funder by two 1-credit RPC calls (first transaction, who paid SOL in) — written to creator_trace so the hourly census
//      pass does not repeat it; the pre-filter: funded ≥ FUND_SOL within FUND_S, funder with ≤ FUNDER_MAX launches on record, bundle 10–60% (tracker, T+4 s);
//   2. at 60 / 90 / 120 s: the coin's trades from the chain (earlyTrades); the confirmation rules below; first pass → paper entry at GMGN's price,
//      into vol_paper (scored 2 h later by volScore with every exit side by side: half at 2x + trail, 2x/−50, 1.5x/−30, 40% trail, hold 60/120,
//      and 0.8.0's hard outs at 10 / 15 / 20 min with a −35% stop).
//   Rules: FD  = pre-filter + net ≥ 27 SOL + mc ≥ 100 SOL + ≥ 3 buys of 2+ SOL;  FDL = pre-filter + net ≥ 15 + mc ≥ 60;  FDB = FD's confirmation
//   with NO bundle condition (what the bundle filter is worth);  A1 = confirmation only, no pre-filter at all (book A of October, the control).
//   0.8.9: FDH = FDB + on the curve + GMGN holders ≥ 0.97 × chain buyers + holders ≥ 100 (buyers still holding at 60 s);  FDHF = FDH + creator funded 19–100 SOL.
//   0.8.11 (owner, 5 Nov 00:01 UK: "add 1 and 2, definitely"): RECORDING ONLY, no rule changed — (1) the first buyers of every checked launch (create-block and
//   first-3-s wallets → fd_early; hourly per-wallet hit rates against the tracker's outcomes → fd_sniper_stats: the "follow the sniper" test needs dud counts);
//   (2) the entry-time columns the failure study lacked: dev buy, dev and bundle selling in the window, top-holder share, socials / replies from pump.fun's
//   coin page, same-name launches in the last hour / 24 h. All on fd_watch / the check rows; nothing buys differently.
// Nothing is bought. Every launch's pre-filter result and every checkpoint is kept (fd_watch) so the cut can be re-tuned from data.
import { readFileSync } from "node:fs";
import { gget, N } from "./gmgn.mjs";
import { earlyTrades, studyStat } from "./study.mjs";
import { creatorFunder, ctStat } from "./operators.mjs";
import { buyQuote, qStat } from "./quote.mjs";
import { isLiveBook, liveBuy } from "./live.mjs"; // 0.8.17: the live book's entries are bought for real (tiny size)

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const FUND_SOL = n("LAUNCH_FD_FUND_SOL", 2), FUND_S = n("LAUNCH_FD_FUND_S", 7200), FUNDER_MAX = n("LAUNCH_FD_FUNDER_MAX", 2), B_LO = n("LAUNCH_FD_BUNDLE_LO", 10), B_HI = n("LAUNCH_FD_BUNDLE_HI", 60);
const CHECKS = [60, 90, 120], DAY_CREDITS = n("LAUNCH_FD_DAY_CREDITS", 120000), SCAN_S = n("LAUNCH_FD_SCAN_S", 240);
const GRAND_MAX = n("LAUNCH_FD_GRAND_MAX", 2), AMOUNT_DAYS = n("LAUNCH_FD_AMOUNT_DAYS", 7);
const REC_BUNDLE = n("LAUNCH_FD_REC_BUNDLE", 0) === 1, REC_META = n("LAUNCH_FD_REC_META", 0) === 1;
const SHADOW_SOL = n("LAUNCH_SHADOW_SOL", 0.2), SHADOW_SAMPLE = n("LAUNCH_SHADOW_SAMPLE", 10); // 0.8.15: quote size; every Nth checked launch that enters nothing is quoted too // 0.8.12 switches for the two 0.8.11 recorders under suspicion
// 0.8.2 (12:50 UK): the factories fund a NEW funder wallet for every launch (7 pre-filter passes in 2 h: 5.201089 SOL twice, 2.99010312 SOL twice —
// identical amounts to six decimals). Two more tests on anything that passes: the funder's own funder (grand-funder) with ≤ GRAND_MAX creators behind it,
// and no other creator funded with the same amount (to 4 decimals) in the last AMOUNT_DAYS days.
const confirm = (m) => m.net >= 27 && (m.mcSol ?? 0) >= 100 && m.big >= 3;
export const RULES = [
  { k: "FD", ok: (w, m) => w.pre === 1 && confirm(m) },
  { k: "FDF", ok: (w, m) => w.pre === 1 && confirm(m) && (w.funder_sol ?? 0) >= 15 }, // 0.8.21 (owner, 5 Nov 08:55 UK: "just add it"): FD + creator funded ≥ 15 SOL — the back-test on 62 FD trades: 42 kept, won 48%, +65%, no-best +47%; < 15 SOL: 20 trades, won 20%, −3%. Same direction in FDB/FDL/A1. Forward test.
  { k: "FDL", ok: (w, m) => w.pre === 1 && m.net >= 15 && (m.mcSol ?? 0) >= 60 },
  { k: "FDB", ok: (w, m) => w.pre_nb === 1 && confirm(m) },
  { k: "A1", ok: (w, m) => confirm(m) },
  // 0.8.6 (17:05 UK): 9 of FD's first 15 were dumped at minute 1–2, right after the 60 s entry; the 5 runners were still rising at 120 s.
  // FD120 = FD's pre-filter and buying test, but entered only at the 120 s check, and only if the coin is still holding: market cap at 120 s ≥ 0.8 × the best earlier check and net buying still ≥ 27 SOL.
  // 0.8.6 (17:15 UK, 69 scored coins): entries at $12–20K with 35–50 SOL net at minute 1 ran 9 of 13 (2 rugs); $8–12K with ~30 SOL ran 8 of 23 (10 rugs); the
  // $9–10K / exactly-4-big-buys / 30-SOL script is the rug signature. FD35 = FD with the bar where the winners sit: net ≥ 35 SOL and mc ≥ 130 SOL (~$12K). In-sample; a forward variant, not a replacement.
  { k: "FD35", ok: (w, m) => w.pre === 1 && m.net >= 35 && (m.mcSol ?? 0) >= 130 && m.big >= 3 },
  // 17:40 UK, coin by coin: on the rugs the net buying COLLAPSED between 60 and 120 s (Denald Tremp 23.8→9.6, Sol 40.2→8.9, put the fries 27.2→8.1, Transgender 33.8→11.6);
  // on the runners it rose (FOMO 27→37, Sol 30→56, SI Compute 27→39, a hidden gem 46→51). So FD120 enters at 120 s only if net buying is still at least 90% of its best earlier check and the market cap at least 80%.
  // FDX (17:50 UK, the owner's "most revised version"): all three tells together — minute-1 bar of FD35 (net ≥ 35 SOL, mc ≥ 130 SOL), creator funded ≥ 20 SOL, and entry at the 120 s check only if buying is still rising (FD120's test).
  { k: "FDX", ok: (w, m, prev) => w.pre === 1 && (w.funder_sol ?? 0) >= 20 && m.at >= 120 && m.net >= 35 && (m.mcSol ?? 0) >= 130 && m.big >= 3 && (!prev.length || ((m.net ?? 0) >= 0.9 * Math.max(...prev.map((p) => p.net || 0)) && (m.mcSol ?? 0) >= 0.8 * Math.max(...prev.map((p) => p.mcSol || 0)))) },
  { k: "FD120", ok: (w, m, prev) => w.pre === 1 && m.at >= 120 && confirm(m) && (!prev.length || ((m.net ?? 0) >= 0.9 * Math.max(...prev.map((p) => p.net || 0)) && (m.mcSol ?? 0) >= 0.8 * Math.max(...prev.map((p) => p.mcSol || 0)))) },
  // 0.8.9 (4 Nov 22:27 UK, owner: "go ship them both"): the failures-vs-successes study of 372 scored trades (LAUNCHER.md 4 Nov 22:40). The one thing most
  // failures share that the successes don't is BUYERS ALREADY GONE AT 60 s — GMGN's holder count at entry below the chain buyers-so-far: hpb < 0.5 was 16 rugs
  // of 16; ≥ 0.97 won 56% vs 28%. Entries after graduation (the 79%-bundle brand-name factory) won 11 of 37. So:
  //   FDH  = FDB's test (funding, no bundle test, strong minute-1 buying) + still on the curve + holders ≥ 0.97 × buyers + holders ≥ 100;
  //   FDHF = FDH + creator funded 19–100 SOL (the band where the runners sat; 23 back-tested trades only — a forward test).
  // m.holders is GMGN's holder_count fetched once per check (below); m.holding is the chain-side count (buyers whose sells < 95% of their buys), kept beside it.
  { k: "FDH", ok: (w, m) => w.pre_nb === 1 && confirm(m) && m.holders != null && m.buyers > 0 && m.holders >= 0.5 * m.buyers }, // 0.8.22 REVISED (owner go 5 Nov 09:11 UK): FDB minus the coins whose GMGN holder count is under half the chain buyers — the one part of the holder finding that held in all three analyses (0 wins under 0.5; removes 24 losers, no winners). The 0.8.9 three-part test (curve + ≥0.97 + 100 holders) scored 2 of 5 once the curve flag was fixed.
  { k: "FDHF", ok: (w, m) => w.pre_nb === 1 && confirm(m) && m.venue === "pump.fun curve" && m.holders >= 100 && m.holders >= 0.97 * m.buyers && (w.funder_sol ?? 0) >= 19 && (w.funder_sol ?? 0) <= 100 },
];
const BASE_BAR = (m) => m.net >= 15 && (m.mcSol ?? 0) >= 60; // the loosest bar any rule accepts (FDL's): GMGN's token info is fetched once per check only past it
// 0.8.3 (13:05 UK): GMGN's price for a 60–120 s old coin can lag badly ("I voted": GMGN $2K while the chain said 115 SOL ≈ $10.6K), which would
// flatter every paper entry. The entry price is the CHAIN price at the check (market cap in SOL × SOL/USD ÷ supply); GMGN's is kept in the row for comparison.
let solUsd = null, solAt = 0;
async function solPrice() { if (Date.now() - solAt < 120000 && solUsd) return solUsd; try { const w = await gget("/v1/token/info", { chain: "sol", address: "So11111111111111111111111111111111111111112" }); const v = N(w?.price?.price ?? w?.price); if (v > 0) { solUsd = v; solAt = Date.now(); } } catch {} return solUsd; }
export const fdStat = { scanned: 0, traced: 0, pre: 0, checks: 0, entries: 0, errors: 0, lastErr: "", credits: 0, creditsDay: "", lastScan: null, lastCheck: null, open: 0 };
const now = () => Math.floor(Date.now() / 1000), today = () => new Date().toISOString().slice(0, 10);

export function initFD(db) {
  // 0.8.6: entries booked after graduation with the decoder's pool market cap (100× too high) → back to GMGN's price, re-scored
  try { for (const t of db.prepare("SELECT id, row, entry_price FROM vol_paper WHERE strat IN ('FD','FDL','FDB','A1') AND row LIKE '%\"chain_px\"%' AND (row LIKE '%graduated%' OR row LIKE '%\"venue\":\"other\"%')").all()) { let r = {}; try { r = JSON.parse(t.row || "{}"); } catch {} const g = r.gmgn_px; if (!(g > 0) || r.fixed_grad) continue;
      if (t.entry_price > g * 3) { r.fixed_grad = true; r.bad_px = t.entry_price; db.prepare("UPDATE vol_paper SET entry_price=?, entry_mc=?, row=?, done=0, err=NULL WHERE id=?").run(g, g * 1e9, JSON.stringify(r), t.id); } } } catch {}
  // 0.8.4: the FD-family entries booked before 0.8.3 (4 Nov 10:45–13:05 UK) carry GMGN's lagging price; re-price them from the chain market cap stored in the row (SOL/USD ≈ the first chain-priced entry's rate, else 92)
  try { const ref = db.prepare("SELECT row FROM vol_paper WHERE strat IN ('FD','FDL','FDB','A1') AND row LIKE '%\"sol_usd\"%' ORDER BY entry_ts LIMIT 1").get(); let su = 92; try { su = JSON.parse(ref?.row || "{}").sol_usd || su; } catch {}
    for (const t of db.prepare("SELECT id, row, entry_price, entry_mc FROM vol_paper WHERE strat IN ('FD','FDL','FDB','A1') AND done=0 AND row NOT LIKE '%\"chain_px\"%'").all()) { let r = {}; try { r = JSON.parse(t.row || "{}"); } catch {} if (!(r.mcSol > 0)) continue;
      const px = r.mcSol * su / 1e9; r.gmgn_px = t.entry_price; r.chain_px = px; r.sol_usd = su; r.repriced = true; db.prepare("UPDATE vol_paper SET entry_price=?, entry_mc=?, row=? WHERE id=?").run(px, px * 1e9, JSON.stringify(r), t.id); } } catch {}
  db.exec(`CREATE TABLE IF NOT EXISTS fd_watch (mint TEXT PRIMARY KEY, name TEXT, symbol TEXT, creator TEXT, created_ts INTEGER, bundle_pct REAL, bundle_sol REAL, funder TEXT, funder_sol REAL, funded_ts INTEGER, funder_launches INTEGER,
    pre INTEGER, pre_nb INTEGER, why TEXT, checks TEXT DEFAULT '[]', entered TEXT DEFAULT '', done INTEGER DEFAULT 0, scanned_ts INTEGER);
    CREATE INDEX IF NOT EXISTS fdw_done ON fd_watch(done, created_ts);`);
  for (const c of ["x_out10 REAL", "x_out15 REAL", "x_out20 REAL", "r_out10 REAL", "r_out15 REAL", "r_out20 REAL", "x_trail25 REAL", "x_trail60 REAL", "x_tw REAL", "r_trail25 REAL", "r_trail60 REAL", "r_tw REAL", "m_trail40 REAL"]) try { db.exec(`ALTER TABLE vol_paper ADD COLUMN ${c}`); } catch {} // 0.8.0 hard outs; 0.8.7 trails 25/60 and tight-then-wide
  try { db.prepare("UPDATE vol_paper SET done=0 WHERE strat IN ('FDX','FD','FD35','FD120','FDL','FDB','A1') AND done=1 AND err IS NULL AND r_trail60 IS NULL").run(); } catch {} // 0.8.7: re-score today's trades for the new exits (one-off; ~2 GMGN calls a trade)
  // 0.8.9: when each rule was loaded (owner: "add the time of their shipment"). Rules that already have entries get their first entry's time; new ones get now.
  db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)");
  let ver = null; try { ver = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version; } catch {}
  const hasVP = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='vol_paper'").get(); // the smoke boot runs on an empty database (vol_paper is created later, by initVol)
  for (const r of RULES) { try { if (hasVP) db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?, COALESCE((SELECT MIN(entry_ts) FROM vol_paper WHERE strat=?), ?), ?)").run(r.k, r.k, now(), ver); else db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(r.k, now(), ver); } catch (e) { fdStat.lastErr = "fd_rules: " + e.message.slice(0, 120); } }
  try { db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('VENUE', ?, ?)").run(now(), ver); } catch {}
  // 0.8.22: the curve flag from our own check, and the venue exit re-scored where it was wrong (curve coins had been scored with the 25% trail)
  try { const fixed = db.prepare("UPDATE vol_paper SET curve=1 WHERE curve=0 AND json_valid(row) AND json_extract(row,'$.venue')='pump.fun curve'").run().changes;
    const resc = db.prepare("UPDATE vol_paper SET x_venue=x_trail40, r_venue=r_trail40, m_venue=m_trail40 WHERE curve=1 AND done=1 AND err IS NULL AND x_trail40 IS NOT NULL AND (x_venue IS NULL OR x_venue<>x_trail40)").run().changes;
    if (fixed || resc) fdStat.lastErr = `0.8.22 curve flag fixed on ${fixed} rows, venue re-scored on ${resc}`;
    db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('FDH_REV', ?, ?)").run(now(), ver); } catch (e) { fdStat.lastErr = "0.8.22 fix: " + e.message.slice(0, 120); } // 0.8.16: when the venue exit (25% trail graduated / 40% curve) was loaded — the page judges it on the trades after this
  // 0.8.11: recording columns (see the header) and the first-buyer tables
  for (const c of ["dev_buy_sol REAL", "name_1h INTEGER", "name_24h INTEGER", "socials TEXT", "image INTEGER", "replies INTEGER", "koth_ts INTEGER", "meta_ts INTEGER", "meta_err TEXT"]) try { db.exec(`ALTER TABLE fd_watch ADD COLUMN ${c}`); } catch {}
  for (const c of ["q_ts INTEGER", "q_px REAL", "q_gap REAL", "q_tokens REAL", "q_impact REAL", "q_ms INTEGER", "q_err TEXT", "q_exit_ts INTEGER", "q_exit_sol REAL", "q_exit_x REAL", "q_exit_gap REAL", "q_exit_delay INTEGER", "q_exit_impact REAL", "q_exit_err TEXT"]) try { db.exec(`ALTER TABLE vol_paper ADD COLUMN ${c}`); } catch {} // 0.8.15 quote shadowing
  db.exec("CREATE TABLE IF NOT EXISTS fd_quotes (mint TEXT, ts INTEGER, at INTEGER, entered TEXT, chain_px REAL, q_px REAL, q_gap REAL, q_impact REAL, q_ms INTEGER, venue TEXT, mcSol REAL, net REAL, err TEXT)");
  db.exec(`CREATE TABLE IF NOT EXISTS fd_early (mint TEXT, wallet TEXT, slot0 INTEGER, sec REAL, sol REAL, tok REAL, exited INTEGER DEFAULT 0, created_ts INTEGER, PRIMARY KEY (mint, wallet));
    CREATE INDEX IF NOT EXISTS fde_wallet ON fd_early(wallet); CREATE INDEX IF NOT EXISTS fde_ts ON fd_early(created_ts);
    CREATE TABLE IF NOT EXISTS fd_sniper_stats (wallet TEXT PRIMARY KEY, launches INTEGER, slot0 INTEGER, graduated INTEGER, peak50k INTEGER, peak100k INTEGER, sol_avg REAL, exit_pct REAL, first_ts INTEGER, last_ts INTEGER, updated INTEGER)`);
}

/** every 15 s: every tracker launch of the last SCAN_S seconds not yet seen → funder lookup → pre-filter. */
let scanning = false;
export async function fdScan(db, tdb) {
  if (scanning || !tdb) return; scanning = true;
  try {
    if (fdStat.creditsDay !== today()) { fdStat.creditsDay = today(); fdStat.credits = 0; }
    const rows = tdb.prepare("SELECT mint, name, symbol, creator, create_ts, bundle_pct, bundle_sol, dev_buy_sol, peak_mc_usd, graduated FROM tokens WHERE create_ts>=? AND creator IS NOT NULL AND creator<>'' ORDER BY create_ts DESC LIMIT 400").all(now() - SCAN_S);
    const ins = db.prepare(`INSERT OR IGNORE INTO fd_watch (mint, name, symbol, creator, created_ts, bundle_pct, bundle_sol, funder, funder_sol, funded_ts, funder_launches, pre, pre_nb, why, scanned_ts, dev_buy_sol, name_1h, name_24h) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const sameName = db.prepare("SELECT COUNT(*) c FROM fd_watch WHERE name=? COLLATE NOCASE AND mint<>? AND created_ts>=? AND created_ts<?"); // 0.8.11: the trending-name count (this launch's name in the hour / day before it)
    const insCT = db.prepare("INSERT OR IGNORE INTO creator_trace VALUES (@mint,@creator,@create_ts,@peak_mc_usd,@graduated,@bundle_pct,@bundle_sol,@funder,@funder_sol,@funded_ts,@creator_txs,@err,@checked_ts)");
    for (const t of rows) {
      if (db.prepare("SELECT 1 FROM fd_watch WHERE mint=?").get(t.mint)) continue;
      if (fdStat.credits >= DAY_CREDITS) { fdStat.lastErr = `daily Helius budget ${DAY_CREDITS} reached`; break; }
      fdStat.scanned++;
      let r = db.prepare("SELECT funder, funder_sol, funded_ts, creator_txs FROM creator_trace WHERE mint=?").get(t.mint) || db.prepare("SELECT funder, funder_sol, funded_ts, creator_txs FROM creator_trace WHERE creator=? AND funder IS NOT NULL LIMIT 1").get(t.creator);
      const known = !!r;
      if (!r) { const c0 = studyStat.credits; try { r = await creatorFunder(t.creator); fdStat.traced++; ctStat.traced++; } catch (e) { r = { err: e.message.slice(0, 100) }; fdStat.errors++; fdStat.lastErr = `${t.creator.slice(0, 6)} ${r.err}`; }
        fdStat.credits += studyStat.credits - c0; }
      { // 0.8.5: ALWAYS record this launch in creator_trace — a factory re-using one creator wallet (3GzDw7…, 2.133 SOL, 5 launches in 50 min) was counted as "0 launches" because the known-creator path skipped the insert
        insCT.run({ mint: t.mint, creator: t.creator, create_ts: t.create_ts, peak_mc_usd: t.peak_mc_usd ?? null, graduated: t.graduated ? 1 : 0, bundle_pct: t.bundle_pct ?? null, bundle_sol: t.bundle_sol ?? null, funder: r.funder || null, funder_sol: r.funder_sol ?? null, funded_ts: r.funded_ts ?? null, creator_txs: r.txs ?? null, err: r.err || null, checked_ts: now() }); }
      const fl = r.funder ? db.prepare("SELECT COUNT(DISTINCT mint) c FROM creator_trace WHERE funder=? AND mint<>?").get(r.funder, t.mint).c : null;
      const cl = db.prepare("SELECT COUNT(DISTINCT mint) c FROM creator_trace WHERE creator=? AND mint<>?").get(t.creator, t.mint).c; // 0.8.5: the creator wallet's own other launches
      const amt = N(r.funder_sol) || 0, delay = r.funded_ts ? t.create_ts - r.funded_ts : null, bp = N(t.bundle_pct);
      const why = [];
      if (!r.funder) why.push("no funder"); else { if (amt < FUND_SOL) why.push(`funded ${amt.toFixed(2)} SOL`); if (delay == null || delay > FUND_S || delay < 0) why.push(`funded ${delay == null ? "?" : Math.round(delay / 60)} min before`); if (fl > FUNDER_MAX) why.push(`funder has ${fl} launches`); if (cl >= 1) why.push(`creator wallet has ${cl} other launch${cl > 1 ? "es" : ""}`); }
      let preNb = r.funder && amt >= FUND_SOL && delay != null && delay >= 0 && delay <= FUND_S && fl <= FUNDER_MAX && cl < 1 ? 1 : 0; // 0.8.5: first coin of this creator wallet (winners: median 1 prior launch on GMGN = none)
      if (preNb) { // 0.8.2: the two factory tests, only on the ~1% that get this far
        const same = db.prepare("SELECT COUNT(DISTINCT mint) c FROM creator_trace WHERE mint<>? AND create_ts>=? AND ABS(funder_sol-?)<0.00005").get(t.mint, t.create_ts - AMOUNT_DAYS * 86400, amt).c; // 0.8.5: any other launch, same creator or not
        if (same >= 1) { preNb = 0; why.push(`same amount on ${same} other launch${same > 1 ? "es" : ""}`); }
        else {
          let g = db.prepare("SELECT funder FROM wallet_trace WHERE wallet=?").get(r.funder)?.funder;
          if (g === undefined) { const c0 = studyStat.credits; try { const gf = await creatorFunder(r.funder); g = gf.funder || null; db.prepare("INSERT OR IGNORE INTO wallet_trace VALUES (?,?,?,?,?,?,?,?,?,?)").run(r.funder, g, null, null, gf.funder_sol ?? null, gf.funded_ts ?? null, null, 1, gf.err || null, now()); } catch (e) { g = null; } fdStat.credits += studyStat.credits - c0; }
          const gPublic = g && db.prepare("SELECT 1 FROM wallet_trace WHERE funder=? AND funder_type IS NOT NULL LIMIT 1").get(g); // an exchange / bridge behind the funder is normal (that is how people fund a dev wallet), not a factory
          if (g && !gPublic) { const gl = db.prepare("SELECT COUNT(DISTINCT c.mint) c FROM creator_trace c JOIN wallet_trace w ON w.wallet=c.funder WHERE w.funder=? AND c.mint<>?").get(g, t.mint).c; if (gl > GRAND_MAX) { preNb = 0; why.push(`grand-funder has ${gl} launches`); } }
        }
      }
      const bundleOk = bp != null && bp >= B_LO && bp < B_HI; if (!bundleOk) why.push(bp == null ? "bundle unknown" : `bundle ${bp.toFixed(0)}%`);
      const pre = preNb && bundleOk ? 1 : 0; if (pre) fdStat.pre++;
      const nm = String(t.name || "").slice(0, 60).trim(); let n1 = null, n24 = null; if (nm) try { n1 = sameName.get(nm, t.mint, t.create_ts - 3600, t.create_ts).c; n24 = sameName.get(nm, t.mint, t.create_ts - 86400, t.create_ts).c; } catch {}
      ins.run(t.mint, nm, String(t.symbol || "").slice(0, 20), t.creator, t.create_ts, bp, N(t.bundle_sol), r.funder || null, amt || null, r.funded_ts ?? null, fl, pre, preNb, why.join("; "), now(), N(t.dev_buy_sol), n1, n24);
    }
    fdStat.lastScan = new Date().toISOString();
  } catch (e) { fdStat.errors++; fdStat.lastErr = "scan: " + e.message.slice(0, 160); }
  finally { scanning = false; }
}

export function metrics(r, upto, creator = null, bundle = null) {
  const xs = r.trades.filter((x) => x.t <= upto), buys = xs.filter((x) => x.isBuy), sells = xs.filter((x) => !x.isBuy);
  const bs = buys.reduce((s, x) => s + x.sol, 0) / 1e9, ss = sells.reduce((s, x) => s + x.sol, 0) / 1e9, last = xs[xs.length - 1];
  // 0.8.9: who is still holding — per wallet, tokens bought vs sold; "exited" = sold 95%+ of what it bought (sniper in-and-out). Chain-side twin of GMGN's holder count.
  const per = new Map(); for (const x of xs) { const p = per.get(x.user) || { b: 0, s: 0 }; if (x.isBuy) p.b += x.tok || 0; else p.s += x.tok || 0; per.set(x.user, p); }
  const exited = [...per.values()].filter((p) => p.b > 0 && p.s >= 0.95 * p.b).length, buyers = new Set(buys.map((x) => x.user)).size;
  const m = { net: +(bs - ss).toFixed(2), buySol: +bs.toFixed(2), sellSol: +ss.toFixed(2), buyers, buys: buys.length, sells: sells.length,
    big: buys.filter((x) => x.sol >= 2e9).length, mcSol: last?.mc ? +last.mc.toFixed(1) : null, exited, holding: buyers - exited, sellers: new Set(sells.map((x) => x.user)).size };
  // 0.8.11: the columns the failure study lacked. Supply is 1e9 tokens × 1e6 raw units; the share held is net tokens bought in the window ÷ supply.
  const held = [...per.values()].map((p) => Math.max(0, p.b - p.s)).sort((a, b) => b - a), SUPPLY = 1e15;
  m.top1_pct = +(100 * (held[0] || 0) / SUPPLY).toFixed(2); m.top5_pct = +(100 * held.slice(0, 5).reduce((a, c) => a + c, 0) / SUPPLY).toFixed(2); m.top10_pct = +(100 * held.slice(0, 10).reduce((a, c) => a + c, 0) / SUPPLY).toFixed(2);
  if (creator) { const d = per.get(creator); m.dev_buy = +(buys.filter((x) => x.user === creator).reduce((s, x) => s + x.sol, 0) / 1e9).toFixed(3); m.dev_sell = +(sells.filter((x) => x.user === creator).reduce((s, x) => s + x.sol, 0) / 1e9).toFixed(3); m.dev_sold_pct = d && d.b > 0 ? +(100 * Math.min(1, d.s / d.b)).toFixed(0) : null; }
  if (bundle && bundle.length) { let b = 0, s = 0, so = 0; for (const w of bundle) { const p = per.get(w); if (p) { b += p.b; s += p.s; } } for (const x of sells) if (bundle.includes(x.user)) so += x.sol; m.bundle_sold_pct = b > 0 ? +(100 * Math.min(1, s / b)).toFixed(0) : null; m.bundle_sell_sol = +(so / 1e9).toFixed(2); m.bundle_n = bundle.length; }
  const t0 = r.t0 ?? xs[0]?.t, s0 = xs[0]?.slot; m.early = buys.filter((x) => (s0 != null && x.slot === s0) || (t0 != null && x.t <= t0 + 3)).map((x) => ({ w: x.user, b0: s0 != null && x.slot === s0 ? 1 : 0, sec: t0 != null ? x.t - t0 : null, sol: +(x.sol / 1e9).toFixed(3), tok: x.tok || 0 }));
  m.early_n = new Set(m.early.map((e) => e.w)).size; m.early_sol = +m.early.reduce((a, e) => a + e.sol, 0).toFixed(2);
  return m;
}

/** every 15 s: checkpoints at 60 / 90 / 120 s for launches that passed any pre-filter (and a sample of the rest for the A1 control). */
let checking = false;
export async function fdCheck(db, tdb = null) {
  if (checking) return; checking = true;
  try {
    const t = now();
    // pre-filtered launches first; then the A1 control: every 7th other launch (so the control costs ~15% of the credits of "all launches")
    const list = db.prepare("SELECT * FROM fd_watch WHERE done=0 AND created_ts>=? AND (pre_nb=1 OR (rowid % 7)=0) ORDER BY pre DESC, created_ts").all(t - 300);
    fdStat.open = list.length;
    for (const w of list) {
      const age = t - w.created_ts, checks = JSON.parse(w.checks || "[]"), doneAt = new Set(checks.map((c) => c.at));
      if (age > CHECKS[CHECKS.length - 1] + 60) { db.prepare("UPDATE fd_watch SET done=1 WHERE mint=?").run(w.mint); continue; }
      const due = CHECKS.filter((c) => c <= age && !doneAt.has(c)); if (!due.length) continue;
      if (fdStat.credits >= DAY_CREDITS) { fdStat.lastErr = `daily Helius budget ${DAY_CREDITS} reached`; break; }
      const at = due[due.length - 1];
      try {
        const c0 = studyStat.credits, r = await earlyTrades(w.mint, w.created_ts + at); fdStat.credits += studyStat.credits - c0; fdStat.checks++; fdStat.lastCheck = new Date().toISOString();
        let bundle = null; if (tdb && REC_BUNDLE) try { bundle = tdb.prepare("SELECT wallet FROM cluster_wallets WHERE mint=? AND role IN ('bundle','dev')").all(w.mint).map((x) => x.wallet); } catch {} // 0.8.12: behind LAUNCH_FD_REC_BUNDLE (off) — the launcher restarted every 2–6 min after 0.8.11 with nothing in the error log (pm2 memory limit?); the tracker-table lookup and the pump.fun page fetch are the two suspects, switched off until proven
        const mm = metrics(r, (r.t0 || w.created_ts) + at, w.creator, bundle), early = mm.early; delete mm.early; // the wallets go to fd_early, not into the check row
        const m = { at, ...mm, txs: r.txs, venue: r.pumpCurve ? (r.complete ? "pump.fun graduated" : "pump.fun curve") : "other" };
        try { recordEarly(db, w, early, r, (r.t0 || w.created_ts) + at); } catch (e) { fdStat.lastErr = ("early: " + e.message).slice(0, 160); }
        if (REC_META && !w.meta_ts && !checks.length) { db.prepare("UPDATE fd_watch SET meta_ts=? WHERE mint=?").run(now(), w.mint); fetchMeta(db, w.mint).catch(() => {}); } // 0.8.11: once per launch, not awaited; 0.8.12: behind LAUNCH_FD_REC_META (off: pump.fun answers 403 to the droplet anyway)
        checks.push(m); const entered = new Set(String(w.entered || "").split(",").filter(Boolean));
        const prev = checks.slice(0, -1).filter((c) => c.at != null && !c.err);
        // 0.8.9: GMGN's token info ONCE per check (it was fetched once per rule that passed), only past the loosest bar; its holder count goes into the check row and the FDH rules
        let info = null; if (BASE_BAR(m) && entered.size < RULES.length) { try { info = await gget("/v1/token/info", { chain: "sol", address: w.mint }); } catch {} m.holders = N(info?.holder_count) || null; }
        for (const rule of RULES) if (!entered.has(rule.k) && rule.ok(w, m, prev)) {
          const gpx = N(info?.price?.price ?? info?.price), supply = N(info?.total_supply) || N(info?.circulating_supply) || 1e9, su = await solPrice();
          const graduated = /graduated|other/.test(m.venue || ""), px = !graduated && m.mcSol > 0 && su > 0 ? m.mcSol * su / supply : gpx; // 0.8.3: chain price on the curve; 0.8.6: GMGN's after graduation (the pool market cap from the trade decoder came out 100× on 4 Nov — "$13,737K" entries)
          if (!(px > 0)) { m["skip_" + rule.k] = "no price"; continue; }
          m.gmgn_px = gpx, m.chain_px = px, m.sol_usd = su;
          const curve = m.venue === "pump.fun curve" ? 1 : m.venue ? 0 : (r.pumpCurve && !r.complete && N(info?.launchpad_progress) != null && N(info.launchpad_progress) < 1 ? 1 : 0); // 0.8.22: our own check decides (Codex, 5 Nov 09:08 UK: GMGN's progress field was missing on 29 coins → flagged graduated → the 25% trail scored them; all five FDH trades among them)
          db.prepare(`INSERT OR IGNORE INTO vol_paper (strat, mint, name, symbol, entry_ts, entry_price, entry_mc, vol5, created_ts, age_min, holders, exchange, launchpad, curve, row) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(rule.k, w.mint, w.name, w.symbol, t, px, px * supply, null, w.created_ts, +(age / 60).toFixed(1), N(info?.holder_count), m.venue, info?.launchpad ?? null, curve,
              JSON.stringify({ fd: { funder: w.funder, funder_sol: w.funder_sol, funded_min_before: w.funded_ts ? +((w.created_ts - w.funded_ts) / 60).toFixed(1) : null, funder_launches: w.funder_launches, bundle_pct: w.bundle_pct, bundle_sol: w.bundle_sol }, ...m }));
          entered.add(rule.k); fdStat.entries++;
          if (isLiveBook(rule.k)) { const vid = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(rule.k, w.mint)?.id; if (vid) liveBuy({ id: vid, strat: rule.k, mint: w.mint, name: w.name, curve, entry_price: px, su, t }).catch(() => {}); } // 0.8.17: real buy, not awaited
        }
        // 0.8.15: quote shadowing — one buy quote per coin per check for the rows just booked (all rules share it), and a 1-in-N sample of checked launches that entered nothing
        if (m.chain_px > 0 && m.sol_usd > 0) { const ids = db.prepare("SELECT id FROM vol_paper WHERE mint=? AND entry_ts=? AND q_ts IS NULL").all(w.mint, t).map((x) => x.id); if (ids.length) shadowBuy(db, w.mint, m.chain_px, m.sol_usd, ids, m).catch(() => {}); }
        else if (at === 60 && entered.size === 0 && BASE_BAR(m) && SHADOW_SAMPLE > 0 && (fdStat.checks % SHADOW_SAMPLE) === 0) { const su = await solPrice(); if (su > 0 && m.mcSol > 0) shadowSample(db, w, m, m.mcSol * su / 1e9, su).catch(() => {}); }
        const dead = at >= 90 && m.net < 5 && m.buyers < 20 && w.pre !== 1; // nothing happening: stop reading it (credits); pre-filtered coins always get their 120 s check (FD120)
        db.prepare("UPDATE fd_watch SET checks=?, entered=?, done=? WHERE mint=?").run(JSON.stringify(checks), [...entered].join(","), dead || entered.size === RULES.length ? 1 : 0, w.mint);
      } catch (e) { fdStat.errors++; fdStat.lastErr = `${w.mint.slice(0, 6)}: ${e.message}`.slice(0, 160); checks.push({ at, err: e.message.slice(0, 80) }); db.prepare("UPDATE fd_watch SET checks=? WHERE mint=?").run(JSON.stringify(checks), w.mint); }
    }
  } finally { checking = false; }
}

/** 0.8.11: the first buyers of a launch — the create-block wallets (b0) and anyone in the first 3 s — kept per wallet so hit rates can be counted later.
 *  Inserted at the first check that sees them (at most 40 wallets, biggest buys first); "exited" (sold 95%+ of what it bought) is refreshed at every check. */
export function recordEarly(db, w, early, r, upto) {
  if (!early || !early.length) return;
  const have = db.prepare("SELECT COUNT(*) c FROM fd_early WHERE mint=?").get(w.mint).c;
  if (!have) { const ins = db.prepare("INSERT OR IGNORE INTO fd_early (mint, wallet, slot0, sec, sol, tok, exited, created_ts) VALUES (?,?,?,?,?,?,0,?)"); const seen = new Set();
    for (const e of [...early].sort((a, b) => b.sol - a.sol)) { if (seen.has(e.w)) continue; seen.add(e.w); if (seen.size > 40) break; ins.run(w.mint, e.w, e.b0, e.sec, e.sol, e.tok, w.created_ts); } }
  const per = new Map(); for (const x of r.trades) { if (x.t > upto) continue; const p = per.get(x.user) || { b: 0, s: 0 }; if (x.isBuy) p.b += x.tok || 0; else p.s += x.tok || 0; per.set(x.user, p); }
  const upd = db.prepare("UPDATE fd_early SET exited=? WHERE mint=? AND wallet=?");
  for (const row of db.prepare("SELECT wallet FROM fd_early WHERE mint=?").all(w.mint)) { const p = per.get(row.wallet); upd.run(p && p.b > 0 && p.s >= 0.95 * p.b ? 1 : 0, w.mint, row.wallet); }
}

/** 0.8.11: socials / image / reply count from pump.fun's own coin page (the tracker's socials.js uses the same endpoint). Not awaited; one call a launch. */
async function fetchMeta(db, mint) {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { signal: AbortSignal.timeout(5000), headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("pump " + res.status);
    const j = await res.json(); if (!j || !j.mint) throw new Error("pump empty");
    const soc = []; if (j.twitter) soc.push("tw"); if (j.telegram) soc.push("tg"); if (j.website) soc.push("web");
    db.prepare("UPDATE fd_watch SET socials=?, image=?, replies=?, koth_ts=?, meta_err=NULL WHERE mint=?").run(soc.join(",") || "none", j.image_uri ? 1 : 0, N(j.reply_count) ?? null, j.king_of_the_hill_timestamp ? Math.floor(Number(j.king_of_the_hill_timestamp) / 1000) : null, mint);
    fdStat.meta = (fdStat.meta || 0) + 1;
  } catch (e) { try { db.prepare("UPDATE fd_watch SET meta_err=? WHERE mint=?").run(e.message.slice(0, 60), mint); } catch {} fdStat.metaErr = (fdStat.metaErr || 0) + 1; }
}

/** 0.8.11, hourly: every early-buyer wallet's record over the last 7 days against the tracker's outcome for each launch (graduated; peak ≥ $50K / $100K on the curve
 *  and as far as the tracker followed it). The "follow the sniper" question — a wallet in many winners AND few duds — is answered from fd_sniper_stats.csv. */
export const snStat = { runs: 0, wallets: 0, lastRun: null, lastErr: "" };
export function fdSniperStats(db, tdb) {
  try {
    const since = now() - 7 * 86400;
    const rows = db.prepare("SELECT mint, wallet, slot0, sol, exited, created_ts FROM fd_early WHERE created_ts>=?").all(since);
    if (!rows.length) return;
    const out = new Map(); const mints = [...new Set(rows.map((r) => r.mint))];
    for (let i = 0; i < mints.length; i += 500) { const chunk = mints.slice(i, i + 500); let q = []; try { q = tdb ? tdb.prepare(`SELECT mint, graduated, peak_mc_usd FROM tokens WHERE mint IN (${chunk.map(() => "?").join(",")})`).all(...chunk) : []; } catch {} for (const t of q) out.set(t.mint, t); }
    const per = new Map();
    for (const r of rows) { const t = out.get(r.mint) || {}; const p = per.get(r.wallet) || { launches: 0, slot0: 0, graduated: 0, peak50k: 0, peak100k: 0, sol: 0, exited: 0, first: r.created_ts, last: r.created_ts };
      p.launches++; p.slot0 += r.slot0 ? 1 : 0; p.graduated += t.graduated ? 1 : 0; p.peak50k += (t.peak_mc_usd || 0) >= 50000 ? 1 : 0; p.peak100k += (t.peak_mc_usd || 0) >= 100000 ? 1 : 0; p.sol += r.sol || 0; p.exited += r.exited ? 1 : 0; p.first = Math.min(p.first, r.created_ts); p.last = Math.max(p.last, r.created_ts); per.set(r.wallet, p); }
    const ins = db.prepare("INSERT OR REPLACE INTO fd_sniper_stats (wallet, launches, slot0, graduated, peak50k, peak100k, sol_avg, exit_pct, first_ts, last_ts, updated) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    const tx = db.transaction(() => { db.prepare("DELETE FROM fd_sniper_stats").run(); for (const [w, p] of per) ins.run(w, p.launches, p.slot0, p.graduated, p.peak50k, p.peak100k, +(p.sol / p.launches).toFixed(3), +(100 * p.exited / p.launches).toFixed(0), p.first, p.last, now()); }); tx();
    snStat.runs++; snStat.wallets = per.size; snStat.lastRun = new Date().toISOString();
  } catch (e) { snStat.lastErr = e.message.slice(0, 160); }
}

/** 0.8.15: the real buy quote for SHADOW_SOL at the moment of a paper entry, kept on every row booked for that coin at that check. q_gap = quote price / chain price − 1 (positive = we would have paid more than the paper book). */
async function shadowBuy(db, mint, chainPx, su, ids, m) {
  const lamports = Math.round(SHADOW_SOL * 1e9);
  try { const q = await buyQuote(mint, lamports); const px = q.pxSol * su, gap = px / chainPx - 1; qStat.buys++;
    db.prepare("UPDATE vol_paper SET q_ts=?, q_px=?, q_gap=?, q_tokens=?, q_impact=?, q_ms=? WHERE id IN (" + ids.map(() => "?").join(",") + ")").run(now(), px, +gap.toFixed(4), q.tokens, q.impact, q.ms, ...ids);
    db.prepare("INSERT INTO fd_quotes (mint, ts, at, entered, chain_px, q_px, q_gap, q_impact, q_ms, venue, mcSol, net, err) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL)").run(mint, now(), m.at, "entry", chainPx, px, +gap.toFixed(4), q.impact, q.ms, m.venue, m.mcSol, m.net);
  } catch (e) { qStat.errors++; qStat.lastErr = `buy ${mint.slice(0, 6)}: ${e.message}`.slice(0, 120); db.prepare("UPDATE vol_paper SET q_ts=?, q_err=? WHERE id IN (" + ids.map(() => "?").join(",") + ")").run(now(), e.message.slice(0, 80), ...ids); }
}
/** 0.8.15: the same quote on a sample of launches that passed a check but entered no book — the fill cost of what we avoid */
async function shadowSample(db, w, m, chainPx, su) {
  const lamports = Math.round(SHADOW_SOL * 1e9);
  try { const q = await buyQuote(w.mint, lamports); const px = q.pxSol * su; qStat.samples++;
    db.prepare("INSERT INTO fd_quotes (mint, ts, at, entered, chain_px, q_px, q_gap, q_impact, q_ms, venue, mcSol, net, err) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL)").run(w.mint, now(), m.at, "sample", chainPx, px, +(px / chainPx - 1).toFixed(4), q.impact, q.ms, m.venue, m.mcSol, m.net);
  } catch (e) { qStat.errors++; qStat.lastErr = `sample ${w.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); db.prepare("INSERT INTO fd_quotes (mint, ts, at, entered, chain_px, venue, mcSol, net, err) VALUES (?,?,?,?,?,?,?,?,?)").run(w.mint, now(), m.at, "sample", chainPx, m.venue, m.mcSol, m.net, e.message.slice(0, 80)); }
}
