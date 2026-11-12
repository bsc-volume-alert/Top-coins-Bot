# f011-20261112T225049Z — F011: Codex's L005 partial-profit exit generalised to eligibility E (+ Idea lab CL-L007)

Worker: Claude research worker (scheduled task). Lease d20a2eb 22:51 UTC; protocol 9e06fa6 22:55 UTC (before any outcome); S2 run 22:59–23:02 UTC;
S1 (frozen eval-1.1 main) 23:03–23:07 UTC; analysis 23:08 UTC. Inputs: tracker @ 6c2b3d8 (queue row F011, R43/R46), research-codex @ be8cf89
(read; L005 protocol 6e9db55, ledgers of c013-lab-20261112T151333Z published @ e9b20e1), research-claude base 3393d27, entry-all-20261107t2210
@ e678331 (16/16 checksums verified), blind-eval-1.1 @ be9b545 (evaluate.py sha256 f5686511…, imported unchanged). No other data; no paid calls;
no protected outcomes; nothing written outside reports/blind/autonomous/claude/.

## Bounded question (queue F011)
Does L005's paired loss reduction (+2.436389 SOL on Codex's 195 L003 pairs, 61 % from one trade) hold on the 679 eligibility-E entries, and how
much of it is one trade?

**Answer (measured, development data only):** in direction, yes — on the 418 E launches resolved under both exits the partial-profit exit changes
the control's −9.952822 SOL to −6.977163 SOL, **+2.975658 SOL** (79 better / 26 worse / 313 unchanged); the iid bootstrap interval is
[+0.08, +6.84] and the 3-h block interval [+0.27, +6.55], both above zero but only just. **50.2 % of the improvement is the single trade
75VDY6P9kJ…** (+1.494032 — the same trade that carried 61.3 % of Codex's result); without it the paired difference is +1.481627, and
+1.195052 without the best three pairs. The early half (+0.981 on 197 pairs, CI [+0.39, +1.60], largest pair only +0.126) and cells A
(+0.907, CI [+0.50, +1.33]) and C (+1.177, CI [+0.36, +2.04]) are above zero without depending on any one trade; the late half (+1.994,
CI [−0.81, +5.77]; +0.500 without 75VDY6…) and cell B (+0.892, CI [−1.83, +4.67]; **−0.602 without 75VDY6…**) straddle zero. The exit halves the
control's three largest winners (ASTLrY… +1.376 → +0.763; 21egFE… +0.582 → +0.354; DY3o5S… +0.424 → +0.257 — the three worst pairs, all cell B,
late half). **All-in: 418 resolved / −6.977163 SOL vs the control's 419 / −10.011572** — a loss in both halves (early −6.681, late −0.297;
late −1.812 without its best trade) and in cells A (−3.914) and C (−3.360); cell B is +0.297 on 73 trades only because of 75VDY6… (−1.219
without it). It is a loss reduction, not a profit. Nothing here is supported; R43 stands (no retune, no recombination).

## Method
Entries, costs and the baseline exit are the f006p2 / f009 / f010 CONTROL: eligibility E at created + 300 s, 0.2 SOL, buy lands + 1 s, sale lands
trigger + 0.7 s, curve 125 bps, pool 55 bps, 0.0015 SOL fixed, 30 % trail on net sellable proceeds, 2-h cap, landing state older than 30 s ⇒ fill
unavailable / exit uncertain (post-check), the six published outage intervals excluded (R4 scenario, S2). The frozen evaluator's `run_launch` is
called unchanged for the CONTROL (as run_f010.py). L005-E re-implements run_launch's post-fill scan in run_f011.py with the evaluator's own
`buy / sell / state_ok / state_at` (the frozen single-sale exit hook cannot express a two-leg sale), adding exactly Codex's rule (PROTOCOL.md):
at the first received valid state after the fill whose full-position net sellable proceeds ≥ 0.30 SOL (trail tested first on the same row;
partial landing must be before the horizon), sell half at + 0.7 s on the evaluator's chain state (state missing / stale ⇒ whole outcome
uncertain), reset the remaining half's trail high to its own net proceeds at that landing, resume on received valid states strictly after
the partial landing, final net = partial cash + final leg − 0.2 − 0.0015 − 0.00075. Trail high initialised as eval-1.1 / the E control (first
received valid state after the fill, R37), not Codex's fill-state initialisation.
Transcription checks: (1) **asserted** — the re-implemented scan with the partial disabled reproduces the frozen evaluator's CONTROL on all
3,638 launches (category, reason, net SOL, sale time: 0 mismatches; `transcription_mismatches.json` is empty); the CONTROL itself reproduces
f006p2 / f009 / f010 exactly (679 / 419 / −10.011572; best three +1.375955 / +0.581910 / +0.423680). (2) Against Codex's published L005 ledgers
(trade_l005_*.csv @ e9b20e1): 295 of Codex's 296 L003 attempts are in E; 194 jointly scored; on the **44 launches where both executed the
partial, partial trigger time, partial cash and final net SOL are identical (44/44, max |Δnet| = 0)**; on the 149 jointly scored no-partial
launches 148/149 nets are identical (one differs by 0.003182 SOL and one launch is partial-under-Claude / no-partial-under-Codex — both the
R37 trailing-high initialisation, as expected). Codex's own 195-pair figures re-derived from its ledgers: −4.645368 → −2.208979, +2.436389,
35 / 9 / 151, largest pair 75VDY6… +1.494032 = 61.3 % (matches its publication to the digit); the same 195 launches in this framework give
+2.454413 on 193 pairs (36 / 9 / 148). Status cross-tab in results.json (`analysis.codex_overlap`): the differences are Codex's extra
during-hold gap (17) / invalid-state (1) checks and its 30-s rule on the final landing vs eval-1.1's capture-gap check (55 + 16).
S1 = frozen eval-1.1 `main()` with rule_control.py and rule_l007new.py (30 bps pool, +125 sensitivity), reported verbatim and never used as a
verdict (R16). No eval-1.1 L005 row exists and none is claimed.

## Numbers (S2, R4 scenario; every figure in results_s2.json / results.json; record level in ledger.csv.gz)
| | attempted (early / late) | filled | unavailable | uncertain exit | stale fill | stale exit | resolved | unknown share | total SOL | mean / median ret | win | loss > 50 % | w/o best 1 / 3 | early / late SOL | median hold s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CONTROL (E) | 679 (313 / 366) | 679 | 0 | 185 | 16 | 59 | 419 | 38.3 % | −10.011572 | −11.9 % / −24.1 % | 22.9 % | 11.2 % | −11.387527 / −12.393118 | −7.661922 / −2.349649 | 131.2 |
| L005-E | 679 (313 / 366) | 679 | 0 | 185 | 16 | 60 | 418 | 38.4 % | −6.977163 | −8.3 % / −23.5 % | 25.4 % | 9.3 % | −8.492967 / −9.609298 | −6.680529 / −0.296634 | 131.3 |

Partial sale: triggered on 124 of 679 attempts (median 129 s after entry; 110 curve / 14 pool landings; median landing-state age 0.65 s; no
partial landing unavailable or stale); 105 of the 124 resolve (19 unresolved: 11 final capture gap, 5 final state invalid, 3 stale final /
fill — the same reasons as the control on those launches). On the 105 resolved partial launches: control +9.186307 → L005 +12.161965, 79 better /
26 worse; 96 of the 105 are wins under L005; median partial cash 0.156 SOL, median remaining-half final leg 0.130 SOL, median hold 368 s. The
313 resolved launches without a partial are identical to the control by construction (−19.139129 SOL both).
Final exits are all trail (418 / 419); 0 final triggers fall in the last 0.7 s of the horizon (the eval-1.1 vs Codex horizon difference does not
bite). Resolved only in the control: 1 (a launch whose L005 final landing is stale after the partial); resolved only in L005: 0.
By cell (resolved n / total SOL; control → L005): A 166 / −4.820931 → −3.914254 (34 partials); B 74 → 73 / −0.654013 → +0.296716 (21 partials; −1.219088
without 75VDY6…); C 179 / −4.536627 → −3.359625 (50 partials).
S1 (eval-1.1, 30 bps, verbatim): CONTROL 484 scored / 195 unknown / −11.814859, point −0.003248 SOL per launch, LCB −0.014048, not scorable, not
supported (= f006p2 exactly); CL-L007-NEWNAME 183 / 56 / −4.782095, point −0.001314, not scorable, not supported.

## The one trade (required by the row)
75VDY6P9kJ… (late half, cell B, pool venue): partial triggered 55.9 s after entry, half sold for 0.114726 SOL; control sells the whole position
at 57.6 s for +0.021772; under L005 the remaining half trails for another 54.6 min and sells for 1.603328 SOL ⇒ net +1.515804 (14× on the
retained half). Codex's R38 caveat applies unchanged: the pool reserve product changes ~5× between the partial and the final state and
liquidity addition / fee accrual / state semantics cannot be separated without LP-account evidence (none allowlisted). The trade is counted,
shown, and neither certified nor discarded; the question is not settled here and must not be.

## Idea lab — CL-L007 "name / symbol reuse veto" (registered in PROTOCOL.md before scoring; eligible under R49)
Rule: enter E launches whose trimmed, case-folded name AND symbol are both new within the window (no earlier census launch used either; F002's
definition, census ordered by create_ts / slot / mint; knowable at creation). Control = E, same exit. Registered prediction: the kept side has
the higher net SOL per resolved trade. **Result: FAILED (direction not observed).** The veto removes 440 of 679 E launches (64.8 %; census
reuse share 79.6 %) and keeps 239. Kept: 239 attempted (130 / 109), 161 resolved, **−4.123074 SOL**, mean −12.8 % / median −23.7 %, win 23.0 %,
loss > 50 % 9.3 %, w/o best 1 / 3 −4.471745 / −5.094936, early −3.423214 (92) / late −0.699860 (69), unknown 32.6 %; per resolved trade −0.0256.
Removed (reused name or symbol, control exit): 440 attempted (183 / 257), 258 resolved, **−5.888498 SOL**, mean −11.4 % / median −24.3 %, win
22.9 %, loss > 50 % 12.4 %, w/o best 1 / 3 −7.264453 / −8.270044, early −4.238708 (105) / late −1.649790 (153), unknown 41.4 %; per resolved
trade −0.0228. The removed side is marginally better per trade, not worse; both sides lose in both halves. R11 paired view against the control
is 0 on the 161 kept pairs by construction (258 control-resolved launches are removed by the veto). Cells (kept / removed, resolved n and SOL):
A 62 / −1.994 vs 104 / −2.827; B 43 / −1.600 vs 31 / +0.946; C 56 / −0.528 vs 123 / −4.008 — the control's three best trades are all on the
removed side (cell B). Declared breakdown of the removed side (counts only): copy of a name/symbol whose earlier bearer had reached retention
before this creation — 281 attempted / 160 resolved / −4.108591 (mean −12.8 %, win 24.4 %); copy of a never-retained one — 159 / 98 /
−1.779907 (mean −9.1 %, win 20.4 %). No verdict on that split (hypothesis-generating; the "copycat of a retained coin" entry preference it
would motivate is NOT proposed as a test — both sides lose). Variants tried: one (binary rule, no threshold). Limitation: names used before
6 Nov 07:40 are invisible, so "new" means new within the 36-h window; 79.6 % census reuse makes the kept side small (161 resolved ≥ 30, so not
inconclusive by construction).

### Three ideas proposed this run
1. **CL-L007 name / symbol reuse veto (tested, failed)** — above.
2. **Copycat-of-a-retained-coin entry preference (unconventional, not tested)**: among reused names, prefer launches copying a name whose earlier
   bearer reached retention (attention spill-over). The declared count above is its only evidence: −4.11 on 160 vs −1.78 on 98 — the copycats of
   retained coins lose MORE per trade on this window, so no test is proposed; recorded so it is not re-proposed without new data.
3. **Buy-size uniformity veto (not tested)**: at 5 min, abstain when the last-60-s received curve buys have a coefficient of variation of SOL
   size below a fixed value (near-identical sizes = scripted demand). Mechanism = amount distribution, not count / net-buyer / inventory /
   slot spread, so arguably outside R27's ban, but CL-L002 (buy-size diversity veto, f001) bound on only 11 of 679 and the coordinator may
   judge it a retest; it waits for a ruling and would be registered with its threshold and binding share before scoring.

## Limitations
- Development data (the same 36 h that produced the entry and every exit); nothing is fresh validation; no production execution evidence
  (two sales, each +0.7 s on the recorded state, assumed to land; historical reserves assumed unaffected by our trades; the 0.00075 SOL extra
  cost is an assumption, as Codex's protocol says).
- 185 exit-uncertain + 16 stale-fill + 59–60 stale-exit launches per spec (38 % of attempts) are unknown, not losses.
- The partial can only trigger on a received valid row; eval-1.1 has no during-hold gap check (R42), so 17 launches that Codex marks "capture gap
  during hold" are scored here, as in F010.
- Trailing-high initialisation follows the E control (first post-fill received state), not Codex's fill-state rule: the 44/44 partial agreement
  and 148/149 no-partial agreement with Codex's ledgers quantify the difference (one launch each way).
- create_ts + 300 s as the decision time carries the ~1-block optimism noted in R46.

## Files
PROTOCOL.md (registered 9e06fa6), run_f011.py (S2 driver + transcription check), analyze_f011.py (post-analysis, Codex overlap, results.json),
rules_common.py (copied unchanged from f010), reuse.py (CL-L007 flags), rule_control.py / rule_l007new.py (eval-1.1 rule files), commands.sh,
results_s2.json, results_s1.json, results.json, ledger.csv.gz (3,638 × 4 specs), features_at_300s.csv.gz (E flags, cells, reuse flags),
transcription_mismatches.json (empty list), SUMMARY.txt, ARTIFACT_SHA256SUMS.txt (from `git ls-files` after the content commit; s1.log / s2.log /
analyze.log not committed, not listed).
