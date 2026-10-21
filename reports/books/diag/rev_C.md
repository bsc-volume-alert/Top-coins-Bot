# Revision search — C
_Data to 21 Oct 10:35 UK; ; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
103 trades, -11.9% a trade, without best -12.8%, 39.9 trades a day, -0.516 SOL a day at 0.1. Thirds: -15.3% / -13.3% / -7.1%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 103 | -10.0% | -10.5% | -13.5% / -10.5% / -5.8% |
| x_flow4 (current) | 103 | -11.9% | -12.8% | -15.3% / -13.3% / -7.1% |
| x_h3 | 103 | -12.7% | -13.8% | -16.1% / -11.3% / -10.5% |
| x_h5f14 | 103 | -12.9% | -13.8% | -15.1% / -11.8% / -11.8% |
| x_h5 | 103 | -13.8% | -14.7% | -16.3% / -12.3% / -12.8% |
| x_tsl40 | 103 | -14.7% | -16.4% | -23.7% / -17.4% / -2.8% |
| x_flow4ff | 103 | -15.8% | -16.7% | -21.2% / -16.3% / -9.8% |
| x_h15 | 102 | -15.7% | -16.8% | -21.1% / -15.7% / -10.0% |
| x_split | 103 | -15.5% | -17.2% | -23.0% / -17.8% / -5.4% |
| x_t2s40 | 103 | -16.2% | -17.2% | -24.5% / -20.3% / -3.4% |
| x_h2t40 | 103 | -15.5% | -18.3% | -23.6% / -17.9% / -4.6% |
| x_time | 102 | -21.9% | -24.8% | -28.9% / -27.1% / -9.1% |

## Search
1172 filters × 12 exits (+ 90 pairs). 64 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +6.6%, +21.1%, +12.5%, +6.8%, +11.8%, +5.9%, +22.9%, +11.2%, +8.8%, +15.6%, +15.4%, +17.4%, +31.1%, +16.3%, +27.6%, +11.2%, +13.9%, +18.9%, +6.5%, +10.4%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_trig1h < 29.25 AND heat_win2h_dead < 8 | x_t2s40 | 14 | +22.2% | +17.2% | 57% | 89 at -22.2% | +8.7% / -11.1% / +39.8% | 3 at +40.5% | +0.115 | 6 |
| heat_win2h_dead < 8 AND heat_trig1h < 34.55 | x_t2s40 | 15 | +21.4% | +16.7% | 60% | 88 at -22.6% | +8.7% / -11.1% / +36.5% | 4 at +32.8% | +0.118 | 6 |
| heat_trig1h < 29.25 AND heat_win2h_dead < 8 | x_h2t40 | 14 | +20.7% | +13.0% | 57% | 89 at -21.1% | -3.3% / -11.1% / +41.7% | 3 at +25.7% | +0.107 | 10 |
| heat_win2h_dead < 8 AND heat_trig1h < 34.55 | x_h2t40 | 15 | +20.0% | +12.8% | 60% | 88 at -21.5% | -3.3% / -11.1% / +38.1% | 4 at +21.8% | +0.110 | 10 |
| heat_trig1h < 29.25 AND heat_win2h_dead < 8 | x_tsl40 | 14 | +21.7% | +11.5% | 57% | 89 at -20.5% | -11.8% / -5.4% / +44.4% | 3 at +19.6% | +0.112 | 12 |
| heat_win2h_hit < 8 | x_t2s40 | 20 | +13.6% | +9.7% | 55% | 83 at -23.3% | -16.2% / +2.1% / +25.8% | 7 at +16.1% | +0.097 | 15 |
| heat_win2h_hit < 8 | x_h2t40 | 20 | +19.9% | +6.6% | 55% | 83 at -24.0% | -16.2% / +30.9% / +24.3% | 7 at +5.1% | +0.146 | 18 |
| heat_launch1h < 744.5 | x_t2s40 | 19 | +10.1% | +5.8% | 37% | 84 at -22.1% | +2.3% / +4.5% / +17.2% | 7 at +12.9% | +0.067 | 20 |
| pre_min4_nb >= 52.5 AND pre_m3_nb >= 203 | x_h5f14 | 16 | +7.3% | +5.8% | 62% | 87 at -16.7% | +11.8% / -0.1% / +16.3% | 4 at +13.2% | +0.039 | 20 |
| heat_trig1h < 34.55 | x_t15s40 | 26 | +6.1% | +4.8% | 58% | 77 at -15.4% | -0.7% / +0.9% / +9.8% | 11 at +1.8% | +0.051 | 20 |
| pre_min4_ns >= 58.8 | x_h5f14 | 12 | +6.6% | +4.4% | 58% | 91 at -15.5% | +8.3% / +1.1% / +15.8% | 3 at +15.8% | +0.026 | 20 |
| pre_m5_ns >= 211 AND pre_m3_nb >= 203 | x_h5f14 | 16 | +4.9% | +3.2% | 56% | 87 at -16.2% | +6.8% / -4.4% / +16.3% | 4 at +13.2% | +0.024 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| heat_win2h_hit < 8 | x_h2t40 | 20 | +19.9% | +6.6% | 55% | 83 at -24.0% | -16.2% / +30.9% / +24.3% | 7 at +5.1% | +0.146 | 18 |
| heat_win2h_dead < 8 AND heat_trig1h < 34.55 | x_t2s40 | 15 | +21.4% | +16.7% | 60% | 88 at -22.6% | +8.7% / -11.1% / +36.5% | 4 at +32.8% | +0.118 | 6 |
| heat_trig1h < 29.25 AND heat_win2h_dead < 8 | x_t2s40 | 14 | +22.2% | +17.2% | 57% | 89 at -22.2% | +8.7% / -11.1% / +39.8% | 3 at +40.5% | +0.115 | 6 |
| heat_launch1h < 744.5 | x_h2t40 | 19 | +16.4% | +2.2% | 37% | 84 at -22.7% | -6.8% / +30.8% / +17.1% | 7 at +8.0% | +0.113 | 20 |
| heat_launch1h < 744.5 AND heat_launch1h < 1043 | x_h2t40 | 19 | +16.4% | +2.2% | 37% | 84 at -22.7% | -6.8% / +30.8% / +17.1% | 7 at +8.0% | +0.113 | 20 |

## Proposal
**heat_win2h_hit < 8**, exit **x_h2t40** — 20 trades at +19.9% (without best +6.6%), won 55%, thirds -16.2% / +30.9% / +24.3%, last 24 h 7 at +5.1%, 7.7 trades a day, +0.146 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 18/20)**. Drops 83 trades at -24.0%.

### Early-exit overlay on the proposal (now: +19.9%, without best +6.6%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +21.1% | +7.9% | -16.2% / +30.9% / +26.4% |
| sell at fs10 if < 1.0 | +20.3% | +7.0% | -1.4% / +39.4% / +17.8% |
| sell at t30 if < 0.9 | +20.0% | +6.7% | -16.2% / +30.9% / +24.6% |
| sell at t30 if < 1.0 | +7.4% | +1.4% | -1.5% / -37.3% / +28.3% |
| sell at t60 if < 0.9 | +20.0% | +6.7% | -16.2% / +30.9% / +24.5% |
| sell at t60 if < 1.0 | +5.4% | -8.7% | -16.2% / +19.6% / +4.9% |
