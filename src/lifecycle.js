// v0.12: lifecycle sampler (survival funnel), top-10 holder snapshots for survivors, big-buy logging with wallet balance.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on, live } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";

export const lc = { samples: 0, holderSnaps: 0, bigBuys: 0, tracked: 0 };
const L = new Map(); // mint -> { createTs, w5:[{ts,sol,b,w}], buyers:Set, lastMc, lastTs, graduated, next: idx }
let holderBudget = 0, balBudget = 0, day = new Date().getUTCDate();
const balCache = new Map();
const resetDay = () => { const d = new Date().getUTCDate(); if (d !== day) { day = d; holderBudget = 0; balBudget = 0; } };

function st(mint, createTs) {
  let s = L.get(mint);
  if (!s && createTs) { s = { createTs, w5: [], buyers: new Set(), lastMc: 0, lastTs: 0, graduated: 0, next: 0 }; L.set(mint, s); }
  return s;
}
function trade(mint, createTs, tr, mc, graduated, venue) {
  const s = st(mint, createTs); if (!s) return;
  const now = tr.ts || Math.floor(Date.now() / 1000);
  s.w5.push({ ts: now, sol: tr.sol, b: tr.isBuy, w: tr.wallet }); while (s.w5.length && now - s.w5[0].ts > 300) s.w5.shift();
  if (tr.isBuy) s.buyers.add(tr.wallet);
  s.lastMc = mc; s.lastTs = now; if (graduated) s.graduated = 1;
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
