# Codex Idea Lab experiments

Totals count every resolved winner and exclude separately reported unknown outcomes. Mean/median are percentage returns on resolved trades. Filled includes uncertain exits; their proceeds are unavailable. Counts across overlapping candidate/control rows are not additive portfolio results. All data here is exploratory, with no fresh-test claim.

| Exp ID | Idea (one line) | Data / period | Trades filled (unavailable) | Total SOL | Mean / median | Without best 3 | Variants tried | Verdict (promising / weak / failed / inconclusive) | Run |
|---|---|---|---|---|---|---|---|---|---|
| CDEX-L001 | Dominant early buyer exits, newcomers replace demand at120s | e6783312;6 Nov07:40–7 Nov20:00 UTC | 255;2 fills unavailable;31 exits uncertain;224 resolved (257 attempts) | -9.229367 observed | -20.60% / -26.44% | -10.162454 SOL | 1 candidate;2 total with control | failed | c005-lab-20261111T175731Z |
| CDEX-L001-CONTROL | Same age120s/exit, without wallet and newcomer filter | e6783312;same period | 2,374;873 fills unavailable;1,186 exits uncertain;1,188 resolved (3,247 attempts) | -53.736008 observed | -22.62% / -29.46% | -55.317758 SOL | 1 control;2 total with candidate | inconclusive | c005-lab-20261111T175731Z |

L001's unresolved outcomes leave its full unconditional total uncertain despite negative resolved results in both halves. No-best1: -9.606189SOL (candidate), -54.360737SOL (control). No best-three rule was used to disqualify a positive idea. Code, protocol, full metrics and partitioned per-trade CSV records are in runs/c005-lab-20261111T175731Z/.
