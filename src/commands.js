// Telegram command polling: /report, /csv, /status. Long-polls getUpdates; only answers the configured chat.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { tg } from "./telegram.js";
import { runnersText } from "./runners.js";
import { zip } from "./zip.js";
import { leaderboardText, walletText, addWatch, removeWatch, watchList, creatorsText, creatorText, addWatchCreator, removeWatchCreator, watchCreatorList } from "./wallets.js";
const TOKEN = () => process.env.TG_BOT_TOKEN, CHAT = () => String(process.env.TG_CHAT_ID);
let offset = 0, deps = {};
export function startCommands(d) { deps = d; poll(); }
async function poll() {
  for (;;) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/getUpdates?timeout=25&offset=${offset}&allowed_updates=["message"]`, { signal: AbortSignal.timeout(35000) });
      const j = await r.json();
      for (const u of j.result || []) {
        offset = u.update_id + 1;
        const m = u.message; if (!m?.text || String(m.chat?.id) !== CHAT()) continue;
        const cmd = m.text.trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
        if (cmd === "/report") await tg(reportText(24));
        else if (cmd === "/report7") await tg(reportText(24 * 7));
        else if (cmd === "/csv") await sendCsv();
        else if (cmd === "/status") await tg(deps.status ? deps.status() : "n/a");
        else if (cmd === "/summary") await tg(deps.summary ? deps.summary() : "n/a");
        else if (cmd === "/wallets") await tg(leaderboardText(7, 10));
        else if (cmd === "/wallets30") await tg(leaderboardText(30, 10));
        else if (cmd === "/wallet") { const a = m.text.trim().split(/\s+/)[1]; await tg(a ? walletText(a) : "Usage: /wallet <address>"); }
        else if (cmd === "/watch") { const [, a, ...rest] = m.text.trim().split(/\s+/); if (!a || a.length < 32) await tg("Usage: /watch <address> [label]"); else { addWatch(a, rest.join(" ") || null); await tg(`👁 watching <code>${a}</code>${rest.length ? " as " + rest.join(" ") : ""} — copy alerts + paper trades on its buys`); } }
        else if (cmd === "/unwatch") { const a = m.text.trim().split(/\s+/)[1]; if (a) { removeWatch(a); await tg(`removed <code>${a}</code>`); } }
        else if (cmd === "/runners") await tg(runnersText(24, 10));
        else if (cmd === "/runners7") await tg(runnersText(24 * 7, 15));
        else if (cmd === "/creators") await tg(creatorsText(7, 10));
        else if (cmd === "/creators30") await tg(creatorsText(30, 10));
        else if (cmd === "/creator") { const a = m.text.trim().split(/\s+/)[1]; await tg(a ? creatorText(a) : "Usage: /creator <address>"); }
        else if (cmd === "/watchcreator") { const [, a, ...rest] = m.text.trim().split(/\s+/); if (!a || a.length < 32) await tg("Usage: /watchcreator <address> [label]"); else { addWatchCreator(a, rest.join(" ") || null); await tg(`👁 watching creator <code>${a}</code>${rest.length ? " as " + rest.join(" ") : ""} — alert + paper entry on their next launch`); } }
        else if (cmd === "/unwatchcreator") { const a = m.text.trim().split(/\s+/)[1]; if (a) { removeWatchCreator(a); await tg(`removed creator <code>${a}</code>`); } }
        else if (cmd === "/watching") { const l = watchList(), lc = watchCreatorList(); await tg((l.length ? "👁 Wallets:\n" + l.map(([w, v]) => `• <code>${w}</code>${v.label ? " — " + v.label : ""}`).join("\n") : "👁 Wallets: none") + "\n" + (lc.length ? "🧑‍💻 Creators:\n" + lc.map(([w, v]) => `• <code>${w}</code>${v.label ? " — " + v.label : ""}`).join("\n") : "🧑‍💻 Creators: none") + "\n/watch · /watchcreator"); }
        else if (cmd === "/help") await tg("Commands: /report · /report7 · /summary · /csv · /status · /wallets (top 10, 7d) · /wallets30 · /wallet <addr> · /watch <addr> [label] · /unwatch · /runners · /runners7 · /creators · /creators30 · /creator <addr> · /watchcreator <addr> [label] · /unwatchcreator · /watching");
      }
    } catch (e) { await new Promise((r) => setTimeout(r, 5000)); }
  }
}
const m = (v) => (v == null ? "—" : `${((v - 1) * 100).toFixed(0)}%`);
export function reportText(hours) {
  const to = Math.floor(Date.now() / 1000), from = to - hours * 3600;
  const a = q.digestAgg.get(from, to);
  const byTier = db.prepare(`SELECT tier, COUNT(*) n, SUM(CASE WHEN peak_mult>=2 THEN 1 ELSE 0 END) h, AVG(x_time) xt, AVG(x_tsl40) x40 FROM paper_trades WHERE entry_ts>=? AND COALESCE(invalid,0)=0 GROUP BY tier`).all(from);
  const tp = db.prepare(`SELECT AVG(x_tp) xtp, SUM(CASE WHEN x_tp IS NOT NULL THEN 1 ELSE 0 END) n FROM paper_trades WHERE entry_ts>=? AND COALESCE(invalid,0)=0`).get(from);
  const launches = q.countSince.get(from), prepared = q.countTierSince.get(1, from);
  if (!a.n) return `📊 <b>Report ${hours}h</b> · launches ${launches} · prepared ${prepared} · no paper trades yet`;
  const pc = (x, n) => (n ? `${((x / n) * 100).toFixed(0)}%` : "—");
  return `📊 <b>Report — last ${hours}h</b>\n` +
    `Launches ${launches} · prepared ${prepared} · paper trades ${a.n}\n` +
    `Hit 2x: <b>${a.hit2x}</b> (${pc(a.hit2x, a.n)}) · TP2x taken: ${tp.n}\n` +
    `Avg by exit: TSL40 ${m(a.x40)} · TSL60 ${m(a.x60)} · hold2h ${m(a.xt)}\n` +
    `No socials: ${a.nosoc} trades → ${a.nosoc2x} hit 2x (${pc(a.nosoc2x, a.nosoc)}) · factory: ${a.fac} → ${a.fac2x} (${pc(a.fac2x, a.fac)})\n` +
    byTier.map((r) => `tier${r.tier}: ${r.n} trades, ${r.h} hit 2x (${pc(r.h, r.n)}), TSL40 ${m(r.x40)}, hold ${m(r.xt)}`).join("\n");
}
const CSV_EXTRA = {
  token_life: `SELECT l.mint, t.name, t.symbol, t.creator, datetime(t.create_ts,'unixepoch') launch_utc, t.bundle_pct, t.bundle_sol, t.tier, t.factory, t.has_socials, l.cp, l.mc, l.vol5m_usd, l.buys5m, l.sells5m, l.buyers5m, l.buyers_total, l.graduated, l.top10_pct, l.holders, l.alive FROM token_life l LEFT JOIN tokens t ON t.mint=l.mint ORDER BY l.mint, l.cp`,
  wallet_buys: `SELECT w.wallet, w.mint, t.name, datetime(w.ts,'unixepoch') buy_utc, w.age_s, w.sol, w.entry_mc, w.is_cluster, w.peak_30m, w.peak_24h, w.resolved FROM wallet_buys w LEFT JOIN tokens t ON t.mint=w.mint ORDER BY w.ts`,
  big_buys: `SELECT b.mint, t.name, b.wallet, datetime(b.ts,'unixepoch') buy_utc, b.age_s, b.sol, b.mc, b.balance_sol, b.venue FROM big_buys b LEFT JOIN tokens t ON t.mint=b.mint ORDER BY b.ts`,
  tokens: `SELECT mint, name, symbol, creator, datetime(create_ts,'unixepoch') launch_utc, bundle_pct, bundle_sol, bundle_wallets, handoffs, tier, factory, has_socials, outside_buyers, outside_sol_in, cluster_sol_in, cluster_sol_out, peak_mc_usd, graduated, dev_buy_sol, creator_age_s, creator_funded_sol FROM tokens WHERE finalized=1 ORDER BY create_ts`,
};
const toCsv = (rows) => {
  const cols = Object.keys(rows[0]);
  const escv = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escv(r[c])).join(","))].join("\n");
};
async function sendCsv() { // v0.15.2: one zip with all five CSVs (large CSVs crash Telegram's preview on iPad)
  const day = new Date().toISOString().slice(0, 10), files = [], counts = [];
  const paper = paperRows(); if (paper.length) { files.push({ name: `paper_trades_${day}.csv`, data: toCsv(paper) }); counts.push(`${paper.length} paper trades`); }
  for (const [name, sql] of Object.entries(CSV_EXTRA)) {
    try { const rows = db.prepare(sql).all(); if (rows.length) { files.push({ name: `${name}_${day}.csv`, data: toCsv(rows) }); counts.push(`${rows.length} ${name.replace("_", " ")}`); } } catch (e) { console.error("[csv]", name, e.message); }
  }
  if (!files.length) return tg("No data yet.");
  const buf = zip(files);
  const fd = new FormData();
  fd.append("chat_id", CHAT());
  fd.append("document", new Blob([buf], { type: "application/zip" }), `tracker_export_${day}.zip`);
  fd.append("caption", `${counts.join(" · ")} · ${(buf.length / 1048576).toFixed(1)} MB zipped`);
  try { const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/sendDocument`, { method: "POST", body: fd }); if (!r.ok) console.error("[csv]", await r.text()); }
  catch (e) { console.error("[csv]", e.message); }
}
function paperRows() {
  return db.prepare(`SELECT p.id, p.strategy, p.name, p.symbol, p.mint, datetime(p.entry_ts,'unixepoch') entry_utc, p.entry_age_s, p.entry_mc, p.peak_mult, p.x_tp, p.x_tsl40, p.x_tsl60, p.x_cluster, p.x_grad, p.x_time, p.x_tsl80, p.x_half60, p.x_twophase, p.x_ladder, p.x_levels, p.x_m1, p.x_m1vol, p.next_level, p.wave1_peak_mc, p.cluster_held_pct, p.trigger_kind, p.x_volstop, p.vol_at_entry, p.after_peak_mult, p.after_peak_mc, p.handover, p.creator_prior, p.creator_best_peak, p.dev_buy_sol, p.snipers, p.hour_utc, p.parent_id, p.bs_ratio_entry, p.buyers_entry, p.vol5m_usd, p.vol1m_usd, p.age_s, p.reentry_n, p.exit_reason, p.closed, p.tier, p.factory, p.has_socials, p.bundle_pct, p.bundle_sol, p.handoffs, p.inflow_sol, p.inflow_wallets, p.outside_share, p.buys, p.sells, p.mc_5m, p.mc_15m, p.buyers_5m, p.alerted, p.invalid, t.outside_buyers, t.outside_sol_in, t.cluster_sol_in, t.cluster_sol_out, t.graduated, t.creator FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint ORDER BY p.id`).all();
}
