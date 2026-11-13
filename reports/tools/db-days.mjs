// db-days (14 Nov 2026 00:00 UK) — READ-ONLY, cheap: trades rowid boundaries per UTC day by binary search on rowid (rowids grow with insert time),
// so no GROUP BY / temp space on a nearly full disk. Rows per day ≈ rowid difference (rowids are dense unless rows were deleted).
import Database from "better-sqlite3";
const db = new Database(process.argv[2] || "/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); db.pragma("busy_timeout = 5000");
const L = (...a) => console.log("[deploy] [dbdays]", ...a);
const at = db.prepare("SELECT rowid r, ts, recv_ms FROM trades WHERE rowid >= ? ORDER BY rowid LIMIT 1");
const mm = db.prepare("SELECT MIN(rowid) a, MAX(rowid) b FROM trades").get();
const tsOf = (r) => { const x = at.get(r); return x ? (x.recv_ms ? x.recv_ms / 1000 : x.ts) : Infinity; };
const firstAtOrAfter = (T) => { let lo = mm.a, hi = mm.b + 1; while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (tsOf(mid) >= T) hi = mid; else lo = mid + 1; } return lo; };
L("rowid", mm.a, "-", mm.b, "first", new Date(tsOf(mm.a) * 1000).toISOString(), "last", new Date(tsOf(mm.b) * 1000).toISOString());
let d = Math.floor(tsOf(mm.a) / 86400) * 86400; const end = tsOf(mm.b);
while (d <= end) { const r0 = firstAtOrAfter(d), r1 = firstAtOrAfter(d + 86400) - 1; L("day", new Date(d * 1000).toISOString().slice(0, 10), "rowid", r0, "-", r1, "rows≈", Math.max(0, r1 - r0 + 1)); d += 86400; }
for (const T of [Date.UTC(2026, 10, 6, 7, 40) / 1000, Date.UTC(2026, 10, 8, 15) / 1000, Date.UTC(2026, 10, 13) / 1000]) L("cut", new Date(T * 1000).toISOString(), "first rowid", firstAtOrAfter(T));
