# OLDER — the older-coin paper project
_Started 20 Nov 2026 (UK) after the owner's "stop everything and start again" (LAUNCHER.md). Local build only; not deployed._
- **Idea (owner):** coins 8 hours to 90 days old, $40K–$1M, bought when they double — including sudden 1/3/5-minute doubles on a new narrative — across many parallel paper books.
- **Spec:** `older/docs/SPEC.md` (older-2): 14 entry families × 4 age groups × 4 trailing stops × 2 exit policies = 448 comparisons.
- **Review package / open items:** `older/docs/REVIEW.md`.
- **Verified 20 Nov:** GMGN key is on the Free plan (5 weight/s), not a paid one; GMGN has no stream → Helius is the live feed (owner's decision). PumpSwap prices on effective reserves (vault + signed virtual reserves) — the old tracker's decoder ignores this.
- **Not yet verified:** reserve reading (before/after the swap), Helius cost, GMGN history depth, memory on real traffic. All need a short live run the owner has not yet authorised.
- **Honest prior:** M2 (2× in 15 min on young coins) made +10.9% a trade and −6.8% without its top three coins. These books are exploratory; nothing here is evidence of an edge.

## 20 Nov 2026, afternoon — scope widened to Solana-wide (spec older-3)
- Owner's decision (via ChatGPT's GO): eligible older coins across launchpads and exchanges, not pump.fun only. 448 comparison rows kept.
- Two methods, always labelled: **PumpSwap live** (decoded events, pool-state fills) and **Solana-wide sampled** (Jupiter prices at a recorded cadence + routed quotes). Sampling can miss fast moves; HH-BREAK is not evaluated on sampled tokens.
- Jupiter published prices (20 Nov): Developer $25/month (10 req/s, 25 M credits), Launch $100 (50 req/s, 100 M). Recommended: Developer, paced at 9 req/s. Owner must create the account.
- Helius streams are billed 2 credits per 0.1 MB; the validation run measures bytes. Broad LIVE monitoring is costed at roughly $250–500/month of credits and is not built.
- Five corrections applied and tested (scale-out formula, USD at each observation's rate, SECOND-WAVE across age boundaries, HH-BREAK completed-minute windows, unusual fees flagged not clamped). 53 tests pass.
- Still UNRESOLVED until the live run: reserve reading, fees against real transactions, Helius usage, memory, GMGN history depth, Jupiter coverage. See `older/docs/REVIEW.md` §6.
