// Paper scoring of watched-wallet buys. Entry = the trader's own fill (USD per token from the decoded transaction). Then on every
// price tick: the entry-delay marks (price ~5 / 30 / 120 s after the buy — what a copier would have paid), the running peak, and
// five exits scored in parallel: h5 (sell at 5 min), tsl40 (40% below the running peak), t15s40 (1.5x or −40%), copy (sell when the
// trader sells, at their price), time (6 h). Raw multiples are stored; real costs are applied at display time (LESSONS.md pool model).
import { CFG } from "./config.mjs";
import { db, q, nowS } from "./db.mjs";
import { onPrices, lastPx, wantPrice } from "./price.mjs";
export const sc = { ticks: 0, opened: 0, closed: 0, noprice: 0 };
/** LESSONS.md pool cost model: x/1.02 × 0.967 − 1 − 0.006 − 0.02; stops (x ≤ 0.62) −0.05 more. Returns net return (e.g. −0.12). Prints above 15x capped. */
export function realCost(x) { if (x == null) return null; const m = Math.min(x, 15); let r = (m / 1.02) * 0.967 - 1 - 0.006 - 0.02; if (m <= 0.62) r -= 0.05; return r; }
const open = new Map(); // id -> row (live copy of the open trades)
for (const r of q.openTrades.all()) { open.set(r.id, r); wantPrice(r.mint, CFG.MAX_HOLD_S + 600); }
export function openTrade({ wallet, handle, mint, symbol, sig, ts, px, usd, mc }) {
  if (!(px > 0)) return null;
  const r = q.insTrade.run(wallet, handle || null, mint, symbol || null, sig, ts, px, usd, mc ?? null, px, ts);
  const row = { id: r.lastInsertRowid, wallet, handle, mint, symbol, sig, entry_ts: ts, entry_px: px, entry_usd: usd, entry_mc: mc, peak: 1, last_px: px, last_ts: ts, px5: null, px30: null, px120: null, px5_at: null, px30_at: null, px120_at: null, x_h5: null, x_tsl40: null, x_t15s40: null, x_copy: null, x_time: null, closed: 0, exit_reason: null };
  open.set(row.id, row); wantPrice(mint, CFG.MAX_HOLD_S + 600); sc.opened++;
  return row;
}
export const openOf = (wallet, mint) => [...open.values()].filter((r) => r.wallet === wallet && r.mint === mint);
export function theirSell(row, ts, px, usd) {
  if (row.their_sell_ts) return; row.their_sell_ts = ts; row.their_sell_px = px; row.their_sell_usd = usd;
  try { q.setTheirSell.run(ts, px, usd, row.id); } catch {}
  if (row.x_copy == null && px > 0) { row.x_copy = px / row.entry_px; save(row); }
}
function save(row) {
  const done = row.x_h5 != null && row.x_tsl40 != null && row.x_t15s40 != null && row.x_copy != null && row.x_time != null;
  if (done && !row.closed) { row.closed = 1; row.exit_reason ||= "all exits"; open.delete(row.id); sc.closed++; }
  q.updTrade.run(row.px5, row.px30, row.px120, row.px5_at, row.px30_at, row.px120_at, row.peak, row.last_px, row.last_ts, row.x_h5, row.x_tsl40, row.x_t15s40, row.x_copy, row.x_time, row.closed, row.exit_reason, row.id);
}
function step(row, px, ts) {
  const mult = px / row.entry_px, since = ts - row.entry_ts; let ch = false;
  if (mult > row.peak) { row.peak = mult; ch = true; }
  row.last_px = px; row.last_ts = ts;
  for (const [k, s] of [["px5", 5], ["px30", 30], ["px120", 120]]) if (row[k] == null && since >= s) { row[k] = px; row[k + "_at"] = since; ch = true; }
  if (row.x_h5 == null && since >= 300) { row.x_h5 = mult; ch = true; }
  if (row.x_tsl40 == null && row.peak >= 1 && mult <= row.peak * 0.6) { row.x_tsl40 = mult; ch = true; }
  if (row.x_t15s40 == null) { if (mult >= 1.5) { row.x_t15s40 = 1.5; ch = true; } else if (mult <= 0.6) { row.x_t15s40 = mult; ch = true; } }
  if (since >= CFG.MAX_HOLD_S) { for (const k of ["x_h5", "x_tsl40", "x_t15s40", "x_copy", "x_time"]) if (row[k] == null) row[k] = mult; row.exit_reason = "time"; ch = true; }
  if (ch) save(row); else if (sc.ticks % 30 === 0) q.updTrade.run(row.px5, row.px30, row.px120, row.px5_at, row.px30_at, row.px120_at, row.peak, row.last_px, row.last_ts, row.x_h5, row.x_tsl40, row.x_t15s40, row.x_copy, row.x_time, row.closed, row.exit_reason, row.id);
}
onPrices((got, ts) => { sc.ticks++; const tx = db.transaction(() => { for (const row of [...open.values()]) { const p = got[row.mint]; if (p > 0) step(row, p, ts); } }); tx(); });
// sweeper: a trade past its hold with no price for 15 min is closed at its last known price (exit_reason noprice)
setInterval(() => {
  const now = nowS();
  for (const row of [...open.values()]) {
    if (now - row.entry_ts < CFG.MAX_HOLD_S + 900) { if (now - (row.last_ts || 0) > 600) wantPrice(row.mint, 3600); continue; }
    const mult = (row.last_px || row.entry_px) / row.entry_px;
    for (const k of ["x_h5", "x_tsl40", "x_t15s40", "x_copy", "x_time"]) if (row[k] == null) row[k] = mult;
    row.exit_reason = "noprice"; sc.noprice++; save(row);
  }
}, 300_000).unref();
export const openCount = () => open.size;
