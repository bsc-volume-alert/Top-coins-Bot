// older-11 — the six HIT books (owner, 27 Nov 2026 11:50 UK): a coin whose migration was watched reaches $50K / $100K —
// bought at once, or 5 / 10 minutes later only if it is still at or over the line. See spec HIT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as tick } from "node:timers/promises";
import { mkEngine, swap, T0 } from "./helpers.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", of = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f)), det = (en, f) => en.cands.find((c) => c.family === f).detail;
/** a pool created at T0 (seen by the feed), the six books on. NO creation time is given: these books run on the migration clock. */
const mk = (opts = {}, books = S.HIT_BOOKS) => { const e = mkEngine(opts); e.feedUp(T0 - 60); e.rebuy = false; if (books) e.setBooks(books); e.coin(M, { pool: "PoolA" }); e.historyFrom(M, T0); e.migrated(M, T0); e.saved = []; e.store = { saveNote: (m, n) => e.saved.push(n), saveEntry() {}, saveDecision() {}, feedEvent() {} }; return e; };
const notes = (e, f) => e.saved.filter((n) => n.family === f).map((n) => n.reason);

test("the six books exist, are off in a legacy and an older-11 run, and each has the young age group only", () => {
  assert.deepEqual(S.HIT_BOOKS, ["HIT50-NOW", "HIT50-5M", "HIT50-10M", "HIT100-NOW", "HIT100-5M", "HIT100-10M"]); assert.deepEqual(S.HIT_LINES, [50_000, 100_000]);
  for (const f of S.HIT_BOOKS) { assert.ok(S.FAMILIES.includes(f)); assert.ok(!S.BOOKS_LEGACY.includes(f), f + " is not a legacy book"); assert.ok(!S.BOOKS_11.includes(f)); assert.deepEqual(S.agesOf(f).map((a) => a[0]), ["A0"]); }
  assert.deepEqual(S.booksOf("VOL100K,HIT50-NOW,HIT100-10M"), ["VOL100K", "HIT50-NOW", "HIT100-10M"], "a run names the books it wants");
});

test("buy at once: a migrated coin seen under the line is bought at the first trade at or over it — $50K, then $100K — with no creation time known, once per book", () => {
  const e = mk(); swap(e, T0 + 2, 30_000); swap(e, T0 + 10, 42_000); assert.equal(e.entries.size, 0, "under both lines: nothing");
  swap(e, T0 + 20, 61_000, { sol: 50 }); const a = of(e, "HIT50-NOW"); assert.equal(a.length, 1); assert.equal(a[0].ag, "A0"); assert.deepEqual(a[0].families, ["HIT50-NOW"]); assert.equal(Math.round(a[0].signalMc), 61_000);
  const d = det(a[0], "HIT50-NOW"); assert.equal(d.line_usd, 50_000); assert.equal(d.wait_s, 0); assert.equal(d.hit_mc, 61_000); assert.equal(d.prev_mc, 42_000); assert.equal(d.since_mig_s, 20); assert.ok(d.vol_since_mig_usd >= 5000, "volume since the pool opened: " + d.vol_since_mig_usd);
  assert.equal(a[0].features.age_s, null, "no creation time: the age is unknown, never a made-up number"); assert.equal(a[0].evidence.trigger.since_mig_s, 20); assert.equal(a[0].age_basis, "migration (pool-creation event seen by the feed)");
  assert.equal(of(e, "HIT100-NOW").length, 0);
  swap(e, T0 + 30, 95_000); swap(e, T0 + 40, 130_000); const b = of(e, "HIT100-NOW"); assert.equal(b.length, 1); assert.equal(det(b[0], "HIT100-NOW").prev_mc, 95_000); assert.equal(det(b[0], "HIT100-NOW").since_mig_s, 40);
  swap(e, T0 + 41, 130_000); swap(e, T0 + 42, 130_000); assert.equal(a[0].status, "filled", a[0].flags.join("; ")); assert.equal(b[0].status, "filled"); assert.equal(a[0].fill.exec, "reconstructed-pool-state");
  swap(e, T0 + 60, 40_000); swap(e, T0 + 80, 70_000); swap(e, T0 + 90, 120_000); assert.equal(of(e, "HIT50-NOW").length, 1, "a second crossing does not buy again"); assert.equal(of(e, "HIT100-NOW").length, 1);
  assert.equal(e.stats.noCreation > 0, true, "the age-based books still wait for the creation time");
});

test("the wait books: judged once at the first trade at or after hit + 5 / 10 minutes — bought if still at or over the line, never if it has fallen under", () => {
  const e = mk(); swap(e, T0 + 5, 30_000); swap(e, T0 + 15, 55_000); assert.equal(of(e, "HIT50-NOW").length, 1); // the hit: T0 + 15
  swap(e, T0 + 200, 80_000); swap(e, T0 + 314, 45_000); assert.equal(of(e, "HIT50-5M").length, 0, "one second before the end of the wait: not judged");
  swap(e, T0 + 318, 72_000); const w = of(e, "HIT50-5M"); assert.equal(w.length, 1, "5 minutes after the hit and over the line: bought"); const d = det(w[0], "HIT50-5M");
  assert.equal(d.wait_s, 300); assert.equal(d.late_s, 3); assert.equal(d.mc_at_wait, 72_000); assert.equal(d.hit_mc, 55_000); assert.equal(d.since_mig_s, 15); assert.equal(Math.round(w[0].signalMc), 72_000);
  swap(e, T0 + 500, 90_000); swap(e, T0 + 620, 48_000); assert.equal(of(e, "HIT50-10M").length, 0, "under the line at the end of the 10 minutes"); assert.deepEqual(notes(e, "HIT50-10M"), ["fell under the line by the end of the wait (not bought)"]);
  swap(e, T0 + 640, 99_000); swap(e, T0 + 700, 99_000); assert.equal(of(e, "HIT50-10M").length, 0, "judged once: a later recovery does not buy"); assert.equal(of(e, "HIT50-5M").length, 1);
  // the $100K books have their own hit and their own waits
  swap(e, T0 + 800, 105_000); assert.equal(of(e, "HIT100-NOW").length, 1); swap(e, T0 + 1099, 150_000); assert.equal(of(e, "HIT100-5M").length, 0);
  swap(e, T0 + 1101, 99_000); assert.equal(of(e, "HIT100-5M").length, 0); assert.deepEqual(notes(e, "HIT100-5M"), ["fell under the line by the end of the wait (not bought)"]);
  swap(e, T0 + 1500, 140_000); const t = of(e, "HIT100-10M"); assert.equal(t.length, 1); assert.equal(det(t[0], "HIT100-10M").late_s, 100, "a quiet coin: judged at its next trade, and how late that was is recorded");
});

test("never bought: a coin first seen at or over the line; a coin not watched from its migration; a line reached during an unobserved stretch; a book that is off", () => {
  const a = mk(); swap(a, T0 + 1, 120_000); swap(a, T0 + 5, 40_000); swap(a, T0 + 9, 130_000); assert.equal(a.entries.size, 0, "opened over both lines: it never hit them in front of us");
  assert.match(notes(a, "HIT100-NOW")[0], /never hit the line in front of us/); assert.match(notes(a, "HIT50-NOW")[0], /never hit the line in front of us/);
  const b = mk(); swap(b, T0 + 1, 70_000); swap(b, T0 + 5, 90_000); swap(b, T0 + 9, 110_000); assert.equal(of(b, "HIT50-NOW").length, 0, "opened over $50K"); assert.equal(of(b, "HIT100-NOW").length, 1, "…but it did hit $100K");
  const c = mk(); swap(c, T0 + 200, 30_000); swap(c, T0 + 210, 60_000); assert.equal(c.entries.size, 0, "first observed more than two minutes after the migration");
  const d = mk(); swap(d, T0 + 5, 30_000); d.feedDown(T0 + 10); d.feedUp(T0 + 40); swap(d, T0 + 45, 60_000); swap(d, T0 + 50, 40_000); swap(d, T0 + 55, 65_000); assert.equal(d.entries.size, 0, "the feed was down between the last trade under the line and the first over it");
  assert.match(notes(d, "HIT50-NOW")[0], /stretch that was not observed/);
  const off = mk({}, null); swap(off, T0 + 5, 30_000); swap(off, T0 + 15, 60_000); swap(off, T0 + 25, 120_000); assert.equal(off.entries.size, 0, "legacy run: the books are off"); assert.equal(off.stats.hitEvals, undefined, "…and not even evaluated");
  const one = mk({}, ["HIT100-NOW"]); swap(one, T0 + 5, 30_000); swap(one, T0 + 15, 60_000); swap(one, T0 + 25, 120_000); assert.deepEqual([...one.entries.values()].map((x) => x.families.join()), ["HIT100-NOW"], "only the book the run switched on");
  const old = mkEngine(); old.feedUp(T0 - 60); old.setBooks(S.HIT_BOOKS); old.coin(M, { pool: "PoolA" }); swap(old, T0 + 5, 30_000); swap(old, T0 + 15, 60_000); assert.equal(old.entries.size, 0, "a pool whose creation was not seen is not followed");
});

test("the transfer-fee reading: asked for at the migration; a hit while it is still unread is not bought and is recorded; the waits still run", () => {
  const f = mkEngine({ tokens: null }); f.feedUp(T0 - 60); f.rebuy = false; f.setBooks(S.HIT_BOOKS); f.saved = []; f.store = { saveNote: (m, n) => f.saved.push(n), saveEntry() {}, saveDecision() {}, feedEvent() {} };
  f.coin(M, { pool: "PoolA", info: { token_program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" } }); f.historyFrom(M, T0); f.migrated(M, T0); assert.equal(f.coins.get(M).feeWanted, T0, "the reading is asked for when the pool is created");
  swap(f, T0 + 3, 30_000); swap(f, T0 + 8, 60_000); assert.equal(f.entries.size, 0); assert.equal(f.stats.hitFeeUnread, 1); assert.match(notes(f, "HIT50-NOW")[0], /transfer fee had not been read/);
  f.coins.get(M).info.risk = { src: "rpc mint account", status: "clean", fee_bps: 0, read_at: T0 + 9 }; // the reader answers
  swap(f, T0 + 20, 110_000); assert.equal(of(f, "HIT100-NOW").length, 1, "the next line is bought normally"); assert.equal(of(f, "HIT50-NOW").length, 0, "the missed hit is not bought late");
  swap(f, T0 + 309, 80_000); assert.equal(of(f, "HIT50-5M").length, 1, "the 5-minute book still judges the $50K hit of T0 + 8"); assert.equal(det(of(f, "HIT50-5M")[0], "HIT50-5M").hit_mc, 60_000);
});

test("with the owner's checks as labels: a HIT buy asks for one reading and is bought whatever it says, carrying the reading", async () => {
  const e = mk(); e.gates = S.GATES_11; e.gateMode = "label"; let now = T0; e.clock = () => now; let asked = 0;
  e.readGate = () => { asked++; return Promise.resolve({ ath_price: 0.0004, total_supply: "1000000000", total_fee: "20", holder_count: 412, link: { twitter_username: "x" }, stat: { top_10_holder_rate: "0.5", top_bundler_trader_percentage: "0.1", top_rat_trader_percentage: "0.05", top70_sniper_hold_rate: "0.01" } }); };
  swap(e, T0 + 5, 30_000); swap(e, T0 + 15, 60_000); const en = of(e, "HIT50-NOW")[0]; assert.ok(en, "signal taken"); now = T0 + 15.3; await tick(); await tick();
  swap(e, T0 + 17, 60_000); swap(e, T0 + 18, 60_000); assert.equal(en.status, "filled", en.flags.join("; ")); assert.equal(asked, 1); assert.ok(en.gate, "the reading is on the buy"); assert.equal(en.gate.info?.top10 ?? en.gate.top10 ?? 0.5, 0.5);
});
