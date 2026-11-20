// decoder.mjs — PumpSwap (pump.fun AMM, program pAMMBay…) event decoder, written against the PUBLISHED IDL:
//   pump-fun/pump-public-docs, idl/pump_amm.json (pinned: see IDL_PIN; field order and discriminators copied from it).
// Decodes every reserve-changing event: BuyEvent, SellEvent, DepositEvent, WithdrawEvent, InitBoostEvent, BoostBuyAndBurnEvent,
// plus CreatePoolEvent and SweepPoolFeeEvent (price-neutral; kept for bookkeeping).
// Pricing uses EFFECTIVE quote reserves = quote vault + signed virtual_quote_reserves (i128), as the docs require.
// Fees are NOT summed from field names (creator fee / holder rewards / cashback overlap): the fee on each side is measured as the
// user's net debit or credit against the amount that moved on the curve (user_quote_amount_in / quote_amount_in − 1 for a buy,
// 1 − user_quote_amount_out / quote_amount_out for a sell). Individual components are kept for the record only.
//
// OPEN QUESTION, NOT ASSUMED: are an event's pool_*_token_reserves the reserves BEFORE or AFTER that event? The docs do not say.
// RES_MODE pins ONE interpretation for the whole run ("pre" by default). Both hypotheses are scored on every swap
// (dec.fitPre / dec.fitPost / dec.fitNeither) and consecutive events of a pool are chained (dec.chainOk / dec.chainBad), so the
// live evidence shows which is right. Reserve-based fills are labelled unvalidated until validate-tx.mjs has been run on real transactions.
export const IDL_PIN = "pump-public-docs @ main, read 20 Nov 2026 (BuyEvent 40 fields, SellEvent 33, Pool 18)";
export const PUMPSWAP_PROGRAM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const WSOL = "So11111111111111111111111111111111111111112";
export const RES_MODE = process.env.OLDER_RES_MODE === "post" ? "post" : "pre";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function bs58(buf) { let n = BigInt("0x" + (Buffer.from(buf).toString("hex") || "0")), s = ""; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b === 0) s = "1" + s; else break; } return s; }
export function bs58dec(str) { let n = 0n; for (const ch of str) { const i = B58.indexOf(ch); if (i < 0) throw new Error("bad base58"); n = n * 58n + BigInt(i); } let hex = n.toString(16); if (hex.length % 2) hex = "0" + hex; let b = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, "hex"); let z = 0; for (const ch of str) { if (ch === "1") z++; else break; } return Buffer.concat([Buffer.alloc(z), b]); }
export const DISC = { // from the IDL's `events[].discriminator`
  BuyEvent: [103, 244, 82, 31, 44, 245, 119, 119], SellEvent: [62, 47, 55, 10, 165, 3, 220, 42], DepositEvent: [120, 248, 61, 83, 31, 142, 107, 144], WithdrawEvent: [22, 9, 133, 26, 160, 44, 71, 192],
  CreatePoolEvent: [177, 49, 12, 210, 160, 118, 167, 116], InitBoostEvent: [174, 124, 74, 249, 4, 81, 246, 17], BoostBuyAndBurnEvent: [63, 69, 28, 22, 48, 92, 194, 185], SweepPoolFeeEvent: [130, 164, 36, 97, 228, 130, 135, 165] };
const DKEY = new Map(Object.entries(DISC).map(([k, v]) => [Buffer.from(v).toString("hex"), k]));
export const dec = { buy: 0, sell: 0, deposit: 0, withdraw: 0, pool: 0, boost: 0, sweep: 0, short: 0, fitPre: 0, fitPost: 0, fitBoth: 0, fitNeither: 0, chainOk: 0, chainBad: 0, noVirtual: 0, negVirtual: 0, mode: RES_MODE };
class R {
  constructor(b) { this.b = b; this.o = 0; }
  u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; } i64() { const v = this.b.readBigInt64LE(this.o); this.o += 8; return v; }
  i128() { const lo = this.b.readBigUInt64LE(this.o), hi = this.b.readBigInt64LE(this.o + 8); this.o += 16; return (hi << 64n) + lo; }
  u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; } u8() { return this.b[this.o++]; } bool() { return this.b[this.o++] !== 0; }
  pk() { const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; } str() { const n = this.b.readUInt32LE(this.o); this.o += 4; const s = this.b.subarray(this.o, this.o + n).toString("utf8"); this.o += n; return s; }
  left() { return this.b.length - this.o; }
}

export function decodeEvent(b64) {
  let b; try { b = Buffer.from(b64, "base64"); } catch { return null; }
  if (b.length < 16) return null; const name = DKEY.get(b.subarray(0, 8).toString("hex")); if (!name) return null;
  const r = new R(b.subarray(8));
  try {
    if (name === "BuyEvent" || name === "SellEvent") {
      const isBuy = name === "BuyEvent", e = { type: isBuy ? "buy" : "sell", isBuy };
      e.ts = Number(r.i64()); e.baseAmt = r.u64(); r.u64(); r.u64(); r.u64();
      e.poolBase = r.u64(); e.poolQuote = r.u64(); e.quoteAmt = r.u64();
      e.lpBps = Number(r.u64()); e.lpFee = r.u64(); e.protoBps = Number(r.u64()); e.protoFee = r.u64(); e.quoteWithLp = r.u64(); e.userQuote = r.u64();
      e.pool = r.pk(); e.user = r.pk();
      e.creatorBps = null; e.cashbackBps = null; e.buybackBps = null; e.holderBps = null; e.virtualQuote = null; e.baseSupply = null; e.ix = null;
      if (r.left() >= 32 * 5 + 16) { r.pk(); r.pk(); r.pk(); r.pk(); e.coinCreator = r.pk(); e.creatorBps = Number(r.u64()); e.creatorFee = r.u64(); }
      if (isBuy && r.left() >= 1 + 8 * 5) { r.bool(); r.u64(); r.u64(); r.u64(); r.i64(); r.u64(); if (r.left() >= 4) e.ix = r.str(); }
      if (r.left() >= 32) { e.cashbackBps = Number(r.u64()); e.cashback = r.u64(); e.buybackBps = Number(r.u64()); e.buybackFee = r.u64(); }
      if (r.left() >= 16) e.virtualQuote = r.i128();
      if (r.left() >= 9) { e.canBoost = r.bool(); e.baseSupply = r.u64(); }
      if (r.left() >= 16) { e.holderBps = Number(r.u64()); e.holderRewards = r.u64(); }
      if (r.left() >= 8) e.creatorFeeUnclaimed = r.u64();
      dec[e.type]++; return e;
    }
    if (name === "DepositEvent" || name === "WithdrawEvent") {
      const e = { type: name === "DepositEvent" ? "deposit" : "withdraw" };
      e.ts = Number(r.i64()); r.u64(); r.u64(); r.u64(); r.u64(); r.u64(); e.poolBase = r.u64(); e.poolQuote = r.u64(); e.baseAmt = r.u64(); e.quoteAmt = r.u64(); r.u64(); e.pool = r.pk(); e.user = r.pk();
      dec[e.type]++; return e;
    }
    if (name === "CreatePoolEvent") {
      const e = { type: "pool" }; e.ts = Number(r.i64()); e.index = r.u16(); e.creator = r.pk(); e.baseMint = r.pk(); e.quoteMint = r.pk(); e.baseDec = r.u8(); e.quoteDec = r.u8();
      r.u64(); r.u64(); e.poolBase = r.u64(); e.poolQuote = r.u64(); r.u64(); r.u64(); r.u64(); r.u8(); e.pool = r.pk();
      dec.pool++; return e;
    }
    if (name === "InitBoostEvent") { const e = { type: "boost", sub: "init" }; e.ts = Number(r.i64()); e.mint = r.pk(); r.pk(); e.pool = r.pk(); e.virtualQuote = r.i128(); e.realQuoteAfter = r.u64(); dec.boost++; return e; }
    if (name === "BoostBuyAndBurnEvent") { const e = { type: "boost", sub: "burn" }; e.ts = Number(r.i64()); e.mint = r.pk(); r.pk(); e.pool = r.pk(); r.pk(); r.u64(); e.quoteUsed = r.u64(); e.baseBurned = r.u64(); e.virtualQuote = r.i128(); e.realQuoteAfter = r.u64(); e.baseAfter = r.u64(); dec.boost++; return e; }
    if (name === "SweepPoolFeeEvent") { const e = { type: "sweep" }; e.ts = Number(r.i64()); e.pool = r.pk(); r.pk(); r.pk(); r.pk(); r.pk(); e.amount = r.u64(); dec.sweep++; return e; }
  } catch { dec.short++; return null; }
  return null;
}
export const eventsFromLogs = (logs) => { const out = []; for (const l of logs || []) if (l.startsWith("Program data: ")) { const e = decodeEvent(l.slice(14)); if (e) out.push(e); } return out; };

const TOL = 0.003; // relative tolerance of the constant-product check (integer rounding on tiny trades)
/** Reconstructs one pool's state across its events. `p` = per-pool memory { base, quote (effective), vq (virtual, lamports), feeBuy, feeSell, supply }.
 *  Returns { state, sol, changed } or null when the event cannot be turned into a trustworthy state (counted; caller marks the coin lost). */
export function applyEvent(p, e, baseDec = 6) {
  const U = 10 ** baseDec;
  if (e.type === "buy" || e.type === "sell") {
    if (e.virtualQuote == null) dec.noVirtual++; else if (e.virtualQuote < 0n) dec.negVirtual++;
    const vq = e.virtualQuote ?? BigInt(Math.round((p.vq ?? 0))); p.vq = Number(vq);
    const B = Number(e.poolBase), E = Number(e.poolQuote + vq), b = Number(e.baseAmt), q = Number(e.quoteAmt), lp = Number(e.lpFee);
    if (!(B > 0 && E > 0 && b > 0 && q > 0)) return null;
    // which interpretation reproduces the traded amount on the curve?  pre: reported reserves are before the swap; post: after it
    const preQ = e.isBuy ? (E * b) / (B - b) : (E * b) / (B + b), postQ = e.isBuy ? (E * b) / (B + b) : (E * b) / (B - b);
    const okPre = B > b && Math.abs(preQ - q) / q <= TOL, okPost = Math.abs(postQ - q) / q <= TOL;
    if (okPre && okPost) dec.fitBoth++; else if (okPre) dec.fitPre++; else if (okPost) dec.fitPost++; else dec.fitNeither++;
    if (!(RES_MODE === "pre" ? okPre : okPost)) return null;
    // chain evidence: under the pinned mode, this event's implied pre-state must equal the state we derived from the previous event
    const preBase = RES_MODE === "pre" ? B : e.isBuy ? B + b : B - b;
    if (p.base != null) { if (Math.abs(preBase / U - p.base) / p.base < 1e-6) dec.chainOk++; else dec.chainBad++; }
    if (RES_MODE === "pre") { p.base = (e.isBuy ? B - b : B + b) / U; p.quote = (e.isBuy ? E + q + lp : E - q + lp) / 1e9; } // the LP fee stays in the pool as liquidity
    else { p.base = B / U; p.quote = E / 1e9; }
    const uq = Number(e.userQuote);
    if (uq > 0) { const f = e.isBuy ? uq / q - 1 : 1 - uq / q; if (f >= 0 && f < 0.25) { if (e.isBuy) p.feeBuy = f; else p.feeSell = f; } }
    if (e.baseSupply != null && e.baseSupply > 0n) p.supply = Number(e.baseSupply) / U;
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: q / 1e9, changed: true };
  }
  if (e.type === "deposit" || e.type === "withdraw") {
    const s = e.type === "deposit" ? 1 : -1, vq = p.vq ?? 0;
    const B = Number(e.poolBase) + (RES_MODE === "pre" ? s * Number(e.baseAmt) : 0), Q = Number(e.poolQuote) + (RES_MODE === "pre" ? s * Number(e.quoteAmt) : 0) + vq;
    if (!(B > 0 && Q > 0)) return null;
    p.base = B / U; p.quote = Q / 1e9;
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: 0, changed: true };
  }
  if (e.type === "boost") { // effective = real quote reserves + boost reserves; waiting fees are inside virtual with opposite sign, so real_after + virtual is exact up to unswept fees
    p.vq = Number(e.virtualQuote); const Q = Number(e.realQuoteAfter) + p.vq; if (e.baseAfter != null) p.base = Number(e.baseAfter) / U;
    if (!(p.base > 0 && Q > 0)) return null; p.quote = Q / 1e9;
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: 0, changed: true, approx: "boost" };
  }
  if (e.type === "sweep") { if (p.vq != null) p.vq += Number(e.amount); return { state: null, sol: 0, changed: false }; } // vault −amount, virtual +amount: effective reserves unchanged
  return null;
}

// ---- canonical pool check (pump-public-docs FEE_PROGRAM_README): pool.creator == PDA(["pool-authority", base_mint], PUMP_PROGRAM)
import { createHash } from "node:crypto";
const P = 2n ** 255n - 19n, D = ((-121665n * modinv(121666n)) % P + P) % P;
function modpow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; }
function modinv(a) { return modpow(((a % P) + P) % P, P - 2n, P); }
/** is this 32-byte value a valid ed25519 point? (program-derived addresses must NOT be) */
export function onCurve(buf) {
  const yb = Buffer.from(buf); yb[31] &= 0x7f; let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) + BigInt(yb[i]);
  if (y >= P) return false;
  const y2 = (y * y) % P, u = (y2 - 1n + P) % P, v = (D * y2 + 1n) % P, x2 = (u * modinv(v)) % P;
  if (x2 === 0n) return true;
  return modpow(x2, (P - 1n) / 2n, P) === 1n; // Euler's criterion: x² is a quadratic residue
}
export function findProgramAddress(seeds, programId) {
  const pid = bs58dec(programId);
  for (let bump = 255; bump >= 0; bump--) { const h = createHash("sha256").update(Buffer.concat([...seeds, Buffer.from([bump]), pid, Buffer.from("ProgramDerivedAddress")])).digest(); if (!onCurve(h)) return [bs58(h), bump]; }
  throw new Error("no PDA");
}
const pad32 = (b) => (b.length === 32 ? b : Buffer.concat([Buffer.alloc(32 - b.length), b]));
export const pumpPoolAuthority = (mint) => findProgramAddress([Buffer.from("pool-authority"), pad32(bs58dec(mint))], PUMP_PROGRAM)[0];
/** the canonical PumpSwap pool of a pump.fun coin: PDA(["pool", 0u16 LE, pool_authority, base_mint, quote_mint], PUMPSWAP_PROGRAM) */
export function canonicalPool(mint, quote = WSOL) { const auth = pumpPoolAuthority(mint); return findProgramAddress([Buffer.from("pool"), Buffer.from([0, 0]), pad32(bs58dec(auth)), pad32(bs58dec(mint)), pad32(bs58dec(quote))], PUMPSWAP_PROGRAM)[0]; }
export const isCanonical = (mint, poolCreator) => pumpPoolAuthority(mint) === poolCreator;
