# Revision search — G
_Data to 21 Oct 10:35 UK; A's trigger on coins A skips for 150-500 wallets, 5-min; current exit x_h5; pool costs. Built by reports/books/revise.py._

## The book now
120 trades, -3.1% a trade, without best -8.2%, 46.9 trades a day, -0.193 SOL a day at 0.1. Thirds: +16.5% / -21.0% / -4.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_h15 | 118 | +3.5% | -1.6% | +16.9% / -5.7% / -1.0% |
| x_t15s40 | 120 | -5.6% | -6.0% | +0.9% / -16.8% / -0.9% |
| x_flow4 | 120 | -6.3% | -7.5% | -4.1% / -14.9% / -0.0% |
| x_h5 (current) | 120 | -3.1% | -8.2% | +16.5% / -21.0% / -4.9% |
| x_flow4ff | 120 | -7.1% | -8.3% | -3.0% / -15.2% / -3.2% |
| x_h5f14 | 120 | -3.4% | -8.4% | +13.5% / -22.0% / -1.7% |
| x_split | 120 | -7.0% | -9.4% | +3.5% / -15.3% / -9.2% |
| x_h3 | 120 | -6.1% | -9.6% | +7.6% / -24.3% / -1.7% |
| x_tsl40 | 120 | -9.1% | -10.9% | -13.1% / -10.0% / -4.3% |
| x_t2s40 | 120 | -11.2% | -12.0% | -9.9% / -15.2% / -8.5% |
| x_h2t40 | 120 | -13.0% | -15.4% | -9.7% / -18.1% / -11.1% |
| x_time | 120 | -37.7% | -41.0% | -41.3% / -45.5% / -26.1% |

## Search
1419 filters × 12 exits (+ 270 pairs). 371 pass the three-period test; **3 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +86.6%, +53.0%, +55.6%, +33.3%, +62.5%, +68.5%, +43.6%, +58.6%, +47.4%, +69.2%, +39.0%, +37.1%, +35.3%, +70.6%, +46.8%, +48.3%, +27.4%, +47.8%, +51.6%, +34.2%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| largest_entry >= 4.785 AND hour_uk < 14.65 | x_h15 | 15 | +112.1% | +77.3% | 67% | 103 at -12.3% | +172.9% / +92.6% / +45.2% | 4 at +45.2% | +0.651 | 1 |
| hour_uk < 14.65 AND bundle_wallets < 4 | x_h15 | 15 | +107.6% | +72.4% | 60% | 103 at -11.7% | +162.4% / +92.6% / +44.1% | 3 at +76.9% | +0.625 | 1 |
| factory == 1 | x_h15 | 12 | +90.8% | +44.5% | 67% | 106 at -6.4% | +182.9% / +80.2% / +19.8% | 2 at +19.5% | +0.421 | 13 |
| holders_entry >= 1039 AND h0_n >= 1036 | x_t2s40 | 12 | +41.4% | +37.2% | 75% | 108 at -17.1% | +41.0% / +41.8% / +41.1% | 3 at +41.1% | +0.189 | 15 |
| bundle_wallets < 3 | x_h15 | 27 | +48.3% | +27.1% | 48% | 91 at -9.8% | +84.7% / +34.8% / +18.2% | 7 at +28.5% | +0.499 | 20 |
| gi_liquidity † < 1.536e+04 AND gi_total_fee † < 3.46 | x_split | 24 | +33.3% | +22.7% | 54% | 96 at -17.0% | +51.0% / +12.8% / +5.5% | 6 at +5.5% | +0.303 | 20 |
| gi_holder_count † < 986 AND gi_visiting_count † >= 122 | x_h5 | 27 | +44.0% | +22.7% | 67% | 93 at -16.8% | +51.4% / +26.5% / +30.8% | 6 at +30.8% | +0.454 | 20 |
| gs_top_10_holder_rate † >= 0.1562 AND gi_visiting_count † >= 122 | x_h5 | 30 | +40.9% | +21.7% | 67% | 90 at -17.8% | +51.4% / +23.3% / +26.7% | 7 at +26.7% | +0.468 | 20 |
| holders_entry >= 1039 | x_h2t40 | 13 | +25.6% | +21.2% | 77% | 107 at -17.7% | +18.9% / +29.1% / +27.6% | 3 at +27.6% | +0.125 | 20 |
| gi_holder_count † < 986 AND gi_visiting_count † >= 122 | x_h3 | 27 | +33.4% | +18.9% | 70% | 93 at -17.6% | +33.1% / +28.3% / +36.9% | 6 at +36.9% | +0.342 | 20 |
| gi_visiting_count † >= 122 AND gi_total_fee † >= 0.6239 | x_h5 | 29 | +38.7% | +18.7% | 62% | 91 at -16.5% | +51.4% / +26.5% / +14.9% | 8 at +14.9% | +0.427 | 20 |
| gs_top_10_holder_rate † >= 0.1562 AND gi_visiting_count † >= 122 | x_h3 | 30 | +31.1% | +18.0% | 70% | 90 at -18.5% | +33.1% / +22.5% / +32.0% | 7 at +32.0% | +0.353 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| largest_entry >= 4.785 AND hour_uk < 14.65 | x_h15 | 15 | +112.1% | +77.3% | 67% | 103 at -12.3% | +172.9% / +92.6% / +45.2% | 4 at +45.2% | +0.651 | 1 |
| hour_uk < 14.65 AND bundle_wallets < 4 | x_h15 | 15 | +107.6% | +72.4% | 60% | 103 at -11.7% | +162.4% / +92.6% / +44.1% | 3 at +76.9% | +0.625 | 1 |
| largest_entry >= 4.785 AND bundle_wallets < 4 | x_h15 | 15 | +105.3% | +70.0% | 53% | 103 at -11.3% | +269.4% / +50.4% / +37.2% | 4 at +37.2% | +0.611 | 2 |

## Proposal
**largest_entry >= 4.785 AND hour_uk < 14.65**, exit **x_h15** — 15 trades at +112.1% (without best +77.3%), won 67%, thirds +172.9% / +92.6% / +45.2%, last 24 h 4 at +45.2%, 5.9 trades a day, +0.651 SOL a day at 0.1 — **unlikely to be luck**. Drops 103 trades at -12.3%.

### Early-exit overlay on the proposal (now: +112.1%, without best +77.3%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +118.8% | +84.4% | +178.3% / +99.8% / +53.3% |
| sell at fs10 if < 1.0 | +42.4% | +3.7% | +94.6% / -28.9% / +53.3% |
| sell at t30 if < 0.9 | +112.3% | +77.4% | +178.2% / +99.1% / +29.9% |
| sell at t30 if < 1.0 | +72.0% | +35.4% | +172.9% / -15.4% / +29.9% |
| sell at t60 if < 0.9 | +116.2% | +81.6% | +177.3% / +96.6% / +48.9% |
| sell at t60 if < 1.0 | +75.8% | +39.4% | +177.3% / -18.0% / +40.8% |
