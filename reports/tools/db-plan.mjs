// db-plan (13 Nov 2026 23:40 UK, owner + Codex: archive-then-trim the tracker DB) — READ-ONLY measurement for the disk plan.
// Prints: page size/count/freelist, size per table+index (dbstat), trades rows and bytes per UTC day, earliest/latest trade, launches per day.
import Database from "better-sqlite3";
const db = new Database(process.argv[2] || "/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); db.pragma("busy_timeout = 5000");
const L = (...a) => console.log("[deploy] [dbplan]", ...a);
const t0 = Date.now();
L("pages", db.pragma("page_size", { simple: true }), db.pragma("page_count", { simple: true }), "freelist", db.pragma("freelist_count", { simple: true }));
try { const r = db.prepare("SELECT name, SUM(pgsize) b FROM dbstat GROUP BY name ORDER BY b DESC LIMIT 25").all(); for (const x of r) L("size", x.name, (x.b / 1073741824).toFixed(2), "GB"); } catch (e) { L("dbstat unavailable", e.message); }
L("dbstat secs", Math.round((Date.now() - t0) / 1000));
const tc = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((x) => x.name);
for (const t of tc) { try { const c = db.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n; if (c > 100000) L("rows", t, c); } catch {} }
const d = db.prepare("SELECT ts/86400 d, COUNT(*) n, MIN(rowid) r0, MAX(rowid) r1 FROM trades GROUP BY d ORDER BY d").all();
for (const x of d) L("trades day", new Date(x.d * 86400000).toISOString().slice(0, 10), x.n, "rowid", x.r0, "-", x.r1);
try { const k = db.prepare("SELECT create_ts/86400 d, COUNT(*) n FROM tokens GROUP BY d ORDER BY d").all(); for (const x of k) L("launches day", new Date(x.d * 86400000).toISOString().slice(0, 10), x.n); } catch (e) { L("tokens", e.message); }
L("done secs", Math.round((Date.now() - t0) / 1000));
