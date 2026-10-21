# Diagnosis — PG
_Data to 21 Oct 01:42 UK; curve costs; exit x_t2s40; curve costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 107 | -21.8% | -22.9% | -49.1% | 23% | 69% | 373.8 | -8.522 | -2.44 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h3l | 107 | -14.0% | -16.6% | 24% | -18.9% | -6.0% | -17.1% | -14.0% |
| x_h5f14 | 107 | -16.3% | -20.0% | 30% | -10.1% | -13.5% | -25.8% | -16.3% |
| x_t15s40 | 107 | -20.4% | -20.9% | 35% | -22.1% | -21.7% | -17.2% | -20.4% |
| x_tsl40 | 107 | -18.7% | -21.4% | 20% | -21.3% | -9.1% | -25.9% | -18.7% |
| x_t2s40 (current) | 107 | -21.8% | -22.9% | 23% | -25.1% | -16.9% | -23.5% | -21.8% |
| x_h15 | 107 | -19.8% | -23.2% | 25% | -14.7% | -14.7% | -30.2% | -19.8% |
| x_flow4 | 107 | -20.4% | -23.3% | 24% | -21.0% | -16.0% | -24.3% | -20.4% |
| x_flow4ff | 107 | -20.8% | -23.7% | 23% | -22.6% | -15.1% | -24.8% | -20.8% |
| x_t2n30 | 107 | -22.6% | -24.2% | 28% | -23.6% | -24.4% | -19.9% | -22.6% |
| x_h2t40 | 107 | -22.6% | -24.5% | 22% | -26.0% | -14.4% | -27.6% | -22.6% |
| x_h3 | 107 | -22.6% | -26.0% | 22% | -21.0% | -14.2% | -32.8% | -22.6% |
| x_h5 | 107 | -22.4% | -26.1% | 22% | -16.5% | -16.7% | -34.3% | -22.4% |
| x_split | 107 | -25.1% | -28.0% | 18% | -26.7% | -13.2% | -35.7% | -25.1% |
| x_time | 107 | -34.5% | -38.4% | 15% | -14.4% | -31.3% | -58.5% | -34.5% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | bundle_wallets | dev_buy_sol | dev_hold_entry | sol60 | wal60 | sell60 | max_share | holders_entry | top10_entry | has_socials | cc_n24h | snipers_n | hour_uk | peak_mult | fs10_x |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 21 | 20% | +86.7% | 3.29e+04 | 36 | 1.39 | 1 | 0.0593 | 0.211 | — | — | — | — | 7 | 12.4 | 1 | — | — | 21 | 2.6 | 1.35 |
| winners (0 to +50%) | 4 | 4% | +15.5% | 3.34e+04 | 87.5 | 1.04 | 1 | 0.296 | 1.03 | — | — | — | — | 5 | 8.75 | 0.5 | — | — | 21.5 | 1.31 | 1.05 |
| small losers (-35% to 0) | 8 | 7% | -10.7% | 3.31e+04 | 41 | 3.23 | 1 | 0.593 | 1.89 | — | — | — | — | 3.5 | 11.8 | 0 | — | — | 20 | 1.18 | 0.996 |
| stopped (<= -35%) | 74 | 69% | -55.8% | 3.39e+04 | 37.5 | 0.848 | 1 | 0.167 | 0.187 | — | — | — | — | 4 | 8.8 | 0 | — | — | 20 | 1.18 | 0.699 |

## 4. Best 8 and worst 8 trades
- 21 Oct 00:57 UK **Where's the Airdrop?** +90.0% — entry_mc 3.22e+04, age_s 17, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, holders_entry 77, top10_entry 34.7, has_socials 1, peak_mult 3.64, fs10_x 0.835
- 21 Oct 00:20 UK **King Of Larp** +90.0% — entry_mc 3.33e+04, age_s 50, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, holders_entry 162, top10_entry 16, has_socials 1, peak_mult 4.42, fs10_x 0.822
- 21 Oct 00:44 UK **Larp** +90.0% — entry_mc 3.23e+04, age_s 14, bundle_pct 42.6, bundle_wallets 5, dev_buy_sol 0, dev_hold_entry 0, holders_entry 59, top10_entry 40.7, peak_mult 3.39, fs10_x 1.17
- 20 Oct 23:30 UK **Fomochi** +90.0% — entry_mc 3.21e+04, age_s 50, bundle_pct 64.5, bundle_wallets 4, dev_buy_sol 0, dev_hold_entry 0, holders_entry 106, top10_entry 40.8, has_socials 1, peak_mult 2.33, fs10_x 0.766
- 20 Oct 23:54 UK **Mugshot Cat** +90.0% — entry_mc 3.21e+04, age_s 69, bundle_pct 29.3, bundle_wallets 6, dev_buy_sol 0.988, dev_hold_entry 0.214, holders_entry 152, top10_entry 19.3, has_socials 1, peak_mult 2.43, fs10_x 0.871
- 20 Oct 22:58 UK **dog** +90.0% — entry_mc 3.52e+04, age_s 32, bundle_pct 0.212, bundle_wallets 1, dev_buy_sol 0.0593, dev_hold_entry 0.108, holders_entry 7, top10_entry 1.5, peak_mult 3.85, fs10_x 2.94
- 20 Oct 23:11 UK **PokeSolBet** +90.0% — entry_mc 3.22e+04, age_s 53, bundle_pct 53.5, bundle_wallets 3, dev_buy_sol 0.997, dev_hold_entry 3.45, holders_entry 48, top10_entry 18.2, has_socials 0, peak_mult 2.27, fs10_x 1.53
- 20 Oct 21:39 UK **Epstein & Trump coin** +90.0% — entry_mc 3.64e+04, age_s 36, bundle_pct 1.39, bundle_wallets 1, dev_buy_sol 0.394, dev_hold_entry 1.39, holders_entry 5, top10_entry 7.84, has_socials 0, peak_mult 2.6, fs10_x 2.57

Worst:
- 20 Oct 22:21 UK **Retinue** -95.1% — entry_mc 3.35e+04, age_s 21, bundle_pct 63, bundle_wallets 2, dev_buy_sol 3.08, dev_hold_entry 10, holders_entry 21, top10_entry 65.1, has_socials 0, peak_mult 1.17
- 20 Oct 23:58 UK **Pokesoft** -87.0% — entry_mc 3.66e+04, age_s 5, bundle_pct 76.6, bundle_wallets 6, dev_buy_sol 0.0494, dev_hold_entry 0.176, holders_entry 12, top10_entry 35.5, has_socials 1, peak_mult 1.14, fs10_x 1.03
- 20 Oct 23:04 UK **Optimistic Inu** -86.9% — entry_mc 3.21e+04, age_s 69, bundle_pct 43.6, bundle_wallets 8, dev_buy_sol 0, dev_hold_entry 0, holders_entry 192, top10_entry 8.37, has_socials 1, peak_mult 1.3, fs10_x 1.1
- 20 Oct 21:15 UK **Bags** -83.6% — entry_mc 3.2e+04, age_s 118, bundle_pct 48.1, bundle_wallets 14, dev_buy_sol 0.35, dev_hold_entry 1.24, holders_entry 141, top10_entry 22.6, has_socials 1, peak_mult 1.01
- 20 Oct 23:36 UK **67%** -73.5% — entry_mc 3.47e+04, age_s 38, bundle_pct 1.39, bundle_wallets 1, dev_buy_sol 0.395, dev_hold_entry 0.349, holders_entry 4, top10_entry 6.48, peak_mult 1.49, fs10_x 0.678
- 20 Oct 20:03 UK **Lack of electricity** -70.4% — entry_mc 3.53e+04, age_s 14, bundle_pct 0.534, bundle_wallets 1, dev_buy_sol 0.15, dev_hold_entry 0.3, holders_entry 4, top10_entry 44.3, has_socials 0, peak_mult 1, fs10_x 0.25
- 20 Oct 23:02 UK **dog** -64.2% — entry_mc 3.36e+04, age_s 116, bundle_pct 0.876, bundle_wallets 1, dev_buy_sol 0.247, dev_hold_entry 0.247, holders_entry 5, top10_entry 9.23, has_socials 0, peak_mult 1, fs10_x 0.26
- 20 Oct 22:22 UK **⬅️Paper Hands King** -63.9% — entry_mc 4e+04, age_s 18, bundle_pct 0.209, bundle_wallets 1, dev_buy_sol 0.0584, dev_hold_entry 0.0293, holders_entry 4, top10_entry 1.29, peak_mult 1, fs10_x 1

## 5. Factor search (strict test) and luck check
228 cuts tried on 18 entry-time columns; 2 pass the strict test, 1 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **1 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| entry_mc < 3.223e+04 | 16 | +15.8% | +10.8% | 91 at -28.4% | +18.1% / -7.2% / +30.8% | +0.825 | 2 |

## 8. Five time blocks
20 18:50 UK–20 20:18 UK: 22 at -18.1% · 20 20:19 UK–20 21:19 UK: 22 at -26.1% · 20 21:20 UK–20 22:49 UK: 21 at -14.7% · 20 22:49 UK–20 23:54 UK: 21 at -22.6% · 20 23:58 UK–21 01:39 UK: 21 at -27.5%
