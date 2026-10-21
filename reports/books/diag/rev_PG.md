# Revision search — PG
_Data to 21 Oct 10:35 UK; curve costs; current exit x_t2s40; curve costs. Built by reports/books/revise.py._

## The book now
235 trades, -14.9% a trade, without best -15.4%, 358.0 trades a day, -5.707 SOL a day at 0.1. Thirds: -20.1% / -14.2% / -10.5%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_h3l | 235 | -2.5% | -5.6% | -11.9% / -5.9% / +10.2% |
| x_tsl40 | 235 | -5.0% | -7.6% | -15.1% / -6.8% / +6.9% |
| x_h5f14 | 235 | -8.2% | -9.8% | -12.3% / -11.7% / -0.4% |
| x_t2n30 | 235 | -7.7% | -10.8% | -23.8% / -9.3% / +10.2% |
| x_h15 | 235 | -9.6% | -11.5% | -15.5% / -10.5% / -2.8% |
| x_flow4 | 235 | -10.9% | -12.2% | -19.9% / -10.8% / -2.0% |
| x_h2t40 | 235 | -11.6% | -13.1% | -19.6% / -10.9% / -4.2% |
| x_flow4ff | 235 | -12.3% | -13.6% | -20.4% / -13.3% / -3.2% |
| x_t15s40 | 235 | -13.8% | -14.0% | -21.0% / -11.8% / -8.5% |
| x_h5 | 235 | -13.5% | -15.2% | -17.8% / -18.7% / -4.1% |
| x_t2s40 (current) | 235 | -14.9% | -15.4% | -20.1% / -14.2% / -10.5% |
| x_h3 | 235 | -15.0% | -16.6% | -18.8% / -17.5% / -8.8% |
| x_split | 235 | -17.9% | -19.2% | -19.8% / -22.5% / -11.5% |
| x_time | 235 | -34.7% | -36.5% | -24.4% / -43.9% / -36.0% |

## Search
247 filters × 14 exits (+ 184 pairs). 250 pass the three-period test; **27 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +15.6%, +34.5%, +20.9%, +22.6%, +4.4%, +28.3%, +31.5%, +25.9%, +34.4%, +5.4%, +15.1%, +21.6%, +35.3%, +54.3%, +48.5%, +32.8%, +18.0%, +26.7%, +29.2%, +25.6%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| age_s < 14 AND bundle_wallets >= 4 | x_tsl40 | 28 | +71.2% | +52.1% | 50% | 207 at -15.3% | +43.3% / +42.9% / +99.5% | 28 at +71.2% | +2.996 | 1 |
| bundle_pct >= 58.18 AND age_s < 21 | x_t2n30 | 31 | +72.5% | +50.8% | 61% | 204 at -19.9% | +93.0% / +21.3% / +107.0% | 31 at +72.5% | +3.375 | 1 |
| bundle_pct >= 58.18 AND bundle_wallets >= 4 | x_tsl40 | 33 | +64.8% | +48.4% | 52% | 202 at -16.4% | +51.5% / +32.6% / +94.2% | 33 at +64.8% | +3.206 | 2 |
| age_s < 14 AND h0_n >= 11.1 | x_h3l | 26 | +67.6% | +41.4% | 58% | 209 at -11.3% | +25.4% / +19.0% / +107.3% | 26 at +67.6% | +2.636 | 2 |
| age_s < 21 AND TRAIT launch bundle 2+ wallets | x_t2n30 | 37 | +59.6% | +41.2% | 57% | 198 at -20.2% | +16.2% / +26.3% / +107.0% | 37 at +59.6% | +3.301 | 2 |
| h0_t10 >= 23.7 AND bundle_pct >= 42.62 | x_t2n30 | 39 | +55.4% | +37.8% | 56% | 196 at -20.2% | +11.6% / +23.6% / +107.0% | 39 at +55.4% | +3.230 | 2 |
| top10_entry >= 23.7 AND bundle_pct >= 42.62 | x_t2n30 | 39 | +55.4% | +37.8% | 56% | 196 at -20.2% | +11.6% / +23.6% / +107.0% | 39 at +55.4% | +3.230 | 2 |
| bundle_pct >= 58.18 AND bundle_wallets >= 4 | x_h3l | 33 | +57.7% | +36.9% | 58% | 202 at -12.4% | +69.5% / +2.3% / +99.7% | 33 at +57.7% | +2.849 | 2 |
| age_s < 14 AND TRAIT launch bundle 2+ wallets | x_h15 | 28 | +47.6% | +33.7% | 71% | 207 at -17.4% | +98.6% / +5.0% / +70.1% | 28 at +47.6% | +1.986 | 5 |
| bundle_pct >= 58.18 AND bundle_wallets >= 4 | x_h2t40 | 33 | +42.7% | +33.5% | 52% | 202 at -20.5% | +49.8% / +31.3% / +50.2% | 33 at +42.7% | +2.097 | 5 |
| age_s < 14 AND TRAIT launch bundle 2+ wallets | x_h2t40 | 28 | +42.4% | +31.4% | 50% | 207 at -18.9% | +41.1% / +30.8% / +51.7% | 28 at +42.4% | +1.765 | 7 |
| h0_t10 >= 23.7 AND bundle_wallets >= 5 | x_h2t40 | 28 | +38.4% | +27.3% | 57% | 207 at -18.4% | +12.3% / +46.9% / +51.4% | 28 at +38.4% | +1.597 | 9 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| bundle_pct >= 58.18 AND age_s < 21 | x_t2n30 | 31 | +72.5% | +50.8% | 61% | 204 at -19.9% | +93.0% / +21.3% / +107.0% | 31 at +72.5% | +3.375 | 1 |
| age_s < 21 AND TRAIT launch bundle 2+ wallets | x_t2n30 | 37 | +59.6% | +41.2% | 57% | 198 at -20.2% | +16.2% / +26.3% / +107.0% | 37 at +59.6% | +3.301 | 2 |
| age_s < 21 AND bundle_pct >= 42.62 | x_t2n30 | 37 | +58.4% | +40.0% | 57% | 198 at -20.0% | +16.2% / +23.5% / +107.0% | 37 at +58.4% | +3.236 | 2 |
| h0_t10 >= 23.7 AND bundle_pct >= 42.62 | x_t2n30 | 39 | +55.4% | +37.8% | 56% | 196 at -20.2% | +11.6% / +23.6% / +107.0% | 39 at +55.4% | +3.230 | 2 |
| top10_entry >= 23.7 AND bundle_pct >= 42.62 | x_t2n30 | 39 | +55.4% | +37.8% | 56% | 196 at -20.2% | +11.6% / +23.6% / +107.0% | 39 at +55.4% | +3.230 | 2 |

## Proposal
**bundle_pct >= 58.18 AND age_s < 21**, exit **x_t2n30** — 31 trades at +72.5% (without best +50.8%), won 61%, thirds +93.0% / +21.3% / +107.0%, last 24 h 31 at +72.5%, 47.2 trades a day, +3.375 SOL a day at 0.1 — **unlikely to be luck**. Drops 204 trades at -19.9%.

### Early-exit overlay on the proposal (now: +72.5%, without best +50.8%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +67.4% | +45.6% | +93.0% / +21.3% / +97.2% |
| sell at fs10 if < 1.0 | +42.5% | +19.8% | +93.0% / +15.5% / +53.2% |
| sell at t30 if < 0.9 | +65.3% | +43.4% | +93.0% / +21.0% / +93.3% |
| sell at t30 if < 1.0 | +41.7% | +19.0% | +93.0% / +12.2% / +54.1% |
| sell at t60 if < 0.9 | +65.9% | +44.1% | +93.0% / +19.3% / +95.8% |
| sell at t60 if < 1.0 | +23.3% | +0.1% | +93.0% / -19.8% / +42.7% |
