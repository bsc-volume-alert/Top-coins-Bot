// v0.18.60 Project 6 — "sleepers": older coins (≥ 6 h) sitting at $300K–$1.5M that suddenly trade ≥ $100K in 5 minutes (owner's idea,
// 17 Oct — e.g. "simulator", 6 months old, $200K → $3M in an hour; our feed only noticed it at $1.88M). Built to catch the big runner.
// Triggers: our own feed (PumpSwap / pump.fun / Raydium / Orca) OR GMGN's trending scanner (every DEX, incl. Meteora).
// Main exit: half at 4x, the rest rides — closed at 24 h, or if the coin falls 90% from its peak. No −40% stop, no golden rule:
// the point is to see how high and how low these go. Recorded alongside: 1.5x / −40%, half at 2x + 40% trail, 60% trail,
// highest and lowest multiple and when they happened. Prices are tracked as USD per token (our feed: SOL price × SOL/USD; quiet
// coins and pools our feed can't read, e.g. Meteora: DexScreener every 20 s), so coins with any supply are measured correctly.
// v0.18.65 P6 v2 (owner, 17 Oct 19:04): coin ≥ 12 h old, $300K–$1.5M, ≥ $60K traded in 5 min, buys ≥ sells — any Solana DEX (our feed or GMGN).
// Three exits, each with a −40% stop and the golden rule (sell what is left when 5-min volume < $15K): A all at 2x · B half at 2x, rest on a
// 40% trailing stop · C all at 3x. The v1 exit (half at 4x, rest rides 24 h, no stop) is still recorded as x_p6 for comparison.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { on, links, esc, fmt } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { tg } from "./telegram.js";
import { solUsdCached } from "./price.js";
import { gmgnEntry, gmgnV5 } from "./gmgn.js";
import { momSnap } from "./momentum.js"; // v0.18.65 golden rule needs our feed's 5-min volume
import { volP6 } from "./vollog.js"; // v0.18.62 every decision goes on the coin's volume-log line

const MIN_MC = Number(process.env.P6_MIN_MC || 300_000), MAX_MC = Number(process.env.P6_MAX_MC || 1_500_000);
const VOL5M = Number(process.env.P6_VOL5M_USD || 60_000), MIN_AGE_H = Number(process.env.P6_MIN_AGE_H || 12), HOLD_H = Number(process.env.P6_HOLD_H || 24);
const ENABLED = process.env.P6_ENABLED !== "0";
export const P6_VOL = VOL5M;
const GOLDEN_USD = Number(process.env.P6_GOLDEN_USD || 15_000), STOP = 0.6;
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);

for (const c of ["x_p6a REAL", "x_p6b REAL", "x_p6c REAL", "x_p6 REAL", "p6_low REAL", "p6_low_ts INTEGER", "p6_peak_ts INTEGER", "p6_last REAL", "p6_state TEXT"]) { try { db.exec(`ALTER TABLE paper_trades ADD COLUMN ${c}`); } catch {} }
const qRecent = db.prepare(`SELECT 1 FROM paper_trades WHERE strategy='p6' AND mint=? AND entry_ts > ? LIMIT 1`);
const qSave = db.prepare(`UPDATE paper_trades SET peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=?, peak_mc=? WHERE id=?`);
const qClose = db.prepare(`UPDATE paper_trades SET closed=1, exit_ts=?, exit_reason=?, x_p6a=?, x_p6b=?, x_p6c=?, x_p6=?, x_t15s40=?, x_tsl60=?, x_h2t40=?, peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=? WHERE id=?`);
const qOpen = db.prepare(`SELECT id, mint, name, entry_ts, entry_mc, entry_price, peak_mult, p6_low, p6_low_ts, p6_peak_ts, p6_last, p6_state FROM paper_trades WHERE strategy='p6' AND closed=0 AND COALESCE(invalid,0)=0`);

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
const usdK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round((v || 0) / 1e3)}K`);
const MC_LO = `MC under ${usdK(MIN_MC)}`, MC_HI = `MC over ${usdK(MAX_MC)}`;
export function p6Candidate(c) {
  if (!c?.mint || NOT_COINS.has(c.mint)) return;
  if (!(c.v5 >= VOL5M)) return;
  if (!ENABLED) return volP6(c.mint, "P6 off");
  if (open.has(c.mint)) return volP6(c.mint, "already holding");
  if (!(c.mc >= MIN_MC && c.mc <= MAX_MC)) return c.mc > 0 ? volP6(c.mint, c.mc > MAX_MC ? MC_HI : MC_LO, `MC ${usdK(c.mc)}`) : volP6(c.mint, "MC unknown");
  const t = Date.now(), last = checked.get(c.mint); if (last && t - last < 600_000) return;
  checked.set(c.mint, t); if (checked.size > 20000) checked.delete(checked.keys().next().value);
  p6.candidates++;
  if (qRecent.get(c.mint, nowS() - 86400)) { p6.repeat++; return volP6(c.mint, "bought in last 24 h"); }
  if (c.bu != null && c.su != null && c.su > 0 && c.bu < c.su) { p6.sellHeavy++; return volP6(c.mint, "more sells", `${usdK(c.bu)} in / ${usdK(c.su)} out`); } // our feed: buy $ ≥ sell $ in the 5-min window
  if (c.buys != null && c.sells != null && c.buys < c.sells) { p6.sellHeavy++; return volP6(c.mint, "more sells", `${c.buys} buys / ${c.sells} sells`); }  // GMGN: more buys than sells (counts)
  enter(c).catch((e) => { console.error("[p6]", e.message); volP6(c.mint, "error", String(e.message).slice(0, 80)); });
}

async function enter(c) {
  const ds = await dsInfo(c.mint).catch(() => null);
  const meta = (() => { try { return q.tokenMeta.get(c.mint); } catch { return null; } })();
  const created = meta?.create_ts || c.created || ds?.created || null, ts = nowS();
  if (!created) { p6.noAge++; return volP6(c.mint, "age unknown"); }
  const ageS = ts - created; if (ageS < MIN_AGE_H * 3600) { p6.young++; return volP6(c.mint, "too young", `${(ageS / 3600).toFixed(1)} h old`, { created }); }
  const usd = c.usd || ds?.usd || (c.price > 0 ? c.price * solUsdCached() : null);
  const mc = c.mc || ds?.mc; if (!(usd > 0) || !(mc > 0)) return volP6(c.mint, "no price", null, { created });
  if (!(mc >= MIN_MC && mc <= MAX_MC)) { p6.outOfRange++; return volP6(c.mint, mc > MAX_MC ? MC_HI : MC_LO, `MC ${usdK(mc)}`, { created }); }
  if (open.has(c.mint) || qRecent.get(c.mint, ts - 86400)) return;
  const name = meta?.name || c.name || ds?.name || c.mint.slice(0, 8), symbol = meta?.symbol || c.symbol || ds?.symbol || "";
  const r = q.insMom.run(c.mint, name, symbol, ts, mc, usd, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null, meta?.has_socials ?? null, meta?.socials ?? null, c.v5, null, null, null, ageS, 0, 1, mc);
  const id = r.lastInsertRowid;
  try { q.setStrategy.run("p6", id); q.setVenue.run(c.venue || (c.source === "gmgn" ? `gmgn:${c.exchange || "?"}` : "feed"), id); q.setVolEntry.run(c.v5, id); } catch {}
  const info = { source: c.source, ageH: +(ageS / 3600).toFixed(1), v5: Math.round(c.v5), bu: c.bu ?? null, su: c.su ?? null, buys: c.buys ?? null, sells: c.sells ?? null, exchange: c.exchange ?? null,
    ds: ds ? { dex: ds.dex, liq: ds.liq, vol: ds.vol, chg: ds.chg, txm5: ds.txm5, pairs: ds.pairs } : null };
  try { q.setEarly.run(JSON.stringify(info), id); } catch {}
  gmgnEntry(c.mint, id);
  const pos = { id, mint: c.mint, name, entryTs: ts, entryMc: mc, entryUsd: usd, peak: 1, low: 1, peakTs: ts, lowTs: ts, last: 1, lastTs: ts, half4: false, h2: false, b2: false, feed: c.source === "feed", x: {}, manual: null, saved: 0 };
  open.set(c.mint, pos); p6.entries++; p6.bySource[c.source] = (p6.bySource[c.source] || 0) + 1;
  volP6(c.mint, "bought", `${(ageS / 3600).toFixed(1)} h old · MC ${usdK(mc)}`, { created, id: Number(id) });
  setTimeout(() => close(pos, "time"), HOLD_H * 3600_000);
  const quiet = ds?.vol ? ` · 24h vol $${fmt(ds.vol.h24 || 0)} · 6h $${fmt(ds.vol.h6 || 0)} · 1h $${fmt(ds.vol.h1 || 0)}` : "";
  tg(`🌅 <b>P6 SLEEPER WAKES</b> — ${esc(name)} ($${esc(symbol)})\n${(ageS / 86400 >= 1 ? (ageS / 86400).toFixed(1) + " days" : (ageS / 3600).toFixed(1) + " h")} old · MC <b>$${fmt(mc)}</b> · 5m vol $${fmt(c.v5)} · seen by ${c.source === "gmgn" ? "GMGN" : "our feed"}${ds?.dex ? " · " + esc(ds.dex) : ""}${quiet}\nPaper: A all at 2x · B ½ at 2x + 40% trail · C all at 3x (−40% stop · out if 5m vol &lt; $${fmt(GOLDEN_USD)})\n${links(c.mint)}\n<code>${c.mint}</code>`);
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
  // v0.18.65 exits A / B / C (each with the −40% stop; the golden rule is checked every 20 s below)
  if (x.a == null) { if (m >= 2) x.a = 2; else if (m <= STOP) x.a = m; }
  if (x.c == null) { if (m >= 3) x.c = 3; else if (m <= STOP) x.c = m; }
  if (x.b == null) { if (!pos.b2) { if (m >= 2) pos.b2 = true; else if (m <= STOP) x.b = m; } if (pos.b2 && m <= 0.6 * pos.peak) x.b = 1 + 0.5 * m; }
  if (m <= 0.1 * pos.peak) return close(pos, "dead");
  if (ts - pos.saved >= 15) { pos.saved = ts; save(pos); }
}
const state = (pos) => JSON.stringify({ entryUsd: pos.entryUsd, half4: pos.half4, h2: pos.h2, b2: pos.b2, feed: pos.feed, x: pos.x, manual: pos.manual, peak: pos.peak, low: pos.low }); // v0.18.62 peak/low kept here too
function save(pos) { try { qSave.run(pos.peak, pos.low, pos.lowTs, pos.peakTs, pos.last, state(pos), pos.entryMc * pos.peak, pos.id); } catch {} }
const mainValue = (pos, m) => (pos.half4 ? 2 + 0.5 * m : m);
function close(pos, reason, exitTs = null, quiet = false) { // v0.18.62 exitTs/quiet: restart closes of rows past 24 h get entry + 24 h, no Telegram
  if (pos.closed) return; pos.closed = true; open.delete(pos.mint); p6.closes++;
  const m = pos.last, x = pos.x;
  let main = mainValue(pos, m); if (pos.manual) main = pos.manual.banked + (1 - pos.manual.sold) * main;
  const t15 = x.t15s40 ?? m, t60 = x.tsl60 ?? m, h2 = x.h2t40 ?? (pos.h2 ? 1 + 0.5 * m : m);
  const A = x.a ?? m, B = x.b ?? (pos.b2 ? 1 + 0.5 * m : m), Cx = x.c ?? m;
  try { qClose.run(exitTs || nowS(), reason, A, B, Cx, main, t15, t60, h2, pos.peak, pos.low, pos.lowTs, pos.peakTs, m, state(pos), pos.id); } catch (e) { console.error("[p6 close]", e.message); }
  if (quiet) return;
  tg(`${main >= 1 ? "✅" : "🔴"} <b>P6 CLOSE</b> — ${esc(pos.name)} (${reason === "time" ? `${HOLD_H} h` : reason === "dead" ? "fell 90% from peak" : reason})\nA all at 2x: <b>${A.toFixed(2)}x</b> · B ½ at 2x + trail: <b>${B.toFixed(2)}x</b> · C all at 3x: <b>${Cx.toFixed(2)}x</b>${x.gr ? ` (golden rule at ${x.gr.toFixed(2)}x)` : ""}\npeak ${pos.peak.toFixed(2)}x · low ${pos.low.toFixed(2)}x · now ${m.toFixed(2)}x · old ½-at-4x: ${main.toFixed(2)}x`);
}

// prices: every trade our feed sees on an open P6 coin…
on("trade", (t, tr) => { const p = open.get(t.mint); if (p && tr?.price > 0) { p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });
onSwap((tr) => { const p = open.get(tr.mint); if (p && tr.price > 0) { p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });
// v0.18.65 golden rule: 5-min volume from our feed (coins it trades; no trades = $0), else GMGN's list (≤ 2 min old), else DexScreener's m5
function vol5(p) {
  const s = momSnap(p.mint); if (p.feed) return s ? s.v5 : 0;
  const g = gmgnV5(p.mint, 120); if (g != null) return g;
  return p.dsV5 != null && nowS() - p.dsV5Ts < 90 ? p.dsV5 : null;
}
function golden(p) {
  if (p.closed || nowS() - p.entryTs < 60) return; const x = p.x; if (x.a != null && x.b != null && x.c != null) return;
  const v = vol5(p); if (v == null || v >= GOLDEN_USD) return;
  const m = p.last; x.gr = m; x.grV = Math.round(v);
  if (x.a == null) x.a = m; if (x.c == null) x.c = m; if (x.b == null) x.b = p.b2 ? 1 + 0.5 * m : m;
  save(p);
}
// …and DexScreener every 20 s for coins our feed hasn't priced in the last 45 s (Meteora, quiet coins)
let busy = false;
setInterval(async () => {
  if (busy || !open.size) return; busy = true;
  try { for (const p of [...open.values()]) { if (!p.closed && nowS() - p.lastTs >= 45) { const d = await dsInfo(p.mint).catch(() => null); if (d?.usd > 0) step(p, d.usd, nowS()); if (d?.vol?.m5 != null) { p.dsV5 = Number(d.vol.m5); p.dsV5Ts = nowS(); } } golden(p); } }
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

// v0.18.62 repair: before v0.18.62 the 6-hour sweeper and the copy-trade restart rebuild also picked up open P6 rows and closed them with their
// own exits, in SOL prices against P6's USD entry price (nonsense multiples). P6's own close always writes x_p6, so a P6 row that is closed
// with x_p6 empty was closed by someone else: reopen it and let P6 finish it (its high / low / last are in p6_* columns and p6_state).
// The same foreign writes left their own exit fields on P6 rows (pnl_pct, exit_mc/price, x_time, x_tp…, a peak_mc ~200x too high); P6 never
// uses those columns, so they are cleared on every P6 row and peak_mc is recomputed from P6's own peak.
try {
  const fix = db.prepare(`UPDATE paper_trades SET closed=0, exit_reason=NULL, exit_ts=NULL WHERE strategy='p6' AND closed=1 AND x_p6 IS NULL AND COALESCE(invalid,0)=0`).run().changes;
  if (fix) console.log(`[p6] reopened ${fix} P6 position(s) closed by the sweeper / copy-trade restore`);
  const cols = ["pnl_pct", "exit_mc", "exit_price", "x_time", "x_tp", "x_tsl40", "x_tsl80", "x_half60", "x_twophase", "x_ladder", "x_levels", "x_m1", "x_m1vol", "x_volstop", "x_combo", "x_tp15", "x_tsl25", "x_t15s25", "x_t15s60", "x_t2s25", "x_t2s40", "x_t2s60", "x_flow", "x_flow4", "x_flow4ff", "x_split", "x_cluster", "x_grad", "path"];
  const have = new Set(db.prepare(`PRAGMA table_info(paper_trades)`).all().map((c) => c.name)), set = cols.filter((c) => have.has(c));
  const n = db.prepare(`UPDATE paper_trades SET ${set.map((c) => `${c}=NULL`).join(", ")}, peak_mc=entry_mc*MAX(COALESCE(peak_mult,1),1) WHERE strategy='p6' AND (${set.map((c) => `${c} IS NOT NULL`).join(" OR ")} OR ABS(COALESCE(peak_mc,0) - entry_mc*MAX(COALESCE(peak_mult,1),1)) > 1)`).run().changes;
  if (n) console.log(`[p6] cleared other modules' exit fields on ${n} P6 row(s)`);
} catch (e) { console.error("[p6 repair]", e.message); }
// restart: rebuild open P6 positions; anything past its 24 h is closed at the last recorded multiple
try {
  for (const r of qOpen.all()) {
    let s = {}; try { s = JSON.parse(r.p6_state || "{}"); } catch {}
    const pk = Math.max(s.peak || 0, r.peak_mult || 0, s.half4 ? 4 : 0, s.h2 ? 2 : 0, r.p6_last || 0, 1); // peak_mult may have been overwritten by the old foreign close
    const pos = { id: r.id, mint: r.mint, name: r.name, entryTs: r.entry_ts, entryMc: r.entry_mc, entryUsd: s.entryUsd || r.entry_price, peak: pk, low: Math.min(s.low || 1, r.p6_low || 1), peakTs: r.p6_peak_ts || r.entry_ts, lowTs: r.p6_low_ts || r.entry_ts,
      last: r.p6_last || 1, lastTs: 0, half4: !!s.half4, h2: !!s.h2, b2: !!s.b2, feed: !!s.feed, x: s.x || {}, manual: s.manual || null, saved: 0 };
    if (!(pos.entryUsd > 0)) { pos.closed = false; close(pos, "restart-no-price", null, true); continue; }
    open.set(r.mint, pos);
    const left = r.entry_ts + HOLD_H * 3600 - nowS();
    if (left <= 0) close(pos, "time", r.entry_ts + HOLD_H * 3600, true); else setTimeout(() => close(pos, "time"), left * 1000);
  }
  if (open.size) console.log(`[p6] restored ${open.size} open position(s)`);
} catch (e) { console.error("[p6 restore]", e.message); }
console.log(`[p6] ${ENABLED ? "on" : "off"} — MC $${MIN_MC / 1e3}K–$${MAX_MC / 1e6}M · ≥ $${VOL5M / 1e3}K in 5 min · coin ≥ ${MIN_AGE_H} h old · exits A all at 2x / B ½ at 2x + 40% trail / C all at 3x, −40% stop, out if 5m vol < $${GOLDEN_USD / 1e3}K · old ½-at-4x line kept · max ${HOLD_H} h`);
export { step as _step, close as _close, open as _open }; // tests
