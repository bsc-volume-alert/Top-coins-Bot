import "./env.js";
import { readFileSync } from "node:fs";
import { CFG } from "./config.js";
import { q } from "./db.js";
import { tg } from "./telegram.js";
import { subscribeLogs } from "./ws.js";
import { handleTx, counters, live, startPriceLoop, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { sigStats } from "./signals.js";
import { startCommands, reportText } from "./commands.js";
import { startPumpSwap, ps } from "./pumpswap.js";
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

await tg(`🟢 <b>Tracker online</b> v${v}\nFirehose: ${CFG.HELIUS_KEY ? "Helius" : "public RPC"} · prepared gate ≥${CFG.BUNDLE_PCT_MIN}% &amp; ≥${CFG.BUNDLE_SOL_MIN} SOL\nPaper entry: ≥${CFG.INFLOW_SOL} SOL / ≥${CFG.INFLOW_WALLETS} wallets in ${CFG.INFLOW_WINDOW_S}s, first ${CFG.ENTRY_WINDOW_MIN} min`);

startCommands({ status: () => { const g = sigStats(), mo = momStats(); return `v${v} · ws ${wsStatus} · live ${live.size} · early open ${g.open} · volume alerts ${mo.alerts} open ${mo.open} · ps txs ${ps.txs} · hand-offs ${g.handoffs} · rpc ${g.rpc} · SOL $${solUsdCached().toFixed(0)}`; }, summary: () => strategySummary(24) });
// strategy summary every SUMMARY_HOURS
setInterval(() => tg(strategySummary(CFG.SUMMARY_HOURS)), CFG.SUMMARY_HOURS * 3600_000);
let lastC = { ...counters };
setInterval(() => {
  const d = Object.fromEntries(Object.keys(counters).map((k) => [k, counters[k] - lastC[k]]));
  lastC = { ...counters };
  const g = sigStats();
  console.log(`[1m] txs=${d.txs} creates=${d.creates} trades=${d.trades} tier1=${d.tier1} live=${live.size} open=${g.open} handoffs=${g.handoffs} rpc=${g.rpc} sol=$${solUsdCached().toFixed(2)} ws=${wsStatus}`);
  if (CFG.PUMPSWAP_ENABLED) console.log(`[ps 1m] txs=${ps.txs} data=${ps.data} buys=${ps.buys} sells=${ps.sells} pools=${ps.pools} resolved=${ps.resolved} unknown=${ps.unknownPool} fail=${ps.lookupFail} poolcredits=${ps.poolBudget} ws↻=${ps.reconnects}`);
}, 60_000);

const hb = async () => {
  const since = Math.floor(Date.now() / 1000) - CFG.HEARTBEAT_MIN * 60;
  const n = q.countSince.get(since), n1 = q.countTierSince.get(1, since);
  const g = sigStats(), c = q.closedSince.get(since);
  const mo = momStats();
  await tg(`💓 <b>${CFG.HEARTBEAT_MIN}m</b> · launches ${n} · prepared ${n1} · hand-offs ${g.handoffs} · early open ${g.open} · volume alerts ${mo.alerts} / open ${mo.open} · copy open ${cpStats().open} · wallets scored ${wbStats().recorded} · life samples ${lcStats().samples} · rpc ${g.rpc} · ws↻ ${sub.stats().reconnects} · SOL $${solUsdCached().toFixed(0)}`);
};
setInterval(hb, CFG.HEARTBEAT_MIN * 60_000);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));

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
