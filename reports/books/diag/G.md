# Diagnosis — G
_Data to 21 Oct 01:42 UK; A's trigger on coins A skips for 150-500 wallets, 5-min; exit x_h5; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 116 | -3.7% | -8.9% | -11.9% | 46% | 41% | 53.0 | -0.248 | -0.54 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h15 | 114 | +3.6% | -1.7% | 49% | +18.6% | -6.4% | -2.0% | -5.8% |
| x_t15s40 | 116 | -6.4% | -6.8% | 49% | +2.3% | -18.3% | -3.0% | -6.6% |
| x_flow4 | 116 | -7.0% | -8.2% | 45% | -2.9% | -16.4% | -1.7% | -5.4% |
| x_flow4ff | 116 | -7.5% | -8.7% | 37% | -1.7% | -16.6% | -4.0% | -6.4% |
| x_h5 (current) | 116 | -3.7% | -8.9% | 46% | +18.2% | -22.0% | -7.3% | -9.6% |
| x_h5f14 | 116 | -4.1% | -9.3% | 46% | +15.2% | -23.3% | -4.2% | -6.7% |
| x_split | 116 | -7.2% | -9.7% | 30% | +4.9% | -16.5% | -10.1% | -11.4% |
| x_h3 | 116 | -6.6% | -10.3% | 41% | +9.1% | -25.4% | -3.5% | -6.3% |
| x_tsl40 | 116 | -9.0% | -10.8% | 29% | -12.1% | -10.8% | -3.9% | -6.4% |
| x_t2s40 | 116 | -11.0% | -11.9% | 32% | -8.8% | -14.3% | -10.0% | -13.0% |
| x_h2t40 | 116 | -12.5% | -15.1% | 32% | -8.6% | -17.2% | -11.7% | -14.6% |
| x_time | 115 | -41.0% | -42.9% | 19% | -40.1% | -46.2% | -36.6% | -38.8% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 6 | 5% | +234.1% | 4.16e+04 | 346 | 19.2 | 2 | 2.47 | 0 | 107 | 210 | 106 | 0.0595 | 242 | 29 | 1 | 15 | 0 | 2.5 | 7.48 | 0.997 |
| winners (0 to +50%) | 47 | 41% | +18.8% | 4.4e+04 | 357 | 23.5 | 5 | 0.772 | 0 | 76.2 | 204 | 73.9 | 0.044 | 382 | 22.2 | 1 | 9 | 4.5 | 17 | 1.99 | 1.02 |
| small losers (-35% to 0) | 15 | 13% | -14.6% | 4.98e+04 | 533 | 24.2 | 5 | 0.919 | 2.79e-16 | 30.2 | 227 | 26.2 | 0.042 | 1.02e+03 | 16.3 | 1 | 8 | 7.5 | 19 | 1.33 | 0.987 |
| stopped (<= -35%) | 48 | 41% | -52.0% | 4.69e+04 | 287 | 28.2 | 5 | 1.09 | 0 | 88.7 | 222 | 82.1 | 0.0455 | 373 | 22.8 | 1 | 13 | 4 | 18 | 1.2 | 0.944 |

## 4. Best 8 and worst 8 trades
- 19 Oct 04:18 UK **SpaceXSITeslaBoringaLink** +599.4% — entry_mc 5.03e+04, age_s 60, bundle_pct 31.5, bundle_wallets 2, dev_buy_sol 11.9, dev_hold_entry 0, sol60 368, wal60 399, sell60 358, max_share 0.014, holders_entry 270, top10_entry 35.2, has_socials 1, peak_mult 10.2, fs10_x 0.976
- 19 Oct 01:43 UK **Universal Basic Income** +296.0% — entry_mc 2.3e+04, age_s 129, bundle_pct 31.1, bundle_wallets 2, dev_buy_sol 11.9, dev_hold_entry 0, sol60 113, wal60 208, sell60 113, max_share 0.087, holders_entry 213, top10_entry 31.5, has_socials 1, peak_mult 10.7, fs10_x 1.2
- 21 Oct 01:25 UK **yumi umi** +176.0% — entry_mc 9.38e+04, age_s 100, bundle_pct 0, bundle_wallets 0, dev_buy_sol 0, sol60 166, wal60 177, sell60 155, max_share 0.057, top10_entry 21.8, cc_n24h 19, snipers_n 0, peak_mult 5.54, fs10_x 1.02
- 19 Oct 09:16 UK **1 share and a dream** +151.3% — entry_mc 3.29e+04, age_s 615, bundle_pct 12.1, bundle_wallets 7, dev_buy_sol 0, sol60 85.1, wal60 170, sell60 84.8, max_share 0.058, top10_entry 26.4, peak_mult 3.06, fs10_x 1.05
- 19 Oct 21:53 UK **nutcoin** +110.4% — entry_mc 2.91e+04, age_s 563, bundle_pct 23.3, bundle_wallets 11, dev_buy_sol 0, sol60 99.8, wal60 212, sell60 99.6, max_share 0.098, top10_entry 17.4, cc_n24h 15, peak_mult 2.45, fs10_x 0.884
- 20 Oct 01:41 UK **GTAVI Mascot** +71.4% — entry_mc 7.3e+04, age_s 1.4e+03, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 4.94, sol60 39.7, wal60 341, sell60 37, max_share 0.061, top10_entry 51.2, cc_n24h 9, snipers_n 0, peak_mult 9.42, fs10_x 0.928
- 19 Oct 19:42 UK **Krew** +48.9% — entry_mc 4.56e+04, age_s 406, bundle_pct 27.6, bundle_wallets 7, dev_buy_sol 0.87, sol60 30.1, wal60 163, sell60 27.4, max_share 0.058, top10_entry 17.2, has_socials 1, cc_n24h 1, peak_mult 1.92, fs10_x 0.991
- 19 Oct 12:51 UK **kem jung oon** +40.2% — entry_mc 4.72e+04, age_s 959, bundle_pct 24.3, bundle_wallets 5, dev_buy_sol 0, sol60 84.5, wal60 154, sell60 74.2, max_share 0.138, top10_entry 23.7, has_socials 0, cc_n24h 18, snipers_n 5, peak_mult 1.72, fs10_x 1.19

Worst:
- 20 Oct 21:08 UK **Lucky** -75.0% — entry_mc 4.35e+04, age_s 335, bundle_pct 28.3, bundle_wallets 14, dev_buy_sol 1.18, dev_hold_entry 2.79e-16, sol60 35.6, wal60 240, sell60 35.5, max_share 0.046, holders_entry 831, top10_entry 22.7, has_socials 1, cc_n24h 44, snipers_n 13, peak_mult 1.22, fs10_x 0.94
- 19 Oct 22:53 UK **Dacity Cat** -58.3% — entry_mc 7.85e+04, age_s 476, bundle_pct 13.4, bundle_wallets 2, dev_buy_sol 2.96, sol60 93.9, wal60 368, sell60 82.4, max_share 0.031, top10_entry 38.7, cc_n24h 3, snipers_n 1, peak_mult 1.25, fs10_x 1.05
- 20 Oct 17:25 UK **POKEWORLD** -57.4% — entry_mc 3.37e+04, age_s 374, bundle_pct 62.5, bundle_wallets 6, dev_buy_sol 35, dev_hold_entry 3.73e-15, sol60 62.5, wal60 165, sell60 61.5, max_share 0.038, holders_entry 418, top10_entry 26.1, has_socials 1, cc_n24h 4, snipers_n 5, peak_mult 1.05, fs10_x 0.948
- 19 Oct 23:10 UK **Lucia the Baddie** -56.8% — entry_mc 9.99e+04, age_s 286, bundle_pct 20.1, bundle_wallets 1, dev_buy_sol 6.91, dev_hold_entry 0, sol60 110, wal60 393, sell60 97.9, max_share 0.024, holders_entry 883, top10_entry 41.9, has_socials 0, cc_n24h 1, snipers_n 0, peak_mult 1.39, fs10_x 1.23
- 19 Oct 21:49 UK **inu wif sword** -54.3% — entry_mc 4.67e+04, age_s 428, bundle_pct 36.2, bundle_wallets 13, dev_buy_sol 0.762, dev_hold_entry 0, sol60 30, wal60 347, sell60 27.4, max_share 0.044, holders_entry 1.13e+03, top10_entry 12.1, has_socials 1, cc_n24h 20, snipers_n 12, peak_mult 1.08, fs10_x 1.01
- 20 Oct 10:21 UK **KOL coin** -54.2% — entry_mc 2.02e+04, age_s 272, bundle_pct 15.2, bundle_wallets 1, dev_buy_sol 0, dev_hold_entry 0, sol60 83.1, wal60 233, sell60 81.5, max_share 0.06, holders_entry 339, top10_entry 25.9, has_socials 1, cc_n24h 4, snipers_n 1, peak_mult 1.06, fs10_x 0.847
- 19 Oct 23:12 UK **Simppad** -54.1% — entry_mc 4.41e+04, age_s 422, bundle_pct 21.6, bundle_wallets 9, dev_buy_sol 0.474, dev_hold_entry 1.67, sol60 71.4, wal60 159, sell60 68.6, max_share 0.139, holders_entry 303, top10_entry 25.6, cc_n24h 2, snipers_n 8, peak_mult 1.2, fs10_x 1.09
- 20 Oct 01:34 UK **Poké Balls** -53.3% — entry_mc 4.28e+04, age_s 597, bundle_pct 9.94, bundle_wallets 2, dev_buy_sol 2.96, dev_hold_entry 0, sol60 71.2, wal60 167, sell60 71.1, max_share 0.051, holders_entry 402, top10_entry 25.8, has_socials 1, cc_n24h 37, snipers_n 1, peak_mult 1.23, fs10_x 0.895

## 5. Factor search (strict test) and luck check
1399 cuts tried on 128 entry-time columns; 33 pass the strict test, 14 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| gi_liquidity † < 1.546e+04 | 31 | +34.9% | +16.0% | 85 at -17.7% | +49.7% / +24.1% / +4.9% | +0.479 | 6 |
| gs_top_10_holder_rate † >= 0.1545 | 40 | +29.0% | +14.4% | 76 at -20.9% | +36.5% / +24.1% / +13.9% | +0.512 | 6 |
| gi_holder_count † < 990.2 | 36 | +30.5% | +14.2% | 80 at -19.0% | +37.5% / +15.8% / +16.5% | +0.484 | 6 |
| gi_visiting_count † >= 121.8 | 36 | +29.5% | +13.2% | 80 at -18.6% | +48.3% / +24.1% / +3.8% | +0.469 | 6 |
| gi_circulating_supply † < 9.967e+08 | 24 | +22.6% | +10.7% | 92 at -10.5% | +28.1% / +2.2% / +18.9% | +0.236 | 9 |
| gi_max_supply † < 9.967e+08 | 24 | +22.6% | +10.7% | 92 at -10.5% | +28.1% / +2.2% / +18.9% | +0.236 | 9 |
| gi_total_supply † < 9.967e+08 | 24 | +22.6% | +10.7% | 92 at -10.5% | +28.1% / +2.2% / +18.9% | +0.236 | 9 |
| gi_locked_ratio † == 0 | 47 | +21.0% | +8.4% | 69 at -20.5% | +38.2% / +8.7% / -0.8% | +0.429 | 10 |
| gi_total_fee † < 2.666 | 31 | +24.6% | +5.4% | 85 at -14.0% | +57.3% / -5.3% / -1.7% | +0.334 | 11 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| gs_top_10_holder_rate >= 0.1545 AND gi_visiting_count >= 121.8 | 30 | +41.3% | +22.1% | +51.4% / +24.1% / +27.3% | +0.553 |
| gi_holder_count < 990.2 AND gi_visiting_count >= 121.8 | 27 | +42.8% | +21.4% | +51.4% / +15.8% / +30.7% | +0.516 |
| gi_liquidity < 1.546e+04 AND gi_locked_ratio == 0 | 30 | +37.7% | +18.3% | +55.3% / +24.1% / +4.9% | +0.503 |
| gi_liquidity < 1.546e+04 AND gs_top_10_holder_rate >= 0.1545 | 30 | +36.5% | +17.1% | +49.7% / +24.1% / +7.6% | +0.487 |
| gi_visiting_count >= 121.8 AND gi_circulating_supply < 9.967e+08 | 17 | +32.7% | +16.2% | +30.8% / +29.8% / +41.9% | +0.246 |
| gi_visiting_count >= 121.8 AND gi_max_supply < 9.967e+08 | 17 | +32.7% | +16.2% | +30.8% / +29.8% / +41.9% | +0.246 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 21:10 UK–19 13:04 UK: 24 at +37.1% · 19 13:42 UK–19 19:55 UK: 23 at -11.5% · 19 20:16 UK–19 23:35 UK: 23 at -23.7% · 19 23:38 UK–20 17:52 UK: 23 at -18.3% · 20 18:09 UK–21 01:25 UK: 23 at -3.7%
