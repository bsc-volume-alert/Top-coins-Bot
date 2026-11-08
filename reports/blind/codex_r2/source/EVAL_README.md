# Blind-test evaluator — eval-1.1 (FROZEN 7 Nov 2026 ~16:35 UK, before the 8 Nov 00:00 UTC test start; supersedes eval-1.0: speed + one-mint-at-a-time streaming + retained-launch pool window; scoring rules unchanged)

Scores every frozen rule on launches created **8 Nov 00:00 → 10 Nov 00:00 UTC**, as specified in reports/blind/BRIEF_7nov.md (rev 4). It will not be changed for this test; any change = a new version plus a new untouched test period.

- `evaluate.py`: the evaluator. `test_evaluate.py`: 14 unit tests on synthetic data, covering:
  - basic replay; not-retained-yet abstention; capture gap → unknown; unknown worst-case bound and the "not scorable" rule
  - outage → excluded from N; duplicate removal by full fingerprint (not signature alone)
  - exit trigger; independent 0.02 size; receipt-time visibility; pool evidence required; migration; missing recv_ms flagged
  - Run: `python3 -I test_evaluate.py` (all must PASS).
- Frozen identity: branch `blind-eval-1.1` (never moved after creation). eval-1.0 (branch blind-eval-1.0) is superseded: it could not process the data volume. SHA-256 of evaluate.py is in EVAL_SHA256.txt.

## Fixed assumptions (scored as stated, not tuned)
- Fill as of decision + 1.0 s; sell as of trigger + 0.7 s. The state is the last trade with block time ≤ that instant. Block times have 1-second resolution, which is a stated limitation.
- Fees per leg:
  - curve 125 bps (protocol 95 + creator 30)
  - pool 30 bps (LP 20 + protocol 5 + creator 5)
  - plus 0.0015 SOL fixed per round trip
  - Because the pool's creator-fee tier is not stored per trade, every result is ALSO reported with the pool fee at 125 bps (`pool_fee_125bps_sensitivity`).
- Valid states:
  - positive reserves
  - curve price ≤ 1.1 × the curve maximum
  - pool rows must carry quote_mint = wSOL, base_dec 6, quote_dec 9 (tracker 0.19.9+ evidence)
  - otherwise the outcome is unknown
- Capture:
  - a tracker outage over [created, created + 2 h] removes the launch from N
  - a feed gap (closed/idle/error until the next open; pool-* for pool states) between the state's trade and the landing time → unknown
  - curve states only within retention + 125 min
  - pool states only for launches created after 7 Nov 09:47 UTC, within 24 h
  - more than 12,000 trades before retention → unknown
- Retention time: the receipt time of the trade at which cumulative gross curve buys reach 15 SOL (bundle tier-1: the first trade). Decisions before it are abstentions.
- Knowledge: decisions see only trades with recv_ms ≤ t. Funding fields are visible only when lookup_status = 'ran' and trace_ts/scanned_ts ≤ t. Entries that depend on trades without recv_ms are counted in `event_time_hypothetical_entries`.
- Score:
  - N = launches created in the window, retained at any point, not inside an outage
  - point = Σ net SOL of scored entries ÷ N (unknown = 0, labelled); lower = the same with unknown = −(stake + 0.0015)
  - not scorable if unknown > 10% of attempts
  - "supported" = scorable AND the one-sided bootstrap lower confidence bound (10,000 resamples of the N launches, seed 20261108, level 1 − 0.05/K) of the LOWER score is > 0, where K = number of rules scored together

## Submitting a rule
Each analyst's written rule is translated into this module interface (`RULE`, `decide(view)`, `exit_signal(pos)`; see the docstring in evaluate.py). Each translation is published and sent back to the analyst to confirm that it matches their frozen text, BEFORE the test data is scored. Analysts may also supply the module themselves.

## Test data (to be produced after 10 Nov 02:00 UTC, once the last entries' 2-h horizon has passed)
A read-only export of every launch created in the window, in the package formats:
- trades of all retained launches (uncapped), plus pool trades
- tokens.csv census
- feed_gaps
- outages.txt built from the pm2 restart and deploy logs
- fd_watch

It will be frozen as its own branch with sha256 sums before any rule is scored.
