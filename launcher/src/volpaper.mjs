// launcher 0.4.0 (owner, 31 Oct 2026 18:41 UK: "paper trade any coin with a 5-minute volume of 300k, and one with 500k … under 1 million … the age can be anything"):
// two PAPER strategies on every Solana coin GMGN lists. Every 30 s it reads GMGN's top 100 coins by 5-minute volume; the first time a coin's
// 5-min volume is ≥ $300K (V300) or ≥ $500K (V500) and under $1M, it records a paper buy at GMGN's price. Nothing is bought or sold.
// 2 h 5 min after entry it scores the trade from GMGN's 1-minute candles: price at 5/15/30/60/120 min, peak, and the exits we tested before
// (2x or −50%, 1.5x or −30%, 40% trail from the peak), after the real-cost models in LESSONS.md (bonding curve vs PumpSwap).
// Market cap, age, holders and the GMGN row are kept with each entry so other cuts (e.g. market cap under $1M) can be read later.
import { gget, N } from "./gmgn.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
export const TIERS = [{ k: "V300", min: n("LAUNCH_V300", 300000) }, { k: "V500", min: n("LAUNCH_V500", 500000) }];
const MAX_VOL = n("LAUNCH_VOL_MAX", 1000000), SCORE_AFTER = 125 * 60;
export const volStat = { polls: 0, rows: 0, entries: 0, scored: 0, errors: 0, lastErr: "", lastPoll: null, maxVolSeen: null };
const now = () => Math.floor(Date.now() / 1000);
// LESSONS.md cost models: bonding curve x×0.97−0.02−1−0.02 (stops −0.01 more); PumpSwap x/1.02×0.967−1−0.006−0.02 (stops x≤0.62 −0.05 more)
const realX = (x, curve) => (x == null ? null : curve ? x * 0.97 - 0.02 - 1 - 0.02 - (x <= 0.62 ? 0.01 : 0) : x / 1.02 * 0.967 - 1 - 0.006 - 0.02 - (x <= 0.62 ? 0.05 : 0));

export function initVol(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS vol_paper (id INTEGER PRIMARY KEY AUTOINCREMENT, strat TEXT, mint TEXT, name TEXT, symbol TEXT, entry_ts INTEGER, entry_price REAL, entry_mc REAL, vol5 REAL,
    created_ts INTEGER, age_min REAL, holders INTEGER, exchange TEXT, launchpad TEXT, curve INTEGER, row TEXT, done INTEGER DEFAULT 0, err TEXT,
    x5 REAL, x15 REAL, x30 REAL, x60 REAL, x120 REAL, peak120 REAL, peak_min REAL, low_before_peak REAL, x_tp2sl50 REAL, x_tp15sl30 REAL, x_trail40 REAL,
    r_tp2sl50 REAL, r_tp15sl30 REAL, r_trail40 REAL, r_hold60 REAL, r_hold120 REAL, UNIQUE (strat, mint))`);
  try { db.exec("ALTER TABLE vol_paper ADD COLUMN x_half2 REAL"); } catch {} try { db.exec("ALTER TABLE vol_paper ADD COLUMN r_half2 REAL"); } catch {} // 0.5.0
}

export async function volPoll(db) {
  try {
    const d = await gget("/v1/market/rank", { chain: "sol", interval: "5m", order_by: "volume", limit: "100" });
    const rows = Array.isArray(d?.rank) ? d.rank : Array.isArray(d) ? d : []; volStat.polls++; volStat.rows = rows.length; volStat.lastPoll = new Date().toISOString();
    const t = now(), ins = db.prepare(`INSERT OR IGNORE INTO vol_paper (strat, mint, name, symbol, entry_ts, entry_price, entry_mc, vol5, created_ts, age_min, holders, exchange, launchpad, curve, row)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const r of rows) {
      const mint = r.address, v5 = N(r.volume), mc = N(r.market_cap), px = N(r.price), created = N(r.creation_timestamp ?? r.open_timestamp);
      if (v5 != null) volStat.maxVolSeen = Math.max(volStat.maxVolSeen || 0, v5);
      if (!mint || !(px > 0) || v5 == null || v5 >= MAX_VOL) continue;
      const ex = r.exchange ?? null, curve = ex ? (/^pump(fun|_fun)?$|bonding|curve/i.test(ex) ? 1 : 0) : null;
      for (const tier of TIERS) if (v5 >= tier.min) {
        const ch = ins.run(tier.k, mint, r.name ?? null, r.symbol ?? null, t, px, mc, v5, created, created ? +((t - created) / 60).toFixed(1) : null, N(r.holder_count), ex, r.launchpad_platform ?? r.launchpad ?? null, curve, JSON.stringify(r).slice(0, 1500)).changes;
        if (ch) volStat.entries++;
      }
    }
  } catch (e) { volStat.errors++; volStat.lastErr = "poll: " + e.message.slice(0, 160); }
}

async function candles(mint, from, to) {
  const d = await gget("/v1/market/token_kline", { chain: "sol", address: mint, resolution: "1m", from: String(from * 1000), to: String(to * 1000) });
  return (d?.list || (Array.isArray(d) ? d : [])).map((c) => ({ t: Math.floor(Number(c.time) / 1000), h: N(c.high), l: N(c.low), c: N(c.close) })).filter((c) => c.h > 0);
}
let scoring = false;
export async function volScore(db) {
  if (scoring) return; scoring = true;
  try {
    for (const p of db.prepare("SELECT * FROM vol_paper WHERE done=0 AND entry_ts<=? ORDER BY entry_ts LIMIT 20").all(now() - SCORE_AFTER)) {
      try {
        const e = p.entry_ts, path = [...await candles(p.mint, e - 60, e + 60 * 60), ...await candles(p.mint, e + 60 * 60, e + 121 * 60)].filter((c) => c.t >= e - 60).sort((a, b) => a.t - b.t);
        const uniq = path.filter((c, i) => i === 0 || c.t !== path[i - 1].t);
        if (!uniq.length) { db.prepare("UPDATE vol_paper SET done=1, err=? WHERE id=?").run("no candles", p.id); continue; }
        const X = (v) => v / p.entry_price, at = (m) => { const c = uniq.filter((x) => x.t <= e + m * 60).pop(); return c ? +X(c.c).toFixed(4) : null; };
        const after = uniq.filter((c) => c.t >= e - 60);
        let peak = 0, peakT = e; for (const c of after) if (X(c.h) > peak) { peak = X(c.h); peakT = c.t; }
        const lowBefore = Math.min(...after.filter((c) => c.t <= peakT).map((c) => X(c.l)));
        const tpsl = (tp, sl) => { for (const c of after.slice(1)) { if (X(c.l) <= sl) return sl; if (X(c.h) >= tp) return tp; } return X(after[after.length - 1].c); }; // the stop is checked first in a candle: the worse case
        let hi = 1, trail = null; for (const c of after.slice(1)) { if (X(c.l) <= hi * 0.6) { trail = hi * 0.6; break; } hi = Math.max(hi, X(c.h)); } if (trail == null) trail = X(after[after.length - 1].c);
        // 0.5.0: half at 2x, the rest on a 40% trail from the peak; −30% stop before 2x
        let half = null; { let hit = false, hi2 = 2; for (const c of after.slice(1)) { if (!hit) { if (X(c.l) <= 0.7) { half = 0.7; break; } if (X(c.h) >= 2) { hit = true; hi2 = Math.max(2, X(c.h)); } } else { if (X(c.l) <= hi2 * 0.6) { half = 1 + 0.5 * hi2 * 0.6; break; } hi2 = Math.max(hi2, X(c.h)); } }
          if (half == null) half = hit ? 1 + 0.5 * X(after[after.length - 1].c) : X(after[after.length - 1].c); }
        const cv = p.curve === 1, t2 = tpsl(2, 0.5), t15 = tpsl(1.5, 0.7), h60 = at(60), h120 = at(120);
        db.prepare(`UPDATE vol_paper SET done=1, x5=?, x15=?, x30=?, x60=?, x120=?, peak120=?, peak_min=?, low_before_peak=?, x_tp2sl50=?, x_tp15sl30=?, x_trail40=?, r_tp2sl50=?, r_tp15sl30=?, r_trail40=?, r_hold60=?, r_hold120=?, x_half2=?, r_half2=? WHERE id=?`)
          .run(at(5), at(15), at(30), h60, h120, +peak.toFixed(4), +((peakT - e) / 60).toFixed(1), +lowBefore.toFixed(4), t2, t15, +trail.toFixed(4), realX(t2, cv), realX(t15, cv), realX(trail, cv), realX(h60, cv), realX(h120, cv), +half.toFixed(4), realX(half, cv), p.id);
        volStat.scored++;
      } catch (er) { if (/rate limited/i.test(er.message)) throw er; db.prepare("UPDATE vol_paper SET done=1, err=? WHERE id=?").run(er.message.slice(0, 120), p.id); }
    }
  } catch (e) { volStat.errors++; volStat.lastErr = "score: " + e.message.slice(0, 160); }
  finally { scoring = false; }
}
