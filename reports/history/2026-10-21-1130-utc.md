# Every book revised on its own statistics: 21 Oct 2026, 12:30 UK

**Companion:** "Successes and failures, coin by coin" (reports/winners-losers.md; on this page as the 2026-10-21-1200-utc-winners-losers entry) holds, for every book, the winners grouped with what they had in common, the losers grouped with what they had in common, every idea tested to minimise the failures, and the proposal it leads to.

**Data:** everything since the 18 Oct 20:25 UK price fix, to 21 Oct 10:36 UK. Real costs. The operator's pump-and-dump coins are left out. Three price-glitch coins (peaks of 36,000–93,000x on 19 Oct, a feed error) are now excluded; they had been inflating A, D, 80 and the momentum books.

**Method:** for every book, reports/books/revise.py tried every entry factor, pairs of factors, every recorded exit and early-exit rules. A revision counts as **real** only if it beats the book in all three periods of its history, is positive without its best coin, and the same search on shuffled outcomes (20 runs) cannot match it (luck ≤ 2 of 20) — or it has independent support (real-quote legs, a forward record, the same effect on other coins). Five analysts then grouped each book's winners and losers; every proposal was re-checked independently. Each book's notes carry the detail.

## The answer in one paragraph
Of about 50 books, **the data supports four that make money** (AS and its children, GR, a new bundle-launch book built from S8's only profitable slice, and S3/S4 as forward tests), **one optional one** (a revised E), and **nothing else**. For the other ~40, the most profitable version the statistics can produce still loses, or cannot be told apart from luck. That is the honest result of "revise every coin": most of them can't be revised into profit.

## The one new finding worth building
**Bundle launches.** A launch where the bundle buys **70–80% of the supply across 4–10 wallets**, and the first outside trade is at **$25K+ market cap**. About 50 a day are still on the curve when S8 fires (4 s after launch). Base rates from 49,500 launches: ordinary launches graduate 1.7% of the time; these graduate 83% of the time and 54% touch 2x. They are a few operators' repeating signatures (e.g. 28 launches at exactly 79.31% / 85.01 SOL).

| Exit on those 91 trades | Avg a trade | Without best 3 | Won | Thirds | Last 24 h |
|---|---|---|---|---|---|
| **40% trailing stop** | **+33.7%** | +15.1% | 44% | +10.8 / +33.1 / +56.3 | 47 at +55.4% |
| "Split" (half at 2x, trail the rest) | +25.8% | +17.0% | 47% | +22.1 / +36.9 / +18.7 | 47 at +29.1% |
| 5-min sale (S8's current exit) | +13.0% | +4.9% | 59% | +11.4 / +11.0 / +16.3 | 47 at +16.6% |

The other 630 S8 trades average −22.6% on the same exit. Permutation test: chance of this gap by luck, 0 in 2,000. PG's only profitable slice is the same coins bought at the same second. **Risks, plainly:** these coins are operator-controlled and are dumped within about 15 minutes, so the trailing stop gives back part of each run; no real fill exists yet (other curve books ran 0–6 points under paper); the executor has no trailing-stop exit leg yet (code to write). Paper and shadow first.

## What survived, book by book
| Book | Now | Proposal | Numbers behind it | Confidence |
|---|---|---|---|---|
| **AS** | 89, +10.8% a trade; since 17:45 UK 20 Oct 25 at +15.8%; 9 real-quote legs +13.7% (real ≥ paper) | **Keep.** Nothing on its own 89 trades beats luck | — | Real as a whole (forward record) |
| **AS4** (new) | — | **Paper box:** AS + first-minute selling under 20 SOL | 18 at +47.8% (no-best +34.3%), thirds +52.5 / +65.7 / +25.2, ~7 a day | Unproven: carries all of AS's profit, but luck 20/20 on AS's own trades |
| **AS2, AS3** | forward since 01:30 UK: AS2 9 at +9.3%, AS3 7 at +22.3% | **Keep,** judge at 30 forward. AS2 has been identical to AS so far; its back-test edge is AS3's coins | — | Unproven |
| **GR** | 09:47 UK rule; 67 real-quote legs +10.6% a leg; 2 forward rows | **Keep** the rule. **Add the 40% trail as a line in the box**, decide at 40 forward rows | Paired on the same 62 coins: trail +36.2% vs 3-min +17.5% on average, but median difference 0, better on 25 / worse on 27, p 0.10 — six slow runners are the whole difference | The buyer rule is real (luck 0); the exit switch is unproven |
| **BL = S8 revised** | S8: 721, −21.2% | **Revise S8 into the bundle-launch book** above; exit 40% trail (split recorded beside it); PG folded in and switched off; **executor shadow at 0.05 SOL** once the trail exit leg exists | 91 at +33.7% (+29.7% with a 4-point fill haircut), ~50 a day, +1.6 SOL a day at 0.1 on paper | Real slice (luck 0, p 0.000); fills unproven |
| **S3** (revised 08:45 UK) | back-test 72 at +22.5% | **Keep as forward test**; 0 forward trades yet (10 fires since were sub-$1M copies, correctly skipped) | — | Unproven |
| **S4** (revised 10:28 UK) | back-test 32 at +25.7% | **Keep as forward test**; 0 forward trades yet. Caveat found: half of its back-test is pre-16:35-UK rows where "socials known" was itself a selection bias; the clean half is +1.0% | — | Unproven, weaker than it looked |
| **E** | 159 core trades, −4.5% | **Optional:** revise E to the mom80 slice: $80K-volume trigger on a coin under 6 min old and under $76K, sell everything at 1.5x (no stop) — paper only. Otherwise switch E off | 86 at +10.9% (no-best +10.5%), 76% won, thirds +1.9 / +21.0 / +9.4, last 24 h 35 at +14.5%, ~34 a day, +0.33 SOL a day; the 24% that miss 1.5x close at ~0.3x; most of its coins are GR coins bought later | Real in its own book (luck 0), modest |
| **K** | 55, +3.0% at 5 min; its page headline exit isn't exported and is probably negative | Keep to 60 trades; export its headline exit first | — | Can't judge yet |
| **A, D** | −3.8% / −4.3% | Keep recording as the feeders for AS/AS2/AS3/AS4 (and DS/DC data); retire their boxes | nothing beats luck; every registered A/D rule has now failed forward | High (that nothing is there) |

## Retire or switch off (data keeps recording unless stated)
- **Page boxes:** B, C, 80, F, G, A2, A5, F6, DS, DC, H, PG, S1, S2, S4b, S5, S6, S6b, S7, S7b, S9, S10, S11, R.
- **Executor shadow books off:** A5 (`confirm`, 101 legs −0.33 SOL) and S10 (`op`, 19 legs −0.10 SOL). (S4's `clean` is already off.)
- **Old off-page books:** stop them all (early, wave2, secondwave, copy, confirm, climber, revival, gradrec, gradrun, slow, momentum, momfast, momdip, momre, momconf). "early" alone writes 2,500 rows a day for nothing.
- Why, in short: snipers S1–S11 lose 9–22 points a trade at their best exit and nothing survives the luck check on hundreds to 1,470 trades each (the wallet-record idea for S6/S6b/S7 was tested properly and fails too). DS is AS's coins at the same price with a worse result; DC and H failed forward; R back-tests at −8.9% and never traded its rule; the rest are dominated by A's runner on the same coins.

## Data fixes needed (no owner decision needed, but listed)
1. E double-counts (abcd + others rows); fix numbers.py.
2. GR-lock's exit column (x_h3l) is corrupt (6 of 45 rows show exits above the 3-min high): drop the GR-lock line from the page.
3. K's headline exit (x_h2t40) isn't in the data export: add it.
4. AS's executor shadow book is quoting at 0.5 SOL a leg, not 0.1 (set from the page?). Harmless in shadow; confirm it's intended.
5. x_tsl40 on curve books is scored at curve costs even where the coin graduates mid-hold; approximate but consistent.

## What this leaves running, if all approved
Paper/shadow: AS, AS2, AS3, AS4, GR (+ trail line), BL, S3, S4, K, (E revised, optional). Executor shadow: AS, GR, BL. Nothing live. Next decision points: AS live at 0.1 once its shadow has 30 positive legs; GR at 30 forward rows under the revised rule; BL at 40 shadow legs.

## Addendum 13:30 UK: the common problem, new formula families, and the forward tests (data to 13:20 UK)
**The common problem across the retired books is cost against base rate, not one column.** Real costs are 9–12 points a trade on every book (snipers 12.2 on the 5-min exit, 8.6 on the trail; A 10.1; AS 10.4; S8 10.9; bundle slice 8.6). At the moment of buying, nothing recorded separates winners from losers (8,329 pooled sniper trades: best honest entry column AUC 0.63, and that column is the launch's bundle structure; A's 370 rows: best of 74 columns 0.56). So each book earns its coin population's base rate before costs: snipers −4.4%, S8 −10.3%, A +6.3%, AS +21.2%, bundle slice +42.2%. A book needs more than about 10 points gross a trade; the retired ones sit between −10 and +6. The stop is not the culprit: 39–41% of trades end there in every curve/A book and they close lower still without it.

**New formula families tested** (full list in reports/books/LESSONS.md): coin type beats entry second (GR on bundle-launch coins +14.1% on 42 — support for the bundle book); operator signatures (no rhythm, profit spread over ~8 operators); creator-wallet funding (luck 93/300, dropped); market regime (same sign in every book, never significant, one clock); cross-book sequencing (AS and the bundle book are disjoint); re-entry after the dump on bundle coins −37.1% on 86 and name re-launches −8.4% on 304 (settled negatives); creator/dev holding as an exit (sold out at 5 min → −50% on 16, still holding → +126% on 28: record-first, plan item 8 sharpened to the creator wallet); derived ratios (one AS cut, "age per $K MC < 4.74", 24 at +33.5% vs 68 at +3.1%, recorded, not proposed — fails the family-wise check and is mixed on independent books).

**Forward tests now:** bundle slice 101 at +32.9% (newest 10: 2 winners, one a 7x). GR under the 09:47 rule: 8 rows, −12.3% on the 3-min (too few). **S3: 17 forward trades at −27.0%, 1 winner** — heading for retirement unless it turns. S4: 9 at −1.9%. AS since 17:45 UK: 28 at +16.2%, won 71%.
