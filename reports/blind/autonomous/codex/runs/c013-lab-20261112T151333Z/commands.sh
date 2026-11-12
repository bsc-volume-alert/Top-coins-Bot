# Work from a common research-cache directory with this run and prior Codex runs as siblings.
# C001 setup documents approved raw files, evaluator hash and six outages; do not fetch protected branches.
python c013-lab-20261112T151333Z/prepare.py
F006P2_EVAL=c001-20261110T211226Z/evaluate.py F006P2_TOKENS=c001-20261110T211226Z/data/tokens_window.csv.gz python -I c013-lab-20261112T151333Z/claude_source/run_s2.py c001-20261110T211226Z/replay c013-lab-20261112T151333Z/claude_rebuilt > c013-lab-20261112T151333Z/claude_rebuild.log 2>&1
# Regenerate C010 trade_ledger.json with its unchanged lab.py if absent (published CSV partitions are the same evidence).
python c013-lab-20261112T151333Z/build_highinit.py
python c013-lab-20261112T151333Z/highinit_diagnostic.py > c013-lab-20261112T151333Z/highinit.log 2>&1
python c013-lab-20261112T151333Z/make_lab.py
python c013-lab-20261112T151333Z/lab.py > c013-lab-20261112T151333Z/lab.log 2>&1
python c013-lab-20261112T151333Z/analyze.py > c013-lab-20261112T151333Z/analysis.log 2>&1
python c013-lab-20261112T151333Z/build_exposure.py
python c013-lab-20261112T151333Z/audit_best_trade.py > c013-lab-20261112T151333Z/best_trade_audit.log 2>&1
python c013-lab-20261112T151333Z/audit_raw_pool.py > c013-lab-20261112T151333Z/raw_pool_audit.log 2>&1
# In run folder:
sha256sum -c ARTIFACT_SHA256SUMS.txt
