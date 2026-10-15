// Telegram commands + reports: /report /summary /csv /status /wallets /creators /runners /watch … (BSC group only).
import { C } from "./config.js";
import { db, X } from "./db.js";
import { tg, tgDocument, TOKEN, CHAT, saveChat, esc, fmt, pc } from "./telegram.js";
import { zip } from "../src/zip.js";
import { leaderboardText, walletText, addWatch, removeWatch, watchList, creatorsText, creatorText, addWatchCreator, removeWatchCreator, watchCreatorList, runnersText } from "./wallets.js";
import { kindName } from "./paper.js";

let offset = 0, deps = {};
export function startCommands(d) { deps = d; if (TOKEN) poll(); }
const HELP = "Commands: /status · /report · /report7 · /summary · /summary7 · /csv · /wallets · /wallets30 · /wallet &lt;addr&gt; · /watch &lt;addr&gt; [label] · /unwatch &lt;addr&gt; · /creators · /creators30 · /creator &lt;addr&gt; · /watchcreator &lt;addr&gt; [label] · /unwatchcreator &lt;addr&gt; · /watching · /runners · /runners7";
async function poll() {
  for (;;) {
    try {
      const j = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=25&offset=${offset}&allowed_updates=["message"]`, { signal: AbortSignal.timeout(35000) })).json();
      for (const u of j.result || []) {
        offset = u.update_id + 1; const m = u.message; if (!m?.text) continue;
        if (m.migrate_to_chat_id && String(m.chat?.id) === CHAT()) { saveChat(m.migrate_to_chat_id); continue; }
        if (!CHAT() && /^\/start/.test(m.text) && /group/.test(m.chat?.type || "")) { saveChat(m.chat.id); await tg("🟡 <b>BSC tracker linked to this group</b>\n" + HELP); continue; }
        if (String(m.chat?.id) !== CHAT()) continue;
        const [cmd0, a, ...rest] = m.text.trim().split(/\s+/), cmd = cmd0.toLowerCase().replace(/@.*$/, ""), label = rest.join(" ") || null;
        const isAddr = (x) => /^0x[0-9a-fA-F]{40}$/.test(x || "");
        if (cmd === "/status") await tg(deps.status());
        else if (cmd === "/report") await tg(reportText(24)); else if (cmd === "/report7") await tg(reportText(24 * 7));
        else if (cmd === "/summary") await tg(summaryText(24)); else if (cmd === "/summary7") await tg(summaryText(24 * 7));
        else if (cmd === "/csv") await sendCsv();
        else if (cmd === "/wallets") await tg(leaderboardText(7, 10)); else if (cmd === "/wallets30") await tg(leaderboardText(30, 10));
        else if (cmd === "/wallet") await tg(isAddr(a) ? walletText(a) : "Usage: /wallet 0x…");
        else if (cmd === "/watch") { if (!isAddr(a)) await tg("Usage: /watch 0x… [label]"); else { addWatch(a, label); await tg(`👁 watching <code>${a.toLowerCase()}</code>${label ? " as " + esc(label) : ""} — copy alert + paper trade on its Flap buys`); } }
        else if (cmd === "/unwatch") { if (isAddr(a)) { removeWatch(a); await tg(`removed <code>${a.toLowerCase()}</code>`); } }
        else if (cmd === "/creators") await tg(creatorsText(7, 10)); else if (cmd === "/creators30") await tg(creatorsText(30, 10));
        else if (cmd === "/creator") await tg(isAddr(a) ? creatorText(a) : "Usage: /creator 0x…");
        else if (cmd === "/watchcreator") { if (!isAddr(a)) await tg("Usage: /watchcreator 0x… [label]"); else { addWatchCreator(a, label); await tg(`👁 watching creator <code>${a.toLowerCase()}</code>${label ? " as " + esc(label) : ""} — alert + paper entry on their next Flap launch`); } }
        else if (cmd === "/unwatchcreator") { if (isAddr(a)) { removeWatchCreator(a); await tg(`removed creator <code>${a.toLowerCase()}</code>`); } }
        else if (cmd === "/watching") { const l = watchList(), lc = watchCreatorList(); await tg(`👁 Wallets: ${l.length ? "\n" + l.map(([w, v]) => `• <code>${w}</code>${v ? " — " + esc(v) : ""}`).join("\n") : "none"}\n🧑‍💻 Creators: ${lc.length ? "\n" + lc.map(([w, v]) => `• <code>${w}</code>${v ? " — " + esc(v) : ""}`).join("\n") : "none"}`); }
        else if (cmd === "/runners") await tg(runnersText(24, 10)); else if (cmd === "/runners7") await tg(runnersText(24 * 7, 15));
        else if (cmd === "/help" || cmd === "/start") await tg(HELP);
      }
    } catch { await new Promise((r) => setTimeout(r, 5000)); }
  }
}

// open trades count at their current price (analysis rule 2: never closed-only)
const MULT = (k) => `COALESCE(x_${k}, CASE WHEN closed=0 THEN last_price/entry_price END)`;
const LABEL = { combo: "combo", half60: "½@2x+60%", twophase: "2-phase", ladder: "ladder", levels: "levels", volstop: "vol-stop", tp: "2x-out", tsl40: "trail40", tsl60: "trail60", tsl80: "trail80", m1: "$1M-out", m1vol: "$1M-vol", time: "hold" };
const ORDER = ["combo", "half60", "twophase", "ladder", "levels", "volstop", "tp", "tsl40", "tsl60", "tsl80", "m1", "m1vol", "time"];
export function summaryText(hours) {
  const from = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = db.prepare(`SELECT strategy, COUNT(*) n, SUM(closed=0) open, SUM(peak_mult>=2) h2, SUM(peak_mult>=5) h5, AVG(peak_mult) pk, SUM(alerted) al, ${X.map((k) => `AVG(${MULT(k)}) ${k}`).join(", ")}
    FROM paper_trades WHERE entry_ts>=? AND invalid=0 GROUP BY strategy ORDER BY n DESC`).all(from);
  if (!rows.length) return `📋 <b>BSC ${hours}h summary</b> — no paper trades yet`;
  let t = `📋 <b>BSC ${hours}h summary</b> · Flap · avg result per trade by exit (open trades at current price; before ~5–10% costs)\n`;
  for (const r of rows) {
    const best = ORDER.reduce((a, k) => ((r[k] ?? 0) > (r[a] ?? 0) ? k : a), "time");
    t += `\n<b>${kindName(r.strategy)}</b> — ${r.n} trades${r.open ? ` (${r.open} open)` : ""}${r.al < r.n ? ` · ${r.al} alerted` : ""} · 2x ${r.h2} (<b>${((r.h2 / r.n) * 100).toFixed(0)}%</b>) · 5x ${r.h5} · avg peak ${(r.pk || 1).toFixed(2)}x${r.n < 30 ? " · n&lt;30" : ""}\n` +
      ORDER.map((k) => `${LABEL[k]} ${k === best ? "<b>" + pc(r[k]) + "</b>" : pc(r[k])}`).join(" · ") + "\n";
  }
  return t;
}
export function reportText(hours) {
  const from = Math.floor(Date.now() / 1000) - hours * 3600;
  const l = db.prepare(`SELECT COUNT(*) n, SUM(graduated) g, SUM(peak_mc>=100000) h100, SUM(peak_mc>=1000000) h1m FROM tokens WHERE venue='flap' AND create_ts>=?`).get(from);
  const a = db.prepare(`SELECT COUNT(*) n, COUNT(DISTINCT token) toks, SUM(peak_mult>=2) h2, SUM(alerted) al FROM paper_trades WHERE entry_ts>=? AND invalid=0`).get(from);
  const top = db.prepare(`SELECT name, token, MAX(peak_mult) pk, MIN(entry_mc) mc, GROUP_CONCAT(DISTINCT strategy) st FROM paper_trades WHERE entry_ts>=? AND invalid=0 GROUP BY token ORDER BY pk DESC LIMIT 10`).all(from);
  let t = `📊 <b>BSC report — last ${hours}h</b> (Flap)\nLaunches seen ${l.n || 0} · graduated ${l.g || 0} · reached $100K ${l.h100 || 0} · $1M ${l.h1m || 0}\nPaper trades ${a.n || 0} on ${a.toks || 0} tokens (${a.al || 0} alerted) · hit 2x ${a.h2 || 0}${a.n ? ` (${((a.h2 / a.n) * 100).toFixed(0)}%)` : ""}\n`;
  if (top.length) t += `\n<b>Top 10 by peak</b>\n` + top.map((r) => `${(r.pk || 1).toFixed(1)}x <b>${esc((r.name || r.token.slice(0, 8)).slice(0, 16))}</b> · entry MC $${fmt(r.mc)} · ${r.st}`).join("\n");
  return t;
}
const toCsv = (rows) => { const cols = Object.keys(rows[0]); const v = (x) => (x == null ? "" : /[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x)); return [cols.join(","), ...rows.map((r) => cols.map((c) => v(r[c])).join(","))].join("\n"); };
export async function sendCsv() {
  const day = new Date().toISOString().slice(0, 10), files = [], counts = [];
  const sets = {
    paper_trades: `SELECT p.*, datetime(p.entry_ts,'unixepoch') entry_utc, datetime(p.exit_ts,'unixepoch') exit_utc, t.creator, t.graduated FROM paper_trades p LEFT JOIN tokens t ON t.token=p.token ORDER BY p.id`,
    token_life: `SELECT l.*, t.name, t.symbol, t.creator, datetime(t.create_ts,'unixepoch') launch_utc, t.bundle_pct, t.bundle_usd, t.dev_buy_usd, t.snipers, t.tax_bps, t.quote_sym FROM token_life l LEFT JOIN tokens t ON t.token=l.token ORDER BY l.token, l.cp`,
    wallet_buys: `SELECT w.*, datetime(w.ts,'unixepoch') buy_utc, t.name FROM wallet_buys w LEFT JOIN tokens t ON t.token=w.token ORDER BY w.ts`,
    big_buys: `SELECT b.*, datetime(b.ts,'unixepoch') buy_utc FROM big_buys b ORDER BY b.ts`,
    tokens: `SELECT *, datetime(create_ts,'unixepoch') launch_utc FROM tokens WHERE create_ts IS NOT NULL ORDER BY create_ts`,
    feed_health: `SELECT *, datetime(ts,'unixepoch') utc FROM feed_health ORDER BY ts`,
  };
  for (const [name, sql] of Object.entries(sets)) { try { const rows = db.prepare(sql).all(); if (rows.length) { files.push({ name: `bsc_${name}_${day}.csv`, data: toCsv(rows) }); counts.push(`${rows.length} ${name.replace("_", " ")}`); } } catch (e) { console.error("[csv]", name, e.message); } }
  if (!files.length) return tg("No data yet.");
  const buf = zip(files);
  await tgDocument(buf, `bsc_export_${day}.zip`, `${counts.join(" · ")} · ${(buf.length / 1048576).toFixed(1)} MB zipped`);
}
