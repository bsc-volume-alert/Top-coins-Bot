# Diagnosis — H
_Data to 21 Oct 01:42 UK; A, top-10 holders under 23%; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 18 | +14.5% | -0.9% | +2.3% | 50% | 33% | 12.1 | +0.164 | +0.24 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 18 | +2.8% | +0.6% | 56% | -5.9% | +3.3% | +11.0% | +2.6% |
| x_flow4 (current) | 18 | +14.5% | -0.9% | 50% | -2.5% | +38.8% | +7.2% | -2.1% |
| x_h15 | 17 | +10.1% | -2.4% | 59% | +0.7% | +36.7% | -2.7% | -6.9% |
| x_t2s40 | 18 | +2.5% | -2.4% | 39% | -7.5% | +19.1% | -4.0% | -1.7% |
| x_split | 18 | +4.3% | -4.7% | 39% | +5.2% | +10.6% | -2.9% | +6.2% |
| x_h5 | 18 | +2.1% | -5.2% | 50% | +0.7% | -9.1% | +14.8% | +2.6% |
| x_flow4ff | 18 | -1.4% | -6.4% | 39% | +2.5% | -17.4% | +10.8% | -3.0% |
| x_h2t40 | 18 | +1.4% | -6.7% | 39% | -11.0% | +25.2% | -10.0% | +0.1% |
| x_h3 | 18 | -2.3% | -7.2% | 56% | -6.9% | -7.4% | +7.6% | -1.1% |
| x_tsl40 | 18 | +3.0% | -8.2% | 22% | -3.6% | +18.1% | -5.6% | +9.0% |
| x_h5f14 | 18 | -6.2% | -8.3% | 50% | -15.6% | -8.1% | +5.1% | -2.7% |
| x_time | 18 | -11.3% | -28.8% | 22% | -34.4% | +65.2% | -64.6% | -30.3% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 4 | 22% | +118.6% | 4.79e+04 | 1.01e+03 | 31.4 | 5.5 | 0.372 | 0.352 | 34 | 80.5 | 33.1 | 0.11 | 221 | 22.2 | 1 | 2.5 | 4 | 18 | 3.35 | 1.05 |
| winners (0 to +50%) | 5 | 28% | +24.8% | 4.7e+04 | 540 | 30.4 | 7 | 3 | 1.52 | 31.7 | 92 | 27 | 0.071 | 317 | 17.9 | 1 | 12 | 7 | 16 | 1.7 | 1.02 |
| small losers (-35% to 0) | 3 | 17% | -13.2% | 4.7e+04 | 1.52e+03 | 19 | 4 | 0 | 0 | 31 | 57 | 28.9 | 0.161 | 188 | 18.5 | 0.5 | 2 | 4 | 16 | 1.3 | 1.06 |
| stopped (<= -35%) | 6 | 33% | -49.6% | 4.75e+04 | 542 | 32.4 | 4.5 | 0.79 | 9.31e-17 | 34 | 92.5 | 29.6 | 0.103 | 234 | 19.2 | 1 | 7 | 5 | 19 | 1.23 | 0.95 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.97e+04, age_s 167, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 31.2, wal60 51, sell60 14.1, max_share 0.118, holders_entry 221, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.07
- 19 Oct 16:39 UK **Octo** +83.5% — entry_mc 4.15e+04, age_s 2.17e+03, bundle_pct 34.8, bundle_wallets 8, dev_buy_sol 4.89, sol60 35.1, wal60 69, sell60 34.4, max_share 0.127, top10_entry 21.8, has_socials 1, cc_n24h 3, peak_mult 3.52, fs10_x 1.15
- 20 Oct 19:11 UK **Conviction** +58.5% — entry_mc 5.43e+04, age_s 492, bundle_pct 27.9, bundle_wallets 4, dev_buy_sol 0, sol60 40.6, wal60 92, sell60 40.4, max_share 0.074, top10_entry 22.5, has_socials 1, cc_n24h 12, peak_mult 1.89, fs10_x 0.852
- 20 Oct 17:34 UK **Poképad** +55.8% — entry_mc 3e+04, age_s 1.53e+03, bundle_pct 20.4, bundle_wallets 6, dev_buy_sol 0.645, sol60 32.9, wal60 92, sell60 31.8, max_share 0.101, top10_entry 19.6, has_socials 0, cc_n24h 1, peak_mult 3.18, fs10_x 1.04
- 19 Oct 14:25 UK **Justice for Cole** +39.9% — entry_mc 4.7e+04, age_s 488, bundle_pct 33.8, bundle_wallets 13, dev_buy_sol 1.25, sol60 30.1, wal60 144, sell60 27, max_share 0.044, top10_entry 11, has_socials 1, cc_n24h 1, peak_mult 1.7, fs10_x 1.02
- 20 Oct 20:11 UK **catdog** +32.4% — entry_mc 4.46e+04, age_s 280, bundle_pct 30.4, bundle_wallets 1, dev_buy_sol 11.9, dev_hold_entry 1.49e-15, sol60 31.7, wal60 92, sell60 30, max_share 0.062, holders_entry 479, top10_entry 19, has_socials 1, cc_n24h 16, snipers_n 0, peak_mult 1.67, fs10_x 1
- 19 Oct 22:03 UK **Tame** +19.7% — entry_mc 5.17e+04, age_s 540, bundle_pct 47.6, bundle_wallets 15, dev_buy_sol 0.874, dev_hold_entry 3.04, sol60 32.7, wal60 46, sell60 20.9, max_share 0.255, holders_entry 155, top10_entry 17.9, has_socials 0, cc_n24h 12, snipers_n 14, peak_mult 1.38, fs10_x 1.12
- 19 Oct 16:16 UK **The Propechy Of 2027** +16.2% — entry_mc 5.67e+04, age_s 599, bundle_pct 29, bundle_wallets 7, dev_buy_sol 9.66, sol60 30.3, wal60 80, sell60 17.3, max_share 0.071, top10_entry 15, has_socials 1, cc_n24h 4, peak_mult 2.6, fs10_x 1.03

Worst:
- 20 Oct 23:55 UK **Mugshot Cat** -54.5% — entry_mc 6.1e+04, age_s 100, bundle_pct 29.3, bundle_wallets 6, dev_buy_sol 0.988, dev_hold_entry 9.31e-17, sol60 33.6, wal60 54, sell60 16.2, max_share 0.149, holders_entry 234, top10_entry 16.7, has_socials 1, cc_n24h 10, snipers_n 5, peak_mult 1.28, fs10_x 0.94
- 19 Oct 21:53 UK **ARE YOU READY?** -51.8% — entry_mc 7.34e+04, age_s 348, bundle_pct 60.9, bundle_wallets 4, dev_buy_sol 0, sol60 34.3, wal60 33, sell60 29.9, max_share 0.142, top10_entry 19.4, has_socials 1, cc_n24h 1, peak_mult 1.08, fs10_x 0.756
- 19 Oct 21:56 UK **archive** -51.6% — entry_mc 4.43e+04, age_s 728, bundle_pct 16.3, bundle_wallets 4, dev_buy_sol 0.593, sol60 68.9, wal60 141, sell60 68.7, max_share 0.064, top10_entry 18.9, has_socials 0, cc_n24h 2, peak_mult 1.31, fs10_x 0.961
- 19 Oct 14:07 UK **MAG-7** -51.0% — entry_mc 4.96e+04, age_s 420, bundle_pct 34.4, bundle_wallets 7, dev_buy_sol 3, sol60 30.1, wal60 49, sell60 26.9, max_share 0.4, top10_entry 20.6, has_socials 1, cc_n24h 26, peak_mult 1.18, fs10_x 1.01
- 20 Oct 04:51 UK **C’est la vie** -50.9% — entry_mc 3.51e+04, age_s 664, bundle_pct 30.4, bundle_wallets 4, dev_buy_sol 5.93, sol60 63.9, wal60 131, sell60 63.4, max_share 0.054, top10_entry 22.4, has_socials 1, cc_n24h 13, peak_mult 1.1, fs10_x 0.961
- 20 Oct 17:31 UK **Packmon Arena** -38.0% — entry_mc 4.54e+04, age_s 812, bundle_pct 41.2, bundle_wallets 5, dev_buy_sol 0.518, sol60 30.2, wal60 139, sell60 29.3, max_share 0.057, top10_entry 10.2, cc_n24h 4, peak_mult 1.48, fs10_x 0.91
- 20 Oct 16:26 UK **omnichain** -17.4% — entry_mc 4.7e+04, age_s 2e+03, bundle_pct 45.8, bundle_wallets 6, dev_buy_sol 0.425, sol60 30.8, wal60 50, sell60 28.9, max_share 0.161, top10_entry 18.5, has_socials 0, cc_n24h 2, peak_mult 1.3, fs10_x 1.06
- 20 Oct 17:52 UK **Xitter** -11.3% — entry_mc 2.46e+04, age_s 407, bundle_pct 19, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 59.4, wal60 134, sell60 51, max_share 0.05, holders_entry 188, top10_entry 27, has_socials 1, cc_n24h 18, snipers_n 4, peak_mult 2.26, fs10_x 1.11

## 5. Factor search (strict test) and luck check
1429 cuts tried on 156 entry-time columns; 7 pass the strict test, 13 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| gw_big_followers † >= 6 | 10 | +41.9% | +15.9% | 8 at -19.9% | +16.2% / +73.6% / +25.4% | +0.276 | 12 |
| gw_big_cost † >= 7695 | 12 | +33.4% | +11.2% | 6 at -23.3% | -0.8% / +73.6% / +27.2% | +0.262 | 15 |
| fresh_share >= 0.08083 | 10 | +35.2% | +8.4% | 8 at -11.4% | +24.1% / +71.6% / +16.3% | +0.231 | 18 |
| wal60 < 92.2 | 12 | +29.8% | +7.3% | 6 at -16.1% | -0.8% / +67.0% / +23.0% | +0.233 | 19 |
| n60 < 115.6 | 12 | +29.8% | +7.3% | 6 at -16.1% | -0.8% / +67.0% / +23.0% | +0.233 | 19 |
| pre_m1_nb < 92.2 | 12 | +29.8% | +7.3% | 6 at -16.1% | -0.8% / +67.0% / +23.0% | +0.233 | 19 |
| pre_min1_nb < 92.2 | 12 | +29.8% | +7.3% | 6 at -16.1% | -0.8% / +67.0% / +23.0% | +0.233 | 19 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| gw_big_cost >= 7695 AND wal60 < 92.2 | 9 | +52.7% | +24.7% | +16.2% / +93.0% / +48.9% | +0.314 |
| gw_big_cost >= 7695 AND n60 < 115.6 | 9 | +52.7% | +24.7% | +16.2% / +93.0% / +48.9% | +0.314 |
| gw_big_cost >= 7695 AND pre_m1_nb < 92.2 | 9 | +52.7% | +24.7% | +16.2% / +93.0% / +48.9% | +0.314 |
| gw_big_cost >= 7695 AND pre_min1_nb < 92.2 | 9 | +52.7% | +24.7% | +16.2% / +93.0% / +48.9% | +0.314 |
| gw_big_followers >= 6 AND wal60 < 92.2 | 8 | +55.2% | +23.6% | +16.2% / +93.0% / +57.2% | +0.293 |
| gw_big_followers >= 6 AND n60 < 115.6 | 8 | +55.2% | +23.6% | +16.2% / +93.0% / +57.2% | +0.293 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
19 14:07 UK–19 16:39 UK: 4 at +22.1% · 19 21:53 UK–19 22:03 UK: 4 at +48.2% · 20 04:51 UK–20 16:26 UK: 4 at -15.9% · 20 17:31 UK–20 17:52 UK: 3 at +2.2% · 20 19:11 UK–20 23:55 UK: 3 at +12.1%
