// Robinhood Chain tracker settings. Every value can be overridden in /root/tracker-rh/.env (same name).
// Stage 0 = probe: proves the bot, the nodes and the feed work, and measures the chain before any strategy is built.
import { readFileSync } from "node:fs";
export const ENV_FILE = process.env.ENV_FILE || "/root/tracker-rh/.env";
try { for (const l of readFileSync(ENV_FILE, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const n = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? Number(process.env[k]) : d);
const s = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);

export const C = {
  VERSION: "rh-0.1.0",
  CHAIN_ID: 4663,
  ALCHEMY_KEY: s("ALCHEMY_API_KEY", ""),
  PUBLIC_RPC: s("RH_PUBLIC_RPC", "https://rpc.mainnet.chain.robinhood.com"),
  EXPLORER: "https://robinhoodchain.blockscout.com",

  // ---- contracts (from the brief; event layouts are discovered by the probe, not assumed) ----
  PONS: {
    "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e": "Pons factory",
    "0xe33e9e479df8802cb0866d5d05258bec4cf62948": "Pons router",
    "0xe5e702641ea86f4ae6cc3cdaed2b886f976be044": "Pons hook",
    "0x267444d099b10fb5ed7c3cc7b7c767adca574952": "Pons locker",
  },
  PONS_FACTORY: "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e",
  PONS_HOOK: "0xe5e702641ea86f4ae6cc3cdaed2b886f976be044",
  V4_POOL_MANAGER: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  WETH: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  USDG: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  TOPIC: {
    V4_SWAP: "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f",
    V4_INIT: "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438",
    V4_LIQ: "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec",
    TRANSFER: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    V3_SWAP: "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
  },

  // ---- feed ----
  POLL_MS: n("RH_POLL_MS", 3000),                 // address-filtered eth_getLogs every 3 s (blocks are ~100 ms)
  MAX_RANGE: n("RH_MAX_RANGE", 1500),             // blocks per getLogs call
  CURVES_MAX: n("RH_CURVES_MAX", 300),            // newest Pons curve/token addresses followed
  SAMPLE_EVERY_MIN: n("RH_SAMPLE_EVERY_MIN", 10), // whole-chain sample (finds LONG and other busy contracts)
  SAMPLE_BLOCKS: n("RH_SAMPLE_BLOCKS", 300),
  ALCHEMY_AFTER_S: n("RH_ALCHEMY_AFTER_S", 30),   // Alchemy (metered) only after the public node has failed this long
  ALCHEMY_DAY_CU: n("RH_ALCHEMY_DAY_CU", 800_000),// ≈24M/month, under the 30M free tier
  HEARTBEAT_MIN: n("RH_HEARTBEAT_MIN", 180),
};
