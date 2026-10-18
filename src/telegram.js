/** Send a Telegram message. Returns message_id (or null). opts.replyTo threads it under an earlier message. */
export async function tg(text, opts = {}) {
  const TOKEN = process.env.TG_BOT_TOKEN, CHAT = process.env.TG_CHAT_ID;
  if (!TOKEN || !CHAT || process.env.SMOKE) { console.log("[tg skipped]", text); return null; } // v0.18.85: SMOKE=1 (pre-deploy check) never talks to Telegram
  try {
    const body = { chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true };
    if (opts.replyTo) body.reply_to_message_id = opts.replyTo;
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (!j.ok) { console.error("[tg]", r.status, JSON.stringify(j).slice(0, 200)); return null; }
    return j.result?.message_id ?? null;
  } catch (e) { console.error("[tg]", e.message); return null; }
}
