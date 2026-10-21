# Diagnosis — S7b
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 148 | -15.6% | -18.8% | -31.5% | 27% | 47% | 93.7 | -1.557 | -2.46 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h5f14 | 148 | -11.1% | -14.2% | 29% | -11.1% | -20.3% | -1.8% | -9.6% |
| x_flow4ff | 148 | -13.3% | -14.7% | 24% | -12.4% | -18.9% | -8.7% | -12.3% |
| x_t15s40 | 148 | -15.4% | -15.8% | 29% | -11.9% | -18.4% | -15.9% | -16.2% |
| x_flow4 | 148 | -15.0% | -16.4% | 24% | -13.8% | -21.0% | -10.1% | -13.9% |
| x_t2s40 | 148 | -16.2% | -16.9% | 22% | -17.2% | -19.8% | -11.5% | -13.6% |
| x_h3 | 148 | -15.5% | -18.0% | 28% | -15.3% | -20.2% | -11.1% | -14.3% |
| x_split | 147 | -16.3% | -18.3% | 20% | -18.4% | -22.2% | -8.0% | -13.2% |
| x_h5 (current) | 148 | -15.6% | -18.8% | 27% | -17.5% | -22.5% | -6.8% | -13.2% |
| x_h15 | 139 | -15.9% | -18.9% | 29% | -17.9% | -22.5% | -8.4% | -13.2% |
| x_tsl40 | 147 | -17.4% | -19.3% | 20% | -15.3% | -18.7% | -18.3% | -18.1% |
| x_h2t40 | 147 | -18.1% | -19.4% | 21% | -19.8% | -20.8% | -13.7% | -15.3% |
| x_time | 147 | -23.8% | -26.7% | 16% | -35.8% | -23.6% | -11.6% | -15.4% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 4 | 3% | +310.3% | 1.06e+04 | 15.5 | 44.7 | 4 | 1.86 | 1.31 | — | — | — | — | 54 | 24.6 | 1 | 3 | — | 19.5 | 6.73 | 1.41 |
| winners (0 to +50%) | 36 | 24% | +11.1% | 7.89e+03 | 10 | 21.1 | 4.5 | 0.994 | 0 | — | — | — | — | 27.5 | 27.6 | 1 | 1 | — | 15 | 1.92 | 1.09 |
| small losers (-35% to 0) | 39 | 26% | -18.1% | 3.72e+03 | 14 | 15.1 | 3 | 0.988 | 0 | — | — | — | — | 9 | 12.4 | 1 | 1 | — | 16 | 1 | 0.993 |
| stopped (<= -35%) | 69 | 47% | -47.1% | 6.47e+03 | 12 | 26.2 | 4 | 1 | 0 | — | — | — | — | 21 | 26.2 | 1 | 3 | — | 17 | 1.12 | 0.915 |

## 4. Best 8 and worst 8 trades
- 20 Oct 20:01 UK **PvePad** +449.0% — entry_mc 2.8e+04, age_s 10, bundle_pct 62.8, bundle_wallets 5, dev_buy_sol 11.6, dev_hold_entry 30, holders_entry 56, top10_entry 26.4, has_socials 0, cc_n24h 1, peak_mult 5.96, fs10_x 2.33
- 20 Oct 19:00 UK **Toly Wif Hat** +445.3% — entry_mc 1.41e+04, age_s 9, bundle_pct 37, bundle_wallets 3, dev_buy_sol 0, dev_hold_entry 0, holders_entry 72, top10_entry 29.4, has_socials 1, cc_n24h 5, peak_mult 7.51, fs10_x 1.43
- 19 Oct 22:04 UK **the normie** +292.2% — entry_mc 7.15e+03, age_s 21, bundle_pct 9.66, bundle_wallets 1, dev_buy_sol 2.97, dev_hold_entry 0, holders_entry 52, top10_entry 22.8, cc_n24h 12, peak_mult 7.53, fs10_x 1.39
- 20 Oct 14:39 UK **QuantoPay** +54.9% — entry_mc 6.45e+03, age_s 235, bundle_pct 52.3, bundle_wallets 5, dev_buy_sol 0.751, dev_hold_entry 2.62, holders_entry 48, top10_entry 19.1, has_socials 1, cc_n24h 1, peak_mult 1.64, fs10_x 0.817
- 20 Oct 16:06 UK **Wes Roulette** +45.2% — entry_mc 5.15e+03, age_s 44, bundle_pct 8.16, bundle_wallets 2, dev_buy_sol 0, dev_hold_entry 0, holders_entry 11, top10_entry 25.1, has_socials 1, cc_n24h 0, peak_mult 1.82, fs10_x 1.03
- 20 Oct 19:39 UK **Ebola Virus** +38.7% — entry_mc 7.03e+03, age_s 7, bundle_pct 27.7, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, holders_entry 25, top10_entry 23.3, has_socials 1, cc_n24h 2, peak_mult 1.55, fs10_x 0.783
- 20 Oct 14:33 UK **Hive** +37.7% — entry_mc 6.42e+03, age_s 4, bundle_pct 15, bundle_wallets 2, dev_buy_sol 0.282, dev_hold_entry 1, holders_entry 26, top10_entry 31.4, has_socials 0, cc_n24h 1, peak_mult 1.94, fs10_x 0.961
- 20 Oct 17:31 UK **Venice** +33.2% — entry_mc 5.46e+03, age_s 8, bundle_pct 8.48, bundle_wallets 3, dev_buy_sol 0.988, dev_hold_entry 3.42, holders_entry 23, top10_entry 22.4, has_socials 1, cc_n24h 0, peak_mult 1.56, fs10_x 0.921

Worst:
- 20 Oct 16:28 UK **d** -61.1% — entry_mc 619, age_s 138, bundle_pct 0.352, bundle_wallets 1, dev_buy_sol 0.0988, dev_hold_entry 0, holders_entry 15, top10_entry 27.2, has_socials 0, cc_n24h 17, peak_mult 9.25, fs10_x 0.913
- 20 Oct 16:27 UK **dog staff** -59.0% — entry_mc 1.73e+03, age_s 72, bundle_pct 0.351, bundle_wallets 1, dev_buy_sol 0.0986, dev_hold_entry 3.51e-05, holders_entry 10, top10_entry 28, has_socials 0, cc_n24h 22, peak_mult 1.36
- 20 Oct 18:51 UK **attention** -56.9% — entry_mc 3.08e+03, age_s 5, bundle_pct 1.71, bundle_wallets 1, dev_buy_sol 0.487, dev_hold_entry 1.71, holders_entry 1, top10_entry 1.71, has_socials 0, cc_n24h 59, peak_mult 1.15, fs10_x 1.15
- 20 Oct 17:32 UK **Sophie Token** -52.0% — entry_mc 7.71e+03, age_s 9, bundle_pct 34.1, bundle_wallets 10, dev_buy_sol 7.9, dev_hold_entry 10.6, holders_entry 13, top10_entry 40, has_socials 1, cc_n24h 17, peak_mult 1.1, fs10_x 0.937
- 20 Oct 20:03 UK **Lack of electricity** -51.5% — entry_mc 2.91e+03, age_s 36, bundle_pct 0.534, bundle_wallets 1, dev_buy_sol 0.15, dev_hold_entry 0.225, holders_entry 10, top10_entry 25.5, has_socials 0, cc_n24h 5, peak_mult 1.28
- 20 Oct 19:00 UK **Sparsity Data** -51.0% — entry_mc 1.04e+04, age_s 16, bundle_pct 32.6, bundle_wallets 4, dev_buy_sol 1.47, dev_hold_entry 5, holders_entry 61, top10_entry 24.8, has_socials 1, cc_n24h 1, peak_mult 1, fs10_x 0.388
- 20 Oct 19:16 UK **TEST** -51.0% — entry_mc 1.01e+04, age_s 14, bundle_pct 26.7, bundle_wallets 8, dev_buy_sol 0.988, dev_hold_entry 0, holders_entry 33, top10_entry 32.7, has_socials 1, cc_n24h 17, peak_mult 1, fs10_x 0.834
- 20 Oct 05:35 UK **Duve** -50.4% — entry_mc 7.55e+03, age_s 34, bundle_pct 23.5, bundle_wallets 8, dev_buy_sol 2.27, dev_hold_entry 0, holders_entry 41, top10_entry 21.1, has_socials 0, cc_n24h 0, peak_mult 1.36, fs10_x 1.11

## 5. Factor search (strict test) and luck check
775 cuts tried on 62 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
19 20:42 UK–20 04:59 UK: 30 at -8.0% · 20 05:22 UK–20 14:33 UK: 30 at -29.8% · 20 14:35 UK–20 17:32 UK: 30 at -17.7% · 20 17:41 UK–20 19:11 UK: 29 at -15.3% · 20 19:14 UK–21 10:31 UK: 29 at -6.9%
