// Regression tests for the SECOND independent review (ChatGPT, 20 Nov 2026, on commit 5963512) and the Grok review of the same
// commit: C1–C5 = that review's remaining blockers; M1–M3 = its points on the background measurements; G1 = save on stop.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/spec.mjs";
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
  eng2.onSwap(ev(T0 + 641, 50_000, M, "CanonPool")); eng2.onSwap(ev(T0 + 643, 49_000, M, "CanonPool")); // a 75% fall: through every stop, the 70% one included
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
  const p = sr.priceAt(2100 - 900); assert.equal(p.px, 1.6); assert.equal(p.src, "backfill"); assert.ok(2.0 / p.px < 1.3, "the real 15-minute rise is 25%, not the 100% an old observation would suggest");
  assert.equal(sr.priceAt(1005).px, 1.0, "before any back-filled minute has completed, the last exact print is still the answer");
  assert.equal(sr.highIn(1100, 1900).px, 1.6, "highs and lows inside a repaired outage come from its bars");
  const c2 = new Coverage(); c2.up(0); const s2 = new Series("M", c2); s2.startLive(0); s2.add(1000, 1.0); s2.add(1100, 1.1); assert.equal(s2.priceAt(1200).src, "obs", "without back-fill nothing changes: the exact observation is the answer");
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
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "filled"); w.t += 11; await po.quotes(); const held = po.held.get(en.id); assert.ok(held.size >= 1); assert.ok([...held.keys()].some((k) => Math.abs(k - en.fill.tok) < 1e-9)); // one size per routine look since 26 Nov 2026 (the half is asked only while a half-sale is waiting)
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

// ---- third review (ChatGPT on c5dda67, 20 Nov 2026 18:45 UK): T1 back-fill vs exact FAST decisions, T2 boost quarantine ----
test("T1 a REJECTED back-fill leaves nothing behind, and FAST never reads back-fill or a minute bar: a 22% move is not bought as a double", () => {
  // the reviewer's sequence: an outage, a sparse back-fill rejected for a 13-minute hole whose last bar holds a low of 0.00005
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 90_000, 10);
  e.feedDown(T0 + 601); const up = T0 + 2400; e.feedUp(up); const sr = e.coins.get("MintAAApump").series, m0 = Math.floor((T0 + 601) / 60), mEnd = Math.floor((up - 1) / 60);
  const sparse = [{ m: m0, o: 9e-5, h: 9e-5, l: 9e-5, c: 9e-5 }, { m: mEnd - 13, o: 9e-5, h: 9e-5, l: 9e-5, c: 9e-5 }, { m: mEnd, o: 5e-5, h: 9e-5, l: 5e-5, c: 9e-5 }];
  const r = sr.addBars(sparse, { from: T0 + 601, to: up, patchGap: true }); assert.equal(r.accepted, false); assert.equal(sr.bf.size, 0, "rejected bars are not kept anywhere");
  for (let t = up + 1; t < up + 61; t += 5) e.onSwap(ev(t, 90_000)); e.onSwap(ev(up + 62, 110_000)); e.onSwap(ev(up + 64, 111_000));   // a complete exact minute, then +22%
  assert.equal(e.entries.size, 0, "no FAST entry: the lowest exact price in the window is 0.00009");
  // and even an ACCEPTED repair is invisible to the exact path
  const full = []; for (let m = m0; m <= mEnd; m++) full.push({ m, o: 9e-5, h: 9e-5, l: 5e-5, c: 9e-5 }); assert.equal(sr.addBars(full, { from: T0 + 601, to: up, patchGap: true }).accepted, true); assert.ok(sr.bf.size > 0);
  assert.ok(Math.abs(sr.lowIn(up + 5, up + 65, true).px - 9e-5) < 1e-12, "exact low ignores back-fill"); assert.equal(sr.priceAt(up - 30, true), null, "inside the outage the exact price is NOT KNOWN: the last real observation is from before it");
  assert.ok(sr.lowIn(up - 1200, up + 65).px <= 5e-5 + 1e-12, "the hour-scale low does use the accepted bars");
  e.onSwap(ev(up + 70, 112_000)); assert.equal([...e.entries.values()].filter((x) => x.families.some((f) => f.startsWith("FAST"))).length, 0);
});

test("T1 at start-up FAST waits for its own exact window: back-filled history before the live start does not make a seconds-scale window 'covered'", () => {
  const cov = new Coverage(); cov.up(5000); const sr = new Series("M", cov); sr.startLive(5000);
  const bars = []; for (let m = 20; m <= 83; m++) bars.push({ m, o: 1, h: 1, l: 0.4, c: 1 }); assert.equal(sr.addBars(bars, { from: 1200, to: 5000 }).accepted, true);
  sr.add(5010, 1); sr.add(5030, 1.1);
  assert.equal(sr.covered(5030 - 60, 5030), true, "hour-scale coverage: yes (history reaches back)"); assert.equal(sr.covered(5030 - 60, 5030, true), false, "exact coverage: not yet — exact observations began at 5000");
  sr.add(5061, 1.2); assert.equal(sr.covered(5061 - 60, 5061, true), false, "sixth review A: the feed was up from 5000 but the first exact price came at 5010 — a window starting at 5001 has no known starting price");
  sr.add(5071, 1.2); assert.equal(sr.covered(5071 - 60, 5071, true), true, "exact once the window starts at or after the first exact observation"); assert.equal(sr.lowIn(5011, 5071, true).px, 1, "and its low comes from exact observations only, not the back-filled 0.4");
  const eng = mkEngine(); eng.feedUp(T0); eng.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); const s2 = eng.coins.get("MintAAApump").series;
  const hb = []; for (let m = Math.floor((T0 - 3600) / 60); m < Math.floor(T0 / 60); m++) hb.push({ m, o: 5e-5, h: 5e-5, l: 5e-5, c: 5e-5 }); assert.equal(s2.addBars(hb, { from: T0 - 3600, to: T0 }).accepted, true);
  eng.onSwap(ev(T0 + 5, 100_000)); eng.onSwap(ev(T0 + 8, 105_000)); // "doubled" against the back-filled 50K, 8 s after the live start
  assert.equal([...eng.entries.values()].filter((x) => x.families.some((f) => f.startsWith("FAST"))).length, 0);
});

test("T1 boundary: a back-filled close is kept even when an incomplete live candle already occupies that minute", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  sr.add(1000, 1.0); cov.drop(1001); cov.up(1900);                               // live bar of minute 16 (960–1019) holds only the 1.00 print
  const bars = []; for (let m = 16; m <= 31; m++) bars.push({ m, o: 1.0, h: 1.6, l: 1.0, c: 1.6 }); assert.equal(sr.addBars(bars, { from: 1001, to: 1900, patchGap: true }).accepted, true);
  assert.equal(sr.bars.get(16).c, 1.0, "the live candle is untouched"); assert.equal(sr.bf.get(16).c, 1.6, "and the back-filled minute is kept beside it");
  const p = sr.priceAt(1025); assert.equal(p.px, 1.6, "minute 16 closed at 1.60 after the 1.00 print: the newer close is used"); assert.equal(p.src, "backfill"); assert.equal(sr.priceAt(1025, true), null, "exact use: nothing is known inside the outage"); assert.equal(sr.priceAt(1000.5, true).px, 1.0);
});

test("T2 a deposit or withdrawal after a boost does not release the quarantine: only the next swap does", () => {
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 10n ** 12n, p = { vq: 0 }; const a = buyEv(B, Q, b); applyEvent(p, a.e);
  const boost = applyEvent(p, { type: "boost", virtualQuote: 0n, realQuoteAfter: BigInt(Math.round(p.quote * 1e9)), baseAfter: BigInt(Math.round(p.base * 1e6)) }); assert.equal(boost.approx, "boost");
  const dep = applyEvent(p, { type: "deposit", poolBase: BigInt(Math.round(p.base * 1e6)), poolQuote: BigInt(Math.round(p.quote * 1e9)), baseAmt: 1_000_000n, quoteAmt: 1_000n });
  assert.ok(dep); assert.equal(dep.approx, "boost", "still unconfirmed");
  const wd = applyEvent(p, { type: "withdraw", poolBase: BigInt(Math.round(p.base * 1e6)), poolQuote: BigInt(Math.round(p.quote * 1e9)), baseAmt: 1_000_000n, quoteAmt: 1_000n }); assert.equal(wd.approx, "boost");
  const sw = buyEv(BigInt(Math.round(p.base * 1e6)), BigInt(Math.round(p.quote * 1e9)), b); const r = applyEvent(p, sw.e); assert.ok(r); assert.equal(r.approx, undefined, "a swap carries its own reserves: released");
  const d2 = applyEvent(p, { type: "deposit", poolBase: BigInt(Math.round(p.base * 1e6)), poolQuote: BigInt(Math.round(p.quote * 1e9)), baseAmt: 1_000_000n, quoteAmt: 1_000n }); assert.equal(d2.approx, undefined, "after that swap a deposit is an ordinary state again");
  // engine: the pending buy stays blocked through boost AND deposit, and fills on the swap
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 100_000, 10);
  e.onSwap(ev(T0 + 605, 210_000)); const en = [...e.entries.values()][0]; const st = (mc) => ({ base: BASE, quote: quoteFor(mc), feeBuy: 0.003, feeSell: 0.003, supply: 1e9, approx: "boost" });
  e.onEvent({ t: T0 + 605.4, mint: "MintAAApump", pool: "PoolA", kind: "boost", state: st(400_000), sol: 0, isBuy: null });
  e.onEvent({ t: T0 + 605.8, mint: "MintAAApump", pool: "PoolA", kind: "deposit", state: st(410_000), sol: 0, isBuy: null }); e.tick(T0 + 606.5);
  assert.equal(en.status, "pending"); assert.equal(e.stats.approxStates, 2); e.onSwap(ev(T0 + 607, 230_000)); assert.equal(en.status, "filled"); assert.equal(en.fill.quote_sol, quoteFor(230_000));
});

test("T3 (left-and-labelled items) compression is flagged and keeps every buyer; a quoted valuation carries its own quote's time", async () => {
  const { RAW_CAP } = await import("../src/spec.mjs"); const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  for (let k = 0; k < RAW_CAP; k++) sr.add(100 + k * 0.5, 1, 1, false);
  const t = 100 + RAW_CAP * 0.5 + 10; sr.add(t, 1, 200, true, "walletA"); sr.add(t + 0.2, 1, 100, true, "walletB"); sr.add(t + 0.4, 1, 50, false); // same second, buffer full → the two older ones are merged, the newest stays exact
  const w = sr.winStats(t - 1, t + 1); assert.equal(w.compressed, true); assert.equal(w.buyers, 2); assert.ok(Math.abs(w.top_buyer_share - 2 / 3) < 1e-3, "66.7%, not 100%"); assert.equal(w.vol_usd, 350);
  assert.equal(sr.winStats(100, 200).compressed, undefined, "windows without a merge are not flagged");
  const e = newEntry({ mint: "M", pool: null, ag: "A1", t: 1000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); e.exec = "routed-quote";
  observe(e, { kind: "quote", reqT: 1001, t: 1001.3, buy: { sol: 0.2, tok: 1000, reqT: 1001, t: 1001.3 }, sells: [] }, 1001.3); const tok = e.fill.tok;
  observe(e, { kind: "quote", reqT: 1500, t: 1500.3, buy: null, sells: [{ tok, sol: 0.25, reqT: 1100, t: 1100.3 }, { tok: tok / 2, sol: 0.12, reqT: 1500, t: 1500.3 }] }, 1500.3); // the half was re-quoted; the full holding's quote is 400 s old
  assert.equal(e.versions[0].lastT, 1100.3, "the full position's valuation is dated by its own quote, not by the newest reply");
});

test("M1b routine position valuations do not starve price sampling: only an order that is DUE takes the first lane", async () => {
  const J = await import("../src/jupiter.mjs"); const order = []; process.env.JUP_RPS = "50";
  J.setFetch(async (url) => { order.push(/order/.test(url) ? (/amount=7\b/.test(url) ? "due" : "valuation") : /price/.test(url) ? "price" : "background"); return { status: 200, headers: [], json: async () => (/order/.test(url) ? { outAmount: "5", inAmount: "1" } : /price/.test(url) ? {} : []) }; });
  const first = J.prices(["warm-up"]);                                    // occupies the in-flight slot
  const jobs = [J.quote("M", "sell", 1, { urgent: false }), J.prices(["A"]), J.quote("M", "sell", 2, { urgent: false }), J.prices(["B"]), J.quote("M", "sell", 7, { urgent: true })];
  await Promise.all([first, ...jobs]); delete process.env.JUP_RPS;
  // the due order is sent first, or second if the warm-up request was already in flight (which depends on the clock, not on the rule)
  assert.ok(order.indexOf("due") <= 1, "the due order goes first: " + order.join()); assert.deepEqual(order.filter((x) => x !== "due"), ["price", "valuation", "price", "valuation", "price"], "valuations and price samples keep their arrival order");
});

test("watch list: a token the provider stops pricing is dropped after 10 misses and not restored; a token with a position always is", async () => {
  const db = tmpDb(), w = world(); let st = new Store(db), eng = mkEngine({ store: st }), po = new Poller({ engine: eng, jup: w.jup, store: st, now: () => w.t });
  const M = "HeldCoin1", D = "DeadCoin1"; w.px.set(D, 1e-5); po.add(w.tok(D), "t"); const en = await sampledEntry2(w, eng, po, M); assert.equal(en.status, "filled");
  w.px.delete(D); for (let k = 0; k < 11; k++) { w.t += 61; await po.sweep(); }
  assert.ok(!po.watch.has(D)); assert.equal(po.stats.droppedUnpriced, 1); assert.ok(eng.coins.get(D).info.unpriced > 0);
  w.px.delete(M); for (let k = 0; k < 12; k++) { w.t += 61; await po.sweep(); } assert.ok(po.watch.has(M), "a token with an open position is never dropped");
  eng.tick(w.t + 2); st.db.close(); st = new Store(db); const eng2 = mkEngine({ store: st }); st.restore(eng2); const po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t });
  assert.equal(po2.restore(), 1); assert.ok(po2.watch.has(M) && !po2.watch.has(D)); assert.equal(po2.stats.restoreSkippedUnpriced, 1);
  w.px.set(D, 2e-5); assert.equal(po2.add(w.tok(D), "rediscovery"), true, "discovery brings it back when it trades again"); assert.equal(eng2.coins.get(D).info.unpriced, null);
});
async function sampledEntry2(w, eng, po, M) { w.px.set(M, 1e-4); po.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.05e-4); w.t += 10; await po.sweep(); w.t += 1.1; await po.quotes(); return [...eng.entries.values()].find((x) => x.mint === M); }

// ---- fourth review (ChatGPT on e511f2f, 20 Nov 2026 19:51 UK): F1 the authoritative candle; F2–F4 its three non-blocking points ----
test("F1 one rule for the authoritative candle: a live minute cut by an outage yields to an accepted repair; a fully observed live minute is kept; never both added", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  sr.add(960, 1.0, 5, true, "a"); sr.add(1000, 1.0, 5, true, "b");                 // minute 16: two prints, then the feed drops
  cov.drop(1001); cov.up(1200);
  const bars = [16, 17, 18, 19].map((m) => ({ m, o: 1.0, h: 1.5, l: 1.0, c: 1.5, v: 38 })); assert.equal(sr.addBars(bars, { from: 1001, to: 1200, patchGap: true }).accepted, true);
  sr.add(1200, 1.5, 7, true, "c"); sr.add(1230, 1.5, 7, true, "d");                 // minute 20: fully observed after the outage
  sr.bf.set(20, { o: 9, h: 9, l: 9, c: 9, v: 999, nb: 0, ns: 0, buyers: new Set(), lowT: 1200, bf: true }); // even if a back-filled candle existed for it
  assert.equal(sr.liveComplete(16), false); assert.equal(sr.liveComplete(20), true);
  assert.equal(sr.barAt(16).c, 1.5, "minute 16: the repaired whole-minute candle (+50%), not the live fragment (0%)"); assert.equal(sr.barAt(16).v, 38, "its volume is the repair's, not repair + fragment");
  assert.equal(sr.barAt(20).v, 14, "minute 20: complete live data is never replaced by back-fill"); assert.equal(sr.barAt(20).c, 1.5);
  const all = sr.barsIn(16, 21); assert.deepEqual(all.map(([m]) => m), [16, 17, 18, 19, 20]); assert.equal(all.reduce((x, [, b]) => x + b.v, 0), 38 * 4 + 14, "no double counting");
  const s2 = new Series("M", cov); s2.startLive(0); s2.add(1000, 1.0, 5, true, "b"); assert.equal(s2.barAt(16).v, 5, "a partial minute with no repair: the fragment is all that is known");
});

test("F1 SLOW-BUILD: a +50% candle hidden behind a partial live candle is seen after the repair, and the entry is refused", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 4 * H }); const notes = []; e.store = { saveNote: (m, n) => notes.push(n), saveEntry() {}, saveDecision() {}, saveBar() {}, feedEvent() {}, setCoinMode() {} };
  path(e, T0, T0 + 4 * H + 60, () => 50_000); const t1 = T0 + 4 * H + 60; path(e, t1, t1 + 35 * 60, (t) => 50_000 + (t - t1) / 60 * 300);
  const tm = t1 + 35 * 60, M = Math.floor(tm / 60); swap(e, tm + 1, 61_000);                               // the live fragment of minute M: open = close = 61K
  e.feedDown(tm + 2); e.feedUp(tm + 120);
  const sr = e.coins.get("MintAAApump").series; assert.equal(sr.addBars([{ m: M, o: 6.1e-5, h: 9.15e-5, l: 6.1e-5, c: 9.15e-5, v: 100 }, { m: M + 1, o: 9.15e-5, h: 9.15e-5, l: 9.15e-5, c: 9.15e-5, v: 50 }], { from: tm + 2, to: tm + 120, patchGap: true }).accepted, true);
  path(e, tm + 120, tm + 120 + 20 * 60, (t) => 92_000 + (t - tm - 120) / 60 * 1_000);
  const low = [...e.entries.values()].filter((x) => x.families.includes("LOW4H")); assert.equal(low.length, 1, "LOW4H itself still enters (the outage was repaired for hour-scale windows)");
  assert.ok(!low[0].families.includes("SLOW-BUILD"), "SLOW-BUILD refused: " + low[0].families.join()); assert.ok(notes.some((n) => n.family === "SLOW-BUILD" && /above \+20%/.test(n.reason) && n.detail.max_candle_gain >= 0.49));
});

test("F1 HH-BREAK: volume of repaired minutes counts in the signal window, so a qualifying break is not missed", () => {
  const run = (repair) => { const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 3.5 * H }); path(e, T0, T0 + 4.5 * H, () => 100_000, 60, { sol: 1 }); // $100 a minute baseline → 15-min buckets of $1,500, threshold $3,000
    const t1 = T0 + 4.5 * H, sr = e.coins.get("MintAAApump").series;
    for (let k = 0; k < 14; k++) { const a = t1 + k * 60; swap(e, a, 100_000, { sol: 0.1 }); e.feedDown(a + 1); e.feedUp(a + 50);      // each minute: one $10 print, then 49 s unseen
      if (repair) assert.equal(sr.addBars([{ m: Math.floor(a / 60), o: 1e-4, h: 1e-4, l: 1e-4, c: 1e-4, v: 300 }], { from: a + 1, to: a + 50, patchGap: true }).accepted, true); }
    swap(e, t1 + 14 * 60 + 5, 101_000, { sol: 3 }); return [...e.entries.values()].find((x) => x.families.includes("HH-BREAK")); };
  const h = run(true); assert.ok(h, "entered: the repaired minutes carry $300 each"); const d = h.cands.find((c) => c.family === "HH-BREAK").detail; assert.equal(d.vol15, 100 + 14 * 300, "repaired volume, not the $10 fragments and not both"); assert.ok(d.vol15 >= 2 * d.base_median);
  assert.equal(run(false), undefined, "control: without a repair those windows are not covered and nothing is claimed");
});

test("F2 compression keeps the first buyer through buy → sell → buy in one second", async () => {
  const { RAW_CAP } = await import("../src/spec.mjs"); const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  for (let k = 0; k < RAW_CAP; k++) sr.add(100 + k * 0.5, 1, 1, false); const t = 100 + RAW_CAP * 0.5 + 10;
  sr.add(t, 1, 200, true, "walletA"); sr.add(t + 0.1, 1, 50, false); sr.add(t + 0.2, 1, 100, true, "walletB");
  const w = sr.winStats(t - 1, t + 1); assert.equal(w.buyers, 2, "walletA survives the sell in between"); assert.equal(w.compressed, true); assert.ok(Math.abs(w.top_buyer_share - 2 / 3) < 1e-3); assert.equal(w.vol_usd, 350);
});

test("F3 a coin that goes quiet for hours keeps its standing price: the wake-up trade is measured against it", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 30 * 24 * H }); path(e, T0, T0 + 600, () => 60_000, 10);
  const sr = e.coins.get("MintAAApump").series; for (let t = T0 + 660; t <= T0 + 6 * H; t += 60) { e.tick(t); e.prune(t); }       // six silent hours: observations and bars age out
  assert.equal(sr.raw.length, 0); assert.equal(sr.bars.size, 0); assert.ok(sr.anchor && Math.abs(sr.anchor[1] - 6e-5) < 1e-12, "the last exact price is kept as the anchor");
  const p = sr.priceAt(T0 + 6 * H, true); assert.equal(p.src, "anchor"); assert.ok(Math.abs(p.px - 6e-5) < 1e-12);
  e.onSwap(ev(T0 + 6 * H + 5, 125_000));                                                                        // the wake-up trade: 2.08× the standing price
  const f = [...e.entries.values()].find((x) => x.families.includes("FAST-1M")); assert.ok(f, "the wake-up double is seen"); const d = f.cands.find((c) => c.family === "FAST-1M").detail; assert.equal(d.low_carried_in, true); assert.ok(Math.abs(d.low_px - 6e-5) < 1e-12);
  e.coinLost("MintAAApump", T0 + 6 * H + 6); assert.equal(sr.anchor, null, "a loss of the coin's data clears the anchor: nothing before it is continuous");
});

test("F4 audit rows: a rejected back-fill is stored with its label and never overwrites a live row", () => {
  const st = new Store(tmpDb()); st.saveBar("M", 10, { o: 1, h: 1, l: 1, c: 1, v: 5, nb: 1, ns: 0, buyers: new Set(["a"]) });
  st.saveBackfillBar("M", 10, { o: 9, h: 9, l: 9, c: 9, v: 9 }, true); st.saveBackfillBar("M", 11, { o: 2, h: 2, l: 2, c: 2, v: 2 }, false); st.saveBackfillBar("M", 12, { o: 3, h: 3, l: 3, c: 3, v: 3 }, true);
  const rows = Object.fromEntries(st.db.prepare("SELECT m, c, src FROM bars WHERE mint='M' ORDER BY m").all().map((r) => [r.m, r]));
  assert.equal(rows[10].src, "live"); assert.equal(rows[10].c, 1); assert.equal(rows[11].src, "backfill-rejected"); assert.equal(rows[12].src, "backfill");
});

test("a buy that becomes due is quoted at once even while a slow valuation pass is running (urgent and routine passes are independent)", async () => {
  const w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t }); const A = "HeldCoinA", Bc = "NewCoinB";
  const a = await sampledEntry2(w, eng, po, A); assert.equal(a.status, "filled");
  w.px.set(Bc, 1e-4); po.add(w.tok(Bc), "t"); for (let i = 0; i < 31; i++) { w.t += 10; await po.sweep(); }
  // a routine valuation of coin A hangs in the queue (as it does behind price samples on a slow key)
  let release; const gate = new Promise((r) => (release = r)); const fast = w.jup.quote; w.jup.quote = async (m, side, raw, o = {}) => { if (!o.urgent) await gate; return fast(m, side, raw, o); };
  const routine = po.quotes("routine"); await new Promise((r) => setTimeout(r, 5));
  w.px.set(Bc, 2.05e-4); w.t += 10; await po.sweep(); const b = [...eng.entries.values()].find((x) => x.mint === Bc); assert.equal(b.status, "pending");
  w.t += 1.1; await po.quotes("urgent"); assert.equal(b.status, "filled", "filled while the valuation pass is still waiting"); assert.ok(b.fill.delay_s < 5);
  release(); await routine;
});

// ---- fifth review (ChatGPT on 938198b, 21 Nov 2026 12:32 UK): P = price continuity (provenance of every carried price) ----
test("P1 a price from before a feed gap is never the starting price of a later window (the reviewer's $50K → gap → $90K → $110K)", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 30 * 24 * H }); path(e, T0, T0 + 600, () => 50_000, 10);
  e.feedDown(T0 + 601); const up = T0 + 3 * H; e.feedUp(up); const sr = e.coins.get("MintAAApump").series;
  e.onSwap(ev(up + 100, 90_000)); e.onSwap(ev(up + 130, 110_000));          // window [up+70, up+130) has no gap in it; its carried-in price would be the pre-gap $50K
  assert.equal(sr.priceAt(up + 70, true), null, "the price standing at the window start is not known"); assert.ok(Math.abs(sr.lowIn(up + 70, up + 130, true).px - 9e-5) < 1e-12);
  assert.equal([...e.entries.values()].filter((x) => x.families.some((f) => f.startsWith("FAST"))).length, 0, "110 against 90 is not a double");
  // …while VERIFIED silence of any length still carries the price (no age cut-off)
  const g = mkEngine(); g.feedUp(T0); g.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 30 * 24 * H }); path(g, T0, T0 + 600, () => 50_000, 10);
  g.onSwap(ev(T0 + 3 * H + 100, 110_000)); assert.ok([...g.entries.values()].some((x) => x.families.includes("FAST-1M")), "three quiet hours with the feed up: the $50K still stands and the double is real");
});

test("P2 after a loss of the coin's data neither the anchor nor an old live-bar close supplies the reference", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 30 * 24 * H }); path(e, T0, T0 + 600, () => 50_000, 10);
  const sr = e.coins.get("MintAAApump").series; assert.ok(sr.bars.size > 5); e.coinLost("MintAAApump", T0 + 700);
  assert.equal(sr.anchor, null); assert.ok(sr.bars.size > 5, "the old live bars are still in memory…"); assert.equal(sr.priceAt(T0 + 2000, true), null, "…but their closes are not carried across the loss"); assert.equal(sr.priceAt(T0 + 2000), null);
  e.onSwap(ev(T0 + 2100, 90_000)); e.onSwap(ev(T0 + 2130, 110_000)); assert.equal(e.entries.size, 0);
});

test("P3 a sampled coin dropped from the watch list and re-admitted in the same process starts with an empty history", async () => {
  const M = "DropBack1", w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t });
  w.px.set(M, 5e-5); po.add(w.tok(M), "t"); for (let k = 0; k < 20; k++) { w.t += 10; await po.sweep(); } const old = eng.coins.get(M).series; assert.ok(old.bars.size > 0);
  w.px.delete(M); for (let k = 0; k < 11; k++) { w.t += 61; await po.sweep(); } assert.ok(!po.watch.has(M)); assert.equal(po.stats.droppedUnpriced, 1);
  w.t += 3600; w.px.set(M, 9e-5); assert.equal(po.add(w.tok(M), "rediscovery"), true); const sr = eng.coins.get(M).series;
  assert.notEqual(sr, old); assert.equal(sr.bars.size, 0); assert.equal(sr.obsFrom, null); assert.equal(po.stats.readmitted, 1);
  w.t += 10; await po.sweep(); w.px.set(M, 1.1e-4); w.t += 10; await po.sweep(); w.t += 10; await po.sweep();
  assert.equal(eng.entries.size, 0, "$110K against a first new sample of $90K — the old $50K bar is gone"); assert.ok(sr.obsFrom > w.t - 100);
});

test("P4 a boost quarantine is a recorded price break: it empties exact windows, makes its minute incomplete, and its candle yields to an accepted repair", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 600, () => 100_000, 10);
  const sr = e.coins.get("MintAAApump").series, tq = T0 + 605, M = Math.floor(tq / 60);
  e.onEvent({ t: tq, mint: "MintAAApump", pool: "PoolA", kind: "boost", state: { base: BASE, quote: quoteFor(150_000), feeBuy: 0.003, feeSell: 0.003, supply: 1e9, approx: "boost" }, sol: 0, isBuy: null });
  assert.equal(e.stats.priceBreaks, 1); assert.deepEqual(sr.own, [[tq, null]]); assert.equal(sr.continuous(T0 + 590, tq + 30), false);
  e.onSwap(ev(tq + 20, 150_000)); assert.deepEqual(sr.own, [[tq, tq + 20]], "closed by the confirming swap, kept on record");
  assert.equal(sr.liveComplete(M), false, "the minute containing the quarantine is not fully observed"); assert.equal(sr.liveComplete(M - 2), true);
  assert.equal(sr.covered(tq - 30, tq + 40, true), false); assert.equal(sr.covered(tq + 20, tq + 60, true), true, "from the confirming swap onward exact coverage holds again");
  assert.equal(sr.priceAt(tq + 10, true), null, "inside the quarantine the price is not known"); assert.equal(sr.covered(T0, tq + 60), false, "and hour-scale windows spanning it are not covered either");
  sr.bf.set(M, { o: 1e-4, h: 1.5e-4, l: 1e-4, c: 1.5e-4, v: 77, nb: 0, ns: 0, buyers: new Set(), lowT: M * 60, bf: true }); assert.equal(sr.barAt(M).v, 77, "the partial live candle no longer hides the +50% repair");
  e.onSwap(ev(tq + 25, 205_000)); e.onSwap(ev(tq + 27, 206_000)); assert.equal([...e.entries.values()].filter((x) => x.families.some((f) => f.startsWith("FAST"))).length, 0, "no FAST entry measured from the pre-boost $100K");
});

test("P5 an order that becomes due while a pass is waiting is dispatched as urgent", async () => {
  const w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t }); const en = await sampledEntry2(w, eng, po, "UrgCoin1"); assert.equal(en.status, "filled"); const en2 = await sampledEntry2(w, eng, po, "UrgCoin2"); assert.equal(en2.status, "filled"); // two positions: one request each in a routine pass (the half is no longer asked at every look)
  const seen = []; const fast = w.jup.quote; w.jup.quote = async (m, side, raw, o = {}) => { seen.push(o.urgent); w.t += 2; return fast(m, side, raw, o); };
  const real = eng.quoteNeeds.bind(eng); eng.quoteNeeds = (now) => real(now).map((n) => ({ ...n, due: w.t + 0.5 }));   // a sale due half a second into the pass
  w.t += 11; await po.quotes("routine"); assert.equal(seen[0], false, "not yet due at the first request"); assert.ok(seen.slice(1).length > 0 && seen.slice(1).every((u) => u === true), "due by the later requests: first lane — " + seen.join());
});

// ---- older-4 (21 Nov 2026, owner's decision): FAST-10M, FAST-30M, FAST150-10M ----
test("older-4: a double that takes 8 minutes enters FAST-10M and FAST-30M (not the 1/3/5-minute books), records how long it took, and does not seed SECOND-WAVE", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 2400, () => 60_000, 10);
  const t0 = T0 + 2400; for (let k = 1; k <= 48; k++) e.onSwap(ev(t0 + k * 10, 60_000 + k * 1_300));      // +$1,300 every 10 s: 2× after about 7.7 minutes
  const fams = new Set([...e.entries.values()].flatMap((x) => x.families));
  assert.ok(fams.has("FAST-10M") && fams.has("FAST-30M"), "the slower books see it: " + [...fams].join()); assert.ok(!fams.has("FAST-1M") && !fams.has("FAST-3M") && !fams.has("FAST-5M"), "it never doubled inside 5 minutes");
  assert.ok(fams.has("FAST150-10M") || fams.has("FAST150-5M"));
  const en = [...e.entries.values()].find((x) => x.families.includes("FAST-10M")), d = en.cands.find((c) => c.family === "FAST-10M").detail;
  assert.equal(d.window_s, 600); assert.ok(d.move_s > 400 && d.move_s <= 600, "seconds from the low to the trigger: " + d.move_s);
  assert.equal(e.coins.get("MintAAApump").sw, null, "a 10/30-minute double does not seed SECOND-WAVE"); assert.ok(!e.coins.get("MintAAApump").groups?.A1?.done?.["SECOND-WAVE"]);
});

test("older-4: the 30-minute book needs 30 minutes of unbroken exact observation, like every FAST book", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(e, T0, T0 + 900, () => 60_000, 10);
  e.onSwap(ev(T0 + 905, 125_000)); e.onSwap(ev(T0 + 907, 126_000));                                         // a real double, 15 minutes after the feed came up
  const fams = new Set([...e.entries.values()].flatMap((x) => x.families));
  assert.ok(fams.has("FAST-1M") && fams.has("FAST-10M")); assert.ok(!fams.has("FAST-30M"), "only 15 minutes observed: the 30-minute window is not covered");
});

test("watch list: a token pruned as far below the band is not restored after a restart; a re-discovery brings it back with a clean history", async () => {
  const db = tmpDb(), w = world(); let st = new Store(db), eng = mkEngine({ store: st }), po = new Poller({ engine: eng, jup: w.jup, store: st, now: () => w.t });
  const L = "LowCoin1", K = "KeptCoin1"; w.px.set(L, 2e-6); w.px.set(K, 1e-4); po.add(w.tok(L), "t"); po.add(w.tok(K), "t");       // L is worth $2K, far below the band
  for (let k = 0; k < 125; k++) { w.t += 60; await po.sweep(); }
  assert.ok(!po.watch.has(L) && po.watch.has(K)); assert.equal(po.stats.pruned, 1); assert.ok(eng.coins.get(L).info.pruned_low > 0);
  st.db.close(); st = new Store(db); const eng2 = mkEngine({ store: st }); st.restore(eng2); const po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t });
  assert.equal(po2.restore(), 1); assert.ok(po2.watch.has(K) && !po2.watch.has(L)); assert.equal(po2.stats.restoreSkippedLow, 1);
  w.px.set(L, 9e-5); assert.equal(po2.add(w.tok(L), "rediscovery"), true); assert.equal(eng2.coins.get(L).info.pruned_low, null); assert.equal(eng2.coins.get(L).series.bars.size, 0);
});

// ---- older-5 (21 Nov 2026, owner's decision): a 60% trailing stop, and website-only stake views ----
test("older-5: the 60% stop is its own row — a 45% fall sells the 20–40% versions and leaves the 60% version open; a 65% fall sells it", async () => {
  const { newEntry, advance, observe } = await import("../src/book.mjs");
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 0, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 });
  assert.deepEqual([...new Set(e.versions.map((v) => v.stop))], [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.65, 0.7]); // 50% added 26 Nov 2026 07:01 UK, 65% and 70% at 11:18 UK (owner)
  advance(e, 1.5, st(100, 0), yes); assert.equal(e.status, "filled");
  const T = (s) => e.versions.find((v) => v.policy === "trail" && v.stop === s);
  observe(e, st(55, 50), 50); advance(e, 51, st(55, 50), yes);                 // pool SOL side 100 → 55: position value −45%
  assert.equal(T(0.4).status, "closed"); assert.equal(T(0.5).status, "open", "a 45% fall is inside the 50% stop"); assert.equal(T(0.6).status, "open", "a 45% fall is inside the 60% stop");
  observe(e, st(35, 60), 60); advance(e, 61, st(35, 60), yes);                 // −65% from the peak
  assert.equal(T(0.5).status, "closed"); assert.equal(T(0.5).reason, "trail"); assert.equal(T(0.6).status, "closed"); assert.equal(T(0.6).reason, "trail"); assert.ok(T(0.6).exit.ret < -0.6 && T(0.6).exit.ret > -0.72);
});
test("stake view: at 0.2 SOL the re-priced trade equals the recorded one; bigger stakes pay more price impact and are never a plain multiple", async () => {
  const { newEntry, advance, observe, atStake } = await import("../src/book.mjs");
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.0025, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 0, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 });
  advance(e, 1.5, st(80, 0), yes);
  observe(e, st(180, 100), 100); advance(e, 101, st(180, 100), yes);           // value 2.25× → the half-at-2× versions sell half
  const open = e.versions.find((v) => v.policy === "trail" && v.stop === 0.25), o1 = atStake(e, open, 0.2), o5 = atStake(e, open, 5);
  assert.ok(Math.abs(o1.now_x - open.lastX) < 1e-12, "an open position at 0.2 SOL shows its recorded value"); assert.ok(o5.now_x < o1.now_x && o5.closed === false);
  observe(e, st(85, 200), 200); advance(e, 201, st(85, 200), yes);             // −50% from the peak: stops 20–40% sell
  for (const policy of ["trail", "scale"]) {
    const v = e.versions.find((x) => x.policy === policy && x.stop === 0.25); assert.equal(v.status, "closed"); assert.ok(v.exit.pool && v.exit.pool.q === 85 && v.exit.pool.f === 0.0025, "the pool at the sale is saved");
    if (policy === "scale") assert.ok(v.half && v.half.pool.q === 180);
    const a = atStake(e, v, 0.2); assert.ok(Math.abs(a.ret - v.exit.ret) < 1e-12 && Math.abs(a.sol - v.exit.sol) < 1e-12, policy + ": 0.2 SOL reproduces the recorded trade exactly");
    const r = [0.2, 0.5, 1, 2, 5].map((s) => atStake(e, v, s));
    for (let i = 1; i < r.length; i++) assert.ok(r[i].ret < r[i - 1].ret, policy + ": the return falls as the stake grows (price impact)");
    assert.ok(r[4].net < 25 * r[0].net - 0.05, policy + ": 5 SOL is clearly less than 25 × the 0.2 SOL profit"); assert.equal(r[4].cost, 5.0005);
  }
});
test("stake view: every stake shows the same trades — a routed-quote trade cannot be re-priced and keeps its 0.2 SOL percentage result (flagged); a sale recorded before pools were saved is re-priced on a pool rebuilt from the sale and marked as an estimate", async () => {
  const { newEntry, advance, observe, atStake } = await import("../src/book.mjs"); const { booksApi } = await import("../src/page.mjs");
  const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const mk = (mint) => { const e = newEntry({ mint, pool: "P", ag: "A1", t: 0, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); advance(e, 1.5, st(100, 0), yes); observe(e, st(50, 50), 50); advance(e, 51, st(50, 50), yes); return e; };
  const a = mk("A"), old = mk("B"), rq = mk("C");
  for (const v of old.versions) if (v.exit) delete v.exit.pool;                 // as stored by earlier versions of the program
  rq.fill.exec = "routed-quote"; rq.fill.quote_sol = null; rq.fill.base = null; // a Jupiter-quoted trade
  const v = (e) => e.versions.find((x) => x.policy === "trail" && x.stop === 0.25);
  assert.ok(atStake(a, v(a), 2)); assert.equal(atStake(a, v(a), 2).est, false); assert.equal(atStake(rq, v(rq), 2), null);
  const o02 = atStake(old, v(old), 0.2), o2 = atStake(old, v(old), 2); assert.equal(o2.est, true);
  assert.ok(Math.abs(o02.ret - v(old).exit.ret) < 1e-9, "the rebuilt pool reproduces the recorded 0.2 SOL sale"); assert.ok(o2.ret < o02.ret, "and a bigger stake still pays more impact");
  // when k really was unchanged between buy and sale, the rebuilt pool IS the pool: same answer as with saved reserves
  const kk = newEntry({ mint: "K", pool: "P", ag: "A1", t: 0, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); const sk = (q, t) => ({ base: 2e10 / q, quote: q, feeBuy: 0.003, feeSell: 0.003, t });
  advance(kk, 1.5, sk(100, 0), yes); observe(kk, sk(60, 50), 50); advance(kk, 51, sk(60, 50), yes); const exact = atStake(kk, v(kk), 5); delete v(kk).exit.pool; const rebuilt = atStake(kk, v(kk), 5);
  assert.equal(v(kk).status, "closed"); assert.ok(Math.abs(exact.ret - rebuilt.ret) < 1e-9 && rebuilt.est === true && exact.est === false);
  const j1 = booksApi([a, old, rq], { stop: 0.25, policy: "trail" }), j2 = booksApi([a, old, rq], { stop: 0.25, policy: "trail", stake: 2 });
  assert.equal(j1.books.LOW4H.filter((t) => t.ret != null).length, 3); assert.equal(j1.stake, 0.2); assert.equal(j1.rows_total, 149 * S.STOPS.length * S.POLICIES.length);
  const b = j2.books.LOW4H; assert.equal(b.length, 3); assert.equal(b.filter((t) => t.flat).length, 1); assert.equal(b.find((t) => t.mint === "B").est, true);
  const fl = b.find((t) => t.flat), f1 = j1.books.LOW4H.find((t) => t.mint === fl.mint); assert.equal(fl.mint, "C"); assert.equal(fl.ret, f1.ret, "same percentage as at 0.2 SOL"); assert.ok(Math.abs(fl.net - f1.ret * 2.0005) < 1e-12, "on the larger stake");
  assert.equal(b.filter((t) => t.ret != null).length, j1.books.LOW4H.filter((t) => t.ret != null).length, "no trade drops out when the stake changes");
  const ra = b.find((t) => t.mint === "A"), r1 = j1.books.LOW4H.find((t) => t.mint === "A"); assert.ok(ra.ret < r1.ret && ra.net < 0 && Math.abs(ra.net) > 5 * Math.abs(r1.net)); assert.equal(j2.cost, 2.0005);
});

// ---- sixth review (ChatGPT on 8474066, 21 Nov 2026 14:28 UK): A = loss vs recovery, C = compression keeps the price path ----
test("A1 sampled: after an omitted sample, the first price back does not make the minute before it 'observed' — $90K then $210K ten seconds later is NOT a FAST-1M entry", () => {
  const cov = new Coverage(); cov.up(0); const sr = new Series("M", cov); sr.startLive(0);
  for (let t = 10; t <= 600; t += 10) sr.add(t, 100_000);
  sr.restartAt(610); sr.raw = []; sr.prevT = null;                             // what engine.coinLost does when the provider omits the price at 610
  assert.equal(sr.pend, true); sr.add(665, 90_000); assert.equal(sr.pend, false); assert.equal(sr.obsFrom, 665, "history restarts at the RECOVERY (665), not at the loss (610)"); assert.equal(sr.histFrom, 665);
  sr.add(675, 210_000);
  assert.equal(sr.covered(615, 675, true), false, "the 1-minute window [615, 675] starts after the loss but before the recovery: its starting price is unknown"); assert.equal(sr.covered(615, 675), false, "and so is any hour-scale window reaching back there");
  assert.equal(sr.covered(665, 675, true), true, "from the recovery on, observation is exact again");
  sr.add(727, 215_000); assert.equal(sr.covered(727 - 60, 727, true), true, "a window that starts after the recovery is exact"); assert.equal(sr.lowIn(667, 727, true).px, 90_000, "with the recovered price standing at its start");
});
test("A2 through the engine: a live coin whose data was lost, and a coin first seen after a reconnection, do not enter a FAST book on their first two prices", () => {
  const has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f));
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  path(e, T0, T0 + 600, () => 100_000, 10);
  e.coinLost("MintAAApump", T0 + 610); swap(e, T0 + 665, 90_000); swap(e, T0 + 675, 210_000);
  assert.equal(has(e, "FAST-1M").length, 0, "loss at +610, recovery at +665: the minute before +675 starts at +615, where no price is known"); assert.equal(has(e, "FAST150-1M").length, 0);
  const e2 = mkEngine(); e2.feedUp(T0); e2.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  path(e2, T0, T0 + 600, () => 100_000, 10); e2.feedDown(T0 + 601); e2.feedUp(T0 + 610); swap(e2, T0 + 665, 90_000); swap(e2, T0 + 675, 210_000);
  assert.equal(has(e2, "FAST-1M").length, 0, "reconnection at +610, first price at +665: the window [615, 675] has no outage in it, but no known starting price either");
  const e3 = mkEngine(); e3.feedUp(T0); e3.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });   // control: the same move with unbroken observation IS an entry
  path(e3, T0, T0 + 650, () => 100_000, 10); swap(e3, T0 + 655, 90_000); swap(e3, T0 + 660, 210_000); assert.equal(has(e3, "FAST-1M").length, 1);
});
test("C1 compression keeps the price path: the low and high inside a merged second survive, the newest observation stays exact, and memory stays bounded", async () => {
  const { RAW_CAP } = await import("../src/spec.mjs"); const cov = new Coverage(); cov.up(0); const a = new Series("M", cov), b = new Series("M", cov); a.startLive(0); b.startLive(0);
  for (let k = 0; k < RAW_CAP; k++) a.add(100 + k * 0.25, 100);                // a: buffer full. b: the same later path, never compressed (control)
  const t = 100 + RAW_CAP * 0.25 + 10; b.add(t - 5, 100);
  for (const s of [a, b]) { s.add(t, 100); s.add(t + 0.1, 40); s.add(t + 0.2, 300); s.add(t + 0.3, 100); s.add(t + 0.4, 101); } // one second: dips to 40, spikes to 300, ends near 100
  assert.ok(a.raw.length <= RAW_CAP + 2); assert.equal(a.raw[a.raw.length - 1][1], 101, "the newest observation is its own entry");
  for (const s of [a, b]) { assert.equal(s.lowIn(t - 1, t + 5, true).px, 40); assert.equal(s.highIn(t - 1, t + 5, true).px, 300); assert.equal(s.priceAt(t + 2, true).px, 101); }
  assert.equal(a.lowIn(t - 1, t + 0.4, true).px, 40, "the window before the newest observation still contains the dip (the overwrite used to lose it)");
  assert.equal(a.priceAt(t + 0.15, true), null, "a moment inside the merged second: the exact price there is 'not known', never a later price");
  assert.equal(a.covered(t + 0.15, t + 0.4, true), false, "so an exact window cannot start inside it"); assert.equal(a.covered(t, t + 0.4, true), true); assert.equal(a.covered(t - 1, t + 0.4, true), true);
  for (let k = 0; k < 4000; k++) a.add(t + 1 + k * 0.01, 100 + (k % 7));       // 4,000 more trades in 40 seconds
  assert.ok(a.raw.length <= RAW_CAP + 2 * 41 + 2, "at most two entries per second beyond the cap: " + a.raw.length);
});
test("C2 the decision ChatGPT reproduced: with the buffer full, a dip inside one busy second is still the window's low — FAST-30M does not fire against a low that compression used to erase… and a real fresh double still does", async () => {
  const { RAW_CAP } = await import("../src/spec.mjs"); const run = (full) => { const cov = new Coverage(); cov.up(0); const s = new Series("M", cov); s.startLive(0);
    if (full) for (let k = 0; k < RAW_CAP; k++) s.add(1000 + k * 0.1, 100); else s.add(1000, 100);
    const t = 1000 + RAW_CAP * 0.1 + 5; s.add(t, 100); s.add(t + 0.1, 45); s.add(t + 0.2, 100); s.add(t + 0.3, 100); s.add(t + 60, 150); return { s, t }; };
  for (const full of [false, true]) { const { s, t } = run(full); const lo = s.lowIn(t + 60 - 1800, t + 60, true);
    assert.equal(lo.px, 45, (full ? "compressed" : "uncompressed") + ": the low of the window is the 45 dip"); assert.ok(150 >= 2 * lo.px, "so 150 is ALREADY above 2× the low — the crossing happened at the dip's recovery, not now"); }
});

// ---- "counting since" (owner, 21 Nov 2026 16:13 UK): when each book and each stop began on this database ----
test("counting since: a book starts when it was first evaluated on this database (never before the first start), a stop with its first buy; both are set once and survive a restart; the page API carries them", async () => {
  const { booksApi } = await import("../src/page.mjs"); const db = join(mkdtempSync(join(tmpdir(), "older-")), "since.db"); let st = new Store(db); st.firstStart(1000);
  st.saveNote("M1", { ag: "A1", family: "LOW4H", t: 1005, reason: "insufficient 4 h history" }); st.saveNote("M1", { ag: "A1", family: "FAST-10M", t: 5000, reason: "window not covered" }); st.saveNote("M1", { ag: "A1", family: "FAST-10M", t: 5200, reason: "window not covered" });
  const old = newEntry({ mint: "M1", pool: "P", ag: "A1", t: 1200, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); old.versions = old.versions.filter((v) => v.stop !== 0.6); st.saveEntry(old); // a buy from before the 60% stop existed
  const neu = newEntry({ mint: "M2", pool: "P", ag: "A1", t: 6000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); st.saveEntry(neu);
  const s = st.since(9000);
  assert.equal(s.first, 1000); assert.equal(s.families["LOW4H"], 1005); assert.equal(s.families["FAST-10M"], 5000, "added later: starts at its first evaluation"); assert.equal(s.families["HH15-5M"], 9000, "nothing on record yet: starts now");
  assert.equal(s.stops[0.25], 1000, "every buy carries it: as old as the database"); assert.equal(s.stops[0.6], 6000, "the first buy that carries the 60% stop");
  st = new Store(db); const s2 = st.since(20000); assert.deepEqual(s2, s, "fixed once: a later restart does not move any start");
  assert.equal(booksApi([], { stop: 0.6, since: s }).since.stop, 6000); assert.equal(booksApi([], { stop: 0.25, since: s }).since.stop, 1000); assert.equal(booksApi([], {}).since, null);
});

// ---- older-7 (21 Nov 2026, owner's decision): HH-BREAK-4H — HH-BREAK's buys, sold at 4 hours if still open; existing buys carried in ----
test("older-7 HH-BREAK-4H: its versions sell at 4 hours whatever the position did (reason 'clock'); a stop before 4 hours works as usual; plain versions and CONT-STALL are untouched", async () => {
  const { newEntry, advance, observe, versionsFor } = await import("../src/book.mjs"); const st = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const e = newEntry({ mint: "M", pool: "P", ag: "A4", t: 0, families: ["HH-BREAK", "HH-BREAK-4H"], features: {}, mc: 1e5, px: 1 }); assert.equal(e.versions.length, 2 * S.POLICIES.length * S.STOPS.length);
  assert.equal(versionsFor(e, "HH-BREAK").length, S.STOPS.length); assert.equal(versionsFor(e, "HH-BREAK-4H").length, S.STOPS.length); assert.ok(versionsFor(e, "HH-BREAK-4H").every((v) => v.stall === "4h"));
  advance(e, 1.5, st(100, 0), yes); observe(e, st(130, 600), 600);              // +30% early on (CONT-STALL's 1.15× test would be passed: irrelevant here)
  observe(e, st(100, 3600), 3600); advance(e, 3601, st(100, 3600), yes);        // −23% from the peak: the 20% stops sell in both books
  const P = (s) => versionsFor(e, "HH-BREAK").find((v) => v.stop === s), K = (s) => versionsFor(e, "HH-BREAK-4H").find((v) => v.stop === s);
  assert.equal(P(0.2).status, "closed"); assert.equal(K(0.2).status, "closed"); assert.equal(K(0.2).reason, "trail"); assert.equal(K(0.2).exit.ret, P(0.2).exit.ret);
  advance(e, 4 * 3600 - 10, st(100, 3600), yes); assert.equal(K(0.4).status, "open", "not before 4 hours");
  advance(e, 4 * 3600 + 5, st(100, 3600), yes);
  assert.equal(K(0.4).status, "closed"); assert.equal(K(0.4).reason, "clock"); assert.ok(Math.abs(K(0.4).exit.hold_s - (4 * 3600 + 1)) <= 1, "held 4 hours from the buy, plus the 0.7 s sale delay"); assert.equal(P(0.4).status, "open", "the plain HH-BREAK row keeps running");
  const c = newEntry({ mint: "M2", pool: "P", ag: "A4", t: 0, families: ["CONT", "CONT-STALL"], features: {}, mc: 1e5, px: 1 }); advance(c, 1.5, st(100, 0), yes); observe(c, st(130, 600), 600); advance(c, 3700, st(125, 600), yes);
  assert.ok(versionsFor(c, "CONT-STALL").every((v) => v.status === "open"), "CONT-STALL unchanged: it reached 1.15×, so no 60-minute sale"); advance(c, 4 * 3600 + 5, st(125, 600), yes); assert.ok(versionsFor(c, "CONT-STALL").every((v) => v.status === "open"), "and no 4-hour clock on it");
});
test("older-7 through the engine: an HH-BREAK buy carries HH-BREAK-4H on the same entry", () => {
  const e2 = mkEngine(); e2.feedUp(T0); e2.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 3.5 * H });
  path(e2, T0, T0 + 4.5 * H, () => 100_000, 60, { sol: 1 }); const t1 = T0 + 4.5 * H; path(e2, t1, t1 + 14 * 60, () => 100_000, 60, { sol: 3 }); swap(e2, t1 + 14 * 60 + 5, 101_000, { sol: 3 });
  const h = [...e2.entries.values()].find((x) => x.families.includes("HH-BREAK")); assert.ok(h && h.families.includes("HH-BREAK-4H")); assert.equal(h.versions.filter((v) => v.stall === "4h").length, S.POLICIES.length * S.STOPS.length);
});
test("older-7 existing buys are carried into the new book: stopped before 4 h = the same real result; open past 4 h = a clock sale estimated from the minute bars and marked; younger than 4 h = a live copy; done once", async () => {
  const { addClockBook } = await import("../src/migrate.mjs"); const { advance, versionsFor } = await import("../src/book.mjs"); const { booksApi } = await import("../src/page.mjs");
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "mig.db"); let st = new Store(db); const now = 1_000_000, s = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;
  const mk = (mint, t0, pathQ) => { const e = newEntry({ mint, pool: "P", ag: "A4", t: t0, families: ["HH-BREAK"], features: {}, mc: 1e5, px: 0.001 }); e.cands = [{ family: "HH-BREAK", detail: { vol15: 9 } }]; advance(e, t0 + 1.5, s(100, t0), yes);
    for (const [dt, q] of pathQ) { observe(e, s(q, t0 + dt), t0 + dt); advance(e, t0 + dt + 1, s(q, t0 + dt), yes); } st.saveEntry(e); st.saveDecision(mint, "A4", "HH-BREAK", t0, e.id, { vol15: 9 }); return e; };
  mk("OLD", now - 10 * 3600, [[600, 110], [3600, 85]]);                          // 10 h old: −23% from the peak after 1 h (20% stop sold), the rest still open
  mk("YOUNG", now - 3600, [[600, 104]]);                                         // 1 h old: inside the clock
  const m0 = Math.floor((now - 10 * 3600) / 60); st.saveBar("OLD", m0 + 30, { o: 0.001, h: 0.0011, l: 0.001, c: 0.0011, v: 50, nb: 1, ns: 0 }); st.saveBar("OLD", m0 + 200, { o: 0.0009, h: 0.0009, l: 0.0009, c: 0.0009, v: 50, nb: 1, ns: 0 }); st.saveBar("OLD", m0 + 300, { o: 0.002, h: 0.002, l: 0.002, c: 0.002, v: 50, nb: 1, ns: 0 }); // the bar after 4 h must not be used
  const r = addClockBook(st, "HH-BREAK-4H", now); assert.equal(r.added, 2); assert.deepEqual(addClockBook(st, "HH-BREAK-4H", now + 5), { base: "HH-BREAK", added: 0, exact: 0, estimated: 0, live: 0 }, "second run changes nothing");
  const E = st.allEntries(), old = E.find((e) => e.mint === "OLD"), yg = E.find((e) => e.mint === "YOUNG"), K = (e, sp, p = "trail") => versionsFor(e, "HH-BREAK-4H", p).find((v) => v.stop === sp), Pl = (e, sp) => versionsFor(e, "HH-BREAK").find((v) => v.stop === sp);
  assert.ok(old.families.includes("HH-BREAK-4H") && old.cands.some((c) => c.family === "HH-BREAK-4H")); assert.equal(old.versions.length, 2 * S.POLICIES.length * S.STOPS.length);
  assert.equal(K(old, 0.2).exit.ret, Pl(old, 0.2).exit.ret, "stopped out before 4 h: the same real result"); assert.ok(!K(old, 0.2).exit.est);
  const k = K(old, 0.4); assert.equal(k.status, "closed"); assert.equal(k.reason, "clock"); assert.equal(k.exit.est, true); assert.equal(k.exit.exec, "estimated-minute-bar"); assert.equal(k.exit.est_from.close, 0.0009, "the last bar at or before the 4-hour mark, not a later one");
  assert.ok(Math.abs(k.exit.ret - (0.9 * 0.994 - 1)) < 0.01, "price 0.9× the signal price, less two fees and costs ≈ −11%: " + k.exit.ret); assert.equal(Pl(old, 0.4).status, "open", "the plain row is untouched");
  assert.equal(K(yg, 0.4).status, "open"); assert.equal(K(yg, 0.4).tok, Pl(yg, 0.4).tok, "younger than 4 h: a live copy of the position"); assert.equal(r.live, S.POLICIES.length * S.STOPS.length);
  const eng = mkEngine({ store: st }); st.restore(eng); assert.equal(eng.coins.get("OLD").groups.A4.done["HH-BREAK-4H"], 1, "the one-buy flag is restored for the new book");
  const live = [...eng.entries.values()].find((e) => e.mint === "YOUNG"); advance(live, live.fill.t + 4 * 3600 + 5, s(104, live.fill.t + 600), yes); assert.equal(K(live, 0.4).reason, "clock", "and the live copy is sold by the engine's own clock");
  const j = booksApi(E, { stop: 0.4 }); const row = j.books["HH-BREAK-4H"].find((t) => t.mint === "OLD"); assert.equal(row.est_exit, true); assert.equal(j.books["HH-BREAK"].find((t) => t.mint === "OLD").est_exit, undefined);
  const s2 = new Store(db).since(now); assert.equal(s2.families["HH-BREAK-4H"], s2.families["HH-BREAK"], "same start as its base book");
});
