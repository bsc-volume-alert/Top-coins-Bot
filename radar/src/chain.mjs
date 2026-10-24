// radar 0.4.0: a few direct chain reads through Helius (key HELIUS_API_KEY in /root/tracker/.env), for what GMGN and Birdeye do not give:
// who really launched the coin (the wallet that signed the create transaction, not the "creator" named on it), Token-2022 risks
// (permanent delegate, transfer tax, transfer hook, mint / freeze authority), and how much of the launch supply the dev and the launch
// wallets still hold at the moment the radar catches the coin. About 3 calls a coin, paced; record-only.
import "./env.mjs";
import { createHash } from "node:crypto";
export const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", WSOL = "So11111111111111111111111111111111111111112";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const URL_ = () => (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : process.env.RADAR_RPC_URL || "");
export const chainOn = () => !!URL_();
export const hStat = { calls: 0, errors: 0, lastErr: "" };
const RPS = Number(process.env.RADAR_RPC_RPS || 4); let next = 0, chainP = Promise.resolve();
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
export async function rpc(method, params) {
  const p = chainP.then(async () => { const w = next - Date.now(); if (w > 0) await nap(w); next = Math.max(Date.now(), next) + 1000 / RPS; }); chainP = p.catch(() => {}); await p;
  hStat.calls++; let wait = 1000;
  for (let i = 0; i < 4; i++) { try { const r = await fetch(URL_(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(20000) });
      const t = await r.text(); if (r.status === 429 || !/^\s*[{[]/.test(t)) { await nap(wait); wait *= 2; continue; } const j = JSON.parse(t); if (j.error) throw new Error(`${method}: ${j.error.message || "error"}`); return j.result; }
    catch (e) { if (/^\w+: /.test(e.message) || i === 3) { hStat.errors++; hStat.lastErr = e.message.slice(0, 160); throw e; } await nap(wait); wait *= 2; } }
  throw new Error(method + ": Helius busy");
}
const A58E = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58(buf) { const d = []; for (const b of buf) { let c = b; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c > 0) { d.push(c % 58); c = (c / 58) | 0; } }
  let s = ""; for (const b of buf) { if (b === 0) s += "1"; else break; } for (let i = d.length - 1; i >= 0; i--) s += A58E[d[i]]; return s; }
const A58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function unb58(s) {
  const out = []; for (const ch of s) { let c = A58.indexOf(ch); if (c < 0) throw new Error("not base58");
    for (let j = 0; j < out.length; j++) { c += out[j] * 58; out[j] = c & 255; c >>= 8; } while (c > 0) { out.push(c & 255); c >>= 8; } }
  for (const ch of s) { if (ch === "1") out.push(0); else break; }
  return Buffer.from(out.reverse());
}
const P = 2n ** 255n - 19n, md = (a) => { a %= P; return a < 0n ? a + P : a; };
const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = (r * b) % P; b = (b * b) % P; e >>= 1n; } return r; };
const DC = md(-121665n * pw(121666n, P - 2n));
function onCurve(buf) { // ed25519 point decompression check — a PDA is the first bump whose hash is NOT a valid point
  const b = Buffer.from(buf); b[31] &= 0x7f; let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(b[i]);
  if (y >= P) return false; const y2 = (y * y) % P, u = md(y2 - 1n), v = md(DC * y2 + 1n), x2 = (u * pw(v, P - 2n)) % P;
  return x2 === 0n || pw(x2, (P - 1n) / 2n) === 1n;
}
const seedBuf = (s) => (Buffer.isBuffer(s) ? s : s.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s) ? unb58(s) : Buffer.from(s));
export function pda(seeds, program) {
  const pg = unb58(program);
  for (let bump = 255; bump >= 0; bump--) {
    const h = createHash("sha256"); for (const s of seeds) h.update(seedBuf(s)); h.update(Buffer.from([bump])); h.update(pg); h.update(Buffer.from("ProgramDerivedAddress"));
    const d = h.digest(); if (!onCurve(d)) return bs58(d);
  }
  throw new Error("no PDA");
}
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export const curveOf = (mint) => pda(["bonding-curve", mint], PUMP);
export const poolOf = (mint) => pda([Buffer.from("pool"), u16(0), unb58(pda(["pool-authority", mint], PUMP)), unb58(mint), unb58(WSOL)], AMM);
export const ataOf = (owner, mint, tokenProg = TOKEN) => pda([unb58(owner), unb58(tokenProg), unb58(mint)], ATA_PROG);


export const TX = (sig) => [sig, { maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed" }];
export const keysOf = (tx) => [...(tx?.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey)), ...(tx?.meta?.loadedAddresses?.writable || []), ...(tx?.meta?.loadedAddresses?.readonly || [])];
