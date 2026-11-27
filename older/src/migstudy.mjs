// migstudy.mjs — pure helpers for the READ-ONLY migration study (scripts/study-migration.mjs). No I/O, no clock, no provider.
// Owner, 26 Nov 2026 22:44–22:46 UK: "wait 5 minutes for the migrated coin and then buy if it's over 50k … and then wait 10
// minutes … that kind of avoids the immediate rug on migration" — "if you have the stored data, let's replay it".
// The replay works from the stored ONE-MINUTE bars (open / high / low / close per minute). That is a coarser record than the
// live feed, so every sale is given twice: at the stop level itself (the best case) and "cautious" — at the close of the minute
// the stop was hit in whenever that minute closed under the level (a coin that falls through its stop inside a minute is not
// sold at the stop). The truth lies between the two. No fee, no price impact: a real paper book would do a little worse.
// 27 Nov 2026 11:29 UK, his next questions: longer waits (15 / 30 / 60 minutes after migration, still over $50K), and
// "if they hit 100K" — buy at once (40% stop), or wait 5 minutes and buy only if still over $100K. See firstTouch().
export const STOPS = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7];
export const MAX_HOLD_MIN = 1440;

/** The price at moment t (seconds) from minute bars sorted by m (minute index = floor(seconds / 60)).
 *  The open of the first minute that starts at or after t, if that minute starts within `freshMin` minutes of t; otherwise the
 *  last close before t (nothing has traded since: the price is stale, and how stale is said). null = no bar before or at t.
 *  from = index of the first bar that belongs to the time AFTER the price was taken. */
export function priceAt(bars, t, freshMin = 2) {
  const me = Math.ceil(t / 60); let last = -1;
  for (let i = 0; i < bars.length; i++) { const b = bars[i]; if (b.m < me) { last = i; continue; } if (b.m - me < freshMin) return { px: b.o, m: b.m, quiet_min: 0, from: i }; break; }
  if (last < 0) return null;
  return { px: bars[last].c, m: me, quiet_min: me - bars[last].m - 1, from: last + 1 };
}

/** One trailing stop on the bars from index `from`, bought at `px` in minute `m0`.
 *  Inside one minute the order of high and low is unknown: the low is tested first against the peak known BEFORE the minute
 *  (the cautious order), then the high lifts the peak, then the close is tested against the new level.
 *  Returns { best, cautious (returns, e.g. -0.25), hold_min, open } — open: the data ended before the stop or the 24 hours. */
export function trail(bars, from, px, m0, stop, maxHold = MAX_HOLD_MIN, touch = false) {
  let peak = px;
  for (let i = from; i < bars.length; i++) {
    const b = bars[i], held = b.m - m0;
    if (held > maxHold) return { best: b.o / px - 1, cautious: b.o / px - 1, hold_min: maxHold, open: false, why: "24 h" };
    let level = peak * (1 - stop);
    // a buy made INSIDE this minute, the moment the price touched a line (27 Nov): the minute's open and low are taken to have
    // come before the buy (the price was rising to the line), so only its high (a new peak) and its close can act on the stop.
    // A dip after the touch that recovered by the close is not seen — the best case and the cautious case share that blind spot.
    if (touch && i === from) { if (b.h > peak) peak = b.h; level = peak * (1 - stop); if (b.c <= level) return { best: level / px - 1, cautious: b.c / px - 1, hold_min: held, open: false, why: "stop in the minute of the buy" }; continue; }
    if (b.o <= level) return { best: b.o / px - 1, cautious: b.o / px - 1, hold_min: held, open: false, why: "opened under the stop" };
    if (b.l <= level) return { best: level / px - 1, cautious: Math.min(level, b.c) / px - 1, hold_min: held, open: false, why: "stop" };
    if (b.h > peak) { peak = b.h; level = peak * (1 - stop); if (b.c <= level) return { best: level / px - 1, cautious: b.c / px - 1, hold_min: held, open: false, why: "stop after a new high" }; }
  }
  const last = bars[bars.length - 1];
  return { best: (last ? last.c : px) / px - 1, cautious: (last ? last.c : px) / px - 1, hold_min: last ? last.m - m0 : 0, open: true, why: "data ends" };
}

/** The first minute in which a coin that began UNDER a price line reached it (owner, 27 Nov: "if they hit 100K…").
 *  { above: true } = the coin's first bar already opened at or over the line: it never "hit" it in front of us, no buy.
 *  { i, m, after_min } = index and minute of the touch, minutes after the first bar. null = not reached within `withinMin`. */
export function firstTouch(bars, linePx, withinMin = MAX_HOLD_MIN) {
  if (!bars.length) return null; if (bars[0].o >= linePx) return { above: true };
  for (let i = 0; i < bars.length && bars[i].m - bars[0].m <= withinMin; i++) if (bars[i].h >= linePx) return { i, m: bars[i].m, after_min: bars[i].m - bars[0].m };
  return null;
}

/** Everything about one would-be buy: the highest multiple reached (within 24 h), when, the value at set minutes after, and every stop. */
export function replay(bars, entry, stops = STOPS, marks = [5, 15, 60]) {
  const { px, m: m0, from, touch = false } = entry; let hi = 1, hiMin = 0, lo = 1; const at = {};
  for (let i = from; i < bars.length; i++) { const b = bars[i], k = b.m - m0; if (k > MAX_HOLD_MIN) break; if (b.h / px > hi) { hi = b.h / px; hiMin = k; } const low = touch && i === from ? b.c : b.l; if (low / px < lo) lo = low / px; }
  for (const k of marks) { let c = null; for (let i = from; i < bars.length && bars[i].m - m0 <= k; i++) c = bars[i].c; at[k] = c == null ? null : c / px; }
  const st = {}; for (const s of stops) st[Math.round(s * 100)] = trail(bars, from, px, m0, s, MAX_HOLD_MIN, touch);
  return { high: hi, high_min: hiMin, low: lo, at, stops: st };
}

/** group summary of replayed buys: rows = [{ r: replay(), … }]. Returns plain numbers (percent, one decimal). */
export function summarise(rows, stops = [20, 25, 30, 40, 60]) {
  const n = rows.length; if (!n) return { n: 0 };
  const pct = (x) => +(100 * x).toFixed(1), mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, med = (a) => { const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
  const out = { n, reached_2x_pct: pct(rows.filter((x) => x.r.high >= 2).length / n), never_up_10_pct: pct(rows.filter((x) => x.r.high < 1.1).length / n), fell_90_pct: pct(rows.filter((x) => x.r.low <= 0.1).length / n), stops: {} };
  for (const s of stops) { const c = rows.map((x) => x.r.stops[s].cautious), b = rows.map((x) => x.r.stops[s].best), srt = [...c].sort((x, y) => y - x);
    out.stops[s] = { cautious_mean: pct(mean(c)), cautious_median: pct(med(c)), cautious_wins: c.filter((v) => v > 0).length, cautious_less_best2: srt.length > 2 ? pct(mean(srt.slice(2))) : null, best_mean: pct(mean(b)), best_median: pct(med(b)), severe_pct: pct(c.filter((v) => v <= -0.3).length / n), open: rows.filter((x) => x.r.stops[s].open).length }; }
  return out;
}
