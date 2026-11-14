// archive-trades 1.0 (14 Nov 2026 00:15 UK; owner + Codex 13 Nov 23:32/23:37 UK: archive, verify and restore-check BEFORE any deletion).
// READ-ONLY on the tracker database. Archives trades rows with rowid in [R0, R1] (a fixed, documented cutoff: old rows are never rewritten by
// the tracker) to gzipped CSV parts (~80 MB each) on the storage volume, plus small readable tables for the same coins, then verifies:
//   1. rows written == COUNT(*) of the rowid range in the database (re-counted after writing);
//   2. RESTORE CHECK: every part is decompressed and re-parsed; the parsed rows re-serialised give the same content hash and the same count;
//   3. SHA256SUMS of every file.
// Writes VERIFIED.json only if all checks pass. Then (optional) publishes the folder to a NEW GitHub branch file by file, never force-pushed.
// Each batch is its own short read (no long read transaction → the WAL can keep checkpointing).
// Usage: node archive-trades.mjs R0 R1 [label]   env: ARCH_ROOT (default <volume>/archive), ARCH_PUBLISH=1, ARCH_REMOTE
import Database from "better-sqlite3";
import { createGzip, gunzipSync } from "node:zlib";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const R0 = Number(process.argv[2]), R1 = Number(process.argv[3]), LABEL = process.argv[4] || `r${R0}-${R1}`;
if (!(R0 >= 1 && R1 >= R0)) { console.log("[archive] usage: R0 R1 [label]"); process.exit(1); }
const vol = (() => { try { return execFileSync("findmnt", ["-rn", "-o", "TARGET"]).toString().split("\n").find((l) => l.startsWith("/mnt/volume")); } catch { return null; } })();
const ROOT = process.env.ARCH_ROOT || (vol ? join(vol, "archive") : null);
if (!ROOT) { console.log("[archive] ABORT: no storage volume"); process.exit(1); }
const NAME = `trades-archive-${LABEL}`, OUT = join(ROOT, NAME), LOUT = "/root/tracker/data/launcher_out";
const TDB = process.env.DB_PATH || "/root/tracker/data/tracker.db", PART_MAX = 80 * 1048576, BATCH = 50000;
const t0 = Date.now();
const status = (o) => { const s = { ver: "archive-trades 1.0", name: NAME, out: OUT, r0: R0, r1: R1, at: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000), ...o };
  try { writeFileSync(join(LOUT, "archive_status.json"), JSON.stringify(s, null, 1)); } catch {} console.log("[archive]", JSON.stringify(s)); };
const esc = (v) => (v == null ? "" : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const parseCsv = (text) => { // RFC-4180 parser (quoted fields, doubled quotes, embedded newlines)
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f !== "" || row.length) { row.push(f); rows.push(row); } return rows; };

if (existsSync(join(OUT, "VERIFIED.json"))) { status({ phase: "already-verified" }); process.exit(0); }
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(join(OUT, f), { recursive: true, force: true }); // a partial earlier attempt is redone from scratch
const db = new Database(TDB, { readonly: true, fileMustExist: true }); db.pragma("busy_timeout = 10000");
const cols = db.prepare("PRAGMA table_info(trades)").all().map((c) => c.name);
const header = ["row_id", ...cols].join(",") + "\n";
const sel = db.prepare(`SELECT rowid AS row_id, ${cols.map((c) => `"${c}"`).join(", ")} FROM trades WHERE rowid > ? AND rowid <= ? ORDER BY rowid LIMIT ${BATCH}`);

// ---- 1. trades parts
const content = createHash("sha256"); let part = 0, partBytes = 0, gz = null, ws = null, rows = 0, last = R0 - 1, tsMin = Infinity, tsMax = -Infinity;
const mints = new Set(), parts = [];
const openPart = () => { part++; const f = `trades_part_${String(part).padStart(3, "0")}.csv.gz`; parts.push(f); ws = createWriteStream(join(OUT, f)); gz = createGzip({ level: 6 }); gz.pipe(ws); gz.write(header); partBytes = 0; };
const closePart = () => new Promise((res) => { ws.on("close", res); gz.end(); });
openPart();
while (last < R1) {
  const b = sel.all(last, R1); if (!b.length) break;
  let chunk = "";
  for (const r of b) { const line = [r.row_id, ...cols.map((c) => r[c])].map(esc).join(",") + "\n"; chunk += line; if (r.mint) mints.add(r.mint); if (r.ts < tsMin) tsMin = r.ts; if (r.ts > tsMax) tsMax = r.ts; }
  content.update(chunk); rows += b.length; last = b[b.length - 1].row_id;
  if (!gz.write(chunk)) await new Promise((res) => gz.once("drain", res));
  partBytes += chunk.length;
  if (ws.bytesWritten > PART_MAX || partBytes > PART_MAX * 6) { await closePart(); openPart(); }
  if (rows % 500000 < BATCH) status({ phase: "trades", rows, last });
}
await closePart();
const contentHash = content.digest("hex");
status({ phase: "trades-written", rows, mints: mints.size });

// ---- 2. small readable tables for the same coins (launch metadata, lifecycle checkpoints, clock checkpoints) + the whole feed_gaps table
const tables = {};
const has = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
const dump = async (file, gen) => { const s = createWriteStream(join(OUT, file)), g = createGzip(); g.pipe(s); let n = 0, hdr = null;
  for (const r of gen()) { if (!hdr) { hdr = Object.keys(r); g.write(hdr.join(",") + "\n"); } g.write(hdr.map((k) => esc(r[k])).join(",") + "\n"); n++; }
  await new Promise((res) => { s.on("close", res); g.end(); }); return n; };
const ml = [...mints], chunks = []; for (let i = 0; i < ml.length; i += 500) chunks.push(ml.slice(i, i + 500));
for (const [t, f] of [["tokens", "launches.csv.gz"], ["token_life", "token_life.csv.gz"], ["token_cp_clock", "token_cp_clock.csv.gz"]])
  if (has(t)) tables[f] = await dump(f, function* () { for (const c of chunks) yield* db.prepare(`SELECT * FROM ${t} WHERE mint IN (${c.map(() => "?").join(",")})`).iterate(...c); });
if (has("feed_gaps")) tables["feed_gaps_all.csv.gz"] = await dump("feed_gaps_all.csv.gz", function* () { yield* db.prepare("SELECT * FROM feed_gaps ORDER BY ts").iterate(); });
status({ phase: "tables-written", tables });

// ---- 3. verification: database recount + restore check (decompress, parse, re-serialise, hash) + checksums
const dbCount = db.prepare("SELECT COUNT(*) n FROM trades WHERE rowid >= ? AND rowid <= ?").get(R0, R1).n;
const back = createHash("sha256"); let backRows = 0, badCols = 0;
for (const f of parts) {
  const rowsP = parseCsv(gunzipSync(readFileSync(join(OUT, f))).toString("utf8"));
  if (rowsP.length && rowsP[0].join(",") + "\n" !== header) badCols++;
  let chunk = ""; for (const r of rowsP.slice(1)) { if (r.length !== cols.length + 1) badCols++; chunk += r.map((v) => (v === "" ? "" : esc(v))).join(",") + "\n"; backRows++; }
  back.update(chunk);
}
const restoreHash = back.digest("hex");
const sums = readdirSync(OUT).filter((f) => f.endsWith(".gz")).sort().map((f) => `${createHash("sha256").update(readFileSync(join(OUT, f))).digest("hex")}  ${f}`);
writeFileSync(join(OUT, "SHA256SUMS.txt"), sums.join("\n") + "\n");
const ok = rows === dbCount && backRows === rows && restoreHash === contentHash && badCols === 0 && last <= R1;
const iso = (s) => (Number.isFinite(s) ? new Date(s * 1000).toISOString() : null);
const v = { ok, name: NAME, rowid_from: R0, rowid_to: R1, rows_written: rows, db_count: dbCount, restored_rows: backRows, content_sha256: contentHash, restore_sha256: restoreHash, bad_rows: badCols,
  trade_ts_min: iso(tsMin), trade_ts_max: iso(tsMax), mints: mints.size, parts: parts.length, tables, files: sums.length, made_at: new Date().toISOString(), source: TDB };
writeFileSync(join(OUT, ok ? "VERIFIED.json" : "FAILED.json"), JSON.stringify(v, null, 1));
writeFileSync(join(OUT, "MANIFEST.md"), `# ${NAME}\n\nArchive of the tracker's raw \`trades\` rows with rowid ${R0} → ${R1} (fixed cutoff; rowids grow with insert time). Trade times ${v.trade_ts_min} → ${v.trade_ts_max} (UTC). Made ${v.made_at} by reports/tools/archive-trades.mjs (read-only on the database).\n\n` +
  `| Check | Result |\n|---|---|\n| rows written | ${rows} |\n| COUNT(*) in the database for the range | ${dbCount} |\n| restore check (decompress → parse → re-serialise) rows | ${backRows} |\n| content SHA-256 at export | \`${contentHash}\` |\n| content SHA-256 after restore | \`${restoreHash}\` |\n| malformed rows | ${badCols} |\n| **verdict** | **${ok ? "VERIFIED" : "FAILED"}** |\n\n` +
  `## Files\n- \`trades_part_NNN.csv.gz\` — every column of \`trades\` exactly as stored (+ \`row_id\` = tracker rowid), in rowid order. \`recv_ms\` = when the tracker received the trade (use it for knowable-at-time rules); \`ts\` = block time.\n` +
  `- \`launches.csv.gz\` (tokens), \`token_life.csv.gz\` (lifecycle checkpoints), \`token_cp_clock.csv.gz\` (clock checkpoints) — every row for the ${mints.size} coins that have trades in this archive (rows: ${JSON.stringify(tables)}).\n- \`feed_gaps_all.csv.gz\` — the whole feed_gaps table at export time (socket open/close/idle events; nothing backfilled).\n- \`SHA256SUMS.txt\`, \`VERIFIED.json\`.\n\n` +
  `## Restore\n\`\`\`\nsha256sum -c SHA256SUMS.txt\npython3 - <<'PY'\nimport csv, gzip, glob, sqlite3\ndb = sqlite3.connect('trades_restored.db')\nfor f in sorted(glob.glob('trades_part_*.csv.gz')):\n    r = csv.reader(gzip.open(f, 'rt', newline=''))\n    h = next(r)\n    db.execute('CREATE TABLE IF NOT EXISTS trades (' + ','.join(h) + ')')\n    db.executemany('INSERT INTO trades VALUES (' + ','.join('?' * len(h)) + ')', ([None if v == '' else v for v in row] for row in r))\ndb.commit(); print(db.execute('SELECT COUNT(*) FROM trades').fetchone())\nPY\n\`\`\`\nThe count must equal ${rows}. Empty CSV fields are NULL in the database.\n`);
status({ phase: ok ? "VERIFIED" : "FAILED", ...v });
if (!ok) process.exit(2);

// ---- 4. publish (file by file, new branch, never force-pushed)
if (process.env.ARCH_PUBLISH === "1") {
  const git = (...a) => execFileSync("git", a, { cwd: OUT, stdio: "pipe", timeout: 900000 }).toString();
  try {
    if (!existsSync(join(OUT, ".git"))) { git("init", "-q"); git("checkout", "-q", "--orphan", NAME); git("config", "http.postBuffer", "524288000"); git("remote", "add", "origin", process.env.ARCH_REMOTE || "https://github.com/bsc-volume-alert/Top-coins-Bot.git"); }
    const files = ["MANIFEST.md", "VERIFIED.json", "SHA256SUMS.txt", ...readdirSync(OUT).filter((f) => f.endsWith(".gz")).sort()];
    for (const f of files) { git("add", f); git("-c", "user.name=archive-trades", "-c", "user.email=noreply@anthropic.com", "commit", "-q", "-m", `${NAME}: ${f}`); git("push", "-q", "origin", `HEAD:refs/heads/${NAME}`); status({ phase: "published", file: f }); }
    status({ phase: "PUBLISHED", branch: NAME, commit: git("rev-parse", "HEAD").trim(), ...v });
  } catch (e) { status({ phase: "publish-failed", err: String(e.message).replace(/https?:\/\/[^ ]*@/g, "").slice(0, 300) }); process.exit(3); }
}
