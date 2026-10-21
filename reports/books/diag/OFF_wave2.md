# Diagnosis — OFF:wave2
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 800 | -10.8% | -11.2% | -50.8% | 38% | 53% | 360.3 | -4.263 | -9.47 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl40 | 800 | -10.4% | -11.0% | 25% | -10.4% | -9.5% | -11.2% | -12.5% |
| x_flow4 (current) | 800 | -10.8% | -11.2% | 38% | -10.1% | -11.6% | -10.8% | -11.1% |
| x_h3 | 794 | -11.2% | -11.6% | 40% | -10.8% | -11.7% | -11.2% | -12.4% |
| x_h5 | 794 | -11.8% | -12.5% | 40% | -9.5% | -14.4% | -11.4% | -12.9% |
| x_t15s40 | 800 | -13.2% | -13.3% | 40% | -14.9% | -12.5% | -12.2% | -12.5% |
| x_t2s40 | 800 | -13.4% | -13.6% | 29% | -16.6% | -13.7% | -10.0% | -12.2% |
| x_h15 | 788 | -14.1% | -15.8% | 40% | -10.6% | -16.6% | -15.1% | -16.2% |
| x_tp15 | 800 | -16.1% | -16.2% | 43% | -15.5% | -15.5% | -17.3% | -17.1% |
| x_tp | 800 | -17.0% | -17.1% | 31% | -17.0% | -17.1% | -16.8% | -17.7% |
| x_tsl60 | 800 | -19.1% | -20.3% | 24% | -15.6% | -23.2% | -18.6% | -20.4% |
| x_time | 800 | -26.6% | -27.6% | 21% | -23.2% | -29.2% | -27.4% | -27.4% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 115 | 14% | +80.4% | 1.49e+04 | — | — | 244 | — | 0 | 17 | 2.72 |
| winners (0 to +50%) | 191 | 24% | +30.3% | 1.62e+04 | — | — | 252 | — | 0 | 15 | 1.82 |
| small losers (-35% to 0) | 73 | 9% | -12.3% | 1.44e+04 | — | — | 190 | — | 0 | 14 | 1.19 |
| stopped (<= -35%) | 421 | 53% | -54.2% | 1.56e+04 | — | — | 253 | — | 0 | 15 | 1.15 |

## 4. Best 8 and worst 8 trades
- 19 Oct 01:08 UK **Teddy The Squirrel** +276.6% — entry_mc 1.38e+04, buyers_entry 370, vol5m_usd 0, peak_mult 4.67
- 19 Oct 09:56 UK **cute animal tek** +211.4% — entry_mc 1.51e+04, buyers_entry 187, vol5m_usd 0, peak_mult 3.49
- 19 Oct 15:52 UK **Trump Coin** +203.7% — entry_mc 1.36e+04, buyers_entry 226, vol5m_usd 0, peak_mult 6.16
- 19 Oct 20:55 UK **Songgang** +183.8% — entry_mc 1.46e+04, buyers_entry 173, vol5m_usd 0, peak_mult 3.9
- 19 Oct 13:01 UK **make me rich make no mistake** +163.4% — entry_mc 1.55e+04, buyers_entry 299, vol5m_usd 0, peak_mult 2.81
- 19 Oct 14:02 UK **MAG-7** +159.3% — entry_mc 1.81e+04, buyers_entry 244, vol5m_usd 0, peak_mult 3.33
- 18 Oct 21:32 UK **French Goku Hero** +148.4% — entry_mc 2.95e+04, buyers_entry 245, vol5m_usd 0, peak_mult 3.4
- 20 Oct 20:11 UK **shithouse** +138.7% — entry_mc 1.26e+04, buyers_entry 184, vol5m_usd 0, peak_mult 7.21

Worst:
- 21 Oct 01:30 UK **40 MILLION DOLLARS IN 1 HOUR** -95.2% — entry_mc 3.49e+04, buyers_entry 409, vol5m_usd 0, peak_mult 1.15
- 19 Oct 13:43 UK **Benny the brave** -94.5% — entry_mc 2.13e+04, buyers_entry 500, vol5m_usd 0, peak_mult 1.41
- 20 Oct 23:43 UK **Lüh Shmünk** -91.4% — entry_mc 2.97e+04, buyers_entry 377, vol5m_usd 0, peak_mult 1.36
- 20 Oct 23:05 UK **Optimistic Inu** -90.5% — entry_mc 3.34e+04, buyers_entry 442, vol5m_usd 0, peak_mult 1.25
- 20 Oct 03:37 UK **RhinoCoin** -88.3% — entry_mc 1.73e+04, buyers_entry 404, vol5m_usd 0, peak_mult 1.01
- 19 Oct 23:13 UK **The Slow Runner** -88.2% — entry_mc 1.83e+04, buyers_entry 363, vol5m_usd 0, peak_mult 1.25
- 20 Oct 21:15 UK **Bags** -86.9% — entry_mc 3.23e+04, buyers_entry 190, vol5m_usd 0, peak_mult 1
- 19 Oct 14:20 UK **Brainrot Language Model** -84.9% — entry_mc 1.24e+04, buyers_entry 309, vol5m_usd 0, peak_mult 1

## 5. Factor search (strict test) and luck check
42 cuts tried on 4 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 20:25 UK–19 09:56 UK: 160 at -9.6% · 19 10:05 UK–19 19:36 UK: 160 at -13.2% · 19 19:37 UK–20 06:20 UK: 160 at -11.3% · 20 06:22 UK–20 17:11 UK: 160 at -5.0% · 20 17:19 UK–21 01:30 UK: 160 at -15.0%
