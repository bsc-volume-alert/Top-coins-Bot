import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/spec.mjs";
import { bookRows, overlap } from "../src/report.mjs";
import { newEntry, advance, observe } from "../src/book.mjs";
const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
test("1,656 rows (828 pure-trailing + 828 scale-out; VOL100K and DIP15K added in older-11, then the four new-coin books in A0); a shared entry feeds each of its families' rows; CONT-STALL reads only stall versions", () => {
  const a = newEntry({ mint: "M1", pool: "P", ag: "A1", t: 0, families: ["LOW4H", "SLOW-BUILD"], features: {}, mc: 1e5, px: 1 });
  const b = newEntry({ mint: "M2", pool: "P", ag: "A2", t: 0, families: ["CONT", "CONT-STALL"], features: {}, mc: 1e5, px: 1, startup: true });
  for (const e of [a, b]) { advance(e, 1.5, st(200, 0), yes); observe(e, st(100, 100), 100); advance(e, 101, st(100, 100), yes); }
  const rows = bookRows([a, b]); assert.equal(rows.length, 138 * S.STOPS.length * S.POLICIES.length); assert.equal(rows.filter((r) => r.policy === "trail").length, 138 * S.STOPS.length);
  const r = (f, ag, s, p = "trail") => rows.find((x) => x.family === f && x.ag === ag && x.stop === s && x.policy === p);
  assert.equal(r("LOW4H", "A1", 0.2).closed, 1); assert.equal(r("SLOW-BUILD", "A1", 0.2).closed, 1); assert.equal(r("LOW4H", "A2", 0.2).closed, 0);
  assert.equal(r("CONT-STALL", "A2", 0.4).closed, 1); assert.equal(r("CONT", "A2", 0.4, "scale").closed, 1); assert.ok(r("LOW4H", "A1", 0.2).avg_ret < -0.4);
  assert.equal(r("LOW4H", "A1", 0.2).loss40, 1); assert.equal(r("CONT", "A2", 0.2).startup_entries, 1); assert.ok(r("CONT", "A2", 0.2).startup_net_sol < 0);
  const o = overlap([a, b]).find((x) => x.a === "LOW4H" && x.b === "SLOW-BUILD"); assert.equal(o.shared_entries, 1);
});
