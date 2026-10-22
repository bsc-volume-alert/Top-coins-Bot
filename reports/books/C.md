# C — A's trigger on $100K–$250K coins ("Wide"), runner exit
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `p5w30`; page letter C; executor book `wide` (exit `flow4`) — OFF (paper) since about 16:00 UK 19 Oct; never live. Off the page (out of view in the box since 19 Oct 20:01 UK, v0.18.142); in the combined 12-h strip as "C" (off-page).
- Entry (src/momentum.js `p5Check`): A's trigger — 30 SOL bought in 60 s, coin ≥ 60 s old, buys ≥ sells, ≥ 10 buyers — on coins whose market cap at the trigger is $100K–$250K (A takes those under $100K; `P5W_MAX_MC` 250K); 30-SOL level only; one trade per coin. Same skips as A (launch not seen, bundled 70%+, 150+ wallets, not SOL-paired). Operator fingerprint coins excluded from 20 Oct 19:15 UK (v0.18.164).
- Exit `x_flow4` (A's runner): −40% stop until 1.5x; then hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x.
- Started 18 Oct 01:10 UK (v0.18.81, "P5 Wide", MC cap $250K); card narrowed to the extra $100K–$250K coins only 19 Oct 09:36 UK (v0.18.109). Page record from 18 Oct 20:25 UK. No rule change since.

## Verdict now
**21 Oct 02:30 UK:** Dead — the $100–250K market-cap band loses in every block.

**21 Oct 11:05 UK (revision search, data to 10:36 UK):** confirmed dead: −11.9% on 103, negative in all three thirds, no exit positive, 0 of 64 passing candidates beat luck (the best is luck 18/20 on 20 trades). C feeds no child book. Switch it off.

Not working: the $100K–$250K band has lost under every exit in every study (−16.2% on 33 at 13:28 UK 19 Oct; −9.0% on 97 at 17:40 UK 20 Oct; −10.4% on 101 to 21 Oct 00:09 UK). Its 7 shadow legs were +0.027 SOL, too few to mean anything.

## Latest numbers
<!-- NUMBERS -->
_Data to 22 Oct 01:04 UK; real costs. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:34 UK) | 113 | -12.9% | -13.7% | 34% | 39% | -1.57 |
| last 24 h | 19 | -21.6% | -25.9% | 26% | 53% | -0.43 |
| last 12 h | 8 | -29.2% | -40.1% | 12% | 62% | -0.24 |
| last 6 h | 0 | — | — | — | — | — |

Executor book `wide` (shadow, real quotes): 7 legs, +0.027 SOL, average +11.7% a leg, without best -0.1%, won 57%, 19 Oct 10:10 UK to 19 Oct 15:39 UK.
<!-- /NUMBERS -->

## Change history
- 18 Oct 01:10 UK (v0.18.81): P5 Wide card — A's trigger with the MC cap raised to $250K. No back-test possible (the bot never recorded triggers above $100K before 18 Oct 01:20 UK).
- 19 Oct 03:21 UK (executor v0.3.0): four executor books; `wide` buys Wide's EXTRA coins only (p5w30), starts OFF at 0.01 SOL.
- 19 Oct 09:36 UK (v0.18.109): the C card counts the $100K–$250K coins only; "whole book up to $250K (A + C)" kept as a line inside it.
- 19 Oct ~10:10 UK (v0.18.111 per-book modes): C in shadow at 0.1 SOL (4 legs 10:10–13:36 UK, +0.120 SOL).
- 19 Oct ~14:15 UK: shadow stake 0.25 (3 legs 14:27–15:39 UK, −0.094 SOL).
- 19 Oct 13:28 UK study: "C should be switched off outright" (−16.2% on 33; "the $100K–$250K band loses under every exit").
- 19 Oct between 15:39 and 17:08 UK: executor book `wide` switched OFF (paper) by hand; the 17:41 study found A–D off. No reason recorded.
- 19 Oct 20:01 UK (v0.18.142): C out of view in the wallet box and strip (still recorded).
- 20 Oct 18:24 UK (v0.18.161): shown in the off-page box (runner, last 12 h); 19:25 UK (v0.18.168) in the combined strip.
- 20 Oct 19:15 UK (v0.18.164): operator fingerprint coins removed from every book except S10 — C bought all of them (see Notable coins), so C's record changed most of any book.

## Ideas tested
- Every exit on C's coins (13:28 UK 19 Oct, 33 trades): runner −16.2%, 5-min, 3-min, 1.5x/−40%, 2x/−40% all negative. 17:41 UK (39): runner −15.0%, 5-min −15.5%, 3-min −14.2%, 1.5x/−40% −12.4%, 2x/−40% −19.4%. Hold-5 kept as a line in the card ("extra coins with the hold-5 exit") — negative.
- Copycat rule (D's F13, cc_best_mc24h > $19K) on C: −2.0% on 24 (13:35 UK 20 Oct). Not pursued.
- F1 (bundle ≤ 3 wallets) "fails on E and on C" (13:28 UK 19 Oct).
- Project F scans (05:35–17:40 UK 20 Oct) included C's passed rows; no rule on C cleared the bar.
- Buying the operator's coins on the pool at $140–250K a minute after launch (C's de-facto trade on them): 5-min sale 11 up / 10 down, about −1% net on 21 (01:45 UK); 10 up / 7 down on 17 (05:35 UK); pool-side A/C/D rows on fingerprint coins −13.2% on the runner, +0.3% at 5 min, 46–58% stopped (09:35 UK). The study's launches file says these coins peak in their first minute (5-min MC a median 0.76x the 1-min MC). Ended by v0.18.164.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/C.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 94 trades −11.2% (no-best −12.1%), −0.52 SOL a day. Best exit 1.5x/−40% −9.2%. 7 pass vs 3 by luck; best cut 'fewer than 34 triggers in the last hour' 16 trades +11.7%, luck 3 — too small and too near luck. Quiet-minute rule (selling < 19.6 SOL) on C: −12.7% on 37.

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_C.md):
  - Book now: 103 trades −11.9% (no-best −12.8%), 35% won, 37% stopped, thirds −15.3% / −13.3% / −7.1%, last 24 h 29 at −12.1%, 40 a day, −0.52 SOL a day at 0.1. Both halves of the band lose: $100–150K 93 trades −12.1%, $150–250K 10 trades −10.4%.
  - Winners as a group (7 big, 29 small): median entry MC $101–113K, 59–71 SOL in the trigger minute, 52–71 wallets, 57–59% with socials. Losers (29 small, 38 stopped): $102–106K, 35–74 SOL, 37–58 wallets, 45–61% with socials. Only 7 trades ever made +50%; nothing at entry separates the groups.
  - Exit verdict: every exit negative — t15s40 −10.0% (best), runner −11.9% (current), h3 −12.7%, h5 −13.8%, tsl40 −14.7%, flow4ff −15.8%, h15 −15.7%, t2s40 −16.2%.
  - Factor / pair verdict: 1,172 filters × 12 exits + 90 pairs; 64 pass the three-period test; **0 beat luck** (shuffled runs give +5.9% to +31.1%). Best: "fewer than 8 winning triggers in the last 2 h" (heat_win2h_hit < 8) on x_h2t40 — 20 trades +19.9% (no-best +6.6%), luck 18/20; the same 20 rows on the runner +8.6% (no-best +5.0%). A market-heat count on 20 trades, not a rule.
  - Proposed revised rule: **no profitable version found.** The $100K–$250K band has now lost on 33, 97, 101 and 103 trades under every exit and every study; it feeds no child book (DS/DC come from D, AS from A).

## Notable coins
- The 10-wallet operator's coins (19–20 Oct) — C caught all 21 of the first 24 h at $140–250K about a minute after launch (e.g. GTAVI AudaCity at $208K, 20 Oct 04:50 / 05:04 UK: 0.59 and 1.25 at 5 min); earth and moon (20 Oct 09:48 / 10:09 UK) bought at $173–216K and stopped (0.58, 0.60) while A/D, buying at $99K, made 2.15x / 1.62x.
- 13:28 UK 19 Oct shadow: fade-volume winners +0.066 SOL on 2 legs; the 4 legs at 0.1 SOL made +0.120, the 3 at 0.25 lost −0.094.

## What the owner said / decided
- 18 Oct: test small deviations of P5 (Wide was one of three).
- 19 Oct morning: letters A/B/C/D, one name per book.
- No recorded owner statement specific to C after the 13:28 UK 19 Oct study's advice to switch it off.

## Open items
- PROPOSAL (21 Oct rev): SWITCH OFF — stop C as a book (it feeds nothing; the rows can keep recording if that costs nothing) — exit x_flow4 — n103 -11.9% (no-best -12.8%) thirds -15.3/-13.3/-7.1 luck 18/20 — UNPROVEN — the $100–250K band loses under every exit in every window and the search finds only luck.
- awaiting go: retire from the page.
- None. C stays recorded, off the page. If the operator's coins are ever traded again it will be through S10, not C.
