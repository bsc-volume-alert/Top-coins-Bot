// v0.18.157 book K — "keeps going" (owner, 20 Oct 17:05 UK: "if the narrative is strong the volume will continue"; the 24-h launch file:
// of 2,018 coins at $5–50K five minutes in, 21 reached $200K (1%); of the 40 that had DOUBLED by 15 minutes, 7 did (17.5%)).
// Rule: a coin that was $10–50K with 50+ buyers at its 5-minute checkpoint, bought the moment its market cap reaches 2x that level
// before 15 minutes. Paper only. Headline exit x_h2t40 (sell half at 2x, trail the rest 40%, −40% stop); x_tsl40 and x_h5 alongside.
import { onSwap } from "./pumpswap.js";
import { on, live } from "./launch-monitor.js";
import { lifeSnap } from "./lifecycle.js";
import { q } from "./db.js";
import { openCopy } from "./copytrade.js";
const K = { MIN_MC5: 10_000, MAX_MC5: 50_000, MIN_BUYERS5: 50, MULT: 2.0, FROM_S: 300, BY_S: 900 };
const done = new Set(); export const kp = { fired: 0, checked: 0 };
function check(mint, price, mc, ts, venue) {
  if (done.has(mint) || !(price > 0) || !(mc > 0)) return;
  const L = lifeSnap(mint); if (!L?.cp5) return;
  const age = ts - L.createTs; if (age < K.FROM_S || age > K.BY_S) return;
  const c = L.cp5; if (!(c.mc >= K.MIN_MC5 && c.mc <= K.MAX_MC5 && c.buyers >= K.MIN_BUYERS5)) { done.add(mint); return; } // never qualifies - stop looking
  kp.checked++; if (mc < K.MULT * c.mc) return;
  done.add(mint); kp.fired++; if (done.size > 20000) done.delete(done.values().next().value);
  const t = live.get(mint), meta = t || q.tokenMeta.get(mint) || {};
  try { openCopy("k", `${Math.round(age / 60)}m ${(mc / c.mc).toFixed(1)}x`, mint, meta.name || mint.slice(0, 8), meta.symbol || "", price, mc, ts, { ageS: age, venue, noExec: true, pass: true, buyers: L.buyers, mc5: c.mc, buyers5: c.buyers, b5: c.b ?? null, s5: c.sl ?? null }); } catch (e) { console.error("[k]", e.message); }
}
on("trade", (t, tr) => check(t.mint, tr.price, t.lastMc, tr.ts || Math.floor(Date.now() / 1000), "pump"));
onSwap((tr) => check(tr.mint, tr.price, tr.mc, tr.ts || Math.floor(Date.now() / 1000), "pumpswap"));
