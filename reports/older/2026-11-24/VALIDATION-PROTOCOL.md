# 60-minute paper validation before T0 — protocol (version 2)

Version 1: 24 Nov, for Codex's review of `3537ada`. **Version 2: amended after Codex's review of `161d545`** (counter resets,
event-loop delay, chain verification, replay, and the true cost of option B). Launcher: `older/scripts/validate10.sh`.

**Nothing in this document has been run.** The running shakedown bot (commit `1d079b4`, started 23 Nov 20:19:37 UTC) is not
touched by preparing it. Paper only: no transaction is built, signed or sent; no wallet file is read.

## 0. Preconditions (all four, in writing)

1. Codex has reviewed the commit to be validated and has no open execution finding against it.
2. The owner has said "go" for the validation, has named the commit, and has chosen option A or B (section 2).
3. Codex has reviewed the launcher script.
4. For option B only: the owner has stopped the shakedown bot himself. The launcher never stops or restarts it.

## 1. What one hour can and cannot establish

- It can establish: that the mint reader parses real provider answers; classification latency on a cold start; the delay
  distribution and interruption counts for one hour; that saved orders reprice exactly; load on this server for one hour;
  that one restart preserves state.
- It **cannot** establish uninterrupted four-hour coverage. The validation database starts empty, so every 4-hour and
  24-hour window is unproven for the whole hour except where back-fill proves it, and the free GMGN key is saturated. The
  4-hour books will make few or no entries. That is a property of the test, not a result.
- Rare paths that do not occur are reported **NOT OBSERVED** and rest on the deterministic regressions
  (`review9`, `review10`, `review11`), not on the hour.
- It measures availability under the frozen 5-second assumptions. It is not used to tune them. No return figure from the hour
  is evidence for or against any book.

## 2. Identity, separation, and the operational choice

| | running shakedown bot | validation process |
|---|---|---|
| pm2 name | `older`, `older-pub` | `older-val` (no publisher; never saved to pm2's start-up list) |
| code | `/root/older`, branch `older-coins` | a separate checkout of `older-10-review` at the named commit (the launcher refuses `/root/older`, a different commit, or local changes) |
| database | `…/older/older-shakedown.db` | `…/older/validation10/older-validation10.db` (the launcher refuses to start if the folder exists) |
| price memory | `older-shakedown.db.warm` | `older-validation10.db.warm` (does not exist at the start: a true cold start) |
| run name / port | `shakedown` / 8793 | `validation10` / 8794 |
| published to | `older-data` | `older-validation10` — small result files only, after a key-pattern check; never the database |

Settings come from the same server-side file; no value is printed, copied or published. Non-secret settings are recorded by
an allow-list of names. No existing file is deleted, moved or rewritten.

**The choice, stated without softening:**

- **Option A — beside the shakedown bot.** The shakedown record continues unbroken. But the hour then measures **two
  processes competing** for one CPU, one Helius key and one saturated GMGN key. It is a contention test. It is **not** a
  proven upper bound for single-bot load (contention can also change timing in ways that are not simply "worse"), and its
  delay figures do not describe the proposed configuration. Cost: a second copy of the stream for an hour, about 3.7 GB ≈
  75,000 credits at today's 89.9 GB/day.
- **Option B — a dedicated hour with the shakedown bot stopped.** Measures representative single-bot load. **Its real cost:**
  the stop lasts about 65 minutes, and the bot's warm-restart limit is 60 seconds (`WARM_MAX_GAP_S`). So when the shakedown
  bot is started again it does **not** resume with its price memory: it has a plain outage gap of ~65 minutes in signal
  coverage. Its 4-hour books are unproven until that gap is back-filled (GMGN, saturated) or four hours have passed, and
  24-hour windows for a day. Open positions and their stops are kept (they are in the database), but nothing is priced or
  sold during the stop, and anything that should have sold in that hour sells late, at whatever the price is then, recorded
  with its real delay. Stream credits are moved, not added.

Codex recommends B, subject to the owner's explicit approval. So do I, for the reason given — with the cost above accepted
knowingly. This document does not make the choice.

## 3. Timeline and process epochs

Counters live in the process and restart with it. Results are therefore computed **inside one process lifetime (epoch)** and
never as a difference across the restart. Every status carries `process.started_at` and `process.uptime_s` so a snapshot is
attributed to its epoch without ambiguity.

| minute | action | epoch | segment reported |
|---|---|---|---|
| 0 | cold start, empty database | 1 | |
| 0–15 | | 1 | **cold start** (minute 15 snapshot − minute 0 snapshot) |
| 15–35 | | 1 | **steady, before restart** (snapshot `035-before-restart` − minute 15) |
| 35 | `pm2 restart older-val` — planned stop then start of the validation process only. This is the controlled reconnect. A socket-only reconnect is not forced; if the provider drops the socket (6 times in the last 17 hours on this server, each back in 2.1 s) it is reported, otherwise NOT OBSERVED | 1 → 2 | restart (section 4.5) |
| 35–60 | | 2 | **steady, after restart** (final snapshot − `035-after-restart`) |
| 60 | stop and remove `older-val`; database kept | | |

Snapshots: `/api/state` once a minute (status only, no keys), the filtered process table (name, pid, status, CPU, memory —
`pm2 jlist` contains settings and is never saved raw), `uptime`, `free -m`, database and WAL size.

## 4. Measurements

### 4.1 Mint reader (`status.risk_reader`)
- rounds, accounts asked and classified, largest batch, provider round-trip (mean, maximum);
- **real provider parsing:** for at least 20 classified mints — every Token-2022 mint seen, target ≥ 5 — the raw
  `getMultipleAccounts` `jsonParsed` answer is saved by a read-only script and compared field by field with the stored
  classification (program, each extension, both scheduled fees and the higher one, authorities). No Token-2022 mint with a
  fee or blocking extension in the hour → NOT OBSERVED;
- failures by reason: `transport_fail_rounds`, `short_response`, `null_account`, `unparsed`, `malformed`; retries; largest
  back-off;
- queue length and oldest waiting request, each minute;
- latency from first request to classification: mean, maximum, and median / 95th percentile to the resolution of the fixed
  histogram — per segment;
- blocked first opportunities: `fee_unknown_evaluations` (an upper bound), `fee_unknown_coins`, and each coin that waited more
  than 5 s with its window. Whether a book would have fired inside a window is not computed;
- held-coin refresh: how overdue (mean, maximum); classification age at each decision and fill; `cancelled_at_fill`.

### 4.2 Freshness (`status.stream`, feed log)
- per-transaction delay: count, mean, maximum, 8-bucket histogram — per segment, as bucket differences inside an epoch;
- wall-clock seconds current / late / recovering / silence / unknown. The status now reports these **as of the time it is
  read** (`as_of`, `seconds_total`); a coverage percentage is computed only where `seconds_total` equals the epoch's elapsed
  time to within 2 s, otherwise it is reported as not computable rather than calculated from incomplete counters;
- every interruption: cause, start, end, length; flapping = an interruption starting within 60 s of the previous one's end;
- silence handling: for every silence, confirmed from the database that no price history, signal, peak, stop or fill was
  created inside it. None in the hour → NOT OBSERVED;
- gap repair: every signal gap of the hour, whether a repair was requested, accepted or refused, and why.

### 4.3 Orders (validation database)
For every fill, half-sale and sale: entry id, mint, pool, rows, the signal transaction and its block time, decision time,
scheduled time, actual time, delay, the pool state used (reserves, fee, age) **and the signature and slot of the transaction
that committed that state** (`st_sig`, `st_slot` — recorded on every live fill and exit from this commit on), inventory,
proceeds, stream state, classification and its age.
- **Independent repricing:** each fill and sale recomputed from its saved reserves and inventory by a separate script that
  does not import the bot's pricing code. Count, count matching to 1e-9 SOL, every mismatch listed.
- **Against the chain — historical evidence only.** For a sample of at least 20 fills/sales (all if fewer): `getTransaction`
  for the saved `st_sig`, and the pool vaults' post-transaction balances in that transaction compared with the saved reserves.
  A current account read after the hour is **not** used: it cannot establish what the reserves were. The bot's own check at
  each fill (`verify`: one account read with its slot, compared with the state the fill used, flagged only when no event
  intervened) is reported separately as contemporaneous evidence.
- cancellations by the 5-second pricing timeout and by the eligibility gate, sales that waited for a recovery, and timed
  sales whose deadline fell inside an interruption — each with its timeline. None → NOT OBSERVED.

### 4.4 Load
- transactions and messages per second, MB received, Helius credits for the hour;
- **event-loop delay measured inside the process** (`status.event_loop`: Node's `monitorEventLoopDelay`, 10 ms resolution;
  mean, 99th percentile and maximum for every minute). The once-a-minute HTTP round-trip is kept only as a liveness check;
- CPU of the process (`status.process.cpu_user_s` / `cpu_system_s`, and per-minute `cpu_pct`) and of the server; resident
  memory and heap per minute;
- database and WAL size per minute; checkpoint behaviour;
- back-fill queue, GMGN calls / refused, Jupiter calls;
- **representativeness:** open entries at the end against the ~950–1,350 of the shakedown run. If the hour is much lighter, a
  bounded replay is added — **with the Store and its checkpointing enabled**, writing a real SQLite database, at ≥ 1,350
  open entries. It is run on this same server if the owner allows a second bounded run; if it is run elsewhere, the
  hardware difference (CPU count and model, disk type) is stated and the replay is reported as an engine-and-store
  throughput figure for *that* machine, not as evidence of this server's write capacity.

### 4.5 Restart (minute 35)
Compared between `035-before-restart` and `035-after-restart`, from the database and the status:
- every pending buy and pending sale: none lost, none duplicated, none filled inside the gap;
- held inventory, partial sales, peaks and stops; one-buy / re-buy state;
- signal coverage and pool-trust coverage: one gap with its cause; whether price memory was read back (a restart well under
  60 s should be warm) — stated either way;
- the first decisions after the restart: none uses a window spanning the gap unless back-filled bars prove it;
- any timed sale whose deadline fell inside the restart gap closes at the first trusted state with its real delay.
Nothing to compare in a category → NOT OBSERVED.

## 5. Report

One document on branch `older-validation10`: option, commit, settings, the three segments side by side per epoch, every table
above, a list headed **NOT OBSERVED**, a list headed **Failed**, the snapshots and scripts. The database stays on the server;
a read-only copy is published the same way as `older-review-data` if the owner agrees.
The report gives no verdict on any book and no readiness claim. It is input to Codex's decision.

## 6. Before scoring

Frozen in writing before the scored run starts on a fresh database: T0, mid-point, the seven-day entry cut-off, the book list
(`BOOK-LIST-PROPOSAL.md` once agreed), settings, and the reporting treatment — first buys and re-buys separate; estimated
exits apart; unsupported-fee results apart; missing and unresolved exposure visible; every total also without its best coin
and across the two fixed chronological halves; full follow-up of every entry after the entry window closes.

## 7. Approximations that remain

1. Paper fills are quotes on reconstructed pool states at our receive time plus a fixed delay: no real order, no competition
   for the block, no failed transaction.
2. Freshness is global: a delivered late transaction is seen; a missing update for one pool is not.
3. The three 5-second limits are declared assumptions, not measured optima.
4. A transfer-fee classification is as old as its last read.
5. A coin whose mint cannot be read is not entered: a real opportunity can be lost to a provider failure. It is counted.
6. Live positions later found fee-bearing keep a fee-free modelled exit; first buys and re-buys are both reported apart.
7. Hour-scale signals after any coverage gap depend on back-filled minute bars from a rate-limited third party.
8. Holder measures, where recorded, are top-account measures and a provider's figure — not wallet concentration.
