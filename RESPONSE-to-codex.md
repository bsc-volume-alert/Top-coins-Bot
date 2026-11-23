# Claude's response to Codex's independent analysis (23 Nov 2026)

Analysis only. Nothing was changed, deployed, stopped or deleted for this response.

**Two data sets are used and kept apart.**
- *Snapshot* — what Codex analysed: `reports/older/2026-11-23/entries-snapshot.json` at commit 48233c2, cut-off 19:26 UTC. Every Codex figure was re-computed on this file.
- *Full export* — published after Codex's analysis: branch `older-review-package` (cut-off 20:19:05 UTC, code 834ca71, raw database copy on branch `older-review-data`). It contains what section 9 of Codex's note lists as missing. Where the full export changes or sharpens a point, the figure is marked “full export”.

Scripts for every figure below: `reports/older/2026-11-23/review/tools/codex-check/` (`c1.mjs` snapshot, `c2.mjs` full export, `c3.mjs` table).

## Summary
1. **Codex's arithmetic is confirmed.** Every count and total in its sections 1–7 reproduces on the snapshot to the third decimal.
2. **Three of my own statements were too strong and are withdrawn**: “sell half at 2× from the 30% stop upward” as a general rule (it is worse on CONT and FAST150-5M at 30%); “buying again is churn” (in the same hours first buys lost more per trade than re-buys); and “retire” for the two parents Codex wants to test a subset of (they must keep running for the test to exist).
3. **I disagree on the strength of Codex's filtered candidates.** The $200K breakout slice is one sample of 44 coins, negative without its best coin, positive only at the 30–40% stops, not monotonic in the threshold, and absent in HH-BREAK, the parent rule. It deserves a pre-registered tag, not a new book.
4. **The reconciled plan needs no new rule code.** Every experiment either already exists as a row (stops, half-at-2×, the 4-hour clock on HH-BREAK) or is a tag evaluated on next week's buys of unchanged parents.

## A. Point by point

| # | Codex's point | Verdict | Reproduction and comment |
|---|---|---|---|
| 1 | 2,258 filled entries, 266 coins; 3,677 memberships (2,081 first, 1,596 re-buy); 12 entries are first for one book and re-buy for another; 17 cancelled | **Confirmed** | Identical on the snapshot. “First” = first per book and age group — agreed, and stated so in the full report. |
| 1 | Halves: fixed date (22 Nov 05:10:39 UTC) against my split of each book's closed trades by count | **Confirmed, definitional** | E.g. HH-BREAK: mine +1.66 / −1.29, Codex +1.735 / −1.365 — same trades, different cut. The table in B uses Codex's fixed date. |
| 1 | “Mature” by decision time is a proxy | **Confirmed; now exact** | Full export has fill times. Mature = fill at least 24 h before the cut-off; every such row is closed (0 of 140 open for HH-BREAK). |
| 2 | 1,164 closed first entries / 260 coins, −15.239 SOL; −17.306 without best coin; H1 640/188 −2.150; H2 524/159 −13.089; 50 assigned without a closed result | **Confirmed** | Identical when “first entry” = at least one first-buy family (1,214 assigned). With “no re-buy family at all” it is 1,156 closed, −14.911. Full export: 1,162 closed, −15.12. |
| 2 | 319 wins +23.243; 16 losses of 60%+ −2.599; 829 other losses −35.882; deleting every 60%+ loss still leaves −12.639 | **Confirmed** | Agreed in substance: a rug filter cannot repair this. Full export, same conclusion by price path: 520 “ordinary declines” −26.08 SOL against 40 abrupt collapses −4.70. |
| 2 | Which books generate the ordinary losses? | **Answered** | Per book (first buys, 30% pure, losses smaller than 60%; shared buys counted in each book): HH15-5M −5.92 (157 losing buys), HH30-10M −5.72, HH30-5M −5.71, CONT −5.19, CONT-STALL −4.56, FAST150-5M −4.47, FAST150-3M −4.02, FAST150-10M −3.79, HH-BREAK −3.62, FAST150-1M −3.38. Losses of 60%+ are almost absent in these books (0 or 1 each); they sit in the RUG and VOL books. |
| 3 | HH-BREAK 162/152, +0.370, −0.002 without best coin, H1 +1.735, H2 −1.365; mature 138/133 +1.007 (+0.635), H2 −0.729; mature half-at-2× +1.322 (+1.023) | **Confirmed** | Full export with real fill times: mature 140/135, +1.011 (+0.639), H2 55/53 −0.724; half-at-2× +1.326 (+1.027). |
| 3 | “Verify the maturity effect and the later deterioration” | **Confirmed, with a caution** | The mature cohort is better because it leaves out the last 24 hours, and those buys really lost: 32 bought, 22 closed −0.641 SOL, 10 open at −0.03 against cost. So this is not a censoring artefact that will reverse; it is a third consecutive weaker period: +1.735 (85 buys) → −0.724 (55) → −0.641 (22 closed). “Mature” flatters HH-BREAK by dropping its worst day. |
| 4A | HH15-5M with market cap ≥ $200K: 47/42 +0.386 (+0.132); mature 40/37 +0.328; H2 on new coins 9/7 +0.0045 | **Arithmetic confirmed; strength disputed** | See the five tests below the table. |
| 4B | HH30-5M ≥ $200K: 42/39 +0.186 (−0.058); mature 39/36 +0.338 | **Arithmetic confirmed; strength disputed** | Same. |
| 4C | FAST150-10M with ≥ 45 five-minute buyers: 23/21 +0.400 (+0.023); mature 16/15 +0.206 (−0.171) | **Confirmed, and agreed it is weak** | Field used: `b5`. Full export (24/22): +0.347, −0.030 without best coin. Threshold: ≥25 −0.01; ≥35 +0.07; ≥45 +0.35; ≥60 +0.44 (14 buys); ≥80 +0.06. |
| 4 | Forward-test design: filter applied at the parent's first eligible opportunity, no re-arm, parent kept as comparison | **Agreed** | Simplest exact implementation: leave the parents unchanged and evaluate the filter as a **tag on the parent's first buys**. That is by construction “first opportunity, no re-arm, parent as comparison”, and needs no rule code. |
| 4 | 912 tests; selected slices are not confirmation | **Agreed** | My own grid was 2,778 tests (`candidate_tests.csv`); 10 passed a stability screen, 7 of them inside HH-BREAK. |
| 5 | Half-at-2× minus pure at 30%: HH-BREAK +0.355; CONT −0.295; FAST150-5M −0.316 | **Confirmed. My earlier wording is withdrawn** | Full export, same closed first buys, books with 10+ pairs: half-at-2× is equal or better in 19 of 23 books at 30% (worse: FAST150-5M −0.32, CONT −0.29, CONT-STALL −0.09, FAST150-10M −0.06), in 23 of 23 at 40%, in 17 of 21 at 60% (worse: SECOND-WAVE, FAST-10M, FAST-3M, FAST-5M). Book-specific at 30%, as Codex says. |
| 5 | 60% against 30% on identical entries: −24.807 against −12.683 on 802 / 219 | **Confirmed** | 798 / 218 with the stricter first-entry definition: −24.415 against −12.505. |
| 5 | “Do not claim 60% is worse in every family; compare mature matched cohorts” | **Confirmed — it is not worse everywhere** | Full export, mature matched first buys: 60% is worse than 30% in 15 of 18 books, better in FAST-3M (+0.30 on 16), FAST-10M (+0.27 on 20) and FAST-5M (+0.02 on 19) — the 2× momentum books, where a third of buys later reach 2×. |
| 5 | (my addition) 25% against 30% pure on the same buys | **New figure** | CONT +0.549 (H1 −0.077, H2 +0.626); FAST-3M +0.320 (+0.108 / +0.212); FAST150-5M +0.177 (−0.207 / +0.384); HH-BREAK −0.457 (−0.584 / +0.127). The tighter stop helps in the falling half and costs in the better half, except on FAST-3M. It is a regime effect more than an improvement. |
| 6 | Re-buys: 513 closed / 122 coins, −8.706 (−10.527 without best coin); 431 standard, 81 four-hour, 1 stall; none followed for 24 h | **Confirmed. My “churn” conclusion is withdrawn** | Oldest re-buy 22 Nov 21:12:25 UTC; none is 24 h old even at 20:19. Full export, same hours (since 21:12 on 22 Nov), each buy once: **first-buy entries** 275 bought, 238 closed, −13.6% a trade, 19% won, 37 open (cost 7.42, last value 6.96), **−12.6% including open**; **re-buy entries** 731 bought, 527 closed (445 standard, 82 clock), −9.3% a trade, 16% won, 204 open (cost 40.90, last value 40.73), **−6.8% including open**. Re-buys lost 9.81 SOL booked, but per trade they were less bad than first buys made in the same hours. What they did do is triple the number of trades in a losing period. Inferiority is not shown; neither is any benefit. |
| 6 | No cooldown from decision timestamps alone | **Agreed** | Sale times are now in `sales.csv`. No cooldown is proposed. |
| 7 | Coin examples | **Confirmed** | CONT `HuN5y4fJ…` 3 buys +0.672; LOW4H same mint, first buy +0.378 (its re-buy −0.068); HH-BREAK `MAXXib7S…` first buy +0.372 (re-buy −0.050); SLOW-BUILD `8xegBRcv…` −0.062; RUG450 `82mseLFa…` 2 buys −0.365; RUG450-BOUNCE same mint −0.182. |
| 7 | `max` can include prices after the exit | **Confirmed, and now separable** | Full export has `peak_x_held` (highest executable value while the row was held) apart from `runner_max_x_24h`. For SLOW-BUILD `8xegBRcv…` this is measured, not inferred: the 20–40% rows were stopped after 30–41 minutes having never been above 0.97× cost; the **60% row held and sold at +84%** (peak held 4.28×, 987 minutes). So here a wider stop did capture the run — one coin. |
| 8 | FAST-1M / FAST-3M: 28 shared coins but only 16 identical entries of 31 / 39 | **Confirmed; retirement still stands on outcomes** | See the last column of table B: the buys a retired book does NOT share with its reference book are themselves negative in every case (FAST-1M: 15 own buys −0.51 SOL; FAST150-3M: 39, −0.44; HH30-10M: 110, −1.98). |
| 9 | Missing from the compact export: fill/trigger/sale times, exit reasons, estimated flags, token quantities, partial-sale cash flows, quotes/reserves, price paths, horizon status, flags | **Supplied** | Branch `older-review-package`; details in D. HH-BREAK-4H's estimated exits are flagged row by row (`estimated_exit`; 584 rows, +1.107 SOL, excluded from every figure). |

### The $200K breakout slice (4A/4B): five tests on the full export
1. **Threshold.** HH15-5M: ≥$100K −0.34; ≥$150K +0.36; **≥$200K +0.39**; ≥$250K +0.06; ≥$300K +0.07; ≥$400K +0.11. HH30-5M: ≥$100K −0.70; ≥$150K −0.03; **≥$200K +0.19**; ≥$250K +0.31; ≥$300K −0.08; ≥$400K −0.03. Not monotonic; the sign depends on where the line is drawn.
2. **Without the best coin.** HH15-5M: positive only at $150K and $200K. HH30-5M: positive only at $250K (+0.07).
3. **Stop.** At $200K, 20% pure: HH15-5M −0.18, HH30-5M −0.16. 25% pure: +0.01, −0.27. 40% pure: +0.23, +0.20. The slice is positive only at 30–40%.
4. **Same coins.** The two slices share 5 identical buys but 37 coins. Each buy counted once: 84 buys on **44 coins**, +0.407 SOL, **−0.091 without the best coin**. It is one sample, as Codex says — and a small one.
5. **Parent rule.** HH-BREAK is the same rule on a longer clock. HH-BREAK with market cap ≥ $200K: 34 buys, −0.12 SOL (H1 +0.21, H2 −0.33) — worse than HH-BREAK as a whole (+0.37). Across all books, distinct first buys above $150K average −4% to −7%.

Conclusion: an exploratory tag worth carrying into the next run because it costs nothing, with success criteria fixed now. Not evidence.

Also checked: FAST150-5M aged 16–36 h (Codex's prospective tag): 27 buys / 24 coins, +0.383, +0.034 without best coin, H1 +0.137, H2 +0.246; all other ages −1.643.

## B. Book-by-book table (full export, 30% pure trail)

Cells are `closed buys / coins  net SOL (net without best coin)`. Mature = filled at least 24 h before the cut-off. Halves by Codex's fixed date. “Incremental buys” = the book's closed first buys that are not the same buy as its reference book's, and those on coins the reference book never bought. Shared buys appear in every book they belong to: columns are not additive across books.

| Book | First buys closed: n/coins net (without best coin) | Mature first buys | Halves H1 / H2 | First buys open | Re-buys closed | Re-buys open | Codex | Claude 20:45 | Reconciled | Exact proposal | Incremental buys |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AGE-DOUBLE | 30/25 -1.00 (-1.15) | 15/13 -0.41 (-0.56) | -0.16 / -0.83 | 2 | 17/9 -0.67 (-0.66) | 4 | retire | retire | OUT of primary scoring | none | vs HH-BREAK: 30 of 30 buys are not the same buy, -1.00; 10 on coins it never bought, -0.40 |
| LOW4H | 34/29 -0.21 (-0.59) | 24/22 -0.42 (-0.52) | -0.07 / -0.14 | 2 | 9/7 -0.15 (-0.33) | 0 | keep | continue | REFERENCE, unchanged | none | – |
| CONT | 154/116 -1.41 (-2.08) | 104/87 -0.88 (-1.37) | +0.15 / -1.56 | 7 | 41/27 -0.93 (-1.04) | 10 | restructure: 25% vs 30%, no blanket scale-out | test 4-h clock | REFERENCE, unchanged | paired read 25% vs 30% pure (rows exist). 4-h clock row = optional NEW experiment, needs code | – |
| SLOW-BUILD | 19/17 -0.13 (-0.26) | 16/15 -0.14 (-0.23) | +0.13 / -0.26 | 1 | 2/1 -0.11 (0.00) | 0 | keep | continue | REFERENCE (tagged subset of LOW4H) | none | vs LOW4H: 0 of 19 buys are not the same buy, 0.00; 0 on coins it never bought, 0.00 |
| HH-BREAK | 162/152 +0.37 (0.00) | 140/135 +1.01 (+0.64) | +1.74 / -1.37 | 10 | 55/44 -1.07 (-1.72) | 49 | keep | keep | REFERENCE, unchanged | paired read half-at-2× vs pure at 30% and 40% (rows exist); tag T4 | – |
| CONT-STALL | 159/121 -2.27 (-2.75) | 104/87 -1.31 (-1.80) | -0.53 / -1.74 | 2 | 48/29 -0.34 (-0.90) | 5 | retire | retire | OUT of primary scoring | none | – |
| LOW4H-LIQ25K | 14/13 -0.44 (-0.50) | 10/10 -0.22 (-0.28) | -0.08 / -0.36 | 2 | 2/2 +0.13 (-0.05) | 0 | retire | retire | OUT of primary scoring | none | vs LOW4H: 0 of 14 buys are not the same buy, 0.00; 0 on coins it never bought, 0.00 |
| FAST-1M | 31/31 -0.91 (-1.01) | 24/24 -0.56 (-0.66) | -0.40 / -0.51 | 0 | 3/3 +0.07 (-0.07) | 0 | retire | retire | OUT of primary scoring | none | vs FAST-3M: 15 of 31 buys are not the same buy, -0.51; 3 on coins it never bought, -0.07 |
| FAST-3M | 39/39 -0.63 (-0.82) | 30/30 -0.46 (-0.66) | -0.18 / -0.45 | 0 | 7/3 -0.08 (-0.09) | 0 | restructure: 25% alternatives | continue | REFERENCE, unchanged | paired read 25% vs 30% pure (rows exist) | – |
| FAST-5M | 43/42 -0.86 (-1.06) | 33/33 -0.45 (-0.65) | -0.02 / -0.84 | 0 | 9/4 -0.14 (-0.20) | 0 | retire | continue | OUT of primary scoring (Codex's view accepted) | none | vs FAST-3M: 23 of 43 buys are not the same buy, -0.41; 10 on coins it never bought, -0.38 |
| FAST-10M | 36/34 -0.98 (-1.27) | 21/21 -0.38 (-0.67) | -0.42 / -0.56 | 0 | 9/6 -0.25 (-0.22) | 0 | retire | retire | OUT of primary scoring | none | vs FAST-3M: 27 of 36 buys are not the same buy, -0.74; 16 on coins it never bought, -0.88 |
| FAST-30M | 40/35 -1.07 (-1.24) | 28/26 -0.96 (-1.12) | -0.78 / -0.30 | 0 | 16/9 -0.39 (-0.46) | 0 | retire | retire | OUT of primary scoring | none | vs FAST-3M: 36 of 40 buys are not the same buy, -0.95; 21 on coins it never bought, -0.90 |
| FAST150-1M | 93/82 -1.43 (-1.78) | 72/65 -0.99 (-1.33) | -0.25 / -1.18 | 0 | 26/14 -0.32 (-0.63) | 2 | retire | retire | OUT of primary scoring | none | vs FAST150-5M: 50 of 93 buys are not the same buy, -0.95; 8 on coins it never bought, -0.35 |
| FAST150-3M | 107/93 -1.33 (-1.68) | 81/73 -0.86 (-1.21) | -0.12 / -1.22 | 0 | 35/16 -0.70 (-1.32) | 2 | retire | retire | OUT of primary scoring | none | vs FAST150-5M: 39 of 107 buys are not the same buy, -0.44; 6 on coins it never bought, -0.35 |
| FAST150-5M | 117/99 -1.26 (-1.63) | 92/80 -0.78 (-1.16) | +0.11 / -1.37 | 0 | 42/18 -0.93 (-1.48) | 3 | benchmark; tag 16–36 h | continue | REFERENCE, unchanged | tag T3 (age 16–36 h), not promoted | – |
| FAST150-10M | 101/83 -1.87 (-2.25) | 65/57 -1.23 (-1.61) | -0.19 / -1.68 | 1 | 42/19 -0.63 (-1.17) | 3 | buyer-breadth subset | retire | PARENT ONLY for tag T2; not scored itself | tag T2 (≥45 five-minute buyers) | vs FAST150-5M: 60 of 101 buys are not the same buy, -0.58; 13 on coins it never bought, -0.47 |
| SECOND-WAVE | 16/16 -0.48 (-0.59) | 14/14 -0.43 (-0.54) | -0.45 / -0.03 | 0 | 3/2 +0.07 (-0.06) | 0 | retire | continue | OUT of primary scoring (Codex's view accepted) | none | vs FAST-3M: 16 of 16 buys are not the same buy, -0.48; 3 on coins it never bought, -0.05 |
| HH30-5M | 192/161 -3.18 (-3.42) | 157/143 -2.13 (-2.38) | -0.70 / -2.48 | 9 | 95/58 -2.02 (-2.45) | 51 | $200K comparator | test 4-h clock | PARENT ONLY for tag T1; not scored itself | tag T1 (market cap ≥ $200K), one hypothesis with HH15-5M | – |
| HH30-10M | 191/164 -3.50 (-3.74) | 156/144 -2.51 (-2.75) | -1.25 / -2.25 | 11 | 86/58 -2.16 (-2.59) | 58 | retire | retire | OUT of primary scoring | none | vs HH30-5M: 110 of 191 buys are not the same buy, -1.98; 8 on coins it never bought, -0.31 |
| HH15-5M | 218/178 -2.50 (-2.75) | 175/157 -1.96 (-2.21) | -1.00 / -1.49 | 7 | 132/70 -3.56 (-3.77) | 84 | test $200K subset | retire | PARENT ONLY for tag T1; not scored itself | tag T1 | vs HH30-5M: 172 of 218 buys are not the same buy, -1.80; 15 on coins it never bought, -0.20 |
| HH-BREAK-4H | 98/90 -0.11 (-0.48) | 66/63 +0.47 (+0.10) | +0.90 / -1.01 | 0 | 185/108 -0.68 (-1.33) | 1 | exit comparator | keep | EXIT COMPARATOR under HH-BREAK | paired read on the same buys | – |
| VOL300K | 5/5 -0.59 (-0.54) | 3/3 -0.49 (-0.35) | -0.15 / -0.44 | 0 | 2/1 -0.24 (0.00) | 0 | retire | retire | OUT of primary scoring | none | vs VOL300K-UP: 3 of 5 buys are not the same buy, -0.49; 3 on coins it never bought, -0.49 |
| VOL300K-UP | 2/2 -0.10 (-0.05) | – | – / -0.10 | 0 | 1/1 -0.05 (0.00) | 0 | keep/collect | repair first | COLLECT; blind to non-SOL pools until coverage is repaired | none | – |
| VOL500K | 3/3 -0.49 (-0.35) | 3/3 -0.49 (-0.35) | -0.15 / -0.34 | 0 | – | 0 | retire | retire | OUT of primary scoring | none | vs VOL500K-UP: 3 of 3 buys are not the same buy, -0.49; 3 on coins it never bought, -0.49 |
| VOL500K-UP | – | – | – / – | 0 | – | 0 | untested | repair first | COLLECT; untested | none | – |
| RUG450 | 23/22 -1.80 (-1.89) | 11/10 -0.63 (-0.72) | -0.17 / -1.63 | 2 | – | 0 | retire | retire | OUT of primary scoring | none | – |
| RUG450-BOUNCE | 9/9 -0.21 (-0.46) | 8/8 -0.15 (-0.41) | +0.03 / -0.24 | 0 | 1/1 -0.20 (0.00) | 0 | keep | continue | REFERENCE, unchanged | none | – |
| RUG950 | 13/13 -1.04 (-1.13) | 2/2 +0.12 (+0.02) | +0.12 / -1.16 | 2 | – | 0 | retire | retire | OUT of primary scoring | none | vs RUG450: 0 of 13 buys are not the same buy, 0.00; 0 on coins it never bought, 0.00 |
| RUG950-BOUNCE | 2/2 -0.02 (-0.04) | 2/2 -0.02 (-0.04) | -0.02 / – | 0 | – | 0 | tagged subset | continue | TAGGED SUBSET of RUG450-BOUNCE | none | vs RUG450-BOUNCE: 0 of 2 buys are not the same buy, 0.00; 0 on coins it never bought, 0.00 |
| FEE-COINS | – | – | – / – | 0 | – | 0 | untested | repair first | UNTESTED (no buys) | none | – |

Where I moved to Codex's view: FAST-5M and SECOND-WAVE out of primary scoring; CONT read at 25% against 30% with no blanket half-at-2×; HH15-5M, HH30-5M and FAST150-10M kept running as parents of a tag instead of retired. Where Codex's list and mine already agreed: 13 retirements, the three core references, HH-BREAK-4H as an exit comparator. Where I still differ: the $200K slice is one tag (T1), not two restructured books; VOL300K-UP and VOL500K-UP cannot be judged until pools not paired with SOL are covered (54% of decoded pool events are discarded before pricing).

## C. Proposed frozen seven-day research plan (for the owner's decision; nothing is implemented)

**Freeze.** One commit, one specification, a fresh database. Seven complete entry days, then entries stop and positions are followed to the end of their 24 hours (eight days in all). No rule or threshold changes during the run. Any restart is logged with its cause; the scheduled 30-minute checks continue.

**Primary scoring (unchanged rules).** First buys per book and age group; 30% pure trail; distinct coins; result without the best coin; fixed halves at the mid-point of the entry period; open and unresolved rows listed, never dropped.

| Role | Books |
|---|---|
| Reference books | HH-BREAK, LOW4H (with SLOW-BUILD as its tagged subset), CONT, FAST-3M, FAST150-5M, RUG450-BOUNCE (with RUG950-BOUNCE as its tagged subset) |
| Paired exit reads on the same buys (rows already exist) | HH-BREAK-4H against HH-BREAK; half-at-2× against pure at 30% and 40% on HH-BREAK; 25% against 30% pure on CONT, FAST-3M, FAST150-5M |
| Parents kept running only so a tag can be evaluated | HH15-5M, HH30-5M, FAST150-10M |
| Collecting, not scored | VOL300K-UP, VOL500K-UP, FEE-COINS |
| Out of primary scoring; definitions and history kept | AGE-DOUBLE, CONT-STALL, LOW4H-LIQ25K, FAST-1M, FAST-5M, FAST-10M, FAST-30M, FAST150-1M, FAST150-3M, SECOND-WAVE, HH30-10M, VOL300K, VOL500K, RUG450, RUG950 |

**Exploratory tags, fixed now, judged only on the new week's buys.**

| Tag | Exact definition (on the parent's first buy; no re-arm) | Source |
|---|---|---|
| T1 | HH15-5M or HH30-5M first buy with market cap at the signal ≥ $200,000; each buy counted once | Codex 4A/4B |
| T2 | FAST150-10M first buy with ≥ 45 distinct buyers in the 5 minutes before the signal | Codex 4C |
| T3 | FAST150-5M first buy with token age 16–36 hours | Codex |
| T4 | HH-BREAK first buy with the price within 18% of its 4-hour high before the breakout (`drawdown4h ≥ −0.18`) | Claude |

A tag counts as supported only if, on the new week alone: at least 40 buys on at least 30 coins; net above zero; above zero without its best coin; neither half negative; and a better result per buy than the rest of its parent. Otherwise it is dropped. A supported tag earns a second week, not a claim of an edge.

**Buying again.** Kept on and reported apart from first buys, as now, so that a fully followed cohort finally exists. No cooldown yet. If the owner prefers a lighter run it can be switched off without affecting any first-buy figure.

**Two open choices for the owner (both are changes, so neither is assumed).**
- Retired books: leave them buying on paper but off the main scoreboard (no rule change, keeps their opportunity record), or switch them off (a specification change; a simpler page).
- The 4-hour clock beside CONT from my report: the only item here that needs new rule code. Its support is one comparison (HH-BREAK-4H against HH-BREAK, 88 buys). I now rank it below everything above and would leave it out of this week.

**Before the run starts.**
1. The independent READY review of the code that will be frozen (834ca71 plus the save-timing fix 982ecde, which changes only when open positions are written to disk).
2. Decide whether the sampled (Jupiter) side is in scope: in three days it made 29 buy decisions and 17 were cancelled for lack of a price.
3. Read the transfer-fee setting of Token-2022 coins on the live method (225 buys were made without it being known).
4. Record the commit of every program start in the database.
5. A decision on pools not paired with SOL, or a plain label that those coins are not covered.

**What a week can and cannot show.** Three days produced one break-even stretch and one losing stretch across every book. A positive week would be a reason to continue, not proof of an edge.

## D. Data package

Branch `older-review-package` — https://github.com/bsc-volume-alert/Top-coins-Bot/tree/older-review-package

| Codex asked for | File |
|---|---|
| Fill, trigger and sale timestamps | `data/fills.csv`, `data/sales.csv`, `data/positions.csv.gz` (`fill_t`, `trigger_t`, `exit_t`) |
| Exit reasons, estimated-exit flags | `positions.csv.gz` (`exit_reason`, `estimated_exit`), `sales.csv` (`reason`, `estimated`) |
| Token quantities, partial-sale cash flows | `fills.csv` (`tokens`), `sales.csv` (one line per leg: `half-at-2x`, `exit`; `tokens_sold`, `sol_net_of_tx`) |
| Per-sale quotes / reserves and fee evidence | `sales.csv` (`pool_q`, `pool_b`, `pool_fee`, `quote`, `fee_src`), `fills.csv` |
| Price paths | minute bars of every bought coin in the raw branch (`bars_bought-*.ndjson.gz`); hourly bars of all 41,647 coins (`bars_hourly`); spot high/low while held and 24 h after the sale in `positions.csv.gz` |
| Horizon-completion status | `entries.csv` (`runner_horizon_done`, `runner_partial`, seconds to 2×/3×/5×/10×) |
| Operational flags and causes | `entries.csv` (`quality`, `flags`, `feed_lag_s`, `warm_gap_s`), `coverage_and_incidents.csv` |
| Failed fills, open and unresolved positions | all kept: 17 cancelled entries in `entries.csv`; open rows in `positions.csv.gz` with their last dated valuation |
| Rejections and never-bought coins | `rejections.csv.gz` (521,011), `coin_outcomes.csv.gz` |
| Raw source, checksums, reproduction | branch `older-review-data` (raw tables, SHA-256 per file); `README.md`; `tools/` |

Not available, and what that prevents: raw per-trade observations outside each buy's own trigger window (the bot keeps them in memory only), so a rule cannot be replayed tick by tick on coins it did not buy; minute bars of never-bought coins; the lowest executable value while held.
