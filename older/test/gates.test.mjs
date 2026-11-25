// older-11 — the owner's gates. One provider reading per buy signal, judged at the time of the buy; missing is never zero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import * as S from "../src/spec.mjs";
import { parseInfo, judge, gatesFor } from "../src/gates.mjs";
const M = "MintAAApump";
// the provider's real answer of 25 Nov 2026 10:02 UTC for AGmKjJ…Cqxqpump (fields the gates read; values as returned: strings)
const REAL = { ath_price: 0.00019252105, total_fee: "64.55971947358077", trade_fee: "37.84892266864744", holder_count: 484, total_supply: "965557393.800231", creation_timestamp: 1791667383, open_timestamp: 1791668325, launchpad: "pump",
  link: { twitter_username: "_numanuk/status/2109033918683111935", website: "" }, stat: { top_10_holder_rate: "0.2281", top_rat_trader_percentage: "0", top_bundler_trader_percentage: "0.0344", top70_sniper_hold_rate: "0.0217269507", dev_team_hold_rate: "0", creator_hold_rate: "0" },
  wallet_tags_stat: { sniper_wallets: 0, rat_trader_wallets: 0, bundler_wallets: 490 }, dev: { creator_token_status: "creator_close" } };
const good = (o = {}) => { const j = JSON.parse(JSON.stringify(REAL)); j.stat.top_bundler_trader_percentage = "0.12"; j.stat.top_rat_trader_percentage = "0.06"; Object.assign(j.stat, o.stat || {}); if (o.link) j.link = o.link; if ("total_fee" in o) j.total_fee = o.total_fee; if ("ath_price" in o) j.ath_price = o.ath_price; return j; };

test("parseInfo reads the provider's real answer: fractions, fees in SOL, a tweet as the Twitter link, all-time high as a market cap; anything absent is unknown, not zero", () => {
  const r = parseInfo(REAL); assert.equal(r.top10, 0.2281); assert.equal(r.bundlers, 0.0344); assert.equal(r.insiders, 0); assert.equal(r.snipers, 0.0217269507);
  assert.ok(Math.abs(r.fees_sol - 64.5597) < 1e-3); assert.equal(r.twitter, "_numanuk/status/2109033918683111935"); assert.ok(Math.abs(r.ath_usd - 192521.05) < 0.01); assert.equal(r.holders, 484); assert.equal(r.bundler_wallets, 490);
  const e = parseInfo({}); for (const k of ["top10", "bundlers", "insiders", "snipers", "fees_sol", "twitter", "ath_usd"]) assert.equal(e[k], null, k + " unknown");
  assert.equal(parseInfo({ stat: { top_10_holder_rate: "" }, link: { twitter_username: "" } }).top10, null, "an empty string is unknown"); assert.equal(parseInfo({ link: { twitter_username: " " } }).twitter, "", "a link block with no Twitter = known: none");
});
test("judge with the owner's settings: the real coin fails on bundlers and insiders only; each limit is inclusive except 'snipers under 5%'; missing figures fail as missing", () => {
  const G = S.GATES_11, v = judge(parseInfo(REAL), G, "HH-BREAK"); assert.equal(v.pass, false); assert.deepEqual(v.fails, ["bundlers 3.44%: below 5%", "insiders 0%: below 2.5%"]); assert.deepEqual(v.missing, []);
  const ok = judge(parseInfo(good()), G, "HH-BREAK"); assert.equal(ok.pass, true); assert.deepEqual(ok.options, { bundlers_main: true, bundlers_second: true, insiders_main: true, insiders_second: true });
  const J = (o, f = "HH-BREAK") => judge(parseInfo(good(o)), G, f);
  assert.equal(J({ stat: { top_10_holder_rate: "0.18" } }).pass, true, "18% is inside"); assert.equal(J({ stat: { top_10_holder_rate: "0.1799" } }).pass, false); assert.equal(J({ stat: { top_10_holder_rate: "0.30" } }).pass, true); assert.equal(J({ stat: { top_10_holder_rate: "0.3001" } }).pass, false);
  assert.equal(J({ stat: { top70_sniper_hold_rate: "0.0499" } }).pass, true); assert.equal(J({ stat: { top70_sniper_hold_rate: "0.05" } }).pass, false, "5% is not under 5%");
  assert.equal(J({ total_fee: "5" }).pass, true); assert.deepEqual(J({ total_fee: "4.99" }).fails, ["total fees 4.99 SOL: below 5 SOL"]);
  assert.deepEqual(J({ link: { twitter_username: "" } }).fails, ["no Twitter link"]); assert.deepEqual(J({ ath_price: 0.00009 }).fails, ["all-time high $90K: has not reached $100K"]);
  // the second options: bundlers 6% is outside the main range (7–50%) but inside the second (5–20%) — bought and tagged
  const b6 = J({ stat: { top_bundler_trader_percentage: "0.06" } }); assert.equal(b6.pass, true); assert.equal(b6.options.bundlers_main, false); assert.equal(b6.options.bundlers_second, true);
  const i30 = J({ stat: { top_rat_trader_percentage: "0.30" } }); assert.equal(i30.pass, true); assert.equal(i30.options.insiders_main, false); assert.equal(i30.options.insiders_second, true);
  assert.equal(J({ stat: { top_bundler_trader_percentage: "0.51" } }).pass, false); assert.equal(J({ stat: { top_rat_trader_percentage: "0.41" } }).pass, false);
  const miss = judge(parseInfo({ stat: { top_10_holder_rate: "0.2" } }), G, "HH-BREAK"); assert.equal(miss.pass, false); assert.deepEqual(miss.fails, []); assert.ok(miss.missing.includes("insiders") && miss.missing.includes("total fees"));
});
test("a book's own settings: the rug books take top 10 from 10% and are not asked for the $100K all-time high; a clock book uses its base book's settings", () => {
  const G = S.GATES_11, r = parseInfo(good({ stat: { top_10_holder_rate: "0.12" }, ath_price: 0.00001 }));
  assert.equal(judge(r, G, "RUG450").pass, true); assert.equal(judge(r, G, "HH-BREAK").pass, false); assert.equal(judge(r, G, "HH-BREAK-4H").pass, false);
  assert.equal(gatesFor(G, "HH-BREAK-4H"), gatesFor(G, "HH-BREAK")); assert.deepEqual(gatesFor(G, "RUG950").top10.buy, [0.10, 0.30]); assert.equal(gatesFor(G, "RUG950").fees_sol.buy[0], 5, "5 SOL applies to the rug books too");
});

// ── engine: a 2-hour-old coin, $320K traded in five minutes → VOL300K (legacy list). The reading is supplied by the test.
const setup = (reader, { at = 0.2 } = {}) => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.gates = S.GATES_11; let now = T0, pend = [];
  e.clock = () => now; e.readGate = (mint) => new Promise((res, rej) => pend.push({ mint, res, rej })); e.answer = (t, info) => { now = t; const p = pend.shift(); if (info instanceof Error) p.rej(info); else p.res(info); return new Promise((r) => setImmediate(r)); }; e.pendingReads = () => pend.length; return e; };
const burst = (e) => { path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 800 }); };
const entry = (e) => [...e.entries.values()].find((x) => x.families.includes("VOL300K"));

test("a buy signal asks for ONE reading; a reading that passes and arrived before the buy lets the buy fill, and the options are recorded on it", async () => {
  const e = setup(); burst(e); const en = entry(e); assert.ok(en && en.status === "pending"); assert.equal(e.pendingReads(), 1); assert.equal(en.gate.req_t, en.decisionT ?? en.gate.req_t);
  await e.answer(en.gate.req_t + 0.4, good()); assert.equal(en.gate.ms, 400);
  swap(e, en.schedT + 2, 100_000); swap(e, en.schedT + 3, 100_000);
  assert.equal(en.status, "filled"); assert.equal(en.gate.verdict, "pass"); assert.equal(en.gate.options.bundlers_main, true); assert.equal(e.stats.gate.passed, 1); assert.equal(en.gate.reading.top10, 0.2281);
});
test("a reading that fails cancels the buy and says why — the real coin: bundlers and insiders", async () => {
  const e = setup(); burst(e); const en = entry(e); await e.answer(en.gate.req_t + 0.3, REAL); swap(e, en.schedT + 2, 100_000);
  assert.equal(en.status, "cancelled"); assert.equal(en.gate.verdict, "fail"); assert.deepEqual(en.gate.fails, ["bundlers 3.44%: below 5%", "insiders 0%: below 2.5%"]);
  assert.ok(en.flags.some((f) => /cancelled before the buy: the owner's gates: bundlers 3\.44%: below 5%; insiders 0%: below 2\.5%/.test(f))); assert.equal(e.stats.gate.failed, 1); assert.equal(e.stats.gate.fails.bundlers, 1); assert.equal(e.stats.gate.fails.insiders, 1);
});
test("no reading by the time of the buy → cancelled, never treated as zero; a reading that arrives afterwards is kept on the entry and marked late", async () => {
  const e = setup(); burst(e); const en = entry(e); swap(e, en.schedT + 2, 100_000);
  assert.equal(en.status, "cancelled"); assert.equal(en.gate.verdict, "no reading"); assert.ok(en.flags.some((f) => /no provider reading had arrived by the time of the buy/.test(f))); assert.equal(e.stats.gate.no_reading, 1);
  await e.answer(en.schedT + 4, good()); assert.equal(en.gate.late, true); assert.equal(en.gate.reading.bundlers, 0.12, "what it would have said is recorded"); assert.equal(en.status, "cancelled");
  // …and a reading that arrived 0.3 s AFTER the scheduled buy, seen when the buy is processed: still too late
  const e2 = setup(); burst(e2); const en2 = entry(e2); await e2.answer(en2.schedT + 0.3, good()); swap(e2, en2.schedT + 2, 100_000);
  assert.equal(en2.status, "cancelled"); assert.ok(en2.flags.some((f) => /arrived 0\.30 s after the time of the buy/.test(f)));
});
test("a failed request (refused by the provider) cancels the buy with the provider's error; with the gates off nothing is asked and the buy fills as before", async () => {
  const e = setup(); burst(e); const en = entry(e); await e.answer(en.gate.req_t + 0.2, new Error("GMGN rate limited")); swap(e, en.schedT + 2, 100_000);
  assert.equal(en.status, "cancelled"); assert.ok(en.flags.some((f) => /the provider reading failed \(GMGN rate limited\)/.test(f))); assert.equal(e.stats.gate.errors, 1);
  const L = mkEngine(); L.feedUp(T0); L.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); burst(L); const el = entry(L); swap(L, el.schedT + 2, 100_000); swap(L, el.schedT + 3, 100_000);
  assert.equal(el.status, "filled"); assert.equal(el.gate, undefined); assert.equal(L.stats.gate, undefined);
});
test("books that fire together are judged each by its own settings: the one that fails is taken off the buy, the other fills", async () => {
  const e = setup(); e.gates = { ...S.GATES_11, byFamily: { ...S.GATES_11.byFamily, VOL300K: { fees_sol: { buy: [100, null] } } } }; e.setBooks(S.booksOf("VOL100K,VOL300K"));
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); swap(e, T0 + 600, 100_000, { sol: 3300 }); // $330K in one trade: both volume books fire on the same observation and share ONE buy
  assert.equal(e.entries.size, 1); assert.equal(e.pendingReads(), 1, "one reading for the shared buy");
  const en = [...e.entries.values()][0]; assert.deepEqual([...en.families].sort(), ["VOL100K", "VOL300K"]); await e.answer(en.gate.req_t + 0.2, good()); swap(e, en.schedT + 2, 100_000); swap(e, en.schedT + 3, 100_000);
  assert.equal(en.status, "filled"); assert.deepEqual(en.families, ["VOL100K"]); assert.deepEqual(en.gate.dropped, { VOL300K: ["total fees 64.56 SOL: below 100 SOL"] }); assert.ok(en.flags.some((f) => /books taken off this buy by their gates: VOL300K/.test(f)));
});
