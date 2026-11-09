# Pump-pool reserve/price diagnosis — 9 Nov 2026 18:30 UK (pool_check.py → pool_check_out.txt)

Data: every SOL-quoted pump-pool row of the 2,019 replay coins (151 pools, one pool per mint; 39 rows px_adj='held', everything else raw), from the replay package (f9a0086c).

## Decoder trace (src/pumpswap-decoder.js)
The BuyEvent / SellEvent layout read is:

> timestamp, base_amount, max/min quote, user base/quote reserves, **pool_base_token_reserves, pool_quote_token_reserves**, quote_amount (before fees), LP fee bps / fee, protocol fee bps / fee, quote with/without LP fee, user_quote_amount, pool, user, …, coin_creator, creator fee bps / fee

This matches the order of the PumpSwap event fields.
- `price_sol` = quote_amount ÷ base_amount: the swap's own amounts, before fees.
- `pool_*_raw` are the reserves fields exactly as emitted.

## Findings
| Test | Result |
|---|---|
| Consecutive swaps in the same pool: does the next row's base reserve equal this row's base reserve ∓ this swap's base amount? | 931,072 of 942,833 pairs (98.8%) match. **Pool reserves are PRE-trade** (Gemini/Codex hypothesis confirmed across all 151 pools). Curve vsol/vtok are post-trade. |
| Change in quote reserve vs the swap's quote amount | buys median 0.9998 (p10–p90 0.990–1.011); sells 0.998 (0.988–1.000). The quote side moves by the swap amount. |
| Base out vs constant product on the pre-trade (Q, B) | median **0.869** (0.786–0.952). Swaps do NOT follow x·y = k on the recorded reserves. |
| Implied effective quote reserve Q′ from each swap (constant product on pre-trade B) | buys Q′/Q median 1.149, sells 1.153: the same from both sides. |
| Q′ − Q per pool | median **+17.26 SOL** (p10 12.8, p90 17.6) |
| Stability of that offset within a pool | last 50 minus first 50 swaps: median −0.6 SOL; within-pool p10–p90 spread median 2.1 SOL |

## Interpretation (hypothesis, not established mechanism)
- **Consistent with the data:** buys and sells both execute as constant product on (Q + c, B). Here c is a near-constant extra quote amount per pool, typically about 17 SOL.
- **Why the earlier "×1.21" appeared:** the ratio of trade price to Q/B is just (Q + c)/Q. It varies with pool size, so it is not a fixed multiplier.
- **Ruled out as the cause:**
  - decoder field misalignment: ΔQ and ΔB both match the swap amounts
  - fees: buys and sells sit on the same side
  - missing trades: 98.8% of pairs are contiguous
- **What c actually is** (a virtual or uncounted quote balance) is not established.
- **Bounded diagnostic that would settle it:** read the quote-vault token balance and the pool account of 3–5 pools by RPC at known slots, and compare them with the event's Q. This has not been run.

## Use in replay v2
Pool legs use:
- the post-trade state (Q ± quote, B ∓ base)
- plus c, estimated only from that pool's own earlier swaps (median of the last 50, at least 5 needed)
- with constant-product price impact and the spec's fees

Where there are fewer than 5 earlier swaps, the leg falls back to v1's method and is tagged CAL-FALLBACK, reported separately. There is no global multiplier, and no later state is used.
