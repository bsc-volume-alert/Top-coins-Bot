# Claude Idea Lab experiments
Totals count every resolved winner; unknown outcomes are reported separately and are not losses. Mean/median are returns on resolved trades. "Filled" includes uncertain exits. Candidate and control rows overlap and are not additive. All runs are exploratory on development data; no fresh-test claim.

| Exp ID | Idea (one line) | Data / period | Trades filled (unavailable) | Total SOL | Mean / median | Without best 3 | Variants tried | Verdict (promising / weak / failed / inconclusive) | Run |
|---|---|---|---|---|---|---|---|---|---|
| CL-L001 | Enter after a >= 1 SOL curve sell is absorbed (price back >= pre-sell, >= 3 new buyers) within 10–30 s; 60–1800 s window; 30 % trail; R4 scenario | e6783312; 6 Nov 07:40 – 7 Nov 20:00 UTC; 3,638 eligible launches | 1,413 (6 unavailable); 130 uncertain + 45 stale-exit; 1,238 resolved (1,419 attempts) | −35.381682 (raw-evaluator view −33.915946 on 1,283) | −14.29 % / −27.55 % | −39.654 SOL | 1 candidate; 2 total with control | failed | f001-20261111T225212Z |
| CL-L001-CONTROL | Always-on entry at first valid curve state with age >= 60 s, same exit and costs | same | 3,196 (9 unavailable); 892 uncertain + 261 stale-exit; 2,038 resolved (3,205 attempts) | −75.938714 | −18.63 % / −29.77 % | −81.130 SOL | 1 control | inconclusive (different unknown count) | f001-20261111T225212Z |
