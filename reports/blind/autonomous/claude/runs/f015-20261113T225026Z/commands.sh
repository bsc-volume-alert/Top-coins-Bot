#!/bin/sh
# f015-20261113T225026Z — exact commands (paths as used in the worker container). W=/home/claude/work/f015; R=<this folder>; repo at /home/claude/top-coins-bot; research-codex checked out at /home/claude/wt-codex
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir $W/replay: tokens.csv.gz -> ../data/tokens_window.csv.gz, feed_gaps.csv.gz -> ../data/feed_gaps_all.csv.gz, trades_part_*.csv.gz symlinks + outages.txt (six published intervals, F006 build_features.py OUTAGES)
# mirror of Codex's layout: $W/codex/c001-20261110T211226Z/{evaluate.py, replay -> $W/replay, data/ = entry-all files}; $W/codex/c018-lab-20261113T211100Z = copy of research-codex @ 03ea372 run folder; $W/codex_published = untouched copy for comparison
cp /home/claude/wt-claude/reports/blind/autonomous/claude/runs/f014-20261113T185102Z/ledger.csv.gz $W/codex/c018-lab-20261113T211100Z/peer_f014/ledger.csv.gz   # sha 93588088… (Codex's prepare_public.py asserts the same)
export F006P2_EVAL=$W/codex/c001-20261110T211226Z/evaluate.py F006P2_TOKENS=$W/codex/c001-20261110T211226Z/data/tokens_window.csv.gz
cd $W/codex; C=c018-lab-20261113T211100Z
python3 -I $C/precheck.py > $W/out/precheck.log 2>&1                                   # PRECHECK.json 56/56, creator_features.csv byte-identical, input_checksums.json 48/48
python3 -I $C/run_c018.py c001-20261110T211226Z/replay $C > $W/out/score.log 2>&1       # ledger.csv, trade_ledger.json, score_audit.json 9/9
python3 -I c001-20261110T211226Z/evaluate.py --data c001-20261110T211226Z/replay --rules $C/rule_control.py $C/rule_candidate.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $C/results_s1.json > $W/out/s1.log 2>&1   # 90/92 (2 = rule paths)
python3 -I $C/analyze.py > $W/out/analysis.log 2>&1                                     # results.json 619/619; trades_*.csv
python3 -I $C/partition_records.py                                                        # 19/19 CSV partitions byte-identical
python3 -I $C/validate.py > $W/out/validation.log 2>&1                                  # validation.json 50/50
# leaf / byte comparison with $W/codex_published -> compare_c018.json; manifest: (cd /home/claude/wt-codex/reports/blind/autonomous/codex/runs/$C && sha256sum -c ARTIFACT_SHA256SUMS.txt)  # 58/58
cat $W/codex_published/creator_features_0[1-4].csv | awk 'NR==1||!/^mint,/' > $W/out/creator_features_published.csv
python3 -I $R/rederive_f015.py /home/claude/wt-claude/reports/blind/autonomous/claude/runs/f014-20261113T185102Z/ledger.csv.gz $W/out/creator_features_published.csv $W/codex_published $W/out/rederive_f015.json   # independent re-derivation
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
