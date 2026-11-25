// The NEW-COIN BOOKS (spec NEW_COIN, src/newcoin.mjs): a coin is measured once at 5 and at 10 minutes old, counted against every
// rule, and paper-bought on a routed quote when all of that age's rules hold. Owner's numbers of 25 Nov 2026 (16:07, 18:37 UK).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { NewCoins, measure, judgeMeasure } from "../src/newcoin.mjs";
import { Store } from "../src/store.mjs";
import { booksApi } from "../src/page.mjs";
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
  w.quoter = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t, runnerEvery: 60 });
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

test("stops and the 24-hour measurement run on quotes: a 25% fall from the high sells the 25% rows; a buy whose rows are all sold is priced once a minute, not every 10 s", async () => {
  const w = world(); w.add(A, T0, {}); w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.2);
  const [e] = w.entries("NEW-5M"); assert.equal(e.status, "filled"); const row = (stop, pol = "trail") => e.versions.find((v) => v.stop === stop && v.policy === pol);
  w.setMc(A, 30_000); await w.price(10); assert.ok(row(0.25).maxX > 1.4); w.setMc(A, 22_000); await w.price(10); // −27% from the high
  assert.equal(row(0.2).status, "selling"); assert.equal(row(0.25).status, "selling"); assert.equal(row(0.3).status, "open");
  await w.price(1); assert.equal(row(0.25).status, "closed"); assert.equal(row(0.25).reason, "trail"); assert.ok(row(0.25).exit.quote.req_t >= row(0.25).trigT + 0.7 - 1e-9, "the sale is priced by a quote asked for after trigger + 0.7 s"); assert.ok(Math.abs(row(0.25).exit.ret - (22 / 20 * 0.99 * 0.99 * 0.2 - 0.0005) / 0.2005 + 1) < 0.01);
  w.setMc(A, 2000); await w.price(10); await w.price(1); await w.price(1); assert.ok(e.versions.every((v) => v.status === "closed"), "every row is out");
  const need = w.eng.quoteNeeds(w.t)[0]; assert.equal(need.runner_only, true); const q0 = w.reqs.quote; for (let i = 0; i < 12; i++) await w.price(10); // two minutes
  assert.ok(w.reqs.quote - q0 <= 3, `the 24-hour high is followed once a minute (${w.reqs.quote - q0} quotes in 2 minutes)`); assert.ok(w.reqs.quote - q0 >= 1);
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
