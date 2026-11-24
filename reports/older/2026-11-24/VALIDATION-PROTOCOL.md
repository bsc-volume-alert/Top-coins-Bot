# 60-minute paper validation before T0 — protocol

Prepared 24 Nov 2026 for Codex's review of older-10 @ `3537ada`, section 11. **Nothing in this document has been run.** The
running shakedown bot (commit `1d079b4`, started 23 Nov 20:19:37 UTC) is not touched by preparing it.

Paper only. No transaction is built, signed or sent; no wallet file is read; no trade endpoint is called.

## 0. Preconditions (all four, in writing)

1. Codex has reviewed the corrected commit on `older-10-review` and has no open execution finding against it.
2. The owner has said "go" for this validation run, and has chosen between options A and B in section 2.
3. The launcher script for this protocol (section 2) has been written on the review branch and reviewed. It does not exist
   yet: what it must do depends on the choice in section 2.
4. The exact commit to validate is named in the "go". The run records it; a different commit invalidates the run.

## 1. What one hour can and cannot establish

- It can establish: that the mint reader parses real provider answers; how long classification takes on a cold start; what
  the delay distribution and the interruption counts look like for one hour; that saved orders reprice exactly; load on this
  server for one hour; that one restart preserves state.
- It **cannot** establish uninterrupted four-hour coverage. The validation database starts empty: every 4-hour and 24-hour
  signal window is unproven for the whole hour, except where GMGN back-fill proves it (and the free GMGN key is saturated —
  626–772 of 2,480–2,900 calls refused overnight). The 4-hour families will therefore make few or no entries in this hour.
  That is a property of the test, not a result.
- It cannot establish behaviour on rare paths that do not occur in the hour. Those are reported **NOT OBSERVED** and rest on
  the deterministic regressions (`older/test/review9.test.mjs`, `review10.test.mjs`), not on the hour.
- It measures availability under the frozen 5-second assumptions. It is not used to tune them, and no return figure from the
  hour is reported as evidence for or against any book.

## 2. Identity and separation

| | running shakedown bot | validation process |
|---|---|---|
| pm2 name | `older`, `older-pub` | `older-val` (no publisher process) |
| code | `/root/older` checkout, branch `older-coins` | a **separate checkout** of `older-10-review` at the named commit, e.g. `/root/older-val` |
| database | `…/older/older-shakedown.db` | `…/older/validation10/older-validation10.db` (must not exist beforehand; if it does, the launcher stops) |
| output folder | `…/older` | `…/older/validation10` (own price-memory file, own `pub/`) |
| run name | `shakedown` | `validation10` |
| web port | 8793 | 8794 |
| published to | branch `older-data` | branch `older-validation10` (result files only, key-pattern check before push) |

Settings are read from the same server-side `.env`; no value is printed, copied into the output or published. The
non-secret configuration is recorded by name and value (`OLDER_SOLANA_WIDE`, `OLDER_REBUY`, `GMGN_WPS`, `JUP_RPS`,
`INV_MIN_MC_USD`, `INV_MAX_POOLS`, quote intervals, node heap limit) together with `SPEC_VER` and the full commit SHA.

No existing file is deleted, moved or rewritten. The shakedown database, its WAL, the review copies and all published
branches stay as they are.

**Decision the owner must make — the two processes share one server, one Helius key and one GMGN key:**

- **Option A — run beside the shakedown bot.** The shakedown data continues. Cost: a second copy of the program stream for an
  hour (about 4.7 GB ≈ 93,000 Helius credits at the measured 112 GB/day), and both processes compete for the CPU and for the
  saturated GMGN key. Load and delay figures from this hour would then describe *two* bots on the server, not the proposed
  configuration; they would be an upper bound, and the shakedown bot's own delay could rise during the hour.
- **Option B — stop the shakedown bot for the hour, restart it afterwards.** Load and delay figures describe the proposed
  configuration. Cost: a gap of about 65 minutes in the shakedown record (a planned stop; price memory is saved and read
  back) and the same hour of stream credits moved rather than added. This changes the running bot and needs the owner's
  explicit go.

Whichever is chosen is stated at the top of the validation report. This document does not choose.

## 3. Timeline (minutes from the validation process's start)

| minute | action | reported as |
|---|---|---|
| 0 | cold start on an empty database; no price memory | **cold start**, 0–15, reported apart |
| 0–60 | the launcher saves `/api/state` once a minute to `snap-NNN.json` (status only, no keys); `uptime`, `free -m`, `pm2 jlist` CPU and memory of both processes once a minute | |
| 15 | marker snapshot | boundary between the two segments |
| 15–60 | steady segment | **remaining 45 minutes**, reported apart |
| 35 | **controlled restart** of `older-val` only (`pm2 restart older-val`): a planned stop, then a new connection — this is the controlled reconnect. A socket-only reconnect is not forced; if the provider drops the socket by itself (4 times in the last 6.7 hours on this server, each back in 2.1 s) it is reported, otherwise it is NOT OBSERVED | restart + reconnect |
| 60 | stop `older-val`; final snapshot; copy the validation database read-only for analysis | |

The 15–60 segment contains the restart on purpose. Figures for 15–35 and 37–60 are also given separately, so the restart's
own interruption can be seen and removed.

## 4. Measurements

All counters are cumulative in the status, so each segment is the difference between two snapshots.

### 4.1 Mint reader (`status.risk_reader`, entries, fills)
- rounds, accounts asked and classified, largest batch, provider round-trip time (mean, maximum);
- **real provider parsing:** for at least 20 classified mints, of which every Token-2022 mint seen (target ≥ 5, including at
  least one with an extension if one occurs), the raw `getMultipleAccounts` `jsonParsed` answer is saved and compared with
  the stored classification: token program, each extension, the two scheduled fees and the higher one, authorities.
  A read-only script does this from the saved mints after the hour; it is listed in the report. If no Token-2022 mint with a
  transfer-fee or other blocking extension occurs: **NOT OBSERVED**, supported by `classifyMintAccount` unit tests;
- failure counts by reason: `transport_fail_rounds`, `short_response`, `null_account`, `unparsed`; retries; the largest
  back-off reached;
- queue length and the age of the oldest waiting request each minute;
- latency from the first decision that needed a coin to its classification: mean, maximum, and median / 95th percentile to
  the resolution of the fixed histogram (≤1, ≤2, ≤5, ≤10, ≤30, ≤60, ≤300, >300 s) — cold segment and steady segment
  separately;
- **blocked first opportunities:** `fee_unknown_evaluations` and `fee_unknown_coins`. The first number counts every
  evaluation of a coin whose fee was not yet known — an **upper bound** on lost crossings, because the entry rules are not
  run on an ineligible coin. Reported with it: every coin that waited more than 5 s (first-asked time is in its note, read
  time in its classification), with its waiting window and its price range inside that window from the stored history.
  Whether a book would have fired inside a window is **not** computed; the list is the bound. No crossing is back-dated or
  taken late (regression in `review10`);
- held-coin refresh: how overdue each refresh was against the scheduled interval (mean, maximum);
- age of the classification at each decision and fill (`token.risk_age_s`, `fill.risk_age_s`): distribution and maximum;
- `cancelled_at_fill` with reasons; live positions flagged after the buy (`found after the buy`).

### 4.2 Freshness (`status.stream`, feed log)
- per-transaction delay: number of measurements, mean, maximum, the 8-bucket histogram (≤1, ≤2, ≤3, ≤5, ≤10, ≤30, ≤60, >60 s),
  for each segment (bucket differences between snapshots);
- wall-clock seconds current / late / recovering / silent / unknown per segment — **coverage cost** = share of seconds not
  current, plus the number and total length of signal-coverage gaps (`cov`), plus how many 1-, 3-, 5- and 10-minute windows
  ending in the segment were usable. A lifetime average is not reported as a result;
- every interruption from the feed log: cause, start, end, length; **flapping** = interruptions that start within 60 s of
  the end of the previous one, counted;
- silence handling: for every silence, confirm from the database that no price history, signal, peak, stop or fill was
  created inside it and that no exact window spans it. If no silence occurs: NOT OBSERVED;
- events skipped as late (`engine.lateEvents`);
- reconnects and chain discontinuities, with their own (stronger) trust gaps, reported separately from the above.

### 4.3 Orders (validation database)
For every fill and every sale in the hour, a table with: entry id, mint, pool, book rows, transaction signature and block
time of the signal, decision time, scheduled time, actual time, delay, the pool state used (base and quote reserve, fee, its
age), inventory, proceeds, stream state at that moment, classification and its age.
- **Independent repricing:** each live fill and sale is recomputed from its saved reserves and inventory with a separate
  script that does not import the bot's pricing code (constant-product with the recorded fee). Result: count, count matching
  to 1e-9 SOL, every mismatch listed.
- **Against the chain:** for a sample of at least 20 fills/sales (all of them if fewer), the pool reserves at the recorded
  transaction are read back from the chain and compared with the saved state.
- pending buys cancelled by the 5-second pricing timeout, by the eligibility gate, and sales that waited for a recovery — each
  listed with its timeline. If none: NOT OBSERVED.

### 4.4 Load
- transactions and messages per second, MB received, Helius credits for the hour (2 credits per 0.1 MB) and the daily
  figure that implies;
- event-loop delay (maximum per minute — recorded by the launcher's once-a-minute probe of the web port round-trip, and the
  engine's `evalMsMax`), CPU share of the process and of the server, resident memory and heap per minute;
- database and WAL size per minute, growth per hour;
- back-fill queue, GMGN calls / refused, Jupiter calls and credits;
- **representativeness:** open entries at the end of the hour against the ~1,000–1,350 seen in the shakedown run. If the
  hour is much lighter, a separate bounded replay with the production engine at ≥ 1,350 open entries is run off-server and
  reported beside it (throughput and worst evaluation time), labelled as a replay, not as the server hour.

### 4.5 Restart (minute 35)
Compared immediately before the stop and after the restart, from the database and `/api/state`:
- every pending buy and pending sale (id, scheduled time, status) — none lost, none duplicated, none filled inside the gap;
- held inventory per position, partial sales (half-at-2× rows), peaks and stops;
- one-buy / re-buy state per book and coin (`again` counters);
- signal coverage and pool-trust coverage: the restart is one gap with its cause recorded; price memory read back (warm) or
  not (cold) is stated;
- the first decisions after the restart: none uses a window that spans the gap unless back-filled bars prove it.
Any category with nothing to compare (for example no pending sale at minute 35): NOT OBSERVED.

## 5. Report

One document on branch `older-validation10`: option A or B; commit; configuration; the two segments side by side; every
table above; a list headed **NOT OBSERVED**; a list headed **Failed**; the saved snapshots and scripts. The validation
database is kept on the server and a read-only copy is published the same way as `older-review-data`.

The report gives no verdict on any book and no readiness claim of its own. It is input to Codex's decision.

## 6. Before scoring (after a clean validation and Codex's READY)

Frozen in writing before the scored run starts, on a fresh database: T0, the mid-point, the seven-day entry cut-off, the
configuration (section 2 list), and the reporting treatment (distinct first buys; re-buys beside; estimated exits apart;
unsupported-fee exits apart; mature = filled ≥ 24 h before cut-off; without-best-coin beside every total). The amended
research protocol is not changed by this validation.

## 7. Approximations that remain after the corrections

1. Paper fills are quotes on reconstructed pool states at our receive time plus a fixed delay; there is no real order, no
   competition for the block and no failed transaction.
2. Freshness is global: a delivered late transaction is seen; a missing update for one pool is not (chain checks and the
   targeted comparison are the per-pool evidence).
3. The three 5-second limits are declared assumptions, not measured optima.
4. A transfer-fee classification is as old as its last read; a fee announced after the read is found only at the next read
   (while held) or at the check before the fill.
5. A coin whose mint cannot be read is not entered: a real opportunity can be lost to a provider failure. It is counted.
6. Live positions later found fee-bearing keep a fee-free modelled exit; they are reported apart, not inside net results.
7. Hour-scale signals after any coverage gap depend on back-filled minute bars from a rate-limited third party.
