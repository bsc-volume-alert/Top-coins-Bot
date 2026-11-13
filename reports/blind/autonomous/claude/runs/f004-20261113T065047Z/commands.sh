#!/bin/sh
# f004-20261113T065047Z — exact commands (paths as used in the worker container). W=/home/claude/work/f004; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 blind-eval-1.1 analysis-fable-11nov
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz; outages.txt = six published intervals (F006 build_features.py OUTAGES)
D=reports/analysis/entry_winners/fable_11nov; git show origin/analysis-fable-11nov:$D/13_momentum_trades.py > $W/study/13_momentum_trades.py   # sha 2b4d4faf…
git show origin/analysis-fable-11nov:$D/out/momentum_entries.csv > $W/study/momentum_entries_FULL_DO_NOT_READ.csv                         # sha b45eb610…
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
# --- step 0/1 (before the protocol commit 54b252c): window filter (mint column only), verbatim re-run, comparison, R54 pre-check (counts only) ---
python3 -I $R/filter_study.py $W/data/tokens_window.csv.gz $W/study/momentum_entries_FULL_DO_NOT_READ.csv $W/out; rm $W/study/momentum_entries_FULL_DO_NOT_READ.csv
python3 -I $R/repro_momentum.py $W/replay $W/out > $W/out/repro.log 2>&1
python3 -I $R/compare_study.py $W/out
python3 -I $R/precheck_f004.py $W/replay $W/out/precheck_f004.json
# --- scoring, after the protocol commit ---
export F004_STUDY_MINTS=$W/out/study_entries_window.csv
python3 -I $R/run_f004.py $W/replay $W/out > $W/out/s2.log 2>&1
python3 -I $R/s1_wrapper.py --data $W/replay --rules $R/rule_base60.py $R/rule_run2.py $R/rule_run3.py $R/rule_run5.py $R/rule_dipctl.py $R/rule_dipcand.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
# Codex C015 published CSVs/JSON from research-codex @ 9a9fa3d (runs/c015-lab-20261113T031524Z) into $W/codex
python3 -I $R/codex_c015_rederive.py $W/codex $W/out/codex_c015_rederived.json
python3 -I $R/analyze_f004.py $W/out                                                   # writes results.json
gzip -9 -k $W/out/ledger.csv; cp $W/out/{ledger.csv.gz,results.json,results_s1.json,results_s2.json,codex_c015_rederived.json} $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
