// signals.mjs — the seven families' entry decisions for one coin observation. Pure: no I/O, no clock.
// Called AFTER the observation has been added to the coin's Series. Every window excludes the current observation
// (windows are [x, t) on time; the current observation sits at t) unless stated otherwise.
// Returns { cands: [...entry candidates], notes: [...rejections / missing-reference records] }.
import * as S from "./spec.mjs";

export function newCoin(mint, createTs, series, supply = 1e9) { return { mint, createTs, series, supply, groups: {} }; }
const grp = (c, ag) => (c.groups[ag] ||= { ref: null, done: {}, logged: {} });
const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n === 0 ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/** age-group reference market cap (AGE-DOUBLE): the price prevailing at the group's start, only if that is known */
export function ageRef(coin, ag) {
  const b = coin.createTs + S.ageStartOf(ag), sr = coin.series;
  const p = sr.priceAt(b);
  if (!p) return { status: "MISSING", why: "no observation at or before the age-group start", boundary: b };
  if (!sr.covered(p.t, b)) return { status: "MISSING", why: "history between the last trade and the age-group start is not covered", boundary: b, lastT: p.t };
  return { status: "OK", mc: p.px * coin.supply, px: p.px, t: p.t, quietS: Math.round(b - p.t), src: p.src, boundary: b };
}

/** research features at a decision (recorded, never used as filters) */
export function features(coin, o, low, hi1h, p15) {
  const sr = coin.series, t = o.t, m = Math.floor(t / 60);
  const last60 = sr.barsIn(m - 60, m); let bigCandle = 0; for (const [, b] of last60) if (b.o > 0) bigCandle = Math.max(bigCandle, b.c / b.o - 1);
  const last15 = sr.barsIn(m - 15, m); let nb = 0, ns = 0; const seen = new Map(); for (const [, b] of last15) { nb += b.nb; ns += b.ns; for (const u of b.buyers) seen.set(u, (seen.get(u) || 0) + 1); }
  const hi4 = sr.highIn(t - 4 * 3600, t);
  return {
    age_s: Math.round(t - coin.createTs), mc: Math.round(o.mc), band: o.mc < 100e3 ? "40-100K" : o.mc < 250e3 ? "100-250K" : o.mc < 500e3 ? "250-500K" : "500K-1M",
    rise15: p15 ? +(o.px / p15.px).toFixed(4) : null, big_candle_60m: +bigCandle.toFixed(4),
    vol15_usd: Math.round(sr.volIn(t - 900, t)), buys15: nb, sells15: ns, buyers15: seen.size, repeat_buyers15: [...seen.values()].filter((n) => n > 1).length,
    liq_usd: o.liqUsd != null ? Math.round(o.liqUsd) : null, rt_impact: o.rtImpact != null ? +o.rtImpact.toFixed(4) : null,
    from_hi1h: hi1h ? +(o.px / hi1h.px - 1).toFixed(4) : null,
    drawdown4h: hi4 && low ? +(low.px / hi4.px - 1).toFixed(4) : null, recovery4h: low ? +(o.px / low.px).toFixed(4) : null,
  };
}

export function evaluate(coin, o) {
  const out = { cands: [], notes: [] }, sr = coin.series, t = o.t;
  const ag = S.ageGroupOf(t - coin.createTs); if (!ag) return out;
  const g = grp(coin, ag), inBand = o.mc >= S.BAND_LO_USD && o.mc <= S.BAND_HI_USD;
  const note = (family, reason, detail = {}, once = true) => { const k = family + "|" + reason; if (once && g.logged[k]) return; g.logged[k] = 1; out.notes.push({ family, ag, t, reason, detail }); };
  // the previous observation counts for a "fresh crossing" only if nothing between it and now is unknown
  const prevOk = sr.prevT !== null && sr.prevT < t && sr.covered(sr.prevT, t);
  const cross = (line) => prevOk && sr.prevPx < line && o.px >= line;
  const cand = (family, detail) => { g.done[family] = 1; out.cands.push({ family, ag, t, mc: o.mc, px: o.px, detail }); };

  // 1. AGE-DOUBLE — first fresh crossing of 2 × the market cap at the age-group start
  if (!g.done["AGE-DOUBLE"]) {
    if (!g.ref || g.ref.status !== "OK") { g.ref = ageRef(coin, ag); if (g.ref.status !== "OK") note("AGE-DOUBLE", "reference_status=MISSING", g.ref); } // re-tried while missing (a later back-fill may supply it); logged once
    if (g.ref.status === "OK") {
      const linePx = (S.AGE_DOUBLE_X * g.ref.mc) / coin.supply;
      if (cross(linePx)) { if (inBand) cand("AGE-DOUBLE", { ref_mc: Math.round(g.ref.mc), ref_t: g.ref.t, ref_quiet_s: g.ref.quietS, ref_src: g.ref.src }); else note("AGE-DOUBLE", "crossing outside entry band", { mc: Math.round(o.mc) }, false); }
    }
  }

  // 2. LOW4H (+ 4. SLOW-BUILD and 7. LOW4H-LIQ25K on LOW4H's first eligible candidate)
  let low = null;
  if (!g.done["LOW4H"]) {
    if (!sr.covered(t - S.LOW4H_WIN_S, t)) note("LOW4H", "insufficient 4 h history");
    else {
      low = sr.lowIn(t - S.LOW4H_WIN_S, t);
      if (low && cross(S.LOW4H_X * low.px)) {
        if (!inBand) note("LOW4H", "crossing outside entry band", { mc: Math.round(o.mc) }, false);
        else {
          const d = { low_px: low.px, low_t: low.t, low_mc: Math.round(low.px * coin.supply) };
          cand("LOW4H", d);
          // SLOW-BUILD: ≥ 30 min from the low, and no completed 1-min candle from the low's minute up to (not incl.) the trigger's minute gains > 20%
          const elapsed = t - low.t, bars = sr.barsIn(Math.floor(low.t / 60), Math.floor(t / 60));
          const worst = bars.reduce((w, [m, b]) => { const gn = b.o > 0 ? b.c / b.o - 1 : 0; return gn > w.g ? { g: gn, m } : w; }, { g: -Infinity, m: null });
          const sd = { ...d, elapsed_s: Math.round(elapsed), candles: bars.length, max_candle_gain: bars.length ? +worst.g.toFixed(4) : null };
          if (elapsed < S.SLOW_MIN_ELAPSED_S) note("SLOW-BUILD", "rejected: under 30 min from low", sd, false);
          else if (bars.length && worst.g > S.SLOW_MAX_CANDLE_GAIN + 1e-12) note("SLOW-BUILD", "rejected: a candle above +20%", { ...sd, at_minute: worst.m }, false);
          else cand("SLOW-BUILD", sd);
          g.done["SLOW-BUILD"] = 1;
          // LOW4H-LIQ25K: liquidity ≥ $25K and 0.2 SOL round-trip price impact ≤ 5% (fees excluded)
          if (o.liqUsd == null || o.rtImpact == null) note("LOW4H-LIQ25K", "rejected: liquidity/impact evidence missing", d, false);
          else if (o.liqUsd < S.LIQ_MIN_USD) note("LOW4H-LIQ25K", "rejected: liquidity under $25K", { ...d, liq_usd: Math.round(o.liqUsd) }, false);
          else if (o.rtImpact > S.LIQ_MAX_RT_IMPACT) note("LOW4H-LIQ25K", "rejected: round-trip impact over 5%", { ...d, rt_impact: o.rtImpact }, false);
          else cand("LOW4H-LIQ25K", { ...d, liq_usd: Math.round(o.liqUsd), rt_impact: o.rtImpact });
          g.done["LOW4H-LIQ25K"] = 1;
        }
      }
    }
  }

  // 3. CONT (+ 6. CONT-STALL shares its entry) — first eligible observation; not a crossing
  let hi1h = null, p15 = null;
  if (!g.done["CONT"]) {
    if (!sr.covered(t - S.CONT_HI_WIN_S, t)) note("CONT", "insufficient 1 h history");
    else {
      p15 = sr.priceAt(t - S.CONT_LOOKBACK_S); hi1h = sr.highIn(t - S.CONT_HI_WIN_S, t);
      if (p15 && hi1h && o.px >= S.CONT_RISE * p15.px && o.px >= S.CONT_NEAR_HI * hi1h.px && inBand) {
        const d = { px15: p15.px, hi1h: hi1h.px }; cand("CONT", d); cand("CONT-STALL", d);
      }
    }
  }

  // 5. HH-BREAK — strictly above the preceding 60-min high, and 15-min volume ≥ 2 × median of the 16 completed 15-min windows before it
  if (!g.done["HH-BREAK"]) {
    const mEnd = Math.floor((t - S.HH_VOL_WIN_S) / 60); // the minute containing t−900 is in neither the signal window's benchmark nor the history
    const histFrom = (mEnd - 15 * S.HH_BASE_WINDOWS) * 60;
    if (!sr.covered(histFrom, t)) note("HH-BREAK", "insufficient 4 h 15 min history");
    else {
      const hi = hi1h ?? sr.highIn(t - S.HH_HI_WIN_S, t);
      if (hi && o.px > hi.px && inBand) {
        const sums = []; for (let k = 1; k <= S.HH_BASE_WINDOWS; k++) { const a = mEnd - 15 * k; sums.push(sr.barsIn(a, a + 15).reduce((s, [, b]) => s + b.v, 0)); }
        const base = median(sums), v15 = sr.volIn(t - S.HH_VOL_WIN_S, t);
        const d = { hi1h: hi.px, vol15: Math.round(v15), base_median: Math.round(base), windows: sums.map(Math.round) };
        if (!(base > 0)) note("HH-BREAK", "zero volume baseline (not entered)", d, false);
        else if (v15 >= S.HH_VOL_X * base) cand("HH-BREAK", d);
      }
    }
  }

  if (out.cands.length) { low ??= sr.covered(t - S.LOW4H_WIN_S, t) ? sr.lowIn(t - S.LOW4H_WIN_S, t) : null; hi1h ??= sr.highIn(t - 3600, t); p15 ??= sr.priceAt(t - 900); const f = features(coin, o, low, hi1h, p15); for (const c of out.cands) c.features = f; }
  return out;
}
