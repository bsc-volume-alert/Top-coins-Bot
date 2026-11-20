// feed.mjs — the live PumpSwap feed: ONE WebSocket logsSubscribe on the PumpSwap program (any Solana RPC with WebSockets;
// RPC_WS / RPC_HTTP from the environment — Helius or another provider). Every reserve-changing event carries the pool's reserves,
// so price, liquidity and executable fills come from the events themselves (no per-trade RPC calls).
// Scope: CANONICAL, SOL-quoted pump.fun pools only — pool.creator must equal the pump pool-authority PDA of the base mint
// (pump-public-docs). Non-canonical and non-SOL pools are counted and not priced.
// Pool → token: CreatePoolEvent (new pools), the stored inventory (existing pools), else a BATCHED getMultipleAccounts (≤ 100 a call).
// Events on a pool still being resolved are HELD and replayed in order (history only — replayed events never create signals);
// if the hold overflows, or an event cannot be turned into a trustworthy state, the coin's history restarts there (engine.coinLost).
// Feed health: a socket close/error, or 60 s without any message, is an outage → windows overlapping it are not covered.
import WebSocket from "ws";
import { PUMPSWAP_PROGRAM, WSOL, eventsFromLogs, reduceTx, bs58, isCanonical } from "./decoder.mjs";

export const fs = { msgs: 0, events: 0, emitted: 0, pools: 0, held: 0, replayed: 0, overflow: 0, nonSol: 0, nonCanonical: 0, rejected: 0, lookups: 0, lookupCalls: 0, lookupFail: 0, lookupErrs: 0, lastLookupErr: "", baseIsSol: 0, discontinuities: 0, lastBreaks: [], multiEventTx: 0, reconnects: 0, lastMsg: null, nonSolQuotes: {}, bytes: 0, failedTx: 0, dupes: 0, connected: false, lagMsSum: 0, lagN: 0 };
const HOLD_PER_POOL = 300, HOLD_POOLS = 20000;

export async function rpc(method, params) {
  const r = await fetch(process.env.RPC_HTTP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  const j = await r.json(); if (j.error) throw new Error(`${method}: ${j.error.message}`); return j.result;
}
/** PumpSwap Pool account (base64, ≥ 203 bytes; virtual_quote_reserves at 245 on upgraded accounts) */
export function parsePool(b64) {
  const b = Buffer.from(b64, "base64"); if (b.length < 203) return null;
  const vq = b.length >= 261 ? (b.readBigInt64LE(253) << 64n) + b.readBigUInt64LE(245) : 0n;
  return { index: b.readUInt16LE(9), creator: bs58(b.subarray(11, 43)), baseMint: bs58(b.subarray(43, 75)), quoteMint: bs58(b.subarray(75, 107)), poolBaseAta: bs58(b.subarray(139, 171)), poolQuoteAta: bs58(b.subarray(171, 203)), virtualQuote: vq };
}
/** classify once and cache on the pool info: 'canonical' | 'non-canonical' | 'non-sol' */
export function poolClass(info) { if (info.cls) return info.cls; info.cls = info.quote !== WSOL ? "non-sol" : info.creator && isCanonical(info.mint, info.creator) ? "canonical" : "non-canonical"; return info.cls; }

export function startFeed({ engine, store, backfill = null, pools /* Map pool → {mint, quote, creator} */, log = console.log }) {
  const hold = new Map(), queue = new Set(), mem = new Map(); const seen = new Set(), seenQ = [];
  let ws = null, watchdog = null;
  // A transaction is atomic: nobody can trade against the pool BETWEEN two of its events. So all of a transaction's events on a
  // pool are applied in order to reconstruct the state, and only the COMMITTED state after the last one is handed to the engine
  // as an observation (volume summed). Intermediate states never create a price, a peak, a crossing or a stop.
  const emitTx = (evs, info, t, meta, replay = false) => {
    const cls = poolClass(info); if (cls === "non-sol") { fs.nonSol += evs.length; if (info.mint === WSOL) fs.baseIsSol += evs.length; const k = (info.mint === WSOL ? "SOL" : String(info.mint).slice(0, 6)) + "/" + String(info.quote).slice(0, 8); fs.nonSolQuotes[k] = (fs.nonSolQuotes[k] || 0) + evs.length; return; }
    if (cls === "non-canonical") { fs.nonCanonical += evs.length; return; }
    const pool = evs[0].pool; let p = mem.get(pool); if (!p) mem.set(pool, (p = {}));
    const x = reduceTx(p, evs); fs.rejected += x.rejected;
    for (const e of x.breaks) { fs.discontinuities++; if (fs.lastBreaks.length < 20) fs.lastBreaks.push({ t: Math.round(t), pool: pool.slice(0, 8), sig: meta.sig?.slice(0, 12), type: e.type, ix: e.ix ?? null }); }
    if (x.lost) engine.coinLost(info.mint, t); // history and state trust restart here: nothing before this moment is used
    if (!x.last) return;
    fs.emitted++; if (evs.length > 1) fs.multiEventTx++; if (x.blockTs && !replay) { fs.lagMsSum += Math.max(0, t - x.blockTs) * 1000; fs.lagN++; }
    engine.onEvent({ t, mint: info.mint, pool, kind: x.buys && !x.sells ? "buy" : x.sells && !x.buys ? "sell" : x.buys ? "mixed" : evs[evs.length - 1].type, state: { ...x.last.state, approx: x.last.approx ?? null }, sol: x.sol, isBuy: x.buys && !x.sells ? true : x.sells && !x.buys ? false : null, user: x.user, buyers: x.buyers, sig: meta.sig, slot: meta.slot, blockTs: x.blockTs, events: evs.length, replay });
  };
  const resolved = (pool, info) => {
    pools.set(pool, info); store?.savePool(pool, info);
    const h = hold.get(pool); hold.delete(pool); if (!h) return;
    if (poolClass(info) !== "canonical") return;
    if (h.overflow) engine.coinLost(info.mint, h.items[0][1]);
    for (const [evs, t, meta] of h.items) { fs.replayed += evs.length; emitTx(evs, info, t, meta, true); }
  };
  // Pool look-ups, batched. A failing batch is never retried whole for ever (run 2: one bad batch blocked all later look-ups):
  // it is split in half and retried; a single pool that fails 3 times is dropped and its coin's held events are released
  // as lost history. The last error text is kept for the status page.
  const tries = new Map();
  async function lookup(batch) {
    try {
      fs.lookupCalls++; const res = await rpc("getMultipleAccounts", [batch, { encoding: "base64", dataSlice: { offset: 0, length: 203 } }]);
      res.value.forEach((acc, i) => { fs.lookups++; const p = acc ? parsePool(acc.data[0]) : null; if (!p) { fs.lookupFail++; hold.delete(batch[i]); pools.set(batch[i], { mint: null, quote: null, creator: null, cls: "non-sol", unreadable: true }); return; } resolved(batch[i], { mint: p.baseMint, quote: p.quoteMint, creator: p.creator }); });
    } catch (e) {
      fs.lookupErrs++; fs.lastLookupErr = String(e.message).slice(0, 140);
      if (batch.length > 1) { const h = Math.ceil(batch.length / 2); await new Promise((r) => setTimeout(r, 400)); await lookup(batch.slice(0, h)); await lookup(batch.slice(h)); return; }
      const n = (tries.get(batch[0]) || 0) + 1; tries.set(batch[0], n);
      if (n < 3) queue.add(batch[0]); else { tries.delete(batch[0]); fs.lookupFail++; hold.delete(batch[0]); }
    }
  }
  async function lookupLoop() {
    while (true) {
      await new Promise((r) => setTimeout(r, 1000));
      if (!queue.size) continue;
      const batch = [...queue].slice(0, 100); for (const p of batch) queue.delete(p);
      await lookup(batch);
    }
  }
  function onMsg(raw) {
    const t = Date.now() / 1000; fs.msgs++; fs.lastMsg = t; fs.bytes += raw.length; // Helius bills streams by uncompressed data: 2 credits per 0.1 MB
    let m; try { m = JSON.parse(raw); } catch { return; }
    const v = m?.params?.result?.value; if (!v) return; if (v.err) { fs.failedTx++; return; } // failed transactions change nothing: counted, not decoded
    if (seen.has(v.signature)) { fs.dupes++; return; } seen.add(v.signature); seenQ.push(v.signature); if (seenQ.length > 20000) for (const s of seenQ.splice(0, 10000)) seen.delete(s);
    const meta = { sig: v.signature, slot: m.params.result.context?.slot ?? null };
    const byPool = new Map(); // this transaction's events, grouped per pool, in order
    for (const e of eventsFromLogs(v.logs)) {
      fs.events++;
      if (e.type === "pool") { fs.pools++; const info = { mint: e.baseMint, quote: e.quoteMint, creator: e.creator }; resolved(e.pool, info); if (poolClass(info) === "canonical") { store?.saveCoin(e.baseMint, { pool: e.pool, firstSeen: Math.floor(t), pumpOrigin: "pump.fun", info: { population: "pumpswap-canonical", origin: "pump.fun", origin_evidence: "canonical pool: creator = pump pool-authority PDA", venues: ["PumpSwap"], discovery_source: "pool-creation event", price_source: "pool events", monitoring_mode: "live" } }); engine.coin(e.baseMint, { pool: e.pool }); engine.historyFrom(e.baseMint, t); backfill?.want(e.baseMint); } continue; }
      if (!e.pool) continue; let a = byPool.get(e.pool); if (!a) byPool.set(e.pool, (a = [])); a.push(e);
    }
    for (const [pool, evs] of byPool) {
      const info = pools.get(pool);
      if (info) { emitTx(evs, info, t, meta); continue; }
      let h = hold.get(pool); if (!h) { if (hold.size >= HOLD_POOLS) { fs.overflow++; continue; } h = { items: [], overflow: false }; hold.set(pool, h); queue.add(pool); }
      if (h.items.length < HOLD_PER_POOL) { h.items.push([evs, t, meta]); fs.held += evs.length; } else { h.overflow = true; h.items.shift(); h.items.push([evs, t, meta]); }
    }
  }
  function connect() {
    ws = new WebSocket(process.env.RPC_WS); let gone = false;
    ws.on("open", () => { fs.connected = true; engine.feedUp(Date.now() / 1000); log("[feed] up"); ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "logsSubscribe", params: [{ mentions: [PUMPSWAP_PROGRAM] }, { commitment: "confirmed" }] })); });
    ws.on("message", onMsg);
    const down = (why) => { if (gone) return; gone = true; if (!fs.connected) { setTimeout(connect, 5000); return; } fs.connected = false; mem.clear(); engine.feedDown(fs.lastMsg ?? Date.now() / 1000, why); fs.reconnects++; log("[feed] down: " + why); try { ws.terminate(); } catch {} setTimeout(connect, 2000); };
    ws.on("close", () => down("close")); ws.on("error", (e) => down("error " + e.message));
    clearInterval(watchdog); watchdog = setInterval(() => { if (fs.connected && fs.lastMsg && Date.now() / 1000 - fs.lastMsg > 60) down("no message for 60 s"); }, 5000);
  }
  connect(); lookupLoop();
  return { stop: () => { clearInterval(watchdog); try { ws.terminate(); } catch {} } };
}
