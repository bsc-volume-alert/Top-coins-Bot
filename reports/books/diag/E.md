# Diagnosis — E
_Data to 21 Oct 01:42 UK; abcd momentum rows; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 458 | -8.0% | -8.6% | -28.1% | 38% | 47% | 206.4 | -1.859 | -4.12 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tp15 | 318 | -4.0% | -4.1% | 58% | -6.5% | -10.3% | +5.6% | +2.1% |
| x_t15s40 | 458 | -4.9% | -5.0% | 51% | -6.3% | -11.0% | +2.7% | -0.7% |
| x_t2s40 | 458 | -7.5% | -7.7% | 33% | -8.9% | -13.1% | -0.5% | -5.7% |
| x_h3 | 440 | -6.3% | -7.7% | 45% | -2.5% | -10.1% | -6.1% | -8.0% |
| x_flow4 (current) | 458 | -8.0% | -8.6% | 38% | -11.7% | -11.5% | -0.7% | -4.6% |
| x_h5 | 437 | -7.7% | -9.4% | 47% | -3.8% | -11.7% | -7.6% | -9.4% |
| x_h15 | 436 | -8.2% | -9.8% | 47% | -7.5% | -10.2% | -6.6% | -10.0% |
| x_tp | 318 | -9.6% | -9.9% | 38% | -13.4% | -18.6% | +4.2% | -2.1% |
| x_tsl40 | 458 | -9.5% | -10.8% | 25% | -13.2% | -16.6% | +1.4% | -2.7% |
| x_tsl60 | 317 | -22.7% | -24.3% | 22% | -29.8% | -22.4% | -15.4% | -19.1% |
| x_time | 457 | -43.3% | -44.2% | 15% | -45.8% | -44.6% | -39.3% | -42.4% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 41 | 9% | +135.0% | 6.28e+04 | 303 | 34.4 | 429 | 1 | 1e+05 | 16 | 3.5 |
| winners (0 to +50%) | 133 | 29% | +25.1% | 7.48e+04 | 415 | 37.4 | 386 | 1 | 1e+05 | 14 | 2.2 |
| small losers (-35% to 0) | 70 | 15% | -16.8% | 8.44e+04 | 460 | 31.4 | 452 | 1 | 1e+05 | 14.5 | 1.63 |
| stopped (<= -35%) | 214 | 47% | -53.1% | 7.01e+04 | 443 | 33.2 | 392 | 1 | 1e+05 | 15 | 1.22 |

## 4. Best 8 and worst 8 trades
- 19 Oct 01:46 UK **Universal Basic Income** +276.6% — entry_mc 6.01e+04, age_s 282, bundle_pct 31.1, has_socials 1, peak_mult 4.11
- 19 Oct 01:46 UK **Universal Basic Income** +276.6% — entry_mc 6.01e+04, age_s 282, bundle_pct 31.1, buyers_entry 570, has_socials 1, vol5m_usd 1e+05, peak_mult 4.11
- 19 Oct 18:45 UK **Cure Cancer** +276.6% — entry_mc 5.51e+04, age_s 289, bundle_pct 17.9, buyers_entry 729, has_socials 1, vol5m_usd 1e+05, peak_mult 4.31
- 19 Oct 22:00 UK **Spidey Show** +276.6% — entry_mc 6.28e+04, age_s 303, bundle_pct 65.9, buyers_entry 299, has_socials 1, vol5m_usd 1e+05, peak_mult 19.5
- 19 Oct 22:00 UK **Spidey Show** +276.6% — entry_mc 6.28e+04, age_s 303, bundle_pct 65.9, has_socials 1, peak_mult 19.5
- 20 Oct 21:55 UK **Sexy Intelligence** +276.6% — entry_mc 4.09e+04, age_s 453, bundle_pct 5.65, peak_mult 4.15
- 20 Oct 21:55 UK **Sexy Intelligence** +276.6% — entry_mc 4.09e+04, age_s 453, bundle_pct 5.65, buyers_entry 749, has_socials 0, vol5m_usd 1.11e+05, peak_mult 4.15
- 19 Oct 04:18 UK **SpaceXSITeslaBoringaLink** +276.6% — entry_mc 4.35e+04, age_s 90, bundle_pct 31.5, buyers_entry 533, has_socials 1, vol5m_usd 1e+05, peak_mult 11.8

Worst:
- 19 Oct 21:01 UK **Songgang** -98.3% — entry_mc 4.46e+04, age_s 443, bundle_pct 40.1, has_socials 1, peak_mult 1
- 19 Oct 21:01 UK **Songgang** -98.3% — entry_mc 4.46e+04, age_s 443, bundle_pct 40.1, has_socials 1, vol5m_usd 1e+05, peak_mult 1
- 19 Oct 16:36 UK **The gambler** -93.6% — entry_mc 1.13e+05, age_s 1.61e+03, bundle_pct 32.6, buyers_entry 930, has_socials 0, vol5m_usd 9.85e+04, peak_mult 1
- 19 Oct 01:45 UK **SpaceX Universal Basic Incom** -78.1% — entry_mc 3.98e+04, age_s 280, bundle_pct 44.6, has_socials 1, peak_mult 1.03
- 19 Oct 01:45 UK **SpaceX Universal Basic Incom** -78.1% — entry_mc 3.98e+04, age_s 280, bundle_pct 44.6, buyers_entry 661, has_socials 1, vol5m_usd 1.08e+05, peak_mult 1.03
- 19 Oct 02:00 UK **The Bee** -73.2% — entry_mc 8.81e+04, age_s 1.1e+03, bundle_pct 25.8, buyers_entry 274, has_socials 1, vol5m_usd 5.26e+04, peak_mult 1.83
- 19 Oct 07:40 UK **The Spirit of Skate** -67.9% — entry_mc 8.3e+04, age_s 354, bundle_pct 74.6, buyers_entry 361, has_socials 1, vol5m_usd 1e+05, peak_mult 1.45
- 19 Oct 07:40 UK **The Spirit of Skate** -67.9% — entry_mc 8.3e+04, age_s 354, bundle_pct 74.6, has_socials 1, peak_mult 1.45

## 5. Factor search (strict test) and luck check
88 cuts tried on 8 entry-time columns; 4 pass the strict test, 1 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **3 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| vol5m_usd >= 1.002e+05 | 80 | +10.7% | +7.4% | 378 at -12.0% | -0.1% / +0.8% / +28.8% | +0.350 | 0 |
| entry_mc < 6.014e+04 | 115 | +7.3% | +5.0% | 343 at -13.1% | +17.3% / -5.9% / +5.5% | +0.329 | 1 |
| age_s < 165 | 68 | +5.0% | +0.9% | 390 at -10.3% | +7.7% / -6.6% / +9.5% | +0.122 | 5 |

## 8. Five time blocks
18 20:28 UK–19 05:13 UK: 92 at -7.2% · 19 05:42 UK–19 16:49 UK: 92 at -18.5% · 19 17:12 UK–20 00:52 UK: 92 at -5.9% · 20 01:08 UK–20 13:30 UK: 91 at -12.2% · 20 13:54 UK–21 01:25 UK: 91 at +3.9%
