import { createHash } from "node:crypto";
import { bs58 } from "./bs58.js";
const disc = (name) => createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
const D_CREATE = disc("CreateEvent"), D_TRADE = disc("TradeEvent"), D_CLAIM = disc("CollectCreatorFeeEvent"); // v0.18.4

class R {
  constructor(b) { this.b = b; this.o = 0; }
  u64() { const v = this.b.readBigUInt64LE(this.o); this.o += 8; return v; }
  i64() { const v = this.b.readBigInt64LE(this.o); this.o += 8; return v; }
  u8() { return this.b[this.o++]; }
  pk() { const v = bs58(this.b.subarray(this.o, this.o + 32)); this.o += 32; return v; }
  str() { const l = this.b.readUInt32LE(this.o); this.o += 4; const v = this.b.toString("utf8", this.o, this.o + l); this.o += l; return v; }
  left() { return this.b.length - this.o; }
}

/** Decode one "Program data: <b64>" payload. Returns {type:'create'|'trade', ...} or null. */
export function decodeEvent(b64) {
  let b; try { b = Buffer.from(b64, "base64"); } catch { return null; }
  if (b.length < 8) return null;
  const d = b.subarray(0, 8);
  try {
    if (d.equals(D_CREATE)) {
      const r = new R(b.subarray(8));
      const name = r.str(), symbol = r.str(), uri = r.str();
      const mint = r.pk(), bondingCurve = r.pk(), user = r.pk();
      let creator = user, ts = 0n, vtok = 0n, vsol = 0n, supply = 0n;
      if (r.left() >= 32) creator = r.pk();
      if (r.left() >= 8) ts = r.i64();
      if (r.left() >= 8) vtok = r.u64();
      if (r.left() >= 8) vsol = r.u64();
      if (r.left() >= 8) r.u64(); // real_token_reserves
      if (r.left() >= 8) supply = r.u64();
      return { type: "create", name, symbol, uri, mint, bondingCurve, user, creator, ts: Number(ts), vtok, vsol, supply };
    }
    if (d.equals(D_TRADE)) {
      const r = new R(b.subarray(8));
      const mint = r.pk(), sol = r.u64(), tokens = r.u64(), isBuy = r.u8() === 1, user = r.pk(), ts = r.i64();
      const vsol = r.u64(), vtok = r.u64();
      let creator = null, creatorFee = 0n; // v0.18.4: newer TradeEvent carries real reserves, fee recipient/bps/fee, creator, creator fee bps/fee
      if (r.left() >= 112) { r.u64(); r.u64(); r.pk(); r.u64(); r.u64(); creator = r.pk(); r.u64(); const cf = r.u64(); if (cf <= sol) creatorFee = cf; }
      return { type: "trade", mint, sol, tokens, isBuy, user, ts: Number(ts), vsol, vtok, creator, creatorFee };
    }
    if (d.equals(D_CLAIM)) { // CollectCreatorFeeEvent { timestamp, creator, creator_fee }
      const r = new R(b.subarray(8)); const ts = Number(r.i64()), creator = r.pk(), sol = Number(r.u64()) / 1e9;
      const now = Date.now() / 1000; if (Math.abs(ts - now) > 86400 || !(sol >= 0) || sol > 10000) return null;
      return { type: "claim", ts, creator, sol };
    }
  } catch { return null; }
  return null;
}

/** Extract all decodable events from a logs array. */
export function eventsFromLogs(logs) {
  const out = [];
  for (const l of logs || []) {
    if (!l.startsWith("Program data: ")) continue;
    const e = decodeEvent(l.slice(14));
    if (e) out.push(e);
  }
  return out;
}

export const lamports = (x) => Number(x) / 1e9;
export const rawTok = (x) => Number(x) / 1e6;
/** price in SOL per token from virtual reserves */
export const priceSol = (vsol, vtok) => (vtok === 0n ? 0 : (Number(vsol) / 1e9) / (Number(vtok) / 1e6));
