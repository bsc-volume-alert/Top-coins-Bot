// older-11 — the GMGN client's two kinds of call: a buy-check reading goes first and fails fast; history repair leaves a reserve.
import { test } from "node:test";
import assert from "node:assert/strict";
process.env.GMGN_API_KEY = "test-key"; process.env.GMGN_WPS = "1000"; process.env.GMGN_HOST = "http://gmgn.test";
const { gcall, tokenInfoFirst, gm, _reset } = await import("../src/gmgn.mjs");
const realFetch = globalThis.fetch; let calls = [], plan = [];
const answer = ({ status = 200, body = { code: 0, data: { ok: 1 } }, remaining = null, resetInS = null } = {}) => ({ status, headers: new Headers({ ...(remaining != null ? { "x-ratelimit-limit": "5", "x-ratelimit-remaining": String(remaining) } : {}), ...(resetInS != null ? { "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + resetInS) } : {}) }), text: async () => JSON.stringify(body) });
const install = () => { calls = []; plan = []; _reset(); gm.reserve = 0; globalThis.fetch = async (url, o) => { const u = new URL(url); calls.push({ path: u.pathname, t: Date.now(), key: o.headers["X-APIKEY"] }); return answer(plan.shift() || {}); }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test.after(() => { globalThis.fetch = realFetch; });

test("a buy-check reading is sent at once, ahead of repair calls that are waiting, and its time is recorded", async () => {
  install(); plan.push({ status: 429, body: { code: 429, error: "RATE_LIMIT_EXCEEDED" }, resetInS: 1 }); // the first repair call is refused: the queue pauses 0.5–1.5 s (whole-second reset time + 0.5 s)
  const a = gcall("/v1/market/token_kline", { chain: "sol" }).catch((e) => e.message); await sleep(20);
  const b = gcall("/v1/market/token_kline", { chain: "sol" }); await sleep(20); // queued behind the pause
  const before = gm.first.ok, info = await tokenInfoFirst("MintX", 3000); // waits out the short pause (≤ maxWaitMs) but not the queue
  assert.deepEqual(info, { ok: 1 }); assert.equal(calls[1].path, "/v1/token/info", "the reading went out before the queued repair call"); assert.equal(gm.first.ok, before + 1);
  assert.equal(await a, "GMGN rate limited"); await b; assert.equal(calls[2].path, "/v1/market/token_kline");
});
test("when the provider has said to wait longer than the reading can wait, the reading is not sent and fails at once", async () => {
  install(); plan.push({ status: 429, body: { code: 429, error: "RATE_LIMIT_EXCEEDED" }, resetInS: 15 });
  await gcall("/v1/token/info", { chain: "sol" }).catch(() => {}); const n = calls.length, ns = gm.first.not_sent, t = Date.now();
  await assert.rejects(tokenInfoFirst("MintX", 300), /allowance exhausted for another 1[45]\.\d s/); assert.ok(Date.now() - t < 100, "failed fast"); assert.equal(calls.length, n, "nothing was sent"); assert.equal(gm.first.not_sent, ns + 1);
});
test("with a reserve set, a repair call is held back while it would take the allowance below the reserve, and goes when the allowance refills; a reading still goes at once", async () => {
  install(); gm.reserve = 2; plan.push({ remaining: 3, resetInS: 2 }); // after this answer: 3 units left until the reset in ~1–2 s
  await gcall("/v1/token/info", { chain: "sol" }); const t0 = Date.now(), hb = gm.held_back;
  const repair = gcall("/v1/market/token_kline", { chain: "sol" }); await sleep(100); assert.equal(calls.length, 1, "weight 2 would leave 1 < reserve 2: held back"); assert.ok(gm.held_back > hb);
  await tokenInfoFirst("MintX"); assert.equal(calls[1].path, "/v1/token/info", "the reading used the reserved units");
  await repair; assert.equal(calls[2].path, "/v1/market/token_kline"); assert.ok(calls[2].t - t0 >= 900, "sent only after the reset time");
});
test("without a reserve the repair queue is exactly as before: in order, nothing held back; and the key never appears in an error", async () => {
  install(); plan.push({ remaining: 1, resetInS: 5 }); const hb = gm.held_back; await gcall("/v1/token/info", { chain: "sol" }); await gcall("/v1/market/token_kline", { chain: "sol" }); assert.equal(calls.length, 2); assert.equal(gm.held_back, hb);
  plan.push({ body: { code: 40003, error: "BAD", message: "nope" } }); const err = await gcall("/v1/token/info", { chain: "sol" }).catch((e) => e.message); assert.ok(!/test-key/.test(err)); assert.equal(calls[2].key, "test-key");
});
test("review of bbe1115: a reading is not sent into an allowance the provider has just reported as used up, and calls in flight share one count", async () => {
  install(); plan.push({ remaining: 0, resetInS: 15 }); // a successful answer that says: nothing left for about 15 s
  await gcall("/v1/token/info", { chain: "sol" }); const n = calls.length, ns = gm.first.not_sent, t = Date.now();
  await assert.rejects(tokenInfoFirst("MintX", 300), /allowance exhausted for another 1[345]\.\d s/); assert.ok(Date.now() - t < 100, "failed fast"); assert.equal(calls.length, n, "not sent: it would only have been refused"); assert.equal(gm.first.not_sent, ns + 1);
  install(); plan.push({ remaining: 2, resetInS: 15 }); await gcall("/v1/token/info", { chain: "sol" }); // two units left
  const a = tokenInfoFirst("A"), b = tokenInfoFirst("B"); await assert.rejects(tokenInfoFirst("C", 300), /allowance exhausted/, "the third finds the two units already taken by the readings still in flight");
  await a; await b; assert.equal(calls.length, 3);
});
