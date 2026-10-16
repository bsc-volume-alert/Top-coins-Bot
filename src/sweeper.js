// v0.15.3: position sweeper. Closes any paper trade past its hold limit using the REAL current price,
// independent of in-memory state — so restarts (which kill close timers) and dead tokens (no trades → no exit
// triggers) no longer leave trades open forever and flatter the closed-only statistics.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { rpc } from "./rpc.js";
import { solUsdCached } from "./price.js";
export const sw = { runs: 0, closed: 0, noprice: 0, rpcUsed: 0 };
const fails = new Map(); // id -> attempts
const CURVE_HOLD = () => CFG.MAX_HOLD_MIN * 60, MOM_HOLD = () => CFG.MOM_MAX_HOLD_MIN * 60;
const qOpen = db.prepare(`SELECT p.id, p.strategy, p.mint, p.entry_ts, p.entry_price, p.peak_mult, p.x_tp, p.x_tsl40, p.x_tsl60, p.x_tsl80, p.x_cluster, p.x_grad, p.x_half60, p.x_twophase, p.x_ladder, p.x_levels, p.x_m1, p.x_m1vol, p.x_volstop, p.peak_mc, t.bonding_curve, t.graduated
  FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.closed=0 AND COALESCE(p.invalid,0)=0 AND p.entry_ts < ? ORDER BY p.entry_ts LIMIT ?`);
const qClose = db.prepare(`UPDATE paper_trades SET x_tp=?, x_tsl40=?, x_tsl60=?, x_tsl80=?, x_cluster=?, x_grad=?, x_half60=?, x_twophase=?, x_ladder=?, x_levels=?, x_m1=?, x_m1vol=?, x_volstop=?, x_time=?, exit_ts=?, exit_mc=?, exit_price=?, exit_reason=?, pnl_pct=?, closed=1, peak_mult=MAX(COALESCE(peak_mult,1),?) WHERE id=? AND closed=0`);
const qStops = db.prepare(`UPDATE paper_trades SET x_tp15=COALESCE(x_tp15,?), x_tsl25=COALESCE(x_tsl25,?), x_t15s25=COALESCE(x_t15s25,?), x_t15s60=COALESCE(x_t15s60,?), x_t2s25=COALESCE(x_t2s25,?), x_t2s60=COALESCE(x_t2s60,?), x_combo=COALESCE(x_combo,?), x_flow=COALESCE(x_flow,?), x_t15s40=COALESCE(x_t15s40,?), x_t2s40=COALESCE(x_t2s40,?), x_flow4=COALESCE(x_flow4,?), x_flow4ff=COALESCE(x_flow4ff,COALESCE(x_flow4,?)), x_split=COALESCE(x_split,?), split_branch=COALESCE(split_branch,'sweep') WHERE id=?`); // v0.18.17: flow4ff falls back to flow4 on swept trades
const qNoPrice = db.prepare(`UPDATE paper_trades SET closed=1, exit_ts=?, exit_reason='sweep-noprice' WHERE id=? AND closed=0`);

function parseCurve(b64) { // pump.fun BondingCurve: disc(8) vtok u64, vsol u64, rtok u64, rsol u64, supply u64, complete u8
  const b = Buffer.from(b64, "base64"); if (b.length < 49) return null;
  const vtok = Number(b.readBigUInt64LE(8)), vsol = Number(b.readBigUInt64LE(16)), complete = b[48] === 1;
  if (!(vtok > 0)) return { complete, price: null };
  return { complete, price: (vsol / 1e9) / (vtok / 1e6) };
}
async function dexPrice(mint) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana" && p.quoteToken?.symbol === "SOL");
  if (!pairs.length) return null;
  const best = pairs.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
  const p = Number(best.priceNative); return p > 0 ? p : null;
}
async function currentPrice(row) {
  if (!row.graduated && row.bonding_curve) {
    try { sw.rpcUsed++; const r = await rpc("getAccountInfo", [row.bonding_curve, { encoding: "base64" }]); const c = parseCurve(r?.value?.data?.[0] || ""); if (c && !c.complete && c.price) return c.price; } catch {}
  }
  try { return await dexPrice(row.mint); } catch { return null; }
}
function finals(r, mult) {
  const hit2 = r.x_tp != null || Math.max(r.peak_mult || 1, mult) >= 2, hit3 = Math.max(r.peak_mult || 1, mult) >= 3;
  return {
    tp: r.x_tp ?? (mult >= 2 ? 2 : mult), tsl40: r.x_tsl40 ?? mult, tsl60: r.x_tsl60 ?? mult, tsl80: r.x_tsl80 ?? mult, cluster: r.x_cluster ?? mult, grad: r.x_grad ?? null,
    half60: r.x_half60 ?? (hit2 ? 1 + 0.5 * mult : mult), twophase: r.x_twophase ?? (hit2 ? 1 + 0.5 * mult : mult),
    ladder: r.x_ladder ?? ((hit2 ? 0.5 : 0) + (hit3 ? 0.75 : 0) + (1 - (hit2 ? 0.25 : 0) - (hit3 ? 0.25 : 0)) * mult),
    levels: r.x_levels ?? mult, m1: r.x_m1 ?? mult, m1vol: r.x_m1vol ?? mult, volstop: r.x_volstop ?? mult, time: mult,
  };
}
export async function sweep(batch = CFG.SWEEP_BATCH) {
  sw.runs++;
  const now = Math.floor(Date.now() / 1000);
  const rows = qOpen.all(now - Math.min(CURVE_HOLD(), MOM_HOLD()) - 120, batch)
    .filter((r) => now - r.entry_ts > (["early", "confirm", "secondwave"].includes(r.strategy) ? CURVE_HOLD() : MOM_HOLD()) + 120);
  for (const r of rows) {
    const px = await currentPrice(r);
    if (!(px > 0) || !(r.entry_price > 0)) {
      const n = (fails.get(r.id) || 0) + 1; fails.set(r.id, n);
      if (n >= CFG.SWEEP_MAX_FAILS) { qNoPrice.run(now, r.id); fails.delete(r.id); sw.noprice++; }
      continue;
    }
    const mult = px / r.entry_price, v = finals(r, mult), mc = px * CFG.TOTAL_SUPPLY * solUsdCached();
    qClose.run(v.tp, v.tsl40, v.tsl60, v.tsl80, v.cluster, v.grad, v.half60, v.twophase, v.ladder, v.levels, v.m1, v.m1vol, v.volstop, v.time, now, mc, px, "sweep", (mult - 1) * 100, mult, r.id);
    { const pk = Math.max(r.peak_mult || 1, mult), h2 = pk >= 2; try { qStops.run(pk >= 1.5 ? 1.5 : mult, mult, pk >= 1.5 ? 1.5 : mult, pk >= 1.5 ? 1.5 : mult, h2 ? 2 : mult, h2 ? 2 : mult, h2 ? 1 + 0.5 * mult : mult, mult, pk >= 1.5 ? 1.5 : mult, h2 ? 2 : mult, pk >= 4 ? 4 : mult, pk >= 4 ? 4 : mult, pk >= 4 ? 4 : mult, r.id); } catch {} } // v0.18.3: no NULL exits on swept trades
    fails.delete(r.id); sw.closed++;
  }
  return rows.length;
}
export function startSweeper() {
  setTimeout(() => sweep().catch((e) => console.error("[sweep]", e.message)), 20_000);
  setInterval(() => sweep().catch((e) => console.error("[sweep]", e.message)), CFG.SWEEP_EVERY_MIN * 60_000);
}
