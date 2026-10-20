// v0.18.155 book R — "revival" (owner, 20 Oct 09:07 UK: Pokémon went from $50K to $2.1M a day after launch; "maybe a double in market cap is the signal").
// A coin at least 6 h old whose pool price reaches 2x its lowest 5-min close of the last 6 h, without having been 2x in the last 2 h (a fresh break).
// Paper only, one entry per coin per 2 h. The 20 Oct back-test on 1,337 coins' full 5-min history: 175 such events, -4% to -14% a trade at real
// costs depending on the exit, +17.7x on Pokémon alone - so this book RECORDS the idea from today; it is not a trade until it has earned one.
import { onSwap } from "./pumpswap.js";
import { q } from "./db.js";
import { openCopy } from "./copytrade.js";
const R = { MIN_AGE_S: 6 * 3600, LOOK_S: 6 * 3600, BREAK_S: 2 * 3600, MULT: 2.0, COOL_S: 2 * 3600, MAX_MC: 500_000 };
const H = new Map(); // mint -> { ct, name, symbol, b: [[bucket, close]], cool }
export const rv = { fired: 0, tracked: 0 };
onSwap((tr) => {
  const m = tr.mint, now = tr.ts || Math.floor(Date.now() / 1000); if (!(tr.price > 0) || !(tr.mc > 0)) return;
  let h = H.get(m);
  if (!h) { const meta = q.tokenMeta.get(m); if (!meta?.create_ts) return; h = { ct: meta.create_ts, name: meta.name, symbol: meta.symbol, b: [], cool: 0 }; H.set(m, h); rv.tracked = H.size; if (H.size > 20000) H.delete(H.keys().next().value); }
  const bk = Math.floor(now / 300) * 300, last = h.b[h.b.length - 1];
  if (last && last[0] === bk) last[1] = tr.price; else { h.b.push([bk, tr.price]); while (h.b.length && h.b[0][0] < now - R.LOOK_S) h.b.shift(); }
  if (now - h.ct < R.MIN_AGE_S || now < h.cool || tr.mc > R.MAX_MC) return;
  const win = h.b.filter((x) => x[0] < bk); if (win.length < 6) return;
  let lo = Infinity, hi = 0; for (const x of win) { if (x[1] < lo) lo = x[1]; if (x[0] >= now - R.BREAK_S && x[1] > hi) hi = x[1]; }
  if (!(lo > 0) || tr.price < R.MULT * lo || hi >= R.MULT * lo) return;
  h.cool = now + R.COOL_S; rv.fired++;
  try { openCopy("rev", `${Math.round((now - h.ct) / 3600)}h ${(tr.price / lo).toFixed(1)}x`, m, h.name || m.slice(0, 8), h.symbol || "", tr.price, tr.mc, now, { ageS: now - h.ct, venue: "pumpswap", noExec: true, pass: true }); } catch (e) { console.error("[rev]", e.message); }
});
