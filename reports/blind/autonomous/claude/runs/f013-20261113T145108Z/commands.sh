#!/bin/sh
# f013-20261113T145108Z — exact commands (paths as used in the worker container). W=/home/claude/work/f013; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir $W/replay: tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz symlinks + outages.txt (six published intervals, c001 reproduce.py)
export F006P2_EVAL=$W/eval/evaluate.py F013_TOKENS=$W/data/tokens_window.csv.gz
# PROTOCOL.md written first; then (counts only, no outcome read):
python3 -I $R/precheck_f013.py $W/replay $R/precheck_f013.json        # 550/568 removed = 96.8 % -> NOT TESTABLE (protocol commit f8d7128)
python3 -I $R/descriptive_f013.py $W/replay $R/descriptive_f013.json  # counts-only features of the 568 control triggers
# NOT RUN (NOT TESTABLE, R54 / F013): python3 -I $R/run_f013.py $W/replay $W/out ; python3 -I $R/analyze_f013.py $W/out $R
# Codex L008 re-derivation from its published CSVs (f012 script unchanged):
git archive origin/research-codex reports/blind/autonomous/codex/runs/c016-lab-20261113T091125Z | tar -x --strip-components=5 -C $W/codex_pub
python3 -I reports/blind/autonomous/claude/runs/f012-20261113T105105Z/codex_l008_rederive.py $W/codex_pub/c016-lab-20261113T091125Z $R/codex_l008_rederived.json
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
