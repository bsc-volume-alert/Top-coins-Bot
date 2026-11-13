# F003 protocol — registered BEFORE any outcome is computed (run f003-20261113T025048Z)

Queue row F003 as settled by R46 (coordinator run 7): one loss-avoidance filter built from F002 evidence, on the eligibility-E population
(679 launches live at created + 300 s with a valid curve state and >= 5 distinct curve buyers in the last 60 s — f006p2 / f009 / f010 / f011),
CONTROL = E (679 attempted / 419 resolved / -10.011572 SOL under R4; eval-1.1 unchanged: 484 scored / 195 unknown / -11.814859). Candidate and
control share eligibility E and differ only by the registered veto (R10). The filter must be ONE of the three F002 conditions; the other two are
pre-declared descriptive breakdowns of E (counts and totals only) and are never swapped in for the verdict.

## Bind-share pre-check (R46 / R54) — counts only, no outcome read: precheck_conditions.json (precheck_conditions.py, census + F002 retention times)
Definitions knowable at this launch's creation c (creator_history.py; census ordered as F002; retention receipt times from the published F002
launches.csv.gz @ 3393d27, reproduced exactly by the coordinator, R45; history before 6 Nov 07:40 UTC invisible):
- C1 prev_not_retained: the creator has an in-window predecessor whose retention receipt is absent or later than c -> removes 137 / 679 = 20.2 %
  (early 50 / late 87; cells A 2 / B 17 / C 118);
- C2 serial20: >= 20 in-window launches by the creator before c -> removes 59 / 679 = 8.7 % (early 13 / late 46; B 8 / C 51);
- C3 gap10: the creator's previous in-window launch is <= 600 s before c -> removes 101 / 679 = 14.9 % (early 41 / late 60; A 1 / B 14 / C 86).
All three are testable under R54 (5-95 %). 478 of the 679 E launches have no in-window predecessor and are removed by none. Overlaps: C1&C3 78,
C1&C2 47, C2&C3 44, any 165. Note recorded before scoring: the removed sides sit almost entirely in cell C (creator sold > 0 by 300 s),
which F009 measured at -4.536627 SOL on 179 resolved; a C1 effect may therefore be partly the cell-C effect, and the report must show C1 within
each cell as well as overall (fixed breakdown, no new cells).

## Registered filter: C1 "previous launch not retained by this creation" (the condition with the largest F002 evidence: next-launch retention
2.8 % after a non-retained predecessor vs 42.8 % after a retained one; and the largest bind share of the three)
Rule F003-C1: enter an E launch at 300 s only if NOT C1 (no in-window predecessor, or the predecessor had reached the 15-SOL retention screen by
c). Exit = the control's 30 % trail on sellable net proceeds / 2 h. **Predicted direction, registered now:** the removed side (C1 true, 137
attempted) has a LOWER net SOL per resolved trade than the kept side (542 attempted); equivalently the kept side's total is above the control's
total by the removed side's (negative) total. Mechanism hypothesised: a creator whose last coin died before this one is relaunching into the
same audience with the same funding pattern (F002: dev-buy persists at Spearman 0.82), so the surviving launch is more likely a farm cycle than
organic demand. Verdict vocabulary (R16): loss reduction observed / not observed; never "supported" or "profitable". Removed side with fewer
than ~30 resolved trades is inconclusive by construction (R49 analogue).

## Pre-declared descriptive breakdowns (counts and totals only, no verdict, never swapped in): C2 serial20 and C3 gap10 kept / removed sides
of E under the control exit, plus the C1 removed side split by "predecessor never retained in the window" vs "retained only after c".

## Scoring (identical to f009 / f010 / f011)
S1 = frozen eval-1.1 main() with rule_control.py and rule_c1.py (reported verbatim). S2 = owner scenario R4: 0.2 SOL, buy lands +1 s, sale lands
+0.7 s, 125 bps curve / 55 bps pool, 0.0015 SOL fixed, one position per launch, 30 % trail, 2 h cap, landing state older than 30 s ->
unavailable (fill) / uncertain (exit) by the post-check; the frozen evaluator's run_launch is called unchanged for every spec (as run_f009.py).
Report for CONTROL, F003-C1 (kept) and the C1 removed side: attempted (early / late), filled, unavailable, uncertain exit, stale fill, stale exit,
resolved, unknown share, total SOL, mean / median return, win rate, share losing > 50 %, without best 1 / 3, early / late, F009 cells A / B / C,
median hold; net SOL per resolved trade kept vs removed with iid bootstrap 95 % CIs (10,000 resamples, seed 20261113) on each side's total and
on the difference of per-trade means; R11 paired view against CONTROL (paired differences are 0 on kept launches by construction, so the
informative numbers are the removed side's totals and the kept side's totals vs the control's; pair-set shares of each denominator reported).
Bounded question (R46): do the surviving E launches of creators whose previous coin was not retained trade worse or better after costs than
the rest of E? Answer = the kept / removed totals, per-trade means and their intervals, overall and within cells.
Unknowns stated in advance: history before 6 Nov 07:40 (a "first" launch may have earlier ones outside the window); the ~1-block optimism of
create_ts as the decision time (the creation receipt is the earliest moment the creator is known; a live rule would act at the first receipt,
about one block later, and the 300-s entry is unaffected); creators' launches outside the census (other venues) are invisible.

## Idea lab (this run) — CL-L008 "first-time-buyer share", registered here before scoring
Eligible under R27 (named there as Claude idea 2: a 5-min condition whose mechanism — whether the buyers are NEW to the window or recycled
wallets — differs from buyer count, net-buyer count and inventory retention). Feature at t = created + 300 s (prepass_ftb.py, knowable at t):
over the distinct wallets with a received curve buy on this mint with ts > t - 60 and receipt <= t (exactly the control's buyers_last_60s
set), ftb_share = share with NO received curve buy on another tracked mint with receipt < t. Pre-check (ftb_precheck.json, counts only, no
outcome): over E, min 0, deciles 0 / .034 / .064 / .096 / .125 / .157 / .20 / .28 / .44, max 1, mean 0.180, median 0.125; my prior threshold
0.5 keeps only 62 of 679 (removes 90.9 % — testable under R54 but the kept side would be near the ~30-resolved inconclusive bound), so the
**registered rule is the E median split: CL-L008 enters E launches with ftb_share >= 0.125** (kept ≈ half of E); ftb_share >= 0.5 is kept as
a pre-declared secondary descriptive cut (counts and totals only, no verdict). **Predicted direction, registered now:** the kept side (more
first-time buyers) has a HIGHER net SOL per resolved trade than the removed side (recycled buyers). Control exit; R4 scenario; same report
columns as F003-C1 including both halves, cells, R11 paired view and without best 1 / 3. Limitation stated in advance: the wallet map covers only
the 4,913 mints with trades in the export, so "first-time" = "no earlier buy on a tracked mint in the window"; a wallet that bought untracked
coins looks first-time. One threshold, no sweep.
Two further ideas proposed, NOT tested this run (README): buy-size uniformity veto (scripted sizing) and a "relaunch-into-fresh-wallets"
cross of C1 with CL-L008 (only if both move the registered way, and only on a released dataset).
