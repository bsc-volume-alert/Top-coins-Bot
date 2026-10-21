# Revision search — OFF:momconf
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
77 trades, -8.2% a trade, without best -10.0%, 30.1 trades a day, -0.278 SOL a day at 0.1. Thirds: -24.2% / -1.5% / +1.4%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 77 | -3.6% | -4.2% | -14.3% / +4.5% / -1.1% |
| x_tp15 | 77 | -4.1% | -4.7% | -5.1% / -4.8% / -2.2% |
| x_t2s40 | 77 | -8.5% | -9.8% | -27.7% / -2.5% / +5.2% |
| x_flow4 (current) | 77 | -8.2% | -10.0% | -24.2% / -1.5% / +1.4% |
| x_tsl40 | 77 | -7.3% | -10.6% | -27.6% / -6.3% / +12.7% |
| x_h3 | 77 | -10.2% | -11.2% | -15.0% / -3.8% / -11.9% |
| x_h15 | 77 | -12.8% | -14.2% | -23.9% / -4.2% / -10.2% |
| x_h5 | 77 | -13.4% | -14.4% | -22.6% / -8.4% / -9.2% |
| x_tp | 77 | -13.1% | -14.4% | -32.4% / -17.3% / +11.3% |
| x_tsl60 | 77 | -31.0% | -33.4% | -42.4% / -37.6% / -12.3% |
| x_time | 77 | -49.7% | -58.8% | -40.8% / -64.4% / -43.5% |

## Search
47 filters × 11 exits (+ 50 pairs). 57 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +26.6%, +9.3%, +22.0%, +14.5%, +39.6%, +20.2%, +14.6%, +23.8%, +9.2%, +20.2%, +10.6%, +12.8%, +7.3%, +8.9%, +14.6%, +15.0%, +8.0%, +25.2%, +20.2%, +0.2%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| hour_uk < 17.4 AND entry_mc >= 6.877e+04 | x_t2s40 | 32 | +26.1% | +24.1% | 56% | 45 at -33.2% | +3.4% / +39.8% / +39.7% | 9 at +39.7% | +0.314 | 3 |
| age_s < 193.4 | x_tp15 | 12 | +21.8% | +20.2% | 83% | 65 at -8.9% | +4.1% / +39.6% / +39.6% | 3 at +39.6% | +0.098 | 5 |
| entry_mc >= 6.877e+04 AND hour_uk < 20 | x_t2s40 | 39 | +16.8% | +14.9% | 49% | 38 at -34.5% | +3.4% / +29.8% / +15.1% | 13 at +15.1% | +0.240 | 9 |
| age_s < 193.4 | x_t15s40 | 12 | +16.7% | +14.6% | 75% | 65 at -7.4% | -6.3% / +39.6% / +39.6% | 3 at +39.6% | +0.074 | 10 |
| hour_uk < 14 AND entry_mc >= 6.382e+04 | x_t15s40 | 29 | +13.3% | +12.3% | 72% | 48 at -13.9% | +12.6% / +19.3% / +8.1% | 11 at +13.8% | +0.139 | 13 |
| entry_mc >= 6.877e+04 AND hour_uk < 17.4 | x_t15s40 | 32 | +12.9% | +12.0% | 72% | 45 at -15.4% | +7.2% / +23.1% / +8.1% | 9 at +8.1% | +0.149 | 13 |
| entry_mc >= 1.004e+05 | x_tp15 | 20 | +8.7% | +7.1% | 75% | 57 at -8.6% | -2.3% / +11.6% / +15.9% | 6 at +15.9% | +0.060 | 19 |
| age_s < 193.4 | x_h3 | 12 | +8.4% | +2.9% | 75% | 65 at -13.6% | -4.8% / +18.3% / +25.0% | 3 at +25.0% | +0.035 | 19 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| hour_uk < 17.4 AND entry_mc >= 6.382e+04 | x_t2s40 | 38 | +24.7% | +23.0% | 55% | 39 at -40.9% | +3.4% / +24.5% / +48.3% | 13 at +43.5% | +0.353 | 4 |
| hour_uk < 17.4 AND entry_mc >= 6.877e+04 | x_t2s40 | 32 | +26.1% | +24.1% | 56% | 45 at -33.2% | +3.4% / +39.8% / +39.7% | 9 at +39.7% | +0.314 | 3 |
| hour_uk < 21 AND entry_mc >= 6.382e+04 | x_t2s40 | 47 | +16.9% | +15.4% | 49% | 30 at -48.4% | +3.4% / +15.6% / +28.6% | 18 at +27.3% | +0.292 | 8 |
| hour_uk < 20 AND entry_mc >= 6.382e+04 | x_t2s40 | 45 | +16.8% | +15.3% | 49% | 32 at -44.2% | +3.4% / +19.3% / +24.7% | 17 at +23.8% | +0.279 | 8 |
| hour_uk < 21 AND entry_mc >= 6.877e+04 | x_t2s40 | 41 | +16.8% | +15.1% | 49% | 36 at -37.4% | +3.4% / +24.5% / +20.2% | 14 at +20.2% | +0.254 | 8 |

## Proposal
**hour_uk < 17.4 AND entry_mc >= 6.382e+04**, exit **x_t2s40** — 38 trades at +24.7% (without best +23.0%), won 55%, thirds +3.4% / +24.5% / +48.3%, last 24 h 13 at +43.5%, 14.9 trades a day, +0.353 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 4/20)**. Drops 39 trades at -40.9%.
