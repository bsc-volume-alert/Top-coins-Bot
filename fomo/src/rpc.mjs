// Budgeted JSON-RPC (Helius first, then RPC_EXTRA, then the public endpoint) and the one universal trade decoder: token-balance
// deltas from getTransaction. Venue-independent — whatever DFlow routed through, the user's wallet is the owner whose token balance
// moved, and the fill is the quote (SOL / USDC) that left or arrived. Costs 1 credit a call, so it is spent by budget (config).
import { CFG, QUOTES, WSOL, USDC } from "./config.mjs";
import { solUsd } from "./price.mjs";
export const rpcStat = { calls: 0, errors: 0, lastErr: "", day: new Date().getUTCDate(), used: 0 };
const skipUntil = new Map();
export function budgetLeft() { roll(); return CFG.DECODE_BUDGET - rpcStat.used; }
function roll() { const d = new Date().getUTCDate(); if (d !== rpcStat.day) { rpcStat.day = d; rpcStat.used = 0; } }
export async function rpc(method, params, { budget = true, retry = false } = {}) {
  roll(); if (budget) { if (rpcStat.used >= CFG.DECODE_BUDGET) throw new Error("decode budget exhausted"); rpcStat.used++; }
  rpcStat.calls++;
  let lastErr;
  for (const url of CFG.RPC_URLS) {
    if (!retry && (skipUntil.get(url) || 0) > Date.now()) continue;
    for (let attempt = 0; attempt < (retry ? 6 : 1); attempt++) {
      try {
        const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15000) });
        const text = await r.text(); let j; try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status}: ${text.slice(0, 60)}`); }
        if (j.error) throw new Error(j.error.message || JSON.stringify(j.error).slice(0, 80));
        return j.result;
      } catch (e) {
        lastErr = e; rpcStat.errors++; rpcStat.lastErr = `${url.replace(/api-key=[^&]+/, "api-key=…").slice(8, 40)}: ${String(e.message).slice(0, 60)}`;
        const limited = /max usage|rate limit|too many|429|credits/i.test(e.message);
        if (limited && retry) { await new Promise((x) => setTimeout(x, 1500 * (attempt + 1))); continue; } // the finder: back off and try the same provider again, never pause it
        if (limited) skipUntil.set(url, Date.now() + 600_000);
        break;
      }
    }
  }
  throw lastErr || new Error("all RPC providers paused");
}
/** getTransaction → { ts, slot, legs: [{ mint, side, tokens, dec, usd, quote, quoteAmt, wallet }] } or null. One leg per (wallet, non-quote mint). */
export async function decodeTx(sig) {
  const tx = await rpc("getTransaction", [sig, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed", commitment: "confirmed" }]);
  return decodeParsed(tx);
}
/** The same decode on an already-fetched jsonParsed transaction (find.mjs). Adds feePayer. */
export function decodeParsed(tx, solUsdAt = null) {
  if (!tx || tx.meta?.err) return tx ? { ts: tx.blockTime, slot: tx.slot, legs: [], failed: true, feePayer: tx.transaction?.message?.accountKeys?.[0]?.pubkey || null } : null;
  const keys = (tx.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey));
  const feePayer = keys[0] || null;
  const pre = tx.meta.preTokenBalances || [], post = tx.meta.postTokenBalances || [];
  const bal = new Map(); // owner|mint -> { owner, mint, dec, delta }
  const add = (b, sign) => { if (!b?.mint || !b.owner) return; const k = b.owner + "|" + b.mint; const o = bal.get(k) || { owner: b.owner, mint: b.mint, dec: b.uiTokenAmount?.decimals ?? null, delta: 0 }; o.delta += sign * Number(b.uiTokenAmount?.uiAmount || 0); bal.set(k, o); };
  for (const b of pre) add(b, -1); for (const b of post) add(b, 1);
  // native SOL deltas per account (lamports), for wallets that paid in SOL rather than wrapped SOL / USDC
  const lam = new Map(); const preL = tx.meta.preBalances || [], postL = tx.meta.postBalances || [];
  for (let i = 0; i < keys.length; i++) lam.set(keys[i], ((postL[i] || 0) - (preL[i] || 0)) / 1e9);
  const legs = [], su = solUsdAt || solUsd();
  for (const o of bal.values()) {
    if (QUOTES.has(o.mint) || Math.abs(o.delta) < 1e-9 || o.owner === CFG.SIGNER) continue;
    const side = o.delta > 0 ? "buy" : "sell";
    // quote paid / received by the same owner: USDC token delta, WSOL token delta, else native SOL delta
    let quote = null, quoteAmt = 0;
    const u = bal.get(o.owner + "|" + USDC), w = bal.get(o.owner + "|" + WSOL), l = lam.get(o.owner) || 0;
    if (u && Math.abs(u.delta) > 0.001) { quote = "USDC"; quoteAmt = Math.abs(u.delta); }
    else if (w && Math.abs(w.delta) > 1e-6) { quote = "SOL"; quoteAmt = Math.abs(w.delta); }
    else if (Math.abs(l) > 1e-5) { quote = "SOL"; quoteAmt = Math.abs(l); }
    let usd = quote === "USDC" ? quoteAmt : quote === "SOL" ? quoteAmt * su : 0, usdFrom = "wallet";
    if (!(usd > 0)) { // fomo pays from its own cash balance: the trader's wallet shows the tokens arriving but no dollars leaving — take the transaction's biggest quote movement
      let bestU = 0, bestW = 0; for (const b of bal.values()) { if (b.mint === USDC) bestU = Math.max(bestU, Math.abs(b.delta)); if (b.mint === WSOL) bestW = Math.max(bestW, Math.abs(b.delta)); }
      let bestL = 0; for (const [k, v] of lam) if (k !== CFG.SIGNER) bestL = Math.max(bestL, Math.abs(v));
      if (bestU > 0.001) { quote = "USDC"; quoteAmt = bestU; usd = bestU; usdFrom = "tx"; } else if (bestW > 1e-6) { quote = "SOL"; quoteAmt = bestW; usd = bestW * su; usdFrom = "tx"; } else if (bestL > 0.001) { quote = "SOL"; quoteAmt = bestL; usd = bestL * su; usdFrom = "tx"; }
    }
    legs.push({ mint: o.mint, side, tokens: Math.abs(o.delta), dec: o.dec, usd, quote, quoteAmt, wallet: o.owner, usdFrom });
  }
  // keep the biggest leg per mint (route scratch accounts can show tiny deltas for the same mint under other owners)
  const best = new Map(); for (const g of legs) { const b = best.get(g.mint); if (!b || g.tokens > b.tokens) best.set(g.mint, g); }
  return { ts: tx.blockTime, slot: tx.slot, legs: [...best.values()], feePayer };
}
