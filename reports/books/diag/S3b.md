# Diagnosis — S3b
_Data to 21 Oct 08:29 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 189 | -6.3% | -10.6% | -19.0% | 22% | 32% | 131.1 | -0.956 | -1.38 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h3 | 189 | -5.2% | -9.7% | 22% | +0.3% | -14.3% | -1.7% | -10.4% |
| x_t15s40 | 189 | -9.7% | -10.0% | 30% | -5.9% | -9.0% | -14.2% | -13.8% |
| x_flow4ff | 189 | -9.0% | -10.5% | 18% | -7.1% | -15.4% | -4.4% | -10.2% |
| x_h5 (current) | 189 | -6.3% | -10.6% | 22% | -0.3% | -14.5% | -4.1% | -11.9% |
| x_flow4 | 189 | -9.5% | -11.1% | 18% | -7.6% | -15.6% | -5.5% | -10.9% |
| x_h5f14 | 189 | -10.7% | -13.4% | 28% | -11.6% | -9.0% | -11.6% | -14.3% |
| x_h15 | 176 | -9.3% | -13.9% | 28% | -2.0% | -9.2% | -16.6% | -17.9% |
| x_tsl40 | 189 | -11.9% | -14.4% | 16% | -12.7% | -20.8% | -2.1% | -10.3% |
| x_t2s40 | 189 | -14.7% | -15.3% | 17% | -13.1% | -20.7% | -10.3% | -16.1% |
| x_h2t40 | 189 | -14.5% | -16.0% | 17% | -16.0% | -21.9% | -5.5% | -14.2% |
| x_split | 189 | -21.3% | -22.9% | 10% | -21.8% | -27.6% | -14.6% | -21.7% |
| x_time | 189 | -21.0% | -25.4% | 7% | -18.9% | -27.0% | -17.1% | -24.1% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 5 | 3% | +578.5% | 3.56e+03 | 1 | 9.43 | 4 | 0.095 | 0.339 | — | — | — | — | 5 | 8.86 | 1 | 16 | — | 6 | 11.5 | 2.16 |
| winners (0 to +50%) | 36 | 19% | +8.1% | 4.59e+03 | 1 | 20.2 | 4.5 | 1.42 | 4.86 | — | — | — | — | 5.5 | 20.8 | 1 | 15 | — | 20 | 1.89 | 1.25 |
| small losers (-35% to 0) | 88 | 47% | -16.5% | 3.32e+03 | 3 | 6.99 | 1 | 0.415 | 0.337 | — | — | — | — | 2 | 5.85 | 1 | 14 | — | 16 | 1.01 | 0.997 |
| stopped (<= -35%) | 60 | 32% | -48.7% | 4.61e+03 | 1 | 24.1 | 3 | 0.64 | 1.91 | — | — | — | — | 4 | 21 | 1 | 15 | — | 17 | 1.08 | 0.714 |

## 4. Best 8 and worst 8 trades
- 20 Oct 01:46 UK **cat cow** +796.5% — entry_mc 2.57e+03, age_s 1, bundle_pct 0.339, bundle_wallets 1, dev_buy_sol 0.095, dev_hold_entry 0.339, holders_entry 1, top10_entry 0.339, cc_n24h 63, peak_mult 9.34, fs10_x 2.24
- 21 Oct 00:56 UK **Where's the Airdrop?** +743.2% — entry_mc 8.32e+03, age_s 1, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, holders_entry 6, top10_entry 43.1, has_socials 1, cc_n24h 16, peak_mult 14.1, fs10_x 2.65
- 21 Oct 06:19 UK **1 Larp can change your life** +486.6% — entry_mc 3.56e+03, age_s 4, bundle_pct 9.43, bundle_wallets 11, dev_buy_sol 0.198, dev_hold_entry 0.702, holders_entry 12, top10_entry 8.86, has_socials 1, cc_n24h 10, peak_mult 11.5, fs10_x 2.16
- 19 Oct 22:32 UK **Alt-coin** +468.1% — entry_mc 5.67e+03, age_s 1, bundle_pct 32, bundle_wallets 4, dev_buy_sol 5, dev_hold_entry 12.3, holders_entry 5, top10_entry 30.2, has_socials 1, cc_n24h 49, peak_mult 12.3, fs10_x 2.06
- 20 Oct 06:41 UK **tout va binu** +398.0% — entry_mc 2.27e+03, age_s 1, bundle_pct 0.305, bundle_wallets 1, dev_buy_sol 0.0855, dev_hold_entry 0.305, holders_entry 1, top10_entry 0.305, cc_n24h 5, peak_mult 5.74, fs10_x 1.1
- 19 Oct 22:42 UK **cat cow** +31.6% — entry_mc 2.55e+03, age_s 1, bundle_pct 0.347, bundle_wallets 1, dev_buy_sol 0.0973, dev_hold_entry 0.347, holders_entry 1, top10_entry 0.347, cc_n24h 65, peak_mult 1.41, fs10_x 1.4
- 20 Oct 20:36 UK **Flying Car** +29.7% — entry_mc 3.74e+03, age_s 2, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.266, cc_n24h 23, peak_mult 1.38, fs10_x 1.38
- 20 Oct 16:04 UK **Pepina** +10.0% — entry_mc 8.43e+03, age_s 1, bundle_pct 23.5, bundle_wallets 3, dev_buy_sol 5, dev_hold_entry 15.3, holders_entry 13, top10_entry 42.6, has_socials 1, cc_n24h 3, peak_mult 2.52, fs10_x 1.1

Worst:
- 20 Oct 20:03 UK **Charizard** -69.0% — entry_mc 3.28e+03, age_s 3, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.233, has_socials 0, cc_n24h 25, peak_mult 1.03, fs10_x 0.289
- 20 Oct 03:35 UK **RhinoCoin** -64.2% — entry_mc 8.39e+03, age_s 1, bundle_pct 43.8, bundle_wallets 11, dev_buy_sol 0, dev_hold_entry 0, holders_entry 13, top10_entry 43.7, has_socials 1, cc_n24h 5, peak_mult 2.73, fs10_x 1.68
- 21 Oct 05:24 UK **Charizard** -60.2% — entry_mc 3.57e+03, age_s 1, bundle_pct 0.208, bundle_wallets 1, dev_buy_sol 0.0584, dev_hold_entry 0.208, holders_entry 2, top10_entry 0.251, has_socials 0, cc_n24h 23, peak_mult 1.11, fs10_x 0.945
- 20 Oct 19:07 UK **Flying Car** -60.1% — entry_mc 2.75e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 1, top10_entry 0.211, has_socials 0, cc_n24h 18, peak_mult 1.76, fs10_x 0.905
- 20 Oct 18:41 UK **Flying Car** -59.6% — entry_mc 1.53e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 1, top10_entry 0.211, cc_n24h 16, peak_mult 1.38, fs10_x 1.16
- 20 Oct 00:04 UK **Bramble** -59.4% — entry_mc 3.71e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0592, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.266, cc_n24h 27, peak_mult 1.24, fs10_x 0.401
- 20 Oct 07:38 UK **Millercoin** -59.0% — entry_mc 2.34e+03, age_s 1, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.212, holders_entry 1, top10_entry 0.212, cc_n24h 6, peak_mult 1.05, fs10_x 0.5
- 19 Oct 23:02 UK **no** -58.4% — entry_mc 6.17e+03, age_s 4, bundle_pct 32.8, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, holders_entry 8, top10_entry 33.3, cc_n24h 7, peak_mult 1, fs10_x 0.997

## 5. Factor search (strict test) and luck check
647 cuts tried on 50 entry-time columns; 8 pass the strict test, 5 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| cc_best_mc24h >= 1.333e+06 | 71 | +21.7% | +10.7% | 118 at -23.2% | +30.6% / +12.5% / +19.4% | +1.021 | 9 |
| heat_sol1h_pct < -0.35 | 46 | +20.2% | +3.0% | 143 at -14.8% | +28.3% / +21.4% / +13.2% | +0.614 | 18 |
| heat_pools1h >= 102 | 67 | +14.6% | +2.8% | 122 at -17.8% | +5.3% / +37.7% / +18.6% | +0.633 | 18 |
| cr_last_min >= 29.5 | 35 | +16.3% | +2.4% | 154 at -11.4% | +10.7% / +17.5% / +23.4% | +0.371 | 18 |
| sn_signal_n >= 7.992e+05 | 98 | +10.3% | +2.2% | 91 at -24.2% | +11.0% / -1.4% / +19.4% | +0.634 | 18 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| cc_best_mc24h >= 1.333e+06 AND heat_sol1h_pct < -0.35 | 17 | +97.8% | +54.1% | +374.6% / +133.4% / +42.8% | +1.142 |
| cc_best_mc24h >= 1.333e+06 AND heat_pools1h >= 102 | 28 | +65.9% | +38.9% | +64.0% / +76.9% / +64.2% | +1.261 |
| heat_sol1h_pct < -0.35 AND sn_signal_n >= 7.992e+05 | 26 | +56.9% | +27.4% | +71.1% / +65.5% / +42.8% | +1.009 |
| heat_pools1h >= 102 AND sn_signal_n >= 7.992e+05 | 35 | +47.7% | +25.7% | +27.6% / +58.4% / +64.2% | +1.134 |
| cr_last_min >= 29.5 AND sn_signal_n >= 7.992e+05 | 21 | +46.1% | +24.1% | +26.4% / +39.9% / +109.6% | +0.658 |
| cc_best_mc24h >= 1.333e+06 AND sn_signal_n >= 7.992e+05 | 71 | +21.7% | +10.7% | +30.6% / +12.5% / +19.4% | +1.021 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
19 21:54 UK–20 00:40 UK: 38 at -7.3% · 20 00:44 UK–20 06:46 UK: 38 at +12.3% · 20 07:20 UK–20 17:46 UK: 38 at -24.4% · 20 17:47 UK–20 20:36 UK: 38 at -20.9% · 20 20:42 UK–21 06:19 UK: 37 at +9.1%
