// launcher 0.1.0 (owner, 24 Oct 2026 20:08–20:15 UK): "get the tweet, make the coin, put 0.05 SOL in … if no one buys within 10 minutes, sell it".
// Every post of the accounts in the owner's TwitterAPI.io Stream (originals, replies, quotes, reposts) → a name and ticker (rules, or AI when a key is set)
// → picture + metadata on IPFS → ONE transaction that creates the coin on pump.fun and makes our buy (nobody can buy before us) → watched; sold back when
// nobody else buys within 10 minutes, or when the coin goes quiet. Every post and every launch is recorded, with the copycat coins the tracker saw.
// Modes: paper (record only) | shadow (default: build + simulate every launch, sign nothing) | live (owner sets LAUNCH_MODE=live in /root/launcher/.env).
// Own pm2 app, own wallet, own database; reads the tracker's database read-only. SOL only ever leaves to the owner's Phantom (config.mjs PHANTOM).
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync, openSync, writeSync, closeSync, renameSync, statfsSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import Database from "better-sqlite3";
import { Keypair, PublicKey } from "@solana/web3.js";
import { CFG, PHANTOM, HOME, lam, sol } from "./config.mjs";
import { startStream, context, twStat, snowMs } from "./stream.mjs";
import { ruleName, aiName, aiStat } from "./namer.mjs";
import { coinImage } from "./image.mjs";
import { uploadMeta, metaStat } from "./meta.mjs";
import { GLOBAL, TOKEN_2022, decodeGlobal, decodeCurve, freshCurve, quoteBuy, quoteSell, priceOf, curveOf, ata, creatorVaultOf, ixCreateV2, ixBuy, ixSell, ixBuyV3, ixSellV3, ixCollectCreatorFee, ixBudget, ixTransfer } from "./pump.mjs";
import { conn, rpcStats, getAccounts, getBalance, buildTx, simulate, sendUntilConfirmed, readFill } from "./rpc.mjs";
import { ensureKeypair, simPayer } from "./wallet.mjs";
import { inboxPublic, inboxApply } from "./inbox.mjs";
import { ensureLut, luts, lutStat, wantedFor } from "./lut.mjs";
import { initCopies, scheduleCopies, copyTick, copyStatus } from "./copies.mjs";
import { initPeaks, runPeaks, peakStat } from "./copypeaks.mjs";
import { initStudy, runStudy, studyStat, studyAddress, manualStat, loadCensus } from "./study.mjs";
import { initVol, volPoll, volScore, volStat, volBackfill, bfStat, volFillExitTime, volMark, markStat, volQuotePoll } from "./volpaper.mjs";
import { initRF, rfFind, rfCheck, rfStat } from "./runnerfollow.mjs";
import { tgAlarm } from "../../src/telegram.js"; // 0.9.53: disk alarm via the tracker's Telegram (alarms only)
import { initK, kStat, K_VER } from "./kpaper.mjs"; // 0.9.56
import { initR3, r3Stat, R3_VER } from "./r3paper.mjs"; // 0.10.0
import { initC2, c2Stat, C2_VER } from "./c2paper.mjs"; // 0.10.1
import { initFD, fdScan, fdCheck, fdStat, fdSniperStats, snStat, fdLedger, fdInventory, fdPositions, fdCoverage, LEDGER_VER } from "./fundeddev.mjs";
import { initLive, livePoll, liveStat } from "./live.mjs"; // 0.8.17
import { execSync } from "node:child_process";
import { initFarm, buildFarm, farmStat } from "./farm.mjs"; // 0.9.9
import { initRegistry, runRegistry, regStat, registryRows, registryCoverage, earlyCheckpoints } from "./registry.mjs"; // 0.9.23
import { initChainFill, chainBackstop, cfStat } from "./chainfill.mjs"; // 0.9.0
import { qStat } from "./quote.mjs";
import { runSweep, sweepStat } from "./exitsweep.mjs"; // 0.8.1: exit sweep over the census winners (owner, 4 Nov 10:48 UK) // 0.8.0: the funded-dev paper book (owner, 4 Nov 10:04 UK)
import { initOperators, runOperators, opStat, creatorCensus, ctStat } from "./operators.mjs";

const VER = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
let lastStudyExport = { n: -1, t: 0 };
// 0.8.12: say WHY the process dies — the 0.8.11 restarts left nothing in the error log
process.on("uncaughtException", (e) => { console.error("[launcher] uncaughtException", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[launcher] unhandledRejection", e?.stack || e); });
setInterval(() => { const m = process.memoryUsage(); if (m.rss > 230 * 1024 * 1024) console.error(`[launcher] memory rss=${(m.rss / 1048576).toFixed(0)}M heap=${(m.heapUsed / 1048576).toFixed(0)}M ext=${(m.external / 1048576).toFixed(0)}M`); }, 30000);
const now = () => Math.floor(Date.now() / 1000);
mkdirSync(HOME, { recursive: true }); mkdirSync(CFG.REQ_DIR, { recursive: true }); mkdirSync(CFG.OUT_DIR, { recursive: true });
const st = { ver: VER, mode: CFG.MODE, started: new Date().toISOString(), posts: 0, ignored: 0, launches: 0, live: 0, shadowOk: 0, shadowFail: 0, uploadsFailed: 0, sells: 0, errors: 0, lastErr: "", selfTest: null, exports: 0, lastPush: "" };

// ---------- database ----------
const db = new Database(CFG.DB_PATH); db.pragma("journal_mode = WAL"); db.pragma("busy_timeout = 3000"); db.pragma("cache_size = -32000"); // 0.9.10: page cache capped at 32 MB (rss reached 471 MB with a 30–95 MB heap on 5 Nov)
setInterval(() => { try { db.pragma("wal_checkpoint(TRUNCATE)"); } catch {} }, 600000); // 0.9.10: fold the write-ahead log back every 10 min
db.exec(`
CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, user TEXT, kind TEXT, text TEXT, parent_id TEXT, parent_user TEXT, parent_text TEXT, created_ms INTEGER, recv_ms INTEGER, ctx_ms INTEGER, raw TEXT);
CREATE TABLE IF NOT EXISTS launches (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id TEXT, user TEXT, kind TEXT, mode TEXT, status TEXT, reason TEXT,
  name TEXT, ticker TEXT, name_by TEXT, why TEXT, score REAL, rule_name TEXT, rule_ticker TEXT, ai_name TEXT, ai_ticker TEXT, same_name_7d INTEGER, same_ticker_7d INTEGER,
  mint TEXT, uri TEXT, sig TEXT, sim_err TEXT, sim_units INTEGER, upload_ms INTEGER,
  t_post_ms INTEGER, t_recv_ms INTEGER, t_named_ms INTEGER, t_sent_ms INTEGER, t_landed_ms INTEGER,
  stake_sol REAL, cost_sol REAL, tokens TEXT, entry_price REAL, net_lamports TEXT,
  others INTEGER DEFAULT 0, first_other_s INTEGER, last_change_ts INTEGER, peak_x REAL, last_x REAL, sell_tries INTEGER DEFAULT 0,
  sell_sig TEXT, sell_sol REAL, sell_reason TEXT, sold_ts INTEGER, pnl_sol REAL,
  copies_30m INTEGER, copy_first_s INTEGER, copy_best_peak_usd REAL, copy_grads INTEGER, copies_checked_ts INTEGER, copies_final INTEGER DEFAULT 0,
  relaunch_of INTEGER, created_ts INTEGER, buy_ix TEXT, tp_done INTEGER DEFAULT 0, tp_sol REAL, image_url TEXT, buys_10m INTEGER, src_link TEXT);
CREATE INDEX IF NOT EXISTS launches_status ON launches(status);
CREATE INDEX IF NOT EXISTS launches_created ON launches(created_ts);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);`);
for (const c of ["buy_ix TEXT", "tp_done INTEGER DEFAULT 0", "tp_sol REAL", "image_url TEXT", "buys_10m INTEGER", "src_link TEXT"]) try { db.exec(`ALTER TABLE launches ADD COLUMN ${c}`); } catch {}
initCopies(db); // 0.2.0: the copy-coin paper test
initOperators(db); // 0.7.0: the operator (funder-wallet) database (owner, 3 Nov 10:22 UK)
initRF(db); // 0.5.0: runner-follow paper test (owner, 31 Oct 19:22 UK)
initFD(db); // 0.8.0
initVol(db); // 0.4.0: V300 / V500 volume paper trades (owner, 31 Oct 18:41 UK)
initStudy(db); // 0.3.0: why copycats ran (owner, 31 Oct 18:21 UK)
initPeaks(db); // 0.2.2: market caps of every copycat (owner, 31 Oct 18:06 UK)
const upd = (id, o) => { const ks = Object.keys(o); if (ks.length) db.prepare(`UPDATE launches SET ${ks.map((k) => `${k}=?`).join(", ")} WHERE id=?`).run(...ks.map((k) => (typeof o[k] === "bigint" ? o[k].toString() : o[k])), id); };
const kvGet = (k) => db.prepare("SELECT v FROM kv WHERE k=?").get(k)?.v ?? null, kvSet = (k, v) => db.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)").run(k, String(v));
let tdb = null; try { tdb = new Database(CFG.TRACKER_DB, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 2000"); tdb.pragma("cache_size = -16000"); } catch {} // 0.9.10: 16 MB cache on the read-only tracker handle
// 0.9.53 (7 Nov 14:40 UK, reliability; Codex 14:34: alert earlier, by free space AND time to exhaustion, independent of any AI session):
// every 5 min, read free disk space; keep 6 h of samples; Telegram alarm (at most every 2 h) when free < LAUNCH_DISK_MIN_GB (6) or the 30-min+ trend
// says the disk is full within LAUNCH_DISK_HOURS (12). Reports only — nothing is ever deleted automatically. status.export.diskAlarm shows the state.
const diskHist = []; let diskAlarmAt = 0;
function diskWatch() { try { const f = statfsSync(CFG.OUT_DIR), free = f.bavail * f.bsize / 1073741824, t = Date.now() / 1000; diskHist.push([t, free]); while (diskHist.length && t - diskHist[0][0] > 6 * 3600) diskHist.shift();
  const [t0, f0] = diskHist[0], span = (t - t0) / 3600, rate = span >= 0.5 ? (f0 - free) / span : null, hoursLeft = rate != null && rate > 0.02 ? free / rate : null;
  const MIN = Number(process.env.LAUNCH_DISK_MIN_GB) || 6, HRS = Number(process.env.LAUNCH_DISK_HOURS) || 12, bad = free < MIN || (hoursLeft != null && hoursLeft < HRS);
  exportStat.diskAlarm = { at: new Date().toISOString(), freeGb: +free.toFixed(2), rateGbPerH: rate == null ? null : +rate.toFixed(3), hoursLeft: hoursLeft == null ? null : +hoursLeft.toFixed(1), alarm: bad, lastSent: diskAlarmAt ? new Date(diskAlarmAt).toISOString() : null };
  if (bad && Date.now() - diskAlarmAt > 2 * 3600000) { diskAlarmAt = Date.now(); tgAlarm(`⚠️ <b>Server disk</b>: ${free.toFixed(1)} GB free${hoursLeft != null ? `, full in ~${hoursLeft.toFixed(1)} h at ${rate.toFixed(2)} GB/h` : ""}. Nothing is deleted automatically — check disk_usage.txt on launcher-data.`).catch(() => {}); }
} catch (e) { exportStat.diskAlarm = { err: String(e.message).slice(0, 100) }; } }
setTimeout(diskWatch, 20000); setInterval(diskWatch, 300000);

// ---------- wallet / chain state ----------
const wallet = CFG.SMOKE ? Keypair.generate() : ensureKeypair(); // the key file is created on first start; only the public address is ever shown
initChainFill(db); initFarm(db, tdb); if (!CFG.SMOKE) { initK(db, tdb); initR3(db, tdb); initC2(db, tdb); } // 0.10.0: R3C (r3paper.mjs) // 0.9.56: the provisional K books (kpaper.mjs) // 0.9.9 // 0.9.0: simulated executable fills from the chain's reserves, every book
initLive(db, wallet); // 0.8.17: live shadow trades (livebook.txt), signed with this wallet; off under SMOKE
const ME = wallet.publicKey;
let G = null, gAt = 0, balance = null, balAt = 0;
async function global() { if (G && Date.now() - gAt < 600000) return G; const [a] = await getAccounts([GLOBAL], "confirmed"); const g = decodeGlobal(a?.data); if (!g) throw new Error("pump.fun Global account unreadable"); G = g; gAt = Date.now(); return G; }
async function bal(force = false) { if (!force && balance != null && Date.now() - balAt < 20000) return balance; balance = await getBalance(ME); balAt = Date.now(); return balance; }
const ukDay = (ms = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(ms);
const liveToday = () => db.prepare("SELECT created_ts FROM launches WHERE mode='live' AND status NOT IN ('failed','sim_fail','skipped') AND created_ts>=?").all(now() - 30 * 3600).filter((r) => ukDay(r.created_ts * 1000) === ukDay()).length;

// ---------- newness and copycats (tracker database, read-only) ----------
function sameBefore(name, ticker, beforeS) {
  if (!tdb) return { n: null, t: null };
  try { return { n: tdb.prepare("SELECT COUNT(*) n FROM tokens WHERE create_ts BETWEEN ? AND ? AND lower(name)=lower(?)").get(beforeS - 7 * 86400, beforeS, name).n,
    t: tdb.prepare("SELECT COUNT(*) n FROM tokens WHERE create_ts BETWEEN ? AND ? AND upper(symbol)=upper(?)").get(beforeS - 7 * 86400, beforeS, ticker).n }; } catch { return { n: null, t: null }; }
}
function copycats(L) {
  if (!tdb) return null; const t0 = Math.floor(L.t_post_ms / 1000);
  const rows = tdb.prepare("SELECT mint, create_ts, peak_mc_usd, graduated FROM tokens WHERE create_ts BETWEEN ? AND ? AND (lower(name)=lower(?) OR upper(symbol)=upper(?)) AND mint<>?").all(t0 - 60, t0 + 1800, L.name, L.ticker, L.mint || "");
  return { n: rows.length, first: rows.length ? Math.min(...rows.map((r) => r.create_ts)) - t0 : null, best: rows.length ? Math.max(...rows.map((r) => r.peak_mc_usd || 0)) : null, grads: rows.reduce((a, r) => a + (r.graduated ? 1 : 0), 0) };
}

// ---------- one post → one launch ----------
const seen = new Set(); let chain = Promise.resolve();
function onPost(t, ev) {
  if (seen.has(t.id)) return; seen.add(t.id); if (seen.size > 5000) seen.clear();
  const recv = Date.now(); st.posts++;
  const rawKeep = db.prepare("SELECT COUNT(*) n FROM posts").get().n < 200 ? JSON.stringify(ev).slice(0, 6000) : null; // the first 200 raw events are kept, to check the stream's fields
  db.prepare("INSERT OR IGNORE INTO posts (id, user, text, created_ms, recv_ms, raw) VALUES (?, ?, ?, ?, ?, ?)").run(t.id, t.user, t.text, t.createdMs, recv, rawKeep);
  if (CFG.ACCOUNTS.length && !CFG.ACCOUNTS.includes(t.user.toLowerCase())) { st.ignored++; return; }
  chain = chain.then(() => handle(t, recv)).catch((e) => { st.errors++; st.lastErr = "post: " + e.message; });
}
async function handle(t, recv) {
  const c = await context(t); const ctxMs = Date.now();
  const p = c.parent, kind = c.kind;
  db.prepare("UPDATE posts SET kind=?, parent_id=?, parent_user=?, parent_text=?, ctx_ms=? WHERE id=?").run(kind, p?.id || null, p?.user || null, p?.text || null, ctxMs - recv, t.id);
  if (kind === "repost" && CFG.SKIP_RETWEETS) return;
  const ownText = kind === "repost" ? "" : c.tweet.text, subjectText = p ? p.text : "";
  // 0.1.8 (owner, 31 Oct 01:00 UK: "the picture has to be identical … you must look at the tweet and see the word"): the post's own pictures
  // (or, for a reply / quote / repost, the original's) are the coin's picture and are shown to the AI, which picks the name from the words AND the pictures.
  const images = [...(kind === "repost" ? [] : c.tweet.media || []), ...(p?.media || [])].filter((u) => /^https:\/\//.test(u));
  const [rules, ai] = await Promise.all([ruleName({ ownText, subjectText }), aiName({ user: t.user, kind, ownText, subjectText, subjectUser: p?.user, images })]);
  // a picture post is never launched on a guessed name: without the AI reading the picture it is recorded only
  const pick = ai || (images.length ? null : rules);
  const base = { post_id: t.id, user: t.user, kind, t_post_ms: t.createdMs || snowMs(t.id), t_recv_ms: recv, t_named_ms: Date.now(), rule_name: rules?.name || null, rule_ticker: rules?.ticker || null,
    ai_name: ai?.name || null, ai_ticker: ai?.ticker || null, created_ts: now() };
  if (!pick) return insert({ ...base, mode: CFG.MODE, status: "skipped", image_url: images[0] || null, name: rules?.name || null, ticker: rules?.ticker || null, name_by: rules ? "rules (not used)" : null,
    reason: images.length ? (CFG.AI_KEY ? "the AI could not name it from the post and its picture" : "post has a picture — needs the AI to read it (no ANTHROPIC_API_KEY), not launched on a guessed name") : "no words to name a coin from" });
  // 0.1.7 (owner, 31 Oct 00:52 UK: "we don't want to launch it twice"): the first post of a narrative wins — a name or ticker we already launched
  // (or test-launched) in the last REPEAT_H hours is recorded as skipped. The Relaunch button still relaunches on purpose.
  const rep = db.prepare(`SELECT id, created_ts FROM launches WHERE (lower(name)=lower(?) OR upper(ticker)=upper(?)) AND created_ts>=? AND status IN ('building','sent','open','selling','stuck','sold','graduated','sim_ok','paper') ORDER BY id LIMIT 1`).get(pick.name, pick.ticker, now() - CFG.REPEAT_H * 3600);
  if (rep) return insert({ ...base, mode: CFG.MODE, status: "skipped", name: pick.name, ticker: pick.ticker, name_by: pick.by, reason: `already launched as #${rep.id} at ${new Date(rep.created_ts * 1000).toLocaleTimeString("en-GB", { timeZone: "Europe/London" })} UK (no repeats within ${CFG.REPEAT_H} h)` });
  const same = sameBefore(pick.name, pick.ticker, now());
  await launch({ ...base, name: pick.name, ticker: pick.ticker, name_by: pick.by, why: pick.why, score: pick.score, same_name_7d: same.n, same_ticker_7d: same.t, image_url: images[0] || null }, { tweetUrl: `https://x.com/${t.user}/status/${t.id}` });
}
/** The coin's picture: the post's own first picture, byte for byte; only a post with no picture at all gets the drawn ticker picture. */
async function pictureFor(L) {
  if (!L.image_url) return { bytes: coinImage(L.name, L.ticker), type: "image/png", ext: "png", from: "drawn" };
  if (L.image_url.startsWith("file:")) { const f = L.image_url.slice(5), ext = (f.split(".").pop() || "jpg").toLowerCase(); return { bytes: readFileSync(f), type: ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg", ext, from: "upload" }; } // 0.2.1: a picture uploaded on the Launch-now box
  const r = await fetch(L.image_url, { signal: AbortSignal.timeout(6000) }); if (!r.ok) throw new Error(`picture download HTTP ${r.status}`);
  const type = (r.headers.get("content-type") || "image/jpeg").split(";")[0], bytes = Buffer.from(await r.arrayBuffer());
  if (!/^image\//.test(type) || bytes.length < 500 || bytes.length > 15e6) throw new Error(`picture not usable (${type}, ${bytes.length} bytes)`);
  return { bytes, type, ext: type.includes("png") ? "png" : type.includes("gif") ? "gif" : type.includes("webp") ? "webp" : "jpg", from: "post" };
}
const insert = (o) => { const ks = Object.keys(o); const r = db.prepare(`INSERT INTO launches (${ks.join(",")}) VALUES (${ks.map(() => "?").join(",")})`).run(...ks.map((k) => o[k])); st.launches++;
  const id = Number(r.lastInsertRowid); if (o.name && !o.relaunch_of) try { scheduleCopies(db, { ...o, id }); } catch {} return id; };

async function launch(L, { tweetUrl, source = "X" }) {
  // mode for this one: live only when the owner set live, the day's cap isn't reached and the wallet can pay
  let mode = CFG.MODE, reason = null;
  if (mode === "live" && kvGet("paused") === "1") { mode = "paper"; reason = "paused (pause button)"; }
  if (mode === "live") {
    if (CFG.DAILY_CAP > 0 && liveToday() >= CFG.DAILY_CAP) { mode = "paper"; reason = `daily cap ${CFG.DAILY_CAP} reached`; }
    else { const b = await bal(true).catch(() => null); if (b == null || b < lam(CFG.MIN_BALANCE_SOL)) { mode = "paper"; reason = `wallet ${b == null ? "unreadable" : sol(b).toFixed(3) + " SOL"} below ${CFG.MIN_BALANCE_SOL}`; } }
  }
  const id = insert({ ...L, mode, status: mode === "paper" ? "paper" : "building", reason, stake_sol: CFG.STAKE_SOL });
  if (mode === "paper") return id;
  try {
    const description = L.user && L.user !== "manual" ? `${L.name} — narrative from @${L.user}'s post on ${source}${tweetUrl ? ": " + tweetUrl : ""} (not affiliated with @${L.user}).` : tweetUrl ? `${L.name} — ${tweetUrl}` : L.name;
    let uri;
    try { const img = await pictureFor(L); const m = await uploadMeta({ name: L.name, symbol: L.ticker, description, img, tweetUrl }); uri = m.uri; upd(id, { uri, upload_ms: m.ms, ...(m.image && (!L.image_url || L.image_url.startsWith("file:")) ? { image_url: m.image } : {}) }); }
    catch (e) { st.uploadsFailed++; upd(id, { status: mode === "live" ? "failed" : "sim_fail", reason: "picture / metadata upload: " + e.message.slice(0, 160) }); return id; }
    const g = await global(), mintKp = Keypair.generate(), mint = mintKp.publicKey;
    if (mode === "live" && !luts().length) await ensureLut({ wallet, kvGet, kvSet, wanted: wantedFor(ME, g, TIPS.map((t) => new PublicKey(t))) });
    const funded = mode === "live" || (await bal().catch(() => 0)) >= lam(CFG.MIN_BALANCE_SOL);
    const payer = funded ? ME : simPayer() || ME;
    const curve = freshCurve(g, payer), spend = lam(CFG.STAKE_SOL), q = quoteBuy(curve, g, spend), minTokens = (q.tokens * BigInt(Math.round((1 - CFG.SLIP) * 1e4))) / 10000n;
    upd(id, { mint: mint.toBase58(), tokens: q.tokens.toString(), net_lamports: q.net.toString(), entry_price: Number(curve.vSol + q.net) / Number(curve.vTok - q.tokens) });
    // classic buy first; if the chain refuses it in simulation, the v3 buy (what pump.fun's own site uses after create_v2)
    let ixs, sim, buyIx = kvGet("buyIx") || "classic", errs = [];
    for (const v of buyIx === "v3" ? ["v3", "classic"] : ["classic", "v3"]) {
      ixs = [...ixBudget(CFG.CU_LIMIT, CFG.CU_PRICE), ixCreateV2({ mint, user: payer, creator: payer, name: L.name, symbol: L.ticker, uri }),
        ...(v === "v3" ? ixBuyV3({ user: payer, mint, g, spend, minTokens }) : ixBuy({ user: payer, mint, curve, g, spend, minTokens }))];
      if (mode === "live") ixs.push(ixTransfer(payer, tipAccount(), lam(CFG.TIP_SOL)));
      sim = await simulate(await buildTx(payer, ixs, null, luts())); if (sim.ok) { buyIx = v; kvSet("buyIx", v); break; }
      errs.push(`${v}: ${sim.err} ${(sim.logs || []).filter((l) => /Error|error|failed|insufficient/i.test(l)).slice(-3).join(" | ")}`);
    }
    upd(id, { buy_ix: sim.ok ? buyIx : null, sim_err: sim.ok ? null : errs.join(" ‖ ").slice(0, 900), sim_units: sim.units });
    if (mode === "shadow") { upd(id, { status: sim.ok ? "sim_ok" : "sim_fail", reason: funded ? null : "simulated with a stand-in payer (launch wallet not funded)" }); sim.ok ? st.shadowOk++ : st.shadowFail++; return id; }
    if (!sim.ok) { upd(id, { status: "failed", reason: "simulation refused it — not sent" }); return id; }
    const tx = await buildTx(payer, ixs, [wallet, mintKp], luts()); upd(id, { t_sent_ms: Date.now(), status: "sent", sig: Buffer.from(tx.signatures[0]).length ? bs58(tx.signatures[0]) : null });
    confirmLater(id, tx, mint, q); // the next post doesn't wait for this one to confirm
  } catch (e) { st.errors++; st.lastErr = "launch: " + e.message; upd(id, { status: mode === "live" ? "failed" : "sim_fail", reason: e.message.slice(0, 200) }); }
  return id;
}
async function confirmLater(id, tx, mint, q) {
  try {
    const r = await sendUntilConfirmed(tx, 25000); upd(id, { sig: r.sig });
    if (r.status !== "confirmed") { upd(id, { status: "failed", reason: `transaction ${r.status}${r.err ? ": " + r.err.slice(0, 160) : ""}` }); return; }
    const fill = await readFill(r.sig, ME, mint);
    st.live++; balance = null;
    upd(id, { status: "open", t_landed_ms: Date.now(), cost_sol: fill ? sol(fill.solDelta) : null, tokens: fill ? String(fill.tokenDelta) : q.tokens.toString(), last_change_ts: now(), peak_x: 1, last_x: 1 });
    exportSoon();
  } catch (e) { st.errors++; st.lastErr = "confirm: " + e.message; upd(id, { status: "failed", reason: "confirm: " + e.message.slice(0, 160) }); }
}
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const bs58 = (bytes) => { let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b); let o = ""; while (n > 0n) { o = B58[Number(n % 58n)] + o; n /= 58n; } for (const b of bytes) { if (b) break; o = "1" + o; } return o; };
const TIPS = ["4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE", "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ", "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta", "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn", "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD", "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ", "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF", "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT"];
const tipAccount = () => new PublicKey(TIPS[Math.floor(Math.random() * TIPS.length)]); // Helius Sender tip accounts (as the executor)

// ---------- watching our coins: sell back when nobody buys, or when it goes quiet ----------
let watching = false;
async function watch() {
  if (watching) return; watching = true;
  try {
    const open = db.prepare("SELECT * FROM launches WHERE mode='live' AND status IN ('open','selling') ORDER BY id").all(); if (!open.length) return;
    const g = await global(); const accs = await getAccounts(open.map((L) => curveOf(new PublicKey(L.mint))), "confirmed");
    for (let i = 0; i < open.length; i++) {
      const L = open[i], c = decodeCurve(accs[i]?.data); if (!c) continue;
      const age = now() - Math.floor((L.t_landed_ms || L.created_ts * 1000) / 1000), spent = lam(L.stake_sol || CFG.STAKE_SOL);
      const x = Number(quoteSell(c, g, BigInt(L.tokens || "0"))) / spent; // what our tokens would sell for now ÷ the stake (≈ 0.975 at the start: the 1.25% fees each way)
      const ours = BigInt(L.net_lamports || "0"), others = c.rSol > ours + 100000n; // anything beyond our own buy (0.0001 SOL slack) is someone else
      const changed = Number(c.rSol) !== Number(kvGet("rsol:" + L.id) ?? -1); if (changed) kvSet("rsol:" + L.id, Number(c.rSol));
      const o = { last_x: +x.toFixed(4), peak_x: Math.max(L.peak_x || 0, +x.toFixed(4)) };
      if (others && !L.others) { o.others = 1; o.first_other_s = age; }
      if (changed) o.last_change_ts = now();
      upd(L.id, o);
      if (c.complete) { upd(L.id, { status: "graduated", reason: "graduated — sell on PumpSwap by hand for now" }); continue; }
      const manual = L.status === "selling";
      // 0.1.11 (owner, 31 Oct 01:15 UK): at DEAD_MIN, count the buys by other wallets; fewer than MIN_BUYS → sell back (checked once)
      let buys = L.buys_10m; if (!manual && buys == null && age >= CFG.DEAD_MIN * 60) { buys = await countBuys(L).catch(() => null); if (buys != null) upd(L.id, { buys_10m: buys }); }
      const why = manual ? (L.sell_reason || "sell button") : buys != null && L.buys_10m == null && buys < CFG.MIN_BUYS ? `only ${buys} buy${buys === 1 ? "" : "s"} by others in ${CFG.DEAD_MIN} min (needs ${CFG.MIN_BUYS})`
        : buys == null && !others && !L.others && age >= CFG.DEAD_MIN * 60 ? `nobody else bought in ${CFG.DEAD_MIN} min`
        : (others || L.others) && now() - (changed ? now() : L.last_change_ts || now()) >= CFG.QUIET_MIN * 60 ? `no trades for ${CFG.QUIET_MIN} min`
        : null;
      if (why) await sellOne(L, c, g, why);
      else if (CFG.TP_X > 0 && !L.tp_done && x >= CFG.TP_X) await sellOne(L, c, g, `take-profit: ${Math.round(CFG.TP_FRACTION * 100)}% sold at ${CFG.TP_X}x`, CFG.TP_FRACTION);
    }
  } catch (e) { st.errors++; st.lastErr = "watch: " + e.message; } finally { watching = false; }
}
/** Buys by other wallets on our coin's curve so far: its transactions, those that ran a pump.fun buy and were not paid for by our wallet. */
async function countBuys(L) {
  const curve = curveOf(new PublicKey(L.mint)); rpcStats.calls++;
  const sigs = (await conn.getSignaturesForAddress(curve, { limit: 200 }, "confirmed")).filter((s) => !s.err && s.signature !== L.sig).map((s) => s.signature);
  let n = 0;
  for (let i = 0; i < sigs.length; i += 25) {
    rpcStats.calls++; const txs = await conn.getTransactions(sigs.slice(i, i + 25), { maxSupportedTransactionVersion: 1, commitment: "confirmed" });
    for (const t of txs) { if (!t?.meta) continue; const payer = t.transaction.message.staticAccountKeys[0].toBase58();
      if (payer !== ME.toBase58() && (t.meta.logMessages || []).some((l) => /Instruction: (Buy|BuyExactSolIn|BuyV2|BuyV3|BuyExactQuoteIn)/.test(l))) n++; }
  }
  return n;
}
async function sellOne(L, curve, g, why, frac = 1) {
  const mint = new PublicKey(L.mint), ua = ata(ME, mint, TOKEN_2022);
  try {
    const [acc] = await getAccounts([ua], "confirmed"); const held = acc?.data?.length >= 72 ? acc.data.readBigUInt64LE(64) : 0n;
    const part = frac < 1, amount = part ? (held * BigInt(Math.round(frac * 1e4))) / 10000n : held;
    if (amount <= 0n) { upd(L.id, { status: "sold", sell_reason: why + " (no tokens left)", sold_ts: now() }); return; }
    const out = quoteSell(curve, g, amount), minSol = (out * BigInt(Math.round((1 - CFG.SELL_SLIP) * 1e4))) / 10000n;
    const sellIxs = L.buy_ix === "v3" ? ixSellV3({ user: ME, mint, g, amount, minSol, close: !part }) : ixSell({ user: ME, mint, curve, g, amount, minSol, close: !part });
    const tx = await buildTx(ME, [...ixBudget(200000, CFG.CU_PRICE), ...sellIxs, ixTransfer(ME, tipAccount(), lam(CFG.TIP_SOL))], [wallet], luts());
    const tries = (L.sell_tries || 0) + 1; if (!part) upd(L.id, { status: "selling", sell_reason: why, sell_tries: tries });
    const sim = await simulate(tx); // a sale the chain would refuse is not sent (a failed transaction still costs its fee)
    const r = sim.ok ? await sendUntilConfirmed(tx, 20000) : { status: "refused", err: sim.err };
    if (part) { // take-profit on part of the position: record it once, keep holding the rest under the normal rules
      if (r.status !== "confirmed") { st.lastErr = `take-profit ${L.ticker}: ${r.status} ${r.err || ""}`.slice(0, 200); return; }
      const f = await readFill(r.sig, ME, mint); upd(L.id, { tp_done: 1, tp_sol: f ? sol(f.solDelta) : null, tokens: (held - amount).toString(), reason: why }); balance = null; exportSoon(); return;
    }
    if (r.status !== "confirmed") { st.lastErr = `sell ${L.ticker}: ${r.status} ${r.err || ""}`.slice(0, 200); if (tries >= 6) upd(L.id, { status: "stuck", reason: "sell failed 6 times (press Sell to try again): " + String(r.err || r.status).slice(0, 120) }); return; }
    const fill = await readFill(r.sig, ME, mint); const got = fill ? sol(fill.solDelta) : null;
    upd(L.id, { status: "sold", sell_sig: r.sig, sell_sol: got, sold_ts: now(), pnl_sol: got != null && L.cost_sol != null ? +(got + (L.tp_sol || 0) + L.cost_sol).toFixed(6) : null });
    st.sells++; balance = null; exportSoon();
  } catch (e) { st.errors++; st.lastErr = "sell: " + e.message; }
}

// ---------- the website's buttons (scope writes a small JSON file into REQ_DIR; nothing else can reach this app) ----------
async function requests() {
  let files = []; try { files = readdirSync(CFG.REQ_DIR).filter((f) => f.endsWith(".json")); } catch { return; }
  for (const f of files) {
    let rq = null; try { rq = JSON.parse(readFileSync(`${CFG.REQ_DIR}/${f}`, "utf8")); } catch {} try { unlinkSync(`${CFG.REQ_DIR}/${f}`); } catch {}
    if (!rq || now() - (rq.at || 0) > 300) continue;
    // 0.1.14 (owner, 31 Oct 01:26 UK): one button pauses every new launch at once; one button sells every coin we hold
    if (rq.action === "pause" || rq.action === "resume") { kvSet("paused", rq.action === "pause" ? "1" : "0"); kvSet("pausedAt", new Date().toISOString()); writeStatus(); continue; }
    if (rq.action === "sellall") { const r = db.prepare("UPDATE launches SET status='selling', sell_reason='sell-all button', sell_tries=0 WHERE mode='live' AND status IN ('open','stuck')").run(); kvSet("lastSellAll", `${new Date().toISOString()} ${r.changes} coin(s)`); writeStatus(); setTimeout(() => watch(), 50); continue; }
    // 0.2.1 (owner, 31 Oct 09:58 UK): the Launch-now box — "suggest" names a pasted post (AI reads its text and picture); "manual" launches it
    if (rq.action === "suggest" && rq.reqId) { suggest(rq).then((out) => writeFileSync(`${CFG.REQ_DIR}/resp-${rq.reqId}.out`, JSON.stringify(out))).catch((e) => writeFileSync(`${CFG.REQ_DIR}/resp-${rq.reqId}.out`, JSON.stringify({ ok: false, error: e.message }))); continue; }
    if (rq.action === "study" && rq.mint) { studyAddress(db, String(rq.mint).trim(), exportNow); continue; } // 0.6.0: study a coin by address
    if (rq.action === "manual" && rq.reqId) { chain = chain.then(() => manualLaunch(rq)).catch((e) => { st.errors++; st.lastErr = "manual: " + e.message; }); continue; }
    if (!Number.isInteger(rq.id)) continue;
    const L = db.prepare("SELECT * FROM launches WHERE id=?").get(rq.id); if (!L) continue;
    if (rq.action === "sell" && L.mode === "live" && ["open", "stuck"].includes(L.status)) { upd(L.id, { status: "selling", sell_reason: "sell button", sell_tries: 0 }); setTimeout(() => watch(), 50); }
    if (rq.action === "relaunch" && L.name) {
      const same = sameBefore(L.name, L.ticker, now());
      chain = chain.then(() => launch({ post_id: L.post_id, user: L.user, kind: L.kind, name: L.name, ticker: L.ticker, name_by: L.name_by, why: "relaunch", score: L.score, rule_name: L.rule_name, rule_ticker: L.rule_ticker,
        ai_name: L.ai_name, ai_ticker: L.ai_ticker, same_name_7d: same.n, same_ticker_7d: same.t, image_url: L.image_url, t_post_ms: Date.now(), t_recv_ms: Date.now(), t_named_ms: Date.now(), relaunch_of: L.id, created_ts: now() },
        { tweetUrl: L.user && L.post_id ? `https://x.com/${L.user}/status/${L.post_id}` : "" })).catch((e) => { st.errors++; st.lastErr = "relaunch: " + e.message; });
    }
  }
}

// ---------- the Launch-now box (0.2.1) ----------
const srcOf = (link) => { const x = String(link || "").match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,30})\/status\/(\d+)/), t = String(link || "").match(/truthsocial\.com\/@([A-Za-z0-9_]{1,40})\/(?:posts\/)?(\d+)/);
  return x ? { user: x[1], id: x[2], source: "X" } : t ? { user: t[1], id: t[2], source: "Truth Social" } : { user: "manual", id: null, source: "manual" }; };
function imagesOf(rq) {
  if (rq.imageFile && existsSync(rq.imageFile) && rq.imageFile.startsWith(`${HOME}/uploads/`)) { const ext = rq.imageFile.split(".").pop().toLowerCase(); return [{ b64: readFileSync(rq.imageFile).toString("base64"), type: ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg" }]; }
  return /^https:\/\//.test(rq.imageUrl || "") ? [rq.imageUrl] : [];
}
async function suggest(rq) {
  const text = String(rq.text || "").slice(0, 2000), s = srcOf(rq.link), images = imagesOf(rq);
  const ai = await aiName({ user: s.user, kind: "post", ownText: text, subjectText: "", images });
  const pick = ai || (images.length ? null : ruleName({ ownText: text, subjectText: "" }));
  if (!pick) return { ok: false, error: images.length ? "the AI could not name it (or is off) — type a name and ticker yourself" : "no words to name a coin from" };
  const rep = db.prepare(`SELECT id, created_ts FROM launches WHERE (lower(name)=lower(?) OR upper(ticker)=upper(?)) AND created_ts>=? AND status IN ('building','sent','open','selling','stuck','sold','graduated','sim_ok') ORDER BY id LIMIT 1`).get(pick.name, pick.ticker, now() - CFG.REPEAT_H * 3600);
  return { ok: true, name: pick.name, ticker: pick.ticker, score: pick.score ?? null, why: pick.why || "", by: pick.by, source: s.source, user: s.user, repeatOf: rep ? rep.id : null };
}
async function manualLaunch(rq) {
  const s = srcOf(rq.link), name = String(rq.name || "").trim().slice(0, 32), ticker = String(rq.ticker || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
  if (!name || ticker.length < 2) return;
  const pid = s.id ? `${s.source === "X" ? "" : "truth-"}${s.id}` : `manual-${rq.reqId}`;
  db.prepare("INSERT OR IGNORE INTO posts (id, user, kind, text, created_ms, recv_ms) VALUES (?, ?, ?, ?, ?, ?)").run(pid, s.user, "manual", String(rq.text || "").slice(0, 2000), Date.now(), Date.now());
  const image_url = rq.imageFile && rq.imageFile.startsWith(`${HOME}/uploads/`) ? "file:" + rq.imageFile : /^https:\/\//.test(rq.imageUrl || "") ? rq.imageUrl : null;
  const same = sameBefore(name, ticker, now());
  await launch({ post_id: pid, user: s.user, kind: "manual", name, ticker, name_by: rq.nameBy === "ai" ? "ai (manual)" : "manual", why: `launched by hand from ${s.source}`, score: rq.score ?? null,
    t_post_ms: Date.now(), t_recv_ms: Date.now(), t_named_ms: Date.now(), image_url, src_link: String(rq.link || "").slice(0, 300) || null, same_name_7d: same.n, same_ticker_7d: same.t, created_ts: now() }, { tweetUrl: String(rq.link || "").slice(0, 300), source: s.source });
}

// ---------- housekeeping: copycats, creator fees, sweep to Phantom ----------
function copyJob() {
  try {
    for (const L of db.prepare("SELECT * FROM launches WHERE name IS NOT NULL AND copies_final=0 AND created_ts<=? ORDER BY id LIMIT 200").all(now() - 1800)) {
      const c = copycats(L); if (!c) return;
      upd(L.id, { copies_30m: c.n, copy_first_s: c.first, copy_best_peak_usd: c.best, copy_grads: c.grads, copies_checked_ts: now(), copies_final: now() - L.created_ts >= 6 * 3600 ? 1 : 0 });
    }
  } catch (e) { st.errors++; st.lastErr = "copycats: " + e.message; }
}
async function feesAndSweep() {
  if (CFG.MODE !== "live" || CFG.SMOKE) return;
  try {
    const vault = creatorVaultOf(ME), [v] = await getAccounts([vault], "confirmed"), rent = 890880; // a 0-byte account's rent-exempt minimum
    if (v && v.lamports - rent >= lam(CFG.FEE_COLLECT_MIN_SOL)) { const tx = await buildTx(ME, [...ixBudget(100000, CFG.CU_PRICE), ixCollectCreatorFee(ME)], [wallet]); const r = await sendUntilConfirmed(tx, 20000); kvSet("lastFeeCollect", `${new Date().toISOString()} ${r.status} ${sol(v.lamports - rent).toFixed(4)} SOL`); }
    if (db.prepare("SELECT COUNT(*) n FROM launches WHERE status IN ('building','sent','selling')").get().n) return; // never sweep in the middle of a launch or a sale
    const b = await bal(true), keep = lam(CFG.SWEEP_KEEP_SOL), extra = b - keep - 10000;
    if (extra >= lam(0.01)) { const tx = await buildTx(ME, [...ixBudget(5000, 1000), ixTransfer(ME, new PublicKey(PHANTOM), extra)], [wallet]); const r = await sendUntilConfirmed(tx, 20000); kvSet("lastSweep", `${new Date().toISOString()} ${r.status} ${sol(extra).toFixed(4)} SOL → ${PHANTOM}`); balance = null; }
  } catch (e) { st.errors++; st.lastErr = "fees/sweep: " + e.message; }
}

// ---------- self-test: build a create+buy for a test coin and simulate it (nothing signed); then one metadata upload ----------
async function selfTest() {
  const out = { at: new Date().toISOString() };
  try {
    const g = await global(); out.global = { feeBps: g.feeBps, creatorFeeBps: g.creatorFeeBps, initVSol: sol(g.initVSol), initVTok: Number(g.initVTok) / 1e6 };
    const payer = (await bal().catch(() => 0)) >= lam(CFG.MIN_BALANCE_SOL) ? ME : simPayer() || ME; out.payer = payer.equals(ME) ? "launch wallet" : "stand-in (launch wallet not funded)";
    const mint = Keypair.generate().publicKey, curve = freshCurve(g, payer), spend = lam(CFG.STAKE_SOL), q = quoteBuy(curve, g, spend);
    Object.assign(out, { quotedTokens: Number(q.tokens) / 1e6, pctSupply: +(Number(q.tokens) / Number(g.supply) * 100).toFixed(3) });
    for (const v of ["classic", "v3"]) {
      const ixs = [...ixBudget(CFG.CU_LIMIT, CFG.CU_PRICE), ixCreateV2({ mint, user: payer, creator: payer, name: "Launcher Test", symbol: "LTEST", uri: "https://ipfs.io/ipfs/QmTest" }),
        ...(v === "v3" ? ixBuyV3({ user: payer, mint, g, spend, minTokens: (q.tokens * 95n) / 100n }) : ixBuy({ user: payer, mint, curve, g, spend, minTokens: (q.tokens * 95n) / 100n }))];
      const sim = await simulate(await buildTx(payer, ixs, null, luts()), [ata(payer, mint, TOKEN_2022), payer]);
      out[v + "Bytes"] = (await buildTx(payer, [...ixs, ixTransfer(payer, tipAccount(), lam(CFG.TIP_SOL))], [Keypair.generate(), Keypair.generate()].slice(0, 0), luts())).serialize().length; // the size of a real launch with tip, signatures included (cap 1,232)
      const got = sim.post?.[0]?.length >= 72 ? sim.post[0].readBigUInt64LE(64) : null;
      out[v] = { ok: sim.ok, err: sim.err, units: sim.units, ms: sim.ms, simTokens: got != null ? Number(got) / 1e6 : null, logs: sim.ok ? sim.logs.filter((l) => /Instruction:/.test(l)).slice(0, 12) : sim.logs.slice(-14) };
      if (sim.ok && !kvGet("buyIx")) kvSet("buyIx", v);
    }
  } catch (e) { out.error = e.message; }
  // 0.1.9: the AI naming check on the owner's own example (31 Oct 00:51 UK): WhiteHouse "Dems in charge? Nothing scarier. 🎃" with its Goosebumps-style pictures
  if (CFG.AI_KEY) { const t0 = Date.now(); const r = await aiName({ user: "WhiteHouse", kind: "post", ownText: "Dems in charge? Nothing scarier. 🎃", subjectText: "", images: ["https://pbs.twimg.com/media/HV6yhmrWQAASiYk.jpg", "https://pbs.twimg.com/media/HV6yjnzW4AANlvW.jpg"] }); out.ai = r ? { ...r, ms: Date.now() - t0 } : { ok: false, ms: Date.now() - t0, err: aiStat.lastErr }; }
  // 0.1.6: is the TwitterAPI.io key itself valid? one REST lookup (15 credits) — tells "bad key" apart from "no Stream plan" when the websocket says 403
  if (CFG.TWITTER_KEY) try { const r = await fetch(`${CFG.REST}/twitter/tweets?tweet_ids=20`, { headers: { "X-API-Key": CFG.TWITTER_KEY }, signal: AbortSignal.timeout(6000) }); const j = await r.json().catch(() => ({})); out.twitterRest = { http: r.status, ok: r.ok && j.status !== "error", tweets: (j.tweets || []).length, msg: String(j.msg || j.message || "").slice(0, 120) }; } catch (e) { out.twitterRest = { ok: false, err: e.message }; }
  try { const m = await uploadMeta({ name: "Launcher Test", symbol: "LTEST", description: "test upload — not launched", img: { bytes: coinImage("Launcher Test", "LTEST"), type: "image/png", ext: "png" }, tweetUrl: "" }); out.upload = { ok: true, ms: m.ms, uri: m.uri }; } catch (e) { out.upload = { ok: false, err: e.message }; }
  st.selfTest = out; kvSet("selfTest", JSON.stringify(out)); exportNow();
}

// ---------- export to the launcher-data branch (for the chat) and status for the website ----------
const csv = (rows) => { if (!rows.length) return ""; const cols = Object.keys(rows[0]); const e = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)); return [cols.join(","), ...rows.map((r) => cols.map((c) => e(r[c])).join(","))].join("\n"); };
// 0.9.41 (owner, 7 Nov 03:48 UK: "just go ahead and fix it"): exports are STREAMED — rows come from a cursor (.iterate()) or an array and are written in ~1 MB chunks to
// <file>.tmp, renamed over the file only once complete. The whole file is never held as one string, so export memory no longer grows with the file (0.9.39 built
// ~100 MB strings and crashed on the 400 MB heap 22 times, 00:06–03:26 UK). Same bytes as csv(): header, then "\n"-joined rows, no trailing newline; no rows → empty file.
// maxBytes: stop at that size (newest rows must come first) and return {rows, bytes, truncated} so the cut is recorded, never silent.
import { streamOut, csvOut, linesOut } from "./csvout.mjs"; // 0.9.46: moved to its own module so the export worker can use it
import { Worker } from "node:worker_threads";
const exportStat = { lastMs: 0, tradesBooks: null };
// 0.9.46: the exports that read the TRACKER database (token_life 18.5 s, trades_books, tracker_tokens, feed_gaps at 04:12 UK) run in a worker thread with its own
// read-only connection, so they no longer block checks at all. One job at a time; a job that runs over 180 s is abandoned and the worker replaced (its .tmp file is
// never renamed, so no partial file is published). Worker heap capped at 512 MB.
let exportWorker = null, workerJob = 0; const workerWaits = new Map();
function inWorker(msg, ms = 180000) {
  if (!exportWorker) { exportWorker = new Worker(new URL("./exportworker.mjs", import.meta.url), { resourceLimits: { maxOldGenerationSizeMb: 512 } });
    exportWorker.on("message", (m) => { const w = workerWaits.get(m.id); if (w) { workerWaits.delete(m.id); clearTimeout(w.t); m.ok ? w.res(m.r) : w.rej(new Error(m.err)); } });
    const dead = (e) => { for (const w of workerWaits.values()) { clearTimeout(w.t); w.rej(new Error("export worker stopped: " + (e?.message || e))); } workerWaits.clear(); exportWorker = null; };
    exportWorker.on("error", dead); exportWorker.on("exit", (c) => { if (exportWorker) dead("exit " + c); }); }
  const id = ++workerJob; return new Promise((res, rej) => { const t = setTimeout(() => { workerWaits.delete(id); const w = exportWorker; exportWorker = null; try { w?.terminate(); } catch {} rej(new Error("export worker timed out")); }, ms); workerWaits.set(id, { res, rej, t }); exportWorker.postMessage({ ...msg, id, db: CFG.TRACKER_DB }); });
}
export // 0.9.14: declared at module level — 0.9.13 had it inside the !SMOKE block, so status() threw ReferenceError on every export and nothing was published for 66 min
const scopeStat = { probes: 0, fails: 0, consecutive: 0, reloads: 0, lastReload: null, lastErr: "" };
function status() {
  return { ...st, at: now(), wallet: ME.toBase58(), balanceSol: balance != null ? +sol(balance).toFixed(4) : null, liveToday: liveToday(), cap: CFG.DAILY_CAP || "none", minBalanceSol: CFG.MIN_BALANCE_SOL, tpFraction: CFG.TP_FRACTION, stakeSol: CFG.STAKE_SOL, deadMin: CFG.DEAD_MIN, quietMin: CFG.QUIET_MIN, tpX: CFG.TP_X,
    k: { ver: K_VER, ...kStat }, r3: { ver: R3_VER, ...r3Stat }, c2: { ver: C2_VER, ...c2Stat }, lut: lutStat, copies: copyStatus(), peaks: peakStat, study: studyStat, vol: volStat, mark: markStat, volBackfill: bfStat, rf: rfStat, manualStudy: manualStat, operators: opStat, creators: ctStat, fd: fdStat, snipers2: snStat, quotes: qStat, live: liveStat, chain: cfStat, farm: farmStat, scope: scopeStat, export: exportStat, registry: regStat, meas: { ledger: LEDGER_VER, fill: cfStat.mv, tracker_obs: "obs-3 (tracker 0.19.4: early checkpoints 15/30/90/120 s for every launch)" }, sweep: sweepStat, paused: kvGet("paused") === "1", pausedAt: kvGet("pausedAt"), lastSellAll: kvGet("lastSellAll"), openCoins: db.prepare("SELECT COUNT(*) n FROM launches WHERE mode='live' AND status IN ('open','selling','stuck')").get().n,
    accounts: CFG.ACCOUNTS, twitter: { keySet: !!CFG.TWITTER_KEY, ...twStat }, ai: !!CFG.AI_KEY, aiStat, meta: metaStat, rpc: rpcStats, trackerDb: !!tdb, lastSweep: kvGet("lastSweep"), lastFeeCollect: kvGet("lastFeeCollect"), phantom: PHANTOM };
}
let pushing = false, soon = null;
let exportBusy = false;
// 0.9.43: the export yields to the event loop between parts (it blocked the launcher 31–49 s per run at 03:52–03:57 UK; largest part token_life 7.6 s), so checks and
// traces run in between. Files are then read over ~30 s instead of one instant — each file is still internally consistent; cross-file joins may differ by seconds.
// exportBusy: never two exports at once (the timer, exportSoon and the study callback all call it).
async function exportNow() { if (exportBusy) return; exportBusy = true; try { await exportBody(); } finally { exportBusy = false; } }
async function exportBody() {
  const exportT0 = Date.now(); let exportPrev = exportT0; exportStat.parts = {}; const exportMark = (k) => { const t = Date.now(); exportStat.parts[k] = t - exportPrev; exportPrev = t; }; // 0.9.42: time of each export part (ms) — the whole export blocked the launcher 49 s at 03:52 UK
  try {
    csvOut(`${CFG.OUT_DIR}/launches.csv`, (db.prepare("SELECT * FROM launches ORDER BY id").iterate()));
    exportMark("launches"); await new Promise((r) => setImmediate(r));
    csvOut(`${CFG.OUT_DIR}/posts.csv`, (db.prepare("SELECT id, user, kind, text, parent_id, parent_user, parent_text, created_ms, recv_ms, ctx_ms FROM posts WHERE recv_ms>=? ORDER BY recv_ms").iterate((now() - 7 * 86400) * 1000)));
    exportMark("posts"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/copies.csv`, (db.prepare("SELECT * FROM copies ORDER BY launch_id, created_ts").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/copy_picks.csv`, (db.prepare("SELECT * FROM copy_picks ORDER BY launch_id").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/copy_peaks.csv`, (db.prepare("SELECT * FROM copy_peaks ORDER BY peak_mc DESC").iterate())); } catch {}
    exportMark("copies"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/operators.csv`, (db.prepare("SELECT * FROM operators ORDER BY coins DESC, runners DESC").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/operator_coins.csv`, (db.prepare("SELECT * FROM operator_coins ORDER BY anchor, mint").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/wallet_trace.csv`, (db.prepare("SELECT * FROM wallet_trace ORDER BY checked_ts").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/wallet_out.csv`, (db.prepare("SELECT * FROM wallet_out WHERE dest<>'' ORDER BY ts").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/snipers.csv`, (db.prepare("SELECT * FROM snipers ORDER BY coins DESC, runners DESC").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/creator_trace.csv`, (db.prepare("SELECT * FROM creator_trace WHERE create_ts>=? ORDER BY create_ts DESC").iterate(Math.floor(Date.now() / 1000) - 7 * 86400))); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/fd_watch.csv`, (db.prepare("SELECT * FROM fd_watch WHERE created_ts>=? ORDER BY created_ts DESC").iterate(Math.floor(Date.now() / 1000) - 36 * 3600))); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/fd_early.csv`, (db.prepare("SELECT * FROM fd_early WHERE created_ts>=? ORDER BY created_ts DESC").iterate(Math.floor(Date.now() / 1000) - 86400))); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/fd_sniper_stats.csv`, (db.prepare("SELECT * FROM fd_sniper_stats ORDER BY launches DESC").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/fd_quotes.csv`, (db.prepare("SELECT * FROM fd_quotes ORDER BY ts DESC LIMIT 5000").iterate())); } catch {}
    exportMark("operators"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/rf_watch.csv`, (db.prepare("SELECT * FROM rf_watch ORDER BY created_ts").iterate())); } catch {}
    exportMark("rf_watch"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/vol_paper.csv`, (db.prepare("SELECT * FROM vol_paper ORDER BY id").iterate())); } catch {}
    exportMark("vol_paper"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/live_trades.csv`, (db.prepare("SELECT * FROM live_trades ORDER BY id").iterate())); } catch {} // 0.8.17
    exportMark("live_trades"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/chain_fill.csv`, (db.prepare("SELECT * FROM chain_fill ORDER BY vol_id").iterate())); } catch {} // 0.9.0
    exportMark("chain_fill"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/fd_hgrowth.csv`, (db.prepare("SELECT * FROM fd_hgrowth ORDER BY ts").iterate())); } catch {} // 0.9.6: holder growth 60 → 120 s on the U books' coins
    exportMark("fd_hgrowth"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/buyer_funding.csv`, (db.prepare("SELECT * FROM buyer_funding WHERE ts>=? ORDER BY mint, sol_in DESC").iterate(now() - 48 * 3600))); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/buyer_funding_sum.csv`, (db.prepare("SELECT * FROM buyer_funding_sum ORDER BY ts").iterate())); } catch {} // 0.9.11
    exportMark("buyer_funding"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/farm_dumps.csv`, (db.prepare("SELECT * FROM farm_dumps ORDER BY dump_ts").iterate())); await new Promise((r) => setImmediate(r)); csvOut(`${CFG.OUT_DIR}/farm_wallets.csv`, (db.prepare("SELECT * FROM farm_wallets ORDER BY dump_ts, mint").iterate())); } catch {} // 0.9.9
    exportMark("farm"); await new Promise((r) => setImmediate(r));
    // 0.9.44: the seven ledger/registry exports one by one, each timed, yielding between them (together they blocked 27 s at 04:09 UK)
    try { csvOut(`${CFG.OUT_DIR}/fd_ledger.csv`, (fdLedger(db, tdb, 24))); } catch (e) { console.error("[export fd_ledger]", e.message); } exportMark("fd_ledger"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/fd_positions.csv`, (fdPositions(db, 24))); } catch (e) { console.error("[export fd_positions]", e.message); } exportMark("fd_positions"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/fd_inventory.csv`, (fdInventory(db, tdb, 3))); } catch (e) { console.error("[export fd_inventory]", e.message); } exportMark("fd_inventory"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/fd_coverage.csv`, (fdCoverage(db, tdb, 24))); } catch (e) { console.error("[export fd_coverage]", e.message); } exportMark("fd_coverage"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/runner_registry.csv`, (registryRows(db, 48))); } catch (e) { console.error("[export runner_registry]", e.message); } exportMark("runner_registry"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/registry_coverage.csv`, (registryCoverage(db, 48))); } catch (e) { console.error("[export registry_coverage]", e.message); } exportMark("registry_coverage"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/k_decisions.csv`, db.prepare("SELECT * FROM kpaper_decisions WHERE read_ts >= ? ORDER BY read_ts").all(Math.floor(Date.now() / 1000) - 48 * 3600)); } catch (e) { console.error("[export k_decisions]", e.message); } exportMark("k_decisions"); await new Promise((r) => setImmediate(r));
    try { csvOut(`${CFG.OUT_DIR}/r3_decisions.csv`, db.prepare("SELECT * FROM r3_decisions WHERE read_ts >= ? ORDER BY read_ts").all(Math.floor(Date.now() / 1000) - 48 * 3600)); } catch (e) { console.error("[export r3_decisions]", e.message); } exportMark("r3_decisions"); await new Promise((r) => setImmediate(r)); // 0.10.0: every R3C trigger (entered / late / graduated before read) with its diagnostics, 48 h // 0.9.58: every K-book 5-min decision (entered / late / out of band), 48 h
    try { csvOut(`${CFG.OUT_DIR}/c2_decisions.csv`, db.prepare("SELECT * FROM c2_decisions WHERE read_ts >= ? ORDER BY read_ts").all(Math.floor(Date.now() / 1000) - 48 * 3600)); } catch (e) { console.error("[export c2_decisions]", e.message); } // 0.10.1
    try { csvOut(`${CFG.OUT_DIR}/early_checkpoints.csv`, (earlyCheckpoints(tdb, 12))); } catch (e) { console.error("[export early_checkpoints]", e.message); } exportMark("early_checkpoints"); await new Promise((r) => setImmediate(r));
    try { if (tdb) { await inWorker({ path: `${CFG.OUT_DIR}/token_life.csv`, sql: "SELECT l.mint, l.cp, l.ts, l.obs_ts, l.src, l.mc, l.vol5m_usd, l.buys5m, l.sells5m, l.buyers5m, l.buyers_total, l.graduated, l.top10_pct, l.holders, l.alive FROM token_life l JOIN tokens k ON k.mint=l.mint WHERE k.create_ts>=? ORDER BY l.mint, l.cp", params: [now() - 12 * 3600] }); /* 0.9.33: 12 h (48 h was ~380k rows, ~150 MB of transient heap every export; rss hit 597 MB against the 600 MB pm2 cap at 19:48 UK) */ await inWorker({ path: `${CFG.OUT_DIR}/feed_gaps.csv`, sql: "SELECT * FROM feed_gaps ORDER BY rowid DESC LIMIT 5000", params: [] }); } } catch (e) { console.error("[export token_life]", e.message); } // 0.9.29 (Codex 18:31 UK): the lifecycle checkpoints of every launch (48 h) and the feed gaps
    exportMark("token_life"); await new Promise((r) => setImmediate(r));
    try { if (tdb) await inWorker({ path: `${CFG.OUT_DIR}/tracker_tokens.csv`, sql: "SELECT mint, name, symbol, creator, create_ts, create_slot, bundle_sol, bundle_pct, bundle_wallets, dev_buy_sol, tier, finalized, graduated, peak_mc_usd, last_mc_usd, outside_buyers, handoffs FROM tokens WHERE create_ts>=? ORDER BY create_ts", params: [now() - 48 * 3600] }); } catch (e) { console.error("[export tracker_tokens]", e.message); } // 0.9.27: the launch census (Codex: launches.csv is the X-post launcher's own record, not the tracker's)
    exportMark("tracker_tokens");
    // 0.9.48 (owner's go 7 Nov 09:12 UK, Codex audit spec 09:09): read-only COVERAGE export for the $100K outcome audit — every launch of the last 24 h
    // (tokens, including launches with NO kept trades → venue empty, n 0), per venue: first/last trade, count, largest gap between consecutive trades
    // (ordered by slot), highest price_sol with its slot/ts/sig; plus the full trades of every NEAR-$100K candidate (max price × 1e9 supply × the HIGHEST
    // SOL/USD of the window ≥ $80K — generous on purpose, so a stale or low conversion cannot drop a candidate) and the SOL/USD series. Price convention:
    // price_sol = SOL per UI token (6 decimals), mc_usd = price_sol × 1e9 × SOL/USD (tracker launch-monitor.js). Worker thread, streamed, one job at a time,
    // 180-s cap each, every 60 min (0.9.49: the first run took 186 s). No coverage claim is made here: a quiet stretch is inactivity OR a capture gap — feed_gaps.csv and the outage log decide.
    // 0.9.51 (7 Nov 14:20 UK, reliability self-fix): PAUSED by default. Since tracker 0.19.8 keeps pool trades for every launch, these window-function
    // queries over 24 h of trades spill multi-GB temp sorts to disk — "database or disk is full" at 12:25 and 13:26 UK — and a full disk would stop the
    // tracker writing trades. Re-enable only with LAUNCH_COVERAGE=1 after the per-mint (index-only) rewrite.
    if (process.env.LAUNCH_COVERAGE !== "1") { if (!exportStat.coverage?.paused) exportStat.coverage = { ...(exportStat.coverage || {}), paused: "0.9.51: temp-sort disk risk; LAUNCH_COVERAGE=1 to re-enable" }; }
    else if (tdb && Date.now() - (exportStat.coverageAt || 0) > 3600000) { exportStat.coverageAt = Date.now(); const since = now() - 24 * 3600;
      try { const t0 = Date.now(); const r1 = await inWorker({ path: `${CFG.OUT_DIR}/coverage_mints.csv`, sql: "WITH k AS (SELECT mint, create_ts, tier, graduated, finalized FROM tokens WHERE create_ts>=?), t AS (SELECT tr.mint, tr.venue, tr.ts, tr.slot, tr.sig, tr.price_sol, tr.ts - LAG(tr.ts) OVER (PARTITION BY tr.mint, tr.venue ORDER BY tr.slot, tr.rowid) AS gap FROM trades tr JOIN k ON k.mint=tr.mint), mx AS (SELECT mint, venue, price_sol, slot, ts, sig, ROW_NUMBER() OVER (PARTITION BY mint, venue ORDER BY price_sol DESC, slot) rn FROM t) SELECT k.mint, k.create_ts, k.tier, k.graduated, k.finalized, t.venue, MIN(t.ts) AS first_ts, MAX(t.ts) AS last_ts, COUNT(t.ts) AS n_trades, MAX(t.gap) AS max_gap_s, mx.price_sol AS max_price_sol, mx.slot AS max_slot, mx.ts AS max_ts, mx.sig AS max_sig, ? AS export_cutoff_ts FROM k LEFT JOIN t ON t.mint=k.mint LEFT JOIN mx ON mx.mint=t.mint AND mx.venue=t.venue AND mx.rn=1 GROUP BY k.mint, t.venue ORDER BY k.create_ts, k.mint", params: [since, now()] });
        // 0.9.49: the first $100K crossing per candidate, computed in the worker (0.9.48 exported every candidate trade: 370k rows, cut at 90 MB). Per mint: the first
        // trade whose price × 1e9 × SOL/USD AT THAT TIME (latest sol_px sample at or before it) is ≥ $100K, the trade before it (bounds the crossing time), the
        // SOL/USD used, how many trades were ≥ $100K, the highest such market cap, and the price jump vs the previous trade (a > 10× jump = suspect decode).
        const r2 = await inWorker({ path: `${CFG.OUT_DIR}/coverage_crossings.csv`, sql: "WITH k AS (SELECT mint FROM tokens WHERE create_ts>=?), hi AS (SELECT MAX(usd) u FROM sol_px WHERE ts>=?), c AS (SELECT tr.mint FROM trades tr JOIN k ON k.mint=tr.mint GROUP BY tr.mint HAVING MAX(tr.price_sol) * 1e9 * (SELECT u FROM hi) >= 80000), x AS (SELECT tr.mint, tr.venue, tr.slot, tr.ts, tr.sig, tr.price_sol, (SELECT usd FROM sol_px s WHERE s.ts<=tr.ts ORDER BY s.ts DESC LIMIT 1) AS usd, (SELECT s.ts FROM sol_px s WHERE s.ts<=tr.ts ORDER BY s.ts DESC LIMIT 1) AS usd_ts, LAG(tr.price_sol) OVER w AS prev_price_sol, LAG(tr.ts) OVER w AS prev_ts, LAG(tr.slot) OVER w AS prev_slot, LAG(tr.venue) OVER w AS prev_venue FROM trades tr JOIN c ON c.mint=tr.mint WINDOW w AS (PARTITION BY tr.mint ORDER BY tr.slot, tr.rowid)), y AS (SELECT *, price_sol * 1e9 * usd AS mc_usd, ROW_NUMBER() OVER (PARTITION BY mint ORDER BY slot) AS rn, COUNT(*) OVER (PARTITION BY mint) AS n_trades_ge_100k, MAX(price_sol * 1e9 * usd) OVER (PARTITION BY mint) AS max_mc_usd_ge_100k FROM x WHERE price_sol * 1e9 * usd >= 100000) SELECT mint, venue, slot, ts, sig, price_sol, usd AS sol_usd, usd_ts AS sol_usd_ts, ts - usd_ts AS sol_usd_age_s, mc_usd, 'price_sol x 1e9 x sol_usd; price_sol from the trade event (curve: virtual reserves; pool: swap amounts)' AS pricing, prev_venue, prev_slot, prev_ts, prev_price_sol, (CASE WHEN prev_price_sol > 0 AND price_sol / prev_price_sol > 10 THEN 1 ELSE 0 END) AS suspect_jump, n_trades_ge_100k, max_mc_usd_ge_100k FROM y WHERE rn=1 ORDER BY ts", params: [since, since] });
        const r3 = await inWorker({ path: `${CFG.OUT_DIR}/sol_usd.csv`, sql: "SELECT ts, usd FROM sol_px WHERE ts>=? ORDER BY ts", params: [since - 3600] });
        exportStat.coverage = { at: new Date().toISOString(), secs: Math.round((Date.now() - t0) / 1000), mints_rows: r1.rows, crossings: r2.rows, sol_rows: r3.rows };
      } catch (e) { exportStat.coverage = { at: new Date().toISOString(), err: String(e.message).slice(0, 160) }; console.error("[export coverage]", e.message); } }
    exportMark("coverage"); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
    try { const since = now() - 24 * 3600; csvOut(`${CFG.OUT_DIR}/fd_decisions.csv`, (db.prepare("SELECT d.*, w.created_ts, (d.ts - w.created_ts) AS decision_age_s, (w.created_ts + d.at) AS metric_cutoff_ts, (CASE WHEN d.ts - w.created_ts <= d.at + 15 THEN 'ontime' ELSE 'late' END) AS timing, (CASE WHEN d.ts >= (SELECT since_ts FROM fd_rules WHERE k='H4_EPOCH2') THEN 'h4-epoch2' ELSE 'h4-epoch1' END) AS epoch FROM fd_decisions d LEFT JOIN fd_watch w ON w.mint=d.mint WHERE d.ts>=? ORDER BY d.ts, d.mint, d.rule").iterate(since))); /* 0.9.31: decision age, cutoff, timing and epoch on EVERY decision row (abstentions and unavailable included) */ csvOut(`${CFG.OUT_DIR}/fd_wallet_state.csv`, (db.prepare("SELECT s.* FROM fd_wallet_state s JOIN (SELECT mint FROM fd_watch WHERE created_ts>=?) w ON w.mint=s.mint ORDER BY s.mint, s.at, s.sol_in DESC").iterate(now() - 12 * 3600))); } catch {} // 0.9.9
    exportMark("fd_decisions"); await new Promise((r) => setImmediate(r));
    // 0.9.7 (owner, 5 Nov 19:27 UK: "why not everything now"): the tracker already keeps every trade (wallet, slot, signature, SOL, tokens, price) of bundle tier-1 launches for 30 min,
    // and from tracker v0.19 of every launch that reaches 15 SOL of buys — the dump transactions of the books' coins. Exported for the coins entered in the last LAUNCH_TRADES_HOURS hours.
    try { if (tdb) { const hrs = Number(process.env.LAUNCH_TRADES_HOURS || 8), since = Math.floor(Date.now() / 1000) - hrs * 3600;
      const mints = db.prepare("SELECT mint, MAX(entry_ts) t FROM chain_fill WHERE entry_ts>=? GROUP BY mint ORDER BY t DESC").all(since).map((x) => x.mint); // 0.9.41: newest-entered coins first, so a size cut drops the oldest
      const q = "SELECT mint, sig, slot, ts, wallet, is_buy, sol, tokens, price_sol, recv_ms, vsol, vtok, venue FROM trades WHERE mint=? ORDER BY slot, rowid LIMIT 6000"; // 0.9.27: reserves after each trade (vsol/vtok) and receive time
      const r = await inWorker({ path: `${CFG.OUT_DIR}/trades_books.csv`, sql: q, mints, maxBytes: 90 * 1048576 }); // 0.9.46: in the worker thread // 0.9.41: GitHub refuses files over 100 MB (the 01:38–03:27 UK publishing blackout) — cut at 90 MB, recorded in status
      exportStat.tradesBooks = { hours: hrs, coins: mints.length, rows: r.rows, mb: +(r.bytes / 1048576).toFixed(1), truncated: r.truncated }; if (r.truncated) console.error(`[export trades_books] cut at 90 MB: ${r.rows} rows`); } } catch (e) { console.error("[export trades_books]", e.message); }
    exportMark("trades_books"); await new Promise((r) => setImmediate(r));
    // 0.8.14: the study files (2 MB + 20 MB, ~150 MB of heap to build) only when the study has changed or once an hour — building them every 10 min on a 300 MB pm2 limit is what restarted the launcher every 90 s on 5 Nov 00:05–01:00 UK
    if (studyStat.studied !== lastStudyExport.n || Date.now() - lastStudyExport.t > 3600000) { lastStudyExport = { n: studyStat.studied, t: Date.now() };
    try { linesOut(`${CFG.OUT_DIR}/study_coins.jsonl`, db.prepare("SELECT * FROM study_coins ORDER BY studied_ts").iterate(), (r) => JSON.stringify({ ...r, data: JSON.parse(r.data || "{}") })); linesOut(`${CFG.OUT_DIR}/study_buyers.jsonl`, db.prepare("SELECT * FROM study_buyers ORDER BY mint, rank").iterate(), (r) => JSON.stringify({ mint: r.mint, wallet: r.wallet, rank: r.rank, ...JSON.parse(r.data || "{}") })); } catch {} }
    exportMark("study"); await new Promise((r) => setImmediate(r));
    linesOut(`${CFG.OUT_DIR}/raw_events.jsonl`, db.prepare("SELECT raw FROM posts WHERE raw IS NOT NULL ORDER BY recv_ms").iterate(), (r) => r.raw);
    exportMark("raw_events"); await new Promise((r) => setImmediate(r));
    exportStat.lastMs = Date.now() - exportT0; { const m = process.memoryUsage(); exportStat.rssMb = Math.round(m.rss / 1048576); exportStat.heapMb = Math.round(m.heapUsed / 1048576); }
    try { const f = statfsSync(CFG.OUT_DIR), sz = (p) => { try { return statSync(p).size; } catch { return 0; } }; exportStat.disk = { at: new Date().toISOString(), freeGb: +(f.bavail * f.bsize / 1073741824).toFixed(2), totalGb: +(f.blocks * f.bsize / 1073741824).toFixed(2), usedPct: +(100 - 100 * f.bavail / f.blocks).toFixed(1), trackerDbGb: +((sz(CFG.TRACKER_DB) + sz(CFG.TRACKER_DB + "-wal")) / 1073741824).toFixed(2), launcherDbGb: +((sz(CFG.DB_PATH) + sz(CFG.DB_PATH + "-wal")) / 1073741824).toFixed(2) }; } catch (e) { exportStat.disk = { err: String(e.message).slice(0, 100) }; } // 0.9.51: disk visibility
    writeFileSync(`${CFG.OUT_DIR}/status.json`, JSON.stringify(status(), null, 1)); st.exports++;
    if (process.env.LAUNCH_NO_PUSH || CFG.SMOKE || pushing) return; pushing = true;
    const p0 = Date.now(); // 0.9.61 (reliability, 10 Nov 00:15 UK): pushes failed at 20:05, ~00:01 and ~00:11 with no reason recorded — 7-min limit (was 3), and the reason (timeout/kill/exit code + output tail) and duration are now kept
    execFile("bash", [new URL("../push.sh", import.meta.url).pathname], { timeout: 420000, maxBuffer: 4 << 20 }, (e, so, se) => { pushing = false; const dur = Math.round((Date.now() - p0) / 1000); st.lastPushS = dur;
      if (e) { st.pushFails = (st.pushFails || 0) + 1; st.lastPushFail = `${new Date().toISOString()} after ${dur}s ${e.killed ? "killed (" + (e.signal || "timeout") + ")" : "exit " + e.code} ${String(se || so || "").trim().split("\n").slice(-2).join(" | ").slice(0, 200)}`; }
      st.lastPush = e ? "failed: " + st.lastPushFail : "ok " + new Date().toISOString(); });
  } catch (e) { st.errors++; st.lastErr = "export: " + e.message; }
}
function exportSoon() { clearTimeout(soon); soon = setTimeout(exportNow, 90000); }

// ---------- start ----------
if (CFG.SMOKE) {
  const g = { feeRecipient: Keypair.generate().publicKey, initVTok: 1073000000000000n, initVSol: 30000000000n, initRTok: 793100000000000n, supply: 1000000000000000n, feeBps: 95, creatorFeeBps: 30, buybackFeeRecipients: [] };
  const mint = Keypair.generate().publicKey, curve = freshCurve(g, ME), q = quoteBuy(curve, g, lam(CFG.STAKE_SOL));
  const ixs = [ixCreateV2({ mint, user: ME, creator: ME, name: "Smoke Test", symbol: "SMOKE", uri: "https://example.com/x.json" }), ...ixBuy({ user: ME, mint, curve, g, spend: lam(CFG.STAKE_SOL), minTokens: q.tokens })];
  const png = coinImage("Smoke Test", "SMOKE"), n = ruleName({ ownText: "Starlink in Bolivia!", subjectText: "" });
  console.log("[launcher] smoke ok", JSON.stringify({ ver: VER, ixs: ixs.length, tokens: Number(q.tokens) / 1e6, png: png.length, name: n, trackerDb: !!tdb, twitterKey: !!CFG.TWITTER_KEY }));
  process.exit(0);
}
// 0.1.5: keys sent to the box encrypted (launcher/secrets.enc.json) are opened into /root/launcher/.env; the process then restarts so they load
try { st.inboxPublicKey = inboxPublic(); const got = inboxApply(); if (got.length) { console.log(`[launcher] keys received: ${got.join(", ")} — restarting to load them`); setTimeout(() => process.exit(0), 500); } } catch (e) { st.lastErr = "inbox: " + e.message; }
console.log(`[launcher] ${VER} up — mode ${CFG.MODE}, wallet ${ME.toBase58()}, stake ${CFG.STAKE_SOL} SOL, cap ${CFG.DAILY_CAP}/day, X stream ${CFG.TWITTER_KEY ? "on" : "OFF (no TWITTERAPI_KEY)"}, AI ${CFG.AI_KEY ? "on" : "off"}`);
startStream(onPost);
// 0.1.15: the lookup table is made (or completed) before the self-test, so the test measures the real launch size
setTimeout(async () => { if (CFG.MODE === "live") { try { const g = await global(); await ensureLut({ wallet, kvGet, kvSet, wanted: wantedFor(ME, g, TIPS.map((t) => new PublicKey(t))) }); } catch (e) { lutStat.lastErr = e.message; } } selfTest(); }, 3000); setInterval(() => { const t = st.selfTest; if (!t || t.error || !t.upload?.ok || !(t.classic?.ok || t.v3?.ok)) selfTest(); }, 1800000); // re-test every 30 min until it passes
setInterval(() => watch(), 15000);
setInterval(() => requests().catch(() => {}), 1000);
setInterval(copyJob, 300000);
setInterval(() => copyTick(db).catch(() => {}), 20000);
if (!CFG.SMOKE && Number(process.env.LAUNCH_VOL_BOOKS || 0)) { setTimeout(() => volPoll(db), 15000); setInterval(() => volPoll(db), 30000); } // 0.8.0: V300/V500/VA off (owner 4 Nov: −10…−13% on 48 trades); set LAUNCH_VOL_BOOKS=1 to run them
if (!CFG.SMOKE) { setInterval(() => volScore(db), 300000); setInterval(() => volFillExitTime(db), 60000); setInterval(() => volMark(db), 15000); setTimeout(() => volMark(db), 20000); if (process.env.LAUNCH_SHADOW_POLL === "1") setInterval(() => volQuotePoll(db), 8000); /* 0.9.3: OFF by default — the chain-side simulated fill (chainfill.mjs) replaces the Jupiter shadow poll, and a live buy was lost to a 429 at 13:01 UK; LAUNCH_SHADOW_POLL=1 turns it back on */ setInterval(() => livePoll(), 1000); /* 0.9.4: reads the chain-side stream, no Jupiter call unless selling */ setInterval(() => chainBackstop(), 30000); setTimeout(() => chainBackstop(), 25000); /* 0.9.0 */ setInterval(() => buildFarm(6), 1800000); setTimeout(() => buildFarm(12), 90000);
initRegistry(db); setTimeout(() => runRegistry(db, tdb).catch((e) => { regStat.lastErr = e.message.slice(0, 160); }), 120000); setInterval(() => runRegistry(db, tdb).catch((e) => { regStat.lastErr = e.message.slice(0, 160); }), 1800000); // 0.9.23: the runner registry, every 30 min
// 0.9.13: website self-check — the scope process hung at ~05:00 UK 6 Nov with /api/fd never answering; probe it every 2 min, reload it after two consecutive timeouts (at most once per 10 min)
setInterval(async () => { scopeStat.probes++; const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 10000);
  try { await fetch(`http://127.0.0.1:${process.env.SCOPE_PORT || 8791}/fd2`, { signal: ac.signal }); scopeStat.consecutive = 0; }
  catch (e) { scopeStat.fails++; scopeStat.consecutive++; scopeStat.lastErr = `${new Date().toISOString().slice(11, 19)} ${e.name || e.message}`.slice(0, 80);
    if (scopeStat.consecutive >= 2 && (!scopeStat.lastReload || Date.now() - scopeStat.lastReload > 600000)) { try { execSync("pm2 reload scope", { timeout: 60000, stdio: "ignore" }); scopeStat.reloads++; scopeStat.lastReload = Date.now(); scopeStat.consecutive = 0; } catch (e2) { scopeStat.lastErr = ("reload: " + e2.message).slice(0, 80); } } }
  finally { clearTimeout(tm); } }, 120000); /* 0.9.9: the farm list from the tracker's trades, every 30 min; first pass covers the last 12 h */ /* 0.8.16: mark every 15 s; 0.8.17: shadow positions quoted every 6 s and live positions every 4 s — 25 of the 30 keyless Jupiter requests a minute, the rest for entries */ setInterval(() => rfFind(db), 30000); setInterval(() => rfCheck(db), 20000); setTimeout(() => fdScan(db, tdb), 20000); setInterval(() => fdScan(db, tdb), 15000); setInterval(() => fdCheck(db, tdb), 15000); if (process.env.LAUNCH_FD_SNIPER_STATS === "1") { setInterval(() => fdSniperStats(db, tdb), 3600000); setTimeout(() => fdSniperStats(db, tdb), 90000); } /* 0.8.13: OFF — 0.8.12 restarted every 90 s exactly, on this timer (rss 270–290M vs the 300M pm2 limit, heap 30–45M) */ setTimeout(() => runSweep(db, exportNow), 60000); setInterval(exportNow, 600000); } // 0.8.2: publish every 10 min (owner 4 Nov 10:32 UK: 5–10 minute checks) // 0.4.0 / 0.5.0 / 0.8.0 (the VA backfill finished 4 Nov 05:00: 1 hit in 1,500 coins)
// 0.6.0: addresses listed in launcher/study-now.txt are studied once (newest method), 20 s after start
if (!CFG.SMOKE) setTimeout(() => { try { const done = new Set(db.prepare("SELECT mint, data FROM study_coins WHERE role='manual' AND err IS NULL").all().filter((r) => { try { return JSON.parse(r.data).v != null; } catch { return false; } }).map((r) => r.mint));
  for (const m of readFileSync(new URL("../study-now.txt", import.meta.url), "utf8").split(/\s+/).map((x) => x.trim()).filter(Boolean)) if (!done.has(m)) studyAddress(db, m, exportNow); } catch {} }, 20000);
if (!CFG.SMOKE) { const peaksThenStudy = () => { try { st.census = loadCensus(tdb); } catch {} return runStudy(db, exportNow).then(() => runOperators(db, exportNow)).then(() => creatorCensus(db, tdb, exportNow)).then(() => runPeaks(db, exportNow)); }; /* 0.7.6: the operator database first, the copycat price refresh (40 min of GMGN) last */ setTimeout(peaksThenStudy, 40000); setInterval(peaksThenStudy, 3600000); } // 0.2.2: copycat market caps, then export + push
setInterval(() => feesAndSweep(), 3600000); setTimeout(() => feesAndSweep(), 120000);
function writeStatus() { try { writeFileSync(`${CFG.OUT_DIR}/status.json`, JSON.stringify(status(), null, 1)); } catch {} }
setInterval(writeStatus, 10000);
setTimeout(exportNow, 60000); setInterval(exportNow, 1800000);
bal().catch(() => {});
