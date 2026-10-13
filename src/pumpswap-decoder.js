import { createHash } from "node:crypto";
import { bs58 } from "./bs58.js";
export const PUMPSWAP_PROGRAM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const WSOL = "So11111111111111111111111111111111111111112";
const disc = (name) => createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
const D_BUY = disc("BuyEvent"), D_SELL = disc("SellEvent"), D_POOL = disc("CreatePoolEvent");
class R {
  constructor(b) { this.b = b; this.o = 0; }
  u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; }
  i64() { const v = this.b.readBigInt64LE(this.o); this.o += 8; return v; }
  u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; }
  u8() { return this.b[this.o++]; }
  pk() { const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; }
  left() { return this.b.length - this.o; }
}
/** Decode a PumpSwap "Program data:" payload → {type:'buy'|'sell'|'pool', ...} or null */
export function decodePumpSwap(b64) {
  let b; try { b = Buffer.from(b64, "base64"); } catch { return null; }
  if (b.length < 8) return null;
  const d = b.subarray(0, 8);
  try {
    if (d.equals(D_BUY) || d.equals(D_SELL)) {
      const isBuy = d.equals(D_BUY);
      const r = new R(b.subarray(8));
      const ts = r.i64();
      const baseAmt = r.u64();           // base_amount_out (buy) / base_amount_in (sell)
      r.u64();                           // max_quote_amount_in / min_quote_amount_out
      r.u64(); r.u64();                  // user base/quote reserves
      const poolBase = r.u64(), poolQuote = r.u64();
      const quoteAmt = r.u64();          // quote_amount_in / quote_amount_out (before fees)
      r.u64(); r.u64(); r.u64(); r.u64(); // lp fee bps, lp fee, protocol fee bps, protocol fee
      r.u64();                           // quote_amount_in_with_lp_fee / quote_amount_out_without_lp_fee
      const userQuote = r.u64();         // user_quote_amount_in / user_quote_amount_out
      const pool = r.pk(), user = r.pk();
      return { type: isBuy ? "buy" : "sell", isBuy, ts: Number(ts), pool, user, baseAmt, quoteAmt, userQuote, poolBase, poolQuote };
    }
    if (d.equals(D_POOL)) {
      const r = new R(b.subarray(8));
      const ts = r.i64(); r.u16(); const creator = r.pk(); const baseMint = r.pk(), quoteMint = r.pk();
      const baseDec = r.u8(), quoteDec = r.u8();
      r.u64(); r.u64(); const poolBase = r.u64(), poolQuote = r.u64(); r.u64(); r.u64(); r.u64(); r.u8();
      const pool = r.pk();
      return { type: "pool", ts: Number(ts), creator, baseMint, quoteMint, baseDec, quoteDec, pool, poolBase, poolQuote };
    }
  } catch { return null; }
  return null;
}
export function pumpSwapEventsFromLogs(logs) {
  const out = [];
  for (const l of logs || []) { if (l.startsWith("Program data: ")) { const e = decodePumpSwap(l.slice(14)); if (e) out.push(e); } }
  return out;
}
/** Parse a PumpSwap Pool account → {baseMint, quoteMint} (base_mint at offset 8+1+2+32) */
export function parsePoolAccount(dataB64) {
  const b = Buffer.from(dataB64, "base64");
  if (b.length < 8 + 1 + 2 + 32 * 3) return null;
  return { baseMint: bs58(b.subarray(43, 75)), quoteMint: bs58(b.subarray(75, 107)) };
}
