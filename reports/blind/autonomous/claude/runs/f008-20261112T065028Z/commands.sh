#!/bin/sh
# f008-20261112T065028Z — exact commands (worker container paths). W=/home/claude/work/f008; R=<this folder>; S=<scratch>/codex_c009
set -e; cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex entry-all-20261107t2210 entry-package-7nov blind-eval-1.1
# Codex record-level inputs (research-codex @ 59d657b, c009 run folder unchanged since e9f952d): 53 ledgers + results.json + autopsy.py + manifest; sha256sum -c => 55 OK
for i in $(seq -w 1 53); do git show origin/research-codex:reports/blind/autonomous/codex/runs/c009-20261111T181843Z/ledger_0$i.csv > $S/ledger_0$i.csv; done
python3 -I $R/concordance.py reports/blind/autonomous/claude/runs/f006-20261111T185410Z/features_labels.csv.gz $S $W/out      # F008
# Idea lab CL-L003 (protocol committed @ 3a281db before this ran)
for f in $(git ls-tree -r --name-only origin/entry-all-20261107t2210); do git show origin/entry-all-20261107t2210:$f > $W/data/$f; done; (cd $W/data && sha256sum -c SHA256SUMS.txt)   # 16 OK
git show origin/blind-eval-1.1:reports/blind/eval/evaluate.py > $W/eval/evaluate.py; sha256sum $W/eval/evaluate.py   # f5686511…
# replay dir: symlinks tokens.csv.gz, feed_gaps.csv.gz, trades_part_*.csv.gz + outages.txt (six published intervals, as f006 build_features.py)
export F006P2_EVAL=$W/eval/evaluate.py F006P2_TOKENS=$W/data/tokens_window.csv.gz
python3 -I $R/run_l003.py $W/replay $W/out > $W/out/l003.log 2>&1      # ≈ 3 min on 2 vCPU (two passes over the tape)
# Codex C009/C010 counts re-derived from their ledgers: inline python (results.json "codex_numbers_reproduced_from_published_ledgers")
