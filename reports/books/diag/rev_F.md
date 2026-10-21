# Revision search — F
_Data to 21 Oct 10:35 UK; A with launch bundle <= 3 wallets; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
126 trades, +0.9% a trade, without best -1.3%, 48.6 trades a day, -0.004 SOL a day at 0.1. Thirds: +11.8% / -12.0% / +3.0%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_split | 126 | +3.9% | +1.0% | +8.2% / -0.3% / +3.8% |
| x_t15s40 | 126 | +0.4% | +0.1% | +12.5% / -8.8% / -2.5% |
| x_flow4ff | 126 | +1.3% | -0.9% | +13.3% / -12.6% / +3.3% |
| x_flow4 (current) | 126 | +0.9% | -1.3% | +11.8% / -12.0% / +3.0% |
| x_t2s40 | 126 | -1.8% | -2.5% | +14.9% / -17.4% / -3.1% |
| x_h5 | 126 | -0.8% | -2.6% | +7.6% / -7.5% / -2.6% |
| x_h3 | 126 | -0.8% | -2.7% | +7.4% / -9.7% / +0.0% |
| x_tsl40 | 126 | -0.4% | -3.7% | +7.3% / -3.1% / -5.4% |
| x_h5f14 | 126 | -1.9% | -3.8% | +10.4% / -14.8% / -1.3% |
| x_h15 | 123 | -1.9% | -4.3% | +8.8% / -11.5% / -3.1% |
| x_h2t40 | 126 | -3.7% | -5.8% | +8.8% / -12.0% / -7.9% |
| x_time | 126 | -13.8% | -16.9% | -7.4% / -32.1% / -1.9% |

## Search
1205 filters × 12 exits (+ 336 pairs). 380 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +51.2%, +24.2%, +29.6%, +33.3%, +44.8%, +68.0%, +36.7%, +32.0%, +55.1%, +61.6%, +41.6%, +44.9%, +47.3%, +44.5%, +46.1%, +51.9%, +41.2%, +45.9%, +28.6%, +37.7%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| dev_buy_sol < 0.8629 AND TRAIT quiet first minute (selling < 20 SOL) | x_split | 12 | +71.8% | +44.4% | 58% | 114 at -3.2% | +16.5% / +114.4% / +108.9% | 4 at +108.9% | +0.328 | 11 |
| TRAIT quiet first minute (selling < 20 SOL) AND TRAIT creator bought under 0.9 SOL | x_split | 12 | +71.8% | +44.4% | 58% | 114 at -3.2% | +16.5% / +114.4% / +108.9% | 4 at +108.9% | +0.328 | 11 |
| wal60 < 41.25 AND sol60 < 30.73 | x_time | 14 | +64.1% | +40.3% | 57% | 112 at -23.5% | +7.2% / +38.0% / +135.6% | 5 at +135.6% | +0.341 | 13 |
| dev_hold_entry >= 0.04382 AND avg_buy_sol >= 0.5767 | x_time | 14 | +62.3% | +38.4% | 64% | 112 at -23.3% | +17.7% / +6.0% / +151.9% | 6 at +116.8% | +0.331 | 13 |
| TRAIT creator bought under 0.9 SOL AND sell60 < 20.69 | x_split | 16 | +55.9% | +34.8% | 50% | 110 at -3.7% | +16.5% / +53.8% / +108.9% | 4 at +108.9% | +0.339 | 15 |
| feed_lag_ms < 830 AND TRAIT socials unknown or absent | x_h15 | 15 | +50.7% | +33.4% | 73% | 108 at -9.2% | +51.6% / +34.0% / +82.5% | 4 at +66.6% | +0.288 | 15 |
| max_share >= 0.1625 AND wal60 < 41.25 | x_split | 18 | +51.8% | +32.9% | 50% | 108 at -4.1% | +25.4% / +54.3% / +72.6% | 7 at +72.6% | +0.353 | 16 |
| avg_buy_sol < 0.3253 AND top10_entry < 25.08 | x_t15s40 | 12 | +31.9% | +31.2% | 92% | 114 at -2.9% | +39.6% / +39.6% / +24.2% | 6 at +24.2% | +0.143 | 17 |
| avg_buy_sol >= 0.5767 AND sol60 < 30.73 | x_time | 17 | +49.3% | +29.0% | 53% | 109 at -23.6% | +7.2% / +38.6% / +82.4% | 8 at +64.8% | +0.317 | 18 |
| max_share >= 0.1625 AND avg_buy_sol >= 0.5767 | x_time | 22 | +44.2% | +28.6% | 50% | 104 at -26.1% | +31.0% / +50.3% / +50.4% | 9 at +50.4% | +0.367 | 18 |
| feed_lag_ms < 830 AND wal60 < 49.75 | x_t2s40 | 12 | +31.6% | +26.5% | 83% | 114 at -5.3% | +27.6% / +34.1% / +37.0% | 3 at +37.0% | +0.142 | 19 |
| top10_entry < 25.08 AND avg_buy_sol < 0.3253 | x_flow4 | 12 | +29.9% | +24.7% | 83% | 114 at -2.1% | +56.4% / +18.4% / +22.5% | 6 at +22.5% | +0.134 | 19 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| dev_buy_sol < 0.8629 | x_split | 43 | +26.7% | +18.5% | 44% | 83 at -7.9% | +11.5% / +40.1% / +29.7% | 15 at +27.0% | +0.427 | 20 |
| dev_buy_sol < 0.8629 AND TRAIT creator bought under 0.9 SOL | x_split | 43 | +26.7% | +18.5% | 44% | 83 at -7.9% | +11.5% / +40.1% / +29.7% | 15 at +27.0% | +0.427 | 20 |
| TRAIT creator bought under 0.9 SOL | x_split | 46 | +24.5% | +16.7% | 43% | 80 at -7.9% | +12.0% / +32.4% / +29.7% | 16 at +24.9% | +0.417 | 20 |
| wal60 < 41.25 AND max_share >= 0.1625 | x_time | 18 | +55.3% | +36.6% | 50% | 108 at -25.3% | +25.4% / +57.7% / +79.2% | 7 at +79.2% | +0.377 | 15 |
| max_share >= 0.1625 AND avg_buy_sol >= 0.5767 | x_time | 22 | +44.2% | +28.6% | 50% | 104 at -26.1% | +31.0% / +50.3% / +50.4% | 9 at +50.4% | +0.367 | 18 |

## Proposal
**dev_buy_sol < 0.8629**, exit **x_split** — 43 trades at +26.7% (without best +18.5%), won 44%, thirds +11.5% / +40.1% / +29.7%, last 24 h 15 at +27.0%, 16.6 trades a day, +0.427 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 20/20)**. Drops 83 trades at -7.9%.

### Early-exit overlay on the proposal (now: +26.7%, without best +18.5%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +24.6% | +16.3% | +8.5% / +39.7% / +26.8% |
| sell at fs10 if < 1.0 | +22.9% | +14.6% | +9.4% / +33.2% / +27.2% |
| sell at t30 if < 0.9 | +24.4% | +16.1% | +11.5% / +39.4% / +23.2% |
| sell at t30 if < 1.0 | +17.6% | +9.1% | +14.4% / +16.8% / +21.6% |
| sell at t60 if < 0.9 | +25.4% | +17.1% | +12.4% / +38.0% / +26.8% |
| sell at t60 if < 1.0 | +24.9% | +16.6% | +12.4% / +39.2% / +23.9% |
