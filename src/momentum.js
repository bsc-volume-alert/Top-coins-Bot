// v0.5: momentum (volume) strategy on PumpSwap. Rolling 5m/1m USD volume per token → alert + paper trade with parallel exits.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { onSwap } from "./pumpswap.js";
import { solUsdCached } from "./price.js";
import { tg } from "./telegram.js";
import { esc, fmt, links } from "./launch-monitor.js";
import { getSocials, socialsLine } from "./socials.js";
import { nextLevel, lastLevel, wallWarning, levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
import { pumpSwapTick, clusterSnap } from "./signals.js";
import { watch as afterWatch, tick as afterTick } from "./aftercare.js";
import { retrySocials } from "./socials.js";
import { volumeQuality, qualityLine } from "./quality.js";
import { stopStep, stopFinal, flowStep, pathStep, ffStep, ffFinal, cleanFlow, splitStep, splitFinal, deadStep, p3dFinal } from "./exits.js";
import { openCopy } from "./copytrade.js";
const coreListeners = []; export const onCoreEntry = (fn) => coreListeners.push(fn);
import { feeInfo, feeLine } from "./fees.js";
import { recordHoldersAsync, holdersLine } from "./holders.js";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { provenCount } from "./wallets.js";
import { enrichEntry, sniperInfo, provenShare, enrichLine } from "./enrich.js"; // v0.18.19
import { dexPrice } from "./sweeper.js"; // v0.18.29

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
      const o = { w5: s.w5, w1: s.w1, buyers: s.buyers, lastTs: s.lastTs, lastAlert: s.lastAlert, lastPx: s.lastPx, lastMc: s.lastMc, peakMc: s.peakMc, trades: s.trades, firstEntryPx: s.firstEntryPx, posPeakMc: s.posPeakMc, rejectedLevel: s.rejectedLevel, dip: s.dip };
      if (s.pos && !s.pos.closed) { const p = s.pos; o.pos = { id: p.id, entry: p.entry, entryMc: p.entryMc, entryTs: p.entryTs, peak: p.peak, x: p.x, lad: p.lad, tp: p.tp, msgId: p.msgId, alerted: p.alerted, name: p.name, lv: p.lv, kind: p.kind, volAtEntry: p.volAtEntry, flowArmed: p.flowArmed, flowSince: p.flowSince, ffDone: p.ffDone, splitBranch: p.splitBranch, splitHalf: p.splitHalf, splitAt: p.splitAt, deadSince: p.deadSince, deadAt: p.deadAt, manual: p.manual, ddPre15: p.ddPre15, path: p.path, hit15Saved: p.hit15Saved }; } // v0.18.28: open positions survive restarts
      out[m] = o;
    }
    writeFileSync(STATE_FILE + ".tmp", JSON.stringify({ ts: now, T: out })); renameSync(STATE_FILE + ".tmp", STATE_FILE);
  } catch (e) { console.error("[momentum save]", e.message); }
}
function loadState() {
  try {
    const j = JSON.parse(readFileSync(STATE_FILE, "utf8")), now = Math.floor(Date.now() / 1000); let n = 0, tr = 0, pr = 0;
    if (now - j.ts > 600) return console.log("[momentum] state file too old, ignored");
    for (const [m, v] of Object.entries(j.T || {})) {
      const s = st(m); s.w5 = (v.w5 || []).filter((x) => now - x.ts <= 300); s.w1 = (v.w1 || []).filter((x) => now - x.ts <= 60); s.buyers = (v.buyers || []).filter((x) => now - x.ts <= CFG.PREPUMP_WINDOW_S);
      Object.assign(s, { lastTs: v.lastTs || 0, lastAlert: v.lastAlert || 0, lastPx: v.lastPx || 0, lastMc: v.lastMc || 0, peakMc: v.peakMc || 0, trades: v.trades || [], firstEntryPx: v.firstEntryPx ?? null, posPeakMc: v.posPeakMc || 0, rejectedLevel: v.rejectedLevel ?? null, dip: v.dip ?? null }); n++; tr += s.w5.length;
      if (v.pos && v.pos.id) { s.pos = { ...v.pos, closed: false, lv: v.pos.lv || newLevels(), lad: v.pos.lad || { s2: false, s3: false }, tp: v.pos.tp || { half: false, twoHalf: false }, x: v.pos.x || {} }; armClose(m, s); pr++; }
    }
    console.log(`[momentum] restored ${n} tokens / ${tr} swaps / ${pr} open positions from state saved ${now - j.ts}s ago`);
  } catch (e) { if (e.code !== "ENOENT") console.error("[momentum load]", e.message); }
}
function armClose(mint, s) { const left = CFG.MOM_MAX_HOLD_MIN * 60_000 - (Date.now() - s.pos.entryTs * 1000); setTimeout(() => closePos(mint, s, "time"), Math.max(5_000, left)); }
// v0.18.28: anything still open in the database but not in the state file (older restarts, state file too old) is rebuilt from its row,
// so no paper position is ever orphaned by a restart again. Exits already recorded are kept; tracking resumes from the current price.
const qOpenMom = db.prepare(`SELECT id, mint, name, entry_ts, entry_mc, entry_price, peak_mult, vol_at_entry, alerted, trigger_kind, x_tp, x_tp15, x_tsl25, x_tsl40, x_tsl60, x_tsl80, x_half60, x_twophase, x_ladder, x_levels, x_m1, x_m1vol, x_volstop, x_t15s25, x_t15s40, x_t15s60, x_t2s25, x_t2s40, x_t2s60, x_flow, x_flow4, x_flow4ff, x_split, split_branch, dd_pre15, path, t_hit15_s
  FROM paper_trades WHERE strategy='momentum' AND closed=0 AND COALESCE(invalid,0)=0 AND entry_ts > ? ORDER BY entry_ts`);
function restoreFromDb() {
  const now = Math.floor(Date.now() / 1000); let n = 0;
  try {
    for (const r of qOpenMom.all(now - CFG.MOM_MAX_HOLD_MIN * 60)) {
      if (!(r.entry_price > 0)) continue; const s = st(r.mint); if (s.pos && !s.pos.closed) continue;
      const x = {}; for (const k of ["tp", "tp15", "tsl25", "tsl40", "tsl60", "tsl80", "half60", "twophase", "ladder", "levels", "m1", "m1vol", "volstop", "t15s25", "t15s40", "t15s60", "t2s25", "t2s40", "t2s60", "flow", "flow4", "flow4ff", "split"]) if (r["x_" + k] != null) x[k] = r["x_" + k];
      let path = {}; try { path = r.path ? JSON.parse(r.path) : {}; } catch {}
      const peak = r.entry_price * Math.max(r.peak_mult || 1, 1);
      s.pos = { id: r.id, entry: r.entry_price, entryMc: r.entry_mc, entryTs: r.entry_ts, peak, x, lad: { s2: peak / r.entry_price >= 2, s3: peak / r.entry_price >= 3 }, tp: { half: peak / r.entry_price >= 2, twoHalf: peak / r.entry_price >= 2 }, closed: false, msgId: null, alerted: !!r.alerted, name: r.name, lv: newLevels(), kind: (r.trigger_kind || "vol5m").split("-")[0], volAtEntry: r.vol_at_entry || 0,
        flowArmed: x.tp15 != null, flowSince: 0, ffDone: (now - r.entry_ts) >= 120, splitBranch: r.split_branch && r.split_branch !== "sweep" ? r.split_branch : null, splitHalf: r.split_branch === "mid" && peak / r.entry_price >= 1.5, ddPre15: r.dd_pre15 ?? null, path, hit15Saved: r.t_hit15_s != null, restored: "db" };
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
      if (!s.pos || s.pos.closed || now - s.lastTs < 120 || n >= 25) continue;
      const px = await dexPrice(mint).catch(() => null); n++;
      if (px > 0) { s.lastPx = px; s.lastMc = px * CFG.TOTAL_SUPPLY * solUsdCached(); s.pxSrc = "dex"; s.pxTs = now; updatePos(mint, s, px, now); }
    }
  } finally { refreshing = false; }
}
setTimeout(refreshIdle, 8_000); setInterval(refreshIdle, 60_000);
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

onSwap((tr) => {
  const s = st(tr.mint), usd = tr.sol * solUsdCached(), now = tr.ts || Math.floor(Date.now() / 1000);
  s.lastTs = now; s.lastPx = tr.price; s.lastMc = tr.mc; s.pxSrc = "trade"; s.pxTs = now;
  if (tr.mc > s.peakMc) s.peakMc = tr.mc;
  // level rejection: price fell >30% from a peak that was above a level → that level is "rejected"
  if (s.peakMc > 0 && tr.mc < s.peakMc * 0.7) { const L = lastLevel(s.peakMc); if (L && L > tr.mc) s.rejectedLevel = L; }
  s.w5.push({ ts: now, usd, b: tr.isBuy, w: tr.wallet, route: tr.route || "unknown", px: tr.price, v: tr.venue || "pumpswap" }); while (s.w5.length && now - s.w5[0].ts > 300) { const old = s.w5.shift(); if (s.seen.size < 5000) s.seen.add(old.w); }
  if (tr.isBuy && tr.wallet && !tr.wallet.startsWith("tx:")) { s.buyers.push({ ts: now, w: tr.wallet, sol: tr.sol, mc: tr.mc, v: tr.venue || "pumpswap" }); if (s.buyers.length > 5000) s.buyers.splice(0, 1000); }
  s.w1.push({ ts: now, usd, b: tr.isBuy }); while (s.w1.length && now - s.w1[0].ts > 60) s.w1.shift();
  if (s.pos) updatePos(tr.mint, s, tr.price, now);
  dipCheck(tr.mint, s, tr, now);
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0);
  const bsu = [s.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), s.w5.filter((x) => !x.b).reduce((a, x) => a + x.usd, 0)];
  pumpSwapTick(tr.mint, tr, v5, bsu); afterTick(tr.mint, tr.price, tr.mc);
  if (usd <= 0) return;
  const v1 = s.w1.reduce((a, x) => a + x.usd, 0);
  const b1 = s.w1.filter((x) => x.b).length, s1 = s.w1.length - b1;
  const burst = CFG.BURST_TRIGGER && v1 >= CFG.VOL1M_BURST_USD && b1 > s1 && tr.mc >= CFG.BURST_MIN_MC && (() => { const m = q.tokenMeta.get(tr.mint); return !m?.create_ts || now - m.create_ts >= CFG.BURST_MIN_AGE_S; })();
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
  const core = kind === "vol5m" && tr.mc < CFG.MOM_CORE_MC && !reentry; // v0.18.4
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
  if (core) { s.dip = { px: tr.price, ts: now, done: false, name: name || mint.slice(0, 8), symbol: symbol || "" }; for (const fn of coreListeners) { try { fn({ mint, name: name || mint.slice(0, 8), symbol: symbol || "", price: tr.price, mc: tr.mc, ts: now, pos }); } catch (e) { console.error("[core listener]", e.message); } } } // v0.18.9
  let hl = null; try { hl = holdersLine(await recordHoldersAsync(pos.id, mint, meta?.creator)); } catch {} // v0.18.5
  let fi = null; try { fi = feeInfo(mint, meta?.creator, createTs); q.setFees.run(fi.accrued, fi.claims, fi.claimedSol, pos.id); } catch (e) { console.error("[fees entry]", e.message); }
  if (reentry) { s.peakMc = tr.mc; s.rejectedLevel = null; }
  try { const h = new Date(now * 1000).getUTCHours(); q.setFeatures.run(null, null, null, null, h, null, buyUsd > 0 ? buyUsd / Math.max(sellUsd, 1) : null, buyers, pos.id); } catch {}
  s.pos = pos; s.posPeakMc = tr.mc; if (!s.firstEntryPx) s.firstEntryPx = tr.price;
  pos.volAtEntry = v5; q.setVolEntry.run(v5, pos.id); afterWatch(mint, pos.id, tr.price, tr.mc);
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
function dipCheck(mint, s, tr, now) {
  const d = s.dip; if (!d || d.done) return;
  if (now - d.ts > CFG.MOM_DIP_WINDOW_S || tr.price >= d.px * 1.5) { d.done = true; return; }
  if (tr.price <= d.px * (1 - CFG.MOM_DIP_PCT)) { d.done = true; try { openCopy("momdip", `-${Math.round(CFG.MOM_DIP_PCT * 100)}%`, mint, d.name, d.symbol, tr.price, tr.mc, now, { v5: s.w5.reduce((a, x) => a + x.usd, 0), venue: tr.venue, ageS: (() => { const m = q.tokenMeta.get(mint); return m?.create_ts ? now - m.create_ts : null; })() }); } catch (e) { console.error("[momdip]", e.message); } }
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
  splitStep(p, x, mult, fromPeak, now - p.entryTs); // v0.18.22
  deadStep(p, x, mult, now - p.entryTs, s.w5.filter((z) => now - z.ts <= 300).reduce((a, z) => a + z.usd, 0), now); // v0.18.30
  if ((x.dead != null || x.split != null) && p.deadSaved !== `${x.dead}|${x.split}`) { p.deadSaved = `${x.dead}|${x.split}`; try { q.setDead.run(x.dead ?? null, (x.dead != null || x.split != null) ? p3dFinal(p, x, mult) : null, p.id); } catch {} }
  { const ks = `${x.split}|${p.splitBranch}`; if (p.splitSaved !== ks) { p.splitSaved = ks; try { q.setSplit.run(x.split ?? null, p.splitBranch ?? null, p.id); } catch {} } }
  { const k2 = `${x.flow}|${x.t15s40}|${x.t2s40}|${p.ddPre15}|${x.flow4}`; if (p.ex2Saved !== k2) { p.ex2Saved = k2; try { q.setExits2.run(x.flow ?? null, x.t15s40 ?? null, x.t2s40 ?? null, p.ddPre15 ?? null, x.flow4 ?? null, p.id); } catch {} } }
  if (x.flow4ff != null && p.ffSaved !== x.flow4ff) { p.ffSaved = x.flow4ff; try { q.setFlow4ff.run(x.flow4ff, p.id); } catch {} }
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tsl80 == null && fromPeak <= -0.80) x.tsl80 = mult;
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
}

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
  return out;
}

function closePos(mint, s, reason) {
  const p = s.pos; if (!p || p.closed) return;
  p.closed = true; mom.closes++;
  const now = Math.floor(Date.now() / 1000), px = s.lastPx || p.entry, mult = px / p.entry, v = finalVariants(p, mult), peakMult = p.peak / p.entry;
  s.trades.push({ id: p.id, closedTs: now });
  q.updMom.run(s.posPeakMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, s.lastMc, px, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  try { q.setStops.run(v.tp15, v.tsl25, v.t15s25, v.t15s60, v.t2s25, v.t2s60, p.id); q.setExits2.run(v.flow, v.t15s40, v.t2s40, p.ddPre15 ?? null, v.flow4, p.id); q.setFlow4ff.run(v.flow4ff, p.id); q.setSplit.run(v.split, p.splitBranch ?? null, p.id); q.setDead.run(v.dead, v.p3d, p.id); if (p.manual) q.setManual.run(p.manual.banked + (1 - p.manual.sold) * mult, p.manual.sold, p.manual.ts, p.id); } catch {}
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
  return { v5: w5.reduce((a, x) => a + x.usd, 0), buys: w5.filter((x) => x.b).length, sells: w5.filter((x) => !x.b).length, wallets: new Set(w5.map((x) => x.w)).size, lastMc: s.lastMc, lastTs: s.lastTs, peakMc: s.peakMc, venues, open: !!(s.pos && !s.pos.closed), trades: s.trades.length };
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
      x: { tp15: p.x.tp15 ?? null, t15s40: p.x.t15s40 ?? null, flow4: p.x.flow4 ?? null, flow: p.x.flow ?? null, split: p.x.split ?? null }, splitBranch: p.splitBranch || null, splitHalf: !!p.splitHalf, flowArmed: !!p.flowArmed, kind: p.kind, restored: p.restored || null, manualSold: p.manual?.sold || 0, v5: s.w5.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0) });
  }
  return out.sort((a, b) => b.entryTs - a.entryTs);
}
