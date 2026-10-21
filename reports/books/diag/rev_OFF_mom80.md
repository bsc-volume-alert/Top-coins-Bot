# Revision search — OFF:mom80
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
484 trades, -11.7% a trade, without best -12.3%, 187.1 trades a day, -2.369 SOL a day at 0.1. Thirds: -12.7% / -14.2% / -8.1%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tp15 | 484 | -5.8% | -5.9% | -9.1% / -5.4% / -2.8% |
| x_t15s40 | 484 | -7.7% | -7.8% | -9.2% / -10.5% / -3.6% |
| x_h3 | 484 | -9.1% | -10.0% | -8.5% / -12.7% / -6.2% |
| x_tp | 484 | -11.3% | -11.5% | -13.2% / -12.2% / -8.3% |
| x_h5 | 484 | -10.6% | -11.7% | -11.0% / -13.6% / -7.1% |
| x_t2s40 | 484 | -12.1% | -12.3% | -11.7% / -16.4% / -8.0% |
| x_flow4 (current) | 484 | -11.7% | -12.3% | -12.7% / -14.2% / -8.1% |
| x_tsl40 | 484 | -11.8% | -12.5% | -14.1% / -15.5% / -5.9% |
| x_h15 | 479 | -11.6% | -12.6% | -10.6% / -16.3% / -8.0% |
| x_tsl60 | 484 | -23.9% | -25.2% | -24.7% / -28.3% / -18.7% |
| x_time | 484 | -35.1% | -36.7% | -27.3% / -43.0% / -34.9% |

## Search
61 filters × 11 exits (+ 15 pairs). 17 pass the three-period test; **3 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, +0.0%, +1.5%, none, +3.3%, none, none, +2.6%, +1.0%, +4.3%, +5.5%, +7.8%, none, +2.6%, +3.4%, +2.5%, none, +7.5%, none, +2.2%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc < 7.632e+04 AND age_s < 347.6 | x_tp15 | 86 | +10.9% | +10.5% | 76% | 398 at -9.4% | +2.9% / +17.6% / +14.5% | 35 at +14.5% | +0.328 | 0 |
| age_s < 347.6 AND entry_mc < 6.358e+04 | x_tp15 | 62 | +5.8% | +5.3% | 71% | 422 at -7.5% | +4.0% / +13.5% / +2.1% | 20 at +2.1% | +0.116 | 3 |
| TRAIT under 5 min old | x_tp15 | 138 | +2.2% | +1.9% | 69% | 346 at -9.0% | -2.4% / +0.8% / +8.0% | 46 at +8.0% | +0.063 | 10 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc < 7.632e+04 AND age_s < 347.6 | x_tp15 | 86 | +10.9% | +10.5% | 76% | 398 at -9.4% | +2.9% / +17.6% / +14.5% | 35 at +14.5% | +0.328 | 0 |
| entry_mc < 7.632e+04 AND TRAIT under 5 min old | x_tp15 | 68 | +9.9% | +9.5% | 75% | 416 at -8.4% | -0.7% / +21.8% / +14.4% | 30 at +14.4% | +0.235 | 0 |
| entry_mc < 7.632e+04 AND age_s < 250 | x_tp15 | 55 | +7.4% | +6.8% | 73% | 429 at -7.5% | -5.9% / +12.9% / +18.3% | 24 at +18.3% | +0.136 | 2 |

## Proposal
**entry_mc < 7.632e+04 AND age_s < 347.6**, exit **x_tp15** — 86 trades at +10.9% (without best +10.5%), won 76%, thirds +2.9% / +17.6% / +14.5%, last 24 h 35 at +14.5%, 33.2 trades a day, +0.328 SOL a day at 0.1 — **unlikely to be luck**. Drops 398 trades at -9.4%.
