// spec.mjs — the FROZEN rule constants for the older-coin paper project (older-1, 20 Nov 2026 UK).
// Every number a rule depends on lives here and nowhere else. Changing one is a new spec version (SPEC_VER), never a silent edit.
// The written specification that matches this code: older/docs/SPEC.md.
export const SPEC_VER = "older-5"; // 21 Nov 2026 (afternoon): + a 60% trailing stop (owner's decision; 5 stops, 680 comparison rows) and website-only stake views. Previous: older-4 // 21 Nov 2026: + FAST-10M, FAST-30M, FAST150-10M (owner's decision: fill the gap between the 5-minute and the 4-hour books); SECOND-WAVE seeds unchanged (1/3/5-minute doubles only). Previous: older-3 // 20 Nov 2026 pm: Solana-wide scope (launchpad/exchange-neutral), HH-BREAK completed-minute windows, SECOND-WAVE across age boundaries. Previous: older-2 // 20 Nov 2026: + FAST, FAST150, SECOND-WAVE, scale-out policy, 90-day ceiling, scheduled-time fills (owner + ChatGPT consensus round)

export const STAKE_SOL = 0.2;                 // paper stake per entry
export const TX_COST_SOL = 0.0005;            // declared network/priority cost per transaction side (assumption, not measured for this project)
export const BAND_LO_USD = 40_000, BAND_HI_USD = 1_000_000; // entry market-cap band, inclusive lo, inclusive hi
export const MIN_AGE_S = 8 * 3600;            // since TOKEN creation (not pool creation)

// Age groups: [id, from (incl), to (excl)] in seconds of token age. A4 ends at 90 days (entry ceiling; open positions are not closed by it).
export const AGES = [["A1", 8 * 3600, 16 * 3600], ["A2", 16 * 3600, 24 * 3600], ["A3", 24 * 3600, 36 * 3600], ["A4", 36 * 3600, 90 * 86400]];
export const ageGroupOf = (ageS) => { for (const [id, a, b] of AGES) if (ageS >= a && ageS < b) return id; return null; };
export const ageStartOf = (id) => AGES.find((g) => g[0] === id)[1];

export const STOPS = [0.20, 0.25, 0.30, 0.40, 0.60]; // trailing stops on after-cost liquidation value (60% added in older-5)
// STAKE VIEWS (website only, never a decision input): the page can re-price every pool-priced trade at these stakes from the pool
// reserves saved at its buy, its half-sale and its exit. The paper trade itself is always STAKE_SOL.
export const STAKE_VIEWS = [0.2, 0.5, 1, 2, 5];
export const MAX_HOLD_S = 24 * 3600;          // from the simulated FILL
export const BUY_DELAY_MS = 1000;             // buy scheduled 1 s after the signal
export const SELL_DELAY_MS = 700;             // sell scheduled 0.7 s after an exit trigger
export const BUY_PRICING_TIMEOUT_S = 5;       // no trustworthy pool state within 5 s after the scheduled buy → pricing/data timeout, entry cancelled (NOT "untradeable")
export const SELL_UNRESOLVED_S = 24 * 3600;   // a triggered sale that cannot be priced for 24 h is shown as unresolved exposure (never silently closed)

// Families. 17 families × 4 ages × 5 stops = 340 pure-trailing rows; × 2 exit policies = 680 comparisons.
export const FAMILIES = ["AGE-DOUBLE", "LOW4H", "CONT", "SLOW-BUILD", "HH-BREAK", "CONT-STALL", "LOW4H-LIQ25K",
  "FAST-1M", "FAST-3M", "FAST-5M", "FAST-10M", "FAST-30M", "FAST150-1M", "FAST150-3M", "FAST150-5M", "FAST150-10M", "SECOND-WAVE"];
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
export const STALL_AT_S = 3600, STALL_MIN_PEAK_X = 1.15;
export const LIQ_MIN_USD = 25_000, LIQ_MAX_RT_IMPACT = 0.05;

// Runner outcome tracking (separate from realised profit): liquidation value / stake over 24 h after the fill.
export const RUNNER_X = [2, 3, 5, 10], RUNNER_HORIZON_S = 24 * 3600;
// Severe-loss thresholds shown on the page (−40% is the project's existing severe-loss measure).
export const LOSS_X = [0.40, 0.50, 0.60];

// Memory / storage bounds (not rules; operating limits).
export const RAW_KEEP_S = 65 * 60;            // exact observations kept in memory per coin (covers the 15-min and 60-min windows)
export const RAW_CAP = 6000;                  // per coin; beyond it, observations within the same second are merged (last price, summed volume)
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
