# Diagnosis — AS3
_Data to 21 Oct 01:42 UK; AS + launch bundle 5+ wallets; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 35 | +29.7% | +22.5% | +30.0% | 71% | 20% | 16.5 | +0.474 | +1.01 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_flow4 (current) | 35 | +29.7% | +22.5% | 71% | +14.7% | +56.6% | +16.9% | +13.1% |
| x_t2s40 | 35 | +22.9% | +21.0% | 57% | -5.8% | +62.7% | +10.7% | +15.6% |
| x_flow4ff | 35 | +22.4% | +19.1% | 66% | +16.7% | +31.2% | +19.0% | +14.9% |
| x_t15s40 | 35 | +18.7% | +18.1% | 77% | +9.1% | +28.6% | +18.3% | +18.4% |
| x_h2t40 | 35 | +12.7% | +10.2% | 57% | -14.8% | +46.7% | +5.6% | +8.7% |
| x_h5f14 | 35 | +12.8% | +9.7% | 74% | +1.5% | +18.3% | +19.1% | +18.4% |
| x_h3 | 35 | +11.9% | +8.4% | 74% | -2.5% | +25.1% | +13.3% | +14.0% |
| x_h15 | 35 | +13.6% | +7.9% | 77% | -4.5% | +36.2% | +8.8% | +8.6% |
| x_h5 | 35 | +10.5% | +7.1% | 74% | -4.5% | +22.9% | +13.5% | +12.8% |
| x_split | 35 | +4.5% | +1.5% | 51% | -20.3% | +23.9% | +10.3% | +8.8% |
| x_tsl40 | 35 | +2.3% | -0.7% | 40% | -12.4% | +18.7% | +0.5% | -2.3% |
| x_time | 35 | -24.1% | -33.3% | 29% | -39.5% | +4.6% | -38.8% | -38.7% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 10 | 29% | +105.6% | 4.55e+04 | 296 | 38.1 | 6.5 | 3.93 | 0.176 | 31.9 | 62 | 27.8 | 0.117 | 202 | 28.1 | 1 | 6 | 4.5 | 18 | 2.94 | 1.15 |
| winners (0 to +50%) | 15 | 43% | +26.2% | 4.59e+04 | 571 | 30 | 7 | 0.988 | 0 | 31.8 | 51 | 27.1 | 0.113 | 282 | 26.4 | 1 | 7 | 5 | 13 | 2.17 | 1.08 |
| small losers (-35% to 0) | 3 | 9% | -15.5% | 5.28e+04 | 69 | 42.6 | 5 | 0 | 0 | 30.2 | 55 | 22.5 | 0.114 | 246 | 11.6 | 1 | 11 | 5 | 2 | 2.2 | 0.964 |
| stopped (<= -35%) | 7 | 20% | -51.8% | 4.33e+04 | 1.07e+03 | 27.8 | 6 | 2.96 | 7.45e-16 | 31.4 | 77 | 30.4 | 0.147 | 228 | 23.4 | 1 | 12 | 6.5 | 10 | 1.16 | 0.959 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.97e+04, age_s 167, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 31.2, wal60 51, sell60 14.1, max_share 0.118, holders_entry 221, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.07
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 20:13 UK **Clerk** +101.7% — entry_mc 3.84e+04, age_s 162, bundle_pct 11.2, bundle_wallets 6, dev_buy_sol 0.14, sol60 31.8, wal60 42, sell60 18.2, max_share 0.149, top10_entry 31, has_socials 1, cc_n24h 14, peak_mult 3.22, fs10_x 1.54
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +96.7% — entry_mc 5.74e+04, age_s 66, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 31.2, wal60 43, sell60 17.3, max_share 0.102, holders_entry 215, top10_entry 11.7, has_socials 1, peak_mult 2.4, fs10_x 1.15
- 19 Oct 16:39 UK **Octo** +83.5% — entry_mc 4.15e+04, age_s 2.17e+03, bundle_pct 34.8, bundle_wallets 8, dev_buy_sol 4.89, sol60 35.1, wal60 69, sell60 34.4, max_share 0.127, top10_entry 21.8, has_socials 1, cc_n24h 3, peak_mult 3.52, fs10_x 1.15
- 20 Oct 21:04 UK **xingxing** +72.6% — entry_mc 4.68e+04, age_s 425, bundle_pct 21.7, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, sol60 30.6, wal60 79, sell60 27.7, max_share 0.163, holders_entry 193, top10_entry 31.1, has_socials 1, cc_n24h 4, snipers_n 7, peak_mult 3.37, fs10_x 1.1
- 18 Oct 22:46 UK **French Goku Hero** +66.7% — entry_mc 4.8e+04, age_s 2.27e+03, bundle_pct 47.7, bundle_wallets 12, dev_buy_sol 9.11, dev_hold_entry 10.4, sol60 30.2, wal60 24, sell60 24.4, max_share 0.107, holders_entry 86, top10_entry 32, has_socials 1, peak_mult 1.95, fs10_x 1.66

Worst:
- 19 Oct 01:35 UK **The Black Swan** -53.0% — entry_mc 3.83e+04, age_s 1.9e+04, bundle_pct 22.4, bundle_wallets 5, dev_buy_sol 0, sol60 38.5, wal60 98, sell60 37.7, max_share 0.123, top10_entry 19.9, has_socials 1, peak_mult 1.16, fs10_x 1.07
- 20 Oct 10:34 UK **Haiku** -52.9% — entry_mc 4.33e+04, age_s 1.86e+03, bundle_pct 24.5, bundle_wallets 6, dev_buy_sol 2.96, sol60 31.4, wal60 69, sell60 30.1, max_share 0.15, top10_entry 28.6, has_socials 1, cc_n24h 12, snipers_n 5, peak_mult 1.22, fs10_x 0.959
- 19 Oct 01:12 UK **Teddy The Squirrel** -52.2% — entry_mc 4.56e+04, age_s 373, bundle_pct 27.8, bundle_wallets 5, dev_buy_sol 3.95, sol60 30.1, wal60 53, sell60 26.9, max_share 0.132, top10_entry 22.2, has_socials 1, peak_mult 1.4, fs10_x 1.03
- 18 Oct 23:22 UK **Anthropic Universal Basic In** -52.1% — entry_mc 5.25e+04, age_s 6.94e+03, bundle_pct 30.6, bundle_wallets 5, dev_buy_sol 5, sol60 30.5, wal60 48, sell60 20.2, max_share 0.162, top10_entry 28.1, has_socials 1, peak_mult 1.21, fs10_x 1.05
- 19 Oct 00:55 UK **Kim The Fatty** -50.8% — entry_mc 6.05e+04, age_s 60, bundle_pct 43.6, bundle_wallets 8, dev_buy_sol 0, dev_hold_entry 0, sol60 59.2, wal60 93, sell60 43.4, max_share 0.056, holders_entry 242, top10_entry 10.6, has_socials 1, peak_mult 1.03, fs10_x 0.815
- 20 Oct 11:55 UK **The Last Hope** -50.8% — entry_mc 4.29e+04, age_s 343, bundle_pct 20.8, bundle_wallets 9, dev_buy_sol 2.96, dev_hold_entry 1.49e-15, sol60 33.7, wal60 77, sell60 33.2, max_share 0.147, holders_entry 215, top10_entry 26, has_socials 1, cc_n24h 49, snipers_n 8, peak_mult 1.09, fs10_x 0.873
- 19 Oct 21:44 UK **nOrigami** -50.8% — entry_mc 3.57e+04, age_s 1.07e+03, bundle_pct 35.1, bundle_wallets 8, dev_buy_sol 0.593, sol60 30.4, wal60 83, sell60 30.4, max_share 0.164, top10_entry 23.4, cc_n24h 2, peak_mult 1.02, fs10_x 0.86
- 21 Oct 00:58 UK **Where's the Airdrop?** -31.6% — entry_mc 5.28e+04, age_s 69, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, sol60 30, wal60 51, sell60 22.5, max_share 0.114, holders_entry 253, top10_entry 10.9, has_socials 1, cc_n24h 18, snipers_n 5, peak_mult 2.22, fs10_x 0.964

## 5. Factor search (strict test) and luck check
1099 cuts tried on 119 entry-time columns; 42 pass the strict test, 20 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| avg_buy_sol >= 0.5681 | 12 | +67.3% | +48.3% | 23 at +10.1% | +37.2% / +112.2% / +52.5% | +0.375 | 7 |
| age_s < 272.1 | 12 | +61.3% | +41.7% | 23 at +13.3% | +27.8% / +90.3% / +36.7% | +0.341 | 13 |
| hour_uk >= 11 | 18 | +53.2% | +40.1% | 17 at +4.9% | +15.2% / +74.5% / +40.4% | +0.443 | 15 |
| largest_entry >= 3.419 | 18 | +51.8% | +38.6% | 17 at +6.4% | +42.8% / +78.3% / +35.6% | +0.431 | 15 |
| max_share < 0.12 | 17 | +52.4% | +38.3% | 18 at +8.4% | +38.6% / +92.1% / +33.0% | +0.411 | 15 |
| holders_entry < 256 | 12 | +57.4% | +37.5% | 23 at +15.3% | +37.5% / +90.6% / +30.7% | +0.319 | 17 |
| gi_visiting_count † < 105 | 12 | +57.2% | +37.3% | 23 at +15.4% | +22.8% / +153.9% / +29.3% | +0.318 | 17 |
| top10_entry >= 28.19 | 12 | +56.2% | +36.1% | 23 at +16.0% | +42.7% / +112.2% / +19.4% | +0.312 | 17 |
| gi_total_fee † < 3.481 | 12 | +55.6% | +35.5% | 23 at +16.2% | +17.2% / +125.7% / +26.2% | +0.309 | 19 |
| bundle_pct >= 31.39 | 18 | +47.5% | +34.0% | 17 at +11.0% | +39.2% / +59.9% / +30.0% | +0.394 | 20 |
| dev_hold_entry >= 0 | 16 | +48.0% | +32.8% | 19 at +14.4% | +31.9% / +79.5% / +26.4% | +0.354 | 20 |
| feed_lag_ms < 1112 | 23 | +42.9% | +32.3% | 12 at +4.5% | +24.4% / +68.0% / +35.5% | +0.454 | 20 |
| sol60 >= 31.13 | 23 | +42.7% | +32.1% | 12 at +4.8% | +23.8% / +82.7% / +17.9% | +0.452 | 20 |
| n60 < 54 | 11 | +37.0% | +30.6% | 24 at +26.4% | +37.2% / +57.4% / +21.5% | +0.187 | 20 |
| gs_top_10_holder_rate † >= 0.2136 | 13 | +35.5% | +30.0% | 22 at +26.3% | +22.9% / +75.4% / +24.5% | +0.211 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| hour_uk >= 11 AND max_share < 0.12 | 10 | +79.1% | +57.2% | +48.8% / +118.3% / +55.2% | +0.368 |
| hour_uk >= 11 AND largest_entry >= 3.419 | 12 | +71.9% | +53.3% | +48.8% / +94.3% / +58.7% | +0.401 |
| largest_entry >= 3.419 AND max_share < 0.12 | 10 | +72.5% | +49.9% | +50.0% / +118.2% / +55.2% | +0.337 |
| max_share < 0.12 AND holders_entry < 256 | 9 | +70.3% | +44.6% | +37.5% / +104.9% / +50.5% | +0.294 |
| age_s < 272.1 AND holders_entry < 256 | 8 | +70.4% | +40.9% | +23.0% / +104.0% / +50.5% | +0.262 |
| age_s < 272.1 AND max_share < 0.12 | 8 | +67.3% | +37.4% | +23.0% / +127.5% / +36.7% | +0.250 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 22:46 UK–19 01:35 UK: 7 at -7.3% · 19 01:42 UK–19 15:41 UK: 7 at +55.3% · 19 16:39 UK–19 22:14 UK: 7 at +73.0% · 20 00:26 UK–20 11:55 UK: 7 at -10.9% · 20 15:21 UK–21 00:58 UK: 7 at +38.7%
