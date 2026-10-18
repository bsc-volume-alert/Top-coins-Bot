// pump.fun bonding curve: account decoding, the official quote formula, and the buy / sell instructions (built locally, no SDK).
// Layouts and account orders come from the published IDL (pump-fun/pump-public-docs, Oct 2026). Classic instructions
// (buy_exact_sol_in / sell) are used for SOL-quoted coins; the v3 pair (quote token in a WSOL account) is the fallback that shadow
// mode tries when the classic one is refused — which one each coin needs is recorded, so we learn the mix before going live.
import { TransactionInstruction } from "@solana/web3.js";
import { PK, PUMP, FEE_PROGRAM, SYSTEM, TOKEN, TOKEN_2022, WSOL, pda, ata, u64, readU64, readPk, ixCreateAtaIdempotent, ixCloseAccount, ixSyncNative, ixTransfer } from "./solana.mjs";

const DISC = { buyExactSolIn: [56, 252, 116, 8, 158, 223, 205, 95], sell: [51, 230, 133, 164, 1, 127, 131, 173], buyExactQuoteInV3: [225, 247, 80, 30, 213, 179, 132, 136], sellV3: [28, 146, 222, 119, 38, 196, 105, 213] };
export const CURVE_DISC = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
export const GLOBAL = pda(["global"], PUMP);
export const EVENT_AUTHORITY = pda(["__event_authority"], PUMP);
export const GLOBAL_VOL = pda(["global_volume_accumulator"], PUMP);
export const FEE_CONFIG = pda(["fee_config", PUMP.toBuffer()], FEE_PROGRAM);
export const curveOf = (mint) => pda(["bonding-curve", mint], PUMP);
export const creatorVaultOf = (creator) => pda(["creator-vault", creator], PUMP);
export const userVolOf = (user) => pda(["user_volume_accumulator", user], PUMP);
export const poolAuthorityOf = (mint) => pda(["pool-authority", mint], PUMP); // creator of the PumpSwap pool after migration

const ZERO = PK("11111111111111111111111111111111");
/** BondingCurve account → plain object. Older (unextended) accounts stop after is_cashback_coin; fields past the end come back null. */
export function decodeCurve(data) {
  if (!data || data.length < 49 || !data.subarray(0, 8).equals(CURVE_DISC)) return null;
  const has = (end) => data.length >= end;
  const c = { vTok: readU64(data, 8), vSol: readU64(data, 16), rTok: readU64(data, 24), rSol: readU64(data, 32), supply: readU64(data, 40), complete: data[48] === 1,
    creator: has(81) ? readPk(data, 49) : ZERO, mayhem: has(82) ? data[81] === 1 : false, cashback: has(83) ? data[82] === 1 : false,
    quoteMint: has(115) ? readPk(data, 83) : WSOL, creatorFeeBps: has(123) ? Number(readU64(data, 115)) : null, isHolderReward: has(125) ? data[124] === 1 : false, len: data.length };
  c.solQuoted = c.quoteMint.equals(WSOL) || c.quoteMint.equals(ZERO);
  return c;
}
/** Global account: the fields we need. */
export function decodeGlobal(data) {
  if (!data || data.length < 170) return null;
  const g = { feeRecipient: readPk(data, 41), feeBps: Number(readU64(data, 105)), creatorFeeBps: Number(readU64(data, 154)), feeRecipients: [], buybackFeeRecipients: [] };
  for (let i = 0; i < 7 && data.length >= 162 + 32 * (i + 1); i++) g.feeRecipients.push(readPk(data, 162 + 32 * i));
  for (let i = 0; i < 8 && data.length >= 741 + 32 * (i + 1); i++) g.buybackFeeRecipients.push(readPk(data, 741 + 32 * i));
  return g;
}
const ceilDiv = (a, b) => (a + b - 1n) / b;
/** Tokens out for spendable_sol_in lamports — the formula from the IDL docs. Returns { tokens, netSol, feeLamports }. */
export function quoteBuy(curve, global, spendLamports) {
  const protocol = BigInt(global?.feeBps ?? 100), creator = BigInt(curve.creatorFeeBps ?? (curve.creator.equals(ZERO) ? 0 : (global?.creatorFeeBps ?? 0)));
  const total = protocol + creator, spend = BigInt(spendLamports);
  let net = (spend * 10000n) / (10000n + total);
  let fees = ceilDiv(net * protocol, 10000n) + ceilDiv(net * creator, 10000n);
  if (net + fees > spend) net -= net + fees - spend;
  const tokens = net > 1n ? ((net - 1n) * curve.vTok) / (curve.vSol + net - 1n) : 0n;
  return { tokens, netSol: net, feeLamports: spend - net, feeBps: Number(total), priceLamportsPerToken: Number(curve.vSol) / Number(curve.vTok) };
}
/** SOL out (lamports) for selling `tokens` (raw units) after fees. */
export function quoteSell(curve, global, tokens) {
  const protocol = BigInt(global?.feeBps ?? 100), creator = BigInt(curve.creatorFeeBps ?? (curve.creator.equals(ZERO) ? 0 : (global?.creatorFeeBps ?? 0)));
  const t = BigInt(tokens); if (t <= 0n) return { sol: 0n, gross: 0n };
  const gross = (t * curve.vSol) / (curve.vTok + t);
  const fees = ceilDiv(gross * protocol, 10000n) + ceilDiv(gross * creator, 10000n);
  return { sol: gross - fees, gross };
}
export const curveMcSol = (curve) => Number(curve.vSol) / Number(curve.vTok) * Number(curve.supply) / 1e9; // market cap in SOL (supply has 6 decimals, SOL 9 → ratio works out)

const key = (pubkey, w = false, s = false) => ({ pubkey, isSigner: s, isWritable: w });
const optBool = (b) => Buffer.from([b ? 1 : 0]);
const buybackOf = (global) => (global.buybackFeeRecipients || []).find((k) => !k.equals(ZERO)) || global.feeRecipient; // an unset slot is the zero key, which is truthy

/** Classic buy: spend exactly `spendLamports`, receive ≥ minTokens. Returns [createATA, buy]. */
export function ixBuyClassic({ user, mint, curve, global, tokenProgram = TOKEN, spendLamports, minTokens, partialFill = true }) {
  const bc = curveOf(mint);
  const keys = [key(GLOBAL), key(global.feeRecipient, true), key(mint), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ata(user, mint, tokenProgram), true), key(user, true, true),
    key(SYSTEM), key(tokenProgram), key(creatorVaultOf(curve.creator), true), key(EVENT_AUTHORITY), key(PUMP), key(GLOBAL_VOL), key(userVolOf(user), true), key(FEE_CONFIG), key(FEE_PROGRAM)];
  const data = Buffer.concat([Buffer.from(DISC.buyExactSolIn), u64(spendLamports), u64(minTokens), optBool(false), optBool(partialFill)]);
  return [ixCreateAtaIdempotent(user, user, mint, tokenProgram), new TransactionInstruction({ programId: PUMP, keys, data })];
}
/** Classic sell of `amount` raw tokens for ≥ minSol lamports, then close the token account (rent back). */
export function ixSellClassic({ user, mint, curve, global, tokenProgram = TOKEN, amount, minSol, close = true }) {
  const bc = curveOf(mint), userAta = ata(user, mint, tokenProgram);
  const keys = [key(GLOBAL), key(global.feeRecipient, true), key(mint), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(userAta, true), key(user, true, true),
    key(SYSTEM), key(creatorVaultOf(curve.creator), true), key(tokenProgram), key(EVENT_AUTHORITY), key(PUMP), key(FEE_CONFIG), key(FEE_PROGRAM)];
  const data = Buffer.concat([Buffer.from(DISC.sell), u64(amount), u64(minSol)]);
  const out = [new TransactionInstruction({ programId: PUMP, keys, data })];
  if (close) out.push(ixCloseAccount(userAta, user, user, tokenProgram));
  return out;
}
/** v3 buy (quote held as WSOL): wrap SOL into the user's WSOL account, buy, unwrap what is left. */
export function ixBuyV3({ user, mint, curve, global, tokenProgram = TOKEN, spendLamports, minTokens, partialFill = true }) {
  const bc = curveOf(mint), quote = WSOL, wsolAta = ata(user, quote, TOKEN), buyback = buybackOf(global);
  const keys = [key(GLOBAL), key(mint), key(quote), key(tokenProgram), key(TOKEN), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ata(bc, quote, TOKEN), true), key(user, true, true),
    key(ata(user, mint, tokenProgram), true), key(wsolAta, true), key(userVolOf(user), true), key(FEE_CONFIG), key(buyback, true), key(SYSTEM), key(EVENT_AUTHORITY), key(PUMP)];
  const data = Buffer.concat([Buffer.from(DISC.buyExactQuoteInV3), u64(spendLamports), u64(minTokens), optBool(partialFill)]);
  return [ixCreateAtaIdempotent(user, user, mint, tokenProgram), ixCreateAtaIdempotent(user, user, quote, TOKEN), ixTransfer(user, wsolAta, spendLamports), ixSyncNative(wsolAta),
    new TransactionInstruction({ programId: PUMP, keys, data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
}
export function ixSellV3({ user, mint, curve, global, tokenProgram = TOKEN, amount, minSol, close = true }) {
  const bc = curveOf(mint), quote = WSOL, wsolAta = ata(user, quote, TOKEN), userAta = ata(user, mint, tokenProgram), buyback = buybackOf(global);
  const keys = [key(GLOBAL), key(mint), key(quote), key(tokenProgram), key(TOKEN), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ata(bc, quote, TOKEN), true), key(user, true, true),
    key(userAta, true), key(wsolAta, true), key(userVolOf(user), true), key(FEE_CONFIG), key(buyback, true), key(SYSTEM), key(EVENT_AUTHORITY), key(PUMP)];
  const data = Buffer.concat([Buffer.from(DISC.sellV3), u64(amount), u64(minSol)]);
  const out = [ixCreateAtaIdempotent(user, user, quote, TOKEN), new TransactionInstruction({ programId: PUMP, keys, data }), ixCloseAccount(wsolAta, user, user, TOKEN)];
  if (close) out.push(ixCloseAccount(userAta, user, user, tokenProgram));
  return out;
}
export const tokenProgramOf = (mintOwner) => (mintOwner && mintOwner.equals(TOKEN_2022) ? TOKEN_2022 : TOKEN);
