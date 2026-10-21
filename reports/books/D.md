# D — P5 "Strict": 50 SOL bought in 60 s, MC under $100K, runner exit
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `p5e50`; page letter D; executor book `strict` (exit `flow4`) — OFF (paper) since about 16:00 UK 19 Oct; never live. On the page (box list after F6).
- Entry (src/momentum.js `p5Check`): 50 SOL or more bought inside 60 s (A uses 30), MC under $100K, coin ≥ 60 s old, buys ≥ sells, ≥ 10 buyers, first time per coin at this level; A's four skips (launch not seen, bundled 70%+, 150+ wallets, not SOL-paired). Operator fingerprint coins excluded from 20 Oct 19:15 UK (v0.18.164). D usually fires on a coin A already bought, later and higher (about 85% of D's coins are A's coins).
- Exit `x_flow4` (runner, as A): −40% stop until 1.5x; hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x.
- Started: level recorded from 17 Oct 02:34 UK (v0.18.50); "P5 Strict" card 18 Oct 01:10 UK (v0.18.81); page record from 18 Oct 20:25 UK. No rule change since (its filtered children DS and DC change instead).
- D's filtered children (other notes files): **DS** (D + the owner's standard set: socials, creator not sold out, biggest buyer 3–5 SOL) and **DC** (D on copycats of a $72K+ coin). The 80-SOL level is 80.md.

## Verdict now
**21 Oct 02:30 UK:** Negative; useful only as the feeder for DS/DC.

Not working on its own: about break-even in every study (−0.4% to −1.3% from 80 to 217 trades), then worse on 20 Oct evening (−3.6% on 259 to 21 Oct 00:09 UK; last 6 h −11.4% on 39). Its 26 shadow legs were +0.025 SOL. Every rule found on D (F8, F11, F12, F13) faded or failed out of sample.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:43 UK; real costs. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:27 UK) | 282 | -4.5% | -5.5% | 45% | 42% | -1.55 |
| last 24 h | 102 | -8.2% | -11.0% | 43% | 48% | -0.94 |
| last 12 h | 56 | -10.9% | -16.1% | 36% | 57% | -0.66 |
| last 6 h | 19 | -21.5% | -25.6% | 32% | 58% | -0.43 |

Executor book `strict` (shadow, real quotes): 26 legs, +0.025 SOL, average +5.1% a leg, without best +0.3%, won 50%, 19 Oct 10:27 UK to 19 Oct 15:53 UK.
<!-- /NUMBERS -->

## Change history
- 17 Oct 02:34 UK (v0.18.50): the 50-SOL level recorded alongside 30 and 80 (strategy p5e50).
- 18 Oct 01:10 UK (v0.18.81): "P5 Strict" card. Evidence written on the card (17 Oct): coins that reached 30 SOL but never 50 SOL lost −1.74 over 31 trades (17 rugs). Alt lines: D with the hold-5 exit; the 80-SOL level runner and hold-5.
- 18 Oct 20:25 UK: page record restarts at the price fix.
- 19 Oct 03:21 UK (executor v0.3.0): executor book `strict` (p5e50 / flow4), its own leg on a coin the runner may already hold, starts OFF at 0.01 SOL.
- 19 Oct ~10:27 UK (v0.18.111 per-book modes): shadow at 0.1 SOL (15 legs 10:27–14:12 UK, +0.206 SOL).
- 19 Oct ~14:15 UK: shadow stake 0.25 (11 legs 14:17–15:53 UK, −0.180 SOL).
- 19 Oct between 15:53 and 17:08 UK: executor book `strict` switched OFF (paper) by hand. No reason recorded.
- 20 Oct 05:19 UK (v0.18.148): D kept on the page ("books still worth watching").
- 20 Oct 16:02 UK (v0.18.155): DC created (D's passed rows on copycats of a $72K+ coin).
- 20 Oct 16:19 UK (v0.18.156): DS created (D skipping no-socials coins and whale-led minutes, max_share > 0.11); 17:29 UK (v0.18.158) DS = D + the owner's standard set, 11% whale rule dropped.
- 20 Oct 16:25–19:05 UK: hold-exit save bug — D's x_h5/x_h3 alternative columns incomplete in that window; x_flow4 unaffected.
- 20 Oct 19:15 UK (v0.18.164): operator coins removed from D (D had bought 19 of them, about −11% a trade with A's 20).

## Ideas tested
All at real costs; OOS = out of sample.
- D is not an independent test of A: 85% of D's coins are A's coins (13:28 UK 19 Oct). D buys the same coin later and higher — e.g. Poke Packz $91K vs A's $64K, Unfazed Crane $84K vs $50K, MOCHI $85K vs $68K (20 Oct evening): "D pays for the move that A catches".
- Exits on D (17:41 UK 19 Oct, 101 trades): runner −1.3%, 5-min −7.8%, 3-min −0.2%, 1.5x/−40% −0.5%, 2x/−40% −2.5%. Hold-5 line on the card negative. Runner kept.
- sol60 ≤ 51 — the trade that crossed 50 SOL was small (study rule F8, 20 Oct 01:45 UK; in sample +10.2% on 81, smooth threshold): OOS −18.7% (9) → −11.2% (17) → −13.4% (23) → +0.1% (31) vs −2.4% rest. About zero; waiting for 40. The same logic on A's level is −8.3% on 71.
- max_share ≤ 0.11 — no single buy over 11% of the minute (study rule F11, 05:35 UK; in sample +5.3% on 130; hump-shaped threshold; judge on 80 OOS): OOS +3.8% (10) → +2.1% (20) → +3.5% (30), halves +9.5% / −2.5%. Small and fading. The flip side became DS's first whale skip: D's whale-led minutes −18.2% on 44 (05:35 UK), max_share > 0.11 −17.9% on 47 (09:35 UK). The owner later dropped the 11% rule from DS (17:29 UK 20 Oct: a conviction buyer split over wallets defeats it) in favour of "biggest buyer 3–5 SOL".
- avg_buy_sol ≤ 0.40 (study rule F12, 09:35 UK; in sample +14.0% on 47; 44 of its 48 rows are F11 rows): +11.9% on 51 at 13:35 but halves +23.3% / +0.9%; OOS +0.7% (3) → +0.4% (6).
- cc_best_mc24h > $19K — copycat of a coin that worked (study rule F13, 13:35 UK; in sample +10.8% on 61; 50 of 61 are F11 rows): OOS −2.5% (6) vs +18.2% rest (8). The $72K version became DC (15:00 UK study: +18% on 39) — DC's first forward trades −32.2% on 4 (to 23:27 UK). See DC.md.
- Young coin (age ≤ 221 s) +9.5% on 51 but +4.9% at the 5-s price with a negative median (13:35 UK) — not registered.
- bundle_wallets ≤ 2 on D: +11.6% at 3 min on 44 (05:35 UK), +8.2% on 57 (17:40 UK) — it is F1's family (43 of the 44 are A's bundle-≤2 coins), which failed on A (−10.2% on 64). Not registered.
- pre_m1_b ≤ $5,294 +12.6% on 42 (01:45 UK) — column filled on half the rows, looked like a measurement quirk. Not registered.
- pool_sol > 74 (F15 family) on D: +7.1% on 62 vs −3.7% (17:40 UK). Not registered on D.
- Socials (20 Oct afternoon): D −21.5% on 36 without socials vs +0.7% on 152 with, both halves → DS.
- Biggest buyer in the trigger minute 10+ SOL: −18% on A and D (20 Oct afternoon) → DS's 3–5 SOL band.
- Top-10 holders < 23% (GMGN) → H, found across A, D and 80 (+10.6% on 145); H trades A's trigger only. See H.md.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/D.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 257 trades −4.3% (no-best −5.4%), −0.62 SOL a day; last two blocks −8.8% / −8.4%. Best exit 1.5x/−40% −3.4%. 25 pass vs 18 by luck, none real (best luck 10: creator bought ≥ 5 SOL, +10.2% on 39).

## Notable coins
- Spidey Show (night of 19–20 Oct) — 4x cap; F11's in-sample mean is +3.2% without it.
- earth and moon (20 Oct 09:48 / 10:09 UK) — operator coins A and D bought on the pool at ~$99K: 2.15x and 1.62x on the runner (excluded since 19:15 UK).
- GTAVI AudaCity (20 Oct 04:50 UK) — operator coin A and D bought at $99.6K and stopped.
- Poke Packz / Unfazed Crane / MOCHI (20 Oct evening) — DS bought them $17–34K higher than AS and made −53% / 0% / +10% where AS made +30% / +39% / +83%.
- 19 Oct shadow: 11 stops −0.813 SOL (exit gap −9.5%) against 11 fade-volume winners +0.800 (17:41 UK study) — the stop is where D's real legs lose.

## What the owner said / decided
- 18 Oct: test small deviations of P5 (Strict was one).
- 20 Oct ~14:30–15:00 UK: after seeing fresh data, ranked "F6 is the best, then D" on his system.
- 20 Oct afternoon: "A and D are in desperate need of improvement … still at a loss" — led to socials-at-launch, DS and DC.
- 20 Oct 17:25 UK: the standard set (socials, creator not sold out, biggest buyer 3–5 SOL) for every coin; drop the 11% whale rule.
- 20 Oct 20:22 UK: agreed in principle to two or three separate profitable books including "the best D-family book".

## Open items
- awaiting go: retire the plain D box (data kept).
- F8 and F11 continue as study rules (F8 waiting 31/40; F11 waiting 30/80); F12, F13 waiting.
- The best-D-family-book decision depends on DS and DC forward results (DS since 17:45 UK 20 Oct: −3.5% on 12 to 00:09 UK; DC since 16:00 UK: −32.2% on 4). See DS.md, DC.md.
