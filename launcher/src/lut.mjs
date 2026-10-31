// launcher 0.1.15: an address lookup table for the launch transaction. Live launches on 31 Oct (01:53–07:02 UK, 14 posts) were all refused before sending:
// "VersionedTransaction too large: 1732–1764 bytes" (base64; Solana's cap is 1,232 raw bytes ≈ 1,644 base64). The self-test passed because its name and
// URI were short. The fixed accounts of a launch (programs, pump.fun's global accounts, fee recipients, tip accounts, our creator vault…) go into a
// lookup table owned by the launch wallet, so each one costs 1 byte in the transaction instead of 32. Created once (rent ≈ 0.01 SOL, recoverable).
import { AddressLookupTableProgram, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { conn, buildTx, sendUntilConfirmed } from "./rpc.mjs";
import { PUMP, GLOBAL, MINT_AUTHORITY, SYSTEM, TOKEN, TOKEN_2022, ATA_PROGRAM, MAYHEM, MAYHEM_GLOBAL_PARAMS, MAYHEM_SOL_VAULT, EVENT_AUTHORITY, GLOBAL_VOL, FEE_CONFIG, FEE_PROGRAM, WSOL, creatorVaultOf, userVolOf } from "./pump.mjs";

export const lutStat = { address: null, addresses: 0, created: null, extended: 0, lastErr: "" };
let LUT = null, busy = null;
export const luts = () => (LUT ? [LUT] : []);

export function wantedFor(me, g, tips) {
  const xs = [PUMP, GLOBAL, MINT_AUTHORITY, SYSTEM, TOKEN, TOKEN_2022, ATA_PROGRAM, MAYHEM, MAYHEM_GLOBAL_PARAMS, MAYHEM_SOL_VAULT, EVENT_AUTHORITY, GLOBAL_VOL, FEE_CONFIG, FEE_PROGRAM, WSOL,
    ComputeBudgetProgram.programId, creatorVaultOf(me), userVolOf(me), g.feeRecipient, ...(g.buybackFeeRecipients || []).filter((k) => !k.equals(SYSTEM)), ...tips];
  return [...new Set(xs.map((k) => k.toBase58()))].map((a) => new PublicKey(a));
}

/** Make sure the table exists and holds every wanted address. kv keeps its address. Safe to call often; does nothing when complete. */
export function ensureLut({ wallet, kvGet, kvSet, wanted }) {
  if (busy) return busy;
  busy = (async () => {
    try {
      let addr = kvGet("lut");
      if (addr) LUT = (await conn.getAddressLookupTable(new PublicKey(addr), { commitment: "confirmed" })).value;
      if (!LUT) {
        const slot = await conn.getSlot("finalized");
        const [ix, address] = AddressLookupTableProgram.createLookupTable({ authority: wallet.publicKey, payer: wallet.publicKey, recentSlot: slot });
        const r = await sendUntilConfirmed(await buildTx(wallet.publicKey, [ix], [wallet]), 30000);
        if (r.status !== "confirmed") throw new Error(`create lookup table: ${r.status} ${r.err || ""}`);
        addr = address.toBase58(); kvSet("lut", addr); lutStat.created = new Date().toISOString();
        await new Promise((res) => setTimeout(res, 1500));
        LUT = (await conn.getAddressLookupTable(address, { commitment: "confirmed" })).value;
      }
      const have = new Set((LUT?.state.addresses || []).map((a) => a.toBase58()));
      const missing = wanted.filter((k) => !have.has(k.toBase58()));
      for (let i = 0; i < missing.length; i += 20) {
        const ix = AddressLookupTableProgram.extendLookupTable({ lookupTable: new PublicKey(addr), authority: wallet.publicKey, payer: wallet.publicKey, addresses: missing.slice(i, i + 20) });
        const r = await sendUntilConfirmed(await buildTx(wallet.publicKey, [ix], [wallet]), 30000);
        if (r.status !== "confirmed") throw new Error(`extend lookup table: ${r.status} ${r.err || ""}`);
        lutStat.extended += Math.min(20, missing.length - i);
      }
      if (missing.length) { await new Promise((res) => setTimeout(res, 1500)); LUT = (await conn.getAddressLookupTable(new PublicKey(addr), { commitment: "confirmed" })).value; } // new entries are usable from the next slot
      lutStat.address = addr; lutStat.addresses = LUT?.state.addresses.length || 0; lutStat.lastErr = "";
    } catch (e) { lutStat.lastErr = e.message; }
    finally { busy = null; }
    return LUT;
  })();
  return busy;
}
