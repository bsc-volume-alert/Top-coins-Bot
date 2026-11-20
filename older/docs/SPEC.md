# Older-coin paper project — frozen specification `older-2`
_20 Nov 2026 (UK). Paper only. Every number below is a constant in `src/spec.mjs`; changing one is a new spec version._
_Agreed between the owner, ChatGPT (reviewer) and Claude (implementer). Gemini's review is still to come._

## Shared rules
- **Population:** pump.fun coins on their **canonical, SOL-quoted PumpSwap pool** (pool.creator = the pump pool-authority PDA of the mint). Other pools and venues are not covered and are counted.
- **Age at entry:** 8 hours to 90 days since **token creation**. Crossing 90 days never closes an open position.
- **Age groups:** A1 8–16 h · A2 16–24 h · A3 24–36 h · A4 36 h–90 d.
- **Entry market cap:** $40,000–$1,000,000 at the signal. Coins are observed outside the band (signals need earlier prices; positions are followed anywhere).
- **Stake:** 0.2 SOL. Cost of an entry = 0.2 SOL + 0.0005 SOL (declared transaction-cost assumption, charged on every transaction side).
- **One entry per mint, family and age group.** Families whose signals fire on the **same update** share one simulated entry; different decision times are different entries.
- **Price:** pool spot price from **effective reserves** (quote vault + signed `virtual_quote_reserves`) after each reserve-changing event (buy, sell, deposit, withdraw, boost). USD via SOL/USD spot, at most 5 minutes old; if stale, **new entries are suspended and open positions are still managed in SOL**.
- **Clock:** our receive time. A signal exists when our engine can use it; block time is stored alongside, never used to back-date. Held/replayed events update history but never create signals.
- **Coverage:** a rule is evaluated only when its whole window is known (continuous feed, or back-filled). Feed outages, restarts, a stale SOL/USD reference and a coin's own lost data all break coverage. "Fresh crossing" = the previous observation was below the line, this one is at or above it, and nothing between them is unknown.

## Execution model (declared assumptions, identical for every family)
- **Buy:** scheduled at signal + 1 s. Priced from the pool state **in force at that moment** (the latest reconstructed state — no other trader has to trade). If that state is not trustworthy, the first trustworthy state within 5 s is used and the delay recorded; otherwise the entry is cancelled as a **pricing/data timeout** (not "untradeable").
- **Sell:** scheduled at trigger + 0.7 s, priced the same way. A triggered sell is never dropped: it waits for a trustworthy state, records the real delay, and is shown as unresolved exposure after 24 h.
- **Fill maths:** constant product on effective reserves. Pool fees per side are measured from the pool's own latest buy/sell as the user's net debit/credit against the amount that moved on the curve (overlapping fee fields are never added together).
- **Entry check (diagnostic):** one batched account read (pool + two vaults) per unique entry; recorded with slots and times; never replaces the simulated fill.

## Exit policies (every entry carries both)
- **trail:** trailing stop of 20 / 25 / 30 / 40 % on the after-cost liquidation value of the position; 24-hour maximum hold from the fill.
- **scale:** the same trail, plus: when the full position's after-cost value reaches 2× cost (and no full exit has triggered), sell **half the original tokens** 0.7 s later; trail the rest with the same percentage on a high-water mark rescaled to the remaining tokens. Same 24-hour deadline. A trail trigger during the pending half-sale becomes one full sale.

## Entry families (14)
| # | Family | Rule |
|---|---|---|
| 1 | AGE-DOUBLE | First fresh crossing of 2× the market cap at the start of the current age group (8 / 16 / 24 / 36 h). Reference must be known history; otherwise `reference_status=MISSING`, no entry. |
| 2 | LOW4H | Fresh crossing of 2× the lowest price of the preceding 4 hours. No pullback needed. |
| 3 | CONT | First eligible observation with price ≥ 1.30× the price 15 minutes earlier **and** ≥ 0.95× the preceding 1-hour high. Not a crossing. |
| 4 | SLOW-BUILD | LOW4H's first eligible candidate, accepted only if ≥ 30 min passed since the low and no completed 1-minute candle from the low's minute up to the trigger's minute gained more than 20% (exactly 20% allowed). Rejections recorded; no later attempt in that age group. Shares LOW4H's entry. |
| 5 | HH-BREAK | Price strictly above the preceding 60-minute high, and volume of the last 15 minutes ≥ 2× the median of the sixteen completed 15-minute windows before it (the minute containing t−15 min is in neither side). Zero baseline: recorded, not entered. |
| 6 | CONT-STALL | CONT's exact entries; at fill + 60 min a surviving position is closed if its after-cost value never reached 1.15× cost. |
| 7 | LOW4H-LIQ25K | LOW4H's first eligible candidate, accepted only if pool liquidity ≥ $25,000 and the 0.2 SOL static price-impact diagnostic ≤ 5% (each test recorded separately). Shares LOW4H's entry. |
| 8–10 | FAST-1M / 3M / 5M | Fresh crossing of 2× the lowest pool spot price of the preceding 60 / 180 / 300 seconds (exact observations; the price standing at the window's start counts). |
| 11–13 | FAST150-1M / 3M / 5M | The same at 1.5×. |
| 14 | SECOND-WAVE | Seeded by the first 2× FAST trigger of the age group. Track the running high; the first fall to ≤ 0.75× it freezes that high; buy on the first observation strictly above the frozen high. Expires 60 minutes after the seed; one attempt per mint per age group; eligibility re-checked at the buy. |

14 families × 4 ages × 4 stops = **224 rows**, × 2 exit policies = **448 comparisons**. They share coins, entries and stops: correlated comparisons, not independent results.

## Recorded with each entry (never used as filters)
Exact age, market-cap band, 15-minute rise, largest 1-minute candle of the last hour, 15-minute volume, buys/sells/unique and repeat buyers (15 min), liquidity, static impact, distance from the 1-hour high, 4-hour drawdown and recovery; the previous observation and threshold that made the crossing; for FAST/SECOND-WAVE every observation of the window; the trigger's signature, slot, block time, receive and evaluation times, reserves, fees, supply and SOL/USD; fill and exit delays; the entry check.

## Reporting
Per row: coins, filled/open/closed/cancelled/unresolved, net SOL, average and quantiles of after-cost return, win rate, losses of ≥ 40% (the project's severe-loss measure), ≥ 50% and ≥ 60%, result without the top three coins, first/second half, holding time, stake committed, runner outcomes (after-cost value reaching 2×/3×/5×/10× of cost within 24 h of the fill, including after an exit), startup entries (first 24 h after the first start; kept in the totals). Plus overlap between families, rejections and missing data, watched coins, feed freshness, disk, and running costs kept separate from paper returns. First review after seven days of entries.
