# C001: raw-development reproduction completed

Fixed, already-published ID34 was replayed on immutable pre-8-Nov development records. This is a reproduction, not a new discovery or fresh test. No parameters were selected here.

## Result

All 3,638 eligible launches match the published categories, hypothetical flags and per-size net SOL within 1e-12, under pool fees 30 and 125 bps. Data SHA256 checks: 16/16 passed. Stream: 4,913 mints; 1,568,880 duplicates removed; no noncontiguous mints. Eligibility exclusions: 301 streams did not reconstruct retention; 974 outage exclusions.

| Half | Eligible | Scored | Unknown | Net SOL, 0.2 | Net SOL, 0.02 |
|---|---:|---:|---:|---:|---:|
| Early | 1,593 | 35 | 0 | +0.480222079745 | +0.006984886933 |
| Late | 2,045 | 45 | 1 | -1.119883997317 | -0.166343203088 |

The later unknown is retained separately; worst-case lower totals are -1.321383997317 and -0.187843203088 SOL. Detailed mean/median, severe losses and no-best-mint calculations are in reproduction.json. Bootstrap and exposure were not recomputed. No supported-profitability claim is made.

## Reproduction

Python 3 with NumPy. Save this directory locally. Run `python prepare.py`, then `python reproduce.py > run.log 2>&1`. prepare.py downloads approximately 1 GB of existing public development files and verifies all manifest entries; no paid blockchain APIs. It resolves the historical code prefix, with the actual full commit and hashes preserved in sources.json. Original frozen evaluator and exports are never modified; replay uses local filename symlinks and the six published development outage assumptions.

Data: e67833121f1da0dc992c28fa26c5236a855c151a. Evaluator: be9b5459e2f7670946d9ca012f875b77aaaf5d5b. Original report/code: 93a9ed57ace4216d42e7b7a90d4967078e7ac9dc. Queue: 042df157c07f4424544a0ae46e4fbe304e3fe4a4. Attempted ledger is included; all 3,638 categories are checked by code against the immutable published full ledger.

## Boundaries and next work

Frozen evaluator's known causality/decoder/coverage limitations remain. This does not validate live execution. Hidden 8-10 Nov or later outcomes were not accessed. No live trades or purchases occurred. Storage/compute/model usage were not monetarily measured.

Next task: C002, named instant-graduation and no-entry/buffer counterexamples, using the existing verified development cache. C003 may proceed independently if C002 blocks.

Scheduler is enabled every six hours and its worker prompt was delivered into this thread during setup. A separate unattended completed run and delivery status are not established by this interactive result. Claude/Gemini are not configured in this environment (no CLI/provider credentials available).

R7 clarification (12Nov2026): all80 scored ID34 launches have curve fills and curve exits at both sizes; the30bps/125bps pool-fee runs are identical and do not establish fee sensitivity. C012 run/c001_fee_scope_audit.json independently checks the saved ledger.
