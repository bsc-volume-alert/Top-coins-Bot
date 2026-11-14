# From /workspace/research-audit. Cached approved raw records only.
export F006P2_EVAL=/workspace/research-audit/c001-20261110T211226Z/evaluate.py
export F006P2_TOKENS=/workspace/research-audit/c001-20261110T211226Z/data/tokens_window.csv.gz
# Public immutable count-only peer input + parent-tree metadata. Default sandbox failed; approved retry succeeded.
python c020-review-20261114T091100Z/prepare_public.py
python -I c020-review-20261114T091100Z/peer_f016/testability_f016.py c001-20261110T211226Z/replay c020-review-20261114T091100Z/rebuilt > c020-review-20261114T091100Z/reproduction.log 2>&1
python -I c020-review-20261114T091100Z/independent.py > c020-review-20261114T091100Z/independent.log 2>&1
python -I c020-review-20261114T091100Z/compare.py > c020-review-20261114T091100Z/comparison.log 2>&1
python c020-review-20261114T091100Z/package_artifacts.py
# In run folder: sha256sum -c ARTIFACT_SHA256SUMS.txt
# No trading/evaluation scoring command; R91/R99 stop development-window tests.
