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
// v0.2.0: two books side by side (runner + hold-5) — a position is (paper trade, exit). Existing rows were all hold-5.
try { db.exec(`ALTER TABLE orders ADD COLUMN exit TEXT`); } catch {}
if (!db.prepare(`PRAGMA table_info(positions)`).all().some((c) => c.name === "exit")) {
  db.exec(`BEGIN; ALTER TABLE positions RENAME TO positions_v1;
    CREATE TABLE positions (paper_id INTEGER, exit TEXT NOT NULL DEFAULT 'h5', mint TEXT, name TEXT, strategy TEXT, mode TEXT, opened_ts INTEGER, tokens INTEGER, cost_lamports INTEGER, buy_order INTEGER,
      sell_order INTEGER, closed_ts INTEGER, proceeds_lamports INTEGER, pnl_lamports INTEGER, exit_rule TEXT, paper_exit_mult REAL, paper_entry_price REAL, status TEXT, venue TEXT, ix_kind TEXT, PRIMARY KEY (paper_id, exit));
    INSERT INTO positions (paper_id, exit, mint, name, strategy, mode, opened_ts, tokens, cost_lamports, buy_order, sell_order, closed_ts, proceeds_lamports, pnl_lamports, exit_rule, paper_exit_mult, paper_entry_price, status, venue, ix_kind)
      SELECT paper_id, 'h5', mint, name, strategy, mode, opened_ts, tokens, cost_lamports, buy_order, sell_order, closed_ts, proceeds_lamports, pnl_lamports, exit_rule, paper_exit_mult, paper_entry_price, status, venue, ix_kind FROM positions_v1;
    UPDATE orders SET exit='h5' WHERE exit IS NULL AND paper_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS positions_status ON positions(status); COMMIT;`);
}

const now = () => Math.floor(Date.now() / 1000);
const insOrder = db.prepare(`INSERT INTO orders (ts, mode, side, paper_id, exit, mint, name, strategy, rule, venue, ix_kind, stake_lamports, amount_tokens, slippage, quote_out, min_out, tip_lamports, cu_price, status, from_trigger_ms, skip_reason, detail)
  VALUES (@ts, @mode, @side, @paper_id, @exit, @mint, @name, @strategy, @rule, @venue, @ix_kind, @stake_lamports, @amount_tokens, @slippage, @quote_out, @min_out, @tip_lamports, @cu_price, @status, @from_trigger_ms, @skip_reason, @detail)`);
export function newOrder(o) {
  const row = { ts: now(), mode: CFG.MODE, side: null, paper_id: null, exit: null, mint: null, name: null, strategy: null, rule: null, venue: null, ix_kind: null, stake_lamports: null, amount_tokens: null, slippage: null, quote_out: null, min_out: null,
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
export const openPosition = db.prepare(`INSERT OR REPLACE INTO positions (paper_id, exit, mint, name, strategy, mode, opened_ts, tokens, cost_lamports, buy_order, status, venue, ix_kind, paper_entry_price)
  VALUES (@paper_id, @exit, @mint, @name, @strategy, @mode, @opened_ts, @tokens, @cost_lamports, @buy_order, 'open', @venue, @ix_kind, @paper_entry_price)`);
export const closePosition = db.prepare(`UPDATE positions SET sell_order=@sell_order, closed_ts=@closed_ts, proceeds_lamports=@proceeds_lamports, pnl_lamports=@pnl_lamports, exit_rule=@exit_rule, paper_exit_mult=@paper_exit_mult, status=@status WHERE paper_id=@paper_id AND exit=@exit`);
export const openPositions = (exit = null) => (exit ? db.prepare(`SELECT * FROM positions WHERE status='open' AND exit=? ORDER BY opened_ts`).all(exit) : db.prepare(`SELECT * FROM positions WHERE status='open' ORDER BY opened_ts`).all());
export const positionOf = (paperId, exit) => db.prepare(`SELECT * FROM positions WHERE paper_id=? AND exit=?`).get(paperId, exit);
export const positionsOf = (paperId) => db.prepare(`SELECT * FROM positions WHERE paper_id=?`).all(paperId);
export const hasPosition = (mint, exit) => !!db.prepare(`SELECT 1 FROM positions WHERE mint=? AND exit=? AND status='open' LIMIT 1`).get(mint, exit);
const exitSql = (exit) => (exit ? ` AND exit='${exit === "flow4" ? "flow4" : "h5"}'` : "");
/** start of today in the owner's time zone (Europe/London), as epoch seconds — v0.1.3: the day used to roll over at midnight UTC, 01:00 UK in summer */
export function londonDayStart() {
  const now = new Date(); const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now).map((x) => [x.type, x.value]));
  return Math.floor(now / 1000) - ((Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second));
}
export function dayNet(mode = CFG.MODE, exit = null) { // today's realised result in lamports (UK day), closed positions only
  return db.prepare(`SELECT COALESCE(SUM(pnl_lamports),0) n, COUNT(*) c FROM positions WHERE status='closed' AND mode=? AND closed_ts>=?${exitSql(exit)}`).get(mode, londonDayStart());
}
export function net24(mode = CFG.MODE, exit = null) { // last 24 hours, closed positions only
  return db.prepare(`SELECT COALESCE(SUM(pnl_lamports),0) n, COUNT(*) c FROM positions WHERE status='closed' AND mode=? AND closed_ts>=?${exitSql(exit)}`).get(mode, Math.floor(Date.now() / 1000) - 86400);
}
export const pendingBuys = () => db.prepare(`SELECT * FROM orders WHERE side='buy' AND mode='live' AND status IN ('sent','pending') ORDER BY id`).all();
export const lastSellSig = (paperId, exit) => db.prepare(`SELECT id, sig FROM orders WHERE side='sell' AND paper_id=? AND (exit=? OR exit IS NULL) AND sig IS NOT NULL ORDER BY id DESC LIMIT 1`).get(paperId, exit);
/** last closed positions with their buy / sell orders, for the website's wallet box */
export function recentClosed(n = 10, exit = null) {
  return db.prepare(`SELECT p.*, b.fill_tokens b_tokens, b.stake_lamports b_stake, b.from_trigger_ms b_ms, b.sig b_sig, b.detail b_detail, s.sig s_sig, s.rule s_rule FROM positions p
    LEFT JOIN orders b ON b.id=p.buy_order LEFT JOIN orders s ON s.id=p.sell_order WHERE p.status='closed'${exitSql(exit).replace(" AND exit=", " AND p.exit=")} ORDER BY p.closed_ts DESC LIMIT ?`).all(n)
    .map((r) => { let d = {}; try { d = JSON.parse(r.b_detail || "{}"); } catch {} const livePx = (r.b_stake || r.cost_lamports) > 0 && r.b_tokens > 0 ? ((r.b_stake || r.cost_lamports) / 1e9) / (r.b_tokens / 1e6) : null; // entry price from the SOL that went into the pool, not the tip
      return { id: r.paper_id, exit: r.exit, name: r.name, mint: r.mint, mode: r.mode, opened_ts: r.opened_ts, closed_ts: r.closed_ts, cost: r.cost_lamports / 1e9, proceeds: (r.proceeds_lamports || 0) / 1e9, pnl: (r.pnl_lamports || 0) / 1e9,
        liveX: r.cost_lamports > 0 ? (r.proceeds_lamports || 0) / r.cost_lamports : null, paperX: r.paper_exit_mult, rule: r.exit_rule, ms: r.b_ms, buySig: r.b_sig, sellSig: r.s_sig, gap: livePx && r.paper_entry_price ? livePx / r.paper_entry_price - 1 : null }; });
}
export function skipSummary(sinceTs) {
  const rows = db.prepare(`SELECT CASE WHEN status='sim-failed' THEN 'sim failed' WHEN status='error' THEN 'error' ELSE skip_reason END r, COUNT(*) n FROM orders WHERE side='buy' AND status IN ('skipped','error','sim-failed') AND ts >= ? GROUP BY 1 ORDER BY n DESC`).all(sinceTs);
  const out = {}; for (const x of rows) { const k = String(x.r || "other").replace(/^paper skip: /, "").replace(/\d+ wallets/, "crowded").replace(/bundled \d+%/, "bundled").replace(/balance .*/, "balance").replace(/\d+ positions open.*/, "cap").replace(/trigger \d+ ms old/, "late").replace(/feed \d+ ms.*/, "feed lag").replace(/curve complete, pool not there.*/, "migration pending").replace(/curve complete, PumpSwap pool not found.*/, "migration pending").replace(/not SOL-paired.*/, "not SOL-paired"); out[k] = (out[k] || 0) + x.n; } return out;
}
const BOOK_FROM = Number(process.env.EXEC_BOOK_FROM || 1792351500); // 18 Oct 19:25 UTC — the website's fresh start (PumpSwap prices corrected); earlier shadow trades stay in the database
export const totals = (mode, exit = null) => db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(pnl_lamports),0) pnl, SUM(CASE WHEN pnl_lamports>0 THEN 1 ELSE 0 END) w FROM positions WHERE status='closed' AND mode=? AND opened_ts>=?${exitSql(exit)}`).get(mode, BOOK_FROM);
export function recentOrders(n = 20) { return db.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT ?`).all(n); }
export function stats() {
  const o = db.prepare(`SELECT side, status, COUNT(*) n FROM orders WHERE ts > ? GROUP BY side, status`).all(now() - 86400);
  const p = db.prepare(`SELECT status, COUNT(*) n, COALESCE(SUM(pnl_lamports),0) pnl FROM positions WHERE opened_ts > ? GROUP BY status`).all(now() - 86400);
  return { orders24h: o, positions24h: p };
}
export const log = (kind, text) => { try { db.prepare(`INSERT INTO events (ts, kind, text) VALUES (?,?,?)`).run(now(), kind, String(text).slice(0, 2000)); } catch {} };
