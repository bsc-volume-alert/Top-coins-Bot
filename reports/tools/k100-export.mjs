// k100-export 1.0 (owner's request 8 Nov 2026 17:10 UK: "the full data for the 100K backward coin") — ONE-OFF, READ-ONLY export for the
// $100K Market Cap Project. Replaces the paused hourly coverage export (launcher 0.9.51: its window-function sorts filled the disk) with an
// index-only, ONE-MINT-AT-A-TIME computation. Nothing is written to either database. Run by deploy-step.sh when scripts/job-now.txt starts with "k100".
// Window: launches created K100_FROM → K100_TO (unix s). Files (gzipped) on a NEW branch k100-<stamp>, file-by-file push, sha256 sums:
//   census.csv          every launch in the window (tokens table, as stored)
//   token_life.csv      lifecycle checkpoints (15 s … 24 h) of every launch in the window, as stored (obs_ts, src)
//   coverage_mints.csv  per mint × venue: first/last trade ts, trades, longest gap, max price_sol (+slot/ts/sig) — same columns as the 0.9.48 export
//   coverage_crossings.csv per mint: the FIRST trade whose price_sol × 1e9 × SOL/USD (latest sol_px sample at or before the trade) ≥ $100K, the trade
//                       before it, the SOL/USD used and its age, trades ≥ $100K, highest such cap, previous-trade jump (>10× = suspect) — same columns as 0.9.50
//   sol_usd.csv         every sol_px sample from K100_FROM − 1 h to the read
import { readFileSync as _rf } from "node:fs";
try { for (const l of _rf("/root/tracker/.env", "utf8").split("\n")) { const m = l.match(/^\s*(DB_PATH)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
import Database from "better-sqlite3";
import { createGzip } from "node:zlib";
import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statfsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const TDB = process.env.DB_PATH || "/root/tracker/data/tracker.db", LOUT = process.env.LAUNCH_OUT || "/root/tracker/data/launcher_out";
const FROM = Number(process.env.K100_FROM), TO = Number(process.env.K100_TO);
const STAMP = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13), BRANCH = `k100-${STAMP.toLowerCase()}`, OUT = process.env.K100_OUT || `/root/tracker/data/k100_${STAMP}`;
const status = (o) => { try { writeFileSync(join(LOUT, "k100_status.json"), JSON.stringify({ ver: "k100-export 1.0", branch: BRANCH, at: new Date().toISOString(), ...o }, null, 1)); } catch {} console.log("[k100]", JSON.stringify(o)); };
const esc = (v) => (v == null ? "" : /[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const freeGb = () => { const f = statfsSync(process.env.K100_FS || "/root/tracker/data"); return f.bavail * f.bsize / 1073741824; };
function gzw(name) { const g = createGzip({ level: 9 }), w = createWriteStream(join(OUT, name)); g.pipe(w); let n = 0;
  return { row: (a) => { g.write(a.map(esc).join(",") + "\n"); n++; }, head: (a) => g.write(a.join(",") + "\n"), end: () => new Promise((res) => { w.on("finish", () => res(n)); g.end(); }) }; }

try {
  if (!FROM || !TO || TO <= FROM) throw new Error("K100_FROM/K100_TO not set");
  if (freeGb() < 3) { status({ phase: "aborted-disk", freeGb: +freeGb().toFixed(2) }); process.exit(1); }
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
  const db = new Database(TDB, { readonly: true, fileMustExist: true }); db.pragma("busy_timeout = 5000"); db.pragma("cache_size = -16000");
  const cutoff = Math.floor(Date.now() / 1000);
  // SOL/USD series in memory (small) for per-trade lookup
  const px = db.prepare("SELECT ts, usd FROM sol_px WHERE ts>=? ORDER BY ts").all(FROM - 3600);
  const pxAt = (t) => { let lo = 0, hi = px.length - 1, k = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (px[m].ts <= t) { k = m; lo = m + 1; } else hi = m - 1; } return k < 0 ? null : px[k]; };
  status({ phase: "start", from: FROM, to: TO, solSamples: px.length });
  // census
  const census = db.prepare("SELECT * FROM tokens WHERE create_ts>=? AND create_ts<? ORDER BY create_ts, mint").all(FROM, TO);
  { const w = gzw("census.csv.gz"); const cols = census.length ? Object.keys(census[0]) : ["mint"]; w.head(cols); for (const r of census) w.row(cols.map((c) => r[c])); await w.end(); }
  // token_life for the window's mints
  let lifeRows = 0;
  { const q = db.prepare("SELECT * FROM token_life WHERE mint=? ORDER BY cp"); const w = gzw("token_life.csv.gz"); let cols = null;
    for (const c of census) for (const r of q.iterate(c.mint)) { if (!cols) { cols = Object.keys(r); w.head(cols); } w.row(cols.map((k) => r[k])); }
    lifeRows = await w.end(); }
  // per mint: coverage by venue + first $100K crossing (index (mint, slot) only; no global sorts)
  const qT = db.prepare("SELECT rowid AS rid, venue, slot, ts, sig, price_sol FROM trades WHERE mint=? ORDER BY slot, rowid");
  const cov = gzw("coverage_mints.csv.gz"), crs = gzw("coverage_crossings.csv.gz");
  cov.head(["mint", "create_ts", "tier", "graduated", "finalized", "venue", "first_ts", "last_ts", "n_trades", "max_gap_s", "max_price_sol", "max_slot", "max_ts", "max_sig", "export_cutoff_ts"]);
  crs.head(["mint", "venue", "slot", "ts", "sig", "price_sol", "sol_usd", "sol_usd_ts", "sol_usd_age_s", "mc_usd", "pricing", "prev_venue", "prev_slot", "prev_ts", "prev_price_sol", "suspect_jump", "n_trades_ge_100k", "max_mc_usd_ge_100k"]);
  let i = 0, withTrades = 0, crossings = 0;
  for (const c of census) {
    const V = new Map(); let prev = null, first = null, nge = 0, maxge = 0;
    for (const r of qT.iterate(c.mint)) {
      const v = r.venue || "curve"; let s = V.get(v); if (!s) { s = { first: r.ts, last: r.ts, n: 0, gap: 0, lastTs: null, max: -1, mslot: null, mts: null, msig: null }; V.set(v, s); }
      s.n++; s.last = r.ts; if (s.lastTs != null && r.ts - s.lastTs > s.gap) s.gap = r.ts - s.lastTs; s.lastTs = r.ts;
      if ((r.price_sol || 0) > s.max) { s.max = r.price_sol; s.mslot = r.slot; s.mts = r.ts; s.msig = r.sig; }
      const p = pxAt(r.ts), mc = p && r.price_sol ? r.price_sol * 1e9 * p.usd : null;
      if (mc != null && mc >= 100000) { nge++; if (mc > maxge) maxge = mc;
        if (!first) first = { r, v, p, mc, prev }; }
      prev = { v, slot: r.slot, ts: r.ts, price: r.price_sol };
    }
    for (const [v, s] of V) cov.row([c.mint, c.create_ts, c.tier, c.graduated, c.finalized, v, s.first, s.last, s.n, s.gap, s.max, s.mslot, s.mts, s.msig, cutoff]);
    if (!V.size) cov.row([c.mint, c.create_ts, c.tier, c.graduated, c.finalized, "", "", "", 0, "", "", "", "", "", cutoff]); else withTrades++;
    if (first) { crossings++; const pv = first.prev, jump = pv && pv.price ? (first.r.price_sol / pv.price > 10 ? 1 : 0) : 0;
      crs.row([c.mint, first.v, first.r.slot, first.r.ts, first.r.sig, first.r.price_sol, first.p.usd, first.p.ts, first.r.ts - first.p.ts, first.mc,
        "price_sol x 1e9 x sol_usd (latest sol_px at or before the trade); price_sol from the trade event (curve: virtual reserves; pool: swap amounts)",
        pv?.v ?? "", pv?.slot ?? "", pv?.ts ?? "", pv?.price ?? "", jump, nge, maxge]); }
    if (++i % 2000 === 0) status({ phase: "mints", done: i, of: census.length, withTrades, crossings });
  }
  const covRows = await cov.end(), crsRows = await crs.end();
  { const w = gzw("sol_usd.csv.gz"); w.head(["ts", "usd"]); for (const r of px) w.row([r.ts, r.usd]); await w.end(); }
  const iso = (t) => new Date(t * 1000).toISOString();
  writeFileSync(join(OUT, "MANIFEST.md"), [
    `# $100K project data export (k100-export 1.0)`, ``,
    `One-off, read-only export from the tracker database. Requested by the owner on 8 Nov 2026 at 17:10 UK.`, ``,
    `- **Window:** launches created ${iso(FROM)} → ${iso(TO)}. ${census.length} launches; ${withTrades} with captured trades. Read cutoff ${iso(cutoff)}.`,
    `- **census.csv.gz** (${census.length} rows): every launch, with the tokens table's columns as stored.`,
    `- **token_life.csv.gz** (${lifeRows} rows): lifecycle checkpoints of those launches, as stored.`,
    `- **coverage_mints.csv.gz** (${covRows} rows): one row per mint × venue (curve / pumpswap). A mint with no captured trades gets one empty-venue row.`,
    `- **coverage_crossings.csv.gz** (${crsRows} rows): the first trade per mint at or above $100K.`,
    `  - Price = price_sol × 1e9 × the latest SOL/USD sample at or before the trade.`,
    `  - suspect_jump = 1 if that trade is more than 10× the previous trade's price.`,
    `  - Curve prints above ~4.11e-7 SOL/token cannot occur on the standard curve; treat them as decode errors (study_v1_1 rule).`,
    `- **sol_usd.csv.gz** (${px.length} samples).`,
    `- **What was captured:**`,
    `  - curve trades for retained launches (gross buys ≥ 15 SOL, or bundle tier-1), ~125 min of tracking`,
    `  - pool trades for every launch for 24 h after creation (tracker 0.19.8+)`,
    `  - a launch with no rows was not captured; that is not evidence it did not trade`,
    `- **Not included:** trade rows themselves. Trade rows for 6 Nov 07:40 → 7 Nov 20:00 are on branch entry-all-20261107t2210.`, ""].join("\n"));
  const files = ["census.csv.gz", "token_life.csv.gz", "coverage_mints.csv.gz", "coverage_crossings.csv.gz", "sol_usd.csv.gz", "MANIFEST.md"];
  writeFileSync(join(OUT, "SHA256SUMS.txt"), files.map((f) => `${createHash("sha256").update(readFileSync(join(OUT, f))).digest("hex")}  ${f}`).join("\n") + "\n");
  status({ phase: "written", launches: census.length, withTrades, crossings, lifeRows });
  if (process.env.K100_NOPUSH) { status({ phase: "written-nopush", out: OUT }); process.exit(0); }
  const git = (...a) => execFileSync("git", a, { cwd: OUT, stdio: "pipe", timeout: 900000 }).toString();
  git("init", "-q"); git("checkout", "-q", "--orphan", BRANCH); git("config", "http.postBuffer", "524288000");
  git("remote", "add", "origin", process.env.K100_REMOTE || "https://github.com/bsc-volume-alert/Top-coins-Bot.git");
  let sha = null;
  for (const f of [...files, "SHA256SUMS.txt"]) {
    git("add", "--", f); git("-c", "user.name=launcher", "-c", "user.email=launcher@tracker", "commit", "-q", "-m", `k100 export: ${f}`); sha = git("rev-parse", "HEAD").trim();
    let ok = false; for (let a = 1; a <= 4 && !ok; a++) { try { git("push", "-q", "origin", `HEAD:refs/heads/${BRANCH}`); ok = true; } catch (e) { status({ phase: "publish-retry", file: f, attempt: a, err: String(e.stderr || e.message).replace(/https?:\/\/[^ ]*@/g, "").slice(0, 200) }); execFileSync("sleep", [String(20 * a)]); } }
    if (!ok) { status({ phase: "push-failed", file: f, commit: sha }); process.exit(1); }
  }
  status({ phase: "pushed", branch: BRANCH, commit: sha, launches: census.length, withTrades, crossings });
  try { const remote = git("ls-remote", "origin", `refs/heads/${BRANCH}`).split(/\s/)[0]; if (remote === sha) { rmSync(OUT, { recursive: true, force: true }); status({ phase: "pushed-cleaned", branch: BRANCH, commit: sha, launches: census.length, withTrades, crossings }); } } catch {}
  process.exit(0);
} catch (e) { status({ phase: "error", err: String(e.message).slice(0, 300) }); process.exit(1); }
