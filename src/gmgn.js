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

export const gm = { byChain: {}, ok: 0, fail: 0, rateLimited: 0, flags: 0, missedByFeed: 0, lastErr: null, lastOk: 0, rows: 0 };
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
  return Array.isArray(j.data?.rank) ? j.data.rank : Array.isArray(j.data) ? j.data : [];
}

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
    if (!(v5 >= FLAG_VOL5M) || !(mc > 0) || mc > MAX_MC) continue;
    const f = flagged.get(mint); if (f && now - f < 6 * 3600) continue;
    flagged.set(mint, now); if (flagged.size > 20000) flagged.delete(flagged.keys().next().value);
    const ours = chain === "sol" ? momSnap(mint) : null, ourV5 = ours ? ours.v5 : 0, ourSeen = ours && now - (ours.lastTs || 0) < 300 ? 1 : 0;
    let ourTrade = 0; if (chain === "sol") try { ourTrade = qOurTrade.get(mint, now - 1800, now + 60) ? 1 : 0; } catch {}
    try {
      const res = qIns.run(chain, addr, now, r.name ?? null, r.symbol ?? null, r.exchange ?? null, r.launchpad_platform ?? null, num(r.creation_timestamp), mc, num(r.price), num(r.liquidity),
        v5, num(row.volume_1m), num(r.buys), num(r.sells), num(r.swaps), num(r.holder_count), num(r.rug_ratio), num(r.bundler_rate), num(r.top_10_holder_rate),
        num(r.smart_degen_count), num(r.renowned_count), r.is_wash_trading == null ? null : (r.is_wash_trading ? 1 : 0), r.creator_token_status == null ? null : String(r.creator_token_status),
        num(r.history_highest_market_cap), ourV5, ourSeen, ourTrade, JSON.stringify(r).slice(0, 4000));
      gm.flags++; gm.byChain[chain] = (gm.byChain[chain] || 0) + 1; if (chain === "sol" && !ourSeen) gm.missedByFeed++;
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
export const gmgnStatus = () => KEY() ? `GMGN: ${gm.ok} ok / ${gm.fail} failed${gm.rateLimited ? ` (${gm.rateLimited} rate-limited)` : ""} · flagged ${gm.flags} ($${Math.round(FLAG_VOL5M / 1000)}K/5m${Object.keys(gm.byChain).length > 1 ? ": " + Object.entries(gm.byChain).map(([c, n]) => `${c} ${n}`).join(", ") : ""}) · ${gm.missedByFeed} not seen by our feed${gm.lastErr && gm.fail ? ` · last error: ${gm.lastErr}` : ""}` : "GMGN: off (no API key)";
export const memStats = () => ({ latest: latest.size, flagged: flagged.size, follow: follow.length });
export { ingest as _ingest, rank as _rank };
