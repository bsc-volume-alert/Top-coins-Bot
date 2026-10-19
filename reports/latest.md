# 4-hour study — 19 Oct 2026 17:41 UK

**Data push:** 17:08 UK (fresh). 1,952 triggers since the price fix (18 Oct 20:25 UK) to 19 Oct 17:04 UK. A: 298 fired, 129 passed, 128 closed. C 39 · D 101 · 80-SOL 55 · E 40 passed. Live legs 88 (none since 10:59 UK), shadow legs 164. Project S: 1,026 rows across S1–S9 (S9 "swarm dip" is new since the last study, from 15:56 UK). launches.csv: 45,088 launches, 18 Oct 17:05 → 19 Oct 16:05 UK.

**Since the 13:28 UK study:** 1,200 new rows, 1,022 of them Project S paper snipers; A had 27 more passed trades and they were bad (runner **−7.1%** net, 5-min −9.1%, win 44%); F1's coins in that window were worse still (9 trades, −10.3%). No book has traded live since 10:59 UK; A–D are **off** in the executor at the time of the push, F, G, S9, S1 and S6 in shadow (the owner's 17:11 UK commit moves S3/S4 to shadow and S1/S6/S9 back to paper). Shadow since the last study: **−1.29 SOL on 82 legs** (A −0.71 on 24, S9 −0.23 on 24, S1 −0.16 on 8, D −0.11 on 17, S6 −0.08 on 5, C −0.01 on 4), with B's leg −0.73 on 63. The data improved: heat, creator, copycat, pool, path and 60-s columns are now filled on every A row since 14:45 UK (18 rows), the gw_big_* (biggest buyer's GMGN record) on all 18, but **gi_/gs_ on 5 of 18, gh_ on 5, sm_ on 4, gm_ on 4** — GMGN's token/holder/smart-money columns are filling slowly and are not yet usable on A; they are filled on 406 of 1,026 S rows. The two shadow executor books F and G: F has **no legs at all** (legF_* empty on every row — worth a look at the executor), G has 7 (−0.327 SOL, 4 stops).

**Is the winning formula visible?** Not in any book that trades the A/C/D/E triggers: A's runner is −1.3% net on 128 (and −7.1% on the 27 since 13:28), B, C, 80 and the S1–S9 snipers all lose after costs. Two things are visible and both are hypotheses: (1) the owner's $5K → $200K coins are, in 24 h, 39 launches out of 32,500, and **14 of the 39 are one operator** with a fixed launch signature (10 bundle wallets, ~39% of supply, 22–27 SOL, dev buy under 0.1 SOL) that went 14 for 14 to $200K+ with the 60-s price 15–45x the +4 s price — registered as **F3**, the one launch-time tell in the file that clears the sniper cost by a mile, if the +4 s price can be bought; (2) F2 (the 13:28 study's "tier-1 bundled launch") **does not hold up**: its lift came from a different factory that buys the entire bonding curve in one wallet, which no outside buyer can enter at +4 s, and S8, which trades the tier-1 coins that *are* buyable, is 0 for 33 at 5x. F1 (small-bundle A coins) is 9 for 40 out of sample at −10.1%; still waiting, but the first nine point the wrong way.

## What the data says
## Data
Triggers since the price fix: **1952** (2026-10-18 19:25:36 → 2026-10-19 16:04:57 UTC). A: 298 fired, 129 passed the filters, 128 closed. C passed: 39 · D passed: 101 · E ($100K/5 min) passed: 40. Live legs: 88 · shadow legs: 164.
Skipped by the filters: launch not seen 115 · 150+ wallets 181 · not SOL-paired  147 · bundled 70%+ 118.

## Sell rules on A's coins, then C / D / E (paper, before costs → net at 0.1 SOL with the measured costs)
| rule | n | avg/trade | net @0.1 | win | stopped | ≥2x |
|---|---|---|---|---|---|---|
| A runner (live rule) | 128 | +7.3% | -1.1% | 53% | 40% | 5% |
| sell at 5 min (B) | 128 | +3.0% | -5.3% | 56% | 34% | 4% |
| sell at 3 min | 128 | +6.7% | -1.6% | 53% | 27% | 5% |
| sell at 15 min | 128 | +0.8% | -7.5% | 55% | 39% | 2% |
| 5 min, floor 1.4 | 128 | +4.9% | -3.7% | 56% | 34% | 3% |
| 1.5x / −40% | 128 | +6.6% | -1.5% | 55% | 39% | 0% |
| C coins, runner | 39 | -7.3% | -14.7% | 38% | 44% | 0% |
| D coins, runner | 101 | +7.4% | -1.0% | 50% | 40% | 4% |
| E ($100K in 5 min) runner | 40 | +7.3% | -1.2% | 43% | 48% | 5% |
| E 1.5x / −40% | 40 | +6.1% | -2.0% | 53% | 48% | 0% |
| E sell at 5 min | 40 | +12.5% | +3.2% | 50% | 45% | 3% |
| E sell at 3 min | 40 | +8.9% | +0.0% | 48% | 45% | 3% |
| E 2x / −40% | 40 | +11.1% | +2.4% | 38% | 63% | 38% |
| E ½ at 2x + 40% trail | 40 | +9.3% | +0.7% | 38% | 63% | 8% |

## Time of day (UK) — A's coins
| band | n | runner | 5-min | 3-min | runner win |
|---|---|---|---|---|---|
| 00–06h | 44 | +4.4% | +1.5% | +5.0% | 52% |
| 06–12h | 25 | +5.7% | -0.1% | +11.9% | 52% |
| 12–18h | 30 | +3.5% | +0.6% | +1.1% | 47% |
| 18–24h | 29 | +17.0% | +10.5% | +10.7% | 62% |

## Live vs paper — the same trades
| book | n | live SOL | paper SOL (0%) | entry gap | exit gap |
|---|---|---|---|---|---|
| B | 50 | -0.301 | +0.041 | +1.7% | -3.2% |
| A | 38 | -0.376 | +0.081 | +0.6% | -6.1% |

| book · exit | n | live SOL | paper SOL | exit gap |
|---|---|---|---|---|
| B · h5 | 22 | -0.176 | -0.037 | -1.2% |
| B · time | 10 | +0.063 | +0.119 | -2.2% |
| B · stop | 9 | -0.247 | -0.187 | -5.5% |
| B · floor | 8 | +0.036 | +0.100 | -6.0% |
| B · close:tsl80 | 1 | +0.023 | +0.046 | -16.9% |
| A · flow4 | 5 | -0.048 | +0.007 | -4.0% |
| A · paper-close:lowvol | 1 | +0.008 | +0.015 | -1.7% |
| A · stop | 12 | -0.592 | -0.500 | -8.8% |
| A · fade-volume | 11 | +0.344 | +0.455 | -1.3% |
| A · close:lowvol | 8 | +0.010 | +0.064 | -1.4% |
| A · close:tsl80 | 1 | -0.098 | +0.040 | -79.3% |

## Shadow vs paper — the same trades
| book | n | shadow SOL | paper SOL (0%) | entry gap | exit gap |
|---|---|---|---|---|---|
| B | 63 | -0.731 | -0.202 | +5.1% | -1.9% |
| C | 7 | +0.027 | +0.056 | -1.2% | -0.4% |
| D | 26 | +0.025 | +0.012 | -2.6% | -2.9% |
| A | 31 | -0.625 | -0.291 | +4.7% | -0.9% |
| G | 7 | -0.327 | -0.180 | +0.0% | -14.1% |
| S9 | 24 | -0.229 | -0.020 | +0.3% | -1.4% |
| S1 | 8 | -0.156 | -0.193 | -2.1% | -7.0% |
| S6 | 5 | -0.079 | +0.004 | +35.0% | +1.7% |

| book · exit | n | shadow SOL | paper SOL | exit gap |
|---|---|---|---|---|
| B · h5 | 29 | -0.019 | +0.214 | -2.0% |
| B · paper-close:lowvol | 1 | -0.002 | +0.002 | -0.4% |
| B · stop | 11 | -0.765 | -0.726 | +1.7% |
| B · time | 15 | -0.121 | +0.096 | -3.2% |
| B · floor | 7 | +0.176 | +0.212 | -4.5% |
| C · fade-volume | 3 | +0.150 | +0.149 | -3.0% |
| C · stop | 2 | -0.146 | -0.145 | +3.6% |
| C · close:lowvol | 2 | +0.023 | +0.051 | -0.6% |
| D · stop | 11 | -0.813 | -0.783 | -9.5% |
| D · close:lowvol | 3 | +0.049 | -0.014 | +2.3% |
| D · fade-volume | 11 | +0.800 | +0.832 | +1.9% |
| D · fade-sellers | 1 | -0.011 | -0.024 | +2.8% |
| A · stop | 15 | -1.429 | -1.272 | -3.6% |
| A · fade-volume | 11 | +0.839 | +0.945 | +1.8% |
| A · fade-sellers | 1 | -0.011 | -0.024 | +2.8% |
| A · close:lowvol | 4 | -0.025 | +0.061 | +1.3% |
| G · fade-sellers | 1 | -0.012 | +0.003 | -25.0% |
| G · fade-volume | 2 | +0.198 | +0.228 | -3.0% |
| G · stop | 4 | -0.513 | -0.411 | -16.9% |
| S9 · no exit signal in 7 min (h5) | 10 | -0.139 | +0.000 | — |
| S9 · stop | 6 | -0.147 | -0.125 | -4.6% |
| S9 · floor | 2 | +0.024 | +0.076 | +2.2% |
| S9 · time | 6 | +0.032 | +0.029 | +0.7% |
| S1 · stop | 6 | -0.156 | -0.139 | -8.9% |
| S1 · floor | 2 | -0.000 | -0.053 | -1.1% |
| S6 · fade-volume | 3 | -0.029 | +0.049 | -1.7% |
| S6 · stop | 2 | -0.050 | -0.045 | +6.9% |

## When to sell — the price path after entry (A's passed coins with a trace, n 35)
| seconds after entry | n | avg | median | above entry | net if sold here @0.1 | stopped before (−40%) | 1.5x by then | net: sell here or at the stop |
|---|---|---|---|---|---|---|---|---|
| 10 | 35 | +2.3% | 1.004 | 51% | -4.7% | — | — | — |
| 20 | 35 | +4.3% | 0.981 | 43% | -2.9% | — | — | — |
| 30 | 35 | +1.0% | 0.997 | 49% | -5.9% | — | — | — |
| 40 | 35 | +5.5% | 1.033 | 63% | -1.8% | — | — | — |
| 50 | 35 | +4.7% | 1.004 | 54% | -2.6% | — | — | — |
| 60 | 35 | +5.6% | 1.038 | 54% | -1.7% | — | — | — |
| 120 | 32 | +3.5% | 0.995 | 47% | -3.7% | — | — | — |
| 180 | 30 | -7.5% | 0.848 | 37% | -13.9% | — | — | — |
| 300 | 27 | -18.7% | 0.843 | 37% | -24.3% | — | — | — |
| 600 | 21 | -40.1% | 0.447 | 19% | -44.2% | — | — | — |
| 900 | 12 | -29.0% | 0.410 | 25% | -33.9% | 75% | 50% | -11.8% |
| 1200 | 12 | -32.5% | 0.267 | 25% | -37.2% | 75% | 58% | -14.7% |
| 1800 | 7 | -65.2% | 0.082 | 14% | -67.6% | 86% | 57% | -33.3% |

| state at 60 s | n | avg at 5 min | runner | 5-min | 3-min |
|---|---|---|---|---|---|
| up ≥20% at 60 s | 9 | -21.7% | +47.8% | +25.1% | +36.9% |
| flat (0.9–1.2) at 60 s | 15 | -2.6% | -2.7% | -6.6% | -3.3% |
| down <0.9 at 60 s | 11 | -34.0% | -31.4% | -19.7% | -29.6% |
| new buyers ≥10 by 60 s | 34 | -18.8% | +1.8% | -2.2% | -1.2% |
| new buyers <5 by 60 s | 1 | -16.8% | -15.8% | -15.8% | -0.9% |
| more sold than bought by 60 s | 18 | -20.5% | -17.4% | -12.2% | -19.0% |
| holders up by 5 min | 13 | +9.9% | +4.1% | +6.4% | +3.0% |
| holders down by 5 min | 9 | -64.6% | -14.2% | -21.4% | -4.7% |

## Entry features — A's passed coins split at the median (runner result; spread = top half minus bottom half)
| feature | n | median | bottom half | top half | spread |
|---|---|---|---|---|---|
| t60_hi | 28 | 1.164 | -24.7% (win 21%) | +31.9% (win 71%) | +56.7% |
| t60_x | 35 | 1.038 | -19.9% (win 24%) | +21.4% (win 61%) | +41.3% |
| hi_t | 30 | 95 | -15.8% (win 27%) | +22.8% (win 67%) | +38.6% |
| heat_win2h_hit | 30 | 7 | -15.8% (win 27%) | +22.7% (win 67%) | +38.5% |
| t300_lo | 22 | 0.707 | -15.9% (win 18%) | +21.6% (win 73%) | +37.6% |
| t30_x | 36 | 1.008 | -15.9% (win 28%) | +20.9% (win 61%) | +36.8% |
| t60_psn | 28 | 24 | -14.5% (win 36%) | +21.7% (win 57%) | +36.2% |
| fs5_x | 128 | 1 | -10.5% (win 38%) | +25.2% (win 69%) | +35.7% |
| heat_sol1h_pct | 27 | 0.16 | -15.9% (win 23%) | +17.1% (win 64%) | +33.0% |
| t60_lo | 28 | 0.841 | -12.6% (win 29%) | +19.8% (win 64%) | +32.3% |
| t30_nn | 36 | 79 | -13.1% (win 33%) | +18.1% (win 56%) | +31.2% |
| t10_x | 37 | 1.004 | -13.3% (win 28%) | +15.2% (win 58%) | +28.5% |
| t60_bs | 35 | 84.72 | -12.4% (win 35%) | +14.2% (win 50%) | +26.6% |
| t60_nn | 35 | 148 | -11.2% (win 35%) | +13.1% (win 50%) | +24.3% |
| t10_bs | 37 | 18.27 | -11.0% (win 33%) | +13.0% (win 53%) | +24.0% |
| cc_best_mc24h | 27 | 71440.047 | -9.3% (win 38%) | +14.4% (win 50%) | +23.7% |
| fs1_x | 128 | 1.003 | -4.5% (win 41%) | +19.1% (win 66%) | +23.6% |
| t30_ps | 29 | 953 | -6.4% (win 43%) | +15.7% (win 53%) | +22.0% |
| heat_win2h_dead | 30 | 7 | -7.0% (win 33%) | +13.9% (win 60%) | +20.9% |
| heat_grad1h | 30 | 122 | +13.9% (win 53%) | -7.0% (win 40%) | -20.9% |

Quartiles of the five widest spreads:
- **t60_hi**: 1.02–1.08: -33.4% (n 7) · 1.09–1.15: -16.1% (n 7) · 1.16–1.4: +16.2% (n 7) · 1.44–2.8: +47.6% (n 7)
- **t60_x**: 0.12–0.81: -27.9% (n 8) · 0.86–0.97: -9.4% (n 8) · 1.01–1.11: -17.6% (n 8) · 1.12–2.22: +44.0% (n 11)
- **hi_t**: 0–19: -29.3% (n 7) · 20–68: +1.6% (n 7) · 88–241: +16.2% (n 7) · 286–1372: +20.5% (n 9)
- **heat_win2h_hit**: 3–4: -25.7% (n 7) · 4–7: -2.4% (n 7) · 7–8: -15.3% (n 7) · 8–12: +45.3% (n 9)
- **t300_lo**: 0.04–0.21: -0.2% (n 5) · 0.29–0.6: -44.5% (n 5) · 0.67–0.8: +1.7% (n 5) · 0.8–1: +39.7% (n 7)

## Realistic exits — each rule priced off the 5-s path 10 s after it fired, minus the measured costs (A's passed coins)
| rule | fired | median fire (s) | paper avg | path 10 s later | realistic net @0.1 | falling at the fire |
|---|---|---|---|---|---|---|
| flow4 | 21 | 182 | +5.6% | +9.8% (n 19) | +0.3% | 42% |
| flow4 · fade-volume | 9 | 231 | +64.9% | +60.1% | | |
| flow4 · stop | 11 | 147 | -41.5% | -37.1% | | |
| flow4 · fade-sellers | 1 | 188 | -9.7% | -20.9% | | |
| h5 | 24 | 240 | -5.8% | -4.4% (n 22) | -12.1% | 41% |
| h5 · time | 10 | 300 | +9.7% | +10.8% | | |
| h5 · stop | 9 | 132 | -41.7% | -37.0% | | |
| h5 · floor | 5 | 232 | +28.1% | +20.2% | | |
| h3 | 24 | 180 | -0.1% | +1.3% (n 23) | -6.5% | 39% |
| h15 | 19 | 220 | -12.2% | -8.8% (n 17) | -16.9% | 47% |
| h5f14 | 25 | 230 | -3.1% | +2.9% (n 23) | -5.7% | 26% |
| t15s40 | 21 | 147 | +2.1% | +7.7% (n 19) | -0.6% | 26% |
| t2s40 | 19 | 215 | -12.5% | -3.7% (n 16) | -11.6% | 38% |
| h2t40 | 18 | 220 | -23.2% | -23.4% (n 15) | -30.0% | 47% |
| split | 22 | 120 | -9.5% | -14.4% (n 21) | -21.0% | 38% |
| tsl40 | 20 | 129 | -17.0% | -14.3% (n 19) | -20.5% | 21% |

## Does the path predict the real sale?
No live leg yet has both a real sale and a path-stamped exit (the new columns are recorded from 19 Oct 12:08 UK).

## Money management — A's live rule, paper at the cost model, in trade order (n 128)
| net/trade | win rate | avg win | avg loss | worst losing streak | max drawdown (× stake) | total (× stake) | coin went to ≤0.2 | coin went to ≤0.05 | Kelly | half-Kelly stake on 1.5 SOL |
|---|---|---|---|---|---|---|---|---|---|---|
| -1.1% | 48% | +41.7% | +40.0% | 5 | 5.32 | -1.42 | 12% | 2% | -2.7% | 0 SOL |

| stake | net/trade (fees scale) | total SOL | max drawdown SOL |
|---|---|---|---|
| 0.05 | -4.6% | -0.298 | 0.429 |
| 0.1 | -1.1% | -0.142 | 0.532 |
| 0.25 | +1.0% | 0.325 | 0.956 |
| 0.5 | +1.7% | 1.104 | 1.775 |

## Clustering — are the trades independent? (A's live rule, paper)
| | n | avg | win |
|---|---|---|---|
| after a winning trade | 67 | +1.5% | 48% |
| after a losing trade | 60 | +13.6% | 58% |
| within 10 min of the previous trigger | 84 | +5.8% | 51% |
| more than 10 min after | 44 | +10.1% | 57% |
| busy hours (6+ passed A triggers) | 86 | +7.1% | 52% |
| quieter hours | 42 | +7.6% | 55% |
Hours with at least one A trigger: 21 · triggers per such hour: median 5, max 11. Treat the hour, not the trade, as the independent unit when judging a rule.

## Project S — paper snipers (bought in the first seconds of a launch; 10% round-trip costs)
| book | n (closed) | entry MC · delay | reached 1.5x · 2x · 5x | 1.5x/−40% net | 2x/−40% net | runner net | 3-min net | 5-min net | 40% trail net | ½ at 2x + trail |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 53 (43) | $4K · 1 s | 56% · 30% · 12% | -10.5% (won 47%) | -17.2% (won 26%) | -19.5% (won 21%) | -10.1% (won 44%) | -6.5% (won 44%) | -9.1% (won 28%) | -17.1% (won 26%) |
| S2 | 233 (150) | $3K · 12 s | 37% · 18% · 1% | -12.5% (won 35%) | -17.2% (won 20%) | -16.3% (won 24%) | -20.0% (won 30%) | -20.6% (won 29%) | -17.5% (won 20%) | -20.4% (won 20%) |
| S3 | 47 (29) | $3K · 1 s | 48% · 38% · 17% | -13.2% (won 45%) | -12.6% (won 31%) | +10.2% (won 31%) | +0.3% (won 38%) | -5.1% (won 38%) | +18.4% (won 34%) | +3.4% (won 31%) |
| S4 | 24 (17) | $4K · 7 s | 35% · 18% · 0% | -5.0% (won 41%) | +1.4% (won 41%) | +1.4% (won 41%) | +10.2% (won 47%) | +2.0% (won 41%) | -4.6% (won 35%) | +0.8% (won 41%) |
| S5 | 275 (179) | $6K · 7 s | 42% · 21% · 3% | -13.1% (won 39%) | -15.7% (won 23%) | -11.3% (won 30%) | -9.8% (won 37%) | -10.2% (won 38%) | -8.9% (won 28%) | -15.4% (won 23%) |
| S6 | 178 (91) | $5K · 6 s | 59% · 33% · 2% | -0.3% (won 54%) | -0.3% (won 34%) | +4.7% (won 48%) | -4.3% (won 53%) | -6.8% (won 53%) | -8.4% (won 37%) | -6.2% (won 34%) |
| S7 | 133 (62) | $5K · 13 s | 42% · 21% · 3% | -5.5% (won 42%) | -9.3% (won 24%) | -7.9% (won 39%) | -8.4% (won 40%) | -12.5% (won 40%) | -6.3% (won 29%) | -10.1% (won 24%) |
| S8 | 51 (33) | $10K · 5 s | 48% · 27% · 0% | -11.9% (won 45%) | -12.0% (won 30%) | -10.5% (won 42%) | -14.8% (won 48%) | -19.5% (won 45%) | -13.6% (won 45%) | -16.6% (won 30%) |

## Strategy register — proposed earlier, scored on the trades that came after
| id | rule | proposed | in-sample | out of sample | baseline (all trades since) | verdict |
|---|---|---|---|---|---|---|
| S1 | sell at 3 minutes instead of 5 (from 84 post-fix trades: +10.1% vs +5.0%) — no filter, exit x_h3 | 2026-10-19T09:30Z | +1.4% (n 91) | -8.9% (n 37) | -8.9% (n 37) | waiting (37/40 trades) |
| S2 | fewer than 65 wallets in the trigger minute (from 49 live coins: 72% win vs 38%) — wal60 <= 65, exit x_flow4 | 2026-10-19T09:30Z | +3.9% (n 46) | -18.3% (n 16) | -6.7% (n 37) | waiting (16/40 trades) |
| S3 | one buyer took more than 10% of the trigger minute's buying (from 49 live coins: 75% win vs 36%) — max_share > 0.1, exit x_flow4 | 2026-10-19T09:30Z | +12.4% (n 50) | -12.7% (n 18) | -6.7% (n 37) | waiting (18/40 trades) |
| F1 | study's own: A coins whose launch bundle was at most 3 wallets, runner exit. From 100 passed A trades: n33 +18.4% net, 76-85% win, 12% stopped vs n67 -9.0% net, 37-40% win; holds at the 5-s fill price (+13.9%), in 10 of 13 hours, and on D's coins (n27 +13.2% vs n53 -8.7%, mostly the same mints). Hypothesis until 40 out-of-sample trades. — bundle_wallets <= 3, exit x_flow4 | 2026-10-19T12:45Z | +18.4% (n 33) | -10.1% (n 9) | -6.8% (n 27) | waiting (9/40 trades) |
| F2 | study's own LAUNCH-TIME rule (score by hand from launches.csv, create_ts > after_ts): a tier-1 bundled launch (bundle 40-79% of supply, median dev buy 4.9 SOL, ~25 an hour), bought at the +4 s price (median MC $32K), sold at 5 min. 604 launches in 24 h: 5-min multiple median 1.24 on the 86% still trading, 44% above the 10% cost, 28% reached 5x and 16% 10x by 5 min, 55% graduated; positive in all six 4-hour blocks. The website's bundled-70%+ skip and S4's clean-launch premise point the other way. Not yet a book: needs the executor to see whether the +4 s price is obtainable (bundle sells into the buy) — judge on the next 24 h of launches first. — tier == 1, exit launch_5min | 2026-10-19T12:45Z | — (n 0) | — (n 0) | — (n 0) | waiting (0/40 trades) |
| S4 | the owner's E trigger ($100K traded in 5 min, MC under $100K) sold at 5 minutes: the best E exit so far, +8.8% net on 31 passed trades (runner +5.3%, 1.5x/-40% -0.1%); 31 trades is too few to mean anything. — no filter, exit x_h5 | 2026-10-19T12:45Z | +8.8% (n 31) | -15.8% (n 9) | -15.8% (n 9) | waiting (9/40 trades) |
| F3 | study's own LAUNCH-TIME rule, scored by hand from launches.csv (create_ts > after_ts; the study.mjs table cannot score it). One operator's signature: the create block buys 37-41% of supply over exactly 10 wallets with 22-27 SOL, the creator's own buy is under 0.2 SOL, no socials. 14 launches in 24 h (18 Oct 16:21 to 19 Oct 10:23 UTC): all 14 peaked >= $200K and graduated; from the +4 s price (median MC $11K) the 60-s mark was 15-45x (median 19.5x, fill 13/14), the 5-min mark 16-24x on the 9 with a mark. Base rate for an ordinary launch: 0.12% reach $200K. Replaces F2 (verdict below): F2's lift was a different factory that buys the whole curve in one wallet (bundle 79.3%, 85 SOL) and cannot be bought at +4 s; S8's buyable tier-1 coins lose. Open questions: whether the +4 s price exists for an outside buyer (the 10 wallets may front-run the curve themselves), and whether the operator keeps launching. Hypothesis until 40 launches; judge from 20 given the base rate. — bundle_wallets == 10 & bundle_pct >= 37 & bundle_pct <= 41 & bundle_sol >= 20 & bundle_sol <= 28 & dev_buy_sol < 0.2, exit launch_60s_to_5min | 2026-10-19T16:40Z | — (n 0) | — (n 0) | — (n 0) | waiting (0/40 trades) |
| F4 | study's own: the G book's coins (A's trigger, skipped by the website for 150-500 wallets) sold at 5 minutes instead of the runner. Score by hand from A rows with skip_why = N wallets (the study.mjs table scores on passed rows and will show 0). Evidence: 36 such trades since the price fix, 5-min sell +20.5% net (win 64%) and 1.5x/-40% +5.9%, against the runner -1.4% and G's 7 shadow runner legs -0.327 SOL (4 stops). At 13:28 it was +35.9% on 26, so the last 10 were about -20%: the edge is fading, which is why it is registered rather than recommended. Hypothesis until 40 out-of-sample trades. — pass == 0, exit x_h5 | 2026-10-19T16:40Z | — (n 0) | — (n 0) | — (n 0) | waiting (0/40 trades) |

### Study's own tables

**Exits on every book (passed, closed; net at the cost model):**

| book | n | runner | 5-min | 3-min | 1.5x/−40% | 2x/−40% | stopped (runner) |
|---|---|---|---|---|---|---|---|
| A | 128 | −1.3% (win 53%) | −5.5% | −1.8% | −1.7% | −2.7% | 40% |
| C | 39 | −15.0% (38%) | −15.5% | −14.2% | −12.4% | −19.4% | 44% |
| D | 101 | −1.3% (50%) | −7.8% | −0.2% | −0.5% | −2.5% | 40% |
| E | 40 | −1.5% (42%) | **+3.0%** | −0.2% | −2.3% | +2.0% | 48% |
| 80 | 55 | −13.9% (35%) | −12.1% | −10.9% | −9.9% | −16.1% | 53% |

**Entry features on A's 128 passed coins** (runner, net at the cost model; win = share above entry):

| split | yes | no |
|---|---|---|
| bundle wallets ≤ 3 (F1) | n42 **+12.2%**, win 79%, stopped 17% | n86 −8.0%, win 41%, stopped 51% |
| … F1 on the 9 trades since 13:28 UK only | n9 −10.1% (study.mjs) / n6 −17.0% (since 13:45) | n122 −0.6% |
| bundle % < 28 | n67 +4.0%, win 63% | n61 −7.2%, win 43% |
| one buyer > 10% of the trigger minute (S3) | n68 +5.6%, win 60% | n60 −9.2%, win 45% |
| wallets in the trigger minute ≤ 65 (S2) | n62 −2.0%, win 58% | n66 −0.7%, win 48% |
| price up at 5 s (fs5 ≥ 1.0) — mostly the paper entry being cheap | n64 +15.6%, win 69% | n64 −18.3%, win 38% |
| has socials | n89 +2.3%, win 58% | n39 −9.7%, win 41% |
| creator still holds at entry | n27 −9.1%, win 44% | n101 +0.8%, win 55% |
| sold < 20 SOL in the trigger minute | n20 +10.0%, win 60% | n108 −3.4% |
| copycat (same name in 24 h) | n27 −5.6%, win 44% | n101 −0.2% |
| pool ≥ 40 SOL | n30 −5.0% | n98 −0.2% |
| 7+ recent A winners in the last 2 h (heat_win2h_hit ≥ 7) | n17 +5.3% | n111 −2.3% |
| GMGN smart-money buy in the 5 min before (sm_buys_5m ≥ 1) | n8 +3.2% | n120 −1.6% |
| biggest buyer in profit on GMGN, 7 d (gw_big_realized > 0) | n13 −14.7%, win 38% | n115 +0.2% |
| biggest buyer's wallet under a week old | n6 −38.1% | n122 +0.5% |
| gh_smart > 0 / gh_sniper > 5% / gh_bundler > 10% | n1 / n2 / n7 | — too few |

The GMGN holder-tag and smart-money splits are on 1–13 trades: nothing can be said. The one GMGN split with a sign is the *wrong* one for the owner's intuition — when the trigger minute's biggest buyer is a wallet GMGN shows in profit, the trade lost (13 trades, −14.7%); a hypothesis at best.

**The website's four skips (A fired, not passed):** bundled 70%+ — right to skip (n28, runner −21.8%). Launch not seen — right (n44, −11.4%). Not SOL-paired — mixed (54 coins, by quote: WBTC-paired +14.4% n12, PUMP-paired −6.9% n12, the rest 1–9 each); untradable anyway. **150+ wallets — still wrong on the 5-min sell:** n36, runner −1.4% but **5-min sell +20.5% (win 64%)**, 1.5x/−40% +5.9%; the 150–500 band alone (G's coins) n34, 5-min +20.7%. It was +35.9% on 26 at 13:28, so the ten new ones were about −20%. G's shadow legs run the runner exit on these coins and lost 0.327 SOL on 7 (4 stops) — the exit, not the coins, is the question. Registered as **F4**.

**E and the owner's 1A/1B/2A/2B (E's 40 passed):** E's best exit is still the plain 5-min sell (+3.0%, win 50%; runner −1.5%). 1A (stock-paired or MC < $47K): 1.5x/−40% −5.3%, runner −1.2% (n18). 1B (SOL pool and MC < $47K): 1.5x/−40% **+7.8%**, runner **+21.5%** (n9, win 67%). Nine trades say nothing; 1B is the one worth watching.

**Later entry and the 60-s state (A's 35 traced passed coins, 13:00–17:00 UK; the previous study's 29 were one hot hour):** buying at the 60-s mark and selling at 5 min is **−23%** net (win 26%) — the opposite of the +34.8% the hot hour showed. The 60-s state still sorts the runner: up ≥ 5% at 60 s → +19.4% (n16, win 69%); up ≥ 20% → +36.9% (n9, 7 of 9); down below 0.95 at 60 s → **−38.9% (n12, 1 of 12 won, 83% stopped)**. A conditional exit — sell at 60 s if the coin is below 0.95, otherwise the runner — would have made −4.2% instead of −7.0% on these 35. Bought-more-than-sold by 60 s → +11.7% (n17) vs the rest −25%; pre-trigger buyers cashing out ≥ $2K by 60 s was *not* bad (n9, +11.7%). Creator selling by 60 s: 0 rows again. All of this is 35 trades.

**Time of day (A passed, runner, UK hour):** 20:00–23:59 UK +4.6% to +9.9% in all four hours (n29) and 01:00 +15.7% (n11), with 00:00 the exception (−15.5%, n9); 14:00–16:00 UK −20.1% and −16.1% (n8, n11). The evening band was good last night too; whether it repeats tonight is the test.

## Findings
1. **Every trigger book loses after costs, and the afternoon made A worse.** A runner −1.3% on 128 (−7.1% on the 27 since 13:28), B −5.5%, C −15.0% (39), 80-SOL −13.9% (55), D −1.3% (101, 85% the same coins as A). Established on A, B, C; D is not independent.
2. **F1 (bundle ≤ 3 wallets) is 9 for 40 out of sample at −10.1%.** In sample it is still +12.2% on 42 vs −8.0% on 86, and positive in 11 of 16 hours; the first nine out-of-sample trades are a bad afternoon for every A coin (−0.6% baseline), not a refutation yet. Hypothesis, waiting.
3. **The GMGN columns are not yet usable on the trigger books.** gi_/gs_/gh_/sm_/gm_ are filled on 4–5 of the 18 A rows since 14:45 UK; the biggest-buyer record (gw_big_*) is filled on all 18 and shows nothing good yet. On the S rows they are filled on 406 of 1,026.
4. **The $5K → $200K coins are rarer than volume suggests and half of them are one operator** (see the section below): 39 in 24 h out of 32,500 ordinary launches (0.12%), 14 of them the F3 signature. No 1-minute or 5-minute volume tell gets near a paying hit rate.
5. **F2 is dead.** The "tier-1 bundled launch" lift was 277 launches by a factory that buys the whole curve (79.3% of supply, 85 SOL, one wallet) — the +4 s "price" is the curve's completion price and the next trade is on PumpSwap at 8x; nobody can buy it. The 364 tier-1 launches that are buyable lose: −21.7% at 5 min, 0.5% at 10x, 3.5% to $200K. S8's 51 rows match the file's +4 s price on the same mints (median difference under 5%), so the price in the file is real where there is a curve trade to buy — the fault was in which coins were counted. Established (33 closed S8 trades, 0 at 5x, −19.5% at 5 min).
6. **The 150+ wallets skip is still wrong for a 5-min sell** (36 trades, +20.5%, win 64%) but fading (the last 10 about −20%). Hypothesis → F4.
7. **E sold at 5 min** is the only trigger-book exit above zero (+3.0%, 40 trades) and the owner's 1B subset is +21.5% on 9. Too few.
8. **Project S: S6 (GMGN smart wallets) is the best sniper and it is still not positive on its live rule** — 1.5x/−40% −0.3% on 91 closed, runner +4.7%, 59% reach 1.5x. The wallet-quality ordering **holds**: S6 > S7 > S2 at 91/62/150 (1.5x rate 59% / 42% / 37%; 1.5x/−40% −0.3% / −5.5% / −12.5%). Established as an ordering at these counts (a 22-point gap on 91 vs 150); not established as a profit.
9. **S1 judged from 14:17 UK is 20 closed: 40% reach 1.5x (not 67%), 15% reach 5x, 1.5x/−40% −21.1%.** No take-profit or stop on the 5-s paths turns it positive (best: 5x/−40% +0.8% on 17 paths); a 1.3x take-profit makes it worse (−15% to −24%). The 67% figure was the pre-14:17 factory-creator rows.
10. **Time of day:** 20:00–midnight UK was A's good band (29 trades, all four hours positive) and 14:00–16:00 UK its worst (19 trades, about −18%). Hypothesis — found by looking at hours, and 00:00 UK (−15.5%, n9) sits in the middle of the good band.

## Selling without going live
No live leg has both a real sale and a path-stamped exit — nothing has traded live since 10:59 UK and the path columns start at 12:08 UK — so the residual (live_exit_gap minus the path gap) still cannot be measured; one line, as promised. From the paths alone, on A's 21 runner fires: the path 10 s after the fire averages +9.8% against the paper +5.6% (the fire is often on a down-tick that recovers), so the realistic runner on the traced coins is +0.3% net, and 42% of fires were on a falling tick. The 5-min sell priced the same way is −12.1% (24 fires), the 3-min −6.5%. The measured live costs stand: entries +1.8% median, timed sells −1.2% to −2.2%, floors −6%, stops −5.5% (B) to −8.8% (A). Shadow legs since 13:28 confirm the stop problem: A's 15 shadow stops cost −1.43 SOL against −1.27 paper (−3.6% exit gap), D's 11 stops −9.5% below paper, G's 4 stops −16.9%.

## The $5K → $200K question
The owner suspects volume. The file says volume is a *consequence* that arrives with the move, not a tell that precedes it, and that the coins which do the move are mostly not organic.

**The population.** Of 45,088 launches, 39,644 have a +4 s price. 6,684 of those have a nonsense +4 s MC of $44K–$75K with no trades at all (placeholder rows with no trades; they should be dropped from any base rate), and 285 are one factory (below). On the remaining **32,555 ordinary launches, 39 peaked at ≥ $200K: 0.12%.** Including every row the count is 351, which is why the file looked hopeful.

**Two operators account for most of the $200K peaks.**
- *The full-curve factory* (bundle 79.31% of supply, 85.01 SOL, one wallet, dev buy 85 SOL — names like "MrBeast", "Starbucks", "Google AI", "Anthropic | Official AI Team"): 237–285 launches in 24 h, ~10 an hour, **100% to $200K, 100% graduated**. The +4 s MC of $43K is the curve's completion price; the first trade after that is on PumpSwap at a median $368K (60 s), $414K (5 min), $449K (15 min), $137K (30 min), $55K (60 min). It cannot be bought on the curve. Bought on PumpSwap at the 60-s price and sold at 5 min: −15% net (225, win 48%); at 15 min −38%. The A/C/D/E books caught 3 of them later and lost. This is F2's "lift" and the reason S8 (which buys the curve) saw none of it.
- *The 10-wallet factory* (bundle 37–41% over exactly 10 wallets, 22–27 SOL, dev buy 0.03–0.10 SOL, no socials, creator's first launch — "The French Lord", "French Piccolo", "Keyboard Cat", "startupSI"): **14 launches, 14 to $200K+, 14 graduated**; +4 s MC median $11K; 60-s MC $160K–$500K (13 of 14 have the mark; 15–45x, median 19.5x); 5-min 16–24x on the 9 with a mark; 15-min median 34x; by 60 min 0.4x–34x. Our books only met them at 60 s and later (C at $160–250K: 4 of 9 reached 1.5x; A after 26+ min: mixed). This is **F3**. Whether the +4 s price exists for an outsider is the whole question — the bundle's own ten wallets may be what pushes it through the curve in the first seconds.

**The 25 organic winners** (entry median $6.3K; bundle median 25%; dev buy median 1 SOL; 81% had socials; 52% a first launch; 40% had 5+ scored early buyers in 60 s; 0 had a proven wallet in 60 s). At 60 s they were at a median **$11K MC with 103 buyers** (quartiles $6K–$25K, 36–215 buyers); at 5 min **$65K with 350 buyers** ($20K–$99K, 178–859); at 15 min $123K (52% still have the mark); 30 min $119K; 60 min $76K (28% have the mark). So the organic winner is at $5–25K after a minute, $20–100K after five, and most of the money is made between minute 1 and minute 15.

**Lifts (ordinary launches, 25 organic winners; lift = share of winners with the tell ÷ share of all launches with it; the buy is at that moment, 10% round trip; a missing later mark is counted as a total loss, which is harsh — "alive" figures are given where it matters):**

| tell | n | lift | P($200K) | sold at 5 min: 2x / 10x / net / win | at 15 min | at 60 min |
|---|---|---|---|---|---|---|
| **at launch (+4 s)** | | | | | | |
| all ordinary launches | 32,541 | 1.0 | 0.08% | 3.0% / 0.2% / −42% / 7% | −58% | −81% |
| bundle ≥ 30% | 1,573 | 6.6 | 0.5% | 3.9% / 0.2% / −42% / 8% | −61% | −85% |
| bundle < 5% | 22,229 | 0.3 | 0.04% | 3.4% / 0.3% / −43% | −58% | −80% |
| dev buy > 3 SOL | 2,543 | 4.1 | 0.3% | 2.6% / 0.2% / −42% | −60% | −82% |
| dev buy = 0 | 9,907 | 0.5 | 0.04% | 0.6% / 0 / −60% | −72% | −89% |
| socials | 3,582 | 6.2 | 0.5% | 5.1% / 0.3% / −33% / 11% | −53% | −82% |
| copycat of a ≥ $300K coin | 333 | 3.9 | 0.3% | 6.9% / 0 / −30% / 14% | −41% | −59% |
| creator's prior graduations ≥ 1 | 6,692 | 1.4 | 0.1% | 6.0% / 0.5% / −36% / 14% | −52% | −77% |
| S1's creator rule | 79 | 0.0 | 0% | 2.5% / 0 / −63% | −76% | −88% |
| 8–12 bundle wallets and ≥ 20 SOL | 87 | 29.9 | 2.3% | 10.3% / 0 / −21% / 20% | −57% | −93% |
| **F3 signature** (10 wallets, 37–41%, 22–27 SOL, dev < 0.2) | 14 | ~830 | **100%** | sold at 60 s: 13 of 14 marked, 15–45x; at 5 min 16–24x (9 marked) | 18–60x (7) | 0.4–34x (5) |
| entry MC ≥ $8K | 657 | 19.8 | 1.5% | 6.2% / 0.2% / −46% / 15% | −62% | −89% |
| **at 60 s (buy at the 1-min price)** | | | | | | |
| 20+ buyers | 4,760 | 4.9 | 0.4% | 2.4% / 0 / −32% / 8% | −52% | −80% |
| 100+ buyers | 893 | 16.0 | 1.2% | 6.0% / 0.1% / −34% / 16% | −57% | −85% |
| MC ≥ $15K | 374 | 34.8 | 2.7% | 7.5% / 0.3% / −29% / 16% | −49% | −81% |
| MC ≥ $15K and 30+ buyers (the 13:28 rule) | 166 | 78.4 | 6.0% | 13.9% / 0.6% / −23% (alive −6%) / 26% | −48% (alive −14%) | −88% (alive −57%) |
| MC ≥ $30K | 87 | 59.8 | 4.6% | 4.6% / 0 / −34% / 9% | −55% | −79% |
| tripled by 60 s and 50+ buyers | 76 | 102.8 | 7.9% | 9.2% / 1.3% / −28% / 18% | −56% | −92% |
| $20K+ traded in the first minute | 358 | 21.8 | 1.7% | 7.0% / 0 / −32% / 17% | −57% | −84% |
| 5+ scored early buyers (wb_60s_n ≥ 5) | 593 | 22.0 | 1.7% | 15.7% / 0 / **−0.8%** / 33% | −23% | −68% |
| ≥ 15 SOL from scored early buyers (wb_60s_sol ≥ 15) | 552 | 23.6 | 1.8% | 15.9% / 0 / **+0.9%** / 33% | −23% | −68% |
| a proven wallet in the first 60 s | 196 | 0.0 | 0% | 8.7% / 0.5% / −26% / 18% | −34% | −80% |
| **at 5 min (buy at the 5-min price)** | | | | | | |
| 100+ buyers | 1,093 | 17.9 | 1.4% | at 15 min: 2.7% / 0 / −38% / 7% | 30 min −57% | −76% |
| 300+ buyers | 246 | 52.9 | 4.1% | 6.1% / 0 / −38% / 14% | −58% | −81% |
| MC ≥ $30K | 129 | 100.9 | 7.8% | 1.6% / 0 / −38% / 13% | −54% | −72% |
| MC ≥ $50K | 48 | 271 | 20.8% | 2.1% / 0 / −23% / 21% | −42% | −66% |
| MC ≥ $50K and 300+ buyers | 16 | 570 | 43.8% | 6.2% / 0 / −33% / 38% | −67% | −92% |
| doubled from 1 min to 5 min and MC ≥ $20K | 118 | 121 | 9.3% | 3.4% / 0 / −39% / 14% | −56% | −73% |
| 200+ new buyers between 1 and 5 min | 169 | 77 | 5.9% | 5.9% / 0 / −41% / 15% | −65% | −85% |

**Plain answer.** No launch-time tell on an ordinary launch reaches a paying hit rate: the best organic one (8–12 bundle wallets with 20+ SOL) is 2.3% to $200K and 0% to 10x at 5 min. At one minute, the tells with the biggest lifts (MC ≥ $15K with 30+ buyers; tripled with 50+ buyers) pick coins of which 6–8% go on to $200K, but a buy at that moment is already **10–30x above the launch price**, so the 10x from *there* happens 0.3–1.3% of the time and the 5-min sale nets −23% to −28% (−6% counting only coins that still had a 5-min mark). The owner's bar — ~8–10% at 10x from the entry — is not reached by any 1-minute or 5-minute tell; the closest thing to break-even is "15+ SOL from scored early buyers in 60 s, sell at 5 min" (+0.9%, n552, 16% reach 2x) and it dies by 15 min. **The move does not resume later for the 13:28 rule:** from its 1-min entry the 5-min mark is 0.63x (alive), 15-min 0.23x, 60-min 0.20x; 14% doubled by 5 min and 1% by 60 min, although 39% graduated and 6% reached $200K. Coins at $30–60K at 5 min reach $200K 0.8% of the time (n121); at $60–100K, 26% (n23); at $100–200K, 55% (n22) — by the time the state says "winner", the price already says $100K. The pick only exists at launch, and at launch the only thing that predicts $200K is the operator — F3's 14 and the full-curve factory's 285 — not volume.

**What the S8 rows say about the file's +4 s price:** on the 39 S8 mints also in launches.csv, S8's entry MC and the file's entry_mc agree on most mints (median difference a few percent; a handful differ by a second's worth of curve), and S8's t60_x matches the file's x60. The file's price is real where there is a curve trade at +4 s; it is unreachable where the create block has already finished the curve. That is the test the owner asked for, and it clears the file and sinks F2 at the same time.

## Project S — snipers
10% round trip; closed rows; hit rates from peak_mult; exits are the paper columns.

| book | n (closed) | first row UK | entry MC · delay | 1.5x · 2x · 5x · 10x | 1.5x/−40% | 2x/−40% | runner | 3-min | 5-min | at 5 min ≤ 0.3x |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 dev record (all) | 53 (43) | 13:02 | $3.6K · 1 s | 56 · 30 · 14 · 5% | −10.5% | −17.2% | −19.5% | −10.1% | −6.5% | 41% |
| **S1 from 14:17** | 29 (20) | 14:17 | — | **40 · 30 · 15%** | **−21.1%** | — | −16.9% | — | −0.6% | — |
| S2 proven wallet | 233 (150) | 13:02 | $3.5K · 12 s | 37 · 18 · 1 · 1% | −12.5% | −17.2% | −16.3% | −20.0% | −20.6% | 18% |
| S3 copycat | 47 (29) | 13:08 | $3.2K · 1 s | 48 · 38 · 17 · 0% | −13.2% | −12.6% | +10.2% | +0.3% | −5.1% | 33% |
| S4 clean launch | 24 (17) | 13:10 | $4.1K · 7 s | 35 · 18 · 0 · 0% | −5.0% | +1.4% | +1.4% | +10.2% | +2.0% | 0% |
| S5 20-s inflow | 275 (179) | 13:02 | $6.4K · 7 s | 42 · 21 · 3 · 0% | −13.1% | −15.7% | −11.3% | −9.8% | −10.2% | 5% |
| S6 GMGN smart wallet | 178 (91) | 13:45 | $5.1K · 6 s | **59 · 33 · 2 · 0%** | **−0.3%** | −0.3% | **+4.7%** | −4.3% | −6.8% | 2% |
| S7 GMGN feed | 133 (62) | 13:44 | $5.4K · 13 s | 42 · 21 · 3 · 0% | −5.5% | −9.3% | −7.9% | −8.4% | −12.5% | 2% |
| S8 bundled launch | 51 (33) | 13:47 | $9.9K · 5 s | 48 · 27 · 0 · 0% | −11.9% | −12.0% | −10.5% | −14.8% | −19.5% | 24% |
| S9 swarm dip | 32 (13) | 15:56 | $6.6K · 60 s | 31 · 15 · 0 · 0% | −8.5% | −5.8% | −1.9% | −14.2% | −9.7% | 8% |

**S1 (judged from 14:17 UK): 20 closed, 40% reach 1.5x, 15% reach 5x, and nothing on the 5-s paths saves the 1.5x/−40% rule.** On the 17 closed rows with a path: 1.3x/−40% −23.8%, 1.3x/−30% −17.9%, 1.3x/−25% −15.0%, 1.5x/−25% −8.7%, 1.5x/−30% −11.6%, 2x/−30% −9.5%, 3x/−30% −0.5%, **5x/−40% +0.8%** (2 of 17), sell at 60 s −31.6%, at 5 min −54.4%. A tighter stop helps (−25% beats −40% by 9 points) and a lower take-profit hurts, because S1's coins either go to 3x+ or die: the median 5-min multiple is 0.49 and 41% are under 0.3x at 5 min. The owner's "67% reach 1.5x" was the pre-14:17 factory-creator rows. S1 is a lottery book; with 15% at 5x it would need the 5x take-profit and a 40%+ stop to be flat. 20 trades.

**S6 vs S7 vs S2 — does GMGN smart > feed > our proven hold at 40+?** Yes, at 91 / 62 / 150 closed: 1.5x reached 59% / 42% / 37%, 2x 33% / 21% / 18%, 1.5x/−40% −0.3% / −5.5% / −12.5%, runner +4.7% / −7.9% / −16.3%. A 22-point gap in the 1.5x rate between S6 and S2 on these counts is real; S6 vs S7 (17 points, 91 vs 62) is likely. None of the three is positive on its 1.5x/−40% rule; S6's runner is +4.7% (win 48%). Inside S6: entry within 5 s +3.7% (n31) and after 15 s +4.6% (n24) beat 5–15 s −7.0% (n29) — noise; entry MC under $4K **+14.0%** (n17) and $4–6K +1.0% (n38) beat $6K+ −9.5% / −6.2% (n36) — the cheaper the entry the better, 17 trades. Inside S2 the wallet's 5x rate does not order the result (0.6–0.7 best at 59% reaching 1.5x, n27; 0.7+ worst at 17%, n23) — our scoring is not measuring what we hoped. S7's feed lag is under 10 s on 60 of 62, so the feed is fast enough; the coins are not good enough.

**S8 vs the launches file:** S8 is the F2 test and it fails it — 33 closed, **0 at 5x, 48% at 1.5x, 5-min −19.5%, 24% dead (≤ 0.3x) by 5 min.** The file's 16%-at-10x was the full-curve factory S8 never bought (there is no curve trade to buy). The tier-1 coins S8 does buy are the file's 364 buyable tier-1 launches, and those lose in the file too (−21.7% at 5 min).

**S9 swarm dip** (20+ outside wallets ≥ 0.3 SOL in 60 s, bundle < 20%, bought at +60 s, sold at 5 min): 13 closed, 31% reach 1.5x, 5-min −9.7%, 24 shadow legs −0.229 SOL (10 "no exit signal in 7 min"). Too early; the launches file's equivalent (100+ buyers at 60 s, buy at 1 min, sell at 5 min) is −34% on 893, so the prior is against it.

**S3 copycat** is the one sniper whose runner is positive (+10.2% on 29, 40% trail +18.4%) — carried by a handful of coins at 3x+ (24% reach 3x); the 1.5x/−40% rule loses −13.2%. **S4 clean launch** is +1.4% to +10.2% on 17 — too few, and the file says clean launches die (bundle < 5%: 0.04% to $200K).

**Clustering:** per UK hour, the S books' 1.5x/−40% net is negative in 29 of 33 book-hours with 5+ trades; S6 is −11%, −1%, +12%, −1% across its four hours. No S book has had a winning *day*; S6 has had one winning hour.

**What a ninth book should be:** F3 — the 10-wallet operator's signature, bought on the first curve trade after the create block (the bundle is known from +4 s; the signature needs bundle_wallets, bundle_pct and bundle_sol, all known then), sold at 60 s or 5 min, with a hard stop at −40%. It is 14 for 14 to $200K at a base rate of 0.12%, which is a stronger claim than any S book has made; it is also one operator who can stop tomorrow, and the open question is the fill. S8's threshold (40–79%) misses it by one point of bundle share; a paper S10 with the exact signature would answer the fill question in a day at ~14 launches a day. Second choice: S6 with a $6K entry-MC cap and the runner exit (+14.0% on 17; hypothesis).

## Money management
A's runner, 128 passed trades in order, cost model with stops at the live −8.8% and rugs at −100%: net −1.8% a trade at 0.1 SOL (−0.230 SOL total, max drawdown 0.589 SOL, worst losing streak 5); at 0.05 SOL −5.3% (fees bite), at 0.25 SOL +0.3% (+0.105 SOL, drawdown 1.086 SOL — two-thirds of a 1.5 SOL wallet). Study.mjs's own cost model: −1.1% a trade, drawdown 5.3 stakes, 12% of coins went to ≤ 0.2x (31 traced rows: 8.5%), 2% to ≤ 0.05x, Kelly −2.7%. On the gross-of-fees shape (win 53%, average win +48%, average loss −39%) Kelly is 15% and half-Kelly on 1.5 SOL is 0.115 SOL — but that is before the fees that turn the book negative, so the honest stake for A as it stands is **zero**. A daily stop of −0.3 SOL at 0.1 stake would not have helped (−0.244 vs −0.230): the losses are spread, not clustered in one day. For the S books the question does not arise: the best of them is −0.3% a trade on its rule.

## Project F
**F2 — verdict: does not hold up (artefact).** The 13:28 study's tier-1 bundled-launch rule was 277 launches by one full-curve factory (79.3% of supply, 85 SOL, one wallet; unreachable at +4 s) plus 364 buyable tier-1 launches that lose (−21.7% at 5 min, 0.5% at 10x). S8 is the live test: 0 for 33 at 5x. Closed.

**F3 — the 10-wallet operator (new, registered, launch-time).** Create block: exactly 10 bundle wallets, 37–41% of supply, 22–27 SOL; creator's own buy under 0.2 SOL; no socials; first launch by the creator. 14 launches in 24 h (18 Oct 17:21 → 19 Oct 11:23 UK; about 14 a day, most of them between 17:00 and 02:00 UK): 14 to $200K+, 14 graduated; +4 s MC median $11K, 60-s MC 15–45x that (13 marked), 5-min 16–24x (9 marked), 15-min 18–60x (7), 60-min 0.4–34x (5). Against: a base rate of 0.12%; the file's own figures for the wider shape (8–12 wallets, 20+ SOL: 2.3% to $200K on 87) say the exactness matters, which is what you expect of one bot. What would make it a book: a paper S10 with the exact signature, buying on the first outside trade after the create block (S8's mechanism, threshold 37% instead of 40%), sold at 60 s and at 5 min as two paper legs, 0 SOL. If 10 of the next 20 launches show a buyable +4 s price and a 5x at 60 s, it is the first positive book in the project; if the first outside trade is already at 10x, the operator is front-running its own curve and the book is dead. Nothing else in the file comes within a factor of 50 of it.

**F4 — G's coins, sold at 5 min (new, registered).** A's trigger on 150–500-wallet coins (the website skips them), 5-min sell: 36 trades +20.5% net, win 64%, vs the runner −1.4% and G's shadow runner −0.327 SOL on 7. Fading (the last 10 about −20%). Hypothesis; cheap to test by giving G the 5-min exit in shadow.

Not registered: a 60-s conditional exit for A (sell at 60 s if below 0.95; −4.2% vs −7.0% on 35 traced trades — still negative); "15+ SOL from scored early buyers in 60 s, buy at 1 min, sell at 5 min" (+0.9% on 552 launches; break-even is not a book); S6 with entry MC < $6K (17 trades).

## Strategy register
| id | rule | out of sample | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −8.9% (37) vs baseline −8.9% | waiting 37/40 — heading for "does not hold up" |
| S2 | A, wal60 ≤ 65, runner | −18.3% (16) vs −6.7% (37) | waiting 16/40, behind the baseline |
| S3 | A, max_share > 0.1, runner | −12.7% (18) vs −6.7% (37) | waiting 18/40, behind the baseline |
| F1 | A, bundle_wallets ≤ 3, runner | −10.1% (9) vs −6.8% (27) | waiting 9/40 |
| F2 | launch-time: tier-1 bundled launch, +4 s, 5 min | by hand: S8 0 for 33 at 5x; buyable tier-1 launches −21.7% | **does not hold up — artefact** |
| S4 | E, sell at 5 min | −15.8% (9) | waiting 9/40 |
| F3 (new) | launch-time: the 10-wallet operator's signature, +4 s, sell at 60 s / 5 min — by hand from launches.csv | — | waiting 0/40 (judge from 20) |
| F4 (new) | G's coins (A's trigger, 150–500 wallets), sell at 5 min — by hand from A rows with skip_why = N wallets | — | waiting 0/40 |

No existing rule was edited. Every rule proposed before 13:28 is below its baseline out of sample so far — the afternoon of 19 Oct was bad for every A coin, so none is refuted yet, but none is confirmed either.

## What I would do now
Nothing here changes the bot; the owner decides on the page.
- **Keep A, B, C, D, 80 off.** Every one is negative after costs on 39–128 trades; the afternoon added −7.1% a trade to A. No stake is justified; the Kelly answer is zero.
- **Add paper S10 = F3** (10 bundle wallets, 37–41%, 22–27 SOL, dev < 0.2 SOL; buy on the first outside curve trade; paper legs at 60 s and 5 min; stop −40%). Cost: nothing. This is the one thing in 24 h of launches that predicts the $5K → $200K coin, and a day of paper rows tells us whether it can be bought. Alternatively lower S8's bundle floor to 37% and read its rows by signature.
- **Give G the 5-min exit in shadow (F4)** instead of the runner; 0.05 SOL shadow, no SOL. Cost: nothing.
- **Check the F book** — it has no legs in the file at all (legF_* empty on all 298 A rows) although status.json shows it on in shadow.
- **Project S:** keep all nine on paper; do not move any to live. S6 is the best and is −0.3% on its rule; S6 with entry MC under $6K and the runner is worth a paper variant (17 trades, +14.0%). S1 stays a lottery (15% at 5x); if it is kept, the only exit that is not negative is 5x/−40%. S2, S5, S7, S8 have 51–233 rows each and lose under every exit — S8 can be retired (F2 is dead) unless it is repointed at F3.
- **If one live leg is wanted for the path calibration**, it should be E's 5-min sell (the only trigger exit above zero, +3.0% on 40) at 0.05 SOL with a −0.2 SOL daily stop — expected cost about 0.03 SOL in fees per 10 legs, and 40 E trades take about a day. I would still wait for the evening band (20:00–midnight UK) before doing it.

## Next
F3 on the launches created after 17:04 UK (does the operator keep launching, and is the +4 s price buyable — S8-style rows if the threshold is lowered); F1 and S1–S3 reaching 40 out of sample (all four are below baseline); F4 on the next G coins; whether the GMGN gi_/gs_/gh_/sm_ columns fill on A rows (5 of 18 today); why legF_* is empty; the 20:00–midnight UK band for A tonight (third night); S6's entry-MC split at 40+ a side; the first live-leg-plus-path rows if any leg goes live.
