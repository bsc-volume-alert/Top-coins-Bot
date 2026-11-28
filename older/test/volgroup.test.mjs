// THE VOLUME TEST (spec VOLG; owner's go 27 Nov 2026 20:31 UK): four cards over the volume books' buys made from the start on — cards, not books.
// "Let's add these books and see what happens. Start fresh… do a different colour, maybe purple, so we know that they are one group."
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import * as S from "../src/spec.mjs";
import { booksApi, volClass, VIEWS, VIEW_NAMES, ABOUT, BOOKS_PAGE } from "../src/page.mjs";
const M = "MintAAApump";
const young = () => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.setBooks(S.booksOf("older-11")); return e; };
const burst = (e, sol) => { path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol }); };
// what the classifier reads: buyers in the 5 minutes (own feed), the provider reading, Jupiter's snapshot
const ent = (o = {}) => ({ signalMc: 500_000, features: { w5: { buyers: o.b5 === undefined ? 900 : o.b5 } },
  gate: o.noGate ? null : { timely: !o.late, late: !!o.late, reading: o.noReading ? null : { ath_usd: o.ath === undefined ? 600_000 : o.ath, bundlers: 0.01, snipers: 0.0, fees_sol: 1.2, top10: 0.3, ...o.rd } },
  snap: o.noSnap ? null : { ok: true, mcap: 500_000, stats5m: { holderChange: o.hc5 === undefined ? 250 : o.hc5 }, stats1h: { buyVolume: 300_000, sellVolume: 200_000, numBuys: o.tx === undefined ? 1500 : o.tx, numSells: 500 } } });

test("the frozen numbers: start, the two rug checks, the control rule, the two types, the exits, the looks", () => {
  const G = S.VOLG; assert.equal(new Date(G.t * 1000).toISOString(), "2026-11-27T20:31:00.000Z"); assert.deepEqual(G.books, ["VOL100K", "VOL300K", "VOL500K"]);
  assert.deepEqual([G.buyers_min, G.cap_ath_min, G.growth_min, G.per_trade_min], [200, 0.15, 70, 72]); assert.deepEqual(G.bare, { bund_max: 0.03, snip_max: 0.03, fees_max: 3, top10_min: 0.24 }); assert.deepEqual(G.oper, { bund_min: 0.4, snip_min: 0.4 });
  assert.deepEqual(G.cards, { "VOL-CONTROL": "t40", "VOL-BARE": "h40", "VOL-OPER": "t20", "VOL-REST": "t20" }); assert.deepEqual(G.exits, { t20: ["trail", 0.2], t25: ["trail", 0.25], t40: ["trail", 0.4], h40: ["scale", 0.4] });
  assert.deepEqual(G.checkpoints, [30, 60, 100, 200]); assert.deepEqual(G.bare_quiet_h, [24, 48, 72]);
  for (const k of Object.keys(G.cards)) { assert.ok(VIEW_NAMES.includes(k)); const v = VIEWS.find((x) => x.name === k); assert.equal(v.group, "vol"); assert.equal(v.once, true); assert.equal(v.exit, G.cards[k]); assert.deepEqual(v.of, G.books); assert.ok(ABOUT[k].mind.length > 40); }
  assert.ok(!S.FAMILIES.includes("VOL-CONTROL"), "cards, not books: nothing new buys");
});
test("how a buy is classed: control / rest / failed a rug check / not classed; bare, operator, neither, unknown", () => {
  const c = (o) => volClass(ent(o));
  assert.deepEqual([c().card, c().tpl], ["CONTROL", "BARE"]); assert.equal(c().vpt, 250); assert.equal(c().hc5, 250); assert.equal(c().cap_ath, 0.8333);
  assert.equal(c({ rd: { bundlers: 0.62, snipers: 0.62, fees_sol: 0.2, top10: 0.45 } }).tpl, "OPER"); assert.equal(c({ rd: { bundlers: 0.2, snipers: 0.0 } }).tpl, "NEITHER");
  assert.equal(c({ rd: { bundlers: 0.4, snipers: 0.39 } }).tpl, "NEITHER", "both must be 40%"); assert.equal(c({ rd: { bundlers: 0.03 } }).tpl, "NEITHER", "under 3% means under"); assert.equal(c({ rd: { top10: 0.24 } }).tpl, "BARE"); assert.equal(c({ rd: { fees_sol: 3 } }).tpl, "NEITHER");
  assert.equal(c({ late: true }).tpl, "UNKNOWN", "a late reading does not class the type"); assert.equal(c({ late: true }).card, "CONTROL", "but its all-time high still serves the rug check");
  assert.equal(c({ rd: { bundlers: null } }).tpl, "UNKNOWN"); assert.equal(c({ rd: { fees_sol: null } }).tpl, "UNKNOWN");
  assert.equal(c({ hc5: 70 }).card, "REST", "over 70%, not 70%"); assert.equal(c({ hc5: 71, tx: 6500 }).card, "REST", "$500K over 7,000 trades = $71 a trade"); assert.equal(c({ hc5: 71, tx: 6400 }).card, "CONTROL");
  assert.equal(c({ b5: 199 }).card, "OUT"); assert.equal(c({ b5: 200 }).card, "CONTROL"); assert.equal(c({ ath: 4_000_000 }).card, "OUT", "cap 12.5% of the all-time high"); assert.equal(c({ ath: 3_333_333 }).card, "CONTROL");
  for (const o of [{ noReading: true }, { noGate: true }, { b5: null }, { ath: null }, { noSnap: true }]) { const x = c(o); assert.equal(x.card, "UNCLASSED", JSON.stringify(o)); } assert.equal(c({ noReading: true }).tpl, "UNKNOWN");
  assert.equal(c({ hc5: null }).card, "UNCLASSED");
});
test("the cards: buys since the start only, one row per buy, each with the test's own exits; older buys stay in their book and on no card", () => {
  const e = young(); burst(e, 3200); const list = [...e.entries.values()].filter((x) => x.status === "filled"), en = list.find((x) => x.families.includes("VOL300K")); assert.ok(en && en.families.includes("VOL100K"), "one buy shared by two volume books");
  Object.assign(en, ent()); en.signalMc = 100_000; en.gate.reading.ath_usd = 120_000;
  const run = { name: "t", books: S.booksOf("older-11"), newcoins: true }, api = (o = {}) => booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 800, run, ...o });
  const j = api(); assert.deepEqual(Object.keys(j.group.vol.cards), ["VOL-CONTROL", "VOL-BARE", "VOL-OPER", "VOL-REST"]); assert.equal(j.group.vol.t, S.VOLG.t); assert.equal(j.group.vol.since, "27 Nov, 20:31");
  for (const k of Object.keys(S.VOLG.cards)) { assert.ok(j.order.includes(k)); assert.equal(j.fresh[k], undefined, "its own tag, not the lime NEW"); assert.ok(j.rules[k].includes("VOLUME TEST")); assert.ok(j.about[k]); }
  assert.equal(j.books["VOL-CONTROL"].length, 1, "the shared buy is ONE row"); assert.equal(j.books["VOL-BARE"].length, 1); assert.equal(j.books["VOL-OPER"].length, 0); assert.equal(j.books["VOL-REST"].length, 0);
  const r = j.books["VOL-CONTROL"][0]; assert.equal(r.id, en.id); assert.deepEqual([r.vg.card, r.vg.tpl], ["CONTROL", "BARE"]); assert.deepEqual(Object.keys(r.xr), ["t20", "t25", "t40", "h40"]);
  for (const k of Object.keys(r.xr)) { const [policy, stop] = S.VOLG.exits[k], v = en.versions.find((x) => x.policy === policy && x.stop === stop); assert.deepEqual(r.xr[k], v.exit ? { c: 1, r: v.exit.ret } : { c: 0, x: v.lastX ?? null }); }
  assert.deepEqual(api({ stop: 0.6, policy: "scale" }).books["VOL-CONTROL"][0].xr, r.xr, "the test's exits do not follow the stop chosen");
  assert.ok(j.books.VOL100K.some((x) => x.id === en.id && x.vg) && j.books.VOL300K.some((x) => x.id === en.id && x.vg), "the books' rows are still sent (the count by class reads them)");
  // THE OLD CARDS ARE HIDDEN (owner, 27 Nov 20:50): with the test's cards shown, the three volume books are not cards of their own; they still buy
  assert.equal(S.VOLG.hide_books, true); for (const f of S.VOLG.books) { assert.ok(!j.order.includes(f), f + " is not a card"); assert.equal(j.about[f], undefined); assert.ok(run.books.includes(f), "still in the run's book list"); }
  assert.deepEqual(j.group.vol.hidden, S.VOLG.books); assert.ok(j.order.includes("RUG450") && j.order.includes("FAST-1M"), "every other card stays");
  // the collapse: the test exits close with the rule's own results
  swap(e, T0 + 900, 30_000); swap(e, T0 + 902, 30_000); swap(e, T0 + 904, 30_000); const r2 = booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 950, run }).books["VOL-CONTROL"][0];
  assert.equal(r2.xr.t40.c, 1); assert.equal(r2.xr.t40.r, en.versions.find((x) => x.policy === "trail" && x.stop === 0.4).exit.ret); assert.ok(r2.xr.t40.r < 0);
  // an operator coin, a rest coin, a failed rug check, an unclassed one
  en.gate.reading.bundlers = 0.6; en.gate.reading.snipers = 0.6; let k = api(); assert.equal(k.books["VOL-OPER"].length, 1); assert.equal(k.books["VOL-BARE"].length, 0); assert.equal(k.books["VOL-CONTROL"].length, 1);
  en.snap.stats5m.holderChange = 12; k = api(); assert.equal(k.books["VOL-REST"].length, 1); assert.equal(k.books["VOL-CONTROL"].length, 0); assert.equal(k.books["VOL-OPER"].length, 0);
  en.features.w5.buyers = 12; k = api(); for (const n of Object.keys(S.VOLG.cards)) assert.equal(k.books[n].length, 0); assert.equal(k.books.VOL100K.find((x) => x.id === en.id).vg.card, "OUT");
  en.features.w5.buyers = 900; en.gate.reading = null; k = api(); for (const n of Object.keys(S.VOLG.cards)) assert.equal(k.books[n].length, 0); assert.equal(k.books.VOL100K.find((x) => x.id === en.id).vg.card, "UNCLASSED");
  // START FRESH: a buy made before the test began is on no card and carries no class; it is still in its book (nothing is deleted)
  Object.assign(en, ent()); en.signalMc = 100_000; en.gate.reading.ath_usd = 120_000; const dt = en.decisionT; en.decisionT = S.VOLG.t - 1; k = api();
  for (const n of Object.keys(S.VOLG.cards)) assert.equal(k.books[n].length, 0, n + " starts empty"); const old = k.books.VOL100K.find((x) => x.id === en.id); assert.ok(old, "still in VOL100K"); assert.equal(old.vg, undefined); assert.equal(old.xr, undefined); en.decisionT = dt;
  // a run without the three volume books has no group
  { const n = booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 800, run: { ...run, books: ["VOL100K", "RUG450"] } }); assert.equal(n.group, undefined); assert.ok(n.order.includes("VOL100K"), "no test cards: the book keeps its own card"); }
});
test("the page: one purple group with its own tag and test box; a waiting hand sale says when there is no sale price", () => {
  for (const s of ["--grp:#c58bff", ".card.grp", "VOLUME TEST · since ", "class=\"gbox\"", "the test · ", "adaptive: bare on half-at-2", "every volume buy since the start", "the 25% stop beside it", "last bare buy", "RETIRED from expectations", "next look at ", "newtag gp", "no sale price yet", "cards are hidden; the books still buy"]) assert.ok(BOOKS_PAGE.includes(s), "the page has: " + s);
  assert.ok(!BOOKS_PAGE.includes("the volume test first") && !BOOKS_PAGE.includes("g0.concat("), "ranked strictly by profit: the purple cards are not pinned first (owner 28 Nov 00:56)");
});
