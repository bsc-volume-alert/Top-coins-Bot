#!/bin/sh
# F006 part 1 — exact commands run (paths as used in the worker container)
set -e
D=/home/claude/data/entry-all; P=/home/claude/data/pkg; E=/home/claude/data/eval; W=/home/claude/work/f006
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $D/$f; done
git show origin/entry-package-7nov:current/sol_usd.csv.gz > $P/sol_usd.csv.gz
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $E/evaluate.py
(cd $D && sha256sum -c SHA256SUMS.txt)
python3 -I build_features.py --data $D --solusd $P/sol_usd.csv.gz --eval $E --out $W > build.log 2>&1
python3 -I analyze.py --features $W/features_labels.csv.gz --summary $W/build_summary.json --out $W/out
