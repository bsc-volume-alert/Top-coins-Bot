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

| File | Book | Status (21 Oct 12:30 UK — see reports/latest.md for the revision plan) |
|---|---|---|
| [AS.md](AS.md) | A + standard filters | Best book. +11.5% on 79 (operator coins out); since 17:45 UK 20 Oct +22.9% on 15. In executor SHADOW at 0.1 SOL from 21 Oct 01:30 UK |
| [AS2.md](AS2.md) · [AS3.md](AS3.md) | AS + launch bundle 2+ / 5+ wallets (snipers) | New 21 Oct 01:30 UK; back-test strong, real test starting |
| [GR.md](GR.md) | Graduation, 3-min (+ variants, every-graduation) | Revised 21 Oct 09:47 UK (under 156 buyers, 10-second rule); shadow at 0.25 by owner's choice; 64 real-quote legs +11.7% before the revision |
| [K.md](K.md) | K revised 21 Oct 14:50 UK: keeps going + under 912 buyers + MC ≥ $36K, 2x or −40% | Back-test 18 at +42.7% (luck 2/20); real test from 14:50 UK |
| [DS.md](DS.md) | D + standard filters | Back-test good; since the change negative |
| [DC.md](DC.md) | D, copycat of a $72K+ coin | Back-test good; 4 forward trades poor |
| [H.md](H.md) | A, top-10 holders < 23% | Starved of data (GMGN holders missing) |
| [A.md](A.md) · [B.md](B.md) · [C.md](C.md) · [D.md](D.md) · [80.md](80.md) · [E.md](E.md) · [F.md](F.md) · [G.md](G.md) · [A2.md](A2.md) | Momentum family | Break-even to negative |
| [A5.md](A5.md) · [F6.md](F6.md) | Early-confirmation variants | No edge |
| [R.md](R.md) | Revival | Too few trades; restart bug |
| [PG.md](PG.md) | Pre-graduation | OFF 21 Oct 14:45 UK; folded into BL |
| [S3.md](S3.md) | S3 revised 21 Oct 08:45 UK: copies of $1M+ coins, ≥ 1 s after launch, serial creator skipped | Lottery; back-test +22.5% on 72 (5 big winners); real test from 08:45 UK |
| [S4.md](S4.md) | S4 revised 21 Oct 10:28 UK: clean launch + socials + first-time creator + original name | Back-test +25.7% on 32 (in sample); real test from 10:28 UK; old shadow book off |
| [S8.md](S8.md) | **BL** = S8 revised: bundle-launch book (70–80% bundle over 4–10 wallets, first trade $25K+, 40% trail) | ON since 21 Oct 14:45 UK: paper box + executor shadow 0.05; back-test 101 at +32.9%, luck 0 |
| [S1.md](S1.md) … [S11.md](S11.md), [S3b.md](S3b.md), [S4b.md](S4b.md), [S6b.md](S6b.md), [S7b.md](S7b.md) | Curve snipers | All negative |
| [S10.md](S10.md) | Operator coins on the pool | Negative; the pool price is the operator's exit |
| [OFFPAGE.md](OFFPAGE.md) | Old tracker books not on the page | Nearly all negative |
| [FOMO.md](FOMO.md) | The fomo.family watcher (/fomo page): books FW (fomo wallets) and FF (fomo flow) | Stage-1 change list written 21 Oct 16:45 UK; build pending "go" |
| [LESSONS.md](LESSONS.md) | Cost models, data events, settled conclusions, owner's rules | — |
| numbers.py | Builds every "Latest numbers" block | — |
