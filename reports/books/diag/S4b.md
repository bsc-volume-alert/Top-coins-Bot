# Diagnosis — S4b
_Data to 21 Oct 01:42 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 48 | -8.2% | -15.9% | -27.1% | 12% | 25% | 39.2 | -0.361 | -0.44 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h5f14 | 48 | -7.4% | -15.0% | 12% | -2.1% | +6.6% | -26.7% | -12.1% |
| x_h5 (current) | 48 | -8.2% | -15.9% | 12% | -4.7% | +6.7% | -26.7% | -12.0% |
| x_tsl40 | 48 | -5.5% | -16.0% | 12% | -4.4% | +14.6% | -26.9% | -8.2% |
| x_h15 | 46 | -10.9% | -17.4% | 13% | -5.3% | -2.2% | -27.1% | -15.7% |
| x_split | 48 | -11.5% | -17.7% | 10% | -5.7% | -0.3% | -28.4% | -15.5% |
| x_h2t40 | 48 | -12.2% | -18.6% | 12% | -9.6% | -0.2% | -26.7% | -15.2% |
| x_h3 | 48 | -6.3% | -19.0% | 12% | -9.7% | +17.2% | -26.4% | -6.2% |
| x_time | 48 | -13.3% | -19.6% | 10% | -10.7% | -5.6% | -23.6% | -16.3% |
| x_t2s40 | 48 | -17.6% | -19.9% | 12% | -13.3% | -12.9% | -26.7% | -21.0% |
| x_flow4ff | 48 | -14.2% | -20.0% | 12% | -13.8% | -0.0% | -28.9% | -16.1% |
| x_flow4 | 48 | -14.8% | -20.6% | 12% | -16.3% | -1.4% | -26.7% | -15.7% |
| x_t15s40 | 48 | -19.7% | -21.0% | 12% | -17.5% | -15.0% | -26.7% | -22.0% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 3 | 6% | +243.3% | 3.47e+03 | 5 | 1.46 | 1 | 0.296 | 1.05 | — | — | — | — | 11 | 8.98 | 1 | 0 | — | 14 | 4.5 | 1.01 |
| winners (0 to +50%) | 3 | 6% | +17.1% | 4.17e+03 | 6 | 1.33 | 1 | 0.306 | 1.08 | — | — | — | — | 12 | 16.6 | 1 | 1 | — | 0 | 1.68 | 1.09 |
| small losers (-35% to 0) | 30 | 62% | -21.3% | 3.94e+03 | 5.5 | 2.09 | 1 | 0.525 | 1.74 | — | — | — | — | 10.5 | 14.2 | 1 | 1 | — | 18.5 | 1.02 | 0.946 |
| stopped (<= -35%) | 12 | 25% | -44.7% | 4.98e+03 | 6 | 1.75 | 1 | 0.493 | 1.75 | — | — | — | — | 13 | 20.6 | 1 | 2 | — | 17 | 1.06 | 0.903 |

## 4. Best 8 and worst 8 trades
- 20 Oct 14:02 UK **Unemployed, But Investing** +350.9% — entry_mc 7.4e+03, age_s 4, bundle_pct 1.05, bundle_wallets 1, dev_buy_sol 0.296, dev_hold_entry 1.05, holders_entry 27, top10_entry 32.2, has_socials 1, cc_n24h 1, peak_mult 10.6, fs10_x 1.11
- 19 Oct 22:10 UK **Eisley** +281.6% — entry_mc 3.1e+03, age_s 5, bundle_pct 2.25, bundle_wallets 1, dev_buy_sol 0.642, dev_hold_entry 2.25, holders_entry 4, top10_entry 3.12, has_socials 1, cc_n24h 0, peak_mult 4.5, fs10_x 1
- 20 Oct 14:00 UK **Formation** +97.6% — entry_mc 3.47e+03, age_s 13, bundle_pct 1.46, bundle_wallets 2, dev_buy_sol 0.227, dev_hold_entry 0.806, holders_entry 11, top10_entry 8.98, cc_n24h 0, peak_mult 2.09, fs10_x 1.01
- 20 Oct 05:51 UK **Nya Mint** +36.5% — entry_mc 3.97e+03, age_s 6, bundle_pct 2.59, bundle_wallets 1, dev_buy_sol 0.741, dev_hold_entry 2.59, holders_entry 15, top10_entry 13.9, has_socials 1, cc_n24h 1, peak_mult 1.63, fs10_x 0.995
- 20 Oct 00:53 UK **Clarence Maximus** +8.4% — entry_mc 4.17e+03, age_s 6, bundle_pct 1.33, bundle_wallets 2, dev_buy_sol 0.217, dev_hold_entry 0.386, holders_entry 12, top10_entry 16.6, has_socials 1, cc_n24h 2, peak_mult 2.08, fs10_x 1.62
- 20 Oct 00:36 UK **HEROS** +6.3% — entry_mc 4.18e+03, age_s 9, bundle_pct 1.08, bundle_wallets 1, dev_buy_sol 0.306, dev_hold_entry 1.08, holders_entry 10, top10_entry 17.4, has_socials 0, cc_n24h 0, peak_mult 1.68, fs10_x 1.09
- 20 Oct 20:49 UK **Togi Coin** -4.6% — entry_mc 3.03e+03, age_s 4, bundle_pct 1.05, bundle_wallets 1, dev_buy_sol 0.296, dev_hold_entry 1.05, holders_entry 2, top10_entry 1.23, has_socials 1, cc_n24h 1, peak_mult 1.05, fs10_x 1.05
- 20 Oct 19:12 UK **PimPaddo** -7.0% — entry_mc 3.79e+03, age_s 12, bundle_pct 1.74, bundle_wallets 1, dev_buy_sol 0.494, dev_hold_entry 1.74, holders_entry 8, top10_entry 12.3, has_socials 1, cc_n24h 0, peak_mult 1.06, fs10_x 0.867

Worst:
- 20 Oct 16:42 UK **rice donald** -53.9% — entry_mc 2.03e+03, age_s 14, bundle_pct 1.73, bundle_wallets 1, dev_buy_sol 0.493, dev_hold_entry 7.31, holders_entry 11, top10_entry 13.4, has_socials 0, cc_n24h 7, peak_mult 1, fs10_x 0.448
- 20 Oct 21:55 UK **Sexy Inu** -49.1% — entry_mc 8.38e+03, age_s 5, bundle_pct 1.76, bundle_wallets 1, dev_buy_sol 0.5, dev_hold_entry 1.76, holders_entry 18, top10_entry 16.9, has_socials 1, cc_n24h 14, peak_mult 1.01, fs10_x 0.638
- 20 Oct 04:28 UK **Pink Panther** -48.9% — entry_mc 5.72e+03, age_s 11, bundle_pct 1.01, bundle_wallets 1, dev_buy_sol 0.284, dev_hold_entry 1.01, holders_entry 11, top10_entry 33.3, has_socials 0, cc_n24h 5, peak_mult 1.05, fs10_x 0.841
- 19 Oct 21:34 UK **The White Bull** -48.1% — entry_mc 7.92e+03, age_s 5, bundle_pct 0.876, bundle_wallets 1, dev_buy_sol 0.247, dev_hold_entry 0.876, holders_entry 37, top10_entry 24.1, cc_n24h 1, peak_mult 1.24, fs10_x 0.966
- 20 Oct 16:41 UK **SUS DUCK 🦆** -47.7% — entry_mc 4e+03, age_s 13, bundle_pct 0.863, bundle_wallets 1, dev_buy_sol 0.243, dev_hold_entry 5.98, holders_entry 11, top10_entry 20, has_socials 0, cc_n24h 36, peak_mult 1.22, fs10_x 0.506
- 20 Oct 18:23 UK **Cogecoin** -47.6% — entry_mc 5.44e+03, age_s 12, bundle_pct 1.76, bundle_wallets 1, dev_buy_sol 0.5, dev_hold_entry 0.88, holders_entry 10, top10_entry 27.9, has_socials 1, cc_n24h 12, peak_mult 1.2, fs10_x 1.11
- 19 Oct 23:27 UK **LastStand** -47.5% — entry_mc 5.74e+03, age_s 4, bundle_pct 1.9, bundle_wallets 1, dev_buy_sol 0.541, dev_hold_entry 1.9, holders_entry 24, top10_entry 25.8, has_socials 0, cc_n24h 1, peak_mult 1.08, fs10_x 0.992
- 20 Oct 16:33 UK **DOWN.Bank** -47.0% — entry_mc 5.98e+03, age_s 6, bundle_pct 1.11, bundle_wallets 1, dev_buy_sol 0.314, dev_hold_entry 1.11, holders_entry 27, top10_entry 24.6, has_socials 1, cc_n24h 1, peak_mult 1.01, fs10_x 0.675

## 5. Factor search (strict test) and luck check
646 cuts tried on 52 entry-time columns; 1 pass the strict test, 2 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| sn_sells >= 9 | 13 | +34.3% | +7.9% | 35 at -24.0% | +38.0% / +89.3% / -25.4% | +0.353 | 5 |

## 8. Five time blocks
19 20:19 UK–19 23:27 UK: 10 at +4.7% · 20 00:21 UK–20 03:39 UK: 10 at -20.7% · 20 04:17 UK–20 14:21 UK: 10 at +28.7% · 20 16:33 UK–20 19:12 UK: 9 at -30.6% · 20 20:49 UK–20 23:03 UK: 9 at -27.3%
