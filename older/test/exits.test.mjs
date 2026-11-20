import { test } from "node:test";
import assert from "node:assert/strict";
import { newEntry, onState, onTick, versionsFor, COST } from "../src/book.mjs";
import { liqValue } from "../src/fills.mjs";

const st = (quote, t, base = 2e8) => ({ base, quote, feeBps: 30, t });
const mk = (families = ["LOW4H"]) => newEntry({ mint: "M", pool: "P", ag: "A1", t: 1000, families, features: {}, mc: 1e5, px: 1 });

test("buy fills at the first state at or after signal + 1 s; never on an earlier state", () => {
  const e = mk(); onState(e, st(200, 1000.5), 1000.5); assert.equal(e.status, "pending");
  onState(e, st(210, 1001.4), 1001.4); assert.equal(e.status, "filled"); assert.equal(e.fill.delay_s, 0.4);
  assert.ok(e.fill.tok > 0 && Math.abs(e.fill.cost - COST) < 1e-12);
});

test("the four trailing stops exit independently; the sale prices at the first state ≥ trigger + 0.7 s, not at the trigger level", () => {
  const e = mk(); onState(e, st(200, 1001), 1001);
  onState(e, st(400, 1100), 1100);                       // up ~2×: the peak
  onState(e, st(300, 1200), 1200);                       // −25% in pool SOL → value falls ~25–30%
  const v = Object.fromEntries(e.versions.map((x) => [x.stop, x.status]));
  assert.equal(v[0.2], "selling"); assert.equal(v[0.25], "selling"); assert.equal(v[0.3], "open"); assert.equal(v[0.4], "open");
  onState(e, st(250, 1200.5), 1200.5);                   // before trigger + 0.7 s → not used
  assert.equal(e.versions[0].status, "selling");
  onState(e, st(150, 1201), 1201);                       // a dump lands first → the sale takes this price
  const x = e.versions[0]; assert.equal(x.status, "closed"); assert.equal(x.exit.delay_s, 0.3);
  assert.ok(x.exit.sol < x.trigValue, "sold below the trigger value: a trailing stop is a trigger, not a guaranteed price");
  assert.equal(e.versions.find((q) => q.stop === 0.4).status, "selling"); // 150 is −62% from 400 → the 40% stop now triggers too
});

test("CONT-STALL: at the first state ≥ fill + 60 min, closes if the after-cost value never reached 1.15× stake; plain CONT unaffected", () => {
  const e = mk(["CONT", "CONT-STALL"]); onState(e, st(200, 1001), 1001);
  onState(e, st(220, 2000), 2000);                       // +10%: below 1.15×
  onState(e, st(215, 1001 + 3600), 1001 + 3600);
  for (const v of versionsFor(e, "CONT-STALL")) { assert.equal(v.status, "selling"); assert.equal(v.reason, "stall"); }
  for (const v of versionsFor(e, "CONT")) assert.equal(v.status, "open");
  const e2 = mk(["CONT", "CONT-STALL"]); onState(e2, st(200, 1001), 1001); onState(e2, st(260, 2000), 2000); onState(e2, st(240, 4700), 4700);
  for (const v of versionsFor(e2, "CONT-STALL")) assert.notEqual(v.reason, "stall"); // peaked above 1.15× → survives the stall check
});

test("24 h maximum hold from the fill; quiet coin → sells at the next state; delay recorded", () => {
  const e = mk(); onState(e, st(200, 1001), 1001);
  onTick(e, 1001 + 86400 + 5); for (const v of e.versions) assert.equal(v.reason, "max-hold");
  onState(e, st(205, 1001 + 86400 + 900), 1001 + 86400 + 900);
  for (const v of e.versions) { assert.equal(v.status, "closed"); assert.ok(v.exit.delay_s > 899); }
});

test("no executable state within 600 s → failed fill, recorded", () => {
  const e = mk(); onTick(e, 1001 + 601); assert.equal(e.status, "failed"); assert.ok(e.flags[0].includes("600 s"));
});

test("runner tracking continues after an exit and is separate from realised profit", () => {
  const e = mk(); onState(e, st(200, 1001), 1001);
  onState(e, st(150, 1100), 1100); onState(e, st(150, 1101), 1101); // 20%+ drop → stops trigger and sell
  onState(e, st(700, 5000), 5000);                                   // later runs: liquidation ≥ 3× stake
  assert.ok(e.versions.every((v) => v.status === "closed") || e.versions.some((v) => v.status === "closed"));
  assert.ok(e.runner.reached[2] && e.runner.reached[3]); assert.ok(e.runner.maxX >= 3);
});

test("liquidation value includes pool fees and the sell transaction cost", () => {
  const s = st(200, 0); const tok = 1e5; const gross = (200 * tok) / (2e8 + tok);
  assert.ok(Math.abs(liqValue(s, tok) - (gross * 0.997 - 0.0005)) < 1e-12);
});
