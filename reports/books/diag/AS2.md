# Diagnosis — AS2
_Data to 21 Oct 01:42 UK; AS + launch bundle 2+ wallets; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 63 | +18.6% | +14.4% | +23.9% | 65% | 25% | 29.7 | +0.522 | +1.11 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_flow4 (current) | 63 | +18.6% | +14.4% | 65% | +17.6% | +26.7% | +11.4% | +9.5% |
| x_t15s40 | 63 | +13.2% | +12.7% | 70% | +13.5% | +9.3% | +16.7% | +15.1% |
| x_flow4ff | 63 | +14.5% | +12.6% | 60% | +18.8% | +8.9% | +15.9% | +11.0% |
| x_t2s40 | 63 | +10.7% | +9.4% | 46% | +7.6% | +23.2% | +1.1% | +5.8% |
| x_h5f14 | 63 | +7.6% | +5.8% | 68% | +4.5% | +4.9% | +13.4% | +13.5% |
| x_h3 | 63 | +6.0% | +3.9% | 67% | +8.9% | -0.9% | +9.9% | +6.7% |
| x_h5 | 63 | +4.6% | +2.6% | 68% | -1.1% | +6.7% | +8.2% | +8.7% |
| x_h15 | 63 | +5.9% | +2.6% | 70% | +1.5% | +10.9% | +5.4% | +3.9% |
| x_h2t40 | 63 | +5.8% | +1.8% | 46% | -0.2% | +12.9% | +4.5% | +6.3% |
| x_split | 63 | +2.0% | -2.4% | 41% | -6.5% | +0.4% | +12.1% | +9.7% |
| x_tsl40 | 63 | +4.0% | -2.6% | 32% | -1.0% | +0.1% | +12.8% | +9.1% |
| x_time | 63 | -22.9% | -28.2% | 27% | -34.0% | -12.7% | -22.1% | -21.7% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 15 | 24% | +92.0% | 4.61e+04 | 492 | 27.9 | 5 | 0.198 | 3.73e-16 | 32 | 68 | 27.7 | 0.118 | 212 | 26.2 | 1 | 8 | 4 | 16 | 2.6 | 1.14 |
| winners (0 to +50%) | 26 | 41% | +27.1% | 4.77e+04 | 498 | 30.3 | 5 | 0.19 | 0 | 31.7 | 53.5 | 26.9 | 0.132 | 265 | 26.7 | 1 | 6 | 4 | 9 | 2.14 | 1.06 |
| small losers (-35% to 0) | 6 | 10% | -14.5% | 5.03e+04 | 1.68e+03 | 17.8 | 3.5 | 1.04 | 4.05 | 30.6 | 59 | 25.7 | 0.117 | 260 | 23.6 | 1 | 3.5 | 3 | 8.5 | 1.51 | 0.971 |
| stopped (<= -35%) | 16 | 25% | -51.8% | 4.47e+04 | 810 | 26.2 | 4 | 0.927 | 1.49e-15 | 38.1 | 75.5 | 36.3 | 0.121 | 208 | 23.7 | 1 | 3 | 4 | 11.5 | 1.14 | 0.955 |

## 4. Best 8 and worst 8 trades
- 19 Oct 21:58 UK **Spidey Show** +276.6% — entry_mc 5.97e+04, age_s 167, bundle_pct 65.9, bundle_wallets 5, dev_buy_sol 0.0988, dev_hold_entry 0.352, sol60 31.2, wal60 51, sell60 14.1, max_share 0.118, holders_entry 221, top10_entry 42.1, has_socials 1, cc_n24h 2, snipers_n 4, peak_mult 20.6, fs10_x 1.07
- 20 Oct 21:50 UK **SpaceXSuperIntelligence** +132.7% — entry_mc 4.61e+04, age_s 60, bundle_pct 39.5, bundle_wallets 5, dev_buy_sol 11.9, dev_hold_entry 0.934, sol60 126, wal60 102, sell60 122, max_share 0.037, holders_entry 91, top10_entry 27.4, has_socials 1, cc_n24h 52, snipers_n 4, peak_mult 2.68, fs10_x 1.71
- 19 Oct 15:41 UK **The Fearless Yorkie** +118.6% — entry_mc 2.74e+04, age_s 114, bundle_pct 41.4, bundle_wallets 6, dev_buy_sol 2.96, dev_hold_entry 3.73e-16, sol60 50, wal60 139, sell60 50, max_share 0.06, holders_entry 212, top10_entry 21.1, has_socials 1, cc_n24h 8, snipers_n 5, peak_mult 3.2, fs10_x 2.1
- 19 Oct 20:13 UK **Clerk** +101.7% — entry_mc 3.84e+04, age_s 162, bundle_pct 11.2, bundle_wallets 6, dev_buy_sol 0.14, sol60 31.8, wal60 42, sell60 18.2, max_share 0.149, top10_entry 31, has_socials 1, cc_n24h 14, peak_mult 3.22, fs10_x 1.54
- 19 Oct 01:42 UK **SpaceX Universal Basic Incom** +96.7% — entry_mc 5.74e+04, age_s 66, bundle_pct 44.6, bundle_wallets 9, dev_buy_sol 0, dev_hold_entry 0, sol60 31.2, wal60 43, sell60 17.3, max_share 0.102, holders_entry 215, top10_entry 11.7, has_socials 1, peak_mult 2.4, fs10_x 1.15
- 18 Oct 23:00 UK **saluteface** +84.7% — entry_mc 2.96e+04, age_s 2.55e+05, bundle_pct 12.6, bundle_wallets 3, dev_buy_sol 1, sol60 33.7, wal60 32, sell60 10, max_share 0.145, has_socials 1, peak_mult 4.01, fs10_x 1.49
- 19 Oct 16:39 UK **Octo** +83.5% — entry_mc 4.15e+04, age_s 2.17e+03, bundle_pct 34.8, bundle_wallets 8, dev_buy_sol 4.89, sol60 35.1, wal60 69, sell60 34.4, max_share 0.127, top10_entry 21.8, has_socials 1, cc_n24h 3, peak_mult 3.52, fs10_x 1.15
- 20 Oct 21:04 UK **xingxing** +72.6% — entry_mc 4.68e+04, age_s 425, bundle_pct 21.7, bundle_wallets 7, dev_buy_sol 0, dev_hold_entry 0, sol60 30.6, wal60 79, sell60 27.7, max_share 0.163, holders_entry 193, top10_entry 31.1, has_socials 1, cc_n24h 4, snipers_n 7, peak_mult 3.37, fs10_x 1.1

Worst:
- 19 Oct 22:27 UK **Slop Coin** -54.6% — entry_mc 3.5e+04, age_s 377, bundle_pct 33.9, bundle_wallets 4, dev_buy_sol 0.988, dev_hold_entry 3.34, sol60 38.3, wal60 49, sell60 37.3, max_share 0.129, holders_entry 106, top10_entry 33.3, has_socials 1, cc_n24h 8, snipers_n 3, peak_mult 1.4, fs10_x 1.2
- 19 Oct 01:35 UK **The Black Swan** -53.0% — entry_mc 3.83e+04, age_s 1.9e+04, bundle_pct 22.4, bundle_wallets 5, dev_buy_sol 0, sol60 38.5, wal60 98, sell60 37.7, max_share 0.123, top10_entry 19.9, has_socials 1, peak_mult 1.16, fs10_x 1.07
- 20 Oct 10:34 UK **Haiku** -52.9% — entry_mc 4.33e+04, age_s 1.86e+03, bundle_pct 24.5, bundle_wallets 6, dev_buy_sol 2.96, sol60 31.4, wal60 69, sell60 30.1, max_share 0.15, top10_entry 28.6, has_socials 1, cc_n24h 12, snipers_n 5, peak_mult 1.22, fs10_x 0.959
- 19 Oct 12:36 UK **The Supreme Leader** -52.5% — entry_mc 4.61e+04, age_s 1.3e+03, bundle_pct 17.7, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, sol60 55.6, wal60 99, sell60 54.7, max_share 0.078, holders_entry 204, top10_entry 24.1, has_socials 1, cc_n24h 10, snipers_n 4, peak_mult 1.04, fs10_x 0.939
- 20 Oct 23:33 UK **Pokemon Sol-Silver** -52.3% — entry_mc 4.43e+04, age_s 89, bundle_pct 15.4, bundle_wallets 4, dev_buy_sol 2.47, dev_hold_entry 5.19, sol60 47.6, wal60 88, sell60 47, max_share 0.073, holders_entry 212, top10_entry 21.8, has_socials 1, cc_n24h 1, snipers_n 3, peak_mult 1.06, fs10_x 1.01
- 19 Oct 01:12 UK **Teddy The Squirrel** -52.2% — entry_mc 4.56e+04, age_s 373, bundle_pct 27.8, bundle_wallets 5, dev_buy_sol 3.95, sol60 30.1, wal60 53, sell60 26.9, max_share 0.132, top10_entry 22.2, has_socials 1, peak_mult 1.4, fs10_x 1.03
- 18 Oct 23:22 UK **Anthropic Universal Basic In** -52.1% — entry_mc 5.25e+04, age_s 6.94e+03, bundle_pct 30.6, bundle_wallets 5, dev_buy_sol 5, sol60 30.5, wal60 48, sell60 20.2, max_share 0.162, top10_entry 28.1, has_socials 1, peak_mult 1.21, fs10_x 1.05
- 19 Oct 21:53 UK **ARE YOU READY?** -51.8% — entry_mc 7.34e+04, age_s 348, bundle_pct 60.9, bundle_wallets 4, dev_buy_sol 0, sol60 34.3, wal60 33, sell60 29.9, max_share 0.142, top10_entry 19.4, has_socials 1, cc_n24h 1, peak_mult 1.08, fs10_x 0.756

## 5. Factor search (strict test) and luck check
1115 cuts tried on 119 entry-time columns; 39 pass the strict test, 41 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| sell60 < 22.19 | 16 | +49.9% | +34.8% | 47 at +7.9% | +37.6% / +89.4% / +22.1% | +0.369 | 9 |
| wal60 < 45.5 | 16 | +35.4% | +31.0% | 47 at +12.8% | +60.7% / +30.1% / +20.3% | +0.259 | 12 |
| bundle_pct >= 34.17 | 22 | +40.7% | +29.4% | 41 at +6.7% | +35.9% / +48.7% / +31.3% | +0.411 | 14 |
| gi_circulating_supply † >= 1e+09 | 16 | +41.1% | +25.4% | 47 at +10.9% | +20.9% / +92.9% / +32.8% | +0.303 | 18 |
| gi_max_supply † >= 1e+09 | 16 | +41.1% | +25.4% | 47 at +10.9% | +20.9% / +92.9% / +32.8% | +0.303 | 18 |
| gi_total_supply † >= 1e+09 | 16 | +41.1% | +25.4% | 47 at +10.9% | +20.9% / +92.9% / +32.8% | +0.303 | 18 |
| gi_visiting_count † < 70 | 15 | +42.0% | +25.2% | 48 at +11.3% | +24.2% / +109.0% / +27.2% | +0.289 | 18 |
| hour_uk >= 13 | 32 | +32.6% | +24.8% | 31 at +4.1% | +34.2% / +35.0% / +29.0% | +0.477 | 18 |
| n60 < 49.3 | 10 | +31.8% | +24.0% | 53 at +16.1% | +37.1% / +28.9% / +30.0% | +0.145 | 18 |
| holders_entry < 222 | 15 | +40.9% | +24.0% | 48 at +11.6% | +19.3% / +93.6% / +24.6% | +0.282 | 18 |
| gi_liquidity † >= 1.455e+04 | 16 | +39.7% | +23.9% | 47 at +11.4% | +34.4% / +57.8% / +39.6% | +0.292 | 18 |
| top10_entry >= 28.77 | 22 | +34.4% | +22.9% | 41 at +10.1% | +23.1% / +58.1% / +23.5% | +0.346 | 20 |
| gi_holder_count † < 373 | 26 | +25.9% | +22.8% | 37 at +13.4% | +17.9% / +49.0% / +29.6% | +0.305 | 20 |
| gs_top_10_holder_rate † >= 0.2245 | 20 | +26.4% | +22.4% | 43 at +14.9% | +21.6% / +37.5% / +29.5% | +0.239 | 20 |
| dev_hold_entry >= 0.3044 | 11 | +45.2% | +22.1% | 52 at +12.9% | +40.8% / +60.3% / +24.6% | +0.229 | 20 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| sell60 < 22.19 AND wal60 < 45.5 | 10 | +48.9% | +43.0% | +59.3% / +57.4% / +26.5% | +0.226 |
| bundle_pct >= 34.17 AND hour_uk >= 13 | 12 | +61.0% | +41.4% | +48.8% / +59.5% / +79.2% | +0.339 |
| wal60 < 45.5 AND hour_uk >= 13 | 11 | +34.1% | +27.4% | +75.7% / +30.1% / +20.7% | +0.172 |
| gi_circulating_supply >= 1e+09 AND gi_max_supply >= 1e+09 | 16 | +41.1% | +25.4% | +20.9% / +92.9% / +32.8% | +0.303 |
| gi_circulating_supply >= 1e+09 AND gi_total_supply >= 1e+09 | 16 | +41.1% | +25.4% | +20.9% / +92.9% / +32.8% | +0.303 |
| gi_max_supply >= 1e+09 AND gi_total_supply >= 1e+09 | 16 | +41.1% | +25.4% | +20.9% / +92.9% / +32.8% | +0.303 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
18 22:46 UK–19 03:48 UK: 13 at +20.6% · 19 04:02 UK–19 16:39 UK: 13 at +23.7% · 19 17:10 UK–20 02:00 UK: 13 at +27.2% · 20 02:38 UK–20 18:26 UK: 12 at -5.2% · 20 19:11 UK–21 00:58 UK: 12 at +25.2%
