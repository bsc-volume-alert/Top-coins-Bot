// signals.mjs — the seven families' entry decisions for one coin observation. Pure: no I/O, no clock.
// Called AFTER the observation has been added to the coin's Series. Every window excludes the current observation
// (windows are [x, t) on time; the current observation sits at t) unless stated otherwise.
// Returns { cands: [...entry candidates], notes: [...rejections / missing-reference records] }.
import * as S from "./spec.mjs";

const NONE = new Set();
export function newCoin(mint, createTs, series, supply = 1e9) { return { mint, createTs, series, supply, groups: {}, sw: null }; }
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
  // short-window trading at the decision, from decoded trades (live method). Sampled coins have prices only → null; their
  // 5-minute figures come from the provider snapshot recorded on the entry (entry.snap).
  const live = coin.mode !== "polled", w1 = live ? sr.winStats(t - 60, t) : null, w3 = live ? sr.winStats(t - 180, t) : null, w5 = live ? sr.winStats(t - 300, t) : null;
  const full60 = live && sr.histFrom != null && sr.histFrom <= t - 3600, vol60 = full60 ? sr.volIn(t - 3600, t) : null, prior = full60 ? (vol60 - w5.vol_usd) / 11 : null;
  return {
    w1, w3, w5, vol60_usd: vol60 != null ? Math.round(vol60) : null, vol_surge5: prior > 0 ? +(w5.vol_usd / prior).toFixed(2) : null, // last 5 min ÷ the average 5 min of the 55 min before
    age_s: Math.round(t - coin.createTs), mc: Math.round(o.mc), band: o.mc < 100e3 ? "40-100K" : o.mc < 250e3 ? "100-250K" : o.mc < 500e3 ? "250-500K" : "500K-1M",
    rise15: p15 ? +(o.px / p15.px).toFixed(4) : null, big_candle_60m: +bigCandle.toFixed(4),
    vol15_usd: Math.round(sr.volIn(t - 900, t)), buys15: nb, sells15: ns, buyers15: seen.size, repeat_buyers15: [...seen.values()].filter((n) => n > 1).length,
    liq_usd: o.liqUsd != null ? Math.round(o.liqUsd) : null, rt_impact: o.rtImpact != null ? +o.rtImpact.toFixed(4) : null,
    from_hi1h: hi1h ? +(o.px / hi1h.px - 1).toFixed(4) : null,
    drawdown4h: hi4 && low ? +(low.px / hi4.px - 1).toFixed(4) : null, recovery4h: low ? +(o.px / low.px).toFixed(4) : null,
  };
}

export function evaluate(coin, o, opts = {}) {
  const skip = opts.skip || NONE; // families the observation mode cannot support (recorded by the caller, never silently entered)
  const out = { cands: [], notes: [] }, sr = coin.series, t = o.t;
  const ag = S.ageGroupOf(t - coin.createTs); if (!ag) return out;
  const g = grp(coin, ag), inBand = o.mc >= S.BAND_LO_USD && o.mc <= S.BAND_HI_USD;
  const note = (family, reason, detail = {}, once = true) => { const k = family + "|" + reason; if (once && g.logged[k]) return; g.logged[k] = 1; out.notes.push({ family, ag, t, reason, detail }); };
  // the previous observation counts for a "fresh crossing" only if nothing between it and now is unknown
  const prevOk = sr.prevT !== null && sr.prevT < t && sr.covered(sr.prevT, t, true); // strict: never across an outage, even a repaired one
  const cross = (line) => prevOk && sr.prevPx < line && o.px >= line;
  const cand = (family, detail) => { g.done[family] = 1; out.cands.push({ family, ag, t, mc: o.mc, px: o.px, detail }); };
  const prevRec = sr.prevT !== null ? { t: sr.prevT, px: sr.prevPx, covered_to_now: prevOk } : null;

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
          // flag: the candle that contains the low may have OPENED before the low, so its full open→close gain is not all "climb after the low"
          const lowBar = sr.bars.get(Math.floor(low.t / 60));
          const sd = { ...d, elapsed_s: Math.round(elapsed), candles: bars.length, max_candle_gain: bars.length ? +worst.g.toFixed(4) : null, low_candle_opened_before_low: !!(lowBar && lowBar.o > low.px), worst_is_low_candle: worst.m === Math.floor(low.t / 60) };
          if (elapsed < S.SLOW_MIN_ELAPSED_S) note("SLOW-BUILD", "rejected: under 30 min from low", sd, false);
          else if (bars.length && worst.g > S.SLOW_MAX_CANDLE_GAIN + 1e-12) note("SLOW-BUILD", "rejected: a candle above +20%", { ...sd, at_minute: worst.m }, false);
          else cand("SLOW-BUILD", sd);
          g.done["SLOW-BUILD"] = 1;
          // LOW4H-LIQ25K: liquidity ≥ $25K and 0.2 SOL round-trip price impact ≤ 5% (fees excluded)
          // the two tests are recorded separately so we can see whether the impact test ever binds on its own
          const lq = { ...d, liq_usd: o.liqUsd == null ? null : Math.round(o.liqUsd), static_impact: o.rtImpact ?? null, liq_pass: o.liqUsd != null && o.liqUsd >= S.LIQ_MIN_USD, impact_pass: o.rtImpact != null && o.rtImpact <= S.LIQ_MAX_RT_IMPACT };
          if (o.liqUsd == null || o.rtImpact == null) note("LOW4H-LIQ25K", "rejected: liquidity/impact evidence missing", lq, false);
          else if (!lq.liq_pass) note("LOW4H-LIQ25K", lq.impact_pass ? "rejected: liquidity under $25K" : "rejected: liquidity under $25K and static impact over 5%", lq, false);
          else if (!lq.impact_pass) note("LOW4H-LIQ25K", "rejected: static impact over 5% (liquidity passed)", lq, false);
          else cand("LOW4H-LIQ25K", lq);
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

  // 5. HH-BREAK (amended in older-3) — price strictly above the preceding 60-min high, and volume of the last 15 COMPLETED minutes
  // ≥ 2 × the median of the sixteen 15-minute buckets before them. B = the last completed minute boundary (floor(t / 60 s)).
  //   signal volume : [B − 15 min, B)            baseline : 16 adjacent buckets covering [B − 255 min, B − 15 min)
  // Half-open intervals; no overlap and no missing minute. Needs a volume source (not available from price polling alone).
  if (!g.done["HH-BREAK"] && !skip.has("HH-BREAK")) {
    const mB = Math.floor(t / 60), histFrom = (mB - 15 - 15 * S.HH_BASE_WINDOWS) * 60;
    if (!sr.covered(histFrom, t)) note("HH-BREAK", "insufficient 4 h 15 min history");
    else {
      const hi = hi1h ?? sr.highIn(t - S.HH_HI_WIN_S, t);
      if (hi && o.px > hi.px && inBand) {
        const vsum = (m0) => sr.barsIn(m0, m0 + 15).reduce((x, [, b]) => x + b.v, 0);
        const sums = []; for (let k = 1; k <= S.HH_BASE_WINDOWS; k++) sums.push(vsum(mB - 15 - 15 * k));
        const base = median(sums), v15 = vsum(mB - 15);
        const d = { hi1h: hi.px, B: mB * 60, signal_window: [(mB - 15) * 60, mB * 60], baseline_window: [(mB - 255) * 60, (mB - 15) * 60], vol15: Math.round(v15), base_median: Math.round(base), windows: sums.map(Math.round) };
        if (!(base > 0)) note("HH-BREAK", "zero volume baseline (not entered)", d, false);
        else if (v15 >= S.HH_VOL_X * base) cand("HH-BREAK", d);
      }
    }
  }

  // 8–13. FAST / FAST150 — fresh crossing of X × the lowest pool spot price in the preceding 60 / 180 / 300 s.
  // Window = exact observations on the receive clock, [t − W, t), including the price standing at the window's start.
  let fastSeed = false;
  for (const [family, W, X] of S.FAST) {
    if (g.done[family] || skip.has(family)) continue;
    if (!sr.covered(t - W, t, true)) { note(family, "window not covered"); continue; }
    const lo = sr.lowIn(t - W, t); if (!lo) continue;
    if (!cross(X * lo.px)) continue;
    if (!inBand) { note(family, "crossing outside entry band", { mc: Math.round(o.mc) }, false); continue; }
    const obs = sr.raw.filter((r) => r[0] >= t - W && r[0] < t);
    cand(family, { window_s: W, x: X, low_px: lo.px, low_t: lo.t, threshold_px: X * lo.px, low_support: obs.filter((r) => r[1] <= lo.px * 1.02).length, window_obs: obs.length, low_carried_in: lo.t <= t - W });
    if (X === 2) fastSeed = true;
  }
  // 14. SECOND-WAVE (amended in older-3) — seeded by the first 2× FAST trigger. ONE active setup per mint, kept alive until its
  // own 60-minute expiry even across an age boundary. The seed uses up the SEED age group's attempt; the trade is classified by
  // the age group AT ENTRY, whose slot must be free and is then used. Seed age is recorded separately.
  const w = coin.sw;
  if (!w) {
    if (fastSeed && !g.done["SECOND-WAVE"]) {
      g.done["SECOND-WAVE"] = 1; note("SECOND-WAVE", "seeded", { seed_t: t, seed_ag: ag }, false);
      coin.sw = { seedT: t, seedPx: o.px, seedAg: ag, seedAgeS: Math.round(t - coin.createTs), windows: out.cands.filter((c) => /^FAST-/.test(c.family)).map((c) => c.family), H: o.px, HT: t, frozen: null, pullT: null };
    }
  } else {
    const end = (reason, detail = {}) => { coin.sw = null; note("SECOND-WAVE", reason, { seed_t: w.seedT, seed_ag: w.seedAg, windows: w.windows, ...detail }, false); };
    if (t > w.seedT + S.SW_EXPIRE_S) end(w.frozen ? "expired: no reclaim within 60 min" : "expired: no 25% pullback within 60 min");
    else if (!sr.covered(w.seedT, t, true)) end("abandoned: coverage broke during the setup");
    else if (w.frozen === null) { if (o.px > w.H) { w.H = o.px; w.HT = t; } else if (o.px <= S.SW_PULLBACK * w.H) { w.frozen = w.H; w.pullT = t; w.pullPx = o.px; } }
    else if (o.px > w.frozen) {
      const d = { seed_t: w.seedT, seed_px: w.seedPx, seed_ag: w.seedAg, seed_age_s: w.seedAgeS, entry_ag: ag, seed_windows: w.windows, frozen_high: w.frozen, high_t: w.HT, pullback_t: w.pullT, pullback_px: w.pullPx, since_seed_s: Math.round(t - w.seedT) };
      if (ag !== w.seedAg && g.done["SECOND-WAVE"]) end("reclaim, but the entry-age group's SECOND-WAVE slot is already used", d);
      else if (!inBand) { g.done["SECOND-WAVE"] = 1; end("reclaim outside entry band (attempt used)", { ...d, mc: Math.round(o.mc) }); }
      else { coin.sw = null; cand("SECOND-WAVE", d); }
    }
  }

  if (out.cands.length) {
    // evidence stored ONCE per entry: the previous observation that established the fresh crossing, and — for the short-window
    // families — every observation of the longest window involved
    const W = Math.max(0, ...out.cands.map((c) => c.detail.window_s || (c.family === "SECOND-WAVE" ? t - c.detail.seed_t : 0)));
    out.evidence = { prev: prevRec, window_s: W || null, obs: W ? sr.raw.filter((r) => r[0] >= t - W && r[0] <= t).slice(-S.EVIDENCE_OBS_CAP).map((r) => [+r[0].toFixed(3), r[1], Math.round(r[2]), r[3]]) : null };
  }
  if (out.cands.length) { low ??= sr.covered(t - S.LOW4H_WIN_S, t) ? sr.lowIn(t - S.LOW4H_WIN_S, t) : null; hi1h ??= sr.highIn(t - 3600, t); p15 ??= sr.priceAt(t - 900); const f = features(coin, o, low, hi1h, p15); for (const c of out.cands) c.features = f; }
  return out;
}
