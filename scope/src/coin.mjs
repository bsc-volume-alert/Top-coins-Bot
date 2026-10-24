// v0.18.184 (owner, 23 Oct 12:48 UK: "a website where I can paste in the contract… the initial bundles and all the information initially, the current
// information, the top 10 wallets… a full diagnosis of the coin"). One lookup = one report: the launch (bundle, dev, snipers — from our database when
// the tracker saw the launch, and rebuilt from the chain either way), what those wallets did since (held / sold / sold and bought back / moved out),
// the coin now (price, MC, holders, top 20 with labels), fresh-wallet share and shared funders, every book that traded it, and a plain-English diagnosis.
// Read-only. Its own call counter and daily budget (COIN_RPC_DAILY, default 30000) on the Helius URL, so a lookup never touches the bots' RPC budget.
import { createHash } from "node:crypto";
import "./env.mjs";
import Database from "better-sqlite3";
import { gget, gmgnOn, gmStat, walletRow, walletStats, facts, fromRate, TAG } from "./gmgn.mjs";
import { writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { execFile } from "node:child_process";
let dumpBusy = false, dumpAgain = false; // 0.4.2: send the saved lookups to the repo (scope-data branch) right after each lookup
function pushDump() { if (process.env.SCOPE_SMOKE || process.env.SCOPE_NO_PUSH) return; if (dumpBusy) { dumpAgain = true; return; } dumpBusy = true; execFile("bash", [new URL("../push-dump.sh", import.meta.url).pathname], { timeout: 120000 }, () => { dumpBusy = false; if (dumpAgain) { dumpAgain = false; pushDump(); } }); }
// Reads the tracker's database read-only (launch facts, checkpoints, books) when it is there; works without it.
let db = null; try { db = new Database(process.env.TRACKER_DB || "/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); } catch (e) { console.log("[scope] tracker database not available:", e.message); }
const HELIUS = () => process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : (process.env.SCOPE_RPC_URL || "");
const A58E = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58(buf) { const d = []; for (const b of buf) { let c = b; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c > 0) { d.push(c % 58); c = (c / 58) | 0; } }
  let s = ""; for (const b of buf) { if (b === 0) s += "1"; else break; } for (let i = d.length - 1; i >= 0; i--) s += A58E[d[i]]; return s; }
function solUsdNow() { try { const r = db?.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get(); if (r?.usd > 0) return r.usd; } catch {} return null; }

const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", WSOL = "So11111111111111111111111111111111111111112";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const DAILY = Number(process.env.SCOPE_RPC_DAILY || 400000), PER_LOOKUP = Number(process.env.SCOPE_RPC_LOOKUP || 9000); // 0.5.0: the money trail and full histories need more
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
let used = 0; const readFail = { n: 0, last: "" }; // reads that failed and were skipped, per lookup — shown on the page
function charge(method, n = 1) {
  const d = new Date().getUTCDate(); if (d !== coinStat.day) { coinStat.day = d; coinStat.calls = 0; }
  if (coinStat.calls + n > DAILY) throw new Error(`coin lookup budget used up today (${DAILY} calls)`);
  if (used + n > PER_LOOKUP) throw new Error(`this lookup hit its ${PER_LOOKUP}-call cap`);
  coinStat.calls += n; used += n;
}
// 0.2.1: Helius answered "Too Many Requests" to the first real lookup (23 Oct 19:24 UK). Every request now goes through a rate limiter
// (SCOPE_RPS items a second, default 10 — the bots share this Helius key, so the coin site must never crowd them out), batches are small,
// and a 429 or a non-JSON reply waits and retries (1, 2, 4, 8, 16 s) instead of failing the lookup.
const RPS = Number(process.env.SCOPE_RPS || 20); let tokens = RPS, lastFill = Date.now();
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
async function call(method, params, timeout = 15000) {
  charge(method);
  const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), 1, timeout);
  if (j.error) throw new Error(`${method}: ${j.error.message || JSON.stringify(j.error).slice(0, 80)}`); return j.result;
}
// 0.2.2: no JSON-RPC batches by default — Helius rate-limited the batched form at once (23 Oct 19:24 UK) while single requests from the bots ran clean.
// Each item is its own request, five in flight at a time, all through the rate limiter. SCOPE_BATCH=n turns batching back on.
const BATCH = Number(process.env.SCOPE_BATCH || 1);
async function batch(method, list, size = BATCH) {
  const out = new Array(list.length).fill(null);
  if (size <= 1) { let next = 0, done = 0;
    await Promise.all(Array.from({ length: Math.min(5, list.length) }, async () => { while (next < list.length) { const i = next++; try { out[i] = await call(method, list[i]); } catch (e) { if (/budget|cap|busy/.test(e.message)) throw e; readFail.n++; readFail.last = `${method}: ${e.message}`.slice(0, 160); } done++; if (stageCb && done % 10 === 0) stageCb(done, list.length); } }));
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
// 0.6.1: version 1 — Solana now has v1 transactions; asking for at most v0 made every v1 transaction come back as an error, silently dropped
// (the real lookups of 24 Oct: the launch bundles of Privacycoin, Moustache and YMB were v1 transactions and were never read)
const TX = (sig) => [sig, { maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed" }];

// ---------- transaction reading ----------
const keysOf = (tx) => [...(tx?.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey)), ...(tx?.meta?.loadedAddresses?.writable || []), ...(tx?.meta?.loadedAddresses?.readonly || [])];
/** per-owner change of this mint's balance (raw units) and SOL change (lamports) in one transaction */
function deltas(tx, mint, venue = null) { // per owner: change in this coin (raw) and in SOL (lamports + wrapped SOL); plus the pool/curve side of any swap
  const pre = new Map(), post = new Map(), wsol = new Map();
  for (const b of tx?.meta?.preTokenBalances || []) { if (b.mint === mint) pre.set(b.owner, (pre.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount)); else if (b.mint === WSOL) wsol.set(b.owner, (wsol.get(b.owner) || 0) - Number(b.uiTokenAmount.amount)); }
  for (const b of tx?.meta?.postTokenBalances || []) { if (b.mint === mint) post.set(b.owner, (post.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount)); else if (b.mint === WSOL) wsol.set(b.owner, (wsol.get(b.owner) || 0) + Number(b.uiTokenAmount.amount)); }
  const keys = keysOf(tx), solPre = tx?.meta?.preBalances || [], solPost = tx?.meta?.postBalances || [], out = new Map();
  const lam = (o) => { const i = keys.indexOf(o); return i >= 0 ? (solPost[i] || 0) - (solPre[i] || 0) : 0; };
  let venueTok = 0n, venueSol = 0;
  for (const o of new Set([...pre.keys(), ...post.keys()])) {
    const d = (post.get(o) || 0n) - (pre.get(o) || 0n); if (d === 0n) continue;
    if (venue?.has(o)) { venueTok += d; continue; }
    out.set(o, { tok: d, sol: lam(o) + (wsol.get(o) || 0) });
  }
  if (venue) for (const v of venue) venueSol += lam(v) + (wsol.get(v) || 0); // the curve holds SOL as lamports, the pool as wrapped SOL
  // 0.6.2: the create transaction mints the whole supply into the bonding curve, so its raw change was +1B minus what was bought — read as a sale.
  // When a venue's token account is born in this transaction, its real change is minus what everyone else received.
  if (venue && [...venue].some((v) => post.has(v) && !pre.has(v))) { let others = 0n; for (const v of out.values()) others += v.tok; venueTok = -others; }
  return { out, payer: keys[0], ts: tx?.blockTime, slot: tx?.slot, err: tx?.meta?.err, venueTok, venueSol };
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
  chain = chain.then(async () => { current = mint; used = 0; readFail.n = 0; readFail.last = ""; coinStat.lookups++; coinStat.stage = "starting"; const t0 = Date.now();
    const r = await build(mint).catch((e) => ({ ok: false, error: e.message })); r.calls = used; r.ms = Date.now() - t0; coinStat.lastMs = r.ms; if (!r.ok) coinStat.lastErr = r.error;
    if (r.ok) { cache.set(mint, { at: Date.now(), r }); if (cache.size > 100) cache.delete(cache.keys().next().value); }
    try { const dir = process.env.SCOPE_DUMP_DIR || "/root/tracker/data/scope_last"; mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/${mint}.json`, JSON.stringify({ at: Date.now(), r }, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
      const files = readdirSync(dir).map((f) => ({ f, t: statSync(`${dir}/${f}`).mtimeMs })).sort((a, b) => b.t - a.t); for (const x of files.slice(5)) unlinkSync(`${dir}/${x.f}`); } catch {} // 0.4.0: the last 5 lookups, for the data push
    pushDump();
    job.r = r; job.done = true; current = null; coinStat.stage = ""; setTimeout(() => { if (jobs.get(mint) === job) jobs.delete(mint); }, 600_000).unref(); });
  return { ok: false, pending: true, stage: "starting", elapsed: 0 };
}

const BOOK = { grf: "GR (GR2 if a bundle launch)", sn8: "S8 (BL if a bundle launch)", p5e30: "A (AS if it passed)", grad: "every graduation", momentum: "E momentum", k: "K", sn3: "S3", sn4: "S4", gradrec: "gradrec", early: "early" };
const N0 = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
const one = (sql, ...a) => { try { return db ? db.prepare(sql).get(...a) : null; } catch { return null; } };
const all = (sql, ...a) => { try { return db ? db.prepare(sql).all(...a) : []; } catch { return []; } };
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
async function balances(wallets, mint, tokenProg, pctOf) { // current holding of each wallet (its associated token account), 100 per call
  const out = new Map();
  for (const part of chunks(wallets, 100)) { const atas = part.map((w) => ataOf(w, mint, tokenProg)); const v = (await call("getMultipleAccounts", [atas, { encoding: "jsonParsed" }])).value;
    part.forEach((w, i) => { const a = v[i]?.data?.parsed?.info?.tokenAmount; out.set(w, a ? pctOf(BigInt(a.amount)) : 0); }); }
  return out;
}
function decodePool(b) { // PumpSwap pool account: base/quote mints, LP mint, its two token accounts, LP supply
  if (!b || b.length < 243) return null; const pk = (o) => bs58(b.subarray(o, o + 32));
  return { index: b.readUInt16LE(9), creator: pk(11), baseMint: pk(43), quoteMint: pk(75), lpMint: pk(107), baseAcc: pk(139), quoteAcc: pk(171), lpSupply: b.readBigUInt64LE(203), coinCreator: b.length >= 243 ? pk(211) : null };
}
async function venueNow(mint, dec, supply, tokenProg, curve, pool, pairs = []) { // price from the curve or the pool, now
  // 0.4.0: the canonical PumpSwap pool first, then every pool DexScreener lists for the coin (YMB, 23 Oct: "trading on unknown")
  const cands = [pool, ...pairs.filter((x) => x && x !== pool)].slice(0, 4);
  const accs = (await call("getMultipleAccounts", [[curve, ...cands], { encoding: "base64" }])).value, cv = accs[0];
  let complete = null, creator = null, priceSol = null, venue = "unknown", progress = null, poolSol = null, poolUsed = null, P = null;
  if (cv) { const b = Buffer.from(cv.data[0], "base64");
    if (b.length >= 49) { const vTok = b.readBigUInt64LE(8), vSol = b.readBigUInt64LE(16); complete = b[48] === 1; if (b.length >= 81) creator = bs58(b.subarray(49, 81));
      if (!complete && vTok > 0n) { priceSol = (Number(vSol) / 1e9) / (Number(vTok) / 10 ** dec); venue = "bonding curve"; progress = Math.min(100, (Number(b.readBigUInt64LE(32)) / 1e9 / 85) * 100); } } }
  if (complete !== false) for (let i = 0; i < cands.length; i++) { const a = accs[i + 1]; if (!a) continue; const d = decodePool(Buffer.from(a.data[0], "base64")); if (!d || (d.baseMint !== mint && d.quoteMint !== mint) || (d.baseMint !== WSOL && d.quoteMint !== WSOL)) continue;
    const [pa, pb] = (await call("getMultipleAccounts", [[d.baseAcc, d.quoteAcc], { encoding: "jsonParsed" }])).value; const base = Number(pa?.data?.parsed?.info?.tokenAmount?.uiAmount || 0), quote = Number(pb?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    const flip = d.baseMint !== mint, sol = flip ? base : quote; // 0.4.1: the pool with the most SOL wins (not the first found)
    if (base > 0 && quote > 0 && sol > (poolSol || 0)) { priceSol = flip ? base / quote : quote / base; poolSol = sol; venue = "PumpSwap pool"; poolUsed = cands[i]; P = d; } }
  return { cv: !!cv, complete, creator, priceSol, venue, progress, poolSol, pool: poolUsed, poolInfo: P };
}
function readTrades(txs, mint, skip) { // every wallet's change in this coin per transaction
  // 0.3.1: a trade is recognised from the pool / curve side (its tokens went the other way in the same transaction), whoever paid the SOL —
  // wallets that trade through wrapped-SOL accounts or bots were read as transfers before (owner's screenshot, 23 Oct 19:58 UK: "43 trades, 1 buying wallet")
  const out = [];
  for (const tx of txs) { if (!tx || tx.meta?.err) continue; const d = deltas(tx, mint, skip), sig = tx.transaction?.signatures?.[0];
    const moves = [...d.out.entries()], swap = d.venueTok !== 0n;
    const sameSide = (pos) => moves.filter(([, v]) => (pos ? v.tok > 0n : v.tok < 0n)).reduce((a, [, v]) => a + Number(v.tok < 0n ? -v.tok : v.tok), 0) || 1;
    for (const [o, v] of moves) {
      const isBuy = swap && v.tok > 0n && d.venueTok < 0n, isSell = swap && v.tok < 0n && d.venueTok > 0n;
      let kind, solMove;
      if (isBuy || isSell) { kind = isBuy ? "buy" : "sell"; const share = Number(v.tok < 0n ? -v.tok : v.tok) / sameSide(isBuy); solMove = d.venueSol ? -d.venueSol * share : v.sol; }
      else { solMove = v.sol ?? 0; kind = v.tok > 0n ? (solMove < -2e6 ? "buy" : "in") : (solMove > 2e6 ? "sell" : "out"); }
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
  // GMGN runs beside the chain reading (own pace): token info, security, top 100 holders and top 100 traders with GMGN's tags
  const gmP = gmgnOn() ? Promise.all([gget("/v1/token/info", { chain: "sol", address: mint }), gget("/v1/token/security", { chain: "sol", address: mint }), gget("/v1/market/token_top_holders", { chain: "sol", address: mint, limit: "100" }), gget("/v1/market/token_top_traders", { chain: "sol", address: mint, limit: "100" })].map((p) => p.catch((e) => ({ _err: e.message })))) : Promise.resolve(null);
  // DexScreener (free, from the box) — first, because its pool addresses are the fallback for finding the pool
  let pairs = [];
  try { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) }); const j = await r.json();
    const all_ = (j.pairs || []).filter((x) => x.chainId === "solana").sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)), p = all_[0]; pairs = all_.map((x) => x.pairAddress).filter(Boolean);
    if (p) { R.dex = { dex: p.dexId, pair: p.pairAddress, mc: p.marketCap || p.fdv, liq: p.liquidity?.usd, liqSol: p.liquidity?.quote ?? null, vol24: p.volume?.h24, vol1h: p.volume?.h1, ch5m: p.priceChange?.m5, ch1h: p.priceChange?.h1, ch6h: p.priceChange?.h6, ch24: p.priceChange?.h24,
      buys24: p.txns?.h24?.buys, sells24: p.txns?.h24?.sells, name: p.baseToken?.name, symbol: p.baseToken?.symbol, pairCreated: p.pairCreatedAt ? Math.floor(p.pairCreatedAt / 1000) : null, links: [...(p.info?.websites || []).map((w) => w.url), ...(p.info?.socials || []).map((s) => s.url)], pools: all_.slice(0, 5).map((x) => ({ dex: x.dexId, pair: x.pairAddress, liq: x.liquidity?.usd })) };
      if (!solUsd && Number(p.priceNative) > 0 && Number(p.priceUsd) > 0) solUsd = Number(p.priceUsd) / Number(p.priceNative); } } catch {}
  const curve = curveOf(mint), poolAuth = pda(["pool-authority", mint], PUMP);
  const V = await venueNow(mint, dec, supply, tokenProg, curve, poolOf(mint), pairs);
  const pool = V.pool || poolOf(mint), skip = new Set([curve, pool, poolAuth, ...pairs]);
  R.curveProgress = V.progress; R.nowMarket = { venue: V.venue === "unknown" && R.dex ? R.dex.dex + " (from DexScreener)" : V.venue, priceSol: V.priceSol, mcUsd: null, graduated: V.complete, pool, curve, poolSol: V.poolSol, pairs };
  if (!V.cv) R.notes.push("Not a pump.fun coin (no bonding curve): the launch section is skipped; holders and the now section still work.");
  R.solUsd = solUsd; if (V.priceSol && solUsd) R.nowMarket.mcUsd = V.priceSol * supply * solUsd; else if (R.dex?.mc) R.nowMarket.mcUsd = R.dex.mc;
  if (R.dex?.mc && R.nowMarket.mcUsd && (R.nowMarket.mcUsd / R.dex.mc > 3 || R.dex.mc / R.nowMarket.mcUsd > 3)) { R.notes.push(`Our market cap from the pool ($${Math.round(R.nowMarket.mcUsd / 1000)}K) disagrees with DexScreener's ($${Math.round(R.dex.mc / 1000)}K) by more than 3x — DexScreener's is shown; the pool reading is being checked.`); R.nowMarket.mcOurs = R.nowMarket.mcUsd; R.nowMarket.mcUsd = R.dex.mc; R.nowMarket.mcSuspect = true; }

  // liquidity: how much is in the pool, and whether the LP tokens were burned (pump.fun burns them at migration) or who holds them
  if (V.poolInfo) { const P = V.poolInfo; const LQ = { pool, lpMint: P.lpMint, poolSol: V.poolSol, poolUsd: V.poolSol && solUsd ? V.poolSol * solUsd * 2 : null, creator: P.creator, coinCreator: P.coinCreator };
    try { const sup = await call("getTokenSupply", [P.lpMint]); const now = Number(sup?.value?.amount || 0), minted = Number(P.lpSupply); LQ.lpNow = now; LQ.lpMinted = minted;
      LQ.burnedPct = minted > 0 ? Math.max(0, Math.min(100, (1 - now / minted) * 100)) : null;
      if (now > 0) { const lb = (await call("getTokenLargestAccounts", [P.lpMint]))?.value || []; const lo = lb.length ? (await call("getMultipleAccounts", [lb.slice(0, 5).map((x) => x.address), { encoding: "jsonParsed" }])).value : [];
        LQ.lpHolders = lb.slice(0, 5).map((x, i) => ({ owner: lo[i]?.data?.parsed?.info?.owner || x.address, pctOfLp: (Number(x.amount) / now) * 100, pctOfMinted: minted ? (Number(x.amount) / minted) * 100 : null })); } } catch (e) { LQ.err = e.message; }
    R.liquidity = LQ; }

  const mcAt = (solAbs, tokRaw) => (solUsd && tokRaw > 0 ? (solAbs / (tokRaw / 10 ** dec)) * supply * solUsd : null);

  stage("the launch: the dev, the bundle and the first buyers");
  // 4. the launch — 0.6.0 (owner, 24 Oct 14:56 UK: "why are we not finding the bundlers, the dev…"). Privacycoin was created, bundled (19 wallets, 85 SOL)
  //    and graduated inside one second; the bonding curve's signature list began a second later, so the launch was never read and every launch figure showed 0.
  //    The launch transactions now come from three places, merged: (1) the tracker's live record of the coin (the create transaction and every trade it saw),
  //    (2) Helius getTransactionsForAddress oldest-first on the bonding curve — and on the pool when the coin graduated before 60 buyers had bought on the curve,
  //    (3) the newest-first signature walk only where (2) is not available. The result is checked against the tracker's own launch figures.
  let L = null, LT = []; const W = new Map(); // wallet -> profile; LT = every trade read at launch
  const prof = (w) => { let p = W.get(w); if (!p) { p = { wallet: w, role: null, boughtRaw: 0n, solIn: 0, firstTs: null, firstSlot: null, inWindow: false, nowPct: null, ev: [] }; W.set(w, p); } return p; };
  const LS = { tracker: 0, trackerWallets: 0, oldestFirst: null, oldestErr: null, curve: 0, pool: 0, walk: 0, mint: 0, createFound: false, missing: null }; R.launchSrc = LS;
  if (V.cv) {
    const TXM = new Map(), addTx = (tx) => { const s = tx?.transaction?.signatures?.[0]; if (!s || tx.meta?.err) return false; const o = TXM.get(s); if (!o) { TXM.set(s, tx); return true; } if (o.transactionIndex == null && tx.transactionIndex != null) o.transactionIndex = tx.transactionIndex; return false; };
    const curveAtaBorn = (tx) => (tx?.meta?.postTokenBalances || []).some((b) => b.mint === mint && b.owner === curve) && !(tx?.meta?.preTokenBalances || []).some((b) => b.mint === mint && b.owner === curve);
    const isCreate = (tx) => keysOf(tx).includes(curve) && ((tx?.meta?.logMessages || []).some((l) => /^Program log: Instruction: Create(V2)?$/.test(l)) || curveAtaBorn(tx)); // the create log, or the curve's token account coming into being
    // (1) what the tracker saw live
    const trk = tok ? all(`SELECT sig, slot FROM trades WHERE mint=? ORDER BY slot LIMIT 150`, mint) : []; // the launch end of what it saw; the chain read covers the rest
    LS.trackerWallets = tok ? all(`SELECT wallet FROM cluster_wallets WHERE mint=?`, mint).length : 0;
    const wantT = [...new Set([tok?.create_sig, ...trk.map((r) => r.sig)].filter(Boolean))];
    if (wantT.length) { coinStat.stage = `the launch: ${wantT.length} transactions our tracker recorded live`; const got = await batch("getTransaction", wantT.map(TX)); LS.tracker = got.filter((t) => t && addTx(t)).length; }
    const slotZero = () => tok?.create_slot ?? [...TXM.values()].find(isCreate)?.slot ?? null;
    const buyersAfter = () => { const s0 = slotZero(), cr = V.creator || tok?.creator, set = new Set(), at0 = new Set(); if (s0 == null) return 0; const tr = readTrades([...TXM.values()], mint, skip);
      for (const t of tr) if (t.slot <= s0) at0.add(t.wallet); for (const t of tr) if (t.kind === "buy" && t.slot > s0 && t.wallet !== cr && !at0.has(t.wallet)) set.add(t.wallet); return set.size; }; // a bundle wallet buying again later is not a new buyer
    // (2) oldest first
    async function oldest(addr, maxPages) { let token = null, n = 0;
      for (let pg = 0; pg < maxPages; pg++) { let res;
        try { res = await call("getTransactionsForAddress", [addr, { transactionDetails: "full", sortOrder: "asc", limit: 100, maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed", filters: { status: "succeeded" }, ...(token ? { paginationToken: token } : {}) }]); }
        catch (e) { if (/budget|cap|busy/.test(e.message)) throw e; if (pg === 0) { LS.oldestFirst = false; LS.oldestErr = e.message.slice(0, 140); return -1; } break; }
        const data = res?.data || []; for (const t of data) addTx(t); n += data.length; LS.oldestFirst = true; token = res?.paginationToken;
        coinStat.stage = `the launch: ${TXM.size} transactions read, oldest first`; if (!token || data.length < 100 || buyersAfter() >= FIRST_N) break; }
      return n; }
    // (3) the old way: every signature newest-first, then the oldest ones read until enough buyers are found
    async function walk(addr, pages) { const { sigs } = await allSigs(addr, pages); const asc = sigs.filter((s) => !s.err).reverse(); let idx = 0, n = 0;
      while (idx < asc.length && idx < 400 && buyersAfter() < FIRST_N) { const part = asc.slice(idx, idx + 40).filter((s) => !TXM.has(s.signature)); idx += 40; const got = await batch("getTransaction", part.map((s) => TX(s.signature))); for (const t of got) if (t && addTx(t)) n++;
        coinStat.stage = `the launch: ${TXM.size} transactions read`; }
      return { n, total: sigs.length }; }
    try {
      LS.curve = await oldest(curve, 4);
      if (LS.oldestFirst === false) { const w = await walk(curve, 30); LS.walk = w.n; LS.curveTotal = w.total; }
      // the create transaction must be there; if not, look on the mint itself (it is in every create and every trade)
      if (![...TXM.values()].some(isCreate)) { if (LS.oldestFirst) LS.mint = await oldest(mint, 1); else { const w = await walk(mint, 3); LS.mint = w.n; } }
      // still no create transaction: the dev signed it, so look through the dev's own wallet around the creation time GMGN gives
      if (![...TXM.values()].some(isCreate) && tok?.create_slot == null && (V.creator || tok?.creator)) { const devW = V.creator || tok?.creator; let tC = null; try { const g = await gmP; tC = N0(g?.[0]?.creation_timestamp ?? g?.[0]?.open_timestamp); } catch {}
        coinStat.stage = "the launch: looking for the create transaction in the dev's wallet"; LS.devSearched = true; const ds = ((await call("getSignaturesForAddress", [devW, { limit: 1000 }])) || []).filter((x) => !x.err && (tC == null || Math.abs((x.blockTime || 0) - tC) <= 180)).slice(0, tC == null ? 60 : 30);
        const got = await batch("getTransaction", ds.map((x) => TX(x.signature))); for (const t of got) if (t && isCreate(t) && keysOf(t).includes(mint)) { addTx(t); LS.viaDev = true; break; } }
      // the create block itself, read whole: every transaction in them that touches this coin, whatever any address index returns
      const s0b = tok?.create_slot ?? [...TXM.values()].find(isCreate)?.slot;
      if (s0b != null) for (let k = 0; k <= 0; k++) { coinStat.stage = "the launch: reading the create block in full"; // one block only: a full block is several MB
        try { const b = await call("getBlock", [s0b + k, { encoding: "json", maxSupportedTransactionVersion: 1, transactionDetails: "full", rewards: false, commitment: "confirmed" }], 45000); LS.blocksRead = (LS.blocksRead || 0) + 1;
          (b?.transactions || []).forEach((t, i) => { if (t?.meta?.err) return; if (keysOf(t).includes(mint) || (t.meta?.postTokenBalances || []).some((x) => x.mint === mint)) { if (addTx({ ...t, slot: s0b + k, blockTime: b.blockTime, transactionIndex: i })) LS.block = (LS.block || 0) + 1; } }); }
        catch (e) { if (/budget|cap/.test(e.message)) throw e; LS.blockErr = e.message.slice(0, 120); } }
      // graduated before 60 buyers bought on the curve: the next buyers are on the pool
      if (V.complete && buyersAfter() < FIRST_N && pool) { if (LS.oldestFirst) LS.pool = Math.max(0, await oldest(pool, 3)); else LS.pool = (await walk(pool, 30)).n; }
    } catch (e) { R.notes.push("The launch read stopped early: " + e.message); }
    const txAll = [...TXM.values()].sort((a, b) => a.slot - b.slot || (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0));
    const createTx = txAll.find(isCreate); LS.createFound = !!createTx;
    const slot0 = tok?.create_slot ?? createTx?.slot ?? null;
    if (slot0 == null || !txAll.some((t) => t.slot === slot0)) {
      LS.missing = !txAll.length ? "no launch transactions could be read" : slot0 == null ? `the create transaction was not among the ${txAll.length} transactions read (searched the bonding curve, the coin's own address${LS.devSearched ? " and the dev's wallet" : ""})` : `the create block (slot ${slot0}) could not be read — the oldest transaction read is from slot ${txAll[0].slot}`;
      R.notes.push("LAUNCH NOT FOUND: " + LS.missing + ". Dev, bundle, sniper and first-buyer figures are UNKNOWN (not zero)."); }
    else {
      const creator = V.creator || tok?.creator || keysOf(createTx)[0], createTs = tok?.create_ts ?? createTx?.blockTime ?? txAll.find((t) => t.slot === slot0)?.blockTime;
      // read in order until the first FIRST_N buyers after the create block are found (that whole block included)
      const firstBuyers = new Set(), at0 = new Set(); let lastSlot = null, used0 = 0;
      for (const tx of txAll) { if (tx.slot < slot0) continue; if (firstBuyers.size >= FIRST_N && tx.slot !== lastSlot) break;
        const tr = readTrades([tx], mint, skip), op = deltas(tx, mint, new Set([pool, ...pairs].filter((x) => x && x !== curve))).venueTok !== 0n; /* 0.6.4: DexScreener lists the bonding curve as a pair too — it must not count as the pool */ for (const t of tr) t.onPool = op; /* a trade against the pool (after graduation), not the curve */ LT.push(...tr); used0++; lastSlot = tx.slot; for (const t of tr) { if (t.slot === slot0) at0.add(t.wallet); else if (t.kind === "buy" && t.wallet !== creator && !at0.has(t.wallet)) firstBuyers.add(t.wallet); } }
      for (const t of LT) { const p = prof(t.wallet); p.inWindow = true;
        if (p.firstSlot == null) { p.firstSlot = t.slot; p.firstTs = t.ts; }
        if (t.kind === "buy" && p.firstBuySlot == null) p.firstBuySlot = t.slot;
        if (t.kind === "buy" && t.slot === slot0 && !t.onPool) { p.launchRaw = (p.launchRaw || 0n) + t.tok; p.launchSol = (p.launchSol || 0) + -t.sol / 1e9; } // what the dev and bundle took on the curve in the create block
        if (t.kind === "buy" && t.slot === slot0 && t.onPool) p.poolInLaunchBlock = true; // 0.6.2: the coin graduated inside the create block and this wallet bought on the new pool, after the bundle
        if (t.kind === "buy" || t.kind === "in") { p.boughtRaw += t.tok; if (t.kind === "buy") p.solIn += -t.sol / 1e9; }
        p.ev.push({ ts: t.ts, kind: t.kind, raw: t.tok < 0n ? -t.tok : t.tok, sol: t.sol / 1e9, other: t.other, w: true }); }
      for (const p of W.values()) { p.role = p.wallet === creator ? "dev" : p.firstSlot === slot0 && (p.launchRaw || 0n) > 0n ? "bundle" : p.firstSlot === slot0 && !p.poolInLaunchBlock ? "bundle" : p.firstSlot <= slot0 + 4 ? "sniper" : "early";
        p.secAfter = p.firstTs != null ? p.firstTs - createTs : null; p.boughtPct = pctOf(p.boughtRaw); p.launchPct = pctOf(p.launchRaw || 0n); }
      if (!W.has(creator)) { const d = prof(creator); d.role = "dev"; d.boughtPct = 0; d.launchPct = 0; d.noBuy = true; } // the dev is always in the picture, even with no buy
      // 0.6.4: the raw create-block transactions, trimmed, kept in the saved lookup so any launch can be checked by hand later
      R.launchRaw = txAll.filter((t) => t.slot === slot0).slice(0, 12).map((t) => ({ sig: t.transaction?.signatures?.[0], idx: t.transactionIndex ?? null, version: t.version ?? null, payer: keysOf(t)[0], fee: t.meta?.fee,
        logs: (t.meta?.logMessages || []).filter((l) => !/consumed|^Program [1-9A-HJ-NP-Za-km-z]+ (invoke|success)/.test(l)).slice(0, 30).map((l) => l.slice(0, 160)),
        tok: [...deltas(t, mint, skip).out.entries()].map(([o, v]) => [o, pctOf(v.tok), v.sol / 1e9]), venueTok: pctOf(deltas(t, mint, skip).venueTok), venueSol: deltas(t, mint, skip).venueSol / 1e9 }));
      const grp = (r) => [...W.values()].filter((p) => p.role === r), sum = (a, k = "boughtPct") => ({ n: a.filter((p) => (p[k] || 0) > 0).length, pct: a.reduce((x, p) => x + (p[k] || 0), 0), sol: a.reduce((x, p) => x + (k === "launchPct" ? p.launchSol || 0 : p.solIn), 0) });
      const order1 = [...W.values()].filter((p) => p.role !== "dev" && p.role !== "bundle" && p.firstBuySlot != null).sort((a, b) => a.firstSlot - b.firstSlot || (a.firstTs ?? 0) - (b.firstTs ?? 0)).slice(0, FIRST_N);
      order1.forEach((p, i) => { p.rank = i + 1; p.first = true; }); for (const p of W.values()) if (p.role === "dev" || p.role === "bundle") p.first = true;
      L = { createTs, slot0, creator, txs: used0, lastBuyerSec: order1.length ? order1[order1.length - 1].secAfter : null, firstN: order1.length, dev: sum(grp("dev"), "launchPct"), bundle: sum(grp("bundle"), "launchPct"), snipers: sum(grp("sniper")), early: sum(grp("early")), curveTxs: txAll.length };
      L.buyers = [...W.values()].filter((p) => p.boughtRaw > 0n).length; L.onPool = order1.filter((p) => { const e = LT.find((t) => t.wallet === p.wallet && t.kind === "buy"); return e && TXM.get(e.sig) && keysOf(TXM.get(e.sig)).includes(pool); }).length;
      if (V.complete) { const gradTx = txAll.find((t) => (t.meta?.logMessages || []).some((l) => /Instruction: Migrate/.test(l))); L.gradAfterS = gradTx?.blockTime != null && createTs ? gradTx.blockTime - createTs : null;
        // self-check that needs no outside source: a pump.fun curve sells 793.1M tokens before it graduates — the buys we read before the migration must add up to that
        if (gradTx && createTx) { let net = 0n; for (const t of txAll) if (t !== gradTx) net -= deltas(t, mint, new Set([curve])).venueTok; // the curve trades nothing after it completes, so order does not matter
          L.curveSoldRead = pctOf(net); L.curveSoldExpected = pctOf(793_100_000n * 10n ** BigInt(dec)); L.curveComplete = Number(net) >= 0.97 * 793_100_000 * 10 ** dec;
          if (!L.curveComplete) { LS.incomplete = `the buys read before graduation add up to ${L.curveSoldRead.toFixed(1)}% of supply, but the curve sold ${L.curveSoldExpected.toFixed(1)}% before it graduated — ${(L.curveSoldExpected - L.curveSoldRead).toFixed(1)}% of the launch buying was not found`; R.notes.push("LAUNCH INCOMPLETE: " + LS.incomplete + "."); } } }
      // checked against the tracker's own live launch figures (it counts the create block, dev included)
      if (tok && tok.finalized !== 0 && tok.bundle_pct != null) { const ours = L.dev.pct + L.bundle.pct, oursN = grp("dev").concat(grp("bundle")).filter((p) => (p.launchPct || 0) > 0).length, oursSol = L.dev.sol + L.bundle.sol;
        const trkW = all(`SELECT wallet FROM cluster_wallets WHERE mint=?`, mint).map((r) => r.wallet), missW = trkW.filter((w) => !((W.get(w)?.launchPct || 0) > 0));
        L.check = { trackerPct: tok.bundle_pct, trackerWallets: tok.bundle_wallets, trackerSol: tok.bundle_sol, trackerDevSol: tok.dev_buy_sol, oursPct: ours, oursWallets: oursN, oursSol, missing: missW.slice(0, 20), agree: Math.abs(ours - tok.bundle_pct) <= 2 && missW.length === 0 }; L.check.pctAgree = Math.abs(ours - tok.bundle_pct) <= 2;
        if (!L.check.agree) R.notes.push(`Launch check: our tracker saw ${tok.bundle_pct.toFixed(1)}% bought in the create block by ${tok.bundle_wallets} wallets; this read found ${ours.toFixed(1)}% by ${oursN}${missW.length ? " (" + missW.length + " of the tracker's wallets missing)" : ""}.`); }
    }
  }
  R.launch = L;

  // ===== 0.5.0 (owner, 24 Oct 00:57 UK: "cover every technique — sell the bundle and replace it with other wallets, transfers to side wallets, snipers, the first 60 properly") =====
  // 5. holdings from EVERY token account on the coin (Helius DAS, up to 10,000 accounts): owner → amount. Tokens parked outside a wallet's standard account count too.
  stage("holders: reading every token account");
  const HM = new Map(), HACC = new Map(); let hmComplete = false;
  try { for (let page = 1; page <= 10; page++) { charge("getTokenAccounts"); const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccounts", params: { mint, limit: 1000, page, options: { showZeroBalance: false } } }), 1, 20000);
      const accs = j?.result?.token_accounts || []; for (const a of accs) { const amt = BigInt(a.amount || 0); if (amt > 0n && a.owner) { HM.set(a.owner, (HM.get(a.owner) || 0n) + amt); if (!HACC.has(a.owner)) HACC.set(a.owner, []); HACC.get(a.owner).push(a.address); } }
      coinStat.stage = `holders: ${HM.size} wallets read`; if (accs.length < 1000) { hmComplete = true; break; } } } catch (e) { R.notes.push("The full holder list could not be read: " + e.message); }
  const isVenue = (w) => w === pool || w === poolAuth || w === curve || pairs.includes(w);
  const holdPct = (w) => (HM.has(w) ? pctOf(HM.get(w)) : hmComplete ? 0 : null);
  async function fillNow(list) { const miss = []; for (const p of list) { const v = holdPct(p.wallet); if (v == null) miss.push(p); else p.nowPct = v; }
    if (miss.length) { const b = await balances(miss.map((p) => p.wallet), mint, tokenProg, pctOf); for (const p of miss) p.nowPct = b.get(p.wallet) ?? 0; } }
  await fillNow([...W.values()]);
  if (!hmComplete && HM.size) R.notes.push(`More than ${HM.size.toLocaleString("en-GB")} holders: holdings of wallets outside the first 10,000 token accounts are read one by one.`);

  // 6. holders now: the biggest owners (not token accounts) from that list
  stage("holders now");
  const ranked = [...HM.entries()].sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0));
  let holders = ranked.slice(0, 30).map(([owner, amt]) => ({ owner, pct: pctOf(amt), label: isVenue(owner) ? (owner === curve ? "bonding curve" : "PumpSwap pool") : W.get(owner)?.role || "" }));
  if (!ranked.length) { const big = (await call("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]))?.value || []; const owners = big.length ? (await call("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }])).value : [];
    holders = big.map((b, i) => ({ owner: owners[i]?.data?.parsed?.info?.owner || null, pct: pctOf(BigInt(b.amount)) })).filter((h) => h.owner).map((h) => ({ ...h, label: isVenue(h.owner) ? (h.owner === curve ? "bonding curve" : "PumpSwap pool") : W.get(h.owner)?.role || "" })); }
  const real = holders.filter((h) => !/pool|curve/.test(h.label));
  for (const h of real) { const p = prof(h.owner); p.nowPct = h.pct; p.topHolder = true; }
  const nonVenue = ranked.filter(([o]) => !isVenue(o)).length;
  R.holders = { top: holders, top10Pct: real.slice(0, 10).reduce((a, h) => a + h.pct, 0), top20Pct: real.slice(0, 20).reduce((a, h) => a + h.pct, 0), largestPct: real[0]?.pct ?? null, count: hmComplete ? nonVenue : nonVenue ? nonVenue.toLocaleString("en-GB") + "+" : null };

  stage("who is buying now");
  // 7. who is buying now: the last 100 trades on the pool (or the curve)
  let recent = null;
  try { const venueAddr = V.complete ? pool : curve; const sg = ((await call("getSignaturesForAddress", [venueAddr, { limit: 150 }])) || []).filter((x) => !x.err).slice(0, 100);
    const tr = readTrades(await batch("getTransaction", sg.map((x) => TX(x.signature))), mint, skip); const B = new Map(); let sells = 0, from = null, to = null;
    for (const t of tr) { from = from == null ? t.ts : Math.min(from, t.ts); to = Math.max(to || 0, t.ts);
      if (t.kind === "buy") { const b = B.get(t.wallet) || { wallet: t.wallet, sol: 0, buys: 0, last: 0, first: Infinity, raw: 0n }; b.sol += -t.sol / 1e9; b.buys++; b.last = Math.max(b.last, t.ts); b.first = Math.min(b.first, t.ts); b.raw += t.tok; B.set(t.wallet, b); } else if (t.kind === "sell") sells++; }
    const list = [...B.values()].sort((a, b) => b.sol - a.sol).map((b) => ({ wallet: b.wallet, sol: +b.sol.toFixed(3), buys: b.buys, last: b.last, first: b.first, pct: pctOf(b.raw) }));
    recent = { from, to, trades: sg.length, buyers: list.length, sells, list: list.slice(0, 60), lastSig: sg[0]?.signature || null, venueAddr };
    for (const b of recent.list) { const q = prof(b.wallet); q.recentSol = b.sol; q.recentFirst = b.first; if (q.nowPct == null) q.nowPct = holdPct(b.wallet); } } catch (e) { R.notes.push("Recent buyers could not be read: " + e.message); }

  // 8. what each wallet did on this coin: the full history of its token account(s) — dev, bundle and the first 3 blocks 40 transactions, the first 60 buyers 15,
  //    the 30 biggest holders and recent buyers 10. Then the wallets they sent tokens to, and the wallets THOSE sent tokens to (side wallets, two steps).
  const RO = { dev: 0, bundle: 1, sniper: 2 };
  for (const p of W.values()) if (p.firstSlot != null && L) p.blockAfter = p.firstSlot - L.slot0;
  const early3 = (p) => p.blockAfter != null && p.blockAfter <= 3 && p.firstBuySlot != null;
  const RK = (p) => (p.role === "dev" ? 0 : p.role === "bundle" ? 1 : early3(p) ? 2 : p.first ? 3 : p.topHolder ? 4 : 9);
  const order = [...W.values()].sort((a, b) => RK(a) - RK(b) || (a.rank ?? 1e9) - (b.rank ?? 1e9) || (b.nowPct || 0) - (a.nowPct || 0) || (b.recentSol || 0) - (a.recentSol || 0));
  const depth = (p) => (RK(p) <= 2 ? 40 : p.first ? 25 : 10);
  async function readHist(list, label) {
    if (!list.length) return; coinStat.stage = label;
    const acct = (p) => [...new Set([...(HACC.get(p.wallet) || []), ataOf(p.wallet, mint, tokenProg)])].slice(0, 3);
    const jobsH = []; list.forEach((p, i) => { for (const a of acct(p)) jobsH.push([i, a]); });
    const sigLists = await batch("getSignaturesForAddress", jobsH.map(([i, a]) => [a, { limit: depth(list[i]) }]));
    const want = new Map(); jobsH.forEach(([i], k) => { const s = (sigLists[k] || []).filter((x) => !x.err); if (s.length >= depth(list[i])) list[i].histPartial = true; for (const x of s) want.set(i + ":" + x.signature, [i, x.signature]); });
    const W2 = [...want.values()], htx = await batch("getTransaction", W2.map(([, s]) => TX(s)));
    list.forEach((p) => { p.ev = []; p.histRead = true; });
    W2.forEach(([i, s], k) => { const tx = htx[k]; if (!tx) return; const t = readTrades([tx], mint, skip).find((x) => x.wallet === list[i].wallet); if (!t) return;
      list[i].ev.push({ ts: t.ts, slot: t.slot, kind: t.kind, raw: t.tok < 0n ? -t.tok : t.tok, sol: t.sol / 1e9, other: t.other, sig: s }); });
  }
  stage("what each wallet did on this coin");
  await readHist(order.filter((p) => RK(p) <= 3 || (p.topHolder && (p.nowPct || 0) >= 0.2)).slice(0, 110), "what each wallet did on this coin (dev, bundle, first buyers, big holders)");
  const sentOf = (p) => [...new Set((p.ev || []).filter((e) => e.kind === "out" && e.other && !isVenue(e.other)).map((e) => e.other))];
  // side wallets, step 1 and step 2
  const nextSide = (ws) => [...new Set(ws)].filter((w) => { const q = W.get(w); return !isVenue(w) && (!q || (!(RK(q) <= 3) && !(q.role === "side wallet" && q.histRead))); });
  let sideStep = 1, frontier = nextSide([...W.values()].filter((p) => RK(p) <= 3).flatMap(sentOf));
  while (frontier.length && sideStep <= 2) {
    const add = frontier.slice(0, 60).map((w) => { const q = prof(w); if (!q.role || q.role === "early" || q.role === "holder") q.role = "side wallet"; q.sideStep = q.sideStep || sideStep; return q; });
    await fillNow(add); await readHist(add.filter((q) => !q.histRead), `side wallets, step ${sideStep}: ${add.length} wallets`);
    sideStep++; frontier = nextSide(add.flatMap(sentOf));
  }
  for (const p of W.values()) {
    p.ev.sort((a, b) => a.ts - b.ts); const buys = p.ev.filter((e) => e.kind === "buy"), sells = p.ev.filter((e) => e.kind === "sell");
    p.nBuys = buys.length; p.nSells = sells.length; p.sentTo = sentOf(p); p.gotFrom = [...new Set(p.ev.filter((e) => e.kind === "in" && e.other && !isVenue(e.other)).map((e) => e.other))];
    p.soldSol = +sells.reduce((a, e) => a + e.sol, 0).toFixed(2); p.firstSellMc = sells[0] ? mcAt(Math.abs(sells[0].sol), Number(sells[0].raw)) : null; p.firstSellTs = sells[0]?.ts ?? null;
    let sold = false; p.rebought = false; for (const e of p.ev) { if (e.kind === "sell") sold = true; if (e.kind === "buy" && sold) p.rebought = true; }
    const holds = (p.nowPct || 0) > 0.001, got = p.ev.filter((e) => e.kind === "buy" || e.kind === "in").reduce((a, e) => a + Number(e.raw), 0), peak = Math.max(got > 0 ? (got / 10 ** dec / supply) * 100 : 0, p.boughtPct || 0, p.nowPct || 0);
    const movedPct = p.ev.filter((e) => e.kind === "out").reduce((a, e) => a + Number(e.raw), 0) / 10 ** dec / supply * 100; p.movedPct = movedPct;
    p.behaviour = !p.histRead && !p.inWindow ? (holds ? "holds" : "") :
      p.nBuys >= 3 && p.nSells >= 3 ? `trading in and out (${p.nBuys} buys, ${p.nSells} sells)` :
      !holds ? (p.rebought ? "sold, bought back, sold again" : p.sentTo.length && !p.nSells ? "moved it all to other wallets" : p.sentTo.length ? "sold some, moved the rest" : p.nSells ? "sold out" : "holds none") :
      p.rebought ? "sold, then bought back" : p.nSells && (p.nowPct || 0) >= peak * 0.97 ? `holding (sold only a sliver: ${sells.reduce((a, e) => a + Number(e.raw), 0) / 10 ** dec / supply * 100 < 0.01 ? "under 0.01" : (sells.reduce((a, e) => a + Number(e.raw), 0) / 10 ** dec / supply * 100).toFixed(2)}% of supply)` : p.nSells ? `selling (holds ${Math.round(((p.nowPct || 0) / (peak || 1)) * 100)}% of what it had)` : p.sentTo.length ? "moved some to other wallets" : p.nBuys > 1 && (p.nowPct || 0) > (p.boughtPct || 0) * 1.05 ? "still buying" : "holding, never sold";
    p.events = p.ev.slice(-40).map((e) => ({ ts: e.ts, kind: e.kind, pct: pctOf(e.raw), sol: +e.sol.toFixed(3), mc: e.kind === "buy" || e.kind === "sell" ? mcAt(Math.abs(e.sol), Number(e.raw)) : null, other: e.other, sig: e.sig }));
  }
  for (const p of W.values()) if (p.role === "side wallet") { p.gotFrom = [...new Set([...(p.gotFrom || []), ...[...W.values()].filter((q) => q.sentTo?.includes(p.wallet)).map((q) => q.wallet)])]; if (!p.behaviour || p.behaviour === "holds none" || p.behaviour === "holds") p.behaviour = ((p.nowPct || 0) > 0.001 ? "holds " : "held ") + "tokens from " + p.gotFrom.map((w) => w.slice(0, 4)).join(", "); }
  for (const p of W.values()) { if (!(RK(p) <= 3)) continue; const sw = new Set(); const walk = (w, d) => { for (const x of W.get(w)?.sentTo || []) if (!sw.has(x) && W.get(x)?.role === "side wallet") { sw.add(x); if (d < 2) walk(x, d + 1); } }; walk(p.wallet, 1);
    p.sideN = sw.size; p.sideHoldPct = [...sw].reduce((a, w) => a + (W.get(w).nowPct || 0), 0); }
  const hourAgo = R.now - 3600, halfHour = R.now - 1800;
  for (const p of W.values()) { const sells = (p.events || []).filter((e) => e.kind === "sell"); p.soldPct = sells.reduce((a, e) => a + (e.pct || 0), 0); p.soldPct1h = sells.filter((e) => e.ts >= hourAgo).reduce((a, e) => a + (e.pct || 0), 0); p.lastSell = sells.length ? sells[sells.length - 1].ts : null; p.sellingNow = !!(p.lastSell && p.lastSell >= halfHour); }

  // 9. who funded each wallet: its first-ever funding AND the funding just before it first touched this coin (old wallets get re-funded for a launch);
  //    a funding transaction that pays three or more wallets at once is a disperser — everyone it paid is one owner.
  const EDGES = [], edge = (a, b, why, sig, strong = true) => { if (a && b && a !== b) EDGES.push({ a, b, why, sig: sig || null, strong }); };
  const pureSol = (tx, w) => !(tx?.meta?.preTokenBalances || []).concat(tx?.meta?.postTokenBalances || []).some((b) => b.owner === w);
  const flows = (tx) => { const keys = keysOf(tx), pre = tx?.meta?.preBalances || [], post = tx?.meta?.postBalances || []; return keys.map((k, i) => ({ k, d: (post[i] || 0) - (pre[i] || 0) })); };
  function inflow(tx, w) { // who paid w in this transaction (pure SOL), and everyone else paid in the same transaction
    if (!tx || tx.meta?.err || !pureSol(tx, w)) return null; const f = flows(tx), me = f.find((x) => x.k === w); if (!me || me.d < 1e7) return null;
    const payer = f.filter((x) => x.k !== w && x.d < 0).sort((a, b) => a.d - b.d)[0]; if (!payer) return null;
    const paid = f.filter((x) => x.k !== payer.k && x.d >= 1e7 && !isVenue(x.k)).map((x) => x.k);
    return { funder: payer.k, sol: me.d / 1e9, ts: tx.blockTime, sig: tx.transaction?.signatures?.[0], paid };
  }
  const PROF = new Map(), sigCount = new Map(), PIC = new Set();
  async function profile(w, touchTs) {
    if (PROF.has(w)) return PROF.get(w); const P = { w };
    const s = (await call("getSignaturesForAddress", [w, { limit: 1000 }])) || []; P.sigs = s; P.txs = s.length; P.old = s.length >= 1000; sigCount.set(w, s.length);
    if (s.length) { P.firstTs = P.old ? null : s[s.length - 1].blockTime;
      const cand = []; if (!P.old) cand.push(s[s.length - 1].signature);
      if (touchTs) for (const x of s.filter((x) => x.blockTime != null && x.blockTime < touchTs && !x.err).slice(0, 4)) cand.push(x.signature); // the last few transactions before it first touched this coin
      const txs = await batch("getTransaction", [...new Set(cand)].map(TX));
      for (const tx of txs) { const f = inflow(tx, w); if (!f) continue;
        if (!P.old && tx?.transaction?.signatures?.[0] === s[s.length - 1].signature) P.first = f; else if (!P.pre || f.ts > P.pre.ts) P.pre = f; } }
    PROF.set(w, P); return P;
  }
  stage("who funded each wallet");
  const touch = (p) => p.firstTs ?? p.recentFirst ?? (p.events || [])[0]?.ts ?? null;
  const toProf = order.filter((p) => RK(p) <= 4 || p.role === "side wallet" || p.recentSol != null).slice(0, 170); for (const p of toProf) PIC.add(p.wallet);
  let np = 0; await Promise.all(Array.from({ length: 4 }, async () => { while (np < toProf.length) { const p = toProf[np++]; try { await profile(p.wallet, touch(p)); } catch (e) { if (/budget|cap|busy/.test(e.message)) { R.notes.push(e.message + " — funding is partial."); return; } } coinStat.stage = `who funded each wallet (${PROF.size} of ${toProf.length})`; } }));
  const ref = L?.createTs || tok?.create_ts || R.now;
  for (const p of W.values()) { const P = PROF.get(p.wallet); if (!P) continue; p.ageAtLaunchH = P.firstTs ? +((ref - P.firstTs) / 3600).toFixed(1) : null; p.ageH = P.firstTs ? +((R.now - P.firstTs) / 3600).toFixed(1) : null;
    p.fresh = !!(P.firstTs != null && !P.old && P.firstTs > ref - FRESH); p.funder = (P.pre || P.first)?.funder || null; p.fundedSol = (P.pre || P.first)?.sol ?? null; p.firstFunder = P.first?.funder || null; p.preFunder = P.pre?.funder || null; p.walletTxs = P.txs; }
  // busy funders (1,000+ transactions — exchanges, routers): shared by strangers, so never proof of one owner on their own
  const funderUse = new Map(); for (const P of PROF.values()) for (const f of [P.first, P.pre]) if (f) funderUse.set(f.funder, (funderUse.get(f.funder) || 0) + 1);
  const busy = new Set(); let nf = 0; const fList = [...funderUse.keys()].filter((f) => !PROF.has(f) || !PROF.get(f).sigs).slice(0, 80);
  await Promise.all(Array.from({ length: 4 }, async () => { while (nf < fList.length) { const f = fList[nf++]; try { const s = sigCount.has(f) ? sigCount.get(f) : ((await call("getSignaturesForAddress", [f, { limit: 1000 }])) || []).length; sigCount.set(f, s); if (s >= 1000) busy.add(f); } catch { return; } } }));
  for (const P of PROF.values()) if (P.old) busy.add(P.w);
  // 0.6.0: exchanges by name — GMGN says which exchange paid each top holder its first SOL (native_transfer.from_address + name). A named exchange is never proof of one owner.
  const EXN = new Map(); try { const GX = await gmP; if (GX) for (const d of [GX[2], GX[3]]) for (const x of (d?.list || (Array.isArray(d) ? d : []))) { const nt = x?.native_transfer; if (nt?.from_address && nt.name) EXN.set(nt.from_address, String(nt.name)); } } catch {}
  for (const a of EXN.keys()) busy.add(a); R.exchanges = Object.fromEntries(EXN);
  const exName = (a) => EXN.get(a) || (busy.has(a) ? "a busy exchange-like wallet" : null);
  // strong links from funding: funded by a wallet in the picture, the same non-busy funder, or the same disperser transaction
  const inPic = (w) => W.has(w);
  const byFunder = new Map(), byDisp = new Map();
  for (const P of PROF.values()) for (const f of [P.first, P.pre]) { if (!f || !PIC.has(P.w)) continue;
    if (inPic(f.funder)) edge(P.w, f.funder, `funded by ${W.get(f.funder)?.role || "a wallet in this list"} ${f.funder.slice(0, 4)} (${f.sol.toFixed(2)} SOL)`, f.sig);
    else if (!busy.has(f.funder)) { if (!byFunder.has(f.funder)) byFunder.set(f.funder, []); byFunder.get(f.funder).push({ w: P.w, f }); }
    if (f.paid.length >= 3) { if (!byDisp.has(f.sig)) byDisp.set(f.sig, new Set()); byDisp.get(f.sig).add(P.w); for (const x of f.paid) if (inPic(x)) byDisp.get(f.sig).add(x); } }
  for (const [fd, l] of byFunder) if (l.length >= 2) for (let i = 1; i < l.length; i++) edge(l[0].w, l[i].w, `same funder ${fd.slice(0, 4)}`, l[i].f.sig);
  for (const [sig, set] of byDisp) { const a = [...set]; if (a.length >= 2) for (let i = 1; i < a.length; i++) edge(a[0], a[i], `paid in one disperser transaction (${a.length} of these wallets)`, sig); }
  // 0.6.0 probable links that exchanges hide: (a) one busy, UNNAMED wallet paid three or more of the launch wallets within six hours;
  //   (b) an exchange-funded farm: four or more fresh launch wallets (dev, bundle, first buyers) got their first SOL from exchanges inside three hours.
  { const launchW = [...W.values()].filter((p) => p.first && PROF.get(p.wallet)), fmt = (sec) => sec >= 3600 ? `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min` : `${Math.round(sec / 60)} min`;
    const byBusy = new Map(); for (const p of launchW) { const P = PROF.get(p.wallet); for (const f of [P.first, P.pre]) if (f && busy.has(f.funder) && !EXN.has(f.funder)) { if (!byBusy.has(f.funder)) byBusy.set(f.funder, new Map()); byBusy.get(f.funder).set(p.wallet, f); } }
    for (const [fd, m] of byBusy) { const l = [...m.entries()].sort((a, b) => a[1].ts - b[1].ts); for (let i = 0; i < l.length; i++) { const win = l.filter((x) => x[1].ts >= l[i][1].ts && x[1].ts - l[i][1].ts <= 6 * 3600); if (win.length < 3) continue;
        for (let k = 1; k < win.length; k++) edge(win[0][0], win[k][0], `probable: the same busy wallet ${fd.slice(0, 4)} (not a named exchange) paid ${win.length} of the launch wallets within ${fmt(win[win.length - 1][1].ts - win[0][1].ts)}`, win[k][1].sig, false); break; } }
    const farm = launchW.map((p) => ({ p, f: PROF.get(p.wallet).first })).filter((x) => x.f && busy.has(x.f.funder) && x.p.ageAtLaunchH != null && x.p.ageAtLaunchH <= 72).sort((a, b) => a.f.ts - b.f.ts);
    let best = []; for (let i = 0; i < farm.length; i++) { const win = farm.filter((x) => x.f.ts >= farm[i].f.ts && x.f.ts - farm[i].f.ts <= 3 * 3600); if (win.length > best.length) best = win; }
    if (best.length >= 4) { const names = [...new Set(best.map((x) => EXN.get(x.f.funder) || "unnamed busy wallet"))], span = best[best.length - 1].f.ts - best[0].f.ts, before = ref - best[best.length - 1].f.ts;
      R.exchangeFarm = { n: best.length, wallets: best.map((x) => x.p.wallet), names, spanS: span, hoursBefore: +(before / 3600).toFixed(1), from: best[0].f.ts, to: best[best.length - 1].f.ts, holdNow: best.reduce((a, x) => a + (x.p.nowPct || 0), 0) };
      for (let k = 1; k < best.length; k++) edge(best[0].p.wallet, best[k].p.wallet, `probable: ${best.length} fresh launch wallets got their first SOL from exchanges (${names.slice(0, 4).join(", ")}) within ${fmt(span)}, ${fmt(before)} before launch`, best[k].f.sig, false); } }
  // funding chains: the funder's own funder (one more step) for non-busy funders
  stage("funding chains");
  const hop2 = new Map(); let nh = 0; const hList = [...byFunder.keys()].slice(0, 40);
  await Promise.all(Array.from({ length: 3 }, async () => { while (nh < hList.length) { const f = hList[nh++]; try { const P = await profile(f, null); const g = P.first?.funder; if (g && !busy.has(g) && !(P.old)) { if (!hop2.has(g)) hop2.set(g, []); hop2.get(g).push(f); } } catch { return; } } }));
  for (const [g, fs] of hop2) if (fs.length >= 2) { const ws = fs.flatMap((f) => byFunder.get(f).map((x) => x.w)); for (let i = 1; i < ws.length; i++) edge(ws[0], ws[i], `funding chain: both funded from ${g.slice(0, 4)} two steps back`, null); }
  for (const [g, fs] of hop2) if (inPic(g)) for (const f of fs) for (const x of byFunder.get(f)) edge(x.w, g, `funded from ${W.get(g)?.role || "a wallet in this list"} ${g.slice(0, 4)} through ${f.slice(0, 4)}`, null);
  // token transfers are always the same owner (or a sale off-market)
  for (const p of W.values()) for (const o of p.sentTo || []) { const e = (p.events || []).find((x) => x.kind === "out" && x.other === o); edge(p.wallet, o, "tokens sent " + (W.get(o)?.role === "side wallet" ? "to a side wallet" : "between them"), e?.sig); }
  if (L?.creator) for (const p of W.values()) if (p.role === "bundle") edge(L.creator, p.wallet, "bought in the create block with the dev", null);

  // 10. sell and replace — 0.5.2 (owner, 24 Oct 01:48 UK: "where the 60 wallets sold and rebought, or moved via fresh wallets… how the dev split his wallet and the bundles"):
  //     the dev and every bundle wallet are followed from the moment of launch (they often fund fresh wallets before selling); every first buyer and side wallet from its first sale.
  //     Two steps of SOL; a receiver is checked on its own token history, so "rebought, then sold again" counts too.
  stage("following the money out of the dev, bundle and first buyers");
  const tracers = order.filter((p) => p.role === "dev" || p.role === "bundle" || ((RK(p) <= 3 || p.role === "side wallet") && p.firstSellTs)).slice(0, 90);
  const sent = []; // { from, to, sol, ts, sig, step, root }
  async function outflows(w, afterTs, limitTx) { let P = PROF.get(w); if (!P) P = await profile(w, null); const s = (P.sigs || []).filter((x) => !x.err && x.blockTime != null && x.blockTime >= afterTs).reverse().slice(0, limitTx);
    const txs = await batch("getTransaction", s.map((x) => TX(x.signature))); const out = [];
    for (const tx of txs) { if (!tx || tx.meta?.err) continue; const f = flows(tx), me = f.find((x) => x.k === w); if (!me || me.d > -5e7) continue;
      const bought = readTrades([tx], mint, skip).find((t) => t.wallet === w && t.kind === "buy"); if (bought) continue; // its own rebuy of this coin, not a transfer
      for (const r of f.filter((x) => x.k !== w && x.d >= 5e7 && !isVenue(x.k))) out.push({ to: r.k, sol: r.d / 1e9, ts: tx.blockTime, sig: tx.transaction?.signatures?.[0], swap: !pureSol(tx, w) }); }
    return out; }
  let ns = 0; await Promise.all(Array.from({ length: 4 }, async () => { while (ns < tracers.length) { const p = tracers[ns++]; const fromTs = p.role === "dev" || p.role === "bundle" ? (L?.createTs ?? p.firstTs ?? 0) : p.firstSellTs;
      try { for (const o of await outflows(p.wallet, fromTs, p.role === "dev" || p.role === "bundle" ? 40 : 25)) if (!o.swap) sent.push({ from: p.wallet, ...o, step: 1, root: p.wallet, beforeSale: !p.firstSellTs || o.ts < p.firstSellTs }); } catch (e) { if (/budget|cap/.test(e.message)) return; }
      coinStat.stage = `following the money (${ns} of ${tracers.length} wallets)`; } }));
  const step1 = [...new Map(sent.filter((x) => x.sol >= 0.1 && !W.get(x.to)?.first).map((x) => [x.to, x])).values()].slice(0, 80); let n2 = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (n2 < step1.length) { const x = step1[n2++]; try { const P = await profile(x.to, null); if (P.old) { x.exchange = true; continue; }
        for (const o of await outflows(x.to, x.ts, 12)) if (!o.swap) sent.push({ from: x.to, ...o, step: 2, root: x.root, beforeSale: x.beforeSale }); } catch (e) { if (/budget|cap/.test(e.message)) return; } } }));
  // did a receiver buy this coin (now or earlier), and does it still hold?
  const recv = [...new Set(sent.map((x) => x.to))].filter((w) => !busy.has(w) && !isVenue(w));
  const recvW = recv.map((w) => ({ wallet: w })); await fillNow(recvW);
  const knownBuy = new Set([...(recent?.list || []).map((b) => b.wallet), ...LT.filter((t) => t.kind === "buy").map((t) => t.wallet), ...[...W.values()].filter((p) => (p.nBuys || 0) > 0).map((p) => p.wallet)]);
  const check = recvW.filter((r) => !W.get(r.wallet)?.first).sort((a, b) => Number(knownBuy.has(b.wallet)) - Number(knownBuy.has(a.wallet))).slice(0, 80); // known buyers first: their sell-again is what we need
  if (check.length) { coinStat.stage = `checking ${check.length} receiving wallets for buys of this coin`;
    const sl = await batch("getSignaturesForAddress", check.map((r) => [ataOf(r.wallet, mint, tokenProg), { limit: 10 }])); const jobsR = []; check.forEach((r, i) => { for (const x of (sl[i] || []).filter((y) => !y.err)) jobsR.push([r, x.signature]); });
    const tx2 = await batch("getTransaction", jobsR.map(([, s]) => TX(s)));
    jobsR.forEach(([r], k) => { for (const t of readTrades([tx2[k]], mint, skip)) if (t.wallet === r.wallet) { if (t.kind === "buy") { r.bought = true; r.solIn = (r.solIn || 0) + -t.sol / 1e9; } if (t.kind === "sell") { r.sold = true; r.solOut = (r.solOut || 0) + t.sol / 1e9; } } }); }
  const replaced = [];
  for (const r of recvW) { const holds = (r.nowPct || 0) > 0.001, bought = r.bought || knownBuy.has(r.wallet); if (!holds && !bought) continue;
    const x = sent.filter((s) => s.to === r.wallet).sort((a, b) => a.step - b.step || b.sol - a.sol)[0], root = W.get(x.root);
    if (W.get(r.wallet)?.first) { replaced.push({ wallet: r.wallet, from: x.root, fromRole: root?.role || "", fromRank: root?.rank || null, via: x.step === 2 ? x.from : null, sol: x.sol, ts: x.ts, sig: x.sig, holds: r.nowPct ?? W.get(r.wallet).nowPct, bought: true, soldAgain: (W.get(r.wallet).nSells || 0) > 0, beforeSale: !!x.beforeSale, isFirst: true, toRank: W.get(r.wallet).rank || null, toRole: W.get(r.wallet).role });
      edge(x.root, r.wallet, `received ${x.sol.toFixed(2)} SOL from ${root?.role || "a"} wallet ${x.root.slice(0, 4)} after launch${x.step === 2 ? " through " + x.from.slice(0, 4) : ""} — both are among the first buyers`, x.sig); continue; } const q = prof(r.wallet); if (q.nowPct == null || q.nowPct < r.nowPct) q.nowPct = r.nowPct; if (!q.role || q.role === "early") q.role = q.role || "rebuyer"; q.rebuyer = true;
    replaced.push({ wallet: r.wallet, from: x.root, fromRole: root?.role || "", fromRank: root?.rank || null, via: x.step === 2 ? x.from : null, sol: x.sol, ts: x.ts, sig: x.sig, holds: r.nowPct, bought, soldAgain: !!r.sold, beforeSale: !!x.beforeSale });
    edge(x.root, r.wallet, `received ${x.sol.toFixed(2)} SOL from ${root?.role || "a"} wallet ${x.root.slice(0, 4)}${x.beforeSale ? " (before it sold)" : " after its sale"}${x.step === 2 ? " through " + x.from.slice(0, 4) : ""} and ${bought ? "bought" : "holds"} this coin${r.sold ? " (then sold again)" : ""}`, x.sig); }
  R.replaced = replaced; R.saleTrail = { sellers: tracers.length, transfers: sent.length, toExchanges: step1.filter((x) => x.exchange).length, receiversChecked: recvW.length };


  // 11. probable links (shown separately, never counted as insiders on their own): same exchange + near-identical amount + within 15 min; identical buy sizes in the launch window
  const exByF = new Map(); for (const P of PROF.values()) { const f = P.pre || P.first; if (f && PIC.has(P.w) && busy.has(f.funder)) { if (!exByF.has(f.funder)) exByF.set(f.funder, []); exByF.get(f.funder).push({ w: P.w, f }); } }
  for (const [ex, l] of exByF) { l.sort((a, b) => a.f.ts - b.f.ts); for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length && l[j].f.ts - l[i].f.ts <= 900; j++) if (Math.abs(l[i].f.sol - l[j].f.sol) <= 0.03 * Math.max(l[i].f.sol, l[j].f.sol)) edge(l[i].w, l[j].w, `same exchange ${ex.slice(0, 4)}, ${l[i].f.sol.toFixed(2)} vs ${l[j].f.sol.toFixed(2)} SOL, ${Math.round((l[j].f.ts - l[i].f.ts) / 60)} min apart`, l[j].f.sig, false); }
  const sizeB = new Map(); for (const t of LT) { if (t.kind !== "buy" || !L || t.ts - L.createTs > 60) continue; const sol = Math.round((-t.sol / 1e9) * 100) / 100; if (sol < 0.05) continue; if (!sizeB.has(sol)) sizeB.set(sol, []); sizeB.get(sol).push(t); }
  for (const [sol, l] of sizeB) { const ws = [...new Set(l.map((t) => t.wallet))]; if (ws.length >= 3 && Math.max(...l.map((t) => t.ts)) - Math.min(...l.map((t) => t.ts)) <= 20) for (let i = 1; i < ws.length; i++) edge(ws[0], ws[i], `${ws.length} wallets bought exactly ${sol} SOL within 20 s`, null, false); }

  // 9d. whales: SOL balance and what else each wallet holds (Helius DAS), for the dev, the bundle, the first buyers and the top holders
  stage("whales: SOL balances and other coins");
  const rich = order.filter((p) => RK(p) <= 4).slice(0, 90).map((p) => p.wallet);
  for (const part of chunks(rich, 100)) { const v = (await call("getMultipleAccounts", [part, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }])).value; part.forEach((w, i) => { W.get(w).sol = v[i] ? +(v[i].lamports / 1e9).toFixed(2) : 0; }); }
  let pf = 0; const pfList = rich.slice(0, 75);
  await Promise.all(Array.from({ length: 4 }, async () => { while (pf < pfList.length) { const w = pfList[pf++]; try { charge("getAssetsByOwner"); const j = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAssetsByOwner", params: { ownerAddress: w, page: 1, limit: 100, displayOptions: { showFungible: true, showNativeBalance: true, showZeroBalance: false } } }), 1, 15000);
    const items = j?.result?.items || [], p = W.get(w); let usd = Number(j?.result?.nativeBalance?.total_price || 0); const other = [];
    for (const it of items) { const ti = it.token_info; if (!ti) continue; const v = Number(ti.price_info?.total_price || 0); usd += v; if (it.id !== mint && v > 0) other.push({ mint: it.id, symbol: ti.symbol || it.content?.metadata?.symbol || "?", usd: Math.round(v) }); }
    p.portfolioUsd = Math.round(usd); p.tokenCount = items.filter((it) => it.token_info).length; p.otherCoins = other.sort((a, b) => b.usd - a.usd).slice(0, 4); p.whale = usd >= 10000 || (p.sol || 0) >= 50; coinStat.stage = `whales: ${pf} of ${pfList.length} wallets`; } catch (e) { if (/budget|cap|busy/.test(e.message)) return; } } }));

  // 9e. the dev: age, funding chain (two steps), SOL, every coin he launched before (pump.fun's own list, then our database)
  stage("the dev's history");
  const devAddr = L?.creator || V.creator || tok?.creator || null; // the bonding curve records its creator, so the dev is known even when the launch is not
  if (devAddr) { const D = { wallet: devAddr };
    try { const a = await walletAge(devAddr, true); D.firstTs = a.firstTs; D.txs = a.txs; D.old = !!a.old; D.funder = a.funder || null; D.fundedSol = a.fundedSol ?? null;
      if (D.funder) { const b = await walletAge(D.funder, true); D.funderFirstTs = b.firstTs; D.funderBusy = !!b.old; D.funder2 = b.funder || null; } } catch {}
    try { D.sol = +((await call("getBalance", [devAddr]))?.value / 1e9).toFixed(2); } catch {}
    try { const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${devAddr}?offset=0&limit=100&includeNsfw=true`, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      const j = await r.json(), arr = Array.isArray(j) ? j : j?.coins || [];
      D.coins = arr.map((c) => ({ mint: c.mint, name: c.name, symbol: c.symbol, created: c.created_timestamp ? Math.floor(c.created_timestamp / 1000) : null, mc: c.usd_market_cap ?? null, ath: c.ath_market_cap ?? null, graduated: !!c.complete || !!c.raydium_pool || !!c.pump_swap_pool })).filter((c) => c.mint !== mint).sort((a, b) => (b.created || 0) - (a.created || 0));
      D.source = "pump.fun"; } catch (e) { D.coinsErr = e.message; }
    if (!D.coins?.length) { const rows = all(`SELECT mint, name, symbol, create_ts, peak_mc_usd, graduated FROM tokens WHERE creator=? AND mint<>? ORDER BY create_ts DESC LIMIT 100`, devAddr, mint);
      if (rows.length) { D.coins = rows.map((r) => ({ mint: r.mint, name: r.name, symbol: r.symbol, created: r.create_ts, mc: null, ath: r.peak_mc_usd, graduated: !!r.graduated })); D.source = "our tracker (since 18 Oct" + (D.coinsErr ? "; pump.fun did not answer" : "") + ")"; } }
    D.mkSummary = () => { const dc = D.coins || []; D.summary = { n: D.source ? dc.length : null, graduated: dc.filter((c) => c.graduated).length, best: dc.reduce((m, c) => Math.max(m, c.ath || c.mc || 0), 0), last24h: dc.filter((c) => c.created && c.created > R.now - 86400).length }; };
    D.mkSummary(); const dc = D.coins || []; // 0.6.0: n stays null ("couldn't check") when pump.fun did not answer and nothing else had a list — never "first coin" by default
    D.coins = dc.slice(0, 40); const dp = W.get(devAddr); if (dp) Object.assign(D, { boughtPct: dp.boughtPct, nowPct: dp.nowPct, soldPct: dp.soldPct, soldSol: dp.soldSol, behaviour: dp.behaviour, events: dp.events, sentTo: dp.sentTo });
    R.dev = D; }

  // 12. owners: confirmed groups (strong links only) and probable groups (strong + probable)
  stage("grouping wallets into owners");
  function unionBy(edges) { const par = new Map(), find = (x) => { if (!par.has(x)) par.set(x, x); while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
    for (const e of edges) { const a = find(e.a), b = find(e.b); if (a !== b) par.set(a, b); } return find; }
  for (const e of EDGES) { prof(e.a); prof(e.b); }
  const strongE = EDGES.filter((e) => e.strong), findS = unionBy(strongE), findP = unionBy(EDGES);
  const mk = (find, edges) => { const G = new Map(); for (const p of W.values()) { const r = find(p.wallet); if (!G.has(r)) G.set(r, []); G.get(r).push(p); }
    return [...G.values()].filter((m) => m.length >= 2 || m.some((p) => p.role === "dev")).map((m) => { const set = new Set(m.map((p) => p.wallet)), ev = edges.filter((e) => set.has(e.a) && set.has(e.b));
      return { wallets: m.map((p) => p.wallet), n: m.length, nowPct: m.reduce((a, p) => a + (p.nowPct || 0), 0), boughtPct: m.reduce((a, p) => a + (p.role === "dev" || p.role === "bundle" ? p.launchPct || 0 : p.first ? p.boughtPct || 0 : 0), 0),
        roles: [...new Set(m.map((p) => p.role).filter(Boolean))], fresh: m.filter((p) => p.fresh).length, links: [...new Set(ev.map((e) => e.why.replace(/ \(.*$/, "").replace(/\b(?=[1-9A-HJ-NP-Za-km-z]{4}\b)(?=\w*[A-HJ-NP-Z1-9])\w{4}\b/g, "").replace(/\d+(\.\d+)? ?(SOL|min|h)\b/g, "").replace(/\b\d+\b/g, "N").replace(/\s+/g, " ").replace(/ ,/g, ",").trim()))].slice(0, 6),
        evidence: ev.slice(0, 40).map((e) => ({ a: e.a, b: e.b, why: e.why, sig: e.sig, strong: e.strong })), launch: m.some((p) => p.role === "dev" || p.role === "bundle") }; }).sort((a, b) => b.nowPct - a.nowPct); };
  const groups = mk(findS, strongE); groups.forEach((g, i) => { g.id = i + 1; for (const w of g.wallets) W.get(w).group = g.id; });
  // 10b-trail. where the launch supply went: for the dev, every bundle wallet and each of the first buyers — still held / moved to side wallets / came back through new wallets / sold
  { const owned = new Set(), rows = [];
    const origins = [...W.values()].filter((p) => p.role === "dev" || p.role === "bundle" || p.rank).sort((a, b) => RK(a) - RK(b) || (a.rank ?? 0) - (b.rank ?? 0));
    for (const o of origins) { const start = o.role === "dev" || o.role === "bundle" ? o.launchPct || o.boughtPct || 0 : o.boughtPct || 0;
      const side = []; const walk = (w, d) => { for (const x of W.get(w)?.sentTo || []) { const q = W.get(x); if (!q || owned.has(x) || q.first) continue; owned.add(x); side.push({ wallet: x, pct: q.nowPct || 0, step: d }); if (d < 2) walk(x, d + 1); } }; walk(o.wallet, 1);
      const back = replaced.filter((r) => r.from === o.wallet && !r.isFirst && !owned.has(r.wallet)); const paidBy = replaced.filter((r) => r.wallet === o.wallet).map((r) => ({ wallet: r.from, role: r.fromRole, rank: r.fromRank, sol: r.sol, via: r.via, sig: r.sig })); back.forEach((r) => owned.add(r.wallet));
      rows.push({ wallet: o.wallet, role: o.role, rank: o.rank || null, start, holds: o.nowPct || 0, movedPct: o.movedPct || 0, soldPct: o.soldPct || 0, side, sideHolds: side.reduce((a, x) => a + x.pct, 0),
        back: back.map((r) => ({ wallet: r.wallet, pct: r.holds || 0, sol: r.sol, via: r.via, soldAgain: r.soldAgain, beforeSale: r.beforeSale, sig: r.sig })), backHolds: back.reduce((a, r) => a + (r.holds || 0), 0), histPartial: !!o.histPartial, group: o.group || null, paidBy }); }
    const T = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    R.trail = { rows, start: T("start"), holds: T("holds"), sideHolds: T("sideHolds"), backHolds: T("backHolds"), soldPct: T("soldPct"), movedPct: T("movedPct"), n: rows.length,
      hiddenWallets: rows.reduce((a, r) => a + r.side.length + r.back.length, 0), cut: rows.filter((r) => r.histPartial).length }; }
  const pgroups = mk(findP, EDGES).filter((g) => !groups.some((c) => c.n === g.n && c.wallets[0] && g.wallets.includes(c.wallets[0])));
  R.groups = groups.slice(0, 30); R.probableGroups = pgroups.slice(0, 15).map((g, i) => ({ ...g, id: "P" + (i + 1) })); R.busyFunders = [...busy].slice(0, 50);
  const linkedToLaunch = new Set(groups.filter((g) => g.launch).flatMap((g) => g.wallets)), probLaunch = new Set(pgroups.filter((g) => g.launch).flatMap((g) => g.wallets));
  for (const p of W.values()) { p.launchLinked = linkedToLaunch.has(p.wallet) && p.role !== "dev" && p.role !== "bundle"; p.launchProbable = !linkedToLaunch.has(p.wallet) && probLaunch.has(p.wallet); if (p.launchLinked && early3(p) && p.role === "sniper") p.delayedBundle = true; }
  R.delayedBundle = { n: [...W.values()].filter((p) => p.delayedBundle).length, boughtPct: [...W.values()].filter((p) => p.delayedBundle).reduce((a, p) => a + (p.boughtPct || 0), 0), holdNow: [...W.values()].filter((p) => p.delayedBundle).reduce((a, p) => a + (p.nowPct || 0), 0) };
  R.edgesCount = { strong: strongE.length, probable: EDGES.length - strongE.length };
  // 0.5.1 (owner, 24 Oct 01:40 UK: "how do I know it's correct this time"): what was actually checked, so a zero can never pass for "nothing there"
  { const histT = order.filter((p) => RK(p) <= 3 || (p.topHolder && (p.nowPct || 0) >= 0.2)).slice(0, 110), firstT = [...W.values()].filter((p) => p.rank);
    const picW = [...PIC], fundOk = picW.filter((w) => { const P = PROF.get(w); return P && (P.first || P.pre || P.old); }).length;
    R.coverage = { launchRebuilt: !!L, launchTxs: L?.txs ?? null, curveTxs: L?.curveTxs ?? null, launchSrc: R.launchSrc || null, launchMissing: R.launchSrc?.missing || (V.cv ? null : "not a pump.fun coin"), launchIncomplete: R.launchSrc?.incomplete || null, readFail: readFail.n, readFailLast: readFail.last, curveSoldRead: L?.curveSoldRead ?? null, curveComplete: L?.curveComplete ?? null, launchCheck: L?.check || null, trackerSaw: !!tok, firstFound: firstT.length, firstWanted: FIRST_N,
      histWallets: histT.length, histRead: histT.filter((p) => p.histRead).length, histCut: histT.filter((p) => p.histPartial).length, histDepth: "dev / bundle / first 3 blocks: last 40 transactions · first buyers: last 25 · big holders: last 10",
      profiled: picW.filter((w) => PROF.has(w)).length, profileWanted: picW.length, fundingFound: fundOk, busyFunders: busy.size,
      sellers: R.saleTrail.sellers, sellersWithSales: order.filter((p) => p.role === "dev" || p.role === "bundle" || ((RK(p) <= 3 || p.role === "side wallet") && p.firstSellTs)).length, receiversChecked: R.saleTrail.receiversChecked || 0,
      holdersRead: HM.size, holdersComplete: hmComplete, sideSteps: Math.max(0, ...[...W.values()].map((p) => p.sideStep || 0)), callCapHit: R.notes.some((n) => /hit its .*call cap|budget used up/.test(n)) }; }

  // 10b. our GMGN-style bundle measure: wallets that bought together — in the create block, in the same transaction, or two+ wallets of one owner in the same block
  { const bundledW = new Set(), bySig = new Map(), bySlot = new Map();
    for (const t of LT) { if (t.kind !== "buy") continue; if (t.slot === L?.slot0 && !t.onPool) bundledW.add(t.wallet);
      if (!bySig.has(t.sig)) bySig.set(t.sig, new Set()); bySig.get(t.sig).add(t.wallet);
      const g = W.get(t.wallet)?.group; if (g) { const k = t.slot + ":" + g; if (!bySlot.has(k)) bySlot.set(k, new Set()); bySlot.get(k).add(t.wallet); } }
    for (const set of [...bySig.values(), ...bySlot.values()]) if (set.size >= 2) for (const w of set) bundledW.add(w);
    const raw = LT.filter((t) => t.kind === "buy" && bundledW.has(t.wallet)).reduce((a, t) => a + Number(t.tok), 0);
    R.bundled = !L ? null : { wallets: bundledW.size, boughtPct: (raw / 10 ** dec / supply) * 100, holdNow: [...bundledW].reduce((a, w) => a + (W.get(w)?.nowPct || 0), 0), list: [...bundledW] };
    for (const w of bundledW) { const q = W.get(w); if (q) q.bundled = true; } }

  // 10c. GMGN's view, wallet by wallet and in total — then the two side by side
  stage("GMGN: tags, bundlers, whales");
  const GM = await gmP;
  if (GM) { const [info, sec, hold, trad] = GM, list = (d) => (d?.list || (Array.isArray(d) ? d : [])).filter((w) => w && w.address);
    const hl = list(hold).map(walletRow), tl = list(trad).map(walletRow), byW = new Map();
    for (const x of tl) byW.set(x.wallet, x); for (const x of hl) byW.set(x.wallet, { ...(byW.get(x.wallet) || {}), ...x });
    const realH = hl.filter((x) => !x.pool), has = (x, t) => x.tags.includes(t), share = (f) => realH.filter(f).reduce((a, x) => a + (x.pct || 0), 0), cnt = (f) => realH.filter(f).length;
    const st = info?.stat || {}, wts = info?.wallet_tags_stat || {};
    const devTag = (x) => has(x, "dev") || has(x, "dev_team") || has(x, "creator");
    R.gmgn = { ok: !info?._err, err: info?._err || sec?._err || hold?._err || null, holders: N0(info?.holder_count), top10: fromRate(st.top_10_holder_rate ?? info?.top_10_holder_rate), bundlerShare: fromRate(st.top_bundler_trader_percentage),
      devHold: fromRate(st.dev_team_hold_rate ?? st.creator_hold_rate), freshRate: fromRate(st.fresh_wallet_rate), insiderHold: fromRate(sec?.suspected_insider_hold_rate), rug: fromRate(sec?.rug_ratio ?? info?.rug_ratio), wash: sec?.is_wash_trading ?? info?.is_wash_trading ?? null,
      now: { bundler: share((x) => has(x, "bundler")), sniper: share((x) => has(x, "sniper")), insider: share((x) => has(x, "rat_trader")), fresh: share((x) => has(x, "fresh_wallet") || x.isNew), smart: share((x) => has(x, "smart_degen")), kol: share((x) => has(x, "renowned")), dev: share(devTag), creator: share((x) => has(x, "creator") || has(x, "dev")), pool: hl.filter((x) => x.pool).reduce((a, x) => a + (x.pct || 0), 0) },
      n: { bundler: cnt((x) => has(x, "bundler")), sniper: cnt((x) => has(x, "sniper")), insider: cnt((x) => has(x, "rat_trader")), fresh: cnt((x) => has(x, "fresh_wallet") || x.isNew), smart: cnt((x) => has(x, "smart_degen")), kol: cnt((x) => has(x, "renowned")) },
      tagCounts: facts(wts), facts: { ...facts(st, "stat"), ...facts(sec, "security"), ...facts({ holder_count: info?.holder_count, launchpad: info?.launchpad, creator_token_status: info?.creator_token_status, liquidity: info?.liquidity, circulating_supply: info?.circulating_supply }, "info") } };
    for (const p of W.values()) { const g = byW.get(p.wallet); if (g) p.gm = { tags: g.tags.map((t) => TAG[t] || t), soldPct: g.soldPct, profit: g.profit, realized: g.realized, buyUsd: g.buyUsd, sellUsd: g.sellUsd, isNew: g.isNew, suspicious: g.suspicious, fund: g.fund, tIn: g.tIn, tOut: g.tOut, pct: g.pct }; }
    // wallets GMGN flags that are not in our launch / grouping picture
    R.gmgnOnly = realH.filter((x) => (has(x, "bundler") || has(x, "rat_trader") || has(x, "sniper")) && (x.pct || 0) >= 0.05 && !(W.get(x.wallet)?.first || W.get(x.wallet)?.group)).slice(0, 25).map((x) => ({ wallet: x.wallet, tags: x.tags.map((t) => TAG[t] || t), pct: x.pct, soldPct: x.soldPct, fund: x.fund, isNew: x.isNew }));
    // agreement: of the wallets GMGN calls bundler / insider and that hold, how many we put with the dev / bundle (or in any owner group)
    const flagged = realH.filter((x) => has(x, "bundler") || has(x, "rat_trader")), inOurs = flagged.filter((x) => W.get(x.wallet)?.group || W.get(x.wallet)?.bundled || ["dev", "bundle"].includes(W.get(x.wallet)?.role));
    R.gmgn.agree = { flagged: flagged.length, inOurs: inOurs.length };
    // whales: GMGN wallet stats for the 12 biggest holders and the dev
    const devAddr2 = L?.creator || V.creator || tok?.creator || null, ws2 = [...new Set([...(devAddr2 ? [devAddr2] : []), ...realH.slice(0, 12).map((x) => x.wallet)])];
    await Promise.all(ws2.map(async (w) => { try { const d = walletStats(await gget("/v1/user/wallet_stats", { chain: "sol", wallet_address: w, period: "30d" })); const q = prof(w); q.gmStats = d; if (d && ((d.balanceSol || 0) >= 50 || (d.cost || 0) >= 50000)) q.whale = true; } catch {} }));
    if (devAddr2) { try { const ct = await gget("/v1/user/created_tokens", { chain: "sol", wallet_address: devAddr2 }); const arr = ct?.tokens || ct?.list || (Array.isArray(ct) ? ct : []);
      R.gmgn.devTokens = { n: N0(ct?.token_count ?? ct?.total ?? arr.length), facts: facts(ct?.stat || ct?.summary || {}), list: arr.slice(0, 30).map((t) => ({ mint: t.address || t.token_address, symbol: t.symbol, mc: N0(t.market_cap ?? t.usd_market_cap), ath: N0(t.ath_mc ?? t.ath_market_cap), created: N0(t.created_timestamp ?? t.open_timestamp), graduated: t.is_complete ?? t.complete ?? null })) };
      const DT = R.gmgn.devTokens; DT.others = DT.n == null ? null : DT.list.some((t) => t.mint === mint) ? Math.max(0, DT.n - 1) : DT.n; } catch (e) { R.gmgn.devTokensErr = e.message; } } // GMGN's count includes this coin when it lists it
    // the dev's other coins from GMGN when pump.fun did not answer (its list includes this coin; it is left out)
    if (R.dev && !R.dev.source && R.gmgn.devTokens) { const gl = R.gmgn.devTokens.list.filter((t) => t.mint && t.mint !== mint); R.dev.coins = gl.map((t) => ({ mint: t.mint, name: t.symbol, symbol: t.symbol, created: t.created, mc: t.mc, ath: t.ath, graduated: !!t.graduated }));
      R.dev.source = "GMGN (pump.fun did not answer)"; R.dev.mkSummary(); if (R.gmgn.devTokens.others != null && R.gmgn.devTokens.others > R.dev.summary.n) R.dev.summary.n = R.gmgn.devTokens.others; }
    R.gmgnRaw = { info: facts(info), sec: facts(sec), holdersSample: list(hold).slice(0, 3), tradersSample: list(trad).slice(0, 2), wts };
  } else R.gmgn = { ok: false, err: "no GMGN key on the box" };

  // 11. tables for the page
  const pub = (p) => ({ wallet: p.wallet, role: p.role || (p.topHolder ? "holder" : "buyer"), secAfter: p.secAfter ?? null, boughtPct: p.boughtPct ?? null, solIn: p.solIn ? +p.solIn.toFixed(3) : null, nowPct: p.nowPct, fresh: p.fresh ?? null, ageAtLaunchH: p.ageAtLaunchH ?? null, ageH: p.ageH ?? null,
    funder: p.funder || null, group: p.group || null, launchLinked: !!p.launchLinked, behaviour: p.behaviour, rank: p.rank ?? null, launchPct: p.launchPct ?? null, blockAfter: p.blockAfter ?? null, rebuyer: !!p.rebuyer, sideStep: p.sideStep || null, delayedBundle: !!p.delayedBundle, launchProbable: !!p.launchProbable, movedPct: p.movedPct || 0, firstFunder: p.firstFunder || null, preFunder: p.preFunder || null, gm: p.gm || null, gmStats: p.gmStats || null, bundled: !!p.bundled, sol: p.sol ?? null, portfolioUsd: p.portfolioUsd ?? null, tokenCount: p.tokenCount ?? null, otherCoins: p.otherCoins || [], whale: !!p.whale,
    soldPct: p.soldPct || 0, soldPct1h: p.soldPct1h || 0, lastSell: p.lastSell || null, sellingNow: !!p.sellingNow, sideN: p.sideN || 0, sideHoldPct: p.sideHoldPct || 0, nBuys: p.nBuys, nSells: p.nSells, soldSol: p.soldSol || null, firstSellMc: p.firstSellMc, sentTo: p.sentTo, gotFrom: p.gotFrom, events: p.events, histPartial: !!p.histPartial, noBuy: !!p.noBuy, exchange: p.funder ? EXN.get(p.funder) || null : null });
  R.window = [...W.values()].filter((p) => p.first && p.boughtPct > 0).sort((a, b) => RK(a) - RK(b) || (a.rank ?? 0) - (b.rank ?? 0)).map(pub);
  R.side = [...W.values()].filter((p) => p.role === "side wallet").sort((a, b) => (b.nowPct || 0) - (a.nowPct || 0)).map(pub);
  const wsum = (f) => R.window.filter(f).reduce((a, p) => a + (p.nowPct || 0), 0);
  if (L) R.windowSummary = { buyers: R.window.length, boughtPct: R.window.reduce((a, p) => a + (p.boughtPct || 0), 0), holdNowPct: wsum(() => true), stillHolding: R.window.filter((p) => (p.nowPct || 0) > 0.01).length,
    checked: R.window.filter((p) => p.fresh != null).length, fresh: R.window.filter((p) => p.fresh).length, freshHoldPct: wsum((p) => p.fresh), launchLinked: R.window.filter((p) => p.launchLinked).length, launchLinkedHoldPct: wsum((p) => p.launchLinked),
    devBundleHoldPct: wsum((p) => p.role === "dev" || p.role === "bundle"), sniperHoldPct: wsum((p) => p.role === "sniper"), traders: R.window.filter((p) => /in and out/.test(p.behaviour || "")).length,
    soldPct: R.window.reduce((a, p) => a + (p.soldPct || 0), 0), soldPct1h: R.window.reduce((a, p) => a + (p.soldPct1h || 0), 0), sellers1h: R.window.filter((p) => p.soldPct1h > 0).length, sellingNow: R.window.filter((p) => p.sellingNow).length,
    firstHold: R.window.filter((p) => p.rank && (p.nowPct || 0) > 0.001).length, firstMoved: R.window.filter((p) => p.rank && (p.sentTo || []).length).length, firstSoldAll: R.window.filter((p) => p.rank && (p.nSells || 0) > 0 && !((p.nowPct || 0) > 0.001)).length,
    firstSoldSome: R.window.filter((p) => p.rank && (p.nSells || 0) > 0 && (p.nowPct || 0) > 0.001).length, firstNone: R.window.filter((p) => p.rank && !(p.nSells > 0) && !(p.sentTo || []).length && !((p.nowPct || 0) > 0.001)).length, firstHoldPct: R.window.filter((p) => p.rank).reduce((a, p) => a + (p.nowPct || 0), 0),
    sideN: R.side.length, sideHoldPct: R.side.reduce((a, p) => a + (p.nowPct || 0), 0), whales: R.window.filter((p) => p.whale).length, whaleHoldPct: wsum((p) => p.whale), lastBuyerSec: L.lastBuyerSec, firstN: L.firstN };
  for (const h of holders) { const p = W.get(h.owner); if (p) Object.assign(h, { fresh: p.fresh ?? null, ageH: p.ageH ?? null, funder: p.funder, group: p.group || null, launchLinked: !!p.launchLinked, behaviour: p.behaviour, firstBuySec: p.secAfter ?? null, gm: p.gm || null, gmStats: p.gmStats || null, whale: !!p.whale, bundled: !!p.bundled, sol: p.sol ?? null, portfolioUsd: p.portfolioUsd ?? null }); }
  if (recent) { for (const b of recent.list) { const p = W.get(b.wallet); Object.assign(b, { fresh: p?.fresh ?? null, ageH: p?.ageH ?? null, funder: p?.funder || null, group: p?.group || null, launchLinked: !!p?.launchLinked, role: p?.role || null }); }
    const chk = recent.list.filter((b) => b.fresh != null); Object.assign(recent, { checked: chk.length, fresh: chk.filter((b) => b.fresh).length, freshSol: +chk.filter((b) => b.fresh).reduce((a, b) => a + b.sol, 0).toFixed(2), sol: +chk.reduce((a, b) => a + b.sol, 0).toFixed(2), linked: recent.list.filter((b) => b.launchLinked || b.role === "dev" || b.role === "bundle").length }); }
  R.recent = recent; R.tracked = [...W.values()].filter((p) => RO[p.role] != null).map(pub);
  R.creatorAgeH = L?.creator ? W.get(L.creator)?.ageAtLaunchH ?? null : tok?.creator_age_s != null ? +(tok.creator_age_s / 3600).toFixed(1) : null;
  // 0.3.1 (owner, 19:59 UK: "a pie chart… so it's obvious what's going on"): every wallet in exactly one slice, so the pie adds up to 100%
  const poolPct = holders.filter((h) => /pool|curve/.test(h.label)).reduce((a, h) => a + h.pct, 0), launchG = new Set(groups.filter((g) => g.launch).flatMap((g) => g.wallets));
  const catOf = (p) => (p.role === "dev" || p.role === "bundle" ? "dev" : p.role === "side wallet" ? "side" : launchG.has(p.wallet) || p.launchLinked || p.rebuyer ? "linked" : p.launchProbable ? "probable" : p.first ? "first" : p.group ? "groups" : p.topHolder ? "top" : null);
  R.cat = {}; for (const p of W.values()) { const c = catOf(p); if (c) R.cat[p.wallet] = c; }
  const sl = { dev: 0, linked: 0, side: 0, probable: 0, first: 0, groups: 0, top: 0 }; for (const p of W.values()) { const c = R.cat[p.wallet]; if (c) sl[c] += p.nowPct || 0; }
  R.pie = { pool: poolPct, ...sl, rest: Math.max(0, 100 - poolPct - Object.values(sl).reduce((a, x) => a + x, 0)) };
  // what the early wallets (dev, bundle, first buyers) sold over time: running total of their sales and transfers out, % of supply
  const evs = []; for (const p of W.values()) if (p.first) for (const e of p.events || []) if (e.kind === "sell" || e.kind === "out") evs.push({ ts: e.ts, pct: e.pct || 0, kind: e.kind });
  evs.sort((a, b) => a.ts - b.ts); let cs = 0, co = 0; R.sellCurve = { start: L?.createTs || null, points: evs.map((e) => { if (e.kind === "sell") cs += e.pct; else co += e.pct; return [e.ts, +cs.toFixed(2), +co.toFixed(2)]; }), heldAtLaunch: (L?.dev?.pct || 0) + (L?.bundle?.pct || 0) + R.window.filter((p) => p.rank).reduce((a, p) => a + (p.boughtPct || 0), 0) };
  // us vs GMGN, line by line (null = that side has no such number)
  { const Gm = R.gmgn || {}, S2 = R.windowSummary || {}, Pq = R.pie || {}, Hq = R.holders || {}, fr = (R.fresh || null);
    const devW = L?.creator || V.creator || tok?.creator || null, devNow = devW ? (W.get(devW)?.nowPct ?? holdPct(devW)) : null;
    const topFresh = (Hq.top || []).filter((h) => !/pool|curve/.test(h.label || "") && h.fresh).reduce((a, h) => a + (h.pct || 0), 0);
    R.compare = [
      ["Bundle in the create block (% of supply bought)", L?.bundle?.pct ?? R.db.bundle_pct ?? null, null, "GMGN has no create-block figure"],
      ["Bundled buys (% of supply bought by wallets buying together)", R.bundled?.boughtPct ?? null, Gm.bundlerShare ?? null, "ours: create block, same transaction, or one owner's wallets in the same block — first " + (L?.txs || 0) + " launch transactions"],
      ["Bundlers still holding (% of supply)", R.bundled?.holdNow ?? null, Gm.now?.bundler ?? null, "GMGN: top 100 holders tagged bundler"],
      ["Dev and his team holding now", L ? (Pq.dev || 0) + (Pq.linked || 0) + (Pq.side || 0) : null, Gm.devHold ?? null, "ours: dev + bundle + wallets linked to them + their side wallets; GMGN: 'dev team'"],
      ["Dev wallet alone holding now", devNow, Gm.now?.creator ?? null, ""],
      ["Bought in the first 5 blocks (bundle + snipers), holding now", L ? [...W.values()].filter((p) => p.role !== "dev" && p.firstBuySlot != null && p.firstBuySlot <= L.slot0 + 4).reduce((a, p) => a + (p.nowPct || 0), 0) : null, Gm.now?.sniper ?? null, "GMGN: holders tagged sniper (GMGN counts the create-block bundle as snipers too)"],
      ["Insiders holding now", L ? (Pq.dev || 0) + (Pq.linked || 0) + (Pq.side || 0) : null, Gm.insiderHold ?? Gm.now?.insider ?? null, "ours: dev + bundle + linked + side wallets; GMGN: 'insider' (rat trader)"],
      ["Fresh wallets holding (top holders)", topFresh, Gm.now?.fresh ?? null, ""],
      ["Top 10 hold", Hq.top10Pct ?? null, Gm.top10 ?? null, ""],
      ["Holders", typeof Hq.count === "number" ? Hq.count : null, Gm.holders ?? null, ""],
      ["Dev's other coins", R.dev?.summary?.n ?? null, Gm.devTokens?.others ?? null, "this coin left out of both counts" + (R.dev?.source ? "; ours from " + R.dev.source : "")],
      ["Biggest single owner (linked wallets)", (R.groups || [])[0]?.nowPct ?? null, null, "GMGN does not group wallets by owner"]];
  }
  R.live = { wallets: [...W.values()].sort((a, b) => RK(a) - RK(b)).map((p) => p.wallet).slice(0, 400), lastSig: recent?.lastSig || null, venueAddr: recent?.venueAddr || null, tokenProg, dec, supply, solUsd };
  // where GMGN and we disagree by 10 points or more (shown at the top of the page, in red)
  R.disagree = (R.compare || []).filter((r) => typeof r[1] === "number" && typeof r[2] === "number" && r[0] !== "Holders" && r[0] !== "Dev's other coins" && !/^Insiders|^Fresh/.test(r[0]) && Math.abs(r[1] - r[2]) >= 10).map((r) => ({ what: r[0], ours: r[1], gmgn: r[2] }));
  R.verified = process.env.SCOPE_VERIFIED === "1";
  R.diag = diagnose(R);
  R.name = R.db.name || R.dex?.name || null; R.symbol = R.db.symbol || R.dex?.symbol || null;
  return R;
}

// ---------- live refresh: balances of every wallet in the report, the top holders, the market cap and the trades since the last read ----------
export async function coinLive(mint) {
  const c = cache.get(String(mint || "").trim()); if (!c) return { ok: false, error: "look the coin up first" };
  const R = c.r, Lv = R.live; used = 0;
  try {
    const pctOf = (raw) => (Number(raw) / 10 ** Lv.dec / Lv.supply) * 100, skip = new Set([R.nowMarket.curve, R.nowMarket.pool, pda(["pool-authority", R.mint], PUMP), ...(R.nowMarket.pairs || [])]);
    const bal = await balances(Lv.wallets, R.mint, Lv.tokenProg, pctOf);
    const V = await venueNow(R.mint, Lv.dec, Lv.supply, Lv.tokenProg, R.nowMarket.curve, R.nowMarket.pool, R.nowMarket.pairs || []);
    const big = (await call("getTokenLargestAccounts", [R.mint, { commitment: "confirmed" }]))?.value || [];
    const owners = big.length ? (await call("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }])).value : [];
    const top = big.map((b, i) => ({ owner: owners[i]?.data?.parsed?.info?.owner || null, pct: pctOf(BigInt(b.amount)) })).filter((h) => h.owner);
    let trades = [];
    if (Lv.venueAddr) { const venueAddr = V.complete ? R.nowMarket.pool : Lv.venueAddr; const sg = ((await call("getSignaturesForAddress", [venueAddr, { limit: 60, ...(Lv.lastSig && venueAddr === Lv.venueAddr ? { until: Lv.lastSig } : {}) }])) || []).filter((x) => !x.err);
      if (sg.length) { Lv.lastSig = sg[0].signature; Lv.venueAddr = venueAddr; const tr = readTrades(await batch("getTransaction", sg.slice(0, 40).map((x) => TX(x.signature))), R.mint, skip);
        const known = new Map([...(R.window || []), ...(R.tracked || []), ...(R.side || []), ...(R.holders?.top || []).map((h) => ({ wallet: h.owner, ...h })), ...(R.recent?.list || [])].map((p) => [p.wallet, p]));
        trades = tr.filter((t) => t.kind === "buy" || t.kind === "sell").map((t) => { const k = known.get(t.wallet); return { ts: t.ts, wallet: t.wallet, kind: t.kind, sol: +Math.abs(t.sol / 1e9).toFixed(3), pct: pctOf(t.tok < 0n ? -t.tok : t.tok), role: k?.role || null, group: k?.group || null, fresh: k?.fresh ?? null, launchLinked: !!k?.launchLinked }; }); } }
    for (const h of top) if (bal.has(h.owner)) bal.set(h.owner, Math.max(bal.get(h.owner) || 0, h.pct)); // a holder whose tokens sit outside its standard token account
    const solUsd = Lv.solUsd, groups = (R.groups || []).map((g) => ({ id: g.id, nowPct: g.wallets.reduce((a, w) => a + (bal.get(w) || 0), 0) }));
    coinStat.liveCalls = (coinStat.liveCalls || 0) + used;
    const poolNow = top.filter((h) => h.owner === R.nowMarket.pool || h.owner === R.nowMarket.curve || h.owner === pda(["pool-authority", R.mint], PUMP)).reduce((a, h) => a + h.pct, 0);
    return { ok: true, at: Math.floor(Date.now() / 1000), calls: used, poolPct: poolNow, mcUsd: R.nowMarket.mcSuspect ? R.nowMarket.mcUsd : V.priceSol && solUsd ? V.priceSol * Lv.supply * solUsd : null, venue: V.venue, progress: V.progress, balances: Object.fromEntries(bal), groups, top, trades };
  } catch (e) { return { ok: false, error: e.message }; }
}

function diagnose(R) {
  const d = [], add = (lvl, txt) => d.push({ lvl, txt }), f1 = (x) => (x == null ? "?" : x.toFixed(1)), L = R.launch, S = R.windowSummary, H = R.holders, T = (r) => (R.tracked || []).filter((p) => p.role === r);
  if (R.launchSrc?.missing) add("red", `Launch NOT found (${R.launchSrc.missing}). The dev, bundle, sniper and first-buyer figures below are unknown — not zero.${R.db.seen && R.db.bundle_pct != null ? ` Our tracker's live record: ${f1(R.db.bundle_pct)}% bought in the create block by ${R.db.bundle_wallets} wallets (${(R.db.bundle_sol || 0).toFixed(1)} SOL).` : ""}`);
  if (R.launchSrc?.incomplete) add("red", `Launch only partly found: ${R.launchSrc.incomplete}. The bundle and dev figures below are too low.`);
  if (L?.check && !L.check.agree) add(L.check.oursPct < L.check.trackerPct - 2 ? "red" : "amber", `Launch check: our tracker saw ${f1(L.check.trackerPct)}% bought in the create block by ${L.check.trackerWallets} wallets; this lookup found ${f1(L.check.oursPct)}% by ${L.check.oursWallets}${L.check.oursPct < L.check.trackerPct - 2 ? " — less than the tracker, so the launch figures here are too low" : L.check.oursPct > L.check.trackerPct + 2 ? " — more than the tracker (it may have missed a transaction live)" : " — the same total"}${L.check.missing.length ? `; the tracker names ${L.check.missing.length} wallet${L.check.missing.length === 1 ? "" : "s"} this lookup does not (${L.check.missing.slice(0, 3).map((w) => w.slice(0, 4)).join(", ")}) — the tracker records who signed, this lookup who received the tokens` : ""}.`);
  else if (L?.check) add("ok", `Launch checked against our tracker's live record: both see ${f1(L.check.oursPct)}% bought in the create block by ${L.check.oursWallets} wallets.`);
  if (L?.gradAfterS != null && L.gradAfterS <= 5) add("red", `Graduated ${L.gradAfterS <= 1 ? "in the same second it was created" : L.gradAfterS + " s after it was created"}: the bundle bought the whole bonding curve — nobody outside could buy before it hit the pool.`);
  if (R.token.mintAuthority) add("red", `Mint authority is NOT revoked (${R.token.mintAuthority.slice(0, 6)}…): more tokens can be printed.`);
  if (R.token.freezeAuthority) add("red", "Freeze authority is set: wallets can be frozen so they cannot sell.");
  const LQ = R.liquidity; if (LQ) { if (LQ.burnedPct != null) add(LQ.burnedPct >= 99 ? "ok" : LQ.burnedPct >= 90 ? "amber" : "red", LQ.burnedPct >= 99 ? `Liquidity: ${LQ.poolSol ? LQ.poolSol.toFixed(1) + " SOL" : "?"} in the pool; ${f1(LQ.burnedPct)}% of the LP tokens are burned — the liquidity cannot be pulled.` : `Liquidity: only ${f1(LQ.burnedPct)}% of the LP tokens are burned; the rest${LQ.lpHolders?.[0] ? " is held by " + LQ.lpHolders[0].owner.slice(0, 6) + "…" : ""} — that holder can remove liquidity.`); }
  const GMq = R.gmgn; if (GMq?.ok && GMq.agree?.flagged) add(GMq.agree.inOurs / GMq.agree.flagged >= 0.6 ? "ok" : "amber", `GMGN tags ${GMq.agree.flagged} holder${GMq.agree.flagged === 1 ? "" : "s"} as bundler or insider; ${GMq.agree.inOurs} of them are also in our bundle / owner groups.`);
  if (GMq?.ok && GMq.bundlerShare != null && R.bundled) add(Math.abs(GMq.bundlerShare - R.bundled.boughtPct) <= 10 ? "ok" : "amber", `Bundles: GMGN says bundlers bought ${f1(GMq.bundlerShare)}% and hold ${f1(GMq.now?.bundler)}% now; we measure ${f1(R.bundled.boughtPct)}% bought together and ${f1(R.bundled.holdNow)}% still held.`);
  const RP = R.replaced || []; if (RP.length) add("red", `Sell and replace: ${RP.length} wallet${RP.length === 1 ? "" : "s"} received SOL from a dev / bundle / early-buyer sale and then ${RP.some((x) => x.bought) ? "bought" : "held"} this coin — the same money back in under new wallets; they hold ${f1(RP.reduce((a, x) => a + (x.holds || 0), 0))}% now.`);
  else if (R.saleTrail?.sellers) add("ok", `Followed the SOL out of ${R.saleTrail.sellers} selling dev / bundle / early wallets (${R.saleTrail.transfers} transfers${R.saleTrail.toExchanges ? `, ${R.saleTrail.toExchanges} into exchanges` : ""}): none of it came back into this coin within two steps.`);
  const DB2 = R.delayedBundle; if (DB2?.n) add(DB2.holdNow >= 5 ? "red" : "amber", `Delayed bundle: ${DB2.n} wallet${DB2.n === 1 ? "" : "s"} that bought 1–4 blocks after the create (they look like snipers) are linked to the dev / bundle; they bought ${f1(DB2.boughtPct)}% and hold ${f1(DB2.holdNow)}% now.`);
  const XF = R.exchangeFarm; if (XF) add(XF.holdNow >= 10 ? "red" : "amber", `Exchange-funded wallet farm: ${XF.n} fresh launch wallets got their first SOL from exchanges (${XF.names.slice(0, 4).join(", ")}) within ${Math.round(XF.spanS / 60)} min, about ${f1(XF.hoursBefore)} h before launch — the usual way to hide that one person owns them. They hold ${f1(XF.holdNow)}% now.`);
  const PB = (R.window || []).concat(R.side || []).filter((p) => p.launchProbable); if (PB.length) add("amber", `Probably the same owner as the dev / bundle (not proven): ${PB.length} wallet${PB.length === 1 ? "" : "s"} tied to them only by weaker signs — exchange withdrawals of near-identical amounts at the same time, one busy wallet paying several of them, or identical buy sizes together; they hold ${f1(PB.reduce((a, p) => a + (p.nowPct || 0), 0))}% now.`);
  const g1 = (R.groups || [])[0]; if (g1 && g1.nowPct >= 10) add(g1.nowPct >= 25 ? "red" : "amber", `One owner holds ${f1(g1.nowPct)}% of the supply across ${g1.n} linked wallet${g1.n === 1 ? "" : "s"}${g1.launch ? " — the dev and bundle's group" : ""} (linked by ${g1.links.slice(0, 3).join(", ")}).`);
  const lg = (R.groups || []).find((g) => g.launch); if (lg && lg !== g1) add(lg.nowPct >= 10 ? "amber" : "ok", `The dev and bundle's group (${lg.n} wallets including wallets linked to them) holds ${f1(lg.nowPct)}% now.`);
  if (S?.launchLinked) add("red", `${S.launchLinked} of the first buyers trace back to the dev or bundle (funded by them, same funder, or tokens passed between them); they hold ${f1(S.launchLinkedHoldPct)}% now.`);
  const bp = L ? L.bundle.pct + L.dev.pct : R.db.bundle_pct, bw = L ? L.bundle.n + (L.dev.pct > 0 ? 1 : 0) : R.db.bundle_wallets; // dev + bundle, as the tracker counts it
  if (bp != null) { if (bp >= 79 && bw === 1) add("red", `Full-curve factory launch: one wallet bought ${f1(bp)}% in the create block — not buyable.`);
    else if (bp >= 70 && bp < 80 && bw >= 4 && bw <= 10) add("amber", `Bundle launch (the GR2 / BL type): ${f1(bp)}% bought in the create block over ${bw} wallets.`);
    else if (bp >= 30) add("amber", `Heavily bundled: ${f1(bp)}% of supply bought in the create block over ${bw} wallets.`);
    else add("ok", `Launch bundle ${f1(bp)}% over ${bw} wallets.`); }
  const dv = T("dev")[0]; if (dv && dv.noBuy) add("ok", `Dev made no buy at launch; his wallet holds ${f1(dv.nowPct)}% now.`); else if (dv) add((dv.nowPct || 0) > 5 ? "amber" : "ok", (dv.nowPct || 0) > 0.01 ? `Dev bought ${f1(dv.launchPct || dv.boughtPct)}% and still holds ${f1(dv.nowPct)}%.` : `Dev bought ${f1(dv.launchPct || dv.boughtPct)}% and holds none now (${dv.behaviour}).`); else if (L) add("ok", "Dev made no buy at launch.");
  const bu = T("bundle"); if (bu.length) add(bu.reduce((a, p) => a + (p.nowPct || 0), 0) > 5 ? "amber" : "ok", `Bundle wallets: took ${f1(bu.reduce((a, p) => a + (p.launchPct ?? p.boughtPct ?? 0), 0))}% in the create block, hold ${f1(bu.reduce((a, p) => a + (p.nowPct || 0), 0))}% now; ${bu.filter((p) => !((p.nowPct || 0) > 0.01)).length} of ${bu.length} sold out.`);
  if (S) { add(S.fresh >= S.checked / 2 && S.checked ? "amber" : "ok", `The first ${S.firstN} buyers after the dev and bundle (all within ${S.lastBuyerSec ?? "?"} s of launch) bought ${f1(S.boughtPct - (L?.dev?.pct || 0) - (L?.bundle?.pct || 0))}%; together with the dev and bundle ${S.stillHolding} wallets still hold ${f1(S.holdNowPct)}%. Fresh: ${S.fresh} of ${S.checked} checked, holding ${f1(S.freshHoldPct)}%.`);
    if (S.sideN) add(S.sideHoldPct >= 5 ? "red" : S.sideHoldPct >= 1 ? "amber" : "ok", S.sideHoldPct >= 0.05 ? `Side wallets: the early wallets sent tokens to ${S.sideN} other wallet${S.sideN === 1 ? ", which holds" : "s, which hold"} ${f1(S.sideHoldPct)}% now — supply that looks spread out but is the same people.` : `The early wallets sent tokens to ${S.sideN} other wallet${S.sideN === 1 ? "" : "s"}; ${S.sideN === 1 ? "it holds" : "they hold"} nothing now (sold or passed on).`);
    add(S.soldPct1h >= 2 ? "red" : S.sellingNow ? "amber" : "ok", `Selling: the early wallets have sold ${f1(S.soldPct)}% of supply so far${S.soldPct1h > 0 ? `, ${f1(S.soldPct1h)}% of it in the last hour (${S.sellers1h} wallet${S.sellers1h === 1 ? "" : "s"})` : ", none in the last hour"}${S.sellingNow ? `; ${S.sellingNow} sold in the last 30 min` : ""}.`);
    if (S.whales) add("ok", `${S.whales} of the early wallets ${S.whales === 1 ? "is a whale" : "are whales"} (50+ SOL or $10K+ in tokens), holding ${f1(S.whaleHoldPct)}% now.`);
    if (S.traders) add("amber", `${S.traders} of the early wallets are trading in and out of the coin (3+ buys and 3+ sells) — volume farming or flipping.`); }
  const sn = T("sniper"); if (sn.length) add(sn.reduce((a, p) => a + (p.nowPct || 0), 0) > 10 ? "amber" : "ok", `Snipers (4 blocks after the create): ${sn.length} took ${f1(sn.reduce((a, p) => a + (p.boughtPct || 0), 0))}%, hold ${f1(sn.reduce((a, p) => a + (p.nowPct || 0), 0))}% now.`);
  if (H?.top10Pct != null) add(H.top10Pct > 35 ? "amber" : "ok", `Top 10 holders (pool and curve left out) hold ${f1(H.top10Pct)}%; the largest ${f1(H.largestPct)}%.`);
  const RB = R.recent; if (RB?.checked) add(RB.fresh >= RB.checked / 2 ? "amber" : "ok", `Last ${RB.trades} trades: ${RB.buyers} buying wallets; ${RB.fresh} of ${RB.checked} checked are fresh, putting in ${RB.freshSol} of ${RB.sol} SOL${RB.linked ? `; ${RB.linked} are the dev, bundle or linked to them` : ""}.`);
  const bs = T("bundle").filter((w) => w.firstSellMc); if (bs.length) { const m = bs.map((w) => w.firstSellMc).sort((a, b) => a - b); add("ok", `The bundle's first sales were at about $${Math.round(m[0] / 1000)}K–$${Math.round(m[m.length - 1] / 1000)}K market cap (today's SOL price).`); }
  const DV = R.dev; if (DV) { const sm = DV.summary || {}; if (sm.n) add(sm.n >= 10 && sm.graduated <= 1 ? "red" : sm.n >= 3 ? "amber" : "ok", `The dev has launched ${sm.n} other coin${sm.n === 1 ? "" : "s"} (${sm.last24h} in the last 24 h), ${sm.graduated} graduated, best $${Math.round((sm.best || 0) / 1000)}K (${DV.source}).`); else if (DV.coins) add("ok", "No other coins from this dev wallet.");
    if (DV.funder) add(DV.funderBusy ? "ok" : "amber", `The dev wallet was funded by ${DV.funder.slice(0, 6)}… with ${DV.fundedSol != null ? DV.fundedSol.toFixed(2) + " SOL" : "?"}${(R.exchanges || {})[DV.funder] ? ` (${R.exchanges[DV.funder]}, an exchange — GMGN)` : DV.funderBusy ? " (a busy, exchange-like wallet)" : DV.funder2 ? `, which was itself funded by ${DV.funder2.slice(0, 6)}…` : ""}.`); }
  if (R.creatorAgeH != null) add("ok", `Creator wallet was ${R.creatorAgeH < 1 ? "under an hour" : R.creatorAgeH > 48 ? Math.round(R.creatorAgeH / 24) + " days" : f1(R.creatorAgeH) + " h"} old at launch.`);
  const op = bp >= 74.2 && bp <= 74.9 && bw >= 4 && bw <= 6 && !(L?.dev?.pct > 0.01) && R.creatorAgeH >= 10 && R.creatorAgeH <= 30;
  if (op) add("good", "Matches the operator fingerprint behind GR2's 10–30x coins (bundle 74.3–74.8% over 4–6 wallets, no dev buy, creator wallet made the day before).");
  const ch = R.db.creatorHistory; if (ch?.n) add(ch.n >= 20 && (ch.grads || 0) <= 2 ? "amber" : "ok", `Creator's other launches we saw: ${ch.n} (${ch.n24 || 0} in the last 24 h), ${ch.grads || 0} graduated, best $${Math.round((ch.best || 0) / 1000)}K.`);
  if ((R.busyFunders || []).length) add("ok", `${R.busyFunders.length === 1 ? "1 funder is a busy, exchange-like wallet" : R.busyFunders.length + " funders are busy, exchange-like wallets"}; wallets that share only that funder were not grouped together.`);
  return d.sort((a, b) => ["red", "amber", "good", "ok"].indexOf(a.lvl) - ["red", "amber", "good", "ok"].indexOf(b.lvl));
}
