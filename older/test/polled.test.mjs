import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, H, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { classifyMintAccount, classifyJupToken, TOKEN_2022, SPL_TOKEN } from "../src/risk.mjs";
import { budget } from "../src/capacity.mjs";
import * as J from "../src/jupiter.mjs";
import * as S from "../src/spec.mjs";

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
  w.px.set(M, 50_000 / 1e9); w.t += 11; await w.poll.quotes();               // −75%: every trail (20…70%) triggers on this valuation
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
  assert.equal(classifyMintAccount(mint([{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 600 }, olderTransferFee: { transferFeeBasisPoints: 0 } } }])).status, "restricted"); // above 5%: still blocked (the higher of the fee in force and the scheduled one counts)
  const f3 = classifyMintAccount(mint([{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 300 }, olderTransferFee: { transferFeeBasisPoints: 100 } } }])); assert.equal(f3.status, "flagged"); assert.equal(f3.fee_bps, 300); assert.match(f3.warnings.join(), /transfer fee 300 bps/);
  assert.equal(classifyMintAccount(mint([{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 500 }, olderTransferFee: { transferFeeBasisPoints: 0 } } }])).status, "flagged", "exactly 5% is allowed");
  assert.equal(classifyMintAccount(mint([{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: 100 }, olderTransferFee: { transferFeeBasisPoints: 0 } } }, { extension: "permanentDelegate", state: {} }])).status, "restricted", "a small fee does not unblock another restriction");
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

test("transfer-fee coins (owner, 22 Nov 2026): a 5% fee coin is bought on the sampled method and marked; the fee is charged once — inside the quote as measured (nothing more deducted), or, under the other assumption, off the tokens at the buy and off the proceeds at the sale; on the live method it stays blocked", async () => {
  const run = async (bps, feeInQuote = false) => { const w = world(); w.poll.feeInQuote = feeInQuote; w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); if (bps) w.eng.coins.get(M).info.risk = { status: "flagged", blocking: [], warnings: [], fee_bps: bps };
    for (let i = 0; i < 31; i++) await w.step(10, M, 100_000); await w.step(10, M, 205_000); w.t += 1.1; await w.poll.quotes(); const e = [...w.eng.entries.values()][0];
    w.px.set(M, 75_000 / 1e9); w.t += 11; await w.poll.quotes(); w.t += 0.8; await w.poll.quotes(); return e; };
  const plain = await run(0), fee = await run(500), t = (e) => e.versions.find((v) => v.policy === "trail" && v.stop === 0.2);
  assert.equal(fee.status, "filled"); assert.equal(fee.token.xfer_bps, 500); assert.equal(fee.fill.quote.xfer_bps, 500); assert.equal(plain.token.xfer_bps, 0);
  assert.ok(Math.abs(fee.fill.tok / plain.fill.tok - 0.95) < 1e-9, "5% fewer tokens arrive at the buy");
  assert.equal(t(fee).status, "closed"); const gross = 1 + t(plain).exit.ret, net = 1 + t(fee).exit.ret;
  assert.ok(Math.abs(net / gross - 0.95 * 0.95) < 0.002, `the same trade is worth 0.95 × 0.95 of the fee-free one, less the fixed transaction cost (${(net / gross).toFixed(4)})`); assert.ok(net < gross * 0.9025, "never better than two full fees");
  // THE MEASURED CASE (spec XFER_FEE_IN_QUOTE = true): the quote is already net of the coin's fee, so the amounts are used as quoted
  assert.equal(S.XFER_FEE_IN_QUOTE, true, "22 Nov 2026 measurement: Jupiter quotes include the transfer fee"); assert.equal(world().poll.feeInQuote, true, "the poller runs the assumption in the spec");
  const inq = await run(500, true); assert.equal(inq.token.xfer_bps, 500, "still a fee coin: marked, in FEE-COINS"); assert.equal(inq.fill.quote.xfer_in_quote, true); assert.ok(Math.abs(inq.fill.tok / plain.fill.tok - 1) < 1e-9, "tokens exactly as quoted"); assert.ok(Math.abs(inq.fill.tok - inq.fill.quote.raw_tok) < 1e-9);
  assert.ok(Math.abs(t(inq).exit.ret - t(plain).exit.ret) < 1e-9, "and the result is the quoted result — the fee is not taken a second time"); assert.equal(t(inq).exit.quote.xfer_in_quote, true);
  const { booksApi } = await import("../src/page.mjs"); const api = booksApi([fee, plain], { stop: 0.2, policy: "trail" }), row = api.books["FEE-COINS"][0];
  assert.equal(api.books["FEE-COINS"].length, 1, "ONE row per fee-coin buy, in the separate book"); assert.equal(row.fee, 500); assert.equal(row.via, fee.families.join(" + "), "the row says which rule(s) bought it"); assert.equal(api.order.at(-1), "FEE-COINS");
  for (const f of fee.families) assert.ok(api.books[f].every((r) => r.id !== fee.id), `the fee coin is not in ${f}`); assert.ok(api.books["FAST-5M"].some((r) => r.id === plain.id), "an ordinary coin stays in its rule book");
  const { bookRows } = await import("../src/report.mjs"); const rr = bookRows([fee]), rp = bookRows([plain]); assert.equal(rr.reduce((n, r) => n + r.entries, 0), 0, "and it is not in the full table rows"); assert.ok(rp.reduce((n, r) => n + r.entries, 0) > 0);
  const { swap, path } = await import("./helpers.mjs"); const L = mkEngine(); L.feedUp(T0); const c = L.coin("LiveFeeCoin", { pool: "PoolL", createTs: T0 - 20 * H }); c.info.risk = { status: "flagged", blocking: [], fee_bps: 300 };
  for (let k = 0; k <= 30; k++) swap(L, T0 + k * 10, 100_000, { mint: "LiveFeeCoin", pool: "PoolL" }); swap(L, T0 + 320, 210_000, { mint: "LiveFeeCoin", pool: "PoolL" });
  assert.equal(L.entries.size, 0, "pool-state fills do not model the fee: not entered on the live method"); assert.equal(L.stats.riskBlocked, 1);
});

test("fee coins in their first 8 hours (owner, 22 Nov 2026): a 2-hour-old fee coin is bought by the ordinary sampled rules, in age group A0 and in FEE-COINS; a 2-hour-old coin without a fee is still not evaluated; a 2-hour-old coin with a fee over 5% is blocked", async () => {
  const run = async (risk) => { const w = world(); w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M, { ageH: 2 }), "t"); if (risk) w.eng.coins.get(M).info.risk = risk;
    for (let i = 0; i < 31; i++) await w.step(10, M, 100_000); await w.step(10, M, 205_000); w.t += 1.1; await w.poll.quotes(); return w; };
  const fee = await run({ status: "flagged", blocking: [], warnings: [], fee_bps: 200 }), e = [...fee.eng.entries.values()][0];
  assert.ok(e, "bought"); assert.equal(e.ag, "A0"); assert.ok(e.families.includes("FAST-5M")); assert.ok(!e.families.includes("AGE-DOUBLE"), "AGE-DOUBLE has no age-group start under 8 hours"); assert.equal(e.status, "filled"); assert.equal(e.token.xfer_bps, 200); assert.ok(fee.eng.stats.evalsFeeYoung > 0);
  const { booksApi } = await import("../src/page.mjs"); const api = booksApi([e], { stop: 0.2, policy: "trail", ag: "A0" }); assert.equal(api.books["FEE-COINS"].length, 1, "shown under the page's 'under 8h' filter, in FEE-COINS"); assert.equal(api.books["FAST-5M"].length, 0);
  const plain = await run(null); assert.equal(plain.eng.entries.size, 0, "no fee: the 8-hour rule stands"); assert.equal(plain.eng.stats.evals, 0);
  const big = await run({ status: "restricted", blocking: ["transferFee 900 bps"], fee_bps: 900 }); assert.equal(big.eng.entries.size, 0, "9% fee: blocked at any age");
});


// NO ROUTE, AGAIN AND AGAIN (27 Nov 2026: a hand sale of a coin whose liquidity had been removed was asked for once a second — over 4,000 refused requests)
test("a position that keeps answering \"no route\" is asked about every 30 s after 10 refusals in a row, its order is kept, and the first answered quote puts it back on its pace", async () => {
  const w = world(); w.px.set(M, 100_000 / 1e9); w.poll.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) await w.step(10, M, 100_000);
  await w.step(10, M, 205_000); w.t += 1.1; await w.poll.quotes(); const e = [...w.eng.entries.values()][0]; assert.equal(e.status, "filled");
  w.route = false; assert.equal(w.eng.manualSell(e.id, 1, w.t).ok, true); w.t += 1;
  let n0 = w.reqs.quote; for (let i = 0; i < 12; i++) { w.t += 1.05; await w.poll.quotes(); } const early = w.reqs.quote - n0; assert.ok(early >= S.NO_ROUTE_RUN, "at first every second: " + early);
  assert.ok(w.poll.noRouteRun.get(e.id) >= S.NO_ROUTE_RUN); assert.ok(e.manual.order, "the order is still waiting");
  n0 = w.reqs.quote; for (let i = 0; i < 60; i++) { w.t += 1.05; await w.poll.quotes(); } const later = w.reqs.quote - n0, sizes = w.eng.quoteNeeds(w.t).find((x) => x.id === e.id).sells.length;
  assert.ok(later <= 3 * sizes, "then about once in 30 s (" + later + " requests in 63 s for " + sizes + " sizes)"); assert.ok(later >= 1, "never dropped");
  w.route = true; w.t += S.NO_ROUTE_EVERY_S + 1; await w.poll.quotes(); w.eng.tick(w.t); assert.equal(w.poll.noRouteRun.get(e.id), undefined); assert.ok(e.manual.closed, "sold at the first price that came"); assert.equal(e.manual.order, null);
});
