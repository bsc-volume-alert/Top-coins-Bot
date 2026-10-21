# Diagnosis — F
_Data to 21 Oct 01:42 UK; A with launch bundle <= 3 wallets; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 116 | -1.9% | -2.9% | +2.8% | 51% | 33% | 52.2 | -0.153 | -0.34 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 116 | -0.1% | -0.5% | 54% | +14.2% | -13.2% | -1.4% | -4.2% |
| x_split | 116 | +0.7% | -1.7% | 34% | +9.8% | +0.5% | -8.6% | -8.2% |
| x_flow4 (current) | 116 | -1.9% | -2.9% | 51% | +13.4% | -15.8% | -3.4% | -6.8% |
| x_flow4ff | 116 | -2.4% | -3.4% | 46% | +15.3% | -15.0% | -7.5% | -10.7% |
| x_h5 | 116 | -1.6% | -3.6% | 51% | +9.0% | -9.1% | -5.0% | -9.1% |
| x_tsl40 | 116 | -0.6% | -4.2% | 32% | +8.6% | -1.1% | -9.4% | -3.7% |
| x_h3 | 116 | -2.2% | -4.3% | 51% | +8.6% | -11.7% | -3.6% | -7.9% |
| x_h5f14 | 116 | -2.8% | -4.8% | 51% | +12.0% | -18.0% | -2.2% | -6.7% |
| x_t2s40 | 116 | -4.5% | -5.3% | 36% | +16.8% | -16.7% | -13.9% | -15.2% |
| x_h15 | 113 | -2.8% | -5.4% | 54% | +10.2% | -13.9% | -4.7% | -9.1% |
| x_h2t40 | 116 | -5.2% | -7.5% | 36% | +10.2% | -10.0% | -16.2% | -14.1% |
| x_time | 116 | -18.8% | -21.8% | 28% | -7.2% | -27.0% | -22.2% | -17.5% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 10 | 9% | +72.3% | 5.17e+04 | 3.25e+03 | 8.15 | 2 | 0.623 | 3.62 | 34.3 | 55 | 18.3 | 0.167 | 218 | 24.1 | 1 | 3 | 0.5 | 20 | 3.17 | 1.2 |
| winners (0 to +50%) | 49 | 42% | +26.4% | 4.64e+04 | 551 | 15.2 | 2 | 1 | 0.602 | 31.2 | 66 | 29.4 | 0.099 | 264 | 24.8 | 1 | 3 | 1 | 13 | 1.86 | 1.03 |
| small losers (-35% to 0) | 19 | 16% | -13.2% | 4.72e+04 | 7.21e+03 | 9.94 | 1 | 1.98 | 4.05 | 31.1 | 57 | 24.7 | 0.12 | 314 | 27.4 | 1 | 1 | 1 | 15 | 1.19 | 0.988 |
| stopped (<= -35%) | 38 | 33% | -52.3% | 4.52e+04 | 484 | 14.6 | 1.5 | 1.75 | 0 | 32.5 | 68.5 | 28.1 | 0.13 | 217 | 27.2 | 1 | 8.5 | 0.5 | 15.5 | 1.23 | 0.983 |

## 4. Best 8 and worst 8 trades
- 18 Oct 23:35 UK **Ultraviolet** +110.7% — entry_mc 4.23e+04, age_s 1.25e+03, bundle_pct 13.2, bundle_wallets 2, dev_buy_sol 0.247, dev_hold_entry 0, sol60 35, wal60 73, sell60 34.8, max_share 0.17, holders_entry 281, top10_entry 27.2, has_socials 1, peak_mult 2.72, fs10_x 1.23
- 18 Oct 20:49 UK **CatGPT** +87.6% — entry_mc 7.45e+04, age_s 1.16e+03, bundle_pct 7.25, bundle_wallets 1, dev_buy_sol 2.17, sol60 31.1, wal60 85, sell60 16.1, max_share 0.08, top10_entry 5.5, peak_mult 2.95, fs10_x 1.38
- 18 Oct 23:00 UK **saluteface** +84.7% — entry_mc 2.96e+04, age_s 2.55e+05, bundle_pct 12.6, bundle_wallets 3, dev_buy_sol 1, sol60 33.7, wal60 32, sell60 10, max_share 0.145, has_socials 1, peak_mult 4.01, fs10_x 1.49
- 20 Oct 22:52 UK **MOCHI** +82.6% — entry_mc 6.79e+04, age_s 671, bundle_pct 0.352, bundle_wallets 1, dev_buy_sol 0.0988, sol60 32.2, wal60 42, sell60 9.14, max_share 0.155, top10_entry 15.5, cc_n24h 2, snipers_n 0, peak_mult 4.77, fs10_x 1.57
- 19 Oct 03:29 UK **Ideal Pad** +69.9% — entry_mc 4.23e+04, age_s 5.24e+03, bundle_pct 15.1, bundle_wallets 3, dev_buy_sol 2.25, sol60 42, wal60 75, sell60 34.7, max_share 0.235, top10_entry 23.4, has_socials 0, peak_mult 3.39, fs10_x 1.17
- 20 Oct 00:11 UK **PackPump** +61.2% — entry_mc 6.93e+04, age_s 9.08e+03, bundle_pct 6.94, bundle_wallets 2, dev_buy_sol 0.0988, sol60 50.7, wal60 35, sell60 18.9, max_share 0.493, top10_entry 24.1, has_socials 1, cc_n24h 3, peak_mult 3.77, fs10_x 1.37
- 18 Oct 20:29 UK **American Overwatch Protocol** +60.7% — entry_mc 4.92e+04, age_s 9.71e+04, bundle_pct 0.352, bundle_wallets 1, dev_buy_sol 0.0988, sol60 35.1, wal60 17, sell60 5.95, max_share 0.24, top10_entry 27.1, peak_mult 2.52, fs10_x 1.11
- 20 Oct 22:58 UK **WIPD** +59.2% — entry_mc 5.43e+04, age_s 570, bundle_pct 9.06, bundle_wallets 2, dev_buy_sol 2.17, dev_hold_entry 7.25, sol60 30.2, wal60 39, sell60 20.9, max_share 0.298, holders_entry 154, top10_entry 27.7, has_socials 1, cc_n24h 5, snipers_n 1, peak_mult 6.49, fs10_x 0.754

Worst:
- 20 Oct 04:34 UK **Tesla Roadster** -71.8% — entry_mc 2.93e+04, age_s 473, bundle_pct 52.4, bundle_wallets 1, dev_buy_sol 28.6, dev_hold_entry 17.3, sol60 30.5, wal60 33, sell60 4.16, max_share 0.102, holders_entry 90, top10_entry 42.5, has_socials 1, cc_n24h 11, snipers_n 0, peak_mult 1.11, fs10_x 0.36
- 20 Oct 15:44 UK **dog** -64.6% — entry_mc 1.46e+04, age_s 193, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.0288, sol60 34.6, wal60 21, sell60 29.8, max_share 0.35, holders_entry 26, top10_entry 8.27, has_socials 0, cc_n24h 12, snipers_n 0, peak_mult 1.31
- 19 Oct 22:58 UK **American Dream** -56.8% — entry_mc 4.83e+04, age_s 197, bundle_pct 24.1, bundle_wallets 3, dev_buy_sol 5, dev_hold_entry 0, sol60 30.3, wal60 68, sell60 27.8, max_share 0.326, holders_entry 282, top10_entry 27.9, has_socials 1, cc_n24h 32, snipers_n 2, peak_mult 1.02
- 20 Oct 22:12 UK **WIPD** -56.6% — entry_mc 4.48e+04, age_s 93, bundle_pct 6.32, bundle_wallets 1, dev_buy_sol 1.88, dev_hold_entry 6.32, sol60 66.9, wal60 136, sell60 66.4, max_share 0.075, holders_entry 179, top10_entry 27.8, has_socials 1, cc_n24h 2, snipers_n 0, peak_mult 1.07, fs10_x 0.963
- 20 Oct 18:57 UK **memestock** -55.0% — entry_mc 4.41e+04, age_s 228, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 4.94, dev_hold_entry 0, sol60 32, wal60 89, sell60 31.6, max_share 0.05, holders_entry 387, top10_entry 31.8, has_socials 1, cc_n24h 54, snipers_n 0, peak_mult 1.31, fs10_x 1.11
- 20 Oct 20:08 UK **Xitter** -54.0% — entry_mc 5.11e+04, age_s 5.36e+03, bundle_pct 23, bundle_wallets 2, dev_buy_sol 0.296, sol60 30.1, wal60 42, sell60 22.5, max_share 0.471, top10_entry 28.3, has_socials 1, cc_n24h 76, peak_mult 1.18, fs10_x 1.04
- 19 Oct 19:03 UK **PESODEPEPE** -53.6% — entry_mc 1.56e+04, age_s 84, bundle_pct 5.67, bundle_wallets 1, dev_buy_sol 1.67, dev_hold_entry 5.67, sol60 30.3, wal60 14, sell60 22.8, max_share 0.299, holders_entry 8, top10_entry 31.4, has_socials 0, cc_n24h 0, snipers_n 0, peak_mult 1.05, fs10_x 0.382
- 20 Oct 04:12 UK **Tesla Roadster** -53.6% — entry_mc 4.77e+04, age_s 206, bundle_pct 52.7, bundle_wallets 2, dev_buy_sol 28.6, dev_hold_entry 47.3, sol60 31, wal60 50, sell60 25.9, max_share 0.094, holders_entry 92, top10_entry 11.2, has_socials 1, cc_n24h 6, snipers_n 1, peak_mult 1.27, fs10_x 0.974

## 5. Factor search (strict test) and luck check
1169 cuts tried on 91 entry-time columns; 18 pass the strict test, 46 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| feed_lag_ms < 688 | 29 | +9.1% | +6.5% | 87 at -5.6% | +27.0% / +3.7% / -1.7% | +0.106 | 19 |
| largest_entry < 3.159 | 29 | +8.8% | +6.0% | 87 at -5.5% | +18.3% / -2.2% / +8.3% | +0.102 | 19 |
| top10_entry < 19 | 18 | +9.0% | +4.4% | 98 at -3.9% | +29.0% / -3.7% / +1.8% | +0.065 | 20 |
| bundle_wallets == 2 | 39 | +6.8% | +4.1% | 77 at -6.3% | +24.3% / -0.9% / -1.1% | +0.102 | 20 |
| dev_buy_sol < 1.006 | 58 | +4.1% | +2.2% | 58 at -8.0% | +18.0% / -14.4% / +6.8% | +0.081 | 20 |
| age_s >= 482.2 | 75 | +3.1% | +1.6% | 41 at -11.1% | +16.4% / -10.1% / +1.3% | +0.070 | 20 |
| factory == 0 | 93 | +2.7% | +1.5% | 23 at -20.7% | +16.4% / -12.2% / +1.3% | +0.072 | 20 |
| avg_buy_sol < 0.3237 | 18 | +5.9% | +1.1% | 98 at -3.4% | +16.0% / +4.3% / -3.3% | +0.040 | 20 |
| wal60 < 42 | 28 | +3.6% | +0.6% | 88 at -3.7% | +16.2% / -7.9% / +1.8% | +0.033 | 20 |
| holders_entry >= 245.5 | 31 | +3.8% | +0.2% | 85 at -4.0% | +14.2% / -6.0% / +4.1% | +0.039 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| top10_entry < 19 AND age_s >= 482.2 | 9 | +24.4% | +16.6% | +56.4% / +3.8% / +10.8% | +0.095 |
| bundle_wallets == 2 AND age_s >= 482.2 | 31 | +18.7% | +15.7% | +24.3% / +19.8% / +10.1% | +0.248 |
| factory == 0 AND avg_buy_sol < 0.3237 | 13 | +19.8% | +14.1% | +27.3% / +4.1% / +16.9% | +0.110 |
| largest_entry < 3.159 AND top10_entry < 19 | 16 | +17.4% | +12.7% | +29.0% / +5.7% / +15.1% | +0.118 |
| largest_entry < 3.159 AND factory == 0 | 21 | +13.9% | +10.2% | +23.8% / +4.0% / +8.3% | +0.122 |
| feed_lag_ms < 688 AND bundle_wallets == 2 | 10 | +12.6% | +8.2% | +45.1% / +8.1% / -1.6% | +0.052 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 20:25 UK–19 05:31 UK: 24 at +21.9% · 19 05:31 UK–19 18:08 UK: 23 at -5.2% · 19 18:43 UK–20 04:20 UK: 23 at -17.7% · 20 04:34 UK–20 16:56 UK: 23 at -4.9% · 20 16:57 UK–21 00:19 UK: 23 at -4.8%
