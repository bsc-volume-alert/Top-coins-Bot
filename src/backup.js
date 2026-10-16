// v0.18.40: daily online backup of the SQLite database (safe while the bot is writing). Keeps the newest BACKUP_KEEP copies in
// data/backups/. Skips (and warns on Telegram) if the disk would drop below twice the database size.
import { CFG } from "./config.js";
import { db } from "./db.js";
import { tg } from "./telegram.js";
import { mkdirSync, readdirSync, statSync, statfsSync, unlinkSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
const DIR = join(dirname(CFG.DB_PATH), "backups"), KEEP = Number(process.env.BACKUP_KEEP || 3), AT_UTC_H = Number(process.env.BACKUP_HOUR_UTC || 4);
export const bk = { last: null, lastFile: null, lastErr: null, running: false };
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
function existing() { try { return readdirSync(DIR).filter((f) => /^tracker-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort(); } catch { return []; } }
export async function runBackup(reason = "daily") {
  if (bk.running) return; bk.running = true;
  try {
    mkdirSync(DIR, { recursive: true });
    const size = statSync(CFG.DB_PATH).size, fs = statfsSync(DIR), free = fs.bavail * fs.bsize;
    if (free < size * 2) { bk.lastErr = `not enough disk (${(free / 1e9).toFixed(1)} GB free, DB ${(size / 1e9).toFixed(2)} GB)`; await tg(`⚠️ <b>Backup skipped</b> — ${bk.lastErr}`); return; }
    const file = join(DIR, `tracker-${day()}.db`), tmp = file + ".part";
    const t0 = Date.now(); await db.backup(tmp); renameSync(tmp, file);
    bk.last = Math.floor(Date.now() / 1000); bk.lastFile = file; bk.lastErr = null;
    console.log(`[backup] ${reason}: ${file} (${(statSync(file).size / 1e6).toFixed(0)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    const all = existing(); for (const f of all.slice(0, Math.max(0, all.length - KEEP))) { try { unlinkSync(join(DIR, f)); } catch {} }
  } catch (e) { bk.lastErr = e.message; console.error("[backup]", e.message); try { await tg(`⚠️ <b>Backup failed</b> — ${e.message}`); } catch {} }
  finally { bk.running = false; }
}
// first backup 10 min after start if none exists for today; then every day at AT_UTC_H:00 UTC
setTimeout(() => { if (!existing().includes(`tracker-${day()}.db`)) runBackup("startup"); }, 10 * 60_000);
setInterval(() => { const d = new Date(); if (d.getUTCHours() === AT_UTC_H && !existing().includes(`tracker-${day()}.db`)) runBackup("daily"); }, 10 * 60_000);
export const backupInfo = () => ({ ...bk, files: existing() });
