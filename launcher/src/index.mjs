// launcher 0.1.0 (owner, 24 Oct 2026 20:08–20:15 UK): "get the tweet, make the coin, put 0.05 SOL in … if no one buys within 10 minutes, sell it".
// Every post of the accounts in the owner's TwitterAPI.io Stream (originals, replies, quotes, reposts) → a name and ticker (rules, or AI when a key is set)
// → picture + metadata on IPFS → ONE transaction that creates the coin on pump.fun and makes our buy (nobody can buy before us) → watched; sold back when
// nobody else buys within 10 minutes, or when the coin goes quiet. Every post and every launch is recorded, with the copycat coins the tracker saw.
// Modes: paper (record only) | shadow (default: build + simulate every launch, sign nothing) | live (owner sets LAUNCH_MODE=live in /root/launcher/.env).
// Own pm2 app, own wallet, own database; reads the tracker's database read-only. SOL only ever leaves to the owner's Phantom (config.mjs PHANTOM).
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
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
import { initStudy, runStudy, studyStat } from "./study.mjs";
import { initVol, volPoll, volScore, volStat } from "./volpaper.mjs";

const VER = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const now = () => Math.floor(Date.now() / 1000);
mkdirSync(HOME, { recursive: true }); mkdirSync(CFG.REQ_DIR, { recursive: true }); mkdirSync(CFG.OUT_DIR, { recursive: true });
const st = { ver: VER, mode: CFG.MODE, started: new Date().toISOString(), posts: 0, ignored: 0, launches: 0, live: 0, shadowOk: 0, shadowFail: 0, uploadsFailed: 0, sells: 0, errors: 0, lastErr: "", selfTest: null, exports: 0, lastPush: "" };

// ---------- database ----------
const db = new Database(CFG.DB_PATH); db.pragma("journal_mode = WAL"); db.pragma("busy_timeout = 3000");
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
initVol(db); // 0.4.0: V300 / V500 volume paper trades (owner, 31 Oct 18:41 UK)
initStudy(db); // 0.3.0: why copycats ran (owner, 31 Oct 18:21 UK)
initPeaks(db); // 0.2.2: market caps of every copycat (owner, 31 Oct 18:06 UK)
const upd = (id, o) => { const ks = Object.keys(o); if (ks.length) db.prepare(`UPDATE launches SET ${ks.map((k) => `${k}=?`).join(", ")} WHERE id=?`).run(...ks.map((k) => (typeof o[k] === "bigint" ? o[k].toString() : o[k])), id); };
const kvGet = (k) => db.prepare("SELECT v FROM kv WHERE k=?").get(k)?.v ?? null, kvSet = (k, v) => db.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)").run(k, String(v));
let tdb = null; try { tdb = new Database(CFG.TRACKER_DB, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 2000"); } catch {}

// ---------- wallet / chain state ----------
const wallet = CFG.SMOKE ? Keypair.generate() : ensureKeypair(); // the key file is created on first start; only the public address is ever shown
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
export function status() {
  return { ...st, at: now(), wallet: ME.toBase58(), balanceSol: balance != null ? +sol(balance).toFixed(4) : null, liveToday: liveToday(), cap: CFG.DAILY_CAP || "none", minBalanceSol: CFG.MIN_BALANCE_SOL, tpFraction: CFG.TP_FRACTION, stakeSol: CFG.STAKE_SOL, deadMin: CFG.DEAD_MIN, quietMin: CFG.QUIET_MIN, tpX: CFG.TP_X,
    lut: lutStat, copies: copyStatus(), peaks: peakStat, study: studyStat, vol: volStat, paused: kvGet("paused") === "1", pausedAt: kvGet("pausedAt"), lastSellAll: kvGet("lastSellAll"), openCoins: db.prepare("SELECT COUNT(*) n FROM launches WHERE mode='live' AND status IN ('open','selling','stuck')").get().n,
    accounts: CFG.ACCOUNTS, twitter: { keySet: !!CFG.TWITTER_KEY, ...twStat }, ai: !!CFG.AI_KEY, aiStat, meta: metaStat, rpc: rpcStats, trackerDb: !!tdb, lastSweep: kvGet("lastSweep"), lastFeeCollect: kvGet("lastFeeCollect"), phantom: PHANTOM };
}
let pushing = false, soon = null;
function exportNow() {
  try {
    writeFileSync(`${CFG.OUT_DIR}/launches.csv`, csv(db.prepare("SELECT * FROM launches ORDER BY id").all()));
    writeFileSync(`${CFG.OUT_DIR}/posts.csv`, csv(db.prepare("SELECT id, user, kind, text, parent_id, parent_user, parent_text, created_ms, recv_ms, ctx_ms FROM posts WHERE recv_ms>=? ORDER BY recv_ms").all((now() - 7 * 86400) * 1000)));
    try { writeFileSync(`${CFG.OUT_DIR}/copies.csv`, csv(db.prepare("SELECT * FROM copies ORDER BY launch_id, created_ts").all())); writeFileSync(`${CFG.OUT_DIR}/copy_picks.csv`, csv(db.prepare("SELECT * FROM copy_picks ORDER BY launch_id").all())); writeFileSync(`${CFG.OUT_DIR}/copy_peaks.csv`, csv(db.prepare("SELECT * FROM copy_peaks ORDER BY peak_mc DESC").all())); } catch {}
    try { writeFileSync(`${CFG.OUT_DIR}/vol_paper.csv`, csv(db.prepare("SELECT * FROM vol_paper ORDER BY id").all())); } catch {}
    try { writeFileSync(`${CFG.OUT_DIR}/study_coins.jsonl`, db.prepare("SELECT * FROM study_coins ORDER BY studied_ts").all().map((r) => JSON.stringify({ ...r, data: JSON.parse(r.data || "{}") })).join("\n")); writeFileSync(`${CFG.OUT_DIR}/study_buyers.jsonl`, db.prepare("SELECT * FROM study_buyers ORDER BY mint, rank").all().map((r) => JSON.stringify({ mint: r.mint, wallet: r.wallet, rank: r.rank, ...JSON.parse(r.data || "{}") })).join("\n")); } catch {}
    writeFileSync(`${CFG.OUT_DIR}/raw_events.jsonl`, db.prepare("SELECT raw FROM posts WHERE raw IS NOT NULL ORDER BY recv_ms").all().map((r) => r.raw).join("\n"));
    writeFileSync(`${CFG.OUT_DIR}/status.json`, JSON.stringify(status(), null, 1)); st.exports++;
    if (process.env.LAUNCH_NO_PUSH || CFG.SMOKE || pushing) return; pushing = true;
    execFile("bash", [new URL("../push.sh", import.meta.url).pathname], { timeout: 180000 }, (e, so, se) => { pushing = false; st.lastPush = e ? "failed: " + (se || e.message).slice(0, 160) : "ok " + new Date().toISOString(); });
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
if (!CFG.SMOKE) { setTimeout(() => volPoll(db), 15000); setInterval(() => volPoll(db), 30000); setInterval(() => volScore(db), 300000); } // 0.4.0
if (!CFG.SMOKE) { const peaksThenStudy = () => runPeaks(db, exportNow).then(() => runStudy(db, exportNow)); setTimeout(peaksThenStudy, 40000); setInterval(peaksThenStudy, 3600000); } // 0.2.2: copycat market caps, then export + push
setInterval(() => feesAndSweep(), 3600000); setTimeout(() => feesAndSweep(), 120000);
function writeStatus() { try { writeFileSync(`${CFG.OUT_DIR}/status.json`, JSON.stringify(status(), null, 1)); } catch {} }
setInterval(writeStatus, 10000);
setTimeout(exportNow, 60000); setInterval(exportNow, 1800000);
bal().catch(() => {});
