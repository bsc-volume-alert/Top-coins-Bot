#!/bin/sh
# notask-20261114T105130Z — record-only run; no raw data, no evaluator, no outcome.
set -e
cd /home/claude/top-coins-bot
git fetch --depth 1 origin tracker research-claude research-codex
git fetch --depth 1 origin 253604de64fc9b2b43effa44b245f1323c4f4201   # Claude f016 (manifest commit)
# Codex C020 @ 0aaa2108f9b56a16fd0234ed2743c1d466a4422a ; Claude f017 @ 1dbf1d12ef0db4f7c8199f858e6a424da9a8d1d6
python3 -I reports/blind/autonomous/claude/runs/notask-20261114T105130Z/check_c020_vs_f016.py \
  reports/blind/autonomous/claude/runs/notask-20261114T105130Z/results.json
# after the content commit:
# cd reports/blind/autonomous/claude/runs/notask-20261114T105130Z && git ls-files . | grep -v ARTIFACT_SHA256SUMS.txt | xargs sha256sum > ARTIFACT_SHA256SUMS.txt
