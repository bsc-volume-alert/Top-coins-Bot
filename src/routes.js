// v0.16: which program the user called (route) — from the "Program <id> invoke [1]" log lines we already receive.
// Retail (tweet-driven) flow comes via Jupiter/Raydium/wallet routers; wash/bot flow tends to call pump/PumpSwap directly or a custom program.
const KNOWN = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "jupiter", JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "jupiter", jupnw4B5Pk6tP4yqgXyQfUFSiAmfpoZXbgqCH4xbw: "jupiter",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "raydium", CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: "raydium", routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS: "raydium",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "pump", pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA: "pumpswap",
  okxDqFYNqzxANB3LXGpsmvvKcRVnEcW8Fh3gN2YkHoW: "okx", "5f9gDSg1zgYhV8v3hZQ3f7U7B6ZQ2qjfTE3Bh8dQpump": "pump",
};
const SKIP = new Set(["ComputeBudget111111111111111111111111111111", "11111111111111111111111111111111", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"]);
export const RETAIL = new Set(["jupiter", "raydium", "okx"]);
/** First top-level program the transaction calls, mapped to a route label. */
export function routeOf(logs) {
  for (const l of logs || []) {
    if (!l.endsWith(" invoke [1]") || !l.startsWith("Program ")) continue;
    const id = l.slice(8, -11);
    if (SKIP.has(id)) continue;
    return KNOWN[id] || "other";
  }
  return "unknown";
}
