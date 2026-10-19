// v0.18.113 — the P5 data set (owner, 19 Oct 10:07 UK: "we need a full set of data again"). For every P5 trigger — taken or skipped by the
// filters — what the coin looked like before the trigger and what happened after, at fixed marks. Free: the feeds already see every trade.
//   before (early_json, written by the trigger): volume / buys / sells / unique buyers & sellers over the last 1, 2, 3 and 5 minutes;
//     the seconds before the trigger at which 30 / 40 / 50 / 80 SOL of buying was crossed and how many wallets had bought by then.
//   after (trace column, this file): at 10, 20, 30, 40, 50, 60 s and 2, 3, 5, 10 min — price multiple, SOL and USD bought and sold since entry,
//     unique buyers (and how many were new, i.e. had not bought in the 5 min before), unique sellers, biggest single sell, the interval's own
//     buys / sells, time to +10 / +20 / +30 / +50 SOL more buying after the trigger, and holder count / top-10 / top-20 at entry, 1, 5 and 10 min.
import { q } from "./db.js";
import { holdersNow, countHolders } from "./holders.js";
export const MARKS = [10, 20, 30, 40, 50, 60, 120, 180, 300, 600];
const LEVELS = [10, 20, 30, 50]; // SOL bought after the trigger
const HOLDER_MARKS = new Set([60, 300, 600]);
const T = new Map(); // mint -> [trace]
export const ptStats = { started: 0, marks: 0, holderCalls: 0 };
const round = (x, d = 2) => (x == null ? null : +Number(x).toFixed(d));

export function startTrace(id, mint, entryTs, entryPx, preBuyers = null, creator = null) {
  const tr = { id, mint, entryTs, entryPx, lastPx: entryPx, pre: preBuyers || new Set(), buyers: new Set(), newBuyers: new Set(), sellers: new Set(), bUsd: 0, sUsd: 0, bSol: 0, sSol: 0, maxSell: 0, n: 0,
    iv: { b: 0, s: 0, nb: new Set(), ns: new Set() }, marks: {}, lv: {}, h: {}, done: false, dirty: false, creator };
  const h0 = holdersNow(mint, creator); if (h0) tr.h[0] = snapH(h0); else countHolders(mint).then((n) => { if (n != null) { tr.h[0] = { ...(tr.h[0] || {}), n }; save(tr); } }).catch(() => {});
  const arr = T.get(mint) || []; arr.push(tr); T.set(mint, arr); ptStats.started++;
  save(tr);
  return tr;
}
const snapH = (h) => ({ n: h.holders, t10: round(h.top10, 1), t20: round(h.top20, 1), lg: round(h.largest, 2), dev: round(h.dev, 2) });
function save(tr) { tr.dirty = false; try { q.setTrace.run(JSON.stringify({ m: tr.marks, lv: tr.lv, h: tr.h, n: tr.n }), tr.id); } catch {} }
function snapshot(tr, m, ts) {
  tr.marks[m] = { x: round(tr.lastPx / tr.entryPx, 4), b: Math.round(tr.bUsd), s: Math.round(tr.sUsd), bs: round(tr.bSol), ss: round(tr.sSol), nb: tr.buyers.size, nn: tr.newBuyers.size, ns: tr.sellers.size, mx: Math.round(tr.maxSell), n: tr.n,
    ib: Math.round(tr.iv.b), is: Math.round(tr.iv.s), inb: tr.iv.nb.size, ins: tr.iv.ns.size };
  tr.iv = { b: 0, s: 0, nb: new Set(), ns: new Set() }; ptStats.marks++;
  if (HOLDER_MARKS.has(m)) { const h = holdersNow(tr.mint, tr.creator); if (h) tr.h[m] = snapH(h); else if (m !== 60) countHolders(tr.mint).then((n) => { if (n != null) { tr.h[m] = { ...(tr.h[m] || {}), n }; save(tr); } }).catch(() => {}); }
}
/** One trade on a coin we are tracing. Called once per trade (not per position). */
export function traceTick(mint, price, sol, usd, isBuy, wallet, ts) {
  const arr = T.get(mint); if (!arr) return;
  for (const tr of arr) {
    if (tr.done) continue;
    const since = ts - tr.entryTs; if (since < 0) continue;
    // marks the clock has passed before this trade: the state as it stood (price = last trade seen)
    for (const m of MARKS) if (since > m && tr.marks[m] == null) snapshot(tr, m, ts);
    if (since > 600) { tr.done = true; save(tr); continue; }
    tr.lastPx = price; tr.n++;
    const w = wallet && !String(wallet).startsWith("tx:") ? wallet : null;
    if (isBuy) { tr.bUsd += usd; tr.bSol += sol; tr.iv.b += usd; if (w) { tr.buyers.add(w); tr.iv.nb.add(w); if (!tr.pre.has(w)) tr.newBuyers.add(w); } for (const L of LEVELS) if (tr.lv[L] == null && tr.bSol >= L) tr.lv[L] = { t: since, w: tr.buyers.size }; }
    else { tr.sUsd += usd; tr.sSol += sol; tr.iv.s += usd; if (usd > tr.maxSell) tr.maxSell = usd; if (w) { tr.sellers.add(w); tr.iv.ns.add(w); } }
    let changed = false; for (const m of MARKS) if (since >= m && tr.marks[m] == null) { snapshot(tr, m, ts); changed = true; }
    if (changed) save(tr); else tr.dirty = true;
  }
  if (arr.every((t) => t.done)) T.delete(mint);
}
/** The paper position closed: keep tracing to 10 min (the data set does not care how the paper book exited); flush what we have. */
export function noteClose(id) { for (const arr of T.values()) for (const tr of arr) if (tr.id === id && tr.dirty) save(tr); }
/** Housekeeping: a coin that went silent still gets its marks (state unchanged) and is finished at 10 min. */
export function sweepTraces(now = Math.floor(Date.now() / 1000)) {
  for (const [mint, arr] of T) {
    for (const tr of arr) { if (tr.done) continue; const since = now - tr.entryTs; let ch = false; for (const m of MARKS) if (since > m + 5 && tr.marks[m] == null) { snapshot(tr, m, now); ch = true; } if (since > 605) { tr.done = true; ch = true; } if (ch || tr.dirty) save(tr); }
    if (arr.every((t) => t.done)) T.delete(mint);
  }
}
export const traceCount = () => { let n = 0; for (const a of T.values()) n += a.length; return n; };
