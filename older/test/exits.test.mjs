import { test } from "node:test";
import assert from "node:assert/strict";
import { newEntry, advance, observe, versionsFor, COST, inventories, entryDone, unresolvedCount } from "../src/book.mjs";
import { liqValue, sellSol } from "../src/fills.mjs";

const st = (quote, t, base = 2e8) => ({ base, quote, feeBuy: 0.003, feeSell: 0.003, t });
const mk = (families = ["LOW4H"]) => newEntry({ mint: "M", pool: "P", ag: "A1", t: 1000, families, features: {}, mc: 1e5, px: 1 });
const yes = () => true, no = () => false;
// a tiny driver: `cur` is the state in force; ev(newState) = orders due before it run on the old state, then it is observed
function drv(e, s0) { let cur = s0; return { ev(s, trusted = yes) { advance(e, s.t, cur, trusted); cur = s; observe(e, s, s.t); }, tick(t, trusted = yes) { advance(e, t, cur, trusted); }, get cur() { return cur; } }; }
const trail = (e, stop, stall = false) => e.versions.find((v) => v.stop === stop && v.policy === "trail" && v.stall === stall);
const scale = (e, stop) => e.versions.find((v) => v.stop === stop && v.policy === "scale" && !v.stall);

test("buy fills AT signal + 1 s from the state in force then — no other trader is needed, and a later swap does not move the fill", () => {
  const e = mk(), d = drv(e, st(200, 999));
  d.tick(1000.5); assert.equal(e.status, "pending");
  d.tick(1001.2); assert.equal(e.status, "filled"); assert.equal(e.fill.t, 1001); assert.equal(e.fill.delay_s, 0); assert.equal(e.fill.state_age_s, 2);
  const e2 = mk(), d2 = drv(e2, st(200, 999)); d2.ev(st(400, 1005));         // first swap after the signal arrives 5 s later, at double the price
  assert.equal(e2.fill.t, 1001); assert.equal(e2.fill.quote_sol, 200, "priced on the state in force at 1001, not on the later swap");
});

test("a swap landing inside the 1 s delay IS the state in force at the scheduled time", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.ev(st(260, 1000.6)); d.tick(1001.1);
  assert.equal(e.fill.quote_sol, 260);
});

test("buy pricing timeout: no trustworthy state within 5 s → cancelled as a data timeout; a trustworthy state inside 5 s is used with its delay", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1003, no); assert.equal(e.status, "pending"); d.tick(1006.1, no);
  assert.equal(e.status, "cancelled"); assert.match(e.flags[0], /pricing\/data timeout/);
  const e2 = mk(); advance(e2, 1002, st(200, 999), no); observe(e2, st(210, 1003), 1003);
  assert.equal(e2.status, "filled"); assert.equal(e2.fill.delay_s, 2); assert.equal(e2.fill.quote_sol, 210);
});

test("four trailing stops exit independently; the sale prices at trigger + 0.7 s on the state in force then — not at the trigger level", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001);
  d.ev(st(380, 1100));                        // peak (below 2× so the scale policy stays out of this test)
  d.ev(st(290, 1200));                        // ≈ −24% in pool SOL → the 20% stop triggers; 25/30/40 do not
  assert.equal(trail(e, 0.2).status, "selling"); assert.equal(trail(e, 0.25).status, "open"); assert.equal(trail(e, 0.4).status, "open");
  d.ev(st(150, 1200.3));                      // a dump lands 0.3 s later, BEFORE trigger + 0.7 s → it is the state in force at 1200.7
  d.tick(1200.9);
  const x = trail(e, 0.2); assert.equal(x.status, "closed"); assert.equal(x.exit.t, 1200.7); assert.equal(x.exit.delay_s, 0);
  assert.ok(x.exit.sol < x.trigValue * 0.6, "sold far below the trigger value: a trailing stop is a trigger, not a guaranteed price");
  assert.equal(trail(e, 0.4).status, "selling"); // the dump took the 40% version through its own stop
});

test("a triggered sell survives a data failure: it waits, records the real delay, and is never dropped — even past 24 h", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001); d.ev(st(380, 1100)); d.ev(st(280, 1200));
  d.tick(1260, no); assert.equal(trail(e, 0.2).status, "selling");
  advance(e, 1300, d.cur, no); observe(e, st(100, 1300), 1300);              // first trustworthy state 99.3 s late, much lower
  const x = trail(e, 0.2); assert.equal(x.status, "closed"); assert.ok(Math.abs(x.exit.delay_s - 99.3) < 1e-6); assert.ok(x.exit.ret < -0.4);
  // no price for more than 24 h: marked unresolved (visible exposure) but STILL pending, still asking, and it closes when a price returns
  const e2 = mk(), d2 = drv(e2, st(200, 999)); d2.tick(1001); d2.ev(st(380, 1100)); d2.ev(st(280, 1200)); d2.tick(1200.7 + 86401, no);
  const y = trail(e2, 0.2); assert.equal(y.status, "selling"); assert.ok(y.unresolvedSince, "flagged unresolved"); assert.equal(unresolvedCount(e2), e2.versions.filter((v) => v.unresolvedSince).length);
  assert.ok(inventories(e2).length > 0, "its inventory is still requested"); assert.equal(entryDone(e2), false);
  const t3 = 1200.7 + 90000; advance(e2, t3, d2.cur, no); observe(e2, st(150, t3), t3);
  assert.equal(y.status, "closed"); assert.ok(y.exit.was_unresolved_s > 3000); assert.ok(y.exit.delay_s > 86400);
});

test("CONT-STALL: at fill + 60 min, closes if after-cost value never reached 1.15× cost; plain CONT is unaffected", () => {
  const e = mk(["CONT", "CONT-STALL"]), d = drv(e, st(200, 999)); d.tick(1001); d.ev(st(220, 2000)); d.tick(1001 + 3600 + 1);
  for (const v of versionsFor(e, "CONT-STALL")) { assert.equal(v.reason, "stall"); assert.equal(v.status, "closed"); assert.equal(v.exit.t, 1001 + 3600 + 0.7); }
  for (const v of versionsFor(e, "CONT")) assert.equal(v.status, "open");
  const e2 = mk(["CONT", "CONT-STALL"]), d2 = drv(e2, st(200, 999)); d2.tick(1001); d2.ev(st(260, 2000)); d2.ev(st(250, 2100)); d2.tick(1001 + 3601);
  for (const v of versionsFor(e2, "CONT-STALL")) assert.notEqual(v.reason, "stall"); // peaked above 1.15× → survives
});

test("24 h maximum hold from the fill, on a quiet coin, with no further trade needed", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001); d.tick(1001 + 86400 + 5);
  for (const v of e.versions) { assert.equal(v.reason, "max-hold"); assert.equal(v.status, "closed"); assert.equal(v.exit.hold_s, 86401); }
  assert.ok(e.versions[0].exit.ret < 0 && e.versions[0].exit.ret > -0.02, "flat price → small loss = fees + impact + transaction costs");
});

test("scale-out: half the ORIGINAL tokens sold when full value reaches 2× cost; the rest trails on a normalised high-water mark", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001); const tok = e.fill.tok;
  d.ev(st(420, 1100));                        // full liquidation value ≥ 2× cost → scale trigger
  assert.equal(scale(e, 0.25).status, "scaling"); assert.equal(trail(e, 0.25).status, "open");
  d.tick(1101);
  const v = scale(e, 0.25); assert.equal(v.status, "open"); assert.ok(Math.abs(v.tok - tok / 2) < 1e-6); assert.ok(v.half.sol > 0.19 && v.half.sol < 0.23);
  assert.ok(Math.abs(v.peak - liqValue(d.cur, tok / 2)) < 1e-9, "selling half is not a 50% drawdown: the peak is rescaled to the remaining tokens");
  d.ev(st(400, 1150)); assert.equal(v.status, "open");                        // −5%: nowhere near the 25% trail
  d.ev(st(300, 1200)); d.tick(1201);                                          // −28.6% from 420 → trail on the remainder
  assert.equal(v.status, "closed"); assert.equal(v.reason, "trail");
  const expectLast = sellSol(st(300, 0), tok / 2) - 0.0005; assert.ok(Math.abs(v.exit.last_sol - expectLast) < 1e-9);
  assert.ok(Math.abs(v.exit.sol - (v.half.sol + expectLast)) < 1e-12); assert.ok(v.exit.ret > trail(e, 0.25).exit.ret, "here banking half at 2× beat the pure trail");
});

test("scale-out never sells the same tokens twice: a trail trigger during the pending half-sale becomes ONE full sale", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001); d.ev(st(420, 1100)); const v = scale(e, 0.2); assert.equal(v.status, "scaling");
  d.ev(st(300, 1100.3));                      // collapses before the half-sale's 0.7 s is up
  assert.equal(v.status, "selling"); assert.equal(v.reason, "trail"); d.tick(1102);
  assert.equal(v.status, "closed"); assert.equal(v.half, null); assert.ok(Math.abs(v.exit.sol - (sellSol(st(300, 0), e.fill.tok) - 0.0005)) < 1e-9);
});

test("runner tracking continues after an exit and is separate from realised profit", () => {
  const e = mk(), d = drv(e, st(200, 999)); d.tick(1001); d.ev(st(150, 1100)); d.tick(1102); d.ev(st(700, 5000));
  assert.ok(trail(e, 0.2).status === "closed" && trail(e, 0.2).exit.ret < 0); assert.ok(e.runner.reached[2] && e.runner.reached[3]); assert.ok(e.runner.maxX >= 3);
});

test("liquidation value = effective-reserve quote, less the pool's sell fee, less the transaction cost", () => {
  const s = st(200, 0), tok = 1e5, gross = (200 * tok) / (2e8 + tok); assert.ok(Math.abs(liqValue(s, tok) - (gross * 0.997 - 0.0005)) < 1e-12); assert.equal(COST, 0.2005);
});
