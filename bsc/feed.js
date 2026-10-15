// Gap-free log feed (from stage 0.2): live WebSocket on nodes that allow it, HTTP poller every 2 s whenever it drops
// or goes quiet, trailing 10-s sweep while it is up, completeness check every 5 min (live % / final %), health alarms.
// Watches the Flap Portal, the other launchpads (counted only for now) and the PancakeSwap pools of graduated tokens.
import WebSocket from "ws";
import { C } from "./config.js";
import { NODES, rpc, call, usable, winStats, getLogsChunked, hex, backupUse } from "./rpc.js";
import { tg } from "./telegram.js";
import { q } from "./db.js";

const T = (k, d) => (process.env[k] ? Number(process.env[k]) : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const ago = (ms) => (ms < 90_000 ? `${Math.round(ms / 1000)}s` : ms < 5400_000 ? `${Math.round(ms / 60000)}m` : `${(ms / 3600_000).toFixed(1)}h`);
const ALERT_EVERY_S = 1800;
export const alarms = new Map();
export async function alarm(key, text) { const a = alarms.get(key), now = Date.now() / 1000; if (a && now - a.last < ALERT_EVERY_S) return; alarms.set(key, { since: a?.since ?? now, last: now }); console.log("[ALARM]", key, text.replace(/<[^>]+>/g, "")); await tg(`⚠️ <b>BSC FEED ALARM</b> — ${text}`); }
export async function clear(key, text) { const a = alarms.get(key); if (!a) return; alarms.delete(key); console.log("[clear]", key); await tg(`✅ <b>BSC feed recovered</b> — ${text} (alarm open ${Math.round((Date.now() / 1000 - a.since) / 60)} min)`); }

let getAddrs = () => [C.FLAP_PORTAL], dispatch = () => {};
const seen = new Map(); // "tx:logIndex" -> {b, path}
export const lp = { connected: false, node: "", since: 0, lastWsAt: 0, wsBlock: 0, httpBlock: 0, sweepBlock: 0, startBlock: 0, drops: [], byPath: { ws: 0, poll: 0, backfill: 0, sweep: 0, audit: 0 }, hour: [], polling: false, addrKey: "" };
const key = (l) => `${l.transactionHash}:${parseInt(l.logIndex, 16)}`;
const venueOf = (a) => (a === C.FLAP_PORTAL ? "flap" : C.OTHER_LAUNCHPADS[a] || "pancake");
function onLog(l, path) {
  if (l.removed) return; const k = key(l); if (seen.has(k)) return;
  const b = parseInt(l.blockNumber, 16); seen.set(k, { b, path }); lp.byPath[path]++;
  lp.hour.push({ ts: Date.now() / 1000, venue: venueOf(l.address.toLowerCase()) });
  if (path === "ws") { lp.lastWsAt = Date.now(); if (b > lp.wsBlock) lp.wsBlock = b; }
  try { dispatch(l, path); } catch (e) { console.error("[dispatch]", e.message); }
}
// process HTTP batches in chain order
const sortLogs = (logs) => logs.sort((a, b) => parseInt(a.blockNumber, 16) - parseInt(b.blockNumber, 16) || parseInt(a.logIndex, 16) - parseInt(b.logIndex, 16));
setInterval(() => { const now = Date.now() / 1000; while (lp.hour.length && now - lp.hour[0].ts > 3600) lp.hour.shift();
  const cut = Math.max(lp.wsBlock, lp.httpBlock) - 30000; for (const [k, s] of seen) { if (s.b < cut) seen.delete(k); else break; }
  lp.drops = lp.drops.filter((d) => Date.now() - d.ts < 3600_000); }, 60_000);

let ws = null;
function startLive() {
  const wsNodes = () => NODES.filter((n) => n.ws && usable(n, "ws")); let i = 0, backoff = 1000, ping, openedAt = 0;
  const connect = () => {
    const list = wsNodes(); if (!list.length) { setTimeout(connect, 30_000); return; }
    const n = list[i % list.length], addrs = getAddrs(); lp.node = n.name; openedAt = Date.now(); lp.addrKey = addrs.join(",");
    const sock = new WebSocket(n.ws, { handshakeTimeout: 10000 }); ws = sock; let downDone = false;
    sock.on("open", () => { sock.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: addrs }] })); ping = setInterval(() => { try { sock.ping(); } catch {} }, 15000); });
    sock.on("message", (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id === 1) {
        if (m.error) { console.log(`[live] ${n.name} refused: ${m.error.message}`); lp.drops.push({ ts: Date.now(), node: n.name, why: "refused: " + m.error.message.slice(0, 60), up: 0 }); if (/limit|paid|upgrade/i.test(m.error.message)) n.caps.ws = false; try { sock.terminate(); } catch {} return; }
        lp.connected = true; lp.since = Date.now(); backoff = 1000; clear("ws-down", `live feed reconnected via ${n.name}`); return;
      }
      if (m.params?.result?.topics) { if (n.backup) backupUse.wsEvents++; onLog(m.params.result, "ws"); }
    });
    const down = (why) => {
      if (downDone) return; downDone = true; clearInterval(ping);
      if (lp.connected) lp.drops.push({ ts: Date.now(), node: n.name, why, up: Date.now() - lp.since });
      lp.connected = false; const up = Date.now() - openedAt; if (up < 30_000) i++; else i = 0;
      setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000);
    };
    sock.on("close", (c, r) => down(`closed ${c}${r?.length ? " " + String(r).slice(0, 40) : ""}`));
    sock.on("error", (e) => { try { sock.terminate(); } catch {} down("error " + e.message.slice(0, 40)); });
    sock.on("unexpected-response", (_q, res) => down(`HTTP ${res.statusCode} on connect`));
  };
  connect();
  setInterval(() => { // resubscribe when the followed pools change (max once a minute)
    if (lp.connected && getAddrs().join(",") !== lp.addrKey) { try { ws.terminate(); } catch {} }
  }, 60_000);
  setInterval(() => { if (!lp.connected && lp.since && Date.now() - lp.since > 10 * 60_000) alarm("ws-down", `live feed down for 10+ min (${lp.drops.at(-1)?.why || "?"}). HTTP polling every 2 s is still collecting everything.`); }, 60_000);
}

async function pollLoop() {
  for (;;) {
    const wsQuiet = !lp.connected || Date.now() - lp.lastWsAt > 20_000; lp.polling = wsQuiet;
    try {
      const head = parseInt(await rpc("eth_blockNumber", []), 16); lp.httpBlock = head;
      const to = wsQuiet ? head : head - 5;
      let from = lp.sweepBlock ? lp.sweepBlock + 1 : to - 20; if (to - from > 2000) from = to - 2000;
      if (from <= to) { if (!lp.startBlock) lp.startBlock = from; const logs = sortLogs(await getLogsChunked({ address: getAddrs() }, from, to)); for (const l of logs) onLog(l, wsQuiet ? (lp.wsBlock ? "backfill" : "poll") : "sweep"); lp.sweepBlock = to; }
      await clear("no-logs", "launchpad events can be fetched again");
    } catch (e) { if (/no node could answer eth_getLogs/.test(e.message)) await alarm("no-logs", "no node is currently allowing log requests — data is NOT being collected."); }
    await sleep(wsQuiet ? C.POLL_FAST_MS : C.SWEEP_MS);
  }
}

export const audit = { last: null, history: [], lowLive: 0 };
export let blockTime = 0.45;
async function measureBlockTime() {
  try { const h = parseInt(await rpc("eth_blockNumber", []), 16), span = Math.min(2000, h - 1);
    const [a, b] = await Promise.all([rpc("eth_getBlockByNumber", [hex(h), false]), rpc("eth_getBlockByNumber", [hex(h - span), false])]);
    const ms = (x) => (x.milliTimestamp ? parseInt(x.milliTimestamp, 16) : parseInt(x.timestamp, 16) * 1000);
    const bt = (ms(a) - ms(b)) / span / 1000; if (bt > 0.05 && bt < 10) blockTime = bt; } catch {}
  return blockTime;
}
async function runAudit() {
  try {
    if (!lp.startBlock) return;
    const head = parseInt(await rpc("eth_blockNumber", []), 16), to = head - Math.max(60, Math.ceil(15 / blockTime));
    const from = Math.max(to - Math.round(240 / blockTime), lp.startBlock); if (to - from < T("AUDIT_MIN_BLOCKS", 100)) return;
    const logs = sortLogs(await getLogsChunked({ address: getAddrs() }, from, to));
    let live = 0, fin = 0; const missV = {};
    for (const l of logs) { const s = seen.get(key(l)); if (s) { fin++; if (s.path === "ws") live++; } else { const vn = venueOf(l.address.toLowerCase()); missV[vn] = (missV[vn] || 0) + 1; onLog(l, "audit"); } }
    const n = logs.length, livePct = n ? (live / n) * 100 : 100, finPct = n ? (fin / n) * 100 : 100;
    audit.last = { ts: Date.now(), from, to, n, livePct, finPct }; audit.history.push({ ts: Date.now(), livePct, finPct, n }); audit.history = audit.history.filter((x) => Date.now() - x.ts < 86_400_000);
    try { q.insHealth.run(Math.floor(Date.now() / 1000), from, to, n, finPct, livePct); } catch {}
    if (n >= 20 && finPct < 99.5) await alarm("gap", `<b>${(100 - finPct).toFixed(1)}%</b> of events in the last ~4 min were missed by the live feed, poller and sweep (${n - fin} of ${n}: ${Object.entries(missV).map(([k, c]) => `${k} ${c}`).join(", ")}). Recovered now, but signals on them were late.`);
    else if (finPct >= 99.9) await clear("gap", `no missed events in the last check (${n} events)`);
    audit.lowLive = n >= 20 && livePct < 20 ? audit.lowLive + 1 : 0; // publicnode closes free sockets every ~60 s, so live % is normally low; alarm only if it collapses
    await clear("audit-fail", "completeness check running again");
  } catch (e) { await alarm("audit-fail", `could not run the completeness check: ${e.message}`); }
}
async function nodeHealth() {
  const logNodes = NODES.filter((n) => n.caps.logs);
  if (logNodes.length && logNodes.every((n) => !usable(n, "logs"))) await alarm("no-logs", "every node that can serve logs is refusing us — collection paused until one recovers.");
  const all = NODES.map((n) => winStats(n));
  if (all.every((s) => s.ok === 0 && s.err + s["429"] > 0)) await alarm("all-down", "every BSC node is failing — no data is being collected."); else await clear("all-down", "nodes answering again");
}
export function feedSnapshot() { const a = audit.last; return { finalPct: a ? +a.finPct.toFixed(2) : null, livePct: a ? +a.livePct.toFixed(1) : null, polling: lp.polling }; }
export function feedReport() {
  const hourBy = {}; for (const x of lp.hour) hourBy[x.venue] = (hourBy[x.venue] || 0) + 1;
  const a = audit.last, h = audit.history, worst = h.length ? Math.min(...h.map((x) => x.finPct)) : null;
  const tot = Object.values(lp.byPath).reduce((s, x) => s + x, 0) || 1;
  return `<b>Feed</b>: live ${lp.connected ? `✅ via ${lp.node}` : "❌"}${lp.polling ? " · poller covering" : ""} · ${lp.drops.length} drops/h · events/h ${Object.entries(hourBy).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}\n` +
    `Arrived: live ${((lp.byPath.ws / tot) * 100).toFixed(0)}% · poller ${(((lp.byPath.poll + lp.byPath.backfill) / tot) * 100).toFixed(0)}% · sweep ${((lp.byPath.sweep / tot) * 100).toFixed(1)}% · only by 5-min check ${((lp.byPath.audit / tot) * 100).toFixed(2)}%\n` +
    `<b>Completeness</b>: ${a ? `${a.finPct >= 99.5 ? "✅" : "⚠️"} final ${a.finPct.toFixed(1)}% · live ${a.livePct.toFixed(0)}% (${a.n} events, ${ago(Date.now() - a.ts)} ago) · worst 24h ${worst.toFixed(1)}% over ${h.length} checks` : "first check ~5 min after start"}\n` +
    `<b>Nodes</b> (10 min ok/err/refused): ` + NODES.map((n) => { const s = winStats(n); return `${Date.now() < n.restUntil ? "💤" : s.ok && !s["429"] && !s.err ? "✅" : s.ok ? "⚠️" : "❔"}${n.name} ${s.ok}/${s.err}/${s["429"]}`; }).join(" · ") +
    (NODES.some((n) => n.backup) ? `\nNodeReal backup: ${Object.entries(backupUse.calls).map(([k, c]) => `${k} ${c}`).join(" · ") || "no calls"} · live ${backupUse.wsEvents}` : "") +
    `\nAlarms: ${alarms.size ? [...alarms.keys()].join(", ") : "none"}`;
}
export async function startFeed(addrsFn, dispatchFn) {
  getAddrs = addrsFn; dispatch = dispatchFn;
  await measureBlockTime(); setInterval(measureBlockTime, 3600_000);
  startLive(); pollLoop();
  setInterval(runAudit, T("AUDIT_EVERY_S", 300) * 1000); setTimeout(runAudit, T("AUDIT_FIRST_S", 300) * 1000);
  setInterval(nodeHealth, 300_000);
  return blockTime;
}
