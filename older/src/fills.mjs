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
export const feeSrc = (st, side) => ((side === "buy" ? st.feeBuy : st.feeSell) != null ? "event" : (st.feeBuy ?? st.feeSell) != null ? "other-side" : "assumed");

/** tokens received for spending `sol` in total (fees inside the spend) */
export function buyTokens(st, sol) { const net = sol / (1 + feeBuy(st)); return (st.base * net) / (st.quote + net); }
/** SOL received for selling `tok` (after pool fees, before the network cost) */
export function sellSol(st, tok) { const gross = (st.quote * tok) / (st.base + tok); return gross * (1 - feeSell(st)); }
/** after-cost liquidation value of `tok`: what selling it now would put in the wallet */
export function liqValue(st, tok) { return tok > 0 ? Math.max(0, sellSol(st, tok) - TX_COST_SOL) : 0; }

/** pool liquidity in USD: both sides of a constant-product pool are worth the same at the mid price → 2 × effective SOL side */
export const liquidityUsd = (st, solUsd) => 2 * st.quote * solUsd;
/** STATIC price-impact diagnostic for 0.2 SOL, fees excluded: one buy quote and one sell quote of the same tokens, both against
 *  the SAME current state. It is not an executed round trip (a real fee-free buy then sell returns exactly the input). */
export function staticImpact(st, sol = STAKE_SOL) {
  const tok = (st.base * sol) / (st.quote + sol); const back = (st.quote * tok) / (st.base + tok);
  return 1 - back / sol;
}
