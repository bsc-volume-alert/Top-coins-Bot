// pool-virtual-check.mjs — 9 Nov 2026: reads the CURRENT PumpSwap pool accounts of the sampled pools and decodes virtual_quote_reserves
// (i128 at byte 245, same layout as executor/src/amm.mjs and launcher/src/chainfill.mjs), to compare with the offset c fitted from historical
// swaps. 3 getAccountInfo calls, read-only. Current state only: it corroborates, it does not prove the historical value.
import { readFileSync } from "node:fs";
let KEY = process.env.HELIUS_API_KEY;
try { for (const l of readFileSync("/root/tracker/.env", "utf8").split("\n")) { const m = l.match(/^\s*HELIUS_API_KEY\s*=\s*(.*?)\s*$/); if (m && !KEY) KEY = m[1]; } } catch {}
const P = JSON.parse(readFileSync(new URL("./pool-virtual-sample.json", import.meta.url), "utf8"));
for (const p of P) {
  try {
    const r = await fetch(`https://mainnet.helius-rpc.com/?api-key=${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [p.pool, { encoding: "base64" }] }) });
    const j = await r.json(); const d = Buffer.from(j.result?.value?.data?.[0] || "", "base64");
    const vq = d.length >= 261 ? ((d.readBigInt64LE(253) << 64n) | d.readBigUInt64LE(245)) : null;
    console.log(`[virt] ${p.mint.slice(0, 6)} pool ${p.pool.slice(0, 6)} len ${d.length} virtual_quote ${vq == null ? "-" : (Number(vq) / 1e9).toFixed(4)} SOL | fitted c median ${p.c_median.toFixed(3)} (first50 ${p.c_first50.toFixed(3)}, last50 ${p.c_last50.toFixed(3)}, n ${p.n})`);
  } catch (e) { console.log(`[virt] ${p.pool.slice(0, 6)} error ${String(e.message).slice(0, 80)}`); }
}
console.log("[virt] done");
