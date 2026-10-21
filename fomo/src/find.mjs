// "Find wallet from a trade": the fomo app shows a trader's buys (coin, amount, how long ago) but never the wallet. Given those
// three, look the coin up (DexScreener, every chain — fomo trades Solana, Base, BSC, Ethereum and Robinhood Chain), and if it is a
// Solana coin, pull its main pools' transactions around that time, keep the ones paid for by fomo's signer, and return the buys
// whose size matches. The buyer in that transaction is the wallet. Capped per search (credits) and run as a background job,
// because the tracker's proxy times out at 30 s.
import { CFG } from "./config.mjs";
import { rpc, decodeParsed, budgetLeft } from "./rpc.mjs";
import { nowS } from "./db.mjs";
const jobs = new Map(); let nextId = 1;
const CAP = Number(process.env.FOMO_FIND_CAP || 5000); // credits per search (a 17-h-old trade needs ~450 pages of the signer walk plus one read per fomo trade on the coin in the window; 5,000 credits is about 2.5p on the £49 / 10M plan)
const isMint = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export function parseAgo(s) { const m = String(s || "").trim().match(/^(\d+(?:\.\d+)?)\s*([mhd])?$/i); if (!m) return null; const n = Number(m[1]), u = (m[2] || "h").toLowerCase(), unit = u === "m" ? 60 : u === "d" ? 86400 : 3600; return { s: Math.round(n * unit), unit, n }; }
async function lookupCoin(coin) {
  if (isMint(coin)) { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${coin}`, { signal: AbortSignal.timeout(8000) }); const j = await r.json(); return { pairs: (j.pairs || []), exact: true }; }
  const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(coin)}`, { signal: AbortSignal.timeout(8000) }); const j = await r.json();
  const want = coin.trim().toLowerCase();
  return { pairs: (j.pairs || []).filter((p) => (p.baseToken?.symbol || "").toLowerCase() === want || (p.baseToken?.name || "").toLowerCase() === want), exact: false };
}
export function startFind({ coin, usd, ago, side = "any", at = null, tolPct = 4 }) {
  const id = nextId++; const job = { id, coin, usd, ago, side, at: at || null, started: nowS(), state: "running", note: "", credits: 0, scanned: 0, candidates: [], chains: {}, pools: [] };
  jobs.set(id, job); if (jobs.size > 20) jobs.delete(jobs.keys().next().value);
  run(job, tolPct).catch((e) => { job.state = "error"; job.note = e.message; });
  return job;
}
/** The same search, awaited to completion (the batch resolver runs this in its own process, so an app reload cannot lose it). */
export async function runFind(params) { const job = startFind(params); while (job.state === "running") await new Promise((r) => setTimeout(r, 500)); return job; }
export const getFind = (id) => jobs.get(Number(id)) || null;
async function run(job, tolPct) {
  const ag = parseAgo(job.ago); if (ag == null) { job.state = "error"; job.note = "when: use e.g. 45m or 17h (as the app shows it)"; return; }
  if (ag.s >= 86400) { job.state = "done"; job.note = "trades the app labels in days are out of reach (a day or more of fomo history to walk) — use one of their trades shown in hours"; return; }
  const target = Number(job.usd); if (!(target > 0)) { job.state = "error"; job.note = "amount: a dollar figure, e.g. 9995"; return; }
  const { pairs } = await lookupCoin(job.coin);
  for (const p of pairs) job.chains[p.chainId] = (job.chains[p.chainId] || 0) + 1;
  const sol = pairs.filter((p) => p.chainId === "solana");
  if (!pairs.length) { job.state = "done"; job.note = `no coin called "${job.coin}" on DexScreener — try the mint address`; return; }
  if (!sol.length) { job.state = "done"; job.note = `"${job.coin}" is not a Solana coin here (chains: ${Object.keys(job.chains).join(", ")}). EVM wallets come with stage 2.`; return; }
  // the coin = the mints with the most 24-h volume under that symbol (copycats share names); pools = every Solana pool of those mints, busiest first
  const volByMint = new Map(); for (const p of sol) { const m = p.baseToken?.address; volByMint.set(m, (volByMint.get(m) || 0) + (p.volume?.h24 || 0)); }
  const mints = [...volByMint.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
  job.pools = sol.filter((p) => mints.includes(p.baseToken?.address)).sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0)).slice(0, 8).map((p) => ({ pool: p.pairAddress, dex: p.dexId, mint: p.baseToken?.address, symbol: p.baseToken?.symbol, vol24: Math.round(p.volume?.h24 || 0), pages: 0, inWin: 0 }));
  job.note = `Solana: ${job.pools.length} pool(s) for ${sol[0].baseToken?.symbol}${Object.keys(job.chains).length > 1 ? ` (also on ${Object.keys(job.chains).filter((c) => c !== "solana").join(", ")})` : ""}`;
  // the app's "17h" means 17–18 hours before the screenshot: the window is [age, age + one unit], with 5 minutes' margin each side
  const at = job.at || nowS(), tHi = at - ag.s + 300, tLo = at - ag.s - ag.unit - 300, tTarget = (tHi + tLo) / 2;
  // 1. the coin's transactions in the window (pool side)
  const poolSigs = new Map();
  for (const p of job.pools) {
    let before = null;
    while (p.pages < 40 && job.credits < CAP) {
      p.pages++; job.credits++; let arr; try { arr = await rpc("getSignaturesForAddress", [p.pool, { limit: 1000, ...(before ? { before } : {}) }], { budget: false, retry: true }); } catch (e) { job.note += ` · ${p.symbol}: ${e.message.slice(0, 60)}`; break; }
      if (!arr?.length) break;
      for (const x of arr) if (x.blockTime >= tLo && x.blockTime <= tHi && !x.err) { poolSigs.set(x.signature, x.blockTime); p.inWin++; }
      const last = arr[arr.length - 1]; before = last.signature; if (!last.blockTime || last.blockTime < tLo) break;
    }
  }
  job.poolInWindow = poolSigs.size;
  if (!poolSigs.size) { job.state = "done"; job.note += ` · the coin's pools show no trades in the window (${new Date(tLo * 1000).toISOString().slice(11, 16)}–${new Date(tHi * 1000).toISOString().slice(11, 16)} UTC) — wrong coin/pool, or the trade was on another chain`; return; }
  // 2. fomo's signer transactions back to the window (1 credit per 1,000 — about 26 pages an hour of age)
  let before = null, signerPages = 0, hits = []; let reached = false;
  while (signerPages < 1300 && job.credits < CAP) {
    signerPages++; job.credits++; let arr; try { arr = await rpc("getSignaturesForAddress", [CFG.SIGNER, { limit: 1000, ...(before ? { before } : {}) }], { budget: false, retry: true }); await new Promise((x) => setTimeout(x, 120)); } catch (e) { job.note += ` · signer walk: ${e.message.slice(0, 60)}`; break; }
    if (!arr?.length) break;
    for (const x of arr) if (!x.err && poolSigs.has(x.signature)) hits.push({ sig: x.signature, ts: x.blockTime });
    const last = arr[arr.length - 1]; before = last.signature; if (!last.blockTime || last.blockTime < tLo) { reached = true; break; }
    job.scanned = 0; job.signerPages = signerPages;
  }
  job.signerPages = signerPages; job.inWindow = hits.length;
  if (!reached) { job.note += ` · signer walk stopped before the window (${signerPages} pages, credit cap ${CAP})`; }
  job.note += ` · ${poolSigs.size} coin trades in the window, ${hits.length} of them fomo's`;
  // 3. read only those
  hits.sort((a, b) => Math.abs(a.ts - tTarget) - Math.abs(b.ts - tTarget));
  for (let i = 0; i < hits.length; i += 4) {
    if (job.credits >= CAP || budgetLeft() < 1000) { job.note += ` · stopped at ${job.scanned} transactions (credit cap)`; break; }
    const batch = hits.slice(i, i + 4); job.credits += batch.length; job.scanned += batch.length;
    const txs = await Promise.all(batch.map((s) => rpc("getTransaction", [s.sig, { maxSupportedTransactionVersion: 1, encoding: "jsonParsed", commitment: "confirmed" }], { budget: false, retry: true }).catch(() => null))); await new Promise((x) => setTimeout(x, 150));
    batch.forEach((s, k) => {
      const d = decodeParsed(txs[k]); if (!d || d.failed) return;
      for (const leg of d.legs) {
        if (!mints.includes(leg.mint) || (job.side !== "any" && leg.side !== job.side)) continue;
        job.seen = job.seen || []; if (job.seen.length < 12) job.seen.push(`${leg.side} $${leg.usd.toFixed(0)} ${leg.quote || "?"}/${leg.usdFrom}`);
        const off = Math.abs(leg.usd - target) / target;
        if (off <= tolPct / 100 || (leg.quote === "SOL" && off <= 0.12)) job.candidates.push({ sig: s.sig, ts: d.ts, wallet: leg.wallet, side: leg.side, usd: +leg.usd.toFixed(2), quote: leg.quote, usdFrom: leg.usdFrom, mint: leg.mint, off: +(off * 100).toFixed(1) });
      }
    });
  }
  job.candidates.sort((a, b) => a.off - b.off);
  job.state = "done"; if (!job.candidates.length) job.note += ` · no fomo ${job.side === "any" ? "trade" : job.side} of ~$${target} among them; try another trade of theirs`;
}
