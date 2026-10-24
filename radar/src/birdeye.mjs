// radar 0.1.0: Birdeye (public-api.birdeye.so) — read-only. Key in /root/tracker/.env as BIRDEYE_API_KEY (the owner adds it; never printed or logged).
// Paced to 1 request a second (the free plan's limit) and to a daily credit cap (RADAR_BIRD_CU_DAY, or the schedule below),
// so the recorder can never run up a bill. Credits are Birdeye's published per-endpoint costs; the recorder counts them and the status shows the total.
import "./env.mjs";
const HOST = "https://public-api.birdeye.so", KEY = () => process.env.BIRDEYE_API_KEY || "";
// 0.3.1 (owner, 17:20 UK 24 Oct: "use the free plan for now, as much as you need"): the free month (2 Oct – 1 Nov) has 30,000 credits and nothing
// was used, so until it resets the radar may spend ~3,500 a day (30,000 over the 8.5 days left); from 1 Nov back to ~1,000 a day. Birdeye never bills overage.
const RPS = Number(process.env.RADAR_BIRD_RPS || 1), CU_DAY_ENV = Number(process.env.RADAR_BIRD_CU_DAY || 0);
const cuDay = () => CU_DAY_ENV || (Date.now() < Date.UTC(2026, 10, 1) ? 3500 : 1000);
export const CU = { "/defi/v3/token/holder": 50, "/defi/v2/tokens/top_traders": 30, "/defi/token_security": 50, "/defi/token_overview": 30 };
export const bdStat = { calls: 0, errors: 0, limited: 0, cuToday: 0, cuTotal: 0, day: new Date().getUTCDate(), lastErr: "", skippedCap: 0 };
let next = 0, chain = Promise.resolve();
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
export const birdOn = () => !!KEY();
export function birdRoom(cu) { const d = new Date().getUTCDate(); if (d !== bdStat.day) { bdStat.day = d; bdStat.cuToday = 0; } return bdStat.cuToday + cu <= cuDay(); }
export async function bget(path, params) {
  if (!KEY()) throw new Error("no Birdeye key");
  const cu = CU[path] ?? 50; if (!birdRoom(cu)) { bdStat.skippedCap++; throw new Error(`Birdeye daily credit cap reached (${cuDay()})`); }
  const p = chain.then(async () => { const w = next - Date.now(); if (w > 0) await nap(w); next = Math.max(Date.now(), next) + 1000 / RPS; }); chain = p.catch(() => {}); await p;
  bdStat.calls++; bdStat.cuToday += cu; bdStat.cuTotal += cu;
  const r = await fetch(`${HOST}${path}?${new URLSearchParams(params)}`, { headers: { "X-API-KEY": KEY(), "x-chain": "solana", accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { bdStat.errors++; bdStat.lastErr = `${path}: HTTP ${r.status}`; throw new Error(bdStat.lastErr); }
  if (r.status === 429) { bdStat.limited++; next = Date.now() + 5000; throw new Error("Birdeye rate limited"); }
  if (!r.ok || j.success === false) { bdStat.errors++; bdStat.lastErr = `${path}: ${r.status} ${(j.message || "").slice(0, 120)}`; throw new Error(bdStat.lastErr); }
  return j.data ?? j;
}
