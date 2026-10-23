// v0.5: momentum (volume) strategy on PumpSwap. Rolling 5m/1m USD volume per token → alert + paper trade with parallel exits.
import { CFG, OFF_KINDS, BOOKS_OFF } from "./config.js"; // v0.18.176 OFF_KINDS: the off-page books open nothing new
import { db, q } from "./db.js";
import { onSwap, psHeat } from "./pumpswap.js";
import { solUsdCached, solChange } from "./price.js";
import { tg } from "./telegram.js";
import { esc, fmt, links, launchHeat } from "./launch-monitor.js";
import { getSocials, socialsLine } from "./socials.js";
import { nextLevel, lastLevel, wallWarning, levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
import { pumpSwapTick, clusterSnap } from "./signals.js";
import { watch as afterWatch, tick as afterTick } from "./aftercare.js";
import { retrySocials } from "./socials.js";
import { volumeQuality, qualityLine } from "./quality.js";
import { markExitTimes, stopStep, stopFinal, flowStep, pathStep, ffStep, ffFinal, cleanFlow, splitStep, splitFinal, deadStep, p3dFinal, h2Step, h2Final, s15Step, s15Final, h5Step, h5Final, h5Key } from "./exits.js";
import { openCopy, positionsOf, feedBehindS } from "./copytrade.js";
import { startTrace, noteExits } from "./p5trace.js"; // v0.18.115: the core trigger's after-entry marks
const coreListeners = []; export const onCoreEntry = (fn) => coreListeners.push(fn);
import { feeInfo, feeLine } from "./fees.js";
import { recordHoldersAsync, holdersLine, holdersNow } from "./holders.js";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { provenCount } from "./wallets.js";
import { enrichEntry, sniperInfo, provenShare, enrichLine } from "./enrich.js"; // v0.18.19
import { dexPrice } from "./sweeper.js"; // v0.18.29
import { gmgnFor, gmgnSummary, gmgnEntry, gmgnV5, walletStatsFor } from "./gmgn.js";
import { smartFlow } from "./smartmoney.js"; // v0.18.122
import { volFeed, VOL_LOG_USD } from "./vollog.js"; // v0.18.62 volume log
import { p6Candidate, P6_VOL } from "./p6.js";
import { p7Observe, P7_VOL1 } from "./p7.js"; // v0.18.69 // v0.18.60 // v0.18.52 · v0.18.56 gmgnEntry
export const BOOT = Math.floor(Date.now() / 1000); // v0.18.36 process start (low-volume exit warm-up)
// v0.18.38: windows count as complete from this time. A quick restart (state saved ≤30 s ago) keeps the saved 5m windows, so no new wait.
let WARM_FROM = BOOT; const lvReady = (now) => now - WARM_FROM >= CFG.LOWVOL_WARMUP_S;

export const mom = { alerts: 0, entries: 0, closes: 0, tracked: 0, reentries: 0 };
const T = new Map(); // mint -> state
const dexCache = new Map();

function st(mint) {
  let s = T.get(mint);
  if (!s) { s = { w5: [], w1: [], buyers: [], lastTs: 0, lastAlert: 0, pos: null, trades: [], firstEntryPx: null, belowSince: 0, lastPx: 0, lastMc: 0, rejectedLevel: null, peakMc: 0, posPeakMc: 0, seen: new Set() }; T.set(mint, s); }
  return s;
}
setInterval(() => { // v0.18.18: traded mints are released 3h after their last close (were kept forever); idle wallet sets are cleared
  const now = Math.floor(Date.now() / 1000);
  for (const [m, s] of T) {
    if (!s.pos && now - s.lastTs > 900 && (!s.trades.length || now - s.trades.at(-1).closedTs > 3 * 3600)) { T.delete(m); continue; }
    if (s.seen.size > 5000 && !s.pos && now - s.lastTs > 300) s.seen.clear();
    while (s.w5.length && now - s.w5[0].ts > 300) s.w5.shift(); while (s.w1.length && now - s.w1[0].ts > 60) s.w1.shift(); // v0.18.20
    while (s.buyers.length && now - s.buyers[0].ts > CFG.PREPUMP_WINDOW_S) s.buyers.shift();
  }
  mom.tracked = T.size;
}, 60_000);

// v0.18.2: the rolling windows survive restarts. Every deploy restarted the process and wiped them — 9g4Pib…pump spiked at 03:42 UTC
// on 15 Oct while two deploys landed (03:39, 03:42) and the tally never reached $100K. Saved every 20s and on SIGINT/SIGTERM.
const STATE_FILE = join(dirname(CFG.DB_PATH), "momentum-state.json");
function saveState() {
  try {
    const now = Math.floor(Date.now() / 1000), out = {};
    for (const [m, s] of T) if (now - s.lastTs <= 300 || s.buyers.length || (s.pos && !s.pos.closed)) {
      const o = { w5: s.w5, w1: s.w1, buyers: s.buyers, lastTs: s.lastTs, lastAlert: s.lastAlert, lastPx: s.lastPx, lastMc: s.lastMc, peakMc: s.peakMc, trades: s.trades, firstEntryPx: s.firstEntryPx, posPeakMc: s.posPeakMc, rejectedLevel: s.rejectedLevel, dip: s.dip, conf: s.conf };
      if (s.pos && !s.pos.closed) { const p = s.pos; o.pos = { id: p.id, entry: p.entry, entryMc: p.entryMc, entryTs: p.entryTs, peak: p.peak, x: p.x, lad: p.lad, tp: p.tp, msgId: p.msgId, alerted: p.alerted, name: p.name, lv: p.lv ? { ...p.lv, crossed: [...(p.lv.crossed instanceof Set ? p.lv.crossed : [])] } : null, kind: p.kind, volAtEntry: p.volAtEntry, flowArmed: p.flowArmed, flowSince: p.flowSince, ffDone: p.ffDone, splitBranch: p.splitBranch, splitHalf: p.splitHalf, splitAt: p.splitAt, deadSince: p.deadSince, deadAt: p.deadAt, manual: p.manual, ddPre15: p.ddPre15, path: p.path, hit15Saved: p.hit15Saved }; } // v0.18.28: open positions survive restarts
      out[m] = o;
    }
    writeFileSync(STATE_FILE + ".tmp", JSON.stringify({ ts: now, T: out })); renameSync(STATE_FILE + ".tmp", STATE_FILE);
  } catch (e) { console.error("[momentum save]", e.message); }
}
function loadState() {
  try {
    const j = JSON.parse(readFileSync(STATE_FILE, "utf8")), now = Math.floor(Date.now() / 1000); let n = 0, tr = 0, pr = 0;
    if (now - j.ts > 600) return console.log("[momentum] state file too old, ignored");
    if (now - j.ts <= 30) WARM_FROM = now - CFG.LOWVOL_WARMUP_S;
    for (const [m, v] of Object.entries(j.T || {})) {
      const s = st(m); s.w5 = (v.w5 || []).filter((x) => now - x.ts <= 300); s.w1 = (v.w1 || []).filter((x) => now - x.ts <= 60); s.buyers = (v.buyers || []).filter((x) => now - x.ts <= CFG.PREPUMP_WINDOW_S);
      Object.assign(s, { lastTs: v.lastTs || 0, lastAlert: v.lastAlert || 0, lastPx: v.lastPx || 0, lastMc: v.lastMc || 0, peakMc: v.peakMc || 0, trades: v.trades || [], firstEntryPx: v.firstEntryPx ?? null, posPeakMc: v.posPeakMc || 0, rejectedLevel: v.rejectedLevel ?? null, dip: v.dip ?? null, conf: v.conf ?? null }); n++; tr += s.w5.length;
      if (v.pos && v.pos.id) { s.pos = { ...v.pos, closed: false, lv: v.pos.lv ? { ...newLevels(), ...v.pos.lv, crossed: new Set(Array.isArray(v.pos.lv.crossed) ? v.pos.lv.crossed : []) } : newLevels(), lad: v.pos.lad || { s2: false, s3: false }, tp: v.pos.tp || { half: false, twoHalf: false }, x: v.pos.x || {} }; armClose(m, s); pr++; }
    }
    console.log(`[momentum] restored ${n} tokens / ${tr} swaps / ${pr} open positions from state saved ${now - j.ts}s ago`);
  } catch (e) { if (e.code !== "ENOENT") console.error("[momentum load]", e.message); }
}
function armClose(mint, s) { const left = CFG.MOM_MAX_HOLD_MIN * 60_000 - (Date.now() - s.pos.entryTs * 1000); setTimeout(() => closePos(mint, s, "time"), Math.max(5_000, left)); }
// v0.18.28: anything still open in the database but not in the state file (older restarts, state file too old) is rebuilt from its row,
// so no paper position is ever orphaned by a restart again. Exits already recorded are kept; tracking resumes from the current price.
const qOpenMom = db.prepare(`SELECT id, mint, name, entry_ts, entry_mc, entry_price, peak_mult, vol_at_entry, alerted, trigger_kind, x_tp, x_tp15, x_tsl25, x_tsl40, x_tsl60, x_tsl80, x_half60, x_twophase, x_ladder, x_levels, x_m1, x_m1vol, x_volstop, x_t15s25, x_t15s40, x_t15s60, x_t2s25, x_t2s40, x_t2s60, x_h2t40, x_s15be, x_flow, x_flow4, x_flow4ff, x_split, split_branch, dd_pre15, path, t_hit15_s, x_h5, x_h5f12, x_h5f14, x_h3, x_h15, x_h5fast
  FROM paper_trades WHERE strategy='momentum' AND closed=0 AND COALESCE(invalid,0)=0 AND entry_ts > ? ORDER BY entry_ts`);
function restoreFromDb() {
  const now = Math.floor(Date.now() / 1000); let n = 0;
  try {
    for (const r of qOpenMom.all(now - CFG.MOM_MAX_HOLD_MIN * 60)) {
      if (!(r.entry_price > 0)) continue; const s = st(r.mint); if (s.pos && !s.pos.closed) continue;
      const x = {}; for (const k of ["tp", "tp15", "tsl25", "tsl40", "tsl60", "tsl80", "half60", "twophase", "ladder", "levels", "m1", "m1vol", "volstop", "t15s25", "t15s40", "t15s60", "t2s25", "t2s40", "t2s60", "flow", "flow4", "flow4ff", "split", "h2t40", "s15be", "h5", "h5f12", "h5f14", "h3", "h15", "h5fast"]) if (r["x_" + k] != null) x[k] = r["x_" + k];
      let path = {}; try { path = r.path ? JSON.parse(r.path) : {}; } catch {}
      const peak = r.entry_price * Math.max(r.peak_mult || 1, 1);
      s.pos = { id: r.id, entry: r.entry_price, entryMc: r.entry_mc, entryTs: r.entry_ts, peak, x, lad: { s2: peak / r.entry_price >= 2, s3: peak / r.entry_price >= 3 }, tp: { half: peak / r.entry_price >= 2, twoHalf: peak / r.entry_price >= 2 }, closed: false, msgId: null, alerted: !!r.alerted, name: r.name, lv: newLevels(), kind: (r.trigger_kind || "vol5m").split("-")[0], volAtEntry: r.vol_at_entry || 0,
        flowArmed: x.tp15 != null, flowSince: 0, h2Half: peak / r.entry_price >= 2, s15Half: peak / r.entry_price >= 1.5, h5Armed: peak / r.entry_price >= 1.5, ffDone: (now - r.entry_ts) >= 120, splitBranch: r.split_branch && r.split_branch !== "sweep" ? r.split_branch : null, splitHalf: r.split_branch === "mid" && peak / r.entry_price >= 1.5, ddPre15: r.dd_pre15 ?? null, path, hit15Saved: r.t_hit15_s != null, restored: "db" };
      if (!s.firstEntryPx) s.firstEntryPx = r.entry_price; s.posPeakMc = Math.max(s.posPeakMc || 0, r.entry_mc * (r.peak_mult || 1));
      armClose(r.mint, s); n++;
    }
  } catch (e) { console.error("[momentum restore]", e.message); }
  if (n) console.log(`[momentum] rebuilt ${n} open positions from the database`);
  mom.restored = n;
}
loadState(); restoreFromDb();
// v0.18.29: open positions with no trade in the last 2 minutes (dead coins, positions rebuilt after a restart) are re-priced from
// DexScreener once a minute, so the dashboard and the hold-limit close use a real price rather than the last trade we happened to see.
let refreshing = false;
async function refreshIdle() {
  if (refreshing) return; refreshing = true;
  try {
    const now = Math.floor(Date.now() / 1000); let n = 0;
    for (const [mint, s] of T) {
      if (!s.pos || s.pos.closed || now - (s.pxTs || s.lastTs) < 60 || n >= 25) continue;
      try {
        if (lvReady(now) && lowVol(s.w5, now)) { const px = await dexPrice(mint).catch(() => null); n++; if (px > 0) { s.lastPx = px; s.lastMc = px * CFG.TOTAL_SUPPLY * solUsdCached(); s.pxSrc = "dex"; s.pxTs = now; } updatePos(mint, s, s.lastPx || s.pos.entry, now); if (s.pos && !s.pos.closed) { console.error("[lowvol] still open after check", mint); closePos(mint, s, "lowvol"); } continue; }
        const px = await dexPrice(mint).catch(() => null); n++;
        if (px > 0) { s.lastPx = px; s.lastMc = px * CFG.TOTAL_SUPPLY * solUsdCached(); s.pxSrc = "dex"; s.pxTs = now; updatePos(mint, s, px, now); }
      } catch (e) { console.error("[refreshIdle]", mint, e.message); try { if (lvReady(now) && lowVol(s.w5, now)) closePos(mint, s, "lowvol"); } catch (e2) { console.error("[lowvol close]", mint, e2.message); } }
    }
  } finally { refreshing = false; }
}
setTimeout(() => refreshIdle().catch((e) => console.error("[refreshIdle]", e.message)), 8_000); setInterval(() => refreshIdle().catch((e) => console.error("[refreshIdle]", e.message)), 20_000);
setInterval(saveState, 20_000);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { saveState(); process.exit(0); });

const qHeld = db.prepare(`SELECT COALESCE(SUM(CASE WHEN tr.is_buy=1 THEN tr.tokens ELSE -tr.tokens END),0) tok FROM trades tr JOIN cluster_wallets c ON c.mint=tr.mint AND c.wallet=tr.wallet WHERE tr.mint=?`);
function clusterHeld(mint) { try { return Math.max(0, qHeld.get(mint).tok / CFG.TOTAL_SUPPLY) * 100; } catch { return null; } }

async function dexInfo(mint) {
  if (dexCache.has(mint)) return dexCache.get(mint);
  let info = { name: null, symbol: null, createdAt: null, socials: null };
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana");
    if (pairs.length) {
      const oldest = pairs.reduce((a, b) => (a.pairCreatedAt < b.pairCreatedAt ? a : b));
      info.name = oldest.baseToken?.name; info.symbol = oldest.baseToken?.symbol; info.createdAt = Math.floor((oldest.pairCreatedAt || 0) / 1000) || null;
      const soc = { twitter: null, website: null, tiktok: null, telegram: null, fetched: true };
      for (const p of pairs) {
        for (const w of p.info?.websites || []) { if (/tiktok\.com/i.test(w.url)) soc.tiktok ||= w.url; else soc.website ||= w.url; }
        for (const x of p.info?.socials || []) { if (x.type === "twitter") soc.twitter ||= x.url; if (x.type === "telegram") soc.telegram ||= x.url; if (/tiktok/i.test(x.type)) soc.tiktok ||= x.url; }
      }
      soc.ok = !!(soc.twitter || soc.website || soc.tiktok); info.socials = soc;
    }
  } catch {}
  dexCache.set(mint, info); if (dexCache.size > 5000) dexCache.delete(dexCache.keys().next().value);
  return info;
}

// v0.18.48: never treat SOL itself or stablecoins as a coin (P5 bought "Wrapped SOL" at a $105M cap on 16 Oct)
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);
try { const n = db.prepare(`UPDATE paper_trades SET invalid=1 WHERE COALESCE(invalid,0)=0 AND mint IN (${[...NOT_COINS].map(() => "?").join(",")})`).run(...NOT_COINS).changes; if (n) console.log(`[momentum] marked ${n} SOL/stablecoin paper trades invalid`); } catch (e) { console.error("[not-coins]", e.message); }
onSwap((tr) => {
  if (NOT_COINS.has(tr.mint)) return;
  const s = st(tr.mint), usd = tr.sol * solUsdCached(), now = tr.ts || Math.floor(Date.now() / 1000);
  s.lastTs = now; s.lastPx = tr.price; s.lastMc = tr.mc; s.pxSrc = "trade"; s.pxTs = now; if (tr.poolSol != null) s.poolSol = tr.poolSol; // v0.18.118 pool depth (PumpSwap)
  if (tr.mc > s.peakMc) s.peakMc = tr.mc;
  // level rejection: price fell >30% from a peak that was above a level → that level is "rejected"
  if (s.peakMc > 0 && tr.mc < s.peakMc * 0.7) { const L = lastLevel(s.peakMc); if (L && L > tr.mc) s.rejectedLevel = L; }
  s.w5.push({ ts: now, usd, b: tr.isBuy, w: tr.wallet, route: tr.route || "unknown", px: tr.price, v: tr.venue || "pumpswap" }); while (s.w5.length && now - s.w5[0].ts > 300) { const old = s.w5.shift(); if (s.seen.size < 5000) s.seen.add(old.w); }
  if (tr.isBuy && tr.wallet && !tr.wallet.startsWith("tx:")) { s.buyers.push({ ts: now, w: tr.wallet, sol: tr.sol, mc: tr.mc, v: tr.venue || "pumpswap" }); if (s.buyers.length > 5000) s.buyers.splice(0, 1000); }
  s.w1.push({ ts: now, usd, b: tr.isBuy }); while (s.w1.length && now - s.w1[0].ts > 60) s.w1.shift();
  if (s.pos) updatePos(tr.mint, s, tr.price, now);
  dipCheck(tr.mint, s, tr, now); confCheck(tr.mint, s, tr.price, tr.mc, now, tr.venue);
  if (usd > 0) p5Check(tr.mint, s, tr, now);
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0);
  const bsu = [s.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), s.w5.filter((x) => !x.b).reduce((a, x) => a + x.usd, 0)];
  pumpSwapTick(tr.mint, tr, v5, bsu); afterTick(tr.mint, tr.price, tr.mc);
  volFeed(tr, v5, bsu, now, v5 >= VOL_LOG_USD ? gmgnV5(tr.mint) : null); // v0.18.62: prices open wake-ups; a line once v5 ≥ $100K (before P6 decides)
  if (usd <= 0) return;
  const v1 = s.w1.reduce((a, x) => a + x.usd, 0);
  const b1 = s.w1.filter((x) => x.b).length, s1 = s.w1.length - b1;
  const burst = CFG.BURST_TRIGGER && v1 >= CFG.VOL1M_BURST_USD && b1 > s1 && tr.mc >= CFG.BURST_MIN_MC && (() => { const m = q.tokenMeta.get(tr.mint); return !m?.create_ts || now - m.create_ts >= CFG.BURST_MIN_AGE_S; })();
  if (v1 >= P7_VOL1) p7Observe({ mint: tr.mint, mc: tr.mc, v1, source: "feed", venue: tr.venue || "pumpswap", price: tr.price }); // v0.18.69 Project 7 — own checks inside
  if (v5 >= P6_VOL) p6Candidate({ mint: tr.mint, mc: tr.mc, v5, source: "feed", bu: bsu[0], su: bsu[1], venue: tr.venue || "pumpswap", price: tr.price }); // v0.18.60 Project 6 (sleepers) — own MC / age gates inside · v0.18.65 from $60K
  if (v5 < CFG.VOL5M_USD && !burst) return;
  const kind = v5 >= CFG.VOL5M_USD ? "vol5m" : "burst";
  if (tr.mc > CFG.MOM_MC_CAP || tr.mc <= 0) return;
  // v0.15 sanity: a real volume event is many swaps from many wallets on a token that has existed for a minute
  if (s.w5.length < CFG.MOM_MIN_TRADES5 || new Set(s.w5.map((x) => x.w)).size < CFG.MOM_MIN_WALLETS5) return;
  { const m = q.tokenMeta.get(tr.mint); if (m?.create_ts && now - m.create_ts < CFG.MOM_MIN_AGE_S) return; }
  // v0.15 gate: buyers must outweigh sellers in USD over the 5m window
  if (bsu[1] > 0 && bsu[0] / bsu[1] < CFG.MOM_BS_MIN) return;
  if (now - s.lastAlert < CFG.MOM_COOLDOWN_MIN * 60) return;
  if (s.pos && !s.pos.closed) return;
  // re-entry rules
  if (s.trades.length) {
    if (s.trades.length > CFG.MOM_REENTRY_MAX) return;
    const last = s.trades.at(-1);
    if (now - last.closedTs < CFG.MOM_REENTRY_QUIET_MIN * 60) return;
    if (tr.price < s.firstEntryPx) return; // second leg must start above the first entry
    if (CFG.MOM_REENTRY_RECLAIM && s.rejectedLevel && tr.mc < s.rejectedLevel) return; // must reclaim the level that rejected it
  }
  s.lastAlert = now;
  trigger(tr.mint, s, tr, v5, now, kind).catch((e) => console.error("[momentum]", e.message));
});

async function trigger(mint, s, tr, v5, now, kind = "vol5m") {
  const v1 = s.w1.reduce((a, x) => a + x.usd, 0);
  const buys = s.w5.filter((x) => x.b), sells = s.w5.filter((x) => !x.b);
  const buyUsd = buys.reduce((a, x) => a + x.usd, 0), sellUsd = sells.reduce((a, x) => a + x.usd, 0);
  const buyers = new Set(buys.map((x) => x.w)).size;
  const meta = q.tokenMeta.get(mint); // known from our firehose?
  let name = meta?.name, symbol = meta?.symbol, createTs = meta?.create_ts, soc = null;
  if (meta?.socials) { try { const j = JSON.parse(meta.socials); soc = { twitter: j.t, website: j.w, tiktok: j.k, telegram: j.g, fetched: true, ok: !!(j.t || j.w || j.k) }; } catch {} }
  if (!name || !soc) { const d = await dexInfo(mint); name ||= d.name; symbol ||= d.symbol; createTs ||= d.createdAt; soc ||= d.socials; }
  if (!soc) soc = { fetched: false, ok: false };
  const ageS = createTs ? now - createTs : null;
  if (ageS != null && ageS > CFG.MOM_MAX_AGE_D * 86400) return;
  const qv = volumeQuality(s.w5, s.seen); // v0.16 organic-vs-manufactured features
  const qLine = qualityLine(qv);
  const reentry = s.trades.length;
  const alert = !CFG.ALERT_REQUIRE_SOCIALS || soc.ok || !soc.fetched;
  if (tr.mc > CFG.MOM_PAPER_MC_CAP) { // v0.15: above the paper cap → information alert only, no position
    if (!alert) return; mom.alerts++; mom.infoOnly = (mom.infoOnly || 0) + 1;
    const ageStr0 = ageS == null ? "age ?" : ageS < 3600 ? `${Math.floor(ageS / 60)}m old` : ageS < 86400 ? `${(ageS / 3600).toFixed(1)}h old` : `${(ageS / 86400).toFixed(1)}d old`;
    await tg(`ℹ️ <b>${kind === "burst" ? "BURST" : "VOLUME"} (above paper cap, info only)</b> — ${esc(name || mint.slice(0, 8))} ($${esc(symbol || "?")})\n5m vol <b>$${fmt(v5)}</b> (1m $${fmt(v1)}) · buys ${buys.length} / sells ${sells.length} · $${fmt(buyUsd)} in / $${fmt(sellUsd)} out · ${buyers} buyers\nMC <b>$${fmt(tr.mc)}</b> · ${ageStr0}\n${qLine}\n${socialsLine(soc)}\n${links(mint)}`);
    return;
  }
  if (BOOKS_OFF) { mom.offSkipped = (mom.offSkipped || 0) + 1; return; } // v0.18.185 all books off
  if (OFF_KINDS.has("momentum") && !(kind === "vol5m" && tr.mc < CFG.MOM_CORE_MC && !reentry)) { mom.offSkipped = (mom.offSkipped || 0) + 1; return; } // v0.18.176 (owner go 21 Oct 13:50 UK): the non-core momentum book (burst / re-entry / MC ≥ MOM_CORE_MC) opens nothing new; the core trigger (book E, strategy momentum + core=1) keeps running — same test as `core` below
  const r = q.insMom.run(mint, name || mint.slice(0, 8), symbol || "", now, tr.mc, tr.price, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null,
    soc.fetched ? (soc.ok ? 1 : 0) : null, JSON.stringify({ t: soc.twitter, w: soc.website, k: soc.tiktok, g: soc.telegram }), v5, v1, buys.length, sells.length, ageS, reentry, alert ? 1 : 0, tr.mc);
  const pos = { id: r.lastInsertRowid, entry: tr.price, entryMc: tr.mc, entryTs: now, peak: tr.price, x: {}, lad: { s2: false, s3: false }, tp: { half: false, twoHalf: false }, closed: false, msgId: null, alerted: alert, name: name || mint.slice(0, 8), lv: newLevels(), kind };
  q.setNextLevel.run(nextLevel(tr.mc), pos.id);
  if (qv) { try { q.setQuality.run(qv.score, qv.wallets, qv.per10k, qv.top3, qv.roundtrip, qv.retail, qv.custom, qv.sizeCv, qv.newPct, qv.pxPer10k, pos.id); } catch (e) { console.error("[quality]", e.message); } }
  const held = meta ? clusterHeld(mint) : null;
  q.setPaperExtra.run(held, kind + (reentry ? "-re" : ""), pos.id);
  let preStr = "";
  try { // v0.18.2: who bought in the 30 min up to this trigger — scored later by how the token did (insider finder)
    const pre = s.buyers.filter((b) => now - b.ts <= CFG.PREPUMP_WINDOW_S), seenW = new Set();
    const ins = db.transaction(() => { for (const b of pre) { q.insPumpBuyer.run(pos.id, mint, b.w, b.ts, b.sol, b.mc, now - b.ts, b.v); seenW.add(b.w); } }); ins();
    const early = new Set(pre.filter((b) => now - b.ts > 300).map((b) => b.w));
    preStr = `\nbuyers before the trigger: ${seenW.size} wallets in 30m (${early.size} more than 5m early) · proven ${provenCount(mint)}`;
  } catch (e) { console.error("[prepump]", e.message); }
  try { q.setVenue.run(tr.venue || "pumpswap", pos.id); } catch {}
  try { const g = gmgnFor(mint); if (g) q.setGmgn.run(JSON.stringify(gmgnSummary(g)), pos.id); } catch {} // v0.18.52 GMGN rug / smart-money data at entry
  gmgnEntry(mint, pos.id, { holders: true }); // v0.18.56 full GMGN token info + security snapshot at entry · v0.18.122 + top holders
  try { const big = s.w5.filter((z) => z.b && z.w && !String(z.w).startsWith("tx:") && now - z.ts <= 60).sort((a, b) => b.usd - a.usd)[0]; if (big) walletStatsFor(pos.id, "big", big.w); } catch {}
  const core = kind === "vol5m" && tr.mc < CFG.MOM_CORE_MC && !reentry; // v0.18.4
  pos.core = core; // v0.18.118: book E's positions report their exit timings to the trace
  if (core) { try { const solPx = solUsdCached(); if (solPx > 0) { const pf = preFeatures(s, now, solPx, meta); const bU = s.w5.filter((z) => z.b && now - z.ts <= 60).reduce((a, z) => a + z.usd, 0), wal = new Set(s.w5.filter((z) => z.b && z.w && now - z.ts <= 60).map((z) => z.w));
    q.setEarly.run(JSON.stringify({ sol60: +(bU / solPx).toFixed(2), wal60: wal.size, pre: pf.pre, lv: pf.lv, bundle: pf.bundle, age: pf.age, ctx: triggerContext(mint, { ...(meta || {}), name: name || meta?.name, symbol: symbol || meta?.symbol }, now, s) }), pos.id); startTrace(pos.id, mint, now, tr.price, pf.preBuyers, meta?.creator || null); } } catch (e) { console.error("[core trace]", e.message); } } // v0.18.115: book E in the data set
  const coreTight = core && tr.mc < CFG.MOM_CT_MC && ageS != null && ageS < CFG.MOM_CT_AGE_S && qv && qv.sizeCv < CFG.MOM_CT_SIZE_CV; // v0.18.7: under $60K, under 6 min, steady trade sizes
  try { q.setCore.run(core ? 1 : 0, coreTight ? 1 : 0, pos.id); } catch {}
  const coreV40 = core && v1 >= CFG.MOM_V40_USD && ageS != null && ageS < CFG.MOM_V40_AGE_S; // v0.18.17: the 16 Oct hypothesis — last-minute volume >= $40K and under 10 min old
  try { q.setCoreV40.run(coreV40 ? 1 : 0, pos.id); } catch {}
  let enStr = null; try { enrichEntry(pos.id, mint, s.w5, now); enStr = enrichLine(sniperInfo(mint), provenShare(s.w5)); } catch (e) { console.error("[enrich entry]", e.message); } // v0.18.19
  let cf = null; try { cf = cleanFlow(s.w5); q.setCleanFlow.run(cf.ratio, cf.botShare, pos.id); } catch (e) { console.error("[cleanflow]", e.message); } // v0.18.17: buy/sell with bot pairs removed
  try { // v0.18.17: bundle churn at entry (was only recorded for copy trades)
    const cs = clusterSnap(mint);
    if (cs) q.setChurn.run(cs.churn, cs.cOut, cs.held, cs.handoffs, pos.id);
    else if (meta?.bundle_sol > 0) q.setChurn.run((meta.cluster_sol_out || 0) / meta.bundle_sol, meta.cluster_sol_out ?? null, held, meta.handoffs ?? null, pos.id);
  } catch (e) { console.error("[churn entry]", e.message); }
  if (core) { s.conf = { px: tr.price, ts: now, done: false, ok: null, ratio: null, parentId: pos.id, name: name || mint.slice(0, 8), symbol: symbol || "" }; } // v0.18.32 Project 4
  if (core) { s.dip = { px: tr.price, ts: now, done: false, name: name || mint.slice(0, 8), symbol: symbol || "" }; for (const fn of coreListeners) { try { fn({ mint, name: name || mint.slice(0, 8), symbol: symbol || "", price: tr.price, mc: tr.mc, ts: now, pos }); } catch (e) { console.error("[core listener]", e.message); } } } // v0.18.9
  let hl = null; try { hl = holdersLine(await recordHoldersAsync(pos.id, mint, meta?.creator)); } catch {} // v0.18.5
  let fi = null; try { fi = feeInfo(mint, meta?.creator, createTs); q.setFees.run(fi.accrued, fi.claims, fi.claimedSol, pos.id); } catch (e) { console.error("[fees entry]", e.message); }
  if (reentry) { s.peakMc = tr.mc; s.rejectedLevel = null; }
  try { const h = new Date(now * 1000).getUTCHours(); q.setFeatures.run(null, null, null, null, h, null, buyUsd > 0 ? buyUsd / Math.max(sellUsd, 1) : null, buyers, pos.id); } catch {}
  s.pos = pos; s.posPeakMc = tr.mc; if (!s.firstEntryPx) s.firstEntryPx = tr.price;
  pos.volAtEntry = v5; q.setVolEntry.run(v5, pos.id); afterWatch(mint, pos.id, tr.price, tr.mc, null, null, null, now);
  if (!soc.fetched) retrySocials(mint, null, (s2) => { const str = JSON.stringify({ t: s2.twitter, w: s2.website, k: s2.tiktok, g: s2.telegram }); q.setPaperSocials.run(str, s2.ok ? 1 : 0, pos.id); if (pos.msgId) tg(`socials (late): ${socialsLine(s2)}`, { replyTo: pos.msgId }); });
  mom.entries++; if (reentry) mom.reentries++;
  setTimeout(() => closePos(mint, s, "time"), CFG.MOM_MAX_HOLD_MIN * 60_000);
  if (!alert) return;
  mom.alerts++;
  const hot = v5 >= CFG.VOL5M_HOT_USD, burst = v1 >= CFG.VOL1M_BURST_USD;
  const heldStr = held != null ? ` · cluster holds <b>${held.toFixed(0)}%</b>` : "";
  const ageStr = ageS == null ? "age ?" : ageS < 3600 ? `${Math.floor(ageS / 60)}m old` : ageS < 86400 ? `${(ageS / 3600).toFixed(1)}h old` : `${(ageS / 86400).toFixed(1)}d old`;
  const wall = wallWarning(tr.mc);
  const reclaimStr = reentry && s.rejectedLevel ? ` · reclaimed $${fmt(s.rejectedLevel)}` : "";
  const venues = {}; for (const x of s.w5) venues[x.v] = (venues[x.v] || 0) + x.usd; const venueStr = Object.entries(venues).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} $${fmt(v)}`).join(" · ");
  const dexNote = (tr.venue || "pumpswap") !== "pumpswap" ? " (DEX feed: buyers ≈ transactions)" : "";
  const bundleStr = meta?.bundle_pct != null ? `Bundle ${meta.bundle_pct.toFixed(0)}% · ${meta.bundle_sol.toFixed(1)} SOL · hand-offs ${meta.handoffs} · cluster net ${((meta.cluster_sol_in || 0) - (meta.cluster_sol_out || 0)).toFixed(1)} SOL` : "Bundle: launched before tracker (no data)";
  pos.msgId = await tg(`${kind === "burst" ? "⚡" : hot ? "🔥" : "📈"} <b>${kind === "burst" ? "BURST" : "VOLUME"}${reentry ? " RE-ENTRY " + reentry : ""}</b> — ${esc(name || mint.slice(0, 8))} ($${esc(symbol || "?")})${burst ? " ⚡" : ""}${meta?.factory ? " ⚠️factory" : ""}\n` +
    `5m vol <b>$${fmt(v5)}</b> (1m $${fmt(v1)}) · buys ${buys.length} / sells ${sells.length} · $${fmt(buyUsd)} in / $${fmt(sellUsd)} out · ${buyers} buyers\n` +
    `MC <b>$${fmt(tr.mc)}</b> · ${ageStr}${reclaimStr}${wall ? "\n" + wall : ""}\nvenue: ${venueStr}${dexNote}${preStr}${fi ? "\n" + feeLine(fi, now) : ""}${hl ? "\n" + hl : ""}${enStr ? "\n" + enStr : ""}${coreTight ? "\n⭐⭐ core-tight (under $60K · under 6m · steady sizes)" : core ? "\n⭐ core rule ($100K/5m · entry under $100K · first entry)" : ""}\n${qLine}\n${socialsLine(soc)}\n${bundleStr}${heldStr}\n${links(mint)}`);
  for (const m of CFG.MOM_SCORECARD_MIN) setTimeout(() => scorecard(mint, s, m), m * 60_000);
}

// v0.18.9 dip-entry variant: after a core trigger, enter only if price falls MOM_DIP_PCT within MOM_DIP_WINDOW_S (and before 1.5x)
// v0.18.32 Project 4 — confirmation entry. 60 s after a core trigger, buy only if the price is still above the trigger price.
// Uses the first trade at or after +60 s (up to +120 s); a timer covers coins that go quiet. Skips are recorded on the core row.
export const conf = { armed: 0, bought: 0, skipped: 0, late: 0 };
function confCheck(mint, s, px, mc, now, venue) {
  const c = s.conf; if (!c || c.done) return;
  const age = now - c.ts; if (age < CFG.MOM_CONF_S) return;
  c.done = true; c.ratio = px / c.px;
  if (age > CFG.MOM_CONF_LATE_S) { c.ok = false; c.why = "no price by +" + CFG.MOM_CONF_LATE_S + "s"; conf.late++; }
  else if (c.ratio > CFG.MOM_CONF_MIN) {
    c.ok = true; conf.bought++;
    if (!OFF_KINDS.has("momconf")) try { openCopy("momconf", `${c.ratio.toFixed(2)}x@${age}s`, mint, c.name, c.symbol, px, mc, now, { v5: s.w5.reduce((a, x) => a + x.usd, 0), venue, ageS: (() => { const m = q.tokenMeta.get(mint); return m?.create_ts ? now - m.create_ts : null; })() }); } catch (e) { console.error("[momconf]", e.message); } // v0.18.176 (owner go 21 Oct 13:50 UK): momconf off — the confirmation result (conf_ok / conf_ratio on the core row) is still recorded
  } else { c.ok = false; c.why = `${c.ratio.toFixed(2)}x at +${age}s`; conf.skipped++; }
  try { q.setConf.run(c.ok ? 1 : 0, +c.ratio.toFixed(4), c.parentId); } catch {}
}
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const [m, s] of T) { const c = s.conf; if (c && !c.done && now - c.ts >= CFG.MOM_CONF_S + 5 && s.lastPx > 0) confCheck(m, s, s.lastPx, s.lastMc, now, null); } }, 5_000);
// v0.18.35 Project 5 — fast trigger: $100K traded inside any 2-minute window, coin at least 60 s old, buys ≥ sells in that window,
// no market-cap cap. One paper position per coin (strategy 'mom2m'), independent of the core trigger. Exits: 1.5x/−40% and h2t40.
export const p5 = { fired: 0, young: 0, sellHeavy: 0, byLevel: {}, wide: 0 }; // v0.18.81 wide = $100K–250K entries (p5w30)
// v0.18.50 Project 5 — early. On 105 past core pumps the move was visible ~2.5 min before the $100K/5m trigger, when ~50 SOL had been
// bought within 60 s (usually right after graduation, MC ~$25–45K). That evidence only covers coins that went on to pump, so this
// records the signal on EVERY coin to count the false starts. Levels P5E_LEVELS (SOL bought in 60 s) each get their own strategy
// (p5e30 / p5e50 / p5e80); first time per coin per level. Guards: MC < P5E_MAX_MC, coin ≥ P5_MIN_AGE_S old, buy $ ≥ sell $ and
// ≥ P5E_MIN_WALLETS buyers in those 60 s. Exits: every recorded variant (1.5x/−40%, split, ½ at 2x…). Entry features stored.
const P5E_LEVELS = String(process.env.P5E_LEVELS || "30,50,80").split(",").map(Number).filter((x) => x > 0);
// v0.18.115 — the minutes before a trigger, the same for every trigger kind (P5 levels and the $100K/5-min core): volume, buys, sells, unique
// buyers / sellers over the last 1, 2, 3, 5 min and per minute (min1 = the last 60 s … min5), the seconds before the trigger at which 30 / 40 / 50 / 80 SOL
// of buying was crossed and the wallets by then, bundle %, age — plus the set of wallets that had already bought (the trace counts NEW buyers after).
export function preFeatures(s, now, sol, meta) {
  const agg = (lo, hi) => { let b = 0, sl = 0; const nb = new Set(), ns = new Set(); for (const z of s.w5) { const a = now - z.ts; if (a > hi || a < lo) continue; if (z.b) { b += z.usd; if (z.w) nb.add(z.w); } else { sl += z.usd; if (z.w) ns.add(z.w); } } return { b: Math.round(b), s: Math.round(sl), nb: nb.size, ns: ns.size }; };
  const pre = { m1: agg(0, 60), m2: agg(0, 120), m3: agg(0, 180), m5: agg(0, 300), mins: [agg(0, 60), agg(60, 120), agg(120, 180), agg(180, 240), agg(240, 300)] };
  const lv = {}; let cum = 0; const wl = new Set(); for (const z of s.w5.filter((z) => z.b && now - z.ts <= 60).sort((a, b) => a.ts - b.ts)) { cum += z.usd / sol; if (z.w) wl.add(z.w); for (const L of [30, 40, 50, 80]) if (cum >= L && !lv[L]) lv[L] = { t: now - z.ts, w: wl.size }; }
  return { pre, lv, bundle: meta?.bundle_pct ?? null, age: meta?.create_ts ? now - meta.create_ts : null, preBuyers: new Set(s.w5.filter((z) => z.b && z.w).map((z) => z.w)) };
}
// v0.18.118 — the context every trigger is recorded with (owner, 19 Oct: "leave no stone unturned"): the pool's depth, how hot the market is
// right now (triggers in the last hour / day, how the last two hours' A triggers did, launches, new pools and graduations in the last hour,
// SOL's own move over 1 h and 24 h), the creator's record (earlier launches, best peak, graduations, how long since the last one, launches in
// 24 h) and copycats (coins with the same name or ticker launched in the last 24 h, the best of them). Every part is best-effort.
export function triggerContext(mint, meta, now, s) {
  const o = { pool: s?.poolSol ?? null };
  try { const w = q.heatWin.get(now - 7200, now - 600) || {}, ps = psHeat(now), lh = launchHeat(now);
    o.heat = { trig1h: q.heatTrig.get(now - 3600), trig24h: q.heatTrig.get(now - 86400), win2h_n: w.n || 0, win2h_hit: w.hit || 0, win2h_dead: w.dead || 0, launch1h: lh.launch1h, launch10m: lh.launch10m, grad1h: ps.grad1h, pools1h: ps.pools1h, sol1h: solChange(3600), sol24h: solChange(86400), up: now - BOOT }; } catch (e) { console.error("[ctx heat]", e.message); }
  if (meta?.creator) try { const ch = q.creatorHist.get(meta.creator, mint, now) || {}, last = q.creatorLast.get(meta.creator, mint, now);
    o.cr = { n: ch.n || 0, best: ch.best ?? null, grads: ch.grads || 0, over100k: ch.over100k || 0, last_min: last ? Math.round((now - last) / 60) : null, n24h: q.creatorRecent.get(meta.creator, now - 86400, mint) }; } catch (e) { console.error("[ctx creator]", e.message); }
  try { o.sm = smartFlow(mint, now, 300); } catch {} // v0.18.122 GMGN smart-money / KOL buys on this coin in the last 5 min
  if (meta?.name) try { const cc = q.copycats.get(meta.name, mint, now - 86400) || {};
    o.cc = { n24h: cc.n || 0, best24h: cc.best ?? null, grads24h: cc.grads || 0, last_min: cc.last ? Math.round((now - cc.last) / 60) : null, sym_n24h: meta.symbol ? q.copySym.get(meta.symbol, mint, now - 86400) : null }; } catch (e) { console.error("[ctx copycats]", e.message); }
  return o;
}
export function p5Check(mint, s, tr, now) {
  if (!(tr.mc > 0) || !(tr.price > 0) || tr.mc >= CFG.P5W_MAX_MC) return;
  const wall0 = Date.now(); // v0.18.89: when WE saw the triggering trade (wall clock) — feed lag = wall0 − its block time; the first-seconds price path counts from here
  const wide = tr.mc >= CFG.P5E_MAX_MC; // v0.18.81 P5 Wide: the same 30 SOL trigger on coins at $100K–$250K MC, strategy p5w30 (30 level only)
  const sol = solUsdCached(); if (!(sol > 0)) return;
  let bU = 0, sU = 0, n = 0, maxB = 0, maxW = null; const wal = new Set();
  for (let i = s.w5.length - 1; i >= 0; i--) { const z = s.w5[i]; if (now - z.ts > 60) break; if (z.b) { bU += z.usd; n++; if (z.usd > maxB) { maxB = z.usd; maxW = z.w || null; } if (z.w) wal.add(z.w); } else sU += z.usd; }
  const bSol = bU / sol; s.p5e ||= {};
  for (const lv of P5E_LEVELS) {
    if (wide && lv !== 30) continue;
    if (s.p5e[wide ? "w" + lv : lv] || bSol < lv) continue;
    if (sU > bU || wal.size < CFG.P5E_MIN_WALLETS) { p5.sellHeavy++; continue; }
    const meta = q.tokenMeta.get(mint);
    if (meta?.create_ts && now - meta.create_ts < CFG.P5_MIN_AGE_S) { p5.young++; continue; }
    s.p5e[wide ? "w" + lv : lv] = true; const strat = wide ? `p5w${lv}` : `p5e${lv}`;
    try { if (q.hasStrat.get(strat, mint)) continue; } catch {}
    const px = tr.price, mc = tr.mc, venue = tr.venue, v5 = s.w5.reduce((a, x) => a + x.usd, 0);
    const feat = { sol60: +bSol.toFixed(2), wal60: wal.size, n60: n, maxShare: bU > 0 ? +(maxB / bU).toFixed(3) : null, avgBuySol: n ? +(bSol / n).toFixed(3) : null, sell60: +(sU / sol).toFixed(2) };
    const pf = preFeatures(s, now, sol, meta); feat.pre = pf.pre; feat.lv = pf.lv; feat.bundle = pf.bundle; feat.age = pf.age; const preBuyers = pf.preBuyers; // v0.18.113/115 the data set's before-trigger features
    // v0.18.90: the website's Project 5 filters (launch seen · bundle < 70% · under 150 wallets in the 60 s), decided here so the executor buys exactly the website's book
    const solPaired = !venue || venue === "pumpswap" || venue === "pump"; // v0.18.94: pools quoted in ZEC / XMR / PUMP / stocks and Raydium venues are not tradable by the live wallet
    const skipWhy = !meta || meta.bundle_pct == null ? "launch not seen" : meta.bundle_pct >= 70 ? `bundled ${Math.round(meta.bundle_pct)}%` : wal.size >= 150 ? `${wal.size} wallets` : !solPaired ? `not SOL-paired (${venue})` : null;
    (async () => {
      let name = meta?.name, symbol = meta?.symbol, createTs = meta?.create_ts;
      if (!name || !createTs) { try { const d = await dexInfo(mint); name ||= d.name; symbol ||= d.symbol; createTs ||= d.createdAt; } catch {} }
      const ageS = createTs ? now - createTs : null;
      if (ageS != null && (ageS < CFG.P5_MIN_AGE_S || ageS > CFG.MOM_MAX_AGE_D * 86400)) return;
      // v0.18.172 executor book AS (shadow): the page's standard filters decided at the trigger, from the same inputs - socials not known-absent, creator has not bought and sold out (ledger balance 0), biggest buyer in the trigger minute 3-5 SOL
      let asStd = null; try { const h = holdersNow(mint, meta?.creator); const devOut = (meta?.dev_buy_sol || 0) > 0 && h?.dev != null && h.dev === 0; const bigSol = (feat.maxShare || 0) * bSol; asStd = meta?.has_socials !== 0 && !devOut && bigSol >= 3 && bigSol < 5; } catch {}
      const pos = OFF_KINDS.has(strat) ? null : openCopy(strat, `${lv}SOL/60s`, mint, name || mint.slice(0, 8), symbol || "", px, mc, now, { v5, venue, ageS, wall0, blockTs: tr.ts, pass: !skipWhy, skipWhy, asStd, bundle: meta?.bundle_pct ?? null, bundleWallets: meta?.bundle_wallets ?? null, wal60: wal.size, preBuyers, creator: meta?.creator || null });
      p5.fired++; if (wide) p5.wide++; else p5.byLevel[lv] = (p5.byLevel[lv] || 0) + 1;
      if (pos?.id) { pos.alerted = false; try { feat.ctx = triggerContext(mint, { ...(meta || {}), name: name || meta?.name, symbol: symbol || meta?.symbol }, now, s); } catch {} try { q.setV2m.run(Math.round(bU), pos.id); q.setEarly.run(JSON.stringify(feat), pos.id); } catch {}
        try { enrichEntry(pos.id, mint, s.w5, now); } catch (e) { console.error("[p5 enrich]", e.message); } // v0.18.113: snipers, proven wallets, dex-paid, fresh wallets — the same enrichment the core trigger gets
        if (maxW && !String(maxW).startsWith("tx:")) { feat.maxWallet = maxW; try { walletStatsFor(pos.id, "big", maxW); } catch {} } } // v0.18.122: the biggest buyer's 7-day GMGN record (gw_big_*)
      // v0.18.142 A5 (owner, 19 Oct 19:56 UK; the 19:48 analysis: 51 of A's coins whose price was ≥ 1.02x the trigger 5 s later made +4.4% a trade at real costs vs A's −1.7%, stops 25% vs 40%):
      // 5 s after A's own trigger, if A took the coin and the price is still ≥ A5_MIN x the trigger price, open book A5 (strategy p5c5) at that price — its own paper trade, its own executor leg
      // v0.18.146: the confirm books only read a price the tracker is current on: skipped when A's own trigger was > CONFIRM_MAX_LAG_S behind the chain or the feed is now
      // (19 Oct 20:39 UK: after a restart the tracker was 21 s behind; A5 saw "1.16x" while the pool was at 0.70x of paper and the shadow buy filled 31% below it)
      const confirmBook = (book, waitMs, minR, label) => { if (pos?.id && strat === "p5e30" && !skipWhy && !OFF_KINDS.has(book)) setTimeout(() => { try {
        p5[book + "c"] = (p5[book + "c"] || 0) + 1; const lagA = (pos.fs?.lag ?? 0) / 1000, lagNow = feedBehindS(); if (lagA > CONFIRM_MAX_LAG_S || lagNow > CONFIRM_MAX_LAG_S) { p5[book + "lag"] = (p5[book + "lag"] || 0) + 1; return; }
        const ap = positionsOf(mint).find((x) => x.id === pos.id), lp = ap?.lastPx, lmc = ap?.lastMc; if (!(lp > 0)) return;
        const r = lp / px; if (r < minR) { p5[book + "s"] = (p5[book + "s"] || 0) + 1; return; } try { if (q.hasStrat.get(book, mint)) return; } catch {}
        const t5 = Math.floor(Date.now() / 1000), p2 = openCopy(book, label, mint, name || mint.slice(0, 8), symbol || "", lp, lmc || mc, t5, { v5, venue, ageS: ageS != null ? ageS + 5 : null, wall0: Date.now(), blockTs: t5, pass: true, skipWhy: null, bundle: meta?.bundle_pct ?? null, bundleWallets: meta?.bundle_wallets ?? null, wal60: wal.size, preBuyers, creator: meta?.creator || null });
        if (p2?.id) { p2.alerted = false; p5[book + "t"] = (p5[book + "t"] || 0) + 1; try { q.setEarly.run(JSON.stringify({ ...feat, a5: { trigPx: px, px5: lp, r: +r.toFixed(4), aId: pos.id, waitS: waitMs / 1000, lagA, lagNow } }), p2.id); } catch {} }
      } catch (e) { console.error("[" + book + "]", e.message); } }, waitMs); };
      confirmBook("p5c5", 5000, A5_MIN, "A5 +5s"); // A5: 5 s, ≥ 1.02x
      confirmBook("p5c10", 10000, 1.05, "F6 +10s"); // v0.18.146 F6 (the 21:40 study): 10 s, ≥ 1.05x — +8.3% on 56, stop 12%; paper
    })().catch((e) => console.error("[p5 early]", e.message));
  }
}
const A5_MIN = Number(process.env.A5_MIN || 1.02), CONFIRM_MAX_LAG_S = Number(process.env.CONFIRM_MAX_LAG_S || 8); // normal feed: 1–5 s behind block time
function dipCheck(mint, s, tr, now) {
  const d = s.dip; if (!d || d.done) return;
  if (now - d.ts > CFG.MOM_DIP_WINDOW_S || tr.price >= d.px * 1.5) { d.done = true; return; }
  if (tr.price <= d.px * (1 - CFG.MOM_DIP_PCT)) { d.done = true; if (!OFF_KINDS.has("momdip")) try { openCopy("momdip", `-${Math.round(CFG.MOM_DIP_PCT * 100)}%`, mint, d.name, d.symbol, tr.price, tr.mc, now, { v5: s.w5.reduce((a, x) => a + x.usd, 0), venue: tr.venue, ageS: (() => { const m = q.tokenMeta.get(mint); return m?.create_ts ? now - m.create_ts : null; })() }); } catch (e) { console.error("[momdip]", e.message); } } // v0.18.176 (owner go 21 Oct 13:50 UK): momdip off
}
function updatePos(mint, s, px, now) {
  const p = s.pos; if (!p || p.closed) return;
  if (px > p.peak) p.peak = px;
  if (s.lastMc > s.posPeakMc) s.posPeakMc = s.lastMc;
  const mult = px / p.entry, fromPeak = px / p.peak - 1, x = p.x;
  if (x.tp == null && mult >= 2) x.tp = 2;
  if (x.tp15 == null && mult >= 1.5) x.tp15 = 1.5; // v0.18.3
  if (x.tsl25 == null && fromPeak <= -0.25) x.tsl25 = mult;
  stopStep(x, mult);
  { const v5f = s.w5.reduce((a, z) => a + z.usd, 0), buf = s.w5.filter((z) => z.b).reduce((a, z) => a + z.usd, 0); flowStep(p, x, mult, fromPeak, v5f, buf, v5f - buf); }
  ffStep(p, x, mult, now - p.entryTs); // v0.18.17
  s15Step(p, x, mult); if (x.s15be != null && p.s15Saved !== x.s15be) { p.s15Saved = x.s15be; try { q.setS15.run(x.s15be, p.id); } catch {} } // v0.18.49
  h2Step(p, x, mult, fromPeak); if (x.h2t40 != null && p.h2Saved !== x.h2t40) { p.h2Saved = x.h2t40; try { q.setH2.run(x.h2t40, p.id); } catch {} } // v0.18.35
  h5Step(p, x, mult, now - p.entryTs); { const kh = h5Key(x); if (p.h5Saved !== kh) { p.h5Saved = kh; try { q.setH5.run(x.h5 ?? null, x.h5f12 ?? null, x.h5f14 ?? null, x.h3 ?? null, x.h15 ?? null, x.h5fast ?? null, p.id); } catch {} } } // v0.18.81
  splitStep(p, x, mult, fromPeak, now - p.entryTs); // v0.18.22
  deadStep(p, x, mult, now - p.entryTs, s.w5.filter((z) => now - z.ts <= 300).reduce((a, z) => a + z.usd, 0), now); // v0.18.30
  if ((x.dead != null || x.split != null) && p.deadSaved !== `${x.dead}|${x.split}`) { p.deadSaved = `${x.dead}|${x.split}`; try { q.setDead.run(x.dead ?? null, (x.dead != null || x.split != null) ? p3dFinal(p, x, mult) : null, p.id); } catch {} }
  { const ks = `${x.split}|${p.splitBranch}`; if (p.splitSaved !== ks) { p.splitSaved = ks; try { q.setSplit.run(x.split ?? null, p.splitBranch ?? null, p.id); } catch {} } }
  { const k2 = `${x.flow}|${x.t15s40}|${x.t2s40}|${p.ddPre15}|${x.flow4}`; if (p.ex2Saved !== k2) { p.ex2Saved = k2; try { q.setExits2.run(x.flow ?? null, x.t15s40 ?? null, x.t2s40 ?? null, p.ddPre15 ?? null, x.flow4 ?? null, p.id); } catch {} } }
  if (x.flow4ff != null && p.ffSaved !== x.flow4ff) { p.ffSaved = x.flow4ff; try { q.setFlow4ff.run(x.flow4ff, p.id); } catch {} }
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tsl80 == null && fromPeak <= -0.80) x.tsl80 = mult;
  markExitTimes(x, now - p.entryTs); if (p.core) { try { noteExits(p.id, mint, x, now - p.entryTs); } catch {} } // v0.18.118: exit timings for the data set (book E)
  // half at 2x + 60% trail on the rest
  if (!p.tp.half && mult >= 2) p.tp.half = true;
  if (x.half60 == null && fromPeak <= -0.60) x.half60 = p.tp.half ? 0.5 * 2 + 0.5 * mult : mult;
  // two-phase: 40% trail until 2x; then half out, 60% trail
  if (!p.tp.twoHalf && mult >= 2) p.tp.twoHalf = true;
  if (x.twophase == null) { if (!p.tp.twoHalf && fromPeak <= -0.40) x.twophase = mult; else if (p.tp.twoHalf && fromPeak <= -0.60) x.twophase = 0.5 * 2 + 0.5 * mult; }
  // ladder: 25% at 2x, 25% at 3x, rest 60% trail
  if (!p.lad.s2 && mult >= 2) p.lad.s2 = true;
  if (!p.lad.s3 && mult >= 3) p.lad.s3 = true;
  if (x.ladder == null && fromPeak <= -0.60) x.ladder = (p.lad.s2 ? 0.25 * 2 : 0) + (p.lad.s3 ? 0.25 * 3 : 0) + (1 - (p.lad.s2 ? 0.25 : 0) - (p.lad.s3 ? 0.25 : 0)) * mult;
  x.levels = levelsStep(p.lv, p.entryMc, s.lastMc, mult, fromPeak);
  if (x.m1 == null) { if (s.lastMc >= CFG.M1_EXIT_USD) x.m1 = mult; else if (fromPeak <= -0.60) x.m1 = mult; }
  const v5 = s.w5.reduce((a, z) => a + z.usd, 0);
  if (x.m1vol == null) { if (s.lastMc >= CFG.M1_EXIT_USD && v5 < CFG.M1_HOLD_VOL5M) x.m1vol = mult; else if (fromPeak <= -0.60) x.m1vol = mult; }
  if (x.volstop == null && fromPeak <= -0.60) { const bu = s.w5.filter((z) => z.b).reduce((a, z) => a + z.usd, 0), su = s.w5.filter((z) => !z.b).reduce((a, z) => a + z.usd, 0); if (volStopExit(fromPeak, v5, bu, su, p.volAtEntry)) x.volstop = mult; }
  q.updMom.run(s.posPeakMc, p.peak / p.entry, x.tp ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tsl80 ?? null, x.half60 ?? null, x.twophase ?? null, x.ladder ?? null, null, null, null, null, null, null, 0, x.levels ?? null, x.m1 ?? null, x.m1vol ?? null, x.volstop ?? null, p.id);
  if (pathStep(p, p.entryTs, now, mult, s.w5.reduce((a, z) => a + z.usd, 0), (() => { const t = s.w5.reduce((a, z) => a + z.usd, 0); return t > 0 ? s.w5.filter((z) => !z.b).reduce((a, z) => a + z.usd, 0) / t : null; })(), s.w5)) { try { q.setPath.run(JSON.stringify(p.path), p.id); } catch {} } // v0.18.14; v0.18.17 passes the window for clean flow
  if (x.tp15 != null && !p.hit15Saved) { p.hit15Saved = true; try { q.setHit15.run(now - p.entryTs, p.id); } catch {} }
  { const key = `${x.tp15}|${x.tsl25}|${x.t15s25}|${x.t15s60}|${x.t2s25}|${x.t2s60}`; if (p.stopsSaved !== key) { p.stopsSaved = key; try { q.setStops.run(x.tp15 ?? null, x.tsl25 ?? null, x.t15s25 ?? null, x.t15s60 ?? null, x.t2s25 ?? null, x.t2s60 ?? null, p.id); } catch {} } }
  if (x.tsl80 != null) closePos(mint, s, "tsl80");
  else if (lvReady(now) && lowVol(s.w5, now)) closePos(mint, s, "lowvol"); // v0.18.36
}
// v0.18.36: sell on every project's rule at once when the coin's 5-minute volume drops below LOWVOL_EXIT_USD. The core window already
// holds the pre-entry trades, so it applies at any time — but only once this process has seen 5 full minutes (no false "quiet" after a restart).
export const lowVolReady = (now) => lvReady(now);
export const lowVol = (w, now) => w.reduce((a, z) => a + (now - z.ts <= 300 ? z.usd : 0), 0) < CFG.LOWVOL_EXIT_USD;

function finalVariants(p, mult) {
  const x = p.x;
  const out = {
    tp: x.tp ?? mult, tsl40: x.tsl40 ?? mult, tsl60: x.tsl60 ?? mult, tsl80: x.tsl80 ?? mult,
    half60: x.half60 ?? (p.tp.half ? 0.5 * 2 + 0.5 * mult : mult),
    twophase: x.twophase ?? (p.tp.twoHalf ? 0.5 * 2 + 0.5 * mult : mult),
    ladder: x.ladder ?? ((p.lad.s2 ? 0.5 : 0) + (p.lad.s3 ? 0.75 : 0) + (1 - (p.lad.s2 ? 0.25 : 0) - (p.lad.s3 ? 0.25 : 0)) * mult),
    time: mult,
    levels: levelsFinal(p.lv, mult),
    m1: x.m1 ?? mult, m1vol: x.m1vol ?? mult, volstop: x.volstop ?? mult,
    tp15: x.tp15 ?? mult, tsl25: x.tsl25 ?? mult, flow: x.flow ?? mult, flow4: x.flow4 ?? (x.flow ?? mult), ...stopFinal(x, mult, p.peak / p.entry),
  };
  out.flow4ff = ffFinal(x, out.flow4); // v0.18.17
  out.split = splitFinal(p, x, mult); // v0.18.22
  out.dead = x.dead ?? mult; out.p3d = p3dFinal(p, x, mult); // v0.18.30
  out.h2t40 = h2Final(p, x, mult); // v0.18.35
  out.s15be = s15Final(p, x, mult); // v0.18.49
  Object.assign(out, h5Final(p, x, mult)); // v0.18.81
  return out;
}

function closePos(mint, s, reason) {
  const p = s.pos; if (!p || p.closed) return;
  p.closed = true; mom.closes++;
  const now = Math.floor(Date.now() / 1000), px = s.lastPx || p.entry, mult = px / p.entry, v = finalVariants(p, mult), peakMult = p.peak / p.entry;
  s.trades.push({ id: p.id, closedTs: now });
  q.updMom.run(s.posPeakMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, s.lastMc, px, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  try { q.setStops.run(v.tp15, v.tsl25, v.t15s25, v.t15s60, v.t2s25, v.t2s60, p.id); q.setExits2.run(v.flow, v.t15s40, v.t2s40, p.ddPre15 ?? null, v.flow4, p.id); q.setFlow4ff.run(v.flow4ff, p.id); q.setH2.run(v.h2t40, p.id); q.setS15.run(v.s15be, p.id); q.setSplit.run(v.split, p.splitBranch ?? null, p.id); q.setDead.run(v.dead, v.p3d, p.id); q.setH5.run(v.h5, v.h5f12, v.h5f14, v.h3, v.h15, v.h5fast, p.id); if (p.manual) q.setManual.run(p.manual.banked + (1 - p.manual.sold) * mult, p.manual.sold, p.manual.ts, p.id); } catch {}
  const pc = (m) => `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`;
  if (p.alerted) tg(`${v.half60 >= 1 ? "✅" : "🔴"} <b>VOLUME CLOSE</b> — ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\n` +
    `½@2x+60%: <b>${pc(v.half60)}</b> · 2-phase: ${pc(v.twophase)} · ladder: ${pc(v.ladder)} · levels: ${pc(v.levels)}\n$1M-out: ${pc(v.m1)} · $1M-vol: ${pc(v.m1vol)} · vol-stop: ${pc(v.volstop)}\n` +
    `P3 split: <b>${pc(v.split)}</b> (${p.splitBranch || "—"}) · P3+dead: ${pc(v.p3d)} · dead-only: ${pc(v.dead)} · flow: ${pc(v.flow)} · 1.5x-out: ${pc(v.tp15)} · 1.5x/−25: ${pc(v.t15s25)} · 1.5x/−60: ${pc(v.t15s60)} · 2x/−25: ${pc(v.t2s25)} · 2x/−60: ${pc(v.t2s60)} · trail25: ${pc(v.tsl25)}\n2x out: ${pc(v.tp)} · trail40: ${pc(v.tsl40)} · trail60: ${pc(v.tsl60)} · trail80: ${pc(v.tsl80)} · hold: ${pc(v.time)}`, { replyTo: p.msgId });
}

function scorecard(mint, s, m) {
  const p = s.pos; if (!p || !p.alerted) return;
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0), b = s.w5.filter((x) => x.b).length, sl = s.w5.length - b;
  const mult = (s.lastPx || p.entry) / p.entry, peakMult = p.peak / p.entry;
  const flags = [];
  if (sl > b) flags.push("⚠️ sells > buys");
  if (v5 < CFG.VOL5M_USD * 0.25) flags.push("💤 volume faded");
  if (p.closed) flags.push(`closed`);
  tg(`⏱ <b>+${m}m</b> ${esc(p.name)} · MC <b>$${fmt(s.lastMc)}</b> (${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(0)}%, peak ${peakMult.toFixed(2)}x) · 5m vol $${fmt(v5)} · buys ${b} / sells ${sl}` + (flags.length ? `\n${flags.join(" · ")}` : ""), { replyTo: p.msgId });
}

/** v0.18: what momentum currently holds for a mint (for /check) */
export function momSnap(mint) {
  const s = T.get(mint); if (!s) return null;
  const now = Math.floor(Date.now() / 1000), w5 = s.w5.filter((x) => now - x.ts <= 300);
  const venues = {}; for (const x of w5) venues[x.v] = (venues[x.v] || 0) + x.usd;
  return { v1: s.w1.filter((x) => now - x.ts <= 60).reduce((a, x) => a + x.usd, 0), v5: w5.reduce((a, x) => a + x.usd, 0), buys: w5.filter((x) => x.b).length, sells: w5.filter((x) => !x.b).length, wallets: new Set(w5.map((x) => x.w)).size, lastMc: s.lastMc, lastTs: s.lastTs, peakMc: s.peakMc, venues, open: !!(s.pos && !s.pos.closed), trades: s.trades.length };
}
export const momStats = () => ({ ...mom, open: [...T.values()].filter((s) => s.pos && !s.pos.closed).length });
export const memStats = () => { let w5 = 0, seen = 0, buyers = 0, w1 = 0; for (const s of T.values()) { w5 += s.w5.length; w1 += s.w1.length; seen += s.seen.size; buyers += s.buyers.length; } return { mints: T.size, w5, w1, seen, buyers }; }; // v0.18.18

/** 4-hourly strategy summary text */
export function strategySummary(hours) {
  const to = Math.floor(Date.now() / 1000), from = to - hours * 3600;
  const rows = q.stratSummary.all(from, to + 60); try { const t = q.stratSummaryTight.get(from, to + 60); if (t && t.n) rows.push(t); } catch {} try { const t = q.stratSummaryCore.get(from, to + 60); if (t && t.n) rows.push(t); } catch {} try { const t = q.stratSummaryCoreTight.get(from, to + 60); if (t && t.n) rows.push(t); } catch {}
  const pc = (v) => (v == null ? "—" : `${v >= 1 ? "+" : ""}${((v - 1) * 100).toFixed(0)}%`);
  if (!rows.length) return `📋 <b>${hours}h summary</b> — no paper trades`;
  let t = `📋 <b>${hours}h summary</b> · ${new Date().toISOString().slice(11, 16)} UTC\n`;
  for (const r of rows) {
    t += `\n<b>${r.strategy === "early" ? "EARLY (curve)" : r.strategy === "secondwave" ? "SECOND WAVE (curve)" : r.strategy === "copy" ? "COPY (watched wallets)" : r.strategy === "confirm" ? "CONFIRMED (+5m, curve)" : r.strategy === "copycreator" ? "COPY CREATOR" : r.strategy === "climber" ? "CLIMBER (slow riser)" : r.strategy === "grad" ? "GRADUATION (pool open)" : r.strategy === "wave2" ? "SECOND WAVE EARLY (2–4m)" : r.strategy === "momfast" ? "MOMENTUM FAST ($50K in 2m, silent)" : r.strategy === "momdip" ? "MOMENTUM DIP ENTRY (−20% within 10m, silent)" : r.strategy === "momre" ? "MOMENTUM RE-ENTRY (after 1.5x-out or −25% stop, silent)" : r.strategy === "mom60" ? "MOMENTUM $60K/5m (silent)" : r.strategy === "mom80" ? "MOMENTUM $80K/5m (silent)" : r.strategy === "momentum-core-tight" ? "MOMENTUM — CORE TIGHT (<$60K · <6m · steady sizes)" : r.strategy === "momentum-core" ? "MOMENTUM — CORE ($100K/5m · entry <$100K · first entry)" : r.strategy === "wave2-tight" ? "SECOND WAVE — TIGHT (2–3m · $12–25K · dev holds · buys ≥1.3× sells)" : r.strategy === "revival" ? "REVIVAL (curve dip + new buyers)" : r.strategy === "gradrun" ? "GRADUATION RUNNER (vol after grad)" : r.strategy === "gradrec" ? "GRADUATION RECOVERY (dump + buyers back)" : r.strategy === "slow" ? "SLOW BUILD (base breakout)" : "MOMENTUM (volume)"}</b> — ${r.n} trades · ${r.hit15 ?? 0} hit 1.5x (${r.n ? (((r.hit15 || 0) / r.n) * 100).toFixed(0) : 0}%) · ${r.hit2x} hit 2x (${r.n ? ((r.hit2x / r.n) * 100).toFixed(0) : 0}%) · avg peak ${(r.peak || 1).toFixed(2)}x\n`;
    t += `½@2x+60% ${pc(r.xh)} · 2-phase ${pc(r.x2p)} · ladder ${pc(r.xl)} · levels ${pc(r.xlv)} · $1M-out ${pc(r.xm1)} · $1M-vol ${pc(r.xm1v)} · vol-stop ${pc(r.xvs)} · combo ${pc(r.xc)}\n1.5x-out ${pc(r.xtp15)} · trail25 ${pc(r.x25)} · 2x-out ${pc(r.xtp)} · trail40 ${pc(r.x40)} · trail60 ${pc(r.x60)} · trail80 ${pc(r.x80)} · hold ${pc(r.xt)}\nstops — 1.5x/−25 ${pc(r.s1525)} · 1.5x/−40 ${pc(r.s1540)} · 1.5x/−60 ${pc(r.s1560)} · 2x/−25 ${pc(r.s225)} · 2x/−40 ${pc(r.s240)} · 2x/−60 ${pc(r.s260)} · flow ${pc(r.xflow)} · flow→4x ${pc(r.xflow4)} · flow→4x+fastfail ${pc(r.xflow4ff)} · <b>P3 split ${pc(r.xsplit)}</b> · P3+dead ${pc(r.xp3d)}${r.nv40 ? ` · v40 tag: ${r.nv40} trades, flow→4x ${pc(r.xv40)}` : ""}\nran after entry (24h): avg peak ${(r.ap || 1).toFixed(2)}x · ${r.ap3 || 0} went 3x+\n`;
  }
  return t;
}
/** v0.18.30: dashboard "sell" (paper). pct 1 closes the position now ("manual"); a partial banks pct at the current price and the
 *  remainder is scored at whatever the position finally closes at. Recorded as x_manual so human exits can be compared with the rules. */
export function manualSell(id, pct) {
  for (const [mint, s] of T) {
    const p = s.pos; if (!p || p.closed || p.id !== id) continue;
    const now = Math.floor(Date.now() / 1000), px = s.lastPx || p.entry, mult = px / p.entry;
    const prev = p.manual || { banked: 0, sold: 0 }; const take = Math.min(pct, 1 - prev.sold);
    if (take <= 0) return { ok: false, error: "already fully sold" };
    p.manual = { banked: prev.banked + take * mult, sold: prev.sold + take, ts: now };
    const partialValue = p.manual.banked + (1 - p.manual.sold) * mult;
    try { q.setManual.run(partialValue, p.manual.sold, now, p.id); } catch {}
    if (p.manual.sold >= 0.999) closePos(mint, s, "manual");
    return { ok: true, mult, sold: p.manual.sold, value: partialValue };
  }
  return { ok: false, error: "position not open (already closed, or not a momentum position)" };
}
/** v0.18.23: open momentum positions for the dashboard */
export function openPositions() {
  const now = Math.floor(Date.now() / 1000), out = [];
  for (const [mint, s] of T) {
    const p = s.pos; if (!p || p.closed) continue;
    out.push({ id: p.id, mint, name: p.name, entry: p.entry, entryMc: p.entryMc, entryTs: p.entryTs, ageS: now - p.entryTs, lastPx: s.lastPx || p.entry, lastMc: s.lastMc, lastTs: s.lastTs, pxSrc: s.pxSrc || (s.lastTs ? "trade" : null), pxAge: s.pxTs ? now - s.pxTs : (s.lastTs ? now - s.lastTs : null), peak: p.peak, mult: (s.lastPx || p.entry) / p.entry, peakMult: p.peak / p.entry,
      x: { tp15: p.x.tp15 ?? null, t15s40: p.x.t15s40 ?? null, flow4: p.x.flow4 ?? null, flow: p.x.flow ?? null, split: p.x.split ?? null }, splitBranch: p.splitBranch || null, splitHalf: !!p.splitHalf, flowArmed: !!p.flowArmed, kind: p.kind, restored: p.restored || null, manualSold: p.manual?.sold || 0, conf: s.conf ? { done: s.conf.done, ok: s.conf.ok, ratio: s.conf.ratio, left: Math.max(0, CFG.MOM_CONF_S - (now - s.conf.ts)) } : null, v5: s.w5.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0) });
  }
  return out.sort((a, b) => b.entryTs - a.entryTs);
}
