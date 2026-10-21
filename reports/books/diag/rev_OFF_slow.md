# Revision search — OFF:slow
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
118 trades, -13.5% a trade, without best -14.4%, 46.3 trades a day, -0.672 SOL a day at 0.1. Thirds: -8.6% / -17.9% / -14.2%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 118 | -11.2% | -11.7% | -4.0% / -16.8% / -13.1% |
| x_t2s40 | 118 | -11.3% | -12.1% | -11.4% / -17.1% / -5.4% |
| x_h3 | 118 | -10.8% | -12.5% | -2.9% / -15.8% / -13.9% |
| x_tsl40 | 118 | -10.7% | -12.5% | -8.0% / -16.4% / -7.9% |
| x_h5 | 117 | -9.6% | -12.8% | -1.7% / -14.6% / -12.9% |
| x_flow4 (current) | 118 | -13.5% | -14.4% | -8.6% / -17.9% / -14.2% |
| x_tp15 | 118 | -14.8% | -15.3% | -3.1% / -26.3% / -15.2% |
| x_tp | 118 | -14.9% | -15.8% | -10.7% / -26.0% / -8.2% |
| x_h15 | 116 | -14.9% | -16.4% | -10.6% / -17.7% / -16.6% |
| x_tsl60 | 118 | -21.4% | -22.3% | -20.2% / -23.7% / -20.2% |
| x_time | 118 | -18.9% | -26.4% | -8.4% / -28.6% / -19.9% |

## Search
61 filters × 11 exits (+ 1 pairs). 4 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, +16.6%, +0.4%, +1.0%, +5.0%, none, none, +2.9%, none, +6.6%, +5.7%, none, +1.3%, +4.6%, +13.7%, +0.4%, +11.9%, +0.8%, none, none.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| hour_uk >= 17.75 | x_tp | 30 | +5.6% | +2.8% | 43% | 88 at -21.9% | +1.7% / -13.7% / +20.8% | 11 at +20.8% | +0.054 | 8 |
| hour_uk >= 17.75 | x_t2s40 | 30 | +3.4% | +0.5% | 37% | 88 at -16.3% | -1.2% / -13.9% / +18.3% | 11 at +18.3% | +0.029 | 11 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| hour_uk >= 17.75 | x_tp | 30 | +5.6% | +2.8% | 43% | 88 at -21.9% | +1.7% / -13.7% / +20.8% | 11 at +20.8% | +0.054 | 8 |
| hour_uk >= 21.45 | x_tp | 18 | +7.3% | +2.6% | 50% | 100 at -18.9% | +28.4% / -13.7% / -3.3% | 4 at -3.3% | +0.045 | 8 |
| hour_uk >= 17.75 AND hour_uk >= 21.45 | x_tp | 18 | +7.3% | +2.6% | 50% | 100 at -18.9% | +28.4% / -13.7% / -3.3% | 4 at -3.3% | +0.045 | 8 |
| hour_uk >= 17.75 | x_t2s40 | 30 | +3.4% | +0.5% | 37% | 88 at -16.3% | -1.2% / -13.9% / +18.3% | 11 at +18.3% | +0.029 | 11 |

## Proposal
**hour_uk >= 17.75**, exit **x_tp** — 30 trades at +5.6% (without best +2.8%), won 43%, thirds +1.7% / -13.7% / +20.8%, last 24 h 11 at +20.8%, 11.8 trades a day, +0.054 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 8/20)**. Drops 88 trades at -21.9%.
