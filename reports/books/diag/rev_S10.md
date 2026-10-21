# Revision search — S10
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
23 trades, -19.5% a trade, without best -20.9%, 30.0 trades a day, -0.617 SOL a day at 0.1. Thirds: -14.5% / -17.1% / -28.0%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_h5f14 | 23 | -10.4% | -12.3% | -2.0% / -9.9% / -20.6% |
| x_flow4 | 23 | -2.2% | -15.2% | -3.5% / -21.6% / +21.3% |
| x_h3l | 23 | +38.1% | -15.3% | -3.6% / -5.4% / +135.5% |
| x_t15s40 | 23 | -13.4% | -15.9% | +7.6% / -21.1% / -28.8% |
| x_flow4ff | 23 | -4.2% | -17.3% | +0.7% / -31.3% / +21.3% |
| x_h3 | 23 | -18.2% | -19.5% | -11.5% / -18.4% / -25.8% |
| x_h5 (current) | 23 | -19.5% | -20.9% | -14.5% / -17.1% / -28.0% |
| x_tsl40 | 23 | -18.7% | -21.1% | -11.9% / -22.7% / -22.0% |
| x_split | 23 | -19.7% | -22.4% | -11.6% / -20.5% / -27.9% |
| x_h15 | 23 | -19.1% | -22.4% | -1.5% / -17.8% / -40.7% |
| x_h2t40 | 23 | -28.3% | -32.6% | -29.9% / -24.3% / -31.2% |
| x_t2s40 | 23 | -27.4% | -32.8% | -26.3% / -24.7% / -31.8% |
| x_time | 23 | +10.0% | -51.0% | -63.0% / -16.4% / +123.5% |

## Search
507 filters × 13 exits (+ 18 pairs). 25 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: none, +1.2%, none, none, none, +5.9%, none, +12.1%, none, +9.1%, none, +7.8%, +6.9%, +6.9%, +8.7%, +2.4%, none, +8.8%, +3.8%, +4.0%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_delay_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_slot_gap >= 26 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_sol_in >= 23.93 | x_t15s40 | 12 | +7.0% | +3.9% | 67% | 11 at -35.8% | +11.3% / +1.9% / +3.5% | 12 at +7.0% | +0.094 | 9 |
| sn_bundle_sol >= 23.93 | x_t15s40 | 12 | +7.0% | +3.9% | 67% | 11 at -35.8% | +11.3% / +1.9% / +3.5% | 12 at +7.0% | +0.094 | 9 |
| sn_sol_in >= 23.93 | x_flow4 | 12 | +25.7% | +2.2% | 58% | 11 at -32.7% | +9.1% / -16.4% / +101.2% | 12 at +25.7% | +0.387 | 11 |
| sn_bundle_sol >= 23.93 | x_flow4 | 12 | +25.7% | +2.2% | 58% | 11 at -32.7% | +9.1% / -16.4% / +101.2% | 12 at +25.7% | +0.387 | 11 |
| heat_launch10m >= 429 | x_h3l | 12 | +102.4% | +1.3% | 67% | 11 at -31.9% | +15.6% / +8.9% / +371.6% | 12 at +102.4% | +1.587 | 11 |
| sn_sol_in >= 23.93 | x_flow4ff | 12 | +24.4% | +0.8% | 50% | 11 at -35.3% | +10.4% / -24.4% / +101.2% | 12 at +24.4% | +0.366 | 12 |
| sn_bundle_sol >= 23.93 | x_flow4ff | 12 | +24.4% | +0.8% | 50% | 11 at -35.3% | +10.4% / -24.4% / +101.2% | 12 at +24.4% | +0.366 | 12 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| age_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_delay_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_delay_s >= 6 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |
| sn_slot_gap >= 26 | x_h3l | 13 | +97.6% | +4.6% | 62% | 10 at -39.2% | +31.5% / -4.3% / +389.5% | 13 at +97.6% | +1.639 | 8 |

## Proposal
**age_s >= 6**, exit **x_h3l** — 13 trades at +97.6% (without best +4.6%), won 62%, thirds +31.5% / -4.3% / +389.5%, last 24 h 13 at +97.6%, 17.0 trades a day, +1.639 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 8/20)**. Drops 10 trades at -39.2%.

### Early-exit overlay on the proposal (now: +97.6%, without best +4.6%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +98.2% | +5.1% | +31.5% / -4.3% / +391.8% |
| sell at fs10 if < 1.0 | +84.1% | -10.1% | -4.1% / -10.9% / +391.8% |
| sell at t30 if < 0.9 | +97.7% | +4.6% | +31.5% / -4.3% / +389.7% |
| sell at t30 if < 1.0 | +99.8% | +6.9% | +29.0% / +2.0% / +389.7% |
| sell at t60 if < 0.9 | +91.6% | -1.9% | +20.5% / -7.8% / +385.4% |
| sell at t60 if < 1.0 | +93.8% | +0.4% | +20.5% / -3.2% / +385.4% |
