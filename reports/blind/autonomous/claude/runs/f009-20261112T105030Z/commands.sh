#!/bin/sh
# f009-20261112T105030Z — exact commands (paths as used in the worker container). W=/home/claude/work/f009; R=<this folder>
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz; outages.txt = six published intervals (F006 build_features.py OUTAGES)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
python3 -I $R/run_f009.py $W/replay $W/out > $W/out/s2.log 2>&1
python3 -I $W/eval/evaluate.py --data $W/replay --rules $R/rule_control.py $R/rule_cellA.py $R/rule_cellB.py $R/rule_cellC.py $R/rule_l004ts.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
# Codex L004 re-derivation: trade_l004_00[1-6].csv + trade_baseline_00[1-6].csv from research-codex @ 5024b9e, inline python (codex_l004_rederived.json)
# control ledger vs f006p2 ledger.csv.gz: inline python field-by-field comparison (0 differences)
