# f017-20261114T065226Z — F017: counts-only cross-review of Codex C019, plus the receipt-clock R86 (2) count (R96 (b))

Task F017 (queue run 15, R99; tracker @ 7f937f5). Codex C019 read at research-codex @ 1258475c (run c019-register-20261114T031806Z; PROTOCOL 122657f). Base research-claude @ 253604d; lease @ 70181ff (06:52 UTC). Inputs: entry-all-20261107t2210 @ e678331 (16/16 SHA256 OK), entry-package-7nov @ 0e3be03 (two FX / crossing files read as headers only, hashes checked against its SHA256SUMS), blind-eval-1.1 @ be9b545 (evaluate.py sha f5686511…, imported unchanged for the frozen reader / dedup / state_ok). Development window 6 Nov 07:40 → 7 Nov 20:00 UTC; denominator 3,638 launches; E = 679 (313 early / 366 late; cells A 251 / B 122 / C 306); L003 = 296 (295 inside E + 1 outside).

**No outcome was read.** This run opens no fill, exit, net-SOL, ledger, P&L or post-decision price; nothing below is a trading result, a verdict or a strategy. It is a register check (R92) under R91 (development window closed for Idea-lab tests).

## 1. Question

Does C019 reproduce, are its N1 / N3 / N4 / N5 counts what PROTOCOL 122657f says they are, and does the R86 (2) bind share depend on the clock (block time vs receipt time)?

## 2. Method

**Part A1 — re-run unchanged.** Codex's register.py, validate.py and package_artifacts.py were run byte-for-byte unchanged in a mirror of its directory layout (its c001 cache = the 16 entry-all files + evaluate.py + the replay directory; its C014 quote_features.csv as L003 identities; its four C018 creator_features CSVs as E identities / cells; entry-package-7nov FX / crossing files as headers with manifest hashes). register.py asserts the evaluator hash, rules_common hash (f94d800b… = my f014/f016 copy) and all 16 raw checksums itself. prepare_public.py (Codex's GitHub metadata read) was not run; this run made no network read.

**Part A2 — independent re-derivation.** crossreview_f017.py re-implements the four computable proposals from the protocol text with my own code (different structure: per-wallet first-appearance map built from all curve rows received by D; FIFO lots as lists; cross-mint sells gathered in a second pass by wallet) and compares per launch — known flag, statistic, signal — with Codex's feature table (my re-run of it, byte-identical to the published partitions). Populations: the same 680 record launches (E rebuilt by rules_common exactly as f014/f016 and asserted equal to Codex's E / cell / half labels 680/680). Two explicit checks the queue asked for: (a) N1 "follower first appearance strictly after initiator receipt" — I require both the qualifying ≥ 0.1 SOL buy and the wallet's first curve appearance (buy or sell) to have receipt time > initiator receipt, equality excluded; a separate pass (check_n1_ties_n5_boundary.py) counts how often the tie clause has a candidate and whether counting ties would change any signal. (b) N5 window — sells with receipt in (D − 5, D], D = R + 60, on window mints other than the decided one; a separate pass (check_n5_window_bounds.py) recomputes the signal count under the three boundary conventions and lists rows sitting exactly on a boundary.

**Part B — R86 (2) with the receipt clock (R96 (b)).** Same 679 E launches, same W definition in words, threshold 0.25 unchanged (veto = adder share < 0.25). Block clock (f016, operative): W = wallets with a curve buy among rows received by t whose block ts > t − 60 (= buyers_last_60s, asserted), "before" = block ts ≤ t − 60. Receipt clock: W_RT = wallets with a curve buy received in (t − 60, t], "before" = receipt ≤ t − 60. Both counted on the same tape in one pass; per-launch 2 × 2 of the two veto flags reported.

## 3. Results — Part A1: C019 reproduces byte for byte

| File | Claude re-run = Codex published |
|---|---|
| COUNTS.json | identical (sha 145a2e2e…) |
| SUPPORT_AUDIT.json | identical (456b7195…) |
| input_checksums.json | identical (837fb67a…) |
| register.log, validation.log | identical |
| features_01–05.csv (= feature_records.csv partitioned) | 5/5 identical |

validate.py exit 0 (its own 680 / 679 / 296 and no-outcome-column assertions passed; initial_overlap_counts.json E counts unchanged, as Codex states).

## 4. Results — Part A2: independent re-derivation agrees per launch (680/680, 0 differences)

| Proposal | known-flag agreement | signal agreement (jointly known) | statistic agreement | differences |
|---|---|---|---|---|
| N1 | 680 / 680 | 679 / 679 | 679 / 679 | 0 |
| N3 | 680 / 680 | 532 / 532 | 532 / 532 | 0 |
| N4 | 680 / 680 | 357 / 357 | 357 / 357 | 0 |
| N5 | 680 / 680 | 654 / 654 | 654 / 654 | 0 |

My independent counts (E 679 / L003 296), all equal to COUNTS.json and to R95 / R97:

| Proposal | E known / unknown | E signal | E veto (defined share) | E by half (known, veto) | E by cell (known, veto) | L003 known / unknown / signal / veto |
|---|---|---|---|---|---|---|
| N1 follow-through (veto = no signal) | 678 / 1 | 301 | 377 (55.60 %) | early 313, 169 · late 365, 208 | A 251, 126 · B 122, 74 · C 305, 177 | 296 / 0 / 159 / 137 |
| N3 absorption (veto = no signal) | 531 / 148 | 2 | 529 (99.62 %); 145 known-no-opportunity | 254, 252 · 277, 277 | 209, 209 · 106, 106 · 216, 214 | 247 / 49 / 0 / 247 |
| N4 FIFO age ≥ 0.75 (veto = signal) | 357 / 322 | 1 | 1 (0.28 %) | 160, 1 · 197, 0 | 131, 1 · 71, 0 · 155, 0 | 161 / 135 / 0 / 0 |
| N5 cross-mint ≥ 3 wallets (veto = signal) | 653 / 26 | 11 | 11 (1.68 %); 5 known-no-opportunity (< 3 early wallets) | 302, 2 · 351, 9 | 242, 6 · 120, 0 · 291, 5 | 287 / 9 / 7 / 7 |

Checks asked for by F017:

(a) **N1 strict-after.** Re-implemented as stated; agrees 679/679 with Codex. Of the 678 N1-known E launches, 15 have at least one candidate wallet whose first appearance ties the initiator's receipt (same receipt millisecond); counting those ties as "after" changes the ≥ 3 signal of **0** launches. The clause is applied as the protocol says and does not drive the count.

(b) **N5 five-second window.** Re-implemented as (D − 5, D] on receipt time, other window mints only, actual receipt required, pool rows proven (WSOL quote, 6/9 decimals) or the launch marked unknown; agrees 654/654. Signal count on the 653 known E launches is 11 under (D − 5, D], 11 under [D − 5, D) and 11 under [D − 5, D]. Exactly one sell row by an early wallet sits on a boundary (receipt = D − 5 exactly, 0.486 SOL, curve) and is excluded by the protocol's open lower bound; it changes nothing.

One reading note, not a deviation: PROTOCOL §N5 says sums "with unknown quote/decimal evidence on pool rows [are] excluded and missing-evidence coverage reported"; register.py marks the whole launch unknown when any such row falls in the window (12 E launches, the "unproven pool quotes" in R97). Under the other reading (drop those rows, keep the launch defined) none of the 12 would reach 3 wallets, so the E signal count would still be 11 on 665 known instead of 653. Codex's reading is the more conservative one (more unknowns, same signals); either way N5 is "unlikely to bind" on this window.

N2 and N6: not re-derived — they are NOT DEFINABLE here by R97 and register.py computes nothing for them beyond the header read; my re-run of that header read is in the identical COUNTS.json schema_evidence.

## 5. Results — Part B: R86 (2) bind share under the two clocks (counts only)

| Clock | E | defined | veto (share < 0.25) | share of E | early / late | A / B / C | share q1 / median / q3 / mean |
|---|---|---|---|---|---|---|---|
| block time (f016, operative) | 679 | 679 | 140 | 20.6 % | 68/313 = 21.7 % · 72/366 = 19.7 % | 44/251 = 17.5 % · 44/122 = 36.1 % · 52/306 = 17.0 % | 0.276 / 0.409 / 0.544 / 0.420 |
| receipt time (R96 (b)) | 679 | 679 | 147 | 21.6 % | 73/313 = 23.3 % · 74/366 = 20.2 % | 46/251 = 18.3 % · 45/122 = 36.9 % · 56/306 = 18.3 % | 0.273 / 0.404 / 0.540 / 0.417 |

Per launch: W is the identical wallet set under both clocks on 404/679 launches; the adder share is identical on 399/679 (median |Δshare| 0.000, q3 0.010, max 0.302); W_RT is never empty. Veto 2 × 2: both 137, block only 3, receipt only 10, neither 529 — 666/679 (98.1 %) agree. The bind share does not depend materially on the clock: 20.6 % vs 21.6 %, both inside 5–95 % in every half and cell; cell B is the high-share cell under both (36–37 %). This answers R96 (b); the register can hold both counts. Which clock a released-window PROTOCOL names remains the coordinator's choice (R96 (a)); the receipt clock is the knowable-at-time one and the two differ by 13 launches here.

## 6. Limitations

Counts on a development window that both workers have exhausted (R91); shares may differ on a released window. Part A1 is a re-run of Codex's own code and proves reproducibility, not correctness; Part A2 proves that an independent reading of the protocol text yields the same numbers, which is the strongest check available without outcome data. Codex's E-at-300-s caveat stands: N1 / N3 / N4 / N5 decide before the E decision time, so E is future-selected relative to them and these are shape counts, not causal denominators. The L003 set is taken from Codex's C014 quote_features.csv as identities (296, asserted) — I did not rebuild L003 from raw in this run. Nothing here tests the mechanisms.

## 7. No Idea-lab test (R91)

Both Idea-lab slots on the development window are closed; no pretend trade was run. Three new proposals (no count taken) are in PROPOSALS.md (CL-P7–P9).

## 8. Files

crossreview_f017.py (Part A2 + Part B), check_n1_ties_n5_boundary.py, check_n5_window_bounds.py, rules_common.py (unchanged f014 copy, sha f94d800b…), results.json, f017_partA_records.csv.gz (680 rows: identities + my N1/N3/N4/N5 known/stat/signal — no outcome column), f017_r86_2_clocks.csv.gz (679 rows, both clocks), c019_rerun_comparison.json (hashes), commands.sh, PROPOSALS.md, SUMMARY.txt, ARTIFACT_SHA256SUMS.txt (from git ls-files after the content commit).
