// main.mjs — older-coin paper project (spec older-1). PAPER ONLY: nothing here can sign or send a transaction.
// Env (from OLDER_ENV, default /root/older/.env; values are never printed): RPC_WS, RPC_HTTP (any Solana RPC with WebSockets),
// GMGN_API_KEY, OLDER_DB (default /root/older/older.db), OLDER_PORT (default 8793), OLDER_SITE_KEY (optional), cost figures.
import { readFileSync, existsSync } from "node:fs";
const ENVF = process.env.OLDER_ENV || "/root/older/.env";
if (existsSync(ENVF)) for (const l of readFileSync(ENVF, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const { Store } = await import("./store.mjs"); const { Engine } = await import("./engine.mjs");
const { startFeed, fs } = await import("./feed.mjs"); const { dec } = await import("./decoder.mjs");
const { startSolUsd, solUsd, sp } = await import("./solusd.mjs"); const { startBackfill, bf } = await import("./backfill.mjs");
const { inventory } = await import("./inventory.mjs"); const { gm } = await import("./gmgn.mjs"); const { startWeb } = await import("./web.mjs");

for (const k of ["RPC_WS", "RPC_HTTP"]) if (!process.env[k]) { console.error(`[older] ${k} is not set — cannot start the feed`); process.exit(1); }
const store = new Store(process.env.OLDER_DB || "/root/older/older.db");
const log = (s) => console.log(new Date().toISOString(), s);
const engine = new Engine({ store, solUsd, log });
store.restore(engine);
const now0 = Date.now() / 1000; engine.restartGap(store.lastAlive(), now0);
await startSolUsd();
const backfill = startBackfill({ engine, store, log });
engine.needCreation = (mint) => backfill.want(mint, 2);
const pools = store.loadPools();
startFeed({ engine, store, backfill, pools, log });

// initial discovery of existing pools: on first start, then once a day
async function runInventory() {
  try { const { watch } = await inventory({ store, solUsd, log }); for (const w of watch.sort((a, b) => Math.abs(Math.log(a.mc / 150000)) - Math.abs(Math.log(b.mc / 150000)))) { engine.coin(w.mint, { pool: w.pool }); backfill.want(w.mint, w.mc >= 20000 && w.mc <= 1e6 ? 1 : 3); } }
  catch (e) { log("[inventory] failed: " + e.message); }
}
const inv0 = store.db.prepare("SELECT v FROM meta WHERE k='inventory'").get();
if (!inv0 || Date.now() - Date.parse(JSON.parse(inv0.v).at) > 86400e3) runInventory();
setInterval(runInventory, 86400e3);

// clock: exits/timeouts every second; heartbeat each minute; after an outage, re-fill the gap for coins that matter; retention hourly
let gapsSeen = engine.cov.gaps.length;
setInterval(() => {
  const t = Date.now() / 1000; engine.tick(t);
  if (engine.cov.gaps.length > gapsSeen) { for (const [a, b] of engine.cov.gaps.slice(gapsSeen)) { const mints = [...new Set([...engine.byMint.keys()].filter((m) => engine.byMint.get(m).size))]; for (const [m, c] of engine.coins) if (c.series.lastPx && c.series.lastPx * c.supply >= 20000 && c.series.lastPx * c.supply <= 1e6) mints.push(m); backfill.patchGap(a, b, [...new Set(mints)]); } gapsSeen = engine.cov.gaps.length; }
}, 1000);
setInterval(() => store.heartbeat(Date.now() / 1000), 60000);
setInterval(() => { const n = store.retention(Date.now() / 1000); if (n) log(`[retention] ${n} old bars removed`); }, 3600e3);

const inv = () => { try { return JSON.parse(store.db.prepare("SELECT v FROM meta WHERE k='inventory'").get()?.v || "null"); } catch { return null; } };
startWeb({ port: Number(process.env.OLDER_PORT || 8793), store, engine, status: () => ({ feed: { ...fs }, engine: { ...engine.stats, coins: engine.coins.size, open: [...engine.byMint.values()].reduce((s, x) => s + x.size, 0), gaps: engine.cov.gaps.length }, decoder: { ...dec }, sol: { ...sp }, gmgn: { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, lastErr: gm.lastErr, rate_headers: gm.headers }, backfill: { ...bf }, backfillQ: backfill.size(), inventory: inv(), mem_mb: Math.round(process.memoryUsage().rss / 2 ** 20) }) });
log("[older] started, spec older-1, paper only");
