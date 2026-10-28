# Book notes: the memory for every book

The owner (Tassean) calls the books "coins" ("coin A", "coin AS"). Each book has one file here holding everything decided, tested, found and changed, with dates, so no analysis starts from zero and no idea gets tested twice without knowing it.

## Protocol (agreed 21 Oct 2026 00:27 UK)
Whenever a book is discussed, analysed, changed or reported on, by a chat session or the 4-hourly study:

1. **Read first:** LESSONS.md, then the book's file (and its parent/children: AS ↔ A, DS ↔ D, GR variants…).
2. **Fresh data second:** request a push (write the UTC time into scripts/push-now.txt and push to `tracker`), wait for `data/pushed_at.txt` on the `data` branch to move, then run `python3 -I reports/books/numbers.py <dir>` on the new files.
3. **Answer from both:** start from the book's latest conclusion, then say what the fresh data adds or changes. Refer back to past tests by name and date. Don't re-run a dropped idea as if it were new; say it was tested, when, and what came out.
4. **Write back** in the same session: dated lines under Change history / Ideas tested / Notable coins / What the owner said / Open items, an updated Verdict, and refreshed numbers (`numbers.py <dir> --write`). Commit to `tracker`. reports/ changes never restart the bot.
5. **Never delete history.** If a conclusion is overturned, add a dated line saying so and why.
6. **Successes and failures, always.** Every analysis of a book groups its successful trades and says what made them succeed, groups its failures and says what made them fail and what would minimise them — in detail — before proposing a rule (owner, 21 Oct 11:31 UK). The per-book record of this lives under "Ideas tested" in the book's file; the consolidated version is reports/winners-losers.md.

## Index
**The cull (owner, 21 Oct 13:50 UK; done 14:45 UK, v0.18.176):** kept on the page AS, AS2, AS3, AS4, GR, BL, K, S3, S4. Everything else is retired from the page and the old off-page books are stopped; their data keeps recording. Retired books are not re-analysed unless the owner asks.

| File | Book | Status (28 Oct 13:05 UK — see reports/latest.md; BOOKS OFF since 19:46 UK 23 Oct, v0.18.185, executor stopped) |
|---|---|---|
| [AS.md](AS.md) | A + standard filters | 28 Oct 13:05 UK: record closed at 108 forward +1.6% (no-top3 −3.3%); `asoc` 62 legs +0.384 SOL, fills match paper; AS4 10 at −24.2%. Earlier: 23 Oct 09:35 UK: forward 90 at +3.9% (no-top3 −2.0%); `asoc` 60 legs +0.432 SOL, 40-leg checkpoint reached 14:05 UK 22 Oct (+0.609), legs 31–60 −0.281 — fills match paper, book flat. Earlier: Forward 66 at +4.1% (no-top3 −0.6%; last three 14-blocks negative); shadow `asoc` 37 legs +0.586 SOL, legs lost to the empty wallet 05:48–10:33 UK. Earlier: Best book. Forward 55 at +7.0% (22 Oct 05:50 UK); shadow `asoc` 36 legs +0.634 SOL — 30-leg checkpoint reached 23:38 UK (+0.713 at leg 30), last 16 legs −0.19 SOL |
| [AS2.md](AS2.md) · [AS3.md](AS3.md) | AS + launch bundle 2+ / 5+ wallets (snipers) | 28 Oct 13:05 UK: AS2 76 at −3.1% (drop); AS3 56 at +4.1% (no-top3 −1.4%). Earlier: 23 Oct 09:35 UK: AS2 60 at −1.6% (drop); AS3 45 at +4.8% (no-top3 −1.4%), paper to 60. Earlier 22 Oct 13:50 UK: AS2 44 at −1.7% (drop); AS3 at its 30 checkpoint: 31 at +4.4% on the runner (no-top3 −3.0%), x_t2s40 +16.1% (p 0.10) — watch to 60 |
| [GR.md](GR.md) | Graduation, 3-min (+ GR2 = bundle-launch graduations on the 40% trail, shadow 0.25 from 21 Oct 17:00 UK; every-graduation) | 28 Oct 13:05 UK: GR 154 at +3.6% (no-top3 0.0%; bundle 96 at +11.3% vs other 58 at −9.1%); GR2 paper 86 at +80.4%, live 19 legs +0.390 SOL (−0.72 without kimchisol); og kimchi 20x sold by the local stop at 0.73x (stop measured from the real entry, +36% above paper) — code question before any live restart. Earlier: 23 Oct 09:35 UK: price-error rows found (paper entry 6–8x below the pool; lateFix now on grf rows); corrected forward 122 at +4.2% (no-top3 −0.3%), other graduations −9.3% on 48; bundle split holds (74 at +13.0% vs 48 at −9.3%, luck 15/2000); GR2 live 14 legs +0.735 SOL (one 12x; GR.md 08:05 UK). Earlier 22 Oct 13:50 UK: 76 forward +8.6% (no-top3 +1.4%); bundle split passes out of sample (52 at +18.4% vs 24 at −12.6%, luck 23/2000); live 17 legs −0.362 SOL, the 11 new ones real ≈ model; GR 0.1 live, GR2 live at 0.1 (0 legs). Earlier: Revised 21 Oct 09:47 UK; 40-row checkpoint reached 22 Oct 05:50 UK: 41 at +4.2% but −9.4% without best 3 (one coin, moggersha) → still 'no'; LIVE since ~17:45 UK 21 Oct, 6 live legs −0.434 SOL; wallet empty |
| [K.md](K.md) | K revised 21 Oct 14:50 UK: keeps going + under 912 buyers + MC ≥ $36K, 2x or −40% | 28 Oct 13:05 UK: 64 at −19.7%; retire. Earlier: 23 Oct 09:35 UK: 40 reached — 48 at −19.2%, 11 won; retire. Earlier: forward 26 at −29.9% (22 Oct 13:50 UK) |
| [DS.md](DS.md) | D + standard filters | Back-test good; since the change negative |
| [DC.md](DC.md) | D, copycat of a $72K+ coin | Back-test good; 4 forward trades poor |
| [H.md](H.md) | A, top-10 holders < 23% | Starved of data (GMGN holders missing) |
| [A.md](A.md) · [B.md](B.md) · [C.md](C.md) · [D.md](D.md) · [80.md](80.md) · [E.md](E.md) · [F.md](F.md) · [G.md](G.md) · [A2.md](A2.md) | Momentum family | Break-even to negative |
| [A5.md](A5.md) · [F6.md](F6.md) | Early-confirmation variants | No edge |
| [R.md](R.md) | Revival | Too few trades; restart bug |
| [PG.md](PG.md) | Pre-graduation | OFF 21 Oct 14:45 UK; folded into BL |
| [S3.md](S3.md) | S3 revised 21 Oct 08:45 UK: copies of $1M+ coins, ≥ 1 s after launch, serial creator skipped | 28 Oct 13:05 UK: 84 at −21.9%; retire. Earlier: 23 Oct 09:35 UK: 40 reached — 75 at −20.4% by the study's match; retire. Earlier: forward 33 at −25.0% (22 Oct 13:50 UK) |
| [S4.md](S4.md) | S4 revised 21 Oct 10:28 UK: clean launch + socials + first-time creator + original name | 28 Oct 13:05 UK: 13 at −8.6% (one coin). Earlier: 23 Oct 09:35 UK: 10 at −15.8% (10 of 60). Earlier: 5 at −27.2% (22 Oct 13:50 UK) |
| [S8.md](S8.md) | **BL** = S8 revised: bundle-launch book (70–80% bundle over 4–10 wallets, first trade $25K+, 40% trail) | 28 Oct 13:05 UK: 169 at +37.2% (no-top3 +14.7%; the last 42 −12.3% without og kimchi); shadow 67 legs +1.047 SOL, quotes 12 pts under the curve model on trail exits; live 13 legs 0 won. Earlier: 23 Oct 09:35 UK: forward 126 at +44.0% (no-top3 +13.9%); shadow 61 legs, 40-leg checkpoint reached: quotes 15–20 points under the model, live −42 — fills do not match paper. Earlier 22 Oct 13:50 UK: forward 77 at +49.0% but +1.4% without best 3 (−9.1% without best 5); live 13 legs −0.516 SOL, 0 won, back to SHADOW ~11:00 UK; its graduating coins +128%, the rest −28% |
| [S1.md](S1.md) … [S11.md](S11.md), [S3b.md](S3b.md), [S4b.md](S4b.md), [S6b.md](S6b.md), [S7b.md](S7b.md) | Curve snipers | All negative |
| [S10.md](S10.md) | Operator coins on the pool | Negative; the pool price is the operator's exit |
| [OFFPAGE.md](OFFPAGE.md) | Old tracker books not on the page | Nearly all negative |
| [FOMO.md](FOMO.md) | The fomo.family watcher (site on :8790): books FW (fomo traders) and FF (fomo hot coins) | FF2 paper book live 22 Oct 13:12 UK (15-min list rank 2–5, net ≥ $3K, MC < $1M, trail 40%), judge at 40; FF hold-the-top-5 losing; FW: fomo is custodial, traders cannot be followed on-chain |
| [LESSONS.md](LESSONS.md) | Cost models, data events, settled conclusions, owner's rules | — |
| numbers.py | Builds every "Latest numbers" block | — |
