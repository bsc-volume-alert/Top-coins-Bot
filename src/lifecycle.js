// v0.12: lifecycle sampler (survival funnel), top-10 holder snapshots for survivors, big-buy logging with wallet balance.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on, live } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";
const climbListeners = []; export const onClimb = (fn) => climbListeners.push(fn);
const w2Listeners = []; export const onWave2 = (fn) => w2Listeners.push(fn);
const revListeners = []; export const onRevival = (fn) => revListeners.push(fn);
const grListeners = []; export const onGradRunner = (fn) => grListeners.push(fn);
const grecListeners = []; export const onGradRecovery = (fn) => grecListeners.push(fn);
const slowListeners = []; export const onSlowBuild = (fn) => slowListeners.push(fn);

export const lc = { samples: 0, holderSnaps: 0, bigBuys: 0, tracked: 0 };
const L = new Map(); // mint -> { createTs, w5:[{ts,sol,b,w}], buyers:Set, lastMc, lastTs, graduated, next: idx }
let holderBudget = 0, balBudget = 0, day = new Date().getUTCDate();
const balCache = new Map();
const START_TS = Math.floor(Date.now() / 1000);
const resetDay = () => { const d = new Date().getUTCDate(); if (d !== day) { day = d; holderBudget = 0; balBudget = 0; } };

function st(mint, createTs) {
  let s = L.get(mint);
  if (!s && createTs && createTs >= START_TS) { s = { createTs, w5: [], buyers: new Set(), lastMc: 0, lastTs: 0, graduated: 0, next: 0, cp: {}, maxBurst: 0, lastPx: 0, climbed: false, bts: [], ring: [], peakMc: 0, peakTs: 0, w2: new Set(), revDone: false, lastRev: 0, gradTs: 0, gradPx: 0, gradPeak: 0, grDone: false, grecDone: false, lastGr: 0, dumped: false, lowMc: Infinity, lowTs: 0, slowDone: false, lastSlow: 0 }; L.set(mint, s); }
  return s;
}
function trade(mint, createTs, tr, mc, graduated, venue) {
  const s = st(mint, createTs); if (!s) return;
  const now = tr.ts || Math.floor(Date.now() / 1000);
  s.w5.push({ ts: now, sol: tr.sol, b: tr.isBuy, w: tr.wallet }); while (s.w5.length && now - s.w5[0].ts > 300) s.w5.shift();
  if (tr.isBuy && !s.buyers.has(tr.wallet)) { s.buyers.add(tr.wallet); s.bts.push({ ts: now, w: tr.wallet }); }
  while (s.bts.length && now - s.bts[0].ts > 1260) s.bts.shift();
  s.ring.push({ ts: now, px: tr.price, mc, usd: tr.sol * solUsdCached(), b: tr.isBuy }); while (s.ring.length && now - s.ring[0].ts > 1260) s.ring.shift();
  s.lastMc = mc; s.lastTs = now; s.lastPx = tr.price; if (mc > s.peakMc) { s.peakMc = mc; s.peakTs = now; }
  if (graduated && !s.graduated) { s.graduated = 1; s.gradTs = now; s.gradPx = tr.price; s.gradPeak = mc; }
  if (s.graduated && mc > s.gradPeak) s.gradPeak = mc;
  if (!s.dumped && s.peakMc > 0 && mc <= s.peakMc * (1 - CFG.SLOW_DRAWDOWN)) { s.dumped = true; s.lowMc = mc; s.lowTs = now; }
  if (s.dumped && mc < s.lowMc) { s.lowMc = mc; s.lowTs = now; }
  wave2Check(mint, s, now, venue); revivalCheck(mint, s, now, venue); gradRunnerCheck(mint, s, now); gradRecoveryCheck(mint, s, now); slowBuildCheck(mint, s, now);
  const v1 = s.w5.filter((x) => now - x.ts <= 60).reduce((a, x) => a + x.sol, 0) * solUsdCached(); if (v1 > s.maxBurst) s.maxBurst = v1;
  if (tr.isBuy && tr.sol >= CFG.BIGBUY_SOL) bigBuy(mint, tr, now - s.createTs, mc, venue);
  sample(mint, s, now);
}
function sample(mint, s, now) {
  const cps = CFG.LIFE_CHECKPOINTS;
  while (s.next < cps.length && now - s.createTs >= cps[s.next]) {
    const cp = cps[s.next++];
    const w = s.w5.filter((x) => now - x.ts <= 300);
    const vol = w.reduce((a, x) => a + x.sol, 0) * solUsdCached(), b = w.filter((x) => x.b).length, sl = w.length - b, by = new Set(w.filter((x) => x.b).map((x) => x.w)).size;
    const alive = now - s.lastTs <= 300 && w.length > 0 ? 1 : 0;
    q.insLife.run(mint, cp, now, s.lastMc, vol, b, sl, by, s.buyers.size, s.graduated, null, null, alive); lc.samples++;
    s.cp[cp] = { mc: s.lastMc, buyers: s.buyers.size, b, sl, alive };
    climbCheck(mint, s, cp, now);
    if (cp >= CFG.LIFE_HOLDERS_FROM_S && s.lastMc >= CFG.LIFE_HOLDERS_MIN_MC && alive) holders(mint, cp);
  }
}
async function holders(mint, cp) {
  resetDay(); if (holderBudget >= CFG.LIFE_HOLDER_DAILY_BUDGET) return; holderBudget++;
  try {
    const r = await rpc("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
    const amts = (r?.value || []).map((x) => Number(x.uiAmount || 0));
    // exclude the largest if it is plausibly the pool (>= 15% and PumpSwap pool holds a big chunk) — keep simple: report top10 of all and top10 excluding largest
    const top10 = amts.slice(0, 10).reduce((a, x) => a + x, 0) / CFG.TOTAL_SUPPLY * 100;
    const exclLargest = amts.slice(1, 11).reduce((a, x) => a + x, 0) / CFG.TOTAL_SUPPLY * 100;
    q.setLifeHolders.run(exclLargest, amts.length, mint, cp); lc.holderSnaps++;
  } catch {}
}
async function bigBuy(mint, tr, age, mc, venue) {
  let bal = balCache.get(tr.wallet);
  if (bal === undefined) {
    resetDay();
    if (balBudget < CFG.BIGBUY_BAL_DAILY_BUDGET) { balBudget++; try { const r = await rpc("getBalance", [tr.wallet]); bal = (r?.value ?? r ?? 0) / 1e9; } catch { bal = null; } }
    else bal = null;
    balCache.set(tr.wallet, bal); if (balCache.size > 20000) balCache.delete(balCache.keys().next().value);
  }
  q.insBigBuy.run(mint, tr.wallet, tr.ts, age, tr.sol, mc, bal, venue); lc.bigBuys++;
}

on("trade", (t, tr) => trade(t.mint, t.ts, tr, t.lastMc, t.graduated ? 1 : 0, "curve"));
onSwap((tr) => { const s = L.get(tr.mint); const ct = s?.createTs ?? q.tokenMeta.get(tr.mint)?.create_ts; if (!ct) return; trade(tr.mint, ct, tr, tr.mc, 1, "pumpswap"); });

// time-based checkpoints for tokens that went quiet (so "dead" rows get written too), and cleanup
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [mint, s] of L) {
    sample(mint, s, now);
    if (s.next >= CFG.LIFE_CHECKPOINTS.length || (now - s.createTs > 7200 && now - s.lastTs > 7200 && s.next >= 6)) L.delete(mint);
    else if (now - s.createTs > 90000) L.delete(mint);
  }
  lc.tracked = L.size;
}, 30_000);
export const lcStats = () => ({ ...lc, holderBudget, balBudget });
/** v0.15: snapshot for the graduation strategy — 5m checkpoint (if reached), distinct buyers so far, biggest 1m burst */
export function lifeSnap(mint) { const s = L.get(mint); if (!s) return null; return { cp5: s.cp[300] || null, buyers: s.buyers.size, maxBurst: s.maxBurst, createTs: s.createTs }; }

// v0.17 second-wave-early: at 2/3/4 minutes, the first wave is still being bought by new people
function wave2Check(mint, s, now, venue) {
  const age = now - s.createTs;
  if (s.w2.has("done")) return;
  const cp = CFG.W2_CHECKS_S.find((c) => age >= c && age < c + 20 && !s.w2.has(c)); if (!cp) return;
  s.w2.add(cp);
  if (s.lastMc < CFG.W2_MC_MIN || s.lastMc > CFG.W2_MC_MAX || s.buyers.size < CFG.W2_BUYERS_MIN) return;
  const new60 = s.bts.filter((x) => now - x.ts <= 60).length; if (new60 < CFG.W2_NEW60_MIN) return;
  const r60 = s.ring.filter((x) => now - x.ts <= 60); const buyUsd = r60.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), sellUsd = r60.filter((x) => !x.b).reduce((a, x) => a + x.usd, 0);
  if (buyUsd / Math.max(sellUsd, 1) < CFG.W2_BS_MIN) return;
  const ago = s.ring.find((x) => now - x.ts <= 75 && now - x.ts >= 45) || s.ring[0]; if (!ago || !(s.lastPx > ago.px)) return;
  const m = q.tokenMeta.get(mint); if (m?.bundle_pct != null && m.bundle_pct > CFG.W2_BUNDLE_MAX) return;
  s.w2.add("done");
  const bsv = buyUsd / Math.max(sellUsd, 1), tight = cp <= CFG.W2T_CP_MAX && s.lastMc >= CFG.W2T_MC_MIN && s.lastMc <= CFG.W2T_MC_MAX && bsv >= CFG.W2T_BS_MIN && (m?.dev_buy_sol ?? 0) >= CFG.W2T_DEV_MIN; // v0.17.4
  for (const fn of w2Listeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: s.lastMc, ts: now, cp, buyers: s.buyers.size, new60, bs: buyUsd / Math.max(sellUsd, 1), pxChg: s.lastPx / ago.px - 1, bundle: m?.bundle_pct ?? null, venue, tight, alert: s.buyers.size >= CFG.W2_ALERT_BUYERS && new60 >= CFG.W2_ALERT_NEW60 }); } catch (e) { console.error("[wave2]", e.message); } }
}
// v0.17 revival (user's hypothesis): a coin that fell 40%+ from its peak, then new buyers and volume come back
function revivalCheck(mint, s, now, venue) {
  const age = now - s.createTs;
  if (s.revDone || s.graduated || age < CFG.REV_AGE_MIN_S || age > CFG.REV_AGE_MAX_S || now - s.lastRev < 30) return;
  s.lastRev = now;
  if (s.lastMc < CFG.REV_MC_MIN || !(s.peakMc > 0) || s.lastMc > s.peakMc * (1 - CFG.REV_DRAWDOWN) || now - s.peakTs < CFG.REV_PEAK_MIN_AGE_S) return;
  const new5 = s.bts.filter((x) => now - x.ts <= 300).length; if (new5 < CFG.REV_NEW5M_MIN) return;
  const vNow = s.ring.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0), vPrev = s.ring.filter((x) => now - x.ts > 300 && now - x.ts <= 600).reduce((a, x) => a + x.usd, 0);
  if (!(vPrev > 0) || vNow / vPrev < CFG.REV_VOL_RATIO) return;
  s.revDone = true;
  const m = q.tokenMeta.get(mint);
  for (const fn of revListeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: s.lastMc, ts: now, age, peakMc: s.peakMc, new5, volRatio: vNow / vPrev, venue }); } catch (e) { console.error("[revival]", e.message); } }
}
// v0.17.1 graduation runner: just graduated and still being bought hard
function gradRunnerCheck(mint, s, now) {
  if (!s.graduated || s.grDone || !s.gradTs || now - s.gradTs > CFG.GR_WINDOW_S || now - s.lastGr < 10) return;
  s.lastGr = now;
  const r5 = s.ring.filter((x) => now - x.ts <= 300); const vol = r5.reduce((a, x) => a + x.usd, 0); if (vol < CFG.GR_VOL5M_USD) return;
  if (!(s.lastPx >= s.gradPx)) return;
  const new2 = s.bts.filter((x) => now - x.ts <= 120).length; if (new2 < CFG.GR_NEW2M_MIN) return;
  const buyUsd = r5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), sellUsd = vol - buyUsd; if (buyUsd / Math.max(sellUsd, 1) < CFG.GR_BS_MIN) return;
  s.grDone = true;
  const m = q.tokenMeta.get(mint);
  for (const fn of grListeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: s.lastMc, ts: now, sinceGrad: now - s.gradTs, vol5: vol, new2, bs: buyUsd / Math.max(sellUsd, 1), buyers: s.buyers.size, age: now - s.createTs }); } catch (e) { console.error("[gradrun]", e.message); } }
}
// v0.17.1 graduation recovery: graduated, dumped 60%+ from its post-graduation peak, then buyers and volume return
function gradRecoveryCheck(mint, s, now) {
  if (!s.graduated || s.grecDone || !s.gradTs || now - s.lastRev < 30) return;
  if (!(s.gradPeak > 0) || s.lastMc > s.gradPeak * (1 - CFG.GREC_DRAWDOWN) || s.lastMc < CFG.REV_MC_MIN) return;
  const new5 = s.bts.filter((x) => now - x.ts <= 300).length; if (new5 < CFG.GREC_NEW5M_MIN) return;
  const vNow = s.ring.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0), vPrev = s.ring.filter((x) => now - x.ts > 300 && now - x.ts <= 600).reduce((a, x) => a + x.usd, 0);
  if (!(vPrev > 0) || vNow / vPrev < CFG.REV_VOL_RATIO) return;
  s.grecDone = true;
  const m = q.tokenMeta.get(mint);
  for (const fn of grecListeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: s.lastMc, ts: now, peakMc: s.gradPeak, new5, volRatio: vNow / vPrev, age: now - s.createTs, buyers: s.buyers.size }); } catch (e) { console.error("[gradrec]", e.message); } }
}
// v0.17.2 slow build / base breakout: pumped, dumped 50%+, went sideways, now buyers and volume rising window over window and price turning up
function slowBuildCheck(mint, s, now) {
  if (s.slowDone || !s.dumped || now - s.createTs < CFG.SLOW_MIN_AGE_S || now - s.lowTs < CFG.SLOW_SINCE_DUMP_S || now - s.lastSlow < 30) return;
  s.lastSlow = now;
  if (s.lastMc < CFG.SLOW_MC_MIN || !(s.lastMc >= s.lowMc * (1 + CFG.SLOW_OFF_LOW))) return;
  const W = CFG.SLOW_WINDOWS, win = [];
  for (let i = 0; i < W; i++) { const a = now - (i + 1) * 300, b = now - i * 300; const r = s.ring.filter((x) => x.ts > a && x.ts <= b); win.push({ vol: r.reduce((q, x) => q + x.usd, 0), nb: s.bts.filter((x) => x.ts > a && x.ts <= b).length }); }
  for (let i = 0; i < W - 1; i++) if (!(win[i].vol > win[i + 1].vol && win[i].nb > win[i + 1].nb)) return; // newest window must beat the one before, W-1 times
  if (!(win[W - 1].vol > 0)) return;
  const new10 = s.bts.filter((x) => now - x.ts <= 600).length; if (new10 < CFG.SLOW_NEW10M_MIN) return;
  const r10 = s.ring.filter((x) => now - x.ts <= 600); const avg10 = r10.reduce((q, x) => q + x.px, 0) / Math.max(r10.length, 1); if (!(s.lastPx > avg10)) return;
  s.slowDone = true;
  const m = q.tokenMeta.get(mint);
  for (const fn of slowListeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: s.lastMc, ts: now, age: now - s.createTs, peakMc: s.peakMc, lowMc: s.lowMc, sinceLow: now - s.lowTs, new10, vols: win.map((w) => Math.round(w.vol)).reverse(), nbs: win.map((w) => w.nb).reverse(), buyers: s.buyers.size, graduated: s.graduated }); } catch (e) { console.error("[slow]", e.message); } }
}
function stairs(s, cps) {
  for (let i = 1; i < cps.length; i++) {
    const a = s.cp[cps[i - 1]], b = s.cp[cps[i]];
    if (!a || !b || !(b.mc >= CFG.CLIMB_STEP * a.mc) || !(b.buyers > a.buyers)) return false;
  }
  return true;
}
function climbCheck(mint, s, cp, now) {
  if (s.climbed) return;
  const last = s.cp[cp]; if (!last?.alive || last.mc < CFG.CLIMB_MIN_MC || s.maxBurst >= CFG.CLIMB_MAX_BURST_USD || !(last.b > last.sl)) return;
  const set = cp === CFG.CLIMB_CPS.at(-1) ? CFG.CLIMB_CPS : cp === CFG.CLIMB_CPS2.at(-1) ? CFG.CLIMB_CPS2 : null;
  if (!set || !stairs(s, set)) return;
  s.climbed = true;
  const m = q.tokenMeta.get(mint);
  const steps = set.map((c) => `$${Math.round(s.cp[c].mc / 1000)}K`).join(" → ");
  for (const fn of climbListeners) { try { fn({ mint, name: m?.name || mint.slice(0, 8), symbol: m?.symbol || "", price: s.lastPx, mc: last.mc, ts: now, steps, buyers: last.buyers, cp }); } catch (e) { console.error("[climb]", e.message); } }
}
