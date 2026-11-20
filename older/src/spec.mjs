// spec.mjs — the FROZEN rule constants for the older-coin paper project (older-1, 20 Nov 2026 UK).
// Every number a rule depends on lives here and nowhere else. Changing one is a new spec version (SPEC_VER), never a silent edit.
// The written specification that matches this code: older/docs/SPEC.md.
export const SPEC_VER = "older-1";

export const STAKE_SOL = 0.2;                 // paper stake per entry
export const TX_COST_SOL = 0.0005;            // declared network/priority cost per transaction side (assumption, not measured for this project)
export const BAND_LO_USD = 40_000, BAND_HI_USD = 1_000_000; // entry market-cap band, inclusive lo, inclusive hi
export const MIN_AGE_S = 8 * 3600;            // since TOKEN creation (not pool creation)

// Age groups: [id, from (incl), to (excl)] in seconds of token age. A4 has no upper limit.
export const AGES = [["A1", 8 * 3600, 16 * 3600], ["A2", 16 * 3600, 24 * 3600], ["A3", 24 * 3600, 36 * 3600], ["A4", 36 * 3600, Infinity]];
export const ageGroupOf = (ageS) => { for (const [id, a, b] of AGES) if (ageS >= a && ageS < b) return id; return null; };
export const ageStartOf = (id) => AGES.find((g) => g[0] === id)[1];

export const STOPS = [0.20, 0.25, 0.30, 0.40]; // trailing stops on after-cost liquidation value
export const MAX_HOLD_S = 24 * 3600;          // from the simulated FILL
export const BUY_DELAY_MS = 1000;             // buy scheduled 1 s after the signal
export const SELL_DELAY_MS = 700;             // sell scheduled 0.7 s after an exit trigger
export const ENTRY_STATE_MAX_WAIT_S = 600;    // no executable pool state within 10 min of the scheduled buy → failed fill (recorded)

// Families. Seven families × four ages × four stops = 112 result rows.
export const FAMILIES = ["AGE-DOUBLE", "LOW4H", "CONT", "SLOW-BUILD", "HH-BREAK", "CONT-STALL", "LOW4H-LIQ25K"];
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
