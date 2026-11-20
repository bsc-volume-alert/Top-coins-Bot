// series.mjs — one coin's price history in memory: exact recent observations + minute bars + coverage.
// Time is in seconds (float, from the feed's receive clock). Prices are USD per token. Volume is USD.
// Coverage answers "do we really know what happened in [x, t]?" and separates four cases:
//   verified quiet (feed up, coin covered, simply no trades)  → the last price stands;
//   stale (the coin's own data stops but the feed was up)     → same as quiet, reported with its age;
//   feed outage (a global gap overlapping the window)         → window NOT covered unless that gap was back-filled for this coin;
//   missing history (window starts before the coin's history) → NOT covered.
import { RAW_KEEP_S, RAW_CAP, BAR_KEEP_S, BUYERS_PER_BAR_CAP } from "./spec.mjs";

export class Coverage { // global feed state, shared by all coins
  constructor() { this.gaps = []; this.upSince = null; this.down = true; }
  up(t) { if (this.down) { if (this.upSince !== null && this.lastDown != null) this.gaps.push([this.lastDown, t]); this.upSince = this.upSince ?? t; this.down = false; } }
  drop(t) { if (!this.down) { this.down = true; this.lastDown = t; } }
  /** gaps overlapping [x, t] (an outage still in progress counts up to t) */
  gapsIn(x, t) { const g = this.gaps.filter(([a, b]) => b > x && a < t); if (this.down && this.lastDown != null && this.lastDown < t) g.push([this.lastDown, t]); return g; }
}

export class Series {
  constructor(mint, cov) {
    this.mint = mint; this.cov = cov;
    this.raw = [];          // [t, px, volUsd, isBuy] in time order, last RAW_KEEP_S
    this.bars = new Map();  // minute → {o,h,l,c,v,nb,ns,buyers:Set,lowT}
    this.histFrom = null;   // earliest second from which this coin's history is continuous (back-fill or live)
    this.patched = [];      // global gaps re-filled for this coin from back-fill bars: [a, b]
    this.lastPx = null; this.lastT = null; this.prevPx = null; this.prevT = null;
  }
  startLive(t) { if (this.histFrom === null || this.histFrom > t) this.histFrom = t; }
  /** back-fill minute bars (e.g. GMGN 1-minute kline): [{m, o, h, l, c, v}]; extends coverage back to the first bar if contiguous */
  addBars(bars, { from, to, patchGap } = {}) {
    for (const b of bars) if (!this.bars.has(b.m)) this.bars.set(b.m, { o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0, nb: b.nb || 0, ns: b.ns || 0, buyers: new Set(), lowT: b.m * 60, bf: true });
    if (from != null && to != null) {
      if (patchGap) this.patched.push([from, to]);
      else if (this.histFrom === null || (from < this.histFrom && to >= this.histFrom)) this.histFrom = from;
      // the newest back-filled close before live data is the last known price
      if (this.lastT === null) { const ms = [...this.bars.keys()].sort((a, b) => a - b); const m = ms[ms.length - 1]; if (m != null) { this.lastPx = this.bars.get(m).c; this.lastT = m * 60 + 59; } }
    }
  }
  add(t, px, volUsd = 0, isBuy = null, user = null) {
    if (!(px > 0)) return;
    this.prevPx = this.lastPx; this.prevT = this.lastT;
    this.lastPx = px; this.lastT = t;
    const r = this.raw;
    if (r.length >= RAW_CAP && r.length && Math.floor(r[r.length - 1][0]) === Math.floor(t)) { const z = r[r.length - 1]; z[1] = px; z[2] += volUsd; }
    else r.push([t, px, volUsd, isBuy]);
    const m = Math.floor(t / 60); let b = this.bars.get(m);
    if (!b || b.bf) { b = { o: px, h: px, l: px, c: px, v: 0, nb: 0, ns: 0, buyers: new Set(), lowT: t }; this.bars.set(m, b); }
    if (px > b.h) b.h = px; if (px < b.l) { b.l = px; b.lowT = t; } b.c = px; b.v += volUsd;
    if (isBuy === true) { b.nb++; if (user && b.buyers.size < BUYERS_PER_BAR_CAP) b.buyers.add(user); } else if (isBuy === false) b.ns++;
  }
  prune(now) {
    const cut = now - RAW_KEEP_S; let i = 0; while (i < this.raw.length && this.raw[i][0] < cut) i++; if (i) this.raw.splice(0, i);
    const mc = Math.floor((now - BAR_KEEP_S) / 60); for (const m of this.bars.keys()) if (m < mc) this.bars.delete(m);
  }
  /** is [x, t] fully known for this coin? */
  covered(x, t) {
    if (this.histFrom === null || this.histFrom > x) return false;
    for (const [a, b] of this.cov.gapsIn(x, t)) if (!this.patched.some(([pa, pb]) => pa <= a && pb >= b)) return false;
    return true;
  }
  /** last price at or before t (exact from raw; else the close of the last completed bar ending ≤ t; else the last known price if older) */
  priceAt(t) {
    for (let i = this.raw.length - 1; i >= 0; i--) if (this.raw[i][0] <= t) return { px: this.raw[i][1], t: this.raw[i][0], src: "obs" };
    let best = null; for (const [m, b] of this.bars) if ((m + 1) * 60 <= t && (best === null || m > best)) best = m;
    if (best !== null) return { px: this.bars.get(best).c, t: best * 60 + 59, src: "bar" };
    if (this.lastT !== null && this.lastT <= t) return { px: this.lastPx, t: this.lastT, src: "last" };
    return null;
  }
  /** lowest price in [x, t) — exact observations where held, bar lows for older minutes, plus the price carried in at x */
  lowIn(x, t) { return this._ext(x, t, (a, b) => a < b, "l"); }
  highIn(x, t) { return this._ext(x, t, (a, b) => a > b, "h"); }
  _ext(x, t, better, k) {
    let best = null; const rawFrom = this.raw.length ? this.raw[0][0] : Infinity;
    const carried = this.priceAt(x); if (carried) best = { px: carried.px, t: x };
    for (const [m, b] of this.bars) { const s = m * 60; if (s >= x && s + 60 <= Math.min(t, rawFrom)) { if (!best || better(b[k], best.px)) best = { px: b[k], t: k === "l" ? b.lowT : s }; } }
    for (const [ts, px] of this.raw) { if (ts < x) continue; if (ts >= t) break; if (!best || better(px, best.px)) best = { px, t: ts }; }
    return best;
  }
  /** exact USD volume in (x, t] from raw observations */
  volIn(x, t) { let v = 0; for (const [ts, , vol] of this.raw) if (ts > x && ts <= t) v += vol; return v; }
  /** completed minute bars with minute index in [m0, m1) */
  barsIn(m0, m1) { const out = []; for (const [m, b] of this.bars) if (m >= m0 && m < m1) out.push([m, b]); return out.sort((a, b) => a[0] - b[0]); }
  buyersIn(m0, m1) { const s = new Set(); for (const [, b] of this.barsIn(m0, m1)) for (const u of b.buyers) s.add(u); return s.size; }
}
