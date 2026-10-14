// BSC tracker — stage 0: pipeline check only (no trading yet).
// Proves the auto-deploy, the .env, the Telegram bot and the free BSC nodes all work before the real tracker lands.
import { readFileSync } from "node:fs";
import WebSocket from "ws";

try { // load .env (path from pm2 ecosystem)
  for (const l of readFileSync(process.env.ENV_FILE || "/root/tracker-bsc/.env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const TOKEN = process.env.BSC_TG_BOT_TOKEN, CHAT = String(process.env.BSC_TG_CHAT_ID || "");
const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
const HTTP = ["https://bsc-rpc.publicnode.com", "https://bsc.drpc.org", "https://bsc-dataseed.bnbchain.org",
  ...(process.env.NODEREAL_API_KEY ? [`https://bsc-mainnet.nodereal.io/v1/${process.env.NODEREAL_API_KEY}`] : [])];
const WSS = ["wss://bsc-rpc.publicnode.com", ...(process.env.NODEREAL_API_KEY ? [`wss://bsc-mainnet.nodereal.io/ws/v1/${process.env.NODEREAL_API_KEY}`] : [])];
const SWAP_TOPICS = ["0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822", "0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83"];
const hide = (u) => u.replace(/[0-9a-f]{20,}/gi, "***");

async function tg(text) {
  if (!TOKEN || !CHAT) { console.log("[tg skipped]", text); return; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }), signal: AbortSignal.timeout(8000) });
    const j = await r.json(); if (!j.ok) console.error("[tg]", JSON.stringify(j).slice(0, 200));
  } catch (e) { console.error("[tg]", e.message); }
}

async function httpCheck() {
  const out = [];
  for (const u of HTTP) {
    const t = Date.now();
    try {
      const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }), signal: AbortSignal.timeout(8000) });
      const j = await r.json(); out.push(`✅ ${hide(u)} block ${parseInt(j.result, 16)} (${Date.now() - t}ms)`);
    } catch (e) { out.push(`❌ ${hide(u)} ${e.message}`); }
  }
  return out;
}

function wsCheck(url, seconds = 30) { // subscribe to every PancakeSwap Swap log on the chain and count them
  return new Promise((resolve) => {
    let n = 0, err = null; const ws = new WebSocket(url, { handshakeTimeout: 10000 });
    const done = () => { try { ws.terminate(); } catch {} resolve(err ? `❌ ${hide(url)} ${err}` : `${n ? "✅" : "⚠️"} ${hide(url)} ${n} swaps in ${seconds}s (~${Math.round((n / seconds) * 60)}/min)`); };
    const t = setTimeout(done, seconds * 1000);
    ws.on("open", () => ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { topics: [SWAP_TOPICS] }] })));
    ws.on("message", (raw) => { const m = JSON.parse(raw); if (m.id === 1 && m.error) { err = "subscribe refused: " + m.error.message; clearTimeout(t); done(); } else if (m.params?.result) n++; });
    ws.on("error", (e) => { err = e.message; clearTimeout(t); done(); });
  });
}

async function report() {
  const h = await httpCheck(), w = [];
  for (const u of WSS) w.push(await wsCheck(u));
  return `HTTP nodes:\n${h.join("\n")}\nWebSocket (whole-chain Swap feed):\n${w.join("\n")}`;
}

// Telegram /status
let offset = 0;
async function poll() {
  if (!TOKEN) return;
  for (;;) {
    try {
      const j = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=25&offset=${offset}`, { signal: AbortSignal.timeout(35000) })).json();
      for (const u of j.result || []) {
        offset = u.update_id + 1; const m = u.message; if (!m?.text || String(m.chat?.id) !== CHAT) continue;
        if (/^\/status/.test(m.text)) await tg(`🟡 <b>BSC</b> v${v} stage 0 (pipeline check) · up ${Math.round(process.uptime() / 60)}m\n` + (await report()));
      }
    } catch { await new Promise((r) => setTimeout(r, 5000)); }
  }
}

console.log(`bsc-tracker v${v} stage 0 starting`);
const r = await report(); console.log(r);
await tg(`🟡 <b>BSC tracker online</b> v${v} — stage 0: pipeline check (no trading yet)\nAuto-deploy ✅ · .env ✅ · Telegram ✅\n${r}\nSend /status any time to re-test.`);
poll();
setInterval(() => {}, 1 << 30);
