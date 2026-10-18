// The executor's own book: every order (built / simulated / sent / confirmed) and every position, in its own SQLite file.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config.mjs";

mkdirSync(dirname(CFG.DB_PATH), { recursive: true });
export const db = new Database(CFG.DB_PATH);
db.pragma("journal_mode = WAL"); db.pragma("synchronous = NORMAL");
db.exec(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, mode TEXT, side TEXT, paper_id INTEGER, mint TEXT, name TEXT, strategy TEXT, rule TEXT,
  venue TEXT, ix_kind TEXT, stake_lamports INTEGER, amount_tokens INTEGER, slippage REAL, quote_out INTEGER, min_out INTEGER, tip_lamports INTEGER, cu_price INTEGER,
  sim_ok INTEGER, sim_err TEXT, sim_units INTEGER, sim_ms INTEGER, sig TEXT, via TEXT, send_ms INTEGER, status TEXT, confirm_slot INTEGER,
  fill_sol INTEGER, fill_tokens INTEGER, fee INTEGER, from_trigger_ms INTEGER, skip_reason TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS positions (
  paper_id INTEGER PRIMARY KEY, mint TEXT, name TEXT, strategy TEXT, mode TEXT, opened_ts INTEGER, tokens INTEGER, cost_lamports INTEGER, buy_order INTEGER,
  sell_order INTEGER, closed_ts INTEGER, proceeds_lamports INTEGER, pnl_lamports INTEGER, exit_rule TEXT, paper_exit_mult REAL, paper_entry_price REAL, status TEXT, venue TEXT, ix_kind TEXT);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, kind TEXT, text TEXT);
CREATE INDEX IF NOT EXISTS orders_ts ON orders(ts); CREATE INDEX IF NOT EXISTS positions_status ON positions(status);`);

const now = () => Math.floor(Date.now() / 1000);
const insOrder = db.prepare(`INSERT INTO orders (ts, mode, side, paper_id, mint, name, strategy, rule, venue, ix_kind, stake_lamports, amount_tokens, slippage, quote_out, min_out, tip_lamports, cu_price, status, from_trigger_ms, skip_reason, detail)
  VALUES (@ts, @mode, @side, @paper_id, @mint, @name, @strategy, @rule, @venue, @ix_kind, @stake_lamports, @amount_tokens, @slippage, @quote_out, @min_out, @tip_lamports, @cu_price, @status, @from_trigger_ms, @skip_reason, @detail)`);
export function newOrder(o) {
  const row = { ts: now(), mode: CFG.MODE, side: null, paper_id: null, mint: null, name: null, strategy: null, rule: null, venue: null, ix_kind: null, stake_lamports: null, amount_tokens: null, slippage: null, quote_out: null, min_out: null,
    tip_lamports: null, cu_price: null, status: "built", from_trigger_ms: null, skip_reason: null, detail: null, ...o };
  for (const k of ["stake_lamports", "amount_tokens", "quote_out", "min_out", "tip_lamports"]) if (row[k] != null) row[k] = Number(row[k]);
  if (row.detail && typeof row.detail !== "string") row.detail = JSON.stringify(row.detail);
  return Number(insOrder.run(row).lastInsertRowid);
}
export function updOrder(id, patch) {
  const p = { ...patch }; if (p.detail && typeof p.detail !== "string") p.detail = JSON.stringify(p.detail);
  for (const k of ["fill_sol", "fill_tokens", "fee", "confirm_slot", "sim_units", "sim_ms", "send_ms", "quote_out", "min_out"]) if (p[k] != null) p[k] = Number(p[k]);
  const keys = Object.keys(p); if (!keys.length) return;
  db.prepare(`UPDATE orders SET ${keys.map((k) => `${k}=@${k}`).join(", ")} WHERE id=@id`).run({ ...p, id });
}
export const openPosition = db.prepare(`INSERT OR REPLACE INTO positions (paper_id, mint, name, strategy, mode, opened_ts, tokens, cost_lamports, buy_order, status, venue, ix_kind, paper_entry_price)
  VALUES (@paper_id, @mint, @name, @strategy, @mode, @opened_ts, @tokens, @cost_lamports, @buy_order, 'open', @venue, @ix_kind, @paper_entry_price)`);
export const closePosition = db.prepare(`UPDATE positions SET sell_order=@sell_order, closed_ts=@closed_ts, proceeds_lamports=@proceeds_lamports, pnl_lamports=@pnl_lamports, exit_rule=@exit_rule, paper_exit_mult=@paper_exit_mult, status=@status WHERE paper_id=@paper_id`);
export const openPositions = () => db.prepare(`SELECT * FROM positions WHERE status='open' ORDER BY opened_ts`).all();
export const positionOf = (paperId) => db.prepare(`SELECT * FROM positions WHERE paper_id=?`).get(paperId);
export const hasPosition = (mint) => !!db.prepare(`SELECT 1 FROM positions WHERE mint=? AND status='open' LIMIT 1`).get(mint);
export function dayNet(mode = CFG.MODE) { // today's realised result in lamports (UTC day), closed positions only
  const start = Math.floor(Date.now() / 86400000) * 86400;
  return db.prepare(`SELECT COALESCE(SUM(pnl_lamports),0) n, COUNT(*) c FROM positions WHERE status='closed' AND mode=? AND closed_ts>=?`).get(mode, start);
}
export function recentOrders(n = 20) { return db.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT ?`).all(n); }
export function stats() {
  const o = db.prepare(`SELECT side, status, COUNT(*) n FROM orders WHERE ts > ? GROUP BY side, status`).all(now() - 86400);
  const p = db.prepare(`SELECT status, COUNT(*) n, COALESCE(SUM(pnl_lamports),0) pnl FROM positions WHERE opened_ts > ? GROUP BY status`).all(now() - 86400);
  return { orders24h: o, positions24h: p };
}
export const log = (kind, text) => { try { db.prepare(`INSERT INTO events (ts, kind, text) VALUES (?,?,?)`).run(now(), kind, String(text).slice(0, 2000)); } catch {} };
