# Diagnosis — C
_Data to 21 Oct 01:42 UK; ; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 94 | -11.2% | -12.1% | -16.2% | 35% | 36% | 42.5 | -0.517 | -1.14 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 94 | -9.2% | -9.7% | 38% | -15.2% | -8.4% | -3.7% | -4.3% |
| x_flow4 (current) | 94 | -11.2% | -12.1% | 35% | -17.2% | -11.3% | -4.8% | -6.0% |
| x_h5f14 | 94 | -12.2% | -13.2% | 32% | -16.5% | -10.1% | -10.0% | -9.9% |
| x_h3 | 94 | -13.1% | -13.9% | 31% | -16.3% | -11.1% | -11.8% | -12.2% |
| x_h5 | 94 | -13.4% | -14.3% | 32% | -17.8% | -10.4% | -11.8% | -10.8% |
| x_tsl40 | 94 | -14.0% | -15.8% | 20% | -25.2% | -17.4% | +0.9% | -2.0% |
| x_h15 | 93 | -15.0% | -16.2% | 38% | -22.0% | -14.2% | -8.3% | -8.9% |
| x_flow4ff | 94 | -15.6% | -16.6% | 22% | -22.2% | -16.4% | -7.9% | -9.5% |
| x_t2s40 | 94 | -15.5% | -16.6% | 24% | -27.2% | -22.2% | +3.4% | -1.2% |
| x_split | 94 | -14.8% | -16.6% | 19% | -23.9% | -18.6% | -1.5% | -5.4% |
| x_h2t40 | 94 | -14.4% | -17.5% | 24% | -26.3% | -17.3% | +0.7% | -3.3% |
| x_time | 94 | -21.0% | -24.2% | 20% | -32.1% | -20.9% | -9.8% | -12.9% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 7 | 7% | +67.4% | 1.13e+05 | 1.56e+03 | 20.6 | 4 | 0.988 | 0 | 71.2 | 52 | 25.2 | 0.141 | 146 | 32.2 | 1 | 4 | 5 | 15 | 2.43 | 0.963 |
| winners (0 to +50%) | 26 | 28% | +25.2% | 1.01e+05 | 1.77e+03 | 26 | 5 | 0.532 | 0.176 | 59.4 | 74 | 39.9 | 0.124 | 276 | 24.7 | 1 | 3 | 4 | 12 | 1.74 | 0.999 |
| small losers (-35% to 0) | 27 | 29% | -15.7% | 1.06e+05 | 2.38e+03 | 31.5 | 5 | 1 | 4.1e-15 | 35.4 | 37 | 18.9 | 0.161 | 163 | 25.7 | 1 | 3 | 7 | 7 | 1.12 | 1 |
| stopped (<= -35%) | 34 | 36% | -51.6% | 1.02e+05 | 1.24e+03 | 26.9 | 4 | 1.23 | 7.45e-16 | 74 | 60 | 37.2 | 0.158 | 155 | 26.5 | 1 | 4 | 2 | 8 | 1.11 | 0.954 |

## 4. Best 8 and worst 8 trades
- 20 Oct 06:19 UK **MONUMENTAL EGO** +77.6% — entry_mc 1.27e+05, age_s 70, bundle_pct 69, bundle_wallets 8, dev_buy_sol 0.0988, dev_hold_entry 0, sol60 30.8, wal60 25, sell60 25.2, max_share 0.094, holders_entry 39, top10_entry 67.2, has_socials 1, cc_n24h 3, snipers_n 7, peak_mult 2.07, fs10_x 1
- 19 Oct 02:46 UK **Maskmode** +76.4% — entry_mc 1.16e+05, age_s 3.5e+03, bundle_pct 20.6, bundle_wallets 4, dev_buy_sol 0.867, sol60 72, wal60 67, sell60 21.8, max_share 0.66, top10_entry 24.8, has_socials 1, peak_mult 2.57, fs10_x 0.935
- 20 Oct 21:05 UK **Energy Coin** +71.4% — entry_mc 1e+05, age_s 2.18e+03, bundle_pct 19.3, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 123, wal60 97, sell60 73.2, max_share 0.137, holders_entry 415, top10_entry 32.2, has_socials 1, cc_n24h 42, snipers_n 3, peak_mult 5.06, fs10_x 1.04
- 19 Oct 13:36 UK **web4** +68.9% — entry_mc 1.13e+05, age_s 1.56e+03, bundle_pct 3.42, bundle_wallets 1, dev_buy_sol 0.988, sol60 44.9, wal60 40, sell60 15.3, max_share 0.445, top10_entry 20.5, has_socials 1, cc_n24h 2, peak_mult 2.07, fs10_x 0.871
- 19 Oct 23:22 UK **Lucia the Baddie** +66.3% — entry_mc 2.02e+05, age_s 62, bundle_pct 20.1, bundle_wallets 1, dev_buy_sol 6.91, dev_hold_entry 0, sol60 80.8, wal60 14, sell60 0, max_share 0.3, holders_entry 21, top10_entry 54.5, has_socials 0, cc_n24h 2, snipers_n 0, peak_mult 2.43, fs10_x 1.01
- 19 Oct 20:30 UK **Kim Yo Jong** +60.6% — entry_mc 1.03e+05, age_s 2.82e+04, bundle_pct 25.5, bundle_wallets 6, dev_buy_sol 0, sol60 71.1, wal60 52, sell60 33.5, max_share 0.141, top10_entry 22.6, has_socials 0, cc_n24h 5, peak_mult 2.45, fs10_x 0.931
- 20 Oct 15:54 UK **JARVIS** +50.6% — entry_mc 1e+05, age_s 479, bundle_pct 61, bundle_wallets 8, dev_buy_sol 1.53, dev_hold_entry 5.21, sol60 71.2, wal60 115, sell60 60.8, max_share 0.03, holders_entry 252, top10_entry 54.1, cc_n24h 17, snipers_n 7, peak_mult 2.15, fs10_x 0.963
- 19 Oct 07:34 UK **Reversed Engineered Pepe** +44.1% — entry_mc 1e+05, age_s 794, bundle_pct 54.4, bundle_wallets 6, dev_buy_sol 0.889, dev_hold_entry 0, sol60 52, wal60 71, sell60 36.9, max_share 0.072, holders_entry 291, top10_entry 15.6, has_socials 1, peak_mult 1.86, fs10_x 0.978

Worst:
- 20 Oct 01:37 UK **GTAVI Mascot** -60.5% — entry_mc 1.51e+05, age_s 1.18e+03, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 4.94, sol60 74.5, wal60 10, sell60 0, max_share 0.325, cc_n24h 9, snipers_n 0, peak_mult 4.55, fs10_x 1.01
- 19 Oct 01:32 UK **Solana Cat** -56.9% — entry_mc 1.42e+05, age_s 60, bundle_pct 42.1, bundle_wallets 12, dev_buy_sol 0.294, dev_hold_entry 0.968, sol60 44.8, wal60 63, sell60 1.62, max_share 0.428, holders_entry 57, top10_entry 43.4, peak_mult 1.23, fs10_x 1.01
- 19 Oct 22:47 UK **Dacity Cat** -55.1% — entry_mc 1.46e+05, age_s 150, bundle_pct 13.4, bundle_wallets 2, dev_buy_sol 2.96, dev_hold_entry 0, sol60 70.9, wal60 10, sell60 0, max_share 0.271, holders_entry 19, top10_entry 54.7, cc_n24h 3, snipers_n 1, peak_mult 1.46, fs10_x 1
- 20 Oct 17:09 UK **cylo** -54.4% — entry_mc 1e+05, age_s 4.21e+03, bundle_pct 45.1, bundle_wallets 3, dev_buy_sol 0.716, sol60 30, wal60 22, sell60 14, max_share 0.661, top10_entry 25.4, has_socials 0, cc_n24h 4, peak_mult 1, fs10_x 0.963
- 20 Oct 18:27 UK **Poke Packz** -54.3% — entry_mc 1.04e+05, age_s 1.07e+03, bundle_pct 15.2, bundle_wallets 7, dev_buy_sol 0.988, sol60 80, wal60 47, sell60 32.6, max_share 0.044, top10_entry 30.2, has_socials 1, cc_n24h 1, peak_mult 1.1, fs10_x 0.849
- 19 Oct 09:46 UK **Mimi** -54.1% — entry_mc 1.02e+05, age_s 584, bundle_pct 25.3, bundle_wallets 4, dev_buy_sol 0, sol60 84.2, wal60 139, sell60 64.5, max_share 0.177, top10_entry 17.6, has_socials 1, peak_mult 1.03, fs10_x 0.939
- 20 Oct 05:42 UK **Tesla Roadster** -53.4% — entry_mc 1.01e+05, age_s 780, bundle_pct 52.4, bundle_wallets 1, dev_buy_sol 28.6, sol60 56.2, wal60 45, sell60 28.1, max_share 0.056, top10_entry 9.75, has_socials 1, cc_n24h 26, peak_mult 1.3, fs10_x 0.954
- 19 Oct 03:39 UK **Privacy Cat** -52.5% — entry_mc 1.02e+05, age_s 2.75e+04, bundle_pct 24.3, bundle_wallets 5, dev_buy_sol 3.16, sol60 37.5, wal60 57, sell60 23.6, max_share 0.2, top10_entry 25.5, has_socials 1, peak_mult 1.13, fs10_x 0.976

## 5. Factor search (strict test) and luck check
1116 cuts tried on 86 entry-time columns; 7 pass the strict test, 3 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| heat_trig1h < 34 | 16 | +11.7% | +7.9% | 78 at -15.9% | +2.7% / +13.7% / +13.9% | +0.078 | 3 |
| bundle_pct >= 51.95 | 14 | +11.1% | +6.0% | 80 at -15.1% | -10.5% / +17.5% / +16.8% | +0.064 | 7 |
| heat_win2h_dead < 8.4 | 23 | +4.1% | +1.1% | 71 at -16.1% | +2.7% / -7.2% / +12.1% | +0.033 | 12 |
| pre_m1_nb >= 81.75 | 17 | +4.4% | +0.2% | 77 at -14.6% | -13.2% / -8.6% / +38.3% | +0.026 | 13 |
| pre_min1_nb >= 81.75 | 17 | +4.4% | +0.2% | 77 at -14.6% | -13.2% / -8.6% / +38.3% | +0.026 | 13 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| heat_trig1h < 34 AND heat_win2h_dead < 8.4 | 12 | +11.6% | +6.4% | +2.7% / +12.2% / +15.2% | +0.057 |
| pre_m1_nb >= 81.75 AND pre_min1_nb >= 81.75 | 17 | +4.4% | +0.2% | -13.2% / -8.6% / +38.3% | +0.026 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:34 UK–19 04:23 UK: 19 at -26.3% · 19 04:25 UK–19 20:19 UK: 19 at -5.9% · 19 20:19 UK–20 02:32 UK: 19 at -10.4% · 20 03:07 UK–20 11:06 UK: 19 at -3.2% · 20 11:15 UK–21 00:44 UK: 18 at -10.0%
