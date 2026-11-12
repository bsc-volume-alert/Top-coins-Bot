# From repository reports/blind/autonomous/codex/runs; approved caches only.
# Resolve source commits and verify input manifests before execution (source_integrity.json).
python c012-lab-20261112T091226Z/run_labels.py strict > c012-lab-20261112T091226Z/strict.log 2>&1
python c012-lab-20261112T091226Z/run_labels.py tol30 > c012-lab-20261112T091226Z/tol30.log 2>&1
python c012-lab-20261112T091226Z/make_lab.py
python c012-lab-20261112T091226Z/lab.py > c012-lab-20261112T091226Z/lab.log 2>&1
python c012-lab-20261112T091226Z/analyze_run.py > c012-lab-20261112T091226Z/analysis.log 2>&1
# In this run folder, verify exactly published artifacts:
sha256sum -c ARTIFACT_SHA256SUMS.txt
