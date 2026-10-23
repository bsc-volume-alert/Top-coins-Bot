# B — A's coins sold at 5 minutes (hold-5)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- No strategy of its own: B is A's paper rows (`p5e30`, passed) scored on the exit column `x_h5`. Executor book `hold5` (exit `h5`) — OFF (paper) since about 16:00 UK 19 Oct. Off the page since 20 Oct 05:19 UK (v0.18.148); shown in the combined 12-h strip as "B (A's coins, sold at 5 min)" (off-page, v0.18.161/168).
- Entry: exactly A's (30 SOL bought in 60 s, MC under $100K, ≥ 60 s old, buys ≥ sells, ≥ 10 buyers, A's four skips; operator fingerprint coins excluded from 20 Oct 19:15 UK). See A.md.
- Exit `x_h5`: −40% stop until the coin reaches 1.5x; once 1.5x is seen a floor at 1.3x; whatever is left is sold at 5 minutes. No volume rule, no cap. Sub-reasons stop / floor / time. A floor sale counts as such when peak ≥ 1.5 and 0.62 < x ≤ 1.32 (ex_h5_why = floor).
- Started: hold-5 recorded and retro-scored from 18 Oct 01:10 UK (v0.18.81); headline exit 18 Oct 19:53 UK → 19 Oct 02:04 UK; page record from the price fix 18 Oct 20:25 UK. No rule change since.

## Verdict now
**21 Oct 02:30 UK:** Dominated by A's own exit on the same coins. Dead.

**21 Oct 11:05 UK (revision search, data to 10:36 UK):** confirmed dead. On the identical 370 rows the 5-min sale is behind A's runner in all three thirds and in the last 24 h (−5.3% vs −2.4%); the search is A's search (same rows), 0 real. Retire; keep the column as the recorded 5-min comparison.

Not working, and worse than A on the same coins in every window: −4.8% a trade on 284 at the 17:40 UK study (A −2.4%), −5.8% on 336 to 21 Oct 00:09 UK; real money lost −0.301 SOL on 50 live legs and −0.711 SOL on 65 shadow legs. Kept only as a recorded comparison.

## Latest numbers
<!-- NUMBERS -->
_Data to 23 Oct 07:09 UK; A's coins sold at 5 min. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:25 UK) | 631 | -4.9% | -6.1% | 49% | 34% | -3.73 |
| last 24 h | 125 | +1.8% | -4.5% | 49% | 32% | +0.10 |
| last 12 h | 58 | -5.7% | -10.3% | 45% | 40% | -0.39 |
| last 6 h | 28 | -16.1% | -20.0% | 39% | 50% | -0.48 |

Executor book `hold5` (shadow, real quotes): 65 legs, -0.711 SOL, average -7.4% a leg, without best -9.6%, won 43%, 18 Oct 20:25 UK to 19 Oct 15:59 UK.
Executor book `hold5` (live, real quotes and real money): 50 legs, -0.301 SOL, average -8.6% a leg, without best -11.7%, won 42%, 19 Oct 00:34 UK to 19 Oct 09:08 UK.
<!-- /NUMBERS -->

## Change history
- 18 Oct 01:10 UK (v0.18.81): P5 deviations — the Hold-5 exit recorded on every P5 trade and retro-scored on earlier ones from their 30 s–10 min marks (approximate).
- 18 Oct 13:29 UK (v0.18.87): sell-rules box; sister exits x_h15 (hold-15) and x_h5fast recorded; x_h5f14 (floor 1.4x) and x_h3 (3-min) also on the rows.
- 18 Oct 19:53 UK (v0.18.93): hold-5 becomes P5's headline exit (its pre-registered test passed); runner the challenger.
- 18 Oct evening: the executor (v0.18.90, built 16:15 UK; first shadow hour 18:44 UK) follows the headline — book hold-5 in shadow at 0.1 SOL; legs counted from 20:25 UK: 32 shadow legs to 00:17 UK, −0.001 SOL.
- 19 Oct 00:34 UK: hold-5 LIVE at 0.1 SOL (owner, 00:29 UK, wallet funded to ~0.9 SOL; "let it run overnight" despite the first live trades losing). 19 legs at 0.1 to 02:33 UK, −0.160 SOL.
- 19 Oct 02:04 UK (v0.18.103): demoted — on corrected prices the runner beat hold-5 on the same 44 trades (+0.22 vs −0.12 at the page stake), both halves.
- 19 Oct 02:16 UK (executor v0.2.0): runner and hold-5 live side by side (owner ~02:00 UK). Hold-5's live stake is 0.05 SOL from 02:54 UK (31 legs to 09:08 UK, −0.140 SOL). The owner's stated plan was 0.1 each; why B dropped to 0.05 is not recorded.
- 19 Oct ~09:08–10:27 UK: hold-5 leaves live (last live leg opened 09:08 UK; per-book modes arrived at 10:04 UK, v0.18.111). Shadow at 0.05 from 10:27 UK (16 legs to 14:12 UK, −0.126). Reason for leaving live not recorded; live total by then −0.301 SOL on 50 legs.
- 19 Oct ~14:15 UK: shadow stake 0.25 (17 legs 14:17–15:59 UK, −0.584 SOL).
- 19 Oct 13:28 UK study: "B and C should be switched off outright — they only add fees."
- 19 Oct between 15:59 and 17:08 UK: executor book hold5 switched OFF (paper) by hand. No reason recorded.
- 19 Oct 11:25 UK (v0.18.117): B's leg on a shared coin gets its own columns (legB_*) in abcd.csv.
- 19 Oct 20:01 UK (v0.18.142): B out of view in the wallet box while on paper (still recorded).
- 20 Oct 05:19 UK (v0.18.148): B off the page (owner, 05:00 UK: "remove what isn't working").
- 20 Oct 16:25–19:05 UK: hold-exit save bug — x_h5 (and x_h5f12/f14, x_h3, x_h15, x_h5fast) not saved on A rows in that window (fixed v0.18.163). Treat B's figures for trades in that window as incomplete.
- 20 Oct 18:24 UK (v0.18.161): off-page box shows B at 5 min, last 12 h; 19:25 UK (v0.18.168) folded into the combined 12-h strip.

## Ideas tested
- Hold-5 vs runner (pre-registered, 19 Oct 02:04 UK): runner +0.22 vs hold-5 −0.12 on 44 → runner headline. Every later study agrees: 13:28 UK 19 Oct paper −4.9% vs +0.1% (100); 17:41 −5.5% vs −1.3% (128); 21:40 −6.0% vs −1.6% (152); 01:45 −6.0% vs −2.6% (194); 05:35 −5.2% vs −2.9% (221); 09:35 −4.9% vs −2.6% (240); 13:35 −5.1% vs −2.9% (259); 17:40 −4.8% vs −2.4% (284).
- Sell at 3 min instead of 5 (study rule S1 on A's coins): failed, −6.4% on 193 OOS = baseline. Path-priced 3-min −6.5% vs 5-min −12.1% on traced fires (17:41 UK 19 Oct).
- Floor at 1.4x instead of 1.3x (x_h5f14): −2.0% vs −4.9% (100, 13:28) and −3.7% vs −5.3% (128, 17:41) on paper — a little better than 1.3x, still negative; not adopted.
- Sell at 15 min: −6.3% (100) / −7.5% (128). Worse.
- Real-cost check on floor sales: PumpSwap floor exits are 5–9 points kinder on paper than real (16–32 legs, 01:45–17:40 UK studies) — the standing softness that matters most for B-style books with a 1.3x floor.
- G's coins (A's 150–500-wallet skips) sold at 5 min (F4) — failed; see G.md.
- E sold at 5 min (study rule S4) — failed; see E.md.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/B.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 331 trades −6.1% (no-best −6.8%), −1.05 SOL a day at 0.1. Same coins as A sold at 5 min — worse than A's runner exit in all three thirds (−6.6/−6.8/−4.7 vs −2.7/−5.1/−3.6). Factor search 11 pass vs 6 by luck, none real (best luck 7).

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_B.md):
  - Book now: 370 trades −6.6% (no-best −7.2%), 48% won, 36% stopped, thirds −7.6% / −6.8% / −5.3%, last 24 h 134 at −5.3%, 143 a day, −1.08 SOL a day at 0.1.
  - Winners and losers: the same coins as A (see A.md — nothing at entry separates them). B's losers are A's losers plus the runners sold at 5 min: on the same 370 rows A's runner is −3.8% vs B −6.6%, ahead in every third (−4.0 / −5.8 / −1.5 vs −7.7 / −6.7 / −5.2) and in the last 24 h (−2.4% vs −5.3% on 134).
  - Exit verdict: the 5-min sale is the 8th-best of 12 exits on these rows; t15s40 (−4.1%), the runner (−3.8%) and t2s40 (−4.5%) all beat it; none is positive.
  - Factor / pair verdict: identical to A's (same rows): 259 pass, **0 beat luck**; best candidate sell60 < 22.8 AND max_share ≥ 0.1438 on x_split, luck 11/20 — i.e. not a 5-min rule at all.
  - Proposed revised rule: **no profitable version found.** B is dominated by A's runner on the same coins; any "sell at 5 min" idea on A's coins has now failed on 370 rows, in live money (−0.301 SOL on 50 legs) and in shadow (−0.711 SOL on 65).

## Notable coins
- The french savior (18 Oct 20:25 UK) — the first shadow hold-5 leg in the export (+17% at 0.1, lowvol close).
- 19 Oct live night: 50 legs — 22 timed h5 sales −0.176 SOL (exit gap −1.2%), 10 "time" sales +0.063, 9 stops −0.247 (exit gap −5.5%), 8 floor sales +0.036 (exit gap −6.0%), 1 tsl80 close +0.023. Entry gap +1.7%. Paper on the same 50 at 0% cost was +0.041 SOL: fees and fills turned a flat book into −0.301.

## What the owner said / decided
- 18 Oct: P5 is the winner; test small deviations (hold-5 was one).
- 19 Oct 00:29 UK: went live on hold-5 at 0.1 SOL; let it run overnight; next step a review of live-vs-paper fills before raising the stake.
- 19 Oct ~02:00 UK: run runner and hold-5 live side by side rather than choose from paper.
- 20 Oct 05:00 UK: remove what isn't working — B off the page.

## Open items
- PROPOSAL (21 Oct rev): RETIRE — B stops being a book; x_h5 stays recorded on A's rows as the 5-min comparison — exit x_h5 — n370 -6.6% (no-best -7.2%) thirds -7.6/-6.8/-5.3 luck 11/20 — UNPROVEN — dominated by A's runner on the identical coins in every third and in the last 24 h; the search is A's and finds nothing beyond luck.
- awaiting go: retire from the page (data kept).
- None. B stays recorded as the 5-min comparison for A and its children; any new 5-min idea on A's coins should be compared against B's record first.
