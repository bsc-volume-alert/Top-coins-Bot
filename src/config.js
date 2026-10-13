import "./env.js";
const n = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? Number(process.env[k]) : d);
const s = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);
export const CFG = {
  PUMP_PROGRAM: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  HELIUS_KEY: s("HELIUS_API_KEY", ""),
  WS_URLS: [
    ...(s("HELIUS_API_KEY", "") ? [`wss://mainnet.helius-rpc.com/?api-key=${s("HELIUS_API_KEY")}`] : []),
    "wss://api.mainnet-beta.solana.com",
  ],
  RPC_URLS: [
    ...(s("HELIUS_API_KEY", "") ? [`https://mainnet.helius-rpc.com/?api-key=${s("HELIUS_API_KEY")}`] : []),
    "https://api.mainnet-beta.solana.com",
  ],
  DB_PATH: s("DB_PATH", "/root/tracker/data/tracker.db"),
  // Layer-1 gate: a launch is "prepared" if bundle >= pct AND bundle SOL >= sol
  BUNDLE_PCT_MIN: n("BUNDLE_PCT_MIN", 40),
  BUNDLE_SOL_MIN: n("BUNDLE_SOL_MIN", 20),
  BUNDLE_SLOTS: n("BUNDLE_SLOTS", 0),          // buys within create_slot + N count as bundle (0 = same slot only)
  FINALIZE_MS: n("FINALIZE_MS", 4000),         // wait before computing bundle stats
  TRACK_MIN: n("TRACK_MIN", 30),               // keep tier-1 token trades for this many minutes
  TOTAL_SUPPLY: 1_000_000_000,
  TG_TIER1_ALERTS: n("TG_TIER1_ALERTS", 1),
  TG_TIER1_SOL_MIN: n("TG_TIER1_SOL_MIN", 60),   // only ping Telegram for prepared launches with at least this much bundle SOL
  HEARTBEAT_MIN: n("HEARTBEAT_MIN", 30),
};
// --- hand-off / paper trading ---
Object.assign(CFG, {
  HANDOFF_MIN: n("HANDOFF_MIN", 3),            // hand-offs needed to trigger paper entry
  HANDOFF_WINDOW_MIN: n("HANDOFF_WINDOW_MIN", 10), // ...within this many minutes of launch
  HANDOFF_SLOTS: n("HANDOFF_SLOTS", 2),        // cross-tx match: buy within N slots after sell
  HANDOFF_TOL: n("HANDOFF_TOL", 0.15),         // token amount tolerance for cross-tx match
  FRESH_MAX_AGE_S: n("FRESH_MAX_AGE_S", 86400),// wallet first tx younger than this = fresh
  EXIT_OUTFLOW_PCT: n("EXIT_OUTFLOW_PCT", 20), // cluster net SOL outflow > this % of bundle SOL = exit
  TSL_PCT: n("TSL_PCT", 40),                   // paper exit: drop from peak
  MAX_HOLD_MIN: n("MAX_HOLD_MIN", 360),
  RPC_DAILY_BUDGET: n("RPC_DAILY_BUDGET", 20000), // max credits/day for wallet lookups
});
// --- v0.3: early-inflow entry, parallel paper exits ---
Object.assign(CFG, {
  ENTRY_WINDOW_MIN: n("ENTRY_WINDOW_MIN", 3),   // inflow trigger only within first N minutes after launch
  INFLOW_SOL: n("INFLOW_SOL", 10),              // buys (SOL) in the last 60s, excluding create slot
  INFLOW_WALLETS: n("INFLOW_WALLETS", 8),       // distinct buyers in that window
  INFLOW_WINDOW_S: n("INFLOW_WINDOW_S", 60),
  TRACK_MIN_T0: n("TRACK_MIN_T0", 5),           // unbundled tokens: keep in memory this long unless a position opens
  FACTORY_WINDOW_MIN: n("FACTORY_WINDOW_MIN", 10), // same creator, >=2 launches within this = factory flag
  TP_MULT: n("TP_MULT", 2),                     // take-profit variant
  GRAD_VTOK: n("GRAD_VTOK", 285_000_000),       // virtual token reserves at/below this = curve complete (graduated)
});
// --- v0.3.2: alert gating, scorecards, digest ---
Object.assign(CFG, {
  ALERT_INFLOW_SOL: n("ALERT_INFLOW_SOL", 20),     // Telegram only if inflow >= this (or tier-1)
  ALERT_INFLOW_WALLETS: n("ALERT_INFLOW_WALLETS", 15),
  ALERT_REQUIRE_SOCIALS: n("ALERT_REQUIRE_SOCIALS", 1),
  SCORECARD_MIN: s("SCORECARD_MIN", "5,15").split(",").map(Number),
  FLAT_MC_PCT: n("FLAT_MC_PCT", 20),               // MC up less than this at +5m = flat/dead
  NO_NEW_WALLETS_SOL_PER_BUYER: n("NO_NEW_WALLETS_SOL_PER_BUYER", 1.5), // inflow/buyers above this with few buyers = churn
  NO_NEW_WALLETS_MAX_BUYERS: n("NO_NEW_WALLETS_MAX_BUYERS", 15),
  DIGEST_HOUR_LOCAL: n("DIGEST_HOUR_LOCAL", 9),    // Europe/London
});
Object.assign(CFG, { PUMPSWAP_ENABLED: n("PUMPSWAP_ENABLED", 1) });
Object.assign(CFG, {
  PS_RESOLVE_SOL: n("PS_RESOLVE_SOL", 30),         // look up a pool's token only once it has traded >= this SOL in 5 min
  PS_POOL_DAILY_BUDGET: n("PS_POOL_DAILY_BUDGET", 5000),
  PS_RESOLVE_CONCURRENCY: n("PS_RESOLVE_CONCURRENCY", 2),
});
// --- v0.5: momentum (volume) strategy ---
Object.assign(CFG, {
  VOL5M_USD: n("VOL5M_USD", 100_000),
  VOL5M_HOT_USD: n("VOL5M_HOT_USD", 200_000),
  VOL1M_BURST_USD: n("VOL1M_BURST_USD", 30_000),
  MOM_MC_CAP: n("MOM_MC_CAP", 2_000_000),
  MOM_MAX_AGE_D: n("MOM_MAX_AGE_D", 30),
  MOM_COOLDOWN_MIN: n("MOM_COOLDOWN_MIN", 30),
  MOM_MAX_HOLD_MIN: n("MOM_MAX_HOLD_MIN", 360),
  MOM_REENTRY_MAX: n("MOM_REENTRY_MAX", 2),
  MOM_REENTRY_QUIET_MIN: n("MOM_REENTRY_QUIET_MIN", 15),
  MOM_SCORECARD_MIN: s("MOM_SCORECARD_MIN", "15,60").split(",").map(Number),
  SUMMARY_HOURS: n("SUMMARY_HOURS", 4),
  PS_RESOLVE_SOL: n("PS_RESOLVE_SOL", 100),
});
// --- v0.6: second wave, levels ---
Object.assign(CFG, {
  LEVELS_USD: s("LEVELS_USD", "69000,100000,250000,500000,1000000,2000000").split(",").map(Number),
  LEVEL_SELL_PCT: n("LEVEL_SELL_PCT", 0.97),     // sell slice at 97% of each level
  LEVEL_SLICE: n("LEVEL_SLICE", 0.25),           // 25% of position per level crossed (rest trails 60%)
  WALL_WARN_PCT: n("WALL_WARN_PCT", 15),         // warn if next level within this % above entry MC
  SW_FADE_FRAC: n("SW_FADE_FRAC", 0.25),         // first wave faded: 60s inflow < this × wave peak
  SW_QUIET_MIN: n("SW_QUIET_MIN", 5),            // ...for at least this long
  SW_CLUSTER_FLAT_MIN: n("SW_CLUSTER_FLAT_MIN", 5), // cluster net outflow unchanged for this long
  SW_INFLOW_SOL: n("SW_INFLOW_SOL", 8),          // second wave: 60s inflow back over this
  SW_INFLOW_WALLETS: n("SW_INFLOW_WALLETS", 6),  // ...from this many distinct new wallets
  SW_WINDOW_MIN: n("SW_WINDOW_MIN", 30),         // second wave must happen within tracking window
  MOM_REENTRY_RECLAIM: n("MOM_REENTRY_RECLAIM", 1), // re-entry must reclaim the last rejected level
});
// --- v0.7: burst trigger, $1M exits, cluster holdings ---
Object.assign(CFG, {
  BURST_TRIGGER: n("BURST_TRIGGER", 1),           // 1-min burst is an entry trigger in its own right
  M1_EXIT_USD: n("M1_EXIT_USD", 970_000),         // "$1M all-out" sells at this MC
  M1_HOLD_VOL5M: n("M1_HOLD_VOL5M", 200_000),     // volume-aware: hold through $1M if 5m vol >= this
});
// --- v0.8 ---
Object.assign(CFG, {
  VOLSTOP_FRAC: n("VOLSTOP_FRAC", 0.5),       // grey zone: stay in if 5m vol >= this × vol at entry
  VOLSTOP_EXIT_USD: n("VOLSTOP_EXIT_USD", 20_000),  // 5m vol below this = out
  VOLSTOP_STAY_USD: n("VOLSTOP_STAY_USD", 50_000),  // 5m vol above this (and ratio ok) = stay
  VOLSTOP_SELL_RATIO: n("VOLSTOP_SELL_RATIO", 1.6), // sells/buys (USD) above this = out
  VOLSTOP_HARD: n("VOLSTOP_HARD", 0.80),      // ...but always out at -80%
  AFTER_CLOSE_H: n("AFTER_CLOSE_H", 24),
  GRAD_HANDOVER: n("GRAD_HANDOVER", 1),
});
