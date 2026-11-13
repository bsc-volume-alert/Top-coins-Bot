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

|CDEX-L004|Early-cohort3-wallet>=2SOL/2s sell-cluster exit; lockedL003 entries|e6783312;6Nov07:40–7Nov20:00UTC|291;5 fills unavailable;74 exits uncertain;217 resolved (296 attempts)|-2.043602 observed|-4.71% /-12.62%|-2.910945SOL|1 new exit;2 total with locked baseline|failed|c012-lab-20261112T091226Z|
|CDEX-L004-BASELINE|OriginalL00330% proceeds trail on same296 entries|same|291;5 fills unavailable;96 exits uncertain;195 resolved|-4.645368 observed|-11.91% /-23.03%|-5.561080SOL|1 locked control;2 total|inconclusive|c012-lab-20261112T091226Z|

L004 R11 paired195: candidate -2.179783 versus baseline -4.645368SOL; difference+2.465585 (+1.826281 early,+0.639304 late). Candidate remains negative in both halves; full P&L unknown. Win33.64%, loss>50%2.76%, no-best1 -2.366870SOL. All winners counted. No activity-gate retest or threshold sweep. Coverage comparisons are not additional trading variants.

|CDEX-L005|Half-sale at1.5xnet proceeds; reset remaining30%proceeds trail; lockedL003entries|e6783312;6Nov07:40–7Nov20:00UTC|291;5fills unavailable;96exits uncertain;195resolved(296attempts)|-2.208979observed|-5.66%/-22.98%|-4.149901SOL|1newcandidate;2totalwithlockedbaseline|failed|c013-lab-20261112T151333Z|
|CDEX-L005-BASELINE|OriginalL003whole-position30%proceeds trail|same|291;5fills unavailable;96exits uncertain;195resolved|-4.645368observed|-11.91%/-23.03%|-5.561080SOL|1lockedcontrol;2total|inconclusive|c013-lab-20261112T151333Z|

L005:paired195improve2.436389SOL,35better/9worse/151unchanged. Win25.64%,loss>50%4.10%,no-best1 -3.724783SOL. Early-2.656776,late+0.447797;latewithoutbest-1.068007.69partial sells model-land;extra fee.00075SOL perpositionwithpartial.25partials have unresolved final exits;their4.135041SOLmodeled cash is separate,not full profit. Largest counted winner+1.515804SOL has raw WSOL/decimal evidence but unverified reserve-product changes. Same explored data,no fresh confirmation,no cluster retune.

| CDEX-L006 | Veto when latest received token quote is ≥5% above latest already-known chain-state quote; locked L003 entries | e6783312; 6 Nov 07:40–7 Nov 20:00 UTC | 291 filled; 5 fills unavailable; 96 exits uncertain; 195 resolved (296 attempts) | −4.645368 observed | −11.91% / −23.03% | −5.561080 SOL | 1 new candidate; 2 total with baseline; 1 threshold | inconclusive | c014-lab-20261112T211254Z |
| CDEX-L006-BASELINE | Original L003 entries and whole-position 30% proceeds trail | same | 291 filled; 5 fills unavailable; 96 exits uncertain; 195 resolved | −4.645368 observed | −11.91% / −23.03% | −5.561080 SOL | 1 locked control; 2 total | inconclusive | c014-lab-20261112T211254Z |

Quote states are the same row at all 296 decisions: ratio 1.0, zero vetoes. Candidate retains all controls; paired 195-trade difference is zero. No lower threshold or timing retune. Win rate 23.08%; losses over 50%: 5.13%; without best one: −4.968636 SOL; early/late: −3.089285/−1.556083. Full total remains unknown. C014 is a counts/opportunity audit, not another strategy test or fresh validation.

R54 accounting note (13 Nov): CDEX-L006 rows above are the unchanged baseline replay and a zero-binding feature-equality fact. They do not count as an operative Idea Lab test. Their recorded values are retained rather than silently removed.

| CDEX-L007 | Exit on first post-fill creator sale recovering reported buy SOL while retaining positive trade-derived inventory | e6783312; 6 Nov 07:40–7 Nov 20:00 UTC | 291 filled; 5 fills unavailable; 96 exits uncertain; 195 resolved (296 attempts) | −4.953473 observed | −12.70% / −23.03% | −5.813415 SOL | 1 new candidate; 2 total with locked baseline | failed | c015-lab-20261113T031524Z |
| CDEX-L007-BASELINE | Original L003 entries and whole-position 30% proceeds trail | same | 291 filled; 5 fills unavailable; 96 exits uncertain; 195 resolved | −4.645368 observed | −11.91% / −23.03% | −5.561080 SOL | 1 locked control; 2 total | inconclusive | c015-lab-20261113T031524Z |

Only two creator-event exits; one worsens proceeds and one leaves them unchanged. R11 paired 195: −0.308105 SOL difference (early 0, late −0.308105). Win rate 22.56%; losses over 50%: 5.13%; without best one: −5.276740 SOL. Early/late totals: −3.089285/−1.864188. Full total unknown; sparse support, no general creator-mechanism claim or threshold retune. This is an event exit, not an entry veto; R54’s removal-share precheck is not applicable.
