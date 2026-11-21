// fills.mjs — executable prices on a PumpSwap constant-product pool, fees included.
// A pool state is { base (whole tokens), quote (SOL, EFFECTIVE quote reserves = quote vault + signed virtual_quote_reserves),
//   feeBuy, feeSell (fractions, measured from the pool's own latest buy / sell: what the user paid or received vs the amount
//   that moved against the curve — the net debit/credit, so overlapping fee fields are never added twice), supply, t }.
// PumpSwap prices against effective quote reserves (pump-public-docs, "Quoting: effective quote reserves").
// The network/priority cost per transaction (TX_COST_SOL) is a declared assumption, charged per side.
import { TX_COST_SOL, STAKE_SOL } from "./spec.mjs";
export const DEFAULT_FEE = 0.003; // used ONLY when the pool has not yet shown a fee on that side; such fills are flagged fee_src='assumed'
export const feeBuy = (st) => st.feeBuy ?? st.feeSell ?? DEFAULT_FEE;
export const feeSell = (st) => st.feeSell ?? st.feeBuy ?? DEFAULT_FEE;
export const feeSrc = (st, side) => isQuote(st) ? "inside the routed quote" : _feeSrc(st, side);
const _feeSrc = (st, side) => ((side === "buy" ? st.feeBuy : st.feeSell) != null ? "event" : (st.feeBuy ?? st.feeSell) != null ? "other-side" : "assumed");

// A second kind of state, { kind: "quote", reqT, t, buy: { sol, tok } | null, sells: [{ tok, sol }], route, ... }, carries ROUTED QUOTES
// for exact sizes (the 0.2 SOL buy; the position's actual full and remaining inventories) from a quote provider such as Jupiter.
// Route and pool fees are already inside a quote's output, so nothing is charged twice; only the declared network cost is added.
// A size the quote state does not hold is "not priced" (null) — never zero, never interpolated.
const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
export const isQuote = (st) => !!st && st.kind === "quote";
/** tokens received for spending `sol` in total (fees inside the spend); null when this state cannot price that buy */
export function buyTokens(st, sol, minReq = null) {
  if (isQuote(st)) return st.buy && near(st.buy.sol, sol) && (minReq == null || (st.buy.reqT ?? st.reqT) >= minReq) ? st.buy.tok : null;
  const net = sol / (1 + feeBuy(st)); return (st.base * net) / (st.quote + net);
}
/** SOL received for selling `tok` (after pool/route fees, before the network cost); null when not priced */
export function sellSol(st, tok, minReq = null) { const q = sellQuote(st, tok, minReq); return q ? q.sol : null; }
/** the priced sale of `tok` with its own evidence: { sol, reqT, t } for a routed quote (each quantity keeps the time ITS quote was
 *  requested and answered — quotes for different quantities are different market observations and are never merged under one
 *  timestamp), { sol } for a pool state. minReq: only a quote requested at or after this time may price an order. */
export function sellQuote(st, tok, minReq = null) {
  if (isQuote(st)) { const q = (st.sells || []).find((x) => near(x.tok, tok) && (minReq == null || (x.reqT ?? st.reqT) >= minReq)); return q ? { sol: q.sol, reqT: q.reqT ?? st.reqT, t: q.t ?? st.t, route: q.route ?? null } : null; }
  const gross = (st.quote * tok) / (st.base + tok); return { sol: gross * (1 - feeSell(st)) };
}
/** after-cost liquidation value of `tok`: what selling it now would put in the wallet; null when not priced */
export function liqValue(st, tok) { if (!(tok > 0)) return 0; const s = sellSol(st, tok); return s == null ? null : Math.max(0, s - TX_COST_SOL); }

/** pool liquidity in USD: both sides of a constant-product pool are worth the same at the mid price → 2 × effective SOL side */
export const liquidityUsd = (st, solUsd) => 2 * st.quote * solUsd;
/** STATIC price-impact diagnostic for 0.2 SOL, fees excluded: one buy quote and one sell quote of the same tokens, both against
 *  the SAME current state. It is not an executed round trip (a real fee-free buy then sell returns exactly the input). */
export function staticImpact(st, sol = STAKE_SOL) {
  const tok = (st.base * sol) / (st.quote + sol); const back = (st.quote * tok) / (st.base + tok);
  return 1 - back / sol;
}
