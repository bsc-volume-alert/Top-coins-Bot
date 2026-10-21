# Diagnosis — DS
_Data to 21 Oct 01:42 UK; D + standard filters; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 70 | +8.8% | +4.9% | +7.2% | 56% | 29% | 31.5 | +0.245 | +0.54 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 70 | +9.2% | +8.8% | 66% | +4.9% | +15.0% | +7.9% | +11.6% |
| x_flow4 (current) | 70 | +8.8% | +4.9% | 56% | +1.9% | +26.7% | -1.9% | +5.2% |
| x_flow4ff | 70 | +3.7% | +1.8% | 49% | +1.4% | +10.8% | -0.9% | +2.9% |
| x_h5f14 | 70 | +2.7% | +1.0% | 61% | -2.7% | +8.5% | +2.6% | +7.0% |
| x_t2s40 | 70 | +1.3% | +0.0% | 39% | -2.2% | +14.5% | -8.4% | -2.7% |
| x_h15 | 70 | +4.9% | -0.9% | 66% | -5.2% | +9.1% | +11.3% | +12.3% |
| x_h3 | 70 | +0.0% | -1.4% | 54% | -2.1% | +7.9% | -5.6% | -2.2% |
| x_h5 | 70 | -2.3% | -4.1% | 61% | -7.6% | +2.9% | -2.2% | +2.2% |
| x_h2t40 | 70 | -3.5% | -6.1% | 39% | -8.4% | +7.1% | -8.9% | -4.8% |
| x_tsl40 | 70 | -2.8% | -6.6% | 30% | -11.0% | +3.0% | +0.0% | +3.7% |
| x_split | 70 | -4.7% | -8.7% | 34% | -17.4% | -0.5% | +4.5% | +7.7% |
| x_time | 70 | -29.5% | -34.1% | 26% | -35.5% | -20.0% | -32.8% | -32.2% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 11 | 16% | +99.5% | 4.61e+04 | 208 | 39.5 | 5 | 0.0988 | 1.86e-16 | 50.6 | 102 | 45.7 | 0.064 | 224 | 26.4 | 1 | 11 | 4 | 12 | 2.68 | 1.05 |
| winners (0 to +50%) | 28 | 40% | +26.4% | 4.94e+04 | 525 | 29.1 | 4 | 1 | 2.24e-15 | 50.8 | 86.5 | 42.7 | 0.0875 | 271 | 24.9 | 1 | 6 | 2 | 9.5 | 2.01 | 1.04 |
| small losers (-35% to 0) | 11 | 16% | -16.6% | 5.37e+04 | 405 | 37.8 | 5 | 0.294 | 2.75 | 50.8 | 78 | 39.5 | 0.083 | 134 | 21.3 | 1 | 14 | 4 | 15 | 1.8 | 0.979 |
| stopped (<= -35%) | 20 | 29% | -51.9% | 4.78e+04 | 616 | 27.3 | 4.5 | 0.988 | 0 | 50.5 | 93 | 46.3 | 0.084 | 227 | 23.8 | 1 | 10 | 4.5 | 18 | 1.18 | 0.988 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.94e+04, age_s 172, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 50.2, wal60 66, sell60 34.6, max_share 0.081, holders_entry 224, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.12
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +94.8% — entry_mc 5.8e+04, age_s 71, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 50.3, wal60 70, sell60 36.7, max_share 0.064, holders_entry 222, top10_entry 10.6, has_socials 1, peak_mult 2.38, fs10_x 0.97
- 20 Oct 02:01 UK **little rocket man** +83.6% — entry_mc 5.31e+04, age_s 70, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, sol60 51.3, wal60 93, sell60 41.7, max_share 0.08, holders_entry 237, top10_entry 11.3, has_socials 1, cc_n24h 11, snipers_n 5, peak_mult 2.81, fs10_x 1.19
- 19 Oct 09:08 UK **Elon Accounts** +79.9% — entry_mc 4.87e+04, age_s 1.75e+04, bundle_pct 1.74, bundle_wallets 2, dev_buy_sol 0.198, sol60 50.2, wal60 124, sell60 45.7, max_share 0.099, top10_entry 24.6, peak_mult 1.98, fs10_x 1
- 20 Oct 06:20 UK **Forkius Maximus** +70.6% — entry_mc 4.11e+04, age_s 2.64e+03, bundle_pct 33.1, bundle_wallets 4, dev_buy_sol 1.47, sol60 70.4, wal60 132, sell60 69.8, max_share 0.064, top10_entry 26.4, has_socials 1, cc_n24h 2, snipers_n 3, peak_mult 8.12, fs10_x 1.03
- 19 Oct 13:48 UK **Wojak** +63.8% — entry_mc 3.24e+04, age_s 705, bundle_pct 29, bundle_wallets 5, dev_buy_sol 5, sol60 52.6, wal60 73, sell60 45.6, max_share 0.095, top10_entry 22.8, has_socials 1, cc_n24h 19, peak_mult 1.95, fs10_x 1.05

Worst:
- 20 Oct 22:44 UK **Shirley Coin** -57.8% — entry_mc 5.34e+04, age_s 91, bundle_pct 32.7, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, sol60 50, wal60 98, sell60 41.2, max_share 0.07, holders_entry 267, top10_entry 13.2, has_socials 1, cc_n24h 6, snipers_n 6, peak_mult 1.4, fs10_x 1.07
- 20 Oct 18:26 UK **Poke Packz** -53.1% — entry_mc 9.09e+04, age_s 1.05e+03, bundle_pct 15.2, bundle_wallets 7, dev_buy_sol 0.988, sol60 52.3, wal60 40, sell60 13.2, max_share 0.067, top10_entry 30.2, has_socials 1, cc_n24h 1, peak_mult 1.26, fs10_x 1.06
- 19 Oct 21:53 UK **ARE YOU READY?** -52.8% — entry_mc 7.19e+04, age_s 350, bundle_pct 60.9, bundle_wallets 4, dev_buy_sol 0, sol60 50, wal60 45, sell60 48, max_share 0.097, top10_entry 19.4, has_socials 1, cc_n24h 1, peak_mult 1.11, fs10_x 0.542
- 19 Oct 12:36 UK **The Supreme Leader** -52.5% — entry_mc 4.61e+04, age_s 1.3e+03, bundle_pct 17.7, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 55.6, wal60 99, sell60 54.7, max_share 0.078, holders_entry 204, top10_entry 24.1, has_socials 1, cc_n24h 10, snipers_n 4, peak_mult 1.04, fs10_x 0.939
- 18 Oct 20:27 UK **Jeff** -52.5% — entry_mc 6e+04, age_s 1.43e+04, bundle_pct 26.8, bundle_wallets 3, dev_buy_sol 5, sol60 50.2, wal60 59, sell60 37.2, max_share 0.099, top10_entry 24.1, has_socials 1, peak_mult 1.21, fs10_x 1.03
- 19 Oct 21:25 UK **Quinelings** -52.1% — entry_mc 4.83e+04, age_s 512, bundle_pct 30.4, bundle_wallets 1, dev_buy_sol 11.9, sol60 50.4, wal60 80, sell60 45.3, max_share 0.088, top10_entry 22.1, has_socials 1, cc_n24h 62, snipers_n 0, peak_mult 1.61, fs10_x 0.872
- 20 Oct 23:55 UK **Mugshot Cat** -52.1% — entry_mc 6.29e+04, age_s 106, bundle_pct 29.3, bundle_wallets 6, dev_buy_sol 0.988, dev_hold_entry 9.31e-17, sol60 50.8, wal60 89, sell60 33.6, max_share 0.098, holders_entry 261, top10_entry 16.3, has_socials 1, cc_n24h 10, snipers_n 5, peak_mult 1.24, fs10_x 1.07
- 19 Oct 01:13 UK **Teddy The Squirrel** -51.6% — entry_mc 4.99e+04, age_s 379, bundle_pct 27.8, bundle_wallets 5, dev_buy_sol 3.95, sol60 51.3, wal60 93, sell60 44.3, max_share 0.077, top10_entry 22.2, has_socials 1, peak_mult 1.28, fs10_x 0.933

## 5. Factor search (strict test) and luck check
1197 cuts tried on 123 entry-time columns; 43 pass the strict test, 28 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| n60 >= 129 | 18 | +36.5% | +30.9% | 52 at -0.8% | +35.4% / +71.5% / +25.7% | +0.288 | 5 |
| wal60 >= 102.8 | 18 | +30.7% | +25.5% | 52 at +1.2% | +35.4% / +60.6% / +12.3% | +0.241 | 6 |
| dev_hold_entry >= 2.561e-16 | 18 | +39.0% | +25.0% | 52 at -1.7% | +19.9% / +72.0% / +25.1% | +0.308 | 6 |
| bundle_pct >= 33.74 | 25 | +30.4% | +20.1% | 45 at -3.2% | +6.8% / +56.6% / +19.7% | +0.331 | 10 |
| age_s < 220.7 | 25 | +29.1% | +18.8% | 45 at -2.5% | +22.7% / +61.6% / +1.6% | +0.317 | 13 |
| top10_entry >= 30.72 | 11 | +41.9% | +18.4% | 59 at +2.6% | +13.4% / +92.6% / +12.5% | +0.203 | 13 |
| entry_mc < 4.611e+04 | 25 | +21.5% | +16.9% | 45 at +1.7% | +11.2% / +40.5% / +18.6% | +0.231 | 17 |
| avg_buy_sol < 0.4157 | 18 | +22.3% | +16.6% | 52 at +4.1% | +35.4% / +40.9% / +3.2% | +0.173 | 18 |
| holders_entry >= 211.8 | 27 | +23.4% | +13.6% | 43 at -0.4% | +9.0% / +62.8% / +0.2% | +0.272 | 20 |
| feed_lag_ms < 823.2 | 25 | +23.7% | +13.2% | 45 at +0.5% | +8.9% / +57.5% / +13.9% | +0.256 | 20 |
| hour_uk < 18 | 43 | +13.9% | +11.4% | 27 at +0.6% | +7.4% / +35.5% / -0.3% | +0.250 | 20 |
| max_share < 0.082 | 34 | +18.2% | +10.4% | 36 at -0.1% | +2.5% / +82.6% / +0.7% | +0.264 | 20 |
| largest_entry >= 3.038 | 45 | +12.9% | +7.0% | 25 at +1.3% | +4.7% / +32.8% / +5.1% | +0.242 | 20 |
| sol60 >= 50.13 | 60 | +10.2% | +5.6% | 10 at +0.5% | +3.5% / +29.2% / +0.4% | +0.248 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| dev_hold_entry >= 2.561e-16 AND bundle_pct >= 33.74 | 8 | +75.0% | +46.2% | +3.5% / +149.8% / +70.1% | +0.267 |
| age_s < 220.7 AND entry_mc < 4.611e+04 | 8 | +50.0% | +38.1% | +31.2% / +91.1% / +38.8% | +0.177 |
| dev_hold_entry >= 2.561e-16 AND age_s < 220.7 | 9 | +61.5% | +34.6% | +20.3% / +130.2% / +40.6% | +0.245 |
| bundle_pct >= 33.74 AND age_s < 220.7 | 15 | +46.3% | +29.9% | +15.7% / +84.1% / +25.4% | +0.306 |
| n60 >= 129 AND avg_buy_sol < 0.4157 | 16 | +31.5% | +25.7% | +35.4% / +71.5% / +11.0% | +0.220 |
| n60 >= 129 AND entry_mc < 4.611e+04 | 14 | +33.2% | +25.5% | +17.2% / +91.1% / +25.7% | +0.203 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:27 UK–19 02:33 UK: 14 at -0.7% · 19 03:07 UK–19 15:41 UK: 14 at +19.1% · 19 15:53 UK–20 00:20 UK: 14 at +18.5% · 20 00:51 UK–20 13:46 UK: 14 at +11.3% · 20 18:09 UK–21 00:58 UK: 14 at -4.3%
