import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";

test("restart: one-entry flags and open positions survive; the restart gap blocks fabricated crossings; exits flag the outage", () => {
  const db = join(mkdtempSync(join(tmpdir(), "older-")), "t.db");
  let st = new Store(db), e = mkEngine({ store: st });
  e.feedUp(T0); e.coin("MintAAApump", { pool: "PoolA", createTs: T0 - 4 * H }); st.saveCoin("MintAAApump", { pool: "PoolA", createTs: T0 - 4 * H });
  path(e, T0, T0 + 4 * H + 60, () => 50_000); path(e, T0 + 4 * H + 60, T0 + 5 * H, (t) => 50_000 * (1 + (t - T0 - 4 * H) / H * 1.5));
  e.tick(T0 + 5 * H); st.heartbeat(T0 + 5 * H);
  const before = [...e.entries.values()].filter((x) => x.families.includes("LOW4H")); assert.equal(before.length, 1); assert.equal(before[0].status, "filled");
  st.db.close();

  // restart 20 minutes later
  st = new Store(db); const e2 = mkEngine({ store: st }); st.restore(e2);
  const now = T0 + 5 * H + 1200; e2.restartGap(st.lastAlive(), now); e2.feedUp(now);
  assert.equal(e2.entries.size >= 1, true);
  path(e2, now, now + 3 * H, () => 30_000);                                   // price collapses → the open position's stops sell
  const re = [...e2.entries.values()].find((x) => x.id === before[0].id);
  assert.ok(re.versions.every((v) => v.status === "closed")); assert.ok(re.versions.every((v) => v.exit.outage_during));
  path(e2, now + 3 * H, now + 3.5 * H, (t) => 30_000 * (1 + (t - now - 3 * H) / 600)); // a fresh doubling inside A1 again
  assert.equal([...e2.entries.values()].filter((x) => x.families.includes("LOW4H") && x.ag === "A1").length + 0, 1 - 0); // only the restored one (no second A1 LOW4H)
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM decisions WHERE family='LOW4H' AND ag='A1'").get().n, 1);
});
