// Prices in USD. SOL/USD from Jupiter (CoinGecko fallback) once a minute; coin prices from Jupiter's price API in batches of
// 50 every PRICE_EVERY_S for the coins that need one (open paper trades, the trending table); DexScreener for symbol / market cap /
// liquidity, cached 5 min, and as the price fallback for coins Jupiter does not quote yet.
import { CFG } from "./config.mjs";
import { db, q, nowS } from "./db.mjs";
let sol = Number(process.env.SOL_USD_OVERRIDE || 0), solAt = 0;
export const solUsd = () => sol;
export const px = { jupCalls: 0, jupFails: 0, dsCalls: 0, dsFails: 0, quoted: 0, lastTick: 0 };
async function fetchSol() {
  for (const f of [
    async () => { const r = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { signal: AbortSignal.timeout(5000) }); const j = await r.json(); return Number(j?.So11111111111111111111111111111111111111112?.usdPrice); },
    async () => { const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { signal: AbortSignal.timeout(5000) }); const j = await r.json(); return Number(j?.solana?.usd); },
  ]) { try { const p = await f(); if (p > 0 && (!(sol > 0) || (p < sol * 1.2 && p > sol * 0.8))) { sol = p; solAt = Date.now(); return; } } catch {} }
}
export function startSolLoop() { fetchSol(); setInterval(fetchSol, 60_000).unref(); }
export const fetchSolOnce = () => fetchSol();
// --- coin prices ---
const want = new Map();   // mint -> until (unix s) — who needs a price and for how long
const last = new Map();   // mint -> { usd, ts }
export const lastPx = (mint) => last.get(mint) || null;
export function wantPrice(mint, forS = 3600) { const until = nowS() + forS; if ((want.get(mint) || 0) < until) want.set(mint, until); }
const listeners = []; export const onPrices = (fn) => listeners.push(fn);
async function jup(ids) {
  px.jupCalls++;
  const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids.join(",")}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`jup ${r.status}`);
  const j = await r.json(); const out = {};
  for (const m of ids) { const p = Number(j?.[m]?.usdPrice); if (p > 0) out[m] = p; }
  return out;
}
export async function dexMeta(mint) { // best pair by liquidity, any quote → { symbol, name, px, mc, liq }
  px.dsCalls++;
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana");
  if (!pairs.length) return null;
  const b = pairs.reduce((a, c) => ((c.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? c : a));
  return { symbol: b.baseToken?.symbol || null, name: b.baseToken?.name || null, px: Number(b.priceUsd) || null, mc: Number(b.marketCap || b.fdv) || null, liq: Number(b.liquidity?.usd) || null };
}
const metaAt = new Map();
export async function ensureMeta(mint, maxAgeS = 300) {
  const at = metaAt.get(mint) || 0; if (nowS() - at < maxAgeS) return q.coin.get(mint);
  metaAt.set(mint, nowS());
  try { const m = await dexMeta(mint); if (m) { q.upCoin.run(mint, nowS()); q.setCoinMeta.run(m.symbol, m.name, m.mc, m.px, m.liq, nowS(), mint); if (m.px > 0 && !last.has(mint)) last.set(mint, { usd: m.px, ts: nowS() }); } } catch { px.dsFails++; }
  return q.coin.get(mint);
}
let ticking = false;
async function tick() {
  if (ticking) return; ticking = true;
  try {
    const now = nowS(); for (const [m, until] of want) if (until < now) want.delete(m);
    const ids = [...want.keys()]; if (!ids.length) return;
    const got = {};
    for (let i = 0; i < ids.length; i += 50) { try { Object.assign(got, await jup(ids.slice(i, i + 50))); } catch (e) { px.jupFails++; } }
    // coins Jupiter does not quote: DexScreener, but no more than 10 a tick (300/min limit shared with the metadata calls)
    let ds = 0; for (const m of ids) if (!got[m] && ds < 10) { ds++; try { const d = await dexMeta(m); if (d?.px > 0) got[m] = d.px; } catch { px.dsFails++; } }
    const ts = nowS(); const ins = db.transaction((rows) => { for (const [m, p] of rows) q.insPrice.run(m, ts, p); });
    const rows = Object.entries(got); ins(rows); px.quoted = rows.length; px.lastTick = ts;
    for (const [m, p] of rows) last.set(m, { usd: p, ts });
    for (const fn of listeners) { try { fn(got, ts); } catch (e) { console.error("[price listener]", e.message); } }
  } finally { ticking = false; }
}
export function startPriceLoop() { setInterval(() => tick().catch((e) => console.error("[price]", e.message)), CFG.PRICE_EVERY_S * 1000).unref(); }
