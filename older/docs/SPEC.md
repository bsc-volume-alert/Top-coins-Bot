# Older-coin paper project — frozen specification `older-8`
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
- a routed-quote (sampled) trade, whose quotes were for the 0.2 SOL size, cannot be re-priced. It is not left out (that changed which trades a book held from one stake to the next): it keeps its 0.2 SOL percentage result on the larger stake, with no extra impact taken off, flagged `flat` and counted on the page. Every stake shows the same set of trades.

## Data-trust rules added after the sixth independent review (21 Nov 2026, 14:45 UK)

- **Loss and recovery are different moments.** When a coin's data is lost, its history restarts at the first valid observation that arrives afterwards, not at the moment of the loss.
- **An exact window needs a known starting price.** FAST, SECOND-WAVE and the fresh-crossing check require unbroken exact observation over the window and an exact price already standing at its start. Observations that only begin inside the window do not make it exact.
- **Compression never changes a decision price.** Beyond `RAW_CAP`, merged same-second entries keep their lowest, highest, first and last price and their first and last time; the newest observation is never merged; an exact window cannot start inside a merged second.

## older-6 (21 Nov 2026, 16:00 UK — owner's decision): three faster volume-breakout books

| Family | High to break | Signal volume | Baseline (median bucket) | History needed |
|---|---|---|---|---|
| HH30-5M | preceding 30 minutes | last 5 completed minutes | 24 five-minute buckets = the 2 hours before | 2 h 5 min |
| HH30-10M | preceding 30 minutes | last 10 completed minutes | 12 ten-minute buckets = the 2 hours before | 2 h 10 min |
| HH15-5M | preceding 15 minutes | last 5 completed minutes | 12 five-minute buckets = the 1 hour before | 1 h 5 min |

Rule, identical in form to HH-BREAK: price strictly above the high of the preceding window, in the band, and signal volume ≥ 2 × the median baseline bucket. Half-open windows on the last completed minute boundary; candle selection as in HH-BREAK. A zero baseline (the median bucket had no volume) is recorded and not entered. **No dollar floor (owner's decision).** Known limit, tested and on record: a coin with one small trade in at least half of its baseline buckets has a tiny non-zero norm, so a new high on one more small trade qualifies. The volume, buys and buyers in the 1 / 3 / 5 minutes before every entry are recorded, so the effect of any floor can be measured afterwards from the same buys. PumpSwap live only (price polling has no volume). One entry per family per coin per age group, as everywhere.

20 families × 4 ages × 5 stops × 2 exit policies = **800 comparisons**.

## older-7 (21 Nov 2026, 16:40 UK — owner's decision): HH-BREAK-4H, a clock book

**HH-BREAK-4H** shares every HH-BREAK buy (one entry, as CONT-STALL shares CONT's) and carries its own exit versions: the same five trailing stops and two exit policies, plus one rule — **4 hours after the fill, a position still open is sold** (0.7 s later, on the pool state in force, like every sale; reason "clock"). A stop that triggers before 4 hours works exactly as in HH-BREAK. HH-BREAK itself is unchanged. Clock books are declared in `spec.mjs CLOCK` (CONT-STALL: 60 minutes, only if the position never reached 1.15×; HH-BREAK-4H: 4 hours, unconditional). 21 families, **840 comparisons**.

Evidence behind it (84 HH-BREAK buys, minute-bar replay, 21 Nov 16:35 UK): 74 of 84 open on the 40% stop; time to 2× for the seven that got there: 40, 56, 82, 144, 176, 287, 297 minutes; a 1- or 2-hour clock would have cut the book's result to about −0.1 / +0.3 SOL against +0.7 to +1.2 as it stood, a 4-hour clock about +1.0. One day, a handful of coins: not a tuned number.

**Existing buys are carried into the new book (owner's request), once, at start-up** (`migrate.mjs`): a version that had stopped out before its 4-hour mark keeps its real result; a position younger than 4 hours is copied live and the engine runs its clock; a position past its 4-hour mark gets an **estimated** clock sale — price from the last one-minute bar close at or before the mark (no bar since the buy = unchanged), sold on the constant-product pool with the buy pool's k at that price, fee and transaction cost charged. Estimated sales carry `exit.est = true`, `exec: "estimated-minute-bar"` and are marked "est." and counted on the page. Limits: a minute close is not the state 0.7 s after the mark; the bar ratio is in USD; k is assumed unchanged. On a fresh database nothing is estimated.

## older-8 (21 Nov 2026, 21:15 UK — owner's decisions): eight any-age books

These books are evaluated **from migration on** — including the first 8 hours of a coin's life, a new age group **A0** used only by them — and in the four existing age groups. Every other book still starts at 8 hours. Migrated coins only (the feed sees the canonical PumpSwap pool and nothing before it), live observation only. One entry per family per coin per age group. Same fills, stops, exit policies and 24-hour limit as every book.

| Family | Rule |
|---|---|
| VOL300K | USD volume of the exact observations in the last 5 minutes ≥ $300,000 |
| VOL300K-UP | the same, and the price above the exact price 5 minutes ago |
| VOL500K / VOL500K-UP | the same at $500,000 |
| RUG450 | highest observed market cap ≥ $450,000, and the market cap freshly crosses down to 20% of that peak (80% below it): bought at the crossing |
| RUG450-BOUNCE | armed by that crossing; follows the low; bought at the first fresh crossing up through 1.30 × the low, within 24 hours of arming |
| RUG950 / RUG950-BOUNCE | the same with a $950,000 peak (the books nest: such a coin also qualifies for the 450 books, on one shared entry) |

- **VOL band:** $40K–$2M at the buy (the owner's limit for these four; all other books $40K–$1M). The 5-minute window must be fully observed (no feed outage, no loss of the coin's data inside it), otherwise nothing is decided.
- **RUG band:** $40K–$1M at the buy. A crossing or a bounce outside the band is not bought; a bounce spends the setup either way.
- **Peak:** the highest market cap this program has observed for the coin **without a break in observation** (see the seventh-review rules below). Peaks from before the coin was watched are unknown, so a coin that crashed earlier is not armed.
- No time limit between peak and fall (the owner asked for none); `fall_s` (peak to crossing) and `wait_s` (arming to bounce) are recorded on each entry so slow bleeds and fast collapses can be separated afterwards. VOL entries record the 5-minute volume and the 5-minute price change.

29 families: 21 × 4 age groups + 8 × 5 age groups = 124 book-ages × 5 stops × 2 exit policies = **1,240 comparisons**.

## Data-trust rules added after the seventh independent review (22 Nov 2026, 00:10 UK)

1. **RUG state is memory only, and is evidence only over unbroken observation.** The peak, the armed setup and its low live in the running program and nowhere else: nothing about them is stored with the coin. They are discarded when the program restarts, when the feed drops, when the coin's data is lost, and when the coin changes observation method. A RUG entry therefore needs the peak, the fall and (for the bounce books) the low and the rise to have been watched in one unbroken stretch. A setup abandoned this way is recorded ("abandoned: observation broke during the setup"). Observation methods that cannot support the RUG books (sampled quotes) build no RUG state at all.
2. **A price window needs a known starting price.** For windows that take a low or a high over a period (LOW4H's 4 hours, CONT's hour, the HH books' high window, the recorded measurements), "nothing was missed" is not enough: the price at the start of the window must be known as well — an observation at or before the window start, inside the same unbroken stretch. A long quiet period that was watched throughout still counts: the last price before it stands. Volume windows keep the coverage rule alone.
3. **VOL: volume at a merged second.** When a coin's history has been compressed and the 5-minute cut-off falls inside a merged second, the volume on each side of the cut-off cannot be separated. The VOL books then record "volume not known, not decided" and decide nothing at that trade; they never use a figure that is too low or too high.
4. **An entry and its one-buy flags are written in one commit.** On start-up every stored entry is checked against its flags and missing flags are restored before anything is evaluated.
5. **Estimated sales are not results.** A sale that was estimated rather than observed (the older HH-BREAK-4H sales carried in on 21 Nov) is shown on its own line and is excluded from every total, ranking, win rate and period figure. The estimate uses the last minute bar completed before the clock time, never the minute containing it and never a rejected back-fill bar. A fresh database contains none.
6. **Display:** a half-sold position's "high while held" is the best the position was actually worth (banked half + the rest), not the original position's high; a sale's market cap is always marked approximate (it uses the SOL price and supply recorded at the buy); a book's "counting since" is set when the program starts, not when the page is first opened.

## Transfer-fee coins (22 Nov 2026, 00:40 UK — owner's decision)

Until now every Token-2022 coin with a transfer fee above zero was blocked. From this version:

- **Allowed when the fee is at most 5%** (`XFER_FEE_MAX_BPS = 500`); above 5% the coin stays blocked. The fee used is the higher of the fee in force and the fee already scheduled on the mint; the mint's per-transfer cap is ignored, so the fee is never understated.
- **Deducted twice from the paper result:** off the tokens received at the buy, and off the proceeds of every sale (half sale and final sale). A 5% fee therefore costs about 9.75% of the trade on top of the ordinary costs.
- **The stop works on what the position is really worth.** A fee coin starts below its cost by about two fees, so its trailing stop has less room: on a 5% fee and a 20% stop, roughly an 11% fall from the buy price closes it.
- **Sampled method only.** The fee is applied to the routed quotes. On the live (pool-state) method the fee is not modelled, so a fee coin there is not entered.
- **Assumption, declared:** the routed quote is treated as NOT already including the transfer fee. If a router does net it, these results are too low by up to two fees — never too high. To be measured on the first fee-coin trades.
- **Marked:** every such trade carries `token.xfer_bps` and an asterisk on the page with the fee; `entries.json` carries `fee`. They count in the totals, net of the fee.
- **Unchanged:** coins with a transfer hook, a permanent delegate, pausable or non-transferable tokens, confidential transfers or frozen default accounts stay blocked whatever their fee.
- Claude advised a limit of 1–2%; the owner chose 5% "for now", to be revisited with data.

