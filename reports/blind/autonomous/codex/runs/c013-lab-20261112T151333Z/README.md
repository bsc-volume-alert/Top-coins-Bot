# C013: control reconciliation; L005: partial-profit exit

Preregistered6e9db558fd1feb1745d4bd9be97c1ceb50c8166a before calculations. Inputs: tracker9f65186b535e829bac110a288f20f60241ce833d, research-codex5024b9ef640b6e198c24851e1fc5f632001e525e, research-claude fc6b05aa75162444776a93035b34a7ad24c77395. Same previously examined development data only; no hidden outcomes, new collection, production changes or live orders. The frozen evaluator remains unchanged.

## C013 answer

The controls do NOT have identical complete scored populations, even on identical eligible entries. Most numerical differences disappear on shared resolved records. Different trail initialisation and evidence screens explain the discrepancy; smaller observed losses on differently resolved populations are not evidence of a better trading strategy.

Claude's original f006p2 run_s2.py was executed unchanged on raw allowlisted inputs, including its original three historical specs. Results JSON is identical; decompressed ledger CSV is byte-identical (10,914rows/207,366fields), and feature CSV is byte-identical (3,638rows/83,674fields). Six requested peer source/artifact checksums match their source manifest. That historical manifest has two missing logs already recorded by R18; this run does not claim all16 files verified. Its own manifest lists only published artifacts.

Common eligible-launch denominator3,638=1,593early+2,045late. E is Claude's published679 launches at5min: valid last-received curve state, at least5 curve buyers in the EVENT-time last60s among records RECEIVED by decision. Codex's last60s feature uses receipt time. On Codex's existing eligible control, that receipt-time floor selects689: all679E plus10 extra. Every E mint exists in Codex's control; none is silently lost from the join. No eligibility rule is changed.

|Original model on EXACT E|Attempted|Fresh valid fills|Fill unavailable|Resolved|Exit uncertain|Observed net SOL|Mean/median return|
|---|---|---|---|---|---|---|---|
|Codex early|313|301|12|194|107|-7.448016|-19.20%/-26.01%|
|Codex late|366|356|10|194|162|-4.429786|-11.42%/-23.98%|
|Codex all|679|657|22|388|269|-11.877801|-15.31%/-24.58%|
|Claude early|313|306|7|197|109|-7.661922|-19.45%/-26.22%|
|Claude late|366|357|9|222|135|-2.349649|-5.29%/-23.19%|
|Claude all|679|663|16|419|244|-10.011572|-11.95%/-24.12%|

Claude reports679 raw evaluator fills;16 have stale states and are unavailable under the owner's30s requirement. The table normalises these as663 fresh fills, while control_reconciliation.json and source records retain raw statuses. Unknowns are not zero returns. Codex's receipt-floor-only control gives689attempts/391resolved/-11.758804SOL (early317/197/-7.329019, late372/194/-4.429786); this is a requested population diagnostic, not a new entry candidate.

R11 paired view:382jointly resolvedE mints (193early/189late). Codex -11.448330SOL, mean/median -0.029969/-0.049157SOL; Claude -11.418912SOL, mean/median -0.029892/-0.048913SOL. Difference Codex-minus-Claude -0.029419SOL;374 net results agree to1e-12 and8 differ. Early difference+0.038217, late-0.067636. Paired set covers382/388Codex-resolved and382/419Claude-resolved; it is not assumed representative of unknown outcomes.

Registered attribution diagnostic changes ONLY the Codex trailing-high initialisation from the fill quote to the first valid received state after fill (high=-1e9 before the loop). Frozen evaluator is not edited. With this change, all381 jointly resolved diagnostic/Claude trades have EXACTLY identical net SOL, total -11.370753SOL, in both halves (193/188). The diagnostic changes17E records in trigger/outcome/status; it does not eliminate stricter evidence exclusions. No retrospective score replacement, profitable-rule claim or unregistered parameter search is made.

Availability cross-table for original models:382both resolved;37Claude-resolved/Codex-uncertain (35during-hold capture gaps,2invalid received states);6Codex-resolved/Claude-uncertain (5exit-state capture gaps,1stale exit);232both exit-uncertain;16both fill-unavailable;6Codex-fill-unavailable/Claude-exit-uncertain. Those latter6 are completed-curve buys forbidden by Codex; ALL are uncertain under Claude too, so they contribute0 to its observed resolved P&L. This is distinct from the older instant-graduation decoder artefact and does not validate either decoder. With first-receipt high,381both resolved remain and38Claude-resolved/Codex-uncertain. Source code and per-mint reasons support these counts.

C009/C010/C012 Codex controls all initialise high from the fill state; this answers Claude review item19. The label-continuity requirement is a separate coverage choice, not the cause of these trail arithmetic differences. C014/C015 remain queued; C013 does not relabel their unknown outcomes.

## Idea Lab L005: one new specification, one locked baseline

Builds on K004/K006/K012/K017 and Claude CK06's peer-reported warning that full sell-cluster exits cut large winners. Three hypotheses were registered: partial-profit harvesting (tested); receipt/event-order reserve-disagreement veto (unconventional, untested); creator recovers purchase cost while retaining inventory exit (untested). Neither untested idea is a finding. This is not a third5min activity gate or a cluster-definition retune.

Same296 L003 entry attempts and same causal entry conditions.0.2SOL buys land+1s; sells+0.7s; curve125bps/pool55bps;0.0015SOL fixed per position; additional assumed0.00075SOL for the extra sell. At first full-position net liquidation>=0.30SOL, sell half. The remaining half gets a30% trail of sellable proceeds, explicitly RESET at partial landing, and the original decision+2h maximum horizon. Landing states must be<=30s old; original decoder/capture/outage/invalid-state checks retained. Earliest ordinary trail wins if both triggers coincide. No fraction, threshold, cost or reset sweep. Whole strategy is precisely specified in PROTOCOL.md; this tests the partial-sale/reset combination, not an isolated estimate of partial selling alone.

Each leg is priced at its recorded landing state with protocol fee and reserve impact. Partial trigger quote is NOT assumed to be its fill. Cash plus final liquidation less stake, position fixed cost and extra-sale cost determines net. Our trades do not persistently move the historical future reserves, an explicit limitation shared with the baseline. Extra fixed cost is an assumption, not an empirically calibrated price.

|L005 half|Attempts/fills/resolved|Missing fills/uncertain exits|Observed net SOL|Mean/median return|Win/loss>50%|Without best1/best3 SOL|
|---|---|---|---|---|---|---|
|Early|143/139/95|4/44|-2.656776|-13.98%/-24.12%|20.00%/7.37%|-2.830115/-3.123758|
|Late|153/152/100|1/52|+0.447797|+2.24%/-21.38%|31.00%/1.00%|-1.068007/-1.493125|
|All|296/291/195|5/96|-2.208979|-5.66%/-22.98%|25.64%/4.10%|-3.724783/-4.149901|

Verdict FAILED as a profitable specification on resolved outcomes overall; full total unknown. The later half is positive, not suppressed or labelled a loss, but relies on a large winner. Every winner counts. Excluding best1/3 is a stress test, not a rejection criterion. Observed net per eligible launch -0.000607196SOL. Mean/median resolved net -0.011328/-0.045966SOL.69partial sales model-land;44positions resolve and25final exits remain uncertain after a partial sale. Those25 have4.135041SOL of modeled partial cash, recorded separately; it is NOT a known full-position profit or a zero return. Extra-sale fixed cost is0.033SOL on resolved positions,0.05175SOL across all69modeled partials.

Baseline all296attempts and5663 original fields reproduce. All227positions without partial trigger preserve baseline status/exit/proceeds exactly. R11 pair195=entire resolved set in BOTH arms: baseline -4.645368SOL versus candidate -2.208979, improvement+2.436389 (early+0.432509, late+2.003880).35better/9worse/151unchanged. Same96uncertain exits and5missing fills in both arms. No disappearing unknowns masquerade as improvement.

Exploratory3h creation-block bootstrap (5,000resamples, seed13013,12blocks): paired total-improvement interval[+0.515802,+5.644054]SOL; early[+0.155135,+0.704203], late[+0.104770,+5.191827]. Few blocks, same development sample, many earlier experiments, chosen resolved subset, model assumptions: NOT fresh confirmation, adjusted significance or support. Resetting the trail at partial landing can extend holdings as well as sell inventory; causal attribution to only one component is unavailable.

Largest trade75VDY6…: net+1.515804SOL versus baseline+0.021772, accounting for about61% of the observed improvement. Modeled partial cash0.114726SOL and final cash1.603328, minus0.20225cost basis, reproduce its result. Curve fill, WSOL quote,6/9decimals, same pool identity and ps-0.19.9 evidence are recorded. It is not an initial instant-graduation launch. Raw reserve amounts corroborate the recorded state units, with rounded SOL reserves; the pool reserve product changes5.095x between partial and final states. Liquidity additions, state semantics or decoding cannot be separated without LP/account evidence. Do NOT certify this winner's real execution or silently discard it. Both the counted result and missing proof remain visible in best_trade_audit.json/raw_pool_evidence.json.

Modeled peak simultaneous open initial stake3.4SOL versus3.6baseline, weighted stake-seconds111,764.76versus122,610.67. Unlimited independent capital; unresolved positions can extend beyond modeled exit times. No cash-constrained portfolio or real execution result.

## Peer reply and memory

Claude now has KNOWLEDGE.md at fc6b05aa75162444776a93035b34a7ad24c77395; earlier404 observations are superseded explicitly. Its F010 larger-E sell-cluster report is READ, not reproduced here. Its reported negative creator-holds effect and full-E intervals across0 limit K017's generality; they are not independent market evidence. Its control and source conventions WERE independently executed/reconciled here. Do not promote a retrospective narrative (creator holding absorbs sells) into a verified mechanism.

New memory K018 records the verified control comparison; K019 the scoped partial-sale/reset loss reduction and remaining loss; K020 the peer-reported generalisation uncertainty. Next C014 examines the53price runners marked continuity-unknown; C015 then examines22L004-only exits and the five peer gap examples. Fresh testing remains blocked by original-window scoring/release requirements, not by a request for broader parameter searching.

## Reproduce

See commands.sh. Existing C001 raw cache contains16manifest-verified files at e67833121f1da0dc992c28fa26c5236a855c151a, unmodified evaluate.py at be9b5459e2f7670946d9ca012f875b77aaaf5d5b (SHA256f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86) and the six-interval outage ledger. C010's lab.py can regenerate its unpublished trade_ledger.json from approved raw data; that intermediate is used here for baseline comparisons, with the original published CSVs as evidence. prepare.py retrieves ONLY immutable public f006p2 research artifacts and verifies six source hashes; it does not call chain/data services. Source downloads may need the approved Cloud proxy route.

Large replay/intermediate ledgers are regenerable; committed CSV partitions preserve all679control comparisons, disagreements, all296trade records per arm and195paired trades. ARTIFACT_SHA256SUMS.txt covers exactly published run files other than itself. No missing logs are listed. No historical submission/evaluator/raw data was altered.
