// launcher 0.8.15 (owner, 5 Nov 2026 01:04 UK, after Codex's second opinion: "measure executable quotes now, not after a book passes 40 trades"):
// QUOTE SHADOWING. Nothing is sent. At the moment a rule books a paper entry we ask Jupiter for a real swap quote (0.2 SOL → the coin) and keep
// the price it would have filled at next to the chain price the paper book used; when the live mark says the 40% trail would have sold we ask for the
// sell quote (those tokens → SOL) and keep it next to the paper exit. A sample of launches that passed a check but entered no book is quoted too,
// so the fill cost of the coins we avoid is known as well. The gap between paper and quote is the thing every paper number depends on.
// Jupiter's public quote API (no key) routes pump.fun curve coins and PumpSwap pools; the quote includes price impact for the size asked.
// 0.8.16: the keyless tier is 30 requests a minute (60-s sliding window); a 429 pauses every quote until x-ratelimit-reset (or 15 s), and the
// open-position poller (volpaper volQuotePoll) spends at most one request every 3 s so entries and exits keep their share.
export const qStat = { buys: 0, sells: 0, samples: 0, polls: 0, pollExits: 0, paused: 0, errors: 0, lastErr: "", lastMs: 0, pauseUntil: 0 };
const SOL = "So11111111111111111111111111111111111111112", HOST = process.env.LAUNCH_JUP_HOST || "https://lite-api.jup.ag";
async function jq(inputMint, outputMint, amount) {
  if (Date.now() < qStat.pauseUntil) { qStat.paused++; throw new Error("jup paused (429)"); }
  const t0 = Date.now();
  const u = `${HOST}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=1000&onlyDirectRoutes=false`;
  const r = await fetch(u, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
  if (r.status === 429) { const rs = Number(r.headers.get("x-ratelimit-reset")) || 0; qStat.pauseUntil = rs > 1e9 ? rs * 1000 : Date.now() + 15000; throw new Error("jup 429 rate limit"); }
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { throw new Error(`jup HTTP ${r.status}`); }
  if (!r.ok || j.error) throw new Error(`jup ${r.status} ${(j.error || j.errorCode || "").toString().slice(0, 60)}`);
  qStat.lastMs = Date.now() - t0;
  return { out: Number(j.outAmount), impact: Number(j.priceImpactPct) || 0, route: (j.routePlan || []).map((p) => p?.swapInfo?.label).filter(Boolean).join(">").slice(0, 40), ms: Date.now() - t0 };
}
/** buy quote: lamports of SOL in → raw tokens out (6 decimals on pump.fun coins). Returns the SOL price per token implied by the fill. */
export async function buyQuote(mint, lamports) {
  const q = await jq(SOL, mint, lamports);
  if (!(q.out > 0)) throw new Error("jup empty");
  return { tokens: q.out, pxSol: (lamports / 1e9) / (q.out / 1e6), impact: q.impact, route: q.route, ms: q.ms };
}
/** sell quote: raw tokens in → lamports out */
export async function sellQuote(mint, tokens) {
  const q = await jq(mint, SOL, Math.floor(tokens));
  if (!(q.out > 0)) throw new Error("jup empty");
  return { lamports: q.out, impact: q.impact, route: q.route, ms: q.ms };
}
