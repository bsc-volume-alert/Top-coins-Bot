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
// v0.18.66 (owner, 17 Oct 19:11): three volume levels as separate paper trades — $60K, $80K and $100K in 5 min (p6_tier) — so the levels can be
// compared; minimum age back to 6 h (age is recorded, 6–12 h vs 12 h+ compared later). GMGN's token info + security snapshot is stored at every
// entry (gmgn_entry: holders, top 10, dev hold / history, bundler / insider / sniper shares, fresh wallets, rug score) for the 50–60-trade review.
// v0.18.88 P6 v3 (owner, 18 Oct 14:07 UK, after the 18-h wake-up review): coin 6–72 h old, $300K–$600K, 5-min volume ≥ $60K AND ≥ 10% of market cap,
// buys ≥ sells, one entry per coin per 24 h. Exit built for hours: −40% stop until 2x · at 2x sell half · the rest on a 50% trailing stop from the
// peak · 6 h limit · NO golden rule (the $15K rule was 3.6% of these coins' market cap and closed 8 of 11 inside two hours; where it would have sold
// is still recorded as a what-if). A / B / C / old exits keep being recorded on the same coins. Project 7 folded in: its "sustained volume" (1-min
// volume at entry, +60 s, +120 s) and "holders clean" (GMGN top 10 < 20%, dev < 5%, bundle < 15%) become flags on every P6 trade (p6_flags).
import { CFG } from "./config.js";
import { watch as afterWatch, tick as afterTick } from "./aftercare.js"; // v0.18.88: 24 h after-watch for P6 too ("how high after we sold")
import { db, q } from "./db.js";
import { on, links, esc, fmt } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { tg } from "./telegram.js";
import { solUsdCached } from "./price.js";
import { gmgnEntry, gmgnV5, gmgnV1, gmgnInfoNow, gmgnFor } from "./gmgn.js"; // v0.18.88 gmgnV1 / gmgnInfoNow / gmgnFor for the P7 flags
import { momSnap } from "./momentum.js"; // v0.18.65 golden rule needs our feed's 5-min volume
import { volP6 } from "./vollog.js"; // v0.18.62 every decision goes on the coin's volume-log line

const MIN_MC = Number(process.env.P6_MIN_MC || 300_000), MAX_MC = Number(process.env.P6_MAX_MC || 600_000); // v0.18.88: was 1.5M
const TIERS = String(process.env.P6_TIERS || "60000").split(",").map(Number).filter((x) => x > 0).sort((a, b) => a - b); // v0.18.88: one trade per coin (was 60/80/100K as separate trades)
const VOL5M = TIERS[0], MIN_AGE_H = Number(process.env.P6_MIN_AGE_H || 6), HOLD_H = Number(process.env.P6_HOLD_H || 6); // v0.18.88: 6 h (was 24)
const MAX_AGE_H = Number(process.env.P6_MAX_AGE_H || 72), MIN_VR = Number(process.env.P6_MIN_VR || 0.10), V3 = process.env.P6_V3 !== "0", TRAIL = 0.5, V2_HOLD_H = 24; // v0.18.88 (v2 positions still open keep their 24 h)
const holdH = (pos) => (pos.v3 ? HOLD_H : V2_HOLD_H);
const P7_V1 = Number(process.env.P7_VOL1M_USD || 20_000), P7_TOP10 = Number(process.env.P7_TOP10 || 0.20), P7_DEV = Number(process.env.P7_DEV || 0.05), P7_BUNDLE = Number(process.env.P7_BUNDLE || 0.15); // v0.18.88 P7 folded in (flags only)
const ENABLED = process.env.P6_ENABLED !== "0";
export const P6_VOL = VOL5M;
const GOLDEN_USD = Number(process.env.P6_GOLDEN_USD || 15_000), STOP = 0.6;
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);

for (const c of ["p6_tier INTEGER", "x_p6a REAL", "x_p6b REAL", "x_p6c REAL", "x_p6 REAL", "p6_low REAL", "p6_low_ts INTEGER", "p6_peak_ts INTEGER", "p6_last REAL", "p6_state TEXT", "x_p6v3 REAL", "p6_flags TEXT"]) { try { db.exec(`ALTER TABLE paper_trades ADD COLUMN ${c}`); } catch {} }
const qRecent = db.prepare(`SELECT 1 FROM paper_trades WHERE strategy='p6' AND mint=? AND entry_ts > ? AND COALESCE(p6_tier,100000)=? LIMIT 1`);
const qTier = db.prepare(`UPDATE paper_trades SET p6_tier=? WHERE id=?`);
const qSave = db.prepare(`UPDATE paper_trades SET peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=?, peak_mc=? WHERE id=?`);
const qClose = db.prepare(`UPDATE paper_trades SET closed=1, exit_ts=?, exit_reason=?, x_p6a=?, x_p6b=?, x_p6c=?, x_p6=?, x_t15s40=?, x_tsl60=?, x_h2t40=?, peak_mult=?, p6_low=?, p6_low_ts=?, p6_peak_ts=?, p6_last=?, p6_state=?, x_p6v3=? WHERE id=?`);
const qFlags = db.prepare(`UPDATE paper_trades SET p6_flags=? WHERE id=?`); // v0.18.88
const qOpen = db.prepare(`SELECT id, mint, name, p6_tier, entry_ts, entry_mc, entry_price, peak_mult, p6_low, p6_low_ts, p6_peak_ts, p6_last, p6_state FROM paper_trades WHERE strategy='p6' AND closed=0 AND COALESCE(invalid,0)=0`);

export const p6 = { byTier: {}, candidates: 0, entries: 0, closes: 0, young: 0, old: 0, lowVr: 0, noAge: 0, sellHeavy: 0, outOfRange: 0, repeat: 0, bySource: { feed: 0, gmgn: 0 } };
const open = new Map(); // `${mint}|${tier}` -> pos (v0.18.66: one position per coin per volume level)
const after = new Map(); // v0.18.88: mint -> { closeTs, feed } — closed v3 coins our feed does not price are polled once a minute for the 24 h after-watch
const checked = new Map(); // `${mint}|${tier}` -> ms of last check (one look per coin per level per 10 min)
const K = (mint, tier) => `${mint}|${tier}`;
const posOf = (mint) => TIERS.map((t) => open.get(K(mint, t))).filter(Boolean);
const nowS = () => Math.floor(Date.now() / 1000);

// DexScreener: best pair by liquidity — USD price, market cap, pool age, recent volume / price change (how quiet it was before)
async function dsInfo(mint) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const ps = (j.pairs || []).filter((p) => p.chainId === "solana"); if (!ps.length) return null;
  const b = ps.reduce((a, c) => ((c.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? c : a));
  return { usd: Number(b.priceUsd) || null, mc: Number(b.marketCap || b.fdv) || null, created: b.pairCreatedAt ? Math.floor(b.pairCreatedAt / 1000) : null, dex: b.dexId, liq: b.liquidity?.usd ?? null,
    vol: b.volume || null, chg: b.priceChange || null, txm5: b.txns?.m5 || null, name: b.baseToken?.name, symbol: b.baseToken?.symbol, pairs: ps.length,
    m5all: ps.reduce((a, p) => a + (Number(p.volume?.m5) || 0), 0) }; // v0.18.72: 5-min volume across every pool
}

// called by momentum.js on every swap once our feed sees ≥ $100K in 5 min, and by gmgn.js for every coin on GMGN's 5-minute list
// v0.18.88: candidates need 5-min volume ≥ $60K AND ≥ 10% of market cap (0% of the 18-h wake-ups under 10% ever doubled)
const usdK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round((v || 0) / 1e3)}K`);
const MC_LO = `MC under ${usdK(MIN_MC)}`, MC_HI = `MC over ${usdK(MAX_MC)}`;
export function p6Candidate(c) {
  if (!c?.mint || NOT_COINS.has(c.mint)) return;
  if (!(c.v5 >= VOL5M)) return;
  if (!ENABLED) return volP6(c.mint, "P6 off");
  if (!(c.mc >= MIN_MC && c.mc <= MAX_MC)) return c.mc > 0 ? volP6(c.mint, c.mc > MAX_MC ? MC_HI : MC_LO, `MC ${usdK(c.mc)}`) : volP6(c.mint, "MC unknown");
  if (!(c.v5 >= MIN_VR * c.mc)) { p6.lowVr++; return volP6(c.mint, `volume under ${Math.round(MIN_VR * 100)}% of MC`, `${usdK(c.v5)} on ${usdK(c.mc)}`); } // v0.18.88
  for (const tier of TIERS) { // v0.18.66: each level the coin has reached is its own trade
    if (!(c.v5 >= tier)) break;
    const key = K(c.mint, tier); if (open.has(key)) { volP6(c.mint, "already holding"); continue; }
    const t = Date.now(), last = checked.get(key); if (last && t - last < 600_000) continue;
    checked.set(key, t); if (checked.size > 30000) checked.delete(checked.keys().next().value);
    p6.candidates++;
    if (qRecent.get(c.mint, nowS() - 86400, tier)) { p6.repeat++; volP6(c.mint, "bought in last 24 h"); continue; }
    if (c.bu != null && c.su != null && c.su > 0 && c.bu < c.su) { p6.sellHeavy++; volP6(c.mint, "more sells", `${usdK(c.bu)} in / ${usdK(c.su)} out`); continue; } // our feed: buy $ ≥ sell $ in the 5-min window
    if (c.buys != null && c.sells != null && c.buys < c.sells) { p6.sellHeavy++; volP6(c.mint, "more sells", `${c.buys} buys / ${c.sells} sells`); continue; }  // GMGN: more buys than sells (counts)
    enter(c, tier).catch((e) => { console.error("[p6]", e.message); volP6(c.mint, "error", String(e.message).slice(0, 80)); });
  }
}

// v0.18.88 P7's readings, reused as flags: 1-minute volume = the larger of our feed's last 60 s (if it trades the coin) and GMGN's 1m list (≤ 20 s old)
function vol1(mint) { const s = momSnap(mint), f = s && nowS() - (s.lastTs || 0) < 60 ? s.v1 : null, g = gmgnV1(mint, 20); return f != null || g != null ? Math.round(Math.max(f || 0, g || 0)) : null; }
async function holderFlags(mint) {
  const g = await gmgnInfoNow(mint).catch(() => null); const st = g?.info?.stat || {}, row = gmgnFor(mint) || {};
  const top10 = st.top_10_holder_rate ?? g?.sec?.top_10_holder_rate ?? row.top_10_holder_rate ?? null;
  const dev = Math.max(Number(st.creator_hold_rate) || 0, Number(st.dev_team_hold_rate) || 0, Number(g?.sec?.creator_balance_rate) || 0);
  const bundle = row.bundler_rate != null ? Number(row.bundler_rate) : st.top_bundler_trader_percentage != null ? Number(st.top_bundler_trader_percentage) : null;
  const known = !!g && top10 != null && bundle != null;
  return { top10: top10 != null ? +Number(top10).toFixed(4) : null, dev: g ? +dev.toFixed(4) : null, bundle: bundle != null ? +bundle.toFixed(4) : null, holders: g?.info?.holder_count ?? null,
    clean: known ? (Number(top10) < P7_TOP10 && dev < P7_DEV && bundle < P7_BUNDLE ? 1 : 0) : null };
}
const dsCache = new Map(); // mint -> { t, d } (one DexScreener look per coin per 20 s across levels)
async function dsCached(mint) { const x = dsCache.get(mint); if (x && Date.now() - x.t < 20_000) return x.d; const d = await dsInfo(mint).catch(() => null); dsCache.set(mint, { t: Date.now(), d }); if (dsCache.size > 2000) dsCache.delete(dsCache.keys().next().value); return d; }
async function enter(c, tier) {
  const key = K(c.mint, tier);
  const ds = await dsCached(c.mint);
  const meta = (() => { try { return q.tokenMeta.get(c.mint); } catch { return null; } })();
  const created = meta?.create_ts || c.created || ds?.created || null, ts = nowS();
  if (!created) { p6.noAge++; return volP6(c.mint, "age unknown"); }
  const ageS = ts - created; if (ageS < MIN_AGE_H * 3600) { p6.young++; return volP6(c.mint, "too young", `${(ageS / 3600).toFixed(1)} h old`, { created }); }
  if (ageS > MAX_AGE_H * 3600) { p6.old++; return volP6(c.mint, "too old", `${(ageS / 86400).toFixed(1)} days old`, { created }); } // v0.18.88
  const usd = c.usd || ds?.usd || (c.price > 0 ? c.price * solUsdCached() : null);
  const mc = c.mc || ds?.mc; if (!(usd > 0) || !(mc > 0)) return volP6(c.mint, "no price", null, { created });
  if (!(mc >= MIN_MC && mc <= MAX_MC)) { p6.outOfRange++; return volP6(c.mint, mc > MAX_MC ? MC_HI : MC_LO, `MC ${usdK(mc)}`, { created }); }
  if (!(c.v5 >= MIN_VR * mc)) { p6.lowVr++; return volP6(c.mint, `volume under ${Math.round(MIN_VR * 100)}% of MC`, `${usdK(c.v5)} on ${usdK(mc)}`, { created }); } // v0.18.88 re-check with the final MC
  if (open.has(key) || qRecent.get(c.mint, ts - 86400, tier)) return;
  const name = meta?.name || c.name || ds?.name || c.mint.slice(0, 8), symbol = meta?.symbol || c.symbol || ds?.symbol || "";
  const r = q.insMom.run(c.mint, name, symbol, ts, mc, usd, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null, meta?.has_socials ?? null, meta?.socials ?? null, c.v5, null, null, null, ageS, 0, 1, mc);
  const id = r.lastInsertRowid;
  try { q.setStrategy.run("p6", id); qTier.run(tier, id); q.setVenue.run(c.venue || (c.source === "gmgn" ? `gmgn:${c.exchange || "?"}` : "feed"), id); q.setVolEntry.run(c.v5, id); } catch {}
  const info = { tier, source: c.source, ageH: +(ageS / 3600).toFixed(1), v5: Math.round(c.v5), bu: c.bu ?? null, su: c.su ?? null, buys: c.buys ?? null, sells: c.sells ?? null, exchange: c.exchange ?? null,
    ds: ds ? { dex: ds.dex, liq: ds.liq, vol: ds.vol, chg: ds.chg, txm5: ds.txm5, pairs: ds.pairs } : null };
  try { q.setEarly.run(JSON.stringify(info), id); } catch {}
  gmgnEntry(c.mint, id);
  const pos = { id, key, tier, mint: c.mint, name, entryTs: ts, entryMc: mc, entryUsd: usd, peak: 1, low: 1, peakTs: ts, lowTs: ts, last: 1, lastTs: ts, half4: false, h2: false, b2: false, feed: c.source === "feed", v2: true, v3: V3, half2: false, x: {}, manual: null, saved: 0 };
  try { afterWatch(c.mint, id, usd / Math.max(solUsdCached(), 1), mc, null, null, null, ts); } catch {} // v0.18.88: 24 h after-watch (feed ticks are SOL prices → entry in SOL terms)
  // v0.18.88 P7 folded in as flags (they never block the buy): sustained = 1-min volume ≥ $20K at entry, +60 s and +120 s (P7's "3 minutes in a row");
  // clean = GMGN holders right now: top 10 < 20%, dev < 5%, bundle < 15% (P7's holder check). Both land in p6_flags for the 30-coin review.
  const flags = { src: c.source, vr: +(c.v5 / mc).toFixed(3), v1: [vol1(c.mint) ?? (c.v1 != null ? Math.round(c.v1) : null)] };
  const saveFlags = () => { try { qFlags.run(JSON.stringify(flags), id); } catch {} }; saveFlags();
  for (const d of [60, 120]) setTimeout(() => { flags.v1.push(vol1(c.mint)); if (flags.v1.length === 3) flags.sustained = flags.v1.some((v) => v == null) ? null : flags.v1.every((v) => v >= P7_V1) ? 1 : 0; saveFlags(); }, d * 1000);
  holderFlags(c.mint).then((h) => { Object.assign(flags, h); saveFlags(); }).catch(() => {});
  open.set(key, pos); p6.entries++; p6.byTier[tier] = (p6.byTier[tier] || 0) + 1; p6.bySource[c.source] = (p6.bySource[c.source] || 0) + 1;
  volP6(c.mint, "bought", `@$${tier / 1000}K · ${(ageS / 3600).toFixed(1)} h old · MC ${usdK(mc)}`, { created, id: Number(id) });
  setTimeout(() => close(pos, "time"), holdH(pos) * 3600_000);
  const quiet = ds?.vol ? ` · 24h vol $${fmt(ds.vol.h24 || 0)} · 6h $${fmt(ds.vol.h6 || 0)} · 1h $${fmt(ds.vol.h1 || 0)}` : "";
  if (tier !== TIERS[0]) return tg(`🌅 P6 @$${tier / 1000}K — ${esc(name)} hit $${fmt(c.v5)} in 5 min · MC $${fmt(mc)} · paper trade at this level too`);
  tg(`🌅 <b>P6 SLEEPER WAKES @$${tier / 1000}K</b> — ${esc(name)} ($${esc(symbol)})\n${(ageS / 86400 >= 1 ? (ageS / 86400).toFixed(1) + " days" : (ageS / 3600).toFixed(1) + " h")} old · MC <b>$${fmt(mc)}</b> · 5m vol $${fmt(c.v5)} · seen by ${c.source === "gmgn" ? "GMGN" : "our feed"}${ds?.dex ? " · " + esc(ds.dex) : ""}${quiet}\nPaper v3: −40% stop until 2x · half at 2x · rest trails 50% from the peak · ${HOLD_H} h limit · no golden rule (A / B / C / old exits recorded alongside)\n${links(c.mint)}\n<code>${c.mint}</code>`);
}

function step(pos, usd, ts) {
  if (!(usd > 0) || pos.closed) return;
  const m = usd / pos.entryUsd; if (!(m > 0) || !isFinite(m)) return;
  pos.last = m; pos.lastTs = ts;
  if (m > pos.peak) { pos.peak = m; pos.peakTs = ts; }
  if (m < pos.low) { pos.low = m; pos.lowTs = ts; }
  const x = pos.x;
  if (!pos.half4 && m >= 4) { pos.half4 = true; if (!pos.v3) tg(`🚀 <b>P6 HIT 4x</b> — ${esc(pos.name)} · half sold (paper) · MC $${fmt(pos.entryMc * m)} · rest rides`); }
  if (pos.v3) { // v0.18.88: −40% stop until 2x · half at 2x · rest trails 50% from the peak · (6 h limit via timer)
    if (!pos.half2) { if (m >= 2) { pos.half2 = true; pos.half2Ts = ts; save(pos); tg(`🚀 <b>P6 HIT 2x</b> — ${esc(pos.name)} · half sold (paper) · MC $${fmt(pos.entryMc * m)} · rest rides on a 50% trail from the peak`); } else if (m <= STOP) { stepWhatIfs(pos, m); return close(pos, "stop"); } }
    else if (m <= TRAIL * pos.peak) { stepWhatIfs(pos, m); return close(pos, "trail"); }
  }
  stepWhatIfs(pos, m);
  if (m <= 0.1 * pos.peak) return close(pos, "dead");
  if (!pos.v3 && x.a != null && x.b != null && x.c != null) return close(pos, "done"); // v0.18.68: all three exits finished — nothing left to hold (v2 only)
  if (ts - pos.saved >= 15) { pos.saved = ts; save(pos); }
}
function stepWhatIfs(pos, m) { const x = pos.x;
  if (x.t15s40 == null) { if (m >= 1.5) x.t15s40 = 1.5; else if (m <= 0.6) x.t15s40 = m; }
  if (x.tsl60 == null && m <= 0.4 * pos.peak) x.tsl60 = m;
  if (x.h2t40 == null) { if (!pos.h2) { if (m >= 2) pos.h2 = true; else if (m <= 0.6) x.h2t40 = m; } if (pos.h2 && m <= 0.6 * pos.peak) x.h2t40 = 1 + 0.5 * m; }
  // v0.18.65 exits A / B / C (each with the −40% stop; the golden rule is checked every 20 s below)
  if (x.a == null) { if (m >= 2) x.a = 2; else if (m <= STOP) x.a = m; }
  if (x.c == null) { if (m >= 3) x.c = 3; else if (m <= STOP) x.c = m; }
  if (x.b == null) { if (!pos.b2) { if (m >= 2) pos.b2 = true; else if (m <= STOP) x.b = m; } if (pos.b2 && m <= 0.6 * pos.peak) x.b = 1 + 0.5 * m; }
}
const state = (pos) => JSON.stringify({ v2: pos.v2, v3: pos.v3, half2: pos.half2, half2Ts: pos.half2Ts, entryUsd: pos.entryUsd, half4: pos.half4, h2: pos.h2, b2: pos.b2, feed: pos.feed, x: pos.x, manual: pos.manual, peak: pos.peak, low: pos.low }); // v0.18.62 peak/low kept here too
function save(pos) { try { qSave.run(pos.peak, pos.low, pos.lowTs, pos.peakTs, pos.last, state(pos), pos.entryMc * pos.peak, pos.id); } catch {} }
const mainValue = (pos, m) => (pos.half4 ? 2 + 0.5 * m : m);
const v3Value = (pos, m) => (pos.half2 ? 1 + 0.5 * m : m); // v0.18.88: half banked at 2x (= 1.0 of the stake) + half at the current multiple
function close(pos, reason, exitTs = null, quiet = false) { // v0.18.62 exitTs/quiet: restart closes of rows past 24 h get entry + 24 h, no Telegram
  if (pos.closed) return; pos.closed = true; open.delete(pos.key); p6.closes++;
  if (pos.v3 && !quiet) after.set(pos.mint, { closeTs: nowS(), feed: pos.feed, entryTs: pos.entryTs });
  const m = pos.last, x = pos.x;
  let main = mainValue(pos, m); if (pos.manual) main = pos.manual.banked + (1 - pos.manual.sold) * main;
  let v3 = pos.v3 ? v3Value(pos, m) : null; if (v3 != null && pos.manual) v3 = pos.manual.banked + (1 - pos.manual.sold) * v3;
  const t15 = x.t15s40 ?? m, t60 = x.tsl60 ?? m, h2 = x.h2t40 ?? (pos.h2 ? 1 + 0.5 * m : m);
  const A = x.a ?? m, B = x.b ?? (pos.b2 ? 1 + 0.5 * m : m), Cx = x.c ?? m;
  try { qClose.run(exitTs || nowS(), reason, A, B, Cx, main, t15, t60, h2, pos.peak, pos.low, pos.lowTs, pos.peakTs, m, state(pos), v3, pos.id); } catch (e) { console.error("[p6 close]", e.message); }
  if (quiet) return;
  const head = v3 != null ? v3 : main;
  tg(`${head >= 1 ? "✅" : "🔴"} <b>P6 CLOSE</b> — ${esc(pos.name)} (${reason === "time" ? `${holdH(pos)} h limit` : reason === "dead" ? "fell 90% from peak" : reason === "trail" ? "50% trail from peak" : reason === "stop" ? "−40% stop" : reason})${v3 != null ? `\nv3 (½ at 2x, rest trails): <b>${v3.toFixed(2)}x</b>` : ""}\n\nA all at 2x: <b>${A.toFixed(2)}x</b> · B ½ at 2x + trail: <b>${B.toFixed(2)}x</b> · C all at 3x: <b>${Cx.toFixed(2)}x</b>${x.gr ? ` (golden rule at ${x.gr.toFixed(2)}x)` : ""}\npeak ${pos.peak.toFixed(2)}x · low ${pos.low.toFixed(2)}x · now ${m.toFixed(2)}x · old ½-at-4x: ${main.toFixed(2)}x`);
}

// prices: every trade our feed sees on an open P6 coin…
on("trade", (t, tr) => { if (!(tr?.price > 0) || !open.size) return; for (const p of posOf(t.mint)) { p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });
onSwap((tr) => { if (!(tr.price > 0) || !open.size) return; for (const p of posOf(tr.mint)) { p.feed = true; step(p, tr.price * solUsdCached(), tr.ts || nowS()); } });
// v0.18.65 golden rule: 5-min volume from our feed (coins it trades; no trades = $0), else GMGN's list (≤ 2 min old), else DexScreener's m5
function vol5(p) {
  // v0.18.72: DexScreener's total over every pool is the referee (17 Oct: frameXTV showed $7K on DexScreener while our feed's count of the pools it
  // reads stayed above $15K, so the golden rule never fired); our feed / GMGN only when DexScreener has not answered in the last 90 s
  if (p.dsAll != null && nowS() - p.dsAllTs < 90) { p.vSrc = "dexscreener"; return p.dsAll; }
  p.vSrc = "feed/gmgn";
  const s = momSnap(p.mint); if (p.feed) return s ? s.v5 : 0;
  const g = gmgnV5(p.mint, 120); if (g != null) return g;
  return p.dsV5 != null && nowS() - p.dsV5Ts < 90 ? p.dsV5 : null;
}
function golden(p) {
  if (p.closed || nowS() - p.entryTs < 60) return; const x = p.x; if (x.a != null && x.b != null && x.c != null) return;
  const v = vol5(p); if (v == null || v >= GOLDEN_USD) return;
  if (p.v3) { if (x.grWould == null) { x.grWould = p.last; x.grWouldTs = nowS(); x.grV = Math.round(v); save(p); } return; } // v0.18.88: v3 never sells on the old golden rule — only notes where it would have
  const m = p.last; x.gr = m; x.grV = Math.round(v); x.grSrc = p.vSrc;
  if (x.a == null) x.a = m; if (x.c == null) x.c = m; if (x.b == null) x.b = p.b2 ? 1 + 0.5 * m : m;
  save(p); close(p, "golden rule");
}
// v0.18.68 (owner, 17 Oct 19:20): trades opened before exits A / B / C existed are re-scored with them from their recorded high / low and when each
// happened. If the high came first: A = 2x if it reached 2x, C = 3x if it reached 3x, B banks half at 2x and the rest stops at 60% of the high
// if the later low went that far; a low of −40% or worse (before the high, or with no 2x / 3x) is the −40% stop. Exits not decided stay open
// for the live rules (incl. the golden rule). No volume history exists for those hours, so the golden rule can only apply from now on.
function retro(x, pk, pkTs, lo, loTs, flags) {
  const highFirst = (pkTs || 0) <= (loTs || 0), stop = lo <= STOP;
  if (x.a == null) { if (pk >= 2 && (highFirst || !stop)) x.a = 2; else if (stop) x.a = STOP; }
  if (x.c == null) { if (pk >= 3 && (highFirst || !stop)) x.c = 3; else if (stop) x.c = STOP; }
  if (x.b == null) {
    if (pk >= 2 && (highFirst || !stop)) { flags.b2 = true; if (highFirst && lo <= 0.6 * pk) x.b = 1 + 0.5 * 0.6 * pk; }
    else if (stop) x.b = STOP;
  }
  x.retro = 1; return x;
}
// …and DexScreener every 20 s for coins our feed hasn't priced in the last 45 s (Meteora, quiet coins)
let busy = false;
setInterval(async () => {
  if (busy || (!open.size && !after.size)) return; busy = true;
  try { for (const p of [...open.values()]) {
    if (!p.closed && (nowS() - p.lastTs >= 45 || nowS() - (p.dsAllTs || 0) >= 40)) { const d = await dsCached(p.mint);
      if (d?.usd > 0 && nowS() - p.lastTs >= 45) { step(p, d.usd, nowS()); try { afterTick(p.mint, d.usd / Math.max(solUsdCached(), 1), d.mc ?? null); } catch {} } // v0.18.88 after-watch sees DexScreener prices too
      if (d?.vol?.m5 != null) { p.dsV5 = Number(d.vol.m5); p.dsV5Ts = nowS(); }
      if (d?.m5all != null) { p.dsAll = d.m5all; p.dsAllTs = nowS(); } }
    golden(p); }
    // v0.18.88: closed v3 coins the feed never priced — one DexScreener look a minute for the rest of the 24 h after-watch
    for (const [mint, a] of [...after.entries()]) {
      if (nowS() - a.entryTs > CFG.AFTER_CLOSE_H * 3600) { after.delete(mint); continue; }
      if (a.feed || nowS() - (a.poll || 0) < 60) continue; a.poll = nowS();
      const d = await dsCached(mint); if (d?.usd > 0) { try { afterTick(mint, d.usd / Math.max(solUsdCached(), 1), d.mc ?? null); } catch {} }
    } }
  catch (e) { console.error("[p6 poll]", e.message); } finally { busy = false; }
}, 20_000);

// website "sell" buttons (paper)
export function p6ManualSell(id, pct) {
  for (const p of open.values()) {
    if (p.id !== id) continue;
    const prev = p.manual || { banked: 0, sold: 0 }, take = Math.min(pct, 1 - prev.sold); if (take <= 0) return { ok: false, error: "already fully sold" };
    const cur = p.v3 ? v3Value(p, p.last) : mainValue(p, p.last); p.manual = { banked: prev.banked + take * cur, sold: prev.sold + take, ts: nowS() };
    try { q.setManual.run(p.manual.banked + (1 - p.manual.sold) * cur, p.manual.sold, p.manual.ts, p.id); } catch {}
    save(p); if (p.manual.sold >= 0.999) close(p, "manual");
    return { ok: true, mult: p.last, sold: p.manual.sold };
  }
  return null;
}
export const p6Open = () => [...open.values()].map((p) => ({ id: p.id, tier: p.tier, mint: p.mint, name: p.name, entryTs: p.entryTs, entryMc: p.entryMc, mult: p.last, peak: p.peak, low: p.low, half4: p.half4, half2: p.half2, v3: p.v3, manualSold: p.manual?.sold || 0, lastTs: p.lastTs }));

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
    const tier = r.p6_tier || 100000, pos = { id: r.id, key: K(r.mint, tier), tier, mint: r.mint, name: r.name, entryTs: r.entry_ts, entryMc: r.entry_mc, entryUsd: s.entryUsd || r.entry_price, peak: pk, low: Math.min(s.low || 1, r.p6_low || 1), peakTs: r.p6_peak_ts || r.entry_ts, lowTs: r.p6_low_ts || r.entry_ts,
      last: r.p6_last || 1, lastTs: 0, half4: !!s.half4, h2: !!s.h2, b2: !!s.b2, feed: !!s.feed, v2: !!s.v2, v3: !!s.v3, half2: !!s.half2, half2Ts: s.half2Ts || null, x: s.x || {}, manual: s.manual || null, saved: 0 };
    if (!(pos.entryUsd > 0)) { pos.closed = false; close(pos, "restart-no-price", null, true); continue; }
    if (!s.v2 && !pos.x.retro) { const f = {}; retro(pos.x, pos.peak, pos.peakTs, pos.low, pos.lowTs, f); if (f.b2) pos.b2 = true; console.log(`[p6] re-scored ${r.name} with exits A/B/C:`, JSON.stringify(pos.x)); }
    open.set(pos.key, pos);
    if (!pos.v3 && pos.x.a != null && pos.x.b != null && pos.x.c != null) { close(pos, "done", Math.max(pos.peakTs || 0, pos.lowTs || 0) || null, true); continue; }
    const left = r.entry_ts + holdH(pos) * 3600 - nowS();
    if (left <= 0) close(pos, "time", r.entry_ts + holdH(pos) * 3600, true); else setTimeout(() => close(pos, "time"), left * 1000);
  }
  // v0.18.88: closed v3 coins still inside their 24 h after-watch go back on the once-a-minute DexScreener poll (only those our feed does not price)
  for (const r of db.prepare(`SELECT mint, entry_ts, exit_ts, p6_state FROM paper_trades WHERE strategy='p6' AND closed=1 AND entry_ts > ? AND COALESCE(invalid,0)=0`).all(nowS() - CFG.AFTER_CLOSE_H * 3600)) {
    let s = {}; try { s = JSON.parse(r.p6_state || "{}"); } catch {} if (s.v3) after.set(r.mint, { closeTs: r.exit_ts || nowS(), feed: !!s.feed, entryTs: r.entry_ts });
  }
  if (open.size || after.size) console.log(`[p6] restored ${open.size} open position(s) · ${after.size} after-watch`);
} catch (e) { console.error("[p6 restore]", e.message); }
// v0.18.68 closed trades from before exits A / B / C: re-score from their recorded high / low (same rules as above); level = $100K (v1 trigger)
try {
  let n = 0; const up = db.prepare(`UPDATE paper_trades SET x_p6a=?, x_p6b=?, x_p6c=?, p6_tier=COALESCE(p6_tier,100000) WHERE id=?`);
  for (const r of db.prepare(`SELECT id, entry_ts, peak_mult, p6_peak_ts, p6_low, p6_low_ts, p6_last FROM paper_trades WHERE strategy='p6' AND closed=1 AND x_p6a IS NULL AND COALESCE(invalid,0)=0`).all()) {
    const f = {}, x = retro({}, Math.max(r.peak_mult || 1, 1), r.p6_peak_ts || r.entry_ts, Math.min(r.p6_low || 1, 1), r.p6_low_ts || r.entry_ts, f), m = r.p6_last || 1;
    up.run(x.a ?? m, x.b ?? (f.b2 ? 1 + 0.5 * m : m), x.c ?? m, r.id); n++;
  }
  db.prepare(`UPDATE paper_trades SET p6_tier=100000 WHERE strategy='p6' AND p6_tier IS NULL`).run();
  if (n) console.log(`[p6] re-scored ${n} closed P6 trade(s) with exits A/B/C`);
} catch (e) { console.error("[p6 rescore]", e.message); }
console.log(`[p6] ${ENABLED ? "on" : "off"} — v3 exit ${V3 ? "on" : "off"} (−40% stop → ½ at 2x → ${TRAIL * 100}% trail, ${HOLD_H} h, no golden rule) · age ${MIN_AGE_H}–${MAX_AGE_H} h · 5-min vol ≥ ${Math.round(MIN_VR * 100)}% of MC · MC $${MIN_MC / 1e3}K–$${MAX_MC / 1e6}M · ≥ ${TIERS.map((t) => `$${t / 1e3}K`).join(" / ")} in 5 min · buys ≥ sells · one entry per coin per 24 h · recorded alongside: A all at 2x / B ½ at 2x + 40% trail / C all at 3x (−40% stop, golden rule $${GOLDEN_USD / 1e3}K as a what-if) · old ½-at-4x · P7 flags (sustained $${P7_V1 / 1e3}K/min ×3, holders clean)`);
export { step as _step, close as _close, open as _open }; // tests
