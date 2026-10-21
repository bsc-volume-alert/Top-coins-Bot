# Revision search — S3
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
307 trades, -9.8% a trade, without best -12.5%, 162.1 trades a day, -1.756 SOL a day at 0.1. Thirds: -9.5% / -7.1% / -13.0%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tsl40 | 307 | -7.2% | -8.7% | -1.3% / -13.0% / -7.5% |
| x_flow4ff | 307 | -8.2% | -9.2% | -5.7% / -7.5% / -11.5% |
| x_flow4 | 307 | -8.3% | -9.2% | -5.2% / -7.8% / -11.9% |
| x_t15s40 | 307 | -9.8% | -9.9% | -9.3% / -4.1% / -15.9% |
| x_h5f14 | 307 | -9.0% | -10.6% | -4.4% / -6.2% / -16.4% |
| x_h3 | 307 | -8.9% | -11.6% | -8.5% / -6.8% / -11.3% |
| x_h15 | 293 | -9.2% | -11.9% | -6.3% / -3.2% / -19.1% |
| x_h2t40 | 307 | -11.2% | -12.1% | -5.8% / -14.2% / -13.5% |
| x_h5 (current) | 307 | -9.8% | -12.5% | -9.5% / -7.1% / -13.0% |
| x_t2s40 | 307 | -12.6% | -13.0% | -7.8% / -12.4% / -17.7% |
| x_time | 307 | -18.1% | -20.8% | -11.5% / -16.8% / -26.0% |
| x_split | 307 | -19.8% | -20.8% | -17.5% / -21.7% / -20.1% |

## Search
637 filters × 12 exits (+ 31 pairs). 30 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +25.8%, +11.8%, +9.0%, +18.7%, +5.7%, +18.0%, +7.7%, +9.2%, +16.7%, +48.7%, +36.9%, +13.8%, +41.9%, +12.5%, +27.6%, +29.0%, +24.4%, +16.8%, +4.5%, +17.8%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_launch1h >= 1544 AND heat_sol1h_pct < -0.17 | x_flow4ff | 37 | +32.9% | +25.9% | 35% | 270 at -13.9% | +25.5% / +31.5% / +51.5% | 8 at +51.5% | +0.623 | 5 |
| heat_launch1h >= 1544 AND heat_sol1h_pct < -0.17 | x_flow4 | 37 | +32.9% | +25.9% | 35% | 270 at -13.9% | +27.7% / +29.5% / +49.3% | 8 at +49.3% | +0.623 | 5 |
| heat_pools1h >= 90 AND heat_sol1h_pct < -0.17 | x_flow4ff | 37 | +31.2% | +24.2% | 32% | 270 at -13.6% | +25.5% / +21.8% / +68.6% | 6 at +68.6% | +0.590 | 7 |
| heat_pools1h >= 90 AND heat_sol1h_pct < -0.17 | x_flow4 | 37 | +30.8% | +23.8% | 32% | 270 at -13.6% | +27.7% / +19.0% / +65.6% | 6 at +65.6% | +0.582 | 7 |
| heat_grad1h >= 139 AND cc_n24h >= 29 | x_flow4ff | 31 | +23.4% | +14.7% | 23% | 276 at -11.8% | +26.9% / +25.7% / +4.5% | 4 at +4.5% | +0.366 | 12 |
| heat_grad1h >= 139 AND cc_n24h >= 29 | x_flow4 | 31 | +23.3% | +14.6% | 23% | 276 at -11.8% | +26.9% / +25.7% / +3.6% | 4 at +3.6% | +0.364 | 12 |
| cc_n24h >= 29 AND heat_sol1h_pct < -0.17 | x_flow4 | 41 | +13.1% | +6.3% | 27% | 266 at -11.6% | +12.1% / +24.5% / +3.6% | 4 at +3.6% | +0.262 | 18 |
| heat_sol1h_pct < -0.17 AND cc_n24h >= 29 | x_flow4ff | 41 | +12.7% | +6.0% | 27% | 266 at -11.5% | +10.8% / +28.2% / +4.5% | 4 at +4.5% | +0.254 | 18 |
| cc_last_min >= 27 | x_flow4 | 48 | +9.5% | +3.7% | 27% | 259 at -11.6% | -0.3% / +22.3% / +7.6% | 15 at +3.5% | +0.216 | 20 |
| cc_last_min >= 27 | x_flow4ff | 48 | +9.3% | +3.4% | 27% | 259 at -11.5% | -0.3% / +21.5% / +7.6% | 15 at +3.5% | +0.210 | 20 |
| TRAIT socials present | x_tsl40 | 95 | +6.8% | +2.0% | 28% | 212 at -13.5% | +51.1% / -7.4% / -2.2% | 48 at -1.4% | +0.291 | 20 |
| TRAIT socials present | x_t15s40 | 95 | +2.0% | +1.5% | 49% | 212 at -15.0% | +17.1% / +19.3% / -15.7% | 48 at -14.6% | +0.048 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_launch1h >= 1544 AND heat_sol1h_pct < -0.17 | x_flow4ff | 37 | +32.9% | +25.9% | 35% | 270 at -13.9% | +25.5% / +31.5% / +51.5% | 8 at +51.5% | +0.623 | 5 |
| heat_launch1h >= 1544 AND heat_sol1h_pct < -0.17 | x_flow4 | 37 | +32.9% | +25.9% | 35% | 270 at -13.9% | +27.7% / +29.5% / +49.3% | 8 at +49.3% | +0.623 | 5 |
| heat_pools1h >= 90 AND heat_sol1h_pct < -0.17 | x_flow4ff | 37 | +31.2% | +24.2% | 32% | 270 at -13.6% | +25.5% / +21.8% / +68.6% | 6 at +68.6% | +0.590 | 7 |
| heat_pools1h >= 90 AND heat_sol1h_pct < -0.17 | x_flow4 | 37 | +30.8% | +23.8% | 32% | 270 at -13.6% | +27.7% / +19.0% / +65.6% | 6 at +65.6% | +0.582 | 7 |
| heat_grad1h >= 139 | x_h3 | 79 | +11.7% | +1.2% | 29% | 228 at -16.0% | +10.8% / +10.8% / +13.4% | 27 at +13.4% | +0.447 | 20 |

## Proposal
**heat_launch1h >= 1544 AND heat_sol1h_pct < -0.17**, exit **x_flow4ff** — 37 trades at +32.9% (without best +25.9%), won 35%, thirds +25.5% / +31.5% / +51.5%, last 24 h 8 at +51.5%, 19.5 trades a day, +0.623 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 5/20)**. Drops 270 trades at -13.9%.

### Early-exit overlay on the proposal (now: +32.9%, without best +25.9%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +32.7% | +25.7% | +25.6% / +29.7% / +52.7% |
| sell at fs10 if < 1.0 | +34.3% | +27.4% | +27.1% / +32.9% / +52.7% |
| sell at t30 if < 0.9 | +24.3% | +17.1% | +8.7% / +28.7% / +53.5% |
| sell at t30 if < 1.0 | +24.4% | +17.2% | +8.7% / +29.1% / +53.5% |
| sell at t60 if < 0.9 | +1.6% | -6.2% | -10.8% / +27.4% / -5.8% |
| sell at t60 if < 1.0 | +2.7% | -5.1% | -10.8% / +30.8% / -5.7% |
