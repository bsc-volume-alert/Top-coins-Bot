// k100-audit-export 1.0 (10 Nov 2026 20:45 UK; owner forwarded Codex's audit request 20:40 UK) — ONE-OFF, READ-ONLY evidence export for the
// 100K paper books (100K1 = K30-50T25, 100K2 = K30-40T25, 100K3 = K30-40T20). Opens the tracker and launcher databases READ-ONLY; changes nothing;
// no trading effect. Streams one mint at a time (no .all() on big tables). Writes to the DO volume (not the tracker's disk) and publishes file by file
// to a NEW branch k100-audit-<UTC stamp> (never force-pushed). Run by deploy-step.sh when scripts/job-now.txt starts with "k100-audit".
import { readFileSync as _rf } from "node:fs";
try { for (const l of _rf("/root/tracker/.env", "utf8").split("\n")) { const m = l.match(/^\s*(DB_PATH)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
import Database from "better-sqlite3";
import { createGzip } from "node:zlib";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statfsSync, copyFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const LHOME = process.env.LAUNCH_HOME || "/root/launcher";
try { for (const l of readFileSync(join(LHOME, ".env"), "utf8").split("\n")) { const m = l.match(/^\s*(LAUNCH_DB|LAUNCH_OUT)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const TDB = process.env.DB_PATH || "/root/tracker/data/tracker.db", LDB = process.env.LAUNCH_DB || join(LHOME, "launcher.db"), LOUT = process.env.LAUNCH_OUT || "/root/tracker/data/launcher_out";
const VOL = (() => { try { return execFileSync("bash", ["-c", "findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1"]).toString().trim(); } catch { return ""; } })();
const STAMP = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13), BRANCH = `k100-audit-${STAMP.toLowerCase()}`, BASE = process.env.K100A_BASE || VOL, OUT = join(BASE || "/nonexistent", `k100audit_${STAMP}`), PART_MAX = 80 * 1048576;
const BOOKS = ["K30-50T25", "K30-40T25", "K30-40T20"], LABEL = { "K30-50T25": "100K1", "K30-40T25": "100K2", "K30-40T20": "100K3" };
const t0 = Date.now(), now = () => Math.floor(Date.now() / 1000), iso = (t) => (t ? new Date(t * 1000).toISOString() : "-");
const status = (o) => { try { writeFileSync(join(LOUT, "k100audit_status.json"), JSON.stringify({ ver: "k100-audit-export 1.0", branch: BRANCH, at: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000), ...o }, null, 1)); } catch {} console.log("[k100audit]", JSON.stringify(o)); };
const esc = (v) => (v == null ? "" : typeof v === "bigint" ? String(v) : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const freeGb = (p) => { const f = statfsSync(p); return f.bavail * f.bsize / 1073741824; };
const files = [], notes = [], missing = [];

function gzFile(name) { const g = createGzip({ level: 9 }), w = createWriteStream(join(OUT, name)); g.pipe(w); let n = 0, head = null;
  const put = (s) => new Promise((res) => (g.write(s) ? res() : g.once("drain", res)));
  return { async row(o) { if (!head) { head = Object.keys(o); await put(head.join(",") + "\n"); } await put(head.map((c) => esc(o[c])).join(",") + "\n"); n++; },
    end: () => new Promise((res) => { if (!head) g.write("(no rows)\n"); w.on("finish", () => { files.push(name); res(n); }); g.end(); }) }; }
async function dumpQuery(name, db, sql, args = [], desc = "") {
  const f = gzFile(name); let n = 0;
  try { for (const r of db.prepare(sql).iterate(...args)) { await f.row(r); n++; } } catch (e) { missing.push(`${name}: ${e.message}`); }
  await f.end(); notes.push(`- ${name} — ${n} rows. ${desc}`); status({ phase: "file", name, rows: n }); return n; }
const firstRowidAt = (db, t, col, cut) => { const mx = db.prepare(`SELECT MAX(rowid) r FROM ${t}`).get().r || 0; let lo = 1, hi = mx + 1;
  const at = (r) => db.prepare(`SELECT ${col} v FROM ${t} WHERE rowid >= ? ORDER BY rowid LIMIT 1`).get(r);
  while (lo < hi) { const m = Math.floor((lo + hi) / 2), x = at(m); if (!x || Number(x.v) >= cut) hi = m; else lo = m + 1; } return lo; };

async function publish(dir, branch) {
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", timeout: 900000 }).toString();
  const list = readFileSync(join(dir, "SHA256SUMS.txt"), "utf8").trim().split("\n").map((l) => l.split(/\s+/)[1]);
  git("init", "-q"); git("checkout", "-q", "--orphan", branch); git("config", "http.postBuffer", "524288000");
  git("remote", "add", "origin", "https://github.com/bsc-volume-alert/Top-coins-Bot.git");
  const order = ["MANIFEST.md", ...list.filter((f) => f !== "MANIFEST.md"), "SHA256SUMS.txt"]; let sha = null, done = 0;
  for (const f of order) {
    git("add", "--", f); git("-c", "user.name=launcher", "-c", "user.email=launcher@tracker", "commit", "-q", "-m", `k100 audit evidence: ${f}`); sha = git("rev-parse", "HEAD").trim();
    let ok = false; for (let a = 1; a <= 4 && !ok; a++) { try { git("push", "-q", "origin", `HEAD:refs/heads/${branch}`); ok = true; } catch (e) { status({ phase: "publish-retry", file: f, attempt: a, err: String(e.stderr || e.message).replace(/https?:\/\/[^ ]*@/g, "").slice(0, 200) }); execFileSync("sleep", [String(20 * a)]); } }
    if (!ok) { status({ phase: "push-failed", file: f, done, of: order.length, commit: sha }); process.exit(1); }
    done++; status({ phase: "publishing", file: f, done, of: order.length, commit: sha });
  }
  status({ phase: "pushed", branch, commit: sha, files: order.length }); process.exit(0);
}

try {
  if (!BASE) throw new Error("volume not mounted");
  if (freeGb(BASE) < 6) { status({ phase: "aborted-disk", volFreeGb: +freeGb(BASE).toFixed(2) }); process.exit(1); }
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  const tdb = new Database(TDB, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 5000"); tdb.pragma("cache_size = -16000");
  const ldb = new Database(LDB, { readonly: true, fileMustExist: true }); ldb.pragma("busy_timeout = 5000");
  const ACT = ldb.prepare("SELECT since_ts FROM fd_rules WHERE k='K_ACTIVATION'").get()?.since_ts, CUT = now(), FROM = ACT - 3600;
  status({ phase: "start", activation: ACT, cutoff: CUT });

  // 1. rules, decisions, positions
  await dumpQuery("fd_rules.csv.gz", ldb, "SELECT * FROM fd_rules ORDER BY since_ts, k", [], "Every rule/epoch key with its start time (K_ACTIVATION, K_EPOCH2, book keys, older books' keys).");
  await dumpQuery("decisions_kpaper.csv.gz", ldb, "SELECT rowid AS decision_id, * FROM kpaper_decisions ORDER BY rowid", [], "EVERY K decision (one per coin, first usable reading): status = entered / out of band / late: … / clock reading not usable: … / no market cap / no creation time; books = the K books that entered; src = trade (token_life cp=300) or clock (token_cp_clock).");
  const ph = BOOKS.map(() => "?").join(",");
  await dumpQuery("positions_vol_paper.csv.gz", ldb, `SELECT * FROM vol_paper WHERE strat IN (${ph}) ORDER BY id`, BOOKS, "Book positions (id = vol_id = position id; strat = book; row = JSON of the decision inputs). 100K1=K30-50T25, 100K2=K30-40T25, 100K3=K30-40T20.");
  await dumpQuery("positions_chain_fill.csv.gz", ldb, `SELECT c.* FROM chain_fill c JOIN vol_paper v ON v.id = c.vol_id WHERE v.strat IN (${ph}) ORDER BY c.vol_id`, BOOKS, "Simulated fills/exits per position (0.2 SOL s_* and the independent 0.02 SOL i02_* columns), reserves at check/fill/trigger/exit, timings (ms).");
  for (const f of ["fd_positions.csv", "k_decisions.csv"]) { try { copyFileSync(join(LOUT, f), join(OUT, `launcher_export_${f}`)); files.push(`launcher_export_${f}`); notes.push(`- launcher_export_${f} — the launcher's own export as published on launcher-data at read time (fd_positions = all books; filter book K30-*).`); } catch (e) { missing.push(`${f}: ${e.message}`); } }

  // 2. mint sets
  const entered = ldb.prepare(`SELECT DISTINCT mint FROM vol_paper WHERE strat IN (${ph})`).all(...BOOKS).map((r) => r.mint);
  const cmp = ldb.prepare("SELECT mint FROM kpaper_decisions WHERE mc5 >= 15000 AND mc5 < 100000 ORDER BY create_ts").all().map((r) => r.mint).filter((m) => !entered.includes(m));
  const set = [...entered, ...cmp], setJson = JSON.stringify(set), role = new Map([...entered.map((m) => [m, "entered"]), ...cmp.map((m) => [m, "compare"])]);
  status({ phase: "mints", entered: entered.length, compare: cmp.length });

  // 3. uncapped trade histories (entered + comparison mints)
  const COLS = ["row_id", "mint", "sig", "slot", "ts", "wallet", "is_buy", "sol", "tokens", "price_sol", "recv_ms", "vsol", "vtok", "venue", "pool", "ev_idx", "base_raw", "quote_raw", "pool_base_raw", "pool_quote_raw", "base_mint", "quote_mint", "base_dec", "quote_dec", "dec_ver", "px_adj"];
  const qRows = tdb.prepare(`SELECT rowid AS ${COLS.join(", ")} FROM trades WHERE mint=? ORDER BY slot, COALESCE(ev_idx, -1), rowid`), qCount = tdb.prepare("SELECT COUNT(*) n FROM trades WHERE mint=?"), qCreate = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?");
  const parts = []; let gz = null, ws = null, partBytes = 0, partRows = 0, partMints = 0, total = 0; const cov = [];
  const closePart = () => new Promise((res) => { if (!gz) return res(); const p = parts[parts.length - 1]; p.rows = partRows; p.mints = partMints; ws.on("finish", res); gz.end(); gz = null; });
  const openPart = () => { const name = `trades_part_${String(parts.length + 1).padStart(3, "0")}.csv.gz`; parts.push({ name }); gz = createGzip({ level: 9 }); ws = createWriteStream(join(OUT, name)); gz.on("data", (c) => { partBytes += c.length; }); gz.pipe(ws); partBytes = 0; partRows = 0; partMints = 0; gz.write(COLS.join(",") + "\n"); };
  const write = (s) => new Promise((res) => (gz.write(s) ? res() : gz.once("drain", res)));
  for (let i = 0; i < set.length; i++) {
    const m = set[i]; if (!gz || partBytes >= PART_MAX) { await closePart(); if (freeGb(BASE) < 3) { status({ phase: "aborted-disk", done: i }); process.exit(1); } openPart(); }
    let n = 0, curve = 0, pool = 0, ev = 0, fts = null, lts = null, prev = null, gap = 0, buf = "";
    for (const r of qRows.iterate(m)) { n++; if (r.venue === "curve") curve++; else if (r.venue) pool++; if (r.dec_ver) ev++; if (fts == null) fts = r.ts; lts = r.ts; if (prev != null && r.ts - prev > gap) gap = r.ts - prev; prev = r.ts;
      buf += COLS.map((c) => esc(r[c])).join(",") + "\n"; if (buf.length > 1048576) { await write(buf); buf = ""; } }
    if (buf) await write(buf);
    const dbn = qCount.get(m).n, cts = qCreate.get(m)?.create_ts ?? null;
    cov.push({ mint: m, role: role.get(m), create_ts: cts, rows_exported: n, rows_in_db_at_read: dbn, reconciled: n === dbn ? 1 : 0, curve_rows: curve, pool_rows: pool, other_rows: n - curve - pool, rows_with_pool_evidence: ev, first_trade_ts: fts, last_trade_ts: lts, follow_up_s_after_create: lts && cts ? lts - cts : null, max_gap_s: gap, part: parts[parts.length - 1].name });
    partRows += n; partMints++; total += n; if (i % 50 === 0) status({ phase: "trades", done: i + 1, of: set.length, rows: total });
  }
  await closePart(); for (const p of parts) files.push(p.name);
  { const f = gzFile("trade_coverage_per_mint.csv.gz"); for (const c of cov) await f.row(c); await f.end(); }

  // 4. population: census, checkpoints, clock, feed gaps, SOL/USD
  await dumpQuery("census_tokens.csv.gz", tdb, "SELECT * FROM tokens WHERE create_ts >= ? ORDER BY create_ts, mint", [FROM], "EVERY launch in the tracker census created from activation − 1 h. CAUTION: peak_mc_usd, last_mc_usd, graduated, finalized, socials/has_socials, fee and cluster columns are values AS OF THE READ, not as known at decision time.");
  { const lo = firstRowidAt(tdb, "token_life", "ts", FROM); await dumpQuery("token_life.csv.gz", tdb, "SELECT rowid AS row_id, * FROM token_life WHERE rowid >= ? ORDER BY rowid", [lo], "All lifecycle checkpoints (15 s … 24 h) written from activation − 1 h (ts = checkpoint time, obs_ts = when written). cp=300 rows are the trade-triggered 5-min readings."); }
  { const lo = firstRowidAt(tdb, "token_cp_clock", "cutoff_ts", FROM); await dumpQuery("token_cp_clock.csv.gz", tdb, "SELECT rowid AS row_id, * FROM token_cp_clock WHERE rowid >= ? ORDER BY rowid", [lo], "Clock 5-min checkpoints (tracker 0.19.10+, epoch C5-2): computed at create+300 (+2 s grace); status ok / uncertain: feed gap / ingestion lag / no-price / late-processed."); }
  await dumpQuery("feed_gaps.csv.gz", tdb, "SELECT rowid AS row_id, * FROM feed_gaps WHERE ts >= ? ORDER BY rowid", [FROM - 82800], "Socket open/close/idle/error events from activation − 24 h (capture gaps; nothing backfilled).");
  await dumpQuery("sol_usd.csv.gz", tdb, "SELECT * FROM sol_px WHERE ts >= ? ORDER BY ts", [FROM], "SOL/USD samples.");

  // 5. entry features (as recorded, with their own timestamps) for entered + comparison mints
  const T = [["tracker", tdb, "wallet_buys", "Buyer records at the moment they bought (ts = buy time)."], ["tracker", tdb, "big_buys", "Large buys with age_s at the buy."], ["tracker", tdb, "creator_claims", "Creator fee claims (ts)."],
    ["tracker", tdb, "token_peaks", "CAUTION: running peaks as of the read (not decision-time)."], ["launcher", ldb, "fd_watch", "Funded-dev watch: bundle/funder at creation (created_ts)."], ["launcher", ldb, "creator_trace", "Creator funding trace; CAUTION peak_mc_usd/graduated as of the trace/read."],
    ["launcher", ldb, "fd_early", "Early buyers (slot0, sec after create)."], ["launcher", ldb, "buyer_funding", "Buyer funders (ts = when looked up; funded_ts = when funded)."], ["launcher", ldb, "fd_wallet_state", "Wallet holdings snapshots (at = snapshot time)."],
    ["launcher", ldb, "fd_decisions", "Other books' rule decisions on the same mints (at = decision time)."], ["launcher", ldb, "fd_quotes", "Quote checks (ts)."]];
  for (const [src, db, t, d] of T) await dumpQuery(`features_${src}_${t}.csv.gz`, db, `SELECT rowid AS row_id, * FROM ${t} WHERE mint IN (SELECT value FROM json_each(?))`, [setJson], `${d} Mints: entered + comparison set.`);

  // 6. operations: deployed code, restarts, repair log, stalls
  const sh = (c) => { try { return execFileSync("bash", ["-c", c], { timeout: 60000 }).toString(); } catch (e) { return `ERROR ${e.message}`; } };
  writeFileSync(join(OUT, "ops_deployed.txt"), [`read at ${iso(CUT)}`, `tracker checkout /root/tracker HEAD: ${sh("git -C /root/tracker rev-parse HEAD").trim()}`, `launcher dir ${LHOME} git HEAD: ${sh(`git -C ${LHOME} rev-parse HEAD 2>&1`).trim()}`,
    `launcher package.json version: ${sh(`node -p "require('${LHOME}/package.json').version" 2>&1`).trim()}`, `tracker package.json version: ${sh(`node -p "require('/root/tracker/package.json').version" 2>&1`).trim()}`, "", "pm2:", sh("pm2 jlist 2>/dev/null | node -e 'let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{for(const p of JSON.parse(s))console.log(p.name,p.pm2_env.status,\"restarts\",p.pm2_env.restart_time,\"up since\",new Date(p.pm2_env.pm_uptime).toISOString())})'")].join("\n")); files.push("ops_deployed.txt");
  for (const [n, c] of [["ops_restarts.txt", `cat ${LOUT}/../restarts.txt /root/tracker/data/restarts.txt 2>/dev/null | tail -400`], ["ops_db_repair_log.txt", "grep -h -E '\\[(repairdb|repair2|repair3|mvback|mvdb|gap|dbcheck|wal)\\]|one-off job' /root/.pm2/logs/deployer-out*.log 2>/dev/null | tail -600"],
    ["ops_tracker_stalls.txt", "grep -h -iE 'stall|event loop|reconnect|ingestion|lag' /root/.pm2/logs/tracker-out*.log /root/.pm2/logs/tracker-error*.log 2>/dev/null | tail -3000"], ["ops_deploy_history.txt", "grep -h -E '^\\[deploy\\] 20' /root/.pm2/logs/deployer-out*.log 2>/dev/null | tail -400"]]) { writeFileSync(join(OUT, n), sh(c)); files.push(n); }
  try { copyFileSync(join(LOUT, "status.json"), join(OUT, "ops_launcher_status.json")); files.push("ops_launcher_status.json"); } catch (e) { missing.push(`status.json: ${e.message}`); }
  for (const f of ["launcher/src/kpaper.mjs", "launcher/src/chainfill.mjs", "src/lifecycle.js", "reports/books/K_BOOKS.md", "reports/books/LAUNCHER.md"]) { const p = f.startsWith("launcher/") ? join(LHOME, f.slice(9)) : join("/root/tracker", f); try { const n = "code_" + f.replace(/\//g, "__"); copyFileSync(existsSync(p) ? p : join("/root/tracker", f), join(OUT, n)); files.push(n); } catch (e) { missing.push(`${f}: ${e.message}`); } }

  // 7. manifest + checksums
  const recon = cov.filter((c) => !c.reconciled).length, zero = cov.filter((c) => c.rows_exported === 0);
  writeFileSync(join(OUT, "MANIFEST.md"), [`# 100K paper books — evidence package for independent audit (k100-audit-export 1.0)`, ``,
    `Owner forwarded Codex's request 10 Nov 2026 20:40 UK. ONE-OFF, READ-ONLY export; no database, rule or record was changed; live trading OFF.`, ``,
    `- Books: 100K1 = K30-50T25 ($30–50K at 5 min, 25% trail) · 100K2 = K30-40T25 ($30–40K, 25%) · 100K3 = K30-40T20 ($30–40K, 20%). Rule K-1. Each entry = 0.2 SOL + an INDEPENDENT 0.02 SOL position (own trail, i02_* columns).`,
    `- Activation (fd_rules K_ACTIVATION): ${iso(ACT)}. Read cutoff: ${iso(CUT)}. All times UTC (= UK in November). Epochs: trade-triggered 5-min reading (token_life cp=300) from activation; clock checkpoint (token_cp_clock, C5-2) read too from fd_rules K_EPOCH2 (see fd_rules.csv.gz; the launcher re-records its in-memory epoch2 on restart).`,
    `- Mint sets: entered = ${entered.length} distinct mints with a K position. Comparison = ${cmp.length} decided mints NOT entered whose 5-min reading was $15K–$100K (any status). Trades for both sets are UNCAPPED, from the first retained trade through the read (post-exit follow-up included as far as captured).`,
    `- Trades: ${total} rows in ${parts.length} part(s). Columns as stored + row_id (tracker rowid); order slot, ev_idx, rowid. No dedup, repair or derived price; raw prices only (price_sol as decoded; px_adj marks the decoder's own adjustment, if any). Per-mint reconciliation with COUNT(*) at read: ${recon} mint(s) differ (still trading during the read). Mints with 0 retained trades: ${zero.length}${zero.length ? " (" + zero.slice(0, 20).map((z) => z.mint).join(", ") + (zero.length > 20 ? ", …" : "") + ")" : ""}.`,
    `- Pool pricing used by the simulator: vault balances + the pool account's virtual_quote_reserves (see reports/analysis/100k/replay_9nov/POOL_DIAGNOSIS.md on branch tracker); pool fees from the pool's own config.`, ``, `## Files`, ...notes,
    ...parts.map((p) => `- ${p.name} — ${p.rows} trade rows, ${p.mints} mints.`), `- trade_coverage_per_mint.csv.gz — per mint: role, rows exported vs in DB, curve/pool rows, first/last trade, follow-up seconds after creation, longest gap.`,
    `- ops_*.txt / ops_launcher_status.json — deployed commit and versions, pm2 restarts, restart log, the 10 Nov database-repair log, tracker stall/lag lines, deploy history, launcher status (timeouts, errors, push timings).`, `- code_* — the deployed K entry/exit/pricing code and books notes at read time.`, ``,
    `## Known gaps and cautions`, `- Recording gaps (tracker stopped) during the 10 Nov database repair: 07:53:05–07:57:30 and 08:31:43–08:33:26 UTC; the tracker ran on a slow disk 07:57–08:31 (stalls possible). Rows 04:58:49–07:53:05 were RECOVERED from the damaged database into the live one (1,053,795 trades, 24,024 token_life, 2,585 clock rows; 0 unreadable) — row_id order therefore is NOT time order for that window; sort by slot/ts.`,
    `- Earlier capture gaps: feed_gaps.csv.gz. Trades exist only for launches the tracker retains plus pool trades of every launch for 24 h; non-retained coins have no curve history.`,
    `- Features: only what the databases recorded, with their own timestamps; columns marked CAUTION are as-of-read values and must not be used as decision-time knowledge. No wallet/social data was re-fetched.`,
    `- Not included: pump_buyers (no mint index — full scan avoided), launcher tables not listed. Errors while exporting: ${missing.length ? missing.join("; ") : "none"}.`, ``].join("\n"));
  writeFileSync(join(OUT, "SHA256SUMS.txt"), [...files, "MANIFEST.md"].map((f) => `${createHash("sha256").update(readFileSync(join(OUT, f))).digest("hex")}  ${f}`).join("\n") + "\n");
  status({ phase: "written", trades: total, parts: parts.length, entered: entered.length, compare: cmp.length, files: files.length + 1 });
  if (process.env.K100A_NOPUSH) process.exit(0);
  await publish(OUT, BRANCH);
} catch (e) { status({ phase: "error", err: String(e.stack || e.message).slice(0, 400) }); process.exit(1); }
