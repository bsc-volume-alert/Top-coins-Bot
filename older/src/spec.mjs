// spec.mjs — the FROZEN rule constants for the older-coin paper project (older-1, 20 Nov 2026 UK).
// Every number a rule depends on lives here and nowhere else. Changing one is a new spec version (SPEC_VER), never a silent edit.
// The written specification that matches this code: older/docs/SPEC.md.
export const SPEC_VER = "older-11"; // 25 Nov 2026 (owner's decisions 24–25 Nov): NOTHING changes for a run that sets none of the new settings — it decides exactly as older-10 did. New, each switched on per run (main.mjs): the run's book list (OLDER_BOOKS; + VOL100K and DIP15K), the owner's gates on one provider reading per buy signal (OLDER_GATES), and the youngest age at which the 8-hour books are evaluated (OLDER_MIN_AGE_H). See the older-11 sections at the end of this file.
// older-10: 24 Nov 2026 (ninth review, Codex on the full export): EXECUTION TRUST only, no strategy number changed — (A) a coin whose token program / Token-2022 extensions have not been read from the chain is not entered on EITHER method (was: sampled coins only), the mint-account reader serves live coins and runs without the sampled adapter, and a pending live buy is checked again at the fill; (B) FEED_MAX_LAG_S: no signal and no pricing while the stream runs more than 5 s behind the chain or its delay is unknown. Rules, thresholds, stops, exits: unchanged.
// older-9: 22 Nov 2026 17:40 UK: + BUYING AGAIN (owner's decision) — a book that has bought a coin may buy it again, on any stop on which it no longer holds it (see REBUY below). The first buy per book, coin and age group is unchanged.
// older-8: 21 Nov 2026 21:15 UK: + eight any-age books (owner's decision): VOL300K / VOL500K (5-minute volume, with and without a price-up condition, $40K–$2M) and RUG450 / RUG950 (80% below a peak, bought at the level and on a 30% bounce); evaluated from migration on, incl. the first 8 hours (age group A0). 29 families, 1,240 rows. Previous: older-7 // 21 Nov 2026 16:40 UK: + HH-BREAK-4H (owner's decision: HH-BREAK's buys, sold at 4 hours if still open; 21 families, 840 rows; the existing HH-BREAK buys are carried into it, sales past 4 h estimated from minute bars and marked). Previous: older-6 // 21 Nov 2026 16:00 UK: + HH30-5M, HH30-10M, HH15-5M (owner's decision: faster volume breakouts, no dollar floor; 20 families, 800 comparison rows). Previous: older-5 // 21 Nov 2026 (afternoon): + a 60% trailing stop (owner's decision; 5 stops, 680 comparison rows) and website-only stake views. Previous: older-4 // 21 Nov 2026: + FAST-10M, FAST-30M, FAST150-10M (owner's decision: fill the gap between the 5-minute and the 4-hour books); SECOND-WAVE seeds unchanged (1/3/5-minute doubles only). Previous: older-3 // 20 Nov 2026 pm: Solana-wide scope (launchpad/exchange-neutral), HH-BREAK completed-minute windows, SECOND-WAVE across age boundaries. Previous: older-2 // 20 Nov 2026: + FAST, FAST150, SECOND-WAVE, scale-out policy, 90-day ceiling, scheduled-time fills (owner + ChatGPT consensus round)

export const STAKE_SOL = 0.2;                 // paper stake per entry
export const TX_COST_SOL = 0.0005;            // declared network/priority cost per transaction side (assumption, not measured for this project)
export const BAND_LO_USD = 40_000, BAND_HI_USD = 1_000_000; // entry market-cap band, inclusive lo, inclusive hi
export const MIN_AGE_S = 8 * 3600;            // since TOKEN creation (not pool creation)

// Age groups: [id, from (incl), to (excl)] in seconds of token age. A4 ends at 90 days (entry ceiling; open positions are not closed by it).
export const AGES = [["A1", 8 * 3600, 16 * 3600], ["A2", 16 * 3600, 24 * 3600], ["A3", 24 * 3600, 36 * 3600], ["A4", 36 * 3600, 90 * 86400]];
export const ageGroupOf = (ageS) => { for (const [id, a, b] of AGES) if (ageS >= a && ageS < b) return id; return null; };
export const ageStartOf = (id) => AGES.find((g) => g[0] === id)[1];
// A0 = from migration to 8 hours old. Only the ANY-AGE books (older-8) are evaluated there; every other book still starts at 8 h.
export const AGE_YOUNG = ["A0", 0, MIN_AGE_S], ALL_AGES = [AGE_YOUNG, ...AGES];
export const ageGroupAny = (ageS) => (ageS >= 0 && ageS < MIN_AGE_S ? "A0" : ageGroupOf(ageS));

export const STOPS = [0.20, 0.25, 0.30, 0.40, 0.50, 0.60]; // trailing stops on after-cost liquidation value (60% added in older-5; 50% added 26 Nov 2026 07:01 UK, owner: "Just do the 50%" — he asked for 10% and 50%, and dropped 10% after seeing that the price is typically 5–9% past a stop when it is noticed). A stop added later exists only on buys made after it: older buys keep the rows they were opened with, and the page counts that stop from its own start (store.since).
// STAKE VIEWS (website only, never a decision input): the page can re-price every pool-priced trade at these stakes from the pool
// reserves saved at its buy, its half-sale and its exit. The paper trade itself is always STAKE_SOL.
export const STAKE_VIEWS = [0.2, 0.5, 1, 2, 5];
export const MAX_HOLD_S = 24 * 3600;          // from the simulated FILL
export const BUY_DELAY_MS = 1000;             // buy scheduled 1 s after the signal
export const SELL_DELAY_MS = 700;             // sell scheduled 0.7 s after an exit trigger
export const BUY_PRICING_TIMEOUT_S = 5;       // no trustworthy pool state within 5 s after the scheduled buy → pricing/data timeout, entry cancelled (NOT "untradeable")
export const SELL_UNRESOLVED_S = 24 * 3600;   // a triggered sale that cannot be priced for 24 h is shown as unresolved exposure (never silently closed)

// ───────── NEW-COIN BOOKS (owner 25 Nov 2026, 16:07, 16:10 and 18:37 UK) — off unless a run switches them on (main.mjs, OLDER_NEWCOINS=1) ─────────
// A coin is measured ONCE at each of two ages, counted from its creation, and paper-bought there if every one of that age's
// rules holds. Any launchpad the provider's "new coins" list shows (in practice mostly pump.fun coins still on their launch curve).
//   at_s         the age of the measurement, seconds from creation
//   mc_min_usd   market cap OVER this                       (Jupiter token data, read at the measurement)
//   holders_min  holders OVER this                          (Jupiter)
//   vol_min_usd  bought + sold since creation AT LEAST this (Jupiter: the 1-hour statistics, which for a coin minutes old is its whole life)
//   fees_min_sol total fees AT LEAST this, in SOL           (GMGN token info — the only source of fees)
//   top10        top 10 holders inside this range, inclusive (GMGN token info, the figure the owner's other checks use)
// GMGN is asked only for a coin that has already passed market cap, holders and volume (its allowance is small). The coin's real
// age is checked on GMGN's creation time when it gives one. No reading, or a reading that fails: not bought, and counted as such.
// Bought and sold on ROUTED QUOTES for the exact 0.2 SOL size (a launch curve is not on the pool feed): the ordinary 1 s buy
// delay, the five trailing stops under both exit policies, the 24-hour limit — and the owner's own sell button. There is NO
// forced sale at 45 minutes (owner 16:10: "we don't have to come out because we've got an automatic sell button").
// One buy per book and coin (each age is measured once). A0 is their only age group.
export const NEW_COIN = [
  { family: "NEW-5M", at_s: 300, mc_min_usd: 10_000, holders_min: 100, vol_min_usd: 30_000, fees_min_sol: 2, top10: [0.20, 0.30] },   // holders: 150 at 16:07, changed to 100 by the owner at 18:37
  { family: "NEW-10M", at_s: 600, mc_min_usd: 10_000, holders_min: 150, vol_min_usd: 50_000, fees_min_sol: 3.5, top10: [0.20, 0.30] }, // "fees around 3.5" → at least 3.5; top holders taken as the 5-minute book's 20–30%
  // 15 and 20 minutes (owner 25 Nov 2026 23:32 UK, after a coin that first crossed $10K at ~15 minutes was missed): "volume about 100K,
  // fees 5 SOL, top 10 keep it at 20 to 30, holders 200 … four separate books for now". The same numbers at both ages; market cap over
  // $10K as in the other two (he did not restate it).
  { family: "NEW-15M", at_s: 900, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.20, 0.30] },
  { family: "NEW-20M", at_s: 1200, mc_min_usd: 10_000, holders_min: 200, vol_min_usd: 100_000, fees_min_sol: 5, top10: [0.20, 0.30] },
];
// THE COMBINED VIEW (owner 23:27–23:32: "one combined … a separate calculation, so we can work out where the money is"): NOT a
// book and not extra trades — on the site, each coin's FIRST filled buy by any of the new-coin books, i.e. what one book that
// buys a coin once, at the first age it passes, would have made; every row says which age bought it.
export const NEW_ALL = "NEW-COMBINED";
export const NEW_BOOKS = NEW_COIN.map((x) => x.family);
export const NEW_LOOK_S = 20;          // the provider's list of new coins is read this often (it reaches back about a minute at ~35 new coins a minute)
export const NEW_CHECK_LATE_S = 90;    // a coin that could not be measured within this long after its age point is NOT judged (counted "too late") — never judged on later figures
export const NEW_GMGN_WAIT_S = 30;     // the GMGN reading must arrive within this long of being asked for, or the coin is not bought
export const NEW_AGE_SLACK_S = 180;    // GMGN's creation time may put the coin at most this much past the age point when the buy is decided (else: not a new coin by GMGN's clock)
export const NEW_POP = "new-coins";    // how these buys are tagged (entry.pop)
// GMGN IS ASKED ONLY WHEN THE COIN COULD STILL PASS (25 Nov 2026, after the first two hours live): about 90 coins an hour passed
// market cap, holders and volume, nearly all of them with fees near zero and top 10 holders at 4–13% — and that many readings
// crowded the other books' own buy-checks (refusals 17 in two hours against 1 in the three hours before). Jupiter's own
// top-holders figure agreed with GMGN's top 10 to within 3.2 points on every candidate read (median 0.16), so a coin whose
// Jupiter figure is OUTSIDE this wider range is not asked about and not bought (counted "top holders, GMGN not asked").
// Inside it, or when Jupiter gives no figure, GMGN is asked and decides on the rule's own 20–30% as before.
export const NEW_TOP_PRE = [0.15, 0.35];
// AFTER EVERY ROW OF A NEW-COIN BUY IS SOLD its value is still followed for the rest of the 24 hours ("how high did it go"),
// but no longer by one routed quote a minute each (at 7 buys an hour that alone would need more requests than the key's 60 a
// minute within a few hours): every NEW_RUNNER_S seconds the provider's token data is read for all such buys together (100 coins
// a request) and the value is ESTIMATED as price × tokens bought − the transaction cost. No fees or price impact are in it,
// so it is an upper estimate; the buy is marked (runner.est). Open rows are priced by routed quotes exactly as before.
export const NEW_RUNNER_S = 60;
// AFTER THE SALE (owner 26 Nov 2026 06:01–06:07 UK: "can we have a time scale on this… what was the highest we could have got within
// the last hour or 2 hours… to know if we sold too early" · "we don't need 24 hours… 2 hours is fine"). A new-coin buy is followed
// for NEW_FOLLOW_S after its LAST row is sold, looked at every NEW_RUNNER_S seconds — once a minute, as before (owner 06:20 UK: "I just
// need a price, what it could have potentially been. I don't need to be super checking it… it's free") — instead of 24 hours from the
// buy. A coin that is still worth more than it cost at that 2-hour mark — the rare runner — is looked at every
// NEW_FOLLOW_LONG_EVERY_S up to NEW_FOLLOW_LONG_S after the last sale; every other buy is finished at the 2-hour mark.
// Every look is kept as the highest value per NEW_TRACK_S of the buy's life (e.track), from its first sale on, so the page can
// say for every sale how high the coin went in the 15 minutes, the hour and the two hours AFTER it, and when.
// THE RUNNERS LIST (owner 26 Nov 2026 07:18–07:20 UK: "any coins that hit 100k and that we missed, just to have a list of those… and
// to see why we missed them… to make sure we're not missing any runners on our filters"). A coin the new-coin books measured that
// reaches RUN_LINE_USD on the pool feed (a pump.fun coin is on its pool by then — nothing extra is asked of any provider) is
// written down with the time; the page lists the ones that got there within RUN_WINDOW_S of their creation, each with what
// every check said, and — so the list cannot mislead — how many checks each rule rejected and how many of THOSE got there.
export const RUN_LINE_USD = 100_000, RUN_WINDOW_S = 6 * 3600, RUN_PEAK_STEP = 1.1, RUN_LIST = 150;
export const NEW_FOLLOW_S = 2 * 3600, NEW_FOLLOW_LONG_S = 6 * 3600, NEW_FOLLOW_LONG_EVERY_S = 300, NEW_TRACK_S = 30;
export const AFTER_WINDOWS = [["m15", 900], ["h1", 3600], ["h2", 7200]]; // the windows after a sale shown on the page
// A new high from the price alone is an ESTIMATE (price × tokens: no fees, no price impact). When such a high is NEW_CONFIRM_X
// times cost or more and NEW_CONFIRM_STEP above the last confirmed one, ONE real sell quote for the whole original holding is
// asked — what it would actually have fetched — at most NEW_CONFIRM_MAX per look.
// NEW_CONFIRM_MAX = 0: SWITCHED OFF (owner 06:20 UK — a rough price is enough, no extra requests). The code stays for later.
export const NEW_CONFIRM_X = 1.5, NEW_CONFIRM_STEP = 1.1, NEW_CONFIRM_MAX = 0;
export const NEW_LOG_KEEP = 3000;      // measurements of coins over the market-cap line kept for the site and the published file (all of them are in the log file beside the database)

// Families. 21 families × 4 ages + 10 any-age families × 5 ages = 134 book-ages; × 5 stops × 2 exit policies = 1,340 comparisons (VOL100K and DIP15K added in older-11).
// + the four new-coin books in A0 only = 138 book-ages, 1,380 comparisons.
export const FAMILIES = ["AGE-DOUBLE", "LOW4H", "CONT", "SLOW-BUILD", "HH-BREAK", "CONT-STALL", "LOW4H-LIQ25K",
  "FAST-1M", "FAST-3M", "FAST-5M", "FAST-10M", "FAST-30M", "FAST150-1M", "FAST150-3M", "FAST150-5M", "FAST150-10M", "SECOND-WAVE", "HH30-5M", "HH30-10M", "HH15-5M", "HH-BREAK-4H",
  "VOL100K", "VOL300K", "VOL300K-UP", "VOL500K", "VOL500K-UP", "RUG450", "RUG450-BOUNCE", "RUG950", "RUG950-BOUNCE", "DIP15K", ...NEW_BOOKS];
// ANY-AGE BOOKS (older-8, owner's decisions 21 Nov 2026 21:11 UK). Migrated coins only (this feed sees nothing else), any age after
// migration: the first 8 hours (A0) and the four age groups. One entry per family per coin per age group, as everywhere.
// VOL: USD volume over the last VOL_WIN_S seconds (exact observations, rolling) ≥ the threshold; the -UP version also needs the
//      price above the exact price VOL_WIN_S ago. Market cap $40K–$2M at the buy (the owner's upper limit for these books).
// [family, threshold USD, needs price up]
export const VOL = [["VOL100K", 100_000, false], ["VOL300K", 300_000, false], ["VOL300K-UP", 300_000, true], ["VOL500K", 500_000, false], ["VOL500K-UP", 500_000, true]];
export const VOL_WIN_S = 300, VOL_BAND_HI_USD = 2_000_000;
// RUG: the coin's highest observed market cap ≥ the peak threshold, and the market cap FRESHLY crosses down to (1 − RUG_FALL) × that
//      peak, with observation unbroken from the peak to the crossing (the state is in memory only and starts again after any
//      break or restart). "knife" buys at that crossing. "bounce" is armed by it, follows the low, and buys at the first fresh crossing up
//      through RUG_BOUNCE_X × the low within RUG_BOUNCE_EXPIRE_S. Usual band ($40K–$1M) at the buy. The books nest: a $950K peak
//      also qualifies for the $450K books.
// [family, peak threshold USD, kind]
export const RUG = [["RUG450", 450_000, "knife"], ["RUG450-BOUNCE", 450_000, "bounce"], ["RUG950", 950_000, "knife"], ["RUG950-BOUNCE", 950_000, "bounce"]];
export const RUG_FALL = 0.80, RUG_BOUNCE_X = 1.30, RUG_BOUNCE_EXPIRE_S = 24 * 3600, RUG_MIN_PEAK_USD = 450_000;
// DIP15K (older-11, owner 25 Nov 2026 09:32 and 10:43): a coin that HAS BEEN to $100,000 or more and comes down into $5,000–$15,000
//   is bought when its market cap freshly crosses down through DIP_HI_USD (the observation before it above the line, this one at
//   or under it, nothing unobserved in between) and is still at or above DIP_LO_USD — at once, however long the fall took. Any
//   age after migration. It has its OWN band: the $40K floor of the other books does not apply to it.
//   "Has been to $100K": the watched peak (the highest market cap observed without a break — the same state the RUG books keep)
//   is at least DIP_PEAK_USD, OR the run uses the owner's gates, where the provider's all-time high is tested at the buy (gates.mjs).
//   A coin that is already inside the band when it is first seen is not bought there: nothing was watched arriving.
export const DIP = "DIP15K", DIP_HI_USD = 15_000, DIP_LO_USD = 5_000, DIP_PEAK_USD = 100_000;
export const ANY_AGE = new Set([...VOL.map((x) => x[0]), ...RUG.map((x) => x[0]), DIP]);
export const agesOf = (family) => (NEW_BOOKS.includes(family) ? [AGE_YOUNG] : ANY_AGE.has(family) ? ALL_AGES : AGES);
export const POLICIES = ["trail", "scale"];   // trail = the original pure trailing stop; scale = sell half at 2× cost, trail the rest
export const SCALE_AT_X = 2, SCALE_FRACTION = 0.5;
// FAST: fresh crossing of X × the lowest pool spot price in the preceding window (receive-time clock, exact observations)
// [family, window seconds, multiple, seeds SECOND-WAVE]. The 10- and 30-minute books (older-4) use the same exact-observation rules;
// they do NOT seed SECOND-WAVE, which stays "after a 1/3/5-minute double" as in older-3. The longest window (30 min) is inside RAW_KEEP_S.
export const FAST = [["FAST-1M", 60, 2, true], ["FAST-3M", 180, 2, true], ["FAST-5M", 300, 2, true], ["FAST-10M", 600, 2, false], ["FAST-30M", 1800, 2, false],
  ["FAST150-1M", 60, 1.5, false], ["FAST150-3M", 180, 1.5, false], ["FAST150-5M", 300, 1.5, false], ["FAST150-10M", 600, 1.5, false]];
// SECOND-WAVE: seeded by the first 2× FAST trigger in the age group; pullback to ≤ 0.75 × running high freezes that high; buy strictly above it; expires 60 min after the seed
export const SW_PULLBACK = 0.75, SW_EXPIRE_S = 3600;
export const STARTUP_TAG_S = 24 * 3600;       // entries in the first 24 h after the project's first start are tagged "startup" (kept in totals, shown separately)
export const EVIDENCE_OBS_CAP = 1500;         // observations saved with a FAST / SECOND-WAVE trigger (stored once per entry)
export const AGE_DOUBLE_X = 2;
export const LOW4H_WIN_S = 4 * 3600, LOW4H_X = 2;
export const CONT_LOOKBACK_S = 15 * 60, CONT_RISE = 1.30, CONT_HI_WIN_S = 3600, CONT_NEAR_HI = 0.95;
export const SLOW_MIN_ELAPSED_S = 30 * 60, SLOW_MAX_CANDLE_GAIN = 0.20; // gain ABOVE 0.20 rejects; exactly 0.20 allowed
export const HH_HI_WIN_S = 3600, HH_VOL_WIN_S = 15 * 60, HH_BASE_WINDOWS = 16, HH_VOL_X = 2; // 16 × 15 min = the preceding 4 h
// Faster volume breakouts (older-6, owner's decision 21 Nov 2026): the HH-BREAK rule on shorter clocks.
// [family, high window seconds, signal minutes n, baseline buckets K]: price strictly above the preceding high-window high, and
// the volume of the last n COMPLETED minutes ≥ HH_VOL_X × the median of the K adjacent n-minute buckets before them.
// No dollar floor (owner's decision). As in HH-BREAK, a zero baseline (the median bucket had no volume) is recorded and not entered.
export const HH_FAST = [["HH30-5M", 1800, 5, 24], ["HH30-10M", 1800, 10, 12], ["HH15-5M", 900, 5, 12]]; // baselines: 2 h, 2 h, 1 h
export const STALL_AT_S = 3600, STALL_MIN_PEAK_X = 1.15;
// CLOCK BOOKS: a book that shares another book's buys (base) and adds a timed sale to its own exit versions.
//   tag     = the value those versions carry in v.stall (plain versions carry false)
//   minPeak = sold at `at` seconds only if the position never reached this multiple of cost; null = sold at `at` if still open
// CONT-STALL (older-1): CONT's buys, sold at 60 min if never 1.15×.  HH-BREAK-4H (older-7): HH-BREAK's buys, sold at 4 h.
export const CLOCK = {
  "CONT-STALL": { base: "CONT", tag: true, at: STALL_AT_S, minPeak: STALL_MIN_PEAK_X, reason: "stall" },
  "HH-BREAK-4H": { base: "HH-BREAK", tag: "4h", at: 4 * 3600, minPeak: null, reason: "clock" },
};
export const clockTag = (family) => CLOCK[family]?.tag ?? false;
export const clockOf = (tag) => Object.values(CLOCK).find((c) => c.tag === tag) ?? null;
export const LIQ_MIN_USD = 25_000, LIQ_MAX_RT_IMPACT = 0.05;

// Runner outcome tracking (separate from realised profit): liquidation value / stake over 24 h after the fill.
export const RUNNER_X = [2, 3, 5, 10], RUNNER_HORIZON_S = 24 * 3600;
// Severe-loss thresholds shown on the page (−40% is the project's existing severe-loss measure).
export const LOSS_X = [0.40, 0.50, 0.60];

// Memory / storage bounds (not rules; operating limits).
export const RAW_KEEP_S = 65 * 60;            // exact observations kept in memory per coin (covers the 15-min and 60-min windows)
export const RAW_CAP = 6000;                  // per coin; beyond it, older observations within the same second are merged — the merged entry keeps their lowest, highest and last price and its first and last time; the newest observation always stays exact
export const BAR_KEEP_S = 4 * 3600 + 30 * 60; // in-memory minute bars (covers LOW4H's 4 h and HH-BREAK's 4 h 15 min)
export const BAR_RETAIN_DAYS = 10;            // minute bars kept in the database
export const BUYERS_PER_BAR_CAP = 300;
export const QUOTE_CHAIN_TOL = 1e-3;           // quote-side chain check: a mismatch above 0.1% of effective reserves is a discontinuity (smaller = fee dust, counted)
export const FEE_MAX = 0.10;                  // a measured pool fee outside 0–10% is a failed measurement: counted, NOT installed
export const BACKFILL_MAX_HOLE_S = 300;       // back-filled minute bars prove a window only where consecutive bars are ≤ 5 min apart
export const OMIT_DROP_AFTER = 10;             // a sampled token the price provider omits this many times in a row (no position, no setup) leaves the watch list
export const SCALE_QUOTE_MAX_SPREAD_S = 5;    // the routed quotes of one half-sale must have been requested within 5 s of each other
// STREAM FRESHNESS (ninth review, B) — an operating limit for execution trust, NOT a strategy filter and not tuned on results.
// Our clock is receive time; each transaction also carries its block time. Normal delay is about 1.0–1.3 s. Above this limit
// (or with no measurement in the last FEED_MAX_LAG_S seconds, or none since the last connect) the stream is not CURRENT:
// no signal, no peak or stop, no order priced. The same number is the time measurements must stay within the limit before a
// late spell is over. See Engine.noteLag / freshAt.
export const FEED_MAX_LAG_S = 5;
export const CHECKPOINT_S = 1;                // open positions' peaks are saved at most this long after they change
export const BUYER_RAW_KEEP_S = 6 * 60;       // exact per-trade buyer wallets kept this long (the 1/3/5-minute entry measurements)
export const BUYERS_KEEP_S = 20 * 60;          // per-bar buyer wallet lists kept this long (the features read 15 minutes); older bars keep the count only
// TRANSFER-FEE COINS (owner's decision, 22 Nov 2026): a Token-2022 coin whose creator takes a fee on every transfer may be entered
// when that fee is at most this (5%); above it the coin stays blocked. The fee is taken off the paper result twice — off the
// tokens received at the buy and off the proceeds of every sale — and every such trade is marked on the page. Sampled method
// only (pool-state fills do not model the fee). Other transfer restrictions (hooks, freeze, permanent delegate…) stay blocked.
export const XFER_FEE_MAX_BPS = 500;
// THE INCLUSION ASSUMPTION (eighth review, B2): does a routed quote's output already have the coin's transfer fee taken off?
// true  = the quote is net: nothing more is deducted here.  false = the quote is gross: the fee is deducted here, once per transfer.
// MEASURED 22 Nov 2026 21:13 UK on the server (scripts/fee-probe.mjs, quotes only): 8 fee coins (3% and 4.2%) over 8 different
// routes — FluxBeam, Raydium CP, Raydium CLMM, Whirlpool, Meteora DLMM, BisonFi, Kipseli and mixed routes. A 0.2 SOL round trip
// lost 7.9%–10.2% against 0.2%–2.8% for 4 control coins (median 2.4%): the extra loss was 5.5%–7.8%, i.e. about 2 × the coin's fee
// (6.0% / 8.4%) in every case. So Jupiter's quotes ALREADY INCLUDE the transfer fee on both the buy and the sale → true.
// The raw quoted amounts, the fee and this value are still stored on every fill and sale, and the probe can be re-run at any time.
export const XFER_FEE_IN_QUOTE = true;
export const RISK_REFRESH_S = 600; // a sampled coin with a pending or open position has its transfer restrictions read again this often
// Reporting only: every buy of a transfer-fee coin is shown in ONE separate book and left out of the rule books' own totals
// and rows (owner, 22 Nov 2026: "a separate book so we can analyse those separately"). The entry still records the rule(s) that bought it.
export const FEE_BOOK = "FEE-COINS";
// WARM RESTART (owner's decision, 22 Nov 2026): a planned stop writes each coin's price memory to disk and the next start reads
// it back, so a restart no longer empties the hour-scale windows. The time the program was away stays UNOBSERVED: it is kept
// as a gap, and that gap is TOLERATED — for hour-scale windows only — when it is at most this long. Exact (seconds-scale)
// windows and fresh crossings never span it. Longer away than this: the gap is an ordinary outage and nothing spans it.
export const WARM_MAX_GAP_S = 60;
// BUYING AGAIN (older-9, owner's decisions 22 Nov 2026 17:37–17:45 UK). Until now a book bought a coin once per age group, sold or
// not. From older-9 the FIRST buy is exactly as before, and after it the book may buy the coin again whenever its rule fires and
// it no longer holds the coin — judged SEPARATELY ON EACH STOP AND EXIT (the 20% row can be back in while the 60% row still holds
// its first buy). No waiting time (owner: "no wait"). A re-buy carries only the rows that are free, is marked (`again`) and is
// reported apart from first buys everywhere, so the older-8 comparison (first buys only) stays intact.
// REBUY_MAX_PER_DAY is a safety limit for the server, not a strategy rule: one book cannot re-buy one coin more often than this in 24 hours.
export const REBUY_MAX_PER_DAY = 50;

// ───────────────────────── older-11: WHICH BOOKS BUY (owner's decisions 24–25 Nov 2026) ─────────────────────────
// A run chooses its books (main.mjs, OLDER_BOOKS):
//   unset or "legacy" : the 29 books of older-10, exactly as before. VOL100K and DIP15K, the books added in older-11, stay off.
//   "older-11"        : BOOKS_11 below — the owner's list for the scored week (the pool books; the launch-curve books are not
//                       in it because this feed cannot observe or price a coin before it migrates).
//   "A,B,C"           : exactly those books.
// A book that is not active makes NO new buy. Nothing else changes for it: its open positions are managed to their exits by the
// same rules, its history stays in the database and in the reports. Every other book decides exactly as it would have decided
// with all books active (the list is applied to the finished candidates, after every book has been evaluated).
// VOL100K: the VOL rule at $100,000 of volume in 5 minutes, any age after migration, $40K–$2M at the buy (owner, 24 Nov).
export const NEW_IN_11 = ["VOL100K", "DIP15K"];
export const BOOKS_11 = ["HH-BREAK", "HH-BREAK-4H", "VOL100K", "VOL300K", "VOL500K", "FAST-1M", "FAST-3M", "FAST-5M", "RUG450", "RUG950", "LOW4H", "SLOW-BUILD", "DIP15K"];
export const BOOKS_LEGACY = FAMILIES.filter((f) => !NEW_IN_11.includes(f) && !NEW_BOOKS.includes(f)); // the new-coin books are never part of "legacy": they buy only when a run switches them on
/** the active books for a run name; throws on an unknown book or a clock book without the book whose buys it shares */
// THE YOUNGEST AGE OF THE "OLDER" BOOKS IN A RUN (older-11; a run sets it with OLDER_MIN_AGE_H, main.mjs). MIN_AGE_S (8 hours)
// stays the age-group boundary and the default. A run may evaluate the books that normally start at 8 hours from an earlier
// age: MIN_AGE_11_S (6 hours) is the value of the older-11 run. Between that age and 8 hours a coin is in age group A0, as it
// already is for the any-age books; AGE-DOUBLE is not evaluated there (it needs an age-group start, and A0 has none).
// The any-age books (VOL, RUG, DIP15K) are unaffected: they are evaluated from migration on in every run.
export const MIN_AGE_11_S = 6 * 3600;
// what a run name switches on (scripts/start.sh passes these to main.mjs; each can also be set on its own)
export const RUNS = { "older-11": { books: "older-11", gates: "older-11", rebuy: false, min_age_h: MIN_AGE_11_S / 3600 } };
export function booksOf(name) {
  const n = (name ?? "").trim();
  const list = !n || n === "legacy" ? BOOKS_LEGACY : n === "older-11" ? BOOKS_11 : n.split(",").map((x) => x.trim()).filter(Boolean);
  for (const f of list) { if (!FAMILIES.includes(f)) throw new Error(`unknown book "${f}"`); const base = CLOCK[f]?.base; if (base && !list.includes(base)) throw new Error(`${f} shares the buys of ${base}, which is not in the list`); }
  return [...new Set(list)];
}

// ───────────────────────── older-11: THE OWNER'S GATES (decisions of 24–25 Nov 2026) ─────────────────────────
// At a buy signal the engine asks the token-data provider for ONE reading of the coin (gates.mjs). The pending buy is filled
// only if that reading had ARRIVED BY THE TIME OF THE BUY (decision + BUY_DELAY_MS + GATE_WAIT_S) and every gate passes for at
// least one of the books that fired. A reading that is missing, failed or late is never treated as zero: the buy is cancelled
// and the reason recorded; a late reading is still stored on the cancelled entry, marked late, so it can be seen what it said.
// Fractions are 0–1; ranges are inclusive [low, high], high = null for "no upper limit"; exclusiveHi makes the upper limit strict.
//   buy    — the range that admits a buy: the UNION of the owner's main range and his second option
//   main / second — his two options; every filled buy records which of them it satisfies, so both are reported from the same buys
// byFamily — a book's own settings replace the common ones (a clock book uses its base book's). The rug books are defined by a
//   watched peak of $450K / $950K, so "has reached $100K" is not asked of them, and the owner gave them their own top-10 rule (under 12%).
//   Fees of at least 5 SOL apply to every book, the rug books included (owner, 25 Nov 10:43).
// A run switches the gates on with OLDER_GATES=older-11 (main.mjs); without it nothing is asked and nothing is gated.
export const GATE_WAIT_S = 0; // extra seconds after the scheduled buy within which a reading still counts (0 = it must be there at the buy)
export const GATES_11 = {
  top10: { buy: [0.18, 0.30] },                                                    // owner 25 Nov 09:22: "between 18% and 30%"; never under 10% is implied
  bundlers: { buy: [0.05, 0.50], main: [0.07, 0.50], second: [0.05, 0.20] },       // owner 24 Nov 16:02 (7–50%) and 25 Nov 09:22 (second option 5–20%)
  insiders: { buy: [0.025, 0.40], main: [0.025, 0.25], second: [0.025, 0.40] },    // owner 24 Nov 16:02 (2.5–25%) and 25 Nov 09:22 (second option 2.5–40%)
  snipers: { buy: [0, 0.05], exclusiveHi: true },                                  // "snipers under 5%"
  fees_sol: { buy: [5, null] },                                                    // owner 25 Nov 09:22: "fees I want to increase to 5 SOL"
  twitter: true,                                                                   // a Twitter link of any kind (a single tweet counts)
  ath_usd: { buy: [100_000, null] },                                               // "has reached $100K before" — the provider's all-time high
  bothZeroBlocks: true,                                                            // "zero bundles, zero insiders, never buy" (already implied by the minimums)
  byFamily: { // rug books — owner 25 Nov 10:49: top 10 UNDER 12% (read at the buy, i.e. after the fall: the large wallets have sold); no floor; no "$100K" test (their own peak rule is stricter)
    RUG450: { top10: { buy: [0, 0.12], exclusiveHi: true }, ath_usd: null }, RUG950: { top10: { buy: [0, 0.12], exclusiveHi: true }, ath_usd: null },
    "RUG450-BOUNCE": { top10: { buy: [0, 0.12], exclusiveHi: true }, ath_usd: null }, "RUG950-BOUNCE": { top10: { buy: [0, 0.12], exclusiveHi: true }, ath_usd: null } },
};

