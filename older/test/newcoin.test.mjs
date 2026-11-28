// The NEW-COIN BOOKS (spec NEW_COIN, src/newcoin.mjs): a coin is measured once at 5 and at 10 minutes old, counted against every
// rule, and paper-bought on a routed quote when all of that age's rules hold. Owner's numbers of 25 Nov 2026 (16:07, 18:37 UK).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { NewCoins, measure, judgeMeasure } from "../src/newcoin.mjs";
import { Store } from "../src/store.mjs";
import { booksApi, saleRows } from "../src/page.mjs";
import { startWeb, coinLookup } from "../src/web.mjs";
import { parseInfo } from "../src/gates.mjs";
import { SPL_TOKEN, TOKEN_2022 } from "../src/risk.mjs";
import * as S from "../src/spec.mjs";

const R5 = S.NEW_COIN[0], R10 = S.NEW_COIN[1];
// a synthetic provider: the test sets each coin's figures and price; the clock is manual
function world({ store = null, file = null, engine = {}, gmgn = null, quoter = {}, evidence = false } = {}) {
  const w = { t: T0, coins: new Map(), px: new Map(), list: [], reqs: { recent: 0, search: 0, quote: 0, gmgn: 0, risk: 0 }, searchFail: false, quoteDelay: 0.3, info: new Map(), riskOf: new Map(), sizes: [] };
  // figures: mc, holders, vol (since creation), top (Jupiter %, 0–100)
  w.add = (mint, born, f = {}) => { w.coins.set(mint, { born, mc: 20_000, holders: 200, vol: 60_000, top: 25, program: SPL_TOKEN, ...f }); w.px.set(mint, (f.mc ?? 20_000) / 1e9); w.list.push(mint); };
  const row = (mint) => { const c = w.coins.get(mint); return { mint, symbol: mint.slice(0, 4), decimals: c.decimals === undefined ? 6 : c.decimals, token_program: c.program, px: w.px.get(mint), mcap: c.mc, holders: c.holders, liq_usd: 9000, circ_supply: 1e9, total_supply: 1e9, launchpad: "pump.fun", first_pool: { id: mint, created: c.born },
    mint_authority_disabled: true, freeze_authority_disabled: true, top_holders_pct: c.top, is_sus: false, stats5m: { buyVolume: (c.vol5 ?? c.vol) * 0.6, sellVolume: (c.vol5 ?? c.vol) * 0.4, numTraders: 90 }, stats1h: c.vol == null ? null : { buyVolume: c.vol * 0.6, sellVolume: c.vol * 0.4, numTraders: 120 }, curve_pct: 40 }; };
  w.jup = { recent: async () => { w.reqs.recent++; return w.list.slice(-30).map(row); },
    tokens: async (ms) => { w.reqs.search++; if (w.searchFail) throw new Error("HTTP 500"); return ms.filter((m) => w.coins.has(m) && !w.coins.get(m).hidden).map(row); },
    quote: async (mint, side, raw) => { w.reqs.quote++; const req = w.t; w.t += w.quoteDelay; const px = w.px.get(mint) / 100; w.sizes.push([side, raw]);
      return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Dynamic Bonding Curve"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Dynamic Bonding Curve"], router: "metis" }; } };
  const GOOD = (mint) => ({ total_fee: 4, stat: { top_10_holder_rate: 0.24, top_bundler_trader_percentage: 0.1, top_rat_trader_percentage: 0, top70_sniper_hold_rate: 0.01 }, creation_timestamp: w.coins.get(mint).born, holder_count: 210, launchpad: "Pump.fun" });
  w.readInfo = gmgn ?? (async (mint) => { w.reqs.gmgn++; const x = w.info.get(mint); if (x instanceof Error) throw x; return { ...GOOD(mint), ...(x || {}) }; });
  w.readRisk = async (mint) => { w.reqs.risk++; return w.riskOf.get(mint) ?? { status: "clean", program: TOKEN_2022, extensions: [], blocking: [], warnings: [], fee_bps: 0, src: "rpc mint account" }; };
  w.eng = mkEngine({ tokens: null, ...(store ? { store } : {}), ...engine }); w.eng.setBooks([...S.booksOf("older-11"), ...S.NEW_BOOKS]); w.eng.feedUp(T0);
  w.quoter = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t, runnerEvery: Infinity, ...quoter }); // as main.mjs sets it: a buy whose every row is sold is not quoted
  w.nc = new NewCoins({ engine: w.eng, jup: w.jup, quoter: w.quoter, readInfo: w.readInfo, readRisk: w.readRisk, readEvidence: evidence ? async (mint) => { w.reqs.ev = (w.reqs.ev || 0) + 1; const x = w.info.get(mint); if (x instanceof Error) throw x; return { ...GOOD(mint), ...(x || {}) }; } : null, store, now: () => w.t, file });
  w.pass = async () => { await w.nc.look(); const n = await w.nc.check(); await w.nc.idle(); return n; };
  w.price = async (dt = 0) => { w.t += dt; w.eng.tick(w.t); await w.quoter.quotes(); w.eng.tick(w.t); };
  w.setMc = (mint, mc) => w.px.set(mint, mc / 1e9);
  w.entries = (fam) => [...w.eng.entries.values()].filter((e) => !fam || e.families.includes(fam));
  return w;
}
const A = "NewCoinAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApump", B = "NewCoinBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBpump", C = "NewCoinCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCpump";

test("the rule numbers are the owner's: 5 minutes — cap over $10K, over 100 holders, $30K traded, 2 SOL fees, top 10 16–30% (20–30% until 27 Nov 2026 14:15 UK); 10 minutes — over 150 holders, $50K, 3.5 SOL", () => {
  assert.deepEqual(R5, { family: "NEW-5M", at_s: 300, mc_min_usd: 10_000, holders_min: 100, vol_min_usd: 30_000, fees_min_sol: 2, top10: [0.16, 0.3] });
  assert.deepEqual(R10, { family: "NEW-10M", at_s: 600, mc_min_usd: 10_000, holders_min: 150, vol_min_usd: 50_000, fees_min_sol: 3.5, top10: [0.16, 0.3] });
  // 15 and 20 minutes (owner 23:32 UK): holders over 200, $100K traded, fees 5 SOL, top 10 16–30% since 27 Nov 14:15 UK — the same at both ages
  assert.deepEqual(S.NEW_COIN.slice(2), [{ family: "NEW-15M", at_s: 900, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.16, 0.3] }, { family: "NEW-20M", at_s: 1200, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.16, 0.3] }]);
  assert.deepEqual(S.NEW_BOOKS, ["NEW-5M", "NEW-10M", "NEW-15M", "NEW-20M"]);
  const j = (f, r = R5) => judgeMeasure({ mc: 10_001, holders: 101, vol: 30_000, top_jup: 0.2, ...f }, r);
  assert.deepEqual(j({}), { mc: true, holders: true, vol: true, top_jup: true });
  assert.equal(j({ mc: 10_000 }).mc, false, "over $10K, not $10K itself"); assert.equal(j({ holders: 100 }).holders, false, "over 100"); assert.equal(j({ vol: 29_999 }).vol, false); assert.equal(j({ top_jup: 0.301 }).top_jup, false);
  assert.equal(j({ holders: null }).holders, null, "a missing figure is neither a pass nor a fail"); assert.equal(j({ holders: 150 }, R10).holders, false); assert.equal(j({ vol: 49_999 }, R10).vol, false);
  // volume is the coin's whole life: the 1-hour statistics when they are there, the 5-minute ones only as a fallback
  assert.equal(measure({ stats1h: { buyVolume: 30_000, sellVolume: 20_000 }, stats5m: { buyVolume: 5000, sellVolume: 1000 } }).vol, 50_000);
  assert.equal(measure({ stats1h: null, stats5m: { buyVolume: 5000, sellVolume: 1000 } }).vol, 6000); assert.equal(measure({}).vol, null); assert.equal(measure({ top_holders_pct: 25 }).top_jup, 0.25);
});

test("every new coin is measured once at 5 minutes old and counted against each rule; nothing is judged before its age or more than 90 s after it", async () => {
  const w = world();
  w.add(A, T0, { mc: 3000, holders: 40, vol: 4000 }); w.add(B, T0 + 5, { mc: 15_000, holders: 60, vol: 12_000 }); w.add(C, T0 + 10, { mc: 12_000, holders: 120, vol: 20_000 });
  w.t = T0 + 20; assert.equal(await w.pass(), 0, "seen, but nobody is 5 minutes old yet"); assert.equal(w.nc.stats.seen, 3); assert.equal(w.reqs.search, 0);
  w.t = T0 + 302; assert.equal(await w.pass(), 1, "only the coin that has turned 5 minutes"); w.t = T0 + 322; assert.equal(await w.pass(), 2);
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.measured, 3); assert.equal(K.mc, 2); assert.equal(K.holders, 1); assert.equal(K.vol, 0); assert.equal(K.candidates, 0); assert.equal(K.mc_holders, 1); assert.deepEqual(K.max, { mc: 15_000, holders: 120, vol: 20_000 });
  assert.equal(K.recent.length, 2, "coins over the market-cap line are kept with the reason"); assert.match(K.recent[0].out, /holders 60 \(needs over 100\), volume \$12K \(needs \$30K\)/);
  assert.equal(w.entries().length, 0); assert.equal(w.reqs.gmgn, 0, "GMGN is not asked for a coin that failed the first three");
  w.t = T0 + 340; assert.equal(await w.pass(), 0, "each age point is measured once"); assert.equal(w.reqs.search, 2);
  // the token-data request fails: asked again while the coin is inside its window, then counted too late — never judged on later figures
  w.add("LateCoin", T0 + 400, {}); w.t = T0 + 410; await w.pass(); w.searchFail = true; w.t = T0 + 705; await w.pass(); w.t = T0 + 725; await w.pass(); assert.equal(K.search_failed, 2); assert.equal(w.entries("NEW-5M").length, 0);
  w.searchFail = false; w.t = T0 + 400 + 300 + S.NEW_CHECK_LATE_S + 1; await w.pass(); assert.equal(K.too_late, 1); assert.equal(K.measured, 3);
  // a coin the provider's list never showed with a creation time is counted, not guessed
  assert.equal(w.nc.stats.looks_no_overlap, 0); assert.ok(w.nc.stats.looks >= 6);
});

test("a coin that passes all five rules at 5 minutes is paper-bought on a routed quote requested after decision + 1 s; the reading is kept on the buy", async () => {
  const w = world(); w.add(A, T0, { mc: 20_000, holders: 150, vol: 45_000 });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 303; await w.pass();
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.candidates, 1); assert.equal(K.gmgn_ok, 1); assert.equal(K.fees, 1); assert.equal(K.top10, 1); assert.equal(K.passed_all, 1); assert.equal(K.bought, 1);
  const [e] = w.entries("NEW-5M"); assert.ok(e); assert.equal(e.status, "pending"); assert.equal(e.ag, "A0"); assert.equal(e.pop, "new-coins"); assert.equal(e.exec, "routed-quote"); assert.equal(e.mode, "polled"); assert.equal(e.versions.length, S.POLICIES.length * S.STOPS.length, "every stop under every exit policy");
  assert.equal(Math.round(e.signalMc), 20_000); assert.equal(e.cands[0].detail.gmgn.fees_sol, 4); assert.equal(e.cands[0].detail.jupiter.holders, 150); assert.equal(e.cands[0].detail.rule.holders_min, 100);
  assert.equal(e.gate.verdict, "pass"); assert.equal(e.gate.by["NEW-5M"].pass, true); assert.equal(e.gate.reading.fees_sol, 4);
  await w.quoter.quotes(); assert.equal(e.status, "pending", "no quote before the scheduled time");
  await w.price(1.1); assert.equal(e.status, "filled"); assert.ok(e.fill.quote.req_t >= e.schedT); assert.equal(e.fill.exec, "routed-quote"); assert.deepEqual(e.fill.quote.route, ["Dynamic Bonding Curve"]); assert.ok(e.fill.delay_s > 0);
  // the coin is an ordinary coin of the engine with no pool yet: when it migrates, the pool books see it like any other
  const c = w.eng.coins.get(A); assert.equal(c.mode, "live"); assert.equal(c.createTs, T0); assert.equal(c.pool, null);
  swap(w.eng, w.t + 5, 80_000, { mint: A, pool: "PoolOfA" }); assert.equal(c.pool, "PoolOfA"); assert.equal(w.eng.stats.liveIgnoredSampled || 0, 0, "its pool trades are not ignored");
  // the page shows it in its own book, with a sell button and the reading
  const j = booksApi([e], { stop: 0.25, run: { books: w.eng.books, gates: true, gate_mode: "label", newcoins: true }, sellable: true, now: w.t });
  assert.ok(j.order.includes("NEW-5M") && j.rules["NEW-5M"].includes("5 minutes old")); const r = j.books["NEW-5M"][0]; assert.equal(r.sell, 1); assert.equal(r.chk, "pass"); assert.equal(r.gate.fees, 4); assert.equal(r.mode, "polled");
  assert.equal(booksApi([e], { stop: 0.25, run: { books: w.eng.books, gates: true, gate_mode: "label" }, checks: "pass" }).books["NEW-5M"].length, 1, "it stays in the 'passed in time' view: it passed its own rules before it was bought");
  // trading at the buy (owner 26 Nov 00:37 UK): volume with market cap, net buys, transactions — from the figures stored on the buy
  assert.equal(r.mk, undefined, "no stored reading, nothing invented"); assert.equal(e.cands[0].detail.jupiter.n_buys, null, "the provider gave no buy count in this reading: recorded as missing"); assert.equal(e.cands[0].detail.jupiter.buy_vol, 45_000 * 0.6);
  e.snap = { ok: true, delay_s: 0.85, mcap: 20_000, liq_usd: 7030.4, holders: 150, stats1h: { buyVolume: 30_000, sellVolume: 26_000, numBuys: 400, numSells: 322, numTraders: 185, numNetBuyers: 90, buyOrganicVolume: 2000, sellOrganicVolume: 1500 }, stats5m: { buyVolume: 9000, sellVolume: 8000 } };
  const m = booksApi([e], { stop: 0.25, run: { books: w.eng.books } }).books["NEW-5M"][0].mk; assert.deepEqual(m, { win: "1h", mc: 20_000, liq: 7030, vol: 56_000, vmc: 2.8, nb: 4000, tx: 722, buys: 400, sells: 322, traders: 185, netb: 90, org: 3500, holders: 150, v5: 17_000, delay: 0.85 });
  e.snap = { ok: false, why: "token not returned" }; assert.equal(booksApi([e], { stop: 0.25, run: { books: w.eng.books } }).books["NEW-5M"][0].mk, undefined);
  // one buy per book and coin
  assert.equal(w.eng.openDirect({ mint: A, family: "NEW-5M", t: w.t, mc: 1, px: 1 }), null);
});

test("not bought, and counted why: fees too low, top 10 outside 16–30%, no GMGN reading, GMGN says the coin is old, transfers restricted, restrictions unreadable", async () => {
  const w = world(); const born = T0, names = ["Fees", "Top", "NoRead", "Old", "Restr", "Unread", "Good22"].map((n) => n + "CoinXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXpump");
  for (const m of names) w.add(m, born, { program: /Restr|Unread|Good22/.test(m) ? TOKEN_2022 : SPL_TOKEN });
  w.info.set(names[0], { total_fee: 1.99 }); w.info.set(names[1], { stat: { top_10_holder_rate: 0.31 } }); w.info.set(names[2], new Error("GMGN allowance exhausted for another 9.0 s")); w.info.set(names[3], { creation_timestamp: born - 3600 });
  w.riskOf.set(names[4], { status: "restricted", program: TOKEN_2022, blocking: ["transferHook"], warnings: [], fee_bps: 0, src: "rpc mint account" }); w.riskOf.set(names[5], { status: "missing", why: "mint account not parsed" });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 305; await w.pass();
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.candidates, 7); assert.equal(K.gmgn_failed, 1); assert.equal(K.gmgn_ok, 6); assert.equal(K.fees, 5); assert.equal(K.top10, 5); assert.equal(K.age_ok, 5); assert.equal(K.passed_all, 3); assert.equal(K.risk_blocked, 1); assert.equal(K.risk_unknown, 1); assert.equal(K.bought, 1);
  const out = Object.fromEntries(K.recent.map((x) => [x.mint.slice(0, 4), x.out])); assert.match(out.Fees, /fees 1\.99 SOL \(needs 2\)/); assert.match(out.TopC, /top 10 holders 31\.0% \(needs 16–30%\)/); assert.match(out.NoRe, /no GMGN reading/); assert.match(out.OldC, /GMGN says the coin is 65 minutes old/); assert.match(out.Rest, /restricts transfers \(transferHook\)/); assert.match(out.Unre, /could not be read from the chain/); assert.match(out.Good, /BOUGHT/);
  assert.equal(w.entries().length, 1); assert.equal(w.entries()[0].mint, names[6]); assert.equal(w.reqs.risk, 3, "the mint account is read only for a Token-2022 coin that passed everything else"); assert.equal(w.quoter.watch.size, 1, "only the coin that was bought is quoted");
  assert.equal(w.entries()[0].token.token_program, TOKEN_2022); assert.equal(w.entries()[0].token.risk_status, "clean");
});

test("the 10-minute book is measured on its own numbers at 10 minutes; both books may buy the same coin, each once", async () => {
  const w = world(); w.add(A, T0, { mc: 20_000, holders: 120, vol: 35_000 }); w.info.set(A, { total_fee: 2.5 });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); assert.equal(w.entries("NEW-5M").length, 1); await w.price(1.2);
  Object.assign(w.coins.get(A), { holders: 150, vol: 80_000 }); w.t = T0 + 601; await w.pass();
  const K = w.nc.stats.checks["NEW-10M"]; assert.equal(K.measured, 1); assert.equal(K.holders, 0, "150 holders is not over 150"); assert.equal(K.vol, 1); assert.equal(w.entries("NEW-10M").length, 0);
  // a second coin: enough at 10 minutes, fees 2.5 SOL are not (3.5 needed); then with 3.5 it is bought — and the 5-minute book's buy of it stays its own
  w.add(B, w.t, { holders: 90 }); w.t += 20; await w.pass(); Object.assign(w.coins.get(B), { holders: 300, vol: 90_000 }); w.info.set(B, { total_fee: 2.5 }); const bornB = w.coins.get(B).born;
  w.t = bornB + 301; await w.pass(); assert.equal(w.entries("NEW-5M").length, 2); w.t = bornB + 602; await w.pass(); assert.equal(K.fees, 0); assert.match(K.recent.at(-1).out, /fees 2\.5 SOL \(needs 3\.5\)/);
  w.add(C, w.t, {}); w.info.set(C, { total_fee: 3.5 }); const bornC = w.t; w.t += 20; await w.pass(); w.t = bornC + 300.5; await w.pass(); w.t = bornC + 600.5; await w.pass();
  assert.equal(w.entries("NEW-10M").length, 1); assert.equal(w.entries().filter((e) => e.mint === C).length, 2, "the 5-minute and the 10-minute book each hold their own buy of the coin");
});

test("stops run on quotes: a 25% fall from the high sells the 25% rows; once every row is sold the buy is not quoted any more — its 24-hour high is estimated from token data, all such buys in one request", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"); assert.equal(e.status, "filled"); const row = (stop, pol = "trail") => e.versions.find((v) => v.stop === stop && v.policy === pol);
  w.setMc(A, 30_000); await w.price(10); assert.ok(row(0.25).maxX > 1.4); w.setMc(A, 22_000); await w.price(10); // −27% from the high
  assert.equal(row(0.2).status, "selling"); assert.equal(row(0.25).status, "selling"); assert.equal(row(0.3).status, "open");
  await w.price(1); assert.equal(row(0.25).status, "closed"); assert.equal(row(0.25).reason, "trail"); assert.ok(row(0.25).exit.quote.req_t >= row(0.25).trigT + 0.7 - 1e-9, "the sale is priced by a quote asked for after trigger + 0.7 s"); assert.ok(Math.abs(row(0.25).exit.ret - (22 / 20 * 0.99 * 0.99 * 0.2 - 0.0005) / 0.2005 + 1) < 0.01);
  w.setMc(A, 2000); await w.price(10); await w.price(1); await w.price(1); assert.ok(e.versions.every((v) => v.status === "closed"), "every row is out");
  const need = w.eng.quoteNeeds(w.t)[0]; assert.equal(need.runner_only, true); const q0 = w.reqs.quote, s0 = w.reqs.search, hi0 = e.runner.maxX, exits = JSON.stringify(e.versions.map((v) => v.exit)); for (let i = 0; i < 12; i++) await w.price(10); // two minutes
  assert.equal(w.reqs.quote - q0, 0, "no quote is asked for a buy whose rows are all sold");
  w.setMc(A, 90_000); assert.equal(await w.nc.runnerPass(), 1); assert.equal(w.reqs.search - s0, 1, "one token-data request for all of them");
  const want = ((90_000 / 1e9) * e.fill.tok / 100 - S.TX_COST_SOL) / 0.2005; assert.ok(Math.abs(e.runner.maxX - want) < 1e-9, "price × tokens bought, in SOL, less one transaction cost"); assert.ok(e.runner.maxX > hi0 && e.runner.maxX > 4); assert.equal(e.runner.est, true); assert.equal(e.runner.maxEst, true); assert.ok(e.runner.reached[3] > 0);
  assert.equal(JSON.stringify(e.versions.map((v) => v.exit)), exits, "an estimate never touches a sale that was made");
  assert.equal(booksApi([e], { stop: 0.25, run: { books: w.eng.books } }).books["NEW-5M"][0].hi_est, true);
  w.setMc(A, 5000); await w.nc.runnerPass(); assert.ok(Math.abs(e.runner.maxX - want) < 1e-9, "the high only rises"); assert.ok(e.runner.lastX < 1);
  // a buy with a row still open is NOT estimated: its quotes are its prices
  w.add(B, w.t, {}); const bornB = w.t; w.t += 20; await w.pass(); w.t = bornB + 301; await w.pass(); await w.price(1.2); const eb = w.entries("NEW-5M").find((x) => x.mint === B); assert.equal(eb.status, "filled");
  w.setMc(B, 500_000); assert.equal(await w.nc.runnerPass(), 1, "only the sold-out buy"); assert.ok(eb.runner.maxX < 1.1); assert.equal(eb.runner.est, undefined);
});

test("GMGN is asked only when the coin could still pass: Jupiter's top-holders figure outside 15–35% → not asked, not bought, counted; inside it or missing → asked, and GMGN's own 16–30% decides; every such measurement is logged", async () => {
  const dir = mkdtempSync(join(tmpdir(), "older-nc-")), file = join(dir, "newcoins-t.json"); const w = world({ file });
  w.add(A, T0, { top: 9.2 }); w.add(B, T0, { top: 16 }); w.add(C, T0, { top: null }); w.add("ThinCoinXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXpump", T0, { top: 36, vol: 100 }); w.info.set(B, { stat: { top_10_holder_rate: 0.159 } });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass();
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.candidates, 3); assert.equal(K.top_pre_skipped, 1); assert.equal(K.gmgn_asked, 2); assert.equal(w.reqs.gmgn, 2); assert.equal(K.bought, 1);
  const out = Object.fromEntries(K.recent.map((x) => [x.mint.slice(0, 8), x.out])); assert.match(out.NewCoinA, /top holders 9\.2% by Jupiter's figure \(needs 16–30%; GMGN not asked\)/); assert.match(out.NewCoinB, /top 10 holders 15\.9% \(needs 16–30%\)/); assert.match(out.NewCoinC, /BOUGHT/); assert.match(out.ThinCoin, /volume \$0K/);
  assert.deepEqual(S.NEW_TOP_PRE, [0.15, 0.35]);
  // the log: one line per measured coin over the market-cap line, kept across a restart
  const lines = readFileSync(join(dir, "newcoins-t.log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)); assert.equal(lines.length, 4); assert.ok(lines.every((l) => l.book === "NEW-5M" && l.mint && l.out)); assert.equal(w.nc.history.length, 4);
  const w2 = world({ file }); assert.equal(w2.nc.history.length, 4); assert.equal(w2.nc.status().logged, 4);
});

test("the sell button on a new-coin buy: half, then the rest — each priced by a quote for exactly that quantity, asked for after the tap + 0.7 s; the rules' rows are untouched", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"); w.setMc(A, 40_000); await w.price(10);
  const r = w.eng.manualSell(e.id, 0.5, w.t); assert.equal(r.ok, true); assert.equal(r.share_of_buy, 0.5); const sched = e.manual.order.schedT;
  await w.quoter.quotes(); assert.ok(e.manual.order, "a quote asked for before the scheduled time does not price it");
  await w.price(0.8); assert.equal(e.manual.order, null); const s1 = e.manual.sales[0]; assert.ok(s1.quote.req_t >= sched); assert.equal(s1.exec, "routed-quote"); assert.ok(Math.abs(s1.tok - e.fill.tok / 2) < 1e-6);
  assert.ok(Math.abs(s1.sol - (e.fill.tok / 2) * (40_000 / 1e9 / 100) * 0.99 + 0.0005) < 1e-9, "sold at the quoted price for that quantity, one transaction cost");
  assert.ok(w.sizes.some(([side, raw]) => side === "sell" && Math.abs(raw - (e.fill.tok / 2) * 1e6) < 2), "the provider was asked for exactly the half");
  await w.price(10); assert.ok(e.manual.lastX > 1.5, "what he still holds is valued from its own quote"); assert.ok(e.versions.every((v) => v.status === "open" || v.status === "scaling" || v.half), "the program's rows carry on");
  assert.equal(w.eng.manualSell(e.id, 1, w.t).ok, true); await w.price(0.8); await w.price(0.5); assert.ok(e.manual.closed); assert.equal(e.manual.tok, 0); assert.ok(e.manual.closed.ret > 0.8);
  const row = booksApi([e], { stop: 0.25, run: { books: w.eng.books }, sellable: true, now: w.t }).books["NEW-5M"][0]; assert.equal(row.sell, undefined); assert.equal(row.man.closed, true); assert.equal(row.man.sales.length, 2);
});

test("a restart loses nothing: the counters and the coins waiting for an age point come back from the file, an open new-coin buy goes back on the quote list and is still sold by its stop", async () => {
  const dir = mkdtempSync(join(tmpdir(), "older-nc-")), db = join(dir, "t.db"), file = join(dir, "newcoins.json");
  let st = new Store(db), w = world({ store: st, file }); w.add(A, T0, {}); w.add(B, T0 + 200, { mc: 30_000 });
  w.t = T0 + 220; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); const id = w.entries("NEW-5M")[0].id; w.nc.dirty = true; w.nc.save(); assert.ok(existsSync(file)); w.eng.flush(); st.heartbeat(w.t); st.db.close();
  st = new Store(db); const w2 = world({ store: st, file }); w2.coins = w.coins; w2.px = w.px; w2.list = []; st.restore(w2.eng); w2.t = w.t + 30; w2.eng.restartGap(st.lastAlive(), w2.t); w2.eng.feedUp(w2.t);
  assert.equal(w2.nc.stats.checks["NEW-5M"].bought, 1); assert.equal(w2.nc.stats.seen, 2); assert.ok(w2.nc.young.has(B), "B is still waiting for its 5 minutes"); assert.equal(w2.nc.young.get(A).done["NEW-5M"], 1);
  const e = w2.eng.entries.get(id); assert.ok(e && e.status === "filled"); assert.equal(w2.eng.coins.get(A).mode, "live"); assert.ok(!e.flags.some((f) => /conflict/.test(f)));
  assert.equal(w2.quoter.watch.size, 0); assert.equal(w2.nc.restore(), 1); assert.equal(w2.quoter.watch.get(A).decimals, 6);
  w2.setMc(A, 9000); await w2.price(10); await w2.price(1); assert.equal(e.versions.find((v) => v.stop === 0.25 && v.policy === "trail").status, "closed");
  w2.t = T0 + 200 + 302; await w2.pass(); assert.equal(w2.nc.stats.checks["NEW-5M"].bought, 2, "B is measured at its own 5 minutes after the restart and bought");
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM decisions WHERE family='NEW-5M'").get().n, 2); st.db.close();
});

test("the other books are untouched: with the owner's GMGN checks on, a new-coin buy asks nothing of the gate counters, and the new books buy nothing unless the run has them", async () => {
  const w = world(); w.eng.gates = S.GATES_11; w.eng.gateMode = "label"; w.eng.readGate = async () => { throw new Error("must not be asked"); };
  w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  assert.equal(w.entries("NEW-5M")[0].status, "filled"); assert.equal(w.eng.stats.gate, undefined, "no reading was asked through the other books' gate");
  const v = world(); v.eng.setBooks(S.booksOf("older-11")); v.add(A, T0, {}); v.t = T0 + 20; await v.pass(); v.t = T0 + 301; await v.pass();
  assert.equal(v.entries().length, 0); assert.match(v.nc.stats.checks["NEW-5M"].recent.at(-1).out, /makes no new buy in this run/); assert.equal(v.quoter.watch.size, 0);
});

test("15 and 20 minutes: a slow starter that is nothing at 5 and 10 minutes is measured again and bought when it passes; the combined view shows each coin's FIRST buy and which age made it — no extra trades", async () => {
  const w = world(); const run = { books: w.eng.books, gates: true, gate_mode: "label", newcoins: true };
  w.add(A, T0, { mc: 4000, holders: 30, vol: 3000 }); w.add(B, T0, { mc: 25_000, holders: 180, vol: 60_000 }); w.info.set(A, { total_fee: 6 }); w.info.set(B, { total_fee: 6 });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); w.t = T0 + 601; await w.pass(); await w.price(1.2);
  assert.deepEqual(w.entries().map((e) => e.mint.slice(0, 8) + ":" + e.families[0]).sort(), ["NewCoinB:NEW-10M", "NewCoinB:NEW-5M"], "A is under every line at 5 and 10 minutes; B is bought by both");
  // at 15 minutes A has run: over 200 holders, $100K traded, fees 6 SOL
  Object.assign(w.coins.get(A), { mc: 40_000, holders: 201, vol: 100_000 }); Object.assign(w.coins.get(B), { holders: 200, vol: 500_000 }); w.setMc(A, 40_000);
  w.t = T0 + 901; await w.pass(); await w.price(1.2);
  const K15 = w.nc.stats.checks["NEW-15M"]; assert.equal(K15.measured, 2); assert.equal(K15.bought, 1); assert.equal(K15.holders, 1, "200 holders is not over 200");
  const a15 = w.entries("NEW-15M")[0]; assert.equal(a15.mint, A); assert.equal(a15.status, "filled"); assert.equal(a15.cands[0].detail.rule.fees_min_sol, 5); assert.ok(a15.cands[0].detail.age_s >= 900);
  w.info.set(A, { total_fee: 4.9 }); w.t = T0 + 1201; await w.pass(); assert.equal(w.nc.stats.checks["NEW-20M"].measured, 2); assert.equal(w.entries("NEW-20M").length, 0, "fees 4.9 SOL: under 5");
  assert.ok(w.nc.young.has(A), "kept until its last age point has passed"); w.t = T0 + 1200 + S.NEW_CHECK_LATE_S + 10; await w.pass(); assert.ok(!w.nc.young.has(A));
  // the combined view: one row per coin — B's 5-minute buy (not its 10-minute one), A's 15-minute buy
  const j = booksApi([...w.eng.entries.values()], { stop: 0.25, run, sellable: true, now: w.t }); assert.ok(j.order.indexOf(S.NEW_ALL) === j.order.indexOf("NEW-20M") + 1); assert.match(j.rules[S.NEW_ALL], /FIRST buy/);
  const c = j.books[S.NEW_ALL]; assert.equal(c.length, 2); assert.deepEqual(c.map((r) => r.mint.slice(0, 8) + ":" + r.by_book).sort(), ["NewCoinA:NEW-15M", "NewCoinB:NEW-5M"]);
  const b5 = j.books["NEW-5M"][0], cb = c.find((r) => r.mint === B); assert.equal(cb.id, b5.id); assert.equal(cb.now_x, b5.now_x); assert.equal(cb.mc_buy, b5.mc_buy); assert.equal(j.books["NEW-10M"].length, 1, "the 10-minute book keeps its own buy");
  assert.equal(booksApi([...w.eng.entries.values()], { stop: 0.25, run: { books: w.eng.books } }).books[S.NEW_ALL], undefined, "only a run with the new-coin books has the view");
  // a first attempt that was cancelled does not hide a later filled buy
  const v = world(); v.add(C, T0, {}); v.info.set(C, { total_fee: 6 }); v.t = T0 + 20; await v.pass(); v.t = T0 + 301; await v.pass(); const c5 = v.entries("NEW-5M")[0]; v.t += 7; v.eng.tick(v.t); assert.equal(c5.status, "cancelled", "no quote within 5 s of the scheduled buy");
  v.t = T0 + 601; await v.pass(); await v.price(1.2); const c10 = v.entries("NEW-10M")[0]; assert.equal(c10.status, "filled"); const jc = booksApi([c5, c10], { stop: 0.25, run: { books: v.eng.books, newcoins: true } }); assert.equal(jc.books["NEW-5M"][0].status, "cancelled"); assert.equal(jc.books[S.NEW_ALL].length, 1); assert.equal(jc.books[S.NEW_ALL][0].by_book, "NEW-10M");
});

// ───────── owner 26 Nov 2026 04:49–05:27 UK: "when I paste the contract, we need to know immediately why the coin was rejected or not" ·
// "we need to be more accurate with pricing" — every check on record, the lookup, and how each sale was priced ─────────
const D = "NewCoinDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDpump", E5 = "NewCoinEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEpump";
test("EVERY check is written to the database with a status for every rule — also a coin under $10K and one the provider did not answer; fees and top 10 are 'not asked' unless GMGN was asked", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nc-")), st = new Store(join(dir, "t.db")), w = world({ store: st });
  w.add(A, T0, { mc: 3000, holders: 40, vol: 4000 });                       // under the market-cap line
  w.add(B, T0, { mc: 31_800, holders: 319, vol: 13_400, vol5: 9000 });      // the owner's example: fails volume only — fees never read
  w.add(C, T0, {});                                                          // passes everything → bought
  w.add(D, T0, { hidden: true });                                            // the provider returns no record of it
  w.add(E5, T0, { mc: 40_000, holders: 500, vol: 90_000 }); w.info.set(E5, new Error("HTTP 429")); // a candidate GMGN did not answer
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; assert.equal(await w.pass(), 4, "four of the five were measured");
  const of = (m) => st.checksOf(m), one = (m) => { const r = of(m); assert.equal(r.length, 1, m.slice(7, 8) + ": one row for its 5-minute check"); return r[0]; };
  const a = one(A); assert.equal(a.book, "NEW-5M"); assert.equal(a.mc, 3000); assert.deepEqual(a.st, { mc: "fail", holders: "fail", vol: "fail", top_pre: "pass", fees: "not asked", top10: "not asked" }); assert.match(a.out, /^not bought: market cap \$3K \(needs over \$10K\), holders 40 \(needs over 100\), volume \$4K \(needs \$30K\)$/); assert.equal(a.ok, undefined, "the true/false trio is not stored twice");
  const b = one(B); assert.deepEqual(b.st, { mc: "pass", holders: "pass", vol: "fail", top_pre: "pass", fees: "not asked", top10: "not asked" }); assert.equal(b.fees, undefined, "no fee figure exists: GMGN was never asked"); assert.equal(b.vol, 13_400); assert.equal(b.v1h, 13_400); assert.equal(b.v5m, 9000, "both volume windows, separately"); assert.equal(b.out, "not bought: volume $13K (needs $30K)");
  const c = one(C); assert.deepEqual(c.st, { mc: "pass", holders: "pass", vol: "pass", top_pre: "pass", fees: "pass", top10: "pass" }); assert.match(c.out, /^BOUGHT \(paper\), entry \d+$/); assert.equal(c.fees, 4); assert.equal(c.top10, 0.24); assert.ok(c.g.asked <= c.g.answered); assert.equal(c.g.holders, 210);
  const d = one(D); assert.equal(d.st.mc, "provider error"); assert.equal(d.st.fees, "not asked"); assert.match(d.out, /provider returned no record/); assert.equal(d.mc, undefined);
  const e = one(E5); assert.equal(e.st.vol, "pass"); assert.equal(e.st.fees, "provider error"); assert.equal(e.st.top10, "provider error"); assert.match(e.out, /no GMGN reading/);
  assert.equal(w.nc.status().kept, 5); assert.equal(w.nc.status().keep_error, null); assert.equal(st.disk().nc_checks, 5);
  // the card and the published file are as before: coins over the market-cap line only
  assert.deepEqual(w.nc.history.map((r) => r.mint).sort(), [B, C, E5].sort()); assert.equal(w.nc.history.find((r) => r.mint === B).ok.vol, false);
  // a coin that could not be measured in time is on record too
  w.add("NewCoinFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFpump", w.t, {}); const born = w.t; w.t += 20; await w.pass(); w.searchFail = true; w.t = born + 301; await w.pass(); w.t = born + 300 + S.NEW_CHECK_LATE_S + 5; w.searchFail = false; await w.pass();
  const late = st.checksOf("NewCoinFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFpump"); assert.equal(late.length, 1); assert.match(late[0].out, /^not measured: the coin could not be measured within 90 s/); assert.equal(late[0].st.vol, "provider error");
  st.db.close();
});

test("GMGN's own volume and trade counts are read from the same answer and recorded beside Jupiter's (no extra request, no rule reads them)", async () => {
  const g = parseInfo({ total_fee: 3, price: { price: "0.0000089", volume_1m: "28.3", volume_5m: "81.4", volume_1h: "5675.78", buy_volume_1h: "1947.1", sell_volume_1h: "3728.6", buys_1h: 212, sells_1h: 235, swaps_5m: 13, swaps_1h: 447 } });
  assert.equal(g.vol_5m, 81.4); assert.equal(g.vol_1h, 5675.78); assert.equal(g.buy_vol_1h, 1947.1); assert.equal(g.sell_vol_1h, 3728.6); assert.equal(g.buys_1h, 212); assert.equal(g.sells_1h, 235); assert.equal(g.swaps_1h, 447); assert.equal(g.price_usd, 0.0000089);
  assert.equal(parseInfo({ total_fee: 3 }).vol_1h, null, "an answer without the price block gives no figure, not zero");
  const dir = mkdtempSync(join(tmpdir(), "nc-")), st = new Store(join(dir, "t.db")), w = world({ store: st }); w.add(A, T0, {}); w.info.set(A, { price: { volume_5m: "41000", volume_1h: "58000", swaps_1h: 900 } });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; const q0 = w.reqs.gmgn; await w.pass(); assert.equal(w.reqs.gmgn - q0, 1, "one GMGN request, as before");
  const [r] = st.checksOf(A); assert.equal(r.vol, 60_000); assert.equal(r.g.vol_1h, 58_000); assert.equal(r.g.vol_5m, 41_000); assert.equal(r.g.swaps_1h, 900); st.db.close();
});

test("the coin lookup answers at once from the bot's own records: waiting → measured and not bought (with the reason) → bought; no provider is asked", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nc-")), st = new Store(join(dir, "t.db")), w = world({ store: st });
  const ask = (mint) => coinLookup({ mint, store: st, engine: w.eng, lookup: (m) => w.nc.lookup(m), run: { books: w.eng.books }, now: w.t });
  assert.equal(ask(A).verdict, "No record of this coin"); assert.deepEqual(ask(A).newcoins.checks, []);
  w.add(A, T0, { mc: 31_800, holders: 319, vol: 13_400 }); w.add(B, T0, {}); w.t = T0 + 20; await w.pass();
  let r = ask(A); assert.match(r.verdict, /^Seen, waiting for its first check \(NEW-5M in 280 s\)$/); assert.deepEqual(r.newcoins.waiting.next.map((x) => x.book), ["NEW-5M", "NEW-10M", "NEW-15M", "NEW-20M"]); assert.equal(r.newcoins.waiting.next[0].at, T0 + 300); assert.equal(r.created, T0);
  w.t = T0 + 301; const before = { ...w.reqs }; await w.pass(); const asked = { ...w.reqs };
  r = ask(A); assert.equal(r.verdict, "Seen and measured, NOT bought so far — 3 checks still to come"); assert.equal(r.newcoins.checks.length, 1); assert.equal(r.newcoins.checks[0].out, "not bought: volume $13K (needs $30K)"); assert.equal(r.newcoins.checks[0].st.fees, "not asked"); assert.equal(r.sym, A.slice(0, 4));
  assert.deepEqual(r.newcoins.rules[0], { book: "NEW-5M", at_s: 300, mc: 10_000, holders: 100, vol: 30_000, fees: 2, top10: [0.16, 0.3] });
  await w.price(1.2); r = ask(B); assert.equal(r.verdict, "BOUGHT (paper) by NEW-5M"); assert.equal(r.buys.length, 1); assert.equal(r.buys[0].status, "filled"); assert.equal(r.buys[0].rows.t25, "open"); assert.equal(r.buys[0].fees, 4); assert.equal(r.buys[0].top10, 0.24); assert.equal(r.buys[0].hidden, false);
  assert.deepEqual({ ...w.reqs, quote: 0 }, { ...asked, quote: 0 }, "a lookup asks no provider anything"); assert.ok(before.search < asked.search);
  // after every age point has passed the coin leaves the waiting list; its record stays
  w.t = T0 + 1200 + S.NEW_CHECK_LATE_S + 30; await w.pass(); await w.pass(); r = ask(A); assert.equal(r.newcoins.waiting, null); assert.equal(r.verdict, "Seen and measured, NOT bought"); assert.ok(r.newcoins.checks.length >= 1);
  // a check made before the database kept every check (the log file's rows) is still found
  w.nc.history.push({ book: "NEW-5M", t: T0 - 5000, mint: D, sym: "OLD", mc: 46_080, holders: 106, vol: 39_126, ok: { mc: true, holders: true, vol: true }, fees: 6.26, top10: 0.1848, out: "not bought: top 10 holders 18.5% (needs 16–30%)" });
  r = ask(D); assert.equal(r.verdict, "Seen and measured, NOT bought"); assert.equal(r.newcoins.checks[0].top10, 0.1848); assert.equal(r.sym, "OLD");
  // over the site: key-protected, read-only, a bad address is refused
  process.env.OLDER_SITE_KEY = "sekret"; const web = startWeb({ port: 0, store: st, engine: w.eng, status: () => ({}), run: () => ({ books: w.eng.books }), lookup: (m) => w.nc.lookup(m) }); delete process.env.OLDER_SITE_KEY; await new Promise((res) => web.server.once("listening", res)); const port = web.server.address().port;
  const get = async (path) => { const x = await fetch(`http://127.0.0.1:${port}${path}`); return { status: x.status, body: await x.text() }; };
  try { assert.equal((await get(`/api/coin?mint=${B}`)).status, 403); assert.equal((await get(`/api/coin?mint=not-an-address&k=sekret`)).status, 400);
    const ok = await get(`/api/coin?mint=${B}&k=sekret`); assert.equal(ok.status, 200); const j = JSON.parse(ok.body); assert.equal(j.ok, true); assert.equal(j.verdict, "BOUGHT (paper) by NEW-5M"); assert.equal(j.mint, B); assert.ok(!ok.body.includes("sekret")); } finally { web.server.close(); st.db.close(); }
});

test("how each sale was priced is on record: the stop's level, what the position was worth when the fall was noticed, the look before it, and what the sale fetched", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"), row = (stop) => e.versions.find((v) => v.stop === stop && v.policy === "trail"); assert.equal(saleRows(e).rows.length, 0, "nothing sold yet");
  w.setMc(A, 30_000); await w.price(10); const hiT = row(0.25).lastT, hiX = row(0.25).lastX; w.setMc(A, 12_000); await w.price(10); // −60% between two looks: every stop from 20% to 40% is passed at once
  for (const s of [0.2, 0.25, 0.3, 0.4]) assert.equal(row(s).status, "selling"); const v = row(0.25);
  assert.ok(Math.abs(v.trig.level - v.trig.peak * 0.75) < 1e-12); assert.equal(v.trig.seen, v.trigValue); assert.ok(v.trig.seen < v.trig.level * 0.6, "noticed far under the stop's level"); assert.deepEqual(v.trig.before, { t: hiT, x: hiX }, "the look before: at the high, 10 s earlier");
  await w.price(1); const S25 = saleRows(e).rows.find((r) => r.k === "t25"), S40 = saleRows(e).rows.find((r) => r.k === "t40");
  assert.ok(Math.abs(S25.level - S25.peak * 0.75) < 2e-4); assert.ok(Math.abs(S25.past - (1 - S25.seen / S25.level)) < 2e-3); assert.ok(S25.past > 0.4 && S25.past < 0.5, "about 47% under the 25% stop's level when noticed"); assert.ok(S40.past > 0.3 && S40.past < 0.36);
  assert.ok(Math.abs(S25.slip) < 0.005, "the sale itself was priced a second later at the same price: the loss is in the noticing, not in the sale"); assert.ok(S25.delay_s >= 0 && S25.delay_s < 2); assert.ok(S25.sold_t >= S25.trig_t + 0.7 - 0.05); assert.deepEqual(S25.before, [+hiT.toFixed(1), +hiX.toFixed(4)]);
  assert.equal(saleRows({ exec: "reconstructed-pool-state", fill: {}, versions: [] }), undefined, "pool-priced buys have no such record (they are priced trade by trade)");
  // a pool-priced position never gets the field
  const en = mkEngine({ tokens: null }); en.feedUp(T0); assert.ok([...en.entries.values()].every((x) => x.versions.every((y) => y.trig === undefined)));
});

test("one quote per position per look: the half is asked for only while a half-sale is waiting — and that half-sale is still priced by quotes asked for after its time", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"); assert.equal(e.status, "filled"); const half = e.fill.tok / 2, isHalf = ([side, raw]) => side === "sell" && Math.abs(raw - half * 1e6) < 2, isFull = ([side, raw]) => side === "sell" && Math.abs(raw - e.fill.tok * 1e6) < 2;
  assert.deepEqual(w.eng.quoteNeeds(w.t)[0].sells, [e.fill.tok], "one size: everything it holds");
  w.sizes.length = 0; const q0 = w.reqs.quote; for (let i = 0; i < 6; i++) await w.price(10); // a minute of routine looks
  assert.equal(w.reqs.quote - q0, 6, "six looks, six requests (it was twelve)"); assert.ok(w.sizes.every(isFull)); assert.ok(!w.sizes.some(isHalf));
  w.setMc(A, 44_000); await w.price(10); const sc = e.versions.filter((v) => v.policy === "scale"); assert.ok(sc.every((v) => v.status === "scaling"), "2× reached: every half-at-2× row has a half-sale waiting");
  assert.deepEqual(w.eng.quoteNeeds(w.t)[0].sells.slice().sort((a, b) => a - b), [half, e.fill.tok], "now the half is needed too");
  w.sizes.length = 0; await w.price(1); assert.ok(w.sizes.some(isHalf)); assert.ok(sc.every((v) => v.status === "open" && v.half), "the half is banked");
  const h = sc[0].half; assert.ok(h.quotes.half.req_t >= sc[0].trigT + 0.7 - 1e-9, "priced by a quote asked for after the order's time"); assert.ok(h.quote_spread_s <= S.SCALE_QUOTE_MAX_SPREAD_S); assert.ok(Math.abs(h.sol - ((44 / 20) * 0.99 * 0.99 * 0.1 - S.TX_COST_SOL)) < 0.002, "half the tokens at the 2.2× price, after fees and one transaction cost");
  // afterwards the halved rows hold the half, the pure-trail rows the whole: two sizes are really held, two are asked
  w.sizes.length = 0; await w.price(10); assert.ok(w.sizes.some(isHalf) && w.sizes.some(isFull)); assert.equal(w.sizes.length, 2);
});

// ───────── owner 26 Nov 2026 06:01–06:07 UK: "can we have a time scale on this… the highest we could have got within the last hour or
// 2 hours… to know if we sold too early" · "we don't need 24 hours… 2 hours is fine" ─────────
import { afterSale, trackHigh, lastSaleT } from "../src/book.mjs";
test("after the sale: the buy is looked at once a minute for two hours after its last sale, and the page gets the highest in the 15 minutes, the hour and the two hours after EACH row's own sale", async () => {
  assert.equal(S.NEW_RUNNER_S, 60); assert.equal(S.NEW_CONFIRM_MAX, 0, "no confirming quote: a rough price is enough (owner 06:20 UK)"); assert.equal(S.NEW_FOLLOW_S, 7200); assert.equal(S.NEW_TRACK_S, 30); assert.deepEqual(S.AFTER_WINDOWS, [["m15", 900], ["h1", 3600], ["h2", 7200]]);
  const w = world(); w.nc.confirmMax = 2; /* the confirming quote is switched off in the spec; this test runs it switched on, the last lines check it off */ w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"), row = (stop) => e.versions.find((v) => v.stop === stop && v.policy === "trail"); assert.equal(e.track, undefined, "nothing is tracked before the first sale");
  w.setMc(A, 14_500); await w.price(10); await w.price(1); assert.equal(row(0.25).status, "closed"); assert.equal(row(0.3).status, "open"); const sale25 = row(0.25).exit.t; assert.equal(lastSaleT(e), sale25); // −27.5%: the 20% and 25% rows are out, the others still hold
  // while a row is still open the looks are real quotes (every 10 s): they go on the track from the first sale on
  w.setMc(A, 17_000); await w.price(10); w.setMc(A, 26_000); await w.price(10); await w.price(10); assert.ok(e.track.length >= 1); assert.ok(e.track.every((p) => p[2] === 0), "real quotes, not estimates");
  let a = afterSale(e, row(0.25), w.t); assert.ok(Math.abs(a.m15.x - (26 / 20) * 0.99 * 0.99 * 0.2 / 0.2005) < 0.02, "it went back to 1.27x within a minute of the sale"); assert.equal(a.m15.est, false); assert.equal(a.m15.full, false, "the window is still running"); assert.ok(a.m15.s < 60);
  assert.equal(afterSale(e, row(0.3), w.t), null, "a row that has not sold has no 'after the sale'");
  // everything is sold: now it is followed by the price alone (an estimate), every 30 s
  w.setMc(A, 3000); await w.price(10); await w.price(1); await w.price(1); assert.ok(e.versions.every((v) => v.status === "closed")); const last = lastSaleT(e), q0 = w.reqs.quote, s0 = w.reqs.search;
  w.t = last + 600; w.setMc(A, 24_000); assert.equal(await w.nc.runnerPass(), 1); w.t = last + 3000; w.setMc(A, 31_000); await w.nc.runnerPass(); w.t = last + 5000; w.setMc(A, 9000); await w.nc.runnerPass();
  assert.equal(w.reqs.search - s0, 3, "one token-data request per look"); assert.equal(w.reqs.quote - q0, 1, "one confirming quote: the estimate of 1.55x was a new high over 1.5x");
  a = afterSale(e, row(0.6), w.t); assert.equal(a.m15.est, true); assert.ok(a.m15.x > 1.15 && a.m15.x < 1.25, "24K after ten minutes: about 1.2x"); assert.ok(a.h1.x > 1.5 && a.h1.x < 1.6, "31K after fifty minutes"); assert.equal(a.h1.est, false, "that high was confirmed by a real quote"); assert.equal(a.h1.s > 2900 && a.h1.s < 3100, true); assert.equal(a.h2.x, a.h1.x);
  assert.ok(e.runner.maxQ > 1.5 && e.runner.maxQ < e.runner.maxX, "the confirmed figure is under the estimate: fees are in it"); assert.equal(e.runner.confirms, 1); assert.ok(e.runner.lastConfirm.est_x > e.runner.lastConfirm.x);
  // the 25% row sold earlier: its own windows start at ITS sale
  const b = afterSale(e, row(0.25), w.t); assert.equal(b.m15.full, true); assert.ok(b.m15.x >= 1.2 && b.h1.x > 1.5);
  // the page's row carries it
  const pr = booksApi([e], { stop: 0.6, run: { books: w.eng.books }, now: w.t }).books["NEW-5M"][0]; assert.deepEqual(pr.after, a); assert.equal(pr.follow, "on"); assert.equal(pr.hi_q, e.runner.maxQ);
  assert.deepEqual(saleRows(e, w.t).rows.find((r) => r.k === "t60").after, a); assert.equal(saleRows(e).track_n, e.track.length);
  // two hours after the last sale, worth less than it cost: finished — no more looks, out of memory, off the quote list
  w.t = last + S.NEW_FOLLOW_S - 20; await w.nc.runnerPass(); assert.ok(w.eng.entries.has(e.id)); const s1 = w.reqs.search;
  w.t = last + S.NEW_FOLLOW_S + 5; assert.equal(await w.nc.runnerPass(), 0); assert.equal(w.reqs.search - s1, 0, "nothing is asked for a finished buy"); assert.equal(e.runner.long, false); assert.equal(e.runner.horizonDone, true); assert.match(e.runner.followed.why, /two hours after the last sale/);
  assert.equal(w.eng.entries.has(e.id), false); assert.equal(w.quoter.watch.has(A), false); assert.equal(w.nc.runner.finished, 1);
  assert.equal(afterSale(e, row(0.6), w.t).h2.full, true, "the two-hour window was watched to its end");
  { const w2 = world(); assert.equal(w2.nc.confirmMax, 0); w2.add(B, T0, {}); w2.t = T0 + 20; await w2.pass(); w2.t = T0 + 301; await w2.pass(); await w2.price(1.2); const [e2] = w2.entries("NEW-5M"); w2.setMc(B, 3000); await w2.price(10); await w2.price(1); await w2.price(1); const q0 = w2.reqs.quote; w2.t += 600; w2.setMc(B, 60_000); assert.equal(await w2.nc.runnerPass(), 1); assert.equal(w2.reqs.quote - q0, 0, "as deployed: a new high is NOT confirmed by a quote — one token-data request a look and nothing else"); assert.equal(e2.runner.maxQ, undefined); assert.equal(afterSale(e2, e2.versions[0], w2.t).m15.est, true); } assert.equal(booksApi([e], { stop: 0.6, run: { books: w.eng.books }, now: w.t }).books["NEW-5M"][0].follow, "done");
});

test("a coin still worth more than it cost two hours after the last sale — the runner — is looked at every 5 minutes up to six hours; then it is finished too", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); const [e] = w.entries("NEW-5M");
  w.setMc(A, 3000); await w.price(10); await w.price(1); await w.price(1); assert.ok(e.versions.every((v) => v.status === "closed")); const last = lastSaleT(e);
  w.setMc(A, 80_000); w.t = last + S.NEW_FOLLOW_S - 10; await w.nc.runnerPass(); assert.ok(e.runner.lastX > 3);
  w.t = last + S.NEW_FOLLOW_S + 20; const s0 = w.reqs.search; assert.equal(await w.nc.runnerPass(), 0, "looked at half a minute ago: not again yet"); assert.equal(e.runner.long, true); assert.equal(w.reqs.search - s0, 0); assert.equal(e.runner.horizonDone, false);
  w.t = last + S.NEW_FOLLOW_S + 150; assert.equal(await w.nc.runnerPass(), 0); w.t = last + S.NEW_FOLLOW_S + 300; w.setMc(A, 200_000); assert.equal(await w.nc.runnerPass(), 1, "five minutes after the last look"); assert.ok(e.runner.maxX > 9);
  w.t = last + S.NEW_FOLLOW_LONG_S + 5; assert.equal(await w.nc.runnerPass(), 0); assert.equal(e.runner.horizonDone, true); assert.match(e.runner.followed.why, /six hours/); assert.equal(w.eng.entries.has(e.id), false);
  // the track itself: the highest per half-minute, real over estimated never mixed up, never out of order
  const x = { fill: { t: 1000 }, runner: {} }; assert.equal(trackHigh(x, 1010, 1.2, true), true); assert.equal(trackHigh(x, 1020, 1.1, false), false, "lower in the same half-minute: kept as it was"); assert.equal(trackHigh(x, 1025, 1.4, false), true); assert.deepEqual(x.track, [[10, 1.4, 0]]);
  assert.equal(trackHigh(x, 1075, 0.9, true), true); assert.equal(trackHigh(x, 1005, 5, true), false, "an older look never rewrites the track"); assert.deepEqual(x.track, [[10, 1.4, 0], [75, 0.9, 1]]); assert.equal(trackHigh(x, 1080, NaN, true), false);
  // a sale always starts a new point: what was seen before it is never counted as after it
  x.versions = [{ exit: { t: 1082 } }]; assert.equal(trackHigh(x, 1085, 0.5, true), true); assert.deepEqual(x.track[2], [85, 0.5, 1]); assert.equal(afterSale(x, x.versions[0]).m15.x, 0.5, "the 0.9 seen seven seconds before the sale is not in it"); assert.equal(afterSale(x, x.versions[0]).m15.s, 3);
});

test("the 50% stop (owner 26 Nov 2026 07:01 UK): a new buy carries it between the 40% and the 60% row; a buy made before it keeps its five stops and the page counts the 50% view from its own start", async () => {
  assert.deepEqual(S.STOPS, [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.65, 0.7]);
  const dir = mkdtempSync(join(tmpdir(), "nc-")), st = new Store(join(dir, "t.db")), w = world({ store: st });
  w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); const [old] = w.entries("NEW-5M");
  old.versions = old.versions.filter((v) => v.stop !== 0.5); st.saveEntry(old); // a buy from before the 50% stop existed: five stops, as it was opened
  w.add(B, w.t, {}); const born = w.t; w.t += 20; await w.pass(); w.t = born + 301; await w.pass(); await w.price(1.2); const fresh = w.entries("NEW-5M").find((e) => e.mint === B);
  assert.deepEqual(fresh.versions.filter((v) => v.policy === "trail").map((v) => v.stop), [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.65, 0.7]); assert.equal(old.versions.length, S.POLICIES.length * (S.STOPS.length - 1));
  const row = (e, s) => e.versions.find((v) => v.stop === s && v.policy === "trail");
  w.setMc(B, 9200); await w.price(10); await w.price(1); // −54% from the buy: through the 50% stop, inside the 60% one
  assert.equal(row(fresh, 0.4).status, "closed"); assert.equal(row(fresh, 0.5).status, "closed"); assert.equal(row(fresh, 0.5).reason, "trail"); assert.equal(row(fresh, 0.6).status, "open"); assert.ok(row(fresh, 0.5).exit.ret < -0.5 && row(fresh, 0.5).exit.ret > -0.6);
  const at = (s) => booksApi([old, fresh], { stop: s, run: { books: w.eng.books } }).books["NEW-5M"].map((r) => r.mint);
  assert.deepEqual(at(0.5), [B], "the older buy has no 50% row: it is simply not in that view"); assert.deepEqual(at(0.6).sort(), [A, B].sort()); assert.deepEqual(at(0.4).sort(), [A, B].sort());
  const since = st.since(w.t); assert.equal(since.stops[0.5], fresh.decisionT, "the 50% view counts from the first buy that has it"); assert.ok(since.stops[0.5] > old.decisionT, "later than the buy that never had it");
  assert.equal(saleRows(fresh).rows.find((r) => r.k === "t50").k, "t50"); st.db.close();
});

// ───────── owner 26 Nov 2026 07:18–07:20 UK: "any coins that hit 100k and that we missed… and to see why we missed them… to make
// sure we're not missing any runners on our filters" — the runners list ─────────
import { whyOf, WHYS } from "../src/newcoin.mjs";
test("the runners list: a measured coin that reaches $100K on the pool feed is written down once, with what every check said; bought and missed are told apart; each rule shows the checks it rejected AND how many of those coins got there", async () => {
  assert.equal(S.RUN_LINE_USD, 100_000); assert.equal(S.RUN_WINDOW_S, 6 * 3600);
  // one word per check: the first rule it failed, in the order the rules are judged
  const st = (o) => ({ st: { mc: "pass", holders: "pass", vol: "pass", top_pre: "pass", fees: "not asked", top10: "not asked", ...o } });
  assert.equal(whyOf({ ...st({ mc: "fail", holders: "fail" }) }), "market cap"); assert.equal(whyOf(st({ holders: "fail", vol: "fail" })), "holders"); assert.equal(whyOf(st({ vol: "fail" })), "volume"); assert.equal(whyOf(st({ top_pre: "fail" })), "top holders (Jupiter)");
  assert.equal(whyOf(st({ fees: "provider error", top10: "provider error" })), "no GMGN answer"); assert.equal(whyOf(st({ fees: "fail", top10: "fail" })), "fees"); assert.equal(whyOf(st({ fees: "pass", top10: "fail" })), "top 10 (GMGN)"); assert.equal(whyOf(st({ mc: "provider error" })), "not measured");
  assert.equal(whyOf({ ...st({ fees: "pass", top10: "pass" }), out: "BOUGHT (paper), entry 4" }), "bought"); assert.equal(whyOf({ out: "not bought: volume $13K" }), "other", "a check from before the statuses were kept is not guessed at"); assert.ok(WHYS.includes("volume"));

  const dir = mkdtempSync(join(tmpdir(), "nc-")), st0 = new Store(join(dir, "t.db")), w = world({ store: st0 }); w.eng.onLine = (m, mc, t, under) => w.nc.runnerHit(m, mc, t, under);
  w.add(A, T0, { mc: 31_800, holders: 319, vol: 13_400 });   // fails volume at 5 minutes: the coin the owner asked about
  w.add(B, T0, {});                                           // passes everything: bought
  w.add(C, T0, { mc: 12_000, holders: 40, vol: 50_000 });     // fails holders — and never runs
  w.add(D, T0, { mc: 4000, holders: 20, vol: 3000 });         // under the market-cap line — and never runs
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const K = w.nc.stats.checks["NEW-5M"]; assert.deepEqual(K.why, { volume: 1, bought: 1, holders: 1, "market cap": 1 }, "every check counted once, under the first rule it failed"); assert.equal(w.nc.stats.why_since, T0 + 301);
  // the pool feed: A climbs to $100K twenty minutes after it was created; B gets there too; E was never measured by the new-coin books
  const E9 = "OlderCoin11111111111111111111111111111111pump", told = []; const real = w.eng.onLine; w.eng.onLine = (...a) => { told.push(a); return real(...a); };
  const P = (mint) => ({ mint, pool: "Pool" + mint.slice(7, 8) });
  swap(w.eng, T0 + 900, 60_000, P(A)); swap(w.eng, T0 + 1000, 99_000, P(A)); assert.equal(told.length, 0, "under the line: nothing");
  swap(w.eng, T0 + 1200, 101_000, P(A)); assert.equal(told.length, 1); assert.equal(told[0][0], A); assert.equal(told[0][3], true, "the bot saw it under the line first: the moment is known");
  swap(w.eng, T0 + 1210, 104_000, P(A)); assert.equal(told.length, 1, "not told again for a few per cent more"); swap(w.eng, T0 + 1300, 180_000, P(A)); assert.equal(told.length, 2, "told again at a new high a step above"); swap(w.eng, T0 + 1310, 120_000, P(A)); assert.equal(told.length, 2);
  swap(w.eng, T0 + 2000, 150_000, P(B)); assert.equal(told.at(-1)[3], false, "first seen already above the line"); swap(w.eng, T0 + 2100, 400_000, P(E9)); assert.equal(w.nc.hits.get(E9), null, "never measured by the new-coin books: not on the list");
  const q0 = st0.checksOf.bind(st0); let looked = 0; st0.checksOf = (m) => { looked++; return q0(m); }; swap(w.eng, T0 + 2200, 900_000, P(E9)); assert.equal(looked, 0, "and it is not looked up again");
  // 27 Nov 2026: the runners list reads each coin's checks and nothing else — the "kept since" figure of the coin lookup scans the whole checks table
  // (measured: about 70 ms a time on the server, once per listed coin = the 4.3-second hold of every status dump), and the store keeps it once found
  let scans = 0; const cs0 = st0.checksSince.bind(st0); st0.checksSince = () => { scans++; return cs0(); };
  w.t = T0 + 2300; const v = w.nc.runnersView(); assert.equal(scans, 0, "no whole-table read while the list is built");
  { const lk = w.nc.lookup(A); assert.ok(lk.kept_since != null && lk.checks.length > 0); assert.equal(scans, 1, "the coin lookup still reports it");
    let prepared = 0; const p0 = st0.db.prepare.bind(st0.db); st0.db.prepare = (q) => { if (/MIN\(t\)/.test(q)) prepared++; return p0(q); }; assert.equal(st0.checksSince(), lk.kept_since); assert.equal(prepared, 0, "found once per process, then kept"); st0.db.prepare = p0; }
  assert.equal(v.reached, 2); assert.equal(v.missed, 1); assert.equal(v.bought, 1); assert.equal(v.later, 0); assert.equal(v.unknown_time, 1); assert.equal(v.line, 100_000);
  const a = v.list.find((r) => r.mint === A), b = v.list.find((r) => r.mint === B);
  assert.equal(a.t, T0 + 1200); assert.equal(a.age_s, 1200, "twenty minutes old when it got there"); assert.equal(a.created, T0); assert.ok(Math.abs(a.peak - 180_000) < 2000, "its highest is kept up to date"); assert.deepEqual(a.bought, []); assert.equal(a.checks[0].why, "volume"); assert.equal(a.checks[0].out, "not bought: volume $13K (needs $30K)"); assert.equal(a.checks[0].counted, true);
  assert.equal(b.bought.length, 1); assert.equal(b.bought[0].book, "NEW-5M"); assert.equal(b.unseen_before, true); assert.equal(b.checks[0].why, "bought"); assert.equal(v.picked, 0); assert.deepEqual(a.other, []); assert.deepEqual(b.other, []);
  // 28 Nov 2026 (owner: Robinhood "says missed, but it was still picked up by my other books"): a coin the looks did not buy but another book did is
  // "picked up", with the books named; a buy he sold by hand carries his result. Missed = no book at all.
  { const e0 = st0.entriesOf.bind(st0); st0.entriesOf = (m) => m === A ? [...e0(m), { id: 901, pop: "pumpswap-canonical", status: "filled", families: ["HIT50-NOW"], decisionT: T0 + 1100, signalMc: 50_020.4, runner: { maxX: 2.104 }, manual: { closed: { t: T0 + 1250, sol: 0.3, ret: 0.4213 } } }, { id: 902, pop: "pumpswap-canonical", status: "filled", families: ["FAST-1M", "FAST-3M"], decisionT: T0 + 1150, signalMc: 70_000, runner: {} }, { id: 903, pop: "pumpswap-canonical", status: "cancelled", families: ["HIT100-NOW"], decisionT: T0 + 1200, signalMc: 101_000 }] : e0(m);
    const vp = w.nc.runnersView(), ap = vp.list.find((r) => r.mint === A); st0.entriesOf = e0; assert.equal(vp.reached, 2); assert.equal(vp.bought, 1); assert.equal(vp.picked, 1); assert.equal(vp.missed, 0);
    assert.deepEqual(ap.bought, []); assert.deepEqual(ap.other, [{ id: 901, book: "HIT50-NOW", t: T0 + 1100, mc: 50_020, max: 2.1, sold: 0.4213 }, { id: 902, book: "FAST-1M+FAST-3M", t: T0 + 1150, mc: 70_000, max: null, sold: undefined }]); }
  // BOTH SIDES: of the checks that ended at each rule, how many of those coins reached the line
  const T5 = v.tally["NEW-5M"]; assert.deepEqual(T5.volume, { checks: 1, reached: 1 }); assert.deepEqual(T5.holders, { checks: 1, reached: 0 }, "the holders rule rejected a coin that never ran"); assert.deepEqual(T5["market cap"], { checks: 1, reached: 0 }); assert.deepEqual(T5.bought, { checks: 1, reached: 1 }); assert.deepEqual(T5.fees, { checks: 0, reached: 0 });
  // a coin that takes longer than the window is counted apart, not listed
  swap(w.eng, T0 + 900, 20_000, P(C)); swap(w.eng, T0 + 7 * 3600, 130_000, P(C)); w.t = T0 + 7 * 3600 + 10; const v2 = w.nc.runnersView(); assert.equal(v2.reached, 2); assert.equal(v2.later, 1); assert.ok(!v2.list.some((r) => r.mint === C)); assert.deepEqual(v2.tally["NEW-5M"].holders, { checks: 1, reached: 0 }, "seven hours is outside the six-hour window");
  // written to the database: a restart loses nothing and does not count a coin twice
  assert.equal(st0.runners().length, 3); assert.equal(st0.disk().nc_runners, 3); const w3 = world({ store: st0 }); w3.t = w.t; assert.equal(w3.nc.runnerHit(A, 250_000, w.t + 50, false).t, T0 + 1200, "the same record, its first time kept"); assert.equal(w3.nc.runnersView().reached, 2); assert.ok(st0.runners().find((r) => r.mint === A).peak === 250_000);
  // over the site: key-protected
  process.env.OLDER_SITE_KEY = "sekret"; const web = startWeb({ port: 0, store: st0, engine: w.eng, status: () => ({}), run: () => ({ books: w.eng.books }), runners: () => w.nc.runnersView() }); delete process.env.OLDER_SITE_KEY; await new Promise((res) => web.server.once("listening", res)); const port = web.server.address().port;
  try { assert.equal((await fetch(`http://127.0.0.1:${port}/api/runners`)).status, 403); const j = await (await fetch(`http://127.0.0.1:${port}/api/runners?k=sekret`)).json(); assert.equal(j.on, true); assert.equal(j.reached, 2); assert.equal(j.list.length, 2); } finally { web.server.close(); st0.db.close(); }
});

test("after the sale on EVERY book (owner 26 Nov 2026 07:34 UK): a pool-priced buy is followed on the pool's own prices — exact, never an estimate — from its first sale to two hours after its latest one", async () => {
  const { newEntry, advance, observe } = await import("../src/book.mjs");
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "PoolCoin", pool: "P", ag: "A1", t: 0, families: ["VOL300K"], features: {}, mc: 1e5, px: 1 }); advance(e, 1.5, st(100, 0), yes); assert.equal(e.status, "filled");
  const T = (s) => e.versions.find((v) => v.policy === "trail" && v.stop === s);
  observe(e, st(110, 20), 20); assert.equal(e.track, undefined, "nothing is tracked while every row is still held");
  observe(e, st(80, 50), 50); advance(e, 51, st(80, 50), yes); assert.equal(T(0.25).status, "closed"); assert.equal(T(0.3).status, "open"); const sale = T(0.25).exit.t; // −27% from the high: the 20% and 25% rows are out
  observe(e, st(95, 100), 100); observe(e, st(140, 400), 400); observe(e, st(140, 410), 410); observe(e, st(60, 2000), 2000);
  assert.ok(e.track.length >= 3); assert.ok(e.track.every((p) => p[2] === 0), "pool prices: nothing is estimated");
  let a = afterSale(e, T(0.25), sale + 1000); assert.ok(a.m15.x > 1.3 && a.m15.x < 1.45, "worth about 1.4x the buy six minutes after the sale"); assert.equal(a.m15.est, false); assert.ok(a.m15.s > 330 && a.m15.s < 360); assert.equal(a.m15.full, true, "fifteen minutes have passed"); assert.equal(a.h1.full, false);
  // a pool is only seen when it trades: with no trade for the rest of the hour the window still ends — by the clock
  a = afterSale(e, T(0.25), sale + 3700); assert.equal(a.h1.full, true); assert.equal(a.h1.x, a.m15.x); assert.equal(a.h2.full, false);
  // two hours after the latest sale nothing more is added (the rows still held are valued as always)
  const n = e.track.length; observe(e, st(500, sale + S.NEW_FOLLOW_S + 60), sale + S.NEW_FOLLOW_S + 60); assert.equal(e.track.length, n); assert.ok(e.runner.maxX > 4, "the 24-hour high is still kept as before");
  // the page: the column is there for a pool book, with the exact figures
  const row = booksApi([e], { stop: 0.25, now: sale + 3700 }).books["VOL300K"][0]; assert.deepEqual(row.after, a); assert.equal(row.follow, "on"); assert.equal(row.live_px, true); assert.equal(booksApi([e], { stop: 0.25, now: sale + 8000 }).books["VOL300K"][0].follow, "done");
  assert.equal(booksApi([e], { stop: 0.4, now: sale + 3700 }).books["VOL300K"][0].after, undefined, "a row still held has no 'after the sale'");
  assert.equal(saleRows(e), undefined, "the sale-pricing record stays a quote-priced matter");
});

test("the quote budget: with a few positions every one is looked at every 10 s; with many open at once the ones older than 5 minutes are looked at less often, the young ones keep their pace, and a sale is still priced at once", async () => {
  assert.equal(S.QUOTE_BUDGET_PER_MIN, 36); assert.equal(S.QUOTE_YOUNG_S, 300);
  const w = world(), M = (i) => "BudgetCoin" + String(i).padStart(2, "1") + "1111111111111111111111111111pump".slice(0, 28) + "pump";
  for (let i = 1; i <= 9; i++) w.add(M(i), T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  assert.equal(w.entries("NEW-5M").filter((e) => e.status === "filled").length, 9, "nine positions open");
  // young (bought seconds ago): every one keeps the 10-second pace — 9 quotes a look
  let q0 = w.reqs.quote; for (let i = 0; i < 3; i++) await w.price(10); assert.equal(w.reqs.quote - q0, 27); assert.equal(w.quoter.stats.quoteOldEvery, 10); assert.equal(w.quoter.stats.quoteYoung, 9);
  // six minutes later they are old: nine sizes at 10 s would be 54 requests a minute — over the budget of 36 → every 15 s
  w.t += 360; q0 = w.reqs.quote; const t0 = w.t; while (w.t - t0 < 120) await w.price(5); const perMin = (w.reqs.quote - q0) / ((w.t - t0) / 60);
  assert.equal(w.quoter.stats.quoteOldEvery, 15); assert.ok(perMin <= 37 && perMin >= 30, "about 36 a minute, not 54: " + perMin.toFixed(1)); assert.equal(w.quoter.stats.quoteSizes, 9);
  // a new buy among them is young: it is looked at every 10 s while the old ones give way a little more
  w.add(C, w.t, {}); const born = w.t; w.t += 20; await w.pass(); w.t = born + 301; await w.pass(); await w.price(1.2); const fresh = w.entries("NEW-5M").find((e) => e.mint === C); assert.equal(fresh.status, "filled");
  const seen = []; const real = w.jup.quote; w.jup.quote = async (m, side, raw, o) => { if (m === C) seen.push(w.t); return real(m, side, raw, o); };
  const t1 = w.t; while (w.t - t1 < 60) await w.price(5); assert.ok(seen.length >= 5, "the young position was looked at about every 10 s: " + seen.length); assert.ok(w.quoter.stats.quoteOldEvery > 15 && w.quoter.stats.quoteOldEvery <= 19); assert.equal(w.quoter.stats.quoteYoung, 1);
  // a stop that triggers is priced at once whatever the budget says
  w.jup.quote = real; w.setMc(M(1), 9000); const e1 = w.entries("NEW-5M").find((e) => e.mint === M(1)); let guard = 0; while (e1.versions.find((v) => v.stop === 0.25 && v.policy === "trail").status === "open" && guard++ < 10) await w.price(5);
  const v = e1.versions.find((x) => x.stop === 0.25 && x.policy === "trail"); assert.equal(v.status, "selling"); await w.price(1); assert.equal(v.status, "closed"); assert.ok(v.exit.delay_s < 5, "sold on the next pass, ahead of every routine look (in the program the urgent lane runs four times a second): " + v.exit.delay_s);
  // few positions: nothing changes
  const w2 = world(); w2.add(A, T0, {}); w2.add(B, T0, {}); w2.t = T0 + 20; await w2.pass(); w2.t = T0 + 301; await w2.pass(); await w2.price(1.2); w2.t += 400; const q2 = w2.reqs.quote; for (let i = 0; i < 6; i++) await w2.price(10); assert.equal(w2.reqs.quote - q2, 12, "two positions, six looks each"); assert.equal(w2.quoter.stats.quoteOldEvery, 10);
});

test("the 65% and 70% stops (owner 26 Nov 2026 11:18 UK): a 62% fall from the high — the fall that sold Elonmas on the 60% stop — leaves both holding; 67% sells the 65% row; 72% sells the 70% row", async () => {
  const { newEntry, advance, observe } = await import("../src/book.mjs");
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 0, families: ["VOL300K"], features: {}, mc: 1e5, px: 1 }); advance(e, 1.5, st(100, 0), yes);
  const T = (s) => e.versions.find((v) => v.policy === "trail" && v.stop === s); assert.ok(T(0.65) && T(0.7)); assert.equal(e.versions.length, S.POLICIES.length * S.STOPS.length);
  observe(e, st(500, 20), 20);                                              // the high: five times the buy
  observe(e, st(190, 50), 50); advance(e, 51, st(190, 50), yes);          // −62% from the high
  assert.equal(T(0.6).status, "closed"); assert.equal(T(0.65).status, "open"); assert.equal(T(0.7).status, "open"); assert.ok(T(0.6).exit.ret > 0.7, "sold while still well above the buy price: a trailing stop follows the high");
  observe(e, st(165, 60), 60); advance(e, 61, st(165, 60), yes);          // −67%
  assert.equal(T(0.65).status, "closed"); assert.equal(T(0.7).status, "open");
  observe(e, st(900, 70), 70); observe(e, st(250, 80), 80); advance(e, 81, st(250, 80), yes); // a new high at nine times, then −72%
  assert.equal(T(0.7).status, "closed"); assert.ok(T(0.7).exit.ret > T(0.65).exit.ret, "here the widest stop rode the second leg");
});

test("a paid Jupiter key (owner 26 Nov 2026 11:40 UK, Developer plan): a position bought in the last 5 minutes is looked at every 3 s, the older ones share the rest of a bigger budget and never fall behind the free pace while they fit, several positions are asked about at once — and on the free key nothing changes", async () => {
  assert.deepEqual(S.quotePlan(1), { young: 10, budget: 36, par: 1 }); assert.deepEqual(S.quotePlan(0.5), { young: 10, budget: 36, par: 1 }); assert.deepEqual(S.quotePlan(8), { young: 3, budget: 384, par: 8 }); assert.deepEqual(S.quotePlan(10, 2), { young: 2, budget: 480, par: 8 }, "never slower for the young than the others");
  const w = world({ quoter: { quoteYoung: 3, quoteBudget: 384, quotePar: 8 } }), M = (i) => "PaidCoin" + String(i).padStart(2, "1") + "111111111111111111111111111111pump";
  for (let i = 1; i <= 6; i++) w.add(M(i), T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); assert.equal(w.entries("NEW-5M").filter((e) => e.status === "filled").length, 6);
  // several at once: the six quotes of one look are all asked for before the first answer is used
  let flying = 0, most = 0; const real = w.jup.quote; w.jup.quote = async (m, side, raw, o) => { flying++; most = Math.max(most, flying); await null; await null; const r = await real(m, side, raw, o); flying--; return r; };
  w.quoteDelay = 0; w.quoter.quoted.clear(); let q0 = w.reqs.quote, t0 = w.t; while (w.t - t0 < 30) await w.price(1); // thirty seconds, a pass every second
  assert.ok(most >= 6, "six positions in flight together: " + most); assert.equal(w.reqs.quote - q0, 60, "six young positions, ten looks each in 30 s (every 3 s)"); assert.equal(w.quoter.stats.quoteYoungEvery, 3); assert.equal(w.quoter.stats.quoteYoung, 6);
  // six minutes later they are old and few: they get the spare budget — still every 3 s, not every 10
  w.t += 360; q0 = w.reqs.quote; t0 = w.t; while (w.t - t0 < 30) await w.price(1); assert.equal(w.quoter.stats.quoteOldEvery, 3); assert.equal(w.reqs.quote - q0, 60);
  // a fall is now noticed within 3 s and the sale is priced by its own later quote, as always
  w.setMc(M(1), 9000); const v = w.entries("NEW-5M").find((e) => e.mint === M(1)).versions.find((x) => x.stop === 0.25 && x.policy === "trail"); let g = 0; while (v.status === "open" && g++ < 5) await w.price(1); assert.equal(v.status, "selling"); assert.ok(v.trig.before && w.t - v.trig.before.t <= 3.5, "the look before the trigger was 3 s earlier, not 10");
  await w.price(1); assert.equal(v.status, "closed"); assert.ok(v.exit.quote.req_t >= v.trigT + 0.7 - 1e-9);
  // many old positions: 150 sizes do not fit 384 a minute at 3 s → they are spread over the budget (150 × 60 / 384 ≈ 23 s)
  const P = new Poller({ engine: { quoteNeeds: () => Array.from({ length: 150 }, (_, i) => ({ id: i + 1, mint: "x", sells: [1], due: null })), entries: { get: () => ({ fill: { t: 0 } }), has: () => true } }, jup: {}, now: () => 1e6, quoteYoung: 3, quoteBudget: 384, quotePar: 8 }); await P.quotes("routine");
  assert.ok(Math.abs(P.stats.quoteOldEvery - 23.4) < 0.2, "old positions share the budget: " + P.stats.quoteOldEvery); assert.equal(P.stats.quoteSizes, 150);
  // too many YOUNG ones for three quarters of the budget: they share it (never slower than the free pace)
  const Y = new Poller({ engine: { quoteNeeds: () => Array.from({ length: 30 }, (_, i) => ({ id: i + 1, mint: "x", sells: [1], due: null })), entries: { get: () => ({ fill: { t: 1e6 - 10 } }), has: () => true } }, jup: {}, now: () => 1e6, quoteYoung: 3, quoteBudget: 384, quotePar: 8 }); await Y.quotes("routine");
  assert.ok(Math.abs(Y.stats.quoteYoungEvery - 6.3) < 0.1, "30 young sizes share 288 a minute: " + Y.stats.quoteYoungEvery);
});

test("the paid key's credits are a reserve, not a spacing: with a monthly allowance set, a 10-credit token search does not hold the next quote for a second; an empty reserve does", async () => {
  const J = await import("../src/jupiter.mjs"); const at = []; J.setFetch(async (url) => { at.push([/order/.test(url) ? "order" : "search", Date.now()]); return { status: 200, headers: [], json: async () => (/order/.test(url) ? { outAmount: "5", inAmount: "1" } : []) }; });
  process.env.JUP_RPS = "200"; process.env.JUP_CREDITS_MONTH = String(20 * 30 * 86400); // 20 credits a second, a reserve of 60
  try { const t0 = Date.now(); await Promise.all([J.tokens(["a"]), J.quote("m", "sell", 1), J.tokens(["b"]), J.quote("m", "sell", 2), J.quote("m", "sell", 3)]); // 23 credits: paid from the reserve
    assert.ok(Date.now() - t0 < 400, "nothing waited for credits: " + (Date.now() - t0) + " ms");
    const t1 = Date.now(); await Promise.all([J.tokens(["c"]), J.tokens(["d"]), J.tokens(["e"]), J.tokens(["f"]), J.tokens(["g"])]); // 50 more: the reserve (about 37 left) runs out → the last waits for it to refill
    assert.ok(Date.now() - t1 > 300, "an empty reserve is waited for: " + (Date.now() - t1) + " ms"); assert.equal(at.length, 10);
  } finally { delete process.env.JUP_RPS; delete process.env.JUP_CREDITS_MONTH; J.setFetch((...a) => fetch(...a)); }
});

test("the stop from the buy price (owner 26 Nov 2026 11:45–11:55 UK: 'it'll just sell if it reaches its own price. Simple as that'): a third exit on the same buys — sold only when the holding is worth X% less than was paid, never because it fell from a high; otherwise at 24 hours like every row", async () => {
  const { newEntry, advance, observe, buyOnly } = await import("../src/book.mjs");
  assert.deepEqual(S.POLICIES, ["trail", "scale", "buy"]); assert.deepEqual(S.POLICY_KEY, { trail: "t", scale: "h", buy: "b" });
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 0, families: ["VOL300K"], features: {}, mc: 1e5, px: 1 }); advance(e, 1.5, st(100, 0), yes); assert.equal(e.versions.length, 3 * S.STOPS.length);
  const T = (s) => e.versions.find((v) => v.policy === "trail" && v.stop === s), B = (s) => e.versions.find((v) => v.policy === "buy" && v.stop === s);
  assert.equal(buyOnly(e), false);
  // Elonmas again: five times the buy, then −72% from the high — every trailing row is out, and the coin is still 40% ABOVE the buy price
  observe(e, st(500, 20), 20); observe(e, st(140, 50), 50); advance(e, 51, st(140, 50), yes);
  assert.ok(S.STOPS.every((s) => T(s).status === "closed"), "the trailing rows follow the high: all sold"); assert.ok(S.STOPS.every((s) => B(s).status === "open"), "the buy-price rows do not: the coin has not been under what was paid");
  assert.equal(buyOnly(e), true, "only buy-price rows are still held");
  // 21% under the buy price: the 20% row sells — and only that one
  observe(e, st(79, 100), 100); advance(e, 101, st(79, 100), yes);
  assert.equal(B(0.2).status, "closed"); assert.equal(B(0.2).reason, "buy-stop"); assert.ok(B(0.2).exit.ret < -0.2 && B(0.2).exit.ret > -0.24, "about 21% lost: " + B(0.2).exit.ret); assert.equal(B(0.25).status, "open"); assert.equal(B(0.7).status, "open");
  // a bounce to twice the buy and back to 55% under it: no trailing from the new high — the rows down to 50% sell on the buy price alone
  observe(e, st(200, 200), 200); observe(e, st(150, 210), 210); assert.equal(B(0.25).status, "open", "25% off a new high is nothing to a buy-price row");
  observe(e, st(45, 300), 300); advance(e, 301, st(45, 300), yes);
  for (const s of [0.25, 0.3, 0.4, 0.5]) { assert.equal(B(s).status, "closed"); assert.equal(B(s).reason, "buy-stop"); } for (const s of [0.6, 0.65, 0.7]) assert.equal(B(s).status, "open");
  // it can never sell before the trailing row of the same percentage
  for (const s of [0.2, 0.25, 0.3, 0.4, 0.5]) assert.ok(B(s).exit.t >= T(s).exit.t);
  // nothing else sells it but the 24-hour limit every row has
  observe(e, st(60, 5000), 5000); advance(e, 5001, st(60, 5000), yes); assert.equal(B(0.6).status, "open");
  advance(e, 86_400 + 3, st(60, 86_400), yes); for (const s of [0.6, 0.65, 0.7]) { assert.equal(B(s).status, "closed"); assert.equal(B(s).reason, "max-hold"); }
  // the page: its own view, its own keys
  const j = booksApi([e], { stop: 0.2, policy: "buy" }); assert.equal(j.policy, "buy"); assert.equal(j.books.VOL300K.length, 1); assert.equal(j.books.VOL300K[0].reason, "buy-stop"); assert.ok(Math.abs(j.books.VOL300K[0].ret - B(0.2).exit.ret) < 1e-9);
  assert.equal(j.rows_total, 149 * S.STOPS.length * 3);
});

test("the buy-price rows on a quote-priced buy: a buy made before they existed keeps its rows and the view counts from the first buy that has them; an old position holding only buy-price rows is looked at once a minute, never at the cost of a fresh one; its sale is priced like any other", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nc-")), st = new Store(join(dir, "t.db")), w = world({ store: st }); st.firstStart(T0 - 3600); // the run began an hour before (main.mjs writes this at the very first start)
  w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2); const [old] = w.entries("NEW-5M");
  old.versions = old.versions.filter((v) => v.policy !== "buy"); st.saveEntry(old); // a buy from before the buy-price rows existed
  w.add(B, w.t, {}); const born = w.t; w.t += 20; await w.pass(); w.t = born + 301; await w.pass(); await w.price(1.2); const fresh = w.entries("NEW-5M").find((e) => e.mint === B);
  assert.equal(fresh.versions.filter((v) => v.policy === "buy").length, S.STOPS.length); assert.equal(old.versions.length, 2 * S.STOPS.length);
  const view = (policy) => booksApi([old, fresh], { stop: 0.25, policy, since: st.since(w.t), run: { books: w.eng.books } });
  assert.deepEqual(view("buy").books["NEW-5M"].map((r) => r.mint), [B], "the older buy is simply not in the buy-price view"); assert.deepEqual(view("trail").books["NEW-5M"].map((r) => r.mint).sort(), [A, B].sort());
  const since = st.since(w.t); assert.equal(since.policies.buy, fresh.decisionT, "counting from the first buy that has the rows"); assert.equal(since.policies.trail, since.first); assert.equal(view("buy").since.stop, fresh.decisionT); assert.equal(view("trail").since.stop, since.first);
  // B: four times the buy, then back to 10% under it — every trailing row is out, every buy-price row still held
  w.setMc(A, 100); await w.price(10); await w.price(1); await w.price(1); // (A is gone: all its rows sold)
  w.setMc(B, 80_000); await w.price(10); w.setMc(B, 18_300); await w.price(10); await w.price(1); await w.price(1);
  const bRow = (s) => fresh.versions.find((v) => v.policy === "buy" && v.stop === s); assert.ok(fresh.versions.filter((v) => v.policy !== "buy").every((v) => v.status === "closed")); assert.ok(S.STOPS.every((s) => bRow(s).status === "open"));
  const need = () => w.eng.quoteNeeds(w.t).find((n) => n.id === fresh.id); assert.equal(need().buy_only, false, "younger than six hours: looked at like every open position"); assert.equal(need().sells.length, 1, "one size");
  let q0 = w.reqs.quote, t0 = w.t; while (w.t - t0 < 300) await w.price(5); assert.ok(w.reqs.quote - q0 >= 28 && w.reqs.quote - q0 <= 31, "every 10 s on the free key: " + (w.reqs.quote - q0));
  // six hours on: once a minute
  w.t = fresh.fill.t + S.BUY_SLOW_AFTER_S + 5; assert.equal(need().buy_only, true); q0 = w.reqs.quote; t0 = w.t; while (w.t - t0 < 600) await w.price(5);
  assert.ok(w.reqs.quote - q0 >= 9 && w.reqs.quote - q0 <= 11, "about one look a minute: " + (w.reqs.quote - q0)); assert.equal(w.quoter.stats.quoteSlowN, 1); assert.equal(w.quoter.stats.quoteSlowEvery, 60); assert.equal(w.quoter.stats.quoteSizes, 0, "it is not counted among the positions that share the main budget");
  // 30% under the buy price: the 20–30% rows are sold on their own quote, asked for after the trigger
  w.setMc(B, 14_000); let g = 0; while (bRow(0.2).status === "open" && g++ < 20) await w.price(5); assert.equal(bRow(0.2).status, "selling"); assert.equal(need().buy_only, false, "a sale is waiting: no longer slow"); await w.price(1);
  assert.equal(bRow(0.2).status, "closed"); assert.equal(bRow(0.2).reason, "buy-stop"); assert.equal(bRow(0.3).status, "closed"); assert.equal(bRow(0.4).status, "open"); assert.ok(bRow(0.2).exit.quote.req_t >= bRow(0.2).trigT + 0.7 - 1e-9);
  const sr = saleRows(fresh).rows.find((r) => r.k === "b20"); assert.ok(sr, "its sale record is kept like a trailing one"); assert.ok(Math.abs(sr.level - 0.8) < 1e-6, "the level is 80% of what was paid, whatever the high was: " + sr.level); assert.ok(sr.peak > 3);
  st.db.close();
});

test("the full picture of a near miss (owner 26 Nov 2026 12:29–12:36 UK: 'list all the factors that didn't pass… the fees, the bundle, the snipe, everything'): a coin over the market-cap line refused on volume or on the first look is read from GMGN once for the record — every failed rule is on the check, nothing is bought, and a coin under the line is not read", async () => {
  assert.equal(S.NEW_EVIDENCE, true);
  const w = world({ evidence: true }), D = "NearMissDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDpump", E = "UnderLineEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEpump", F = "FirstLookFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFpump", G = "NoAnswerGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGpump";
  w.add(D, T0, { mc: 35_000, holders: 2761, vol: 14_200, top: 44.8 }); // BASKET's figures at 5 minutes
  w.info.set(D, { total_fee: 1.2, stat: { top_10_holder_rate: 0.45, top_bundler_trader_percentage: 0.3, top_rat_trader_percentage: 0.02, top70_sniper_hold_rate: 0.05, top_entrapment_trader_percentage: 0.04 } });
  w.add(E, T0, { mc: 4500, holders: 50, vol: 13_900, top: 17.7 });        // under the market-cap line: not read
  w.add(F, T0, { mc: 66_000, holders: 397, vol: 116_500, top: 9.2 });     // WIENER at 20 minutes: only the first look fails
  w.add(G, T0, { mc: 30_000, holders: 240, vol: 12_000, top: 30 }); w.info.set(G, new Error("HTTP 429"));
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const row = (m) => w.nc.history.find((r) => r.mint === m && r.book === "NEW-5M"), K = w.nc.stats.checks["NEW-5M"];
  assert.equal(w.entries().length, 0, "nothing is bought on a reading made for the record"); assert.equal(w.reqs.gmgn, 0, "the buy lane was never used"); assert.equal(w.reqs.ev, 3, "D, F and G — not the coin under the line");
  const d = row(D); assert.equal(d.fees, 1.2); assert.equal(d.top10, 0.45); assert.equal(d.st.vol, "fail"); assert.equal(d.st.top_pre, "fail"); assert.equal(d.st.fees, "fail"); assert.equal(d.st.top10, "fail"); assert.equal(d.ev, "read for the record");
  assert.deepEqual([d.g.bundlers, d.g.insiders, d.g.snipers, d.g.phishing], [0.3, 0.02, 0.05, 0.04]);
  assert.equal(d.out, "not bought: volume $14K (needs $30K), top holders 44.8% by Jupiter's figure (the first look needs 15–35%), fees 1.2 SOL (needs 2), top 10 holders 45.0% (needs 16–30%)", "every rule it failed, not only the first");
  assert.equal(whyOf(d), "volume", "it is still counted once, under the first rule it failed");
  const f = row(F); assert.equal(f.st.top_pre, "fail"); assert.equal(f.st.fees, "pass"); assert.equal(f.st.top10, "pass"); assert.equal(f.fees, 4); assert.equal(f.out, "not bought: top holders 9.2% by Jupiter's figure (needs 16–30%)"); assert.equal(whyOf(f), "top holders (Jupiter)");
  const g = row(G); assert.equal(g.st.fees, "not asked"); assert.equal(g.fees, undefined); assert.match(g.ev, /^no answer/); assert.equal(g.out, "not bought: volume $12K (needs $30K)");
  assert.equal(w.nc.history.some((r) => r.mint === E), false, "a coin under the line stays in the database only"); 
  assert.equal(K.evidence_asked, 3); assert.equal(K.evidence_ok, 2); assert.equal(K.evidence_failed, 1); assert.equal(K.gmgn_asked, 0); assert.equal(K.candidates, 1, "F passed the three Jupiter rules: a candidate stopped at the first look, as before"); assert.equal(K.top_pre_skipped, 1);
  // without the reader (as every earlier test runs) a near miss is written down at once, unread
  const w2 = world(); w2.add(D, T0, { mc: 35_000, holders: 2761, vol: 14_200, top: 44.8 }); w2.t = T0 + 20; await w2.pass(); w2.t = T0 + 301; await w2.pass(); const d2 = w2.nc.history.find((r) => r.mint === D); assert.equal(d2.st.fees, "not asked"); assert.equal(d2.ev, undefined);
});
