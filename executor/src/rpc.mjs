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
  const { blockhash: b, lastValidBlockHeight } = await blockhash();
  const msg = new TransactionMessage({ payerKey: payer, recentBlockhash: b, instructions: ixs }).compileToV0Message();
  const tx = new VersionedTransaction(msg); tx.lastValidBlockHeight = lastValidBlockHeight; if (signer) tx.sign([signer]); return tx;
}
/** Simulate (no signature needed). Returns { ok, err, logs, units, ms }. */
/** Simulate; `watch` = accounts whose post-simulation state we want back (e.g. our token account, to read the real fill the chain would give). */
export async function simulate(tx, watch = []) {
  const t0 = Date.now(); rpcStats.calls++;
  try {
    const cfg = { sigVerify: false, replaceRecentBlockhash: true, commitment: "processed" }; if (watch.length) cfg.accounts = { encoding: "base64", addresses: watch.map((k) => k.toBase58()) };
    const r = await conn.simulateTransaction(tx, cfg);
    const post = (r.value.accounts || []).map((a) => (a && a.data ? Buffer.from(a.data[0], "base64") : null));
    return { ok: !r.value.err, err: r.value.err ? JSON.stringify(r.value.err) : null, logs: r.value.logs || [], units: r.value.unitsConsumed ?? null, ms: Date.now() - t0, post };
  } catch (e) { rpcStats.errors++; rpcStats.lastErr = e.message; return { ok: false, err: "rpc: " + e.message, logs: [], units: null, ms: Date.now() - t0, post: [] }; }
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
/** Send, then keep re-sending the SAME signed transaction every 2.5 s until it is confirmed / failed or `ms` passes. Re-sending the identical
 *  transaction can never execute twice, so this is the only retry a BUY gets (a second, different buy could land as well → bought twice). */
export async function sendUntilConfirmed(tx, ms = 18000) {
  const first = await send(tx); const sig = first.sig, t0 = Date.now(); let resends = 0;
  while (Date.now() - t0 < ms) {
    const c = await waitConfirm(sig, 2500); if (c.status !== "timeout") return { ...c, sig, via: first.via, resends, ms: Date.now() - t0 };
    try { await send(tx); resends++; } catch {}
  }
  return { status: "timeout", slot: null, err: null, sig, via: first.via, resends, ms: Date.now() - t0 };
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
export async function blockHeight() { rpcStats.calls++; return conn.getBlockHeight("confirmed"); }
export async function signatureStatus(sig) { rpcStats.calls++; const r = await conn.getSignatureStatuses([sig]); const s = r.value[0]; return s ? { status: s.err ? "failed" : (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized") ? "confirmed" : "processed", slot: s.slot, err: s.err ? JSON.stringify(s.err) : null } : { status: "unknown" }; }
/** What actually happened: SOL change for the payer (lamports, fee included) and token change for the mint. Retries a few times — the node can lag the confirmation by a moment. */
export async function readFill(sig, payer, mint, tries = 4) {
  let tx = null; for (let i = 0; i < tries && !tx?.meta; i++) { if (i) await new Promise((r) => setTimeout(r, 600)); rpcStats.calls++; tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null); }
  if (!tx?.meta) return null;
  const keys = tx.transaction.message.staticAccountKeys.map((k) => k.toBase58()), i = keys.indexOf(payer.toBase58());
  const solDelta = i >= 0 ? tx.meta.postBalances[i] - tx.meta.preBalances[i] : null;
  const tok = (arr) => (arr || []).filter((b) => b.mint === mint.toBase58() && b.owner === payer.toBase58()).reduce((a, b) => a + Number(b.uiTokenAmount.amount), 0);
  return { solDelta, tokenDelta: tok(tx.meta.postTokenBalances) - tok(tx.meta.preTokenBalances), fee: tx.meta.fee, slot: tx.slot, blockTime: tx.blockTime ?? null, err: tx.meta.err ? JSON.stringify(tx.meta.err) : null };
}
