import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, H, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { classifyMintAccount, classifyJupToken, TOKEN_2022, SPL_TOKEN } from "../src/risk.mjs";
import { budget } from "../src/capacity.mjs";
import * as J from "../src/jupiter.mjs";

// a fake Jupiter: prices/quotes come from a table the test controls; time is a manual clock
function world() {
  const w = { t: T0, px: new Map(), omit: new Set(), route: true, reqs: { price: 0, quote: 0 }, quoteDelay: 0.3 };
  const tok = (mint, o = {}) => ({ mint, decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(mint) || 0) * 1e9, launchpad: o.launchpad ?? "raydium-launchlab", first_pool: { id: "P", created: T0 - (o.ageH ?? 9) * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false, ...o });
  w.tok = tok;
  w.jup = {
    prices: async (mints) => { w.reqs.price++; const m = new Map(), om = []; for (const x of mints) { if (w.omit.has(x) || !w.px.has(x)) om.push(x); else m.set(x, { px: w.px.get(x), liqUsd: 60_000, decimals: 6 }); } return { t: w.t, req: w.t, prices: m, omitted: om }; },
    quote: async (mint, side, raw) => { w.reqs.quote++; const req = w.t; w.t += w.quoteDelay; if (!w.route) return { ok: false, t: w.t, why: "no route" }; const px = w.px.get(mint) / 100; /* SOL per token at $100/SOL */
      return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Meteora DLMM"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Meteora DLMM"], router: "metis" }; },
    recent: async () => [], category: async () => [], tokens: async (ms) => ms.map((m) => tok(m)),
  };
  w.eng = mkEngine(); w.poll = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t });
  w.step = async (dt, mint, mc) => { w.t += dt; if (mint) w.px.set(mint, mc / 1e9); await w.poll.sweep(); w.eng.tick(w.t); await w.poll.quotes(); w.eng.tick(w.t); };
  return w;
}
const M = "MeteoraCoin1111111111111111111111111111111111";

test("Solana-wide adapter: a non-pump coin on another venue is discovered, sampled, and enters with a ROUTED QUOTE — never back-dated", async () => {
  const w = world(); w.px.set(M, 100_000 / 1e9); assert.equal(w.poll.add(w.tok(M, { launchpad: "meteora-dbc" }), "test inventory"), true);
  for (let i = 0; i < 31; i++) await w.step(10, M, 100_000);                 // 5 minutes of 10 s samples at $100K
  await w.step(10, M, 205_000);                                              // sampled double → FAST fires on this sample
  const e = [...w.eng.entries.values()][0]; assert.ok(e, "entry created"); assert.ok(e.families.includes("FAST-5M"));
  assert.equal(e.mode, "polled"); assert.equal(e.exec, "routed-quote"); assert.equal(e.pop, "solana-wide"); assert.equal(e.token.origin, "meteora-dbc"); assert.equal(e.evidence.trigger.coverage, "sampled"); assert.equal(e.evidence.trigger.cadence_s, 10);
  assert.equal(e.status, "pending", "no quote yet: the buy is scheduled 1 s after the signal");
  w.t += 1.1; await w.poll.quotes();
  assert.equal(e.status, "filled"); assert.ok(e.fill.quote.req_t >= e.schedT, "quote requested at/after the scheduled time");
  assert.ok(Math.abs(e.fill.t - e.fill.quote.resp_t) < 1e-9 && e.fill.delay_s > 0.3, "fill time = when the quote became available, delay recorded");
  assert.deepEqual(e.fill.quote.route, ["Meteora DLMM"]); assert.equal(e.fill.fee_src, "inside the routed quote");
  assert.ok(!e.families.includes("HH-BREAK"), "HH-BREAK needs volume: not claimed from price polling");
});

test("routed-quote exits: one quote per DISTINCT inventory (not per row); a sale waits for a quote requested after its trigger", async () => {
  const w = world(); w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) await w.step(10, M, 100_000);
  await w.step(10, M, 205_000); w.t += 1.1; await w.poll.quotes(); const e = [...w.eng.entries.values()][0]; assert.equal(e.status, "filled");
  const q0 = w.reqs.quote; w.t += 11; await w.poll.quotes();
  assert.ok(w.reqs.quote - q0 <= 2, `2 sizes (full, half) for ${e.versions.length} result rows — got ${w.reqs.quote - q0} requests`);
  w.px.set(M, 75_000 / 1e9); w.t += 11; await w.poll.quotes();               // −63%: every trail (20…60%) triggers on this valuation
  const trails = e.versions.filter((v) => v.policy === "trail"); assert.ok(trails.every((v) => v.status === "selling"));
  w.t += 0.8; await w.poll.quotes();                                          // the next quote is requested after trigger + 0.7 s → it prices the sale
  assert.ok(trails.every((v) => v.status === "closed")); assert.ok(trails[0].exit.quote.req_t >= trails[0].schedT - 1e-9); assert.equal(trails[0].exit.exec, "routed-quote");
  assert.ok(trails[0].exit.ret < -0.35);
});

test("no route: the buy is cancelled as a pricing/data timeout; an open position with no exit route stays visible, never removed", async () => {
  const w = world(); w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) await w.step(10, M, 100_000);
  w.route = false; await w.step(10, M, 205_000); const e = [...w.eng.entries.values()][0]; w.t += 1.1; await w.poll.quotes(); w.t += 6; w.eng.tick(w.t);
  assert.equal(e.status, "cancelled"); assert.match(e.flags.join(), /timeout/); assert.match(e.flags.join(), /quote unavailable/);
  const w2 = world(); w2.px.set(M, 100_000 / 1e9); w2.poll.add(w2.tok(M), "t"); for (let i = 0; i < 31; i++) await w2.step(10, M, 100_000);
  await w2.step(10, M, 205_000); w2.t += 1.1; await w2.poll.quotes(); const e2 = [...w2.eng.entries.values()][0]; assert.equal(e2.status, "filled");
  w2.route = false; w2.px.set(M, 50_000 / 1e9); w2.t += 3600; await w2.poll.quotes(); w2.eng.tick(w2.t);
  assert.ok(e2.versions.every((v) => v.status === "open" || v.status === "selling"), "unpriced ≠ zero and ≠ closed"); assert.ok(w2.poll.stats.noRoute > 0);
});

test("a token the price API omits is missing coverage: counted, history restarts, and no signal is made across the hole", async () => {
  const w = world(); w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) await w.step(10, M, 100_000);
  w.omit.add(M); for (let i = 0; i < 4; i++) await w.step(10); assert.ok(w.poll.stats.omitted >= 3 && w.poll.stats.lost >= 1);
  w.omit.delete(M); await w.step(10, M, 210_000); await w.step(10, M, 215_000);
  assert.equal(w.eng.entries.size, 0);
});

test("a mint already observed live by the PumpSwap adapter is not polled twice; restricted tokens are not entered", async () => {
  const w = world(); w.eng.feedUp(T0); w.eng.coin("LiveCoinpump", { pool: "PoolA", createTs: T0 - 9 * H }); w.px.set("LiveCoinpump", 1e-4);
  assert.equal(w.poll.add(w.tok("LiveCoinpump"), "t"), false); assert.equal(w.poll.stats.skippedLive, 1);
  w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); w.eng.coins.get(M).info.risk = { status: "restricted", blocking: ["transferHook"] };
  for (let i = 0; i < 31; i++) await w.step(10, M, 100_000); await w.step(10, M, 205_000);
  assert.equal(w.eng.entries.size, 0); assert.equal(w.eng.stats.riskBlocked, 1);
});

test("risk evidence: Token-2022 restrictions block the execution assumption; missing data is 'missing', not clean", () => {
  const mint = (ext, extra = {}) => ({ owner: TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1000000000000", mintAuthority: null, freezeAuthority: null, extensions: ext, ...extra } } } });
  assert.equal(classifyMintAccount(mint([{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 300 }, olderTransferFee: { transferFeeBasisPoints: 0 } } }])).status, "restricted");
  assert.equal(classifyMintAccount(mint([{ extension: "transferHook", state: { programId: "Hook111" } }])).status, "restricted");
  assert.equal(classifyMintAccount(mint([{ extension: "metadataPointer", state: {} }, { extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 0 }, olderTransferFee: { transferFeeBasisPoints: 0 } } }])).status, "clean");
  assert.equal(classifyMintAccount(mint([], { freezeAuthority: "X" })).status, "flagged"); assert.equal(classifyMintAccount(null).status, "missing");
  assert.equal(classifyJupToken({ token_program: TOKEN_2022, mint_authority_disabled: true, freeze_authority_disabled: true }).status, "missing");
  assert.equal(classifyJupToken({ token_program: SPL_TOKEN, mint_authority_disabled: true, freeze_authority_disabled: true }).status, "clean"); assert.equal(classifyJupToken({ token_program: SPL_TOKEN }).status, "missing");
});

test("capacity is budgeted per job (scans, position quotes, entry/exit quotes, discovery) and picks the lowest tier with headroom", () => {
  const a = budget({ hot: 3000, hotEvery: 10, inventories: 50, quoteEvery: 2 }); assert.equal(a.jobs.price_scan_hot, 6); assert.equal(a.jobs.position_quotes, 25); assert.equal(a.tier, "Launch");
  const b = budget({ hot: 500, cold: 2500, inventories: 10 }); assert.equal(b.tier, "Developer"); assert.ok(b.credits_month < 25e6);
  assert.equal(budget({ hot: 100, hotEvery: 60 }).tier, "Keyless");
});

test("Jupiter client: omitted mints are reported, not priced as zero; quotes return route and timing; no route is explicit", async () => {
  const calls = []; J.setFetch(async (url) => { calls.push(url); const u = new URL(url);
    if (u.pathname === "/price/v3") return { status: 200, headers: [], json: async () => ({ A: { usdPrice: 0.5, liquidity: 1000, decimals: 6 } }) };
    if (u.pathname === "/swap/v2/order") return u.searchParams.get("outputMint") === "NOROUTE" ? { status: 200, headers: [], json: async () => ({ errorMessage: "No routes found" }) } : { status: 200, headers: [], json: async () => ({ inAmount: "200000000", outAmount: "123456789", router: "metis", feeBps: 5, routePlan: [{ swapInfo: { label: "Raydium CLMM" } }, { swapInfo: { label: "Orca Whirlpool" } }] }) };
    return { status: 404, headers: [], json: async () => ({}) }; });
  process.env.JUP_RPS = "1000";
  const p = await J.prices(["A", "B"]); assert.equal(p.prices.get("A").px, 0.5); assert.deepEqual(p.omitted, ["B"]);
  const q = await J.quote("TOKEN", "buy", 0.2e9); assert.equal(q.ok, true); assert.equal(q.out, 123456789); assert.deepEqual(q.route, ["Raydium CLMM", "Orca Whirlpool"]); assert.ok(q.t >= q.req);
  assert.ok(!calls.some((c) => /taker|execute/.test(c)), "quote-only: no taker, no execute endpoint");
  const n = await J.quote("NOROUTE", "buy", 0.2e9); assert.equal(n.ok, false); assert.match(n.why, /No routes/);
});
