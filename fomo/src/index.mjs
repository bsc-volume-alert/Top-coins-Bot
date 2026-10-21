// fomo watcher — entry point. Own pm2 app `fomo` beside the tracker; page at /fomo on the tracker website.
import "./env.mjs";
import { readFileSync } from "node:fs";
import { statfsSync } from "node:fs";
import { CFG } from "./config.mjs";
import { startSolLoop, startPriceLoop } from "./price.mjs";
import { startFlow, fo } from "./flow.mjs";
import { startWallets, wa } from "./wallets.mjs";
import { openCount, sc } from "./score.mjs";
import { startTheses } from "./theses.mjs";
import { startWeb } from "./web.mjs";
import { alarm } from "./telegram.mjs";
import { rpcStat, budgetLeft } from "./rpc.mjs";
const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
console.log(`fomo watcher v${v} starting (node ${process.version}) signer=${CFG.SIGNER.slice(0, 8)}… ws=${CFG.WS_MODE} helius=${CFG.HELIUS_KEY ? "yes" : "no"} smoke=${CFG.SMOKE ? "yes" : "no"}`);
if (CFG.SMOKE) setTimeout(() => { console.log("[smoke] alive after", process.env.FOMO_SMOKE_MS || 20000, "ms — ok"); process.exit(0); }, Number(process.env.FOMO_SMOKE_MS || 20000));
startSolLoop(); startPriceLoop(); startWeb(); startFlow(); startWallets(); startTheses();
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
process.on("uncaughtException", (e) => { console.error("[uncaught]", e); alarm("uncaught", `uncaught error (kept running): <code>${String(e?.message || e).slice(0, 200)}</code>`); });
// one log line a minute; alarms every 2 min (each at most once per 30 min)
let lastRows = 0;
setInterval(() => { const d = fo.rows - lastRows; lastRows = fo.rows; console.log(`[1m] firehose ${fo.mode} notifs pub=${fo.notifsPublic} hel=${fo.notifsHelius} txs=${fo.txs} rows=${fo.rows} (+${d}) unknownPools=${fo.unknownPool} pending=${fo.buffered - 0} walletTx=${fo.walletFromTx} budgetLeft=${budgetLeft()} · wallets watched txs=${wa.txs} buys=${wa.buys} open=${openCount()} ticks=${sc.ticks} · rss ${Math.round(process.memoryUsage().rss / 1048576)} MB`); }, 60_000).unref();
setInterval(() => {
  if (CFG.SMOKE || process.uptime() < 600) return;
  if (fo.lastTx && Date.now() / 1000 - fo.lastTx > 600) alarm("silent", `firehose silent for ${Math.round((Date.now() / 1000 - fo.lastTx) / 60)} min — no fomo trades decoded (socket: ${fo.lastLog.slice(0, 80)}). If fomo rotated its signer, set FOMO_SIGNER in .env.`);
  if (budgetLeft() <= 0) alarm("budget", `getTransaction budget for today used up (${CFG.DECODE_BUDGET}); buyer wallets stop decoding until midnight UTC.`, 6 * 3600_000);
  try { const s = statfsSync("/root"); const usedPct = 100 * (1 - s.bavail / s.blocks); if (usedPct > 80) alarm("disk", `disk ${usedPct.toFixed(0)}% full on the tracker box`, 3600_000); } catch {}
}, 120_000).unref();
