# F011 protocol — registered BEFORE any outcome is computed (run f011-20261112T225049Z)

Queue row F011 (coordinator run 6, R43; order confirmed R46): apply Codex's L005 partial-profit exit, with every parameter frozen exactly as
Codex's PROTOCOL @ 6e9db558fd1feb1745d4bd9be97c1ceb50c8166a (research-codex runs/c013-lab-20261112T151333Z, lab.py), to the 679
eligibility-E entries of f006p2 / f009 / f010 (live coin at created + 300 s: last received trade is a valid curve state and >= 5 distinct curve
buyers in the last 60 s). Entries, costs and the baseline exit are IDENTICAL to the f009/f010 CONTROL (679 attempted / 419 resolved /
-10.011572 SOL under R4; 484 scored / 195 unknown / -11.814859 under eval-1.1). The candidate differs ONLY by the partial sale and the
remaining-half trail reset.

L005 exit, transcribed from Codex's lab.py (no parameter changes):
- fill at t + 1 s (t = created + 300 s), tokens = ev.buy(fill state, 0.2 SOL, pool 55 bps); trailing high initialised as in eval-1.1 / the E
  control (first received valid state after the fill — R37: this is the E control's convention, not Codex's fill-state initialisation);
- at every received valid state after the fill (receipt order, eval-1.1 state_ok, invalid rows skipped), with the FULL position:
  proceeds = ev.sell(row, tokens, 55) - 0.0015; high = max(high, proceeds);
  (1) ordinary 30 % trail first: proceeds <= 0.70 x high -> final trigger (precedence when both fire on one row, as Codex's loop);
  (2) else, if no partial yet and proceeds >= 0.30 SOL and tr + 0.7 < t + 7200: partial trigger at tr; partial landing at tr + 0.7 s on the
      evaluator's state_at(L, tr + 0.7) (chain state at that time, capture-gap / retention / pool-capture checks unchanged); landing state
      older than 30 s, or state_at returning none -> the WHOLE outcome is uncertain ("partial: <why>"), never assumed filled or cancelled;
      on landing: cash = ev.sell(partial state, tokens/2, 55); tokens_remaining = tokens/2; the remaining half's trail high is RESET to
      ev.sell(partial state, tokens_remaining, 55) - 0.0015; monitoring resumes on received valid states with receipt time > tr + 0.7
      (rows with receipt <= partial landing are skipped, as Codex's resume_at), with proceeds = ev.sell(row, tokens_remaining, 55) - 0.0015
      and the same 30 % trail;
- final exit = 30 % trail trigger (+ 0.7 s landing) or the 2-h horizon (t + 7200, as eval-1.1: scan rows with receipt < t + 7200, sale lands
  trigger + 0.7 s — the known mechanical difference from Codex's t + 7199.3 stop is reported as a count, as in F010);
- final net = cash + ev.sell(final state, tokens_remaining, 55) - 0.2 - 0.0015 - 0.00075 (the extra 0.00075 SOL only when the partial
  executed); without a partial the net is the control's formula exactly;
- fill unavailable / final exit uncertain / staleness post-checks (> 30 s) exactly as in f006p2 / f009 / f010 (ev.state_at + post-check).
Implementation: a driver (run_f011.py) that calls the frozen evaluator's run_launch unchanged for the CONTROL (as run_f010.py) and, for
L005-E, re-implements run_launch's post-fill scan with the evaluator's own buy / sell / state_ok / state_at primitives imported unchanged
(the frozen exit hook cannot express a two-leg sale). Transcription check, asserted before any result is read: the same re-implemented
loop with the partial DISABLED must reproduce the CONTROL's category, why, net_sol and exit time for every one of the 679 launches.
Second check (reported, not asserted): on Codex's 296 L003 attempts inside E, status cross-tab, partial_trigger_t / partial proceeds /
net_sol agreement against Codex's published trade_l005_*.csv @ e9b20e1 (differences expected only from the trailing-high initialisation
(R37) and Codex's extra during-hold gap / invalid-state checks, which are not part of eval-1.1 and are not added).

Scoring: S1 = frozen eval-1.1 main() with rule_control.py only (reported verbatim; the L005 net cannot be produced by eval-1.1's single-sale
hook, so no eval-1.1 "L005" row exists and none is claimed). S2 = owner scenario R4 (pool 55 bps, +1 s / +0.7 s landings, 125 bps curve,
0.0015 SOL fixed, 0.2 SOL, one position per launch). Report for CONTROL and L005-E: attempted (early/late), filled, unavailable, uncertain
exit (with "partial: ..." reasons separately), stale fill, stale exit, resolved, unknown share, total SOL, mean / median return, win rate,
share losing > 50 %, without best 1 / 3, early / late totals, partial-executed counts (and their resolved net), final-exit kinds (trail /
horizon), median hold. R11 paired view on launches resolved under BOTH: totals, difference, better / worse / unchanged, by half, iid
bootstrap 95 % CI on the paired difference (10,000 resamples, seed 20261112) and the 3-h block bootstrap (as F010); pair-set share of each
denominator; launches resolved under one exit only reported separately. Fixed breakdown by the F009 cells A / B / C for the candidate,
the control and the paired difference — no new cells. Required by the row: the share of any paired improvement carried by the single
largest paired difference and the paired difference without it (also without the best 3 — stress, not a veto; no winner is discarded).
Bounded question: does L005's paired loss reduction (+2.436389 SOL on Codex's 195 L003 pairs, 61.3 % from one trade) hold on the E
population (679), and how much of it is one trade? Answer = the paired numbers above. Verdict vocabulary per R16 / R30 / R38: loss reduction
or not; never "supported" or "profitable". The pool-reserve-product question on 75VDY6... is not settled here and must not be.

## Idea lab (this run) — CL-L007 "name / symbol reuse veto", registered here before scoring (binary rule, no threshold, no sweep)
Eligible under R49 (creation-time filter; mechanism differs from every tested family). Hypothesis: a launch whose trimmed, case-folded name
OR symbol was already used by an earlier in-window launch (any creator; F002's definition, census ordered by create_ts, slot, mint) is a
copycat / recycled template and, even after surviving to a live 5-minute state, trades worse after costs than a launch with a new name.
Predicted direction, registered now: the veto side ("new name and new symbol") has a higher net SOL per resolved trade than the removed side.
Rule: enter E launches whose name and symbol are both new; CONTROL = E (679 / 419 / -10.011572). Candidate and control share eligibility E and
differ only by the veto (R10). Report: share of E each side keeps (R49: a side with fewer than ~30 resolved trades is inconclusive by
construction; a veto removing < ~5 % or > ~95 % of E is "not testable on this window"), attempted / filled / unavailable / uncertain /
resolved, total SOL, mean / median, win rate, share losing > 50 %, without best 1 / 3, both halves, R11 paired view against CONTROL (paired
differences are 0 on kept launches by construction, so the informative figures are the removed side's block and the kept side's totals vs
the control's), the F009 cells as a fixed breakdown. Declared descriptive breakdown of the REMOVED side (counts and totals only, no verdict):
reuse of a name/symbol whose earlier bearer had reached the 15-SOL retention screen before this launch's creation ("copy of a retained
coin") vs reuse of a never-retained one. Limitation stated in advance: names used before 6 Nov 07:40 are invisible, so "new" is "new within
the window".
Two further ideas proposed, NOT tested this run (see README): copycat-of-a-retained-coin as an entry preference (the breakdown above is its
hypothesis-generating count only), and a buy-size uniformity veto (scripted sizing) — see README for why it waits.
