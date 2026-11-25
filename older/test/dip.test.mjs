// older-11 — DIP15K: a coin that has been to $100K or more comes down into $5K–$15K (owner, 25 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", dips = (e) => [...e.entries.values()].filter((x) => x.families.includes("DIP15K"));
const mk = (books = "older-11") => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); if (books) e.setBooks(S.booksOf(books)); return e; };
// watched from $120K down to `end`, a trade every 20 s
const fall = (e, steps) => { let t = T0; for (const mc of steps) { swap(e, t, mc); t += 20; } return t; };

test("DIP15K: a watched peak of $120K, then the fall — bought at the first trade at or under $15K (still $5K or more), below the other books' $40K floor", () => {
  const e = mk(); fall(e, [120_000, 90_000, 60_000, 30_000, 16_000]); assert.equal(dips(e).length, 0, "$16K is not in yet");
  swap(e, T0 + 100, 14_000); const d = dips(e); assert.equal(d.length, 1); assert.equal(d[0].ag, "A0"); assert.equal(Math.round(d[0].signalMc), 14_000);
  const c = d[0].cands.find((x) => x.family === "DIP15K").detail; assert.equal(c.peak_watched_mc, 120_000); assert.equal(c.peak_evidence, "watched"); assert.equal(c.prev_mc, 16_000); assert.ok(Math.abs(c.fall - (1 - 14 / 120)) < 1e-3);
  swap(e, T0 + 120, 14_000); swap(e, T0 + 125, 14_000); assert.equal(d[0].status, "filled");
  swap(e, T0 + 140, 20_000); swap(e, T0 + 160, 13_000); assert.equal(dips(e).length, 1, "one buy per coin and age group: a second crossing does not buy again (buying again is a separate switch)");
});
test("DIP15K is not bought: without a watched $100K peak; when the coin falls through the whole band in one step; when it is first seen already inside the band; or in a legacy run", () => {
  const a = mk(); fall(a, [80_000, 40_000, 16_000, 14_000]); assert.equal(dips(a).length, 0, "peak watched was $80K");
  const b = mk(); fall(b, [120_000, 60_000, 16_000, 4_000]); assert.equal(dips(b).length, 0, "from $16K straight to $4K");
  const c = mk(); fall(c, [12_000, 11_000, 13_000]); assert.equal(dips(c).length, 0, "first seen at $12K: nothing was watched arriving");
  const L = mk(null); fall(L, [120_000, 60_000, 16_000, 14_000]); assert.equal(dips(L).length, 0, "legacy run: the book is off"); assert.ok(L.stats.inactiveCands >= 1);
});
test("DIP15K with the owner's gates: the provider's all-time high stands in for the watched peak, and decides at the buy", async () => {
  const mkG = (ath) => { const e = mk(); e.gates = S.GATES_11; let now = T0; e.clock = () => now; const info = { ath_price: ath, total_fee: "20", link: { twitter_username: "x/status/1" }, stat: { top_10_holder_rate: "0.22", top_bundler_trader_percentage: "0.1", top_rat_trader_percentage: "0.05", top70_sniper_hold_rate: "0.01" } };
    e.readGate = () => Promise.resolve(info); e.at = (t) => { now = t; return new Promise((r) => setImmediate(r)); }; return e; };
  const a = mkG(0.00025); fall(a, [80_000, 40_000, 16_000]); await a.at(T0 + 60.2); swap(a, T0 + 61, 14_000); await a.at(T0 + 61.3);
  const d = dips(a); assert.equal(d.length, 1, "peak watched was only $80K, but the gates are on"); assert.equal(d[0].cands[0].detail.peak_evidence, "provider all-time high (tested at the buy)");
  swap(a, T0 + 64, 14_000); swap(a, T0 + 65, 14_000); assert.equal(d[0].status, "filled"); assert.equal(d[0].gate.verdict, "pass"); assert.equal(Math.round(d[0].gate.reading.ath_usd), 250_000);
  const b = mkG(0.00006); fall(b, [80_000, 40_000, 16_000]); swap(b, T0 + 61, 14_000); const x = dips(b)[0]; await b.at(T0 + 61.3); swap(b, T0 + 64, 14_000); // (a cancelled entry leaves the engine's memory: keep the object)
  assert.equal(x.status, "cancelled"); assert.deepEqual(x.gate.fails, ["all-time high $60K: has not reached $100K"]);
});
