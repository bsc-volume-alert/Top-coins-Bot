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

## Update 9 Nov 2026 20:15 UK — mechanism identified (bounded on-chain checks, jobs vault-check and virt-check)

**Measured, from the swap's own transaction (historical, in-transaction evidence).**
- **Method:** a bounded check of 9 sampled swaps across 3 pools. 3 were readable; the other 6 are "version 1" transactions that the RPC call as written could not return (a known limitation, not retried).
- **Result:** for all 3 readable swaps (0.1, 7.2 and 0.1 SOL buys), the event's pool_quote_reserves and pool_base_reserves equal the pool vaults' **pre-transaction** token balances exactly. Post-transaction balances differ by the swap amounts.

**Measured, current state only (corroborating).**
- **Method:** the PumpSwap pool account's `virtual_quote_reserves` field (i128 at byte 245), read with the same layout the executor and the books already use (executor/src/amm.mjs, launcher/src/chainfill.mjs).
- **Result:** 17.5834, 17.5841 and 17.5840 SOL for the 3 pools. The offset fitted from historical swaps was 17.21, 17.50 and 17.42 SOL.

**Inferred.**
- Swaps price on (vault quote + virtual_quote_reserves, vault base): a protocol-level virtual quote reserve of about 17.58 SOL.
- The fitted c sits slightly below it, consistent with fees inside the implied-offset calculation.
- The tracker's event decoder records only the vault reserves, which is why the "×1.21" appeared.

**Not verified.**
- That virtual_quote_reserves was the same value at each historical swap. Current reads plus the stability of the fitted c within each pool are consistent with a fixed value.
- Sells, directly: all 3 readable samples were buys. Sells imply the same offset from the swap data.

**Consequences.**
- The existing paper books already price pool fills from the live vault balances plus virtual_quote_reserves, with the pool's own fee rates (chainfill.mjs poolBuy/poolSell). Their pool accounting does not have this defect.
- Replay v2/v2.1's fitted c is a close stand-in. Replacing it with the measured 17.58 SOL would shift pool prices by about 0.3% on a 75-SOL pool.
