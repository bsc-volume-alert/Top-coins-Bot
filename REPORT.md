# Older-coins paper books — full performance investigation (data to 2026-11-23 20:19 UTC)

Prepared 23 Nov 2026 for the owner and for an independent review. Analysis only: no rule, book, deployment or data was changed for it.

## 1. Direct answer

- **Books with credible positive after-cost evidence: none.** 1162 distinct first buys are closed on the website's default row (30% trailing stop): 27% won, the average result was -6.5% per buy and the total -15.12 SOL. This is a measurement of three days and five hours of a shakedown run with 25 program restarts, not a verdict on the ideas.
- **Closest to working: HH-BREAK** (+0.37 SOL on 162 closed first buys; 0.00 without its best coin; first half +1.66, second half -1.29) **and its 4-hour clock twin HH-BREAK-4H**, which beat it on the same 88 buys on every stop. Promising, not proven.
- **Promising but unproven (too few buys):** LOW4H, SLOW-BUILD, FAST-3M, FAST-5M, FAST150-5M, SECOND-WAVE, RUG450-BOUNCE, RUG950-BOUNCE.
- **Test one variant beside it:** CONT, HH30-5M (a 4-hour clock sale).
- **Retire from active research (15):** AGE-DOUBLE, CONT-STALL, LOW4H-LIQ25K, FAST-1M, FAST-10M, FAST-30M, FAST150-1M, FAST150-3M, FAST150-10M, HH30-10M, HH15-5M, VOL300K, VOL500K, RUG450, RUG950.
- **Repair before judging:** VOL300K-UP, VOL500K-UP, FEE-COINS.
- **Highest-value next experiments:** (1) a clean run on frozen code with the lag fix, because restarts, a late feed and re-buys contaminate this one; (2) the 4-hour clock sale beside CONT and HH30-5M; (3) HH-BREAK restricted to coins with a shallow four-hour range — 4-hour low at least 82% of the 4-hour high (exploratory); (4) report 20–25% stops and drop the 60% rows; (5) buying again switched off or kept strictly apart — 1079 re-buys were made and they lost in every large book.

Retirement here is a recommendation. Nothing has been switched off and no definition or history has been deleted.

## 2. What was analysed

- Database: `older-shakedown.db (the shakedown run; never reset)`, 920 MB, first start 2026-11-20T14:53:46Z. Export cut-off 2026-11-23T20:19:05.585Z (one read transaction).
- Code running at the cut-off: commit `834ca71`, specification older-10. (The lag fix 982ecde was started seconds after the export and is not in this data.)
- **30 books** from the code: 29 rule families (`FAMILIES` in `older/src/spec.mjs`) plus FEE-COINS. Two of the 29 are clock books that share another book's buys (CONT-STALL ← CONT, HH-BREAK-4H ← HH-BREAK). Each family has 4 or 5 age groups × 5 stops × 2 exits = 1,240 comparison rows. **These rows are alternatives on the same buys, not 1,240 strategies; they are never added together here.**
- Records: 2300 buy decisions (2283 filled, 17 cancelled), of which 1204 first buys and 1079 re-buys; 266 coins bought; 31584 comparison rows; 521011 recorded rejections; 41647 coins seen.
- Reconciliation: the package reproduces the bot's own published report on 1,236 of 1,240 rows exactly; the other 4 differ by one sale made in the three minutes between the bot's last report and the export.

| Book | Kind | Buys on | Ages | Counting since (UTC) | Added in |
|---|---|---|---|---|---|
| AGE-DOUBLE | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-1 |
| LOW4H | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-1 |
| CONT | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-1 |
| SLOW-BUILD | rule book | live + sampled | A1 A2 A3 A4 | 21 Nov 00:44 | older-1 |
| HH-BREAK | rule book | live PumpSwap only | A1 A2 A3 A4 | 20 Nov 14:53 | older-1 |
| CONT-STALL | clock book | live + sampled | A1 A2 A3 A4 | 20 Nov 15:59 | older-1 |
| LOW4H-LIQ25K | rule book | live + sampled | A1 A2 A3 A4 | 21 Nov 00:44 | older-1 |
| FAST-1M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST-3M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST-5M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST-10M | rule book | live + sampled | A1 A2 A3 A4 | 21 Nov 13:10 | older-4 |
| FAST-30M | rule book | live + sampled | A1 A2 A3 A4 | 21 Nov 13:10 | older-4 |
| FAST150-1M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST150-3M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST150-5M | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 14:53 | older-2 |
| FAST150-10M | rule book | live + sampled | A1 A2 A3 A4 | 21 Nov 13:10 | older-4 |
| SECOND-WAVE | rule book | live + sampled | A1 A2 A3 A4 | 20 Nov 16:19 | older-2 |
| HH30-5M | rule book | live PumpSwap only | A1 A2 A3 A4 | 21 Nov 16:12 | older-6 |
| HH30-10M | rule book | live PumpSwap only | A1 A2 A3 A4 | 21 Nov 16:12 | older-6 |
| HH15-5M | rule book | live PumpSwap only | A1 A2 A3 A4 | 21 Nov 16:12 | older-6 |
| HH-BREAK-4H | clock book | live PumpSwap only | A1 A2 A3 A4 | – | older-7 |
| VOL300K | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| VOL300K-UP | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| VOL500K | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| VOL500K-UP | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| RUG450 | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| RUG450-BOUNCE | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| RUG950 | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| RUG950-BOUNCE | any-age rule book | live PumpSwap only | A0 A1 A2 A3 A4 | 21 Nov 21:23 | older-8 |
| FEE-COINS | FEE-COINS | sampled/routed only | A0 A1 A2 A3 A4 | 22 Nov 01:16 | fee-book (22 Nov, commit e4a5a3b) |

Exact rule text for each book is in `books.csv` (column `entry_rule`) and repeated in each book's section below. Code and rule periods are in `code_rule_periods.csv`; which code a buy was made under is in `entries.csv`: `code_commit` is the commit the program itself recorded at its start (24 recorded starts, `program_starts.csv`); for the 38 buys before the first such record it is empty and `code_commit_inferred` gives the newest source commit before that start, marked as an inference.

## 3. Evidence check before reading any profit figure

| Question | Finding | Effect on results |
|---|---|---|
| Fee coins inside rule books? | No. No buy of a transfer-fee coin exists at all (FEE-COINS has 0 buys), and no bought coin shows a fee in the coin table today. | None |
| Unknown Token-2022 fees | 225 filled buys (46 coins) are Token-2022 coins bought on the live method whose transfer-fee setting was never read (risk status “missing”); for 2044 more the token program was not recorded. | Not measurable from the database. A read-only chain look-up of the bought coins would settle it (data gap C1). |
| Do Jupiter quotes already include the fee? | Measured on the server on 22 Nov (fee-probe: 8 fee coins, 8 routes): yes. Irrelevant to these results because no fee coin was bought. | None |
| Restart gaps inside a decision window | 278 buys (12%) were decided on a window that contains a tolerated restart gap — mostly the HH books and AGE-DOUBLE. | Shown apart: the “strict evidence” columns leave them out. |
| Estimated exits | 584 rows (HH-BREAK-4H before the book existed) carry a sale estimated from one-minute prices: +1.11 SOL. | Excluded from every figure here, as on the website. Kept in positions.csv with `estimated_exit = 1`. |
| Late feed | From about 14:00 UTC on 23 Nov the price feed ran late (cause: the bot's own once-a-second saving of every open position; fixed in 982ecde). 88 buys were signalled with the feed more than 10 s behind the chain (worst 112 s). Before that the lag was 1.0–1.3 s. | Buys and sales after 14:00 UTC on 23 Nov are flagged and left out of “strict evidence”. Windows on the receive clock were distorted in that period. |
| Pool-state verification | 19 buys flagged “account state differs from the reconstructed state”, 14 could not be verified. | Left out of “strict evidence”. |
| Late orders, no-route, timeouts | Live fills: all at the scheduled time on a pool state ≤ 1 s old. Sampled method: 29 buy decisions, 17 cancelled (“no trustworthy price within 5 s”), 12 filled, 6 of those more than 3 s late. | The sampled (Solana-wide) side contributes almost nothing to any book. It cannot be judged. |
| Sale price against trigger value | Trailing-stop sales are priced 0.7 s after the trigger. On 946 distinct first buys the sale realised on average 2.3% of cost MORE than the value at the trigger (67% of sales were above it). | A model property, not a recording error: the trigger fires on a low and prices bounce a little. If every such sale had filled at the trigger value instead, the average result per buy would be about 1.8 points worse. A real sale may not get the bounce (open question C3). |
| Positions restored under another method | 1 event (“restore: coin mode corrected”). | Negligible |
| Outages while held | 15 feed drops and 25 restarts; 34% of rows were held across at least one gap (most gaps are under 1 s). | Flagged per row (`quality`), not excluded. |
| Censoring | 3762 rows are still open; 1380 buys have not finished their 24-hour follow-up. Recent buys that are already closed are mostly quick stop-outs. | Every table states whether open rows are included; “incl. open” values them at their last dated executable valuation. |
| History that could not be evaluated | Most rejections are “insufficient history / window not covered / reference missing” (about 8,000–9,000 coins per book): after each restart the windows start again. | Selection effect: only coins with unbroken history were eligible. Not correctable afterwards. |

Which fixes from the review of 0a3b8d3 are in the code that produced this data: fee status “unknown is not no-fee” for sampled coins, warm-restart gap marking, estimated exits kept out of totals, fee coins in their own book (deployed between 22 Nov 01:16 and 21:24 UTC). Buys before that ran under earlier code; `entries.csv` carries the period of each.

## 4. Scoreboard — first buys, 30% trailing stop (the website's default row)

“Strict” = without the doubts of section 3. “Incl. open” = closed result plus open rows at their last valuation. “2× reach” = buys whose executable value reached 2× cost within 24 h of the fill, out of buys followed for 24 h (a lower bound: most follow-ups have gaps).

| Book | Closed | Coins | Net SOL | Strict net (n) | Incl. open (open) | Avg % | Median % | Win % | ≤−40 % | 2× reach | Without best coin | 1st half | 2nd half | Re-buys net (n) | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AGE-DOUBLE | 30 | 28 | -1.00 | -0.60 (19) | -1.07 (2) | -16.6 | -27.5 | 13.3 | 0 | 6/15 | -1.15 | -0.41 | -0.58 | -0.67 (17) | RETIRE FROM ACTIVE RESEARCH |
| LOW4H | 34 | 31 | -0.21 | -0.49 (29) | -0.16 (2) | -3.1 | -21 | 29.4 | 0 | 8/24 | -0.59 | -0.19 | -0.02 | -0.15 (9) | CONTINUE COLLECTING |
| CONT | 154 | 131 | -1.41 | -1.35 (129) | -1.61 (7) | -4.6 | -19.4 | 26 | 2.6 | 31/104 | -2.08 | -0.31 | -1.10 | -0.93 (41) | TEST A VARIANT BESIDE IT |
| SLOW-BUILD | 19 | 18 | -0.13 | -0.01 (17) | -0.10 (1) | -3.3 | -14.2 | 36.8 | 0 | 7/16 | -0.26 | +0.11 | -0.23 | -0.11 (2) | CONTINUE COLLECTING |
| HH-BREAK | 162 | 162 | +0.37 | +0.61 (143) | +0.34 (10) | 1.1 | -5.9 | 38.9 | 1.2 | 28/140 | 0.00 | +1.66 | -1.29 | -1.06 (55) | KEEP UNCHANGED |
| CONT-STALL | 159 | 131 | -2.27 | -2.12 (138) | -2.34 (2) | -7.1 | -13.5 | 18.2 | 0.6 | 31/104 | -2.75 | -0.71 | -1.56 | -0.34 (48) | RETIRE FROM ACTIVE RESEARCH |
| LOW4H-LIQ25K | 14 | 15 | -0.44 | -0.27 (11) | -0.39 (2) | -15.7 | -21.1 | 14.3 | 0 | 3/10 | -0.50 | -0.14 | -0.30 | +0.13 (2) | RETIRE FROM ACTIVE RESEARCH |
| FAST-1M | 31 | 32 | -0.91 | -0.86 (30) | -0.91 (0) | -14.7 | -22.4 | 19.4 | 3.2 | 8/24 | -1.01 | -0.38 | -0.54 | +0.07 (3) | RETIRE FROM ACTIVE RESEARCH |
| FAST-3M | 39 | 40 | -0.63 | -0.58 (38) | -0.63 (0) | -8 | -19.5 | 25.6 | 2.6 | 11/30 | -0.82 | -0.19 | -0.43 | -0.08 (7) | CONTINUE COLLECTING |
| FAST-5M | 43 | 43 | -0.86 | -0.81 (41) | -0.86 (0) | -10 | -19.7 | 23.3 | 0 | 13/33 | -1.06 | -0.14 | -0.72 | -0.14 (9) | CONTINUE COLLECTING |
| FAST-10M | 36 | 34 | -0.98 | -0.91 (33) | -0.98 (0) | -13.5 | -23.3 | 13.9 | 2.8 | 8/21 | -1.27 | -0.57 | -0.41 | -0.24 (9) | RETIRE FROM ACTIVE RESEARCH |
| FAST-30M | 40 | 35 | -1.07 | -1.04 (37) | -1.07 (0) | -13.4 | -23 | 15 | 2.5 | 9/28 | -1.24 | -0.82 | -0.26 | -0.39 (16) | RETIRE FROM ACTIVE RESEARCH |
| FAST150-1M | 93 | 86 | -1.43 | -1.16 (84) | -1.43 (0) | -7.7 | -19.7 | 23.7 | 5.4 | 20/72 | -1.78 | -0.10 | -1.33 | -0.32 (26) | RETIRE FROM ACTIVE RESEARCH |
| FAST150-3M | 107 | 97 | -1.33 | -1.22 (93) | -1.33 (0) | -6.2 | -20 | 25.2 | 3.7 | 19/81 | -1.68 | -0.27 | -1.06 | -0.70 (35) | RETIRE FROM ACTIVE RESEARCH |
| FAST150-5M | 117 | 102 | -1.26 | -1.03 (100) | -1.26 (0) | -5.4 | -21.9 | 23.9 | 3.4 | 23/92 | -1.63 | +0.28 | -1.54 | -0.93 (42) | CONTINUE COLLECTING |
| FAST150-10M | 101 | 84 | -1.87 | -1.34 (83) | -1.90 (1) | -9.2 | -21 | 19.8 | 4 | 13/65 | -2.25 | -0.57 | -1.31 | -0.63 (42) | RETIRE FROM ACTIVE RESEARCH |
| SECOND-WAVE | 16 | 16 | -0.48 | -0.47 (15) | -0.48 (0) | -15.1 | -19.6 | 12.5 | 6.3 | 3/14 | -0.59 | -0.36 | -0.12 | +0.07 (3) | CONTINUE COLLECTING |
| HH30-5M | 192 | 170 | -3.17 | -2.55 (164) | -3.18 (9) | -8.2 | -14.6 | 27.6 | 1 | 21/157 | -3.42 | -1.57 | -1.60 | -2.02 (95) | TEST A VARIANT BESIDE IT |
| HH30-10M | 191 | 175 | -3.50 | -2.88 (166) | -3.55 (11) | -9.1 | -15.1 | 24.1 | 1 | 21/156 | -3.74 | -1.77 | -1.74 | -2.16 (86) | RETIRE FROM ACTIVE RESEARCH |
| HH15-5M | 218 | 183 | -2.50 | -2.31 (192) | -2.59 (7) | -5.7 | -12.6 | 27.1 | 1.8 | 24/175 | -2.75 | -1.62 | -0.87 | -3.56 (132) | RETIRE FROM ACTIVE RESEARCH |
| HH-BREAK-4H | 98 | 162 | -0.11 | +0.14 (81) | -0.11 (0) | -0.6 | -4.7 | 27.6 | 2 | 28/140 | -0.48 | +0.73 | -0.84 | -0.68 (185) | KEEP UNCHANGED |
| VOL300K | 5 | 5 | -0.59 | -0.54 (4) | -0.59 (0) | -58.6 | -69.4 | 0 | 60 | 0/3 | -0.54 | -0.29 | -0.30 | -0.24 (2) | RETIRE FROM ACTIVE RESEARCH |
| VOL300K-UP | 2 | 2 | -0.10 | -0.05 (1) | -0.10 (0) | -24.4 | -24.4 | 0 | 0 | 0/0 | -0.05 | -0.05 | -0.04 | -0.05 (1) | REPAIR BEFORE JUDGING |
| VOL500K | 3 | 3 | -0.49 | -0.49 (3) | -0.49 (0) | -81.4 | -75.6 | 0 | 100 | 0/3 | -0.35 | -0.15 | -0.34 | 0.00 (0) | RETIRE FROM ACTIVE RESEARCH |
| VOL500K-UP | 0 | 0 | 0.00 | 0.00 (0) | 0.00 (0) | – | – | – | – | 0/0 | 0.00 | 0.00 | 0.00 | 0.00 (0) | REPAIR BEFORE JUDGING |
| RUG450 | 23 | 24 | -1.80 | -1.56 (20) | -1.87 (2) | -39 | -41.8 | 13 | 56.5 | 3/11 | -1.89 | -0.63 | -1.17 | 0.00 (0) | RETIRE FROM ACTIVE RESEARCH |
| RUG450-BOUNCE | 9 | 9 | -0.21 | -0.06 (6) | -0.21 (0) | -11.8 | -25.4 | 22.2 | 11.1 | 1/8 | -0.47 | +0.08 | -0.30 | -0.20 (1) | CONTINUE COLLECTING |
| RUG950 | 13 | 15 | -1.04 | -0.81 (11) | -1.11 (2) | -40 | -42.8 | 15.4 | 69.2 | 2/2 | -1.13 | -0.34 | -0.70 | 0.00 (0) | RETIRE FROM ACTIVE RESEARCH |
| RUG950-BOUNCE | 2 | 2 | -0.02 | +0.02 (1) | -0.02 (0) | -3.9 | -3.9 | 50 | 0 | 0/2 | -0.04 | -0.04 | +0.02 | 0.00 (0) | CONTINUE COLLECTING |
| FEE-COINS | 0 | 0 | 0.00 | 0.00 (0) | 0.00 (0) | – | – | – | – | 0/0 | 0.00 | 0.00 | 0.00 | 0.00 (0) | REPAIR BEFORE JUDGING |

All ten stop/exit rows, every age group, re-buys and all-buys are in `scoreboard_variants.csv`; realised and reachable 2×/3×/5×/10× counts, holding times, exit reasons, drawdown and peak exposure are in `scoreboard.csv`.

## 5. What the coins show across all books

### 5.1 Where the money went (distinct first buys, 30% trail)

| Price-path class | Buys | Net SOL |
|---|---|---|
| ordinary decline | 520 | -26.08 |
| abrupt collapse | 40 | -4.70 |
| runner missed: sold before the run | 150 | -2.92 |
| giveback | 80 | -0.73 |
| stagnation | 213 | +0.31 |
| runner missed: held through 2x and gave it back | 13 | +1.09 |
| ordinary gain | 70 | +2.75 |
| runner captured | 76 | +15.17 |

Definitions (from recorded fields; labels, not proof of cause): *runner captured* = reached 2× and the row realised +50% or more; *runner missed* = reached 2× within 24 h but realised less (sold before the run, or held through 2× and gave it back); *abrupt collapse* = a loss where the sale was 10+ points of cost below the trigger or the loss exceeded the stop by 10+ points with no prior gain; *giveback* = was up 30%+ and closed at +5% or less; *stagnation* = closed by a clock or the 24-hour limit, or within ±10% after an hour without ever being +15%; *ordinary decline / gain* = the rest.

**The main loss is not the exit.** Most of the loss is buys that never rose (“ordinary decline”). The second group is runners sold before the run. Captured runners pay for part of it; nothing pays for all of it.

### 5.2 Day by day (distinct first buys, incl. open rows at last valuation)

| Day (UTC) | Buys | Closed | Open | Average % (all) | Net SOL (all) | Closed by stop / by 24-h limit |
|---|---|---|---|---|---|---|
| 20 Nov | 77 | 77 | 0 | 0.8 | +0.13 | 73 / 4 |
| 21 Nov | 453 | 453 | 0 | 0.3 | +0.26 | 308 / 145 |
| 22 Nov | 457 | 441 | 16 | -10.3 | -9.43 | 374 / 67 |
| 23 Nov | 217 | 191 | 26 | -15.1 | -6.57 | 191 / 0 |

The first two days were about break-even and the last two clearly negative, in nearly every age group, size band and book generation. The fall began before the 22 Nov 01:16 deployment (44 buys between midnight and that restart already averaged −8%), so it does not line up with a code change; it lines up with the calendar. Three days cannot separate “the market turned” from “the first days were lucky”. No entry feature recorded at the buy reverses the sign on 22–23 Nov (`candidate_tests.csv`, section 5.5).

### 5.3 Exits on the same buys (measured, not replayed)

Every buy carries ten rows (5 stops × trail / half-at-2×), each with its own simulated sales, so exit alternatives are measured on identical entries:

- **Tighter stops lost less in most books.** Including open rows at their last valuation, the 20% or 25% trail is the best trailing row in 23 of the 28 books with buys; the 60% trail is the worst in 22.
- **Half at 2× is equal or better than pure trailing at the 30%, 40% and 60% stops** in 74 of 84 book-and-stop comparisons, and makes little difference at 20–25% (few positions reach 2× before a tight stop).
- **Abandoning weak follow-through after 60 minutes (CONT-STALL) was worse** than CONT on the same 154 buys by 0.76 SOL.
- **A 4-hour clock sale (HH-BREAK-4H) was better** than HH-BREAK on the same 88 buys on all eight rows compared (30% trail −0.02 against −0.48 SOL; 60% trail −0.69 against −1.97).
- **Runners:** 239 distinct first buys reached 2× within 24 h of the fill. The 30% trail realised +50% or more on 76 of them and sold 152 before they got to 2×. Wider stops kept more of each runner but lost more on everything else; no stop width turns a book positive.
- **Buying again:** 1079 re-buys since 22 Nov 21:12 UTC. On the default row they are negative in 13 of the 13 books with more than 10 closed re-buys, with 13–22% winners in the books with 40 or more. A second entry after a new signal is, so far, churn.

Caution on `exit_comparison_identical_buys.csv`: it uses only buys on which all ten rows are closed, which leaves out buys whose wide-stop rows are still open (the better ones). Use `scoreboard_variants.csv` with open rows valued for the fair comparison.

### 5.4 Overlap

CONT-STALL and HH-BREAK-4H share 100% of their parent's buys by construction. SLOW-BUILD and LOW4H-LIQ25K are subsets of LOW4H; VOL…-UP of VOL…; RUG950 of RUG450. The three FAST150 short clocks share 58–64% of their buys with their neighbour and FAST150-5M contains every profitable coin of FAST150-3M and FAST150-1M. HH30-5M contains every profitable coin of HH30-10M. Full matrix: `book_overlap.csv`.

### 5.5 Winners first: what the entry features say

One fixed grid was run and every test is recorded in `candidate_tests.csv`: for each book (first buys, 30% trail, closed) and each of 28 recorded entry features, cuts at the book's own quartiles in both directions — 2778 tests. Winner recall (share of the book's winners kept), precision (share of passing buys that won), severe-loss rate, net SOL per opportunity with a rejected buy counted as zero, runners kept and rejected, and both halves by time are given for each.

- 341 of 2778 filters end above zero; only **10** do so with 20+ buys, in both halves and without their best coin — 7 of them inside HH-BREAK, which is above zero unfiltered. With this many tests a handful of passes is expected by chance alone. **No entry filter is supported by this data.**
- The features do not agree across books: in the HH books larger, deeper coins did better; in CONT smaller, thinner coins did better.
- “Feature X is common among winners” is not “a coin with X usually wins”. Example: 83% of winners were bought at their 1-hour high — and so were 81% of losers.
- Missing values are reported, not treated as zero: the 4-hour drawdown and recovery are recorded on about a third of buys, the 5-minute volume surge on three quarters; social or Twitter fields, holder counts and deployer history are not recorded at all (data gap C5).

The loss labels in `coin_ledger.csv` (“bought extended”, “thin pool”, “one buyer ≥ 40% of 5-minute buying”, “no follow-through”…) describe each losing row from its recorded fields. They are descriptions: the same conditions are about as common among winners, so none of them is a usable filter by itself.

### 5.6 Coins never bought

A coarse estimate from hourly prices (assumes the pump.fun supply of one billion; includes coins under 8 hours old and back-filled bars): 54 never-bought coins had a doubling that started inside the $40K–$1M band, 14 of them 5× or more; 49 bought coins had such a move. So roughly half of the in-band doublings the database can see were not bought by any book — mostly because the coin had no unbroken history when it moved. Coins whose pool is not paired with SOL are not in the database at all. Per-coin figures: `coin_outcomes.csv`.

## 6. Book by book

### AGE-DOUBLE — RETIRE FROM ACTIVE RESEARCH

**Rule.** market cap crosses 2× what it was at the start of the coin's age group (8 / 16 / 24 / 36 hours old). rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-1).

**First buys, 30% trail.** 33 buy decisions on 28 coins; 32 filled, 30 closed and measured, 2 open. Net -1.00 SOL (staked 6.416 SOL; open rows cost 0.401, last valued 0.329). Average -16.6%, median -27.5%; 4 won / 1 flat / 25 lost; average winner 43.8%, average loser -26.9%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 6/3/1/0 of 15 followed. Median hold 37 min; exits trail:29 max-hold:1. Best coin 6zzzG4 +0.15, worst 7CvW68 -0.13; 5 coins net positive, 20 negative. Without the best 1 / 3 / 5 coins: -1.15 / -1.28 / -1.28. First half -0.41, second half -0.58. Largest drawdown 0.997 SOL; most rows open at once 5 (1.002 SOL). Strict evidence: -0.60 SOL on 19 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.63 | -0.73 | -1.07 (2 open) | -1.02 (4 open) | -1.40 (9 open) |
| Half at 2×, trail the rest | -0.59 | -0.70 | -0.99 (2 open) | -0.92 (4 open) | -0.94 (9 open) |

**By age group (30% trail, closed):** A1: -0.34 (8, 12.5% won); A2: -0.07 (4, 25% won); A3: -0.23 (5, 0% won); A4: -0.35 (13, 15.4% won).  
**By day of the buy:** 20 Nov: +0.04 (3); 21 Nov: -0.21 (6); 22 Nov: -0.15 (8); 23 Nov: -0.69 (13).  
**Re-buys (30% trail):** 17 closed, -0.67 SOL, 5.9% won; 4 open.

**Price-path classes (closed first buys):** ordinary decline 20 (-1.07); runner missed: sold before the run 6 (-0.14); giveback 2 (-0.06); runner captured 2 (+0.28).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 31; thin pool 26; feed/quote quality flag 25; no follow-through (never +5%) 20; one buyer >=40% of 5-min buying 17.

**Largest winners:** 6zzzG4 +0.15 (peak held 2.08×, 24-h high 2.08×); HuN5y4 +0.13 (peak held 2.42×, 24-h high 2.42×); 3umHFk 0.00 (peak held 1.94×, 24-h high 5.30×); 6EiCk8 0.00 (peak held 1.42×, 24-h high 2.07×).  
**Largest losers:** 7CvW68 -0.13 (peak held 0.98×, 24-h high 2.98×); 8T3ztD -0.11 (peak held 1.15×, 24-h high 2.05×); 51TUkC -0.09 (peak held 1.39×, 24-h high 1.70×); S5eZMs -0.08 (peak held 1.27×, 24-h high 1.34×).

**Closest book:** FAST150-10M — 13% of buys are the same buy; 0 of this book's 5 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 115 tests on this book):** `rt_impact < 0.0027` keeps 14 of 30 buys and 80% of winners; 28.6% of passing buys won (book 16.7%); net -0.20 against -1.00; halves +0.04 / -0.24; without best coin -0.35; runners kept 4, rejected 4. `buy_sell15 >= 1.194` keeps 16 of 30 buys and 80% of winners; 25% of passing buys won (book 16.7%); net -0.25 against -1.00; halves +0.06 / -0.31; without best coin -0.40; runners kept 4, rejected 4.

**Doing well:** 6 of 15 followed buys reached 2× within 24 h; best row 20% half-at-2× (-0.59 SOL incl. open); 4 winners averaging 43.8%.  
**What causes the loss / kind of problem:** Strategy. A doubling since the start of the age group is a late, one-off reference: only 4 of 30 closed first buys won. 44 of its decisions also had a restart gap inside the window (evidence defect), but the strict-evidence set is just as bad.  
**Strongest supporting evidence:** best row 20% half-at-2× at -0.59 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.15); negative in both halves; worst row 60% trail at -1.40 SOL; 13.3% winners needing about 38% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. No other book needs it as a benchmark; its few winners were also bought by other books.

### LOW4H — CONTINUE COLLECTING

**Rule.** price crosses 2× its lowest of the last 4 hours. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-1).

**First buys, 30% trail.** 36 buy decisions on 31 coins; 36 filled, 34 closed and measured, 2 open. Net -0.21 SOL (staked 7.218 SOL; open rows cost 0.401, last valued 0.452). Average -3.1%, median -21%; 10 won / 0 flat / 24 lost; average winner 48.9%, average loser -24.7%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 1/0/0/0; reachable within 24 h: 8/5/1/0 of 24 followed. Median hold 53 min; exits trail:34. Best coin HuN5y4 +0.38, worst 9M4PDv -0.12; 8 coins net positive, 21 negative. Without the best 1 / 3 / 5 coins: -0.59 / -0.81 / -0.95. First half -0.19, second half -0.02. Largest drawdown 0.507 SOL; most rows open at once 4 (0.802 SOL). Strict evidence: -0.49 SOL on 29 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | +0.09 (2 open) | -0.21 (2 open) | -0.16 (2 open) | -0.25 (3 open) | -0.44 (6 open) |
| Half at 2×, trail the rest | +0.09 (2 open) | -0.17 (2 open) | -0.03 (2 open) | -0.01 (3 open) | +0.07 (6 open) |

**By age group (30% trail, closed):** A1: -0.18 (8, 25% won); A2: -0.06 (5, 40% won); A3: +0.07 (1, 100% won); A4: -0.05 (20, 25% won).  
**By day of the buy:** 21 Nov: -0.07 (12); 22 Nov: +0.17 (16); 23 Nov: -0.31 (6).  
**Re-buys (30% trail):** 9 closed, -0.15 SOL, 22.2% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 19 (-0.97); runner missed: sold before the run 7 (-0.15); runner captured 3 (+0.63); ordinary gain 2 (+0.12); runner missed: held through 2x and gave it back 2 (+0.17); giveback 1 (0.00).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 20; one buyer >=40% of 5-min buying 19; no follow-through (never +5%) 19; thin pool 18; feed/quote quality flag 12.

**Largest winners:** HuN5y4 +0.38 (peak held 4.25×, 24-h high 4.25×); Fvv62M +0.13 (peak held 2.37×, 24-h high 2.37×); Q1vecE +0.09 (peak held 2.10×, 24-h high 2.10×); 51TUkC +0.07 (peak held 2.06×, 24-h high 2.06×).  
**Largest losers:** 9M4PDv -0.12 (peak held 0.99×, 24-h high 1.06×); BAKsQr -0.11 (peak held 1.10×, 24-h high 1.68×); CWKbSd -0.07 (peak held 0.98×, 24-h high 0.98×); KMifrk -0.07 (peak held 0.97×, 24-h high 1.01×).

**Closest book:** SLOW-BUILD — 56% of buys are the same buy; 3 of this book's 8 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 162 tests on this book):** `w1_buyers < 7` keeps 24 of 34 buys and 90% of winners; 37.5% of passing buys won (book 29.4%); net +0.32 against -0.21; halves -0.04 / +0.36; without best coin -0.06; runners kept 11, rejected 1. `w1_buyers < 4` keeps 16 of 34 buys and 60% of winners; 37.5% of passing buys won (book 29.4%); net +0.32 against -0.21; halves -0.12 / +0.44; without best coin -0.06; runners kept 9, rejected 3.

**Doing well:** 8 of 24 followed buys reached 2× within 24 h; best row 20% trail (+0.09 SOL incl. open); 10 winners averaging 48.9%.  
**What causes the loss / kind of problem:** Uncertain. Close to break-even on a small sample; a third of followed buys reached 2× but the trailing stop sold most of them first.  
**Strongest supporting evidence:** best row 20% trail at +0.09 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.59); negative in both halves; worst row 60% trail at -0.44 SOL; 29.4% winners needing about 34% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged. Judge at 100+ closed first buys. Track the 20% stop and the half-at-2× rows, which are the least negative.

### CONT — TEST A VARIANT BESIDE IT

**Rule.** price 30%+ above 15 minutes ago and within 5% of its 1-hour high. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-1).

**First buys, 30% trail.** 169 buy decisions on 131 coins; 161 filled, 154 closed and measured, 7 open. Net -1.41 SOL (staked 32.281 SOL; open rows cost 1.404, last valued 1.206). Average -4.6%, median -19.4%; 40 won / 1 flat / 113 lost; average winner 47.1%, average loser -22.9%. Lost 40%+: 2.6%, 50%+: 0.6%, 60%+: 0%. Realised 2×/3×/5×/10×: 7/2/0/0; reachable within 24 h: 31/18/5/1 of 104 followed. Median hold 77 min; exits trail:150 max-hold:4. Best coin HuN5y4 +0.67, worst 3b7Wvf -0.17; 33 coins net positive, 83 negative. Without the best 1 / 3 / 5 coins: -2.08 / -2.86 / -3.35. First half -0.31, second half -1.10. Largest drawdown 2.162 SOL; most rows open at once 22 (4.411 SOL). Strict evidence: -1.35 SOL on 129 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -2.67 (1 open) | -1.09 (5 open) | -1.61 (7 open) | -2.86 (12 open) | -4.50 (30 open) |
| Half at 2×, trail the rest | -2.56 (1 open) | -1.36 (5 open) | -1.90 (7 open) | -2.64 (12 open) | -2.97 (30 open) |

**By age group (30% trail, closed):** A1: -0.45 (20, 25% won); A2: 0.00 (21, 38.1% won); A3: -0.01 (21, 19% won); A4: -0.94 (92, 25% won).  
**By day of the buy:** 20 Nov: +0.46 (20); 21 Nov: -0.01 (41); 22 Nov: -1.12 (55); 23 Nov: -0.74 (38).  
**Re-buys (30% trail):** 41 closed, -0.93 SOL, 19.5% won; 10 open.

**Price-path classes (closed first buys):** ordinary decline 80 (-4.10); runner missed: sold before the run 28 (-0.41); giveback 17 (-0.13); runner captured 12 (+3.11); ordinary gain 9 (+0.21); stagnation 4 (+0.08); abrupt collapse 3 (-0.28); runner missed: held through 2x and gave it back 1 (+0.09).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 133; thin pool 84; one buyer >=40% of 5-min buying 82; no follow-through (never +5%) 61; feed/quote quality flag 58.

**Largest winners:** HuN5y4 +0.67 (peak held 5.92×, 24-h high 5.92×); Bivugv +0.49 (peak held 4.99×, 24-h high 4.99×); 7cFiqd +0.29 (peak held 3.70×, 24-h high 4.89×); ELbCDk +0.27 (peak held 3.35×, 24-h high 3.94×).  
**Largest losers:** 3b7Wvf -0.17 (peak held 1.09×, 24-h high 1.09×); UQLWvk -0.16 (peak held 1.19×, 24-h high 3.42×); 3D7YQc -0.15 (peak held 1.11×, 24-h high 1.11×); 6fVQAu -0.14 (peak held 1.03×, 24-h high 1.06×).

**Closest book:** CONT-STALL — 100% of buys are the same buy; 0 of this book's 33 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 165 tests on this book):** `sells15 < 18` keeps 76 of 154 buys and 61% of winners; 32.9% of passing buys won (book 26.6%); net +0.72 against -1.41; halves +1.24 / -0.52; without best coin +0.05; runners kept 24, rejected 17. `mc < 67310` keeps 76 of 154 buys and 61% of winners; 32.9% of passing buys won (book 26.6%); net +0.54 against -1.41; halves +0.81 / -0.28; without best coin -0.16; runners kept 25, rejected 16.

**Doing well:** 31 of 104 followed buys reached 2× within 24 h; best row 25% trail (-1.09 SOL incl. open); 40 winners averaging 47.1%.  
**What causes the loss / kind of problem:** Strategy/exit. 41 of its buys reached 2× within 24 h but 28 of them were stopped out before the run; coins older than 36 h (A4) carry most of the loss. Wider stops made it worse, the 60-minute stall rule made it worse, and buying again made it worse.  
**Strongest supporting evidence:** best row 25% trail at -1.09 SOL.  
**Strongest contrary evidence:** negative without its best coin (-2.08); negative in both halves; worst row 60% trail at -4.50 SOL; 26% winners needing about 33% to break even at these average sizes.  
**Recommendation — TEST A VARIANT BESIDE IT.** Keep CONT as the parent and add ONE clock row beside it: sell at 4 hours if still open (the HH-BREAK-4H mechanism, which beat its parent on the same buys). Use the 25% stop as the reference row. Exploratory.

### SLOW-BUILD — CONTINUE COLLECTING

**Rule.** price crosses 2× its 4-hour low, only if the climb took 30+ minutes with no single 1-minute candle above +20%. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 21 Nov 00:44 UTC (older-1).

**First buys, 30% trail.** 20 buy decisions on 18 coins; 20 filled, 19 closed and measured, 1 open. Net -0.13 SOL (staked 4.01 SOL; open rows cost 0.201, last valued 0.232). Average -3.3%, median -14.2%; 7 won / 0 flat / 12 lost; average winner 32.6%, average loser -24.2%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 7/5/1/0 of 16 followed. Median hold 63 min; exits trail:19. Best coin Fvv62M +0.13, worst CWKbSd -0.07; 6 coins net positive, 11 negative. Without the best 1 / 3 / 5 coins: -0.26 / -0.41 / -0.51. First half +0.11, second half -0.23. Largest drawdown 0.326 SOL; most rows open at once 4 (0.802 SOL). Strict evidence: -0.01 SOL on 17 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.04 (1 open) | -0.18 (1 open) | -0.10 (1 open) | +0.06 (2 open) | -0.09 (3 open) |
| Half at 2×, trail the rest | -0.02 (1 open) | -0.15 (1 open) | +0.05 (1 open) | +0.27 (2 open) | +0.20 (3 open) |

**By age group (30% trail, closed):** A1: -0.06 (2, 50% won); A2: +0.01 (4, 50% won); A4: -0.08 (13, 30.8% won).  
**By day of the buy:** 21 Nov: +0.13 (8); 22 Nov: -0.14 (9); 23 Nov: -0.12 (2).  
**Re-buys (30% trail):** 2 closed, -0.11 SOL, 0% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 9 (-0.42); runner missed: sold before the run 5 (-0.09); runner captured 2 (+0.25); giveback 1 (0.00); ordinary gain 1 (+0.05); runner missed: held through 2x and gave it back 1 (+0.09).

**Labels on losing rows (first buys and re-buys; a row can carry several):** one buyer >=40% of 5-min buying 11; bought extended (at the 1-h high or after +50% in 15 min) 11; no follow-through (never +5%) 9; thin pool 8; feed/quote quality flag 5.

**Largest winners:** Fvv62M +0.13 (peak held 2.37×, 24-h high 2.37×); Q1vecE +0.09 (peak held 2.10×, 24-h high 2.10×); 3umHFk +0.06 (peak held 2.27×, 24-h high 6.21×); GKFSuS +0.06 (peak held 1.71×, 24-h high 3.05×).  
**Largest losers:** CWKbSd -0.07 (peak held 0.98×, 24-h high 0.98×); 8xegBR -0.06 (peak held 0.97×, 24-h high 4.28×); DFKwjU -0.06 (peak held 0.97×, 24-h high 1.09×); BAKsQr -0.06 (peak held 1.00×, 24-h high 1.11×).

**Closest book:** LOW4H — 100% of buys are the same buy; 0 of this book's 6 profitable coins are not in it.

**Doing well:** 7 of 16 followed buys reached 2× within 24 h; best row 40% half-at-2× (+0.27 SOL incl. open); 7 winners averaging 32.6%.  
**What causes the loss / kind of problem:** Uncertain. Every SLOW-BUILD buy is also a LOW4H buy (it is LOW4H restricted to slow rises). Near break-even on 19 closed buys.  
**Strongest supporting evidence:** best row 40% half-at-2× at +0.27 SOL; one half positive (+0.11 / -0.23).  
**Strongest contrary evidence:** negative without its best coin (-0.26); second half -0.23; worst row 25% trail at -0.18 SOL; 36.8% winners needing about 43% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running; it costs nothing extra and tells us whether the slow-rise subset of LOW4H is the better half. Judge at 60+ closed buys.

### HH-BREAK — KEEP UNCHANGED

**Rule.** new 60-minute high with the last 15 completed minutes' volume at 2× the 4-hour norm. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 20 Nov 14:53 UTC (older-1).

**First buys, 30% trail.** 172 buy decisions on 162 coins; 172 filled, 162 closed and measured, 10 open. Net +0.37 SOL (staked 34.486 SOL; open rows cost 2.005, last valued 1.975). Average 1.1%, median -5.9%; 63 won / 1 flat / 98 lost; average winner 31.6%, average loser -18.4%. Lost 40%+: 1.2%, 50%+: 0.6%, 60%+: 0%. Realised 2×/3×/5×/10×: 3/0/0/0; reachable within 24 h: 28/11/4/0 of 140 followed. Median hold 935 min; exits max-hold:61 trail:101. Best coin MAXXib +0.37, worst S5eZMs -0.10; 61 coins net positive, 91 negative. Without the best 1 / 3 / 5 coins: 0.00 / -0.61 / -0.94. First half +1.66, second half -1.29. Largest drawdown 1.616 SOL; most rows open at once 74 (14.837 SOL). Strict evidence: +0.61 SOL on 143 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.37 (9 open) | -0.11 (9 open) | +0.34 (10 open) | -0.13 (13 open) | -2.05 (21 open) |
| Half at 2×, trail the rest | -0.32 (9 open) | -0.01 (9 open) | +0.70 (10 open) | +0.72 (13 open) | -0.82 (21 open) |

**By age group (30% trail, closed):** A1: +0.27 (8, 37.5% won); A2: +0.04 (7, 28.6% won); A3: -0.07 (8, 25% won); A4: +0.14 (139, 40.3% won).  
**By day of the buy:** 21 Nov: +1.73 (85); 22 Nov: -0.87 (65); 23 Nov: -0.50 (12).  
**Re-buys (30% trail):** 55 closed, -1.06 SOL, 14.5% won; 49 open.

**Price-path classes (closed first buys):** stagnation 61 (+0.35); ordinary decline 46 (-2.29); runner missed: sold before the run 17 (-0.42); giveback 11 (-0.10); runner captured 11 (+2.06); ordinary gain 10 (+0.45); runner missed: held through 2x and gave it back 5 (+0.42); abrupt collapse 1 (-0.10).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 145; feed/quote quality flag 116; one buyer >=40% of 5-min buying 110; thin pool 86; no follow-through (never +5%) 67.

**Largest winners:** MAXXib +0.37 (peak held 4.10×, 24-h high 4.10×); EV7J2Q +0.33 (peak held 4.01×, 24-h high 5.81×); 3umHFk +0.28 (peak held 3.33×, 24-h high 5.15×); uHMWNF +0.17 (peak held 2.53×, 24-h high 2.53×).  
**Largest losers:** S5eZMs -0.10 (peak held 1.03×, 24-h high 1.09×); Hm1QUy -0.09 (peak held 1.19×, 24-h high 2.01×); QaHANx -0.09 (peak held 1.23×, 24-h high 1.23×); BwgcBr -0.08 (peak held 1.19×, 24-h high 1.19×).

**Closest book:** HH-BREAK-4H — 100% of buys are the same buy; 0 of this book's 61 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 154 tests on this book):** `sells15 < 14` keeps 120 of 162 buys and 81.3% of winners; 43.3% of passing buys won (book 39.5%); net +0.94 against +0.37; halves +1.28 / -0.34; without best coin +0.56; runners kept 22, rejected 11. `w5_vol_usd < 1184` keeps 120 of 162 buys and 79.7% of winners; 42.5% of passing buys won (book 39.5%); net +0.93 against +0.37; halves +1.26 / -0.33; without best coin +0.55; runners kept 20, rejected 13.

**Doing well:** 28 of 140 followed buys reached 2× within 24 h; best row 40% half-at-2× (+0.72 SOL incl. open); 63 winners averaging 31.6%.  
**What causes the loss / kind of problem:** Uncertain. The only book at or above zero, but the profit came from buys on 21 Nov; the second half is negative and without its best coin it is at zero.  
**Strongest supporting evidence:** net +0.37 SOL on 162 closed first buys; one half positive (+1.66 / -1.29).  
**Strongest contrary evidence:** negative without its best coin (0.00); second half -1.29; worst row 60% trail at -2.05 SOL; 38.9% winners needing about 37% to break even at these average sizes.  
**Recommendation — KEEP UNCHANGED.** Keep unchanged as the benchmark. Read it on the 30–40% half-at-2× rows as well as the 30% trail. Do not treat it as proven.

### CONT-STALL — RETIRE FROM ACTIVE RESEARCH

**Rule.** the same buys as CONT, but sold at 60 minutes if the position never reached 1.15×. clock book (shares the buys of CONT, adds a timed sale). Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 15:59 UTC (older-1).

**First buys, 30% trail.** 169 buy decisions on 131 coins; 161 filled, 159 closed and measured, 2 open. Net -2.27 SOL (staked 32.281 SOL; open rows cost 0.401, last valued 0.329). Average -7.1%, median -13.5%; 29 won / 1 flat / 129 lost; average winner 39.5%, average loser -17.6%. Lost 40%+: 0.6%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 4/1/0/0; reachable within 24 h: 31/18/5/1 of 104 followed. Median hold 60 min; exits trail:92 stall:67. Best coin Bivugv +0.49, worst UQLWvk -0.15; 24 coins net positive, 97 negative. Without the best 1 / 3 / 5 coins: -2.75 / -3.31 / -3.72. First half -0.71, second half -1.56. Largest drawdown 3.081 SOL; most rows open at once 9 (1.804 SOL). Strict evidence: -2.12 SOL on 138 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -2.41 | -1.73 (1 open) | -2.34 (2 open) | -3.18 (2 open) | -3.41 (11 open) |
| Half at 2×, trail the rest | -2.34 | -1.92 (1 open) | -2.43 (2 open) | -2.79 (2 open) | -1.80 (11 open) |

**By age group (30% trail, closed):** A1: -0.45 (20, 20% won); A2: -0.45 (21, 19% won); A3: +0.02 (21, 19% won); A4: -1.39 (97, 17.5% won).  
**By day of the buy:** 20 Nov: +0.36 (20); 21 Nov: -0.47 (41); 22 Nov: -1.54 (55); 23 Nov: -0.62 (43).  
**Re-buys (30% trail):** 48 closed, -0.34 SOL, 18.8% won; 5 open.

**Price-path classes (closed first buys):** stagnation 58 (-1.44); ordinary decline 43 (-2.17); runner missed: sold before the run 32 (-0.65); giveback 11 (-0.11); runner captured 8 (+1.85); ordinary gain 6 (+0.15); runner missed: held through 2x and gave it back 1 (+0.09).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 153; one buyer >=40% of 5-min buying 98; thin pool 96; no follow-through (never +5%) 96; feed/quote quality flag 93.

**Largest winners:** Bivugv +0.49 (peak held 4.99×, 24-h high 4.99×); 7cFiqd +0.29 (peak held 3.70×, 24-h high 4.89×); ELbCDk +0.27 (peak held 3.35×, 24-h high 3.94×); Fvv62M +0.22 (peak held 3.06×, 24-h high 3.35×).  
**Largest losers:** UQLWvk -0.15 (peak held 1.19×, 24-h high 3.42×); 3D7YQc -0.15 (peak held 1.11×, 24-h high 1.11×); SPHFHU -0.12 (peak held 0.99×, 24-h high 4.65×); 3b7Wvf -0.12 (peak held 1.09×, 24-h high 1.09×).

**Closest book:** CONT — 100% of buys are the same buy; 0 of this book's 24 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 165 tests on this book):** `big_candle_60m >= 0.1601` keeps 41 of 159 buys and 36.7% of winners; 26.8% of passing buys won (book 18.9%); net -0.18 against -2.27; halves -0.09 / -0.09; without best coin -0.67; runners kept 13, rejected 28. `age_s >= 1040000` keeps 41 of 159 buys and 23.3% of winners; 17.1% of passing buys won (book 18.9%); net -0.21 against -2.27; halves +0.28 / -0.49; without best coin -0.70; runners kept 5, rejected 36.

**Doing well:** 31 of 104 followed buys reached 2× within 24 h; best row 25% trail (-1.73 SOL incl. open); 29 winners averaging 39.5%.  
**What causes the loss / kind of problem:** Exit rule. On the same 154 buys it lost 0.76 SOL more than CONT: the 60-minute sale closed 62 positions, 15 of which went on to win under CONT, and those winners were worth more than the 47 losses avoided.  
**Strongest supporting evidence:** best row 25% trail at -1.73 SOL.  
**Strongest contrary evidence:** negative without its best coin (-2.75); negative in both halves; worst row 60% trail at -3.41 SOL; 18.2% winners needing about 31% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. It is the measured answer to ‘abandon weak follow-through after 60 minutes’ for CONT: it does not help.

### LOW4H-LIQ25K — RETIRE FROM ACTIVE RESEARCH

**Rule.** price crosses 2× its 4-hour low, only with $25K+ pool liquidity and under 5% price impact in and out. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 21 Nov 00:44 UTC (older-1).

**First buys, 30% trail.** 16 buy decisions on 15 coins; 16 filled, 14 closed and measured, 2 open. Net -0.44 SOL (staked 3.208 SOL; open rows cost 0.401, last valued 0.452). Average -15.7%, median -21.1%; 2 won / 0 flat / 12 lost; average winner 26.5%, average loser -22.8%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 3/2/0/0 of 10 followed. Median hold 48 min; exits trail:14. Best coin GKFSuS +0.06, worst BAKsQr -0.11; 2 coins net positive, 11 negative. Without the best 1 / 3 / 5 coins: -0.50 / -0.54 / -0.49. First half -0.14, second half -0.30. Largest drawdown 0.489 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -0.27 SOL on 11 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.22 (2 open) | -0.23 (2 open) | -0.39 (2 open) | -0.37 (3 open) | -0.11 (5 open) |
| Half at 2×, trail the rest | -0.22 (2 open) | -0.23 (2 open) | -0.39 (2 open) | -0.34 (3 open) | -0.02 (5 open) |

**By age group (30% trail, closed):** A1: -0.11 (3, 0% won); A2: -0.06 (1, 0% won); A4: -0.28 (10, 20% won).  
**By day of the buy:** 21 Nov: -0.08 (6); 22 Nov: -0.20 (5); 23 Nov: -0.16 (3).  
**Re-buys (30% trail):** 2 closed, +0.13 SOL, 50% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 9 (-0.45); runner missed: sold before the run 4 (-0.04); ordinary gain 1 (+0.05).

**Labels on losing rows (first buys and re-buys; a row can carry several):** feed/quote quality flag 7; one buyer >=40% of 5-min buying 7; bought extended (at the 1-h high or after +50% in 15 min) 7; no follow-through (never +5%) 6; stopped within 3 minutes 2.

**Largest winners:** GKFSuS +0.06 (peak held 1.71×, 24-h high 3.05×); uHMWNF +0.05 (peak held 1.69×, 24-h high 1.69×).  
**Largest losers:** BAKsQr -0.11 (peak held 1.10×, 24-h high 1.68×); CWKbSd -0.07 (peak held 0.98×, 24-h high 0.98×); KMifrk -0.07 (peak held 0.97×, 24-h high 1.01×); 3umHFk -0.06 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** LOW4H — 100% of buys are the same buy; 0 of this book's 2 profitable coins are not in it.

**Doing well:** 3 of 10 followed buys reached 2× within 24 h; best row 60% half-at-2× (-0.02 SOL incl. open); 2 winners averaging 26.5%.  
**What causes the loss / kind of problem:** Strategy. A subset of LOW4H (every buy is also a LOW4H buy) that did worse than its parent; it adds no profitable coin of its own.  
**Strongest supporting evidence:** best row 60% half-at-2× at -0.02 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.50); negative in both halves; worst row 30% half-at-2× at -0.39 SOL; 14.3% winners needing about 46% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. The liquidity floor did not improve LOW4H in this data; pooled across all books, deeper pools were not better either.

### FAST-1M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price doubles inside 1 minute. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 32 buy decisions on 32 coins; 31 filled, 31 closed and measured, 0 open. Net -0.91 SOL (staked 6.216 SOL; open rows cost 0, last valued 0). Average -14.7%, median -22.4%; 6 won / 0 flat / 25 lost; average winner 23.3%, average loser -23.8%. Lost 40%+: 3.2%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 8/7/4/0 of 24 followed. Median hold 4 min; exits trail:31. Best coin 2TngN4 +0.10, worst SoL6dM -0.08; 6 coins net positive, 25 negative. Without the best 1 / 3 / 5 coins: -1.01 / -1.12 / -1.18. First half -0.38, second half -0.54. Largest drawdown 0.955 SOL; most rows open at once 2 (0.401 SOL). Strict evidence: -0.86 SOL on 30 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.41 | -0.68 | -0.91 | -0.80 | -1.05 |
| Half at 2×, trail the rest | -0.41 | -0.63 | -0.86 | -0.73 | -0.97 |

**By age group (30% trail, closed):** A1: -0.17 (4, 0% won); A2: -0.05 (4, 25% won); A3: -0.10 (2, 0% won); A4: -0.59 (21, 23.8% won).  
**By day of the buy:** 20 Nov: -0.16 (5); 21 Nov: -0.24 (14); 22 Nov: -0.32 (8); 23 Nov: -0.20 (4).  
**Re-buys (30% trail):** 3 closed, +0.07 SOL, 33.3% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 17 (-0.82); runner missed: sold before the run 9 (-0.26); ordinary gain 3 (+0.14); abrupt collapse 1 (-0.08); runner captured 1 (+0.10).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 23; thin pool 13; stopped within 3 minutes 11; no follow-through (never +5%) 6; one buyer >=40% of 5-min buying 6.

**Largest winners:** 2TngN4 +0.10 (peak held 2.26×, 24-h high 3.03×); MAXXib +0.06 (peak held 1.86×, 24-h high 1.86×); GpiQNU +0.04 (peak held 1.41×, 24-h high 1.58×); 4eiNbS +0.04 (peak held 1.61×, 24-h high 1.61×).  
**Largest losers:** SoL6dM -0.08 (peak held 1.04×, 24-h high 1.04×); KMifrk -0.07 (peak held 0.97×, 24-h high 1.01×); Bivugv -0.07 (peak held 0.97×, 24-h high 0.97×); 8TiMkg -0.06 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** FAST-3M — 52% of buys are the same buy; 1 of this book's 6 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 113 tests on this book):** `from_hi1h < 0.0656` keeps 12 of 31 buys and 83.3% of winners; 41.7% of passing buys won (book 19.4%); net -0.09 against -0.91; halves -0.09 / 0.00; without best coin -0.20; runners kept 5, rejected 5. `from_hi1h < 0.124` keeps 18 of 31 buys and 100% of winners; 33.3% of passing buys won (book 19.4%); net -0.27 against -0.91; halves -0.18 / -0.10; without best coin -0.38; runners kept 8, rejected 2.

**Doing well:** 8 of 24 followed buys reached 2× within 24 h; best row 20% trail (-0.41 SOL incl. open); 6 winners averaging 23.3%.  
**What causes the loss / kind of problem:** Strategy/redundant. Half of its buys are FAST-3M buys and only 1 of its 6 profitable coins is not in FAST-3M.  
**Strongest supporting evidence:** best row 20% trail at -0.41 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.01); negative in both halves; worst row 60% trail at -1.05 SOL; 19.4% winners needing about 51% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire as redundant with FAST-3M.

### FAST-3M — CONTINUE COLLECTING

**Rule.** price doubles inside 3 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 40 buy decisions on 40 coins; 39 filled, 39 closed and measured, 0 open. Net -0.63 SOL (staked 7.82 SOL; open rows cost 0, last valued 0). Average -8%, median -19.5%; 10 won / 0 flat / 29 lost; average winner 34.4%, average loser -22.6%. Lost 40%+: 2.6%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 11/9/4/1 of 30 followed. Median hold 5 min; exits trail:39. Best coin Bivugv +0.20, worst Hm1QUy -0.09; 10 coins net positive, 29 negative. Without the best 1 / 3 / 5 coins: -0.82 / -1.11 / -1.23. First half -0.19, second half -0.43. Largest drawdown 0.853 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -0.58 SOL on 38 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.55 | -0.31 | -0.63 | -1.03 | -0.94 |
| Half at 2×, trail the rest | -0.55 | -0.28 | -0.57 | -0.89 | -1.06 |

**By age group (30% trail, closed):** A1: +0.01 (5, 20% won); A2: -0.04 (5, 20% won); A3: -0.09 (2, 0% won); A4: -0.51 (27, 29.6% won).  
**By day of the buy:** 20 Nov: +0.08 (9); 21 Nov: -0.26 (13); 22 Nov: -0.20 (11); 23 Nov: -0.24 (6).  
**Re-buys (30% trail):** 7 closed, -0.08 SOL, 14.3% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 18 (-0.88); runner missed: sold before the run 10 (-0.29); ordinary gain 5 (+0.18); runner captured 3 (+0.48); giveback 2 (-0.03); abrupt collapse 1 (-0.09).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 32; thin pool 19; stopped within 3 minutes 11; no follow-through (never +5%) 10; one buyer >=40% of 5-min buying 7.

**Largest winners:** Bivugv +0.20 (peak held 2.90×, 24-h high 2.90×); 4npJ3a +0.18 (peak held 2.72×, 24-h high 2.72×); 2TngN4 +0.10 (peak held 2.26×, 24-h high 3.03×); 4eiNbS +0.06 (peak held 1.75×, 24-h high 1.75×).  
**Largest losers:** Hm1QUy -0.09 (peak held 1.26×, 24-h high 1.26×); AGmKjJ -0.08 (peak held 1.03×, 24-h high 1.03×); KMifrk -0.07 (peak held 0.97×, 24-h high 1.01×); SoL6dM -0.07 (peak held 0.99×, 24-h high 0.99×).

**Closest book:** FAST-5M — 51% of buys are the same buy; 3 of this book's 10 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 137 tests on this book):** `from_hi1h < 0.063` keeps 15 of 39 buys and 80% of winners; 53.3% of passing buys won (book 25.6%); net +0.35 against -0.63; halves +0.14 / +0.21; without best coin +0.15; runners kept 6, rejected 7. `rt_impact < 0.0027` keeps 17 of 39 buys and 60% of winners; 35.3% of passing buys won (book 25.6%); net +0.15 against -0.63; halves -0.01 / +0.15; without best coin -0.05; runners kept 7, rejected 6.

**Doing well:** 11 of 30 followed buys reached 2× within 24 h; best row 25% half-at-2× (-0.28 SOL incl. open); 10 winners averaging 34.4%.  
**What causes the loss / kind of problem:** Uncertain. A third of followed buys reached 2× within 24 h, but 10 of 13 runners were stopped out before the run. Small sample.  
**Strongest supporting evidence:** best row 25% half-at-2× at -0.28 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.82); negative in both halves; worst row 60% half-at-2× at -1.06 SOL; 25.6% winners needing about 40% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged with FAST-5M as the two representatives of the 2× family. Judge at 100+ closed first buys.

### FAST-5M — CONTINUE COLLECTING

**Rule.** price doubles inside 5 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 44 buy decisions on 43 coins; 43 filled, 43 closed and measured, 0 open. Net -0.86 SOL (staked 8.622 SOL; open rows cost 0, last valued 0). Average -10%, median -19.7%; 10 won / 1 flat / 32 lost; average winner 30.9%, average loser -23.1%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 13/9/4/1 of 33 followed. Median hold 5 min; exits trail:43. Best coin Bivugv +0.20, worst 5rtYav -0.07; 10 coins net positive, 32 negative. Without the best 1 / 3 / 5 coins: -1.06 / -1.29 / -1.39. First half -0.14, second half -0.72. Largest drawdown 1.103 SOL; most rows open at once 2 (0.401 SOL). Strict evidence: -0.81 SOL on 41 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.67 | -0.63 | -0.86 | -1.02 | -1.46 (1 open) |
| Half at 2×, trail the rest | -0.67 | -0.61 | -0.83 | -0.65 | -1.55 (1 open) |

**By age group (30% trail, closed):** A1: -0.25 (6, 0% won); A2: -0.14 (5, 0% won); A3: -0.14 (3, 0% won); A4: -0.34 (29, 34.5% won).  
**By day of the buy:** 20 Nov: +0.12 (9); 21 Nov: -0.27 (11); 22 Nov: -0.50 (18); 23 Nov: -0.20 (5).  
**Re-buys (30% trail):** 9 closed, -0.14 SOL, 11.1% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 22 (-1.18); runner missed: sold before the run 11 (-0.14); ordinary gain 4 (+0.20); giveback 3 (-0.03); runner captured 2 (+0.33); abrupt collapse 1 (-0.04).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 37; thin pool 22; stopped within 3 minutes 14; no follow-through (never +5%) 12; one buyer >=40% of 5-min buying 8.

**Largest winners:** Bivugv +0.20 (peak held 2.90×, 24-h high 2.90×); 6ZbWPY +0.13 (peak held 2.42×, 24-h high 4.28×); 4eiNbS +0.10 (peak held 1.97×, 24-h high 1.97×); MAXXib +0.06 (peak held 1.86×, 24-h high 1.86×).  
**Largest losers:** 5rtYav -0.07 (peak held 0.97×, 24-h high 0.97×); SoL6dM -0.07 (peak held 1.02×, 24-h high 1.02×); KMifrk -0.07 (peak held 0.97×, 24-h high 1.01×); 4jPVfK -0.07 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** FAST-3M — 47% of buys are the same buy; 2 of this book's 10 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 144 tests on this book):** `from_hi1h < 0.0357` keeps 17 of 43 buys and 70% of winners; 41.2% of passing buys won (book 23.3%); net +0.01 against -0.86; halves -0.04 / +0.06; without best coin -0.12; runners kept 6, rejected 7. `mc >= 57810` keeps 22 of 43 buys and 80% of winners; 36.4% of passing buys won (book 23.3%); net +0.01 against -0.86; halves +0.08 / -0.07; without best coin -0.19; runners kept 8, rejected 5.

**Doing well:** 13 of 33 followed buys reached 2× within 24 h; best row 25% half-at-2× (-0.61 SOL incl. open); 10 winners averaging 30.9%.  
**What causes the loss / kind of problem:** Uncertain. Highest 2×-reach rate of any book (13 of 33 followed) and still negative: 11 of 13 runners were sold before the run at the 30% stop.  
**Strongest supporting evidence:** best row 25% half-at-2× at -0.61 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.06); negative in both halves; worst row 60% half-at-2× at -1.55 SOL; 23.3% winners needing about 43% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged. This is the book where a better exit would matter most; no tested exit fixes it yet.

### FAST-10M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price doubles inside 10 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 21 Nov 13:10 UTC (older-4).

**First buys, 30% trail.** 36 buy decisions on 34 coins; 36 filled, 36 closed and measured, 0 open. Net -0.98 SOL (staked 7.218 SOL; open rows cost 0, last valued 0). Average -13.5%, median -23.3%; 5 won / 1 flat / 30 lost; average winner 50.4%, average loser -24.6%. Lost 40%+: 2.8%, 50%+: 2.8%, 60%+: 2.8%. Realised 2×/3×/5×/10×: 1/0/0/0; reachable within 24 h: 8/5/3/1 of 21 followed. Median hold 9 min; exits trail:36. Best coin FuKY3d +0.29, worst Fn95Nt -0.13; 5 coins net positive, 29 negative. Without the best 1 / 3 / 5 coins: -1.27 / -1.44 / -1.48. First half -0.57, second half -0.41. Largest drawdown 0.997 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -0.91 SOL on 33 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.63 | -0.87 | -0.98 | -1.49 | -1.51 (1 open) |
| Half at 2×, trail the rest | -0.61 | -0.90 | -0.98 | -1.41 | -1.72 (1 open) |

**By age group (30% trail, closed):** A1: -0.24 (6, 0% won); A2: -0.14 (5, 0% won); A3: +0.04 (6, 16.7% won); A4: -0.63 (19, 21.1% won).  
**By day of the buy:** 21 Nov: -0.14 (9); 22 Nov: -0.61 (20); 23 Nov: -0.23 (7).  
**Re-buys (30% trail):** 9 closed, -0.24 SOL, 0% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 21 (-1.07); runner missed: sold before the run 6 (-0.17); giveback 3 (-0.04); abrupt collapse 2 (-0.17); ordinary gain 2 (+0.09); runner captured 2 (+0.40).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 37; thin pool 21; no follow-through (never +5%) 14; one buyer >=40% of 5-min buying 13; repeat buy (churn) 9.

**Largest winners:** FuKY3d +0.29 (peak held 3.35×, 24-h high 16.65×); GKFSuS +0.11 (peak held 2.23×, 24-h high 2.23×); MAXXib +0.06 (peak held 1.86×, 24-h high 1.86×); HuN5y4 +0.03 (peak held 1.69×, 24-h high 2.00×).  
**Largest losers:** Fn95Nt -0.13 (peak held 1.22×, 24-h high 1.22×); 8PiG7r -0.08 (peak held 0.97×, 24-h high 0.97×); 3zJufN -0.07 (peak held 0.97×, 24-h high 0.97×); 51TUkC -0.07 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** FAST-5M — 44% of buys are the same buy; 0 of this book's 5 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 142 tests on this book):** `w5_top_buyer_share < 0.2425` keeps 17 of 36 buys and 80% of winners; 23.5% of passing buys won (book 13.9%); net -0.14 against -0.98; halves -0.22 / +0.08; without best coin -0.43; runners kept 6, rejected 2. `w5_vol_usd >= 6198` keeps 18 of 36 buys and 80% of winners; 22.2% of passing buys won (book 13.9%); net -0.24 against -0.98; halves -0.27 / +0.03; without best coin -0.53; runners kept 4, rejected 4.

**Doing well:** 8 of 21 followed buys reached 2× within 24 h; best row 20% half-at-2× (-0.61 SOL incl. open); 5 winners averaging 50.4%.  
**What causes the loss / kind of problem:** Strategy/redundant. None of its 5 profitable coins is missing from FAST-5M; lower win rate than the shorter clocks.  
**Strongest supporting evidence:** best row 20% half-at-2× at -0.61 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.27); negative in both halves; worst row 60% half-at-2× at -1.72 SOL; 13.9% winners needing about 33% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire as redundant with FAST-5M.

### FAST-30M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price doubles inside 30 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 21 Nov 13:10 UTC (older-4).

**First buys, 30% trail.** 40 buy decisions on 35 coins; 40 filled, 40 closed and measured, 0 open. Net -1.07 SOL (staked 8.02 SOL; open rows cost 0, last valued 0). Average -13.4%, median -23%; 6 won / 0 flat / 34 lost; average winner 46.3%, average loser -23.9%. Lost 40%+: 2.5%, 50%+: 2.5%, 60%+: 2.5%. Realised 2×/3×/5×/10×: 1/0/0/0; reachable within 24 h: 9/3/2/0 of 28 followed. Median hold 12 min; exits trail:40. Best coin HuN5y4 +0.17, worst Fn95Nt -0.13; 5 coins net positive, 30 negative. Without the best 1 / 3 / 5 coins: -1.24 / -1.51 / -1.56. First half -0.82, second half -0.26. Largest drawdown 1.076 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -1.04 SOL on 37 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.73 | -0.91 | -1.07 | -1.43 | -2.38 (1 open) |
| Half at 2×, trail the rest | -0.73 | -0.90 | -1.02 | -1.22 | -1.58 (1 open) |

**By age group (30% trail, closed):** A1: -0.17 (5, 0% won); A2: -0.28 (9, 11.1% won); A3: -0.16 (7, 14.3% won); A4: -0.46 (19, 21.1% won).  
**By day of the buy:** 21 Nov: -0.46 (12); 22 Nov: -0.39 (19); 23 Nov: -0.22 (9).  
**Re-buys (30% trail):** 16 closed, -0.39 SOL, 12.5% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 24 (-1.19); runner missed: sold before the run 9 (-0.22); runner captured 3 (+0.50); abrupt collapse 2 (-0.18); giveback 1 (-0.01); ordinary gain 1 (+0.03).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 40; thin pool 28; one buyer >=40% of 5-min buying 23; no follow-through (never +5%) 17; repeat buy (churn) 13.

**Largest winners:** HuN5y4 +0.17 (peak held 3.12×, 24-h high 3.12×); FuKY3d +0.16 (peak held 2.54×, 24-h high 2.56×); GKFSuS +0.11 (peak held 2.23×, 24-h high 2.23×); 4FP2GR +0.03 (peak held 1.60×, 24-h high 1.60×).  
**Largest losers:** Fn95Nt -0.13 (peak held 1.22×, 24-h high 1.22×); 8xegBR -0.09 (peak held 1.20×, 24-h high 4.96×); FryQiS -0.09 (peak held 1.17×, 24-h high 2.75×); 9k2nqj -0.07 (peak held 0.99×, 24-h high 0.99×).

**Closest book:** FAST-10M — 33% of buys are the same buy; 1 of this book's 5 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 153 tests on this book):** `w5_top_buyer_share < 0.3621` keeps 19 of 40 buys and 83.3% of winners; 26.3% of passing buys won (book 15%); net -0.11 against -1.07; halves -0.34 / +0.23; without best coin -0.28; runners kept 9, rejected 3. `w5_buys >= 31` keeps 21 of 40 buys and 83.3% of winners; 23.8% of passing buys won (book 15%); net -0.17 against -1.07; halves -0.34 / +0.16; without best coin -0.34; runners kept 8, rejected 4.

**Doing well:** 9 of 28 followed buys reached 2× within 24 h; best row 20% trail (-0.73 SOL incl. open); 6 winners averaging 46.3%.  
**What causes the loss / kind of problem:** Strategy/redundant. 15% winners, negative in both halves; only 1 of its 5 profitable coins is missing from FAST-10M.  
**Strongest supporting evidence:** best row 20% trail at -0.73 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.24); negative in both halves; worst row 60% trail at -2.38 SOL; 15% winners needing about 34% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire.

### FAST150-1M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price up 1.5× inside 1 minute. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 97 buy decisions on 86 coins; 93 filled, 93 closed and measured, 0 open. Net -1.43 SOL (staked 18.646 SOL; open rows cost 0, last valued 0). Average -7.7%, median -19.7%; 22 won / 2 flat / 69 lost; average winner 44.1%, average loser -24.4%. Lost 40%+: 5.4%, 50%+: 3.2%, 60%+: 0%. Realised 2×/3×/5×/10×: 4/0/0/0; reachable within 24 h: 20/13/4/2 of 72 followed. Median hold 9 min; exits trail:92 max-hold:1. Best coin Bivugv +0.35, worst DFKwjU -0.12; 20 coins net positive, 62 negative. Without the best 1 / 3 / 5 coins: -1.78 / -2.26 / -2.60. First half -0.10, second half -1.33. Largest drawdown 1.971 SOL; most rows open at once 5 (1.002 SOL). Strict evidence: -1.16 SOL on 84 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.92 | -0.88 | -1.43 | -2.12 (1 open) | -2.29 (4 open) |
| Half at 2×, trail the rest | -0.96 | -0.91 | -1.39 | -1.63 (1 open) | -2.12 (4 open) |

**By age group (30% trail, closed):** A1: -0.41 (15, 13.3% won); A2: -0.03 (13, 38.5% won); A3: -0.07 (9, 33.3% won); A4: -0.91 (56, 21.4% won).  
**By day of the buy:** 20 Nov: +0.04 (17); 21 Nov: -0.12 (32); 22 Nov: -0.91 (29); 23 Nov: -0.44 (15).  
**Re-buys (30% trail):** 26 closed, -0.32 SOL, 26.9% won; 2 open.

**Price-path classes (closed first buys):** ordinary decline 46 (-2.29); runner missed: sold before the run 18 (-0.33); giveback 9 (-0.10); ordinary gain 7 (+0.32); runner captured 7 (+1.44); abrupt collapse 5 (-0.49); stagnation 1 (+0.02).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 81; thin pool 52; no follow-through (never +5%) 40; one buyer >=40% of 5-min buying 35; stopped within 3 minutes 29.

**Largest winners:** Bivugv +0.35 (peak held 3.98×, 24-h high 3.98×); ELbCDk +0.27 (peak held 3.35×, 24-h high 3.94×); GKFSuS +0.22 (peak held 2.90×, 24-h high 6.53×); 2TngN4 +0.21 (peak held 3.03×, 24-h high 4.06×).  
**Largest losers:** DFKwjU -0.12 (peak held 1.00×, 24-h high 1.58×); 9msLfY -0.12 (peak held 1.04×, 24-h high 4.17×); Fn95Nt -0.12 (peak held 1.51×, 24-h high 1.51×); Hm1QUy -0.10 (peak held 1.09×, 24-h high 1.09×).

**Closest book:** FAST150-3M — 58% of buys are the same buy; 0 of this book's 20 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 153 tests on this book):** `vol60_usd >= 8041` keeps 21 of 93 buys and 34.8% of winners; 38.1% of passing buys won (book 24.7%); net +0.16 against -1.43; halves +0.39 / -0.23; without best coin -0.11; runners kept 7, rejected 18. `buy_sell15 < 1.305` keeps 42 of 93 buys and 60.9% of winners; 33.3% of passing buys won (book 24.7%); net +0.05 against -1.43; halves +0.08 / -0.04; without best coin -0.22; runners kept 14, rejected 11.

**Doing well:** 20 of 72 followed buys reached 2× within 24 h; best row 25% trail (-0.88 SOL incl. open); 22 winners averaging 44.1%.  
**What causes the loss / kind of problem:** Redundant. 58% of its buys are FAST150-3M buys and none of its 20 profitable coins is missing from FAST150-3M.  
**Strongest supporting evidence:** best row 25% trail at -0.88 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.78); negative in both halves; worst row 60% trail at -2.29 SOL; 23.7% winners needing about 36% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire as redundant.

### FAST150-3M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price up 1.5× inside 3 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 111 buy decisions on 97 coins; 107 filled, 107 closed and measured, 0 open. Net -1.33 SOL (staked 21.454 SOL; open rows cost 0, last valued 0). Average -6.2%, median -20%; 27 won / 2 flat / 78 lost; average winner 49.7%, average loser -25.7%. Lost 40%+: 3.7%, 50%+: 2.8%, 60%+: 0%. Realised 2×/3×/5×/10×: 6/0/0/0; reachable within 24 h: 19/12/5/2 of 81 followed. Median hold 11 min; exits trail:106 max-hold:1. Best coin 7R4MP6 +0.35, worst DFKwjU -0.12; 24 coins net positive, 69 negative. Without the best 1 / 3 / 5 coins: -1.68 / -2.29 / -2.73. First half -0.27, second half -1.06. Largest drawdown 1.623 SOL; most rows open at once 6 (1.203 SOL). Strict evidence: -1.22 SOL on 93 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.87 | -0.81 | -1.33 | -2.71 (1 open) | -2.54 (6 open) |
| Half at 2×, trail the rest | -1.00 | -0.89 | -1.28 | -2.34 (1 open) | -2.53 (6 open) |

**By age group (30% trail, closed):** A1: -0.30 (15, 26.7% won); A2: +0.29 (15, 40% won); A3: -0.03 (11, 45.5% won); A4: -1.29 (66, 18.2% won).  
**By day of the buy:** 20 Nov: -0.21 (22); 21 Nov: +0.08 (38); 22 Nov: -0.66 (28); 23 Nov: -0.54 (19).  
**Re-buys (30% trail):** 35 closed, -0.70 SOL, 17.1% won; 2 open.

**Price-path classes (closed first buys):** ordinary decline 62 (-3.10); runner missed: sold before the run 15 (-0.22); runner captured 10 (+2.14); ordinary gain 8 (+0.29); giveback 5 (-0.05); abrupt collapse 5 (-0.48); runner missed: held through 2x and gave it back 1 (+0.07); stagnation 1 (+0.02).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 94; thin pool 60; no follow-through (never +5%) 53; one buyer >=40% of 5-min buying 40; repeat buy (churn) 29.

**Largest winners:** 7R4MP6 +0.35 (peak held 3.61×, 24-h high 7.29×); Bivugv +0.35 (peak held 3.98×, 24-h high 3.98×); ELbCDk +0.27 (peak held 3.35×, 24-h high 3.94×); GKFSuS +0.22 (peak held 2.90×, 24-h high 6.53×).  
**Largest losers:** DFKwjU -0.12 (peak held 1.00×, 24-h high 1.58×); Fn95Nt -0.11 (peak held 1.56×, 24-h high 1.56×); SPHFHU -0.11 (peak held 1.05×, 24-h high 4.65×); Hm1QUy -0.10 (peak held 1.09×, 24-h high 1.84×).

**Closest book:** FAST150-5M — 64% of buys are the same buy; 0 of this book's 24 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 154 tests on this book):** `vol60_usd >= 7926` keeps 24 of 107 buys and 32.1% of winners; 37.5% of passing buys won (book 26.2%); net +0.31 against -1.33; halves +0.37 / -0.06; without best coin +0.04; runners kept 7, rejected 19. `vol60_usd >= 17300` keeps 13 of 107 buys and 17.9% of winners; 38.5% of passing buys won (book 26.2%); net +0.17 against -1.33; halves +0.10 / +0.07; without best coin -0.05; runners kept 3, rejected 23.

**Doing well:** 19 of 81 followed buys reached 2× within 24 h; best row 25% trail (-0.81 SOL incl. open); 27 winners averaging 49.7%.  
**What causes the loss / kind of problem:** Redundant. None of its 24 profitable coins is missing from FAST150-5M.  
**Strongest supporting evidence:** best row 25% trail at -0.81 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.68); negative in both halves; worst row 40% trail at -2.71 SOL; 25.2% winners needing about 34% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire as redundant with FAST150-5M.

### FAST150-5M — CONTINUE COLLECTING

**Rule.** price up 1.5× inside 5 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 14:53 UTC (older-2).

**First buys, 30% trail.** 120 buy decisions on 102 coins; 117 filled, 117 closed and measured, 0 open. Net -1.26 SOL (staked 23.459 SOL; open rows cost 0, last valued 0). Average -5.4%, median -21.9%; 28 won / 2 flat / 87 lost; average winner 57.1%, average loser -25.6%. Lost 40%+: 3.4%, 50%+: 2.6%, 60%+: 0%. Realised 2×/3×/5×/10×: 5/0/0/0; reachable within 24 h: 23/13/5/2 of 92 followed. Median hold 17 min; exits trail:115 max-hold:2. Best coin GKFSuS +0.38, worst DFKwjU -0.12; 23 coins net positive, 76 negative. Without the best 1 / 3 / 5 coins: -1.63 / -2.33 / -2.84. First half +0.28, second half -1.54. Largest drawdown 2.116 SOL; most rows open at once 8 (1.604 SOL). Strict evidence: -1.03 SOL on 100 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -1.58 | -1.08 | -1.26 | -3.20 (1 open) | -3.18 (7 open) |
| Half at 2×, trail the rest | -1.76 | -1.39 | -1.58 | -2.95 (1 open) | -3.06 (7 open) |

**By age group (30% trail, closed):** A1: -0.27 (17, 23.5% won); A2: +0.22 (16, 43.8% won); A3: +0.16 (11, 45.5% won); A4: -1.37 (73, 16.4% won).  
**By day of the buy:** 20 Nov: -0.03 (21); 21 Nov: +0.39 (41); 22 Nov: -0.94 (35); 23 Nov: -0.69 (20).  
**Re-buys (30% trail):** 42 closed, -0.93 SOL, 16.7% won; 3 open.

**Price-path classes (closed first buys):** ordinary decline 66 (-3.40); runner missed: sold before the run 19 (-0.33); runner captured 11 (+2.56); ordinary gain 9 (+0.40); giveback 6 (-0.05); abrupt collapse 4 (-0.41); stagnation 2 (-0.02).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 105; thin pool 68; no follow-through (never +5%) 61; one buyer >=40% of 5-min buying 44; repeat buy (churn) 35.

**Largest winners:** GKFSuS +0.37 (peak held 3.97×, 24-h high 8.93×); 7R4MP6 +0.35 (peak held 3.61×, 24-h high 7.29×); Bivugv +0.35 (peak held 3.98×, 24-h high 3.98×); ELbCDk +0.27 (peak held 3.35×, 24-h high 3.94×).  
**Largest losers:** DFKwjU -0.12 (peak held 1.00×, 24-h high 1.58×); 8T3ztD -0.12 (peak held 1.54×, 24-h high 2.80×); Fn95Nt -0.11 (peak held 1.56×, 24-h high 1.56×); Hm1QUy -0.10 (peak held 1.09×, 24-h high 1.84×).

**Closest book:** FAST150-3M — 58% of buys are the same buy; 2 of this book's 23 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 162 tests on this book):** `repeat_share15 < 0.1402` keeps 52 of 117 buys and 58.6% of winners; 32.7% of passing buys won (book 24.8%); net +0.54 against -1.26; halves +1.12 / -0.57; without best coin +0.17; runners kept 20, rejected 10. `w5_buys >= 78` keeps 26 of 117 buys and 27.6% of winners; 30.8% of passing buys won (book 24.8%); net +0.31 against -1.26; halves +0.28 / +0.03; without best coin -0.06; runners kept 5, rejected 25.

**Doing well:** 23 of 92 followed buys reached 2× within 24 h; best row 25% trail (-1.08 SOL incl. open); 28 winners averaging 57.1%.  
**What causes the loss / kind of problem:** Strategy. 117 closed buys, negative, and the second half is much worse than the first. It contains every profitable coin of FAST150-3M and FAST150-1M.  
**Strongest supporting evidence:** best row 25% trail at -1.08 SOL; one half positive (+0.28 / -1.54).  
**Strongest contrary evidence:** negative without its best coin (-1.63); second half -1.54; worst row 40% trail at -3.20 SOL; 23.9% winners needing about 31% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged as the one representative of the +50% family. If it is still negative at 250 closed first buys, retire the family.

### FAST150-10M — RETIRE FROM ACTIVE RESEARCH

**Rule.** price up 1.5× inside 10 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 21 Nov 13:10 UTC (older-4).

**First buys, 30% trail.** 102 buy decisions on 84 coins; 102 filled, 101 closed and measured, 1 open. Net -1.87 SOL (staked 20.451 SOL; open rows cost 0.201, last valued 0.172). Average -9.2%, median -21%; 20 won / 1 flat / 80 lost; average winner 47.8%, average loser -23.6%. Lost 40%+: 4%, 50%+: 2%, 60%+: 0%. Realised 2×/3×/5×/10×: 3/0/0/0; reachable within 24 h: 13/5/2/0 of 65 followed. Median hold 34 min; exits trail:101. Best coin 7R4MP6 +0.38, worst 3D7YQc -0.14; 14 coins net positive, 69 negative. Without the best 1 / 3 / 5 coins: -2.25 / -2.84 / -3.16. First half -0.57, second half -1.31. Largest drawdown 2.258 SOL; most rows open at once 9 (1.804 SOL). Strict evidence: -1.34 SOL on 83 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -1.53 | -1.44 (1 open) | -1.90 (1 open) | -2.89 (4 open) | -4.39 (16 open) |
| Half at 2×, trail the rest | -1.55 | -1.53 (1 open) | -1.96 (1 open) | -2.57 (4 open) | -3.36 (16 open) |

**By age group (30% trail, closed):** A1: -0.51 (18, 22.2% won); A2: +0.16 (12, 33.3% won); A3: +0.11 (13, 30.8% won); A4: -1.63 (58, 13.8% won).  
**By day of the buy:** 21 Nov: +0.15 (30); 22 Nov: -1.20 (43); 23 Nov: -0.82 (28).  
**Re-buys (30% trail):** 42 closed, -0.63 SOL, 19% won; 3 open.

**Price-path classes (closed first buys):** ordinary decline 59 (-3.01); runner missed: sold before the run 16 (-0.19); giveback 8 (-0.05); ordinary gain 7 (+0.30); runner captured 7 (+1.46); abrupt collapse 4 (-0.37).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 94; thin pool 61; one buyer >=40% of 5-min buying 60; no follow-through (never +5%) 45; repeat buy (churn) 34.

**Largest winners:** 7R4MP6 +0.38 (peak held 3.63×, 24-h high 7.32×); HuN5y4 +0.34 (peak held 3.64×, 24-h high 3.64×); 7cFiqd +0.25 (peak held 3.15×, 24-h high 5.57×); GKFSuS +0.19 (peak held 2.80×, 24-h high 2.80×).  
**Largest losers:** 3D7YQc -0.15 (peak held 1.11×, 24-h high 1.11×); 2Fm3qA -0.13 (peak held 1.39×, 24-h high 1.39×); DFKwjU -0.12 (peak held 0.98×, 24-h high 1.64×); Hm1QUy -0.10 (peak held 1.09×, 24-h high 1.84×).

**Closest book:** FAST150-5M — 40% of buys are the same buy; 3 of this book's 14 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 156 tests on this book):** `sells15 >= 98` keeps 26 of 101 buys and 52.4% of winners; 42.3% of passing buys won (book 20.8%); net +0.45 against -1.87; halves +0.42 / +0.04; without best coin +0.07; runners kept 9, rejected 14. `rt_impact < 0.0018` keeps 23 of 101 buys and 47.6% of winners; 43.5% of passing buys won (book 20.8%); net +0.44 against -1.87; halves +0.37 / +0.07; without best coin +0.06; runners kept 8, rejected 15.

**Doing well:** 13 of 65 followed buys reached 2× within 24 h; best row 25% trail (-1.44 SOL incl. open); 20 winners averaging 47.8%.  
**What causes the loss / kind of problem:** Strategy. Worst of the +50% family on about 100 buys; negative in both halves; 13 of 65 followed buys reached 2×, the lowest rate in the family.  
**Strongest supporting evidence:** best row 25% trail at -1.44 SOL.  
**Strongest contrary evidence:** negative without its best coin (-2.25); negative in both halves; worst row 60% trail at -4.39 SOL; 19.8% winners needing about 33% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire.

### SECOND-WAVE — CONTINUE COLLECTING

**Rule.** after a 1, 3 or 5-minute double: price falls 25%+ from its high, then breaks above that high within 60 minutes. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap pool events and sampled/routed (Jupiter) coins. Counting since 20 Nov 16:19 UTC (older-2).

**First buys, 30% trail.** 16 buy decisions on 16 coins; 16 filled, 16 closed and measured, 0 open. Net -0.48 SOL (staked 3.208 SOL; open rows cost 0, last valued 0). Average -15.1%, median -19.6%; 2 won / 0 flat / 14 lost; average winner 36.8%, average loser -22.5%. Lost 40%+: 6.3%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 3/3/2/1 of 14 followed. Median hold 4 min; exits trail:16. Best coin FuKY3d +0.11, worst FJKt1L -0.09; 2 coins net positive, 14 negative. Without the best 1 / 3 / 5 coins: -0.59 / -0.62 / -0.58. First half -0.36, second half -0.12. Largest drawdown 0.515 SOL; most rows open at once 2 (0.401 SOL). Strict evidence: -0.47 SOL on 15 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.40 | -0.45 | -0.48 | -0.73 | -0.16 |
| Half at 2×, trail the rest | -0.40 | -0.45 | -0.43 | -0.66 | -0.43 |

**By age group (30% trail, closed):** A1: -0.02 (2, 50% won); A2: -0.15 (3, 0% won); A3: +0.11 (1, 100% won); A4: -0.42 (10, 0% won).  
**By day of the buy:** 20 Nov: -0.16 (4); 21 Nov: -0.20 (4); 22 Nov: -0.12 (8).  
**Re-buys (30% trail):** 3 closed, +0.07 SOL, 66.7% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 9 (-0.38); giveback 2 (-0.04); runner missed: sold before the run 2 (-0.12); abrupt collapse 1 (-0.09); ordinary gain 1 (+0.04); runner captured 1 (+0.11).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 11; thin pool 7; no follow-through (never +5%) 6; stopped within 3 minutes 4; one buyer >=40% of 5-min buying 3.

**Largest winners:** FuKY3d +0.11 (peak held 2.11×, 24-h high 10.53×); 2Fm3qA +0.04 (peak held 1.64×, 24-h high 1.64×).  
**Largest losers:** FJKt1L -0.09 (peak held 1.00×, 24-h high 1.00×); KMifrk -0.08 (peak held 0.98×, 24-h high 0.98×); 8TiMkg -0.06 (peak held 0.97×, 24-h high 0.97×); UQLWvk -0.06 (peak held 0.97×, 24-h high 3.54×).

**Closest book:** FAST150-5M — 13% of buys are the same buy; 0 of this book's 2 profitable coins are not in it.

**Doing well:** 3 of 14 followed buys reached 2× within 24 h; best row 60% trail (-0.16 SOL incl. open); 2 winners averaging 36.8%.  
**What causes the loss / kind of problem:** Uncertain. 16 closed buys, 2 winners. A distinct mechanism (pull-back, then a new high) with too few observations.  
**Strongest supporting evidence:** best row 60% trail at -0.16 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.59); negative in both halves; worst row 40% trail at -0.73 SOL; 12.5% winners needing about 38% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged; low priority. Judge at 60+ closed buys.

### HH30-5M — TEST A VARIANT BESIDE IT

**Rule.** new 30-minute high with the last 5 completed minutes' volume at 2× the 2-hour norm. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 16:12 UTC (older-6).

**First buys, 30% trail.** 201 buy decisions on 170 coins; 201 filled, 192 closed and measured, 9 open. Net -3.17 SOL (staked 40.3 SOL; open rows cost 1.804, last valued 1.796). Average -8.2%, median -14.6%; 53 won / 1 flat / 138 lost; average winner 25.5%, average loser -21.3%. Lost 40%+: 1%, 50%+: 1%, 60%+: 0.5%. Realised 2×/3×/5×/10×: 1/0/0/0; reachable within 24 h: 21/9/2/0 of 157 followed. Median hold 389 min; exits trail:138 max-hold:54. Best coin 8rjgC1 +0.24, worst Fn95Nt -0.18; 46 coins net positive, 115 negative. Without the best 1 / 3 / 5 coins: -3.42 / -3.82 / -4.11. First half -1.57, second half -1.60. Largest drawdown 3.33 SOL; most rows open at once 80 (16.04 SOL). Strict evidence: -2.55 SOL on 164 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -2.64 (8 open) | -3.29 (9 open) | -3.18 (9 open) | -4.27 (11 open) | -4.46 (26 open) |
| Half at 2×, trail the rest | -2.57 (8 open) | -3.11 (9 open) | -2.82 (9 open) | -3.77 (11 open) | -3.00 (26 open) |

**By age group (30% trail, closed):** A1: -0.45 (14, 21.4% won); A2: -0.31 (17, 29.4% won); A3: -0.39 (18, 22.2% won); A4: -2.02 (143, 28.7% won).  
**By day of the buy:** 21 Nov: -0.08 (70); 22 Nov: -2.41 (94); 23 Nov: -0.68 (28).  
**Re-buys (30% trail):** 95 closed, -2.02 SOL, 14.7% won; 51 open.

**Price-path classes (closed first buys):** ordinary decline 89 (-4.47); stagnation 53 (+0.18); runner missed: sold before the run 18 (-0.29); giveback 11 (-0.04); ordinary gain 9 (+0.37); runner captured 7 (+1.10); runner missed: held through 2x and gave it back 3 (+0.26); abrupt collapse 2 (-0.28).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 178; feed/quote quality flag 152; one buyer >=40% of 5-min buying 151; thin pool 124; no follow-through (never +5%) 120.

**Largest winners:** 8rjgC1 +0.24 (peak held 2.36×, 24-h high 2.36×); 7R4MP6 +0.24 (peak held 2.47×, 24-h high 2.47×); 2Lw9FQ +0.16 (peak held 2.58×, 24-h high 2.58×); USEu5q +0.16 (peak held 2.58×, 24-h high 2.58×).  
**Largest losers:** Fn95Nt -0.18 (peak held 1.28×, 24-h high 1.28×); 51TUkC -0.17 (peak held 1.09×, 24-h high 2.27×); 2Fm3qA -0.16 (peak held 1.53×, 24-h high 1.53×); 6J3ApV -0.15 (peak held 1.20×, 24-h high 1.60×).

**Closest book:** HH30-10M — 42% of buys are the same buy; 1 of this book's 46 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 165 tests on this book):** `mc >= 158400` keeps 49 of 192 buys and 33.3% of winners; 36.7% of passing buys won (book 28.1%); net +0.02 against -3.17; halves +0.07 / -0.05; without best coin -0.22; runners kept 7, rejected 21. `recovery4h < 1.074` keeps 13 of 192 buys and 13% of winners; 53.8% of passing buys won (book 28.1%); net 0.00 against -3.17; halves +0.08 / -0.08; without best coin -0.10; runners kept 0, rejected 28.

**Doing well:** 21 of 157 followed buys reached 2× within 24 h; best row 20% half-at-2× (-2.57 SOL incl. open); 53 winners averaging 25.5%.  
**What causes the loss / kind of problem:** Strategy. About 190 closed buys, negative in both halves, on every stop and in every age group; re-buys were worse still. It holds many positions at once (16 SOL at peak on one row).  
**Strongest supporting evidence:** best row 20% half-at-2× at -2.57 SOL.  
**Strongest contrary evidence:** negative without its best coin (-3.42); negative in both halves; worst row 60% trail at -4.46 SOL; 27.6% winners needing about 46% to break even at these average sizes.  
**Recommendation — TEST A VARIANT BESIDE IT.** Do not keep it as it is. It covers all 42 profitable coins of HH30-10M, so use it as the family representative and add ONE clock row (sell at 4 hours). If the clock row is not better on the same buys after 150 buys, retire the family.

### HH30-10M — RETIRE FROM ACTIVE RESEARCH

**Rule.** new 30-minute high with the last 10 completed minutes' volume at 2× the 2-hour norm. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 16:12 UTC (older-6).

**First buys, 30% trail.** 202 buy decisions on 175 coins; 202 filled, 191 closed and measured, 11 open. Net -3.50 SOL (staked 40.501 SOL; open rows cost 2.206, last valued 2.162). Average -9.1%, median -15.1%; 46 won / 2 flat / 143 lost; average winner 26%, average loser -20.6%. Lost 40%+: 1%, 50%+: 1%, 60%+: 0.5%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 21/5/1/0 of 156 followed. Median hold 561 min; exits max-hold:58 trail:133. Best coin 7R4MP6 +0.24, worst Fn95Nt -0.18; 42 coins net positive, 122 negative. Without the best 1 / 3 / 5 coins: -3.74 / -4.03 / -4.28. First half -1.77, second half -1.74. Largest drawdown 3.589 SOL; most rows open at once 91 (18.245 SOL). Strict evidence: -2.88 SOL on 166 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -2.56 (8 open) | -3.34 (10 open) | -3.55 (11 open) | -4.29 (13 open) | -4.93 (28 open) |
| Half at 2×, trail the rest | -2.49 (8 open) | -3.19 (10 open) | -3.10 (11 open) | -3.47 (13 open) | -3.43 (28 open) |

**By age group (30% trail, closed):** A1: -0.19 (12, 16.7% won); A2: -0.28 (15, 26.7% won); A3: -0.24 (16, 25% won); A4: -2.79 (148, 24.3% won).  
**By day of the buy:** 21 Nov: -0.51 (71); 22 Nov: -2.22 (92); 23 Nov: -0.77 (28).  
**Re-buys (30% trail):** 86 closed, -2.16 SOL, 14% won; 58 open.

**Price-path classes (closed first buys):** ordinary decline 86 (-4.29); stagnation 58 (-0.12); runner missed: sold before the run 18 (-0.34); giveback 11 (-0.05); runner captured 8 (+1.10); ordinary gain 5 (+0.24); runner missed: held through 2x and gave it back 3 (+0.25); abrupt collapse 2 (-0.28).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 194; feed/quote quality flag 154; one buyer >=40% of 5-min buying 151; thin pool 124; no follow-through (never +5%) 115.

**Largest winners:** 7R4MP6 +0.24 (peak held 2.47×, 24-h high 2.47×); USEu5q +0.16 (peak held 2.58×, 24-h high 2.58×); 2Lw9FQ +0.13 (peak held 2.36×, 24-h high 2.36×); 412ECW +0.13 (peak held 2.23×, 24-h high 3.18×).  
**Largest losers:** Fn95Nt -0.18 (peak held 1.10×, 24-h high 1.10×); 7CvW68 -0.16 (peak held 1.29×, 24-h high 3.89×); G74SSW -0.13 (peak held 1.44×, 24-h high 2.61×); 3b7Wvf -0.11 (peak held 1.13×, 24-h high 1.13×).

**Closest book:** HH30-5M — 42% of buys are the same buy; 0 of this book's 42 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 162 tests on this book):** `drawdown4h >= -0.2049` keeps 16 of 191 buys and 12.5% of winners; 37.5% of passing buys won (book 25.1%); net -0.04 against -3.50; halves +0.12 / -0.16; without best coin -0.13; runners kept 1, rejected 28. `w5_vol_usd < 102` keeps 47 of 191 buys and 39.6% of winners; 40.4% of passing buys won (book 25.1%); net -0.06 against -3.50; halves +0.06 / -0.12; without best coin -0.15; runners kept 1, rejected 28.

**Doing well:** 21 of 156 followed buys reached 2× within 24 h; best row 20% half-at-2× (-2.49 SOL incl. open); 46 winners averaging 26%.  
**What causes the loss / kind of problem:** Redundant. None of its 42 profitable coins is missing from HH30-5M; same loss.  
**Strongest supporting evidence:** best row 20% half-at-2× at -2.49 SOL.  
**Strongest contrary evidence:** negative without its best coin (-3.74); negative in both halves; worst row 60% trail at -4.93 SOL; 24.1% winners needing about 44% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire as redundant with HH30-5M.

### HH15-5M — RETIRE FROM ACTIVE RESEARCH

**Rule.** new 15-minute high with the last 5 completed minutes' volume at 2× the 1-hour norm. rule book. Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 16:12 UTC (older-6).

**First buys, 30% trail.** 225 buy decisions on 183 coins; 225 filled, 218 closed and measured, 7 open. Net -2.50 SOL (staked 45.113 SOL; open rows cost 1.404, last valued 1.309). Average -5.7%, median -12.6%; 59 won / 3 flat / 156 lost; average winner 30.5%, average loser -19.5%. Lost 40%+: 1.8%, 50%+: 0.9%, 60%+: 0.5%. Realised 2×/3×/5×/10×: 3/0/0/0; reachable within 24 h: 24/8/3/0 of 175 followed. Median hold 419 min; exits max-hold:67 trail:151. Best coin 8rjgC1 +0.26, worst 6J3ApV -0.21; 49 coins net positive, 129 negative. Without the best 1 / 3 / 5 coins: -2.75 / -3.24 / -3.60. First half -1.62, second half -0.87. Largest drawdown 2.678 SOL; most rows open at once 89 (17.845 SOL). Strict evidence: -2.31 SOL on 192 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -2.46 (3 open) | -2.81 (5 open) | -2.59 (7 open) | -3.98 (8 open) | -5.25 (22 open) |
| Half at 2×, trail the rest | -2.35 (3 open) | -2.67 (5 open) | -2.24 (7 open) | -3.33 (8 open) | -3.28 (22 open) |

**By age group (30% trail, closed):** A1: -0.67 (19, 21.1% won); A2: -0.24 (21, 28.6% won); A3: +0.02 (23, 26.1% won); A4: -1.60 (155, 27.7% won).  
**By day of the buy:** 21 Nov: -0.46 (104); 22 Nov: -1.77 (82); 23 Nov: -0.27 (32).  
**Re-buys (30% trail):** 132 closed, -3.56 SOL, 12.9% won; 84 open.

**Price-path classes (closed first buys):** ordinary decline 91 (-4.30); stagnation 66 (+0.08); runner missed: sold before the run 21 (-0.34); runner captured 12 (+1.95); giveback 11 (-0.04); ordinary gain 11 (+0.45); abrupt collapse 4 (-0.46); runner missed: held through 2x and gave it back 2 (+0.16).

**Labels on losing rows (first buys and re-buys; a row can carry several):** one buyer >=40% of 5-min buying 178; feed/quote quality flag 176; bought extended (at the 1-h high or after +50% in 15 min) 170; thin pool 159; no follow-through (never +5%) 126.

**Largest winners:** 8rjgC1 +0.25 (peak held 2.43×, 24-h high 2.43×); 7cFiqd +0.25 (peak held 3.31×, 24-h high 5.08×); 7R4MP6 +0.24 (peak held 2.47×, 24-h high 2.47×); USEu5q +0.21 (peak held 2.95×, 24-h high 2.95×).  
**Largest losers:** 6J3ApV -0.21 (peak held 1.20×, 24-h high 1.62×); 82mseL -0.18 (peak held 1.07×, 24-h high 1.07×); 3b7Wvf -0.15 (peak held 1.18×, 24-h high 1.18×); 3D7YQc -0.13 (peak held 1.25×, 24-h high 1.38×).

**Closest book:** HH30-5M — 21% of buys are the same buy; 3 of this book's 49 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 161 tests on this book):** `mc >= 169800` keeps 56 of 218 buys and 35% of winners; 37.5% of passing buys won (book 27.5%); net +0.25 against -2.50; halves +0.06 / +0.19; without best coin -0.01; runners kept 9, rejected 26. `mc_to_liq >= 4.732` keeps 56 of 218 buys and 33.3% of winners; 35.7% of passing buys won (book 27.5%); net +0.20 against -2.50; halves +0.05 / +0.15; without best coin -0.05; runners kept 10, rejected 25.

**Doing well:** 24 of 175 followed buys reached 2× within 24 h; best row 30% half-at-2× (-2.24 SOL incl. open); 59 winners averaging 30.5%.  
**What causes the loss / kind of problem:** Strategy. 218 closed buys, negative in both halves and on every stop; its re-buys lost more than any other book's.  
**Strongest supporting evidence:** best row 30% half-at-2× at -2.24 SOL.  
**Strongest contrary evidence:** negative without its best coin (-2.75); negative in both halves; worst row 60% trail at -5.25 SOL; 27.1% winners needing about 39% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire.

### HH-BREAK-4H — KEEP UNCHANGED

**Rule.** the same buys as HH-BREAK, but sold at 4 hours if the position is still open. clock book (shares the buys of HH-BREAK, adds a timed sale). Ages A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since – UTC (older-7).

**First buys, 30% trail.** 172 buy decisions on 162 coins; 172 filled, 98 closed and measured, 0 open, 74 estimated (excluded). Net -0.11 SOL (staked 34.486 SOL; open rows cost 0, last valued 0). Average -0.6%, median -4.7%; 27 won / 2 flat / 69 lost; average winner 33.9%, average loser -14.1%. Lost 40%+: 2%, 50%+: 1%, 60%+: 0%. Realised 2×/3×/5×/10×: 2/0/0/0; reachable within 24 h: 28/11/4/0 of 140 followed. Median hold 240 min; exits trail:41 clock:57. Best coin MAXXib +0.37, worst S5eZMs -0.10; 26 coins net positive, 64 negative. Without the best 1 / 3 / 5 coins: -0.48 / -0.93 / -1.22. First half +0.73, second half -0.84. Largest drawdown 1.201 SOL; most rows open at once 52 (10.426 SOL). Strict evidence: +0.14 SOL on 81 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.57 | -0.63 | -0.11 | -0.69 | -0.89 |
| Half at 2×, trail the rest | -0.60 | -0.60 | -0.03 | -0.45 | -0.64 |

**By age group (30% trail, closed):** A1: -0.07 (7, 28.6% won); A2: +0.04 (7, 28.6% won); A3: +0.01 (7, 28.6% won); A4: -0.08 (77, 27.3% won).  
**By day of the buy:** 21 Nov: +0.90 (11); 22 Nov: -0.64 (73); 23 Nov: -0.37 (14).  
**Re-buys (30% trail):** 185 closed, -0.68 SOL, 21.6% won; 1 open.

**Price-path classes (closed first buys):** stagnation 51 (-0.45); runner missed: sold before the run 18 (-0.34); ordinary decline 14 (-0.72); runner captured 7 (+1.33); ordinary gain 4 (+0.18); giveback 3 (-0.02); abrupt collapse 1 (-0.10).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 205; feed/quote quality flag 182; no follow-through (never +5%) 162; one buyer >=40% of 5-min buying 159; repeat buy (churn) 136.

**Largest winners:** MAXXib +0.37 (peak held 4.10×, 24-h high 4.10×); 3umHFk +0.28 (peak held 3.33×, 24-h high 5.15×); uHMWNF +0.17 (peak held 2.53×, 24-h high 2.53×); USEu5q +0.15 (peak held 2.29×, 24-h high 2.29×).  
**Largest losers:** S5eZMs -0.10 (peak held 1.03×, 24-h high 1.09×); Hm1QUy -0.09 (peak held 1.19×, 24-h high 2.01×); i6Aop7 -0.07 (peak held 0.97×, 24-h high 1.10×); 3FEvMf -0.07 (peak held 0.98×, 24-h high 0.98×).

**Closest book:** HH-BREAK — 100% of buys are the same buy; 0 of this book's 26 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 159 tests on this book):** `vol_surge5 >= 4.55` keeps 46 of 98 buys and 58.6% of winners; 37% of passing buys won (book 29.6%); net +0.51 against -0.11; halves +0.85 / -0.34; without best coin +0.14; runners kept 13, rejected 12. `w5_buys >= 5` keeps 49 of 98 buys and 62.1% of winners; 36.7% of passing buys won (book 29.6%); net +0.42 against -0.11; halves +1.14 / -0.72; without best coin +0.04; runners kept 20, rejected 5.

**Doing well:** 28 of 140 followed buys reached 2× within 24 h; best row 30% half-at-2× (-0.03 SOL incl. open); 27 winners averaging 33.9%.  
**What causes the loss / kind of problem:** Data. Its buys are HH-BREAK's. Results before the book existed are estimates and are excluded, so its measured history starts on 21 Nov.  
**Strongest supporting evidence:** best row 30% half-at-2× at -0.03 SOL; one half positive (+0.73 / -0.84).  
**Strongest contrary evidence:** negative without its best coin (-0.48); second half -0.84; worst row 60% trail at -0.89 SOL; 27.6% winners needing about 29% to break even at these average sizes.  
**Recommendation — KEEP UNCHANGED.** Keep unchanged. On the same 88 measured buys it beat HH-BREAK on all eight stop/exit rows (30% trail: −0.02 against −0.48 SOL). This is the only exit change in the project with measured support on identical buys.

### VOL300K — RETIRE FROM ACTIVE RESEARCH

**Rule.** any age after migration: $300K or more traded in the last 5 minutes (coin worth $40K–$2M). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$2000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 5 buy decisions on 5 coins; 5 filled, 5 closed and measured, 0 open. Net -0.59 SOL (staked 1.002 SOL; open rows cost 0, last valued 0). Average -58.6%, median -69.4%; 0 won / 0 flat / 5 lost; average winner –%, average loser -58.6%. Lost 40%+: 60%, 50%+: 60%, 60%+: 60%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 0/0/0/0 of 3 followed. Median hold 1 min; exits trail:5. Best coin Csu5jt -0.04, worst p44sDi -0.20; 0 coins net positive, 5 negative. Without the best 1 / 3 / 5 coins: -0.54 / -0.35 / 0.00. First half -0.29, second half -0.30. Largest drawdown 0.587 SOL; most rows open at once 1 (0.201 SOL). Strict evidence: -0.54 SOL on 4 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.45 | -0.48 | -0.59 | -0.65 | -0.79 |
| Half at 2×, trail the rest | -0.45 | -0.48 | -0.59 | -0.65 | -0.79 |

**By age group (30% trail, closed):** A0: -0.05 (1, 0% won); A3: -0.20 (1, 0% won); A4: -0.34 (3, 0% won).  
**By day of the buy:** 22 Nov: -0.49 (3); 23 Nov: -0.10 (2).  
**Re-buys (30% trail):** 2 closed, -0.24 SOL, 0% won; 0 open.

**Price-path classes (closed first buys):** abrupt collapse 3 (-0.49); ordinary decline 2 (-0.10).

**Labels on losing rows (first buys and re-buys; a row can carry several):** stopped within 3 minutes 7; bought extended (at the 1-h high or after +50% in 15 min) 6; no follow-through (never +5%) 5; sale well below trigger 4; thin pool 2.

**Largest winners:** none.  
**Largest losers:** p44sDi -0.20 (peak held 0.97×, 24-h high 0.97×); uL7vqm -0.15 (peak held 0.97×, 24-h high 0.97×); 8EzKJg -0.14 (peak held 0.97×, 24-h high 0.97×); 5KzT4p -0.05 (peak held 1.08×, 24-h high 1.08×).

**Closest book:** VOL500K — 60% of buys are the same buy; 0 of this book's 0 profitable coins are not in it.

**Doing well:** 0 of 3 followed buys reached 2× within 24 h; best row 20% trail (-0.45 SOL incl. open); 0 winners averaging –%.  
**What causes the loss / kind of problem:** Strategy. All 5 closed buys lost, 3 of them more than 40%: heavy 5-minute volume without a rising price is often the dump itself.  
**Strongest supporting evidence:** best row 20% trail at -0.45 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.54); negative in both halves; worst row 60% half-at-2× at -0.79 SOL; 0% winners needing about –% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. VOL300K-UP sees the same signals with a direction check.

### VOL300K-UP — REPAIR BEFORE JUDGING

**Rule.** any age after migration: $300K or more traded in the last 5 minutes and the price higher than 5 minutes ago ($40K–$2M). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$2000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 2 buy decisions on 2 coins; 2 filled, 2 closed and measured, 0 open. Net -0.10 SOL (staked 0.401 SOL; open rows cost 0, last valued 0). Average -24.4%, median -24.4%; 0 won / 0 flat / 2 lost; average winner –%, average loser -24.4%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 0/0/0/0 of 0 followed. Median hold 1 min; exits trail:2. Best coin Csu5jt -0.04, worst 5KzT4p -0.05; 0 coins net positive, 2 negative. Without the best 1 / 3 / 5 coins: -0.05 / 0.00 / 0.00. First half -0.05, second half -0.04. Largest drawdown 0.098 SOL; most rows open at once 1 (0.201 SOL). Strict evidence: -0.05 SOL on 1 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.05 | -0.09 | -0.10 | -0.16 | -0.30 |
| Half at 2×, trail the rest | -0.05 | -0.09 | -0.10 | -0.16 | -0.30 |

**By age group (30% trail, closed):** A0: -0.05 (1, 0% won); A4: -0.04 (1, 0% won).  
**By day of the buy:** 23 Nov: -0.10 (2).  
**Re-buys (30% trail):** 1 closed, -0.05 SOL, 0% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 2 (-0.10).

**Labels on losing rows (first buys and re-buys; a row can carry several):** bought extended (at the 1-h high or after +50% in 15 min) 3; stopped within 3 minutes 3; sale well below trigger 1; thin pool 1; repeat buy (churn) 1.

**Largest winners:** none.  
**Largest losers:** 5KzT4p -0.05 (peak held 1.08×, 24-h high 1.08×); Csu5jt -0.04 (peak held 1.02×, 24-h high 1.02×).

**Closest book:** VOL300K — 100% of buys are the same buy; 0 of this book's 0 profitable coins are not in it.

**Doing well:** best row 20% trail (-0.05 SOL incl. open); 0 winners averaging –%.  
**What causes the loss / kind of problem:** Data. 2 closed buys. The book cannot see coins whose pool is not paired with SOL or that are only sampled (the JACKET case): 54% of decoded pool events were discarded before pricing.  
**Strongest supporting evidence:** best row 20% trail at -0.05 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.05); negative in both halves; worst row 60% half-at-2× at -0.30 SOL; 0% winners needing about –% to break even at these average sizes.  
**Recommendation — REPAIR BEFORE JUDGING.** Repair coverage first (owner's decision pending on the coverage work), then collect.

### VOL500K — RETIRE FROM ACTIVE RESEARCH

**Rule.** any age after migration: $500K or more traded in the last 5 minutes (coin worth $40K–$2M). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$2000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 3 buy decisions on 3 coins; 3 filled, 3 closed and measured, 0 open. Net -0.49 SOL (staked 0.602 SOL; open rows cost 0, last valued 0). Average -81.4%, median -75.6%; 0 won / 0 flat / 3 lost; average winner –%, average loser -81.4%. Lost 40%+: 100%, 50%+: 100%, 60%+: 100%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 0/0/0/0 of 3 followed. Median hold 0 min; exits trail:3. Best coin 8EzKJg -0.14, worst p44sDi -0.20; 0 coins net positive, 3 negative. Without the best 1 / 3 / 5 coins: -0.35 / 0.00 / 0.00. First half -0.15, second half -0.34. Largest drawdown 0.49 SOL; most rows open at once 1 (0.201 SOL). Strict evidence: -0.49 SOL on 3 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.40 | -0.40 | -0.49 | -0.49 | -0.49 |
| Half at 2×, trail the rest | -0.40 | -0.40 | -0.49 | -0.49 | -0.49 |

**By age group (30% trail, closed):** A3: -0.20 (1, 0% won); A4: -0.29 (2, 0% won).  
**By day of the buy:** 22 Nov: -0.49 (3).  
**Re-buys (30% trail):** 0 closed, 0.00 SOL, –% won; 0 open.

**Price-path classes (closed first buys):** abrupt collapse 3 (-0.49).

**Labels on losing rows (first buys and re-buys; a row can carry several):** no follow-through (never +5%) 3; stopped within 3 minutes 3; sale well below trigger 2; bought extended (at the 1-h high or after +50% in 15 min) 2.

**Largest winners:** none.  
**Largest losers:** p44sDi -0.20 (peak held 0.97×, 24-h high 0.97×); uL7vqm -0.15 (peak held 0.97×, 24-h high 0.97×); 8EzKJg -0.14 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** VOL300K — 100% of buys are the same buy; 0 of this book's 0 profitable coins are not in it.

**Doing well:** 0 of 3 followed buys reached 2× within 24 h; best row 20% trail (-0.40 SOL incl. open); 0 winners averaging –%.  
**What causes the loss / kind of problem:** Strategy. All 3 closed buys lost more than 40%.  
**Strongest supporting evidence:** best row 20% trail at -0.40 SOL.  
**Strongest contrary evidence:** negative without its best coin (-0.35); negative in both halves; worst row 60% half-at-2× at -0.49 SOL; 0% winners needing about –% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. VOL500K-UP sees the same signals with a direction check.

### VOL500K-UP — REPAIR BEFORE JUDGING

**Rule.** any age after migration: $500K or more traded in the last 5 minutes and the price higher than 5 minutes ago ($40K–$2M). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$2000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**No buys.** Data. No buy at all in two days, and the one known qualifying coin (JACKET) was invisible to the book.

**Recommendation.** Repair coverage first, then collect.

### RUG450 — RETIRE FROM ACTIVE RESEARCH

**Rule.** any age after migration: peaked at $450K or more, bought the moment it is 80% below that peak. any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 25 buy decisions on 24 coins; 25 filled, 23 closed and measured, 2 open. Net -1.80 SOL (staked 5.013 SOL; open rows cost 0.401, last valued 0.329). Average -39%, median -41.8%; 3 won / 0 flat / 20 lost; average winner 21.1%, average loser -48%. Lost 40%+: 56.5%, 50%+: 34.8%, 60%+: 34.8%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 3/1/0/0 of 11 followed. Median hold 0 min; exits trail:23. Best coin Fn95Nt +0.09, worst 82mseL -0.36; 3 coins net positive, 19 negative. Without the best 1 / 3 / 5 coins: -1.89 / -1.93 / -1.91. First half -0.63, second half -1.17. Largest drawdown 1.798 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -1.56 SOL on 20 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -1.67 (1 open) | -1.83 (1 open) | -1.87 (2 open) | -1.83 (3 open) | -2.87 (3 open) |
| Half at 2×, trail the rest | -1.67 (1 open) | -1.78 (1 open) | -1.82 (2 open) | -1.74 (3 open) | -2.54 (3 open) |

**By age group (30% trail, closed):** A0: -0.90 (10, 10% won); A1: -0.18 (1, 0% won); A2: -0.52 (7, 14.3% won); A4: -0.19 (5, 20% won).  
**By day of the buy:** 21 Nov: -0.10 (4); 22 Nov: -0.91 (10); 23 Nov: -0.79 (9).  
**Re-buys (30% trail):** 0 closed, 0.00 SOL, –% won; 0 open.

**Price-path classes (closed first buys):** abrupt collapse 13 (-1.69); giveback 3 (-0.04); ordinary decline 3 (-0.14); runner missed: sold before the run 2 (-0.03); ordinary gain 1 (+0.01); runner missed: held through 2x and gave it back 1 (+0.09).

**Labels on losing rows (first buys and re-buys; a row can carry several):** stopped within 3 minutes 17; no follow-through (never +5%) 13; sale well below trigger 11; bought extended (at the 1-h high or after +50% in 15 min) 10; thin pool 5.

**Largest winners:** Fn95Nt +0.09 (peak held 2.11×, 24-h high 2.11×); FJKt1L +0.02 (peak held 1.75×, 24-h high 2.45×); 692gVU +0.01 (peak held 1.50×, 24-h high 1.50×).  
**Largest losers:** 82mseL -0.36 (peak held 0.98×, 24-h high 0.98×); GY23Cd -0.19 (peak held 0.97×, 24-h high 0.97×); TyHtBs -0.16 (peak held 0.98×, 24-h high 0.98×); sbiWbR -0.15 (peak held 0.97×, 24-h high 0.97×).

**Closest book:** RUG950 — 60% of buys are the same buy; 1 of this book's 3 profitable coins are not in it.

**Best filters found (exploratory, in-sample, chosen from 56 tests on this book):** `repeat_buyers15 >= 74` keeps 12 of 23 buys and 100% of winners; 25% of passing buys won (book 13%); net -0.52 against -1.80; halves -0.21 / -0.31; without best coin -0.61; runners kept 2, rejected 1. `buyers15 >= 412` keeps 12 of 23 buys and 100% of winners; 25% of passing buys won (book 13%); net -0.52 against -1.80; halves -0.21 / -0.31; without best coin -0.61; runners kept 2, rejected 1.

**Doing well:** 3 of 11 followed buys reached 2× within 24 h; best row 20% trail (-1.67 SOL incl. open); 3 winners averaging 21.1%.  
**What causes the loss / kind of problem:** Strategy. Buying the fall itself: 13 of 23 closed buys lost more than 40% on a 30% stop, i.e. the price kept falling faster than the stop could sell.  
**Strongest supporting evidence:** best row 20% trail at -1.67 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.89); negative in both halves; worst row 60% trail at -2.87 SOL; 13% winners needing about 69% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire. The bounce version waits for a 30% recovery and avoids most of these.

### RUG450-BOUNCE — CONTINUE COLLECTING

**Rule.** any age after migration: peaked at $450K or more, fell 80%, bought when it bounces 30% off its low (within 24 hours). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 9 buy decisions on 9 coins; 9 filled, 9 closed and measured, 0 open. Net -0.21 SOL (staked 1.804 SOL; open rows cost 0, last valued 0). Average -11.8%, median -25.4%; 2 won / 0 flat / 7 lost; average winner 68.9%, average loser -34.8%. Lost 40%+: 11.1%, 50%+: 11.1%, 60%+: 11.1%. Realised 2×/3×/5×/10×: 1/0/0/0; reachable within 24 h: 1/1/0/0 of 8 followed. Median hold 1 min; exits trail:9. Best coin 2TngN4 +0.25, worst 82mseL -0.18; 2 coins net positive, 7 negative. Without the best 1 / 3 / 5 coins: -0.47 / -0.45 / -0.36. First half +0.08, second half -0.30. Largest drawdown 0.465 SOL; most rows open at once 2 (0.401 SOL). Strict evidence: -0.06 SOL on 6 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.14 | -0.18 | -0.21 | -0.30 | -0.99 |
| Half at 2×, trail the rest | -0.21 | -0.20 | -0.24 | -0.35 | -0.96 |

**By age group (30% trail, closed):** A0: -0.21 (4, 0% won); A1: -0.18 (1, 0% won); A2: +0.15 (3, 33.3% won); A4: +0.02 (1, 100% won).  
**By day of the buy:** 21 Nov: +0.08 (4); 22 Nov: -0.24 (4); 23 Nov: -0.06 (1).  
**Re-buys (30% trail):** 1 closed, -0.20 SOL, 0% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 6 (-0.31); abrupt collapse 1 (-0.18); ordinary gain 1 (+0.02); runner captured 1 (+0.25).

**Labels on losing rows (first buys and re-buys; a row can carry several):** stopped within 3 minutes 7; feed/quote quality flag 3; no follow-through (never +5%) 3; sale well below trigger 2; bought extended (at the 1-h high or after +50% in 15 min) 2.

**Largest winners:** 2TngN4 +0.25 (peak held 3.38×, 24-h high 4.53×); Fn95Nt +0.02 (peak held 1.63×, 24-h high 1.63×).  
**Largest losers:** 82mseL -0.18 (peak held 0.98×, 24-h high 0.98×); EMjVCb -0.07 (peak held 0.97×, 24-h high 0.97×); 3BcJ4S -0.06 (peak held 1.05×, 24-h high 1.05×); 27u3di -0.05 (peak held 1.17×, 24-h high 1.22×).

**Closest book:** RUG950-BOUNCE — 22% of buys are the same buy; 1 of this book's 2 profitable coins are not in it.

**Doing well:** 1 of 8 followed buys reached 2× within 24 h; best row 20% trail (-0.14 SOL incl. open); 2 winners averaging 68.9%.  
**What causes the loss / kind of problem:** Uncertain. 9 closed buys, one large winner, negative without it.  
**Strongest supporting evidence:** best row 20% trail at -0.14 SOL; one half positive (+0.08 / -0.30).  
**Strongest contrary evidence:** negative without its best coin (-0.47); second half -0.30; worst row 60% trail at -0.99 SOL; 22.2% winners needing about 34% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged; judge at 40+ closed buys.

### RUG950 — RETIRE FROM ACTIVE RESEARCH

**Rule.** any age after migration: peaked at $950K or more, bought the moment it is 80% below that peak. any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 15 buy decisions on 15 coins; 15 filled, 13 closed and measured, 2 open. Net -1.04 SOL (staked 3.008 SOL; open rows cost 0.401, last valued 0.329). Average -40%, median -42.8%; 2 won / 0 flat / 11 lost; average winner 28.9%, average loser -52.5%. Lost 40%+: 69.2%, 50%+: 38.5%, 60%+: 38.5%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 2/0/0/0 of 2 followed. Median hold 0 min; exits trail:13. Best coin Fn95Nt +0.09, worst TyHtBs -0.17; 2 coins net positive, 11 negative. Without the best 1 / 3 / 5 coins: -1.13 / -1.11 / -0.96. First half -0.34, second half -0.70. Largest drawdown 1.157 SOL; most rows open at once 3 (0.602 SOL). Strict evidence: -0.81 SOL on 11 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -1.07 (1 open) | -1.09 (1 open) | -1.11 (2 open) | -1.26 (3 open) | -1.57 (3 open) |
| Half at 2×, trail the rest | -1.07 (1 open) | -1.05 (1 open) | -1.06 (2 open) | -1.19 (3 open) | -1.33 (3 open) |

**By age group (30% trail, closed):** A0: -0.39 (3, 0% won); A1: 0.00 (0, –% won); A2: -0.46 (5, 20% won); A4: -0.19 (5, 20% won).  
**By day of the buy:** 22 Nov: -0.26 (5); 23 Nov: -0.78 (8).  
**Re-buys (30% trail):** 0 closed, 0.00 SOL, –% won; 0 open.

**Price-path classes (closed first buys):** abrupt collapse 9 (-1.04); ordinary decline 2 (-0.12); runner missed: held through 2x and gave it back 1 (+0.09); runner missed: sold before the run 1 (+0.03).

**Labels on losing rows (first buys and re-buys; a row can carry several):** no follow-through (never +5%) 10; stopped within 3 minutes 9; bought extended (at the 1-h high or after +50% in 15 min) 6; sale well below trigger 6; feed/quote quality flag 1.

**Largest winners:** Fn95Nt +0.09 (peak held 2.11×, 24-h high 2.11×); FJKt1L +0.02 (peak held 1.75×, 24-h high 2.45×).  
**Largest losers:** TyHtBs -0.16 (peak held 0.98×, 24-h high 0.98×); sbiWbR -0.15 (peak held 0.97×, 24-h high 0.97×); gW4kYa -0.15 (peak held 0.97×, 24-h high 0.97×); 61yuZf -0.12 (peak held 0.96×, 24-h high 0.96×).

**Closest book:** RUG450 — 100% of buys are the same buy; 0 of this book's 2 profitable coins are not in it.

**Doing well:** 2 of 2 followed buys reached 2× within 24 h; best row 25% half-at-2× (-1.05 SOL incl. open); 2 winners averaging 28.9%.  
**What causes the loss / kind of problem:** Strategy. A subset of RUG450's signals with the same result: 9 of 13 closed buys lost more than 40%.  
**Strongest supporting evidence:** best row 25% half-at-2× at -1.05 SOL.  
**Strongest contrary evidence:** negative without its best coin (-1.13); negative in both halves; worst row 60% trail at -1.57 SOL; 15.4% winners needing about 64% to break even at these average sizes.  
**Recommendation — RETIRE FROM ACTIVE RESEARCH.** Retire.

### RUG950-BOUNCE — CONTINUE COLLECTING

**Rule.** any age after migration: peaked at $950K or more, fell 80%, bought when it bounces 30% off its low (within 24 hours). any-age rule book (also the first 8 hours, A0). Ages A0 A1 A2 A3 A4; market cap $40000–$1000000; live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated). Counting since 21 Nov 21:23 UTC (older-8).

**First buys, 30% trail.** 2 buy decisions on 2 coins; 2 filled, 2 closed and measured, 0 open. Net -0.02 SOL (staked 0.401 SOL; open rows cost 0, last valued 0). Average -3.9%, median -3.9%; 1 won / 0 flat / 1 lost; average winner 12%, average loser -19.9%. Lost 40%+: 0%, 50%+: 0%, 60%+: 0%. Realised 2×/3×/5×/10×: 0/0/0/0; reachable within 24 h: 0/0/0/0 of 2 followed. Median hold 40 min; exits trail:2. Best coin Fn95Nt +0.02, worst FJKt1L -0.04; 1 coins net positive, 1 negative. Without the best 1 / 3 / 5 coins: -0.04 / 0.00 / 0.00. First half -0.04, second half +0.02. Largest drawdown 0.04 SOL; most rows open at once 2 (0.401 SOL). Strict evidence: +0.02 SOL on 1 closed.

| Net SOL incl. open | 20% | 25% | 30% | 40% | 60% |
|---|---|---|---|---|---|
| Trailing stop | -0.05 | 0.00 | -0.02 | -0.06 | -0.15 |
| Half at 2×, trail the rest | -0.05 | 0.00 | -0.02 | -0.06 | -0.15 |

**By age group (30% trail, closed):** A2: -0.04 (1, 0% won); A4: +0.02 (1, 100% won).  
**By day of the buy:** 22 Nov: -0.02 (2).  
**Re-buys (30% trail):** 0 closed, 0.00 SOL, –% won; 0 open.

**Price-path classes (closed first buys):** ordinary decline 1 (-0.04); ordinary gain 1 (+0.02).

**Labels on losing rows (first buys and re-buys; a row can carry several):** feed/quote quality flag 1; stopped within 3 minutes 1.

**Largest winners:** Fn95Nt +0.02 (peak held 1.63×, 24-h high 1.63×).  
**Largest losers:** FJKt1L -0.04 (peak held 1.25×, 24-h high 1.75×).

**Closest book:** RUG450-BOUNCE — 100% of buys are the same buy; 0 of this book's 1 profitable coins are not in it.

**Doing well:** 0 of 2 followed buys reached 2× within 24 h; best row 25% trail (0.00 SOL incl. open); 1 winners averaging 12%.  
**What causes the loss / kind of problem:** Uncertain. 2 closed buys.  
**Strongest supporting evidence:** best row 25% trail at 0.00 SOL; one half positive (-0.04 / +0.02).  
**Strongest contrary evidence:** negative without its best coin (-0.04); second half +0.02; worst row 60% half-at-2× at -0.15 SOL; 50% winners needing about 62% to break even at these average sizes.  
**Recommendation — CONTINUE COLLECTING.** Keep running unchanged; it rides on RUG450-BOUNCE's machinery.

### FEE-COINS — REPAIR BEFORE JUDGING

**Rule.** every buy of a coin that charges a transfer fee (5% at most), whichever rule bought it, from the coin's first hours on (the other books start at 8 hours); kept out of the other books. The fee is inside the prices it is filled at (measured 22 Nov; not yet confirmed by the reviewer). FEE-COINS (reporting book: every buy of a transfer-fee coin, whichever rule bought it). Ages A0 A1 A2 A3 A4; market cap $40000–$1000000; sampled/routed only (Jupiter prices and quotes); fee coins on live PumpSwap are not entered. Counting since 22 Nov 01:16 UTC (fee-book (22 Nov, commit e4a5a3b)).

**No buys.** Data. No buy has ever been made. Fee coins are only entered on the sampled method, and that method produced 29 buy decisions in three days of which 17 were cancelled because no price arrived within 5 seconds.

**Recommendation.** Repair the sampled pricing path first; there is nothing to judge.

## 7. Closing sections

### A. Research priorities

1. **Measure cleanly before optimising.** A run on frozen code with the lag fix, no restarts inside decision windows, and re-buys reported apart. Most of what looks like a book effect here is a day effect.
2. **Entries, not exits, are the main loss.** 49% of losing first buys never rose 5% above cost. No recorded feature separates them from winners yet; the features that might (deployer and holder history, social activity, who is buying) are not recorded.
3. **Time exits.** The only exit change with measured support on identical buys is the 4-hour clock on HH-BREAK.
4. **Coverage.** About half of the in-band doublings visible in the database were not bought by any book, and pools not paired with SOL are not seen at all.

### B. Exact forward experiments (paper only; each needs the owner's go)

| # | Experiment | Exact definition | Compared with | Decision rule fixed in advance |
|---|---|---|---|---|
| B1 | 4-hour clock beside CONT and HH30-5M | A clock book on the parent's buys: sell at 4 h after the fill if the row is still open (existing CLOCK mechanism, minPeak = none). | The parent's plain rows on the same buys | Keep if, after 150 shared buys, the clock rows beat the parent on the 25% and 30% trail in both halves by time. Otherwise retire the clock row (and HH30-5M). |
| B2 | HH-BREAK, shallow four-hour range (exploratory) | HH-BREAK's rule plus the recorded field `drawdown4h ≥ −0.18`, which is **four-hour low ÷ four-hour high − 1**: the low of the last 4 hours is at least 82% of their high. It is a range/compression measure — not the distance of the current price from the high, and not a chronological drawdown (corrected 24 Nov; an earlier version of this report described it wrongly). On this data: 77 of 162 closed first buys on 76 coins, +0.77 SOL against +0.37, both halves positive, +0.60 without its best coin; the field is missing on 8 buys. | HH-BREAK on the same period | Needs 100 new buys. Supported only if average after-cost result > 0, above HH-BREAK's, and positive without its best coin. This data cannot validate it — it was used to choose it. |
| B3 | Stops | Report 20% and 25% as the reference rows; stop opening 60% rows. | Existing rows | Already measured; no new data needed. |
| B4 | Buying again | Switch off, or keep but never mix with first buys. | First buys | Already measured negative on 1,079 re-buys; re-test only inside a clean run. |
| B5 | Retire the redundant books | The 15 books in section 1. | Their covering book | Retire only if the owner agrees; definitions and history stay. |

### C. Data gaps and open accounting questions

- **C1.** Transfer-fee setting never read for Token-2022 coins bought on the live method (225 buys). Needs one read-only chain look-up per bought coin.
- **C2.** The commit of a program start is recorded from 20 Nov 17:30 UTC on (24 starts); for the one earlier period (38 buys) it is not, and only an inferred commit is given. (Corrected 24 Nov: an earlier version of this package inferred all periods and disagreed with the records on 80 buys.)
- **C3.** Sales fill 0.7 s after the trigger at, on average, a better value than the trigger. Whether a real sale would get that is unverified.
- **C4.** The feed ran up to 112 s late on 23 Nov from about 14:00 UTC; results from then until the fix are flagged.
- **C5.** Not recorded: coin names for live coins, social links, holder counts, deployer history, supply in the coin table. The lowest executable value while held is not stored either; `spot_lo_held_x` is the lowest one-minute spot price relative to the signal price over the whole minutes strictly inside the holding (the minutes containing the fill and the sale are left out), which is not an executable value; one-minute bars never show the order of prices inside a minute.
- **C6.** Minute bars exist only for coins the live feed priced; the sampled side has samples, not trades. Bars of all 41647 coins are in the package only as hourly high/low/volume; full minute bars are included for the bought coins.
- **C7.** HH-BREAK-4H before 21 Nov 16:40 UTC exists only as estimates (excluded).
- **C8.** FEE-COINS, VOL500K-UP and the sampled method have no usable observations.

### D. Data and reproduction

- Package (CSV, this folder): `data/` — see `README.md` for the data dictionary and commands.
- Raw database copy (gzipped NDJSON with SHA-256 per file): branch `older-review-data`.
- Every coin, every row: `data/coin_ledger.csv.gz` (machine-readable) and `APPENDIX-coins.md` (searchable).
