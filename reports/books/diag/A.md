# Diagnosis — A
_Data to 21 Oct 01:42 UK; A's passed rows, runner exit; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 331 | -3.8% | -4.7% | -5.9% | 47% | 40% | 149.1 | -0.716 | -1.59 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 331 | -3.5% | -3.7% | 51% | -1.7% | -6.2% | -2.7% | -2.4% |
| x_flow4 (current) | 331 | -3.8% | -4.7% | 47% | -2.7% | -5.1% | -3.6% | -3.9% |
| x_t2s40 | 331 | -4.6% | -4.9% | 35% | -5.1% | -2.4% | -6.4% | -3.9% |
| x_flow4ff | 331 | -5.3% | -5.7% | 41% | -3.2% | -10.0% | -2.8% | -5.2% |
| x_h3 | 331 | -5.3% | -6.1% | 46% | -5.1% | -9.7% | -1.2% | -4.0% |
| x_split | 331 | -5.3% | -6.1% | 32% | -12.3% | -2.6% | -0.8% | -1.2% |
| x_h5f14 | 331 | -6.0% | -6.7% | 48% | -3.9% | -10.9% | -3.3% | -4.3% |
| x_h5 | 331 | -6.1% | -6.8% | 48% | -6.6% | -6.8% | -4.7% | -5.4% |
| x_tsl40 | 331 | -6.4% | -7.7% | 27% | -11.3% | -3.7% | -4.1% | -2.7% |
| x_h15 | 327 | -7.4% | -8.6% | 50% | -8.7% | -5.2% | -8.3% | -5.7% |
| x_h2t40 | 331 | -7.9% | -8.7% | 35% | -11.3% | -4.3% | -8.1% | -5.4% |
| x_time | 331 | -25.3% | -27.7% | 24% | -22.5% | -26.2% | -27.1% | -23.6% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 40 | 12% | +77.9% | 4.64e+04 | 1.16e+03 | 26.7 | 5 | 1.01 | 0 | 32.3 | 68 | 27.4 | 0.135 | 221 | 25.4 | 1 | 8 | 4 | 18 | 2.66 | 1.09 |
| winners (0 to +50%) | 116 | 35% | +27.3% | 4.64e+04 | 538 | 29.2 | 4 | 0.988 | 0 | 31.6 | 64.5 | 28.5 | 0.102 | 255 | 25 | 1 | 4 | 4 | 13 | 1.89 | 1.04 |
| small losers (-35% to 0) | 42 | 13% | -14.2% | 4.75e+04 | 1.94e+03 | 19.1 | 4 | 0.985 | 0 | 31 | 52.5 | 24.5 | 0.131 | 231 | 24.9 | 1 | 5 | 4 | 13 | 1.25 | 0.974 |
| stopped (<= -35%) | 133 | 40% | -52.2% | 4.56e+04 | 495 | 27.4 | 5 | 1 | 0 | 32.4 | 72 | 29.7 | 0.099 | 239 | 24.2 | 1 | 6 | 4 | 14 | 1.19 | 0.97 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.97e+04, age_s 167, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 31.2, wal60 51, sell60 14.1, max_share 0.118, holders_entry 221, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.07
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 18 Oct 23:35 UK **Ultraviolet** +110.7% — entry_mc 4.23e+04, age_s 1.25e+03, bundle_pct 13.2, bundle_wallets 2, dev_buy_sol 0.247, dev_hold_entry 0, sol60 35, wal60 73, sell60 34.8, max_share 0.17, holders_entry 281, top10_entry 27.2, has_socials 1, peak_mult 2.72, fs10_x 1.23
- 19 Oct 20:13 UK **Clerk** +101.7% — entry_mc 3.84e+04, age_s 162, bundle_pct 11.2, bundle_wallets 6, dev_buy_sol 0.14, sol60 31.8, wal60 42, sell60 18.2, max_share 0.149, top10_entry 31, has_socials 1, cc_n24h 14, peak_mult 3.22, fs10_x 1.54
- 18 Oct 21:32 UK **French Goku Hero** +99.9% — entry_mc 4.23e+04, age_s 150, bundle_pct 24.3, bundle_wallets 5, dev_buy_sol 3, dev_hold_entry 0, sol60 34.8, wal60 86, sell60 34.8, max_share 0.142, holders_entry 242, top10_entry 28.8, has_socials 1, peak_mult 2.37, fs10_x 2.01
- 19 Oct 01:58 UK **The Bee** +99.6% — entry_mc 4.88e+04, age_s 1.02e+03, bundle_pct 25.8, bundle_wallets 7, dev_buy_sol 2.96, sol60 30.1, wal60 52, sell60 26.1, max_share 0.314, top10_entry 24.5, has_socials 1, peak_mult 3.31, fs10_x 1.08
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +96.7% — entry_mc 5.74e+04, age_s 66, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 31.2, wal60 43, sell60 17.3, max_share 0.102, holders_entry 215, top10_entry 11.7, has_socials 1, peak_mult 2.4, fs10_x 1.15

Worst:
- 19 Oct 04:26 UK **SpaceXSITeslaBoringaLink** -79.5% — entry_mc 4.97e+04, age_s 250, bundle_pct 30.1, bundle_wallets 7, dev_buy_sol 5, dev_hold_entry 0, sol60 30.8, wal60 37, sell60 20.1, max_share 0.321, holders_entry 214, top10_entry 30.9, has_socials 1, peak_mult 1.54, fs10_x 0.952
- 20 Oct 04:34 UK **Tesla Roadster** -71.8% — entry_mc 2.93e+04, age_s 473, bundle_pct 52.4, bundle_wallets 1, dev_buy_sol 28.6, dev_hold_entry 17.3, sol60 30.5, wal60 33, sell60 4.16, max_share 0.102, holders_entry 90, top10_entry 42.5, has_socials 1, cc_n24h 11, snipers_n 0, peak_mult 1.11, fs10_x 0.36
- 20 Oct 15:44 UK **dog** -64.6% — entry_mc 1.46e+04, age_s 193, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.0288, sol60 34.6, wal60 21, sell60 29.8, max_share 0.35, holders_entry 26, top10_entry 8.27, has_socials 0, cc_n24h 12, snipers_n 0, peak_mult 1.31
- 19 Oct 14:17 UK **Universal Basic Income Coin** -63.6% — entry_mc 4.46e+04, age_s 3.81e+03, bundle_pct 31.7, bundle_wallets 12, dev_buy_sol 1, sol60 30.5, wal60 76, sell60 28.8, max_share 0.066, top10_entry 25.9, has_socials 0, cc_n24h 8, peak_mult 1.18, fs10_x 0.895
- 20 Oct 22:58 UK **Omnii-1** -58.6% — entry_mc 4.62e+04, age_s 266, bundle_pct 17.9, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 30, wal60 64, sell60 28.9, max_share 0.165, holders_entry 526, top10_entry 24.9, has_socials 1, cc_n24h 11, snipers_n 3, peak_mult 1.19, fs10_x 0.973
- 19 Oct 22:58 UK **American Dream** -56.8% — entry_mc 4.83e+04, age_s 197, bundle_pct 24.1, bundle_wallets 3, dev_buy_sol 5, dev_hold_entry 0, sol60 30.3, wal60 68, sell60 27.8, max_share 0.326, holders_entry 282, top10_entry 27.9, has_socials 1, cc_n24h 32, snipers_n 2, peak_mult 1.02
- 20 Oct 22:12 UK **WIPD** -56.6% — entry_mc 4.48e+04, age_s 93, bundle_pct 6.32, bundle_wallets 1, dev_buy_sol 1.88, dev_hold_entry 6.32, sol60 66.9, wal60 136, sell60 66.4, max_share 0.075, holders_entry 179, top10_entry 27.8, has_socials 1, cc_n24h 2, snipers_n 0, peak_mult 1.07, fs10_x 0.963
- 20 Oct 22:44 UK **Shirley Coin** -56.5% — entry_mc 5.2e+04, age_s 84, bundle_pct 32.7, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, sol60 30.5, wal60 70, sell60 22.8, max_share 0.072, holders_entry 252, top10_entry 13.8, has_socials 1, cc_n24h 6, snipers_n 6, peak_mult 1.44, fs10_x 1.12

## 5. Factor search (strict test) and luck check
1327 cuts tried on 104 entry-time columns; 8 pass the strict test, 23 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **1 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| sell60 < 19.57 | 50 | +16.1% | +10.8% | 281 at -7.3% | +17.2% / +23.2% / +8.9% | +0.341 | 2 |
| entry_mc >= 5.715e+04 | 50 | +11.6% | +6.2% | 281 at -6.5% | +12.8% / +13.9% / +8.2% | +0.239 | 12 |
| avg_buy_sol >= 0.7115 | 50 | +5.9% | +4.2% | 281 at -5.5% | +9.0% / -1.4% / +10.1% | +0.110 | 16 |
| wal60 < 48 | 81 | +4.7% | +3.5% | 250 at -6.6% | +9.2% / +2.6% / +2.7% | +0.135 | 20 |
| largest_entry >= 7.349 | 50 | +8.6% | +3.1% | 281 at -6.0% | +22.2% / -0.1% / +9.9% | +0.171 | 20 |
| n60 < 53 | 78 | +2.4% | +1.1% | 253 at -5.7% | +6.0% / +1.4% / +0.7% | +0.048 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| sell60 < 19.57 AND entry_mc >= 5.715e+04 | 30 | +22.8% | +14.1% | +19.4% / +44.4% / +11.9% | +0.295 |
| sell60 < 19.57 AND wal60 < 48 | 35 | +15.8% | +13.3% | +26.8% / +9.2% / +13.2% | +0.234 |
| sell60 < 19.57 AND n60 < 53 | 31 | +16.0% | +13.2% | +19.9% / +17.3% / +12.7% | +0.210 |
| entry_mc >= 5.715e+04 AND wal60 < 48 | 31 | +12.1% | +9.3% | +28.9% / -4.9% / +13.7% | +0.155 |
| entry_mc >= 5.715e+04 AND n60 < 53 | 30 | +11.7% | +8.8% | +29.4% / -4.9% / +13.7% | +0.144 |
| avg_buy_sol >= 0.7115 AND n60 < 53 | 45 | +6.6% | +4.7% | +12.8% / -4.0% / +12.2% | +0.113 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:25 UK–19 05:09 UK: 67 at +0.9% · 19 05:10 UK–19 18:07 UK: 66 at -8.6% · 19 18:08 UK–20 02:49 UK: 66 at -3.6% · 20 03:03 UK–20 15:44 UK: 66 at -7.6% · 20 15:51 UK–21 00:58 UK: 66 at -0.1%
