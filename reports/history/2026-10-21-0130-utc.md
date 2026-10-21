# Every book diagnosed: 21 Oct 2026, 02:30 UK

**Data:** all trades since the 18 Oct 20:25 UK price fix, to 21 Oct 01:42 UK. Real costs throughout. The operator's pump-and-dump coins are left out.

**Method:** reports/books/diagnose.py was run on each book. It covers:
- size and pace;
- every exit, split into thirds of the book's history;
- winners against losers;
- every factor known at the moment of buying;
- a **luck check**: the same search run on shuffled results. A filter only counts as real when chance matches it in at most 2 of 20 shuffled runs.

Each book's full diagnosis is in reports/books/diag/, and its notes file now carries the verdict.

## The headline
- **Two real edges**, both inside books we already run:
  1. **AS**, with one refinement: a quiet first minute.
  2. **Graduations with few buyers** (the GR family), backed by real quotes.
- **Everything else** either loses, or its "best filter" cannot be told apart from luck. That covers A–G, A2, A5, F6, 80, E, PG, all 15 snipers and the 18 off-page books.
- **The snipers are settled.** Each has hundreds to 1,272 trades, so the luck check has real power there. Not one profitable slice survives, and no exit gets any of them to break even.

## Ranking (at 0.1 SOL a trade)
| Book | Trades | Average a trade | Without best | Trades a day | SOL a day | Verdict |
|---|---|---|---|---|---|---|
| **AS4** (proposed) = AS + first-minute selling under 20 SOL | 17 | **+47.0%** | +32.7% | ~8 | +0.37 | Real on A's 331 trades (luck 2/20), but it only works inside AS. Add as a forward test |
| AS3 = AS + bundle of 5+ wallets | 35 | +29.7% | +22.5% | ~16 | +0.47 | Running from 01:30 UK; unproven |
| AS2 = AS + bundle of 2+ wallets | 63 | +18.6% | +14.4% | ~30 | +0.52 | Running from 01:30 UK; steady in every third |
| **AS** | 80 | +10.9% | +7.6% | ~37 | +0.37 | Best proven book: positive in all three thirds; in executor shadow |
| **GR2** (proposed) = graduations with under 156 buyers | 94 | **+37.9%** | +24.2% | ~44 | +1.62 (paper) | Real (luck 0/20). Real-quote legs agree: +9.0% vs −6.6%. Flat in the last third, and paper is ~14 points kind |
| GR | 50 | +9.9% | +4.0% | — | — | 40-real-leg test failed (+5.1%, −3.2% without ARTEMI); stays shadow |
| DC | 45 | +12.2% | +6.2% | — | — | Last third −3.1%; decide at 20 forward trades |
| DS | 70 | +8.8% | +4.9% | — | — | Mostly AS's coins at a worse price; retire |
| K / H / R | 32 / 18 / 9 | — | — | — | — | Too few trades to judge |
| E | 458 | −8.0% | −8.6% | — | — | Volume ≥ $100K slice is real (luck 0) but only paid in the last third |
| A / D / 80 / F / G / B / C / A2 / A5 / F6 | 54–331 | −1.9% to −11.2% | — | — | — | No edge; A and D only feed AS/DS/DC |
| PG | 107 | −21.8% | −22.9% | — | — | Switch off |
| S1–S11, S10 | 20–1,272 | −8% to −27% | — | — | — | Dead at real costs; best exits still −5% to −17% |
| Off-page (18) | 0–5,520 | −2% to −34% | — | — | — | None worth a box |

## What separates winners from losers (the books that work)
- **AS's stopped losers never ran.** Their median peak was 1.14x, against 2.64x for big winners. They had more selling in the trigger minute (33 vs 26 SOL) and fewer snipers (0 vs 4). That is why "first-minute selling under 20 SOL" is the refinement.
- **On graduations, fewer buyers at entry means more room to run.** Under 156 buyers made +37.9% on paper and +9.0% on real quotes. At 156 or more, real quotes made −6.6%.

## Proposed changes (awaiting the owner's go)
1. **AS4 paper box**: AS + first-minute selling under 20 SOL, with a back-test record and a record from now. AS itself stays unchanged.
2. **GR2 in executor shadow at 0.05 SOL**: graduations with under 156 buyers, any age of 10 s or more, sold at 3 min. It runs beside GR. Nothing goes live until 30 real legs are positive.
3. **Switch off failed shadow books:** A5 (`confirm`, 80 legs −0.10 SOL), S4 (`clean`, 178 legs −0.77 SOL), S10 (`op`, 15 legs −9.1% a leg), and PG on paper.
4. **Tidy the page.** Retire these boxes: B, C, 80, F, G, A2, A5, F6, DS, PG and all sniper boxes. Their data keeps recording. Keep AS, AS2, AS3, AS4, GR, GR2, DC, K, H and R. The 12-hour strip keeps gradrun and mom80 as watch lines only.
5. **Data fixes:** feed H from our own holder ledger instead of GMGN, and persist R's 6-hour history.
6. **Rewrite the 4-hourly study** so it follows the book-notes protocol and this method.

## How to read this honestly
- AS2, AS3 and AS4 come from AS's own 80 trades. Their back-tests are in-sample, and only their records from now prove anything.
- GR2's paper figure is kinder than real fills. The real-quote shadow book is the test.
- At 0.5 SOL a trade, AS's paper pace (+0.37 SOL a day at 0.1) would be about +1.8 SOL a day. That only counts once real fills confirm it.
