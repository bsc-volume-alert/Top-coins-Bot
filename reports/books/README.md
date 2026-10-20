# Book notes: the memory for every book

The owner (Tassean) calls the books "coins" ("coin A", "coin AS"). Each book has one file here holding everything decided, tested, found and changed, with dates, so no analysis starts from zero and no idea gets tested twice without knowing it.

## Protocol (agreed 21 Oct 2026 00:27 UK)
Whenever a book is discussed, analysed, changed or reported on, by a chat session or the 4-hourly study:

1. **Read first:** LESSONS.md, then the book's file (and its parent/children: AS ↔ A, DS ↔ D, GR variants…).
2. **Fresh data second:** request a push (write the UTC time into scripts/push-now.txt and push to `tracker`), wait for `data/pushed_at.txt` on the `data` branch to move, then run `python3 -I reports/books/numbers.py <dir>` on the new files.
3. **Answer from both:** start from the book's latest conclusion, then say what the fresh data adds or changes. Refer back to past tests by name and date. Don't re-run a dropped idea as if it were new; say it was tested, when, and what came out.
4. **Write back** in the same session: dated lines under Change history / Ideas tested / Notable coins / What the owner said / Open items, an updated Verdict, and refreshed numbers (`numbers.py <dir> --write`). Commit to `tracker`. reports/ changes never restart the bot.
5. **Never delete history.** If a conclusion is overturned, add a dated line saying so and why.

## Index
| File | Book | Status (21 Oct 00:45 UK) |
|---|---|---|
| [AS.md](AS.md) | A + standard filters | Best book. +13.0% on 83; since 17:45 UK 20 Oct +23.9% on 14. Real fills match paper |
| [GR.md](GR.md) | Graduation, 3-min (+ variants, every-graduation) | Failed its 40-real-trade test; shadow only |
| [K.md](K.md) | Keeps going | New, small sample, positive |
| [DS.md](DS.md) | D + standard filters | Back-test good; since the change negative |
| [DC.md](DC.md) | D, copycat of a $72K+ coin | Back-test good; 4 forward trades poor |
| [H.md](H.md) | A, top-10 holders < 23% | Starved of data (GMGN holders missing) |
| [A.md](A.md) · [B.md](B.md) · [C.md](C.md) · [D.md](D.md) · [80.md](80.md) · [E.md](E.md) · [F.md](F.md) · [G.md](G.md) · [A2.md](A2.md) | Momentum family | Break-even to negative |
| [A5.md](A5.md) · [F6.md](F6.md) | Early-confirmation variants | No edge |
| [R.md](R.md) | Revival | Too few trades; restart bug |
| [PG.md](PG.md) | Pre-graduation | Failed; switch-off proposed |
| [S1.md](S1.md) … [S11.md](S11.md), [S3b.md](S3b.md), [S4b.md](S4b.md), [S6b.md](S6b.md), [S7b.md](S7b.md) | Curve snipers | All negative |
| [S10.md](S10.md) | Operator coins on the pool | Negative; the pool price is the operator's exit |
| [OFFPAGE.md](OFFPAGE.md) | Old tracker books not on the page | Nearly all negative |
| [LESSONS.md](LESSONS.md) | Cost models, data events, settled conclusions, owner's rules | — |
| numbers.py | Builds every "Latest numbers" block | — |
