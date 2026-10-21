# Revision search — OFF:copy
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
664 trades, -12.6% a trade, without best -13.0%, 260.6 trades a day, -3.540 SOL a day at 0.1. Thirds: -0.8% / -16.5% / -20.5%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 664 | -8.7% | -8.8% | -9.2% / -6.1% / -10.9% |
| x_tsl40 | 664 | -7.5% | -9.4% | +4.1% / -13.7% / -12.9% |
| x_tp15 | 664 | -9.6% | -9.7% | -8.6% / -8.2% / -12.0% |
| x_t2s40 | 664 | -9.6% | -9.8% | -10.7% / -5.8% / -12.3% |
| x_tp | 664 | -12.8% | -12.9% | -10.6% / -8.3% / -19.4% |
| x_flow4 (current) | 664 | -12.6% | -13.0% | -0.8% / -16.5% / -20.5% |
| x_h3 | 664 | -18.9% | -20.9% | -9.0% / -20.4% / -27.4% |
| x_h15 | 664 | -21.0% | -22.9% | -13.1% / -22.5% / -27.4% |
| x_h5 | 664 | -21.0% | -22.9% | -13.1% / -22.5% / -27.4% |
| x_tsl60 | 664 | -23.7% | -25.6% | -15.9% / -30.5% / -24.7% |
| x_time | 664 | -35.8% | -37.8% | -22.7% / -41.7% / -42.9% |

## Search
33 filters × 11 exits (+ 0 pairs). 3 pass the three-period test; **1 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, none, +1.3%, none, none, none, +1.1%, none, none, +5.9%, +1.0%, none, none, none, none, +6.1%, none, none, none, none.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc < 1364 | x_t2s40 | 100 | +3.6% | +2.8% | 42% | 564 at -12.0% | +3.0% / +3.4% / +4.5% | 0 at — | +0.104 | 2 |
| entry_mc < 1364 | x_tp15 | 100 | +0.6% | +0.2% | 68% | 564 at -11.4% | -0.3% / +3.1% / -0.1% | 0 at — | -0.017 | 5 |
| entry_mc < 1364 | x_tp | 100 | +0.9% | +0.0% | 48% | 564 at -15.2% | -1.9% / +6.5% / +0.4% | 0 at — | -0.004 | 5 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc < 1364 | x_t2s40 | 100 | +3.6% | +2.8% | 42% | 564 at -12.0% | +3.0% / +3.4% / +4.5% | 0 at — | +0.104 | 2 |

## Proposal
**entry_mc < 1364**, exit **x_t2s40** — 100 trades at +3.6% (without best +2.8%), won 42%, thirds +3.0% / +3.4% / +4.5%, last 24 h 0 at —, 39.2 trades a day, +0.104 SOL a day at 0.1 — **unlikely to be luck**. Drops 564 trades at -12.0%.
