// older-8 (21 Nov 2026, owner's decisions): the eight any-age books — VOL300K / VOL500K (± price up) and RUG450 / RUG950 (knife, bounce).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { bookRows } from "../src/report.mjs";
import { booksApi } from "../src/page.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f));
const young = (opts = {}) => { const e = mkEngine(opts); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); return e; }; // a coin 2 hours old: inside its first 8 hours
// SOL = $100 in the tests: a trade of `sol` SOL is $100 × sol of volume

test("VOL300K / VOL500K: a migrated coin in its first 8 hours is bought when $300K (then $500K) has traded in the last 5 minutes; the -UP books also need the price above 5 minutes ago", () => {
  const e = young();
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 100 });                    // 10 minutes at $10K a minute: $50K per 5 minutes
  for (const f of S.VOL.map((x) => x[0])) assert.equal(has(e, f).length, 0, f + ": $50K in 5 minutes is not enough");
  for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 700 }); // 4 × $70K in 90 seconds, price flat: $280K + older trades
  const v = has(e, "VOL300K"); assert.equal(v.length, 1, "VOL300K entered"); assert.equal(v[0].ag, "A0"); const d = v[0].cands.find((c) => c.family === "VOL300K").detail;
  assert.ok(d.vol5_usd >= 300_000 && d.vol5_usd < 500_000, "volume recorded: " + d.vol5_usd); assert.equal(d.change_5m, 0);
  assert.equal(has(e, "VOL300K-UP").length, 0, "price is not above 5 minutes ago: the -UP book waits"); assert.equal(has(e, "VOL500K").length, 0);
  swap(e, T0 + 720, 104_000, { sol: 700 });                                  // price now 4% above 5 minutes ago, 5-minute volume still over $300K
  assert.equal(has(e, "VOL300K-UP").length, 1); assert.ok(has(e, "VOL300K-UP")[0].cands[0].detail.change_5m > 0); assert.equal(has(e, "VOL300K").length, 1, "one buy per book");
  for (let k = 0; k < 3; k++) swap(e, T0 + 730 + k * 10, 105_000, { sol: 800 }); // more volume: over $500K in the window
  assert.equal(has(e, "VOL500K").length, 1); assert.equal(has(e, "VOL500K-UP").length, 1); assert.equal(has(e, "VOL500K")[0].id, has(e, "VOL500K-UP")[0].id, "one shared buy for the two books that fired together");
  assert.equal(has(e, "CONT").length + has(e, "FAST150-1M").length + has(e, "HH15-5M").length, 0, "no other book looks at a coin under 8 hours old");
});
test("VOL books: $40K–$2M at the buy (the owner's limit for these books); an unobserved stretch inside the 5 minutes blocks the decision; also bought at 8 hours and older", () => {
  const big = young(); path(big, T0, T0 + 600, () => 2_500_000, 60, { sol: 100 }); for (let k = 0; k < 6; k++) swap(big, T0 + 600 + k * 20, 2_500_000, { sol: 900 });
  assert.equal(has(big, "VOL500K").length, 0, "$2.5M is above the $2M limit");
  const ok = young(); path(ok, T0, T0 + 600, () => 1_500_000, 60, { sol: 100 }); for (let k = 0; k < 6; k++) swap(ok, T0 + 600 + k * 20, 1_500_000, { sol: 900 });
  assert.equal(has(ok, "VOL500K").length, 1, "$1.5M is inside it (the other books stop at $1M)");
  const gap = young(); path(gap, T0, T0 + 600, () => 100_000, 60, { sol: 100 }); gap.feedDown(T0 + 601); gap.feedUp(T0 + 660); for (let k = 0; k < 6; k++) swap(gap, T0 + 665 + k * 20, 100_000, { sol: 900 });
  assert.equal(has(gap, "VOL300K").length, 0, "a feed gap inside the last 5 minutes: the volume is not known, nothing is bought");
  path(gap, T0 + 800, T0 + 1000, () => 100_000, 20, { sol: 900 }); assert.equal(has(gap, "VOL300K").length, 1, "bought once five clean minutes have passed");
  const old = mkEngine(); old.feedUp(T0); old.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); path(old, T0, T0 + 600, () => 100_000, 60, { sol: 100 }); for (let k = 0; k < 6; k++) swap(old, T0 + 600 + k * 20, 100_000, { sol: 900 });
  assert.equal(has(old, "VOL500K").length, 1); assert.equal(has(old, "VOL500K")[0].ag, "A2", "a 20-hour-old coin is bought in its own age group");
});
test("RUG450 / RUG950: bought at the fresh fall to 80% below the observed peak; the 950 books need a $950K peak; the bounce books wait for +30% off the low", () => {
  const e = young();
  path(e, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20);              // climbs to about $500K
  swap(e, T0 + 300, 520_000); swap(e, T0 + 320, 300_000); swap(e, T0 + 340, 150_000); // peak $520K, then the fall: 20% of the peak is $104K
  assert.equal(has(e, "RUG450").length, 0, "$150K is 71% down: not yet");
  swap(e, T0 + 360, 100_000);                                                // crosses $104K
  const k = has(e, "RUG450"); assert.equal(k.length, 1); const d = k[0].cands.find((c) => c.family === "RUG450").detail;
  assert.equal(d.peak_mc, 520_000); assert.ok(d.fall >= 0.8 && d.fall < 0.82); assert.equal(d.fall_s, 60); assert.equal(k[0].ag, "A0");
  assert.equal(has(e, "RUG950").length, 0, "the peak was under $950K"); assert.equal(has(e, "RUG450-BOUNCE").length, 0);
  swap(e, T0 + 380, 70_000); swap(e, T0 + 400, 60_000); swap(e, T0 + 420, 70_000); // low $60K; $70K is +17%: not a 30% bounce
  assert.equal(has(e, "RUG450-BOUNCE").length, 0);
  swap(e, T0 + 440, 80_000);                                                 // +33% off the low
  const b = has(e, "RUG450-BOUNCE"); assert.equal(b.length, 1); const bd = b[0].cands.find((c) => c.family === "RUG450-BOUNCE").detail;
  assert.equal(bd.low_mc, 60_000); assert.ok(bd.bounce >= 0.3); assert.equal(bd.wait_s, 80); assert.equal(has(e, "RUG950-BOUNCE").length, 0);
  swap(e, T0 + 460, 50_000); swap(e, T0 + 480, 90_000); assert.equal(has(e, "RUG450-BOUNCE").length, 1, "the setup is spent: no second bounce buy");

  const e2 = young(); path(e2, T0, T0 + 300, (t) => 200_000 + (t - T0) * 2800, 20); swap(e2, T0 + 300, 1_000_000); swap(e2, T0 + 320, 400_000); swap(e2, T0 + 340, 190_000);
  const both = has(e2, "RUG950"); assert.equal(both.length, 1, "a $1M peak, 81% down at $190K"); assert.ok(both[0].families.includes("RUG450"), "the books nest: one shared buy for RUG450 and RUG950");
  const e3 = young(); path(e3, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(e3, T0 + 300, 520_000); e3.feedDown(T0 + 301); e3.feedUp(T0 + 330); swap(e3, T0 + 340, 90_000);
  assert.equal(has(e3, "RUG450").length, 0, "the fall happened during a feed gap: not a fresh crossing, nothing is bought");
  const e4 = young(); path(e4, T0, T0 + 300, (t) => 100_000 + (t - T0) * 600, 20); swap(e4, T0 + 300, 300_000); swap(e4, T0 + 320, 50_000);
  assert.equal(has(e4, "RUG450").length, 0, "a $300K peak is below $450K");
});
test("RUG: the peak and an armed setup survive a restart; a setup expires 24 hours after arming; a bounce outside the band is not bought", () => {
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "rug.db"); let st = new Store(db); const e = young({ store: st }); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 2 * H, info: {} });
  path(e, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(e, T0 + 300, 520_000); swap(e, T0 + 320, 200_000); swap(e, T0 + 340, 100_000); swap(e, T0 + 360, 60_000);
  assert.equal(has(e, "RUG450").length, 1); e.flush();
  st = new Store(db); const e2 = mkEngine({ store: st }); st.restore(e2); e2.restartGap(st.lastAlive(), T0 + 400); e2.feedUp(T0 + 400);
  const c = e2.coins.get(M); assert.ok(c.info.rug && Math.round(c.info.rug.pk.mc) === 520_000 && c.info.rug.arm, "the peak and the armed setup were stored with the coin"); assert.equal(Math.round(c.info.rug.arm.low), 60_000, "with the low it had reached");
  swap(e2, T0 + 410, 58_000); swap(e2, T0 + 430, 57_000); swap(e2, T0 + 450, 76_000);  // new low $57K after the restart, then +33%
  assert.equal(has(e2, "RUG450-BOUNCE").length, 1, "the bounce is bought after the restart"); assert.equal(has(e2, "RUG450").length, 1, "and the knife book does not buy the same coin again");
  const x = young(); path(x, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(x, T0 + 300, 520_000); swap(x, T0 + 320, 110_000); swap(x, T0 + 340, 30_000); // armed at $30K: under the $40K floor, so no knife buy
  assert.equal(has(x, "RUG450").length, 0); swap(x, T0 + 360, 20_000); swap(x, T0 + 380, 27_000); assert.equal(has(x, "RUG450-BOUNCE").length, 0, "a bounce to $27K is under $40K: not bought");
  const y = young(); path(y, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(y, T0 + 300, 520_000); swap(y, T0 + 320, 110_000); swap(y, T0 + 340, 100_000); swap(y, T0 + 360, 60_000);
  path(y, T0 + 400, T0 + 25 * H, () => 62_000, 600); swap(y, T0 + 25 * H, 62_000); swap(y, T0 + 25 * H + 20, 90_000);
  assert.equal(has(y, "RUG450-BOUNCE").length, 0, "more than 24 hours after arming: the setup has expired");
});
test("older-8 tables: 1,240 rows — the any-age books have an 'under 8h' row, the others do not; the page can show the under-8h group", () => {
  const rows = bookRows([]); assert.equal(rows.length, 1240);
  assert.equal(rows.filter((r) => r.ag === "A0").length, 8 * 5 * 2); assert.ok(rows.filter((r) => r.ag === "A0").every((r) => S.ANY_AGE.has(r.family)));
  const e = young(); path(e, T0, T0 + 600, () => 100_000, 60, { sol: 100 }); for (let k = 0; k < 6; k++) swap(e, T0 + 600 + k * 20, 100_000, { sol: 900 });
  const j = booksApi([...e.entries.values()], { stop: 0.25, ag: "A0" }); assert.ok(j.books["VOL300K"].length >= 1); assert.equal(j.rows_total, 1240); assert.ok(j.rules["RUG950-BOUNCE"] && j.rules["VOL500K-UP"]);
});
test("the books page's own script parses (a quoting slip in the page text once left the site blank; unit tests on the data could not see it)", async () => {
  const { BOOKS_PAGE } = await import("../src/page.mjs"); const m = BOOKS_PAGE.match(/<script>([\s\S]*?)<\/script>/); assert.ok(m && m[1].length > 2000);
  assert.doesNotThrow(() => new Function(m[1]), "the page script must be valid JavaScript");
});
test("books page data: each trade carries the market cap at our buy and at our sale, from the pool it was priced on", async () => {
  const { newEntry, advance, observe } = await import("../src/book.mjs"); const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A4", t: 0, families: ["LOW4H"], features: {}, mc: 95_000, px: 1 }); e.evidence = { trigger: { sol_usd: 100, supply: 1e9 } };
  advance(e, 1.5, st(200, 0), yes);                                            // bought on a pool worth $100K (the signal was seen at $95K)
  observe(e, st(100, 60), 60); advance(e, 61, st(100, 60), yes);               // −50%: every stop sells on a pool worth $50K
  const r = booksApi([e], { stop: 0.25 }).books.LOW4H[0]; assert.equal(r.mc, 95_000); assert.equal(r.mc_buy, 100_000); assert.equal(r.mc_sold, 50_000); assert.equal(r.mc_approx, undefined);
  // a trade stored before sale pools were saved: the sale pool is rebuilt from the sale, exact when the pool's k did not change
  const sk = (q, t) => ({ base: 4e10 / q, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), e2 = newEntry({ mint: "M2", pool: "P", ag: "A4", t: 0, families: ["LOW4H"], features: {}, mc: 95_000, px: 1 }); e2.evidence = { trigger: { sol_usd: 100, supply: 1e9 } };
  advance(e2, 1.5, sk(200, 0), yes); const q50 = Math.sqrt(4e10 * 5e-7); observe(e2, sk(q50, 60), 60); advance(e2, 61, sk(q50, 60), yes);
  const saved = booksApi([e2], { stop: 0.25 }).books.LOW4H[0].mc_sold; for (const v of e2.versions) if (v.exit) delete v.exit.pool;
  const rebuilt = booksApi([e2], { stop: 0.25 }).books.LOW4H[0].mc_sold; assert.equal(saved, 50_000); assert.ok(Math.abs(rebuilt - 50_000) <= 5, "rebuilt from the sale: " + rebuilt);
});
