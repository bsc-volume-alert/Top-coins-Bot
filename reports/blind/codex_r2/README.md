# Codex Round 2 Phase A artifacts

See ../ROUND2_codex_REPORT.md for the report and data requests. This is independent Phase A exploration, not the final Round 2 freeze. No other analysts’ reports or 8–10 Nov outcomes were used.

Requirements: Python 3 and NumPy; immutable all-coins data e67833121f1da0dc992c28fa26c5236a855c151a; frozen evaluator blind-eval-1.1 at be9b5459e2f7670946d9ca012f875b77aaaf5d5b.

Run with your absolute paths (the audit command requires the original local Round 1 commit):

```bash
python3 audit.py --data DATA_DIR --round1-repo ROUND1_CLONE --out source
python3 explore.py --data DATA_DIR --evaluator EVALUATE_PY --out results
python3 verify.py --evaluator EVALUATE_PY --out results
python3 score_selected.py --evaluator EVALUATE_PY --out results
```

verify.py imports explore.py, so keep them together. The replay directory and late_paths.jsonl are generated scratch artifacts and are not published. Original data and evaluator code are not modified. PHASE_A_SHA256SUMS.txt preserves the historical artifact hashes.
