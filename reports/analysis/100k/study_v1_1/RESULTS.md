# $100K backward study v1.1 — 7 Nov 2026 ~10:45 UK. DEVELOPMENT DATA ONLY; no rule, no book, live off.

Supersedes study_v1 (kept unchanged for the record). Inputs are byte-identical to study_v1: branch `study100k-v1-inputs`,
commit 3bd9c3b90d6882b80f3dfd6189831f0f43c30998 (sha256 in its MANIFEST.txt; re-checked 10:30 UK, all 16 match).
Run: `gunzip inputs/*.gz; python3 study_v1_1/study100k.py inputs`. Full output: study100k_out.txt. Checksums: MANIFEST.txt.

## What changed from v1 and why
1. **Timing bug (found by Codex 10:14 UK).** v1 checked only the 60-s reading for lateness; 5-min and 15-min readings and the
   "multiples" were not checked (some were hours late). v1.1 applies the same on-time rule (≤ 15 s late, or exact) to every checkpoint.
2. **Curve-ceiling rule.** The standard pump.fun curve cannot price above ~4.11e-7 SOL per token (≈ $36,979 at SOL $90 —
   matches the $37,019 completion level the tracker observed). All 39 curve "crossings" of $100K in the coverage export sit above it,
   so none can be a standard-curve price. 37 were already SUSPECT; 2 newly are, incl. v1 positive 8GwMLgh8… (path $5.6K → $3.0K →
   $75K → $108–175K for 2 s → $274; also below the curve's starting price — a decode error or non-standard curve, not a runner).
   Constants are documented launch parameters, not yet read from on-chain config.
3. "NEG" renamed **NOCROSS_OBS** (no crossing observed; coverage unverified) — not a confirmed failure. 4× multiple added.
   Multiples limited to on-time checkpoints inside the 2-h window. Per-case table of positives and a NOCROSS_OBS qualification added.

## Sample (decision at 60 s, 2-h outcome)
41,653 launches (6 Nov 09:23 → 7 Nov 07:23 UTC = UK). POS 18 (DEV 9 / TEST 9) · ALREADY 65 · SUSPECT 65 · DETECTED_ONLY 252 ·
NOCROSS_OBS 1,949 · UNKNOWN 39,304 (38,359 not retained, 834 outage, 111 migrated without pool rows).
Comparisons are only possible among RETAINED launches (15-SOL screen or bundle tier-1). Quiet launches: outcome unknown.

## The 18 positives, audited one by one (table in study100k_out.txt)
- All 18 crossed on the PumpSwap pool, after migration (migrated flag 1, pool rows present). None on the curve.
- Crossing time after creation: 1.1 – 37.5 min (median 8.0 min). 8 of 18 within 5 min.
- Market cap at crossing $100,084 – $108,450; SOL/USD price 9 – 118 s old; previous recorded trade 0 – 6 s earlier (dense history, not a jump).
- Trades recorded at ≥ $100K: 7 to 18,899 per coin. HBGWqAKo… had only 7 — it touched $100K briefly.
- Not yet checked per case: pool decimals (tracker assumes 6), and whether each pool row is a duplicate (fingerprint dedup).

## NOCROSS_OBS cohort — what can and cannot be said (n 1,949)
- Highest observed cap: median $8.4K, 90th pct $22.5K, 99th pct $72K; 37 reached ≥ $50K, 16 ≥ $75K (near-misses).
- 29 migrated (all with pool rows). 1,133 had their last recorded trade within 10 min of creation — consistent with a dead coin
  OR with collection stopping; this export cannot tell which. 716 have a gap > 5 min between recorded trades, 239 > 30 min.
- Not verifiable: continuous curve collection per coin, or missed trades between recorded ones. Label stays "coverage unverified".

## Results (DEV = before 7 Nov 00:00 UTC; TEST = after; thresholds fixed on DEV)
**Holds in both halves (small counts):**
- High sell share → no positives. 60 s, sell share ≥ 0.50: DEV 0/233, TEST 0/78. 0/78 is still consistent with a true rate up to
  4.7% (95% upper bound), so this is a **candidate warning, not an exclusion rule**.
- Five-minute persistence (timing-corrected): cap at 5 min ≥ cap at 60 s → DEV 3/189 (1.6% [0.5–4.6]), TEST 4/130 (3.1% [1.2–7.6]);
  cap fell → DEV 1/540 (0.2%), TEST 1/394 (0.3%). 15 min: held DEV 2/79, TEST 1/81; fell DEV 1/450, TEST 0/348.
  Same direction both halves, but only 9 positives in total across the four cells — weak evidence.

**Does not hold (halves disagree 2–10×):** early market cap (60 s ≥ $11.9K: DEV 6.2%, TEST 10.5%), bundle size (DEV 2.2%, TEST 10.5%),
funder SOL (DEV 2.0%, TEST 21% on 19 coins), buys/buyers/volume (overlapping intervals), name repetition and dev buy (≤ base rate).
140 thresholds tried (thresholds_tried.json) → ~7 chance "hits" expected at the 5% level.

**Opportunity, not profit** (60-s cap → highest later on-time checkpoint ≤ 2 h; a lower bound; no costs):
POS (n 17 with on-time readings) ≥2× 76%, ≥3× 59%, ≥4× 41%, ≥5× 35%, ≥10× 24%, median 3.10× — partly by construction.
NOCROSS_OBS (n 1,654) ≥2× 5%, ≥3× 2%, ≥4× 2%, ≥5× 1%, ≥10× 1%, median 0.82×.

**After-cost trading on identical entries: NOT DEFENSIBLE** from these inputs (no trade-level paths after each decision for
non-entered coins). Collected prospectively since tracker 0.19.8 (09:48 UK) / 0.19.9 (09:57:18 UK) for pool trades.

## Unknown / missing
Outcomes of 38,359 non-retained launches; pool history for unretained migrations before 09:48 UK 7 Nov; holders / top-10 / social
fields (all empty); per-token decimals; continuous-coverage proof for NOCROSS_OBS; trade-level paths after decisions.

## Next
Frozen hypotheses (HYPOTHESES_FROZEN.md) are tested only on launches created after 7 Nov 09:57:18 UTC. No re-tuning on that data.
