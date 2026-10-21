# G — A's trigger on the 150–500-wallet coins the page skips ("crowd"), sold at 5 min
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- No strategy of its own: G is A's trigger rows (`p5e30`) that the page SKIPPED because 150+ distinct wallets bought in the trigger minute, limited to 150–500 wallets (bundle known and < 70%, SOL-paired), scored on the 5-min exit `x_h5`. Executor book `crowd` (exit `h5`) — OFF (paper) since 20 Oct 05:19 UK (migration m042). Off the page (out of view since v0.18.148).
- Entry: A's trigger (30 SOL in 60 s, MC < $100K, ≥ 60 s old, buys ≥ sells, ≥ 10 buyers) where wal60 is 150–500. Code note: the executor's `take()` only checks that the skip reason mentions "wallets" and wal60 ≤ 500 — because the tracker names the wallets skip before the SOL-pair skip, the executor could in principle have taken a non-SOL-paired 150+-wallet coin that the page's G record leaves out (no case checked).
- Exit: since 19 Oct 20:10 UK the 5-min hold (`x_h5`: −40% stop until 1.5x, 1.3x floor after 1.5x, sold at 5 min); before that the runner `x_flow4`.
- Started 19 Oct 13:53 UK (v0.18.124 / executor v0.3.4, owner 13:48 UK); exit changed 19 Oct 20:01–20:10 UK (v0.18.142, owner 19:56 UK). No change since.

## Verdict now
**21 Oct 02:30 UK:** Dead.

Failed. The 5-min sale on these coins was +20% to +36% on 26–36 trades in the first studies and then −13% to −22% on every later window (study rule F4: −17.7% on 71 OOS at 17:40 UK 20 Oct; G since 20:10 UK 19 Oct −19.3% on 55, 58% stopped). Its 47 shadow legs lost −2.198 SOL — the worst shadow book.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 10:20 UK; A's trigger on coins A skips for 150-500 wallets, 5-min. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 21:10 UK) | 120 | -3.1% | -8.2% | 47% | 41% | -0.49 |
| last 24 h | 39 | -5.1% | -9.8% | 51% | 31% | -0.24 |
| last 12 h | 10 | +29.1% | +12.8% | 80% | 10% | +0.28 |
| last 6 h | 2 | +41.7% | +20.5% | 100% | 0% | +0.08 |

Executor book `crowd` (shadow, real quotes): 47 legs, -2.198 SOL, average -19.0% a leg, without best -25.8%, won 26%, 19 Oct 14:10 UK to 20 Oct 04:56 UK.
<!-- /NUMBERS -->

## Change history
- 19 Oct 13:28 UK study: the page's "150+ wallets" skip looked wrong on that sample — 26 skipped A coins: runner +5.3%, 5-min +35.9% (win 69%), 1.5x/−40% +13.2%; "a hypothesis, not a finding; worth a shadow book".
- 19 Oct 13:53 UK (v0.18.124 / executor v0.3.4; owner 13:48 UK): book G in shadow at 0.05 SOL, runner exit. First leg 14:10 UK at 0.05; from 14:41 UK all legs at 0.25 SOL (stake raised around 14:15 UK 19 Oct; who/why not recorded).
- 19 Oct 14:09 UK (executor v0.3.5): per-book stats for F and G.
- 19 Oct 17:41 UK study: 36 such coins, runner −1.4% but 5-min +20.5% (win 64%), 1.5x/−40% +5.9%; the 150–500 band alone n34 5-min +20.7%; already fading (the last 10 about −20%). G's 7 runner shadow legs −0.327 SOL (4 stops) → "the exit, not the coins, is the question". Registered as study rule F4 (G's coins sold at 5 min).
- 19 Oct 20:01 UK (v0.18.142 / executor v0.4.0; owner 19:56 UK): G's executor leg and paper record switch to the 5-min sale. Rule text: "from 19 Oct 20:00 UK; the runner exit lost 0.38 SOL on 19 shadow trades, the 5-min sale was +20% on 36 paper". Judged from 20:10 UK.
- 20 Oct 01:45 UK study: F4 −17.6% on 48 OOS, "does not hold up"; recommended switching G and F off shadow.
- 20 Oct 05:19 UK (v0.18.148 / executor v0.4.2, migration m042): G back to paper ("losing at real prices"), out of view on the page (owner, 05:00 UK: "remove what isn't working"). Last leg opened 04:56 UK.
- 20 Oct 16:25–19:05 UK: hold-exit save bug — x_h5 not saved on A rows in that window; G's paper figures for those trades incomplete.

## Ideas tested
- 150+ wallets skip reversal, runner exit: n26 +5.3% (13:28) → n36 −1.4% (17:41); 20 runner shadow legs −0.333 SOL (11 stops −1.368, 7 fade-volume winners +0.996). Dropped for the 5-min exit.
- 5-min exit on G's coins (F4): in sample +35.9% on 26 (13:28) → +20.5% on 36 (17:41); OOS −13.0% (19, 21:40) → −17.6% (48, 01:45) → −18.5% (53, 05:35) → −18.9% (55, 09:35) → −18.9% (59, 13:35; win 32%, stop 58%) → −17.7% (71, 17:40). G paper since 20:10 UK: −20.4% on 32 (01:45) … −21.5% on 43 (13:35) … −19.3% on 55 (17:40).
- 1.5x/−40% on G's coins: +13.2% (26) → +5.9% (36) in sample; not pursued after F4 failed.
- By hour (21:40 UK 19 Oct): positive in 9 of the first 13 hours and 2 of the last 9 — the edge was a few hours on 19 Oct.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/G.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 116 trades −3.7% (no-best −8.9%); first block +37.1% then four losing blocks. Best exit 15-min hold +3.6% but no-best −1.7%. Best cuts are all GMGN snapshots (†, timing not exact), luck 6.

## Notable coins
- boobs coin and tit coin (19 Oct evening) — the 10-wallet operator's coins, caught by G at $60–100K after their run; G took boobs coin three times (one 3.8x, one stop, one rug) and tit coin twice (a rug and a stop). With Dacity Cat and Lucia the Baddie, four h5 legs sold rugs at 0.03–0.10. A reason for every book to skip the operator's coins (done 20 Oct 19:15 UK).
- The 27 h5 legs (0.25 SOL): 19 stops −2.769 SOL, 7 timed sales +0.840, 1 floor +0.064 → −1.865 SOL (−27.6% of stake), win 19%.

## What the owner said / decided
- 19 Oct 13:48 UK: add G (and F) straight into shadow, as the study suggested.
- 19 Oct 19:56 UK: give G the 5-min exit (the study's F4 suggestion).
- 20 Oct 05:00 UK: "remove what isn't working" — G to paper and off the page.

## Open items
- awaiting go: retire from the page.
- None. F4 is closed as "does not hold up". The page's 150+-wallet skip stays.
