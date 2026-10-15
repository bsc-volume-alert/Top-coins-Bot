import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { C } from "./config.js";

mkdirSync(dirname(C.DB_PATH), { recursive: true });
export const db = new Database(C.DB_PATH);
db.pragma("journal_mode = WAL"); db.pragma("synchronous = NORMAL");
export const X = ["tp", "tsl40", "tsl60", "tsl80", "half60", "twophase", "ladder", "levels", "m1", "m1vol", "volstop", "combo", "time"]; // the 13 exits

db.exec(`
CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY, venue TEXT, name TEXT, symbol TEXT, creator TEXT, create_ts INTEGER, create_block INTEGER, meta TEXT,
  quote TEXT, quote_sym TEXT, tax_bps INTEGER, dex_thresh REAL, migrator INTEGER,
  bundle_pct REAL, bundle_usd REAL, bundle_wallets INTEGER, dev_buy_usd REAL, snipers INTEGER,
  creator_prior INTEGER, creator_prior_grads INTEGER, creator_best_mc REAL,
  buyers_total INTEGER, peak_mc REAL, graduated INTEGER DEFAULT 0, grad_ts INTEGER, grad_mc REAL, pool TEXT, pool_kind TEXT, last_ts INTEGER
);
CREATE INDEX IF NOT EXISTS tok_creator ON tokens(creator);
CREATE INDEX IF NOT EXISTS tok_ts ON tokens(create_ts);
CREATE TABLE IF NOT EXISTS paper_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT, strategy TEXT, label TEXT, token TEXT, name TEXT, symbol TEXT, venue TEXT, quote TEXT,
  entry_ts INTEGER, entry_price REAL, entry_mc REAL, entry_age_s INTEGER, hour_utc INTEGER, graduated_entry INTEGER,
  vol5m_usd REAL, vol1m_usd REAL, buys_entry INTEGER, sells_entry INTEGER, buyers_entry INTEGER, bs_ratio_entry REAL, new60_entry INTEGER, new5_entry INTEGER,
  bundle_pct REAL, bundle_usd REAL, bundle_wallets INTEGER, snipers INTEGER, dev_buy_usd REAL, tax_bps INTEGER,
  creator_prior INTEGER, creator_grads INTEGER, proven_entry INTEGER,
  q_score INTEGER, q_wallets INTEGER, q_per10k REAL, q_top3 REAL, q_roundtrip INTEGER, q_router REAL, q_size_cv REAL, q_new_pct REAL, q_px_per10k REAL,
  feed_final_pct REAL, feed_live_pct REAL, feed_polling INTEGER, note TEXT,
  peak_mult REAL DEFAULT 1, peak_mc REAL, last_price REAL, last_mc REAL, last_ts INTEGER,
  ${X.map((k) => `x_${k} REAL`).join(", ")},
  exit_ts INTEGER, exit_price REAL, exit_mc REAL, exit_reason TEXT, closed INTEGER DEFAULT 0, alerted INTEGER, msg_id INTEGER, invalid INTEGER DEFAULT 0,
  mc_5m REAL, mc_15m REAL, buyers_5m INTEGER, after_peak_mult REAL
);
CREATE INDEX IF NOT EXISTS pt_entry ON paper_trades(entry_ts);
CREATE INDEX IF NOT EXISTS pt_open ON paper_trades(closed);
CREATE INDEX IF NOT EXISTS pt_token ON paper_trades(token);
CREATE TABLE IF NOT EXISTS token_life (
  token TEXT, cp INTEGER, ts INTEGER, mc REAL, vol5m_usd REAL, buys5m INTEGER, sells5m INTEGER, buyers5m INTEGER, buyers_total INTEGER, graduated INTEGER, alive INTEGER,
  PRIMARY KEY (token, cp)
);
CREATE TABLE IF NOT EXISTS wallet_buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, token TEXT, ts INTEGER, age_s INTEGER, usd REAL, entry_mc REAL, is_bundle INTEGER,
  peak_30m REAL, peak_24h REAL, resolved INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS wb_wallet ON wallet_buys(wallet);
CREATE INDEX IF NOT EXISTS wb_open ON wallet_buys(resolved, ts);
CREATE TABLE IF NOT EXISTS big_buys (token TEXT, wallet TEXT, ts INTEGER, age_s INTEGER, usd REAL, mc REAL, venue TEXT);
CREATE TABLE IF NOT EXISTS watch_wallets (wallet TEXT PRIMARY KEY, label TEXT, added_ts INTEGER);
CREATE TABLE IF NOT EXISTS watch_creators (creator TEXT PRIMARY KEY, label TEXT, added_ts INTEGER);
CREATE TABLE IF NOT EXISTS feed_health (ts INTEGER, from_block INTEGER, to_block INTEGER, events INTEGER, final_pct REAL, live_pct REAL);
`);

export const q = {
  upsertToken: db.prepare(`INSERT INTO tokens (token, venue, name, symbol, creator, create_ts, create_block, meta) VALUES (@token,@venue,@name,@symbol,@creator,@create_ts,@create_block,@meta)
    ON CONFLICT(token) DO UPDATE SET name=excluded.name, symbol=excluded.symbol, creator=excluded.creator, create_ts=excluded.create_ts, create_block=excluded.create_block, meta=excluded.meta`),
  tokenSet: (col) => db.prepare(`UPDATE tokens SET ${col}=? WHERE token=?`),
  getToken: db.prepare(`SELECT * FROM tokens WHERE token=?`),
  creatorHist: db.prepare(`SELECT COUNT(*) n, SUM(graduated) grads, MAX(peak_mc) best FROM tokens WHERE creator=? AND token<>? AND create_ts<?`),
  insTrade: db.prepare(`INSERT INTO paper_trades (strategy,label,token,name,symbol,venue,quote,entry_ts,entry_price,entry_mc,entry_age_s,hour_utc,graduated_entry,
    vol5m_usd,vol1m_usd,buys_entry,sells_entry,buyers_entry,bs_ratio_entry,new60_entry,new5_entry,bundle_pct,bundle_usd,bundle_wallets,snipers,dev_buy_usd,tax_bps,
    creator_prior,creator_grads,proven_entry,q_score,q_wallets,q_per10k,q_top3,q_roundtrip,q_router,q_size_cv,q_new_pct,q_px_per10k,feed_final_pct,feed_live_pct,feed_polling,note,
    peak_mc,last_price,last_mc,last_ts,alerted)
    VALUES (@strategy,@label,@token,@name,@symbol,@venue,@quote,@entry_ts,@entry_price,@entry_mc,@entry_age_s,@hour_utc,@graduated_entry,
    @vol5m_usd,@vol1m_usd,@buys_entry,@sells_entry,@buyers_entry,@bs_ratio_entry,@new60_entry,@new5_entry,@bundle_pct,@bundle_usd,@bundle_wallets,@snipers,@dev_buy_usd,@tax_bps,
    @creator_prior,@creator_grads,@proven_entry,@q_score,@q_wallets,@q_per10k,@q_top3,@q_roundtrip,@q_router,@q_size_cv,@q_new_pct,@q_px_per10k,@feed_final_pct,@feed_live_pct,@feed_polling,@note,
    @entry_mc,@entry_price,@entry_mc,@entry_ts,@alerted)`),
  updTrade: db.prepare(`UPDATE paper_trades SET peak_mult=?, peak_mc=?, last_price=?, last_mc=?, last_ts=?, ${X.filter((k) => k !== "time").map((k) => `x_${k}=?`).join(", ")} WHERE id=?`),
  closeTrade: db.prepare(`UPDATE paper_trades SET peak_mult=?, peak_mc=?, last_price=?, last_mc=?, last_ts=?, ${X.map((k) => `x_${k}=?`).join(", ")}, exit_ts=?, exit_price=?, exit_mc=?, exit_reason=?, closed=1 WHERE id=? AND closed=0`),
  setMsg: db.prepare(`UPDATE paper_trades SET msg_id=? WHERE id=?`),
  setCard: db.prepare(`UPDATE paper_trades SET mc_5m=COALESCE(mc_5m, ?), mc_15m=COALESCE(mc_15m, ?), buyers_5m=COALESCE(buyers_5m, ?) WHERE id=?`),
  setRouter: db.prepare(`UPDATE paper_trades SET q_router=? WHERE id=?`),
  openTrades: db.prepare(`SELECT * FROM paper_trades WHERE closed=0 AND invalid=0`),
  insLife: db.prepare(`INSERT OR IGNORE INTO token_life VALUES (?,?,?,?,?,?,?,?,?,?,?)`),
  insWalletBuy: db.prepare(`INSERT INTO wallet_buys (wallet, token, ts, age_s, usd, entry_mc, is_bundle, peak_30m, peak_24h) VALUES (?,?,?,?,?,?,?,?,?)`),
  updWalletBuy: db.prepare(`UPDATE wallet_buys SET peak_30m=MAX(COALESCE(peak_30m,0),?), peak_24h=MAX(COALESCE(peak_24h,0),?) WHERE id=?`),
  resolveWalletBuys: db.prepare(`UPDATE wallet_buys SET resolved=1 WHERE resolved=0 AND ts<?`),
  insBigBuy: db.prepare(`INSERT INTO big_buys VALUES (?,?,?,?,?,?,?)`),
  insHealth: db.prepare(`INSERT INTO feed_health VALUES (?,?,?,?,?,?)`),
};
