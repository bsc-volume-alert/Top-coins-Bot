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
const { startSolUsd, solUsd, sp } = await import("./solusd.mjs"); const { startBackfill, bf, gapRequests } = await import("./backfill.mjs");
const { inventory } = await import("./inventory.mjs"); const { gm, tokenInfoFirst, tokenInfoLate } = await import("./gmgn.mjs"); const { startWeb } = await import("./web.mjs");
const { verifyEntry, vf } = await import("./verify.mjs"); const { SPEC_VER, booksOf, GATES_11 } = await import("./spec.mjs"); const { riskStatus } = await import("./risk.mjs"); const { RISK_REFRESH_S } = await import("./spec.mjs");

const store = new Store(process.env.OLDER_DB || "/root/older/older.db");
const log = (s) => console.log(new Date().toISOString(), s);
const now0 = Date.now() / 1000, firstStart = store.firstStart(now0), lastSlot = new Map();
// the diagnostic account read applies to entries priced from a reconstructed pool state; routed-quote entries carry their quote evidence instead
// background measurement at every entry (never a filter): holder count and the provider's 5-minute / 1-hour statistics
const snapStats = { ok: 0, missing: 0, failed: 0 }; let Jx = null;
const snapshot = async (e) => { const want = e.decisionT; try { Jx ??= await import("./jupiter.mjs"); const r = await Jx.tokenStats(e.mint); e.snap = { decision_t: want, delay_s: +(r.req - want).toFixed(2), ...r }; r.ok ? snapStats.ok++ : snapStats.missing++; } catch (x) { snapStats.failed++; e.snap = { ok: false, decision_t: want, why: String(x.message).slice(0, 120) }; } store.saveEntry(e); };
const engine = new Engine({ store, solUsd, log, firstStart, onEntry: (e) => { snapshot(e); }, onFill: (e, c) => { if (e.exec !== "routed-quote") verifyEntry(e, c, { store, lastSlotOf: (m) => lastSlot.get(m) ?? null }); } });
const onEvent = engine.onEvent.bind(engine); engine.onEvent = (ev) => { if (ev.slot) lastSlot.set(ev.mint, ev.slot); const c = engine.coins.get(ev.mint); if (c) c.eventCount = (c.eventCount || 0) + 1; onEvent(ev); };
{ const { addClockBook } = await import("./migrate.mjs"); for (const f of ["HH-BREAK-4H"]) { const r = addClockBook(store, f, now0); if (r.added) log(`[older] ${f}: ${r.added} existing ${r.base} buys carried into the new book (${r.exact} versions unchanged, ${r.estimated} clock sales estimated from minute bars, ${r.live} still inside the clock)`); } }
engine.rebuy = process.env.OLDER_REBUY !== "0"; // buying again (older-9) — OLDER_REBUY=0 switches it off for a run
if (process.env.OLDER_BOOKS) { engine.setBooks(booksOf(process.env.OLDER_BOOKS)); log(`[books] ${process.env.OLDER_BOOKS}: ${engine.books.length} books make new buys — ${engine.books.join(", ")}`); } // older-11: unset = the legacy 29 (spec.mjs, booksOf)
// older-11: the owner's gates. OLDER_GATES=older-11 → one GMGN token-info reading per buy signal, sent ahead of the history repair
// (which then leaves GMGN_RESERVE units of the reported allowance untouched, default 2); the buy is filled only if the reading
// arrived by the time of the buy and passes. Unset → nothing is asked and nothing is gated (the behaviour of older-10).
if (process.env.OLDER_GATES) { if (process.env.OLDER_GATES !== "older-11") throw new Error(`unknown OLDER_GATES "${process.env.OLDER_GATES}"`);
  engine.gates = GATES_11; engine.readGate = (mint) => tokenInfoFirst(mint, Number(process.env.GMGN_FIRST_WAIT_MS ?? 300)); gm.reserve = Number(process.env.GMGN_RESERVE ?? 2);
  // LABEL (default) or CANCEL: OLDER_GATE_MODE=label → every signal is bought as before and labelled with the verdict (the
  // baseline stays intact and the checks are compared on the same buys); =cancel → a buy that fails or has no reading is cancelled.
  const gmode = (process.env.OLDER_GATE_MODE || "").trim() || "label"; if (gmode !== "label" && gmode !== "cancel") throw new Error(`unknown OLDER_GATE_MODE "${gmode}"`);
  engine.gateMode = gmode; if (gmode === "label") engine.readGateLate = (mint) => tokenInfoLate(mint);
  log(`[gates] older-11 gates ON (${gmode}): one GMGN reading per buy signal; history repair leaves ${gm.reserve} allowance units for them`); }
// older-11: the age from which the books that normally start at 8 hours are evaluated in this run (spec MIN_AGE_11_S). Unset = 8 hours.
if (process.env.OLDER_MIN_AGE_H) { const h = Number(process.env.OLDER_MIN_AGE_H); if (!(h >= 0 && h <= 8)) throw new Error(`OLDER_MIN_AGE_H must be a number from 0 to 8, not "${process.env.OLDER_MIN_AGE_H}"`); engine.minAgeS = h * 3600; log(`[books] the 8-hour books are evaluated from ${h} hours old in this run`); }
store.since(now0); // "counting since" is fixed at START-UP, when a book or stop first exists on this database — not at the first page view
store.restore(engine);
// WARM RESTART (warm.mjs): after a planned stop the price memory is read back, so the hour-scale books do not start empty.
// The time away stays an unobserved gap. Not used by a bounded validation run.
const { saveWarm, loadWarm } = await import("./warm.mjs"); const WARM_FILE = (process.env.OLDER_DB || "/root/older/older.db") + ".warm";
// older-11, A NEW RUN ON A NEW DATABASE: the price memory the previous run wrote at its stop can be carried in once
// (OLDER_WARM_FROM = that run's snapshot file), so the hour-scale books do not wait hours for history. Only on the very first
// start of this database (it has never been alive) and only when it has no snapshot of its own. What the other run decided
// (its one-buy marks) is NOT carried — warm.mjs, `fresh`. The same 60-second limit applies; older than that = cold start.
const carry = !existsSync(WARM_FILE) && process.env.OLDER_WARM_FROM && existsSync(process.env.OLDER_WARM_FROM) && store.lastAlive() == null;
const warm = process.env.OLDER_RUN_MINUTES || process.env.OLDER_WARM === "0" ? { loaded: false, why: "switched off" } : carry ? loadWarm(process.env.OLDER_WARM_FROM, engine, Date.now() / 1000, { fresh: true }) : loadWarm(WARM_FILE, engine);
log(warm.loaded ? `[older] warm ${carry ? "start of a new run (price memory carried from the previous run; none of its buys or one-buy marks)" : "restart"}: price memory of ${warm.coins} coins read back, ${warm.age_s} s after the stop${warm.skipped ? ` (${warm.skipped} skipped: observation method changed)` : ""}` : `[older] cold start: ${warm.why}`);
engine.restartGap(store.lastAlive(), now0, { warm: warm.loaded });
// planned stop (pm2 restart/stop sends SIGINT): every open position's peak is saved and the last-alive time is written first,
// so a planned restart loses nothing and its gap is measured from the real stop
let stopping = false; for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { if (stopping) return; stopping = true; const tStop = Date.now() / 1000; try { const n = store.tx(() => engine.flush()); store.heartbeat(tStop); log(`[older] ${sig}: ${n} open positions saved, stopping`); } catch (e) { log("[older] save on stop failed: " + e.message); }
  if (!process.env.OLDER_RUN_MINUTES && process.env.OLDER_WARM !== "0") try { const w = saveWarm(WARM_FILE, engine, tStop); log(`[older] price memory saved for the next start: ${w.coins} coins, ${(w.bytes / 1e6).toFixed(1)} MB, ${w.ms} ms`); } catch (e) { log("[older] price memory NOT saved (the next start will be cold): " + e.message); }
  process.exit(0); });
// the entry window: OLDER_ENTRIES_UNTIL (unix seconds, or an ISO date) — after it nothing new is opened; open positions, their
// exits and the 24-hour runner tracking carry on until every included position is complete
if (process.env.OLDER_ENTRIES_UNTIL && process.env.OLDER_ENTRIES_UNTIL.trim()) { const v = process.env.OLDER_ENTRIES_UNTIL; engine.entriesUntil = /^\d+$/.test(v) ? Number(v) : Date.parse(v) / 1000; log(`[older] entry window closes ${new Date(engine.entriesUntil * 1000).toISOString()}`); }
let COMMIT = process.env.OLDER_COMMIT || null; try { const { execSync } = await import("node:child_process"); COMMIT = COMMIT || execSync("git rev-parse HEAD", { cwd: new URL(".", import.meta.url).pathname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch {}
store.db.prepare("INSERT INTO feed (t, ev, detail) VALUES (?,?,?)").run(now0, "start", `commit ${COMMIT || "unknown"}`);
await startSolUsd();
const J = await import("./jupiter.mjs");
// HISTORY REPAIR CAN BE SWITCHED OFF WITHOUT A RESTART (second opinion, 4: an isolated measurement of the provider's allowance
// needs the only other consumer of it out of the way): OLDER_REPAIR=0, or a file named repair.off in $OLDER_OUT — create it to
// pause, remove it to resume. While paused nothing is asked of GMGN for history; the hour-scale books simply know less.
let repOffAt = 0, repOff = false; const repairPaused = () => { if (process.env.OLDER_REPAIR === "0") return true; const n = Date.now(); if (n - repOffAt > 5000) { repOffAt = n; const was = repOff; repOff = !!process.env.OLDER_OUT && existsSync(process.env.OLDER_OUT + "/repair.off"); if (was !== repOff) log(`[backfill] history repair ${repOff ? "PAUSED (repair.off present)" : "resumed"}`); } return repOff; };
const backfill = startBackfill({ engine, store, jup: J, log, paused: repairPaused });
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

// EVENT-LOOP DELAY and CPU (validation protocol; Codex's review of 161d545): measured inside the process by Node's own
// monitor (10 ms resolution), kept as one line per minute — mean, 99th percentile, maximum — for the last 3 hours. One
// HTTP probe a minute from outside cannot establish the maximum. Counters restart with the process: every status carries
// the process start time and its own uptime so results are worked out per process lifetime, never across a restart.
const { monitorEventLoopDelay } = await import("node:perf_hooks"); const eld = monitorEventLoopDelay({ resolution: 10 }); eld.enable();
const loopMin = []; let cpu0 = process.cpuUsage(), cpuT0 = Date.now();
setInterval(() => { const c = process.cpuUsage(cpu0), dt = Date.now() - cpuT0; loopMin.push({ t: Math.round(Date.now() / 1000), mean_ms: +(eld.mean / 1e6).toFixed(2), p99_ms: +(eld.percentile(99) / 1e6).toFixed(1), max_ms: +(eld.max / 1e6).toFixed(1), cpu_pct: dt ? +(((c.user + c.system) / 1000 / dt) * 100).toFixed(1) : null });
  if (loopMin.length > 180) loopMin.shift(); eld.reset(); cpu0 = process.cpuUsage(); cpuT0 = Date.now(); }, 60000).unref?.();
const loopStatus = () => ({ resolution_ms: 10, minutes: loopMin.length, worst_max_ms: loopMin.length ? Math.max(...loopMin.map((x) => x.max_ms)) : null, worst_p99_ms: loopMin.length ? Math.max(...loopMin.map((x) => x.p99_ms)) : null, last: loopMin.slice(-60), current_minute_max_ms: +(eld.max / 1e6).toFixed(1) });
// clock: scheduled fills/exits every 100 ms (1 s and 0.7 s delays need a fine clock); bars, memory, heartbeat each minute
setInterval(() => engine.tick(Date.now() / 1000), 100);
let gapsSeen = engine.cov.gaps.length; // SIGNAL-coverage gaps (reconnects, late spells, silences): the list hour-scale windows are checked against — see backfill.gapRequests
setInterval(() => {
  const t = Date.now() / 1000; engine.prune(t); store.heartbeat(t);
  { const gr = gapRequests(engine.cov.gaps, gapsSeen); gapsSeen = gr.seen;
    if (gr.requests.length) { const mints = [...engine.byMint.keys()].filter((m) => engine.byMint.get(m).size); for (const [m, c] of engine.coins) if (c.series.lastPx && c.series.lastPx * c.supply >= 20000 && c.series.lastPx * c.supply <= 1e6) mints.push(m); const list = [...new Set(mints)]; for (const [a, b] of gr.requests) backfill.patchGap(a, b, list); } }
}, 60000);
setInterval(() => { const n = store.retention(Date.now() / 1000); if (n) log(`[retention] ${n} old bars removed`); }, 3600e3);

// ---- Solana-wide adapter (launchpad- and exchange-neutral): sampled prices + routed quotes through Jupiter. Off unless OLDER_SOLANA_WIDE=1.
const { Poller } = await import("./polled.mjs"); const { classifyMintAccount, TOKEN_2022 } = await import("./risk.mjs"); const { rpc } = await import("./feed.mjs");
let poller = null;
if (process.env.OLDER_SOLANA_WIDE === "1" && engine.gates) log("[older] Solana-wide adapter NOT started: this run uses the owner's gates, which are applied on the live method only — a sampled coin is never bought ungated");
else if (process.env.OLDER_SOLANA_WIDE === "1") {
  poller = new Poller({ engine, jup: J, store, log, hotEvery: Number(process.env.OLDER_HOT_S || 10), coldEvery: Number(process.env.OLDER_COLD_S || 60), quoteFast: Number(process.env.OLDER_QUOTE_FAST_S || 2), quoteSlow: Number(process.env.OLDER_QUOTE_SLOW_S || 10) });
  log(`[older] sampled coins restored to the watch list: ${poller.restore()}`);
  poller.start();
  log("[older] Solana-wide adapter ON (Jupiter polling + routed quotes)");
}
// TRANSFER RESTRICTIONS are read from the chain for BOTH observation methods, whether or not the sampled adapter is on (ninth
// review, A): coins with a position first, then coins a decision is waiting on, then — every RISK_REFRESH_S — coins we hold,
// because a fee can be raised while a position is open. One getMultipleAccounts call per round (risk.riskReadOnce). Until a
// coin's token program and extensions are known it is not entered (engine._decide).
(async () => { const { riskReadOnce } = await import("./risk.mjs"); const { RISK_REFRESH_S } = await import("./spec.mjs");
  while (true) { let n = 0; try { n = await riskReadOnce(engine, store, rpc, Date.now() / 1000, RISK_REFRESH_S); } catch {} await new Promise((r) => setTimeout(r, n ? 250 : 1000)); } })();
const inv = () => { try { return JSON.parse(store.db.prepare("SELECT v FROM meta WHERE k='inventory'").get()?.v || "null"); } catch { return null; } };
// the reserve reading counts as validated only when the owner sets OLDER_RES_VALIDATED=1 after reviewing docs/tx-validation.json
const valid = () => (process.env.OLDER_RES_VALIDATED === "1" ? { by: "OLDER_RES_VALIDATED" } : null);
// older-11: a run that chose its books shows only those on the site (page.mjs, web.mjs); a run that did not shows every book, as before
const runInfo = () => (engine.books ? { name: process.env.OLDER_RUN_NAME || null, books: engine.books, gates: !!engine.gates, gate_mode: engine.gates ? engine.gateMode : null, rebuy: engine.rebuy, min_age_h: engine.minAgeS / 3600, sampled: !!poller } : null);
const web = startWeb({ port: Number(process.env.OLDER_PORT || 8793), store, engine, run: runInfo, sell: (id, frac) => engine.manualSell(id, frac), status: () => ({ started: now0, first_start: firstStart, commit: COMMIT, run: process.env.OLDER_RUN_NAME || null, entries_until: engine.entriesUntil, idl: IDL_PIN,
  process: { pid: process.pid, started_at: now0, uptime_s: Math.round(process.uptime()), cpu_user_s: +(process.cpuUsage().user / 1e6).toFixed(1), cpu_system_s: +(process.cpuUsage().system / 1e6).toFixed(1) }, event_loop: loopStatus(),
  feed: { ...fs, lag_ms_avg: fs.lagN ? Math.round(fs.lagMsSum / fs.lagN) : null }, stream: engine.streamStatus(Date.now() / 1000), risk_reader: { ...riskStatus(engine, Date.now() / 1000, RISK_REFRESH_S), fee_unknown_evaluations: engine.stats.feeUnknown || 0, fee_unknown_coins: engine.stats.feeUnknownCoins || 0, cancelled_at_fill: engine.stats.cancelledAtFill || 0 }, engine: { ...engine.stats, coins: engine.coins.size, open: [...engine.byMint.values()].reduce((s, x) => s + x.size, 0), feed_gaps: engine.feedCov.gaps.length, usd_down: engine.usdDown },
  books: engine.books ?? "legacy", gates: engine.gates ? "older-11" : "off", gate_mode: engine.gates ? engine.gateMode : null, repair_paused: repairPaused(), rebuy: engine.rebuy, min_age_h: engine.minAgeS / 3600, decoder: { ...dec }, tx_validation: valid(), verify: { ...vf }, snapshots: { ...snapStats }, sol: { ...sp }, gmgn: { calls: gm.calls, errors: gm.errors, limited: gm.limited, banned: gm.banned, first: { ...gm.first }, held_back: gm.held_back, reserve: gm.reserve, lastErr: gm.lastErr, rate_headers: gm.headers }, backfill: { ...bf }, backfillQ: backfill.size(), jupiter: { ...J.ju, key: !!process.env.JUP_API_KEY, rps: Number(process.env.JUP_RPS || (process.env.JUP_API_KEY ? 1 : 0.5)) }, poller: poller ? { ...poller.stats, cadence_avg_s: poller.stats.cadence.n ? +(poller.stats.cadence.sum / poller.stats.cadence.n).toFixed(1) : null, hot_s: poller.hotEvery, cold_s: poller.coldEvery } : null, inventory: inv(), mem_mb: Math.round(process.memoryUsage().rss / 2 ** 20), sizes: sizes() }) });
log(`[older] started, spec ${SPEC_VER}, paper only`);

// ---- monitoring copy: every 5 minutes the dashboard's own data is written to $OLDER_OUT/pub/state.json (no keys in it);
// scripts/publish.sh pushes that folder to the GitHub branch "older-data" so the run can be watched and reviewed remotely
if (process.env.OLDER_OUT && !process.env.OLDER_RUN_MINUTES) {
  const { writeFileSync, mkdirSync } = await import("node:fs"); const dir = process.env.OLDER_OUT + "/pub"; mkdirSync(dir, { recursive: true });
  // entries.json: EVERY entry of this database in compact form (state.json only carries the latest 40), so results can be worked
  // out per coin and per entry over the whole run. Returns are fractions of cost; null = not closed. Keys: t20…t40 = pure trail,
  // h20…h40 = sell half at 2× then trail, and the same with an x suffix for the stall-exit versions (CONT-STALL) and a k suffix for the 4-hour clock versions (HH-BREAK-4H).
  const compact = () => store.allEntries().map((e) => { const r = {}; for (const v of e.versions || []) r[(v.policy === "trail" ? "t" : "h") + Math.round(v.stop * 100) + (v.stall === true ? "x" : v.stall ? "k" : "")] = v.exit?.ret == null ? null : +v.exit.ret.toFixed(4); /* the result lives on the exit record (v.exit.ret) — reading v.ret published every result as empty (fixed 21 Nov 13:30 UK) */
    const w5 = e.features?.w5, s5 = e.snap?.stats5m, mv = {}; for (const c of e.cands || []) if (c.detail?.move_s != null) mv[c.family] = c.detail.move_s; return { id: e.id, mint: e.mint, sym: engine.coins.get(e.mint)?.info?.symbol ?? null, fee: e.token?.xfer_bps || 0, warm: e.warm_gap_s || 0, again: e.again ? Object.keys(e.again) : [], t: Math.round(e.decisionT), ag: e.ag, fam: e.families, mode: e.mode, pop: e.pop ?? null, status: e.status, mc: Math.round(e.signalMc || 0), delay: e.fill?.delay_s ?? null, max: e.runner?.maxX != null ? +e.runner.maxX.toFixed(3) : null, ret: r, chk: e.verify?.diff_quote != null ? +(e.verify.diff_quote * 100).toFixed(2) : null, flags: (e.flags || []).length,
      holders: e.snap?.holders ?? null, hc5: s5?.holderChange ?? null, traders5: s5?.numTraders ?? null, b1: e.features?.w1?.buyers ?? null, b5: w5?.buyers ?? null, v5: w5?.vol_usd ?? null, top5: w5?.top_buyer_share ?? null, surge: e.features?.vol_surge5 ?? null, move_s: mv,
      // older-11: the provider reading the owner's gates were judged on (fractions 0–1; fees in SOL), its verdict and how long it took
      ...(e.gate ? { gate: { v: e.gate.verdict ?? null, ms: e.gate.ms ?? null, late: e.gate.late || undefined, timely: e.gate.timely || undefined, by: e.gate.by ? Object.fromEntries(Object.entries(e.gate.by).map(([f, x]) => [f, x.pass ? 1 : 0])) : undefined, retried: e.gate.retried || undefined, rule: e.gate.rule ?? undefined, err: e.gate.error ?? undefined, fails: e.gate.fails ?? undefined, dropped: e.gate.dropped ? Object.keys(e.gate.dropped) : undefined, opt: e.gate.options ?? undefined,
        ...(e.gate.reading ? { top10: e.gate.reading.top10, bund: e.gate.reading.bundlers, ins: e.gate.reading.insiders, snip: e.gate.reading.snipers, fees: e.gate.reading.fees_sol, tw: e.gate.reading.twitter == null ? null : !!e.gate.reading.twitter, ath: e.gate.reading.ath_usd == null ? null : Math.round(e.gate.reading.ath_usd), holders: e.gate.reading.holders } : {}) } } : {}) }; });
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
