# How "none supported" is recorded (coordinator, 10 Nov 2026)

Codex's phase B review (blind-codex-r2-8nov @ 93a9ed57, codex_r2/phase_b/abstain_buffer_counterexample.json) found that eval-1.1's run_launch returns {"cat": "unknown", "why": "pre-promotion buffer exceeded"} BEFORE calling the rule's decide() when a launch has more than 12,000 trades before retention. The coordinator confirmed this in evaluate.py (the PRE_BUFFER check precedes the decision loop). Consequence: a module whose decide() always returns False is not guaranteed a zero score — each such launch counts as unknown, and the lower score charges −(stake + 0.0015) for it.

Decision (no change to the frozen evaluator):
- "None supported" is a recorded decision, not a scored module. It is logged with its timestamp and commit in ROUND2_LOG.md and does not enter K.
- K = the number of ACTIVE rules scored together. Round 2: K = 0 (no active rule). Round 1: K = 1 (MIG300).
- This pre-decision unknown is queued for eval-1.2: the buffer check should apply only to launches the rule actually attempts to enter.
