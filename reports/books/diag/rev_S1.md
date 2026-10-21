# Revision search — S1
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
348 trades, -21.9% a trade, without best -24.0%, 183.3 trades a day, -4.202 SOL a day at 0.1. Thirds: -23.2% / -27.5% / -15.0%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tsl40 | 348 | -12.3% | -14.3% | -17.5% / -12.3% / -7.0% |
| x_flow4ff | 348 | -14.7% | -15.5% | -18.9% / -11.9% / -13.2% |
| x_t15s40 | 348 | -15.4% | -15.6% | -13.6% / -18.1% / -14.6% |
| x_flow4 | 348 | -14.9% | -15.8% | -19.0% / -12.4% / -13.4% |
| x_h2t40 | 348 | -16.3% | -17.5% | -20.1% / -14.7% / -14.3% |
| x_t2s40 | 348 | -17.6% | -17.9% | -20.9% / -14.0% / -17.8% |
| x_h5f14 | 348 | -16.2% | -18.3% | -14.3% / -24.5% / -9.9% |
| x_h15 | 345 | -18.7% | -21.4% | -24.4% / -24.7% / -7.3% |
| x_h3 | 348 | -21.3% | -23.4% | -25.3% / -27.1% / -11.6% |
| x_h5 (current) | 348 | -21.9% | -24.0% | -23.2% / -27.5% / -15.0% |
| x_split | 348 | -27.3% | -28.2% | -29.3% / -22.2% / -30.3% |
| x_time | 348 | -28.9% | -32.2% | -33.1% / -21.1% / -32.5% |

## Search
656 filters × 12 exits (+ 5 pairs). 15 pass the three-period test; **0 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +30.8%, +0.1%, +4.9%, +5.5%, +26.0%, +18.9%, none, +5.8%, +12.4%, +3.9%, +11.6%, +5.8%, +11.8%, +1.3%, +14.1%, +0.7%, +3.7%, +17.0%, +1.3%, +9.7%.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| has_socials == 1 | x_flow4ff | 76 | +13.2% | +9.6% | 43% | 272 at -22.4% | +19.2% / +44.5% / -9.1% | 42 at +5.1% | +0.487 | 9 |
| TRAIT socials present | x_flow4ff | 76 | +13.2% | +9.6% | 43% | 272 at -22.4% | +19.2% / +44.5% / -9.1% | 42 at +5.1% | +0.487 | 9 |
| has_socials == 1 | x_flow4 | 76 | +12.8% | +9.2% | 43% | 272 at -22.7% | +19.2% / +43.2% / -9.0% | 42 at +5.0% | +0.474 | 9 |
| TRAIT socials present | x_flow4 | 76 | +12.8% | +9.2% | 43% | 272 at -22.7% | +19.2% / +43.2% / -9.0% | 42 at +5.0% | +0.474 | 9 |
| has_socials == 1 | x_tsl40 | 76 | +16.1% | +6.9% | 29% | 272 at -20.2% | +7.7% / +45.4% / +3.4% | 42 at +12.8% | +0.606 | 9 |
| TRAIT socials present | x_tsl40 | 76 | +16.1% | +6.9% | 29% | 272 at -20.2% | +7.7% / +45.4% / +3.4% | 42 at +12.8% | +0.606 | 9 |
| has_socials == 1 | x_h5f14 | 76 | +12.7% | +3.4% | 49% | 272 at -24.3% | +39.3% / -0.6% / +5.4% | 42 at +6.3% | +0.467 | 15 |
| TRAIT socials present | x_h5f14 | 76 | +12.7% | +3.4% | 49% | 272 at -24.3% | +39.3% / -0.6% / +5.4% | 42 at +6.3% | +0.467 | 15 |
| has_socials == 1 | x_h2t40 | 76 | +7.7% | +2.5% | 34% | 272 at -23.1% | +7.7% / +33.4% / -7.7% | 42 at +0.9% | +0.268 | 15 |
| TRAIT socials present | x_h2t40 | 76 | +7.7% | +2.5% | 34% | 272 at -23.1% | +7.7% / +33.4% / -7.7% | 42 at +0.9% | +0.268 | 15 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| has_socials == 1 | x_tsl40 | 76 | +16.1% | +6.9% | 29% | 272 at -20.2% | +7.7% / +45.4% / +3.4% | 42 at +12.8% | +0.606 | 9 |
| TRAIT socials present | x_tsl40 | 76 | +16.1% | +6.9% | 29% | 272 at -20.2% | +7.7% / +45.4% / +3.4% | 42 at +12.8% | +0.606 | 9 |
| TRAIT socials present AND has_socials == 1 | x_tsl40 | 76 | +16.1% | +6.9% | 29% | 272 at -20.2% | +7.7% / +45.4% / +3.4% | 42 at +12.8% | +0.606 | 9 |
| has_socials == 1 | x_flow4ff | 76 | +13.2% | +9.6% | 43% | 272 at -22.4% | +19.2% / +44.5% / -9.1% | 42 at +5.1% | +0.487 | 9 |
| TRAIT socials present | x_flow4ff | 76 | +13.2% | +9.6% | 43% | 272 at -22.4% | +19.2% / +44.5% / -9.1% | 42 at +5.1% | +0.487 | 9 |

## Proposal
**has_socials == 1**, exit **x_tsl40** — 76 trades at +16.1% (without best +6.9%), won 29%, thirds +7.7% / +45.4% / +3.4%, last 24 h 42 at +12.8%, 40.0 trades a day, +0.606 SOL a day at 0.1 — **CAN'T BE TOLD FROM LUCK (luck 9/20)**. Drops 272 trades at -20.2%.

### Early-exit overlay on the proposal (now: +16.1%, without best +6.9%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +14.9% | +5.7% | +6.8% / +45.2% / +1.5% |
| sell at fs10 if < 1.0 | +15.8% | +6.6% | +10.7% / +46.4% / +0.4% |
| sell at t30 if < 0.9 | +10.1% | +0.8% | -0.3% / +45.2% / -5.0% |
| sell at t30 if < 1.0 | +9.4% | +0.1% | -2.9% / +45.2% / -5.0% |
| sell at t60 if < 0.9 | +3.9% | -5.5% | -12.6% / +44.1% / -10.8% |
| sell at t60 if < 1.0 | +3.9% | -5.5% | -12.6% / +44.1% / -10.8% |
