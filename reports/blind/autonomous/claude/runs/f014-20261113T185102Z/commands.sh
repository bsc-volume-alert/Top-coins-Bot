#!/bin/sh
# f014-20261113T185102Z — exact commands (paths as used in the worker container). W=/home/claude/work/f014; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir $W/replay: tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz symlinks + outages.txt (six published intervals, F006 build_features.py OUTAGES)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
# --- PROTOCOL.md committed first (934a86e), then the pre-check, counts only (committed 6a4fc23), then scoring ---
python3 -I $R/precheck_f014.py $W/replay $W/out > $W/out/precheck.log 2>&1              # precheck_f014.json, retention_features.csv (131/679 removed, testable)
python3 -I $R/run_f014.py $W/replay $W/out > $W/out/s2.log 2>&1                         # S2: ledger.csv, results_s2.json (asserts kept rows == control rows)
python3 -I $W/eval/evaluate.py --data $W/replay --rules $R/rule_control.py $R/rule_l012.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
# --- part (a): Codex C017 precheck.py unchanged @ 9aa2696; mirror layout $W/codex/{c001-20261110T211226Z/{evaluate.py,replay->$W/replay,data/tokens_window.csv.gz},c014-lab-20261112T211254Z/quote_features.csv,c016-lab-20261113T091125Z/precheck_features.csv,c017/precheck.py}
(cd $W/codex && python3 -I c017/precheck.py > c017/precheck.log 2>&1)                  # then leaf-compare PRECHECK.json with the published one and sha256 the CSVs -> codex_c017_confirmation.json
python3 -I $R/analyze_f014.py $W/out > $W/out/analyze.log 2>&1                           # results.json
gzip -9 -c $W/out/ledger.csv > $R/ledger.csv.gz; gzip -9 -c $W/out/retention_features.csv > $R/retention_features.csv.gz; cp $W/out/{results.json,results_s1.json,results_s2.json,precheck_f014.json,codex_c017_confirmation.json} $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
