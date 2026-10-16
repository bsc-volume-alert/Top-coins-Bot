// Telegram command polling: /report, /csv, /status. Long-polls getUpdates; only answers the configured chat.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { tg } from "./telegram.js";
import { runnersText } from "./runners.js";
import { zipFiles } from "./zip.js";
import { mkdtempSync, openSync, writeSync, closeSync, rmSync, readFileSync, openAsBlob } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkText } from "./check.js";
import { memStats as memMom } from "./momentum.js";
import { memStats as memLife } from "./lifecycle.js";
import { memStats as memHold } from "./holders.js";
import { memStats as memSig } from "./signals.js";
import { memStats as memLive } from "./launch-monitor.js";
import { memStats as memPs } from "./pumpswap.js";
import { memStats as memDex } from "./dex.js";
import { memStats as memFees } from "./fees.js";
import { memStats as memCopy } from "./copytrade.js";
import { memStats as memWal } from "./wallets.js";
import { memStats as memTiers } from "./momtiers.js";
import { memStats as memRe } from "./momre.js";
import { memStats as memAfter } from "./aftercare.js";
import { leaderboardText, walletText, addWatch, removeWatch, watchList, creatorsText, creatorText, addWatchCreator, removeWatchCreator, watchCreatorList } from "./wallets.js";
const TOKEN = () => process.env.TG_BOT_TOKEN, CHAT = () => String(process.env.TG_CHAT_ID);
let offset = 0, deps = {};
export function startCommands(d) { deps = d; poll(); }
async function poll() {
  for (;;) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/getUpdates?timeout=25&offset=${offset}&allowed_updates=["message"]`, { signal: AbortSignal.timeout(35000) });
      const j = await r.json();
      const batch = j.result || [];
      if (batch.length) { // v0.18.16: confirm receipt BEFORE running anything, so a crash mid-command can never replay the same command in a loop
        offset = batch[batch.length - 1].update_id + 1;
        try { await fetch(`https://api.telegram.org/bot${TOKEN()}/getUpdates?timeout=0&limit=1&offset=${offset}`, { signal: AbortSignal.timeout(10000) }); } catch {}
      }
      for (const u of batch) {
        const m = u.message; if (!m?.text || String(m.chat?.id) !== CHAT()) continue;
        const cmd = m.text.trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
        if (cmd === "/report") await tg(reportText(24));
        else if (cmd === "/report7") await tg(reportText(24 * 7));
        else if (cmd === "/csv") await sendCsv(false);
        else if (cmd === "/csvfull") await sendCsv(true);
        else if (cmd === "/status") await tg(deps.status ? deps.status() : "n/a");
        else if (cmd === "/mem") { // v0.18.18: what is in memory, so growth can be seen instead of guessed
          const mu = process.memoryUsage(), hs = (await import('node:v8')).getHeapStatistics(), f = (o) => Object.entries(o).map(([k, v]) => `${k} ${typeof v === "number" ? v.toLocaleString("en-GB") : v}`).join(" · ");
          const parts = { momentum: memMom, lifecycle: memLife, holders: memHold, signals: memSig, live: memLive, pumpswap: memPs, dex: memDex, fees: memFees, copy: memCopy, wallets: memWal, tiers: memTiers, reentry: memRe, aftercare: memAfter };
          let t = `🧠 <b>Memory</b> rss ${Math.round(mu.rss / 1048576)} MB · heap ${Math.round(mu.heapUsed / 1048576)}/${Math.round(mu.heapTotal / 1048576)} MB · external ${Math.round(mu.external / 1048576)} MB · arrays ${Math.round(mu.arrayBuffers / 1048576)} MB · heap limit ${Math.round(hs.heap_size_limit / 1048576)} MB\n`;
          for (const [k, fn] of Object.entries(parts)) { try { t += `<b>${k}</b>: ${f(fn())}\n`; } catch (e) { t += `<b>${k}</b>: error ${esc(e.message)}\n`; } }
          await tg(t);
        }
        else if (cmd === "/summary") await tg(deps.summary ? deps.summary() : "n/a");
        else if (cmd === "/wallets") await tg(leaderboardText(7, 10));
        else if (cmd === "/wallets30") await tg(leaderboardText(30, 10));
        else if (cmd === "/wallet") { const a = m.text.trim().split(/\s+/)[1]; await tg(a ? walletText(a) : "Usage: /wallet <address>"); }
        else if (cmd === "/watch") { const [, a, ...rest] = m.text.trim().split(/\s+/); if (!a || a.length < 32) await tg("Usage: /watch <address> [label]"); else { addWatch(a, rest.join(" ") || null); await tg(`👁 watching <code>${a}</code>${rest.length ? " as " + rest.join(" ") : ""} — copy alerts + paper trades on its buys`); } }
        else if (cmd === "/unwatch") { const a = m.text.trim().split(/\s+/)[1]; if (a) { removeWatch(a); await tg(`removed <code>${a}</code>`); } }
        else if (cmd === "/check") { const a = m.text.trim().split(/\s+/)[1]; await tg(a && a.length >= 32 ? await checkText(a) : "Usage: /check <mint>"); }
        else if (cmd === "/prepump" || cmd === "/prepump30") { const d = cmd === "/prepump30" ? 30 : 7; const rows = q.prepumpTop.all(Math.floor(Date.now() / 1000) - d * 86400, 2, 15); await tg(rows.length ? `🕵️ <b>Pre-pump wallets — ${d}d</b> (bought in the 30 min before a volume trigger, 2+ coins)\n` + rows.map((r) => `• <code>${r.wallet}</code> ${r.n} coins · 2x on ${r.hit2} · 1.5x on ${r.hit15} · avg lead ${Math.round(r.lead / 60)}m · ${r.sol.toFixed(1)} SOL`).join("\n") + "\n/wallet &lt;addr&gt; for detail · /watch to copy" : "No pre-pump wallet data yet (needs volume triggers since v0.18.2)."); }
        else if (cmd === "/bigrunners") { // v0.18.9: momentum trades that went 3x+ with how the volume behaved afterwards
          const rows = db.prepare(`SELECT p.name, p.mint, datetime(p.entry_ts,'unixepoch') t, p.entry_mc, p.peak_mult, p.after_peak_mult, p.core, p.strategy FROM paper_trades p WHERE p.strategy IN ('momentum','momre','momdip') AND COALESCE(p.invalid,0)=0 AND MAX(COALESCE(p.peak_mult,1),COALESCE(p.after_peak_mult,1))>=3 AND p.entry_ts>=? ORDER BY MAX(COALESCE(p.peak_mult,1),COALESCE(p.after_peak_mult,1)) DESC LIMIT 15`).all(Math.floor(Date.now() / 1000) - 7 * 86400);
          const life = db.prepare(`SELECT cp, vol5m_usd, buys5m, sells5m, mc FROM token_life WHERE mint=? AND cp IN (300,900,1800,3600) ORDER BY cp`);
          const fm = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "K" : String(Math.round(n)));
          await tg(rows.length ? `🚀 <b>Big runners (3x+) — 7d</b>\n` + rows.map((r) => `• <b>${r.name}</b> ${r.t.slice(5, 16)} in $${fm(r.entry_mc || 0)} · peak <b>${Math.max(r.peak_mult || 1, r.after_peak_mult || 1).toFixed(1)}x</b>${r.core ? " ⭐" : ""} ${r.strategy !== "momentum" ? r.strategy : ""}\n   ` + life.all(r.mint).map((l) => `+${l.cp / 60}m $${fm(l.vol5m_usd || 0)}/5m b:s ${l.sells5m ? (l.buys5m / l.sells5m).toFixed(1) : "—"} MC $${fm(l.mc || 0)}`).join(" · ")).join("\n") : "No 3x+ momentum runners in the last 7 days.");
        }
        else if (cmd === "/runners") await tg(runnersText(24, 10));
        else if (cmd === "/runners7") await tg(runnersText(24 * 7, 15));
        else if (cmd === "/creators") await tg(creatorsText(7, 10));
        else if (cmd === "/creators30") await tg(creatorsText(30, 10));
        else if (cmd === "/creator") { const a = m.text.trim().split(/\s+/)[1]; await tg(a ? creatorText(a) : "Usage: /creator <address>"); }
        else if (cmd === "/watchcreator") { const [, a, ...rest] = m.text.trim().split(/\s+/); if (!a || a.length < 32) await tg("Usage: /watchcreator <address> [label]"); else { addWatchCreator(a, rest.join(" ") || null); await tg(`👁 watching creator <code>${a}</code>${rest.length ? " as " + rest.join(" ") : ""} — alert + paper entry on their next launch`); } }
        else if (cmd === "/unwatchcreator") { const a = m.text.trim().split(/\s+/)[1]; if (a) { removeWatchCreator(a); await tg(`removed creator <code>${a}</code>`); } }
        else if (cmd === "/watching") { const l = watchList(), lc = watchCreatorList(); await tg((l.length ? "👁 Wallets:\n" + l.map(([w, v]) => `• <code>${w}</code>${v.label ? " — " + v.label : ""}`).join("\n") : "👁 Wallets: none") + "\n" + (lc.length ? "🧑‍💻 Creators:\n" + lc.map(([w, v]) => `• <code>${w}</code>${v.label ? " — " + v.label : ""}`).join("\n") : "🧑‍💻 Creators: none") + "\n/watch · /watchcreator"); }
        else if (cmd === "/help") await tg("Commands: /report · /report7 · /summary · /csv · /csvfull (adds token_life + wallet_buys) · /status · /mem · /check &lt;mint&gt; · /prepump · /prepump30 · /bigrunners (3x+ momentum, with volume after entry) · /wallets (top 10, 7d) · /wallets30 · /wallet <addr> · /watch <addr> [label] · /unwatch · /runners · /runners7 · /creators · /creators30 · /creator <addr> · /watchcreator <addr> [label] · /unwatchcreator · /watching");
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
  creator_claims: `SELECT c.creator, c.mint, t.name, c.ambiguous, datetime(c.ts,'unixepoch') claim_utc, c.sol, c.venue, c.sig FROM creator_claims c LEFT JOIN tokens t ON t.mint=c.mint ORDER BY c.ts`,
  pump_buyers: `SELECT b.trade_id, b.mint, p.name, b.wallet, datetime(b.ts,'unixepoch') buy_utc, b.sol, b.mc, b.lead_s, b.venue, p.peak_mult, p.entry_mc FROM pump_buyers b LEFT JOIN paper_trades p ON p.id=b.trade_id ORDER BY b.trade_id, b.lead_s DESC`,
  tokens: `SELECT mint, name, symbol, creator, datetime(create_ts,'unixepoch') launch_utc, bundle_pct, bundle_sol, bundle_wallets, handoffs, tier, factory, has_socials, outside_buyers, outside_sol_in, cluster_sol_in, cluster_sol_out, peak_mc_usd, graduated, dev_buy_sol, creator_age_s, creator_funded_sol, creator_fee_sol, fee_claims, fee_claimed_sol, first_claim_ts FROM tokens WHERE finalized=1 ORDER BY create_ts`,
};
const CSV_FULL_ONLY = new Set(["token_life", "wallet_buys"]); // v0.18.16: the two big tables; only in /csvfull
const escv = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
/** v0.18.16: stream a query to a CSV file row by row (never holds the table in memory). Returns row count. */
function queryToCsvFile(sql, path) {
  const fd = openSync(path, "w"); let n = 0, cols = null, buf = [];
  const flush = () => { if (buf.length) { writeSync(fd, buf.join("\n") + "\n"); buf = []; } };
  try {
    for (const r of db.prepare(sql).iterate()) {
      if (!cols) { cols = Object.keys(r); buf.push(cols.join(",")); }
      buf.push(cols.map((c) => escv(r[c])).join(",")); n++;
      if (buf.length >= 2000) flush();
    }
    flush();
  } finally { closeSync(fd); }
  return n;
}
let csvBusy = false;
async function sendCsv(full) { // v0.15.2: one zip (large CSVs crash Telegram's preview on iPad). v0.18.16: built on disk, streamed, not in memory
  if (csvBusy) return tg("Export already running — one moment.");
  csvBusy = true;
  const day = new Date().toISOString().slice(0, 10), dir = mkdtempSync(join(tmpdir(), "tracker-csv-")), files = [], counts = [];
  try {
    const tables = { paper_trades: PAPER_SQL, ...CSV_EXTRA };
    for (const [name, sql] of Object.entries(tables)) {
      if (!full && CSV_FULL_ONLY.has(name)) continue;
      const path = join(dir, `${name}_${day}.csv`);
      try { const n = queryToCsvFile(sql, path); if (n) { files.push({ name: `${name}_${day}.csv`, path }); counts.push(`${n} ${name.replace("_", " ")}`); } } catch (e) { console.error("[csv]", name, e.message); }
      await new Promise((r) => setImmediate(r)); // let the feed breathe between tables
    }
    if (!files.length) return tg("No data yet.");
    const zipPath = join(dir, `tracker_export_${day}.zip`), size = await zipFiles(files, zipPath);
    const blob = typeof openAsBlob === "function" ? await openAsBlob(zipPath, { type: "application/zip" }) : new Blob([readFileSync(zipPath)], { type: "application/zip" });
    const fd = new FormData();
    fd.append("chat_id", CHAT());
    fd.append("document", blob, `tracker_export_${day}.zip`);
    fd.append("caption", `${counts.join(" · ")} · ${(size / 1048576).toFixed(1)} MB zipped${full ? "" : " · /csvfull for token_life + wallet_buys"}`);
    const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/sendDocument`, { method: "POST", body: fd, signal: AbortSignal.timeout(120000) });
    if (!r.ok) { const t = await r.text(); console.error("[csv]", t); await tg(`Export failed to send: ${esc(t.slice(0, 200))}`); }
  } catch (e) { console.error("[csv]", e.message); try { await tg(`Export failed: ${esc(e.message)}`); } catch {} }
  finally { csvBusy = false; try { rmSync(dir, { recursive: true, force: true }); } catch {} }
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// v0.18.16: memory guard — pm2 restarts the bot at 600 MB; warn well before that so growth is seen before it bites
export const memMb = () => Math.round(process.memoryUsage().rss / 1048576);
let memWarnAt = 0;
setInterval(() => { const mb = memMb(); if (mb > 450 && Date.now() - memWarnAt > 600_000) { memWarnAt = Date.now(); console.error(`[mem] rss ${mb} MB — pm2 restarts at 600`); tg(`⚠️ memory ${mb} MB (restart at 600)`).catch(() => {}); } }, 20_000);
const PAPER_SQL = `SELECT p.id, p.strategy, p.name, p.symbol, p.mint, datetime(p.entry_ts,'unixepoch') entry_utc, p.entry_age_s, p.entry_mc, p.peak_mult, p.x_tp, p.x_tsl40, p.x_tsl60, p.x_cluster, p.x_grad, p.x_time, p.x_tsl80, p.x_half60, p.x_twophase, p.x_ladder, p.x_levels, p.x_m1, p.x_m1vol, p.next_level, p.wave1_peak_mc, p.cluster_held_pct, p.trigger_kind, p.x_volstop, p.vol_at_entry, p.after_peak_mult, p.after_peak_mc, p.handover, p.creator_prior, p.creator_best_peak, p.dev_buy_sol, p.snipers, p.hour_utc, p.parent_id, p.bs_ratio_entry, p.buyers_entry, p.vol5m_usd, p.vol1m_usd, p.age_s, p.reentry_n, p.exit_reason, p.closed, p.tier, p.factory, p.has_socials, p.bundle_pct, p.bundle_sol, p.handoffs, p.inflow_sol, p.inflow_wallets, p.outside_share, p.buys, p.sells, p.mc_5m, p.mc_15m, p.buyers_5m, p.alerted, p.invalid, p.buys_entry, p.sells_entry, p.proven_entry, p.q_score, p.q_wallets, p.q_per10k, p.q_top3, p.q_roundtrip, p.q_retail, p.q_custom, p.q_size_cv, p.q_new_pct, p.q_px_per10k, p.x_combo, p.x_tp15, p.x_tsl25, p.x_t15s25, p.x_t15s60, p.x_t2s25, p.x_t2s60, p.x_t15s40, p.x_t2s40, p.x_flow, p.x_flow4, p.x_flow4ff, p.x_split, p.split_branch, p.x_dead, p.x_p3d, p.x_manual, p.manual_pct, p.conf_ok, p.conf_ratio, p.x_h2t40, p.v2m_usd, p.dd_pre15, p.path, p.venue, p.fee_accrued_entry, p.fee_claims_entry, p.fee_claimed_entry, p.core, p.core_tight, p.core_v40, p.bs_clean_entry, p.bot_share_entry, p.dex_paid, p.dex_paid_types, p.dex_paid_lead_s, p.snipers_n, p.snipers_held_pct, p.fresh_share, p.fresh_n, p.proven_vol_share, p.proven_wallets_5m, p.t_hit15_s, p.top10_entry, p.largest_entry, p.holders_entry, p.dev_hold_entry, p.tight, p.churn_entry, p.cluster_out_entry, t.outside_buyers, t.outside_sol_in, t.cluster_sol_in, t.cluster_sol_out, t.graduated, t.creator FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint ORDER BY p.id`;
