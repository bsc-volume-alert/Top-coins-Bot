# Diagnosis — B
_Data to 21 Oct 01:42 UK; A's coins sold at 5 min; exit x_h5; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 331 | -6.1% | -6.8% | -2.6% | 48% | 36% | 149.1 | -1.052 | -2.34 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 331 | -3.5% | -3.7% | 51% | -1.7% | -6.2% | -2.7% | -2.4% |
| x_flow4 | 331 | -3.8% | -4.7% | 47% | -2.7% | -5.1% | -3.6% | -3.9% |
| x_t2s40 | 331 | -4.6% | -4.9% | 35% | -5.1% | -2.4% | -6.4% | -3.9% |
| x_flow4ff | 331 | -5.3% | -5.7% | 41% | -3.2% | -10.0% | -2.8% | -5.2% |
| x_h3 | 331 | -5.3% | -6.1% | 46% | -5.1% | -9.7% | -1.2% | -4.0% |
| x_split | 331 | -5.3% | -6.1% | 32% | -12.3% | -2.6% | -0.8% | -1.2% |
| x_h5f14 | 331 | -6.0% | -6.7% | 48% | -3.9% | -10.9% | -3.3% | -4.3% |
| x_h5 (current) | 331 | -6.1% | -6.8% | 48% | -6.6% | -6.8% | -4.7% | -5.4% |
| x_tsl40 | 331 | -6.4% | -7.7% | 27% | -11.3% | -3.7% | -4.1% | -2.7% |
| x_h15 | 327 | -7.4% | -8.6% | 50% | -8.7% | -5.2% | -8.3% | -5.7% |
| x_h2t40 | 331 | -7.9% | -8.7% | 35% | -11.3% | -4.3% | -8.1% | -5.4% |
| x_time | 331 | -25.3% | -27.7% | 24% | -22.5% | -26.2% | -27.1% | -23.6% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 21 | 6% | +110.6% | 4.46e+04 | 1.25e+03 | 25.1 | 5 | 0.988 | 0.221 | 33.5 | 68 | 29 | 0.167 | 268 | 25.9 | 1 | 4 | 4 | 18 | 3.25 | 1.09 |
| winners (0 to +50%) | 138 | 42% | +18.5% | 4.62e+04 | 585 | 29 | 4 | 0.988 | 0 | 31.8 | 64 | 28.5 | 0.105 | 240 | 24.1 | 1 | 5 | 4 | 13.5 | 1.93 | 1.04 |
| small losers (-35% to 0) | 53 | 16% | -13.4% | 4.91e+04 | 1.6e+03 | 25.8 | 4 | 0.982 | 1.49e-15 | 30.7 | 57 | 24.3 | 0.12 | 263 | 25.4 | 1 | 4.5 | 4 | 14 | 1.27 | 0.987 |
| stopped (<= -35%) | 119 | 36% | -51.8% | 4.52e+04 | 473 | 26.2 | 5 | 1 | 0 | 33.2 | 73 | 29.9 | 0.101 | 237 | 24.1 | 1 | 6 | 3.5 | 14 | 1.18 | 0.963 |

## 4. Best 8 and worst 8 trades
- 20 Oct 22:58 UK **WIPD** +227.0% — entry_mc 5.43e+04, age_s 570, bundle_pct 9.06, bundle_wallets 2, dev_buy_sol 2.17, dev_hold_entry 7.25, sol60 30.2, wal60 39, sell60 20.9, max_share 0.298, holders_entry 154, top10_entry 27.7, has_socials 1, cc_n24h 5, snipers_n 1, peak_mult 6.49, fs10_x 0.754
- 20 Oct 00:11 UK **PackPump** +226.5% — entry_mc 6.93e+04, age_s 9.08e+03, bundle_pct 6.94, bundle_wallets 2, dev_buy_sol 0.0988, sol60 50.7, wal60 35, sell60 18.9, max_share 0.493, top10_entry 24.1, has_socials 1, cc_n24h 3, peak_mult 3.77, fs10_x 1.37
- 20 Oct 10:38 UK **trial trading** +175.1% — entry_mc 4.14e+04, age_s 1.69e+03, bundle_pct 30.7, bundle_wallets 5, dev_buy_sol 1.01, sol60 33.5, wal60 53, sell60 30, max_share 0.295, top10_entry 22.3, has_socials 0, cc_n24h 4, snipers_n 4, peak_mult 3.79, fs10_x 0.854
- 19 Oct 23:35 UK **FrunkStore** +157.1% — entry_mc 5.36e+04, age_s 7.38e+04, bundle_pct 1, bundle_wallets 1, dev_buy_sol 0.282, sol60 30.2, wal60 42, sell60 20.3, max_share 0.25, top10_entry 28.7, has_socials 0, cc_n24h 14, peak_mult 6.76, fs10_x 0.994
- 19 Oct 01:58 UK **The Bee** +135.2% — entry_mc 4.88e+04, age_s 1.02e+03, bundle_pct 25.8, bundle_wallets 7, dev_buy_sol 2.96, sol60 30.1, wal60 52, sell60 26.1, max_share 0.314, top10_entry 24.5, has_socials 1, peak_mult 3.31, fs10_x 1.08
- 19 Oct 16:39 UK **Octo** +126.5% — entry_mc 4.15e+04, age_s 2.17e+03, bundle_pct 34.8, bundle_wallets 8, dev_buy_sol 4.89, sol60 35.1, wal60 69, sell60 34.4, max_share 0.127, top10_entry 21.8, has_socials 1, cc_n24h 3, peak_mult 3.52, fs10_x 1.15
- 18 Oct 23:35 UK **Ultraviolet** +122.0% — entry_mc 4.23e+04, age_s 1.25e+03, bundle_pct 13.2, bundle_wallets 2, dev_buy_sol 0.247, dev_hold_entry 0, sol60 35, wal60 73, sell60 34.8, max_share 0.17, holders_entry 281, top10_entry 27.2, has_socials 1, peak_mult 2.72, fs10_x 1.23
- 19 Oct 03:29 UK **Ideal Pad** +121.5% — entry_mc 4.23e+04, age_s 5.24e+03, bundle_pct 15.1, bundle_wallets 3, dev_buy_sol 2.25, sol60 42, wal60 75, sell60 34.7, max_share 0.235, top10_entry 23.4, has_socials 0, peak_mult 3.39, fs10_x 1.17

Worst:
- 20 Oct 04:34 UK **Tesla Roadster** -71.8% — entry_mc 2.93e+04, age_s 473, bundle_pct 52.4, bundle_wallets 1, dev_buy_sol 28.6, dev_hold_entry 17.3, sol60 30.5, wal60 33, sell60 4.16, max_share 0.102, holders_entry 90, top10_entry 42.5, has_socials 1, cc_n24h 11, snipers_n 0, peak_mult 1.11, fs10_x 0.36
- 20 Oct 15:44 UK **dog** -64.6% — entry_mc 1.46e+04, age_s 193, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.0288, sol60 34.6, wal60 21, sell60 29.8, max_share 0.35, holders_entry 26, top10_entry 8.27, has_socials 0, cc_n24h 12, snipers_n 0, peak_mult 1.31
- 20 Oct 22:58 UK **Omnii-1** -58.6% — entry_mc 4.62e+04, age_s 266, bundle_pct 17.9, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 30, wal60 64, sell60 28.9, max_share 0.165, holders_entry 526, top10_entry 24.9, has_socials 1, cc_n24h 11, snipers_n 3, peak_mult 1.19, fs10_x 0.973
- 19 Oct 22:58 UK **American Dream** -56.8% — entry_mc 4.83e+04, age_s 197, bundle_pct 24.1, bundle_wallets 3, dev_buy_sol 5, dev_hold_entry 0, sol60 30.3, wal60 68, sell60 27.8, max_share 0.326, holders_entry 282, top10_entry 27.9, has_socials 1, cc_n24h 32, snipers_n 2, peak_mult 1.02
- 20 Oct 22:12 UK **WIPD** -56.6% — entry_mc 4.48e+04, age_s 93, bundle_pct 6.32, bundle_wallets 1, dev_buy_sol 1.88, dev_hold_entry 6.32, sol60 66.9, wal60 136, sell60 66.4, max_share 0.075, holders_entry 179, top10_entry 27.8, has_socials 1, cc_n24h 2, snipers_n 0, peak_mult 1.07, fs10_x 0.963
- 20 Oct 22:44 UK **Shirley Coin** -56.5% — entry_mc 5.2e+04, age_s 84, bundle_pct 32.7, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, sol60 30.5, wal60 70, sell60 22.8, max_share 0.072, holders_entry 252, top10_entry 13.8, has_socials 1, cc_n24h 6, snipers_n 6, peak_mult 1.44, fs10_x 1.12
- 19 Oct 09:30 UK **carfart** -55.9% — entry_mc 4.59e+04, age_s 460, bundle_pct 24.3, bundle_wallets 5, dev_buy_sol 3.06, dev_hold_entry 0, sol60 89.2, wal60 131, sell60 88.1, max_share 0.078, holders_entry 283, top10_entry 22.8, has_socials 0, peak_mult 1.1, fs10_x 0.876
- 18 Oct 20:35 UK **Make France Great Again** -55.4% — entry_mc 6.01e+04, age_s 78, bundle_pct 29.9, bundle_wallets 4, dev_buy_sol 10.7, dev_hold_entry 0, sol60 30.3, wal60 63, sell60 12.6, max_share 0.06, holders_entry 213, top10_entry 20.5, has_socials 1, peak_mult 1.11, fs10_x 0.736

## 5. Factor search (strict test) and luck check
1327 cuts tried on 104 entry-time columns; 11 pass the strict test, 6 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| avg_buy_sol >= 0.7115 | 50 | +9.8% | +5.4% | 281 at -8.9% | +8.7% / +11.4% / +9.2% | +0.198 | 7 |
| max_share >= 0.2215 | 50 | +8.4% | +3.9% | 281 at -8.6% | +6.9% / +8.7% / +9.6% | +0.166 | 11 |
| wal60 < 48 | 81 | +5.7% | +2.9% | 250 at -9.9% | +4.1% / +9.4% / +3.8% | +0.171 | 13 |
| n60 < 53 | 78 | +5.7% | +2.8% | 253 at -9.7% | +5.1% / +10.8% / +2.2% | +0.166 | 13 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| max_share >= 0.2215 AND wal60 < 48 | 28 | +16.5% | +8.7% | +8.3% / +36.2% / +3.4% | +0.196 |
| avg_buy_sol >= 0.7115 AND n60 < 53 | 45 | +11.8% | +7.0% | +12.6% / +10.8% / +12.3% | +0.220 |
| max_share >= 0.2215 AND n60 < 53 | 28 | +14.0% | +6.1% | +8.3% / +38.0% / -1.5% | +0.164 |
| avg_buy_sol >= 0.7115 AND wal60 < 48 | 46 | +10.5% | +5.7% | +8.0% / +10.8% / +12.3% | +0.197 |
| wal60 < 48 AND n60 < 53 | 71 | +7.7% | +4.6% | +7.9% / +13.6% / +2.6% | +0.214 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:25 UK–19 05:09 UK: 67 at -3.4% · 19 05:10 UK–19 18:07 UK: 66 at -10.6% · 19 18:08 UK–20 02:49 UK: 66 at -5.8% · 20 03:03 UK–20 15:44 UK: 66 at -7.9% · 20 15:51 UK–21 00:58 UK: 66 at -2.7%
