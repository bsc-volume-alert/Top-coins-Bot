# Revision search — K
_Data to 21 Oct 10:35 UK; page headline is x_h2t40, not in the data export; 5-min shown; current exit x_h5; pool costs. Built by reports/books/revise.py._

## The book now
55 trades, +3.0% a trade, without best -1.1%, 79.6 trades a day, +0.161 SOL a day at 0.1. Thirds: +1.1% / +17.9% / -9.8%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tp15 | 55 | +2.2% | +1.5% | -1.8% / +11.1% / -2.6% |
| x_t15s40 | 55 | +0.4% | -0.3% | -0.7% / +5.4% / -3.3% |
| x_flow4 | 55 | +1.2% | -0.6% | +0.6% / +10.3% / -7.4% |
| x_h5 (current) | 55 | +3.0% | -1.1% | +1.1% / +17.9% / -9.8% |
| x_tp | 55 | -0.2% | -1.8% | -13.4% / +10.7% / +2.8% |
| x_t2s40 | 55 | -1.2% | -2.8% | -7.5% / -0.4% / +4.8% |
| x_h15 | 54 | -5.5% | -9.6% | -9.0% / +1.3% / -8.7% |
| x_h3 | 55 | -6.8% | -11.3% | +1.8% / +1.7% / -24.3% |
| x_tsl40 | 55 | -10.3% | -14.3% | -12.3% / +5.6% / -24.0% |
| x_tsl60 | 55 | -18.9% | -25.2% | -26.0% / -1.9% / -28.4% |
| x_time | 55 | -26.2% | -32.7% | -36.1% / -17.3% / -24.6% |

## Search
61 filters × 11 exits (+ 30 pairs). 43 pass the three-period test; **2 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +27.7%, +33.3%, +38.4%, +19.5%, +39.8%, +20.8%, +9.4%, +49.7%, +22.9%, +15.9%, +18.8%, +36.3%, +38.7%, +16.0%, +43.7%, +17.1%, +19.8%, +28.1%, +27.4%, +19.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| buyers_entry < 911.5 AND entry_mc >= 3.579e+04 | x_t2s40 | 18 | +42.7% | +40.1% | 67% | 37 at -22.5% | +46.7% / +52.3% / +35.0% | 18 at +42.7% | +1.087 | 2 |
| buyers_entry < 696 AND entry_mc < 2.887e+04 | x_tp | 13 | +23.2% | +17.9% | 62% | 42 at -7.5% | +6.3% / +60.1% / +16.1% | 13 at +23.2% | +0.418 | 16 |
| buyers_entry < 911.5 AND buyers_entry >= 371.9 | x_flow4 | 22 | +17.0% | +13.5% | 73% | 33 at -9.4% | +23.0% / +41.3% / +6.0% | 22 at +17.0% | +0.509 | 19 |
| buyers_entry < 524 | x_tp15 | 27 | +12.7% | +11.7% | 70% | 28 at -8.0% | +23.0% / +12.2% / +0.3% | 27 at +12.7% | +0.457 | 19 |
| entry_mc < 2.887e+04 | x_tp | 14 | +16.4% | +11.0% | 57% | 41 at -5.9% | -9.5% / +60.1% / +16.1% | 14 at +16.4% | +0.312 | 19 |
| entry_mc >= 3.579e+04 | x_t2s40 | 28 | +13.2% | +10.4% | 46% | 27 at -16.0% | +14.1% / +1.3% / +25.4% | 28 at +13.2% | +0.493 | 19 |
| buyers_entry < 911.5 | x_t15s40 | 41 | +7.0% | +6.2% | 66% | 14 at -18.9% | +10.9% / +8.5% / +2.7% | 41 at +7.0% | +0.358 | 20 |
| buyers_entry < 524 AND entry_mc < 6.468e+04 | x_h5 | 25 | +14.5% | +5.8% | 64% | 30 at -6.5% | +15.1% / +31.4% / -8.1% | 25 at +14.5% | +0.488 | 20 |
| entry_mc < 2.887e+04 | x_tp15 | 14 | +7.6% | +5.2% | 64% | 41 at +0.3% | +3.8% / +28.5% / +0.3% | 14 at +7.6% | +0.134 | 20 |
| entry_mc < 6.468e+04 | x_h5 | 46 | +5.3% | +0.5% | 54% | 9 at -8.8% | +1.2% / +23.5% / -7.8% | 46 at +5.3% | +0.290 | 20 |
| entry_mc < 6.468e+04 | x_flow4 | 46 | +2.4% | +0.3% | 59% | 9 at -5.3% | +1.0% / +11.9% / -5.1% | 46 at +2.4% | +0.096 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| buyers_entry < 911.5 AND entry_mc >= 3.579e+04 | x_t2s40 | 18 | +42.7% | +40.1% | 67% | 37 at -22.5% | +46.7% / +52.3% / +35.0% | 18 at +42.7% | +1.087 | 2 |
| buyers_entry < 696 AND entry_mc >= 3.579e+04 | x_t2s40 | 15 | +43.1% | +39.9% | 67% | 40 at -17.7% | +38.6% / +40.7% / +47.3% | 15 at +43.1% | +0.913 | 2 |

## Proposal
**buyers_entry < 911.5 AND entry_mc >= 3.579e+04**, exit **x_t2s40** — 18 trades at +42.7% (without best +40.1%), won 67%, thirds +46.7% / +52.3% / +35.0%, last 24 h 18 at +42.7%, 26.0 trades a day, +1.087 SOL a day at 0.1 — **unlikely to be luck**. Drops 37 trades at -22.5%.
