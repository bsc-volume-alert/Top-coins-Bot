// v0.18.60 Project 6 — "sleepers": older coins (≥ 6 h) sitting at $300K–$1.5M that suddenly trade ≥ $100K in 5 minutes (owner's idea,
// 17 Oct — e.g. "simulator", 6 months old, $200K → $3M in an hour; our feed only noticed it at $1.88M). Built to catch the big runner.
// Triggers: our own feed (PumpSwap / pump.fun / Raydium / Orca) OR GMGN's trending scanner (every DEX, incl. Meteora).
// Main exit: half at 4x, the rest rides — closed at 24 h, or if the coin falls 90% from its peak. No −40% stop, no golden rule:
// the point is to see how high and how low these go. Recorded alongside: 1.5x / −40%, half at 2x + 40% trail, 60% trail,
// highest and lowest multiple and when they happened. Prices are tracked as USD per token (our feed: SOL price × SOL/USD; quiet
// coins and pools our feed can't read, e.g. Meteora: DexScreener every 20 s), so coins with any supply are measured correctly.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { on, links, esc, fmt } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { tg } from "./telegram.js";
import { solUsdCached } from "./price.js";
import { gmgnEntry } from "./gmgn.js";

const MIN_MC = Number(process.env.P6_MIN_MC || 300_000), MAX_MC = Number(process.env.P6_MAX_MC || 1_500_000);
const VOL5M = Number(process.env.P6_VOL5M_USD || 100_000), MIN_AGE_H = Number(process.env.P6_MIN_AGE_H || 6), HOLD_H = Number(process.env.P6_HOLD_H || 24);
const ENABLED = process.env.P6_ENABLED !== "0";
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);

for (const c of ["x_p6 REAL", "p6_low REAL", "p6_low_ts INTEGER", "p6_peak_ts INTEGER", "p6_last REAL", "p6_state TEXT"]) { try { db.exec(`ALTER TABLE paper_trades ADD COLUMN ${c}`); } catch {} }
const qRecent = db.prepare(`SELECT 1 FROM paper_trades WHERE strategy='p6' AND mint=? AND entry_ts > ? LIMIT 1`);
const qSave = db.prepare(`UPDATE paper_trades SET peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=?, peak_mc=? WHERE id=?`);
const qClose = db.prepare(`UPDATE paper_trades SET closed=1, exit_ts=?, exit_reason=?, x_p6=?, x_t15s40=?, x_tsl60=?, x_h2t40=?, peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=? WHERE id=?`);
const qOpen = db.prepare(`SELECT id, mint, name, entry_ts, entry_mc, peak_mult, p6_low, p6_low_ts, p6_peak_ts, p6_last, p6_state FROM paper_trades WHERE strategy='p6' AND closed=0 AND COALESCE(invalid,0)=0`);

export const p6 = { candidates: 0, entries: 0, closes: 0, young: 0, noAge: 0, sellHeavy: 0, outOfRange: 0, repeat: 0, bySource: { feed: 0, gmgn: 0 } };
const open = new Map(); // mint -> pos
const checked = new Map(); // mint -> ms of last candidate check (one look per coin per 10 min)
const nowS = () => Math.floor(Date.now() / 1000);

// DexScreener: best pair by liquidity — USD price, market cap, pool age, recent volume / price change (how quiet it was before)
async function dsInfo(mint) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const ps = (j.pairs || []).filter((p) => p.chainId === "solana"); if (!ps.length) return null;
  const b = ps.reduce((a, c) => ((c.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? c : a));
  return { usd: Number(b.priceUsd) || null, mc: Number(b.marketCap || b.fdv) || null, created: b.pairCreatedAt ? Math.floor(b.pairCreatedAt / 1000) : null, dex: b.dexId, liq: b.liquidity?.usd ?? null,
    vol: b.volume || null, chg: b.priceChange || null, txm5: b.txns?.m5 || null, name: b.baseToken?.name, symbol: b.baseToken?.symbol, pairs: ps.length };
}

// called by momentum.js on every swap once our feed sees ≥ $100K in 5 min, and by gmgn.js for every coin on GMGN's 5-minute list
export function p6Candidate(c) {
  if (!ENABLED || !c?.mint || NOT_COINS.has(c.mint) || open.has(c.mint)) return;
  if (!(c.v5 >= VOL5M)) return;
  if (!(c.mc >= MIN_MC && c.mc <= MAX_MC)) return;
  const t = Date.now(), last = checked.get(c.mint); if (last && t - last < 600_000) return;
  checked.set(c.mint, t); if (checked.size > 20000) checked.delete(checked.keys().next().value);
  p6.candidates++;
  if (qRecent.get(c.mint, nowS() - 86400)) { p6.repeat++; return; }
  if (c.bu != null && c.su != null && c.su > 0 && c.bu < c.su) { p6.sellHeavy++; return; } // our feed: buy $ ≥ sell $ in the 5-min window
  if (c.buys != null && c.sells != null && c.buys < c.sells) { p6.sellHeavy++; return; }  // GMGN: more buys than sells (counts)
  enter(c).catch((e) => console.error("[p6]", e.message));
}

async function enter(c) {
  const ds = await dsInfo(c.mint).catch(() => null);
  const meta = (() => { try { return q.tokenMeta.get(c.mint); } catch { return null; } })();
  const created = meta?.create_ts || c.created || ds?.created || null, ts = nowS();
  if (!created) { p6.noAge++; return; }
  const ageS = ts - created; if (ageS < MIN_AGE_H * 3600) { p6.young++; return; }
  const usd = c.usd || ds?.usd || (c.price > 0 ? c.price * solUsdCached() : null);
  const mc = c.mc || ds?.mc; if (!(usd > 0) || !(mc > 0)) return;
  if (!(mc >= MIN_MC && mc <= MAX_MC)) { p6.outOfRange++; return; }
  if (open.has(c.mint) || qRecent.get(c.mint, ts - 86400)) return;
  const name = meta?.name || c.name || ds?.name || c.mint.slice(0, 8), symbol = meta?.symbol || c.symbol || ds?.symbol || "";
  const r = q.insMom.run(c.mint, name, symbol, ts, mc, usd, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null, meta?.has_socials ?? null, meta?.socials ?? null, c.v5, null, null, null, ageS, 0, 1, mc);
  const id = r.lastInsertRowid;
  try { q.setStrategy.run("p6", id); q.setVenue.run(c.venue || (c.source === "gmgn" ? `gmgn:${c.exchange || "?"}` : "feed"), id); q.setVolEntry.run(c.v5, id); } catch {}
  const info = { source: c.source, ageH: +(ageS / 3600).toFixed(1), v5: Math.round(c.v5), bu: c.bu ?? null, su: c.su ?? null, buys: c.buys ?? null, sells: c.sells ?? null, exchange: c.exchange ?? null,
    ds: ds ? { dex: ds.dex, liq: ds.liq, vol: ds.vol, chg: ds.chg, txm5: ds.txm5, pairs: ds.pairs } : null };
  try { q.setEarly.run(JSON.stringify(info), id); } catch {}
  gmgnEntry(c.mint, id);
  const pos = { id, mint: c.mint, name, entryTs: ts, entryMc: mc, entryUsd: usd, peak: 1, low: 1, peakTs: ts, lowTs: ts, last: 1, lastTs: ts, half4: false, h2: false, x: {}, manual: null, saved: 0 };
  open.set(c.mint, pos); p6.entries++; p6.bySource[c.source] = (p6.bySource[c.source] || 0) + 1;
  setTimeout(() => close(pos, "time"), HOLD_H * 3600_000);
  const quiet = ds?.vol ? ` · 24h vol $${fmt(ds.vol.h24 || 0)} · 6h $${fmt(ds.vol.h6 || 0)} · 1h $${fmt(ds.vol.h1 || 0)}` : "";
  tg(`🌅 <b>P6 SLEEPER WAKES</b> — ${esc(name)} ($${esc(symbol)})\n${(ageS / 86400 >= 1 ? (ageS / 86400).toFixed(1) + " days" : (ageS / 3600).toFixed(1) + " h")} old · MC <b>$${fmt(mc)}</b> · 5m vol $${fmt(c.v5)} · seen by ${c.source === "gmgn" ? "GMGN" : "our feed"}${ds?.dex ? " · " + esc(ds.dex) : ""}${quiet}\nPaper: half at 4x, rest rides 24 h\n${links(c.mint)}\n<code>${c.mint}</code>`);
}

function step(pos, usd, ts) {
  if (!(usd > 0) || pos.closed) return;
  const m = usd / pos.entryUsd; if (!(m > 0) || !isFinite(m)) return;
  pos.last = m; pos.lastTs = ts;
  if (m > pos.peak) { pos.peak = m; pos.peakTs = ts; }
  if (m < pos.low) { pos.low = m; pos.lowTs = ts; }
  const x = pos.x;
  if (!pos.half4 && m >= 4) { pos.half4 = true; tg(`🚀 <b>P6 HIT 4x</b> — ${esc(pos.name)} · half sold (paper) · MC $${fmt(pos.entryMc * m)} · rest rides`); }
  if (x.t15s40 == null) { if (m >= 1.5) x.t15s40 = 1.5; else if (m <= 0.6) x.t15s40 = m; }
  if (x.tsl60 == null && m <= 0.4 * pos.peak) x.tsl60 = m;
  if (x.h2t40 == null) { if (!pos.h2) { if (m >= 2) pos.h2 = true; else if (m <= 0.6) x.h2t40 = m; } if (pos.h2 && m <= 0.6 * pos.peak) x.h2t40 = 1 + 0.5 * m; }
  if (m <= 0.1 * pos.peak) return close(pos, "dead");
  if (ts - pos.saved >= 15) { pos.saved = ts; save(pos); }
}
const state = (pos) => JSON.stringify({ entryUsd: pos.entryUsd, half4: pos.half4, h2: pos.h2, x: pos.x, manual: pos.manual });
function save(pos) { try { qSave.run(pos.peak, pos.low, pos.lowTs, pos.peakTs, pos.last, state(pos), pos.entryMc * pos.peak, pos.id); } catch {} }
const mainValue = (pos, m) => (pos.half4 ? 2 + 0.5 * m : m);
function close(pos, reason) {
  if (pos.closed) return; pos.closed = true; open.delete(pos.mint); p6.closes++;
  const m = pos.last, x = pos.x;
  let main = mainValue(pos, m); if (pos.manual) main = pos.manual.banked + (1 - pos.manual.sold) * main;
  const t15 = x.t15s40 ?? m, t60 = x.tsl60 ?? m, h2 = x.h2t40 ?? (pos.h2 ? 1 + 0.5 * m : m);
  try { qClose.run(nowS(), reason, main, t15, t60, h2, pos.peak, pos.low, pos.lowTs, pos.peakTs, m, state(pos), pos.id); } catch (e) { console.error("[p6 close]", e.message); }
  tg(`${main >= 1 ? "✅" : "🔴"} <b>P6 CLOSE</b> — ${esc(pos.name)} (${reason === "time" ? `${HOLD_H} h` : reason === "dead" ? "fell 90% from peak" : reason})\nResult <b>${main.toFixed(2)}x</b> · peak ${pos.peak.toFixed(2)}x · low ${pos.low.toFixed(2)}x · now ${m.toFixed(2)}x\n1.5x/−40%: ${t15.toFixed(2)}x · ½ at 2x + 40% trail: ${h2.toFixed(2)}x · 60% trail: ${t60.toFixed(2)}x`);
}

// prices: every trade our feed sees on an open P6 coin…
on("trade", (t, tr) => { const p = open.get(t.mint); if (p && tr?.price > 0) step(p, tr.price * solUsdCached(), tr.ts || nowS()); });
onSwap((tr) => { const p = open.get(tr.mint); if (p && tr.price > 0) step(p, tr.price * solUsdCached(), tr.ts || nowS()); });
// …and DexScreener every 20 s for coins our feed hasn't priced in the last 45 s (Meteora, quiet coins)
let busy = false;
setInterval(async () => {
  if (busy || !open.size) return; busy = true;
  try { for (const p of [...open.values()]) { if (p.closed || nowS() - p.lastTs < 45) continue; const d = await dsInfo(p.mint).catch(() => null); if (d?.usd > 0) step(p, d.usd, nowS()); } }
  catch (e) { console.error("[p6 poll]", e.message); } finally { busy = false; }
}, 20_000);

// website "sell" buttons (paper)
export function p6ManualSell(id, pct) {
  for (const p of open.values()) {
    if (p.id !== id) continue;
    const prev = p.manual || { banked: 0, sold: 0 }, take = Math.min(pct, 1 - prev.sold); if (take <= 0) return { ok: false, error: "already fully sold" };
    p.manual = { banked: prev.banked + take * mainValue(p, p.last), sold: prev.sold + take, ts: nowS() };
    try { q.setManual.run(p.manual.banked + (1 - p.manual.sold) * mainValue(p, p.last), p.manual.sold, p.manual.ts, p.id); } catch {}
    save(p); if (p.manual.sold >= 0.999) close(p, "manual");
    return { ok: true, mult: p.last, sold: p.manual.sold };
  }
  return null;
}
export const p6Open = () => [...open.values()].map((p) => ({ id: p.id, mint: p.mint, name: p.name, entryTs: p.entryTs, entryMc: p.entryMc, mult: p.last, peak: p.peak, low: p.low, half4: p.half4, manualSold: p.manual?.sold || 0, lastTs: p.lastTs }));

// restart: rebuild open P6 positions; anything past its 24 h is closed at the last recorded multiple
try {
  for (const r of qOpen.all()) {
    let s = {}; try { s = JSON.parse(r.p6_state || "{}"); } catch {}
    const pos = { id: r.id, mint: r.mint, name: r.name, entryTs: r.entry_ts, entryMc: r.entry_mc, entryUsd: s.entryUsd, peak: r.peak_mult || 1, low: r.p6_low || 1, peakTs: r.p6_peak_ts || r.entry_ts, lowTs: r.p6_low_ts || r.entry_ts,
      last: r.p6_last || 1, lastTs: 0, half4: !!s.half4, h2: !!s.h2, x: s.x || {}, manual: s.manual || null, saved: 0 };
    if (!(pos.entryUsd > 0)) { pos.closed = false; close(pos, "restart-no-price"); continue; }
    open.set(r.mint, pos);
    const left = r.entry_ts + HOLD_H * 3600 - nowS();
    if (left <= 0) close(pos, "time"); else setTimeout(() => close(pos, "time"), left * 1000);
  }
  if (open.size) console.log(`[p6] restored ${open.size} open position(s)`);
} catch (e) { console.error("[p6 restore]", e.message); }
console.log(`[p6] ${ENABLED ? "on" : "off"} — MC $${MIN_MC / 1e3}K–$${MAX_MC / 1e6}M · ≥ $${VOL5M / 1e3}K in 5 min · coin ≥ ${MIN_AGE_H} h old · half at 4x, rest rides ${HOLD_H} h`);
export { step as _step, close as _close, open as _open }; // tests
