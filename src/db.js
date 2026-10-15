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
CREATE TABLE IF NOT EXISTS creator_claims (creator TEXT, ts INTEGER, sol REAL, venue TEXT, sig TEXT, mint TEXT, ambiguous INTEGER);
CREATE INDEX IF NOT EXISTS cc_creator ON creator_claims(creator, ts);
CREATE TABLE IF NOT EXISTS pump_buyers (trade_id INTEGER, mint TEXT, wallet TEXT, ts INTEGER, sol REAL, mc REAL, lead_s INTEGER, venue TEXT);
CREATE INDEX IF NOT EXISTS pb_wallet ON pump_buyers(wallet);
CREATE TABLE IF NOT EXISTS dex_pools (pool TEXT PRIMARY KEY, venue TEXT, mint TEXT, sol_side INTEGER, m0 TEXT, m1 TEXT, dec INTEGER, supply REAL, bin_step INTEGER, ignore INTEGER DEFAULT 0, ts INTEGER);
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
CREATE TABLE IF NOT EXISTS watch_creators (creator TEXT PRIMARY KEY, label TEXT, added_ts INTEGER);
CREATE TABLE IF NOT EXISTS token_life (
  mint TEXT, cp INTEGER, ts INTEGER, mc REAL, vol5m_usd REAL, buys5m INTEGER, sells5m INTEGER, buyers5m INTEGER, buyers_total INTEGER,
  graduated INTEGER, top10_pct REAL, holders INTEGER, alive INTEGER, PRIMARY KEY (mint, cp)
);
CREATE INDEX IF NOT EXISTS life_cp ON token_life(cp, mc);
CREATE TABLE IF NOT EXISTS big_buys (mint TEXT, wallet TEXT, ts INTEGER, age_s INTEGER, sol REAL, mc REAL, balance_sol REAL, venue TEXT);
CREATE INDEX IF NOT EXISTS bb_mint ON big_buys(mint);
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
  "ALTER TABLE paper_trades ADD COLUMN creator_prior INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN creator_best_peak REAL",
  "ALTER TABLE paper_trades ADD COLUMN dev_buy_sol REAL",
  "ALTER TABLE paper_trades ADD COLUMN snipers INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN hour_utc INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN parent_id INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN bs_ratio_entry REAL",
  "ALTER TABLE paper_trades ADD COLUMN buyers_entry INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN invalid INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN buys_entry INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN q_score INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN x_combo REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tp15 REAL",
  "ALTER TABLE paper_trades ADD COLUMN x_tsl25 REAL",
  "ALTER TABLE paper_trades ADD COLUMN tight INTEGER DEFAULT 0",
  "ALTER TABLE paper_trades ADD COLUMN churn_entry REAL",
  "ALTER TABLE paper_trades ADD COLUMN cluster_out_entry REAL",
  "ALTER TABLE paper_trades ADD COLUMN venue TEXT",
  "ALTER TABLE paper_trades ADD COLUMN path TEXT",
  "ALTER TABLE paper_trades ADD COLUMN x_flow REAL", "ALTER TABLE paper_trades ADD COLUMN x_flow4 REAL", "ALTER TABLE paper_trades ADD COLUMN x_t15s40 REAL", "ALTER TABLE paper_trades ADD COLUMN x_t2s40 REAL", "ALTER TABLE paper_trades ADD COLUMN dd_pre15 REAL",
  "ALTER TABLE creator_claims ADD COLUMN mint TEXT", "ALTER TABLE creator_claims ADD COLUMN ambiguous INTEGER", "CREATE INDEX IF NOT EXISTS cc_mint ON creator_claims(mint)",
  "UPDATE tokens SET fee_claims=NULL, fee_claimed_sol=NULL, first_claim_ts=NULL WHERE fee_claims IS NOT NULL AND NOT EXISTS (SELECT 1 FROM creator_claims c WHERE c.mint=tokens.mint)",
  "ALTER TABLE paper_trades ADD COLUMN core_tight INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN top10_entry REAL", "ALTER TABLE paper_trades ADD COLUMN largest_entry REAL", "ALTER TABLE paper_trades ADD COLUMN holders_entry INTEGER", "ALTER TABLE paper_trades ADD COLUMN dev_hold_entry REAL",
  "ALTER TABLE paper_trades ADD COLUMN fee_accrued_entry REAL", "ALTER TABLE paper_trades ADD COLUMN fee_claims_entry INTEGER", "ALTER TABLE paper_trades ADD COLUMN fee_claimed_entry REAL", "ALTER TABLE paper_trades ADD COLUMN core INTEGER", "ALTER TABLE paper_trades ADD COLUMN t_hit15_s INTEGER",
  "ALTER TABLE tokens ADD COLUMN creator_fee_sol REAL", "ALTER TABLE tokens ADD COLUMN fee_claims INTEGER", "ALTER TABLE tokens ADD COLUMN fee_claimed_sol REAL", "ALTER TABLE tokens ADD COLUMN first_claim_ts INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN x_t15s25 REAL", "ALTER TABLE paper_trades ADD COLUMN x_t15s60 REAL", "ALTER TABLE paper_trades ADD COLUMN x_t2s25 REAL", "ALTER TABLE paper_trades ADD COLUMN x_t2s60 REAL",
  "UPDATE paper_trades SET invalid=1 WHERE COALESCE(invalid,0)=0 AND mint IN (SELECT mint FROM tokens WHERE bundle_pct BETWEEN 79.2 AND 79.4 AND bundle_sol BETWEEN 84.5 AND 85.5)",
  "ALTER TABLE paper_trades ADD COLUMN q_wallets INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN q_per10k REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_top3 REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_roundtrip INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN q_retail REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_custom REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_size_cv REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_new_pct REAL",
  "ALTER TABLE paper_trades ADD COLUMN q_px_per10k REAL",
  "ALTER TABLE paper_trades ADD COLUMN sells_entry INTEGER",
  "ALTER TABLE paper_trades ADD COLUMN proven_entry INTEGER",
  "CREATE INDEX IF NOT EXISTS pt_open ON paper_trades(closed, entry_ts)",
  "UPDATE paper_trades SET invalid=1 WHERE strategy='momentum' AND COALESCE(invalid,0)=0 AND (peak_mult>50 OR (vol5m_usd=bs_ratio_entry AND trigger_kind LIKE 'vol5m%'))",
  "ALTER TABLE tokens ADD COLUMN creator_funder TEXT",
  "ALTER TABLE tokens ADD COLUMN creator_age_s INTEGER",
  "ALTER TABLE tokens ADD COLUMN creator_funded_sol REAL",
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
  setFeatures: db.prepare(`UPDATE paper_trades SET creator_prior=?, creator_best_peak=?, dev_buy_sol=?, snipers=?, hour_utc=?, parent_id=?, bs_ratio_entry=?, buyers_entry=? WHERE id=?`),
  creatorHist: db.prepare(`SELECT COUNT(*) n, MAX(peak_mc_usd) best, SUM(graduated) grads, SUM(CASE WHEN peak_mc_usd>=100000 THEN 1 ELSE 0 END) over100k FROM tokens WHERE creator=? AND mint<>? AND create_ts<?`),
  setVolEntry: db.prepare(`UPDATE paper_trades SET vol_at_entry=? WHERE id=?`),
  setAfter: db.prepare(`UPDATE paper_trades SET after_peak_mult=?, after_peak_mc=? WHERE id=?`),
  setHandover: db.prepare(`UPDATE paper_trades SET handover=1 WHERE id=?`),
  setPaperSocials: db.prepare(`UPDATE paper_trades SET socials=?, has_socials=? WHERE id=?`),
  updPaper: db.prepare(`UPDATE paper_trades SET peak_mc=?, peak_mult=?, x_cluster=?, x_tsl40=?, x_tsl60=?, x_tp=?, x_time=?, x_grad=?, exit_ts=?, exit_mc=?, exit_price=?, exit_reason=?, pnl_pct=?, closed=?, x_tsl80=?, x_half60=?, x_twophase=?, x_ladder=?, x_levels=?, x_m1=?, x_m1vol=?, x_volstop=? WHERE id=?`),
  setPaperMeta: db.prepare(`UPDATE paper_trades SET alerted=?, socials=?, has_socials=? WHERE id=?`),
  setPaperCard: db.prepare(`UPDATE paper_trades SET mc_5m=COALESCE(?,mc_5m), mc_15m=COALESCE(?,mc_15m), buyers_5m=COALESCE(?,buyers_5m), buys=?, sells=? WHERE id=?`),
  setTokenSocials: db.prepare(`UPDATE tokens SET has_socials=?, socials=? WHERE mint=?`),
  digestTop: db.prepare(`SELECT p.name, p.entry_mc, p.peak_mult, p.x_time, p.tier, p.factory, p.has_socials, p.handoffs, p.inflow_sol, p.inflow_wallets, p.entry_age_s, p.buys, p.sells, t.outside_buyers, p.mint FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.entry_ts>=? AND p.entry_ts<? AND COALESCE(p.invalid,0)=0 ORDER BY p.peak_mult DESC LIMIT 10`),
  digestAgg: db.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, SUM(CASE WHEN has_socials=0 THEN 1 ELSE 0 END) nosoc, SUM(CASE WHEN has_socials=0 AND peak_mult>=2 THEN 1 ELSE 0 END) nosoc2x, SUM(CASE WHEN factory=1 THEN 1 ELSE 0 END) fac, SUM(CASE WHEN factory=1 AND peak_mult>=2 THEN 1 ELSE 0 END) fac2x, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_time) xt FROM paper_trades WHERE entry_ts>=? AND entry_ts<?`),
  insMom: db.prepare(`INSERT INTO paper_trades (strategy,mint,name,symbol,entry_ts,entry_mc,entry_price,bundle_pct,bundle_sol,handoffs,tier,factory,has_socials,socials,vol5m_usd,vol1m_usd,buys,sells,age_s,reentry_n,alerted,peak_mc) VALUES ('momentum',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  setStrategy: db.prepare(`UPDATE paper_trades SET strategy=? WHERE id=?`),
  setQuality: db.prepare(`UPDATE paper_trades SET q_score=?, q_wallets=?, q_per10k=?, q_top3=?, q_roundtrip=?, q_retail=?, q_custom=?, q_size_cv=?, q_new_pct=?, q_px_per10k=? WHERE id=?`),
  setCombo: db.prepare(`UPDATE paper_trades SET x_combo=?, x_tp15=?, x_tsl25=?, x_t15s25=?, x_t15s60=?, x_t2s25=?, x_t2s60=? WHERE id=?`),
  setHolders: db.prepare(`UPDATE paper_trades SET top10_entry=?, largest_entry=?, holders_entry=?, dev_hold_entry=? WHERE id=?`),
  setFees: db.prepare(`UPDATE paper_trades SET fee_accrued_entry=?, fee_claims_entry=?, fee_claimed_entry=? WHERE id=?`),
  setCore: db.prepare(`UPDATE paper_trades SET core=?, core_tight=? WHERE id=?`),
  setHit15: db.prepare(`UPDATE paper_trades SET t_hit15_s=? WHERE id=? AND t_hit15_s IS NULL`),
  insClaim: db.prepare(`INSERT INTO creator_claims (creator, ts, sol, venue, sig, mint, ambiguous) VALUES (?,?,?,?,?,?,?)`),
  claimsFor: db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(sol),0) sol, MIN(ts) first, MAX(ts) last, SUM(COALESCE(ambiguous,0)) amb FROM creator_claims WHERE mint=?`),
  latestMintOf: db.prepare(`SELECT mint, create_ts, (SELECT COUNT(*) FROM tokens t2 WHERE t2.creator=t.creator AND t2.create_ts>=?) n FROM tokens t WHERE creator=? AND create_ts<=? ORDER BY create_ts DESC LIMIT 1`),
  upTokenFees: db.prepare(`UPDATE tokens SET creator_fee_sol=?, fee_claims=?, fee_claimed_sol=?, first_claim_ts=? WHERE mint=?`),
  mintsByCreator: db.prepare(`SELECT mint, create_ts FROM tokens WHERE creator=? AND create_ts>=?`),
  setStops: db.prepare(`UPDATE paper_trades SET x_tp15=?, x_tsl25=?, x_t15s25=?, x_t15s60=?, x_t2s25=?, x_t2s60=? WHERE id=?`),
  setPath: db.prepare(`UPDATE paper_trades SET path=? WHERE id=?`),
  setExits2: db.prepare(`UPDATE paper_trades SET x_flow=?, x_t15s40=?, x_t2s40=?, dd_pre15=?, x_flow4=? WHERE id=?`),
  setTight: db.prepare(`UPDATE paper_trades SET tight=? WHERE id=?`),
  setVenue: db.prepare(`UPDATE paper_trades SET venue=? WHERE id=?`),
  insPumpBuyer: db.prepare(`INSERT INTO pump_buyers (trade_id, mint, wallet, ts, sol, mc, lead_s, venue) VALUES (?,?,?,?,?,?,?,?)`),
  prepumpTop: db.prepare(`SELECT b.wallet, COUNT(DISTINCT b.mint) n, SUM(CASE WHEN p.peak_mult>=2 THEN 1 ELSE 0 END) hit2, SUM(CASE WHEN p.peak_mult>=1.5 THEN 1 ELSE 0 END) hit15, AVG(b.lead_s) lead, SUM(b.sol) sol
    FROM (SELECT trade_id, mint, wallet, MIN(ts) ts, MAX(lead_s) lead_s, SUM(sol) sol FROM pump_buyers WHERE ts>=? GROUP BY trade_id, wallet) b JOIN paper_trades p ON p.id=b.trade_id AND COALESCE(p.invalid,0)=0
    GROUP BY b.wallet HAVING n>=? ORDER BY hit2 DESC, n DESC LIMIT ?`),
  insDexPool: db.prepare(`INSERT OR REPLACE INTO dex_pools (pool, venue, mint, sol_side, m0, m1, dec, supply, bin_step, ignore, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)`),
  allDexPools: db.prepare(`SELECT * FROM dex_pools`),
  setChurn: db.prepare(`UPDATE paper_trades SET churn_entry=?, cluster_out_entry=?, cluster_held_pct=COALESCE(cluster_held_pct,?), handoffs=COALESCE(handoffs,?) WHERE id=?`),
  setEntryCounts: db.prepare(`UPDATE paper_trades SET buys_entry=?, sells_entry=?, proven_entry=? WHERE id=?`),
  provenWallets: db.prepare(`SELECT wallet FROM wallet_buys WHERE resolved=1 AND is_cluster=0 AND age_s>=3 AND sol>=? AND entry_mc>0 AND wallet NOT IN (SELECT wallet FROM wallet_buys WHERE ts>=? GROUP BY wallet HAVING COUNT(*)>?) GROUP BY wallet HAVING COUNT(*)>=? AND SUM(CASE WHEN peak_24h>=5*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*)>=?`),
  setNextLevel: db.prepare(`UPDATE paper_trades SET next_level=? WHERE id=?`),
  updMom: db.prepare(`UPDATE paper_trades SET peak_mc=?, peak_mult=?, x_tp=?, x_tsl40=?, x_tsl60=?, x_tsl80=?, x_half60=?, x_twophase=?, x_ladder=?, x_time=?, exit_ts=?, exit_mc=?, exit_price=?, exit_reason=?, pnl_pct=?, closed=?, x_levels=?, x_m1=?, x_m1vol=?, x_volstop=? WHERE id=?`),
  tokenMeta: db.prepare(`SELECT name, symbol, creator, create_ts, bundle_pct, bundle_sol, dev_buy_sol, handoffs, tier, factory, has_socials, socials, cluster_sol_in, cluster_sol_out FROM tokens WHERE mint=?`),
  stratSummary: db.prepare(`SELECT strategy, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, AVG(peak_mult) peak, AVG(x_tp) xtp, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tsl80) x80, AVG(x_half60) xh, AVG(x_twophase) x2p, AVG(x_ladder) xl, AVG(x_levels) xlv, AVG(x_m1) xm1, AVG(x_m1vol) xm1v, AVG(x_volstop) xvs, AVG(x_time) xt, AVG(x_combo) xc, AVG(x_tp15) xtp15, AVG(x_tsl25) x25, AVG(x_t15s25) s1525, AVG(x_t15s60) s1560, AVG(x_t2s25) s225, AVG(x_t2s60) s260, AVG(x_flow) xflow, AVG(x_flow4) xflow4, AVG(x_t15s40) s1540, AVG(x_t2s40) s240, SUM(CASE WHEN peak_mult>=1.5 THEN 1 ELSE 0 END) hit15, AVG(after_peak_mult) ap, SUM(CASE WHEN after_peak_mult>=3 THEN 1 ELSE 0 END) ap3 FROM paper_trades WHERE entry_ts>=? AND entry_ts<? AND COALESCE(invalid,0)=0 GROUP BY strategy`),
  stratSummaryCore: db.prepare(`SELECT 'momentum-core' strategy, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, AVG(peak_mult) peak, AVG(x_tp) xtp, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tsl80) x80, AVG(x_half60) xh, AVG(x_twophase) x2p, AVG(x_ladder) xl, AVG(x_levels) xlv, AVG(x_m1) xm1, AVG(x_m1vol) xm1v, AVG(x_volstop) xvs, AVG(x_time) xt, AVG(x_combo) xc, AVG(x_tp15) xtp15, AVG(x_tsl25) x25, AVG(x_t15s25) s1525, AVG(x_t15s60) s1560, AVG(x_t2s25) s225, AVG(x_t2s60) s260, AVG(x_flow) xflow, AVG(x_flow4) xflow4, AVG(x_t15s40) s1540, AVG(x_t2s40) s240, SUM(CASE WHEN peak_mult>=1.5 THEN 1 ELSE 0 END) hit15, AVG(after_peak_mult) ap, SUM(CASE WHEN after_peak_mult>=3 THEN 1 ELSE 0 END) ap3 FROM paper_trades WHERE strategy='momentum' AND core=1 AND entry_ts>=? AND entry_ts<? AND COALESCE(invalid,0)=0`),
  stratSummaryCoreTight: db.prepare(`SELECT 'momentum-core-tight' strategy, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, AVG(peak_mult) peak, AVG(x_tp) xtp, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tsl80) x80, AVG(x_half60) xh, AVG(x_twophase) x2p, AVG(x_ladder) xl, AVG(x_levels) xlv, AVG(x_m1) xm1, AVG(x_m1vol) xm1v, AVG(x_volstop) xvs, AVG(x_time) xt, AVG(x_combo) xc, AVG(x_tp15) xtp15, AVG(x_tsl25) x25, AVG(x_t15s25) s1525, AVG(x_t15s60) s1560, AVG(x_t2s25) s225, AVG(x_t2s60) s260, AVG(x_flow) xflow, AVG(x_flow4) xflow4, AVG(x_t15s40) s1540, AVG(x_t2s40) s240, SUM(CASE WHEN peak_mult>=1.5 THEN 1 ELSE 0 END) hit15, AVG(after_peak_mult) ap, SUM(CASE WHEN after_peak_mult>=3 THEN 1 ELSE 0 END) ap3 FROM paper_trades WHERE strategy='momentum' AND core_tight=1 AND entry_ts>=? AND entry_ts<? AND COALESCE(invalid,0)=0`),
  stratSummaryTight: db.prepare(`SELECT 'wave2-tight' strategy, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x, AVG(peak_mult) peak, AVG(x_tp) xtp, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tsl80) x80, AVG(x_half60) xh, AVG(x_twophase) x2p, AVG(x_ladder) xl, AVG(x_levels) xlv, AVG(x_m1) xm1, AVG(x_m1vol) xm1v, AVG(x_volstop) xvs, AVG(x_time) xt, AVG(x_combo) xc, AVG(x_tp15) xtp15, AVG(x_tsl25) x25, AVG(x_t15s25) s1525, AVG(x_t15s60) s1560, AVG(x_t2s25) s225, AVG(x_t2s60) s260, AVG(x_flow) xflow, AVG(x_flow4) xflow4, AVG(x_t15s40) s1540, AVG(x_t2s40) s240, SUM(CASE WHEN peak_mult>=1.5 THEN 1 ELSE 0 END) hit15, AVG(after_peak_mult) ap, SUM(CASE WHEN after_peak_mult>=3 THEN 1 ELSE 0 END) ap3 FROM paper_trades WHERE strategy='wave2' AND tight=1 AND entry_ts>=? AND entry_ts<? AND COALESCE(invalid,0)=0`),
  insWB: db.prepare(`INSERT OR IGNORE INTO wallet_buys (wallet,mint,ts,age_s,sol,entry_mc,is_cluster) VALUES (?,?,?,?,?,?,?)`),
  wbCount: db.prepare(`SELECT COUNT(*) FROM wallet_buys WHERE mint=?`).pluck(),
  upPeak: db.prepare(`INSERT INTO token_peaks (mint,create_ts,peak_30m,peak_24h,until) VALUES (?,?,?,?,?) ON CONFLICT(mint) DO UPDATE SET peak_30m=MAX(peak_30m,excluded.peak_30m), peak_24h=MAX(peak_24h,excluded.peak_24h)`),
  resolveWB: db.prepare(`UPDATE wallet_buys SET peak_30m=(SELECT peak_30m FROM token_peaks WHERE token_peaks.mint=wallet_buys.mint), peak_24h=(SELECT peak_24h FROM token_peaks WHERE token_peaks.mint=wallet_buys.mint), resolved=1 WHERE resolved=0 AND mint IN (SELECT mint FROM token_peaks WHERE until<=?)`),
  pruneWB: db.prepare(`DELETE FROM wallet_buys WHERE ts<?`),
  prunePeaks: db.prepare(`DELETE FROM token_peaks WHERE until<?`),
  leaderboard: db.prepare(`SELECT wallet, COUNT(*) n,
      SUM(CASE WHEN peak_24h>=2*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r2,
      SUM(CASE WHEN peak_24h>=3*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r3,
      SUM(CASE WHEN peak_24h>=5*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r5,
      SUM(CASE WHEN peak_24h>=10*entry_mc THEN 1 ELSE 0 END)*1.0/COUNT(*) r10,
      AVG(peak_24h/entry_mc) avgpeak, AVG(entry_mc) avgmc, AVG(sol) avgsol, MAX(ts) last_ts, AVG(age_s) avgage
    FROM wallet_buys WHERE resolved=1 AND is_cluster=0 AND age_s>=? AND entry_mc>0 AND ts>=?
    GROUP BY wallet HAVING n>=? ORDER BY r5 DESC, r10 DESC, n DESC LIMIT ?`),
  walletStats: db.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN peak_24h>=2*entry_mc THEN 1 ELSE 0 END) h2, SUM(CASE WHEN peak_24h>=3*entry_mc THEN 1 ELSE 0 END) h3, SUM(CASE WHEN peak_24h>=5*entry_mc THEN 1 ELSE 0 END) h4, SUM(CASE WHEN peak_24h>=10*entry_mc THEN 1 ELSE 0 END) h10, AVG(peak_24h/entry_mc) avgpeak, AVG(entry_mc) avgmc, MAX(ts) last_ts, SUM(resolved=0) pending FROM wallet_buys WHERE wallet=? AND is_cluster=0 AND entry_mc>0`),
  walletRecent: db.prepare(`SELECT w.mint, t.name, w.ts, w.age_s, w.sol, w.entry_mc, w.peak_24h, w.resolved FROM wallet_buys w LEFT JOIN tokens t ON t.mint=w.mint WHERE w.wallet=? ORDER BY w.ts DESC LIMIT 8`),
  spamWallets: db.prepare(`SELECT wallet FROM wallet_buys WHERE ts>=? GROUP BY wallet HAVING COUNT(*)>?`),
  creatorsTop: db.prepare(`SELECT creator, COUNT(*) n, MAX(peak_mc_usd) best, AVG(peak_mc_usd) avgpeak, SUM(CASE WHEN peak_mc_usd>=100000 THEN 1 ELSE 0 END) over100k, SUM(CASE WHEN graduated=1 THEN 1 ELSE 0 END) grads, MAX(create_ts) last_ts, SUM(factory) fac, AVG(bundle_pct) avgbundle FROM tokens WHERE create_ts>=? GROUP BY creator HAVING n>=? ORDER BY grads DESC, over100k DESC, best DESC LIMIT ?`),
  creatorTokens: db.prepare(`SELECT name, symbol, create_ts, bundle_pct, bundle_sol, peak_mc_usd, graduated, has_socials, mint FROM tokens WHERE creator=? ORDER BY create_ts DESC LIMIT 10`),
  creatorAgg: db.prepare(`SELECT COUNT(*) n, MAX(peak_mc_usd) best, AVG(peak_mc_usd) avgpeak, SUM(CASE WHEN peak_mc_usd>=100000 THEN 1 ELSE 0 END) over100k, SUM(graduated) grads, MIN(create_ts) first_ts, MAX(create_ts) last_ts FROM tokens WHERE creator=?`),
  addWatchCreator: db.prepare(`INSERT OR REPLACE INTO watch_creators (creator,label,added_ts) VALUES (?,?,?)`),
  delWatchCreator: db.prepare(`DELETE FROM watch_creators WHERE creator=?`),
  listWatchCreators: db.prepare(`SELECT creator,label FROM watch_creators ORDER BY added_ts`),
  setCreatorFunder: db.prepare(`UPDATE tokens SET creator_funder=?, creator_age_s=?, creator_funded_sol=? WHERE mint=?`),
  runners: db.prepare(`SELECT p.mint, p.peak_24h, p.peak_30m, p.create_ts, t.name, t.symbol, t.bundle_pct, t.bundle_sol, t.bundle_wallets, t.dev_buy_sol, t.has_socials, t.factory, t.creator, t.handoffs, t.graduated, t.cluster_sol_in, t.cluster_sol_out, t.outside_buyers FROM token_peaks p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.peak_24h>=? AND p.create_ts>=? ORDER BY p.peak_24h DESC LIMIT ?`),
  lifeFor: db.prepare(`SELECT cp, mc, vol5m_usd, buys5m, sells5m, buyers_total, alive, top10_pct FROM token_life WHERE mint=? ORDER BY cp`),
  papersFor: db.prepare(`SELECT strategy, trigger_kind, entry_ts, entry_mc, peak_mult, x_half60, x_tsl40, x_levels, after_peak_mult FROM paper_trades WHERE mint=? ORDER BY entry_ts`),
  insLife: db.prepare(`INSERT OR REPLACE INTO token_life (mint,cp,ts,mc,vol5m_usd,buys5m,sells5m,buyers5m,buyers_total,graduated,top10_pct,holders,alive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  setLifeHolders: db.prepare(`UPDATE token_life SET top10_pct=?, holders=? WHERE mint=? AND cp=?`),
  insBigBuy: db.prepare(`INSERT INTO big_buys (mint,wallet,ts,age_s,sol,mc,balance_sol,venue) VALUES (?,?,?,?,?,?,?,?)`),
  addWatch: db.prepare(`INSERT OR REPLACE INTO watch_wallets (wallet,label,added_ts,source) VALUES (?,?,?,?)`),
  delWatch: db.prepare(`DELETE FROM watch_wallets WHERE wallet=?`),
  listWatch: db.prepare(`SELECT wallet,label,source FROM watch_wallets ORDER BY added_ts`),
  openPapers: db.prepare(`SELECT COUNT(*) FROM paper_trades WHERE closed=0`).pluck(),
  closedSince: db.prepare(`SELECT COUNT(*) c, AVG(pnl_pct) p FROM paper_trades WHERE closed=1 AND exit_ts>=?`),
};
