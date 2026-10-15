// v0.18: all-Solana volume feed. Subscribes to Raydium CPMM / CLMM / LaunchLab, Meteora DLMM and Orca on one WebSocket, decodes
// their swap events, prices the token in SOL from the pool state carried in the event, and feeds the same onSwap listeners
// momentum already uses — so "$100K in 5 minutes" now fires on any SOL-quoted pool, not just PumpSwap.
// Credits: pool → mint lookup (getAccountInfo) and supply/decimals (getTokenSupply) only once a pool has DEX_RESOLVE_SWAPS swaps
// in 5 minutes, capped by DEX_POOL_DAILY_BUDGET. Everything else is free log traffic.
import WebSocket from "ws";
import { CFG } from "./config.js";
import { PROGRAMS, WSOL, dexEventsFromLogs, parsePoolAccount } from "./dex-decoder.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";
import { routeOf } from "./routes.js";
import { emitSwap } from "./pumpswap.js";
import { q } from "./db.js";

export const dx = { txs: 0, dupes: 0, events: 0, emitted: 0, unknownPool: 0, resolved: 0, ignored: 0, lookupFail: 0, big: 0, reconnects: 0, byVenue: {}, get poolBudget() { return budgetUsed; } };
const pools = new Map();        // pool -> {mint, solSide, dec, supply, binStep} | {ignore:true}
const mintPools = new Map();    // mint -> Set(pool)
const supplyCache = new Map();  // mint -> {dec, supply}
const poolHits = new Map();     // pool -> [ts] rolling 5m (resolution gate)
const pending = new Set(), queue = [];
const seenSig = new Set(); let seenOrder = [];
let budgetUsed = 0, budgetDay = new Date().getUTCDate(), inFlight = 0, samples = 0;
const STABLE = new Set(["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB", "DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT", "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"]);
// v0.18.1: pool cache survives restarts (every deploy restarted the process and re-spent the lookups)
const now0 = Math.floor(Date.now() / 1000);
try { for (const r of q.allDexPools.all()) { if (r.ignore) pools.set(r.pool, { ignore: true }); else { pools.set(r.pool, { mint: r.mint, solSide: r.sol_side, m0: r.m0, m1: r.m1, dec: r.dec, supply: r.supply, binStep: r.bin_step }); let set = mintPools.get(r.mint); if (!set) { set = new Set(); mintPools.set(r.mint, set); } set.add(r.pool); } } } catch (e) { console.error("[dex cache]", e.message); }
const save = (pool, venue, info) => { try { q.insDexPool.run(pool, venue, info.mint || null, info.solSide ?? null, info.m0 || null, info.m1 || null, info.dec ?? null, info.supply ?? null, info.binStep ?? null, info.ignore ? 1 : 0, now0); } catch {} };
const SUPPLY_SHORTCUT = (mint) => (mint.endsWith("pump") ? { dec: 6, supply: 1e9 } : null);

function remember(sig) { if (seenSig.has(sig)) return false; seenSig.add(sig); seenOrder.push(sig); if (seenOrder.length > 8000) { for (const s of seenOrder.splice(0, 4000)) seenSig.delete(s); } return true; }
function hit(pool, ts) {
  let h = poolHits.get(pool); if (!h) { h = []; poolHits.set(pool, h); }
  h.push(ts); while (h.length && ts - h[0] > 300) h.shift();
  if (poolHits.size > 30000) poolHits.delete(poolHits.keys().next().value);
  return h.length >= CFG.DEX_RESOLVE_SWAPS;
}
function enqueue(e) {
  const pool = e.pool; if (pools.has(pool) || pending.has(pool)) return;
  if (new Date().getUTCDate() !== budgetDay) { budgetDay = new Date().getUTCDate(); budgetUsed = 0; }
  if (budgetUsed >= CFG.DEX_POOL_DAILY_BUDGET) return;
  pending.add(pool); queue.push(e); drain();
}
async function supplyOf(mint) {
  const c = supplyCache.get(mint) || SUPPLY_SHORTCUT(mint); if (c) return c;
  budgetUsed++;
  const r = await rpc("getTokenSupply", [mint]);
  const v = r?.value; if (!v || v.decimals == null) throw new Error("no supply");
  const out = { dec: v.decimals, supply: Number(v.uiAmount ?? Number(v.amount) / 10 ** v.decimals) };
  supplyCache.set(mint, out); if (supplyCache.size > 20000) supplyCache.delete(supplyCache.keys().next().value);
  return out;
}
async function drain() {
  while (inFlight < CFG.PS_RESOLVE_CONCURRENCY && queue.length) {
    const e = queue.shift(), pool = e.pool; inFlight++;
    try {
      let p = null;
      if (e.venue === "raydium-cpmm" && e.inMint && e.outMint) p = { mint0: e.inMint, mint1: e.outMint, swapOrder: true };
      else { budgetUsed++; const r = await rpc("getAccountInfo", [pool, { encoding: "base64" }]); p = parsePoolAccount(e.venue, r?.value?.data?.[0] || ""); }
      if (!p) { dx.lookupFail++; pools.set(pool, { ignore: true }); save(pool, e.venue, { ignore: true }); continue; }
      const solSide = p.mint0 === WSOL ? 0 : p.mint1 === WSOL ? 1 : -1;
      const mint = solSide === 0 ? p.mint1 : p.mint0;
      if (solSide < 0 || STABLE.has(mint)) { dx.ignored++; pools.set(pool, { ignore: true }); save(pool, e.venue, { ignore: true }); continue; }
      let dec, supply;
      if (e.venue === "raydium-launchlab") { dec = p.dec0; supply = p.supply / 10 ** dec; }
      else { const s = await supplyOf(mint); dec = s.dec; supply = s.supply; }
      const info = { mint, solSide: p.swapOrder ? null : solSide, m0: p.swapOrder ? null : p.mint0, m1: p.swapOrder ? null : p.mint1, dec, supply, binStep: p.binStep };
      pools.set(pool, info); dx.resolved++; save(pool, e.venue, info);
      let set = mintPools.get(mint); if (!set) { set = new Set(); mintPools.set(mint, set); } set.add(pool);
      if (pools.size > 50000) pools.delete(pools.keys().next().value);
    } catch (x) { dx.lookupFail++; }
    finally { pending.delete(pool); inFlight--; }
  }
}

const Q64 = 2 ** 64;
/** Normalise a decoded event + pool info into {isBuy, sol, tokens, price} (price = SOL per whole token). */
function priceOf(e, p) {
  const dec = p.dec, tokDiv = 10 ** dec;
  if (e.venue === "raydium-cpmm") {
    const inMint = e.inMint ?? (e.baseInput ? p.m0 : p.m1), outMint = e.outMint ?? (e.baseInput ? p.m1 : p.m0); // old CPMM layout has no mints in the event
    const solIn = inMint === WSOL; if (!solIn && outMint !== WSOL) return null;
    const solRes = solIn ? e.inBefore + e.amountIn : e.outBefore - e.amountOut, tokRes = solIn ? e.outBefore - e.amountOut : e.inBefore + e.amountIn;
    if (!(tokRes > 0n)) return null;
    return { isBuy: solIn, sol: Number(solIn ? e.amountIn : e.amountOut) / 1e9, tokens: Number(solIn ? e.amountOut : e.amountIn) / tokDiv, price: (Number(solRes) / 1e9) / (Number(tokRes) / tokDiv) };
  }
  if (e.venue === "raydium-clmm" || e.venue === "orca") {
    const sqrt = Number(e.venue === "orca" ? e.postSqrt : e.sqrtPriceX64) / Q64, raw = sqrt * sqrt; if (!(raw > 0)) return null; // token1 per token0, raw units
    const aIn = e.venue === "orca" ? e.aToB : e.zeroForOne; // side-0 token is the input
    const amt0 = e.venue === "orca" ? (aIn ? e.amountIn : e.amountOut) : e.amount0, amt1 = e.venue === "orca" ? (aIn ? e.amountOut : e.amountIn) : e.amount1;
    if (p.solSide === 0) return { isBuy: aIn, sol: Number(amt0) / 1e9, tokens: Number(amt1) / tokDiv, price: (1 / raw) * tokDiv / 1e9 };
    return { isBuy: !aIn, sol: Number(amt1) / 1e9, tokens: Number(amt0) / tokDiv, price: raw * tokDiv / 1e9 };
  }
  if (e.venue === "raydium-launchlab") {
    const base = e.vBase - e.rBaseAfter; if (!(base > 0n)) return null;
    const raw = Number(e.vQuote + e.rQuoteAfter) / Number(base);
    return { isBuy: e.isBuy, sol: Number(e.isBuy ? e.amountIn : e.amountOut) / 1e9, tokens: Number(e.isBuy ? e.amountOut : e.amountIn) / tokDiv, price: raw * tokDiv / 1e9 };
  }
  if (e.venue === "meteora-dlmm") {
    const raw = Math.pow(1 + (p.binStep || 0) / 10000, e.endBin); if (!(raw > 0)) return null; // y per x, raw units
    if (p.solSide === 1) return { isBuy: !e.swapForY, sol: Number(e.swapForY ? e.amountOut : e.amountIn) / 1e9, tokens: Number(e.swapForY ? e.amountIn : e.amountOut) / tokDiv, price: raw * tokDiv / 1e9 };
    return { isBuy: e.swapForY, sol: Number(e.swapForY ? e.amountIn : e.amountOut) / 1e9, tokens: Number(e.swapForY ? e.amountOut : e.amountIn) / tokDiv, price: (1 / raw) * tokDiv / 1e9 };
  }
  return null;
}

function handle({ sig, slot, logs, err }) {
  dx.txs++;
  if (err || !remember(sig)) { if (!err) dx.dupes++; return; }
  const evs = dexEventsFromLogs(logs); if (!evs.length) return;
  dx.events += evs.length;
  const now = Math.floor(Date.now() / 1000), route = routeOf(logs);
  for (const e of evs) {
    dx.byVenue[e.venue] = (dx.byVenue[e.venue] || 0) + 1;
    const p = pools.get(e.pool);
    if (!p) { dx.unknownPool++; if (hit(e.pool, now)) enqueue(e); continue; }
    if (p.ignore) continue;
    const x = priceOf(e, p); if (!x || !(x.sol > 0) || !(x.price > 0) || x.sol > CFG.PS_MAX_SWAP_SOL) continue;
    const mc = x.price * p.supply * solUsdCached();
    if (mc > CFG.DEX_IGNORE_MC) { dx.big++; continue; }
    const tr = { mint: p.mint, pool: e.pool, sig, slot, ts: now, wallet: e.wallet || `tx:${sig.slice(0, 12)}`, isBuy: x.isBuy, sol: x.sol, tokens: x.tokens, price: x.price, mc, route, venue: e.venue };
    if (samples < 10) { samples++; console.log("[dex sample]", JSON.stringify({ venue: e.venue, mint: tr.mint.slice(0, 8), buy: tr.isBuy, sol: +x.sol.toFixed(4), px: x.price, mc: Math.round(mc) })); }
    dx.emitted++; emitSwap(tr);
  }
}

/** Pools we have mapped for a mint (for /check). */
export const dexSnap = (mint) => [...(mintPools.get(mint) || [])].map((pool) => ({ pool, ...pools.get(pool) }));

export function startDex(onStatus = () => {}) {
  const ids = Object.keys(PROGRAMS); if (!ids.length) return;
  let i = 0, ws, pingT, idleT, backoff = 1000, lastMsg = Date.now();
  const connect = () => {
    const url = CFG.WS_URLS[i % CFG.WS_URLS.length];
    ws = new WebSocket(url, { handshakeTimeout: 10000 });
    ws.on("open", () => {
      backoff = 1000; lastMsg = Date.now();
      ids.forEach((pid, k) => ws.send(JSON.stringify({ jsonrpc: "2.0", id: 100 + k, method: "logsSubscribe", params: [{ mentions: [pid] }, { commitment: "processed" }] })));
      pingT = setInterval(() => { try { ws.ping(); } catch {} }, 20000);
      idleT = setInterval(() => { if (Date.now() - lastMsg > 60000) { try { ws.terminate(); } catch {} } }, 10000);
      onStatus("open");
    });
    ws.on("message", (raw) => {
      lastMsg = Date.now();
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id >= 100 && m.id < 100 + ids.length) return onStatus(`subscribed ${PROGRAMS[ids[m.id - 100]]} id=${m.result}${m.error ? " ERR " + JSON.stringify(m.error) : ""}`);
      const v = m?.params?.result?.value; if (!v) return;
      handle({ sig: v.signature, slot: m.params.result.context?.slot, logs: v.logs, err: v.err });
    });
    const down = (why) => { clearInterval(pingT); clearInterval(idleT); dx.reconnects++; i++; onStatus(`closed (${why}); reconnect in ${backoff}ms`); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000); };
    ws.on("close", (c) => down(`close ${c}`));
    ws.on("error", (e) => { onStatus(`error ${e.message}`); try { ws.terminate(); } catch {} });
  };
  connect();
}
export const __test = { pools, handle, priceOf };
