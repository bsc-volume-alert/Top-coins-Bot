// Check-pointing of open positions (23 Nov 2026). An open position's decision state (peak, last value, runner high) must be in
// the database at most CHECKPOINT_S after it changes — and a position nothing happened to must NOT be re-written every second
// (at 1,350 open positions that was ~38 MB/s of writing and a full processor core: the feed ran 10 s late and dropped).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { CHECKPOINT_S } from "../src/spec.mjs";

function setup() {
  const file = join(mkdtempSync(join(tmpdir(), "older-ck-")), "t.db"), store = new Store(file), e = mkEngine({ store });
  e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 40 * H });
  let t = T0, mc = 100_000; // a steady climb with volume: the books buy
  for (let k = 0; k < 400 && !e.entries.size; k++) { t += 20; mc *= 1.012; swap(e, t, mc, { sol: 30, user: "u" + (k % 40) }); e.tick(t + 1.5); }
  for (let k = 0; k < 20; k++) { t += 1; swap(e, t, mc, { sol: 1 }); e.tick(t + 0.5); } // let the buys fill
  const open = [...e.entries.values()].filter((x) => x.status === "filled");
  assert.ok(open.length > 0, "the scenario must produce at least one open position");
  let saves = 0; const orig = store.saveEntry.bind(store); store.saveEntry = (x) => { saves++; return orig(x); };
  return { e, store, file, t, mc, open, count: () => saves, reset: () => { saves = 0; } };
}

test("a position nothing happened to is not re-written by clock ticks", () => {
  const s = setup(); let now = s.t + 5; s.e.tick(now); s.e.tick(now += CHECKPOINT_S + 0.1); s.reset(); // drain what the setup left
  for (let k = 0; k < 300; k++) s.e.tick(now += 0.1); // 30 s of ticks, no trade on the coin
  assert.equal(s.count(), 0, "30 s without a price: nothing may be written");
  assert.equal(s.e.dirty.size, 0);
});

test("a new price is saved within CHECKPOINT_S, and a restart resumes with the same peaks", () => {
  const s = setup(); let now = s.t + 5; s.e.tick(now); s.e.tick(now += CHECKPOINT_S + 0.1); s.reset();
  const hi = s.mc * 1.05; swap(s.e, now + 0.05, hi, { sol: 1 }); // a new high, no order triggered
  assert.ok(s.e.dirty.size >= 1, "the observed positions are marked");
  for (let k = 0; k < 12; k++) s.e.tick(now += 0.1); // 1.2 s of ticks
  assert.ok(s.count() >= 1, "the regular checkpoint wrote them"); assert.equal(s.e.dirty.size, 0);
  const want = new Map([...s.e.entries.values()].map((x) => [x.id, JSON.stringify(x)]));
  const e2 = mkEngine({ store: new Store(s.file) }); e2.store.restore(e2);
  for (const [id, j] of want) assert.equal(JSON.stringify(e2.entries.get(id)), j, `entry ${id} restored exactly as it stood`);
});

test("changes made by the clock alone are still saved (max hold, clock books, runner horizon)", () => {
  const s = setup(); let now = s.t + 5; s.e.tick(now); s.e.tick(now += CHECKPOINT_S + 0.1); s.reset();
  // jump the clock past every time-based rule without a single trade: orders are scheduled / horizons close → written
  s.e.tick(now += 25 * H); s.e.tick(now += CHECKPOINT_S + 0.1);
  assert.ok(s.count() >= s.open.length, "every position's time-based change reached the database");
  const e2 = mkEngine({ store: new Store(s.file) }); e2.store.restore(e2);
  for (const x of s.e.entries.values()) assert.equal(JSON.stringify(e2.entries.get(x.id)), JSON.stringify(x), `entry ${x.id} identical after restart`);
});
