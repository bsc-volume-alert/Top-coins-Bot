import "./env.js";
import { rpcStat } from "./rpc.js"; // v0.18.59 (after env.js so .env is loaded first)
import { readFileSync } from "node:fs";
import { CFG } from "./config.js";
import { q } from "./db.js";
import { tg, tgAlarm } from "./telegram.js";
import { execStats } from "./execlink.js"; // v0.18.91 watchdog: feed / executor status
import { subscribeLogs } from "./ws.js";
import { handleTx, counters, live, startPriceLoop, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { sigStats } from "./signals.js";
import { startSweeper, sw } from "./sweeper.js";
import { startCommands, reportText, memMb } from "./commands.js";
import { en } from "./enrich.js";
import { startWeb } from "./web.js"; // v0.18.23
import { retroScoreP5 } from "./p5retro.js"; // v0.18.81
import { recordBoot, flagTrades, loopAlarm, restarts24 } from "./restarts.js"; // v0.18.84 restart quarantine · v0.18.85 loop alarm
recordBoot();
if (process.env.SMOKE) { setTimeout(() => { console.log("[smoke] alive after", process.env.SMOKE_MS || 45000, "ms — ok"); process.exit(0); }, Number(process.env.SMOKE_MS || 45000)); } // v0.18.85 pre-deploy check: boot, run the timers, exit 0 if still alive
else setTimeout(() => { try { loopAlarm(); } catch {} }, 15000);
import "./backup.js";
import { pxg, ppx } from "./pumpswap.js"; // v0.18.43
import "./pxcheck.js"; // v0.18.43 peak cross-check
import { gmgnStatus } from "./gmgn.js";
import { volLogStatus } from "./vollog.js"; // v0.18.62 // v0.18.52 GMGN scanner // v0.18.40 daily database backup
import { startPumpSwap, ps, quoteStats } from "./pumpswap.js";
import { startDex, dx } from "./dex.js";
import { fe } from "./fees.js";
import { ho } from "./holders.js";
import "./momtiers.js";
import "./momre.js";
import { momStats, strategySummary } from "./momentum.js";
import { wbStats, leaderboardText, creatorsText } from "./wallets.js";
import { cpStats } from "./copytrade.js";
import { lcStats } from "./lifecycle.js";
import { runnersText } from "./runners.js";

const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
console.log(`bundler-tracker v${v} starting (node ${process.version}) helius=${CFG.HELIUS_KEY ? "yes" : "no"}`);
startPriceLoop();
let wsStatus = "init";
const sub = subscribeLogs(handleTx, (s) => { wsStatus = s; console.log("[ws]", s); });
if (CFG.PUMPSWAP_ENABLED) startPumpSwap((s) => console.log("[pumpswap]", s));
if (CFG.DEX_ENABLED) setTimeout(() => startDex((s) => console.log("[dex]", s)), 5000); // v0.18.1: stagger the third socket so Helius doesn't 429 it

await tg(`🟢 <b>Tracker online</b> v${v}\nFirehose: ${CFG.HELIUS_KEY ? "Helius" : "public RPC"} · prepared gate ≥${CFG.BUNDLE_PCT_MIN}% &amp; ≥${CFG.BUNDLE_SOL_MIN} SOL\nPaper entry: ≥${CFG.INFLOW_SOL} SOL / ≥${CFG.INFLOW_WALLETS} wallets in ${CFG.INFLOW_WINDOW_S}s, first ${CFG.ENTRY_WINDOW_MIN} min`);

startSweeper();
startWeb();
setTimeout(() => { try { retroScoreP5(); } catch (e) { console.error("[p5 retro]", e.message); } }, 3000); // v0.18.81: one-off scoring of earlier P5 trades
startCommands({ status: () => { const g = sigStats(), mo = momStats(); return `${gmgnStatus()}\n${volLogStatus()}\nprices: ${ppx.swapped} from other pools re-priced to the main pool · PumpSwap pools from db ${ps.fromDb} / via DexScreener ${ps.dsResolved} · RPC errors ${rpcStat.errors}${rpcStat.lastErr ? ` (last: ${rpcStat.lastErr})` : ""} · bad held ${pxg.held} / confirmed ${pxg.confirmed} of ${pxg.checked}\n` + `v${v} · ws ${wsStatus} · live ${live.size} · early open ${g.open} · volume alerts ${mo.alerts} open ${mo.open} · ps txs ${ps.txs} · dex txs ${dx.txs}/${dx.emitted} fed · fee claims ${fe.claims} · holder ledgers ${ho.ledgers} rpc ${ho.rpc} · hand-offs ${g.handoffs} · swept ${sw.closed}/${sw.noprice}np · rpc ${g.rpc} · dexpaid ${en.dexPaid}/${en.dexCalls} fresh ${en.freshCalls} · mem ${memMb()} MB · SOL $${solUsdCached().toFixed(0)}`; }, summary: () => strategySummary(24) });
// strategy summary every SUMMARY_HOURS
setInterval(() => tg(strategySummary(CFG.SUMMARY_HOURS)), CFG.SUMMARY_HOURS * 3600_000);
let lastC = { ...counters };
setInterval(() => {
  const d = Object.fromEntries(Object.keys(counters).map((k) => [k, counters[k] - lastC[k]]));
  lastC = { ...counters };
  const g = sigStats();
  console.log(`[1m] txs=${d.txs} creates=${d.creates} trades=${d.trades} tier1=${d.tier1} live=${live.size} open=${g.open} handoffs=${g.handoffs} rpc=${g.rpc} sol=$${solUsdCached().toFixed(2)} ws=${wsStatus}`);
  if (CFG.DEX_ENABLED) console.log(`[dex 1m] txs=${dx.txs} dupes=${dx.dupes} events=${dx.events} fed=${dx.emitted} pools=${dx.resolved} unknown=${dx.unknownPool} ignored=${dx.ignored} big=${dx.big} fail=${dx.lookupFail} credits=${dx.poolBudget} ws↻=${dx.reconnects} ${JSON.stringify(dx.byVenue)}`);
  if (CFG.PUMPSWAP_ENABLED) console.log(`[ps 1m] txs=${ps.txs} data=${ps.data} buys=${ps.buys} sells=${ps.sells} pools=${ps.pools} resolved=${ps.resolved} unknown=${ps.unknownPool} fail=${ps.lookupFail} fromDb=${ps.fromDb} viaDexScreener=${ps.dsResolved} rpcErr=${ps.rpcErr}${ps.lastErr ? ` (${ps.lastErr})` : ""} poolcredits=${ps.poolBudget} oversize=${ps.oversize} quotes=${quoteStats.lookups}/${quoteStats.fails}f/${quoteStats.skipped}skip ws↻=${ps.reconnects}`);
}, 60_000);

const hb = async () => {
  const since = Math.floor(Date.now() / 1000) - CFG.HEARTBEAT_MIN * 60;
  const n = q.countSince.get(since), n1 = q.countTierSince.get(1, since);
  const g = sigStats(), c = q.closedSince.get(since);
  const mo = momStats();
  const upS = Math.floor(process.uptime()), upTxt = upS >= 3600 ? `${Math.floor(upS / 3600)}h${Math.floor((upS % 3600) / 60)}m` : `${Math.floor(upS / 60)}m`;
  await tg(`💓 <b>${CFG.HEARTBEAT_MIN}m</b> · up ${upTxt} · ${restarts24()} restarts/24h · launches ${n} · prepared ${n1} · hand-offs ${g.handoffs} · early open ${g.open} · volume alerts ${mo.alerts} / open ${mo.open} · copy open ${cpStats().open} · wallets scored ${wbStats().recorded} · life samples ${lcStats().samples} · rpc ${g.rpc} · ws↻ ${sub.stats().reconnects} · SOL $${solUsdCached().toFixed(0)}`);
};
setInterval(hb, CFG.HEARTBEAT_MIN * 60_000);
// v0.18.91 watchdog (quiet mode means nobody reads the heartbeat): alarms — at most once per 30 min each — when the website stops answering,
// when the price feed has delivered nothing for 3 minutes, or when the executor has been unreachable for 5 minutes while the tracker runs.
{ const last = {}, fails = { web: 0 }; const once = (k, text) => { const n = Date.now(); if (n - (last[k] || 0) < 1800_000) return; last[k] = n; tgAlarm(text).catch(() => {}); };
  setInterval(async () => {
    if (process.env.SMOKE) return;
    try { const key = process.env.WEB_KEY; if (key) { const r = await fetch(`http://127.0.0.1:${process.env.WEB_PORT || 8787}/api/snapshot?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15000) }); fails.web = r.ok ? 0 : fails.web + 1; } } catch { fails.web++; }
    if (fails.web >= 2) once("web", `🚨 <b>Website not answering</b> — ${fails.web} checks in a row failed on port ${process.env.WEB_PORT || 8787}. The bot itself is running; <code>pm2 restart tracker</code> usually fixes it.`);
    const feedAge = execStats.lastFeed ? Date.now() - execStats.lastFeed : null; if (feedAge != null && feedAge > 180_000 && process.uptime() > 300) once("feed", `🚨 <b>Price feed silent</b> for ${Math.round(feedAge / 60000)} min — no trades arriving from Helius. Live positions (if any) are being closed by the executor; check <code>pm2 logs tracker</code>.`);
    if (!execStats.connected && process.uptime() > 300) { fails.exec = (fails.exec || 0) + 1; if (fails.exec >= 3) once("exec", `⚠️ <b>Executor unreachable</b> for 5+ min — the tracker is running but the buy/sell bot is not connected. <code>pm2 ls</code> / <code>pm2 logs executor</code>.`); } else fails.exec = 0;
  }, 120_000); }
setTimeout(() => { try { const n = flagTrades(0); if (n) console.log(`[restarts] flagged ${n} trades`); } catch (e) { console.error("[restarts]", e.message); } }, 8000); // v0.18.84
setInterval(() => { try { flagTrades(Math.floor(Date.now() / 1000) - 7200); } catch {} }, 5 * 60_000);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
// v0.18.83: a throw inside a timer must not take the whole bot down (v0.18.81 crash-looped every 30 s on one). Logged loudly; state lives in SQLite anyway.
process.on("uncaughtException", (e) => { console.error("[uncaught]", e); try { tgAlarm(`⚠️ uncaught error (bot kept running): <code>${String(e?.message || e).slice(0, 200)}</code>`); } catch {} });

// --- daily digest at DIGEST_HOUR_LOCAL (Europe/London) ---
import { fmt as _fmt, esc as _esc } from "./launch-monitor.js";
let lastDigestDay = null;
async function digest() {
  const now = new Date();
  const lon = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  if (lon.getHours() !== CFG.DIGEST_HOUR_LOCAL || lastDigestDay === lon.toDateString()) return;
  lastDigestDay = lon.toDateString();
  const to = Math.floor(Date.now() / 1000), from = to - 86400;
  const a = q.digestAgg.get(from, to), rows = q.digestTop.all(from, to);
  if (!a.n) return tg("📊 <b>Daily digest</b> — no paper trades in the last 24h");
  const pc = (x, n) => (n ? `${((x / n) * 100).toFixed(0)}%` : "—");
  const m = (v) => (v == null ? "—" : `${((v - 1) * 100).toFixed(0)}%`);
  let txt = `📊 <b>Daily digest</b> — last 24h\n` +
    `Paper trades ${a.n} · reached 2x: ${a.hit2x} (${pc(a.hit2x, a.n)})\n` +
    `No socials: ${a.nosoc} trades, ${a.nosoc2x} hit 2x (${pc(a.nosoc2x, a.nosoc)}) · factory: ${a.fac} trades, ${a.fac2x} hit 2x (${pc(a.fac2x, a.fac)})\n` +
    `Avg by exit: TSL40 ${m(a.x40)} · TSL60 ${m(a.x60)} · hold ${m(a.xt)}\n\n<b>Top 10 by peak</b>\n`;
  for (const r of rows) {
    const soc = r.has_socials === 1 ? "🐦" : r.has_socials === 0 ? "❌" : "?";
    txt += `${(r.peak_mult || 1).toFixed(1)}x <b>${_esc((r.name || "").slice(0, 16))}</b> $${_fmt(r.entry_mc || 0)} @${r.entry_age_s}s · ${soc} t${r.tier}${r.factory ? "F" : ""} · ${(r.inflow_sol || 0).toFixed(0)} SOL/${r.inflow_wallets}w · b/s ${r.buys ?? "?"}/${r.sells ?? "?"} · buyers ${r.outside_buyers ?? "?"} · ho ${r.handoffs}\n`;
  }
  await tg(txt);
  await tg(leaderboardText(7, 5));
  await tg(creatorsText(7, 5));
  await tg(runnersText(24, 8));
}
setInterval(digest, 60_000);
