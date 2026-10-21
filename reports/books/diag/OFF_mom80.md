# Diagnosis — OFF:mom80
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 429 | -9.9% | -10.6% | -20.9% | 40% | 46% | 193.6 | -2.111 | -4.68 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h15 | 424 | -1.6% | -4.7% | 47% | +17.2% | -15.1% | -7.0% | -7.7% |
| x_tp15 | 427 | -4.8% | -4.9% | 57% | -9.3% | -3.6% | -1.6% | -3.7% |
| x_tsl40 | 429 | -3.1% | -6.1% | 23% | +13.6% | -17.2% | -5.6% | -6.5% |
| x_h5 | 429 | -4.0% | -7.1% | 43% | +7.1% | -11.2% | -7.9% | -8.1% |
| x_t15s40 | 429 | -7.2% | -7.3% | 47% | -9.9% | -7.9% | -3.7% | -4.6% |
| x_h3 | 429 | -5.8% | -8.8% | 41% | +0.8% | -11.0% | -7.1% | -7.3% |
| x_tp | 427 | -10.0% | -10.3% | 38% | -12.0% | -13.7% | -4.3% | -6.2% |
| x_flow4 (current) | 429 | -9.9% | -10.6% | 40% | -11.0% | -12.1% | -6.6% | -7.7% |
| x_t2s40 | 429 | -10.5% | -10.7% | 30% | -11.9% | -14.6% | -5.0% | -5.9% |
| x_tsl60 | 427 | -11.4% | -14.5% | 21% | +12.3% | -25.8% | -20.9% | -21.1% |
| x_time | 426 | -21.7% | -24.9% | 18% | +11.7% | -40.1% | -37.0% | -37.6% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 35 | 8% | +85.8% | 8.46e+04 | 348 | — | 392 | — | 0 | 18 | 3.16 |
| winners (0 to +50%) | 135 | 31% | +29.4% | 8.72e+04 | 617 | — | 403 | — | 0 | 15 | 2.1 |
| small losers (-35% to 0) | 61 | 14% | -14.5% | 1.41e+05 | 930 | — | 461 | — | 0 | 14 | 1.49 |
| stopped (<= -35%) | 198 | 46% | -52.2% | 1.07e+05 | 551 | — | 438 | — | 0 | 16 | 1.23 |

## 4. Best 8 and worst 8 trades
- 19 Oct 12:10 UK **CH6e2Q5X** +276.6% — entry_mc 2.18e+04, buyers_entry 378, vol5m_usd 0, peak_mult 3.8e+04
- 19 Oct 22:00 UK **Spidey Show** +276.6% — entry_mc 5.31e+04, age_s 270, buyers_entry 248, vol5m_usd 0, peak_mult 23.1
- 21 Oct 00:51 UK **Kimchi Coin** +276.6% — entry_mc 4.86e+05, age_s 79, buyers_entry 404, vol5m_usd 0, peak_mult 21.9
- 20 Oct 22:59 UK **WIPD** +170.4% — entry_mc 8.79e+04, age_s 641, buyers_entry 281, vol5m_usd 0, peak_mult 4.01
- 20 Oct 20:19 UK **4Y9mNjAj** +116.9% — entry_mc 2.66e+05, buyers_entry 637, vol5m_usd 0, peak_mult 3.01
- 19 Oct 19:44 UK **Pump Pack** +85.4% — entry_mc 4.75e+04, age_s 72, buyers_entry 511, vol5m_usd 0, peak_mult 3.56
- 20 Oct 09:36 UK **earth** +82.9% — entry_mc 1.11e+05, age_s 3.51e+03, buyers_entry 479, vol5m_usd 0, peak_mult 4.13
- 19 Oct 23:38 UK **FrunkStore** +81.2% — entry_mc 8.46e+04, age_s 7.39e+04, buyers_entry 442, vol5m_usd 0, peak_mult 4.29

Worst:
- 19 Oct 02:00 UK **The Bee** -81.3% — entry_mc 1.15e+05, age_s 1.11e+03, buyers_entry 409, vol5m_usd 0, peak_mult 1.4
- 20 Oct 19:30 UK **Fat Fomelon** -76.0% — entry_mc 5.47e+04, age_s 146, buyers_entry 340, vol5m_usd 0, peak_mult 1.71
- 21 Oct 01:29 UK **yumi umi** -75.9% — entry_mc 1.59e+05, age_s 3.59e+03, buyers_entry 520, vol5m_usd 0, peak_mult 1.03
- 20 Oct 23:56 UK **FKvHC3Wv** -70.9% — entry_mc 1.2e+05, buyers_entry 781, vol5m_usd 0, peak_mult 1.01
- 19 Oct 09:20 UK **Pelichair** -67.4% — entry_mc 6.12e+04, age_s 344, buyers_entry 260, vol5m_usd 0, peak_mult 9.22
- 20 Oct 04:51 UK **TAPINO** -63.7% — entry_mc 4.94e+04, age_s 580, buyers_entry 290, vol5m_usd 0, peak_mult 1.13
- 20 Oct 20:50 UK **Fomeball** -63.1% — entry_mc 6.1e+04, age_s 159, buyers_entry 351, vol5m_usd 0, peak_mult 1.02
- 19 Oct 10:31 UK **Crabstache** -62.9% — entry_mc 6.5e+04, age_s 409, buyers_entry 322, vol5m_usd 0, peak_mult 1.07

## 5. Factor search (strict test) and luck check
56 cuts tried on 5 entry-time columns; 1 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **1 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| entry_mc < 5.376e+04 | 65 | +9.9% | +5.7% | 364 at -13.4% | +14.1% / +19.3% / -1.4% | +0.261 | 0 |

## 8. Five time blocks
18 20:31 UK–19 05:49 UK: 86 at -14.1% · 19 06:06 UK–19 16:46 UK: 86 at -6.0% · 19 16:48 UK–19 23:57 UK: 86 at -17.6% · 20 00:11 UK–20 16:02 UK: 86 at -6.6% · 20 16:09 UK–21 01:36 UK: 85 at -5.2%
