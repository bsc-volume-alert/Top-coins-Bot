# Revision search — OFF:momfast
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
517 trades, -12.1% a trade, without best -12.6%, 199.8 trades a day, -2.612 SOL a day at 0.1. Thirds: -11.5% / -16.9% / -7.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tp15 | 517 | -6.2% | -6.3% | -3.2% / -7.1% / -8.2% |
| x_t15s40 | 517 | -8.2% | -8.3% | -4.1% / -13.6% / -7.0% |
| x_t2s40 | 517 | -11.2% | -11.4% | -11.1% / -16.2% / -6.2% |
| x_h3 | 517 | -10.7% | -11.5% | -8.5% / -12.1% / -11.5% |
| x_tp | 517 | -12.0% | -12.2% | -13.7% / -12.6% / -9.7% |
| x_h5 | 517 | -11.2% | -12.3% | -8.4% / -13.4% / -11.7% |
| x_flow4 (current) | 517 | -12.1% | -12.6% | -11.5% / -16.9% / -7.9% |
| x_h15 | 514 | -12.2% | -13.2% | -8.9% / -16.9% / -10.7% |
| x_tsl40 | 517 | -12.4% | -13.4% | -16.5% / -14.1% / -6.7% |
| x_tsl60 | 517 | -25.9% | -26.9% | -27.8% / -28.9% / -21.0% |
| x_time | 517 | -39.5% | -40.5% | -35.2% / -43.8% / -39.6% |

## Search
61 filters × 11 exits (+ 7 pairs). 14 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, +4.6%, +1.8%, +1.3%, +0.2%, none, none, none, +11.1%, +2.1%, +14.2%, +3.6%, +2.3%, +7.3%, +4.5%, +5.6%, none, none, none, +10.5%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 272.5 | x_tp15 | 172 | +4.0% | +3.8% | 71% | 345 at -11.3% | +10.0% / +3.1% / -0.1% | 61 at -0.1% | +0.201 | 7 |
| TRAIT under 5 min old | x_tp15 | 186 | +3.4% | +3.2% | 70% | 331 at -11.5% | +8.1% / +4.6% / -2.1% | 64 at -2.1% | +0.169 | 8 |
| entry_mc < 5.178e+04 | x_t2s40 | 78 | +4.2% | +3.1% | 42% | 439 at -13.9% | +2.9% / -0.9% / +9.0% | 28 at +9.0% | +0.096 | 8 |
| age_s < 272.5 | x_tp | 172 | +1.8% | +1.3% | 50% | 345 at -18.9% | +2.4% / -8.8% / +11.7% | 61 at +11.7% | +0.054 | 11 |
| TRAIT under 5 min old | x_tp | 186 | +1.0% | +0.5% | 49% | 331 at -19.3% | +0.8% / -7.5% / +9.9% | 64 at +9.9% | -0.000 | 12 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 272.5 | x_tp15 | 172 | +4.0% | +3.8% | 71% | 345 at -11.3% | +10.0% / +3.1% / -0.1% | 61 at -0.1% | +0.201 | 7 |
| age_s < 272.5 AND TRAIT under 5 min old | x_tp15 | 172 | +4.0% | +3.8% | 71% | 345 at -11.3% | +10.0% / +3.1% / -0.1% | 61 at -0.1% | +0.201 | 7 |
| TRAIT under 5 min old | x_tp15 | 186 | +3.4% | +3.2% | 70% | 331 at -11.5% | +8.1% / +4.6% / -2.1% | 64 at -2.1% | +0.169 | 8 |
| entry_mc < 5.178e+04 | x_t2s40 | 78 | +4.2% | +3.1% | 42% | 439 at -13.9% | +2.9% / -0.9% / +9.0% | 28 at +9.0% | +0.096 | 8 |
| age_s < 272.5 | x_tp | 172 | +1.8% | +1.3% | 50% | 345 at -18.9% | +2.4% / -8.8% / +11.7% | 61 at +11.7% | +0.054 | 11 |

## Proposal
**age_s < 272.5**, exit **x_tp15** — 172 trades at +4.0% (without best +3.8%), won 71%, thirds +10.0% / +3.1% / -0.1%, last 24 h 61 at -0.1%, 66.5 trades a day, +0.201 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 7/20)**. Drops 345 trades at -11.3%.
