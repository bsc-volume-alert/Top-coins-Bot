// v0.18: swap-event decoders for the other Solana DEXes (Raydium CPMM / CLMM / LaunchLab, Meteora DLMM, Orca Whirlpool).
// Layouts come from the official IDLs (raydium-io/raydium-idl, MeteoraAg/dlmm-sdk, orca-so/whirlpools). All five emit Anchor
// events as "Program data:" log lines, so one logsSubscribe per program is enough — no getTransaction credits.
import { createHash } from "node:crypto";
import { bs58 } from "./bs58.js";

export const WSOL = "So11111111111111111111111111111111111111112";
export const PROGRAMS = {
  CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: "raydium-cpmm",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "raydium-clmm",
  LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj: "raydium-launchlab",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "meteora-dlmm",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "orca",
};
const disc = (name) => createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
const D_SWAP = disc("SwapEvent");      // Raydium CPMM + CLMM (same name, different lengths)
const D_TRADE = disc("TradeEvent");    // Raydium LaunchLab
const D_DLMM = disc("Swap");           // Meteora DLMM
const D_TRADED = disc("Traded");       // Orca Whirlpool

class R {
  constructor(b, o = 0) { this.b = b; this.o = o; }
  u8() { return this.b[this.o++]; }
  bool() { return this.b[this.o++] === 1; }
  u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; }
  i32() { const v = this.b.readInt32LE(this.o); this.o += 4; return v; }
  u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; }
  u128() { const lo = this.b.readBigUInt64LE(this.o), hi = this.b.readBigUInt64LE(this.o + 8); this.o += 16; return (hi << 64n) + lo; }
  pk() { const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; }
  left() { return this.b.length - this.o; }
}

/** Decode one "Program data:" payload emitted by `program`. Returns a venue-tagged event or null. */
export function decodeDexEvent(program, b64) {
  const venue = PROGRAMS[program]; if (!venue) return null;
  let b; try { b = Buffer.from(b64, "base64"); } catch { return null; }
  if (b.length < 8) return null;
  const d = b.subarray(0, 8), r = new R(b, 8);
  try {
    if (venue === "raydium-cpmm" && d.equals(D_SWAP)) {
      const pool = r.pk(), inBefore = r.u64(), outBefore = r.u64(), amountIn = r.u64(), amountOut = r.u64(); r.u64(); r.u64(); const baseInput = r.bool();
      let inMint = null, outMint = null; if (r.left() >= 64) { inMint = r.pk(); outMint = r.pk(); }
      return { venue, pool, inBefore, outBefore, amountIn, amountOut, baseInput, inMint, outMint, wallet: null };
    }
    if (venue === "raydium-clmm" && d.equals(D_SWAP)) {
      const pool = r.pk(), wallet = r.pk(); r.pk(); r.pk();
      const amount0 = r.u64(); r.u64(); const amount1 = r.u64(); r.u64(); const zeroForOne = r.bool(); const sqrtPriceX64 = r.u128();
      return { venue, pool, wallet, amount0, amount1, zeroForOne, sqrtPriceX64 };
    }
    if (venue === "raydium-launchlab" && d.equals(D_TRADE)) {
      const pool = r.pk(); r.u64(); const vBase = r.u64(), vQuote = r.u64(); r.u64(); r.u64(); const rBaseAfter = r.u64(), rQuoteAfter = r.u64();
      const amountIn = r.u64(), amountOut = r.u64(); r.u64(); r.u64(); r.u64(); r.u64(); const dir = r.u8();
      return { venue, pool, vBase, vQuote, rBaseAfter, rQuoteAfter, amountIn, amountOut, isBuy: dir === 0, wallet: null };
    }
    if (venue === "meteora-dlmm" && d.equals(D_DLMM)) {
      const pool = r.pk(), wallet = r.pk(); r.i32(); const endBin = r.i32(); const amountIn = r.u64(), amountOut = r.u64(); const swapForY = r.bool();
      return { venue, pool, wallet, endBin, amountIn, amountOut, swapForY };
    }
    if (venue === "orca" && d.equals(D_TRADED)) {
      const pool = r.pk(), aToB = r.bool(); r.u128(); const postSqrt = r.u128(); const amountIn = r.u64(), amountOut = r.u64();
      return { venue, pool, aToB, postSqrt, amountIn, amountOut, wallet: null };
    }
  } catch { return null; }
  return null;
}

/** Walk a transaction's logs with a program stack so each "Program data:" line is attributed to the program that emitted it. */
export function dexEventsFromLogs(logs) {
  const out = [], stack = [];
  for (const l of logs || []) {
    if (l.startsWith("Program data: ")) { const p = stack[stack.length - 1]; if (p && PROGRAMS[p]) { const e = decodeDexEvent(p, l.slice(14)); if (e) out.push(e); } continue; }
    if (!l.startsWith("Program ")) continue;
    if (l.endsWith("]") && l.includes(" invoke [")) { stack.push(l.slice(8, l.indexOf(" invoke ["))); continue; }
    if (l.endsWith(" success") || l.includes(" failed: ") || l.endsWith(" failed")) { stack.pop(); }
  }
  return out;
}

// --- pool account parsers → {mint0, mint1, dec0, dec1, extra} (null when the layout doesn't match) ---
const pk = (b, o) => bs58(b.subarray(o, o + 32));
export function parsePoolAccount(venue, dataB64) {
  const b = Buffer.from(dataB64, "base64");
  try {
    if (venue === "raydium-cpmm") { if (b.length < 333) return null; return { mint0: pk(b, 168), mint1: pk(b, 200), dec0: b[331], dec1: b[332] }; }
    if (venue === "raydium-clmm") { if (b.length < 235) return null; return { mint0: pk(b, 73), mint1: pk(b, 105), dec0: b[233], dec1: b[234] }; }
    if (venue === "raydium-launchlab") { if (b.length < 269) return null; return { mint0: pk(b, 205), mint1: pk(b, 237), dec0: b[18], dec1: b[19], supply: Number(b.readBigUInt64LE(21)) }; } // base, quote
    if (venue === "meteora-dlmm") { if (b.length < 152) return null; return { mint0: pk(b, 88), mint1: pk(b, 120), binStep: b.readUInt16LE(80) }; } // x, y — decimals not stored
    if (venue === "orca") { if (b.length < 213) return null; return { mint0: pk(b, 101), mint1: pk(b, 181) }; } // a, b — decimals not stored
  } catch { return null; }
  return null;
}
