// Missed deadline during recovery (Codex's review of 161d545): a quiet pool, a 24-hour deadline D inside a late spell.
// A = the clock runs through the spell (control); B = no clock tick from D-3 to D+4 (a brief processing stall).
// Usage: node c1-missed-deadline.mjs <path to older/>      (run it on 161d545 and on the corrected commit)
// The regression test test/review11.test.mjs uses Codex's exact timings (late at E-2, tick at E-1.5, good at E-1 … E+4).
import path from "node:path"; import { pathToFileURL } from "node:url";
const root = pathToFileURL(path.resolve(process.argv[2] || "older")).href;
const { Engine } = await import(root + "/src/engine.mjs"); const R = await import(root + "/src/risk.mjs"); const S = await import(root + "/src/spec.mjs");
const T0 = 1_800_000_000, H = 3600, BASE = 2e8, q = (mc) => (mc / 1e11) * BASE, A = "MintAAApump";
const run = (missTicks) => { const e = new Engine({ solUsd: () => 100 }); e.feedUp(T0); Object.assign(e.coin(A, { pool: "PoolA", createTs: T0 - 9 * H }).info, { token_program: R.SPL_TOKEN });
  const ev = (t, mc, sol = 1) => ({ t: T0 + t, mint: A, pool: "PoolA", base: BASE, quote: q(mc), feeBps: 30, sol, isBuy: true, user: "u" }); const tx = (t, lag, ...evs) => e.tx(T0 + t, lag, () => { for (const x of evs) e.onSwap(x); });
  for (let t = 0; t < 600; t += 2) tx(t, 1, ev(t, 100_000)); tx(600, 1, ev(600, 210_000, 5)); tx(601.2, 1, ev(601.2, 210_000)); e.tick(T0 + 601.3); for (let t = 603; t < 610; t += 2) tx(t, 1, ev(t, 210_000));
  const p = [...e.entries.values()].find((x) => x.status === "filled"), D = p.fill.t - T0 + S.MAX_HOLD_S; // the 24-hour deadline; the pool never trades again
  for (let t = 611; t < D - 4; t += 2) { tx(t, 1.1); e.tick(T0 + t); }
  const step = (t, lag, tick) => { tx(t, lag); if (tick) e.tick(T0 + t + 0.05); };
  step(D - 3, 60, !missTicks); step(D - 2, 60, !missTicks); for (let t = D - 1; t <= D + 4.001; t += 1) step(t, 1, !missTicks); // late from D-3; good evidence from D-1; current again at D+4
  const at = (label) => { const rows = p.versions.filter((v) => v.policy === "trail"); return `${label}: stream ${e.streamStatus().state}; rows ${[...new Set(rows.map((v) => v.status + (v.reason ? "/" + v.reason : "")))].join(",")}`; };
  const out = [at("at recovery (D+4)")]; e.tick(T0 + D + 4.2); out.push(at("after the next tick (D+4.2)"));
  for (let t = D + 5; t <= D + 34; t += 1) { tx(t, 1); e.tick(T0 + t + 0.05); } out.push(at("30 s later (D+34)") + `; trusted now: ${e.trustedAt(e.coins.get(A), T0 + D + 34)}`);
  const v = p.versions.find((x) => x.policy === "trail"); out.push(`exit: ${v.exit ? `t = D${(v.exit.t - T0 - D >= 0 ? "+" : "") + (v.exit.t - T0 - D).toFixed(2)}, delay ${v.exit.delay_s} s` : "none"}`); return out.join("\n   "); };
console.log("A. clock runs through the late spell (control):\n   " + run(false)); console.log("B. clock misses D-3 … D+4 (Codex's case):\n   " + run(true));
