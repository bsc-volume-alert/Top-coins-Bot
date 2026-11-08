import json,datetime,hashlib
from pathlib import Path
import pandas as pd
O=Path('/workspace/session_3');j=json.loads((O/'results.json').read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
lines=[f'''# Independent session 3 — frozen submission

**Frozen at {now}. Decision: no profitable rule is supported by this analysis.** This is a paper-research conclusion, not a claim that profitable rules cannot exist. I submit no active trading rule. The only frozen policy is deliberate abstention: for every mint, at every age, place no entry at either 0.2 or 0.02 SOL; therefore there are no exits, migration actions, re-entries, retries, positions or fees. Its score is zero, never evidence of profitability. This conclusion and policy must not be revised using 8–10 November outcomes.

## Independence and provenance

I used raw records only and did not read either other session's work or conclusions. I read INDEX.md and both complete MANIFEST.md files, applied the corrections in INDEX.md, and inspected the deployment log. Data branch `entry-package-7nov`, commit `{j['commit']}`. The coordinator independently verified all three SHA256SUMS lists successfully; I confirmed the checkout commit. Required brief: immutable GitHub revision `cf86e7604870422d7b634f0e8f4ecf88bc9824d0`, `reports/blind/BRIEF_7nov.md`, revised 15:05 UTC. No bot or source data was modified, and no trading was requested or performed.

## Development design and all search performed

One candidate rule family was fixed in `protocol.md` before calculating returns. There was no threshold sweep, optimization, feature selection, or selection among historical book results. The creation-time midpoint of the supplement population fixed the split before return calculation: **{j['split_utc']}**. Earlier launches screened the prespecified candidate; later launches checked the identical candidate. Neither half caused a parameter revision. Both halves remain development data, not the hidden test.

Exactly **one candidate**, **one parameter tuple**, **four entry features** (received gross buying, received net buying, distinct received buying wallets, current venue), **one exit policy**, **two required position sizes** were tried. The same candidate was also calculated once using event time as a separate hypothetical timing diagnostic; this is two replay modes, not two models selected by performance. Creation age is the decision clock. Fixed thresholds: age 60 seconds, gross buys 15 SOL, net buys 10 SOL, 20 distinct buying wallets, forced horizon at age 120 seconds; fixed required delays 1 second buy and 0.7 seconds migration sell. The fee assumption used only for diagnostics was 1.25% each leg plus 0.0015 SOL fixed. No funding, creator, bundle, wallet classification, historical-book return or future peak feature was used. Final no-entry policy is the second, trivial policy considered; it was selected because no positive active policy was supported, not because it produces positive returns.

### Candidate specification (rejected, not a submitted alternate)

At `creation + 60s`, use only deduplicated trades received by that instant (`recv_ms <= decision_ms`); missing receipt times contribute no known observation. Sum SOL of all buys as gross buying, subtract all sells for net buying, and count distinct buying wallets. Attempt one entry only if gross >=15 SOL, net >=10 SOL, buyers >=20, and the latest known state is a curve. Gross >=15 is a conservative, receipt-time retention witness; no bundle shortcut is used. There is no retry if a condition fails. Empty historical venue labels are treated as curve only because the manifest states those rows were curve by construction.

Entry is valued on the last chain state in `(slot, ev_idx, row_id)` order with block time <= decision+1s. Each size exits completely at age 120s; if a migration is first observed before then, trigger a complete sale on the pool and value it as of receipt trigger+0.7s, subject to pool/config validation. No partial exit or re-entry. Each size has its own reserve-impact calculation and complete exit. A missing or uncertain state is unknown, not a later fill. The horizon is already the forced landing time; no extra delay is added to it.

For conditional curve diagnostics, convert raw reserves to SOL and whole tokens. Buy tokens = `y * (stake * .9875) / (x + stake * .9875)`. Sell proceeds = `x_exit * tokens / (y_exit + tokens) * .9875`. Net SOL = proceeds - stake - .0015. This assumes fees and standard constant-product state semantics; it does **not** validate fee configuration. The recorded future price path is not changed by the hypothetical trade.

## Raw-data audit and limits

The supplement contains 1,247 selected mints; I audited all 4,241,610 raw rows belonging to 1,183 mints with histories. There are 64 mints with no histories and 22 per-mint export reconciliation mismatches. The earlier half has 411 selected mints, including 44 without rows; the later half has 836, including 20 without rows. Diagnostic tables below cover only 367/816 mints with rows, respectively, and cannot silently count the missing 44/20 as abstentions.

Full fingerprints `(mint, signature, wallet, side, amounts, venue, reserves)` remove 1,104,147 duplicate rows. After that deduplication, 82,145 rows have no receipt time and 84,440 have missing reserves. Three mints have decreasing block timestamps in canonical chain order; any affected attempted candidate outcome is excluded from diagnostics. Known tracker outages and close/idle-to-next-open intervals are excluded. Nonpositive/missing reserves, impossible standard-curve prices, unvalidated pool states, and streams ending before the horizon are excluded. A quiet terminal stretch is conservatively labelled unavailable; it is not moved to a later trade. Diagnostic exclusions and per-mint audit records are retained in CSVs.

The current launch census has 83,856 rows, 83,161 in the supplement's creation-time range. The 1,247 histories are selected because some previous book entered them. They are not all retained launches, and the census does not by itself identify all launches eligible under receipt-time retention and complete coverage. Missing capture is not inactivity. There is no independent evidence here establishing complete capture over each quiet landing interval, no historical per-token decimal verification, and no per-state creator/venue fee-config evidence in the trade columns. The 12,000-row pre-retention buffer and all actual restart spans cannot be certified from these exports alone. Pool decimals were assumed by the original decoder. A receipt-aware candidate calculation therefore still does not constitute an operationally valid scored result.

## Development results — conditional diagnostics only

The following results condition on a recorded, apparently usable curve path, assume the stated fee, and exclude known missing outcomes. **They are not official scored entries, not a common-N score, and not evidence of support.** Each mint has at most one entry in each replay mode, so position counts equal unique-coin counts. Values are stake returns after the assumed costs; 95% intervals bootstrap the diagnostic coins 10,000 times with seed 20261108. These conditional intervals do not include missing-outcome or selection uncertainty and are not the brief's Bonferroni test.
''']
lines.append('| Timing | Half | Size SOL | Diagnostic coins | Mean | Median | Win | 95% mean interval | Mean without best | Loss ≥50% | Total net SOL |\n|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|')
for m in j['metrics']:
 for stake in ['0.2','0.02']:
  z=m[stake];pct=lambda x:f'{x*100:.2f}%'
  lines.append(f"| {m['mode']} | {m['half']} | {stake} | {z['n']} | {pct(z['mean'])} | {pct(z['median'])} | {pct(z['win'])} | {pct(z['ci95'][0])} to {pct(z['ci95'][1])} | {pct(z['without_best'])} | {pct(z['worst50'])} | {z['total_net_sol']:.4f} |")
lines.append('\nAttempt and diagnostic availability counts:\n\n| Timing | Half | Histories | Attempts | Conditional paths | Other attempted outcomes | Abstentions within histories |\n|---|---|---:|---:|---:|---:|---:|')
for m in j['metrics']:
 n=m['statuses'].get('conditional_diagnostic',0)
 lines.append(f"| {m['mode']} | {m['half']} | {m['n']} | {m['attempts']} | {n} | {m['attempts']-n} | {m['n']-m['attempts']} |")
lines.append('''
The apparently usable outcomes are negative in both halves at both sizes. Removing the best coin worsens every mean. Earlier screening did not justify an active submission; the unchanged later check did not rescue it. Receipt-time treatment matters materially for which early launches are eligible. The event-time diagnostic remains separate and is never pooled with receipt-time results.

Exact exclusion counts are in `results.json`. Known unavailable paths are not winners and are not silently removed from any claimed common-N score: **no such score is claimed.** Even the conditional paths are uncertain under the stricter capture/config rules, so treating them as category (a) would be unjustified. For the active candidate, official counts (a)/(b)/(c), point/lower-bound score, portfolio concurrency and statistical support are **not identifiable** without a certified common universe and coverage evidence. Under the brief's conservative rule, all attempted outcomes lack full certification; the active candidate cannot establish the <=10% unknown-outcome requirement. A bootstrap of only available paths cannot repair that.

For the actual frozen no-entry policy, earlier and later development each have total net SOL 0, point score 0 and lower-bound score 0 for any positive common N, (a)=0, (b)=N, (c)=0, and peak concurrent positions 0. Mean/median/win rate/worst-loss rate per entered coin are undefined because there are no entries; 95% intervals for score are [0,0]. Result without best coin is still 0 because no coin was traded. It cannot have a confidence bound above zero for any K. No positive rule is claimed or submitted.

## Belief, risks and what would change it

The one simple receipt-aware flow rule tested here lost money in both development halves even under conditional fee/config assumptions. The smaller stake is especially harmed by fixed costs. This is enough to reject this candidate; it is not an exhaustive search of all possible strategies. Further threshold searching on the same selected sample would increase the chance of fitting noise, so I did not do it.

Existing records that would allow a stronger study are: raw trades for **every** retained launch, explicit retention/finalisation timestamps and pre-promotion buffer-overflow flags, receipt times throughout, a complete restart/subscription coverage ledger, validated mint decimals and venue/creator fee configuration at each execution state, and reconciled as-of exports. The universal lifecycle checkpoints cannot replace trade-level landing states or prove quiet-span capture. These are requests for existing evidence, not new bot code, collection or trading.

A new active rule would need positive results on representative development data with all unavailable outcomes counted conservatively, then a timestamped specification tested without revision on an untouched period under the frozen common evaluator. For this experiment only the future 8 Nov 00:00–10 Nov 00:00 UTC launches can supply that test; development results cannot be called future-test support. Existing pool/config and completeness uncertainty, selection bias, historical receipt-time differences, fixed latency assumptions, unconstrained capital and the counterfactual price path remain material risks.

## Reproduction and freeze

Run `python3 /workspace/session_3/analyze.py` against the stated unchanged data commit. `audit.csv` retains each mint's quality counts; `candidate.csv` retains every candidate decision and diagnostic status, including losses and exclusions; `results.json` holds all counts and metrics. `protocol.md` records the prespecified candidate before return calculation. A single implementation correction excluded event-order contradictions on three mints; this was a data-validity correction, not a new rule or threshold. No rule parameter was changed. The protocol's manually typed timestamp was corrected using its file creation timestamp before results were read.

This document is the complete frozen submission. Its UTC freeze timestamp is at the top. A SHA256 digest is saved alongside it; no external publication or git push is represented by the local freeze.
''')
(O/'FROZEN_SUBMISSION.md').write_text('\n'.join(lines))
files=['FROZEN_SUBMISSION.md','analyze.py','protocol.md','results.json','audit.csv','candidate.csv']
(O/'FREEZE_SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256((O/f).read_bytes()).hexdigest()}  {f}\n' for f in files))
print(now);print((O/'FREEZE_SHA256SUMS.txt').read_text())
