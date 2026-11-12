# C012 coverage audit and L004 sell-cluster exit

One bounded queue task plus one fixed Idea-lab test. Preregistered at f044ea960fad409a943db06989a1d8b0f888288f, after claim61f66eee1fdbe42142cf945a322576a6c78006c5. Calculated12Nov2026 ~09:14–09:20UTC. Previously examined development records only; no fresh confirmation, live trades, paid collection or protected outcomes. Two trading specs: one new exit and a locked baseline. No threshold sweep.

## What changed in knowledge

K007's zero-negative obstruction survives R2. Ignoring short logged main-feed gaps does not fix the separate requirement that a coin prints continuously enough for two hours. K011's gap concern has measurable exposure, not measured error prevalence. K012's losing L003 entry can lose less under a wallet-cohort exit; that does not establish positive expectancy. The next priority is C013's common-denominator control reconciliation, followed by C014's pre-gap proceeds audit. C006's matched net-label comparison remains blocked; neither unknowns nor an absence of trades became negative labels.

## C012: same3,638-launch denominator

Strict C009 code was executed again: every original record and the complete results JSON match. Tol30 changes ONLY the two sustained-label logged-gap checks. Execution, fill status and every non-label record field match strict exactly. Receipt inter-observation continuity, fees, horizon and original eligibility remain unchanged. Zero negatives means zero matched pairs and no identified runner/non-runner liquidity effect under this specification.

|Age|Net2h strict positives / negatives / unknown on common denominator|Net2h tol30 positives / negatives / unknown|Matched pairs|
|---|---|---|---|
|5min|56 / 0 / 3582|59 / 0 / 3579|0|
|15min|21 / 0 / 3617|24 / 0 / 3614|0|
|30min|9 / 0 / 3629|10 / 0 / 3628|0|

Unknown totals above include149/150/151 launches outside the eligible state cohort; label_comparison.json keeps that group separate. Do not mistake the common denominator for full trade-history coverage across every recorded launch.

Published Claude F006 price1h labels were read from their immutable file, checksum reverified; the raw build was already reproduced in C010. They answer a different question from executable net2h labels. Including non-ok rows as unknown on the SAME3,638 denominator:

|Age|Price1h strict runners / nonrunners / unknown|Price1h tol30 runners / nonrunners / unknown|Tol30 negatives exposed to any main-feed gap<30s in1h|
|---|---|---|---|
|5min|117 /1249 /2272|117 /3052 /469|1803 /3052|
|15min|56 /1107 /2475|56 /2659 /923|1552 /2659|
|30min|24 /906 /2708|24 /2218 /1396|1312 /2218|

These counts are sensitivities, not certified ground truth. Every tol30 negative has a per-mint exposure flag/count in negative_gap_exposure_*.csv (all7929 records). Exposed counts bound possible short-gap effects, not observed misclassifications. All strict net positives are among the price positives (56/21/9); the same is true of tol30 net positives (59/24/10). Full cross-tabs and all10914 age/mint labels are published in label_comparison.json and label_ledger_*.csv. No $100K labels were relaxed or recomputed. No new runner definition was selected after seeing results.

Implementation correction is preserved: the initial tolerance driver filtered gaps globally, which affected90 execution records and zero fill statuses. That was outside R2's scope. It was corrected to the two label checks, rerun, and non-label equality asserted. No strategy parameter changed; implementation_correction.json records the discarded result hash. This is a coding correction, not a new profitable trial.

## L004: early-buyer sell-cluster exit

Builds on K004/K006/K010/K012. Same296 L003 entry attempts, same causal entry condition, same valid-curve eligibility. New exit: first receipt after fill where at least3 distinct first-minute curve buyers have sold at least2SOL combined within the preceding2s. Membership uses received buys by created+60s, not later wallet classifications. Use valid-state rows only; no ownership inference from synchronization. Earliest of that event, unchanged30% sellable-proceeds trail or2h. The fixed scenario is0.2SOL, +1s buy/+0.7s sale, curve125bps/pool55bps,0.0015SOL fixed, reserve impact, landing state<=30s; existing gaps, validity and completed-curve checks retained. Frozen evaluator unmodified. Full pseudocode/spec in PROTOCOL.md and executable lab.py.

|Arm / half|Attempts / fills / resolved|Unavailable fills / uncertain exits|Observed net SOL|Mean / median return|Win / loss>50%|Without best1 / best3 SOL|
|---|---|---|---|---|---|---|
|L004 early|143 /139 /109|4 /30|-1.058164|-4.85% /-11.19%|33.94% /5.50%|-1.302317 /-1.763699|
|L004 late|153 /152 /108|1 /44|-0.985438|-4.56% /-14.37%|33.33% /0%|-1.308706 /-1.818525|
|L004 all|296 /291 /217|5 /74|-2.043602|-4.71% /-12.62%|33.64% /2.76%|-2.366870 /-2.910945|
|Locked L003 baseline all|296 /291 /195|5 /96|-4.645368|-11.91% /-23.03%|23.08% /5.13%|-4.968636 /-5.561080|

Verdict: FAILED as a profitable specification on resolved trades in both halves. Full total remains unknown. All legitimate winners count; trimming the best coins is only a stress test. Baseline296 attempts and5663 original record fields match C010 exactly. Baseline vs candidate totals have different resolution counts, so their raw difference is not a paired improvement estimate.

R11 paired comparison on195 jointly resolved launches: baseline -4.645368SOL, new exit -2.179783SOL, difference +2.465585SOL. Early95: +1.826281SOL improvement; late100: +0.639304SOL.69 improve,23 worsen,103 unchanged. Paired set covers195/195 baseline-resolved and195/217 candidate-resolved.22 additional candidate exits resolve before the original exits become unknown (net +0.136182SOL); they do not imply any baseline return.74 positions remain uncertain in both arms;5 fills unavailable in both.

An exploratory creation-time3h block bootstrap of paired deltas (5000 resamples, seed12012,12 blocks) gives total improvement interval[+0.504475,+4.647888]SOL; early[+0.638632,+3.421600], late[-0.655919,+2.013254]. This is NOT independent or multiple-search-adjusted confirmation; same development data, selected joint-availability set, few time blocks. It cannot establish profitability, current-market execution or absence of bias. Median paired difference is0. The exit triggered120 times;110 stopped by the ordinary trail and61 reached the horizon, plus5 missing fills.

Observed net per common eligible launch: -0.000561738SOL. Peak modeled simultaneous position stakes3.2SOL candidate/3.6SOL baseline. Unlimited independent capital and historical nonpersistent price-impact assumptions; no cash-constrained portfolio replay. Exposure durations are in exposure.json. Unresolved positions can extend actual exposure beyond the modeled exit times. Unknown-zero and full-stake imputation fields in lab_results.json are explicitly hypothetical sensitivity totals, not actual P&L, bounds with statistical coverage or evidence that failed fills lost stake.

## Peer response and next questions

Read Claude DIALOGUE/EXPERIMENTS/STATUS at c1cf6d39b942de76771d79ba403856a1526db0df. KNOWLEDGE.md returned GitHub404 there; no memory file invented. Claude's F00856-subset117 finding agrees with the independently executed strict cross-tab here. The new59 subset117 appears only under the registered label tolerance. Both workers'5min activity entries remain unprofitable; L004 changes the exit mechanism, not that activity gate. The positive paired loss reduction merits reproduction, not a deployment or profitability claim. Ask Claude/coordinator to rerun L004 and audit the2s receipt-window membership/fees/paired selection. No direct model contact is claimed.

Other two registered ideas were not tested: creator-launch-again exit needs actual receipt-known launch messages; dust-sell alarm requires a separate registered test. They remain hypotheses. C013 is next, C014 after it. No third activity gate or forced matched label was introduced.

## Reproduce and verify

Use existing committed C001 cache setup to obtain the16 verified files at e67833121f1da0dc992c28fa26c5236a855c151a and unmodified frozen evaluate.py. Keep this run as a sibling of prior run folders under the worker runs directory, and C010's verified Claude feature file at its documented location. See commands.sh. run_labels.py executes the immutable C009 autopsy source with only the stated textual label transformation; make_lab.py deterministically derives lab.py from the prior L003 source (lab.py also stands alone with the C001 cache). analyze_run.py verifies strict results, execution equality, baseline fields and the Claude file checksum, then exports all per-mint labels/exposures/paired trades. No original code is edited.

Large intermediate strict_records.json/tol30_records.json/trade_ledger.json are locally regenerable and not published as duplicate huge JSON; label and trade CSV partitions plus the source C009 record ledger preserve the evidence. ARTIFACT_SHA256SUMS.txt covers exactly the committed run files other than itself. No missing log files are listed. source_integrity.json records actual accesses and errors; original data and historical evaluators remain untouched.
