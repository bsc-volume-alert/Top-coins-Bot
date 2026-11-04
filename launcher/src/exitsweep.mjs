// launcher 0.8.1 (owner, 4 Nov 2026 10:48 UK: "if we bought every single one of those 214… could we make profit? do they rug quickly?
// enter at about 25k to 50k and try to get 1.5, 2, even 3x"): the EXIT SWEEP over the census winners.
// For every census coin: GMGN 1-minute candles from birth to +120 min (2 calls a coin). Entries: the first minute the market cap closes at or above
// $25K, $50K, and the minute-1 / minute-2 close. From each entry: the multiple at +5/10/15/20/30/60 min, the peak and when, the low before it,
// and the exits — 1.5x/2x/3x take-profit with a −35% stop, half at 2x + 40% trail, 40% trail, hard out at 10/15/20 min with −35% stop — in paper
// multiples and after the real cost model (PumpSwap after graduation, curve before). One JSON line a coin → exit_sweep.jsonl on the data branch.
// Winners only, so it is the CEILING (what buying every winner would have made), not a forecast; the FD book supplies the duds.
import { writeFileSync } from "node:fs";
import { gget, N } from "./gmgn.mjs";
import { CFG } from "./config.mjs";

export const sweepStat = { coins: 0, done: 0, errors: 0, lastErr: "", running: false, finished: false };
const ENTRIES = [["mc25k", 25000], ["mc50k", 50000]];
const realX = (x, curve) => (x == null ? null : curve ? x * 0.97 - 0.02 - 1 - 0.02 - (x <= 0.62 ? 0.01 : 0) : x / 1.02 * 0.967 - 1 - 0.006 - 0.02 - (x <= 0.62 ? 0.05 : 0));

async function candles(mint, from, to) {
  const d = await gget("/v1/market/token_kline", { chain: "sol", address: mint, resolution: "1m", from: String(from * 1000), to: String(to * 1000) });
  return (d?.list || (Array.isArray(d) ? d : [])).map((c) => ({ t: Math.floor(Number(c.time) / 1000), o: N(c.open), h: N(c.high), l: N(c.low), c: N(c.close), v: N(c.volume) })).filter((c) => c.h > 0);
}

/** everything from an entry at candle index i0 (entry price = that candle's close) */
export function fromEntry(ks, i0, supply, gradT) {
  const e = ks[i0], P = e.c, X = (v) => v / P, t0 = e.t, after = ks.slice(i0 + 1);
  const at = (m) => { const c = ks.filter((x) => x.t <= t0 + m * 60).pop(); return c ? +X(c.c).toFixed(3) : null; };
  let peak = 1, peakT = t0; for (const c of after) if (X(c.h) > peak) { peak = X(c.h); peakT = c.t; }
  const low = Math.min(1, ...after.filter((c) => c.t <= peakT).map((c) => X(c.l)));
  const tpsl = (tp, sl, maxMin = 120) => { for (const c of after) { if (c.t > t0 + maxMin * 60) break; if (X(c.l) <= sl) return sl; if (X(c.h) >= tp) return tp; } const c = ks.filter((x) => x.t <= t0 + maxMin * 60).pop(); return c ? X(c.c) : 1; };
  const trail = (pct, sl = 0.65) => { let hi = 1; for (const c of after) { if (X(c.l) <= Math.max(sl, hi * (1 - pct))) return Math.max(sl, hi * (1 - pct)); hi = Math.max(hi, X(c.h)); } return X(after[after.length - 1]?.c ?? P); };
  const half2 = () => { let hit = false, hi = 2; for (const c of after) { if (!hit) { if (X(c.l) <= 0.65) return 0.65; if (X(c.h) >= 2) { hit = true; hi = Math.max(2, X(c.h)); } } else { if (X(c.l) <= hi * 0.6) return 1 + 0.5 * hi * 0.6; hi = Math.max(hi, X(c.h)); } } return hit ? 1 + 0.5 * X(after[after.length - 1].c) : X(after[after.length - 1]?.c ?? P); };
  const out = (M) => { for (const c of after) { if (c.t > t0 + M * 60) break; if (X(c.l) <= 0.65) return 0.65; } return at(M) ?? 1; };
  const curve = gradT ? t0 < gradT : true, mcAt = +(P * supply).toFixed(0);
  // 0.8.7 (owner, 18:21 UK: "look at the charts of the successful coins… where the top is, where the bottom is, what the correct trailing stop would be"):
  // the deepest pullback from the running high BEFORE the coin doubled and AFTER it (until the peak) — the trail width a runner needs to survive
  const pull = (() => { let h = 1, pre = 0, post = 0, run = false; for (const c of after) { if (c.t > peakT) break; const d = 1 - X(c.l) / h; if (run) post = Math.max(post, d); else pre = Math.max(pre, d); h = Math.max(h, X(c.h)); if (!run && X(c.h) >= 2) run = true; } return { pre: +pre.toFixed(3), post: +post.toFixed(3) }; })();
  const tw = (() => { let h = 1, run = false; for (const c of after) { if (!run) { if (X(c.l) <= 0.65) return 0.65; if (X(c.h) >= 2) { run = true; h = X(c.h); } } else { if (X(c.l) <= h * 0.45) return h * 0.45; h = Math.max(h, X(c.h)); } } return X(after[after.length - 1]?.c ?? P); })();
  const x = { tp15: tpsl(1.5, 0.65), tp2: tpsl(2, 0.65), tp3: tpsl(3, 0.65), half2: half2(), trail20: trail(0.2), trail30: trail(0.3), trail40: trail(0.4), trail50: trail(0.5), trail60: trail(0.6), trail70: trail(0.7), tw, out10: out(10), out15: out(15), out20: out(20), out30: out(30) };
  const r = {}; for (const k in x) r[k] = +realX(x[k], curve).toFixed(3);
  return { entry_min: +((t0 - ks[0].t) / 60).toFixed(1), entry_mc: mcAt, curve, x5: at(5), x10: at(10), x15: at(15), x20: at(20), x30: at(30), x60: at(60), x120: at(120), peak: +peak.toFixed(3), peak_min: +((peakT - t0) / 60).toFixed(1), low_before_peak: +low.toFixed(3),
    hit15: peak >= 1.5, hit2: peak >= 2, hit3: peak >= 3, pullback_before_2x: pull.pre, pullback_after_2x: pull.post, stop35_before_15x: (() => { for (const c of after) { if (X(c.h) >= 1.5) return false; if (X(c.l) <= 0.65) return true; } return false; })(),
    x: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, +v.toFixed(3)])), r };
}

export async function runSweep(db, done) {
  if (sweepStat.running || sweepStat.finished) return; sweepStat.running = true;
  try {
    const coins = db.prepare("SELECT s.mint, s.data, p.created_ts, p.peak_mc FROM study_coins s LEFT JOIN copy_peaks p ON p.mint=s.mint WHERE s.role='census' AND s.err IS NULL ORDER BY p.created_ts").all();
    sweepStat.coins = coins.length; const out = [];
    for (const c of coins) {
      try {
        let d = {}; try { d = JSON.parse(c.data); } catch {}
        const t0 = c.created_ts || d.t0; if (!t0) { sweepStat.errors++; continue; }
        const ks = [...await candles(c.mint, t0 - 60, t0 + 60 * 60), ...await candles(c.mint, t0 + 60 * 60, t0 + 121 * 60)].sort((a, b) => a.t - b.t).filter((k, i, a) => i === 0 || k.t !== a[i - 1].t);
        if (!ks.length) { out.push({ mint: c.mint, name: d.name, err: "no candles" }); sweepStat.errors++; continue; }
        const supply = 1e9, gradT = d.complete_s ? t0 + d.complete_s : null;
        const row = { mint: c.mint, name: d.name, symbol: d.symbol, created_ts: t0, peak_mc_usd: c.peak_mc || d.peak_mc_usd, graduated_s: d.complete_s ?? null, bundle_pct: d.tracker?.bundle_pct ?? null, net1m: d.w1m ? +(d.w1m.bsol - d.w1m.ssol).toFixed(1) : null, big15m: d.whale_buys_2sol_15m ?? null,
          mc_first_candle: +(ks[0].c * supply).toFixed(0), candles: ks.length, entries: {} };
        for (const [k, lvl] of ENTRIES) { const i0 = ks.findIndex((x) => x.c * supply >= lvl && x.t <= t0 + 30 * 60); row.entries[k] = i0 >= 0 && i0 < ks.length - 1 ? fromEntry(ks, i0, supply, gradT) : null; }
        for (const [k, m] of [["min1", 1], ["min2", 2], ["min3", 3], ["min5", 5]]) { const i0 = ks.findIndex((x) => x.t >= t0 + m * 60); row.entries[k] = i0 >= 0 && i0 < ks.length - 1 ? fromEntry(ks, i0, supply, gradT) : null; }
        out.push(row); sweepStat.done++;
      } catch (e) { sweepStat.errors++; sweepStat.lastErr = `${c.mint.slice(0, 6)} ${e.message}`.slice(0, 140); out.push({ mint: c.mint, err: e.message.slice(0, 100) }); if (/rate limited/i.test(e.message)) await new Promise((r) => setTimeout(r, 6000)); }
      if (out.length % 20 === 0) try { writeFileSync(`${CFG.OUT_DIR}/exit_sweep.jsonl`, out.map((r) => JSON.stringify(r)).join("\n") + "\n"); done?.(); } catch {}
    }
    writeFileSync(`${CFG.OUT_DIR}/exit_sweep.jsonl`, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
    sweepStat.finished = true;
  } catch (e) { sweepStat.errors++; sweepStat.lastErr = e.message.slice(0, 160); }
  finally { sweepStat.running = false; try { done?.(); } catch {} }
}
