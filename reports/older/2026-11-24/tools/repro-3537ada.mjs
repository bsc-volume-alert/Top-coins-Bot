// Reproduction of Codex's five findings on older-10 @ 3537ada, with the production Engine used directly (no test fixtures).
// Events are driven in the order feed.mjs used at 3537ada: engine.noteLag(t, lag) first, then engine.onEvent for each pool.
//   node reports/older/2026-11-24/tools/repro-3537ada.mjs      (run from the repository root, on commit 3537ada)
import { Engine } from "../../../../older/src/engine.mjs"; import * as R from "../../../../older/src/risk.mjs";
const T0 = 1_800_000_000, H = 3600, BASE = 2e8, q = (mc) => (mc / 1e11) * BASE, M = "MintAAApump";
const mk = (info = { token_program: R.SPL_TOKEN }) => { const e = new Engine({ solUsd: () => 100 }); e.feedUp(T0); Object.assign(e.coin(M, { pool: "PoolA", createTs: T0 - 9 * H }).info, info); return e; };
const sw = (e, t, mc, sol = 1) => e.onSwap({ t: T0 + t, mint: M, pool: "PoolA", base: BASE, quote: q(mc), feeBps: 30, sol, isBuy: true, user: "u" });
const tx = (e, t, lag, mc = null, sol = 1) => { e.noteLag(T0 + t, lag); if (mc != null) sw(e, t, mc, sol); };
const filled = (e) => [...e.entries.values()].filter((x) => x.status === "filled");
const mint = (ext = []) => ({ owner: R.TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1000000000000000", extensions: ext } } } });
const fee = (bps) => ({ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: bps }, olderTransferFee: { transferFeeBasisPoints: bps } } });
{ // B1
  const e = mk(); for (let t = 0; t < 600; t += 2) tx(e, t, 1, 100_000); tx(e, 600, 1, 210_000, 5); tx(e, 601.2, 1, 210_000); e.tick(T0 + 601.3);
  for (let t = 603; t < 610; t += 2) tx(e, t, 1, 210_000); tx(e, 610, 1, 150_000); tx(e, 610.2, 60); for (let t = 612; t < 629; t += 2) tx(e, t, 60, 120_000);
  for (const t of [630.001, 631.001, 632.001, 633.001, 634.001]) tx(e, t, 1); tx(e, 635.001, 1, 40_000);
  const v = filled(e)[0].versions.find((x) => x.stop === 0.2 && x.policy === "trail"); console.log("B1 sale after recovery:", v.status, "proceeds", v.exit?.sol, "priced on quote reserve", v.exit?.pool?.q, "| the recovering transaction's reserve is", q(40_000)); }
{ // B2
  const e = mk({ token_program: R.TOKEN_2022, risk: R.classifyMintAccount(mint()) }); for (let t = 0; t < 600; t += 2) tx(e, t, 1, 100_000); tx(e, 600, 1, 210_000, 5);
  tx(e, 600.1, 60); for (const t of [600.6, 601.6, 602.6, 603.6, 604.6]) tx(e, t, 1); e.coins.get(M).info.risk = R.classifyMintAccount(mint([fee(800)])); tx(e, 605.101, 1);
  const f = filled(e); console.log("B2 pending buy at recovery with the coin now", e.coins.get(M).info.risk.status + ":", f.length ? "FILLED, recorded fee bps " + f[0].token.xfer_bps : [...e.entries.values()].map((x) => x.status).join(",") || "no entry"); }
{ // B3
  const e = mk(); for (let t = 0; t <= 600; t += 2) tx(e, t, 1, 100_000); console.log("B3 freshAt(+610):", e.freshAt(T0 + 610)); tx(e, 622, 1, 210_000, 5);
  const c = e.coins.get(M); console.log("B3 after 22 s of global silence: entries", [...e.entries.values()].map((x) => x.families.join("+")).join(" | ") || "none", "| signal-coverage gaps", JSON.stringify(e.cov.gapsIn(T0 + 590, T0 + 622)), "| exact continuity 560→622:", c.series.continuous(T0 + 560, T0 + 622)); }
{ // B4
  const e = mk(); for (let t = -20; t < 0; t += 2) tx(e, t, 1); tx(e, 0, 60); tx(e, 30, 1); console.log("B4 one good measurement 30 s after a late one: late =", e.stream.late, "freshAt(+30):", e.freshAt(T0 + 30)); }
{ // B5
  const e = mk({}); for (let t = 0; t < 600; t += 2) tx(e, t, 1, 100_000); tx(e, 600, 1, 210_000, 5); const c = e.coins.get(M);
  console.log("B5 queued before the read:", R.nextRiskRead(e, T0 + 601) === c); await R.riskReadOnce(e, null, async () => ({ value: [null] }), T0 + 601);
  tx(e, 700, 1, 100_000); tx(e, 1000, 1, 100_000); console.log("B5 after {value:[null]} and 399 s: fee known", R.feeKnown(c.info), "| riskRead", c.riskRead, "| queued again:", R.nextRiskRead(e, T0 + 1000) === c); }
