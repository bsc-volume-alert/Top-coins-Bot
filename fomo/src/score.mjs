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
  if (row.x_tsl40 == null && row.peak >= 1 && mult <= row.peak * 0.6) { row.x_tsl40 = mult; row.x_tsl40_at = ts; try { q.setTslAt.run(ts, row.id); } catch {} ch = true; }
  if (row.x_t15s40 == null) { if (mult >= 1.5) { row.x_t15s40 = 1.5; ch = true; } else if (mult <= 0.6) { row.x_t15s40 = mult; ch = true; } }
  if (row.x_t2s40 == null) { if (mult >= 2) { row.x_t2s40 = 2; ch = true; } else if (mult <= 0.6) { row.x_t2s40 = mult; ch = true; } if (row.x_t2s40 != null) { try { q.setX2.run(row.x_t2s40, row.id); } catch {} } }
  if (since >= CFG.MAX_HOLD_S) { for (const k of ["x_h5", "x_tsl40", "x_t15s40", "x_copy", "x_time"]) if (row[k] == null) row[k] = mult; if (row.x_t2s40 == null) { row.x_t2s40 = mult; try { q.setX2.run(mult, row.id); } catch {} } if (!row.x_tsl40_at) { row.x_tsl40_at = ts; try { q.setTslAt.run(ts, row.id); } catch {} } row.exit_reason = "time"; ch = true; }
  if (isBook(row.wallet)) ff2Watch(row, mult, ts);
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

// --- FF book: every coin that enters the 5-min / 15-min top 5 is logged once with its price, then marked at +15 min / +1 h / +6 h (record only, paper)
import { lastPx as _lp } from "./price.mjs";
export const ff = { logged: 0, marked: 0 };
export function logHot(win, rows, ts) {
  rows.slice(0, 5).forEach((r, i) => { const p = _lp(r.mint)?.usd || null; const c = q.coin.get(r.mint); if (!(p > 0)) { wantPrice(r.mint, 7200); return; } const bucket = Math.floor(ts / 300) * 300; const res = q.insFF.run(r.mint, win, bucket, i + 1, r.buyers, r.buy_usd, (r.buy_usd || 0) - (r.sell_usd || 0), c?.mc_usd ?? null, p); if (res.changes) { ff.logged++; wantPrice(r.mint, 7200); } });
}
setInterval(() => { try { const now = nowS(); for (const r of q.ffOpen.all(now - 8 * 3600)) { const p = _lp(r.mint)?.usd; if (!(p > 0)) continue; const age = now - r.ts, m = p / r.px; q.updFF.run(age >= 900 ? p : null, age >= 3600 ? p : null, age >= 21600 ? p : null, m, m, m >= 2 ? 2 : m <= 0.6 ? m : null, m >= 1.5 ? 1.5 : m <= 0.6 ? m : null, r.id); ff.marked++; } } catch (e) { console.error("[ff]", e.message); } }, 30_000).unref();

// --- FF books (owner's go, 22 Oct 2026 13:08 and 13:31 UK): paper-buy a coin on a HOT list at rank 2–5 when fomo's net buying in the window
// (buys − sells) is at least the book's minimum, MC under $1M and the price is above the window start (running). FF5 = 5-minute list, net ≥ $2K;
// FF2 = 15-minute list, net ≥ $3K. 0.1 SOL paper at the live price; exits scored by the engine above: trail 40% below the peak (x_tsl40, the
// book's exit), 2x-or-−40% (x_t2s40) and 1.5x-or-−40% alongside; 6-h time stop. One entry per coin per book per 6 h. Telegram on entry and on
// the trail exit. Runs on its own 30-s timer, so it does not depend on anyone having the page open.
import { solUsd } from "./price.mjs";
import { send } from "./telegram.mjs";
export const ff2 = { checks: 0, opened: 0, closed: 0, last: null, lastReason: "" };
const BOOKS = [
  { name: "FF5", win: "5m", secs: 300, NET_MIN: Number(process.env.FF5_NET_MIN || 2000) },
  { name: "FF2", win: "15m", secs: 900, NET_MIN: Number(process.env.FF2_NET_MIN || 3000) },
];
const FF2 = { MC_MAX: Number(process.env.FF2_MC_MAX || 1e6), STAKE_SOL: Number(process.env.FF2_STAKE || 0.1), COOLDOWN_S: 6 * 3600, RANKS: [2, 3, 4, 5] };
const isBook = (w) => BOOKS.some((b) => b.name === w);
function ff2Watch(row, mult, ts) {
  if (row.x_tsl40 != null && !row._ff2Told) { row._ff2Told = true; ff2.closed++; const r = realCost(row.x_tsl40); send(`${row.wallet} <b>${row.exit_reason === "time" ? "time out" : "trail exit"}</b> ${row.symbol || row.mint.slice(0, 6)} at ${row.x_tsl40.toFixed(2)}x · ${(r * 100).toFixed(0)}% at real costs · peak ${row.peak.toFixed(2)}x · held ${Math.round((ts - row.entry_ts) / 60)} min`).catch(() => {}); }
}
setInterval(() => {
  try {
    const now = nowS(); ff2.checks++; const reasons = [];
    for (const b of BOOKS) {
      const rows = q.hot.all(now - b.secs, 5);
      try { logHot(b.win, rows, now); } catch {}
      rows.forEach((r, i) => {
        const rank = i + 1; if (!FF2.RANKS.includes(rank)) return;
        const net = (r.buy_usd || 0) - (r.sell_usd || 0); if (net < b.NET_MIN) return;
        const c = q.coin.get(r.mint); const sym = c?.symbol || r.mint.slice(0, 6); const mc = c?.mc_usd; if (!(mc > 0) || mc >= FF2.MC_MAX) { reasons.push(`${b.name} ${sym}: mc ${mc ? "$" + Math.round(mc / 1e3) + "K" : "unknown"}`); return; }
        const px = _lp(r.mint)?.usd; if (!(px > 0)) { wantPrice(r.mint, 1800); reasons.push(`${b.name} ${sym}: no price yet`); return; }
        const before = q.priceBefore.get(r.mint, now - b.secs) || q.firstBuyPx.get(r.mint, now - b.secs); if (!(before > 0) || px <= before) { reasons.push(`${b.name} ${sym}: not running (${before > 0 ? (px / before).toFixed(2) + "x" : "no start price"})`); return; }
        if (q.ffRecent.get(b.name, r.mint, now - FF2.COOLDOWN_S)) return;
        const usd = FF2.STAKE_SOL * (solUsd() || 0);
        const row = openTrade({ wallet: b.name, handle: b.name, mint: r.mint, symbol: c?.symbol || null, sig: `${b.name.toLowerCase()}-${now}-${r.mint.slice(0, 8)}`, ts: now, px, usd, mc });
        if (!row) return; ff2.opened++; ff2.last = now; reasons.push(`${b.name} opened ${sym}`);
        console.log(`[${b.name}] buy ${sym} rank ${rank} net $${net.toFixed(0)} mc $${Math.round(mc)} px ${px.toExponential(3)} (${(px / before).toFixed(2)}x vs window start)`);
        send(`${b.name} <b>paper buy</b> ${sym} · rank #${rank} on the ${b.win} list · fomo net +$${net.toFixed(0)} · MC $${(mc / 1e3).toFixed(0)}K · ${(px / before).toFixed(2)}x vs window start · ${FF2.STAKE_SOL} SOL paper · exit: trail 40% / 6 h\nhttps://fomo.family/tokens/solana/${r.mint}`).catch(() => {});
      });
    }
    ff2.lastReason = reasons.slice(-4).join(" · ");
  } catch (e) { console.error("[ff]", e.message); ff2.lastReason = "error: " + e.message; }
}, 30_000).unref();
export function ff2Status() {
  const sum = (arr, f) => arr.reduce((a, r) => a + (f(r) ?? 0), 0);
  const rec = (arr, k) => { const done = arr.filter((r) => r[k] != null); return { n: done.length, won: done.filter((r) => r[k] > 1).length, ret: done.length ? sum(done, (r) => realCost(r[k])) / done.length : null, sol: sum(done, (r) => realCost(r[k]) * FF2.STAKE_SOL) }; };
  const books = BOOKS.map((b) => {
    const rows = q.ff2Rows.all(b.name); const open = rows.filter((r) => r.x_tsl40 == null), closed = rows.filter((r) => r.x_tsl40 != null);
    return { name: b.name, rule: `${b.win} list rank 2–5 · fomo net ≥ $${b.NET_MIN} · MC < $${FF2.MC_MAX / 1e6}M · price above window start · ${FF2.STAKE_SOL} SOL paper · trail 40% / 6 h`, open: open.map((r) => ({ ...r, mult: r.last_px && r.entry_px ? r.last_px / r.entry_px : null, sell_px: r.entry_px * r.peak * 0.6, sell_by: r.entry_ts + CFG.MAX_HOLD_S })), closed: closed.slice(0, 60), trail: rec(closed, "x_tsl40"), x2: rec(rows, "x_t2s40"), x15: rec(rows, "x_t15s40"), h5: rec(rows, "x_h5") };
  });
  return { books, checks: ff2.checks, lastReason: ff2.lastReason, stake: FF2.STAKE_SOL, sol_usd: solUsd(), held: books.flatMap((b) => b.open.map((t) => ({ book: b.name, mint: t.mint }))) };
}
