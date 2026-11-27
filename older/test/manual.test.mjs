// MANUAL SALE — paper only (owner 25 Nov 2026: "a sell now button… sell all and sell a percentage, maybe sell 50%").
// The owner sells a share of what he still holds of a filled paper buy. It is priced like the program's own sales and recorded
// BESIDE the rules: every stop × exit row of the buy carries on exactly as if he had not touched it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, quoteFor, BASE, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { COST, requestManual, entryDone, manualOpen } from "../src/book.mjs";
import { sellQuote } from "../src/fills.mjs";
import { booksApi, BOOKS_PAGE } from "../src/page.mjs";
import { startWeb } from "../src/web.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump";
// a 20-hour-old coin, FAST-1M only: the double at T0 + 610, bought at T0 + 611 on a $205K pool
const bought = (o = {}) => { const e = mkEngine(o); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); e.rebuy = false; e.setBooks(["FAST-1M"]); path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); swap(e, T0 + 612, 205_000); swap(e, T0 + 613, 205_000);
  const en = [...e.entries.values()][0]; assert.equal(en.status, "filled"); return { e, en }; };
const rows = (en) => JSON.stringify(en.versions);
const expected = (mc, tok, feeBps = 30) => sellQuote({ base: BASE, quote: quoteFor(mc), feeSell: feeBps / 1e4 }, tok).sol - S.TX_COST_SOL;

test("sell 50% then sell all: each sale is priced on the pool in force 0.7 s after the tap, with the sell fee, the price impact and one transaction cost — and the rules' own rows are untouched", () => {
  const { e, en } = bought(), twin = bought(); // the twin is never touched by hand
  for (const x of [e, twin.e]) { swap(x, T0 + 700, 300_000); swap(x, T0 + 702, 300_000); }
  const r = e.manualSell(en.id, 0.5, T0 + 705); assert.deepEqual(r, { ok: true, schedT: T0 + 705.7, share_of_buy: 0.5 }); assert.equal(en.manual.order.frac, 0.5);
  assert.deepEqual(e.manualSell(en.id, 1, T0 + 705.2), { ok: false, why: "a sale of this buy is already waiting for its price" });
  for (const x of [e, twin.e]) x.tick(T0 + 705.6); assert.equal(en.manual.sales.length, 0, "not before its time"); for (const x of [e, twin.e]) x.tick(T0 + 705.8);
  const s1 = en.manual.sales[0]; assert.ok(s1, "priced by the clock, no trade of the coin needed"); assert.equal(s1.t, T0 + 705.7); assert.equal(s1.delay_s, 0); assert.equal(s1.share, 0.5); assert.equal(s1.by, "manual");
  assert.ok(Math.abs(s1.sol - expected(300_000, en.fill.tok / 2)) < 1e-9, "half the tokens on the $300K pool, fee and transaction cost off: " + s1.sol); assert.ok(Math.abs(s1.pool.q - quoteFor(300_000)) < 1e-9);
  assert.equal(en.manual.closed, null); assert.ok(Math.abs(en.manual.tok - en.fill.tok / 2) < 1e-6); assert.ok(manualOpen(en));
  for (const x of [e, twin.e]) { swap(x, T0 + 800, 400_000); swap(x, T0 + 802, 400_000); }
  assert.ok(Math.abs(en.manual.lastX - (s1.sol + expected(400_000, en.fill.tok / 2)) / COST) < 1e-9, "what he has banked plus what the rest is worth now");
  assert.equal(e.manualSell(en.id, 1, T0 + 805).ok, true); for (const x of [e, twin.e]) x.tick(T0 + 806);
  const s2 = en.manual.sales[1]; assert.ok(Math.abs(s2.sol - expected(400_000, en.fill.tok / 2)) < 1e-9); assert.equal(s2.share, 0.5); assert.equal(en.manual.tok, 0);
  assert.ok(Math.abs(en.manual.closed.sol - (s1.sol + s2.sol)) < 1e-12); assert.ok(Math.abs(en.manual.closed.ret - ((s1.sol + s2.sol) / COST - 1)) < 1e-12); assert.ok(en.manual.closed.ret > 0.6, "sold half at about 1.5× and half at about 2×");
  assert.deepEqual(e.manualSell(en.id, 0.5, T0 + 810), { ok: false, why: "you have already sold all of this buy" });
  // the rules: identical to the buy nobody touched, now and after the price collapses
  assert.equal(rows(en), rows(twin.en), "every stop × exit row is exactly as in the untouched run");
  for (const x of [e, twin.e]) { swap(x, T0 + 900, 100_000); swap(x, T0 + 902, 100_000); swap(x, T0 + 904, 100_000); } assert.equal(rows(en), rows(twin.en)); assert.ok(en.versions.some((v) => v.status === "closed" && v.reason === "trail"), "the stops still sold on the way down");
});

test("what is refused: a buy that is not filled, an unknown buy, a share other than 25% / 50% / all, after the 24-hour limit; 25% means a quarter of what is still held", () => {
  const { e, en } = bought(); assert.equal(e.manualSell(999_999, 1, T0 + 700).ok, false); assert.match(e.manualSell(en.id, 0.33, T0 + 700).why, /25%, 50% or all/); assert.equal(en.manual, undefined, "a refused request leaves no record");
  assert.match(requestManual({ status: "pending" }, 1, T0).why, /not a filled buy/); assert.match(requestManual({ status: "filled", fill: { exec: "something else", t: T0 } }, 1, T0).why, /cannot be priced/); // a routed-quote buy CAN be sold by hand since the new-coin books (test/newcoin.test.mjs)
  assert.match(e.manualSell(en.id, 1, en.fill.t + S.MAX_HOLD_S + 1).why, /24-hour limit/); assert.deepEqual(e.stats.manual, { asked: 0, refused: 2 });
  e.manualSell(en.id, 0.5, T0 + 700); e.tick(T0 + 701); const r = e.manualSell(en.id, 0.25, T0 + 702); assert.equal(r.share_of_buy, 0.125, "a quarter of the half he still holds"); e.tick(T0 + 703); assert.ok(Math.abs(en.manual.tok / en.fill.tok - 0.375) < 1e-9);
});

test("a manual sale waits for a trustworthy price like every sale (never priced on a stale state), and what he still holds at 24 hours is sold then", () => {
  const { e, en } = bought(); e.feedDown(T0 + 700, "test"); assert.equal(e.manualSell(en.id, 1, T0 + 701).ok, true); e.tick(T0 + 705); e.tick(T0 + 720);
  assert.equal(en.manual.sales.length, 0, "the feed is down: the pool state is not trusted, so the order waits"); assert.ok(manualOpen(en));
  e.feedUp(T0 + 730); swap(e, T0 + 731, 250_000); assert.equal(en.manual.sales.length, 0, "the stream has only just come back: one good measurement after a silence proves nothing yet");
  swap(e, T0 + 737, 250_000); swap(e, T0 + 739, 250_000); const s = en.manual.sales[0]; assert.ok(s, "priced on the first trustworthy state"); assert.ok(s.delay_s > 32 && s.delay_s < 37, "with its real delay: " + s.delay_s); assert.ok(Math.abs(s.sol - expected(250_000, en.fill.tok)) < 1e-9);
  const b = bought(); b.e.manualSell(b.en.id, 0.5, T0 + 700); b.e.tick(T0 + 701); const end = b.en.fill.t + S.MAX_HOLD_S; for (let t = T0 + 3600; t < end; t += 3600) swap(b.e, t, 205_000);
  swap(b.e, end - 5, 180_000); b.e.tick(end + 2); const last = b.en.manual.sales.at(-1); assert.equal(last.by, "max-hold"); assert.equal(last.t, end + 0.7); assert.ok(b.en.manual.closed); assert.equal(b.en.manual.tok, 0);
});

test("the buy stays in memory and in the unfinished list while his sale is open; a pending manual order survives a restart and is priced afterwards", () => {
  const f = join(mkdtempSync(join(tmpdir(), "older-man-")), "m.db"), st = new Store(f), { e, en } = bought({ store: st }); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, info: {} });
  e.feedDown(T0 + 700, "test"); e.manualSell(en.id, 0.5, T0 + 701); assert.equal(entryDone(en), false); e.flush(); st.heartbeat(T0 + 702); st.db.close();
  const st2 = new Store(f), b = mkEngine({ store: st2 }); st2.restore(b); const r = b.entries.get(en.id); assert.ok(r && r.manual.order && r.manual.order.frac === 0.5, "restored with the order still waiting");
  b.restartGap(st2.lastAlive(), T0 + 760); b.feedUp(T0 + 761); swap(b, T0 + 762, 220_000); swap(b, T0 + 764, 220_000); assert.equal(r.manual.sales.length, 1); assert.ok(r.manual.sales[0].delay_s > 55);
  assert.equal(st2.allEntries()[0].manual.sales.length, 1, "and the sale is saved at once"); st2.db.close();
});

test("the site: sell buttons only when the server allows it; his sales are shown beside the rule's result; the endpoint is POST-only, needs the site key and can only request a paper sale", async () => {
  const { e, en } = bought(); swap(e, T0 + 700, 300_000); const now = T0 + 705, api = (o = {}) => booksApi([...e.entries.values()], { stop: 0.25, now, ...o }).books["FAST-1M"][0];
  assert.equal(api().sell, undefined, "no button unless the server offers manual sales"); assert.equal(api({ sellable: true }).sell, 1); assert.equal(booksApi([], { sellable: true }).sellable, true);
  e.manualSell(en.id, 0.5, now); let r = api({ sellable: true }); assert.deepEqual(r.man.pending, { frac: 0.5, by: "manual" }); assert.equal(r.sell, undefined, "no second order while one waits");
  e.tick(now + 1); r = api({ sellable: true }); assert.equal(r.man.left, 0.5); assert.equal(r.man.sales.length, 1); assert.equal(r.man.sales[0].share, 0.5); assert.ok(r.man.sales[0].mc > 290_000 && r.man.sales[0].mc < 310_000); assert.equal(r.sell, 1); assert.equal(r.man.closed, false);
  e.manualSell(en.id, 1, now + 2); e.tick(now + 3); r = api({ sellable: true }); assert.equal(r.man.closed, true); assert.ok(r.man.ret > 0.3); assert.equal(r.sell, undefined); assert.equal(r.status, "open", "the 25% stop row of the same buy is still open: the rule carries on");
  // the endpoint
  const call = async (port, path, method = "POST") => { const x = await fetch(`http://127.0.0.1:${port}${path}`, { method }); return { status: x.status, body: await x.text() }; };
  const serve = (key) => { const old = process.env.OLDER_SITE_KEY; if (key) process.env.OLDER_SITE_KEY = key; else delete process.env.OLDER_SITE_KEY; const asked = [];
    const w = startWeb({ port: 0, store: { allEntries: () => [], noteCounts: () => [], disk: () => ({}) }, engine: e, status: () => ({}), sell: (id, frac) => { asked.push([id, frac]); return id === 7 ? { ok: true } : { ok: false, why: "no such buy" }; } });
    if (old === undefined) delete process.env.OLDER_SITE_KEY; else process.env.OLDER_SITE_KEY = old; return new Promise((res) => w.server.on("listening", () => res({ w, asked, port: w.server.address().port }))); };
  const a = await serve("sekret");
  assert.equal((await call(a.port, "/api/sell?id=7&frac=0.5")).status, 403, "no key, no sale"); assert.equal((await call(a.port, "/api/sell?id=7&frac=0.5&k=wrong")).status, 403); assert.equal((await call(a.port, "/api/sell?id=7&frac=0.5&k=sekret", "GET")).status, 405, "a link cannot sell: POST only");
  const ok = await call(a.port, "/api/sell?id=7&frac=0.5&k=sekret"); assert.equal(ok.status, 200); assert.deepEqual(JSON.parse(ok.body), { ok: true }); assert.deepEqual(a.asked, [[7, 0.5]]);
  assert.equal((await call(a.port, "/api/sell?id=8&frac=1&k=sekret")).status, 409); assert.equal((await call(a.port, "/api/sell?id=x&frac=1&k=sekret")).status, 400);
  // the 2-second view of open positions: from the engine's memory only (this store has no entries at all), same figures as the page data, key needed
  assert.equal((await call(a.port, "/api/live?stop=0.25&policy=trail", "GET")).status, 403);
  const lv = JSON.parse((await call(a.port, "/api/live?stop=0.25&policy=trail&k=sekret", "GET")).body), keyOf = Object.keys(lv.rows).find((k) => k.endsWith("|" + en.id)); assert.ok(keyOf, "the open 25% row of the buy is there"); assert.equal(lv.stop, 0.25); assert.equal(lv.policy, "trail"); assert.equal(lv.stake, 0.2);
  assert.equal(lv.rows[keyOf][0], api({}).now_x); assert.equal(lv.rows[keyOf][1], api({}).hi);
  const lv60 = JSON.parse((await call(a.port, "/api/live?stop=0.6&policy=scale&stake=1&k=sekret", "GET")).body); assert.equal(lv60.stop, 0.6); assert.equal(lv60.policy, "scale"); assert.equal(lv60.stake, 1);
  a.w.server.close();
  const b = await serve(null); assert.equal((await call(b.port, "/api/sell?id=7&frac=0.5")).status, 403, "a site without a key offers no manual sales at all"); assert.deepEqual(b.asked, []); b.w.server.close();
});

// HUMAN AND AUTO SIDE BY SIDE (owner 27 Nov 2026 20:17 UK: "you're going to ruin the test if we start selling willy-nilly… a separate box in that box where
// it says a human agent has sold, but keep it running on your system as normal")
test("a buy he sold in full by hand keeps the RULE's row in its book (open list, totals); his result travels with the row for the card's own box, at the stake shown", () => {
  const { e, en } = bought(), twin = bought(); for (const x of [e, twin.e]) { swap(x, T0 + 700, 300_000); swap(x, T0 + 702, 300_000); }
  const now = T0 + 720, row = (x, o = {}) => booksApi([...x.entries.values()], { stop: 0.25, now, sellable: true, ...o }).books["FAST-1M"][0], rule = (r) => { const { man, sell, id, ...rest } = r; return JSON.stringify(rest); }; // (the entry number differs between the two runs)
  e.manualSell(en.id, 0.5, T0 + 705); for (const x of [e, twin.e]) x.tick(T0 + 706); assert.equal(row(e).man.net_v, undefined, "a part-sale is not a result yet");
  e.manualSell(en.id, 1, T0 + 707); for (const x of [e, twin.e]) x.tick(T0 + 708);
  const r = row(e), t = row(twin.e), m = en.manual.closed; assert.ok(m && m.ret > 0.3);
  assert.equal(r.status, "open", "the 25% stop still holds the buy: the book shows that"); assert.equal(rule(r), rule(t), "apart from his sale, the row is exactly the row of the buy nobody touched");
  assert.equal(r.man.closed, true); assert.equal(r.man.ret, m.ret); assert.ok(Math.abs(r.man.net - (m.sol - COST)) < 1e-12); assert.equal(r.man.net_v, r.man.net, "at the 0.2 SOL stake: what he got");
  const s1 = row(e, { stake: 1 }); assert.ok(Math.abs(s1.man.net_v - m.ret * (1 + S.TX_COST_SOL)) < 1e-12, "at another stake: the same percentage"); assert.equal(rule(s1), rule(row(twin.e, { stake: 1 })));
  for (const x of [e, twin.e]) { swap(x, T0 + 900, 100_000); swap(x, T0 + 902, 100_000); swap(x, T0 + 904, 100_000); }
  const late = (x) => booksApi([...x.entries.values()], { stop: 0.25, now: T0 + 950, sellable: true }).books["FAST-1M"][0]; assert.equal(late(e).status, "closed"); assert.equal(late(e).reason, "trail"); assert.equal(late(e).ret, late(twin.e).ret, "the rule's sale and result are the rule's"); assert.equal(late(e).man.ret, m.ret);
  assert.equal(rows(en), rows(twin.en));
});
test("the page: a card labels its totals as auto sell and shows his own sales of its buys in a box of their own", () => {
  for (const s of ["sold by you · human", "on auto sell", "your selling against the rule", "auto sell · ", "you sold all at ", "you sold at ", "class=\"hum\""]) assert.ok(BOOKS_PAGE.includes(s), "the page has: " + s);
});
