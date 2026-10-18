// v0.18.84: the export runs here, in its own low-priority process, so the bot never blocks and a bot restart cannot kill a build.
// usage: node export-worker.js <dbPath> <outDir> <full 0|1>
// Writes <outDir>/status.json while working ({state, step, steps, table, startedAt, pid}) and the zip to <outDir>/<name> when done ({state:"ready", file:{...}}).
import Database from "better-sqlite3";
import { mkdirSync, writeFileSync, renameSync, rmSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { setPriority } from "node:os";
import { PAPER_SQL, CSV_EXTRA, CSV_FULL_ONLY, queryToCsvFile } from "./export-sql.js";
import { zipFiles } from "./zip.js";
const [dbPath, outDir, fullArg] = process.argv.slice(2); const full = fullArg !== "0";
try { setPriority(19); } catch {}
mkdirSync(outDir, { recursive: true });
const status = (o) => { try { writeFileSync(join(outDir, "status.json.tmp"), JSON.stringify({ ...o, pid: process.pid, full, now: Math.floor(Date.now() / 1000) })); renameSync(join(outDir, "status.json.tmp"), join(outDir, "status.json")); } catch {} };
const startedAt = Math.floor(Date.now() / 1000), day = new Date().toISOString().slice(0, 10), name = `tracker_export_${day}${full ? "_full" : ""}.zip`;
const work = join(outDir, "work"); try { rmSync(work, { recursive: true, force: true }); } catch {} mkdirSync(work, { recursive: true });
try {
  const dbc = new Database(dbPath, { readonly: true, fileMustExist: true }); dbc.pragma("query_only = 1");
  const tables = { paper_trades: PAPER_SQL, ...CSV_EXTRA };
  const list = Object.entries(tables).filter(([n]) => full || !CSV_FULL_ONLY.has(n)); const files = [], counts = []; let i = 0;
  for (const [t, sql] of list) {
    status({ state: "building", step: i++, steps: list.length + 1, table: t, startedAt });
    const path = join(work, `${t}_${day}.csv`);
    try { const n = queryToCsvFile(dbc, sql, path); if (n) { files.push({ name: `${t}_${day}.csv`, path }); counts.push(`${n} ${t.replace("_", " ")}`); } } catch (e) { console.error("[export]", t, e.message); }
  }
  dbc.close();
  if (!files.length) { status({ state: "error", err: "No data yet.", startedAt }); process.exit(0); }
  status({ state: "building", step: list.length, steps: list.length + 1, table: "zip", startedAt });
  const tmp = join(outDir, name + ".tmp"); const size = await zipFiles(files, tmp); renameSync(tmp, join(outDir, name));
  for (const f of readdirSync(outDir)) if (f.endsWith(".zip") && f !== name) { try { rmSync(join(outDir, f)); } catch {} } // keep one zip
  try { rmSync(work, { recursive: true, force: true }); } catch {}
  status({ state: "ready", startedAt, file: { name, path: join(outDir, name), size: statSync(join(outDir, name)).size, builtAt: Math.floor(Date.now() / 1000), counts, full } });
} catch (e) {
  console.error("[export]", e.message); try { rmSync(work, { recursive: true, force: true }); } catch {}
  status({ state: "error", err: e.message, startedAt });
  process.exit(1);
}
