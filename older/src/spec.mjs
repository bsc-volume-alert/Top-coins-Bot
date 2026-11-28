// spec.mjs — the FROZEN rule constants for the older-coin paper project (older-1, 20 Nov 2026 UK).
// Every number a rule depends on lives here and nowhere else. Changing one is a new spec version (SPEC_VER), never a silent edit.
// The written specification that matches this code: older/docs/SPEC.md.
export const SPEC_VER = "older-9"; // 22 Nov 2026 17:40 UK: + BUYING AGAIN (owner's decision) — a book that has bought a coin may buy it again, on any stop on which it no longer holds it (see REBUY below). The first buy per book, coin and age group is unchanged.
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

export const STOPS = [0.20, 0.25, 0.30, 0.40, 0.60]; // trailing stops on after-cost liquidation value (60% added in older-5)
// STAKE VIEWS (website only, never a decision input): the page can re-price every pool-priced trade at these stakes from the pool
// reserves saved at its buy, its half-sale and its exit. The paper trade itself is always STAKE_SOL.
export const STAKE_VIEWS = [0.2, 0.5, 1, 2, 5];
export const MAX_HOLD_S = 24 * 3600;          // from the simulated FILL
export const BUY_DELAY_MS = 1000;             // buy scheduled 1 s after the signal
export const SELL_DELAY_MS = 700;             // sell scheduled 0.7 s after an exit trigger
export const BUY_PRICING_TIMEOUT_S = 5;       // no trustworthy pool state within 5 s after the scheduled buy → pricing/data timeout, entry cancelled (NOT "untradeable")
export const SELL_UNRESOLVED_S = 24 * 3600;   // a triggered sale that cannot be priced for 24 h is shown as unresolved exposure (never silently closed)

// Families. 21 families × 4 ages + 8 any-age families × 5 ages = 124 book-ages; × 5 stops × 2 exit policies = 1,240 comparisons.
export const FAMILIES = ["AGE-DOUBLE", "LOW4H", "CONT", "SLOW-BUILD", "HH-BREAK", "CONT-STALL", "LOW4H-LIQ25K",
  "FAST-1M", "FAST-3M", "FAST-5M", "FAST-10M", "FAST-30M", "FAST150-1M", "FAST150-3M", "FAST150-5M", "FAST150-10M", "SECOND-WAVE", "HH30-5M", "HH30-10M", "HH15-5M", "HH-BREAK-4H",
  "VOL300K", "VOL300K-UP", "VOL500K", "VOL500K-UP", "RUG450", "RUG450-BOUNCE", "RUG950", "RUG950-BOUNCE"];
// ANY-AGE BOOKS (older-8, owner's decisions 21 Nov 2026 21:11 UK). Migrated coins only (this feed sees nothing else), any age after
// migration: the first 8 hours (A0) and the four age groups. One entry per family per coin per age group, as everywhere.
// VOL: USD volume over the last VOL_WIN_S seconds (exact observations, rolling) ≥ the threshold; the -UP version also needs the
//      price above the exact price VOL_WIN_S ago. Market cap $40K–$2M at the buy (the owner's upper limit for these books).
// [family, threshold USD, needs price up]
export const VOL = [["VOL300K", 300_000, false], ["VOL300K-UP", 300_000, true], ["VOL500K", 500_000, false], ["VOL500K-UP", 500_000, true]];
export const VOL_WIN_S = 300, VOL_BAND_HI_USD = 2_000_000;
// RUG: the coin's highest observed market cap ≥ the peak threshold, and the market cap FRESHLY crosses down to (1 − RUG_FALL) × that
//      peak, with observation unbroken from the peak to the crossing (the state is in memory only and starts again after any
//      break or restart). "knife" buys at that crossing. "bounce" is armed by it, follows the low, and buys at the first fresh crossing up
//      through RUG_BOUNCE_X × the low within RUG_BOUNCE_EXPIRE_S. Usual band ($40K–$1M) at the buy. The books nest: a $950K peak
//      also qualifies for the $450K books.
// [family, peak threshold USD, kind]
export const RUG = [["RUG450", 450_000, "knife"], ["RUG450-BOUNCE", 450_000, "bounce"], ["RUG950", 950_000, "knife"], ["RUG950-BOUNCE", 950_000, "bounce"]];
export const RUG_FALL = 0.80, RUG_BOUNCE_X = 1.30, RUG_BOUNCE_EXPIRE_S = 24 * 3600, RUG_MIN_PEAK_USD = 450_000;
export const ANY_AGE = new Set([...VOL.map((x) => x[0]), ...RUG.map((x) => x[0])]);
export const agesOf = (family) => (ANY_AGE.has(family) ? ALL_AGES : AGES);
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

