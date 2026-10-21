# Diagnosis — OFF:confirm
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_tsl40; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 886 | -17.6% | -18.6% | -35.7% | 19% | 51% | 399.3 | -7.425 | -16.48 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl40 (current) | 886 | -17.6% | -18.6% | 19% | -15.4% | -18.8% | -18.6% | -18.7% |
| x_tp15 | 871 | -23.4% | -23.5% | 43% | -24.4% | -23.8% | -21.9% | -20.4% |
| x_tsl60 | 871 | -36.6% | -38.1% | 12% | -27.6% | -38.5% | -44.0% | -41.3% |
| x_time | 861 | -48.3% | -49.9% | 8% | -39.5% | -50.0% | -56.0% | -54.2% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 68 | 8% | +180.8% | 1.32e+04 | — | 25.1 | 227 | 1 | — | 13.5 | 4.45 |
| winners (0 to +50%) | 98 | 11% | +18.0% | 1.34e+04 | — | 21.8 | 234 | 1 | — | 15 | 2.19 |
| small losers (-35% to 0) | 265 | 30% | -20.2% | 1.23e+04 | — | 24 | 199 | 1 | — | 15 | 1.52 |
| stopped (<= -35%) | 455 | 51% | -53.4% | 1.2e+04 | — | 24.2 | 210 | 1 | — | 15 | 1.11 |

## 4. Best 8 and worst 8 trades
- 19 Oct 13:14 UK **web4** +908.8% — entry_mc 1.95e+04, bundle_pct 3.42, buyers_entry 253, has_socials 1, peak_mult 10.7
- 19 Oct 12:19 UK **Rip Kim Jong-Un** +882.3% — entry_mc 1.13e+04, bundle_pct 21.7, buyers_entry 383, has_socials 1, peak_mult 17.4
- 18 Oct 21:46 UK **godspeed** +752.2% — entry_mc 1.43e+04, bundle_pct 35.9, buyers_entry 421, has_socials 1, peak_mult 9.02
- 20 Oct 20:22 UK **Energy Coin** +456.5% — entry_mc 6.98e+03, bundle_pct 26.1, buyers_entry 80, has_socials 1, peak_mult 26.3
- 20 Oct 22:25 UK **Bitcoin Bull Run** +448.5% — entry_mc 2.44e+04, bundle_pct 27.7, buyers_entry 557, has_socials 1, peak_mult 10.3
- 19 Oct 10:33 UK **tinybeehee** +405.7% — entry_mc 5.18e+03, bundle_pct 17.1, buyers_entry 51, has_socials 1, peak_mult 5.36
- 20 Oct 22:34 UK **SpaceXTesla** +346.6% — entry_mc 1.03e+04, bundle_pct 26.8, buyers_entry 193, has_socials 1, peak_mult 8.22
- 19 Oct 23:23 UK **pip** +341.3% — entry_mc 9.85e+03, bundle_pct 32.8, buyers_entry 395, has_socials 1, peak_mult 13.7

Worst:
- 19 Oct 13:51 UK **TamPad** -102.1% — entry_mc 3.45e+04, bundle_pct 23, buyers_entry 947, has_socials 1, peak_mult 1.66
- 20 Oct 16:03 UK **Agentopia** -102.0% — entry_mc 3.56e+04, bundle_pct 30.1, buyers_entry 1.05e+03, has_socials 1, peak_mult 1.16
- 20 Oct 05:11 UK **Cup Otter** -101.9% — entry_mc 3.47e+04, bundle_pct 51.6, buyers_entry 247, has_socials 1, peak_mult 1.81
- 19 Oct 19:50 UK **FOMOBILL** -101.4% — entry_mc 3.04e+04, bundle_pct 49.2, buyers_entry 165, has_socials 0, peak_mult 1.32
- 19 Oct 20:48 UK **no thanks i use fomo** -101.4% — entry_mc 3.04e+04, bundle_pct 60.9, buyers_entry 256, has_socials 1, peak_mult 4.27
- 19 Oct 19:56 UK **Epic Coin** -100.6% — entry_mc 3.93e+04, bundle_pct 23.8, buyers_entry 945, has_socials 1, peak_mult 1.03
- 19 Oct 19:40 UK **Krew** -100.3% — entry_mc 2.66e+04, bundle_pct 27.6, buyers_entry 836, has_socials 1, peak_mult 1.1
- 19 Oct 13:43 UK **Wojak** -99.9% — entry_mc 3.03e+04, bundle_pct 29, buyers_entry 270, has_socials 1, peak_mult 1.37

## 5. Factor search (strict test) and luck check
60 cuts tried on 6 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 20:27 UK–19 09:01 UK: 178 at -19.6% · 19 09:05 UK–19 19:04 UK: 177 at -13.7% · 19 19:06 UK–20 05:59 UK: 177 at -17.8% · 20 05:59 UK–20 16:27 UK: 177 at -21.2% · 20 16:38 UK–21 01:38 UK: 177 at -15.7%
