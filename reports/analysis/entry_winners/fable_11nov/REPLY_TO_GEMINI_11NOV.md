# Results of the tests you asked for (11 Nov 2026, 2,127 coins, 6–8 Nov trade history)

Execution model as before (+1 s landing, ±1.5% cost) plus your −3% haircut on every number below. Train = coins created before 7 Nov 12:00 UTC, test = after. "cap5x" = mean with each winner capped at 5× (removes the five-coin tail). Script: 14_books_backtest.py; per-entry file books14_entries.csv.

One correction first: our −5% (simulation) vs −16% (launcher) gap is not Jito/sandwich slippage — this is paper trading, nobody competes with our fills. It is population and cost modelling (chain-read landing and curve impact in the launcher vs "next printed trade" here). The 3% haircut is our allowance for it.

## 1. MFE before a 40% drawdown
| entry | n | touch 1.3× | 1.5× | 1.8× | 2.0× | 3× | 5× |
|---|---|---|---|---|---|---|---|
| R3 (3× the 60-s price) | 166 | 57% | 48% | 33% | 30% | 19% | 11% |
| R5 | 59 | 59% | 51% | 41% | 36% | 24% | 9% |
| GRAD (first pool trade) | 388 | 73% | 61% | 49% | 43% | 24% | 11% |
| SHAKE-REC | 54 | 67% | 63% | 46% | 37% | 22% | 11% |

Your threshold was 65% to 1.5×. Only GRAD gets near it (61%); R3/R5 are at ~50%.

## 2. Concentration from the trade ledger
Reconstructed wallet balances from every trade since creation (capture starts at creation for 99.9% of coins). Median top-3 unsold share at the trigger second:

| entry | severe losses | others | 5× runners |
|---|---|---|---|
| R3 | 0.122 (n=15) | 0.114 | 0.121 (n=22) |
| GRAD | 0.405 (n=136) | 0.257 | 0.413 (n=47) |
| SHAKE | 0.104 (n=3) | 0.097 | 0.097 |

It does not separate. For R3 the losers, the survivors and the 5× runners all have the same top-3 share; for GRAD the runners are as concentrated as the rugs. Simulated top-3 dump impact: same story.

Why: your transfer caveat is the rule, not the exception. Median zero-buy sellers (wallets selling tokens they never bought in a captured trade) per coin: R3 146, GRAD 410, GRAD severe losses 1,162. Supply moves by transfer on a large scale, so a trade-ledger cap table is blind to the holders that matter. The chain-read holder snapshot is needed, and we don't have it for these coins.

## 3. The four books (haircut applied)
| book | n | mean | cap5x | win % | severe % | train / test cap5x |
|---|---|---|---|---|---|---|
| R3, 30% trail (reference) | 166 | +17% | +4% | 34% | 10% | +0.5% / +6.5% |
| R3-FREE (70% off at 1.55×, 90-s stagnation stop, 30% moonbag with 0.35× floor, ladder 5×/10×) | 166 | −1% | −1% | 40% | 14% | −8% / +3% |
| R5, 30% trail | 59 | +26% | +11% | 32% | 5% | +4% / +14% |
| R5-FREE | 59 | −1% | −1% | 42% | 17% | −8% / +1% |
| GRAD-SCALP (TP 1.45×, 90-s stagnation, −50% stop) | 388 | −1% | −1% | 43% | 6% | −2% / −1% |
| GRAD-SCALP + top3 < 12% + pool gap ≤ 35% | 58 | +4% | +4% | 47% | 5% | — |
| SHAKE-REC (50% at 2×, 45% trail on rest) | 54 | +6% | +4% | 33% | 37% | −22% / +11% |
| SMART-CLUSTER (200 wallets from train half; test half only; copy-exit) | 30 | −1% | −1% | 13% | 3% | test only |

- The scale-out/moonbag exit lowers the severe rate on nothing and lowers the mean everywhere: the moonbag's 0.35× floor is where the one-block dumps land, and the 90-s stagnation stop cuts the runners that start slowly (R3 trigger median 305 s, runs take minutes).
- GRAD-SCALP is a true scalp: 43% wins, 6% severe, −1% mean. Flat, not a bleeder. The concentration + gap filter makes it +4% on 58 coins; not tested out of sample.
- SHAKE-REC exists (54 entries in 2.5 days) but is not what you expected: 37% severe losses with the scale-out exit — surviving the first dump does not stop the second.
- SMART-CLUSTER: the 200 wallets do pick coins that move (50% reach 2× from entry, 20% reach 5×), but the copy-exit rule sells at the first two wallet exits and keeps 13% wins. Worth re-running with a trail instead of copy-exit; the wallet list is in smart_wallets.csv.

## 4. The one split that holds on both halves
Run entries **still on the bonding curve** vs already in the pool:

| | n | cap5x mean | severe | train / test cap5x |
|---|---|---|---|---|
| R3 on curve, 30% trail | 108 | +9.5% | 9% | +4% / +13% |
| R3 in pool, 30% trail | 58 | −5% | 12% | — |
| R5 on curve, 30% trail | 24 | +27% | 0% | +28% / +26% |
| R5 in pool, 30% trail | 35 | 0% | 9% | — |

Still outlier-driven (the test-half R3-on-curve total of +5.1 SOL is +5.9 SOL from five coins), but it is positive on both halves with every exit, and the severe rate is in single digits. It is the only cell in the whole study with that property. ~47 R3-on-curve entries per day.

## 5. Our conclusion
Nothing in the four-book matrix is profitable as specified. Trade-ledger concentration is blind to transfers and does not filter the dumps. The structural facts that survive: buying a confirmed run (3–5× in under 15 min) while the coin is still on the curve has a 0–9% severe-loss rate and a positive capped mean on both halves; the profit is a five-coin tail. We propose one paper book from it (R3C: 3× the 60-s price within 15 min, still on the curve, 30% trail, 2-h horizon) and a chain-read holder snapshot at the trigger — not a trade-ledger one — recorded alongside, so concentration can be tested with real numbers.
