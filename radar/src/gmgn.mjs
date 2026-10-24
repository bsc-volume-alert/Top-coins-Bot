// radar 0.1.0: GMGN client (copied from coin scope). Own pace (RADAR_GMGN_WPS, default 2 weight a second of the plan's 20 — the tracker and coin scope share the key).
// GMGN's official API (openapi.gmgn.ai, the key already in /root/tracker/.env). Read-only. Its own pace (SCOPE_GMGN_WPS weight a second,
// default 4 of the plan's 20 — the tracker's own GMGN scanner shares the plan) and a pause after a rate-limit answer.
import "./env.mjs";
import { randomUUID } from "node:crypto";
const HOST = "https://openapi.gmgn.ai", KEY = () => process.env.GMGN_API_KEY || "";
const WPS = Number(process.env.RADAR_GMGN_WPS || 2);
const WEIGHT = { "/v1/token/info": 1, "/v1/token/security": 1, "/v1/user/created_tokens": 2, "/v1/market/token_top_traders": 5, "/v1/market/token_top_holders": 5, "/v1/user/wallet_stats": 3 };
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
const N = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
const tagsOf = (w) => [...new Set([...(Array.isArray(w.tags) ? w.tags : []), ...(Array.isArray(w.maker_token_tags) ? w.maker_token_tags : [])])];
// GMGN's tag names → plain words
export const TAG = { bundler: "bundler", sniper: "sniper", rat_trader: "insider", fresh_wallet: "fresh", smart_degen: "smart money", renowned: "KOL", dev: "dev", dev_team: "dev team", creator: "dev", whale: "whale", top_holder: "top holder", transfer_in: "got tokens by transfer", paper_hand: "paper hands", diamond_hands: "diamond hands", sandwich_bot: "MEV bot", pump_smart: "pump.fun smart" };
export function walletRow(w) { // one holder / trader line from GMGN
  return { wallet: w.address, tags: tagsOf(w), pct: N(w.amount_percentage) != null ? N(w.amount_percentage) * 100 : null, soldPct: N(w.sell_amount_percentage) != null ? N(w.sell_amount_percentage) * 100 : null,
    buyUsd: N(w.buy_volume_cur), sellUsd: N(w.sell_volume_cur), buys: N(w.buy_tx_count_cur), sells: N(w.sell_tx_count_cur), profit: N(w.profit), realized: N(w.realized_profit), avgCost: N(w.avg_cost), avgSold: N(w.avg_sold),
    isNew: !!w.is_new, suspicious: !!w.is_suspicious, tIn: N(w.history_transfer_in_amount), tOut: N(w.history_transfer_out_amount), fund: w.native_transfer ? { wallet: w.native_transfer.from_address || w.native_transfer.address || null, name: w.native_transfer.name || null, ts: N(w.native_transfer.timestamp) } : null,
    start: N(w.start_holding_at), end: N(w.end_holding_at), last: N(w.last_active_timestamp), pool: Number(w.addr_type) === 2, balanceSol: N(w.native_balance) != null ? N(w.native_balance) / 1e9 : null };
}
export function walletStats(d) { const w = Array.isArray(d) ? d[0] : d; if (!w || typeof w !== "object") return null; const c = w.common || {};
  return { winrate: N(w.winrate), pnl: N(w.pnl), realized: N(w.realized_profit), unrealized: N(w.unrealized_profit), cost: N(w.total_cost), buys: N(w.buy_count), sells: N(w.sell_count), tags: Array.isArray(c.tags) ? c.tags : c.tag ? [c.tag] : [],
    followers: N(c.follow_count), ageD: c.created_at ? +((Date.now() / 1000 - Number(c.created_at)) / 86400).toFixed(1) : null, created: N(c.created_token_count), fund: c.fund_from || null, twitter: c.twitter_username || null, name: c.name || null, balanceSol: N(w.native_balance ?? c.native_balance) != null ? N(w.native_balance ?? c.native_balance) / 1e9 : null }; }
// every number / true-false inside an object, flattened to "a.b.c" — so the page can show all of GMGN's facts without guessing their names
export function facts(o, prefix = "", out = {}) {
  if (!o || typeof o !== "object") return out;
  for (const [k, v] of Object.entries(o)) { if (/logo|avatar|banner|description|image|pfp|url|twitter|website|telegram|discord|link/i.test(k)) continue; const key = prefix ? prefix + "." + k : k;
    if (v == null) continue; if (typeof v === "object" && !Array.isArray(v)) facts(v, key, out); else if (typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 60 && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v))) out[key] = v; }
  return out;
}
export const fromRate = (v) => (N(v) == null ? null : N(v) <= 1.000001 ? N(v) * 100 : N(v)); // GMGN rates come as 0–1 shares
