// launcher 0.3.0 (owner, 31 Oct 2026 18:21 UK: "study the copycats … what made them run up? bundled wallets, wash trading, sniping, fresh wallets, or genuine traders?").
// For every copycat that ran (peak ≥ STUDY_MIN_PEAK, from copy_peaks) and, as a comparison, the copies of the same post that did not run and our own coin,
// it reads the coin's whole first 40 minutes from the chain (Helius: every buy and sell on the pump.fun bonding curve, in order, with block and position)
// and profiles the first 100 buyers (wallet age, activity, who funded them). It measures, for each coin:
//   the creator (own first buy, when it sold), bundles (buyers in the creation block, Jito-tipped and multi-buy transactions), snipers (first 3 s),
//   fresh wallets, wallets funded by the same source (clusters) and by the creator, wash trading (wallets buying and selling back and forth),
//   whales, how concentrated the buying was, the 5-minute volume, and how much of the buying came from "organic" traders (none of the above).
// Read-only: no transaction is signed or sent. Helius credits are counted (getTransactionsForAddress 10 per 100 transactions; getTransaction 1).
import bs58 from "bs58";
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { CFG } from "./config.mjs";
import { gget, N } from "./gmgn.mjs";
import { curveOf, PUMP } from "./pump.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const MIN_PEAK = n("LAUNCH_STUDY_MIN_PEAK", 30000), WINDOW = n("LAUNCH_STUDY_WINDOW_MIN", 40) * 60, BUYERS = n("LAUNCH_STUDY_BUYERS", 100);
const PER_RUN = n("LAUNCH_STUDY_PER_RUN", 12), DAY_CREDITS = n("LAUNCH_STUDY_DAY_CREDITS", 250000), MAX_TX = n("LAUNCH_STUDY_MAX_TX", 6000);
export const studyStat = { runs: 0, studied: 0, errors: 0, lastErr: "", lastRun: null, running: false, credits: 0, creditsDay: "", creditsToday: 0, calls: 0, gtfa: null, probe: null, current: "" };

const disc = (s) => createHash("sha256").update(s).digest().subarray(0, 8);
const D_TRADE = disc("event:TradeEvent"), D_CREATE = disc("event:CreateEvent"), D_COMPLETE = disc("event:CompleteEvent"), EVT_TAG = disc("anchor:event");
const PUMP_S = PUMP.toBase58();
const JITO = new Set(["96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5", "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe", "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY", "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh", "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt", "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL", "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"]);
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Helius ----------
function spend(c) { if (studyStat.creditsDay !== today()) { studyStat.creditsDay = today(); studyStat.creditsToday = 0; } studyStat.credits += c; studyStat.creditsToday += c; }
async function rpc(method, params, credits = 1) {
  for (let i = 0; i < 5; i++) {
    studyStat.calls++;
    try {
      const r = await fetch(CFG.RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(30000) });
      if (r.status === 429) { await nap(1500 * (i + 1)); continue; }
      const j = await r.json();
      if (j.error) { if (/rate|429|too many/i.test(j.error.message || "")) { await nap(1500 * (i + 1)); continue; } const e = new Error(`${method}: ${j.error.code} ${(j.error.message || "").slice(0, 120)}`); e.rpc = j.error; throw e; }
      spend(typeof credits === "function" ? credits(j.result) : credits);
      return j.result;
    } catch (e) { if (e.rpc || i === 4) throw e; await nap(1000 * (i + 1)); }
  }
  throw new Error(`${method}: rate limited`);
}
const fullCost = (res) => Math.max(10, Math.ceil(((res?.data || []).length) / 100) * 10);

/** Every transaction touching `addr` from its first one, oldest first, until blockTime > tEnd (or MAX_TX). Helius getTransactionsForAddress, else signatures + getTransaction. */
async function history(addr, tEnd) {
  const out = [];
  if (studyStat.gtfa !== false) {
    try {
      let token = null;
      for (let page = 0; page < MAX_TX / 100; page++) {
        const res = await rpc("getTransactionsForAddress", [addr, { transactionDetails: "full", sortOrder: "asc", limit: 100, maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed", ...(token ? { paginationToken: token } : {}) }], fullCost);
        studyStat.gtfa = true;
        const rows = res?.data || []; let past = false;
        for (const t of rows) { if (t.blockTime && t.blockTime > tEnd) { past = true; break; } out.push(t); }
        token = res?.paginationToken; if (past || !token || !rows.length) break;
      }
      return out;
    } catch (e) { if (studyStat.gtfa === true || !e.rpc) throw e; studyStat.gtfa = false; studyStat.probe = "getTransactionsForAddress unavailable: " + e.message.slice(0, 140); out.length = 0; }
  }
  // fallback: newest → oldest signatures, keep those inside the window, then fetch each transaction
  let before = null, sigs = [];
  for (let page = 0; page < 40; page++) {
    const s = await rpc("getSignaturesForAddress", [addr, { limit: 1000, commitment: "confirmed", ...(before ? { before } : {}) }]);
    if (!s?.length) break; sigs.push(...s); before = s[s.length - 1].signature; if (s.length < 1000) break;
  }
  sigs = sigs.reverse(); const t0 = sigs[0]?.blockTime || 0; sigs = sigs.filter((s) => !s.blockTime || s.blockTime <= Math.max(tEnd, t0)).slice(0, MAX_TX);
  for (let i = 0; i < sigs.length; i += 8) {
    const got = await Promise.all(sigs.slice(i, i + 8).map((s) => rpc("getTransaction", [s.signature, { maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed" }]).catch(() => null)));
    got.forEach((t, k) => t && out.push({ ...t, transactionIndex: null, _sig: sigs[i + k].signature }));
  }
  return out;
}

// ---------- decoding ----------
const keysOf = (t) => [...(t.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey)), ...(t.meta?.loadedAddresses?.writable || []), ...(t.meta?.loadedAddresses?.readonly || [])];
const pk = (b, o) => bs58.encode(b.subarray(o, o + 32));
function str(b, o) { const l = b.readUInt32LE(o); return [b.subarray(o + 4, o + 4 + l).toString("utf8"), o + 4 + l]; }
export const dbg = { samples: [], programs: {} };
function events(t) {
  const keys = keysOf(t), out = [], raws = [];
  if (dbg.on) for (const ix of t.transaction?.message?.instructions || []) { const p = keys[ix.programIdIndex]; if (p) dbg.programs[p] = (dbg.programs[p] || 0) + 1; }
  for (const g of t.meta?.innerInstructions || []) for (const ix of g.instructions || []) {
    if (keys[ix.programIdIndex] !== PUMP_S || !ix.data) continue;
    let b; try { b = Buffer.from(bs58.decode(ix.data)); } catch { continue; }
    if (b.length > 16 && b.subarray(0, 8).equals(EVT_TAG)) raws.push(b.subarray(8));
  }
  for (const l of t.meta?.logMessages || []) if (l.startsWith("Program data: ")) { try { raws.push(Buffer.from(l.slice(14), "base64")); } catch {} }
  for (const b of raws) {
    if (dbg.on && dbg.samples.length < 4 && !dbg.seen.has(b.subarray(0, 8).toString("hex") + b.length)) { dbg.seen.add(b.subarray(0, 8).toString("hex") + b.length); dbg.samples.push({ len: b.length, hex: b.subarray(0, 260).toString("hex") }); }
    try {
      const d = b.subarray(0, 8), p = b.subarray(8);
      if (d.equals(D_TRADE) && p.length >= 121) out.push({ k: "trade", mint: pk(p, 0), sol: Number(p.readBigUInt64LE(32)), tok: Number(p.readBigUInt64LE(40)), isBuy: p[48] === 1, user: pk(p, 49), ts: Number(p.readBigInt64LE(81)), vSol: Number(p.readBigUInt64LE(89)), vTok: Number(p.readBigUInt64LE(97)), rTok: Number(p.readBigUInt64LE(113)) });
      else if (d.equals(D_CREATE)) { let o = 0, name, symbol, uri; [name, o] = str(p, o); [symbol, o] = str(p, o); [uri, o] = str(p, o); out.push({ k: "create", name, symbol, mint: pk(p, o), curve: pk(p, o + 32), user: pk(p, o + 64), creator: p.length >= o + 128 ? pk(p, o + 96) : null }); }
      else if (d.equals(D_COMPLETE)) out.push({ k: "complete" });
    } catch {}
  }
  return out;
}
const sigOf = (t) => t._sig || t.transaction?.signatures?.[0];

// ---------- wallets ----------
const walletCache = new Map();
async function walletProfile(db, w) {
  if (walletCache.has(w)) return walletCache.get(w);
  const row = db.prepare("SELECT * FROM study_wallets WHERE wallet=?").get(w);
  if (row && row.checked_ts > Date.now() / 1000 - 3 * 86400) { walletCache.set(w, row); return row; }
  let first = null, txs = null, funder = null, funded_sol = null, err = null;
  try {
    const recent = await rpc("getSignaturesForAddress", [w, { limit: 1000, commitment: "confirmed" }]); txs = recent?.length ?? 0;
    if (txs < 1000 && txs > 0) first = recent[recent.length - 1];
    else if (studyStat.gtfa) { const r = await rpc("getTransactionsForAddress", [w, { transactionDetails: "signatures", sortOrder: "asc", limit: 1 }], 10); first = r?.data?.[0] || null; }
    if (first) {
      const t = await rpc("getTransaction", [first.signature, { maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed" }]);
      if (t?.meta) { const keys = keysOf(t), pre = t.meta.preBalances, post = t.meta.postBalances, me = keys.indexOf(w);
        let best = -1, drop = 0; keys.forEach((k, i) => { if (i !== me && i < pre.length && pre[i] - post[i] > drop) { drop = pre[i] - post[i]; best = i; } });
        funder = best >= 0 ? keys[best] : null; funded_sol = me >= 0 && me < pre.length ? (post[me] - pre[me]) / 1e9 : null; }
    }
  } catch (e) { err = e.message.slice(0, 120); }
  const p = { wallet: w, first_ts: first?.blockTime ?? null, txs, funder, funded_sol, err, checked_ts: Math.floor(Date.now() / 1000) };
  db.prepare("INSERT OR REPLACE INTO study_wallets VALUES (@wallet,@first_ts,@txs,@funder,@funded_sol,@err,@checked_ts)").run(p);
  walletCache.set(w, p); return p;
}

export function initStudy(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS study_wallets (wallet TEXT PRIMARY KEY, first_ts INTEGER, txs INTEGER, funder TEXT, funded_sol REAL, err TEXT, checked_ts INTEGER);
  CREATE TABLE IF NOT EXISTS study_coins (mint TEXT PRIMARY KEY, launch_id INTEGER, role TEXT, studied_ts INTEGER, data TEXT, err TEXT);
  CREATE TABLE IF NOT EXISTS study_buyers (mint TEXT, wallet TEXT, rank INTEGER, data TEXT, PRIMARY KEY (mint, wallet));`);
}

// ---------- one coin ----------
async function studyCoin(db, c, solUsd) {
  const curve = curveOf(new PublicKey(c.mint)).toBase58();
  dbg.on = true; dbg.samples = []; dbg.programs = {}; dbg.seen = new Set();
  let txs = await history(curve, c.created_ts + WINDOW);
  if (!txs.length) txs = await history(c.mint, c.created_ts + WINDOW);
  if (!txs.length) throw new Error("no transactions found");
  if (!studyStat.probeDone) { studyStat.probeDone = true; studyStat.probe = (studyStat.probe ? studyStat.probe + " | " : "") + JSON.stringify({ keys: Object.keys(txs[0]), ix: txs[0].transactionIndex, ev: txs.slice(0, 5).map((t) => events(t).map((e) => e.k).join("+")), inner: (txs[0].meta?.innerInstructions || []).length, logs: (txs[0].meta?.logMessages || []).length }).slice(0, 500); }
  // trades in chain order
  const trades = []; let created = null, t0 = null, slot0 = null, complete = null, multi = new Map(), jitoTx = new Map();
  txs.sort((a, b) => a.slot - b.slot || (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0));
  for (const t of txs) {
    if (t.meta?.err) continue;
    const ev = events(t), keys = keysOf(t), sig = sigOf(t), jito = keys.some((k) => JITO.has(k));
    const cr = ev.find((e) => e.k === "create" && e.mint === c.mint); if (cr && !created) { created = cr; t0 = t.blockTime; slot0 = t.slot; }
    if (ev.some((e) => e.k === "complete") && !complete) complete = t.blockTime;
    const tr = ev.filter((e) => e.k === "trade" && e.mint === c.mint);
    tr.forEach((e) => trades.push({ ...e, t: t.blockTime, slot: t.slot, idx: t.transactionIndex, sig, payer: keys[0], jito, inTx: tr.length }));
  }
  if (t0 == null) { t0 = txs[0].blockTime; slot0 = txs[0].slot; }
  const creator = created?.creator || created?.user || trades[0]?.user || null;
  const rel = (x) => x.t - t0, W = (s) => trades.filter((x) => rel(x) <= s);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0), uniq = (a) => new Set(a).size, sol = (l) => l / 1e9;
  const mcSol = (x) => (x.vSol / x.vTok) * 1e6; // market cap in SOL: price (lamports per raw unit) × 1e15 raw units / 1e9
  // per-wallet tallies within the window
  const per = new Map();
  for (const x of trades) { const p = per.get(x.user) || { w: x.user, buys: 0, sells: 0, bsol: 0, ssol: 0, btok: 0, stok: 0, first: null, firstSell: null, slot: null, idx: null, jito: false, multi: false };
    if (x.isBuy) { p.buys++; p.bsol += x.sol; p.btok += x.tok; if (p.first == null) { p.first = rel(x); p.slot = x.slot - slot0; p.idx = x.idx; p.jito = x.jito; p.multi = x.inTx > 1; } } else { p.sells++; p.ssol += x.sol; p.stok += x.tok; if (p.firstSell == null) p.firstSell = rel(x); }
    per.set(x.user, p); }
  const dev = per.get(creator) || { buys: 0, sells: 0, bsol: 0, ssol: 0 };
  const buyers = [...per.values()].filter((p) => p.buys > 0 && p.w !== creator).sort((a, b) => a.first - b.first || (a.slot - b.slot) || ((a.idx ?? 0) - (b.idx ?? 0)));
  const block0 = buyers.filter((p) => p.slot === 0), snipe = buyers.filter((p) => p.slot > 0 && p.first <= 3);
  // early insiders' selling: tokens bought by creation-block buyers and snipers that were sold within 15 min
  const early = new Set([...block0, ...snipe].map((p) => p.w)), eBought = sum(trades.filter((x) => x.isBuy && early.has(x.user)), (x) => x.tok), eSold15 = sum(trades.filter((x) => !x.isBuy && early.has(x.user) && rel(x) <= 900), (x) => x.tok);
  const devBought = sum(trades.filter((x) => x.isBuy && x.user === creator), (x) => x.tok), devSold = sum(trades.filter((x) => !x.isBuy && x.user === creator), (x) => x.tok);
  // profiles of the first BUYERS buyers (+ the creator)
  const prof = new Map(); const look = [creator, ...buyers.slice(0, BUYERS).map((p) => p.w)].filter(Boolean);
  for (let i = 0; i < look.length; i += 6) { const got = await Promise.all(look.slice(i, i + 6).map((w) => walletProfile(db, w))); got.forEach((g) => prof.set(g.wallet, g)); }
  const cp = prof.get(creator) || {};
  const fGroups = new Map(); for (const p of buyers.slice(0, BUYERS)) { const f = prof.get(p.w)?.funder; if (f) fGroups.set(f, (fGroups.get(f) || 0) + 1); }
  const linked = (w) => { const f = prof.get(w)?.funder; return !!f && (f === creator || (cp.funder && f === cp.funder) || f === cp.funder); };
  const ageH = (p) => { const f = prof.get(p.w)?.first_ts; return f ? (t0 + p.first - f) / 3600 : null; };
  const tag = (p, rank) => {
    const pr = prof.get(p.w) || {}, a = ageH(p), grp = pr.funder ? fGroups.get(pr.funder) || 1 : 1;
    const f = { block0: p.slot === 0, sniper: p.slot > 0 && p.first <= 3, jito: p.jito, multi: p.multi, fresh1h: a != null && a < 1, fresh24h: a != null && a < 24, lowAct: pr.txs != null && pr.txs <= 20, cluster: grp >= 3, creatorLinked: linked(p.w), wash: p.buys >= 2 && p.sells >= 2 };
    f.organic = rank < BUYERS && !f.block0 && !f.sniper && !f.fresh24h && !f.cluster && !f.creatorLinked && !f.multi && !f.wash && pr.txs != null;
    return { ...f, ageH: a == null ? null : +a.toFixed(2), txs: pr.txs, funder: pr.funder, funderGroup: grp, fundedSol: pr.funded_sol };
  };
  const tagged = buyers.map((p, i) => ({ p, f: i < BUYERS ? tag(p, i) : null }));
  const first = tagged.filter((x) => x.f), share = (pred) => (first.length ? +(first.filter((x) => pred(x.f)).length / first.length * 100).toFixed(1) : null);
  const solShare = (pred) => { const tot = sum(first, (x) => x.p.bsol); return tot ? +(sum(first.filter((x) => pred(x.f)), (x) => x.p.bsol) / tot * 100).toFixed(1) : null; };
  // wash: wallets buying and selling back and forth (≥ 2 of each in 15 min), their share of the volume, and the round-trip share of all volume
  const w15 = new Map(); for (const x of W(900)) { const p = w15.get(x.user) || { b: 0, s: 0, bs: 0, ss: 0 }; if (x.isBuy) { p.b++; p.bs += x.sol; } else { p.s++; p.ss += x.sol; } w15.set(x.user, p); }
  const vol15 = sum(W(900), (x) => x.sol), washW = [...w15.values()].filter((p) => p.b >= 2 && p.s >= 2);
  const roundTrip = sum([...w15.values()], (p) => 2 * Math.min(p.bs, p.ss));
  // 5-minute buckets (SOL volume, buys, sells, new buyers) for the first 40 min
  const buckets = []; const seenB = new Set();
  for (let b = 0; b < WINDOW / 300; b++) { const xs = trades.filter((x) => rel(x) >= b * 300 && rel(x) < (b + 1) * 300); const nb = xs.filter((x) => x.isBuy && !seenB.has(x.user) && (seenB.add(x.user) || true)).length;
    buckets.push({ v: +sol(sum(xs, (x) => x.sol)).toFixed(2), b: xs.filter((x) => x.isBuy).length, s: xs.filter((x) => !x.isBuy).length, nb, mc: xs.length ? +mcSol(xs[xs.length - 1]).toFixed(1) : null }); }
  const mcAt = (s) => { const xs = W(s); return xs.length ? +mcSol(xs[xs.length - 1]).toFixed(1) : null; };
  const peakT = trades.reduce((m, x) => (!m || mcSol(x) > mcSol(m) ? x : m), null);
  const buys15 = W(900).filter((x) => x.isBuy && x.user !== creator), sizes = buys15.map((x) => sol(x.sol)).sort((a, b) => a - b);
  const byW = new Map(); buys15.forEach((x) => byW.set(x.user, (byW.get(x.user) || 0) + x.sol)); const top10 = [...byW.values()].sort((a, b) => b - a).slice(0, 10);
  const org = tagged.filter((x) => x.f?.organic);
  const multiTx15 = uniq(W(900).filter((x) => x.inTx > 1).map((x) => x.sig)), jitoTx30 = uniq(trades.filter((x) => rel(x) <= 30 && x.jito).map((x) => x.sig));
  const win = (s, f) => ({ buys: W(s).filter((x) => x.isBuy).length, sells: W(s).filter((x) => !x.isBuy).length, buyers: uniq(W(s).filter((x) => x.isBuy).map((x) => x.user)), bsol: +sol(sum(W(s).filter((x) => x.isBuy), (x) => x.sol)).toFixed(2), ssol: +sol(sum(W(s).filter((x) => !x.isBuy), (x) => x.sol)).toFixed(2) });
  const d = {
    mint: c.mint, launch_id: c.launch_id, role: c.role, post: c.post_name, name: created?.name || c.name, symbol: created?.symbol || c.symbol, post_delay_s: c.post_delay_s, peak_mc_usd: c.peak_mc, peak_min: c.peak_min, mc_now_usd: c.mc_now, holders_now: c.holders, graduated_now: c.progress >= 1,
    sol_usd: solUsd, txs: txs.length, trades: trades.length, window_min: WINDOW / 60, complete_s: complete ? complete - t0 : null,
    creator, creator_age_h: cp.first_ts ? +((t0 - cp.first_ts) / 3600).toFixed(1) : null, creator_txs: cp.txs ?? null, creator_funder: cp.funder ?? null,
    dev_buy_sol: +sol(dev.bsol).toFixed(3), dev_sell_sol: +sol(dev.ssol).toFixed(3), dev_first_sell_s: per.get(creator)?.firstSell ?? null, dev_sold_pct: devBought ? +(devSold / devBought * 100).toFixed(0) : null,
    block0_buyers: block0.length, block0_sol: +sol(sum(block0, (p) => p.bsol)).toFixed(2), sniper_buyers_3s: snipe.length, sniper_sol_3s: +sol(sum(snipe, (p) => p.bsol)).toFixed(2), early_sold_15m_pct: eBought ? +(eSold15 / eBought * 100).toFixed(0) : null,
    jito_txs_30s: jitoTx30, multi_buy_txs_15m: multiTx15,
    w1m: win(60), w5m: win(300), w15m: win(900), w40m: win(WINDOW),
    mc_sol: { m1: mcAt(60), m5: mcAt(300), m15: mcAt(900), m30: mcAt(1800), peak: peakT ? +mcSol(peakT).toFixed(1) : null, peak_s: peakT ? rel(peakT) : null },
    vol5: buckets,
    whale_buys_2sol_15m: sizes.filter((s) => s >= 2).length, median_buy_sol_15m: sizes.length ? +sizes[Math.floor(sizes.length / 2)].toFixed(3) : null, top10_buy_share_15m: sum(buys15, (x) => x.sol) ? +(sum(top10, (v) => v) / sum(buys15, (x) => x.sol) * 100).toFixed(1) : null,
    wash_wallets_15m: washW.length, wash_vol_share_15m: vol15 ? +(sum(washW, (p) => p.bs + p.ss) / vol15 * 100).toFixed(1) : null, roundtrip_share_15m: vol15 ? +(roundTrip / vol15 * 100).toFixed(1) : null,
    profiled: first.length, fresh1h_pct: share((f) => f.fresh1h), fresh24h_pct: share((f) => f.fresh24h), lowact_pct: share((f) => f.lowAct), cluster_pct: share((f) => f.cluster), creator_linked: first.filter((x) => x.f.creatorLinked).length,
    fresh24h_sol_pct: solShare((f) => f.fresh24h), cluster_sol_pct: solShare((f) => f.cluster), creator_linked_sol_pct: solShare((f) => f.creatorLinked), biggest_funder_group: Math.max(0, ...fGroups.values()),
    debug: { samples: dbg.samples, programs: Object.entries(dbg.programs).sort((a, b) => b[1] - a[1]).slice(0, 8), zeroSolBuys: trades.filter((x) => x.isBuy && !x.sol).length },
    organic_buyers: org.length, organic_pct: share((f) => f.organic), organic_sol_pct: solShare((f) => f.organic), first_organic_s: org[0]?.p.first ?? null,
  };
  db.prepare("INSERT OR REPLACE INTO study_coins VALUES (?,?,?,?,?,?)").run(c.mint, c.launch_id, c.role, Math.floor(Date.now() / 1000), JSON.stringify(d), null);
  const ins = db.prepare("INSERT OR REPLACE INTO study_buyers VALUES (?,?,?,?)");
  tagged.slice(0, BUYERS).forEach((x, i) => ins.run(c.mint, x.p.w, i + 1, JSON.stringify({ first_s: x.p.first, slot: x.p.slot, idx: x.p.idx, buys: x.p.buys, sells: x.p.sells, buy_sol: +sol(x.p.bsol).toFixed(3), sell_sol: +sol(x.p.ssol).toFixed(3), first_sell_s: x.p.firstSell, ...x.f })));
  return d;
}

// ---------- which coins ----------
function pickCoins(db) {
  const now = Math.floor(Date.now() / 1000), done = new Set(db.prepare("SELECT mint FROM study_coins WHERE (err IS NULL AND studied_ts > 1793472000) OR studied_ts > ?").all(now - 600).map((r) => r.mint)); // a failed coin is tried again after 50 min
  const peaks = db.prepare("SELECT p.*, l.t_post_ms FROM copy_peaks p LEFT JOIN launches l ON l.id=p.launch_id WHERE p.created_ts <= ? AND p.created_ts >= ?").all(now - WINDOW - 300, now - 3 * 86400);
  const runners = peaks.filter((p) => !p.ours && p.peak_mc >= MIN_PEAK).sort((a, b) => b.peak_mc - a.peak_mc);
  const out = [];
  const add = (p, role) => { if (!done.has(p.mint) && !out.some((o) => o.mint === p.mint)) out.push({ ...p, role, post_delay_s: p.t_post_ms ? p.created_ts - Math.floor(p.t_post_ms / 1000) : null }); };
  for (const r of runners) add(r, "runner");
  for (const lid of [...new Set(runners.map((r) => r.launch_id))]) { // the same post's copies that did not run, and ours
    const same = peaks.filter((p) => p.launch_id === lid && p.peak_mc < MIN_PEAK);
    same.filter((p) => p.ours).forEach((p) => add(p, "ours"));
    same.filter((p) => !p.ours).sort((a, b) => (b.holders || 0) - (a.holders || 0) || b.peak_mc - a.peak_mc).slice(0, 3).forEach((p) => add(p, "control"));
  }
  return out.slice(0, PER_RUN);
}

export async function runStudy(db, done) {
  if (studyStat.running) return; studyStat.running = true; studyStat.runs++;
  try {
    let solUsd = null; try { const w = await gget("/v1/token/info", { chain: "sol", address: "So11111111111111111111111111111111111111112" }); solUsd = N(w?.price?.price ?? w?.price); } catch {}
    for (const c of pickCoins(db)) {
      if (studyStat.creditsDay === today() && studyStat.creditsToday >= DAY_CREDITS) { studyStat.lastErr = `daily Helius budget ${DAY_CREDITS} credits reached`; break; }
      studyStat.current = `${c.role} ${c.name} ${c.mint.slice(0, 6)}`;
      try { await studyCoin(db, c, solUsd); studyStat.studied++; }
      catch (e) { studyStat.errors++; studyStat.lastErr = `${c.mint.slice(0, 6)}: ${e.message}`.slice(0, 200); db.prepare("INSERT OR REPLACE INTO study_coins VALUES (?,?,?,?,?,?)").run(c.mint, c.launch_id, c.role, Math.floor(Date.now() / 1000), JSON.stringify({ name: c.name }), e.message.slice(0, 200)); }
      if (studyStat.studied <= 2) try { done?.(); } catch {} // the first coins go out at once, to check the decoding
    }
    studyStat.lastRun = new Date().toISOString();
  } catch (e) { studyStat.errors++; studyStat.lastErr = e.message.slice(0, 200); }
  finally { studyStat.running = false; studyStat.current = ""; try { done?.(); } catch {} }
}
