// Executor settings. Reads the tracker's .env (Helius key, Telegram) and the executor's own .env, then process.env on top.
// Nothing here is a secret: the wallet key lives in KEY_PATH (outside the repo) and is never logged.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const EXEC_HOME = process.env.EXEC_HOME || "/root/executor";
const TRACKER_HOME = process.env.TRACKER_HOME || "/root/tracker";
function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || line.trim().startsWith("#")) continue;
    if (process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(join(TRACKER_HOME, ".env")); loadEnv(join(EXEC_HOME, ".env"));

const s = (k, d) => (process.env[k] != null && process.env[k] !== "" ? process.env[k] : d);
const n = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== "" ? v : d; };

export const CFG = {
  MODE: s("EXEC_MODE", "shadow"),                 // off | shadow (build + simulate, sign nothing) | live
  STRATEGY: s("EXEC_STRATEGY", "p5e30"),          // which paper book's triggers to follow (p5e30 = Project 5; p5e50 = Strict)
  EXIT: s("EXEC_EXIT", "h5"),                     // which recorded exit to follow when it fires in the tracker: h5 (hold-5) | flow4 (runner)
  STAKE_SOL: n("EXEC_STAKE_SOL", 0.1),
  MAX_OPEN: n("EXEC_MAX_OPEN", 4),
  DAILY_STOP_STAKES: n("EXEC_DAILY_STOP_STAKES", 6), // buying stops for the UTC day after this many stakes lost (net)
  SLIP_BUY: n("EXEC_SLIP_BUY", 0.20),             // 20%: tight slippage misses the fastest coins — the winners
  SLIP_SELL: n("EXEC_SLIP_SELL", 0.15),
  SLIP_STOP: n("EXEC_SLIP_STOP", 0.30),           // stop sells into a dump: not selling is worse than a bad price
  TIP_SOL: n("EXEC_TIP_SOL", 0.001),              // Helius Sender full route needs ≥ 0.001
  TIP_RETRY_SOL: n("EXEC_TIP_RETRY_SOL", 0.002),
  CU_LIMIT: n("EXEC_CU_LIMIT", 250_000),
  CU_PRICE: n("EXEC_CU_PRICE", 2_000_000),        // micro-lamports per CU: 250k CU × 2 lamports = 0.0005 SOL priority fee
  CU_PRICE_RETRY: n("EXEC_CU_PRICE_RETRY", 6_000_000),
  FEED_LAG_MAX_MS: n("EXEC_FEED_LAG_MAX_MS", 2000), // no buys when the tracker's feed is this far behind the chain
  TRIGGER_MAX_AGE_MS: n("EXEC_TRIGGER_MAX_AGE_MS", 4000), // a trigger older than this (queued while we were busy) is not bought
  FALLBACK_SELL_MIN: n("EXEC_FALLBACK_SELL_MIN", 7), // sell anyway if the tracker has not told us to exit by then (hold-5 is 5 min)
  SWEEP_TO: s("EXEC_SWEEP_TO", ""),               // cold / Phantom address for the daily sweep (public address)
  SWEEP_CEILING_SOL: n("EXEC_SWEEP_CEILING_SOL", 0), // 0 = no sweeping
  HELIUS_KEY: s("HELIUS_API_KEY", ""),
  RPC_URL: s("EXEC_RPC_URL", process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : "https://api.mainnet-beta.solana.com"),
  SENDER_URL: s("EXEC_SENDER_URL", `http://ewr-sender.helius-rpc.com/fast${process.env.HELIUS_API_KEY ? `?api-key=${process.env.HELIUS_API_KEY}` : ""}`), // Newark — the droplet is NYC1
  TG_TOKEN: s("TG_BOT_TOKEN", ""), TG_CHAT: s("TG_CHAT_ID", ""),
  KEY_PATH: s("EXEC_KEY_PATH", join(EXEC_HOME, "keypair.json")),
  DB_PATH: s("EXEC_DB_PATH", join(EXEC_HOME, "executor.db")),
  SOCK: s("EXEC_SOCK", join(EXEC_HOME, "exec.sock")),
  SMOKE: !!process.env.EXEC_SMOKE,
};
export const lamports = (sol) => Math.round(sol * 1e9);
export const sol = (lam) => Number(lam) / 1e9;
