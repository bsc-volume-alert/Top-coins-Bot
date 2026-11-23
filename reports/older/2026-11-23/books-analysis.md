# Older-coins paper books: book-by-book analysis
_Data: the bot's published record at 2026-11-23 19:26 UTC (= UK time) on 23 Nov 2026, run started 20 Nov 14:53. 2258 filled paper buys on 266 coins; 0.2 SOL each; results are after the modelled costs. Written by Claude; method and limits at the end. Snapshot of the data used: `entries-snapshot.json` in this folder; one line per buy per book: `trades.csv`; one line per coin: `coins.csv`._

## The short version
- **No book has shown an edge.** Counting each first buy once: 1164 closed at the 30% stop, 27% winners, −15.24 SOL (−6.5% a trade); negative at every stop, with or without the best coins, and on buys older than a day.
- **The winners are not big enough for the win rate.** At the 30% stop the average winner made +36.3% and the average loser −22.7%, so a book needs about 38% winners to break even. The books got 27%. Only HH-BREAK (40–42%) and SLOW-BUILD (37–39%, on just 19 buys) are in that range.
- **Two good days, two bad days.** 20–21 Nov: about flat (+0.8% and +0.3% a trade). 22 Nov: −10.7%. 23 Nov: −16.1%. Every book follows that pattern, so three days cannot separate a good book from a good day.
- **Buying again made it worse.** 1044 re-buys; closed at the 30% stop: 513, 16% winners, −8.71 SOL (−8.5% a trade, against −6.5% for first buys).
- **The same coins are bought by many books.** 266 coins; the median coin was bought by 5 books. 59 coins were profitable overall (+14.5 SOL), 201 were not (−29.8 SOL). The real sample is about 266 coins, not 1214 trades.
- **Verdicts (my opinion, from this sample):** keep 10 books to collect more evidence, remove 19. At the 30% stop the kept books account for −3.5 SOL of the first-buy losses, the removed books for −25.6 SOL, and re-buys for −13.4 SOL (book rows; a buy shared by several books is counted in each).

## Verdict table
| Book | Verdict | First buys | Coins | Winners (30% stop) | SOL at 30% stop | Without best coin | Best exit (SOL) | Re-buys at 30% (SOL) |
|---|---|---|---|---|---|---|---|---|
| AGE-DOUBLE | **CULL** | 32 | 27 | 17% of 29 | −0.94 | −1.09 | −0.44 (half at 2×, 60%) | −0.67 on 17 |
| LOW4H | **KEEP** | 36 | 31 | 29% of 34 | −0.21 | −0.59 | +0.04 (trail 20%) | −0.15 on 9 |
| LOW4H-LIQ25K | **CULL** | 16 | 15 | 14% of 14 | −0.44 | −0.50 | −0.13 (half at 2×, 60%) | +0.13 on 2 |
| SLOW-BUILD | **KEEP** | 20 | 18 | 37% of 19 | −0.13 | −0.26 | +0.25 (half at 2×, 40%) | −0.11 on 2 |
| CONT | **KEEP** | 161 | 123 | 27% of 154 | −1.41 | −2.08 | −0.91 (trail 25%) | −0.90 on 40 |
| CONT-STALL | **CULL** | 161 | 123 | 19% of 159 | −2.27 | −2.75 | −1.65 (trail 25%) | −0.18 on 44 |
| HH-BREAK | **KEEP** | 172 | 162 | 40% of 162 | +0.37 | −0.00 | +0.75 (half at 2×, 40%) | −1.02 on 53 |
| HH-BREAK-4H | **CULL** | 172 | 162 | 37% of 172 | −0.00 | −0.37 | +0.07 (half at 2×, 30%) | −0.68 on 185 |
| HH30-5M | **CULL** | 201 | 170 | 28% of 191 | −3.15 | −3.39 | −2.55 (half at 2×, 20%) | −1.88 on 92 |
| HH30-10M | **CULL** | 202 | 175 | 25% of 191 | −3.50 | −3.74 | −2.52 (half at 2×, 20%) | −2.08 on 84 |
| HH15-5M | **CULL** | 225 | 183 | 28% of 218 | −2.50 | −2.75 | −2.14 (half at 2×, 30%) | −3.45 on 129 |
| FAST-1M | **CULL** | 31 | 31 | 19% of 31 | −0.91 | −1.01 | −0.40 (trail 20%) | +0.07 on 3 |
| FAST-3M | **KEEP** | 39 | 39 | 26% of 39 | −0.63 | −0.82 | −0.28 (half at 2×, 25%) | −0.08 on 7 |
| FAST-5M | **CULL** | 43 | 42 | 24% of 42 | −0.85 | −1.05 | −0.60 (half at 2×, 25%) | −0.14 on 9 |
| FAST-10M | **CULL** | 36 | 34 | 14% of 35 | −0.97 | −1.26 | −0.64 (half at 2×, 20%) | −0.25 on 9 |
| FAST-30M | **CULL** | 40 | 35 | 15% of 39 | −1.07 | −1.24 | −0.76 (trail 20%) | −0.39 on 16 |
| FAST150-1M | **CULL** | 93 | 82 | 24% of 92 | −1.48 | −1.83 | −0.93 (trail 25%) | −0.13 on 25 |
| FAST150-3M | **CULL** | 107 | 93 | 25% of 106 | −1.38 | −1.73 | −0.87 (trail 25%) | −0.38 on 33 |
| FAST150-5M | **KEEP** | 117 | 99 | 24% of 115 | −1.26 | −1.63 | −1.08 (trail 25%) | −0.61 on 40 |
| FAST150-10M | **CULL** | 102 | 84 | 21% of 99 | −1.76 | −2.14 | −1.35 (trail 25%) | −0.31 on 38 |
| SECOND-WAVE | **CULL** | 16 | 16 | 13% of 16 | −0.48 | −0.59 | −0.16 (trail 60%) | +0.07 on 3 |
| VOL300K | **CULL** | 5 | 5 | 0% of 5 | −0.59 | −0.54 | −0.45 (trail 20%) | −0.24 on 2 |
| VOL300K-UP | **KEEP** | 2 | 2 | 0% of 2 | −0.10 | −0.05 | −0.05 (trail 20%) | −0.05 on 1 |
| VOL500K | **CULL** | 3 | 3 | 0% of 3 | −0.49 | −0.35 | −0.40 (trail 20%) | – |
| VOL500K-UP | **KEEP** | 0 | 0 | – | – | – | – | – |
| RUG450 | **CULL** | 24 | 23 | 14% of 22 | −1.79 | −1.88 | −1.58 (half at 2×, 40%) | – |
| RUG450-BOUNCE | **KEEP** | 8 | 8 | 25% of 8 | −0.15 | −0.41 | −0.08 (trail 20%) | – |
| RUG950 | **CULL** | 15 | 15 | 15% of 13 | −1.04 | −1.13 | −0.99 (half at 2×, 30%) | – |
| RUG950-BOUNCE | **KEEP** | 2 | 2 | 50% of 2 | −0.02 | −0.04 | +0.00 (trail 25%) | – |
| FEE-COINS | – | 0 | 0 | – | – | – | – | – |

FEE-COINS has not bought anything yet, so there is nothing to judge.

## What I would change, in order
1. **Switch buying again off.** It added 1044 buys and −8.71 SOL at the 30% stop, with fewer winners than first buys at the 25% and 30% stops.
2. **Remove the 19 books marked CULL** (AGE-DOUBLE, LOW4H-LIQ25K, CONT-STALL, HH-BREAK-4H, HH30-5M, HH30-10M, HH15-5M, FAST-1M, FAST-5M, FAST-10M, FAST-30M, FAST150-1M, FAST150-3M, FAST150-10M, SECOND-WAVE, VOL300K, VOL500K, RUG450, RUG950). They are losers at every stop in both halves of the run, or copies of a better sister book, or books whose losses run far through the stop.
3. **Drop the 60% stop.** First buys: −15.4% a trade against −6.5% at 30%; the average loser lost 37%.
4. **From the 30% stop up, sell half at 2×.** 40% stop: −17.0 SOL against −20.7 for the plain trail. At 20–25% the two exits are the same.
5. **Run the 10 kept books unchanged for a clean week before judging them.** The slices marked "to test" below were found by looking at these trades, so they flatter; only new trades can confirm them.

## Whole run
### First buys, each counted once
| Stop | Closed | Winners | SOL (trail) | A trade | Without best coin | Without best 3 | First half / second half | SOL (half at 2×) |
|---|---|---|---|---|---|---|---|---|
| 20% | 1181 | 26% | −15.10 | −6.4% | −16.28 | −17.62 | −4.02 / −11.08 | −15.07 |
| 25% | 1171 | 26% | −14.36 | −6.1% | −15.77 | −17.86 | −1.94 / −12.41 | −14.35 |
| 30% | 1164 | 27% | −15.24 | −6.5% | −17.31 | −19.39 | −0.96 / −14.28 | −14.53 |
| 40% | 1144 | 28% | −20.72 | −9.0% | −22.13 | −24.60 | −1.04 / −19.67 | −17.00 |
| 60% | 802 | 24% | −24.81 | −15.4% | −31.22 | −33.28 | −10.24 / −14.57 | −20.15 |

### Re-buys
| Stop | Closed | Winners | SOL (trail) | A trade | Without best coin |
|---|---|---|---|---|---|
| 20% | 823 | 21% | −10.99 | −6.7% | −12.55 |
| 25% | 654 | 18% | −10.10 | −7.7% | −11.35 |
| 30% | 513 | 16% | −8.71 | −8.5% | −10.53 |
| 40% | 333 | 21% | −4.93 | −7.4% | −6.42 |
| 60% | 186 | 20% | −4.84 | −13.0% | −5.72 |

### By day (first buys, 30% stop)
| Day | First buys | Coins | Winners | A trade | Median peak after the buy | Reached 1.5× | Never rose 10% |
|---|---|---|---|---|---|---|---|
| 20 Nov | 77 | 39 | 34% | +0.8% | 1.51× | 52% | 17% |
| 21 Nov | 453 | 157 | 34% | +0.3% | 1.19× | 34% | 39% |
| 22 Nov | 461 | 151 | 23% | −10.7% | 1.22× | 34% | 39% |
| 23 Nov | 223 | 79 | 19% | −16.1% | 1.19× | 30% | 39% |

### By coin age and size (first buys, 30% stop)
| Group | Closed | Winners | SOL | A trade |
|---|---|---|---|---|
| Under 8 hours | 15 | 7% | −1.17 | −38.7% |
| 8–16 hours | 111 | 23% | −2.70 | −12.1% |
| 16–24 hours | 125 | 30% | −0.88 | −3.5% |
| 24–36 hours | 101 | 24% | −1.05 | −5.2% |
| 36 hours – 90 days | 812 | 28% | −9.46 | −5.8% |
| Under $60K | 414 | 26% | −5.75 | −6.9% |
| $60K–$100K | 277 | 29% | −2.35 | −4.2% |
| $100K–$200K | 237 | 23% | −5.01 | −10.6% |
| $200K–$400K | 112 | 38% | +0.09 | +0.4% |
| $400K and over | 124 | 28% | −2.22 | −8.9% |

Nothing the bot records at the moment of buying separates winners from losers across the books: 5-minute volume, buyers in 1 and 5 minutes, traders, top-5 buyer share, holders, holder change and volume surge were each split into five bands, and every band of every measure is negative at the 30% stop. Busier coins did worse, not better (50+ buyers in 5 minutes: −10.2% a trade; under 3: −3.8%).

## Coins
### The ten coins that made the most (first buys, 30% stop)
| Coin | First bought | First buys | Books | Re-buys | Entry size | Peak after a buy | First buys SOL | Re-buys SOL |
|---|---|---|---|---|---|---|---|---|
| HuN5y4 | 21 Nov 17:11 | 23 | 18 | 45 | $47K–$305K | 6.2× | +2.07 | +1.82 |
| GKFSuS | 20 Nov 17:07 | 12 | 19 | 6 | $44K–$372K | 10.2× | +1.11 | −0.24 |
| Bivugv | 20 Nov 17:06 | 4 | 8 | 0 | $51K–$282K | 5.0× | +0.97 | +0.00 |
| 7R4MP6 | 21 Nov 16:14 | 8 | 11 | 3 | $126K–$900K | 8.1× | +0.80 | −0.05 |
| EV7J2Q | 21 Nov 08:47 | 15 | 12 | 17 | $153K–$857K | 5.8× | +0.79 | −0.17 |
| 7cFiqd | 23 Nov 09:15 | 7 | 8 | 0 | $616K–$916K | 5.6× | +0.77 | +0.00 |
| USEu5q | 22 Nov 02:19 | 6 | 11 | 8 | $57K–$198K | 3.1× | +0.68 | +0.02 |
| 4eiNbS | 20 Nov 16:19 | 11 | 13 | 7 | $66K–$110K | 2.5× | +0.66 | −0.03 |
| 412ECW | 21 Nov 01:13 | 6 | 10 | 8 | $312K–$836K | 3.3× | +0.63 | −0.23 |
| 8rjgC1 | 21 Nov 06:25 | 6 | 10 | 12 | $67K–$732K | 5.2× | +0.58 | −0.05 |

### The ten coins that lost the most
| Coin | First bought | First buys | Books | Re-buys | Entry size | Peak after a buy | First buys SOL | Re-buys SOL |
|---|---|---|---|---|---|---|---|---|
| 82mseL STREETS | 22 Nov 06:57 | 4 | 3 | 0 | $99K–$109K | 1.1× | −0.73 | +0.00 |
| Fn95Nt | 22 Nov 00:01 | 10 | 15 | 0 | $148K–$852K | 2.1× | −0.73 | +0.00 |
| 8xegBR | 21 Nov 19:15 | 14 | 19 | 36 | $40K–$243K | 5.1× | −0.57 | −0.38 |
| 3D7YQc | 22 Nov 13:02 | 10 | 7 | 2 | $65K–$597K | 1.4× | −0.50 | −0.01 |
| 7CvW68 | 22 Nov 09:17 | 20 | 18 | 13 | $41K–$124K | 3.9× | −0.47 | +0.16 |
| 2g3NFp | 21 Nov 08:31 | 8 | 10 | 0 | $40K–$58K | 1.3× | −0.47 | +0.00 |
| 3b7Wvf | 21 Nov 22:15 | 9 | 11 | 0 | $40K–$191K | 1.2× | −0.46 | +0.00 |
| 3zJufN | 21 Nov 15:08 | 8 | 15 | 0 | $41K–$58K | 1.5× | −0.46 | +0.00 |
| DFKwjU | 21 Nov 17:27 | 9 | 15 | 19 | $40K–$69K | 1.8× | −0.44 | −0.39 |
| S5eZMs | 23 Nov 02:25 | 6 | 14 | 6 | $102K–$128K | 1.3× | −0.43 | −0.30 |

All 266 coins are in `coins.csv`. Coins are shown by the first six characters of their address; the bot has a name for only 34 of them.

## Book by book
Each table is first buys only. "Peak" is the highest the position was worth after the buy, as a multiple of what was paid, whether or not the stop had already sold it.

### AGE-DOUBLE — CULL
_Rule: market cap crosses 2× what it was at the start of the coin's age group (8 / 16 / 24 / 36 hours old)._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 32, 19%, −0.63 | 32, 19%, −0.73 | 29, 17%, −0.94 | 28, 18%, −0.84 | 12, 17%, −0.78 |
| Half at 2×: closed, winners, SOL | 32, 19%, −0.59 | 32, 19%, −0.70 | 29, 17%, −0.87 | 28, 18%, −0.74 | 12, 25%, −0.44 |
| Trail without best coin | −0.78 | −0.88 | −1.09 | −1.07 | −0.80 |
| Trail, first half / second half | −0.20 / −0.43 | −0.16 / −0.57 | −0.38 / −0.56 | −0.16 / −0.68 | −0.32 / −0.46 |

- 32 first buys on 27 coins; 3 still open at the 30% stop. By day at the 30% stop: 20 Nov 3 buys +0.04; 21 Nov 6 buys −0.21; 22 Nov 8 buys −0.15; 23 Nov 12 buys −0.63.
- Peak after the buy: 41% reached 1.5×, 25% reached 2×, 9% reached 3×; median 1.30×.
- Re-buys: 46; closed at the 30% stop 17, 6% winners, −0.67 SOL.
- Best buys at the 30% stop: 6zzzG4 (20 Nov 16:40, $125K, peak 2.1×, +73.9%); HuN5y4 (22 Nov 23:39, $140K, peak 2.4×, +64.3%); 3umHFk (21 Nov 11:01, $92K, peak 3.0×, +35.1%).
- Worst buys: S5eZMs (23 Nov 03:12, $102K, peak 1.3×, −39.0%); DUZrwd (21 Nov 00:03, $132K, peak 1.1×, −37.3%); 6fVQAu (23 Nov 08:11, $47K, peak 1.0×, −33.0%).
- **What worked:** The 5 winners were coins that kept doubling after the buy (median peak 2.1× the entry).
- **What failed:** 24 of 29 closed buys lost; the losers' median peak was 1.27×. "Twice the value at the start of the age group" fires after the move has happened. Negative at every stop, in both halves and on 21, 22 and 23 Nov. Its re-buys were the worst in the set (5% winners at the 20% stop).
- **How to improve:** Nothing in the data supports a fix. The only flat slice ($100K–$200K) is 6 trades.

### LOW4H — KEEP
_Rule: price crosses 2× its lowest of the last 4 hours._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 34, 32%, +0.04 | 34, 29%, −0.26 | 34, 29%, −0.21 | 33, 33%, −0.29 | 18, 33%, −0.54 |
| Half at 2×: closed, winners, SOL | 34, 32%, +0.04 | 34, 29%, −0.22 | 34, 29%, −0.08 | 33, 33%, −0.05 | 18, 39%, −0.03 |
| Trail without best coin | −0.29 | −0.55 | −0.59 | −0.59 | −0.73 |
| Trail, first half / second half | −0.36 / +0.39 | −0.42 / +0.15 | −0.29 / +0.08 | −0.12 / −0.17 | −0.51 / −0.03 |

- 36 first buys on 31 coins; 2 still open at the 30% stop. By day at the 30% stop: 21 Nov 12 buys −0.07; 22 Nov 16 buys +0.17; 23 Nov 6 buys −0.31.
- Peak after the buy: 50% reached 1.5×, 33% reached 2×, 17% reached 3×; median 1.68×.
- Re-buys: 12; closed at the 30% stop 9, 22% winners, −0.15 SOL.
- Best buys at the 30% stop: HuN5y4 (22 Nov 23:21, $72K, peak 4.2×, +188.5%); Fvv62M (22 Nov 20:37, $67K, peak 2.4×, +65.2%); 3umHFk (21 Nov 10:41, $78K, peak 3.5×, +58.6%).
- Worst buys: CWKbSd (21 Nov 11:53, $98K, peak 1.0×, −36.1%); KMifrk (21 Nov 09:33, $403K, peak 1.0×, −34.2%); 9M4PDv (23 Nov 13:55, $43K, peak 1.0×, −33.1%).
- **What worked:** Half of its buys later traded 1.5× above entry, a third 2× and a sixth 3× (median peak 1.68×) — with SLOW-BUILD the best follow-through of any book. Roughly flat with the half-at-2× exit at every stop.
- **What failed:** All 5 buys above $400K lost; 0 of 6 won on 23 Nov. The mature set (24 buys older than a day) is −8.8% a trade at the 30% stop.
- **How to improve:** To test, not proven: no buys above $400K; half-at-2× exit (it lifts the 30% and 40% stops from −0.21 / −0.29 SOL to −0.08 / −0.05). Needs 60+ buys before any judgement.

### LOW4H-LIQ25K — CULL
_Rule: LOW4H, only with $25K+ pool liquidity and under 5% price impact in and out._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 14, 21%, −0.27 | 14, 21%, −0.28 | 14, 14%, −0.44 | 13, 15%, −0.41 | 5, 40%, −0.22 |
| Half at 2×: closed, winners, SOL | 14, 21%, −0.27 | 14, 21%, −0.28 | 14, 14%, −0.44 | 13, 15%, −0.38 | 5, 40%, −0.13 |
| Trail without best coin | −0.32 | −0.36 | −0.50 | −0.55 | −0.28 |
| Trail, first half / second half | −0.13 / −0.14 | −0.07 / −0.21 | −0.14 / −0.30 | −0.05 / −0.36 | −0.19 / −0.03 |

- 16 first buys on 15 coins; 2 still open at the 30% stop. By day at the 30% stop: 21 Nov 6 buys −0.08; 22 Nov 5 buys −0.20; 23 Nov 3 buys −0.16.
- Peak after the buy: 44% reached 1.5×, 25% reached 2×, 13% reached 3×; median 1.32×.
- Re-buys: 3; closed at the 30% stop 2, 50% winners, +0.13 SOL.
- Best buys at the 30% stop: GKFSuS (21 Nov 11:56, $118K, peak 3.1×, +29.1%); uHMWNF (21 Nov 05:12, $158K, peak 1.7×, +23.8%).
- Worst buys: CWKbSd (21 Nov 11:53, $98K, peak 1.0×, −36.1%); KMifrk (21 Nov 09:33, $403K, peak 1.0×, −34.2%); 3umHFk (22 Nov 06:53, $197K, peak 1.0×, −30.8%).
- **What worked:** Two winners (peaks 3×+).
- **What failed:** It is LOW4H with a $25K liquidity floor, and it is worse than its parent at the 20–40% stops (14–21% winners). The floor removes the small coins where LOW4H's gains were ($60K–$100K) and keeps the large ones where it lost.
- **How to improve:** None. The parent book covers it.

### SLOW-BUILD — KEEP
_Rule: price crosses 2× its 4-hour low, only if the climb took 30+ minutes with no 1-minute candle above +20%._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 19, 37%, −0.07 | 19, 32%, −0.21 | 19, 37%, −0.13 | 18, 39%, +0.04 | 9, 44%, −0.09 |
| Half at 2×: closed, winners, SOL | 19, 37%, −0.06 | 19, 32%, −0.18 | 19, 37%, +0.02 | 18, 39%, +0.25 | 9, 44%, +0.21 |
| Trail without best coin | −0.26 | −0.36 | −0.26 | −0.30 | −0.26 |
| Trail, first half / second half | −0.13 / +0.06 | −0.11 / −0.10 | +0.08 / −0.21 | +0.34 / −0.31 | −0.13 / +0.04 |

- 20 first buys on 18 coins; 1 still open at the 30% stop. By day at the 30% stop: 21 Nov 8 buys +0.13; 22 Nov 9 buys −0.14; 23 Nov 2 buys −0.12.
- Peak after the buy: 55% reached 1.5×, 40% reached 2×, 25% reached 3×; median 1.79×.
- Re-buys: 2; closed at the 30% stop 2, 0% winners, −0.11 SOL.
- Best buys at the 30% stop: Fvv62M (22 Nov 20:37, $67K, peak 2.4×, +65.2%); 3umHFk (21 Nov 10:41, $78K, peak 3.5×, +58.6%); Q1vecE (21 Nov 02:22, $59K, peak 2.1×, +45.4%).
- Worst buys: CWKbSd (21 Nov 11:53, $98K, peak 1.0×, −36.1%); 8xegBR (22 Nov 19:23, $55K, peak 4.3×, −31.2%); DFKwjU (22 Nov 11:34, $65K, peak 1.1×, −30.6%).
- **What worked:** The best follow-through in the set: 55% of buys later traded 1.5× above entry, 40% reached 2×, 25% reached 3×. 32–44% winners. Slightly positive with half-at-2× at the 40% and 60% stops.
- **What failed:** Only 20 buys, and negative without its best coin at most stops. Positive on 21 Nov, negative on 22 and 23 Nov. Buys with few buyers in the 5 minutes before (median 8 for losers against 16 for winners) and one wallet group dominating (top-5 share 0.72 against 0.48) lost more often — 7 winners against 12 losers, a hint only.
- **How to improve:** Leave the rule alone until 60+ buys. Use a wide stop with half sold at 2×: its winners run.

### CONT — KEEP
_Rule: price 30%+ above 15 minutes ago and within 5% of its 1-hour high._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 160, 21%, −2.65 | 155, 27%, −0.91 | 154, 27%, −1.41 | 149, 22%, −2.58 | 82, 22%, −3.74 |
| Half at 2×: closed, winners, SOL | 160, 21%, −2.54 | 155, 27%, −1.18 | 154, 27%, −1.70 | 149, 22%, −2.36 | 82, 29%, −2.49 |
| Trail without best coin | −2.81 | −1.48 | −2.08 | −3.06 | −3.95 |
| Trail, first half / second half | −1.11 / −1.54 | −0.02 / −0.89 | −0.00 / −1.40 | −0.29 / −2.29 | −1.51 / −2.22 |

- 161 first buys on 123 coins; 7 still open at the 30% stop. By day at the 30% stop: 20 Nov 20 buys +0.46; 21 Nov 41 buys −0.01; 22 Nov 55 buys −1.12; 23 Nov 38 buys −0.74.
- Peak after the buy: 39% reached 1.5×, 25% reached 2×, 13% reached 3×; median 1.34×.
- Re-buys: 63; closed at the 30% stop 40, 20% winners, −0.90 SOL.
- Best buys at the 30% stop: HuN5y4 (22 Nov 20:20, $50K, peak 5.9×, +302.5%); Bivugv (20 Nov 17:06, $51K, peak 5.0×, +243.1%); 7cFiqd (23 Nov 12:41, $781K, peak 4.5×, +145.6%).
- Worst buys: S5eZMs (23 Nov 03:30, $128K, peak 1.1×, −51.0%); Hm1QUy (22 Nov 17:19, $40K, peak 2.0×, −46.5%); Eysagj (23 Nov 09:54, $84K, peak 1.0×, −44.5%).
- **What worked:** 20–21 Nov: 61 buys, about +0.45 SOL at the 30% stop. Under $100K: 102 buys at −0.8% a trade.
- **What failed:** 22–23 Nov: 93 buys, −1.86 SOL. Above $100K: 52 buys at −11.9% a trade; $100K–$200K had 3 winners in 30. Negative overall at every stop. Its re-buys lost a further 0.90 SOL at the 30% stop.
- **How to improve:** To test: buy only under $100K (luck check p = 0.08, so not established); 25% stop (its least bad); no re-buys. Kept as the single continuation book — it is not a winner.

### CONT-STALL — CULL
_Rule: the same buys as CONT, sold at 60 minutes if the position never reached 1.15×._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 161, 19%, −2.41 | 159, 19%, −1.65 | 159, 19%, −2.27 | 159, 14%, −3.11 | 102, 14%, −3.48 |
| Half at 2×: closed, winners, SOL | 161, 19%, −2.34 | 159, 19%, −1.84 | 159, 19%, −2.35 | 159, 14%, −2.72 | 102, 20%, −2.15 |
| Trail without best coin | −2.57 | −2.18 | −2.75 | −3.51 | −3.70 |
| Trail, first half / second half | −1.21 / −1.21 | −0.40 / −1.25 | −0.71 / −1.56 | −1.10 / −2.00 | −1.51 / −1.97 |

- 161 first buys on 123 coins; 2 still open at the 30% stop. By day at the 30% stop: 20 Nov 20 buys +0.36; 21 Nov 41 buys −0.47; 22 Nov 55 buys −1.54; 23 Nov 43 buys −0.62.
- Peak after the buy: 39% reached 1.5×, 25% reached 2×, 13% reached 3×; median 1.34×.
- Re-buys: 63; closed at the 30% stop 44, 20% winners, −0.18 SOL.
- Best buys at the 30% stop: Bivugv (20 Nov 17:06, $51K, peak 5.0×, +243.1%); 7cFiqd (23 Nov 12:41, $781K, peak 4.5×, +145.6%); ELbCDk (21 Nov 00:33, $42K, peak 3.9×, +132.4%).
- Worst buys: Hm1QUy (22 Nov 17:19, $40K, peak 2.0×, −46.5%); 6fVQAu (22 Nov 15:11, $50K, peak 1.1×, −35.7%); H1jcPQ (20 Nov 17:23, $42K, peak 1.0×, −33.7%).
- **What worked:** Nothing that CONT did not do.
- **What failed:** The same buys as CONT with a sale at 60 minutes when the position has not reached 1.15×. That sale lowers the share of winners from 22–27% to 14–19% and makes the result worse at the 20%, 25%, 30% and 40% stops (−2.27 against −1.41 SOL at 30%). It closes positions that would have recovered, and does not shrink the average loss.
- **How to improve:** None. Keep CONT.

### HH-BREAK — KEEP
_Rule: new 60-minute high with the last 15 minutes' volume at 2× the 4-hour norm._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 163, 37%, −0.40 | 163, 37%, −0.14 | 162, 40%, +0.37 | 158, 42%, −0.10 | 64, 31%, −1.82 |
| Half at 2×: closed, winners, SOL | 163, 37%, −0.35 | 163, 37%, −0.03 | 162, 40%, +0.73 | 158, 42%, +0.75 | 64, 36%, −0.68 |
| Trail without best coin | −0.75 | −0.50 | −0.00 | −0.49 | −1.99 |
| Trail, first half / second half | +0.22 / −0.62 | +0.89 / −1.03 | +1.40 / −1.03 | +1.50 / −1.60 | −0.29 / −1.53 |

- 172 first buys on 162 coins; 10 still open at the 30% stop. By day at the 30% stop: 21 Nov 85 buys +1.74; 22 Nov 65 buys −0.87; 23 Nov 12 buys −0.50.
- Peak after the buy: 32% reached 1.5×, 19% reached 2×, 7% reached 3×; median 1.19×.
- Re-buys: 139; closed at the 30% stop 53, 13% winners, −1.02 SOL.
- Best buys at the 30% stop: EV7J2Q (21 Nov 08:47, $153K, peak 5.8×, +190.9%); MAXXib (21 Nov 12:25, $40K, peak 4.1×, +185.5%); 3umHFk (21 Nov 09:20, $53K, peak 5.2×, +132.3%).
- Worst buys: S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%); Hm1QUy (22 Nov 17:19, $40K, peak 2.0×, −46.5%); 51H7Az (23 Nov 10:02, $41K, peak 1.1×, −35.4%).
- **What worked:** The only book with a positive result on buys older than a day: 138 buys, +3.6% a trade at the 30% stop (+0.63 SOL without its best coin), 43% winners. With half sold at 2×: +0.73 SOL at 30% and +0.75 at 40%. Between $60K and $400K: 80 buys, +7.9% a trade (half-at-2×, 40% stop), positive without its best three coins and in both halves (luck check p = 0.04).
- **What failed:** All of the gain is 21 Nov (85 buys, 51% winners, +1.74 SOL). 22 Nov: 65 buys, −0.87. 23 Nov: 12 buys, 1 winner. Above $400K: 25% winners. Its re-buys: 13% winners at the 30% stop, −1.02 SOL.
- **How to improve:** Half-at-2× with the 30% or 40% stop. To test: a $60K–$400K band. No re-buys. It needs a clean week — one good day is not an edge.

### HH-BREAK-4H — CULL
_Rule: the same buys as HH-BREAK, sold at 4 hours if still open._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 172, 34%, −0.32 | 172, 35%, −0.50 | 172, 37%, −0.00 | 172, 37%, −0.63 | 88, 30%, −0.89 |
| Half at 2×: closed, winners, SOL | 172, 34%, −0.35 | 172, 35%, −0.46 | 172, 37%, +0.07 | 172, 37%, −0.39 | 88, 31%, −0.64 |
| Trail without best coin | −0.67 | −0.79 | −0.37 | −0.93 | −1.05 |
| Trail, first half / second half | +0.58 / −0.89 | +0.70 / −1.20 | +1.00 / −1.00 | +0.70 / −1.33 | −0.08 / −0.81 |

- 172 first buys on 162 coins. By day at the 30% stop: 21 Nov 85 buys +1.01; 22 Nov 73 buys −0.64; 23 Nov 14 buys −0.37.
- Peak after the buy: 32% reached 1.5×, 19% reached 2×, 7% reached 3×; median 1.19×.
- Re-buys: 202; closed at the 30% stop 185, 24% winners, −0.68 SOL.
- Best buys at the 30% stop: MAXXib (21 Nov 12:25, $40K, peak 4.1×, +185.5%); 3umHFk (21 Nov 09:20, $53K, peak 5.2×, +132.3%); uHMWNF (21 Nov 04:02, $93K, peak 2.5×, +85.6%).
- Worst buys: S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%); Hm1QUy (22 Nov 17:19, $40K, peak 2.0×, −46.5%); i6Aop7 (21 Nov 03:27, $60K, peak 1.1×, −34.5%).
- **What worked:** Nothing beyond HH-BREAK.
- **What failed:** The same buys, sold at 4 hours if still open. It is worse than HH-BREAK at the stops where HH-BREAK works (30% trail −0.00 against +0.37 SOL; half-at-2× at 40% −0.39 against +0.75). The clock cuts positions that later became winners. (68–78 of its buys were carried in from HH-BREAK with estimated exits; the bot's own report leaves those out and shows −0.11 SOL at the 30% stop on 98.)
- **How to improve:** None. Keep HH-BREAK.

### HH30-5M — CULL
_Rule: new 30-minute high with the last 5 minutes' volume at 2× the 2-hour norm._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 192, 26%, −2.62 | 191, 25%, −3.26 | 191, 28%, −3.15 | 189, 27%, −4.18 | 169, 29%, −4.19 |
| Half at 2×: closed, winners, SOL | 192, 26%, −2.55 | 191, 25%, −3.08 | 191, 28%, −2.79 | 189, 27%, −3.68 | 169, 33%, −3.04 |
| Trail without best coin | −2.77 | −3.39 | −3.39 | −4.44 | −4.45 |
| Trail, first half / second half | −0.72 / −1.90 | −0.92 / −2.34 | −0.61 / −2.54 | −0.91 / −3.27 | −0.75 / −3.44 |

- 201 first buys on 170 coins; 10 still open at the 30% stop. By day at the 30% stop: 21 Nov 70 buys −0.08; 22 Nov 93 buys −2.39; 23 Nov 28 buys −0.68.
- Peak after the buy: 29% reached 1.5×, 14% reached 2×, 4% reached 3×; median 1.15×.
- Re-buys: 217; closed at the 30% stop 92, 15% winners, −1.88 SOL.
- Best buys at the 30% stop: 8rjgC1 (21 Nov 20:20, $251K, peak 2.4×, +121.4%); 2Lw9FQ (21 Nov 19:10, $61K, peak 2.6×, +81.6%); USEu5q (22 Nov 03:52, $67K, peak 2.6×, +79.0%).
- Worst buys: Fn95Nt (22 Nov 04:04, $148K, peak 1.3×, −89.1%); Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); S5eZMs (23 Nov 02:40, $115K, peak 1.2×, −38.2%).
- **What worked:** Buys of coins worth $200K or more: 42 buys, +2.2% a trade at the 30% stop.
- **What failed:** Below $200K: 149 buys at −11.2% a trade (luck check p = 0.003). Negative at every stop and in both halves; −2.6 to −4.2 SOL. Typical buy: about $250–$630 traded in the 5 minutes before, 2–6 buyers — "twice the normal volume" on a coin that hardly trades is a handful of small buys. Its re-buys lost another 1.88 SOL at 30%.
- **How to improve:** If any fast new-high book is kept, keep one (HH15-5M) and only for coins of $200K+. The $200K slice is the same trades in all three books and is negative without its best three coins.

### HH30-10M — CULL
_Rule: new 30-minute high with the last 10 minutes' volume at 2× the 2-hour norm._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 194, 23%, −2.59 | 192, 20%, −3.35 | 191, 25%, −3.50 | 189, 28%, −4.12 | 170, 29%, −4.66 |
| Half at 2×: closed, winners, SOL | 194, 23%, −2.52 | 192, 20%, −3.20 | 191, 25%, −3.06 | 189, 28%, −3.30 | 170, 31%, −3.42 |
| Trail without best coin | −2.75 | −3.49 | −3.74 | −4.35 | −4.89 |
| Trail, first half / second half | −0.64 / −1.95 | −1.14 / −2.21 | −1.17 / −2.33 | −1.31 / −2.80 | −0.97 / −3.69 |

- 202 first buys on 175 coins; 11 still open at the 30% stop. By day at the 30% stop: 21 Nov 71 buys −0.51; 22 Nov 92 buys −2.22; 23 Nov 28 buys −0.77.
- Peak after the buy: 27% reached 1.5×, 14% reached 2×, 3% reached 3×; median 1.12×.
- Re-buys: 215; closed at the 30% stop 84, 14% winners, −2.08 SOL.
- Best buys at the 30% stop: 6J3ApV (22 Nov 12:54, $41K, peak 2.5×, +85.2%); USEu5q (22 Nov 03:52, $67K, peak 2.6×, +79.0%); 7R4MP6 (22 Nov 07:45, $533K, peak 2.5×, +74.4%).
- Worst buys: Fn95Nt (22 Nov 04:18, $172K, peak 1.1×, −90.7%); Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); S5eZMs (23 Nov 02:40, $115K, peak 1.2×, −38.2%).
- **What worked:** Nothing: even its $200K+ buys were −2.3% a trade (40 buys).
- **What failed:** 202 buys, 20–29% winners, −2.6 to −4.7 SOL, negative in both halves and on every day. Re-buys −2.08 SOL at 30%.
- **How to improve:** None.

### HH15-5M — CULL
_Rule: new 15-minute high with the last 5 minutes' volume at 2× the 1-hour norm._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 221, 25%, −2.45 | 219, 26%, −2.77 | 218, 28%, −2.50 | 217, 27%, −3.85 | 198, 28%, −5.03 |
| Half at 2×: closed, winners, SOL | 221, 25%, −2.33 | 219, 26%, −2.62 | 218, 28%, −2.14 | 217, 27%, −3.19 | 198, 32%, −3.42 |
| Trail without best coin | −2.60 | −3.09 | −2.75 | −4.11 | −5.29 |
| Trail, first half / second half | −0.92 / −1.53 | −1.24 / −1.53 | −0.60 / −1.90 | −0.62 / −3.22 | −0.58 / −4.44 |

- 225 first buys on 183 coins; 7 still open at the 30% stop. By day at the 30% stop: 21 Nov 104 buys −0.46; 22 Nov 82 buys −1.77; 23 Nov 32 buys −0.27.
- Peak after the buy: 27% reached 1.5×, 16% reached 2×, 4% reached 3×; median 1.18×.
- Re-buys: 331; closed at the 30% stop 129, 13% winners, −3.45 SOL.
- Best buys at the 30% stop: 8rjgC1 (21 Nov 20:19, $244K, peak 2.4×, +127.0%); 7cFiqd (23 Nov 12:42, $873K, peak 4.0×, +119.4%); USEu5q (22 Nov 03:08, $58K, peak 2.9×, +105.0%).
- Worst buys: 82mseL (22 Nov 08:35, $99K, peak 1.1×, −90.1%); Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); 51TUkC (22 Nov 06:50, $73K, peak 1.3×, −46.5%).
- **What worked:** Buys of coins worth $200K or more: 47 buys, +4.1% a trade at the 30% stop, +0.13 SOL without the best coin.
- **What failed:** Below $200K: 171 buys at −8.4% a trade (luck check p = 0.006). The busiest book (225 first buys, 331 re-buys) and the largest loser from re-buys: −3.45 SOL at 30%, 13% winners.
- **How to improve:** The one fast new-high variant worth a second look: $200K+ only, no re-buys, as a new forward test. As it stands it should be removed.

### FAST-1M — CULL
_Rule: price doubles inside 1 minute._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 31, 23%, −0.40 | 31, 19%, −0.68 | 31, 19%, −0.91 | 31, 26%, −0.80 | 19, 16%, −1.05 |
| Half at 2×: closed, winners, SOL | 31, 23%, −0.40 | 31, 19%, −0.63 | 31, 19%, −0.86 | 31, 26%, −0.73 | 19, 16%, −0.97 |
| Trail without best coin | −0.56 | −0.78 | −1.01 | −1.08 | −1.44 |
| Trail, first half / second half | −0.22 / −0.19 | −0.33 / −0.35 | −0.38 / −0.53 | −0.10 / −0.70 | −0.16 / −0.89 |

- 31 first buys on 31 coins. By day at the 30% stop: 20 Nov 5 buys −0.16; 21 Nov 14 buys −0.24; 22 Nov 8 buys −0.31; 23 Nov 4 buys −0.20.
- Peak after the buy: 48% reached 1.5×, 32% reached 2×, 26% reached 3×; median 1.26×.
- Re-buys: 3; closed at the 30% stop 3, 33% winners, +0.07 SOL.
- Best buys at the 30% stop: 2TngN4 (21 Nov 22:42, $187K, peak 3.0×, +50.8%); MAXXib (21 Nov 15:22, $96K, peak 1.9×, +29.4%); GpiQNU (21 Nov 06:36, $50K, peak 1.6×, +21.9%).
- Worst buys: SoL6dM (23 Nov 06:16, $45K, peak 1.0×, −40.3%); KMifrk (21 Nov 09:33, $403K, peak 1.0×, −34.2%); Bivugv (20 Nov 17:14, $282K, peak 1.0×, −32.6%).
- **What worked:** It finds runners: 48% of buys later traded 1.5× above entry, 32% reached 2×, 26% reached 3×.
- **What failed:** 16–26% winners, −0.4 to −1.05 SOL, negative on every day. The losers' median peak was 1.12×: a coin that has just doubled in a minute usually gives part of it back first, and that retrace hits the stop. Mostly the same coins as FAST-3M.
- **How to improve:** Covered by FAST-3M.

### FAST-3M — KEEP
_Rule: price doubles inside 3 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 39, 21%, −0.55 | 39, 26%, −0.31 | 39, 26%, −0.63 | 39, 28%, −1.03 | 25, 16%, −0.94 |
| Half at 2×: closed, winners, SOL | 39, 21%, −0.55 | 39, 26%, −0.28 | 39, 26%, −0.57 | 39, 28%, −0.89 | 25, 16%, −1.07 |
| Trail without best coin | −0.71 | −0.53 | −0.82 | −1.19 | −1.90 |
| Trail, first half / second half | −0.23 / −0.32 | −0.10 / −0.20 | −0.19 / −0.43 | −0.43 / −0.60 | −0.77 / −0.16 |

- 39 first buys on 39 coins. By day at the 30% stop: 20 Nov 9 buys +0.08; 21 Nov 13 buys −0.26; 22 Nov 11 buys −0.20; 23 Nov 6 buys −0.25.
- Peak after the buy: 51% reached 1.5×, 33% reached 2×, 26% reached 3×; median 1.61×.
- Re-buys: 14; closed at the 30% stop 7, 14% winners, −0.08 SOL.
- Best buys at the 30% stop: Bivugv (20 Nov 17:09, $91K, peak 2.9×, +99.3%); 4npJ3a (22 Nov 21:15, $913K, peak 2.7×, +90.1%); 2TngN4 (21 Nov 22:42, $187K, peak 3.0×, +50.8%).
- Worst buys: Hm1QUy (22 Nov 17:26, $64K, peak 1.3×, −44.3%); AGmKjJ (23 Nov 11:13, $43K, peak 1.0×, −39.3%); KMifrk (21 Nov 09:33, $403K, peak 1.0×, −34.2%).
- **What worked:** The best peaks of the fast books: 51% reached 1.5×, 33% reached 2×, 26% reached 3× (median peak 1.61×). Least bad result of the five (−0.31 SOL, −4% a trade, at the 25% stop). Winners had more trading before the buy ($20.5K against $7.7K in 5 minutes; 198 against 71 traders) — 10 winners against 29 losers.
- **What failed:** Still 16–28% winners and negative at every stop and on 21, 22 and 23 Nov. Across all the 2× books, buys with 100+ traders were −11.5% a trade, so the volume hint above does not hold up.
- **How to improve:** Kept as the one 2× book because the signal does find coins that run; the exit is what fails. No entry filter is supported by the data. A different exit (for example a fixed first target) can only be judged by adding it as a paper row.

### FAST-5M — CULL
_Rule: price doubles inside 5 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 42, 19%, −0.70 | 42, 19%, −0.62 | 42, 24%, −0.85 | 42, 26%, −0.99 | 27, 7%, −1.25 |
| Half at 2×: closed, winners, SOL | 42, 19%, −0.70 | 42, 19%, −0.60 | 42, 24%, −0.82 | 42, 26%, −0.62 | 27, 15%, −1.35 |
| Trail without best coin | −0.78 | −0.85 | −1.05 | −1.18 | −2.21 |
| Trail, first half / second half | −0.21 / −0.49 | −0.07 / −0.56 | −0.14 / −0.71 | −0.12 / −0.87 | −0.90 / −0.35 |

- 43 first buys on 42 coins; 1 still open at the 30% stop. By day at the 30% stop: 20 Nov 9 buys +0.12; 21 Nov 11 buys −0.27; 22 Nov 18 buys −0.50; 23 Nov 4 buys −0.20.
- Peak after the buy: 47% reached 1.5×, 30% reached 2×, 21% reached 3×; median 1.49×.
- Re-buys: 18; closed at the 30% stop 9, 11% winners, −0.14 SOL.
- Best buys at the 30% stop: Bivugv (20 Nov 17:09, $91K, peak 2.9×, +99.3%); 6ZbWPY (22 Nov 00:38, $61K, peak 4.3×, +66.3%); 4eiNbS (20 Nov 16:19, $91K, peak 2.0×, +48.8%).
- Worst buys: 5rtYav (22 Nov 19:15, $56K, peak 1.0×, −37.0%); SoL6dM (23 Nov 06:20, $46K, peak 1.0×, −36.4%); KMifrk (21 Nov 09:33, $403K, peak 1.0×, −34.2%).
- **What worked:** $60K–$100K: 8 buys, 5 winners.
- **What failed:** 42 closed, 19–26% winners, −0.6 to −1.25 SOL. Under $60K: 23 buys, 13% winners, −19.6% a trade. Largely the same coins as FAST-3M.
- **How to improve:** Covered by FAST-3M.

### FAST-10M — CULL
_Rule: price doubles inside 10 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 35, 20%, −0.66 | 35, 11%, −0.86 | 35, 14%, −0.97 | 35, 17%, −1.46 | 31, 10%, −1.18 |
| Half at 2×: closed, winners, SOL | 35, 20%, −0.64 | 35, 11%, −0.89 | 35, 14%, −0.97 | 35, 17%, −1.38 | 31, 16%, −1.39 |
| Trail without best coin | −0.82 | −1.12 | −1.26 | −1.69 | −2.47 |
| Trail, first half / second half | −0.38 / −0.28 | −0.53 / −0.33 | −0.54 / −0.43 | −0.74 / −0.73 | −1.00 / −0.17 |

- 36 first buys on 34 coins; 1 still open at the 30% stop. By day at the 30% stop: 21 Nov 9 buys −0.14; 22 Nov 20 buys −0.61; 23 Nov 6 buys −0.22.
- Peak after the buy: 47% reached 1.5×, 22% reached 2×, 14% reached 3×; median 1.50×.
- Re-buys: 18; closed at the 30% stop 9, 0% winners, −0.25 SOL.
- Best buys at the 30% stop: FuKY3d (22 Nov 17:50, $46K, peak 16.6×, +144.2%); GKFSuS (21 Nov 18:13, $177K, peak 2.2×, +54.8%); MAXXib (21 Nov 15:22, $96K, peak 1.9×, +29.4%).
- Worst buys: Fn95Nt (22 Nov 02:14, $345K, peak 1.2×, −66.1%); 8PiG7r (22 Nov 00:35, $60K, peak 1.0×, −38.0%); 3zJufN (21 Nov 15:30, $58K, peak 1.0×, −33.5%).
- **What worked:** Nothing consistent.
- **What failed:** 10–20% winners, −0.66 to −1.46 SOL, negative on every day. A double that takes 10 minutes is bought later in the move than the 1–5 minute books and does worse.
- **How to improve:** None.

### FAST-30M — CULL
_Rule: price doubles inside 30 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 39, 15%, −0.76 | 39, 13%, −0.90 | 39, 15%, −1.07 | 39, 21%, −1.39 | 35, 17%, −2.18 |
| Half at 2×: closed, winners, SOL | 39, 15%, −0.76 | 39, 13%, −0.89 | 39, 15%, −1.01 | 39, 21%, −1.18 | 35, 29%, −1.43 |
| Trail without best coin | −0.92 | −1.02 | −1.24 | −1.64 | −2.26 |
| Trail, first half / second half | −0.58 / −0.18 | −0.64 / −0.26 | −0.76 / −0.31 | −0.79 / −0.61 | −1.24 / −0.94 |

- 40 first buys on 35 coins; 1 still open at the 30% stop. By day at the 30% stop: 21 Nov 12 buys −0.46; 22 Nov 19 buys −0.39; 23 Nov 8 buys −0.22.
- Peak after the buy: 50% reached 1.5×, 30% reached 2×, 15% reached 3×; median 1.58×.
- Re-buys: 24; closed at the 30% stop 16, 13% winners, −0.39 SOL.
- Best buys at the 30% stop: HuN5y4 (22 Nov 23:27, $94K, peak 3.1×, +112.0%); FuKY3d (22 Nov 18:43, $298K, peak 2.6×, +80.6%); GKFSuS (21 Nov 18:13, $177K, peak 2.2×, +54.8%).
- Worst buys: Fn95Nt (22 Nov 02:14, $345K, peak 1.2×, −66.1%); 9k2nqj (22 Nov 04:07, $72K, peak 1.0×, −33.9%); 3zJufN (21 Nov 15:36, $48K, peak 1.1×, −33.5%).
- **What worked:** Half of its buys still reached 1.5× later.
- **What failed:** 13–21% winners, −0.76 to −2.18 SOL, negative on every day and in both halves; the mature set is −16.6% a trade.
- **How to improve:** None.

### FAST150-1M — CULL
_Rule: price up 1.5× inside 1 minute._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 92, 25%, −1.02 | 92, 24%, −0.93 | 92, 24%, −1.48 | 91, 24%, −2.11 | 55, 16%, −2.13 |
| Half at 2×: closed, winners, SOL | 92, 25%, −1.06 | 92, 24%, −0.96 | 92, 24%, −1.44 | 91, 24%, −1.61 | 55, 20%, −1.98 |
| Trail without best coin | −1.31 | −1.31 | −1.83 | −2.39 | −3.09 |
| Trail, first half / second half | −0.65 / −0.37 | −0.26 / −0.67 | −0.28 / −1.20 | −0.35 / −1.76 | −1.49 / −0.64 |

- 93 first buys on 82 coins; 1 still open at the 30% stop. By day at the 30% stop: 20 Nov 17 buys +0.04; 21 Nov 32 buys −0.12; 22 Nov 29 buys −0.91; 23 Nov 14 buys −0.49.
- Peak after the buy: 43% reached 1.5×, 27% reached 2×, 17% reached 3×; median 1.36×.
- Re-buys: 40; closed at the 30% stop 25, 28% winners, −0.13 SOL.
- Best buys at the 30% stop: Bivugv (20 Nov 17:06, $68K, peak 4.0×, +173.4%); ELbCDk (21 Nov 00:33, $42K, peak 3.9×, +132.4%); GKFSuS (21 Nov 02:56, $60K, peak 6.5×, +109.4%).
- Worst buys: Fn95Nt (22 Nov 02:11, $274K, peak 1.5×, −58.0%); Hm1QUy (22 Nov 17:26, $74K, peak 1.1×, −51.8%); S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%).
- **What worked:** 20–21 Nov roughly flat (49 buys, −0.08 SOL).
- **What failed:** 22–23 Nov: 43 buys, −1.40 SOL. $100K–$200K: 1 winner in 14. Negative at every stop and in both halves.
- **How to improve:** Covered by FAST150-5M.

### FAST150-3M — CULL
_Rule: price up 1.5× inside 3 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 106, 20%, −0.98 | 106, 24%, −0.87 | 106, 25%, −1.38 | 105, 22%, −2.70 | 60, 15%, −2.34 |
| Half at 2×: closed, winners, SOL | 106, 20%, −1.10 | 106, 24%, −0.94 | 106, 25%, −1.33 | 105, 22%, −2.33 | 60, 17%, −2.44 |
| Trail without best coin | −1.30 | −1.25 | −1.73 | −2.98 | −3.69 |
| Trail, first half / second half | −0.67 / −0.31 | −0.33 / −0.53 | −0.27 / −1.12 | −0.96 / −1.74 | −1.55 / −0.79 |

- 107 first buys on 93 coins; 1 still open at the 30% stop. By day at the 30% stop: 20 Nov 22 buys −0.21; 21 Nov 38 buys +0.08; 22 Nov 28 buys −0.66; 23 Nov 18 buys −0.59.
- Peak after the buy: 42% reached 1.5×, 24% reached 2×, 12% reached 3×; median 1.36×.
- Re-buys: 53; closed at the 30% stop 33, 18% winners, −0.38 SOL.
- Best buys at the 30% stop: 7R4MP6 (21 Nov 16:37, $202K, peak 7.3×, +174.0%); Bivugv (20 Nov 17:06, $68K, peak 4.0×, +173.4%); ELbCDk (21 Nov 00:33, $42K, peak 3.9×, +132.4%).
- Worst buys: Fn95Nt (22 Nov 02:11, $257K, peak 1.6×, −56.6%); Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%).
- **What worked:** Coins 16–36 hours old: 25 buys, +4.2% a trade.
- **What failed:** Coins older than 36 hours: 66 buys, 18% winners, −9.7% a trade. Negative at every stop and in both halves.
- **How to improve:** Covered by FAST150-5M.

### FAST150-5M — KEEP
_Rule: price up 1.5× inside 5 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 115, 19%, −1.63 | 115, 22%, −1.08 | 115, 24%, −1.26 | 114, 21%, −3.12 | 65, 12%, −2.79 |
| Half at 2×: closed, winners, SOL | 115, 19%, −1.82 | 115, 22%, −1.38 | 115, 24%, −1.58 | 114, 22%, −2.87 | 65, 15%, −2.78 |
| Trail without best coin | −1.96 | −1.46 | −1.63 | −3.49 | −3.94 |
| Trail, first half / second half | −0.78 / −0.85 | +0.11 / −1.19 | +0.32 / −1.58 | −0.59 / −2.53 | −1.73 / −1.06 |

- 117 first buys on 99 coins; 2 still open at the 30% stop. By day at the 30% stop: 20 Nov 21 buys −0.03; 21 Nov 41 buys +0.39; 22 Nov 35 buys −0.94; 23 Nov 18 buys −0.69.
- Peak after the buy: 43% reached 1.5×, 26% reached 2×, 12% reached 3×; median 1.35×.
- Re-buys: 57; closed at the 30% stop 40, 18% winners, −0.61 SOL.
- Best buys at the 30% stop: GKFSuS (21 Nov 02:53, $44K, peak 8.9×, +186.8%); 7R4MP6 (21 Nov 16:37, $202K, peak 7.3×, +174.0%); Bivugv (20 Nov 17:06, $68K, peak 4.0×, +173.4%).
- Worst buys: Fn95Nt (22 Nov 02:11, $257K, peak 1.6×, −56.6%); Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%).
- **What worked:** Coins 16–36 hours old: 26 buys, 46% winners, +6.3% a trade at the 30% stop; positive on 21, 22 and 23 Nov. $200K–$400K: 14 buys, 8 winners.
- **What failed:** Coins older than 36 hours: 72 buys, 17% winners, −1.32 SOL. $100K–$200K: 2 winners in 23. Overall negative at every stop.
- **How to improve:** To test: 16–36 hours old only (luck check p = 0.08 here, 0.02–0.08 in the sister books, which share most of these trades — one finding, not four). Kept as the single 1.5× book; the 1-, 3- and 10-minute versions add the same coins.

### FAST150-10M — CULL
_Rule: price up 1.5× inside 10 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 101, 23%, −1.48 | 100, 22%, −1.35 | 99, 21%, −1.76 | 97, 18%, −2.77 | 79, 14%, −3.76 |
| Half at 2×: closed, winners, SOL | 101, 23%, −1.50 | 100, 22%, −1.44 | 99, 21%, −1.82 | 97, 18%, −2.45 | 79, 20%, −2.91 |
| Trail without best coin | −1.81 | −1.72 | −2.14 | −2.99 | −4.02 |
| Trail, first half / second half | −0.83 / −0.66 | −0.52 / −0.84 | −0.51 / −1.26 | −1.20 / −1.56 | −1.47 / −2.29 |

- 102 first buys on 84 coins; 3 still open at the 30% stop. By day at the 30% stop: 21 Nov 30 buys +0.15; 22 Nov 43 buys −1.20; 23 Nov 26 buys −0.71.
- Peak after the buy: 40% reached 1.5×, 23% reached 2×, 8% reached 3×; median 1.29×.
- Re-buys: 54; closed at the 30% stop 38, 18% winners, −0.31 SOL.
- Best buys at the 30% stop: 7R4MP6 (21 Nov 16:36, $184K, peak 7.3×, +175.2%); HuN5y4 (22 Nov 23:25, $77K, peak 3.6×, +147.1%); 7cFiqd (23 Nov 12:45, $916K, peak 3.9×, +109.1%).
- Worst buys: Hm1QUy (22 Nov 17:20, $44K, peak 1.8×, −51.2%); S5eZMs (23 Nov 03:15, $126K, peak 1.1×, −50.4%); GdPu5K (23 Nov 03:49, $41K, peak 1.0×, −42.2%).
- **What worked:** Coins 16–36 hours old: 25 buys, +5.3% a trade.
- **What failed:** Everything else: 74 buys, −13.7% a trade. Under $60K: 14% winners. Negative at every stop, both halves.
- **How to improve:** Covered by FAST150-5M.

### SECOND-WAVE — CULL
_Rule: after a 1, 3 or 5-minute double: price falls 25%+ from its high, then breaks above that high within 60 minutes._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 16, 19%, −0.40 | 16, 13%, −0.45 | 16, 13%, −0.48 | 16, 19%, −0.73 | 10, 10%, −0.16 |
| Half at 2×: closed, winners, SOL | 16, 19%, −0.40 | 16, 13%, −0.45 | 16, 13%, −0.43 | 16, 19%, −0.66 | 10, 10%, −0.43 |
| Trail without best coin | −0.42 | −0.53 | −0.59 | −0.80 | −0.90 |
| Trail, first half / second half | −0.23 / −0.17 | −0.28 / −0.16 | −0.36 / −0.12 | −0.46 / −0.27 | −0.54 / +0.38 |

- 16 first buys on 16 coins. By day at the 30% stop: 20 Nov 4 buys −0.16; 21 Nov 4 buys −0.20; 22 Nov 8 buys −0.12.
- Peak after the buy: 38% reached 1.5×, 19% reached 2×, 19% reached 3×; median 1.33×.
- Re-buys: 4; closed at the 30% stop 3, 67% winners, +0.07 SOL.
- Best buys at the 30% stop: FuKY3d (22 Nov 17:54, $64K, peak 10.5×, +54.2%); 2Fm3qA (22 Nov 02:55, $53K, peak 1.6×, +19.5%).
- Worst buys: FJKt1L (22 Nov 00:37, $770K, peak 1.0×, −45.4%); KMifrk (21 Nov 09:34, $423K, peak 1.0×, −38.0%); 8TiMkg (20 Nov 16:31, $208K, peak 1.0×, −31.5%).
- **What worked:** One coin went on to 10.5× the entry.
- **What failed:** 16 buys, 10–19% winners, negative at every stop; without that one coin −0.42 to −0.90 SOL. Waiting for a pullback and a new high after a fast double did not pick better entries than the fast books themselves.
- **How to improve:** None supported; too few buys to refine.

### VOL300K — CULL
_Rule: any age: $300K+ traded in the last 5 minutes ($40K–$2M)._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 5, 0%, −0.45 | 5, 0%, −0.48 | 5, 0%, −0.59 | 5, 0%, −0.65 | 5, 0%, −0.79 |
| Half at 2×: closed, winners, SOL | 5, 0%, −0.45 | 5, 0%, −0.48 | 5, 0%, −0.59 | 5, 0%, −0.65 | 5, 0%, −0.79 |
| Trail without best coin | −0.43 | −0.44 | −0.54 | −0.57 | −0.68 |
| Trail, first half / second half | −0.20 / −0.25 | −0.20 / −0.29 | −0.29 / −0.30 | −0.29 / −0.36 | −0.29 / −0.50 |

- 5 first buys on 5 coins. By day at the 30% stop: 22 Nov 3 buys −0.49; 23 Nov 2 buys −0.10.
- Peak after the buy: 0% reached 1.5×, 0% reached 2×, 0% reached 3×; median 0.97×.
- Re-buys: 11; closed at the 30% stop 2, 0% winners, −0.24 SOL.
- Best buys at the 30% stop: none.
- Worst buys: p44sDi (22 Nov 12:51, $1906K, peak 1.0×, −99.2%); uL7vqm (22 Nov 01:44, $1976K, peak 1.0×, −75.6%); 8EzKJg (22 Nov 06:02, $1951K, peak 1.0×, −69.4%).
- **What worked:** Nothing: 0 winners in 5.
- **What failed:** Three of the five buys were coins near $1.9–2.0M with $567K–$928K traded in 5 minutes and the price NOT higher than 5 minutes before — the volume was selling. They lost 69%, 76% and 99%, far through every stop. The other two lost 22% and 27%.
- **How to improve:** Remove the plain version. Heavy volume with a falling price is an exit, not an entry.

### VOL300K-UP — KEEP
_Rule: any age: $300K+ traded in the last 5 minutes and the price higher than 5 minutes ago._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 2, 0%, −0.05 | 2, 0%, −0.09 | 2, 0%, −0.10 | 2, 0%, −0.16 | 2, 0%, −0.30 |
| Half at 2×: closed, winners, SOL | 2, 0%, −0.05 | 2, 0%, −0.09 | 2, 0%, −0.10 | 2, 0%, −0.16 | 2, 0%, −0.30 |
| Trail without best coin | −0.03 | −0.05 | −0.05 | −0.08 | −0.19 |
| Trail, first half / second half | −0.02 / −0.03 | −0.04 / −0.05 | −0.05 / −0.04 | −0.08 / −0.08 | −0.19 / −0.11 |

- 2 first buys on 2 coins. By day at the 30% stop: 23 Nov 2 buys −0.10.
- Peak after the buy: 0% reached 1.5×, 0% reached 2×, 0% reached 3×; median 1.08×.
- Re-buys: 7; closed at the 30% stop 1, 0% winners, −0.05 SOL.
- Best buys at the 30% stop: none.
- Worst buys: 5KzT4p (23 Nov 02:19, $129K, peak 1.1×, −26.6%); Csu5jt (23 Nov 17:29, $193K, peak 1.0×, −22.2%).
- **What worked:** Requiring the price to be higher than 5 minutes before kept it out of the three collapses above.
- **What failed:** Its two buys both lost (−27%, −22% at the 30% stop: ordinary stop-outs).
- **How to improve:** Two buys is no evidence either way. Keep collecting.

### VOL500K — CULL
_Rule: any age: $500K+ traded in the last 5 minutes ($40K–$2M)._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 3, 0%, −0.40 | 3, 0%, −0.40 | 3, 0%, −0.49 | 3, 0%, −0.49 | 3, 0%, −0.49 |
| Half at 2×: closed, winners, SOL | 3, 0%, −0.40 | 3, 0%, −0.40 | 3, 0%, −0.49 | 3, 0%, −0.49 | 3, 0%, −0.49 |
| Trail without best coin | −0.34 | −0.34 | −0.35 | −0.35 | −0.35 |
| Trail, first half / second half | −0.06 / −0.34 | −0.06 / −0.34 | −0.15 / −0.34 | −0.15 / −0.34 | −0.15 / −0.34 |

- 3 first buys on 3 coins. By day at the 30% stop: 22 Nov 3 buys −0.49.
- Peak after the buy: 0% reached 1.5×, 0% reached 2×, 0% reached 3×; median 0.97×.
- Best buys at the 30% stop: none.
- Worst buys: p44sDi (22 Nov 12:51, $1906K, peak 1.0×, −99.2%); uL7vqm (22 Nov 01:44, $1976K, peak 1.0×, −75.6%); 8EzKJg (22 Nov 06:02, $1951K, peak 1.0×, −69.4%).
- **What worked:** Nothing: 0 winners in 3.
- **What failed:** All three buys are the collapses described under VOL300K: −69%, −76%, −99%. This is the book that would have matched JACKET; on what it has bought so far it has lost on every trade.
- **How to improve:** Remove the plain version; keep VOL500K-UP.

### VOL500K-UP — KEEP
_Rule: any age: $500K+ traded in the last 5 minutes and the price higher than 5 minutes ago._

No buy yet.

- **How to improve:** Nothing to judge. Keep collecting.

### RUG450 — CULL
_Rule: any age: peaked at $450K+, bought the moment it is 80% below that peak._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 23, 13%, −1.62 | 23, 13%, −1.77 | 22, 14%, −1.79 | 21, 14%, −1.67 | 20, 5%, −2.43 |
| Half at 2×: closed, winners, SOL | 23, 13%, −1.62 | 23, 13%, −1.73 | 22, 14%, −1.73 | 21, 14%, −1.58 | 20, 15%, −2.10 |
| Trail without best coin | −1.67 | −1.89 | −1.88 | −1.94 | −2.54 |
| Trail, first half / second half | −0.51 / −1.10 | −0.58 / −1.19 | −0.63 / −1.16 | −0.37 / −1.30 | −1.07 / −1.36 |

- 24 first buys on 23 coins; 2 still open at the 30% stop. By day at the 30% stop: 21 Nov 4 buys −0.10; 22 Nov 10 buys −0.91; 23 Nov 8 buys −0.78.
- Peak after the buy: 25% reached 1.5×, 13% reached 2×, 4% reached 3×; median 0.98×.
- Best buys at the 30% stop: Fn95Nt (22 Nov 00:01, $413K, peak 2.1×, +45.5%); FJKt1L (22 Nov 00:42, $191K, peak 2.4×, +12.3%); 692gVU (21 Nov 22:47, $105K, peak 1.5×, +5.6%).
- Worst buys: GY23Cd (22 Nov 00:24, $129K, peak 1.0×, −93.4%); 82mseL (22 Nov 06:57, $108K, peak 1.0×, −91.0%); 82mseL (22 Nov 11:02, $109K, peak 1.0×, −90.9%).
- **What worked:** Three winners (one coin later 4×).
- **What failed:** 5–14% winners, −35% to −61% a trade. 8 of its 22 closed buys lost more than 60% at the 30% stop (13 lost more than 40%): the fall carried on through the stop. Median peak after the buy 0.98× — most never traded above the entry at all. "80% below the peak" does not mark a bottom.
- **How to improve:** Remove. The bounce version is the only form with any case.

### RUG450-BOUNCE — KEEP
_Rule: any age: peaked at $450K+, fell 80%, bought when it bounces 30% off its low._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 8, 13%, −0.08 | 8, 25%, −0.12 | 8, 25%, −0.15 | 8, 13%, −0.22 | 8, 13%, −0.79 |
| Half at 2×: closed, winners, SOL | 8, 13%, −0.15 | 8, 25%, −0.14 | 8, 25%, −0.18 | 8, 13%, −0.27 | 8, 13%, −0.76 |
| Trail without best coin | −0.42 | −0.37 | −0.41 | −0.52 | −0.94 |
| Trail, first half / second half | +0.18 / −0.27 | +0.10 / −0.22 | +0.08 / −0.24 | +0.06 / −0.28 | −0.36 / −0.43 |

- 8 first buys on 8 coins. By day at the 30% stop: 21 Nov 4 buys +0.08; 22 Nov 4 buys −0.24.
- Peak after the buy: 50% reached 1.5×, 13% reached 2×, 13% reached 3×; median 1.53×.
- Best buys at the 30% stop: 2TngN4 (21 Nov 22:42, $120K, peak 4.5×, +125.7%); Fn95Nt (22 Nov 00:04, $539K, peak 1.6×, +12.0%).
- Worst buys: 82mseL (22 Nov 10:30, $109K, peak 1.0×, −91.0%); EMjVCb (21 Nov 23:57, $174K, peak 1.0×, −32.9%); 27u3di (21 Nov 22:47, $128K, peak 1.2×, −26.2%).
- **What worked:** Waiting for a 30% bounce off the low: 8 buys, 2 winners (one +126%), −9.6% a trade at the 30% stop against −40% for the plain version.
- **What failed:** Still negative, and negative without its best coin. One coin (82mseL) lost 91% on the bounce buy as well.
- **How to improve:** Eight buys is too few. Keep collecting; drop the 60% stop (−49% a trade).

### RUG950 — CULL
_Rule: any age: peaked at $950K+, bought the moment it is 80% below that peak._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 14, 14%, −1.03 | 14, 14%, −1.05 | 13, 15%, −1.04 | 12, 17%, −1.14 | 11, 0%, −1.32 |
| Half at 2×: closed, winners, SOL | 14, 14%, −1.03 | 14, 14%, −1.00 | 13, 15%, −0.99 | 12, 17%, −1.07 | 11, 18%, −1.08 |
| Trail without best coin | −1.08 | −1.16 | −1.13 | −1.19 | −1.29 |
| Trail, first half / second half | −0.39 / −0.64 | −0.40 / −0.64 | −0.35 / −0.70 | −0.40 / −0.74 | −0.52 / −0.80 |

- 15 first buys on 15 coins; 2 still open at the 30% stop. By day at the 30% stop: 22 Nov 5 buys −0.26; 23 Nov 8 buys −0.78.
- Peak after the buy: 13% reached 1.5×, 13% reached 2×, 0% reached 3×; median 0.98×.
- Best buys at the 30% stop: Fn95Nt (22 Nov 00:01, $413K, peak 2.1×, +45.5%); FJKt1L (22 Nov 00:42, $191K, peak 2.4×, +12.3%).
- Worst buys: TyHtBs (22 Nov 22:57, $889K, peak 1.0×, −82.1%); sbiWbR (23 Nov 04:22, $490K, peak 1.0×, −72.5%); gW4kYa (23 Nov 05:05, $929K, peak 1.0×, −72.5%).
- **What worked:** Two winners.
- **What failed:** 0–17% winners, −37% to −60% a trade; the same collapsing coins as RUG450.
- **How to improve:** Remove.

### RUG950-BOUNCE — KEEP
_Rule: any age: peaked at $950K+, fell 80%, bought when it bounces 30% off its low._

| | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trail: closed, winners, SOL | 2, 0%, −0.05 | 2, 50%, +0.00 | 2, 50%, −0.02 | 2, 0%, −0.06 | 2, 0%, −0.15 |
| Half at 2×: closed, winners, SOL | 2, 0%, −0.05 | 2, 50%, +0.00 | 2, 50%, −0.02 | 2, 0%, −0.06 | 2, 0%, −0.15 |
| Trail without best coin | −0.04 | −0.04 | −0.04 | −0.05 | −0.08 |
| Trail, first half / second half | −0.01 / −0.04 | +0.04 / −0.04 | +0.02 / −0.04 | −0.01 / −0.05 | −0.07 / −0.08 |

- 2 first buys on 2 coins. By day at the 30% stop: 22 Nov 2 buys −0.02.
- Peak after the buy: 100% reached 1.5×, 0% reached 2×, 0% reached 3×; median 1.75×.
- Best buys at the 30% stop: Fn95Nt (22 Nov 00:04, $539K, peak 1.6×, +12.0%).
- Worst buys: FJKt1L (22 Nov 00:50, $249K, peak 1.7×, −19.9%); Fn95Nt (22 Nov 00:04, $539K, peak 1.6×, +12.0%).
- **What worked:** Two buys: one small winner, one small loser.
- **What failed:** Nothing to judge.
- **How to improve:** Keep collecting with RUG450-BOUNCE.

## Method and limits
- **Data.** The bot's own published record (`entries.json` on the `older-data` branch) at 2026-11-23 19:26 UTC, checked against the bot's report rows: my totals match on 282 of 290 book × stop × exit combinations; the 8 that differ are HH-BREAK-4H, where the bot's report leaves out buys carried in with estimated exits.
- **First buys and re-buys** are kept apart. A buy made by several books at once is counted in each book's table, and once in the whole-run tables.
- **Results** are fractions of the 0.2005 SOL cost, after modelled pool fees and 0.0005 SOL a side. Paper only: no real fill has been made.
- **Closed positions only.** With a trailing stop, losers close before winners, so recent buys lean negative; the "buys older than a day" figures (all closed) are quoted where they differ. First buys older than a day: 891 at the 30% stop, 30% winners, −4.6% a trade.
- **"Without best coin"** removes the single most profitable coin; **halves** split a book's closed buys by time. A book has to be positive on both to count.
- **Luck check.** Where a slice is suggested, outcomes were shuffled 5,000 times and the share of shuffles that did as well is given as p. About a dozen slices were tried, so one or two with p under 0.05 are expected by chance.
- **What this run is not.** Three days and six hours, several restarts and rule changes (new books on 21 Nov, buying again from 22 Nov 21:12), a feed that ran 5–60 s late on 23 Nov from 14:37 (34 first buys fall in that period), and feed gaps that kept the hour-scale books from buying for hours at a time. It is a shakedown, not the scored run.
- **Coverage.** The bot prices only PumpSwap pools paired with SOL; coins paired with another token (JACKET) are not in this data at all.
