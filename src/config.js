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
