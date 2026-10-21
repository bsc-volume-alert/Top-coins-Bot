# Diagnosis — OFF:gradrun
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 256 | -7.8% | -8.9% | -32.7% | 44% | 50% | 116.1 | -1.023 | -2.26 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tp15 | 256 | -2.1% | -2.2% | 65% | -3.9% | -5.5% | +3.1% | +4.7% |
| x_t15s40 | 256 | -5.1% | -5.3% | 52% | -12.1% | -6.3% | +3.1% | +4.2% |
| x_h3 | 256 | -6.8% | -8.2% | 46% | -9.8% | -9.1% | -1.4% | +0.1% |
| x_flow4 (current) | 256 | -7.8% | -8.9% | 44% | -18.7% | -2.5% | -2.1% | +1.5% |
| x_tp | 256 | -10.0% | -10.4% | 41% | -11.8% | -11.5% | -6.8% | -0.8% |
| x_h15 | 255 | -9.4% | -11.2% | 49% | -13.1% | -7.1% | -8.0% | -3.7% |
| x_h5 | 256 | -9.2% | -11.5% | 47% | -10.0% | -11.3% | -6.2% | -3.7% |
| x_t2s40 | 256 | -11.4% | -11.8% | 30% | -20.3% | -8.9% | -4.9% | -0.1% |
| x_tsl40 | 256 | -14.4% | -15.6% | 23% | -22.0% | -13.9% | -7.2% | -3.8% |
| x_tsl60 | 255 | -25.6% | -27.7% | 19% | -30.5% | -23.3% | -22.8% | -21.0% |
| x_time | 255 | -44.7% | -46.7% | 16% | -39.8% | -50.0% | -44.4% | -44.3% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 29 | 11% | +88.9% | 5.77e+04 | 223 | — | 526 | — | 0 | 15 | 2.84 |
| winners (0 to +50%) | 84 | 33% | +27.6% | 6.42e+04 | 220 | — | 529 | — | 0 | 14.5 | 2.07 |
| small losers (-35% to 0) | 15 | 6% | -9.0% | 7.98e+04 | 187 | — | 388 | — | 0 | 14 | 1.82 |
| stopped (<= -35%) | 128 | 50% | -52.8% | 6.47e+04 | 258 | — | 568 | — | 0 | 15.5 | 1.28 |

## 4. Best 8 and worst 8 trades
- 21 Oct 00:52 UK **Kimchi Coin** +276.6% — entry_mc 5.25e+05, age_s 130, buyers_entry 526, vol5m_usd 0, peak_mult 20.3
- 19 Oct 21:59 UK **Spidey Show** +276.6% — entry_mc 5.9e+04, age_s 204, buyers_entry 352, vol5m_usd 0, peak_mult 20.8
- 19 Oct 18:43 UK **Cure Cancer** +276.6% — entry_mc 4.85e+04, age_s 163, buyers_entry 686, vol5m_usd 0, peak_mult 4.9
- 20 Oct 22:59 UK **WIPD** +125.4% — entry_mc 1.04e+05, age_s 613, buyers_entry 458, vol5m_usd 0, peak_mult 3.4
- 20 Oct 03:27 UK **แบคโฮ** +98.4% — entry_mc 4.85e+04, age_s 101, buyers_entry 516, vol5m_usd 0, peak_mult 2.29
- 20 Oct 13:53 UK **Punani Coin** +86.6% — entry_mc 5.77e+04, age_s 146, buyers_entry 574, vol5m_usd 0, peak_mult 2.84
- 20 Oct 05:16 UK **MEOWAIR** +86.3% — entry_mc 6.54e+04, age_s 336, buyers_entry 353, vol5m_usd 0, peak_mult 3.81
- 20 Oct 23:22 UK **Jensen the Turtle** +84.8% — entry_mc 4.66e+04, age_s 462, buyers_entry 873, vol5m_usd 0, peak_mult 2.19

Worst:
- 19 Oct 04:26 UK **SpaceXSITeslaBoringaLink** -79.7% — entry_mc 5e+04, age_s 258, buyers_entry 493, vol5m_usd 0, peak_mult 1.53
- 19 Oct 10:29 UK **Crabstache** -76.3% — entry_mc 4.76e+04, age_s 299, buyers_entry 366, vol5m_usd 0, peak_mult 1.46
- 20 Oct 19:30 UK **Fat Fomelon** -75.5% — entry_mc 5.39e+04, age_s 141, buyers_entry 335, vol5m_usd 0, peak_mult 1.73
- 21 Oct 00:45 UK **Larp** -67.1% — entry_mc 6.12e+04, age_s 86, buyers_entry 318, vol5m_usd 0, peak_mult 1.21
- 19 Oct 08:42 UK **Rain't** -65.2% — entry_mc 5.8e+04, age_s 335, buyers_entry 470, vol5m_usd 0, peak_mult 1.09
- 19 Oct 11:06 UK **OTTERHOLD** -64.2% — entry_mc 5.57e+04, age_s 266, buyers_entry 444, vol5m_usd 0, peak_mult 1
- 21 Oct 00:00 UK **The Pill** -60.9% — entry_mc 1.12e+05, age_s 13, buyers_entry 224, vol5m_usd 0, peak_mult 1.51
- 19 Oct 09:19 UK **Pelichair** -60.6% — entry_mc 5.23e+04, age_s 259, buyers_entry 330, vol5m_usd 0, peak_mult 10.8

## 5. Factor search (strict test) and luck check
56 cuts tried on 5 entry-time columns; 0 pass the strict test, 1 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 20:47 UK–19 07:22 UK: 52 at -18.7% · 19 07:36 UK–19 18:59 UK: 51 at -13.3% · 19 19:26 UK–20 01:44 UK: 51 at -9.4% · 20 02:02 UK–20 17:13 UK: 51 at +7.7% · 20 17:24 UK–21 01:30 UK: 51 at -5.1%
