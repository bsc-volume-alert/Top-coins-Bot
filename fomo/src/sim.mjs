// Exit replay (owner, 22 Oct 2026 20:07 UK): every book entry is replayed on the stored 10-s price ticks under a grid of exit rules, at real
// costs, so "which stop / break-even / take-profit" is answered on the real paths rather than argued. Read-only; nothing trades.
import { db, q, nowS } from "./db.mjs";
import { realCost } from "./score.mjs";
import { CFG } from "./config.mjs";
const ticks = db.prepare(`SELECT ts, usd FROM prices WHERE mint=? AND ts>=? AND ts<=? ORDER BY ts`);
const entries = db.prepare(`SELECT id, wallet, mint, symbol, entry_ts, entry_px, entry_mc, e_xstart FROM trades WHERE wallet IN ('FF5','FF2','FF5e','FF2e') AND entry_ts>=? ORDER BY entry_ts`);
/** One rule: stop (fraction, e.g. 0.15), be (arm break-even stop once +be seen; null = never), tp (sell all at tp; null = none), half (sell half at `half` then trail the rest), trail (fraction below peak; null = none), hold (s). */
export function replay(path, r) {
  // path = [{ts, usd}] from entry; returns the multiple sold at (position-weighted) and the reason
  const e = path[0].usd; let peak = 1, stop = -r.stop, beArmed = false, halfDone = false, halfMult = 0, prevLow = 1;
  for (let i = 1; i < path.length; i++) {
    const m = path[i].usd / e; const t = path[i].ts - path[0].ts;
    if (m > peak) peak = m;
    if (r.be != null && !beArmed && m >= 1 + r.be) { beArmed = true; stop = Math.max(stop, 0); }
    if (r.trail != null && (r.trailFrom == null || peak >= r.trailFrom)) stop = Math.max(stop, peak * (1 - r.trail) - 1);
    // stop (two consecutive ticks at or under the level, as the live engine does — a single bad tick does not fill)
    const low = Math.max(m, prevLow); prevLow = m;
    if (low <= 1 + stop) { const x = halfDone ? (halfMult + m) / 2 : m; return { x, reason: beArmed && stop >= 0 ? "break-even" : r.trail != null && stop > -r.stop ? "trail" : "stop", peak, t }; }
    if (r.half != null && !halfDone && m >= r.half) { halfDone = true; halfMult = r.half; stop = Math.max(stop, 0); continue; }
    if (r.tp != null && m >= r.tp) { const x = halfDone ? (halfMult + r.tp) / 2 : r.tp; return { x, reason: "target", peak, t }; }
    if (t >= (r.hold || CFG.MAX_HOLD_S)) { const x = halfDone ? (halfMult + m) / 2 : m; return { x, reason: "time", peak, t }; }
  }
  const last = path[path.length - 1].usd / e; return { x: halfDone ? (halfMult + last) / 2 : last, reason: "open", peak, t: path[path.length - 1].ts - path[0].ts, open: true };
}
const GRID = [
  { name: "book now: stop −40% trail 40%", stop: 0.4, trail: 0.4 },
  { name: "owner: stop −15%, BE at +20%, all out 1.3x", stop: 0.15, be: 0.2, tp: 1.3 },
  { name: "owner: stop −15%, BE at +20%, all out 1.5x", stop: 0.15, be: 0.2, tp: 1.5 },
  { name: "owner: stop −15%, BE at +20%, all out 2x", stop: 0.15, be: 0.2, tp: 2 },
  { name: "stop −15%, BE at +20%, half out 1.3x, rest trails 40%", stop: 0.15, be: 0.2, half: 1.3, trail: 0.4 },
  { name: "stop −15%, BE at +20%, half out 1.5x, rest trails 40%", stop: 0.15, be: 0.2, half: 1.5, trail: 0.4 },
  { name: "stop −20%, BE at +20%, all out 1.3x", stop: 0.2, be: 0.2, tp: 1.3 },
  { name: "stop −10%, BE at +15%, all out 1.3x", stop: 0.1, be: 0.15, tp: 1.3 },
  { name: "stop −15%, all out 1.2x", stop: 0.15, tp: 1.2 },
  { name: "stop −20%, all out 1.2x", stop: 0.2, tp: 1.2 },
  { name: "stop −15%, trail 20% from peak", stop: 0.15, trail: 0.2 },
  { name: "stop −15%, trail 30% from peak", stop: 0.15, trail: 0.3 },
  { name: "stop −15%, BE at +20%, trail 30% from peak", stop: 0.15, be: 0.2, trail: 0.3 },
  { name: "stop −15%, trail 40%", stop: 0.15, trail: 0.4 },
  { name: "stop −25%, trail 40%", stop: 0.25, trail: 0.4 },
  { name: "stop −40%, all out 1.3x", stop: 0.4, tp: 1.3 },
  { name: "stop −40%, all out 2x", stop: 0.4, tp: 2 },
];
export function simulate({ since = nowS() - 36 * 3600, firstOnly = false, xmax = null } = {}) {
  let rows = entries.all(since); const seen = new Set();
  rows = rows.filter((r) => { if (xmax != null && r.e_xstart != null && r.e_xstart > xmax) return false; if (firstOnly) { if (seen.has(r.mint)) return false; seen.add(r.mint); } return true; });
  const paths = rows.map((r) => ({ r, path: [{ ts: r.entry_ts, usd: r.entry_px }, ...ticks.all(r.mint, r.entry_ts + 1, r.entry_ts + CFG.MAX_HOLD_S + 60)] })).filter((p) => p.path.length > 2);
  const stake = Number(process.env.FF2_STAKE || 0.1);
  const out = GRID.map((g) => { let sol = 0, won = 0, n = 0, open = 0, stops = 0, targets = 0, trails = 0, bes = 0; const worst = []; for (const p of paths) { const s = replay(p.path, g); if (s.open) { open++; continue; } n++; const rc = realCost(s.x); sol += rc * stake; if (s.x > 1.07) won++; if (s.reason === "stop") stops++; else if (s.reason === "target") targets++; else if (s.reason === "trail") trails++; else if (s.reason === "break-even") bes++; worst.push({ sym: p.r.symbol, x: +s.x.toFixed(2), rc: +(rc * 100).toFixed(0) }); } worst.sort((a, b) => a.rc - b.rc); return { rule: g.name, n, open, won, sol: +sol.toFixed(3), per: n ? +((sol / stake / n) * 100).toFixed(1) : null, stops, targets, trails, bes, worst3: worst.slice(0, 3) }; });
  out.sort((a, b) => b.sol - a.sol);
  return { entries: rows.length, withPath: paths.length, firstOnly, xmax, rules: out };
}
