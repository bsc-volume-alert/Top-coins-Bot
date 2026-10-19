// v0.18.121 — smart wallets from GMGN (owner, 19 Oct 12:46 UK: "go on GMGN data and find out all the smart wallets"). GMGN has no list of
// smart wallets to download; what it has is, per coin, the top traders with their tags (smart_degen, renowned, pump_smart, whale, sniper,
// bundler, dev_team, rat_trader, fresh_wallet…), when they first bought and what they made. So every 30 min we take up to SW_PER_RUN coins
// that peaked ≥ SW_MIN_PEAK in the last 12 h and have not been pulled yet, pull their top 100 traders (5 GMGN weight each), and keep every
// wallet that bought EARLY — after the create block, within SW_EARLY_S — and is not tagged as the dev, a bundler, a sniper or a rat trader.
// A wallet is "smart" once it has been early in ≥ SW_MIN_WINS such coins with a profit, or GMGN itself tags it smart_degen / renowned / pump_smart.
// Project S book S6 buys when a smart wallet buys in a launch's first 60 s. The table is exported as smart_wallets.csv on the data branch.
import { db, q } from "./db.js";
import { _get as gget, gm } from "./gmgn.js";
const N = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d; };
export const SW = { MIN_PEAK: N("SW_MIN_PEAK", 300_000), PER_RUN: N("SW_PER_RUN", 8), EVERY_MS: N("SW_EVERY_MS", 30 * 60_000), EARLY_S: N("SW_EARLY_S", 600), MIN_WINS: N("SW_MIN_WINS", 2), LOOKBACK_S: N("SW_LOOKBACK_S", 12 * 3600) };
const SMART_TAGS = ["smart_degen", "renowned", "pump_smart"], BAD_TAGS = ["dev_team", "bundler", "sniper", "rat_trader", "creator"];
db.exec(`CREATE TABLE IF NOT EXISTS gmgn_harvest (mint TEXT PRIMARY KEY, ts INTEGER, n INTEGER, err TEXT);
CREATE TABLE IF NOT EXISTS smart_trades (mint TEXT, wallet TEXT, tags TEXT, maker_tags TEXT, start_ts INTEGER, end_ts INTEGER, early_s INTEGER, buy_usd REAL, sell_usd REAL, profit REAL, realized REAL, pct REAL, is_new INTEGER, sus INTEGER, addr_type INTEGER, peak_mc REAL, PRIMARY KEY (mint, wallet));
CREATE INDEX IF NOT EXISTS st_wallet ON smart_trades(wallet);
CREATE TABLE IF NOT EXISTS smart_wallets (wallet TEXT PRIMARY KEY, wins INTEGER, coins INTEGER, tags TEXT, profit REAL, first_ts INTEGER, last_ts INTEGER, med_early_s INTEGER, gmgn_smart INTEGER, updated INTEGER);`);
const Q = {
  cands: db.prepare(`SELECT t.mint, t.create_ts, MAX(COALESCE(p.peak_24h,0), COALESCE(t.peak_mc_usd,0)) peak FROM tokens t LEFT JOIN token_peaks p ON p.mint=t.mint LEFT JOIN gmgn_harvest h ON h.mint=t.mint
    WHERE t.create_ts>=? AND t.create_ts<=? AND h.mint IS NULL AND MAX(COALESCE(p.peak_24h,0), COALESCE(t.peak_mc_usd,0))>=? ORDER BY peak DESC LIMIT ?`),
  harvested: db.prepare(`INSERT OR REPLACE INTO gmgn_harvest (mint, ts, n, err) VALUES (?, ?, ?, ?)`),
  insTrade: db.prepare(`INSERT OR REPLACE INTO smart_trades (mint, wallet, tags, maker_tags, start_ts, end_ts, early_s, buy_usd, sell_usd, profit, realized, pct, is_new, sus, addr_type, peak_mc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  agg: db.prepare(`SELECT wallet, COUNT(*) coins, SUM(CASE WHEN early_s>2 AND early_s<=? AND COALESCE(profit,0)>0 THEN 1 ELSE 0 END) wins, SUM(COALESCE(profit,0)) profit, MIN(start_ts) first_ts, MAX(start_ts) last_ts, GROUP_CONCAT(DISTINCT tags) tags FROM smart_trades GROUP BY wallet`),
  medEarly: db.prepare(`SELECT early_s FROM smart_trades WHERE wallet=? AND early_s>2 ORDER BY early_s`).pluck(),
  upWallet: db.prepare(`INSERT OR REPLACE INTO smart_wallets (wallet, wins, coins, tags, profit, first_ts, last_ts, med_early_s, gmgn_smart, updated) VALUES (?,?,?,?,?,?,?,?,?,?)`),
  clearWallets: db.prepare(`DELETE FROM smart_wallets WHERE NOT (gmgn_smart=1 AND coins=0)`), // feed wallets (coins = 0) stay
  list: db.prepare(`SELECT wallet, wins, coins, tags, gmgn_smart FROM smart_wallets`),
};
export const sw = { runs: 0, coins: 0, traders: 0, fail: 0, lastErr: null, smart: 0 };
let smart = new Map(); // wallet -> { wins, coins, tags, gmgn }
export const isSmart = (w) => smart.has(w);
export const smartInfo = (w) => smart.get(w) || null;
export const smartSize = () => smart.size;
// v0.18.122: wallets seen in GMGN's smart-money / KOL feeds join the set at once (gmgn_smart = 1); the harvest's own rebuild keeps them (the feed rows are in sm_trades)
const qFeedW = db.prepare(`INSERT INTO smart_wallets (wallet, wins, coins, tags, profit, first_ts, last_ts, med_early_s, gmgn_smart, updated) VALUES (?, 0, 0, ?, 0, ?, ?, NULL, 1, ?) ON CONFLICT(wallet) DO UPDATE SET gmgn_smart=1, last_ts=excluded.last_ts, tags=CASE WHEN tags='' OR tags IS NULL THEN excluded.tags ELSE tags END`);
export function addSmart(wallet, tags = "") { if (!wallet || smart.has(wallet)) return; const now = Math.floor(Date.now() / 1000); try { qFeedW.run(wallet, String(tags || "").slice(0, 120), now, now, now); } catch {} smart.set(wallet, { wins: 0, coins: 0, tags: String(tags || ""), gmgn: 1 }); sw.smart = smart.size; }
const T = (x) => (x == null ? null : x);
const num = (v) => (v == null || v === "" ? null : Number(v));
const tagStr = (a) => (Array.isArray(a) ? a.join("|") : a ? String(a) : "");
function rebuild() {
  try {
    const rows = Q.agg.all(SW.EARLY_S); const tx = db.transaction(() => { Q.clearWallets.run(); const now = Math.floor(Date.now() / 1000);
      for (const r of rows) { const tags = String(r.tags || ""), gmgnSmart = SMART_TAGS.some((t) => tags.includes(t)) ? 1 : 0, bad = BAD_TAGS.some((t) => tags.includes(t));
        if (bad) continue; if (r.wins < SW.MIN_WINS && !gmgnSmart) continue;
        const e = Q.medEarly.all(r.wallet), med = e.length ? e[Math.floor(e.length / 2)] : null;
        Q.upWallet.run(r.wallet, r.wins, r.coins, tags.slice(0, 200), r.profit, r.first_ts, r.last_ts, med, gmgnSmart, now); } });
    tx(); smart = new Map(Q.list.all().map((r) => [r.wallet, { wins: r.wins, coins: r.coins, tags: r.tags, gmgn: r.gmgn_smart }])); sw.smart = smart.size;
  } catch (e) { sw.lastErr = "rebuild: " + e.message; console.error("[smart] rebuild", e.message); }
}
async function harvest() {
  if (!process.env.GMGN_API_KEY) return; sw.runs++;
  const now = Math.floor(Date.now() / 1000); let cands = [];
  try { cands = Q.cands.all(now - SW.LOOKBACK_S, now - 1800, SW.MIN_PEAK, SW.PER_RUN); } catch (e) { sw.lastErr = e.message; return; } // at least 30 min old, so the first wave of traders is in
  for (const c of cands) {
    let list = null, err = null;
    try { const d = await gget("/v1/market/token_top_traders", { chain: "sol", address: c.mint, limit: "100", order_by: "profit", direction: "desc" }); list = d?.list || (Array.isArray(d) ? d : null); }
    catch (e) { err = e.message; if (!/rate limited/.test(err)) { try { const d = await gget("/v1/market/token_top_traders", { chain: "sol", address: c.mint, limit: "100", order_by: "sell_volume_cur", direction: "desc" }); list = d?.list || (Array.isArray(d) ? d : null); err = null; } catch (e2) { err = e2.message; } } }
    if (!list) { sw.fail++; sw.lastErr = err; Q.harvested.run(c.mint, now, 0, String(err || "no list").slice(0, 120)); if (/rate limited/.test(String(err))) return; continue; }
    let n = 0; const tx = db.transaction(() => { for (const w of list) { if (!w?.address) continue; const start = num(w.start_holding_at); const early = start != null && c.create_ts ? Math.round(start - c.create_ts) : null;
      Q.insTrade.run(c.mint, w.address, tagStr(w.tags), tagStr(w.maker_token_tags), start, num(w.end_holding_at), early, num(w.buy_volume_cur), num(w.sell_volume_cur), num(w.profit), num(w.realized_profit), num(w.amount_percentage), w.is_new ? 1 : 0, w.is_suspicious ? 1 : 0, num(w.addr_type), c.peak); n++; } });
    try { tx(); } catch (e) { sw.lastErr = "insert: " + e.message; }
    Q.harvested.run(c.mint, now, n, null); sw.coins++; sw.traders += n;
  }
  if (cands.length) rebuild();
}
rebuild();
setTimeout(() => harvest().catch((e) => console.error("[smart]", e.message)), 90_000);
setInterval(() => harvest().catch((e) => console.error("[smart]", e.message)), SW.EVERY_MS);
export const smartStats = () => ({ ...sw, gmgnOk: gm.ok, gmgnRateLimited: gm.rateLimited });
