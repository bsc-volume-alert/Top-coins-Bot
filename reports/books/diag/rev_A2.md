# Revision search — A2
_Data to 21 Oct 10:35 UK; A sold at 60 s if under 0.95; current exit custom; pool costs. Built by reports/books/revise.py._

## The book now
228 trades, -6.6% a trade, without best -7.8%, 142.3 trades a day, -1.080 SOL a day at 0.1. Thirds: -12.5% / -6.3% / -0.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t2s40 | 228 | -3.9% | -4.3% | -1.9% / -5.3% / -4.5% |
| x_t15s40 | 228 | -4.8% | -5.0% | -6.5% / -1.0% / -6.9% |
| x_flow4 | 228 | -4.2% | -5.4% | -6.1% / -3.2% / -3.2% |
| x_split | 228 | -4.2% | -5.9% | -10.8% / +4.1% / -6.0% |
| x_h3 | 228 | -5.4% | -6.5% | -11.5% / -1.2% / -3.4% |
| x_flow4ff | 228 | -5.4% | -6.7% | -12.2% / -5.4% / +1.3% |
| x_h5 | 228 | -6.3% | -7.3% | -7.3% / -2.4% / -9.1% |
| custom (current) | 228 | -6.6% | -7.8% | -12.5% / -6.3% / -0.9% |
| x_h5f14 | 228 | -7.0% | -8.1% | -12.2% / -2.5% / -6.4% |
| x_h2t40 | 228 | -6.9% | -8.1% | -6.0% / -4.5% / -10.3% |
| x_tsl40 | 228 | -6.3% | -8.1% | -6.7% / +0.1% / -12.2% |
| x_h15 | 224 | -7.0% | -8.9% | -7.7% / -2.2% / -10.9% |
| x_time | 226 | -25.8% | -27.6% | -29.3% / -15.7% / -32.5% |

## Search
1277 filters × 13 exits (+ 301 pairs). 463 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +24.7%, +21.9%, +18.7%, +25.2%, +22.6%, +51.8%, +25.5%, +25.6%, +22.8%, +27.6%, +22.3%, +35.3%, +32.7%, +27.5%, +30.1%, +15.8%, +23.4%, +24.0%, +22.9%, +19.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| wal60 < 47.75 AND TRAIT quiet first minute (selling < 20 SOL) | x_split | 26 | +40.6% | +27.3% | 50% | 202 at -10.0% | +24.6% / +27.1% / +68.0% | 17 at +37.5% | +0.642 | 6 |
| pre_min1_nb < 47.75 AND TRAIT quiet first minute (selling < 20 SOL) | x_split | 26 | +40.6% | +27.3% | 50% | 202 at -10.0% | +24.6% / +27.1% / +68.0% | 17 at +37.5% | +0.642 | 6 |
| pre_m1_nb < 47.75 AND TRAIT quiet first minute (selling < 20 SOL) | x_split | 26 | +40.6% | +27.3% | 50% | 202 at -10.0% | +24.6% / +27.1% / +68.0% | 17 at +37.5% | +0.642 | 6 |
| pre_min1_s < 2384 AND wal60 < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| pre_m1_s < 2384 AND wal60 < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| dev_buy_sol < 0.2963 AND TRAIT biggest buyer 3-5 SOL | x_t15s40 | 33 | +24.3% | +23.8% | 82% | 195 at -9.7% | +22.0% / +25.1% / +25.7% | 18 at +29.2% | +0.480 | 11 |
| pre_m2_s < 2232 AND pre_m5_s < 2341 | x_split | 31 | +31.4% | +20.0% | 42% | 197 at -9.8% | +10.8% / +18.2% / +83.3% | 15 at +55.4% | +0.589 | 17 |
| n60 < 53 AND sell60 < 19.83 | x_tsl40 | 23 | +32.4% | +15.1% | 43% | 205 at -10.6% | +41.4% / +47.1% / +9.2% | 15 at +7.6% | +0.452 | 20 |
| pre_30sol_w < 45.75 AND sell60 < 19.83 | x_tsl40 | 24 | +31.2% | +14.6% | 46% | 204 at -10.7% | +29.4% / +44.3% / +14.3% | 15 at +10.6% | +0.453 | 20 |
| pre_m2_s < 2232 AND pre_m5_s < 2341 | x_t2s40 | 31 | +16.6% | +14.3% | 48% | 197 at -7.2% | +19.9% / +0.4% / +26.8% | 15 at +17.9% | +0.303 | 20 |
| n60 < 53 AND TRAIT quiet first minute (selling < 20 SOL) | x_h2t40 | 24 | +23.8% | +14.0% | 50% | 204 at -10.6% | +51.5% / +18.1% / +11.1% | 16 at +2.7% | +0.342 | 20 |
| TRAIT quiet first minute (selling < 20 SOL) | x_flow4 | 37 | +21.0% | +13.9% | 54% | 191 at -9.0% | +33.9% / +3.6% / +27.0% | 22 at +17.1% | +0.462 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| pre_min1_s < 2384 AND wal60 < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| pre_min1_s < 2384 AND pre_min1_nb < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| pre_min1_s < 2384 AND pre_m1_nb < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| pre_m1_s < 2384 AND wal60 < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |
| pre_m1_s < 2384 AND pre_min1_nb < 47.75 | x_split | 35 | +36.5% | +26.7% | 46% | 193 at -11.6% | +26.6% / +12.6% / +76.0% | 20 at +42.0% | +0.777 | 6 |

## Proposal
**pre_min1_s < 2384 AND wal60 < 47.75**, exit **x_split** — 35 trades at +36.5% (without best +26.7%), won 46%, thirds +26.6% / +12.6% / +76.0%, last 24 h 20 at +42.0%, 21.9 trades a day, +0.777 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 6/20)**. Drops 193 trades at -11.6%.

### Early-exit overlay on the proposal (now: +36.5%, without best +26.7%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +25.3% | +15.1% | +18.2% / +11.8% / +49.1% |
| sell at fs10 if < 1.0 | +14.0% | +3.4% | +4.4% / +13.5% / +23.3% |
| sell at t30 if < 0.9 | +34.8% | +24.8% | +17.4% / +15.8% / +74.8% |
| sell at t30 if < 1.0 | +34.0% | +24.0% | +12.7% / +15.7% / +76.5% |
| sell at t60 if < 0.9 | +35.3% | +25.4% | +24.1% / +10.5% / +77.0% |
| sell at t60 if < 1.0 | +36.2% | +26.3% | +24.1% / +11.4% / +78.8% |
