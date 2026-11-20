import { test } from "node:test";
import assert from "node:assert/strict";
import { bookRows, overlap } from "../src/report.mjs";
import { newEntry, onState } from "../src/book.mjs";
const st = (q, t) => ({ base: 2e8, quote: q, feeBps: 30, t });
test("112 rows; a shared entry feeds each of its families' rows; CONT-STALL reads only the stall versions", () => {
  const a = newEntry({ mint: "M1", pool: "P", ag: "A1", t: 0, families: ["LOW4H", "SLOW-BUILD"], features: {}, mc: 1e5, px: 1 });
  const b = newEntry({ mint: "M2", pool: "P", ag: "A2", t: 0, families: ["CONT", "CONT-STALL"], features: {}, mc: 1e5, px: 1 });
  for (const e of [a, b]) { onState(e, st(200, 1.5), 1.5); onState(e, st(100, 100), 100); onState(e, st(100, 101), 101); }
  const rows = bookRows([a, b]); assert.equal(rows.length, 112);
  const r = (f, ag, s) => rows.find((x) => x.family === f && x.ag === ag && x.stop === s);
  assert.equal(r("LOW4H", "A1", 0.2).closed, 1); assert.equal(r("SLOW-BUILD", "A1", 0.2).closed, 1); assert.equal(r("LOW4H", "A2", 0.2).closed, 0);
  assert.equal(r("CONT-STALL", "A2", 0.4).closed, 1); assert.ok(r("LOW4H", "A1", 0.2).avg_ret < -0.4);
  assert.equal(r("LOW4H", "A1", 0.2).loss40, 1);
  const o = overlap([a, b]).find((x) => x.a === "LOW4H" && x.b === "SLOW-BUILD"); assert.equal(o.shared_entries, 1);
});
