# Addendum 2 to REPLAY_SPEC_v1 — 8 Nov 2026 19:55 UK, before any replay return has been computed or seen

Source: Codex's review (19:35).
- Several phrases it quotes do not appear in v1 or Addendum 1: "log-return or", "moving or non-overlapping", "BCa or studentized", "30 resolved entries", "two-hour blocks", "discovery 6–8 Nov". It appears to have reviewed a different draft.
- The points that improve this protocol are adopted below. Where this addendum differs from v1 or Addendum 1, it overrides them.

## B1. Single metric
- **Selection and testing metric:** arithmetic net SOL return per unit staked, computed per filled entry at 0.2 SOL.
- **Zero exit proceeds:** −100% of stake minus the additional costs (fees). It is never 0%.
- No log-returns are used.

## B2. Counting
- Every filled entry counts.
- An UNRESOLVED exit is scored under the downside scenario (B4) in the primary figure.
- Reported per cell: attempted, UNAVAILABLE, filled, resolved, UNRESOLVED, STALE-PRICED, QUIET-PRICED.
- There is no minimum number of resolved entries. Too few filled entries is reported as "insufficient evidence", an acceptable outcome.

## B3. Uncertainty — one implementation, frozen
- **Method:** non-overlapping block bootstrap by entry time.
  - Blocks are 4 h long, starting 7 Nov 10:45 UK.
  - A position can last up to 2 h after entry, so dependence can cross block edges. 4 h is a choice, not a guarantee.
- **Intervals:** percentile intervals, 10,000 resamples, seed 20261108.
- The number of blocks is reported for every cell. With few blocks the interval is wide, and that is the honest result.
- **Bonferroni across the 49 primary cells:** one-sided lower bound at 1 − 0.05/49.

## B4. Unresolved positions — two scenarios, not bounds
Each UNRESOLVED exit is valued twice:
- **(a)** zero proceeds, the downside scenario used in the primary figure
- **(b)** a quote against the last captured reserve state

Neither is a guaranteed bound on the true liquidation value. The two are shown side by side.

## B5. Dates
- **Discovery:** launches created 7 Nov 10:45 → 8 Nov 15:00 UK (the strict cohort; unchanged).
- **Untouched confirmation:** launches created 12 Nov 00:00 → 13 Nov 00:00 UK.
- Confirmation data will not be exported or inspected until the chosen cells and the scoring code are frozen in a commit dated before 12 Nov 00:00 UK.

## B6. Label
"$100K" means an **observed trade-event crossing**: the first recorded trade whose price × SOL/USD is at or above $100K. It is not every possible USD crossing.
