// Shared Solana helpers: program ids, PDAs, token-account parsing, compute-budget / tip instructions.
import { PublicKey, SystemProgram, ComputeBudgetProgram, TransactionInstruction } from "@solana/web3.js";

export const PK = (s) => new PublicKey(s);
export const SYSTEM = SystemProgram.programId;
export const TOKEN = PK("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022 = PK("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ATA_PROGRAM = PK("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const WSOL = PK("So11111111111111111111111111111111111111112");
export const PUMP = PK("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const PUMP_AMM = PK("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
export const FEE_PROGRAM = PK("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");

// Helius Sender tip accounts (mainnet). Validated at load; a bad entry is dropped rather than crashing.
const TIP_RAW = ["4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE", "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ", "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta", "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn",
  "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD", "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ", "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF", "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT",
  "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey", "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or"];
export const TIP_ACCOUNTS = TIP_RAW.flatMap((s) => { try { const p = new PublicKey(s); return p.toBytes().length === 32 ? [p] : []; } catch { return []; } });
export const randomTip = () => TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)];

export const pda = (seeds, program) => PublicKey.findProgramAddressSync(seeds.map((s) => (typeof s === "string" ? Buffer.from(s) : s instanceof PublicKey ? s.toBuffer() : Buffer.from(s))), program)[0];
export const ata = (owner, mint, tokenProgram = TOKEN) => pda([owner, tokenProgram, mint], ATA_PROGRAM);

export const u64 = (n) => { const b = Buffer.alloc(8); const v = typeof n === "bigint" ? n : BigInt(Math.max(0, Math.floor(Number(n)))); b.writeBigUInt64LE(v < 0n ? 0n : v); return b; };
export const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export const readU64 = (buf, off) => buf.readBigUInt64LE(off);
export const readPk = (buf, off) => new PublicKey(buf.subarray(off, off + 32));

/** SPL token account: mint @0, owner @32, amount @64 (u64) */
export const parseTokenAccount = (data) => (data && data.length >= 72 ? { mint: readPk(data, 0), owner: readPk(data, 32), amount: readU64(data, 64) } : null);

export const ixCreateAtaIdempotent = (payer, owner, mint, tokenProgram = TOKEN) => new TransactionInstruction({
  programId: ATA_PROGRAM, data: Buffer.from([1]),
  keys: [{ pubkey: payer, isSigner: true, isWritable: true }, { pubkey: ata(owner, mint, tokenProgram), isSigner: false, isWritable: true }, { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: SYSTEM, isSigner: false, isWritable: false }, { pubkey: tokenProgram, isSigner: false, isWritable: false }] });
export const ixCloseAccount = (account, dest, owner, tokenProgram = TOKEN) => new TransactionInstruction({ programId: tokenProgram, data: Buffer.from([9]),
  keys: [{ pubkey: account, isSigner: false, isWritable: true }, { pubkey: dest, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false }] });
export const ixSyncNative = (account) => new TransactionInstruction({ programId: TOKEN, data: Buffer.from([17]), keys: [{ pubkey: account, isSigner: false, isWritable: true }] });
export const ixTransfer = (from, to, lamports) => SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports });
export const ixBudget = (cuLimit, cuPriceMicro) => [ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPriceMicro })];
export const ixTip = (from, lamports) => ixTransfer(from, randomTip(), lamports);
