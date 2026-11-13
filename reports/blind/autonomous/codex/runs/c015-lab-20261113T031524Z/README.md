# C015 pre-obstruction marks and L007 creator cash-recovery exit

Registered before calculations at88c7c23db92541bd9f566238f8899bcda8d56f9f; claim66ce8fe96982c3f616526d333adddfc6eefa2454. Input heads: tracker842286622cb849849f59b4374232909f903cac19, Codexbe8cf890fd9ada6ea42866f31f7a8a2f7ce59f6d, Claude05dd66335b3c053121d337ed07306edb81de9c84. Same previously explored development data only. No hidden outcomes, live trading, paid collection, production changes or evaluator repairs.

## C015: the missing exits remain missing

The22positions resolve under the historical L004exit but have uncertain exits under its original L003baseline. All22L004fill/exit arithmetic results were recomputed from approved raw states and match. The last usable pre-obstruction mark is higher than the L004exit in18cases, lower in2and equal in2. The marked difference is+2.423287SOL in favour of holding until those historical marks. It is of similar magnitude to the earlier+2.465585SOLimprovement on195jointly resolved positions, so the missing-baseline group cannot be assumed harmless to a full-population claim.

This does NOT identify the direction or size of actual selection bias. A mark is not a realizable missing exit, a statistical bound or a valid replacement return. The true baseline exit remains UNKNOWN for every one of the22. No marked return was added to the195-pair score, no unknown was changed to zero, and no earlier result was rescored.

|Half|Positions / marks available|Mark above / below / equal to L004exit|Marked P&L sum SOL (not realized)|L004scenario net SOL|Mark-minus-exit proxy SOL|
|---|---|---|---|---|---|
|Early|14 /14|12 /0 /2|+2.051830|+0.204840|+1.846990|
|Late|8 /8|6 /2 /0|+0.507638|-0.068659|+0.576297|
|All|22 /22|18 /2 /2|+2.559468|+0.136182|+2.423287|

Baseline outcome reasons:16stale landing states,5during-hold logged capture gaps,1invalid/unproved landing state. The registered earliest-obstruction audit instead stops at12final stale tails,5earlier invalid received states and5logged main-feed gaps; these are different descriptions, not a change to the original reasons. A later stale landing can coexist with an earlier invalid row. Every row keeps both labels.

All22marks are from valid states received by the cutoff with event-age<=30swhen observed, or the explicitly permitted causally received initial fill-state mark. Cutoffs precede the first relevant logged main/pool/outage gap, first invalid received state, or final-tail staleness time (last landing state event-time+30s), whichever is earliest under the registered rule. No quote after a resumption is smuggled into a pre-gap mark. None of the22mark times ties the obstruction timestamp. Row IDs, event/receipt times, mark age at obstruction and origin are published; an old last quote is not guaranteed executable at the obstruction.

Proceeds comparisons use the SAME definition: ev.sell(row, original_fill_tokens,55)−0.0015SOL. P&L is proceeds−0.2SOL. L004proceeds sum4.536182SOL is compared with pre-mark proceeds sum6.959468SOL; its net+0.136182is compared with marked P&L+2.559468. No proceeds/P&L units are mixed.

## The five Claude scenarios, separately

Immutable peer file f010/codex_l004_only_in_claude.json at fc6b05aa75162444776a93035b34a7ad24c77395 was downloaded and checksum-verified against its manifest. All5belong to the22and have a logged main-feed gap during the baseline hold. I recomputed the peer's reported scenario exit arithmetic from raw states at its stated modeled exit times; all5net values and exit-state ages agree. This verifies those arithmetic marks, NOT a full new evaluator reproduction or true execution across the gaps.

|Mint prefix|Pre-gap marked P&L SOL|L004scenario net SOL|Frozen-peer post-gap scenario net SOL|
|---|---|---|---|
|BPcmv1…|-0.020369|-0.017710|-0.033773|
|ASTLrY…|+0.120505|-0.012145|+1.375955|
|FdkG3m…|+0.096997|+0.016458|+0.064210|
|rztrL3…|+0.091562|+0.066116|-0.115481|
|DY3o5S…|+0.059381|-0.013845|+0.423680|
|Total|+0.348075|+0.038873|+1.714591|

Four pre-gap marks exceed L004and one is below it; proxy difference+0.309203SOL. The peer's post-gap scenarios exceed L004by+1.675718SOL, but those are not pre-gap quotes or recovered true exits. Both frameworks' reported scores remain visible, as R42 requires. Gap start/end in full per-mint CSVs:1794021320→1794021322,1794057392→1794057398(two mints),1794068720→1794068726(two mints). These historical2–6second gaps still void the original Codex holding screen; no tol30 relaxation was applied to trading or single-crossing labels.

marks_ledger_*.csv and all_gap_intervals_*.csv contain all22full mint IDs, exact cutoffs and raw references; peer_five_marks_*.csv keeps the five reported scenarios separate. marks_audit.json preserves both halves, source hashes, limitations and unknown counts. No runner, >=$100K or profitability label was inferred from these marked values.

## L007: creator cash recovery, a distinct event specification

Builds on K006/K012/K017/K018. First operational test of the earlier untested R43-eligible creator cash-recovery mechanism, not a closed cluster/partial/time-stop/demand-decay retune or a repeat of F009'screator-absent/held/sold partition. At the first RECEIVED creator SELL after our fill, sell if cumulative reported creator sale SOL is at least its cumulative reported purchase SOL>0AND trade-derived bought-minus-sold token quantity remains positive. Ordinary30%proceeds trail wins a same-row tie; otherwise original2hcap. All updates use receipt-known rows; creator identity comes from the allowlisted launch census.

The cash measure is REPORTED trade SOL, not verified economic breakeven. It omits transfers, royalties, unrecorded fees, earlier inventory and uncaptured trades. Positive trade-derived holdings are not a verified wallet balance. Invalid quote/state or missing amounts on a creator row makes signal history unknown; that is retained as uncertainty, not silently classified as no sell.

Same296L003entries, one new candidate plus one locked baseline, no parameter sweep.0.2SOL buy lands+1s; sale+0.7s;125bpscurve/55bpspool;0.0015SOLfixed; reserve impact;30%trail on net sellable proceeds with fill-state high; max hold to decision+2h; state<=30sold at landing; original retention/completed-curve/gap/invalid screens. No partial sales or new entry gate.

R54'soutcome-blind bindability precheck applies to entry vetoes/filters; this rule removes no entries and is an event exit. Its actual event support is nevertheless small and reported directly: only TWO creator exits. One changes proceeds negatively and one exits at the same recorded liquidation value as the baseline. Zero improved resolved trades,1worse,194unchanged. This is not population-level evidence against all creator-wallet mechanisms.

|L007half|Attempts / fills / resolved|Unavailable fills / uncertain exits|Observed net SOL|Mean / median return|Win / loss>50%|Without best1 / best3 SOL|
|---|---|---|---|---|---|---|
|Early|143 /139 /95|4 /44|-3.089285|-16.26% /-24.56%|18.95% /8.42%|-3.333438 /-3.708360|
|Late|153 /152 /100|1 /52|-1.864188|-9.32% /-21.38%|26.00% /2.00%|-2.187456 /-2.681347|
|All|296 /291 /195|5 /96|-4.953473|-12.70% /-23.03%|22.56% /5.13%|-5.276740 /-5.813415|

Verdict: failed as a profitable specification on resolved outcomes; its mechanism effect is weakly identified because only2events acted and only1changed proceeds. Full total remains unknown. All legitimate winners count; best-mint removal is only a stress test. Mean/median resolved net -0.025402/-0.046069SOL; observed net per3638eligible launches -0.001361592SOL. One actor history becomes unknown, on an exit already uncertain under the baseline, so final availability counts are unchanged.

Original baseline all296attempts/5663fields match. R11paired195baseline -4.645368SOLversus candidate -4.953473, difference-0.308105 (early0,late-0.308105). Availability cross-table:195both resolved,96both exit-uncertain,5both fill-unavailable. No improvement is manufactured by dropping unresolved exits. The12-block exploratory bootstrap of that difference gives[-0.924314,0]SOL; with one changed position this is just a resampling description, not independent or search-adjusted significance.

Among291modeled fills,119have no captured creator purchase,85no positive trade-derived token balance,31reported purchase outlay already recovered with positive proxy inventory,56outlay not yet recovered. These are support counts, not new entry partitions tested for profit. No threshold was broadened after seeing rare events. Both actual creator exits were resolved; details in trade_l007 CSVs and changed_pairs CSV. Peak modeled position stake3.6SOL; stake-seconds122441.24versus baseline122610.67. Unlimited independent capital and historical own impact does not persist; unresolved positions may remain open beyond modeled times. Inherited unknown-zero/full-stake scenario fields are explicit hypothetical imputations, never actual missing P&L or confidence bounds.

## New hypotheses, peer response and memory

Three hypotheses were registered before results: the first concrete creator cash-recovery event specification(test above), cross-pool same-asset spreads(unconventional, untested), and fee-bid exhaustion(untested). Cross-pool quotes need two independently identified valid pools and contemporaneous evidence; absence from this selectively retained tape cannot prove no alternative pool. Fee-bid analysis needs complete timestamped failed/successful attempts and actual fee fields, which a successful-trade tape cannot reconstruct. No collection or API call was made for either proposal.

Read Claude F011/CK10 at05dd66335b3c053121d337ed07306edb81de9c84. Its broader-E partial-exit result is peer-reported here, not independently rerun:418resolved/-6.977163SOL,paired+2.975658,half of improvement from one trade with unresolved reserve-product semantics. R53closes that family and the name/symbol family; neither is retested here. Wording clarification requested: F011cellB'suntrimmed reported+0.296716SOLISa positive after-cost point estimate with all winners counted. Its large uncertainty, missing outcomes and negative no-best-mint stress do not turn that historical point estimate negative or establish support. The entire E strategy remains negative, and no new creator-cell rule is proposed.

Memory K024records the pre-obstruction mark comparison without imputation; K025the negative sparse-event test; K026the peer-reported generalisation and the distinction between an observed positive subgroup estimate and support. K022/L006 is explicitly reclassified underR54as a feature-equality fact, not an operative zero-veto experiment; historical output values stay visible. Next C016audits dev_buy_solprovenance using allowlisted snapshots, without reading tracker source or new data.

## Reproduce

commands.sh uses the existing C001cache:16manifest-verified entry-all files at e67833121f1da0dc992c28fa26c5236a855c151a; unchanged evaluate.py be9b5459e2f7670946d9ca012f875b77aaaf5d5b, SHA256f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86; six published outage intervals. Regenerate c012/trade_ledger.json from its committed lab.py if absent; original CSVpartitions are the same evidence. prepare.py verifies the immutable peer5JSONand retrieves own protocol tree metadata through public GitHub only. C010lab.py is the unchanged source for make_lab.pyand the baseline comparison.

audit_marks.py reproduces22exit calculations and5reported peer-state arithmetic calculations, then exports all obstruction/mark data. It does not claim to rerun every historical rule trigger. make_lab.pyderives the registered actor event and unchanged baseline; analyze_lab.pyverifies fields, signal support, paired outcomes and exposure. Large intermediate JSONledgers are regenerable; published CSVpartitions preserve all records. ARTIFACT_SHA256SUMS.txt lists exactly published run files other than itself. Raw data, frozen evaluators, historical submissions, tracker and other worker folders remain untouched.
