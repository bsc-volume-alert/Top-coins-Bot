// BSC tracker settings. Every value can be overridden in /root/tracker-bsc/.env (same name).
// Strategy parameters mirror the Solana tracker's starting values (src/config.js); amounts in SOL are converted
// to USD at ~$150/SOL. Record everything, gate nothing — the analysis sets the real thresholds.
import { readFileSync } from "node:fs";
export const ENV_FILE = process.env.ENV_FILE || "/root/tracker-bsc/.env";
try { for (const l of readFileSync(ENV_FILE, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const n = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? Number(process.env[k]) : d);
const s = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);
const list = (k, d) => s(k, d).split(",").map((x) => x.trim()).filter(Boolean);

export const C = {
  VERSION: "bsc-1.0.3",
  DB_PATH: s("BSC_DB_PATH", "/root/tracker-bsc/data/bsc.db"),
  NODEREAL_KEY: s("NODEREAL_API_KEY", ""),

  // ---- contracts ----
  FLAP_PORTAL: "0xe2ce6ab80874fa9fa2aae65d277dd6b8e65c9de0",
  OTHER_LAUNCHPADS: { "0x5c952063c7fc8610ffdb798152d69f0b9550762b": "four.meme", "0x37ee8aee29c5efd3c1a7eda6df3f510779928a37": "genius", "0x8e6f8ebbd62b60085b703c40b460dae802edc51b": "genius" },
  WBNB: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  STABLES: { "0x55d398326f99059ff775485246999027b3197955": "USDT", "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "USDC", "0xe9e7cea3dedca5984780bafc599bd69add087d56": "BUSD", "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d": "USD1", "0xc5f0f7b66764f6ec8c8dff7ba683102295e16409": "FDUSD" },
  BNB_USDT_PAIR: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae", // PancakeSwap V2 USDT/WBNB
  PCS_V2_FACTORY: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  TOTAL_SUPPLY: 1e9,                       // Flap tokens: 1,000,000,000 (18 decimals)

  // ---- feed ----
  POLL_FAST_MS: n("BSC_POLL_FAST_MS", 4000), LIVE_FEED: n("BSC_LIVE_FEED", 0), // live sockets off: publicnode delivers nothing, NodeReal charges per event
  NODEREAL_AFTER_S: n("BSC_NODEREAL_AFTER_S", 60), NODEREAL_DAY_CU: n("BSC_NODEREAL_DAY_CU", 300_000), CATCHUP_BLOCKS: n("BSC_CATCHUP_BLOCKS", 6000), NODEREAL_MONTH_CU: n("BSC_NODEREAL_MONTH_CU", 10_000_000), NODEREAL_WARN_CU: n("BSC_NODEREAL_WARN_CU", 8_000_000), SWEEP_MS: n("BSC_SWEEP_MS", 10000),
  MAX_POOLS: n("BSC_MAX_POOLS", 400),      // graduated pools followed at once (most recent / with open trades)

  // ---- paper trading ----
  MAX_HOLD_MIN: n("BSC_MAX_HOLD_MIN", 360),
  SCORECARD_MIN: list("BSC_SCORECARD_MIN", "15,60").map(Number),
  SUMMARY_HOURS: n("BSC_SUMMARY_HOURS", 4), DIGEST_HOUR_LOCAL: n("BSC_DIGEST_HOUR", 9), HEARTBEAT_MIN: n("BSC_HEARTBEAT_MIN", 180),

  // ---- momentum (Solana MOM_* defaults) ----
  VOL5M_USD: n("BSC_VOL5M_USD", 100_000), VOL5M_HOT_USD: n("BSC_VOL5M_HOT_USD", 200_000),
  VOL1M_BURST_USD: n("BSC_VOL1M_BURST_USD", 30_000), BURST_MIN_MC: n("BSC_BURST_MIN_MC", 60_000), BURST_MIN_AGE_S: n("BSC_BURST_MIN_AGE_S", 600),
  MOM_MC_CAP: n("BSC_MOM_MC_CAP", 2_000_000), MOM_BS_MIN: n("BSC_MOM_BS_MIN", 1.0),
  MOM_MIN_TRADES5: n("BSC_MOM_MIN_TRADES5", 10), MOM_MIN_WALLETS5: n("BSC_MOM_MIN_WALLETS5", 5), MOM_MIN_AGE_S: n("BSC_MOM_MIN_AGE_S", 60),
  MOM_COOLDOWN_MIN: n("BSC_MOM_COOLDOWN_MIN", 30), MOM_REENTRY_MAX: n("BSC_MOM_REENTRY_MAX", 2), MOM_REENTRY_QUIET_MIN: n("BSC_MOM_REENTRY_QUIET_MIN", 15),
  ROUTER_SAMPLE: n("BSC_ROUTER_SAMPLE", 40), // trades per momentum trigger checked for router vs direct (tx lookups)

  // ---- second wave (W2_*) ----
  W2_CHECKS_S: list("BSC_W2_CHECKS_S", "120,180,240").map(Number), W2_MC_MIN: n("BSC_W2_MC_MIN", 10_000), W2_MC_MAX: n("BSC_W2_MC_MAX", 40_000),
  W2_BUYERS_MIN: n("BSC_W2_BUYERS_MIN", 80), W2_NEW60_MIN: n("BSC_W2_NEW60_MIN", 30), W2_BS_MIN: n("BSC_W2_BS_MIN", 1.0), W2_BUNDLE_MAX: n("BSC_W2_BUNDLE_MAX", 60),
  W2_ALERT_BUYERS: n("BSC_W2_ALERT_BUYERS", 150), W2_ALERT_NEW60: n("BSC_W2_ALERT_NEW60", 50),

  // ---- revival / graduation runner / graduation recovery / slow build ----
  REV_AGE_MIN_S: n("BSC_REV_AGE_MIN_S", 480), REV_AGE_MAX_S: n("BSC_REV_AGE_MAX_S", 3600), REV_DRAWDOWN: n("BSC_REV_DRAWDOWN", 0.4), REV_PEAK_MIN_AGE_S: n("BSC_REV_PEAK_MIN_AGE_S", 180),
  REV_NEW5M_MIN: n("BSC_REV_NEW5M_MIN", 20), REV_VOL_RATIO: n("BSC_REV_VOL_RATIO", 1.0), REV_MC_MIN: n("BSC_REV_MC_MIN", 5_000),
  GR_WINDOW_S: n("BSC_GR_WINDOW_S", 900), GR_VOL5M_USD: n("BSC_GR_VOL5M_USD", 80_000), GR_NEW2M_MIN: n("BSC_GR_NEW2M_MIN", 30), GR_BS_MIN: n("BSC_GR_BS_MIN", 1.0),
  GREC_DRAWDOWN: n("BSC_GREC_DRAWDOWN", 0.6), GREC_NEW5M_MIN: n("BSC_GREC_NEW5M_MIN", 20),
  SLOW_MIN_AGE_S: n("BSC_SLOW_MIN_AGE_S", 600), SLOW_DRAWDOWN: n("BSC_SLOW_DRAWDOWN", 0.5), SLOW_SINCE_DUMP_S: n("BSC_SLOW_SINCE_DUMP_S", 600), SLOW_WINDOWS: n("BSC_SLOW_WINDOWS", 3),
  SLOW_OFF_LOW: n("BSC_SLOW_OFF_LOW", 0.3), SLOW_NEW10M_MIN: n("BSC_SLOW_NEW10M_MIN", 30), SLOW_MC_MIN: n("BSC_SLOW_MC_MIN", 8_000),

  // ---- silent strategies ----
  EARLY_WINDOW_S: n("BSC_EARLY_WINDOW_S", 180), INFLOW_WINDOW_S: n("BSC_INFLOW_WINDOW_S", 60),
  INFLOW_USD: n("BSC_INFLOW_USD", 1_500), INFLOW_WALLETS: n("BSC_INFLOW_WALLETS", 8), // Solana: 10 SOL / 8 wallets in 60 s
  GRAD_MIN_BUYERS: n("BSC_GRAD_MIN_BUYERS", 5), GRAD_MIN_MC: n("BSC_GRAD_MIN_MC", 20_000), GRAD_ALERT_BUYERS: n("BSC_GRAD_ALERT_BUYERS", 250),

  // ---- wallets / creators ----
  WALLET_WINDOW_S: n("BSC_WALLET_WINDOW_S", 600),     // buys in the first 10 min are scored (24 h forward peak)
  WALLET_MIN_BUYS: n("BSC_WALLET_MIN_BUYS", 4), PROVEN_RATE: n("BSC_PROVEN_RATE", 0.5),
  CREATOR_GRADS_FLAG: n("BSC_CREATOR_GRADS_FLAG", 2),
  BIGBUY_USD: n("BSC_BIGBUY_USD", 1_500),

  // ---- lifecycle checkpoints (seconds after launch) ----
  LIFE_CHECKPOINTS: list("BSC_LIFE_CHECKPOINTS", "60,120,180,240,300,600,900,1800,3600,7200,14400,43200,86400").map(Number),
};
