// gmgn.mjs — GMGN OpenAPI client for this project (read-only). Auth as in the tracker's client: header X-APIKEY + query
// timestamp + client_id. The key is read from the environment (GMGN_API_KEY) and is never logged or stored.
// Pacing: a leaky bucket in "weight per second" (GMGN_WPS). The limit of OUR key is read from the response headers
// (X-RateLimit-*) and shown on the status page. Plan weights (GMGN plan page, 20 Nov 2026): Free 5, Plus 20, Pro 50.
import { randomUUID } from "node:crypto";
const HOST = process.env.GMGN_HOST || "https://openapi.gmgn.ai", KEY = () => process.env.GMGN_API_KEY || "";
const WPS = Number(process.env.GMGN_WPS || 4); // our key is on the FREE plan: 5 weight/s (verified 20 Nov 2026, x-ratelimit-limit: 5); 4 leaves headroom
export const WEIGHT = { "/v1/market/token_kline": 2, "/v1/market/rank": 3, "/v1/trenches": 2, "/v1/token/info": 1, "/v1/token/security": 1 }; // documented weights
export const gm = { calls: 0, errors: 0, limited: 0, banned: 0, lastErr: "", headers: {}, lastOk: null };
let next = 0, pausedUntil = 0; const nap = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve();
function slot(path) { const w = WEIGHT[path] ?? 3; const p = chain.then(async () => { while (Date.now() < pausedUntil) await nap(500); const d = next - Date.now(); if (d > 0) await nap(d); next = Math.max(Date.now(), next) + (w / WPS) * 1000; }); chain = p.catch(() => {}); return p; }
export const gmgnOn = () => !!KEY();
export async function gcall(path, params = {}, { method = "GET", body = null } = {}) {
  if (!KEY()) throw new Error("no GMGN key configured");
  await slot(path); gm.calls++;
  const q = new URLSearchParams({ ...(method === "GET" ? params : params.chain ? { chain: params.chain } : {}), timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
  const r = await fetch(`${HOST}${path}?${q}`, { method, headers: { "X-APIKEY": KEY(), "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify(body ?? params) : undefined, signal: AbortSignal.timeout(15000) });
  for (const [k, v] of r.headers) if (/ratelimit|quota|plan|tier/i.test(k)) gm.headers[k] = v; // limit evidence only — never auth headers
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { gm.errors++; throw new Error(`GMGN HTTP ${r.status}`); }
  if (r.status === 429 || /RATE_LIMIT/.test(j.error || "")) { gm.limited++; if (/BANNED/.test(j.error || "")) gm.banned++; const reset = Number(r.headers.get("x-ratelimit-reset")); pausedUntil = reset > 1e9 ? reset * 1000 + 500 : Date.now() + 5000; throw new Error("GMGN rate limited"); }
  if (j.code !== 0) { gm.errors++; gm.lastErr = `${path}: ${j.error || j.code} ${j.message || ""}`.slice(0, 160); throw new Error(gm.lastErr); }
  gm.lastOk = Date.now();
  return j.data && j.data.data && typeof j.data.data === "object" && !Array.isArray(j.data.data) && j.data.code !== undefined ? j.data.data : j.data;
}
const N = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

/** token creation time (unix s) — GMGN token info; null if GMGN does not give one */
export async function creationTime(mint) {
  const i = await gcall("/v1/token/info", { chain: "sol", address: mint });
  let v = N(i?.creation_timestamp ?? i?.open_timestamp ?? i?.created_at); if (v > 1e12) v = Math.floor(v / 1000);
  return v ? { t: v, src: i?.creation_timestamp != null ? "gmgn.creation_timestamp" : "gmgn.open_timestamp (UNVERIFIED: must be shown to mean token creation, not pool opening)" } : null;
}
/** 1-minute USD bars in [from, to) (unix s); GMGN returns ≤ 100 candles a call, so this walks in 100-minute steps */
export async function minuteBars(mint, from, to) {
  const out = [];
  for (let a = from; a < to; a += 100 * 60) {
    const b = Math.min(to, a + 100 * 60);
    const d = await gcall("/v1/market/token_kline", { chain: "sol", address: mint, resolution: "1m", from: String(a * 1000), to: String(b * 1000) });
    for (const c of d?.list || (Array.isArray(d) ? d : [])) { const t = Math.floor(Number(c.time) / 1000); if (t >= from && t < to && N(c.close) > 0) out.push({ m: Math.floor(t / 60), o: N(c.open) ?? N(c.close), h: N(c.high), l: N(c.low), c: N(c.close), v: N(c.volume) ?? 0 }); }
  }
  return out.sort((x, y) => x.m - y.m).filter((x, i, a) => i === 0 || x.m !== a[i - 1].m);
}
