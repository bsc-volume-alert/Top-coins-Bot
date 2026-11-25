// older-11 — which books buy. The list is applied to finished candidates: an inactive book makes no new buy, an active book
// decides exactly as with all books active, and the default run is the legacy 29 books (VOL100K off).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", fams = (e) => [...e.entries.values()].flatMap((x) => x.families).sort();
const young = () => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); return e; }; // a coin 2 hours old; SOL = $100 in the tests
// ten quiet minutes at $100K, then `sol` SOL four times in 90 seconds with no price move: only a 5-minute-volume book can fire
const burst = (e, sol) => { path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol }); };

test("booksOf: legacy = the 29 books of older-10 (no VOL100K); older-11 = the owner's 12 pool books; an unknown book and a clock book without its base are refused", () => {
  assert.equal(S.FAMILIES.length, 30); assert.equal(S.booksOf("").length, 29); assert.ok(!S.booksOf("legacy").includes("VOL100K"));
  assert.deepEqual(S.booksOf("older-11"), ["HH-BREAK", "HH-BREAK-4H", "VOL100K", "VOL300K", "VOL500K", "FAST-1M", "FAST-3M", "FAST-5M", "RUG450", "RUG950", "LOW4H", "SLOW-BUILD"]);
  assert.deepEqual(S.booksOf(" VOL300K , RUG450 "), ["VOL300K", "RUG450"]);
  assert.throws(() => S.booksOf("NOPE"), /unknown book/); assert.throws(() => S.booksOf("HH-BREAK-4H"), /shares the buys of HH-BREAK/);
});
test("default run: VOL100K makes no buy — the legacy 29 behave as before", () => {
  const e = young(); burst(e, 300); // 4 × $30K = $120K in 90 seconds
  assert.deepEqual(fams(e), [], "$120K in five minutes fires no legacy book"); assert.ok(e.stats.inactiveCands >= 1, "the VOL100K candidate was counted and dropped");
});
test("older-11 run: VOL100K buys at $100K of 5-minute volume; with $300K it shares ONE buy with VOL300K; a book outside the list makes no buy even when its rule fires", () => {
  const a = young(); a.setBooks(S.booksOf("older-11")); burst(a, 300); assert.deepEqual(fams(a), ["VOL100K"]);
  const d = [...a.entries.values()][0].cands[0].detail; assert.equal(d.threshold_usd, 100_000); assert.ok(d.vol5_usd >= 100_000 && d.vol5_usd < 300_000, "volume recorded: " + d.vol5_usd);
  const L = young(); burst(L, 800); assert.deepEqual(fams(L), ["VOL300K"], "legacy: the price did not rise, so no -UP book");
  const N = young(); N.setBooks(S.booksOf("older-11")); burst(N, 800); assert.deepEqual(fams(N).filter((f) => f !== "VOL100K"), ["VOL300K"]); assert.ok(fams(N).includes("VOL100K"));
  const only = young(); only.setBooks(S.booksOf("RUG450")); burst(only, 800); assert.deepEqual(fams(only), [], "VOL300K's rule fired but the book is not in this run's list");
});
test("a book switched off still has its open position managed: the list stops new buys only", () => {
  const e = young(); burst(e, 800); const en = [...e.entries.values()].find((x) => x.families.includes("VOL300K")); assert.ok(en, "VOL300K bought");
  swap(e, T0 + 700, 100_000); swap(e, T0 + 705, 100_000); assert.equal(en.status, "filled");
  e.setBooks(S.booksOf("RUG450")); // VOL300K is not active from here
  swap(e, T0 + 720, 50_000); swap(e, T0 + 725, 50_000); swap(e, T0 + 730, 50_000); // −50%: the trailing stops up to 40% sell
  const closed = en.versions.filter((v) => v.status === "closed" && v.policy === "trail" && !v.stall).map((v) => v.stop).sort(); assert.deepEqual(closed, [0.2, 0.25, 0.3, 0.4]);
  assert.equal([...e.entries.values()].length, 1, "and nothing new was bought");
});
