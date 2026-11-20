// feed.mjs — the live PumpSwap feed: ONE WebSocket logsSubscribe on the PumpSwap program (any Solana RPC with WebSockets;
// RPC_WS / RPC_HTTP from the environment — Helius or another provider). Every BuyEvent/SellEvent carries the pool's reserves and
// fee rates, so price, liquidity and executable fills come from the event itself (no per-trade RPC calls).
// Pool → token: CreatePoolEvent (new pools), the stored inventory (existing pools), else a BATCHED getMultipleAccounts (≤ 100
// pools a call). Swaps on a pool still being resolved are HELD (not dropped) and replayed in order once it resolves; if the
// hold overflows, the coin's history is marked as restarting at that point (engine.coinLost) — never silently continued.
// Feed health: a socket close/error, or 60 s without any message, is an outage (engine.feedDown) → windows overlapping it are not covered.
import WebSocket from "ws";
import { PUMPSWAP_PROGRAM, WSOL, eventsFromLogs, postState, bs58 } from "./decoder.mjs";

export const fs = { msgs: 0, swaps: 0, pools: 0, held: 0, replayed: 0, overflow: 0, nonSol: 0, lookups: 0, lookupCalls: 0, lookupFail: 0, reconnects: 0, lastMsg: null, dupes: 0, connected: false };
const HOLD_PER_POOL = 300, HOLD_POOLS = 20000;

export async function rpc(method, params) {
  const r = await fetch(process.env.RPC_HTTP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  const j = await r.json(); if (j.error) throw new Error(`${method}: ${j.error.message}`); return j.result;
}
/** PumpSwap Pool account (base64) → { baseMint, quoteMint, creator, poolBaseAta, poolQuoteAta } */
export function parsePool(b64) {
  const b = Buffer.from(b64, "base64"); if (b.length < 203) return null;
  return { creator: bs58(b.subarray(11, 43)), baseMint: bs58(b.subarray(43, 75)), quoteMint: bs58(b.subarray(75, 107)), poolBaseAta: bs58(b.subarray(139, 171)), poolQuoteAta: bs58(b.subarray(171, 203)) };
}

export function startFeed({ engine, store, backfill = null, pools /* Map pool → {mint, quote} */, log = console.log }) {
  const hold = new Map(), queue = new Set(); const seen = new Set(), seenQ = [];
  let ws = null, watchdog = null;
  const emit = (e, mint, t) => {
    const st = postState(e); if (!st) return;
    fs.swaps++; engine.onSwap({ t, mint, pool: e.pool, base: st.base, quote: st.quote, feeBps: st.feeBps, sol: st.sol, isBuy: e.isBuy, user: e.user, blockTs: e.ts });
  };
  const resolved = (pool, info) => {
    pools.set(pool, info); store?.savePool(pool, info);
    const h = hold.get(pool); hold.delete(pool); if (!h) return;
    if (info.quote !== WSOL) return;
    if (h.overflow) engine.coinLost(info.mint, h.items[0][1]);
    for (const [e, t] of h.items) { fs.replayed++; emit(e, info.mint, t); }
  };
  async function lookupLoop() {
    while (true) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!queue.size) continue;
      const batch = [...queue].slice(0, 100); for (const p of batch) queue.delete(p);
      try {
        fs.lookupCalls++; const res = await rpc("getMultipleAccounts", [batch, { encoding: "base64", dataSlice: { offset: 0, length: 203 } }]);
        res.value.forEach((acc, i) => { fs.lookups++; const p = acc ? parsePool(acc.data[0]) : null; if (!p) { fs.lookupFail++; hold.delete(batch[i]); return; } resolved(batch[i], { mint: p.baseMint, quote: p.quoteMint, creator: p.creator }); });
      } catch (e) { fs.lookupFail += batch.length; for (const p of batch) queue.add(p); await new Promise((r) => setTimeout(r, 5000)); }
    }
  }
  function onMsg(raw) {
    const t = Date.now() / 1000; fs.msgs++; fs.lastMsg = t;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const v = m?.params?.result?.value; if (!v || v.err) return;
    if (seen.has(v.signature)) { fs.dupes++; return; } seen.add(v.signature); seenQ.push(v.signature); if (seenQ.length > 20000) for (const s of seenQ.splice(0, 10000)) seen.delete(s);
    for (const e of eventsFromLogs(v.logs)) {
      if (e.type === "pool") { fs.pools++; resolved(e.pool, { mint: e.baseMint, quote: e.quoteMint, creator: e.creator }); store?.saveCoin(e.baseMint, { pool: e.pool, firstSeen: Math.floor(t) }); engine.coin(e.baseMint, { pool: e.pool }); engine.historyFrom(e.baseMint, t); backfill?.want(e.baseMint); continue; }
      if (e.type !== "buy" && e.type !== "sell") continue;
      const info = pools.get(e.pool);
      if (info) { if (info.quote !== WSOL) { fs.nonSol++; continue; } emit(e, info.mint, t); continue; }
      let h = hold.get(e.pool); if (!h) { if (hold.size >= HOLD_POOLS) { fs.overflow++; continue; } h = { items: [], overflow: false }; hold.set(e.pool, h); queue.add(e.pool); }
      if (h.items.length < HOLD_PER_POOL) { h.items.push([e, t]); fs.held++; } else { h.overflow = true; h.items.shift(); h.items.push([e, t]); }
    }
  }
  function connect() {
    ws = new WebSocket(process.env.RPC_WS);
    ws.on("open", () => { fs.connected = true; const t = Date.now() / 1000; engine.feedUp(t); log("[feed] up"); ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "logsSubscribe", params: [{ mentions: [PUMPSWAP_PROGRAM] }, { commitment: "confirmed" }] })); });
    ws.on("message", onMsg);
    let gone = false;
    const down = (why) => { if (gone) return; gone = true; if (!fs.connected) { setTimeout(connect, 5000); return; } fs.connected = false; engine.feedDown(fs.lastMsg ?? Date.now() / 1000, why); fs.reconnects++; log("[feed] down: " + why); try { ws.terminate(); } catch {} setTimeout(connect, 2000); };
    ws.on("close", () => down("close")); ws.on("error", (e) => down("error " + e.message));
    clearInterval(watchdog); watchdog = setInterval(() => { if (fs.connected && fs.lastMsg && Date.now() / 1000 - fs.lastMsg > 60) down("no message for 60 s"); }, 5000);
  }
  connect(); lookupLoop();
  return { stop: () => { clearInterval(watchdog); try { ws.terminate(); } catch {} } };
}
