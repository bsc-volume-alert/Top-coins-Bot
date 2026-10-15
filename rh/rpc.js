// Robinhood Chain nodes: the free public endpoint first, Alchemy (free key, metered in compute units) as backup.
// Every call is counted so /status can say what the feed would cost on Alchemy's free tier.
import WebSocket from "ws";
import { C } from "./config.js";

const LIMIT_RE = /limit|rate|too many|exceed|throttl|capacity|upgrade|paid/i;
export const NODES = [
  { name: "public", http: C.PUBLIC_RPC },
  ...(C.ALCHEMY_KEY ? [{ name: "alchemy", backup: true, http: `https://robinhood-mainnet.g.alchemy.com/v2/${C.ALCHEMY_KEY}`, ws: `wss://robinhood-mainnet.g.alchemy.com/v2/${C.ALCHEMY_KEY}` }] : []),
].map((n) => ({ ...n, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, calls: {}, bytes: 0, restUntil: 0 }));
if (process.env.RH_TEST_NODE) { NODES.length = 0; NODES.push({ name: "test", http: process.env.RH_TEST_NODE, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, calls: {}, bytes: 0, restUntil: 0 }); }

// Alchemy compute units per call (approximate; the Alchemy dashboard is the source of truth)
const CU = { eth_getLogs: 60, eth_blockNumber: 10, eth_chainId: 0, eth_call: 26, eth_getBlockByNumber: 20, eth_getTransactionByHash: 20, eth_getCode: 26 };
export const alchemy = { day: "", cu: 0, capHit: 0 };
const spend = (m) => { const k = new Date().toISOString().slice(0, 10); if (alchemy.day !== k) { alchemy.day = k; alchemy.cu = 0; } alchemy.cu += CU[m] ?? 20; };
const overBudget = () => { const k = new Date().toISOString().slice(0, 10); if (alchemy.day !== k) { alchemy.day = k; alchemy.cu = 0; } if (alchemy.cu >= C.ALCHEMY_DAY_CU) { alchemy.capHit++; return true; } return false; };
export const hex = (x) => "0x" + x.toString(16);

export async function call(node, method, params, timeout = 12000) {
  const t = Date.now(); let r, txt, j;
  node.calls[method] = (node.calls[method] || 0) + 1; if (node.backup) spend(method);
  try {
    r = await fetch(node.http, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeout) });
    txt = await r.text(); node.bytes += txt.length;
  } catch (e) { node.err++; node.lastErr = e.message.slice(0, 90); throw e; }
  if (r.status === 429 || r.status === 403 || r.status === 503) { node.r429++; node.lastErr = `${r.status} refused`; throw Object.assign(new Error(`${r.status} refused`), { limit: true }); }
  try { j = JSON.parse(txt); } catch { node.err++; node.lastErr = `bad reply ${r.status}`; throw new Error(`bad reply ${r.status}`); }
  if (j?.error) { const msg = String(j.error.message || "rpc error"); const lim = LIMIT_RE.test(msg); if (lim) node.r429++; else node.err++; node.lastErr = msg.slice(0, 90); throw Object.assign(new Error(msg), { limit: lim }); }
  node.ok++; node.ms = Date.now() - t; return j.result;
}

let publicFailSince = 0;
export const usingBackup = () => publicFailSince && Date.now() - publicFailSince > C.ALCHEMY_AFTER_S * 1000;
/** public node first; Alchemy only once the public node has been failing for ALCHEMY_AFTER_S and within the daily CU cap */
export async function rpc(method, params, { backupOk = true } = {}) {
  for (const n of NODES) {
    if (Date.now() < n.restUntil) continue;
    if (n.backup && (!backupOk || !usingBackup() || overBudget())) continue;
    try { const r = await call(n, method, params); if (!n.backup) publicFailSince = 0; return r; }
    catch (e) { if (!n.backup && e.limit && n.r429 % 20 === 19) { n.restUntil = Date.now() + 30_000; console.log(`[node] resting ${n.name} 30s: ${e.message}`); } }
  }
  if (!publicFailSince) publicFailSince = Date.now();
  throw new Error(`no node answered ${method}`);
}

/** one-off check of every node: chain ID, block height, getLogs allowed, latency */
export async function testNodes() {
  const out = [];
  for (const n of NODES) {
    const row = { name: n.name };
    try {
      const t = Date.now(); row.chain = parseInt(await call(n, "eth_chainId", []), 16); row.block = parseInt(await call(n, "eth_blockNumber", []), 16); row.ms = Date.now() - t;
      try { const logs = await call(n, "eth_getLogs", [{ address: C.V4_POOL_MANAGER, fromBlock: hex(row.block - 50), toBlock: hex(row.block) }]); row.logs = `ok (${logs.length} v4 events in 50 blocks)`; } catch (e) { row.logs = "❌ " + e.message.slice(0, 60); }
    } catch (e) { row.error = e.message.slice(0, 80); }
    out.push(row);
  }
  return out;
}

/** proves the Alchemy WebSocket works: subscribes to new blocks for `secs` seconds, counts messages and bytes */
export function testWs(secs = 15) {
  const n = NODES.find((x) => x.ws);
  if (!n) return Promise.resolve({ skipped: "no Alchemy key yet" });
  return new Promise((resolve) => {
    const res = { heads: 0, bytes: 0 }; let ws;
    const done = (extra = {}) => { try { ws.close(); } catch {} resolve({ ...res, ...extra }); };
    try { ws = new WebSocket(n.ws); } catch (e) { return resolve({ error: e.message }); }
    const timer = setTimeout(() => done(), secs * 1000);
    ws.on("open", () => ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["newHeads"] })));
    ws.on("message", (m) => { res.bytes += m.length; const j = JSON.parse(m); if (j.error) { clearTimeout(timer); done({ error: j.error.message }); } else if (j.method === "eth_subscription") res.heads++; });
    ws.on("error", (e) => { clearTimeout(timer); done({ error: e.message.slice(0, 80) }); });
  });
}
