// v0.18.69 Project 7 — "slow sleepers" (owner, 17 Oct 19:25–19:33). A coin at least 6 h old, $300K–$1.5M, that trades ≥ $50K in each of
// three back-to-back minutes (1-minute volume checked at the first sighting, +1 min and +2 min), and whose holders look
// clean on GMGN just before buying: top 10 hold < 20%, dev (creator / dev team) holds < 5%, bundle wallets hold < 15%. Any Solana DEX (our feed
// or GMGN, incl. Meteora). Paper buy, three exits recorded side by side: all at 2x · all at 3x · all at 4x — each with a −40% stop, and all three
// sell what is left when the volume dies down (5-min volume < $15K). No time limit. After the exit the coin is watched for 24 h more and the highest
// price reached is recorded (p7_after_peak) — "how high it actually went".
import { db, q } from "./db.js";
import { on, links, esc, fmt } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { tg } from "./telegram.js";
import { solUsdCached } from "./price.js";
import { gmgnInfoNow, gmgnFor, gmgnV5, gmgnV1 } from "./gmgn.js";
import { momSnap } from "./momentum.js";

const E = (k, d) => Number(process.env[k] || d);
const MIN_MC = E("P7_MIN_MC", 300_000), MAX_MC = E("P7_MAX_MC", 1_500_000), VOL1 = E("P7_VOL1M_USD", 20_000) /* v0.18.73 owner 17 Oct 21:02: $20K a minute, 3 minutes in a row (was $50K) */, MIN_AGE_H = E("P7_MIN_AGE_H", 6);
const TOP10 = E("P7_TOP10", 0.20), DEV = E("P7_DEV", 0.05), BUNDLE = E("P7_BUNDLE", 0.15), GOLDEN = E("P7_GOLDEN_USD", 15_000), STOP = 0.6;
const ENABLED = process.env.P7_ENABLED === "1", AFTER_S = 86400, NO_DATA_S = 6 * 3600, REPEAT_S = 86400; // v0.18.88: no new P7 entries — folded into Project 6 v3 as flags (P7_ENABLED=1 turns it back on); open positions and the 24 h after-watch still run
export const P7_VOL1 = VOL1;
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);

for (const c of ["p6_low REAL", "p6_low_ts INTEGER", "p6_peak_ts INTEGER", "p6_last REAL", "x_p7_2 REAL", "x_p7_3 REAL", "x_p7_4 REAL", "p7_json TEXT", "p7_state TEXT", "p7_after_peak REAL", "p7_after_ts INTEGER"] /* v0.18.82: own columns on a fresh database */) { try { db.exec(`ALTER TABLE paper_trades ADD COLUMN ${c}`); } catch {} }
const qRecent = db.prepare(`SELECT 1 FROM paper_trades WHERE strategy='p7' AND mint=? AND (closed=0 OR exit_ts > ?) LIMIT 1`);
const qSave = db.prepare(`UPDATE paper_trades SET peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p7_state=?, peak_mc=? WHERE id=?`);
const qClose = db.prepare(`UPDATE paper_trades SET closed=1, exit_ts=?, exit_reason=?, x_p7_2=?, x_p7_3=?, x_p7_4=?, peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p7_state=? WHERE id=?`);
const qAfter = db.prepare(`UPDATE paper_trades SET p7_after_peak=?, p7_after_ts=? WHERE id=?`);
const qOpen = db.prepare(`SELECT * FROM paper_trades WHERE strategy='p7' AND COALESCE(invalid,0)=0 AND (closed=0 OR exit_ts > ?)`);

export const p7 = { seen: 0, watching: 0, streakFail: 0, mcOut: 0, young: 0, noAge: 0, noGmgn: 0, top10: 0, dev: 0, bundle: 0, bought: 0, closes: 0 };
const watch = new Map(); // mint -> { t0, c }
const open = new Map();  // mint -> pos
const after = new Map(); // mint -> pos (closed, still watched for 24 h)
const nowS = () => Math.floor(Date.now() / 1000);
const pct = (v) => (v == null ? "?" : `${(v * 100).toFixed(1)}%`);

async function dsInfo(mint) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const ps = (j.pairs || []).filter((p) => p.chainId === "solana"); if (!ps.length) return null;
  const b = ps.reduce((a, c) => ((c.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? c : a));
  return { usd: Number(b.priceUsd) || null, mc: Number(b.marketCap || b.fdv) || null, created: b.pairCreatedAt ? Math.floor(b.pairCreatedAt / 1000) : null, dex: b.dexId, liq: b.liquidity?.usd ?? null, m5: b.volume?.m5 ?? null, name: b.baseToken?.name, symbol: b.baseToken?.symbol };
}
// 5-minute volume from every source we have: our feed (if it trades the coin), GMGN's 5m list (≤ 2 min old), else DexScreener's m5
async function vol5(mint, feedOnly = false) {
  const s = momSnap(mint), f = s && nowS() - (s.lastTs || 0) < 300 ? s.v5 : null, g = gmgnV5(mint, 120);
  if (f != null || g != null) return Math.max(f || 0, g || 0);
  if (feedOnly) return null;
  const d = await dsInfo(mint).catch(() => null); return d?.m5 != null ? Number(d.m5) : null;
}

// 1-minute volume: our feed's last 60 s (if it trades the coin) and GMGN's 1m list (≤ 20 s old) — the larger; null if neither sees it
function vol1(mint) {
  const s = momSnap(mint), f = s && nowS() - (s.lastTs || 0) < 60 ? s.v1 : null, g = gmgnV1(mint, 20);
  return f != null || g != null ? Math.max(f || 0, g || 0) : null;
}
/** every ≥ $20K/1m sighting (momentum.js swaps, gmgn.js 1m rows): starts a 3-minute watch — checks again at +1 and +2 min */
export function p7Observe(c) {
  if (!ENABLED || !c?.mint || NOT_COINS.has(c.mint) || !(c.v1 >= VOL1)) return;
  if (watch.has(c.mint) || open.has(c.mint)) return;
  if (!(c.mc >= MIN_MC && c.mc <= MAX_MC)) return;
  if (qRecent.get(c.mint, nowS() - REPEAT_S)) return;
  p7.seen++; const w = { t0: nowS(), c }; watch.set(c.mint, w); p7.watching = watch.size;
  const check = async (n) => {
    try {
      const v = vol1(c.mint);
      if (!(v >= VOL1)) { watch.delete(c.mint); p7.watching = watch.size; p7.streakFail++; return; }
      if (n === 1) return void setTimeout(() => check(2), 60_000);
      watch.delete(c.mint); p7.watching = watch.size; const v5 = await vol5(c.mint); await buy(c, v5 ?? v, v);
    } catch (e) { watch.delete(c.mint); p7.watching = watch.size; console.error("[p7]", e.message); }
  };
  setTimeout(() => check(1), 60_000);
}

async function buy(c, v5, v1 = null) {
  const ds = await dsInfo(c.mint).catch(() => null);
  const meta = (() => { try { return q.tokenMeta.get(c.mint); } catch { return null; } })();
  const created = meta?.create_ts || c.created || ds?.created || null, ts = nowS();
  if (!created) { p7.noAge++; return; }
  const ageS = ts - created; if (ageS < MIN_AGE_H * 3600) { p7.young++; return; }
  const usd = ds?.usd || c.usd || (c.price > 0 ? c.price * solUsdCached() : null), mc = ds?.mc || c.mc;
  if (!(usd > 0) || !(mc >= MIN_MC && mc <= MAX_MC)) { p7.mcOut++; return; }
  if (open.has(c.mint) || qRecent.get(c.mint, ts - REPEAT_S)) return;
  // holder check on GMGN, right before the buy
  const g = await gmgnInfoNow(c.mint).catch(() => null); const st = g?.info?.stat || {}, row = gmgnFor(c.mint) || {};
  const top10 = st.top_10_holder_rate ?? g?.sec?.top_10_holder_rate ?? row.top_10_holder_rate ?? null;
  const dev = Math.max(Number(st.creator_hold_rate) || 0, Number(st.dev_team_hold_rate) || 0, Number(g?.sec?.creator_balance_rate) || 0);
  const bundle = row.bundler_rate != null ? Number(row.bundler_rate) : st.top_bundler_trader_percentage != null ? Number(st.top_bundler_trader_percentage) : null;
  const bundleSrc = row.bundler_rate != null ? "gmgn list (bundler hold)" : st.top_bundler_trader_percentage != null ? "gmgn info (bundler share)" : null;
  if (!g || top10 == null || bundle == null) { p7.noGmgn++; return; }
  if (!(Number(top10) < TOP10)) { p7.top10++; return; }
  if (!(dev < DEV)) { p7.dev++; return; }
  if (!(bundle < BUNDLE)) { p7.bundle++; return; }
  const name = meta?.name || c.name || ds?.name || c.mint.slice(0, 8), symbol = meta?.symbol || c.symbol || ds?.symbol || "";
  const r = q.insMom.run(c.mint, name, symbol, ts, mc, usd, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null, meta?.has_socials ?? null, meta?.socials ?? null, v5, null, null, null, ageS, 0, 1, mc);
  const id = r.lastInsertRowid;
  const info = { source: c.source, ageH: +(ageS / 3600).toFixed(1), v5: Math.round(v5), v1: v1 != null ? Math.round(v1) : null, firstV1: Math.round(c.v1), top10: +Number(top10).toFixed(4), dev: +dev.toFixed(4), bundle: +bundle.toFixed(4), bundleSrc,
    holders: g?.info?.holder_count ?? null, snipers: g?.info?.wallet_tags_stat?.sniper_wallets ?? null, fresh: st.fresh_wallet_rate ?? null, insider: g?.sec?.suspected_insider_hold_rate ?? null, rug: row.rug_ratio ?? null, dex: ds?.dex ?? c.exchange ?? null, liq: ds?.liq ?? null };
  try { q.setStrategy.run("p7", id); q.setVenue.run(c.venue || (c.source === "gmgn" ? `gmgn:${c.exchange || "?"}` : "feed"), id); q.setVolEntry.run(v5, id); db.prepare(`UPDATE paper_trades SET p7_json=?, gmgn_entry=? WHERE id=?`).run(JSON.stringify(info), JSON.stringify({ ts, info: g?.info ?? null, sec: g?.sec ?? null }).slice(0, 20000), id); } catch (e) { console.error("[p7 save]", e.message); }
  const pos = { id: Number(id), mint: c.mint, name, entryTs: ts, entryMc: mc, entryUsd: usd, peak: 1, low: 1, peakTs: ts, lowTs: ts, last: 1, lastTs: ts, feed: c.source === "feed", x: {}, saved: 0 };
  open.set(c.mint, pos); p7.bought++;
  tg(`🐢 <b>P7 SLOW SLEEPER</b> — ${esc(name)} ($${esc(symbol)})\n${(ageS / 86400 >= 1 ? (ageS / 86400).toFixed(1) + " days" : (ageS / 3600).toFixed(1) + " h")} old · MC <b>$${fmt(mc)}</b> · $${fmt(VOL1)}+ in each of 3 minutes in a row (5-min vol $${fmt(v5)})\ntop 10 ${pct(Number(top10))} · dev ${pct(dev)} · bundle ${pct(bundle)}\nPaper: sell at 2x / 3x / 4x · −40% stop · out when 5-min volume &lt; $${fmt(GOLDEN)}\n${links(c.mint)}\n<code>${c.mint}</code>`);
}

function step(pos, usd, ts) {
  if (!(usd > 0)) return;
  const m = usd / pos.entryUsd; if (!(m > 0) || !isFinite(m)) return;
  if (pos.closed) { if (m > (pos.afterPeak || 0)) { pos.afterPeak = m; pos.afterTs = ts; pos.afterDirty = true; } return; }
  pos.last = m; pos.lastTs = ts;
  if (m > pos.peak) { pos.peak = m; pos.peakTs = ts; }
  if (m < pos.low) { pos.low = m; pos.lowTs = ts; }
  const x = pos.x;
  for (const [k, t] of [["x2", 2], ["x3", 3], ["x4", 4]]) if (x[k] == null) { if (m >= t) x[k] = t; else if (m <= STOP) x[k] = m; }
  if (x.x2 != null && x.x3 != null && x.x4 != null) return close(pos, m <= STOP ? "stop" : "targets");
  if (ts - pos.saved >= 15) { pos.saved = ts; save(pos); }
}
const state = (p) => JSON.stringify({ entryUsd: p.entryUsd, feed: p.feed, x: p.x, peak: p.peak, low: p.low });
function save(p) { try { qSave.run(p.peak, p.low, p.lowTs, p.peakTs, p.last, state(p), p.entryMc * p.peak, p.id); } catch {} }
function close(pos, reason, quiet = false) {
  if (pos.closed) return; pos.closed = true; open.delete(pos.mint); p7.closes++;
  const m = pos.last, x = pos.x, a = x.x2 ?? m, b = x.x3 ?? m, c = x.x4 ?? m;
  try { qClose.run(nowS(), reason, a, b, c, pos.peak, pos.low, pos.lowTs, pos.peakTs, m, state(pos), pos.id); } catch (e) { console.error("[p7 close]", e.message); }
  pos.closeTs = nowS(); pos.afterPeak = m; pos.afterTs = pos.closeTs; after.set(pos.mint, pos);
  if (quiet) return;
  tg(`${a >= 1 ? "✅" : "🔴"} <b>P7 CLOSE</b> — ${esc(pos.name)} (${reason === "golden" ? "volume died down" : reason === "stop" ? "−40% stop" : reason === "targets" ? "all targets done" : reason})\n2x exit <b>${a.toFixed(2)}x</b> · 3x exit <b>${b.toFixed(2)}x</b> · 4x exit <b>${c.toFixed(2)}x</b>\npeak ${pos.peak.toFixed(2)}x · low ${pos.low.toFixed(2)}x · now ${m.toFixed(2)}x · watching how high it goes for 24 h`);
}

on("trade", (t, tr) => { if (!(tr?.price > 0)) return; const p = open.get(t.mint) || after.get(t.mint); if (p) { if (!p.closed) p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });
onSwap((tr) => { if (!(tr.price > 0)) return; const p = open.get(tr.mint) || after.get(tr.mint); if (p) { if (!p.closed) p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });

// every 20 s: DexScreener price for quiet / Meteora coins, the volume rule, the no-data guard; after-exit watch saved and expired
let busy = false;
setInterval(async () => {
  if (busy || (!open.size && !after.size)) return; busy = true;
  try {
    const n = nowS();
    for (const p of [...open.values()]) {
      let dsV = null;
      if (n - p.lastTs >= 45) { const d = await dsInfo(p.mint).catch(() => null); if (d?.usd > 0) step(p, d.usd, n); dsV = d?.m5 ?? null; }
      if (p.closed) continue;
      if (n - p.entryTs >= 60) {
        let v = await vol5(p.mint, true); if (v == null && p.feed) v = 0; if (v == null) v = dsV;
        if (v != null && v < GOLDEN) { const m = p.last, x = p.x; x.gr = m; x.grV = Math.round(v); for (const k of ["x2", "x3", "x4"]) if (x[k] == null) x[k] = m; close(p, "golden"); continue; }
      }
      if (n - p.lastTs > NO_DATA_S) close(p, "no price data 6 h");
    }
    for (const p of [...after.values()]) {
      if (n - p.closeTs > AFTER_S) { after.delete(p.mint); try { qAfter.run(p.afterPeak, p.afterTs, p.id); } catch {} continue; }
      if (n - (p.afterPoll || 0) >= 60 && n - (p.lastTs || 0) >= 45) { p.afterPoll = n; const d = await dsInfo(p.mint).catch(() => null); if (d?.usd > 0) step(p, d.usd, n); }
      if (p.afterDirty) { p.afterDirty = false; try { qAfter.run(p.afterPeak, p.afterTs, p.id); } catch {} }
    }
  } catch (e) { console.error("[p7 poll]", e.message); } finally { busy = false; }
}, 20_000);

// v0.18.70 website "sell 100%": every exit not yet hit is sold at the current price, then the 24 h after-watch starts
export function p7ManualSell(id) {
  for (const p of open.values()) if (p.id === id) { const m = p.last; for (const k of ["x2", "x3", "x4"]) if (p.x[k] == null) p.x[k] = m; close(p, "manual"); return { ok: true, mult: m, sold: 1 }; }
  return null;
}
export const p7Open = () => [...open.values()].map((p) => ({ id: p.id, mint: p.mint, name: p.name, entryTs: p.entryTs, entryMc: p.entryMc, mult: p.last, peak: p.peak, low: p.low, x: p.x }));

// restart: open positions keep running; closed ones inside their 24 h after-watch keep being watched
try {
  for (const r of qOpen.all(nowS() - AFTER_S)) {
    let s = {}; try { s = JSON.parse(r.p7_state || "{}"); } catch {}
    const pos = { id: r.id, mint: r.mint, name: r.name, entryTs: r.entry_ts, entryMc: r.entry_mc, entryUsd: s.entryUsd || r.entry_price, peak: Math.max(s.peak || 1, r.peak_mult || 1), low: Math.min(s.low || 1, r.p6_low || 1),
      peakTs: r.p6_peak_ts || r.entry_ts, lowTs: r.p6_low_ts || r.entry_ts, last: r.p6_last || 1, lastTs: nowS(), feed: !!s.feed, x: s.x || {}, saved: 0 };
    if (!(pos.entryUsd > 0)) continue;
    if (r.closed) { pos.closed = true; pos.closeTs = r.exit_ts; pos.afterPeak = Math.max(r.p7_after_peak || 0, r.p6_last || 0); pos.afterTs = r.p7_after_ts || r.exit_ts; after.set(r.mint, pos); }
    else open.set(r.mint, pos);
  }
  if (open.size || after.size) console.log(`[p7] restored ${open.size} open / ${after.size} after-watch`);
} catch (e) { console.error("[p7 restore]", e.message); }
console.log(`[p7] ${ENABLED ? "on" : "off"} — ≥ ${MIN_AGE_H} h old · MC $${MIN_MC / 1e3}K–$${MAX_MC / 1e6}M · $${VOL1 / 1e3}K+ in each of 3 back-to-back minutes · top 10 < ${TOP10 * 100}% · dev < ${DEV * 100}% · bundle < ${BUNDLE * 100}% · exits 2x / 3x / 4x, −40% stop, out when 5m vol < $${GOLDEN / 1e3}K · no time limit · 24 h after-watch`);
export { step as _step, close as _close, open as _open, watch as _watch, buy as _buy };
