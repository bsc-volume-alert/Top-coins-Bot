// Not a unit test: a throughput + page smoke run on synthetic random-walk coins. Usage: node test/sim-smoke.mjs <db path> [port]
import { Store } from "../src/store.mjs"; import { Engine } from "../src/engine.mjs"; import { startWeb } from "../src/web.mjs";
const db = process.argv[2], port = Number(process.argv[3] || 0);
const store = new Store(db), e = new Engine({ store, solUsd: () => 100 });
const T0 = 1_800_000_000, N = Number(process.argv[4] || 300), H = 3600, HOURS = Number(process.argv[5] || 12); let rnd = 7; const R = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
const coins = Array.from({ length: N }, (_, i) => ({ mint: "Sim" + i + "pump", pool: "Pool" + i, mc: 20000 + R() * 300000, create: T0 - R() * 40 * H }));
e.feedUp(T0); for (const c of coins) { e.coin(c.mint, { pool: c.pool, createTs: c.create }); store.saveCoin(c.mint, { pool: c.pool, createTs: c.create }); }
let swaps = 0; const t0 = Date.now();
for (let t = T0; t < T0 + HOURS * H; t += 20) {
  for (const c of coins) { if (R() < 0.5) continue; c.mc *= Math.exp((R() - 0.5) * 0.06 + (R() < 0.001 ? 0.8 : 0) - (R() < 0.0006 ? 0.5 : 0)); c.mc = Math.min(Math.max(c.mc, 3000), 3e6);
    e.onSwap({ t: t + R() * 19, mint: c.mint, pool: c.pool, base: 2e8, quote: (c.mc / 1e11) * 2e8, feeBps: 30, sol: R() * 2, isBuy: R() < 0.55, user: "w" + Math.floor(R() * 500) }); swaps++; }
  store.tx(() => e.tick(t)); if (t % 60 === 0) e.prune(t);
}
const secs = (Date.now() - t0) / 1000;
console.log(JSON.stringify({ swaps, secs, swaps_per_s: Math.round(swaps / secs), entries: e.stats.entries, notes: e.stats.notes, rss_mb: Math.round(process.memoryUsage().rss / 2 ** 20), disk: store.disk() }));
if (port) startWeb({ port, store, engine: e, status: () => ({ feed: { connected: true, lastMsg: Date.now() / 1000, emitted: swaps, held: 0, replayed: 0, rejected: 0, nonSol: 0, nonCanonical: 0, reconnects: 0, lag_ms_avg: 800 }, engine: { ...e.stats, coins: e.coins.size, open: 0 }, decoder: { mode: "pre", fitPre: 0, fitPost: 0, fitBoth: 0, fitNeither: 0, chainOk: 0, chainBad: 0 }, tx_validation: null, mem_mb: Math.round(process.memoryUsage().rss / 2 ** 20), verify: { done: 0, within1pct: 0, suspect: 0, failed: 0 }, sol: { px: 100, src: "sim" }, gmgn: { calls: 0, limited: 0, lastErr: "" }, backfill: { done: 0, refsOk: 0, refsMissing: 0 }, backfillQ: 0, inventory: { solPools: N, canonical: N, nonCanonical: 0, priced: N, minMc: 5000, aboveMin: N, inBand: 0, pumpSuffix: N } }) });
