// Synthetic market for tests: one PumpSwap pool, SOL = $100, supply 1e9, pool base fixed at 2e8 tokens so
// market cap $X ⇔ quote reserve X × 0.002 SOL (e.g. $100K ⇔ 200 SOL, liquidity $40K).
import { Engine } from "../src/engine.mjs";
export const SOLUSD = 100, BASE = 2e8;
export const quoteFor = (mc) => (mc / (SOLUSD * 1e9)) * BASE;
export function mkEngine(opts = {}) { const logs = []; const e = new Engine({ solUsd: () => SOLUSD, log: (s) => logs.push(s), ...opts }); e.logs = logs; return e; }
export function swap(eng, t, mc, { mint = "MintAAApump", pool = "PoolA", sol = 1, isBuy = true, user = "u1", feeBps = 30 } = {}) {
  eng.onSwap({ t, mint, pool, base: BASE, quote: quoteFor(mc), feeBps, sol, isBuy, user });
}
/** trades every `step` s from t0 to t1 (exclusive) at a market cap given by f(t) */
export function path(eng, t0, t1, f, step = 60, o = {}) { for (let t = t0; t < t1; t += step) swap(eng, t, f(t), typeof o === "function" ? o(t) : o); }
export const H = 3600, T0 = 1_800_000_000; // a round epoch for the tests
