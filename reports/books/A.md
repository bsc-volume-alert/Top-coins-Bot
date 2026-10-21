# A — P5 momentum: 30 SOL bought in 60 s, MC under $100K, runner exit
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `p5e30` (tracker strategy), page letter A, executor book `runner` (exit `flow4`). On the page (first box in the order list). Executor book `runner` is OFF (paper) since about 16:00 UK 19 Oct; the paper book keeps recording.
- Entry (src/momentum.js `p5Check`, v0.18.50 / v0.18.58 / v0.18.94): on any coin the feed sees, 30 SOL or more of buying inside the last 60 s, market cap under $100K (`P5E_MAX_MC`), coin at least 60 s old, buy $ ≥ sell $ in those 60 s and at least 10 distinct buyers; first time per coin. The page's "pass" (and the executor) then skips: launch not seen (no bundle record), bundled 70%+ of supply in the launch block, 150+ distinct wallets in the 60 s, not SOL-paired (pool quoted in another token). From 20 Oct 19:15 UK (v0.18.164) the 10-wallet operator's fingerprint coins (bundle_wallets = 10, bundle_pct 37–41, bundle_sol 22–28, dev_buy < 0.2) are never sent to the executor and are left out of A's page record, past and future (see LESSONS.md).
- Exit `x_flow4` (the "runner"): −40% stop until the coin reaches 1.5x; after 1.5x hold while the 5-min volume stays ≥ $100K and buys ≥ sells (20 s grace after arming); sell on a 50% fall from the peak; voluntary sale at 4x (cap). The paper position itself can also close on the "golden rule" (5-min volume under $25K → `lowvol`) or an 80% trail (`tsl80`). Sub-reasons recorded: stop / fade-volume / fade-sellers / trail / cap.
- Started: the P5 idea 16 Oct 22:33 UK (v0.18.35); this trigger 17 Oct 02:34 UK (v0.18.50); the page record starts at the price fix, 18 Oct 20:25 UK (v0.18.96 / v0.18.112). Headline exit runner since 19 Oct 02:04 UK (v0.18.103). Last rule change: 20 Oct 19:15 UK (v0.18.164, operator coins excluded). Real-cost model on the page (v0.18.142/146): PumpSwap x/1.02 × 0.967 − 0.016, stops (x ≤ 0.62) −0.05 more, plus 0.001 SOL a trade.
- A's filtered children (other notes files): **AS** (A + socials + creator not sold out + biggest buyer 3–5 SOL), **H** (A with GMGN top-10 holders < 23%), **A5** (A's coin re-bought 5 s later if ≥ 1.02x), **F6** (10 s later if ≥ 1.05x); D's children **DS**, **DC** come from D (D.md). Books in this set of notes built on A's trigger: **B** (A's coins sold at 5 min), **F** (A with bundle ≤ 3 wallets), **G** (A's trigger on the 150–500-wallet skips), **A2** (A with a 60-s cut).

## Verdict now
Not working as a stand-alone book: about break-even to slightly negative at real costs on 300+ trades (−2.4% on 284 at the 17:40 UK study; −2.7% on 324 at 23:27 UK; −3.2% on 336 at 00:09 UK 21 Oct), and its only real-money run lost (38 live legs −0.376 SOL). The value left in A is as the parent trigger: its filtered child AS has been positive in sample and on its first forward trades.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 00:59 UK; A's passed rows, runner exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:25 UK) | 330 | -3.7% | -4.6% | 47% | 40% | -1.56 |
| last 24 h | 145 | -3.3% | -4.3% | 48% | 35% | -0.63 |
| last 12 h | 83 | +0.4% | -1.2% | 52% | 35% | -0.05 |
| last 6 h | 46 | -2.5% | -5.5% | 46% | 46% | -0.16 |

Executor book `runner` (live, real quotes and real money): 38 legs, -0.376 SOL, average -9.6% a leg, without best -12.8%, won 45%, 19 Oct 02:19 UK to 19 Oct 10:50 UK.
Executor book `runner` (shadow, real quotes): 31 legs, -0.625 SOL, average -4.7% a leg, without best -9.0%, won 39%, 19 Oct 11:14 UK to 19 Oct 15:59 UK.
<!-- /NUMBERS -->

## Change history
- 16 Oct 22:33 UK (v0.18.35): Project 5 created — $100K traded inside 2 minutes, coin ≥ 60 s old, buys ≥ sells, no MC cap, exits 1.5x/−40% and ½ at 2x + 40% trail (strategy `mom2m`). Pre-registered.
- 16 Oct 22:39 UK (v0.18.36): every open paper position sold when 5-min volume < $25K (the "golden rule", from 22:53 UK); P5 capped at $2M MC.
- 17 Oct 02:34 UK (v0.18.50): Project 5 "early" — buy at 30 / 50 / 80 SOL bought in 60 s (strategies p5e30 / p5e50 / p5e80), MC < $100K, ≥ 60 s old, buys ≥ sells, ≥ 10 buyers; old P5 retired. Reason (code comment): on 105 past core pumps the move was visible ~2.5 min before the $100K/5-min trigger, when ~50 SOL had been bought within 60 s (usually just after graduation, MC ~$25–45K); recorded on every coin to count the false starts.
- 17 Oct 12:07 UK (v0.18.58): P5 v2 — the 30-SOL level, skipping bundled (70%+) / launch-not-seen / 150+-wallet bursts; fresh book.
- 17 Oct 19:05 UK (v0.18.64): P5 v3 — runner exit on the v2 coins, fresh book, pre-registered test.
- 18 Oct 01:10 UK (v0.18.81): deviations added — Hold-5 exit (B), Wide $100K–250K (C), Strict 50 SOL (D); after-entry marks to 30 min.
- 18 Oct 07:14 UK (v0.18.85): P5 "clean line" restarted after a crash loop corrupted the night's data (v0.18.83 hotfix).
- 18 Oct 13:29 UK (v0.18.87): "P5 — sell rules compared" box; new recorded exits x_h15 and x_h5fast.
- 18 Oct 19:53 UK (v0.18.93): headline exit switched to hold-5 (pre-registered test passed); runner became the challenger.
- 18 Oct 20:04 UK (v0.18.94): SOL-paired coins only (the live wallet cannot do two-hop swaps); non-SOL pools counted on their own line.
- 18 Oct 20:18–20:25 UK (v0.18.95 / v0.18.96): PumpSwap price taken from the swap's own amounts (pool balances missed the virtual quote reserve; pool-stage prices had run 25–80% low). Every P5 book restarts at 20:25 UK — the "price fix". Everything earlier is distorted.
- 19 Oct 00:34 UK: executor goes live on hold-5 (B) at 0.1 SOL (owner, 00:29 UK). See B.md.
- 19 Oct 02:04 UK (v0.18.103): headline exit back to the runner — on corrected prices it passed the pre-registered test against hold-5 on the same 44 trades (+0.22 vs −0.12 at the page stake), ahead in both halves.
- 19 Oct 02:16 UK (executor v0.2.0): runner and hold-5 books live side by side on the same coins; A's runner leg live from 02:19 UK at 0.1 SOL (owner, ~02:00 UK).
- 19 Oct 03:21 UK (executor v0.3.0 / v0.18.108): four books Runner/Hold-5/Wide/Strict; live-vs-paper on the same trades.
- 19 Oct 09:55 UK (v0.18.110): letters A/B/C/D everywhere (owner: one name per book).
- 19 Oct 10:04 UK (v0.18.111 / executor v0.3.3): a mode per book (off/shadow/live). A's last live leg opened 10:50 UK; A in shadow at 0.1 from 11:14 UK. Reason for leaving live: not recorded in the surviving notes; at that point the 88 live A+B legs were −0.677 SOL and the 13:28 study then said there was no basis for live SOL. The executor's daily stop (6 stakes net lost) blocked 8 live buys during the live run.
- 19 Oct 10:18 / 11:18 / 12:07 UK (v0.18.113 / 115 / 118): the A–D data set (abcd.csv) with before/after trace, per-minute pre-trigger flows, 5-s price path, pool depth, heat, creator and copycat context ("leave no stone unturned").
- 19 Oct ~14:15 UK: shadow stake raised from 0.1 to 0.25 SOL (A's shadow legs at 0.25 from 14:17 UK). Who/why not recorded.
- 19 Oct between 15:59 and 17:08 UK: executor book `runner` switched OFF (paper) by hand — last shadow leg 15:59 UK; the 17:41 study found A–D off at the 17:08 push. No reason recorded.
- 19 Oct 19:39 UK (v0.18.141): bundle_wallets now read on A's trigger (the F book bug); no effect on A itself.
- 19 Oct 20:01 UK (v0.18.142): page paper priced at measured real costs; A5 and A2 created from A (owner, 19:56 UK).
- 19 Oct 21:50 UK (v0.18.146): real-cost model takes the fixed 0.001 SOL a trade (stake-aware); F6 created from A.
- 20 Oct 05:19 UK (v0.18.148): page trimmed to the books "still worth watching" (owner, 05:00 UK: "remove what isn't working, add what has potential") — A kept on the page.
- 20 Oct 16:19 UK (v0.18.156): socials fetched for every launch at creation (before, only for coins another book touched); AS created as A skipping no-socials coins.
- 20 Oct 16:25–19:05 UK: hold-exit save bug (v0.18.155 → fixed v0.18.163): x_h5, x_h5f12, x_h5f14, x_h3, x_h15, x_h5fast not saved on A rows in that window. x_flow4 (A's own exit) not affected.
- 20 Oct 17:29 UK (v0.18.158): AS becomes A + the owner's standard filter set (see Ideas tested).
- 20 Oct 17:36 / 19:25 UK (v0.18.159 / 168): 6-hour and 12-hour figures; one combined 12-h strip ranked by return per trade.
- 20 Oct 19:15 UK (v0.18.164): operator fingerprint coins skipped by every book except S10 and removed from A's page record. A and D had bought 20 / 19 of them at −11% a trade (24 h: median MC $218K at 60 s → $4K at 1 h).
- 20 Oct 19:51 UK (v0.18.171): H created from A (GMGN top-10 < 23%).

## Ideas tested
All figures at real costs unless marked "paper"; "OOS" = out of sample (trades after the rule was written down). Study rule ids (S1–S3, F1–F15) are the 4-hourly study's register, not sniper books.

Exits on A's coins
- Runner vs hold-5 on corrected prices — 19 Oct 02:04 UK, pre-registered, 44 trades: runner +0.22 vs hold-5 −0.12 (page stake), both halves → runner kept as headline.
- Sell at 5 min (B): worse than the runner in every study (e.g. 13:28 UK 19 Oct paper −4.9% vs +0.1% on 100; 17:40 UK 20 Oct −4.8% vs −2.4% on 284). Kept only as book B, off page. See B.md.
- Sell at 3 min (study rule S1, registered 19 Oct 10:30 UK from 84 post-fix trades: +10.1% vs +5.0%): OOS −8.9% (37) → −8.1% (61) → −8.3% (103) → −7.7% (130) → −8.2% (149) → −7.0% (168) → −6.4% (193), identical to the baseline each time → does not hold up.
- Sell at 15 min, 5 min with a 1.4x floor (x_h5f14), 1.5x/−40%, 2x/−40%, ½ at 2x + 40% trail, split, 40% trail: all at or below the runner on 100 and 128 trades (13:28 / 17:41 UK 19 Oct tables); realistic path-priced exits (the 5-s path 10 s after each rule fired) put the runner at +0.3% on 21 traced fires vs 5-min −12.1% and 3-min −6.5% (17:41 UK). Dropped.
- A2 = sell at 60 s if below 0.95x, else runner (owner, 19 Oct 19:56 UK): behind A in every study, −8.0% vs A −3.3% on 137 (17:40 UK 20 Oct). See A2.md.
- On AS's coins (A's filtered child), 20 Oct 23:27 UK: the runner was the best of 11 exits; early cuts on the 2/5/10/30/60-s price (sell if below 0.90/0.95/1.00) all lowered the result (+7.3% to +13.7% vs +14.1%); keeping a 25%/50% moonbag on a 40% trail lowered it (+11.8% / +9.6%); 5-min sale −0.7%. As many winners as losers were below 1.0 at 10 s (14 each). Dropped.

The website's four skips (judged on A's skipped coins)
- 13:28 UK 19 Oct: bundled 70%+ right to skip (n22 −21.5%); launch not seen right (n41 −9.2%); not SOL-paired did as well as passed coins (n47 +0.1%) but cannot be traded; 150+ wallets wrong on that sample (n26: runner +5.3%, 5-min +35.9%, 1.5x/−40% +13.2%). 17:41 UK: same verdicts (bundled n28 −21.8%; not seen n44 −11.4%; 150+ wallets n36 runner −1.4% but 5-min +20.5%). The 150+-wallet reversal became book G and study rule F4 — failed (−17.7% on 71 OOS). Skips kept as they are.

Wallet counts / trade counts in the trigger minute
- wal60 ≤ 65 (study rule S2, 19 Oct 10:30 UK, from 49 live coins: 72% win vs 38%): 13:28 already faded (62% vs 48%); OOS −18.3% (16) → −11.3% (24) → −0.5% (47) → −3.1% (60) → −2.6% (73) → −3.7% (81) → −1.2% (95) vs −6.2% rest. A few points better than the rest of A, never positive → does not hold up.
- n60 ≤ 57 buys (study rule F9, 20 Oct 01:45 UK, in sample +12.5% on 50, threshold a cliff): OOS −9.7% (6) → −7.7% (15) → −12.0% (21) → −5.1% (29) → failing.
- avg_buy_sol > 0.58 (F9's family, 05:35 UK): not registered. avg_buy_sol ≤ 0.40 on A: −6.3% on 93 (the D rule F12 does not transfer).

Whale share / biggest buyer
- max_share > 0.10 (study rule S3, the owner's, 19 Oct 10:30 UK, from 49 live coins: 75% win vs 36%): in sample 13:28 +11.5% (53) vs −12.9%; OOS −3.2% (3) → −12.7% (18) → −4.7% (31) → −1.1% (52) → −5.6% (60) → −6.9% (69) → −7.5% (81) → −4.0% (97) vs −3.5% rest → does not hold up.
- max_share ≤ 0.11 (the opposite direction, D's F11): on A negative at every threshold (−5.5% on 124, 05:35 UK). The "11% whale-share" skip was put into DS at 16:19 UK 20 Oct and dropped at 17:29 UK (owner: a conviction buyer split over several wallets defeats it).
- Biggest buyer's size in SOL (max_share × sol60), 20 Oct afternoon: 10+ SOL −18% on A and D; under 3 SOL −11% on A → the 3–5 SOL band became part of AS's standard set. On AS's rejects, all time to 23:27 UK: biggest buyer ≥ 5 SOL −7.7% (55), < 3 SOL −6.3% (76).
- Biggest buyer in profit on GMGN over 7 days (gw_big_realized > 0): −14.7% on 13 (17:41 UK) — the wrong sign for "follow the smart buyer"; biggest buyer's wallet under a week old −38.1% on 6. Too few; not pursued.

Launch bundle
- bundle_wallets ≤ 3 (study rule F1 = book F, 19 Oct 12:45Z): in sample +18.4% on 33, 85% win, held at the 5-s price (+13.9%); OOS −10.1% (9) → −16.5% (18) → −16.9% (30) → −17.5% (39, "does not hold up") → −15.0% (45) → −13.4% (50) → −10.2% (64) vs 0.0% rest of A. Shadow legs −1.097 SOL on 22. See F.md.
- bundle % < 28: 13:28 +10.0% (51) vs −10.3%; 17:41 +4.0% (67) vs −7.2%. Not registered (same family as F1).
- On AS rows (23:00 UK 20 Oct): bundle ≥ 16% kept +11.2% vs +9.8% dropped on the 69 earlier trades → coincidence.

Socials
- 13:28 UK 19 Oct: has socials +1.9% (72) vs −4.8% (28); 17:41 UK +2.3% (89) vs −9.7% (39).
- 20 Oct afternoon (before v0.18.156): A −20% on 49 without socials vs −0.3% on 187 with (D −21.5% on 36 vs +0.7% on 152, both halves) → "skip a coin KNOWN to have no socials" became AS (unknown kept). On AS's rejects, all time: no socials −13.3% (59); but since 17:45 UK 20 Oct the no-socials rejects made +16.3% (7) and in the last 12 h to 23:27 UK +5.7% (18) — the one AS rule that cost money that evening.
- Caveat: before 20 Oct 16:35 UK socials were fetched only for coins some book engaged with.

Creator (dev)
- Creator still holds at entry: 13:28 −9.4% (17) vs +2.0%; 17:41 −9.1% (27) vs +0.8%.
- dev_hold_entry median split (13:28): 0 → +9.5% vs −5.3%.
- Creator bought and sold out (dev_hold_entry = 0 with dev_buy > 0) → skip, part of AS's standard set (owner, 20 Oct 17:25 UK: "if the dev is out, we shouldn't be involved"). AS rejects for "dev sold out": −5.1% (56) all time, −16.5% (10) since 17:45 UK, −20.7% (13) in the 12 h to 23:27 UK.
- On AS rows (00:18 UK 21 Oct): creator's launch buy < 0.9 SOL +16.3% (37) vs +4.5% (32) on the 69 earlier trades, and 7 of 7 won since 17:45 → proposed as an AS variant line, awaiting go (see AS.md).
- Owner's CTO / "copy the dev" ideas (20 Oct ~17:05 UK): discussed, then dropped by the owner ("Forget that. Forget the CTO").

Early-second prices (confirmation)
- 13:28 UK 19 Oct: "price up at 5 s" split (+17.9% vs −15.7%) was mostly the paper entry being cheaper than the real one; re-priced at the 5-s price fs5 ≥ 1.0 +3.4% (47); fs5 ≥ 1.1 +18.1% (20, too few).
- fs5 ≥ 1.02 bought at the 5-s price (study rule F5 = book A5, the owner's, from the 19:48 UK 19 Oct analysis: +4.4% on 51): OOS +0.2% (19) → −1.8% (34) → −4.3% (43, "does not hold up") → −5.4% (54) → −4.0% (63). The gate does separate A's coins at A's trigger price (the fs5 < 1.02 half of A is −10% to −16% in every window) but a buyer pays ~7% more and loses it. See A5.md.
- fs10 ≥ 1.05 at the 10-s price (F6): in sample +8.3% on 56; OOS +1.1% (15) → +0.9% (23) → +1.0% (30) → +1.9% (34). About zero. See F6.md.
- 21:40 UK 19 Oct: 75 confirm-price rules (2/5/10-s price × 1.02–1.25 × 3 exits × 13 books); fs5 ≥ 1.05 +2.8% (43), ≥ 1.10 +12.0% (29) in sample; A5 rule with a 5-min exit −5.4% (61). Any rule that "knows" a later price and buys at the trigger price is an illusion.

The 60-s state and later entry
- 13:28 UK (one hot hour, 29 traced rows): buying at 60 s and selling at 5 min +34.8% vs +52% at the trigger. 17:41 UK (35 traced rows, 13:00–17:00 UK): buying at 60 s −23% (win 26%) → dropped.
- State at 60 s sorts the runner: up ≥ 5% → +19.4% (16); up ≥ 20% → +36.9% (9); below 0.95 → −38.9% (12, 1 of 12 won, 83% stopped) → became A2. More bought than sold by 60 s +11.7% (17) vs −25%. Pre-trigger buyers cashing out ≥ $2K by 60 s was not bad (+11.7%, 9). All look-ahead for an entry filter.

Trigger-minute size
- sold < 20 SOL in the trigger minute: +15.2% (18) at 13:28, +10.0% (20) at 17:41 — small; not registered. On AS rows: first-minute sellers < 22 SOL +38.2% (19) in sample; tonight it would have dropped all three winners (00:09 UK) — not adopted.
- ≥ 40 SOL in the trigger minute −7.6% (25), 13:28 UK. sol60 ≤ 30.9 (F8's logic on A's level) −8.3% on 71 (D's F8 does not transfer).
- 30 SOL crossed within 30 s of the window start −11.2% (9), 13:28 UK.

Market cap / pool depth / age / copycats
- entry_mc > $53K, sell at 3 min (study rule F10, 20 Oct 05:35 UK, in sample +9.3% on 58, one coin — French Piccolo — most of the mean): OOS −14.7% (4) → −5.0% (7) → +0.3% (14); the runner on the same rows +9.2% (60), +19.8% on 22 since 19 Oct 20:10 UK (09:35), +10.6% on 71 (17:40, halves +0.7% / +20.1%) — not registered. Waiting.
- entry_mc > $54K runner +8.8% on 49 (01:45 UK, overlaps F9). On AS rows entry MC ≥ $46K +26.8% (39) vs +1.4% (39) — proposed as an AS variant line; tonight it would have kept a loser and dropped a winner.
- pool_sol > 74 SOL (F15 family): on A +5.7% on 56 vs −4.3% rest (17:40 UK 20 Oct) — the only feature pointing the same way on A, D and 80. Pool ≥ 40 SOL −5.0% (30) on 17:41 UK 19 Oct. Not registered on A.
- Coin older than 30 min +5.5% (31) vs −2.4% (13:28). age_s median split +14.8% vs +2.3%. Not pursued.
- Copycat (same name in 24 h) −5.6% (27) vs −0.2% (17:41 UK). cc_best_mc24h > $19K on A +1.4% (79) vs −4.8% (13:35 UK; D's F13 does not transfer). On AS rows copycats ≤ 5 +21.9% (50) vs +0.2% (28) — proposed AS variant; copycats ≥ 2 reversed between windows → coincidence.

GMGN columns
- GMGN gi_/gs_ columns blank before 19 Oct 14:50 UK (read from the wrong column); gh_/sm_/gm_ filled slowly on A. Smart-money buy in the 5 min before: +3.2% (8). Top-10 holders < 23% (gh_top10) → book H (+10.6% on 145 across A, D, 80, second half +0.4%) — see H.md.
- Snipers ≥ 1 at launch (AS rows, 00:18 UK 21 Oct): +28.8% (17) vs +5.0% (52) on the 69 earlier trades → proposed AS variant line, awaiting go.

Time of day, clustering
- 13:28 UK 19 Oct: 18–24h UK best (+17.0% on 29); 17:41: 20:00–midnight UK positive in all four hours (n29), 14:00–16:00 worst. The third night (19 Oct 20:00–midnight UK) was −5.6% on 38 → dropped. Owner (19 Oct): does not accept that night vs day matters much; wants data over a longer period.
- After a loss +19.2% (45) vs after a win −0.6% (54); busy hours +12.1% vs quiet +1.4% (13:28) — clustering artefact; the hour, not the trade, is the independent unit.
- Market heat (heat_win2h_hit ≥ 7) +5.3% (17) vs −2.3% (17:41). Not pursued.

Money management
- 13:28 UK 19 Oct: Kelly 0.2% → no stake justified; 17:41: Kelly −2.7%; at 0.05 SOL the fixed fees make A clearly negative (−4.6% a trade paper model); a 1.5 SOL wallet survives 0.05 stakes, 0.1 used 45% of it on the live night. A daily stop does not help (losses are spread).

Searches
- The study's Project F scans (13:28 ~70 features; 21:40 4,821 tests; 01:45 ~50,000; 05:35 ~1,400; 09:35 ~1,900; 13:35 ~2,000; 17:40 3,080) — every in-sample find that cleared the bar (F5–F13) fell to about zero or below out of sample. Read any new A rule against that base rate.

## Notable coins
- Spidey Show (19–20 Oct night) — sold at the 4x cap, peaked ~20x; the single biggest A/AS/D win (+276.6% after costs) and the trade that decides A-vs-A2 comparisons.
- French Piccolo (19 Oct ~06:04 UK) — a 10-wallet-operator coin A caught at $81K; live runner leg +110.9% (paper +115.6%), 5.1x at 3 min; most of F10's in-sample mean.
- The Fearless Yorkie (19 Oct 15:41 UK) — shadow runner leg +126.1% (paper +118.6%).
- "france is dead" (19 Oct, live) — the live runner leg closed by the paper position's 80% trail on a rug: −79% exit gap, −0.098 SOL; why "a rug books −100% live, not −42%".
- Privacy Cat +25.5% / UNDINE +26.4% / KAHO +31.7% / Elon Accounts +53.6% / SpaceXSITeslaBoringL −49.3% (19 Oct, live) — live fills matched paper within a few points on the coins that are now AS coins (17 coins: real +17.0% vs paper +16.0%).
- earth and moon (20 Oct 09:48 / 10:09 UK) — operator coins A and D bought on the pool at ~$99K about a minute in: 2.15x and 1.62x on the runner; over 57 earlier A/C/D rows operator coins were −13%. Excluded from 20 Oct 19:15 UK.
- Etchy Cat (1.58x), Lucia Caminos and LEGOCAT (both stopped), 19 Oct evening — operator coins A caught after their run.
- Rest in Piss Kim Jong-Un (19 Oct 20:39 UK) — A's row had a 21-s feed lag after a restart; the A5 leg on it filled 31% below paper (stale price) → the 8-s lag guard on A5/F6.
- "Pump.fun" (21 Oct 00:01 UK) — bought at $6.1K with 61 holders and the platform's own name; probably a fake token with a non-standard supply, so its MC (and +20.7%) is suspect. Proposed fix (awaiting go): skip a coin whose MC does not match price × 1 billion.
- Hollow (23:28 UK) and Pokemon Sol-Silver (23:33 UK, 20 Oct) — AS/A stops that never moved (peaks 1.12x / 1.06x); typical dead-on-arrival losers nothing at entry predicted.

## What the owner said / decided
- 16 Oct: chose the hold-while-volume-is-strong, sell-at-4x, −40% stop exit (Project 2) as the main exit idea — the origin of the runner.
- 18 Oct: sees Project 5 (the early 30-SOL burst) as the clear winner and wants small left/right deviations of it tested rather than new ideas; target an average of 2–3 SOL a day per paper project at 0.25 SOL a trade; go live only after more paper data, prove fills at the minimum stake, then raise the stake while fills match paper.
- 19 Oct 00:29 UK: live at 0.1 SOL on P5 with hold-5; let it run overnight despite early losers. ~02:00 UK: run runner and hold-5 live side by side on the same coins rather than pick one from paper; every control on the website, not Telegram.
- 19 Oct morning: one consistent letter per book (A/B/C/D); website figures start at the 18 Oct 20:25 UK price fix; does not accept that night vs day matters much.
- 19 Oct 15:48 UK: every new analysis "straight onto shadow".
- 19 Oct 19:56 UK: A5 and A2 built on A (A5's bar: 40 trades).
- 20 Oct 05:00 UK: "remove what isn't working, add what has potential" — A stays on the page.
- 20 Oct afternoon: "A and D are in desperate need of improvement … 279 trades … still at a loss"; asked for socials using GMGN, then the "drastic change".
- 20 Oct ~17:05–17:25 UK: dev ideas — "if the dev is out, we shouldn't be involved" (side wallets), CTO idea dropped; "every coin is bundled"; the standard set for every coin: socials, creator not sold out, biggest buyer 3–5 SOL, ignore hand-offs, drop the 11% whale rule, look at consistency of volume (not built).
- 20 Oct 20:22 UK: two kinds of acceptable book — many trades with small profit each, or few with big profit (about 0.3 SOL a trade minimum); agreed plan of two or three separate, non-overlapping profitable books with stakes raised step by step.
- 21 Oct 00:17 UK: focus on what the 17:45 UK change did (AS since 17:45: 71% won, +25% a trade on 14). Answer given: 17:45 is when AS was created; the same filters made +10.9% on the 69 earlier trades, so the jump is the stretch of coins, not the rule; A itself was +0.2% on its 52 coins since 17:45.
- 21 Oct 00:27 UK: keep a notes file per book, read it before every analysis, then add fresh data (this file).

## Open items
- Nothing pending on A's own rule. A stays as the parent trigger and on the page.
- Awaiting go (AS, from A's trigger): an AS real-quote (shadow) executor book at 0.1 SOL; AS variant lines "+ MC ≥ $46K", "+ ≤ 5 copycats", "+ creator bought < 0.9 SOL", "+ at least 1 sniper". See AS.md.
- Awaiting go: skip coins whose MC ≠ price × 1 billion (fake-supply tokens such as "Pump.fun"); log and show the crash reason (crash at ~23:53 UK 20 Oct; 32 restarts in 24 h); rewrite the 4-hourly study's prompt (stale books and cost model; the 21:25 UK 20 Oct run failed on the usage limit).
- Unresolved, untested: the owner's "consistency of volume" idea; F10 (entry MC > $53K) and the pool-depth family (pool_sol > 74) on A need 40 OOS trades.
- Next decision trigger: A only goes back to the executor as one of its filtered children (AS first), and only after a real-quote leg matches paper.
