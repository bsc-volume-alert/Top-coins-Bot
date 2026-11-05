// launcher 0.9.0 (owner, 5 Nov 2026 12:14 UK: "correct both buy and sell pricing across every book … buy: use current reserves to calculate tokens
// received for 0.2 SOL, including price impact and venue fees; sell: track that token quantity and calculate its executable sell proceeds from
// updated reserves; run the trail on those proceeds, including the price after a dump; preserve the original paper results; label the corrected
// results as simulated executable fills"). The first real trade (The 10 Year Old Trencher, 09:43 UK) filled 44% above the paper entry price with
// sub-second execution: the paper book books the last trade our decoder saw, which is stale on a coin being bought hard, and its exits run on
// 1-minute candles that cannot see a one-transaction dump.
// SIMULATED EXECUTABLE FILL ("s_*"), one per paper trade, every book:
//   entry: at the second a rule passes, the bonding curve's reserves (or the PumpSwap pool's, after graduation) are read and the tokens 0.2 SOL
//          would receive are computed with the venue's own maths (pump.mjs quoteBuy / the PumpSwap constant product), fees and impact included;
//   exit:  the position's curve (or pool reserve accounts) is subscribed to; every change re-prices the tokens as the SOL they would fetch
//          (quoteSell) — so after a dump the proceeds are the post-dump proceeds; the venue trail (40% curve / 25% graduated, off the running high
//          of those proceeds, from 1 = what went in) or the 2-hour horizon sells; a graduation mid-trade moves the subscription to the pool;
//   backstop: every 30 s every open position's accounts are re-read (gap detection for dropped subscriptions; flagged on the trade).
// What this cannot do (stays on the page): guarantee a fill — latency, ordering, a failed transaction, network fees. The live book measures those.
import { PublicKey } from "@solana/web3.js";
import { conn, rpcStats, getAccounts, onAccount, offAccount } from "./rpc.mjs";
import { GLOBAL, PUMP, WSOL, pda, decodeGlobal, decodeCurve, quoteBuy, quoteSell, curveOf } from "./pump.mjs";
import { trailPct } from "./volpaper.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const STAKE = n("LAUNCH_SHADOW_SOL", 0.2), LAMPORTS = BigInt(Math.round(STAKE * 1e9)), HORIZON = 120 * 60, NET_FEE = n("LAUNCH_SIM_NET_FEE", 0.0015); // network + priority fee, both legs, in SOL
const now = () => Math.floor(Date.now() / 1000);
export const cfStat = { entries: 0, entryErrs: 0, updates: 0, exits: 0, subs: 0, resubs: 0, drops: 0, backstops: 0, errors: 0, lastErr: "" };

// ---- PumpSwap (pump.fun's AMM) — pool lookup, decoding and the constant-product quotes, ported from executor/src/amm.mjs ----
export const PUMP_AMM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16LE(v); return b; };
const rPk = (d, o) => new PublicKey(d.subarray(o, o + 32)), rU64 = (d, o) => d.readBigUInt64LE(o);
const POOL_DISC = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]);
const GLOBAL_CONFIG = pda(["global_config"], PUMP_AMM);
const poolAuthorityOf = (mint) => pda(["pool-authority", mint], PUMP);
export const migratedPoolOf = (mint) => pda(["pool", u16(0), poolAuthorityOf(mint), mint, WSOL], PUMP_AMM);
const pk = (m) => (m instanceof PublicKey ? m : new PublicKey(m)); // 0.9.1: mints arrive as strings; a seed must be the 32-byte key ("Max seed length exceeded" on the first 0.9.0 entries)
function decodePool(d) {
  if (!d || d.length < 243 || !d.subarray(0, 8).equals(POOL_DISC)) return null;
  const p = { baseMint: rPk(d, 43), quoteMint: rPk(d, 75), baseAcc: rPk(d, 139), quoteAcc: rPk(d, 171), virtualQuote: 0n, creatorFeeBps: null };
  if (d.length >= 261) { try { p.virtualQuote = (d.readBigInt64LE(253) << 64n) | d.readBigUInt64LE(245); } catch { p.virtualQuote = 0n; } }
  if (d.length >= 269) p.creatorFeeBps = Number(rU64(d, 261));
  return p;
}
function decodeCfg(d) { if (!d || d.length < 321) return null; return { lpFeeBps: Number(rU64(d, 40)), protocolFeeBps: Number(rU64(d, 48)), coinCreatorFeeBps: Number(rU64(d, 313)) }; }
const ceilDiv = (a, b) => (a + b - 1n) / b;
const poolBps = (pool, cfg) => BigInt((cfg?.lpFeeBps ?? 20) + (cfg?.protocolFeeBps ?? 5) + (pool.creatorFeeBps ?? cfg?.coinCreatorFeeBps ?? 95));
function poolBuy(pool, cfg, baseRes, quoteRes, quoteIn) { const fee = poolBps(pool, cfg), q = BigInt(quoteIn), net = q - ceilDiv(q * fee, 10000n), qr = BigInt(quoteRes) + (pool.virtualQuote > 0n ? pool.virtualQuote : 0n); return net > 0n ? (BigInt(baseRes) * net) / (qr + net) : 0n; }
function poolSell(pool, cfg, baseRes, quoteRes, baseIn) { const fee = poolBps(pool, cfg), b = BigInt(baseIn), qr = BigInt(quoteRes) + (pool.virtualQuote > 0n ? pool.virtualQuote : 0n); const gross = (qr * b) / (BigInt(baseRes) + b); return gross - ceilDiv(gross * fee, 10000n); }
const tokenAmount = (d) => (d && d.length >= 72 ? d.readBigUInt64LE(64) : null); // SPL token account: amount at bytes 64–71

let db = null, G = null, gAt = 0, CFG = null, cfgAt = 0;
async function global() { if (G && Date.now() - gAt < 600000) return G; const [a] = await getAccounts([GLOBAL], "confirmed"); const g = decodeGlobal(a?.data); if (g) { G = g; gAt = Date.now(); } return G; }
async function ammCfg() { if (CFG && Date.now() - cfgAt < 600000) return CFG; const [a] = await getAccounts([GLOBAL_CONFIG], "confirmed"); const c = decodeCfg(a?.data); if (c) { CFG = c; cfgAt = Date.now(); } return CFG; }

export function initChainFill(d) {
  db = d;
  db.exec(`CREATE TABLE IF NOT EXISTS chain_fill (vol_id INTEGER PRIMARY KEY, mint TEXT, strat TEXT, entry_ts INTEGER, venue TEXT, curve INTEGER, s_sol_in REAL, s_tokens TEXT, s_px REAL, s_in_gap REAL, s_x0 REAL,
    s_hi REAL, s_last_x REAL, s_last_ts INTEGER, s_n INTEGER DEFAULT 0, s_exit_x REAL, s_exit_ts INTEGER, s_exit_reason TEXT, s_r REAL, s_drops INTEGER DEFAULT 0, s_backstops INTEGER DEFAULT 0, s_err TEXT, done INTEGER DEFAULT 0)`);
  db.exec("CREATE INDEX IF NOT EXISTS chain_fill_open ON chain_fill (done)");
  for (const c of ["s_exit_src TEXT", "s_max_gap_s INTEGER"]) try { db.exec(`ALTER TABLE chain_fill ADD COLUMN ${c}`); } catch {} // 0.9.1: which source produced the exit (push / backstop) and the longest silence between price updates before it
  try { db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('SIM', ?, ?)").run(now(), "0.9.0"); } catch {} // when the simulated fills started — the page counts every book from here on this measure
}

/** Read what a position is worth now from the chain: curve → quoteSell; pool → constant product on the two reserve token accounts. Returns { lamports, venue, complete, pool? } or null. */
async function readValue(mint, tokens, st) {
  const g = await global();
  if (!st.pool) {
    const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data);
    if (!c) return null;
    if (!c.complete) return { lamports: quoteSell(c, g, tokens), venue: "curve", complete: false };
    st.complete = true;
  }
  // graduated: the pool (may not exist for a moment after the curve completes)
  if (!st.pool) { const pk = migratedPoolOf(pk(mint)); const [p] = await getAccounts([pk], "processed"); const pool = decodePool(p?.data); if (!pool) return { lamports: null, venue: "migrating", complete: true }; st.pool = pool; st.poolPk = pk; }
  const cfg = await ammCfg(); const [b, q] = await getAccounts([st.pool.baseAcc, st.pool.quoteAcc], "processed"); const br = tokenAmount(b?.data), qr = tokenAmount(q?.data);
  if (br == null || qr == null) return { lamports: null, venue: "pool", complete: true };
  st.baseRes = br; st.quoteRes = qr;
  return { lamports: poolSell(st.pool, cfg, br, qr, tokens), venue: "pool", complete: true };
}

/** ENTRY: called once per coin per check when any rule books a paper entry (ids = the vol_paper rows just booked for that coin). */
export async function chainEntry(mint, ids, chainPx, su, strat) {
  if (!db || !ids.length) return;
  const t = now(); const st = { pool: null };
  try {
    const g = await global(); if (!g) throw new Error("no Global");
    const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data);
    let tokens = 0n, venue = "curve", curve = 1;
    if (c && !c.complete) { tokens = quoteBuy(c, g, LAMPORTS).tokens; }
    else { // graduated (or not a pump.fun curve): the pool
      const pk = migratedPoolOf(pk(mint)); const [p] = await getAccounts([pk], "processed"); const pool = decodePool(p?.data);
      if (!pool) throw new Error(c ? "migrating: no pool yet" : "no curve, no pool");
      const cfg = await ammCfg(); const [b, q] = await getAccounts([pool.baseAcc, pool.quoteAcc], "processed"); const br = tokenAmount(b?.data), qr = tokenAmount(q?.data);
      if (br == null || qr == null) throw new Error("pool reserves unreadable");
      tokens = poolBuy(pool, cfg, br, qr, LAMPORTS); venue = "pool"; curve = 0; st.pool = pool; st.poolPk = pk; st.baseRes = br; st.quoteRes = qr;
    }
    if (tokens <= 0n) throw new Error("zero tokens");
    const v = await readValue(mint, tokens, st); const x0 = v?.lamports != null ? Number(v.lamports) / Number(LAMPORTS) : null; // the round trip at the same instant: what the buy costs in fees + impact
    const px = STAKE / (Number(tokens) / 1e6) * (su || 0), gap = chainPx > 0 && px > 0 ? px / chainPx - 1 : null; // USD per token, like the paper entry_price
    const ins = db.prepare("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, curve, s_sol_in, s_tokens, s_px, s_in_gap, s_x0, s_hi, s_last_x, s_last_ts, s_n) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)");
    for (const id of ids) ins.run(id, mint, strat, t, venue, curve, STAKE, tokens.toString(), px || null, gap != null ? +gap.toFixed(4) : null, x0 != null ? +x0.toFixed(4) : null, 1, x0 != null ? +x0.toFixed(4) : null, t);
    cfStat.entries += ids.length;
    watch(mint, st);
  } catch (e) { cfStat.entryErrs++; cfStat.lastErr = `entry ${mint.slice(0, 6)}: ${e.message}`.slice(0, 140);
    const ins = db.prepare("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, s_err, done) VALUES (?,?,?,?,?,?,1)"); for (const id of ids) ins.run(id, mint, strat, t, "none", e.message.slice(0, 100)); }
}

// ---- open positions: one watcher per mint (all books' rows of that coin share it) ----
const W = new Map(); // mint → { st, subs: [ids], lastPush }
function rows(mint) { return db.prepare("SELECT vol_id, strat, curve, s_tokens, s_hi, entry_ts, s_last_ts, s_max_gap_s FROM chain_fill WHERE mint=? AND done=0 AND s_tokens IS NOT NULL").all(mint); }
function apply(mint, lamportsOf, src) {
  const t = now(); let open = 0;
  for (const r of rows(mint)) {
    const lam = lamportsOf(BigInt(r.s_tokens)); if (lam == null) { open++; continue; }
    const x = Number(lam) / Number(LAMPORTS), hi = Math.max(r.s_hi || 1, x), keep = 1 - trailPct(r.curve);
    const reason = x <= (r.s_hi || 1) * keep ? "trail" : t - r.entry_ts >= HORIZON ? "2h" : null;
    const gap = Math.max(r.s_max_gap_s || 0, r.s_last_ts ? t - r.s_last_ts : 0); // the longest silence between price updates so far
    if (reason) { db.prepare("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_exit_x=?, s_exit_ts=?, s_exit_reason=?, s_r=?, s_exit_src=?, s_max_gap_s=?, done=1 WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), +x.toFixed(4), t, reason, +(x - 1 - NET_FEE / STAKE).toFixed(4), src, gap, r.vol_id); cfStat.exits++; }
    else { db.prepare("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_max_gap_s=? WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), gap, r.vol_id); open++; }
    cfStat.updates++;
  }
  if (src === "backstop") db.prepare("UPDATE chain_fill SET s_backstops=s_backstops+1 WHERE mint=? AND done=0").run(mint);
  if (!open) unwatch(mint);
}
async function watch(mint, st) {
  if (W.has(mint)) return; const w = { st, subs: [], lastPush: Date.now() }; W.set(mint, w);
  try {
    if (!st.pool) {
      const id = await onAccount(curveOf(pk(mint)), (data) => { try { const c = decodeCurve(data); if (!c) return; w.lastPush = Date.now();
        if (c.complete) { if (!w.st.complete) { w.st.complete = true; resub(mint).catch(() => {}); } return; }
        const g = G; if (!g) return; apply(mint, (tok) => quoteSell(c, g, tok), "sub"); } catch (e) { cfStat.errors++; cfStat.lastErr = "sub: " + e.message.slice(0, 100); } });
      w.subs.push(id); cfStat.subs++;
    } else await subPool(mint, w);
  } catch (e) { cfStat.errors++; cfStat.lastErr = "watch: " + e.message.slice(0, 100); }
}
async function subPool(mint, w) {
  const st = w.st; if (!st.pool) return;
  const onRes = (which) => (data) => { try { const amt = tokenAmount(data); if (amt == null) return; w.lastPush = Date.now(); if (which === "base") st.baseRes = amt; else st.quoteRes = amt;
    if (st.baseRes == null || st.quoteRes == null || !CFG) return; apply(mint, (tok) => poolSell(st.pool, CFG, st.baseRes, st.quoteRes, tok), "sub"); } catch (e) { cfStat.errors++; cfStat.lastErr = "psub: " + e.message.slice(0, 100); } };
  await ammCfg();
  w.subs.push(await onAccount(st.pool.baseAcc, onRes("base")), await onAccount(st.pool.quoteAcc, onRes("quote"))); cfStat.subs += 2;
}
/** the curve completed mid-trade: drop the curve subscription, find the pool (retry until it exists), subscribe to its reserves */
async function resub(mint) {
  const w = W.get(mint); if (!w) return; cfStat.resubs++;
  for (const id of w.subs.splice(0)) await offAccount(id);
  for (let i = 0; i < 20 && W.has(mint); i++) { try { const v = await readValue(mint, 1n, w.st); if (w.st.pool) { await subPool(mint, w); db.prepare("UPDATE chain_fill SET venue='pool' WHERE mint=? AND done=0").run(mint); return; } } catch {} await new Promise((r) => setTimeout(r, 3000)); }
}
async function unwatch(mint) { const w = W.get(mint); if (!w) return; W.delete(mint); for (const id of w.subs) await offAccount(id); }

/** BACKSTOP, every 30 s: re-read every open position from the chain (catches dropped subscriptions and anything missed), re-arm watchers after a restart, apply the 2 h horizon. */
let busy = false;
export async function chainBackstop() {
  if (!db || busy) return; busy = true;
  try {
    const open = db.prepare("SELECT DISTINCT mint FROM chain_fill WHERE done=0 AND s_tokens IS NOT NULL").all().map((r) => r.mint);
    for (const mint of open) {
      let w = W.get(mint);
      if (!w) { w = { st: { pool: null }, subs: [], lastPush: 0 }; await watch(mint, w.st); w = W.get(mint) || w; cfStat.drops++; db.prepare("UPDATE chain_fill SET s_drops=s_drops+1 WHERE mint=? AND done=0").run(mint); } // no watcher (restart or lost): re-armed
      try { const v = await readValue(mint, 1n, w.st); cfStat.backstops++;
        if (v && v.lamports != null) { const st = w.st; if (v.venue === "curve") { const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data); if (c && G) apply(mint, (tok) => quoteSell(c, G, tok), "backstop"); }
          else if (st.pool && CFG && st.baseRes != null && st.quoteRes != null) { if (!w.subs.length) await subPool(mint, w); apply(mint, (tok) => poolSell(st.pool, CFG, st.baseRes, st.quoteRes, tok), "backstop"); } }
        else if (v && v.venue === "migrating") { const t = now(); for (const r of rows(mint)) if (t - r.entry_ts >= HORIZON + 600) db.prepare("UPDATE chain_fill SET s_exit_reason='migrating-stuck', s_err='no pool 10 min past horizon', done=1 WHERE vol_id=?").run(r.vol_id); }
        else { const t = now(); for (const r of rows(mint)) if (t - r.entry_ts >= HORIZON) { db.prepare("UPDATE chain_fill SET s_exit_x=s_last_x, s_exit_ts=?, s_exit_reason='2h-unreadable', s_r=?, s_exit_src='stale', done=1 WHERE vol_id=?").run(t, r.s_last_x != null ? +(r.s_last_x - 1 - NET_FEE / STAKE).toFixed(4) : null, r.vol_id); } }
      } catch (e) { cfStat.errors++; cfStat.lastErr = `backstop ${mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
    }
    for (const mint of [...W.keys()]) if (!open.includes(mint)) await unwatch(mint); // nothing open any more
  } catch (e) { cfStat.errors++; cfStat.lastErr = "backstop: " + e.message.slice(0, 120); }
  finally { busy = false; }
}
