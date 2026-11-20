// probe-gmgn.mjs — what does OUR GMGN subscription actually allow? Run on the server (where the key lives):
//   node older/src/probe-gmgn.mjs > older/docs/gmgn-probe.json
// Prints status codes, rate-limit headers, response shapes and a short burst test. NEVER prints the key or auth headers.
import { gcall, gm } from "./gmgn.mjs";
const now = Math.floor(Date.now() / 1000), MINT = process.argv[2] || "So11111111111111111111111111111111111111112";
const out = { at: new Date().toISOString(), key_present: !!process.env.GMGN_API_KEY, checks: [] };
async function chk(name, fn) { const t = Date.now(); try { const d = await fn(); out.checks.push({ name, ok: true, ms: Date.now() - t, shape: Array.isArray(d) ? `array(${d.length})` : d && typeof d === "object" ? Object.keys(d).slice(0, 40) : typeof d, sample: JSON.stringify(d)?.slice(0, 400) }); } catch (e) { out.checks.push({ name, ok: false, ms: Date.now() - t, err: String(e.message).slice(0, 200) }); } }
await chk("token_info", () => gcall("/v1/token/info", { chain: "sol", address: MINT }));
await chk("kline_1m_100", () => gcall("/v1/market/token_kline", { chain: "sol", address: MINT, resolution: "1m", from: String((now - 6000) * 1000), to: String(now * 1000) }));
await chk("kline_1m_7days_ago", () => gcall("/v1/market/token_kline", { chain: "sol", address: MINT, resolution: "1m", from: String((now - 7 * 86400) * 1000), to: String((now - 7 * 86400 + 6000) * 1000) }));
await chk("rank_1h_pump_mc_40k_1m", () => gcall("/v1/market/rank", { chain: "sol", interval: "1h", limit: "100", min_marketcap: "40000", max_marketcap: "1000000" }));
await chk("trenches_completed", () => gcall("/v1/trenches", { chain: "sol", type: ["completed"], limit: 80 }, { method: "POST" }));
// burst: 30 info calls as fast as the client allows at GMGN_WPS → how many are rate-limited
const t0 = Date.now(); let lim = gm.limited; await Promise.all(Array.from({ length: 30 }, () => gcall("/v1/token/info", { chain: "sol", address: MINT }).catch(() => null)));
out.burst = { calls: 30, secs: (Date.now() - t0) / 1000, rate_limited: gm.limited - lim, wps_setting: Number(process.env.GMGN_WPS || 10) };
out.rate_headers = gm.headers; out.counters = { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, lastErr: gm.lastErr };
console.log(JSON.stringify(out, null, 1));
