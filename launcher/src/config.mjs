// Launcher settings. Read from /root/tracker/.env (TWITTERAPI_KEY, HELIUS_API_KEY, optional ANTHROPIC_API_KEY) and /root/launcher/.env, then process.env on top.
// Nothing here is a secret: the launch wallet's key lives in KEY_PATH (outside the repo, 0600) and is never printed, logged or sent.
import "./env.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const HOME = process.env.LAUNCH_HOME || "/root/launcher";
try { if (existsSync(join(HOME, ".env"))) for (const l of readFileSync(join(HOME, ".env"), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !l.trim().startsWith("#") && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const s = (k, d) => (process.env[k] != null && process.env[k] !== "" ? process.env[k] : d);
const n = (k, d) => { const v = Number(process.env[k]); return process.env[k] != null && process.env[k] !== "" && Number.isFinite(v) ? v : d; };

// The owner's Phantom wallet — the ONLY address the launcher ever sends SOL to (CLAUDE.md standing rule). Not configurable on purpose.
export const PHANTOM = "ARNZSdpFx5PAZBNWK7UJ1pR8P9cK7jNmgX9YwY3rAZXz";

export const CFG = {
  // paper  = record what it would launch, no transactions built
  // shadow = also build every create+buy transaction and simulate it on mainnet (nothing signed, nothing spent) — the default
  // live   = sign and send. Set by the owner only (LAUNCH_MODE=live in /root/launcher/.env), never by a code push on its own.
  MODE: s("LAUNCH_MODE", "shadow"),
  STAKE_SOL: n("LAUNCH_STAKE_SOL", 0.1),           // owner, 31 Oct 01:19 UK: back to 0.1 SOL a launch (0.05 saves ~0.001 a dead coin and halves the position)
  DAILY_CAP: n("LAUNCH_DAILY_CAP", 0),             // live launches per UK day (0 = no cap — owner, 30 Oct 21:59 UK: "keep going until you run out"; MIN_BALANCE_SOL is the stop)
  DEAD_MIN: n("LAUNCH_DEAD_MIN", 10),              // owner, 31 Oct 01:15 UK: at 10 min, fewer than MIN_BUYS buys by others → sell back
  MIN_BUYS: n("LAUNCH_MIN_BUYS", 5),
  REPEAT_H: n("LAUNCH_REPEAT_H", 6),                 // owner, 31 Oct 00:52 UK: never launch the same name or ticker twice within 6 h
  QUIET_MIN: n("LAUNCH_QUIET_MIN", 30),            // others bought, then no trade at all for 30 min → sell (the coin has stopped)
  TP_X: n("LAUNCH_TP_X", 3),                       // take-profit: at 3x the stake sell TP_FRACTION of the tokens once, keep the rest (0 = off)
  TP_FRACTION: n("LAUNCH_TP_FRACTION", 0.5),
  MIN_BALANCE_SOL: n("LAUNCH_MIN_BALANCE_SOL", 0.15), // below this the wallet can't pay stake + deployment + fees → record only (the stop when the money runs out)
  SWEEP_KEEP_SOL: n("LAUNCH_SWEEP_KEEP_SOL", 1),   // owner, 20:14 UK: anything above 1 SOL goes to his Phantom
  FEE_COLLECT_MIN_SOL: n("LAUNCH_FEE_COLLECT_MIN_SOL", 0.005),
  SLIP: n("LAUNCH_SLIP", 0.05),                    // our buy is in the create transaction, so nobody can move the price first; 5% covers rounding
  SELL_SLIP: n("LAUNCH_SELL_SLIP", 0.30),
  CU_LIMIT: n("LAUNCH_CU_LIMIT", 400_000),
  CU_PRICE: n("LAUNCH_CU_PRICE", 1_500_000),       // micro-lamports per CU: 400k × 1.5 = 0.0006 SOL priority fee
  TIP_SOL: n("LAUNCH_TIP_SOL", 0.001),             // Helius Sender needs ≥ 0.001
  ACCOUNTS: s("LAUNCH_ACCOUNTS", "").split(",").map((x) => x.trim().replace(/^@/, "").toLowerCase()).filter(Boolean), // empty = every account the stream sends
  SKIP_RETWEETS: s("LAUNCH_SKIP_RETWEETS", "0") === "1",
  TWITTER_KEY: s("TWITTERAPI_KEY", ""),
  WS_URL: s("TWITTERAPI_WS", "wss://ws.twitterapi.io/twitter/tweet/websocket"),
  REST: s("TWITTERAPI_REST", "https://api.twitterapi.io"),
  AI_KEY: s("ANTHROPIC_API_KEY", ""),
  AI_MODEL: s("LAUNCH_AI_MODEL", "claude-haiku-5-5"),
  HELIUS_KEY: s("HELIUS_API_KEY", ""),
  RPC_URL: s("LAUNCH_RPC_URL", process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : "https://api.mainnet-beta.solana.com"),
  SENDER_URL: s("LAUNCH_SENDER_URL", `http://ewr-sender.helius-rpc.com/fast${process.env.HELIUS_API_KEY ? `?api-key=${process.env.HELIUS_API_KEY}` : ""}`),
  IPFS_URL: s("LAUNCH_IPFS_URL", "https://pump.fun/api/ipfs"),
  KEY_PATH: s("LAUNCH_KEY_PATH", join(HOME, "keypair.json")),
  SIM_PAYER_KEYFILE: s("LAUNCH_SIM_PAYER_KEYFILE", "/root/executor/keypair.json"), // shadow only: a funded wallet's PUBLIC key stands in as payer while ours is empty
  DB_PATH: s("LAUNCH_DB", join(HOME, "launcher.db")),
  TRACKER_DB: s("DB_PATH", "/root/tracker/data/tracker.db"),
  REQ_DIR: s("LAUNCH_REQ_DIR", join(HOME, "requests")),      // the website drops relaunch / sell requests here
  OUT_DIR: s("LAUNCH_OUT", "/root/tracker/data/launcher_out"),
  TG_TOKEN: s("TG_BOT_TOKEN", ""), TG_CHAT: s("TG_CHAT_ID", ""),
  SMOKE: !!process.env.LAUNCH_SMOKE,
};
export const lam = (sol) => Math.round(sol * 1e9);
export const sol = (l) => Number(l) / 1e9;
