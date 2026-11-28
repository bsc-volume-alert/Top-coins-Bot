# FAST-1M / FAST-3M / FAST-5M (older-11, run valid11)

Rule: a coin already on its pump.fun pool, $40K–$1M, whose pool price crosses 2x its lowest price of the last 1 / 3 / 5 minutes. Bought 1 s later, 0.2 SOL paper, the selected trailing stop, 24 h max. The GMGN gate is a label only (every one of the 58 buys "failed" it).

## 28 Nov 12:55 UK — full study on the owner's request ("all the data together… successes, failures… how we can make it profitable")
Data: published entries to 11:59 UK 28 Nov. 58 filled FAST buys, 25 Nov 14:09 → 28 Nov 09:39 (one buy can sit in several FAST books). Tools: scratchpad fast.py, fast2.py.

**Results (0.2 SOL each)**
| book | buys | 20% stop | 25% | 40% | half at 2x + 40% | won (20%) | without top 3 (20%) |
|---|---|---|---|---|---|---|---|
| FAST-1M | 22 | −0.465 | −0.624 | −1.126 | −0.979 | 6 | −0.758 |
| FAST-3M | 32 | −0.426 | −0.380 | −1.004 | −0.777 | 10 | −0.802 |
| FAST-5M | 35 | −0.646 | −0.677 | −1.041 | −0.941 | 10 | −0.976 |
| all FAST buys once | 58 | −0.958 | −0.822 | −1.604 | −1.298 | 17 | −1.334 |
Negative in both halves (−0.553 / −0.405). Wider stops are worse. "From the buy price" stops: 0 winners.

**The "it went 2–3x after we bought" trap.** The recorded high (max) is the 24-hour high, mostly reached AFTER the stop had sold: 25 of 58 later reached 1.5x and 12 reached 2x, but while the 20%-stop position was still held only about 8 reached 1.5x and 2 reached 2x (lower bound: sale ÷ 0.8). A take-profit at 1.15x–2x on top of the 20% stop gives −0.84 to −1.30 SOL — no better. Selling earlier does not fix it; the doubles mostly reverse straight away.

**Every recorded figure split in thirds (20% stop)** — cap, liquidity ÷ cap, holders, 1-h volume ÷ cap, net buyers, 5-min buyers, holder change, top 10, bundlers, snipers, fees, bot share, fresh wallets, ATH ÷ cap, seconds to double, number of FAST books fired, Twitter, age group, first vs repeat buy of a coin: **every bucket with more than 6 buys is negative.** The least bad middles: fees 9–36 SOL (16 buys, −0.054), fresh wallets middle (−0.019), top 10 21.7–29.6% (−0.247).

**Best two-figure filter found:** top 10 16–30% AND fees under 36 SOL → 23 buys, +0.157 SOL, 12 won — but by halves +0.178 then −0.021: it does not hold. top 10 16–30% AND ATH ÷ cap < 2.07 → 26 buys, −0.006. These are back-tests on the same 58 buys (LESSONS: "before" figures flatter).

**Winners** (20%): S5eZMs +73% ($252K, 1,210 holders, no Twitter), BuNeEr +62% (top10 33%, bundlers 0.5%), 2VeUSg +53% (an operator coin: bundlers/snipers/phishing 87–88%), itsmekwek +42%, 6W3H5n +39% (two books), 8sAxws +31% ($929K), SCAMSEM 1M +26%. **Biggest losers:** CfMsRJ −68% (no pool liquidity, 64 holders), 55Vr2V −51% (ATH 41x the cap — a dead coin bouncing), 4tqzkS −51%, 8sAxws (second buy) −40%, NBA −30% (later ran to 3.9x after the sale).

**Conclusion (facts):** over 3 days the FAST books lose on every stop, in both halves, and no recorded figure or simple pair of figures separates the winners well enough to hold up. 58 buys is small. Options put to the owner (nothing built): (a) leave FAST running as it is and judge again at ~150 buys; (b) a paper comparison card "FAST top10 16–30% + fees < 36" made of the same buys (no new buys, costs nothing) to test that filter forward from now; (c) switch FAST off.
