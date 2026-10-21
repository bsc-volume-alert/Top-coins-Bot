# Diagnosis — OFF:momentum
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 318 | -8.8% | -9.7% | -24.9% | 38% | 46% | 143.3 | -1.406 | -3.12 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tp15 | 318 | -4.0% | -4.1% | 58% | -6.9% | -9.8% | +4.8% | +2.1% |
| x_t15s40 | 318 | -4.5% | -4.7% | 50% | -7.0% | -9.8% | +3.2% | +0.2% |
| x_t2s40 | 318 | -8.2% | -8.5% | 32% | -9.8% | -13.8% | -1.1% | -5.5% |
| x_h3 | 305 | -6.4% | -8.5% | 44% | -5.2% | -8.8% | -5.1% | -6.2% |
| x_flow4 (current) | 318 | -8.8% | -9.7% | 38% | -13.8% | -12.7% | +0.1% | -4.0% |
| x_tp | 318 | -9.6% | -9.9% | 38% | -12.8% | -19.3% | +3.2% | -2.1% |
| x_h5 | 303 | -7.7% | -10.1% | 46% | -6.7% | -10.2% | -5.9% | -7.5% |
| x_h15 | 302 | -8.8% | -11.1% | 47% | -9.1% | -11.4% | -5.3% | -8.4% |
| x_tsl40 | 318 | -10.3% | -12.1% | 24% | -14.5% | -16.4% | -0.1% | -3.7% |
| x_tsl60 | 317 | -22.7% | -24.3% | 22% | -29.7% | -21.9% | -16.3% | -19.1% |
| x_time | 317 | -39.2% | -40.6% | 16% | -42.3% | -38.3% | -36.8% | -38.4% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 26 | 8% | +128.6% | 7.65e+04 | 304 | 32.4 | 429 | 1 | 1e+05 | 17 | 3.47 |
| winners (0 to +50%) | 94 | 30% | +25.3% | 8.08e+04 | 536 | 34.8 | 386 | 1 | 1e+05 | 14 | 2.19 |
| small losers (-35% to 0) | 53 | 17% | -16.5% | 1.03e+05 | 620 | 30.7 | 452 | 1 | 1e+05 | 14 | 1.61 |
| stopped (<= -35%) | 145 | 46% | -52.8% | 7.5e+04 | 508 | 32.7 | 392 | 1 | 1e+05 | 15 | 1.22 |

## 4. Best 8 and worst 8 trades
- 21 Oct 00:52 UK **Kimchi Coin** +276.6% — entry_mc 5.14e+05, age_s 92, bundle_pct 40.1, buyers_entry 489, has_socials 0, vol5m_usd 1.01e+05, peak_mult 20.7
- 19 Oct 04:18 UK **SpaceXSITeslaBoringaLink** +276.6% — entry_mc 4.35e+04, age_s 90, bundle_pct 31.5, buyers_entry 533, has_socials 1, vol5m_usd 1e+05, peak_mult 11.8
- 19 Oct 01:46 UK **Universal Basic Income** +276.6% — entry_mc 6.01e+04, age_s 282, bundle_pct 31.1, buyers_entry 570, has_socials 1, vol5m_usd 1e+05, peak_mult 4.11
- 20 Oct 21:55 UK **Sexy Intelligence** +276.6% — entry_mc 4.09e+04, age_s 453, bundle_pct 5.65, buyers_entry 749, has_socials 0, vol5m_usd 1.11e+05, peak_mult 4.15
- 19 Oct 18:45 UK **Cure Cancer** +276.6% — entry_mc 5.51e+04, age_s 289, bundle_pct 17.9, buyers_entry 729, has_socials 1, vol5m_usd 1e+05, peak_mult 4.31
- 19 Oct 22:00 UK **Spidey Show** +276.6% — entry_mc 6.28e+04, age_s 303, bundle_pct 65.9, buyers_entry 299, has_socials 1, vol5m_usd 1e+05, peak_mult 19.5
- 20 Oct 20:19 UK **people.fun** +173.7% — entry_mc 2.11e+05, age_s 2.11e+06, buyers_entry 444, has_socials 0, vol5m_usd 5.93e+04, peak_mult 3.79
- 20 Oct 20:52 UK **Punchdog** +164.7% — entry_mc 8.46e+04, age_s 251, bundle_pct 73.1, buyers_entry 333, has_socials 1, vol5m_usd 1e+05, peak_mult 5.13

Worst:
- 19 Oct 21:01 UK **Songgang** -98.3% — entry_mc 4.46e+04, age_s 443, bundle_pct 40.1, has_socials 1, vol5m_usd 1e+05, peak_mult 1
- 19 Oct 16:36 UK **The gambler** -93.6% — entry_mc 1.13e+05, age_s 1.61e+03, bundle_pct 32.6, buyers_entry 930, has_socials 0, vol5m_usd 9.85e+04, peak_mult 1
- 19 Oct 01:45 UK **SpaceX Universal Basic Incom** -78.1% — entry_mc 3.98e+04, age_s 280, bundle_pct 44.6, buyers_entry 661, has_socials 1, vol5m_usd 1.08e+05, peak_mult 1.03
- 19 Oct 02:00 UK **The Bee** -73.2% — entry_mc 8.81e+04, age_s 1.1e+03, bundle_pct 25.8, buyers_entry 274, has_socials 1, vol5m_usd 5.26e+04, peak_mult 1.83
- 19 Oct 07:40 UK **The Spirit of Skate** -67.9% — entry_mc 8.3e+04, age_s 354, bundle_pct 74.6, buyers_entry 361, has_socials 1, vol5m_usd 1e+05, peak_mult 1.45
- 19 Oct 09:21 UK **Pelichair** -67.0% — entry_mc 6.05e+04, age_s 387, bundle_pct 74.3, buyers_entry 302, has_socials 1, vol5m_usd 1e+05, peak_mult 9.32
- 21 Oct 00:59 UK **Where's the Airdrop?** -61.5% — entry_mc 9.73e+04, age_s 162, bundle_pct 42.6, buyers_entry 540, has_socials 1, vol5m_usd 1e+05, peak_mult 1.2
- 19 Oct 08:25 UK **agenm** -61.0% — entry_mc 6.5e+04, age_s 422, bundle_pct 74.5, buyers_entry 428, has_socials 1, vol5m_usd 1e+05, peak_mult 1.04

## 5. Factor search (strict test) and luck check
88 cuts tried on 8 entry-time columns; 3 pass the strict test, 1 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **3 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|
| vol5m_usd >= 1.004e+05 | 48 | +17.2% | +11.6% | 270 at -13.4% | +2.0% / -0.8% / +50.8% | +0.350 | 1 |

## 8. Five time blocks
18 20:28 UK–19 04:53 UK: 64 at -10.1% · 19 05:12 UK–19 16:49 UK: 64 at -18.7% · 19 17:12 UK–20 00:28 UK: 64 at -8.9% · 20 00:29 UK–20 13:30 UK: 63 at -11.3% · 20 13:54 UK–21 01:25 UK: 63 at +5.1%
