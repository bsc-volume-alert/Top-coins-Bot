// probe-gmgn.mjs — what does OUR GMGN key allow, and what do its fields mean? Read-only; paced one call every 3 s (the key is on
// the Free plan: 5 weight/s — an unpaced probe got it rate-limit-banned on 20 Nov). NEVER prints the key or auth headers.
//   node src/probe-gmgn.mjs [mint] > gmgn-probe.json
import { readFileSync, existsSync } from "node:fs";
for (const f of [process.env.OLDER_ENV || "/root/older/.env", "/root/tracker/.env"]) if (existsSync(f)) for (const l of readFileSync(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
process.env.GMGN_WPS = "0.6";
const { gcall, gm } = await import("./gmgn.mjs");
const now = Math.floor(Date.now() / 1000), MINT = process.argv[2] || "So11111111111111111111111111111111111111112";
const out = { at: new Date().toISOString(), key_present: !!process.env.GMGN_API_KEY, checks: [] };
async function chk(name, fn, pick = (d) => d) { const t = Date.now(); try { const d = await fn(); const l = d?.list || d?.rank || d?.completed || d; out.checks.push({ name, ok: true, ms: Date.now() - t, items: Array.isArray(l) ? l.length : null, shape: Array.isArray(d) ? "array" : d && typeof d === "object" ? Object.keys(d).slice(0, 40) : typeof d, sample: JSON.stringify(pick(d))?.slice(0, 500) }); return d; } catch (e) { out.checks.push({ name, ok: false, ms: Date.now() - t, err: String(e.message).slice(0, 200) }); return null; } }
const kl = (daysAgo) => gcall("/v1/market/token_kline", { chain: "sol", address: MINT, resolution: "1m", from: String((now - daysAgo * 86400) * 1000), to: String((now - daysAgo * 86400 + 6000) * 1000) });
await chk("token_info (open_timestamp vs migrated_timestamp vs creation fields)", () => gcall("/v1/token/info", { chain: "sol", address: MINT }), (d) => ({ open_timestamp: d?.open_timestamp, migrated_timestamp: d?.migrated_timestamp, creation_timestamp: d?.creation_timestamp, created_at: d?.created_at, launchpad: d?.launchpad, biggest_pool_address: d?.biggest_pool_address, total_supply: d?.total_supply, circulating_supply: d?.circulating_supply }));
for (const d of [0.07, 7, 30, 60, 90]) await chk(`kline_1m_${d}d_ago`, () => kl(d), (x) => (x?.list || x || []).slice(0, 2));
await chk("rank_1h", () => gcall("/v1/market/rank", { chain: "sol", interval: "1h", limit: "100" }), (d) => (d?.rank || d?.list || d || []).slice(0, 1));
const tr = await chk("trenches_completed (graduated list)", () => gcall("/v1/trenches", { chain: "sol", type: ["completed"], limit: 80 }, { method: "POST" }), (d) => (d?.completed || d?.list || d || []).slice(0, 1));
// creation-time meaning: for a just-graduated coin, open_timestamp must be EARLIER than its migration if it is token creation
const first = (tr?.completed || tr?.list || (Array.isArray(tr) ? tr : []))[0]; const a = first?.address || first?.mint || first?.token_address;
if (a) await chk("token_info of a graduated coin (does open_timestamp precede migration?)", () => gcall("/v1/token/info", { chain: "sol", address: a }), (d) => ({ address: a, open_timestamp: d?.open_timestamp, migrated_timestamp: d?.migrated_timestamp, open_before_migration: d?.open_timestamp && d?.migrated_timestamp ? d.open_timestamp < d.migrated_timestamp : null }));
out.rate_headers = gm.headers; out.counters = { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, lastErr: gm.lastErr };
console.log(JSON.stringify(out, null, 1));
