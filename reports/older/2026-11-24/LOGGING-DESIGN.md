# Recording before filtering — logging-only patch for the shakedown bot (Codex's brief, sections 4 and 5)

**Status: prepared for review. Not deployed, not merged, off by default.**
Branch `older-holders-log-review`, one commit on top of the running bot's code (`older-coins`, bot commit `1d079b4`).
Diff: `git diff origin/older-coins older-holders-log-review -- older/` — 4 files, +140 −3 (`holders.mjs` new 81 lines,
`holders.test.mjs` new 52 lines, `main.mjs` 8 lines, `jupiter.mjs` 1 line). That branch's suite: 167 pass, 0 fail.

Nothing in it is read by a decision, a fill, a stop or an exit. The owner's three conditions are **hypotheses**; the patch
records what they would have said. It filters nothing.

## 1. What already exists, at no cost (found while preparing this)

At every entry that is not a pure re-buy the running bot already asks the token provider (Jupiter) for the coin's statistics
and stores them on the entry (`entry.snap`): holder count, 5-minute and 1-hour statistics, and **`top_holders_pct`**.
1,133 of 1,171 closed first buys in the 23 Nov export have it. Results by that figure are in `RECONCILIATION.md`, section 5.

The patch therefore does two zero-credit things first:
- the published compact list gains `top10j` (that figure) and `snap_s` (seconds from decision to its arrival);
- the provider's whole `audit` object is kept from the same answer (one extra field, no extra request), so we can see what
  else it offers.

Limits of that figure: the provider's own definition (unverified), and it arrives late — median 20.3 s after the decision,
only 28% before the simulated fill — because it travels in the bot's lowest-priority provider lane.

## 2. The optional chain snapshot (`holders.mjs`, off unless `OLDER_HOLDER_SNAP=1`)

Once per physical entry — one buy shared by several books and stops is one snapshot. The engine's `onEntry` hook is not
called for a pure re-buy, so **pure re-buys get no snapshot** (changing that would need an engine change, which this patch
deliberately does not make).

| Recorded (`entry.hold`) | Detail |
|---|---|
| Request / response times | `req_t`, `largest_resp_t`, `owners_resp_t` (receive clock) |
| Context slots | `slot_largest`, `slot_owners` — the two answers can be from different slots; both are kept |
| Availability relative to decision and fill | `s_after_decision`, `s_before_fill`, `availability`: `before fill` / `after fill` / `missing` |
| Supply and percentage denominator | `supply_raw`, `decimals` — read from the mint account in the same call as the owners; every share is of **total supply** |
| Raw largest-account balances | `top_accounts[]`: address, raw balance, share (up to 20) |
| Resolved owners | `top_accounts[].owner`; `owners_resolved`, `owners_unresolved` |
| Verified pool/vault exclusions | `excluded[]` — an account is excluded **only** if its owner is this coin's own pool account; reason stored |
| Concentration measures | `top10_accounts_share`, `largest_account_share`, `top10_owners_share_among_top20`, `largest_owner_share_among_top20` |
| Completeness | fixed text on every record: 20 largest *token accounts* only; an owner's other accounts and wallets linked to one person are not included; only this coin's own pool vault is excluded |
| Largest holder against pool reserves | `pool_vault_raw`, `largest_vs_pool_reserve` — potential dump pressure, same evidence |
| Fee condition | `verdicts.fees.status = "UNRESOLVED"` with the reason (section 4) |
| PASS / KNOWN FAIL / MISSING / TOO LATE | `verdicts.top10`, `verdicts.largest`: `status` and, separately, `if_available` |

Naming is deliberate: these are **top-account** measures. `getTokenLargestAccounts` returns twenty token accounts, not twenty
wallets, and nothing here is called exact wallet concentration. A large account that is another pool, an exchange or a lock
is **not** excluded (it is not verified) and can overstate concentration; that is visible in `top_accounts`.

Availability semantics: a snapshot that arrives after the scheduled buy has `status: "TOO LATE"`; what it would have said is
kept in `if_available` as a diagnostic and is never reported as known before the entry. A failed or skipped snapshot is
`MISSING`. Nothing is back-dated.

## 3. Timing impact

- Not on the decision path: started from `onEntry`, never awaited by the engine; the engine code is untouched.
- Two sequential HTTPS calls and the parsing of at most 21 small accounts per snapshot.
- At most 4 snapshots in flight; a fifth is dropped (`skipped_busy`, recorded `MISSING`), not queued — position management
  keeps priority.
- Latency on this server is **not measured yet**. Status block `holder_snapshots` records count, mean and maximum duration
  and how many arrived before / after the fill. The buy is simulated 1 s after the decision; whether two calls usually fit
  inside that second is exactly what the first day would show.

## 4. "Total fees ≥ 2 SOL" — defined as unresolved

The owner's figure is the "Total Fees" shown by GMGN. Not established: whether it counts swap fees, network/priority fees or
tips; whether it is lifetime or recent; its unit in the API (`total_fee`, also `trade_fee`, `fee_distribution`). The
read-only test that would settle it was refused twice because the free GMGN key is saturated by the bot's own use.
Until it is settled the patch records `UNRESOLVED` and **no proxy**. (A swap-fee estimate from the bot's own stream would be
a different quantity: only since the bot first saw the pool, and without priority fees or tips.)
Two ways to settle it without paying: one successful read-only GMGN call when the key is free; or the owner reading the
figure for two or three named coins off the website so it can be compared with the stream's swap-fee sum.

## 5. Credit budget

Helius billing (docs, 24 Nov): standard RPC call = 1 credit; stream = 2 credits per 0.1 MB.

| Item | Per day | Basis |
|---|---|---|
| Stream today | **≈ 1,797,600 credits** | 62.43 GB in 16.67 h since the restart = 89.9 GB/day |
| Existing RPC calls | ≈ 2,100 | fill verification 886 calls and pool look-ups 581 in 16.67 h |
| Entries that trigger `onEntry` | ≈ 230 | 230 in the last 24 h (162 in 16.67 h); most entries are now pure re-buys |
| **Chain snapshots, typical** | **≈ 460 credits** | 230 × 2 calls |
| Chain snapshots, every call retried | ≈ 920 | 230 × 4 (one retry per call at most) |
| Hard ceiling in code | 6,000 | daily cap 1,500 snapshots × 4 calls (`OLDER_HOLDER_SNAP_MAX`) |

What is and is not included: owner resolution **is** included (call 2 resolves all 20 owners at once); supply needs no extra
read (the mint is the 21st account of call 2); there is no pagination (20 accounts is the method's fixed maximum); retries are
bounded at one per call. Not included because the patch does not do it: any attempt to find an owner's other accounts.

Against the ceiling "do not increase Helius credit consumption": the typical addition is about **0.026%** of today's daily
total, far below the stream's own day-to-day variation (89.9 GB/day today, 112 GB/day measured on 23 Nov). It is still an
increase, and **I found no offsetting saving of comparable certainty** — the RPC calls the bot makes today are evidence
(fill verification) or necessary (pool look-ups). So the honest options are:

1. deploy with the snapshot **off** (default): zero additional Helius credits; the provider figure already recorded becomes
   visible in the published list;
2. turn it on with a small cap (for example `OLDER_HOLDER_SNAP_MAX=250`, at most 1,000 credits a day), accepting ≈ +0.03%;
3. leave the chain snapshot for the validation hour only.

No plan is purchased and no second stream is opened under any option. The owner decides; my suggestion is 1 now, 2 if the
provider figure proves too late or too vague to judge the condition.

## 6. Deployment (not requested, not done)

The patch is on its own branch. The shakedown bot pulls `older-coins` when restarted; the patch is **not** on `older-coins`.
Deploying it would mean merging one commit and a restart, on the owner's go. With the variable unset, behaviour and credit
use are unchanged apart from the two extra fields in the published list and one stored field per entry.
