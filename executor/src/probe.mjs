// Learn the real account layout from the chain: fetch recent transactions on a PumpSwap pool (or a pump.fun curve), find the swap instructions
// other bots sent, and print each one's discriminator, data length and account list with the accounts we can recognise labelled.
//   node src/probe.mjs <mint> [n]        swaps on this coin's pool (or curve)
//   node src/probe.mjs curve [n]         the newest transactions on the pump.fun program itself — bonding-curve buys and sells from live bots
// Each account shows W (writable) / S (signer) as the sender set it.
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { conn } from "./rpc.mjs";
import { PUMP, PUMP_AMM, FEE_PROGRAM, TOKEN, TOKEN_2022, ATA_PROGRAM, SYSTEM, WSOL, ata, PK } from "./solana.mjs";
import * as pump from "./pump.mjs";
import * as amm from "./amm.mjs";

const CURVE_MODE = process.argv[2] === "curve";
const SEEDS = ["pool-v2", "pool_v2", "bonding-curve", "bonding-curve-v2", "bonding_curve_v2", "curve-v2", "mayhem", "mayhem-state", "mayhem_state", "mayhem-config", "mayhem_config", "global", "global-v2", "global_v2", "config", "creator-vault", "creator_vault", "cashback", "cashback-v2",
  "whitelist", "fee-vault", "token-incentives", "token_incentives", "extension", "bonding-curve-extension", "user_volume_accumulator", "global_volume_accumulator", "fee_config", "pool-authority", "pool_authority", "buyback", "buyback-v2", "reserved", "metadata", "mint-authority", "mint_authority", "v2", "v3"];
const mint = CURVE_MODE ? WSOL : PK(process.argv[2]); const N = Number(process.argv[3] || 25);
const poolPk = amm.migratedPoolOf(mint), curvePk = pump.curveOf(mint);
const known = new Map([[PUMP.toBase58(), "PUMP"], [PUMP_AMM.toBase58(), "PUMP_AMM"], [FEE_PROGRAM.toBase58(), "FEE_PROGRAM"], [TOKEN.toBase58(), "TOKEN"], [TOKEN_2022.toBase58(), "TOKEN_2022"], [ATA_PROGRAM.toBase58(), "ATA_PROGRAM"],
  [SYSTEM.toBase58(), "SYSTEM"], [WSOL.toBase58(), "WSOL"], [mint.toBase58(), "MINT"], [poolPk.toBase58(), "POOL(derived)"], [curvePk.toBase58(), "CURVE"], [amm.GLOBAL_CONFIG.toBase58(), "AMM_GLOBAL_CONFIG"], [amm.poolV2Of(mint).toBase58(), "POOL_V2(mint)"],
  [amm.AMM_EVENT_AUTHORITY.toBase58(), "AMM_EVENT_AUTH"], [amm.AMM_GLOBAL_VOL.toBase58(), "AMM_GLOBAL_VOL"], [amm.AMM_FEE_CONFIG.toBase58(), "AMM_FEE_CONFIG"], [pump.GLOBAL.toBase58(), "PUMP_GLOBAL"], [pump.EVENT_AUTHORITY.toBase58(), "PUMP_EVENT_AUTH"],
  [pump.GLOBAL_VOL.toBase58(), "PUMP_GLOBAL_VOL"], [pump.MAYHEM_FEE_RECIPIENT.toBase58(), "MAYHEM_FEE_RCPT"], [pump.curveV2Of(mint).toBase58(), "CURVE_V2(mayhem)"], [pump.FEE_CONFIG.toBase58(), "PUMP_FEE_CONFIG"], [ata(poolPk, mint).toBase58(), "POOL_BASE_ATA"], [ata(poolPk, WSOL).toBase58(), "POOL_QUOTE_ATA"], [ata(curvePk, mint).toBase58(), "CURVE_ATA"], [ata(curvePk, WSOL).toBase58(), "CURVE_WSOL_ATA"],
  ["SysvarRent111111111111111111111111111111111", "RENT"]]);
const cfgAcc = await conn.getAccountInfo(amm.GLOBAL_CONFIG); const cfg = cfgAcc ? amm.decodeGlobalConfig(cfgAcc.data) : null;
if (cfg) { cfg.protocolFeeRecipients.forEach((k, i) => known.set(k.toBase58(), `PROTO_FEE_RCPT[${i}]`)); cfg.buybackFeeRecipients.forEach((k, i) => known.set(k.toBase58(), `BUYBACK_RCPT[${i}]`)); }
const gAcc = await conn.getAccountInfo(pump.GLOBAL); const g = gAcc ? pump.decodeGlobal(gAcc.data) : null;
if (g) { known.set(g.feeRecipient.toBase58(), "PUMP_FEE_RCPT"); g.feeRecipients.forEach((k, i) => known.set(k.toBase58(), `PUMP_FEE_RCPTS[${i}]`)); g.buybackFeeRecipients.forEach((k, i) => known.set(k.toBase58(), `PUMP_BUYBACK[${i}]`)); }
const poolAcc = await conn.getAccountInfo(poolPk); const pool = poolAcc ? amm.decodePool(poolAcc.data) : null;
if (pool) { known.set(pool.baseAcc.toBase58(), "POOL_BASE_ACC"); known.set(pool.quoteAcc.toBase58(), "POOL_QUOTE_ACC"); known.set(pool.coinCreator.toBase58(), "COIN_CREATOR"); const auth = amm.creatorVaultAuthorityOf(pool.coinCreator); known.set(auth.toBase58(), "CREATOR_VAULT_AUTH"); known.set(ata(auth, WSOL).toBase58(), "CREATOR_VAULT_ATA"); known.set(pool.lpMint.toBase58(), "LP_MINT"); }
console.log(`mint ${mint.toBase58()} · pool ${poolPk.toBase58()} ${pool ? "(exists)" : "(not found)"} · curve ${curvePk.toBase58()}`);
const target = CURVE_MODE ? PUMP : pool ? poolPk : curvePk;
const sigs = await conn.getSignaturesForAddress(target, { limit: CURVE_MODE ? Math.max(N, 200) : N });
console.log(`${sigs.length} recent transactions on ${CURVE_MODE ? "the pump.fun program" : pool ? "the pool" : "the curve"}`);
const seen = new Map(); // disc hex -> count
const count = { failed: 0, unreadable: 0, read: 0 }; let printed = 0;
for (const s of sigs) {
  if (s.err) { count.failed++; continue; }
  if (CURVE_MODE && printed >= N) break;
  const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch((e) => (count.lastErr = e.message, null)); if (!tx) { count.unreadable++; continue; }
  count.read++;
  const msg = tx.transaction.message, h = msg.header, L = msg.staticAccountKeys.length, lw = tx.meta?.loadedAddresses?.writable || [], lr = tx.meta?.loadedAddresses?.readonly || [];
  const keys = msg.staticAccountKeys.concat(lw, lr);
  const flag = (i) => { const sg = i < h.numRequiredSignatures; const w = i < L ? (i < h.numRequiredSignatures - h.numReadonlySignedAccounts) || (i >= h.numRequiredSignatures && i < L - h.numReadonlyUnsignedAccounts) : i < L + lw.length; return (w ? "W" : "-") + (sg ? "S" : "-"); };
  const all = [...tx.transaction.message.compiledInstructions.map((ix) => ({ ix, inner: false })), ...(tx.meta?.innerInstructions || []).flatMap((g) => g.instructions.map((ix) => ({ ix, inner: true })))];
  for (const { ix, inner } of all) {
    const prog = keys[ix.programIdIndex]; if (!prog || !(prog.equals(PUMP_AMM) || prog.equals(PUMP))) continue;
    const data = typeof ix.data === "string" ? Buffer.from(bs58.decode(ix.data)) : Buffer.from(ix.data); const disc = data.subarray(0, 8).toString("hex"); if (data.length < 8) continue; // inner instructions carry base58 text
    const k = `${prog.equals(PUMP) ? "PUMP" : "AMM"}:${disc}`; seen.set(k, (seen.get(k) || 0) + 1); if (seen.get(k) > 2) continue; // print the first two of each kind
    const idx = ix.accountKeyIndexes || ix.accounts;
    printed++; console.log(`\n${k} data ${data.length} bytes${inner ? " (inner)" : ""} · ${s.signature.slice(0, 20)}…`);
    idx.forEach((ai, i) => { const pk = keys[ai]; const b = pk?.toBase58() || "?"; console.log(`  [${String(i).padStart(2)}] ${flag(ai)} ${b} ${known.get(b) || ""}`); });
    console.log(`  args: ${data.subarray(8).toString("hex")}`);
    // unknown accounts: who owns them, how big, and can we derive them from anything else in the instruction?
    const unknown = [...new Set(idx.map((ai) => keys[ai]?.toBase58()).filter((b) => b && !known.has(b)))].map((b) => new PublicKey(b));
    if (unknown.length) { const infos = await conn.getMultipleAccountsInfo(unknown).catch(() => []);
      const all = idx.map((ai) => keys[ai]).filter(Boolean); const progs = [["PUMP", PUMP], ["AMM", PUMP_AMM], ["FEE", FEE_PROGRAM], ["MAYHEM", pump.MAYHEM]];
      unknown.forEach((u, i) => { const info = infos[i]; const owner = info?.owner; if (owner && !progs.some(([, p]) => p.equals(owner))) progs.push(["owner", owner]);
        const hits = []; for (const seed of SEEDS) for (const [pn, pg] of progs) { try { if (pda([seed], pg).equals(u)) hits.push(`PDA("${seed}") under ${pn}`); } catch {}
          for (const a of all) { try { if (pda([seed, a], pg).equals(u)) hits.push(`PDA("${seed}", ${known.get(a.toBase58()) || a.toBase58().slice(0, 6) + "…"}) under ${pn}`); } catch {} } }
        for (const a of all) for (const m of [mint, WSOL]) { try { if (ata(a, m).equals(u)) hits.push(`ata(${known.get(a.toBase58()) || a.toBase58().slice(0, 6) + "…"}, ${m.equals(WSOL) ? "WSOL" : "mint"})`); } catch {} }
        console.log(`  ? ${u.toBase58()}: ${info ? `owner ${known.get(owner.toBase58()) || owner.toBase58()} · ${info.data.length} bytes · disc ${info.data.subarray(0, 8).toString("hex")}` : "no account"}${hits.length ? " · = " + hits.join(" | ") : ""}`); }); }
  }
}
console.log("\ninstruction kinds seen:", Object.fromEntries(seen), count);
process.exit(0);
