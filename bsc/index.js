// BSC tracker — stage 0.1: feed test + permanent feed-health alarms (no trading yet).
// • Launchpad feed: one WebSocket subscription to the Flap / four.meme / Genius.fun contracts.
// • Audit every 5 min: the same blocks fetched directly over HTTP and compared log-by-log → completeness %.
//   Anything the WebSocket missed is recovered (counted), and a reconnect back-fills the blocks it was down for.
// • Whole-chain PancakeSwap test every 10 min on each free node (can HTTP carry chain-wide momentum?).
// • Telegram ⚠️ alarm the moment completeness drops, a node starts refusing (429), or the feed goes quiet; ✅ when it recovers.
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
const v = "bsc-0.1"; // BSC version (separate from the Solana tracker version in package.json)
const NR = process.env.NODEREAL_API_KEY;
const NODES = [
  { name: "publicnode", http: "https://bsc-rpc.publicnode.com", ws: "wss://bsc-rpc.publicnode.com" },
  { name: "drpc", http: "https://bsc.drpc.org", ws: "wss://bsc.drpc.org" },
  { name: "bnbchain", http: "https://bsc-dataseed.bnbchain.org" },
  ...(NR ? [{ name: "nodereal", http: `https://bsc-mainnet.nodereal.io/v1/${NR}`, ws: `wss://bsc-mainnet.nodereal.io/ws/v1/${NR}` }] : []),
].map((n) => ({ ...n, ok: 0, err: 0, r429: 0, lastErr: "", ms: 0 }));
if (process.env.BSC_TEST_NODE) { NODES.length = 0; NODES.push({ name: "test", http: process.env.BSC_TEST_NODE, ws: process.env.BSC_TEST_NODE.replace("http", "ws").replace(/:\d+$/, (p) => ":" + (+p.slice(1) + 1)), ok: 0, err: 0, r429: 0, lastErr: "", ms: 0 }); }
const T = (k, d) => (process.env[k] ? Number(process.env[k]) : d); // test overrides (seconds)
const LAUNCHPADS = { // address → venue (lower-case)
  "0xe2ce6ab80874fa9fa2aae65d277dd6b8e65c9de0": "flap",        // Flap Portal
  "0x5c952063c7fc8610ffdb798152d69f0b9550762b": "four.meme",   // four.meme TokenManager2
  "0x37ee8aee29c5efd3c1a7eda6df3f510779928a37": "genius",      // Genius.fun Factory v4.2
  "0x8e6f8ebbd62b60085b703c40b460dae802edc51b": "genius",      // Genius.fun MemeHook v4.2
};
const LP_ADDRS = Object.keys(LAUNCHPADS);
const SWAP_TOPICS = ["0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"];
const ALERT_EVERY_S = 1800;

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
async function alarm(key, text) { const a = alarms.get(key), now = Date.now() / 1000; if (a && now - a.last < ALERT_EVERY_S) return; alarms.set(key, { since: a?.since ?? now, last: now }); console.log("[ALARM]", key, text); await tg(`⚠️ <b>BSC FEED ALARM</b> — ${text}`); }
async function clear(key, text) { const a = alarms.get(key); if (!a) return; alarms.delete(key); await tg(`✅ <b>BSC feed recovered</b> — ${text} (was down ${Math.round((Date.now() / 1000 - a.since) / 60)} min)`); }

// ---------- HTTP RPC with per-node stats ----------
async function call(node, method, params, timeout = 10000) {
  const t = Date.now();
  let r, j;
  try {
    r = await fetch(node.http, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeout) });
    j = r.status === 429 ? null : await r.json();
  } catch (e) { node.err++; node.lastErr = e.message.slice(0, 80); throw e; }
  if (r.status === 429) { node.r429++; node.lastErr = "429 too many requests"; throw new Error("429"); }
  if (j?.error) {
    const msg = String(j.error.message || "rpc error").slice(0, 80);
    if (/limit|rate|too many|exceed/i.test(msg)) node.r429++; else node.err++;
    node.lastErr = msg; throw new Error(msg);
  }
  node.ok++; node.ms = Date.now() - t; return j?.result;
}
let rr = 0;
async function rpc(method, params) { // rotate across nodes, try each once
  for (let i = 0; i < NODES.length; i++) { const n = NODES[(rr++) % NODES.length]; try { return await call(n, method, params); } catch {} }
  throw new Error(`all nodes failed: ${method}`);
}
const hex = (n) => "0x" + n.toString(16);
async function getLogsChunked(filter, from, to, step = 100) {
  const out = [];
  for (let a = from; a <= to; a += step) out.push(...((await rpc("eth_getLogs", [{ ...filter, fromBlock: hex(a), toBlock: hex(Math.min(a + step - 1, to)) }])) || []));
  return out;
}

// ---------- launchpad WebSocket feed ----------
const seen = new Map(); // "tx:logIndex" -> block
const lp = { connected: false, url: "", since: 0, lastLogAt: 0, lastBlock: 0, reconnects: 0, recovered: 0, total: 0, byVenue: {}, hour: [] };
const key = (l) => `${l.transactionHash}:${parseInt(l.logIndex, 16)}`;
function onLpLog(l, viaHttp = false) {
  if (l.removed) return; const k = key(l); if (seen.has(k)) return;
  const b = parseInt(l.blockNumber, 16); seen.set(k, b); lp.total++; if (viaHttp) lp.recovered++;
  const venue = LAUNCHPADS[l.address.toLowerCase()] || "?"; lp.byVenue[venue] = (lp.byVenue[venue] || 0) + 1;
  lp.hour.push({ ts: Date.now() / 1000, venue });
  if (!viaHttp) { lp.lastLogAt = Date.now(); if (b > lp.lastBlock) lp.lastBlock = b; }
}
setInterval(() => { const now = Date.now() / 1000; while (lp.hour.length && now - lp.hour[0].ts > 3600) lp.hour.shift(); const cut = lp.lastBlock - 20000; for (const [k, b] of seen) if (b < cut) seen.delete(k); else break; }, 60_000);

function startLaunchpadFeed() {
  const wsNodes = NODES.filter((n) => n.ws); let i = 0, backoff = 1000, ws, ping;
  const connect = () => {
    const n = wsNodes[i % wsNodes.length]; lp.url = n.name;
    ws = new WebSocket(n.ws, { handshakeTimeout: 10000 });
    ws.on("open", () => { backoff = 1000; ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: LP_ADDRS }] })); ping = setInterval(() => { try { ws.ping(); } catch {} }, 20000); });
    ws.on("message", async (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id === 1) {
        if (m.error) { await alarm("ws-refused", `${n.name} refused the launchpad subscription: ${m.error.message}`); try { ws.terminate(); } catch {} return; }
        const wasDown = !lp.connected && lp.lastBlock; lp.connected = true; lp.since = Date.now(); console.log("[lp] subscribed", n.name);
        if (wasDown) backfill("reconnect"); clear("ws-down", `launchpad feed reconnected via ${n.name}`); return;
      }
      if (m.params?.result?.topics) onLpLog(m.params.result);
    });
    const down = (why) => { clearInterval(ping); if (lp.connected) lp.reconnects++; lp.connected = false; console.log("[lp] down", why); i++; setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000); };
    ws.on("close", (c) => down(`close ${c}`)); ws.on("error", (e) => { console.log("[lp] error", e.message); try { ws.terminate(); } catch {} });
  };
  connect();
  setInterval(() => { if (!lp.connected && Date.now() - lp.since > 120_000) alarm("ws-down", "launchpad WebSocket has been disconnected for 2+ min (gaps are back-filled over HTTP when it returns)"); }, 30_000);
}
async function backfill(why) { // fetch the blocks the WebSocket may have missed
  try { const head = parseInt(await rpc("eth_blockNumber", []), 16), from = Math.max(lp.lastBlock + 1, head - 2000);
    const logs = await getLogsChunked({ address: LP_ADDRS }, from, head); let n = 0; for (const l of logs) { const k = key(l); if (!seen.has(k)) { onLpLog(l, true); n++; } }
    console.log(`[lp] backfill (${why}) ${from}→${head}: ${n} recovered`); } catch (e) { console.error("[lp] backfill", e.message); }
}

// ---------- audit: WebSocket vs direct HTTP for the same blocks ----------
const audit = { runs: 0, last: null, worst24: 100, history: [] };
let blockTime = 0.45;
async function measureBlockTime() {
  try { const h = parseInt(await rpc("eth_blockNumber", []), 16);
    const span = Math.min(2000, h - 1);
    const [a, b] = await Promise.all([rpc("eth_getBlockByNumber", [hex(h), false]), rpc("eth_getBlockByNumber", [hex(h - span), false])]);
    const ms = (x) => (x.milliTimestamp ? parseInt(x.milliTimestamp, 16) : parseInt(x.timestamp, 16) * 1000);
    const bt = (ms(a) - ms(b)) / span / 1000; if (bt > 0.05 && bt < 10) blockTime = bt; } catch {}
}
async function runAudit() {
  if (!lp.connected || Date.now() - lp.since < T("AUDIT_WARMUP_S", 360) * 1000) return; // need the socket up for the whole window
  try {
    const head = parseInt(await rpc("eth_blockNumber", []), 16);
    const to = head - 30, from = Math.max(to - Math.round(240 / blockTime), Math.ceil(head - (Date.now() - lp.since) / 1000 / blockTime) + 30);
    if (to - from < T("AUDIT_MIN_BLOCKS", 50)) return;
    const logs = await getLogsChunked({ address: LP_ADDRS }, from, to);
    let hit = 0, miss = 0; const missV = {};
    for (const l of logs) { if (seen.has(key(l))) hit++; else { miss++; const vn = LAUNCHPADS[l.address.toLowerCase()]; missV[vn] = (missV[vn] || 0) + 1; onLpLog(l, true); } }
    const pct = logs.length ? (hit / logs.length) * 100 : 100;
    audit.runs++; audit.last = { ts: Date.now(), from, to, http: logs.length, ws: hit, miss, missV, pct };
    audit.history.push({ ts: Date.now(), pct, n: logs.length }); audit.history = audit.history.filter((x) => Date.now() - x.ts < 86_400_000);
    audit.worst24 = Math.min(...audit.history.map((x) => x.pct));
    console.log(`[audit] blocks ${from}-${to}: http ${logs.length} ws ${hit} missed ${miss} → ${pct.toFixed(1)}%`);
    if (logs.length >= 20 && pct < 99) await alarm("gap", `WebSocket delivered only <b>${pct.toFixed(1)}%</b> of launchpad events in the last ~4 min (${miss} of ${logs.length} missed: ${Object.entries(missV).map(([k, n]) => `${k} ${n}`).join(", ")}). Missed events were recovered over HTTP.`);
    else if (pct >= 99.5) await clear("gap", `launchpad feed complete again (${pct.toFixed(1)}%)`);
    await clear("audit-fail", "audit can reach the nodes again");
  } catch (e) { await alarm("audit-fail", `could not run the completeness check: ${e.message}`); }
}

// ---------- whole-chain PancakeSwap test over HTTP (each node) ----------
const chain = { last: [], ts: 0 };
async function chainTest() {
  const res = [];
  for (const n of NODES) {
    try { const head = parseInt(await call(n, "eth_blockNumber", []), 16), t = Date.now();
      const logs = await call(n, "eth_getLogs", [{ topics: [SWAP_TOPICS], fromBlock: hex(head - 20), toBlock: hex(head - 1) }], 15000);
      res.push({ name: n.name, ok: true, n: logs.length, perMin: Math.round((logs.length / (20 * blockTime)) * 60), ms: Date.now() - t });
    } catch (e) { res.push({ name: n.name, ok: false, err: n.lastErr || e.message }); }
  }
  chain.last = res; chain.ts = Date.now();
}

// ---------- node health ----------
let prevStats = NODES.map((n) => ({ ok: 0, err: 0, r429: 0 }));
async function nodeHealth() {
  NODES.forEach((n, i) => {
    const d = { ok: n.ok - prevStats[i].ok, err: n.err - prevStats[i].err, r429: n.r429 - prevStats[i].r429 }; prevStats[i] = { ok: n.ok, err: n.err, r429: n.r429 };
    n.window = d; const tot = d.ok + d.err + d.r429;
    if (d.r429 >= 3) alarm(`429-${n.name}`, `${n.name} is rate-limiting us (${d.r429} refusals in 10 min). The bot is spreading load to the other nodes.`);
    else if (tot >= 10 && d.err / tot > 0.3) alarm(`err-${n.name}`, `${n.name} failing ${Math.round((d.err / tot) * 100)}% of requests (${n.lastErr}).`);
    else { clear(`429-${n.name}`, `${n.name} no longer rate-limiting`); clear(`err-${n.name}`, `${n.name} answering normally`); }
  });
  if (NODES.every((n) => n.window && n.window.ok === 0 && n.window.err + n.window.r429 > 0)) alarm("all-down", "every BSC node is failing — no data is being collected.");
  else clear("all-down", "nodes answering again");
}
// quiet feed: no launchpad events at all for 5 min while the socket says it is connected
setInterval(() => { if (lp.connected && lp.lastLogAt && Date.now() - lp.lastLogAt > 300_000) alarm("quiet", "no launchpad events received for 5 min although the WebSocket is connected — possible silent stall; reconnecting."); else if (Date.now() - lp.lastLogAt < 60_000) clear("quiet", "launchpad events flowing again"); }, 60_000);

// ---------- report ----------
function report() {
  const hourBy = {}; for (const x of lp.hour) hourBy[x.venue] = (hourBy[x.venue] || 0) + 1;
  const a = audit.last;
  return `<b>Launchpad feed</b> (WebSocket via ${lp.url}): ${lp.connected ? "✅ connected" : "❌ disconnected"} · ${lp.reconnects} reconnects\n` +
    `Events last hour: ${Object.keys(hourBy).length ? Object.entries(hourBy).map(([k, n]) => `${k} ${n}`).join(" · ") : "none yet"} · recovered over HTTP ${lp.recovered}\n` +
    `<b>Completeness check</b>: ${a ? `${a.pct >= 99 ? "✅" : "⚠️"} ${a.pct.toFixed(1)}% (${a.ws}/${a.http} events, blocks ${a.from}–${a.to}, ${Math.round((Date.now() - a.ts) / 60000)} min ago) · worst 24h ${audit.worst24.toFixed(1)}% over ${audit.history.length} checks` : "first check ~6 min after start"}\n` +
    `<b>Nodes</b> (last 10 min ok/err/429):\n` + NODES.map((n) => `${n.window && n.window.ok && !n.window.r429 ? "✅" : n.window?.ok ? "⚠️" : n.ok ? "✅" : "❔"} ${n.name} ${n.window ? `${n.window.ok}/${n.window.err}/${n.window.r429}` : `${n.ok}/${n.err}/${n.r429}`} · ${n.ms}ms${n.lastErr ? ` · last error: ${n.lastErr}` : ""}`).join("\n") +
    `\n<b>Whole-chain PancakeSwap over HTTP</b> (20 blocks, block time ${blockTime.toFixed(2)}s):\n` + (chain.last.length ? chain.last.map((r) => r.ok ? `✅ ${r.name}: ${r.n} swaps → ~${r.perMin}/min (${r.ms}ms)` : `❌ ${r.name}: ${r.err}`).join("\n") : "running…") +
    `\nActive alarms: ${alarms.size ? [...alarms.keys()].join(", ") : "none"}`;
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
        if (/^\/status/.test(m.text)) await tg(`🟡 <b>BSC</b> ${v} · stage 0.1 (feed test, no trading) · up ${Math.round(process.uptime() / 60)}m\n` + report());
      }
    } catch { await new Promise((r) => setTimeout(r, 5000)); }
  }
}

// ---------- start ----------
const STAGE = "0.1";
console.log(`bsc-tracker ${v} stage ${STAGE} · chat ${CHAT || "not set"} · nodes ${NODES.map((n) => n.name).join(",")}`);
if (TOKEN) { try { await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`, { signal: AbortSignal.timeout(8000) }); } catch {} }
await measureBlockTime(); setInterval(measureBlockTime, 3600_000);
startLaunchpadFeed();
await chainTest();
await tg(`🟡 <b>BSC tracker ${v} — stage ${STAGE}</b>: feed test + health alarms (no trading yet)\nWatching Flap · four.meme · Genius.fun contracts. First completeness check in ~6 min, then every 5 min. You'll get a ⚠️ here the moment anything is missing or a node starts refusing.\n\n` + report());
setInterval(runAudit, T("AUDIT_EVERY_S", 300) * 1000); setTimeout(runAudit, T("AUDIT_FIRST_S", 390) * 1000);
setInterval(chainTest, 600_000);
setInterval(nodeHealth, T("HEALTH_EVERY_S", 600) * 1000);
setInterval(() => tg(`💓 <b>BSC health</b> · ${lp.connected ? "feed ✅" : "feed ❌"} · events/h ${lp.hour.length} · completeness ${audit.last ? audit.last.pct.toFixed(1) + "%" : "—"} (worst 24h ${audit.worst24.toFixed(1)}%) · alarms ${alarms.size || "none"}`), 3 * 3600_000);
poll();
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
