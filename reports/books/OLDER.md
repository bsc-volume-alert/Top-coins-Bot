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

## 20 Nov 2026, 13:44 UK — old bot removed from the server (owner's decision)
- Owner: "we don't need the old data… start fresh". All eight old processes stopped and removed from pm2 (tracker, deployer, executor, fomo, scope, radar, launcher, agents).
- Deleted permanently, on his instruction and by his own hand in Termius: `/root/tracker` (39 GB), `/root/launcher`, `/root/executor`, the four data-branch clones, `/root/research-mirror`; on the volume `tracker-db` (38 GB), `backups` (35 GB), `idle-dbs`, `archive`, `k100audit`. This includes the raw trades of 6–15 Nov, which were never archived. Results already pushed to GitHub (data branches, book notes, `trades-archive-pre-20261106`) are untouched.
- Kept, verified byte-identical before anything was deleted: three settings files and two wallet key files, in `/root/keys-backup` and on the volume (`keys-backup`). Two different wallets. The paper project never reads the wallet files.
- Server after: main disk 11% used (43 GB free), volume 1% used (95 GB free), no processes.
- Setting names seen (values never shown): the tracker settings include a Birdeye key — worth checking what plan it is on, for the broad-live option.
- Leftover: a cron entry for the deleted `push-data.sh` (to be removed), `/root/p5dump.cjs`, `/root/gmgn`.

## 20 Nov 2026, 15:29 UK — shakedown check (run started 14:58:56, still on OLD code bd9b7b3)
- Healthy: feed connected, 0 reconnects, memory 318 MB, database 83 MB, 93.9 GB free.
- Start-up scan complete (~13.5 min, 1,150 pages): 383,715 SOL-quoted PumpSwap pools; 230,455 canonical pump.fun, 153,260 non-canonical; 4,382 above $5K; **680 inside the $40K–$1M band**.
- Trade reader, 30 minutes: 374,690 swaps decoded, 33 unreadable (20 `multi_hop_swap` buys, 13 sells); chain check 145,587 ok / 38 broken; 440 unusual fee readings; 139 look-up errors (`WrongSize`, fixed in c09053a, not yet loaded on the server).
- Five paper buys, all FAST150 family: 44DZsP (A1, 1M and 3M) closed −11% to −44%; i6Aop7 (A4, 5M and 3M, live method) pool check 0.00% difference, 20% stop closed −23.6%, wider stops open; 8nq3Jm (A4, 5M) = first sampled-method buy, filled from a Jupiter routed quote 1.17 s after its scheduled time. Account checks 4 of 4 within 1%. Five trades is far too few to say anything about the strategy.
- Sampled side on the FREE Jupiter key: 343 coins watched, average sample gap 19.8 s (target 10 s), 11% of price requests omitted (2,256 of 20,507), 90 history restarts, 6,310 credits in 30 min.
- Helius: 2.82 GB in 30 min ≈ 56,000 credits ≈ **2.7 million credits a day** (earlier estimate was 1.8–2.1 million).
- Why most books are empty so far: AGE-DOUBLE reference price missing for 705 coin-groups; CONT / LOW4H need 1 h / 4 h of history; GMGN history queue 1,342 and rate-limited.
- About two-thirds of PumpSwap traffic is pools with SOL on the base side (186,274 of 224,641 "non-SOL" events) — only reachable through the sampled method today.
