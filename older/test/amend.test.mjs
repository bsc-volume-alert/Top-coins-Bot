// The five targeted corrections of 20 Nov 2026 (older-3), each with its own test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, quoteFor, H, T0, BASE } from "./helpers.mjs";
import { newEntry, advance, observe, COST } from "../src/book.mjs";
import { liqValue, sellSol } from "../src/fills.mjs";
import { decodeEvent, applyEvent, DISC, dec } from "../src/decoder.mjs";

const st = (quote, t) => ({ base: 2e8, quote, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true;

test("1. scale-out keeps the trail intact: an existing drawdown is neither erased nor enlarged by selling half; costs charged once per leg", () => {
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 1000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 });
  let cur = st(200, 999); advance(e, 1001, cur, yes); const v = e.versions.find((x) => x.policy === "scale" && x.stop === 0.25), tok = e.fill.tok;
  const ev = (s) => { advance(e, s.t, cur, yes); cur = s; observe(e, s, s.t); };
  ev(st(440, 1100));                                    // peak; full value ≥ 2× cost → half-sale scheduled for 1100.7
  ev(st(400, 1100.4));                                  // price slips ~9% BEFORE the half-sale executes: a real drawdown exists
  const ddBefore = liqValue(cur, v.tok) / v.peak; assert.ok(ddBefore < 0.93 && ddBefore > 0.88);
  advance(e, 1101, cur, yes);                           // half-sale executes at 1100.7 on the 400 state
  assert.ok(v.half && Math.abs(v.tok - tok / 2) < 1e-6);
  const ddAfter = liqValue(cur, v.tok) / v.peak;
  assert.ok(Math.abs(ddAfter - ddBefore) < 1e-12, `drawdown from the high-water mark is identical before (${ddBefore}) and after (${ddAfter}) the partial sale`);
  assert.ok(Math.abs(v.half.sol - (sellSol(cur, tok / 2) - 0.0005)) < 1e-12, "the half-sale leg pays one transaction cost");
  ev(st(330, 1200)); advance(e, 1201, cur, yes);         // 330 is −25% from 440: the ORIGINAL trail still fires (it was not reset to the 400 level)
  assert.equal(v.status, "closed"); assert.equal(v.reason, "trail");
  assert.ok(Math.abs(v.exit.sol - (v.half.sol + sellSol(st(330, 0), tok / 2) - 0.0005)) < 1e-9, "second leg pays its own transaction cost: total costs = buy + 2 sells");
  const plain = e.versions.find((x) => x.policy === "trail" && x.stop === 0.25); assert.equal(plain.status, "closed", "the pure-trailing row triggered at the same level");
});

test("2. USD history: every observation is converted at the SOL/USD of its own moment; positions are valued in SOL", () => {
  let usd = 100; const e = mkEngine({ solUsd: () => usd }); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 9 * H });
  const sw = (t, quote) => e.onSwap({ t, mint: "MintAAApump", pool: "PoolA", base: BASE, quote, feeBps: 30, sol: 1, isBuy: true, user: "u" });
  sw(T0, 200); usd = 200; sw(T0 + 10, 200);             // same pool price in SOL; SOL/USD doubled between the two observations
  const raw = e.coins.get("MintAAApump").series.raw;
  assert.ok(Math.abs(raw[0][1] - (200 / BASE) * 100) < 1e-15 && Math.abs(raw[1][1] - (200 / BASE) * 200) < 1e-15, "the earlier observation keeps the earlier rate; it is not re-priced at today's rate");
});

test("3. SECOND-WAVE lives across an age boundary: classified by age AT ENTRY, seed age recorded, one active setup per mint", () => {
  const e = mkEngine(); e.feedUp(T0); const create = T0 - (16 * H - 900); e.coin("MintAAApump", { pool: "PoolA", createTs: create }); // 15 min before the 16 h boundary
  path(e, T0, T0 + 600, () => 100_000, 10);
  swap(e, T0 + 605, 205_000);                           // seed at age 15 h 55 min → A1
  swap(e, T0 + 700, 260_000); swap(e, T0 + 800, 190_000); // high 260K, pullback freezes it (still A1)
  swap(e, T0 + 1000, 250_000);                          // age 16 h 01 min 40 s → now A2; setup still alive
  swap(e, T0 + 1010, 262_000);                          // reclaim in A2
  const sw = [...e.entries.values()].find((x) => x.families.includes("SECOND-WAVE")); assert.ok(sw, "the setup was not dropped at the boundary");
  assert.equal(sw.ag, "A2"); const d = sw.cands.find((c) => c.family === "SECOND-WAVE").detail; assert.equal(d.seed_ag, "A1"); assert.equal(d.entry_ag, "A2"); assert.equal(d.seed_age_s, 15 * H + 55 * 60 + 5);
  const c = e.coins.get("MintAAApump"); assert.equal(c.sw, null); assert.ok(c.groups.A1.done["SECOND-WAVE"] && c.groups.A2.done["SECOND-WAVE"], "seed group's attempt and entry group's slot are both used");
});

test("4. HH-BREAK windows: signal [B−15 min, B), baseline sixteen buckets over [B−255 min, B−15 min); the unfinished minute is in neither", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 3.5 * H });
  path(e, T0, T0 + 4.5 * H, () => 100_000, 60, { sol: 1 });               // 1 SOL a minute for 4.5 h
  const t1 = T0 + 4.5 * H;
  swap(e, t1 + 5, 101_000, { sol: 500 });                                 // a huge print in the CURRENT (unfinished) minute, new 60-min high
  assert.ok(![...e.entries.values()].some((x) => x.families.includes("HH-BREAK")), "volume of the unfinished minute does not count towards the signal window");
  path(e, t1 + 60, t1 + 60 + 60, () => 100_500, 60, { sol: 1 });           // that minute is now complete
  swap(e, t1 + 125, 102_000, { sol: 1 });                                 // new high again; the completed 500-SOL minute is inside [B−15, B)
  const h = [...e.entries.values()].find((x) => x.families.includes("HH-BREAK")); assert.ok(h);
  const d = h.cands.find((c) => c.family === "HH-BREAK").detail, B = Math.floor((t1 + 125) / 60) * 60;
  assert.equal(d.B, B); assert.deepEqual(d.signal_window, [B - 900, B]); assert.deepEqual(d.baseline_window, [B - 255 * 60, B - 900]); assert.equal(d.windows.length, 16);
  assert.ok(d.windows.every((w) => w === 1500), "each baseline bucket = 15 completed minutes × 1 SOL × $100");
});

test("5. an unusual observed fee rate is used as observed, counted and flagged — never clamped into a tidy estimate", () => {
  const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(BigInt(v)); return x; }, i = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(BigInt(v)); return x; }, pk = (n) => Buffer.alloc(32, n);
  const B = 200_000_000_000_000n, Q = 200_000_000_000n, b = 2_000_000_000_000n, q = (Q * b) / (B - b), user = q + (q * 30n) / 100n; // the user paid 30% over the curve amount
  const ev = Buffer.concat([Buffer.from(DISC.BuyEvent), i(1), u(b), u(0), u(0), u(0), u(B), u(Q), u(q), u(20), u(0), u(5), u(0), u(q), u(user), pk(9), pk(2)]).toString("base64");
  const p = {}, n0 = dec.feeOdd, r = applyEvent(p, decodeEvent(ev));
  assert.ok(Math.abs(p.feeBuy - 0.3) < 1e-6); assert.equal(dec.feeOdd, n0 + 1); assert.equal(r.state.feeOdd, true);
  const e = newEntry({ mint: "M", pool: "P", ag: "A1", t: 1000, families: ["LOW4H"], features: {}, mc: 1e5, px: 1 }); advance(e, 1001, { ...r.state, t: 999 }, yes);
  assert.match(e.fill.fee_src, /UNUSUAL/); assert.ok(e.flags.some((f) => /unusual pool fee/.test(f))); assert.ok(Math.abs(e.fill.fee_buy - 0.3) < 1e-6);
});
