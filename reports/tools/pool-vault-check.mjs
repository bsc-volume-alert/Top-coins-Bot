// pool-vault-check.mjs — 9 Nov 2026 (Codex 18:14: verify the ~17 SOL reserve-offset hypothesis against timestamped on-chain evidence).
// Bounded, read-only: 9 getTransaction calls (sample in pool-vault-sample.json). For each swap, compares the event's pool reserves with the
// pool-owned token-account balances recorded in the SAME transaction's meta (preTokenBalances / postTokenBalances) — historical, not current.
// Output: one line per swap to stdout (deploy log). Never prints the API key.
import { readFileSync } from "node:fs";
let KEY = process.env.HELIUS_API_KEY;
try { for (const l of readFileSync("/root/tracker/.env", "utf8").split("\n")) { const m = l.match(/^\s*HELIUS_API_KEY\s*=\s*(.*?)\s*$/); if (m && !KEY) KEY = m[1]; } } catch {}
const S = JSON.parse(readFileSync(new URL("./pool-vault-sample.json", import.meta.url), "utf8"));
const WSOL = "So11111111111111111111111111111111111111112";
for (const s of S) {
  try {
    const r = await fetch(`https://mainnet.helius-rpc.com/?api-key=${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [s.sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }] }) });
    const j = await r.json(); const meta = j.result?.meta; if (!meta) { console.log(`[vault] ${s.sig.slice(0, 8)} no result ${JSON.stringify(j.error || {}).slice(0, 80)}`); continue; }
    const pick = (arr, mint) => (arr || []).filter((b) => b.owner === s.pool && b.mint === mint).map((b) => BigInt(b.uiTokenAmount.amount));
    const qPre = pick(meta.preTokenBalances, WSOL), qPost = pick(meta.postTokenBalances, WSOL), bPre = pick(meta.preTokenBalances, s.mint), bPost = pick(meta.postTokenBalances, s.mint);
    const f = (a) => a.map((x) => (Number(x) / 1e9).toFixed(4)).join("/") || "-", g = (a) => a.map((x) => (Number(x) / 1e6).toFixed(0)).join("/") || "-";
    const nev = (meta.logMessages || []).filter((l) => l.startsWith("Program data: ")).length;
    console.log(`[vault] ${s.mint.slice(0, 6)} ${s.is_buy ? "buy " : "sell"} ${s.sol.toFixed(3)} SOL ev_idx ${s.ev_idx} | event Q ${(Number(s.pq) / 1e9).toFixed(4)} B ${(Number(s.pb) / 1e6).toFixed(0)} | vault WSOL pre ${f(qPre)} post ${f(qPost)} | vault base pre ${g(bPre)} post ${g(bPost)} | data-logs ${nev}`);
  } catch (e) { console.log(`[vault] ${s.sig.slice(0, 8)} error ${String(e.message).slice(0, 80)}`); }
}
console.log("[vault] done");
