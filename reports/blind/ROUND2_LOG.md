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

Round 1 test: launches created 8 Nov 00:00 → 10 Nov 00:00. Export after **10 Nov 04:00** (not 02:00 — a launch created 23:59 can enter up to 2 h later and hold up to 2 h; needs owner's go). Score MIG300 with eval-1.1, K = 1.

## Round 2 timeline
- A. Independent exploration — until 8 Nov 18:00
- B. Cross-critique — 8 Nov 18:00 → 9 Nov 18:00
- C. Freeze — before 10 Nov 00:00
- D. Test — launches created 10 Nov 00:00 → 12 Nov 00:00; export after **12 Nov 04:00** (same reason as above; needs owner's go); score with eval-1.1, K = number of rules

## Submissions log
| Time (UTC) | Analyst | What | Branch / file | Commit | Checked by coordinator |
|---|---|---|---|---|---|
| 8 Nov 12:01:25 | Codex | Round 1 full text + code (3 internal sessions, archive sha256s) and Round 2 phase A report: **none supported** (72 specifications fixed before outcomes; selected ID 34 lost on the later half) | branch `blind-codex-r2-8nov`: reports/blind/codex_7nov/, reports/blind/codex_r2/, ROUND2_codex_REPORT.md | d9ba6012 | Branch verified on GitHub; nothing outside reports/blind/ touched. Report prepared 11:39:28 UTC. Headline numbers not yet reproduced. Codex Round 1 text now published (b06fa89f content, sha256 642e8c80…); note its own caveat: publication now ≠ publication at freeze time. |

## Coordinator entries
- **8 Nov 06:15** — Coordinator chat started. Read ROUND2_BRIEF.md, BRIEF_7nov.md (rev 4), eval README, LOOP_PLAN.md, LAUNCHER.md (tail). Checked every remote branch (34). No Round 2 submission from any analyst: no new `blind-*`, `codex/*`, `gemini/*` or `jules/*` branch; only automated data pushes since the brief (`data` 04:06:58, `launcher-data` 06:09:27). Open Round 1 item: Codex's full submission text is still "not yet retrieved" in its record.
- **8 Nov 06:30** — Owner sent the Round 2 message to the Claude analyst and Codex. Gemini (Jules) not yet working; joins as a critic in phase B if it has nothing by 18:00.
- **8 Nov 06:30** — Codex (as second referee) raised four evaluator points; coordinator checked each against blind-eval-1.1 code. (1) A retained mint with no exported rows is left out of N — partly true, should only occur on capture failures. (2) Bundle tier-1 taken from the census with no finalisation-time check; `finalized` column unused — true. (3) MIG300 horizon exit uses the state at t+300.0, the written rule says t+300.7 — true, 0.7 s; analyst to confirm before scoring (README step). (4) Export at +02:00 is too early: entry up to created+2 h, hold up to 2 h → export after 04:00 — true, adopted above. eval-1.1 is NOT changed mid-test; (2) and (3) are candidates for eval-1.2 in a later round. Codex also confirms its Round 1 commit b06fa89f resolves nowhere on GitHub.
- **8 Nov 11:27** — Claude analyst (chat "Repo brief and raw data", the Round 1 analyst) received the Round 2 message and started. Expected output: branch `blind-fable-r2-8nov`.
- **8 Nov 11:31** — Codex analyst (ChatGPT Codex chat "Review attached file", the Round 1 analyst; 3 agents) received the Round 2 message and started. Output will be pasted by the owner and published here verbatim. Codex's separate "Coordinate Pump.fun Research Project" chat is a second referee, not an analyst (it has read Claude's Round 1 work).
- Gemini (Jules): not started.
- **8 Nov 11:42** — Gemini (Jules) session "Pump.fun Paper-Trading Research: Round 2 Analyst Brief" started with the full Round 2 message plus a memory constraint (stream one part at a time). Third Jules attempt overall; the two Round 1 sessions errored. Expected output: branch `blind-gemini-r2-8nov`. NOTE: Jules announces it goes read-only on 11 Nov 2026 — it cannot take part in phase D or later rounds; its Round 2 role is phase A analyst if it finishes, otherwise critic in phase B.
- **8 Nov 12:02** — Codex connected to GitHub (ChatGPT Codex Connector app, repo-scoped to Top-coins-Bot) and pushed `blind-codex-r2-8nov` itself. No more pasting needed for Codex. Open Round 1 item (Codex full text) is now closed.
