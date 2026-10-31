// launcher 0.2.0: GMGN client (copied from radar/src/gmgn.mjs). Read-only, own pace (LAUNCH_GMGN_WPS, default 2 weight a second); the GMGN key is the one already in /root/tracker/.env.
import "./env.mjs";
import { randomUUID } from "node:crypto";
const HOST = process.env.LAUNCH_GMGN_HOST || "https://openapi.gmgn.ai", KEY = () => process.env.GMGN_API_KEY || "";
const WPS = Number(process.env.LAUNCH_GMGN_WPS || 2);
const WEIGHT = { "/v1/token/info": 1, "/v1/token/security": 1, "/v1/user/created_tokens": 2, "/v1/market/token_top_traders": 5, "/v1/market/token_top_holders": 5, "/v1/user/wallet_stats": 3, "/v1/market/search": 1, "/v1/market/token_kline": 1, "/v1/market/rank": 3 };
export const gmStat = { calls: 0, errors: 0, limited: 0, lastErr: "" };
let next = 0, chain = Promise.resolve(), pausedUntil = 0;
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
function slot(path) { const w = WEIGHT[path] ?? 3; const p = chain.then(async () => { while (Date.now() < pausedUntil) await nap(500); const wait = next - Date.now(); if (wait > 0) await nap(wait); next = Math.max(Date.now(), next) + (w / WPS) * 1000; }); chain = p.catch(() => {}); return p; }
export const gmgnOn = () => !!KEY();
export async function gget(path, params) {
  if (!KEY()) throw new Error("no GMGN key");
  await slot(path); gmStat.calls++;
  const q = new URLSearchParams({ ...params, timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
  const r = await fetch(`${HOST}${path}?${q}`, { headers: { "X-APIKEY": KEY(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(12000) });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { gmStat.errors++; throw new Error(`GMGN HTTP ${r.status}`); }
  if (r.status === 429 || /RATE_LIMIT/.test(j.error || "")) { gmStat.limited++; pausedUntil = Date.now() + 5000; throw new Error("GMGN rate limited"); }
  if (j.code !== 0) { gmStat.errors++; gmStat.lastErr = `${path}: ${j.error || j.code} ${j.message || ""}`.slice(0, 160); throw new Error(gmStat.lastErr); }
  return j.data && j.data.data && typeof j.data.data === "object" && !Array.isArray(j.data.data) && j.data.code !== undefined ? j.data.data : j.data;
}
export const N = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
