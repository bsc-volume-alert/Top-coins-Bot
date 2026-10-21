// v0.18.9 momentum re-entry variant (silent paper strategy "momre"). After a core momentum entry, the coin is watched as if it were
// traded by the "sell at 1.5x, cut at -25%" rule. Whenever that rule would be flat (took 1.5x, or got stopped) and the coin is STILL
// a core coin — 5m volume >= VOL5M_USD, buyers outweigh sellers, under the paper cap — and price has reclaimed the exit price,
// a new paper position is opened (max MOM_RE_MAX per coin, at least MOM_RE_GAP_S apart). Each re-entry carries the full exit set,
// so the summary shows whether "buy and sell on the retraces" beats entering once.
import { CFG, OFF_KINDS } from "./config.js"; // v0.18.176 OFF_KINDS: the off-page books open nothing new
import { q } from "./db.js";
import { onSwap } from "./pumpswap.js";
import { solUsdCached } from "./price.js";
import { onCoreEntry } from "./momentum.js";
import { openCopy, positionsOf } from "./copytrade.js";

export const mr = { tracked: 0, reentries: 0 };
const W = new Map(); // mint -> {name, symbol, main:{entry,x}, w5:[], n, last:{px,ts}|null, flatSince, lastRe}
const exitOf = (entry, x) => (x.tp15 != null ? { px: entry * 1.5, kind: "tp" } : x.t15s25 != null ? { px: entry * x.t15s25, kind: "stop" } : null);

onCoreEntry(({ mint, name, symbol, pos }) => { W.set(mint, { name, symbol, main: pos, w5: [], n: 0, flat: null, lastRe: null, ts: pos.entryTs }); mr.tracked = W.size; });
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const [m, w] of W) { if (now - w.ts > CFG.MOM_MAX_HOLD_MIN * 60) { W.delete(m); continue; } while (w.w5.length && now - w.w5[0].ts > 300) w.w5.shift(); } mr.tracked = W.size; }, 60_000); // v0.18.21: time-trim
export const memStats = () => { let w5 = 0; for (const w of W.values()) w5 += w.w5.length; return { mints: W.size, w5 }; };

onSwap((tr) => {
  const w = W.get(tr.mint); if (!w) return;
  const now = tr.ts || Math.floor(Date.now() / 1000), usd = tr.sol * solUsdCached();
  w.w5.push({ ts: now, usd, b: tr.isBuy }); while (w.w5.length && now - w.w5[0].ts > 300) w.w5.shift();
  // which position is "current" under the 1.5x/-25 rule: the latest momre position if any, else the main momentum one
  const cur = w.lastRe ?? { entry: w.main.entry, x: w.main.x };
  const ex = exitOf(cur.entry, cur.x);
  if (!ex) { w.flat = null; return; }                       // still in a position
  if (!w.flat) { w.flat = { px: ex.px, ts: now, kind: ex.kind }; return; }
  if (w.n >= CFG.MOM_RE_MAX || now - w.flat.ts < CFG.MOM_RE_GAP_S) return;
  if (tr.price < w.flat.px) return;                         // must reclaim the exit price
  const v5 = w.w5.reduce((a, x) => a + x.usd, 0); if (v5 < CFG.VOL5M_USD) return;
  const bu = w.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = v5 - bu; if (su > 0 && bu / su < CFG.MOM_BS_MIN) return;
  if (tr.mc > CFG.MOM_PAPER_MC_CAP || tr.mc <= 0) return;
  if (OFF_KINDS.has("momre")) return; // v0.18.176 (owner go 21 Oct 13:50 UK): momre off — no re-entry position is opened (the watch itself is harmless)
  w.n++; mr.reentries++;
  const m = q.tokenMeta.get(tr.mint);
  try {
    openCopy("momre", `re${w.n}-after-${w.flat.kind}`, tr.mint, w.name, w.symbol, tr.price, tr.mc, now, { v5, venue: tr.venue, ageS: m?.create_ts ? now - m.create_ts : null, bs: su > 0 ? bu / su : null });
    const p = positionsOf(tr.mint).filter((x) => x.kind === "momre").at(-1);
    w.lastRe = p ? { entry: p.e.entry, x: p.e.x } : null; w.flat = null;
  } catch (e) { console.error("[momre]", e.message); }
});
