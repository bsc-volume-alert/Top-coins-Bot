# Revision search — F6
_Data to 21 Oct 10:35 UK; ; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
69 trades, -3.1% a trade, without best -7.2%, 45.2 trades a day, -0.186 SOL a day at 0.1. Thirds: +4.0% / +0.2% / -13.5%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 69 | -5.4% | -6.0% | -3.5% / +0.6% / -13.3% |
| x_flow4ff | 69 | -4.4% | -7.1% | -10.1% / +5.4% / -8.6% |
| x_flow4 (current) | 69 | -3.1% | -7.2% | +4.0% / +0.2% / -13.5% |
| x_h3 | 69 | -6.1% | -8.4% | -9.5% / +4.4% / -13.4% |
| x_t2s40 | 69 | -10.3% | -11.7% | -11.4% / -3.6% / -16.0% |
| x_h5f14 | 69 | -10.2% | -12.2% | -8.4% / -5.4% / -16.9% |
| x_h5 | 69 | -11.6% | -13.6% | -11.5% / -6.4% / -16.9% |
| x_h15 | 68 | -13.2% | -16.1% | -8.4% / -9.4% / -21.5% |
| x_split | 69 | -12.2% | -16.5% | -3.2% / -8.7% / -24.8% |
| x_tsl40 | 69 | -11.7% | -17.3% | -0.8% / -11.0% / -23.3% |
| x_h2t40 | 69 | -14.2% | -17.7% | -10.0% / -10.8% / -21.6% |
| x_time | 68 | -38.1% | -42.7% | -22.8% / -49.5% / -42.2% |

## Search
1061 filters × 12 exits (+ 181 pairs). 298 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +36.1%, +29.7%, +31.8%, +31.4%, +19.3%, +23.4%, +39.6%, +26.7%, +26.6%, +22.5%, +31.2%, +15.4%, +56.5%, +18.4%, +22.8%, +35.6%, +29.9%, +28.8%, +31.2%, +34.1%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| dev_hold_entry >= 3.725e-16 AND heat_win2h_hit < 10 | x_flow4 | 12 | +53.3% | +33.0% | 83% | 57 at -15.0% | +106.6% / +21.9% / +46.5% | 9 at +35.6% | +0.412 | 5 |
| dev_hold_entry >= 1.021 | x_t2s40 | 13 | +28.5% | +23.6% | 69% | 56 at -19.3% | +15.2% / +15.1% / +58.5% | 10 at +32.5% | +0.234 | 14 |
| h0_dev >= 1.02 | x_t2s40 | 13 | +28.5% | +23.6% | 69% | 56 at -19.3% | +15.2% / +15.1% / +58.5% | 10 at +32.5% | +0.234 | 14 |
| dev_hold_entry >= 1.021 | x_t15s40 | 13 | +21.5% | +20.0% | 85% | 56 at -11.6% | -0.6% / +24.5% / +33.7% | 10 at +28.2% | +0.175 | 17 |
| h0_dev >= 1.02 | x_t15s40 | 13 | +21.5% | +20.0% | 85% | 56 at -11.6% | -0.6% / +24.5% / +33.7% | 10 at +28.2% | +0.175 | 17 |
| entry_mc >= 6.27e+04 AND pre_m1_s < 2553 | x_flow4 | 12 | +41.4% | +20.0% | 58% | 57 at -12.5% | +59.8% / +20.8% / +33.7% | 7 at +28.2% | +0.317 | 17 |
| heat_win2h_hit < 10 AND pre_m1_s < 2553 | x_flow4 | 13 | +39.4% | +19.7% | 69% | 56 at -13.0% | +65.3% / +23.6% / +22.9% | 7 at +33.8% | +0.327 | 17 |
| heat_win2h_n < 31 AND pre_m1_s < 2553 | x_flow4 | 14 | +37.0% | +18.5% | 64% | 55 at -13.3% | +65.3% / +31.1% / +13.3% | 8 at +30.2% | +0.330 | 18 |
| pre_m5_nb < 55.8 AND pre_m1_s < 2353 | x_h2t40 | 13 | +31.4% | +14.8% | 62% | 56 at -24.7% | +93.1% / +7.9% / -1.1% | 8 at +10.8% | +0.259 | 20 |
| pre_m2_nb < 55.8 AND pre_m1_s < 2353 | x_h2t40 | 13 | +31.4% | +14.8% | 62% | 56 at -24.7% | +93.1% / +7.9% / -1.1% | 8 at +10.8% | +0.259 | 20 |
| pre_m3_nb < 55.8 AND pre_m1_s < 2353 | x_h2t40 | 13 | +31.4% | +14.8% | 62% | 56 at -24.7% | +93.1% / +7.9% / -1.1% | 8 at +10.8% | +0.259 | 20 |
| heat_trig1h < 44 AND pre_m3_s < 3005 | x_h3 | 17 | +22.2% | +14.4% | 76% | 52 at -15.4% | +28.3% / +37.0% / +0.8% | 12 at +23.0% | +0.236 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| dev_hold_entry >= 3.725e-16 AND heat_win2h_hit < 10 | x_flow4 | 12 | +53.3% | +33.0% | 83% | 57 at -15.0% | +106.6% / +21.9% / +46.5% | 9 at +35.6% | +0.412 | 5 |
| dev_hold_entry >= 3.725e-16 | x_flow4 | 19 | +34.0% | +20.5% | 74% | 50 at -17.2% | +66.8% / +11.6% / +45.7% | 15 at +25.2% | +0.411 | 17 |
| heat_win2h_n < 31 | x_flow4 | 31 | +19.7% | +11.2% | 61% | 38 at -21.7% | +42.6% / +15.3% / +8.5% | 22 at +14.6% | +0.380 | 20 |
| heat_win2h_hit < 10 | x_flow4 | 29 | +18.9% | +9.7% | 62% | 40 at -19.1% | +41.5% / +11.1% / +6.9% | 19 at +11.9% | +0.340 | 20 |
| heat_win2h_n < 31 AND heat_win2h_hit < 10 | x_flow4 | 25 | +21.6% | +11.0% | 60% | 44 at -17.2% | +42.6% / +11.0% / +12.4% | 16 at +15.7% | +0.338 | 20 |

## Proposal
**dev_hold_entry >= 3.725e-16 AND heat_win2h_hit < 10**, exit **x_flow4** — 12 trades at +53.3% (without best +33.0%), won 83%, thirds +106.6% / +21.9% / +46.5%, last 24 h 9 at +35.6%, 7.9 trades a day, +0.412 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 5/20)**. Drops 57 trades at -15.0%.

### Early-exit overlay on the proposal (now: +53.3%, without best +33.0%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +53.3% | +33.0% | +106.6% / +21.9% / +46.5% |
| sell at fs10 if < 1.0 | +32.7% | +10.6% | +106.6% / +14.4% / +3.2% |
| sell at t30 if < 0.9 | +33.1% | +19.9% | +7.0% / +28.6% / +52.2% |
| sell at t30 if < 1.0 | +31.5% | +18.1% | +0.6% / +28.6% / +52.2% |
| sell at t60 if < 0.9 | +31.2% | +17.9% | +5.5% / +27.5% / +49.7% |
| sell at t60 if < 1.0 | +29.3% | +15.7% | -2.4% / +27.5% / +49.7% |
