// Regression tests for the SECOND independent review (ChatGPT, 20 Nov 2026, on commit 5963512) and the Grok review of the same
// commit: C1–C5 = that review's remaining blockers; M1–M3 = its points on the background measurements; G1 = save on stop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, quoteFor, H, T0, BASE } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { Poller, validDec } from "../src/polled.mjs";
import { Series, Coverage } from "../src/series.mjs";
import { newEntry, observe, COST } from "../src/book.mjs";
import { decodeEvent, applyEvent, reduceTx, DISC, dec } from "../src/decoder.mjs";
import { features } from "../src/signals.mjs";
import { SPL_TOKEN } from "../src/risk.mjs";

const ev = (t, mc, mint = "MintAAApump", pool = "PoolA", extra = {}) => ({ t, mint, pool, base: BASE, quote: quoteFor(mc), feeBps: 30, sol: 1, isBuy: true, user: "u", ...extra });
const tmpDb = () => join(mkdtempSync(join(tmpdir(), "older-")), "t.db");
function world() { const w = { t: T0, px: new Map(), route: true, meta: true };
  w.tok = (m) => ({ mint: m, symbol: "TKN", decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(m) || 0) * 1e9, launchpad: "met-dbc", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true });
  w.jup = { prices: async (ms) => ({ t: w.t, req: w.t, prices: new Map(ms.filter((x) => w.px.has(x)).map((x) => [x, { px: w.px.get(x), liqUsd: 6e4, decimals: 6 }])), omitted: ms.filter((x) => !w.px.has(x)) }),
    quote: async (m, side, raw) => { const req = w.t; w.t += 0.3; if (!w.route || (w.failSize && Math.abs(raw - w.failSize) < 1)) return { ok: false, t: w.t, why: "no route" }; const p = w.px.get(m) / 100; return side === "buy" ? { ok: true, req, t: w.t, out: ((raw / 1e9) * 0.99 / p) * 1e6, route: ["Meteora"] } : { ok: true, req, t: w.t, out: (raw / 1e6) * p * 0.99 * 1e9, route: ["Meteora"] }; },
    recent: async () => [], category: async () => [], tokens: async (ms) => (w.meta ? ms.map(w.tok) : []) };
  return w; }

test("C1 a coin promoted from sampled to live keeps its live position after a restart (the ownership change is saved)", async () => {
  const db = tmpDb(), M = "PromotedCoin1", w = world(); let st = new Store(db), eng = mkEngine({ store: st }), po = new Poller({ engine: eng, jup: w.jup, store: st, now: () => w.t });
  eng.feedUp(T0); w.px.set(M, 1e-4); po.add(w.tok(M), "t"); assert.equal(eng.coins.get(M).mode, "polled");
  // its canonical pool starts trading: no entry is open, so the coin moves to live observation
  for (let t = T0 + 10; t < T0 + 610; t += 10) eng.onSwap(ev(t, 100_000, M, "CanonPool")); assert.equal(eng.coins.get(M).mode, "live");
  eng.onSwap(ev(T0 + 615, 210_000, M, "CanonPool")); eng.onSwap(ev(T0 + 617, 212_000, M, "CanonPool")); eng.tick(T0 + 618);
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "filled"); assert.equal(en.exec, "reconstructed-pool-state");
  st.heartbeat(T0 + 618); st.db.close();
  // restart
  st = new Store(db); const eng2 = mkEngine({ store: st }); st.restore(eng2); eng2.restartGap(st.lastAlive(), T0 + 640); eng2.feedUp(T0 + 640);
  const po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t }); po2.restore();
  assert.equal(eng2.coins.get(M).mode, "live", "restored as live, not as sampled"); assert.ok(!po2.watch.has(M));
  eng2.onSwap(ev(T0 + 641, 120_000, M, "CanonPool")); eng2.onSwap(ev(T0 + 643, 119_000, M, "CanonPool")); // a 43% fall
  const r = [...eng2.entries.values()].find((x) => x.id === en.id) ?? st.allEntries().find((x) => x.id === en.id);
  assert.ok(r.versions.filter((v) => v.policy === "trail").every((v) => v.status === "closed"), "the fall was seen and every trailing stop sold"); assert.equal(eng2.stats.liveIgnoredSampled ?? 0, 0);
});

test("C1 a database written before the fix (coin stored as sampled, position opened live) is corrected on restore: the entry's method wins", () => {
  const db = tmpDb(), M = "OldRecord1"; let st = new Store(db), eng = mkEngine({ store: st }); eng.feedUp(T0);
  eng.coin(M, { pool: "CanonPool", createTs: T0 - 9 * H }); st.saveCoin(M, { pool: null, createTs: T0 - 9 * H, info: { monitoring_mode: "polled", decimals: 6 } }); // the stale record
  path(eng, T0, T0 + 600, () => 100_000, 10, { mint: M, pool: "CanonPool" }); eng.onSwap(ev(T0 + 605, 210_000, M, "CanonPool")); eng.onSwap(ev(T0 + 607, 212_000, M, "CanonPool")); eng.tick(T0 + 608);
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "filled"); st.heartbeat(T0 + 608); st.db.close();
  st = new Store(db); const eng2 = mkEngine({ store: st }); st.restore(eng2); eng2.restartGap(st.lastAlive(), T0 + 640); eng2.feedUp(T0 + 640);
  assert.equal(eng2.coins.get(M).mode, "live"); assert.equal(eng2.stats.modeForced, 1); assert.equal(eng2.coins.get(M).pool, "CanonPool");
  eng2.onSwap(ev(T0 + 641, 120_000, M, "CanonPool")); eng2.onSwap(ev(T0 + 643, 119_000, M, "CanonPool"));
  const r = [...eng2.entries.values()].find((x) => x.id === en.id) ?? st.allEntries().find((x) => x.id === en.id);
  assert.ok(r.versions.some((v) => v.status === "closed" && v.reason === "trail"), "the position is managed again");
  st.db.close(); st = new Store(db); const eng3 = mkEngine({ store: st }); st.restore(eng3); assert.equal(eng3.stats.modeForced ?? 0, 0, "and the correction itself was saved");
});

test("C2 sparse back-fill proves nothing about the minutes it leaves out: one bar does not repair an hour-long outage, and CONT does not fire on it", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0); cov.drop(10_000); cov.up(13_600);
  const one = sr.addBars([{ m: Math.floor(10_000 / 60), o: 1, h: 1, l: 1, c: 1 }], { from: 10_000, to: 13_600, patchGap: true });
  assert.equal(one.accepted, false); assert.match(one.why, /stop before the end/); assert.equal(sr.covered(9_000, 14_000), false);
  const holed = []; for (let m = Math.floor(10_000 / 60); m <= Math.floor(13_600 / 60); m++) if (m < 180 || m > 190) holed.push({ m, o: 1, h: 1, l: 1, c: 1 });
  const h = sr.addBars(holed, { from: 10_000, to: 13_600, patchGap: true }); assert.equal(h.accepted, false); assert.match(h.why, /hole of 12 minutes/);
  const full = []; for (let m = Math.floor(10_000 / 60); m <= Math.floor(13_600 / 60); m++) full.push({ m, o: 1, h: 1, l: 1, c: 1 });
  assert.equal(sr.addBars(full, { from: 10_000, to: 13_600, patchGap: true }).accepted, true); assert.equal(sr.covered(9_000, 14_000), true);
  // history before the live start: only the unbroken run that reaches it counts
  const c2 = new Coverage(); c2.up(20_000); const s2 = new Series("M", c2); s2.startLive(20_000);
  const bars = [200, 201, 202, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332].map((m) => ({ m, o: 1, h: 1, l: 1, c: 1 }));
  const r = s2.addBars(bars, { from: 12_000, to: 20_000 }); assert.equal(r.accepted, true); assert.equal(s2.histFrom, 320 * 60, "history goes back to minute 320, not across the two-hour hole to minute 200");
  // engine: an hour-long outage 'repaired' by a single bar gives no CONT entry
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 60_000, 10);
  e.feedDown(T0 + 601); e.feedUp(T0 + 4200); e.coins.get("MintAAApump").series.addBars([{ m: Math.floor((T0 + 601) / 60), o: 6e-5, h: 6e-5, l: 6e-5, c: 6e-5 }], { from: T0 + 601, to: T0 + 4200, patchGap: true });
  e.onSwap(ev(T0 + 4201, 130_000)); e.onSwap(ev(T0 + 4210, 131_000)); assert.equal([...e.entries.values()].filter((x) => x.families.includes("CONT")).length, 0);
});

test("C2 a newer back-filled close is used in preference to an older exact observation (15-minute rise measured from the right price)", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  sr.add(1000, 1.0); cov.drop(1001); cov.up(1900);                                       // last exact print 1.00, then an outage
  const bars = []; for (let m = 16; m <= 31; m++) bars.push({ m, o: 1.6, h: 1.6, l: 1.6, c: 1.6 }); // back-fill: the price was 1.60 during the outage
  assert.equal(sr.addBars(bars, { from: 1001, to: 1900, patchGap: true }).accepted, true);
  sr.add(2100, 2.0);
  const p = sr.priceAt(2100 - 900); assert.equal(p.px, 1.6); assert.equal(p.src, "bar"); assert.ok(2.0 / p.px < 1.3, "the real 15-minute rise is 25%, not the 100% an old observation would suggest");
  assert.equal(sr.priceAt(1005).px, 1.0, "before any back-filled minute has completed, the last exact print is still the answer");
  assert.equal(sr.highIn(1100, 1900).px, 1.6, "highs and lows inside a repaired outage come from its bars");
  const s2 = new Series("M", cov); s2.startLive(0); s2.add(1000, 1.0); s2.add(1100, 1.1); assert.equal(s2.priceAt(1200).src, "obs", "without back-fill nothing changes: the exact observation is the answer");
});

const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(BigInt(v)); return x; }, i64 = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(BigInt(v)); return x; }, pk = (n) => Buffer.alloc(32, n);
const buyEv = (B, Q, b, { paid = null, ix = null } = {}) => { const q = (Q * b) / (B - b); const e = decodeEvent(Buffer.concat([Buffer.from(DISC.BuyEvent), i64(1), u(b), u(0), u(0), u(0), u(B), u(Q), u(q), u(0), u(0), u(0), u(0), u(q), u(paid ?? q + q / 100n), pk(9), pk(2)]).toString("base64")); e.ix = ix; return { e, q }; };

test("C3 a quote-side break in the reserve chain is a discontinuity; fee dust under 0.1% is counted and tolerated", () => {
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 10n ** 12n;
  const p = { vq: 0 }, a = buyEv(B, Q, b); assert.equal(applyEvent(p, a.e).discontinuity, false);
  const n0 = dec.chainBadQuote, r = applyEvent(p, buyEv(B - b, (Q + a.q) / 2n, b).e);        // base chains exactly, quote reserves halved
  assert.equal(r.discontinuity, true); assert.equal(dec.chainBadQuote, n0 + 1); assert.equal(reduceTx({ ...p }, [buyEv(BigInt(Math.round(p.base * 1e6)), 50_000_000_000n, b).e]).lost, true);
  const p2 = { vq: 0 }, a2 = buyEv(B, Q, b); applyEvent(p2, a2.e); const m0 = dec.chainQuoteMinor;
  const r2 = applyEvent(p2, buyEv(B - b, Q + a2.q + (Q / 100_000n), b).e);                  // 0.001% off: dust
  assert.equal(r2.discontinuity, false); assert.equal(dec.chainQuoteMinor, m0 + 1);
});

test("C3 a multi_hop_swap that happens to fit the curve gives a state but never a fee; a nonsense rate never prices a fill", () => {
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 10n ** 12n, p = { vq: 0 };
  applyEvent(p, buyEv(B, Q, b, { ix: "buy" }).e); assert.ok(Math.abs(p.feeBuy - 0.01) < 1e-6);
  const mh = buyEv(BigInt(Math.round(p.base * 1e6)), BigInt(Math.round(p.quote * 1e9)), b, { ix: "multi_hop_swap" }); mh.e.userQuote = mh.q / 2n; // "paid" half the curve amount → −50%
  const k0 = dec.feeNotMeasured, r = applyEvent(p, mh.e); assert.ok(r && !r.discontinuity, "its reserves are a valid observation"); assert.equal(dec.feeNotMeasured, k0 + 1);
  assert.ok(Math.abs(r.state.feeBuy - 0.01) < 1e-6, "the −50% rate was not installed");
  const inRange = buyEv(BigInt(Math.round(p.base * 1e6)), BigInt(Math.round(p.quote * 1e9)), b, { ix: "multi_hop_swap" }); inRange.e.userQuote = inRange.q + inRange.q / 20n; // 5%: plausible-looking, still not a validated instruction
  applyEvent(p, inRange.e); assert.ok(Math.abs(p.feeBuy - 0.01) < 1e-6, "an unvalidated instruction never sets the fee, even with a plausible number");
});

test("C3 a state rebuilt from a boost event is quarantined: no fill, no peak, no signal until the next swap confirms it", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 100_000, 10);
  e.onSwap(ev(T0 + 605, 210_000)); const en = [...e.entries.values()][0]; assert.equal(en.status, "pending");
  e.onEvent({ t: T0 + 605.5, mint: "MintAAApump", pool: "PoolA", kind: "boost", state: { base: BASE, quote: quoteFor(400_000), feeBuy: 0.003, feeSell: 0.003, supply: 1e9, approx: "boost" }, sol: 0, isBuy: null });
  e.tick(T0 + 606.5); assert.equal(en.status, "pending", "the boost state priced nothing"); assert.equal(e.stats.approxStates, 1); assert.equal(e.entries.size, 1, "and created no second signal");
  e.onSwap(ev(T0 + 607, 230_000)); assert.equal(en.status, "filled"); assert.equal(en.fill.quote_sol, quoteFor(230_000));
});

test("C4 a half-sale is never executed on routed quotes taken at different market moments; a failed quote is dropped, not carried forward", async () => {
  const e = newEntry({ mint: "M", pool: null, ag: "A1", t: 1000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); e.exec = "routed-quote";
  observe(e, { kind: "quote", reqT: 1001, t: 1001.3, buy: { sol: 0.2, tok: 1000, reqT: 1001, t: 1001.3 }, sells: [] }, 1001.3); const tok = e.fill.tok;
  const Qs = (full, half, rf, rh) => ({ kind: "quote", reqT: Math.max(rf, rh), t: Math.max(rf, rh) + 0.3, buy: null, sells: [{ tok, sol: full, reqT: rf, t: rf + 0.3 }, { tok: tok / 2, sol: half, reqT: rh, t: rh + 0.3 }] });
  observe(e, Qs(0.42, 0.21, 1100, 1100.2), 1100.5); const v = e.versions.find((x) => x.policy === "scale" && x.stop === 0.4); assert.equal(v.status, "scaling");
  observe(e, Qs(0.60, 0.21, 1702, 1102), 1702.3);                        // half quoted at 1102, the full holding ten minutes later
  assert.equal(v.status, "scaling", "quotes ten minutes apart are not one pricing state"); assert.equal(v.half, null); assert.equal(v.scaleWaits, 1);
  observe(e, Qs(0.60, 0.30, 1703, 1704), 1704.3);                        // a fresh, coherent pair
  assert.equal(v.status, "open"); assert.ok(Math.abs(v.half.sol - (0.30 - 0.0005)) < 1e-12); assert.equal(v.half.quote_spread_s, 1); assert.equal(v.half.waited_for_coherent_quotes, 1);
  assert.ok(Math.abs(v.peak - (0.60 - 0.0005) * ((0.30 - 0.0005) / (0.60 - 0.0005))) < 1e-9, "the trail is rescaled from quotes of one moment");
  // poller: when the quote for one size fails, the old quote for that size is not offered again
  const M = "SampledCoin9", w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t });
  w.px.set(M, 1e-4); po.add(w.tok(M), "t"); for (let k = 0; k < 31; k++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.05e-4); w.t += 10; await po.sweep(); w.t += 1.1; await po.quotes();
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "filled"); w.t += 11; await po.quotes(); const held = po.held.get(en.id); assert.ok(held.size >= 2);
  w.failSize = Math.floor(en.fill.tok * 1e6); w.t += 11; await po.quotes(); assert.ok(![...held.keys()].some((k) => Math.abs(k - en.fill.tok) < 1e-9), "the failed size holds no stale quote");
});

test("C5 a sampled token without supply or market cap is not valued from a default, and missing decimals are not accepted", async () => {
  assert.equal(validDec(null), false); assert.equal(validDec(undefined), false); assert.equal(validDec(6), true); assert.equal(validDec(6.5), false);
  const M = "NoSupply1", w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t });
  assert.equal(po.add({ ...w.tok("NoDec"), decimals: null }, "t"), false, "decimals: null is rejected"); assert.equal(po.stats.noMeta, 1);
  w.px.set(M, 1e-4); po.add({ ...w.tok(M), circ_supply: null, mcap: null }, "t");
  for (let k = 0; k < 31; k++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.1e-4); w.t += 10; await po.sweep(); // would be "$210,000" at an assumed billion tokens
  assert.equal(eng.entries.size, 0); assert.ok(eng.stats.noValuation > 0); assert.equal(eng.stats.evals ?? 0, 0);
});

test("C5 / B5 a restored sampled position whose stored record lacks decimals is not skipped silently: metadata is fetched again, or the position is flagged", async () => {
  const db = tmpDb(), M = "OldSampled1", w = world(); let st = new Store(db), eng = mkEngine({ store: st }), po = new Poller({ engine: eng, jup: w.jup, store: st, now: () => w.t });
  w.px.set(M, 1e-4); po.add(w.tok(M), "t"); for (let k = 0; k < 31; k++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.05e-4); w.t += 10; await po.sweep(); w.t += 1.1; await po.quotes();
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "filled"); eng.tick(w.t + 2);
  const info = { ...eng.coins.get(M).info }; delete info.decimals; st.setCoinMode(M, null, info); st.db.close();           // the record as an earlier version wrote it
  st = new Store(db); let eng2 = mkEngine({ store: st }); st.restore(eng2); let po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t });
  assert.equal(po2.restore(), 0); assert.equal(po2.stats.restoreNoMeta, 1); assert.equal(await po2.repair(), 1); assert.ok(po2.watch.has(M));
  w.t += 20; const before = eng2.stats.quotes; await po2.quotes(); assert.ok(eng2.stats.quotes > before, "quotes flow again");
  // and when the provider has no metadata either, the position stays visible and flagged
  st.setCoinMode(M, null, info); st.db.close(); st = new Store(db); eng2 = mkEngine({ store: st }); st.restore(eng2); w.meta = false; po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t }); po2.restore();
  assert.equal(await po2.repair(), 0); assert.match([...eng2.entries.values()][0].flags.join(), /restored without token metadata/);
});

test("M1 an executable quote is never queued behind background requests (priority lanes on the one Jupiter rate bucket)", async () => {
  const J = await import("../src/jupiter.mjs"); const order = []; process.env.JUP_RPS = "50";
  J.setFetch(async (url) => { order.push(/order/.test(url) ? "order" : /price/.test(url) ? "price" : "background"); return { status: 200, headers: [], json: async () => (/order/.test(url) ? { outAmount: "5", inAmount: "1" } : /price/.test(url) ? {} : []) }; });
  const bg = []; for (let k = 0; k < 8; k++) bg.push(J.tokenStats("Mint" + k)); const pr = J.prices(["A"]); const q = J.quote("MintQ", "buy", 2e8);
  await Promise.all([...bg, pr, q]); delete process.env.JUP_RPS;
  assert.ok(order.indexOf("order") <= 1, "the quote went out first (at most one request was already in flight): " + order.join()); assert.ok(order.indexOf("price") <= 2); assert.equal(order.filter((x) => x === "background").length, 8);
});

test("M2 every buyer of a transaction is counted, each with its own volume", () => {
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 10n ** 12n, p = { vq: 0 };
  const a = buyEv(B, Q, b); a.e.user = "walletA"; const b2 = buyEv(B - b, Q + a.q + a.q / 100n * 0n, b); b2.e.user = "walletB";
  const x = reduceTx(p, [a.e, { ...buyEv(BigInt(Math.round((Number(B - b)))), BigInt(Math.round(Number(Q + a.q))), b).e, user: "walletB" }]);
  assert.equal(x.buys, 2); assert.deepEqual(x.buyers.map((y) => y[0]), ["walletA", "walletB"]); assert.ok(x.buyers[0][1] > 0 && x.buyers[1][1] > 0);
  const eng = mkEngine(); eng.feedUp(T0); eng.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  eng.onSwap({ ...ev(T0 + 10, 100_000), sol: 3, buyers: [["walletA", 2], ["walletB", 1]] });
  const s = eng.coins.get("MintAAApump").series.winStats(T0, T0 + 60); assert.equal(s.buys, 1); assert.equal(s.buyers, 2); assert.ok(Math.abs(s.top_buyer_share - 2 / 3) < 1e-3);
  assert.equal(eng.coins.get("MintAAApump").series.bars.get(Math.floor((T0 + 10) / 60)).buyers.size, 2);
});

test("M3 trade-window measurements are empty unless exact observations cover the whole window (back-fill and outages do not count)", () => {
  const cov = new Coverage(); cov.up(5000); const sr = new Series("M", cov); sr.startLive(5000);
  const bars = []; for (let m = 20; m <= 83; m++) bars.push({ m, o: 1, h: 1, l: 1, c: 1, v: 500 }); sr.addBars(bars, { from: 1200, to: 5000 });
  assert.equal(sr.histFrom, 1200, "history is back-filled"); assert.equal(sr.obsFrom, 5000, "exact observations start at the live start");
  for (let t = 5010; t <= 5400; t += 10) sr.add(t, 1, 100, true, "w" + (t % 5));
  const f = features({ series: sr, mode: "live", createTs: 0 }, { t: 5400, mc: 5e4, px: 1 }, null, null, null);
  assert.ok(f.w1 && f.w3 && f.w5, "1/3/5-minute windows are fully observed"); assert.equal(f.vol60_usd, null, "the hour is not: no 60-minute volume, no surge ratio"); assert.equal(f.vol_surge5, null);
  cov.drop(5405); cov.up(5450); sr.add(5460, 1, 100, true, "z");
  const g = features({ series: sr, mode: "live", createTs: 0 }, { t: 5460, mc: 5e4, px: 1 }, null, null, null); assert.equal(g.w1, null, "an outage inside the window empties it"); assert.equal(g.w5, null);
});

test("G1 a planned stop saves every open position at once; the regular save is at most 1 second behind", () => {
  const db = tmpDb(), st = new Store(db), e = mkEngine({ store: st }); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 100_000, 10);
  e.onSwap(ev(T0 + 605, 210_000)); e.onSwap(ev(T0 + 607, 212_000)); e.tick(T0 + 608);
  e.onSwap(ev(T0 + 700, 380_000));                                                    // a new peak, not yet check-pointed
  const mem = [...e.entries.values()][0]; assert.ok(st.allEntries().find((x) => x.id === mem.id).versions[0].peak < mem.versions[0].peak);
  assert.equal(e.flush(), 1); assert.ok(Math.abs(st.allEntries().find((x) => x.id === mem.id).versions[0].peak - mem.versions[0].peak) < 1e-12);
  e.onSwap(ev(T0 + 710, 420_000)); e.tick(T0 + 710.2); e.tick(T0 + 711.3);              // 1 s later the regular checkpoint has it
  assert.ok(Math.abs(st.allEntries().find((x) => x.id === mem.id).versions[0].peak - mem.versions[0].peak) < 1e-12);
});
