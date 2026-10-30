// pump.fun instructions for launching: create_v2 (Token-2022 coin, SOL pair) + the classic buy_exact_sol_in in the same transaction, the classic sell,
// and collect_creator_fee_v2. Built locally from the published IDL (pump-fun/pump-public-docs, idl/pump.json, read 24 Oct 2026) — no SDK.
// The buy / sell account lists are the executor's (executor/src/pump.mjs), which were checked against other bots' transactions on chain (18 Oct 2026).
import { PublicKey, SystemProgram, ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js";

export const PK = (x) => new PublicKey(x);
export const SYSTEM = SystemProgram.programId;
export const TOKEN = PK("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022 = PK("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ATA_PROGRAM = PK("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const WSOL = PK("So11111111111111111111111111111111111111112");
export const PUMP = PK("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const FEE_PROGRAM = PK("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");
export const MAYHEM = PK("MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e");
const ZERO = PK("11111111111111111111111111111111");

export const pda = (seeds, program) => PublicKey.findProgramAddressSync(seeds.map((x) => (typeof x === "string" ? Buffer.from(x) : x instanceof PublicKey ? x.toBuffer() : Buffer.from(x))), program)[0];
export const ata = (owner, mint, tokenProgram = TOKEN) => pda([owner, tokenProgram, mint], ATA_PROGRAM);
export const u64 = (v) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
const str = (x) => { const b = Buffer.from(x, "utf8"); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
const rU64 = (d, o) => d.readBigUInt64LE(o), rPk = (d, o) => new PublicKey(d.subarray(o, o + 32));
const key = (pubkey, w = false, sg = false) => ({ pubkey, isSigner: sg, isWritable: w });

const DISC = { createV2: [214, 144, 76, 236, 95, 139, 49, 180], buyExactSolIn: [56, 252, 116, 8, 158, 223, 205, 95], sell: [51, 230, 133, 164, 1, 127, 131, 173], collectCreatorFeeV2: [207, 17, 138, 242, 4, 34, 19, 56] };
export const CURVE_DISC = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
export const GLOBAL = pda(["global"], PUMP);
export const MINT_AUTHORITY = pda(["mint-authority"], PUMP);
export const EVENT_AUTHORITY = pda(["__event_authority"], PUMP);
export const GLOBAL_VOL = pda(["global_volume_accumulator"], PUMP);
export const FEE_CONFIG = pda(["fee_config", PUMP.toBuffer()], FEE_PROGRAM);
export const MAYHEM_GLOBAL_PARAMS = pda(["global-params"], MAYHEM);
export const MAYHEM_SOL_VAULT = pda(["sol-vault"], MAYHEM);
export const curveOf = (mint) => pda(["bonding-curve", mint], PUMP);
export const creatorVaultOf = (creator) => pda(["creator-vault", creator], PUMP);
export const userVolOf = (user) => pda(["user_volume_accumulator", user], PUMP);
const mayhemStateOf = (mint) => pda(["mayhem-state", mint], MAYHEM);
const curveV2Of = (mint) => pda(["bonding-curve-v2", mint], PUMP); // 0.1.4: under the pump program, as pump.fun's own SDK (@pump-fun/pump-sdk 4.3.1, bondingCurveV2Pda) — the Mayhem-program PDA was refused (InvalidBondingCurveV2, self-test 30 Oct 22:54 UK)

/** Global account (Anchor: 8-byte discriminator, then the IDL's field order). */
export function decodeGlobal(d) {
  if (!d || d.length < 170) return null;
  const g = { feeRecipient: rPk(d, 41), initVTok: rU64(d, 73), initVSol: rU64(d, 81), initRTok: rU64(d, 89), supply: rU64(d, 97), feeBps: Number(rU64(d, 105)), creatorFeeBps: Number(rU64(d, 154)), buybackFeeRecipients: [] };
  for (let i = 0; i < 8 && d.length >= 741 + 32 * (i + 1); i++) g.buybackFeeRecipients.push(rPk(d, 741 + 32 * i));
  return g;
}
/** BondingCurve account. */
export function decodeCurve(d) {
  if (!d || d.length < 49 || !d.subarray(0, 8).equals(CURVE_DISC)) return null;
  const has = (e) => d.length >= e;
  return { vTok: rU64(d, 8), vSol: rU64(d, 16), rTok: rU64(d, 24), rSol: rU64(d, 32), supply: rU64(d, 40), complete: d[48] === 1, creator: has(81) ? rPk(d, 49) : ZERO,
    mayhem: has(82) ? d[81] === 1 : false, creatorFeeBps: has(123) ? Number(rU64(d, 115)) : null };
}
/** The curve of a coin we are about to create, as the program will initialise it (Global's initial reserves, us as creator). */
export const freshCurve = (g, creator) => ({ vTok: g.initVTok, vSol: g.initVSol, rTok: g.initRTok, rSol: 0n, supply: g.supply, complete: false, creator, mayhem: false, creatorFeeBps: null });

const ceilDiv = (a, b) => (a + b - 1n) / b;
const feeParts = (curve, g) => ({ protocol: BigInt(g?.feeBps ?? 95), creator: BigInt(curve.creatorFeeBps ?? (curve.creator.equals(ZERO) ? 0 : (g?.creatorFeeBps ?? 30))) });
/** Tokens out for spending `spend` lamports (the IDL docs' formula, as the executor uses it). */
export function quoteBuy(curve, g, spend) {
  const { protocol, creator } = feeParts(curve, g), S = BigInt(spend);
  let net = (S * 10000n) / (10000n + protocol + creator);
  const fees = ceilDiv(net * protocol, 10000n) + ceilDiv(net * creator, 10000n);
  if (net + fees > S) net -= net + fees - S;
  const tokens = net > 1n ? ((net - 1n) * curve.vTok) / (curve.vSol + net - 1n) : 0n;
  return { tokens, net };
}
/** SOL out (lamports, after fees) for selling `tokens`. */
export function quoteSell(curve, g, tokens) {
  const { protocol, creator } = feeParts(curve, g), t = BigInt(tokens); if (t <= 0n) return 0n;
  const gross = (t * curve.vSol) / (curve.vTok + t);
  return gross - ceilDiv(gross * protocol, 10000n) - ceilDiv(gross * creator, 10000n);
}
export const priceOf = (curve) => Number(curve.vSol) / Number(curve.vTok); // lamports per raw token unit

const buyback = (g) => { const xs = (g.buybackFeeRecipients || []).filter((k) => !k.equals(ZERO)); return xs.length ? xs[Math.floor(Math.random() * xs.length)] : g.feeRecipient; };
const ixAtaIdem = (payer, owner, mint, tp) => new TransactionInstruction({ programId: ATA_PROGRAM, data: Buffer.from([1]),
  keys: [key(payer, true, true), key(ata(owner, mint, tp), true), key(owner), key(mint), key(SYSTEM), key(tp)] });
const ixClose = (account, dest, owner, tp) => new TransactionInstruction({ programId: tp, data: Buffer.from([9]), keys: [key(account, true), key(dest, true), key(owner, false, true)] });
export const ixBudget = (cu, price) => [ComputeBudgetProgram.setComputeUnitLimit({ units: cu }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price })];
export const ixTransfer = (from, to, lamports) => SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports });

/** create_v2: a new Token-2022 coin traded against SOL — not mayhem, no cashback, standard creator fee, not a holder-rewards coin (all arguments written out). */
export function ixCreateV2({ mint, user, creator, name, symbol, uri }) {
  if ([...name].length > 32 || Buffer.byteLength(symbol) > 13 || uri.length > 200) throw new Error("name/symbol/uri too long");
  const bc = curveOf(mint);
  const keys = [key(mint, true, true), key(MINT_AUTHORITY), key(bc, true), key(ata(bc, mint, TOKEN_2022), true), key(GLOBAL), key(user, true, true), key(SYSTEM), key(TOKEN_2022), key(ATA_PROGRAM),
    key(MAYHEM, true), key(MAYHEM_GLOBAL_PARAMS), key(MAYHEM_SOL_VAULT, true), key(mayhemStateOf(mint), true), key(ata(MAYHEM_SOL_VAULT, mint, TOKEN_2022), true), key(EVENT_AUTHORITY), key(PUMP)];
  const data = Buffer.concat([Buffer.from(DISC.createV2), str(name), str(symbol), str(uri), creator.toBuffer(), Buffer.from([0]), Buffer.from([0]), u64(0), Buffer.from([0])]); // mayhem off, cashback [false], creator_fee_bps [0] (standard), holder_reward [false]
  return new TransactionInstruction({ programId: PUMP, keys, data });
}
/** Classic buy (spend exactly `spend` lamports, ≥ minTokens): [create our token account, buy]. */
export function ixBuy({ user, mint, curve, g, tokenProgram = TOKEN_2022, spend, minTokens }) {
  const bc = curveOf(mint);
  const keys = [key(GLOBAL), key(g.feeRecipient, true), key(mint), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ata(user, mint, tokenProgram), true), key(user, true, true),
    key(SYSTEM), key(tokenProgram), key(creatorVaultOf(curve.creator), true), key(EVENT_AUTHORITY), key(PUMP), key(GLOBAL_VOL), key(userVolOf(user), true), key(FEE_CONFIG), key(FEE_PROGRAM),
    key(curveV2Of(mint)), key(buyback(g), true)];
  const data = Buffer.concat([Buffer.from(DISC.buyExactSolIn), u64(spend), u64(minTokens), Buffer.from([0]), Buffer.from([1])]); // track_volume=false, partial_fill=true
  return [ixAtaIdem(user, user, mint, tokenProgram), new TransactionInstruction({ programId: PUMP, keys, data })];
}
/** Classic sell of `amount` raw tokens for ≥ minSol lamports, then close our token account (its rent comes back). */
export function ixSell({ user, mint, curve, g, tokenProgram = TOKEN_2022, amount, minSol, close = true }) {
  const bc = curveOf(mint), ua = ata(user, mint, tokenProgram);
  const keys = [key(GLOBAL), key(g.feeRecipient, true), key(mint), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ua, true), key(user, true, true),
    key(SYSTEM), key(creatorVaultOf(curve.creator), true), key(tokenProgram), key(EVENT_AUTHORITY), key(PUMP), key(FEE_CONFIG), key(FEE_PROGRAM), key(curveV2Of(mint)), key(buyback(g), true)];
  const out = [new TransactionInstruction({ programId: PUMP, keys, data: Buffer.concat([Buffer.from(DISC.sell), u64(amount), u64(minSol)]) })];
  if (close) out.push(ixClose(ua, user, user, tokenProgram));
  return out;
}
/** collect_creator_fee_v2 for a SOL-paired coin: the vault's lamports (above rent) go to the creator's wallet. Permissionless. */
export function ixCollectCreatorFee(creator) {
  const vault = creatorVaultOf(creator);
  const keys = [key(creator, true), key(ata(creator, WSOL, TOKEN), true), key(vault, true), key(ata(vault, WSOL, TOKEN), true), key(WSOL), key(TOKEN), key(ATA_PROGRAM), key(SYSTEM), key(EVENT_AUTHORITY), key(PUMP)];
  return new TransactionInstruction({ programId: PUMP, keys, data: Buffer.from(DISC.collectCreatorFeeV2) });
}

// v3 buy / sell (the quote is held in a WSOL account): pump.fun's own site follows create_v2 with BuyV3 (seen in launch transactions read by coin scope,
// 24 Oct 2026). Kept as the fallback when the classic pair is refused in simulation. Account order as the executor's v3 (executor/src/pump.mjs).
const DISC3 = { buyExactQuoteInV3: [225, 247, 80, 30, 213, 179, 132, 136], sellV3: [28, 146, 222, 119, 38, 196, 105, 213] };
const v3Keys = (user, mint, g, tokenProgram) => { const bc = curveOf(mint);
  return [key(GLOBAL), key(mint), key(WSOL), key(tokenProgram), key(TOKEN), key(bc, true), key(ata(bc, mint, tokenProgram), true), key(ata(bc, WSOL, TOKEN), true), key(user, true, true),
    key(ata(user, mint, tokenProgram), true), key(ata(user, WSOL, TOKEN), true), key(userVolOf(user), true), key(FEE_CONFIG), key(buyback(g), true), key(SYSTEM), key(EVENT_AUTHORITY), key(PUMP)]; };
const ixSyncNative = (acc) => new TransactionInstruction({ programId: TOKEN, data: Buffer.from([17]), keys: [key(acc, true)] });
export function ixBuyV3({ user, mint, g, tokenProgram = TOKEN_2022, spend, minTokens }) {
  const w = ata(user, WSOL, TOKEN);
  return [ixAtaIdem(user, user, mint, tokenProgram), ixAtaIdem(user, user, WSOL, TOKEN), ixTransfer(user, w, BigInt(spend)), ixSyncNative(w),
    new TransactionInstruction({ programId: PUMP, keys: v3Keys(user, mint, g, tokenProgram), data: Buffer.concat([Buffer.from(DISC3.buyExactQuoteInV3), u64(spend), u64(minTokens), Buffer.from([1])]) }),
    ixClose(w, user, user, TOKEN)];
}
export function ixSellV3({ user, mint, g, tokenProgram = TOKEN_2022, amount, minSol, close = true }) {
  const w = ata(user, WSOL, TOKEN);
  const out = [ixAtaIdem(user, user, WSOL, TOKEN), new TransactionInstruction({ programId: PUMP, keys: v3Keys(user, mint, g, tokenProgram), data: Buffer.concat([Buffer.from(DISC3.sellV3), u64(amount), u64(minSol)]) }), ixClose(w, user, user, TOKEN)];
  if (close) out.push(ixClose(ata(user, mint, tokenProgram), user, user, tokenProgram));
  return out;
}
