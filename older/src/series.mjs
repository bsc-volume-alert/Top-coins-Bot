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
    this.anchor = null;     // [t, px] the last exact observation that aged out of `raw`: the price still standing for a coin that went quiet
    this.patched = [];      // global gaps re-filled for this coin from back-fill bars: [a, b]
    this.pend = false;      // the coin's data was lost and no valid observation has arrived since: history restarts at the NEXT observation, not at the loss
    this.mrg = new WeakMap(); // raw entry → { lo, hi, t1, p0 } (p0 = its own first price): an entry that absorbed later observations of its own second (RAW_CAP) keeps their extremes and the last time
    this.own = [];          // THIS coin's own unusable-price intervals [a, b|null]: e.g. a boost quarantine, from the estimated state to the confirming swap
    this.lastPx = null; this.lastT = null; this.prevPx = null; this.prevT = null;
  }
  startLive(t) { if (this.histFrom === null || this.histFrom > t) this.histFrom = t; if (this.obsFrom === null || this.obsFrom > t) this.obsFrom = t; }
  /** this coin's own data was lost at t (lost events, a hole in the samples, a new pool): nothing before t is continuous — and
   *  nothing is known from t until the next valid observation either. LOSS and RECOVERY are different moments (sixth review, A):
   *  history restarts provisionally at t and is moved to the first observation that actually arrives (see add). */
  restartAt(t) { this.histFrom = t; this.obsFrom = t; this.anchor = null; this.own = []; this.pend = true; }
  /** this coin's price is unusable from t (its state is an estimate — a boost not yet confirmed by a swap): recorded as a break */
  breakOpen(t) { const g = this.own[this.own.length - 1]; if (g && g[1] === null) return false; this.own.push([t, null]); return true; }
  /** …and usable again from t (the confirming swap). The interval stays on record: no window or carried price may span it. */
  breakClose(t) { const g = this.own[this.own.length - 1]; if (!g || g[1] !== null) return false; g[1] = Math.max(t, g[0]); return true; }
  ownGapsIn(x, t) { return this.own.filter(([a, b]) => (b === null ? Infinity : b) > x && a < t); }
  /** THE continuity test for exact data: were this coin's exact observations unbroken over [a, b]? True only if exact observation
   *  was already running at a, no feed or SOL/USD outage touches [a, b], and none of the coin's own breaks does. Everything that
   *  needs exact data uses this one test: seconds-scale windows, fresh crossings, candle completeness, and — new — every price
   *  CARRIED from an earlier moment to a later one (the carry must be continuous from the price's own time to where it is used). */
  continuous(a, b) { return this.obsFrom !== null && this.obsFrom <= a && this.cov.gapsIn(a, b).length === 0 && this.ownGapsIn(a, b).length === 0; }
  obsCovered(x, t) { return this.continuous(x, t); }
  /** an EXACT WINDOW [x, t] (FAST, SECOND-WAVE, fresh crossings): unbroken exact observation over it AND a price already standing
   *  at x — an exact observation at or before x, carried to x without a break. Observations that only begin somewhere inside the
   *  window (after a loss, a reconnection, a start-up) do not make it exact: its starting price, and so its low, would be unknown.
   *  A start that falls inside a second whose observations were merged (RAW_CAP) is not exact either (priceAt answers "not known"). */
  exactWindow(x, t) { return this.continuous(x, t) && this.priceAt(x, true) !== null; }
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
    if (this.pend) { this.pend = false; if (t > this.histFrom) this.histFrom = t; if (t > this.obsFrom) this.obsFrom = t; } // recovery: history starts at the first observation after the loss
    const r = this.raw, n = r.length, sec = Math.floor(t), fresh = isBuy === true && user ? [t, px, volUsd, isBuy, user] : [t, px, volUsd, isBuy]; // user: one wallet, or [[wallet, usd]…] when a transaction has several buyers
    if (n >= RAW_CAP && n >= 2 && Math.floor(r[n - 1][0]) === sec && Math.floor(r[n - 2][0]) === sec) {
      // COMPRESSION (RAW_CAP reached; sixth review, C). The NEWEST observation always stays its own exact entry. What is merged
      // is the one before it, into the earlier entry of the same second — and that entry keeps the PRICE PATH a decision needs:
      // the lowest and highest price it absorbed, its first time (entry[0]) and its last time (t1), with the last price as its
      // price. Volume is summed and every buyer kept with its own volume (also through a buy → sell → buy second). What is lost
      // is the order of prices inside that second and the exact transaction counts: measurement windows over it are flagged
      // `compressed`, and an exact window that would START inside it is refused (exactWindow). At most two entries per second
      // are kept beyond the cap, so memory stays bounded.
      const y = r[n - 2], z = r[n - 1], m = this.mrg.get(y) || { lo: y[1], hi: y[1], t1: y[0], p0: y[1] };
      const buyers = (o) => (Array.isArray(o[4]) ? o[4] : (o[3] === true && typeof o[4] === "string" ? [[o[4], o[2]]] : [])), all = [...buyers(y), ...buyers(z)]; // buyers already merged stay, whatever sides followed
      if (z[1] < m.lo) m.lo = z[1]; if (z[1] > m.hi) m.hi = z[1]; m.t1 = z[0]; this.mrg.set(y, m);
      y[1] = z[1]; y[2] += z[2]; if (y[3] !== z[3]) y[3] = null; y[4] = all.length ? all : null; y[5] = true; this.compT = t;
      r[n - 1] = fresh;
    } else r.push(fresh);
    const m = Math.floor(t / 60); let b = this.bars.get(m);
    if (!b) { b = { o: px, h: px, l: px, c: px, v: 0, nb: 0, ns: 0, buyers: EMPTY, lowT: t }; this.bars.set(m, b); }
    if (px > b.h) b.h = px; if (px < b.l) { b.l = px; b.lowT = t; } b.c = px; b.v += volUsd;
    if (isBuy === true) { b.nb++; if (user) for (const u of typeof user === "string" ? [user] : user.map((x) => x[0])) { if (b.buyers.size >= BUYERS_PER_BAR_CAP) break; if (b.buyers === EMPTY) b.buyers = new Set(); b.buyers.add(u); } } else if (isBuy === false) b.ns++;
  }
  prune(now) {
    const cut = now - RAW_KEEP_S; let i = 0; while (i < this.raw.length && this.raw[i][0] < cut) i++;
    // the newest observation leaving the buffer is kept as the ANCHOR: for a coin that then goes quiet for hours (its bars pruned
    // too) it is still the exact price standing, so the wake-up trade is measured against it and not against nothing
    if (i) { const a = this.raw[i - 1]; this.anchor = [this.mrg.get(a)?.t1 ?? a[0], a[1]]; this.raw.splice(0, i); } // a merged entry's price is its LAST one: the anchor carries that time
    const ucut = now - BUYER_RAW_KEEP_S; for (const o of this.raw) { if (o[0] >= ucut) break; if (o.length > 4) o.length = 4; } // buyer wallets are only read for the last 5 minutes
    const mc = Math.floor((now - BAR_KEEP_S) / 60), bc = Math.floor((now - BUYERS_KEEP_S) / 60);
    // buyer wallets are only read for the last 15 minutes (features): older bars keep the COUNT and release the wallet list (memory)
    for (const [m, b] of this.bars) { if (m < mc) this.bars.delete(m); else if (m < bc && b.buyers !== EMPTY) { b.nbuyers = b.buyers.size; b.buyers = EMPTY; } }
    for (const m of this.bf.keys()) if (m < mc) this.bf.delete(m);
    if (this.own.length && this.own[0][1] !== null && this.own[0][1] < now - BAR_KEEP_S - 3600) this.own = this.own.filter(([, b]) => b === null || b >= now - BAR_KEEP_S - 3600);
  }
  /** is [x, t] fully known for this coin?
   *  strict = EXACT observations only: continuous since before x (back-fill does not count, even at start-up) and no outage,
   *  repaired or not. Used for fresh crossings and the seconds-scale FAST / SECOND-WAVE windows.
   *  non-strict = hour-scale: history (live or accepted back-fill) reaches back to x, and every outage inside was repaired. */
  covered(x, t, strict = false) {
    if (strict) return this.exactWindow(x, t);
    if (this.histFrom === null || this.histFrom > x) return false;
    for (const [a, b] of this.cov.gapsIn(x, t)) if (!this.patched.some(([pa, pb]) => pa <= a && pb >= b)) return false;
    if (this.ownGapsIn(x, t).length) return false; // the coin's own breaks are never repaired by back-fill
    return true;
  }
  /** a PRICE window [x, t] for hour-scale use (lows, highs, a price a while ago): covered history AND a price known at x.
   *  Coverage alone says no trade was missed; it does not say what the price WAS before the first observation inside the
   *  window (after a start-up, a reconnection or a long silence). Without a starting price the window's low and high are
   *  unknown, so nothing is decided on it (seventh review, 3). Volume windows keep using covered(): no trade missed = volume known. */
  priced(x, t) { return this.covered(x, t) && this.priceAt(x) !== null; }
  /** last price at or before t. Exact sources first: an exact observation; else the later of the last completed LIVE bar's close
   *  and the anchor (the last exact observation that aged out of the buffer); else the last exact price if older. exact = false (hour-scale use) also considers accepted back-fill: a back-filled close of a later
   *  minute is newer information (a repaired outage, or history before the live start) and wins — an older observation is never
   *  preferred over a newer known close. exact = true never returns anything that came from back-fill. */
  priceAt(t, exact = false) {
    // s0 = the earliest moment the candidate's price can date from (an observation: its own time; a bar: the START of its minute)
    let r = null; for (let i = this.raw.length - 1; i >= 0; i--) if (this.raw[i][0] <= t) { const o = this.raw[i], m = this.mrg.get(o);
      // a merged entry holds prices from o[0] to m.t1; asked for a moment INSIDE it, its last price would be a price from later than t:
      // exact use answers "not known"; hour-scale use accepts the sub-second imprecision
      // exact use answers its FIRST price at exactly its first time, "not known" in between; hour-scale use accepts the sub-second imprecision
      if (m && m.t1 > t && exact) { if (t !== o[0]) return null; r = { px: m.p0, t: o[0], src: "obs", s0: o[0] }; break; }
      r = { px: o[1], t: m ? Math.min(m.t1, t) : o[0], src: "obs", s0: o[0] }; break; }
    if (!r) { let best = null; for (const m of this.bars.keys()) if ((m + 1) * 60 <= t && (best === null || m > best)) best = m; if (best !== null) r = { px: this.bars.get(best).c, t: best * 60 + 59, src: "bar", s0: best * 60 };
      if (this.anchor && this.anchor[0] <= t && (!r || this.anchor[0] > r.t)) r = { px: this.anchor[1], t: this.anchor[0], src: "anchor", s0: this.anchor[0] }; }
    if (!r && this.lastT !== null && this.lastT <= t && !this.lastIsBf) r = { px: this.lastPx, t: this.lastT, src: "last", s0: this.lastT };
    if (!exact && this.bf.size) {
      let bb = null; for (const m of this.bf.keys()) if ((m + 1) * 60 <= t && (bb === null || m > bb)) bb = m;
      // a completed back-filled minute that ENDS after the exact observation holds that minute's last trade: newer or equal information
      if (bb !== null && (!r || (bb + 1) * 60 > r.t)) r = { px: this.bf.get(bb).c, t: bb * 60 + 59, src: "backfill", s0: bb * 60 };
    }
    if (!r && !exact && this.lastT !== null && this.lastT <= t) r = { px: this.lastPx, t: this.lastT, src: "last", s0: this.lastT };
    if (!r) return null;
    // PROVENANCE: a price is carried forward from its own time to t only across a stretch we really know — for exact use, an
    // unbroken stretch of exact observation (no outage, no loss of the coin's data, no quarantine); for hour-scale use, covered
    // history (an outage must have been repaired). An older candidate would span the same break, so there is no fallback: the
    // answer is "not known". Age alone never disqualifies a price: verified silence can be arbitrarily long.
    if (!(exact ? this.continuous(r.s0, t) : this.covered(r.s0, t))) return null;
    return { px: r.px, t: r.t, src: r.src };
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
    for (const o of this.raw) { const ts = o[0]; if (ts < x) continue; if (ts >= t) break; const m = this.mrg.get(o), px = m ? (k === "l" ? m.lo : m.hi) : o[1]; // a merged entry answers with the extreme it absorbed
      if (!best || better(px, best.px)) best = { px, t: ts }; }
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
  /** USD volume of the exact observations after x (walks back from the newest: cheap on a busy coin).
   *  null = NOT KNOWN: x falls inside a second whose observations were merged (RAW_CAP) — that entry's volume lies on both
   *  sides of x and can no longer be split, so the caller must not decide on it (seventh review, 4). */
  volSince(x) { let v = 0; for (let i = this.raw.length - 1; i >= 0; i--) { const o = this.raw[i]; if (o[0] > x) { v += o[2]; continue; } const m = this.mrg.get(o); return m && m.t1 > x ? null : v; } return v; }
  volIn(x, t) { let v = 0; for (const [ts, , vol] of this.raw) if (ts > x && ts <= t) v += vol; return v; }
  /** was the WHOLE of minute m observed exactly? (exact observations already running at its start, and no outage inside it) */
  liveComplete(m) { return this.continuous(m * 60, m * 60 + 60); } // the same continuity test as everything else: outages, the coin's own breaks (quarantine), loss of its data
  /** THE authoritative candle of minute m, chosen by coverage — one rule for every candle reader (hour-scale use only):
   *    a fully observed live minute            → the live candle (back-fill never replaces complete live data)
   *    a PARTIAL live minute (cut by an outage, or begun before exact observation started) with an accepted back-filled candle
   *                                            → the back-filled candle: it covers the whole minute
   *    a partial live minute with no back-fill → the live fragment (all that is known)
   *    no live candle                          → the accepted back-filled candle, if any
   *  The two are never added together: a repaired whole-minute candle already contains the trades of the live fragment. */
  barAt(m) { const lv = this.bars.get(m), bf = this.bf.get(m); if (!lv) return bf ?? null; if (!bf) return lv; return this.liveComplete(m) ? lv : bf; }
  /** authoritative candles with minute index in [m0, m1), in time order */
  barsIn(m0, m1) { const out = [], seen = new Set(); for (const m of this.bars.keys()) if (m >= m0 && m < m1) { out.push([m, this.barAt(m)]); seen.add(m); } for (const [m, b] of this.bf) if (m >= m0 && m < m1 && !seen.has(m)) out.push([m, b]); return out.sort((a, b) => a[0] - b[0]); }
  buyersIn(m0, m1) { const s = new Set(); for (const [, b] of this.barsIn(m0, m1)) for (const u of b.buyers) s.add(u); return s.size; }
}
