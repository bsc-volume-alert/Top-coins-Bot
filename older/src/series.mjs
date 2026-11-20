// series.mjs — one coin's price history in memory: exact recent observations + minute bars + coverage.
// Time is in seconds (float, from the feed's receive clock). Prices are USD per token. Volume is USD.
// Coverage answers "do we really know what happened in [x, t]?" and separates four cases:
//   verified quiet (feed up, coin covered, simply no trades)  → the last price stands;
//   stale (the coin's own data stops but the feed was up)     → same as quiet, reported with its age;
//   feed outage (a global gap overlapping the window)         → window NOT covered unless that gap was back-filled for this coin;
//   missing history (window starts before the coin's history) → NOT covered.
import { RAW_KEEP_S, RAW_CAP, BAR_KEEP_S, BUYERS_KEEP_S, BUYER_RAW_KEEP_S, BUYERS_PER_BAR_CAP, BACKFILL_MAX_HOLE_S } from "./spec.mjs";

const EMPTY = new Set(); // shared: most minute bars never record a buyer wallet
export class Coverage { // global data-quality state, shared by all coins. Down while ANY reason is active (feed outage, SOL/USD stale…).
  constructor() { this.gaps = []; this.upSince = null; this.down = true; this.reasons = new Set(["feed"]); this.lastDown = null; }
  up(t, reason = "feed") {
    this.reasons.delete(reason); if (this.reasons.size || !this.down) return;
    if (this.lastDown != null) this.gaps.push([this.lastDown, t]);
    this.upSince = this.upSince ?? t; this.down = false; this.lastDown = null;
  }
  drop(t, reason = "feed") { this.reasons.add(reason); if (!this.down) { this.down = true; this.lastDown = t; } }
  /** gaps overlapping [x, t] (an outage still in progress counts up to t) */
  gapsIn(x, t) { const g = this.gaps.filter(([a, b]) => b > x && a < t); if (this.down && this.lastDown != null && this.lastDown < t) g.push([this.lastDown, t]); return g; }
}

export class Series {
  constructor(mint, cov) {
    this.mint = mint; this.cov = cov;
    this.raw = [];          // [t, px, volUsd, isBuy] in time order, last RAW_KEEP_S
    this.bars = new Map();  // minute → {o,h,l,c,v,nb,ns,buyers:Set,lowT} — LIVE observations only
    this.bf = new Map();    // minute → {o,h,l,c,v,…} — ACCEPTED back-fill only, kept apart: never read by an exact (seconds-scale) decision
    this.histFrom = null;   // earliest second from which this coin's history is continuous (back-fill or live)
    this.obsFrom = null;    // earliest second from which EXACT observations are continuous (live only: back-fill never moves it)
    this.lastIsBf = false;  // lastPx/lastT came from back-fill (no exact observation yet)
    this.compT = null;      // last time exact observations were merged within a second (RAW_CAP reached): measurements over it are flagged
    this.patched = [];      // global gaps re-filled for this coin from back-fill bars: [a, b]
    this.lastPx = null; this.lastT = null; this.prevPx = null; this.prevT = null;
  }
  startLive(t) { if (this.histFrom === null || this.histFrom > t) this.histFrom = t; if (this.obsFrom === null || this.obsFrom > t) this.obsFrom = t; }
  /** this coin's own data restarts at t (lost events, a hole in the samples, a new pool): nothing before t is continuous */
  restartAt(t) { this.histFrom = t; this.obsFrom = t; }
  /** are EXACT observations continuous over [x, t]? (no back-fill, no repaired outage) — what the trade-window measurements need */
  obsCovered(x, t) { return this.obsFrom !== null && this.obsFrom <= x && this.cov.gapsIn(x, t).length === 0; }
  /** back-fill minute bars (e.g. GMGN 1-minute kline): [{m, o, h, l, c, v}] requested for [from, to).
   *  Coverage follows the EVIDENCE, not the request: an empty reply extends nothing and repairs nothing (it cannot be told
   *  apart from "the provider has no data"). SPARSE replies prove nothing about the minutes they leave out (a missing minute
   *  may be "no trade" or missing data): bars count as continuous evidence only where consecutive bars are
   *  ≤ BACKFILL_MAX_HOLE_S apart — a DECLARED APPROXIMATION for hour-scale windows, not proof of continuity.
   *  History is extended back over the unbroken run of bars that reaches the start of the known history, and no further; an
   *  outage is repaired only when bars reach both of its ends (within 2 minutes) with no such hole between them.
   *  VALIDATION COMES FIRST: bars of a rejected reply, and bars outside the accepted run, are NOT kept — nothing a decision
   *  can read ever comes from data that was not accepted. Accepted bars live in `bf`, apart from live bars, and are read only
   *  by hour-scale windows: never by a fresh crossing or a seconds-scale window (see covered(…, strict) and the exact paths). */
  addBars(bars, { from, to, patchGap } = {}) {
    if (from == null || to == null) return { accepted: false, from: null, why: "no requested range: nothing can be claimed" };
    if (!bars.length) return { accepted: false, from: null, why: "provider returned no bars" };
    const ms = [...new Set(bars.map((b) => b.m))].sort((a, b) => a - b), H = BACKFILL_MAX_HOLE_S;
    const first = ms[0] * 60, last = ms[ms.length - 1] * 60 + 59;
    let keepFrom = ms[0], start = from;
    if (patchGap) {
      if (first > from + 120) return { accepted: false, from: first, why: "bars do not reach back to the start of the outage" };
      if (last < to - 120) return { accepted: false, from: first, why: "bars stop before the end of the outage" };
      for (let i = 1; i < ms.length; i++) if ((ms[i] - ms[i - 1]) * 60 > H) return { accepted: false, from: first, why: `a hole of ${ms[i] - ms[i - 1]} minutes inside the outage` };
    } else {
      if (last < to - H) return { accepted: false, from: null, why: "bars do not reach the start of the known history" };
      let k = ms.length - 1; while (k > 0 && (ms[k] - ms[k - 1]) * 60 <= H) k--; // the unbroken run that reaches the known history
      keepFrom = ms[k]; start = Math.max(from, ms[k] * 60);
    }
    for (const b of bars) if (b.m >= keepFrom) this.bf.set(b.m, { o: b.o, h: b.h, l: b.l, c: b.c, v: b.v || 0, nb: b.nb || 0, ns: b.ns || 0, buyers: EMPTY, lowT: b.m * 60, bf: true });
    if (patchGap) { this.patched.push([from, to]); return { accepted: true, from, resolution: "1-minute bars" }; }
    if (this.histFrom === null || (start < this.histFrom && to >= this.histFrom)) this.histFrom = start;
    if (this.lastT === null) { this.lastPx = this.bf.get(ms[ms.length - 1]).c; this.lastT = last; this.lastIsBf = true; }
    return { accepted: true, from: start, resolution: "1-minute bars" };
  }
  add(t, px, volUsd = 0, isBuy = null, user = null) {
    if (!(px > 0)) return;
    this.prevPx = this.lastPx; this.prevT = this.lastT;
    this.lastPx = px; this.lastT = t; this.lastIsBf = false;
    const r = this.raw;
    if (r.length >= RAW_CAP && r.length && Math.floor(r[r.length - 1][0]) === Math.floor(t)) {
      // COMPRESSION (RAW_CAP reached): this observation is merged into the previous one of the same second — last price, summed
      // volume, every buyer kept with its own volume. Transaction counts and sides inside that second are no longer exact, so the
      // moment is recorded and any measurement window containing it is flagged `compressed`.
      const z = r[r.length - 1], zb = z[3] === true ? (typeof z[4] === "string" ? [[z[4], z[2]]] : z[4] || []) : [];
      const nb = isBuy === true && user ? (typeof user === "string" ? [[user, volUsd]] : user) : [];
      z[1] = px; z[2] += volUsd; if (z[3] !== isBuy) z[3] = null; const all = [...zb, ...nb]; if (all.length) { z[4] = all; z[5] = true; } this.compT = t;
    } else r.push(isBuy === true && user ? [t, px, volUsd, isBuy, user] : [t, px, volUsd, isBuy]); // user: one wallet, or [[wallet, usd]…] when a transaction has several buyers
    const m = Math.floor(t / 60); let b = this.bars.get(m);
    if (!b) { b = { o: px, h: px, l: px, c: px, v: 0, nb: 0, ns: 0, buyers: EMPTY, lowT: t }; this.bars.set(m, b); }
    if (px > b.h) b.h = px; if (px < b.l) { b.l = px; b.lowT = t; } b.c = px; b.v += volUsd;
    if (isBuy === true) { b.nb++; if (user) for (const u of typeof user === "string" ? [user] : user.map((x) => x[0])) { if (b.buyers.size >= BUYERS_PER_BAR_CAP) break; if (b.buyers === EMPTY) b.buyers = new Set(); b.buyers.add(u); } } else if (isBuy === false) b.ns++;
  }
  prune(now) {
    const cut = now - RAW_KEEP_S; let i = 0; while (i < this.raw.length && this.raw[i][0] < cut) i++; if (i) this.raw.splice(0, i);
    const ucut = now - BUYER_RAW_KEEP_S; for (const o of this.raw) { if (o[0] >= ucut) break; if (o.length > 4) o.length = 4; } // buyer wallets are only read for the last 5 minutes
    const mc = Math.floor((now - BAR_KEEP_S) / 60), bc = Math.floor((now - BUYERS_KEEP_S) / 60);
    // buyer wallets are only read for the last 15 minutes (features): older bars keep the COUNT and release the wallet list (memory)
    for (const [m, b] of this.bars) { if (m < mc) this.bars.delete(m); else if (m < bc && b.buyers !== EMPTY) { b.nbuyers = b.buyers.size; b.buyers = EMPTY; } }
    for (const m of this.bf.keys()) if (m < mc) this.bf.delete(m);
  }
  /** is [x, t] fully known for this coin?
   *  strict = EXACT observations only: continuous since before x (back-fill does not count, even at start-up) and no outage,
   *  repaired or not. Used for fresh crossings and the seconds-scale FAST / SECOND-WAVE windows.
   *  non-strict = hour-scale: history (live or accepted back-fill) reaches back to x, and every outage inside was repaired. */
  covered(x, t, strict = false) {
    if (strict) return this.obsCovered(x, t);
    if (this.histFrom === null || this.histFrom > x) return false;
    for (const [a, b] of this.cov.gapsIn(x, t)) if (!this.patched.some(([pa, pb]) => pa <= a && pb >= b)) return false;
    return true;
  }
  /** last price at or before t. Exact sources first: an exact observation; else the close of the last completed LIVE bar; else the
   *  last exact price if older. exact = false (hour-scale use) also considers accepted back-fill: a back-filled close of a later
   *  minute is newer information (a repaired outage, or history before the live start) and wins — an older observation is never
   *  preferred over a newer known close. exact = true never returns anything that came from back-fill. */
  priceAt(t, exact = false) {
    let r = null; for (let i = this.raw.length - 1; i >= 0; i--) if (this.raw[i][0] <= t) { r = { px: this.raw[i][1], t: this.raw[i][0], src: "obs" }; break; }
    if (!r) { let best = null; for (const m of this.bars.keys()) if ((m + 1) * 60 <= t && (best === null || m > best)) best = m; if (best !== null) r = { px: this.bars.get(best).c, t: best * 60 + 59, src: "bar" }; }
    if (!r && this.lastT !== null && this.lastT <= t && !this.lastIsBf) r = { px: this.lastPx, t: this.lastT, src: "last" };
    if (exact || !this.bf.size) return r;
    let bb = null; for (const m of this.bf.keys()) if ((m + 1) * 60 <= t && (bb === null || m > bb)) bb = m;
    // a completed back-filled minute that ENDS after the exact observation holds that minute's last trade: newer or equal information
    if (bb !== null && (!r || (bb + 1) * 60 > r.t)) return { px: this.bf.get(bb).c, t: bb * 60 + 59, src: "backfill" };
    if (!r && this.lastT !== null && this.lastT <= t) return { px: this.lastPx, t: this.lastT, src: "last" };
    return r;
  }
  /** lowest / highest price in [x, t), plus the price carried in at x.
   *  exact = true (FAST, SECOND-WAVE): exact observations inside the window and the exact price standing at its start — nothing
   *  from back-fill and no minute bar (a bar's extreme may lie outside the window).
   *  exact = false (hour-scale): also live bar extremes for minutes older than the exact buffer — including its boundary minute,
   *  up to 59 s before x — and accepted back-filled bars that lie WHOLLY inside the window. */
  lowIn(x, t, exact = false) { return this._ext(x, t, (a, b) => a < b, "l", exact); }
  highIn(x, t, exact = false) { return this._ext(x, t, (a, b) => a > b, "h", exact); }
  _ext(x, t, better, k, exact = false) {
    let best = null; const rawFrom = this.raw.length ? this.raw[0][0] : Infinity;
    const carried = this.priceAt(x, exact); if (carried) best = { px: carried.px, t: x };
    if (!exact) {
      for (const [m, b] of this.bars) { const s = m * 60; if (s + 60 > x && s < Math.min(t, rawFrom)) { if (!best || better(b[k], best.px)) best = { px: b[k], t: k === "l" ? b.lowT : s }; } }
      for (const [m, b] of this.bf) { const s = m * 60; if (s >= x && s + 60 <= t) { if (!best || better(b[k], best.px)) best = { px: b[k], t: s }; } }
    }
    for (const [ts, px] of this.raw) { if (ts < x) continue; if (ts >= t) break; if (!best || better(px, best.px)) best = { px, t: ts }; }
    return best;
  }
  /** RECORDED MEASUREMENTS (never filters): trading in (x, t] from the exact observations — USD volume, buy and sell
   *  transactions, different buying wallets, and the largest single buyer's share of the buy volume.
   *  One observation is one transaction's committed state; a transaction with both buys and sells counts as neither.
   *  compressed: true when observations inside the window were merged within a second (RAW_CAP): volume and buyers are still
   *  complete, but the buy/sell transaction counts are understated. */
  winStats(x, t) {
    let vol = 0, buys = 0, sells = 0, buyVol = 0, compressed = false; const by = new Map();
    for (const o of this.raw) { const ts = o[0]; if (ts <= x) continue; if (ts > t) break; vol += o[2]; if (o[5]) compressed = true;
      const u = o[4]; let bv = 0; if (typeof u === "string") { by.set(u, (by.get(u) || 0) + o[2]); bv = o[2]; } else if (u) for (const [w, usd] of u) { by.set(w, (by.get(w) || 0) + usd); bv += usd; }
      if (o[3] === true) { buys++; buyVol += u ? bv : o[2]; } else { if (o[3] === false) sells++; buyVol += bv; } }
    let top = 0; for (const v of by.values()) if (v > top) top = v;
    return { vol_usd: Math.round(vol), buys, sells, buyers: by.size, top_buyer_share: buyVol > 0 && by.size ? +(top / buyVol).toFixed(4) : null, ...(compressed ? { compressed: true } : {}) };
  }
  /** exact USD volume in (x, t] from raw observations */
  volIn(x, t) { let v = 0; for (const [ts, , vol] of this.raw) if (ts > x && ts <= t) v += vol; return v; }
  /** the minute bar of minute m: live if one exists, else accepted back-fill */
  barAt(m) { return this.bars.get(m) ?? this.bf.get(m) ?? null; }
  /** completed minute bars with minute index in [m0, m1): live bars, and accepted back-fill for minutes with no live bar (hour-scale use only) */
  barsIn(m0, m1) { const out = []; for (const [m, b] of this.bars) if (m >= m0 && m < m1) out.push([m, b]); for (const [m, b] of this.bf) if (m >= m0 && m < m1 && !this.bars.has(m)) out.push([m, b]); return out.sort((a, b) => a[0] - b[0]); }
  buyersIn(m0, m1) { const s = new Set(); for (const [, b] of this.barsIn(m0, m1)) for (const u of b.buyers) s.add(u); return s.size; }
}
