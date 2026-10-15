// BSC tracker (pm2 app "tracker-bsc") — Flap launchpad, full Solana-style setup:
// gap-free feed → decode Flap launches/trades/graduations (+ PancakeSwap pools after graduation) → per-token state →
// strategies (second wave, momentum/burst, graduation runner, graduation recovery, revival, slow build, copy, copy creator;
// silent: early sampler, graduation control) → paper trades with 13 exits → Telegram + SQLite → /csv for analysis.
import { C } from "./config.js";
import { startPrice, bnbUsd, noPrice, untrusted } from "./price.js";
import { db } from "./db.js";
import { startFeed, feedReport, ago } from "./feed.js";
import { decodeFlap, flapStats } from "./flap.js";
import { decodePoolLog, poolAddrs, poolStats, P } from "./pools.js";
import { onFlap, onPoolTrade, ts, getState, peekState, setBlockTime } from "./tokens.js";
import { restore, startSweeper, ps, openCount } from "./paper.js";
import { startCommands, summaryText, reportText } from "./commands.js";
import { leaderboardText, creatorsText, runnersText, provenSize } from "./wallets.js";
import { tg, TOKEN } from "./telegram.js";

const v = C.VERSION;
console.log(`bsc-tracker ${v} starting`);
if (TOKEN) { try { await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`, { signal: AbortSignal.timeout(8000) }); } catch {} }
await startPrice();
// 1.0.1 cleanup: entries recorded with a mispriced quote token (e.g. MC in the trillions) are invalid
const fixed = db.prepare(`UPDATE paper_trades SET invalid=1, note=COALESCE(note,'')||' invalid:mispriced-quote' WHERE invalid=0 AND (entry_mc>1e8 OR entry_mc<=0)`).run().changes;
if (fixed) console.log(`[cleanup] ${fixed} mispriced paper trades marked invalid`);
const restored = restore(getState);
const OTHER = Object.keys(C.OTHER_LAUNCHPADS), other = {};
const addrs = () => [C.FLAP_PORTAL, ...OTHER, ...poolAddrs()];
const dispatch = (l) => {
  const a = l.address.toLowerCase();
  if (a === C.FLAP_PORTAL) { const ev = decodeFlap(l); if (ev) onFlap(ev).catch((e) => console.error("[flap]", e.message)); return; }
  if (C.OTHER_LAUNCHPADS[a]) { other[C.OTHER_LAUNCHPADS[a]] = (other[C.OTHER_LAUNCHPADS[a]] || 0) + 1; return; } // counted only (added in a later push)
  const t = decodePoolLog(l); if (t) onPoolTrade(t);
};
const bt = await startFeed(addrs, dispatch); setBlockTime(bt);
startSweeper((tok) => peekState(tok));

const status = () => {
  const unk = Object.entries(flapStats.unknown).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return `🟡 <b>BSC ${v}</b> · Flap · up ${ago(process.uptime() * 1000)} · BNB $${bnbUsd().toFixed(0)}\n` +
    `<b>Flap</b>: launches ${ts.launches} · trades ${ts.trades} · graduations ${ts.gradEvents} · tokens tracked ${ts.tracked}` + (ts.noUsd ? ` · no-price trades ${ts.noUsd}` : "") + (flapStats.bad ? ` · undecodable ${flapStats.bad}` : "") + `\n` +
    `Events: ${Object.entries(flapStats.byName).filter(([k]) => k !== "CirculatingSupplyChanged").map(([k, n]) => `${k.replace(/^Token|^FlapToken/, "")} ${n}`).join(" · ") || "none yet"}` +
    (unk.length ? `\nSide events (one per trade, not needed): ${unk.map(([k, n]) => `${k.slice(0, 10)}… ${n}`).join(" · ")}` : "") +
    (noPrice.size ? `\nNo-price trades by quote token: ${[...noPrice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k.slice(0, 8)}${untrusted.has(k) ? "⚠️" : ""} ${n}`).join(" · ")}${untrusted.size ? ` · ⚠️ = mispriced, ignored` : ""}` : "") + `\n` +
    `<b>Pools</b> after graduation: V2 ${poolStats.v2 || 0} · V3 ${poolStats.v3 || 0} · Infinity/other ${(poolStats.cl || 0) + (poolStats.unknown || 0)} (not followed yet) · swaps ${poolStats.swaps}\n` +
    `<b>Paper</b>: open ${openCount()} · opened ${ps.opened} (${Object.entries(ps.byKind).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}) · closed ${ps.closed} · swept ${ps.swept} · alerts ${ps.alerts} · proven wallets ${provenSize()}\n` +
    `Other launchpads (counted, not traded yet): ${Object.entries(other).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}\n` + feedReport();
};
startCommands({ status });
await tg(`🟡 <b>BSC tracker ${v} online</b> — Flap, full setup\nStrategies: second wave · momentum/burst ($100K/5m or $30K/1m, MC &lt; $2M, buys &gt; sells) · graduation runner · graduation recovery · revival · slow build · copy · copy creator · silent: early sampler, graduation control\nEvery entry paper-traded with the 13 exits; record everything, gate nothing. Restored ${restored} open trades.\n/help for commands.`);

setInterval(() => tg(summaryText(C.SUMMARY_HOURS)), C.SUMMARY_HOURS * 3600_000);
setInterval(() => tg(`💓 ${status().split("\n").slice(0, 2).join(" · ")}`), C.HEARTBEAT_MIN * 60_000);
let lastDigest = null;
setInterval(async () => { // daily digest at 9am London
  const lon = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  if (lon.getHours() !== C.DIGEST_HOUR_LOCAL || lastDigest === lon.toDateString()) return; lastDigest = lon.toDateString();
  await tg("📊 <b>Daily digest</b>\n" + reportText(24)); await tg(summaryText(24)); await tg(leaderboardText(7, 5)); await tg(creatorsText(7, 5)); await tg(runnersText(24, 8));
}, 60_000);
setInterval(() => console.log(`[1m] trades=${ts.trades} launches=${ts.launches} grads=${ts.gradEvents} tracked=${ts.tracked} open=${openCount()} pools=${P.size} bnb=${bnbUsd().toFixed(1)}`), 60_000);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
