import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
const setup = (createAgo = 9 * H) => { const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - createAgo }); return e; };
const has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f));

test("FAST: fresh-crossing times differ by window — 5M fires first, 1M later; entries are shared only when signals fire together", () => {
  const e = setup(); path(e, T0, T0 + 600, () => 100_000, 10);
  // a steady climb: +1%/10 s. 5-min low is the flat 100K → FAST-5M (2×) when price hits 200K; the 1-min low trails the price, so FAST-1M never doubles
  let mc = 100_000; for (let t = T0 + 600; t < T0 + 600 + 290; t += 10) { mc *= 1.03; swap(e, t, mc); }
  const f5 = has(e, "FAST-5M"); assert.equal(f5.length, 1); assert.equal(has(e, "FAST-1M").length, 0);
  assert.ok(has(e, "FAST150-5M")[0].decisionT < f5[0].decisionT, "the 1.5× version of the same window fires earlier and is its own entry");
  assert.ok(f5[0].evidence.obs.length > 10 && f5[0].evidence.prev && f5[0].evidence.trigger.quote_eff > 0, "window observations, previous observation and trigger inputs stored once on the entry");
});

test("FAST-1M: a sudden double inside one minute fires all three windows on the same update → one shared entry", () => {
  const e = setup(); path(e, T0, T0 + 600, () => 100_000, 10);
  swap(e, T0 + 605, 150_000); swap(e, T0 + 610, 205_000);
  const f1 = has(e, "FAST-1M"); assert.equal(f1.length, 1);
  assert.ok(f1[0].families.includes("FAST-3M") && f1[0].families.includes("FAST-5M"));
  assert.ok(!f1[0].families.includes("FAST150-1M"), "the 1.5× crossing happened on the earlier update (150K) and is a different entry");
  assert.equal(has(e, "FAST150-1M")[0].signalMc < 151_000, true);
});

test("FAST window boundary: a low just outside the 60 s window does not count; the price standing at the window start does", () => {
  const e = setup(); path(e, T0, T0 + 600, () => 100_000, 10);
  swap(e, T0 + 600, 150_000);                         // price standing from here
  swap(e, T0 + 665, 205_000);                         // 65 s later: the 100K prints are outside 60 s; the standing price in the window is 150K
  assert.equal(has(e, "FAST-1M").length, 0); assert.equal(has(e, "FAST-3M").length, 1);
});

test("FAST needs a covered window: nothing fires across a feed outage, and held (replayed) events never create signals", () => {
  const e = setup(); path(e, T0, T0 + 600, () => 100_000, 10);
  e.feedDown(T0 + 601); e.feedUp(T0 + 620); swap(e, T0 + 621, 210_000); swap(e, T0 + 630, 215_000);
  assert.equal(has(e, "FAST-1M").length + has(e, "FAST-3M").length + has(e, "FAST-5M").length, 0);
  const e2 = setup(); path(e2, T0, T0 + 600, () => 100_000, 10);
  e2.onSwap({ t: T0 + 605, mint: "MintAAApump", pool: "PoolA", base: 2e8, quote: (210_000 / 1e11) * 2e8, feeBps: 30, sol: 1, isBuy: true, user: "u", replay: true });
  assert.equal(e2.entries.size, 0);
});

test("SECOND-WAVE: seed on a 2× FAST trigger → ≥ 25% pullback freezes the high → buy strictly above it; one attempt; expires after 60 min", () => {
  const e = setup(); path(e, T0, T0 + 600, () => 100_000, 10);
  swap(e, T0 + 605, 205_000);                         // seed (FAST fires)
  swap(e, T0 + 700, 260_000);                         // running high H = 260K
  swap(e, T0 + 800, 190_000);                         // ≤ 0.75 × 260K → frozen high 260K
  swap(e, T0 + 900, 260_000); assert.equal(has(e, "SECOND-WAVE").length, 0, "equal to the frozen high is not strictly above");
  swap(e, T0 + 910, 262_000);
  const sw = has(e, "SECOND-WAVE"); assert.equal(sw.length, 1);
  const d = sw[0].cands.find((c) => c.family === "SECOND-WAVE").detail; assert.ok(Math.abs(d.frozen_high / (260_000 / 1e9) - 1) < 1e-9); assert.deepEqual(d.seed_windows.sort(), ["FAST-1M", "FAST-3M", "FAST-5M"]);
  swap(e, T0 + 1000, 150_000); swap(e, T0 + 1100, 300_000); assert.equal(has(e, "SECOND-WAVE").length, 1, "no repeated attempt in the age group");

  const e2 = setup(); path(e2, T0, T0 + 600, () => 100_000, 10); swap(e2, T0 + 605, 205_000); swap(e2, T0 + 800, 150_000);
  swap(e2, T0 + 605 + 3601, 210_000); assert.equal(has(e2, "SECOND-WAVE").length, 0, "reclaim after 60 min is expired");
});

test("90-day ceiling at entry: a coin older than 90 days is not evaluated; exactly the same move on an 89-day coin enters", () => {
  const old = setup(91 * 24 * H); path(old, T0, T0 + 600, () => 100_000, 10); swap(old, T0 + 605, 210_000); assert.equal(old.entries.size, 0); assert.ok(old.stats.tooOld > 0);
  const ok = setup(89 * 24 * H); path(ok, T0, T0 + 600, () => 100_000, 10); swap(ok, T0 + 605, 210_000); assert.ok(has(ok, "FAST-1M").length === 1); assert.equal(has(ok, "FAST-1M")[0].ag, "A4");
});

test("SOL/USD stale: new entries are suspended, open positions are still managed in SOL, and the stale period is not covered history", () => {
  let usd = 100; const e = mkEngine({ solUsd: () => usd }); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  path(e, T0, T0 + 600, () => 100_000, 10); swap(e, T0 + 605, 150_000); swap(e, T0 + 610, 205_000); swap(e, T0 + 620, 206_000);
  const pos = has(e, "FAST-1M")[0]; assert.equal(pos.status, "filled"); const n = e.entries.size;
  usd = null; swap(e, T0 + 700, 90_000); swap(e, T0 + 702, 90_000);         // price collapses while the USD reference is stale
  assert.ok(pos.versions.filter((v) => v.policy === "trail").every((v) => v.status === "closed"), "stops still sold");
  usd = 100; swap(e, T0 + 760, 90_000); swap(e, T0 + 770, 200_000);
  assert.equal(e.entries.size, n, "no new entry from a window that spans the stale period");
});

test("startup tag: entries in the first 24 h after the project's first start are tagged, later ones are not", () => {
  const e = mkEngine({ firstStart: T0 }); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  path(e, T0, T0 + 600, () => 100_000, 10); swap(e, T0 + 605, 210_000); assert.equal([...e.entries.values()][0].startup, true);
  const e2 = mkEngine({ firstStart: T0 - 2 * 86400 }); e2.feedUp(T0); e2.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  path(e2, T0, T0 + 600, () => 100_000, 10); swap(e2, T0 + 605, 210_000); assert.equal([...e2.entries.values()][0].startup, false);
});
