# Revision search — S3b
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
200 trades, -7.4% a trade, without best -11.4%, 130.8 trades a day, -1.096 SOL a day at 0.1. Thirds: -0.3% / -17.2% / -4.6%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 200 | -10.2% | -10.5% | -3.8% / -13.2% / -13.7% |
| x_h3 | 200 | -6.4% | -10.6% | +0.2% / -17.0% / -2.3% |
| x_flow4ff | 200 | -9.6% | -11.0% | -7.2% / -17.6% / -3.7% |
| x_h5 (current) | 200 | -7.4% | -11.4% | -0.3% / -17.2% / -4.6% |
| x_flow4 | 200 | -10.1% | -11.5% | -7.6% / -17.8% / -4.7% |
| x_tsl40 | 200 | -10.6% | -12.9% | -11.5% / -22.4% / +2.3% |
| x_h5f14 | 200 | -11.3% | -13.8% | -10.1% / -12.5% / -11.5% |
| x_h15 | 187 | -10.1% | -14.5% | -1.4% / -13.4% / -16.3% |
| x_h2t40 | 200 | -14.1% | -15.5% | -15.2% / -23.2% / -3.6% |
| x_t2s40 | 200 | -15.1% | -15.6% | -12.3% / -21.7% / -11.2% |
| x_split | 200 | -20.3% | -21.9% | -22.5% / -27.5% / -10.8% |
| x_time | 200 | -21.6% | -25.7% | -20.0% / -27.2% / -17.6% |

## Search
666 filters × 12 exits (+ 113 pairs). 123 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +79.8%, +36.9%, +3.1%, +16.8%, +29.1%, +20.0%, +30.3%, +13.2%, +19.8%, +52.1%, +20.1%, +50.1%, +4.1%, +32.7%, +29.3%, +30.6%, +43.5%, +45.5%, +25.3%, +30.5%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_launch1h >= 1266 AND heat_sol1h_pct < -0.275 | x_h3 | 21 | +78.6% | +40.8% | 29% | 179 at -16.3% | +47.0% / +81.6% / +152.0% | 6 at +118.2% | +1.066 | 5 |
| TRAIT copy of a coin that reached $1M+ AND heat_sol1h_pct < -0.275 | x_h3 | 22 | +76.2% | +40.1% | 27% | 178 at -16.6% | +183.7% / +53.4% / +51.7% | 13 at +44.0% | +1.082 | 5 |
| cc_best_mc24h >= 1.333e+06 AND heat_pools1h >= 97 | x_h3 | 38 | +60.2% | +39.3% | 32% | 162 at -22.0% | +45.6% / +76.9% / +74.2% | 15 at +74.2% | +1.470 | 5 |
| sn_signal_n >= 1.333e+06 AND heat_pools1h >= 97 | x_h3 | 38 | +60.2% | +39.3% | 32% | 162 at -22.0% | +45.6% / +76.9% / +74.2% | 15 at +74.2% | +1.470 | 5 |
| heat_launch1h >= 1266 AND heat_sol1h_pct < -0.275 | x_h5 | 21 | +74.0% | +37.8% | 29% | 179 at -16.9% | +46.5% / +81.6% / +133.9% | 6 at +103.1% | +1.002 | 5 |
| TRAIT copy of a coin that reached $1M+ AND heat_sol1h_pct < -0.275 | x_h5 | 22 | +72.1% | +37.6% | 27% | 178 at -17.2% | +183.7% / +53.4% / +44.2% | 13 at +37.1% | +1.023 | 5 |
| cc_best_mc24h >= 1.333e+06 AND heat_pools1h >= 97 | x_h5 | 38 | +55.7% | +35.7% | 32% | 162 at -22.2% | +44.5% / +76.9% / +64.2% | 15 at +64.2% | +1.359 | 6 |
| sn_signal_n >= 1.333e+06 AND heat_pools1h >= 97 | x_h5 | 38 | +55.7% | +35.7% | 32% | 162 at -22.2% | +44.5% / +76.9% / +64.2% | 15 at +64.2% | +1.359 | 6 |
| heat_pools1h >= 97 AND sn_signal_n >= 7.849e+05 | x_h3 | 46 | +45.7% | +28.2% | 26% | 154 at -21.9% | +28.2% / +47.5% / +74.2% | 15 at +74.2% | +1.345 | 12 |
| heat_pools1h >= 97 AND sn_signal_n >= 7.849e+05 | x_h5 | 46 | +42.0% | +25.2% | 26% | 154 at -22.1% | +27.4% / +47.5% / +64.2% | 15 at +64.2% | +1.234 | 13 |
| cr_best_mc >= 8.781e+04 AND bundle_pct < 1.167 | x_flow4 | 27 | +16.5% | +6.2% | 30% | 173 at -14.2% | +54.8% / +2.2% / +24.0% | 20 at +2.8% | +0.273 | 18 |
| cr_best_mc >= 8.781e+04 AND bundle_pct < 1.167 | x_flow4ff | 27 | +16.5% | +6.2% | 30% | 173 at -13.6% | +54.8% / +2.2% / +24.0% | 20 at +2.8% | +0.273 | 18 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| cc_best_mc24h >= 1.333e+06 AND heat_pools1h >= 97 | x_h3 | 38 | +60.2% | +39.3% | 32% | 162 at -22.0% | +45.6% / +76.9% / +74.2% | 15 at +74.2% | +1.470 | 5 |
| sn_signal_n >= 1.333e+06 AND heat_pools1h >= 97 | x_h3 | 38 | +60.2% | +39.3% | 32% | 162 at -22.0% | +45.6% / +76.9% / +74.2% | 15 at +74.2% | +1.470 | 5 |
| cc_best_mc24h >= 1.333e+06 AND heat_launch1h >= 1266 | x_h3 | 44 | +49.5% | +31.2% | 30% | 156 at -22.1% | +39.1% / +43.6% / +64.4% | 19 at +55.2% | +1.395 | 7 |
| sn_signal_n >= 1.333e+06 AND heat_launch1h >= 1266 | x_h3 | 44 | +49.5% | +31.2% | 30% | 156 at -22.1% | +39.1% / +43.6% / +64.4% | 19 at +55.2% | +1.395 | 7 |
| TRAIT copy of a coin that reached $1M+ AND heat_pools1h >= 97 | x_h3 | 43 | +50.0% | +31.3% | 28% | 157 at -21.8% | +30.3% / +76.9% / +74.2% | 15 at +74.2% | +1.377 | 7 |

## Proposal
**cc_best_mc24h >= 1.333e+06 AND heat_pools1h >= 97**, exit **x_h3** — 38 trades at +60.2% (without best +39.3%), won 32%, thirds +45.6% / +76.9% / +74.2%, last 24 h 15 at +74.2%, 24.9 trades a day, +1.470 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 5/20)**. Drops 162 trades at -22.0%.

### Early-exit overlay on the proposal (now: +60.2%, without best +39.3%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +58.4% | +37.4% | +42.2% / +67.8% / +76.3% |
| sell at fs10 if < 1.0 | +60.5% | +39.6% | +45.1% / +67.8% / +78.1% |
| sell at t30 if < 0.9 | +50.7% | +29.5% | +33.4% / +52.8% / +72.1% |
| sell at t30 if < 1.0 | +50.7% | +29.6% | +33.4% / +52.8% / +72.2% |
| sell at t60 if < 0.9 | +49.4% | +28.2% | +31.1% / +50.2% / +72.4% |
| sell at t60 if < 1.0 | +50.4% | +29.2% | +33.1% / +50.2% / +72.4% |
