#!/bin/sh
# f002-20261112T185332Z — exact commands (paths as used in the worker container). W=/home/claude/work/f002; D=/home/claude/data; R=<this folder>
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $D/entry-all/$f; done; (cd $D/entry-all && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $D/eval/evaluate.py; sha256sum $D/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz; outages.txt = six published intervals (F006 build_features.py OUTAGES)
export F006P2_EVAL=$D/eval/evaluate.py F006P2_TOKENS=$D/entry-all/tokens_window.csv.gz
python3 -I $R/run_f002.py $W/replay $W/out > $W/out/s2.log 2>&1                      # launch_arrays.npz (work file), launch_meta.json, ledger.csv, features_at_300s.csv
python3 -I $D/eval/evaluate.py --data $W/replay --rules $R/rule_control.py $R/rule_l006slots.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
python3 -I $R/analyze_f002.py $D/entry-all/tokens_window.csv.gz $W/out > $W/out/analyze.log 2>&1   # results.json, launches.csv, pairs.csv
# devbuy_diagnostic.json and codex_l005_rederived.json: inline python during the run (reproduced in README.md; Codex CSVs from research-codex @ e9b20e1 runs/c013-lab-20261112T151333Z/paired_partial_00[12].csv)
gzip -9 -k $W/out/{ledger,features_at_300s,launches,pairs}.csv; cp $W/out/{ledger,features_at_300s,launches,pairs}.csv.gz $W/out/{results,results_s1,devbuy_diagnostic,codex_l005_rederived}.json $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
