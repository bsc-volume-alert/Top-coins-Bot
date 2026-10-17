// v0.18.52 GMGN scanner. Our own feed reads pump.fun / PumpSwap / Raydium / Orca trade by trade, but cannot read Meteora (it emits
// its swap events through self-CPI, not the logs we subscribe to) and drops trades on pools it has not resolved yet. GMGN's OpenAPI
// ranks every Solana token by recent trading across all DEXes, so polling its 1m / 5m "trending" list closes that gap.
// Record-only for now: every token GMGN shows trading >= GMGN_FLAG_VOL5M in 5 minutes is written to `gmgn_flags` with GMGN's
// rug / bundler / smart-money fields, whether our own feed saw it, and its market cap 5 / 15 / 60 min later (DexScreener).
// The latest GMGN row per token is also kept in memory so momentum entries can store it (paper_trades.gmgn_json).
// Auth (from the official gmgn-cli): header X-APIKEY + query timestamp (unix s, ±5 s) + client_id (UUID). Market data needs no
// signature. Limit: leaky bucket 20/s; /v1/market/rank has weight 1.
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { momSnap } from "./momentum.js";

const KEY = () => process.env.GMGN_API_KEY || "";
const HOST = "https://openapi.gmgn.ai";
const POLL_MS = Number(process.env.GMGN_POLL_MS || 2000);
const FLAG_VOL5M = Number(process.env.GMGN_FLAG_VOL5M || 100000);
const MAX_MC = Number(process.env.GMGN_MAX_MC || 5000000);
const CHAINS = String(process.env.GMGN_CHAINS || "sol,bsc,base,robinhood").split(",").map((x) => x.trim()).filter(Boolean); // sol, bsc, base, eth, robinhood — non-sol chains are record-only
const DS_CHAIN = { sol: "solana", bsc: "bsc", base: "base", eth: "ethereum", robinhood: "robinhood" };

db.exec(`CREATE TABLE IF NOT EXISTS gmgn_flags (id INTEGER PRIMARY KEY AUTOINCREMENT, chain TEXT DEFAULT 'sol', mint TEXT, ts INTEGER, name TEXT, symbol TEXT,
  exchange TEXT, launchpad TEXT, created_ts INTEGER, mc REAL, price REAL, liquidity REAL, vol5m REAL, vol1m REAL, buys INTEGER, sells INTEGER,
  swaps INTEGER, holders INTEGER, rug_ratio REAL, bundler_rate REAL, top10 REAL, smart INTEGER, renowned INTEGER, wash INTEGER,
  dev_status TEXT, ath_mc REAL, our_v5 REAL, our_seen INTEGER, our_trade INTEGER, mc5 REAL, mc15 REAL, mc60 REAL, peak_mc REAL, raw TEXT);
  CREATE INDEX IF NOT EXISTS gf_mint ON gmgn_flags(mint); CREATE INDEX IF NOT EXISTS gf_ts ON gmgn_flags(ts);`);
try { db.exec("ALTER TABLE gmgn_flags ADD COLUMN chain TEXT DEFAULT 'sol'"); } catch {}
const qIns = db.prepare(`INSERT INTO gmgn_flags (chain,mint,ts,name,symbol,exchange,launchpad,created_ts,mc,price,liquidity,vol5m,vol1m,buys,sells,swaps,holders,
  rug_ratio,bundler_rate,top10,smart,renowned,wash,dev_status,ath_mc,our_v5,our_seen,our_trade,raw) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const qOurTrade = db.prepare(`SELECT 1 FROM paper_trades WHERE mint=? AND entry_ts BETWEEN ? AND ? LIMIT 1`);
const qFollow = db.prepare(`UPDATE gmgn_flags SET mc5=COALESCE(?,mc5), mc15=COALESCE(?,mc15), mc60=COALESCE(?,mc60), peak_mc=MAX(COALESCE(peak_mc,0),?) WHERE id=?`);

export const gm = { byChain: {}, empty: 0, maxVol5: 0, ok: 0, fail: 0, rateLimited: 0, flags: 0, missedByFeed: 0, lastErr: null, lastOk: 0, rows: 0 };
const latest = new Map(); // mint -> { row, ts }
const flagged = new Map(); // mint -> ts flagged (one flag per mint per 6 h)
const follow = []; // { id, mint, at, slot }
let pausedUntil = 0;

const num = (v) => (v == null || v === "" ? null : Number(v));
async function rank(chain, interval) {
  const q = new URLSearchParams({ chain, interval, order_by: "volume", limit: "100", timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
  const r = await fetch(`${HOST}/v1/market/rank?${q}`, { headers: { "X-APIKEY": KEY(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000) });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status} non-JSON`); }
  if (r.status === 429 || j.error === "RATE_LIMIT_EXCEEDED" || j.error === "RATE_LIMIT_BANNED") {
    gm.rateLimited++; const reset = Number(r.headers.get("x-ratelimit-reset") || j.reset_at || 0);
    pausedUntil = Math.max(Date.now() + 5000, reset * 1000 || 0); throw new Error("rate limited");
  }
  if (j.code !== 0) throw new Error(`${j.error || j.code}: ${j.message || ""}`.slice(0, 160));
  // trending keeps an inner {code, data} envelope: rows are at data.data.rank (seen in GMGN's own skills docs); accept both shapes
  const d = j.data && j.data.data && typeof j.data.data === "object" ? j.data.data : j.data;
  const rows = Array.isArray(d?.rank) ? d.rank : Array.isArray(d) ? d : [];
  if (!rows.length) { gm.empty++; if (gm.empty % 50 === 1) console.error("[gmgn] empty rank response, keys:", Object.keys(j.data || {}).join(","), JSON.stringify(j).slice(0, 300)); }
  return rows;
}

// v0.18.56 generic GET for the other read-only endpoints (token info / security / top traders / created tokens / kline). Same auth, same
// rate-limit handling; unwraps the inner {code,data} envelope when present.
async function get(path, params) {
  const q = new URLSearchParams({ ...params, timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
  const r = await fetch(`${HOST}${path}?${q}`, { headers: { "X-APIKEY": KEY(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000) });
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { throw new Error(`HTTP ${r.status} non-JSON`); }
  if (r.status === 429 || j.error === "RATE_LIMIT_EXCEEDED" || j.error === "RATE_LIMIT_BANNED") {
    gm.rateLimited++; const reset = Number(r.headers.get("x-ratelimit-reset") || j.reset_at || 0);
    pausedUntil = Math.max(Date.now() + 5000, reset * 1000 || 0); throw new Error("rate limited");
  }
  if (j.code !== 0) throw new Error(`${j.error || j.code}: ${j.message || ""}`.slice(0, 160));
  return j.data && j.data.data && typeof j.data.data === "object" && !Array.isArray(j.data.data) && j.data.code !== undefined ? j.data.data : j.data;
}
// keep a GMGN object small: drop images / long text / big arrays, then cap the size by removing the largest remaining keys
function slim(o, cap = 9000) {
  if (!o || typeof o !== "object") return o;
  const c = JSON.parse(JSON.stringify(o));
  const drop = (x) => { if (!x || typeof x !== "object") return; for (const k of Object.keys(x)) { if (/logo|avatar|banner|description|pfp|image/i.test(k)) delete x[k]; else if (Array.isArray(x[k]) && x[k].length > 20) x[k] = x[k].slice(0, 20); else drop(x[k]); } };
  drop(c);
  let str = JSON.stringify(c);
  while (str.length > cap) { const big = Object.keys(c).filter((k) => !["dev", "stat", "wallet_tags_stat", "price"].includes(k)).sort((a, b) => JSON.stringify(c[b]).length - JSON.stringify(c[a]).length)[0]; if (!big) break; delete c[big]; str = JSON.stringify(c); }
  return c;
}

// v0.18.56 GMGN snapshot at entry: token info (holders, top-10, dev history, bundler / insider / sniper shares, fresh wallets, socials) and
// token security (rug ratio, wash trading, insider hold, sniper count) are fetched for every momentum / P5 entry and stored in
// paper_trades.gmgn_entry. Fills the holder data our own ledger lacks for coins older than ~5 min. One lookup per coin per 2 min.
try { db.exec("ALTER TABLE paper_trades ADD COLUMN gmgn_entry TEXT"); } catch {}
const qSetEntry = db.prepare(`UPDATE paper_trades SET gmgn_entry=? WHERE id=?`);
gm.entryOk = 0; gm.entryFail = 0;
const eq = [], eCache = new Map(); let eBusy = false;
export function gmgnEntry(mint, id) { if (!KEY() || !mint || !id) return; eq.push({ mint, id }); if (eq.length > 300) eq.shift(); }
setInterval(async () => {
  if (eBusy || !eq.length || Date.now() < pausedUntil) return; eBusy = true;
  const { mint, id } = eq.shift();
  try {
    let c = eCache.get(mint);
    if (!c || Date.now() - c.t > 120000) {
      const [info, sec] = await Promise.all([get("/v1/token/info", { chain: "sol", address: mint }).catch((e) => ({ _err: e.message })), get("/v1/token/security", { chain: "sol", address: mint }).catch((e) => ({ _err: e.message }))]);
      if (info?._err && sec?._err) throw new Error(info._err);
      c = { t: Date.now(), json: JSON.stringify({ ts: Math.floor(Date.now() / 1000), info: slim(info), sec: slim(sec, 4000) }) };
      eCache.set(mint, c); if (eCache.size > 500) eCache.delete(eCache.keys().next().value);
    }
    qSetEntry.run(c.json, id); gm.entryOk++;
  } catch (e) { gm.entryFail++; gm.lastErr = `entry: ${e.message}`; if (gm.entryFail % 20 === 1) console.error("[gmgn entry]", e.message); }
  finally { eBusy = false; }
}, 500);

// v0.18.56 one-off "who sold" pull (/gmgnsellers): for every coin a project traded since 15 Oct, GMGN's top 100 traders by sell volume
// (tags dev / bundler / sniper / insider, first buy, full exit time, buy and sell $, realized profit, funding wallet), token info + security,
// the dev's other launches and 1-minute candles from 10 min before to 60 min after our first entry. Written to a JSONL file on disk one
// coin at a time (memory stays flat), then zipped and sent to Telegram. ~2 s per coin.
const T = (x) => (x == null ? null : x);
const trader = (w) => ({ a: w.address, tags: w.tags, mt: w.maker_token_tags, start: T(w.start_holding_at), end: T(w.end_holding_at), last: T(w.last_active_timestamp),
  buyUsd: T(w.buy_volume_cur), sellUsd: T(w.sell_volume_cur), buys: T(w.buy_tx_count_cur), sells: T(w.sell_tx_count_cur), soldPct: T(w.sell_amount_percentage),
  pct: T(w.amount_percentage), profit: T(w.profit), rProfit: T(w.realized_profit), avgCost: T(w.avg_cost), avgSold: T(w.avg_sold), isNew: T(w.is_new), sus: T(w.is_suspicious),
  tIn: T(w.history_transfer_in_amount), tOut: T(w.history_transfer_out_amount), fund: w.native_transfer ? { a: w.native_transfer.address, ts: w.native_transfer.timestamp, name: w.native_transfer.name } : null, created: T(w.created_at), type: T(w.addr_type) });
let sellersBusy = false;
export async function gmgnSellers(dir, onProgress = () => {}) {
  if (!KEY()) throw new Error("GMGN_API_KEY not set"); if (sellersBusy) throw new Error("already running"); sellersBusy = true;
  const { openSync, writeSync, closeSync } = await import("node:fs"); const { join } = await import("node:path");
  const coins = db.prepare(`SELECT p.mint, MIN(p.entry_ts) first_ts, GROUP_CONCAT(p.id) ids, GROUP_CONCAT(DISTINCT p.strategy) strats, MAX(t.creator) creator, MAX(p.name) name
    FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE COALESCE(p.invalid,0)=0 AND p.entry_ts >= ? AND ((p.strategy='momentum' AND p.core=1) OR p.strategy IN ('momconf','mom2m','p5e30','p5e50','p5e80'))
    GROUP BY p.mint ORDER BY first_ts`).all(Math.floor(Date.UTC(2026, 9, 15, 12, 52) / 1000));
  const path = join(dir, "gmgn_sellers.jsonl"), fd = openSync(path, "w"); let ok = 0, fail = 0;
  try {
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i], o = { mint: c.mint, name: c.name, first_ts: c.first_ts, ids: c.ids, strats: c.strats, creator: c.creator };
      while (Date.now() < pausedUntil) await new Promise((r) => setTimeout(r, 1000));
      // v0.18.59: wait out any GMGN rate-limit pause before EVERY call (calling during a ban extends it) and pace calls ~1.2 s apart so
      // the pull shares GMGN's limit with the trending scanner and the entry lookups instead of starving them (17 Oct: 39 rate-limits).
      const step = async (k, f) => {
        for (let tries = 0; tries < 3; tries++) {
          while (Date.now() < pausedUntil) await new Promise((r) => setTimeout(r, 1000));
          try { o[k] = await f(); delete o[k + "_err"]; break; } catch (e) { o[k + "_err"] = e.message; if (!/rate limited/.test(e.message)) break; }
        }
        await new Promise((r) => setTimeout(r, 1200));
      };
      await step("traders", async () => (await get("/v1/market/token_top_traders", { chain: "sol", address: c.mint, limit: "100", order_by: "sell_volume_cur", direction: "desc" }))?.list?.map(trader));
      await step("holders", async () => (await get("/v1/market/token_top_holders", { chain: "sol", address: c.mint, limit: "30" }))?.list?.map(trader));
      await step("info", async () => slim(await get("/v1/token/info", { chain: "sol", address: c.mint })));
      await step("sec", async () => slim(await get("/v1/token/security", { chain: "sol", address: c.mint }), 4000));
      const creator = c.creator || o.info?.dev?.creator_address;
      if (creator) await step("dev_tokens", async () => slim(await get("/v1/user/created_tokens", { chain: "sol", wallet_address: creator }), 12000));
      await step("kline", async () => (await get("/v1/market/token_kline", { chain: "sol", address: c.mint, resolution: "1m", from: String(c.first_ts - 600), to: String(c.first_ts + 3600) }))?.list ?? null);
      if (o.traders) ok++; else fail++;
      writeSync(fd, JSON.stringify(o) + "\n");
      if ((i + 1) % 25 === 0) onProgress(i + 1, coins.length, ok, fail);
    }
  } finally { closeSync(fd); sellersBusy = false; }
  return { path, n: coins.length, ok, fail };
}
export { get as _get, slim as _slim };

export const gmgnFor = (mint) => { const x = latest.get(mint); return x && Date.now() / 1000 - x.ts < 600 ? x.row : null; };
export const gmgnSummary = (r) => r ? { mc: num(r.market_cap), liq: num(r.liquidity), vol: num(r.volume), holders: num(r.holder_count), rug: num(r.rug_ratio), bundler: num(r.bundler_rate), top10: num(r.top_10_holder_rate), smart: num(r.smart_degen_count), renowned: num(r.renowned_count), wash: r.is_wash_trading ?? null, dev: r.creator_token_status ?? null, exchange: r.exchange ?? null, launchpad: r.launchpad_platform ?? null } : null;

function ingest(rows, interval, chain) {
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    const addr = r.address; if (!addr) continue; const mint = chain === "sol" ? addr : `${chain}:${addr}`;
    const prev = latest.get(mint)?.row || {};
    const row = { ...prev, ...r, [`volume_${interval}`]: num(r.volume) };
    latest.set(mint, { row, ts: now }); if (latest.size > 5000) latest.delete(latest.keys().next().value);
    if (interval !== "5m") continue;
    const v5 = num(r.volume), mc = num(r.market_cap);
    if (chain === "sol" && v5 > gm.maxVol5) gm.maxVol5 = v5;
    if (!(v5 >= FLAG_VOL5M) || !(mc > 0) || mc > MAX_MC) continue;
    const f = flagged.get(mint); if (f && now - f < 6 * 3600) continue;
    flagged.set(mint, now); if (flagged.size > 20000) flagged.delete(flagged.keys().next().value);
    const ours = chain === "sol" ? momSnap(mint) : null, ourV5 = ours ? ours.v5 : 0, ourSeen = process.uptime() < 300 ? null : ours && now - (ours.lastTs || 0) < 300 ? 1 : 0; // v0.18.55: first 5 min after a restart our feed is still warming up — unknown, not "missed"
    let ourTrade = 0; if (chain === "sol") try { ourTrade = qOurTrade.get(mint, now - 1800, now + 60) ? 1 : 0; } catch {}
    try {
      const res = qIns.run(chain, addr, now, r.name ?? null, r.symbol ?? null, r.exchange ?? null, r.launchpad_platform ?? null, num(r.creation_timestamp), mc, num(r.price), num(r.liquidity),
        v5, num(row.volume_1m), num(r.buys), num(r.sells), num(r.swaps), num(r.holder_count), num(r.rug_ratio), num(r.bundler_rate), num(r.top_10_holder_rate),
        num(r.smart_degen_count), num(r.renowned_count), r.is_wash_trading == null ? null : (r.is_wash_trading ? 1 : 0), r.creator_token_status == null ? null : String(r.creator_token_status),
        num(r.history_highest_market_cap), ourV5, ourSeen, ourTrade, JSON.stringify(r).slice(0, 4000));
      gm.flags++; gm.byChain[chain] = (gm.byChain[chain] || 0) + 1; if (chain === "sol" && ourSeen === 0) gm.missedByFeed++;
      for (const [slot, min] of [["mc5", 5], ["mc15", 15], ["mc60", 60]]) follow.push({ id: res.lastInsertRowid, mint: addr, chain, at: now + min * 60, slot });
    } catch (e) { console.error("[gmgn flag]", e.message); }
  }
}

async function dexMc(mint, chain = "sol") {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); const ps = (j.pairs || []).filter((p) => p.chainId === (DS_CHAIN[chain] || chain));
  if (!ps.length) return null; const best = ps.reduce((a, b) => ((b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a));
  return Number(best.marketCap || best.fdv) || null;
}
let followBusy = false;
setInterval(async () => {
  if (followBusy || !follow.length) return; followBusy = true;
  try {
    const now = Math.floor(Date.now() / 1000); let n = 0;
    follow.sort((a, b) => a.at - b.at);
    while (follow.length && follow[0].at <= now && n < 20) {
      const f = follow.shift(); n++;
      const mc = await dexMc(f.mint, f.chain).catch(() => null); if (mc == null) continue;
      const v = { mc5: null, mc15: null, mc60: null }; v[f.slot] = mc;
      try { qFollow.run(v.mc5, v.mc15, v.mc60, mc, f.id); } catch {}
    }
  } finally { followBusy = false; }
}, 15_000);

let turn = 0, busy = false;
async function poll() {
  if (busy || !KEY() || Date.now() < pausedUntil) return; busy = true;
  // Solana alternates 5m / 1m every poll; each other chain gets one 5m poll every ~10 polls (record-only)
  const k = turn++, other = CHAINS.filter((c) => c !== "sol"), useOther = other.length && k % 10 === 9;
  const chain = useOther ? other[Math.floor(k / 10) % other.length] : "sol", interval = useOther || k % 2 === 0 ? "5m" : "1m";
  if (chain === "sol" && !CHAINS.includes("sol")) { busy = false; return; }
  try { const rows = await rank(chain, interval); gm.ok++; gm.rows = rows.length; gm.lastOk = Math.floor(Date.now() / 1000); ingest(rows, interval, chain); }
  catch (e) { gm.fail++; gm.lastErr = e.message; if (gm.fail % 30 === 1) console.error("[gmgn]", e.message); }
  finally { busy = false; }
}
if (KEY()) { console.log(`[gmgn] scanner on (${CHAINS.join(", ")}) — every ${POLL_MS} ms, flag ≥ $${FLAG_VOL5M} in 5 min, MC ≤ $${MAX_MC}`); setInterval(poll, POLL_MS); setTimeout(poll, 3000); }
else console.log("[gmgn] GMGN_API_KEY not set — scanner off");
export const gmgnStatus = () => KEY() ? `GMGN: ${gm.ok} ok / ${gm.fail} failed${gm.rateLimited ? ` (${gm.rateLimited} rate-limited)` : ""} · last list ${gm.rows} coins${gm.empty ? ` · ${gm.empty} empty` : ""} · top 5m vol seen $${Math.round(gm.maxVol5 / 1000)}K · flagged ${gm.flags} ($${Math.round(FLAG_VOL5M / 1000)}K/5m${Object.keys(gm.byChain).length > 1 ? ": " + Object.entries(gm.byChain).map(([c, n]) => `${c} ${n}`).join(", ") : ""}) · ${gm.missedByFeed} not seen by our feed · entry lookups ${gm.entryOk} ok / ${gm.entryFail} failed${gm.lastErr && gm.fail ? ` · last error: ${gm.lastErr}` : ""}` : "GMGN: off (no API key)";
export const memStats = () => ({ latest: latest.size, flagged: flagged.size, follow: follow.length });
export { ingest as _ingest, rank as _rank };
