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
export const q = {
  insToken: db.prepare(`INSERT OR IGNORE INTO tokens (mint,name,symbol,uri,creator,bonding_curve,create_slot,create_ts,create_sig) VALUES (?,?,?,?,?,?,?,?,?)`),
  finToken: db.prepare(`UPDATE tokens SET bundle_sol=?, bundle_tokens=?, bundle_pct=?, bundle_wallets=?, dev_buy_sol=?, tier=?, finalized=1, entry_mc_usd=?, peak_mc_usd=?, last_mc_usd=? WHERE mint=?`),
  insCluster: db.prepare(`INSERT OR IGNORE INTO cluster_wallets (mint,wallet,role,tokens,sol_in,first_slot) VALUES (?,?,?,?,?,?)`),
  insTrade: db.prepare(`INSERT INTO trades (mint,sig,slot,ts,wallet,is_buy,sol,tokens,price_sol) VALUES (?,?,?,?,?,?,?,?,?)`),
  bump: db.prepare(`INSERT INTO stats (k,v) VALUES (?,1) ON CONFLICT(k) DO UPDATE SET v=v+1`),
  stat: db.prepare(`SELECT v FROM stats WHERE k=?`).pluck(),
  countSince: db.prepare(`SELECT COUNT(*) FROM tokens WHERE create_ts>=?`).pluck(),
  countTierSince: db.prepare(`SELECT COUNT(*) FROM tokens WHERE tier>=? AND create_ts>=?`).pluck(),
};
