# Diagnosis — OFF:early
_Data to 21 Oct 01:42 UK; off-page tracker book; exit x_flow4; pool costs. Built by reports/books/diagnose.py._

## 1. Size and pace
| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |
|---|---|---|---|---|---|---|---|---|
| 5520 | -33.5% | -33.6% | -50.9% | 7% | 74% | 2485.7 | -85.847 | -190.64 |

## 2. Exits on the same trades
| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |
|---|---|---|---|---|---|---|---|---|
| x_tsl40 | 5520 | -27.0% | -27.2% | 8% | -25.6% | -28.8% | -26.6% | -26.7% |
| x_tp15 | 5520 | -31.5% | -31.5% | 20% | -31.6% | -30.7% | -32.1% | -32.2% |
| x_t15s40 | 5520 | -31.5% | -31.5% | 20% | -31.6% | -30.7% | -32.1% | -32.2% |
| x_tp | 5520 | -31.4% | -31.5% | 13% | -32.0% | -31.3% | -31.0% | -31.1% |
| x_t2s40 | 5520 | -32.8% | -32.8% | 13% | -33.3% | -32.6% | -32.5% | -32.5% |
| x_flow4 (current) | 5520 | -33.5% | -33.6% | 7% | -33.2% | -33.5% | -34.0% | -33.9% |
| x_tsl60 | 5520 | -35.7% | -36.0% | 5% | -34.1% | -37.5% | -35.7% | -35.7% |
| x_time | 5520 | -40.8% | -41.1% | 4% | -39.7% | -41.3% | -41.5% | -41.5% |

## 3. Winners vs losers — share, average and feature medians
| group | n | share | avg | entry_mc | age_s | bundle_pct | buyers_entry | has_socials | vol5m_usd | hour_uk | peak_mult |
|---|---|---|---|---|---|---|---|---|---|---|---|
| big winners (>= +50%) | 313 | 6% | +244.3% | 5.35e+03 | — | 6.63 | 17 | 0 | — | 14 | 5.72 |
| winners (0 to +50%) | 53 | 1% | +20.8% | 5.32e+03 | — | 6.94 | 22 | 1 | — | 15 | 1.78 |
| small losers (-35% to 0) | 1093 | 20% | -23.2% | 3.59e+03 | — | 18.8 | 22 | 1 | — | 14 | 1.05 |
| stopped (<= -35%) | 4061 | 74% | -58.4% | 5.16e+03 | — | 20.8 | 23 | 1 | — | 13 | 1.13 |

## 4. Best 8 and worst 8 trades
- 20 Oct 14:02 UK **Unemployed, But Investing** +276.6% — entry_mc 7.4e+03, bundle_pct 1.05, buyers_entry 35, has_socials 1, peak_mult 10.6
- 20 Oct 13:47 UK **RAINMAN** +276.6% — entry_mc 1.14e+04, bundle_pct 0.208, buyers_entry 13, has_socials 0, peak_mult 8.36
- 20 Oct 13:39 UK **Pokémon Arena** +276.6% — entry_mc 7.84e+03, bundle_pct 15, buyers_entry 28, has_socials 1, peak_mult 19.6
- 18 Oct 20:30 UK **Make France Great Again** +276.6% — entry_mc 5.19e+03, bundle_pct 28, buyers_entry 38, has_socials 1, peak_mult 4.74
- 18 Oct 20:43 UK **Talking Ginger** +276.6% — entry_mc 4.81e+03, bundle_pct 18.1, buyers_entry 24, has_socials 1, peak_mult 5.39
- 20 Oct 08:56 UK **Upside Down Cat** +276.6% — entry_mc 1.2e+04, bundle_pct 48.8, buyers_entry 35, has_socials 1, peak_mult 5.64
- 20 Oct 08:48 UK **RIPPED** +276.6% — entry_mc 1.15e+04, bundle_pct 24.5, buyers_entry 54, has_socials 1, peak_mult 7.35
- 20 Oct 09:05 UK **ARABIANS** +276.6% — entry_mc 1.25e+03, bundle_pct 0.351, buyers_entry 9, has_socials 0, peak_mult 6.82

Worst:
- 20 Oct 16:57 UK **PokePacks** -102.8% — entry_mc 4.05e+04, bundle_pct 76.1, buyers_entry 27, has_socials 0, peak_mult 1.24
- 19 Oct 22:30 UK **ss** -102.8% — entry_mc 3.85e+03, bundle_pct 0.352, buyers_entry 22, has_socials 0, peak_mult 1.37
- 20 Oct 16:43 UK **rice donald** -102.8% — entry_mc 951, bundle_pct 1.73, buyers_entry 19, has_socials 0, peak_mult 2.28
- 19 Oct 08:45 UK **AI Runs everything ** -102.7% — entry_mc 1.27e+03, bundle_pct 0.874, buyers_entry 10, has_socials 1, peak_mult 3.34
- 19 Oct 01:50 UK **CATECOIN** -102.7% — entry_mc 5.11e+03, bundle_pct 3.37, buyers_entry 9, has_socials 0, peak_mult 1
- 20 Oct 16:59 UK **SUS DUCK 🦆** -102.6% — entry_mc 7.5e+03, bundle_pct 0.347, buyers_entry 8, has_socials 0, peak_mult 1.61
- 20 Oct 08:37 UK **WIN** -102.4% — entry_mc 127, bundle_pct 0.863, buyers_entry 8, has_socials 0, peak_mult 1.66
- 18 Oct 22:43 UK **MoonChacha** -102.4% — entry_mc 1.11e+03, bundle_pct 0.347, buyers_entry 10, has_socials 0, peak_mult 1

## 5. Factor search (strict test) and luck check
60 cuts tried on 6 entry-time columns; 0 pass the strict test, 0 pass on average when the results are shuffled at random (20 runs).
**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **0 cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.

| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |
|---|---|---|---|---|---|---|---|

## 8. Five time blocks
18 20:25 UK–19 05:20 UK: 1104 at -33.8% · 19 05:20 UK–19 15:18 UK: 1104 at -32.9% · 19 15:18 UK–19 22:27 UK: 1104 at -32.5% · 19 22:27 UK–20 10:42 UK: 1104 at -35.7% · 20 10:43 UK–20 19:37 UK: 1104 at -32.7%
