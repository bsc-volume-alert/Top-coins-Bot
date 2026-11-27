// rpc.mjs — paced JSON-RPC against the Solana RPC in RPC_HTTP (Helius key from the server's settings file). Read-only calls.
// Nothing here signs or sends a transaction. The RPC address (which contains the key) is never logged or written anywhere.
import { readFileSync, existsSync } from "node:fs";

export function loadEnv() {
  for (const f of [process.env.WALLETS_ENV, "/root/older/.env", "/root/keys-backup/older.env"].filter(Boolean)) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
  }
  if (process.env.HELIUS_API_KEY && !process.env.RPC_HTTP) process.env.RPC_HTTP = "https://mainnet.helius-rpc.com/?api-key=" + process.env.HELIUS_API_KEY;
  return !!process.env.RPC_HTTP;
}
export const scrub = (s) => String(s).replace(/api-key=[^&\s"']+/g, "api-key=***").replace(/https?:\/\/[^\s"']*helius[^\s"']*/gi, "<rpc>");
export const stats = { calls: 0, http: 0, retries: 0, failed: 0, last_err: "", last_err_at: "" };
const note = (m) => { stats.last_err = scrub(m).slice(0, 200); stats.last_err_at = new Date().toISOString(); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextAt = 0;
async function pace(n, rps) { const now = Date.now(), at = Math.max(now, nextAt); nextAt = at + (1000 * n) / rps; if (at > now) await sleep(at - now); }

async function post(body, ms = 30000) {
  const r = await fetch(process.env.RPC_HTTP, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
  stats.http++;
  if (r.status === 429 || r.status >= 500) throw Object.assign(new Error("http " + r.status), { retry: true });
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}
/** many calls of one method; returns results in the same order (null where the node had no answer). Up to 4 requests in flight. */
let noBatch = false;
export async function many(method, paramsList, { rps = 30, batch = 10 } = {}) {
  const out = new Array(paramsList.length).fill(null);
  let todo = paramsList.map((_, i) => i);
  for (let attempt = 0; todo.length && attempt < 7; attempt++) {
    if (attempt) { stats.retries += todo.length; await sleep(Math.min(30000, 800 * 2 ** attempt)); }
    const again = [], size = noBatch ? 1 : batch, groups = [];
    for (let k = 0; k < todo.length; k += size) groups.push(todo.slice(k, k + size));
    let g = 0, fatal = null;
    const worker = async () => { while (g < groups.length && !fatal) {
      const idx = groups[g++]; await pace(idx.length, rps); stats.calls += idx.length;
      try {
        const body = idx.map((i) => ({ jsonrpc: "2.0", id: i, method, params: paramsList[i] }));
        const j = await post(idx.length === 1 ? body[0] : body);
        const arr = Array.isArray(j) ? j : idx.length === 1 ? [j] : null;
        if (!arr) { again.push(...idx); noBatch = true; note("batch refused: " + JSON.stringify(j).slice(0, 120)); continue; } // provider refused a batch: single calls from now on
        const seen = new Set();
        for (const x of arr) { if (x?.id == null) continue; seen.add(x.id); if (x.error) { note(method + " error: " + JSON.stringify(x.error)); if (/429|rate|limit|timeout|busy|overload/i.test(JSON.stringify(x.error))) again.push(x.id); } else out[x.id] = x.result; }
        for (const i of idx) if (!seen.has(i)) again.push(i);
      } catch (e) { note(method + ": " + e.message); if (e.retry || /fetch failed|timeout|aborted|ECONN|socket|terminated/i.test(String(e.message))) again.push(...idx); else fatal = new Error(scrub(e.message)); }
    } };
    await Promise.all(Array.from({ length: Math.min(4, groups.length) }, worker));
    if (fatal) throw fatal;
    todo = again;
  }
  stats.failed += todo.length;
  return out;
}
export const one = async (method, params, o) => (await many(method, [params], o))[0];
/** one call that reports the node's error instead of hiding it: { result } or { error }. Retries rate limits, timeouts and 5xx. */
export async function callRaw(method, params, { rps = 30, timeoutMs = 90000, tries = 5 } = {}) {
  let last = "no answer";
  for (let a = 0; a < tries; a++) {
    if (a) { stats.retries++; await sleep(Math.min(20000, 1000 * 2 ** a)); }
    await pace(1, rps); stats.calls++;
    try {
      const j = await post({ jsonrpc: "2.0", id: 1, method, params }, timeoutMs);
      if (j?.error) { last = JSON.stringify(j.error).slice(0, 300); note(method + " error: " + last); if (/429|rate|limit|timeout|busy|overload/i.test(last) && !/not found|not supported|plan|upgrade/i.test(last)) continue; return { error: last }; }
      return { result: j?.result };
    } catch (e) { last = scrub(e.message); note(method + ": " + last); if (e.retry || /fetch failed|timeout|aborted|ECONN|socket|terminated/i.test(last)) continue; return { error: last }; }
  }
  stats.failed++; return { error: last };
}
