// BSC tracker — stage 0.2: launchpad feed with no gaps + feed-health alarms (no trading yet).
// • Live feed: WebSocket subscription to the Flap / four.meme / Genius.fun contracts, only on nodes that allow it
//   (publicnode, NodeReal when a key is set).
// • The moment the WebSocket drops or goes quiet, HTTP polling every 2 s takes over from the last block seen → no gaps.
//   While it is up, a trailing HTTP sweep every 10 s catches any single event the socket silently dropped.
// • Completeness check every 5 min (runs regardless of reconnects): the same blocks fetched directly and compared
//   event-by-event → "live %" (arrived in time over the WebSocket) and "final %" (after recovery). Misses are recovered.
// • Each node is only asked what it allows; nodes that refuse are rested and noted in /status, not alarmed about repeatedly.
// • Telegram ⚠️ alarms: data missing after recovery, live feed slow, no node able to serve launchpad logs, all nodes down.
import { readFileSync, writeFileSync } from "node:fs";
import WebSocket from "ws";

const ENV_FILE = process.env.ENV_FILE || "/root/tracker-bsc/.env";
try { for (const l of readFileSync(ENV_FILE, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const TOKEN = process.env.BSC_TG_BOT_TOKEN; let CHAT = String(process.env.BSC_TG_CHAT_ID || "").trim();
if (!/^-?\d+$/.test(CHAT)) CHAT = "";
function saveChat(id) {
  CHAT = String(id);
  try { let t = ""; try { t = readFileSync(ENV_FILE, "utf8"); } catch {}
    t = /^BSC_TG_CHAT_ID=.*$/m.test(t) ? t.replace(/^BSC_TG_CHAT_ID=.*$/m, `BSC_TG_CHAT_ID=${CHAT}`) : t + `\nBSC_TG_CHAT_ID=${CHAT}\n`;
    writeFileSync(ENV_FILE, t, { mode: 0o600 }); } catch (e) { console.error("[tg] save chat", e.message); }
}
const v = "bsc-0.2"; // BSC version (separate from the Solana tracker version in package.json)
const STAGE = "0.2";
const T = (k, d) => (process.env[k] ? Number(process.env[k]) : d); // test overrides (seconds)
const NR = process.env.NODEREAL_API_KEY;
// caps: ws = live subscription allowed · logs = address-filtered eth_getLogs allowed · chain = whole-chain eth_getLogs allowed
const NODES = [
  { name: "publicnode", http: "https://bsc-rpc.publicnode.com", ws: "wss://bsc-rpc.publicnode.com", caps: { ws: true, logs: true, chain: false } },
  ...(NR ? [{ name: "nodereal", http: `https://bsc-mainnet.nodereal.io/v1/${NR}`, ws: `wss://bsc-mainnet.nodereal.io/ws/v1/${NR}`, caps: { ws: true, logs: true, chain: true } }] : []),
  { name: "drpc", http: "https://bsc.drpc.org", caps: { ws: false, logs: false, chain: false } },
  { name: "bnbchain", http: "https://bsc-dataseed.bnbchain.org", caps: { ws: false, logs: false, chain: false } },
].map((n) => ({ ...n, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, restUntil: 0, win: [] }));
if (process.env.BSC_TEST_NODE) { NODES.length = 0; NODES.push({ name: "test", http: process.env.BSC_TEST_NODE, ws: process.env.BSC_TEST_NODE.replace("http", "ws").replace(/:\d+$/, (p) => ":" + (+p.slice(1) + 1)), caps: { ws: true, logs: true, chain: true }, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0, restUntil: 0, win: [] }); }
const LAUNCHPADS = { // address → venue (lower-case)
  "0xe2ce6ab80874fa9fa2aae65d277dd6b8e65c9de0": "flap",        // Flap Portal
  "0x5c952063c7fc8610ffdb798152d69f0b9550762b": "four.meme",   // four.meme TokenManager2
  "0x37ee8aee29c5efd3c1a7eda6df3f510779928a37": "genius",      // Genius.fun Factory v4.2
  "0x8e6f8ebbd62b60085b703c40b460dae802edc51b": "genius",      // Genius.fun MemeHook v4.2
};
const LP_ADDRS = Object.keys(LAUNCHPADS);
const SWAP_TOPICS = ["0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"];
const ALERT_EVERY_S = 1800;
const hex = (n) => "0x" + n.toString(16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ago = (ms) => (ms < 90_000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60000)}m`);

// ---------- Telegram ----------
async function tg(text) {
  if (!TOKEN || !CHAT) { console.log("[tg skipped]", text.replace(/<[^>]+>/g, "")); return; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }), signal: AbortSignal.timeout(8000) });
    const j = await r.json(); if (!j.ok) console.error("[tg]", JSON.stringify(j).slice(0, 200));
  } catch (e) { console.error("[tg]", e.message); }
}
const alarms = new Map(); // key -> {since, last}
async function alarm(key, text) { const a = alarms.get(key), now = Date.now() / 1000; if (a && now - a.last < ALERT_EVERY_S) return; alarms.set(key, { since: a?.since ?? now, last: now }); console.log("[ALARM]", key, text.replace(/<[^>]+>/g, "")); await tg(`⚠️ <b>BSC FEED ALARM</b> — ${text}`); }
async function clear(key, text) { const a = alarms.get(key); if (!a) return; alarms.delete(key); console.log("[clear]", key); await tg(`✅ <b>BSC feed recovered</b> — ${text} (alarm open ${Math.round((Date.now() / 1000 - a.since) / 60)} min)`); }

// ---------- HTTP RPC: per-node stats, capabilities, resting ----------
const LIMIT_RE = /limit|rate|too many|exceed|upgrade|paid|specify an address|restrict/i;
async function call(node, method, params, timeout = 10000) {
  const t = Date.now(); let r, j;
  const mark = (kind, msg) => { node.win.push({ ts: Date.now(), kind }); if (kind !== "ok") node.lastErr = String(msg).slice(0, 90); };
  try {
    r = await fetch(node.http, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeout) });
    j = r.status === 429 ? null : await r.json();
  } catch (e) { node.err++; mark("err", e.message); throw e; }
  if (r.status === 429) { node.r429++; mark("429", "429 too many requests"); throw Object.assign(new Error("429 too many requests"), { limit: true }); }
  if (j?.error) { const msg = String(j.error.message || "rpc error"); const lim = LIMIT_RE.test(msg); if (lim) node.r429++; else node.err++; mark(lim ? "429" : "err", msg); throw Object.assign(new Error(msg), { limit: lim }); }
  node.ok++; node.ms = Date.now() - t; mark("ok"); return j?.result;
}
setInterval(() => { const cut = Date.now() - 600_000; for (const n of NODES) { while (n.win.length && n.win[0].ts < cut) n.win.shift(); } }, 30_000);
const winStats = (n) => n.win.reduce((a, x) => { a[x.kind]++; return a; }, { ok: 0, err: 0, "429": 0 });
const usable = (n, cap) => (!cap || n.caps[cap]) && Date.now() > n.restUntil;
function rest(n, why) { // too many refusals → leave it alone for 15 min (no alarm; shown in /status)
  if (Date.now() < n.restUntil) return; n.restUntil = Date.now() + 15 * 60_000; console.log(`[node] resting ${n.name}: ${why}`);
}
let rr = 0;
async function rpc(method, params, cap = null) { // rotate across nodes that allow this kind of call
  const pool = NODES.filter((n) => usable(n, cap));
  for (let i = 0; i < pool.length; i++) {
    const n = pool[(rr++) % pool.length];
    try { return await call(n, method, params); }
    catch (e) { if (e.limit) { const s = winStats(n); if (s["429"] >= 5 && s["429"] > s.ok) rest(n, e.message); if (cap === "logs" && /specify an address/i.test(e.message)) n.caps.chain = false; } }
  }
  throw new Error(`no node could answer ${method}${cap ? ` (${cap})` : ""}`);
}
async function getLogsChunked(filter, from, to, step = 100) {
  const out = [];
  for (let a = from; a <= to; a += step) out.push(...((await rpc("eth_getLogs", [{ ...filter, fromBlock: hex(a), toBlock: hex(Math.min(a + step - 1, to)) }], "logs")) || []));
  return out;
}

// ---------- launchpad events (live WebSocket + HTTP poller + recovery) ----------
const seen = new Map(); // "tx:logIndex" -> { b, path: "ws" | "poll" | "backfill" | "sweep" | "audit", at }
const lp = { connected: false, node: "", since: 0, lastWsAt: 0, wsBlock: 0, httpBlock: 0, reconnects: 0, drops: [], byPath: { ws: 0, poll: 0, backfill: 0, sweep: 0, audit: 0 }, sweepBlock: 0, hour: [], polling: false };
const key = (l) => `${l.transactionHash}:${parseInt(l.logIndex, 16)}`;
function onLpLog(l, path) {
  if (l.removed) return; const k = key(l); if (seen.has(k)) return;
  const b = parseInt(l.blockNumber, 16); seen.set(k, { b, path, at: Date.now() }); lp.byPath[path]++;
  lp.hour.push({ ts: Date.now() / 1000, venue: LAUNCHPADS[l.address.toLowerCase()] || "?" });
  if (path === "ws") { lp.lastWsAt = Date.now(); if (b > lp.wsBlock) lp.wsBlock = b; }
  // → stage 1: decode and hand the event to the strategies here
}
const lastBlock = () => Math.max(lp.wsBlock, lp.httpBlock);
setInterval(() => { const now = Date.now() / 1000; while (lp.hour.length && now - lp.hour[0].ts > 3600) lp.hour.shift();
  const cut = lastBlock() - 30000; for (const [k, s] of seen) { if (s.b < cut) seen.delete(k); else break; }
  lp.drops = lp.drops.filter((d) => Date.now() - d.ts < 3600_000); }, 60_000);

function startLaunchpadFeed() {
  const wsNodes = () => NODES.filter((n) => n.ws && usable(n, "ws")); let i = 0, backoff = 1000, ws, ping, openedAt = 0;
  const connect = () => {
    const list = wsNodes(); if (!list.length) { setTimeout(connect, 30_000); return; }
    const n = list[i % list.length]; lp.node = n.name; openedAt = Date.now();
    ws = new WebSocket(n.ws, { handshakeTimeout: 10000 });
    ws.on("open", () => { ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: LP_ADDRS }] })); ping = setInterval(() => { try { ws.ping(); } catch {} }, 15000); });
    ws.on("message", (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id === 1) {
        if (m.error) { n.caps.ws = false; console.log(`[lp] ${n.name} refused subscription: ${m.error.message}`); lp.drops.push({ ts: Date.now(), node: n.name, why: "subscription refused: " + m.error.message.slice(0, 60), up: 0 }); try { ws.terminate(); } catch {} return; }
        lp.connected = true; lp.since = Date.now(); backoff = 1000; console.log("[lp] subscribed", n.name);
        clear("ws-down", `live feed reconnected via ${n.name}`); return;
      }
      if (m.params?.result?.topics) onLpLog(m.params.result, "ws");
    });
    let downDone = false;
    const down = (why) => {
      if (downDone) return; downDone = true; clearInterval(ping);
      if (lp.connected) { lp.reconnects++; lp.drops.push({ ts: Date.now(), node: n.name, why, up: Date.now() - lp.since }); }
      lp.connected = false; console.log(`[lp] down (${why}) after ${ago(Date.now() - openedAt)}`);
      i++; setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000);
    };
    ws.on("close", (c, r) => down(`closed ${c}${r?.length ? " " + String(r).slice(0, 40) : ""}`));
    ws.on("error", (e) => { console.log("[lp] error", e.message); try { ws.terminate(); } catch {} down("error " + e.message.slice(0, 40)); });
    ws.on("unexpected-response", (_q, res) => down(`HTTP ${res.statusCode} on connect`));
  };
  connect();
  // a socket that says it is connected but delivers nothing for 60 s while HTTP shows events is recycled
  setInterval(() => { if (lp.connected && lp.lastWsAt && Date.now() - lp.lastWsAt > 60_000 && lp.httpBlock > lp.wsBlock + 50) { console.log("[lp] stalled — recycling"); try { ws.terminate(); } catch {} } }, 15_000);
  setInterval(() => { if (!lp.connected && Date.now() - lp.since > 10 * 60_000 && lp.since) alarm("ws-down", `live feed has been down for 10+ min (${lp.drops.at(-1)?.why || "?"}). Events are still being collected by HTTP polling every 2 s.`); }, 60_000);
}

// HTTP poller: runs while the live feed is down or quiet, from the last block seen. Also keeps httpBlock fresh.
async function pollLoop() {
  // one HTTP cursor (lp.sweepBlock = last block fully fetched over HTTP). Live feed down/quiet → fetch to the head every 2 s;
  // live feed up → trailing sweep to head-5 every 10 s, which catches any single event the socket silently dropped.
  for (;;) {
    const wsQuiet = !lp.connected || Date.now() - lp.lastWsAt > 20_000;
    lp.polling = wsQuiet;
    try {
      const head = parseInt(await rpc("eth_blockNumber", []), 16); lp.httpBlock = head;
      const to = wsQuiet ? head : head - 5;
      let from = lp.sweepBlock ? lp.sweepBlock + 1 : to - 20; if (to - from > 2000) from = to - 2000;
      if (from <= to) { if (!lp.startBlock) lp.startBlock = from; const logs = await getLogsChunked({ address: LP_ADDRS }, from, to); for (const l of logs) onLpLog(l, wsQuiet ? (lp.wsBlock ? "backfill" : "poll") : "sweep"); lp.sweepBlock = to; }
      await clear("no-logs", "launchpad events can be fetched again");
    } catch (e) { if (/no node could answer eth_getLogs/.test(e.message)) await alarm("no-logs", "no node is currently allowing launchpad log requests — data is NOT being collected. A NodeReal key adds a second source."); }
    await sleep(wsQuiet ? 2000 : 10000);
  }
}

// ---------- completeness check (every 5 min, regardless of reconnects) ----------
const audit = { runs: 0, last: null, history: [], lowLive: 0 };
let blockTime = 0.45;
async function measureBlockTime() {
  try { const h = parseInt(await rpc("eth_blockNumber", []), 16), span = Math.min(2000, h - 1);
    const [a, b] = await Promise.all([rpc("eth_getBlockByNumber", [hex(h), false]), rpc("eth_getBlockByNumber", [hex(h - span), false])]);
    const ms = (x) => (x.milliTimestamp ? parseInt(x.milliTimestamp, 16) : parseInt(x.timestamp, 16) * 1000);
    const bt = (ms(a) - ms(b)) / span / 1000; if (bt > 0.05 && bt < 10) blockTime = bt; } catch {}
}
async function runAudit() {
  try {
    if (!lp.startBlock) return;
    const head = parseInt(await rpc("eth_blockNumber", []), 16), to = head - Math.max(60, Math.ceil(15 / blockTime)); // leave the sweep time to finish
    const from = Math.max(to - Math.round(240 / blockTime), lp.startBlock); // never audit blocks from before the bot started collecting
    if (to - from < T("AUDIT_MIN_BLOCKS", 100)) return;
    const logs = await getLogsChunked({ address: LP_ADDRS }, from, to);
    let live = 0, fin = 0; const missV = {};
    for (const l of logs) { const s = seen.get(key(l)); if (s) { fin++; if (s.path === "ws") live++; } else { const vn = LAUNCHPADS[l.address.toLowerCase()]; missV[vn] = (missV[vn] || 0) + 1; onLpLog(l, "audit"); } }
    const n = logs.length, livePct = n ? (live / n) * 100 : 100, finPct = n ? (fin / n) * 100 : 100;
    audit.runs++; audit.last = { ts: Date.now(), from, to, n, live, fin, livePct, finPct, missV };
    audit.history.push({ ts: Date.now(), livePct, finPct, n }); audit.history = audit.history.filter((x) => Date.now() - x.ts < 86_400_000);
    console.log(`[audit] ${from}-${to}: ${n} events · live ${livePct.toFixed(1)}% · final ${finPct.toFixed(1)}%`);
    if (n >= 20 && finPct < 99.5) await alarm("gap", `<b>${(100 - finPct).toFixed(1)}%</b> of launchpad events in the last ~4 min were missed by the live feed, the poller and the 10-s sweep (${n - fin} of ${n}: ${Object.entries(missV).map(([k, c]) => `${k} ${c}`).join(", ")}). They have now been recovered, but alerts/entries for them were late.`);
    else if (finPct >= 99.9) await clear("gap", `no missed events in the last check (${n} events)`);
    audit.lowLive = n >= 20 && livePct < 90 ? audit.lowLive + 1 : 0;
    if (audit.lowLive >= 3) await alarm("live-slow", `the live feed has delivered under 90% of events for 15 min (now ${livePct.toFixed(0)}%) — the rest came from HTTP polling, a few seconds later. Data is complete; alerts may lag by ~2–5 s.`);
    else if (audit.lowLive === 0) await clear("live-slow", `live feed delivering ${livePct.toFixed(0)}% of events again`);
    await clear("audit-fail", "completeness check running again");
  } catch (e) { await alarm("audit-fail", `could not run the completeness check: ${e.message}`); }
}

// ---------- whole-chain PancakeSwap test (nodes that may allow it) ----------
const chain = { last: [] };
async function chainTest() {
  const res = [];
  for (const n of NODES) {
    if (!n.caps.chain) { res.push({ name: n.name, ok: false, err: "not available on this free endpoint" }); continue; }
    try { const head = parseInt(await call(n, "eth_blockNumber", []), 16), t = Date.now();
      const logs = await call(n, "eth_getLogs", [{ topics: [SWAP_TOPICS], fromBlock: hex(head - 20), toBlock: hex(head - 1) }], 15000);
      res.push({ name: n.name, ok: true, n: logs.length, perMin: Math.round((logs.length / (20 * blockTime)) * 60), ms: Date.now() - t });
    } catch (e) { if (e.limit) n.caps.chain = false; res.push({ name: n.name, ok: false, err: e.message.slice(0, 70) }); }
  }
  chain.last = res;
}

// ---------- node health (alarm only when it matters) ----------
async function nodeHealth() {
  const logNodes = NODES.filter((n) => n.caps.logs);
  if (logNodes.length && logNodes.every((n) => !usable(n, "logs"))) await alarm("no-logs", "every node that can serve launchpad logs is refusing us right now — collection is paused until one recovers.");
  const all = NODES.map((n) => winStats(n));
  if (all.every((s) => s.ok === 0 && s.err + s["429"] > 0)) await alarm("all-down", "every BSC node is failing — no data is being collected."); else await clear("all-down", "nodes answering again");
}

// ---------- report ----------
function report() {
  const hourBy = {}; for (const x of lp.hour) hourBy[x.venue] = (hourBy[x.venue] || 0) + 1;
  const a = audit.last, h = audit.history, worst = h.length ? Math.min(...h.map((x) => x.finPct)) : null;
  const avgLive = h.length ? h.reduce((s, x) => s + x.livePct, 0) / h.length : null;
  const tot = Object.values(lp.byPath).reduce((s, x) => s + x, 0) || 1;
  const drops = lp.drops.slice(-3).map((d) => `${d.node}: ${d.why}${d.up ? ` after ${ago(d.up)}` : ""} (${ago(Date.now() - d.ts)} ago)`).join("\n   ");
  return `<b>Launchpad feed</b>: live ${lp.connected ? `✅ via ${lp.node} for ${ago(Date.now() - lp.since)}` : "❌ down"}${lp.polling ? " · HTTP poller covering" : ""} · ${lp.drops.length} drops in the last hour\n` +
    (drops ? `   ${drops}\n` : "") +
    `Events last hour: ${Object.keys(hourBy).length ? Object.entries(hourBy).map(([k, n]) => `${k} ${n}`).join(" · ") : "none yet"}\n` +
    `How they arrived (since start): live ${((lp.byPath.ws / tot) * 100).toFixed(0)}% · poller ${(((lp.byPath.poll + lp.byPath.backfill) / tot) * 100).toFixed(0)}% · 10-s sweep ${((lp.byPath.sweep / tot) * 100).toFixed(1)}% · caught only by 5-min check ${((lp.byPath.audit / tot) * 100).toFixed(1)}%\n` +
    `<b>Completeness</b>: ${a ? `${a.finPct >= 99.5 ? "✅" : "⚠️"} final ${a.finPct.toFixed(1)}% · live ${a.livePct.toFixed(0)}% (${a.n} events, ${ago(Date.now() - a.ts)} ago) · 24h: worst final ${worst.toFixed(1)}%, avg live ${avgLive.toFixed(0)}% over ${h.length} checks` : "first check ~5 min after start"}\n` +
    `<b>Nodes</b> (last 10 min ok/err/refused):\n` + NODES.map((n) => { const s = winStats(n); const resting = Date.now() < n.restUntil;
      return `${resting ? "💤" : s.ok && !s["429"] && !s.err ? "✅" : s.ok ? "⚠️" : "❔"} ${n.name} ${s.ok}/${s.err}/${s["429"]} · ${n.ms}ms · ${[n.caps.ws && "live", n.caps.logs && "logs", n.caps.chain && "whole-chain"].filter(Boolean).join("+") || "lookups only"}${resting ? ` · resting ${ago(n.restUntil - Date.now())}` : ""}${n.lastErr && (s.err || s["429"]) ? ` · ${n.lastErr.slice(0, 50)}` : ""}`; }).join("\n") +
    `\n<b>Whole-chain PancakeSwap</b> (block ${blockTime.toFixed(2)}s): ` + (chain.last.some((r) => r.ok) ? chain.last.filter((r) => r.ok).map((r) => `✅ ${r.name} ~${r.perMin}/min`).join(" · ") : "❌ no free node allows it — needs the NodeReal key") +
    `\nActive alarms: ${alarms.size ? [...alarms.keys()].join(", ") : "none"}${NR ? "" : "\nℹ️ No NodeReal key yet — publicnode is the only source of launchpad events."}`;
}

// ---------- Telegram commands ----------
let offset = 0;
async function poll() {
  if (!TOKEN) return;
  for (;;) {
    try {
      const j = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=25&offset=${offset}`, { signal: AbortSignal.timeout(35000) })).json();
      for (const u of j.result || []) {
        offset = u.update_id + 1; const m = u.message || u.channel_post;
        if (m?.migrate_to_chat_id && String(m.chat?.id) === CHAT) { saveChat(m.migrate_to_chat_id); continue; }
        if (!CHAT && m?.text && /^\/start/.test(m.text) && /group|channel/.test(m.chat?.type || "")) { saveChat(m.chat.id); await tg(`🟡 <b>BSC tracker linked to this group</b> (chat ${CHAT})\n` + report()); continue; }
        if (!m?.text || String(m.chat?.id) !== CHAT) continue;
        if (/^\/status/.test(m.text)) await tg(`🟡 <b>BSC ${v}</b> · stage ${STAGE} (feed test, no trading) · up ${ago(process.uptime() * 1000)}\n` + report());
      }
    } catch { await sleep(5000); }
  }
}

// ---------- start ----------
console.log(`bsc-tracker ${v} stage ${STAGE} · chat ${CHAT || "not set"} · nodes ${NODES.map((n) => n.name).join(",")}`);
if (TOKEN) { try { await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`, { signal: AbortSignal.timeout(8000) }); } catch {} }
await measureBlockTime(); setInterval(measureBlockTime, 3600_000);
startLaunchpadFeed(); pollLoop();
await chainTest();
await tg(`🟡 <b>BSC tracker ${v} — stage ${STAGE}</b>: gap-free launchpad feed + health alarms (no trading yet)\n` +
  `Live feed on publicnode${NR ? " + NodeReal" : ""}; HTTP polling every 2 s takes over whenever it drops. Completeness check every 5 min (first in ~5 min). Known node limits are handled quietly; ⚠️ only when data is actually at risk.\n\n` + report());
setInterval(runAudit, T("AUDIT_EVERY_S", 300) * 1000); setTimeout(runAudit, T("AUDIT_FIRST_S", 300) * 1000);
setInterval(chainTest, 3600_000);
setInterval(nodeHealth, T("HEALTH_EVERY_S", 300) * 1000);
setInterval(() => { const a = audit.last; tg(`💓 <b>BSC health</b> · live ${lp.connected ? "✅" : "❌"} · ${lp.drops.length} drops/h · events/h ${lp.hour.length} · final ${a ? a.finPct.toFixed(1) + "%" : "—"} · live ${a ? a.livePct.toFixed(0) + "%" : "—"} · alarms ${alarms.size ? [...alarms.keys()].join(", ") : "none"}`); }, 3 * 3600_000);
poll();
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
