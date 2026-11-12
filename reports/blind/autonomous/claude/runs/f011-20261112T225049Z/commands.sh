#!/bin/sh
# f011-20261112T225049Z — exact commands (paths as used in the worker container). W=/home/claude/work/f011; R=<this folder>
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz; outages.txt = six published intervals (F006 build_features.py OUTAGES)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz F011_F002_LAUNCHES=reports/blind/autonomous/claude/runs/f002-20261112T185332Z/launches.csv.gz
python3 -I $R/run_f011.py $W/replay $W/out > $W/out/s2.log 2>&1            # asserts 0 transcription mismatches before writing results
python3 -I $W/eval/evaluate.py --data $W/replay --rules $R/rule_control.py $R/rule_l007new.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
# Codex ledgers: trade_l005_00[1-6].csv + trade_baseline_00[1-6].csv from research-codex @ be8cf89 (runs/c013-lab-20261112T151333Z, published @ e9b20e1) into $W/codex
python3 -I $R/analyze_f011.py $W/out $W/codex > $W/out/analyze.log 2>&1      # writes results.json
gzip -9 -k $W/out/ledger.csv $W/out/features_at_300s.csv; cp $W/out/{ledger.csv.gz,features_at_300s.csv.gz,results.json,results_s1.json,results_s2.json,transcription_mismatches.json} $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
