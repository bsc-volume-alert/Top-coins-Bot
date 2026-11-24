// Synthetic market for tests: one PumpSwap pool, SOL = $100, supply 1e9, pool base fixed at 2e8 tokens so
// market cap $X ⇔ quote reserve X × 0.002 SOL (e.g. $100K ⇔ 200 SOL, liquidity $40K).
import { Engine } from "../src/engine.mjs";
export const SOLUSD = 100, BASE = 2e8;
export const quoteFor = (mc) => (mc / (SOLUSD * 1e9)) * BASE;
import { SPL_TOKEN } from "../src/risk.mjs";
/** FIXTURES (ninth review). The production guards are not switched off for the tests; the synthetic market declares what a
 *  real feed would supply:
 *   tokens — every synthetic coin is a CLASSIC SPL token (the program has no transfer fee, so its fee is known) unless the test
 *            passes `tokens: null` and sets the coin's token program / mint-account evidence itself;
 *   stream — every synthetic event arrives 1 s after its block (ev.lag overrides it) and other pools' traffic keeps arriving
 *            on time between events and at every clock tick, as on a busy program. `stream: "manual"`: the test feeds the
 *            stream's delay itself (eng.noteLag, or swap(…, { lag })) — nothing is assumed current. */
export function mkEngine(opts = {}) {
  const logs = [], { tokens = SPL_TOKEN, stream = "current", ...rest } = opts; const e = new Engine({ solUsd: () => SOLUSD, log: (s) => logs.push(s), ...rest }); e.logs = logs;
  if (tokens) { const coin = e.coin.bind(e); e.coin = (mint, o = {}) => { const c = coin(mint, o); if (c.info.token_program == null && !c.info.risk) c.info.token_program = tokens; return c; }; }
  const manual = stream === "manual", keep = (upTo) => { const L = e.stream; if (!L) return; if (L.at == null) { e.noteLag(upTo, 1); return; } while (L.at + 4 < upTo) e.noteLag(L.at + 4, 1); };
  const onEvent = e.onEvent.bind(e); e.onEvent = (ev) => { if (!ev.replay && e.noteLag) { if (ev.lag != null) e.noteLag(ev.t, ev.lag); else if (!manual) { keep(ev.t); e.noteLag(ev.t, 1); } } return onEvent(ev); };
  const tick = e.tick.bind(e); e.tick = (now) => { if (!manual && e.noteLag) { keep(now); e.noteLag(now, 1); } return tick(now); };
  return e;
}
export function swap(eng, t, mc, { mint = "MintAAApump", pool = "PoolA", sol = 1, isBuy = true, user = "u1", feeBps = 30, lag = undefined } = {}) {
  eng.onSwap({ t, mint, pool, base: BASE, quote: quoteFor(mc), feeBps, sol, isBuy, user, ...(lag !== undefined ? { lag } : {}) });
}
/** trades every `step` s from t0 to t1 (exclusive) at a market cap given by f(t) */
export function path(eng, t0, t1, f, step = 60, o = {}) { for (let t = t0; t < t1; t += step) swap(eng, t, f(t), typeof o === "function" ? o(t) : o); }
export const H = 3600, T0 = 1_800_000_000; // a round epoch for the tests
