// Alarms only (owner's rule: Telegram stays quiet) — bot down, firehose silent, budget gone, disk over 80%. Uses the tracker's bot and chat.
import { CFG } from "./config.mjs";
const last = {};
export async function alarm(key, text, everyMs = 1800_000) {
  if (!CFG.TG_TOKEN || !CFG.TG_CHAT || CFG.SMOKE) return;
  const n = Date.now(); if (n - (last[key] || 0) < everyMs) return; last[key] = n;
  try { await fetch(`https://api.telegram.org/bot${CFG.TG_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CFG.TG_CHAT, parse_mode: "HTML", text: `🟣 <b>fomo</b> · ${text}` }), signal: AbortSignal.timeout(10000) }); } catch {}
}
