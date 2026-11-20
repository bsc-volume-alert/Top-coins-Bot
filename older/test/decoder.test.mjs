import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEvent, applyEvent, DISC, dec, pumpPoolAuthority, canonicalPool, isCanonical, onCurve, bs58dec } from "../src/decoder.mjs";

// Builders that write events in the IDL's field order (pump-public-docs idl/pump_amm.json), PRE-swap reserves.
const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(BigInt(v)); return x; }, i = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(BigInt(v)); return x; };
const i128 = (v) => { v = BigInt.asUintN(128, BigInt(v)); const x = Buffer.alloc(16); x.writeBigUInt64LE(v & 0xffffffffffffffffn, 0); x.writeBigUInt64LE(v >> 64n, 8); return x; };
const pk = (n) => Buffer.alloc(32, n), bool = (b) => Buffer.from([b ? 1 : 0]), str = (s) => { const n = Buffer.alloc(4); n.writeUInt32LE(s.length); return Buffer.concat([n, Buffer.from(s)]); };
function swap({ buy, B, Q, vq = 0n, b, feeFrac = 0.0125, lp = 0n, supply = 1_000_000_000_000_000n, truncate = null, ix = "buy", raw = null }) {
  const E = Q + vq; let q = buy ? (E * b) / (B - b) : (E * b) / (B + b), fee = BigInt(Math.round(Number(q) * feeFrac)), user = buy ? q + fee : q - fee;
  if (raw) { q = raw.quoteAmt; user = raw.userQuote; } // exact on-chain field values
  const head = [Buffer.from(buy ? DISC.BuyEvent : DISC.SellEvent), i(1800000000), u(b), u(0), u(0), u(0), u(B), u(Q), u(q), u(20), u(lp), u(5), u(0), u(q), u(user), pk(9), pk(2)];
  const creator = [pk(3), pk(4), pk(5), pk(6), pk(7), u(30), u(0)];
  const buyOnly = buy ? [bool(false), u(0), u(0), u(0), i(0), u(0), str(ix)] : [];
  const tail = [u(0), u(0), u(10), u(0), i128(vq), bool(false), u(supply), u(30), u(0), u(0)]; // cashback, buyback, virtual, can_boost, base_supply, holder rewards (same charge as creator fee), unclaimed
  const parts = [...head, ...creator, ...buyOnly, ...tail];
  return Buffer.concat(truncate == null ? parts : parts.slice(0, truncate)).toString("base64");
}
const B0 = 200_000_000_000_000n, Q0 = 200_000_000_000n; // 200M tokens, 200 SOL

test("BuyEvent / SellEvent decode in IDL order, including the appended fields (ix name, virtual reserves, supply, holder rewards)", () => {
  const e = decodeEvent(swap({ buy: true, B: B0, Q: Q0, vq: -30_000_000n, b: 1_000_000_000n }));
  assert.equal(e.type, "buy"); assert.equal(e.lpBps, 20); assert.equal(e.creatorBps, 30); assert.equal(e.holderBps, 30); assert.equal(e.buybackBps, 10);
  assert.equal(e.virtualQuote, -30_000_000n); assert.equal(e.baseSupply, 1_000_000_000_000_000n); assert.equal(e.ix, "buy"); assert.equal(e.poolBase, B0);
  const s = decodeEvent(swap({ buy: false, B: B0, Q: Q0, b: 1_000_000_000n })); assert.equal(s.type, "sell"); assert.equal(s.virtualQuote, 0n); assert.equal(s.holderBps, 30);
});

test("pricing uses EFFECTIVE quote reserves (vault + signed virtual), and a negative virtual value is handled", () => {
  const p = {}, r = applyEvent(p, decodeEvent(swap({ buy: true, B: B0, Q: Q0, vq: -5_000_000_000n, b: 1_000_000_000n })));
  assert.ok(r, "an event priced on effective reserves is accepted");
  assert.ok(Math.abs(r.state.quote - (195 + r.sol)) < 1e-6, "post-swap effective quote = (200 − 5) + quote in"); assert.ok(Math.abs(r.state.base - (200_000_000 - 1000)) < 1e-6);
  assert.equal(r.state.supply, 1_000_000_000);
});

test("fee per side is the user's net debit/credit — overlapping fee fields (creator fee = holder rewards) are never added together", () => {
  const p = {}; applyEvent(p, decodeEvent(swap({ buy: true, B: B0, Q: Q0, b: 1_000_000_000n, feeFrac: 0.0125 })));
  assert.ok(Math.abs(p.feeBuy - 0.0125) < 1e-4, "not 20+5+30+10+30 bps = 0.0095, and not a double-count: what the user actually paid");
  applyEvent(p, decodeEvent(swap({ buy: false, B: B0 - 1_000_000_000n, Q: Q0 + 1_000_005n, b: 500_000_000n, feeFrac: 0.01 }))); assert.ok(Math.abs(p.feeSell - 0.01) < 1e-4);
});

test("pre/post evidence: each swap is scored against both hypotheses, consecutive events are chained, and a non-fitting event is rejected", () => {
  const p = {}, c0 = { ...dec };
  // only trades that are large against the pool separate the two hypotheses (they differ by ≈ 2 × trade/pool); tiny trades fit both
  const tiny0 = dec.fitBoth; applyEvent({}, decodeEvent(swap({ buy: true, B: B0, Q: Q0, b: 1_000_000_000n }))); assert.equal(dec.fitBoth, tiny0 + 1);
  const r1 = applyEvent(p, decodeEvent(swap({ buy: true, B: B0, Q: Q0, b: 2_000_000_000_000n })));
  const B1 = BigInt(Math.round(r1.state.base * 1e6)), Q1 = BigInt(Math.round(r1.state.quote * 1e9));
  applyEvent(p, decodeEvent(swap({ buy: false, B: B1, Q: Q1, b: 3_000_000_000_000n })));   // next event starts where the last one ended
  assert.equal(dec.fitPre - c0.fitPre, 2); assert.equal(dec.chainOk - c0.chainOk, 1);
  const before = dec.chainBad; applyEvent(p, decodeEvent(swap({ buy: true, B: B0 * 2n, Q: Q0 * 2n, b: 1_000_000_000n }))); assert.equal(dec.chainBad, before + 1, "a jump in reserves between events is counted (missed event or wrong hypothesis)");
  // an event written with POST-swap reserves does not fit the pinned 'pre' interpretation → rejected, counted as fitPost
  const b = 20_000_000_000_000n, q = (Q0 * b) / (B0 - b), bad = Buffer.from(swap({ buy: true, B: B0, Q: Q0, b }), "base64"); bad.writeBigUInt64LE(B0 - b, 8 + 8 * 5); bad.writeBigUInt64LE(Q0 + q, 8 + 8 * 6);
  const f0 = dec.fitPost; assert.equal(applyEvent({}, decodeEvent(bad.toString("base64"))), null); assert.equal(dec.fitPost, f0 + 1);
});

test("older, shorter events still decode (no virtual reserves → counted, treated as 0)", () => {
  const e = decodeEvent(swap({ buy: false, B: B0, Q: Q0, b: 1_000_000_000n, truncate: 24 })); assert.equal(e.virtualQuote, null); assert.equal(e.creatorBps, 30);
  const n = dec.noVirtual; assert.ok(applyEvent({}, e)); assert.equal(dec.noVirtual, n + 1);
});

test("deposit / withdraw change reserves without a swap; a fee sweep is price-neutral", () => {
  const p = {}; applyEvent(p, decodeEvent(swap({ buy: true, B: B0, Q: Q0, b: 1_000_000_000n }))); const q0 = p.quote, b0 = p.base;
  const wd = Buffer.concat([Buffer.from(DISC.WithdrawEvent), i(1800000001), u(0), u(0), u(0), u(0), u(0), u(BigInt(Math.round(b0 * 1e6))), u(BigInt(Math.round(q0 * 1e9))), u(BigInt(Math.round(b0 * 1e6 / 2))), u(BigInt(Math.round(q0 * 1e9 / 2))), u(0), pk(9), pk(2), pk(3), pk(4), pk(5)]).toString("base64");
  const r = applyEvent(p, decodeEvent(wd)); assert.ok(Math.abs(r.state.quote - q0 / 2) < 1e-6 && Math.abs(r.state.base - b0 / 2) < 1, "half the liquidity withdrawn is visible immediately");
  const sw = Buffer.concat([Buffer.from(DISC.SweepPoolFeeEvent), i(1800000002), pk(9), pk(1), pk(2), pk(3), pk(4), u(1_000_000), Buffer.from([0])]).toString("base64");
  const s = applyEvent(p, decodeEvent(sw)); assert.equal(s.changed, false); assert.ok(Math.abs(p.quote - q0 / 2) < 1e-6);
});

test("canonical pool check: pool-authority and canonical pool derivations match the standard Solana library (fixed vectors)", () => {
  const V = [["2hbAWmY7RweotBAgx2yqaNaPXUhoH7S8kVFKi2xZLsrZ", "HQyRPzqjzDC982E4xcQvYLghygbKaEPsti4ZHg76tNSA", "8zKMSLJs9XPzRU7wM9pYhKAeoszfLV14Ef2DGLax2yGm"], ["ASmhLFn6LzdRpUUEmJVjZ6GJMivHgfXAiB8jdyHoijLn", "CS2gFbQ2ZXumCn8YAaXNtLSeehUq9SCaqWbnHbkAo66u", "AgAEUW3VxcJCTmBVWWRzENmcadaJiYDBsu5JuWmLQBHD"], ["6aeTXWTQBocht8JbvdmvhffrXJQLoENL6JocByWBNpGH", "3AYjUcEFNu4ipxmFQDUA95JCshCzgZbVYyYcw8GP4D2f", "FanrqXB5FCZeog3TBg3xH7v67MF5BsGRDD1WQ4GC35XN"]];
  for (const [mint, auth, pool] of V) { assert.equal(pumpPoolAuthority(mint), auth); assert.equal(canonicalPool(mint), pool); assert.ok(isCanonical(mint, auth)); assert.ok(!isCanonical(mint, mint)); assert.ok(!onCurve(bs58dec(auth)), "a program-derived address is off the curve"); assert.ok(onCurve(bs58dec(mint))); }
});

test("REAL transaction (20 Nov 2026 validation): buy_exact_quote_in carries the user's total in quote_amount_in and the curve amount in user_quote_amount_in", () => {
  // pool reserves, virtual reserves, amounts and vault balances copied from tx-validation.json (first sample)
  const B = 38399940021850n, Q = 619809195382n, vq = 17581142980n, b = 92577266n, vaultPost = 619810735126n;
  const ev = (ix) => decodeEvent(swap({ buy: true, B, Q, vq, b, lp: 3074n, ix, raw: { quoteAmt: 1550502n, userQuote: 1536670n } }));
  const n0 = dec.fitNeither; assert.equal(applyEvent({}, ev("buy")), null, "read as an ordinary buy, the curve does not reproduce the amount"); assert.equal(dec.fitNeither, n0 + 1);
  const p = {}, r = applyEvent(p, ev("buy_exact_quote_in")); assert.ok(r, "read with the exact-quote-in field meaning, it fits");
  assert.ok(Math.abs(r.sol - 1536670 / 1e9) < 1e-12, "trade size = the curve amount");
  assert.ok(Math.abs(r.state.quote - Number(vaultPost + vq) / 1e9) < 2e-9, "derived post-swap effective reserves = the vault balance after the transaction + virtual reserves");
  assert.ok(Math.abs(p.feeBuy - (1550502 / 1536670 - 1)) < 1e-12 && Math.abs(p.feeBuy - 0.0090) < 2e-4, "fee = 20 + 5 + 65 bps, exactly what the user paid over the curve amount"); assert.equal(r.state.feeOdd, false);
});
