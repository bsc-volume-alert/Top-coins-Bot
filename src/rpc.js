import { CFG } from "./config.js";
let used = 0, day = new Date().getUTCDate();
export const rpcUsed = () => used;
export const rpcBy = {}; // v0.18.179 (owner, 21 Oct 16:16 UK: 'if there's a big wastage, cull it'): calls today by method, shown in the page header
export async function rpc(method, params) {
  if (new Date().getUTCDate() !== day) { day = new Date().getUTCDate(); used = 0; }
  if (used >= CFG.RPC_DAILY_BUDGET) throw new Error("rpc budget exhausted");
  used++; rpcBy[method] = (rpcBy[method] || 0) + 1; if (rpcBy._day !== day) { for (const k of Object.keys(rpcBy)) delete rpcBy[k]; rpcBy._day = day; rpcBy[method] = 1; }
  let lastErr;
  for (const url of CFG.RPC_URLS) {
    if ((skipUntil.get(url) || 0) > Date.now()) continue;
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      const text = await r.text(); let j;
      try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status}: ${text.slice(0, 60)}`); }
      if (j.error) throw new Error(j.error.message || JSON.stringify(j.error).slice(0, 60));
      return j.result;
    } catch (e) {
      lastErr = e; rpcStat.errors++; rpcStat.lastErr = `${url.replace(/api-key=[^&]+/, "api-key=…").slice(8, 40)}: ${String(e.message).slice(0, 60)}`;
      // v0.18.59: a provider that says it is out of credits / rate-limited is skipped for 10 min instead of being asked (and failing) on every call
      if (/max usage|rate limit|too many|429|credits/i.test(e.message)) { skipUntil.set(url, Date.now() + 600_000); rpcStat.skips++; }
    }
  }
  throw lastErr || new Error("all RPC providers paused (out of credits / rate-limited)");
}
const skipUntil = new Map();
export const rpcStat = { errors: 0, skips: 0, lastErr: "" };
const ageCache = new Map(); // wallet -> {age_s, funder, firstTs}
/** Wallet age + funder. ~2 credits for fresh wallets, 1 for old ones. */
export async function walletInfo(wallet) {
  if (ageCache.has(wallet)) return ageCache.get(wallet);
  const now = Math.floor(Date.now() / 1000);
  let info = { age_s: null, funder: null, firstTs: null, txCount: null };
  try {
    const sigs = await rpc("getSignaturesForAddress", [wallet, { limit: 1000 }]);
    info.txCount = sigs.length;
    if (sigs.length && sigs.length < 1000) {
      const first = sigs[sigs.length - 1];
      info.firstTs = first.blockTime; info.age_s = now - first.blockTime;
      if (info.age_s <= CFG.FRESH_MAX_AGE_S) {
        const tx = await rpc("getTransaction", [first.signature, { maxSupportedTransactionVersion: 0, encoding: "json" }]);
        const keys = tx?.transaction?.message?.accountKeys || [];
        const pre = tx?.meta?.preBalances || [], post = tx?.meta?.postBalances || [];
        let best = null, bestDrop = 0;
        for (let i = 0; i < keys.length; i++) {
          const k = typeof keys[i] === "string" ? keys[i] : keys[i].pubkey;
          const drop = (pre[i] || 0) - (post[i] || 0);
          if (k !== wallet && drop > bestDrop) { bestDrop = drop; best = k; }
        }
        info.funder = best; info.funded_sol = bestDrop / 1e9;
      }
    } else if (sigs.length >= 1000) info.age_s = 10 * 86400; // old/busy wallet
  } catch (e) { info.err = e.message; }
  ageCache.set(wallet, info);
  if (ageCache.size > 20000) ageCache.delete(ageCache.keys().next().value);
  return info;
}
