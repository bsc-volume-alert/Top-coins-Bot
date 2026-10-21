// "Find wallet from a trade": the fomo app shows a trader's buys (coin, amount, how long ago) but never the wallet. Given those
// three, look the coin up (DexScreener, every chain — fomo trades Solana, Base, BSC, Ethereum and Robinhood Chain), and if it is a
// Solana coin, pull its main pools' transactions around that time, keep the ones paid for by fomo's signer, and return the buys
// whose size matches. The buyer in that transaction is the wallet. Capped per search (credits) and run as a background job,
// because the tracker's proxy times out at 30 s.
import { CFG } from "./config.mjs";
import { rpc, decodeParsed, budgetLeft } from "./rpc.mjs";
import { nowS } from "./db.mjs";
const jobs = new Map(); let nextId = 1;
const CAP = Number(process.env.FOMO_FIND_CAP || 300); // credits per search
const isMint = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export function parseAgo(s) { const m = String(s || "").trim().match(/^(\d+(?:\.\d+)?)\s*([mhd])?$/i); if (!m) return null; const n = Number(m[1]), u = (m[2] || "h").toLowerCase(); return Math.round(n * (u === "m" ? 60 : u === "d" ? 86400 : 3600)); }
async function lookupCoin(coin) {
  if (isMint(coin)) { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${coin}`, { signal: AbortSignal.timeout(8000) }); const j = await r.json(); return { pairs: (j.pairs || []), exact: true }; }
  const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(coin)}`, { signal: AbortSignal.timeout(8000) }); const j = await r.json();
  const want = coin.trim().toLowerCase();
  return { pairs: (j.pairs || []).filter((p) => (p.baseToken?.symbol || "").toLowerCase() === want || (p.baseToken?.name || "").toLowerCase() === want), exact: false };
}
export function startFind({ coin, usd, ago, tolPct = 4 }) {
  const id = nextId++; const job = { id, coin, usd, ago, started: nowS(), state: "running", note: "", credits: 0, scanned: 0, candidates: [], chains: {}, pools: [] };
  jobs.set(id, job); if (jobs.size > 20) jobs.delete(jobs.keys().next().value);
  run(job, tolPct).catch((e) => { job.state = "error"; job.note = e.message; });
  return job;
}
export const getFind = (id) => jobs.get(Number(id)) || null;
async function run(job, tolPct) {
  const agoS = parseAgo(job.ago); if (agoS == null) { job.state = "error"; job.note = "when: use e.g. 45m, 17h or 2d"; return; }
  const target = Number(job.usd); if (!(target > 0)) { job.state = "error"; job.note = "amount: a dollar figure, e.g. 9995"; return; }
  const { pairs } = await lookupCoin(job.coin);
  for (const p of pairs) job.chains[p.chainId] = (job.chains[p.chainId] || 0) + 1;
  const sol = pairs.filter((p) => p.chainId === "solana").sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  if (!pairs.length) { job.state = "done"; job.note = `no coin called "${job.coin}" on DexScreener — try the mint address`; return; }
  if (!sol.length) { job.state = "done"; job.note = `"${job.coin}" is not a Solana coin here (chains: ${Object.keys(job.chains).join(", ")}). EVM wallets come with stage 2.`; return; }
  const mints = [...new Set(sol.map((p) => p.baseToken?.address))].slice(0, 3);
  job.pools = sol.slice(0, 4).map((p) => ({ pool: p.pairAddress, dex: p.dexId, mint: p.baseToken?.address, symbol: p.baseToken?.symbol, liq: p.liquidity?.usd || 0 }));
  job.note = `Solana: ${job.pools.length} pool(s) for ${sol[0].baseToken?.symbol}${Object.keys(job.chains).length > 1 ? ` (also on ${Object.keys(job.chains).filter((c) => c !== "solana").join(", ")})` : ""}`;
  // the app rounds "17h" — search ±7% of the age, at least ±20 min, newest first from the top of the window
  const tTarget = nowS() - agoS, half = Math.max(1200, Math.round(agoS * 0.07)), tHi = tTarget + half, tLo = tTarget - half;
  const sigs = [];
  for (const p of job.pools) {
    let before = null, pages = 0;
    while (pages++ < 12 && job.credits < CAP) {
      job.credits++; let arr; try { arr = await rpc("getSignaturesForAddress", [p.pool, { limit: 1000, ...(before ? { before } : {}) }], { budget: false }); } catch (e) { job.note += ` · ${p.symbol}: ${e.message.slice(0, 60)}`; break; }
      if (!arr?.length) break;
      for (const s of arr) if (s.blockTime >= tLo && s.blockTime <= tHi && !s.err) sigs.push({ sig: s.signature, ts: s.blockTime, pool: p.pool });
      before = arr[arr.length - 1].signature; if (arr[arr.length - 1].blockTime < tLo) break;
    }
  }
  sigs.sort((a, b) => Math.abs(a.ts - tTarget) - Math.abs(b.ts - tTarget)); job.scanned = 0; job.inWindow = sigs.length;
  const seen = new Set();
  for (const s of sigs) {
    if (seen.has(s.sig)) continue; seen.add(s.sig);
    if (job.credits >= CAP || budgetLeft() < 1000) { job.note += ` · stopped at ${job.scanned} transactions (credit cap)`; break; }
    job.credits++; job.scanned++;
    let tx; try { tx = await rpc("getTransaction", [s.sig, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed", commitment: "confirmed" }], { budget: false }); } catch { continue; }
    const d = decodeParsed(tx); if (!d || d.failed || d.feePayer !== CFG.SIGNER) continue;
    for (const leg of d.legs) {
      if (!mints.includes(leg.mint) || leg.side !== "buy") continue;
      const off = Math.abs(leg.usd - target) / target;
      if (off <= tolPct / 100 || (leg.quote === "SOL" && off <= 0.12)) job.candidates.push({ sig: s.sig, ts: d.ts, wallet: leg.wallet, usd: +leg.usd.toFixed(2), quote: leg.quote, mint: leg.mint, off: +(off * 100).toFixed(1) });
    }
    if (job.candidates.length >= 3 && job.candidates.some((c) => c.off < 1)) break;
  }
  job.candidates.sort((a, b) => a.off - b.off);
  job.state = "done"; if (!job.candidates.length) job.note += ` · no fomo buy of ~$${target} found in ${job.scanned} transactions (${job.inWindow} in the window); try a tighter "when" or another trade`;
}
