# Diagnosis — GR
_Data to 21 Oct 01:42 UK; graduation book, 3-min exit; exit x_h3; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 50 | +9.9% | +4.0% | +17.2% | 66% | 32% | 59.4 | +0.531 | +0.45 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_split | 50 | +18.6% | +13.4% | 36% | +52.8% | +25.8% | -25.2% | +18.6% |
| x_h15 | 49 | +16.6% | +11.7% | 67% | +41.5% | +21.3% | -14.8% | +16.6% |
| x_flow4 | 50 | +15.9% | +11.1% | 62% | +29.9% | +12.9% | +4.1% | +15.9% |
| x_flow4ff | 50 | +14.6% | +9.9% | 60% | +30.8% | +12.9% | -0.6% | +14.6% |
| x_tsl40 | 50 | +13.8% | +8.9% | 38% | +54.5% | -1.4% | -13.1% | +13.8% |
| x_t15s40 | 50 | +6.9% | +6.2% | 66% | +19.2% | +7.6% | -7.0% | +6.9% |
| x_h5f14 | 50 | +9.6% | +4.9% | 66% | +34.6% | +4.0% | -11.0% | +9.6% |
| x_h3 (current) | 50 | +9.9% | +4.0% | 66% | +26.5% | +19.8% | -18.2% | +9.9% |
| x_h5 | 50 | +6.0% | +1.3% | 66% | +29.7% | +1.8% | -14.8% | +6.0% |
| x_h2t40 | 50 | -0.2% | -3.7% | 38% | +25.4% | -3.4% | -24.0% | -0.2% |
| x_t2s40 | 50 | -4.5% | -6.3% | 38% | +10.4% | -3.2% | -21.6% | -4.5% |
| x_time | 50 | -22.1% | -27.6% | 28% | -14.2% | -27.4% | -24.7% | -22.1% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 6 | 12% | +160.4% | 4.2e+04 | 55 | 70.2 | 7.5 | 0.0741 | 0.264 | — | — | — | — | 72 | 49.2 | 1 | — | — | 9 | 4.28 | 1.13 |
| winners (0 to +50%) | 27 | 54% | +17.0% | 4.24e+04 | 71 | 72 | 6 | 0.0839 | 0.176 | — | — | — | — | 61 | 34.1 | 1 | — | — | 12 | 1.82 | 1.18 |
| small losers (-35% to 0) | 1 | 2% | -1.2% | 4.34e+04 | 63 | 76.1 | 2 | 0.128 | 0.457 | — | — | — | — | 29 | 2.65 | 0 | — | — | 16 | 1.15 | 1.02 |
| stopped (<= -35%) | 16 | 32% | -57.7% | 4.24e+04 | 55.5 | 32.3 | 4.5 | 0.198 | 0.271 | — | — | — | — | 56 | 30.5 | 1 | — | — | 15.5 | 1.13 | 0.963 |

## 4. Best 8 and worst 8 trades
- 20 Oct 17:12 UK **ARTEMI** +299.5% — entry_mc 4.2e+04, age_s 11, bundle_pct 31, bundle_wallets 11, dev_buy_sol 2, dev_hold_entry 6.71, holders_entry 94, top10_entry 37.8, has_socials 0, peak_mult 7.07, fs10_x 1.16
- 20 Oct 05:38 UK **Leonida** +236.8% — entry_mc 2.37e+04, age_s 0, bundle_pct 58.5, bundle_wallets 10, dev_buy_sol 0.444, dev_hold_entry 1.57, holders_entry 10, top10_entry 58.5, peak_mult 3.88, fs10_x 3.69
- 20 Oct 06:17 UK **MONUMENTAL EGO** +135.4% — entry_mc 4.31e+04, age_s 0, bundle_pct 69, bundle_wallets 8, dev_buy_sol 0.0988, dev_hold_entry 0.352, holders_entry 7, top10_entry 62.7, has_socials 1, peak_mult 3.54, fs10_x 2.72
- 20 Oct 12:00 UK **CATZILLA** +110.1% — entry_mc 4.17e+04, age_s 99, bundle_pct 73.1, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, holders_entry 50, top10_entry 40.4, has_socials 1, peak_mult 3.06, fs10_x 1.08
- 20 Oct 05:56 UK **Froaster** +93.2% — entry_mc 4.21e+04, age_s 160, bundle_pct 74.5, bundle_wallets 7, dev_buy_sol 0.0336, dev_hold_entry 0.12, holders_entry 120, top10_entry 51.6, has_socials 1, peak_mult 5.22, fs10_x 1.06
- 20 Oct 13:20 UK **GRUMPINU** +87.4% — entry_mc 4.28e+04, age_s 109, bundle_pct 71.4, bundle_wallets 5, dev_buy_sol 0.0494, dev_hold_entry 0.176, holders_entry 145, top10_entry 46.8, peak_mult 4.68, fs10_x 1.11
- 20 Oct 06:29 UK **GEM ALERT** +20.6% — entry_mc 4.15e+04, age_s 103, bundle_pct 75.4, bundle_wallets 5, dev_buy_sol 0.0494, dev_hold_entry 0.176, holders_entry 77, top10_entry 38.4, has_socials 1, peak_mult 3.03, fs10_x 1.14
- 20 Oct 23:31 UK **Fomochi** +20.6% — entry_mc 4.39e+04, age_s 110, bundle_pct 64.5, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, holders_entry 189, top10_entry 40.9, has_socials 1, peak_mult 1.71, fs10_x 1.03

Worst:
- 20 Oct 06:14 UK **BRAIN'T** -85.2% — entry_mc 4.16e+04, age_s 122, bundle_pct 75.5, bundle_wallets 6, dev_buy_sol 0.0494, dev_hold_entry 0.176, holders_entry 68, top10_entry 37.6, has_socials 1, peak_mult 1.01, fs10_x 0.803
- 20 Oct 16:31 UK **SILESIA TERROR** -78.8% — entry_mc 2.4e+04, age_s 116, bundle_pct 0.317, bundle_wallets 1, dev_buy_sol 0.0889, dev_hold_entry 0.317, holders_entry 11, top10_entry 9.62, has_socials 0, peak_mult 1
- 20 Oct 13:59 UK **GLITCHO** -66.0% — entry_mc 3.01e+04, age_s 81, bundle_pct 0.702, bundle_wallets 1, dev_buy_sol 0.198, dev_hold_entry 9.48, holders_entry 3, top10_entry 14, has_socials 0, peak_mult 1.04
- 21 Oct 00:09 UK **Agentic Wif Inu** -59.6% — entry_mc 4.24e+04, age_s 27, bundle_pct 78.2, bundle_wallets 7, dev_buy_sol 0.198, dev_hold_entry 0.702, holders_entry 16, top10_entry 37.1, has_socials 0, peak_mult 1.27, fs10_x 1.12
- 20 Oct 22:11 UK **WIPD** -55.6% — entry_mc 4.27e+04, age_s 51, bundle_pct 6.32, bundle_wallets 1, dev_buy_sol 1.88, dev_hold_entry 6.32, holders_entry 119, top10_entry 30.1, has_socials 1, peak_mult 1.12, fs10_x 0.849
- 20 Oct 15:43 UK **dog** -54.9% — entry_mc 7.59e+04, age_s 177, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.225, holders_entry 26, top10_entry 4.57, has_socials 0, peak_mult 1.11, fs10_x 0.974
- 20 Oct 18:42 UK **RDSTR LEAGUE** -54.1% — entry_mc 4.38e+04, age_s 35, bundle_pct 74, bundle_wallets 8, dev_buy_sol 0.296, dev_hold_entry 1.05, holders_entry 53, top10_entry 32, has_socials 1, peak_mult 9.42, fs10_x 1.26
- 20 Oct 20:49 UK **Punchdog** -53.2% — entry_mc 4.36e+04, age_s 55, bundle_pct 73.1, bundle_wallets 5, dev_buy_sol 0.148, dev_hold_entry 0.527, holders_entry 44, top10_entry 30.9, has_socials 1, peak_mult 9.96, fs10_x 0.974

## 5. Factor search (strict test) and luck check
256 cuts tried on 20 entry-time columns; 9 pass the strict test, 12 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **1 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| h0_t20 >= 49.52 | 13 | +70.8% | +51.8% | 37 at -11.5% | +118.2% / +76.9% / -4.6% | +1.078 | 0 |
| top10_entry >= 34 | 25 | +36.6% | +25.7% | 25 at -16.8% | +29.0% / +106.9% / -10.6% | +1.058 | 4 |
| h0_t10 >= 34 | 25 | +36.6% | +25.7% | 25 at -16.8% | +29.0% / +106.9% / -10.6% | +1.058 | 4 |
| bundle_wallets >= 4.25 | 37 | +24.6% | +17.0% | 13 at -31.9% | +33.3% / +43.2% / -10.6% | +1.039 | 12 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| h0_t20 >= 49.52 AND top10_entry >= 34 | 11 | +80.3% | +58.4% | +118.2% / +106.1% / -4.6% | +1.037 |
| h0_t20 >= 49.52 AND h0_t10 >= 34 | 11 | +80.3% | +58.4% | +118.2% / +106.1% / -4.6% | +1.037 |
| top10_entry >= 34 AND bundle_wallets >= 4.25 | 21 | +46.7% | +34.1% | +34.7% / +128.9% / -7.2% | +1.140 |
| h0_t10 >= 34 AND bundle_wallets >= 4.25 | 21 | +46.7% | +34.1% | +34.7% / +128.9% / -7.2% | +1.140 |
| top10_entry >= 34 AND h0_t10 >= 34 | 25 | +36.6% | +25.7% | +29.0% / +106.9% / -10.6% | +1.058 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
20 05:30 UK–20 07:13 UK: 10 at +47.1% · 20 09:34 UK–20 12:43 UK: 10 at +5.6% · 20 12:48 UK–20 16:31 UK: 10 at -7.4% · 20 16:58 UK–20 20:49 UK: 10 at +16.3% · 20 21:49 UK–21 00:44 UK: 10 at -12.0%
