// PumpSwap (pump.fun's AMM, where coins go after the bonding curve): pool lookup / decoding, quotes, buy_exact_quote_in and sell.
// Account orders from the published IDL (pump_amm.json, Oct 2026). Quote side is WSOL: SOL is wrapped for the instruction and unwrapped after.
import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import { PUMP_AMM, FEE_PROGRAM, SYSTEM, TOKEN, ATA_PROGRAM, WSOL, pda, ata, u64, u16, readU64, readPk, ixCreateAtaIdempotent, ixCloseAccount, ixSyncNative, ixTransfer } from "./solana.mjs";
import { poolAuthorityOf } from "./pump.mjs";

const DISC = { buyExactQuoteIn: [198, 46, 21, 82, 180, 217, 232, 112], sell: [51, 230, 133, 164, 1, 127, 131, 173], buyExactQuoteInV2: [194, 171, 28, 70, 104, 77, 91, 47], sellV2: [93, 246, 130, 60, 231, 233, 64, 178] };
const ZERO = new PublicKey("11111111111111111111111111111111");
export const POOL_DISC = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]);
export const GLOBAL_CONFIG = pda(["global_config"], PUMP_AMM);
export const AMM_EVENT_AUTHORITY = pda(["__event_authority"], PUMP_AMM);
export const AMM_GLOBAL_VOL = pda(["global_volume_accumulator"], PUMP_AMM);
export const AMM_FEE_CONFIG = pda(["fee_config", PUMP_AMM.toBuffer()], FEE_PROGRAM);
export const ammUserVolOf = (user) => pda(["user_volume_accumulator", user], PUMP_AMM);
export const creatorVaultAuthorityOf = (coinCreator) => pda(["creator_vault", coinCreator], PUMP_AMM);
/** The pool pump.fun creates at migration: index 0, creator = the pump program's pool authority for the mint, quote WSOL. */
export const migratedPoolOf = (mint) => pda(["pool", u16(0), poolAuthorityOf(mint), mint, WSOL], PUMP_AMM);

export function decodePool(data) {
  if (!data || data.length < 243 || !data.subarray(0, 8).equals(POOL_DISC)) return null;
  const p = { index: data.readUInt16LE(9), creator: readPk(data, 11), baseMint: readPk(data, 43), quoteMint: readPk(data, 75), lpMint: readPk(data, 107), baseAcc: readPk(data, 139), quoteAcc: readPk(data, 171),
    coinCreator: readPk(data, 211), virtualQuote: 0n, creatorFeeBps: null };
  if (data.length >= 261) { try { p.virtualQuote = (data.readBigInt64LE(253) << 64n) | data.readBigUInt64LE(245); } catch { p.virtualQuote = 0n; } } // i128 LE: low u64 then signed high
  if (data.length >= 269) p.creatorFeeBps = Number(readU64(data, 261));
  return p;
}
export function decodeGlobalConfig(data) {
  if (!data || data.length < 321) return null;
  const g = { lpFeeBps: Number(readU64(data, 40)), protocolFeeBps: Number(readU64(data, 48)), protocolFeeRecipients: [], coinCreatorFeeBps: Number(readU64(data, 313)), buybackFeeRecipients: [] };
  for (let i = 0; i < 8; i++) g.protocolFeeRecipients.push(readPk(data, 57 + 32 * i));
  for (let i = 0; i < 8 && data.length >= 643 + 32 * (i + 1); i++) g.buybackFeeRecipients.push(readPk(data, 643 + 32 * i)); // after admin_set_coin_creator_authority, whitelist_pda, reserved_fee_recipient, mayhem flag, 7 reserved recipients, cashback flag
  return g;
}
const ceilDiv = (a, b) => (a + b - 1n) / b;
const totalBps = (pool, cfg) => BigInt((cfg?.lpFeeBps ?? 20) + (cfg?.protocolFeeBps ?? 5) + (pool.creatorFeeBps ?? cfg?.coinCreatorFeeBps ?? 95));
/** base out for quote in (lamports), fees taken from the quote going in. */
export function quoteBuy(pool, cfg, baseRes, quoteRes, quoteIn) {
  const fee = totalBps(pool, cfg), q = BigInt(quoteIn), net = q - ceilDiv(q * fee, 10000n), qr = BigInt(quoteRes) + (pool.virtualQuote > 0n ? pool.virtualQuote : 0n);
  return { base: net > 0n ? (BigInt(baseRes) * net) / (qr + net) : 0n, feeBps: Number(fee) };
}
/** quote out (lamports, after fees) for base in. */
export function quoteSell(pool, cfg, baseRes, quoteRes, baseIn) {
  const fee = totalBps(pool, cfg), b = BigInt(baseIn), qr = BigInt(quoteRes) + (pool.virtualQuote > 0n ? pool.virtualQuote : 0n);
  const gross = (qr * b) / (BigInt(baseRes) + b); return { sol: gross - ceilDiv(gross * fee, 10000n), gross };
}
const key = (pubkey, w = false, s = false) => ({ pubkey, isSigner: s, isWritable: w });
function common(user, poolPk, pool, cfg, baseTokenProgram) {
  const feeRecipient = cfg.protocolFeeRecipients[0], authority = creatorVaultAuthorityOf(pool.coinCreator);
  return [key(poolPk, true), key(user, true, true), key(GLOBAL_CONFIG), key(pool.baseMint), key(pool.quoteMint), key(ata(user, pool.baseMint, baseTokenProgram), true), key(ata(user, pool.quoteMint, TOKEN), true),
    key(pool.baseAcc, true), key(pool.quoteAcc, true), key(feeRecipient), key(ata(feeRecipient, pool.quoteMint, TOKEN), true), key(baseTokenProgram), key(TOKEN), key(SYSTEM), key(ATA_PROGRAM),
    key(AMM_EVENT_AUTHORITY), key(PUMP_AMM), key(ata(authority, pool.quoteMint, TOKEN), true), key(authority)];
}
/** Buy with exactly `spendLamports` of SOL (wrapped for the call), receive ≥ minBase. */
export function ixBuy({ user, poolPk, pool, cfg, baseTokenProgram = TOKEN, spendLamports, minBase }) {
  const wsolAta = ata(user, WSOL, TOKEN);
  const keys = [...common(user, poolPk, pool, cfg, baseTokenProgram), key(AMM_GLOBAL_VOL), key(ammUserVolOf(user), true), key(AMM_FEE_CONFIG), key(FEE_PROGRAM)];
  const data = Buffer.concat([Buffer.from(DISC.buyExactQuoteIn), u64(spendLamports), u64(minBase), Buffer.from([0])]);
  return [ixCreateAtaIdempotent(user, user, pool.baseMint, baseTokenProgram), ixCreateAtaIdempotent(user, user, WSOL, TOKEN), ixTransfer(user, wsolAta, spendLamports), ixSyncNative(wsolAta),
    new TransactionInstruction({ programId: PUMP_AMM, keys, data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
}
// v2 instructions (Oct 2026): the classic ones now want a pool_v2 remaining account the IDL does not describe (error 6062 InvalidPoolV2 in shadow);
// the v2 pair has a shorter list — no protocol-fee or creator-vault accounts, a buyback recipient instead — and is what we try first.
const buybackOf = (cfg) => (cfg?.buybackFeeRecipients || []).find((k) => !k.equals(ZERO)) || cfg.protocolFeeRecipients[0];
function commonV2(user, poolPk, pool, cfg, baseTokenProgram) {
  return [key(poolPk, true), key(user, true, true), key(GLOBAL_CONFIG), key(pool.baseMint), key(pool.quoteMint), key(ata(user, pool.baseMint, baseTokenProgram), true), key(ata(user, pool.quoteMint, TOKEN), true),
    key(pool.baseAcc, true), key(pool.quoteAcc, true), key(baseTokenProgram), key(TOKEN), key(SYSTEM), key(ammUserVolOf(user), true), key(AMM_FEE_CONFIG), key(buybackOf(cfg), true), key(AMM_EVENT_AUTHORITY), key(PUMP_AMM)];
}
export function ixBuyV2({ user, poolPk, pool, cfg, baseTokenProgram = TOKEN, spendLamports, minBase }) {
  const wsolAta = ata(user, WSOL, TOKEN);
  const data = Buffer.concat([Buffer.from(DISC.buyExactQuoteInV2), u64(spendLamports), u64(minBase)]);
  return [ixCreateAtaIdempotent(user, user, pool.baseMint, baseTokenProgram), ixCreateAtaIdempotent(user, user, WSOL, TOKEN), ixTransfer(user, wsolAta, spendLamports), ixSyncNative(wsolAta),
    new TransactionInstruction({ programId: PUMP_AMM, keys: commonV2(user, poolPk, pool, cfg, baseTokenProgram), data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
}
export function ixSellV2({ user, poolPk, pool, cfg, baseTokenProgram = TOKEN, amount, minSol, close = true }) {
  const wsolAta = ata(user, WSOL, TOKEN), baseAta = ata(user, pool.baseMint, baseTokenProgram);
  const data = Buffer.concat([Buffer.from(DISC.sellV2), u64(amount), u64(minSol)]);
  const out = [ixCreateAtaIdempotent(user, user, WSOL, TOKEN), new TransactionInstruction({ programId: PUMP_AMM, keys: commonV2(user, poolPk, pool, cfg, baseTokenProgram), data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
  if (close) out.push(ixCloseAccount(baseAta, user, user, baseTokenProgram));
  return out;
}
/** Sell `amount` base for ≥ minSol lamports; unwrap and close both token accounts. */
export function ixSell({ user, poolPk, pool, cfg, baseTokenProgram = TOKEN, amount, minSol, close = true }) {
  const wsolAta = ata(user, WSOL, TOKEN), baseAta = ata(user, pool.baseMint, baseTokenProgram);
  const keys = [...common(user, poolPk, pool, cfg, baseTokenProgram), key(AMM_FEE_CONFIG), key(FEE_PROGRAM)];
  const data = Buffer.concat([Buffer.from(DISC.sell), u64(amount), u64(minSol)]);
  const out = [ixCreateAtaIdempotent(user, user, WSOL, TOKEN), new TransactionInstruction({ programId: PUMP_AMM, keys, data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
  if (close) out.push(ixCloseAccount(baseAta, user, user, baseTokenProgram));
  return out;
}
