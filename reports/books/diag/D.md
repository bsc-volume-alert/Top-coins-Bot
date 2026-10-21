# Diagnosis — D
_Data to 21 Oct 01:42 UK; ; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 257 | -4.3% | -5.4% | -11.3% | 46% | 41% | 115.8 | -0.618 | -1.37 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 257 | -3.4% | -3.5% | 50% | -2.2% | -1.5% | -6.5% | -5.7% |
| x_flow4ff | 257 | -4.1% | -4.6% | 41% | -2.4% | -3.2% | -6.6% | -6.7% |
| x_flow4 (current) | 257 | -4.3% | -5.4% | 46% | -3.2% | -1.8% | -8.0% | -8.0% |
| x_t2s40 | 257 | -5.6% | -6.0% | 32% | -4.1% | -6.9% | -5.8% | -7.9% |
| x_h3 | 257 | -5.7% | -6.7% | 43% | -5.2% | -6.1% | -5.7% | -7.5% |
| x_h5f14 | 257 | -7.1% | -8.2% | 47% | -7.7% | -5.3% | -8.2% | -8.3% |
| x_h5 | 257 | -7.9% | -9.0% | 47% | -10.0% | -5.2% | -8.5% | -9.1% |
| x_h15 | 256 | -7.5% | -9.1% | 49% | -12.4% | -9.7% | -0.1% | -2.9% |
| x_split | 257 | -8.1% | -9.3% | 29% | -15.4% | -3.3% | -5.7% | -6.3% |
| x_h2t40 | 257 | -9.3% | -10.1% | 32% | -10.8% | -9.6% | -7.6% | -9.5% |
| x_tsl40 | 257 | -8.9% | -10.1% | 24% | -15.1% | -5.6% | -6.1% | -6.2% |
| x_time | 257 | -28.8% | -31.9% | 20% | -21.8% | -33.8% | -30.8% | -30.3% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 32 | 12% | +79.3% | 4.73e+04 | 639 | 28.2 | 4 | 1.23 | 0 | 50.6 | 112 | 45.9 | 0.088 | 232 | 24.3 | 1 | 6 | 4 | 15.5 | 2.79 | 1.06 |
| winners (0 to +50%) | 85 | 33% | +27.8% | 4.91e+04 | 493 | 26.2 | 4 | 1.53 | 0 | 50.7 | 92 | 44.9 | 0.088 | 277 | 24.9 | 1 | 4 | 4 | 13 | 2.13 | 1.02 |
| small losers (-35% to 0) | 34 | 13% | -15.0% | 5.28e+04 | 1.28e+03 | 18.4 | 4 | 0.827 | 0 | 50.8 | 73 | 41.8 | 0.094 | 201 | 25 | 1 | 6 | 4 | 11 | 1.3 | 0.993 |
| stopped (<= -35%) | 106 | 41% | -51.9% | 4.75e+04 | 632 | 27.1 | 5 | 0.988 | 0 | 51.5 | 93 | 46.2 | 0.097 | 258 | 24.2 | 1 | 5 | 4 | 14 | 1.2 | 0.935 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.94e+04, age_s 172, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 50.2, wal60 66, sell60 34.6, max_share 0.081, holders_entry 224, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.12
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 01:59 UK **The Bee** +110.5% — entry_mc 4.63e+04, age_s 1.03e+03, bundle_pct 25.8, bundle_wallets 7, dev_buy_sol 2.96, sol60 50.9, wal60 80, sell60 49.2, max_share 0.186, top10_entry 24.4, has_socials 1, peak_mult 3.48, fs10_x 1.09
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +94.8% — entry_mc 5.8e+04, age_s 71, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 50.3, wal60 70, sell60 36.7, max_share 0.064, holders_entry 222, top10_entry 10.6, has_socials 1, peak_mult 2.38, fs10_x 0.97
- 19 Oct 19:48 UK **the collectooor** +93.6% — entry_mc 3.84e+04, age_s 68, bundle_pct 32.4, bundle_wallets 4, dev_buy_sol 4, dev_hold_entry 0, sol60 50, wal60 102, sell60 48.4, max_share 0.099, holders_entry 215, top10_entry 25.4, has_socials 1, cc_n24h 22, snipers_n 3, peak_mult 4.59, fs10_x 1.06
- 20 Oct 21:18 UK **The Official Memecoin** +90.9% — entry_mc 7.29e+04, age_s 392, bundle_pct 36.3, bundle_wallets 5, dev_buy_sol 10, dev_hold_entry 1.82, sol60 57.7, wal60 46, sell60 15.1, max_share 0.606, holders_entry 394, top10_entry 25.9, has_socials 1, cc_n24h 3, snipers_n 4, peak_mult 2.44, fs10_x 1.09
- 20 Oct 02:01 UK **little rocket man** +83.6% — entry_mc 5.31e+04, age_s 70, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, sol60 51.3, wal60 93, sell60 41.7, max_share 0.08, holders_entry 237, top10_entry 11.3, has_socials 1, cc_n24h 11, snipers_n 5, peak_mult 2.81, fs10_x 1.19

Worst:
- 19 Oct 14:17 UK **Universal Basic Income Coin** -60.2% — entry_mc 4.13e+04, age_s 3.86e+03, bundle_pct 31.7, bundle_wallets 12, dev_buy_sol 1, sol60 66.4, wal60 127, sell60 66.3, max_share 0.03, top10_entry 22.9, has_socials 0, cc_n24h 8, peak_mult 1.27, fs10_x 0.803
- 20 Oct 22:44 UK **Shirley Coin** -57.8% — entry_mc 5.34e+04, age_s 91, bundle_pct 32.7, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, sol60 50, wal60 98, sell60 41.2, max_share 0.07, holders_entry 267, top10_entry 13.2, has_socials 1, cc_n24h 6, snipers_n 6, peak_mult 1.4, fs10_x 1.07
- 20 Oct 18:57 UK **memestock** -57.6% — entry_mc 4.64e+04, age_s 234, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 4.94, dev_hold_entry 0, sol60 50, wal60 127, sell60 47.4, max_share 0.197, holders_entry 400, top10_entry 31.3, has_socials 1, cc_n24h 54, snipers_n 0, peak_mult 1.25, fs10_x 1.07
- 20 Oct 22:58 UK **Omnii-1** -57.1% — entry_mc 4.49e+04, age_s 271, bundle_pct 17.9, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 54, wal60 119, sell60 53.7, max_share 0.092, holders_entry 555, top10_entry 24.9, has_socials 1, cc_n24h 11, snipers_n 3, peak_mult 1.22, fs10_x 0.962
- 20 Oct 22:12 UK **WIPD** -56.6% — entry_mc 4.48e+04, age_s 93, bundle_pct 6.32, bundle_wallets 1, dev_buy_sol 1.88, dev_hold_entry 6.32, sol60 66.9, wal60 136, sell60 66.4, max_share 0.075, holders_entry 179, top10_entry 27.8, has_socials 1, cc_n24h 2, snipers_n 0, peak_mult 1.07, fs10_x 0.963
- 19 Oct 09:30 UK **carfart** -55.9% — entry_mc 4.59e+04, age_s 460, bundle_pct 24.3, bundle_wallets 5, dev_buy_sol 3.06, dev_hold_entry 0, sol60 89.2, wal60 131, sell60 88.1, max_share 0.078, holders_entry 283, top10_entry 22.8, has_socials 0, peak_mult 1.1, fs10_x 0.876
- 20 Oct 02:24 UK **Collector Capital Markets** -55.2% — entry_mc 4.52e+04, age_s 105, bundle_pct 15.6, bundle_wallets 4, dev_buy_sol 3, dev_hold_entry 0, sol60 50.6, wal60 85, sell60 44.1, max_share 0.147, holders_entry 238, top10_entry 26.7, has_socials 1, cc_n24h 10, snipers_n 3, peak_mult 1.22, fs10_x 1.07
- 19 Oct 06:39 UK **Kibicoin** -54.9% — entry_mc 5.9e+04, age_s 82, bundle_pct 29.8, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, sol60 51.5, wal60 88, sell60 37, max_share 0.058, holders_entry 235, top10_entry 35.8, has_socials 1, peak_mult 8.09, fs10_x 0.901

## 5. Factor search (strict test) and luck check
1417 cuts tried on 127 entry-time columns; 25 pass the strict test, 18 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| dev_buy_sol >= 4.977 | 39 | +10.2% | +7.0% | 218 at -6.9% | +8.9% / +0.2% / +30.0% | +0.162 | 10 |
| pre_m2_b < 5294 | 45 | +12.4% | +6.4% | 212 at -7.9% | +42.4% / +9.1% / +7.1% | +0.230 | 14 |
| pre_m3_b < 5294 | 45 | +12.4% | +6.4% | 212 at -7.9% | +42.4% / +9.1% / +7.1% | +0.230 | 14 |
| pre_m5_b < 5294 | 45 | +12.4% | +6.4% | 212 at -7.9% | +42.4% / +9.1% / +7.1% | +0.230 | 14 |
| largest_entry >= 6.977 | 39 | +13.1% | +6.1% | 218 at -7.4% | +4.7% / +20.1% / +11.7% | +0.212 | 14 |
| dev_hold_entry >= 3.725e-16 | 59 | +10.2% | +5.6% | 198 at -8.7% | +3.3% / +15.9% / +9.7% | +0.244 | 14 |
| cc_best_mc24h >= 7.207e+04 | 44 | +11.8% | +5.6% | 213 at -7.7% | +9.4% / +16.0% / +0.9% | +0.213 | 14 |
| gi_holder_count † >= 301.6 | 38 | +12.2% | +5.0% | 219 at -7.2% | +8.1% / +29.0% / +6.4% | +0.192 | 17 |
| pre_min1_nb >= 102 | 66 | +6.9% | +4.9% | 191 at -8.2% | +20.6% / +11.5% / +1.1% | +0.175 | 17 |
| avg_buy_sol < 0.397 | 64 | +6.6% | +4.8% | 193 at -8.0% | +14.3% / +12.5% / -4.0% | +0.161 | 17 |
| pre_min1_b < 5273 | 46 | +9.4% | +3.5% | 211 at -7.3% | +25.1% / +9.7% / +2.2% | +0.174 | 20 |
| gs_top_10_holder_rate † < 0.2176 | 38 | +10.5% | +3.3% | 219 at -6.9% | +2.6% / +35.1% / +14.6% | +0.163 | 20 |
| pre_m1_b < 5274 | 47 | +9.0% | +3.2% | 210 at -7.3% | +25.1% / +9.0% / +2.2% | +0.169 | 20 |
| wal60 >= 102 | 91 | +3.9% | +2.4% | 166 at -8.8% | -0.7% / +11.5% / +1.1% | +0.118 | 20 |
| bundle_pct < 9.696 | 39 | +2.9% | +0.8% | 218 at -5.6% | +27.4% / +0.7% / -7.4% | +0.033 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| pre_m2_b < 5294 AND pre_m3_b < 5294 | 45 | +12.4% | +6.4% | +42.4% / +9.1% / +7.1% | +0.230 |
| pre_m2_b < 5294 AND pre_m5_b < 5294 | 45 | +12.4% | +6.4% | +42.4% / +9.1% / +7.1% | +0.230 |
| pre_m3_b < 5294 AND pre_m5_b < 5294 | 45 | +12.4% | +6.4% | +42.4% / +9.1% / +7.1% | +0.230 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:27 UK–19 05:10 UK: 52 at -1.4% · 19 05:32 UK–19 18:04 UK: 52 at -4.2% · 19 18:07 UK–20 02:14 UK: 51 at +1.1% · 20 02:23 UK–20 15:44 UK: 51 at -8.8% · 20 15:53 UK–21 00:58 UK: 51 at -8.4%
