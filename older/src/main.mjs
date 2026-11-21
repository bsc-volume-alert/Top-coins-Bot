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
// the diagnostic account read applies to entries priced from a reconstructed pool state; routed-quote entries carry their quote evidence instead
// background measurement at every entry (never a filter): holder count and the provider's 5-minute / 1-hour statistics
const snapStats = { ok: 0, missing: 0, failed: 0 }; let Jx = null;
const snapshot = async (e) => { const want = e.decisionT; try { Jx ??= await import("./jupiter.mjs"); const r = await Jx.tokenStats(e.mint); e.snap = { decision_t: want, delay_s: +(r.req - want).toFixed(2), ...r }; r.ok ? snapStats.ok++ : snapStats.missing++; } catch (x) { snapStats.failed++; e.snap = { ok: false, decision_t: want, why: String(x.message).slice(0, 120) }; } store.saveEntry(e); };
const engine = new Engine({ store, solUsd, log, firstStart, onEntry: (e) => { snapshot(e); }, onFill: (e, c) => { if (e.exec !== "routed-quote") verifyEntry(e, c, { store, lastSlotOf: (m) => lastSlot.get(m) ?? null }); } });
const onEvent = engine.onEvent.bind(engine); engine.onEvent = (ev) => { if (ev.slot) lastSlot.set(ev.mint, ev.slot); const c = engine.coins.get(ev.mint); if (c) c.eventCount = (c.eventCount || 0) + 1; onEvent(ev); };
store.restore(engine); engine.restartGap(store.lastAlive(), now0);
// planned stop (pm2 restart/stop sends SIGINT): every open position's peak is saved and the last-alive time is written first,
// so a planned restart loses nothing and its gap is measured from the real stop
let stopping = false; for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { if (stopping) return; stopping = true; try { const n = store.tx(() => engine.flush()); store.heartbeat(Date.now() / 1000); log(`[older] ${sig}: ${n} open positions saved, stopping`); } catch (e) { log("[older] save on stop failed: " + e.message); } process.exit(0); });
// the entry window: OLDER_ENTRIES_UNTIL (unix seconds, or an ISO date) — after it nothing new is opened; open positions, their
// exits and the 24-hour runner tracking carry on until every included position is complete
if (process.env.OLDER_ENTRIES_UNTIL && process.env.OLDER_ENTRIES_UNTIL.trim()) { const v = process.env.OLDER_ENTRIES_UNTIL; engine.entriesUntil = /^\d+$/.test(v) ? Number(v) : Date.parse(v) / 1000; log(`[older] entry window closes ${new Date(engine.entriesUntil * 1000).toISOString()}`); }
let COMMIT = process.env.OLDER_COMMIT || null; try { const { execSync } = await import("node:child_process"); COMMIT = COMMIT || execSync("git rev-parse HEAD", { cwd: new URL(".", import.meta.url).pathname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch {}
store.db.prepare("INSERT INTO feed (t, ev, detail) VALUES (?,?,?)").run(now0, "start", `commit ${COMMIT || "unknown"}`);
await startSolUsd();
const J = await import("./jupiter.mjs");
const backfill = startBackfill({ engine, store, jup: J, log });
engine.needCreation = (mint) => backfill.want(mint, 2);
const pools = store.loadPools();
const feed = startFeed({ engine, store, backfill, pools, log });
// DIAGNOSTICS ONLY (no decision reads this): where the memory is. Recomputed at most once a minute.
let sizesAt = 0, sizesV = null;
const sizes = () => { const now = Date.now(); if (sizesV && now - sizesAt < 60000) return sizesV; sizesAt = now;
  let raw = 0, bars = 0, bfb = 0, wallets = 0, withData = 0, anchors = 0, withBreaks = 0, ownGaps = 0; for (const c of engine.coins.values()) { const sr = c.series; raw += sr.raw.length; bars += sr.bars.size; bfb += sr.bf.size; if (sr.raw.length || sr.bars.size) withData++; if (sr.anchor) anchors++; if (sr.own.length) { withBreaks++; ownGaps += sr.own.length; } for (const b of sr.bars.values()) wallets += b.buyers.size; }
  const m = process.memoryUsage(), mb = (x) => Math.round(x / 2 ** 20);
  return (sizesV = { rss_mb: mb(m.rss), heap_used_mb: mb(m.heapUsed), heap_total_mb: mb(m.heapTotal), external_mb: mb(m.external), coins: engine.coins.size, coins_with_data: withData, raw_obs: raw, live_bars: bars, backfill_bars: bfb, buyer_wallets: wallets, anchors, coins_with_price_breaks: withBreaks, price_breaks_on_record: ownGaps, entries_in_memory: engine.entries.size, dirty_bars: engine.dirtyBars?.size ?? null, ...feed.sizes() }); };

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

// ---- Solana-wide adapter (launchpad- and exchange-neutral): sampled prices + routed quotes through Jupiter. Off unless OLDER_SOLANA_WIDE=1.
const { Poller } = await import("./polled.mjs"); const { classifyMintAccount, TOKEN_2022 } = await import("./risk.mjs"); const { rpc } = await import("./feed.mjs");
let poller = null;
if (process.env.OLDER_SOLANA_WIDE === "1") {
  poller = new Poller({ engine, jup: J, store, log, hotEvery: Number(process.env.OLDER_HOT_S || 10), coldEvery: Number(process.env.OLDER_COLD_S || 60), quoteFast: Number(process.env.OLDER_QUOTE_FAST_S || 2), quoteSlow: Number(process.env.OLDER_QUOTE_SLOW_S || 10) });
  log(`[older] sampled coins restored to the watch list: ${poller.restore()}`);
  poller.start();
  // Token-2022 mints: read the extensions from the chain (1 call each) — until then their risk status is "missing", not clean
  (async () => { while (true) { await new Promise((r) => setTimeout(r, 1000)); const c = [...engine.coins.values()].find((x) => x.mode === "polled" && x.info.token_program === TOKEN_2022 && !x.riskRead); if (!c) continue; c.riskRead = true;
    try { const r = await rpc("getAccountInfo", [c.mint, { encoding: "jsonParsed" }]); c.info.risk = classifyMintAccount(r?.value); store.saveCoin(c.mint, { info: c.info }); } catch { c.info.risk = { status: "missing", why: "mint account read failed" }; } } })();
  log("[older] Solana-wide adapter ON (Jupiter polling + routed quotes)");
}
const inv = () => { try { return JSON.parse(store.db.prepare("SELECT v FROM meta WHERE k='inventory'").get()?.v || "null"); } catch { return null; } };
// the reserve reading counts as validated only when the owner sets OLDER_RES_VALIDATED=1 after reviewing docs/tx-validation.json
const valid = () => (process.env.OLDER_RES_VALIDATED === "1" ? { by: "OLDER_RES_VALIDATED" } : null);
const web = startWeb({ port: Number(process.env.OLDER_PORT || 8793), store, engine, status: () => ({ started: now0, first_start: firstStart, commit: COMMIT, run: process.env.OLDER_RUN_NAME || null, entries_until: engine.entriesUntil, idl: IDL_PIN,
  feed: { ...fs, lag_ms_avg: fs.lagN ? Math.round(fs.lagMsSum / fs.lagN) : null }, engine: { ...engine.stats, coins: engine.coins.size, open: [...engine.byMint.values()].reduce((s, x) => s + x.size, 0), feed_gaps: engine.feedCov.gaps.length, usd_down: engine.usdDown },
  decoder: { ...dec }, tx_validation: valid(), verify: { ...vf }, snapshots: { ...snapStats }, sol: { ...sp }, gmgn: { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, lastErr: gm.lastErr, rate_headers: gm.headers }, backfill: { ...bf }, backfillQ: backfill.size(), jupiter: { ...J.ju, key: !!process.env.JUP_API_KEY, rps: Number(process.env.JUP_RPS || (process.env.JUP_API_KEY ? 1 : 0.5)) }, poller: poller ? { ...poller.stats, cadence_avg_s: poller.stats.cadence.n ? +(poller.stats.cadence.sum / poller.stats.cadence.n).toFixed(1) : null, hot_s: poller.hotEvery, cold_s: poller.coldEvery } : null, inventory: inv(), mem_mb: Math.round(process.memoryUsage().rss / 2 ** 20), sizes: sizes() }) });
log(`[older] started, spec ${SPEC_VER}, paper only`);

// ---- monitoring copy: every 5 minutes the dashboard's own data is written to $OLDER_OUT/pub/state.json (no keys in it);
// scripts/publish.sh pushes that folder to the GitHub branch "older-data" so the run can be watched and reviewed remotely
if (process.env.OLDER_OUT && !process.env.OLDER_RUN_MINUTES) {
  const { writeFileSync, mkdirSync } = await import("node:fs"); const dir = process.env.OLDER_OUT + "/pub"; mkdirSync(dir, { recursive: true });
  // entries.json: EVERY entry of this database in compact form (state.json only carries the latest 40), so results can be worked
  // out per coin and per entry over the whole run. Returns are fractions of cost; null = not closed. Keys: t20…t40 = pure trail,
  // h20…h40 = sell half at 2× then trail, and the same with an x suffix for the stall-exit versions (CONT-STALL).
  const compact = () => store.allEntries().map((e) => { const r = {}; for (const v of e.versions || []) r[(v.policy === "trail" ? "t" : "h") + Math.round(v.stop * 100) + (v.stall ? "x" : "")] = v.ret == null ? null : +v.ret.toFixed(4);
    const w5 = e.features?.w5, s5 = e.snap?.stats5m, mv = {}; for (const c of e.cands || []) if (c.detail?.move_s != null) mv[c.family] = c.detail.move_s; return { id: e.id, mint: e.mint, sym: engine.coins.get(e.mint)?.info?.symbol ?? null, t: Math.round(e.decisionT), ag: e.ag, fam: e.families, mode: e.mode, pop: e.pop ?? null, status: e.status, mc: Math.round(e.signalMc || 0), delay: e.fill?.delay_s ?? null, max: e.runner?.maxX != null ? +e.runner.maxX.toFixed(3) : null, ret: r, chk: e.verify?.diff_quote != null ? +(e.verify.diff_quote * 100).toFixed(2) : null, flags: (e.flags || []).length,
      holders: e.snap?.holders ?? null, hc5: s5?.holderChange ?? null, traders5: s5?.numTraders ?? null, b1: e.features?.w1?.buyers ?? null, b5: w5?.buyers ?? null, v5: w5?.vol_usd ?? null, top5: w5?.top_buyer_share ?? null, surge: e.features?.vol_surge5 ?? null, move_s: mv }; });
  const dump = () => { try { for (const pop of ["", "pumpswap-canonical", "solana-wide"]) writeFileSync(`${dir}/state${pop ? "-" + pop : ""}.json`, JSON.stringify(web.state(pop))); writeFileSync(`${dir}/entries.json`, JSON.stringify({ at: Date.now(), commit: COMMIT, run: process.env.OLDER_RUN_NAME || null, entries: compact() })); } catch (e) { log("[pub] " + e.message); } };
  setTimeout(dump, 60000); setInterval(dump, 300000);
}

// ---- bounded validation run: OLDER_RUN_MINUTES=N writes a snapshot every minute to $OLDER_OUT/validation-run.json and exits after N minutes
if (process.env.OLDER_RUN_MINUTES) {
  const { writeFileSync } = await import("node:fs"); const N = Number(process.env.OLDER_RUN_MINUTES), outF = (process.env.OLDER_OUT || ".") + "/validation-run.json", snaps = [];
  let lagMax = 0, lastTick = Date.now(); setInterval(() => { const d = Date.now() - lastTick - 100; if (d > lagMax) lagMax = d; lastTick = Date.now(); }, 100); // event-loop backlog
  const snap = () => { const d = store.disk(), mb = fs.bytes / 1e6; snaps.push({ min: snaps.length, at: new Date().toISOString(), rss_mb: Math.round(process.memoryUsage().rss / 2 ** 20), heap_mb: Math.round(process.memoryUsage().heapUsed / 2 ** 20), db_mb: d.db_mb, wal_mb: d.wal_mb, free_gb: d.free_gb, bars: d.bars,
    feed: { connected: fs.connected, msgs: fs.msgs, mb: +mb.toFixed(1), helius_stream_credits: Math.round((mb / 0.1) * 2), events: fs.events, emitted: fs.emitted, failed_tx: fs.failedTx, dupes: fs.dupes, held: fs.held, replayed: fs.replayed, rejected: fs.rejected, non_canonical: fs.nonCanonical, non_sol: fs.nonSol, non_sol_quote_mints: Object.entries(fs.nonSolQuotes).sort((a, b) => b[1] - a[1]).slice(0, 8), lookup_fail: fs.lookupFail, lookup_errs: fs.lookupErrs, last_lookup_err: fs.lastLookupErr, non_sol_base_is_sol: fs.baseIsSol, discontinuities: fs.discontinuities, multi_event_tx: fs.multiEventTx, reconnects: fs.reconnects, lookup_calls: fs.lookupCalls, lag_ms_avg: fs.lagN ? Math.round(fs.lagMsSum / fs.lagN) : null },
    decoder: { ...dec }, engine: { ...engine.stats, coins: engine.coins.size, feed_gaps: engine.feedCov.gaps.length }, loop_lag_ms_max: lagMax, verify: { ...vf }, gmgn: { calls: gm.calls, limited: gm.limited }, backfill: { ...bf, queue: backfill.size() }, jupiter: { ...J.ju }, poller: poller?.stats ?? null, inventory: inv() }); lagMax = 0;
    writeFileSync(outF, JSON.stringify({ spec: SPEC_VER, minutes_planned: N, res_mode: dec.mode, note: "helius_stream_credits = 2 credits per 0.1 MB of WebSocket data received (Helius billing rule); RPC calls are extra and small", snaps }, null, 1)); };
  snap(); setInterval(snap, 60000); setTimeout(() => { snap(); log(`[older] validation run finished (${N} min) → ${outF}`); process.exit(0); }, N * 60000 + 500);
}
