// validate-tx.mjs — transaction-level evidence for the decoder, run on the server (needs RPC_HTTP; read-only, prints no secrets):
//   node older/src/validate-tx.mjs [N=120] > older/docs/tx-validation.json
// For N recent successful PumpSwap transactions it compares each Buy/Sell event with the transaction's own token-balance
// changes on the pool's two vaults:
//   • are pool_*_token_reserves the vault balances BEFORE or AFTER the swap?   (pre / post / neither, by instruction name and side)
//   • does the constant product on EFFECTIVE reserves reproduce the traded amount, under each interpretation?
//   • does the user's actual SOL debit/credit match user_quote_amount_in/out?  (the fee measure the engine uses)
// Only transactions with exactly one swap on the pool are scored (multi-hop / several swaps in one transaction are listed separately).
import { readFileSync, existsSync } from "node:fs";
const ENVF = process.env.OLDER_ENV || "/root/older/.env", ALT = "/root/tracker/.env";
for (const f of [ENVF, ALT]) if (existsSync(f)) for (const l of readFileSync(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
if (!process.env.RPC_HTTP && process.env.HELIUS_API_KEY) process.env.RPC_HTTP = "https://mainnet.helius-rpc.com/?api-key=" + process.env.HELIUS_API_KEY;
if (!process.env.RPC_HTTP) { console.error("RPC_HTTP is not set"); process.exit(1); }
const { rpc, parsePool } = await import("./feed.mjs"); const { PUMPSWAP_PROGRAM, WSOL, eventsFromLogs, IDL_PIN } = await import("./decoder.mjs");
const N = Number(process.argv[2] || 120), nap = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { at: new Date().toISOString(), idl: IDL_PIN, asked: N, scored: 0, skipped: {}, reserves: {}, curve: { pre: 0, post: 0, both: 0, neither: 0 }, curve_large_trades: { pre: 0, post: 0, both: 0, neither: 0 }, user_amount: { match: 0, differ: 0 }, virtual: { zero: 0, negative: 0, positive: 0, absent: 0 }, fee_rate: { buy: [], sell: [] }, samples: [] };
const skip = (k) => (out.skipped[k] = (out.skipped[k] || 0) + 1), near = (a, b, tol = 2) => Math.abs(Number(a) - Number(b)) <= tol;
const sigs = await rpc("getSignaturesForAddress", [PUMPSWAP_PROGRAM, { limit: Math.min(1000, N * 4) }]);
const poolCache = new Map();
for (const s of sigs) {
  if (out.scored >= N) break; if (s.err) { skip("failed tx"); continue; }
  let tx; try { tx = await rpc("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]); } catch { skip("getTransaction error"); await nap(300); continue; }
  await nap(120); if (!tx?.meta) { skip("no meta"); continue; }
  const evs = eventsFromLogs(tx.meta.logMessages).filter((e) => e.type === "buy" || e.type === "sell"); if (!evs.length) { skip("no swap event"); continue; }
  const byPool = new Map(); for (const e of evs) byPool.set(e.pool, (byPool.get(e.pool) || 0) + 1);
  for (const e of evs) {
    if (byPool.get(e.pool) !== 1) { skip("several swaps on one pool in the tx"); continue; }
    let p = poolCache.get(e.pool); if (!p) { try { const r = await rpc("getAccountInfo", [e.pool, { encoding: "base64" }]); p = r?.value ? parsePool(r.value.data[0]) : null; poolCache.set(e.pool, p); await nap(120); } catch { skip("pool read error"); continue; } }
    if (!p) { skip("pool unreadable"); continue; } if (p.quoteMint !== WSOL) { skip("non-SOL pool"); continue; }
    const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey ?? k), bi = keys.indexOf(p.poolBaseAta), qi = keys.indexOf(p.poolQuoteAta);
    const bal = (arr, i) => arr.find((x) => x.accountIndex === i)?.uiTokenAmount?.amount;
    const b0 = bal(tx.meta.preTokenBalances, bi), b1 = bal(tx.meta.postTokenBalances, bi), q0 = bal(tx.meta.preTokenBalances, qi), q1 = bal(tx.meta.postTokenBalances, qi);
    if ([b0, b1, q0, q1].some((x) => x == null)) { skip("vault balances not in tx"); continue; }
    const key = `${e.ix || "legacy"}|${e.type}`, R = (out.reserves[key] ||= { base_pre: 0, base_post: 0, base_neither: 0, quote_pre: 0, quote_post: 0, quote_neither: 0 });
    const bm = near(e.poolBase, b0) ? "pre" : near(e.poolBase, b1) ? "post" : "neither", qm = near(e.poolQuote, q0) ? "pre" : near(e.poolQuote, q1) ? "post" : "neither";
    R["base_" + bm]++; R["quote_" + qm]++;
    const vq = e.virtualQuote; if (vq == null) out.virtual.absent++; else if (vq === 0n) out.virtual.zero++; else if (vq < 0n) out.virtual.negative++; else out.virtual.positive++;
    const B = Number(e.poolBase), E = Number(e.poolQuote + (vq ?? 0n)), b = Number(e.baseAmt), q = Number(e.quoteAmt);
    const preQ = e.isBuy ? (E * b) / (B - b) : (E * b) / (B + b), postQ = e.isBuy ? (E * b) / (B + b) : (E * b) / (B - b), okPre = Math.abs(preQ - q) / q < 0.003, okPost = Math.abs(postQ - q) / q < 0.003;
    const c = okPre && okPost ? "both" : okPre ? "pre" : okPost ? "post" : "neither"; out.curve[c]++; if (b / B > 0.005) out.curve_large_trades[c]++;
    // the user's own SOL movement (fee payer, native balance, net of the transaction fee) vs the event's user amount
    const ui = keys.indexOf(e.user); let userOk = null;
    if (ui >= 0) { const dl = tx.meta.postBalances[ui] - tx.meta.preBalances[ui] + (ui === 0 ? tx.meta.fee : 0); userOk = Math.abs(Math.abs(dl) - Number(e.userQuote)) / Number(e.userQuote) < 0.02; out.user_amount[userOk ? "match" : "differ"]++; }
    const fr = e.isBuy ? Number(e.userQuote) / q - 1 : 1 - Number(e.userQuote) / q; out.fee_rate[e.isBuy ? "buy" : "sell"].push(+fr.toFixed(5));
    out.scored++;
    if (out.samples.length < 12) out.samples.push({ sig: s.signature, slot: tx.slot, ix: e.ix, type: e.type, event: { pool_base: String(e.poolBase), pool_quote: String(e.poolQuote), virtual_quote: vq == null ? null : String(vq), base_amt: String(e.baseAmt), quote_amt: String(e.quoteAmt), user_quote: String(e.userQuote), lp_bps: e.lpBps, protocol_bps: e.protoBps, creator_bps: e.creatorBps, cashback_bps: e.cashbackBps, buyback_bps: e.buybackBps, holder_bps: e.holderBps }, vault: { base_pre: b0, base_post: b1, quote_pre: q0, quote_post: q1 }, reserves_are: { base: bm, quote: qm }, curve_fit: c, user_amount_matches: userOk, fee_rate: +fr.toFixed(5) });
  }
}
const stat = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] }; };
out.fee_rate = { buy: stat(out.fee_rate.buy), sell: stat(out.fee_rate.sell) };
out.verdict = "reserves: see `reserves` (pre vs post per instruction and side); curve: `curve_large_trades` is the discriminating sample (small trades fit both)";
console.log(JSON.stringify(out, null, 1));
