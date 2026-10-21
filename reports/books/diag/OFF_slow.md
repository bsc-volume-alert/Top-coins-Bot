# Diagnosis — OFF:slow
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 99 | -11.3% | -12.3% | -16.3% | 38% | 38% | 45.4 | -0.557 | -1.22 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl40 | 99 | -7.8% | -9.9% | 24% | -7.1% | -16.7% | +0.3% | -6.4% |
| x_t15s40 | 99 | -9.5% | -10.0% | 40% | -2.8% | -17.5% | -8.1% | -12.2% |
| x_t2s40 | 99 | -9.3% | -10.2% | 30% | -8.9% | -21.2% | +2.3% | -6.3% |
| x_h3 | 99 | -8.6% | -10.6% | 40% | -2.5% | -12.6% | -10.7% | -13.3% |
| x_h5 | 98 | -8.2% | -11.9% | 41% | -0.3% | -14.2% | -10.0% | -12.8% |
| x_flow4 (current) | 99 | -11.3% | -12.3% | 38% | -8.3% | -18.7% | -6.8% | -12.2% |
| x_tp15 | 99 | -13.0% | -13.6% | 43% | -1.8% | -26.0% | -11.3% | -19.1% |
| x_tp | 99 | -12.6% | -13.6% | 33% | -7.5% | -29.5% | -0.8% | -12.6% |
| x_h15 | 97 | -13.0% | -14.7% | 41% | -9.9% | -18.8% | -10.1% | -14.0% |
| x_tsl60 | 99 | -18.6% | -19.6% | 25% | -19.6% | -28.1% | -8.0% | -16.8% |
| x_time | 99 | -17.4% | -26.3% | 25% | -4.7% | -32.6% | -15.0% | -22.4% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 6 | 6% | +66.4% | 2.77e+04 | 2.06e+03 | — | 490 | — | 0 | 13.5 | 2.08 |
| winners (0 to +50%) | 32 | 32% | +26.6% | 5.67e+04 | 1.19e+03 | — | 1.11e+03 | — | 0 | 12.5 | 1.89 |
| small losers (-35% to 0) | 23 | 23% | -16.8% | 3.53e+04 | 3e+03 | — | 1.12e+03 | — | 0 | 9 | 1.09 |
| stopped (<= -35%) | 38 | 38% | -52.0% | 7.29e+04 | 1.2e+03 | — | 1.07e+03 | — | 0 | 8.5 | 1.18 |

## 4. Best 8 and worst 8 trades
- 20 Oct 20:49 UK **catdog** +93.3% — entry_mc 4.79e+04, age_s 2.53e+03, buyers_entry 2.2e+03, vol5m_usd 0, peak_mult 2.22
- 19 Oct 12:31 UK **The Supreme Leader** +88.9% — entry_mc 9.14e+03, age_s 1.03e+03, buyers_entry 110, vol5m_usd 0, peak_mult 5.28
- 20 Oct 04:19 UK **Satoshinu Nakamutto** +59.0% — entry_mc 3.32e+04, age_s 1.14e+04, buyers_entry 492, vol5m_usd 0, peak_mult 1.83
- 19 Oct 23:33 UK **Onion Coin** +54.1% — entry_mc 2.22e+04, age_s 1.59e+03, buyers_entry 489, vol5m_usd 0, peak_mult 1.95
- 20 Oct 15:22 UK **Airdrop Cat** +51.7% — entry_mc 3.47e+04, age_s 2.91e+03, buyers_entry 901, vol5m_usd 0, peak_mult 3.45
- 20 Oct 01:44 UK **Masterball** +51.4% — entry_mc 9.59e+03, age_s 1.18e+03, buyers_entry 174, vol5m_usd 0, peak_mult 1.64
- 18 Oct 23:56 UK **Justice for Gar0u** +49.7% — entry_mc 5.51e+04, age_s 610, buyers_entry 813, vol5m_usd 0, peak_mult 2.72
- 20 Oct 21:05 UK **Energy Coin** +47.8% — entry_mc 1.03e+05, age_s 2.2e+03, buyers_entry 1.86e+03, vol5m_usd 0, peak_mult 4.92

Worst:
- 19 Oct 09:34 UK **Pelichair** -62.8% — entry_mc 4.42e+05, age_s 1.15e+03, buyers_entry 1.06e+03, vol5m_usd 0, peak_mult 1
- 20 Oct 21:22 UK **The Official Memecoin** -57.4% — entry_mc 1.37e+05, age_s 643, buyers_entry 2.04e+03, vol5m_usd 0, peak_mult 1.3
- 20 Oct 05:16 UK **love.fun** -56.2% — entry_mc 1.07e+05, age_s 1.09e+03, buyers_entry 987, vol5m_usd 0, peak_mult 1.12
- 20 Oct 02:33 UK **Network School Liquid** -54.6% — entry_mc 1.33e+05, age_s 4.82e+03, buyers_entry 1.07e+03, vol5m_usd 0, peak_mult 1.16
- 19 Oct 03:26 UK **FrunkStore** -54.0% — entry_mc 1.78e+04, age_s 1.24e+03, buyers_entry 503, vol5m_usd 0, peak_mult 1
- 20 Oct 04:09 UK **FYP** -53.7% — entry_mc 2.72e+04, age_s 1.67e+03, buyers_entry 291, vol5m_usd 0, peak_mult 1
- 19 Oct 05:57 UK **John Servil** -53.7% — entry_mc 2.09e+04, age_s 1.84e+03, buyers_entry 674, vol5m_usd 0, peak_mult 1.07
- 19 Oct 04:48 UK **Invest America** -52.6% — entry_mc 6.63e+04, age_s 935, buyers_entry 1.59e+03, vol5m_usd 0, peak_mult 1.25

## 5. Factor search (strict test) and luck check
56 cuts tried on 5 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 21:22 UK–19 07:00 UK: 20 at -10.1% · 19 07:05 UK–19 22:47 UK: 20 at -7.1% · 19 23:04 UK–20 04:42 UK: 20 at -23.6% · 20 05:16 UK–20 15:00 UK: 20 at -11.9% · 20 15:06 UK–21 01:15 UK: 19 at -3.2%
