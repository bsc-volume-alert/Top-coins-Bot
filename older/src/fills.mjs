// fills.mjs — executable prices on a PumpSwap constant-product pool (x·y = k), fees included.
// A pool state is { base (whole tokens), quote (SOL), feeBps (LP + protocol + coin-creator, from the pool's latest swap event), t, feeSrc }.
// PumpSwap charges its fees in SOL on top of a buy and out of a sell's proceeds; the curve itself is plain constant product.
// The network/priority cost per transaction (TX_COST_SOL) is a declared assumption, charged per side.
import { TX_COST_SOL, STAKE_SOL } from "./spec.mjs";
export const DEFAULT_FEE_BPS = 30; // used ONLY when no event has reported this pool's fees yet; such fills are flagged fee_src='assumed'
const f = (st) => (st.feeBps ?? DEFAULT_FEE_BPS) / 1e4;

/** tokens received for spending `sol` (fees inside the spend) */
export function buyTokens(st, sol) { const net = sol / (1 + f(st)); return (st.base * net) / (st.quote + net); }
/** SOL received for selling `tok` (after pool fees, before the network cost) */
export function sellSol(st, tok) { const gross = (st.quote * tok) / (st.base + tok); return gross * (1 - f(st)); }
/** after-cost liquidation value of a position: what selling it now would put in the wallet */
export function liqValue(st, tok) { return Math.max(0, sellSol(st, tok) - TX_COST_SOL); }
/** state after our own buy (used only for the entry record; later states come from the chain) */
export function afterBuy(st, sol, tok) { const net = sol / (1 + f(st)); return { ...st, base: st.base - tok, quote: st.quote + net }; }

/** pool liquidity in USD: both sides of a constant-product pool are worth the same at the mid price → 2 × SOL side */
export const liquidityUsd = (st, solUsd) => 2 * st.quote * solUsd;
/** 0.2 SOL round-trip PRICE impact, fees excluded: buy 0.2 SOL of tokens and sell them back, both against the SAME
 *  current state (= the cost of entering now and exiting later in an unchanged pool). Selling straight back into the
 *  post-buy state would return exactly 0.2 on a constant-product pool, so that is not used. */
export function roundTripImpact(st, sol = STAKE_SOL) {
  const tok = (st.base * sol) / (st.quote + sol); const back = (st.quote * tok) / (st.base + tok);
  return 1 - back / sol;
}
