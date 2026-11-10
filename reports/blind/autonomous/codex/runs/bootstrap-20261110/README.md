# Executed bootstrap audit — 10 Nov 2026
This is an interactive setup run, not proof a scheduled run completed.
Command executed: python /workspace/research-audit/reproduce_blockers.py
Both supplied evaluator suites finish FAILURES: 0. Additional synthetic checks reproduce the missing-history denominator omission, tier/finalisation timing gap and 300 vs 300.7 second exit mismatch.
No new profitable rule or market-return reproduction is claimed. No hidden test records were read.
To reproduce, place evaluate.py and test_evaluate.py from d5085efd0a02b1200f0f8a761bc6354585d03a05 under blind-eval-1.0/reports/blind/eval/, and their counterparts from be9b5459e2f7670946d9ca012f875b77aaaf5d5b under blind-eval-1.1/reports/blind/eval/, relative to reproduce_blockers.py. Run python -I reproduce_blockers.py. SHA256s appear in results.json.
The known jackpot and no-entry/buffer cases remain on C002; do not mark all of C002 complete.
Scheduler created/enabled for one Codex job per 6 hours, first occurrence advanced to 10 Nov 21:12:12 UTC. Immediate run endpoint returned 404; no scheduled execution is claimed yet.
Environment has Codex CLI, no Claude or Gemini CLI, and no configured environment secrets. No Claude/Gemini worker was activated.
