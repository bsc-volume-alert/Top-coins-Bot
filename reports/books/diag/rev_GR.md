# Revision search — GR
_Data to 21 Oct 10:35 UK; graduation book, 3-min exit; current exit x_h3; pool costs. Built by reports/books/revise.py._

## The book now
74 trades, +12.8% a trade, without best +8.9%, 61.1 trades a day, +0.722 SOL a day at 0.1. Thirds: +24.6% / -4.8% / +18.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_split | 74 | +27.6% | +24.2% | +49.9% / -12.6% / +46.3% |
| x_tsl40 | 74 | +29.0% | +23.4% | +41.2% / -13.5% / +60.7% |
| x_h2t40 | 74 | +16.0% | +12.6% | +20.1% / -20.5% / +49.7% |
| x_flow4 | 74 | +14.4% | +11.2% | +25.9% / +5.8% / +11.4% |
| x_h15 | 73 | +16.7% | +11.1% | +37.3% / -5.0% / +16.9% |
| x_flow4ff | 74 | +13.6% | +10.4% | +26.5% / +2.8% / +11.4% |
| x_h3 (current) | 74 | +12.8% | +8.9% | +24.6% / -4.8% / +18.9% |
| x_t15s40 | 74 | +5.8% | +5.4% | +18.3% / -4.6% / +3.7% |
| x_t2s40 | 74 | +5.8% | +4.7% | +6.6% / -15.5% / +27.2% |
| x_h5f14 | 74 | +7.4% | +4.2% | +25.7% / -6.5% / +2.7% |
| x_h5 | 74 | +5.8% | +2.6% | +22.6% / -10.6% / +5.4% |
| x_time | 74 | -22.7% | -26.4% | -22.6% / -21.5% / -24.1% |

## Search
275 filters × 12 exits (+ 318 pairs). 372 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +82.7%, +46.0%, +71.0%, +90.2%, +110.3%, +90.2%, +81.9%, +79.5%, +67.0%, +115.1%, +87.0%, +78.6%, +96.0%, +79.6%, +116.2%, +87.7%, +69.9%, +57.3%, +96.4%, +67.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| h0_t20 >= 47.88 AND h0_t10 >= 33.2 | x_split | 16 | +87.8% | +75.2% | 62% | 58 at +11.0% | +114.9% / +49.3% / +88.3% | 12 at +63.5% | +1.145 | 14 |
| bundle_wallets >= 8 | x_split | 15 | +83.2% | +69.4% | 67% | 59 at +13.5% | +104.8% / +49.7% / +88.7% | 10 at +94.9% | +1.017 | 16 |
| cr_wallet_age_s < 9771 AND feed_lag_ms >= 1086 | x_tsl40 | 14 | +93.4% | +66.6% | 50% | 60 at +14.0% | +74.1% / +50.8% / +130.8% | 10 at +109.5% | +1.067 | 18 |
| dev_hold_entry >= 1.049 AND dev_buy_sol >= 0.2963 | x_split | 18 | +74.3% | +62.4% | 61% | 56 at +12.6% | +188.9% / +36.8% / +47.8% | 16 at +63.5% | +1.088 | 18 |
| dev_buy_sol >= 0.2963 AND h0_dev >= 1.05 | x_split | 18 | +74.3% | +62.4% | 61% | 56 at +12.6% | +188.9% / +36.8% / +47.8% | 16 at +63.5% | +1.088 | 18 |
| bundle_wallets >= 8 | x_tsl40 | 15 | +87.6% | +62.3% | 67% | 59 at +14.2% | +116.4% / +11.3% / +147.7% | 10 at +97.8% | +1.072 | 18 |
| feed_lag_ms >= 1214 AND bundle_wallets >= 5 | x_h15 | 12 | +84.0% | +53.6% | 92% | 61 at +3.4% | +132.3% / +18.5% / +101.3% | 9 at +80.4% | +0.822 | 19 |
| h0_t20 >= 44.19 AND top10_entry >= 37.43 | x_h3 | 19 | +65.5% | +52.5% | 79% | 55 at -5.4% | +68.4% / +89.3% / +53.7% | 14 at +53.7% | +1.011 | 19 |
| bundle_pct >= 52.41 AND feed_lag_ms >= 1086 | x_tsl40 | 20 | +71.3% | +51.8% | 55% | 54 at +13.4% | +74.1% / +50.8% / +75.3% | 16 at +75.9% | +1.160 | 19 |
| h0_t20 >= 44.19 AND top10_entry >= 33.21 | x_flow4ff | 21 | +55.9% | +46.3% | 81% | 53 at -3.2% | +70.8% / +55.8% / +41.1% | 16 at +40.7% | +0.952 | 19 |
| cr_wallet_age_s < 6903 | x_split | 32 | +53.5% | +46.3% | 53% | 42 at +7.9% | +69.3% / +0.3% / +66.9% | 24 at +53.6% | +1.385 | 19 |
| dev_hold_entry >= 1.049 | x_tsl40 | 19 | +66.8% | +46.0% | 58% | 55 at +16.0% | +200.0% / +1.9% / +75.4% | 17 at +55.8% | +1.032 | 19 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| factory == 0 | x_tsl40 | 63 | +39.1% | +32.6% | 49% | 11 at -28.5% | +43.0% / -3.0% / +76.7% | 51 at +39.3% | +1.980 | 20 |
| bundle_pct >= 52.41 | x_tsl40 | 50 | +48.8% | +40.8% | 48% | 24 at -12.2% | +52.1% / +2.8% / +66.1% | 38 at +50.3% | +1.973 | 20 |
| factory == 0 | x_split | 63 | +36.8% | +33.0% | 48% | 11 at -25.2% | +53.4% / -4.7% / +59.4% | 51 at +35.8% | +1.862 | 20 |
| cr_wallet_age_s >= 476 | x_tsl40 | 44 | +50.8% | +41.7% | 50% | 30 at -2.9% | +47.7% / +10.6% / +70.6% | 34 at +57.2% | +1.809 | 20 |
| cr_wallet_age_s >= 476 AND bundle_pct >= 52.41 | x_tsl40 | 44 | +50.8% | +41.7% | 50% | 30 at -2.9% | +47.7% / +10.6% / +70.6% | 34 at +57.2% | +1.809 | 20 |

## Proposal
**factory == 0**, exit **x_tsl40** — 63 trades at +39.1% (without best +32.6%), won 49%, thirds +43.0% / -3.0% / +76.7%, last 24 h 51 at +39.3%, 52.0 trades a day, +1.980 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 20/20)**. Drops 11 trades at -28.5%.

### Early-exit overlay on the proposal (now: +39.1%, without best +32.6%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +40.6% | +34.1% | +46.0% / -2.1% / +77.1% |
| sell at fs10 if < 1.0 | +41.5% | +35.1% | +46.0% / -1.8% / +79.6% |
| sell at t30 if < 0.9 | +38.9% | +32.4% | +46.5% / -3.4% / +72.4% |
| sell at t30 if < 1.0 | +32.4% | +25.7% | +47.5% / -2.9% / +50.2% |
| sell at t60 if < 0.9 | +34.7% | +28.1% | +34.5% / -2.7% / +72.3% |
| sell at t60 if < 1.0 | +33.6% | +27.0% | +34.6% / -5.4% / +71.4% |
