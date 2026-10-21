# Diagnosis — DC
_Data to 21 Oct 01:42 UK; D, copycat of a $72K+ coin; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 45 | +12.2% | +6.2% | +16.9% | 60% | 33% | 29.1 | +0.326 | +0.50 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 45 | +9.1% | +8.4% | 67% | +15.3% | +9.0% | +2.9% | +6.1% |
| x_flow4 (current) | 45 | +12.2% | +6.2% | 60% | +22.4% | +17.3% | -3.1% | -0.6% |
| x_split | 45 | +9.2% | +3.1% | 42% | +35.7% | -10.2% | +2.1% | -0.4% |
| x_flow4ff | 45 | +3.0% | +0.4% | 47% | +22.0% | -11.4% | -1.6% | -3.4% |
| x_h5f14 | 45 | +0.9% | -0.6% | 60% | +7.9% | +1.5% | -6.8% | -1.3% |
| x_t2s40 | 45 | +1.0% | -0.9% | 40% | +18.0% | -9.4% | -5.5% | -10.4% |
| x_h15 | 45 | +2.0% | -2.9% | 67% | +4.3% | +9.2% | -7.4% | -5.4% |
| x_tsl40 | 45 | -0.2% | -4.9% | 33% | +14.9% | -10.8% | -4.7% | -6.3% |
| x_h5 | 45 | -3.9% | -5.5% | 60% | +3.6% | -3.2% | -12.0% | -6.3% |
| x_h3 | 45 | -3.5% | -5.8% | 56% | +5.5% | -6.3% | -9.8% | -8.0% |
| x_h2t40 | 45 | -2.9% | -6.3% | 40% | +13.1% | -14.9% | -6.9% | -12.5% |
| x_time | 45 | -32.8% | -40.1% | 20% | -37.9% | -26.8% | -33.7% | -34.7% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 9 | 20% | +94.8% | 4.55e+04 | 208 | 32.4 | 5 | 2.67 | 3.73e-16 | 50.4 | 102 | 46.2 | 0.081 | 215 | 24.1 | 1 | 13 | 4 | 15 | 3.17 | 1.09 |
| winners (0 to +50%) | 18 | 40% | +28.8% | 4.84e+04 | 208 | 32.2 | 5.5 | 0.791 | 0 | 50.7 | 104 | 45.7 | 0.07 | 294 | 22.3 | 1 | 6 | 5 | 14.5 | 2.12 | 1.02 |
| small losers (-35% to 0) | 3 | 7% | -14.2% | 5.07e+04 | 74 | 42.6 | 5 | 0 | 0 | 50.2 | 84 | 44.9 | 0.068 | 249 | 11.5 | 1 | 18 | 5 | 3 | 1.92 | 0.882 |
| stopped (<= -35%) | 15 | 33% | -52.0% | 4.52e+04 | 242 | 25 | 4 | 1.83 | 0 | 50.7 | 93 | 47.3 | 0.089 | 234 | 25.2 | 1 | 11 | 3 | 15 | 1.21 | 0.918 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.94e+04, age_s 172, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 50.2, wal60 66, sell60 34.6, max_share 0.081, holders_entry 224, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.12
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 19:48 UK **the collectooor** +93.6% — entry_mc 3.84e+04, age_s 68, bundle_pct 32.4, bundle_wallets 4, dev_buy_sol 4, dev_hold_entry 0, sol60 50, wal60 102, sell60 48.4, max_share 0.099, holders_entry 215, top10_entry 25.4, has_socials 1, cc_n24h 22, snipers_n 3, peak_mult 4.59, fs10_x 1.06
- 20 Oct 05:48 UK **Tetsuo Super Intelligence** +67.3% — entry_mc 4.55e+04, age_s 2.6e+03, bundle_pct 18.2, bundle_wallets 4, dev_buy_sol 2.67, sol60 50.4, wal60 149, sell60 50.3, max_share 0.039, top10_entry 22.2, has_socials 1, cc_n24h 33, peak_mult 3.17, fs10_x 0.928
- 19 Oct 13:48 UK **Wojak** +63.8% — entry_mc 3.24e+04, age_s 705, bundle_pct 29, bundle_wallets 5, dev_buy_sol 5, sol60 52.6, wal60 73, sell60 45.6, max_share 0.095, top10_entry 22.8, has_socials 1, cc_n24h 19, peak_mult 1.95, fs10_x 1.05
- 20 Oct 02:38 UK **Justice for Lacy** +63.6% — entry_mc 4.31e+04, age_s 208, bundle_pct 24.7, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 55, wal60 123, sell60 54.3, max_share 0.072, holders_entry 349, top10_entry 28.9, has_socials 1, cc_n24h 13, snipers_n 4, peak_mult 2.59, fs10_x 0.918
- 20 Oct 13:05 UK **Moon Stone** +62.1% — entry_mc 5.74e+04, age_s 88, bundle_pct 38.8, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50.6, wal60 89, sell60 36.4, max_share 0.239, holders_entry 160, top10_entry 33.3, has_socials 1, cc_n24h 5, snipers_n 5, peak_mult 7.41, fs10_x 1.19
- 19 Oct 16:30 UK **The gambler** +55.9% — entry_mc 5.03e+04, age_s 1.27e+03, bundle_pct 32.6, bundle_wallets 6, dev_buy_sol 0, sol60 50.9, wal60 146, sell60 43.8, max_share 0.053, top10_entry 18.8, cc_n24h 1, peak_mult 2.64, fs10_x 1.09

Worst:
- 20 Oct 18:57 UK **memestock** -57.6% — entry_mc 4.64e+04, age_s 234, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 4.94, dev_hold_entry 0, sol60 50, wal60 127, sell60 47.4, max_share 0.197, holders_entry 400, top10_entry 31.3, has_socials 1, cc_n24h 54, snipers_n 0, peak_mult 1.25, fs10_x 1.07
- 20 Oct 02:24 UK **Collector Capital Markets** -55.2% — entry_mc 4.52e+04, age_s 105, bundle_pct 15.6, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 50.6, wal60 85, sell60 44.1, max_share 0.147, holders_entry 238, top10_entry 26.7, has_socials 1, cc_n24h 10, snipers_n 3, peak_mult 1.22, fs10_x 1.07
- 19 Oct 12:36 UK **The Supreme Leader** -52.5% — entry_mc 4.61e+04, age_s 1.3e+03, bundle_pct 17.7, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 55.6, wal60 99, sell60 54.7, max_share 0.078, holders_entry 204, top10_entry 24.1, has_socials 1, cc_n24h 10, snipers_n 4, peak_mult 1.04, fs10_x 0.939
- 19 Oct 21:25 UK **Quinelings** -52.1% — entry_mc 4.83e+04, age_s 512, bundle_pct 30.4, bundle_wallets 1, dev_buy_sol 11.9, sol60 50.4, wal60 80, sell60 45.3, max_share 0.088, top10_entry 22.1, has_socials 1, cc_n24h 62, snipers_n 0, peak_mult 1.61, fs10_x 0.872
- 20 Oct 01:51 UK **Never Stop Clicking** -51.8% — entry_mc 4.36e+04, age_s 89, bundle_pct 44.1, bundle_wallets 8, dev_buy_sol 0, dev_hold_entry 0, sol60 59.1, wal60 132, sell60 58.4, max_share 0.042, holders_entry 252, top10_entry 11.4, has_socials 1, cc_n24h 7, snipers_n 8, peak_mult 1.28, fs10_x 0.828
- 19 Oct 15:41 UK **Trumpfolio** -51.6% — entry_mc 4.49e+04, age_s 166, bundle_pct 25, bundle_wallets 6, dev_buy_sol 4, dev_hold_entry 7.45e-16, sol60 50.2, wal60 78, sell60 47.3, max_share 0.036, holders_entry 438, top10_entry 18.7, has_socials 1, cc_n24h 13, snipers_n 5, peak_mult 1.04, fs10_x 0.931
- 20 Oct 04:00 UK **Justice for Kohen Wiley** -51.5% — entry_mc 4.51e+04, age_s 119, bundle_pct 6.71, bundle_wallets 2, dev_buy_sol 1, dev_hold_entry 0, sol60 50.2, wal60 93, sell60 48.7, max_share 0.148, holders_entry 231, top10_entry 28.5, has_socials 1, cc_n24h 36, snipers_n 1, peak_mult 1.28, fs10_x 0.871
- 20 Oct 22:10 UK **SpaceXSuperIntelligence** -51.4% — entry_mc 5.35e+04, age_s 638, bundle_pct 26.4, bundle_wallets 5, dev_buy_sol 3.95, dev_hold_entry 0, sol60 50, wal60 79, sell60 39.8, max_share 0.1, holders_entry 180, top10_entry 31.5, has_socials 1, cc_n24h 93, snipers_n 4, peak_mult 1.19, fs10_x 0.918

## 5. Factor search (strict test) and luck check
1122 cuts tried on 99 entry-time columns; 48 pass the strict test, 69 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| heat_win2h_n < 28 | 19 | +35.8% | +22.4% | 26 at -5.0% | +28.2% / +80.5% / +13.5% | +0.427 | 18 |
| bundle_pct >= 28.98 | 23 | +32.6% | +21.5% | 22 at -9.2% | +63.0% / +24.8% / +7.3% | +0.471 | 19 |
| heat_trig1h < 34.4 | 16 | +25.7% | +21.2% | 29 at +4.7% | +30.7% / +27.8% / +17.6% | +0.256 | 19 |
| heat_win2h_hit < 11 | 30 | +28.3% | +19.7% | 15 at -20.0% | +27.8% / +30.1% / +26.7% | +0.530 | 19 |
| gw_big_followers † >= 7.9 | 12 | +25.7% | +19.5% | 33 at +7.3% | +32.3% / +31.8% / +12.8% | +0.192 | 19 |
| cc_n24h < 10 | 22 | +30.5% | +18.8% | 23 at -5.3% | +38.4% / +30.2% / +20.0% | +0.419 | 20 |
| heat_grad1h < 117.4 | 29 | +27.2% | +18.2% | 16 at -14.9% | +35.6% / +36.3% / +12.8% | +0.490 | 20 |
| gw_big_age_d † >= 29.04 | 21 | +30.0% | +17.7% | 24 at -3.4% | +46.7% / +35.3% / +5.3% | +0.394 | 20 |
| bundle_wallets >= 5 | 26 | +27.4% | +17.5% | 19 at -8.7% | +33.0% / +32.5% / +13.1% | +0.445 | 20 |
| heat_launch10m < 422.8 | 29 | +24.8% | +15.8% | 16 at -10.7% | +34.8% / +22.8% / +19.2% | +0.447 | 20 |
| cc_sym_n24h < 37 | 33 | +22.8% | +14.8% | 12 at -16.8% | +22.6% / +27.9% / +14.7% | +0.464 | 20 |
| cc_grads24h == 0 | 36 | +21.6% | +14.3% | 9 at -25.4% | +31.1% / +22.9% / +9.6% | +0.479 | 20 |
| pre_m1_b < 5298 | 22 | +25.9% | +13.9% | 23 at -0.9% | +41.7% / +19.8% / +14.9% | +0.354 | 20 |
| pre_min1_b < 5298 | 22 | +25.9% | +13.9% | 23 at -0.9% | +41.7% / +19.8% / +14.9% | +0.354 | 20 |
| pre_m2_b < 5279 | 16 | +29.4% | +13.0% | 29 at +2.7% | +28.9% / +35.3% / +16.9% | +0.294 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| heat_win2h_n < 28 AND bundle_pct >= 28.98 | 10 | +72.8% | +50.2% | +92.0% / +84.7% / +37.8% | +0.464 |
| bundle_pct >= 28.98 AND heat_win2h_hit < 11 | 16 | +54.6% | +39.8% | +69.3% / +49.2% / +37.8% | +0.555 |
| heat_win2h_hit < 11 AND gw_big_age_d >= 29.04 | 15 | +48.1% | +31.7% | +46.7% / +53.7% / +39.5% | +0.457 |
| bundle_pct >= 28.98 AND heat_trig1h < 34.4 | 9 | +37.8% | +30.8% | +60.9% / +18.9% / +40.9% | +0.214 |
| bundle_pct >= 28.98 AND cc_n24h < 10 | 15 | +46.8% | +30.3% | +56.8% / +40.5% / +46.9% | +0.444 |
| gw_big_followers >= 7.9 AND heat_grad1h < 117.4 | 10 | +34.6% | +28.0% | +53.3% / +40.6% / +12.8% | +0.217 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
19 12:36 UK–19 16:39 UK: 9 at +25.6% · 19 18:43 UK–19 21:58 UK: 9 at +30.9% · 19 22:14 UK–20 02:38 UK: 9 at +2.6% · 20 02:49 UK–20 10:22 UK: 9 at +12.3% · 20 12:19 UK–21 00:58 UK: 9 at -10.5%
