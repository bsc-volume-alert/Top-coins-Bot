#!/bin/sh
# f012-20261113T105105Z — exact commands (paths as used in the worker container). W=/home/claude/work/f012; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git archive origin/entry-package-7nov | tar -x -C $W/pkg; (cd $W/pkg/snapshot3 && sha256sum -c SHA256SUMS.txt); (cd $W/pkg/current && sha256sum -c SHA256SUMS.txt)   # 58 / 51 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# --- Part 1: Codex C016 sibling layout (research-codex @ d820bda) and re-runs with its scripts UNCHANGED ---
git archive origin/research-codex reports/blind/autonomous/codex/runs | tar -x --strip-components=5 -C $W/codex   # c001, c010, c014, c016 used
ln -s $W/pkg $W/codex/entry-package-7nov; for f in $W/data/*; do ln -s $f $W/codex/c001-20261110T211226Z/data/; done; cp $W/eval/evaluate.py $W/codex/c001-20261110T211226Z/evaluate.py
# replay dir inside c001 exactly as c001 reproduce.py builds it (symlinks + outages.txt with the six published intervals); published c016 outputs moved to $W/published and deleted from the working copy
cd $W/codex && python3 -I c016-lab-20261113T091125Z/audit_provenance.py && python3 -I c016-lab-20261113T091125Z/audit_cross_table.py && python3 -I c016-lab-20261113T091125Z/audit_nested_checks.py
python3 -I c010-lab-20261111T211258Z/lab.py        # regenerates the unpublished c010 trade_ledger.json (lab_results.json 172/172 identical)
python3 -I c016-lab-20261113T091125Z/precheck.py && python3 -I c016-lab-20261113T091125Z/make_lab.py && python3 -I c016-lab-20261113T091125Z/lab.py && python3 -I c016-lab-20261113T091125Z/analyze_lab.py
# field-by-field / sha256 comparison with $W/published -> $R/rerun_comparison.json (inline python in the session)
python3 -I $R/independent_checks.py $W/pkg $W/data $R/independent_checks.json
python3 -I $R/codex_l008_rederive.py $W/published/c016-lab-20261113T091125Z $R/codex_l008_rederived.json
# --- Part 2: CL-L010 (B = 10 written in PROTOCOL.md first; pre-check counts only; protocol commit 1b16297; then scoring) ---
export F006P2_EVAL=$W/eval/evaluate.py F012_TOKENS=$W/data/tokens_window.csv.gz   # replay dir $W/replay: tokens.csv.gz, feed_gaps.csv.gz, trades_part_*.csv.gz symlinks + outages.txt
python3 -I $R/precheck_f012.py $W/replay $R/precheck_f012.json
python3 -I $R/run_f012.py $W/replay $W/out > $W/s2.log 2>&1
python3 -I $R/analyze_f012.py $W/out $R; gzip -9 -c $W/out/ledger.csv > $R/ledger.csv.gz; cp $W/out/results.json $W/out/results_s2.json $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
