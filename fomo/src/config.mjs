import "./env.mjs";
const n = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? Number(process.env[k]) : d);
const s = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);
export const CFG = {
  // fomo's Solana signer / fee payer (Bitquery, Oct 2026: signs and pays gas for every fomo trade). Rotatable from .env if fomo changes it.
  SIGNER: s("FOMO_SIGNER", "AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51"),
  HELIUS_KEY: s("HELIUS_API_KEY", ""),
  PUBLIC_WS: s("FOMO_PUBLIC_WS", "wss://api.mainnet-beta.solana.com"),
  WS_MODE: s("FOMO_WS", "auto"),                 // public | helius | auto (public first; Helius when the public socket goes quiet, capped per day)
  HELIUS_NOTIF_CAP: n("FOMO_HELIUS_NOTIF_CAP", 300_000), // firehose notifications a day allowed on Helius in auto mode (in case Helius bills them)
  DECODE_BUDGET: n("FOMO_DECODE_BUDGET", 50_000), // getTransaction credits a day: buyer wallets for top coins + a sample, and watched-wallet fills
  POOL_BUDGET: n("FOMO_POOL_BUDGET", 3_000),      // pool → mint lookups a day (1 credit each, cached for ever)
  SAMPLE_1_IN: n("FOMO_SAMPLE_1_IN", 20),         // 1-in-N of ordinary firehose trades get the buyer wallet decoded
  TOP_N_FULL: n("FOMO_TOP_N_FULL", 30),           // coins in the 1-h top N get every buyer decoded (exact unique-buyer counts)
  PORT: n("FOMO_PORT", 8789),
  DB_PATH: s("FOMO_DB_PATH", "/root/tracker/data/fomo.db"),
  RPC_URLS: [
    ...(s("HELIUS_API_KEY", "") ? [`https://mainnet.helius-rpc.com/?api-key=${s("HELIUS_API_KEY")}`] : []),
    ...s("RPC_EXTRA", "").split(",").map((x) => x.trim()).filter(Boolean),
    "https://api.mainnet-beta.solana.com",
  ],
  HANDLES: s("FOMO_HANDLES", "").split(",").map((x) => x.trim()).filter(Boolean),
  WALLETS: s("FOMO_WALLETS", "").split(",").map((x) => x.trim()).filter(Boolean), // seed watched wallets (address[:label])
  COPE_KEY: s("COPE_KEY", ""),
  PRICE_EVERY_S: n("FOMO_PRICE_EVERY_S", 10),
  MAX_HOLD_S: n("FOMO_MAX_HOLD_S", 6 * 3600),
  FLOW_KEEP_D: n("FOMO_FLOW_KEEP_D", 7),           // raw flow rows kept this many days; hourly aggregates 90 days
  TG_TOKEN: s("TG_BOT_TOKEN", ""), TG_CHAT: s("TG_CHAT_ID", ""),
  SMOKE: !!process.env.FOMO_SMOKE,
};
export const QUOTES = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]); // WSOL, USDC, USDT
export const WSOL = "So11111111111111111111111111111111111111112", USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
