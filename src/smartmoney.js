// v0.18.122 — GMGN's smart-money and KOL trade feeds (Plus plan, 19 Oct). GET /v1/user/smartmoney (weight 1) and /v1/user/kol (weight 1) list
// the latest buys and sells of the wallets GMGN tags smart_degen / renowned. Polled every SM_POLL_MS / KOL_POLL_MS, de-duplicated by transaction
// hash, kept in the sm_trades table and in memory for 30 min. Used three ways:
//   · a feature on every A / C / D / E trigger (early_json.ctx.sm → sm_* columns): smart / KOL buys and sells on the coin in the last 5 min, USD, distinct wallets, seconds since the last smart buy
//   · Project S book S7: a smart-money buy (from the feed) on a coin under SN_SM_AGE_S old and under the MC cap → paper-buy at our feed's current price
//   · every wallet seen in the feed joins the smart set (smartwallets.js), so S6 can act on it from the first trade we see on our own feed
import { db } from "./db.js";
import { _get as gget, gm } from "./gmgn.js";
import { addSmart } from "./smartwallets.js";
const N = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d; };
export const SMC = { SM_POLL_MS: N("GMGN_SM_POLL_MS", 5000), KOL_POLL_MS: N("GMGN_KOL_POLL_MS", 15000), KEEP_S: 1800 };
db.exec(`CREATE TABLE IF NOT EXISTS sm_trades (tx TEXT PRIMARY KEY, ts INTEGER, kind TEXT, wallet TEXT, side TEXT, mint TEXT, symbol TEXT, usd REAL, price_usd REAL, open_close INTEGER, tags TEXT, launchpad TEXT, seen_ts INTEGER);
CREATE INDEX IF NOT EXISTS smt_mint ON sm_trades(mint, ts); CREATE INDEX IF NOT EXISTS smt_ts ON sm_trades(ts);`);
const ins = db.prepare(`INSERT OR IGNORE INTO sm_trades (tx, ts, kind, wallet, side, mint, symbol, usd, price_usd, open_close, tags, launchpad, seen_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const prune = db.prepare(`DELETE FROM sm_trades WHERE ts<?`);
export const sm = { polls: 0, fail: 0, rows: 0, newRows: 0, lastOk: 0, lastErr: null, lagS: null };
const recent = new Map(); // mint -> [{ts, wallet, side, usd, kind, seenTs}]
const listeners = []; export const onSmartBuy = (fn) => listeners.push(fn);
const num = (v) => (v == null || v === "" ? null : Number(v));
function ingest(list, kind) {
  const now = Math.floor(Date.now() / 1000); let fresh = 0; const tx = db.transaction(() => { for (const r of list) {
    if (!r?.transaction_hash || !r.base_address) continue; const ts = num(r.timestamp) || now, tags = Array.isArray(r.maker_info?.tags) ? r.maker_info.tags.join("|") : "";
    const ok = ins.run(r.transaction_hash, ts, kind, r.maker, r.side, r.base_address, r.base_token?.symbol || null, num(r.amount_usd), num(r.price_usd), num(r.is_open_or_close), tags, r.base_token?.launchpad || r.launchpad_platform || null, now).changes;
    if (!ok) continue; fresh++; if (sm.lagS == null || now - ts < sm.lagS) sm.lagS = now - ts;
    const arr = recent.get(r.base_address) || []; arr.push({ ts, wallet: r.maker, side: r.side, usd: num(r.amount_usd) || 0, kind, seenTs: now, tags }); recent.set(r.base_address, arr);
    try { addSmart(r.maker, tags || kind); } catch {}
    if (r.side === "buy") for (const fn of listeners) { try { fn({ mint: r.base_address, wallet: r.maker, usd: num(r.amount_usd) || 0, ts, kind, tags, symbol: r.base_token?.symbol || null, seenTs: now }); } catch (e) { console.error("[smartmoney listener]", e.message); } }
  } }); tx(); return fresh;
}
async function poll(kind) {
  if (!process.env.GMGN_API_KEY) return; sm.polls++;
  try { const d = await gget(kind === "sm" ? "/v1/user/smartmoney" : "/v1/user/kol", { chain: "sol", limit: "100" }); const list = d?.list || (Array.isArray(d) ? d : []); sm.rows = list.length; sm.newRows += ingest(list, kind); sm.lastOk = Math.floor(Date.now() / 1000); gm.smOk = (gm.smOk || 0) + 1; }
  catch (e) { sm.fail++; sm.lastErr = e.message; if (sm.fail % 30 === 1) console.error(`[smartmoney ${kind}]`, e.message); }
}
let smBusy = false, kolBusy = false;
setTimeout(() => { setInterval(async () => { if (smBusy) return; smBusy = true; try { await poll("sm"); } finally { smBusy = false; } }, SMC.SM_POLL_MS); setInterval(async () => { if (kolBusy) return; kolBusy = true; try { await poll("kol"); } finally { kolBusy = false; } }, SMC.KOL_POLL_MS); }, 20_000);
setInterval(() => { const cut = Math.floor(Date.now() / 1000) - SMC.KEEP_S; for (const [m, arr] of recent) { const keep = arr.filter((x) => x.ts >= cut); if (keep.length) recent.set(m, keep); else recent.delete(m); } try { prune.run(cut - 7 * 86400); } catch {} }, 60_000);
/** Smart / KOL activity on a coin in the `win` seconds before `now` (from the feed; the feed itself lags the chain by sm.lagS seconds). */
export function smartFlow(mint, now, win = 300) {
  const arr = (recent.get(mint) || []).filter((x) => now - x.ts <= win && x.ts <= now + 5); if (!arr.length) return null;
  const buys = arr.filter((x) => x.side === "buy"), sells = arr.filter((x) => x.side === "sell"), lastBuy = buys.length ? Math.max(...buys.map((x) => x.ts)) : null;
  return { buys: buys.length, sells: sells.length, buy_usd: Math.round(buys.reduce((a, x) => a + x.usd, 0)), sell_usd: Math.round(sells.reduce((a, x) => a + x.usd, 0)), wallets: new Set(buys.map((x) => x.wallet)).size, kol_buys: buys.filter((x) => x.kind === "kol").length, sm_buys: buys.filter((x) => x.kind === "sm").length, last_buy_s: lastBuy ? now - lastBuy : null };
}
export const smStats = () => ({ ...sm, tracked: recent.size });
export { ingest as _ingest };
