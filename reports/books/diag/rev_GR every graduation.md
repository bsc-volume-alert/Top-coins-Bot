# Revision search — GR every graduation
_Data to 21 Oct 10:35 UK; off-page grad, instant ones left out; current exit x_h3; pool costs. Built by reports/books/revise.py._

## The book now
434 trades, +3.6% a trade, without best +0.6%, 168.0 trades a day, +0.444 SOL a day at 0.1. Thirds: -4.0% / +12.3% / +2.6%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tsl40 | 434 | +3.8% | +0.8% | -6.7% / +12.4% / +5.7% |
| x_h3 (current) | 434 | +3.6% | +0.6% | -4.0% / +12.3% / +2.6% |
| x_flow4 | 434 | -1.1% | -1.7% | -1.4% / -0.7% / -1.1% |
| x_t15s40 | 434 | -2.2% | -2.3% | -0.4% / -4.1% / -2.2% |
| x_t2s40 | 434 | -2.2% | -2.4% | -3.3% / -4.3% / +1.0% |
| x_tp | 434 | -4.3% | -4.5% | -1.9% / -10.6% / -0.5% |
| x_h5 | 434 | -1.8% | -4.9% | -7.1% / +4.0% / -2.4% |
| x_tp15 | 434 | -5.0% | -5.1% | -2.4% / -9.3% / -3.3% |
| x_h15 | 433 | -2.6% | -5.7% | -10.4% / -0.1% / +2.7% |
| x_tsl60 | 434 | -11.5% | -14.6% | -22.6% / -3.9% / -8.1% |
| x_time | 434 | -29.3% | -32.4% | -32.7% / -29.6% / -25.5% |

## Search
61 filters × 11 exits (+ 186 pairs). 236 pass the three-period test; **14 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +17.5%, +33.2%, +22.4%, +21.9%, +14.8%, +7.0%, +27.5%, +17.8%, +7.9%, +20.5%, +37.2%, +17.4%, +15.1%, +32.5%, +26.5%, +27.2%, +17.1%, +14.0%, +24.7%, +12.6%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| buyers_entry < 88.95 AND age_s < 212 | x_tsl40 | 60 | +61.7% | +40.4% | 48% | 374 at -5.5% | +13.8% / +126.3% / +28.6% | 34 at +34.9% | +1.411 | 0 |
| buyers_entry < 88.95 | x_h3 | 65 | +55.9% | +36.1% | 63% | 369 at -5.6% | +34.9% / +140.0% / +5.3% | 39 at +6.3% | +1.380 | 1 |
| TRAIT under 156 buyers AND age_s < 212 | x_tsl40 | 103 | +40.9% | +28.3% | 46% | 331 at -7.7% | -0.1% / +70.6% / +32.1% | 50 at +33.7% | +1.589 | 3 |
| TRAIT under 156 buyers | x_h3 | 124 | +35.0% | +24.5% | 66% | 310 at -8.9% | +9.7% / +69.0% / +15.3% | 61 at +12.7% | +1.631 | 7 |
| buyers_entry < 88.95 | x_flow4 | 65 | +25.7% | +21.8% | 60% | 369 at -5.8% | +39.2% / +52.3% / +2.8% | 39 at +5.6% | +0.622 | 9 |
| buyers_entry < 88.95 | x_tp | 65 | +21.3% | +20.3% | 57% | 369 at -8.9% | +50.9% / +12.8% / +16.9% | 39 at +17.3% | +0.510 | 10 |
| buyers_entry < 88.95 | x_h5 | 65 | +36.6% | +16.5% | 60% | 369 at -8.6% | +20.6% / +99.4% / -1.2% | 39 at -1.4% | +0.895 | 14 |
| TRAIT under 156 buyers | x_flow4 | 124 | +18.5% | +16.4% | 60% | 310 at -8.9% | +14.2% / +28.0% / +11.7% | 61 at +10.6% | +0.841 | 14 |
| age_s < 61 AND buyers_entry < 194.1 | x_tp | 43 | +15.0% | +13.3% | 56% | 391 at -6.5% | +2.7% / -8.0% / +33.4% | 21 at +28.4% | +0.233 | 17 |
| buyers_entry < 88.95 | x_t2s40 | 65 | +12.5% | +11.3% | 48% | 369 at -4.8% | +27.1% / +13.8% / +6.6% | 39 at +6.7% | +0.289 | 18 |
| TRAIT under 156 buyers AND age_s < 101 | x_tp15 | 54 | +11.6% | +11.1% | 74% | 380 at -7.4% | +16.7% / +4.0% / +13.5% | 31 at +17.7% | +0.222 | 18 |
| TRAIT under 156 buyers | x_h5 | 124 | +21.2% | +10.7% | 63% | 310 at -11.0% | +3.4% / +49.2% / +3.7% | 61 at +1.4% | +0.972 | 18 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| buyers_entry < 88.95 | x_tsl40 | 65 | +57.3% | +37.6% | 48% | 369 at -5.6% | +13.8% / +126.3% / +24.7% | 39 at +30.9% | +1.416 | 0 |
| buyers_entry < 88.95 AND buyers_entry < 141 | x_tsl40 | 65 | +57.3% | +37.6% | 48% | 369 at -5.6% | +13.8% / +126.3% / +24.7% | 39 at +30.9% | +1.416 | 0 |
| buyers_entry < 88.95 AND TRAIT under 156 buyers | x_tsl40 | 65 | +57.3% | +37.6% | 48% | 369 at -5.6% | +13.8% / +126.3% / +24.7% | 39 at +30.9% | +1.416 | 0 |
| buyers_entry < 88.95 AND buyers_entry < 194.1 | x_tsl40 | 65 | +57.3% | +37.6% | 48% | 369 at -5.6% | +13.8% / +126.3% / +24.7% | 39 at +30.9% | +1.416 | 0 |
| buyers_entry < 88.95 AND buyers_entry < 287.5 | x_tsl40 | 65 | +57.3% | +37.6% | 48% | 369 at -5.6% | +13.8% / +126.3% / +24.7% | 39 at +30.9% | +1.416 | 0 |

## Proposal
**buyers_entry < 88.95**, exit **x_tsl40** — 65 trades at +57.3% (without best +37.6%), won 48%, thirds +13.8% / +126.3% / +24.7%, last 24 h 39 at +30.9%, 25.2 trades a day, +1.416 SOL a day at 0.1 — **unlikely to be luck**. Drops 369 trades at -5.6%.
