# Lessons that apply to every book
_Notes last rebuilt: 21 Oct 2026 00:45 UK. Read this before any book file._

## How results are measured (never mix methods)
- **Paper** = what the book would have made from the tracker's prices. **Shadow** = the executor gets real quotes and simulates the transaction but signs nothing. **Live** = real money from the executor wallet.
- **Real costs on graduated (PumpSwap) coins:** x/1.02 × 0.967 − 1 − 0.006 − 0.02. Stops (x ≤ 0.62) cost −0.05 more. The page also adds 0.001 SOL a trade.
- **Real costs on the bonding curve (snipers, PG), v0.18.150:** x × 0.97 − 0.02 − 1 − 0.02. Stops cost −0.01 more. These were fitted to 384 shadow sells.
  - **Floor sells** (peak ≥ 1.5 and exit 0.62–1.32 on the 5-min or 3-min exit) cost −0.12 more.
  - Prints above 15x are capped.
- **lateFix (curve books):** if the price 1 s after entry (fs1_x) is above 1.5x the entry price, the paper entry was too early to be real, so every exit multiple is divided by it.
- **"Without best"** = the average with the single best trade removed. A book that is only positive because of one coin is a lottery, not an edge (S3b, S4b, GR with ARTEMI).
- **Halves:** split a book's trades by time; an edge must be positive in both halves.
- **Before/since a change:** the "before" figure is a back-test. The rule was chosen by looking at those trades, so it's flattering. Only "since" is a real test.
- **Blocks of 14 trades swing a lot** (AS: −7.3% to +29.6%). Never size stakes off the last block.

## Data events that change how history reads
- **18 Oct 20:25 UK, price fix.** PumpSwap prices were corrected; everything before is unreliable. All books start their record here.
- **20 Oct 16:25–19:05 UK, save bug (v0.18.155 → fixed v0.18.163).** setH5 had a parameter mismatch and threw silently. A/D exits were 100% filled; snipers lost about 10% of their closes in that window.
- **20 Oct 16:35 UK:** socials are fetched at every launch. Sniper socials figures before this are selection-biased.
- **v0.18.164 (20 Oct 19:15 UK):** operator pump-and-dump coins are excluded from every book except S10. The fingerprint: bundle_wallets = 10, bundle_pct 37–41, bundle_sol 22–28, dev_buy_sol < 0.2. Typical path: $218K at 60 s, $4K at 1 h.
- **Checking for operator coins in the exported data:** abcd.csv has no bundle_sol column, and launches.csv only covers about 24 h. Match on bundle_wallets = 10, bundle 37–41% and dev buy < 0.2 (numbers.py does this), or join to the tokens table. Missing this put 5 operator coins into the chat's AS figures on 20 Oct (corrected 21 Oct 00:50 UK: AS +11.5% on 78, not +13.0% on 83).
- **S10 buys on the pool, not the curve,** but the page scores it with the curve cost model like every sn* book (−13.8% curve vs −8.8% PumpSwap on 16 rows at 5 min). Open item in S10.md.
- **Instant graduations** (graduated under 10 s after launch): paper took the curve price, but real buys paid 2–3x more. They are left out of GR and "every graduation".
- **Bot restarts:** 32 in the 24 h to 21 Oct 00:07 UK. Most were deploys, but at least one (≈23:53 UK 20 Oct) was a crash. A restart wipes in-memory state: R's 6-h history, and possibly the late part of open paper trades.
- **Suspect prices:** a coin entered far outside the book's normal market-cap range (e.g. "Pump.fun" at $6.1K in AS) probably has a non-standard supply. Treat its result as unreliable.

## Settled conclusions (don't re-test without new evidence)
- Sniping brand-new coins on the curve is negative: about 6,800 closed trades across S1–S11 by 21 Oct 00:09 UK, every book below zero at real costs.
- A and D unfiltered are break-even to negative. Filtered versions (AS) are where the edge is.
- Revival / doubling triggers, the 250K→500K fast-pump idea and buying the dip after graduation are all strongly negative on GMGN 5-minute history (see R.md).
- The "every graduation" book's early profit was mostly the instant-graduation price error.
- Real fills on PumpSwap books match paper closely: A runner legs paper-mult 0.99–1.02; 17 AS coins real +17.0% vs paper +16.0%. Fills are not the problem on graduated coins; the curve is where paper flatters.

## The owner's standing rules for analysis
- Never agree just to agree. Statistics and facts only; say plainly when an idea is wrong.
- Ask the server for a fresh data push (scripts/push-now.txt) before any analysis. No stale data.
- UK times. Plain explanations. Everything goes on the website; Telegram stays quiet.
- Propose changes and wait for his "go" before pushing code. A fix to just-pushed broken code may go with notice.
- His trading framework (20 Oct 20:22 UK): either many trades with a small profit each, or few trades with a big profit each (about 0.3 SOL a trade minimum). Plan agreed in principle: two or three separate, non-overlapping profitable books, with stakes raised step by step (0.05 → 0.1 → 0.25 → 0.5) while real fills match paper.
