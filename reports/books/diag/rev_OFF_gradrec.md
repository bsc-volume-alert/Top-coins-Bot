# Revision search — OFF:gradrec
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
481 trades, -20.1% a trade, without best -20.7%, 186.4 trades a day, -3.937 SOL a day at 0.1. Thirds: -21.5% / -18.2% / -20.7%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tsl40 | 481 | -17.9% | -19.4% | -19.0% / -16.7% / -17.8% |
| x_h3 | 480 | -20.0% | -20.7% | -22.4% / -18.4% / -19.2% |
| x_flow4 (current) | 481 | -20.1% | -20.7% | -21.5% / -18.2% / -20.7% |
| x_t15s40 | 481 | -21.2% | -21.3% | -22.9% / -19.1% / -21.4% |
| x_t2s40 | 481 | -21.2% | -21.5% | -23.4% / -16.9% / -23.4% |
| x_h5 | 480 | -21.3% | -22.2% | -21.3% / -20.9% / -21.6% |
| x_h15 | 477 | -23.7% | -24.6% | -23.7% / -21.2% / -26.2% |
| x_tp15 | 481 | -25.2% | -25.3% | -25.2% / -27.1% / -23.1% |
| x_tp | 481 | -25.2% | -25.4% | -24.0% / -24.9% / -26.6% |
| x_tsl60 | 481 | -27.3% | -28.7% | -26.3% / -27.4% / -28.2% |
| x_time | 481 | -36.8% | -39.3% | -28.8% / -46.4% / -35.2% |

## Search
61 filters × 11 exits (+ 0 pairs). 1 pass the three-period test; **1 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, none, none.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc >= 6.618e+04 | x_tp | 73 | +1.8% | +0.6% | 48% | 408 at -30.0% | +5.5% / +7.2% / -16.5% | 18 at -18.8% | +0.022 | 0 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc >= 6.618e+04 | x_tp | 73 | +1.8% | +0.6% | 48% | 408 at -30.0% | +5.5% / +7.2% / -16.5% | 18 at -18.8% | +0.022 | 0 |

## Proposal
**entry_mc >= 6.618e+04**, exit **x_tp** — 73 trades at +1.8% (without best +0.6%), won 48%, thirds +5.5% / +7.2% / -16.5%, last 24 h 18 at -18.8%, 28.3 trades a day, +0.022 SOL a day at 0.1 — **unlikely to be luck**. Drops 408 trades at -30.0%.
