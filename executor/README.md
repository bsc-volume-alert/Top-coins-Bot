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
