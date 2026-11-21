# Older-coin paper project — frozen specification `older-5`
_20 Nov 2026 (UK). Paper only. Every number below is a constant in `src/spec.mjs`; changing one is a new spec version._
_Agreed between the owner, ChatGPT (reviewer) and Claude (implementer). older-3 (20 Nov, afternoon) widens the scope to Solana-wide and records three rule amendments; the strategy definitions are otherwise those of older-2._

## Shared rules
- **Population: Solana-wide, launchpad- and exchange-neutral** — any token of eligible age and valuation that our providers can observe and quote. Two observation methods, always labelled and never merged silently:
  - **PumpSwap · live:** pump.fun coins on their canonical SOL-quoted PumpSwap pool, observed from every decoded pool event; fills from the reconstructed pool state.
  - **Solana-wide · sampled:** every other token (Raydium, Meteora, Orca, other launchpads, non-SOL pools reachable by a route from SOL), observed by **sampled** prices at a recorded cadence; fills from **routed quotes** for the exact size. A mint is observed by one method only (live wins).
  - "Solana-wide" is broad coverage, not every mint. Unsupported, unpriced and unroutable tokens are counted.
- **Age at entry:** 8 hours to 90 days since token creation. Sources are labelled: on-chain/back-filled creation for the live method; for the sampled method the provider's **first-pool creation time, a lower bound on token age** (it can understate age, never overstate it — the 8-hour minimum cannot be broken by it; the age group may be understated). Crossing 90 days never closes an open position.
- **Age groups:** A1 8–16 h · A2 16–24 h · A3 24–36 h · A4 36 h–90 d.
- **Entry valuation:** $40,000–$1,000,000 at the signal. Definition is recorded on every entry: live = pool price × on-chain base supply; sampled = provider market cap (circulating supply × price). Fully diluted value is never mixed in.
- **Stake:** 0.2 SOL. Cost of an entry = 0.2 SOL + 0.0005 SOL (declared transaction-cost assumption, charged on every execution leg of every simulated book).
- **One entry per mint, family and entry-age group.** Families whose signals fire on the **same update** share one simulated entry.
- **Price (live method):** pool spot price from **effective reserves** (quote vault + signed `virtual_quote_reserves`) after each reserve-changing event (buy, sell, deposit, withdraw, boost).
- **USD:** every observation is converted at the SOL/USD of its own moment (never re-priced later). Costs, exits, trails, stall thresholds and P&L are in SOL. A stale USD reference suspends new entries; positions are still managed.
- **Clock:** our receive time (for a quote: when the response became available). Block time is stored alongside, never used to back-date. Held/replayed events never create signals.
- **Observations:** a transaction is atomic, so all of its events on a pool yield ONE observation — the committed state after the last of them. Intermediate states are never prices, peaks or triggers.
- **Coverage:** a rule is evaluated only when its whole window is known. Coverage follows evidence: an empty back-fill proves nothing; an outage repaired from minute bars counts for hour-scale windows only, never for a fresh crossing, FAST or SECOND-WAVE; a pool-reserve discontinuity restarts the coin's history. Feed outages, restarts, a stale USD reference, a hole in a token's samples (more than 3× its cadence) or a token omitted by the price provider all break coverage.
- **Risk evidence** (mint/freeze authority, Token-2022 extensions, provider markers) is recorded on every token. Only a known transfer restriction (transfer hook, non-transferable, permanent delegate, default-frozen accounts, a non-zero transfer fee, pausable/confidential) stops entries, because the paper book's plain buy-and-sell assumption would not hold. Missing risk data is recorded as missing, not as clean. No other filter is added.

## Execution model (declared assumptions, identical for every family)
- **Buy:** scheduled at signal + 1 s. Priced from the pool state **in force at that moment** (the latest reconstructed state — no other trader has to trade). If that state is not trustworthy, the first trustworthy state within 5 s is used and the delay recorded; otherwise the entry is cancelled as a **pricing/data timeout** (not "untradeable").
- **Sell:** scheduled at trigger + 0.7 s, priced the same way. A triggered sell is never dropped: it waits for a trustworthy state and records the real delay. After 24 h it is shown as unresolved exposure but stays pending and still closes when a price returns. A state can only price a moment at or after the time it was observed.
- **Fill maths:** constant product on effective reserves. Pool fees per side are measured from the pool's own latest buy/sell as the user's net debit/credit against the amount that moved on the curve (overlapping fee fields are never added together).
- **Entry check (diagnostic, live method):** one batched account read (pool + two vaults) per unique entry; recorded with slots and times; never replaces the simulated fill.
- **Routed-quote adapter (sampled method):** the quote is **requested at or after the scheduled time**; the fill time is when the response became available (never back-dated); route, router, fee fields and both timestamps are stored. Fees inside a quote are not charged again; only the declared transaction cost is added. One quote per distinct size (the 0.2 SOL buy; the position's full and remaining inventory) — never one per result row. No route: the buy is cancelled as a pricing/data timeout; an exit stays triggered and visible as unresolved exposure. A quote is an expected output, not a confirmed on-chain fill.

## Exit policies (every entry carries both)
- **trail:** trailing stop of 20 / 25 / 30 / 40 % on the after-cost liquidation value of the position; 24-hour maximum hold from the fill.
- **scale:** the same trail, plus: when the full position's after-cost value reaches 2× cost (and no full exit has triggered), sell **half the original tokens** 0.7 s later; trail the rest with the same percentage. Same 24-hour deadline. A trail trigger during the pending half-sale becomes one full sale (the same tokens are never sold twice).
  - **Formula.** `part` = ½ × original tokens. Half-sale proceeds = `sell(part) − 0.0005` (one leg, one cost). High-water mark: `peak_new = peak_old × value(remaining) ÷ value(held before)`, both valued on the state that prices the sale. So the position's drawdown from its high is **identical before and after** the half-sale: selling half neither looks like a 50% fall nor resets the trail. Final return = (half-sale proceeds + final-sale proceeds) ÷ cost − 1; the final sale pays its own 0.0005. A reset-the-trail variant would be a separate future experiment.

## Entry families (14)
| # | Family | Rule |
|---|---|---|
| 1 | AGE-DOUBLE | First fresh crossing of 2× the market cap at the start of the current age group (8 / 16 / 24 / 36 h). Reference must be known history; otherwise `reference_status=MISSING`, no entry. |
| 2 | LOW4H | Fresh crossing of 2× the lowest price of the preceding 4 hours. No pullback needed. |
| 3 | CONT | First eligible observation with price ≥ 1.30× the price 15 minutes earlier **and** ≥ 0.95× the preceding 1-hour high. Not a crossing. |
| 4 | SLOW-BUILD | LOW4H's first eligible candidate, accepted only if ≥ 30 min passed since the low and no completed 1-minute candle from the low's minute up to the trigger's minute gained more than 20% (exactly 20% allowed). Rejections recorded; no later attempt in that age group. Shares LOW4H's entry. |
| 5 | HH-BREAK | Price strictly above the preceding 60-minute high, and volume over **[B − 15 min, B)** ≥ 2× the median of sixteen adjacent 15-minute buckets covering **[B − 255 min, B − 15 min)**, where B is the last completed minute boundary (**amended in older-3**: half-open intervals, no overlap, no missing minute; the unfinished minute counts on neither side). Zero baseline: recorded, not entered. Needs a volume source: **not evaluated in the sampled method**. |
| 6 | CONT-STALL | CONT's exact entries; at fill + 60 min a surviving position is closed if its after-cost value never reached 1.15× cost. |
| 7 | LOW4H-LIQ25K | LOW4H's first eligible candidate, accepted only if pool liquidity ≥ $25,000 and the 0.2 SOL static price-impact diagnostic ≤ 5% (each test recorded separately). Shares LOW4H's entry. |
| 8–10 | FAST-1M / 3M / 5M | Fresh crossing of 2× the lowest pool spot price of the preceding 60 / 180 / 300 seconds (exact observations; the price standing at the window's start counts). |
| 11–13 | FAST150-1M / 3M / 5M | The same at 1.5×. |
| 15–17 | FAST-10M / FAST-30M / FAST150-10M | **Added in older-4 (21 Nov 2026, owner's decision):** the same rule over 10 and 30 minutes at 2×, and over 10 minutes at 1.5× — to fill the gap between the 5-minute and the 4-hour books. Same exact-observation coverage over the whole window. They do not seed SECOND-WAVE. Every FAST entry also records `move_s`, the seconds from the window's low to the trigger, so results can be split by speed afterwards. |
| 14 | SECOND-WAVE | Seeded by the first 2× FAST trigger of the 1-, 3- or 5-minute books. Track the running high; the first fall to ≤ 0.75× it freezes that high; buy on the first observation strictly above the frozen high. Expires 60 minutes after the seed. **Amended in older-3:** one active setup per mint, kept alive to its own expiry even across an age boundary; the seed uses the seed age group's attempt; the trade is classified by the age group **at entry**, whose slot must be free and is then used; seed age is recorded. Eligibility re-checked at the buy. |

17 families × 4 ages × 5 stops (20 / 25 / 30 / 40 / **60%**, the last added in older-5 on 21 Nov 2026 by the owner's decision) = **340 rows**, × 2 exit policies = **680 comparisons** (544 in older-4; 14 families and 448 comparisons up to older-3), viewable per population/method. They share coins, entries and stops: correlated comparisons, not independent results, and their sum is not a funded portfolio's return.

**What the sampled method can miss** (stated on the dashboard): FAST triggers, fresh crossings, trailing highs, stop crossings and SECOND-WAVE seeds/pullbacks/reclaims that happen between samples. FAST-1M on sampled tokens is evaluated on the samples that exist and is labelled sampled; it is not equivalent to the live books.

## Recorded with each entry (never used as filters)
Exact age, market-cap band, 15-minute rise, largest 1-minute candle of the last hour, 15-minute volume, buys/sells/unique and repeat buyers (15 min), liquidity, static impact, distance from the 1-hour high, 4-hour drawdown and recovery; the previous observation and threshold that made the crossing; for FAST/SECOND-WAVE every observation of the window; the trigger's signature, slot, block time, receive and evaluation times, reserves, fees, supply and SOL/USD; fill and exit delays; the entry check.

## Reporting
Per row: coins, filled/open/closed/cancelled/unresolved, net SOL, average and quantiles of after-cost return, win rate, losses of ≥ 40% (the project's severe-loss measure), ≥ 50% and ≥ 60%, result without the top three coins, first/second half, holding time, stake committed, runner outcomes (after-cost value reaching 2×/3×/5×/10× of cost within 24 h of the fill, including after an exit), startup entries (first 24 h after the first start; kept in the totals). Plus overlap between families, rejections and missing data, watched coins, feed freshness, disk, and running costs kept separate from paper returns. First review after seven days of entries.

## Recorded measurements at each entry (added 20 Nov 2026, 17:50 UK — background data only, NOT entry rules)
Owner's decision: collect more information without adding books. Nothing below is used to accept or reject an entry; the 448 books are unchanged.
- **From decoded trades (live method only)**, for the last 1, 3 and 5 minutes before the decision (`features.w1 / w3 / w5`): USD volume, number of buy and sell transactions, number of different buying wallets; for 5 minutes also the largest single buyer's share of the buy volume (`top_buyer_share`: near 1 = one wallet did the buying, low = many wallets).
- `vol60_usd` and `vol_surge5` = last 5 minutes ÷ the average 5 minutes of the 55 minutes before (only when a full hour of history exists).
- Already recorded before: 15-minute volume, buys, sells, different buyers, repeat buyers; liquidity; round-trip impact; rise over 15 minutes.
- **From Jupiter's token data, for every entry of either method** (`entry.snap`): holder count, top-holder percentage, and Jupiter's own 5-minute and 1-hour statistics exactly as returned (numeric fields), with request and reply times and the delay after the decision. Jupiter's field names are not verified from this workspace; they are stored as received. A token Jupiter does not return is recorded as missing.
- Sampled coins have no decoded trades, so their `w1 / w3 / w5` are empty; their 5-minute figures are Jupiter's.
- Use after the run: compare winners and losers on these numbers (for example holder rise of 10–15% in 5 minutes, or volume surge), and only then decide whether any becomes a rule.

## Data-trust rules added after the second independent review (20 Nov 2026, evening)
- **Pool fee:** measured only from validated instructions and only inside 0–10%; a failed measurement is counted and never used.
- **Reserve chain:** base side exact; quote side within 0.1% of effective reserves. A break restarts the coin's history and trust.
- **Unknown virtual reserves are not zero:** no state until an event carries them.
- **Boost events:** the rebuilt state is quarantined until the next swap.
- **Back-filled bars:** kept only when accepted, apart from live data; continuous only where consecutive bars are ≤ 5 minutes apart (a declared approximation for hour-scale windows). They are never read by a fresh crossing, FAST or SECOND-WAVE: those use exact observations only, continuous over the whole window. For hour-scale reads a newer back-filled close beats an older exact observation.
- **Boost quarantine** lasts through deposits and withdrawals until the next swap.
- **Sampled tokens:** no valuation without the provider's market cap or circulating supply; valid decimals required.
- **Routed half-sale:** its quotes must be requested within 5 s of each other.
- **Trade-window measurements:** only from exact observations covering the whole window.
- **Saving:** open positions at most 1 s behind, and all saved on a planned stop.
- **Carried prices:** a price is used at a later moment only if the whole stretch from its own time to that moment is known (exact use: unbroken exact observation; hour-scale use: covered history). A feed outage, a loss of the coin's data, a boost quarantine or a re-admission to the sampled list breaks the carry. Verified silence of any length does not.

## older-5 (21 Nov 2026, 13:30 UK — owner's decisions)

**1. A 60% trailing stop.** A fifth stop value beside 20 / 25 / 30 / 40%, under both exit policies, with exactly the same trigger and fill rules. 680 comparison rows. It exists only for entries made after the change (an earlier entry's price path after its 40% exit was not kept, so nothing is back-calculated).

**2. Stake views — display only.** The paper trade is and stays 0.2 SOL; no decision, trigger or stored result reads a stake view. The books page can re-price each trade at 0.5 / 1 / 2 / 5 SOL (`book.mjs atStake`):
- the pool reserves and sell fee are now saved with every pool-priced half-sale and exit (`half.pool`, `exit.pool`), as they already were with the buy; the latest pool an open position was valued on is kept as `mark`;
- the buy, the half-sale and the exit are re-priced with the same constant-product formulas on those saved reserves, one transaction cost per leg; at 0.2 SOL the result equals the recorded trade exactly (tested);
- declared limits: the moments are those of the 0.2 SOL trade (a larger position's stop would trigger slightly earlier); each leg is priced on the pool as observed, without the larger buy's own effect on it (the cautious side: on a flat price it understates the round trip by 2n/(Q+2n) for a buy of n SOL into effective reserves Q); other traders' reaction to a larger buy is unknowable. It is an estimate of size sensitivity, not a second simulation;
- a sale recorded before reserves were saved (the owner chose to keep the existing statistics rather than start a new database, and asked for an estimate): its pool is rebuilt from the sale itself — the constant-product pool with the buy pool's k on which the recorded tokens fetch the recorded SOL. Exact at 0.2 SOL; at other stakes off by however much k changed between buy and sale. Marked `est` and counted on the page;
- a routed-quote (sampled) trade, whose quotes were for the 0.2 SOL size, cannot be re-priced: shown as "0.2 SOL only" and counted, never scaled linearly.
