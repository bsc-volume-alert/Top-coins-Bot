# Revision search — DC
_Data to 21 Oct 10:35 UK; D, copycat of a $72K+ coin; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
48 trades, +12.2% a trade, without best +6.6%, 25.0 trades a day, +0.281 SOL a day at 0.1. Thirds: +17.7% / +13.1% / +5.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 48 | +9.0% | +8.4% | +11.1% / +5.3% / +10.7% |
| x_flow4 (current) | 48 | +12.2% | +6.6% | +17.7% / +13.1% / +5.9% |
| x_split | 48 | +7.5% | +1.7% | +30.2% / -12.7% / +4.9% |
| x_t2s40 | 48 | +3.5% | +1.7% | +13.6% / -12.0% / +8.7% |
| x_flow4ff | 48 | +3.6% | +1.2% | +17.4% / -10.0% / +3.5% |
| x_h5f14 | 48 | +0.1% | -1.3% | +4.2% / -1.8% / -2.1% |
| x_h15 | 48 | +1.4% | -3.2% | +0.8% / +5.5% / -2.0% |
| x_h2t40 | 48 | -1.5% | -4.6% | +9.0% / -17.1% / +3.7% |
| x_h5 | 48 | -3.5% | -5.0% | +0.1% / -6.1% / -4.5% |
| x_tsl40 | 48 | -1.3% | -5.7% | +11.5% / -12.7% / -2.6% |
| x_h3 | 48 | -3.9% | -6.0% | +1.9% / -9.0% / -4.5% |
| x_time | 47 | -33.3% | -40.3% | -40.3% / -30.6% / -28.7% |

## Search
1144 filters × 12 exits (+ 252 pairs). 373 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +52.4%, +53.7%, +49.3%, +41.9%, +39.9%, +53.8%, +36.8%, +38.8%, +47.3%, +39.6%, +36.6%, +56.7%, +39.6%, +35.0%, +43.4%, +47.3%, +55.4%, +43.6%, +39.6%, +48.9%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| TRAIT biggest buyer 3-5 SOL AND heat_win2h_n < 28 | x_flow4 | 13 | +64.0% | +46.3% | 85% | 35 at -7.0% | +67.9% / +80.5% / +39.6% | 2 at +45.3% | +0.428 | 9 |
| gw_big_followers † >= 2.5 AND gw_big_cost † >= 2.691e+04 | x_split | 14 | +53.5% | +36.3% | 64% | 34 at -11.5% | +145.6% / +13.2% / +21.8% | 2 at -52.5% | +0.383 | 19 |
| bundle_wallets >= 5.55 | x_t2s40 | 17 | +34.4% | +31.1% | 65% | 31 at -13.5% | +44.6% / +40.7% / +17.5% | 4 at +17.2% | +0.296 | 20 |
| gw_big_followers † >= 8.5 | x_t2s40 | 13 | +33.6% | +29.2% | 62% | 35 at -7.7% | +59.3% / +17.9% / +17.3% | 1 at -53.7% | +0.221 | 20 |
| bundle_pct >= 32.79 | x_t15s40 | 17 | +28.9% | +28.2% | 88% | 31 at -1.9% | +39.6% / +21.4% / +39.6% | 4 at +39.6% | +0.247 | 20 |
| cc_n24h < 7.45 | x_t2s40 | 17 | +31.3% | +27.8% | 65% | 31 at -11.8% | +53.6% / +19.6% / +18.1% | 3 at -4.9% | +0.268 | 20 |
| heat_win2h_hit < 11 AND heat_grad1h < 119 | x_flow4 | 23 | +38.4% | +27.6% | 83% | 25 at -11.9% | +36.9% / +51.5% / +28.6% | 5 at +18.7% | +0.449 | 20 |
| heat_trig1h < 34 | x_t15s40 | 16 | +28.3% | +27.6% | 88% | 32 at -0.6% | +21.5% / +39.6% / +26.7% | 5 at +21.5% | +0.228 | 20 |
| entry_mc >= 5.469e+04 | x_t2s40 | 12 | +30.8% | +25.7% | 67% | 36 at -5.7% | +20.2% / +31.5% / +40.1% | 3 at +40.1% | +0.187 | 20 |
| pool_sol >= 77.19 | x_t2s40 | 12 | +30.8% | +25.7% | 67% | 36 at -5.7% | +20.2% / +31.5% / +40.1% | 3 at +40.1% | +0.187 | 20 |
| heat_trig1h < 34 | x_flow4 | 16 | +28.4% | +24.1% | 81% | 32 at +4.1% | +29.8% / +31.4% / +25.7% | 5 at +22.4% | +0.229 | 20 |
| cr_last_min < 69.25 | x_flow4ff | 18 | +29.1% | +23.8% | 72% | 30 at -11.7% | +45.1% / -4.1% / +25.0% | 5 at +17.5% | +0.264 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_win2h_hit < 12 | x_flow4 | 38 | +24.5% | +17.7% | 71% | 10 at -34.5% | +27.6% / +22.1% / +23.4% | 8 at +16.3% | +0.466 | 20 |
| heat_win2h_hit < 11 AND heat_grad1h < 119 | x_flow4 | 23 | +38.4% | +27.6% | 83% | 25 at -11.9% | +36.9% / +51.5% / +28.6% | 5 at +18.7% | +0.449 | 20 |
| heat_win2h_hit < 11 | x_flow4 | 33 | +26.9% | +19.1% | 70% | 15 at -20.0% | +27.8% / +30.1% / +22.5% | 7 at +12.8% | +0.446 | 20 |
| TRAIT biggest buyer 3-5 SOL AND heat_win2h_hit < 11 | x_flow4 | 16 | +53.9% | +39.0% | 81% | 32 at -8.6% | +42.5% / +74.4% / +39.5% | 1 at +50.4% | +0.442 | 16 |
| bundle_pct >= 17.83 | x_flow4 | 36 | +23.8% | +16.6% | 69% | 12 at -22.6% | +31.2% / +22.0% / +17.9% | 8 at +11.9% | +0.429 | 20 |

## Proposal
**heat_win2h_hit < 12**, exit **x_flow4** — 38 trades at +24.5% (without best +17.7%), won 71%, thirds +27.6% / +22.1% / +23.4%, last 24 h 8 at +16.3%, 19.8 trades a day, +0.466 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 20/20)**. Drops 10 trades at -34.5%.

### Early-exit overlay on the proposal (now: +24.5%, without best +17.7%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +25.4% | +18.6% | +28.5% / +23.8% / +23.4% |
| sell at fs10 if < 1.0 | +14.0% | +6.9% | +28.2% / +16.5% / -5.1% |
| sell at t30 if < 0.9 | +21.0% | +14.1% | +28.8% / +17.0% / +15.8% |
| sell at t30 if < 1.0 | +4.3% | +1.3% | +16.7% / -7.6% / +1.8% |
| sell at t60 if < 0.9 | +12.0% | +9.1% | +31.6% / -10.9% / +12.1% |
| sell at t60 if < 1.0 | +10.3% | +7.3% | +23.5% / -10.6% / +15.6% |
