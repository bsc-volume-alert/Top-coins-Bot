// WARM RESTART (owner's decision, 22 Nov 2026): the price memory survives a planned stop; the time away stays an unobserved gap,
// tolerated by hour-scale windows only when it is at most WARM_MAX_GAP_S, and recorded on every decision that spans it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { Series, Coverage } from "../src/series.mjs";
import { saveWarm, loadWarm } from "../src/warm.mjs";
import { Poller } from "../src/polled.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f)), dir = () => mkdtempSync(join(tmpdir(), "older-"));
// one run, stopped at `stop`; then a new process: database restored, snapshot read `readAfter` s later, feed up `upAfter` s after the stop
const first = (d, build, stop) => { const st = new Store(join(d, "w.db")), e = mkEngine({ store: st }); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, info: {} }); build(e); e.flush(); st.heartbeat(stop); const w = saveWarm(join(d, "w.warm"), e, stop); st.db.close(); return w; };
const second = (d, stop, { readAfter = 5, upAfter = 10, warm = true } = {}) => { const st = new Store(join(d, "w.db")), e = mkEngine({ store: st }); st.restore(e); const r = warm ? loadWarm(join(d, "w.warm"), e, stop + readAfter) : { loaded: false }; e.restartGap(st.lastAlive(), stop + readAfter, { warm: r.loaded }); e.feedUp(stop + upAfter); e.warmResult = r; return e; };

test("the price memory read back is exactly what was in memory: every answer a decision reads is the same, merged seconds and buyers included", () => {
  const cov = new Coverage(); cov.up(0); const a = new Series("M", cov); a.startLive(0);
  for (let k = 0; k < S.RAW_CAP + 40; k++) a.add(1000 + k * 0.05, 1 + (k % 17) / 100, 10 + k % 7, k % 3 !== 0, "w" + (k % 50)); // more than RAW_CAP in a few seconds: merged entries exist
  for (let k = 0; k < 200; k++) a.add(2000 + k * 30, 0.8 + (k % 23) / 50, 500, k % 2 === 0, "u" + (k % 9)); a.prune(2000 + 200 * 30 + 4000); a.add(12_000, 1.5, 300, true, "z"); a.add(12_010, 1.7, 900, false, null);
  const b = Series.load("M", cov, JSON.parse(JSON.stringify(a.dump()))), t = 12_011;
  assert.ok(a.anchor && a.bars.size > 10, "the case has an anchor and bars"); assert.deepEqual(b.anchor, a.anchor); assert.equal(b.bars.size, a.bars.size); assert.equal(b.raw.length, a.raw.length);
  for (const x of [t - 60, t - 300, t - 3600, t - 4 * 3600, 5000, 1000.4]) { assert.deepEqual(b.lowIn(x, t), a.lowIn(x, t)); assert.deepEqual(b.highIn(x, t), a.highIn(x, t)); assert.deepEqual(b.lowIn(x, t, true), a.lowIn(x, t, true)); assert.deepEqual(b.priceAt(x), a.priceAt(x)); assert.deepEqual(b.priceAt(x, true), a.priceAt(x, true)); assert.equal(b.volSince(x), a.volSince(x)); assert.deepEqual(b.winStats(x, t), a.winStats(x, t)); assert.equal(b.covered(x, t), a.covered(x, t)); assert.equal(b.priced(x, t), a.priced(x, t)); }
  const mA = Math.floor(7000 / 60); assert.deepEqual(b.barsIn(mA - 30, mA).map(([m, x]) => [m, x.o, x.h, x.l, x.c, x.v, x.nb, x.ns]), a.barsIn(mA - 30, mA).map(([m, x]) => [m, x.o, x.h, x.l, x.c, x.v, x.nb, x.ns])); assert.equal(b.buyersIn(Math.floor(t / 60) - 15, Math.floor(t / 60) + 1), a.buyersIn(Math.floor(t / 60) - 15, Math.floor(t / 60) + 1));
  const c2 = new Coverage(); c2.up(0); const m = new Series("M", c2); m.startLive(0); for (let k = 0; k < S.RAW_CAP; k++) m.add(100 + k * 0.1, 1, 1, false); const tt = 100 + S.RAW_CAP * 0.1 + 10; m.add(tt + 0.1, 1, 1000, true); m.add(tt + 0.5, 0.5, 299_000, true); m.add(tt + 0.9, 1, 500, true); m.add(tt + 1.5, 1, 1, true);
  const m2 = Series.load("M", c2, JSON.parse(JSON.stringify(m.dump()))); assert.equal(m2.volSince(tt + 0.3), null, "a merged second is still 'not known' after reading back"); assert.equal(m2.lowIn(tt, tt + 1).px, 0.5, "and still remembers the low it absorbed");
});

test("LOW4H after a warm restart: the 4-hour low is still known, so a fresh double is bought — marked with the seconds not watched; a cold start cannot buy it", () => {
  const stop = T0 + 5 * H, build = (e) => { path(e, T0, T0 + 2 * H, () => 100_000, 60); path(e, T0 + 2 * H, stop, () => 60_000, 60); }; // five hours watched; the 4-hour low is $60K
  const d = dir(), w = first(d, build, stop); assert.ok(w.coins >= 1);
  const e = second(d, stop); assert.equal(e.warmResult.loaded, true); assert.equal(e.warmResult.coins, 1);
  swap(e, stop + 12, 110_000); assert.equal(has(e, "LOW4H").length, 0, "the first trade after a restart is never a fresh crossing: the seconds before it were not watched");
  swap(e, stop + 14, 125_000); const b = has(e, "LOW4H"); assert.equal(b.length, 1, "the next one is: $110K → $125K crosses 2 × the $60K low");
  const det = b[0].cands.find((c) => c.family === "LOW4H").detail; assert.equal(det.restart_gap_s, 10, "the 10 seconds the program was away are recorded on the decision"); assert.equal(b[0].warm_gap_s, 10); assert.match(b[0].flags.join(), /restart gap of 10 s/);
  const d2 = dir(); first(d2, build, stop); const cold = second(d2, stop, { warm: false }); swap(cold, stop + 12, 110_000); swap(cold, stop + 14, 125_000);
  assert.equal(has(cold, "LOW4H").length, 0, "control: without the price memory the same trades are not a LOW4H buy (no 4-hour history)");
});

test("the limit: a snapshot older than 60 s is not read; and if the feed only comes back more than 60 s after the stop, the gap is an ordinary outage that nothing spans", () => {
  const stop = T0 + 5 * H, build = (e) => { path(e, T0, T0 + 2 * H, () => 100_000, 60); path(e, T0 + 2 * H, stop, () => 60_000, 60); };
  const d = dir(); first(d, build, stop); const late = second(d, stop, { readAfter: 61, upAfter: 65 }); assert.equal(late.warmResult.loaded, false); assert.match(late.warmResult.why, /61 s old/);
  swap(late, stop + 70, 110_000); swap(late, stop + 72, 125_000); assert.equal(has(late, "LOW4H").length, 0);
  const d2 = dir(); first(d2, build, stop); const slow = second(d2, stop, { readAfter: 5, upAfter: 75 }); assert.equal(slow.warmResult.loaded, true, "read in time…");
  assert.equal(slow.cov.gaps.at(-1)[2], undefined, "…but the feed took 75 s: the gap is not marked warm"); swap(slow, stop + 80, 110_000); swap(slow, stop + 82, 125_000); assert.equal(has(slow, "LOW4H").length, 0, "so no hour-scale window may span it");
  const d3 = dir(); first(d3, build, stop); const ok = second(d3, stop, { readAfter: 5, upAfter: 59 }); assert.equal(ok.cov.gaps.at(-1)[2], "warm"); swap(ok, stop + 62, 110_000); swap(ok, stop + 64, 125_000); assert.equal(has(ok, "LOW4H").length, 1, "59 s: tolerated, bought, and recorded"); assert.equal(has(ok, "LOW4H")[0].warm_gap_s, 59);
});

test("exact windows never span a restart: a 1-minute double across it is not a FAST buy, the 5-minute volume across it is not decided, and both work again once a full window has been watched", () => {
  const stop = T0 + 2 * H, build = (e) => path(e, T0, stop, () => 100_000, 10), d = dir(); first(d, build, stop); const e = second(d, stop);
  swap(e, stop + 12, 100_000); swap(e, stop + 14, 210_000, { sol: 2000 });   // 2.1× inside one minute, with $200K of volume
  assert.equal(has(e, "FAST-1M").length, 0, "FAST-1M: its window contains the restart"); assert.equal(has(e, "FAST-5M").length, 0); assert.equal(has(e, "VOL300K").length, 0);
  const c = e.coins.get(M).series; assert.equal(c.continuous(stop - 30, stop + 14), false); assert.equal(c.covered(stop - 30, stop + 14), true, "hour-scale: tolerated"); assert.equal(c.warmIn(stop - 30, stop + 14), 10);
  path(e, stop + 20, stop + 100, () => 100_000, 10); swap(e, stop + 100, 100_000); swap(e, stop + 102, 210_000);
  assert.equal(has(e, "FAST-1M").length, 1, "90 s after the feed came back the 1-minute window is fully watched again"); assert.equal(has(e, "FAST-1M")[0].warm_gap_s ?? 0, 0, "and an exact decision is never marked: it cannot contain a gap");
  const k = mkEngine(); k.feedUp(T0); k.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); path(k, T0, stop, () => 100_000, 10); swap(k, stop + 12, 100_000); swap(k, stop + 14, 210_000);
  assert.equal(has(k, "FAST-1M").length, 1, "control: without a restart the same trades ARE a FAST-1M buy");
});

test("RUG books across a warm restart: the watched peak is kept, so a collapse watched after the restart is bought (marked); a collapse that happened while the program was away is not", () => {
  const young = (e) => { e.coins.get(M).createTs = T0 - 2 * H; }, stop = T0 + 400, build = (e) => { young(e); path(e, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(e, T0 + 300, 540_000); swap(e, T0 + 320, 400_000); swap(e, T0 + 340, 300_000); };
  const mk = (d) => { const st = new Store(join(d, "w.db")), e = mkEngine({ store: st }); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 2 * H, info: {} }); build(e); e.flush(); st.heartbeat(stop); saveWarm(join(d, "w.warm"), e, stop); st.db.close(); };
  const d = dir(); mk(d); const e = second(d, stop); assert.equal(e.coins.get(M).rug.pk.mc > 539_000, true, "the exact peak ($540K) came back — not a rounded one");
  swap(e, stop + 12, 150_000); swap(e, stop + 14, 100_000); const b = has(e, "RUG450"); assert.equal(b.length, 1, "$150K → $100K freshly crosses the $108K line"); assert.ok(b[0].warm_gap_s === 10 && b[0].cands[0].detail.restart_gap_s === 10);
  const d2 = dir(); mk(d2); const g = second(d2, stop); swap(g, stop + 12, 105_000); swap(g, stop + 14, 99_000); swap(g, stop + 16, 60_000);
  assert.equal(has(g, "RUG450").length, 0, "the seventh review's case: already under the line at the first trade after the restart — the crossing was not watched, so it is not bought"); assert.equal(g.coins.get(M).rug.arm, null, "and no bounce setup is armed from it");
  const d3 = dir(); mk(d3); const x = second(d3, stop, { readAfter: 5, upAfter: 90 }); swap(x, stop + 92, 150_000); swap(x, stop + 94, 100_000); assert.equal(has(x, "RUG450").length, 0, "away for 90 s: the old peak is no longer evidence");
});

test("a snapshot is used once and never trusted when damaged: second read, cut-short file, wrong format → cold start; a planned stop with nothing observed is harmless", () => {
  const stop = T0 + 5 * H, build = (e) => path(e, T0, stop, () => 100_000, 60), d = dir(), f = join(d, "w.warm"); first(d, build, stop);
  const whole = readFileSync(f, "utf8"); const a = second(d, stop); assert.equal(a.warmResult.loaded, true); assert.equal(existsSync(f), false, "renamed after reading");
  const st = new Store(join(d, "w.db")), e2 = mkEngine({ store: st }); st.restore(e2); assert.equal(loadWarm(f, e2, stop + 20).loaded, false, "a second start does not find it");
  writeFileSync(f, whole.slice(0, whole.length - 30)); const e3 = mkEngine(); const r3 = loadWarm(f, e3, stop + 5); assert.equal(r3.loaded, false); assert.match(r3.why, /incomplete|damaged/); assert.equal(e3.coins.size, 0, "nothing of a cut-short file is applied"); assert.equal(existsSync(f), false);
  writeFileSync(f, whole.replace('"warm":1', '"warm":99')); assert.match(loadWarm(f, mkEngine(), stop + 5).why, /another format/);
  writeFileSync(f, whole); assert.match(loadWarm(f, mkEngine(), stop - 5).why, /future/);
  const d4 = dir(), st4 = new Store(join(d4, "w.db")), e4 = mkEngine({ store: st4 }); e4.feedUp(T0); const w4 = saveWarm(join(d4, "w.warm"), e4, T0 + 10); assert.equal(w4.coins, 0); assert.equal(loadWarm(join(d4, "w.warm"), mkEngine(), T0 + 12).loaded, true);
});

test("one-buy flags after a warm restart: a book that bought the coin before the stop makes no second FIRST buy — only a marked re-buy on the rows it has sold; the database's observation method wins over the snapshot's", () => {
  const stop = T0 + 5 * H + 200, d = dir(); first(d, (e) => { path(e, T0, T0 + 2 * H, () => 100_000, 60); path(e, T0 + 2 * H, T0 + 5 * H, () => 60_000, 60); swap(e, T0 + 5 * H, 110_000); swap(e, T0 + 5 * H + 2, 125_000); assert.equal(has(e, "LOW4H").length, 1); path(e, T0 + 5 * H + 10, stop, () => 80_000, 10); }, stop);
  const e = second(d, stop); swap(e, stop + 12, 110_000); swap(e, stop + 14, 125_000); swap(e, stop + 16, 110_000); swap(e, stop + 18, 130_000); e.flush();
  const ls = e.store.allEntries().filter((x) => x.families.includes("LOW4H")); assert.equal(ls.filter((x) => !x.again?.LOW4H).length, 1, "still one FIRST LOW4H buy for this coin and age group");
  const re = ls.filter((x) => x.again?.LOW4H); assert.ok(re.length >= 1, "the crossing after the restart is a re-buy (older-9)"); assert.equal(re[0].versions.filter((v) => v.stall === false).length, 9, "carrying only the rows the first buy has already sold: it fell from $125K to $80K, so the 20–30% stops are out on both exits and the 40% and 60% stops still hold"); assert.ok(re[0].versions.every((v) => v.stop <= 0.3));
  const d2 = dir(); first(d2, (x) => path(x, T0, stop, () => 100_000, 60), stop); const st = new Store(join(d2, "w.db")), e2 = mkEngine({ store: st }); st.setCoinMode(M, null, { monitoring_mode: "polled", population: "solana-wide" }); st.restore(e2);
  const r = loadWarm(join(d2, "w.warm"), e2, stop + 5); assert.equal(e2.coins.get(M).mode, "polled"); assert.equal(r.skipped, 1, "a live snapshot is not put under a coin the database says is sampled"); assert.equal(e2.coins.get(M).series.lastT, null);
});

test("sampled coins: the history read back is judged by the ordinary hole rule, with the interval the coin was sampled at before the stop", async () => {
  const mkJup = (clock, px) => ({ prices: async (m) => ({ t: clock.t, req: clock.t, prices: new Map(m.map((x) => [x, { px, liqUsd: 5e4, decimals: 6 }])), omitted: [] }), quote: async () => ({ ok: false, why: "n/a", t: clock.t }), recent: async () => [], category: async () => [], tokens: async () => [] });
  const run = async (firstSampleAfter) => { const d = dir(), clock = { t: T0 }, P = "SampledCoinW"; let st = new Store(join(d, "w.db")), e = mkEngine({ store: st }), po = new Poller({ engine: e, jup: mkJup(clock, 1e-4), store: st, now: () => clock.t });
    po.add({ mint: P, decimals: 6, token_program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", circ_supply: 1e9, mcap: 1e5, launchpad: "raydium-launchlab", first_pool: { id: "P", created: T0 - 20 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false }, "t");
    for (let k = 0; k < 40; k++) { clock.t += 10; await po.sweep(); } const stop = clock.t + 2, hist = e.coins.get(P).series.histFrom; saveWarm(join(d, "w.warm"), e, stop); st.heartbeat(stop); st.db.close();
    st = new Store(join(d, "w.db")); const e2 = mkEngine({ store: st }); st.restore(e2); const r = loadWarm(join(d, "w.warm"), e2, stop + 3); assert.equal(r.loaded, true); const po2 = new Poller({ engine: e2, jup: mkJup(clock, 1e-4), store: st, now: () => clock.t }); assert.equal(po2.restore(), 1);
    clock.t = stop - 2 + firstSampleAfter; await po2.sweep(); return { sr: e2.coins.get(P).series, hist, stop, t: clock.t, po2, e2 }; };
  const a = await run(25); assert.equal(a.sr.histFrom, a.hist, "first sample 25 s after the last one (10 s coin: rule 35 s): the history is kept"); assert.equal(a.e2.pollCov.gaps.at(-1)[2], "warm"); assert.equal(a.sr.covered(a.t - 300, a.t), true); assert.equal(a.sr.continuous(a.t - 300, a.t), false, "exact windows still do not span the restart");
  const b = await run(50); assert.ok(b.sr.histFrom >= b.stop, "first sample 50 s after the last one: a hole — the history starts again, as it would without a restart"); assert.equal(b.po2.stats.warmLost, 1);
});
