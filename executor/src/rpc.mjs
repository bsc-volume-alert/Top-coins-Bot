// RPC plumbing: Helius connection, blockhash cache, transaction build / simulate / send (Helius Sender first, plain RPC as fallback), confirmation, fill readback.
import { Connection, VersionedTransaction, TransactionMessage, PublicKey } from "@solana/web3.js";
import { CFG } from "./config.mjs";

export const conn = new Connection(CFG.RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
export const rpcStats = { calls: 0, errors: 0, sends: 0, senderErrors: 0, lastErr: "" };

let bh = { blockhash: null, lastValidBlockHeight: 0, t: 0 }, bhBusy = false;
export async function blockhash(maxAgeMs = 1500) {
  if (bh.blockhash && Date.now() - bh.t < maxAgeMs) return bh;
  if (bhBusy) { await new Promise((r) => setTimeout(r, 50)); return bh.blockhash ? bh : blockhash(maxAgeMs); }
  bhBusy = true; try { rpcStats.calls++; const r = await conn.getLatestBlockhash("confirmed"); bh = { ...r, t: Date.now() }; } catch (e) { rpcStats.errors++; rpcStats.lastErr = e.message; } finally { bhBusy = false; }
  if (!bh.blockhash) throw new Error("no blockhash: " + rpcStats.lastErr); return bh;
}
export async function getAccounts(pubkeys, commitment = "processed") {
  rpcStats.calls++; try { return await conn.getMultipleAccountsInfo(pubkeys.map((p) => (p instanceof PublicKey ? p : new PublicKey(p))), { commitment }); } catch (e) { rpcStats.errors++; rpcStats.lastErr = e.message; throw e; }
}
export async function getBalance(pubkey) { rpcStats.calls++; return conn.getBalance(pubkey, "confirmed"); }
export async function buildTx(payer, ixs, signer = null) {
  const { blockhash: b } = await blockhash();
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: b, instructions: ixs }).compileToV0Message();
  const tx = new VersionedTransaction(msg); if (signer) tx.sign([signer]); return tx;
}
/** Simulate (no signature needed). Returns { ok, err, logs, units, ms }. */
export async function simulate(tx) {
  const t0 = Date.now(); rpcStats.calls++;
  try {
    const r = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true, commitment: "processed" });
    return { ok: !r.value.err, err: r.value.err ? JSON.stringify(r.value.err) : null, logs: r.value.logs || [], units: r.value.unitsConsumed ?? null, ms: Date.now() - t0 };
  } catch (e) { rpcStats.errors++; rpcStats.lastErr = e.message; return { ok: false, err: "rpc: " + e.message, logs: [], units: null, ms: Date.now() - t0 }; }
}
/** Send a signed transaction through Helius Sender (every landing route at once); falls back to the normal RPC. Returns { sig, via, ms }. */
export async function send(tx) {
  const raw = Buffer.from(tx.serialize()).toString("base64"), t0 = Date.now(); rpcStats.sends++;
  try {
    const r = await fetch(CFG.SENDER_URL, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ id: String(Date.now()), jsonrpc: "2.0", method: "sendTransaction", params: [raw, { encoding: "base64", skipPreflight: true, maxRetries: 0 }] }) });
    const j = await r.json(); if (j.result) return { sig: j.result, via: "sender", ms: Date.now() - t0 };
    throw new Error(j.error?.message || `sender http ${r.status}`);
  } catch (e) {
    rpcStats.senderErrors++; rpcStats.lastErr = "sender: " + e.message;
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 0 }); return { sig, via: "rpc", ms: Date.now() - t0, senderErr: e.message };
  }
}
/** Poll until the signature is confirmed or failed, or `ms` passes. Returns { status: 'confirmed'|'failed'|'timeout', slot, err }. */
export async function waitConfirm(sig, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    rpcStats.calls++;
    try { const r = await conn.getSignatureStatuses([sig]); const s = r.value[0];
      if (s) { if (s.err) return { status: "failed", slot: s.slot, err: JSON.stringify(s.err) }; if (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized") return { status: "confirmed", slot: s.slot, err: null }; } }
    catch (e) { rpcStats.errors++; rpcStats.lastErr = e.message; }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { status: "timeout", slot: null, err: null };
}
/** What actually happened: SOL change for the payer (lamports, fee included) and token change for the mint. */
export async function readFill(sig, payer, mint) {
  rpcStats.calls++;
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }); if (!tx?.meta) return null;
  const keys = tx.transaction.message.staticAccountKeys.map((k) => k.toBase58()), i = keys.indexOf(payer.toBase58());
  const solDelta = i >= 0 ? tx.meta.postBalances[i] - tx.meta.preBalances[i] : null;
  const tok = (arr) => (arr || []).filter((b) => b.mint === mint.toBase58() && b.owner === payer.toBase58()).reduce((a, b) => a + Number(b.uiTokenAmount.amount), 0);
  return { solDelta, tokenDelta: tok(tx.meta.postTokenBalances) - tok(tx.meta.preTokenBalances), fee: tx.meta.fee, slot: tx.slot, blockTime: tx.blockTime ?? null, err: tx.meta.err ? JSON.stringify(tx.meta.err) : null };
}
