// The signer firehose: every transaction that mentions fomo's signer wallet, decoded from its logs with the tracker's own
// decoders (pump.fun, PumpSwap, Raydium CPMM / CLMM / LaunchLab, Meteora DLMM, Orca). Logs are free; a pool → mint lookup costs
// 1 credit once per pool (cached in fomo.db); the buyer wallet for Raydium / Meteora / Orca legs needs getTransaction and is spent
// by budget (top coins first, then a 1-in-N sample). pump.fun and PumpSwap events carry the trader's wallet already — a sample of
// those is cross-checked against getTransaction so we know whether to trust it (fo.walletMatch / walletMismatch).
import { CFG, QUOTES, WSOL } from "./config.mjs";
import { db, q, nowS } from "./db.mjs";
import { openLogs } from "./ws.mjs";
import { solUsd, wantPrice, ensureMeta } from "./price.mjs";
import { rpc, decodeTx, budgetLeft } from "./rpc.mjs";
import { eventsFromLogs } from "../../src/pump-decoder.js";
import { pumpSwapEventsFromLogs, parsePoolAccount as psPool } from "../../src/pumpswap-decoder.js";
import { dexEventsFromLogs, parsePoolAccount as dexPool } from "../../src/dex-decoder.js";

export const fo = { notifsPublic: 0, notifsHelius: 0, heliusToday: 0, heliusDay: new Date().getUTCDate(), txs: 0, failed: 0, legs: 0, rows: 0, dupes: 0, byVenue: {}, unknownPool: 0, poolLookups: 0, poolDay: new Date().getUTCDate(), poolFails: 0, buffered: 0, dropped: 0,
  walletFromEvent: 0, walletFromTx: 0, walletMatch: 0, walletMismatch: 0, decodeRuns: 0, decodeErrors: 0, lastTx: 0, mode: "public", lastLog: "" };
const QDEC = { [WSOL]: 9, EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6, Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6 };
const quoteName = (m) => (m === WSOL ? "SOL" : m === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "USDC" : "USDT");
const usdOf = (quoteMint, amt) => (quoteMint === WSOL ? amt * solUsd() : amt);

// --- pool cache ---
const pools = new Map(); // pool -> { venue, mint, quote, mintSide, dec } | { ignore: true }
for (const r of q.allPools.all()) pools.set(r.pool, r.ignore ? { ignore: true } : { venue: r.venue, mint: r.mint, quote: r.quote, mintSide: r.mint_side, dec: r.dec });
const pending = new Map(); // pool -> { venue, evs: [{ ev, seenTs, sig, slot }] }
let poolBudgetUsed = 0, inFlight = 0; const lookupQueue = [];
function rollDays() { const d = new Date().getUTCDate(); if (d !== fo.poolDay) { fo.poolDay = d; poolBudgetUsed = 0; } if (d !== fo.heliusDay) { fo.heliusDay = d; fo.heliusToday = 0; } }
async function lookupPool(pool, venue) {
  rollDays(); if (poolBudgetUsed >= CFG.POOL_BUDGET) return;
  poolBudgetUsed++; fo.poolLookups++;
  let info = { ignore: true };
  try {
    const r = await rpc("getAccountInfo", [pool, { encoding: "base64" }], { budget: false });
    const data = r?.value?.data?.[0] || "";
    if (venue === "pumpswap") { const p = psPool(data); if (p) info = sides(venue, p.baseMint, p.quoteMint, 0); }
    else { const p = dexPool(venue, data); if (p) info = sides(venue, p.mint0, p.mint1, 1); }
  } catch (e) { fo.poolFails++; }
  pools.set(pool, info); q.insPool.run(pool, venue, info.mint || null, info.quote || null, info.mintSide ?? null, info.dec ?? null, info.ignore ? 1 : 0, nowS());
  const pend = pending.get(pool); pending.delete(pool);
  if (pend && !info.ignore) for (const x of pend.evs) { const leg = legFromEvent(x.ev, info, pool); if (leg) record(x.sig, x.slot, x.seenTs, [leg]); }
}
// which side is the coin: m0/m1 → { mint, quote, mintSide (0 = mint is m0), dec }. Both quotes or neither → ignore.
function sides(venue, m0, m1, _dexStyle) {
  const q0 = QUOTES.has(m0), q1 = QUOTES.has(m1);
  if (q0 === q1) return { ignore: true };
  return q1 ? { venue, mint: m0, quote: m1, mintSide: 0, dec: null } : { venue, mint: m1, quote: m0, mintSide: 1, dec: null };
}
function drainLookups() { while (inFlight < 2 && lookupQueue.length) { const [pool, venue] = lookupQueue.shift(); inFlight++; lookupPool(pool, venue).catch(() => {}).finally(() => { inFlight--; drainLookups(); }); } }
function needPool(pool, venue, ev, sig, slot, seenTs) {
  let p = pending.get(pool);
  if (!p) { p = { venue, evs: [] }; pending.set(pool, p); if (pending.size > 3000) { const k = pending.keys().next().value; pending.delete(k); fo.dropped++; } lookupQueue.push([pool, venue]); drainLookups(); }
  if (p.evs.length < 200) { p.evs.push({ ev, seenTs, sig, slot }); fo.buffered++; } else fo.dropped++;
}

// --- one leg from one venue event (null = not a coin trade we can read) ---
function legFromEvent(ev, info, pool) {
  if (!info || info.ignore) return null;
  const qd = QDEC[info.quote] ?? 9;
  const gen = (inMint, outMint, amountIn, amountOut, wallet) => { // generic in/out form
    if (QUOTES.has(inMint) && !QUOTES.has(outMint)) return { mint: outMint, side: "buy", quote: quoteName(inMint), quoteAmt: Number(amountIn) / 10 ** (QDEC[inMint] ?? 9), usd: usdOf(inMint, Number(amountIn) / 10 ** (QDEC[inMint] ?? 9)), tokens: null, rawTokens: amountOut, venue: ev.venue, pool, wallet: wallet || null };
    if (QUOTES.has(outMint) && !QUOTES.has(inMint)) return { mint: inMint, side: "sell", quote: quoteName(outMint), quoteAmt: Number(amountOut) / 10 ** (QDEC[outMint] ?? 9), usd: usdOf(outMint, Number(amountOut) / 10 ** (QDEC[outMint] ?? 9)), tokens: null, rawTokens: amountIn, venue: ev.venue, pool, wallet: wallet || null };
    return null;
  };
  if (ev.venue === "pumpswap") { const amt = Number(ev.userQuote) / 10 ** qd; return { mint: info.mint, side: ev.isBuy ? "buy" : "sell", quote: quoteName(info.quote), quoteAmt: amt, usd: usdOf(info.quote, amt), tokens: Number(ev.baseAmt) / 1e6, rawTokens: ev.baseAmt, venue: "pumpswap", pool, wallet: ev.user || null }; }
  const m0 = info.mintSide === 0 ? info.mint : info.quote, m1 = info.mintSide === 0 ? info.quote : info.mint;
  if (ev.venue === "raydium-cpmm") { if (ev.inMint && ev.outMint) return gen(ev.inMint, ev.outMint, ev.amountIn, ev.amountOut, null); return ev.baseInput ? gen(m0, m1, ev.amountIn, ev.amountOut, null) : gen(m1, m0, ev.amountIn, ev.amountOut, null); }
  if (ev.venue === "raydium-clmm") return ev.zeroForOne ? gen(m0, m1, ev.amount0, ev.amount1, ev.wallet) : gen(m1, m0, ev.amount1, ev.amount0, ev.wallet);
  if (ev.venue === "raydium-launchlab") return ev.isBuy ? gen(m1, m0, ev.amountIn, ev.amountOut, null) : gen(m0, m1, ev.amountIn, ev.amountOut, null); // base = m0, quote = m1
  if (ev.venue === "meteora-dlmm") return ev.swapForY ? gen(m0, m1, ev.amountIn, ev.amountOut, ev.wallet) : gen(m1, m0, ev.amountIn, ev.amountOut, ev.wallet);
  if (ev.venue === "orca") return ev.aToB ? gen(m0, m1, ev.amountIn, ev.amountOut, null) : gen(m1, m0, ev.amountIn, ev.amountOut, null);
  return null;
}

// --- a transaction's logs → legs ---
export function legsFromLogs(logs, sig, slot, seenTs) {
  const legs = [];
  for (const e of eventsFromLogs(logs)) if (e.type === "trade") { const sol = Number(e.sol) / 1e9; legs.push({ mint: e.mint, side: e.isBuy ? "buy" : "sell", quote: "SOL", quoteAmt: sol, usd: sol * solUsd(), tokens: Number(e.tokens) / 1e6, venue: "pump", pool: null, wallet: e.user || null }); }
  for (const e of pumpSwapEventsFromLogs(logs)) if (e.type === "buy" || e.type === "sell") { const ev = { ...e, venue: "pumpswap" }; const info = pools.get(e.pool); if (!info) { fo.unknownPool++; needPool(e.pool, "pumpswap", ev, sig, slot, seenTs); continue; } const leg = legFromEvent(ev, info, e.pool); if (leg) legs.push(leg); }
  for (const e of dexEventsFromLogs(logs)) { const info = pools.get(e.pool); if (!info) { if (!(e.venue === "raydium-cpmm" && e.inMint && e.outMint)) { fo.unknownPool++; needPool(e.pool, e.venue, e, sig, slot, seenTs); continue; } } const leg = legFromEvent(e, info || { venue: e.venue, mintSide: 0, mint: null, quote: null }, e.pool); if (leg) legs.push(leg); }
  return legs;
}
// --- store: one row per (mint, side) per transaction, legs summed ---
const sampleCounter = { n: 0 };
export function record(sig, slot, ts, legs) {
  if (!legs.length) return 0;
  if (q.seenSig.get(sig)) { fo.dupes++; return 0; }
  const agg = new Map();
  for (const l of legs) { const k = l.mint + "|" + l.side; const a = agg.get(k); if (a) { a.usd += l.usd; a.quoteAmt += l.quoteAmt; if (l.tokens) a.tokens = (a.tokens || 0) + l.tokens; a.wallet ||= l.wallet; } else agg.set(k, { ...l }); }
  const hour = Math.floor(ts / 3600) * 3600; let n = 0;
  const tx = db.transaction(() => {
    for (const a of agg.values()) {
      if (!(a.usd >= 0)) continue;
      q.insFlow.run(sig, slot, ts, a.mint, a.side, a.usd, a.quote, a.quoteAmt, a.tokens ?? null, a.venue, a.pool, a.wallet, 0);
      q.bumpHour.run(a.mint, hour, a.side === "buy" ? 1 : 0, a.side === "sell" ? 1 : 0, a.side === "buy" ? a.usd : 0, a.side === "sell" ? a.usd : 0);
      q.upCoin.run(a.mint, ts);
      if (a.wallet) { fo.walletFromEvent++; if (a.side === "buy") q.insBuyer.run(a.mint, a.wallet, ts); }
      fo.byVenue[a.venue] = (fo.byVenue[a.venue] || 0) + 1; n++;
    }
  });
  tx(); fo.rows += n; fo.lastTx = ts;
  for (const fn of txListeners) { try { fn(sig, slot, ts, [...agg.values()]); } catch (e) { console.error("[flow listener]", e.message); } }
  return n;
}
const txListeners = []; export const onFlow = (fn) => txListeners.push(fn);

// --- the firehose sockets: public first; Helius when the public one goes quiet (capped per day, in case Helius bills notifications) ---
let pub = null, hel = null;
function handle(src) { return ({ sig, slot, logs, err }) => {
  if (src === "public") fo.notifsPublic++; else { fo.notifsHelius++; rollDays(); fo.heliusToday++; }
  if (err) { fo.failed++; return; }
  fo.txs++; const ts = nowS();
  try { const legs = legsFromLogs(logs, sig, slot, ts); fo.legs += legs.length; if (legs.length) record(sig, slot, ts, legs); } catch (e) { fo.lastLog = e.message; }
}; }
export function startFlow() {
  const log = (who) => (s) => { fo.lastLog = `${who}: ${s}`; console.log(`[flow ${who}]`, s); };
  const addresses = () => [CFG.SIGNER];
  const helUrl = CFG.HELIUS_KEY ? `wss://mainnet.helius-rpc.com/?api-key=${CFG.HELIUS_KEY}` : null;
  if (CFG.WS_MODE === "helius" && helUrl) { hel = openLogs({ url: helUrl, label: "helius", addresses, onTx: handle("helius"), onStatus: log("helius") }); fo.mode = "helius"; }
  else { pub = openLogs({ url: CFG.PUBLIC_WS, label: "public", addresses, onTx: handle("public"), onStatus: log("public") }); fo.mode = "public"; }
  if (CFG.WS_MODE === "auto" && helUrl) setInterval(() => {
    rollDays();
    const quiet = !pub || Date.now() - pub.lastMsg() > 120_000;
    if (quiet && !hel && fo.heliusToday < CFG.HELIUS_NOTIF_CAP) { hel = openLogs({ url: helUrl, label: "helius", addresses, onTx: handle("helius"), onStatus: log("helius") }); fo.mode = "public+helius"; console.log("[flow] public socket quiet — Helius firehose on"); }
    if (hel && (!quiet && Date.now() - pub.lastMsg() < 30_000 || fo.heliusToday >= CFG.HELIUS_NOTIF_CAP)) { hel.close(); hel = null; fo.mode = "public"; console.log("[flow] Helius firehose off"); }
  }, 60_000).unref();
  // buyer-wallet decoding: top coins first (exact unique buyers), then a 1-in-N sample; cross-check of event wallets
  setInterval(() => decodeRun().catch((e) => { fo.decodeErrors++; fo.lastLog = "decode: " + e.message; }), 5000).unref();
  // metadata for the coins on the table
  setInterval(() => { try { for (const m of q.topMints1h.all(nowS() - 3600, 60)) { wantPrice(m, 900); ensureMeta(m, 300).catch(() => {}); } } catch (e) { console.error("[flow meta]", e.message); } }, 30_000).unref();
  // housekeeping: raw rows FLOW_KEEP_D days, hourly 90 days, prices 2 days, buyers 30 days; pending pools that never resolved
  setInterval(() => { try { const n = nowS(); q.pruneFlow.run(n - CFG.FLOW_KEEP_D * 86400); q.pruneHourly.run(n - 90 * 86400); q.prunePrices.run(n - 2 * 86400); q.pruneBuyers.run(n - 30 * 86400); } catch (e) { console.error("[flow prune]", e.message); } }, 3600_000).unref();
}
export const flowSockets = () => ({ public: pub?.st || null, helius: hel?.st || null, pendingPools: pending.size, poolBudgetUsed, poolBudget: CFG.POOL_BUDGET });
let decoding = false;
async function decodeRun() {
  if (decoding) return; decoding = true; fo.decodeRuns++;
  try {
    // keep a fifth of the day's budget for the watched wallets (they matter more than exact firehose counts)
    if (budgetLeft() < CFG.DECODE_BUDGET * 0.2) return;
    const top = q.topMints1h.all(nowS() - 3600, CFG.TOP_N_FULL); while (top.length < 40) top.push("-"); // the prepared statement takes 40 slots
    const rows = q.undecoded.all(nowS() - 3600, ...top.slice(0, 40), 12);
    for (const r of rows) await decodeOne(r.sig, r.mint, "top");
    // the sample: 1-in-N of the rest, and a cross-check of event wallets
    const extra = db.prepare(`SELECT sig, mint, wallet FROM flow WHERE decoded=0 AND ts>=? ORDER BY ts DESC LIMIT 60`).all(nowS() - 600);
    let n = 0; for (const r of extra) { sampleCounter.n++; if (sampleCounter.n % CFG.SAMPLE_1_IN) continue; if (n++ >= 6) break; await decodeOne(r.sig, r.mint, r.wallet ? "check" : "sample", r.wallet); }
  } finally { decoding = false; }
}
async function decodeOne(sig, mint, why, eventWallet = null) {
  let t; try { t = await decodeTx(sig); } catch (e) { fo.decodeErrors++; return; }
  if (!t) return; const leg = (t.legs || []).find((l) => l.mint === mint);
  if (!leg) { q.setDecoded.run(sig); return; }
  if (eventWallet) { if (eventWallet === leg.wallet) fo.walletMatch++; else fo.walletMismatch++; }
  q.setWallet.run(leg.wallet, sig); fo.walletFromTx++;
  if (leg.side === "buy") q.insBuyer.run(mint, leg.wallet, t.ts || nowS());
  if (leg.dec != null) q.setCoinDec.run(leg.dec, mint);
}
