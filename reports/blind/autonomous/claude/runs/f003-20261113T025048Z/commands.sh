#!/bin/sh
# f003-20261113T025048Z — exact commands (paths as used in the worker container). W=/home/claude/work/f003; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz -> tokens_window.csv.gz, feed_gaps.csv.gz -> feed_gaps_all.csv.gz, trades_part_*.csv.gz; outages.txt = six published intervals (F006 build_features.py OUTAGES)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
export F003_F002_LAUNCHES=reports/blind/autonomous/claude/runs/f002-20261112T185332Z/launches.csv.gz F003_E_FEATURES=reports/blind/autonomous/claude/runs/f011-20261112T225049Z/features_at_300s.csv.gz
# --- pre-checks, counts only, before the protocol commit (05dd663) ---
python3 -I $R/precheck_conditions.py $W/out/precheck_conditions.json                 # C1 / C2 / C3 bind shares on E
python3 -I $R/prepass_ftb.py $W/replay $W/out > $W/out/prepass.log 2>&1              # wallet_map.pkl (9.4 MB, not committed), ftb_features.csv, ftb_precheck.json
# --- scoring, after the protocol commit ---
export F003_WALLET_MAP=$W/out/wallet_map.pkl
python3 -I $R/run_f003.py $W/replay $W/out > $W/out/s2.log 2>&1                       # asserts kept-spec rows == control rows on every kept launch
python3 -I $W/eval/evaluate.py --data $W/replay --rules $R/rule_control.py $R/rule_c1.py $R/rule_l008ftb.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out $W/out/results_s1.json > $W/out/s1.log 2>&1
# Codex C014 runner ledgers: runner_ledger_00[1-3].csv from research-codex @ be8cf89 (runs/c014-lab-20261112T211254Z) into $W/codex
python3 -I $R/analyze_f003.py $W/out $W/codex > $W/out/analyze.log 2>&1              # writes results.json
gzip -9 -k $W/out/ledger.csv $W/out/features_at_300s.csv $W/out/ftb_features.csv; cp $W/out/{ledger.csv.gz,features_at_300s.csv.gz,ftb_features.csv.gz,results.json,results_s1.json,results_s2.json} $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
