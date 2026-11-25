// gmgn.mjs — GMGN OpenAPI client for this project (read-only). Auth as in the tracker's client: header X-APIKEY + query
// timestamp + client_id. The key is read from the environment (GMGN_API_KEY) and is never logged or stored.
// Pacing: a leaky bucket in "weight per second" (GMGN_WPS). The limit of OUR key is read from the response headers
// (X-RateLimit-*) and shown on the status page. Plan weights (GMGN plan page, 20 Nov 2026): Free 5, Plus 20, Pro 50.
import { randomUUID } from "node:crypto";
const HOST = process.env.GMGN_HOST || "https://openapi.gmgn.ai", KEY = () => process.env.GMGN_API_KEY || "";
const WPS = Number(process.env.GMGN_WPS || 4); // our key is on the FREE plan: 5 weight/s (verified 20 Nov 2026, x-ratelimit-limit: 5); 4 leaves headroom
export const WEIGHT = { "/v1/market/token_kline": 2, "/v1/market/rank": 3, "/v1/trenches": 2, "/v1/token/info": 2, "/v1/token/security": 1 }; // documented weights — except token info: documented 1, MEASURED 2 (25 Nov 2026: a single call on a full allowance of 5 leaves 3)
export const gm = { calls: 0, errors: 0, limited: 0, banned: 0, lastErr: "", headers: {}, lastOk: null,
  first: { calls: 0, ok: 0, refused: 0, not_sent: 0, ms_sum: 0, ms_max: 0 }, held_back: 0, reserve: 0 }; // older-11: "first" = buy-check readings (see below)
let next = 0, pausedUntil = 0; const nap = (ms) => new Promise((r) => setTimeout(r, ms));
// older-11 — TWO KINDS OF CALL share this key's allowance:
//   first : a reading for a pending buy (gcall(..., { first: true })). It is never queued behind anything and never paced: it
//           goes out at once. If the provider has told us to wait (a refusal's reset time) for longer than maxWaitMs, it is
//           NOT sent and fails at once ("allowance exhausted") — a reading that cannot arrive in time is of no use to the buy.
//   rest  : history repair and everything else, in order, paced at GMGN_WPS as before. When gm.reserve > 0 (set by a run that
//           uses the gates) such a call is held back while the allowance the provider last reported, minus the call's weight,
//           is below the reserve — so a buy-check that arrives finds units left. Once the reported reset time has passed the
//           allowance is taken as refilled. With gm.reserve = 0 (the default) the rest behaves exactly as in older-10.
// What the provider's allowance really is (5 units per second on the plan page; refusals with a reset about 15 s ahead in
// practice, 25 Nov 2026) is not assumed here: the client only uses the remaining / reset figures of the latest answer.
// MEASURED ON THE VALIDATION RUN, 25 Nov 2026 13:14–13:52 UTC (one process on the key): an ordinary answer carries the limit (5)
// and what is left, but NO reset time — only a refusal carries one (about 15 s ahead). A single token-info call on a full
// allowance leaves 3, so it costs 2, not the documented 1. With repair switched on, 7 of its first ~30 calls were refused,
// each refusal closing the key for ~15 s, and a buy-check that arrived inside such a pause could not be sent. The reserve
// below used to apply only while a reset time was known, i.e. never on ordinary answers: it held nothing back.
// THE RESERVE NOW: after an answer that leaves fewer than (reserve + the call's weight) units, repair WAITS a refill time
// before its next call and then takes the allowance as refilled. The refill time is not known, so it is learned: it starts
// at GMGN_REFILL_S (15 s, the provider's own figure on refusals), is doubled (up to 120 s) whenever a repair call is refused,
// and is shortened by a fifth (down to GMGN_REFILL_MIN_S, 4 s) whenever the call after a wait finds the allowance full again
// (limit − 2 or more left). So repair settles at the fastest pace that still leaves the allowance full between its calls,
// and a buy-check finds units waiting. A reset time, when the provider gives one, is always respected as well.
const REFILL0 = Number(process.env.GMGN_REFILL_S || 15) * 1000, REFILL_MIN = Number(process.env.GMGN_REFILL_MIN_S || 4) * 1000, REFILL_MAX = 120_000;
let chain = Promise.resolve(), remaining = null, resetAt = 0, coolUntil = 0, refillMs = REFILL0, afterWait = false, limitHdr = 5;
function slot(path) { const w = WEIGHT[path] ?? 3; const p = chain.then(async () => {
    for (;;) { if (Date.now() < pausedUntil) { await nap(Math.min(500, pausedUntil - Date.now() + 5)); continue; }
      const d = next - Date.now(); if (d > 0) { await nap(Math.min(d, 250)); continue; }
      if (gm.reserve > 0) { const now = Date.now();
        if (now < coolUntil) { await nap(Math.min(250, coolUntil - now + 5)); continue; }
        if (remaining != null && remaining - w < gm.reserve) { coolUntil = Math.max(now + refillMs, resetAt > now ? resetAt + 5 : 0); remaining = null; afterWait = true; gm.held_back++; gm.refill_s = +(refillMs / 1000).toFixed(1); continue; } } // too little left for a buy-check after this call: wait for the refill, then take the allowance as refilled
      break; }
    next = Math.max(Date.now(), next) + (w / WPS) * 1000; }); chain = p.catch(() => {}); return p; }
function note(r) { for (const [k, v] of r.headers) if (/ratelimit|quota|plan|tier/i.test(k)) gm.headers[k] = v; // limit evidence only — never auth headers
  const rem = Number(r.headers.get("x-ratelimit-remaining")), rs = Number(r.headers.get("x-ratelimit-reset")); // ONE SHARED COUNT for calls in flight: an answer to an earlier call reports the allowance as it was when THAT call was
  // served; calls sent since are already counted here, so inside one window the lower figure stands. A new window (a later reset time) starts from the answer.
  const has = Number.isFinite(rem) && r.headers.get("x-ratelimit-remaining") != null, newWin = rs > 1e9 && rs * 1000 > resetAt + 500, lim = Number(r.headers.get("x-ratelimit-limit")); if (lim > 0) limitHdr = lim;
  if (has) remaining = newWin || remaining == null ? rem : Math.min(remaining, rem); if (rs > 1e9) resetAt = rs * 1000; }
/** learn the refill time from a repair call's outcome (see THE RESERVE NOW above) */
function learn(refused, rem) { if (!(gm.reserve > 0)) return; if (refused) refillMs = Math.min(REFILL_MAX, refillMs * 2); else if (afterWait && rem != null && rem >= limitHdr - 2) refillMs = Math.max(REFILL_MIN, refillMs * 0.8); afterWait = false; gm.refill_s = +(refillMs / 1000).toFixed(1); }
export const gmgnOn = () => !!KEY();
export async function gcall(path, params = {}, { method = "GET", body = null, first = false, maxWaitMs = 0 } = {}) {
  if (!KEY()) throw new Error("no GMGN key configured");
  const t0 = Date.now();
  // a reading is not sent into an allowance the provider has just reported as used up (review of bbe1115): it would be refused,
  // and refusals are what the provider answers with longer bans. "Used up" = the units left after the calls sent since that
  // report are fewer than this call's weight, and the reported reset time has not passed.
  if (first) { gm.first.calls++; const now = Date.now(), w = WEIGHT[path] ?? 3, wait = Math.max(pausedUntil - now, remaining != null && remaining < w && now < resetAt ? resetAt - now : 0); if (wait > maxWaitMs) { gm.first.not_sent++; throw new Error(`GMGN allowance exhausted for another ${(wait / 1000).toFixed(1)} s`); } if (wait > 0) await nap(wait);
    if (Date.now() >= resetAt) remaining = null; // the reported window is over: the allowance is not known until the next answer
    next = Math.max(Date.now(), next) + ((WEIGHT[path] ?? 3) / WPS) * 1000; if (remaining != null) remaining -= WEIGHT[path] ?? 3; }
  else { await slot(path); if (remaining != null) remaining -= WEIGHT[path] ?? 3; } // every call that is sent is counted against the last reported allowance, whichever kind it is
  gm.calls++;
  const q = new URLSearchParams({ ...(method === "GET" ? params : params.chain ? { chain: params.chain } : {}), timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
  const r = await fetch(`${HOST}${path}?${q}`, { method, headers: { "X-APIKEY": KEY(), "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify(body ?? params) : undefined, signal: AbortSignal.timeout(15000) });
  note(r);
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { gm.errors++; throw new Error(`GMGN HTTP ${r.status}`); }
  if (r.status === 429 || /RATE_LIMIT/.test(j.error || "")) { gm.limited++; if (/BANNED/.test(j.error || "")) gm.banned++; const reset = Number(r.headers.get("x-ratelimit-reset")); pausedUntil = reset > 1e9 ? reset * 1000 + 500 : Date.now() + 5000; if (first) gm.first.refused++; else { gm.limited_repair = (gm.limited_repair || 0) + 1; learn(true, null); } throw new Error("GMGN rate limited"); }
  if (!first) { const h = r.headers.get("x-ratelimit-remaining"); learn(false, h != null && Number.isFinite(Number(h)) ? Number(h) : null); }
  if (j.code !== 0) { gm.errors++; gm.lastErr = `${path}: ${j.error || j.code} ${j.message || ""}`.slice(0, 160); throw new Error(gm.lastErr); }
  gm.lastOk = Date.now(); if (first) { const ms = gm.lastOk - t0; gm.first.ok++; gm.first.ms_sum += ms; if (ms > gm.first.ms_max) gm.first.ms_max = ms; }
  return j.data && j.data.data && typeof j.data.data === "object" && !Array.isArray(j.data.data) && j.data.code !== undefined ? j.data.data : j.data;
}
const N = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

/** older-11: the reading for a pending buy — one token-info answer, sent ahead of everything else (see "first" above) */
export const tokenInfoFirst = (mint, maxWaitMs = 300) => gcall("/v1/token/info", { chain: "sol", address: mint }, { first: true, maxWaitMs });
/** older-11, label mode: the same reading as an ORDINARY queued call (waits its turn and for the allowance) — used once when the first request failed, so a buy gets a late label rather than none */
export const tokenInfoLate = (mint) => gcall("/v1/token/info", { chain: "sol", address: mint });
/** test hook: forget pacing and allowance state */
export function _reset() { next = 0; pausedUntil = 0; remaining = null; resetAt = 0; chain = Promise.resolve(); coolUntil = 0; refillMs = REFILL0; afterWait = false; limitHdr = 5; gm.refill_s = undefined; }
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
