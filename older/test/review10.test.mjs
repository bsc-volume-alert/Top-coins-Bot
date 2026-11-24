// TENTH REVIEW (Codex on older-10 @ 3537ada) — five defects, each reproduced with the PRODUCTION Engine used directly: no
// helpers.mjs, no default fixtures. Every scenario is driven chronologically, one transaction at a time, in the order feed.mjs
// uses: engine.tx(receiveTime, delayBehindChain, () => install this transaction's pool states). Nothing is assumed current.
//   B1 a recovery priced orders on the pool state that the recovering transaction itself replaced
//   B2 the recovery path filled a pending buy without the eligibility gate
//   B3 a silence stopped pricing but left signal history continuous
//   B4 one good measurement ended a late spell
//   B5 a mint account that came back empty was never asked for again
// On 3537ada (driven there as its feed did: noteLag, then the events) the B1–B5 cases fail and the two "control" cases pass;
// the status function used by the diagnostics case did not exist there.
import test from "node:test"; import assert from "node:assert/strict";
import { Engine } from "../src/engine.mjs"; import * as R from "../src/risk.mjs"; import * as S from "../src/spec.mjs";
import { liqValue } from "../src/fills.mjs"; import { bookRows } from "../src/report.mjs";

const T0 = 1_800_000_000, H = 3600, BASE = 2e8, q = (mc) => (mc / 1e11) * BASE, A = "MintAAApump", B = "MintBBBpump", LIM = S.FEED_MAX_LAG_S;
const mk = (info = { token_program: R.SPL_TOKEN }, mints = [A]) => { const e = new Engine({ solUsd: () => 100 }); e.feedUp(T0); for (const m of mints) Object.assign(e.coin(m, { pool: "Pool" + m[4], createTs: T0 - 9 * H }).info, info); return e; };
const ev = (t, mc, { mint = A, sol = 1 } = {}) => ({ t: T0 + t, mint, pool: "Pool" + mint[4], base: BASE, quote: q(mc), feeBps: 30, sol, isBuy: true, user: "u" });
/** one transaction in feed order; on 3537ada (no engine.tx) the same calls in the order its feed made them */
const tx = (e, t, lag, ...evs) => (e.tx ? e.tx(T0 + t, lag, () => { for (const x of evs) e.onSwap(x); }) : (e.noteLag(T0 + t, lag), evs.forEach((x) => e.onSwap(x))));
const ents = (e) => [...e.entries.values()], filled = (e) => ents(e).filter((x) => x.status === "filled");
/** current stream, a trade every 2 s at $100K for ten minutes, then the jump to $210K: a fresh FAST crossing, buy scheduled 1 s later */
const lead = (e, mints = [A]) => { for (let t = 0; t < 600; t += 2) tx(e, t, 1, ...mints.map((m) => ev(t, 100_000, { mint: m }))); tx(e, 600, 1, ...mints.map((m) => ev(600, 210_000, { mint: m, sol: 5 }))); };
const fill = (e, mints = [A]) => { tx(e, 601.2, 1, ...mints.map((m) => ev(601.2, 210_000, { mint: m }))); e.tick(T0 + 601.3); for (let t = 603; t < 610; t += 2) tx(e, t, 1, ...mints.map((m) => ev(t, 210_000, { mint: m }))); };
const row = (e, mint = A, stop = 0.2) => filled(e).find((x) => x.mint === mint).versions.find((v) => v.stop === stop && v.policy === "trail");
const mintAcc = (ext = []) => ({ owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1000000000000000", mintAuthority: null, freezeAuthority: null, extensions: ext } } } });
const feeExt = (bps) => ({ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: bps }, olderTransferFee: { transferFeeBasisPoints: bps } } });

test("B1 the transaction that ends a late spell is applied BEFORE anything is priced: the overdue sale gets its 80 SOL pool, not the 240 SOL one before it", () => {
  const e = mk(); lead(e); fill(e); tx(e, 610, 1, ev(610, 150_000)); const v = row(e); assert.equal(v.status, "selling", "the 20% trail has triggered; sale scheduled at +610.7");
  tx(e, 610.2, 60); for (let t = 612; t <= 630; t += 2) tx(e, t, 60, ev(t, 120_000)); assert.equal(v.status, "selling", "nothing is priced while the stream is late");
  for (const t of [630.001, 631.001, 632.001, 633.001, 634.001]) tx(e, t, 1); assert.equal(v.status, "selling", "five good measurements: 4 s of good evidence, not yet 5");
  tx(e, 635.001, 1, ev(635.001, 40_000)); // completes the recovery AND moves the pool
  assert.equal(v.status, "closed"); assert.ok(Math.abs(v.exit.pool.q - q(40_000)) < 1e-9, "priced on the recovering transaction's own committed state (80 SOL), not the preceding 240 SOL");
  const want = liqValue({ base: BASE, quote: q(40_000), feeBuy: 0.003, feeSell: 0.003 }, filled(e)[0].fill.tok);
  assert.ok(Math.abs(v.exit.sol - want) < 1e-12, `proceeds ${v.exit.sol} must equal the quote on that state ${want}`); assert.ok(v.exit.sol < 0.04 && v.exit.delay_s > 24, "and carry the delay the sale really had");
});
test("B1 a recovering transaction that touches TWO pools: no position is revalued halfway through it", () => {
  const e = mk(undefined, [A, B]); lead(e, [A, B]); fill(e, [A, B]); tx(e, 610, 1, ev(610, 150_000), ev(610, 150_000, { mint: B })); const va = row(e, A), vb = row(e, B); assert.equal(va.status, "selling"); assert.equal(vb.status, "selling");
  tx(e, 610.2, 60); for (let t = 612; t <= 630; t += 2) tx(e, t, 60, ev(t, 120_000), ev(t, 120_000, { mint: B }));
  for (const t of [630.001, 631.001, 632.001, 633.001, 634.001]) tx(e, t, 1);
  tx(e, 635.001, 1, ev(635.001, 40_000), ev(635.001, 30_000, { mint: B })); // pool A first, pool B second, one transaction
  assert.ok(Math.abs(va.exit.pool.q - q(40_000)) < 1e-9); assert.ok(Math.abs(vb.exit.pool.q - q(30_000)) < 1e-9, "the pool installed LAST in the transaction is also priced on its new state");
});
test("B2 the eligibility gate also guards the recovery path: a pending buy on a coin that turned restricted is cancelled, not filled", () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mintAcc()) }); lead(e); const p = ents(e); assert.ok(p.length > 0 && p.every((x) => x.status === "pending"), "decided at +600, fill scheduled at +601");
  tx(e, 600.1, 60); for (const t of [600.6, 601.6, 602.6, 603.6, 604.6]) tx(e, t, 1); assert.ok(p.every((x) => x.status === "pending"), "delayed by the late spell");
  e.coins.get(A).info.risk = R.classifyMintAccount(mintAcc([feeExt(800)])); assert.equal(e.freshAt(T0 + 604.6), false);
  tx(e, 605.601, 1, ev(605.601, 100_000, { mint: B })); // another pool's transaction completes the recovery (good evidence since +600.6), inside the buy window that ends at +606
  assert.equal(e.freshAt(T0 + 605.601), true); assert.equal(filled(e).length, 0, "not filled with a zero fee");
  assert.ok(p.every((x) => x.status === "cancelled" && x.flags.some((f) => /cancelled before the buy/.test(f) && /restricted/.test(f))));
  // positive control: same timing, coin still clean → the recovery fills it inside the buy window
  const c = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mintAcc()) }); lead(c); tx(c, 600.1, 60); for (const t of [600.6, 601.6, 602.6, 603.6, 604.6]) tx(c, t, 1); tx(c, 605.601, 1, ev(605.601, 100_000, { mint: B }));
  assert.ok(filled(c).length > 0 && filled(c)[0].fill.delay_s > 4, "an eligible buy is still filled by the first current state within the timeout");
});
test("B3 a globally silent stream is a gap in SIGNAL coverage too: no exact window and no fresh crossing spans it", () => {
  const e = mk(); for (let t = 0; t <= 600; t += 2) tx(e, t, 1, ev(t, 100_000));
  assert.equal(e.freshAt(T0 + 610), false, "no evidence for 10 s: not current");
  tx(e, 622, 1, ev(622, 210_000, { sol: 5 })); tx(e, 623.2, 1, ev(623.2, 210_000)); e.tick(T0 + 623.3);
  assert.equal(ents(e).length, 0, "the doubling was only seen across 22 unobserved seconds: no FAST or FAST150 buy");
  const c = e.coins.get(A); assert.equal(c.series.continuous(T0 + 560, T0 + 622), false, "exact continuity is broken across the silence");
  for (let t = 624; t <= 630; t += 1) tx(e, t, 1, ev(t, 210_000)); assert.equal(e.freshAt(T0 + 630), true);
  const g = e.cov.gapsIn(T0 + 590, T0 + 631); assert.equal(g.length, 1); assert.ok(Math.abs(g[0][0] - (T0 + 600)) < 1e-6 && g[0][1] >= T0 + 622 + LIM, "one gap, from the last evidence to the end of the good-evidence period");
  assert.equal(e.streamStatus().interruptions.silence, 1, "counted as a silence, with its provenance");
  // a quiet POOL is not a silent FEED: pool A stops trading, other transactions keep the delay measured → no gap, no interruption
  const k = mk(); for (let t = 0; t <= 600; t += 2) tx(k, t, 1, ev(t, 100_000)); for (let t = 602; t <= 660; t += 2) tx(k, t, 1); assert.equal(k.cov.gapsIn(T0 + 590, T0 + 660).length, 0); assert.equal(k.freshAt(T0 + 640), true); assert.equal(k.streamStatus().interruptions.silence, 0);
  // and after a clean window the same coin is bought normally
  for (let t = 632; t < 1300; t += 2) tx(e, t, 1, ev(t, 210_000)); tx(e, 1300, 1, ev(1300, 445_000, { sol: 5 })); tx(e, 1301.2, 1, ev(1301.2, 445_000)); e.tick(T0 + 1301.3); assert.ok(filled(e).length > 0);
});
test("B4 a late spell ends only after FEED_MAX_LAG_S of continuous good evidence — one good measurement after a quiet stretch does not end it", () => {
  const e = mk(); for (let t = -20; t < 0; t += 2) tx(e, t, 1); assert.equal(e.freshAt(T0 - 2), true);
  tx(e, 0, 60); tx(e, 30, 1); assert.equal(e.freshAt(T0 + 30), false, "one measurement, 30 s after the last evidence, proves nothing"); assert.equal(e.streamStatus().state, "recovering");
  tx(e, 32, 1); tx(e, 34, 1); assert.equal(e.freshAt(T0 + 34), false, "4 s of good evidence"); tx(e, 35, 1); assert.equal(e.freshAt(T0 + 35), true, "5 s of good evidence, starting at the FIRST good measurement (+30)");
  // bad evidence restarts the period
  const b = mk(); for (let t = -20; t < 0; t += 2) tx(b, t, 1); tx(b, 0, 60); tx(b, 1, 1); tx(b, 3, 1); tx(b, 4, 60); tx(b, 5, 1); tx(b, 7, 1); tx(b, 9, 1); assert.equal(b.freshAt(T0 + 9), false, "only 4 s since the good period restarted at +5"); tx(b, 10, 1); assert.equal(b.freshAt(T0 + 10), true);
  // a silence longer than the limit inside the period restarts it
  const s = mk(); for (let t = -20; t < 0; t += 2) tx(s, t, 1); tx(s, 0, 60); tx(s, 1, 1); tx(s, 3, 1); tx(s, 9.5, 1); assert.equal(s.freshAt(T0 + 9.5), false, "6.5 s without evidence: the period starts again at +9.5"); tx(s, 12, 1); tx(s, 14.5, 1); assert.equal(s.freshAt(T0 + 14.5), true);
  // a disconnect inside a late spell does not shorten it: the new connection still owes the full period
  const d = mk(); for (let t = -20; t < 0; t += 2) tx(d, t, 1); tx(d, 0, 60); d.feedDown(T0 + 1, "close"); d.feedUp(T0 + 3); tx(d, 3.5, 1); assert.equal(d.freshAt(T0 + 3.5), false); tx(d, 6, 1); tx(d, 8.5, 1); assert.equal(d.freshAt(T0 + 8.5), true);
});
test("the written initial-connection policy is kept, explicitly: unknown until measured, current at the first good measurement of a connection", () => {
  const e = new Engine({ solUsd: () => 100 }); if (e.streamStatus) assert.equal(e.streamStatus().state, "unknown (delay not measured on this connection)"); e.feedUp(T0); assert.equal(e.freshAt(T0), false);
  tx(e, 0.4, 1.1); assert.equal(e.freshAt(T0 + 0.4), true); assert.equal(e.freshAt(T0 + 0.2), false, "never back-dated before the first evidence");
  for (let t = 2; t <= 20; t += 2) tx(e, t, 1); e.feedDown(T0 + 21, "close"); e.feedUp(T0 + 23); assert.equal(e.freshAt(T0 + 23.2), false, "unknown again"); assert.equal(e.freshAt(T0 + 20), true, "what was current before the disconnect stays so");
  tx(e, 23.5, 1); assert.equal(e.freshAt(T0 + 23.5), true); assert.equal(e.cov.gapsIn(T0 + 20, T0 + 24).length, 1, "the disconnect is one coverage gap, closed by the first measurement");
  const f = new Engine({ solUsd: () => 100 }); f.feedUp(T0); tx(f, 0.4, 30); assert.equal(f.freshAt(T0 + 0.4), false, "a connection whose first measurement is late starts late"); tx(f, 1, 1); assert.equal(f.freshAt(T0 + 1), false); tx(f, 3.5, 1); tx(f, 6, 1); assert.equal(f.freshAt(T0 + 6), true);
});
test("B5 a mint account that comes back empty, unparsed or missing from a short answer is retried with a bounded back-off; the rest of the batch is not stranded", async () => {
  const e = mk({}, [A, B]); const C = "MintCCCpump"; e.coin(C, { pool: "PoolC", createTs: T0 - 9 * H }); lead(e, [A, B, C]); const [a, b, c] = [A, B, C].map((m) => e.coins.get(m));
  assert.deepEqual(new Set(R.riskQueue(e, T0 + 601).map((x) => x.mint)), new Set([A, B, C]), "three live coins a decision is waiting on");
  const before = { ...R.rk }, order = R.riskQueue(e, T0 + 601).map((x) => x.mint);
  const answer = { [A]: null, [B]: { owner: R.TOKEN_2022, data: ["AAAA", "base64"] }, [C]: mintAcc() };
  assert.equal(await R.riskReadOnce(e, null, async (m, p) => ({ value: p[0].map((x) => answer[x]) }), T0 + 601), 3);
  assert.equal(R.feeKnown(c.info), true, "the good account in the batch is classified"); assert.equal(c.info.risk.read_at, T0 + 601);
  assert.equal(R.feeKnown(a.info), false); assert.equal(R.feeKnown(b.info), false); assert.equal(a.riskRead, false, "not marked as read"); assert.equal(R.rk.null_account - before.null_account, 1); assert.equal(R.rk.unparsed - before.unparsed, 1);
  assert.equal(R.riskQueue(e, T0 + 620).length, 0, "not hammered"); tx(e, 700, 1, ev(700, 100_000), ev(700, 100_000, { mint: B })); // the next decision asks again
  assert.deepEqual(new Set(R.riskQueue(e, T0 + 701).map((x) => x.mint)), new Set([A, B]), "asked for again after the back-off (was: never, on 3537ada)");
  // short answer: the coins beyond its end are retried, the ones inside it are classified
  const n0 = R.rk.short_response; await R.riskReadOnce(e, null, async (m, p) => ({ value: [mintAcc()] }), T0 + 701); const got = [a, b].filter((x) => R.feeKnown(x.info)); assert.equal(got.length, 1); assert.equal(R.rk.short_response - n0, 1);
  const left = [a, b].find((x) => !R.feeKnown(x.info)); assert.equal(left.riskFails, 2); assert.ok(left.riskRetryAt - (T0 + 701) === 120, "back-off doubles: 60 s, then 120 s"); assert.equal(R.riskQueue(e, T0 + 800).length, 0);
  tx(e, 900, 1, ev(900, 100_000, { mint: left.mint })); await R.riskReadOnce(e, null, async (m, p) => ({ value: p[0].map(() => mintAcc()) }), T0 + 901); assert.equal(R.feeKnown(left.info), true); assert.equal(left.riskFails, 0);
  // a whole-batch (transport) failure is told apart and bounded too
  const t = mk({}); lead(t); const n1 = R.rk.transport_fail_rounds; for (let i = 0, now = T0 + 601; i < 12; i++) { await R.riskReadOnce(t, null, async () => { throw new Error("rpc down"); }, now); now = t.coins.get(A).riskRetryAt + 1; }
  assert.equal(R.rk.transport_fail_rounds - n1, 12); assert.ok(t.coins.get(A).riskRetryAt - (t.coins.get(A).riskAt) <= 3600, "back-off never exceeds an hour");
});
test("a crossing that was blocked because the fee was not known is LOST: it is not back-dated and not taken late once the classification arrives", async () => {
  const e = mk({}); lead(e); const c = e.coins.get(A); assert.equal(ents(e).length, 0, "fee unknown at the crossing (+600): no entry"); assert.ok(c.feeWantedFirst <= T0 + 4, "asked for at the coin's FIRST evaluation, long before any crossing");
  assert.equal(await R.riskReadOnce(e, null, async (m, x) => ({ value: x[0].map(() => mintAcc()) }), T0 + 600.4), 1); assert.equal(R.feeKnown(c.info), true, "classified 0.4 s later");
  for (let t = 601; t < 660; t += 2) tx(e, t, 1, ev(t, 210_000)); e.tick(T0 + 660); assert.equal(ents(e).length, 0, "the price is still doubled, but that crossing happened before the classification: no buy");
  assert.ok(e.stats.feeUnknown >= 300 && e.stats.feeUnknownCoins === 1, "every blocked evaluation is counted (an upper bound on lost crossings: the rules are not run on an ineligible coin)"); assert.ok(R.rk.latency_n >= 1 && R.rk.latency_max_s >= 598);
  for (let t = 660; t < 1300; t += 2) tx(e, t, 1, ev(t, 210_000)); tx(e, 1300, 1, ev(1300, 445_000, { sol: 5 })); tx(e, 1301.2, 1, ev(1301.2, 445_000)); e.tick(T0 + 1301.3);
  assert.ok(filled(e).length > 0 && filled(e).every((x) => x.fill.t > T0 + 1300), "a NEW crossing after the classification is bought normally"); assert.ok(filled(e)[0].token.risk_age_s >= 699);
});
test("control: on an uninterrupted current stream a stop is still priced at its scheduled time on the state in force then", () => {
  const e = mk(); lead(e); fill(e); tx(e, 610, 1, ev(610, 150_000)); const v = row(e); assert.equal(v.status, "selling");
  tx(e, 612, 1, ev(612, 60_000)); // the next trade, 1.3 s after the scheduled sale, is far lower — it must not price the sale
  assert.equal(v.status, "closed"); assert.equal(v.exit.delay_s, 0); assert.ok(Math.abs(v.exit.pool.q - q(150_000)) < 1e-9, "scheduled-time pricing unchanged: the 150K state, in force at +610.7");
});
test("control: a quiet pool, driven chronologically — while other transactions keep the delay measured its unchanged state prices the 24-hour sale on time", () => {
  const e = mk(); lead(e); fill(e); const p = filled(e)[0], end = p.fill.t - T0 + S.MAX_HOLD_S; let n = 0;
  for (let t = 611; t <= end + 4; t += 4) { tx(e, t, 1.1); e.tick(T0 + t); n++; } // evidence and clock interleaved, in time order; pool A never trades again
  const rows = p.versions.filter((v) => v.reason === "max-hold"); assert.ok(n > 20_000 && rows.length > 0 && rows.every((v) => v.status === "closed" && v.exit.delay_s === 0 && v.exit.state_age_s > 80_000));
  if (e.streamStatus) { assert.equal(e.streamStatus().interruptions.silence, 0); assert.equal(e.streamStatus().interruptions.late, 0); }
});
test("a coin found fee-bearing after a live buy: the position stays, its fee-free result is reported apart and is in no primary total", async () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: { ...R.classifyMintAccount(mintAcc()), read_at: T0 + 600 } }); lead(e); fill(e); const p = filled(e)[0], c = e.coins.get(A); c.riskRead = true; c.riskAt = T0 + 600;
  await R.riskReadOnce(e, null, async (m, x) => ({ value: x[0].map(() => mintAcc([feeExt(300)])) }), T0 + 600 + S.RISK_REFRESH_S + 5, S.RISK_REFRESH_S); assert.ok(p.riskAfter && p.flags.some((f) => /found after the buy/.test(f)));
  for (let t = 1206; t < 1216; t += 2) tx(e, t, 1); tx(e, 1216, 1, ev(1216, 100_000)); tx(e, 1218, 1, ev(1218, 100_000)); const closed = p.versions.filter((v) => v.status === "closed"); assert.ok(closed.length > 0, "its stops still work and its sales are still recorded");
  const r = bookRows([p]).find((x) => x.family === p.families[0] && x.ag === p.ag && x.stop === 0.2 && x.policy === "trail");
  assert.equal(r.closed, 0); assert.equal(r.net_sol, 0); assert.equal(r.unsupported_fee_exits, 1); assert.ok(r.unsupported_fee_net_sol < 0, "the loss is shown, apart — not deleted, not zeroed, not inside net_sol");
  assert.equal(p.fill.risk_age_s, 1, "the age of the classification the fill relied on is recorded"); assert.equal(p.token.risk_age_s, 0);
});
test("a failed refresh of a coin we HOLD: what was known stays, the position stays, and the retry never waits longer than the refresh interval", async () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: { ...R.classifyMintAccount(mintAcc()), read_at: T0 + 600 } }); lead(e); fill(e); const p = filled(e)[0], c = e.coins.get(A); c.riskRead = true; c.riskAt = T0 + 600;
  let now = T0 + 600 + S.RISK_REFRESH_S + 1; for (let i = 0; i < 9; i++) { assert.equal(await R.riskReadOnce(e, null, async (m, x) => ({ value: x[0].map(() => null) }), now, S.RISK_REFRESH_S), 1, "it is asked for again");
    assert.ok(c.riskRetryAt - now <= S.RISK_REFRESH_S && c.riskRetryAt > now); now = c.riskRetryAt + 1; }
  assert.equal(R.feeKnown(c.info), true, "the earlier reading is kept"); assert.equal(c.info.risk.read_at, T0 + 600, "with its true age"); assert.equal(p.status, "filled"); assert.ok(!p.riskAfter);
  const st = R.riskStatus(e, now, S.RISK_REFRESH_S); assert.equal(st.queue, 1); assert.ok(st.null_account >= 9 && st.backoff_max_s >= 60 && Object.values(st.latency_hist).reduce((a, b) => a + b, 0) === st.latency_n);
});
test("diagnostics are bounded and sufficient: delay histogram, seconds in each state, interruption counts and lengths", () => {
  const e = mk(); for (let t = 0; t < 100; t += 2) tx(e, t, 1.2); tx(e, 100, 30); for (let t = 102; t < 120; t += 2) tx(e, t, 12); for (let t = 120; t <= 130; t += 1) tx(e, t, 1.4); tx(e, 150, 1); for (let t = 151; t <= 160; t += 1) tx(e, t, 1);
  const s = e.streamStatus(); assert.equal(s.state, "current"); assert.equal(s.interruptions.late, 1); assert.equal(s.interruptions.silence, 1); assert.ok(s.longest_s.late >= 25 && s.longest_s.silence >= 25);
  assert.equal(Object.values(s.lag_hist).reduce((a, b) => a + b, 0), s.measurements); assert.ok(s.lag_hist["<=30"] >= 10 && s.lag_hist["<=2"] > 50); assert.ok(s.seconds.current > 90 && s.seconds.late > 15 && s.seconds.recovering >= 4 && s.seconds.silence >= 15);
  for (let i = 0; i < 12_000; i++) { const t = 200 + i * 20; tx(e, t, 1); tx(e, t + 1, 1); tx(e, t + 2, 1); tx(e, t + 3, 1); tx(e, t + 4, 1); tx(e, t + 5, 1); } // 12,000 more silences
  assert.ok(e.stream.spans.length <= 4000 && e.streamStatus().recent.length <= 10 && e.stream.diag.recent.length <= 30, "interruption records are capped");
});
