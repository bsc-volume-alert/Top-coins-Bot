# Diagnosis — S6b
_Data to 21 Oct 01:42 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 524 | -16.7% | -18.1% | -38.9% | 30% | 54% | 433.6 | -7.692 | -9.30 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_flow4ff | 524 | -14.1% | -14.6% | 26% | -13.3% | -15.6% | -13.2% | -13.8% |
| x_flow4 | 524 | -14.6% | -15.2% | 27% | -14.1% | -16.7% | -12.9% | -14.3% |
| x_t2s40 | 524 | -15.3% | -15.5% | 22% | -14.4% | -16.3% | -15.1% | -15.8% |
| x_t15s40 | 524 | -15.7% | -15.8% | 31% | -15.1% | -16.7% | -15.2% | -16.0% |
| x_tsl40 | 524 | -15.1% | -16.0% | 18% | -13.9% | -13.9% | -17.4% | -15.2% |
| x_split | 524 | -15.6% | -16.1% | 16% | -11.7% | -13.7% | -21.2% | -15.7% |
| x_h5f14 | 524 | -15.2% | -16.6% | 31% | -17.6% | -13.6% | -14.2% | -14.9% |
| x_h2t40 | 524 | -16.3% | -16.9% | 22% | -16.1% | -15.9% | -17.1% | -16.7% |
| x_h15 | 509 | -15.9% | -17.3% | 32% | -16.7% | -17.5% | -13.4% | -15.8% |
| x_h3 | 524 | -16.5% | -17.4% | 30% | -17.1% | -16.0% | -16.5% | -15.8% |
| x_h5 (current) | 524 | -16.7% | -18.1% | 30% | -21.0% | -14.6% | -14.7% | -15.7% |
| x_time | 524 | -21.8% | -24.4% | 12% | -21.9% | -17.5% | -26.1% | -21.0% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 22 | 4% | +244.0% | 7.49e+03 | 8.5 | 24.5 | 4 | 2.48 | 1.3e-15 | — | — | — | — | 16 | 31.4 | 1 | 2 | — | 10 | 4.94 | 1.24 |
| winners (0 to +50%) | 137 | 26% | +7.9% | 6.02e+03 | 9 | 23 | 4 | 3 | 0 | — | — | — | — | 17 | 27.4 | 1 | 4 | — | 14 | 2.07 | 1.25 |
| small losers (-35% to 0) | 84 | 16% | -22.5% | 3.99e+03 | 11 | 18.4 | 4 | 0.772 | 0 | — | — | — | — | 9 | 15.3 | 1 | 3.5 | — | 12 | 1.11 | 0.984 |
| stopped (<= -35%) | 281 | 54% | -47.4% | 6.2e+03 | 9 | 22.7 | 4 | 2.96 | 0 | — | — | — | — | 16 | 29.2 | 1 | 4 | — | 16 | 1.12 | 0.87 |

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
- 20 Oct 16:18 UK **Pussy** -59.9% — entry_mc 5.17e+03, age_s 4, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 0, dev_hold_entry 0, holders_entry 3, top10_entry 26.2, has_socials 1, cc_n24h 1, peak_mult 3.19, fs10_x 2.25
- 20 Oct 15:33 UK **Powercoin** -58.4% — entry_mc 6.28e+03, age_s 11, bundle_pct 27.4, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, holders_entry 17, top10_entry 32.1, has_socials 1, cc_n24h 1, peak_mult 1.02, fs10_x 0.986
- 20 Oct 18:46 UK **DIGITAL SUPER INU** -57.3% — entry_mc 1.7e+04, age_s 5, bundle_pct 30.4, bundle_wallets 1, dev_buy_sol 11.9, dev_hold_entry 21.1, holders_entry 22, top10_entry 52.3, has_socials 1, cc_n24h 3, peak_mult 1.54, fs10_x 0.495

## 5. Factor search (strict test) and luck check
713 cuts tried on 54 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
19 20:42 UK–20 02:18 UK: 105 at -21.1% · 20 02:22 UK–20 08:47 UK: 105 at -17.1% · 20 08:48 UK–20 15:18 UK: 105 at -10.2% · 20 15:21 UK–20 19:27 UK: 105 at -25.1% · 20 19:28 UK–21 01:22 UK: 104 at -10.2%
