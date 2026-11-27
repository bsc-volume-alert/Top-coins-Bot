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
  // A window is reported only when EXACT observations cover all of it (no back-fill, no outage): otherwise it is empty, never a partial count.
  const live = coin.mode !== "polled", win = (s) => (live && sr.obsCovered(t - s, t) ? sr.winStats(t - s, t) : null), w1 = win(60), w3 = win(180), w5 = win(300);
  const full60 = live && sr.obsCovered(t - 3600, t), vol60 = full60 ? sr.volIn(t - 3600, t) : null, prior = full60 && w5 ? (vol60 - w5.vol_usd) / 11 : null;
  return {
    w1, w3, w5, vol60_usd: vol60 != null ? Math.round(vol60) : null, vol_surge5: prior > 0 ? +(w5.vol_usd / prior).toFixed(2) : null, // last 5 min ÷ the average 5 min of the 55 min before
    age_s: coin.createTs ? Math.round(t - coin.createTs) : null /* a HIT-book buy can come before the creation time is known */, mc: Math.round(o.mc), band: o.mc < 100e3 ? "40-100K" : o.mc < 250e3 ? "100-250K" : o.mc < 500e3 ? "250-500K" : "500K-1M",
    rise15: p15 ? +(o.px / p15.px).toFixed(4) : null, big_candle_60m: +bigCandle.toFixed(4),
    vol15_usd: Math.round(sr.volIn(t - 900, t)), buys15: nb, sells15: ns, buyers15: seen.size, repeat_buyers15: [...seen.values()].filter((n) => n > 1).length,
    liq_usd: o.liqUsd != null ? Math.round(o.liqUsd) : null, rt_impact: o.rtImpact != null ? +o.rtImpact.toFixed(4) : null,
    from_hi1h: hi1h ? +(o.px / hi1h.px - 1).toFixed(4) : null,
    drawdown4h: hi4 && low ? +(low.px / hi4.px - 1).toFixed(4) : null, recovery4h: low ? +(o.px / low.px).toFixed(4) : null,
  };
}

/** HIT books (spec HIT): the bookkeeping, on EVERY observation of a coin whose migration this process watched — whether or not
 *  a buy could be made at that moment (a coin whose transfer fee is still unread is followed all the same, so that a crossing
 *  seen then is never mistaken later for "first observed over the line"). Pure. `migT` = the pool-creation second.
 *  coin.hit = { firstT, late, lines: { [line]: { under, over, overMc, lost, t, mc, prevMc, since, unbroken } } } */
export function hitTrack(coin, o, migT) {
  const t = o.t, since = t - migT, sr = coin.series, H = (coin.hit ||= { firstT: t, late: since > S.HIT_START_S, lines: {} });
  for (const line of S.HIT_LINES) { const h = (H.lines[line] ||= { under: false, over: false, lost: H.late ? "not watched from its migration" : null, t: null });
    if (h.t !== null || h.over || h.lost) continue;
    if (since > S.HIT_WINDOW_S) { h.lost = "window over"; continue; }
    if (o.mc < line) { h.under = true; continue; }
    if (!h.under) { h.over = true; h.overMc = o.mc; continue; }
    const prevOk = sr.prevT !== null && sr.prevT < t && sr.covered(sr.prevT, t, true), prevMc = sr.prevPx * coin.supply;
    if (!prevOk || !(prevMc < line)) { h.lost = "reached the line during a stretch that was not observed"; continue; }
    // 27 Nov 14:05 UK: in their first hour live the books bought nothing in 34 migrations. A hit used to be refused unless EVERYTHING
    // since the coin's first observation had been observed; a fresh busy pool almost always has a short break on record (the hour
    // counted 609 of them), so nearly every hit was refused. The crossing itself must still be observed from the trade before it
    // (prevOk, strict). Whether the whole stretch since the first observation was unbroken is now RECORDED on the buy instead.
    h.t = t; h.mc = o.mc; h.prevMc = prevMc; h.since = since; h.unbroken = sr.covered(H.firstT, t, true); }
  return H;
}

export function evaluate(coin, o, opts = {}) {
  const skip = opts.skip || NONE; // families the observation mode cannot support (recorded by the caller, never silently entered)
  const out = { cands: [], notes: [] }, sr = coin.series, t = o.t;
  const ag = opts.hit ? "A0" : S.ageGroupAny(t - coin.createTs); if (!ag) return out; // the HIT pass runs on the migration clock: no creation time needed
  const young = ag === "A0"; // migration to 8 hours old: only the any-age books are evaluated
  const g = grp(coin, ag), inBand = o.mc >= S.BAND_LO_USD && o.mc <= S.BAND_HI_USD;
  const note = (family, reason, detail = {}, once = true) => { const k = family + "|" + reason; if (once && g.logged[k]) return; g.logged[k] = 1; out.notes.push({ family, ag, t, reason, detail }); };
  // the previous observation counts for a "fresh crossing" only if nothing between it and now is unknown
  const prevOk = sr.prevT !== null && sr.prevT < t && sr.covered(sr.prevT, t, true); // strict: never across an outage, even a repaired one
  const cross = (line) => prevOk && sr.prevPx < line && o.px >= line;
  // `from` = the start of the longest stretch this decision relied on. If a tolerated warm-restart gap lies inside it, the seconds
  // that were not observed are recorded on the decision (restart_gap_s) — exact windows pass no `from`: they can never span one.
  // …and "the stretch it relied on" starts at the observation that SUPPLIED the price standing at the window's start, not at the
  // window's nominal start: a quiet coin's reference can date from before a restart while its window begins after it (eighth review, C3)
  const srcT = (x) => { const p = sr.priceAt(x); return p ? Math.min(x, p.src === "obs" || p.src === "anchor" || p.src === "last" ? p.t : p.t - 60) : x; };
  // BUYING AGAIN (spec REBUY): g.done[family] still means "this book has had its first attempt in this age group", exactly as in
  // older-8. opts.again(family) says whether the book may buy this coin AGAIN now (it holds no position on at least one row).
  // With opts.again absent every decision below is the older-8 decision. A candidate from a second or later attempt is marked `again`.
  const again = opts.again || (() => false), can = (f) => !g.done[f] || again(f);
  const cand = (family, detail, from = null, re = null) => { const a = re ?? !!g.done[family]; g.done[family] = 1; const w = from != null ? sr.warmIn(from, t) : 0; out.cands.push({ family, ag, t, mc: o.mc, px: o.px, detail: w ? { ...detail, restart_gap_s: w } : detail, ...(a ? { again: true } : {}) }); };
  const prevRec = sr.prevT !== null ? { t: sr.prevT, px: sr.prevPx, covered_to_now: prevOk } : null;

  // HIT books — their own pass (opts.hit = { migT }), after hitTrack() has seen this observation. Nothing else is judged on it.
  if (opts.hit) { const H = coin.hit; if (!H) return out;
    for (const [family, line, wait] of S.HIT) { if (skip.has(family)) continue; const h = H.lines[line]; if (!h) continue;
      if (h.t === null) { if (wait === 0 && h.over) note(family, "at or over the line when first observed after its migration: it never hit the line in front of us (not bought)", { line_usd: line, mc: Math.round(h.overMc) });
        else if (wait === 0 && h.lost && h.lost.startsWith("reached")) note(family, h.lost + " (not bought)", { line_usd: line });
        continue; }
      const base = { line_usd: line, wait_s: wait, hit_t: +h.t.toFixed(3), hit_mc: Math.round(h.mc), prev_mc: Math.round(h.prevMc), since_mig_s: Math.round(h.since), unbroken_since_first: !!h.unbroken, vol_since_mig_usd: (() => { const v = sr.volSince(opts.hit.migT); return v == null ? null : Math.round(v); })() };
      if (wait === 0) { if (h.t === t && can(family)) cand(family, base); continue; }
      if (h["w" + wait] || t < h.t + wait) continue; // judged once, at the first observation at or after the end of the wait
      const d = { ...base, late_s: +(t - h.t - wait).toFixed(1), mc_at_wait: Math.round(o.mc) };
      if (o.mc >= line) { h["w" + wait] = "bought"; if (can(family)) cand(family, d); } else { h["w" + wait] = "under"; note(family, "fell under the line by the end of the wait (not bought)", d); } }
    if (out.cands.length) { out.evidence = { prev: prevRec, window_s: null, obs: null }; const f = features(coin, o, null, sr.priced(t - 3600, t) ? sr.highIn(t - 3600, t) : null, sr.priceAt(t - 900)); for (const c of out.cands) c.features = f; }
    return out; }

  // 0. ANY-AGE BOOKS (older-8) — evaluated from migration on. See spec VOL / RUG.
  // 0a. VOL300K / VOL500K (± price up): rolling 5-minute USD volume from exact observations. The window must be fully observed
  //     (a feed outage or a loss of this coin's data inside it would understate the volume, so nothing is decided over one).
  { const todo = S.VOL.filter(([f]) => can(f) && !skip.has(f));
    if (todo.length && o.mc >= S.BAND_LO_USD && o.mc <= S.VOL_BAND_HI_USD) {
      if (!sr.obsCovered(t - S.VOL_WIN_S, t)) note(todo[0][0], "window not covered");
      else { const v5 = sr.volSince(t - S.VOL_WIN_S);
        if (v5 === null) note(todo[0][0], "5-minute boundary inside a merged second: volume not known, not decided");
        else if (v5 >= Math.min(...todo.map((x) => x[1]))) { const p5 = sr.priceAt(t - S.VOL_WIN_S, true);
          for (const [family, X, up] of todo) { if (v5 < X) continue; if (up && !(p5 && o.px > p5.px)) continue;
            cand(family, { vol5_usd: Math.round(v5), threshold_usd: X, vol_window_s: S.VOL_WIN_S, px_5m_ago: p5 ? p5.px : null, change_5m: p5 ? +(o.px / p5.px - 1).toFixed(4) : null }); } } } } }
  // 0b. RUG450 / RUG950 (knife, bounce). The peak is the highest market cap OBSERVED WITHOUT A BREAK up to now: the state lives
  //     in memory only and is dropped the moment observation between the peak and now is not continuous (a feed outage, a loss
  //     of this coin's data, a quarantine, a change of observation method, a restart — except a WARM restart of at most
  //     WARM_MAX_GAP_S, where this exact state is read back and the unobserved seconds are recorded on the decision). After a break the true peak and the true
  //     low are unknown, so a fall or a bounce measured against the old values could be late or false (seventh review, 1 and 2):
  //     the coin starts again and is bought only if a new peak AND its collapse are both watched from start to finish.
  //     Nothing is persisted. An observation mode that cannot support these books (price polling) builds no state at all.
  if (S.RUG.some(([f]) => !skip.has(f))) {
    const rg = (coin.rug ??= { pk: null, arm: null });
    if (rg.pk && !sr.steady(rg.pk.t, t)) { /* steady = unbroken, or broken only by a tolerated warm restart */ if (rg.arm) note("RUG450-BOUNCE", "abandoned: observation broke during the setup", { armed_t: rg.arm.t }, false); rg.pk = null; rg.arm = null; }
    const prevMc = sr.prevPx != null ? sr.prevPx * coin.supply : null, inRug = (f) => can(f) && !skip.has(f);
    if (!rg.pk || o.mc > rg.pk.mc) rg.pk = { mc: o.mc, t };
    else {
      const line = rg.pk.mc * (1 - S.RUG_FALL);
      if (rg.pk.mc >= S.RUG_MIN_PEAK_USD && prevOk && prevMc > line && o.mc <= line) { // armed (again): the bounce books follow the low from here
        rg.arm = { t, peak: rg.pk.mc, peak_t: rg.pk.t, low: o.mc, low_t: t };
        for (const [family, P, kind] of S.RUG) if (kind === "knife" && rg.arm.peak >= P && inRug(family) && inBand)
          cand(family, { peak_mc: Math.round(rg.pk.mc), peak_t: rg.pk.t, line_mc: Math.round(line), fall: +(1 - o.mc / rg.pk.mc).toFixed(4), fall_s: Math.round(t - rg.pk.t) }, rg.pk.t);
      } else if (rg.arm) {
        if (t - rg.arm.t > S.RUG_BOUNCE_EXPIRE_S) rg.arm = null;
        else if (o.mc < rg.arm.low) { rg.arm.low = o.mc; rg.arm.low_t = t; }
        else { const up = rg.arm.low * S.RUG_BOUNCE_X;
          if (prevOk && prevMc < up && o.mc >= up) { // the bounce happened: bought if in the band, and the setup is spent either way
            for (const [family, P, kind] of S.RUG) if (kind === "bounce" && rg.arm.peak >= P && inRug(family) && inBand)
              cand(family, { peak_mc: Math.round(rg.arm.peak), peak_t: rg.arm.peak_t, armed_t: rg.arm.t, low_mc: Math.round(rg.arm.low), low_t: rg.arm.low_t, bounce: +(o.mc / rg.arm.low - 1).toFixed(4), from_peak: +(1 - o.mc / rg.arm.peak).toFixed(4), fall_s: Math.round(rg.arm.t - rg.arm.peak_t), wait_s: Math.round(t - rg.arm.t) }, rg.arm.peak_t);
            rg.arm = null; } }
      }
    }
  }

  // 0c. DIP15K (older-11) — has been to $100K or more, comes down into $5K–$15K: bought at the fresh crossing down through $15K.
  //     Its own band. The "$100K" evidence is the watched peak (coin.rug.pk, kept above while any RUG book can be evaluated) or,
  //     in a run with the owner's gates, the provider's all-time high tested at the buy (opts.peakByGate). See spec DIP.
  if (can(S.DIP) && !skip.has(S.DIP)) {
    const prevMc = sr.prevPx != null ? sr.prevPx * coin.supply : null;
    if (prevOk && prevMc > S.DIP_HI_USD && o.mc <= S.DIP_HI_USD) {
      const pk = coin.rug?.pk ?? null, watched = !!pk && pk.mc >= S.DIP_PEAK_USD, d = { line_mc: S.DIP_HI_USD, prev_mc: Math.round(prevMc), peak_watched_mc: pk ? Math.round(pk.mc) : null, peak_watched_t: pk ? pk.t : null, peak_evidence: watched ? "watched" : opts.peakByGate ? "provider all-time high (tested at the buy)" : null };
      if (o.mc < S.DIP_LO_USD) note(S.DIP, "fell through the band in one step (not entered)", { ...d, mc: Math.round(o.mc) }, false);
      else if (!watched && !opts.peakByGate) note(S.DIP, "crossing down into the band, but no $100K peak was watched (not entered)", { ...d, mc: Math.round(o.mc) }, false);
      else cand(S.DIP, { ...d, fall: watched ? +(1 - o.mc / pk.mc).toFixed(4) : null, fall_s: watched ? Math.round(t - pk.t) : null }, watched ? pk.t : null);
    }
  }

  let low = null, hi1h = null, p15 = null; // shared by the books below and by the measurements at the end
  older: { if (young && !opts.youngAll) break older; // every book below starts at 8 hours old — except for a transfer-fee coin (owner, 22 Nov 2026: fee coins are bought in their first 8 hours too; they are reported in FEE-COINS only)
  // 1. AGE-DOUBLE — first fresh crossing of 2 × the market cap at the age-group start
  if (!young && can("AGE-DOUBLE")) { // needs an age-group start: there is none under 8 hours
    if (!g.ref || g.ref.status !== "OK") { g.ref = ageRef(coin, ag); if (g.ref.status !== "OK") note("AGE-DOUBLE", "reference_status=MISSING", g.ref); } // re-tried while missing (a later back-fill may supply it); logged once
    if (g.ref.status === "OK") {
      const linePx = (S.AGE_DOUBLE_X * g.ref.mc) / coin.supply;
      if (cross(linePx)) { if (inBand) cand("AGE-DOUBLE", { ref_mc: Math.round(g.ref.mc), ref_t: g.ref.t, ref_quiet_s: g.ref.quietS, ref_src: g.ref.src }, g.ref.t); else note("AGE-DOUBLE", "crossing outside entry band", { mc: Math.round(o.mc) }, false); }
    }
  }

  // 2. LOW4H (+ 4. SLOW-BUILD and 7. LOW4H-LIQ25K on LOW4H's first eligible candidate)
  { const first = !g.done["LOW4H"], aL = again("LOW4H"), aS = again("SLOW-BUILD"), aQ = again("LOW4H-LIQ25K"); // first attempt: all three, as in older-8; later: each book that may buy again
  if (first || aL || aS || aQ) {
    if (!sr.priced(t - S.LOW4H_WIN_S, t)) note("LOW4H", "insufficient 4 h history");
    else {
      low = sr.lowIn(t - S.LOW4H_WIN_S, t);
      if (low && cross(S.LOW4H_X * low.px)) {
        if (!inBand) { if (first || aL) note("LOW4H", "crossing outside entry band", { mc: Math.round(o.mc) }, false); }
        else {
          const d = { low_px: low.px, low_t: low.t, low_mc: Math.round(low.px * coin.supply) };
          const w4 = srcT(t - S.LOW4H_WIN_S); if (first || aL) cand("LOW4H", d, w4, !first);
          // SLOW-BUILD: ≥ 30 min from the low, and no completed 1-min candle from the low's minute up to (not incl.) the trigger's minute gains > 20%
          const elapsed = t - low.t, bars = sr.barsIn(Math.floor(low.t / 60), Math.floor(t / 60));
          const worst = bars.reduce((w, [m, b]) => { const gn = b.o > 0 ? b.c / b.o - 1 : 0; return gn > w.g ? { g: gn, m } : w; }, { g: -Infinity, m: null });
          // flag: the candle that contains the low may have OPENED before the low, so its full open→close gain is not all "climb after the low"
          const lowBar = sr.barAt(Math.floor(low.t / 60));
          const sd = { ...d, elapsed_s: Math.round(elapsed), candles: bars.length, max_candle_gain: bars.length ? +worst.g.toFixed(4) : null, low_candle_opened_before_low: !!(lowBar && lowBar.o > low.px), worst_is_low_candle: worst.m === Math.floor(low.t / 60) };
          if (!(first || aS)) { /* this book holds the coin on every row: not evaluated */ }
          else if (elapsed < S.SLOW_MIN_ELAPSED_S) note("SLOW-BUILD", "rejected: under 30 min from low", sd, false);
          else if (bars.length && worst.g > S.SLOW_MAX_CANDLE_GAIN + 1e-12) note("SLOW-BUILD", "rejected: a candle above +20%", { ...sd, at_minute: worst.m }, false);
          else cand("SLOW-BUILD", sd, w4, !first);
          if (first || aS) g.done["SLOW-BUILD"] = 1;
          // LOW4H-LIQ25K: liquidity ≥ $25K and 0.2 SOL round-trip price impact ≤ 5% (fees excluded)
          // the two tests are recorded separately so we can see whether the impact test ever binds on its own
          const lq = { ...d, liq_usd: o.liqUsd == null ? null : Math.round(o.liqUsd), static_impact: o.rtImpact ?? null, liq_pass: o.liqUsd != null && o.liqUsd >= S.LIQ_MIN_USD, impact_pass: o.rtImpact != null && o.rtImpact <= S.LIQ_MAX_RT_IMPACT };
          if (!(first || aQ)) { /* holds the coin on every row */ }
          else if (o.liqUsd == null || o.rtImpact == null) note("LOW4H-LIQ25K", "rejected: liquidity/impact evidence missing", lq, false);
          else if (!lq.liq_pass) note("LOW4H-LIQ25K", lq.impact_pass ? "rejected: liquidity under $25K" : "rejected: liquidity under $25K and static impact over 5%", lq, false);
          else if (!lq.impact_pass) note("LOW4H-LIQ25K", "rejected: static impact over 5% (liquidity passed)", lq, false);
          else cand("LOW4H-LIQ25K", lq, w4, !first);
          if (first || aQ) g.done["LOW4H-LIQ25K"] = 1;
        }
      }
    }
  } }

  // 3. CONT (+ 6. CONT-STALL shares its entry) — first eligible observation; not a crossing
  { const first = !g.done["CONT"], aC = again("CONT"), aX = again("CONT-STALL");
  if (first || aC || aX) {
    if (!sr.priced(t - S.CONT_HI_WIN_S, t)) note("CONT", "insufficient 1 h history");
    else {
      p15 = sr.priceAt(t - S.CONT_LOOKBACK_S); hi1h = sr.highIn(t - S.CONT_HI_WIN_S, t);
      if (p15 && hi1h && o.px >= S.CONT_RISE * p15.px && o.px >= S.CONT_NEAR_HI * hi1h.px && inBand) {
        const d = { px15: p15.px, hi1h: hi1h.px }, w1 = srcT(t - S.CONT_HI_WIN_S); if (first || aC) cand("CONT", d, w1, !first); if (first || aX) cand("CONT-STALL", d, w1, !first);
      }
    }
  } }

  // 5. HH-BREAK (amended in older-3) — price strictly above the preceding 60-min high, and volume of the last 15 COMPLETED minutes
  // ≥ 2 × the median of the sixteen 15-minute buckets before them. B = the last completed minute boundary (floor(t / 60 s)).
  //   signal volume : [B − 15 min, B)            baseline : 16 adjacent buckets covering [B − 255 min, B − 15 min)
  // Half-open intervals; no overlap and no missing minute. Needs a volume source (not available from price polling alone).
  { const first = !g.done["HH-BREAK"], aH = again("HH-BREAK"), aK = again("HH-BREAK-4H");
  if ((first || aH || aK) && !skip.has("HH-BREAK")) {
    const mB = Math.floor(t / 60), histFrom = (mB - 15 - 15 * S.HH_BASE_WINDOWS) * 60;
    if (!sr.covered(histFrom, t) || !sr.priced(t - S.HH_HI_WIN_S, t)) note("HH-BREAK", "insufficient 4 h 15 min history"); // volume windows: no trade missed; the 60-minute high: a known starting price too
    else {
      const hi = hi1h ?? sr.highIn(t - S.HH_HI_WIN_S, t);
      if (hi && o.px > hi.px && inBand) {
        const vsum = (m0) => sr.barsIn(m0, m0 + 15).reduce((x, [, b]) => x + b.v, 0);
        const sums = []; for (let k = 1; k <= S.HH_BASE_WINDOWS; k++) sums.push(vsum(mB - 15 - 15 * k));
        const base = median(sums), v15 = vsum(mB - 15);
        const d = { hi1h: hi.px, B: mB * 60, signal_window: [(mB - 15) * 60, mB * 60], baseline_window: [(mB - 255) * 60, (mB - 15) * 60], vol15: Math.round(v15), base_median: Math.round(base), windows: sums.map(Math.round) };
        if (!(base > 0)) note("HH-BREAK", "zero volume baseline (not entered)", d, false);
        else if (v15 >= S.HH_VOL_X * base) { const f0 = Math.min(histFrom, srcT(t - S.HH_HI_WIN_S)); if (first || aH) cand("HH-BREAK", d, f0, !first); if (first || aK) cand("HH-BREAK-4H", d, f0, !first); } // the 4-hour clock book shares the buy (as CONT-STALL shares CONT's)
      }
    }
  } }

  // 5b. HH30-5M / HH30-10M / HH15-5M (older-6) — the same rule on shorter clocks: price strictly above the preceding W-second high,
  // and volume of the last n COMPLETED minutes ≥ 2 × the median of the K adjacent n-minute buckets before them.
  //   signal volume : [B − n min, B)            baseline : K buckets covering [B − (K + 1)·n min, B − n min)
  // Same half-open windows, same completed-minute boundary B, same candle selection (barsIn) and the same zero-baseline refusal as
  // HH-BREAK. No dollar floor. Needs a volume source, so it is not evaluated from price polling.
  for (const [family, W, n, K] of S.HH_FAST) {
    if (!can(family) || skip.has(family)) continue;
    const mB = Math.floor(t / 60), histFrom = Math.min((mB - n - n * K) * 60, t - W);
    if (!sr.covered(histFrom, t) || !sr.priced(t - W, t)) { note(family, "insufficient history"); continue; }
    const hi = sr.highIn(t - W, t);
    if (!(hi && o.px > hi.px && inBand)) continue;
    const vsum = (m0) => sr.barsIn(m0, m0 + n).reduce((x, [, b]) => x + b.v, 0);
    const sums = []; for (let k = 1; k <= K; k++) sums.push(vsum(mB - n - n * k));
    const base = median(sums), vn = vsum(mB - n);
    const d = { high: hi.px, high_window_s: W, B: mB * 60, signal_window: [(mB - n) * 60, mB * 60], baseline_window: [(mB - n - n * K) * 60, (mB - n) * 60], vol: Math.round(vn), base_median: Math.round(base), windows: sums.map(Math.round) };
    if (!(base > 0)) note(family, "zero volume baseline (not entered)", d, false);
    else if (vn >= S.HH_VOL_X * base) cand(family, d, Math.min(histFrom, srcT(t - W)));
  }

  // FAST / FAST150 — fresh crossing of X × the lowest pool spot price in the preceding window (1, 3, 5, 10 or 30 minutes; see S.FAST).
  // Window = exact observations on the receive clock, [t − W, t), including the price standing at the window's start.
  let fastSeed = false, fastSeedFirst = false; // …First: a seed from a FIRST FAST buy — the only kind that can seed SECOND-WAVE's first attempt (older-8)
  for (const [family, W, X, seeds] of S.FAST) {
    if (!can(family) || skip.has(family)) continue;
    if (!sr.covered(t - W, t, true)) { note(family, "window not covered"); continue; }
    const lo = sr.lowIn(t - W, t, true); if (!lo) continue; // EXACT: observations inside the window + the exact price standing at its start; never back-fill, never a minute bar
    if (!cross(X * lo.px)) continue;
    if (!inBand) { note(family, "crossing outside entry band", { mc: Math.round(o.mc) }, false); continue; }
    const obs = sr.raw.filter((r) => r[0] >= t - W && r[0] < t);
    cand(family, { window_s: W, x: X, low_px: lo.px, low_t: lo.t, threshold_px: X * lo.px, low_support: obs.filter((r) => r[1] <= lo.px * 1.02).length, window_obs: obs.length, low_carried_in: lo.t <= t - W,
      move_s: +(t - Math.max(lo.t, t - W)).toFixed(1) }); // RECORDED: seconds from the window's low to this trigger (= the whole window when the low was the price standing at its start)
    if (seeds) { fastSeed = true; if (!out.cands[out.cands.length - 1].again) fastSeedFirst = true; }
  }
  // 14. SECOND-WAVE (amended in older-3) — seeded by the first 2× FAST trigger. ONE active setup per mint, kept alive until its
  // own 60-minute expiry even across an age boundary. The seed uses up the SEED age group's attempt; the trade is classified by
  // the age group AT ENTRY, whose slot must be free and is then used. Seed age is recorded separately.
  // BUYING AGAIN and SECOND-WAVE. The FIRST setup per age group is seeded exactly as in older-8: by a first FAST buy, when the
  // slot is unused. A setup seeded AGAIN (slot already used, book holds nothing on some row) is marked, never uses up a first
  // slot, and gives way to a first setup: so the first buys of this book are the same with or without buying again.
  let w = coin.sw; const firstSW = !g.done["SECOND-WAVE"];
  if (w && w.again && firstSW && fastSeedFirst) { coin.sw = null; note("SECOND-WAVE", "re-buy setup replaced by a first setup", { seed_t: w.seedT, seed_ag: w.seedAg }, false); w = null; }
  if (!w) {
    if (firstSW ? fastSeedFirst : fastSeed && again("SECOND-WAVE")) {
      const re = !firstSW; g.done["SECOND-WAVE"] = 1; note("SECOND-WAVE", "seeded", { seed_t: t, seed_ag: ag, ...(re ? { again: true } : {}) }, false);
      coin.sw = { seedT: t, seedPx: o.px, seedAg: ag, seedAgeS: Math.round(t - coin.createTs), windows: out.cands.filter((c) => (re || !c.again) && S.FAST.some(([f, , , sd]) => sd && f === c.family)).map((c) => c.family), H: o.px, HT: t, frozen: null, pullT: null, again: re };
    }
  } else {
    const end = (reason, detail = {}) => { coin.sw = null; note("SECOND-WAVE", reason, { seed_t: w.seedT, seed_ag: w.seedAg, windows: w.windows, ...detail }, false); };
    if (t > w.seedT + S.SW_EXPIRE_S) end(w.frozen ? "expired: no reclaim within 60 min" : "expired: no 25% pullback within 60 min");
    else if (!sr.covered(w.seedT, t, true)) end("abandoned: coverage broke during the setup");
    else if (w.frozen === null) { if (o.px > w.H) { w.H = o.px; w.HT = t; } else if (o.px <= S.SW_PULLBACK * w.H) { w.frozen = w.H; w.pullT = t; w.pullPx = o.px; } }
    else if (o.px > w.frozen) {
      const d = { seed_t: w.seedT, seed_px: w.seedPx, seed_ag: w.seedAg, seed_age_s: w.seedAgeS, entry_ag: ag, seed_windows: w.windows, frozen_high: w.frozen, high_t: w.HT, pullback_t: w.pullT, pullback_px: w.pullPx, since_seed_s: Math.round(t - w.seedT) };
      if (w.again) { // a re-buy setup: bought only if the book may buy again now; it never takes a first slot
        if (!inBand) end("reclaim outside entry band", { ...d, mc: Math.round(o.mc) });
        else if (g.done["SECOND-WAVE"] && !again("SECOND-WAVE")) end("reclaim, but the book holds this coin on every row", d);
        else { const had = g.done["SECOND-WAVE"]; coin.sw = null; cand("SECOND-WAVE", d, null, true); if (!had) delete g.done["SECOND-WAVE"]; }
      }
      else if (ag !== w.seedAg && g.done["SECOND-WAVE"]) end("reclaim, but the entry-age group's SECOND-WAVE slot is already used", d);
      else if (!inBand) { g.done["SECOND-WAVE"] = 1; end("reclaim outside entry band (attempt used)", { ...d, mc: Math.round(o.mc) }); }
      else { coin.sw = null; cand("SECOND-WAVE", d, null, false); }
    }
  }

  } // end of the 8-hours-and-older books

  if (out.cands.length) {
    // evidence stored ONCE per entry: the previous observation that established the fresh crossing, and — for the short-window
    // families — every observation of the longest window involved
    const W = Math.max(0, ...out.cands.map((c) => c.detail.window_s || (c.family === "SECOND-WAVE" ? t - c.detail.seed_t : 0)));
    out.evidence = { prev: prevRec, window_s: W || null, obs: W ? sr.raw.filter((r) => r[0] >= t - W && r[0] <= t).slice(-S.EVIDENCE_OBS_CAP).map((r) => [+r[0].toFixed(3), r[1], Math.round(r[2]), r[3]]) : null };
  }
  if (out.cands.length) { low ??= sr.priced(t - S.LOW4H_WIN_S, t) ? sr.lowIn(t - S.LOW4H_WIN_S, t) : null; hi1h ??= sr.priced(t - 3600, t) ? sr.highIn(t - 3600, t) : null; p15 ??= sr.priceAt(t - 900); const f = features(coin, o, low, hi1h, p15); for (const c of out.cands) c.features = f; }
  return out;
}
