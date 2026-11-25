// older-11 — LABEL, DON'T CANCEL (owner 25 Nov 2026; ChatGPT's second opinion on c1d543c) and the two execution faults it found.
// Every signal is paper-bought as without the gates; the provider reading is recorded and each book on the buy is labelled:
// passed / failed in time, passed / failed late, or no reading. The site filters the SAME buys into three views.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { booksApi, checkOf } from "../src/page.mjs";
import { num, athUsd, parseInfo } from "../src/gates.mjs";
import { saveWarm, loadWarm } from "../src/warm.mjs";
import { startBackfill, bf } from "../src/backfill.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", tick = () => new Promise((r) => setImmediate(r));
const GOOD = { ath_price: 0.0004, total_supply: "1000000000", total_fee: "20", link: { twitter_username: "x" }, stat: { top_10_holder_rate: "0.22", top_bundler_trader_percentage: "0.1", top_rat_trader_percentage: "0.05", top70_sniper_hold_rate: "0.01" } };
const BAD = { ...GOOD, stat: { ...GOOD.stat, top_10_holder_rate: "0.5" } };
const RUN = { name: "t", books: ["FAST-1M"], gates: true, gate_mode: "label", rebuy: false, min_age_h: 6, sampled: false };
// a 20-hour-old coin, FAST-1M only: ten quiet minutes at $100K, the double at T0 + 610, the buy at T0 + 611
const mk = (first, late = undefined) => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); e.rebuy = false; e.setBooks(["FAST-1M"]); e.gates = S.GATES_11; e.gateMode = "label"; let now = T0; e.clock = () => now; e.at = async (t) => { now = t; await tick(); };
  const give = (x) => (x instanceof Error ? Promise.reject(x) : Promise.resolve(x)); e.asked = { first: 0, late: 0 }; e.readGate = () => { e.asked.first++; return give(first); }; if (late !== undefined) e.readGateLate = () => new Promise((res, rej) => { e.asked.late++; e.lateGive = () => (late instanceof Error ? rej(late) : res(late)); }); return e; };
const buy = async (e) => { path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); const en = [...e.entries.values()][0]; await e.at(T0 + 610.3); swap(e, T0 + 612, 205_000); swap(e, T0 + 613, 205_000); return en; };
const view = (en, checks) => booksApi([en], { stop: 0.25, run: RUN, checks }).books["FAST-1M"];

test("a reading that FAILS in time no longer cancels: the buy is made as in the baseline, labelled failed with the reason, and only the 'all buys' view shows it", async () => {
  const e = mk(BAD), en = await buy(e); assert.equal(en.status, "filled", "bought: " + en.flags.join("; ")); assert.deepEqual(en.families, ["FAST-1M"], "no book is taken off a buy for a label");
  assert.equal(en.gate.verdict, "fail"); assert.equal(en.gate.timely, true); assert.deepEqual(en.gate.by["FAST-1M"], { pass: false, why: ["top 10 holders 50%: above 30%"] }); assert.equal(checkOf(en, "FAST-1M"), "fail");
  assert.equal(e.stats.gate.failed, 1); assert.equal(e.stats.gate.fails["top 10 holders"], 1);
  assert.equal(view(en, "all").length, 1); assert.equal(view(en, "all")[0].chk, "fail"); assert.deepEqual(view(en, "all")[0].chk_why, ["top 10 holders 50%: above 30%"]); assert.equal(view(en, "pass").length, 0); assert.equal(view(en, "late").length, 0);
});
test("a reading that PASSES in time: labelled passed, with the owner's two options, and it is in every view", async () => {
  const e = mk(GOOD), en = await buy(e); assert.equal(en.status, "filled"); assert.equal(en.gate.verdict, "pass"); assert.equal(en.gate.timely, true); assert.equal(en.gate.late, undefined); assert.equal(en.gate.options.bundlers_main, true); assert.equal(e.stats.gate.passed, 1);
  for (const c of ["all", "pass", "late"]) assert.equal(view(en, c).length, 1, c); assert.equal(view(en, "pass")[0].chk, "pass"); assert.equal(booksApi([en], { stop: 0.25, run: RUN, checks: "pass" }).run.checks, "pass");
});
test("the first request is refused: the buy is made, ONE ordinary request follows, and its answer is a LATE label — shown in 'incl. late', never in 'passed in time'", async () => {
  const e = mk(new Error("GMGN rate limited"), GOOD), en = await buy(e); assert.equal(en.status, "filled"); assert.equal(e.asked.late, 1, "one queued retry"); assert.equal(en.gate.verdict, "no reading"); assert.equal(checkOf(en, "FAST-1M"), "none"); assert.equal(e.stats.gate.no_reading, 1);
  assert.equal(view(en, "all")[0].chk, "none"); assert.equal(view(en, "pass").length, 0);
  e.lateGive(); await e.at(T0 + 640); assert.equal(en.gate.verdict, "pass"); assert.equal(en.gate.late, true); assert.equal(en.gate.timely, undefined); assert.equal(en.gate.ms, 30_000); assert.equal(en.gate.first_error, "GMGN rate limited"); assert.equal(e.stats.gate.late_passed, 1); assert.equal(e.stats.gate.passed, 0, "a late pass is never counted as a pass in time");
  assert.equal(checkOf(en, "FAST-1M"), "pass-late"); assert.equal(view(en, "pass").length, 0, "a late reading can reflect what happened after the buy: not a usable filter result"); assert.equal(view(en, "late").length, 1);
  swap(e, T0 + 700, 205_000); assert.equal(e.asked.late, 1, "and it is never asked for again");
});
test("no reading at all (the retry fails too): the buy stays in the baseline, labelled 'no reading' — kept apart from a genuine failure; no attempt is given back, nothing is held", async () => {
  const e = mk(new Error("GMGN allowance exhausted for another 12 s"), new Error("GMGN rate limited")), en = await buy(e); e.lateGive(); await e.at(T0 + 640);
  assert.equal(en.status, "filled"); assert.equal(en.gate.verdict, "no reading"); assert.equal(en.gate.by, undefined); assert.equal(e.stats.gate.retry_errors, 1); assert.equal(en.attempt_returned, undefined); assert.equal(e.coins.get(M).gateHold ?? null, null);
  assert.equal(view(en, "all")[0].chk, "none"); assert.equal(view(en, "late").length, 0); assert.equal(e.stats.gate.failed, 0, "not a failure of the checks");
});
test("a reading that arrives between the signal and the buy is judged AT the buy; one that arrives a moment after it is late", async () => {
  const e = mk(GOOD); let give; e.readGate = () => new Promise((r) => { give = r; }); path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); const en = [...e.entries.values()][0];
  swap(e, T0 + 612, 205_000); swap(e, T0 + 613, 205_000); assert.equal(en.status, "filled"); assert.equal(en.gate.verdict, "no reading"); give(GOOD); await e.at(en.schedT + 1.4);
  assert.equal(en.gate.verdict, "pass"); assert.equal(en.gate.late, true); assert.equal(checkOf(en, "FAST-1M"), "pass-late"); assert.equal(e.stats.gate.late_passed, 1);
});
test("a reading that arrived after the buy time but before the next trade of the coin is a late label too (no_reading still counts it as 'nothing at the buy')", async () => {
  const e = mk(GOOD); let give; e.readGate = () => new Promise((r) => { give = r; }); path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); const en = [...e.entries.values()][0];
  give(GOOD); await e.at(en.schedT + 0.4); assert.equal(en.status, "pending", "no trade of this coin has come since the signal"); swap(e, T0 + 613, 205_000); swap(e, T0 + 614, 205_000);
  assert.equal(en.status, "filled"); assert.equal(checkOf(en, "FAST-1M"), "pass-late"); assert.equal(e.stats.gate.no_reading, 1); assert.equal(e.stats.gate.late_passed, 1); assert.equal(e.stats.gate.passed, 0);
});
test("DIP15K is the one book whose RULE needs the reading: without a watched $100K peak the provider's all-time high must be there in time and be $100K or more", async () => {
  const mkD = (info) => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.rebuy = false; e.setBooks(["DIP15K"]); e.gates = S.GATES_11; e.gateMode = "label"; let now = T0; e.clock = () => now; e.at = async (t) => { now = t; await tick(); }; e.readGate = () => (info instanceof Error ? Promise.reject(info) : Promise.resolve(info)); return e; };
  const fall = async (e) => { swap(e, T0, 80_000); swap(e, T0 + 20, 40_000); swap(e, T0 + 40, 16_000); swap(e, T0 + 60, 14_000); const en = [...e.entries.values()][0]; await e.at(T0 + 60.3); swap(e, T0 + 62, 14_000); swap(e, T0 + 63, 14_000); return en; };
  const ok = await fall(mkD(BAD)); assert.equal(ok.status, "filled", "all-time high $400K: the rule holds — and the failed top-10 check is only a label"); assert.equal(ok.gate.verdict, "fail"); assert.equal(checkOf(ok, "DIP15K"), "fail");
  const low = mkD({ ...GOOD, ath_price: 0.00006 }), x = await fall(low); assert.equal(x.status, "cancelled"); assert.match(x.gate.rule, /DIP15K not established: the provider's all-time high is \$60K/); assert.equal(x.attempt_returned, undefined, "a coin that has not been to $100K is a decision about the coin"); assert.equal(low.stats.gate.rule_cancelled, 1);
  const none = mkD(new Error("GMGN rate limited")), y = await fall(none); assert.equal(y.status, "cancelled"); assert.match(y.gate.rule, /no provider reading had arrived/); assert.equal(y.attempt_returned, true, "no reading is not the coin's fault: the book may buy on a fresh crossing later");
});

test("second opinion — a pool state installed by a transaction of unknown delay prices NOTHING: the pending buy waits for a measured state", () => {
  const e = mkEngine({ stream: "manual" }); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H });
  for (let t = T0; t < T0 + 610; t += 2) { if ((t - T0) % 20 === 0) swap(e, t, 100_000, { lag: 1 }); else e.noteLag(t, 1); }
  swap(e, T0 + 610, 205_000, { lag: 1 }); const en = [...e.entries.values()][0]; assert.equal(en.status, "pending"); assert.equal(en.schedT, T0 + 611);
  e.tx(T0 + 610.5, null, () => e.onSwap({ t: T0 + 610.5, mint: M, pool: "PoolA", base: 2e8, quote: 800, feeBps: 30, sol: 1, isBuy: true, user: "u" })); // unmeasured: the pool is now at $400K
  assert.equal(e.coins.get(M).state.unmeasured, true); e.noteLag(T0 + 611.2, 1); e.tick(T0 + 611.2);
  assert.equal(en.status, "pending", "the old code filled here on the $400K pool (quote 800 SOL) — a price no measured transaction had confirmed");
  swap(e, T0 + 612, 300_000, { lag: 1 }); assert.equal(e.coins.get(M).state.unmeasured, undefined); swap(e, T0 + 613, 300_000, { lag: 1 });
  assert.equal(en.status, "filled"); assert.equal(Math.round(en.fill.quote_sol), 600, "priced on the first MEASURED state after the buy time ($300K), inside the usual 5-second window");
  // …and if no measured state comes within 5 seconds, the ordinary pricing timeout cancels it
  const f = mkEngine({ stream: "manual" }); f.feedUp(T0); f.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); for (let t = T0; t < T0 + 610; t += 2) { if ((t - T0) % 20 === 0) swap(f, t, 100_000, { lag: 1 }); else f.noteLag(t, 1); }
  swap(f, T0 + 610, 205_000, { lag: 1 }); const fn = [...f.entries.values()][0]; f.tx(T0 + 610.5, null, () => f.onSwap({ t: T0 + 610.5, mint: M, pool: "PoolA", base: 2e8, quote: 800, feeBps: 30, sol: 1, isBuy: true, user: "u" }));
  for (let t = T0 + 612; t <= T0 + 620; t += 2) { f.noteLag(t, 1); f.tick(t); } assert.equal(fn.status, "cancelled"); assert.ok(fn.flags.some((x) => /timeout/.test(x)), fn.flags.join("; "));
});
test("second opinion — a figure must be finite; the all-time-high market cap needs a VERIFIED pump.fun coin, not just a supply under a billion", () => {
  assert.equal(num("1e999"), null); assert.equal(num("-1e999"), null); assert.equal(num(1e308 * 10), null); assert.equal(num("1e3"), 1000);
  assert.equal(athUsd(0.0004, 9e8, null, false).usd, null); assert.match(athUsd(0.0004, 9e8, null, false).basis, /not a verified pump\.fun coin/); assert.equal(Math.round(athUsd(0.0004, 9e8, null, true).usd), 360_000);
  assert.equal(parseInfo(GOOD).ath_usd, null, "unknown unless the caller has the evidence"); assert.equal(Math.round(parseInfo(GOOD, null, true).ath_usd), 400_000);
  const e = mkEngine(); e.coin(M, { pool: "PoolA" }); e.coin("Other", { mode: "polled" }); assert.equal(e._pump(M), true); assert.equal(e._pump("Other"), false); e.coins.get(M).info.population = "solana-wide"; assert.equal(e._pump(M), false);
});
test("history repair can be paused without a restart: nothing is asked of the provider and the skipped gap repairs are counted; a book's hold survives a planned restart", async () => {
  let off = true; const e = mkEngine(); e.feedUp(T0); const b = startBackfill({ engine: e, store: null, jup: null, log: () => {}, paused: () => off }), before = bf.gapsSkippedPaused || 0, errs = bf.errors;
  await b.patchGap(T0, T0 + 60, ["A", "B", "C"]); assert.equal((bf.gapsSkippedPaused || 0) - before, 3); assert.equal(bf.errors, errs, "no request was attempted");
  const d = mkdtempSync(join(tmpdir(), "older-lab-")), a = mkEngine(); a.feedUp(T0); a.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); path(a, T0, T0 + 300, () => 100_000, 20); a.coins.get(M).gateHold = { "A2|VOL300K": true }; saveWarm(join(d, "w"), a, T0 + 300);
  const n = mkEngine(); assert.ok(loadWarm(join(d, "w"), n, T0 + 305).loaded); assert.deepEqual(n.coins.get(M).gateHold, { "A2|VOL300K": true });
});
