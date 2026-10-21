# Diagnosis — R
_Data to 21 Oct 01:42 UK; ; exit x_tsl40; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 9 | +3.5% | -3.0% | -1.3% | 44% | 11% | 36.0 | +0.088 | +0.02 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl40 (current) | 9 | +3.5% | -3.0% | 44% | +19.0% | -17.3% | +8.7% | +3.5% |
| x_tp | 9 | +3.2% | -3.2% | 44% | +19.0% | -18.0% | +8.7% | +3.2% |
| x_tsl60 | 9 | +3.2% | -3.2% | 44% | +19.0% | -18.0% | +8.7% | +3.2% |
| x_time | 9 | +3.2% | -3.2% | 44% | +19.0% | -18.0% | +8.7% | +3.2% |
| x_h3 | 9 | +4.3% | -3.3% | 44% | +25.2% | -22.3% | +10.1% | +4.3% |
| x_t2s40 | 9 | +2.2% | -4.4% | 44% | +19.0% | -21.0% | +8.7% | +2.2% |
| x_h5 | 9 | +2.2% | -4.4% | 44% | +19.0% | -21.0% | +8.7% | +2.2% |
| x_h15 | 9 | +2.2% | -4.4% | 44% | +19.0% | -21.0% | +8.7% | +2.2% |
| x_flow4 | 9 | +3.1% | -4.4% | 44% | +22.3% | -21.0% | +8.0% | +3.1% |
| x_tp15 | 9 | -0.0% | -5.0% | 44% | +14.4% | -18.0% | +3.5% | -0.0% |
| x_t15s40 | 9 | -1.0% | -6.1% | 44% | +14.4% | -21.0% | +3.5% | -1.0% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 2 | 22% | +54.3% | 4.36e+04 | 2.01e+05 | — | — | — | 0 | 10 | 1.77 |
| winners (0 to +50%) | 2 | 22% | +9.1% | 5.18e+04 | 8.85e+04 | — | — | — | 0 | 22 | 1.37 |
| small losers (-35% to 0) | 4 | 44% | -14.0% | 8.24e+04 | 9.4e+04 | — | — | — | 0 | 21.5 | 1.13 |
| stopped (<= -35%) | 1 | 11% | -39.7% | 4.17e+04 | 2.32e+04 | — | — | — | 0 | 23 | 1.13 |

## 4. Best 8 and worst 8 trades
- 21 Oct 00:31 UK **onboardinu** +55.2% — entry_mc 2e+04, age_s 2.64e+05, vol5m_usd 0, peak_mult 1.7
- 20 Oct 20:46 UK **Extra Thick Hoe** +53.3% — entry_mc 6.72e+04, age_s 1.38e+05, vol5m_usd 0, peak_mult 1.85
- 20 Oct 21:16 UK **long degeneracy** +16.3% — entry_mc 4.39e+04, age_s 5.92e+04, vol5m_usd 0, peak_mult 1.5
- 20 Oct 23:32 UK **REAGENT ** +1.9% — entry_mc 5.97e+04, age_s 1.18e+05, vol5m_usd 0, peak_mult 1.23
- 21 Oct 00:31 UK **catonboard** -1.3% — entry_mc 2.32e+05, age_s 3.59e+05, vol5m_usd 0, peak_mult 1.18
- 20 Oct 21:24 UK **Tetsuo Super Intelligence** -12.6% — entry_mc 1.35e+04, age_s 5.87e+04, vol5m_usd 0, peak_mult 1.15
- 20 Oct 22:50 UK **Ash Ketchum** -14.2% — entry_mc 8.47e+04, age_s 7.98e+04, vol5m_usd 0, peak_mult 1.02
- 20 Oct 23:44 UK **PikaJew** -27.7% — entry_mc 8.01e+04, age_s 1.08e+05, vol5m_usd 0, peak_mult 1.11

Worst:
- 20 Oct 23:39 UK **ARTEMI** -39.7% — entry_mc 4.17e+04, age_s 2.32e+04, vol5m_usd 0, peak_mult 1.13
- 20 Oct 23:44 UK **PikaJew** -27.7% — entry_mc 8.01e+04, age_s 1.08e+05, vol5m_usd 0, peak_mult 1.11
- 20 Oct 22:50 UK **Ash Ketchum** -14.2% — entry_mc 8.47e+04, age_s 7.98e+04, vol5m_usd 0, peak_mult 1.02
- 20 Oct 21:24 UK **Tetsuo Super Intelligence** -12.6% — entry_mc 1.35e+04, age_s 5.87e+04, vol5m_usd 0, peak_mult 1.15
- 21 Oct 00:31 UK **catonboard** -1.3% — entry_mc 2.32e+05, age_s 3.59e+05, vol5m_usd 0, peak_mult 1.18
- 20 Oct 23:32 UK **REAGENT ** +1.9% — entry_mc 5.97e+04, age_s 1.18e+05, vol5m_usd 0, peak_mult 1.23
- 20 Oct 21:16 UK **long degeneracy** +16.3% — entry_mc 4.39e+04, age_s 5.92e+04, vol5m_usd 0, peak_mult 1.5
- 20 Oct 20:46 UK **Extra Thick Hoe** +53.3% — entry_mc 6.72e+04, age_s 1.38e+05, vol5m_usd 0, peak_mult 1.85

## 5. Factor search (strict test) and luck check
0 cuts tried on 0 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
20 20:46 UK–20 21:16 UK: 2 at +34.8% · 20 21:24 UK–20 22:50 UK: 2 at -13.4% · 20 23:32 UK–20 23:39 UK: 2 at -18.9% · 20 23:44 UK–21 00:31 UK: 2 at +13.7% · 21 00:31 UK–21 00:31 UK: 1 at -1.3%
