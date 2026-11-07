// supp-export 1.1 (owner's go 7 Nov 2026 14:03 UK; spec: Codex 14:02 UK) — ONE-OFF, READ-ONLY supplemental export for the
// Entry Features & Winners project. Opens the tracker and launcher databases read-only; changes nothing in either; no trading effect.
// Lives in reports/tools/ so a push never restarts the tracker. Run by deploy-step.sh when scripts/job-now.txt starts with "supp". Publishes to a NEW branch (entry-supp-<UTC stamp>), never force-pushed.
//   trades_part_NNN.csv.gz — EVERY retained trades row (curve and pool, incl. after our exits) of every mint in launcher chain_fill (all simulated
//                            entries since 5 Nov), UNCAPPED. Columns exactly as stored + row_id (tracker rowid). Order: mint (first entry time),
//                            then slot, ev_idx, rowid. No dedup, no repair, no derived prices. Parts rotate at ~80 MB compressed.
//   coverage_per_mint.csv.gz — per mint: rows exported vs COUNT(*) in the database (reconciliation), curve/pool/evidence rows, first/last ts and
//                            slot, longest gap between consecutive retained trades, entries (first/last entry_ts, count), creation ts.
//   feed_gaps_all.csv.gz   — the whole tracker feed_gaps table (socket open/close/idle/error events; nothing is backfilled).
//   MANIFEST.md, SHA256SUMS.txt.
// Progress: /root/tracker/data/launcher_out/supp_status.json (published with the launcher's regular data push).
// tracker settings: only DB_PATH is read from /root/tracker/.env (no keys used)
import { readFileSync as _rf } from "node:fs";
try { for (const l of _rf("/root/tracker/.env", "utf8").split("\n")) { const m = l.match(/^\s*(DB_PATH)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
import Database from "better-sqlite3";
import { createGzip } from "node:zlib";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statfsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// launcher paths (same rules as launcher/src/config.mjs; only these three settings are read from its .env)
const LHOME = process.env.LAUNCH_HOME || "/root/launcher";
try { for (const l of readFileSync(join(LHOME, ".env"), "utf8").split("\n")) { const m = l.match(/^\s*(LAUNCH_DB|LAUNCH_OUT)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const TDB = process.env.DB_PATH || "/root/tracker/data/tracker.db", LDB = process.env.LAUNCH_DB || join(LHOME, "launcher.db"), LOUT = process.env.LAUNCH_OUT || "/root/tracker/data/launcher_out";
const STAMP = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13); // e.g. 20261107T1415
const BRANCH = `entry-supp-${STAMP.toLowerCase()}`, OUT = process.env.SUPP_OUT || `/root/tracker/data/supp_${STAMP}`, PART_MAX = (Number(process.env.SUPP_PART_MB) || 80) * 1048576;
const t0 = Date.now(), now = () => Math.floor(Date.now() / 1000);
const status = (o) => { try { writeFileSync(join(LOUT, "supp_status.json"), JSON.stringify({ ver: "supp-export 1.1", branch: BRANCH, at: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000), ...o }, null, 1)); } catch {} console.log("[supp]", JSON.stringify(o)); };
const esc = (v) => (v == null ? "" : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

try {
  // 1.1 disk guard: never let this job fill the disk the tracker writes to (min free 6 GB before start; checked again per part)
  const freeGb = () => { const f = statfsSync(process.env.SUPP_FS || "/root/tracker/data"); return f.bavail * f.bsize / 1073741824; };
  const MIN_FREE = Number(process.env.SUPP_MIN_FREE_GB) || 6;
  if (freeGb() < MIN_FREE) { status({ phase: "aborted-disk", freeGb: +freeGb().toFixed(2), minFreeGb: MIN_FREE }); process.exit(1); }
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  const tdb = new Database(TDB, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 5000"); tdb.pragma("cache_size = -16000");
  const ldb = new Database(LDB, { readonly: true, fileMustExist: true }); ldb.pragma("busy_timeout = 5000");
  const cutoff = now();
  const mints = ldb.prepare("SELECT mint, MIN(entry_ts) first_entry, MAX(entry_ts) last_entry, COUNT(*) n FROM chain_fill GROUP BY mint ORDER BY first_entry, mint").all();
  status({ phase: "start", mints: mints.length, cutoff });
  const COLS = ["row_id", "mint", "sig", "slot", "ts", "wallet", "is_buy", "sol", "tokens", "price_sol", "recv_ms", "vsol", "vtok", "venue", "pool", "ev_idx", "base_raw", "quote_raw", "pool_base_raw", "pool_quote_raw", "base_mint", "quote_mint", "base_dec", "quote_dec", "dec_ver", "px_adj"];
  const qRows = tdb.prepare(`SELECT rowid AS ${COLS.join(", ")} FROM trades WHERE mint=? ORDER BY slot, COALESCE(ev_idx, -1), rowid`);
  const qCount = tdb.prepare("SELECT COUNT(*) n FROM trades WHERE mint=?");
  let qCreate = null; try { qCreate = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?"); } catch {}
  const parts = []; let gz = null, ws = null, partBytes = 0, partRows = 0, partMints = 0, totalRows = 0;
  const closePart = () => new Promise((res) => { if (!gz) return res(); const p = parts[parts.length - 1]; p.rows = partRows; p.mints = partMints; ws.on("finish", res); gz.end(); gz = null; });
  const openPart = () => { const name = `trades_part_${String(parts.length + 1).padStart(3, "0")}.csv.gz`; parts.push({ name }); gz = createGzip({ level: 9 }); ws = createWriteStream(join(OUT, name)); gz.on("data", (c) => { partBytes += c.length; }); gz.pipe(ws); partBytes = 0; partRows = 0; partMints = 0; gz.write(COLS.join(",") + "\n"); };
  const write = (s) => new Promise((res) => { if (gz.write(s)) res(); else gz.once("drain", res); });
  const cov = [];
  for (let i = 0; i < mints.length; i++) {
    const m = mints[i];
    if (!gz || partBytes >= PART_MAX) { await closePart(); if (freeGb() < MIN_FREE) { status({ phase: "aborted-disk", freeGb: +freeGb().toFixed(2), done: i, of: mints.length }); rmSync(OUT, { recursive: true, force: true }); process.exit(1); } openPart(); }
    let n = 0, curve = 0, pool = 0, ev = 0, fts = null, lts = null, fslot = null, lslot = null, prev = null, gap = 0, buf = "";
    for (const r of qRows.iterate(m.mint)) {
      n++; if (r.venue === "curve") curve++; else if (r.venue) pool++; if (r.dec_ver) ev++;
      if (fts == null) { fts = r.ts; fslot = r.slot; } lts = r.ts; lslot = r.slot; if (prev != null && r.ts - prev > gap) gap = r.ts - prev; prev = r.ts;
      buf += COLS.map((c) => esc(r[c])).join(",") + "\n";
      if (buf.length > 1048576) { await write(buf); buf = ""; }
    }
    if (buf) await write(buf);
    const dbn = qCount.get(m.mint).n; let cts = null; try { cts = qCreate?.get(m.mint)?.create_ts ?? null; } catch {}
    cov.push([m.mint, cts, m.first_entry, m.last_entry, m.n, n, dbn, n === dbn ? 1 : 0, curve, pool, n - curve - pool, ev, fts, lts, fslot, lslot, gap, parts[parts.length - 1].name]);
    partRows += n; partMints++; totalRows += n;
    if (i % 100 === 0) status({ phase: "trades", done: i + 1, of: mints.length, rows: totalRows, parts: parts.length });
  }
  await closePart();
  // coverage per mint
  { const g = createGzip({ level: 9 }), w = createWriteStream(join(OUT, "coverage_per_mint.csv.gz")); g.pipe(w);
    g.write("mint,create_ts,first_entry_ts,last_entry_ts,entries,rows_exported,rows_in_db_at_read,reconciled,curve_rows,pool_rows,other_venue_rows,rows_with_pool_evidence,first_trade_ts,last_trade_ts,first_slot,last_slot,max_gap_s,part\n");
    for (const c of cov) g.write(c.map(esc).join(",") + "\n"); await new Promise((res) => { w.on("finish", res); g.end(); }); }
  // feed gaps
  let fgRows = 0; { const g = createGzip({ level: 9 }), w = createWriteStream(join(OUT, "feed_gaps_all.csv.gz")); g.pipe(w); g.write("rowid,ts,event,detail\n");
    try { for (const r of tdb.prepare("SELECT rowid, ts, event, detail FROM feed_gaps ORDER BY rowid").iterate()) { g.write([r.rowid, r.ts, r.event, r.detail].map(esc).join(",") + "\n"); fgRows++; } } catch (e) { g.write(`,,error,${esc(e.message)}\n`); }
    await new Promise((res) => { w.on("finish", res); g.end(); }); }
  // retention facts (read, not assumed)
  let oldest = null; try { oldest = tdb.prepare("SELECT ts FROM trades ORDER BY rowid LIMIT 1").get()?.ts ?? null; } catch {}
  const recon = cov.filter((c) => c[7] !== 1).length, zero = cov.filter((c) => c[5] === 0).length, withEv = cov.filter((c) => c[11] > 0).length;
  const iso = (t) => (t ? new Date(t * 1000).toISOString() : "-");
  writeFileSync(join(OUT, "MANIFEST.md"), [
    `# Entry Features & Winners — supplemental trade-history export (supp-export 1.0)`, ``,
    `Owner's go 7 Nov 2026 14:03 UK; spec Codex 14:02 UK. ONE-OFF, READ-ONLY export from the tracker database (${TDB}) and launcher database (chain_fill only). Snapshot 3 (branch entry-snap-7nov-1154 @ e05e07da) and older snapshots are unchanged.`, ``,
    `- Read cutoff: ${iso(cutoff)} (UTC = UK). Rows inserted after a mint was read are not included; rows_in_db_at_read is counted right after each mint's read.`,
    `- Mint set: every mint in launcher chain_fill (all simulated entries, from 5 Nov 2026 12:20 UTC): ${mints.length} mints. Winners are not selected; mints with no retained trades are listed with rows_exported = 0 (${zero}).`,
    `- Rows: ${totalRows} in ${parts.length} part(s), UNCAPPED. Columns exactly as stored plus row_id (tracker rowid). Order within a mint: slot, ev_idx (null first), rowid — deterministic. No dedup, no repair, no derived values. Duplicates from overlapping capture paths may exist — dedup by a full fingerprint (mint, sig, wallet, side, amounts, venue, reserves), never by signature alone.`,
    `- Reconciliation: per mint rows_exported vs COUNT(*) in the database at read; mints not equal: ${recon} (expected only if trades arrived during the read — those mints were still trading).`,
    `- Pool evidence fields (pool, ev_idx, base_raw, quote_raw, pool_base_raw, pool_quote_raw, base_mint, quote_mint, base_dec, quote_dec, dec_ver, px_adj) exist only on pool rows written by tracker 0.19.9 (activated 7 Nov 09:57:18 UTC); earlier rows have them empty. Mints with ≥ 1 evidence row: ${withEv}. base_dec is ASSUMED 6 by the decoder (dec_ver ps-0.19.9), not read from the mint.`,
    `- Units: ts unix s UTC; recv_ms = tracker receipt time (unix ms); sol in SOL; tokens in tokens (6 decimals); price_sol = SOL per token; vsol/vtok = curve virtual reserves after the trade (venue curve) or pool quote (lamports) / base reserves (pumpswap); *_raw = raw integer amounts.`,
    `- Retention: the tracker code has no deletion of the trades table; the oldest retained row (by rowid) has ts ${iso(oldest)}. Which trades are CAPTURED is a different matter: curve trades are kept for launches the tracker retains (15-SOL screen / bundle tier-1), from creation for ~125 min of active tracking; pool trades for retained launches from tracker 0.19.6 (6 Nov 19:31 UTC) and for every census launch for 24 h after creation from 0.19.8 (7 Nov 09:47 UTC). After-exit history exists only inside those capture windows. Absence of rows outside them is a capture limit, not an absent event.`,
    `- Capture gaps: feed_gaps_all.csv.gz (${fgRows} rows: socket open/closed/idle/error, incl. pool-* events from 0.19.8). A gap = a close/idle until the next open; nothing was backfilled. Known tracker outages also in snapshot 3's MANIFEST (20:40–20:42, 20:57–21:06, 23:33–23:35 6 Nov; 00:06–00:08, 00:26:30–00:27:30 7 Nov UTC). coverage_per_mint.max_gap_s = longest gap between consecutive retained trades of that mint (activity OR capture — not separable from this file).`,
    `- Unavailable: trades of mints never retained by the tracker; pre-0.19.9 pool evidence fields; per-token decimals; any trade outside the capture windows above.`, ``,
    `Files: ${parts.map((p) => `${p.name} (${p.rows} rows, ${p.mints} mints)`).join("; ")}; coverage_per_mint.csv.gz; feed_gaps_all.csv.gz; SHA256SUMS.txt.`, ""].join("\n"));
  const files = [...parts.map((p) => p.name), "coverage_per_mint.csv.gz", "feed_gaps_all.csv.gz", "MANIFEST.md"];
  writeFileSync(join(OUT, "SHA256SUMS.txt"), files.map((f) => `${createHash("sha256").update(readFileSync(join(OUT, f))).digest("hex")}  ${f}`).join("\n") + "\n");
  status({ phase: "written", rows: totalRows, parts: parts.length, mints: mints.length, recon_mismatch: recon, zero_rows: zero, evidence_mints: withEv });
  if (process.env.SUPP_NOPUSH) { status({ phase: "written-nopush", out: OUT }); process.exit(0); }
  // publish: a NEW orphan branch, never force
  const git = (...a) => execFileSync("git", a, { cwd: OUT, stdio: "pipe", timeout: 1800000 }).toString();
  git("init", "-q"); git("checkout", "-q", "--orphan", BRANCH); git("add", "-A");
  git("-c", "user.name=launcher", "-c", "user.email=launcher@tracker", "commit", "-q", "-m", `entry supplement ${STAMP}: uncapped trade histories, pool evidence, coverage, feed gaps (read-only export)`);
  const sha = git("rev-parse", "HEAD").trim();
  git("remote", "add", "origin", "https://github.com/bsc-volume-alert/Top-coins-Bot.git");
  for (let a = 1; a <= 3; a++) { try { git("push", "-q", "origin", BRANCH); status({ phase: "pushed", branch: BRANCH, commit: sha, rows: totalRows, parts: parts.length, mints: mints.length, recon_mismatch: recon, zero_rows: zero, evidence_mints: withEv }); process.exit(0); }
    catch (e) { const msg = String(e.stderr || e.message).replace(/https?:\/\/[^ ]*@/g, "").slice(0, 300); status({ phase: "push-failed", attempt: a, err: msg, commit: sha }); } }
  process.exit(1);
} catch (e) { status({ phase: "error", err: String(e.message).slice(0, 300) }); process.exit(1); }
