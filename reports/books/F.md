# F — A's trigger when the launch bundle was 3 wallets or fewer ("small")
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- No strategy of its own: F is A's passed paper rows (`p5e30`) where the coin's launch bundle had ≤ 3 wallets (`tokens.bundle_wallets`), scored on the runner `x_flow4`. Executor book `small` (exit `flow4`) — OFF (paper) since 20 Oct 05:19 UK (migration m042). Off the page (out of view since v0.18.148).
- Entry: A's trigger and skips (see A.md) + bundle_wallets ≤ 3 (known at the trigger). Operator coins excluded from 20 Oct 19:15 UK (they have 10 bundle wallets, so F never took them anyway).
- Exit: A's runner (−40% stop until 1.5x; hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x).
- Started 19 Oct 13:53 UK (v0.18.124 / executor v0.3.4, owner 13:48 UK); it could not trade until the 19:39 UK fix (v0.18.141). Rule unchanged since.

## Verdict now
**21 Oct 02:30 UK:** Dead.

**21 Oct 11:05 UK (revision search, data to 10:36 UK):** still dead. +0.9% on 126 is −1.3% without its best trade; the second third was −12.0%; 0 of 380 passing candidates beat luck, and on 126 trades the search's luck base is +24% to +68% per run — nothing found on F can be believed. The last-12-h +24.2% on 21 is the same kind of swing that made F1 look good on 19 Oct.

Failed. It was the 13:28 UK 19 Oct study's best find (+18.4% on 33, 85% won) and went −10% to −17% out of sample (study rule F1: −10.2% on 64 against 0.0% for the rest of A at 17:40 UK 20 Oct). Its 22 real-quote shadow legs lost −1.097 SOL (−20% of stake).

## Latest numbers
<!-- NUMBERS -->
_Data to 22 Oct 05:04 UK; A with launch bundle <= 3 wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:25 UK) | 161 | +1.3% | -0.4% | 52% | 34% | +0.05 |
| last 24 h | 37 | +5.8% | -1.7% | 57% | 35% | +0.18 |
| last 12 h | 23 | +1.6% | -1.6% | 61% | 35% | +0.01 |
| last 6 h | 15 | -9.2% | -14.7% | 47% | 47% | -0.15 |

Executor book `small` (shadow, real quotes): 22 legs, -1.097 SOL, average -19.9% a leg, without best -23.5%, won 32%, 19 Oct 21:25 UK to 20 Oct 05:14 UK.
<!-- /NUMBERS -->

## Change history
- 19 Oct 13:28 UK study: F1 found and registered (A's coins with bundle_wallets ≤ 3: n33 +18.4%, win 85%, 12% stopped, vs n67 −9.0%); recommended as a 0.05 SOL shadow book, and as the filter for any live calibration leg once it had 20 OOS trades.
- 19 Oct 13:53 UK (v0.18.124 / executor v0.3.4; owner 13:48 UK, on the study's recommendation): book F in shadow at 0.05 SOL, runner exit; per-book `take()` predicates; legF_* columns in abcd.csv.
- 19 Oct 14:09 UK (executor v0.3.5): per-book stats for F and G (the stats filter only knew A–D).
- 19 Oct 16:08 UK (v0.18.134): F's paper record shown in the box at any stake (scored on A's rows).
- 19 Oct 17:41 UK study: F had NO legs at all — flagged.
- 19 Oct 19:39 UK (v0.18.141): bug fixed — the coin lookup behind A's trigger did not read bundle_wallets, so F's ≤ 3 rule always saw null and never bought.
- 19 Oct 19:45–21:25 UK: still no legs, legitimately — no passed A coin in that window had ≤ 3 bundle wallets.
- 19 Oct 21:25 UK – 20 Oct 05:14 UK: 22 shadow legs, all at 0.25 SOL (the shadow stake had been raised to 0.25 around 14:15 UK 19 Oct; who/why not recorded), −1.097 SOL.
- 20 Oct 01:45 UK study: "switch G and F off shadow — they are costing nothing real but no longer telling us anything a paper row doesn't".
- 20 Oct 05:19 UK (v0.18.148 / executor v0.4.2, migration m042): F back to paper ("losing at real prices"); out of view on the page (owner, 05:00 UK: "remove what isn't working").

## Ideas tested
- F1 in sample (13:28 UK 19 Oct, 100 A trades): +18.4% on 33 vs −9.0% on 67; held at the real 5-s fill (+13.9%, win 76%), in 10 of 13 hours, on D's (mostly the same) coins (+13.2% n27 vs −8.7% n53) and on A's skipped coins (+2.5% vs −8.2%); failed on E (bundle runs the other way) and on C. Found by scanning ~70 features.
- F1 out of sample (A passed rows, runner): −10.1% (9, 17:41) → −16.5% (18, 21:40) → −16.9% (30, 01:45) → −17.5% (39, 05:35: "does not hold up", 23 points behind) → −15.0% (45, 09:35) → −13.4% (50, 13:35) → −10.2% (64, 17:40) vs about 0% for the rest of A each time.
- Paper F since the bug fix (19 Oct 19:45 UK): −19.9% on 13 (01:45) … −8.6% on 47, win 47%, stop 36% (17:40), against −0.2% for the rest of A.
- The F leg filled later than A's leg on the same trigger (presumably waiting for the bundle lookup): entry gap median +3.4% to +3.7%, 9 of 21 legs paid 5–26% over paper — the worst entry gap of the PumpSwap books.
- Related cuts: bundle % < 28 on A (+10.0% vs −10.3% at 13:28; +4.0% vs −7.2% at 17:41) — same family, not registered. D with bundle_wallets ≤ 2 (+8.2% on 57 at 17:40 UK 20 Oct) — 43 of 44 are A's bundle-≤2 coins, where it failed; not registered.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/F.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 116 trades −1.9% (no-best −2.9%); first third +13.4% then −15.8% / −3.4%. 18 pass vs 46 by luck — nothing. Confirms the 19 Oct out-of-sample failure of bundle ≤ 3 wallets (and is the mirror image of AS2/AS3's bundle ≥ 2/5 finding).

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_F.md):
  - Book now: 126 trades +0.9% (no-best −1.3%), 52% won, 33% stopped, thirds +11.8% / −12.0% / +3.0%, last 24 h 48 at +4.4% (no-best −1.4%), 49 a day, −0.00 SOL a day at 0.1. Shadow: 22 real-quote legs −1.097 SOL.
  - Winners as a group (13 big, 52 small): median entry MC $44–47K, bundle 9–17% from 2 wallets, creator bought 0.25–1.0 SOL, 46–69% with socials. Losers (20 small, 41 stopped): $45–48K, bundle 11–15% from 1 wallet, creator bought 1.9 SOL, 65–73% with socials. The big winners' creator bought less (0.25 SOL median) — the "creator bought < 0.9 SOL" idea already listed on AS; on F it is the search's pick and luck 20/20.
  - Exit verdict: split +3.9% (no-best +1.0%, thirds +8.2 / −0.3 / +3.8), t15s40 +0.4%, flow4ff +1.3%, runner +0.9% (current, no-best −1.3%), everything else negative. Nothing positive without its best trade in all three thirds.
  - Factor / pair verdict: 1,205 filters × 12 exits + 336 pairs; 380 pass; **0 beat luck** — shuffled outcomes produced +24% to +68% in every one of 20 runs, the highest luck base of the A-family books (126 trades, many columns). The pick, creator bought < 0.86 SOL on x_split: 43 trades +26.7% (no-best +18.5%), luck 20/20.
  - Proposed revised rule: **no profitable version found.** F1 is closed; small-bundle filters on A failed out of sample twice; the AS2/AS3 finding runs the other way (bundle 2+/5+ wallets).

## Notable coins
- MrDuck (+14% entry gap), PackPump (+26%), Trump Accounts (+14%), LOTTO (+10%), Quinelings (+7%) — F legs that paid well over paper (19–20 Oct night).
- American Dream (sold at 0.20) and LOTTO (0.08) — two of F's 11 shadow stops were rugs.
- The 22 legs: 7 fade-volume winners +0.489 SOL, 11 stops −1.455, 4 low-volume closes −0.131.

## What the owner said / decided
- 19 Oct 13:48 UK: add F (and G) straight into shadow, as the study suggested.
- 19 Oct 15:48 UK: standing rule — every new analysis "straight onto shadow".
- 20 Oct 05:00 UK: "remove what isn't working" — F to paper and off the page.

## Open items
- PROPOSAL (21 Oct rev): RETIRE — stop F as a book (executor book `small` stays off; rows are A's) — exit x_flow4 — n126 +0.9% (no-best -1.3%) thirds +11.8/-12.0/+3.0 luck 20/20 — UNPROVEN — F1 failed out of sample, no exit is positive without its best trade, and on 126 trades the search's luck base is +24–68%.
- awaiting go: retire from the page.
- None. F1 is closed as "does not hold up". Do not re-test small-bundle filters on A without reading this file; the D version (≤ 2 wallets) is the same coins.
