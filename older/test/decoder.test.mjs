import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePumpSwap, postState, DISC, dec } from "../src/decoder.mjs";

// build a BuyEvent payload in the on-chain layout (pre-swap reserves) and check the decoder and the post-swap state
function buyEvent({ B, Q, b, lp = 0n, lpBps = 20n, protoBps = 5n, creatorBps = 5n, consistent = true }) {
  const q = consistent ? (Q * b) / (B - b) : 12345n;
  const u = (v) => { const x = Buffer.alloc(8); x.writeBigUInt64LE(v); return x; }, i = (v) => { const x = Buffer.alloc(8); x.writeBigInt64LE(v); return x; };
  const pk = (n) => Buffer.alloc(32, n);
  return Buffer.concat([DISC.D_BUY, i(1800000000n), u(b), u(q * 2n), u(0n), u(0n), u(B), u(Q), u(q), u(lpBps), u(lp), u(protoBps), u(0n), u(q), u(q), pk(1), pk(2), pk(3), pk(4), pk(5), pk(6), pk(7), u(creatorBps), u(0n)]).toString("base64");
}
test("BuyEvent decodes amounts, reserves and the three fee rates; post-swap state derived", () => {
  const e = decodePumpSwap(buyEvent({ B: 200_000_000_000_000n, Q: 200_000_000_000n, b: 1_000_000_000n, lp: 1_000_000n }));
  assert.equal(e.type, "buy"); assert.equal(e.lpBps, 20); assert.equal(e.protoBps, 5); assert.equal(e.creatorBps, 5);
  const st = postState(e); assert.equal(st.feeBps, 30);
  assert.ok(Math.abs(st.base - (200_000_000 - 1000)) < 1e-6); assert.ok(st.quote > 200 && st.quote < 200.0021);
});
test("reserves that do not reproduce the trade are rejected and counted, never used", () => {
  const before = dec.reserveMismatch; const e = decodePumpSwap(buyEvent({ B: 2n * 10n ** 14n, Q: 2n * 10n ** 11n, b: 10n ** 9n, consistent: false }));
  assert.equal(postState(e), null); assert.equal(dec.reserveMismatch, before + 1);
});
