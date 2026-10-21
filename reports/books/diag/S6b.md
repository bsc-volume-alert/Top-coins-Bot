# Diagnosis — S6b
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 651 | -18.5% | -19.6% | -39.6% | 30% | 53% | 412.4 | -8.037 | -12.69 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_flow4ff | 651 | -14.2% | -14.7% | 26% | -11.8% | -18.4% | -12.5% | -16.0% |
| x_flow4 | 651 | -14.8% | -15.3% | 27% | -12.7% | -19.1% | -12.6% | -16.6% |
| x_t2s40 | 651 | -15.3% | -15.4% | 22% | -13.7% | -18.2% | -14.0% | -17.2% |
| x_t15s40 | 651 | -15.4% | -15.5% | 31% | -13.9% | -19.0% | -13.2% | -16.8% |
| x_tsl40 | 651 | -15.7% | -16.4% | 18% | -11.3% | -19.4% | -16.3% | -19.7% |
| x_split | 651 | -16.0% | -16.4% | 16% | -10.0% | -19.7% | -18.2% | -20.4% |
| x_h2t40 | 651 | -16.6% | -17.1% | 22% | -14.8% | -18.8% | -16.2% | -19.2% |
| x_h5f14 | 651 | -16.1% | -17.3% | 31% | -14.5% | -19.6% | -14.3% | -18.9% |
| x_h15 | 636 | -17.1% | -18.2% | 32% | -15.6% | -19.9% | -16.0% | -19.4% |
| x_h3 | 651 | -17.9% | -18.6% | 30% | -15.1% | -19.9% | -18.6% | -21.2% |
| x_h3l | 326 | -17.6% | -18.8% | 30% | — | -18.6% | -17.1% | -17.6% |
| x_h5 (current) | 651 | -18.5% | -19.6% | 30% | -18.3% | -19.0% | -18.1% | -21.2% |
| x_time | 650 | -22.8% | -24.9% | 12% | -21.7% | -24.0% | -22.6% | -24.3% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 24 | 4% | +230.1% | 7.22e+03 | 8.5 | 24.5 | 4 | 1.74 | 9.31e-16 | — | — | — | — | 15.5 | 31.4 | 1 | 2 | — | 10 | 4.63 | 1.24 |
| winners (0 to +50%) | 170 | 26% | +8.1% | 5.98e+03 | 8 | 22.5 | 4 | 2.98 | 0 | — | — | — | — | 17 | 27.5 | 1 | 4 | — | 9 | 2.1 | 1.22 |
| small losers (-35% to 0) | 109 | 17% | -21.8% | 3.95e+03 | 12 | 18.4 | 4 | 0.804 | 0 | — | — | — | — | 9 | 14.9 | 1 | 3 | — | 9 | 1.14 | 0.985 |
| stopped (<= -35%) | 348 | 53% | -47.6% | 6.21e+03 | 9 | 23.4 | 4 | 2.96 | 0 | — | — | — | — | 17 | 29.3 | 1 | 4 | — | 12 | 1.12 | 0.871 |

## 4. Best 8 and worst 8 trades
- 20 Oct 20:29 UK **Energy Coin** +712.5% — entry_mc 6.44e+03, age_s 12, bundle_pct 19.3, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, holders_entry 22, top10_entry 30.1, has_socials 1, cc_n24h 29, peak_mult 12.7, fs10_x 1.63
- 20 Oct 19:00 UK **Toly Wif Hat** +579.0% — entry_mc 1.26e+04, age_s 2, bundle_pct 37, bundle_wallets 3, dev_buy_sol 0, dev_hold_entry 0, holders_entry 5, top10_entry 28.5, has_socials 1, cc_n24h 1, peak_mult 8.42, fs10_x 1.04
- 20 Oct 10:20 UK **Pump** +414.8% — entry_mc 9.04e+03, age_s 13, bundle_pct 6.71, bundle_wallets 1, dev_buy_sol 0, dev_hold_entry 0, holders_entry 17, top10_entry 45.1, has_socials 1, cc_n24h 1, peak_mult 10, fs10_x 1.29
- 21 Oct 00:16 UK **Larp Final Boss** +399.9% — entry_mc 5.99e+03, age_s 5, bundle_pct 12.7, bundle_wallets 2, dev_buy_sol 0, dev_hold_entry 0, holders_entry 10, top10_entry 31.7, has_socials 1, cc_n24h 4, peak_mult 7.54, fs10_x 1.1
- 20 Oct 10:06 UK **Zoo** +398.8% — entry_mc 7.09e+03, age_s 12, bundle_pct 6.89, bundle_wallets 3, dev_buy_sol 0, dev_hold_entry 0, holders_entry 16, top10_entry 37.6, has_socials 0, cc_n24h 1, peak_mult 9.61, fs10_x 0.87
- 20 Oct 01:30 UK **Bully** +382.8% — entry_mc 5.44e+03, age_s 7, bundle_pct 26.6, bundle_wallets 4, dev_buy_sol 2.96, dev_hold_entry 0, holders_entry 10, top10_entry 28.7, cc_n24h 2, peak_mult 23.7, fs10_x 1.64
- 20 Oct 06:51 UK **Olly** +260.8% — entry_mc 7.35e+03, age_s 8, bundle_pct 25, bundle_wallets 5, dev_buy_sol 3.85, dev_hold_entry 1.12e-15, holders_entry 31, top10_entry 31.2, has_socials 1, cc_n24h 2, peak_mult 4.39, fs10_x 1.11
- 20 Oct 02:48 UK **DUST** +246.3% — entry_mc 1.95e+04, age_s 9, bundle_pct 52, bundle_wallets 5, dev_buy_sol 0.57, dev_hold_entry 2, holders_entry 46, top10_entry 39.7, has_socials 1, cc_n24h 1, peak_mult 5.03, fs10_x 1.57

Worst:
- 20 Oct 22:21 UK **Retinue** -95.8% — entry_mc 3.61e+04, age_s 21, bundle_pct 63, bundle_wallets 2, dev_buy_sol 3.08, dev_hold_entry 10, holders_entry 23, top10_entry 65.1, has_socials 0, cc_n24h 1, peak_mult 1.08
- 19 Oct 23:26 UK **thank you elon** -77.6% — entry_mc 1.19e+04, age_s 50, bundle_pct 42.9, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, holders_entry 100, top10_entry 13.3, has_socials 1, cc_n24h 23, peak_mult 1.11, fs10_x 0.318
- 19 Oct 22:19 UK **paperlaunch** -77.4% — entry_mc 2.2e+04, age_s 2, bundle_pct 62.4, bundle_wallets 7, dev_buy_sol 0.57, dev_hold_entry 2, holders_entry 19, top10_entry 32.4, has_socials 0, cc_n24h 1, peak_mult 1.41, fs10_x 1.04
- 20 Oct 09:12 UK **wrapped bulls** -74.5% — entry_mc 9.39e+03, age_s 5, bundle_pct 20.3, bundle_wallets 5, dev_buy_sol 1.28, dev_hold_entry 4.4, holders_entry 23, top10_entry 34.5, has_socials 0, cc_n24h 1, peak_mult 1.09, fs10_x 0.676
- 21 Oct 00:49 UK **A trader in a world of insid** -71.3% — entry_mc 1.54e+04, age_s 7, bundle_pct 36.1, bundle_wallets 2, dev_buy_sol 14.8, dev_hold_entry 35.5, holders_entry 43, top10_entry 19.9, has_socials 0, cc_n24h 1, peak_mult 1.12, fs10_x 0.501
- 21 Oct 09:43 UK **Girl With Balloon** -65.8% — entry_mc 8.21e+03, age_s 6, bundle_pct 20.5, bundle_wallets 5, dev_buy_sol 3, dev_hold_entry 2.8, holders_entry 12, top10_entry 38, has_socials 1, cc_n24h 3, peak_mult 2.17, fs10_x 1.01
- 20 Oct 16:18 UK **Pussy** -59.9% — entry_mc 5.17e+03, age_s 4, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 0, dev_hold_entry 0, holders_entry 3, top10_entry 26.2, has_socials 1, cc_n24h 1, peak_mult 3.19, fs10_x 2.25
- 20 Oct 15:33 UK **Powercoin** -58.4% — entry_mc 6.28e+03, age_s 11, bundle_pct 27.4, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, holders_entry 17, top10_entry 32.1, has_socials 1, cc_n24h 1, peak_mult 1.02, fs10_x 0.986

## 5. Factor search (strict test) and luck check
713 cuts tried on 54 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
19 20:42 UK–20 03:43 UK: 131 at -18.9% · 20 03:45 UK–20 11:37 UK: 130 at -10.0% · 20 11:45 UK–20 18:37 UK: 130 at -29.6% · 20 18:38 UK–21 01:16 UK: 130 at -8.4% · 21 01:18 UK–21 10:33 UK: 130 at -25.6%
