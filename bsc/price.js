// USD prices. BNB from the PancakeSwap V2 USDT/WBNB reserves (sanity-checked); other quote tokens via their
// V2 pair with WBNB. Stables = $1. Unknown quotes return null (the trade is recorded but USD gates are skipped).
import { C } from "./config.js";
import { ethCalls, word, u, addr } from "./rpc.js";
let bnb = 0; export const bnbUsd = () => bnb;
const ZERO = "0x0000000000000000000000000000000000000000";
const quoteCache = new Map(); // quote -> {usd, ts}
export function quoteSym(q) { if (!q || q === ZERO || q === C.WBNB) return "BNB"; return C.STABLES[q] || q.slice(0, 6); }
export function quoteUsd(q) {
  if (!q || q === ZERO || q === C.WBNB) return bnb || null;
  if (C.STABLES[q]) return 1;
  const c = quoteCache.get(q); if (!c || Date.now() - c.ts > 300_000) refreshQuote(q);
  return c?.usd ?? null;
}
async function refreshQuote(q) {
  quoteCache.set(q, { usd: quoteCache.get(q)?.usd ?? null, ts: Date.now() });
  try {
    const pad = (a) => a.slice(2).padStart(64, "0");
    const [pairHex] = await ethCalls([{ to: C.PCS_V2_FACTORY, data: "0xe6a43905" + pad(q) + pad(C.WBNB) }]);
    const pair = pairHex ? addr(pairHex) : null; if (!pair || pair === ZERO) return;
    const [res] = await ethCalls([{ to: pair, data: "0x0902f1ac" }]); if (!res) return;
    const r0 = Number(u(word(res, 0))), r1 = Number(u(word(res, 1)));
    const qIs0 = q.toLowerCase() < C.WBNB; // V2 sorts token0 < token1
    const bnbPerQ = qIs0 ? r1 / r0 : r0 / r1; // both 18 decimals assumed
    if (bnbPerQ > 0 && bnb) quoteCache.set(q, { usd: bnbPerQ * bnb, ts: Date.now() });
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
