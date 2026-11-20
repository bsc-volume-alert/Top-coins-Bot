// probe-jupiter.mjs — working samples from Jupiter (read-only, quote-only; keyless unless JUP_API_KEY is set; paced to the tier).
//   node src/probe-jupiter.mjs [mint …] > jupiter-probe.json
// Measures: price coverage (requested vs returned), fields actually present, a 0.2 SOL buy quote and the matching sell quote
// (route, fee fields, response time), what /tokens/v2/recent and a category list return, and what `createdAt` means.
import * as J from "./jupiter.mjs";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", out = { at: new Date().toISOString(), key: !!process.env.JUP_API_KEY, rps: Number(process.env.JUP_RPS || (process.env.JUP_API_KEY ? 1 : 0.5)), steps: [] };
const step = async (name, fn) => { const t = Date.now(); try { out.steps.push({ name, ok: true, ms: Date.now() - t, ...(await fn()) }); } catch (e) { out.steps.push({ name, ok: false, ms: Date.now() - t, err: String(e.message).slice(0, 200) }); } };
let sample = process.argv.slice(2);
await step("tokens/v2/recent", async () => { const r = await J.recent(); if (!sample.length) sample = r.slice(0, 20).map((x) => x.mint); return { n: r.length, keys: r[0]?.keys, first: r[0] && { mint: r[0].mint, launchpad: r[0].launchpad, token_program: r[0].token_program, first_pool: r[0].first_pool, mcap: r[0].mcap, fdv: r[0].fdv, circ_supply: r[0].circ_supply, total_supply: r[0].total_supply }, launchpads: [...new Set(r.map((x) => x.launchpad))] }; });
let traded = [];
await step("tokens/v2/toptraded/1h", async () => { traded = await J.category("toptraded", "1h", 100); const band = traded.filter((x) => x.mcap >= 40000 && x.mcap <= 1e6); return { n: traded.length, in_band_40k_1m: band.length, launchpads: Object.entries(traded.reduce((a, x) => ((a[x.launchpad || "none"] = (a[x.launchpad || "none"] || 0) + 1), a), {})), token_programs: [...new Set(traded.map((x) => x.token_program))] }; });
const mints = [...new Set([...sample, ...traded.filter((x) => x.mcap >= 40000 && x.mcap <= 1e6).slice(0, 25).map((x) => x.mint)])].slice(0, 50);
await step("price/v3 coverage", async () => { const r = await J.prices(mints); const one = [...r.prices][0]; return { requested: mints.length, returned: r.prices.size, omitted: r.omitted.length, ms_req_to_resp: Math.round((r.t - r.req) * 1000), sample: one && { mint: one[0], ...one[1] } }; });
const target = traded.find((x) => x.mcap >= 40000 && x.mcap <= 1e6 && x.decimals != null) || traded[0];
if (target) {
  let tok = null;
  await step(`quote BUY 0.2 SOL → ${target.mint.slice(0, 6)} (${target.launchpad || "?"})`, async () => { const q = await J.quote(target.mint, "buy", 0.2e9); if (q.ok) tok = q.out; return { quote: q, ms: Math.round((q.t - (q.req ?? q.t)) * 1000) }; });
  if (tok) await step("quote SELL the same tokens → SOL (round trip, shows total cost of fees + impact)", async () => { const q = await J.quote(target.mint, "sell", tok); return { quote: q, round_trip_return: q.ok ? +(q.out / 0.2e9 - 1).toFixed(4) : null }; });
  if (tok) await step("quote SELL half", async () => { const q = await J.quote(target.mint, "sell", tok / 2); return { ok_route: q.ok, out: q.out ?? null, why: q.why ?? null }; });
}
await step("quote with no liquidity route (expect an explicit failure, not a zero)", async () => ({ quote: await J.quote("11111111111111111111111111111111", "buy", 0.2e9) }));
out.counters = { ...J.ju }; console.log(JSON.stringify(out, null, 1));
