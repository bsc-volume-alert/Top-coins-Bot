// fomo.db — the watcher's own database (owner's isolation rule, 21 Oct 2026). Nothing here is shared with tracker.db.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config.mjs";
mkdirSync(dirname(CFG.DB_PATH), { recursive: true });
export const db = new Database(CFG.DB_PATH);
db.pragma("journal_mode = WAL"); db.pragma("synchronous = NORMAL");
db.exec(`
CREATE TABLE IF NOT EXISTS flow (            -- one row per fomo swap leg seen on the signer firehose (raw rows kept FLOW_KEEP_D days)
  sig TEXT, slot INTEGER, ts INTEGER, mint TEXT, side TEXT, usd REAL, quote TEXT, quote_amt REAL, tokens REAL, venue TEXT, pool TEXT, wallet TEXT, decoded INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS flow_ts ON flow(ts);
CREATE INDEX IF NOT EXISTS flow_mint ON flow(mint, ts);
CREATE INDEX IF NOT EXISTS flow_sig ON flow(sig);
CREATE INDEX IF NOT EXISTS flow_pool ON flow(pool);
CREATE TABLE IF NOT EXISTS flow_hourly (     -- per-coin hourly totals, kept 90 days (what survives the raw prune)
  mint TEXT, hour INTEGER, buys INTEGER DEFAULT 0, sells INTEGER DEFAULT 0, buy_usd REAL DEFAULT 0, sell_usd REAL DEFAULT 0, PRIMARY KEY (mint, hour)
);
CREATE TABLE IF NOT EXISTS coins (mint TEXT PRIMARY KEY, symbol TEXT, name TEXT, dec INTEGER, mc_usd REAL, px_usd REAL, liq_usd REAL, meta_ts INTEGER, first_seen INTEGER);
CREATE TABLE IF NOT EXISTS pools (pool TEXT PRIMARY KEY, venue TEXT, mint TEXT, quote TEXT, mint_side INTEGER, dec INTEGER, ignore INTEGER DEFAULT 0, ts INTEGER);
CREATE TABLE IF NOT EXISTS wallets (wallet TEXT PRIMARY KEY, handle TEXT, label TEXT, source TEXT, added_ts INTEGER, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS handles (handle TEXT PRIMARY KEY, stats_json TEXT, updated_ts INTEGER);
CREATE TABLE IF NOT EXISTS trades (          -- paper trades: one per watched-wallet buy, scored in USD at the trader's real fill
  id INTEGER PRIMARY KEY, wallet TEXT, handle TEXT, mint TEXT, symbol TEXT, sig TEXT, entry_ts INTEGER, entry_px REAL, entry_usd REAL, entry_mc REAL,
  px5 REAL, px30 REAL, px120 REAL, px5_at INTEGER, px30_at INTEGER, px120_at INTEGER,
  peak REAL DEFAULT 1, last_px REAL, last_ts INTEGER,
  x_h5 REAL, x_tsl40 REAL, x_t15s40 REAL, x_copy REAL, x_time REAL,
  their_sell_ts INTEGER, their_sell_px REAL, their_sell_usd REAL,
  closed INTEGER DEFAULT 0, exit_reason TEXT, note TEXT
);
CREATE INDEX IF NOT EXISTS trades_open ON trades(closed, entry_ts);
CREATE INDEX IF NOT EXISTS trades_wallet ON trades(wallet, entry_ts);
CREATE TABLE IF NOT EXISTS theses (id INTEGER PRIMARY KEY, handle TEXT, ts INTEGER, mint TEXT, chain TEXT, text TEXT, type TEXT, trade_id INTEGER, px0 REAL, px1h REAL, px6h REAL, px24h REAL, poster_exit_s INTEGER, source TEXT);
CREATE TABLE IF NOT EXISTS prices (mint TEXT, ts INTEGER, usd REAL, PRIMARY KEY (mint, ts));
CREATE TABLE IF NOT EXISTS wallet_trades (sig TEXT, wallet TEXT, handle TEXT, ts INTEGER, mint TEXT, side TEXT, usd REAL, px REAL, mc_at REAL, trade_id INTEGER, PRIMARY KEY (sig, wallet, mint, side));
CREATE INDEX IF NOT EXISTS wt_ts ON wallet_trades(ts);
CREATE TABLE IF NOT EXISTS stats (k TEXT PRIMARY KEY, v REAL);
CREATE TABLE IF NOT EXISTS ff (id INTEGER PRIMARY KEY, mint TEXT, win TEXT, ts INTEGER, rank INTEGER, buyers INTEGER, buy_usd REAL, net_usd REAL, mc REAL, px REAL, px15 REAL, px60 REAL, px360 REAL, peak REAL, UNIQUE(mint, win, ts));
CREATE INDEX IF NOT EXISTS ff_ts ON ff(ts);
CREATE TABLE IF NOT EXISTS buyers_seen (mint TEXT, wallet TEXT, ts INTEGER, PRIMARY KEY (mint, wallet)); -- unique fomo buyers per coin (from decoded transactions)
CREATE INDEX IF NOT EXISTS bs_ts ON buyers_seen(ts);
`);
// FF exits (22 Oct): scored on the 30-s marker — x_t2s40 = first touch of 2x or −40% (value = the multiple sold at), x_t15s40 = 1.5x or −40%, trough = lowest multiple seen
for (const col of ["x_t2s40 REAL", "x_t15s40 REAL", "trough REAL DEFAULT 1"]) { try { db.exec(`ALTER TABLE ff ADD COLUMN ${col}`); } catch {} }
try { db.exec(`ALTER TABLE trades ADD COLUMN x_t2s40 REAL`); } catch {}
try { db.exec(`ALTER TABLE trades ADD COLUMN x_tsl40_at INTEGER`); } catch {} // when the trail exit fired (FF2 card) // 2x-or-−40% exit, scored on every trade (FF2 book, 22 Oct)
export const q = {
  insFlow: db.prepare(`INSERT INTO flow (sig, slot, ts, mint, side, usd, quote, quote_amt, tokens, venue, pool, wallet, decoded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  seenSig: db.prepare(`SELECT 1 FROM flow WHERE sig=? LIMIT 1`).pluck(),
  bumpHour: db.prepare(`INSERT INTO flow_hourly (mint, hour, buys, sells, buy_usd, sell_usd) VALUES (?,?,?,?,?,?) ON CONFLICT(mint, hour) DO UPDATE SET buys=buys+excluded.buys, sells=sells+excluded.sells, buy_usd=buy_usd+excluded.buy_usd, sell_usd=sell_usd+excluded.sell_usd`),
  resolvePool: db.prepare(`UPDATE flow SET mint=? WHERE pool=? AND mint IS NULL`),
  pendingPoolRows: db.prepare(`SELECT pool, COUNT(*) n FROM flow WHERE mint IS NULL AND pool IS NOT NULL AND ts>=? GROUP BY pool ORDER BY n DESC LIMIT ?`),
  insPool: db.prepare(`INSERT OR REPLACE INTO pools (pool, venue, mint, quote, mint_side, dec, ignore, ts) VALUES (?,?,?,?,?,?,?,?)`),
  allPools: db.prepare(`SELECT * FROM pools`),
  upCoin: db.prepare(`INSERT INTO coins (mint, first_seen) VALUES (?, ?) ON CONFLICT(mint) DO NOTHING`),
  setCoinMeta: db.prepare(`UPDATE coins SET symbol=?, name=?, mc_usd=?, px_usd=?, liq_usd=?, meta_ts=? WHERE mint=?`),
  setCoinDec: db.prepare(`UPDATE coins SET dec=? WHERE mint=? AND dec IS NULL`),
  coin: db.prepare(`SELECT * FROM coins WHERE mint=?`),
  trending: db.prepare(`SELECT mint, SUM(CASE WHEN side='buy' THEN 1 ELSE 0 END) buys, SUM(CASE WHEN side='sell' THEN 1 ELSE 0 END) sells,
      SUM(CASE WHEN side='buy' THEN usd ELSE 0 END) buy_usd, SUM(CASE WHEN side='sell' THEN usd ELSE 0 END) sell_usd,
      COUNT(DISTINCT CASE WHEN side='buy' AND wallet IS NOT NULL THEN wallet END) buyers, SUM(CASE WHEN side='buy' AND decoded=1 THEN 1 ELSE 0 END) buys_decoded, MIN(ts) first_ts, MAX(ts) last_ts
    FROM flow WHERE ts>=? AND mint IS NOT NULL GROUP BY mint ORDER BY buyers DESC, buy_usd DESC LIMIT ?`),
  topMints1h: db.prepare(`SELECT mint FROM flow WHERE ts>=? AND mint IS NOT NULL AND side='buy' GROUP BY mint ORDER BY COUNT(*) DESC LIMIT ?`).pluck(),
  undecoded: db.prepare(`SELECT rowid, sig, mint FROM flow WHERE decoded=0 AND wallet IS NULL AND ts>=? AND mint IN (${"?,".repeat(40).slice(0, -1)}) ORDER BY ts DESC LIMIT ?`),
  setWallet: db.prepare(`UPDATE flow SET wallet=?, decoded=1 WHERE sig=?`),
  setDecoded: db.prepare(`UPDATE flow SET decoded=1 WHERE sig=?`),
  insBuyer: db.prepare(`INSERT OR IGNORE INTO buyers_seen (mint, wallet, ts) VALUES (?,?,?)`),
  pruneFlow: db.prepare(`DELETE FROM flow WHERE ts<?`), pruneHourly: db.prepare(`DELETE FROM flow_hourly WHERE hour<?`), prunePrices: db.prepare(`DELETE FROM prices WHERE ts<?`), pruneBuyers: db.prepare(`DELETE FROM buyers_seen WHERE ts<?`),
  addWallet: db.prepare(`INSERT INTO wallets (wallet, handle, label, source, added_ts, active) VALUES (?,?,?,?,?,1) ON CONFLICT(wallet) DO UPDATE SET handle=COALESCE(excluded.handle, handle), label=COALESCE(excluded.label, label), active=1`),
  dropWallet: db.prepare(`UPDATE wallets SET active=0 WHERE wallet=?`),
  listWallets: db.prepare(`SELECT * FROM wallets WHERE active=1 ORDER BY added_ts`),
  walletTrades: db.prepare(`SELECT COUNT(*) n, SUM(closed) closed, AVG(CASE WHEN closed=1 THEN x_h5 END) h5, AVG(CASE WHEN closed=1 THEN x_tsl40 END) tsl40, AVG(CASE WHEN closed=1 THEN x_t15s40 END) t15s40, AVG(CASE WHEN closed=1 THEN x_copy END) copy, AVG(CASE WHEN closed=1 THEN x_time END) time,
      SUM(CASE WHEN closed=1 AND x_tsl40>1 THEN 1 ELSE 0 END) won40, AVG(peak) peak, MAX(entry_ts) last_ts, AVG(entry_usd) avg_usd FROM trades WHERE wallet=?`),
  insTrade: db.prepare(`INSERT INTO trades (wallet, handle, mint, symbol, sig, entry_ts, entry_px, entry_usd, entry_mc, last_px, last_ts, peak) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`),
  openTrades: db.prepare(`SELECT * FROM trades WHERE closed=0 ORDER BY entry_ts`),
  openTradesOf: db.prepare(`SELECT * FROM trades WHERE closed=0 AND wallet=? AND mint=?`),
  updTrade: db.prepare(`UPDATE trades SET px5=?, px30=?, px120=?, px5_at=?, px30_at=?, px120_at=?, peak=?, last_px=?, last_ts=?, x_h5=?, x_tsl40=?, x_t15s40=?, x_copy=?, x_time=?, closed=?, exit_reason=? WHERE id=?`),
  setTheirSell: db.prepare(`UPDATE trades SET their_sell_ts=?, their_sell_px=?, their_sell_usd=? WHERE id=?`),
  recentTrades: db.prepare(`SELECT t.*, c.symbol csym, c.name cname FROM trades t LEFT JOIN coins c ON c.mint=t.mint WHERE t.entry_ts>=? ORDER BY t.entry_ts DESC LIMIT ?`),
  tradesCsv: db.prepare(`SELECT * FROM trades WHERE entry_ts>=? ORDER BY entry_ts`),
  hourlyCsv: db.prepare(`SELECT h.*, c.symbol FROM flow_hourly h LEFT JOIN coins c ON c.mint=h.mint WHERE hour>=? ORDER BY hour, mint`),
  thesesCsv: db.prepare(`SELECT * FROM theses WHERE ts>=? ORDER BY ts`),
  insWT: db.prepare(`INSERT OR IGNORE INTO wallet_trades (sig, wallet, handle, ts, mint, side, usd, px, mc_at, trade_id) VALUES (?,?,?,?,?,?,?,?,?,?)`),
  feed: db.prepare(`SELECT w.*, c.symbol, c.name, c.mc_usd mc_now, c.meta_ts, (SELECT t.text FROM theses t WHERE t.mint=w.mint AND (t.handle=w.handle OR t.handle=w.wallet) AND t.ts BETWEEN w.ts-86400 AND w.ts+86400 ORDER BY t.ts DESC LIMIT 1) thesis FROM wallet_trades w LEFT JOIN coins c ON c.mint=w.mint WHERE w.ts>=? ORDER BY w.ts DESC LIMIT ?`),
  stream: db.prepare(`SELECT w.*, c.symbol, c.name, c.mc_usd mc_now, (SELECT t.text FROM theses t WHERE t.mint=w.mint AND (t.handle=w.handle OR t.handle=w.wallet) AND t.ts BETWEEN w.ts-86400 AND w.ts+86400 ORDER BY t.ts DESC LIMIT 1) thesis, (SELECT COUNT(DISTINCT wallet) FROM wallet_trades x WHERE x.mint=w.mint AND x.side='buy' AND x.ts BETWEEN w.ts-3600 AND w.ts) buyers_1h FROM wallet_trades w LEFT JOIN coins c ON c.mint=w.mint ORDER BY w.ts DESC LIMIT ?`),
  hot: db.prepare(`SELECT mint, COUNT(DISTINCT CASE WHEN side='buy' AND wallet IS NOT NULL THEN wallet END) buyers, SUM(CASE WHEN side='buy' THEN 1 ELSE 0 END) buys, SUM(CASE WHEN side='sell' THEN 1 ELSE 0 END) sells, SUM(CASE WHEN side='buy' THEN usd ELSE 0 END) buy_usd, SUM(CASE WHEN side='sell' THEN usd ELSE 0 END) sell_usd, MIN(ts) first_ts FROM flow WHERE ts>=? AND mint IS NOT NULL GROUP BY mint ORDER BY buyers DESC, buys DESC, buy_usd DESC LIMIT ?`),
  whoIn: db.prepare(`SELECT handle, wallet, side, usd, mc_at, ts FROM wallet_trades WHERE mint=? AND ts>=? ORDER BY ts DESC LIMIT 20`),
  priceBefore: db.prepare(`SELECT usd FROM prices WHERE mint=? AND ts<=? ORDER BY ts DESC LIMIT 1`).pluck(),
  insFF: db.prepare(`INSERT OR IGNORE INTO ff (mint, win, ts, rank, buyers, buy_usd, net_usd, mc, px, peak) VALUES (?,?,?,?,?,?,?,?,?,1)`),
  ffOpen: db.prepare(`SELECT * FROM ff WHERE px>0 AND (px15 IS NULL OR px60 IS NULL OR px360 IS NULL) AND ts>=?`),
  updFF: db.prepare(`UPDATE ff SET px15=COALESCE(px15,?), px60=COALESCE(px60,?), px360=COALESCE(px360,?), peak=MAX(peak,?), trough=MIN(COALESCE(trough,1),?), x_t2s40=COALESCE(x_t2s40,?), x_t15s40=COALESCE(x_t15s40,?) WHERE id=?`),
  ffStats: db.prepare(`SELECT win, COUNT(*) n, AVG(px15/px) m15, AVG(px60/px) m60, AVG(px360/px) m360, AVG(peak) peak, SUM(CASE WHEN peak>=1.5 THEN 1 ELSE 0 END) hit15, SUM(CASE WHEN px60/px<=0.6 THEN 1 ELSE 0 END) dead60,
    SUM(CASE WHEN x_t2s40 IS NOT NULL THEN 1 ELSE 0 END) n2, SUM(CASE WHEN x_t2s40>=2 THEN 1 ELSE 0 END) won2, AVG(x_t2s40) m2, SUM(CASE WHEN x_t15s40 IS NOT NULL THEN 1 ELSE 0 END) n15x, SUM(CASE WHEN x_t15s40>=1.5 THEN 1 ELSE 0 END) won15x, AVG(x_t15s40) m15x
    FROM ff WHERE px>0 AND px60 IS NOT NULL GROUP BY win`),
  ff2Rows: db.prepare(`SELECT t.*, c.mc_usd mc_now FROM trades t LEFT JOIN coins c ON c.mint=t.mint WHERE t.wallet=? ORDER BY t.entry_ts DESC LIMIT 200`),
  firstBuyPx: db.prepare(`SELECT usd/tokens FROM flow WHERE mint=? AND ts>=? AND side='buy' AND tokens>0 AND usd>0 ORDER BY ts LIMIT 1`).pluck(), // window-start price for a coin too new to have a price tick (the first fomo fill in the window)
  ffRecent: db.prepare(`SELECT 1 FROM trades WHERE wallet=? AND mint=? AND entry_ts>=? LIMIT 1`).pluck(),
  setX2: db.prepare(`UPDATE trades SET x_t2s40=? WHERE id=?`),
  setTslAt: db.prepare(`UPDATE trades SET x_tsl40_at=? WHERE id=? AND x_tsl40_at IS NULL`),
  ffCsv: db.prepare(`SELECT f.id, f.mint, c.symbol, f.win, f.ts, f.rank, f.buyers, f.buy_usd, f.net_usd, f.mc, f.px, f.px15, f.px60, f.px360, f.peak, f.trough, f.x_t2s40, f.x_t15s40 FROM ff f LEFT JOIN coins c ON c.mint=f.mint ORDER BY f.ts`),
  feedMints: db.prepare(`SELECT DISTINCT mint FROM wallet_trades WHERE ts>=? UNION SELECT DISTINCT mint FROM trades WHERE closed=0`).pluck(),
  insPrice: db.prepare(`INSERT OR IGNORE INTO prices (mint, ts, usd) VALUES (?,?,?)`),
  priceAt: db.prepare(`SELECT ts, usd FROM prices WHERE mint=? AND ts>=? ORDER BY ts LIMIT 1`),
  stat: db.prepare(`SELECT v FROM stats WHERE k=?`).pluck(), setStat: db.prepare(`INSERT INTO stats (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`),
  flowCount: db.prepare(`SELECT COUNT(*) n, SUM(mint IS NULL) unresolved, SUM(decoded) decoded, SUM(wallet IS NOT NULL) with_wallet FROM flow WHERE ts>=?`),
  walletBuyers: db.prepare(`SELECT wallet, COUNT(DISTINCT mint) coins, COUNT(*) buys, MIN(ts) first_ts, MAX(ts) last_ts FROM buyers_seen WHERE ts>=? GROUP BY wallet HAVING buys>=? ORDER BY coins DESC LIMIT ?`),
};
export const nowS = () => Math.floor(Date.now() / 1000);
