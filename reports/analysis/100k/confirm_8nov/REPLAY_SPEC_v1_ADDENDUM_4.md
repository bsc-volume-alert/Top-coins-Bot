# Addendum 4 to REPLAY_SPEC_v1 — 9 Nov 2026 12:10 UK, written before any replay return was computed

Two implementation facts were found while loading the data. Both are settled here, before any result is seen.

## D1. Pool reserve fields do not reproduce pool trade prices
**The finding.** We compared each pool trade's own price (SOL paid ÷ tokens, `price_sol`) with the pool's quote ÷ base reserves on the same row. The sample was ~50,000 SOL-quoted pool trades of at least 0.05 SOL, from trades_part_012 of entry-all-20261107t2210.

| Trades | Own price ÷ reserve ratio, median | 10th–90th percentile |
|---|---|---|
| Pool buys | 1.21 | 1.08–1.28 |
| Pool sells | 1.22 | 1.09–1.29 |
| Curve trades (virtual reserves) | 1.000 exactly | |

Buys and sells sit on the same side, so this is not a fee effect. Constant-product maths on the recorded pool reserves therefore does **not** match what traders actually paid or received. The cause is unknown (a decoder or reserve-field issue), and it is logged as a data issue to investigate.

**Primary pricing:**
- **Curve legs:** constant product on the recorded virtual reserves, as in v1, because they are exact.
- **Pool legs:**
  - The starting price is the latest pool trade's own `price_sol`, a direct execution price from trades with `ts` at or before landing.
  - Price impact for our size uses constant product on that trade's pool reserves, applied as a ratio to that price.
  - Fees are on top, as in v1.

**Sensitivity:** pool legs priced purely from the reserve ratio, as the original v1 / A3 text says, reported alongside, not tested.

A3's other evidence conditions still apply to the pool trade used:
- it is at most 30 s old
- no feed gap overlaps
- no migration since

## D2. Clock resolution
Trade `ts` is the block time, in whole seconds.
- **Buy:** landing time is decision + 1 s. The state used is the last trade with `ts` at or before floor(landing). Order within a second is slot, ev_idx, row_id.
- **Sell:** it lands 0.7 s after a trigger trade at time t, so it uses the state after the last trade with `ts` at or before t.

**Feed gaps:**
- **Curve stream:** from (`idle` ts − 60 s), or from `closed` / `error`, until the next `subscribed`.
- **Pool stream:** from `pool-closed` / `pool-error` until the next `pool-subscribed`.
