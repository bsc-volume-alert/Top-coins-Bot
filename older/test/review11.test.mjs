// ELEVENTH REVIEW (Codex on older-10 @ 161d545). Production Engine used directly, driven chronologically; no helpers.mjs.
//   C1 recovery valued positions without first running their time-based deadlines → a timed sale could stay pending
//   C2 a silence in progress was reported as "current"; seconds counters stopped at the last measurement
//   C3 re-buys of coins later found fee-bearing stayed inside the re-buy totals
//   C4 a malformed mint answer threw out of the reader and stranded the whole batch
//   C5 late / silence gaps (and, since older-10, the tail of a reconnect gap) never reached the gap repair
import test from "node:test"; import assert from "node:assert/strict";
import { Engine } from "../src/engine.mjs"; import * as R from "../src/risk.mjs"; import * as S from "../src/spec.mjs";
import { bookRows } from "../src/report.mjs"; import * as BF from "../src/backfill.mjs";
const gapRequests = BF.gapRequests; // did not exist at 161d545 (the scheduler read engine.feedCov.gaps inline in main.mjs)

const T0 = 1_800_000_000, H = 3600, BASE = 2e8, q = (mc) => (mc / 1e11) * BASE, A = "MintAAApump", B = "MintBBBpump", LIM = S.FEED_MAX_LAG_S;
const mk = (info = { token_program: R.SPL_TOKEN }, mints = [A]) => { const e = new Engine({ solUsd: () => 100 }); e.feedUp(T0); for (const m of mints) Object.assign(e.coin(m, { pool: "Pool" + m[4], createTs: T0 - 9 * H }).info, info); return e; };
const ev = (t, mc, { mint = A, sol = 1 } = {}) => ({ t: T0 + t, mint, pool: "Pool" + mint[4], base: BASE, quote: q(mc), feeBps: 30, sol, isBuy: true, user: "u" });
const tx = (e, t, lag, ...evs) => (e.tx ? e.tx(T0 + t, lag, () => { for (const x of evs) e.onSwap(x); }) : (e.noteLag(T0 + t, lag), evs.forEach((x) => e.onSwap(x))));
const ents = (e) => [...e.entries.values()], filled = (e) => ents(e).filter((x) => x.status === "filled");
const lead = (e, mints = [A]) => { for (let t = 0; t < 600; t += 2) tx(e, t, 1, ...mints.map((m) => ev(t, 100_000, { mint: m }))); tx(e, 600, 1, ...mints.map((m) => ev(600, 210_000, { mint: m, sol: 5 }))); };
const fill = (e, mints = [A]) => { tx(e, 601.2, 1, ...mints.map((m) => ev(601.2, 210_000, { mint: m }))); e.tick(T0 + 601.3); for (let t = 603; t < 610; t += 2) tx(e, t, 1, ...mints.map((m) => ev(t, 210_000, { mint: m }))); };
const mintAcc = (ext = []) => ({ owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1000000000000000", mintAuthority: null, freezeAuthority: null, extensions: ext } } } });
const feeExt = (bps) => ({ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: bps }, olderTransferFee: { transferFeeBasisPoints: bps } } });
/** a filled position on a pool that never trades again, with the stream kept measured and the clock running until `until` seconds before its 24-hour deadline E */
const quietToDeadline = (until) => { const e = mk(); lead(e); fill(e); const p = filled(e)[0], E = p.fill.t - T0 + S.MAX_HOLD_S; for (let t = 611; t < E - until; t += 2) { tx(e, t, 1.1); e.tick(T0 + t); } return { e, p, E }; };

test("C1 (Codex's reproduction) a 24-hour deadline that passes inside a late spell while the clock is held up: sold at recovery, not left pending", () => {
  const { e, p, E } = quietToDeadline(4); const rows = () => p.versions.filter((v) => v.policy === "trail");
  tx(e, E - 2, 60);                     // the late spell starts 2 s before the deadline
  e.tick(T0 + E - 1.5);                 // the last clock tick before the deadline
  for (const t of [E - 1, E, E + 1, E + 2, E + 3]) tx(e, t, 1); // good measurements; NO clock ticks: a brief processing stall
  assert.ok(rows().every((v) => v.status === "open"), "nothing has run the deadline yet"); assert.equal(e.freshAt(T0 + E + 3), false);
  tx(e, E + 4, 1);                      // recovery completes (5 s of good evidence since E−1)
  assert.equal(e.freshAt(T0 + E + 4), true);
  assert.ok(rows().every((v) => v.status === "closed" && v.reason === "max-hold"), "the deadline was run at recovery and the sale priced there (was: still open, then pending for good)");
  for (const v of rows()) { assert.ok(Math.abs(v.exit.t - (T0 + E + 4)) < 1e-6, "priced at the recovery"); assert.ok(Math.abs(v.exit.delay_s - 3.3) < 1e-6, "with the delay it really had: scheduled E+0.7, priced E+4"); assert.ok(Math.abs(v.trigT - (T0 + E)) < 1e-6, "triggered at the deadline itself"); assert.ok(Math.abs(v.exit.pool.q - q(210_000)) < 1e-9, "on the unchanged pool state in force"); }
  e.tick(T0 + E + 4.1); for (let t = E + 5; t <= E + 30; t += 1) { tx(e, t, 1); e.tick(T0 + t + 0.05); }
  assert.ok(rows().every((v) => v.status === "closed" && Math.abs(v.exit.delay_s - 3.3) < 1e-6), "and nothing changes afterwards");
});
test("C1 control: the same deadline with the clock running through the late spell closes at the same moment with the same delay", () => {
  const { e, p, E } = quietToDeadline(4); const step = (t, lag) => { tx(e, t, lag); e.tick(T0 + t + 0.05); };
  step(E - 2, 60); for (const t of [E - 1, E, E + 1, E + 2, E + 3, E + 4]) step(t, 1);
  for (const v of p.versions.filter((x) => x.policy === "trail")) { assert.equal(v.status, "closed"); assert.equal(v.reason, "max-hold"); assert.ok(Math.abs(v.exit.t - (T0 + E + 4)) < 1e-6 && Math.abs(v.exit.delay_s - 3.3) < 1e-6); }
});
test("C1 a deadline that comes AFTER the recovery is untouched by it: triggered and priced on time by the clock, as always", () => {
  const { e, p, E } = quietToDeadline(12); const rows = () => p.versions.filter((v) => v.policy === "trail");
  tx(e, E - 9, 60); e.tick(T0 + E - 8.5); for (let t = E - 8; t <= E - 4; t += 1) tx(e, t, 1); tx(e, E - 3, 1); // good evidence E−8 … E−3: recovery at E−3, before the deadline
  assert.equal(e.freshAt(T0 + E - 3), true); assert.ok(rows().every((v) => v.status === "open"), "the deadline has not come yet");
  for (let t = E - 2; t <= E + 3; t += 1) { tx(e, t, 1); e.tick(T0 + t + 0.05); }
  for (const v of rows()) { assert.equal(v.status, "closed"); assert.equal(v.exit.delay_s, 0, "ordinary scheduled-time pricing"); assert.ok(Math.abs(v.exit.t - (T0 + E + 0.7)) < 1e-6); }
});
test("C1 the eligibility gate still comes first at recovery: a pending buy on a coin that turned restricted is cancelled before any clock transition", () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mintAcc()) }); lead(e); const p = ents(e);
  tx(e, 600.1, 60); for (const t of [600.6, 601.6, 602.6, 603.6, 604.6]) tx(e, t, 1); e.coins.get(A).info.risk = R.classifyMintAccount(mintAcc([feeExt(800)])); tx(e, 605.601, 1, ev(605.601, 100_000, { mint: B }));
  assert.equal(filled(e).length, 0); assert.ok(p.every((x) => x.status === "cancelled" && x.flags.some((f) => /cancelled before the buy/.test(f))));
});
test("C2 a silence is reported while it is happening: state, signal coverage and the seconds counters are as of NOW", () => {
  const e = mk(); for (let t = 0; t <= 600; t += 2) tx(e, t, 1, ev(t, 100_000));
  let s = e.streamStatus(T0 + 630); assert.equal(e.freshAt(T0 + 630), false); assert.equal(s.state, "silence", "30 s without a transaction is not current — even before the clock has run (was: \"current\")");
  s = e.streamStatus(T0 + 603); assert.equal(s.state, "current"); assert.equal(s.since_last_measurement_s, 3); assert.ok(Math.abs(s.seconds.current - 603) < 1e-6, "the 3 s since the last measurement are counted"); s = e.streamStatus(T0 + 630);
  assert.ok(Math.abs(s.seconds.silence - 30) < 1e-6 && Math.abs(s.seconds.current - 600) < 1e-6 && Math.abs(s.seconds_total - 630) < 1e-6, "every wall-clock second is in exactly one state"); assert.equal(s.interrupted_since, T0 + 600);
  assert.equal(e.stream.diag.spells.silence, 0, "reading the status changes nothing in the engine");
  e.tick(T0 + 630); // the clock notices it: now it is an interruption with a signal-coverage gap in progress
  s = e.streamStatus(T0 + 630); assert.equal(s.state, "silence"); assert.equal(s.interruptions.silence, 1); assert.equal(e.cov.down, true); assert.deepEqual(e.cov.gapsIn(T0 + 590, T0 + 630).map((g) => g[0]), [T0 + 600], "the gap starts at the last evidence");
  e.tick(T0 + 640); assert.equal(e.streamStatus(T0 + 640).interruptions.silence, 1, "one silence, counted once however often the clock runs");
  tx(e, 650, 1, ev(650, 100_000)); assert.equal(e.streamStatus(T0 + 650).state, "recovering"); assert.equal(e.streamStatus(T0 + 650).interruptions.silence, 1, "and not counted again when the next transaction arrives");
  for (let t = 651; t <= 655; t += 1) tx(e, t, 1, ev(t, 100_000)); s = e.streamStatus(T0 + 655); assert.equal(s.state, "current"); assert.equal(e.cov.down, false);
  assert.ok(Math.abs(s.seconds.silence - 50) < 1e-6 && Math.abs(s.seconds.recovering - 5) < 1e-6 && Math.abs(s.seconds.current - 600) < 1e-6 && Math.abs(s.seconds_total - 655) < 1e-6);
  assert.equal(e.cov.gapsIn(T0 + 590, T0 + 660).length, 1); assert.ok(s.longest_s.silence >= 55 - 1e-6);
  const old = e.streamStatus(); assert.equal(old.as_of, T0 + 655, "without a time the figures stop at the last measurement, and say so");
});
test("C2 the unknown time before a connection's first measurement is counted, and a clock-noticed silence prices nothing", () => {
  const e = new Engine({ solUsd: () => 100 }); e.feedUp(T0); let s = e.streamStatus(T0 + 3); assert.equal(s.state, "unknown (delay not measured on this connection)"); assert.ok(Math.abs(s.seconds.unknown - 3) < 1e-6);
  const { e: g, p, E } = quietToDeadline(40); g.tick(T0 + E - 20); assert.equal(g.streamStatus(T0 + E - 20).state, "silence"); g.tick(T0 + E + 5);
  const v = p.versions.find((x) => x.policy === "trail"); assert.equal(v.status, "selling", "the deadline is triggered but nothing is priced during a silence"); assert.equal(v.reason, "max-hold");
  for (let t = E + 6; t <= E + 11; t += 1) tx(g, t, 1); assert.equal(v.status, "closed"); assert.ok(Math.abs(v.exit.delay_s - 10.3) < 1e-6, "priced at the end of the good-evidence period, with its real delay");
});
test("C3 a RE-BUY of a coin later found fee-bearing is counted apart from the re-buy totals, exactly like a first buy; no row is lost", async () => {
  const e = mk({ token_program: R.TOKEN_2022, risk: { ...R.classifyMintAccount(mintAcc()), read_at: T0 + 600 } }); lead(e); fill(e); const p = filled(e)[0], c = e.coins.get(A); c.riskRead = true; c.riskAt = T0 + 600;
  await R.riskReadOnce(e, null, async (m, x) => ({ value: x[0].map(() => mintAcc([feeExt(300)])) }), T0 + 600 + S.RISK_REFRESH_S + 5, S.RISK_REFRESH_S); assert.ok(p.riskAfter);
  for (let t = 1206; t < 1216; t += 2) tx(e, t, 1); tx(e, 1216, 1, ev(1216, 100_000)); tx(e, 1218, 1, ev(1218, 100_000)); const fam = p.families[0];
  const pick = (rows) => rows.find((x) => x.family === fam && x.ag === p.ag && x.stop === 0.2 && x.policy === "trail");
  const first = pick(bookRows([p])); assert.equal(first.unsupported_fee_exits, 1); assert.equal(first.closed, 0); assert.equal(first.rebuys_closed, 0);
  const again = pick(bookRows([{ ...p, again: Object.fromEntries(p.families.map((f) => [f, true])) }])); // the same ledger rows, as a re-buy
  assert.equal(again.rebuys_closed, 0, "not inside the ordinary re-buy count (was: 1)"); assert.equal(again.rebuys_net_sol, 0, "nor its P&L"); assert.equal(again.unsupported_fee_rebuys, 1); assert.ok(again.unsupported_fee_rebuys_net_sol < 0, "the modelled result is shown, apart"); assert.equal(first.unsupported_fee_rebuys, 0);
  assert.equal(again.unsupported_fee_exits, 0); assert.equal(again.closed, 0); assert.equal(again.entries, 0, "a re-buy is still not a first buy");
  const clean = pick(bookRows([{ ...p, riskAfter: undefined, again: Object.fromEntries(p.families.map((f) => [f, true])) }])); assert.equal(clean.rebuys_closed, 1); assert.equal(clean.unsupported_fee_rebuys, 0, "control: an ordinary re-buy is counted as before");
});
test("C4 a malformed mint answer fails that ONE coin (and fails closed); the rest of the batch is classified and the bad one is retried", async () => {
  const C = "MintCCCpump", e = mk({}, [A, B]); e.coin(C, { pool: "PoolC", createTs: T0 - 9 * H }); lead(e, [A, B, C]); const order = R.riskQueue(e, T0 + 601).map((x) => x.mint), n0 = { ...R.rk };
  const bad = [{ owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1", extensions: "oops" } } } }, { owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1", extensions: [null] } } } },
    { owner: R.TOKEN_2022, data: { parsed: { info: { decimals: "6", supply: "1", extensions: [] } } } }, { owner: 7, data: { parsed: { info: { decimals: 6, supply: "1", extensions: [] } } } }, { owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "x", extensions: [] } } } }];
  for (const b of bad) { const k = R.classifyMintAccount(b); assert.equal(k.status, "missing", "never read as \"no extensions\""); assert.equal(k.malformed, true); }
  assert.equal(await R.riskReadOnce(e, null, async (m, p) => ({ value: p[0].map((x, i) => (i === 0 ? bad[0] : mintAcc())) }), T0 + 601), 3, "does not throw (was: TypeError, whole batch stranded)");
  const [x, y, z] = order.map((m) => e.coins.get(m)); assert.equal(R.feeKnown(x.info), false); assert.equal(x.riskRead, false); assert.equal(x.riskFailWhy, "malformed"); assert.equal(R.rk.malformed - n0.malformed, 1);
  assert.equal(R.feeKnown(y.info), true); assert.equal(R.feeKnown(z.info), true, "the two good accounts in the same batch are classified");
  assert.deepEqual(R.riskQueue(e, T0 + 601 + 61).map((c) => c.mint), [x.mint], "and the bad one is asked for again after its back-off");
  // an exception while saving one coin does not strand the others either
  const f = mk({}, [A, B]); lead(f, [A, B]); let calls = 0; const store = new Proxy({}, { get: (_, k) => (k === "saveCoin" ? () => { if (++calls === 1) throw new Error("disk"); } : () => undefined) });
  assert.equal(await R.riskReadOnce(f, store, async (m, p) => ({ value: p[0].map(() => mintAcc()) }), T0 + 601), 2); const cs = [A, B].map((m) => f.coins.get(m)); assert.equal(cs.filter((c) => c.riskRead).length, 1); assert.equal(cs.filter((c) => !c.riskRead && c.riskRetryAt > T0 + 601).length, 1, "the one whose save failed is retried");
});
test("C5 the gap repair is asked for SIGNAL-coverage gaps — reconnect, late spell and silence — merged per minute, with no duplicates", () => {
  assert.equal(typeof gapRequests, "function", "the scheduler's choice of gaps is a tested function");
  const e = mk(); for (let t = 0; t <= 600; t += 2) tx(e, t, 1, ev(t, 100_000)); let seen = e.cov.gaps.length; assert.equal(gapRequests(e.cov.gaps, seen).requests.length, 0);
  tx(e, 602, 60); for (let t = 604; t <= 609; t += 1) tx(e, t, 1, ev(t, 100_000));                        // a late spell: 602 → 609
  for (let t = 610; t <= 700; t += 2) tx(e, t, 1, ev(t, 100_000)); e.tick(T0 + 720); for (let t = 721; t <= 726; t += 1) tx(e, t, 1, ev(t, 100_000)); // a silence: 700 → 726
  for (let t = 728; t <= 900; t += 2) tx(e, t, 1, ev(t, 100_000)); e.feedDown(T0 + 901, "close"); e.feedUp(T0 + 903); tx(e, 903.4, 1, ev(903.4, 100_000)); // a reconnect: 901 → 903.4
  assert.equal(e.feedCov.gaps.length, 1, "the pool-trust list only ever saw the reconnect (this is the list the scheduler used to watch)"); assert.equal(e.cov.gaps.length, 3);
  assert.ok(e.cov.gaps[2][1] > e.feedCov.gaps[0][1], "and the reconnect's signal gap ends later than its pool-trust gap: at the first delay measurement");
  const r = gapRequests(e.cov.gaps, seen); assert.equal(r.seen, 3); assert.equal(r.requests.length, 2, "the late spell (ends 609) and the silence (starts 700) touch the same minute boundary: one request");
  assert.ok(Math.abs(r.requests[0][0] - (T0 + 602)) < 1e-3 && r.requests[0][1] === T0 + 726 && r.requests[1][0] === T0 + 901 && r.requests[1][1] === e.cov.gaps[2][1]);
  assert.equal(gapRequests(e.cov.gaps, r.seen).requests.length, 0, "nothing is asked for twice");
  // gaps whose minute ranges touch are ONE request covering all of them
  const m = gapRequests([[T0 + 5, T0 + 12], [T0 + 30, T0 + 41], [T0 + 70, T0 + 75], [T0 + 400, T0 + 410]], 0).requests; assert.deepEqual(m, [[T0 + 5, T0 + 75], [T0 + 400, T0 + 410]]);
  // the repair has to be recorded for the SIGNAL gap: one recorded for the shorter pool-trust interval does not cover it
  const sr = e.coins.get(A).series, M = (T0 + 900) / 60, bars = [M - 2, M - 1, M, M + 1, M + 2].map((k) => ({ m: k, o: 1e-4, h: 1e-4, l: 1e-4, c: 1e-4, v: 10 }));
  for (let t = 905; t <= 960; t += 2) tx(e, t, 1, ev(t, 100_000)); const win = [T0 + 880, T0 + 950];
  assert.equal(sr.covered(...win), false); sr.addBars(bars, { from: e.feedCov.gaps[0][0], to: e.feedCov.gaps[0][1], patchGap: true }); assert.equal(sr.covered(...win), false, "the old request (pool-trust interval) leaves the window unproven");
  const [a, b] = r.requests[1]; assert.equal(sr.addBars(bars, { from: a, to: b, patchGap: true }).accepted, true); assert.equal(sr.covered(...win), true, "the new one repairs it for hour-scale use");
  assert.equal(sr.continuous(...win), false, "and never for exact windows: minute bars cannot prove a fresh crossing");
  assert.equal(e.feedCov.gaps.length, 1, "pool-state trust is untouched by any of this");
});
