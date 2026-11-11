// collection-metrics 1.0 (11 Nov 2026; Codex 12:51 UK forwarded by the owner: "report coverage, ingestion delay and stalls continuously")
// READ-ONLY. Hourly table since the 100K activation (9 Nov 21:00 UTC): launches created, clock 5-min rows by status and epoch (C5-2 / C5-2R restart-recovered),
// coverage = clock rows ÷ launches, median ingestion lag and price age, K decisions by outcome, and tracker event-loop stalls from the pm2 logs.
// Writes launcher_out/collection_metrics.csv + .json (published with the launcher's data push). Run by deploy-step.sh at most every 10 min, niced.
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
let LDB = "/root/launcher/launcher.db"; try { for (const l of readFileSync("/root/launcher/.env", "utf8").split("\n")) { const m = l.match(/^\s*LAUNCH_DB\s*=\s*(.*?)\s*$/); if (m) LDB = m[1].replace(/^["']|["']$/g, ""); } } catch {}
const TDB = "/root/tracker/data/tracker.db", OUT = "/root/tracker/data/launcher_out", LOGS = "/root/.pm2/logs";
const FROM = 1794258000; // 9 Nov 21:00 UTC
const now = Math.floor(Date.now() / 1000), H = (t) => Math.floor(t / 3600) * 3600;
const rows = new Map(); const row = (h) => { if (!rows.has(h)) rows.set(h, { hour_utc: new Date(h * 1000).toISOString().slice(0, 13), launches: 0, clock_rows: 0, clock_ok: 0, clock_no_price: 0, clock_feed_gap: 0, clock_ingest_lag: 0, clock_late: 0, clock_other: 0, recovered_C52R: 0, lag: [], age: [], dec_total: 0, dec_entered: 0, dec_late: 0, dec_unusable: 0, stalls_10s: 0, stalls_60s: 0, stall_s: 0 }); return rows.get(h); };
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const t = new Database(TDB, { readonly: true, fileMustExist: true, timeout: 2000 });
for (const r of t.prepare("SELECT create_ts FROM tokens WHERE create_ts >= ?").iterate(FROM)) row(H(r.create_ts)).launches++;
for (const r of t.prepare("SELECT create_ts, status, epoch, ingest_lag_s, price_age_s FROM token_cp_clock WHERE cp = 300 AND cutoff_ts >= ?").iterate(FROM)) {
  if (!(r.create_ts >= FROM)) continue; const x = row(H(r.create_ts)); x.clock_rows++;
  const s = r.status || ""; if (s === "ok") { x.clock_ok++; if (r.price_age_s != null) x.age.push(r.price_age_s); } else if (s === "no-price") x.clock_no_price++; else if (s.includes("feed gap")) x.clock_feed_gap++; else if (s.includes("ingestion")) x.clock_ingest_lag++; else if (s === "late-processed") x.clock_late++; else x.clock_other++;
  if (r.epoch === "C5-2R") x.recovered_C52R++; if (r.ingest_lag_s != null) x.lag.push(r.ingest_lag_s);
}
t.close();
try { const l = new Database(LDB, { readonly: true, fileMustExist: true, timeout: 2000 });
  for (const r of l.prepare("SELECT create_ts, status FROM kpaper_decisions WHERE create_ts >= ?").iterate(FROM)) { const x = row(H(r.create_ts)); x.dec_total++; const s = r.status || ""; if (s === "entered") x.dec_entered++; else if (s.startsWith("late")) x.dec_late++; else if (s.startsWith("clock reading not usable")) x.dec_unusable++; }
  l.close(); } catch {}
// stalls: pm2 rotates at 00:00 UTC — tracker-error__YYYY-MM-DD_*.log holds the PREVIOUS day; tracker-error.log holds today
const day = (d) => Math.floor(Date.parse(d + "T00:00:00Z") / 1000);
const files = readdirSync(LOGS).filter((f) => /^tracker-error(__\d{4}-\d\d-\d\d_.*)?\.log$/.test(f));
for (const f of files) { const m = f.match(/__(\d{4}-\d\d-\d\d)_/); const d0 = m ? day(m[1]) - 86400 : day(new Date().toISOString().slice(0, 10)); if (d0 < FROM - 86400) continue;
  let txt = ""; try { txt = readFileSync(join(LOGS, f), "utf8"); } catch { continue; }
  for (const mm of txt.matchAll(/\[stall\] (\d\d):(\d\d):(\d\d)Z event loop blocked ([\d.]+) s/g)) { const ts = d0 + (+mm[1]) * 3600 + (+mm[2]) * 60 + (+mm[3]), s = +mm[4]; if (ts < FROM || s < 10) continue; const x = row(H(ts)); x.stalls_10s++; if (s >= 60) x.stalls_60s++; x.stall_s += s; } }
const list = [...rows.entries()].sort((a, b) => a[0] - b[0]).filter(([h]) => h <= now).map(([, x]) => ({ ...x, coverage_pct: x.launches ? +(100 * x.clock_rows / x.launches).toFixed(1) : null, ok_pct_of_launches: x.launches ? +(100 * x.clock_ok / x.launches).toFixed(1) : null, median_ingest_lag_s: med(x.lag), median_price_age_ok_s: med(x.age), stall_s: Math.round(x.stall_s), lag: undefined, age: undefined }));
const cols = ["hour_utc", "launches", "clock_rows", "coverage_pct", "clock_ok", "ok_pct_of_launches", "clock_no_price", "clock_feed_gap", "clock_ingest_lag", "clock_late", "clock_other", "recovered_C52R", "median_ingest_lag_s", "median_price_age_ok_s", "dec_total", "dec_entered", "dec_late", "dec_unusable", "stalls_10s", "stalls_60s", "stall_s"];
writeFileSync(join(OUT, "collection_metrics.csv"), [cols.join(","), ...list.map((x) => cols.map((c) => x[c] ?? "").join(","))].join("\n") + "\n");
writeFileSync(join(OUT, "collection_metrics.json"), JSON.stringify({ ver: "collection-metrics 1.0", at: new Date().toISOString(), note: "coverage = clock 5-min rows ÷ launches created that hour (launches with no trade in their first 420 s never get a row, by design); C5-2R = restart-recovered (post-restart trades only, incomplete activity buffers); tracker versions: 0.19.13 10:44, 0.19.14 12:15, 0.19.15 12:24 UTC on 11 Nov", hours: list.length }, null, 1));
console.log("[metrics] written", list.length, "hours");
