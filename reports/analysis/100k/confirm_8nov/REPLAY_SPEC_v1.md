# $100K cap-band trading replay — specification v1, frozen 8 Nov 2026 19:45 UK (UTC)

Written by Claude with Codex's four corrections (8 Nov 19:28). Do not edit: changes go in a new dated version. Nothing here is a trading rule; no book, no live trading.

## 1. Question
On identical entries, does buying at the 5-minute decision make money after realistic costs, and how does that depend on the coin's market cap at 5 minutes? Market cap is the **reference baseline** (it ranked observed crossings well in one exploratory chronological split, AUC 0.91). It is not a validated trading feature. Persistence and sell share are left out of this first replay; that does not show they can never help.

## 2. Coins
- Strict cohort of confirm_8nov: launches created 7 Nov 10:45 UK → 8 Nov 15:00 UK, retained, no non-SOL venue record.
- Must have an on-time 5-minute observation (see §3).
- Excluded at the decision: coins ALREADY ≥ $100K, SUSPECT, UNKNOWN_NO_POOL.
- Every remaining coin is entered. None is dropped for what happens after entry.
- **Bands by 5-min cap:** < $5K, $5–10K, $10–20K, $20–40K, $40–100K. That is 5 bands.

## 3. Entry (decision clock = coin age; execution clock = wall time)
- **Decision time:** when the 5-min observation actually became available, which is token_life obs_ts if present, otherwise ts. It must be no more than creation + 315 s; otherwise the coin is "late" and reported, not entered.
- **Landing:** decision time + 1.0 s.
- **Fill price:** constant-product price impact on the venue's reserves at landing, using the latest trade-reported reserve state at or before landing.
  - If no reserve state exists within 30 s before landing, the fill is **UNAVAILABLE** (counted, not priced).
  - We never wait for a later trade.
- **Venue:** the venue whose reserve state is used (curve or pump pool).

## 4. Costs and size
- **Positions:** 0.2 SOL and 0.02 SOL, scored separately.
- **Curve fees:** 95 + 30 bps per side.
- **Pool fees:** LP 20 + protocol 5 bps + the coin's creator fee from pool evidence. If the creator fee is unknown, use 30 bps and flag the coin.
- **Fixed fee:** 0.0015 SOL per round trip.
- **Sell size:** our own tokens from the buy fill, with price impact on reserves at sell landing.

## 5. Exits — clock is time AFTER ENTRY; frozen grid, every combination reported
| id | exit |
|---|---|
| X15 / X30 / X60 | fixed hold 15 / 30 / 60 min after entry |
| T25 / T40 | trailing stop 25% / 40% below the highest trade price since entry; horizon 120 min after entry |
| TP2 | sell all at 2× entry, stop at −50%; horizon 120 min |
| H2T40 | sell half at 2×, trail the rest at 40%; time stop at +60 s if below entry; horizon 120 min (the current books' exit) |

That is 7 exits × 5 bands = **35 combinations** (×2 sizes, reported, not separately counted as hypotheses).

**How an exit fires and lands:**
- A trigger is observed on a recorded trade at time t. The sell lands at t + 0.7 s, priced from reserves at landing (latest state at or before landing).
- **Migration:** a curve position that migrates converts at the migration rate and continues on the pool. Exit parameters are unchanged.
- **Quiet coin at horizon:** if there is no trade near the horizon, sell against the latest reserve state.
  - This is reported as **QUIET-PRICED**, separately: the last price is not proof of executable liquidity.
  - If there is no reserve state at all after entry, the position is **UNRESOLVED**: counted, not priced, and also bounded at −100%.

## 6. Outputs (per band × exit, both sizes)
- **Counts:** entries, UNAVAILABLE fills, late decisions, QUIET-PRICED exits, UNRESOLVED positions.
- **Returns:** mean and median net return; total net SOL; mean without the best coin; win rate; share of losses of 50% or worse.
- **Capital saved:** on coins that did not cross (NOCROSS_OBS), compared with holding 120 min after entry.
- **Runners stopped early:** POS coins exited before their $100K crossing, and the gain forgone.
- **Uncertainty:** 95% bootstrap interval per combination (seed 20261108).

The primary $100K outcome (2 h from creation) is reported separately and is not a trading horizon.

## 7. Judging
- **Development:** the cohort in §2 (exploratory, all 35 results shown).
- **Confirmation (untouched):** launches created 12 Nov 00:00 → 13 Nov 00:00 UK. This does not overlap the blind-test periods of 8–10 and 10–12 Nov.
  - Only combinations chosen in writing **before** 12 Nov 00:00 are tested.
  - A result is supported only if its Bonferroni-adjusted lower bound (35 combinations) of mean net SOL per entry is above 0 at 0.2 SOL.

## 8. Data needed
Trade histories for the cohort coins, 7 Nov 20:00 → 8 Nov 15:00 plus 2 h of follow-up, curve and pool. Each trade needs reserves, the pool record and coverage records. 6 Nov 07:40 → 7 Nov 20:00 already exists (entry-all-20261107t2210). This export requires the owner's go.
