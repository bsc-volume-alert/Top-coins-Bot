# Revision search — OFF:momdip
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
101 trades, -8.0% a trade, without best -10.8%, 39.5 trades a day, -0.353 SOL a day at 0.1. Thirds: -8.3% / -8.6% / -7.0%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_h3 | 101 | -7.2% | -9.3% | -9.0% / -15.7% / +3.4% |
| x_t15s40 | 101 | -10.2% | -10.7% | -12.3% / -16.2% / -2.0% |
| x_flow4 (current) | 101 | -8.0% | -10.8% | -8.3% / -8.6% / -7.0% |
| x_h5 | 101 | -11.2% | -12.8% | -21.9% / -13.1% / +1.6% |
| x_tp15 | 101 | -12.6% | -13.2% | -10.3% / -20.1% / -7.4% |
| x_h15 | 101 | -6.2% | -14.5% | -21.4% / +2.7% / +0.3% |
| x_t2s40 | 101 | -14.1% | -15.1% | -20.0% / -20.4% / -1.4% |
| x_tsl40 | 101 | -12.3% | -15.1% | -21.9% / -15.3% / +0.5% |
| x_tp | 101 | -17.1% | -18.1% | -15.7% / -27.0% / -8.4% |
| x_tsl60 | 101 | -29.5% | -36.2% | -42.7% / -18.9% / -26.8% |
| x_time | 101 | -50.0% | -54.1% | -56.0% / -47.2% / -46.6% |

## Search
47 filters × 11 exits (+ 1 pairs). 6 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, +1.3%, +30.3%, +10.9%, +3.2%, +2.5%, +6.6%, +1.8%, none, +23.2%, +13.6%, +9.3%, +7.3%, +6.3%, +3.2%, +7.2%, none, +17.9%, +3.4%, +11.0%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 398 | x_tp15 | 50 | +6.0% | +5.3% | 72% | 51 at -30.9% | +22.8% / -5.3% / -2.5% | 22 at -0.6% | +0.097 | 11 |
| age_s < 398 | x_t15s40 | 50 | +1.8% | +1.0% | 58% | 51 at -22.0% | +0.3% / -1.5% / +4.7% | 22 at +6.3% | +0.015 | 17 |
| age_s < 398 | x_h15 | 50 | +17.1% | +0.6% | 58% | 51 at -29.1% | -11.1% / +69.7% / +13.7% | 22 at +18.5% | +0.314 | 17 |
| age_s < 398 | x_flow4 | 50 | +5.6% | +0.0% | 52% | 51 at -21.2% | +6.5% / +20.6% / -3.2% | 22 at -1.6% | +0.089 | 17 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 398 | x_h15 | 50 | +17.1% | +0.6% | 58% | 51 at -29.1% | -11.1% / +69.7% / +13.7% | 22 at +18.5% | +0.314 | 17 |
| age_s < 398 | x_tp15 | 50 | +6.0% | +5.3% | 72% | 51 at -30.9% | +22.8% / -5.3% / -2.5% | 22 at -0.6% | +0.097 | 11 |
| age_s < 398 | x_flow4 | 50 | +5.6% | +0.0% | 52% | 51 at -21.2% | +6.5% / +20.6% / -3.2% | 22 at -1.6% | +0.089 | 17 |
| age_s < 318.2 | x_tp15 | 35 | +5.1% | +4.0% | 71% | 66 at -22.0% | +25.1% / -14.2% / -3.3% | 16 at -0.6% | +0.056 | 11 |
| age_s < 398 AND age_s < 318.2 | x_tp15 | 35 | +5.1% | +4.0% | 71% | 66 at -22.0% | +25.1% / -14.2% / -3.3% | 16 at -0.6% | +0.056 | 11 |

## Proposal
**age_s < 398**, exit **x_h15** — 50 trades at +17.1% (without best +0.6%), won 58%, thirds -11.1% / +69.7% / +13.7%, last 24 h 22 at +18.5%, 19.5 trades a day, +0.314 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 17/20)**. Drops 51 trades at -29.1%.
