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
export const dec = { buy: 0, sell: 0, deposit: 0, withdraw: 0, pool: 0, boost: 0, sweep: 0, short: 0, fitPre: 0, fitPost: 0, fitBoth: 0, fitNeither: 0, neitherBy: {}, feeOdd: 0, feeOddBy: {}, chainOk: 0, chainBad: 0, chainBadQuote: 0, chainBadAfterBoost: 0, chainBadQuoteAfterBoost: 0, chainQuoteMinor: 0, chainQuoteMaxRel: 0, foreign: 0, noVirtual: 0, negVirtual: 0, unknownVirtual: 0, feeNotMeasured: 0, feeNotMeasuredBy: {}, mode: RES_MODE };
// A truncated event must FAIL to decode (pk() throws) rather than yield a short, invalid address — the live run showed
// 'Invalid param: WrongSize' on pool look-ups from exactly that.
class R {
  constructor(b) { this.b = b; this.o = 0; }
  u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; } i64() { const v = this.b.readBigInt64LE(this.o); this.o += 8; return v; }
  i128() { const lo = this.b.readBigUInt64LE(this.o), hi = this.b.readBigInt64LE(this.o + 8); this.o += 16; return (hi << 64n) + lo; }
  u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; } u8() { return this.b[this.o++]; } bool() { return this.b[this.o++] !== 0; }
  pk() { if (this.o + 32 > this.b.length) throw new RangeError("event too short for a public key"); const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; } str() { const n = this.b.readUInt32LE(this.o); this.o += 4; const s = this.b.subarray(this.o, this.o + n).toString("utf8"); this.o += n; return s; }
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
/** Events from a transaction's logs. PROVENANCE: a "Program data:" line is accepted only while the PumpSwap program itself is the
 *  program executing (tracked through the "Program … invoke [n]" / "… success|failed" lines), so a foreign program that prints
 *  look-alike bytes is ignored (counted in dec.foreign). */
export function eventsFromLogs(logs, program = PUMPSWAP_PROGRAM) {
  const out = [], stack = [];
  for (const l of logs || []) {
    if (l.startsWith("Program data: ")) { if (stack.length && stack[stack.length - 1] !== program) { if (decodeEventPeek(l.slice(14))) dec.foreign++; continue; } const e = decodeEvent(l.slice(14)); if (e) out.push(e); continue; }
    const m = /^Program (\w+) invoke \[\d+\]/.exec(l); if (m) { stack.push(m[1]); continue; }
    if (/^Program \w+ (success|failed)/.test(l)) stack.pop();
  }
  return out;
}
const decodeEventPeek = (b64) => { try { const b = Buffer.from(b64, "base64"); return b.length >= 8 && DKEY.has(b.subarray(0, 8).toString("hex")); } catch { return false; } };

import { QUOTE_CHAIN_TOL, FEE_MAX } from "./spec.mjs";
// instructions whose user-amount fields were validated against real transactions (tx-validation.json, 20 Nov 2026). The fee of any
// other instruction (multi_hop_swap: the user's amounts are in another token) is NOT measured from its event.
const FEE_IX = new Set(["buy", "buy_v2", "buy_exact_quote_in", "buy_exact_quote_in_v2"]);
const TOL = 0.003; // relative tolerance of the constant-product check (integer rounding on tiny trades)
/** Reconstructs one pool's state across its events. `p` = per-pool memory { base, quote (effective), vq (virtual, lamports), feeBuy, feeSell, supply }.
 *  Returns { state, sol, changed } or null when the event cannot be turned into a trustworthy state (counted; caller marks the coin lost). */
export function applyEvent(p, e, baseDec = 6) {
  const U = 10 ** baseDec;
  if (e.type === "buy" || e.type === "sell") {
    if (e.virtualQuote == null) dec.noVirtual++; else if (e.virtualQuote < 0n) dec.negVirtual++;
    // UNKNOWN virtual reserves are never replaced by zero: an event without the field, on a pool whose virtual reserves we have
    // not yet seen, cannot be turned into a trustworthy state
    if (e.virtualQuote == null && p.vq == null) { dec.unknownVirtual++; return null; }
    const vq = e.virtualQuote ?? BigInt(Math.round(p.vq)); p.vq = Number(vq);
    // Which field is the amount that moved on the curve? VALIDATED on real transactions (20 Nov 2026, tx-validation.json):
    //   buy (exact base out) and sell : quote_amount_in/out is the curve amount; user_quote_amount_* is what the user paid/received.
    //   buy_exact_quote_in[_v2]      : the two are the other way round — quote_amount_in is the user's total spend (fees inside),
    //                                  user_quote_amount_in is the part that reached the curve.
    const exactIn = e.isBuy && typeof e.ix === "string" && e.ix.startsWith("buy_exact_quote_in");
    const B = Number(e.poolBase), E = Number(e.poolQuote + vq), b = Number(e.baseAmt), lp = Number(e.lpFee);
    const q = Number(exactIn ? e.userQuote : e.quoteAmt), paid = Number(exactIn ? e.quoteAmt : e.userQuote);
    if (!(B > 0 && E > 0 && b > 0 && q > 0)) return null;
    // which interpretation reproduces the traded amount on the curve?  pre: reported reserves are before the swap; post: after it
    const preQ = e.isBuy ? (E * b) / (B - b) : (E * b) / (B + b), postQ = e.isBuy ? (E * b) / (B + b) : (E * b) / (B - b);
    const tol = Math.max(TOL, 3 / q); // integer rounding matters on very small trades
    const okPre = B > b && Math.abs(preQ - q) / q <= tol, okPost = Math.abs(postQ - q) / q <= tol;
    if (okPre && okPost) dec.fitBoth++; else if (okPre) dec.fitPre++; else if (okPost) dec.fitPost++; else { dec.fitNeither++; const k = (e.ix || "no-ix") + "|" + e.type; dec.neitherBy[k] = (dec.neitherBy[k] || 0) + 1; }
    if (!(RES_MODE === "pre" ? okPre : okPost)) return null;
    // chain evidence: under the pinned mode, this event's implied pre-state must equal the state we derived from the previous event
    const preBase = RES_MODE === "pre" ? B : e.isBuy ? B + b : B - b;
    // A break in the chain (this event does not start where the previous one ended) means something changed the pool that we
    // did not see or mis-derived. The NEW state is still a real observation, but the interval before it is not known: the
    // result is flagged `discontinuity` and the feed restarts the coin's history there, so no order or crossing uses that interval.
    // BOTH sides are enforced. Base: exact (1e-6). Quote: a mismatch above QUOTE_CHAIN_TOL (0.1% of effective reserves, i.e. a
    // price error above 0.1%) is a discontinuity; a smaller one (fee/rounding dust) is counted (chainQuoteMinor, largest seen kept).
    let discontinuity = false;
    if (p.base != null) {
      if (Math.abs(preBase / U - p.base) / p.base < 1e-6) dec.chainOk++; else { dec.chainBad++; discontinuity = true; if (p.afterBoost) dec.chainBadAfterBoost++; }
      const preQuote = RES_MODE === "pre" ? E : e.isBuy ? E - q - lp : E + q - lp;
      if (p.quote != null) { const d = Math.abs(preQuote / 1e9 - p.quote), rel = p.quote > 0 ? d / p.quote : Infinity;
        if (rel > QUOTE_CHAIN_TOL) { dec.chainBadQuote++; discontinuity = true; if (p.afterBoost) dec.chainBadQuoteAfterBoost++; }
        else if (d > Math.max(1e-6 * p.quote, 2e-8)) { dec.chainQuoteMinor++; if (rel > dec.chainQuoteMaxRel) dec.chainQuoteMaxRel = +rel.toExponential(2); } }
    }
    p.afterBoost = false;
    if (RES_MODE === "pre") { p.base = (e.isBuy ? B - b : B + b) / U; p.quote = (e.isBuy ? E + q + lp : E - q + lp) / 1e9; } // the LP fee stays in the pool as liquidity
    else { p.base = B / U; p.quote = E / 1e9; }
    // FEE MEASUREMENT. A rate is installed only when it is a real measurement: from an instruction whose amounts were validated
    // (FEE_IX; sell events carry no instruction name) AND inside 0–10%. Anything else — a multi_hop_swap, a negative rate, a rate
    // above 10% — is a FAILED measurement: counted, never installed, never clamped to a tidy number. The pool keeps the last
    // rate it really showed on that side (or none: fills then say fee_src 'other-side' / 'assumed').
    if (paid > 0) { const f = e.isBuy ? paid / q - 1 : 1 - paid / q, okIx = !e.isBuy || e.ix == null || FEE_IX.has(e.ix) /* an old-format buy event carries no instruction name */, odd = !(f >= 0 && f <= FEE_MAX);
      if (odd) { dec.feeOdd++; const k = (e.ix || "no-ix") + "|" + e.type + (f < 0 ? "|negative" : "|over10%"); dec.feeOddBy[k] = (dec.feeOddBy[k] || 0) + 1; }
      if (okIx && !odd) { if (e.isBuy) p.feeBuy = f; else p.feeSell = f; }
      else { dec.feeNotMeasured++; const k = (e.ix || "no-ix") + "|" + e.type; dec.feeNotMeasuredBy[k] = (dec.feeNotMeasuredBy[k] || 0) + 1; } }
    if (e.baseSupply != null && e.baseSupply > 0n) p.supply = Number(e.baseSupply) / U;
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: q / 1e9, changed: true, discontinuity };
  }
  if (e.type === "deposit" || e.type === "withdraw") {
    if (p.vq == null) { dec.unknownVirtual++; return null; } // deposit/withdraw events do not carry the virtual reserves: unknown is not zero
    const s = e.type === "deposit" ? 1 : -1, vq = p.vq;
    const B = Number(e.poolBase) + (RES_MODE === "pre" ? s * Number(e.baseAmt) : 0), Q = Number(e.poolQuote) + (RES_MODE === "pre" ? s * Number(e.quoteAmt) : 0) + vq;
    if (!(B > 0 && Q > 0)) return null;
    p.base = B / U; p.quote = Q / 1e9;
    // a deposit/withdrawal reports the real vaults but adds the virtual reserves WE hold: after a boost those are unconfirmed, so the
    // quarantine continues — only the next swap (which carries its own virtual reserves and is chain-checked) releases it
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: 0, changed: true, ...(p.afterBoost ? { approx: "boost" } : {}) };
  }
  if (e.type === "boost") { // effective = real quote reserves + boost reserves; waiting fees are inside virtual with opposite sign, so real_after + virtual is exact up to unswept fees
    p.vq = Number(e.virtualQuote); const Q = Number(e.realQuoteAfter) + p.vq; if (e.baseAfter != null) p.base = Number(e.baseAfter) / U;
    if (e.baseBurned != null && p.supply != null) p.supply = Math.max(0, p.supply - Number(e.baseBurned) / U); // a buy-and-burn reduces supply now, not at the next swap
    p.afterBoost = true; // the next swap's chain check tells us whether this boost state was exact
    if (!(p.base > 0 && Q > 0)) return null; p.quote = Q / 1e9;
    return { state: { base: p.base, quote: p.quote, feeBuy: p.feeBuy ?? null, feeSell: p.feeSell ?? null, supply: p.supply ?? null }, sol: 0, changed: true, approx: "boost" };
  }
  if (e.type === "sweep") { if (p.vq != null) p.vq += Number(e.amount); return { state: null, sol: 0, changed: false }; } // vault −amount, virtual +amount: effective reserves unchanged
  return null;
}

/** All of ONE transaction's events on ONE pool, applied in order → the single COMMITTED state after the last of them.
 *  A transaction is atomic: nobody can trade against the pool between two of its events, so intermediate states are never
 *  observations. Returns { last (applyEvent result or null), sol, buys, sells, user (first buyer), buyers: [[wallet, SOL bought]…]
 *  (EVERY buyer in the transaction, each with its own volume), blockTs, lost, breaks: [events] }. */
export function reduceTx(p, evs, onReset = () => {}) {
  const out = { last: null, sol: 0, buys: 0, sells: 0, user: null, buyers: [], blockTs: null, lost: false, rejected: 0, breaks: [] };
  for (const e of evs) {
    const r = applyEvent(p, e);
    if (!r) { if (e.type !== "sweep") { out.rejected++; out.lost = true; for (const k of Object.keys(p)) delete p[k]; onReset(); out.last = null; out.buyers = []; } continue; }
    if (r.discontinuity) { out.lost = true; out.breaks.push(e); }
    if (!r.changed) continue;
    out.last = r; out.sol += r.sol; if (e.type === "buy") { out.buys++; out.user = out.user || e.user; if (e.user) { const b = out.buyers.find((x) => x[0] === e.user); if (b) b[1] += r.sol; else out.buyers.push([e.user, r.sol]); } } else if (e.type === "sell") out.sells++; out.blockTs = e.ts || out.blockTs;
  }
  return out;
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
