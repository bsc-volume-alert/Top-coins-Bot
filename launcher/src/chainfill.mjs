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
const STAKE = n("LAUNCH_SHADOW_SOL", 0.2), LAMPORTS = BigInt(Math.round(STAKE * 1e9)), STAKE02 = n("LAUNCH_SIM_SMALL_SOL", 0.02), LAMPORTS02 = BigInt(Math.round(STAKE02 * 1e9)), HORIZON = 120 * 60, NET_FEE = n("LAUNCH_SIM_NET_FEE", 0.0015); // network + priority fee, both legs, in SOL
const now = () => Math.floor(Date.now() / 1000);
const BUY_LAND_MS = n("LAUNCH_SIM_BUY_LAND_MS", 1000), SELL_LAND_MS = n("LAUNCH_SIM_SELL_LAND_MS", 700); // 0.9.2: a transaction executes against the chain state this long after we decide (measured on the first live FD trades: buys landed 0.6–1.0 s after the check, sells 0.5 s after the trail)
// 0.9.12: prepared statements are cached (the tick loop prepared each statement afresh on every price update — a million a day — and the native memory behind them is only freed by the garbage collector; rss climbed ~55 MB/h)
const STMT = new Map(); const q = (sql) => { let st = STMT.get(sql); if (!st) { st = db.prepare(sql); STMT.set(sql, st); } return st; };
export const MV = "fill-2"; // measurement version of the simulated fill policy. fill-1 (0.9.2–0.9.16): a failed landing re-read fell back to the check-time reserves. fill-2 (0.9.17, Codex 6 Nov): no fallback — a failed re-read is a data-failure row with no fill and no return; a position unreadable at the horizon is unresolved, not valued at its last print.
export const cfStat = { entries: 0, skipped: 0, entryErrs: 0, landFails: 0, unresolved: 0, updates: 0, exits: 0, subs: 0, resubs: 0, drops: 0, backstops: 0, errors: 0, lastErr: "", mv: MV };
const resOf = (st, c, br, qr) => c ? JSON.stringify({ vSol: String(c.vSol), vTok: String(c.vTok), rSol: String(c.rSol), rTok: String(c.rTok), complete: c.complete ? 1 : 0 }) : br != null ? JSON.stringify({ base: String(br), quote: String(qr), pool: st?.poolPk ? String(st.poolPk) : null }) : null; // 0.9.17: the reserve state a value was computed from, verbatim

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

export function initChainFill(d) { STMT.clear();
  db = d;
  db.exec(`CREATE TABLE IF NOT EXISTS chain_fill (vol_id INTEGER PRIMARY KEY, mint TEXT, strat TEXT, entry_ts INTEGER, venue TEXT, curve INTEGER, s_sol_in REAL, s_tokens TEXT, s_px REAL, s_in_gap REAL, s_x0 REAL,
    s_hi REAL, s_last_x REAL, s_last_ts INTEGER, s_n INTEGER DEFAULT 0, s_exit_x REAL, s_exit_ts INTEGER, s_exit_reason TEXT, s_r REAL, s_drops INTEGER DEFAULT 0, s_backstops INTEGER DEFAULT 0, s_err TEXT, done INTEGER DEFAULT 0)`);
  db.exec("CREATE INDEX IF NOT EXISTS chain_fill_open ON chain_fill (done)");
  db.exec("CREATE INDEX IF NOT EXISTS cf_mint ON chain_fill(mint, strat); CREATE INDEX IF NOT EXISTS cf_entry ON chain_fill(entry_ts)"); // 0.9.18
  try { db.exec("CREATE TABLE IF NOT EXISTS fd_rules (k TEXT PRIMARY KEY, since_ts INTEGER, ver TEXT)"); const first = db.prepare("SELECT MIN(entry_ts) t FROM chain_fill WHERE s_mv='fill-2'").get()?.t; db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('FILL2', ?, 'fill-2')").run(first || Math.floor(Date.now() / 1000)); } catch {} // 0.9.21: the measurement-policy activation time = the first fill-2 row (0.9.17 up, 6 Nov 09:46 UK); the headline window on the pages starts here
  for (const c of ["s_res_trig TEXT", "s_mv TEXT", "s_fail_kind TEXT", "s_res_check TEXT", "s_res_fill TEXT", "s_res_exit TEXT", "s_ms_decision INTEGER", "s_ms_read_check INTEGER", "s_ms_land INTEGER", "s_ms_exit INTEGER", "s_exit_src TEXT", "s_max_gap_s INTEGER", "s_trig_ts REAL", "s_trig_x REAL", "s_fill_ms INTEGER", "s_entry_state INTEGER", "s_r02 REAL", "s_half_x REAL", "s_r_half REAL", "s_delay_ms INTEGER", "s_tokens02 TEXT", "s_x02 REAL", "s_hi02 REAL", "s_exit_x02 REAL", "s_x60 REAL", "s_x60_02 REAL", "s_gap_dec REAL", "s_t2x INTEGER", "s_t3x INTEGER", "s_t5x INTEGER"]) try { db.exec(`ALTER TABLE chain_fill ADD COLUMN ${c}`); } catch {} // 0.9.1: which source produced the exit (push / backstop) and the longest silence between price updates before it
  try { q("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('SIM', ?, ?)").run(now(), "0.9.0"); } catch {} // when the simulated fills started — the page counts every book from here on this measure
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
  if (!st.pool) { const pkp = migratedPoolOf(pk(mint)); const [p] = await getAccounts([pkp], "processed"); const pool = decodePool(p?.data); if (!pool) return { lamports: null, venue: "migrating", complete: true }; st.pool = pool; st.poolPk = pkp; } // 0.9.5: the local was shadowing the pk() helper ("Cannot access pk before initialization" in every backstop read since 0.9.1)
  const cfg = await ammCfg(); const [b, q] = await getAccounts([st.pool.baseAcc, st.pool.quoteAcc], "processed"); const br = tokenAmount(b?.data), qr = tokenAmount(q?.data);
  if (br == null || qr == null) return { lamports: null, venue: "pool", complete: true };
  st.baseRes = br; st.quoteRes = qr;
  return { lamports: poolSell(st.pool, cfg, br, qr, tokens), venue: "pool", complete: true };
}

/** one read of the reserves: tokens for STAKE on this state, plus a sell quote on the same state (for the round-trip figure). Sets st.pool when graduated. */
/** fill-2: a failed landing re-read is a data-failure row — no fill, no return, counted. Exported so the test harness can prove no stale fill is written. */
export function recordLandingFailure(ids, mint, strat, t, venue, curve, msg, resCheck, msDecision, msReadCheck, delayMs) {
  cfStat.landFails++; cfStat.lastErr = `landing read ${mint.slice(0, 6)}: ${msg}`.slice(0, 120);
  const fail = q("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, curve, s_err, s_fail_kind, s_mv, s_res_check, s_ms_decision, s_ms_read_check, s_ms_land, s_delay_ms, done) VALUES (?,?,?,?,?,?,?,'landing-read',?,?,?,?,?,?,1)");
  for (const id of ids) fail.run(id, mint, strat, t, venue, curve, ("landing read failed: " + msg).slice(0, 100), MV, resCheck, msDecision, msReadCheck, Date.now(), delayMs);
}
async function fillState(mint, st) {
  if (process.env.LAUNCH_SIM_TEST_LANDFAIL === "1") throw new Error("test: forced landing failure"); // harness only
  const g = await global(); if (!g) throw new Error("no Global");
  if (!st.pool) { const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data);
    if (c && !c.complete) { st.sellOf = (tok) => quoteSell(c, g, tok); st.lastRes = resOf(st, c); return { tokens: quoteBuy(c, g, LAMPORTS).tokens, tokens02: quoteBuy(c, g, LAMPORTS02).tokens, venue: "curve", curve: 1, res: st.lastRes }; }
    if (!c) return null; st.complete = true; }
  if (!st.pool) { const pkp = migratedPoolOf(pk(mint)); const [p] = await getAccounts([pkp], "processed"); const pool = decodePool(p?.data); if (!pool) throw new Error("migrating: no pool yet"); st.pool = pool; st.poolPk = pkp; }
  const cfg = await ammCfg(); const [b, q] = await getAccounts([st.pool.baseAcc, st.pool.quoteAcc], "processed"); const br = tokenAmount(b?.data), qr = tokenAmount(q?.data);
  if (br == null || qr == null) throw new Error("pool reserves unreadable"); st.baseRes = br; st.quoteRes = qr;
  const pool = st.pool; st.sellOf = (tok) => poolSell(pool, cfg, br, qr, tok); st.lastRes = resOf(st, null, br, qr);
  return { tokens: poolBuy(pool, cfg, br, qr, LAMPORTS), tokens02: poolBuy(pool, cfg, br, qr, LAMPORTS02), venue: "pool", curve: 0, res: st.lastRes };
}
/** ENTRY: called once per coin per check when any rule books a paper entry (ids = the vol_paper rows just booked for that coin). */
export async function chainEntry(mint, ids, chainPx, su, strat, opts = {}) {
  if (!db || !ids.length) return;
  const delayMs = opts.delayMs || 0, guard = opts.guard || 0; // 0.9.6: delayMs = decide now, fill later (the 120-s variants of the U books); guard = skip the fill if the price has already dropped this far from the check price (0.3 = 30%)
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const t = now(); const st = { pool: null };
  try {
    const g = await global(); if (!g) throw new Error("no Global");
    const msDecision = Date.now(); const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data); const msReadCheck = Date.now();
    let tokens = 0n, tokens02 = 0n, venue = "curve", curve = 1, resCheck = c && !c.complete ? resOf(st, c) : null;
    if (c && !c.complete) { tokens = quoteBuy(c, g, LAMPORTS).tokens; tokens02 = quoteBuy(c, g, LAMPORTS02).tokens; st.sellOf = (tok) => quoteSell(c, g, tok); }
    else { // graduated (or not a pump.fun curve): the pool
      const pkp = migratedPoolOf(pk(mint)); const [p] = await getAccounts([pkp], "processed"); const pool = decodePool(p?.data);
      if (!pool) throw new Error(c ? "migrating: no pool yet" : "no curve, no pool");
      const cfg = await ammCfg(); const [b, q] = await getAccounts([pool.baseAcc, pool.quoteAcc], "processed"); const br = tokenAmount(b?.data), qr = tokenAmount(q?.data);
      if (br == null || qr == null) throw new Error("pool reserves unreadable");
      tokens = poolBuy(pool, cfg, br, qr, LAMPORTS); tokens02 = poolBuy(pool, cfg, br, qr, LAMPORTS02); venue = "pool"; curve = 0; st.pool = pool; st.poolPk = pkp; st.baseRes = br; st.quoteRes = qr; st.sellOf = (tok) => poolSell(pool, cfg, br, qr, tok); resCheck = resOf(st, null, br, qr);
    }
    if (tokens <= 0n) throw new Error("zero tokens");
    // 0.9.8 (review, 5 Nov 21:00 UK): the guard is decided on the state a live bot would read BEFORE submitting — this one — and the fill lands BUY_LAND_MS later on whatever state is there then
    const pxDec = STAKE / (Number(tokens) / 1e6) * (su || 0), gapDec = chainPx > 0 && pxDec > 0 ? pxDec / chainPx - 1 : null;
    if (guard > 0 && gapDec != null && gapDec <= -guard) {
      const skip = q("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, curve, s_sol_in, s_px, s_in_gap, s_gap_dec, s_exit_reason, s_r, s_r02, s_delay_ms, done, s_mv, s_res_check, s_ms_decision, s_ms_read_check) VALUES (?,?,?,?,?,?,0,?,?,?,'skipped-dump',0,0,?,1,?,?,?,?)");
      for (const id of ids) skip.run(id, mint, strat, t, venue, curve, pxDec || null, +gapDec.toFixed(4), +gapDec.toFixed(4), delayMs, MV, resCheck, msDecision, msReadCheck); cfStat.skipped = (cfStat.skipped || 0) + ids.length; return; }
    // 0.9.2: the buy lands BUY_LAND_MS after the check — wait that long, re-read the reserves, and fill on that state (the check-time state is kept as the fallback if the re-read fails)
    await new Promise((r) => setTimeout(r, BUY_LAND_MS)); let entryState = 0, resFill = null, msLand = null;
    try { const r2 = await fillState(mint, st); msLand = Date.now(); if (r2) { tokens = r2.tokens; tokens02 = r2.tokens02; venue = r2.venue; curve = r2.curve; entryState = 1; resFill = r2.res || null; } else throw new Error("curve/pool state not decodable at landing"); }
    catch (e) { // fill-2: no fill on stale reserves — a data-failure row, counted, no return
      recordLandingFailure(ids, mint, strat, t, venue, curve, e.message, resCheck, msDecision, msReadCheck, delayMs); return; }
    const x0 = st.sellOf ? Number(st.sellOf(tokens)) / Number(LAMPORTS) : null; // the round trip on the SAME reserve state: what the buy costs in fees + impact
    const px = STAKE / (Number(tokens) / 1e6) * (su || 0), gap = chainPx > 0 && px > 0 ? px / chainPx - 1 : null; // USD per token, like the paper entry_price
    const x02 = st.sellOf && tokens02 > 0n ? Number(st.sellOf(tokens02)) / Number(LAMPORTS02) : null; // 0.9.8: the real 0.02 SOL position's round trip on the same state
    const ins = q("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, curve, s_sol_in, s_tokens, s_px, s_in_gap, s_gap_dec, s_x0, s_hi, s_last_x, s_last_ts, s_n, s_entry_state, s_delay_ms, s_tokens02, s_x02, s_hi02, s_mv, s_res_check, s_res_fill, s_ms_decision, s_ms_read_check, s_ms_land) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,1,?,?,?,?,?,?)");
    for (const id of ids) ins.run(id, mint, strat, t, venue, curve, STAKE, tokens.toString(), px || null, gap != null ? +gap.toFixed(4) : null, gapDec != null ? +gapDec.toFixed(4) : null, x0 != null ? +x0.toFixed(4) : null, 1, x0 != null ? +x0.toFixed(4) : null, now(), entryState, delayMs, tokens02 > 0n ? tokens02.toString() : null, x02 != null ? +x02.toFixed(4) : null, MV, resCheck, resFill, msDecision, msReadCheck, msLand);
    cfStat.entries += ids.length;
    watch(mint, st);
  } catch (e) { cfStat.entryErrs++; cfStat.lastErr = `entry ${mint.slice(0, 6)}: ${e.message}`.slice(0, 140);
    const ins = q("INSERT OR IGNORE INTO chain_fill (vol_id, mint, strat, entry_ts, venue, s_err, done) VALUES (?,?,?,?,?,?,1)"); for (const id of ids) ins.run(id, mint, strat, t, "none", e.message.slice(0, 100)); }
}

// ---- open positions: one watcher per mint (all books' rows of that coin share it) ----
const W = new Map(); // mint → { st, subs: [ids], lastPush }
const pending = new Set(); // 0.9.2: mints with a triggered sell waiting for the landing state
setInterval(() => { for (const mint of [...pending]) { pending.delete(mint); setTimeout(() => { const w = W.get(mint); if (!w) return; readValue(mint, 1n, w.st).then((v) => { if (!v || v.lamports == null) return; const st = w.st; if (v.venue === "curve") getAccounts([curveOf(pk(mint))], "processed").then(([a]) => { const c = decodeCurve(a?.data); if (c && G) apply(mint, (tok) => quoteSell(c, G, tok), "land", resOf(null, c)); }).catch(() => {}); else if (st.pool && CFG) apply(mint, (tok) => poolSell(st.pool, CFG, st.baseRes, st.quoteRes, tok), "land", resOf(st, null, st.baseRes, st.quoteRes)); }).catch(() => {}); }, SELL_LAND_MS + 50); } }, 200);
function rows(mint) { return q("SELECT vol_id, strat, curve, s_tokens, s_hi, entry_ts, s_last_ts, s_max_gap_s, s_trig_ts, s_trig_x, s_half_x, s_tokens02, s_hi02, s_x60, s_t2x, s_t3x, s_t5x FROM chain_fill WHERE mint=? AND done=0 AND s_tokens IS NOT NULL").all(mint); }
function apply(mint, lamportsOf, src, res = null) {
  const t = now(); let open = 0;
  for (const r of rows(mint)) {
    const lam = lamportsOf(BigInt(r.s_tokens)); if (lam == null) { open++; continue; }
    const x = Number(lam) / Number(LAMPORTS), hi = Math.max(r.s_hi || 1, x), keep = 1 - trailPct(r.curve);
    const lam02 = r.s_tokens02 ? lamportsOf(BigInt(r.s_tokens02)) : null, x02 = lam02 != null ? Number(lam02) / Number(LAMPORTS02) : null, hi02 = x02 != null ? Math.max(r.s_hi02 || 1, x02) : null; // 0.9.8: the real 0.02 position, valued on the same state
    if (r.s_x60 == null && t - r.entry_ts >= 60) q("UPDATE chain_fill SET s_x60=?, s_x60_02=? WHERE vol_id=? AND s_x60 IS NULL").run(+x.toFixed(4), x02 != null ? +x02.toFixed(4) : null, r.vol_id); // 0.9.8: executable value of the still-open position 60 s after entry (the time-stop column)
    if (x02 != null) q("UPDATE chain_fill SET s_x02=?, s_hi02=? WHERE vol_id=?").run(+x02.toFixed(4), +hi02.toFixed(4), r.vol_id);
    const gap = Math.max(r.s_max_gap_s || 0, r.s_last_ts ? t - r.s_last_ts : 0); // the longest silence between price updates so far
    const tms = Date.now();
    if (r.s_trig_ts != null) { // 0.9.2: the sell was decided at s_trig_ts; it executes on the first state SELL_LAND_MS or more after that
      if (tms - r.s_trig_ts * 1000 >= SELL_LAND_MS) { const reason = t - r.entry_ts >= HORIZON && !(r.s_trig_x <= (r.s_hi || 1) * keep) ? "2h" : "trail";
        const rHalf = r.s_half_x != null ? 0.5 * r.s_half_x + 0.5 * x - 1 - NET_FEE / STAKE : x - 1 - NET_FEE / STAKE; // 0.9.6: half sold at the first 2x print, the rest on this exit
        const r02 = x02 != null ? x02 - 1 - NET_FEE / STAKE02 : x - 1 - NET_FEE / STAKE02; // 0.9.8: true 0.02 result from the real 0.02 position (falls back to the rescaled figure if the small quote was unavailable)
        q("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_exit_x=?, s_exit_ts=?, s_exit_reason=?, s_r=?, s_r02=?, s_exit_x02=?, s_r_half=?, s_exit_src=?, s_max_gap_s=?, s_fill_ms=?, s_res_exit=?, s_ms_exit=?, done=1 WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), +x.toFixed(4), t, reason, +(x - 1 - NET_FEE / STAKE).toFixed(4), +r02.toFixed(4), x02 != null ? +x02.toFixed(4) : null, +rHalf.toFixed(4), src, gap, Math.round(tms - r.s_trig_ts * 1000), res, tms, r.vol_id); cfStat.exits++; }
      else { q("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_max_gap_s=? WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), gap, r.vol_id); open++; }
      cfStat.updates++; continue; }
    const trigger = x <= (r.s_hi || 1) * keep || t - r.entry_ts >= HORIZON;
    if (trigger) { q("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_max_gap_s=?, s_trig_ts=?, s_trig_x=?, s_res_trig=? WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), gap, tms / 1000, +x.toFixed(4), res, r.vol_id); open++; pending.add(mint); }
    else { q("UPDATE chain_fill SET s_last_x=?, s_last_ts=?, s_hi=?, s_n=s_n+1, s_max_gap_s=? WHERE vol_id=?").run(+x.toFixed(4), t, +hi.toFixed(4), gap, r.vol_id); open++; }
    if (r.s_half_x == null && x >= 2) q("UPDATE chain_fill SET s_half_x=? WHERE vol_id=? AND s_half_x IS NULL").run(+x.toFixed(4), r.vol_id); // 0.9.6: the half-at-2x column — the first print at or above 2x is where half would have gone
    if (r.s_t2x == null && x >= 2) q("UPDATE chain_fill SET s_t2x=? WHERE vol_id=? AND s_t2x IS NULL").run(t, r.vol_id); // 0.9.9: executable milestones, kept apart from the final result
    if (r.s_t3x == null && x >= 3) q("UPDATE chain_fill SET s_t3x=? WHERE vol_id=? AND s_t3x IS NULL").run(t, r.vol_id);
    if (r.s_t5x == null && x >= 5) q("UPDATE chain_fill SET s_t5x=? WHERE vol_id=? AND s_t5x IS NULL").run(t, r.vol_id);
    cfStat.updates++;
  }
  if (src === "backstop") q("UPDATE chain_fill SET s_backstops=s_backstops+1 WHERE mint=? AND done=0").run(mint);
  if (!open) unwatch(mint);
}
async function watch(mint, st) {
  if (W.has(mint)) return; const w = { st, subs: [], lastPush: Date.now() }; W.set(mint, w);
  try {
    if (!st.pool) {
      const id = await onAccount(curveOf(pk(mint)), (data) => { try { const c = decodeCurve(data); if (!c) return; w.lastPush = Date.now();
        if (c.complete) { if (!w.st.complete) { w.st.complete = true; resub(mint).catch(() => {}); } return; }
        const g = G; if (!g) return; apply(mint, (tok) => quoteSell(c, g, tok), "sub", resOf(null, c)); } catch (e) { cfStat.errors++; cfStat.lastErr = "sub: " + e.message.slice(0, 100); } });
      w.subs.push(id); cfStat.subs++;
    } else await subPool(mint, w);
  } catch (e) { cfStat.errors++; cfStat.lastErr = "watch: " + e.message.slice(0, 100); }
}
async function subPool(mint, w) {
  const st = w.st; if (!st.pool) return;
  const onRes = (which) => (data) => { try { const amt = tokenAmount(data); if (amt == null) return; w.lastPush = Date.now(); if (which === "base") st.baseRes = amt; else st.quoteRes = amt;
    if (st.baseRes == null || st.quoteRes == null || !CFG) return; apply(mint, (tok) => poolSell(st.pool, CFG, st.baseRes, st.quoteRes, tok), "sub", resOf(st, null, st.baseRes, st.quoteRes)); } catch (e) { cfStat.errors++; cfStat.lastErr = "psub: " + e.message.slice(0, 100); } };
  await ammCfg();
  w.subs.push(await onAccount(st.pool.baseAcc, onRes("base")), await onAccount(st.pool.quoteAcc, onRes("quote"))); cfStat.subs += 2;
}
/** the curve completed mid-trade: drop the curve subscription, find the pool (retry until it exists), subscribe to its reserves */
async function resub(mint) {
  const w = W.get(mint); if (!w) return; cfStat.resubs++;
  for (const id of w.subs.splice(0)) await offAccount(id);
  for (let i = 0; i < 20 && W.has(mint); i++) { try { const v = await readValue(mint, 1n, w.st); if (w.st.pool) { await subPool(mint, w); q("UPDATE chain_fill SET venue='pool' WHERE mint=? AND done=0").run(mint); return; } } catch {} await new Promise((r) => setTimeout(r, 3000)); }
}
async function unwatch(mint) { const w = W.get(mint); if (!w) return; W.delete(mint); for (const id of w.subs) await offAccount(id); }

/** BACKSTOP, every 30 s: re-read every open position from the chain (catches dropped subscriptions and anything missed), re-arm watchers after a restart, apply the 2 h horizon. */
let busy = false;
export async function chainBackstop() {
  if (!db || busy) return; busy = true;
  try {
    const open = q("SELECT DISTINCT mint FROM chain_fill WHERE done=0 AND s_tokens IS NOT NULL").all().map((r) => r.mint);
    for (const mint of open) {
      let w = W.get(mint);
      if (!w) { w = { st: { pool: null }, subs: [], lastPush: 0 }; await watch(mint, w.st); w = W.get(mint) || w; cfStat.drops++; q("UPDATE chain_fill SET s_drops=s_drops+1 WHERE mint=? AND done=0").run(mint); } // no watcher (restart or lost): re-armed
      try { const v = await readValue(mint, 1n, w.st); cfStat.backstops++;
        if (v && v.lamports != null) { const st = w.st; if (v.venue === "curve") { const [a] = await getAccounts([curveOf(pk(mint))], "processed"); const c = decodeCurve(a?.data); if (c && G) apply(mint, (tok) => quoteSell(c, G, tok), "backstop", resOf(null, c)); }
          else if (st.pool && CFG && st.baseRes != null && st.quoteRes != null) { if (!w.subs.length) await subPool(mint, w); apply(mint, (tok) => poolSell(st.pool, CFG, st.baseRes, st.quoteRes, tok), "backstop", resOf(st, null, st.baseRes, st.quoteRes)); } }
        else if (v && v.venue === "migrating") { const t = now(); for (const r of rows(mint)) if (t - r.entry_ts >= HORIZON + 600) q("UPDATE chain_fill SET s_exit_reason='migrating-stuck', s_err='no pool 10 min past horizon', done=1 WHERE vol_id=?").run(r.vol_id); }
        else { const t = now(); for (const r of rows(mint)) if (t - r.entry_ts >= HORIZON) { cfStat.unresolved++; q("UPDATE chain_fill SET s_exit_ts=?, s_exit_reason='2h-unreadable', s_exit_src='unresolved', s_fail_kind='unreadable-at-horizon', s_err='unresolved: state unreadable at the horizon; last print kept in s_last_x, no return', s_ms_exit=?, done=1 WHERE vol_id=?").run(t, Date.now(), r.vol_id); } } // fill-2: unresolved, not valued at the last print}
      } catch (e) { cfStat.errors++; cfStat.lastErr = `backstop ${mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
    }
    for (const mint of [...W.keys()]) if (!open.includes(mint)) await unwatch(mint); // nothing open any more
  } catch (e) { cfStat.errors++; cfStat.lastErr = "backstop: " + e.message.slice(0, 120); }
  finally { busy = false; }
}
