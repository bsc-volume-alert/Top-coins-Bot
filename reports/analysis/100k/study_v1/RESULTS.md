# $100K backward study v1 — 7 Nov 2026 10:35 UK. DEVELOPMENT DATA ONLY; no rule, no book, live off.
Frozen inputs + script + sha256 manifest: branch study100k-v1-inputs, commit 3bd9c3b90d6882b80f3dfd6189831f0f43c30998
https://github.com/bsc-volume-alert/Top-coins-Bot/tree/3bd9c3b90d6882b80f3dfd6189831f0f43c30998  (run: gunzip inputs/*.gz; python3 study100k.py inputs). Full output: study100k_out.txt.

Population: 41,653 launches created 6 Nov 09:23 → 7 Nov 07:23 UTC (= UK), 2-h window complete. Decision at 60 s:
POS (observed crossing, not suspect, after the decision, within 2 h) 19 · ALREADY ≥ $100K at 60 s 65 · SUSPECT 64 · DETECTED only 252 ·
NEG (no crossing observed — coverage UNVERIFIED) 1,949 · UNKNOWN 39,304 (38,359 not retained, 834 outage, 111 migrated without pool trades).
=> Comparisons are POS vs NEG among RETAINED launches (15-SOL screen or bundle tier-1) only; quiet launches cannot be compared. 19 positives (DEV 10 / TEST 9).
30-min / 1-h windows: POS 16 / 19. 24-h window: not adequately observed in these inputs.
Field coverage: checkpoint holders and top-10 share are EMPTY at every checkpoint; social fields empty; funder_sol 1,128/1,968; name repetition 1,763/1,968.

What holds (same direction on DEV and TEST, small counts):
- A high sell share at any checkpoint (≥ ~0.44–0.58 of trades) → 0 positives on either half (e.g. 60 s, ≥ 0.50: DEV 0/233, TEST 0/78).
- After the first minute: coins whose market cap at 5 min is ≥ their 60-s cap → 1.6% [0.6–3.9] DEV, 2.3% [0.9–5.8] TEST reached $100K later; coins below it → 0.1–0.2%. At 15 min the same split is 2.5% / 0.8% vs 0.1% / 0.0%. Direction consistent; 8 positives in total.
What does NOT hold (DEV and TEST disagree or n too small):
- Early market cap (≥ DEV 80th/90th pct at 15–120 s): DEV 3–9%, TEST 6–15% with 89–100% recall on TEST — the two halves differ by 2–3×; not stable.
- Bundle size (≥ ~41% / ≥ ~20 SOL): DEV 2–4%, TEST 10–15% — unstable; a TEST-period concentration of bundled launches is a likely confound (Codex 08:55).
- Funder SOL ≥ ~25: TEST 21–29% on 19–21 coins vs DEV 2–3% — tiny n, unstable.
- Buys / buyers / volume counts: 2–7% either half, overlapping intervals; no consistent lift once the high-sell-share coins are set aside.
- Name repetition, dev buy: ≤ base rate.
Multiple testing: 140 thresholds tried (thresholds_tried.json); ~7 chance "hits" expected at 5%.
Opportunity, not profit: from the 60-s market cap, POS coins' later checkpoint highs were ≥ 2× in 72%, ≥ 5× in 33%; NEG coins ≥ 2× in 5%, ≥ 5× in 1% (checkpoint resolution = a lower bound; POS by construction).
After-cost trading on identical entries: NOT DEFENSIBLE from these inputs (no trade-level paths after the decision for POS/NEG coins outside book entries). Collected prospectively from tracker 0.19.8 (09:48 UK) / 0.19.9.
Shared operators among POS: 2 creators and 1 attributed funder with > 1 positive.

Missing evidence that limits this study: (1) outcomes for 38,359 non-retained launches; (2) pool history before 6 Nov ~20:00 and for unretained migrations before 09:48 UK 7 Nov; (3) trade-level paths after each decision; (4) holders / top-10 / social fields; (5) a verified curve ceiling and per-token decimals (the 64 suspects).
Confirmation: any hypothesis taken from here must be frozen with a date and tested on launches created after tracker 0.19.9's activation.
