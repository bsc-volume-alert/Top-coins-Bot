# Entry Features & Winners Project — frozen snapshot 3, 7 Nov 2026

Export only. No strategy change, no new book, no live trading, nothing deleted. Separate from the $100K Market Cap Project.

## Identity
- Source: branch `launcher-data`, commit **d15ddf2accdd33849d7dc6e67a84196e1bdefe7c**. The bot pushed it at **2026-11-07 11:54:21 UTC**. UK time is GMT, so UK = UTC throughout.
- Code running at export: launcher **0.9.50**, tracker **0.19.9**, scope **0.12.16**. Tracker branch commit: 3330b7634c036a7e25aa32b205e00eb75379253c.
- Frozen copy: this branch (`entry-snap-7nov-1154`). Every file is gzipped except the .md, .txt and .json files. sha256 checksums are in SHA256SUMS.txt.
- Not included: `coverage_candidate_trades.csv` (94 MB). It is a stale 09:17 UTC dump for the $100K project, truncated and replaced by coverage_crossings.csv.
- Earlier frozen snapshots, unchanged and needed for records that have since aged out:
  - Snapshot 2: 6 Nov 18:23:11 UTC. Tracker commit b9213f9feca2cacd14edfeb33fac2745ba93ff98, folder `scope/files/snap_6nov_1830/`. It includes trades_books for entries in the 8 h to 18:23 and token_life (48 h).
  - 7 Nov 08:53:05 UTC snapshot: commit da62f6598e5a2c08e2468c776c6e65f1b6fada4f, folder `scope/files/snap_7nov_0900/`.
  - $100K inputs: branch `study100k-v1-inputs` @ 3bd9c3b9. These are the token_life / tracker_tokens / fd_watch exports c36821d3, b971fcdf, 7add56e0 and a3d7db4f.
- Aged-out rows. Rows present in an earlier snapshot but no longer in this export are copied verbatim into four files, with the earlier file's own columns:
  - `agedout_snap6nov1823_fd_positions` (572) and `agedout_snap6nov1823_fd_decisions` (114,106)
  - `agedout_snap7nov0853_fd_positions` (81) and `agedout_snap7nov0853_fd_decisions` (9,671)
  - Each row appears once; the newest snapshot that holds it wins.
  - No chain_fill row has aged out.
  - No position that was closed in both exports has a different r_frac_020 now.

## Units and time
- All `*_ts` fields are unix seconds UTC. `ms_*` fields are unix milliseconds. `recv_ms` is the tracker's receipt time in ms.
- SOL amounts are in SOL. `tokens_raw` are raw units: 6 decimals, supply 1e9. Prices are USD per token. `mc*` are USD unless suffixed `_sol`.
- `vsol` / `vtok` in trades_books depend on venue:
  - curve: virtual reserves after the trade
  - pumpswap: the pool's quote reserve (lamports) and base reserve
- Returns: r = exit multiple − 1 − fee/stake. The fee is 0.0015 SOL per round trip: 0.0075 of a 0.2 stake, 0.075 of a 0.02 stake.

## What kind of result each file is
| File | Kind |
|---|---|
| live_trades.csv | ACTUAL live execution: real 0.02 SOL trades on 5 Nov, before live trading was switched off. Live trading has been off since 5 Nov. |
| chain_fill.csv / fd_positions.csv `s_*`, `r_frac_020` | Reserve-based simulation of a 0.2 SOL position. The buy lands 1,000 ms after the decision on the reserves read then; the sell lands 700 ms after the trigger. Exit is a trail from the running high: 40% on the curve, 25% after migration. Horizon is 2 h. |
| `r_frac_02` / `s_r02` (legacy) | The 0.02 position on the same reserve state, which EXITS WHEN THE 0.2 TRAIL FIRES. It is the shared exit, not independent. |
| `i02_*` (fill-3, launcher 0.9.34, from 6 Nov 20:00 UTC) | The INDEPENDENT 0.02 position: its own trail on its own high, its own trigger, landing and exit. **1,867 positions decided before 20:00 UTC carry i02_* values computed afterwards by the new code. They are RECONSTRUCTED, not contemporaneous.** Earlier today, 828 rows were found where i02 and legacy differ by more than 30 points; these are under audit. Keep fill-3 results separate. |
| vol_paper.csv `x5…x120`, `r_*`, `mk_*`, `q_*` | Paper replay from GMGN prices, candles and Jupiter quotes. Entry price is the chain price at the check. It runs since 22 Oct, so it covers longer than fd_positions, which keeps 24 h. |
| fd_quotes.csv | Jupiter quote shadows at the check, not fills. |

## Measurement and execution versions (UTC)
- **fill-1 → fill-2:** 6 Nov 09:46. Every fd_positions row in this export is fill-2. Rows from before 09:46 have aged out.
- **s_res_trig:** recorded from launcher 0.9.27 (~14:40).
- **fill-3 / i02_*:** from 20:00 (0.9.34).
- **H4 epoch 2** (checks in order plus a 60-s fetch cap): 19:30 (0.9.30). This is `h4_epoch` on rows and `epoch` on decisions.
- **decision_age_s / metric_cutoff_ts / timing:** from 19:45 (0.9.31). `timing` = ontime / late.
- **Collection epoch 3** (3 concurrent checks): 20:31 (0.9.35/0.9.36).
- **Funding epoch 2** (launches recorded immediately, funding may be 'pending' at a decision): 20:58 (0.9.38).
- **Per-check 100-s deadline:** 7 Nov 04:31 (0.9.47). Before it, a hung check could stall a whole pass for ≤ 5 min.
- **Tracker:**
  - 0.19.5 obs-4 (exact 15/30/60/90/120-s cuts, token_life src='exact'): 6 Nov ~14:10
  - 0.19.6 obs-5 (pool trades kept for retained launches): 19:31
  - 0.19.8 (pool trades for every census launch for 24 h): 7 Nov 09:47
  - 0.19.9 (pool evidence fields): 09:57:18
- **CAUTION — `rule_ver` in fd_positions / fd_ledger is the version at EXPORT (0.9.50 on every row), not at decision.** Map decisions to code with `ts_decision` and the deploy list above.

## Books
- Verbatim predicates and exit/fee constants are in BOOK_DEFINITIONS.txt, the code running at export. Activation proxies (first and last entry per book) are in BOOK_ACTIVATION.txt.
- **Populations:**
  - FD-family books see launches with pre_nb=1 or the 1-in-7 control.
  - BL / BL27 / E60 / E90 / E90C see every launch the 15-SOL screen marked (screened=1).
  - U books (FDLU, FDLUX, FDU, FDLU90, FDU90, FDLU120, FDU120) have a decision-state guard. A position is skipped if the state read before submission is ≥ 30% below the check price. These rows have status `skipped-dump`, return 0, and are kept in the decision count.
  - *120 books enter 60 s later.
- **H4 arms** E60 / E90 / E90C share a cohort. A failed 90-s check is a deliberate no-entry and stays in the denominator.
- **Overlap:** one coin entered by many books at the same second is ONE opportunity (`same_decision_key`). fd_positions has 3,676 positions, but only 1,421 distinct decision keys and 826 distinct mints.

## Retention (why a mint can be missing from a file)
| File | Window |
|---|---|
| tracker_tokens | 48 h census |
| fd_watch | ~36 h |
| fd_decisions, fd_positions, fd_ledger | 24 h |
| chain_fill | all rows (from 5 Nov 12:20) |
| vol_paper | since 22 Oct |
| token_life | 12 h |
| early_checkpoints | 12 h |
| runner_registry | 48 h |
| feed_gaps | last rows only (from 7 Nov 10:54 here) |

**trades_books:** every mint a book entered in the last 4 h (106 of the 109 decided then), curve AND pool rows. Each stream starts at creation and ends ~125 min after launch, or 24 h for pool rows from 0.19.8. Older entered mints have NO stream here. Snapshot 2 holds streams for entries in the 8 h to 6 Nov 18:23; entries between then and 07:52 today have no exported stream.

## Not included (exists on the droplet or not at all)
1. **Pool evidence columns of tracker 0.19.9.** These are: pool address, ev_idx, base/quote raw amounts, pool reserves raw, base/quote mint and decimals, dec_ver, px_adj. They are in the tracker database but NOT in trades_books's columns. Exporting them needs a code change, which is proposed to the owner and not done. The pool decoder assumes base decimals = 6.
2. **Trade streams** for entered mints decided 6 Nov 18:23 → 7 Nov 07:52 UTC. They are on the droplet only while retained.
3. **Post-exit history** beyond ~125 min (curve) is not retained by the tracker.
4. **Holder and top-10 fields** in token_life / early checkpoints are mostly empty. Social links, image and replies are empty for every launch (pump.fun API returns 403).
5. **farm_dumps / farm_wallets** are EVENT-time tables rebuilt half-hourly, not the contemporaneous signal. The contemporaneous farm scores are inside fd_watch.checks (farm_*), as known at each check. buyer_funding covers entered coins only. wallet_trace / creator_trace are traces done after the launch was recorded.

## Outages and known gaps (UTC)
- **Tracker feed outages:** 6 Nov 20:40–20:42, 20:57–21:06, 23:33–23:35 (heap crash); 7 Nov 00:06–00:08, 00:26:30–00:27:30.
- **Under-checked 10-min windows** (checked < 60% of in-population, from fd_coverage):
  - 6 Nov 16:50, 17:10, 18:30–18:40, 19:30–20:10 (four windows with 0 checks), 20:30, 20:40, 21:00, 22:40, 23:40–00:00
  - 7 Nov 02:50–03:00 (0 checks), 03:20, 03:50. The 11:50 window is incomplete at the cutoff.
- **Box CPU saturated** (1 vCPU) until the resize to 2 vCPU / 4 GB, 6 Nov ~21:40–21:45 UK (powered off during the resize).
- **Launcher's Helius day cap (200k) halted checks** 23:27–23:50 (cap raised to 2M).
- **pm2 stopped all processes** at 00:06:11.
- **22 launcher heap crashes** 00:06–03:26, followed by hourly ≤ 5-min stalls until 04:31.
- **Publishing blackout** (files over 100 MB rejected) 01:38–03:27. Collection continued; only uploads were missing.
- **One check deadline timeout** 06:42. Since 04:31: no stalls; occasional single-check 100-s deadline errors (3 between 11:23 and 11:52).

## Reconciliation
RECONCILIATION.txt, produced by reconcile.py (`python3 -I reconcile.py <dir> <snap2 dir> <snap 7nov0853 dir>`). It covers:
- file windows
- launches / checked / entered
- decisions vs positions vs unique coins
- status counts
- per-book counts and descriptive means
- measurement epochs
- new since 18:23:11
- aged-out records
- trade-stream coverage

**Headline (24 h fd_positions):**
- Positions: 3,676 in total: 3,521 closed · 53 open · 102 skipped-dump. They cover 826 mints and 1,421 decision keys.
- 1,827 positions (474 mints) were decided after 18:23:11.
- Census launches since then: 30,899.
- Descriptive mean r per book is negative for every book except FDU120, which is +0.089 on 16 closed positions.
