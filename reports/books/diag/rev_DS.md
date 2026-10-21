# Revision search — DS
_Data to 21 Oct 10:35 UK; D + standard filters; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
79 trades, +8.8% a trade, without best +5.3%, 30.5 trades a day, +0.237 SOL a day at 0.1. Thirds: +5.2% / +19.4% / +1.9%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 79 | +9.8% | +9.4% | +8.8% / +10.9% / +9.7% |
| x_flow4 (current) | 79 | +8.8% | +5.3% | +5.2% / +19.4% / +1.9% |
| x_h5f14 | 79 | +3.6% | +2.0% | +0.7% / +8.3% / +1.9% |
| x_t2s40 | 79 | +2.2% | +1.1% | -2.5% / +7.0% / +2.3% |
| x_flow4ff | 79 | +2.5% | +0.8% | +4.7% / +7.6% / -4.9% |
| x_h15 | 79 | +4.3% | -0.9% | -2.6% / +19.9% / -4.2% |
| x_h3 | 79 | -0.1% | -1.3% | +3.1% / +1.3% / -4.7% |
| x_h5 | 79 | -0.7% | -2.4% | -4.7% / +3.4% / -0.8% |
| x_h2t40 | 79 | -2.7% | -5.0% | -8.9% / +4.8% / -3.6% |
| x_tsl40 | 79 | -3.6% | -7.1% | -10.2% / +8.5% / -9.0% |
| x_split | 79 | -5.3% | -8.9% | -17.6% / +9.0% / -6.9% |
| x_time | 77 | -29.7% | -33.9% | -35.3% / -13.2% / -41.4% |

## Search
1229 filters × 12 exits (+ 258 pairs). 586 pass the three-period test; **1 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +55.4%, +55.8%, +37.1%, +32.8%, +49.5%, +44.4%, +49.2%, +39.6%, +50.2%, +40.7%, +36.2%, +31.8%, +37.2%, +36.8%, +34.0%, +33.2%, +39.6%, +36.8%, +40.1%, +36.8%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| bundle_pct >= 42.62 AND avg_buy_sol >= 0.5759 | x_t2s40 | 13 | +55.0% | +52.4% | 77% | 66 at -8.2% | +52.5% / +31.4% / +87.0% | 4 at +87.0% | +0.271 | 2 |
| heat_win2h_dead < 9 AND heat_win2h_n < 28 | x_t15s40 | 13 | +39.6% | +39.6% | 100% | 66 at +3.9% | +39.6% / +39.6% / +39.6% | 4 at +39.6% | +0.194 | 8 |
| avg_buy_sol >= 0.6375 | x_t2s40 | 20 | +41.9% | +39.5% | 65% | 59 at -11.3% | +31.3% / +47.9% / +47.2% | 7 at +47.2% | +0.316 | 10 |
| bundle_pct >= 47.55 | x_h2t40 | 12 | +44.0% | +38.8% | 75% | 67 at -11.0% | +33.2% / +46.5% / +48.9% | 4 at +48.9% | +0.199 | 10 |
| heat_win2h_n < 28 | x_t15s40 | 19 | +33.9% | +33.5% | 89% | 60 at +2.2% | +39.6% / +39.6% / +25.9% | 7 at +24.0% | +0.241 | 17 |
| n60 < 81.5 | x_t2s40 | 20 | +34.9% | +32.2% | 60% | 59 at -8.9% | +31.3% / +33.8% / +40.6% | 6 at +40.6% | +0.262 | 19 |
| bundle_pct >= 47.55 | x_t15s40 | 12 | +31.9% | +31.2% | 92% | 67 at +5.8% | +39.6% / +21.1% / +39.6% | 4 at +39.6% | +0.143 | 20 |
| top10_entry >= 30.71 | x_t2s40 | 12 | +35.0% | +30.3% | 67% | 67 at -3.7% | +18.0% / +87.0% / +17.4% | 5 at +17.4% | +0.158 | 20 |
| avg_buy_sol >= 0.6375 | x_h2t40 | 20 | +34.1% | +30.3% | 65% | 59 at -15.1% | +27.9% / +37.9% / +37.0% | 7 at +37.0% | +0.256 | 20 |
| wal60 >= 120.3 | x_flow4 | 12 | +37.3% | +29.9% | 83% | 67 at +3.6% | +33.0% / +44.3% / +31.4% | 3 at +31.4% | +0.168 | 20 |
| top10_entry >= 30.71 | x_t15s40 | 12 | +30.5% | +29.7% | 92% | 67 at +6.1% | +17.0% / +39.6% / +35.9% | 5 at +35.9% | +0.137 | 20 |
| age_s < 169 AND bundle_pct >= 34.54 | x_flow4ff | 13 | +36.7% | +28.7% | 69% | 66 at -4.3% | +28.2% / +53.4% / +25.3% | 5 at +25.3% | +0.179 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| bundle_pct >= 42.62 AND avg_buy_sol >= 0.5759 | x_t2s40 | 13 | +55.0% | +52.4% | 77% | 66 at -8.2% | +52.5% / +31.4% / +87.0% | 4 at +87.0% | +0.271 | 2 |

## Proposal
**bundle_pct >= 42.62 AND avg_buy_sol >= 0.5759**, exit **x_t2s40** — 13 trades at +55.0% (without best +52.4%), won 77%, thirds +52.5% / +31.4% / +87.0%, last 24 h 4 at +87.0%, 5.0 trades a day, +0.271 SOL a day at 0.1 — **unlikely to be luck**. Drops 66 trades at -8.2%.

### Early-exit overlay on the proposal (now: +55.0%, without best +52.4%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +54.8% | +52.1% | +52.5% / +30.7% / +87.0% |
| sell at fs10 if < 1.0 | +38.6% | +34.6% | -10.8% / +39.4% / +87.0% |
| sell at t30 if < 0.9 | +44.0% | +40.4% | +52.5% / +23.6% / +60.9% |
| sell at t30 if < 1.0 | +39.5% | +35.6% | +52.5% / +12.1% / +60.9% |
| sell at t60 if < 0.9 | +43.0% | +39.3% | +52.5% / +0.1% / +87.0% |
| sell at t60 if < 1.0 | +38.3% | +34.3% | +52.5% / +8.5% / +61.4% |
