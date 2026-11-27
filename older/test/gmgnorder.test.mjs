// 27 Nov 2026 — the ordinary GMGN lane has two lines: readings first, history repair behind them; and gap-repair passes run one at a time.
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.GMGN_API_KEY = "test-key"; process.env.GMGN_WPS = "1000"; process.env.GMGN_HOST = "http://gmgn.test"; process.env.GMGN_REFILL_S = "0.4"; process.env.GMGN_REFILL_MIN_S = "0.1";
const { gcall, tokenInfoLate, minuteBars, gm, gmQueue, _reset } = await import("../src/gmgn.mjs");
const { startBackfill, bf } = await import("../src/backfill.mjs");
const { mkEngine, T0 } = await import("./helpers.mjs");
const realFetch = globalThis.fetch; let calls = [], plan = [], inFlight = 0, maxFlight = 0, slowMs = 0;
const answer = ({ body = { code: 0, data: { ok: 1 } }, remaining = null } = {}) => ({ status: 200, headers: new Headers(remaining != null ? { "x-ratelimit-limit": "5", "x-ratelimit-remaining": String(remaining) } : {}), text: async () => JSON.stringify(body) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const install = () => { calls = []; plan = []; inFlight = 0; maxFlight = 0; slowMs = 0; _reset(); gm.reserve = 0; globalThis.fetch = async (url) => { const u = new URL(url); calls.push({ path: u.pathname, mint: u.searchParams.get("address"), t: Date.now() }); inFlight++; maxFlight = Math.max(maxFlight, inFlight); if (slowMs) await sleep(slowMs); inFlight--; return answer(plan.shift() || {}); }; };
test.after(() => { globalThis.fetch = realFetch; });
const repair = (mint) => gcall("/v1/market/token_kline", { chain: "sol", address: mint }, { low: true });

test("readings that are waiting go before repair calls that were asked for earlier", async () => {
  install(); gm.reserve = 2; plan.push({ remaining: 3 }); await repair("first"); // 3 units left: the next 2-unit call is held back one refill time (0.4 s)
  const r1 = repair("r1"), r2 = repair("r2"), r3 = repair("r3"); await sleep(40); assert.equal(calls.length, 1, "the repair calls wait for the refill");
  assert.deepEqual(gmQueue(), { readings: 0, repair: 2 }, "one repair call is being paced, two wait in the repair line");
  const yielded = gm.repair_yielded || 0, a = tokenInfoLate("readA"), b = tokenInfoLate("readB"); await Promise.all([a, b, r1, r2, r3]);
  assert.deepEqual(calls.map((c) => c.mint), ["first", "readA", "readB", "r1", "r2", "r3"], "both readings went out before any waiting repair call — the one being paced gave up its turn");
  assert.equal(gm.repair_yielded, yielded + 1); assert.deepEqual(gmQueue(), { readings: 0, repair: 0 });
});
test("with no reading waiting the repair line is served in order, exactly as the single line was; one-minute bars and creation time are repair calls", async () => {
  install(); const order = []; await Promise.all(["a", "b", "c"].map((m) => repair(m).then(() => order.push(m)))); assert.deepEqual(order, ["a", "b", "c"]);
  install(); gm.reserve = 2; plan.push({ remaining: 3 }); await repair("first"); const bars = minuteBars("barsMint", 6000, 6600); await sleep(30); const rd = tokenInfoLate("reading"); await Promise.all([bars, rd]);
  assert.deepEqual(calls.map((c) => c.mint), ["first", "reading", "barsMint"], "minuteBars waits in the repair line");
});
test("gap repair: one pass at a time, and with two already waiting a further pass is not started", async () => {
  install(); slowMs = 15; const e = mkEngine(); e.feedUp(T0); for (const m of ["A", "B", "C", "D"]) e.coin(m, { pool: "P" + m });
  delete process.env.GMGN_API_KEY; // started without a key the repair's own endless loop is not begun (the test must end); patchGap is the part under test
  const b = startBackfill({ engine: e, store: null, jup: null, log: () => {}, paused: () => false }); process.env.GMGN_API_KEY = "test-key"; const busy0 = bf.gapsSkippedBusy || 0, done0 = (bf.gapsPatched || 0) + (bf.gapsNotPatched || 0);
  const p1 = b.patchGap(T0, T0 + 60, ["A", "B"]), p2 = b.patchGap(T0 + 100, T0 + 160, ["C", "D"]), p3 = b.patchGap(T0 + 200, T0 + 260, ["A", "C"]), p4 = b.patchGap(T0 + 300, T0 + 360, ["B", "D"]);
  assert.equal((bf.gapsSkippedBusy || 0) - busy0, 2, "the fourth pass (two coins) is counted as skipped, not started"); assert.equal(bf.gapPasses, 3);
  await Promise.all([p1, p2, p3, p4]); assert.equal(maxFlight, 1, "never two gap-repair requests at once"); assert.equal(bf.gapPasses, 0);
  assert.deepEqual(calls.filter((c) => c.path === "/v1/market/token_kline").map((c) => c.mint), ["A", "B", "C", "D", "A", "C"], "the passes ran one after another, in the order they were asked for");
  assert.equal((bf.gapsPatched || 0) + (bf.gapsNotPatched || 0) - done0, 6);
});
