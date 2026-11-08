# Round 2 — Phase B cross-critique (analyst: Claude "Fable"), 8 Nov 2026 ~17:30 UTC

Read: `ROUND2_codex_REPORT.md` and `codex_r2/` (explore.py, PROTOCOL.md, early_selection.json, results) on `blind-codex-r2-8nov`.
**Gemini's `ROUND2_gemini_CRITIQUE.md` was not present on `tracker` (or any branch) when this was written**; this critique covers Codex's report and my own. I will add a short addendum if Gemini's file appears before the phase closes.
My Phase A report is unchanged; this file is additive. Reproduction code: `fable_r2/repro_codex.py`.

## 1. Reproduction of Codex's headline numbers (my engine, raw data)

Setup matched to Codex: six outages (the manifest's five plus their inferred 6 Nov 21:40–21:45), split at 7 Nov 01:50 UTC, decision at creation+30 s on received trades only, P5 as coded in `explore.py` (last received trade curve and valid; gross curve buys ≥ 15; ≥ 20 buying wallets; A = net in (t−15, t] ≥ 3 and A ≥ 1.5·B with B = net in (t−30, t−15]), fill at t+1.0 s, sale on the state as of t+60 s exactly.

| | Codex | Fable engine |
|---|---|---|
| N early / late | 1,593 / 2,045 | **1,593 / 2,045** |
| not-retained streams / outage-excluded / contradictory mints | 301 / 974 / 5 | 301 / 974 / **4** |
| ID 34 attempts early / late | 35 / 46 | **35 / 46** (scored 35 / 45, 1 unknown = exit capture gap) |
| 0.2 early: net, mean, median, win, without best | +0.480222, +6.86 %, +2.00 %, 51.43 %, +0.108426 | **+0.480222, +6.8603 %, +1.9960 %, 51.43 %, +0.108426** |
| 0.02 early: net, mean, median, win | +0.006985, +1.00 %, −3.99 %, 45.71 % | **+0.006985, +0.9978 %, −3.9893 %, 45.71 %** |
| 0.2 late: net, lower, mean, median, win, worst | −1.119884, −1.321384, −12.44 %, −9.00 %, 31.11 %, −91.50 % | **−1.119884, −1.321384, −12.4432 %, −8.9987 %, 31.11 %, −91.50 %** |
| 0.02 late: net, mean, win, worst | −0.166343, −18.48 %, 26.67 %, −98.16 % | **−0.166343, −18.4826 %, 26.67 %, −98.16 %** |
| point SOL per launch, 0.2 early / late | +0.000301458 / −0.000547621 | **+0.000301458 / −0.000547621** |

Everything reproduces to the printed precision. The one difference (4 vs 5 mints with a block-time contradiction in event order) is immaterial — none was an ID 34 attempt in either count. Codex's numbers are correct.

## 2. Errors, unrealistic assumptions, look-ahead in Codex's report

I found no look-ahead and no arithmetic error. The report is careful and its conclusion ("none supported") is right. The issues are about provenance, design power and interpretation:

1. **"Documented tracker outage" for 21:40–21:45 on 6 Nov is not documented anywhere in the package.** The manifest lists five outages; Codex's `explore.py` adds a sixth labelled `documented_tracker_outage`. The only evidence is a bare `connecting/open/subscribed` at 21:45:43 in `feed_gaps_all` with no preceding close — consistent with a process restart of unknown length. The inference is reasonable (I would adopt it), but the label and the report's wording ("excluded by documented outages") overstate it. Effect: removes 55 launches created 19:40–21:45 from N (3,693 → 3,638). No effect on ID 34's attempts.
2. **The search had no power to find anything.** 72 cells, decision ages ≥ 15 s, six demand predicates; the winner reached 35 attempts (1.9/hour). With the whole-universe base rate at −5 % to −10 % at 30 s, a 35-entry cell cannot separate +7 % from noise, and the selection step ("the only cell with positive lower totals at both sizes") is the maximum of 72 noisy draws. Codex says as much; but the report frames the late-half loss as a *test of a candidate* when it is better read as the expected regression of a noise maximum. In the test window (two days, ≈ 100 attempts) this rule could not have been supported even if real.
3. **A ≥ 1.5·B is not an "acceleration" test.** When B ≤ 2 SOL (most launches at 15–30 s), any A ≥ 3 passes; the predicate collapses to "net ≥ 3 SOL in the last 15 s and ≥ 20 buyers". Codex discloses "B need not be positive", but the report's framing ("Is acceleration independent demand or coordinated recycling?") treats it as an acceleration signal it mostly is not.
4. **Regime is absent from the report.** Splitting at 01:50 puts all of 7 Nov in "late", and the late half contains the only positive stretch in the data (7 Nov 09:00–18:00; see my Phase A §3). ID 34 lost money *inside* that stretch too (per 3-h bucket: −20 %, −6 %, −25 %), which is informative: entering 30 s in, after a 15-s burst, is buying the top of the burst. The report does not look at time-of-day structure at all, so it cannot tell a regime effect from a rule effect — the same weakness my own candidate turned out to have (§3 below).
5. **Instant-graduation artefact not examined.** Codex's predicates incidentally dodge it (the "last received state must be curve" condition excludes launches already on the pool at 30 s), so ID 34 is clean. But the P0 baseline cells in the leaderboard and any retention-time rule are exposed to the +178× mis-decoded pool states (my Phase A §6), and the report's "Selected-candidate … matched frozen run_launch" verification does not cover that failure mode because run_launch has it too. Worth stating, since Codex's verification wording could be read as a validation of the evaluator.
6. **Capital figures are planned, not realised.** "Peak planned stake 0.40 SOL, stake-hours 0.11" assume the 60-s exit lands; the one unknown exit (capture gap) is carried at scheduled release. Disclosed, minor.
7. **Minor:** the report says both pool-fee scenarios give identical results "because all scored fills and exits were curve states" — true for ID 34 but the pool sensitivity is then not a sensitivity; and `bootstrap()` draws 10,000 means in 100×100 blocks from one generator, which is fine but is not "10,000 NumPy launch resamples" in the usual sense (equivalent in distribution).

Nothing above changes Codex's conclusion. If anything, (2) and (4) make it stronger.

## 3. What I would revise in my own Phase A report after reading Codex's

1. **My candidate FTC-R0 is a regime artefact.** Checked after reading Codex's regime-free framing and noticing the gap: inside 7 Nov 09:00–18:00, FTC-R0 (first-time creator, retention entry, hold 30 s, 0.2 SOL) is +8.6 % (n = 630); **outside that stretch it is +0.1 % (n = 1,696)**. Under Codex's 01:50 split it is +1.1 % / +3.7 %, which looks "positive in both halves" only because the late half holds the good stretch. My §4 should say so plainly: the first-time-creator filter removes a −13 % group, and what remains is zero outside one nine-hour window.
2. **My halves were not a clean find/check split.** Codex fixed the grid and the selection rule before any outcome and computed late-half results for one cell only. I looked at both halves of ~430 cells while exploring, so my H1/H2 agreement is in-sample for the search and my bootstrap intervals are optimistic. I should label the Phase A tables "exploration on both halves" rather than imply out-of-sample confirmation.
3. **Adopt the sixth outage** (21:40–21:45 inferred from the bare reconnect) in the universe, with its source stated; N becomes 3,638. None of my conclusions move.
4. **Add the contradiction/hypothetical audit** Codex ran (block-time order contradictions, missing-receipt rows). I had checked missing receipts (none) but not ts order within event order; 4 mints have it, none in my candidate's attempts.
5. **Keep §6 (instant-graduation artefact) as the most important item for the owner**, and add that Codex's design is immune to it only by accident of its "last state must be curve" condition — a rule-side guard everyone should carry: do not buy a curve state with vTok ≤ 279.9e12, and treat a pool price > 3× the curve ceiling within minutes of completion as invalid.
6. **Soften my §4 "latency race" claim into a data request only.** I asserted the edge "lives in the first second after retention"; given (1), the more accurate statement is that the first second is the only place that is not clearly negative, and that it is zero outside the good regime.

## 4. Should anything be frozen as the one Round 2 rule?

**Freeze "none supported".** Reasons, in order of weight:

- Two independent searches with different designs — Codex's pre-registered 72-cell grid at fixed ages, my ~430-cell exploration over retention-instant entries, event triggers, census features and exits — on the full retained universe (≈ 3,650 launches, 8 M rows) agree: no entry rule from the trade tape is positive after costs across the window. Codex's single candidate fails its untouched check (−12 % / −18 %); my best candidate is +0.1 % outside one nine-hour regime.
- The window is non-stationary at the 3-hour scale, and the one good stretch produced +4 % to +38 % cells on every strong-inflow trigger. A two-day test (10–12 Nov) will be decided by regime, not by rule; a positive result for any rule frozen now would not be evidence of a rule, and the lower-bound test with a Bonferroni factor for three analysts' submissions is not reachable at the trade counts and dispersions seen (ID 34: ≈ 100 attempts/2 days; FTC-R0: ≈ 3,000 attempts/2 days with σ ≈ 0.5 → a 5th-percentile bound needs a true mean above ~+1.5 % that the data outside the regime does not show).
- The evaluator artefact (§2.5 / Phase A §6) means any rule that can enter instant-graduation launches at retention can be "supported" by bad data; freezing such a rule would risk a false positive that then drives live money.

If the owner nevertheless wants a forward test rather than a null, the least-bad use of the test window is not a rule but a **measurement**: a handful of real 0.02 SOL buys sent at receipt of the 15-SOL trade (data request 2 in my Phase A report), because the 1.0-s landing assumption is the one thing that decides whether the retention-instant region is ≈ 0 or clearly negative, and no replay can answer it.

My Round 1 freeze (MIG300) stands as frozen; I do not reopen it here.
