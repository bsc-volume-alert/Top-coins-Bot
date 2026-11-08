# Round 2 — coordinator log (reports/blind/ROUND2_LOG.md)

Kept by the coordinator chat (referee). Times UTC (= UK time this week). Newest entries at the bottom. Facts only: who published what, where, when, with commit hashes. No analysis here.

## Fixed references
| Item | Where | Commit |
|---|---|---|
| Round 2 brief | branch `tracker`, reports/blind/ROUND2_BRIEF.md | 5c964327 (7 Nov 22:32:19) |
| Round 1 brief rev 4 | reports/blind/BRIEF_7nov.md | — |
| Evaluator eval-1.1 (frozen) | branch `blind-eval-1.1`, reports/blind/eval/ | be9b5459 (7 Nov 15:59:56); evaluate.py sha256 f5686511…3bc6a86 |
| Development data, all coins | branch `entry-all-20261107t2210` (MANIFEST.md) | e6783312 (7 Nov 22:22:49) — 62,789 launches, 4,913 with trades, 8,037,251 rows |
| Round 1 data | branch `entry-package-7nov` (INDEX.md) | 0e3be03c (7 Nov 14:58:07) |
| Loop plan | reports/research/LOOP_PLAN.md | — |

## Round 1 (frozen, closed)
| Analyst | Decision | Frozen | Where |
|---|---|---|---|
| Claude (Fable) | MIG300 — buy at the first PumpSwap pool trade, sell after 300 s; author predicts it fails | 7 Nov 15:19 | branch `blind-fable-7nov` @ 96bda1bf; module blind-eval-1.1:reports/blind/eval/rules/fable_MIG300.py |
| Codex | "none supported" | 7 Nov 15:22:48 | reports/blind/SUBMISSION_codex_7nov_RECORD.md (commit b06fa89f exists only in Codex's environment; full text still not published verbatim) |
| Gemini (Jules) | no submission (errored 16:00, 16:14 UK) | — | — |

Round 1 test: launches created 8 Nov 00:00 → 10 Nov 00:00. Export after 10 Nov 02:00 (needs owner's go). Score MIG300 with eval-1.1, K = 1.

## Round 2 timeline
- A. Independent exploration — until 8 Nov 18:00
- B. Cross-critique — 8 Nov 18:00 → 9 Nov 18:00
- C. Freeze — before 10 Nov 00:00
- D. Test — launches created 10 Nov 00:00 → 12 Nov 00:00; export after 12 Nov 02:00 (needs owner's go); score with eval-1.1, K = number of rules

## Submissions log
| Time (UTC) | Analyst | What | Branch / file | Commit | Checked by coordinator |
|---|---|---|---|---|---|
| — | — | nothing yet | — | — | — |

## Coordinator entries
- **8 Nov 06:15** — Coordinator chat started. Read ROUND2_BRIEF.md, BRIEF_7nov.md (rev 4), eval README, LOOP_PLAN.md, LAUNCHER.md (tail). Checked every remote branch (34). No Round 2 submission from any analyst: no new `blind-*`, `codex/*`, `gemini/*` or `jules/*` branch; only automated data pushes since the brief (`data` 04:06:58, `launcher-data` 06:09:27). Open Round 1 item: Codex's full submission text is still "not yet retrieved" in its record.
