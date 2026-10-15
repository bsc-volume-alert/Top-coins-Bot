// BSC Telegram bot (separate from the Solana one). Chat ID is adopted from the first group that sends /start.
import { readFileSync, writeFileSync } from "node:fs";
import { ENV_FILE } from "./config.js";
export const TOKEN = process.env.BSC_TG_BOT_TOKEN;
let chat = String(process.env.BSC_TG_CHAT_ID || "").trim(); if (!/^-?\d+$/.test(chat)) chat = "";
export const CHAT = () => chat;
export function saveChat(id) {
  chat = String(id);
  try { let t = ""; try { t = readFileSync(ENV_FILE, "utf8"); } catch {}
    t = /^BSC_TG_CHAT_ID=.*$/m.test(t) ? t.replace(/^BSC_TG_CHAT_ID=.*$/m, `BSC_TG_CHAT_ID=${chat}`) : t + `\nBSC_TG_CHAT_ID=${chat}\n`;
    writeFileSync(ENV_FILE, t, { mode: 0o600 }); } catch (e) { console.error("[tg] save chat", e.message); }
}
// simple send queue: Telegram allows ~20 messages/min to a group
const queue = []; let sending = false;
export function tg(text, opts = {}) {
  return new Promise((resolve) => { queue.push({ text, opts, resolve }); if (!sending) drain(); });
}
async function drain() {
  sending = true;
  while (queue.length) {
    const { text, opts, resolve } = queue.shift();
    if (!TOKEN || !chat) { console.log("[tg skipped]", text.replace(/<[^>]+>/g, "").slice(0, 300)); resolve(null); continue; }
    let id = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const body = { chat_id: chat, text: text.slice(0, 4090), parse_mode: "HTML", disable_web_page_preview: true };
        if (opts.replyTo) { body.reply_to_message_id = opts.replyTo; body.allow_sending_without_reply = true; }
        const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        const j = await r.json();
        if (j.ok) { id = j.result?.message_id ?? null; break; }
        if (j.error_code === 429) { await new Promise((ok) => setTimeout(ok, ((j.parameters?.retry_after || 3) + 1) * 1000)); continue; }
        console.error("[tg]", JSON.stringify(j).slice(0, 200)); break;
      } catch (e) { console.error("[tg]", e.message); await new Promise((ok) => setTimeout(ok, 2000)); }
    }
    resolve(id);
    await new Promise((ok) => setTimeout(ok, 1100));
  }
  sending = false;
}
export async function tgDocument(buf, filename, caption) {
  if (!TOKEN || !chat) return;
  const fd = new FormData(); fd.append("chat_id", chat); fd.append("document", new Blob([buf]), filename); if (caption) fd.append("caption", caption);
  try { const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: "POST", body: fd }); if (!r.ok) console.error("[tg doc]", (await r.text()).slice(0, 200)); } catch (e) { console.error("[tg doc]", e.message); }
}
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const fmt = (v) => { v = Number(v) || 0; return v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : v.toFixed(0); };
export const links = (token) => `<a href="https://dexscreener.com/bsc/${token}">DexS</a> · <a href="https://gmgn.ai/bsc/token/${token}">GMGN</a> · <a href="https://flap.sh/bnb/${token}">Flap</a> · <a href="https://bscscan.com/token/${token}">BscScan</a>\n<code>${token}</code>`;
export const pc = (m) => (m == null ? "—" : `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`);
export const ageStr = (s) => (s == null ? "age ?" : s < 3600 ? `${Math.floor(s / 60)}m old` : s < 86400 ? `${(s / 3600).toFixed(1)}h old` : `${(s / 86400).toFixed(1)}d old`);
