# Revision search — OFF:gradrun
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
296 trades, -8.6% a trade, without best -9.5%, 114.9 trades a day, -1.099 SOL a day at 0.1. Thirds: -18.6% / -3.3% / -3.7%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tp15 | 296 | -4.0% | -4.1% | -7.1% / -4.0% / -0.8% |
| x_t15s40 | 296 | -5.8% | -5.9% | -12.8% / -4.6% / +0.1% |
| x_h3 | 296 | -7.7% | -9.0% | -10.2% / -8.4% / -4.6% |
| x_flow4 (current) | 296 | -8.6% | -9.5% | -18.6% / -3.3% / -3.7% |
| x_tp | 296 | -10.2% | -10.5% | -14.3% / -9.7% / -6.6% |
| x_h15 | 295 | -9.5% | -11.1% | -14.6% / -6.9% / -7.0% |
| x_t2s40 | 296 | -11.3% | -11.6% | -18.9% / -11.5% / -3.4% |
| x_h5 | 296 | -10.1% | -12.2% | -10.7% / -11.3% / -8.4% |
| x_tsl40 | 296 | -13.0% | -14.1% | -21.4% / -12.3% / -5.3% |
| x_tsl60 | 296 | -25.7% | -27.6% | -30.8% / -25.1% / -21.0% |
| x_time | 296 | -45.9% | -47.7% | -40.3% / -53.7% / -43.8% |

## Search
61 filters × 11 exits (+ 3 pairs). 6 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +7.6%, +8.3%, +19.4%, +11.5%, +7.4%, +12.2%, +1.1%, +3.8%, +26.7%, +4.5%, +15.9%, +24.2%, +5.5%, +37.1%, +13.5%, +7.6%, +7.7%, +4.3%, +14.2%, +1.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc >= 1.572e+05 AND age_s < 245.5 | x_tp15 | 36 | +10.1% | +9.2% | 75% | 260 at -5.9% | +18.5% / +3.0% / +12.9% | 7 at +12.9% | +0.127 | 9 |
| buyers_entry < 307.2 | x_tsl40 | 45 | +12.0% | +5.5% | 36% | 251 at -17.5% | +7.8% / -2.8% / +20.8% | 29 at +24.1% | +0.192 | 15 |
| buyers_entry < 307.2 | x_t15s40 | 45 | +5.6% | +4.8% | 64% | 251 at -7.8% | -1.6% / -3.3% / +12.2% | 29 at +12.9% | +0.080 | 15 |
| age_s < 245.5 | x_tp15 | 148 | +3.7% | +3.4% | 70% | 148 at -11.6% | +1.1% / +5.1% / +5.0% | 50 at +7.0% | +0.154 | 18 |
| hour_uk < 5 | x_tp15 | 73 | +1.1% | +0.5% | 67% | 223 at -5.6% | -4.4% / +1.8% / +4.4% | 27 at +4.4% | +0.002 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| buyers_entry < 307.2 | x_tsl40 | 45 | +12.0% | +5.5% | 36% | 251 at -17.5% | +7.8% / -2.8% / +20.8% | 29 at +24.1% | +0.192 | 15 |
| age_s < 245.5 | x_tp15 | 148 | +3.7% | +3.4% | 70% | 148 at -11.6% | +1.1% / +5.1% / +5.0% | 50 at +7.0% | +0.154 | 18 |
| entry_mc >= 1.572e+05 AND age_s < 245.5 | x_tp15 | 36 | +10.1% | +9.2% | 75% | 260 at -5.9% | +18.5% / +3.0% / +12.9% | 7 at +12.9% | +0.127 | 9 |
| entry_mc >= 1.572e+05 | x_tp15 | 45 | +6.1% | +5.4% | 71% | 251 at -5.8% | +2.4% / +9.3% / +4.1% | 9 at +4.1% | +0.090 | 15 |
| buyers_entry < 307.2 | x_t15s40 | 45 | +5.6% | +4.8% | 64% | 251 at -7.8% | -1.6% / -3.3% / +12.2% | 29 at +12.9% | +0.080 | 15 |

## Proposal
**buyers_entry < 307.2**, exit **x_tsl40** — 45 trades at +12.0% (without best +5.5%), won 36%, thirds +7.8% / -2.8% / +20.8%, last 24 h 29 at +24.1%, 17.5 trades a day, +0.192 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 15/20)**. Drops 251 trades at -17.5%.
