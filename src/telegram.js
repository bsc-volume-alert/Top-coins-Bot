export async function tg(text) {
  const TOKEN = process.env.TG_BOT_TOKEN, CHAT = process.env.TG_CHAT_ID;
  if (!TOKEN || !CHAT) return console.log("[tg skipped]", text);
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true })
    });
    if (!r.ok) console.error("[tg]", r.status, await r.text());
  } catch (e) { console.error("[tg]", e.message); }
}
