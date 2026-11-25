// BOUNDED MEMORY FOR POOLS THAT ARE NOT OURS (25 Nov 2026): on the validation run 372,000 never-seen, non-SOL-quoted pools
// traded in 90 minutes and each was kept for ever with its addresses, its events held until a slow look-up classified it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { Junk, Hold, compactPool, poolClass, NON_SOL, NON_SOL_BASE_SOL, NON_CANON } from "../src/feed.mjs";
import { WSOL } from "../src/decoder.mjs";
import { Store } from "../src/store.mjs";

test("a pool that is not SOL-quoted, or not a canonical pump.fun pool, keeps a shared marker instead of its own record; ours keeps its record", () => {
  assert.equal(compactPool({ mint: "TokenA", quote: "USDCmint", creator: "c" }), NON_SOL); assert.equal(compactPool({ mint: WSOL, quote: "TokenB", creator: "c" }), NON_SOL_BASE_SOL, "SOL as the base token is counted apart");
  assert.equal(compactPool({ mint: null, quote: null, creator: null, unreadable: true }), NON_SOL); assert.equal(compactPool({ mint: "T", quote: WSOL, creator: "x", cls: "non-canonical" }), NON_CANON);
  const ours = { mint: "T", quote: WSOL, creator: "pda", cls: "canonical" }, unknown = { mint: "T", quote: WSOL, creator: "pda" }; assert.equal(compactPool(ours), ours); assert.equal(compactPool(unknown), unknown, "a SOL-quoted pool not yet classified keeps what is needed to classify it");
  for (const m of [NON_SOL, NON_SOL_BASE_SOL, NON_CANON]) { assert.ok(Object.isFrozen(m)); assert.equal(poolClass(m), m.cls, "a marker is classified without being written to"); }
});
test("pools that are not ours are remembered first-in-first-out up to a limit — memory cannot grow with their number", () => {
  const j = new Junk(1000); for (let i = 0; i < 5000; i++) j.add("pool" + i, NON_SOL); assert.ok(j.size <= 1000, "size " + j.size); assert.equal(j.get("pool4999"), NON_SOL, "the newest are kept"); assert.equal(j.get("pool0"), undefined, "the oldest are forgotten (and would simply be looked up again)"); assert.equal(j.size + j.evicted, 5000);
});
test("held events have one limit for all pools together; past it a pool keeps only its newest events and is marked overflowed, so its history restarts if it is ours", () => {
  const h = new Hold(300, 20000, 10); assert.equal(h.push("A", "a1", 100), "new"); for (let i = 2; i <= 6; i++) assert.equal(h.push("A", "a" + i, 100 + i), "held"); for (let i = 1; i <= 4; i++) h.push("B", "b" + i, 200 + i); assert.equal(h.items, 10);
  assert.equal(h.push("A", "a7", 107), "kept-newest"); assert.equal(h.items, 10, "the total does not grow"); assert.equal(h.push("C", "c1", 300), "new", "a new pool is still queued for its look-up"); assert.equal(h.items, 10); assert.equal(h.dropped, 1);
  const a = h.take("A"); assert.deepEqual(a.items, ["a2", "a3", "a4", "a5", "a6", "a7"]); assert.equal(a.overflow, true); assert.equal(h.items, 4); const c = h.take("C"); assert.deepEqual(c.items, []); assert.equal(c.overflow, true); assert.equal(c.t0, 300, "an overflowed pool with nothing kept still knows when it was first seen");
  assert.equal(h.take("nope"), null); const small = new Hold(2, 1, 100); small.push("A", 1, 0); assert.equal(small.push("B", 1, 0), "full", "no room for another pool"); small.push("A", 2, 0); assert.equal(small.push("A", 3, 0), "kept-newest", "the per-pool limit still applies"); assert.deepEqual(small.take("A").items, [2, 3]);
});
test("only SOL-quoted pools are loaded at a start: rows of other pools left in a database by an earlier version stay out of memory", () => {
  const st = new Store(join(mkdtempSync(join(tmpdir(), "older-pools-")), "p.db")); st.savePool("P1", { mint: "T1", quote: WSOL, creator: "c1" }); st.savePool("P2", { mint: WSOL, quote: "T2", creator: "c2" }); st.savePool("P3", { mint: "T3", quote: "USDC", creator: null });
  assert.equal(st.loadPools().size, 3, "without a filter everything, as before"); const m = st.loadPools(WSOL); assert.deepEqual([...m.keys()], ["P1"]); assert.deepEqual(m.get("P1"), { mint: "T1", quote: WSOL, creator: "c1" }); st.db.close();
});
