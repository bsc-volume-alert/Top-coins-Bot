// NINTH REVIEW (Codex on the full export of 23 Nov 2026, code 834ca71 / 982ecde) — two execution defects, each reproduced here.
//   A. a LIVE coin whose token program or Token-2022 extensions were never read was bought as if it had no transfer fee;
//      the mint-account reader only ran for sampled coins and only when the sampled adapter was switched on; a pending
//      live buy was not checked again when the coin's restrictions changed.
//   B. a stream that stays connected but runs behind the chain priced orders and created signals as if it were current
//      (receipt time said "1 s old"; the underlying events were up to 112 s old on 23 Nov).
// A2, A5–A7 and B1–B5 fail on 982ecde and pass after the correction; A1, A3 and A4 hold behaviour that must not change.
import test from "node:test"; import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { readFileSync } from "node:fs";
import * as R from "../src/risk.mjs"; import * as S from "../src/spec.mjs";

const M = "MintAAApump", ents = (e) => [...e.entries.values()], filled = (e) => ents(e).filter((x) => x.status === "filled");
/** a live coin 9 hours old; `info` is what is known about its token (nothing is assumed: tokens: null) */
const mk = (info = {}, opts = {}) => { const e = mkEngine({ tokens: null, ...opts }); e.feedUp(T0); Object.assign(e.coin(M, { pool: "PoolA", createTs: T0 - 9 * H }).info, info); return e; };
/** ten flat minutes at $100K, then a jump to $210K: a fresh FAST crossing → buys scheduled 1 s later. Returns the jump time. */
const jump = (e, t0 = T0, o = {}) => { path(e, t0, t0 + 600, () => 100_000, o.lag != null ? 2 : 10, o); swap(e, t0 + 600, 210_000, { sol: 5, ...o }); return t0 + 600; }; // a test that feeds the stream's delay itself must keep it measured: every 2 s
const settle = (e, t, o = {}) => { swap(e, t + 1.2, 210_000, o); e.tick(t + 1.3); };
/** getAccountInfo / getMultipleAccounts value of a mint account (jsonParsed) */
const mint = (program, extensions = []) => ({ owner: program, data: { parsed: { info: { decimals: 6, supply: "1000000000000000", mintAuthority: null, freezeAuthority: null, extensions } } } });
const feeExt = (bps) => ({ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: bps }, olderTransferFee: { transferFeeBasisPoints: bps } } });

// ---------------------------------------------------------------- A. live Token-2022 eligibility
test("A1 a classic SPL token (known program, no transfer fee possible) is still bought on the live method", () => {
  const e = mk({ token_program: R.SPL_TOKEN }), t = jump(e); settle(e, t);
  assert.ok(filled(e).length > 0, "supported execution: the buy fills"); assert.equal(filled(e)[0].token.xfer_bps, 0);
});
test("A2 a live Token-2022 coin whose extensions were never read is NOT bought as fee-free; neither is a coin whose token program is unknown", () => {
  for (const info of [{ token_program: R.TOKEN_2022, risk: { status: "missing", why: "Token-2022 mint: extensions not yet read from the chain" } }, {}]) {
    const e = mk(info), t = jump(e); settle(e, t);
    assert.equal(ents(e).length, 0, "no buy is created while the fee is not known");
    assert.ok(e.stats.feeUnknown > 0, "counted"); assert.equal(R.feeKnown(e.coins.get(M).info), false);
  }
});
test("A3 a Token-2022 coin whose mint account was read and shows no fee and no restriction follows the supported path", () => {
  const k = R.classifyMintAccount(mint(R.TOKEN_2022, [{ extension: "metadataPointer", state: {} }])); assert.equal(k.status, "clean"); assert.equal(k.fee_bps, 0);
  const e = mk({ token_program: R.TOKEN_2022, risk: k }), t = jump(e); settle(e, t);
  assert.ok(filled(e).length > 0); assert.equal(filled(e)[0].token.token_program, R.TOKEN_2022); assert.equal(filled(e)[0].token.risk_status, "clean");
});
test("A4 a live coin known to charge a transfer fee is not bought (fee coins are supported on the sampled method only)", () => {
  const k = R.classifyMintAccount(mint(R.TOKEN_2022, [feeExt(300)])); assert.equal(k.fee_bps, 300); assert.notEqual(k.status, "restricted");
  const e = mk({ token_program: R.TOKEN_2022, risk: k }), t = jump(e); settle(e, t);
  assert.equal(ents(e).length, 0);
});
test("A5 a restriction that appears between the decision and the scheduled fill cancels the pending live buy", () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mint(R.TOKEN_2022)) }), t = jump(e);
  const pend = ents(e); assert.ok(pend.length > 0 && pend.every((x) => x.status === "pending"), "decided, not yet filled");
  const k = R.classifyMintAccount(mint(R.TOKEN_2022, [feeExt(800)])); assert.equal(k.status, "restricted"); e.coins.get(M).info.risk = k; // read again: now 8%
  settle(e, t);
  assert.equal(filled(e).length, 0, "never filled under the old zero-fee classification");
  assert.ok(pend.every((x) => x.status === "cancelled" && x.flags.some((f) => /cancelled before the buy/.test(f) && /restricted/.test(f))), "cancelled, with the reason on the record");
});
test("A6 the mint-account reader serves LIVE coins and does not depend on the sampled adapter", async () => {
  const e = mk({}), t = jump(e); settle(e, t); // unknown program: not bought, and now wanted
  const c = e.coins.get(M); assert.equal(ents(e).length, 0);
  assert.equal(R.nextRiskRead(e, t + 2), c, "the live coin a decision was waiting on is the next mint account to read — no poller exists in this test");
  const calls = [], rpc = async (method, params) => { calls.push([method, params[0]]); return { value: params[0].map(() => mint(R.TOKEN_2022)) }; };
  assert.ok(typeof R.riskReadOnce === "function", "one reader for both methods"); assert.equal(await R.riskReadOnce(e, null, rpc, t + 2), 1);
  assert.deepEqual(calls[0][1], [M]); assert.equal(c.info.token_program, R.TOKEN_2022); assert.equal(c.info.risk.status, "clean"); assert.equal(R.feeKnown(c.info), true);
  const t2 = jump(e, t + 3600); settle(e, t2); // a NEW fresh crossing after the read
  assert.ok(filled(e).length > 0, "once its fee is known the coin is evaluated and bought like any other");
  // the production loop that calls the reader is not inside the sampled-adapter switch
  const src = readFileSync(new URL("../src/main.mjs", import.meta.url), "utf8"), a = src.indexOf('if (process.env.OLDER_SOLANA_WIDE === "1") {'), b = src.indexOf("Solana-wide adapter ON");
  assert.ok(a > 0 && b > a && src.includes("riskReadOnce(engine") && !src.slice(a, b).includes("riskReadOnce"), "main.mjs starts the reader unconditionally");
  // a failed read is retried and leaves the coin unknown
  const e2 = mk({}), tb = jump(e2); await R.riskReadOnce(e2, null, async () => { throw new Error("rpc down"); }, tb + 2);
  assert.equal(R.feeKnown(e2.coins.get(M).info), false); assert.equal(R.nextRiskRead(e2, tb + 3), null, "not hammered"); assert.equal(R.nextRiskRead(e2, tb + 70), e2.coins.get(M), "tried again after a minute");
});
test("A7 a fee found on a coin already held on the live method is recorded on the position; the position and its exits stay", async () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mint(R.TOKEN_2022)) }), t = jump(e); settle(e, t);
  const pos = filled(e); assert.ok(pos.length > 0); const c = e.coins.get(M); c.riskRead = true; c.riskAt = t;
  await R.riskReadOnce(e, null, async (m, p) => ({ value: p[0].map(() => mint(R.TOKEN_2022, [feeExt(300)])) }), t + S.RISK_REFRESH_S + 5, S.RISK_REFRESH_S);
  assert.equal(c.info.risk.fee_bps, 300);
  assert.ok(pos.every((x) => x.status === "filled" && x.flags.some((f) => /found after the buy/.test(f))), "still held, now flagged");
  assert.ok(pos.every((x) => x.versions.every((v) => v.status === "open" || v.exit)), "no row was deleted or closed at an invented value");
});

// ---------------------------------------------------------------- B. a connected stream that runs behind the chain
const S5 = () => S.FEED_MAX_LAG_S;
test("B1 a stream running 60 s behind creates no signal and fills no buy, although every state is 1 s old by receive time", () => {
  const e = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }); path(e, T0, T0 + 600, () => 100_000, 2, { lag: 1 }); // current
  swap(e, T0 + 600, 210_000, { sol: 5, lag: 60 }); swap(e, T0 + 601.2, 210_000, { lag: 60 }); e.tick(T0 + 601.3); // the doubling arrives 60 s late
  for (let t = T0 + 602; t < T0 + 620; t += 2) { swap(e, t, 215_000, { lag: 60 }); e.tick(t + 0.5); }
  assert.equal(filled(e).length, 0, "nothing is priced from a backlogged state"); assert.equal(ents(e).length, 0, "and no signal is created from it");
  assert.ok(e.stats.lateEvents > 0, "counted"); assert.equal(e.freshAt(T0 + 610), false);
});
test("B2 after the stream is current again, catch-up observations cannot manufacture a fresh crossing; a clean window fires normally", () => {
  const e = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }); path(e, T0, T0 + 600, () => 100_000, 2, { lag: 1 });
  for (let t = T0 + 600; t < T0 + 640; t += 2) swap(e, t, t < T0 + 620 ? 100_000 : 210_000, { lag: 60 }); // the move happens while the stream is late
  for (let t = T0 + 640; t < T0 + 652; t += 1) swap(e, t, 210_000, { lag: 1 }); // current again (and stays so for FEED_MAX_LAG_S)
  assert.equal(e.freshAt(T0 + 651), true, "freshness re-established by measurements, not by a lifetime average");
  swap(e, T0 + 653, 212_000, { lag: 1 }); e.tick(T0 + 655);
  assert.equal(ents(e).length, 0, "the 100K → 210K move was only seen through late observations: no FAST / FAST150 buy");
  path(e, T0 + 656, T0 + 1300, () => 210_000, 2, { lag: 1 }); swap(e, T0 + 1300, 445_000, { sol: 5, lag: 1 }); swap(e, T0 + 1301.2, 445_000, { lag: 1 }); e.tick(T0 + 1301.3);
  assert.ok(filled(e).length > 0, "a doubling observed on a current stream in a clean window is bought as before");
});
test("B3 orders pending when the stream falls behind: the buy is cancelled by the pricing timeout, a triggered sale waits and is priced with its real delay", () => {
  // (a) pending buy
  const a = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }); path(a, T0, T0 + 600, () => 100_000, 2, { lag: 1 }); swap(a, T0 + 600, 210_000, { sol: 5, lag: 1 });
  const pend = ents(a); assert.ok(pend.length > 0 && pend.every((x) => x.status === "pending"));
  for (let t = T0 + 600.5; t < T0 + 612; t += 1) { swap(a, t, 212_000, { lag: 60 }); a.tick(t + 0.2); }
  assert.ok(pend.every((x) => x.status === "cancelled" && x.flags.some((f) => /pricing\/data timeout/.test(f))), "not filled from a late state: the existing 5 s data timeout applies");
  // (b) pending sale
  const b = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }), t = jump(b, T0, { lag: 1 }); settle(b, t, { lag: 1 }); const pos = filled(b); assert.ok(pos.length > 0);
  for (let x = t + 3; x < t + 10; x += 2) b.noteLag(x, 1); // other pools keep the stream measured
  swap(b, t + 10, 150_000, { lag: 1 }); // −29%: the 20% and 25% trailing rows trigger, sale scheduled 0.7 s later
  const sell = pos[0].versions.filter((v) => v.status === "selling"); assert.ok(sell.length > 0);
  for (let x = t + 10.3; x < t + 40; x += 1) { swap(b, x, 120_000, { lag: 60 }); b.tick(x + 0.2); } // the stream is now 60 s behind
  assert.ok(sell.every((v) => v.status === "selling"), "the sale is NOT priced from backlogged states — it stays pending, visible");
  for (let x = t + 40; x < t + 40 + S5() + 2; x += 1) swap(b, x, 120_000, { lag: 1 }); b.tick(t + 50);
  assert.ok(sell.every((v) => v.status === "closed" && v.exit.delay_s > 20), "priced by the first current state, with the delay it really had");
  assert.ok(sell.every((v) => v.exit.sol < 0.2005 * 0.7), "at the price then in force (120K), not at the trigger's");
});
test("B4 a QUIET pool is still trusted while the stream as a whole is current; a silent stream is not proof of anything", () => {
  const e = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }), t = jump(e, T0, { lag: 1 }); settle(e, t, { lag: 1 }); const pos = filled(e); assert.ok(pos.length > 0);
  const end = pos[0].fill.t + S.MAX_HOLD_S; // nothing trades on this pool for 24 h; other pools keep the stream's delay measured
  for (let x = t + 4; x < end - 30; x += 4) e.noteLag(x, 1.1);
  e.tick(end - 30); const open = pos[0].versions.filter((v) => v.status === "open"); assert.ok(open.length > 0);
  // the stream goes silent for the last 30 s before the 24-hour limit and stays silent: freshness is unknown
  e.tick(end + 1); assert.equal(e.freshAt(end), false);
  assert.ok(open.every((v) => v.status === "selling"), "the 24-hour sale is due but not priced on an unverified stream");
  // same position, stream measured current across the limit: the old, unchanged state prices the sale at the scheduled time
  const f = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }), tf = jump(f, T0, { lag: 1 }); settle(f, tf, { lag: 1 }); const pf = filled(f), endF = pf[0].fill.t + S.MAX_HOLD_S;
  for (let x = tf + 4; x < endF + 6; x += 4) f.noteLag(x, 1.1);
  f.tick(endF + 5);
  const rows = pf[0].versions.filter((v) => v.reason === "max-hold"); assert.ok(rows.length > 0 && rows.every((v) => v.status === "closed"));
  assert.ok(rows.every((v) => v.exit.delay_s === 0 && v.exit.state_age_s > 80_000), "an old unchanged pool state is valid when the feed is current");
});
test("B5 freshness that has not been established is not assumed: after a (re)connect nothing is evaluated until the delay is measured", () => {
  const e = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }); assert.equal(e.freshAt(T0 + 1), false);
  path(e, T0, T0 + 600, () => 100_000, 2); swap(e, T0 + 600, 210_000, { sol: 5 }); swap(e, T0 + 601.2, 210_000); e.tick(T0 + 601.3); // no delay measurement at all
  assert.equal(ents(e).length, 0); assert.ok(e.stats.lateEvents > 0);
  // a reconnect resets the evidence
  const g = mk({ token_program: R.SPL_TOKEN }, { stream: "manual" }); path(g, T0, T0 + 100, () => 100_000, 2, { lag: 1 }); assert.equal(g.freshAt(T0 + 99), true);
  g.feedDown(T0 + 100, "close"); g.feedUp(T0 + 102); assert.equal(g.freshAt(T0 + 102.5), false, "unknown again until the first measurement on the new connection");
  swap(g, T0 + 103, 100_000, { lag: 1 }); assert.equal(g.freshAt(T0 + 103), true);
});
