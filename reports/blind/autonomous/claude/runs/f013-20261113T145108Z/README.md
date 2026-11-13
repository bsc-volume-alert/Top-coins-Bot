# f013-20261113T145108Z — F013 (b) CL-L011 "no-sell run": NOT TESTABLE; (c) R73 correction recorded; (a) C017 cross-review deferred

Worker: Claude research worker (scheduled, unattended). Lease 5ae8daa 14:51 UTC; protocol + pre-check f8d7128 14:56 UTC; results in the following commit. Queue: tracker @ 4079855 (coordinator run 11, R75 / F013). research-codex read at d820bda863f680e9e097274412ddcce5c0d47e6a (C016; no C017 yet). research-claude base d348842.

## 0. What this run did and did not do
- (a) Codex C017 was not published when the run started (research-codex HEAD still d820bda = C016), so the C017 cross-review is deferred to the next run, as the F013 text says.
- (b) CL-L011 was registered (PROTOCOL.md, zero-sell condition fixed, no parameter), the R54 pre-check was run, and it removes 550 of 568 control triggers (96.8 %) — above the 95 % bound. Under R54 / F013 the condition is **NOT TESTABLE on this window and was not scored**: no exit, P&L or outcome category was computed for either arm in this run (run_f013.py / analyze_f013.py / rule_run2c.py are the registered harness and were NOT executed). No alternative threshold or statistic was tried (my protocol forbids it; R75 closes the RUN2-trigger family after this test).
- (c) The R73 correction (fingerprint dedup of §1c of f012) is recorded in KNOWLEDGE.md (CK18 corrected in place with the original figure kept beside it) and in the f012 SCOREBOARD row. No re-run.

## 1. Inputs and integrity
entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a, 16/16 SHA256 OK. Frozen evaluator blind-eval-1.1 @ be9b5459 evaluate.py sha256 f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86, imported unchanged (`KEEP += ("price_sol",)` on the imported module as in f004 / f012, so the registered trigger can read the trade price; no arithmetic touched). Six published development outage intervals as c001 reproduce.py / F006. Stream: 4,913 mints, 1,568,880 duplicate rows removed by the evaluator's fingerprint, 0 non-contiguous. Denominator 3,638 retained outage-free launches (1,593 early / 2,045 late) — identical to f004 / f012.

## 2. CL-L011 — specification (from PROTOCOL.md, written before any count)
Trigger: F004-RUN2 unchanged (first received usable trade priced ≥ 2 × p60 with 60 s < t − created ≤ 900 s; p60 = trade price of the last received usable trade by created + 60 s; first crossing only). Candidate takes the trigger only if **sells = 0**, where sells = number of curve sell rows (venue '' or 'curve', is_buy ≠ 1, any wallet including the creator) received in (created + 60 s, trigger receipt]; pool sells are not counted. Control = F004-RUN2.

## 3. Pre-check (R54, counts only — precheck_f013.json)
| | control (RUN2) | candidate (RUN2C, sells = 0) | removed |
|---|---|---|---|
| early | 231 | 4 | 227 |
| late | 337 | 14 | 323 |
| all | 568 | 18 | 550 (96.8 %) |

Sells received in (created + 60 s, trigger] on the 568 control triggers: min 0, p10 5, p25 15, median 48, p75 116, p90 236, max 1,069; share zero 3.2 %, ≤ 1 4.9 %, ≤ 3 8.1 %. testable_5_95 = false ⇒ NOT TESTABLE.

## 4. Why it does not bind (counts-only descriptive, descriptive_f013.json; no outcome read)
On the 550 triggers with ≥ 1 sell, the first curve sell after the 60-s mark is received a median 1.18 s after it (p25 0.39 s, p75 4.6 s, max 323 s) — i.e. on a tape that is trading at all, sells are present almost immediately, and by the trigger (median 154 s after creation) sells are a median 38 % of the curve rows received since 60 s (p25 33 %, p75 43 %). The 18 zero-sell triggers are tapes with almost no activity: median 1 buy received since 60 s (p25 0, p75 3, max 18), median 1 distinct outside buyer (CL-L010 breadth; 17 of 18 have breadth < 10), median entry age 123 s, trigger price a median 2.16 × p60 with one at 246 ×. Cross-tab with CL-L010: sells 0 ∧ breadth ≥ 10: 1; sells 0 ∧ breadth < 10: 17; sells > 0 ∧ breadth ≥ 10: 399; sells > 0 ∧ breadth < 10: 151. So "no sell by the trigger" on this tape is not "one-way inventory flow into a run"; it is "nobody is trading", a subset of the thin-tape set CL-L010 already described (the removed 168), and the mechanism I hypothesised cannot be isolated from inactivity with this statistic. 14 of the 550 vetoed triggers are themselves sell rows (a sell printed at ≥ 2 × p60).

## 5. What is and is not known
- Not measured: how the 18 kept or the 550 removed launches traded under this veto (by the rule, not scored). The control's own figures are already public (F004 / R65 / R71: 568 / 492 / −16.344741 SOL) and are not recomputed here.
- The RUN2-trigger family is now closed on the development window (R75), whatever the outcome — this outcome is NOT TESTABLE, not a result.
- A SOL-weighted sell statistic, a sell/buy ratio, or a shorter window would be different statistics; none was run and none may be run here (R75). They can be proposed for released data with statistic and threshold registered first.

## 6. Codex reproduction for the dialogue
codex_l008_rederive.py (f012, unchanged) re-run on Codex's c016 published CSVs @ d820bda: identical to the f012 re-derivation (245 / 244 / 168 / −4.504147; vetoed 51 / 47 / 27 / −0.141222; kept − removed −0.021580 per trade) — codex_l008_rederived.json.

## 7. Files
PROTOCOL.md; rules_f013.py (f004/f012 trigger unchanged + `sells` / `run2c_decide`); rule_run2.py, rule_run2c.py (registered, unexecuted); precheck_f013.py → precheck_f013.json; descriptive_f013.py → descriptive_f013.json (counts only); run_f013.py, analyze_f013.py (registered harness, NOT executed); codex_l008_rederived.json; results.json; commands.sh; SUMMARY.txt; ARTIFACT_SHA256SUMS.txt (from `git ls-files` after the content commit, R18/R24). No ledger exists for this run.

## 8. Limitations
Received curve rows only; pool sells invisible; row counts not SOL; a 96.8 % bind means the statistic separates activity from inactivity rather than selling from not selling; nothing here is a trading result. Costs: compute only. No paid calls, no protected branch opened, no live trading, no change outside reports/blind/autonomous/claude/.
