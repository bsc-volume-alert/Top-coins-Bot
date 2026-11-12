# PROTOCOL — f002-20261112T185332Z (queue task F002: operator persistence) + Idea lab CL-L006 (slot diversity)
Registered before any outcome was computed. Claude research worker, 2026-11-12 ~19:00 UTC. Inputs: entry-all-20261107t2210 @ e678331
(16/16 SHA256SUMS verified), blind-eval-1.1 evaluate.py sha f5686511… imported unchanged (fl, load, iter_mints, state_ok, state_at,
gap_overlap, run_launch, buy/sell, constants), entry-package-7nov @ 0e3be03 not needed (no USD values this run). No 8–10 Nov data, no
protected outcomes, no paid calls, no live or paper trading. Everything is development data (6 Nov 07:40 → 7 Nov 20:00 UTC).

## F002 — does a creator's previous launch predict the next one? (counts only; no rule search; no thresholds tuned)
Population: the full census tokens_window.csv.gz (62,789 launches, 21,831 distinct creators; 2,941 creators have ≥ 2 launches in the
window and account for 43,899 launches — the only numbers looked at before registration, as denominators). Launches of one creator are
ordered by create_ts, then create_slot, then mint.
Units: (a) PRIMARY — the first → second pair of every creator with ≥ 2 launches (2,941 pairs); (b) SECONDARY — every consecutive pair
k → k+1 (40,958 pairs), where the knowable history also includes the count of the creator's prior in-window launches and how many of
them were retained by the time of launch k+1; (c) BASELINE "never launched before in the window" — every launch that is its creator's
first in the window (21,831), reported split into single-launch creators (18,890) and first launches of multi-launch creators (2,941).
History before 6 Nov 07:40 is not in the allowlisted data, so "never launched before" means "no earlier launch inside the window" — a
limitation stated in the README, not fixable here.

Decision time for pair (1 → 2): t2 = create_ts of launch 2 (event time; the export has no receipt time for creation — we assume the
creation is known at create_ts, which is optimistic by about one block; stated as a limitation). KNOWABLE history of launch 1 uses only
its trade rows with receipt time ≤ t2 (recv_ms / 1000; event ts where recv_ms is missing, exactly as the evaluator's RT):
- hist_retained: launch 1's retention receipt (first row at which cumulative gross curve buys ≥ 15 SOL, or first row if tier ≥ 1 — the
  evaluator's rule) is ≤ t2. yes / no. (A launch with no exported rows was never retained.)
- hist_peak_mult: max over valid states (state_ok) received by t2 of price / P0, with price = (vsol/1e9)/(vtok/1e6) and
  P0 = 30 / 1.073e9 SOL per token (the initial virtual curve price). Fixed bins: unknown (not retained by t2 or no valid state received),
  < 1.5×, 1.5–3×, ≥ 3×.
- hist_dump: on valid states received by t2, in event order, the first state whose price ≤ 0.5 × the running maximum price; time-to-dump =
  its ts − create_ts(1). Fixed bins: unknown (not retained by t2), dumped ≤ 120 s, 120–600 s, > 600 s, not dumped by t2 (the observed span
  min(t2, last receipt) − create_ts(1) is reported with it).
- hist_creator_sold (declared extra, same family as F009's cells): launch 1's creator wallet has a received sell of > 0 tokens by t2. yes / no / unknown.
- gap_s = t2 − create_ts(1), descriptor only (fixed bins ≤ 10 min, 10–60 min, 1–6 h, > 6 h).

OUTCOMES of launch 2 (future data allowed — these are the labels):
- O1 retained_ever: launch 2 has a retention receipt at any time in the export. yes / no. Known for every launch.
- O2 peak_mult_1h: max over valid states with ts ≤ create_ts(2) + 3600 of price / P0; reported as median and the share ≥ 2× and ≥ 3×.
  Unknown when launch 2 was not retained (no rows) or when one of the six published outage intervals overlaps [create_ts(2), +1 h].
  Short socket gaps are not applied (a gap can only hide a peak, so the peak is a lower bound; stated).
- O3 dump_s: first valid state (any time within the capture) whose price ≤ 0.5 × running max; reported as the share dumped ≤ 120 s,
  ≤ 600 s and ≤ 3600 s after creation; "no dump observed" is censored with its observed span. Unknown as for O2.
Report for every predictor bin: n, O1 rate with a Wilson 95 % interval, O2 median / share ≥ 2× among known, O3 shares among known, unknown
counts; the baseline (c) beside them; both halves (create_ts(2) < / ≥ 2026-11-07 01:50 UTC, the F006 split); Spearman rank correlation
between hist_peak_mult and O2 peak on pairs where both are known, with a 2,000-resample bootstrap interval. For (b): O1 rate of launch k+1
by prior-launch-count bin {1, 2–4, 5–19, ≥ 20} × previous-launch retained {yes, no}. No cell is chosen after seeing results; every bin
above is reported. A difference between bins is a hypothesis for F003, not a rule.

Declared side count (Idea-lab idea 2, detection only, census-only, knowable at creation): O1 rate of launches whose exact name or exact
symbol (trimmed, case-folded) was already used by an EARLIER in-window launch (any creator) vs launches with a new name and symbol.
Counts only; no trade.

## Idea lab CL-L006 — slot diversity at the 5-min decision (entry condition on eligibility E; trade test)
Hypothesis: when the buys of the last 60 s are spread across many distinct slots (≥ 8 of the ~150 slots a minute holds) the demand is
arriving over time rather than in a few bundled transactions; bundled demand is a bot cohort that leaves together. This is the idea 3 of
the f008 post (R27/R43: eligible, mechanism differs from buyer count / net-buyer count / inventory retention).
Spec (fixed before scoring): at t = created + 300 s, on launches that pass eligibility E (last received state is a valid curve state and
≥ 5 distinct wallets with a received curve buy with ts > t − 60; identical to F006P2/F009/F010 CONTROL), the candidate enters only if the
received curve buys with ts > t − 60 fall in ≥ 8 distinct slots. Control = E (same screen, only the hypothesis condition differs, R10).
Complement (E and < 8 slots) reported. R4 scenario through the frozen eval-1.1 run_launch unchanged: 0.2 SOL, buy lands +1 s, sell +0.7 s,
curve 125 bps, pool 55 bps, 0.0015 SOL fixed, 30 % trail on sellable net proceeds, 2 h max, a landing state older than 30 s ⇒ fill
unavailable / exit uncertain (post-check, as in f006p2/f009/f010). Report attempted / filled / unavailable / uncertain / resolved, total
SOL, mean / median return, win rate, share losing > 50 %, without best 1 and 3, both halves, F009 cells, and the R11 paired view against
the control (identical trades where both resolve, so the paired difference on the candidate subset is zero by construction — the
informative comparison is candidate vs complement on the same exit; both are stated). One threshold (8), no sweep; a post-hoc
distribution of the slot count over E is reported as a diagnostic only. Verdict vocabulary per R16.
