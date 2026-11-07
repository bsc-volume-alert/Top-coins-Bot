// 0.9.46: export worker thread — runs the tracker-database exports with its own read-only connection so the launcher's checks never wait for them.
// Message: { id, db, path, sql, params?, mints?, maxBytes? } → reply { id, ok, r: {rows, bytes, truncated} | err }. With `mints`, `sql` is run once per mint, in that order.
import { parentPort } from "node:worker_threads";
import Database from "better-sqlite3";
import { csvOut } from "./csvout.mjs";
let tdb = null;
parentPort.on("message", (m) => {
  try {
    if (!tdb) { tdb = new Database(m.db, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 5000"); tdb.pragma("cache_size = -16000"); }
    const q = tdb.prepare(m.sql);
    const rows = m.mints ? (function* () { for (const x of m.mints) yield* q.iterate(x); })() : q.iterate(...(m.params || []));
    parentPort.postMessage({ id: m.id, ok: true, r: csvOut(m.path, rows, m.maxBytes ?? Infinity) });
  } catch (e) { parentPort.postMessage({ id: m.id, ok: false, err: String(e?.message || e) }); }
});
