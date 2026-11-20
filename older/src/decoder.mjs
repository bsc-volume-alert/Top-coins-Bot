// decoder.mjs — PumpSwap (pump.fun AMM, program pAMMBay…) event decoder for this project.
// Copied from the tracker's src/pumpswap-decoder.js (ps-0.19.9) and extended: it keeps the three fee rates
// (LP, protocol, coin-creator basis points) and derives the pool's reserves AFTER the swap.
// The event's pool_*_token_reserves are checked against the constant-product formula on every swap: if they reproduce the
// traded amount they are PRE-swap reserves and the post-swap state is derived; if they do not, the event is counted in
// `dec.reserveMismatch` and the state is not used for fills (shown on the page). This is verified at runtime, not assumed.
import { createHash } from "node:crypto";
export const PUMPSWAP_PROGRAM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const WSOL = "So11111111111111111111111111111111111111112";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function bs58(buf) { let n = BigInt("0x" + (Buffer.from(buf).toString("hex") || "0")), s = ""; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of buf) { if (b === 0) s = "1" + s; else break; } return s; }
const disc = (name) => createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
const D_BUY = disc("BuyEvent"), D_SELL = disc("SellEvent"), D_POOL = disc("CreatePoolEvent");
export const DISC = { D_BUY, D_SELL, D_POOL };
export const dec = { buys: 0, sells: 0, pools: 0, reserveMismatch: 0, noFees: 0 };
class R { constructor(b) { this.b = b; this.o = 0; } u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; } i64() { const v = this.b.readBigInt64LE(this.o); this.o += 8; return v; } u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; } u8() { return this.b[this.o++]; } pk() { const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; } left() { return this.b.length - this.o; } }

export function decodePumpSwap(b64) {
  let b; try { b = Buffer.from(b64, "base64"); } catch { return null; }
  if (b.length < 8) return null; const d = b.subarray(0, 8);
  try {
    if (d.equals(D_BUY) || d.equals(D_SELL)) {
      const isBuy = d.equals(D_BUY), r = new R(b.subarray(8));
      const ts = Number(r.i64()), baseAmt = r.u64(); r.u64(); r.u64(); r.u64();
      const poolBase = r.u64(), poolQuote = r.u64(), quoteAmt = r.u64();
      const lpBps = r.u64(), lpFee = r.u64(), protoBps = r.u64(); r.u64(); r.u64(); r.u64();
      const pool = r.pk(), user = r.pk();
      let creatorBps = null;
      if (r.left() >= 176) { r.pk(); r.pk(); r.pk(); r.pk(); r.pk(); creatorBps = r.u64(); r.u64(); }
      return { type: isBuy ? "buy" : "sell", isBuy, ts, pool, user, baseAmt, quoteAmt, poolBase, poolQuote, lpBps: Number(lpBps), lpFee, protoBps: Number(protoBps), creatorBps: creatorBps == null ? null : Number(creatorBps) };
    }
    if (d.equals(D_POOL)) {
      const r = new R(b.subarray(8)); const ts = Number(r.i64()); r.u16(); const creator = r.pk(), baseMint = r.pk(), quoteMint = r.pk();
      const baseDec = r.u8(), quoteDec = r.u8(); r.u64(); r.u64(); const poolBase = r.u64(), poolQuote = r.u64(); r.u64(); r.u64(); r.u64(); r.u8(); const pool = r.pk();
      return { type: "pool", ts, creator, baseMint, quoteMint, baseDec, quoteDec, pool, poolBase, poolQuote };
    }
  } catch { return null; }
  return null;
}
export const eventsFromLogs = (logs) => { const out = []; for (const l of logs || []) if (l.startsWith("Program data: ")) { const e = decodePumpSwap(l.slice(14)); if (e) out.push(e); } return out; };

/** a decoded swap → the pool state after it, in whole tokens / SOL, or null if the reserves don't reproduce the trade */
export function postState(e, baseDec = 6) {
  const B = Number(e.poolBase), Q = Number(e.poolQuote), b = Number(e.baseAmt), q = Number(e.quoteAmt), lp = Number(e.lpFee || 0n);
  if (!(B > 0 && Q > 0 && b > 0 && q > 0)) return null;
  const expect = e.isBuy ? (Q * b) / (B - b) : (Q * b) / (B + b); // pre-swap constant product: quote in for a buy, gross quote out for a sell
  if (Math.abs(expect - q) / q > 0.002) { dec.reserveMismatch++; return null; }
  const base = e.isBuy ? B - b : B + b, quote = e.isBuy ? Q + q + lp : Q - q + lp; // the LP fee stays in the pool
  const feeBps = e.creatorBps == null ? null : e.lpBps + e.protoBps + e.creatorBps; if (feeBps == null) dec.noFees++;
  return { base: base / 10 ** baseDec, quote: quote / 1e9, feeBps, sol: q / 1e9 };
}
