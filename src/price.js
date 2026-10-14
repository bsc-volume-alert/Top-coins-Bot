let solUsd = Number(process.env.SOL_USD_OVERRIDE || 0), last = solUsd ? Infinity : 0;
async function fetchJup() {
  const r = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { signal: AbortSignal.timeout(5000) });
  const j = await r.json(); return Number(j?.So11111111111111111111111111111111111111112?.usdPrice);
}
async function fetchCg() {
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { signal: AbortSignal.timeout(5000) });
  const j = await r.json(); return Number(j?.solana?.usd);
}
export async function getSolUsd() {
  if (Date.now() - last < 60_000 && solUsd > 0) return solUsd;
  for (const f of [fetchJup, fetchCg]) {
    try { const p = await f(); if (p > 0) { if (solUsd > 0 && (p > solUsd * 1.2 || p < solUsd * 0.8)) { console.error(`[price] rejected SOL/USD ${p} (last ${solUsd})`); continue; } solUsd = p; last = Date.now(); return p; } } catch {} // v0.17: reject >20% jumps
  }
  return solUsd;
}
export const solUsdCached = () => solUsd;
