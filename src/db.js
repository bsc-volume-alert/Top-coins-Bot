import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config.js";
mkdirSync(dirname(CFG.DB_PATH), { recursive: true });
export const db = new Database(CFG.DB_PATH);
db.pragma("journal_mode = WAL"); db.pragma("synchronous = NORMAL");
db.exec(`
CREATE TABLE IF NOT EXISTS tokens (
  mint TEXT PRIMARY KEY, name TEXT, symbol TEXT, uri TEXT, creator TEXT, bonding_curve TEXT,
  create_slot INTEGER, create_ts INTEGER, create_sig TEXT,
  bundle_sol REAL DEFAULT 0, bundle_tokens REAL DEFAULT 0, bundle_pct REAL DEFAULT 0, bundle_wallets INTEGER DEFAULT 0,
  dev_buy_sol REAL DEFAULT 0, tier INTEGER DEFAULT 0, finalized INTEGER DEFAULT 0,
  entry_mc_usd REAL, peak_mc_usd REAL, last_mc_usd REAL, handoffs INTEGER DEFAULT 0, cluster_net_sol REAL DEFAULT 0,
  first_seen INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS tokens_tier ON tokens(tier, create_ts);
CREATE INDEX IF NOT EXISTS tokens_creator ON tokens(creator);
CREATE TABLE IF NOT EXISTS cluster_wallets (
  mint TEXT, wallet TEXT, role TEXT, tokens REAL DEFAULT 0, sol_in REAL DEFAULT 0, sol_out REAL DEFAULT 0,
  first_slot INTEGER, funder TEXT, wallet_age_s INTEGER, PRIMARY KEY (mint, wallet)
);
CREATE TABLE IF NOT EXISTS trades (
  mint TEXT, sig TEXT, slot INTEGER, ts INTEGER, wallet TEXT, is_buy INTEGER, sol REAL, tokens REAL, price_sol REAL
);
CREATE INDEX IF NOT EXISTS trades_mint ON trades(mint, slot);
CREATE TABLE IF NOT EXISTS handoffs (
  mint TEXT, slot INTEGER, ts INTEGER, seller TEXT, buyer TEXT, sol REAL, tokens REAL, same_tx INTEGER
);
CREATE TABLE IF NOT EXISTS mc_samples (mint TEXT, ts INTEGER, mc_usd REAL, price_sol REAL);
CREATE INDEX IF NOT EXISTS mc_mint ON mc_samples(mint, ts);
CREATE TABLE IF NOT EXISTS paper_trades (
  id INTEGER PRIMARY KEY, mint TEXT, name TEXT, entry_ts INTEGER, entry_mc REAL, entry_price REAL,
  exit_ts INTEGER, exit_mc REAL, exit_price REAL, exit_reason TEXT, pnl_pct REAL, peak_mc REAL,
  bundle_pct REAL, bundle_sol REAL, handoffs INTEGER
);
CREATE TABLE IF NOT EXISTS stats (k TEXT PRIMARY KEY, v REAL);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS wallet_buys (
  wallet TEXT, mint TEXT, ts INTEGER, age_s INTEGER, sol REAL, entry_mc REAL, is_cluster INTEGER DEFAULT 0,
  peak_30m REAL, peak_24h REAL, resolved INTEGER DEFAULT 0, PRIMARY KEY (wallet, mint)
);
CREATE INDEX IF NOT EXISTS wb_mint ON wallet_buys(mint);
CREATE INDEX IF NOT EXISTS wb_ts ON wallet_buys(ts);
CREATE TABLE IF NOT EXISTS token_peaks (mint TEXT PRIMARY KEY, create_ts INTEGER, peak_30m REAL DEFAULT 0, peak_24h REAL DEFAULT 0, until INTEGER);
CREATE TABLE IF NOT EXISTS watch_wallets (wallet TEXT PRIMARY KEY, label TEXT, added_ts INTEGER, source TEXT);
`);
// migrations (idempotent)
for (const sql of [
  "ALTER TABLE tokens ADD COLUMN factory INTEGER DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN graduated INTEGER DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN cluster_sol_in REAL DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN cluster_sol_out REAL DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN outside_sol_in REAL DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN outside_sol_out REAL DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN outside_buyers INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN tier INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN factory INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN inflow_sol REAL",
  "ALTER TABLE paper_trades ADD COLUMN inflow_wallets INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN outside_share REAL",
  "ALTER TABLE paper_trades ADD COLUMN entry_age_s INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN peak_mult REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_cluster REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tsl40 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tsl60 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tp REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_time REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_grad REAL",
  "ALTER TABLE paper_trades ADD COLUMN closed INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN alerted INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN socials TEXT",
  "ALTER TABLE paper_trades ADD COLUMN has_socials INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN buys INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN sells INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN mc_5m REAL",
  "ALTER TABLE paper_trades ADD COLUMN mc_15m REAL",
  "ALTER TABLE paper_trades ADD COLUMN buyers_5m INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN strategy TEXT DEFAULT 'early'",
  "ALTER TABLE paper_trades ADD COLUMN vol5m_usd REAL",
  "ALTER TABLE paper_trades ADD COLUMN vol1m_usd REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tsl80 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_half60 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_twophase REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_ladder REAL",
  "ALTER TABLE paper_trades ADD COLUMN reentry_n INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN age_s INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN symbol TEXT",
  "ALTER TABLE paper_trades ADD COLUMN x_levels REAL",
  "ALTER TABLE paper_trades ADD COLUMN next_level REAL",
  "ALTER TABLE paper_trades ADD COLUMN wave1_peak_mc REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_m1 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_m1vol REAL",
  "ALTER TABLE paper_trades ADD COLUMN cluster_held_pct REAL",
  "ALTER TABLE paper_trades ADD COLUMN trigger_kind TEXT",
  "ALTER TABLE paper_trades ADD COLUMN x_volstop REAL",
  "ALTER TABLE paper_trades ADD COLUMN vol_at_entry REAL",
  "ALTER TABLE paper_trades ADD COLUMN after_peak_mult REAL",
  "ALTER TABLE paper_trades ADD COLUMN after_peak_mc REAL",
  "ALTER TABLE paper_trades ADD COLUMN handover INTEGER DEFAULT 0",
  "ALTER TABLE tokens ADD COLUMN has_socials INTEGER",
  "ALTER TABLE tokens ADD COLUMN socials TEXT",
]) { try { db.exec(sql); } catch {} }
export const q = {
  insToken: db.prepare(`INSERT OR IGNORE INTO tokens (mint,name,symbol,uri,creator,bonding_curve,create_slot,create_ts,create_sig) VALUES (?,?,?,?,?,?,?,?,?)`),
  finToken: db.prepare(`UPDATE tokens SET bundle_sol=?, bundle_tokens=?, bundle_pct=?, bundle_wallets=?, dev_buy_sol=?, tier=?, finalized=1, entry_mc_usd=?, peak_mc_usd=?, last_mc_usd=? WHERE mint=?`),
  insCluster: db.prepare(`INSERT OR IGNORE INTO cluster_wallets (mint,wallet,role,tokens,sol_in,first_slot) VALUES (?,?,?,?,?,?)`),
  insTrade: db.prepare(`INSERT INTO trades (mint,sig,slot,ts,wallet,is_buy,sol,tokens,price_sol) VALUES (?,?,?,?,?,?,?,?,?)`),
  bump: db.prepare(`INSERT INTO stats (k,v) VALUES (?,1) ON CONFLICT(k) DO UPDATE SET v=v+1`),
  stat: db.prepare(`SELECT v FROM stats WHERE k=?`).pluck(),
  countSince: db.prepare(`SELECT COUNT(*) FROM tokens WHERE create_ts>=?`).pluck(),
  countTierSince: db.prepare(`SELECT COUNT(*) FROM tokens WHERE tier>=? AND create_ts>=?`).pluck(),
  creatorRecent: db.prepare(`SELECT COUNT(*) FROM tokens WHERE creator=? AND create_ts>=? AND mint<>?`).pluck(),
  setFactory: db.prepare(`UPDATE tokens SET factory=1 WHERE mint=?`),
  setGrad: db.prepare(`UPDATE tokens SET graduated=1 WHERE mint=?`),
  updFlows: db.prepare(`UPDATE tokens SET cluster_sol_in=?, cluster_sol_out=?, outside_sol_in=?, outside_sol_out=?, outside_buyers=?, handoffs=?, cluster_net_sol=?, peak_mc_usd=?, last_mc_usd=? WHERE mint=?`),
  insHandoff: db.prepare(`INSERT INTO handoffs (mint,slot,ts,seller,buyer,sol,tokens,same_tx) VALUES (?,?,?,?,?,?,?,?)`),
  updWallet: db.prepare(`UPDATE cluster_wallets SET funder=?, wallet_age_s=? WHERE mint=? AND wallet=?`),
  insPaper: db.prepare(`INSERT INTO paper_trades (mint,name,entry_ts,entry_mc,entry_price,bundle_pct,bundle_sol,handoffs,tier,factory,inflow_sol,inflow_wallets,outside_share,entry_age_s,peak_mc,strategy,next_level,wave1_peak_mc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  setPaperExtra: db.prepare(`UPDATE paper_trades SET cluster_held_pct=?, trigger_kind=? WHERE id=?`),
  setVolEntry: db.prepare(`UPDATE paper_trades SET vol_at_entry=? WHERE id=?`),
  setAfter: db.prepare(`UPDATE paper_trades SET after_peak_mult=?, after_peak_mc=? WHERE id=?`),
  setHandover: db.prepare(`UPDATE paper_trades SET handover=1 WHERE id=?`),
  setPaperSocials: db.prepare(`UPDATE paper_trades SET socials=?, has_socials=? WHERE id=?`),
  updPaper: db.prepare(`UPDATE paper_trades SET peak_mc=?, peak_mult=?, x_cluster=?, x_tsl40=?, x_tsl60=?, x_tp=?, x_time=?, x_grad=?, exit_ts=?, exit_mc=?, exit_price=?, exit_reason=?, pnl_pct=?, closed=?, x_tsl80=?, x_half60=?, x_twophase=?, x_ladder=?, x_levels=?, x_m1=?, x_m1vol=?, x_volstop=? WHERE id=?`),
  setPaperMeta: db.prepare(`UPDATE paper_trades SET alerted=?, socials=?, has_socials=? WHERE id=?`),
  setPaperCard: db.prepare(`UPDATE paper_trades SET mc_5m=COALESCE(?,mc_5m), mc_15m=COALESCE(?,mc_15m), buyers_5m=COALESCE(?,buyers_5m), buys=?, sells=? WHERE id=?`),
  setTokenSocials: db.prepare(`UPDATE tokens SET has_socials=?, socials=? WHERE mint=?`),
  digestTop: db.prepare(`SELECT p.name, p.entry_mc, p.peak_mult, p.x_time, p.tier, p.factory, p.has_socials, p.handoffs, p.inflow_sol, p.inflow_wallets, p.entry_age_s, p.buys, p.sells, t.outside_buyers, p.mint FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.entry_ts>=? AND p.entry_ts<? ORDER BY p.peak_mult DESC LIMIT 10`),
  digestAgg: db.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, SUM(CASE WHEN has_socials=0 THEN 1 ELSE 0 END) nosoc, SUM(CASE WHEN has_socials=0 AND peak_mult>=2 THEN 1 ELSE 0 END) nosoc2x, SUM(CASE WHEN factory=1 THEN 1 ELSE 0 END) fac, SUM(CASE WHEN factory=1 AND peak_mult>=2 THEN 1 ELSE 0 END) fac2x, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_time) xt FROM paper_trades WHERE entry_ts>=? AND entry_ts<?`),
  insMom: db.prepare(`INSERT INTO paper_trades (strategy,mint,name,symbol,entry_ts,entry_mc,entry_price,bundle_pct,bundle_sol,handoffs,tier,factory,has_socials,socials,vol5m_usd,vol1m_usd,buys,sells,age_s,reentry_n,alerted,peak_mc) VALUES ('momentum',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  setStrategy: db.prepare(`UPDATE paper_trades SET strategy=? WHERE id=?`),
  setNextLevel: db.prepare(`UPDATE paper_trades SET next_level=? WHERE id=?`),
  updMom: db.prepare(`UPDATE paper_trades SET peak_mc=?, peak_mult=?, x_tp=?, x_tsl40=?, x_tsl60=?, x_tsl80=?, x_half60=?, x_twophase=?, x_ladder=?, x_time=?, exit_ts=?, exit_mc=?, exit_price=?, exit_reason=?, pnl_pct=?, closed=?, x_levels=?, x_m1=?, x_m1vol=?, x_volstop=? WHERE id=?`),
  tokenMeta: db.prepare(`SELECT name, symbol, create_ts, bundle_pct, bundle_sol, handoffs, tier, factory, has_socials, socials, cluster_sol_in, cluster_sol_out FROM tokens WHERE mint=?`),
  stratSummary: db.prepare(`SELECT strategy, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, AVG(peak_mult) peak, AVG(x_tp) xtp, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tsl80) x80, AVG(x_half60) xh, AVG(x_twophase) x2p, AVG(x_ladder) xl, AVG(x_levels) xlv, AVG(x_m1) xm1, AVG(x_m1vol) xm1v, AVG(x_volstop) xvs, AVG(x_time) xt, AVG(after_peak_mult) ap, SUM(CASE WHEN after_peak_mult>=3 THEN 1 ELSE 0 END) ap3 FROM paper_trades WHERE entry_ts>=? AND entry_ts<? GROUP BY strategy`),
  insWB: db.prepare(`INSERT OR IGNORE INTO wallet_buys (wallet,mint,ts,age_s,sol,entry_mc,is_cluster) VALUES (?,?,?,?,?,?,?)`),
  wbCount: db.prepare(`SELECT COUNT(*) FROM wallet_buys WHERE mint=?`).pluck(),
  upPeak: db.prepare(`INSERT INTO token_peaks (mint,create_ts,peak_30m,peak_24h,until) VALUES (?,?,?,?,?) ON CONFLICT(mint) DO UPDATE SET peak_30m=MAX(peak_30m,excluded.peak_30m), peak_24h=MAX(peak_24h,excluded.peak_24h)`),
  resolveWB: db.prepare(`UPDATE wallet_buys SET peak_30m=(SELECT peak_30m FROM token_peaks WHERE token_peaks.mint=wallet_buys.mint), peak_24h=(SELECT peak_24h FROM token_peaks WHERE token_peaks.mint=wallet_buys.mint), resolved=1 WHERE resolved=0 AND mint IN (SELECT mint FROM token_peaks WHERE until<=?)`),
  pruneWB: db.prepare(`DELETE FROM wallet_buys WHERE ts<?`),
  prunePeaks: db.prepare(`DELETE FROM token_peaks WHERE until<?`),
  leaderboard: db.prepare(`SELECT wallet, COUNT(*) n,
      SUM(CASE WHEN peak_24h>=2*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r2,
      SUM(CASE WHEN peak_24h>=3*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r3,
      SUM(CASE WHEN peak_24h>=4*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r4,
      AVG(peak_24h/entry_mc) avgpeak, AVG(entry_mc) avgmc, AVG(sol) avgsol, MAX(ts) last_ts, AVG(age_s) avgage
    FROM wallet_buys WHERE resolved=1 AND is_cluster=0 AND entry_mc>0 AND ts>=?
    GROUP BY wallet HAVING n>=? ORDER BY r3 DESC, r2 DESC, n DESC LIMIT ?`),
  walletStats: db.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN peak_24h>=2*entry_mc THEN 1 ELSE 0 END) h2, SUM(CASE WHEN peak_24h>=3*entry_mc THEN 1 ELSE 0 END) h3, SUM(CASE WHEN peak_24h>=4*entry_mc THEN 1 ELSE 0 END) h4, AVG(peak_24h/entry_mc) avgpeak, AVG(entry_mc) avgmc, MAX(ts) last_ts, SUM(resolved=0) pending FROM wallet_buys WHERE wallet=? AND is_cluster=0 AND entry_mc>0`),
  walletRecent: db.prepare(`SELECT w.mint, t.name, w.ts, w.age_s, w.sol, w.entry_mc, w.peak_24h, w.resolved FROM wallet_buys w LEFT JOIN tokens t ON t.mint=w.mint WHERE w.wallet=? ORDER BY w.ts DESC LIMIT 8`),
  spamWallets: db.prepare(`SELECT wallet FROM wallet_buys WHERE ts>=? GROUP BY wallet HAVING COUNT(*)>?`),
  addWatch: db.prepare(`INSERT OR REPLACE INTO watch_wallets (wallet,label,added_ts,source) VALUES (?,?,?,?)`),
  delWatch: db.prepare(`DELETE FROM watch_wallets WHERE wallet=?`),
  listWatch: db.prepare(`SELECT wallet,label,source FROM watch_wallets ORDER BY added_ts`),
  openPapers: db.prepare(`SELECT COUNT(*) FROM paper_trades WHERE closed=0`).pluck(),
  closedSince: db.prepare(`SELECT COUNT(*) c, AVG(pnl_pct) p FROM paper_trades WHERE closed=1 AND exit_ts>=?`),
};
