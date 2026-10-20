// v0.18.119 — Project S research files for the `data` branch (read-only, runs as its own process so the bot's feed never waits for it):
//   node scripts/dump-launches.cjs launches > launches.csv   every pump.fun launch we saw in the last HOURS (24): what was known at launch
//                                                            (bundle, dev buy, creator's record BEFORE this launch, copycat-of-what, socials,
//                                                            scored early buyers, proven wallets in the first 60 / 180 s) and what happened
//                                                            (MC at +4 s, +60 s, +5 / 15 / 30 / 60 min, peak in 30 min / 24 h, graduated).
//   node scripts/dump-launches.cjs wallets  > wallets.csv    the wallet leaderboard from our own scoring: every wallet with ≥ 5 resolved non-bundle
//                                                            early buys (≥ 0.3 SOL, ≥ 3 s after launch): how many reached 5x / 10x within 24 h.
// Base rates, not trades: every launch is here, winners and losers alike, so a "snipe" rule can be scored without survivorship bias.
const D = require(require("path").join(__dirname, "..", "node_modules", "better-sqlite3"));
const TR = process.env.TRDB || "/root/tracker/data/tracker.db", HOURS = Number(process.env.HOURS || 24), NOW = Math.floor(Date.now() / 1000), FROM = NOW - HOURS * 3600;
const db = new D(TR, { readonly: true });
const csv = (v) => { if (v == null) return ""; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const utc = (ts) => (ts ? new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ") : "");
const hourUK = (ts) => Number(new Date(ts * 1000).toLocaleString("en-GB", { timeZone: "Europe/London", hour12: false }).slice(12, 14));
const r2 = (x, d = 2) => (x == null ? null : +Number(x).toFixed(d));
const mode = process.argv[2] || "launches";
if (mode === "others") { // v0.18.148: every paper strategy the website no longer shows (climber, wave2, grad*, revival, slow, copycreator, momdip, momconf, mom2m, core momentum, P6, P7 …) since the price fix — the study and the owner asked for "everything in the background"
  const FROM_FIX = Math.floor(Date.UTC(2026, 9, 18, 19, 25) / 1000);
  const cols = ["id", "strategy", "name", "mint", "entry_ts", "entry_mc", "venue", "closed", "exit_reason", "peak_mult", "trigger_kind", "age_s", "buyers_entry", "vol5m_usd", "bundle_pct", "tier", "factory", "has_socials", "x_tp", "x_tp15", "x_tsl40", "x_tsl60", "x_t15s40", "x_t2s40", "x_flow4", "x_h5", "x_h3", "x_h15", "x_time", "core", "invalid", "crashloop"];
  let have = []; try { have = db.prepare("PRAGMA table_info(paper_trades)").all().map((c) => c.name); } catch {}
  const use = cols.filter((c) => have.includes(c));
  const rows = db.prepare(`SELECT ${use.join(", ")} FROM paper_trades WHERE entry_ts >= ? AND strategy NOT IN ('p5e30','p5w30','p5e50','p5e80','p5c5','p5c10','grf','pg') AND strategy NOT LIKE 'sn%' AND COALESCE(invalid,0)=0 ORDER BY entry_ts`).all(FROM_FIX);
  const out = [[...use.filter((c) => c !== "entry_ts"), "entry_utc", "entry_ts", "hour_uk"].join(",")];
  for (const r of rows) out.push([...use.filter((c) => c !== "entry_ts").map((c) => r[c]), utc(r.entry_ts), r.entry_ts, hourUK(r.entry_ts)].map(csv).join(","));
  process.stdout.write(out.join("\n") + "\n"); process.exit(0);
}
if (mode === "smart") { // the GMGN-harvested smart wallets (src/smartwallets.js) and the coins they were early on
  let rows = []; try { rows = db.prepare(`SELECT w.wallet, w.wins, w.coins, w.tags, w.profit, w.first_ts, w.last_ts, w.med_early_s, w.gmgn_smart FROM smart_wallets w ORDER BY w.wins DESC, w.profit DESC`).all(); } catch {}
  const out = ["wallet,early_wins,coins_seen,gmgn_tags,profit_usd,first_utc,last_utc,median_early_s,gmgn_smart"];
  for (const w of rows) out.push([w.wallet, w.wins, w.coins, w.tags, r2(w.profit, 0), utc(w.first_ts), utc(w.last_ts), w.med_early_s, w.gmgn_smart].map(csv).join(","));
  process.stdout.write(out.join("\n") + "\n"); process.exit(0);
}
if (mode === "wallets") {
  const rows = db.prepare(`SELECT wallet, COUNT(*) n, SUM(CASE WHEN peak_24h>=5*entry_mc THEN 1 ELSE 0 END) x5, SUM(CASE WHEN peak_24h>=10*entry_mc THEN 1 ELSE 0 END) x10, SUM(CASE WHEN peak_24h>=2*entry_mc THEN 1 ELSE 0 END) x2,
      AVG(age_s) avg_age_s, AVG(sol) avg_sol, SUM(sol) sol_total, MIN(ts) first_ts, MAX(ts) last_ts, AVG(entry_mc) avg_entry_mc, SUM(CASE WHEN ts>=? THEN 1 ELSE 0 END) buys_24h
    FROM wallet_buys WHERE resolved=1 AND is_cluster=0 AND age_s>=3 AND sol>=0.3 AND entry_mc>0 GROUP BY wallet HAVING COUNT(*)>=5 ORDER BY x5*1.0/COUNT(*) DESC, COUNT(*) DESC LIMIT 3000`).all(NOW - 86400);
  const out = ["wallet,buys,x2,x5,x10,rate5x,rate10x,avg_age_s,avg_sol,sol_total,avg_entry_mc,buys_24h,first_utc,last_utc"];
  for (const w of rows) out.push([w.wallet, w.n, w.x2, w.x5, w.x10, r2(w.x5 / w.n, 3), r2(w.x10 / w.n, 3), Math.round(w.avg_age_s), r2(w.avg_sol), r2(w.sol_total, 1), Math.round(w.avg_entry_mc), w.buys_24h, utc(w.first_ts), utc(w.last_ts)].map(csv).join(","));
  process.stdout.write(out.join("\n") + "\n"); process.exit(0);
}
// proven wallets by the bot's own bar (8+ scored buys, half of them 5x, not a 50-buys-a-day volume sniper)
const proven = new Set(db.prepare(`SELECT wallet FROM wallet_buys WHERE resolved=1 AND is_cluster=0 AND age_s>=3 AND sol>=0.3 AND entry_mc>0 AND wallet NOT IN (SELECT wallet FROM wallet_buys WHERE ts>=? GROUP BY wallet HAVING COUNT(*)>50) GROUP BY wallet HAVING COUNT(*)>=8 AND SUM(CASE WHEN peak_24h>=5*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*)>=0.5`).all(NOW - 86400).map((r) => r.wallet));
const L = db.prepare(`SELECT t.mint, t.name, t.symbol, t.creator, t.create_ts, t.tier, t.bundle_pct, t.bundle_sol, t.bundle_wallets, t.dev_buy_sol, t.outside_buyers, t.cluster_sol_in, t.cluster_sol_out, t.handoffs, t.factory, t.has_socials, t.creator_age_s, t.creator_funded_sol, t.fee_claims, t.creator_fee_sol,
    t.entry_mc_usd, t.peak_mc_usd, t.last_mc_usd, t.graduated, pk.peak_30m, pk.peak_24h,
    l1.mc mc_60, l1.buyers_total buyers_60, l1.vol5m_usd vol_60, l2.mc mc_300, l2.buyers_total buyers_300, l2.holders holders_300, l2.top10_pct top10_300, l3.mc mc_900, l4.mc mc_1800, l5.mc mc_3600, l5.graduated grad_3600
  FROM tokens t LEFT JOIN token_peaks pk ON pk.mint=t.mint
    LEFT JOIN token_life l1 ON l1.mint=t.mint AND l1.cp=60 LEFT JOIN token_life l2 ON l2.mint=t.mint AND l2.cp=300 LEFT JOIN token_life l3 ON l3.mint=t.mint AND l3.cp=900 LEFT JOIN token_life l4 ON l4.mint=t.mint AND l4.cp=1800 LEFT JOIN token_life l5 ON l5.mint=t.mint AND l5.cp=3600
  WHERE t.create_ts>=? AND t.create_ts<=? ORDER BY t.create_ts`).all(FROM, NOW - 3600); // launches at least an hour old, so the +60 min mark exists
const qCr = db.prepare(`SELECT COUNT(*) n, SUM(graduated) grads, SUM(CASE WHEN peak_mc_usd>=100000 THEN 1 ELSE 0 END) over100k, MAX(peak_mc_usd) best, MAX(create_ts) last FROM tokens WHERE creator=? AND create_ts<? AND mint<>?`);
const qCc = db.prepare(`SELECT COUNT(*) n, MAX(peak_mc_usd) best, MAX(create_ts) last FROM tokens WHERE name=? AND mint<>? AND create_ts>=? AND create_ts<?`);
const qWb = db.prepare(`SELECT wallet, age_s, sol FROM wallet_buys WHERE mint=?`);
const H = ["mint", "name", "symbol", "creator", "create_utc", "create_ts", "hour_uk", "tier", "bundle_pct", "bundle_sol", "bundle_wallets", "dev_buy_sol", "outside_buyers", "cluster_sol_in", "cluster_sol_out", "churn", "handoffs", "factory", "has_socials", "creator_age_s", "creator_funded_sol", "fee_claims", "creator_fee_sol",
  "cr_prior_n", "cr_prior_grads", "cr_prior_over100k", "cr_prior_best", "cr_prior_last_min", "cc_prior_24h", "cc_prior_best", "cc_prior_last_min", "wb_n", "wb_sol", "wb_60s_n", "wb_60s_sol", "proven_60s", "proven_180s",
  "entry_mc", "mc_60", "buyers_60", "vol5m_60", "mc_300", "buyers_300", "holders_300", "top10_300", "mc_900", "mc_1800", "mc_3600", "grad_3600", "peak_30m", "peak_24h", "peak_mc", "last_mc", "graduated", "x60", "x300", "x900", "x3600", "xpeak"];
const out = [H.join(",")];
for (const t of L) {
  const cr = qCr.get(t.creator, t.create_ts, t.mint) || {}, cc = t.name ? qCc.get(t.name, t.mint, t.create_ts - 86400, t.create_ts) || {} : {};
  let wbN = 0, wbSol = 0, wb60 = 0, wb60Sol = 0, pv60 = 0, pv180 = 0; try { for (const b of qWb.all(t.mint)) { wbN++; wbSol += b.sol; if (b.age_s <= 60) { wb60++; wb60Sol += b.sol; } if (proven.has(b.wallet)) { if (b.age_s <= 60) pv60++; if (b.age_s <= 180) pv180++; } } } catch {}
  const peak = Math.max(t.peak_mc_usd || 0, t.peak_24h || 0, t.mc_60 || 0, t.mc_300 || 0, t.mc_900 || 0, t.mc_1800 || 0, t.mc_3600 || 0) || null, e0 = t.entry_mc_usd > 0 ? t.entry_mc_usd : null;
  const x = (m) => (e0 && m > 0 ? r2(m / e0, 3) : null);
  const row = { mint: t.mint, name: t.name, symbol: t.symbol, creator: t.creator, create_utc: utc(t.create_ts), create_ts: t.create_ts, hour_uk: hourUK(t.create_ts), tier: t.tier, bundle_pct: r2(t.bundle_pct), bundle_sol: r2(t.bundle_sol), bundle_wallets: t.bundle_wallets, dev_buy_sol: r2(t.dev_buy_sol, 3), outside_buyers: t.outside_buyers, cluster_sol_in: r2(t.cluster_sol_in), cluster_sol_out: r2(t.cluster_sol_out), churn: t.bundle_sol > 0 ? r2((t.cluster_sol_out || 0) / t.bundle_sol, 3) : null, handoffs: t.handoffs, factory: t.factory, has_socials: t.has_socials, creator_age_s: t.creator_age_s, creator_funded_sol: r2(t.creator_funded_sol), fee_claims: t.fee_claims, creator_fee_sol: r2(t.creator_fee_sol, 3),
    cr_prior_n: cr.n || 0, cr_prior_grads: cr.grads || 0, cr_prior_over100k: cr.over100k || 0, cr_prior_best: cr.best != null ? Math.round(cr.best) : null, cr_prior_last_min: cr.last ? Math.round((t.create_ts - cr.last) / 60) : null, cc_prior_24h: cc.n || 0, cc_prior_best: cc.best != null ? Math.round(cc.best) : null, cc_prior_last_min: cc.last ? Math.round((t.create_ts - cc.last) / 60) : null,
    wb_n: wbN, wb_sol: r2(wbSol), wb_60s_n: wb60, wb_60s_sol: r2(wb60Sol), proven_60s: pv60, proven_180s: pv180,
    entry_mc: e0 != null ? Math.round(e0) : null, mc_60: t.mc_60 != null ? Math.round(t.mc_60) : null, buyers_60: t.buyers_60, vol5m_60: t.vol_60 != null ? Math.round(t.vol_60) : null, mc_300: t.mc_300 != null ? Math.round(t.mc_300) : null, buyers_300: t.buyers_300, holders_300: t.holders_300, top10_300: r2(t.top10_300, 1), mc_900: t.mc_900 != null ? Math.round(t.mc_900) : null, mc_1800: t.mc_1800 != null ? Math.round(t.mc_1800) : null, mc_3600: t.mc_3600 != null ? Math.round(t.mc_3600) : null, grad_3600: t.grad_3600,
    peak_30m: t.peak_30m ? Math.round(t.peak_30m) : null, peak_24h: t.peak_24h ? Math.round(t.peak_24h) : null, peak_mc: peak != null ? Math.round(peak) : null, last_mc: t.last_mc_usd != null ? Math.round(t.last_mc_usd) : null, graduated: t.graduated, x60: x(t.mc_60), x300: x(t.mc_300), x900: x(t.mc_900), x3600: x(t.mc_3600), xpeak: x(peak) };
  out.push(H.map((h) => csv(row[h])).join(","));
}
process.stdout.write(out.join("\n") + "\n");
