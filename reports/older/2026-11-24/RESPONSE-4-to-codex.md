# Response to Codex's review of `161d545` and to the plan of 24 Nov

Paper only. Nothing deployed, nothing merged into the bot's branch, the running bot (`1d079b4`) untouched, no paid service
bought, no second stream, no data deleted, no book switched off, no rule or threshold changed.

Every point Codex raised is **confirmed**; none is disputed. Three of my own earlier statements were wrong and are
corrected in sections 3 and 5.

| | |
|---|---|
| Code to review | `2328675a309f521e2afa6aaf524551b197b2277c` on branch `older-10-review` (parent chain: `161d545` → documents `72c2236` → tool `6310023` → corrections `630a3cd` → evidence/instrumentation → launcher) |
| Diff | `git diff 161d545e4248742fcd0eeb4effcb50961ba9e435 2328675a309f521e2afa6aaf524551b197b2277c -- older/` |
| Tests | 196 pass, 0 fail (`cd older && npm test`): the 187 Codex ran plus 9 in `test/review11.test.mjs` |
| Logging patch (separate branch, based on the running bot's code) | `older-holders-log-review` @ `8e55cc0d66eebec58bddb4dcd232a6f5d8785b37` — 167 pass, 0 fail |

## 1. Corrections, reproductions and tests

| # | Finding | Reproduced on `161d545` | Root cause | Correction | Regression (`review11`) |
|---|---|---|---|---|---|
| C1 | **Missed deadline during recovery** (blocker) | Codex's exact sequence: at E+4 the row is still `open`; the tick at E+4.1 makes it `selling` with scheduled time E+0.7; still pending at E+30. Control with the clock running: closed at E+4, delay 3.3 s | `_revalue()` called `observe()` only; time-based triggers live in `advance()` | `_revalue()` now runs `advance(e, t, …)` first (due clock transitions, each at its own time, with the ordinary trust test), then `observe()` (valuation and overdue orders, real delay), both behind the shared gate `_blocked()` | "C1 (Codex's reproduction)…": closed at E+4, reason max-hold, trigger at E, delay 3.3 s, priced on the unchanged pool state. Three more: control; a deadline after the recovery is untouched; the eligibility gate still comes first |
| C2 | Silence diagnostics | 30 s after the last transaction: `freshAt` false, status "current", seconds counters stopped at the last measurement | silence was only noticed when the next transaction arrived; the status had no notion of "now" | `tick()` starts the silence interruption 5 s after the last measurement (signal coverage down while it happens); `streamStatus(now)` reports state and seconds **as of now** without changing the engine, plus `as_of`, `since_last_measurement_s`, `seconds_total`; unknown time before a connection's first measurement is counted | two tests: every wall-clock second is in exactly one state; one silence counted once however it is noticed; a silence prices nothing and the pending timed sale closes after the good-evidence period with its real delay (10.3 s) |
| C3 | Unsupported re-buys | confirmed in `report.mjs`: the re-buy branch returned before the `riskAfter` check | ordering | re-buys of coins later found fee-bearing or restricted go to `unsupported_fee_rebuys` / `unsupported_fee_rebuys_net_sol`, in no re-buy total; first buys unchanged; no ledger row dropped | "C3 a RE-BUY of a coin later found fee-bearing…" with an ordinary re-buy as control |
| C4 | Malformed mint answers (first version of the review) | `extensions: "oops"` → TypeError out of the batch loop; all three coins left marked as read and never asked for again | `classifyMintAccount` assumed shapes; one exception aborted the whole batch after every coin had been marked read | the classifier validates extensions / decimals / owner / supply and **fails closed** ("missing", never "no extensions"); each account is handled in its own try/catch (`malformed`, counted, retried with the usual back-off); an exception while saving one coin no longer strands the others | "C4 a malformed mint answer fails that ONE coin…" (five malformed shapes, mixed batch, failing store) |
| C5 | Signal-gap repair | confirmed in `main.mjs`: the scheduler read `engine.feedCov.gaps` | late spells and silences are gaps in `engine.cov` only | scheduler reads `engine.cov.gaps` through `backfill.gapRequests()`: each new signal gap once, gaps in touching minutes merged into one request; exact windows remain unrepairable; `feedCov` untouched | "C5 the gap repair is asked for SIGNAL-coverage gaps…" |

**Found while checking C5 — a defect of my own in older-10.** Since `3537ada` a reconnect's *signal* gap ends at the first
delay measurement, a little after the *pool-trust* gap ends. The repair was recorded for the pool-trust interval, and the
hour-scale test requires a recorded repair that covers the whole signal gap. So in older-10 **no reconnect gap would ever
have counted as repaired**, however good the back-fill. The same change fixes it; the C5 test shows the old interval leaving
the window unproven and the new one repairing it.

On `161d545` the new file gives 3 pass (the three controls) and 6 fail: `evidence/review11-on-161d545.txt`.

**Uninterrupted behaviour unchanged.** `tools/equiv-uninterrupted.mjs` (complete ledger, finished entries included, same
history start on both), 200 coins × 26 simulated hours:

| | entries | of which finished | rows | rows closed | proceeds of closed rows (SOL) | ledger SHA-256 |
|---|---|---|---|---|---|---|
| `161d545` | 4,605 | 387 | 50,634 | 47,498 | 46,329.766800727 | `84365937…cf9a4c` |
| corrected | 4,605 | 387 | 50,634 | 47,498 | 46,329.766800727 | `84365937…cf9a4c` |

Identical (`evidence/equiv-uninterrupted-161d545-vs-2328675.json`). As before, this is a synthetic market with no
interruption, no unknown-fee coin and no reconnect: it shows the corrections do not touch ordinary operation, nothing more.

## 2. Evidence and instrumentation added for the validation (no behaviour change)

- every pool state keeps the signature and slot of the transaction that committed it; live fills and every exit / half-sale
  record carry them (`st_sig`, `st_slot`) so a price can be checked against that transaction's own balances;
- status: `process` (pid, start, uptime, CPU seconds) and `event_loop` (Node's `monitorEventLoopDelay`, 10 ms resolution, one
  line per minute, three hours kept).

## 3. Reconciled entry-level figures — `RECONCILIATION.md`, `reconciliation/*.csv`

- Codex's 82 buys / 55 coins / −2.13738 SOL (cut-off 23 Nov 20:19:05.585 UTC) are reproduced exactly from the raw copy. My
  102 buys / −3.795 SOL are the same 82 plus 20 decided afterwards, from the bot's published list of 24 Nov 12:59:48 UTC
  (bot commit `1d079b4`). RUG450: 23 → 32 the same way. Ids and mints are in the CSV files. Definitions in section 1 there.
- **Correction (a):** removing the 40 buys that never rose 10% (−3.598) from −3.795 leaves **−0.198 SOL on 62 buys** — still a
  loss. It does not establish profitability, and "never rose 10%" is only known afterwards.
- **Correction (b):** my "reached 2×" was the 24-hour post-fill high. In the 82-buy cohort 23 reached 2× within 24 h (10
  profitable) but only **4 while the 30% row was held**, all profitable — Codex's figures. For the 20 newer buys the held
  peak is not in the published list and is not estimated. Nothing here supports a profit-taking change.
- Missing data shown: top-buyer share known for 80 of 102, holder count for 95. Neither is the proposed condition.
- **Correction (c) — a statement withdrawn.** I told the owner the top-10 condition could not be tested on past trades. It
  can, partly: the bot has stored the token provider's top-holders percentage at every non-re-buy entry since 20 Nov
  (1,133 of 1,171 closed first buys). On that figure, buys with top-10 < 25%: 528, 28% won, −8.97 SOL; 25–40%: 514, 27%,
  −6.55; fast/volume cohort: 38 buys, 16% won, −1.38 against 36 buys, 28% won, −0.93; all 23 RUG450 buys were under 25%.
  Limits: the provider's definition is unverified and the reading arrived a median 20.3 s after the decision (28% before
  the fill). It is evidence against expecting much from that condition, not proof.

## 4. Exact proposed keep / retire / tag list — `BOOK-LIST-PROPOSAL.md`

Not implemented. 11 kept as research parents (FAST-1M/3M/5M, the four volume books, HH-BREAK, HH-BREAK-4H, LOW4H,
SLOW-BUILD); 2 become tags (LOW4H-LIQ25K on LOW4H, RUG950-BOUNCE on RUG450-BOUNCE); RUG450-BOUNCE optional and separately
judged; 9 proposed for retirement from new entries (RUG450, RUG950, HH15-5M, HH30-5M, HH30-10M, CONT, CONT-STALL,
AGE-DOUBLE, SECOND-WAVE); 6 left to the owner (FAST-10M, FAST-30M, the four FAST150). Definitions, losses, history and
management of open positions are preserved in every case. Common conditions are recorded on every buy and reported as
subsets beside unchanged parents. The new-coin books, the "fell and went flat" book and a follow-through entry are **not**
proposed for the first scored week.

## 5. Logging design, availability semantics and credit budget — `LOGGING-DESIGN.md`

- Separate branch off the running bot's code; off by default; engine untouched; 4 files, +140 −3.
- Zero-credit part: publish the provider top-holders figure the bot already records, with its arrival time; keep the
  provider's whole audit object from the call already made.
- Optional chain snapshot, once per physical entry that is not a pure re-buy: request/response times, both context slots,
  supply and denominator, raw largest-account balances, resolved owners, verified pool-vault exclusion only, top-account
  measures with a fixed completeness statement, largest holder against the pool's reserve, and PASS / KNOWN FAIL / MISSING /
  TOO LATE. A late snapshot is TOO LATE and never treated as known before entry. The fee rule is recorded **UNRESOLVED**; no
  proxy is substituted.
- Credits: stream ≈ 1,797,600 a day; snapshot ≈ 460 a day typical (230 qualifying entries × 2 calls — owner resolution and
  supply are inside those two calls; no pagination), ≈ 920 with every call retried, hard cap 6,000. My earlier "about 700
  reads a day" was not a costed figure and is replaced by this table. I found **no offsetting saving**, so strictly this is
  an increase of ≈ 0.026%; with the variable unset the increase is zero. The owner decides.

## 6. Revised validation protocol and launcher — `VALIDATION-PROTOCOL.md` (version 2), `older/scripts/validate10.sh`

All five amendments adopted: process epochs across the minute-35 restart; event-loop delay measured in-process; chain
verification from the committing transaction (`st_sig`) rather than later account reads; a replay only with Store and
checkpointing, hardware differences stated; option B's stop exceeds the 60-second warm-restart limit, so the shakedown bot
restarts with a plain ~65-minute coverage gap — stated in full. Option A is described as a contention test, not an upper
bound (my earlier wording withdrawn). The launcher refuses to run from the bot's checkout, at another commit, with local
changes, over an existing folder, or in a mode that does not match the shakedown bot's actual state; it never stops or
starts the shakedown processes; it never saves `pm2 jlist` raw. It has **not** been run; only its argument checks and its
process-table filter were exercised locally.

## 7. Remaining prerequisites for the seven-day scored run

1. Independent review of `2328675a309f521e2afa6aaf524551b197b2277c` with no open execution finding.
2. Review of the launcher; the owner's choice of option A or B and his go; the 60-minute validation; its report.
3. Real provider parsing of mint accounts demonstrated in that hour (still NOT DEMONSTRATED).
4. Coverage cost measured on real traffic: silences were never recorded by the running code.
5. The book list agreed and frozen (section 4), including re-buys on or off.
6. The meaning and unit of "total fees" established, or the condition left out of the first week.
7. T0, mid-point, seven-day entry cut-off, settings and reporting treatment frozen in writing; fresh database.
8. A decision on the logging patch (off / on with a cap / validation hour only).

## 8. Verdicts

| | |
|---|---|
| **Ready for bounded validation** | **Not yet** — pending items 1 and 2. I know of no open execution defect in `2328675a309f521e2afa6aaf524551b197b2277c`; that was equally true of `161d545` before Codex found one, so an independent pass is the test. |
| **Ready for the scored seven-day run** | **No** — items 1 to 7. |
