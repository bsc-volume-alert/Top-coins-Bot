# Diagnosis — OFF:momdip
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 90 | -6.0% | -9.2% | -50.7% | 42% | 53% | 41.1 | -0.288 | -0.63 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_h3 | 90 | -6.3% | -8.7% | 44% | -13.2% | -10.5% | +4.8% | +4.4% |
| x_flow4 (current) | 90 | -6.0% | -9.2% | 42% | -13.7% | -0.7% | -3.6% | -1.1% |
| x_t15s40 | 90 | -10.2% | -10.8% | 46% | -19.2% | -8.5% | -2.9% | -2.2% |
| x_t2s40 | 90 | -11.0% | -12.1% | 30% | -20.4% | -16.4% | +3.8% | +2.9% |
| x_tp15 | 90 | -11.9% | -12.5% | 56% | -17.0% | -11.4% | -7.4% | -8.6% |
| x_h5 | 90 | -10.8% | -12.5% | 44% | -26.6% | -9.6% | +3.8% | +2.2% |
| x_tp | 90 | -12.8% | -13.9% | 39% | -13.2% | -26.0% | +0.8% | -2.9% |
| x_tsl40 | 90 | -12.7% | -15.1% | 26% | -25.6% | -16.7% | +4.3% | +1.9% |
| x_h15 | 90 | -8.3% | -17.6% | 46% | -26.6% | +8.5% | -6.8% | -7.6% |
| x_tsl60 | 90 | -27.9% | -35.3% | 13% | -44.6% | -17.8% | -21.2% | -24.0% |
| x_time | 90 | -49.1% | -53.7% | 11% | -55.7% | -45.0% | -46.7% | -49.2% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 18 | 20% | +77.2% | 4.98e+04 | 396 | — | — | — | 0 | 12 | 2.62 |
| winners (0 to +50%) | 20 | 22% | +31.8% | 5.35e+04 | 314 | — | — | — | 0 | 15 | 1.92 |
| small losers (-35% to 0) | 4 | 4% | -11.9% | 5.84e+04 | 286 | — | — | — | 0 | 22 | 1.69 |
| stopped (<= -35%) | 48 | 53% | -52.5% | 4.87e+04 | 466 | — | — | — | 0 | 13 | 1.19 |

## 4. Best 8 and worst 8 trades
- 19 Oct 22:01 UK **Spidey Show** +276.6% — entry_mc 5.02e+04, age_s 315, vol5m_usd 0, peak_mult 24.4
- 19 Oct 00:18 UK **jew looping** +87.9% — entry_mc 3.08e+04, age_s 261, vol5m_usd 0, peak_mult 3.57
- 20 Oct 12:04 UK **CATZILLA** +81.3% — entry_mc 3.34e+04, age_s 367, vol5m_usd 0, peak_mult 2.25
- 19 Oct 09:00 UK **World War Meme** +80.1% — entry_mc 4.49e+04, age_s 153, vol5m_usd 0, peak_mult 2.94
- 20 Oct 12:26 UK **Onion** +74.0% — entry_mc 3.4e+04, age_s 457, vol5m_usd 0, peak_mult 3.92
- 19 Oct 05:43 UK **SOLFI Finance** +72.5% — entry_mc 3.89e+04, age_s 527, vol5m_usd 0, peak_mult 3.05
- 19 Oct 23:01 UK **MrDuck** +68.9% — entry_mc 5.83e+04, age_s 397, vol5m_usd 0, peak_mult 2.57
- 20 Oct 07:01 UK **catos** +68.5% — entry_mc 3.24e+04, age_s 457, vol5m_usd 0, peak_mult 2.26

Worst:
- 19 Oct 01:47 UK **SpaceX Universal Basic Incom** -74.1% — entry_mc 1.24e+04, age_s 404, vol5m_usd 0, peak_mult 1
- 19 Oct 07:45 UK **The Spirit of Skate** -61.1% — entry_mc 3.48e+04, age_s 687, vol5m_usd 0, peak_mult 1
- 19 Oct 08:25 UK **agenm** -59.9% — entry_mc 3.2e+04, age_s 427, vol5m_usd 0, peak_mult 1
- 19 Oct 10:31 UK **Crabstache** -59.0% — entry_mc 3.07e+04, age_s 440, vol5m_usd 0, peak_mult 1
- 19 Oct 09:21 UK **Pelichair** -56.8% — entry_mc 4.84e+04, age_s 394, vol5m_usd 0, peak_mult 11.7
- 19 Oct 00:11 UK **Flying Lambo** -55.7% — entry_mc 4.86e+04, age_s 475, vol5m_usd 0, peak_mult 1
- 19 Oct 01:07 UK **Chainpad** -54.3% — entry_mc 3.22e+04, age_s 449, vol5m_usd 0, peak_mult 1.11
- 19 Oct 17:18 UK **Gachamon** -54.0% — entry_mc 3.19e+04, age_s 767, vol5m_usd 0, peak_mult 1.19

## 5. Factor search (strict test) and luck check
42 cuts tried on 4 entry-time columns; 1 pass the strict test, 1 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| age_s < 422 | 44 | +9.4% | +3.2% | 46 at -20.7% | -2.3% / +25.5% / +8.6% | +0.169 | 4 |

## 8. Five time blocks
18 21:10 UK–19 05:43 UK: 18 at -14.5% · 19 07:40 UK–19 16:33 UK: 18 at -6.9% · 19 17:13 UK–20 02:46 UK: 18 at -3.4% · 20 03:05 UK–20 12:49 UK: 18 at -0.1% · 20 12:51 UK–21 00:59 UK: 18 at -5.1%
