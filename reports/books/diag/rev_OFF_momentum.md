# Revision search — OFF:momentum
_Data to 21 Oct 10:35 UK; off-page tracker book; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
365 trades, -9.8% a trade, without best -10.6%, 141.0 trades a day, -1.518 SOL a day at 0.1. Thirds: -13.5% / -12.5% / -3.3%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 365 | -5.5% | -5.6% | -7.2% / -8.6% / -0.7% |
| x_tp15 | 365 | -6.3% | -6.5% | -7.6% / -8.7% / -2.7% |
| x_h3 | 352 | -7.8% | -9.6% | -3.8% / -11.7% / -7.8% |
| x_t2s40 | 365 | -9.5% | -9.7% | -8.0% / -17.7% / -2.6% |
| x_h15 | 349 | -8.2% | -10.3% | -9.8% / -11.0% / -3.2% |
| x_flow4 (current) | 365 | -9.8% | -10.6% | -13.5% / -12.5% / -3.3% |
| x_h5 | 350 | -8.8% | -10.9% | -4.9% / -12.9% / -8.6% |
| x_tsl40 | 365 | -9.3% | -10.9% | -13.6% / -16.3% / +2.0% |
| x_tp | 365 | -11.0% | -11.3% | -12.3% / -18.1% / -2.7% |
| x_tsl60 | 365 | -22.8% | -24.2% | -28.7% / -25.9% / -13.7% |
| x_time | 365 | -39.8% | -41.1% | -41.8% / -43.6% / -34.1% |

## Search
93 filters × 11 exits (+ 44 pairs). 46 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +17.0%, +18.7%, +10.2%, +8.5%, +10.3%, +4.6%, +16.3%, +15.7%, +13.5%, +7.2%, +12.8%, none, none, none, +3.9%, +5.1%, +13.6%, +21.1%, +8.0%, +0.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 249 AND TRAIT socials unknown or absent | x_tp15 | 44 | +12.1% | +11.4% | 75% | 321 at -8.9% | +15.5% / +10.3% / +10.9% | 7 at +10.9% | +0.188 | 8 |
| vol5m_usd >= 1.004e+05 | x_t15s40 | 55 | +7.6% | +7.0% | 65% | 310 at -7.8% | +9.4% / -4.2% / +24.5% | 15 at +24.5% | +0.140 | 13 |
| age_s < 318 AND vol5m_usd >= 1.001e+05 | x_t2s40 | 75 | +6.7% | +5.6% | 45% | 290 at -13.6% | +24.1% / -5.0% / +9.1% | 25 at +9.1% | +0.164 | 13 |
| TRAIT under 5 min old AND TRAIT socials unknown or absent | x_tp15 | 60 | +5.3% | +4.7% | 70% | 305 at -8.6% | +4.7% / +3.4% / +11.0% | 12 at +11.0% | +0.099 | 14 |
| vol5m_usd >= 1.004e+05 | x_tp15 | 55 | +4.6% | +3.9% | 71% | 310 at -8.3% | +6.9% / -6.9% / +20.5% | 15 at +20.5% | +0.076 | 16 |
| age_s < 318 | x_tp | 126 | +4.2% | +3.6% | 52% | 239 at -19.1% | +16.1% / -7.2% / +5.7% | 41 at +5.7% | +0.157 | 16 |
| vol5m_usd >= 1.004e+05 | x_t2s40 | 55 | +5.0% | +3.5% | 45% | 310 at -12.0% | +9.2% / -12.3% / +28.2% | 15 at +28.2% | +0.085 | 16 |
| TRAIT under 5 min old AND vol5m_usd >= 1.001e+05 | x_t2s40 | 71 | +4.1% | +2.9% | 44% | 294 at -12.7% | +24.1% / -11.2% / +8.3% | 23 at +8.3% | +0.084 | 16 |
| entry_mc >= 1.522e+05 | x_tp | 92 | +3.6% | +2.7% | 43% | 273 at -16.0% | +24.7% / -6.6% / -0.1% | 25 at -0.1% | +0.094 | 16 |
| TRAIT under 5 min old | x_tp | 120 | +3.0% | +2.3% | 52% | 245 at -17.9% | +17.0% / -11.4% / +6.0% | 39 at +6.0% | +0.092 | 16 |
| vol5m_usd >= 1.001e+05 | x_flow4 | 128 | +4.2% | +2.1% | 45% | 237 at -17.3% | +3.5% / -2.3% / +13.5% | 40 at +13.5% | +0.160 | 16 |
| vol5m_usd >= 1.004e+05 | x_tp | 55 | +1.9% | +0.4% | 51% | 310 at -13.3% | +11.9% / -15.9% / +19.8% | 15 at +19.8% | +0.020 | 16 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 249 AND TRAIT socials unknown or absent | x_tp15 | 44 | +12.1% | +11.4% | 75% | 321 at -8.9% | +15.5% / +10.3% / +10.9% | 7 at +10.9% | +0.188 | 8 |
| age_s < 249 AND has_socials == 0 | x_tp15 | 44 | +12.1% | +11.4% | 75% | 321 at -8.9% | +15.5% / +10.3% / +10.9% | 7 at +10.9% | +0.188 | 8 |
| age_s < 318 AND vol5m_usd >= 1.001e+05 | x_t2s40 | 75 | +6.7% | +5.6% | 45% | 290 at -13.6% | +24.1% / -5.0% / +9.1% | 25 at +9.1% | +0.164 | 13 |
| vol5m_usd >= 1.001e+05 | x_flow4 | 128 | +4.2% | +2.1% | 45% | 237 at -17.3% | +3.5% / -2.3% / +13.5% | 40 at +13.5% | +0.160 | 16 |
| age_s < 318 | x_tp | 126 | +4.2% | +3.6% | 52% | 239 at -19.1% | +16.1% / -7.2% / +5.7% | 41 at +5.7% | +0.157 | 16 |

## Proposal
**age_s < 249 AND TRAIT socials unknown or absent**, exit **x_tp15** — 44 trades at +12.1% (without best +11.4%), won 75%, thirds +15.5% / +10.3% / +10.9%, last 24 h 7 at +10.9%, 17.0 trades a day, +0.188 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 8/20)**. Drops 321 trades at -8.9%.
