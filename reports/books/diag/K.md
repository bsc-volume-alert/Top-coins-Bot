# Diagnosis — K
_Data to 21 Oct 01:42 UK; page headline is x_h2t40, not in the data export; 5-min shown; exit x_h5; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 32 | +6.3% | -0.7% | +6.7% | 53% | 31% | 99.8 | +0.526 | +0.17 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tp15 | 32 | +4.1% | +3.0% | 59% | -16.5% | +19.0% | +10.4% | +4.1% |
| x_flow4 | 32 | +4.3% | +1.2% | 56% | -10.4% | +20.7% | +2.3% | +4.3% |
| x_h5 (current) | 32 | +6.3% | -0.7% | 53% | -13.9% | +22.1% | +11.0% | +6.3% |
| x_t15s40 | 32 | +0.4% | -0.8% | 56% | -7.8% | +9.0% | -0.0% | +0.4% |
| x_h3 | 32 | +2.8% | -4.7% | 47% | -13.4% | +14.0% | +8.2% | +2.8% |
| x_tp | 32 | -3.6% | -6.6% | 41% | -14.1% | +5.2% | -1.9% | -3.6% |
| x_t2s40 | 32 | -7.0% | -10.1% | 34% | -3.2% | +1.3% | -20.4% | -7.0% |
| x_tsl40 | 32 | -3.6% | -10.4% | 31% | -16.4% | +4.7% | +1.3% | -3.6% |
| x_h15 | 31 | -4.7% | -11.9% | 52% | -22.3% | +3.6% | +3.8% | -4.7% |
| x_tsl60 | 32 | -13.1% | -24.0% | 25% | -23.8% | -19.6% | +5.6% | -13.1% |
| x_time | 32 | -24.1% | -35.2% | 22% | -36.7% | -32.9% | -0.4% | -24.1% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 6 | 19% | +103.1% | 5.11e+04 | 538 | — | 592 | — | 0 | 21.5 | 2.88 |
| winners (0 to +50%) | 11 | 34% | +17.1% | 3.23e+04 | 449 | — | 449 | — | 0 | 19 | 1.99 |
| small losers (-35% to 0) | 5 | 16% | -17.3% | 5.48e+04 | 696 | — | 1.01e+03 | — | 0 | 20 | 1.26 |
| stopped (<= -35%) | 10 | 31% | -52.0% | 3.36e+04 | 547 | — | 766 | — | 0 | 19 | 1.16 |

## 4. Best 8 and worst 8 trades
- 20 Oct 22:58 UK **WIPD** +223.6% — entry_mc 5.49e+04, age_s 570, buyers_entry 308, vol5m_usd 0, peak_mult 6.43
- 20 Oct 21:04 UK **xingxing** +109.7% — entry_mc 4.73e+04, age_s 417, buyers_entry 388, vol5m_usd 0, peak_mult 3.33
- 20 Oct 22:36 UK **Bitcoin Bull Run** +109.5% — entry_mc 6.18e+04, age_s 892, buyers_entry 1.52e+03, vol5m_usd 0, peak_mult 4.06
- 20 Oct 21:18 UK **The Official Memecoin** +63.4% — entry_mc 7.29e+04, age_s 392, buyers_entry 795, vol5m_usd 0, peak_mult 2.44
- 20 Oct 23:15 UK **Super Intelligence Singulari** +59.7% — entry_mc 3.44e+04, age_s 836, buyers_entry 973, vol5m_usd 0, peak_mult 1.93
- 20 Oct 21:36 UK **Official XiaoPang 小胖** +52.8% — entry_mc 2.87e+04, age_s 505, buyers_entry 315, vol5m_usd 0, peak_mult 1.77
- 20 Oct 19:08 UK **Compute Coin** +41.0% — entry_mc 3.12e+04, age_s 706, buyers_entry 1.06e+03, vol5m_usd 0, peak_mult 1.66
- 20 Oct 21:55 UK **SpaceXSuperIntelligence** +20.6% — entry_mc 2.93e+04, age_s 350, buyers_entry 884, vol5m_usd 0, peak_mult 1.99

Worst:
- 20 Oct 21:17 UK **Routr Network** -55.6% — entry_mc 2.96e+04, age_s 585, buyers_entry 77, vol5m_usd 0, peak_mult 1.24
- 20 Oct 18:06 UK **Xitter** -52.8% — entry_mc 3.14e+04, age_s 738, buyers_entry 685, vol5m_usd 0, peak_mult 1.06
- 20 Oct 20:05 UK **Back Alley Gambling** -52.2% — entry_mc 3.56e+04, age_s 641, buyers_entry 939, vol5m_usd 0, peak_mult 1.13
- 20 Oct 22:52 UK **pengi.xyz** -52.0% — entry_mc 3.83e+04, age_s 572, buyers_entry 353, vol5m_usd 0, peak_mult 1.07
- 20 Oct 23:47 UK **Gem Mint Gemma** -51.8% — entry_mc 2.48e+04, age_s 409, buyers_entry 353, vol5m_usd 0, peak_mult 2.56
- 20 Oct 18:00 UK **Gary** -51.6% — entry_mc 2.11e+04, age_s 351, buyers_entry 846, vol5m_usd 0, peak_mult 1.13
- 21 Oct 00:07 UK **PILL YOUR FRIENDS** -51.1% — entry_mc 1.02e+05, age_s 361, buyers_entry 1.07e+03, vol5m_usd 0, peak_mult 1.32
- 20 Oct 18:48 UK **Packcoin** -51.0% — entry_mc 8.2e+04, age_s 522, buyers_entry 1.35e+03, vol5m_usd 0, peak_mult 1.48

## 5. Factor search (strict test) and luck check
56 cuts tried on 5 entry-time columns; 1 pass the strict test, 2 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| entry_mc >= 3.571e+04 | 16 | +18.6% | +5.0% | 16 at -6.1% | -12.3% / +38.8% / +25.2% | +0.879 | 15 |

## 8. Five time blocks
20 18:00 UK–20 19:10 UK: 7 at -10.3% · 20 19:50 UK–20 21:17 UK: 7 at -6.1% · 20 21:18 UK–20 22:36 UK: 6 at +41.0% · 20 22:37 UK–20 23:22 UK: 6 at +44.9% · 20 23:32 UK–21 00:21 UK: 6 at -33.3%
