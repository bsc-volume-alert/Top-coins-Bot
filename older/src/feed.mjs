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
// BOUNDED MEMORY FOR POOLS THAT ARE NOT OURS (25 Nov 2026). Measured on the validation run: in 90 minutes 372,000 pools the
// program had never seen traded on PumpSwap — almost all of them not SOL-quoted (most with SOL as the BASE token), a few
// events each — while the pump.fun flow was unchanged. Every one used to be kept for ever as an object with three address
// strings (and written to the database), and its events were held, up to 300 a pool, until a look-up at 100 pools a second
// could classify it: working memory went from 0.6 to 0.84 GB in 90 minutes. Now:
//   - a pool that is not SOL-quoted (or cannot be read) is remembered only as a key in a first-in-first-out list of at most
//     JUNK_MAX pools, in memory only. One that falls out and trades again is simply looked up again (1 RPC call per 100).
//     Only SOL-quoted pools are written to the database and loaded at a start;
//   - a SOL-quoted pool found NOT to be a canonical pump.fun pool keeps no addresses either;
//   - all held events together are limited to HOLD_ITEMS; beyond that a pool keeps only its newest events and is marked as
//     overflowed — if it turns out to be one of ours its history restarts there (engine.coinLost), exactly as before;
//   - while many pools wait, look-ups run back to back instead of once a second.
// Nothing here changes what is priced: canonical, SOL-quoted pump.fun pools, as before.
const HOLD_ITEMS = Number(process.env.OLDER_HOLD_ITEMS || 60000), JUNK_MAX = Number(process.env.OLDER_JUNK_POOLS || 300000);
export const NON_SOL = Object.freeze({ mint: null, quote: null, creator: null, cls: "non-sol", baseSol: false }), NON_SOL_BASE_SOL = Object.freeze({ mint: null, quote: null, creator: null, cls: "non-sol", baseSol: true }), NON_CANON = Object.freeze({ mint: null, quote: WSOL, creator: null, cls: "non-canonical" });
/** what is kept for a pool whose class makes it not ours: a shared marker instead of its own record. A SOL-quoted pool not yet classified, and a canonical one, keep their record. */
export function compactPool(info) { if (!info) return info; if (info.unreadable || info.cls === "non-sol" || (info.quote != null && info.quote !== WSOL)) return info.baseSol || info.mint === WSOL ? NON_SOL_BASE_SOL : NON_SOL; if (info.cls === "non-canonical") return NON_CANON; return info; }
/** the bounded first-in-first-out memory of pools that are not SOL-quoted */
export class Junk { constructor(max = JUNK_MAX) { this.max = max; this.m = new Map(); this.evicted = 0; }
  get(k) { return this.m.get(k); } get size() { return this.m.size; }
  add(k, v) { this.m.set(k, v); if (this.m.size > this.max) { let n = Math.max(1, Math.floor(this.max / 10)); for (const key of this.m.keys()) { this.m.delete(key); this.evicted++; if (--n <= 0) break; } } } }
/** held events of pools still being looked up, with one limit for all pools together */
export class Hold { constructor(perPool = HOLD_PER_POOL, pools = HOLD_POOLS, items = HOLD_ITEMS) { this.perPool = perPool; this.maxPools = pools; this.maxItems = items; this.m = new Map(); this.items = 0; this.dropped = 0; }
  get size() { return this.m.size; } has(k) { return this.m.has(k); }
  /** returns "new" (first event of an unknown pool: queue a look-up), "held", "kept-newest" / "dropped" (limit reached: marked overflowed) or "full" (no room for another pool) */
  push(pool, item, t) { let h = this.m.get(pool), isNew = false; if (!h) { if (this.m.size >= this.maxPools) return "full"; h = { items: [], overflow: false, t0: t }; this.m.set(pool, h); isNew = true; }
    if (h.items.length < this.perPool && this.items < this.maxItems) { h.items.push(item); this.items++; return isNew ? "new" : "held"; }
    h.overflow = true; if (h.items.length) { h.items.shift(); h.items.push(item); return isNew ? "new" : "kept-newest"; } this.dropped++; return isNew ? "new" : "dropped"; }
  take(pool) { const h = this.m.get(pool); if (h) { this.items -= h.items.length; this.m.delete(pool); } return h ?? null; } }

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
export function poolClass(info) { if (info.cls) return info.cls; if (Object.isFrozen(info)) return "non-sol"; info.cls = info.quote !== WSOL ? "non-sol" : info.creator && isCanonical(info.mint, info.creator) ? "canonical" : "non-canonical"; return info.cls; }

export function startFeed({ engine, store, backfill = null, pools /* Map pool → {mint, quote, creator} */, log = console.log }) {
  const hold = new Hold(), junk = new Junk(), queue = new Set(), mem = new Map(); const seen = new Set(), seenQ = [];
  // pools loaded from the database: a non-SOL row left by an earlier version is not kept in memory; SOL-quoted rows share one quote string
  for (const [k, v] of pools) { if (v.quote !== WSOL) pools.delete(k); else v.quote = WSOL; }
  let ws = null, watchdog = null;
  // A transaction is atomic: nobody can trade against the pool BETWEEN two of its events. So all of a transaction's events on a
  // pool are applied in order to reconstruct the state, and only the COMMITTED state after the last one is handed to the engine
  // as an observation (volume summed). Intermediate states never create a price, a peak, a crossing or a stop.
  const emitTx = (evs, info, t, meta, replay = false) => {
    const cls = poolClass(info); if (cls === "non-sol") { fs.nonSol += evs.length; if (info.baseSol || info.mint === WSOL) fs.baseIsSol += evs.length; return; }
    if (cls === "non-canonical") { fs.nonCanonical += evs.length; if (info !== NON_CANON) pools.set(evs[0].pool, NON_CANON); return; } // classified on its first event: its addresses are not needed again
    const pool = evs[0].pool; let p = mem.get(pool); if (!p) mem.set(pool, (p = {}));
    const x = reduceTx(p, evs); fs.rejected += x.rejected;
    for (const e of x.breaks) { fs.discontinuities++; if (fs.lastBreaks.length < 20) fs.lastBreaks.push({ t: Math.round(t), pool: pool.slice(0, 8), sig: meta.sig?.slice(0, 12), type: e.type, ix: e.ix ?? null }); }
    if (x.lost) engine.coinLost(info.mint, t); // history and state trust restart here: nothing before this moment is used
    if (!x.last) return;
    fs.emitted++; if (evs.length > 1) fs.multiEventTx++; if (x.blockTs && !replay) { fs.lagMsSum += Math.max(0, t - x.blockTs) * 1000; fs.lagN++; }
    engine.onEvent({ t, mint: info.mint, pool, kind: x.buys && !x.sells ? "buy" : x.sells && !x.buys ? "sell" : x.buys ? "mixed" : evs[evs.length - 1].type, state: { ...x.last.state, approx: x.last.approx ?? null }, sol: x.sol, isBuy: x.buys && !x.sells ? true : x.sells && !x.buys ? false : null, user: x.user, buyers: x.buyers, sig: meta.sig, slot: meta.slot, blockTs: x.blockTs, events: evs.length, replay });
  };
  const resolved = (pool, info) => {
    const h = hold.take(pool);
    if (info.quote !== WSOL) { const k = (info.mint === WSOL ? "SOL" : String(info.mint).slice(0, 6)) + "/" + String(info.quote).slice(0, 8); if (fs.nonSolQuotes[k] != null || Object.keys(fs.nonSolQuotes).length < 400) fs.nonSolQuotes[k] = (fs.nonSolQuotes[k] || 0) + 1; // which quote tokens (a bounded sample, counted per pool)
      junk.add(pool, compactPool(info)); if (h) fs.nonSol += h.items.reduce((n, x) => n + x[0].length, 0); return; } // not SOL-quoted: remembered as a key only, never written to the database
    store?.savePool(pool, info); const canon = poolClass(info) === "canonical"; pools.set(pool, canon ? info : NON_CANON);
    if (!h || !canon) return;
    if (h.overflow) engine.coinLost(info.mint, h.items[0]?.[1] ?? h.t0);
    for (const [evs, t, meta] of h.items) { fs.replayed += evs.length; emitTx(evs, info, t, meta, true); }
  };
  // Pool look-ups, batched. A failing batch is never retried whole for ever (run 2: one bad batch blocked all later look-ups):
  // it is split in half and retried; a single pool that fails 3 times is dropped and its coin's held events are released
  // as lost history. The last error text is kept for the status page.
  const tries = new Map();
  async function lookup(batch) {
    try {
      fs.lookupCalls++; const res = await rpc("getMultipleAccounts", [batch, { encoding: "base64", dataSlice: { offset: 0, length: 203 } }]);
      res.value.forEach((acc, i) => { fs.lookups++; const p = acc ? parsePool(acc.data[0]) : null; if (!p) { fs.lookupFail++; hold.take(batch[i]); junk.add(batch[i], NON_SOL); return; } resolved(batch[i], { mint: p.baseMint, quote: p.quoteMint, creator: p.creator }); });
    } catch (e) {
      fs.lookupErrs++; fs.lastLookupErr = String(e.message).slice(0, 140);
      if (batch.length > 1) { const h = Math.ceil(batch.length / 2); await new Promise((r) => setTimeout(r, 400)); await lookup(batch.slice(0, h)); await lookup(batch.slice(h)); return; }
      const n = (tries.get(batch[0]) || 0) + 1; tries.set(batch[0], n);
      if (n < 3) queue.add(batch[0]); else { tries.delete(batch[0]); fs.lookupFail++; hold.take(batch[0]); }
    }
  }
  async function lookupLoop() {
    while (true) {
      await new Promise((r) => setTimeout(r, queue.size > 300 ? 150 : 1000)); // a long queue is worked through back to back
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
      if (e.type === "pool") { fs.pools++; const info = { mint: e.baseMint, quote: e.quoteMint, creator: e.creator }; resolved(e.pool, info); if (poolClass(info) === "canonical") { store?.saveCoin(e.baseMint, { pool: e.pool, firstSeen: Math.floor(t), pumpOrigin: "pump.fun", info: { population: "pumpswap-canonical", origin: "pump.fun", origin_evidence: "canonical pool: creator = pump pool-authority PDA", venues: ["PumpSwap"], discovery_source: "pool-creation event", price_source: "pool events", monitoring_mode: "live" } }); engine.coin(e.baseMint, { pool: e.pool }); engine.historyFrom(e.baseMint, t); engine.migrated?.(e.baseMint, t); /* the HIT books' clock (spec HIT) */ backfill?.want(e.baseMint); } continue; }
      if (!e.pool) continue; let a = byPool.get(e.pool); if (!a) byPool.set(e.pool, (a = [])); a.push(e);
    }
    // ONE TRANSACTION, IN THE ONLY SAFE ORDER (engine.tx): its delay behind the chain is noted first — from every decoded
    // transaction, whatever its pool class — then ALL its pools' committed states are installed, and only then may the end of
    // a late spell take effect and positions be revalued. Never halfway through a transaction that touches several pools.
    let bts = null; for (const evs of byPool.values()) for (const e of evs) if (e.ts) bts = e.ts;
    engine.tx(t, bts ? Math.max(0, t - bts) : null, () => {
      for (const [pool, evs] of byPool) {
        const info = pools.get(pool) ?? junk.get(pool);
        if (info) { emitTx(evs, info, t, meta); continue; }
        const r = hold.push(pool, [evs, t, meta], t); if (r === "full") { fs.overflow++; continue; } if (r === "new") queue.add(pool); if (r !== "dropped") fs.held += evs.length;
      }
    });
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
  return { stop: () => { clearInterval(watchdog); try { ws.terminate(); } catch {} }, sizes: () => ({ pools_known: pools.size, other_pools_remembered: junk.size, other_pools_forgotten: junk.evicted, pool_states: mem.size, held_pools: hold.size, held_items: hold.items, held_dropped: hold.dropped, lookup_queue: queue.size, seen_signatures: seen.size, non_sol_keys: Object.keys(fs.nonSolQuotes).length }) };
}
