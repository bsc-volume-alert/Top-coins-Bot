// radar 0.1.0 (owner, 24 Oct 2026 16:22 UK: "use GMGN, Birdeye, FOMO… bring it together… identify coins early… 100k volume in 5 minutes";
// GMGN first, Birdeye only once the volume is confirmed). Record-only: it buys nothing and changes nothing outside its own database.
//
// Trigger: the tracker's GMGN scanner already writes every Solana coin trading >= $100K in 5 minutes to tracker.db `gmgn_flags`.
// For each new flag the radar saves, with the time it was taken:
//   +0 s    GMGN token info, security, top 100 holders and top 100 traders (their tags, profit, funding); FOMO (buyers so far, followed
//           traders' buys); the tracker's launch record (bundle, dev, creator)
//   +120 s  the same again; if GMGN still shows >= $100K in 5 minutes ("confirmed"), Birdeye too (holders, top traders, security)
//   +5, 15, 30, 60, 120, 360, 1440 min   the outcome: price, market cap, 5-minute volume, holders, all-time-high price (GMGN token info)
// Labels are saved exactly as each site showed them at that moment — never looked up again later — so a test cannot use hindsight.
// Every hour the data goes to the repo's `radar-data` branch (coins, snapshots, and the tracker's whole GMGN flag history).
// 0.2.0 (owner, 16:44 UK: "come in before the crowd… build everything you can"): an EARLY trigger beside the volume one. The tracker writes every
// buy by a listed wallet to radar_hits (it sees every pump.fun / PumpSwap trade live); when RADAR_EARLY_MIN (2) listed wallets buy the same coin
// within 15 min below RADAR_EARLY_MAX_MC ($500K), the coin is snapshotted at once and 2 min later ("e0", "e2"), and its outcome followed.
// The list is the radar's own wallet memory, rebuilt hourly and dated (a wallet counts only from the moment it qualified):
//   radar  — bought before the trigger on 2+ recorded coins, and 2+ of them (half or more) went on to 3x within 6 h
//   gmgn_smart / gmgn_kol — wallets GMGN tagged smart money / KOL in a snapshot (from that snapshot's time)
//   fomo   — the traders followed in the fomo app; and the tracker adds its own proven wallets and watch list
// 0.3.0 (owner, 17:06 UK: "50k, 100k and 200k 5-minute volume… any coin under 2 million… any time scale… we buy it, hold it, put it on our
// database"): the radar reads GMGN's 5-minute volume ranking itself every 15 s (all Solana DEXes, any coin age, market cap under $2M) and marks
// each coin the moment it first trades $50K, $100K and $200K in 5 minutes. Every level (and every early trigger) is a PAPER buy at that
// moment's price; 6 h later GMGN's 1-minute / 5-minute candles score it — held 6 h, 40% trailing stop, 2x take-profit / 50% stop — after real costs.
// A short summary of the labels at the first snapshot is kept on the coin for the /radar page of the coin site.
import "./env.mjs";
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execFile } from "node:child_process";
import { gget, gmgnOn, gmStat } from "./gmgn.mjs";
import { bget, birdOn, bdStat } from "./birdeye.mjs";

const VER = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const DATA = process.env.RADAR_DATA_DIR || "/root/tracker/data";
const CONFIRM = Number(process.env.RADAR_CONFIRM_VOL5M || 100000);
const OUT_MIN = [5, 15, 30, 60, 120, 360, 1440];
const now = () => Math.floor(Date.now() / 1000);
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const PAPER_WAIT = Number(process.env.RADAR_PAPER_WAIT_S || 6 * 3600 + 180), TIERS = [50000, 100000, 200000], MAX_MC = Number(process.env.RADAR_MAX_MC || 2000000), RANK_MS = Number(process.env.RADAR_RANK_MS || 15000);
const EARLY_MIN = Number(process.env.RADAR_EARLY_MIN || 2), EARLY_MAX_MC = Number(process.env.RADAR_EARLY_MAX_MC || 500000), EARLY_MAX_H = Number(process.env.RADAR_EARLY_MAX_H || 60);
const st = { ver: VER, started: now(), hitsSeen: 0, earlyTriggers: 0, earlySkippedCap: 0, listSize: 0, flagsSeen: 0, coins: 0, snaps: 0, jobsDone: 0, jobsLate: 0, confirmed: 0, birdSnaps: 0, errors: 0, lastErr: "", lastFlagId: 0, backlog: 0, exports: 0, lastExport: 0, lastPush: "" };

// ---------- databases ----------
mkdirSync(DATA, { recursive: true });
const rdb = new Database(process.env.RADAR_DB || `${DATA}/radar.db`);
rdb.pragma("journal_mode = WAL");
rdb.exec(`CREATE TABLE IF NOT EXISTS coins (mint TEXT PRIMARY KEY, flag_id INTEGER, flag_ts INTEGER, name TEXT, symbol TEXT, launchpad TEXT, exchange TEXT, created_ts INTEGER,
    flag_vol5m REAL, flag_mc REAL, confirmed INTEGER, confirm_vol5m REAL, bird INTEGER DEFAULT 0, peak_mc REAL, last_mc REAL, ath_mc REAL);
  CREATE TABLE IF NOT EXISTS snaps (id INTEGER PRIMARY KEY AUTOINCREMENT, mint TEXT, ts INTEGER, at_s INTEGER, src TEXT, ok INTEGER, json TEXT);
  CREATE INDEX IF NOT EXISTS snaps_mint ON snaps(mint); CREATE INDEX IF NOT EXISTS snaps_ts ON snaps(ts);
  CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, mint TEXT, due INTEGER, kind TEXT, done INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS jobs_due ON jobs(done, due);
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
  CREATE TABLE IF NOT EXISTS feat (mint TEXT PRIMARY KEY, json TEXT);
  CREATE TABLE IF NOT EXISTS wallets (wallet TEXT PRIMARY KEY, src TEXT, listed_ts INTEGER, n_coins INTEGER, n_runs INTEGER, note TEXT);
  CREATE TABLE IF NOT EXISTS wallet_coin (wallet TEXT, mint TEXT, start_ts INTEGER, trigger_ts INTEGER, known_ts INTEGER, run_x REAL, PRIMARY KEY (wallet, mint));`);
rdb.exec(`CREATE TABLE IF NOT EXISTS paper (id INTEGER PRIMARY KEY AUTOINCREMENT, mint TEXT, trig TEXT, entry_ts INTEGER, entry_price REAL, entry_mc REAL, exchange TEXT, curve INTEGER,
    done INTEGER DEFAULT 0, x5 REAL, x15 REAL, x60 REAL, peak60 REAL, peak360 REAL, low_before_peak REAL, x_hold REAL, x_trail40 REAL, x_tp2sl50 REAL, r_hold REAL, r_trail40 REAL, r_tp2sl50 REAL, candles INTEGER, err TEXT, UNIQUE(mint, trig));`);
for (const c of ["t50 INTEGER", "t100 INTEGER", "t200 INTEGER", "mc50 REAL", "mc100 REAL", "mc200 REAL", "sum0 TEXT", "trig TEXT", "vol_ts INTEGER", "early_ts INTEGER", "early_n INTEGER", "early_mc REAL", "early_wallets TEXT", "base_mc REAL", "wc_done INTEGER DEFAULT 0"]) { try { rdb.exec(`ALTER TABLE coins ADD COLUMN ${c}`); } catch {} }
try { rdb.exec("ALTER TABLE snaps ADD COLUMN kind TEXT"); } catch {}
rdb.exec("UPDATE coins SET trig='vol', vol_ts=flag_ts WHERE trig IS NULL AND flag_id IS NOT NULL");
const kvGet = (k) => rdb.prepare("SELECT v FROM kv WHERE k=?").get(k)?.v ?? null, kvSet = (k, v) => rdb.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)").run(k, String(v));
let tdb = null, fdb = null;
function openRO(path) { try { return existsSync(path) ? new Database(path, { readonly: true, fileMustExist: true }) : null; } catch (e) { console.log("[radar] cannot open", path, e.message); return null; } }
const tAll = (sql, ...a) => { try { return tdb ? tdb.prepare(sql).all(...a) : []; } catch (e) { st.lastErr = "tracker db: " + e.message; return []; } };
const fAll = (sql, ...a) => { try { return fdb ? fdb.prepare(sql).all(...a) : []; } catch { return []; } };

// ---------- trimming: keep what a test needs, drop pictures and long text ----------
function clean(o, depth = 0) {
  if (o == null || typeof o !== "object") return typeof o === "string" && o.length > 200 ? o.slice(0, 200) : o;
  if (Array.isArray(o)) return o.slice(0, 120).map((x) => clean(x, depth + 1));
  const r = {}; for (const [k, v] of Object.entries(o)) { if (/logo|avatar|banner|image|pfp|description|twitter|website|telegram|discord|link|url/i.test(k)) continue; r[k] = depth > 6 ? undefined : clean(v, depth + 1); } return r;
}
const KEEP_W = ["address", "addr_type", "amount_percentage", "tags", "maker_token_tags", "wallet_tag_v2", "is_new", "is_suspicious", "buy_volume_cur", "sell_volume_cur", "buy_tx_count_cur", "sell_tx_count_cur",
  "profit", "realized_profit", "unrealized_profit", "avg_cost", "avg_sold", "sell_amount_percentage", "start_holding_at", "end_holding_at", "last_active_timestamp", "native_balance", "created_at",
  "history_transfer_in_amount", "history_transfer_out_amount", "transfer_in_count", "transfer_out_count", "is_on_curve", "exchange"];
const slimW = (w) => { const r = {}; for (const k of KEEP_W) if (w[k] != null) r[k] = w[k]; if (w.native_transfer) r.native_transfer = { name: w.native_transfer.name || null, from: w.native_transfer.from_address || w.native_transfer.address || null, amount: w.native_transfer.amount ?? null, ts: w.native_transfer.timestamp ?? null }; return r; };
const listOf = (d) => (d?.list || (Array.isArray(d) ? d : [])).filter((w) => w && w.address);
const N = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
function mcOf(info) { const p = N(info?.price?.price ?? info?.price), s = N(info?.circulating_supply ?? info?.total_supply); return p != null && s != null ? p * s : null; }
const vol5Of = (info) => N(info?.price?.volume_5m);

// ---------- one snapshot ----------
const qSnap = rdb.prepare("INSERT INTO snaps (mint, ts, at_s, src, ok, json, kind) VALUES (?, ?, ?, ?, ?, ?, ?)");
let curKind = null; // the job being run (v0, v2, e0, e2, out…) — stored with each snapshot
const save = (mint, flagTs, src, ok, obj) => { const t = now(); qSnap.run(mint, t, t - flagTs, src, ok ? 1 : 0, JSON.stringify(obj), curKind); st.snaps++; };
const safe = (p) => p.catch((e) => ({ _err: e.message }));
async function gmgnSnap(mint) {
  const [info, sec, hold, trad] = await Promise.all([safe(gget("/v1/token/info", { chain: "sol", address: mint })), safe(gget("/v1/token/security", { chain: "sol", address: mint })),
    safe(gget("/v1/market/token_top_holders", { chain: "sol", address: mint, limit: "100" })), safe(gget("/v1/market/token_top_traders", { chain: "sol", address: mint, limit: "100" }))]);
  return { info: info?._err ? info : clean(info), sec: sec?._err ? sec : clean(sec), holders: hold?._err ? hold : listOf(hold).map(slimW), traders: trad?._err ? trad : listOf(trad).map(slimW) };
}
function fomoSnap(mint, upTo) {
  if (!fdb) return { _err: "fomo database not available" };
  const buyers = fAll("SELECT COUNT(*) n, MIN(ts) first FROM buyers_seen WHERE mint=? AND ts<=?", mint, upTo)[0] || {};
  const follow = fAll("SELECT handle, wallet, side, usd, ts, mc_at FROM wallet_trades WHERE mint=? AND ts<=? ORDER BY ts LIMIT 100", mint, upTo);
  const flow = fAll("SELECT win, ts, rank, buyers, buy_usd, net_usd, mc FROM ff WHERE mint=? AND ts<=? ORDER BY ts DESC LIMIT 10", mint, upTo);
  const legs = fAll("SELECT side, COUNT(*) n, SUM(usd) usd, MIN(ts) first FROM flow WHERE mint=? AND ts<=? GROUP BY side", mint, upTo); // every fomo-app swap on this coin so far
  return { buyers: buyers.n || 0, firstBuyerTs: buyers.first ?? null, followedTrades: follow, flowRanks: flow, legs };
}
function trackerSnap(mint) {
  const tok = tAll("SELECT * FROM tokens WHERE mint=?", mint)[0] || null;
  return { seen: !!tok, token: tok, life: tok ? tAll("SELECT * FROM token_life WHERE mint=? ORDER BY cp", mint) : [], cluster: tok ? tAll("SELECT wallet, role, tokens, sol_in, first_slot, funder, wallet_age_s FROM cluster_wallets WHERE mint=?", mint) : [] };
}
async function birdSnap(mint) {
  const [holders, traders, sec] = await Promise.all([safe(bget("/defi/v3/token/holder", { address: mint, offset: "0", limit: "100" })),
    safe(bget("/defi/v2/tokens/top_traders", { address: mint, time_frame: "1h", sort_type: "desc", sort_by: "volume", offset: "0", limit: "10" })),
    safe(bget("/defi/token_security", { address: mint }))]);
  return { holders: holders?._err ? holders : clean(holders), traders: traders?._err ? traders : clean(traders), sec: sec?._err ? sec : clean(sec) };
}

// a short summary of the labels at the first snapshot (for the /radar page)
function summary(g, fm) { const i = g.info || {}, s = i.stat || {}, w = i.wallet_tags_stat || {}, dv = i.dev || {}, P = (x) => (N(x) == null ? null : +(N(x) * 100).toFixed(1));
  return { top10: P(s.top_10_holder_rate), dev: P(s.dev_team_hold_rate ?? s.creator_hold_rate), bundler: P(s.top_bundler_trader_percentage), insider: P(s.top_rat_trader_percentage), fresh: P(s.fresh_wallet_rate),
    bots: P(s.bot_degen_rate), phishing: P(s.top_entrapment_trader_percentage), sniperHold: P(s.top70_sniper_hold_rate), smart: N(w.smart_wallets), kol: N(w.renowned_wallets), snipers: N(w.sniper_wallets), bundlers: N(w.bundler_wallets),
    holders: N(i.holder_count), devLaunches: N(dv.creator_open_count ?? s.creator_created_count), devStatus: dv.creator_token_status ?? null, liq: N(i.liquidity), launchpad: i.launchpad ?? null, cto: dv.cto_flag ?? null,
    dexPaid: dv.dexscr_ad ?? null, rug: N(g.sec?.rug_ratio), fomoBuyers: fm?.buyers ?? null, fomoFollowed: (fm?.followedTrades || []).filter((x) => x.side === "buy").length }; }
// paper result 6 h after entry, from GMGN's candles (1-minute for the first 100 min, 5-minute after), after real costs
const realX = (x, curve) => (curve ? x * 0.97 - 0.02 - 1 - 0.02 - (x <= 0.62 ? 0.01 : 0) : x / 1.02 * 0.967 - 1 - 0.006 - 0.02 - (x <= 0.62 ? 0.05 : 0));
async function scorePaper(mint) {
  for (const p of rdb.prepare("SELECT * FROM paper WHERE mint=? AND done=0 AND entry_ts<=?").all(mint, now() - PAPER_WAIT + 180)) {
    try { const e = p.entry_ts, k = async (res, from, to) => { const d = await gget("/v1/market/token_kline", { chain: "sol", address: mint, resolution: res, from: String(from * 1000), to: String(to * 1000) }); return (d?.list || (Array.isArray(d) ? d : [])).map((c) => ({ t: Math.floor(Number(c.time) / 1000), o: N(c.open), h: N(c.high), l: N(c.low), c: N(c.close) })).filter((c) => c.h > 0); };
      const m1 = await k("1m", e, e + 100 * 60), m5 = await k("5m", e, e + 6 * 3600), last1 = m1.length ? Math.max(...m1.map((c) => c.t)) : e;
      const path = [...m1, ...m5.filter((c) => c.t > last1)].filter((c) => c.t >= e - 60 && c.t <= e + 6 * 3600).sort((a, b) => a.t - b.t);
      if (!path.length) { rdb.prepare("UPDATE paper SET done=1, err=? WHERE id=?").run("no candles", p.id); continue; }
      const X = (v) => v / p.entry_price, at = (min) => { const c = [...path].reverse().find((x) => x.t <= e + min * 60); return c ? X(c.c) : null; };
      let peak = 0, peakI = 0, p60 = 0; path.forEach((c, i) => { if (X(c.h) > peak) { peak = X(c.h); peakI = i; } if (c.t <= e + 3600) p60 = Math.max(p60, X(c.h)); });
      const lowBefore = Math.min(...path.slice(0, peakI + 1).map((c) => X(c.l)));
      let hi = 1, trail = null; for (const c of path) { if (X(c.l) <= hi * 0.6) { trail = hi * 0.6; break; } hi = Math.max(hi, X(c.h)); } if (trail == null) trail = X(path[path.length - 1].c);
      let tp = null; for (const c of path) { if (X(c.l) <= 0.5) { tp = 0.5; break; } if (X(c.h) >= 2) { tp = 2; break; } } if (tp == null) tp = X(path[path.length - 1].c); // stop checked first in a candle: the worse case
      const hold = X(path[path.length - 1].c), cv = p.curve === 1;
      rdb.prepare(`UPDATE paper SET done=1, x5=?, x15=?, x60=?, peak60=?, peak360=?, low_before_peak=?, x_hold=?, x_trail40=?, x_tp2sl50=?, r_hold=?, r_trail40=?, r_tp2sl50=?, candles=? WHERE id=?`)
        .run(at(5), at(15), at(60), p60, peak, lowBefore, hold, trail, tp, realX(hold, cv), realX(trail, cv), realX(tp, cv), path.length, p.id); st.paperScored = (st.paperScored || 0) + 1;
    } catch (er) { if (/rate limited/i.test(er.message)) throw er; rdb.prepare("UPDATE paper SET done=1, err=? WHERE id=?").run(er.message.slice(0, 120), p.id); } }
}

// ---------- jobs ----------
const qCoin = rdb.prepare(`INSERT OR IGNORE INTO coins (mint, flag_id, flag_ts, name, symbol, launchpad, exchange, created_ts, flag_vol5m, flag_mc) VALUES (?,?,?,?,?,?,?,?,?,?)`);
const qJob = rdb.prepare("INSERT INTO jobs (mint, due, kind) VALUES (?, ?, ?)");
function pollFlags() {
  if (!tdb) tdb = openRO(process.env.TRACKER_DB || `${DATA}/tracker.db`); if (!fdb) fdb = openRO(process.env.FOMO_DB_PATH || `${DATA}/fomo.db`);
  if (!tdb) return;
  let last = Number(kvGet("lastFlag") ?? NaN);
  if (!isFinite(last)) { last = tAll("SELECT COALESCE(MAX(id), 0) m FROM gmgn_flags")[0]?.m ?? 0; kvSet("lastFlag", last); console.log("[radar] starting after GMGN flag", last); } // new flags only; the history is exported as it is
  const rows = tAll("SELECT id, chain, mint, ts, name, symbol, exchange, launchpad, created_ts, vol5m, mc FROM gmgn_flags WHERE id > ? ORDER BY id LIMIT 300", last);
  const tx = rdb.transaction(() => { for (const r of rows) { st.flagsSeen++; last = r.id; if ((r.chain || "sol") !== "sol") continue;
      if (qCoin.run(r.mint, r.id, r.ts, r.name, r.symbol, r.launchpad, r.exchange, r.created_ts, r.vol5m, r.mc).changes) { st.coins++;
        rdb.prepare("UPDATE coins SET trig='vol', vol_ts=? WHERE mint=?").run(r.ts, r.mint);
        qJob.run(r.mint, r.ts, "v0"); qJob.run(r.mint, r.ts + 120, "v2"); for (const m of OUT_MIN) qJob.run(r.mint, r.ts + m * 60, "out" + m); }
      else { const c = rdb.prepare("SELECT vol_ts FROM coins WHERE mint=?").get(r.mint); // flagged early first: add the volume snapshots, keep the outcomes already planned
        if (c && c.vol_ts == null) { rdb.prepare("UPDATE coins SET vol_ts=?, flag_id=?, flag_vol5m=?, flag_mc=?, name=COALESCE(name, ?), symbol=COALESCE(symbol, ?), launchpad=COALESCE(launchpad, ?), created_ts=COALESCE(created_ts, ?) WHERE mint=?").run(r.ts, r.id, r.vol5m, r.mc, r.name, r.symbol, r.launchpad, r.created_ts, r.mint);
          qJob.run(r.mint, r.ts, "v0"); qJob.run(r.mint, r.ts + 120, "v2"); } } }
    kvSet("lastFlag", last); });
  tx(); st.lastFlagId = last;
}
// GMGN's 5-minute volume ranking: tiers $50K / $100K / $200K, market cap under $2M, any age
const qPaper = rdb.prepare("INSERT OR IGNORE INTO paper (mint, trig, entry_ts, entry_price, entry_mc, exchange, curve) VALUES (?,?,?,?,?,?,?)");
function paperBuy(mint, trig, ts, price, mc, exchange) { if (!(price > 0)) return; const curve = exchange ? (/^pump(fun|_fun)?$|bonding|curve/i.test(exchange) ? 1 : 0) : null;
  if (qPaper.run(mint, trig, ts, price, mc, exchange || null, curve).changes) { qJob.run(mint, ts + PAPER_WAIT, "paper"); st.paperBuys = (st.paperBuys || 0) + 1; } }
async function pollRank() {
  if (!gmgnOn()) return; const d = await gget("/v1/market/rank", { chain: "sol", interval: "5m", order_by: "volume", limit: "100" });
  const rows = Array.isArray(d?.rank) ? d.rank : Array.isArray(d) ? d : []; st.rankPolls = (st.rankPolls || 0) + 1; st.rankRows = rows.length; const t = now();
  for (const r of rows) { const mint = r.address, v5 = N(r.volume), mc = N(r.market_cap), px = N(r.price); if (!mint || !(mc > 0) || mc > MAX_MC || !(v5 >= TIERS[0])) continue;
    let c = rdb.prepare("SELECT mint, t50, t100, t200, flag_ts FROM coins WHERE mint=?").get(mint);
    if (!c) { rdb.prepare("INSERT INTO coins (mint, flag_ts, name, symbol, launchpad, exchange, created_ts, flag_vol5m, flag_mc, trig, vol_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(mint, t, r.name ?? null, r.symbol ?? null, r.launchpad_platform ?? null, r.exchange ?? null, N(r.creation_timestamp), v5, mc, "vol" + Math.round(TIERS.filter((x) => v5 >= x).pop() / 1000), t);
      st.coins++; qJob.run(mint, t, "v0"); qJob.run(mint, t + 120, "v2"); for (const m of OUT_MIN) qJob.run(mint, t + m * 60, "out" + m); c = { mint, flag_ts: t }; }
    for (const tier of TIERS) { const k = Math.round(tier / 1000); if (v5 >= tier && c["t" + k] == null) { rdb.prepare(`UPDATE coins SET t${k}=?, mc${k}=? WHERE mint=?`).run(t, mc, mint); c["t" + k] = t;
        paperBuy(mint, "v" + k, t, px, mc, r.exchange); if (c.flag_ts !== t && tier > TIERS[0]) qJob.run(mint, t, "t" + k); } } } // a later level gets its own snapshot
}
// early trigger: listed wallets buying (tracker.db radar_hits)
const recentHits = new Map(); // mint -> [{wallet, ts, mc, src}]
function pollHits() {
  if (!tdb) return; let last = Number(kvGet("lastHit") ?? NaN);
  if (!isFinite(last)) { last = tAll("SELECT COALESCE(MAX(id), 0) m FROM radar_hits")[0]?.m ?? 0; kvSet("lastHit", last); }
  const rows = tAll("SELECT id, mint, ts, wallet, sol, mc, age_s, venue, src FROM radar_hits WHERE id > ? ORDER BY id LIMIT 2000", last); if (!rows.length) return;
  const t = now(), hourAgo = t - 3600;
  for (const r of rows) { last = r.id; st.hitsSeen++; const l = recentHits.get(r.mint) || []; l.push(r); recentHits.set(r.mint, l.filter((x) => x.ts >= r.ts - 900));
    const ws = [...new Map(recentHits.get(r.mint).map((x) => [x.wallet, x])).values()];
    if (ws.length < EARLY_MIN || (r.mc != null && r.mc > EARLY_MAX_MC)) continue;
    const c = rdb.prepare("SELECT early_ts FROM coins WHERE mint=?").get(r.mint); if (c && c.early_ts != null) continue;
    const firedH = rdb.prepare("SELECT COUNT(*) n FROM coins WHERE early_ts>=?").get(hourAgo).n; if (firedH >= EARLY_MAX_H) { st.earlySkippedCap++; continue; }
    const tok = tAll("SELECT name, symbol, create_ts FROM tokens WHERE mint=?", r.mint)[0] || {};
    const desc = JSON.stringify(ws.map((x) => ({ w: x.wallet, src: x.src, ts: x.ts, sol: x.sol, mc: x.mc, age: x.age_s, venue: x.venue })));
    if (!c) { rdb.prepare("INSERT INTO coins (mint, flag_ts, name, symbol, launchpad, created_ts, trig, early_ts, early_n, early_mc, early_wallets) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(r.mint, t, tok.name || null, tok.symbol || null, null, tok.create_ts || null, "early", t, ws.length, r.mc, desc);
      st.coins++; qJob.run(r.mint, t, "e0"); qJob.run(r.mint, t + 120, "e2"); for (const m of OUT_MIN) qJob.run(r.mint, t + m * 60, "out" + m); }
    else rdb.prepare("UPDATE coins SET early_ts=?, early_n=?, early_mc=?, early_wallets=? WHERE mint=?").run(t, ws.length, r.mc, desc, r.mint); // already flagged on volume: noted, no extra snapshots
    st.earlyTriggers++; }
  kvSet("lastHit", last); if (recentHits.size > 5000) for (const [m, l] of recentHits) if (l[l.length - 1].ts < t - 900) recentHits.delete(m);
}
const qDue = rdb.prepare("SELECT j.id, j.mint, j.due, j.kind, c.flag_ts FROM jobs j JOIN coins c ON c.mint=j.mint WHERE j.done=0 AND j.due<=? ORDER BY CASE WHEN j.kind LIKE 'out%' THEN 1 ELSE 0 END, j.due LIMIT 1");
const qDone = rdb.prepare("UPDATE jobs SET done=1 WHERE id=?");
async function runJob(j) {
  const late = now() - j.due; if (late > 60) st.jobsLate++;
  const kind = j.kind === "snap0" ? "v0" : j.kind === "snap2" ? "v2" : j.kind; curKind = kind;
  if (kind === "paper") { await scorePaper(j.mint); qDone.run(j.id); st.jobsDone++; return; }
  if (/^([ve][02]|t\d+)$/.test(kind)) {
    const g = await gmgnSnap(j.mint); save(j.mint, j.flag_ts, "gmgn", !g.info?._err, g);
    save(j.mint, j.flag_ts, "fomo", true, fomoSnap(j.mint, now()));
    if (kind.endsWith("0")) save(j.mint, j.flag_ts, "tracker", true, trackerSnap(j.mint));
    if (kind === "e0" && !g.info?._err) paperBuy(j.mint, "early", now(), N(g.info?.price?.price), mcOf(g.info), g.info?.pool?.exchange || (N(g.info?.launchpad_progress) != null && N(g.info.launchpad_progress) < 1 ? "pump" : null));
    if (kind === "v0" || kind === "e0") { const fm = fomoSnap(j.mint, now()); rdb.prepare("UPDATE coins SET sum0=COALESCE(sum0, ?) WHERE mint=?").run(JSON.stringify(summary(g, fm)), j.mint); }
    const mc0 = mcOf(g.info); if (mc0 != null) rdb.prepare("UPDATE coins SET base_mc=COALESCE(base_mc, ?) WHERE mint=?").run(mc0, j.mint); // market cap at the first snapshot = the price a trade would have paid
    if (!g.info?._err) rdb.prepare("UPDATE coins SET name=COALESCE(name, ?), symbol=COALESCE(symbol, ?), launchpad=COALESCE(launchpad, ?), created_ts=COALESCE(created_ts, ?) WHERE mint=?").run(g.info?.name ?? null, g.info?.symbol ?? null, g.info?.launchpad ?? null, N(g.info?.creation_timestamp), j.mint);
    if (kind === "v2") { const v5 = vol5Of(g.info), ok = v5 != null && v5 >= CONFIRM;
      rdb.prepare("UPDATE coins SET confirmed=?, confirm_vol5m=? WHERE mint=?").run(ok ? 1 : 0, v5, j.mint);
      if (ok) { st.confirmed++; if (birdOn()) { const b = await birdSnap(j.mint); save(j.mint, j.flag_ts, "birdeye", !(b.holders?._err && b.traders?._err), b); rdb.prepare("UPDATE coins SET bird=1 WHERE mint=?").run(j.mint); st.birdSnaps++; } } }
  } else { // outcome
    const info = await gget("/v1/token/info", { chain: "sol", address: j.mint }).catch((e) => ({ _err: e.message }));
    const mc = mcOf(info), ath = N(info?.ath_price) != null && N(info?.circulating_supply) != null ? N(info.ath_price) * N(info.circulating_supply) : null;
    save(j.mint, j.flag_ts, "out", !info?._err, info?._err ? info : { min: Number(j.kind.slice(3)), mc, price: N(info?.price?.price), vol5m: vol5Of(info), vol1h: N(info?.price?.volume_1h), holders: N(info?.holder_count), athMc: ath, liquidity: N(info?.liquidity) });
    if (mc != null) rdb.prepare("UPDATE coins SET last_mc=?, peak_mc=MAX(COALESCE(peak_mc, 0), ?), ath_mc=COALESCE(?, ath_mc) WHERE mint=?").run(mc, mc, ath, j.mint);
  }
  qDone.run(j.id); st.jobsDone++;
}
async function worker() {
  for (;;) {
    let j = null;
    try { j = qDue.get(now()); st.backlog = rdb.prepare("SELECT COUNT(*) n FROM jobs WHERE done=0 AND due<=?").get(now()).n; } catch (e) { st.lastErr = e.message; }
    if (!j) { await nap(2000); continue; }
    try { await runJob(j); } catch (e) { st.errors++; st.lastErr = `${j.kind}: ${e.message}`.slice(0, 200); if (/rate limited/i.test(e.message)) await nap(5000); else qDone.run(j.id); }
  }
}

// ---------- hourly export to the repo (radar-data branch) ----------
function csv(rows) { if (!rows.length) return ""; const cols = Object.keys(rows[0]); const q = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return cols.join(",") + "\n" + rows.map((r) => cols.map((c) => q(r[c])).join(",")).join("\n") + "\n"; }
// one row per coin: every number each source gave at +0 s / +120 s, the tag shares of GMGN's top holders and traders, FOMO's counts, the tracker's
// launch record and the outcomes — flattened, so the analysis can test any column without re-reading the raw snapshots
function flat(o, pre, out, depth = 0) { if (o == null || depth > 4) return out; if (typeof o !== "object") { const n = N(o); if (n != null) out[pre] = n; else if (typeof o === "boolean") out[pre] = o ? 1 : 0; else if (typeof o === "string" && o.length <= 40 && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(o)) out[pre] = o; return out; }
  if (Array.isArray(o)) return out; for (const [k, v] of Object.entries(o)) flat(v, pre ? pre + "." + k : k, out, depth + 1); return out; }
const TAGS = ["bundler", "sniper", "rat_trader", "dev_team", "creator", "dev", "fresh_wallet", "smart_degen", "renowned", "whale", "top_holder", "transfer_in", "paper_hand", "diamond_hands", "sandwich_bot", "pump_smart"];
function walletSummary(list, pre, out) { if (!Array.isArray(list)) { out[pre + "err"] = 1; return; } const real = list.filter((w) => Number(w.addr_type) !== 2), tg = (w) => [...(w.tags || []), ...(w.maker_token_tags || [])];
  const P = (w) => Number(w.amount_percentage) || 0; out[pre + "n"] = real.length; out[pre + "top10"] = +(real.slice(0, 10).reduce((a, w) => a + P(w), 0) * 100).toFixed(3); out[pre + "largest"] = real[0] ? +(P(real[0]) * 100).toFixed(3) : null;
  for (const t of TAGS) { const m = real.filter((w) => tg(w).includes(t)); out[pre + t + "_n"] = m.length; out[pre + t + "_pct"] = +(m.reduce((a, w) => a + P(w), 0) * 100).toFixed(3); }
  const isNew = real.filter((w) => w.is_new); out[pre + "new_n"] = isNew.length; out[pre + "new_pct"] = +(isNew.reduce((a, w) => a + P(w), 0) * 100).toFixed(3);
  out[pre + "suspicious_n"] = real.filter((w) => w.is_suspicious).length; out[pre + "soldout_n"] = real.filter((w) => Number(w.sell_amount_percentage) >= 0.99).length;
  const ex = {}; for (const w of real) { const n = w.native_transfer?.name; if (n) ex[n] = (ex[n] || 0) + 1; } out[pre + "exchange_funded_n"] = Object.values(ex).reduce((a, x) => a + x, 0); out[pre + "exchange_top"] = Object.entries(ex).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const prof = real.map((w) => N(w.profit)).filter((x) => x != null); out[pre + "profit_sum"] = prof.length ? Math.round(prof.reduce((a, x) => a + x, 0)) : null; out[pre + "in_profit_n"] = prof.filter((x) => x > 0).length; }
const qFeat = rdb.prepare("SELECT ts, at_s, src, ok, json, kind FROM snaps WHERE mint=? ORDER BY id");
function features(c) {
  const ew = (() => { try { return JSON.parse(c.early_wallets || "[]"); } catch { return []; } })(), bySrc = {}; for (const x of ew) bySrc[x.src] = (bySrc[x.src] || 0) + 1;
  const f = { t50: c.t50, t100: c.t100, t200: c.t200, mc50: c.mc50, mc100: c.mc100, mc200: c.mc200, mint: c.mint, name: c.name, symbol: c.symbol, launchpad: c.launchpad, exchange: c.exchange, trig: c.trig, vol_ts: c.vol_ts, early_ts: c.early_ts, early_n: c.early_n, early_mc: c.early_mc, early_srcs: Object.entries(bySrc).map(([k, v]) => k + ":" + v).join(" "), base_mc: c.base_mc, flag_ts: c.flag_ts, created_ts: c.created_ts, age_at_flag_s: c.created_ts ? c.flag_ts - c.created_ts : null, flag_vol5m: c.flag_vol5m, flag_mc: c.flag_mc, confirmed: c.confirmed, confirm_vol5m: c.confirm_vol5m, bird: c.bird, peak_mc: c.peak_mc, last_mc: c.last_mc, ath_mc: c.ath_mc };
  const seen = {}; for (const r of qFeat.all(c.mint)) { const d = JSON.parse(r.json), stage = r.kind && /^[ve][02]$/.test(r.kind) ? r.kind : (seen[r.src] ? "v2" : "v0"), k = r.src === "gmgn" || r.src === "fomo" ? stage + "." + r.src : r.src === "out" ? "out" + (d.min ?? "") : r.src; seen[r.src] = (seen[r.src] || 0) + 1;
    f[k + "_at_s"] = r.at_s;
    if (r.src === "gmgn") { flat(d.info, k + ".info", f); flat(d.sec, k + ".sec", f); walletSummary(d.holders, k + ".h.", f); walletSummary(d.traders, k + ".t.", f); }
    else if (r.src === "fomo") { f[k + ".buyers"] = d.buyers; f[k + ".followed_buys"] = (d.followedTrades || []).filter((x) => x.side === "buy").length; f[k + ".followed_handles"] = [...new Set((d.followedTrades || []).map((x) => x.handle))].join(" ").slice(0, 120);
      for (const l of d.legs || []) { f[k + "." + l.side + "_n"] = l.n; f[k + "." + l.side + "_usd"] = Math.round(l.usd || 0); } f[k + ".best_rank"] = (d.flowRanks || []).reduce((m, x) => Math.min(m, x.rank ?? 1e9), 1e9); if (f[k + ".best_rank"] === 1e9) f[k + ".best_rank"] = null; }
    else if (r.src === "tracker") { f["t.seen"] = d.seen ? 1 : 0; if (d.token) for (const x of ["bundle_pct", "bundle_sol", "bundle_wallets", "dev_buy_sol", "tier", "factory", "has_socials", "creator_age_s", "creator_funded_sol", "graduated", "outside_buyers"]) f["t." + x] = d.token[x]; f["t.cluster_n"] = (d.cluster || []).length; }
    else if (r.src === "birdeye") { flat(d.sec, "b.sec", f); const hl = d.holders?.items || d.holders?.list || (Array.isArray(d.holders) ? d.holders : null); f["b.holders_n"] = hl ? hl.length : null; f["b.holders_err"] = d.holders?._err ? 1 : 0;
      const tl = d.traders?.items || d.traders?.list || (Array.isArray(d.traders) ? d.traders : null); f["b.traders_n"] = tl ? tl.length : null; f["b.traders_err"] = d.traders?._err ? 1 : 0; if (tl) flat(tl[0], "b.trader1", f); }
    else if (r.src === "out") { for (const x of ["mc", "vol5m", "holders", "athMc", "liquidity"]) f[k + "." + x] = d[x] ?? null; } }
  return f;
}
let pushing = false;
// ---------- the wallet memory (hourly) ----------
const qWC = rdb.prepare("INSERT OR IGNORE INTO wallet_coin (wallet, mint, start_ts, trigger_ts, known_ts, run_x) VALUES (?,?,?,?,?,?)");
const qW = rdb.prepare(`INSERT INTO wallets (wallet, src, listed_ts, n_coins, n_runs, note) VALUES (?,?,?,?,?,?)
  ON CONFLICT(wallet) DO UPDATE SET n_coins=COALESCE(excluded.n_coins, wallets.n_coins), n_runs=COALESCE(excluded.n_runs, wallets.n_runs), note=COALESCE(wallets.note, excluded.note), src=CASE WHEN wallets.listed_ts<=excluded.listed_ts THEN wallets.src ELSE excluded.src END, listed_ts=MIN(wallets.listed_ts, excluded.listed_ts)`);
const botLike = (w) => (Number(w.buy_tx_count_cur) || 0) > 30 || [...(w.tags || []), ...(w.maker_token_tags || [])].includes("sandwich_bot");
function buildWallets() {
  const t = now(), RUN_X = Number(process.env.RADAR_RUN_X || 3);
  // 1. coins whose 6-hour outcome is in: who held or traded before the trigger, and did the coin reach RUN_X times its market cap at the first snapshot within 6 h
  const ready = rdb.prepare("SELECT mint, flag_ts, base_mc FROM coins WHERE wc_done=0 AND flag_ts<=? AND base_mc>0").all(t - 6 * 3600 - 300);
  const tx = rdb.transaction(() => { for (const c of ready) {
    let peak = 0; for (const r of rdb.prepare("SELECT json FROM snaps WHERE mint=? AND src='out'").all(c.mint)) { const d = JSON.parse(r.json); if ((d.min ?? 1e9) <= 360 && d.mc > peak) peak = d.mc; }
    const runX = peak / c.base_mc, known = c.flag_ts + 6 * 3600;
    for (const r of rdb.prepare("SELECT json FROM snaps WHERE mint=? AND src='gmgn'").all(c.mint)) { const d = JSON.parse(r.json);
      for (const w of [...(Array.isArray(d.holders) ? d.holders : []), ...(Array.isArray(d.traders) ? d.traders : [])]) { const s0 = N(w.start_holding_at);
        if (!w.address || Number(w.addr_type) === 2 || botLike(w) || s0 == null || s0 > c.flag_ts) continue; qWC.run(w.address, c.mint, s0, c.flag_ts, known, +runX.toFixed(3)); } }
    rdb.prepare("UPDATE coins SET wc_done=1 WHERE mint=?").run(c.mint); } });
  tx();
  // 2. "radar" wallets: 2+ recorded coins bought before the trigger, 2+ (and half or more) of them ran; listed from the moment that was known
  const cur = new Map(); const tx2 = rdb.transaction(() => { for (const r of rdb.prepare("SELECT wallet, known_ts, run_x FROM wallet_coin ORDER BY wallet, known_ts").all()) { // .all(): writes are not allowed while a read is still open
    let a = cur.get(r.wallet); if (!a) { if (cur.size > 2000) cur.clear(); a = { n: 0, runs: 0, listed: null }; cur.set(r.wallet, a); }
    a.n++; if (r.run_x >= RUN_X) a.runs++; if (a.listed == null && a.n >= 2 && a.runs >= 2 && a.runs / a.n >= 0.5) { a.listed = r.known_ts; qW.run(r.wallet, "radar", r.known_ts, a.n, a.runs, `${a.runs} of ${a.n} early coins ran ${RUN_X}x`); }
    else if (a.listed != null) rdb.prepare("UPDATE wallets SET n_coins=?, n_runs=? WHERE wallet=?").run(a.n, a.runs, r.wallet); } }); tx2();
  // 3. GMGN smart money / KOL tags, from the snapshot in which GMGN first showed them
  let lastS = Number(kvGet("lastTagSnap") || 0); const tx3 = rdb.transaction(() => { for (const r of rdb.prepare("SELECT id, ts, json FROM snaps WHERE id>? AND src='gmgn' ORDER BY id LIMIT 2000").all(lastS)) { lastS = r.id; const d = JSON.parse(r.json);
      for (const w of [...(Array.isArray(d.holders) ? d.holders : []), ...(Array.isArray(d.traders) ? d.traders : [])]) { if (!w.address || botLike(w)) continue; const tg = [...(w.tags || []), ...(w.maker_token_tags || [])];
        if (tg.includes("smart_degen")) qW.run(w.address, "gmgn_smart", r.ts, null, null, null); else if (tg.includes("renowned")) qW.run(w.address, "gmgn_kol", r.ts, null, null, null); } } }); tx3(); kvSet("lastTagSnap", lastS);
  // 4. the traders followed in the fomo app
  for (const r of fAll("SELECT wallet, handle, added_ts FROM wallets WHERE active=1 AND wallet IS NOT NULL")) qW.run(r.wallet, "fomo", r.added_ts || t, null, null, r.handle || null);
  // the list the tracker reads: every wallet already listed
  const list = {}; for (const r of rdb.prepare("SELECT wallet, src FROM wallets WHERE listed_ts<=?").iterate(t)) list[r.wallet] = r.src; st.listSize = Object.keys(list).length;
  writeFileSync(`${DATA}/radar_wallets.json.tmp`, JSON.stringify({ updated: t, n: st.listSize, wallets: list })); renameSync(`${DATA}/radar_wallets.json.tmp`, `${DATA}/radar_wallets.json`);
}
function exportNow() {
  try {
    const out = `${DATA}/radar_out`; mkdirSync(out, { recursive: true });
    // features are worked out while the raw snapshots exist (coins flagged in the last 2 days) and kept in `feat`, so pruning the raw data loses nothing
    const upd = rdb.prepare("INSERT OR REPLACE INTO feat (mint, json) VALUES (?, ?)"); for (const c of rdb.prepare("SELECT * FROM coins WHERE flag_ts>=?").all(now() - 2 * 86400)) upd.run(c.mint, JSON.stringify(features(c)));
    const rows = rdb.prepare("SELECT f.json FROM feat f JOIN coins c ON c.mint=f.mint ORDER BY c.flag_ts").all().map((r) => JSON.parse(r.json)), cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    writeFileSync(`${out}/features.csv`, rows.length ? csv(rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null])))) : "");
    // raw snapshots of the last 24 h (the full history stays in radar.db on the box for 14 days)
    const z = []; for (const r of rdb.prepare("SELECT mint, ts, at_s, src, ok, json FROM snaps WHERE ts>=? ORDER BY id").iterate(now() - 86400)) z.push(`{"mint":"${r.mint}","ts":${r.ts},"at_s":${r.at_s},"src":"${r.src}","ok":${r.ok},"d":${r.json}}`);
    writeFileSync(`${out}/snaps_24h.jsonl.gz`, gzipSync(z.join("\n"))); z.length = 0;
    writeFileSync(`${out}/gmgn_flags.csv`, csv(tAll("SELECT id, chain, mint, ts, name, symbol, exchange, launchpad, created_ts, mc, price, liquidity, vol5m, vol1m, buys, sells, swaps, holders, rug_ratio, bundler_rate, top10, smart, renowned, wash, dev_status, ath_mc, our_v5, our_seen, our_trade, mc5, mc15, mc60, peak_mc FROM gmgn_flags ORDER BY id")));
    writeFileSync(`${out}/paper.csv`, csv(rdb.prepare("SELECT p.*, c.name, c.symbol, c.trig AS first_trig, c.created_ts, c.sum0 FROM paper p JOIN coins c ON c.mint=p.mint ORDER BY p.entry_ts").all()));
    writeFileSync(`${out}/wallets.csv`, csv(rdb.prepare("SELECT * FROM wallets ORDER BY listed_ts").all()));
    writeFileSync(`${out}/wallet_coin.csv`, csv(rdb.prepare("SELECT * FROM wallet_coin ORDER BY known_ts").all()));
    writeFileSync(`${out}/radar_hits.csv`, csv(tAll("SELECT * FROM radar_hits WHERE ts>=? ORDER BY id", now() - 3 * 86400)));
    writeFileSync(`${out}/status.json`, JSON.stringify(status(), null, 1));
    rdb.prepare("DELETE FROM snaps WHERE ts<?").run(now() - 14 * 86400); rdb.prepare("DELETE FROM jobs WHERE done=1 AND due<?").run(now() - 2 * 86400);
    st.exports++; st.lastExport = now();
    if (process.env.RADAR_NO_PUSH || pushing) return; pushing = true;
    execFile("bash", [new URL("../push.sh", import.meta.url).pathname], { timeout: 180000 }, (e, so, se) => { pushing = false; st.lastPush = e ? "failed: " + (se || e.message).slice(0, 160) : "ok " + new Date().toISOString(); });
  } catch (e) { st.errors++; st.lastErr = "export: " + e.message; }
}
function status() { return { ...st, at: now(), gmgn: { on: gmgnOn(), ...gmStat }, birdeye: { on: birdOn(), ...bdStat }, trackerDb: !!tdb, fomoDb: !!fdb, confirmVol5m: CONFIRM,
  coinsTotal: rdb.prepare("SELECT COUNT(*) n FROM coins").get().n, coins24h: rdb.prepare("SELECT COUNT(*) n FROM coins WHERE flag_ts>?").get(now() - 86400).n, confirmed24h: rdb.prepare("SELECT COUNT(*) n FROM coins WHERE flag_ts>? AND confirmed=1").get(now() - 86400).n }; }

if (process.env.RADAR_SMOKE) { pollFlags(); pollHits(); console.log("[radar] smoke ok", JSON.stringify({ trackerDb: !!tdb, fomoDb: !!fdb, gmgn: gmgnOn(), birdeye: birdOn() })); process.exit(0); }
console.log(`[radar] ${VER} up — GMGN ${gmgnOn() ? "on" : "OFF"}, Birdeye ${birdOn() ? "on" : "off (no BIRDEYE_API_KEY)"}`);
pollFlags(); setInterval(() => { try { pollFlags(); } catch (e) { st.errors++; st.lastErr = "flags: " + e.message; } }, 10000);
const rk = async () => { try { await pollRank(); } catch (e) { st.errors++; st.lastErr = "rank: " + e.message; } }; rk(); setInterval(rk, RANK_MS);
setInterval(() => { try { pollHits(); } catch (e) { st.errors++; st.lastErr = "hits: " + e.message; } }, 5000);
const wl = () => { try { buildWallets(); } catch (e) { st.errors++; st.lastErr = "wallets: " + e.message; } }; setTimeout(wl, Number(process.env.RADAR_WALLETS_FIRST_MS || 60000)); setInterval(wl, 3600000);
setInterval(() => { try { writeFileSync(`${DATA}/radar_status.json`, JSON.stringify(status())); } catch {} }, 60000);
setTimeout(exportNow, Number(process.env.RADAR_EXPORT_FIRST_MS || 120000)); setInterval(exportNow, Number(process.env.RADAR_EXPORT_MS || 3600000));
worker();
