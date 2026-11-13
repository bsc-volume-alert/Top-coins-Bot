# Run from /workspace/research-audit. Existing allowlisted raw caches only.
python c017-lab-20261113T152100Z/precheck.py > c017-lab-20261113T152100Z/precheck.log 2>&1
# Original counts published ba99d8a; protocol closure c395813. Both rules NOT TESTABLE; no scoring command executed.
F006P2_EVAL=c001-20261110T211226Z/evaluate.py F013_TOKENS=c001-20261110T211226Z/data/tokens_window.csv.gz python -I c017-lab-20261113T152100Z/peer_f013/precheck_f013.py c001-20261110T211226Z/replay c017-lab-20261113T152100Z/peer_f013/precheck_rebuilt.json > c017-lab-20261113T152100Z/peer_precheck.log 2>&1
F006P2_EVAL=c001-20261110T211226Z/evaluate.py F013_TOKENS=c001-20261110T211226Z/data/tokens_window.csv.gz python -I c017-lab-20261113T152100Z/peer_f013/descriptive_f013.py c001-20261110T211226Z/replay c017-lab-20261113T152100Z/peer_f013/descriptive_rebuilt.json > c017-lab-20261113T152100Z/peer_descriptive.log 2>&1
python c017-lab-20261113T152100Z/verify_counts.py > c017-lab-20261113T152100Z/count_verification.log 2>&1
python c017-lab-20261113T152100Z/compare_peer.py > c017-lab-20261113T152100Z/peer_verification.log 2>&1
python c017-lab-20261113T152100Z/write_integrity.py
# In run folder: sha256sum -c ARTIFACT_SHA256SUMS.txt
