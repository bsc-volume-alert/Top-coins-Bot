#!/bin/sh
# f017-20261114T065226Z — exact commands (paths as used in the worker container). W=/home/claude/work/f017; R=<this folder>; repo at /home/claude/top-coins-bot
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
# allowlisted raw data (entry-all @ e678331): 16/16 SHA256 OK
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/evaluate.py; sha256sum $W/evaluate.py   # f5686511… (unchanged, imported only)
# entry-package-7nov @ 0e3be03: only the two FX / crossing files Codex's scripts read as HEADERS + their SHA256SUMS.txt / MANIFEST.md (hash check only; no value read)
for f in SHA256SUMS.txt MANIFEST.md current/SHA256SUMS.txt current/sol_usd.csv.gz current/coverage_crossings.csv.gz snapshot3/SHA256SUMS.txt snapshot3/sol_usd.csv.gz snapshot3/coverage_crossings.csv.gz snapshot3/MANIFEST.md; do git show origin/entry-package-7nov:$f > $W/pkg/$f; done
# replay dir $W/replay: tokens.csv.gz <- tokens_window.csv.gz, feed_gaps.csv.gz <- feed_gaps_all.csv.gz, trades_part_*.csv.gz symlinks, outages.txt (six published intervals, F006 build_features.py OUTAGES)
# --- Part A: Codex C019 @ 1258475 re-run UNCHANGED in a mirror of its layout: $W/mirror/{c001-20261110T211226Z/{evaluate.py,replay->$W/replay,data/<entry-all files>},
#     c014-lab-20261112T211254Z/quote_features.csv (identities only), c018-lab-20261113T211100Z/creator_features_0[1-4].csv (identities/cells only), entry-package-7nov->$W/pkg, c019/<its scripts>}
cd $W/mirror; python3 -I c019/register.py > c019/register.log 2>&1          # ~110 s; COUNTS.json, feature_records.csv, input_checksums.json
cp ../codex/initial_overlap_counts.json c019/; python3 -I c019/validate.py > c019/validation.log 2>&1; (cd c019 && python3 -I package_artifacts.py)   # SUPPORT_AUDIT.json, features_01-05.csv
# byte comparison with Codex's published files -> $R/c019_rerun_comparison.json (all identical)
# prepare_public.py (Codex's unauthenticated GitHub metadata read) was NOT run — no network read in this run.
# --- Part A independent re-derivation + Part B receipt-clock R86 (2) count (rules_common.py = f014/f016 copy, sha f94d800b…, unchanged)
export F006P2_EVAL=$W/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
python3 -I $R/crossreview_f017.py $W/replay $W/mirror/c019/feature_records.csv $W/out > $W/out/crossreview.log 2>&1   # ~170 s; results.json, f017_r86_2_clocks.csv, f017_partA_records.csv
python3 -I $R/check_n1_ties_n5_boundary.py $W/replay $W/mirror/c019/feature_records.csv      # ~230 s; N1 tie sensitivity, N5 boundary rows
python3 -I $R/check_n5_window_bounds.py $W/replay $W/mirror/c019/feature_records.csv         # ~170 s; N5 signal count under (D-5,D] / [D-5,D) / [D-5,D]
gzip -9 -c $W/out/f017_r86_2_clocks.csv > $R/f017_r86_2_clocks.csv.gz; gzip -9 -c $W/out/f017_partA_records.csv > $R/f017_partA_records.csv.gz; cp $W/out/results.json $R/
# ARTIFACT_SHA256SUMS.txt: after the content commit, sha256sum of `git ls-files $R` (committed files only, R18/R24)
