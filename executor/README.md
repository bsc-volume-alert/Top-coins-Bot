# Executor — the live buy/sell bot (separate from the tracker)

Started 18 Oct 2026 (owner: "let's build our own bot… completely separate from everything we've done"). This folder is the whole of it; nothing
in `src/` is changed for it except the measurements below and, later, one line that hands P5 triggers to the executor over a local socket.

## Decisions so far (owner, 18 Oct)
- Own execution, not GMGN / Jupiter: GMGN takes 1% in + 1% out (≈ 1.3 SOL a day at 0.5 × 128 trades, 15–22% of the paper profit); Jupiter adds 0.5% a side on coins under 24 h old. Jupiter stays as the fallback seller only.
- Same droplet as the tracker, **separate pm2 process** ("executor") with its own deploy step: tracker deploys never restart it; it keeps managing
  open positions and selling if the tracker is down; the wallet key lives only in this process. Moving it to its own droplet later is a config change.
- Before any money: droplet to SSH keys only + firewall; resize to 2 vCPU / 4 GB.
- One book live (Strict + hold-5 if both pass their 40-trade bars, else Project 5 + runner). Size ladder: 0.1 SOL plumbing week → 0.25 → 0.5 → 1,
  each step after 40 fills with the live-vs-paper gap under ~2% a trade. Pot at 0.5: ~5 SOL (4-position cap 2 + bad-day reserve 2.5 + fees 0.3).
- Safety: 4 open positions max, daily stop at −6 stakes, no buys when feed lag > 2 s or the restart alarm is on, Telegram `/live off|on`,
  never part-buys (skips and tells), sweeps above a ceiling to a cold address daily, closes token accounts after selling (rent back).

## What is in the folder (v0.1.0, 18 Oct)
- `src/wallet.mjs` — `init` makes the key file (0600, in /root/executor, outside the repo) and prints the public address only; `address`, `balance`.
- `src/pump.mjs` / `src/amm.mjs` — pump.fun bonding curve and PumpSwap: account decoding, the IDL's own quote formula, buy / sell instructions built locally
  (classic `buy_exact_sol_in` / `sell`; the v3 WSOL-quoted pair as the automatic fallback; `buy_exact_quote_in` / `sell` on PumpSwap). PDAs verified
  against the known global / event-authority / AMM-config addresses.
- `src/rpc.mjs` — Helius RPC, blockhash cache, simulate, send through Helius Sender (Newark) with plain-RPC fallback, confirmation, fill read-back.
- `src/book.mjs` — its own SQLite (`/root/executor/executor.db`): every order (built → simulated → sent → confirmed / failed / skipped, with the reason) and every position.
- `src/index.mjs` — the bot: local socket from the tracker; buy flow (checks → venue → quote → build → simulate → [live: sign, Sender, confirm, retry once at a
  higher tip, read the real fill]); sell flow on the followed exit rule (`h5` or `flow4`) or the paper close, with retries at wider slippage; safety
  (4 open, daily stop, feed lag, trigger age, balance, 7-min fallback sell, tracker-down sell, `/live` commands); `status.json` every 10 s; `selftest <mint>`.
- `ecosystem.config.cjs` — pm2 app `executor`; `scripts/deploy-step.sh` installs / checks / smoke-boots / reloads it only when this folder changes.
- Tracker side (`src/execlink.js` + three hook lines in `copytrade.js`, one in `commands.js`): P5-family entries → `trigger`; hold-5 / runner firing → `exit`;
  paper close → `close`; `/live …` → `cmd`. Nothing in the tracker waits on the executor.

## Independent review, 18 Oct evening (12 findings, all fixed before any live trade)
Signature recorded before the first send and late-landing buys reconciled from the chain (never an unmanaged position) · exits that arrive during a
buy are acted on the moment it books · failed sells retried every 20 s until gone · every sell attempt's signature checked so an earlier landing is
booked at its real proceeds (no false "lost" + false daily stop) · position cap and same-coin guard reserved before any await (no burst over-buy) ·
PumpSwap virtual-quote i128 read fixed (+ a zero-minimum guard on every buy) · one sell at a time per position · v3 buyback recipient zero-key
check · u64 encoding BigInt-safe · tracker pings carry the feed's last trade time, a silent feed counts as tracker-down, restored P5 positions keep
forwarding exits · `/live on` really re-arms the daily stop · fill read-back retried.

## First shadow hour (18 Oct 17:30–18:40 UTC) — what the chain taught us, fixed in v0.1.1
- At $103 a SOL the bonding curve fills at ≈ $40K market cap — exactly where Project 5 buys — so the trigger often lands in the seconds between the
  curve completing and pump.fun creating the PumpSwap pool ("curve complete, pool not found" × 4, incl. Zcash ATM). The executor now waits up to
  6 s for the pool, then asks DexScreener for the pair address, then gives up with "migration pending".
- PumpSwap's classic `buy_exact_quote_in` is refused with error 6062 *InvalidPoolV2* (a `pool_v2` remaining account the IDL does not document),
  and our build of the IDL's v2 pair fails 6027 (an account out of place). Settled by reading other bots' transactions off the chain
  (`node src/probe.mjs <mint> 30`, 18 Oct 19:00 UTC): every live bot still sends the classic instruction, with three accounts appended —
  PDA("pool-v2", mint) under the AMM program, one of the eight buyback recipients (chosen at random), and that recipient's WSOL account.
  v0.1.2 sends exactly that (26 accounts on a buy, 24 on a sell), picks the protocol-fee recipient at random too (spreads the write locks the
  way the other bots do), and keeps the IDL v2 form as the one-shot fallback. The same probe confirmed new pump coins are Token-2022 mints,
  which the venue lookup already detects from the mint's owner.
- Both pump programs keep a per-wallet "user volume accumulator"; a fresh wallet has none (3012 *AccountNotInitialized*). The first buy on each
  program now carries the one-off create instruction in front of it; after that it is remembered.
- The feed-lag guard tripped on a healthy feed ("feed 2–5 s behind the chain"): block timestamps run seconds behind the wall clock, so the
  reading is a trend, not a delay. It is now recorded only; the executor-side trigger-age check (4 s) is the real guard.
- Triggers reach the executor 40–110 ms after the tracker sees them; the website's P5 filters skipped bundled / crowded / unseen coins exactly as the paper book does.

## Shadow mode needs a funded wallet
A buy can only be simulated against the chain with a payer that holds the stake, so shadow mode simulates with the real bot wallet: ~0.2 SOL in it
is enough at a 0.1 stake. Nothing is signed in shadow mode. Shadow sells are quoted from the curve at the moment the exit fires (a sell cannot be
simulated without holding the tokens) — the real sell path is proven live at 0.1 SOL.

## Build order
1. **Measurements (v0.18.89, in the tracker):** `paper_trades.first_secs` on every P5-family entry — `lag` = our feed's delay behind the chain at the
   trigger (block time is whole seconds, so ±0.5 s per trade; average over many), `open` = ms from seeing the trigger to the paper entry
   (name / age lookups — a live buy must not wait for these), `t1/t2/t5/t10` = the price seen 1 / 2 / 5 / 10 s after the trigger with the actual
   delay `d` → "what does one second cost" from facts.
2. **Shadow mode:** receives every P5 trigger over a Unix socket, builds the real pump.fun buy (and the sell at the paper exit, incl. the
   bonding-curve → PumpSwap switch), simulates against the chain, logs would-be fill / tip / landed — no key, no wallet. Shadow book beside the paper book.
3. **Safety + accounting:** the list above, fee/tip accounting per trade, live-vs-paper gap per trade.
4. **Go-live:** wallet made on the box with one command (key never printed or shared), 1 SOL, 0.1 a trade for the plumbing week, then the ladder.
5. **Live page:** bought / sold / fees / net next to the paper twin.

## Transaction path
pump.fun `buy` / `sell` built locally from the curve state our feed already tracks (PumpSwap `buy` / `sell` after migration), compute-unit price +
tip, sent through Helius Sender (regional endpoint, every landing route at once; free, tip ≥ 0.001 SOL for the full route) with one retry at a
higher tip; fill confirmed by seeing our own swap in the feed. Slippage: 20% on buys (tight slippage misses the fastest coins — the winners),
30% on stop sells (not selling is worse than a bad price). Jupiter only when the venue is unknown.
