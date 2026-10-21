# Revision search — E
_Data to 21 Oct 10:35 UK; abcd momentum rows; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
523 trades, -8.3% a trade, without best -8.8%, 202.0 trades a day, -1.874 SOL a day at 0.1. Thirds: -12.0% / -11.0% / -1.8%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 523 | -5.8% | -5.9% | -7.0% / -9.7% / -0.7% |
| x_h15 | 501 | -7.0% | -8.4% | -8.6% / -9.0% / -2.7% |
| x_t2s40 | 523 | -8.4% | -8.6% | -6.8% / -16.2% / -2.1% |
| x_tsl40 | 523 | -7.5% | -8.6% | -12.6% / -14.6% / +4.7% |
| x_flow4 (current) | 523 | -8.3% | -8.8% | -12.0% / -11.0% / -1.8% |
| x_h3 | 505 | -7.7% | -9.0% | -2.3% / -11.6% / -9.4% |
| x_h5 | 502 | -8.8% | -10.2% | -3.6% / -12.9% / -10.0% |
| x_time | 523 | -43.4% | -44.3% | -46.0% / -48.1% / -36.2% |

## Search
93 filters × 8 exits (+ 27 pairs). 31 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +20.5%, +11.4%, none, +6.0%, +1.5%, +6.7%, +2.6%, +3.2%, +13.8%, +3.8%, +19.7%, +5.9%, +19.0%, +2.3%, +3.0%, +1.9%, +1.3%, +1.8%, +11.0%, +4.2%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 166 | x_t2s40 | 77 | +9.2% | +8.2% | 45% | 446 at -11.4% | +19.8% / +4.7% / +0.5% | 28 at +0.5% | +0.245 | 6 |
| vol5m_usd >= 1.004e+05 | x_t15s40 | 55 | +7.6% | +7.0% | 65% | 468 at -7.4% | +7.4% / -2.4% / +24.5% | 15 at +24.5% | +0.140 | 6 |
| vol5m_usd >= 1.004e+05 | x_t2s40 | 55 | +5.0% | +3.5% | 45% | 468 at -9.9% | +4.1% / -8.3% / +28.2% | 15 at +28.2% | +0.085 | 11 |
| entry_mc < 6.382e+04 | x_h15 | 175 | +7.4% | +3.4% | 52% | 326 at -14.7% | +3.8% / +12.6% / +8.4% | 60 at +10.5% | +0.433 | 11 |
| age_s < 166 | x_t15s40 | 77 | +3.8% | +3.4% | 61% | 446 at -7.5% | +1.4% / +1.5% / +8.0% | 28 at +8.0% | +0.084 | 11 |
| TRAIT under 5 min old | x_t2s40 | 191 | +3.4% | +3.0% | 41% | 332 at -15.1% | +8.8% / -3.8% / +5.3% | 69 at +7.6% | +0.177 | 13 |
| vol5m_usd >= 1.001e+05 | x_flow4 | 128 | +4.2% | +2.1% | 45% | 395 at -12.3% | +2.3% / -2.3% / +15.2% | 40 at +13.5% | +0.160 | 15 |
| entry_mc < 6.023e+04 AND entry_mc < 6.382e+04 | x_flow4 | 131 | +4.1% | +2.0% | 46% | 392 at -12.4% | +13.9% / -7.9% / +2.0% | 45 at +2.0% | +0.159 | 15 |
| bundle_pct >= 74.55 | x_h3 | 77 | +2.0% | +0.5% | 60% | 428 at -9.4% | +4.0% / -8.9% / +8.6% | 31 at +9.2% | +0.031 | 19 |
| age_s < 422 | x_tsl40 | 258 | +2.3% | +0.1% | 31% | 265 at -17.1% | -3.1% / -8.1% / +17.3% | 91 at +20.0% | +0.129 | 19 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc < 6.382e+04 | x_h15 | 175 | +7.4% | +3.4% | 52% | 326 at -14.7% | +3.8% / +12.6% / +8.4% | 60 at +10.5% | +0.433 | 11 |
| age_s < 166 | x_t2s40 | 77 | +9.2% | +8.2% | 45% | 446 at -11.4% | +19.8% / +4.7% / +0.5% | 28 at +0.5% | +0.245 | 6 |
| age_s < 166 AND TRAIT under 5 min old | x_t2s40 | 77 | +9.2% | +8.2% | 45% | 446 at -11.4% | +19.8% / +4.7% / +0.5% | 28 at +0.5% | +0.245 | 6 |
| age_s < 166 AND age_s < 293 | x_t2s40 | 77 | +9.2% | +8.2% | 45% | 446 at -11.4% | +19.8% / +4.7% / +0.5% | 28 at +0.5% | +0.245 | 6 |
| age_s < 166 AND age_s < 231 | x_t2s40 | 77 | +9.2% | +8.2% | 45% | 446 at -11.4% | +19.8% / +4.7% / +0.5% | 28 at +0.5% | +0.245 | 6 |

## Proposal
**entry_mc < 6.382e+04**, exit **x_h15** — 175 trades at +7.4% (without best +3.4%), won 52%, thirds +3.8% / +12.6% / +8.4%, last 24 h 60 at +10.5%, 67.6 trades a day, +0.433 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 11/20)**. Drops 326 trades at -14.7%.
