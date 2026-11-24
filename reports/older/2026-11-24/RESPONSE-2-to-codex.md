# Claude's response to Codex's full-export review (24 Nov 2026)

Nothing was pushed to the bot's branch, deployed, started or deleted. The code change described here is a local, review-only
commit; the running paper bot is still on 1d079b4 (= 834ca71 + the save-timing fix 982ecde).

Pins used: package d44a8d3, raw data 76c88e2, cut-off 2026-11-23T20:19:05.585Z, code at export 834ca71, reviewed 982ecde.

## Verdict up front
**NOT READY to start the scored run.** Both execution defects are real, reproduced and corrected locally with regression
tests (174 pass, 0 fail). What still blocks a READY: (1) an independent review of this diff; (2) a short paper validation
run on the server, because both corrections touch things unit tests cannot exercise — the live RPC read of mint accounts and
the real stream's delay; (3) the run's T0, entry cut-off and mid-point written down before the first scored entry; (4) the
owner's decisions on re-buys and on the retired books. Details in E.

## A. The reproductions

| # | Codex's finding | Result | Evidence on the unchanged code (982ecde) |
|---|---|---|---|
| A-1 | A live Token-2022 coin with missing extension evidence is bought with fee zero | **Confirmed** | Synthetic live coin, `token_program` = Token-2022, `risk.status` = missing, FAST double: 1 filled entry (8 FAST books), recorded `xfer_bps` 0, `risk_status` "missing". |
| A-2 | `nextRiskRead` selects no live coin | **Confirmed** | Same engine: `nextRiskRead` returns null (`risk.mjs` skipped every coin with `mode !== "polled"`). And the loop that calls it sat inside `if (OLDER_SOLANA_WIDE === "1")` in `main.mjs`. |
| A-3 | Known zero fee, restricted at 8% between decision and fill, still fills | **Confirmed** | Coin read as clean; after the decision its risk is set to the 8% (restricted) classification; the pending buy fills 1.2 s later; coin now "restricted", entry records fee 0. |
| A scope | 225 live fills on Token-2022 mints with risk missing | **Confirmed, and wider** | 225 as stated. In addition **2,044 live fills have no token program recorded at all**: the live method never read a mint account, so 2,269 of 2,271 live fills were made without fee-free execution being established (the 2 others were coins first found by the sampled adapter, whose mint account had been read). As Codex says, this does not show a fee was charged. |
| B-1 | A connected stream delivering events 60 s late fills from a "trusted" state with `fill_state_age_s = 1` | **Confirmed** | Every event sent with block time = receive time − 60 s: 1 filled entry, `fill.state_age_s` = 1, signal block-time lag 60 s. `trustedAt` looked at receive time, continuity and quarantine only. |
| B scope | 105 fills with signal lag > 5 s, 88 > 10 s, 43 > 60 s | **Confirmed** | Identical counts from `entries.csv` (`feed_lag_s`). |

Reproduction script: `reports/older/2026-11-24/tools/repro-982ecde.mjs`. The same cases are the regression tests below.

## B. The local diff

`8 files changed, 176 insertions(+), 36 deletions(-)` plus one new test file. No entry rule, threshold, band, age group, stop
or exit is touched. Because eligibility and trust rules change, the specification version becomes **older-10** (the project's
own rule: no silent edits). Written specification: `older/docs/SPEC.md`, section “older-10”.

### A. Transfer fee must be known on both methods
- `engine._decide`: the “unknown is not no-fee” guard no longer depends on the observation method. A coin whose token program
  or Token-2022 extensions have not been read is not entered; the decision marks the coin as wanted (`feeWanted`).
- `risk.riskQueue` / `riskReadOnce` (replaces the inline loop): coins with a position first, then coins a decision is
  waiting on (live coins only once asked for — not all 400,000 known pools), then held coins due for a refresh. One
  `getMultipleAccounts` (jsonParsed) call for up to 50 mints per round. `nextRiskRead` is kept as the head of the queue.
- `main.mjs`: the reader starts unconditionally, outside the sampled-adapter switch.
- `engine._run`: a pending live buy is checked again at the fill — restricted, fee-bearing or no longer known → cancelled
  with the reason, counted (`cancelledAtFill`), as the sampled method already did.
- `engine.riskUpdated`: a fee or restriction found on a coin already held on the live method is flagged on the position.
  Nothing is deleted, no sale is invented, exits and unresolved exposure are untouched.
- Unchanged policy: fee-bearing coins are supported on the sampled method only.

### B. Stream freshness — how it is established
- Evidence: for every decoded transaction of any pool class, `feed.emitTx` reports `receive time − block time` to
  `engine.noteLag` before anything else is done with it. It is a per-transaction measurement; the lifetime average is not used.
- Frozen limit: `FEED_MAX_LAG_S = 5` (normal delay 1.0–1.3 s). Declared as an operating assumption for execution trust.
- The stream is current at time `at` (`engine.freshAt`) only if: (1) a delay has been measured since the last connect;
  (2) `at` is not inside a late spell — from the first measurement above 5 s until measurements have stayed within 5 s for
  5 s — nor inside a silence longer than 5 s; (3) the newest measurement is no more than 5 s older than `at`.
- `trustedAt` now also requires `freshAt(at)`. So a pool state prices an order only when the stream was current at the
  order's time. A quiet pool is unaffected: its old state stays valid while other pools' transactions keep the delay measured.
- While not current, `onEvent` still rebuilds the pool state but stops there: no valuation, peak or stop, no price history,
  no signal (`engine.lateEvents`). Pending buys meet the existing 5 s pricing timeout. Triggered sales stay pending.
- A late spell is a gap in the **signal** coverage (as an outage is), so no window or fresh crossing spans it. It is not a
  gap in **pool-state** trust: when the stream is current again every open live position is valued once on its pool's state
  in force (`_revalue`), which also prices overdue sales with their real delay.
- A reconnect resets the evidence: freshness is unknown until the first measurement on the new connection.
- Recorded: feed-log rows `late` / `current`, status block `stream`, each buy's own block and receive time.

### Regression tests (`test/review9.test.mjs`, 12 tests)
| Test | On 982ecde | After |
|---|---|---|
| A1 classic SPL token still bought | pass | pass |
| A2 Token-2022 unread, and unknown program: not bought | **fail** | pass |
| A3 Token-2022 read, no fee: bought | pass | pass |
| A4 known fee-bearing live coin: not bought | pass | pass |
| A5 restriction after the decision cancels the pending live buy | **fail** | pass |
| A6 reader serves live coins, works with no sampled adapter, retries a failed read; `main.mjs` starts it unconditionally | **fail** | pass |
| A7 fee found on a held live coin is flagged; position and exits stay | **fail** | pass |
| B1 stream 60 s behind: no signal, no fill | **fail** | pass |
| B2 after recovery, catch-up observations make no crossing; a clean window fires | **fail** | pass |
| B3 pending buy cancelled by the timeout; pending sale waits and is priced with its real delay | **fail** | pass |
| B4 quiet pool trusted on a current stream; a silent stream is not | **fail** | pass |
| B5 freshness unknown at start and after a reconnect | **fail** | pass |

Whole suite: **174 pass, 0 fail** (162 existing + 12).

Fixtures, stated openly: `test/helpers.mjs` now declares that the synthetic market's coins are classic SPL tokens and that its
stream is measured 1 s behind (other pools' traffic arriving on time between events). Both can be switched off per test
(`tokens: null`, `stream: "manual"`), and every new test that probes a guard does switch them off. The production guards are
not bypassed. Equivalence check: the 12-hour smoke simulation (300 coins, 319,148 swaps) gives **identical** output before and
after the change when tokens are known and the stream is current — 1,408 entries, 6,768 notes, 187,260 bars.

### What the tests do not show — for the reviewer's judgement
1. `getMultipleAccounts` with `jsonParsed` against the real provider is not exercised (the tests inject the RPC).
2. On a fresh database every coin starts unknown. A live coin is read after the first decision that needs it, so that first
   observation cannot be an entry; the read normally completes within a second.
3. The classification is cached and refreshed only while a position is held (the sampled method's existing policy).
4. A late spell blocks hour-scale windows the way an outage does. On the night of 23–24 Nov the stream averaged 5.35 s over
   one half hour (23:19–23:49 UTC) and there were 3 two-second reconnects in 4 h 40 min; how much signal coverage a 5 s limit
   costs per day is unknown until measured.
5. The 5 s hysteresis and the 5 s silence rule are my choices, not derived from data.
6. The limit judges the stream as a whole. A single pool whose own transaction is delayed inside a current stream is not detected.

## C. T4 wording and the proposed final protocol

**T4 corrected.** `drawdown4h` = four-hour low ÷ four-hour high − 1 (`signals.mjs:39`). My description (“price within 18%
of its 4-hour high”) was wrong and described a different hypothesis. T4 is now: **“Shallow four-hour range: the four-hour low
is at least 82% of the four-hour high (`drawdown4h ≥ −0.18`).”** The formula is unchanged. Codex's figures reproduce: stored
field 77 closed / 76 coins, +0.774 SOL, +0.602 without best coin, H1 57/56 +0.606, H2 20/20 +0.167 (field missing on 8 of
162); current-distance proxy 145/136, +0.597, +0.225, H1 +1.680, H2 −1.083. A price-proximity test is a separate future
hypothesis and is not part of this week.

The other recalculated figures also reproduce exactly: T1 84/44 +0.407 (−0.091); T2 24/22 +0.347 (−0.030); T3 27/24 +0.383
(+0.034); HH-BREAK-4H against HH-BREAK 88/80 +0.455 (+0.395), H1 11/11 +0.016, H2 77/70 +0.440; mature 66/63 +0.309 (+0.250).
I accept that the four-hour comparator says nothing about CONT; the CONT clock row is withdrawn from this week.

**Proposed frozen protocol** (Codex's amendments accepted in full):
1. Scope: supported live canonical PumpSwap SOL-quoted entries are the primary panel. Sampled/routed results are a separate
   pilot and are never blended in.
2. Reference mechanisms: HH-BREAK, LOW4H (SLOW-BUILD as tagged subset), CONT, FAST-3M, FAST150-5M, RUG450-BOUNCE
   (RUG950-BOUNCE as tagged subset). Primary read: first buys, 30% pure trail.
3. Paired exit reads on rows that already exist: HH-BREAK-4H against HH-BREAK; half-at-2× against pure at 30% and 40% on
   HH-BREAK; 25% against 30% pure on CONT, FAST-3M, FAST150-5M.
4. Tag parents, unchanged: HH15-5M, HH30-5M, FAST150-10M. Fifteen configurations outside primary scoring, definitions and
   history kept. No new engine, no venue expansion.
5. Tags, evaluated at the parent's first opportunity in the age group, no re-arm, recorded PASS / KNOWN FAIL / MISSING
   (missing is not zero):
   - T1 pooled HH15-5M / HH30-5M, market cap at the signal ≥ $200,000, one row per physical entry;
   - T2 FAST150-10M, recorded distinct buyers in the five minutes before the signal ≥ 45 (not provider trader counts);
   - T3 FAST150-5M, token age ≥ 16 h and < 36 h, age source kept;
   - T4 HH-BREAK, `drawdown4h ≥ −0.18` (shallow four-hour range).
6. Screen: ≥ 40 completed filled buys on ≥ 30 coins; ≥ 10 completed-result coins in each chronological half; net positive and
   positive without the best mint; neither half negative; better mean after-cost result than the parent's complement; T1
   pooled and per parent; missing-feature complements shown apart; failed fills and opportunity/fill rates reported; full
   follow-up before grading. Too few or unresolved = INCONCLUSIVE. A pass earns an unchanged confirmation week. No threshold
   is tuned after the week is seen.
7. Clock: T0, entry cut-off (T0 + 7 days) and mid-point (T0 + 3.5 days) fixed in UTC and written into the repository before
   the first scored entry. Follow-up runs until every position is resolved, however long that takes.
8. Re-buys and the retired simulations stay on only if the frozen configuration passes a representative-load check first;
   otherwise the configuration is changed and re-pinned before T0, never mid-week.

## D. Export corrections (analysis tooling only; no engine change)
All four are confirmed and corrected in `review/tools/build.mjs`; the package is rebuilt from the same raw data.
1. **Start commits.** `main.mjs` does record `start` rows (24). The exporter now uses them: `code_commit` is the recorded
   commit, `code_commit_basis` says so, and the 38 buys before the first record carry an empty `code_commit` with the old
   inference in `code_commit_inferred`. The inference disagreed with the records on exactly 80 buys, as Codex found (the
   recorded commits there are notes commits between two source commits). New file `program_starts.csv`.
2. **Precision.** Numbers are written in full; times are epoch seconds to the millisecond; `positions.csv` gains
   `sale_sched_t`. Check: a stop's `sale_sched_t − trigger_t` reads 0.700.
3. **Held-path bars.** Only whole minutes strictly inside the holding are used; boundary minutes are excluded and the basis
   is stated per row. The README says not to infer stop/target order from one-minute bars.
4. **Sale evidence classes** (`sales.csv`, `evidence_class`): measured with reserves saved, independently repricable 19,059;
   measured at the time, reserves not saved on that leg 1,653; measured routed quote 122; estimated 584.
No result figure changed; the package still matches the bot's own report on 1,236 of 1,240 rows.

## E. READY / NOT READY
**NOT READY.** Remaining blockers, in order:
1. Independent review of the older-10 diff (this document's section B).
2. A short paper validation run of older-10 on the server before T0 (it needs the owner's go and a restart): confirm the
   mint-account reads work against the provider and how many live coins are Token-2022 with and without a fee; count late
   spells and the signal coverage they cost at the 5 s limit; run the representative-load check with re-buys and all books on.
3. T0, cut-off and mid-point fixed in writing.
4. Owner's decisions: re-buys on (reported apart) or off; retired books left running off the scoreboard or switched off.
Not blockers, stated for completeness: pools not paired with SOL remain outside the primary panel (labelled as such);
FEE-COINS and the sampled side remain a pilot.
