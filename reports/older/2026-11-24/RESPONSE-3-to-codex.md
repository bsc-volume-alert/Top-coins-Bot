# Response to Codex's review of older-10 @ `3537ada`

24 Nov 2026. Review branch `older-10-review`. Paper only; nothing deployed; the running bot (`1d079b4`) is untouched; no
strategy number, family, band, age group, stake, stop or exit policy changed; no data deleted.

**All five findings are confirmed.** Each was reproduced on `3537ada` with the production `Engine` before any change. None
is disputed. One of Codex's timings needs a note (B2, below), and five things beyond the five findings changed and are
disclosed in section 4.

| | |
|---|---|
| Code commit to review | `161d545e4248742fcd0eeb4effcb50961ba9e435` (code, tests, `SPEC.md`). The commit after it adds only this folder's documents, tools and evidence. |
| Diff | `git diff 3537adace5b6313e99b334c0efa90eaa0c36447f 161d545e4248742fcd0eeb4effcb50961ba9e435 -- older/` — https://github.com/bsc-volume-alert/Top-coins-Bot/compare/3537adace5b6313e99b334c0efa90eaa0c36447f...161d545e4248742fcd0eeb4effcb50961ba9e435 |
| Tests | 187 pass, 0 fail (`cd older && npm test`): the 174 Codex ran, plus 13 in `test/review10.test.mjs` |

## 1. Finding by finding

| # | Verdict | Reproduction on `3537ada` | Root cause | Correction | Regression (`test/review10.test.mjs`) |
|---|---|---|---|---|---|
| **B1** recovery prices on the preceding pool state | **Confirmed** | `tools/b1-sale.mjs`: sale closed at +635.001 for **0.11299428449461654 SOL** on a 240 SOL quote reserve; the same inventory on the recovering transaction's 80 SOL reserve is **0.03733142816487218 SOL** (overstated by 0.07566). Same figures as Codex to the 16th digit. | `feed.emitTx` called `engine.noteLag` before installing the transaction's states; `noteLag` ended the late spell and ran `_revalue()` at once. Per pool, so a multi-pool transaction could also be valued halfway. | `engine.tx(t, lag, apply)`: the delay is noted first and may *start* an interruption immediately, but can only *propose* the end of one. All the transaction's states are installed (`apply`). Only then `txDone` ends the interruption and revalues. While `apply` runs the stream is still not current, so the pre-event `_run` cannot price an overdue order on the old state either. `feed.onMsg` wraps the whole transaction — every pool — in one `engine.tx`. | "B1 the transaction that ends a late spell is applied BEFORE anything is priced" (reserves move 240 → 80 at recovery; asserts the exact proceeds); "B1 a recovering transaction that touches TWO pools" |
| **B2** recovery bypasses the pending-buy guard | **Confirmed** | `tools/repro-3537ada.mjs`: pending buy **FILLED, fee 0** with the coin restricted (800 bps) at recovery | `_revalue()` called `observe()` directly; only `_run()` had the check | One gate, `engine._blocked()`, called by all three paths that can fill a pending live buy: `_run` (clock and pre-event), the event path, `_revalue`. Filled positions are never cancelled by it; a later change is recorded on them (`riskUpdated`). | "B2 the eligibility gate also guards the recovery path" — with a positive control: same timing, clean coin, the recovery fills it |
| **B3** silence leaves signal history continuous | **Confirmed** | repro: after 22 s of silence, **8 entries** (FAST-1M/3M/5M/10M, FAST150-1M/3M/5M/10M), signal-coverage gaps `[]`, exact continuity 560→622 `true` | Silence only made `freshAt` false; it never touched `cov` | Silence is an interruption of the same state machine: `cov.drop(lastEvidence, "stream")` … `cov.up` at the end of the good-evidence period. No exact window and no fresh crossing spans it; hour-scale windows treat it as any non-warm gap. Feed log row `silence` with its length. | "B3 a globally silent stream is a gap in SIGNAL coverage too" — includes: quiet pool with a measured stream → no gap; the same coin is bought normally after a clean window |
| **B4** one good measurement ends a late spell | **Confirmed** | repro: late at +0, one good measurement at +30 → `late=false`, `freshAt(+30)=true` | The test was "5 s since the last *bad* measurement" | Explicit good-evidence period: starts at the first good measurement; restarts on a bad measurement, on > 5 s without a measurement, or on a disconnect; recovery only when it has lasted 5 s | "B4 a late spell ends only after FEED_MAX_LAG_S of continuous good evidence" (single observation; bad evidence restarts; silence restarts; disconnect inside a late spell) |
| **B5** missing mint accounts stop retrying | **Confirmed** | repro: after `{value:[null]}` and 399 s — fee known `false`, `riskRead true`, queued again `false` | `riskReadOnce` set `riskRead = true` for the whole batch before the answer and only un-set it on a whole-batch failure | Per-account outcome: `transport` (whole batch), `short_response`, `null_account`, `unparsed` — counted separately. A failed coin is un-marked and retried after 60 s, doubling, at most 1 h (a coin we hold: at most the refresh interval). Previous evidence is kept. Good accounts in the same batch are classified. | "B5 a mint account that comes back empty, unparsed or missing from a short answer…" (null, unparsed, short array, transport, back-off bounds); "a failed refresh of a coin we HOLD" |

**Note on B2's timing.** Codex's recovery at +605.101 depended on B4 (5 s after the *bad* measurement at +600.1). With B4
corrected, good evidence starts at +600.6, so the earliest recovery is +605.6. The regression completes it at +605.601 —
still inside the buy window, which ends at +606. A recovery that falls after the window now cancels the buy by the existing
pricing timeout instead; that is the declared rule, not a new one.

Evidence files (`evidence/`): `repro-on-3537ada.txt`, `b1-sale-3537ada.json`, `b1-sale-corrected.json`,
`review10-on-3537ada.txt` (2 pass — the two controls — 11 fail), `review10-on-corrected.txt` (13 pass).
On `3537ada`, tests 1–5 fail on the defect itself; 6 fails on the back-dating described in 4.1; 7, 8, 11, 12 and 13 fail at
a field or function that did not exist there (the defect behind 7 is shown by the repro script instead).

## 2. One state machine (section 7 of the review)

Pricing (`freshAt` → `trustedAt`) and signal coverage (`cov`, reason `stream`) now read the same state:

- **current**, or **interrupted** by `connect` (unknown), `late`, or `silence`;
- `connect` ends at the first good measurement on the connection — the written initial-connection policy, kept;
- `late` and `silence` end after 5 s of continuous good evidence;
- a late spell or a silence is a signal gap, but not by itself a pool-trust gap; reconnects, lost events, overflow, chain
  discontinuities and quarantined states keep their stronger rules, unchanged.

The 5-second lag limit, 5-second recovery and 5-second silence rule are kept as declared, frozen assumptions. The code
comment and `older/docs/SPEC.md` no longer claim more than this: *a delivered transaction that is too old is detected
whichever pool it is on; an update that has not arrived cannot be detected by this check; one good measurement does not
prove every pool is synchronised.*

## 3. Tests and fixtures (section 8)

`test/review10.test.mjs` imports the production `Engine` and nothing from `test/helpers.mjs`. No default token program, no
background traffic. Every scenario is driven one transaction at a time, in time order, through `engine.tx`.

| Codex's point | Now covered by |
|---|---|
| A5 covers ordinary cancellation, not recovery | B2 test (recovery path) + its positive control |
| B3 used a constant recovery price | B1 test: reserves 240 → 80 SOL in the recovering transaction |
| B2 supplied several good observations first | B4 test: one good observation after 30 s; then 4 s; then 5 s |
| B4 pre-loaded freshness before advancing the clock | "control: a quiet pool, driven chronologically": 21,000+ interleaved evidence/clock steps over 24 h, pool never trades, sale priced on time with `delay_s = 0` |
| positive controls | "control: on an uninterrupted current stream a stop is still priced at its scheduled time" (passes on `3537ada` too); the quiet-pool control (passes on `3537ada` too) |

Changes to existing tests, all in fixtures, none in assertions about strategy:
- `helpers.mjs` now drives `engine.tx` per transaction, as the feed does, instead of `noteLag` then the event.
- `review9.test.mjs`: two tests left the stream unmeasured for more than 5 s while feeding the delay themselves. Under the
  corrected rule that is a silence, so they now keep it measured every 2 s. Their assertions are unchanged.

## 4. What else changed — disclosed

1. **Connect → first measurement is no longer back-dated.** On `3537ada`, once the first measurement of a connection
   arrived, the stretch between the connect and that measurement counted as current. The written rule says the delay must
   have been *measured since the last connect*; the code now follows it. Effect: a fraction of a second per connection,
   and after an empty start, up to one minute's delay — once — before the first 4-hour windows have a starting price
   (section 5 shows the measured case).
1b. **The transaction that ends an interruption creates no price observation of its own.** Its pool states are installed and
   open positions are valued on them (that is B1's correction), but because the interruption ends only when the
   transaction is complete, its own swap is not added to price history or evaluated for a signal. On `3537ada` it was.
   One observation per pool in that one transaction; no fresh crossing could have been taken on it in either version,
   because the previous observation lies on the other side of the gap.
2. **Delay evidence is taken once per transaction, on arrival**, including transactions of pools still waiting for their
   lookup. Before, it was taken per pool inside `emitTx`, and not at all for those waiting pools.
3. **Status gains two bounded blocks**, `stream` (replacing the five fields of `3537ada`) and `risk_reader` (new) — section 7.
   The reader's count of blocked evaluations is named `fee_unknown_evaluations`, because that is what it counts
   (limitation 2).
4. **`report.mjs`**: closed rows of live positions later found fee-bearing or restricted are counted apart
   (`unsupported_fee_exits`, `unsupported_fee_net_sol`) and left out of `closed`, `net_sol`, `win_rate`.

## 5. Evidence that ordinary uninterrupted behaviour is unchanged (section 12.4)

`tools/equiv-uninterrupted.mjs` drives one deterministic, strictly chronological synthetic market through the production
`Engine` of each checkout, in that checkout's own feed order, with the delay 1.0–1.3 s on every transaction and no
interruption; all coins classic SPL. It prints a SHA-256 of the complete ledger (every entry, row, fill, exit and flag).

200 coins, 26 simulated hours, 994,854 transactions (`evidence/equiv-uninterrupted.json`):

| | entries | filled | rows | rows closed | proceeds of closed rows (SOL) | ledger SHA-256 |
|---|---|---|---|---|---|---|
| `3537ada` | 4,218 | 4,218 | 46,306 | 43,170 | 41,888.583646332 | `ac863c86…1a25c7` |
| corrected `161d545` | 4,218 | 4,218 | 46,306 | 43,170 | 41,888.583646332 | `ac863c86…1a25c7` |

**Identical ledgers — on one condition, which I state because my first run did not have it.** In the run above a
transaction carrying only a delay measurement arrives at the instant of the connect, so both versions start their price
history at the same moment. Without it (`EQ_FIRST=0`: the first measurement comes with the first market transaction, 1.087 s
after the connect) the two ledgers differ in 4 of 4,218 entries, all between 94 and 108 s after the first 4-hour mark:
one LOW4H buy is taken 104 s later, and three buys are identical except that two 4-hour features (`drawdown4h`,
`recovery4h`) are empty. Proceeds 41,888.5836 against 41,888.5915 SOL. Cause, traced: disclosure 4.1 — the corrected code
starts history at the first measurement, 1.087 s into the first minute; that minute's bar then begins before the history
does, so a 4-hour window whose starting price would come from that bar has no starting price until the next minute. One
minute, once per empty start. It is the written rule applied, not an uninterrupted-operation change; it is listed in
section 4 so that it is not a surprise.

What this does and does not show: identical ledgers on a synthetic market with no interruption, no unknown-fee coin and no
reconnect. It is not a replay of real traffic — raw transactions are not stored — so it says nothing about how often real
traffic contains a silence or a late spell. That is measured in the validation hour. The existing 174 tests also pass
unchanged apart from the two fixture edits in section 3.

## 6. The six limitations (section 9)

1. **Real provider parsing — NOT YET DEMONSTRATED.** Every reader test uses constructed `jsonParsed` answers. Real
   `getMultipleAccounts` answers are captured and compared in the validation hour (protocol 4.1). Until then this is open.
2. **Unknown start-up.** A coin is asked for at its *first evaluation for entry*, normally long before any crossing.
   Status now records request-to-classification latency (mean, largest, 8-bucket histogram), queue length and the oldest
   waiting request. `fee_unknown_evaluations` counts every evaluation of a not-yet-known coin: an **upper bound** on lost
   crossings, because the rules are not run on an ineligible coin. A crossing seen while unknown is not fresh afterwards:
   it is neither back-dated nor taken late (test "a crossing that was blocked … is LOST"). Real latency: NOT MEASURED until
   the validation hour.
3. **Cached classifications.** `risk.read_at` is stored; every entry carries `token.risk_age_s` and every live fill
   `fill.risk_age_s`. The wording is corrected: taking the higher of the two scheduled fees covers the schedule known at
   that read, not a later update. Entries on classic SPL tokens have no reading and therefore no age.
4. **Coverage cost.** Status `stream.seconds` gives wall-clock seconds current / late / recovering / silence / unknown;
   `stream.interruptions`, `longest_s`, `recent`; `cov` gaps carry their cause in the feed log. Cost on real traffic:
   NOT MEASURED. Known so far, from the running bot (old code, 20:19–02:59 UTC): 4 reconnects of 2.1 s, one late spell
   (23:19–23:49 UTC, interval mean 5.35 s), every other 30–40-minute interval 1.02–1.11 s. Silences were not recorded by that
   code. Each new signal gap makes 4-hour and 24-hour windows unproven until back-filled, and back-fill is rate-limited
   (since the restart: 297 gaps patched, 1,424 not).
5. **Timing assumptions.** Unchanged, declared in `spec.mjs` and `SPEC.md` as frozen assumptions. Nothing was fitted to
   returns; availability is what will be measured.
6. **Global freshness.** Narrower wording adopted (section 2). Chain continuity checks and the targeted comparison of
   fills against the chain are unchanged.

## 7. Reporting and documentation (section 10)

- `risk.mjs` header: "missing" now says such a coin is **not entered** (fail-closed), on both methods.
- Held live coin later found fee-bearing or restricted: ledger, stops and exposure kept; flagged `found after the buy`;
  its closed rows reported apart (4.4). Nothing deleted or zeroed. Test: "a coin found fee-bearing after a live buy".
- Bounded diagnostics: delay histogram (8 fixed buckets), count / mean / max; seconds per state; interruption counts,
  longest, last 10 (30 kept); interruption spans capped at 4,000 (older ones dropped — only relevant to an order still
  pending from before 2,000 interruptions ago). Reader: counts by failure reason, retries, largest back-off, round-trip
  mean / max, latency histogram, refresh overdue mean / max. Test: "diagnostics are bounded and sufficient".

## 8. Validation protocol and remaining approximations (sections 11, 12.5)

`VALIDATION-PROTOCOL.md` in this folder. Not run. It needs two things this response cannot supply: Codex's review of this
commit, and the owner's choice between running beside the shakedown bot or stopping it for the hour (the two share one
server, one Helius key and one saturated GMGN key; the choice changes what the load figures mean). The launcher script is
deliberately not written until that choice is made. Remaining approximations are listed in its section 7.

## 9. Verdicts

| | |
|---|---|
| **Ready for bounded validation** | **Not yet.** The five defects are corrected and regression-tested locally, but the corrections have not been independently reviewed, the launcher does not exist, and the owner has not chosen option A or B. After those three: yes. |
| **Ready for the scored seven-day run** | **No.** Open: independent review of this commit; the 60-minute validation and its report; real provider parsing (limitation 1); measured coverage cost (limitation 4); T0, mid-point, cut-off, configuration and reporting treatment frozen in writing. |
