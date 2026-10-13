// PumpSwap feed (post-graduation trading). OBSERVE mode: decode + log stats; volume alerts come in v0.5.
import WebSocket from "ws";
import { CFG } from "./config.js";
import { pumpSwapEventsFromLogs, parsePoolAccount, PUMPSWAP_PROGRAM, WSOL } from "./pumpswap-decoder.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";

export const ps = { txs: 0, data: 0, buys: 0, sells: 0, pools: 0, unknownPool: 0, resolved: 0, lookupFail: 0, reconnects: 0 };
const poolMint = new Map();   // pool -> {mint, quote}
const pending = new Set();
const listeners = [];
export const onSwap = (fn) => listeners.push(fn);
let samples = 0;

async function resolvePool(pool) {
  if (poolMint.has(pool) || pending.has(pool)) return;
  pending.add(pool);
  try {
    const r = await rpc("getAccountInfo", [pool, { encoding: "base64" }]);
    const p = parsePoolAccount(r?.value?.data?.[0] || "");
    if (p) { poolMint.set(pool, { mint: p.baseMint, quote: p.quoteMint }); ps.resolved++; }
    else ps.lookupFail++;
  } catch { ps.lookupFail++; } finally { pending.delete(pool); }
}

function handle({ sig, slot, logs, err }) {
  ps.txs++;
  if (err) return;
  const evs = pumpSwapEventsFromLogs(logs);
  if (!evs.length) return;
  ps.data += evs.length;
  for (const e of evs) {
    if (e.type === "pool") { ps.pools++; poolMint.set(e.pool, { mint: e.baseMint, quote: e.quoteMint }); continue; }
    if (e.isBuy) ps.buys++; else ps.sells++;
    const pm = poolMint.get(e.pool);
    if (!pm) { ps.unknownPool++; resolvePool(e.pool); continue; }
    if (pm.quote !== WSOL) continue; // only SOL-quoted pools
    const sol = Number(e.userQuote) / 1e9, tokens = Number(e.baseAmt) / 1e6;
    const price = (Number(e.poolQuote) / 1e9) / (Number(e.poolBase) / 1e6);
    const mc = price * CFG.TOTAL_SUPPLY * solUsdCached();
    const tr = { mint: pm.mint, pool: e.pool, sig, slot, ts: e.ts, wallet: e.user, isBuy: e.isBuy, sol, tokens, price, mc };
    if (samples < 5) { samples++; console.log("[ps sample]", JSON.stringify({ mint: tr.mint.slice(0, 8), buy: tr.isBuy, sol: +sol.toFixed(3), mc: Math.round(mc), wallet: tr.wallet.slice(0, 6) })); }
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
