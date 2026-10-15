// v0.18.5: holder distribution at entry — top-10 %, largest holder %, holder count, dev holding %.
// Coins seen from launch: an incremental ledger of net token balances per wallet from every trade we decode (free, exact for
// swaps; wallet-to-wallet transfers are invisible to us on every path). Anything else: one getTokenLargestAccounts call,
// excluding the largest account (bonding curve / pool), budgeted.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on, live } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { rpc } from "./rpc.js";

export const ho = { ledgers: 0, rpc: 0, rpcFail: 0, poolLike: 0 };
const POOL_PCT = 25; // v0.18.8: a single ledger balance above this share of supply is the pool / curve / migration account, not a holder
let poolLogs = 0;
const L = new Map(); // mint -> Map(wallet -> tokens)
let budget = 0, day = new Date().getUTCDate();
const DUST = 1000; // tokens; below this a wallet is not counted as a holder

function apply(mint, wallet, isBuy, tokens) {
  const m = L.get(mint); if (!m || !wallet || !(tokens > 0)) return;
  m.set(wallet, (m.get(wallet) || 0) + (isBuy ? tokens : -tokens));
}
on("create", (t) => { L.set(t.mint, new Map()); ho.ledgers = L.size; });
on("trade", (t, tr) => apply(t.mint, tr.wallet, tr.isBuy, tr.tokens));
onSwap((tr) => { if (String(tr.venue).startsWith("pumpswap") && tr.wallet && !tr.wallet.startsWith("tx:")) apply(tr.mint, tr.wallet, tr.isBuy, tr.tokens); });
on("expire", (t) => { L.delete(t.mint); ho.ledgers = L.size; });

function fromLedger(mint, creator) {
  const m = L.get(mint); if (!m || !m.size) return null;
  const S = CFG.TOTAL_SUPPLY;
  let bal = [...m.entries()].filter(([, v]) => v > DUST).sort((a, b) => b[1] - a[1]);
  const pools = bal.filter(([, v]) => v / S * 100 >= POOL_PCT); if (pools.length) { ho.poolLike++; if (poolLogs < 5) { poolLogs++; console.log("[holders] pool-like", pools.map(([w, v]) => `${w} ${(v / S * 100).toFixed(1)}%`).join(", "), "on", mint.slice(0, 8)); } bal = bal.filter(([, v]) => v / S * 100 < POOL_PCT); }
  if (!bal.length) return null;
  const top10 = bal.slice(0, 10).reduce((a, [, v]) => a + v, 0) / S * 100;
  return { top10, largest: bal[0][1] / S * 100, holders: bal.length, dev: creator ? Math.max(0, (m.get(creator) || 0)) / S * 100 : null, src: "ledger" };
}
async function fromRpc(mint) {
  if (new Date().getUTCDate() !== day) { day = new Date().getUTCDate(); budget = 0; }
  if (budget >= CFG.HOLDERS_RPC_DAILY_BUDGET) return null;
  budget++; ho.rpc++;
  try {
    const r = await rpc("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]);
    const amts = (r?.value || []).map((x) => Number(x.uiAmount || 0)).sort((a, b) => b - a);
    if (amts.length < 2) return null;
    const S = CFG.TOTAL_SUPPLY, rest = amts.slice(1); // drop the largest: bonding curve or pool
    return { top10: rest.slice(0, 10).reduce((a, x) => a + x, 0) / S * 100, largest: rest[0] / S * 100, holders: null, dev: null, src: "rpc" };
  } catch { ho.rpcFail++; return null; }
}
/** Record holder stats on a paper trade. Returns the stats synchronously when the ledger has them, else null (RPC fills the row later). */
export function recordHolders(id, mint, creator = null) {
  creator ||= live.get(mint)?.creator || q.tokenMeta.get(mint)?.creator || null;
  const h = fromLedger(mint, creator);
  if (h) { try { q.setHolders.run(h.top10, h.largest, h.holders, h.dev, id); } catch {} return h; }
  fromRpc(mint).then((r) => { if (r) { try { q.setHolders.run(r.top10, r.largest, r.holders, r.dev, id); } catch {} } });
  return null;
}
/** Same, but waits for the RPC path (momentum's trigger is already async). */
export async function recordHoldersAsync(id, mint, creator = null) {
  creator ||= live.get(mint)?.creator || q.tokenMeta.get(mint)?.creator || null;
  const h = fromLedger(mint, creator) || (await fromRpc(mint));
  if (h) { try { q.setHolders.run(h.top10, h.largest, h.holders, h.dev, id); } catch {} }
  return h;
}
export const holdersLine = (h) => h ? `holders ${h.holders ?? "20+"} · top-10 ${h.top10.toFixed(0)}% · largest ${h.largest.toFixed(1)}%${h.dev != null ? ` · dev ${h.dev.toFixed(1)}%` : ""}` : null;
