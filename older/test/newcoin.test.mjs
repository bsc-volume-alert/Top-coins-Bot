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
function world({ store = null, file = null, engine = {}, gmgn = null } = {}) {
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
  w.quoter = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t, runnerEvery: Infinity }); // as main.mjs sets it: a buy whose every row is sold is not quoted
  w.nc = new NewCoins({ engine: w.eng, jup: w.jup, quoter: w.quoter, readInfo: w.readInfo, readRisk: w.readRisk, store, now: () => w.t, file });
  w.pass = async () => { await w.nc.look(); const n = await w.nc.check(); await w.nc.idle(); return n; };
  w.price = async (dt = 0) => { w.t += dt; w.eng.tick(w.t); await w.quoter.quotes(); w.eng.tick(w.t); };
  w.setMc = (mint, mc) => w.px.set(mint, mc / 1e9);
  w.entries = (fam) => [...w.eng.entries.values()].filter((e) => !fam || e.families.includes(fam));
  return w;
}
const A = "NewCoinAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApump", B = "NewCoinBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBpump", C = "NewCoinCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCpump";

test("the rule numbers are the owner's: 5 minutes — cap over $10K, over 100 holders, $30K traded, 2 SOL fees, top 10 20–30%; 10 minutes — over 150 holders, $50K, 3.5 SOL", () => {
  assert.deepEqual(R5, { family: "NEW-5M", at_s: 300, mc_min_usd: 10_000, holders_min: 100, vol_min_usd: 30_000, fees_min_sol: 2, top10: [0.2, 0.3] });
  assert.deepEqual(R10, { family: "NEW-10M", at_s: 600, mc_min_usd: 10_000, holders_min: 150, vol_min_usd: 50_000, fees_min_sol: 3.5, top10: [0.2, 0.3] });
  // 15 and 20 minutes (owner 23:32 UK): holders over 200, $100K traded, fees 5 SOL, top 10 20–30% — the same at both ages
  assert.deepEqual(S.NEW_COIN.slice(2), [{ family: "NEW-15M", at_s: 900, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.2, 0.3] }, { family: "NEW-20M", at_s: 1200, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.2, 0.3] }]);
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
  const [e] = w.entries("NEW-5M"); assert.ok(e); assert.equal(e.status, "pending"); assert.equal(e.ag, "A0"); assert.equal(e.pop, "new-coins"); assert.equal(e.exec, "routed-quote"); assert.equal(e.mode, "polled"); assert.equal(e.versions.length, 10, "five stops under both exit policies");
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

test("not bought, and counted why: fees too low, top 10 outside 20–30%, no GMGN reading, GMGN says the coin is old, transfers restricted, restrictions unreadable", async () => {
  const w = world(); const born = T0, names = ["Fees", "Top", "NoRead", "Old", "Restr", "Unread", "Good22"].map((n) => n + "CoinXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXpump");
  for (const m of names) w.add(m, born, { program: /Restr|Unread|Good22/.test(m) ? TOKEN_2022 : SPL_TOKEN });
  w.info.set(names[0], { total_fee: 1.99 }); w.info.set(names[1], { stat: { top_10_holder_rate: 0.31 } }); w.info.set(names[2], new Error("GMGN allowance exhausted for another 9.0 s")); w.info.set(names[3], { creation_timestamp: born - 3600 });
  w.riskOf.set(names[4], { status: "restricted", program: TOKEN_2022, blocking: ["transferHook"], warnings: [], fee_bps: 0, src: "rpc mint account" }); w.riskOf.set(names[5], { status: "missing", why: "mint account not parsed" });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 305; await w.pass();
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.candidates, 7); assert.equal(K.gmgn_failed, 1); assert.equal(K.gmgn_ok, 6); assert.equal(K.fees, 5); assert.equal(K.top10, 5); assert.equal(K.age_ok, 5); assert.equal(K.passed_all, 3); assert.equal(K.risk_blocked, 1); assert.equal(K.risk_unknown, 1); assert.equal(K.bought, 1);
  const out = Object.fromEntries(K.recent.map((x) => [x.mint.slice(0, 4), x.out])); assert.match(out.Fees, /fees 1\.99 SOL \(needs 2\)/); assert.match(out.TopC, /top 10 holders 31\.0% \(needs 20–30%\)/); assert.match(out.NoRe, /no GMGN reading/); assert.match(out.OldC, /GMGN says the coin is 65 minutes old/); assert.match(out.Rest, /restricts transfers \(transferHook\)/); assert.match(out.Unre, /could not be read from the chain/); assert.match(out.Good, /BOUGHT/);
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

test("GMGN is asked only when the coin could still pass: Jupiter's top-holders figure outside 15–35% → not asked, not bought, counted; inside it or missing → asked, and GMGN's own 20–30% decides; every such measurement is logged", async () => {
  const dir = mkdtempSync(join(tmpdir(), "older-nc-")), file = join(dir, "newcoins-t.json"); const w = world({ file });
  w.add(A, T0, { top: 9.2 }); w.add(B, T0, { top: 16 }); w.add(C, T0, { top: null }); w.add("ThinCoinXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXpump", T0, { top: 36, vol: 100 }); w.info.set(B, { stat: { top_10_holder_rate: 0.19 } });
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass();
  const K = w.nc.stats.checks["NEW-5M"]; assert.equal(K.candidates, 3); assert.equal(K.top_pre_skipped, 1); assert.equal(K.gmgn_asked, 2); assert.equal(w.reqs.gmgn, 2); assert.equal(K.bought, 1);
  const out = Object.fromEntries(K.recent.map((x) => [x.mint.slice(0, 8), x.out])); assert.match(out.NewCoinA, /top holders 9\.2% by Jupiter's figure \(needs 20–30%; GMGN not asked\)/); assert.match(out.NewCoinB, /top 10 holders 19\.0% \(needs 20–30%\)/); assert.match(out.NewCoinC, /BOUGHT/); assert.match(out.ThinCoin, /volume \$0K/);
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
  assert.deepEqual(r.newcoins.rules[0], { book: "NEW-5M", at_s: 300, mc: 10_000, holders: 100, vol: 30_000, fees: 2, top10: [0.2, 0.3] });
  await w.price(1.2); r = ask(B); assert.equal(r.verdict, "BOUGHT (paper) by NEW-5M"); assert.equal(r.buys.length, 1); assert.equal(r.buys[0].status, "filled"); assert.equal(r.buys[0].rows.t25, "open"); assert.equal(r.buys[0].fees, 4); assert.equal(r.buys[0].top10, 0.24); assert.equal(r.buys[0].hidden, false);
  assert.deepEqual({ ...w.reqs, quote: 0 }, { ...asked, quote: 0 }, "a lookup asks no provider anything"); assert.ok(before.search < asked.search);
  // after every age point has passed the coin leaves the waiting list; its record stays
  w.t = T0 + 1200 + S.NEW_CHECK_LATE_S + 30; await w.pass(); await w.pass(); r = ask(A); assert.equal(r.newcoins.waiting, null); assert.equal(r.verdict, "Seen and measured, NOT bought"); assert.ok(r.newcoins.checks.length >= 1);
  // a check made before the database kept every check (the log file's rows) is still found
  w.nc.history.push({ book: "NEW-5M", t: T0 - 5000, mint: D, sym: "OLD", mc: 46_080, holders: 106, vol: 39_126, ok: { mc: true, holders: true, vol: true }, fees: 6.26, top10: 0.1848, out: "not bought: top 10 holders 18.5% (needs 20–30%)" });
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
