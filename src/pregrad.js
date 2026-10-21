// v0.18.163 book PG — pre-graduation (owner, 20 Oct 18:45 UK). GR's edge is fast, thin graduations, and every such coin races up the curve first.
// PG buys on the CURVE when a coin under 150 s old reaches $32–40K market cap (graduation is at ~$42K), with 272 or fewer outside buyers, the creator
// not having bought the whole curve. The 24-h launch file: 88 coins a day at $30–41K at 60 s; 53% went on to graduate (+27% at 5 min), 47% stalled
// (−26%); 43% touched 2x within 30 min. Paper only. Exits recorded on the same trade: x_t2s40 (2x or −40%, "PG-stop", the headline),
// x_t2n30 (2x or 30 min, no stop, "PG-hold"), x_h3 (sold at 3 min, GR's exit).
import { on } from "./launch-monitor.js";
import { OFF_KINDS } from "./config.js";
import { lifeSnap } from "./lifecycle.js";
import { openCopy } from "./copytrade.js";
const PG = { MAX_AGE_S: 150, MIN_MC: 32_000, MAX_MC: 40_000, MAX_BUYERS: 272, MAX_DEV_SOL: 80 };
const done = new Set(); export const pg = { fired: 0 };
on("trade", (t, tr) => {
  if (done.has(t.mint) || t.graduated || !(tr.price > 0)) return;
  const ts = tr.ts || Math.floor(Date.now() / 1000), age = ts - (t.ts || ts); if (age > PG.MAX_AGE_S) return;
  const mc = t.lastMc; if (!(mc >= PG.MIN_MC && mc <= PG.MAX_MC)) return;
  if (!t.bundle || (t.bundle.devBuy ?? 0) >= PG.MAX_DEV_SOL) return; // bundle known at +4 s; whole-curve creators excluded
  const L = lifeSnap(t.mint); const buyers = L?.buyers ?? null; if (buyers != null && buyers > PG.MAX_BUYERS) { done.add(t.mint); return; }
  done.add(t.mint); if (done.size > 20000) done.delete(done.values().next().value); pg.fired++;
  if (OFF_KINDS.has("pg")) return; // v0.18.179
  try { openCopy("pg", `${age}s $${Math.round(mc / 1000)}K`, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, mc, ts, { ageS: age, venue: "pump", noExec: true, pass: true, buyers, wall0: Date.now(), blockTs: ts }); } catch (e) { console.error("[pg]", e.message); }
});
