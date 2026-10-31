// launcher 0.2.2 (owner, 31 Oct 2026 18:06 UK: "we need to know the prices of the copycats"): the market caps of every copycat — and of our own coins —
// from GMGN's price history. For each coin made in the last 24 h it reads GMGN token info (market cap now, all-time-high price, holders,
// bonding-curve progress) and the candles from creation to now (1-minute for the first 100 min, 5-minute after that), and records:
// peak market cap and when, market cap at +5/15/30/60 min, market cap now, graduated or not. Read-only on GMGN; buys and sells nothing.
// Runs 40 s after start and then every hour; the table goes out as copy_peaks.csv on the launcher-data branch.
import { gget, N } from "./gmgn.mjs";

export const peakStat = { runs: 0, coins: 0, ok: 0, errors: 0, lastErr: "", lastRun: null, running: false, infoKeys: null };
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

export function initPeaks(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS copy_peaks (mint TEXT PRIMARY KEY, launch_id INTEGER, post_name TEXT, name TEXT, symbol TEXT, created_ts INTEGER, ours INTEGER,
    peak_mc REAL, peak_ts INTEGER, peak_min REAL, peak_close_mc REAL, ath_mc REAL, mc5 REAL, mc15 REAL, mc30 REAL, mc60 REAL, mc_now REAL, holders INTEGER, progress REAL,
    status TEXT, liquidity REAL, vol_1h REAL, candles INTEGER, err TEXT, checked_ts INTEGER)`);
}

async function candles(mint, res, from, to) {
  const d = await gget("/v1/market/token_kline", { chain: "sol", address: mint, resolution: res, from: String(from * 1000), to: String(to * 1000) });
  return (d?.list || (Array.isArray(d) ? d : [])).map((c) => ({ t: Math.floor(Number(c.time) / 1000), h: N(c.high), c: N(c.close) })).filter((c) => c.h > 0);
}

async function one(db, c) {
  const now = Math.floor(Date.now() / 1000), t0 = c.created_ts;
  let info = null, err = "";
  try { info = await gget("/v1/token/info", { chain: "sol", address: c.mint }); if (!peakStat.infoKeys && info) peakStat.infoKeys = Object.keys(info).join(",").slice(0, 600); } catch (e) { err = "info: " + e.message; if (/rate limited/i.test(e.message)) throw e; }
  const supply = N(info?.total_supply) || N(info?.circulating_supply) || 1e9;
  const k = [];
  try {
    k.push(...await candles(c.mint, "1m", t0 - 60, Math.min(now, t0 + 98 * 60)));
    for (let to = now; to > t0 + 98 * 60; to -= 100 * 300) k.push(...await candles(c.mint, "5m", Math.max(t0 + 98 * 60, to - 100 * 300), to)); // GMGN gives ≤ 100 candles a call
  } catch (e) { err = (err ? err + " · " : "") + "kline: " + e.message; if (/rate limited/i.test(e.message)) throw e; }
  k.sort((a, b) => a.t - b.t);
  const peak = k.reduce((m, x) => (x.h > (m?.h || 0) ? x : m), null), peakClose = k.reduce((m, x) => Math.max(m, x.c || 0), 0);
  const at = (min) => { const x = k.filter((y) => y.t <= t0 + min * 60).pop(); return x && t0 + min * 60 <= now ? x.c * supply : null; };
  const priceNow = N(info?.price?.price ?? info?.price), ath = N(info?.ath_price);
  const progress = N(info?.launchpad_progress), status = String(info?.launchpad_status ?? info?.status ?? (progress != null && progress >= 1 ? "graduated?" : "")).slice(0, 30);
  db.prepare(`INSERT INTO copy_peaks VALUES (@mint,@launch_id,@post_name,@name,@symbol,@created_ts,@ours,@peak_mc,@peak_ts,@peak_min,@peak_close_mc,@ath_mc,@mc5,@mc15,@mc30,@mc60,@mc_now,@holders,@progress,@status,@liquidity,@vol_1h,@candles,@err,@checked_ts)
    ON CONFLICT(mint) DO UPDATE SET peak_mc=excluded.peak_mc, peak_ts=excluded.peak_ts, peak_min=excluded.peak_min, peak_close_mc=excluded.peak_close_mc, ath_mc=excluded.ath_mc,
    mc5=excluded.mc5, mc15=excluded.mc15, mc30=excluded.mc30, mc60=excluded.mc60, mc_now=excluded.mc_now, holders=excluded.holders, progress=excluded.progress, status=excluded.status,
    liquidity=excluded.liquidity, vol_1h=excluded.vol_1h, candles=excluded.candles, err=excluded.err, checked_ts=excluded.checked_ts`).run({
    mint: c.mint, launch_id: c.launch_id, post_name: c.post_name || "", name: c.name || info?.name || "", symbol: c.symbol || info?.symbol || "", created_ts: t0, ours: c.ours,
    peak_mc: peak ? peak.h * supply : null, peak_ts: peak?.t ?? null, peak_min: peak ? +((peak.t - t0) / 60).toFixed(1) : null, peak_close_mc: peakClose ? peakClose * supply : null,
    ath_mc: ath != null ? ath * supply : null, mc5: at(5), mc15: at(15), mc30: at(30), mc60: at(60), mc_now: priceNow != null ? priceNow * supply : null,
    holders: N(info?.holder_count), progress, status, liquidity: N(info?.liquidity), vol_1h: N(info?.price?.volume_1h), candles: k.length, err: err || null, checked_ts: now });
  if (err) { peakStat.errors++; peakStat.lastErr = `${c.mint.slice(0, 6)} ${err}`.slice(0, 160); } else peakStat.ok++;
}

/** Every copycat and every coin of ours made in the last 24 h. */
export async function runPeaks(db, done) {
  if (peakStat.running) return; peakStat.running = true; peakStat.runs++;
  try {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const coins = db.prepare(`SELECT c.mint, MIN(c.launch_id) launch_id, l.name post_name, c.name, c.symbol, c.created_ts, MAX(c.ours) ours FROM copies c LEFT JOIN launches l ON l.id=c.launch_id
      WHERE c.created_ts>=? GROUP BY c.mint
      UNION SELECT l.mint, l.id, l.name, l.name, l.ticker, l.created_ts, 1 FROM launches l WHERE l.mode='live' AND l.mint IS NOT NULL AND l.mint<>'' AND l.status NOT IN ('failed','skipped') AND l.created_ts>=? AND l.mint NOT IN (SELECT mint FROM copies)`).all(since, since);
    const seen = new Set(); peakStat.coins = 0;
    for (const c of coins) {
      if (seen.has(c.mint)) continue; seen.add(c.mint); peakStat.coins++;
      for (let i = 0; i < 3; i++) { try { await one(db, c); break; } catch (e) { peakStat.lastErr = e.message; await nap(6000); } }
    }
    peakStat.lastRun = new Date().toISOString();
  } catch (e) { peakStat.errors++; peakStat.lastErr = e.message.slice(0, 160); }
  finally { peakStat.running = false; try { done?.(); } catch {} }
}
