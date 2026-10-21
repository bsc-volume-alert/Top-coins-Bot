# Diagnosis — S3b
_Data to 21 Oct 01:42 UK; curve costs, 5-min exit; exit x_h5; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 184 | -8.7% | -13.1% | -20.1% | 21% | 32% | 158.8 | -1.537 | -1.78 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 184 | -10.3% | -10.5% | 29% | -6.7% | -9.1% | -15.1% | -11.5% |
| x_h3 | 184 | -7.4% | -12.0% | 21% | +1.3% | -15.6% | -8.1% | -6.0% |
| x_flow4ff | 184 | -10.6% | -12.2% | 17% | -8.5% | -14.3% | -9.2% | -9.3% |
| x_flow4 | 184 | -11.2% | -12.8% | 17% | -8.9% | -14.5% | -10.3% | -9.9% |
| x_h5 (current) | 184 | -8.7% | -13.1% | 21% | +0.7% | -15.8% | -11.1% | -7.6% |
| x_h15 | 171 | -9.9% | -14.6% | 28% | -1.0% | -10.8% | -18.3% | -8.1% |
| x_tsl40 | 184 | -12.2% | -14.8% | 16% | -11.9% | -22.5% | -2.4% | -10.5% |
| x_h5f14 | 184 | -13.4% | -15.7% | 28% | -12.3% | -8.8% | -19.2% | -13.6% |
| x_t2s40 | 184 | -16.2% | -16.7% | 16% | -14.8% | -21.1% | -12.6% | -15.9% |
| x_h2t40 | 184 | -16.2% | -17.7% | 16% | -16.5% | -23.0% | -8.9% | -14.6% |
| x_split | 184 | -22.9% | -24.6% | 9% | -21.1% | -29.1% | -18.6% | -21.2% |
| x_time | 184 | -21.5% | -26.0% | 7% | -18.2% | -28.6% | -17.9% | -17.3% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 4 | 2% | +601.4% | 4.12e+03 | 1 | 16.2 | 2.5 | 0.0902 | 0.322 | — | — | — | — | 3 | 15.3 | 1 | 32.5 | — | 3.5 | 10.8 | 2.15 |
| winners (0 to +50%) | 35 | 19% | +8.0% | 4.59e+03 | 1 | 20.7 | 4 | 1.48 | 5.05 | — | — | — | — | 5 | 20.9 | 1 | 15 | — | 20 | 1.87 | 1.23 |
| small losers (-35% to 0) | 86 | 47% | -16.5% | 3.32e+03 | 3 | 7.28 | 1 | 0.415 | 0.337 | — | — | — | — | 3 | 6.74 | 1 | 14 | — | 16.5 | 1.01 | 0.997 |
| stopped (<= -35%) | 59 | 32% | -48.5% | 4.61e+03 | 1 | 24.7 | 3 | 0.688 | 2.08 | — | — | — | — | 4 | 21 | 1 | 15 | — | 17 | 1.07 | 0.712 |

## 4. Best 8 and worst 8 trades
- 20 Oct 01:46 UK **cat cow** +796.5% — entry_mc 2.57e+03, age_s 1, bundle_pct 0.339, bundle_wallets 1, dev_buy_sol 0.095, dev_hold_entry 0.339, holders_entry 1, top10_entry 0.339, cc_n24h 63, peak_mult 9.34, fs10_x 2.24
- 21 Oct 00:56 UK **Where's the Airdrop?** +743.2% — entry_mc 8.32e+03, age_s 1, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, holders_entry 6, top10_entry 43.1, has_socials 1, cc_n24h 16, peak_mult 14.1, fs10_x 2.65
- 19 Oct 22:32 UK **Alt-coin** +468.1% — entry_mc 5.67e+03, age_s 1, bundle_pct 32, bundle_wallets 4, dev_buy_sol 5, dev_hold_entry 12.3, holders_entry 5, top10_entry 30.2, has_socials 1, cc_n24h 49, peak_mult 12.3, fs10_x 2.06
- 20 Oct 06:41 UK **tout va binu** +398.0% — entry_mc 2.27e+03, age_s 1, bundle_pct 0.305, bundle_wallets 1, dev_buy_sol 0.0855, dev_hold_entry 0.305, holders_entry 1, top10_entry 0.305, cc_n24h 5, peak_mult 5.74, fs10_x 1.1
- 19 Oct 22:42 UK **cat cow** +31.6% — entry_mc 2.55e+03, age_s 1, bundle_pct 0.347, bundle_wallets 1, dev_buy_sol 0.0973, dev_hold_entry 0.347, holders_entry 1, top10_entry 0.347, cc_n24h 65, peak_mult 1.41, fs10_x 1.4
- 20 Oct 20:36 UK **Flying Car** +29.7% — entry_mc 3.74e+03, age_s 2, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.266, cc_n24h 23, peak_mult 1.38, fs10_x 1.38
- 20 Oct 16:04 UK **Pepina** +10.0% — entry_mc 8.43e+03, age_s 1, bundle_pct 23.5, bundle_wallets 3, dev_buy_sol 5, dev_hold_entry 15.3, holders_entry 13, top10_entry 42.6, has_socials 1, cc_n24h 3, peak_mult 2.52, fs10_x 1.1
- 20 Oct 01:28 UK **Buddy** +9.9% — entry_mc 4.27e+03, age_s 2, bundle_pct 18.1, bundle_wallets 5, dev_buy_sol 3, dev_hold_entry 9.75, holders_entry 5, top10_entry 18.5, has_socials 1, cc_n24h 19, peak_mult 2.29, fs10_x 1.08

Worst:
- 20 Oct 20:03 UK **Charizard** -69.0% — entry_mc 3.28e+03, age_s 3, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.233, has_socials 0, cc_n24h 25, peak_mult 1.03, fs10_x 0.289
- 20 Oct 03:35 UK **RhinoCoin** -64.2% — entry_mc 8.39e+03, age_s 1, bundle_pct 43.8, bundle_wallets 11, dev_buy_sol 0, dev_hold_entry 0, holders_entry 13, top10_entry 43.7, has_socials 1, cc_n24h 5, peak_mult 2.73, fs10_x 1.68
- 20 Oct 19:07 UK **Flying Car** -60.1% — entry_mc 2.75e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 1, top10_entry 0.211, has_socials 0, cc_n24h 18, peak_mult 1.76, fs10_x 0.905
- 20 Oct 18:41 UK **Flying Car** -59.6% — entry_mc 1.53e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0591, dev_hold_entry 0.211, holders_entry 1, top10_entry 0.211, cc_n24h 16, peak_mult 1.38, fs10_x 1.16
- 20 Oct 00:04 UK **Bramble** -59.4% — entry_mc 3.71e+03, age_s 1, bundle_pct 0.211, bundle_wallets 1, dev_buy_sol 0.0592, dev_hold_entry 0.211, holders_entry 2, top10_entry 0.266, cc_n24h 27, peak_mult 1.24, fs10_x 0.401
- 20 Oct 07:38 UK **Millercoin** -59.0% — entry_mc 2.34e+03, age_s 1, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.212, holders_entry 1, top10_entry 0.212, cc_n24h 6, peak_mult 1.05, fs10_x 0.5
- 19 Oct 23:02 UK **no** -58.4% — entry_mc 6.17e+03, age_s 4, bundle_pct 32.8, bundle_wallets 6, dev_buy_sol 0, dev_hold_entry 0, holders_entry 8, top10_entry 33.3, cc_n24h 7, peak_mult 1, fs10_x 0.997
- 20 Oct 09:14 UK **Buddy** -57.2% — entry_mc 5.93e+03, age_s 5, bundle_pct 32.2, bundle_wallets 1, dev_buy_sol 12.8, dev_hold_entry 32.2, holders_entry 1, top10_entry 0.0454, cc_n24h 37, peak_mult 1.04, fs10_x 1.04

## 5. Factor search (strict test) and luck check
647 cuts tried on 50 entry-time columns; 3 pass the strict test, 4 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| cc_best_mc24h >= 1.333e+06 | 67 | +16.8% | +5.0% | 117 at -23.2% | +30.6% / +14.1% / +6.6% | +0.911 | 8 |
| sn_signal_n >= 1.333e+06 | 70 | +15.4% | +4.1% | 114 at -23.5% | +26.9% / +12.7% / +6.6% | +0.873 | 10 |
| heat_sol1h_pct < -0.3575 | 46 | +20.2% | +3.0% | 138 at -18.3% | +28.3% / +21.4% / +13.2% | +0.763 | 12 |

## 7. Pairs of the best cuts (all three thirds must beat the rest)
| pair | kept | avg | without best | thirds | SOL a day at 0.1 |
|---|---|---|---|---|---|
| cc_best_mc24h >= 1.333e+06 AND heat_sol1h_pct < -0.3575 | 17 | +97.8% | +54.1% | +374.6% / +133.4% / +42.8% | +1.420 |
| sn_signal_n >= 1.333e+06 AND heat_sol1h_pct < -0.3575 | 17 | +97.8% | +54.1% | +374.6% / +133.4% / +42.8% | +1.420 |
| cc_best_mc24h >= 1.333e+06 AND sn_signal_n >= 1.333e+06 | 67 | +16.8% | +5.0% | +30.6% / +14.1% / +6.6% | +0.911 |

Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.

## 8. Five time blocks
19 21:54 UK–20 00:35 UK: 37 at -7.4% · 20 00:40 UK–20 06:41 UK: 37 at +14.0% · 20 06:44 UK–20 17:45 UK: 37 at -24.1% · 20 17:45 UK–20 20:11 UK: 37 at -23.5% · 20 20:22 UK–21 01:37 UK: 36 at -2.3%
