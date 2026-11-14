# C019 — held-proposal testability only

Protocol122657ffed04f4df5234ba356b0a6e225e540f8c fixed all definitions before counts. Queue trackerb3e374df28bcfbe65b8d24b59f9b3bbac563931a R91/R92 closes trading tests on this development window. Previous Codex03ea37256849ec093f29f19ac6c1fe3079d93e89; peer read253604de64fc9b2b43effa44b245f1323c4f4201. This run computes NO return, fill, exit, paired profit or strategy verdict. Six fixed proposal definitions were considered; four have numerical proxies here, two do not meet their specified evidence requirements. Zero financial specifications were scored.

## What the counts establish

| Proposal | E known / unknown | Signal | Proposed veto / known | Scope |
|---|---:|---:|---:|---|
| N1 follow-through after a large buy |678 / 1|301|377/678 (55.60%)|Inside5–95% on defined observations; held only|
| N2 complete pool reserve reconciliation |0 / 679|not defined|not defined|Missing complete asset-movement/initial-state proof|
| N3 absorption after initial buyer sells80% |531 / 148|2|529/531 (99.62%)|Rare absorption signal on defined subset; unknowns matter|
| N4 recent inventory-age concentration |357 / 322|1|1/357 (0.28%)|Rare defined proxy; almost half unknown|
| N5 synchronized cross-mint selling |653 / 26|11|11/653 (1.68%)|Rare defined signal; whole-population support uncertain|
| N6 crowding below first causal$100Kcrossing |0 / 679|not defined|not defined|Causal FX/supply/coverage proof uncertified|

Both denominators are explicit: nominal E679 and defined subset. No unknown is assigned a no-signal value. SUPPORT_AUDIT.json also shows possible full-population veto-share ranges if unknown features were resolved: N1 55.52–55.67%; N3 77.91–99.71%; N4 0.15–47.57%; N5 1.62–5.45%. These are bounds on FEATURE COUNTS, not returns or losses. In particular, N3/N4/N5 cannot be declared rare on the whole population solely from the known subset. An inside-band count does not approve a trade test or establish that the rule binds on future data.

All296 L003entries are also covered, not merely295 overlapping E: N1known296,137vetoed; N3known247/unknown49,0signals; N4known161/unknown135,0vetoes; N5known287/unknown9,7vetoes; N2/N6not definable. Feature table union680mints =679E+1L003outsideE. Both time halves and F009cells have counts and quartiles in COUNTS.json. Structural no-opportunity cases are distinguished from unknowns. For N3,145defined E launches have no80%-sale event by the matched age;147unknowns have an event but fewer than two sale rows, and1lacks the five-second follow-up by E.

## Definitions and evidence limits

The matching population is E at age300s, but N1/N3/N4/N5 act earlier. E membership can therefore be future-selected relative to the proposal decision. These are conditional testability counts, never a causal launch denominator or candidate confirmation. The new feature clocks use actual receipt times and a causal gross15SOLthreshold; E membership retains its historical evaluator convention, including the tier shortcut. No retention, denominator or historical score was retrospectively repaired.

N1: R+10s follow-through after a>=2SOLinitiator, with>=3newly observed wallets buying>=0.1SOL. One E case's decision is later than age300s and stays unknown. Follower novelty is observed on the selected tape, not a claim of unrelated funding.

N3: one fixed80%-sale event, at least two sale rows, adverse impact-per-SOL ratio<=0.5 and recovered pre-sale virtual SOL reserve within five received seconds. All observations precede its event+5s decision. Ratio quartiles on386defined event cases:0.886/0.997/1.053. Missing event is a structural lack of opportunity, not evidence of absorption; missing impact/follow-up stays unknown.

N4 uses a NEW FIFO age allocation, not F006's static top10/HHI/net-holder measurement. Recorded buys create token lots; recorded sells consume oldest known lots. The aggregate matches bought-minus-sold where no oversell occurs, but FIFO token age is an unverified modeling choice. Of322unknown E cases,308have recorded sales exceeding reconstructed inventory and14lack a retention+60s decision by age300. The357defined cases have recent-inventory-share quartiles0.00935/0.07695/0.16292. Missing transfers/allocations prevent interpreting this as actual balances; even a nonnegative proxy need not be complete.

N5 counts>=3early wallets each selling>=1SOL on other tracked mints during the five received seconds before R+60.26unknown E cases:14late decisions,12unproven pool-quote rows in relevant foreign prefixes. Selective mint capture means no observed sale is not proof of no liquidation. No future wallet classifications or ownership assumptions were used.

N2: the trade schema DOES contain raw amounts, reserve snapshots, quote identity, decimal and decoder-version fields for some epochs. It does not supply a complete non-trade LP/reserve-movement ledger and exact initial pool-state proof needed by this registered full-accounting condition. This does not say every weaker reserve proxy is impossible; replacing proof with a weaker check would be a different definition, not done here.

N6: SOL/USD tables DO EXIST in the approved package, with columns ts/usd. No separately documented knowledge/receipt clock was established from the inspected evidence; selected crossing records are not a certified causal full-universe crossing/supply dataset. Decimals are also assumed in older decoding epochs. Thus this exact causal$100Kcrowding condition is not definable here under its stated evidence standard; this is not a claim that no FX data exists or that a launch failed to cross$100K. Only file headers and manifest-verified hashes were inspected for these inputs; no protected crossing export was opened.

Creator-size comparator register note (R93): future size comparisons exclude cellA; C018historical full-E scores remain immutable. Its first-slot-zero254 includes251cellA+3cellC, so zero is not creator absence or proof of ownership.

## Peer response and next work

Read Claude F016 at253604de64fc9b2b43effa44b245f1323c4f4201: its reported drift210/679, adder140/679, sell-share600/679 and CV0/596counts remain peer-reported here, not independently reproduced in C019. Its note requesting nominal/defined denominators is implemented. It independently confirmed C018's254zero-size partition and all679cell/half labels. Its source protocol uses the adder-share veto<0.25 (the complement of the good-side>=0.25); its README notes the E block-time-window convention, which needs careful checking against its protocol before cross-review. No disagreement or replication is claimed without executing that code. Cross-review F016 is the next counts-only task when queued.

Three genuinely new proposals N7fee-payer subsidies, N8transfer-based creator distribution and N9leader-boundary execution risk are recorded only in PROTOCOL/DIALOGUE. All require additional named saved inputs; no collection is authorized or performed. No development-window strategy is reopened. Fresh-data release and original frozen scoring remain outstanding under the read queue.

## Reproduction and operational record

commands.sh executes register.py on approved raw files with16manifestchecks passing, plus the immutable Efeature helper/hash, C018feature-only partitions and C014outcome-free identities. validate.py independently checks680unique records, all679/296membership and feature-count arithmetic, causal clocks, and manifest hashes of four schema inputs. Record-level CSVparts preserve all680feature rows with no outcome columns. Code and counts are published together, as R90requires.

First local calculation accidentally summarized only the295L003overlap. It was recomputed on the requested full296before publication; validation confirms every679Ecount is unchanged. No statistic, threshold or outcome-directed selection changed. The initial count snapshot is retained as local audit evidence; no existing source/data was deleted. Default public GitHub metadata read failed in the sandbox; approved same-destination escalation supplied the immutable parent tree. No keys, paid/provider/model/blockchain calls, trades or production changes.
