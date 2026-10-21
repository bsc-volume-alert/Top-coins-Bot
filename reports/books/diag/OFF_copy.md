# Diagnosis — OFF:copy
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 664 | -12.6% | -13.0% | -56.4% | 19% | 76% | 304.9 | -4.142 | -9.02 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_t15s40 | 664 | -8.7% | -8.8% | 50% | -9.2% | -6.1% | -10.9% | — |
| x_tsl40 | 664 | -7.5% | -9.4% | 23% | +4.1% | -13.7% | -12.9% | — |
| x_tp15 | 664 | -9.6% | -9.7% | 59% | -8.6% | -8.2% | -12.0% | — |
| x_t2s40 | 664 | -9.6% | -9.8% | 33% | -10.7% | -5.8% | -12.3% | — |
| x_tp | 664 | -12.8% | -12.9% | 40% | -10.6% | -8.3% | -19.4% | — |
| x_flow4 (current) | 664 | -12.6% | -13.0% | 19% | -0.8% | -16.5% | -20.5% | — |
| x_h3 | 664 | -18.9% | -20.9% | 32% | -9.0% | -20.4% | -27.4% | — |
| x_h15 | 664 | -21.0% | -22.9% | 31% | -13.1% | -22.5% | -27.4% | — |
| x_h5 | 664 | -21.0% | -22.9% | 31% | -13.1% | -22.5% | -27.4% | — |
| x_tsl60 | 664 | -23.7% | -25.6% | 17% | -15.9% | -30.5% | -24.7% | — |
| x_time | 664 | -35.8% | -37.8% | 11% | -22.7% | -41.7% | -42.9% | — |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 102 | 15% | +227.6% | 2.51e+03 | — | — | — | — | 0 | 7 | 5.96 |
| winners (0 to +50%) | 23 | 3% | +24.4% | 2.25e+03 | — | — | — | — | 0 | 8 | 2.84 |
| small losers (-35% to 0) | 35 | 5% | -13.0% | 3.58e+03 | — | — | — | — | 0 | 9 | 1.86 |
| stopped (<= -35%) | 504 | 76% | -62.9% | 2.7e+03 | — | — | — | — | 0 | 8 | 1.47 |

## 4. Best 8 and worst 8 trades
- 19 Oct 03:08 UK **Unplug** +276.6% — entry_mc 3.24e+03, vol5m_usd 0, peak_mult 6.25
- 19 Oct 03:17 UK **DrivingCroonerBaby** +276.6% — entry_mc 3.45e+03, vol5m_usd 0, peak_mult 5.43
- 19 Oct 03:19 UK **Beetle** +276.6% — entry_mc 1.16e+03, vol5m_usd 0, peak_mult 5.09
- 19 Oct 03:03 UK **WHITE SUIT PEPE MASQUERADE ** +276.6% — entry_mc 6.85e+03, vol5m_usd 0, peak_mult 21.1
- 19 Oct 13:51 UK **MOON BAGS** +276.6% — entry_mc 1.16e+03, vol5m_usd 0, peak_mult 4.8
- 19 Oct 05:05 UK **What's Up Dogg** +276.6% — entry_mc 6.06e+03, vol5m_usd 0, peak_mult 4.81
- 19 Oct 04:49 UK **SNOOPY** +276.6% — entry_mc 425, vol5m_usd 0, peak_mult 4.79
- 19 Oct 08:31 UK **Invent Pad** +276.6% — entry_mc 2.03e+03, vol5m_usd 0, peak_mult 4.95

Worst:
- 19 Oct 02:37 UK **Keyboard Cat** -100.0% — entry_mc 367, vol5m_usd 0, peak_mult 2.05
- 19 Oct 12:52 UK **himimi** -90.6% — entry_mc 2.68e+03, vol5m_usd 0, peak_mult 1.64
- 19 Oct 10:29 UK **Exit Liquidity** -89.0% — entry_mc 6.34e+03, vol5m_usd 0, peak_mult 1.55
- 19 Oct 06:08 UK **Pump Buddy** -88.7% — entry_mc 595, vol5m_usd 0, peak_mult 1.53
- 19 Oct 09:12 UK **what stop sign dog** -87.9% — entry_mc 2.1e+03, vol5m_usd 0, peak_mult 1.53
- 19 Oct 10:03 UK **POPPYCOIN** -86.9% — entry_mc 5.13e+03, vol5m_usd 0, peak_mult 1.51
- 19 Oct 11:44 UK **TESLA CAR** -86.2% — entry_mc 2.16e+03, vol5m_usd 0, peak_mult 1.73
- 19 Oct 14:03 UK **magnificent 7** -85.7% — entry_mc 2.74e+03, vol5m_usd 0, peak_mult 1.73

## 5. Factor search (strict test) and luck check
28 cuts tried on 3 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 21:26 UK–19 04:32 UK: 133 at +5.9% · 19 04:33 UK–19 07:02 UK: 133 at -9.3% · 19 07:03 UK–19 09:39 UK: 133 at -20.9% · 19 09:39 UK–19 11:56 UK: 133 at -20.4% · 19 11:57 UK–19 17:12 UK: 132 at -18.2%
