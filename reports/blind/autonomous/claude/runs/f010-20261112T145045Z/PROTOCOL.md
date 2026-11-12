# F010 protocol — registered BEFORE any outcome is computed (run f010-20261112T145045Z)

Queue row F010 (coordinator run 5, R35): apply Codex's L004 early-cohort sell-cluster exit, with every parameter as Codex specified it in
research-codex @ 5024b9e (runs/c012-lab-20261112T091226Z/lab.py, protocol f044ea9), to the 679 eligibility-E entries of f006p2 / f009
(live coin at created + 300 s: last received trade is a valid curve state and >= 5 distinct curve buyers in the last 60 s). Entries, costs and
the baseline exit are IDENTICAL to the f009 CONTROL (which reproduces f006p2 exactly: 679 attempted / 419 resolved / -10.011572 SOL under R4;
484 scored / 195 unknown / -11.814859 under eval-1.1). The candidate differs ONLY by the added exit condition.

Sell-cluster exit, transcribed from Codex's lab.py (no parameter changes):
- early cohort = wallets with a received curve buy (venue '' or 'curve', is_buy = 1) whose receipt time <= created + 60 s (membership from
  trades received by the decision time t = created + 300 s; 60 < 300 so it is fully knowable at t);
- after the fill (receipt time > t + 1 s), at every received trade with a valid state (eval-1.1 state_ok; invalid rows are skipped, as in
  Codex's loop), the rolling cluster = sells (is_buy != 1, any venue) by early-cohort wallets with receipt time in [tr - 2 s, tr], tr = the
  current row's receipt time, restricted to rows after the fill and with valid state;
- trigger when the cluster has >= 3 distinct wallets AND combined sol >= 2 SOL; Codex's loop tests the 30 % proceeds trail first at the same row,
  so the exit kind is "trail" when both fire on one row (the trigger time is the same either way);
- exit = earliest of sell-cluster trigger / 30 % trail on sellable net proceeds / 2 h horizon; sale lands trigger + 0.7 s.
Implementation: a rule module whose exit_signal(p) is `rc.exit_signal(p) or cluster(p)`; the cluster is evaluated from the receipt-ordered
trade list captured in decide() (the evaluator's Prefix.L), using ONLY rows with receipt time <= p.t and > fill_t (asserted). Frozen
evaluate.py f5686511... imported unchanged (S1 via its main(); S2 via run_launch / state_at as in f009's run_f009.py). The only known
mechanical difference from Codex's own driver: eval-1.1 scans received rows up to t + 7200 s and lands the sale at trigger + 0.7 s (Codex stops
at t + 7199.3 and caps the landing at t + 7200); the number of trades whose trigger falls in (t + 7199.3, t + 7200) is reported (expected 0 or
negligible). Codex's extra "capture gap during hold" / "invalid state during hold" uncertainty checks are not part of eval-1.1 and are not added
(they were not part of the E control either); the staleness post-check (> 30 s) is applied exactly as in f006p2/f009.

Scoring (unchanged from f009): S1 = frozen eval-1.1 main() with rule_control.py and rule_l004sc.py (pool 30 bps, +125 sensitivity, K = 2 here
for the LCB; reported verbatim, never used as a verdict per R16). S2 = owner scenario R4 (pool 55 bps, +1 s / +0.7 s landings, 125 bps curve,
0.0015 SOL fixed, landing state > 30 s old => fill unavailable / exit uncertain by post-check). 0.2 SOL, one position per launch.
Report for CONTROL and L004-SC: attempted (early/late), filled, unavailable, uncertain exit, stale fill, stale exit, resolved, unknown share,
total SOL, mean / median return, win rate, share losing > 50 %, without best 1 / 3, early / late totals, exit-kind counts (cluster / trail /
horizon), median hold. R11 paired view on launches resolved under BOTH: totals, difference, better / worse / unchanged, by half, bootstrap 95 %
CI on the paired difference (10,000 resamples, seed 20261112), pair-set share of each denominator. Launches resolved under one exit only are
reported separately (as Codex and Claude did). Fixed breakdown by the F009 cells A / B / C (creator absent / bought & holds / sold > 0 at
300 s) for the candidate, the control and the paired difference — no new cells, no thresholds.
Bounded question: does the sell-cluster exit's paired loss reduction (+2.465585 SOL on Codex's 195 L003 pairs, 69 better / 23 worse) hold on the
E population (679), of which Codex's 296 L003 entries are a sub-selection (295/296, F008)? Answer = the paired numbers above. Verdict vocabulary
per R16 and R30: it is a loss reduction or not; never "supported" or "profitable". Whether a 2-s receipt window is executable in production is
not answered here.

## Idea lab (this run) — CL-L005 "demand-decay exit", registered here before scoring (fixed parameters, no sweep)
Hypothesis: a position whose fresh demand has stopped — no second distinct curve buyer in the last 60 s of receipt — is more likely to bleed
than to recover; selling on that evidence (instead of waiting for the 30 % price trail) reduces resolved losses. This is a demand-side exit
(buyer arrival), not a price trail (control), not a seller cluster (L004) and not a clock (CL-L004, closed by R35).
Exit = at a received valid state with seconds_held >= 60, the number of distinct wallets with a curve buy received in (p.t - 60 s, p.t] is <= 1,
OR the 30 % trail, OR 2 h — whichever first. Entries identical to CONTROL (679). Parameters fixed: window 60 s, threshold <= 1 distinct buyer,
minimum hold 60 s. Same S1/S2 scoring, R11 paired view against CONTROL, better / worse / unchanged, by half, bootstrap CI, and the
resolved-only-under-one-exit groups separately. Confound noted in advance (as for CL-L004): the exit can only fire at a received row, so on
a tape that goes quiet it fires at the next sell; it may convert quiet-tape unknowns into realised losses — the paired view is the comparison
and the "resolved only under CL-L005" group is reported on its own.
Candidate and control share the same eligibility screen (E) and differ only by the exit (R10).
