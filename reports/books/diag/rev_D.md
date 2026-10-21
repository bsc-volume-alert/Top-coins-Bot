# Revision search — D
_Data to 21 Oct 10:35 UK; ; current exit x_flow4; pool costs. Built by reports/books/revise.py._

## The book now
290 trades, -4.3% a trade, without best -5.3%, 112.0 trades a day, -0.597 SOL a day at 0.1. Thirds: -4.5% / -2.9% / -5.7%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_t15s40 | 290 | -4.0% | -4.2% | -3.1% / -2.4% / -6.6% |
| x_flow4ff | 290 | -4.2% | -5.2% | -3.0% / -4.7% / -5.0% |
| x_flow4 (current) | 290 | -4.3% | -5.3% | -4.5% / -2.9% / -5.7% |
| x_t2s40 | 290 | -5.9% | -6.2% | -7.2% / -5.6% / -4.8% |
| x_h3 | 290 | -5.4% | -6.7% | -5.3% / -7.8% / -2.9% |
| x_h5f14 | 290 | -6.1% | -7.5% | -8.0% / -6.1% / -4.4% |
| x_h5 | 290 | -6.9% | -8.2% | -10.4% / -5.8% / -4.5% |
| x_h15 | 289 | -7.4% | -8.8% | -13.1% / -3.3% / -5.7% |
| x_split | 290 | -8.7% | -10.1% | -15.5% / -2.0% / -8.7% |
| x_h2t40 | 290 | -9.9% | -10.6% | -13.3% / -6.5% / -9.8% |
| x_tsl40 | 290 | -10.4% | -11.5% | -15.9% / -2.3% / -13.0% |
| x_time | 288 | -28.7% | -31.5% | -25.6% / -28.0% / -32.6% |

## Search
1464 filters × 12 exits (+ 244 pairs). 270 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +13.0%, +25.8%, +18.3%, +21.9%, +16.6%, +23.4%, +27.9%, +16.3%, +13.2%, +24.5%, +31.7%, +32.9%, +27.2%, +36.9%, +38.5%, +17.9%, +15.8%, +21.3%, +16.2%, +18.3%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| fresh_share < 0.16 AND heat_grad1h >= 152 | x_h15 | 32 | +32.0% | +19.8% | 59% | 257 at -12.3% | -0.7% / +42.2% / +35.9% | 18 at +35.9% | +0.383 | 11 |
| avg_buy_sol >= 0.5573 AND holders_entry < 226 | x_t2s40 | 36 | +18.5% | +16.6% | 50% | 254 at -9.4% | +8.0% / +35.9% / +17.1% | 15 at +12.6% | +0.244 | 15 |
| holders_entry < 226 AND n60 < 95 | x_t2s40 | 34 | +16.1% | +14.0% | 47% | 256 at -8.8% | +12.9% / +26.8% / +11.8% | 14 at +7.3% | +0.199 | 18 |
| pre_m2_b < 5271 | x_t15s40 | 32 | +14.3% | +13.5% | 69% | 258 at -6.3% | +26.6% / +9.1% / +23.9% | 4 at +27.9% | +0.164 | 18 |
| pre_m3_b < 5271 | x_t15s40 | 32 | +14.3% | +13.5% | 69% | 258 at -6.3% | +26.6% / +9.1% / +23.9% | 4 at +27.9% | +0.164 | 18 |
| pre_m5_b < 5271 | x_t15s40 | 32 | +14.3% | +13.5% | 69% | 258 at -6.3% | +26.6% / +9.1% / +23.9% | 4 at +27.9% | +0.164 | 18 |
| largest_entry >= 7.262 | x_t15s40 | 44 | +11.9% | +11.2% | 68% | 246 at -6.9% | +12.5% / +18.1% / +8.2% | 23 at +9.6% | +0.185 | 20 |
| snipers_n < 2 | x_h5 | 37 | +20.9% | +11.0% | 54% | 253 at -11.0% | -7.4% / +8.2% / +40.4% | 18 at +35.4% | +0.285 | 20 |
| heat_grad1h >= 171 | x_h5f14 | 32 | +21.9% | +10.4% | 59% | 258 at -9.6% | +17.0% / +15.6% / +26.0% | 19 at +26.0% | +0.259 | 20 |
| pre_30sol_t < 3.85 | x_h5 | 33 | +21.3% | +10.1% | 61% | 257 at -10.5% | -1.4% / +11.7% / +36.4% | 17 at +35.5% | +0.259 | 20 |
| bundle_pct < 9.818 AND bundle_wallets < 4 | x_h3 | 43 | +18.2% | +9.7% | 47% | 247 at -9.5% | +10.5% / +11.8% / +34.4% | 15 at +27.8% | +0.286 | 20 |
| largest_entry >= 7.262 | x_flow4 | 44 | +15.6% | +9.6% | 61% | 246 at -7.9% | +4.0% / +33.7% / +11.1% | 23 at +10.7% | +0.249 | 20 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| fresh_share < 0.16 AND fresh_share >= 0.08 | x_h15 | 50 | +26.8% | +19.0% | 66% | 239 at -14.5% | +2.0% / +48.1% / +19.2% | 21 at +19.2% | +0.498 | 11 |
| fresh_share < 0.16 AND fresh_share >= 0.08 | x_h15 | 50 | +26.8% | +19.0% | 66% | 239 at -14.5% | +2.0% / +48.1% / +19.2% | 21 at +19.2% | +0.498 | 11 |
| fresh_share < 0.16 AND heat_grad1h >= 152 | x_h15 | 32 | +32.0% | +19.8% | 59% | 257 at -12.3% | -0.7% / +42.2% / +35.9% | 18 at +35.9% | +0.383 | 11 |
| fresh_share < 0.16 | x_h15 | 87 | +12.0% | +7.4% | 55% | 202 at -15.7% | -7.7% / +17.6% / +16.0% | 36 at +16.0% | +0.369 | 20 |
| bundle_wallets < 4 AND bundle_pct < 16.31 | x_h3 | 59 | +13.8% | +7.5% | 49% | 231 at -10.3% | +11.7% / +12.2% / +17.5% | 22 at +14.5% | +0.293 | 20 |

## Proposal
**fresh_share < 0.16 AND fresh_share >= 0.08**, exit **x_h15** — 50 trades at +26.8% (without best +19.0%), won 66%, thirds +2.0% / +48.1% / +19.2%, last 24 h 21 at +19.2%, 19.3 trades a day, +0.498 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 11/20)**. Drops 239 trades at -14.5%.

### Early-exit overlay on the proposal (now: +26.8%, without best +19.0%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +21.2% | +13.3% | +0.1% / +48.0% / +7.1% |
| sell at fs10 if < 1.0 | +16.7% | +8.7% | -4.0% / +47.7% / -1.6% |
| sell at t30 if < 0.9 | +25.3% | +17.5% | +4.4% / +44.0% / +18.5% |
| sell at t30 if < 1.0 | +13.2% | +5.1% | -14.4% / +29.5% / +11.6% |
| sell at t60 if < 0.9 | +18.7% | +10.8% | -7.8% / +29.8% / +21.3% |
| sell at t60 if < 1.0 | +16.6% | +8.6% | -7.2% / +29.8% / +16.1% |
