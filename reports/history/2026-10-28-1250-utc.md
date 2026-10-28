# 4-hour study — 28 Oct 2026 12:50 UK

**The books have been off since 19:46 UK 23 Oct.** v0.18.185 (owner's go 19:44 UK 23 Oct, "stop the bots") set BOOKS_OFF — no paper book opens a position — and the same deploy stopped the executor (scripts/executor-off keeps it stopped). The data push itself is fine (`pushed_at` 2026-10-28T12:08:39Z, 30 minutes before this run; launches recorded to 11:05 UK 28 Oct, 46,341 in the file), so launches.csv is live and the trade files are frozen: the last paper trade of any kept book is Cashback Cat (AS) at 18:52 UK 23 Oct, the last executor leg MOOF (GR2 live) at 10:09 UK 23 Oct. Everything below is the close of the 23 Oct record, 07:09–19:46 UK — the 12½ hours after the last study's data — not a new period.

**Since last study (23 Oct 09:35 UK):** five days, no study ran in between (the task did not fire; the cause is not visible from here). Three things happened on 23 Oct, all before the stop: (1) the owner withdrew 0.8 SOL to his Phantom at 09:32 UK, the wallet fell to 0.03 SOL, and from 10:21 UK every shadow quote failed simulation ('Transfer: insufficient lamports') — 53 shadow legs lost to 19:46 UK (AS 16, BL 29, GR 8), GR2's live stake fell to 0.02 for its last two legs; (2) GR2 live bought og kimchi 36% above paper and its on-chain local stop sold the coin at 0.73x before it ran to 20x (details under Costs); (3) the creator-wallet-age tell of 08:05 UK 23 Oct failed its first forward rows. From 24 Oct the owner's commits are coin scope (0.3 → 0.8) and the radar (0.1 → 0.4, one website), not the books; no book file or report changed between 23 Oct 09:35 UK and this run.

## The kept books

Scoring is numbers.py's (real costs, operator coins out, price-glitch rows out, lateFix on curve books and GR's `grf` rows). Forward = trades since the book's change, to 19:46 UK 23 Oct. "New" = the rows after the last study's data (07:09 UK 23 Oct).

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 108 (+18) | **+1.6%** (no-best −1.0%; thirds +13 / −6 / −2); the 18 new −9.7% (no-top3 −23.4%) | −3.3% | 53% | 37% | `asoc` shadow 62 legs +0.384 SOL; the 2 new within 2 points of paper; 16 legs lost to the empty wallet | 120 forward NOT reached (108); frozen |
| AS2 | 21 Oct 01:30 UK | 76 (+16) | −3.1%; the 16 new −8.9% | −7.5% | 51% | 42% | — | drop (repeated) |
| AS3 | 21 Oct 01:30 UK | 56 (+11) | +4.1% (thirds +3 / 0 / +10); the 11 new +1.4% (no-top3 −20.3%) | −1.4% | 59% | 36% | — | 56 of 60; frozen |
| AS4 | 21 Oct 14:45 UK | 10 (+4) | −24.2% (3 won, 6 stopped) | −46.7% | 30% | 60% | — | 10 of 30; negative in every third |
| **GR** | 21 Oct 09:47 UK | 154 (+31) | **+3.6%** (no-best +2.4%; thirds +2 / +11 / −2); the 31 new +2.3% (no-top3 −6.5%). Bundle 96 at +11.3% (no-top3 +5.7%) vs other 58 at −9.1% (every third negative) | 0.0% | 53% | 20% | `grad` shadow 65 legs +0.211 SOL; the 5 new −9 points under the model (entry gap +10–35% on bundle-launch pools); 8 legs lost to the empty wallet | whole book: NO (unchanged); bundle split holds on 154 |
| GR2 | 21 Oct 17:00 UK | 86 paper (+22) | +80.4% on the trail (no-best +68.0%; median −17.6%; thirds +110 / +108 / +24); the 22 new +36.7% but **−11.7% without og kimchi** (+1054%) | +44.6% | 42% | 31% | **live 19 legs +0.390 SOL** (5 new −0.345, 0 won); without kimchisol −0.72 SOL; by stake: 0.1 × 10 +1.054, 0.25 × 7 −0.645, 0.02 × 2 −0.019 | 20-live-leg read at 19; frozen |
| **BL** | 21 Oct 14:45 UK | 169 (+42) | **+37.2%** (no-best +29.4%; median −25.5%; thirds +61 / +44 / +8); the 42 new +16.3% but **−12.3% without og kimchi** (+1189%) | +14.7% | 33% | 40% | `bl` shadow 67 legs +1.047 SOL; the 6 new 12 points under the curve model; 29 legs lost to the empty wallet. Live 13 legs −0.516 SOL, 0 won (21–22 Oct) | 40 shadow legs: answered 23 Oct (quotes 10–20 pts under paper, live about half) — unchanged |
| K (revised) | 21 Oct 14:50 UK | 64 (+16) | **−19.7%** (thirds −38 / −3 / −18); the 16 new −21.1% | −24.9% | 23% | 73% | — | 40 reached 23 Oct: retire (stands) |
| S3 (revised) | 21 Oct 08:45 UK | 84 (+9) | **−21.9%** (thirds −28 / −14 / −24); the 9 new −34.3% | −23.1% | 19% | 37% | — | 40 reached 23 Oct: retire (stands) |
| S4 (revised) | 21 Oct 10:28 UK | 13 (+3) | −8.6% (JETPUMPX +103% is the whole move from −15.8%) | −24.4% | 31% | 31% | — | 13 of 60; frozen |

Counts as before (23 Oct 09:35 UK): GR = grf rows under 156 buyers, 10–185 s, x_h3; GR2 = the same rows with a 70–80% bundle over 4–10 wallets, x_tsl40; BL = sn8 rows with that bundle and entry MC ≥ $25K, x_tsl40 at curve costs; K = under 912 buyers and MC ≥ $36K, x_t2s40; S3 = sn3b copies of $1M+ coins, creator under 20 launches in 24 h, ≥ 1 s old; S4 = socials + first-time creator + original name. This run's match reproduces the 23 Oct counts to within one row on every book.

No checkpoint was reached this run, and none can be reached while BOOKS_OFF stands: AS is 12 trades short of 120, AS3 4 short of 60, AS4 20 short of 30, GR2 one live leg short of 20, S4 47 short of 60.

## Successes and failures this period

The period (07:09–19:46 UK 23 Oct) was one launch wave: 25 of BL's 42 new names contain "kimchi" or follow og kimchi's launch (bundle 72–75% over 4–9 wallets, 62–68 SOL, creator wallets 0–3 h old).

**AS (18):** won 7, avg +37% — The Skinwalker +106% (peak 4.5x, held on the runner), The Alpha Wolf +43%, MINDLOT +29%, Cashback Cat +25%, The Skinwalker II +16%, ACT:IV +14%; stopped 7 at −51 to −54% (just token, X Meme War, pastalana, JEWCHAIN, Little Wanderer, Rizz Dance; peaks 1.03–1.49x, never got going); faded 4. Won vs stopped at entry: MC $47K vs $44K, 1-s price 1.04x vs 1.00x — nothing separates them, as at every reading since 21 Oct.

**GR 3-min (31):** won 17 — 14 of them floor or 3-min sells at +12 to +25% on coins that then went to 3–20x (og kimchi 20.6x sold for +20%, Aura Second Boss 9.0x for +54%, SUNDAZE 4.7x for +17%, PULPUL 3.8x for +19%, Kimchi Un 3.2x for +20%), Halloween Dope +133% and poor aura +67% held to time; stopped 6 (Alpenglow Pepe, Ducky Doo, CyberClaudia, BACKROOMS, JEWCOIN, DeadWeb — one-tick dumps through 0.6x inside 60 s); small losers 8 (10-second rule and low-volume closes at 0.76–0.95x). On bundle coins the 3-min pays the floor and gives up the runners; on the other 9 graduations −5.4% (no-top3 −25.7%).

**GR2 (22):** won 7 — og kimchi +1054% (trail took it at 11.5x), SUNDAZE +106%, Halloween Dope +56%, PULPUL +47%, Aura Second Boss +26% (peak 9.0x, shaken out at 1.3x), Just a kimchi guy +18%, Kimchi Un +16%; stopped 10 at −35 to −65% (peaks 1.1–2.0x: the bundle sold into the first pool buyers); small losers 5 (spiked 1.6–2.8x, trail sold 0.75–0.95x). Winners and losers carry the same signature (74.3% / 4–6 wallets / 67.5 SOL on both sides).

**BL (42):** won 14, avg +158% — og kimchi +1189% (22.6x), SUNDAZE +176%, Halloween Dope +145%, מטבע יהודי +128%, PULPUL +100%, kimchiwifmask +95%, Aura Second Boss +87% (peak 13.1x, trail took 1.9x), Kimchi Troll +84% …; 12 of the 14 graduated. Stopped 19, avg −75% (Kimchihouse −93%, kimchi wif champagne −90%, Kimchiump, Punchi, Kimchi Neegy −89% …; peaks 1.01–1.27x, the one-transaction dump 40–60 s in); small losers 9. Graduated 22 at +74% (no-top3 −9%) vs not graduated 20 at −66% (0 won): the graduation is still the only separator, and it comes after the buy.

**K (16):** 3 won at the 2x sale (+87%: The Playful Polar Bear, Simon Bunnett, BRAIN'T), 1 small win, 12 stopped at −51 to −65% (median peak 1.25x). **S3 (9):** 1 won (+9%), 5 stopped, 3 faded; 5 of the 9 are Rewards Rabbit bought five times in three minutes at $2–7K. **S4 (3):** JETPUMPX +103%, two losers.

## Costs — does the model still match the legs?

18 legs in the period (06:18–10:09 UK 23 Oct), then nothing — the wallet was emptied at 09:32 UK and the executor stopped at 19:46 UK.

- `asoc` (AS, shadow 0.1): 2 legs, real +5 points above the PumpSwap model; entry +1.7–3.5%. Matches (62 legs +3 points overall).
- `grad` (GR, shadow 0.1): 5 legs, real −32% vs model −23% on the same paper multiples (−9 points). The gap is the entry: +9.7%, +11.1% and +34.6% on Alpenglow Pepe, Ducky Doo and og kimchi — fresh bundle-launch pools, the known GR entry gap, at its widest yet.
- `bl` (BL, shadow 0.05): 6 legs, real +164% vs the curve model's +176% (−12 points), in line with the −14.5 of 23 Oct 09:35 UK. og kimchi's quote 12.44x against paper 13.33x; Alpenglow Pepe's trail quote 0.329x against paper 0.705x — the one-transaction dump again. The LESSONS rule (take a bundle-launch trail quote as paper minus 10–20 points) stands.
- `gr2` (live): 5 legs −0.345 SOL, 0 won; real −42% vs model −52% on the same paper multiples — the sells landed at or above the paper price (Ducky Doo 0.742x vs 0.596x, og kimchi 0.734x vs 0.597x, Skratch 0.884x vs 0.810x), MOOF under (0.287x vs 0.560x, sell error 6004 then a fill after the dump). Entries +13%, +13%, +36%, +26%, +20% above paper at 0.25 / 0.02.

**The og kimchi event (07:57 UK 23 Oct) is not a cost-model matter but it is the most expensive thing in the executor record.** The live buy filled 36% above paper (fs1_x 1.50: the pool's first real price was already 1.5x the graduation price). The on-chain local stop measures its 40% from the real entry, so it fired at 0.597x of the real price — about 0.81x of the paper entry — after 91 s, where the paper trail (40% off its own peak) never fired; the coin then ran to 20.6x and paper made +1054%, about +2.6 SOL at 0.25. Real: −0.067 SOL. The same mechanism sold Ducky Doo and Skratch above paper (harmless); on og kimchi it sold the one coin the book exists for. Dated line added to LESSONS; the fix (stop from the paper price, or widened by the entry gap) is a code question for the owner before any GR2 live restart.

## Anything new (luck-checked)

Nothing new proposed. Two things were tested out of sample and failed:
- **Creator-wallet age ≥ 3 h (GR.md 08:05 UK 23 Oct; back-test GR2 14 rows +369%, BL 25 rows +209%) — fails forward.** GR2: 7 rows at −29% (1 won) vs under 3 h 15 at +67% (−3% without og kimchi). BL: 12 at −17% (3 won) vs 30 at +29%. GR bundle 3-min: 7 at +1% vs 15 at +7%. The back-test was one operator's run on 22 Oct; the forward rows are a different operator's wave. Recorded in GR.md and LESSONS; not a rule.
- **Strategy register (reports/strategies.json), 20 rules, scored only on rows after each rule's `after_ts`:** F16 (E's trigger, original-ish name, split exit) is +18.2% on 82 (no-top3 +8.4%, label-shuffle 27/2000) but thirds −4 / +61 / −1 and −1.8% on its 19 newest rows — the middle third is the 22 Oct bundle-coin runners (Capy Glow, Duck Duck Pepe, LastCall, Waddles, all capped at 4x by the split exit); fails the three-period test: cannot be told from luck, and it is the bundle-launch coin type again, not a new edge. F5 and F6 priced at their 5-s / 10-s fill: −5.8% on 241 and −4.7% on 178. F9 +5.9% on 123 (no-best +3.7%), F10 +1.5% on 123; S1–S3, F1, S4, F4, F7, F8, F11–F15 all negative out of sample. No rule edited, none added.
- The three-period test also fails the period itself: GR2's and BL's 23 Oct rows are one coin (og kimchi) and otherwise negative; their forward thirds (+110 / +108 / +24 and +61 / +44 / +8) are positive but falling, and the paper trail figures remain unobtainable on real money (13 live BL legs, 0 won; GR2 live −0.72 SOL without kimchisol).

## What I would do now

The books are off, so nothing is being tested and no checkpoint can move; this is a status report, not a trading recommendation. If the owner wants the record to continue:

1. **Restart paper and shadow only, with SOL in the executor wallet for simulation.** Every shadow quote fails below about 0.3 SOL (0.1 `asoc` + 0.1 `grad` + 0.05 `bl` quotes in flight at once); 53 legs were lost on 23 Oct for that reason. Shadow signs nothing, but it needs the balance to simulate.
2. **Before any GR2 live restart, settle the local-stop question** (stop measured from the real entry, which is 10–36% above paper on fresh pools). Until it is settled, GR2 live is capped at exactly the trades it is for. Also still open from 23 Oct 08:05 UK: the 6005 buy-fail path (LIL WHEEZY and PULPUL lost their legs on 23 Oct) and the watcher after a curve buy.
3. **Stakes:** LESSONS says never to size off the last block. GR2 at 0.25 is −0.645 SOL on 7 legs, at 0.1 +1.054 on 10 (one leg). If it comes back live, 0.1 is the stake its own record supports, and only after item 2.
4. **Keep retired:** K (64 at −19.7%), S3 (84 at −21.9%), AS2 (76 at −3.1%). AS4 is 10 at −24.2% — not a book on any third so far. S4 at 13 is noise. AS stays paper/shadow (108 at +1.6%, fills proven, no edge since leg 30). GR's 3-min is a yardstick.
5. **What would change the picture:** a live trail or stop sell on a bundle-launch coin that fills near paper — none has in 32 live legs (BL 13, GR2 19) except the stops that fired above paper on the way down. The paper edge in GR2/BL is real on the coin type (bundle split 96 vs 58, luck-checked three times) and unproven on the exit; the exit is the whole question, and only live sells answer it.

Nothing here changes the bot; the owner decides.

## Next

- Whether BOOKS_OFF is lifted; if not, the next study will find the same rows and should say so in one line rather than re-score.
- If lifted: AS 120 forward (12 to go), AS3 60 (4), AS4 30 (20), GR2 20th live leg, BL/GR2 live sells vs paper leg by leg.
- The radar (0.4.0) and coin scope (0.8.0) are recording to their own branches (radar-data, scope-data); they are not books and not scored here until the owner says what a radar paper buy is judged on.
- launches.csv is live: the bundle-launch factory's signatures since 24 Oct could be counted (launches a day, graduation rate) without any book running, if the owner wants to know whether the coin type is still being made.
