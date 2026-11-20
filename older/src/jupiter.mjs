// jupiter.mjs — Jupiter API client (read-only: prices, token metadata/risk, routed QUOTES). Never signs, never calls /execute.
// Docs read 20 Nov 2026 (developers.jup.ag): base https://api.jup.ag, header x-api-key (optional; keyless = 0.5 req/s).
//   GET /price/v3?ids=…            ≤ 50 mints  → { mint: { usdPrice, liquidity, createdAt, decimals, blockId, priceChange24h } }; unreliable/inactive mints are OMITTED
//   GET /tokens/v2/search?query=…  ≤ 100 mints → identity, tokenProgram, audit flags, mcap, fdv, liquidity, holderCount, 5m/1h/6h/24h stats   (10 credits)
//   GET /tokens/v2/recent                       → mints ordered by first-pool creation
//   GET /tokens/v2/{category}/{interval}        → toptrending | toptraded | toporganicscore                                                    (5 credits)
//   GET /swap/v2/order?inputMint&outputMint&amount   (no `taker` → quote only, no transaction)                                               (1 credit)
// One shared rate bucket for all of the above (Keyless 0.5/s, Free 1/s, Developer 10/s, Launch 50/s). JUP_RPS sets our pacing.
// Field names of /order beyond inAmount/outAmount/feeBps/router are read defensively and the raw reply's keys are recorded,
// because the full response schema could not be fetched from this workspace (marked UNVERIFIED in docs/REVIEW.md).
export const WSOL = "So11111111111111111111111111111111111111112";
const BASE = () => process.env.JUP_BASE || "https://api.jup.ag";
export const CREDITS = { price: 1, search: 10, recent: 1, category: 5, order: 1 };
export const ju = { calls: {}, credits: 0, errors: 0, limited: 0, lastErr: "", omitted: 0, requested: 0, lastOk: null, headers: {} };
let fetchImpl = (...a) => fetch(...a), next = 0, chain = Promise.resolve();
export const setFetch = (f) => { fetchImpl = f; };
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const rps = () => Number(process.env.JUP_RPS || (process.env.JUP_API_KEY ? 1 : 0.5));
// Pacing respects BOTH limits: requests per second, and the plan's monthly credits (endpoints cost 1–50 credits each, so a
// request cap alone does not protect the allowance). JUP_CREDITS_MONTH (e.g. 25000000 on Developer) spreads credits evenly.
const creditsPerSec = () => (Number(process.env.JUP_CREDITS_MONTH || 0) > 0 ? Number(process.env.JUP_CREDITS_MONTH) / (30 * 86400) : Infinity);
function slot(kind) { const p = chain.then(async () => { const d = next - Date.now(); if (d > 0) await nap(d); next = Math.max(Date.now(), next) + 1000 * Math.max(1 / rps(), (CREDITS[kind] ?? 1) / creditsPerSec()); }); chain = p.catch(() => {}); return p; }
async function get(kind, path, { paced = true } = {}) {
  if (paced) await slot(kind);
  ju.calls[kind] = (ju.calls[kind] || 0) + 1; ju.credits += CREDITS[kind] ?? 1;
  const req = Date.now() / 1000;
  let r; try { r = await fetchImpl(BASE() + path, { headers: process.env.JUP_API_KEY ? { "x-api-key": process.env.JUP_API_KEY } : {}, signal: AbortSignal.timeout(10000) }); } catch (e) { ju.errors++; ju.lastErr = `${kind}: ${e.message}`.slice(0, 160); throw e; }
  for (const [k, v] of r.headers || []) if (/ratelimit|credit|retry-after/i.test(k)) ju.headers[k] = v;
  if (r.status === 429) { ju.limited++; next = Date.now() + 2000; throw new Error("jupiter rate limited"); }
  let j; try { j = await r.json(); } catch { ju.errors++; throw new Error(`jupiter ${kind} HTTP ${r.status}`); }
  if (r.status >= 400) { ju.errors++; ju.lastErr = `${kind}: HTTP ${r.status} ${j?.error || j?.message || ""}`.slice(0, 160); const e = new Error(ju.lastErr); e.status = r.status; e.body = j; throw e; }
  ju.lastOk = Date.now() / 1000;
  return { j, req, resp: Date.now() / 1000 };
}
const num = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));

/** batched current prices. Returns { t, req, prices: Map(mint → {px, liqUsd, createdAt, decimals, blockId}), omitted: [mint…] }.
 *  A mint missing from the reply is MISSING COVERAGE — not a zero price, not a safe token, not a strategy failure. */
export async function prices(mints) {
  if (mints.length > 50) throw new Error("≤ 50 mints per price request");
  const { j, req, resp } = await get("price", `/price/v3?ids=${mints.join(",")}`);
  const out = new Map(), omitted = [];
  for (const m of mints) { const x = j?.[m]; const px = num(x?.usdPrice); if (px > 0) out.set(m, { px, liqUsd: num(x.liquidity), createdAt: x.createdAt ? Math.floor(Date.parse(x.createdAt) / 1000) || num(x.createdAt) : null, decimals: num(x.decimals), blockId: num(x.blockId) }); else omitted.push(m); }
  ju.requested += mints.length; ju.omitted += omitted.length;
  return { t: resp, req, prices: out, omitted };
}
/** token metadata + risk indicators for ≤ 100 mints */
export async function tokens(mints) {
  if (mints.length > 100) throw new Error("≤ 100 mints per search");
  const { j } = await get("search", `/tokens/v2/search?query=${mints.join(",")}`);
  return (Array.isArray(j) ? j : []).map(normToken);
}
const numsOf = (o) => { if (!o || typeof o !== "object") return null; const out = {}; for (const [k, v] of Object.entries(o)) if (typeof v !== "boolean" && num(v) != null) out[k] = num(v); return out; };
/** RECORDED MEASUREMENT for one token at an entry: holder count and the provider's own 5-minute and 1-hour statistics, kept
 *  with the request and reply times. The statistics objects are stored as returned (numeric fields only): their field names
 *  are the provider's, not ours, and nothing here is used as a filter. */
export async function tokenStats(mint) {
  const { j, req, resp } = await get("search", `/tokens/v2/search?query=${mint}`);
  const x = (Array.isArray(j) ? j : []).find((y) => y.id === mint);
  if (!x) return { ok: false, req, t: resp, why: "token not returned" };
  return { ok: true, req, t: resp, holders: num(x.holderCount), top_holders_pct: num(x.audit?.topHoldersPercentage), organic: num(x.organicScore), liq_usd: num(x.liquidity), mcap: num(x.mcap), stats5m: numsOf(x.stats5m), stats1h: numsOf(x.stats1h), updated: x.updatedAt ?? null };
}
export async function recent() { const { j } = await get("recent", "/tokens/v2/recent"); return (Array.isArray(j) ? j : []).map(normToken); }
export async function category(cat, interval, limit = 100) { const { j } = await get("category", `/tokens/v2/${cat}/${interval}?limit=${limit}`); return (Array.isArray(j) ? j : []).map(normToken); }
export function normToken(x) {
  const a = x.audit || {};
  return { mint: x.id, symbol: x.symbol ?? null, decimals: num(x.decimals), token_program: x.tokenProgram ?? null, px: num(x.usdPrice), mcap: num(x.mcap), fdv: num(x.fdv), liq_usd: num(x.liquidity), holders: num(x.holderCount),
    circ_supply: num(x.circSupply), total_supply: num(x.totalSupply), launchpad: x.launchpad ?? null, first_pool: x.firstPool ? { id: x.firstPool.id ?? null, created: x.firstPool.createdAt ? Math.floor(Date.parse(x.firstPool.createdAt) / 1000) : null } : null,
    mint_authority_disabled: a.mintAuthorityDisabled ?? null, freeze_authority_disabled: a.freezeAuthorityDisabled ?? null, top_holders_pct: num(a.topHoldersPercentage), is_sus: a.isSus ?? null, organic: num(x.organicScore), keys: Object.keys(x) };
}
/** a routed quote, exact size. side "buy": spend `amount` lamports of SOL for the token; "sell": sell `amount` raw token units for SOL.
 *  Returns { ok, req, t, in, out (raw units), router, route: [labels], feeBps, impact, keys } or { ok: false, why } — a missing route stays visible. */
export async function quote(mint, side, amountRaw) {
  const [i, o] = side === "buy" ? [WSOL, mint] : [mint, WSOL];
  try {
    const { j, req, resp } = await get("order", `/swap/v2/order?inputMint=${i}&outputMint=${o}&amount=${BigInt(Math.floor(amountRaw))}`, { paced: true });
    const out = num(j?.outAmount), inn = num(j?.inAmount) ?? Number(amountRaw);
    if (!(out > 0)) return { ok: false, req, t: resp, why: (j?.errorMessage || j?.error || "no route / no output amount").toString().slice(0, 160), keys: Object.keys(j || {}) };
    const route = Array.isArray(j.routePlan) ? j.routePlan.map((r) => r?.swapInfo?.label ?? r?.label ?? "?") : null;
    return { ok: true, req, t: resp, in: inn, out, router: j.router ?? null, route, feeBps: num(j.feeBps), platformFee: j.platformFee ?? null, impact: num(j.priceImpactPct ?? j.priceImpact), keys: Object.keys(j) };
  } catch (e) { return { ok: false, t: Date.now() / 1000, why: String(e.message).slice(0, 160), status: e.status ?? null }; }
}
