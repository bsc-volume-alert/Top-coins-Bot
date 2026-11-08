# Codex Phase B reproduction

Source report/code: Fable branch blind-fable-r2-8nov at 8011d4eef5b0cf75245ed293d1809c6896b500b7. Gemini critique: tracker at 10593e9dc24ea451ab7c6cc95b77ccfa432c3779. Raw all-coins data: e67833121f1da0dc992c28fa26c5236a855c151a. Frozen evaluator source SHA256: f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86.

Requirements: Python 3, NumPy and pandas. Export Fable's reports/blind/fable_r2 directory from its specified commit into FABLE_DIR. The engine is executed after substituting only its data directory; original source is unchanged. DATA_DIR is the immutable all-coins export; EVALUATE_PY is frozen eval-1.1 evaluate.py; OUT_DIR is generated output.

```bash
python3 reproduce.py --data DATA_DIR --evaluator EVALUATE_PY --fable FABLE_DIR --out OUT_DIR
python3 check_candidate.py --out OUT_DIR --evaluator EVALUATE_PY
python3 artifact_checks.py --data DATA_DIR --evaluator EVALUATE_PY --out OUT_DIR
python3 aux_checks.py --out OUT_DIR --evaluator EVALUATE_PY
```

reproduce.py supplies the five-outage replay adapter, reconstructs 3,693 launches from raw trades, reproduces the headline cells and creator-window candidate, and compares every unconditional retention/hold30 result to frozen run_launch. check_candidate.py directly checks FTC-R0 and its hold30 variant under both fees and sizes against frozen run_launch, with abstentions padded to common N for frozen scoring at K=1. These are offline feature-conditioned audits: missing creator metadata still prevents submitting FTC-R0 through the public view interface.

The large generated per-launch ledgers are reproducible but omitted from publication. candidate_frozen_summary.json is the audit/summaries subset of generated candidate_frozen_audit.json. unconditional_frozen_summary.json aggregates generated frozen_launches.json. The buffer counterexample is synthetic, not another trading rule or real launch. Neither original data nor evaluator is modified.
