// The holder-concentration snapshot is RECORD ONLY. These tests pin what it measures, what it refuses to claim, its availability
// semantics and its credit bounds.
import test from "node:test"; import assert from "node:assert/strict";
import { summariseHolders, holderVerdicts, holderSnapshot, hs, HOLDER_BUDGET, HOLDER_RULES } from "../src/holders.mjs";

const POOL = "PoolAccount1111", MINT = "MintAAApump", SUPPLY = 1_000_000_000_000_000n; // 1e9 tokens, 6 decimals
const mintAcc = { data: { parsed: { info: { supply: SUPPLY.toString(), decimals: 6 } } } };
const acct = (owner) => ({ data: { parsed: { info: { owner, mint: MINT } } } });
const pct = (p) => ((SUPPLY * BigInt(Math.round(p * 1000))) / 100_000n).toString();
/** 20 largest accounts: the pool vault (40%), then holders w1…; `shares` in percent of supply */
const answers = (shares, owners = shares.map((_, i) => "w" + i)) => ({ largest: [{ address: "vault", amount: pct(40) }, ...shares.map((p, i) => ({ address: "ta" + i, amount: pct(p) }))], multi: [mintAcc, acct(POOL), ...owners.map((o) => (o == null ? null : acct(o)))] });
const rpcOf = (a, log = []) => async (method, params) => { log.push(method); return method === "getTokenLargestAccounts" ? { context: { slot: 100 }, value: a.largest } : { context: { slot: 101 }, value: a.multi }; };
const entry = (over = {}) => ({ id: 1, mint: MINT, decisionT: 1000, schedT: 1001, ...over }); const coin = { pool: POOL };
const reset = () => Object.assign(hs, { asked: 0, ok: 0, failed: 0, skipped_cap: 0, skipped_busy: 0, calls: 0, retries: 0, before_fill: 0, after_fill: 0, ms_sum: 0, ms_max: 0, in_flight: 0, day: null, day_count: 0, last_err: "" });

test("measures: the pool vault is excluded only when verified; shares are of total supply; owners are grouped among the 20 accounts", () => {
  const a = answers([4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5], ["w0", "w1", "w0", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11"]); const m = summariseHolders({ ...a, pool: POOL });
  assert.equal(m.ok, true); assert.equal(m.excluded.length, 1); assert.equal(m.excluded[0].address, "vault"); assert.equal(m.pool_vault_raw, pct(40));
  assert.ok(Math.abs(m.top10_accounts_share - 0.20) < 1e-6, "ten largest non-pool ACCOUNTS: 4+3+3+2+2+2+1+1+1+1 = 20%"); assert.ok(Math.abs(m.largest_account_share - 0.04) < 1e-6);
  assert.ok(Math.abs(m.largest_owner_share_among_top20 - 0.07) < 1e-6, "w0 holds two of the 20 accounts: 4% + 3%"); assert.ok(Math.abs(m.top10_owners_share_among_top20 - 0.205) < 1e-6);
  assert.ok(Math.abs(m.largest_vs_pool_reserve - 0.10) < 1e-6, "the largest account is a tenth of what the pool holds"); assert.match(m.completeness, /TOKEN ACCOUNTS only/);
  const other = summariseHolders({ ...a, pool: "SomeOtherPool" }); assert.equal(other.excluded.length, 0, "a vault that is not verified as this coin's pool is NOT excluded"); assert.ok(other.largest_account_share > 0.39 && other.pool_vault_raw === null);
});
test("verdicts keep what was knowable apart from what arrived too late; the fee rule is UNRESOLVED, not approximated", () => {
  const m = summariseHolders({ ...answers([4, 3, 3, 2, 2, 2, 1, 1, 1, 1]), pool: POOL });
  let v = holderVerdicts(m, "before fill"); assert.equal(v.top10.status, "PASS"); assert.equal(v.largest.status, "PASS"); assert.equal(v.fees.status, "UNRESOLVED");
  v = holderVerdicts(m, "after fill"); assert.equal(v.top10.status, "TOO LATE"); assert.equal(v.top10.if_available, "PASS", "kept as a diagnostic, never as a pre-entry fact");
  const c = summariseHolders({ ...answers([9, 6, 5, 3, 2, 1, 1, 1, 1, 1]), pool: POOL }); v = holderVerdicts(c, "before fill"); assert.equal(v.top10.status, "KNOWN FAIL"); assert.equal(v.largest.status, "KNOWN FAIL");
  const edge = summariseHolders({ ...answers([5, 2]), pool: POOL }); assert.equal(holderVerdicts(edge, "before fill").largest.status, "PASS", "exactly 5% passes \"5% or less\""); assert.equal(HOLDER_RULES.top10_max, 0.25);
  assert.equal(holderVerdicts({ ok: false }, "missing").top10.status, "MISSING");
});
test("malformed or partial answers never throw and never invent a percentage", () => {
  for (const bad of [{ largest: null, multi: [] }, { largest: [], multi: null }, { largest: [{ address: "x", amount: "10" }], multi: [{ data: { parsed: { info: { supply: "abc", decimals: 6 } } } }] }, { largest: "oops", multi: [mintAcc] }]) { const m = summariseHolders({ ...bad, pool: POOL }); assert.equal(m.ok, false); assert.equal(m.top10_accounts_share, null); assert.ok(m.why); }
  const part = summariseHolders({ ...answers([4, 3], ["w0", null]), pool: POOL }); assert.equal(part.ok, true); assert.equal(part.owners_unresolved, 1, "an account whose owner could not be read is counted as its own holder and flagged");
});
test("one snapshot = two calls; it records times, slots and availability, saves the entry and never touches anything else", async () => {
  reset(); const log = [], saved = [], e = entry(), keys = Object.keys(e); let clock = 1000.2; const now = () => (clock += 0.1);
  const r = await holderSnapshot(e, coin, { rpc: rpcOf(answers([4, 3, 3, 2]), log), store: { saveEntry: (x) => saved.push(x.id) }, now });
  assert.deepEqual(log, ["getTokenLargestAccounts", "getMultipleAccounts"]); assert.equal(hs.calls, 2); assert.equal(r.availability, "before fill"); assert.equal(r.slot_largest, 100); assert.equal(r.slot_owners, 101);
  assert.ok(r.s_after_decision > 0 && r.s_before_fill > 0); assert.equal(e.hold, r); assert.deepEqual(saved, [1]); assert.deepEqual(Object.keys(e).filter((k) => k !== "hold"), keys, "only e.hold was added");
  clock = 1005; const late = await holderSnapshot(entry({ id: 2 }), coin, { rpc: rpcOf(answers([4, 3])), now }); assert.equal(late.availability, "after fill"); assert.equal(late.verdicts.top10.status, "TOO LATE"); assert.equal(hs.before_fill, 1); assert.equal(hs.after_fill, 1);
});
test("credit ceiling: at most one retry per call, a daily cap, a limit on snapshots in flight — and a failure is MISSING, not an error", async () => {
  reset(); let n = 0; const flaky = async (method) => { if (++n <= 1) throw new Error("timeout"); return method === "getTokenLargestAccounts" ? { value: answers([4]).largest } : { value: answers([4]).multi }; };
  let r = await holderSnapshot(entry(), coin, { rpc: flaky, now: () => 1000.5 }); assert.equal(r.ok, true); assert.equal(hs.calls, 3); assert.equal(hs.retries, 1);
  reset(); r = await holderSnapshot(entry(), coin, { rpc: async () => { throw new Error("rpc down"); }, now: () => 1000.5 }); assert.equal(r.ok, false); assert.equal(r.availability, "missing"); assert.equal(r.verdicts.top10.status, "MISSING"); assert.equal(hs.calls, 2, "two attempts of the first call, then it stops: at most 4 calls can ever be spent on one snapshot"); assert.equal(hs.failed, 1);
  reset(); process.env.OLDER_HOLDER_SNAP_MAX = "2"; const ok = rpcOf(answers([4])); for (let i = 0; i < 5; i++) await holderSnapshot(entry({ id: i }), coin, { rpc: ok, now: () => 1000.5 });
  assert.equal(hs.asked, 2); assert.equal(hs.skipped_cap, 3); assert.equal(hs.calls, 4, "the cap bounds the day's credits"); delete process.env.OLDER_HOLDER_SNAP_MAX; assert.equal(HOLDER_BUDGET.day_cap(), 1500);
  reset(); let release; const gate = new Promise((res) => (release = res)); const slow = async (method) => { await gate; return method === "getTokenLargestAccounts" ? { value: answers([4]).largest } : { value: answers([4]).multi }; };
  const pending = []; for (let i = 0; i < 6; i++) pending.push(holderSnapshot(entry({ id: i }), coin, { rpc: slow, now: () => 1000.5 })); assert.equal(hs.in_flight, HOLDER_BUDGET.max_in_flight); assert.equal(hs.skipped_busy, 2, "position management has priority: extra snapshots are dropped, not queued");
  release(); await Promise.all(pending); assert.equal(hs.in_flight, 0);
});
