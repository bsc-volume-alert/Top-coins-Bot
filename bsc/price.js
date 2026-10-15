// USD prices. BNB from the PancakeSwap V2 USDT/WBNB reserves (sanity-checked). Other quote tokens (Flap lets creators
// price a coin in any token): decimals read once, price from their V2 pair with WBNB, else with USDT. Stables = $1.
// Sanity: Flap coins launch around a few $K; a quote token whose fresh launches come out at >$250K or <$300 is
// mispriced → marked untrusted (its trades are recorded as no-price instead of with nonsense values).
import { C } from "./config.js";
import { ethCalls, word, u, addr } from "./rpc.js";
let bnb = 0; export const bnbUsd = () => bnb;
const ZERO = "0x0000000000000000000000000000000000000000", USDT = "0x55d398326f99059ff775485246999027b3197955";
const quoteCache = new Map(); // quote -> {usd, ts, src}
const decimals = new Map();   // quote -> decimals
const launches = new Map();   // quote -> [launch MCs]
export const untrusted = new Set();
export const noPrice = new Map(); // quote -> trades without a price (shown in /status)
const isNative = (q) => !q || q === ZERO || q === C.WBNB;
export function quoteSym(q) { if (isNative(q)) return "BNB"; return C.STABLES[q] || q.slice(0, 6); }
export const quoteDecimals = (q) => (isNative(q) || C.STABLES[q] ? 18 : decimals.get(q) ?? null);
export function quoteUsd(q) {
  if (isNative(q)) return bnb || null;
  if (C.STABLES[q]) return 1;
  if (untrusted.has(q)) return null;
  const c = quoteCache.get(q); if (!c || Date.now() - c.ts > 300_000) refreshQuote(q);
  return decimals.has(q) ? c?.usd ?? null : null;
}
export function notePriceMiss(q) { noPrice.set(q || "?", (noPrice.get(q || "?") || 0) + 1); }
/** called with the first trade MC of every fresh launch, per quote token */
export function noteLaunchMc(q, mc) {
  if (isNative(q) || C.STABLES[q] || !(mc > 0)) return;
  const a = launches.get(q) || []; a.push(mc); if (a.length > 50) a.shift(); launches.set(q, a);
  if (a.length >= 2) { const med = [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]; if (med > 250_000 || med < 300) { if (!untrusted.has(q)) console.log(`[price] quote ${q} untrusted (median launch MC $${med.toFixed(0)})`); untrusted.add(q); } else untrusted.delete(q); }
}
export const launchCheckOk = (q, mc) => isNative(q) || C.STABLES[q] || (mc > 300 && mc < 250_000);
const pad = (a) => a.slice(2).padStart(64, "0");
async function pairPrice(q, base, baseUsd, dq) { // q priced through its V2 pair with base (18 decimals)
  const [pairHex] = await ethCalls([{ to: C.PCS_V2_FACTORY, data: "0xe6a43905" + pad(q) + pad(base) }]);
  const pair = pairHex ? addr(pairHex) : null; if (!pair || pair === ZERO) return null;
  const [res] = await ethCalls([{ to: pair, data: "0x0902f1ac" }]); if (!res) return null;
  const r0 = Number(u(word(res, 0))), r1 = Number(u(word(res, 1))); if (!(r0 > 0 && r1 > 0)) return null;
  const qIs0 = q.toLowerCase() < base; // V2 sorts token0 < token1
  const qAmt = (qIs0 ? r0 : r1) / 10 ** dq, bAmt = (qIs0 ? r1 : r0) / 1e18;
  if (bAmt * baseUsd < 500) return null; // ignore dust pools
  return (bAmt / qAmt) * baseUsd;
}
async function refreshQuote(q) {
  quoteCache.set(q, { usd: quoteCache.get(q)?.usd ?? null, ts: Date.now() });
  try {
    if (!decimals.has(q)) { const [d] = await ethCalls([{ to: q, data: "0x313ce567" }]); const dv = d ? Number(u(word(d, 0))) : NaN; decimals.set(q, dv >= 0 && dv <= 36 ? dv : 18); }
    const dq = decimals.get(q);
    let usd = bnb ? await pairPrice(q, C.WBNB, bnb, dq) : null, src = "wbnb";
    if (usd == null) { usd = await pairPrice(q, USDT, 1, dq); src = "usdt"; }
    if (usd > 0) quoteCache.set(q, { usd, ts: Date.now(), src });
  } catch {}
}
async function refreshBnb() {
  try {
    const [h] = await ethCalls([{ to: C.BNB_USDT_PAIR, data: "0x0902f1ac" }]); if (!h) return;
    const p = Number(u(word(h, 0))) / Number(u(word(h, 1))); // token0 = USDT, token1 = WBNB
    if (p > 10 && p < 100000 && (!bnb || Math.abs(p / bnb - 1) < 0.2)) bnb = p;
  } catch {}
}
export async function startPrice() { await refreshBnb(); if (!bnb && process.env.BSC_TEST_NODE) bnb = 600; setInterval(refreshBnb, 30_000); }
