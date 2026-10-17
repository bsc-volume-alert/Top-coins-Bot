// v0.18.62 Volume log — every Solana coin that trades ≥ $100K in 5 minutes gets ONE line per wake-up in `vol_log`, bought or not.
// Two sources: our own feed (pump.fun / PumpSwap / Raydium CPMM-CLMM-LaunchLab / Orca, trade by trade) and GMGN's lists (every DEX,
// incl. Meteora and Raydium's older pools that our feed cannot read). Each line records: when it crossed and at what MC, how old the
// coin was, which source saw it first and both sources' 5-minute figures side by side (so we learn whether GMGN's number matches ours),
// $ in / $ out, Project 6's decision with the reason, and what the coin did next — highest and lowest price over 24 h (as a multiple of
// the wake-up price and as MC) and its MC 15 min, 1 h, 6 h and 24 h later (DexScreener).
// A wake-up ends when neither source has seen the coin at $100K+/5m for 30 minutes; the next crossing starts a new line.
// Prices are tracked as USD per token (our feed: SOL price × SOL/USD; GMGN and DexScreener: their USD price), so coins of any supply
// and any source compare correctly. Coins our feed cannot read are priced from GMGN's lists while listed, else DexScreener every ~60 s
// for the first 6 h. Costs no RPC credits.
import { db, q } from "./db.js";
import { solUsdCached } from "./price.js";

export const VOL_LOG_USD = Number(process.env.VOL_LOG_USD || 100_000);
const GAP_S = 1800, TRACK_S = 86400, QUIET_S = 90, QUIET_POLL_H = 6;
const NOT_COINS = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB"]);

db.exec(`CREATE TABLE IF NOT EXISTS vol_log (id INTEGER PRIMARY KEY AUTOINCREMENT, mint TEXT, name TEXT, symbol TEXT, ts INTEGER, last_ts INTEGER,
  first_src TEXT, feed_ts INTEGER, gmgn_ts INTEGER, venue TEXT, exchange TEXT, launchpad TEXT, created_ts INTEGER, age_s INTEGER, mc REAL, px0 REAL,
  v5_feed REAL, v5_gmgn REAL, v5_feed_max REAL, v5_gmgn_max REAL, buy_usd REAL, sell_usd REAL, buys INTEGER, sells INTEGER, liq REAL, holders INTEGER,
  p6 TEXT, p6_note TEXT, p6_hist TEXT, p6_id INTEGER, peak_x REAL, peak_mc REAL, peak_ts INTEGER, low_x REAL, low_mc REAL, low_ts INTEGER,
  mc_15m REAL, mc_1h REAL, mc_6h REAL, mc_24h REAL, done INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS vl_mint ON vol_log(mint); CREATE INDEX IF NOT EXISTS vl_ts ON vol_log(ts); CREATE INDEX IF NOT EXISTS vl_done ON vol_log(done, ts);`);
const qIns = db.prepare(`INSERT INTO vol_log (mint,name,symbol,ts,last_ts,first_src,feed_ts,gmgn_ts,venue,exchange,launchpad,created_ts,age_s,mc,px0,v5_feed,v5_gmgn,
  v5_feed_max,v5_gmgn_max,buy_usd,sell_usd,buys,sells,liq,holders,peak_x,peak_mc,peak_ts,low_x,low_mc,low_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const qFeedFirst = db.prepare(`UPDATE vol_log SET feed_ts=?, venue=?, buy_usd=?, sell_usd=? WHERE id=?`);
const qGmgnFirst = db.prepare(`UPDATE vol_log SET gmgn_ts=?, exchange=?, launchpad=?, buys=?, sells=?, liq=?, holders=?, name=COALESCE(name,?), symbol=COALESCE(symbol,?) WHERE id=?`);
const qAge = db.prepare(`UPDATE vol_log SET created_ts=?, age_s=? WHERE id=? AND created_ts IS NULL`);
const qP6 = db.prepare(`UPDATE vol_log SET p6=?, p6_note=?, p6_hist=?, p6_id=COALESCE(?,p6_id) WHERE id=?`);
const qUpd = db.prepare(`UPDATE vol_log SET last_ts=?, v5_feed_max=?, v5_gmgn_max=?, px0=?, peak_x=?, peak_mc=?, peak_ts=?, low_x=?, low_mc=?, low_ts=? WHERE id=?`);
const qDone = db.prepare(`UPDATE vol_log SET done=1 WHERE id=?`);
const qName = db.prepare(`UPDATE vol_log SET name=?, symbol=COALESCE(symbol,?) WHERE mint=? AND name IS NULL`);
const qOpen = db.prepare(`SELECT * FROM vol_log WHERE ts > ? ORDER BY ts`);
const qDue = db.prepare(`SELECT id, mint, ts, mc_15m, mc_1h, mc_6h, mc_24h FROM vol_log WHERE done=0 AND ts <= ?`);
const SLOTS = [["mc_15m", 900, 1800], ["mc_1h", 3600, 3600], ["mc_6h", 21600, 7200], ["mc_24h", 86400, 7200]]; // [column, due after s, give up after s more]
const qSlot = Object.fromEntries(SLOTS.map(([c]) => [c, db.prepare(`UPDATE vol_log SET ${c}=? WHERE id=?`)]));

export const vl = { rows: 0, feedFirst: 0, gmgnFirst: 0, dsCalls: 0, dsFail: 0, dsAsked: 0, dsGot: 0, follow: 0 };
const dsTried = new Map(); // mint -> { at: ms of last ask, miss: consecutive asks DexScreener returned nothing for }
const trk = new Map();     // id -> tracker
const cur = new Map();     // mint -> id of the latest wake-up
const mintIds = new Map(); // mint -> Set(ids tracked in the last 24 h)
const nowS = () => Math.floor(Date.now() / 1000);
const usdK = (v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1e3)}K`);

function current(mint, ts) { const t = trk.get(cur.get(mint)); return t && ts - t.last <= GAP_S ? t : null; }
function track(t) { trk.set(t.id, t); cur.set(t.mint, t.id); let s = mintIds.get(t.mint); if (!s) { s = new Set(); mintIds.set(t.mint, s); } s.add(t.id); }
function untrack(t) { trk.delete(t.id); const s = mintIds.get(t.mint); if (s) { s.delete(t.id); if (!s.size) mintIds.delete(t.mint); } if (cur.get(t.mint) === t.id) cur.delete(t.mint); }
// a USD price for one coin from any source: moves the highest / lowest of every wake-up of that coin still inside its 24 h
function price(mint, usd, ts, src) {
  const ids = mintIds.get(mint); if (!ids || !(usd > 0) || !isFinite(usd)) return;
  for (const id of ids) {
    const t = trk.get(id); if (!t || ts < t.start || ts > t.start + TRACK_S) continue;
    if (!(t.px0 > 0)) { t.px0 = usd; t.dirty = true; }
    const x = usd / t.px0; if (src === "feed") t.feedPxTs = ts; t.pxTs = ts;
    if (x > t.peak) { t.peak = x; t.peakTs = ts; t.dirty = true; }
    if (x < t.low) { t.low = x; t.lowTs = ts; t.dirty = true; }
  }
}

function create(src, o, ts) {
  const meta = (() => { try { return q.tokenMeta.get(o.mint); } catch { return null; } })();
  const created = meta?.create_ts || o.created || null, feed = src === "feed";
  const v5f = feed ? o.v5 : o.otherV5 ?? null, v5g = feed ? o.otherV5 ?? null : o.v5, px0 = o.usd > 0 ? o.usd : null;
  const r = qIns.run(o.mint, meta?.name || o.name || null, meta?.symbol || o.symbol || null, ts, ts, src, feed ? ts : null, feed ? null : ts,
    feed ? o.venue || null : null, feed ? null : o.exchange || null, feed ? null : o.launchpad || null, created, created ? ts - created : null, o.mc || null, px0,
    v5f, v5g, v5f, v5g, feed ? o.bu ?? null : null, feed ? o.su ?? null : null, feed ? null : o.buys ?? null, feed ? null : o.sells ?? null,
    feed ? null : o.liq ?? null, feed ? null : o.holders ?? null, 1, o.mc || null, ts, 1, o.mc || null, ts);
  const t = { id: Number(r.lastInsertRowid), mint: o.mint, start: ts, last: ts, mc0: o.mc || null, px0, feedTs: feed ? ts : null, gmgnTs: feed ? null : ts,
    v5f: v5f || 0, v5g: v5g || 0, peak: 1, peakTs: ts, low: 1, lowTs: ts, pxTs: ts, feedPxTs: feed ? ts : 0, created, p6: null, p6Note: null, p6Hist: "", dirty: false };
  track(t); vl.rows++; feed ? vl.feedFirst++ : vl.gmgnFirst++;
  return t;
}

function observe(src, o, ts) {
  let t = current(o.mint, ts);
  if (!t) return create(src, o, ts);
  t.last = ts; t.dirty = true;
  if (src === "feed") {
    if (o.v5 > t.v5f) t.v5f = o.v5;
    if (!t.feedTs) { t.feedTs = ts; try { qFeedFirst.run(ts, o.venue || null, o.bu ?? null, o.su ?? null, t.id); } catch {} }
  } else {
    if (o.v5 > t.v5g) t.v5g = o.v5;
    if (!t.gmgnTs) { t.gmgnTs = ts; try { qGmgnFirst.run(ts, o.exchange || null, o.launchpad || null, o.buys ?? null, o.sells ?? null, o.liq ?? null, o.holders ?? null, o.name || null, o.symbol || null, t.id); } catch {} }
    if (o.created && !t.created) { t.created = o.created; try { qAge.run(o.created, t.start - o.created, t.id); } catch {} }
  }
  return t;
}

/** our feed, every swap (momentum.js): price for open wake-ups, our 5-minute figure, and a wake-up line once v5 ≥ $100K.
 *  gmgnV5 = GMGN's latest 5-minute figure for the coin (only looked up when v5 ≥ $100K). */
export function volFeed(tr, v5, bsu, ts, gmgnV5) {
  if (!tr?.mint || NOT_COINS.has(tr.mint)) return;
  const usd = tr.price > 0 ? tr.price * solUsdCached() : null;
  if (mintIds.has(tr.mint)) { price(tr.mint, usd, ts, "feed"); const t = current(tr.mint, ts); if (t && v5 > t.v5f) { t.v5f = v5; t.dirty = true; } }
  if (!(v5 >= VOL_LOG_USD)) return;
  try { observe("feed", { mint: tr.mint, v5, mc: tr.mc > 0 ? tr.mc : null, usd, venue: tr.venue || "pumpswap", bu: bsu?.[0], su: bsu?.[1], otherV5: gmgnV5 ?? null }, ts); }
  catch (e) { console.error("[vollog feed]", e.message); }
}

/** GMGN, every Solana row of every list (gmgn.js): price for open wake-ups, GMGN's 5-minute figure (5m lists only, v5 = null on 1m lists),
 *  and a wake-up line once GMGN shows v5 ≥ $100K. o.otherV5 = our feed's 5-minute figure (null = our feed holds no trades for this coin in
 *  memory; 0 = it knows the coin but saw no trades in the last 5 minutes). */
export function volGmgn(o) {
  if (!o?.mint || NOT_COINS.has(o.mint)) return;
  const ts = o.ts || nowS();
  if (mintIds.has(o.mint)) { price(o.mint, o.usd, ts, "gmgn"); const t = current(o.mint, ts); if (t && o.v5 > t.v5g) { t.v5g = o.v5; t.dirty = true; } }
  if (!(o.v5 >= VOL_LOG_USD)) return;
  try { observe("gmgn", o, ts); } catch (e) { console.error("[vollog gmgn]", e.message); }
}

/** Project 6's decision for a coin in an open wake-up (p6.js). "bought" sticks; otherwise the latest reason is kept and every change is
 *  appended to p6_hist as "+Nm reason (detail)". x.created fills the coin's age when P6 found it; x.id links the paper trade. */
export function volP6(mint, code, note = null, x = {}) {
  const t = current(mint, nowS()); if (!t) return; // only an open wake-up
  if (x.created && !t.created) { t.created = x.created; try { qAge.run(x.created, t.start - x.created, t.id); } catch {} }
  if (t.p6 === "bought" || t.p6 === code) return;
  t.p6 = code; t.p6Note = note;
  const step = `+${Math.max(0, Math.round((nowS() - t.start) / 60))}m ${code}${note ? ` (${note})` : ""}`;
  t.p6Hist = (t.p6Hist ? `${t.p6Hist} → ${step}` : step).slice(-400);
  try { qP6.run(code, note, t.p6Hist, x.id ?? null, t.id); } catch (e) { console.error("[vollog p6]", e.message); }
}

function save(t) {
  const mc = (x) => (t.mc0 > 0 ? t.mc0 * x : null);
  try { qUpd.run(t.last, t.v5f || null, t.v5g || null, t.px0, t.peak, mc(t.peak), t.peakTs, t.low, mc(t.low), t.lowTs, t.id); t.dirty = false; } catch (e) { console.error("[vollog save]", e.message); }
}
setInterval(() => {
  const n = nowS();
  for (const t of [...trk.values()]) { if (t.dirty) save(t); if (n > t.start + TRACK_S) untrack(t); }
  for (const [m, x] of dsTried) if (Date.now() - x.at > 27 * 3600_000) dsTried.delete(m);
}, 30_000);

// DexScreener: best Solana pair (by liquidity) per coin. Batches of 10: the multi-token reply may be capped at ~30 pairs in total and most
// coins have 2–3 pairs, so 30-coin batches could silently drop coins (independent check, 17 Oct). Asked vs returned is counted in /status.
async function dsBatch(mints) {
  vl.dsCalls++;
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(",")}`, { signal: AbortSignal.timeout(8000) });
  const j = await r.json(), best = new Map(), want = new Set(mints);
  for (const p of j.pairs || []) {
    const m = p.baseToken?.address; if (p.chainId !== "solana" || !want.has(m)) continue;
    const b = best.get(m); if (!b || (p.liquidity?.usd || 0) > (b.liquidity?.usd || 0)) best.set(m, p);
  }
  const out = new Map(); for (const [m, p] of best) out.set(m, { usd: Number(p.priceUsd) || null, mc: Number(p.marketCap || p.fdv) || null, name: p.baseToken?.name || null, symbol: p.baseToken?.symbol || null });
  return out;
}
// every 30 s: MC 15 min / 1 h / 6 h / 24 h after each wake-up (survives restarts — driven by the table), and a DexScreener price for
// wake-ups younger than 6 h that no source has priced for 90 s (Meteora coins off GMGN's lists, quiet coins)
let fBusy = false;
setInterval(async () => {
  if (fBusy) return; fBusy = true;
  try {
    const n = nowS(), want = new Map(); // mint -> [{id, col}]
    for (const r of qDue.all(n - 900)) {
      let open = false;
      for (const [col, at, grace] of SLOTS) {
        if (r[col] != null) continue;
        if (n < r.ts + at) { open = true; continue; }
        if (n <= r.ts + at + grace) { open = true; if (!want.has(r.mint)) want.set(r.mint, []); want.get(r.mint).push({ id: r.id, col }); }
      }
      if (!open) qDone.run(r.id);
    }
    // quiet coins DexScreener has returned nothing for 5 times in a row are left to the 15m/1h/6h/24h samples
    const quiet = new Set(); for (const t of trk.values()) if (n - t.start < QUIET_POLL_H * 3600 && n - t.pxTs >= QUIET_S && !((dsTried.get(t.mint)?.miss || 0) >= 5)) quiet.add(t.mint);
    // least recently asked first, so no coin can be starved by others that never return data
    const last = (m) => dsTried.get(m)?.at || 0;
    const mints = [...new Set([...want.keys(), ...quiet])].sort((a, b) => last(a) - last(b)).slice(0, 60);
    for (let i = 0; i < mints.length; i += 10) {
      const part = mints.slice(i, i + 10); let got;
      for (const m of part) dsTried.set(m, { at: Date.now(), miss: dsTried.get(m)?.miss || 0 });
      try { got = await dsBatch(part); } catch { vl.dsFail++; continue; }
      vl.dsAsked += part.length; vl.dsGot += got.size;
      for (const m of part) {
        const d = got.get(m), tr = dsTried.get(m); if (!d) { tr.miss++; continue; } tr.miss = 0;
        if (d.usd > 0) price(m, d.usd, n, "ds");
        if (d.name) try { qName.run(d.name, d.symbol, m); } catch {}
        if (d.mc > 0) for (const w of want.get(m) || []) { try { qSlot[w.col].run(d.mc, w.id); vl.follow++; } catch {} }
      }
    }
  } catch (e) { console.error("[vollog follow]", e.message); }
  finally { fBusy = false; }
}, 30_000);

// restart: rebuild the last 24 h of wake-ups so highs / lows keep updating
try {
  for (const r of qOpen.all(nowS() - TRACK_S)) {
    track({ id: r.id, mint: r.mint, start: r.ts, last: r.last_ts || r.ts, mc0: r.mc, px0: r.px0, feedTs: r.feed_ts, gmgnTs: r.gmgn_ts, v5f: r.v5_feed_max || 0, v5g: r.v5_gmgn_max || 0,
      peak: r.peak_x || 1, peakTs: r.peak_ts || r.ts, low: r.low_x || 1, lowTs: r.low_ts || r.ts, pxTs: 0, feedPxTs: 0, created: r.created_ts, p6: r.p6, p6Note: r.p6_note, p6Hist: r.p6_hist || "", dirty: false });
  }
  if (trk.size) console.log(`[vollog] restored ${trk.size} wake-up(s) from the last 24 h`);
} catch (e) { console.error("[vollog restore]", e.message); }

const qStat = db.prepare(`SELECT COUNT(*) n, SUM(feed_ts IS NOT NULL AND gmgn_ts IS NULL) fo, SUM(gmgn_ts IS NOT NULL AND feed_ts IS NULL) go, SUM(feed_ts IS NOT NULL AND gmgn_ts IS NOT NULL) bo,
  SUM(feed_ts IS NOT NULL AND gmgn_ts IS NOT NULL AND gmgn_ts < feed_ts) gfirst, COUNT(DISTINCT mint) coins FROM vol_log WHERE ts > ?`);
const qWhy = db.prepare(`SELECT COALESCE(p6,'not checked') p6, COUNT(*) n FROM vol_log WHERE ts > ? GROUP BY 1 ORDER BY n DESC`);
export function volLogStatus() {
  try {
    const since = nowS() - 86400, s = qStat.get(since); if (!s.n) return `Volume log (24 h): no coin at $${VOL_LOG_USD / 1000}K/5m yet`;
    const why = qWhy.all(since).map((r) => `${r.p6} ${r.n}`).join(", ");
    return `Volume log (24 h): ${s.n} wake-ups at $${VOL_LOG_USD / 1000}K+/5m (${s.coins} coins) — our feed only ${s.fo || 0} · GMGN only ${s.go || 0} · both ${s.bo || 0}${s.gfirst ? ` (GMGN first on ${s.gfirst})` : ""} · P6: ${why} · tracking ${trk.size} · DexScreener ${vl.dsCalls} calls, ${vl.dsGot}/${vl.dsAsked} coins returned${vl.dsFail ? `, ${vl.dsFail} failed` : ""}`;
  } catch (e) { return `Volume log: error ${e.message}`; }
}
export const volMem = () => ({ tracked: trk.size, mints: mintIds.size });
export { usdK as _usdK, trk as _trk, cur as _cur };
