#!/bin/sh
# F001 — exact commands (paths as used in the worker container). W=/home/claude/work/f001
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1 93a9ed57ace4216d42e7b7a90d4967078e7ac9dc
for r in c001-20261110T211226Z c002-20261111T031305Z c003-20261111T090819Z c004-20261111T151021Z; do git archive origin/research-codex reports/blind/autonomous/codex/runs/$r | tar -x -C $W/codex --strip-components=5; done
C1=$W/codex/c001-20261110T211226Z; for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $C1/data/$f; done; (cd $C1/data && sha256sum -c SHA256SUMS.txt)
git archive origin/entry-package-7nov | tar -x -C $W/codex/entry-package-7nov; (cd $W/codex/entry-package-7nov/snapshot3 && sha256sum -c SHA256SUMS.txt); (cd ../current && sha256sum -c SHA256SUMS.txt)
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $C1/evaluate.py
git show 93a9ed57ace4216d42e7b7a90d4967078e7ac9dc:reports/blind/codex_r2/explore.py > $C1/explore.py
git show 93a9ed57ace4216d42e7b7a90d4967078e7ac9dc:reports/blind/codex_r2/results/selected_entries.json > $C1/expected_entries.json
git show 93a9ed57ace4216d42e7b7a90d4967078e7ac9dc:reports/blind/codex_r2/results/results.json > $C1/expected_results.json
(cd $C1 && python3 -I reproduce.py > run.log.claude 2>&1)
(cd $W/codex/c002-20261111T031305Z && python3 -I reproduce.py --cache $C1 > run.log.claude 2>&1)
(cd $W/codex/c003-20261111T090819Z && python3 -I audit_local.py > audit.log.claude 2>&1)
(cd $W/codex/c004-20261111T151021Z && python3 -I audit.py > run.log.claude 2>&1)
python3 -I independent_checks.py $W/codex/entry-package-7nov independent_checks.json
# field-by-field JSON comparison and hash comparison: see rerun_field_comparison_c001_c002.json, rerun_hash_comparison.json (inline python in the session)
python3 -I lab/lab_absorbed_sell.py $C1 $W/lab/out > lab.log 2>&1
