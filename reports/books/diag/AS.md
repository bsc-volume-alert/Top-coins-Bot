# Diagnosis — AS
_Data to 21 Oct 01:42 UK; A + standard filters; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 80 | +10.9% | +7.6% | +14.7% | 59% | 31% | 36.8 | +0.365 | +0.79 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_flow4 (current) | 80 | +10.9% | +7.6% | 59% | +11.7% | +7.6% | +13.6% | +7.2% |
| x_flow4ff | 80 | +8.1% | +6.6% | 54% | +13.1% | -4.6% | +16.3% | +7.4% |
| x_t15s40 | 80 | +6.3% | +5.8% | 62% | +8.4% | -5.0% | +15.8% | +9.8% |
| x_t2s40 | 80 | +5.0% | +3.9% | 42% | +7.4% | +4.0% | +3.4% | +2.9% |
| x_h5f14 | 80 | +0.9% | -0.5% | 60% | -1.0% | -6.5% | +10.6% | +6.6% |
| x_h3 | 80 | -0.5% | -2.1% | 60% | +2.8% | -12.4% | +8.5% | +0.9% |
| x_h15 | 79 | -0.3% | -3.0% | 63% | -2.3% | -3.1% | +4.9% | -0.2% |
| x_h2t40 | 80 | -0.2% | -3.3% | 42% | -1.2% | -2.8% | +3.7% | +1.3% |
| x_h5 | 80 | -1.7% | -3.4% | 60% | -5.6% | -5.0% | +5.7% | +2.4% |
| x_tsl40 | 80 | -2.0% | -7.3% | 28% | -5.8% | -8.7% | +8.8% | +1.7% |
| x_split | 80 | -3.8% | -7.4% | 36% | -11.6% | -10.5% | +11.2% | +3.7% |
| x_time | 80 | -27.5% | -31.7% | 25% | -34.5% | -22.0% | -26.2% | -25.1% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 16 | 20% | +91.4% | 4.64e+04 | 582 | 27.8 | 5 | 0.169 | 3.73e-16 | 32.1 | 64.5 | 26 | 0.122 | 212 | 24.9 | 1 | 6 | 4 | 17.5 | 2.64 | 1.15 |
| winners (0 to +50%) | 31 | 39% | +27.3% | 4.62e+04 | 423 | 25.3 | 4 | 0.296 | 1.49e-15 | 31.8 | 61 | 27.1 | 0.117 | 254 | 26.4 | 1 | 6 | 4 | 13 | 2.04 | 1.05 |
| small losers (-35% to 0) | 8 | 10% | -14.6% | 5.03e+04 | 4.12e+03 | 13.6 | 2 | 1.09 | 4.05 | 31.5 | 60 | 25.7 | 0.122 | 260 | 22 | 1 | 3.5 | 3 | 14.5 | 1.39 | 0.971 |
| stopped (<= -35%) | 25 | 31% | -52.7% | 4.51e+04 | 764 | 22.4 | 4 | 0.988 | 1.38 | 34.3 | 74 | 33.2 | 0.126 | 208 | 25.9 | 1 | 9 | 0 | 13 | 1.14 | 0.961 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.97e+04, age_s 167, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 31.2, wal60 51, sell60 14.1, max_share 0.118, holders_entry 221, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.07
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 20:13 UK **Clerk** +101.7% — entry_mc 3.84e+04, age_s 162, bundle_pct 11.2, bundle_wallets 6, dev_buy_sol 0.14, sol60 31.8, wal60 42, sell60 18.2, max_share 0.149, top10_entry 31, has_socials 1, cc_n24h 14, peak_mult 3.22, fs10_x 1.54
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +96.7% — entry_mc 5.74e+04, age_s 66, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 31.2, wal60 43, sell60 17.3, max_share 0.102, holders_entry 215, top10_entry 11.7, has_socials 1, peak_mult 2.4, fs10_x 1.15
- 18 Oct 23:00 UK **saluteface** +84.7% — entry_mc 2.96e+04, age_s 2.55e+05, bundle_pct 12.6, bundle_wallets 3, dev_buy_sol 1, sol60 33.7, wal60 32, sell60 10, max_share 0.145, has_socials 1, peak_mult 4.01, fs10_x 1.49
- 19 Oct 16:39 UK **Octo** +83.5% — entry_mc 4.15e+04, age_s 2.17e+03, bundle_pct 34.8, bundle_wallets 8, dev_buy_sol 4.89, sol60 35.1, wal60 69, sell60 34.4, max_share 0.127, top10_entry 21.8, has_socials 1, cc_n24h 3, peak_mult 3.52, fs10_x 1.15
- 20 Oct 22:52 UK **MOCHI** +82.6% — entry_mc 6.79e+04, age_s 671, bundle_pct 0.352, bundle_wallets 1, dev_buy_sol 0.0988, sol60 32.2, wal60 42, sell60 9.14, max_share 0.155, top10_entry 15.5, cc_n24h 2, snipers_n 0, peak_mult 4.77, fs10_x 1.57

Worst:
- 20 Oct 04:34 UK **Tesla Roadster** -71.8% — entry_mc 2.93e+04, age_s 473, bundle_pct 52.4, bundle_wallets 1, dev_buy_sol 28.6, dev_hold_entry 17.3, sol60 30.5, wal60 33, sell60 4.16, max_share 0.102, holders_entry 90, top10_entry 42.5, has_socials 1, cc_n24h 11, snipers_n 0, peak_mult 1.11, fs10_x 0.36
- 19 Oct 22:27 UK **Slop Coin** -54.6% — entry_mc 3.5e+04, age_s 377, bundle_pct 33.9, bundle_wallets 4, dev_buy_sol 0.988, dev_hold_entry 3.34, sol60 38.3, wal60 49, sell60 37.3, max_share 0.129, holders_entry 106, top10_entry 33.3, has_socials 1, cc_n24h 8, snipers_n 3, peak_mult 1.4, fs10_x 1.2
- 20 Oct 23:28 UK **Hollow** -53.5% — entry_mc 5.08e+04, age_s 1.84e+03, bundle_pct 3.15, bundle_wallets 1, dev_buy_sol 0.909, dev_hold_entry 3.15, sol60 30.7, wal60 65, sell60 23.5, max_share 0.158, holders_entry 244, top10_entry 31.7, has_socials 1, cc_n24h 1, snipers_n 0, peak_mult 1.12, fs10_x 1.02
- 19 Oct 01:35 UK **The Black Swan** -53.0% — entry_mc 3.83e+04, age_s 1.9e+04, bundle_pct 22.4, bundle_wallets 5, dev_buy_sol 0, sol60 38.5, wal60 98, sell60 37.7, max_share 0.123, top10_entry 19.9, has_socials 1, peak_mult 1.16, fs10_x 1.07
- 20 Oct 10:34 UK **Haiku** -52.9% — entry_mc 4.33e+04, age_s 1.86e+03, bundle_pct 24.5, bundle_wallets 6, dev_buy_sol 2.96, sol60 31.4, wal60 69, sell60 30.1, max_share 0.15, top10_entry 28.6, has_socials 1, cc_n24h 12, snipers_n 5, peak_mult 1.22, fs10_x 0.959
- 19 Oct 15:07 UK **Wojak** -52.8% — entry_mc 6.2e+04, age_s 104, bundle_pct 2.75, bundle_wallets 1, dev_buy_sol 0.79, dev_hold_entry 2.75, sol60 31.1, wal60 34, sell60 15.9, max_share 0.135, holders_entry 67, top10_entry 59.1, has_socials 1, cc_n24h 50, snipers_n 0, peak_mult 1.5, fs10_x 0.633
- 19 Oct 17:19 UK **Backrooms** -52.6% — entry_mc 5.2e+04, age_s 6.18e+04, bundle_pct 3, bundle_wallets 1, dev_buy_sol 0.863, sol60 34.3, wal60 56, sell60 23.6, max_share 0.144, top10_entry 27.3, cc_n24h 9, peak_mult 1.04, fs10_x 0.958
- 19 Oct 12:36 UK **The Supreme Leader** -52.5% — entry_mc 4.61e+04, age_s 1.3e+03, bundle_pct 17.7, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 55.6, wal60 99, sell60 54.7, max_share 0.078, holders_entry 204, top10_entry 24.1, has_socials 1, cc_n24h 10, snipers_n 4, peak_mult 1.04, fs10_x 0.939

## 5. Factor search (strict test) and luck check
1168 cuts tried on 121 entry-time columns; 76 pass the strict test, 67 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| gi_visiting_count † < 41.5 | 13 | +48.1% | +29.1% | 67 at +3.7% | +31.6% / +109.0% / +27.2% | +0.282 | 11 |
| bundle_pct >= 35.46 | 20 | +38.3% | +25.8% | 60 at +1.8% | +35.9% / +44.8% / +31.3% | +0.343 | 13 |
| sell60 < 22.23 | 20 | +36.7% | +24.1% | 60 at +2.3% | +26.3% / +50.5% / +34.2% | +0.329 | 13 |
| wal60 < 46 | 19 | +27.6% | +23.5% | 61 at +5.7% | +41.8% / +9.6% / +30.9% | +0.232 | 14 |
| bundle_wallets >= 5 | 35 | +29.7% | +22.5% | 45 at -3.7% | +16.7% / +53.9% / +17.7% | +0.463 | 17 |
| n60 < 49.85 | 12 | +29.0% | +22.4% | 68 at +7.7% | +14.6% / +23.9% / +48.5% | +0.154 | 17 |
| avg_buy_sol >= 0.5631 | 28 | +28.8% | +19.6% | 52 at +1.3% | +20.6% / +24.1% / +42.3% | +0.358 | 20 |
| gi_liquidity † >= 1.432e+04 | 18 | +32.9% | +18.6% | 62 at +4.5% | +34.4% / +30.2% / +32.1% | +0.264 | 20 |
| largest_entry < 2.79 | 12 | +26.6% | +18.2% | 68 at +8.2% | +25.4% / +31.6% / +20.0% | +0.141 | 20 |
| gi_circulating_supply † >= 9.979e+08 | 23 | +28.6% | +17.4% | 57 at +3.8% | +23.5% / +36.4% / +32.8% | +0.292 | 20 |
| gi_max_supply † >= 9.979e+08 | 23 | +28.6% | +17.4% | 57 at +3.8% | +23.5% / +36.4% / +32.8% | +0.292 | 20 |
| gi_total_supply † >= 9.979e+08 | 23 | +28.6% | +17.4% | 57 at +3.8% | +23.5% / +36.4% / +32.8% | +0.292 | 20 |
| gi_trade_fee † < 2.582 | 29 | +23.7% | +14.7% | 51 at +3.7% | +15.3% / +36.3% / +31.3% | +0.303 | 20 |
| gw_big_realized † >= -269.1 | 23 | +25.8% | +14.4% | 57 at +4.9% | +16.8% / +33.2% / +19.8% | +0.263 | 20 |
| top10_entry < 21.79 | 20 | +19.4% | +14.2% | 60 at +8.1% | +15.7% / +23.4% / +20.0% | +0.170 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| gi_visiting_count < 41.5 AND bundle_wallets >= 5 | 8 | +81.4% | +53.5% | +61.7% / +189.2% / +29.3% | +0.296 |
| bundle_wallets >= 5 AND avg_buy_sol >= 0.5631 | 13 | +62.8% | +45.0% | +37.2% / +91.5% / +52.6% | +0.370 |
| wal60 < 46 AND bundle_wallets >= 5 | 9 | +48.0% | +41.3% | +81.7% / +45.2% / +29.3% | +0.195 |
| bundle_pct >= 35.46 AND bundle_wallets >= 5 | 14 | +56.3% | +39.4% | +39.2% / +80.4% / +36.7% | +0.356 |
| bundle_wallets >= 5 AND n60 < 49.85 | 8 | +40.9% | +32.2% | +37.1% / +49.1% / +34.3% | +0.147 |
| bundle_pct >= 35.46 AND avg_buy_sol >= 0.5631 | 11 | +53.1% | +30.8% | +54.8% / +44.7% / +70.9% | +0.264 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 21:32 UK–19 04:02 UK: 16 at +16.5% · 19 04:19 UK–19 17:10 UK: 16 at +15.3% · 19 17:19 UK–20 02:00 UK: 16 at +7.9% · 20 02:38 UK–20 16:24 UK: 16 at -4.5% · 20 18:09 UK–21 00:58 UK: 16 at +19.5%
