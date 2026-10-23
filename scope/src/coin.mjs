// v0.18.184 (owner, 23 Oct 12:48 UK: "a website where I can paste in the contract… the initial bundles and all the information initially, the current
// information, the top 10 wallets… a full diagnosis of the coin"). One lookup = one report: the launch (bundle, dev, snipers — from our database when
// the tracker saw the launch, and rebuilt from the chain either way), what those wallets did since (held / sold / sold and bought back / moved out),
// the coin now (price, MC, holders, top 20 with labels), fresh-wallet share and shared funders, every book that traded it, and a plain-English diagnosis.
// Read-only. Its own call counter and daily budget (COIN_RPC_DAILY, default 30000) on the Helius URL, so a lookup never touches the bots' RPC budget.
import { createHash } from "node:crypto";
import "./env.mjs";
import Database from "better-sqlite3";
// Reads the tracker's database read-only (launch facts, checkpoints, books) when it is there; works without it.
let db = null; try { db = new Database(process.env.TRACKER_DB || "/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); } catch (e) { console.log("[scope] tracker database not available:", e.message); }
const HELIUS = () => process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : (process.env.SCOPE_RPC_URL || "");
const A58E = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58(buf) { const d = []; for (const b of buf) { let c = b; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c > 0) { d.push(c % 58); c = (c / 58) | 0; } }
  let s = ""; for (const b of buf) { if (b === 0) s += "1"; else break; } for (let i = d.length - 1; i >= 0; i--) s += A58E[d[i]]; return s; }
function solUsdNow() { try { const r = db?.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get(); if (r?.usd > 0) return r.usd; } catch {} return null; }

const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", WSOL = "So11111111111111111111111111111111111111112";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const DAILY = Number(process.env.SCOPE_RPC_DAILY || 150000), PER_LOOKUP = Number(process.env.SCOPE_RPC_LOOKUP || 3000);
export const coinStat = { lookups: 0, calls: 0, day: new Date().getUTCDate(), lastMs: 0, lastErr: "" };

// ---------- base58 decode + program-derived addresses (no web3 library in the tracker) ----------
const A58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function unb58(s) {
  const out = []; for (const ch of s) { let c = A58.indexOf(ch); if (c < 0) throw new Error("not base58");
    for (let j = 0; j < out.length; j++) { c += out[j] * 58; out[j] = c & 255; c >>= 8; } while (c > 0) { out.push(c & 255); c >>= 8; } }
  for (const ch of s) { if (ch === "1") out.push(0); else break; }
  return Buffer.from(out.reverse());
}
const P = 2n ** 255n - 19n, md = (a) => { a %= P; return a < 0n ? a + P : a; };
const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = (r * b) % P; b = (b * b) % P; e >>= 1n; } return r; };
const DC = md(-121665n * pw(121666n, P - 2n));
function onCurve(buf) { // ed25519 point decompression check — a PDA is the first bump whose hash is NOT a valid point
  const b = Buffer.from(buf); b[31] &= 0x7f; let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(b[i]);
  if (y >= P) return false; const y2 = (y * y) % P, u = md(y2 - 1n), v = md(DC * y2 + 1n), x2 = (u * pw(v, P - 2n)) % P;
  return x2 === 0n || pw(x2, (P - 1n) / 2n) === 1n;
}
const seedBuf = (s) => (Buffer.isBuffer(s) ? s : s.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s) ? unb58(s) : Buffer.from(s));
export function pda(seeds, program) {
  const pg = unb58(program);
  for (let bump = 255; bump >= 0; bump--) {
    const h = createHash("sha256"); for (const s of seeds) h.update(seedBuf(s)); h.update(Buffer.from([bump])); h.update(pg); h.update(Buffer.from("ProgramDerivedAddress"));
    const d = h.digest(); if (!onCurve(d)) return bs58(d);
  }
  throw new Error("no PDA");
}
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export const curveOf = (mint) => pda(["bonding-curve", mint], PUMP);
export const poolOf = (mint) => pda([Buffer.from("pool"), u16(0), unb58(pda(["pool-authority", mint], PUMP)), unb58(mint), unb58(WSOL)], AMM);
export const ataOf = (owner, mint, tokenProg = TOKEN) => pda([unb58(owner), unb58(tokenProg), unb58(mint)], ATA_PROG);

// ---------- calls (own counter, own budget) ----------
const URL_ = HELIUS;
let used = 0;
function charge(method, n = 1) {
  const d = new Date().getUTCDate(); if (d !== coinStat.day) { coinStat.day = d; coinStat.calls = 0; }
  if (coinStat.calls + n > DAILY) throw new Error(`coin lookup budget used up today (${DAILY} calls)`);
  if (used + n > PER_LOOKUP) throw new Error(`this lookup hit its ${PER_LOOKUP}-call cap`);
  coinStat.calls += n; used += n;
}
// 0.2.1: Helius answered "Too Many Requests" to the first real lookup (23 Oct 19:24 UK). Every request now goes through a rate limiter
// (SCOPE_RPS items a second, default 10 — the bots share this Helius key, so the coin site must never crowd them out), batches are small,
// and a 429 or a non-JSON reply waits and retries (1, 2, 4, 8, 16 s) instead of failing the lookup.
const RPS = Number(process.env.SCOPE_RPS || 12); let tokens = RPS, lastFill = Date.now();
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
async function take(n) { for (;;) { const now = Date.now(); tokens = Math.min(RPS, tokens + ((now - lastFill) / 1000) * RPS); lastFill = now; if (tokens >= Math.min(n, RPS)) { tokens -= n; return; } await nap(Math.ceil(((Math.min(n, RPS) - tokens) / RPS) * 1000) + 20); } }
async function post(body, n, timeout) {
  let wait = 1000, last = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    await take(n);
    try { const r = await fetch(URL_(), { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(timeout) }); const text = await r.text();
      if (r.status === 429 || !/^\s*[[{]/.test(text)) { last = `HTTP ${r.status}: ${text.slice(0, 60)}`; coinStat.throttled = (coinStat.throttled || 0) + 1; await nap(wait + Math.random() * 300); wait *= 2; continue; }
      return JSON.parse(text);
    } catch (e) { last = e.message; await nap(wait); wait *= 2; }
  }
  throw new Error("Helius is busy (" + last + ") — try again in a minute");
}
async function call(method, params) {
  charge(method);
  const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), 1, 15000);
  if (j.error) throw new Error(`${method}: ${j.error.message || JSON.stringify(j.error).slice(0, 80)}`); return j.result;
}
// 0.2.2: no JSON-RPC batches by default — Helius rate-limited the batched form at once (23 Oct 19:24 UK) while single requests from the bots ran clean.
// Each item is its own request, five in flight at a time, all through the rate limiter. SCOPE_BATCH=n turns batching back on.
const BATCH = Number(process.env.SCOPE_BATCH || 1);
async function batch(method, list, size = BATCH) {
  const out = new Array(list.length).fill(null);
  if (size <= 1) { let next = 0, done = 0;
    await Promise.all(Array.from({ length: Math.min(5, list.length) }, async () => { while (next < list.length) { const i = next++; try { out[i] = await call(method, list[i]); } catch (e) { if (/budget|cap|busy/.test(e.message)) throw e; } done++; if (stageCb && done % 10 === 0) stageCb(done, list.length); } }));
    return out; }
  for (let i = 0; i < list.length; i += size) {
    const part = list.slice(i, i + size); charge(method, part.length);
    const j = await post(JSON.stringify(part.map((p, k) => ({ jsonrpc: "2.0", id: k, method, params: p }))), part.length, 30000); const arr = Array.isArray(j) ? j : [];
    const byId = new Map(arr.map((x) => [x.id, x.result ?? null])); for (let k = 0; k < part.length; k++) out[i + k] = byId.get(k) ?? null;
    if (stageCb) stageCb(i + part.length, list.length);
  }
  return out;
}
let stageCb = null; const stage = (txt) => { coinStat.stage = txt; stageCb = (a, b) => { coinStat.stage = `${txt} (${a} of ${b})`; }; };
const TX = (sig) => [sig, { maxSupportedTransactionVersion: 0, encoding: "json", commitment: "confirmed" }];

// ---------- transaction reading ----------
const keysOf = (tx) => [...(tx?.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey)), ...(tx?.meta?.loadedAddresses?.writable || []), ...(tx?.meta?.loadedAddresses?.readonly || [])];
/** per-owner change of this mint's balance (raw units) and SOL change (lamports) in one transaction */
function deltas(tx, mint) {
  const pre = new Map(), post = new Map();
  for (const b of tx?.meta?.preTokenBalances || []) if (b.mint === mint) pre.set(b.owner, (pre.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount));
  for (const b of tx?.meta?.postTokenBalances || []) if (b.mint === mint) post.set(b.owner, (post.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount));
  const keys = keysOf(tx), solPre = tx?.meta?.preBalances || [], solPost = tx?.meta?.postBalances || [], out = new Map();
  for (const o of new Set([...pre.keys(), ...post.keys()])) {
    const d = (post.get(o) || 0n) - (pre.get(o) || 0n); if (d === 0n) continue;
    const i = keys.indexOf(o); out.set(o, { tok: d, sol: i >= 0 ? (solPost[i] || 0) - (solPre[i] || 0) : null });
  }
  return { out, payer: keys[0], ts: tx?.blockTime, slot: tx?.slot, err: tx?.meta?.err };
}

async function allSigs(addr, maxPages) { // newest first; walks back to the oldest (or the page cap)
  let before, all = [], done = false;
  for (let p = 0; p < maxPages; p++) {
    const page = await call("getSignaturesForAddress", [addr, { limit: 1000, ...(before ? { before } : {}) }]);
    all = all.concat(page); if (page.length < 1000) { done = true; break; } before = page[page.length - 1].signature;
  }
  return { sigs: all, complete: done };
}
async function walletAge(w, anyAge = false) { // first transaction time, funder of a young wallet (any age when asked: the dev)
  const s = await call("getSignaturesForAddress", [w, { limit: 1000 }]);
  if (!s.length) return { firstTs: null, txs: 0 };
  if (s.length >= 1000) return { firstTs: null, txs: 1000, old: true };
  const first = s[s.length - 1], info = { firstTs: first.blockTime, txs: s.length };
  if (anyAge || Date.now() / 1000 - first.blockTime < 7 * 86400) { try { const tx = await call("getTransaction", TX(first.signature)); const keys = keysOf(tx), pre = tx?.meta?.preBalances || [], post = tx?.meta?.postBalances || [];
    let best = null, drop = 0; for (let i = 0; i < keys.length; i++) { const d = (pre[i] || 0) - (post[i] || 0); if (keys[i] !== w && d > drop) { drop = d; best = keys[i]; } } info.funder = best; info.fundedSol = drop / 1e9; } catch {} }
  return info;
}

// ---------- the report ----------
// 0.2.0 (owner, 23 Oct 17:17 UK): the centre is the first two minutes — every wallet that bought after the dev and the bundle, what each holds now,
// which are fresh, which are the same person (grouped), and who holds the supply; plus a live refresh (/api/live) that re-reads balances and new trades.
const WINDOW_S = Number(process.env.SCOPE_WINDOW_S || 120), FIRST_N = Number(process.env.SCOPE_FIRST_N || 60), FRESH = 86400;
const cache = new Map(), jobs = new Map(); let chain = Promise.resolve(), current = null;
// 0.2.1: a lookup runs as a background job (one at a time); /api/coin answers at once with {pending, stage} until the report is ready
export async function coinReport(mint, force = false) {
  mint = String(mint || "").trim();
  try { if (unb58(mint).length !== 32) throw 0; } catch { return { ok: false, error: "that is not a Solana address" }; }
  const c = cache.get(mint); if (!force && c && Date.now() - c.at < 120_000) return c.r;
  const j = jobs.get(mint);
  if (j) { if (j.done) { jobs.delete(mint); return j.r; } return { ok: false, pending: true, stage: current === mint ? coinStat.stage || "starting" : "waiting for another lookup to finish", elapsed: Math.round((Date.now() - j.t0) / 1000) }; }
  const job = { t0: Date.now(), done: false }; jobs.set(mint, job);
  chain = chain.then(async () => { current = mint; used = 0; coinStat.lookups++; coinStat.stage = "starting"; const t0 = Date.now();
    const r = await build(mint).catch((e) => ({ ok: false, error: e.message })); r.calls = used; r.ms = Date.now() - t0; coinStat.lastMs = r.ms; if (!r.ok) coinStat.lastErr = r.error;
    if (r.ok) { cache.set(mint, { at: Date.now(), r }); if (cache.size > 100) cache.delete(cache.keys().next().value); }
    job.r = r; job.done = true; current = null; coinStat.stage = ""; setTimeout(() => { if (jobs.get(mint) === job) jobs.delete(mint); }, 600_000).unref(); });
  return { ok: false, pending: true, stage: "starting", elapsed: 0 };
}

const BOOK = { grf: "GR (GR2 if a bundle launch)", sn8: "S8 (BL if a bundle launch)", p5e30: "A (AS if it passed)", grad: "every graduation", momentum: "E momentum", k: "K", sn3: "S3", sn4: "S4", gradrec: "gradrec", early: "early" };
const one = (sql, ...a) => { try { return db ? db.prepare(sql).get(...a) : null; } catch { return null; } };
const all = (sql, ...a) => { try { return db ? db.prepare(sql).all(...a) : []; } catch { return []; } };
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
async function balances(wallets, mint, tokenProg, pctOf) { // current holding of each wallet (its associated token account), 100 per call
  const out = new Map();
  for (const part of chunks(wallets, 100)) { const atas = part.map((w) => ataOf(w, mint, tokenProg)); const v = (await call("getMultipleAccounts", [atas, { encoding: "jsonParsed" }])).value;
    part.forEach((w, i) => { const a = v[i]?.data?.parsed?.info?.tokenAmount; out.set(w, a ? pctOf(BigInt(a.amount)) : 0); }); }
  return out;
}
async function venueNow(mint, dec, supply, tokenProg, curve, pool) { // price from the curve or the pool, now
  const [cv] = (await call("getMultipleAccounts", [[curve], { encoding: "base64" }])).value;
  let complete = null, creator = null, priceSol = null, venue = "unknown", progress = null, poolSol = null;
  if (cv) { const b = Buffer.from(cv.data[0], "base64");
    if (b.length >= 49) { const vTok = b.readBigUInt64LE(8), vSol = b.readBigUInt64LE(16); complete = b[48] === 1; if (b.length >= 81) creator = bs58(b.subarray(49, 81));
      if (!complete && vTok > 0n) { priceSol = (Number(vSol) / 1e9) / (Number(vTok) / 10 ** dec); venue = "bonding curve"; progress = Math.min(100, (Number(b.readBigUInt64LE(32)) / 1e9 / 85) * 100); } } }
  if (complete !== false) { const [pa, pb] = (await call("getMultipleAccounts", [[ataOf(pool, mint, tokenProg), ataOf(pool, WSOL, TOKEN)], { encoding: "jsonParsed" }])).value;
    const base = Number(pa?.data?.parsed?.info?.tokenAmount?.uiAmount || 0), quote = Number(pb?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    if (base > 0 && quote > 0) { priceSol = quote / base; venue = "PumpSwap pool"; poolSol = quote; } }
  return { cv: !!cv, complete, creator, priceSol, venue, progress, poolSol };
}
function readTrades(txs, mint, skip) { // every wallet's change in this coin per transaction
  const out = [];
  for (const tx of txs) { if (!tx || tx.meta?.err) continue; const d = deltas(tx, mint), sig = tx.transaction?.signatures?.[0];
    const moves = [...d.out.entries()].filter(([o]) => !skip.has(o));
    for (const [o, v] of moves) { const solMove = v.sol ?? 0, kind = v.tok > 0n ? (solMove < -2e6 ? "buy" : "in") : (solMove > 2e6 ? "sell" : "out");
      const other = kind === "in" || kind === "out" ? moves.find(([o2, v2]) => o2 !== o && (v.tok < 0n ? v2.tok > 0n : v2.tok < 0n))?.[0] || null : null;
      out.push({ wallet: o, slot: d.slot, ts: d.ts, tok: v.tok, sol: solMove, kind, other, sig }); } }
  return out;
}

async function build(mint) {
  const R = { ok: true, mint, now: Math.floor(Date.now() / 1000), notes: [], windowS: WINDOW_S }; let solUsd = solUsdNow();
  if (!HELIUS()) return { ok: false, error: "no Helius key on the box (HELIUS_API_KEY in /root/tracker/.env)" };

  // 1. our database (only coins the tracker saw)
  const tok = one(`SELECT * FROM tokens WHERE mint=?`, mint);
  R.db = tok ? { seen: true, name: tok.name, symbol: tok.symbol, creator: tok.creator, create_ts: tok.create_ts, bundle_pct: tok.bundle_pct, bundle_sol: tok.bundle_sol, bundle_wallets: tok.bundle_wallets, dev_buy_sol: tok.dev_buy_sol, tier: tok.tier, factory: tok.factory,
    has_socials: tok.has_socials, outside_buyers: tok.outside_buyers, creator_age_s: tok.creator_age_s, creator_funded_sol: tok.creator_funded_sol, creator_fee_sol: tok.creator_fee_sol, peak_mc_usd: tok.peak_mc_usd, graduated: tok.graduated } : { seen: false };
  if (tok?.creator) R.db.creatorHistory = one(`SELECT COUNT(*) n, SUM(CASE WHEN graduated=1 THEN 1 ELSE 0 END) grads, MAX(peak_mc_usd) best, SUM(CASE WHEN create_ts>? THEN 1 ELSE 0 END) n24 FROM tokens WHERE creator=? AND mint<>?`, R.now - 86400, tok.creator, mint);
  R.db.life = all(`SELECT cp, mc, holders, top10_pct, buyers_total, vol5m_usd FROM token_life WHERE mint=? ORDER BY cp`, mint);
  R.books = all(`SELECT * FROM paper_trades WHERE mint=? ORDER BY entry_ts`, mint).map((b) => ({ book: BOOK[b.strategy] || b.strategy, entry_ts: b.entry_ts, entry_mc: b.entry_mc, peak_mult: b.peak_mult, x_tsl40: b.x_tsl40, x_h3: b.x_h3, holders_entry: b.holders_entry, top10_entry: b.top10_entry }));

  // 2. the token
  const mi = await call("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  if (!mi?.value) return { ok: false, error: "no such token on Solana (the mint account does not exist)" };
  const info = mi.value.data?.parsed?.info || {}, tokenProg = mi.value.owner, dec = Number(info.decimals ?? 6), supply = Number(BigInt(info.supply || 0)) / 10 ** dec;
  const pctOf = (raw) => (supply > 0 ? (Number(raw) / 10 ** dec / supply) * 100 : null);
  R.token = { decimals: dec, supply, program: tokenProg === TOKEN ? "SPL Token" : "Token-2022", mintAuthority: info.mintAuthority || null, freezeAuthority: info.freezeAuthority || null };
  const curve = curveOf(mint), pool = poolOf(mint), poolAuth = pda(["pool-authority", mint], PUMP), skip = new Set([curve, pool, poolAuth]);
  const V = await venueNow(mint, dec, supply, tokenProg, curve, pool);
  R.curveProgress = V.progress; R.nowMarket = { venue: V.venue, priceSol: V.priceSol, mcUsd: null, graduated: V.complete, pool, curve, poolSol: V.poolSol };
  if (!V.cv) R.notes.push("Not a pump.fun coin (no bonding curve): the launch section is skipped; holders and the now section still work.");

  // 3. DexScreener (free, from the box)
  try { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) }); const j = await r.json();
    const p = (j.pairs || []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (p) { R.dex = { dex: p.dexId, mc: p.marketCap || p.fdv, liq: p.liquidity?.usd, vol24: p.volume?.h24, vol1h: p.volume?.h1, ch5m: p.priceChange?.m5, ch1h: p.priceChange?.h1, ch6h: p.priceChange?.h6, ch24: p.priceChange?.h24,
      buys24: p.txns?.h24?.buys, sells24: p.txns?.h24?.sells, name: p.baseToken?.name, symbol: p.baseToken?.symbol, links: [...(p.info?.websites || []).map((w) => w.url), ...(p.info?.socials || []).map((s) => s.url)] };
      if (!solUsd && Number(p.priceNative) > 0 && Number(p.priceUsd) > 0) solUsd = Number(p.priceUsd) / Number(p.priceNative); } } catch {}
  R.solUsd = solUsd; if (V.priceSol && solUsd) R.nowMarket.mcUsd = V.priceSol * supply * solUsd;
  const mcAt = (solAbs, tokRaw) => (solUsd && tokRaw > 0 ? (solAbs / (tokRaw / 10 ** dec)) * supply * solUsd : null);

  stage("the launch: the dev, the bundle and the first buyers");
  // 4. the launch: every trade in the first WINDOW_S seconds, from the curve's oldest transactions
  let L = null; const W = new Map(); // wallet -> profile
  const prof = (w) => { let p = W.get(w); if (!p) { p = { wallet: w, role: null, boughtRaw: 0n, solIn: 0, firstTs: null, firstSlot: null, inWindow: false, nowPct: null, ev: [] }; W.set(w, p); } return p; };
  if (V.cv) {
    const { sigs, complete: reached } = await allSigs(curve, 30);
    if (!reached) R.notes.push("The bonding curve had more than 30,000 transactions, so the launch could not be rebuilt from the chain" + (tok ? "; the tracker's launch figures are shown." : "."));
    else if (sigs.length) {
      const asc = sigs.filter((s) => !s.err).reverse(), slot0 = asc[0].slot, t0 = asc[0].blockTime;
      // 0.3.0 (owner, 23 Oct 19:34 UK: "the first maybe 60 wallets"): read the launch in order until FIRST_N buyers after the dev and the bundle are found (at most 400 transactions)
      const creator0 = V.creator || tok?.creator || null, firstBuyers = new Set(); let txs = [], idx = 0;
      while (idx < asc.length && idx < 400 && firstBuyers.size < FIRST_N) { const part = asc.slice(idx, idx + 40); idx += part.length; const got = await batch("getTransaction", part.map((s) => TX(s.signature))); txs = txs.concat(got);
        for (const t of readTrades(got, mint, skip)) if (t.kind === "buy" && t.slot !== slot0 && t.wallet !== creator0) firstBuyers.add(t.wallet); coinStat.stage = `the launch: ${Math.min(firstBuyers.size, FIRST_N)} of the first ${FIRST_N} buyers found`; }
      const early = asc.slice(0, idx);
      const creator = V.creator || tok?.creator || keysOf(txs.find(Boolean))[0], createTs = txs.find(Boolean)?.blockTime || t0;
      for (const t of readTrades(txs, mint, skip)) { const p = prof(t.wallet); p.inWindow = true;
        if (p.firstSlot == null) { p.firstSlot = t.slot; p.firstTs = t.ts; }
        if (t.kind === "buy" && p.firstBuySlot == null) p.firstBuySlot = t.slot;
        if (t.kind === "buy" && t.slot === slot0) p.launchRaw = (p.launchRaw || 0n) + t.tok; if (t.kind === "buy" && t.slot === slot0) p.launchSol = (p.launchSol || 0) + -t.sol / 1e9; // what the dev and bundle took in the create block
        if (t.kind === "buy" || t.kind === "in") { p.boughtRaw += t.tok; if (t.kind === "buy") p.solIn += -t.sol / 1e9; }
        p.ev.push({ ts: t.ts, kind: t.kind, raw: t.tok < 0n ? -t.tok : t.tok, sol: t.sol / 1e9, other: t.other, w: true }); }
      for (const p of W.values()) { p.role = p.wallet === creator ? "dev" : p.firstSlot === slot0 ? "bundle" : p.firstSlot <= slot0 + 4 ? "sniper" : "early";
        p.secAfter = p.firstTs != null ? p.firstTs - createTs : null; p.boughtPct = pctOf(p.boughtRaw); p.launchPct = pctOf(p.launchRaw || 0n); }
      const grp = (r) => [...W.values()].filter((p) => p.role === r), sum = (a, k = "boughtPct") => ({ n: a.length, pct: a.reduce((x, p) => x + (p[k] || 0), 0), sol: a.reduce((x, p) => x + (k === "launchPct" ? p.launchSol || 0 : p.solIn), 0) });
      const order1 = [...W.values()].filter((p) => p.role !== "dev" && p.role !== "bundle" && p.firstBuySlot != null).sort((a, b) => a.firstSlot - b.firstSlot || (a.firstTs ?? 0) - (b.firstTs ?? 0)).slice(0, FIRST_N);
      order1.forEach((p, i) => { p.rank = i + 1; p.first = true; }); for (const p of W.values()) if (p.role === "dev" || p.role === "bundle") p.first = true;
      L = { createTs, slot0, creator, txs: early.length, lastBuyerSec: order1.length ? order1[order1.length - 1].secAfter : null, firstN: order1.length, dev: sum(grp("dev"), "launchPct"), bundle: sum(grp("bundle"), "launchPct"), snipers: sum(grp("sniper")), early: sum(grp("early")), curveTxs: sigs.length };
      L.buyers = [...W.values()].filter((p) => p.boughtRaw > 0n).length;
      if (V.complete) { const last = sigs.find((s) => !s.err); L.gradAfterS = last?.blockTime && createTs ? last.blockTime - createTs : null; }
    }
  }
  R.launch = L;

  // 5. what every launch-window wallet holds now
  const launchW = [...W.values()].filter((p) => p.inWindow && p.boughtRaw > 0n);
  if (launchW.length) { const b = await balances(launchW.map((p) => p.wallet), mint, tokenProg, pctOf); for (const p of launchW) p.nowPct = b.get(p.wallet) ?? 0; }

  stage("holders now");
  // 6. holders now: largest 20 accounts with owners; holder count
  const big = (await call("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]))?.value || [];
  const owners = big.length ? (await call("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }])).value : [];
  let holders = big.map((b, i) => ({ owner: owners[i]?.data?.parsed?.info?.owner || null, pct: pctOf(BigInt(b.amount)) })).filter((h) => h.owner);
  holders = holders.map((h) => ({ ...h, label: h.owner === pool || h.owner === poolAuth ? "PumpSwap pool" : h.owner === curve ? "bonding curve" : W.get(h.owner)?.role || "" }));
  const real = holders.filter((h) => !/pool|curve/.test(h.label));
  for (const h of real) { const p = prof(h.owner); p.nowPct = Math.max(p.nowPct ?? 0, h.pct); p.topHolder = true; }
  R.holders = { top: holders, top10Pct: real.slice(0, 10).reduce((a, h) => a + h.pct, 0), top20Pct: real.slice(0, 20).reduce((a, h) => a + h.pct, 0), largestPct: real[0]?.pct ?? null };
  try { let n = 0; for (let page = 1; page <= 5; page++) { charge("getTokenAccounts"); const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccounts", params: { mint, limit: 1000, page, options: { showZeroBalance: false } } }), 1, 10000);
    const accs = j?.result?.token_accounts || []; n += accs.filter((a) => Number(a.amount || 0) > 0).length; if (accs.length < 1000) { R.holders.count = n; break; } if (page === 5) R.holders.count = "5,000+"; } } catch {}

  stage("who is buying now");
  // 7. who is buying now: the last 200 trades on the pool (or the curve)
  let recent = null;
  try { const venueAddr = V.complete ? pool : curve; const sg = ((await call("getSignaturesForAddress", [venueAddr, { limit: 150 }])) || []).filter((x) => !x.err).slice(0, 100);
    const tr = readTrades(await batch("getTransaction", sg.map((x) => TX(x.signature))), mint, skip); const B = new Map(); let sells = 0, from = null, to = null;
    for (const t of tr) { from = from == null ? t.ts : Math.min(from, t.ts); to = Math.max(to || 0, t.ts);
      if (t.kind === "buy") { const b = B.get(t.wallet) || { wallet: t.wallet, sol: 0, buys: 0, last: 0, raw: 0n }; b.sol += -t.sol / 1e9; b.buys++; b.last = Math.max(b.last, t.ts); b.raw += t.tok; B.set(t.wallet, b); } else if (t.kind === "sell") sells++; }
    const list = [...B.values()].sort((a, b) => b.sol - a.sol).map((b) => ({ wallet: b.wallet, sol: +b.sol.toFixed(3), buys: b.buys, last: b.last, pct: pctOf(b.raw) }));
    recent = { from, to, trades: sg.length, buyers: list.length, sells, list: list.slice(0, 60), lastSig: sg[0]?.signature || null, venueAddr };
    for (const b of recent.list) prof(b.wallet).recentSol = b.sol; } catch (e) { R.notes.push("Recent buyers could not be read: " + e.message); }

  // 8. wallet ages and funders — dev, bundle, snipers first, then whoever holds the most now, then recent buyers (at most 180 wallets)
  const RO = { dev: 0, bundle: 1, sniper: 2 };
  const RK = (p) => (p.role === "dev" ? 0 : p.role === "bundle" ? 1 : p.first ? 2 : 9);
  const order = [...W.values()].sort((a, b) => RK(a) - RK(b) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || (b.nowPct || 0) - (a.nowPct || 0) || (b.recentSol || 0) - (a.recentSol || 0));
  stage("wallet ages and funders"); const toAge = order.slice(0, 120).map((p) => p.wallet), ages = new Map(); let capped = false;
  for (const part of chunks(toAge, 4)) { if (capped) break; coinStat.stage = `wallet ages and funders (${ages.size} of ${toAge.length})`; await Promise.all(part.map(async (w) => { try { ages.set(w, await walletAge(w)); } catch (e) { if (/budget|cap/.test(e.message) && !capped) { capped = true; R.notes.push(e.message + " — wallet ages are partial."); } } })); }
  const ref = L?.createTs || tok?.create_ts || R.now;
  for (const p of W.values()) { const a = ages.get(p.wallet); if (!a) continue; p.ageAtLaunchH = a.firstTs ? +((ref - a.firstTs) / 3600).toFixed(1) : null; p.ageH = a.firstTs ? +((R.now - a.firstTs) / 3600).toFixed(1) : null;
    p.fresh = !!(a.firstTs != null && !a.old && a.firstTs > ref - FRESH); p.funder = a.funder || null; p.fundedSol = a.fundedSol ?? null; p.walletTxs = a.txs; }
  // a funder that funds several of these wallets and is itself a busy wallet (1,000+ transactions) is treated as an exchange: shared, but not proof of one owner
  const fundCount = new Map(); for (const p of W.values()) if (p.funder) fundCount.set(p.funder, (fundCount.get(p.funder) || 0) + 1);
  const busy = new Set(); for (const [f, n] of [...fundCount.entries()].filter(([, n]) => n >= 2).slice(0, 40)) { if (W.has(f)) continue; try { const a = await walletAge(f); if (a.old) busy.add(f); } catch { break; } }

  // 9. behaviour on this coin: the token-account history of dev, bundle, snipers and the biggest holders (at most 40 wallets, last 25 transactions each)
  stage("when and how much each wallet sold"); const hist = order.filter((p) => p.first || (p.nowPct || 0) >= 0.3).slice(0, 85);
  if (hist.length) {
    const sigLists = await batch("getSignaturesForAddress", hist.map((p) => [ataOf(p.wallet, mint, tokenProg), { limit: 12 }]));
    const want = []; hist.forEach((p, i) => { const s = (sigLists[i] || []).filter((x) => !x.err); p.histPartial = s.length >= 12; for (const x of s) want.push([i, x.signature]); });
    const htx = await batch("getTransaction", want.map(([, s]) => TX(s)));
    const seen = new Set(); hist.forEach((p) => { p.ev = []; });
    want.forEach(([i, s], k) => { const tx = htx[k]; if (!tx || seen.has(i + s)) return; seen.add(i + s); const t = readTrades([tx], mint, skip).find((x) => x.wallet === hist[i].wallet); if (!t) return;
      hist[i].ev.push({ ts: t.ts, kind: t.kind, raw: t.tok < 0n ? -t.tok : t.tok, sol: t.sol / 1e9, other: t.other }); });
    for (const p of hist) p.histRead = true;
  }
  for (const p of W.values()) {
    p.ev.sort((a, b) => a.ts - b.ts); const buys = p.ev.filter((e) => e.kind === "buy"), sells = p.ev.filter((e) => e.kind === "sell");
    p.nBuys = buys.length; p.nSells = sells.length; p.sentTo = [...new Set(p.ev.filter((e) => e.kind === "out" && e.other).map((e) => e.other))]; p.gotFrom = [...new Set(p.ev.filter((e) => e.kind === "in" && e.other).map((e) => e.other))];
    p.soldSol = +sells.reduce((a, e) => a + e.sol, 0).toFixed(2); p.firstSellMc = sells[0] ? mcAt(Math.abs(sells[0].sol), Number(sells[0].raw)) : null;
    let sold = false; p.rebought = false; for (const e of p.ev) { if (e.kind === "sell") sold = true; if (e.kind === "buy" && sold) p.rebought = true; }
    const holds = (p.nowPct || 0) > 0.01, got = p.ev.filter((e) => e.kind === "buy" || e.kind === "in").reduce((a, e) => a + Number(e.raw), 0), peak = Math.max(got > 0 ? (got / 10 ** dec / supply) * 100 : 0, p.boughtPct || 0, p.nowPct || 0);
    p.behaviour = !p.histRead && !p.inWindow ? (holds ? "holds" : "") :
      p.nBuys >= 3 && p.nSells >= 3 ? `trading in and out (${p.nBuys} buys, ${p.nSells} sells)` :
      !holds ? (p.rebought ? "sold, bought back, sold again" : p.sentTo.length && !p.nSells ? "moved it all to another wallet" : p.nSells ? "sold out" : "holds none") :
      p.rebought ? "sold, then bought back" : p.nSells ? `selling (holds ${Math.round(((p.nowPct || 0) / (peak || 1)) * 100)}% of what it had)` : p.sentTo.length ? "moved some to another wallet" : p.nBuys > 1 && (p.nowPct || 0) > (p.boughtPct || 0) * 1.05 ? "still buying" : "holding, never sold";
    p.events = p.ev.slice(-30).map((e) => ({ ts: e.ts, kind: e.kind, pct: pctOf(e.raw), sol: +e.sol.toFixed(3), mc: e.kind === "buy" || e.kind === "sell" ? mcAt(Math.abs(e.sol), Number(e.raw)) : null, other: e.other }));
    delete p.ev; delete p.boughtRaw;
  }

  // 9b. side wallets: wallets the dev, bundle and first buyers sent tokens to — what they hold now
  const side = [...new Set([...W.values()].filter((p) => p.first).flatMap((p) => p.sentTo))].filter((w) => !W.get(w)?.first && w !== pool && w !== curve).slice(0, 100);
  if (side.length) { const b = await balances(side, mint, tokenProg, pctOf); for (const w of side) { const q = prof(w); q.role = "side wallet"; q.nowPct = Math.max(q.nowPct || 0, b.get(w) ?? 0); q.behaviour = "received tokens from " + [...W.values()].filter((p) => p.sentTo?.includes(w)).map((p) => p.wallet.slice(0, 4)).join(", "); q.sentTo = []; q.gotFrom = [...W.values()].filter((p) => p.sentTo?.includes(w)).map((p) => p.wallet); } }
  for (const p of W.values()) { if (!p.first) continue; const sw = (p.sentTo || []).filter((w) => W.get(w)?.role === "side wallet"); p.sideN = sw.length; p.sideHoldPct = sw.reduce((a, w) => a + (W.get(w).nowPct || 0), 0); }

  // 9c. selling: how much each sold, when, and in the last hour
  const hourAgo = R.now - 3600, halfHour = R.now - 1800;
  for (const p of W.values()) { const sells = (p.events || []).filter((e) => e.kind === "sell"); p.soldPct = sells.reduce((a, e) => a + (e.pct || 0), 0); p.soldPct1h = sells.filter((e) => e.ts >= hourAgo).reduce((a, e) => a + (e.pct || 0), 0); p.lastSell = sells.length ? sells[sells.length - 1].ts : null; p.sellingNow = !!(p.lastSell && p.lastSell >= halfHour); }

  // 9d. whales: SOL balance and what else each wallet holds (Helius DAS), for the dev, the bundle, the first buyers and the top holders
  stage("whales: SOL balances and other coins");
  const rich = order.filter((p) => p.first || p.topHolder).slice(0, 90).map((p) => p.wallet);
  for (const part of chunks(rich, 100)) { const v = (await call("getMultipleAccounts", [part, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }])).value; part.forEach((w, i) => { W.get(w).sol = v[i] ? +(v[i].lamports / 1e9).toFixed(2) : 0; }); }
  let pf = 0; const pfList = rich.slice(0, 75);
  await Promise.all(Array.from({ length: 4 }, async () => { while (pf < pfList.length) { const w = pfList[pf++]; try { charge("getAssetsByOwner"); const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByOwner", params: { ownerAddress: w, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true, showZeroBalance: false } } }), 1, 15000);
    const items = j?.result?.items || [], p = W.get(w); let usd = Number(j?.result?.nativeBalance?.total_price || 0); const other = [];
    for (const it of items) { const ti = it.token_info; if (!ti) continue; const v = Number(ti.price_info?.total_price || 0); usd += v; if (it.id !== mint && v > 0) other.push({ mint: it.id, symbol: ti.symbol || it.content?.metadata?.symbol || "?", usd: Math.round(v) }); }
    p.portfolioUsd = Math.round(usd); p.tokenCount = items.filter((it) => it.token_info).length; p.otherCoins = other.sort((a, b) => b.usd - a.usd).slice(0, 4); p.whale = usd >= 10000 || (p.sol || 0) >= 50; coinStat.stage = `whales: ${pf} of ${pfList.length} wallets`; } catch (e) { if (/budget|cap|busy/.test(e.message)) return; } } }));

  // 9e. the dev: age, funding chain (two steps), SOL, every coin he launched before (pump.fun's own list, then our database)
  stage("the dev's history");
  const devAddr = L?.creator || tok?.creator || null;
  if (devAddr) { const D = { wallet: devAddr };
    try { const a = await walletAge(devAddr, true); D.firstTs = a.firstTs; D.txs = a.txs; D.old = !!a.old; D.funder = a.funder || null; D.fundedSol = a.fundedSol ?? null;
      if (D.funder) { const b = await walletAge(D.funder, true); D.funderFirstTs = b.firstTs; D.funderBusy = !!b.old; D.funder2 = b.funder || null; } } catch {}
    try { D.sol = +((await call("getBalance", [devAddr]))?.value / 1e9).toFixed(2); } catch {}
    try { const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${devAddr}?offset=0&limit=100&includeNsfw=true`, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      const j = await r.json(), arr = Array.isArray(j) ? j : j?.coins || [];
      D.coins = arr.map((c) => ({ mint: c.mint, name: c.name, symbol: c.symbol, created: c.created_timestamp ? Math.floor(c.created_timestamp / 1000) : null, mc: c.usd_market_cap ?? null, ath: c.ath_market_cap ?? null, graduated: !!c.complete || !!c.raydium_pool || !!c.pump_swap_pool })).filter((c) => c.mint !== mint).sort((a, b) => (b.created || 0) - (a.created || 0));
      D.source = "pump.fun"; } catch (e) { D.coinsErr = e.message; }
    if (!D.coins?.length) { const rows = all(`SELECT mint, name, symbol, create_ts, peak_mc_usd, graduated FROM tokens WHERE creator=? AND mint<>? ORDER BY create_ts DESC LIMIT 100`, devAddr, mint);
      if (rows.length) { D.coins = rows.map((r) => ({ mint: r.mint, name: r.name, symbol: r.symbol, created: r.create_ts, mc: null, ath: r.peak_mc_usd, graduated: !!r.graduated })); D.source = "our tracker (since 18 Oct)"; } }
    const dc = D.coins || []; D.summary = { n: dc.length, graduated: dc.filter((c) => c.graduated).length, best: dc.reduce((m, c) => Math.max(m, c.ath || c.mc || 0), 0), last24h: dc.filter((c) => c.created && c.created > R.now - 86400).length };
    D.coins = dc.slice(0, 40); const dp = W.get(devAddr); if (dp) Object.assign(D, { boughtPct: dp.boughtPct, nowPct: dp.nowPct, soldPct: dp.soldPct, soldSol: dp.soldSol, behaviour: dp.behaviour, events: dp.events });
    R.dev = D; }

  stage("grouping wallets into owners");
  // 10. who is the same person: group wallets by funding and by token transfers (dev + bundle are one group by construction)
  const parent = new Map(), find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const node = (x) => { if (!parent.has(x)) parent.set(x, x); }, why = new Map(), join = (a, b, reason) => { node(a); node(b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); why.set(a, [...(why.get(a) || []), reason]); why.set(b, [...(why.get(b) || []), reason]); };
  for (const p of W.values()) node(p.wallet);
  const devW = L?.creator; if (devW) for (const p of W.values()) if (p.role === "bundle") join(devW, p.wallet, "bundled with the dev");
  for (const p of W.values()) { if (p.funder && !busy.has(p.funder)) { if (W.has(p.funder)) join(p.wallet, p.funder, "funded by " + p.funder.slice(0, 4)); else if ((fundCount.get(p.funder) || 0) >= 2) join(p.wallet, "F:" + p.funder, "same funder " + p.funder.slice(0, 4)); }
    for (const o of [...p.sentTo, ...p.gotFrom]) if (W.has(o)) join(p.wallet, o, "token transfer"); }
  const G = new Map(); for (const p of W.values()) { const r = find(p.wallet); if (!G.has(r)) G.set(r, []); G.get(r).push(p); }
  let groups = [...G.values()].filter((m) => m.length >= 2 || m.some((p) => p.role === "dev")).map((m) => ({ wallets: m.map((p) => p.wallet), n: m.length, nowPct: m.reduce((a, p) => a + (p.nowPct || 0), 0), boughtPct: m.reduce((a, p) => a + (p.role === "dev" || p.role === "bundle" ? p.launchPct || 0 : p.first ? p.boughtPct || 0 : 0), 0),
    roles: [...new Set(m.map((p) => p.role).filter(Boolean))], fresh: m.filter((p) => p.fresh).length, links: [...new Set(m.flatMap((p) => why.get(p.wallet) || []))].slice(0, 6), launch: m.some((p) => p.role === "dev" || p.role === "bundle") }));
  groups.sort((a, b) => b.nowPct - a.nowPct); groups.forEach((g, i) => { g.id = i + 1; for (const w of g.wallets) W.get(w).group = g.id; });
  R.groups = groups.slice(0, 30); R.busyFunders = [...busy];
  const linkedToLaunch = new Set(groups.filter((g) => g.launch).flatMap((g) => g.wallets));
  for (const p of W.values()) p.launchLinked = linkedToLaunch.has(p.wallet) && p.role !== "dev" && p.role !== "bundle";

  // 11. tables for the page
  const pub = (p) => ({ wallet: p.wallet, role: p.role || (p.topHolder ? "holder" : "buyer"), secAfter: p.secAfter ?? null, boughtPct: p.boughtPct ?? null, solIn: p.solIn ? +p.solIn.toFixed(3) : null, nowPct: p.nowPct, fresh: p.fresh ?? null, ageAtLaunchH: p.ageAtLaunchH ?? null, ageH: p.ageH ?? null,
    funder: p.funder || null, group: p.group || null, launchLinked: !!p.launchLinked, behaviour: p.behaviour, rank: p.rank ?? null, launchPct: p.launchPct ?? null, sol: p.sol ?? null, portfolioUsd: p.portfolioUsd ?? null, tokenCount: p.tokenCount ?? null, otherCoins: p.otherCoins || [], whale: !!p.whale,
    soldPct: p.soldPct || 0, soldPct1h: p.soldPct1h || 0, lastSell: p.lastSell || null, sellingNow: !!p.sellingNow, sideN: p.sideN || 0, sideHoldPct: p.sideHoldPct || 0, nBuys: p.nBuys, nSells: p.nSells, soldSol: p.soldSol || null, firstSellMc: p.firstSellMc, sentTo: p.sentTo, gotFrom: p.gotFrom, events: p.events, histPartial: !!p.histPartial });
  R.window = [...W.values()].filter((p) => p.first && p.boughtPct > 0).sort((a, b) => RK(a) - RK(b) || (a.rank ?? 0) - (b.rank ?? 0)).map(pub);
  R.side = [...W.values()].filter((p) => p.role === "side wallet").sort((a, b) => (b.nowPct || 0) - (a.nowPct || 0)).map(pub);
  const wsum = (f) => R.window.filter(f).reduce((a, p) => a + (p.nowPct || 0), 0);
  if (L) R.windowSummary = { buyers: R.window.length, boughtPct: R.window.reduce((a, p) => a + (p.boughtPct || 0), 0), holdNowPct: wsum(() => true), stillHolding: R.window.filter((p) => (p.nowPct || 0) > 0.01).length,
    checked: R.window.filter((p) => p.fresh != null).length, fresh: R.window.filter((p) => p.fresh).length, freshHoldPct: wsum((p) => p.fresh), launchLinked: R.window.filter((p) => p.launchLinked).length, launchLinkedHoldPct: wsum((p) => p.launchLinked),
    devBundleHoldPct: wsum((p) => p.role === "dev" || p.role === "bundle"), sniperHoldPct: wsum((p) => p.role === "sniper"), traders: R.window.filter((p) => /in and out/.test(p.behaviour || "")).length,
    soldPct: R.window.reduce((a, p) => a + (p.soldPct || 0), 0), soldPct1h: R.window.reduce((a, p) => a + (p.soldPct1h || 0), 0), sellers1h: R.window.filter((p) => p.soldPct1h > 0).length, sellingNow: R.window.filter((p) => p.sellingNow).length,
    sideN: R.side.length, sideHoldPct: R.side.reduce((a, p) => a + (p.nowPct || 0), 0), whales: R.window.filter((p) => p.whale).length, whaleHoldPct: wsum((p) => p.whale), lastBuyerSec: L.lastBuyerSec, firstN: L.firstN };
  for (const h of holders) { const p = W.get(h.owner); if (p) Object.assign(h, { fresh: p.fresh ?? null, ageH: p.ageH ?? null, funder: p.funder, group: p.group || null, launchLinked: !!p.launchLinked, behaviour: p.behaviour, firstBuySec: p.secAfter ?? null }); }
  if (recent) { for (const b of recent.list) { const p = W.get(b.wallet); Object.assign(b, { fresh: p?.fresh ?? null, ageH: p?.ageH ?? null, funder: p?.funder || null, group: p?.group || null, launchLinked: !!p?.launchLinked, role: p?.role || null }); }
    const chk = recent.list.filter((b) => b.fresh != null); Object.assign(recent, { checked: chk.length, fresh: chk.filter((b) => b.fresh).length, freshSol: +chk.filter((b) => b.fresh).reduce((a, b) => a + b.sol, 0).toFixed(2), sol: +chk.reduce((a, b) => a + b.sol, 0).toFixed(2), linked: recent.list.filter((b) => b.launchLinked || b.role === "dev" || b.role === "bundle").length }); }
  R.recent = recent; R.tracked = [...W.values()].filter((p) => RO[p.role] != null).map(pub);
  R.creatorAgeH = L?.creator ? W.get(L.creator)?.ageAtLaunchH ?? null : tok?.creator_age_s != null ? +(tok.creator_age_s / 3600).toFixed(1) : null;
  R.live = { wallets: [...W.values()].sort((a, b) => RK(a) - RK(b)).map((p) => p.wallet).slice(0, 400), lastSig: recent?.lastSig || null, venueAddr: recent?.venueAddr || null, tokenProg, dec, supply, solUsd };
  R.diag = diagnose(R);
  R.name = R.db.name || R.dex?.name || null; R.symbol = R.db.symbol || R.dex?.symbol || null;
  return R;
}

// ---------- live refresh: balances of every wallet in the report, the top holders, the market cap and the trades since the last read ----------
export async function coinLive(mint) {
  const c = cache.get(String(mint || "").trim()); if (!c) return { ok: false, error: "look the coin up first" };
  const R = c.r, Lv = R.live; used = 0;
  try {
    const pctOf = (raw) => (Number(raw) / 10 ** Lv.dec / Lv.supply) * 100, skip = new Set([R.nowMarket.curve, R.nowMarket.pool, pda(["pool-authority", R.mint], PUMP)]);
    const bal = await balances(Lv.wallets, R.mint, Lv.tokenProg, pctOf);
    const V = await venueNow(R.mint, Lv.dec, Lv.supply, Lv.tokenProg, R.nowMarket.curve, R.nowMarket.pool);
    const big = (await call("getTokenLargestAccounts", [R.mint, { commitment: "confirmed" }]))?.value || [];
    const owners = big.length ? (await call("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }])).value : [];
    const top = big.map((b, i) => ({ owner: owners[i]?.data?.parsed?.info?.owner || null, pct: pctOf(BigInt(b.amount)) })).filter((h) => h.owner);
    let trades = [];
    if (Lv.venueAddr) { const venueAddr = V.complete ? R.nowMarket.pool : Lv.venueAddr; const sg = ((await call("getSignaturesForAddress", [venueAddr, { limit: 60, ...(Lv.lastSig && venueAddr === Lv.venueAddr ? { until: Lv.lastSig } : {}) }])) || []).filter((x) => !x.err);
      if (sg.length) { Lv.lastSig = sg[0].signature; Lv.venueAddr = venueAddr; const tr = readTrades(await batch("getTransaction", sg.slice(0, 40).map((x) => TX(x.signature))), R.mint, skip);
        const known = new Map([...(R.window || []), ...(R.tracked || []), ...(R.holders?.top || []).map((h) => ({ wallet: h.owner, ...h })), ...(R.recent?.list || [])].map((p) => [p.wallet, p]));
        trades = tr.filter((t) => t.kind === "buy" || t.kind === "sell").map((t) => { const k = known.get(t.wallet); return { ts: t.ts, wallet: t.wallet, kind: t.kind, sol: +Math.abs(t.sol / 1e9).toFixed(3), pct: pctOf(t.tok < 0n ? -t.tok : t.tok), role: k?.role || null, group: k?.group || null, fresh: k?.fresh ?? null, launchLinked: !!k?.launchLinked }; }); } }
    for (const h of top) if (bal.has(h.owner)) bal.set(h.owner, Math.max(bal.get(h.owner) || 0, h.pct)); // a holder whose tokens sit outside its standard token account
    const solUsd = Lv.solUsd, groups = (R.groups || []).map((g) => ({ id: g.id, nowPct: g.wallets.reduce((a, w) => a + (bal.get(w) || 0), 0) }));
    coinStat.liveCalls = (coinStat.liveCalls || 0) + used;
    return { ok: true, at: Math.floor(Date.now() / 1000), calls: used, mcUsd: V.priceSol && solUsd ? V.priceSol * Lv.supply * solUsd : null, venue: V.venue, progress: V.progress, balances: Object.fromEntries(bal), groups, top, trades };
  } catch (e) { return { ok: false, error: e.message }; }
}

function diagnose(R) {
  const d = [], add = (lvl, txt) => d.push({ lvl, txt }), f1 = (x) => (x == null ? "?" : x.toFixed(1)), L = R.launch, S = R.windowSummary, H = R.holders, T = (r) => (R.tracked || []).filter((p) => p.role === r);
  if (R.token.mintAuthority) add("red", `Mint authority is NOT revoked (${R.token.mintAuthority.slice(0, 6)}…): more tokens can be printed.`);
  if (R.token.freezeAuthority) add("red", "Freeze authority is set: wallets can be frozen so they cannot sell.");
  const g1 = (R.groups || [])[0]; if (g1 && g1.nowPct >= 10) add(g1.nowPct >= 25 ? "red" : "amber", `One owner holds ${f1(g1.nowPct)}% of the supply across ${g1.n} linked wallet${g1.n === 1 ? "" : "s"}${g1.launch ? " — the dev and bundle's group" : ""} (linked by ${g1.links.slice(0, 3).join(", ")}).`);
  const lg = (R.groups || []).find((g) => g.launch); if (lg && lg !== g1) add(lg.nowPct >= 10 ? "amber" : "ok", `The dev and bundle's group (${lg.n} wallets including wallets linked to them) holds ${f1(lg.nowPct)}% now.`);
  if (S?.launchLinked) add("red", `${S.launchLinked} of the first buyers trace back to the dev or bundle (funded by them, same funder, or tokens passed between them); they hold ${f1(S.launchLinkedHoldPct)}% now.`);
  const bp = L?.bundle?.pct ?? R.db.bundle_pct, bw = L?.bundle?.n ?? R.db.bundle_wallets;
  if (bp != null) { if (bp >= 79 && bw === 1) add("red", `Full-curve factory launch: one wallet bought ${f1(bp)}% in the create block — not buyable.`);
    else if (bp >= 70 && bp < 80 && bw >= 4 && bw <= 10) add("amber", `Bundle launch (the GR2 / BL type): ${f1(bp)}% bought in the create block over ${bw} wallets.`);
    else if (bp >= 30) add("amber", `Heavily bundled: ${f1(bp)}% of supply bought in the create block over ${bw} wallets.`);
    else add("ok", `Launch bundle ${f1(bp)}% over ${bw} wallets.`); }
  const dv = T("dev")[0]; if (dv) add((dv.nowPct || 0) > 5 ? "amber" : "ok", (dv.nowPct || 0) > 0.01 ? `Dev bought ${f1(dv.launchPct || dv.boughtPct)}% and still holds ${f1(dv.nowPct)}%.` : `Dev bought ${f1(dv.launchPct || dv.boughtPct)}% and holds none now (${dv.behaviour}).`); else if (L) add("ok", "Dev made no buy at launch.");
  const bu = T("bundle"); if (bu.length) add(bu.reduce((a, p) => a + (p.nowPct || 0), 0) > 5 ? "amber" : "ok", `Bundle wallets: took ${f1(bu.reduce((a, p) => a + (p.launchPct ?? p.boughtPct ?? 0), 0))}% in the create block, hold ${f1(bu.reduce((a, p) => a + (p.nowPct || 0), 0))}% now; ${bu.filter((p) => !((p.nowPct || 0) > 0.01)).length} of ${bu.length} sold out.`);
  if (S) { add(S.fresh >= S.checked / 2 && S.checked ? "amber" : "ok", `The first ${S.firstN} buyers after the dev and bundle (all within ${S.lastBuyerSec ?? "?"} s of launch) bought ${f1(S.boughtPct - (L?.dev?.pct || 0) - (L?.bundle?.pct || 0))}%; together with the dev and bundle ${S.stillHolding} wallets still hold ${f1(S.holdNowPct)}%. Fresh: ${S.fresh} of ${S.checked} checked, holding ${f1(S.freshHoldPct)}%.`);
    if (S.sideN) add(S.sideHoldPct >= 5 ? "red" : "amber", `Side wallets: the early wallets sent tokens to ${S.sideN} other wallet${S.sideN === 1 ? ", which holds" : "s, which hold"} ${f1(S.sideHoldPct)}% now — supply that looks spread out but is the same people.`);
    add(S.soldPct1h >= 2 ? "red" : S.sellingNow ? "amber" : "ok", `Selling: the early wallets have sold ${f1(S.soldPct)}% of supply so far${S.soldPct1h > 0 ? `, ${f1(S.soldPct1h)}% of it in the last hour (${S.sellers1h} wallet${S.sellers1h === 1 ? "" : "s"})` : ", none in the last hour"}${S.sellingNow ? `; ${S.sellingNow} sold in the last 30 min` : ""}.`);
    if (S.whales) add("ok", `${S.whales} of the early wallets ${S.whales === 1 ? "is a whale" : "are whales"} (50+ SOL or $10K+ in tokens), holding ${f1(S.whaleHoldPct)}% now.`);
    if (S.traders) add("amber", `${S.traders} of the early wallets are trading in and out of the coin (3+ buys and 3+ sells) — volume farming or flipping.`); }
  const sn = T("sniper"); if (sn.length) add(sn.reduce((a, p) => a + (p.nowPct || 0), 0) > 10 ? "amber" : "ok", `Snipers (4 blocks after the create): ${sn.length} took ${f1(sn.reduce((a, p) => a + (p.boughtPct || 0), 0))}%, hold ${f1(sn.reduce((a, p) => a + (p.nowPct || 0), 0))}% now.`);
  if (H?.top10Pct != null) add(H.top10Pct > 35 ? "amber" : "ok", `Top 10 holders (pool and curve left out) hold ${f1(H.top10Pct)}%; the largest ${f1(H.largestPct)}%.`);
  const RB = R.recent; if (RB?.checked) add(RB.fresh >= RB.checked / 2 ? "amber" : "ok", `Last ${RB.trades} trades: ${RB.buyers} buying wallets; ${RB.fresh} of ${RB.checked} checked are fresh, putting in ${RB.freshSol} of ${RB.sol} SOL${RB.linked ? `; ${RB.linked} are the dev, bundle or linked to them` : ""}.`);
  const bs = T("bundle").filter((w) => w.firstSellMc); if (bs.length) { const m = bs.map((w) => w.firstSellMc).sort((a, b) => a - b); add("ok", `The bundle's first sales were at about $${Math.round(m[0] / 1000)}K–$${Math.round(m[m.length - 1] / 1000)}K market cap (today's SOL price).`); }
  const DV = R.dev; if (DV) { const sm = DV.summary || {}; if (sm.n) add(sm.n >= 10 && sm.graduated <= 1 ? "red" : sm.n >= 3 ? "amber" : "ok", `The dev has launched ${sm.n} other coin${sm.n === 1 ? "" : "s"} (${sm.last24h} in the last 24 h), ${sm.graduated} graduated, best $${Math.round((sm.best || 0) / 1000)}K (${DV.source}).`); else if (DV.coins) add("ok", "No other coins from this dev wallet.");
    if (DV.funder) add(DV.funderBusy ? "ok" : "amber", `The dev wallet was funded by ${DV.funder.slice(0, 6)}… with ${DV.fundedSol != null ? DV.fundedSol.toFixed(2) + " SOL" : "?"}${DV.funderBusy ? " (a busy, exchange-like wallet)" : DV.funder2 ? `, which was itself funded by ${DV.funder2.slice(0, 6)}…` : ""}.`); }
  if (R.creatorAgeH != null) add("ok", `Creator wallet was ${R.creatorAgeH < 1 ? "under an hour" : R.creatorAgeH > 48 ? Math.round(R.creatorAgeH / 24) + " days" : f1(R.creatorAgeH) + " h"} old at launch.`);
  const op = bp >= 74.2 && bp <= 74.9 && bw >= 4 && bw <= 6 && !(L?.dev?.pct > 0.01) && R.creatorAgeH >= 10 && R.creatorAgeH <= 30;
  if (op) add("good", "Matches the operator fingerprint behind GR2's 10–30x coins (bundle 74.3–74.8% over 4–6 wallets, no dev buy, creator wallet made the day before).");
  const ch = R.db.creatorHistory; if (ch?.n) add(ch.n >= 20 && (ch.grads || 0) <= 2 ? "amber" : "ok", `Creator's other launches we saw: ${ch.n} (${ch.n24 || 0} in the last 24 h), ${ch.grads || 0} graduated, best $${Math.round((ch.best || 0) / 1000)}K.`);
  if ((R.busyFunders || []).length) add("ok", `${R.busyFunders.length === 1 ? "1 funder is a busy, exchange-like wallet" : R.busyFunders.length + " funders are busy, exchange-like wallets"}; wallets that share only that funder were not grouped together.`);
  return d.sort((a, b) => ["red", "amber", "good", "ok"].indexOf(a.lvl) - ["red", "amber", "good", "ok"].indexOf(b.lvl));
}
