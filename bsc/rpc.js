// BSC nodes: free public endpoints first, NodeReal (free key) as backup. Each node is only asked what it allows;
// nodes that refuse too often are rested for 15 min. Stats feed /status and the health alarms.
import { C } from "./config.js";

const LIMIT_RE = /limit|rate|too many|exceed|upgrade|paid|specify an address|restrict|forbidden/i;
// caps: ws = live subscription · logs = address-filtered eth_getLogs · chain = whole-chain eth_getLogs
export const NODES = [
  { name: "publicnode", http: "https://bsc-rpc.publicnode.com", ws: "wss://bsc-rpc.publicnode.com", caps: { ws: true, logs: true, chain: false } },
  { name: "drpc", http: "https://bsc.drpc.org", caps: { ws: false, logs: false, chain: false } },
  { name: "bnbchain", http: "https://bsc-dataseed.bnbchain.org", caps: { ws: false, logs: false, chain: false } },
  ...(C.NODEREAL_KEY ? [{ name: "nodereal", backup: true, http: `https://bsc-mainnet.nodereal.io/v1/${C.NODEREAL_KEY}`, ws: `wss://bsc-mainnet.nodereal.io/ws/v1/${C.NODEREAL_KEY}`, caps: { ws: true, logs: true, chain: true } }] : []),
].map((n) => ({ ...n, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, restUntil: 0, win: [] }));
if (process.env.BSC_TEST_NODE) { // local test harness
  NODES.length = 0;
  NODES.push({ name: "test", http: process.env.BSC_TEST_NODE, ws: process.env.BSC_TEST_NODE.replace("http", "ws").replace(/:\d+$/, (p) => ":" + (+p.slice(1) + 1)), caps: { ws: true, logs: true, chain: true }, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, restUntil: 0, win: [] });
}
export const backupUse = { calls: {}, wsEvents: 0, since: Date.now() };
export const hex = (x) => "0x" + x.toString(16);

export async function call(node, method, params, timeout = 10000) {
  const t = Date.now(); let r, j;
  const mark = (kind, msg) => { node.win.push({ ts: Date.now(), kind }); if (kind !== "ok") node.lastErr = String(msg).slice(0, 90); };
  try {
    r = await fetch(node.http, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Array.isArray(method) ? method : { jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeout) });
    j = r.status === 429 || r.status === 403 ? null : await r.json();
  } catch (e) { node.err++; mark("err", e.message); throw e; }
  if (r.status === 429 || r.status === 403) { node.r429++; mark("429", `${r.status} refused`); throw Object.assign(new Error(`${r.status} refused`), { limit: true }); }
  if (Array.isArray(j)) { node.ok++; node.ms = Date.now() - t; mark("ok"); return j; } // batch
  if (j?.error) { const msg = String(j.error.message || "rpc error"); const lim = LIMIT_RE.test(msg); if (lim) node.r429++; else node.err++; mark(lim ? "429" : "err", msg); throw Object.assign(new Error(msg), { limit: lim }); }
  node.ok++; node.ms = Date.now() - t; mark("ok"); return j?.result;
}
setInterval(() => { const cut = Date.now() - 600_000; for (const n of NODES) while (n.win.length && n.win[0].ts < cut) n.win.shift(); }, 30_000);
export const winStats = (n) => n.win.reduce((a, x) => { a[x.kind]++; return a; }, { ok: 0, err: 0, "429": 0 });
export const usable = (n, cap) => (!cap || n.caps[cap]) && Date.now() > n.restUntil;
function rest(n, why) { if (Date.now() < n.restUntil) return; n.restUntil = Date.now() + 15 * 60_000; console.log(`[node] resting ${n.name}: ${why}`); }

/** priority order: free public nodes first, NodeReal only if they all fail */
export async function rpc(method, params, cap = null) {
  const pool = NODES.filter((n) => usable(n, cap));
  for (const n of pool) {
    if (n.backup) backupUse.calls[method] = (backupUse.calls[method] || 0) + 1;
    try { return await call(n, method, params); }
    catch (e) { if (e.limit) { const s = winStats(n); if (s["429"] >= 5 && s["429"] > s.ok) rest(n, e.message); if (/specify an address/i.test(e.message)) n.caps.chain = false; } }
  }
  throw new Error(`no node could answer ${method}${cap ? ` (${cap})` : ""}`);
}
export async function getLogsChunked(filter, from, to, step = 100) {
  const out = [];
  for (let a = from; a <= to; a += step) out.push(...((await rpc("eth_getLogs", [{ ...filter, fromBlock: hex(a), toBlock: hex(Math.min(a + step - 1, to)) }], "logs")) || []));
  return out;
}
/** batched eth_call: [{to, data}] → hex results (null where it reverted) */
export async function ethCalls(calls) {
  if (!calls.length) return [];
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i + 1, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] }));
  for (const n of NODES.filter((x) => usable(x))) {
    try { const res = await call(n, body); const by = new Map(res.map((x) => [x.id, x.result ?? null])); if (n.backup) backupUse.calls.eth_call = (backupUse.calls.eth_call || 0) + calls.length; return calls.map((_, i) => by.get(i + 1) ?? null); } catch {}
  }
  return calls.map(() => null);
}
/** batched transaction lookups → [{from, to}] (null where unavailable) */
export async function txInfo(hashes) {
  if (!hashes.length) return [];
  const body = hashes.map((h, i) => ({ jsonrpc: "2.0", id: i + 1, method: "eth_getTransactionByHash", params: [h] }));
  for (const n of NODES.filter((x) => usable(x) && !x.backup)) {
    try { const res = await call(n, body, 15000); const by = new Map(res.map((x) => [x.id, x.result])); return hashes.map((_, i) => { const t = by.get(i + 1); return t ? { from: t.from?.toLowerCase(), to: t.to?.toLowerCase() } : null; }); } catch {}
  }
  return hashes.map(() => null);
}

// ABI helpers
export const word = (data, i) => data.slice(2 + i * 64, 2 + (i + 1) * 64);
export const u = (h) => BigInt("0x" + (h || "0"));
export const i256 = (h) => { const v = u(h); return v >= 1n << 255n ? v - (1n << 256n) : v; };
export const addr = (h) => "0x" + h.slice(-40).toLowerCase();
export const ether = (v) => Number(v) / 1e18;
export function str(data, offsetWord) { // dynamic string at the given head word
  try { const off = Number(u(word(data, offsetWord))) / 32, len = Number(u(word(data, off)));
    return Buffer.from(data.slice(2 + (off + 1) * 64, 2 + (off + 1) * 64 + len * 2), "hex").toString("utf8").replace(/[\0<>&]/g, "").slice(0, 60); } catch { return ""; }
}
