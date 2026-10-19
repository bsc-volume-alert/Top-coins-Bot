import { db } from "./db.js";
let solUsd = Number(process.env.SOL_USD_OVERRIDE || 0), last = solUsd ? Infinity : 0;
// v0.18.118: SOL/USD history (one sample a minute, kept 2 days, in the DB so it survives restarts) → "how is SOL doing" at each trigger
let hist = null; try { db.exec("CREATE TABLE IF NOT EXISTS sol_px (ts INTEGER PRIMARY KEY, usd REAL)"); hist = { ins: db.prepare("INSERT OR REPLACE INTO sol_px (ts, usd) VALUES (?, ?)"), at: db.prepare("SELECT ts, usd FROM sol_px WHERE ts<=? ORDER BY ts DESC LIMIT 1"), prune: db.prepare("DELETE FROM sol_px WHERE ts<?") }; } catch (e) { console.error("[price] history", e.message); }
let lastSample = 0;
function sample(p) { const now = Math.floor(Date.now() / 1000); if (!hist || now - lastSample < 55) return; lastSample = now; try { hist.ins.run(now, p); if (now % 3600 < 60) hist.prune.run(now - 2 * 86400); } catch {} }
/** % change of SOL/USD over the last `secs` seconds (null until we have a sample from about that long ago). */
export function solChange(secs) { if (!hist || !(solUsd > 0)) return null; try { const now = Math.floor(Date.now() / 1000), r = hist.at.get(now - secs); if (!r || !(r.usd > 0) || now - secs - r.ts > Math.max(900, secs / 4)) return null; return +((solUsd / r.usd - 1) * 100).toFixed(2); } catch { return null; } }
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
    try { const p = await f(); if (p > 0) { if (solUsd > 0 && (p > solUsd * 1.2 || p < solUsd * 0.8)) { console.error(`[price] rejected SOL/USD ${p} (last ${solUsd})`); continue; } solUsd = p; last = Date.now(); sample(p); return p; } } catch {} // v0.17: reject >20% jumps
  }
  return solUsd;
}
export const solUsdCached = () => solUsd;
