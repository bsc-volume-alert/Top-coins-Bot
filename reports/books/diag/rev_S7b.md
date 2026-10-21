# Revision search — S7b
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
148 trades, -15.6% a trade, without best -18.8%, 93.7 trades a day, -1.557 SOL a day at 0.1. Thirds: -17.5% / -22.5% / -6.8%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_h5f14 | 148 | -11.1% | -14.2% | -11.1% / -20.3% / -1.8% |
| x_flow4ff | 148 | -13.3% | -14.7% | -12.4% / -18.9% / -8.7% |
| x_t15s40 | 148 | -15.4% | -15.8% | -11.9% / -18.4% / -15.9% |
| x_flow4 | 148 | -15.0% | -16.4% | -13.8% / -21.0% / -10.1% |
| x_t2s40 | 148 | -16.2% | -16.9% | -17.2% / -19.8% / -11.5% |
| x_h3 | 148 | -15.5% | -18.0% | -15.3% / -20.2% / -11.1% |
| x_split | 147 | -16.3% | -18.3% | -18.4% / -22.2% / -8.0% |
| x_h5 (current) | 148 | -15.6% | -18.8% | -17.5% / -22.5% / -6.8% |
| x_h15 | 139 | -15.9% | -18.9% | -17.9% / -22.5% / -8.4% |
| x_tsl40 | 147 | -17.4% | -19.3% | -15.3% / -18.7% / -18.3% |
| x_h2t40 | 147 | -18.1% | -19.4% | -19.8% / -20.8% / -13.7% |
| x_time | 147 | -23.8% | -26.7% | -35.8% / -23.6% / -11.6% |

## Search
794 filters × 12 exits (+ 67 pairs). 74 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +27.3%, none, +24.4%, +4.0%, +3.6%, +18.3%, +2.7%, +3.8%, +0.4%, +2.3%, +19.0%, +10.5%, +13.4%, +6.5%, +5.3%, +38.1%, +43.2%, +12.3%, none, +5.5%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| sn_buyers >= 61.9 AND sn_out_sol >= 42.05 | x_h5f14 | 16 | +48.2% | +21.5% | 56% | 132 at -18.3% | +2.6% / -6.1% / +87.6% | 13 at +58.8% | +0.478 | 4 |
| holders_entry >= 49.1 AND sn_buyers >= 61.9 | x_h5f14 | 20 | +42.5% | +21.1% | 45% | 128 at -19.5% | +56.8% / -14.3% / +63.1% | 15 at +44.6% | +0.525 | 4 |
| sn_out_sol >= 42.05 AND h0_n >= 37.25 | x_h5f14 | 18 | +44.2% | +20.4% | 56% | 130 at -18.7% | +4.7% / -6.1% / +73.3% | 15 at +52.1% | +0.493 | 4 |
| holders_entry >= 49.1 AND sn_buyers >= 61.9 | x_split | 20 | +32.0% | +18.8% | 35% | 127 at -23.9% | +41.2% / +2.5% / +42.2% | 15 at +34.9% | +0.393 | 5 |
| sn_buyers >= 61.9 AND sn_out_sol >= 42.05 | x_split | 16 | +34.9% | +18.3% | 44% | 131 at -22.5% | -15.5% / +14.8% / +60.7% | 13 at +46.6% | +0.344 | 6 |
| h0_n >= 48.95 AND sn_buyers >= 61.9 | x_split | 21 | +28.2% | +15.4% | 33% | 126 at -23.7% | +41.2% / +2.5% / +34.6% | 16 at +29.6% | +0.361 | 6 |
| h0_n >= 48.95 | x_h5f14 | 23 | +32.8% | +13.9% | 43% | 125 at -19.2% | +30.1% / -14.3% / +53.7% | 16 at +38.8% | +0.463 | 6 |
| sn_out_sol >= 42.05 AND h0_n >= 37.25 | x_split | 18 | +28.5% | +13.5% | 39% | 129 at -22.5% | -12.5% / +14.8% / +44.7% | 15 at +36.7% | +0.313 | 6 |
| sn_sol_in >= 56.2 | x_h5f14 | 23 | +30.0% | +10.9% | 52% | 125 at -18.6% | +10.0% / -16.0% / +63.4% | 19 at +34.2% | +0.422 | 8 |
| sn_out_sol >= 42.05 AND sn_buyers >= 61.9 | x_flow4ff | 16 | +22.1% | +10.7% | 50% | 132 at -17.6% | +16.4% / +1.3% / +33.2% | 13 at +23.4% | +0.214 | 8 |
| sn_out_sol >= 42.05 AND sn_buyers >= 61.9 | x_h2t40 | 16 | +18.1% | +8.6% | 44% | 131 at -22.6% | -13.5% / +21.9% / +26.9% | 13 at +25.4% | +0.173 | 9 |
| holders_entry >= 49.1 AND sn_buyers >= 61.9 | x_h3 | 20 | +24.4% | +7.6% | 45% | 128 at -21.8% | +63.7% / -16.4% / +28.7% | 15 at +18.7% | +0.296 | 9 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| holders_entry >= 49.1 AND sn_buyers >= 61.9 | x_h5f14 | 20 | +42.5% | +21.1% | 45% | 128 at -19.5% | +56.8% / -14.3% / +63.1% | 15 at +44.6% | +0.525 | 4 |
| holders_entry >= 49.1 | x_h5f14 | 22 | +36.5% | +16.9% | 45% | 126 at -19.4% | +30.1% / -14.3% / +63.1% | 15 at +44.6% | +0.495 | 6 |
| holders_entry >= 49.1 AND h0_n >= 48.95 | x_h5f14 | 22 | +36.5% | +16.9% | 45% | 126 at -19.4% | +30.1% / -14.3% / +63.1% | 15 at +44.6% | +0.495 | 6 |
| holders_entry >= 49.1 AND h0_n >= 37.25 | x_h5f14 | 22 | +36.5% | +16.9% | 45% | 126 at -19.4% | +30.1% / -14.3% / +63.1% | 15 at +44.6% | +0.495 | 6 |
| holders_entry >= 49.1 AND holders_entry >= 37.5 | x_h5f14 | 22 | +36.5% | +16.9% | 45% | 126 at -19.4% | +30.1% / -14.3% / +63.1% | 15 at +44.6% | +0.495 | 6 |

## Proposal
**holders_entry >= 49.1 AND sn_buyers >= 61.9**, exit **x_h5f14** — 20 trades at +42.5% (without best +21.1%), won 45%, thirds +56.8% / -14.3% / +63.1%, last 24 h 15 at +44.6%, 12.7 trades a day, +0.525 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 4/20)**. Drops 128 trades at -19.5%.

### Early-exit overlay on the proposal (now: +42.5%, without best +21.1%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +38.8% | +17.2% | +56.8% / -14.3% / +56.4% |
| sell at fs10 if < 1.0 | +45.4% | +24.1% | +64.9% / -8.5% / +62.7% |
| sell at t30 if < 0.9 | +43.4% | +22.1% | +42.2% / -8.9% / +67.6% |
| sell at t30 if < 1.0 | +45.2% | +23.9% | +42.2% / -1.8% / +67.6% |
| sell at t60 if < 0.9 | +36.7% | +15.0% | +41.9% / -13.8% / +57.8% |
| sell at t60 if < 1.0 | +38.6% | +17.0% | +41.9% / -13.8% / +61.2% |
