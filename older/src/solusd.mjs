// solusd.mjs — SOL/USD for converting pool prices to USD. Polls Coinbase's public spot price every 30 s; Kraken as fallback.
// Engine calls solUsd(t): the latest price if it is under 5 minutes old, else null (swaps are then not evaluated — counted, never guessed).
export const sp = { px: null, at: 0, src: null, fails: 0 };
async function get() {
  try { const j = await (await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot", { signal: AbortSignal.timeout(8000) })).json(); const v = Number(j?.data?.amount); if (v > 0) return [v, "coinbase"]; } catch {}
  try { const j = await (await fetch("https://api.kraken.com/0/public/Ticker?pair=SOLUSD", { signal: AbortSignal.timeout(8000) })).json(); const v = Number(Object.values(j?.result || {})[0]?.c?.[0]); if (v > 0) return [v, "kraken"]; } catch {}
  return null;
}
export async function startSolUsd() { const tick = async () => { const r = await get(); if (r) { sp.px = r[0]; sp.at = Date.now() / 1000; sp.src = r[1]; } else sp.fails++; }; await tick(); setInterval(tick, 30000); }
export const solUsd = () => (sp.px && Date.now() / 1000 - sp.at < 300 ? sp.px : null);
