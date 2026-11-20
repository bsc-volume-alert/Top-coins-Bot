// main.mjs — older-coin paper project (spec older-2). PAPER ONLY: nothing here can sign or send a transaction.
// Env (values are never printed): OLDER_ENV file (default /root/older/.env), then /root/tracker/.env for keys already on the server.
//   RPC_WS / RPC_HTTP (any Solana RPC with WebSockets) — or HELIUS_API_KEY, from which both are built; GMGN_API_KEY;
//   OLDER_DB (default /root/older/older.db), OLDER_PORT (8793), OLDER_SITE_KEY (optional), OLDER_RES_MODE (pre|post), cost figures.
import { readFileSync, existsSync } from "node:fs";
for (const f of [process.env.OLDER_ENV || "/root/older/.env", "/root/tracker/.env"]) if (existsSync(f)) for (const l of readFileSync(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
if (process.env.HELIUS_API_KEY) { process.env.RPC_WS ||= "wss://mainnet.helius-rpc.com/?api-key=" + process.env.HELIUS_API_KEY; process.env.RPC_HTTP ||= "https://mainnet.helius-rpc.com/?api-key=" + process.env.HELIUS_API_KEY; }
for (const k of ["RPC_WS", "RPC_HTTP"]) if (!process.env[k]) { console.error(`[older] ${k} is not set — cannot start the feed`); process.exit(1); }
const { Store } = await import("./store.mjs"); const { Engine } = await import("./engine.mjs");
const { startFeed, fs } = await import("./feed.mjs"); const { dec, IDL_PIN } = await import("./decoder.mjs");
const { startSolUsd, solUsd, sp } = await import("./solusd.mjs"); const { startBackfill, bf } = await import("./backfill.mjs");
const { inventory } = await import("./inventory.mjs"); const { gm } = await import("./gmgn.mjs"); const { startWeb } = await import("./web.mjs");
const { verifyEntry, vf } = await import("./verify.mjs"); const { SPEC_VER } = await import("./spec.mjs");

const store = new Store(process.env.OLDER_DB || "/root/older/older.db");
const log = (s) => console.log(new Date().toISOString(), s);
const now0 = Date.now() / 1000, firstStart = store.firstStart(now0), lastSlot = new Map();
const engine = new Engine({ store, solUsd, log, firstStart, onFill: (e, c) => verifyEntry(e, c, { store, lastSlotOf: (m) => lastSlot.get(m) ?? null }) });
const onEvent = engine.onEvent.bind(engine); engine.onEvent = (ev) => { if (ev.slot) lastSlot.set(ev.mint, ev.slot); const c = engine.coins.get(ev.mint); if (c) c.eventCount = (c.eventCount || 0) + 1; onEvent(ev); };
store.restore(engine); engine.restartGap(store.lastAlive(), now0);
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

// clock: scheduled fills/exits every 100 ms (1 s and 0.7 s delays need a fine clock); bars, memory, heartbeat each minute
setInterval(() => engine.tick(Date.now() / 1000), 100);
let gapsSeen = engine.cov.gaps.length;
setInterval(() => {
  const t = Date.now() / 1000; engine.prune(t); store.heartbeat(t);
  if (engine.feedCov.gaps.length > gapsSeen) { for (const [a, b] of engine.feedCov.gaps.slice(gapsSeen)) { const mints = [...engine.byMint.keys()].filter((m) => engine.byMint.get(m).size); for (const [m, c] of engine.coins) if (c.series.lastPx && c.series.lastPx * c.supply >= 20000 && c.series.lastPx * c.supply <= 1e6) mints.push(m); backfill.patchGap(a, b, [...new Set(mints)]); } gapsSeen = engine.feedCov.gaps.length; }
}, 60000);
setInterval(() => { const n = store.retention(Date.now() / 1000); if (n) log(`[retention] ${n} old bars removed`); }, 3600e3);

const inv = () => { try { return JSON.parse(store.db.prepare("SELECT v FROM meta WHERE k='inventory'").get()?.v || "null"); } catch { return null; } };
const valid = () => { try { return JSON.parse(store.db.prepare("SELECT v FROM meta WHERE k='tx_validation'").get()?.v || "null"); } catch { return null; } };
startWeb({ port: Number(process.env.OLDER_PORT || 8793), store, engine, status: () => ({ started: now0, first_start: firstStart, idl: IDL_PIN,
  feed: { ...fs, lag_ms_avg: fs.lagN ? Math.round(fs.lagMsSum / fs.lagN) : null }, engine: { ...engine.stats, coins: engine.coins.size, open: [...engine.byMint.values()].reduce((s, x) => s + x.size, 0), feed_gaps: engine.feedCov.gaps.length, usd_down: engine.usdDown },
  decoder: { ...dec }, tx_validation: valid(), verify: { ...vf }, sol: { ...sp }, gmgn: { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, lastErr: gm.lastErr, rate_headers: gm.headers }, backfill: { ...bf }, backfillQ: backfill.size(), inventory: inv(), mem_mb: Math.round(process.memoryUsage().rss / 2 ** 20) }) });
log(`[older] started, spec ${SPEC_VER}, paper only`);
