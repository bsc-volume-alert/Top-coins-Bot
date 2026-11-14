#!/bin/sh
# f016-20261114T025106Z — exact commands (paths as used in the worker container). W=/home/claude/work/f016; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir $W/replay: tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz symlinks + outages.txt (six published intervals, F006 build_features.py OUTAGES)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
# --- PROTOCOL.md committed first (323c1e6, 02:56 UTC), then the count (code and count in the same commit, R90 note (i)) ---
python3 -I $R/testability_f016.py $W/replay $W/out > $W/out/testability.log 2>&1       # results.json, f016_features.csv (679 rows, no outcome column); ~62 s
gzip -9 -c $W/out/f016_features.csv > $R/f016_features.csv.gz; cp $W/out/results.json $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
