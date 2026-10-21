# Revision search — AS
_Data to 21 Oct 10:35 UK; A + standard filters; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
89 trades, +10.8% a trade, without best +7.7%, 35.0 trades a day, +0.341 SOL a day at 0.1. Thirds: +12.5% / +4.7% / +15.2%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_flow4 (current) | 89 | +10.8% | +7.7% | +12.5% / +4.7% / +15.2% |
| x_t2s40 | 89 | +8.4% | +7.5% | +7.6% / +3.7% / +14.0% |
| x_t15s40 | 89 | +6.9% | +6.5% | +7.0% / -3.1% / +17.2% |
| x_flow4ff | 89 | +7.4% | +5.9% | +13.4% / -6.0% / +15.0% |
| x_h2t40 | 89 | +3.1% | +0.2% | -0.7% / +2.3% / +7.7% |
| x_h5f14 | 89 | +0.8% | -0.5% | +0.0% / -7.7% / +10.4% |
| x_h3 | 89 | -0.7% | -2.2% | +3.8% / -12.1% / +6.3% |
| x_h15 | 88 | -0.4% | -2.8% | -3.4% / -2.7% / +5.3% |
| x_h5 | 89 | -2.0% | -3.5% | -4.4% / -7.2% / +5.8% |
| x_split | 89 | -2.4% | -5.6% | -9.7% / -2.1% / +4.9% |
| x_tsl40 | 89 | -1.6% | -6.3% | -4.6% / -0.5% / +0.3% |
| x_time | 87 | -27.4% | -31.2% | -34.6% / -15.8% / -32.4% |

## Search
1235 filters × 12 exits (+ 258 pairs). 462 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +55.8%, +65.8%, +45.1%, +54.8%, +47.1%, +50.6%, +44.2%, +71.2%, +45.1%, +37.4%, +40.7%, +71.3%, +46.6%, +38.0%, +55.9%, +43.5%, +53.4%, +43.2%, +34.4%, +41.9%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| dev_hold_entry < 1 AND bundle_pct >= 30.79 | x_t2s40 | 14 | +52.2% | +49.5% | 79% | 75 at +0.2% | +41.1% / +87.0% / +28.8% | 6 at +28.8% | +0.282 | 8 |
| wal60 < 46 AND TRAIT quiet first minute (selling < 20 SOL) | x_t2s40 | 14 | +50.9% | +48.2% | 79% | 75 at +0.5% | +59.0% / +55.2% / +35.4% | 4 at +35.4% | +0.275 | 8 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 46 | x_h2t40 | 14 | +57.9% | +43.1% | 79% | 75 at -7.2% | +53.7% / +74.8% / +42.1% | 4 at +42.1% | +0.313 | 15 |
| wal60 < 46 AND sell60 < 22.41 | x_h2t40 | 15 | +54.6% | +40.6% | 80% | 74 at -7.4% | +53.7% / +63.8% / +42.1% | 4 at +42.1% | +0.316 | 17 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 46 | x_tsl40 | 14 | +66.6% | +39.9% | 71% | 75 at -14.3% | +38.4% / +100.3% / +59.9% | 4 at +59.9% | +0.361 | 17 |
| top10_entry < 19.4 | x_t2s40 | 14 | +41.1% | +37.6% | 64% | 75 at +2.3% | +41.0% / +30.3% / +52.2% | 4 at +52.2% | +0.221 | 18 |
| largest_entry < 2.792 | x_t2s40 | 14 | +39.8% | +36.2% | 64% | 75 at +2.5% | +59.4% / +10.2% / +52.2% | 4 at +52.2% | +0.213 | 19 |
| TRAIT quiet first minute (selling < 20 SOL) | x_t2s40 | 18 | +38.7% | +35.8% | 67% | 71 at +0.7% | +27.7% / +51.6% / +35.4% | 4 at +35.4% | +0.267 | 19 |
| TRAIT quiet first minute (selling < 20 SOL) AND wal60 < 46 | x_split | 14 | +53.0% | +35.8% | 64% | 75 at -12.7% | +9.4% / +67.1% / +89.9% | 4 at +89.9% | +0.286 | 19 |
| sell60 < 19.24 | x_flow4 | 14 | +52.9% | +35.6% | 86% | 75 at +2.9% | +38.5% / +75.4% / +44.0% | 3 at +44.0% | +0.285 | 19 |
| TRAIT quiet first minute (selling < 20 SOL) | x_flow4 | 18 | +47.8% | +34.3% | 83% | 71 at +1.4% | +37.5% / +57.9% / +48.2% | 4 at +48.2% | +0.331 | 20 |
| heat_trig24h < 809 | x_t2s40 | 17 | +36.9% | +33.7% | 65% | 72 at +1.7% | +31.6% / +27.0% / +63.2% | 4 at +63.2% | +0.240 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| bundle_wallets >= 2 | x_flow4 | 72 | +17.4% | +13.8% | 65% | 17 at -17.4% | +19.7% / +14.4% / +17.9% | 25 at +15.1% | +0.464 | 20 |
| TRAIT launch bundle 2+ wallets | x_flow4 | 72 | +17.4% | +13.8% | 65% | 17 at -17.4% | +19.7% / +14.4% / +17.9% | 25 at +15.1% | +0.464 | 20 |
| bundle_wallets >= 5 | x_flow4 | 42 | +28.5% | +22.4% | 74% | 47 at -5.1% | +24.0% / +31.0% / +30.5% | 15 at +25.1% | +0.454 | 20 |
| TRAIT launch bundle 5+ wallets | x_flow4 | 42 | +28.5% | +22.4% | 74% | 47 at -5.1% | +24.0% / +31.0% / +30.5% | 15 at +25.1% | +0.454 | 20 |
| sell60 < 35.34 | x_t2s40 | 66 | +18.0% | +16.9% | 53% | 23 at -19.2% | +20.0% / +10.5% / +23.4% | 25 at +19.9% | +0.441 | 20 |

## Proposal
**bundle_wallets >= 2**, exit **x_flow4** — 72 trades at +17.4% (without best +13.8%), won 65%, thirds +19.7% / +14.4% / +17.9%, last 24 h 25 at +15.1%, 28.3 trades a day, +0.464 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 20/20)**. Drops 17 trades at -17.4%.

### Early-exit overlay on the proposal (now: +17.4%, without best +13.8%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +15.4% | +11.8% | +15.5% / +18.0% / +12.9% |
| sell at fs10 if < 1.0 | +10.3% | +6.6% | +12.4% / +13.8% / +4.8% |
| sell at t30 if < 0.9 | +16.0% | +12.4% | +21.0% / +14.9% / +11.9% |
| sell at t30 if < 1.0 | +12.1% | +8.3% | +16.0% / +9.4% / +10.5% |
| sell at t60 if < 0.9 | +10.5% | +8.8% | +21.7% / -3.7% / +12.6% |
| sell at t60 if < 1.0 | +11.1% | +9.4% | +21.5% / -2.2% / +13.0% |
