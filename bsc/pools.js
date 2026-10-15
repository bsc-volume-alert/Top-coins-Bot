// After graduation a Flap token trades on PancakeSwap. LaunchedToDEX gives the pool; we confirm it is a Pancake V2 or
// V3 pool (factory) and its token order once, then decode its Swap events into the same trade shape as the curve.
// Infinity (CL) pools are counted but not followed yet.
import { C } from "./config.js";
import { ethCalls, word, u, i256, addr } from "./rpc.js";
import { db } from "./db.js";

const V2_FACTORY = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73", V3_FACTORY = "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865";
export const SWAP_V2 = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
export const SWAP_V3 = "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83";
const ROUTERS = new Set(["0x10ed43c718714eb63d5aa57b78b54704e256024e", "0x13f4ea83d0bd40e75c8222255bc855a974568dd4", "0x1a0a18ac4becddbd6389559687d1a73d8927e416", "0x1b81d678ffb9c0263b24a97847620c99d213eb14", "0x111111125421ca6dc452d289314280a0f8842a65", "0x1111111254eeb25477b68fb85ed929f73a960582"]);
export const isRouter = (a) => ROUTERS.has(a);
db.exec(`CREATE TABLE IF NOT EXISTS pools (pool TEXT PRIMARY KEY, token TEXT, quote TEXT, kind TEXT, token_is0 INTEGER, added_ts INTEGER)`);
const qPut = db.prepare(`INSERT OR REPLACE INTO pools VALUES (?,?,?,?,?,?)`);
export const P = new Map(); // pool -> {token, quote, kind: v2|v3|cl, tokenIs0, lastUse}
export const poolStats = { v2: 0, v3: 0, cl: 0, unknown: 0, swaps: 0 };
for (const r of db.prepare(`SELECT * FROM pools WHERE added_ts > ?`).all(Math.floor(Date.now() / 1000) - 3 * 86400)) P.set(r.pool, { token: r.token, quote: r.quote, kind: r.kind, tokenIs0: !!r.token_is0, lastUse: r.added_ts * 1000 });

export async function addPool(token, pool, quote) {
  if (P.has(pool)) return P.get(pool);
  const q = !quote || /^0x0+$/.test(quote) ? C.WBNB : quote;
  let kind = "cl", tokenIs0 = token < q;
  try {
    const [f, t0] = await ethCalls([{ to: pool, data: "0xc45a0155" }, { to: pool, data: "0x0dfe1681" }]);
    const fac = f ? addr(f) : null;
    if (fac === V2_FACTORY) kind = "v2"; else if (fac === V3_FACTORY) kind = "v3"; else kind = fac ? "unknown" : "cl";
    if (t0) tokenIs0 = addr(t0) === token;
  } catch {}
  poolStats[kind] = (poolStats[kind] || 0) + 1;
  const p = { token, quote: q, kind, tokenIs0, lastUse: Date.now() }; P.set(pool, p);
  qPut.run(pool, token, q, kind, tokenIs0 ? 1 : 0, Math.floor(Date.now() / 1000));
  return p;
}
export const touchPool = (pool) => { const p = P.get(pool); if (p) p.lastUse = Date.now(); };
/** pools we follow: V2/V3 only, most recently used first, capped */
export function poolAddrs() {
  return [...P.entries()].filter(([, p]) => p.kind === "v2" || p.kind === "v3").sort((a, b) => b[1].lastUse - a[1].lastUse).slice(0, C.MAX_POOLS).map(([k]) => k);
}
export function decodePoolLog(l) {
  const p = P.get(l.address.toLowerCase()); if (!p || (p.kind !== "v2" && p.kind !== "v3")) return null;
  let tok, qt; // pool's perspective (+ = into pool)
  if (l.topics[0] === SWAP_V2 && p.kind === "v2") {
    const d0 = u(word(l.data, 0)) - u(word(l.data, 2)), d1 = u(word(l.data, 1)) - u(word(l.data, 3));
    tok = p.tokenIs0 ? d0 : d1; qt = p.tokenIs0 ? d1 : d0;
  } else if (l.topics[0] === SWAP_V3 && p.kind === "v3") {
    const a0 = i256(word(l.data, 0)), a1 = i256(word(l.data, 1));
    tok = p.tokenIs0 ? a0 : a1; qt = p.tokenIs0 ? a1 : a0;
  } else return null;
  const isBuy = tok < 0n && qt > 0n, isSell = tok > 0n && qt < 0n; if (!isBuy && !isSell) return null;
  const amount = Number(tok < 0n ? -tok : tok) / 1e18, quoteAmt = Number(qt < 0n ? -qt : qt) / 1e18;
  if (!(amount > 0) || !(quoteAmt > 0)) return null;
  const sender = addr(l.topics[1]), recipient = addr(l.topics[2]);
  const wallet = isBuy && !isRouter(recipient) && !P.has(recipient) ? recipient : null; // sells land at the router; trader unknown without a tx lookup
  poolStats.swaps++; p.lastUse = Date.now();
  return { kind: "trade", token: p.token, wallet, isBuy, amount, quoteAmt, price: quoteAmt / amount, viaRouter: isRouter(sender), block: parseInt(l.blockNumber, 16), tx: l.transactionHash, li: parseInt(l.logIndex, 16), venue: "pancake-" + p.kind, pool: l.address.toLowerCase() };
}
/** real current price from the pool (sweeper): quote per token */
export async function poolPrice(pool) {
  const p = P.get(pool); if (!p) return null;
  try {
    if (p.kind === "v2") { const [h] = await ethCalls([{ to: pool, data: "0x0902f1ac" }]); if (!h) return null; const r0 = Number(u(word(h, 0))), r1 = Number(u(word(h, 1))); return p.tokenIs0 ? r1 / r0 : r0 / r1; }
    if (p.kind === "v3") { const [h] = await ethCalls([{ to: pool, data: "0x3850c7bd" }]); if (!h) return null; const sq = Number(u(word(h, 0))) / 2 ** 96, p01 = sq * sq; return p.tokenIs0 ? p01 : 1 / p01; }
  } catch {}
  return null;
}
