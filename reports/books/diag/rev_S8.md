# Revision search — S8
_Data to 21 Oct 10:35 UK; curve costs, 5-min exit; current exit x_h5; curve costs. Built by reports/books/revise.py._

## The book now
721 trades, -21.2% a trade, without best -22.3%, 386.1 trades a day, -8.580 SOL a day at 0.1. Thirds: -19.4% / -16.1% / -28.1%.

## Exits alone (no filter)
| exit | n | avg | without best | thirds |
|---|---|---|---|---|
| x_tsl40 | 721 | -15.5% | -16.3% | -15.7% / -10.7% / -20.1% |
| x_t15s40 | 721 | -16.7% | -16.8% | -15.9% / -16.7% / -17.7% |
| x_flow4ff | 721 | -16.7% | -17.1% | -11.7% / -17.1% / -21.5% |
| x_flow4 | 721 | -16.7% | -17.2% | -11.8% / -17.9% / -20.6% |
| x_h2t40 | 721 | -16.9% | -17.5% | -13.2% / -17.3% / -20.3% |
| x_h5f14 | 721 | -16.8% | -17.8% | -15.1% / -12.3% / -23.0% |
| x_h15 | 717 | -16.9% | -17.9% | -14.2% / -13.8% / -22.8% |
| x_t2s40 | 721 | -17.9% | -18.1% | -14.6% / -18.3% / -20.9% |
| x_split | 721 | -19.6% | -20.0% | -14.9% / -14.8% / -29.1% |
| x_h5 (current) | 721 | -21.2% | -22.3% | -19.4% / -16.1% / -28.1% |
| x_h3 | 721 | -21.8% | -22.4% | -18.7% / -17.5% / -29.2% |
| x_time | 720 | -36.7% | -38.2% | -27.7% / -37.6% / -45.0% |

## Search
739 filters × 12 exits (+ 144 pairs). 186 pass the three-period test; **110 are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: +0.1%, none, none, none, +7.2%, none, none, +11.1%, none, +0.6%, none, none, none, +0.3%, +6.9%, none, none, none, none, none.

### Best candidates (one per factor and exit, by profit per trade without the best coin)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| sn_mc_first >= 2.399e+04 AND cr_funded_sol >= 2.982 | x_h2t40 | 72 | +34.6% | +29.7% | 50% | 649 at -22.6% | +11.1% / +24.3% / +57.3% | 40 at +59.1% | +1.294 | 0 |
| entry_mc >= 2.523e+04 AND sn_mc_first >= 2.399e+04 | x_tsl40 | 98 | +33.2% | +27.4% | 45% | 623 at -23.2% | +16.7% / +21.0% / +69.7% | 47 at +59.0% | +1.687 | 0 |
| sn_mc_first >= 2.399e+04 AND bundle_pct >= 70 | x_tsl40 | 105 | +29.0% | +23.7% | 43% | 616 at -23.1% | +13.6% / +21.0% / +51.7% | 53 at +49.3% | +1.576 | 0 |
| sn_mc_first >= 2.399e+04 AND entry_mc >= 2.523e+04 | x_split | 98 | +25.5% | +22.8% | 48% | 623 at -26.7% | +30.0% / +24.3% / +25.0% | 47 at +32.7% | +1.286 | 0 |
| entry_mc >= 2.523e+04 AND bundle_pct >= 70 | x_split | 99 | +24.8% | +22.2% | 47% | 622 at -26.6% | +35.1% / +21.6% / +25.0% | 49 at +29.3% | +1.263 | 0 |
| bundle_pct >= 70 | x_tsl40 | 109 | +26.2% | +21.0% | 41% | 612 at -22.9% | +13.6% / +16.3% / +51.7% | 56 at +44.3% | +1.473 | 0 |
| sn_signal_n >= 70 | x_tsl40 | 109 | +26.2% | +21.0% | 41% | 612 at -22.9% | +13.6% / +16.3% / +51.7% | 56 at +44.3% | +1.473 | 0 |
| entry_mc >= 2.523e+04 AND sn_mc_first >= 2.399e+04 | x_h2t40 | 98 | +24.0% | +20.4% | 47% | 623 at -23.3% | +13.9% / +10.6% / +59.0% | 47 at +45.7% | +1.209 | 0 |
| sn_bundle_pct >= 70 | x_tsl40 | 110 | +25.2% | +20.0% | 41% | 611 at -22.8% | +13.6% / +16.3% / +47.3% | 57 at +41.9% | +1.423 | 0 |
| sn_bundle_sol >= 56.3 | x_tsl40 | 110 | +25.2% | +20.0% | 41% | 611 at -22.8% | +13.6% / +16.3% / +47.3% | 57 at +41.9% | +1.423 | 0 |
| bundle_pct >= 70 | x_split | 109 | +19.2% | +16.8% | 44% | 612 at -26.5% | +26.2% / +19.1% / +15.2% | 56 at +22.0% | +1.064 | 0 |
| sn_signal_n >= 70 | x_split | 109 | +19.2% | +16.8% | 44% | 612 at -26.5% | +26.2% / +19.1% / +15.2% | 56 at +22.0% | +1.064 | 0 |

### Best by SOL a day (among those unlikely to be luck, else all passing)
| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |
|---|---|---|---|---|---|---|---|---|---|---|
| entry_mc >= 2.523e+04 AND sn_mc_first >= 2.399e+04 | x_tsl40 | 98 | +33.2% | +27.4% | 45% | 623 at -23.2% | +16.7% / +21.0% / +69.7% | 47 at +59.0% | +1.687 | 0 |
| entry_mc >= 2.523e+04 AND bundle_pct >= 70 | x_tsl40 | 99 | +32.4% | +26.7% | 44% | 622 at -23.1% | +21.1% / +18.5% / +69.7% | 49 at +54.5% | +1.664 | 0 |
| entry_mc >= 2.523e+04 AND sn_signal_n >= 70 | x_tsl40 | 99 | +32.4% | +26.7% | 44% | 622 at -23.1% | +21.1% / +18.5% / +69.7% | 49 at +54.5% | +1.664 | 0 |
| entry_mc >= 2.523e+04 AND sn_bundle_pct >= 70 | x_tsl40 | 99 | +32.4% | +26.7% | 44% | 622 at -23.1% | +21.1% / +18.5% / +69.7% | 49 at +54.5% | +1.664 | 0 |
| entry_mc >= 2.523e+04 AND sn_bundle_sol >= 56.3 | x_tsl40 | 99 | +32.4% | +26.7% | 44% | 622 at -23.1% | +21.1% / +18.5% / +69.7% | 49 at +54.5% | +1.664 | 0 |

## Proposal
**entry_mc >= 2.523e+04 AND sn_mc_first >= 2.399e+04**, exit **x_tsl40** — 98 trades at +33.2% (without best +27.4%), won 45%, thirds +16.7% / +21.0% / +69.7%, last 24 h 47 at +59.0%, 52.5 trades a day, +1.687 SOL a day at 0.1 — **unlikely to be luck**. Drops 623 trades at -23.2%.

### Early-exit overlay on the proposal (now: +33.2%, without best +27.4%)
| rule | avg | without best | thirds |
|---|---|---|---|
| sell at fs10 if < 0.9 | +31.0% | +25.3% | +16.9% / +20.2% / +63.4% |
| sell at fs10 if < 1.0 | +20.0% | +14.1% | +15.1% / +8.0% / +48.3% |
| sell at t30 if < 0.9 | +24.9% | +19.1% | +11.2% / +12.9% / +59.1% |
| sell at t30 if < 1.0 | +18.8% | +12.9% | +22.1% / +10.7% / +33.2% |
| sell at t60 if < 0.9 | +29.5% | +23.8% | +11.2% / +17.0% / +68.1% |
| sell at t60 if < 1.0 | +16.9% | +11.0% | +10.9% / +9.2% / +36.9% |
