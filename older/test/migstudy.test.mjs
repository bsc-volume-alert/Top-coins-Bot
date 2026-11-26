// the migration study's replay helpers (src/migstudy.mjs): pure arithmetic on one-minute bars
import test from "node:test";
import assert from "node:assert/strict";
import { priceAt, trail, replay, summarise } from "../src/migstudy.mjs";

const bar = (m, o, h, l, c) => ({ m, o, h, l, c });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test("the price at a moment is the open of the next minute; a quiet coin gives its last close and says how quiet", () => {
  const bars = [bar(100, 1, 1.2, 0.9, 1.1), bar(101, 1.1, 1.3, 1.0, 1.25), bar(105, 2, 2.1, 1.9, 2)];
  assert.deepEqual(priceAt(bars, 100 * 60 + 30), { px: 1.1, m: 101, quiet_min: 0, from: 1 }); // 30 s into minute 100 → minute 101 opens at 1.1
  assert.deepEqual(priceAt(bars, 101 * 60), { px: 1.1, m: 101, quiet_min: 0, from: 1 });      // exactly on the minute
  assert.deepEqual(priceAt(bars, 102 * 60 + 1), { px: 1.25, m: 103, quiet_min: 1, from: 2 });   // nothing traded in 102–104: last close, one whole quiet minute
  assert.deepEqual(priceAt(bars, 99 * 60), { px: 1, m: 100, quiet_min: 0, from: 0 });        // just before the first bar: its open
  assert.equal(priceAt(bars, 90 * 60), null);                                              // well before any bar: no price
  assert.equal(priceAt([], 6000), null);
});

test("a trailing stop: sold at the level, or cautiously at the minute's close when it closed under the level", () => {
  // bought at 1.00 in minute 10; minute 10 itself then trades 1.00 → high 1.50 → close 1.40; minute 11 falls to 0.50 and closes 0.60
  const bars = [bar(10, 1, 1.5, 1, 1.4), bar(11, 1.4, 1.4, 0.5, 0.6)];
  const t = trail(bars, 0, 1, 10, 0.25); // peak 1.5 → level 1.125
  near(t.best, 0.125); near(t.cautious, -0.4); assert.equal(t.hold_min, 1); assert.equal(t.open, false);
  // a minute that dips under the level and closes back above it: both versions sell at the level
  const u = trail([bar(10, 1, 1.5, 1, 1.4), bar(11, 1.4, 1.45, 1.1, 1.3)], 0, 1, 10, 0.25); near(u.best, 0.125); near(u.cautious, 0.125);
  // a minute that OPENS under the level: sold at the open in both versions
  const g = trail([bar(10, 1, 1.5, 1, 1.4), bar(12, 0.7, 0.8, 0.6, 0.7)], 0, 1, 10, 0.25); near(g.best, -0.3); near(g.cautious, -0.3); assert.equal(g.why, "opened under the stop");
  // the low is tested BEFORE the same minute's high (cautious order): a minute 1.00 → low 0.70 → high 2.00 is a sale, not a peak
  const o = trail([bar(10, 1, 2, 0.7, 1.9)], 0, 1, 10, 0.25); near(o.best, -0.25); near(o.cautious, -0.25);
  // a new high inside the minute and a close under the NEW level: best at that level, cautious at the close
  const h = trail([bar(10, 1, 2, 0.9, 1.2)], 0, 1, 10, 0.25); near(h.best, 0.5); near(h.cautious, 0.2); assert.equal(h.why, "stop after a new high");
  // never stopped before the data ends: open, valued at the last close
  const e = trail([bar(10, 1, 1.2, 0.95, 1.1), bar(11, 1.1, 1.3, 1.05, 1.3)], 0, 1, 10, 0.25); assert.equal(e.open, true); near(e.best, 0.3);
  // the 24-hour limit: sold at the open of the first minute past it
  const d = trail([bar(10, 1, 1.1, 0.95, 1), bar(10 + 1441, 1.05, 1.1, 1, 1.05)], 0, 1, 10, 0.25); assert.equal(d.why, "24 h"); near(d.best, 0.05);
});

test("a replayed buy: highest multiple, values after set minutes, every stop; and the group summary", () => {
  const bars = [bar(9, 0.9, 1, 0.9, 1), bar(10, 1, 1.5, 1, 1.4), bar(11, 1.4, 3, 1.3, 2.8), bar(12, 2.8, 2.9, 0.2, 0.3)];
  const r = replay(bars, { px: 1, m: 10, from: 1 });
  near(r.high, 3); assert.equal(r.high_min, 1); near(r.low, 0.2); near(r.at[5], 0.3); near(r.at[15], 0.3);
  near(r.stops[25].best, 3 * 0.75 - 1); near(r.stops[25].cautious, 0.3 - 1); // minute 12: level 2.25, closed at 0.30
  near(r.stops[70].best, 3 * 0.3 - 1); near(r.stops[70].cautious, 0.3 - 1);
  const s = summarise([{ r }, { r: replay([bar(10, 1, 1.05, 0.5, 0.6)], { px: 1, m: 10, from: 0 }) }]);
  assert.equal(s.n, 2); assert.equal(s.reached_2x_pct, 50); assert.equal(s.never_up_10_pct, 50); assert.equal(s.fell_90_pct, 0);
  assert.equal(s.stops[25].cautious_wins, 0); assert.equal(s.stops[25].best_mean, +(100 * ((1.25 - 0.25) / 2)).toFixed(1));
  assert.deepEqual(summarise([]), { n: 0 });
});
