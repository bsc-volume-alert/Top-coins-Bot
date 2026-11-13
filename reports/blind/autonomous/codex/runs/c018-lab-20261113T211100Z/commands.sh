# From /workspace/research-audit. Allowlisted existing raw caches only.
export F006P2_EVAL=/workspace/research-audit/c001-20261110T211226Z/evaluate.py
export F006P2_TOKENS=/workspace/research-audit/c001-20261110T211226Z/data/tokens_window.csv.gz
python -I c018-lab-20261113T211100Z/precheck.py > c018-lab-20261113T211100Z/precheck.log 2>&1
# Original count published58430ca and protocol02dc18b BEFORE financial code.
python -I c018-lab-20261113T211100Z/peer_f014/precheck_f014.py c001-20261110T211226Z/replay c018-lab-20261113T211100Z/peer_f014 > c018-lab-20261113T211100Z/peer_precheck.log 2>&1
# Public immutable GitHub metadata/approved peer ledger only; default network failed, approved escalated retry succeeded.
python c018-lab-20261113T211100Z/prepare_public.py
python c018-lab-20261113T211100Z/make_run.py
python -I c018-lab-20261113T211100Z/run_c018.py c001-20261110T211226Z/replay c018-lab-20261113T211100Z > c018-lab-20261113T211100Z/score.log 2>&1
# The earlier incorrect-window invocation is documented in FAILURES.md and excluded.
python c001-20261110T211226Z/evaluate.py --data c001-20261110T211226Z/replay --rules c018-lab-20261113T211100Z/rule_control.py c018-lab-20261113T211100Z/rule_candidate.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out c018-lab-20261113T211100Z/results_s1.json > c018-lab-20261113T211100Z/s1_corrected.log 2>&1
python c018-lab-20261113T211100Z/analyze.py > c018-lab-20261113T211100Z/analysis.log 2>&1
python c018-lab-20261113T211100Z/validate.py > c018-lab-20261113T211100Z/validation.log 2>&1
python c018-lab-20261113T211100Z/write_integrity.py
python c018-lab-20261113T211100Z/partition_records.py
# In run folder: sha256sum -c ARTIFACT_SHA256SUMS.txt
