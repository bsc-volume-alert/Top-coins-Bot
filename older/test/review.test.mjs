// Regression tests for the nine blockers of the independent code review of commit d88a250 (20 Nov 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, quoteFor, H, T0, BASE } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { Poller } from "../src/polled.mjs";
import { Series, Coverage } from "../src/series.mjs";
import { newEntry, advance, observe, inventories, COST } from "../src/book.mjs";
import { decodeEvent, applyEvent, reduceTx, DISC, dec } from "../src/decoder.mjs";
import { SPL_TOKEN } from "../src/risk.mjs";

const fastSetup = (eng) => { eng.feedUp(T0); eng.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); path(eng, T0, T0 + 600, () => 100_000, 10); };
const ev = (t, mc, extra = {}) => ({ t, mint: "MintAAApump", pool: "PoolA", base: BASE, quote: quoteFor(mc), feeBps: 30, sol: 1, isBuy: true, user: "u", ...extra });

test("B1 a state observed AFTER the scheduled time can never price it: no back-dated fill, the 5 s timeout applies", () => {
  const e = mkEngine(); fastSetup(e); e.onSwap(ev(T0 + 605, 210_000)); const en = [...e.entries.values()][0]; assert.equal(en.status, "pending");
  e.onSwap(ev(T0 + 705, 400_000, { replay: true }));            // recovery/replay delivers a state from 100 s later without running orders
  e.tick(T0 + 706);
  assert.equal(en.status, "cancelled", "not filled from the future state"); assert.match(en.flags.join(), /pricing\/data timeout/); assert.equal(en.fill, null);
  // and in the ordinary case the fill's state is never younger than the fill
  const e2 = mkEngine(); fastSetup(e2); e2.onSwap(ev(T0 + 605, 210_000)); e2.tick(T0 + 606.1); const f = [...e2.entries.values()][0].fill; assert.ok(f.state_age_s >= 0);
});

test("B2 events of one transaction give ONE committed state; equal receive times still order strictly, so FAST-1M is not missed", () => {
  // engine level: $100K → $150K → $205K all stamped with the same receive time
  const e = mkEngine(); fastSetup(e); e.onSwap(ev(T0 + 605, 150_000)); e.onSwap(ev(T0 + 605, 205_000));
  const fams = [...e.entries.values()].flatMap((x) => x.families); assert.ok(fams.includes("FAST150-1M") && fams.includes("FAST-1M"), fams.join());
  // decoder level: buy then sell inside one transaction → the engine would see only the final state, never the intermediate high
  const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(BigInt(v)); return x; }, i = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(BigInt(v)); return x; }, pk = (n) => Buffer.alloc(32, n);
  const mk = (buy, B, Q, b) => { const q = buy ? (Q * b) / (B - b) : (Q * b) / (B + b); return decodeEvent(Buffer.concat([Buffer.from(buy ? DISC.BuyEvent : DISC.SellEvent), i(1), u(b), u(0), u(0), u(0), u(B), u(Q), u(q), u(0), u(0), u(0), u(0), u(q), u(q), pk(9), pk(2)]).toString("base64")); };
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 20_000_000_000_000n, q1 = (Q * b) / (B - b);
  const p = {}, x = reduceTx(p, [mk(true, B, Q, b), mk(false, B - b, Q + q1, b)]);
  assert.equal(x.buys, 1); assert.equal(x.sells, 1); assert.ok(Math.abs(x.last.state.base - 200_000_000) < 1e-3 && Math.abs(x.last.state.quote - 200) < 1e-6, "committed state = back where it started; the +23% intermediate price is never exposed");
});

test("B3 coverage follows evidence: an empty back-fill extends nothing and repairs nothing; a real low in the boundary minute is kept", () => {
  const cov = new Coverage(); cov.up(1000); const sr = new Series("M", cov); sr.startLive(1000);
  assert.equal(sr.addBars([], { from: 0, to: 1000 }).accepted, false); assert.equal(sr.histFrom, 1000, "empty reply: history NOT extended");
  cov.drop(2000); cov.up(2300); assert.equal(sr.addBars([], { from: 2000, to: 2300, patchGap: true }).accepted, false); assert.equal(sr.covered(1900, 2400), false, "empty reply: outage NOT repaired");
  const r = sr.addBars([{ m: Math.floor(2000 / 60), o: 1, h: 1, l: 1, c: 1 }, { m: Math.floor(2240 / 60), o: 1, h: 1, l: 1, c: 1 }], { from: 2000, to: 2300, patchGap: true });
  assert.equal(r.accepted, true); assert.equal(sr.covered(1900, 2400), true, "repaired at bar resolution for hour-scale windows"); assert.equal(sr.covered(1900, 2400, true), false, "but never for a fresh crossing or a seconds-scale window");
  const part = sr.addBars([{ m: 10, o: 1, h: 1, l: 1, c: 1 }], { from: 0, to: 1000 }); assert.equal(part.from, 600); assert.equal(sr.histFrom, 600, "history reaches back only to the first bar actually returned");
  // engine level: FAST never fires across an outage that was 'repaired'
  const e = mkEngine(); fastSetup(e); e.feedDown(T0 + 601); e.feedUp(T0 + 620); e.coins.get("MintAAApump").series.addBars([{ m: Math.floor((T0 + 601) / 60), o: 1e-4, h: 1e-4, l: 1e-4, c: 1e-4 }], { from: T0 + 601, to: T0 + 620, patchGap: true });
  e.onSwap(ev(T0 + 621, 210_000)); e.onSwap(ev(T0 + 630, 215_000)); assert.equal(e.entries.size, 0);
  // raw/bar boundary: the low sits in the minute where the exact buffer begins
  const c2 = new Coverage(); c2.up(0); const s2 = new Series("M", c2); s2.startLive(0);
  s2.add(3605, 0.5); s2.add(3650, 2); s2.raw = s2.raw.filter((x) => x[0] >= 3650);        // the 0.5 print was pruned from the exact buffer; its minute bar remains
  assert.equal(s2.lowIn(3000, 9000).px, 0.5);
});

test("B3 a sample the price provider omits breaks that token's coverage at once (first miss, not the third)", async () => {
  let t = T0; const px = new Map([["TokA", 1e-4]]), omit = new Set();
  const jup = { prices: async (m) => ({ t, req: t, prices: new Map(m.filter((x) => !omit.has(x)).map((x) => [x, { px: px.get(x), liqUsd: 5e4, decimals: 6 }])), omitted: m.filter((x) => omit.has(x)) }), quote: async () => ({ ok: false, why: "n/a", t }), recent: async () => [], category: async () => [], tokens: async () => [] };
  const eng = mkEngine(), po = new Poller({ engine: eng, jup, now: () => t });
  po.add({ mint: "TokA", decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: 1e5, first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true }, "t");
  for (let i = 0; i < 31; i++) { t += 10; await po.sweep(); }
  omit.add("TokA"); t += 10; await po.sweep(); assert.equal(po.stats.lost, 1, "history restarts on the first omitted sample");
  omit.delete("TokA"); px.set("TokA", 2.1e-4); t += 10; await po.sweep(); t += 10; px.set("TokA", 2.2e-4); await po.sweep(); assert.equal(eng.entries.size, 0);
});

test("B4 open-position peaks are check-pointed: a restart resumes with the same high-water mark and the same stop", () => {
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "t.db"); let st = new Store(db), e = mkEngine({ store: st });
  fastSetup(e); st.saveCoin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H }); e.onSwap(ev(T0 + 605, 210_000)); e.onSwap(ev(T0 + 607, 212_000));
  e.onSwap(ev(T0 + 700, 380_000)); e.tick(T0 + 706);                               // peak, no status change — must still reach the database
  const mem = [...e.entries.values()][0], disk = st.allEntries().find((x) => x.id === mem.id);
  assert.ok(Math.abs(disk.versions[0].peak - mem.versions[0].peak) < 1e-12 && mem.versions[0].peak > COST * 1.5, "database holds the in-memory peak");
  st.heartbeat(T0 + 706); st.db.close(); st = new Store(db); const e2 = mkEngine({ store: st }); st.restore(e2); e2.restartGap(st.lastAlive(), T0 + 720); e2.feedUp(T0 + 720);
  e2.onSwap(ev(T0 + 721, 290_000)); e2.onSwap(ev(T0 + 723, 289_000));              // −24% from the 380K peak: the 20% stop must fire on the restored position
  const r = [...e2.entries.values()].find((x) => x.id === mem.id), v20 = r.versions.find((v) => v.stop === 0.2 && v.policy === "trail");
  assert.equal(v20.status, "closed"); assert.equal(v20.reason, "trail");
});

function world() { const w = { t: T0, px: new Map(), route: true };
  w.tok = (m) => ({ mint: m, symbol: "TKN", decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(m) || 0) * 1e9, launchpad: "met-dbc", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true });
  w.jup = { prices: async (ms) => ({ t: w.t, req: w.t, prices: new Map(ms.filter((x) => w.px.has(x)).map((x) => [x, { px: w.px.get(x), liqUsd: 6e4, decimals: 6 }])), omitted: ms.filter((x) => !w.px.has(x)) }),
    quote: async (m, side, raw) => { const req = w.t; w.t += 0.3; if (!w.route) return { ok: false, t: w.t, why: "no route" }; const p = w.px.get(m) / 100; return side === "buy" ? { ok: true, req, t: w.t, out: ((raw / 1e9) * 0.99 / p) * 1e6, route: ["Meteora"] } : { ok: true, req, t: w.t, out: (raw / 1e6) * p * 0.99 * 1e9, route: ["Meteora"] }; },
    recent: async () => [], category: async () => [], tokens: async (ms) => ms.map(w.tok) };
  return w; }
async function sampledEntry(w, eng, po, M) { w.px.set(M, 1e-4); po.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.05e-4); w.t += 10; await po.sweep(); w.t += 1.1; await po.quotes(); return [...eng.entries.values()][0]; }

test("B5 restart: a sampled coin comes back as sampled, on the watch list, and its open position keeps receiving quotes", async () => {
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "t.db"), M = "SampledCoin1"; const w = world(); let st = new Store(db), eng = mkEngine({ store: st }), po = new Poller({ engine: eng, jup: w.jup, store: st, now: () => w.t });
  const en = await sampledEntry(w, eng, po, M); assert.equal(en.status, "filled"); assert.equal(en.exec, "routed-quote"); eng.tick(w.t + 6); st.db.close();
  st = new Store(db); const eng2 = mkEngine({ store: st }); st.restore(eng2); const po2 = new Poller({ engine: eng2, jup: w.jup, store: st, now: () => w.t });
  assert.equal(eng2.coins.get(M).mode, "polled", "identity and mode restored before the one-entry flags"); assert.equal(po2.restore(), 1); assert.ok(po2.watch.has(M));
  assert.equal(po2.add(w.tok(M), "rediscovery"), true, "rediscovery does not reject it as 'already live'");
  w.t += 20; assert.ok(eng2.quoteNeeds(w.t).length === 1); const before = eng2.stats.quotes; await po2.quotes(); assert.ok(eng2.stats.quotes > before, "quotes flow again after the restart");
});

test("B6 an entry keeps its declared execution method: live events never price a routed-quote entry; a coin moves to live only with no open entry", async () => {
  const M = "SampledCoin2", w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t }); eng.feedUp(T0);
  w.px.set(M, 1e-4); po.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) { w.t += 10; await po.sweep(); } w.px.set(M, 2.05e-4); w.t += 10; await po.sweep();
  const en = [...eng.entries.values()][0]; assert.equal(en.status, "pending"); assert.equal(en.exec, "routed-quote");
  eng.onSwap({ t: w.t + 1.2, mint: M, pool: "CanonPool", base: BASE, quote: quoteFor(205_000), feeBps: 30, sol: 1, isBuy: true, user: "u" }); eng.tick(w.t + 1.5);
  assert.equal(en.status, "pending", "the canonical pool's state did NOT fill the routed-quote entry"); assert.equal(eng.stats.liveIgnoredSampled, 1); assert.equal(eng.coins.get(M).mode, "polled");
  w.t += 1.6; await po.quotes(); assert.equal(en.status, "filled"); assert.equal(en.fill.exec, "routed-quote"); assert.ok(en.fill.quote.route);
  const N = "SampledCoin3"; w.px.set(N, 1e-5); po.add(w.tok(N), "t"); assert.equal(eng.coins.get(N).mode, "polled");
  eng.onSwap({ t: w.t + 5, mint: N, pool: "CanonPool3", base: BASE, quote: quoteFor(10_000), feeBps: 30, sol: 1, isBuy: true, user: "u" });
  assert.equal(eng.coins.get(N).mode, "live"); assert.ok(!po.watch.has(N), "with no entry open, ownership moves cleanly to the live adapter and polling stops");
});

test("B7 see exits.test 'a triggered sell survives a data failure': unresolved is never terminal — sampled side: inventory still requested, slowly", async () => {
  const M = "SampledCoin4", w = world(), eng = mkEngine(), po = new Poller({ engine: eng, jup: w.jup, now: () => w.t }); const en = await sampledEntry(w, eng, po, M); assert.equal(en.status, "filled");
  w.px.set(M, 1e-4); w.t += 11; await po.quotes(); w.route = false; w.t += 86400 + 100; eng.tick(w.t); // stops triggered, then no route for a day
  assert.ok(en.versions.some((v) => v.unresolvedSince && v.status === "selling")); const need = eng.quoteNeeds(w.t)[0]; assert.ok(need && need.unresolved && need.sells.length > 0);
  w.route = true; w.t += 601; await po.quotes(); assert.ok(en.versions.filter((v) => v.policy === "trail").every((v) => v.status === "closed"), "a restored route closes the unresolved sale");
});

test("B8 a break in the reserve chain is reported as a discontinuity and resets trust: the stale state cannot fill a pending order", () => {
  const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(BigInt(v)); return x; }, i = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(BigInt(v)); return x; }, pk = (n) => Buffer.alloc(32, n);
  const buy = (B, Q, b) => { const q = (Q * b) / (B - b); return decodeEvent(Buffer.concat([Buffer.from(DISC.BuyEvent), i(1), u(b), u(0), u(0), u(0), u(B), u(Q), u(q), u(0), u(0), u(0), u(0), u(q), u(q), pk(9), pk(2)]).toString("base64")); };
  const p = {}; assert.equal(applyEvent(p, buy(200_000_000_000_000n, 200_000_000_000n, 10n ** 12n)).discontinuity, false);
  const r = applyEvent(p, buy(150_000_000_000_000n, 260_000_000_000n, 10n ** 12n)); assert.equal(r.discontinuity, true, "reserves jumped between two events: flagged, not silently accepted");
  assert.equal(reduceTx({ base: 1, quote: 1 }, [buy(150_000_000_000_000n, 260_000_000_000n, 10n ** 12n)]).lost, true);
  // engine: after the feed marks the coin lost, the old state is not trusted for an order scheduled before the break
  const e = mkEngine(); fastSetup(e); e.onSwap(ev(T0 + 605, 210_000)); const en = [...e.entries.values()][0];
  e.coinLost("MintAAApump", T0 + 605.5); e.tick(T0 + 606.2); assert.equal(en.status, "pending", "not filled from the pre-break state");
  e.onSwap(ev(T0 + 607, 230_000)); assert.equal(en.status, "filled"); assert.equal(en.fill.quote_sol, quoteFor(230_000)); assert.ok(en.fill.delay_s > 0.9, "filled from the first state after the break, with its real delay");
});

test("B9 each quoted quantity keeps its own request/response time; an order only uses quotes requested after it was scheduled", () => {
  const e = newEntry({ mint: "M", pool: null, ag: "A1", t: 1000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); e.exec = "routed-quote";
  observe(e, { kind: "quote", reqT: 1001, t: 1001.3, buy: { sol: 0.2, tok: 1000, reqT: 1001, t: 1001.3 }, sells: [] }, 1001.3); assert.equal(e.status, "filled"); const tok = e.fill.tok;
  const Qs = (full, half, tf, th) => ({ kind: "quote", reqT: Math.max(tf, th) - 0.3, t: Math.max(tf, th), buy: null, sells: [{ tok, sol: full, reqT: tf - 0.3, t: tf }, { tok: tok / 2, sol: half, reqT: th - 0.3, t: th }] });
  observe(e, Qs(0.42, 0.21, 1100, 1100.4), 1100.4);                       // full value ≥ 2× → scale trigger at 1100.4, scheduled 1101.1
  const v = e.versions.find((x) => x.policy === "scale" && x.stop === 0.25); assert.equal(v.status, "scaling");
  observe(e, Qs(0.42, 0.21, 1101.0, 1101.5), 1101.5);                     // half-quote requested at 1101.2 (after 1101.1) but the full quote was requested at 1100.7 (before): not eligible yet
  assert.equal(v.status, "scaling", "an older quote for another quantity cannot be borrowed");
  observe(e, Qs(0.40, 0.20, 1102.0, 1101.5), 1102.0);                     // both quantities now quoted after the scheduled time
  assert.equal(v.status, "open"); assert.ok(v.half); assert.equal(v.half.t, 1102.0); assert.deepEqual(v.half.quotes.map((q) => q.resp_t).sort(), [1101.5, 1102.0], "each quote's own times are recorded, not one merged timestamp");
  assert.ok(Math.abs(v.half.sol - (0.20 - 0.0005)) < 1e-12);
});

test("memory: buyer wallet lists are released after 20 minutes, the count is kept, and the 15-minute features are unchanged", async () => {
  const { Series, Coverage } = await import("../src/series.mjs");
  const sr = new Series("M", new Coverage()); const t0 = 1_800_000_000;
  for (let i = 0; i < 40; i++) sr.add(t0 + i * 60, 1 + i / 100, 10, true, "w" + (i % 7)), sr.add(t0 + i * 60 + 5, 1 + i / 100, 10, true, "x" + i);
  const now = t0 + 40 * 60, m = Math.floor(now / 60);
  const before = sr.buyersIn(m - 15, m);
  sr.prune(now);
  assert.equal(sr.buyersIn(m - 15, m), before);
  const old = sr.bars.get(Math.floor(t0 / 60)), recent = sr.bars.get(m - 5);
  assert.equal(old.buyers.size, 0); assert.equal(old.nbuyers, 2); assert.equal(old.nb, 2);
  assert.equal(recent.buyers.size, 2); assert.equal(recent.nbuyers, undefined);
});
