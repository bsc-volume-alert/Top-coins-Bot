// THE FOLLOW-UP BOOKS (spec CONFIRM, WAIT_UP; owner 27 Nov 2026 12:37 and 14:15 UK), the 16% top-10 floor (14:15 UK) and the
// page's views (page.mjs VIEWS). Paper only. A look that passes buys for its own book as before and STARTS the follow-up books:
//   CONFIRM-15 / -20 / -30  buy when the look's own buy is worth 1.15× / 1.20× / 1.30× its cost — never after a 20% fall from its high
//   WAIT5-UP                buys five minutes after the look if the provider's price is higher than at the look
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { NewCoins } from "../src/newcoin.mjs";
import { booksApi, followRow, VIEW_NAMES } from "../src/page.mjs";
import { SPL_TOKEN, TOKEN_2022 } from "../src/risk.mjs";
import { COST } from "../src/book.mjs";
import * as S from "../src/spec.mjs";

const POOL = ["VOL100K", "VOL300K"];
// a synthetic provider (as in newcoin.test.mjs): the test sets each coin's figures and price; the clock is manual
function world({ file = null, books = [...POOL, ...S.FOLLOW_BOOKS], notes = [] } = {}) {
  const w = { t: T0, coins: new Map(), px: new Map(), list: [], reqs: { search: 0, gmgn: 0 }, searchFail: false, info: new Map(), notes };
  w.add = (mint, born, f = {}) => { w.coins.set(mint, { born, mc: 20_000, holders: 200, vol: 60_000, top: 25, program: SPL_TOKEN, ...f }); w.px.set(mint, (f.mc ?? 20_000) / 1e9); w.list.push(mint); };
  const row = (mint) => { const c = w.coins.get(mint); return { mint, symbol: mint.slice(0, 4), decimals: 6, token_program: c.program, px: w.px.get(mint), mcap: w.px.get(mint) * 1e9, holders: c.holders, liq_usd: 9000, circ_supply: 1e9, total_supply: 1e9, launchpad: "pump.fun", first_pool: { id: mint, created: c.born },
    mint_authority_disabled: true, freeze_authority_disabled: true, top_holders_pct: c.top, is_sus: false, stats5m: { buyVolume: c.vol * 0.6, sellVolume: c.vol * 0.4, numBuys: 60, numSells: 50, numTraders: 90 }, stats1h: { buyVolume: c.vol * 0.6, sellVolume: c.vol * 0.4, numBuys: 60, numSells: 50, numTraders: 120 }, curve_pct: 40 }; };
  w.jup = { recent: async () => w.list.slice(-30).map(row),
    tokens: async (ms) => { w.reqs.search++; if (w.searchFail) throw new Error("HTTP 500"); return ms.filter((m) => w.coins.has(m)).map(row); },
    quote: async (mint, side, raw) => { const req = w.t; w.t += 0.3; const px = w.px.get(mint) / 100;
      return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Dynamic Bonding Curve"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Dynamic Bonding Curve"], router: "metis" }; } };
  const GOOD = (mint) => ({ total_fee: 8, stat: { top_10_holder_rate: 0.24, top_bundler_trader_percentage: 0.1, top_rat_trader_percentage: 0.02, top70_sniper_hold_rate: 0.01 }, creation_timestamp: w.coins.get(mint).born, holder_count: 210, launchpad: "Pump.fun" });
  w.readInfo = async (mint) => { w.reqs.gmgn++; return { ...GOOD(mint), ...(w.info.get(mint) || {}) }; };
  w.readRisk = async () => ({ status: "clean", program: TOKEN_2022, extensions: [], blocking: [], warnings: [], fee_bps: 0, src: "rpc mint account" });
  w.eng = mkEngine({ tokens: null }); w.eng.setBooks([...S.booksOf(books.join(",")), ...S.NEW_BOOKS]); w.eng.feedUp(T0);
  w.quoter = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t, runnerEvery: Infinity });
  w.nc = new NewCoins({ engine: w.eng, jup: w.jup, quoter: w.quoter, readInfo: w.readInfo, readRisk: w.readRisk, store: { saveNote: (mint, n) => notes.push({ mint, ...n }), saveEntry() {}, saveCoin() {}, saveDecision() {} }, now: () => w.t, file });
  w.pass = async () => { await w.nc.look(); const n = await w.nc.check(); await w.nc.idle(); return n; };
  w.price = async (dt = 0) => { w.t += dt; w.eng.tick(w.t); await w.quoter.quotes(); w.eng.tick(w.t); };
  w.setMc = (mint, mc) => w.px.set(mint, mc / 1e9);
  w.of = (fam) => [...w.eng.entries.values()].filter((e) => e.families.includes(fam));
  /** the coin passes its 5-minute look and the look's own buy is priced */
  w.look5 = async (mint, f = {}) => { w.add(mint, w.t, f); const born = w.t; w.t = born + 20; await w.pass(); w.t = born + 301; await w.pass(); await w.price(1.1); const [e] = w.of("NEW-5M").filter((x) => x.mint === mint); return e; };
  return w;
}
const A = "FollowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApump", B = "FollowBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBpump";
const F = (w, f) => w.nc.stats.follow?.[f] || {};

test("the four follow-up books exist, are off unless a run lists them, live in the under-8h group only — and a group word stands for its books in a list", () => {
  assert.deepEqual(S.FOLLOW_BOOKS, ["CONFIRM-15", "CONFIRM-20", "CONFIRM-30", "WAIT5-UP"]); assert.deepEqual(S.CONFIRM.map((x) => x[1]), [1.15, 1.2, 1.3]); assert.equal(S.CONFIRM_STOP, 0.2); assert.deepEqual(S.WAIT_UP, [["WAIT5-UP", 300]]);
  for (const f of S.FOLLOW_BOOKS) { assert.ok(S.FAMILIES.includes(f)); assert.ok(!S.booksOf("").includes(f)); assert.ok(!S.booksOf("older-11").includes(f)); assert.deepEqual(S.agesOf(f).map((a) => a[0]), ["A0"]); }
  assert.deepEqual(S.booksOf("VOL100K,FOLLOW"), ["VOL100K", ...S.FOLLOW_BOOKS]); assert.deepEqual(S.booksOf("HIT"), S.HIT_BOOKS);
  assert.deepEqual(S.editBooks("VOL100K,HIT", "+FOLLOW"), ["VOL100K", ...S.HIT_BOOKS, ...S.FOLLOW_BOOKS]); assert.deepEqual(S.editBooks("VOL100K,HIT,FOLLOW", "-HIT"), ["VOL100K", ...S.FOLLOW_BOOKS]);
  assert.deepEqual(S.editBooks("VOL100K", "VOL300K,RUG450"), ["VOL300K", "RUG450"], "no sign: the whole list, as before"); assert.throws(() => S.editBooks("", "+FOLLOW"), /no book list of its own/); assert.throws(() => S.editBooks("VOL100K", "+NOPE"), /unknown book/);
});

test("the top-10 floor is 16% (owner 27 Nov 2026 14:15 UK): 17% is bought, 15.9% is not — and the page shows the buys under the old 20% floor as their own view", async () => {
  for (const r of S.NEW_COIN) assert.deepEqual(r.top10, [0.16, 0.3]); assert.equal(S.TOP10_OLD_FLOOR, 0.2);
  const w = world({ books: POOL }); w.info.set(A, { stat: { top_10_holder_rate: 0.17 } }); w.info.set(B, { stat: { top_10_holder_rate: 0.159 } });
  w.add(A, T0); w.add(B, T0); const C = "FollowCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCpump"; w.add(C, T0);
  w.t = T0 + 20; await w.pass(); w.t = T0 + 301; await w.pass(); await w.price(1.1);
  const got = w.of("NEW-5M").map((e) => e.mint).sort(); assert.deepEqual(got, [A, C].sort()); assert.match(w.nc.stats.checks["NEW-5M"].recent.find((x) => x.mint === B).out, /top 10 holders 15\.9% \(needs 16–30%\)/);
  const j = booksApi([...w.eng.entries.values()], { stop: 0.25, run: { books: w.eng.books, newcoins: true }, now: w.t });
  assert.deepEqual(j.books["TOP10-16-20"].map((r) => r.mint), [A], "only the buy the old floor would have refused"); assert.equal(j.books["TOP10-16-20"][0].by_book, "NEW-5M"); assert.match(j.rules["TOP10-16-20"], /NOT a separate book/);
  assert.ok(j.order.indexOf("TOP10-16-20") > j.order.indexOf("NEW-20M")); assert.ok(!j.order.includes("CONFIRM-15-FEE1"), "a view is shown only when the books it looks at are");
  assert.equal(booksApi([...w.eng.entries.values()], { stop: 0.25, run: { books: w.eng.books } }).books["TOP10-16-20"], undefined, "no views without the new-coin books");
});

test("CONFIRM: nothing is bought at the look; each book buys when the look's own buy is worth its multiple — on its own routed quote, with the look's figures and what it paid against the look's buy on record", async () => {
  const w = world(), par = await w.look5(A); assert.equal(par.status, "filled"); assert.equal(w.nc.pending.size, 1); for (const f of S.FOLLOW_BOOKS) assert.equal(F(w, f).started, 1);
  assert.equal(await w.nc.followPass(), 0); for (const f of S.FOLLOW_BOOKS) assert.equal(w.of(f).length, 0, "no buy at the look");
  w.setMc(A, 22_000); await w.price(11); assert.equal(await w.nc.followPass(), 0, "up 10%: not yet");
  w.setMc(A, 25_000); await w.price(11); const v = par.versions.find((x) => x.policy === "trail" && x.stop === 0.2); assert.ok(v.lastX >= 1.2 && v.lastX < 1.3, "the look's own buy is worth " + v.lastX);
  assert.equal(await w.nc.followPass(), 2); const [c15] = w.of("CONFIRM-15"), [c20] = w.of("CONFIRM-20"); assert.ok(c15 && c20); assert.equal(w.of("CONFIRM-30").length, 0);
  assert.equal(c15.status, "pending"); assert.equal(c15.pop, "new-coins"); assert.equal(c15.exec, "routed-quote"); assert.equal(c15.ag, "A0"); assert.match(c15.valuation, /^ESTIMATED/);
  const d = c15.cands[0].detail; assert.equal(d.look.book, "NEW-5M"); assert.equal(d.look.entry, par.id); assert.equal(d.rise, 1.15); assert.equal(d.x_seen, +v.lastX.toFixed(4)); assert.equal(d.look.fees_sol, 8); assert.equal(d.look.top10, 0.24); assert.equal(d.look_px_sol, par.fill.px_sol);
  assert.equal(c15.gate.reading.fees_sol, 8); assert.match(c15.gate.kind, /taken at the look/); assert.equal(c15.gate.by["CONFIRM-15"].pass, true); assert.equal(w.reqs.gmgn, 1, "GMGN is not asked again");
  await w.price(1.1); assert.equal(c15.status, "filled"); assert.ok(c15.fill.quote.req_t >= c15.schedT, "priced by a quote asked for after the trigger");
  const fr = followRow(c15).look; assert.ok(Math.abs(fr.paid - 1.25) < 0.001, "it paid 25% more per token than the look's own buy: " + fr.paid); assert.equal(fr.fv, +((1e4 * 8) / 60_000).toFixed(3)); assert.deepEqual(followRow(par), {});
  // one buy per book and coin; the 1.30 book is still waiting, and buys when its own multiple is reached
  assert.equal(await w.nc.followPass(), 0); assert.equal(w.nc.pending.size, 1);
  w.setMc(A, 28_000); await w.price(11); assert.equal(await w.nc.followPass(), 1); assert.equal(w.of("CONFIRM-30").length, 1); assert.equal(F(w, "CONFIRM-30").bought, 1);
  assert.equal(w.nc.pending.size, 1, "WAIT5-UP is still inside its five minutes"); assert.deepEqual([...w.nc.pending.values()][0].left, new Set(["WAIT5-UP"]));
  // the page: the buy in its own book, the look named on the row, and the fee split as a view
  const j = booksApi([...w.eng.entries.values()], { stop: 0.25, run: { books: w.eng.books, newcoins: true }, now: w.t }); assert.equal(j.books["CONFIRM-15"].length, 1); assert.equal(j.books["CONFIRM-15"][0].by_book, "NEW-5M"); assert.match(j.rules["CONFIRM-15"], /NO buy at the look/);
  assert.equal(j.books["CONFIRM-15-FEE1"].length, 1, "8 SOL of fees on $60K traded = 1.33 per $10K"); for (const n of VIEW_NAMES) assert.ok(j.order.includes(n), n);
});

test("CONFIRM never buys a coin that falls 20% from its high before rising that far — the buys that went straight down are the ones it is there to avoid", async () => {
  const notes = [], w = world({ notes }), par = await w.look5(A);
  w.setMc(A, 21_000); await w.price(11); assert.equal(await w.nc.followPass(), 0);
  w.setMc(A, 15_000); await w.price(11); const v = par.versions.find((x) => x.policy === "trail" && x.stop === 0.2); assert.notEqual(v.status, "open");
  assert.equal(await w.nc.followPass(), 0); for (const [f] of S.CONFIRM) { assert.equal(F(w, f).fell_first, 1); assert.equal(w.of(f).length, 0); }
  assert.equal(notes.filter((n) => /fell 20% from its high before/.test(n.reason)).length, 3); assert.equal(notes[0].ag, "A0"); assert.equal(notes[0].detail.look_entry, par.id);
  w.setMc(A, 40_000); await w.price(11); assert.equal(await w.nc.followPass(), 0, "a later rise changes nothing: that look is finished"); for (const [f] of S.CONFIRM) assert.equal(w.of(f).length, 0);
});

test("WAIT5-UP: judged once, five minutes after the look, on the provider's price — higher: bought at the provider's own figures; the same or lower: never", async () => {
  const notes = [], w = world({ notes, books: [...POOL, "WAIT5-UP"] }); const pa = await w.look5(A, { mc: 20_000 }); w.t = T0 + 400; const pb = await w.look5(B, { mc: 30_000 });
  assert.equal(w.nc.pending.size, 2); assert.equal(F(w, "CONFIRM-15").started, undefined, "a book that is not in the run is not started");
  w.setMc(A, 26_000); w.setMc(B, 30_000); const n0 = w.reqs.search;
  w.t = pa.decisionT + 299; assert.equal(await w.nc.followPass(), 0); assert.equal(w.reqs.search, n0, "nothing is asked before the wait is over");
  w.t = pa.decisionT + 300.5; assert.equal(await w.nc.followPass(), 1); assert.equal(w.reqs.search, n0 + 1);
  const [e] = w.of("WAIT5-UP"); assert.equal(e.mint, A); assert.equal(Math.round(e.signalMc), 26_000); assert.equal(e.valuation, "provider market cap at the measurement");
  const d = e.cands[0].detail; assert.equal(d.wait_s, 300); assert.equal(d.ratio, 1.3); assert.equal(d.at.mc, 26_000); assert.equal(d.look.entry, pa.id); assert.ok(d.late_s < 1);
  await w.price(1.1); assert.equal(e.status, "filled"); assert.equal(followRow(e).look.ratio, 1.3);
  w.t = pb.decisionT + 301; assert.equal(await w.nc.followPass(), 0, "the same price is not higher"); assert.equal(F(w, "WAIT5-UP").not_up, 1); assert.equal(w.nc.pending.size, 0);
  assert.match(notes.find((n) => n.mint === B).reason, /price not above the look's price 5 minutes later/); assert.equal(w.of("WAIT5-UP").length, 1);
});

test("WAIT5-UP is never judged on a late price: a failed request is asked again inside the window, and after it the look is counted 'too late'", async () => {
  const w = world({ books: [...POOL, "WAIT5-UP"] }), par = await w.look5(A); w.setMc(A, 30_000);
  w.searchFail = true; w.t = par.decisionT + 301; assert.equal(await w.nc.followPass(), 0); assert.equal(w.nc.pending.size, 1, "kept: asked again");
  w.t = par.decisionT + 300 + S.NEW_CHECK_LATE_S + 5; w.searchFail = false; assert.equal(await w.nc.followPass(), 0); assert.equal(F(w, "WAIT5-UP").too_late, 1); assert.equal(w.nc.pending.size, 0); assert.equal(w.of("WAIT5-UP").length, 0);
});

test("one buy per follow-up book and coin, whichever look led to it; a look still being followed survives a restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "older-fol-")), file = join(dir, "newcoins-t.json"); const w = world({ file }), par = await w.look5(A, { vol: 120_000, holders: 300 });
  w.setMc(A, 25_000); await w.price(11); assert.equal(await w.nc.followPass(), 2);
  // the 10-minute look passes too: it starts only the books that have not bought this coin
  w.t = T0 + 601; await w.pass(); await w.price(1.1); assert.equal(w.of("NEW-10M").length, 1); const p2 = [...w.nc.pending.values()].find((p) => p.look.book === "NEW-10M"); assert.ok(p2); assert.deepEqual([...p2.left].sort(), ["CONFIRM-30", "WAIT5-UP"]);
  assert.equal(F(w, "CONFIRM-15").started, 1); assert.equal(F(w, "CONFIRM-30").started, 2);
  w.nc.dirty = true; w.nc.save();
  const again = new NewCoins({ engine: w.eng, jup: w.jup, quoter: w.quoter, readInfo: w.readInfo, readRisk: w.readRisk, now: () => w.t, file });
  assert.equal(again.pending.size, w.nc.pending.size); const r2 = again.pending.get(p2.id); assert.deepEqual([...r2.left].sort(), ["CONFIRM-30", "WAIT5-UP"]); assert.equal(r2.look.entry, p2.id); assert.equal(r2.reading.fees_sol, 8);
  w.setMc(A, 40_000); await w.price(11); assert.ok(await again.followPass() >= 1); assert.equal(w.of("CONFIRM-30").length, 1, "bought once, although two looks were being followed");
  assert.equal(await again.followPass(), 0); assert.equal(w.of("CONFIRM-30").length, 1); assert.equal(par.status, "filled");
});

test("without the follow-up books in the run nothing is started and nothing changes for the new-coin books", async () => {
  const w = world({ books: POOL }), par = await w.look5(A); assert.equal(par.status, "filled"); assert.equal(w.nc.pending.size, 0); assert.equal(w.nc.stats.follow, undefined);
  w.setMc(A, 40_000); await w.price(11); assert.equal(await w.nc.followPass(), 0); assert.equal(w.eng.entries.size, 1); assert.deepEqual(w.nc.status().follow_books, []);
});
