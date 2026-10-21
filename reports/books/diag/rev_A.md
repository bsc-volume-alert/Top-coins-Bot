# Revision search — A
_Data to 21 Oct 10:35 UK; A's passed rows, runner exit; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
370 trades, -3.8% a trade, without best -4.5%, 142.8 trades a day, -0.683 SOL a day at 0.1. Thirds: -3.7% / -6.5% / -1.1%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 370 | -4.1% | -4.2% | -3.2% / -6.7% / -2.3% |
| x_flow4 (current) | 370 | -3.8% | -4.5% | -3.7% / -6.5% / -1.1% |
| x_t2s40 | 370 | -4.5% | -4.7% | -5.1% / -5.5% / -2.9% |
| x_flow4ff | 370 | -4.8% | -5.5% | -4.2% / -10.5% / +0.4% |
| x_h3 | 370 | -5.4% | -6.0% | -5.2% / -9.3% / -1.7% |
| x_split | 370 | -5.5% | -6.5% | -11.9% / -2.0% / -2.5% |
| x_h5f14 | 370 | -6.3% | -6.9% | -4.9% / -10.0% / -3.9% |
| x_h5 | 370 | -6.6% | -7.2% | -7.6% / -6.8% / -5.3% |
| x_tsl40 | 370 | -7.5% | -8.6% | -10.8% / -3.7% / -7.9% |
| x_h2t40 | 370 | -8.1% | -8.8% | -11.1% / -5.9% / -7.4% |
| x_h15 | 366 | -8.0% | -9.1% | -10.0% / -6.8% / -7.0% |
| x_time | 368 | -25.1% | -27.2% | -23.7% / -24.9% / -26.7% |

## Search
1420 filters × 12 exits (+ 246 pairs). 259 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +11.9%, +16.0%, +23.9%, +20.7%, +18.7%, +9.8%, +19.8%, +18.4%, +11.5%, +21.1%, +10.4%, +12.0%, +22.6%, +14.2%, +19.1%, +14.9%, +25.4%, +19.0%, +18.9%, +13.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 48 | x_t2s40 | 41 | +21.7% | +20.1% | 54% | 329 at -7.8% | +35.7% / +22.9% / +9.5% | 17 at +6.0% | +0.328 | 5 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 48 | x_split | 41 | +26.6% | +17.9% | 44% | 329 at -9.5% | +6.1% / +28.8% / +41.6% | 17 at +37.5% | +0.405 | 11 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 48 | x_h2t40 | 41 | +22.5% | +16.7% | 54% | 329 at -11.9% | +33.1% / +31.4% / +7.1% | 17 at +3.6% | +0.340 | 11 |
| sell60 < 22.8 AND max_share >= 0.1438 | x_split | 52 | +23.5% | +16.6% | 33% | 318 at -10.2% | +4.4% / +11.4% / +43.8% | 23 at +40.7% | +0.451 | 11 |
| wal60 < 48 AND sell60 < 19.69 | x_t2s40 | 39 | +18.4% | +16.6% | 51% | 331 at -7.2% | +35.7% / +22.9% / -1.5% | 15 at -4.8% | +0.262 | 11 |
| TRAIT quiet first minute (selling < 20 SOL) AND avg_buy_sol >= 0.5165 | x_flow4 | 44 | +22.0% | +16.1% | 57% | 326 at -7.3% | +16.6% / +25.1% / +23.6% | 18 at +19.4% | +0.357 | 11 |
| entry_mc >= 5.681e+04 AND avg_buy_sol >= 0.5165 | x_t2s40 | 40 | +16.8% | +15.0% | 55% | 330 at -7.1% | +22.7% / +17.5% / +12.2% | 18 at +8.7% | +0.245 | 12 |
| wal60 < 48 AND max_share >= 0.1438 | x_split | 52 | +21.6% | +14.7% | 40% | 318 at -9.9% | +6.2% / +21.8% / +32.8% | 22 at +29.8% | +0.413 | 13 |
| wal60 < 48 AND sell60 < 19.69 | x_h2t40 | 39 | +19.1% | +13.0% | 51% | 331 at -11.3% | +33.1% / +31.4% / -4.5% | 15 at -7.6% | +0.272 | 15 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 48 | x_flow4ff | 41 | +19.4% | +13.0% | 59% | 329 at -7.8% | +16.5% / +9.1% / +29.5% | 17 at +24.8% | +0.291 | 15 |
| TRAIT biggest buyer 3-5 SOL AND avg_buy_sol >= 0.5165 | x_flow4 | 49 | +18.2% | +12.8% | 65% | 321 at -7.1% | +9.9% / +17.4% / +27.9% | 17 at +23.5% | +0.325 | 15 |
| wal60 < 48 AND TRAIT quiet first minute (selling < 20 SOL) | x_tsl40 | 41 | +22.2% | +12.4% | 41% | 329 at -11.2% | +18.0% / +44.4% / +9.0% | 17 at +6.9% | +0.336 | 15 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| sell60 < 22.8 AND max_share >= 0.1438 | x_split | 52 | +23.5% | +16.6% | 33% | 318 at -10.2% | +4.4% / +11.4% / +43.8% | 23 at +40.7% | +0.451 | 11 |
| wal60 < 48 AND max_share >= 0.1438 | x_split | 52 | +21.6% | +14.7% | 40% | 318 at -9.9% | +6.2% / +21.8% / +32.8% | 22 at +29.8% | +0.413 | 13 |
| wal60 < 48 AND sell60 < 22.8 | x_split | 56 | +19.9% | +13.5% | 38% | 314 at -10.0% | -4.9% / +20.4% / +41.9% | 21 at +38.6% | +0.409 | 14 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 48 | x_split | 41 | +26.6% | +17.9% | 44% | 329 at -9.5% | +6.1% / +28.8% / +41.6% | 17 at +37.5% | +0.405 | 11 |
| avg_buy_sol >= 0.5165 | x_t2s40 | 130 | +8.4% | +7.8% | 47% | 240 at -11.5% | +5.6% / +9.7% / +9.7% | 51 at +11.9% | +0.372 | 20 |

## Proposal
**sell60 < 22.8 AND max_share >= 0.1438**, exit **x_split** — 52 trades at +23.5% (without best +16.6%), won 33%, thirds +4.4% / +11.4% / +43.8%, last 24 h 23 at +40.7%, 20.1 trades a day, +0.451 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 11/20)**. Drops 318 trades at -10.2%.

### Early-exit overlay on the proposal (now: +23.5%, without best +16.6%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +17.1% | +10.1% | +1.6% / +12.9% / +28.9% |
| sell at fs10 if < 1.0 | +14.5% | +7.5% | +3.5% / +13.8% / +21.2% |
| sell at t30 if < 0.9 | +18.3% | +11.4% | +4.4% / +13.9% / +29.6% |
| sell at t30 if < 1.0 | +19.6% | +12.7% | +4.4% / +16.7% / +30.3% |
| sell at t60 if < 0.9 | +24.5% | +17.6% | +4.4% / +13.9% / +44.0% |
| sell at t60 if < 1.0 | +25.6% | +18.7% | +4.4% / +16.9% / +44.2% |
