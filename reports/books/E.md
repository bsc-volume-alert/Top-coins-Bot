# E — the $100K-in-5-minutes core momentum trigger (and E2)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `momentum` (rows with `core = 1`), page letters E and E2. Paper only — there has never been an executor book for E or E2. Both off the page since 20 Oct 05:19 UK (v0.18.148); E is in the combined 12-h strip as "E" (off-page, scored at the runner).
- E entry (src/momentum.js): a PumpSwap coin with $100K or more traded in the last 5 minutes (`vol5m` trigger), entry market cap under $100K (`MOM_CORE_MC`), first entry (not a re-entry), coin ≥ 60 s old, 5-min buy $ ≥ sell $, ≥ 10 swaps from ≥ 5 wallets, any age (v0.18.11). The data set's only skip for E is bundled ≥ 70% (p5data.js); E2's take/skip also uses the website's pass flag.
- E2 entry (v0.18.137): E, but skip a coin whose MC is already ≥ 1.2x the MC at which A / C / D / 80 (or A5/F6) first bought it. Judged from 19 Oct 16:45 UK (`E2_FROM`); the 18 Oct 20:25 – 19 Oct 16:45 UK trades are its back-test.
- Exits recorded: runner `x_flow4`, 5-min `x_h5`, 3-min, 1.5x/−40%, 2x/−40%, ½ at 2x + 40% trail. E2's page box was the 5-min sale (`x_h5`); the off-page strip scores E at the runner.
- Started: the core trigger 13 Oct (v0.5.0 momentum); as book E in the data set 19 Oct 11:18 UK (v0.18.115); E2 19 Oct 16:40 UK. Last rule change: E2, 19 Oct 16:40 UK.

## Verdict now
**21 Oct 02:30 UK:** Losing overall; one real-looking slice (core $100K-volume triggers) that has only paid recently.

**21 Oct 11:05 UK (revision search, data to 10:36 UK):** two things. (1) DATA PROBLEM: numbers.py's "E" (520–523 rows) is 158 abcd core rows PLUS all 365 others.csv `momentum` rows — the 158 are in both (same ids), and 206 of the 365 are NOT book E (entry MC ≥ $100K, median $132K, −13.8%). The true, deduplicated E is 159 core rows at −4.5% on the runner (no-best −6.3%), negative under every exit. (2) The family's only profitable slice is "young and cheap" — coin under ~6 min old, entry MC under ~$76K, i.e. a coin that graduated minutes ago and immediately did $60–100K of volume. It is positive on every tier, but its size and best exit swing with the tier and the exit (E's rows: +2.8% at 1.5x-out, +13–16% on trailing/2x exits; mom80's rows: +10.9% at 1.5x-out, +4.5% on the trail), and the graduation books buy 57 of the 86 mom80-slice coins a median 144 s earlier at 1/1.45 of the price. E's own entry ($100K) is the latest and dearest of the three tiers on the same coins. Switch E off as a book; the family's one forward test goes on mom80 (OFFPAGE.md).

Not working: E lost under every exit once past its first 31 trades (runner −6.4%, 5-min −5.1% on ~77 at 17:40 UK 20 Oct; −8.2% on 449 abcd rows to 21 Oct 00:09 UK — see the count note under Open items). Its registered 5-min rule (study S4) failed at −14.7% on 44 OOS. E2 took 20 trades since 19 Oct 16:45 UK at −8.8% (the 7 that passed the page filters −29.5%) — nothing in it to want.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; abcd momentum rows. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:28 UK) | 542 | -8.0% | -8.5% | 37% | 47% | -4.87 |
| last 24 h | 171 | -0.1% | -1.8% | 39% | 42% | -0.19 |
| last 12 h | 77 | -1.5% | -5.2% | 36% | 48% | -0.19 |
| last 6 h | 36 | +1.8% | -2.2% | 39% | 39% | +0.03 |
<!-- /NUMBERS -->

## Change history
- 13 Oct 20:01 UK (v0.5.0): momentum strategy — PumpSwap 5-min / 1-min volume alerts ($100K), paper trades with several exits.
- 15 Oct (v0.18.4 / v0.18.7 / v0.18.9 / v0.18.10 / v0.18.11): "core" tag = $100K/5-min trigger below $100K MC, first entry; flow exit (hold after 1.5x while volume and buyers persist, −40% stop) and its 4x cap — the runner's origin; any coin age.
- 16 Oct 22:06–22:16 UK (v0.18.33 / v0.18.34): Project 1 (core trigger, stock-quoted pool OR MC < $47K, 1.5x/−40%) and Project 2 (runner exit) filtered and pre-registered. Owner, 16 Oct: chose Project 2 (core entry, hold while volume stays strong, sell at 4x, −40% stop) as the main strategy.
- 17 Oct 11:43–11:55 UK (v0.18.55 / v0.18.56): 1A (minus 70%+ bundled), 1B (SOL-paired, < $47K, not bundled), 2A/2B (their coins, runner exit).
- 18 Oct 12:25 UK (v0.18.86): Projects 1A/1B/2A/2B retired from the website — deep dive: P5's coins are the same coins bought ~3 min later, no exit pays, the filters were fitted. Owner agreed ("worthless on the data"). The trigger kept recording.
- 19 Oct 11:18 UK (v0.18.115): book E joins the A–D data set (owner asked for the old $100K family in the research as E), with the same pre-trigger features and trace.
- 19 Oct 12:45Z (13:45 UK): study rule S4 = E sold at 5 min, registered for the owner (+8.8% on 31).
- 19 Oct 16:30 UK (v0.18.135): E back on the page as a paper book (owner, 16:25 UK), with E / E runner / 1A / 2A / 1B / 2B rows on the old filters; shadow/live disabled (no executor book).
- 19 Oct 16:40 UK (v0.18.137): E becomes E2 on the page (owner, 16:38 UK). Reason (code): 39 of 42 E coins were A's coins ~3 min earlier; the E trades already ≥ 1.2x above A's first buy won 33% of 21 at −23% a trade, the rest 70% of 21. Back-test and old E shown alongside.
- 20 Oct 05:19 UK (v0.18.148): E and E2 dropped from the page (owner, 05:00 UK: "remove what isn't working").
- 20 Oct 18:24 / 19:25 UK (v0.18.161 / 168): E in the off-page box, then the combined 12-h strip, at the runner.
- 20 Oct 19:15 UK (v0.18.164): operator fingerprint coins left out of every book's record except S10's.

## Ideas tested
- Exits on E (13:28 UK 19 Oct, 31 trades, old cost model): runner +5.3%, 1.5x/−40% −0.1%, 5-min +8.8%, 3-min +5.0%, 2x/−40% +3.9%, ½ at 2x + trail +6.4%. 17:41 UK (40): runner −1.5%, 5-min +3.0%, 3-min −0.2%, 1.5x/−40% −2.3%, 2x/−40% +2.0%.
- E sold at 5 min (study rule S4): OOS −15.8% (9) → −10.1% (19) → −9.2% (33) → −11.9% (38) → −15.5% (43, "does not hold up") → −14.7% (44), stop 50%.
- E over time (runner / 5-min, real costs from 21:40 UK): +0.3% / +1.0% (50); −0.2% / −1.0% (64); −3.6% / −2.7% (69); −6.9% / −5.4% (74; its last 5 passed trades all stopped); −6.4% / −5.1% (77 / 75).
- The owner's old filters as E rows: 1A/2A (stock-paired or MC < $47K) runner +3.2% on 14 (13:28), −1.2% on 18 (17:41); 1B/2B (SOL pool, MC < $47K, not bundled) runner +23.1% on 8, then +21.5% on 9 with 1.5x/−40% +7.8% (17:41). "Nine trades say nothing; 1B is the one worth watching" — never reached a decision; E dropped from the page.
- Bundle on E runs the opposite way to A: bundle < 28% −10.1% (18) vs +26.7% (13) (13:28 UK) — "the bundle tell is not universal".
- F1 (bundle ≤ 3 wallets) fails on E (13:28 UK).
- E2 (skip coins ≥ 1.2x above A/C/D's first buy): in sample (whole file) taken n21 +25.4% vs skipped n26 −15.4% (21:40 UK); n29 +12.4% vs n35 −12.2% (01:45 UK). Forward from 16:45 UK 19 Oct: 2 closed, both stopped (21:40); 6 taken −26.0%, 4 stopped, while the 18 skipped would have made −1.3% (01:45); unchanged at 05:35; 11 taken −8.8% (the 6 that passed the page filters −26.0%; 4 new takes all filter-skipped coins, all up) (09:35); 19 taken −7.8% (the 7 passed −29.5%, 5 of 7 stopped), 36 skipped −10.6% (13:35); 20 taken, 19 closed −8.8% at 5 min, the 37 skipped −10.2% (17:40). Verdict: nothing in it to want.
- The broader lesson (18 Oct deep dive and the 17:41 UK 19 Oct "$5K → $200K" study): volume arrives with the move rather than ahead of it; by the time the 5-min volume says "winner" the price already says $100K. E's trigger is A's coin ~3 minutes later.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/E.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 458 trades −8.0% (no-best −8.6%), −1.86 SOL a day. Real by the luck test: 5-min volume ≥ $100K at entry — 80 trades +10.7% (no-best +7.4%), luck 0 — BUT by thirds −0.1% / +0.8% / +28.8%: all the profit is in the last third. Entry MC < $60K: 115 trades +7.3%, luck 1, thirds +17.3 / −5.9 / +5.5. Off-page `momentum` shows the same (vol ≥ $100K 48 at +17.2%, luck 1, again last third only).

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_E.md; scratch /tmp/claude-0/-home-claude/b095fca5-f260-503e-ace1-32c9da5e522a/scratchpad/rev_a/mom1-4.py):
  - **Population first (data problem).** rev_E.md and the NUMBERS block count 523 "abcd momentum rows": that is 158 abcd rows + 365 others.csv `momentum` rows, and every one of the 158 is also among the 365 (same ids). 206 of the 365 are non-core (entry MC ≥ $100K, median $132K, −13.8%) and are not book E. So rev_E.md's search, thirds and luck ran on a population with 158 duplicates and 206 foreign rows; its "entry_mc < $63.8K, x_h15: 175 trades +7.4%, luck 11" cannot be used. It also explains why x_tp15 is missing from rev_E.md: 365/523 = 69.8% coverage, just under revise.py's 70% bar. Deduplicated E (the 159 others.csv core rows, which carry every exit column): 159 trades −4.5% on the runner (no-best −6.3%), 39% won, 50% stopped, thirds −7.9% / −5.2% / −0.5%, last 24 h 59 at +0.3%, 61 a day, −0.34 SOL a day at 0.1. Other exits on the same 159: tsl40 −2.9% (last 24 h +11.9%), h15 −3.9%, t2s40 −5.3%, t15s40 −6.2%, h3 −6.5%, tp15 (sell all at 1.5x, no stop) −8.2%, h5 −8.5%. The 158 abcd rows agree (runner −4.8%; the 104 that pass the page's bundle filter −8.5%).
  - Winners as a group: young and cheap. The one slice that is positive on every tier of the family is entry MC < ~$76K AND age < ~348 s (the thresholds revise.py found on mom80, transferred unchanged to E): on E's 159 core rows it keeps 63 trades — tp15 +2.8% (no-best +2.2%), t15s40 +4.2%, t2s40 +12.9% (no-best +11.7%, thirds +12.9 / +7.7 / +18.1), tsl40 +15.9% (no-best +7.0%, won 40%, thirds +14.6 / +7.5 / +25.6, last 24 h 22 at +30.9%), runner +13.4% (no-best +9.2%), h15 +15.3% (no-best +3.9%). Luck for the FIXED slice on the deduplicated rows (200 shuffles): best-of-9-exits 0/200, tsl40 alone 2/200, t2s40 1/200, runner 1/200, tp15 5/200. The slice's 96 dropped trades: −14 to −17% under every exit. Inside the slice the launch bundle splits it in two: heavy-bundle launches (bundle ≥ 58%, 25 trades) pay on the trailing/2x exits (tsl40 +23.8%, t2s40 +23.9%, runner +19.2%) and lose at 1.5x-out (−5.3%); ordinary launches (< 58%, 37) pay only at 1.5x-out (+7.3%) and are about zero on the others — the heavy-bundle half is cross-book fact 1 (S8/PG/GR) again.
  - Losers as a group: everything else — a coin already ≥ 6 min old or ≥ $76K when the $100K of volume arrives (96 of 159, −14 to −17%). By the time E fires on a shared coin it is the latest and dearest of the three tiers: on the 77 coins all of mom60 / mom80 / momentum took inside the slice, median entry MC $55.5K / $57.8K / $62.4K and 1.5x-out +10.5% / +17.4% / +1.1%. And the every-graduation book bought 57 of the 86 mom80-slice coins a median 144 s earlier at 1/1.45 of the price (grad entry on those coins: 1.5x-out +33%, 95% won; tsl40 +35.9%).
  - Exit verdict: on the whole book no exit is positive; on the young-and-cheap slice the ranking flips between the tiers (E: trail/2x best, 1.5x-out worst; mom80: 1.5x-out best, trail near zero), which is what noise around a modest common edge looks like, not two different edges. "E's own abcd rows agree" with mom80 only in direction, not in the 1.5x-out figure.
  - Factor / pair verdict: rev_E.md (doubled population): 31 pass, 0 beat luck. The de-duplicated test above stands in for it: the fixed young-and-cheap slice is unlikely to be luck as a selection; the size of its edge is not established (the thresholds are mom80's local maximum — on mom80, MC < $85K instead of $76K drops the figure from +10.9% to +4.3%, age < 420 s instead of 348 s to +7.4%).
  - Proposed revised rule: **no version of E itself.** The family's one forward test is mom80's young-and-cheap slice sold at 1.5x (see OFFPAGE.md), because mom80 fires earlier than E on the same coins; E, mom60, momfast, momconf, momdip and momre should stop being shown. The owner should know that the same coins are bought cheaper by the graduation books, so this family can only be a confirmation-style entry (higher win rate, smaller gain), never the main book on these coins.

## Notable coins
- JARVIS (20 Oct afternoon) — E2 take at $83K vs A's first entry at $76K: 1.42x on the runner (+34.7%).
- Pepina (20 Oct afternoon) — E2 take at $63K vs $49K: stopped (−49.9%).
- Onion (20 Oct morning) — the one passed E2 take of the 09:35–13:35 UK window: stopped (−50.9%).
- Trumpius Maximus 1.28, MEOWAIR 1.59, no money 1.27, catos 1.29 at 5 min (20 Oct 05:35–09:35 UK) — E2 takes that the page's own filters skip (pass = 0); all four up, none buyable under the page rules.

## What the owner said / decided
- 16 Oct: chose Project 2 (the core $100K/5-min entry with the runner exit) as the main strategy; wanted ~24 h more paper data before going live.
- 18 Oct: agreed to retire 1A/1B/2A/2B from the website as worthless on the data, keeping P5 and its variants.
- 19 Oct (morning): wanted the old $100K/5-min family in the 4-hourly research as book E.
- 19 Oct 16:25 UK: E back on the page as a paper book. 16:38 UK: E becomes E2 (skip coins already 1.2x above where A/C/D bought).
- 20 Oct 05:00 UK: "remove what isn't working" — E/E2 off the page.

## Open items
- PROPOSAL (21 Oct rev): SWITCH OFF — E stops as a book (its coins are mom80's and the graduation books', bought later); the family's one forward test is mom80 + entry MC < $76K + age < 6 min, sold at 1.5x — see OFFPAGE.md — exit x_flow4 — n159 -4.5% (no-best -6.3%) thirds -7.9/-5.2/-0.5 luck 11/20 — UNPROVEN — deduplicated E is negative under every exit; the young-and-cheap slice is real as a selection but its size and exit are not settled and mom80 gets the same coins first.
- Data fix needed (awaiting go): numbers.py's E must take the others.csv core rows only (strategy momentum, core = 1), not abcd + others — the current block double-counts 158 trades and adds 206 non-core rows. revise.py/diagnose.py inherit the same population.
- awaiting go: optional paper variant E100 = E only when 5-min volume ≥ $100K, judged forward; otherwise retire. **21 Oct 11:05 UK: superseded by the proposal above.**
- None pending. E stays recorded off the page.
- Count note for whoever fills the numbers: the studies count E's PASSED rows (77 at 17:40 UK 20 Oct); reports/books/numbers.py counted 449 "abcd momentum rows" to 00:09 UK 21 Oct, and the off-page `momentum` strategy (all rows) showed 311 — three different populations. Say which one a figure uses.
