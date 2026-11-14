// trim-trades 1.0 (14 Nov 2026 00:20 UK; owner + Codex 13 Nov 23:32/23:37 UK: delete original trades only after a verified, restorable archive).
// Deletes trades rows with rowid in [R0, R1] from the tracker database, ONLY IF <archive dir>/VERIFIED.json exists, says ok, covers exactly that
// range, and the database still holds exactly the archived row count for it. Small committed batches (IMMEDIATE transactions, short), with the
// WAL and real free disk watched between batches: PASSIVE checkpoint when the WAL passes 256 MB, pause while it stays large, STOP if free
// disk falls below 0.25 GB. SQLite keeps the freed pages inside tracker.db (free list) and the tracker's new trades reuse them first, so the
// file stops growing; the file itself is not shrunk (that would need a full VACUUM with the tracker stopped — not done here).
// Usage: node trim-trades.mjs R0 R1 <archive dir>
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, statSync, statfsSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
const R0 = Number(process.argv[2]), R1 = Number(process.argv[3]), DIR = process.argv[4];
const TDB = process.env.DB_PATH || "/root/tracker/data/tracker.db", LOUT = "/root/tracker/data/launcher_out", BATCH = Number(process.env.TRIM_BATCH || 10000);
const t0 = Date.now();
const status = (o) => { const s = { ver: "trim-trades 1.0", r0: R0, r1: R1, archive: DIR, at: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000), ...o };
  try { writeFileSync(join(LOUT, "trim_status.json"), JSON.stringify(s, null, 1)); } catch {} console.log("[trim]", JSON.stringify(s)); };
const freeGb = () => { const s = statfsSync(dirname(TDB)); return (s.bavail * s.bsize) / 1073741824; };
const walMb = () => { try { return statSync(TDB + "-wal").size / 1048576; } catch { return 0; } };
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

if (!(R0 >= 1 && R1 >= R0) || !DIR) { status({ phase: "refused", why: "usage: R0 R1 <archive dir>" }); process.exit(1); }
const vf = join(DIR, "VERIFIED.json");
if (!existsSync(vf)) { status({ phase: "refused", why: "no VERIFIED.json in the archive" }); process.exit(1); }
const v = JSON.parse(readFileSync(vf, "utf8"));
if (!v.ok || v.rowid_from !== R0 || v.rowid_to !== R1 || v.rows_written !== v.db_count || v.restored_rows !== v.rows_written || v.content_sha256 !== v.restore_sha256) {
  status({ phase: "refused", why: "VERIFIED.json does not match this exact range or is not a passing verification", v }); process.exit(1); }
const db = new Database(TDB, { fileMustExist: true }); db.pragma("busy_timeout = 15000");
const now = db.prepare("SELECT COUNT(*) n FROM trades WHERE rowid >= ? AND rowid <= ?").get(R0, R1).n;
if (now !== v.rows_written) { status({ phase: "refused", why: `database holds ${now} rows in the range, archive has ${v.rows_written} — not deleting`, }); process.exit(1); }
if (freeGb() < 0.3) { status({ phase: "refused", why: `free disk ${freeGb().toFixed(2)} GB < 0.3 GB` }); process.exit(1); }
status({ phase: "start", rows: now, freeGb: +freeGb().toFixed(2), walMb: +walMb().toFixed(0), freelist0: db.pragma("freelist_count", { simple: true }) });
const del = db.prepare("DELETE FROM trades WHERE rowid >= ? AND rowid <= ?");
const step = db.transaction((a, b) => del.run(a, b).changes);
let a = R0, deleted = 0, n = 0;
while (a <= R1) {
  const b = Math.min(R1, a + BATCH - 1);
  deleted += step.immediate(a, b); a = b + 1; n++;
  if (n % 10 === 0) {
    let w = walMb();
    if (w > 256) { try { db.pragma("wal_checkpoint(PASSIVE)"); } catch {} w = walMb(); }
    let waited = 0; while (walMb() > 768 && waited < 120) { nap(1000); waited++; try { db.pragma("wal_checkpoint(PASSIVE)"); } catch {} }
    const f = freeGb();
    if (f < 0.25) { status({ phase: "STOPPED-low-disk", deleted, next: a, freeGb: +f.toFixed(2), walMb: +walMb().toFixed(0) }); process.exit(2); }
    if (n % 50 === 0) status({ phase: "deleting", deleted, next: a, freeGb: +f.toFixed(2), walMb: +w.toFixed(0) });
  }
  nap(50);
}
try { db.pragma("wal_checkpoint(PASSIVE)"); } catch {}
const left = db.prepare("SELECT COUNT(*) n FROM trades WHERE rowid >= ? AND rowid <= ?").get(R0, R1).n;
status({ phase: left === 0 ? "DONE" : "DONE-with-leftover", deleted, left, freelist_pages: db.pragma("freelist_count", { simple: true }), page_size: db.pragma("page_size", { simple: true }), freeGb: +freeGb().toFixed(2), walMb: +walMb().toFixed(0) });
