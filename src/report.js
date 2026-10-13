import "./env.js";
import { db } from "./db.js";
const h = 24 * 3600, now = Math.floor(Date.now() / 1000);
const r = (sql, ...p) => db.prepare(sql).get(...p);
console.log("== last 24h ==");
console.log("launches:", r(`SELECT COUNT(*) c FROM tokens WHERE create_ts>?`, now - h).c);
console.log("prepared (tier1):", r(`SELECT COUNT(*) c FROM tokens WHERE tier>=1 AND create_ts>?`, now - h).c);
console.log("bundle% distribution (all finalized):");
for (const b of db.prepare(`SELECT CASE WHEN bundle_pct<5 THEN '<5' WHEN bundle_pct<20 THEN '5-20' WHEN bundle_pct<40 THEN '20-40' WHEN bundle_pct<60 THEN '40-60' ELSE '60+' END AS bucket, COUNT(*) c FROM tokens WHERE finalized=1 AND create_ts>? GROUP BY bucket`).all(now - h)) console.log("  ", b.bucket.padEnd(6), b.c);
console.log("\ntop prepared launches by bundle SOL:");
for (const t of db.prepare(`SELECT name,symbol,bundle_pct,bundle_sol,bundle_wallets,handoffs,peak_mc_usd,mint FROM tokens WHERE tier>=1 AND create_ts>? ORDER BY bundle_sol DESC LIMIT 15`).all(now - h))
  console.log(`  ${(t.symbol||"").padEnd(8)} ${t.bundle_pct.toFixed(0).padStart(3)}% ${t.bundle_sol.toFixed(1).padStart(7)} SOL ${String(t.bundle_wallets).padStart(3)}w ho=${t.handoffs} peak=$${Math.round(t.peak_mc_usd||0)} ${t.mint}`);
console.log("\ncreators with most launches (7d):");
for (const c of db.prepare(`SELECT creator, COUNT(*) n, AVG(bundle_pct) p FROM tokens WHERE create_ts>? GROUP BY creator HAVING n>1 ORDER BY n DESC LIMIT 10`).all(now - 7 * h)) console.log(`  ${c.creator} x${c.n} avg bundle ${c.p.toFixed(0)}%`);

console.log("\n== paper trades (all time) ==");
const pt = db.prepare(`SELECT COUNT(*) n, SUM(closed) closed, AVG(peak_mult) peak, AVG(x_cluster) xc, AVG(x_tsl40) x40, AVG(x_tsl60) x60, AVG(x_tp) xtp, AVG(x_time) xt, AVG(x_grad) xg, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) hit2x FROM paper_trades`).get();
const m = (v) => (v == null ? "  —  " : ((v - 1) * 100).toFixed(0).padStart(4) + "%");
console.log(`entries ${pt.n} · closed ${pt.closed} · reached 2x: ${pt.hit2x} · avg peak ${(pt.peak||0).toFixed(2)}x`);
console.log(`avg result by exit: cluster ${m(pt.xc)} | TSL40 ${m(pt.x40)} | TSL60 ${m(pt.x60)} | TP ${m(pt.xtp)} | graduation ${m(pt.xg)} | hold ${m(pt.xt)}`);
console.log("by tier: ", db.prepare(`SELECT tier, COUNT(*) n, AVG(peak_mult) peak, AVG(x_time) hold FROM paper_trades GROUP BY tier`).all().map(r=>`tier${r.tier}: ${r.n} trades, avg peak ${(r.peak||0).toFixed(2)}x, hold ${m(r.hold)}`).join(" · "));
console.log("\nlast 15 paper trades:");
for (const t of db.prepare(`SELECT name, entry_mc, peak_mult, x_time, exit_reason, tier, factory, handoffs, inflow_sol, entry_age_s, mint FROM paper_trades ORDER BY id DESC LIMIT 15`).all())
  console.log(`  ${(t.name||"").slice(0,14).padEnd(14)} in $${Math.round(t.entry_mc).toString().padStart(6)} @${t.entry_age_s}s t${t.tier}${t.factory?"F":" "} ho=${t.handoffs} inflow=${(t.inflow_sol||0).toFixed(0)} peak ${(t.peak_mult||1).toFixed(2)}x hold ${m(t.x_time)} ${t.exit_reason||"open"} ${t.mint}`);
