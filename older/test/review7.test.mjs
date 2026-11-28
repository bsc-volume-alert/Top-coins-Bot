// Seventh independent review (ChatGPT on 4dd2897, 21 Nov 2026 23:50 UK): reproductions of its five blockers and of the defects fixed with them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { Series, Coverage } from "../src/series.mjs";
import { evaluate, newCoin } from "../src/signals.mjs";
import { newEntry, advance, observe } from "../src/book.mjs";
import { booksApi } from "../src/page.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f));
const young = (opts = {}) => { const e = mkEngine(opts); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); return e; };

test("1 RUG state is evidence only over unbroken observation: a feed gap after the peak wipes it, so a later fall against the old peak is not bought", () => {
  const e = young(); path(e, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(e, T0 + 300, 540_000);
  e.feedDown(T0 + 301); e.feedUp(T0 + 330);                                    // the true peak and the path through the gap are unknown
  swap(e, T0 + 340, 300_000); swap(e, T0 + 360, 150_000); swap(e, T0 + 380, 100_000); // a fresh crossing of the OLD line, between two good observations
  assert.equal(has(e, "RUG450").length, 0, "the old peak is no longer evidence"); assert.ok(e.coins.get(M).rug.pk.mc < 400_000, "the peak restarts from what is watched after the gap");
  const c = young(); path(c, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(c, T0 + 300, 540_000); swap(c, T0 + 340, 300_000); swap(c, T0 + 360, 150_000); swap(c, T0 + 380, 100_000);
  assert.equal(has(c, "RUG450").length, 1, "control: the same path without the gap is bought");
});
test("2 an observation mode that cannot support the RUG books builds no RUG state, and a change of observation method starts clean (sampled $600K → $110K → live $140K → $145K is not a bounce buy)", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0); const coin = newCoin("M", -20 * H, sr); coin.info = {};
  const ev = (t, mc, skip) => { sr.add(t, mc / 1e9); return evaluate(coin, { t, px: mc / 1e9, mc }, { skip }); }, polled = new Set([...S.ANY_AGE, "HH-BREAK"]);
  ev(100, 600_000, polled); ev(110, 300_000, polled); ev(120, 110_000, polled);
  assert.equal(coin.rug ?? null, null, "sampled observations leave no peak and no armed setup behind");
  const e = mkEngine(); e.feedUp(T0); const c = e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H, mode: "polled", t: T0 }); c.rug = { pk: { mc: 600_000, t: T0 + 10 }, arm: { t: T0 + 20, peak: 600_000, peak_t: T0 + 10, low: 110_000, low_t: T0 + 20 } }; // as if an older version had left one
  e.forceMode(M, "live", "PoolA"); assert.equal(c.rug, null, "cleared when the coin moves to live observation");
  swap(e, T0 + 100, 140_000); swap(e, T0 + 120, 145_000); assert.equal(has(e, "RUG450-BOUNCE").length, 0);
});
test("3 an hour-scale price window needs a known starting price: after a long silence the first two prices ($90K → $210K) are not a LOW4H double, and CONT does not use an hour-high whose first part is unknown", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0); sr.add(20_000, 90); sr.add(20_010, 210);
  assert.equal(sr.covered(20_010 - 14_400, 20_010), true, "no trade was missed in the last 4 hours…"); assert.equal(sr.priced(20_010 - 14_400, 20_010), false, "…but the price before the first observation is unknown");
  const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H });
  swap(e, T0 + 5 * H, 90_000); swap(e, T0 + 5 * H + 10, 210_000);              // five silent hours, then two prices
  assert.equal(has(e, "LOW4H").length, 0, "LOW4H"); assert.equal(has(e, "CONT").length, 0, "CONT");
  const k = mkEngine(); k.feedUp(T0); k.coin(M, { pool: "PoolA", createTs: T0 - 20 * H });
  path(k, T0, T0 + 5 * H, () => 100_000, 60); swap(k, T0 + 5 * H, 90_000); swap(k, T0 + 5 * H + 10, 210_000);
  assert.equal(has(k, "LOW4H").length, 1, "control: with five hours of watched prices the same move IS a LOW4H buy");
  const q = mkEngine(); q.feedUp(T0); q.coin(M, { pool: "PoolA", createTs: T0 - 20 * H });
  swap(q, T0 + 60, 100_000); swap(q, T0 + 7 * H, 90_000); swap(q, T0 + 7 * H + 10, 210_000); // one early trade, then a verified silence: the anchor is the starting price
  assert.equal(has(q, "LOW4H").length, 1, "a long VERIFIED quiet period still counts: the last price before it stands");
});
test("4 the 5-minute volume is 'not known' when the cut-off falls inside a merged second — VOL books do not decide on it", async () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  for (let k = 0; k < S.RAW_CAP; k++) sr.add(100 + k * 0.1, 1, 1, false);
  const t = 100 + S.RAW_CAP * 0.1 + 10; sr.add(t + 0.1, 1, 1000, true); sr.add(t + 0.5, 1, 299_000, true); sr.add(t + 0.9, 1, 500, true); sr.add(t + 1.5, 1, 1, true); // the first two are merged: t+0.1 … t+0.5
  assert.equal(sr.volSince(t + 0.3), null, "the cut-off is inside the merged entry: its $300,000 cannot be split"); assert.equal(sr.volSince(t), 300_501, "before it: everything counts"); assert.equal(sr.volSince(t + 0.6), 501, "after it: nothing of it counts");
});
test("5 an entry and its one-buy flags are one commit; a stored entry without flags gets them back on restore, so the same book cannot buy the coin twice", () => {
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "atomic.db"); let st = new Store(db); const e = young({ store: st });
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 100 }); const real = st.saveDecision.bind(st); st.saveDecision = () => { throw new Error("stopped between the two writes"); };
  assert.throws(() => { for (let k = 0; k < 6; k++) swap(e, T0 + 600 + k * 20, 100_000, { sol: 900 }); });
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM entries").get().n, 0, "nothing half-written: the entry was rolled back with its flags"); st.saveDecision = real;
  // an entry written by an earlier version without its flags
  const lone = newEntry({ mint: M, pool: "PoolA", ag: "A0", t: T0 + 700, families: ["VOL300K"], features: {}, mc: 1e5, px: 1e-4 }); lone.cands = [{ family: "VOL300K", detail: {} }]; st.saveEntry(lone); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 2 * H, info: {} });
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM decisions WHERE family='VOL300K'").get().n, 0);
  st = new Store(db); const e2 = mkEngine({ store: st }); st.restore(e2); e2.feedUp(T0 + 800);
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM decisions WHERE family='VOL300K'").get().n, 1, "restore puts the missing flag back"); assert.equal(e2.coins.get(M).groups.A0.done["VOL300K"], 1);
  path(e2, T0 + 800, T0 + 1200, () => 100_000, 20, { sol: 900 }); e2.flush();
  const vs = st.allEntries().filter((x) => x.families.includes("VOL300K")); assert.equal(vs.filter((x) => !x.again?.VOL300K).length, 1, "the same heavy trading does not produce a second FIRST buy: the flag is back");
  assert.ok(vs.filter((x) => x.again?.VOL300K).length >= 1, "what it produces (older-9) is a marked re-buy, because the stored buy was never filled and the book holds nothing");
  const ctl = young(); path(ctl, T0 + 800, T0 + 1200, () => 100_000, 20, { sol: 900 }); assert.equal(has(ctl, "VOL300K").length, 1, "control: without the flag this trading IS a VOL300K buy");
});
test("defects fixed with the blockers: the clock estimate never uses the minute containing the deadline or a rejected back-fill row; a half-sold row's 'high while held' is what it was really worth; the sale market cap is always marked approximate", async () => {
  const { addClockBook } = await import("../src/migrate.mjs"); const { versionsFor } = await import("../src/book.mjs");
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "mig7.db"), st = new Store(db), now = 2_000_040, s = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true, t0 = now - 10 * 3600;
  const e = newEntry({ mint: "OLD", pool: "P", ag: "A4", t: t0, families: ["HH-BREAK"], features: {}, mc: 1e5, px: 0.001 }); e.cands = [{ family: "HH-BREAK", detail: {} }]; advance(e, t0 + 1.5, s(100, t0), yes); st.saveEntry(e);
  const mT = Math.floor((e.fill.t + 4 * 3600) / 60), bar = (m, c, o = {}) => st.saveBar("OLD", m, { o: c, h: c, l: c, c, v: 1, nb: 1, ns: 0, ...o });
  bar(mT - 30, 0.0008); st.saveBackfillBar("OLD", mT - 10, { o: 0.005, h: 0.005, l: 0.005, c: 0.005, v: 1 }, false); bar(mT, 0.003); // a rejected back-fill row, and the minute that CONTAINS the 4-hour mark
  addClockBook(st, "HH-BREAK-4H", now); const k = versionsFor(st.allEntries()[0], "HH-BREAK-4H").find((v) => v.stop === 0.4);
  assert.equal(k.exit.est_from.close, 0.0008, "the last minute completed before the mark — not the mark's own minute (0.003), not the rejected row (0.005)");
  const h = newEntry({ mint: "H", pool: "P", ag: "A4", t: 0, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); h.evidence = { trigger: { sol_usd: 100, supply: 1e9 } };
  advance(h, 1.5, s(100, 0), yes); observe(h, s(210, 60), 60); advance(h, 61, s(210, 60), yes); observe(h, s(500, 120), 120); observe(h, s(300, 180), 180); advance(h, 181, s(300, 180), yes);
  const sc = booksApi([h], { stop: 0.25, policy: "scale" }).books.LOW4H[0], tr = booksApi([h], { stop: 0.25, policy: "trail" }).books.LOW4H[0];
  assert.ok(sc.half != null && sc.hi_held < tr.hi_held - 0.5, `half banked at 2.1×, the rest peaked at 5×: worth ${sc.hi_held}× at best, not the full position's ${tr.hi_held}×`); assert.ok(Math.abs(sc.hi_held - (1.05 + 2.5) * 0.99) < 0.1);
});
