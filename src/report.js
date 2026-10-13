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
