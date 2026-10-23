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
  // one-tick collapses (a bad quote) must not fill a stop: a stop level counts only when the previous tick was also at or under it (22 Oct 15:00 UK, after Nailong 0.003x / RDCTRD 0.02x)
  const prev = row._prevMult ?? mult; row._prevMult = mult; const low = Math.max(mult, prev);
  if (mult > row.peak) { row.peak = mult; row.low_before_peak = row.trough ?? 1; ch = true; }
  if (mult < (row.trough ?? 1)) { row.trough = mult; ch = true; }
  if (ch && isBook(row.wallet)) { try { q.setLows.run(row.trough ?? 1, row.low_before_peak ?? 1, row.id); } catch {} }
  row.last_px = px; row.last_ts = ts;
  for (const [k, s] of [["px5", 5], ["px30", 30], ["px120", 120]]) if (row[k] == null && since >= s) { row[k] = px; row[k + "_at"] = since; ch = true; }
  if (row.x_h5 == null && since >= 300) { row.x_h5 = mult; ch = true; }
  if (row.x_tsl40 == null && row.peak >= 1 && low <= row.peak * 0.6) { row.x_tsl40 = mult; row.x_tsl40_at = ts; try { q.setTslAt.run(ts, row.id); } catch {} ch = true; }
  if (row.x_t15s40 == null) { if (mult >= 1.5) { row.x_t15s40 = 1.5; ch = true; } else if (low <= 0.6) { row.x_t15s40 = mult; ch = true; } }
  for (const [k, tp] of [["x_t13s40", 1.3], ["x_t18s40", 1.8]]) if (row[k] == null) { if (mult >= tp) row[k] = tp; else if (low <= 0.6) row[k] = mult; if (row[k] != null) { ch = true; try { q.setTP[k].run(row[k], row.id); } catch {} } }
  if (row.x_t3s40 == null) { if (mult >= 3) { row.x_t3s40 = 3; ch = true; } else if (low <= 0.6) { row.x_t3s40 = mult; ch = true; } if (row.x_t3s40 != null) { try { q.setX3.run(row.x_t3s40, row.id); } catch {} } }
  if (row.x_t2s40 == null) { if (mult >= 2) { row.x_t2s40 = 2; ch = true; } else if (low <= 0.6) { row.x_t2s40 = mult; ch = true; } if (row.x_t2s40 != null) { try { q.setX2.run(row.x_t2s40, row.id); } catch {} } }
  if (since >= CFG.MAX_HOLD_S) { for (const k of ["x_h5", "x_tsl40", "x_t15s40", "x_copy", "x_time"]) if (row[k] == null) row[k] = mult; if (row.x_t2s40 == null) { row.x_t2s40 = mult; try { q.setX2.run(mult, row.id); } catch {} } if (row.x_t3s40 == null) { row.x_t3s40 = mult; try { q.setX3.run(mult, row.id); } catch {} } for (const k of ["x_t13s40", "x_t18s40"]) if (row[k] == null) { row[k] = mult; try { q.setTP[k].run(mult, row.id); } catch {} } if (!row.x_tsl40_at) { row.x_tsl40_at = ts; try { q.setTslAt.run(ts, row.id); } catch {} } row.exit_reason = "time"; ch = true; }
  const bk = isBook(row.wallet) ? BOOKS.find((b) => b.name === row.wallet) : null;
  if (bk?.exit && row.x_book == null) { const lvl = Math.max(1 - bk.exit.stop, row.peak * (1 - bk.exit.trail)); if (low <= lvl || since >= CFG.MAX_HOLD_S) { row.x_book = mult; row.x_book_at = ts; row.exit_reason ||= since >= CFG.MAX_HOLD_S ? "time" : row.peak * (1 - bk.exit.trail) > 1 - bk.exit.stop ? "trail" : "stop"; try { q.setBookExit.run(mult, ts, row.id); } catch {} ch = true; } }
  if (row.x_trip == null && isBook(row.wallet) && (low <= 0.6 || since >= CFG.MAX_HOLD_S)) { row.x_trip = mult; try { q.setTrip.run(mult, row.id); } catch {} ch = true; }
  if (row.x_fade == null && isBook(row.wallet) && low <= 0.6) { row.x_fade = mult; try { q.setFade.run(mult, row.id); } catch {} ch = true; }
  if (since >= CFG.MAX_HOLD_S && row.x_fade == null && isBook(row.wallet)) { row.x_fade = mult; try { q.setFade.run(mult, row.id); } catch {} }
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
import { launchInfo } from "./launch.mjs";
export const ff2 = { checks: 0, opened: 0, closed: 0, last: null, lastReason: "" };
const BOOKS = [
  // 23 Oct 07:27 UK (owner go): FF8 "survivors" — coins that have already lived: MC $100K–$2M, on fomo 15+ min, fomo net buying positive in each of the
  // last three 5-min windows, price within 30% of its 15-min high and above the 15-min start; stop −10%, trail 20%; first entry per coin only
  { name: "FF8", survivors: true, launchFilter: true, secs: 300, NET_MIN: 1, X_MAX: 1.5, AGE_MIN: 900, AGE_MAX: Infinity, MC_MIN: 100000, MC_MAX: 2e6, COOLDOWN_S: 86400, exit: { stop: 0.1, trail: 0.2 }, label: "survivors · $100K+ · 15+ min on fomo · 3 windows of net buying · stop −10% · trail 20%" },
  { name: "FF6", win: "5m", secs: 300, NET_MIN: 1000, X_MAX: 1.5, AGE_MAX: Infinity, MC_MIN: 15000, COOLDOWN_S: 86400, launchFilter: true, exit: { stop: 0.1, trail: 0.2 }, label: "clean entry · launch filter · stop −10% · trail 20%" },
  { name: "FF2", win: "15m", secs: 900, NET_MIN: Number(process.env.FF2_NET_MIN || 3000), X_MAX: Infinity, AGE_MAX: Infinity, label: "the 15-minute list (control)" },
  // retired from the page 23 Oct 07:27 UK (owner go) — their questions are answered; data kept, no new trades
  { name: "FF6b", off: true, win: "5m", secs: 300, NET_MIN: 1000, X_MAX: 1.5, AGE_MAX: Infinity, MC_MIN: 15000, COOLDOWN_S: 86400, exit: { stop: 0.2, trail: 0.2 }, label: "retired" },
  { name: "FF7", off: true, early: true, secs: 180, BUYERS_MIN: 8, NET_MIN: 1, X_MAX: 1.3, AGE_MAX: 180, MC_MIN: 10000, MC_MAX: 500000, COOLDOWN_S: 86400, exit: { stop: 0.1, trail: 0.2 }, label: "retired" },
  { name: "FF5", off: true, win: "5m", secs: 300, NET_MIN: 2000, X_MAX: Infinity, AGE_MAX: Infinity, label: "retired" },
  { name: "FF5e", off: true, win: "5m", secs: 300, NET_MIN: 1000, X_MAX: 1.3, AGE_MAX: 600, label: "retired" },
  { name: "FF2e", off: true, win: "15m", secs: 900, NET_MIN: 1500, X_MAX: 1.3, AGE_MAX: 600, label: "retired" },
];
const FF2 = { MC_MAX: Number(process.env.FF2_MC_MAX || 1e6), STAKE_SOL: Number(process.env.FF2_STAKE || 0.1), COOLDOWN_S: 6 * 3600, RANKS: [2, 3, 4, 5] };
const isBook = (w) => BOOKS.some((b) => b.name === w);
function ff2Watch(row, mult, ts) {
  const bk = BOOKS.find((b) => b.name === row.wallet); const k = bk?.exit ? "x_book" : "x_tsl40";
  if (row[k] != null && !row._ff2Told) { row._ff2Told = true; ff2.closed++; const r = realCost(row[k]); send(`${row.wallet} <b>${row.exit_reason === "time" ? "time out" : row.exit_reason || "exit"}</b> ${row.symbol || row.mint.slice(0, 6)} at ${row[k].toFixed(2)}x · ${(r * 100).toFixed(0)}% at real costs · peak ${row.peak.toFixed(2)}x · held ${Math.round((ts - row.entry_ts) / 60)} min`).catch(() => {}); return; }
  if (false) { row._ff2Told = true; ff2.closed++; const r = realCost(row.x_tsl40); send(`${row.wallet} <b>${row.exit_reason === "time" ? "time out" : "trail exit"}</b> ${row.symbol || row.mint.slice(0, 6)} at ${row.x_tsl40.toFixed(2)}x · ${(r * 100).toFixed(0)}% at real costs · peak ${row.peak.toFixed(2)}x · held ${Math.round((ts - row.entry_ts) / 60)} min`).catch(() => {}); }
}
setInterval(() => {
  try {
    const now = nowS(); ff2.checks++; const reasons = [];
    for (const b of BOOKS) {
      if (b.off) continue;
      const rows = b.early ? q.early.all(now - b.secs, now - b.secs, b.BUYERS_MIN) : b.survivors ? q.hot.all(now - 300, 20) : q.hot.all(now - b.secs, 5);
      if (!b.early && !b.survivors && b.win) try { logHot(b.win, rows, now); } catch {}
      rows.forEach((r, i) => {
        const rank = i + 1; if (!b.early && !b.survivors && !FF2.RANKS.includes(rank)) return;
        if (b.survivors) {
          const c0 = q.coin.get(r.mint); if (!c0?.first_seen || now - c0.first_seen < b.AGE_MIN) return;
          for (let k = 0; k < 3; k++) if (q.netWin.get(r.mint, now - (k + 1) * 300, now - k * 300) <= 0) return;
          const rg = q.pxRange.get(r.mint, now - 900); const p0 = _lp(r.mint)?.usd; if (!(rg?.hi > 0) || !(p0 > 0) || rg.n < 30 || p0 < rg.hi * 0.7) return;
        }
        const net = (r.buy_usd || 0) - (r.sell_usd || 0); if (net < b.NET_MIN) return;
        const c = q.coin.get(r.mint); const sym = c?.symbol || r.mint.slice(0, 6); const mc = c?.mc_usd; if (!(mc > 0) || mc >= (b.MC_MAX || FF2.MC_MAX) || mc < (b.MC_MIN || 0)) { reasons.push(`${b.name} ${sym}: mc ${mc ? "$" + Math.round(mc / 1e3) + "K" : "unknown"}`); return; }
        const px = _lp(r.mint)?.usd; if (!(px > 0)) { wantPrice(r.mint, 1800); reasons.push(`${b.name} ${sym}: no price yet`); return; }
        const before = q.priceBefore.get(r.mint, now - b.secs) || q.firstBuyPx.get(r.mint, now - b.secs); if (!(before > 0) || px <= before) { reasons.push(`${b.name} ${sym}: not running (${before > 0 ? (px / before).toFixed(2) + "x" : "no start price"})`); return; }
        const xstart = px / before; if (xstart > b.X_MAX) { reasons.push(`${b.name} ${sym}: already ${xstart.toFixed(2)}x`); return; }
        const age = now - (r.first_ts || now); if (age > b.AGE_MAX) { reasons.push(`${b.name} ${sym}: first fomo buy ${Math.round(age / 60)} min ago`); return; }
        if (q.ffRecent.get(b.name, r.mint, now - (b.COOLDOWN_S || FF2.COOLDOWN_S))) return;
        // launch filter (23 Oct 08:20 UK): the rug-factory signature seen on MrBeast / YouTube / tsmc — most of the supply bundled into one or two wallets, or a huge dev buy — is not bought
        const L = launchInfo(r.mint, now);
        if (b.launchFilter && L?.src === "tracker" && ((L.bundle >= 60 && (L.bwallets ?? 99) <= 2) || (L.dev ?? 0) >= 20)) { reasons.push(`${b.name} ${sym}: factory launch (bundle ${Math.round(L.bundle)}%/${L.bwallets}w, dev ${(L.dev || 0).toFixed(0)} SOL)`); return; }
        const usd = FF2.STAKE_SOL * (solUsd() || 0);
        const row = openTrade({ wallet: b.name, handle: b.name, mint: r.mint, symbol: c?.symbol || null, sig: `${b.name.toLowerCase()}-${now}-${r.mint.slice(0, 8)}`, ts: now, px, usd, mc });
        if (!row) return; ff2.opened++; ff2.last = now; reasons.push(`${b.name} opened ${sym}`);
        row.e_xstart = xstart; row.e_net = net; row.e_buyers = r.buyers; row.e_age_s = age; row.e_rank = rank; try { q.setEntry.run(xstart, net, r.buyers, age, rank, row.id); } catch {}
        try { if (L) { Object.assign(row, { l_bundle: L.bundle ?? null, l_bwallets: L.bwallets ?? null, l_dev: L.dev ?? null, l_creator_n: L.creator_n ?? null, l_creator_best: L.creator_best ?? null, l_top10: L.top10 ?? null, l_holders: L.holders ?? null, l_age_s: L.age_s ?? null, l_src: L.src }); q.setLaunch.run(row.l_bundle, row.l_bwallets, row.l_dev, row.l_creator_n, row.l_creator_best, row.l_top10, row.l_holders, row.l_age_s, row.l_src, row.id); } } catch (e) { console.error("[launch]", e.message); }
        console.log(`[${b.name}] buy ${sym} rank ${rank} net $${net.toFixed(0)} mc $${Math.round(mc)} px ${px.toExponential(3)} (${(px / before).toFixed(2)}x vs window start)`);
        send(`${b.name} <b>paper buy</b> ${sym} · rank #${rank} on the ${b.win} list · fomo net +$${net.toFixed(0)} · MC $${(mc / 1e3).toFixed(0)}K · ${xstart.toFixed(2)}x vs window start · first fomo buy ${Math.round(age / 60)} min ago · ${FF2.STAKE_SOL} SOL paper · exit: trail 40% / 6 h\nhttps://fomo.family/tokens/solana/${r.mint}`).catch(() => {});
      });
    }
    ff2.lastReason = reasons.slice(-4).join(" · ");
    for (const row of [...open.values()]) { if (!isBook(row.wallet) || row.x_fade != null || now - row.entry_ts < 120 || !(row.last_px > 0)) continue; const n2 = q.net2m.get(row.mint, now - 120); if (n2 <= 0) { row.x_fade = row.last_px / row.entry_px; try { q.setFade.run(row.x_fade, row.id); } catch {} } }
    for (const row of [...open.values()]) { if (!isBook(row.wallet) || row.x_trip != null || !(row.last_px > 0)) continue; const n1 = q.net1m.get(row.mint, now - 60); if (n1 <= -1000) { row.x_trip = row.last_px / row.entry_px; try { q.setTrip.run(row.x_trip, row.id); } catch {} } }
  } catch (e) { console.error("[ff]", e.message); ff2.lastReason = "error: " + e.message; }
}, 30_000).unref();
export function ff2Status() {
  const now = nowS(); const dayStart = (() => { const d = new Date(now * 1000).toLocaleDateString("en-GB", { timeZone: "Europe/London" }); return Math.floor(new Date(d.split("/").reverse().join("-") + "T00:00:00+01:00").getTime() / 1000); })();
  const sum = (arr, f) => arr.reduce((a, r) => a + (f(r) ?? 0), 0);
  const rec = (arr, k) => { const done = arr.filter((r) => r[k] != null); return { n: done.length, won: done.filter((r) => r[k] > 1).length, ret: done.length ? sum(done, (r) => realCost(r[k])) / done.length : null, sol: sum(done, (r) => realCost(r[k]) * FF2.STAKE_SOL) }; };
  const since = (rows, k, t) => rec(rows.filter((r) => r.entry_ts >= t), k);
  // P&L of the book = sold trades at their exit + open trades at the current price (both at real costs, in SOL at the paper stake)
  const pnl = (rows, t, K = "x_tsl40") => { const rs = rows.filter((r) => r.entry_ts >= t); let sold = 0, open = 0, n = 0, no = 0, won = 0; for (const r of rs) { if (r[K] != null) { sold += realCost(r[K]) * FF2.STAKE_SOL; n++; if (r[K] > 1) won++; } else if (r.last_px > 0) { open += realCost(r.last_px / r.entry_px) * FF2.STAKE_SOL; no++; } } return { sol: sold + open, sold, open, n, no, won }; };
  const books = BOOKS.filter((b) => !b.off).map((b) => {
    const rows = q.ff2Rows.all(b.name); const K = b.exit ? "x_book" : "x_tsl40"; const open = rows.filter((r) => r[K] == null), closed = rows.filter((r) => r[K] != null);
    const exits = [...(b.exit ? [["x_book", `stop −${b.exit.stop * 100}% · trail ${b.exit.trail * 100}% (the book)`], ["x_tsl40", "trail 40%"]] : [["x_tsl40", "trail 40% (the book)"]]), ["x_fade", "sell when fomo buying fades (2-min net ≤ 0)"], ["x_trip", "rug tripwire: fomo net selling > $1K in 1 min"], ["x_t13s40", "sell at 1.3x"], ["x_t15s40", "sell at 1.5x"], ["x_t18s40", "sell at 1.8x"], ["x_t2s40", "sell at 2x"], ["x_t3s40", "sell at 3x"], ["x_h5", "sell at 5 min"]].map(([k, label]) => ({ k, label, h1: since(rows, k, now - 3600), h4: since(rows, k, now - 4 * 3600), today: since(rows, k, dayStart), all: rec(rows, k) }));
    const p = { h1: pnl(rows, now - 3600, K), h4: pnl(rows, now - 4 * 3600, K), today: pnl(rows, dayStart, K), all: pnl(rows, 0, K) };
    return { name: b.name, win: b.win, net_min: b.NET_MIN, pnl: p, label: b.label, exitKey: K, rule: (b.survivors ? `MC $${b.MC_MIN / 1e3}K–$${b.MC_MAX / 1e6}M · on fomo ${b.AGE_MIN / 60}+ min · fomo net buying > 0 in each of the last three 5-min windows · price within 30% of its 15-min high and above the 5-min start (under ${b.X_MAX}x)` : b.early ? `brand-new on fomo: ≥ ${b.BUYERS_MIN} fomo buyers within ${b.secs / 60} min of its first fomo buy · net buying > 0 · under ${b.X_MAX}x of the first fill · MC $${b.MC_MIN / 1e3}K–$${b.MC_MAX / 1e3}K` : `${b.win} list, positions 2–5 · fomo net buying ≥ $${b.NET_MIN.toLocaleString()} in the window · MC ${b.MC_MIN ? "$" + b.MC_MIN / 1e3 + "K–" : "< "}$${FF2.MC_MAX / 1e6}M · price above the window start${b.X_MAX < Infinity ? ` but under ${b.X_MAX}x of it` : ""}${b.AGE_MAX < Infinity ? ` · first fomo buy within ${b.AGE_MAX / 60} min` : ""}`) + (b.COOLDOWN_S >= 86400 ? " · first entry per coin only" : "") + (b.launchFilter ? " · no factory launches (bundle ≥ 60% in ≤ 2 wallets, or dev buy ≥ 20 SOL)" : "") + ` · ${FF2.STAKE_SOL} SOL paper at the live price · ${b.exit ? `stop −${b.exit.stop * 100}%, trailing stop ${b.exit.trail * 100}% below the peak` : "sell 40% below the peak"}, or at 6 h${b.COOLDOWN_S >= 86400 ? "" : " · one entry per coin per 6 h"}`, started: rows.length ? rows[rows.length - 1].entry_ts : null, open: open.map((r) => ({ ...r, mult: r.last_px && r.entry_px ? r.last_px / r.entry_px : null, sell_px: r.entry_px * (b.exit ? Math.max(1 - b.exit.stop, r.peak * (1 - b.exit.trail)) : r.peak * 0.6), sell_by: r.entry_ts + CFG.MAX_HOLD_S })), closed: closed.slice(0, 40), exits };
  });
  const total = (k) => books.reduce((a, b) => ({ sol: a.sol + b.pnl[k].sol, sold: a.sold + b.pnl[k].sold, open: a.open + b.pnl[k].open, n: a.n + b.pnl[k].n, no: a.no + b.pnl[k].no, won: a.won + b.pnl[k].won }), { sol: 0, sold: 0, open: 0, n: 0, no: 0, won: 0 });
  return { books, total: { h1: total("h1"), h4: total("h4"), today: total("today"), all: total("all") }, checks: ff2.checks, lastReason: ff2.lastReason, stake: FF2.STAKE_SOL, sol_usd: solUsd(), held: books.flatMap((b) => b.open.map((t) => ({ book: b.name, mint: t.mint }))) };
}
