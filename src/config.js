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
    ...s("RPC_EXTRA", "").split(",").map((x) => x.trim()).filter(Boolean), // v0.18.59: extra RPC providers (comma-separated URLs) tried after Helius
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
  MOM_PAPER_MC_CAP: n("MOM_PAPER_MC_CAP", 2_000_000), // v0.15: paper-trade only below this; above → alert only (0/24 hit 2x above $500K)
  MOM_BS_MIN: n("MOM_BS_MIN", 1.0),           // v0.15: 5m buy$/sell$ must be >= this (3% hit 2x below 1.0 vs 28% above)
  MOM_MIN_TRADES5: n("MOM_MIN_TRADES5", 10),  // v0.15: sanity — at least this many swaps in the 5m window
  MOM_MIN_WALLETS5: n("MOM_MIN_WALLETS5", 5), // ...from this many distinct wallets
  MOM_MIN_AGE_S: n("MOM_MIN_AGE_S", 60),      // ...and token at least this old (when age is known)
  PS_MAX_SWAP_SOL: n("PS_MAX_SWAP_SOL", 1000), // v0.15: drop PumpSwap swaps above this (decode artefacts on instant graduations)
  GRAD_ALERT_BUYERS: n("GRAD_ALERT_BUYERS", 250), // v0.15: graduation strategy alerts only when distinct buyers >= this (paper-enters all)
  CONF_ALERT_BUYERS: n("CONF_ALERT_BUYERS", 250), // v0.15: confirm alerts only with this many buyers (paper trade always)
  CLIMB_ALERT_BUYERS: n("CLIMB_ALERT_BUYERS", 250), // v0.15: climber alerts only with this many buyers
  MOM_MAX_AGE_D: n("MOM_MAX_AGE_D", 3650), // v0.18.11: any age — Groklet (486d old) did $100K/5m at $304K and 2.58x; the 30-day cap kept momentum out
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
// --- v0.9: wallet database ---
Object.assign(CFG, {
  WB_EARLY_S: n("WB_EARLY_S", 180),        // record buys within first N seconds of launch
  WB_MIN_SOL: n("WB_MIN_SOL", 0.3),
  WB_MAX_PER_TOKEN: n("WB_MAX_PER_TOKEN", 40),
  WB_TOKEN_MIN_MC: n("WB_TOKEN_MIN_MC", 15_000), // only score tokens that reach this MC
  WB_MIN_BUYS: n("WB_MIN_BUYS", 5),
  WB_MIN_AGE_S: n("WB_MIN_AGE_S", 1),        // v0.15.1: leaderboard ignores create-block (0s) buys — bundlers/snipers always "win"
  WATCH_SEED_WALLETS: s("WATCH_SEED_WALLETS", "CZdG7s8FVWVM6Ats8XSJ2R2qRkTKsd7qAtuvHGb1YLXN,BfUE1UcptE2noHrnBYxyqcDbPrboXsA1NZTurr5jd35b,4nHZjd64nCskpL852vcpMkHbYU3ppQ42E4SyZTbBp427").split(",").map((x) => x.trim()).filter(Boolean),
  WATCH_SEED_CREATORS: s("WATCH_SEED_CREATORS", "D8pP1hegfQrND1tpMv1pQJZYyzwnHsiFa9AVLc2Lzoxy,DR8351MpWktoeJPJnZiwTFnRoXkX7qofvKMvWM8FGuWT,9rdgxk4nTtQY6B8GXtjNsuwGQmz5RtMByFFvVpub8gSY,ACowwSv1QQzPbAD2EhjHTYm9FNgpqeUAfex6Zi9NgJNn,H9h9BCMurt5jTxCB9JhsJerVhqtuaHUVgvAFBGUQbMCs").split(",").map((x) => x.trim()).filter(Boolean),
  PROVEN_MIN_BUYS: n("PROVEN_MIN_BUYS", 8),        // v0.17.3: raised from 4 — the volume snipers qualified at 4       // v0.15.3: "proven" wallet = this many resolved non-bundle early buys...
  PROVEN_MIN_5X: n("PROVEN_MIN_5X", 0.5),         // ...with this share reaching 5x within 24h
  PROVEN_WINDOW_S: n("PROVEN_WINDOW_S", 60),
  PROVEN_MIN_SOL: n("PROVEN_MIN_SOL", 0.3),         // v0.17.3: a scored buy must be at least this; alert needs 0.2 SOL
  PROVEN_ALERT_MIN_SOL: n("PROVEN_ALERT_MIN_SOL", 0.2),      // count proven wallets buying within this many seconds of launch
  SWEEP_EVERY_MIN: n("SWEEP_EVERY_MIN", 5),     // v0.15.3: close over-hold paper trades at the real current price
  SWEEP_BATCH: n("SWEEP_BATCH", 60),             // per run (1 RPC read each for curve tokens; DexScreener for graduated)
  SWEEP_MAX_FAILS: n("SWEEP_MAX_FAILS", 3),
  HOLDER_COUNT_DAILY_BUDGET: n("HOLDER_COUNT_DAILY_BUDGET", 600), // v0.18.113: Helius getTokenAccounts pages for the P5 data set's holder counts (coins without a ledger)
  HOLDERS_RPC_DAILY_BUDGET: n("HOLDERS_RPC_DAILY_BUDGET", 1500), // v0.18.5: getTokenLargestAccounts at entry for coins without a ledger
  MOM_FAST_USD: n("MOM_FAST_USD", 50_000), MOM_FAST_WIN_S: n("MOM_FAST_WIN_S", 120), // v0.18.12 "fast" tier: $50K in 2 min (same pace as $125K/5m), fires before the 5m rule on fast movers
  MOM_TIERS: s("MOM_TIERS", "60000,80000").split(",").map(Number), // v0.18.6: silent paper variants of the momentum rule at lower 5m volume
  FLOW_CAP: n("FLOW_CAP", 4), // v0.18.10: flow4 = flow exit with a voluntary sell at this multiple
  FLOW_MIN_VOL: n("FLOW_MIN_VOL", 100_000), FLOW_BS_MIN: n("FLOW_BS_MIN", 1.0), // v0.18.9 flow exit: hold after 1.5x while 5m vol >= this and buy$/sell$ >= this
  MOM_DIP_PCT: n("MOM_DIP_PCT", 0.20), MOM_DIP_WINDOW_S: n("MOM_DIP_WINDOW_S", 600), // dip-entry variant
  MOM_RE_MAX: n("MOM_RE_MAX", 5), MOM_RE_GAP_S: n("MOM_RE_GAP_S", 60), // re-entry variant
  MOM_CT_MC: n("MOM_CT_MC", 60_000), MOM_CT_AGE_S: n("MOM_CT_AGE_S", 360), MOM_CT_SIZE_CV: n("MOM_CT_SIZE_CV", 1.6), // v0.18.7 core-tight tag
  FRESH_WALLET_D: n("FRESH_WALLET_D", 3), FRESH_SAMPLE: n("FRESH_SAMPLE", 25), FRESH_DAILY_BUDGET: n("FRESH_DAILY_BUDGET", 2000), // v0.18.19 fresh-wallet share at entry
  LOWVOL_EXIT_USD: n("LOWVOL_EXIT_USD", 25000), LOWVOL_WARMUP_S: n("LOWVOL_WARMUP_S", 300), // v0.18.36: every open paper position is sold when its 5m volume < $25K (needs 5 min of complete trade data)
  P5_MAX_MC: n("P5_MAX_MC", 2000000), P5E_MAX_MC: n("P5E_MAX_MC", 100000), P5W_MAX_MC: n("P5W_MAX_MC", 250000), P5E_MIN_WALLETS: n("P5E_MIN_WALLETS", 10), // v0.18.50 Project 5 early // v0.18.36 Project 5 market-cap cap
  P5_VOL2M_USD: n("P5_VOL2M_USD", 100000), P5_MIN_AGE_S: n("P5_MIN_AGE_S", 60), // v0.18.35 Project 5: $100K traded inside 2 minutes, coin ≥60 s old, buys ≥ sells, no MC cap
  MOM_CONF_S: n("MOM_CONF_S", 60), MOM_CONF_MIN: n("MOM_CONF_MIN", 1.0), MOM_CONF_LATE_S: n("MOM_CONF_LATE_S", 120), // v0.18.32 Project 4: buy MOM_CONF_S after a core trigger only if price > MOM_CONF_MIN x trigger (first tick up to MOM_CONF_LATE_S)
  MOM_V40_USD: n("MOM_V40_USD", 40_000), MOM_V40_AGE_S: n("MOM_V40_AGE_S", 600), // v0.18.17 core_v40 tag: 1m volume >= $40K and under 10 min old at entry
  MOM_CORE_MC: n("MOM_CORE_MC", 100_000),          // v0.18.4: "core" momentum = $100K/5m trigger, entry below this, first entry
  PREPUMP_WINDOW_S: n("PREPUMP_WINDOW_S", 1800),  // v0.18.2: record wallets that bought in this window before a volume trigger
  DEX_ENABLED: n("DEX_ENABLED", 0),                 // v0.18.126: OFF by default — the Raydium / Meteora / Orca stream was most of the Helius credit burn (19 Oct: 1.6–3.3M a day on the WebSocket) and no book trades those venues; DEX_ENABLED=1 restores it // v0.18: Raydium CPMM/CLMM/LaunchLab + Meteora DLMM + Orca swap feed into momentum
  DEX_RESOLVE_SWAPS: n("DEX_RESOLVE_SWAPS", 30),    // look a pool up (1–2 credits) once it has this many swaps in 5 min
  DEX_POOL_DAILY_BUDGET: n("DEX_POOL_DAILY_BUDGET", 6000),
  DEX_IGNORE_MC: n("DEX_IGNORE_MC", 20_000_000),     // don't feed swaps on tokens above this MC (majors/stables; momentum caps at $2M anyway)
  PS_MIN_POOL_SOL: n("PS_MIN_POOL_SOL", 10),        // v0.17: ignore PumpSwap swaps from pools holding less SOL than this
  W2_CHECKS_S: s("W2_CHECKS_S", "120,180,240").split(",").map(Number), // v0.17 second-wave: ages checked
  W2_MC_MIN: n("W2_MC_MIN", 10_000), W2_MC_MAX: n("W2_MC_MAX", 40_000),
  W2_BUYERS_MIN: n("W2_BUYERS_MIN", 80),           // distinct buyers so far
  W2_NEW60_MIN: n("W2_NEW60_MIN", 30),             // new distinct buyers in the last 60s
  W2_BS_MIN: n("W2_BS_MIN", 1.0),                  // buy$/sell$ over last 60s
  W2_BUNDLE_MAX: n("W2_BUNDLE_MAX", 60),
  W2T_CP_MAX: n("W2T_CP_MAX", 180), W2T_MC_MIN: n("W2T_MC_MIN", 12_000), W2T_MC_MAX: n("W2T_MC_MAX", 25_000), W2T_BS_MIN: n("W2T_BS_MIN", 1.3), W2T_DEV_MIN: n("W2T_DEV_MIN", 0.001), // v0.17.4 "tight" tag on second-wave entries
  W2_ALERT_BUYERS: n("W2_ALERT_BUYERS", 150), W2_ALERT_NEW60: n("W2_ALERT_NEW60", 50), // v0.17.1: alert only the strong ones; paper-trade all
  REV_PEAK_MIN_AGE_S: n("REV_PEAK_MIN_AGE_S", 180),  // v0.17.1: the peak being recovered from must be at least this old
  GR_WINDOW_S: n("GR_WINDOW_S", 900),                 // v0.17.1 graduation runner: within this many seconds of graduation
  GR_VOL5M_USD: n("GR_VOL5M_USD", 80_000), GR_NEW2M_MIN: n("GR_NEW2M_MIN", 30), GR_BS_MIN: n("GR_BS_MIN", 1.0),
  GREC_DRAWDOWN: n("GREC_DRAWDOWN", 0.6),             // v0.17.1 graduation recovery: >= this far below post-graduation peak
  GREC_NEW5M_MIN: n("GREC_NEW5M_MIN", 20),
  SLOW_MIN_AGE_S: n("SLOW_MIN_AGE_S", 600),            // v0.17.2 slow build (base breakout)
  SLOW_DRAWDOWN: n("SLOW_DRAWDOWN", 0.5),               // fell at least this far from peak at some point
  SLOW_SINCE_DUMP_S: n("SLOW_SINCE_DUMP_S", 600),       // the low was at least this long ago (went sideways)
  SLOW_WINDOWS: n("SLOW_WINDOWS", 3),                   // consecutive 5-min windows with rising buyers and volume
  SLOW_OFF_LOW: n("SLOW_OFF_LOW", 0.3),                 // price at least this far above the post-dump low
  SLOW_NEW10M_MIN: n("SLOW_NEW10M_MIN", 30), SLOW_MC_MIN: n("SLOW_MC_MIN", 8_000),
  COMBO_FLOOR_ARM: n("COMBO_FLOOR_ARM", 1.5),         // v0.17.1: floor stop only armed once the position has been up this much
  REV_AGE_MIN_S: n("REV_AGE_MIN_S", 480), REV_AGE_MAX_S: n("REV_AGE_MAX_S", 3600), // v0.17 revival
  REV_DRAWDOWN: n("REV_DRAWDOWN", 0.4),            // price at least this far below peak
  REV_NEW5M_MIN: n("REV_NEW5M_MIN", 20),           // new buyers in last 5m
  REV_VOL_RATIO: n("REV_VOL_RATIO", 1.0),          // vol last 5m / previous 5m
  REV_MC_MIN: n("REV_MC_MIN", 5_000),
  COMBO_FLOOR_MC: n("COMBO_FLOOR_MC", 20_000),     // combined exit: out if MC falls back under this after being above
  CREATOR_GRADS_FLAG: n("CREATOR_GRADS_FLAG", 2), // v0.15.1: flag creators with this many prior graduations on alerts
  WB_MAX_BUYS_PER_DAY: n("WB_MAX_BUYS_PER_DAY", 50),
  WB_RETAIN_D: n("WB_RETAIN_D", 30),
  WB_COPY_MIN_SOL: n("WB_COPY_MIN_SOL", 0.2),  // watched wallet must buy at least this to trigger a copy
});
// --- v0.10: confirmation strategy, burst filter, analysis features ---
Object.assign(CFG, {
  ALERT_REQUIRE_SOCIALS: n("ALERT_REQUIRE_SOCIALS", 0),  // log socials, don't gate alerts (data didn't support the gate)
  CONF_MIN_S: n("CONF_MIN_S", 240),       // confirmation window after raw trigger: from
  CONF_MAX_S: n("CONF_MAX_S", 600),       // ...to
  CONF_MC_MULT: n("CONF_MC_MULT", 1.5),   // MC must be >= this × raw-entry MC
  CONF_BS_RATIO: n("CONF_BS_RATIO", 1.3), // buys/sells over last 5m
  CONF_BUYERS_GROW: n("CONF_BUYERS_GROW", 10), // new distinct buyers in last 5m
  BURST_MIN_AGE_S: n("BURST_MIN_AGE_S", 600),
  BURST_MIN_MC: n("BURST_MIN_MC", 60_000),
});
// --- v0.12: lifecycle sampler, holders, big buys ---
Object.assign(CFG, {
  LIFE_CHECKPOINTS: s("LIFE_CHECKPOINTS", "60,300,900,1800,3600,7200,14400,86400").split(",").map(Number),
  LIFE_HOLDERS_FROM_S: n("LIFE_HOLDERS_FROM_S", 1800),  // snapshot top-10 holders at checkpoints >= this
  LIFE_HOLDERS_MIN_MC: n("LIFE_HOLDERS_MIN_MC", 20_000),
  LIFE_HOLDER_DAILY_BUDGET: n("LIFE_HOLDER_DAILY_BUDGET", 2000),
  BIGBUY_SOL: n("BIGBUY_SOL", 5),
  BIGBUY_BAL_DAILY_BUDGET: n("BIGBUY_BAL_DAILY_BUDGET", 2000),
});
// --- v0.13: climber (slow riser) ---
Object.assign(CFG, {
  CLIMB_STEP: n("CLIMB_STEP", 1.3),          // each checkpoint MC >= this × previous
  CLIMB_CPS: s("CLIMB_CPS", "300,900,1800").split(",").map(Number), // stairs that must rise; entry at the last one
  CLIMB_CPS2: s("CLIMB_CPS2", "900,1800,3600").split(",").map(Number), // second chance at 1h
  CLIMB_MIN_MC: n("CLIMB_MIN_MC", 15_000),
  CLIMB_MAX_BURST_USD: n("CLIMB_MAX_BURST_USD", 30_000), // must never have had a 1m burst above this (else momentum's job)
});
// --- v0.14: runner autopsy ---
Object.assign(CFG, { RUNNER_MIN_MC: n("RUNNER_MIN_MC", 1_000_000) });
// v0.18.176 (owner go 21 Oct 13:50 UK): the old off-page books are switched off — none of these kinds opens a NEW paper position (open ones still close normally; every table and
// code path stays). "momentum" here = the non-core volume trigger (burst / re-entry / MC ≥ MOM_CORE_MC); the core trigger (book E / E2, strategy momentum + core=1) keeps running.
// OFFPAGE_BOOKS=1 re-enables them all.
export const OFF_KINDS = new Set(s("OFFPAGE_BOOKS", "0") === "1" ? [] : ["early", "wave2", "secondwave", "copy", "confirm", "climber", "revival", "gradrec", "gradrun", "slow", "momentum", "momfast", "momdip", "momre", "momconf",
  "sn1", "sn2", "sn3", "sn5", "sn6", "sn6b", "sn7", "sn7b", "sn9", "sn10", "sn11", "sn4b", "p5e50", "p5e80", "p5w30", "p5c5", "p5c10", "mom60", "mom80", "pg", "rev"]); // v0.18.179 (owner, 21 Oct 16:16 UK): the retired books stop opening paper positions too - kept: A (p5e30, AS source), S8 (BL source), S3b/S4 (forward tests), every-graduation + GR, K. Set OFFPAGE_BOOKS=1 to turn everything back on.
