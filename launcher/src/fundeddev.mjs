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
// Nothing is bought. Every launch's pre-filter result and every checkpoint is kept (fd_watch) so the cut can be re-tuned from data.
import { readFileSync } from "node:fs";
import { gget, N } from "./gmgn.mjs";
import { earlyTrades, studyStat } from "./study.mjs";
import { creatorFunder, ctStat } from "./operators.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const FUND_SOL = n("LAUNCH_FD_FUND_SOL", 2), FUND_S = n("LAUNCH_FD_FUND_S", 7200), FUNDER_MAX = n("LAUNCH_FD_FUNDER_MAX", 2), B_LO = n("LAUNCH_FD_BUNDLE_LO", 10), B_HI = n("LAUNCH_FD_BUNDLE_HI", 60);
const CHECKS = [60, 90, 120], DAY_CREDITS = n("LAUNCH_FD_DAY_CREDITS", 120000), SCAN_S = n("LAUNCH_FD_SCAN_S", 240);
const GRAND_MAX = n("LAUNCH_FD_GRAND_MAX", 2), AMOUNT_DAYS = n("LAUNCH_FD_AMOUNT_DAYS", 7);
// 0.8.2 (12:50 UK): the factories fund a NEW funder wallet for every launch (7 pre-filter passes in 2 h: 5.201089 SOL twice, 2.99010312 SOL twice —
// identical amounts to six decimals). Two more tests on anything that passes: the funder's own funder (grand-funder) with ≤ GRAND_MAX creators behind it,
// and no other creator funded with the same amount (to 4 decimals) in the last AMOUNT_DAYS days.
const confirm = (m) => m.net >= 27 && (m.mcSol ?? 0) >= 100 && m.big >= 3;
export const RULES = [
  { k: "FD", ok: (w, m) => w.pre === 1 && confirm(m) },
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
  { k: "FDH", ok: (w, m) => w.pre_nb === 1 && confirm(m) && m.venue === "pump.fun curve" && m.holders >= 100 && m.holders >= 0.97 * m.buyers },
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
}

/** every 15 s: every tracker launch of the last SCAN_S seconds not yet seen → funder lookup → pre-filter. */
let scanning = false;
export async function fdScan(db, tdb) {
  if (scanning || !tdb) return; scanning = true;
  try {
    if (fdStat.creditsDay !== today()) { fdStat.creditsDay = today(); fdStat.credits = 0; }
    const rows = tdb.prepare("SELECT mint, name, symbol, creator, create_ts, bundle_pct, bundle_sol, peak_mc_usd, graduated FROM tokens WHERE create_ts>=? AND creator IS NOT NULL AND creator<>'' ORDER BY create_ts DESC LIMIT 400").all(now() - SCAN_S);
    const ins = db.prepare(`INSERT OR IGNORE INTO fd_watch (mint, name, symbol, creator, created_ts, bundle_pct, bundle_sol, funder, funder_sol, funded_ts, funder_launches, pre, pre_nb, why, scanned_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
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
      ins.run(t.mint, String(t.name || "").slice(0, 60), String(t.symbol || "").slice(0, 20), t.creator, t.create_ts, bp, N(t.bundle_sol), r.funder || null, amt || null, r.funded_ts ?? null, fl, pre, preNb, why.join("; "), now());
    }
    fdStat.lastScan = new Date().toISOString();
  } catch (e) { fdStat.errors++; fdStat.lastErr = "scan: " + e.message.slice(0, 160); }
  finally { scanning = false; }
}

export function metrics(r, upto) {
  const xs = r.trades.filter((x) => x.t <= upto), buys = xs.filter((x) => x.isBuy), sells = xs.filter((x) => !x.isBuy);
  const bs = buys.reduce((s, x) => s + x.sol, 0) / 1e9, ss = sells.reduce((s, x) => s + x.sol, 0) / 1e9, last = xs[xs.length - 1];
  // 0.8.9: who is still holding — per wallet, tokens bought vs sold; "exited" = sold 95%+ of what it bought (sniper in-and-out). Chain-side twin of GMGN's holder count.
  const per = new Map(); for (const x of xs) { const p = per.get(x.user) || { b: 0, s: 0 }; if (x.isBuy) p.b += x.tok || 0; else p.s += x.tok || 0; per.set(x.user, p); }
  const exited = [...per.values()].filter((p) => p.b > 0 && p.s >= 0.95 * p.b).length, buyers = new Set(buys.map((x) => x.user)).size;
  return { net: +(bs - ss).toFixed(2), buySol: +bs.toFixed(2), sellSol: +ss.toFixed(2), buyers, buys: buys.length, sells: sells.length,
    big: buys.filter((x) => x.sol >= 2e9).length, mcSol: last?.mc ? +last.mc.toFixed(1) : null, exited, holding: buyers - exited, sellers: new Set(sells.map((x) => x.user)).size };
}

/** every 15 s: checkpoints at 60 / 90 / 120 s for launches that passed any pre-filter (and a sample of the rest for the A1 control). */
let checking = false;
export async function fdCheck(db) {
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
        const m = { at, ...metrics(r, (r.t0 || w.created_ts) + at), txs: r.txs, venue: r.pumpCurve ? (r.complete ? "pump.fun graduated" : "pump.fun curve") : "other" };
        checks.push(m); const entered = new Set(String(w.entered || "").split(",").filter(Boolean));
        const prev = checks.slice(0, -1).filter((c) => c.at != null && !c.err);
        // 0.8.9: GMGN's token info ONCE per check (it was fetched once per rule that passed), only past the loosest bar; its holder count goes into the check row and the FDH rules
        let info = null; if (BASE_BAR(m) && entered.size < RULES.length) { try { info = await gget("/v1/token/info", { chain: "sol", address: w.mint }); } catch {} m.holders = N(info?.holder_count) || null; }
        for (const rule of RULES) if (!entered.has(rule.k) && rule.ok(w, m, prev)) {
          const gpx = N(info?.price?.price ?? info?.price), supply = N(info?.total_supply) || N(info?.circulating_supply) || 1e9, su = await solPrice();
          const graduated = /graduated|other/.test(m.venue || ""), px = !graduated && m.mcSol > 0 && su > 0 ? m.mcSol * su / supply : gpx; // 0.8.3: chain price on the curve; 0.8.6: GMGN's after graduation (the pool market cap from the trade decoder came out 100× on 4 Nov — "$13,737K" entries)
          if (!(px > 0)) { m["skip_" + rule.k] = "no price"; continue; }
          m.gmgn_px = gpx, m.chain_px = px, m.sol_usd = su;
          const curve = r.pumpCurve && !r.complete && N(info?.launchpad_progress) != null && N(info.launchpad_progress) < 1 ? 1 : 0;
          db.prepare(`INSERT OR IGNORE INTO vol_paper (strat, mint, name, symbol, entry_ts, entry_price, entry_mc, vol5, created_ts, age_min, holders, exchange, launchpad, curve, row) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(rule.k, w.mint, w.name, w.symbol, t, px, px * supply, null, w.created_ts, +(age / 60).toFixed(1), N(info?.holder_count), m.venue, info?.launchpad ?? null, curve,
              JSON.stringify({ fd: { funder: w.funder, funder_sol: w.funder_sol, funded_min_before: w.funded_ts ? +((w.created_ts - w.funded_ts) / 60).toFixed(1) : null, funder_launches: w.funder_launches, bundle_pct: w.bundle_pct, bundle_sol: w.bundle_sol }, ...m }));
          entered.add(rule.k); fdStat.entries++;
        }
        const dead = at >= 90 && m.net < 5 && m.buyers < 20 && w.pre !== 1; // nothing happening: stop reading it (credits); pre-filtered coins always get their 120 s check (FD120)
        db.prepare("UPDATE fd_watch SET checks=?, entered=?, done=? WHERE mint=?").run(JSON.stringify(checks), [...entered].join(","), dead || entered.size === RULES.length ? 1 : 0, w.mint);
      } catch (e) { fdStat.errors++; fdStat.lastErr = `${w.mint.slice(0, 6)}: ${e.message}`.slice(0, 160); checks.push({ at, err: e.message.slice(0, 80) }); db.prepare("UPDATE fd_watch SET checks=? WHERE mint=?").run(JSON.stringify(checks), w.mint); }
    }
  } finally { checking = false; }
}
