# Codex Idea Lab experiments

Totals count every resolved winner and exclude separately reported unknown outcomes. Mean/median are percentage returns on resolved trades. Filled includes uncertain exits; their proceeds are unavailable. Counts across overlapping candidate/control rows are not additive portfolio results. All data here is exploratory, with no fresh-test claim.

| Exp ID | Idea (one line) | Data / period | Trades filled (unavailable) | Total SOL | Mean / median | Without best 3 | Variants tried | Verdict (promising / weak / failed / inconclusive) | Run |
|---|---|---|---|---|---|---|---|---|---|
| CDEX-L001 | Dominant early buyer exits, newcomers replace demand at120s | e6783312;6 Nov07:40–7 Nov20:00 UTC | 255;2 fills unavailable;31 exits uncertain;224 resolved (257 attempts) | -9.229367 observed | -20.60% / -26.44% | -10.162454 SOL | 1 candidate;2 total with control | failed | c005-lab-20261111T175731Z |
| CDEX-L001-CONTROL | Same age120s/exit, without wallet and newcomer filter | e6783312;same period | 2,374;873 fills unavailable;1,186 exits uncertain;1,188 resolved (3,247 attempts) | -53.736008 observed | -22.62% / -29.46% | -55.317758 SOL | 1 control;2 total with candidate | inconclusive | c005-lab-20261111T175731Z |

L001's unresolved outcomes leave its full unconditional total uncertain despite negative resolved results in both halves. No-best1: -9.606189SOL (candidate), -54.360737SOL (control). No best-three rule was used to disqualify a positive idea. Code, protocol, full metrics and partitioned per-trade CSV records are in runs/c005-lab-20261111T175731Z/.

| CDEX-L002 | Fixed5min liquidity stress gate against a hypothetical5SOL inventory sale | e6783312;6Nov07:40–7Nov20:00UTC | 572;248 fills unavailable;191 exits uncertain;381 resolved (820 attempts) | -15.293066 observed | -20.07% / -24.78% | -16.208778SOL | 1 candidate;2 total with control | failed | c009-20261111T181843Z |
| CDEX-L002-CONTROL | Same5min execution and exit, no stress gate | e6783312;same period | 1,394;2,095 fills unavailable;857 exits uncertain;537 resolved (3,489 attempts) | -19.469149 observed | -18.13% / -26.50% | -22.212237SOL | 1 control;2 total with candidate | inconclusive | c009-20261111T181843Z |

C009 autopsy diagnostics at15/30min were not extra selected trading candidates. Matched sustained-runner/non-runner pairs:0 because no negative path passed registered coverage; the predictive comparison remains blocked. All unresolved outcomes stay separate. No-best1 for L002/control: -15.616334/-21.293953SOL.

| CDEX-L003 |5min material net buyers plus persistent receipt-time curve inflow |e6783312;6Nov07:40–7Nov20:00UTC|291;5 fills unavailable;96 exits uncertain;195 resolved (296 attempts)|-4.645368 observed|-11.91% / -23.03%|-5.561080SOL|1 candidate;2 total with control|failed|c010-lab-20261111T211258Z|
| CDEX-L003-CONTROL |Same5min curve eligibility/exit, no activity gate |e6783312;same period|1,271;2,091 fills unavailable;805 exits uncertain;466 resolved (3,362 attempts)|-15.418002 observed|-16.54% / -25.78%|-16.659554SOL|1 control;2 total with candidate|inconclusive|c010-lab-20261111T211258Z|

L003 has negative untrimmed resolved totals in both halves; full P&L remains unknown. No-best1 candidate/control:-4.968636/-15.999912SOL. C010 detection reproduction is not another trading variant. Publication recovered12Nov after an interrupted GitHub request, without rerunning or retuning the experiment.
