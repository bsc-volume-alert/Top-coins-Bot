# Diagnosis — OFF:revival
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 155 | -13.5% | -14.0% | -12.9% | 31% | 34% | 70.4 | -1.018 | -2.24 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl60 | 155 | -7.1% | -12.5% | 27% | -15.2% | -7.4% | +1.3% | -1.1% |
| x_h3 | 155 | -12.1% | -13.1% | 31% | -17.7% | -9.7% | -8.8% | -8.9% |
| x_time | 155 | -7.8% | -13.1% | 27% | -15.3% | -8.4% | +0.5% | -2.3% |
| x_t15s40 | 155 | -13.4% | -13.7% | 32% | -16.7% | -9.8% | -13.6% | -13.1% |
| x_tp15 | 155 | -13.5% | -13.8% | 34% | -17.2% | -8.5% | -14.8% | -14.1% |
| x_tp | 155 | -13.3% | -13.9% | 29% | -14.3% | -10.9% | -14.6% | -14.7% |
| x_flow4 (current) | 155 | -13.5% | -14.0% | 31% | -16.0% | -11.7% | -12.6% | -13.2% |
| x_t2s40 | 155 | -13.8% | -14.4% | 28% | -14.7% | -12.3% | -14.3% | -14.3% |
| x_h5 | 155 | -14.3% | -15.9% | 32% | -17.9% | -13.8% | -11.0% | -13.0% |
| x_h15 | 151 | -13.3% | -16.4% | 31% | -17.9% | -14.1% | -7.4% | -10.8% |
| x_tsl40 | 155 | -14.4% | -16.6% | 25% | -17.4% | -16.9% | -8.8% | -12.7% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 9 | 6% | +62.0% | 8.32e+03 | — | — | 101 | — | 0 | 17 | 1.87 |
| winners (0 to +50%) | 39 | 25% | +21.2% | 1.11e+04 | — | — | 109 | — | 0 | 14 | 1.46 |
| small losers (-35% to 0) | 55 | 35% | -15.4% | 8.1e+03 | — | — | 73 | — | 0 | 12 | 1.08 |
| stopped (<= -35%) | 52 | 34% | -50.5% | 9.89e+03 | — | — | 95 | — | 0 | 14.5 | 1.05 |

## 4. Best 8 and worst 8 trades
- 19 Oct 17:49 UK **The Coldest Cat** +75.0% — entry_mc 5.73e+03, buyers_entry 28, vol5m_usd 0, peak_mult 2.49
- 20 Oct 11:44 UK **The Last Hope** +70.9% — entry_mc 1.16e+04, buyers_entry 179, vol5m_usd 0, peak_mult 15.1
- 19 Oct 12:48 UK **Pungsan** +69.4% — entry_mc 8.19e+03, buyers_entry 101, vol5m_usd 0, peak_mult 2.07
- 19 Oct 18:26 UK **Sited** +61.4% — entry_mc 6.78e+03, buyers_entry 20, vol5m_usd 0, peak_mult 1.87
- 19 Oct 21:49 UK **Kim Jong Cat** +59.6% — entry_mc 1.21e+04, buyers_entry 138, vol5m_usd 0, peak_mult 1.81
- 20 Oct 22:11 UK **PvECat** +58.9% — entry_mc 1.3e+04, buyers_entry 24, vol5m_usd 0, peak_mult 3.43
- 19 Oct 15:36 UK **Wojak** +57.7% — entry_mc 8.32e+03, buyers_entry 106, vol5m_usd 0, peak_mult 1.69
- 20 Oct 21:46 UK **Privacycoin** +54.6% — entry_mc 1.18e+04, buyers_entry 371, vol5m_usd 0, peak_mult 1.67

Worst:
- 18 Oct 21:19 UK **Captain America de Paris** -77.3% — entry_mc 1.48e+04, buyers_entry 125, vol5m_usd 0, peak_mult 1
- 20 Oct 15:33 UK **Slab Slam** -62.9% — entry_mc 1.18e+04, buyers_entry 23, vol5m_usd 0, peak_mult 1.17
- 18 Oct 21:49 UK **Grokies** -60.9% — entry_mc 5.87e+03, buyers_entry 223, vol5m_usd 0, peak_mult 1
- 20 Oct 20:51 UK **Kickback** -60.4% — entry_mc 1.99e+04, buyers_entry 28, vol5m_usd 0, peak_mult 1
- 20 Oct 03:45 UK **Justice for Lacy** -54.0% — entry_mc 8.23e+03, buyers_entry 20, vol5m_usd 0, peak_mult 1
- 18 Oct 22:42 UK **Meme Father ** -53.8% — entry_mc 1.46e+04, buyers_entry 117, vol5m_usd 0, peak_mult 1.02
- 20 Oct 10:10 UK **Earth Pokémon** -53.7% — entry_mc 1.06e+04, buyers_entry 32, vol5m_usd 0, peak_mult 1.39
- 20 Oct 01:51 UK **Poke Arena** -53.6% — entry_mc 8.66e+03, buyers_entry 30, vol5m_usd 0, peak_mult 1.06

## 5. Factor search (strict test) and luck check
42 cuts tried on 4 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 20:54 UK–19 08:13 UK: 31 at -22.1% · 19 09:11 UK–19 21:05 UK: 31 at -7.8% · 19 21:22 UK–20 08:04 UK: 31 at -14.4% · 20 08:08 UK–20 15:48 UK: 31 at -9.9% · 20 15:51 UK–21 01:19 UK: 31 at -13.0%
