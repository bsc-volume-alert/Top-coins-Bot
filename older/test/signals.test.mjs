import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";

// coin created 4 h before the feed starts: at 8 h old it has exactly 4 h of covered history
function setup(createAgo = 4 * H) { const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - createAgo }); return e; }
// entries that include LOW4H (other families may also fire on the same synthetic path; each test checks its own family)
const fams = (e) => [...e.entries.values()].filter((x) => x.families.includes("LOW4H")).map((x) => x.families.slice().sort().join("+"));

test("LOW4H: a continuous $50K → $100K rise qualifies (no pullback needed); SLOW-BUILD and LIQ25K share the entry", () => {
  const e = setup();
  path(e, T0, T0 + 4 * H + 60, () => 50_000);                    // flat $50K for 4 h (coin reaches 8 h at T0 + 4 h)
  path(e, T0 + 4 * H + 60, T0 + 5 * H + 60, (t) => 50_000 * (1 + (t - (T0 + 4 * H)) / H * 1.2)); // steady climb, ~2% a minute
  const es = [...e.entries.values()].filter((x) => x.families.includes("LOW4H"));
  assert.equal(es.length, 1);
  assert.ok(es[0].families.includes("LOW4H") && es[0].families.includes("SLOW-BUILD") && es[0].families.includes("LOW4H-LIQ25K"), es[0].families.join());
  assert.ok(es[0].signalMc >= 99_999 && es[0].signalMc < 103_000, "enters at the first observation at/above 2× the 4 h low: " + es[0].signalMc);
  assert.equal(es[0].ag, "A1");
});

test("SLOW-BUILD rejects a candle above +20%, records the rejection, and never enters later in that age group", () => {
  const e = setup(); const notes = []; e.store = { saveNote: (m, n) => notes.push(n), saveEntry() {}, saveDecision() {}, saveBar() {}, feedEvent() {} };
  path(e, T0, T0 + 4 * H + 60, () => 50_000);
  // 40 min later: one minute jumps +30% (open 60K → close 78K), then on to $100K
  const t1 = T0 + 4 * H + 60; path(e, t1, t1 + 35 * 60, (t) => 50_000 + (t - t1) / 60 * 300);
  swap(e, t1 + 35 * 60 + 1, 61_000); swap(e, t1 + 35 * 60 + 50, 79_000);
  path(e, t1 + 37 * 60, t1 + 60 * 60, (t) => 79_000 + (t - t1 - 37 * 60) / 60 * 1_000);
  const fs = fams(e); assert.equal(fs.length, 1); assert.ok(!fs[0].includes("SLOW-BUILD") && fs[0].includes("LOW4H"));
  assert.ok(notes.some((n) => n.family === "SLOW-BUILD" && /above \+20%/.test(n.reason)));
});

test("SLOW-BUILD: a candle of exactly +20% is allowed", () => {
  const e = setup(); path(e, T0, T0 + 4 * H + 60, () => 50_000);
  const t1 = T0 + 4 * H + 120;
  swap(e, t1, 70_000); swap(e, t1 + 30, 84_000);                 // one minute: open 70K close 84K = exactly +20%
  path(e, t1 + 60, t1 + 60 * 60, (t) => 84_000 + (t - t1) / 60 * 400);
  assert.ok(fams(e)[0].includes("SLOW-BUILD"), fams(e).join());
});

test("SLOW-BUILD: under 30 min from the low is rejected", () => {
  const e = setup(); path(e, T0, T0 + 4 * H + 60, () => 50_000);
  const t1 = T0 + 4 * H + 60; swap(e, t1, 45_000); path(e, t1 + 60, t1 + 20 * 60, (t) => 45_000 * (1 + (t - t1) / 60 * 0.08)); // low 45K, doubles in ~13 min
  const f = fams(e); assert.equal(f.length, 1); assert.ok(f[0].includes("LOW4H") && !f[0].includes("SLOW-BUILD"));
});

test("no fabricated crossing after a feed outage: the window is not covered, so nothing enters", () => {
  const e = setup(); path(e, T0, T0 + 4 * H + 60, () => 50_000);
  e.feedDown(T0 + 4 * H + 61, "test"); e.feedUp(T0 + 4 * H + 600);
  swap(e, T0 + 4 * H + 601, 120_000); swap(e, T0 + 4 * H + 660, 125_000);
  assert.equal(e.entries.size, 0);
});

test("a crossing outside the $40K–$1M band is not an entry", () => {
  const e = setup(); path(e, T0, T0 + 4 * H + 60, () => 10_000);
  path(e, T0 + 4 * H + 60, T0 + 5 * H, (t) => 10_000 + (t - T0 - 4 * H) * 5); // crosses $20K well below the band
  assert.equal(e.entries.size, 0);
});

test("LOW4H window boundary: a low older than 4 h is outside the window", () => {
  const e = setup(6 * H); // coin 8 h old at T0 + 2 h
  swap(e, T0, 30_000); path(e, T0 + 60, T0 + 6 * H, () => 70_000); // the $30K low is > 4 h old at T0 + 4 h + 1 min
  swap(e, T0 + 6 * H, 75_000);                                      // 75K is not 2× the 4 h low (70K)
  assert.equal(e.entries.size, 0);
});

test("CONT: +30% over 15 min and within 5% of the 1 h high; CONT-STALL shares the entry", () => {
  const e = setup(7 * H); // 8 h old at T0 + 1 h → needs 1 h covered history
  path(e, T0, T0 + H + 60, () => 100_000);
  path(e, T0 + H + 60, T0 + H + 20 * 60, (t) => 100_000 * (1 + (t - T0 - H - 60) / 600 * 0.5)); // +50% in 10 min
  const es = [...e.entries.values()]; assert.ok(es.length >= 1);
  const c = es.find((x) => x.families.includes("CONT")); assert.ok(c && c.families.includes("CONT-STALL"));
  assert.ok(c.signalMc >= 130_000 && c.signalMc < 136_000, String(c.signalMc));
  assert.equal(c.versions.length, 8); // 4 plain + 4 stall
});

test("CONT: can qualify immediately at 8 h old when history exists", () => {
  const e = setup(7 * H); path(e, T0, T0 + H - 600, () => 100_000); path(e, T0 + H - 600, T0 + H, (t) => 100_000 * (1 + (t - (T0 + H - 600)) / 600 * 0.4));
  swap(e, T0 + H, 140_000); // first observation at exactly 8 h
  assert.ok([...e.entries.values()].some((x) => x.families.includes("CONT") && x.decisionT === T0 + H));
});

test("HH-BREAK: zero volume baseline is recorded and not entered; a real 2× volume break enters", () => {
  const notes = []; const st = { saveNote: (m, n) => notes.push(n), saveEntry() {}, saveDecision() {}, saveBar() {}, feedEvent() {} };
  const e = setup(3.5 * H); e.store = st;
  path(e, T0, T0 + 4.6 * H, () => 100_000, 60, { sol: 0 });            // trades with no volume
  swap(e, T0 + 4.6 * H, 110_000, { sol: 5 });
  assert.ok(notes.some((n) => n.family === "HH-BREAK" && /zero volume/.test(n.reason)));
  assert.ok(![...e.entries.values()].some((x) => x.families.includes("HH-BREAK")));

  const e2 = setup(3.5 * H);
  path(e2, T0, T0 + 4.5 * H, () => 100_000, 60, { sol: 1 });           // 1 SOL a minute baseline
  const t1 = T0 + 4.5 * H; path(e2, t1, t1 + 14 * 60, () => 100_000, 60, { sol: 3 }); // 3 SOL a minute, flat
  swap(e2, t1 + 14 * 60 + 5, 101_000, { sol: 3 });                    // strictly above the 60-min high
  const h = [...e2.entries.values()].find((x) => x.families.includes("HH-BREAK")); assert.ok(h, "HH-BREAK entry");
  assert.equal(h.cands.find((c) => c.family === "HH-BREAK").detail.windows.length, 16);
});

test("AGE-DOUBLE: reference MISSING when history starts after the age-group start; OK and crossing when covered", () => {
  const notes = []; const e = mkEngine(); e.store = { saveNote: (m, n) => notes.push(n), saveEntry() {}, saveDecision() {}, saveBar() {}, feedEvent() {} };
  e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); // already 9 h old: no observation at 8 h
  path(e, T0, T0 + 600, () => 50_000);
  assert.ok(notes.some((n) => n.family === "AGE-DOUBLE" && n.reason === "reference_status=MISSING"));

  const e2 = setup(7.5 * H); path(e2, T0, T0 + H, () => 60_000);     // at 8 h (T0 + 30 min) the cap is $60K → line $120K
  path(e2, T0 + H, T0 + 2 * H, (t) => 60_000 + (t - T0 - H) * 20);
  const a = [...e2.entries.values()].find((x) => x.families.includes("AGE-DOUBLE")); assert.ok(a);
  assert.ok(a.signalMc >= 119_999 && a.signalMc < 122_000, String(a.signalMc));
  assert.equal(a.cands.find((c) => c.family === "AGE-DOUBLE").detail.ref_mc, 60_000);
});

test("one entry per mint, family and age group; a new age group allows a new entry", () => {
  const e = setup(); path(e, T0, T0 + 4 * H + 60, () => 50_000);
  path(e, T0 + 4 * H + 60, T0 + 5 * H, (t) => 50_000 * (1 + (t - T0 - 4 * H) / H * 1.5));
  const n1 = [...e.entries.values()].filter((x) => x.families.includes("LOW4H")).length; assert.equal(n1, 1);
  path(e, T0 + 5 * H, T0 + 11 * H, () => 40_000);                        // back down; still A1 until 16 h
  path(e, T0 + 11 * H, T0 + 12 * H, (t) => 40_000 * (1 + (t - T0 - 11 * H) / H * 2)); // doubles again inside A1 → no new LOW4H
  assert.equal([...e.entries.values()].filter((x) => x.families.includes("LOW4H")).length, 1);
  path(e, T0 + 12 * H, T0 + 16 * H + 60, () => 40_000);                 // into A2
  path(e, T0 + 16 * H + 60, T0 + 17 * H, (t) => 40_000 * (1 + (t - T0 - 16 * H) / H * 3));
  const l = [...e.entries.values()].filter((x) => x.families.includes("LOW4H")).map((x) => x.ag); assert.deepEqual(l, ["A1", "A2"]);
});
