// PumpSwap feed (post-graduation trading). OBSERVE mode: decode + log stats; volume alerts come in v0.5.
import WebSocket from "ws";
import { CFG } from "./config.js";
import { pumpSwapEventsFromLogs, parsePoolAccount, PUMPSWAP_PROGRAM, WSOL } from "./pumpswap-decoder.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";
import { routeOf } from "./routes.js";
import { q } from "./db.js";
import { live, emit } from "./launch-monitor.js";

export const ps = { txs: 0, data: 0, buys: 0, sells: 0, pools: 0, unknownPool: 0, resolved: 0, lookupFail: 0, reconnects: 0, oversize: 0, thinPool: 0, gradEvidence: 0, get poolBudget() { return poolBudgetUsed; } };
const poolMint = new Map();   // pool -> {mint, quote}
const gradSeen = new Set();
const pending = new Set();
const poolVol = new Map();    // pool -> [{ts, sol}] rolling 5m, used to decide when a lookup is worth a credit
let poolBudgetUsed = 0, poolBudgetDay = new Date().getUTCDate(), inFlight = 0;
const queue = [];
const listeners = [];
export const onSwap = (fn) => listeners.push(fn);
export const emitSwap = (tr) => { for (const fn of listeners) { try { fn(tr); } catch (x) { console.error("[ps listener]", x.message); } } };
let samples = 0;
// v0.18.13: pools quoted in something other than SOL (USDC, tokenized stocks such as TTWO…). The quote token's SOL price comes from
// DexScreener (its best SOL pair, else USD price ÷ SOL/USD), decimals from one getTokenSupply call; cached, refreshed every 5 min.
const quotes = new Map(); // quoteMint -> {sol, dec, sym, ts}
const quotePending = new Set();
export const quoteStats = { lookups: 0, fails: 0, skipped: 0 };
function quoteOf(mint, now) {
  if (mint === WSOL) return { sol: 1, dec: 9, sym: "SOL" };
  const c = quotes.get(mint);
  if (!c || now - c.ts > 300) refreshQuote(mint, now);
  return c || null;
}
async function refreshQuote(mint, now) {
  if (quotePending.has(mint) || quotes.size > 200) return; quotePending.add(mint); quoteStats.lookups++;
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
    const j = await r.json(); const pairs = (j.pairs || []).filter((x) => x.chainId === "solana" && x.baseToken?.address === mint);
    const solPair = pairs.filter((x) => x.quoteToken?.address === WSOL).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    const best = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    let sol = solPair ? Number(solPair.priceNative) : best && solUsdCached() > 0 ? Number(best.priceUsd) / solUsdCached() : 0;
    if (!(sol > 0)) throw new Error("no price");
    let dec = quotes.get(mint)?.dec;
    if (dec == null) { const s = await rpc("getTokenSupply", [mint]); dec = s?.value?.decimals; if (dec == null) throw new Error("no decimals"); }
    quotes.set(mint, { sol, dec, sym: best?.baseToken?.symbol || mint.slice(0, 4), ts: now });
  } catch (e) { quoteStats.fails++; if (!quotes.has(mint)) quotes.set(mint, { sol: 0, dec: 0, sym: "?", ts: now }); } // sol 0 → skipped until next refresh
  finally { quotePending.delete(mint); }
}

function wantResolve(pool, sol, ts) {
  let w = poolVol.get(pool); if (!w) { w = []; poolVol.set(pool, w); }
  w.push({ ts, sol }); while (w.length && ts - w[0].ts > 300) w.shift();
  if (poolVol.size > 20000) poolVol.delete(poolVol.keys().next().value);
  return w.reduce((a, x) => a + x.sol, 0) >= CFG.PS_RESOLVE_SOL || w.length >= CFG.DEX_RESOLVE_SWAPS; // v0.18.13: swap-count gate too (non-SOL quotes have tiny raw/1e9 sums)
}
function resolvePool(pool) {
  if (poolMint.has(pool) || pending.has(pool)) return;
  if (new Date().getUTCDate() !== poolBudgetDay) { poolBudgetDay = new Date().getUTCDate(); poolBudgetUsed = 0; }
  if (poolBudgetUsed >= CFG.PS_POOL_DAILY_BUDGET) return;
  pending.add(pool); queue.push(pool); drain();
}
async function drain() {
  while (inFlight < CFG.PS_RESOLVE_CONCURRENCY && queue.length) {
    const pool = queue.shift(); inFlight++; poolBudgetUsed++;
    try {
      const r = await rpc("getAccountInfo", [pool, { encoding: "base64" }]);
      const p = parsePoolAccount(r?.value?.data?.[0] || "");
      if (p) { poolMint.set(pool, { mint: p.baseMint, quote: p.quoteMint }); ps.resolved++; }
      else ps.lookupFail++;
    } catch { ps.lookupFail++; } finally { pending.delete(pool); inFlight--; }
  }
}

function handle({ sig, slot, logs, err }) {
  ps.txs++;
  if (err) return;
  const evs = pumpSwapEventsFromLogs(logs);
  if (!evs.length) return;
  ps.data += evs.length;
  const route = routeOf(logs);
  for (const e of evs) {
    if (e.type === "claim") { ps.claims = (ps.claims || 0) + 1; emit("claim", null, { ...e, sig, venue: "pumpswap" }); continue; }
    if (e.type === "pool") { ps.pools++; poolMint.set(e.pool, { mint: e.baseMint, quote: e.quoteMint }); continue; }
    if (e.isBuy) ps.buys++; else ps.sells++;
    const sol = Number(e.quoteAmt) / 1e9, tokens = Number(e.baseAmt) / 1e6; // sol: raw quote units/1e9, only used for the resolve gate
    const pm = poolMint.get(e.pool);
    if (!pm) { ps.unknownPool++; if (wantResolve(e.pool, sol, e.ts)) resolvePool(e.pool); continue; }
    const qi = quoteOf(pm.quote, e.ts); if (!qi || !(qi.sol > 0)) { quoteStats.skipped++; continue; } // v0.18.13: price through the quote asset
    const qDiv = 10 ** qi.dec, solQ = (Number(e.quoteAmt) / qDiv) * qi.sol, poolQuoteSol = (Number(e.poolQuote) / qDiv) * qi.sol;
    if (!(solQ > 0) || solQ > CFG.PS_MAX_SWAP_SOL) { ps.oversize++; continue; }
    if (poolQuoteSol < CFG.PS_MIN_POOL_SOL) { ps.thinPool++; continue; } // v0.17: secondary/thin pools price the token wrongly
    if (!gradSeen.has(pm.mint)) { gradSeen.add(pm.mint); if (gradSeen.size > 50000) gradSeen.delete(gradSeen.keys().next().value); try { q.setGrad.run(pm.mint); const t = live.get(pm.mint); if (t && !t.graduated) { t.graduated = true; emit("graduated", t, { price: poolQuoteSol / (Number(e.poolBase) / 1e6), ts: e.ts }); } ps.gradEvidence++; } catch {} } // v0.17: graduation flagged from PumpSwap evidence // v0.15: implausible single swap (instant-graduation curve buys decode with bogus amounts)
    const price = poolQuoteSol / (Number(e.poolBase) / 1e6);
    const mc = price * CFG.TOTAL_SUPPLY * solUsdCached();
    const tr = { mint: pm.mint, pool: e.pool, sig, slot, ts: e.ts, wallet: e.user, isBuy: e.isBuy, sol: solQ, tokens, price, mc, route, venue: pm.quote === WSOL ? "pumpswap" : `pumpswap/${qi.sym}`, quote: qi.sym, creatorFee: (Number(e.creatorFee || 0n) / qDiv) * qi.sol };
    if (samples < 5) { samples++; console.log("[ps sample]", JSON.stringify({ mint: tr.mint.slice(0, 8), buy: tr.isBuy, sol: +sol.toFixed(4), mc: Math.round(mc), wallet: tr.wallet.slice(0, 6) })); }
    for (const fn of listeners) { try { fn(tr); } catch (x) { console.error("[ps listener]", x.message); } }
  }
}

export function startPumpSwap(onStatus = () => {}) {
  let i = 0, ws, pingT, idleT, backoff = 1000, lastMsg = Date.now();
  const connect = () => {
    const url = CFG.WS_URLS[i % CFG.WS_URLS.length];
    ws = new WebSocket(url, { handshakeTimeout: 10000 });
    ws.on("open", () => {
      backoff = 1000; lastMsg = Date.now();
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "logsSubscribe", params: [{ mentions: [PUMPSWAP_PROGRAM] }, { commitment: "processed" }] }));
      pingT = setInterval(() => { try { ws.ping(); } catch {} }, 20000);
      idleT = setInterval(() => { if (Date.now() - lastMsg > 60000) { try { ws.terminate(); } catch {} } }, 10000);
      onStatus("open");
    });
    ws.on("message", (raw) => {
      lastMsg = Date.now();
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id === 2) return onStatus(`subscribed id=${m.result}`);
      const v = m?.params?.result?.value; if (!v) return;
      handle({ sig: v.signature, slot: m.params.result.context?.slot, logs: v.logs, err: v.err });
    });
    const down = (why) => { clearInterval(pingT); clearInterval(idleT); ps.reconnects++; i++; onStatus(`closed (${why}); reconnect in ${backoff}ms`); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000); };
    ws.on("close", (c) => down(`close ${c}`));
    ws.on("error", (e) => { onStatus(`error ${e.message}`); try { ws.terminate(); } catch {} });
  };
  connect();
}
