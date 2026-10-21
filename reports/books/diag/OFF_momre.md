# Diagnosis — OFF:momre
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 177 | -18.6% | -20.3% | -50.8% | 32% | 62% | 81.0 | -1.586 | -3.47 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h3 | 177 | -8.2% | -15.8% | 28% | +2.3% | -13.4% | -13.6% | -15.6% |
| x_h5 | 177 | -9.3% | -16.9% | 35% | -1.0% | -16.0% | -11.0% | -14.5% |
| x_t15s40 | 177 | -17.1% | -17.5% | 38% | -24.5% | -15.3% | -11.6% | -13.9% |
| x_tsl40 | 177 | -10.9% | -18.5% | 18% | -2.7% | -17.5% | -12.5% | -17.2% |
| x_h15 | 177 | -12.2% | -19.7% | 36% | -10.1% | -8.7% | -17.7% | -20.2% |
| x_flow4 (current) | 177 | -18.6% | -20.3% | 32% | -20.6% | -17.3% | -17.8% | -18.8% |
| x_t2s40 | 177 | -20.4% | -21.0% | 23% | -21.8% | -25.4% | -14.0% | -24.4% |
| x_tsl60 | 177 | -13.7% | -21.3% | 11% | +21.7% | -29.8% | -33.0% | -37.8% |
| x_tp15 | 177 | -29.2% | -29.6% | 44% | -40.6% | -26.8% | -20.3% | -24.4% |
| x_tp | 177 | -34.2% | -34.9% | 28% | -38.1% | -38.8% | -25.8% | -40.7% |
| x_time | 177 | -42.3% | -50.0% | 7% | -1.8% | -58.5% | -66.6% | -69.7% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 13 | 7% | +105.2% | 8.88e+04 | 509 | — | — | — | 0 | 17 | 3.41 |
| winners (0 to +50%) | 44 | 25% | +27.8% | 1.06e+05 | 567 | — | — | — | 0 | 13 | 2.11 |
| small losers (-35% to 0) | 11 | 6% | -16.1% | 1.51e+05 | 684 | — | — | — | 0 | 13 | 2.03 |
| stopped (<= -35%) | 109 | 62% | -52.3% | 1.18e+05 | 663 | — | — | — | 0 | 13 | 1.29 |

## 4. Best 8 and worst 8 trades
- 19 Oct 12:21 UK **FXaQmQo8** +276.6% — entry_mc 2.77e+04, vol5m_usd 0, peak_mult 3.67e+04
- 19 Oct 12:39 UK **F1DqwvPy** +276.6% — entry_mc 3.11e+04, vol5m_usd 0, peak_mult 3.15e+04
- 19 Oct 01:41 UK **Hoot** +123.4% — entry_mc 1.07e+05, age_s 601, vol5m_usd 0, peak_mult 3.81
- 19 Oct 15:53 UK **CUMTARD** +107.2% — entry_mc 7.67e+04, age_s 404, vol5m_usd 0, peak_mult 2.67
- 20 Oct 20:54 UK **Punchdog** +74.8% — entry_mc 1.28e+05, age_s 376, vol5m_usd 0, peak_mult 3.41
- 19 Oct 09:26 UK **Pelichair** +69.2% — entry_mc 2.52e+05, age_s 673, vol5m_usd 0, peak_mult 2.23
- 18 Oct 21:39 UK **French Goku Hero** +68.3% — entry_mc 5.07e+04, age_s 550, vol5m_usd 0, peak_mult 2.05
- 20 Oct 21:58 UK **SpaceXSuperIntelligence** +66.6% — entry_mc 1.85e+05, age_s 461, vol5m_usd 0, peak_mult 4.3

Worst:
- 20 Oct 03:38 UK **GTA VI COIN** -74.0% — entry_mc 1.5e+05, age_s 690, vol5m_usd 0, peak_mult 1.19
- 19 Oct 10:49 UK **Sluggie** -62.3% — entry_mc 8.6e+04, age_s 642, vol5m_usd 0, peak_mult 1.41
- 19 Oct 09:27 UK **Pelichair** -61.0% — entry_mc 4.25e+05, age_s 773, vol5m_usd 0, peak_mult 1.32
- 20 Oct 21:29 UK **The Official Memecoin** -56.9% — entry_mc 1.2e+05, age_s 1.07e+03, vol5m_usd 0, peak_mult 1.31
- 19 Oct 09:04 UK **Conedemnation** -56.4% — entry_mc 1.17e+05, age_s 674, vol5m_usd 0, peak_mult 1.47
- 20 Oct 12:34 UK **Onion** -56.1% — entry_mc 1.09e+05, age_s 937, vol5m_usd 0, peak_mult 1.22
- 19 Oct 19:48 UK **Pump Pack** -55.4% — entry_mc 1.49e+05, age_s 313, vol5m_usd 0, peak_mult 1.02
- 19 Oct 04:56 UK **SpaceXSITeslaBoringaLink** -55.1% — entry_mc 1.99e+05, age_s 969, vol5m_usd 0, peak_mult 1.6

## 5. Factor search (strict test) and luck check
42 cuts tried on 4 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 21:15 UK–19 06:56 UK: 36 at -30.1% · 19 06:57 UK–19 17:41 UK: 36 at -6.6% · 19 18:48 UK–20 06:46 UK: 35 at -17.7% · 20 06:54 UK–20 13:35 UK: 35 at -25.1% · 20 13:40 UK–21 00:26 UK: 35 at -13.5%
