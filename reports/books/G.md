# G — A's trigger on the 150–500-wallet coins the page skips ("crowd"), sold at 5 min
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- No strategy of its own: G is A's trigger rows (`p5e30`) that the page SKIPPED because 150+ distinct wallets bought in the trigger minute, limited to 150–500 wallets (bundle known and < 70%, SOL-paired), scored on the 5-min exit `x_h5`. Executor book `crowd` (exit `h5`) — OFF (paper) since 20 Oct 05:19 UK (migration m042). Off the page (out of view since v0.18.148).
- Entry: A's trigger (30 SOL in 60 s, MC < $100K, ≥ 60 s old, buys ≥ sells, ≥ 10 buyers) where wal60 is 150–500. Code note: the executor's `take()` only checks that the skip reason mentions "wallets" and wal60 ≤ 500 — because the tracker names the wallets skip before the SOL-pair skip, the executor could in principle have taken a non-SOL-paired 150+-wallet coin that the page's G record leaves out (no case checked).
- Exit: since 19 Oct 20:10 UK the 5-min hold (`x_h5`: −40% stop until 1.5x, 1.3x floor after 1.5x, sold at 5 min); before that the runner `x_flow4`.
- Started 19 Oct 13:53 UK (v0.18.124 / executor v0.3.4, owner 13:48 UK); exit changed 19 Oct 20:01–20:10 UK (v0.18.142, owner 19:56 UK). No change since.

## Verdict now
**21 Oct 02:30 UK:** Dead.

**21 Oct 11:05 UK (revision search, data to 10:36 UK):** dead, and the search's "real" find is rejected: "largest holder ≥ 4.8% AND before 14:39 UK, hold 15 min" is 15 trades carried by four coins at +192% to +600% (all between 01:25 and 04:18 UK), +3% without the top three, five of the fifteen stopped at −51 to −53%, and the hour cut merely removes 15 trades that averaged −21.5%. An hour-of-day pair on 15 trades from a search whose shuffled runs produced +27% to +87% is luck, whatever its luck score says.

Failed. The 5-min sale on these coins was +20% to +36% on 26–36 trades in the first studies and then −13% to −22% on every later window (study rule F4: −17.7% on 71 OOS at 17:40 UK 20 Oct; G since 20:10 UK 19 Oct −19.3% on 55, 58% stopped). Its 47 shadow legs lost −2.198 SOL — the worst shadow book.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; A's trigger on coins A skips for 150-500 wallets, 5-min. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 21:10 UK) | 122 | -3.0% | -7.9% | 47% | 40% | -0.48 |
| last 24 h | 40 | -3.3% | -7.9% | 52% | 28% | -0.17 |
| last 12 h | 7 | +34.4% | +10.8% | 71% | 14% | +0.23 |
| last 6 h | 3 | +11.2% | +6.5% | 67% | 0% | +0.03 |

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

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_G.md):
  - Book now: 120 trades −3.1% (no-best −8.2%), 47% won, 41% stopped, thirds +16.5% / −21.0% / −4.9%, last 24 h 39 at −5.1%, 47 a day, −0.19 SOL a day at 0.1. By day at the 5-min exit: 18 Oct −9.5% (5), 19 Oct +1.5% (66), 20 Oct −15.7% (43), 21 Oct +41.1% (6). Shadow: 47 legs −2.198 SOL.
  - Winners as a group: only 7 trades ever made +50% (median 100 SOL / 208 wallets / 280 buys in the trigger minute, entry MC $35K, 29% with socials — a different shape from the 49 small winners at $44K, 76 SOL, 76% with socials). Losers (15 small, 49 stopped): $47–50K, 30–94 SOL, 224–227 wallets, 65–87% with socials. With seven big winners the "group" cannot be characterised.
  - Exit verdict: hold-15 +3.5% but −1.6% without its best trade (thirds +16.9 / −5.7 / −1.0); the 5-min sale (current) −3.1% / −8.2%; t15s40 −5.6%; runner −6.3%; tsl40 −9.1%; t2s40 −11.2%. No exit is positive without its best trade.
  - Factor / pair verdict: 1,419 filters × 12 exits + 270 pairs; 371 pass the three-period test; 3 show luck ≤ 2 — but the shuffled runs' best values were +27% to +87% (median about +48%), so this book's search produces huge "rules" by chance every time. The proposal — largest holder at entry ≥ 4.785% AND hour_uk < 14.65, x_h15: 15 trades +112.1% (no-best +77.3%), won 67%, thirds +172.9 / +92.6 / +45.2, luck 1/20 — is four coins: Universal Basic Income +585% (19 Oct 01:43), SpaceXSITeslaBoringaLink +461% (19 Oct 04:18; A bought the same coin eight minutes later and lost 79.5%), GTAVI Mascot +600% (20 Oct 01:41), yumi umi +192% (21 Oct 01:25); without the top three the other 12 average about +3%; 5 of the 15 stopped at −51 to −53%; on G's own 5-min exit the same 15 are +68.4% (no-best +30.5%), on the runner +14.4% (no-best +5.9%). The single cuts: largest holder ≥ 4.785% alone 30 trades +45.3% (no-best +26.1%); before 14:39 UK alone 42 trades +34.7% — the hour condition only drops 15 trades that averaged −21.5%, i.e. it is fitted to where the four monsters fell in the day. The owner said on 19 Oct he does not accept hour-of-day rules without much longer data; this is the same artefact (G's "9 of the first 13 hours" on 19 Oct) with a holder-share cut added.
  - Proposed revised rule: **no profitable version found.** The 150+-wallet coins remain a correct skip for A; G's hold-15 line can stay recorded as the comparison, nothing more.

## Notable coins
- boobs coin and tit coin (19 Oct evening) — the 10-wallet operator's coins, caught by G at $60–100K after their run; G took boobs coin three times (one 3.8x, one stop, one rug) and tit coin twice (a rug and a stop). With Dacity Cat and Lucia the Baddie, four h5 legs sold rugs at 0.03–0.10. A reason for every book to skip the operator's coins (done 20 Oct 19:15 UK).
- The 27 h5 legs (0.25 SOL): 19 stops −2.769 SOL, 7 timed sales +0.840, 1 floor +0.064 → −1.865 SOL (−27.6% of stake), win 19%.

## What the owner said / decided
- 19 Oct 13:48 UK: add G (and F) straight into shadow, as the study suggested.
- 19 Oct 19:56 UK: give G the 5-min exit (the study's F4 suggestion).
- 20 Oct 05:00 UK: "remove what isn't working" — G to paper and off the page.

## Open items
- PROPOSAL (21 Oct rev): RETIRE — stop G as a book; the page's 150+-wallet skip stays — exit x_h5 — n120 -3.1% (no-best -8.2%) thirds +16.5/-21.0/-4.9 luck 1/20 — UNPROVEN — the only luck-clearing find is an hour-of-day pair on 15 trades carried by four coins (+3% without the top three) from a search whose shuffled runs give +27–87%; F4 and the runner both failed in shadow.
- awaiting go: retire from the page.
- None. F4 is closed as "does not hold up". The page's 150+-wallet skip stays.
