import "./env.js";
import { readFileSync } from "node:fs";
import { CFG } from "./config.js";
import { q } from "./db.js";
import { tg } from "./telegram.js";
import { subscribeLogs } from "./ws.js";
import { handleTx, counters, live, startPriceLoop, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { sigStats } from "./signals.js";

const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
console.log(`bundler-tracker v${v} starting (node ${process.version}) helius=${CFG.HELIUS_KEY ? "yes" : "no"}`);
startPriceLoop();
let wsStatus = "init";
const sub = subscribeLogs(handleTx, (s) => { wsStatus = s; console.log("[ws]", s); });

await tg(`🟢 <b>Tracker online</b> v${v}\nFirehose: ${CFG.HELIUS_KEY ? "Helius" : "public RPC"} · prepared gate ≥${CFG.BUNDLE_PCT_MIN}% &amp; ≥${CFG.BUNDLE_SOL_MIN} SOL\nPaper entry: ≥${CFG.INFLOW_SOL} SOL / ≥${CFG.INFLOW_WALLETS} wallets in ${CFG.INFLOW_WINDOW_S}s, first ${CFG.ENTRY_WINDOW_MIN} min`);

let lastC = { ...counters };
setInterval(() => {
  const d = Object.fromEntries(Object.keys(counters).map((k) => [k, counters[k] - lastC[k]]));
  lastC = { ...counters };
  const g = sigStats();
  console.log(`[1m] txs=${d.txs} creates=${d.creates} trades=${d.trades} tier1=${d.tier1} live=${live.size} open=${g.open} handoffs=${g.handoffs} rpc=${g.rpc} sol=$${solUsdCached().toFixed(2)} ws=${wsStatus}`);
}, 60_000);

const hb = async () => {
  const since = Math.floor(Date.now() / 1000) - CFG.HEARTBEAT_MIN * 60;
  const n = q.countSince.get(since), n1 = q.countTierSince.get(1, since);
  const g = sigStats(), c = q.closedSince.get(since);
  await tg(`💓 <b>${CFG.HEARTBEAT_MIN}m</b> · launches ${n} · prepared ${n1} · hand-offs ${g.handoffs} · paper open ${g.open} · closed ${c.c}${c.c ? ` (avg ${c.p.toFixed(0)}%)` : ""} · rpc ${g.rpc} · ws↻ ${sub.stats().reconnects} · SOL $${solUsdCached().toFixed(0)}`);
};
setInterval(hb, CFG.HEARTBEAT_MIN * 60_000);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
