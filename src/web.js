// v0.18.23: live dashboard. A tiny HTTP server inside the tracker (no extra process) serving one page and one JSON endpoint.
// Read-only; protected by WEB_KEY (.env). Disabled when WEB_KEY is unset. http://<droplet-ip>:<WEB_PORT>/?key=<WEB_KEY>
import { createServer } from "node:http";
import { CFG } from "./config.js";
import { db } from "./db.js";
import { openPositions, manualSell, p5 as p5stats } from "./momentum.js";
import { openOfKind } from "./copytrade.js";
import { solUsdCached } from "./price.js";
import { memMb } from "./commands.js";
import { readFileSync } from "node:fs";
const VERSION = (() => { try { return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version; } catch { return "?"; } })();

const KEY = () => process.env.WEB_KEY || "", PORT = () => Number(process.env.WEB_PORT || 8787);
// Project 2's exit (flow4) exists from v0.18.10 (15 Oct 12:52 UTC); Project 3's (split) from v0.18.22 (16 Oct 16:00 UTC). Earlier rows
// were filled by the sweeper, not scored live, so each project's book starts when its exit started recording.
const P2_FROM = Date.UTC(2026, 9, 15, 12, 52) / 1000, P3_FROM = Date.UTC(2026, 9, 16, 16, 0) / 1000;
// v0.18.33 Project 1 filtered: live book starts fresh at this deploy; the 15–16 Oct back-test is shown separately as fitted.
const P1F_FROM = Date.UTC(2026, 9, 16, 21, 10) / 1000, P1F_MC = 47_000;
const p1Pass = (r) => String(r.venue || "").startsWith("pumpswap/") || (r.entry_mc > 0 && r.entry_mc < P1F_MC);
// v0.18.34 Project 2 filtered: small crowd (≤600 distinct wallets in the 5-min window) OR Project 1's filter. Fresh book from this deploy.
const P2F_FROM = Date.UTC(2026, 9, 16, 21, 25) / 1000, P2F_WALLETS = 600;
const p2Pass = (r) => p1Pass(r) || (r.q_wallets != null && r.q_wallets <= P2F_WALLETS);
const qCore = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, entry_price, peak_mult, after_peak_mult, closed, exit_reason, core_v40, x_t15s40, x_flow4, x_split, split_branch, x_flow4ff, vol1m_usd, age_s, venue, q_wallets
  FROM paper_trades WHERE strategy='momentum' AND core=1 AND COALESCE(invalid,0)=0 AND entry_ts>=? ORDER BY entry_ts`);
const qRecent = db.prepare(`SELECT p.id, p.name, p.mint, p.entry_ts, p.entry_mc, p.peak_mult, p.after_peak_mult, p.closed, p.exit_reason, p.core_v40, p.x_t15s40, p.x_flow4, p.x_split, p.split_branch, p.x_p3d, p.conf_ok, p.conf_ratio,
  (SELECT c.x_t15s40 FROM paper_trades c WHERE c.strategy='momconf' AND c.mint=p.mint AND c.entry_ts BETWEEN p.entry_ts AND p.entry_ts+200 LIMIT 1) AS p4x
  FROM paper_trades p WHERE p.strategy='momentum' AND p.core=1 AND COALESCE(p.invalid,0)=0 ORDER BY p.entry_ts DESC LIMIT 25`);
// v0.18.32 Project 4: the confirmation-entry positions (strategy momconf) and the decisions recorded on the core rows
const qP5 = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, closed, exit_reason, x_t15s40, x_h2t40, v2m_usd, peak_mult FROM paper_trades WHERE strategy='mom2m' AND COALESCE(invalid,0)=0 ORDER BY entry_ts`); // v0.18.35
// v0.18.39 sold-coin history: every closed core / P4 / P5 trade with each project's exit and what the coin did after (24 h watch)
const qHist = db.prepare(`SELECT id, strategy, name, mint, entry_ts, exit_ts, entry_mc, venue, q_wallets, exit_reason, peak_mult, after_peak_mult, after_peak_mc, after_last_mult, after_last_mc, after_last_ts,
  x_t15s40, x_flow4, x_split, split_branch, x_h2t40 FROM paper_trades WHERE closed=1 AND COALESCE(invalid,0)=0 AND entry_ts > ? AND ((strategy='momentum' AND core=1) OR strategy IN ('momconf','mom2m')) ORDER BY entry_ts DESC`);
export function history(days = 3) {
  const now = Math.floor(Date.now() / 1000);
  const rows = qHist.all(now - days * 86400).map((r) => ({ ...r, proj: r.strategy === "momconf" ? "P4" : r.strategy === "mom2m" ? "P5" : "core", p1in: p1Pass(r) && r.entry_ts >= P1F_FROM, p2in: p2Pass(r) && r.entry_ts >= P2F_FROM,
    after: Math.max(r.after_peak_mult || 0, r.peak_mult || 0) || null }));
  return { now, days, rows };
}
const qConf = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, closed, exit_reason, x_t15s40, x_flow4, x_split, x_p3d, peak_mult, after_peak_mult FROM paper_trades WHERE strategy='momconf' AND COALESCE(invalid,0)=0 ORDER BY entry_ts`);
const qConfDecisions = db.prepare(`SELECT SUM(conf_ok=1) taken, SUM(conf_ok=0) skipped FROM paper_trades WHERE strategy='momentum' AND core=1 AND conf_ok IS NOT NULL`);

function book(rows, col, from, size, cost) {
  const t = rows.filter((r) => r.entry_ts >= from && r[col] != null);
  const x = t.map((r) => r[col]);
  const w = x.filter((v) => v > 1).length;
  let cum = 0; const curve = t.map((r) => { cum += size * (r[col] * (1 - cost) - 1); return [r.entry_ts, +cum.toFixed(3)]; });
  const day = Math.floor(Date.now() / 1000) - 86400, t24 = t.filter((r) => r.entry_ts >= day), x24 = t24.map((r) => r[col]);
  const sum = (a) => a.reduce((p, c) => p + c, 0);
  return {
    n: t.length, win: t.length ? w / t.length : null, avg: t.length ? sum(x) / t.length - 1 : null,
    net: +sum(x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), gross: +sum(x.map((v) => size * (v - 1))).toFixed(3),
    n24: t24.length, net24: +sum(x24.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), win24: t24.length ? x24.filter((v) => v > 1).length / t24.length : null,
    big: x.filter((v) => v >= 2).length, cap: x.filter((v) => v >= 4).length, curve, open: rows.filter((r) => r.entry_ts >= from && !r.closed).length,
    days: (() => { const m = new Map(); for (const r of t) { const k = new Date(r.entry_ts * 1000).toISOString().slice(0, 10); const o = m.get(k) || { day: k, n: 0, net: 0, wins: 0 }; o.n++; o.net += size * (r[col] * (1 - cost) - 1); if (r[col] > 1) o.wins++; m.set(k, o); } return [...m.values()].map((o) => ({ ...o, net: +o.net.toFixed(3) })).sort((a, b) => b.day.localeCompare(a.day)); })(),
    since: t.length ? t[0].entry_ts : null, durationH: t.length ? (Math.floor(Date.now() / 1000) - t[0].entry_ts) / 3600 : 0,
    wins: w, losses: t.length - w, best: t.length ? +Math.max(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0, worst: t.length ? +Math.min(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0,
  };
}
const qAll = db.prepare(`SELECT p.id, p.name, p.symbol, p.mint, p.entry_ts, p.entry_mc, p.entry_price, p.age_s, p.venue, p.trigger_kind, p.core, p.core_v40, p.vol5m_usd, p.vol1m_usd, p.buyers_entry, p.q_wallets, p.q_size_cv, p.q_top3, p.bs_ratio_entry, p.bs_clean_entry, p.bot_share_entry,
  p.bundle_pct, p.bundle_sol, p.handoffs, p.cluster_held_pct, p.cluster_out_entry, p.churn_entry, p.snipers_n, p.snipers_held_pct, p.fresh_share, p.fresh_n, p.proven_vol_share, p.proven_wallets_5m, p.dex_paid, p.dex_paid_types, p.dex_paid_lead_s,
  p.holders_entry, p.top10_entry, p.largest_entry, p.dev_hold_entry, p.fee_accrued_entry, p.fee_claims_entry, p.fee_claimed_entry, p.peak_mult, p.after_peak_mult, p.closed, p.exit_reason, p.x_t15s40, p.x_flow4, p.x_flow4ff, p.x_split, p.split_branch, p.x_dead, p.x_p3d, p.x_manual, p.manual_pct, p.dd_pre15, p.t_hit15_s, p.path,
  t.creator, t.outside_buyers, t.dev_buy_sol, t.creator_funded_sol, t.creator_age_s, t.has_socials
  FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.strategy='momentum' AND COALESCE(p.invalid,0)=0 AND p.entry_ts>=? ORDER BY p.entry_ts DESC`);
export function tradesDump(days = 7) {
  const rows = qAll.all(Math.floor(Date.now() / 1000) - days * 86400);
  for (const r of rows) {
    r.peak = Math.max(r.peak_mult || 1, r.after_peak_mult || 1);
    let P = {}; try { P = r.path ? JSON.parse(r.path) : {}; } catch {}
    const m = (k) => { const v = P[k]; return v == null ? null : typeof v === "object" ? v.m : v; }, vv = (k) => (P[k] && typeof P[k] === "object" ? P[k].v : null), cs = (k) => (P[k] && typeof P[k] === "object" ? P[k].cs : null);
    r.m30 = m("30"); r.m120 = m("120"); r.m300 = m("300"); r.m600 = m("600"); r.v120 = vv("120"); r.v300 = vv("300"); r.cs120 = cs("120"); delete r.path;
  }
  const core = rows.filter((r) => r.core === 1);
  const bucket = (name, fn, labels) => { const out = []; for (const lab of labels) { const t = core.filter((r) => fn(r) === lab); if (!t.length) { out.push({ bucket: lab, n: 0 }); continue; } const g = (col) => { const v = t.map((r) => r[col]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length - 1 : null; }; out.push({ bucket: lab, n: t.length, r15: t.filter((r) => r.peak >= 1.5).length / t.length, r2: t.filter((r) => r.peak >= 2).length / t.length, r3: t.filter((r) => r.peak >= 3).length / t.length, p1: g("x_t15s40"), p2: g("x_flow4"), p3: g("x_split"), n3: t.filter((r) => r.x_split != null).length }); } return { name, rows: out }; };
  const brackets = [
    bucket("Entry market cap", (r) => r.entry_mc < 50e3 ? "< $50K" : r.entry_mc < 75e3 ? "$50–75K" : "$75–100K", ["< $50K", "$50–75K", "$75–100K"]),
    bucket("Volume in the last 1 minute at entry", (r) => r.vol1m_usd == null ? "?" : r.vol1m_usd < 20e3 ? "< $20K" : r.vol1m_usd < 40e3 ? "$20–40K" : r.vol1m_usd < 60e3 ? "$40–60K" : "$60K+", ["< $20K", "$20–40K", "$40–60K", "$60K+"]),
    bucket("Age at entry", (r) => r.age_s == null ? "?" : r.age_s < 180 ? "< 3 min" : r.age_s < 300 ? "3–5 min" : r.age_s < 600 ? "5–10 min" : r.age_s < 1800 ? "10–30 min" : "30 min+", ["< 3 min", "3–5 min", "5–10 min", "10–30 min", "30 min+"]),
    bucket("Price 2 minutes after entry", (r) => r.m120 == null ? "no mark" : r.m120 < 0.9 ? "below 0.90×" : r.m120 < 1.2 ? "0.90–1.20×" : "1.20× or more", ["below 0.90×", "0.90–1.20×", "1.20× or more", "no mark"]),
    bucket("Bundle at launch", (r) => r.bundle_pct == null ? "unknown" : r.bundle_pct < 20 ? "< 20%" : r.bundle_pct < 40 ? "20–40%" : r.bundle_pct < 60 ? "40–60%" : "60%+", ["< 20%", "20–40%", "40–60%", "60%+", "unknown"]),
    bucket("Top-10 holders at entry", (r) => r.top10_entry == null ? "unknown" : r.top10_entry < 20 ? "< 20%" : r.top10_entry < 30 ? "20–30%" : r.top10_entry < 45 ? "30–45%" : "45%+", ["< 20%", "20–30%", "30–45%", "45%+", "unknown"]),
    bucket("Snipers still holding at entry", (r) => r.snipers_held_pct == null ? "unknown" : r.snipers_held_pct <= 0.5 ? "0%" : r.snipers_held_pct < 10 ? "0–10%" : "10%+", ["0%", "0–10%", "10%+", "unknown"]),
    bucket("Fresh wallets among buyers", (r) => r.fresh_share == null ? "unknown" : r.fresh_share < 0.1 ? "< 10%" : r.fresh_share < 0.3 ? "10–30%" : "30%+", ["< 10%", "10–30%", "30%+", "unknown"]),
    bucket("Dex Paid before entry", (r) => r.dex_paid == null ? "unknown" : r.dex_paid ? "paid" : "not paid", ["paid", "not paid", "unknown"]),
    bucket("Dev claimed fees before entry", (r) => r.fee_claims_entry == null ? "unknown" : r.fee_claims_entry > 0 ? "yes" : "no", ["yes", "no", "unknown"]),
    bucket("Hour of day (UTC)", (r) => { const h = new Date(r.entry_ts * 1000).getUTCHours(); return h < 6 ? "00–05" : h < 12 ? "06–11" : h < 18 ? "12–17" : "18–23"; }, ["00–05", "06–11", "12–17", "18–23"]),
    bucket("Pool quote asset", (r) => (r.venue || "pumpswap").includes("/") ? "non-SOL (stock/other)" : (r.venue || "pumpswap") === "pumpswap" ? "SOL (PumpSwap)" : "other DEX", ["SOL (PumpSwap)", "non-SOL (stock/other)", "other DEX"]),
  ];
  return { now: Math.floor(Date.now() / 1000), days, n: rows.length, nCore: core.length, brackets, rows };
}
export function snapshot(size = 0.25, cost = 0.05) {
  const rows = qCore.all(P2_FROM - 86400 * 2);
  const projects = {
    p1: { name: "Project 1 — filtered", rule: "fresh book from 16 Oct 22:10 · only trades that pass the filters below",
      filters: ["Volume trigger: $100K traded in the last 5 minutes", "Entry market cap under $100K, first entry on the coin, coin at least 60 s old", "<b>AND</b> one of: <b>pool quoted in a stock token</b> (NVDAx, TRUMP, TTWO, GOOGLx…) <b>or</b> <b>market cap under $47K</b> at the trigger", "Sell everything at <b>1.5x</b> · stop at <b>−40%</b> from entry · out after 6 h"],
      ...book(rows.filter(p1Pass), "x_t15s40", P1F_FROM, size, cost) },
    p2: { name: "Project 2 — filtered", rule: "fresh book from 16 Oct 22:25 · only trades that pass the filters below",
      filters: ["Volume trigger: $100K traded in the last 5 minutes", "Entry market cap under $100K, first entry on the coin, coin at least 60 s old", "<b>AND</b> one of: <b>small crowd</b> — no more than <b>600 different wallets</b> traded in that 5-minute window <b>or</b> <b>pool quoted in a stock token</b> <b>or</b> <b>market cap under $47K</b>", "Runner exit: hold while 5m volume stays ≥ <b>$100K</b> and buys ≥ sells · cap <b>4x</b> · stop <b>−40%</b> before 1.5x · 50% trail backstop"],
      ...book(rows.filter(p2Pass), "x_flow4", P2F_FROM, size, cost) },
    p3: { name: "Project 3", rule: "at 2 min: <0.90× sell · ≥1.20× hold (40% trail, cap 4x) · else half at 1.5x, rest rides",
      filters: ["Volume trigger: $100K traded in the last 5 minutes", "Entry market cap under $100K, first entry on the coin, coin at least 60 s old · <b>no extra entry filter</b>", "Before the 2-minute check: stop at <b>−40%</b>", "At <b>2 minutes</b>: below <b>0.90×</b> → sell all · above <b>1.20×</b> → hold with a <b>40% trail</b>, cap <b>4x</b> · in between → sell <b>half at 1.5x</b>, rest rides"], ...book(rows, "x_split", P3_FROM, size, cost) },
  };
  { const bt = rows.filter((r) => r.entry_ts >= P2_FROM && r.entry_ts < P1F_FROM && r.x_t15s40 != null && p1Pass(r)), all = rows.filter((r) => r.entry_ts >= P2_FROM && r.x_t15s40 != null);
    const sum = (a) => +a.reduce((x, r) => x + size * (r.x_t15s40 * (1 - cost) - 1), 0).toFixed(3);
    projects.p1.backtest = { n: bt.length, win: bt.length ? bt.filter((r) => r.x_t15s40 > 1).length / bt.length : null, net: sum(bt) };
    projects.p1.unfiltered = { n: all.length, net: sum(all) }; }
  { const f = rows.filter((r) => r.entry_ts >= P2_FROM && r.x_flow4 != null && p2Pass(r)), bt = f.filter((r) => r.entry_ts < P2F_FROM), all = rows.filter((r) => r.entry_ts >= P2_FROM && r.entry_ts < P2F_FROM && r.x_flow4 != null);
    const sum = (a, col) => +a.reduce((x, r) => x + size * ((r[col] ?? 1) * (1 - cost) - 1), 0).toFixed(3);
    projects.p2.backtest = { n: bt.length, win: bt.length ? bt.filter((r) => r.x_flow4 > 1).length / bt.length : null, net: sum(bt, "x_flow4") };
    projects.p2.unfiltered = { n: all.length, net: sum(all, "x_flow4") };
    const live = f.filter((r) => r.entry_ts >= P2F_FROM && r.x_t15s40 != null);
    projects.p2.vsP1 = { n: live.length, p2: sum(live, "x_flow4"), p1: sum(live, "x_t15s40") }; }
  const crows = qConf.all(), dec = qConfDecisions.get() || {};
  projects.p4 = { name: "Project 4", rule: `confirm: buy ${CFG.MOM_CONF_S}s after the trigger only if price is still above the trigger price · sell at 1.5x · −40% stop`, filters: ["Volume trigger: $100K traded in the last 5 minutes", "Entry market cap under $100K, first entry on the coin, coin at least 60 s old", `<b>Wait ${CFG.MOM_CONF_S} s</b> after the trigger · buy only if the price is <b>above the trigger price</b> (otherwise skip the coin)`, "Sell everything at <b>1.5x</b> · stop at <b>−40%</b> from the buy price"], ...book(crows, "x_t15s40", 0, size, cost), taken: dec.taken || 0, skipped: dec.skipped || 0 };
  { const r5 = qP5.all(), alt = book(r5, "x_t15s40", 0, size, cost);
    projects.p5 = { name: "Project 5 — fast", rule: "buy the moment $100K trades inside 2 minutes · exit: half out at 2x, rest on a 40% trail",
      filters: ["Volume trigger: <b>$100K traded inside any 2 minutes</b>", "Coin at least <b>60 s</b> old · buys ≥ sells in those 2 minutes · market cap <b>under $2M</b> · one trade per coin", "Before 2x: stop at <b>−40%</b> from the buy price", "At <b>2x</b> sell half (initial back) · the other half rides with a <b>40% trailing stop</b>, no cap"],
      ...book(r5, "x_h2t40", 0, size, cost), alt: { n: alt.n, win: alt.win, net: alt.net }, fired: p5stats.fired, young: p5stats.young, sellHeavy: p5stats.sellHeavy,
      openList: openOfKind("mom2m").map(({ mint, p }) => ({ mint, name: p.name, mult: p.lastPx / p.e.entry, half: !!p.e.h2Half, done: p.e.x.h2t40 ?? null, ageS: Math.floor(Date.now() / 1000) - p.entryTs, mc: p.lastMc })) }; }
  const v40 = rows.filter((r) => r.entry_ts >= P3_FROM && r.core_v40 === 1);
  projects.p3.filtered = { n: v40.filter((r) => r.x_split != null).length, net: +v40.filter((r) => r.x_split != null).reduce((a, r) => a + size * (r.x_split * (1 - cost) - 1), 0).toFixed(3), note: "Project 3 with its entry filter (1m vol ≥ $40K, age < 10 min)" };
  for (const k of Object.keys(projects)) if (projects[k].filters) projects[k].filters.push(`<b>Golden rule:</b> sold at once if the coin's 5-minute volume drops below <b>$${Math.round(CFG.LOWVOL_EXIT_USD / 1000)}K</b> (from 16 Oct 22:53)`); // v0.18.37
  const confOpen = new Map(openOfKind("momconf").map(({ mint, p }) => [mint, p]));
  const open = openPositions().map((p) => {
    const r = rows.find((z) => z.id === p.id);
    const cp = confOpen.get(p.mint), c = p.conf;
    const p4 = !c ? "—" : !c.done ? `deciding in ${c.left}s` : !c.ok ? `skipped (${c.ratio != null ? c.ratio.toFixed(2) + "x" : "no price"})` : cp ? (cp.e.x.t15s40 != null ? (cp.e.x.t15s40 >= 1.5 ? "took 1.5x" : `stopped ${cp.e.x.t15s40.toFixed(2)}x`) : `in at ${c.ratio.toFixed(2)}x · now ${(cp.lastPx / cp.e.entry).toFixed(2)}x`) : `bought at ${c.ratio.toFixed(2)}x`;
    // v0.18.38 structured state per project: sold (with exit multiple) / hold / wait / na — drives the colours and the holding vs sold split
    const S = (st, m, t) => ({ st, m: m ?? null, t });
    const c4 = crows.find((z) => z.mint === p.mint && z.entry_ts >= p.entryTs && z.entry_ts <= p.entryTs + 200);
    const st = {
      p1: r && !p1Pass(r) ? S("na", null, "not in filter") : p.x.t15s40 != null ? S("sold", p.x.t15s40, p.x.t15s40 >= 1.5 ? "took 1.5x" : "stopped") : S("hold", p.mult, "holding"),
      p2: r && !p2Pass(r) ? S("na", null, "not in filter") : p.x.flow4 != null ? S("sold", p.x.flow4, "sold") : S("hold", p.mult, p.flowArmed ? "riding (past 1.5x)" : "holding"),
      p3: p.x.split != null ? S("sold", p.x.split, `sold (${p.splitBranch || "—"})`) : S(p.ageS < 120 ? "wait" : "hold", p.mult, p.ageS < 120 ? `deciding in ${120 - p.ageS}s` : p.splitHalf ? "half sold · rest riding" : p.splitBranch === "run" ? "riding (trail)" : "holding"),
      p4: !c ? S("na", null, "—") : !c.done ? S("wait", null, `deciding in ${c.left}s`) : !c.ok ? S("na", null, `skipped (${c.ratio != null ? c.ratio.toFixed(2) + "x" : "no price"})`)
        : cp ? (cp.e.x.t15s40 != null ? S("sold", cp.e.x.t15s40, cp.e.x.t15s40 >= 1.5 ? "took 1.5x" : "stopped") : S("hold", cp.lastPx / cp.e.entry, `holding (in at ${c.ratio.toFixed(2)}x)`))
        : c4 && c4.x_t15s40 != null ? S("sold", c4.x_t15s40, c4.x_t15s40 >= 1.5 ? "took 1.5x" : "stopped") : S("na", null, "bought · closed"),
    };
    const holding = Object.values(st).some((z) => z.st === "hold" || z.st === "wait");
    return { ...p, st, holding, core: !!r, coreV40: r?.core_v40 === 1, p1: r && !p1Pass(r) ? "not in filter" : p.x.t15s40 != null ? (p.x.t15s40 >= 1.5 ? "took 1.5x" : `stopped ${p.x.t15s40.toFixed(2)}x`) : p.mult <= 0.6 ? "stopping" : "running",
      p2: r && !p2Pass(r) ? "not in filter" : p.x.flow4 != null ? `exited ${p.x.flow4.toFixed(2)}x` : p.flowArmed ? "armed (holding)" : "running", p3: p.x.split != null ? `exited ${p.x.split.toFixed(2)}x (${p.splitBranch})` : p.splitBranch ? `${p.splitBranch}${p.splitHalf ? " · half taken" : ""}` : p.ageS < 120 ? `deciding in ${120 - p.ageS}s` : "running", p4 };
  });
  const recent = qRecent.all().map((r) => ({ ...r, peak: Math.max(r.peak_mult || 1, r.after_peak_mult || 1) }));
  return { now: Math.floor(Date.now() / 1000), version: VERSION, sol: solUsdCached(), size, cost, mem: memMb(), projects, open, recent,
    params: { trigger: `$${(CFG.VOL5M_USD / 1e3).toFixed(0)}K traded in 5 min`, entryCap: `MC under $${(CFG.MOM_CORE_MC / 1e3).toFixed(0)}K at entry`, first: "first entry on the coin only", minAge: `coin ≥ ${CFG.MOM_MIN_AGE_S}s old`, v40: `P3 filter: 1m vol ≥ $${(CFG.MOM_V40_USD / 1e3).toFixed(0)}K and age < ${CFG.MOM_V40_AGE_S / 60} min`, hold: `max hold ${CFG.MOM_MAX_HOLD_MIN / 60}h`, flow: `P2 hold: 5m vol ≥ $${(CFG.FLOW_MIN_VOL / 1e3).toFixed(0)}K · cap ${CFG.FLOW_CAP}x · 50% trail backstop`, split: "P3: decide at 120s · fail <0.90× · run ≥1.20× · trail 40% · cap 4x · half at 1.5x", dead: "P3+dead: after 10 min, 5m volume < $25K for 5 min → sell at market", p1f: "P1 filtered: stock-quoted pool OR entry MC < $47K · then 1.5x / −40%", conf: `P4: wait ${CFG.MOM_CONF_S}s after the trigger; buy only if price > ${CFG.MOM_CONF_MIN.toFixed(2)}× trigger (first trade up to ${CFG.MOM_CONF_LATE_S}s); then 1.5x / −40%`, costs: `${(cost * 100).toFixed(0)}% round trip assumed · ${size} SOL per trade` } };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — live</title>
<style>
:root{--bg:#120a2a;--card:rgba(14,10,40,.72);--line:#3a2a6a;--tx:#e9e6ff;--mut:#9a8fd0;--up:#39ff9c;--dn:#ff4d7a;--acc:#4ad8ff;--mag:#ff3ea5;--amb:#ffb84d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:14px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,'Cascadia Mono','JetBrains Mono',monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.85);backdrop-filter:blur(8px);z-index:2}
h1{font-size:16px;margin:0;color:var(--mag);letter-spacing:.02em}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}
main{padding:12px 16px;max-width:1280px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 0 0 1px rgba(255,62,165,.08),0 10px 30px rgba(0,0,0,.35)}
.card h2{margin:0 0 2px;font-size:15px;color:var(--acc)}.rule{font-size:12px;color:var(--mut);min-height:32px}
.big{font-size:32px;font-weight:700;margin:6px 0 0}.kv{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:13px;margin-top:10px}.kv b{font-weight:600;color:var(--amb)}.kv b.up{color:var(--up)}.kv b.dn{color:var(--dn)}
svg.chart{width:100%;height:150px;margin-top:10px;display:block}svg.combo{width:100%;height:260px;margin-top:8px;display:block}.lg{display:inline-flex;align-items:center;gap:6px;margin-left:14px}.lg i{display:inline-block;width:18px;height:3px;border-radius:2px}
.flt{margin:10px 0 4px;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,rgba(57,255,156,.14),rgba(74,216,255,.10));border:1px solid rgba(57,255,156,.45)}.flt h4{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#39ff9c}.flt ol{margin:0;padding-left:20px}.flt li{margin:3px 0;color:#eafff4;font-size:13px;line-height:1.4}.flt li b{color:#39ff9c}.bt{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);font-size:12px;color:var(--mut)}
.wl{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:10px;background:rgba(255,255,255,.08)}.wl i{display:block;height:100%}.wl .w{background:var(--up)}.wl .l{background:var(--dn)}
.wlt{display:flex;justify-content:space-between;font-size:12px;margin-top:4px}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);margin:22px 0 8px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mag);font-weight:500}
.hbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:22px 0 0;padding:6px 10px;background:#c6c6c6;color:#0b0b2b;border-radius:10px 10px 0 0;font-size:13px}.hbar b{letter-spacing:.08em}.hbar .fk{background:#0b0b2b;color:#5fd7ff;padding:1px 7px;border-radius:3px;font-weight:700}.hbar.sold .fk{color:#ff79f0}.hbar .cnt{color:#0b0b2b;font-weight:700}.hbar .lgd{margin-left:auto;font-size:11px;color:#2a2a4a;white-space:normal}
.tbl.ht{border-radius:0 0 12px 12px;background:#07072a;border-color:#2b2b6b}.tbl.ht th{color:#5fd7ff;background:#10104a}.tbl.ht td{border-bottom:1px solid #1d1d55}.tbl.ht tr:hover td{background:rgba(224,124,240,.12)}
.pill{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-style:normal;font-size:12px;letter-spacing:.03em}.pill.win{background:#5fff87;color:#04140a}.pill.loss{background:#ff5f6f;color:#1a0008}.pill.hold{border:1px solid #5fd7ff;color:#5fd7ff}.pill.wait{border:1px dashed #ffd75f;color:#ffd75f}.pill.na{color:#6c6ca0}
.sub{display:block;font-size:11px;margin-top:2px;color:#8f8fc8}.sub.up{color:#5fff87}.sub.dn{color:#ff5f6f}td .nm{color:#ff79f0}tr.allsold td{opacity:.95}
tr.win td:first-child{box-shadow:inset 3px 0 0 var(--up)}tr.loss td:first-child{box-shadow:inset 3px 0 0 var(--dn)}
.tbl{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
.tag{display:inline-block;padding:1px 6px;border-radius:6px;background:rgba(74,216,255,.12);color:var(--acc);font-size:11px;margin-left:4px}
.params{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 16px;font-size:13px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}.seg button{background:transparent;color:var(--mut);border:0;padding:6px 10px;font-size:13px;cursor:pointer}.seg button.on{background:rgba(255,62,165,.18);color:#fff}a.coin{color:var(--tx);text-decoration:none;border-bottom:1px dotted var(--acc)}a.coin:hover{color:var(--acc)}.seg.sell button{padding:3px 7px;font-size:11px;color:var(--amb)}.seg.sell button:hover{background:rgba(255,184,77,.18)}
footer{padding:16px;color:var(--mut);font-size:12px;text-align:center}
</style></head><body>
<header><div><h1>Ismael — live paper trading <a id="alink" href="#" style="font-size:12px;color:var(--acc);margin-left:10px;font-weight:500">analysis →</a><a id="hlink" href="#" style="font-size:12px;color:#ff79f0;margin-left:10px;font-weight:500">sold history →</a></h1><div class="mut" id="sub">loading…</div></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="mut">per trade</span><span class="seg" id="size"><button data-v="0.1">0.1</button><button data-v="0.25" class="on">0.25</button><button data-v="0.5">0.5</button><button data-v="1">1 SOL</button></span><span class="mut">costs</span><span class="seg" id="cost"><button data-v="0">0%</button><button data-v="0.05" class="on">5%</button><button data-v="0.1">10%</button></span></div></header>
<main>
<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px"><h2 style="margin:0;font-size:15px">All projects — cumulative net SOL</h2><div id="legend" style="font-size:12px"></div></div><div id="combo"></div></div>
<div class="grid" id="projects"></div>
<div class="hbar"><span class="fk">LIVE</span><b>HOLDING NOW</b><span id="nhold" class="cnt"></span><span class="lgd"><i class="pill hold">HOLDING</i> money still in &nbsp;<i class="pill win">SOLD +</i> sold at a profit &nbsp;<i class="pill loss">SOLD −</i> sold at a loss &nbsp;<i class="pill wait">WAIT</i> deciding &nbsp;<i class="pill na">—</i> not taken</span></div><div class="tbl ht"><table id="open"><thead><tr><th>coin</th><th>entered</th><th>age</th><th>entry MC</th><th>now</th><th>peak</th><th>5m vol</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>sell (paper)</th></tr></thead><tbody></tbody></table></div><div class="hbar sold"><span class="fk">DONE</span><b>SOLD BY EVERY PROJECT</b><span id="nsold" class="cnt"></span><span class="lgd">no money in these any more — the bot keeps watching each coin for a while to record what it did after we sold</span></div><div class="tbl ht"><table id="sold"><thead><tr><th>coin</th><th>entered</th><th>entry MC</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>after we sold: now</th><th>peak</th></tr></thead><tbody></tbody></table></div>
<h3>Last 25 core trades <span class="mut" style="text-transform:none;letter-spacing:0">— P&L per project at the selected size; row colour = Project 3 (or Project 2 before it existed)</span></h3><div class="tbl"><table id="recent"><thead><tr><th>coin</th><th>entered (UTC)</th><th>entry MC</th><th>peak</th><th>P1</th><th>P2</th><th>P3</th><th>P3+dead</th><th>P4</th><th>P3 branch</th><th>P3 filter</th><th>state</th></tr></thead><tbody></tbody></table></div>
<h3>Parameters</h3><div class="card params" id="params"></div>
</main><footer id="foot"></footer>
<script>
const key=new URLSearchParams(location.search).get('key')||'';let SIZE=0.25,COST=0.05,VER=null;
const $=s=>document.querySelector(s);const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));
const pc=v=>v==null?'—':((v-1)*100).toFixed(0)+'%';const sol=v=>(v>=0?'+':'')+v.toFixed(2)+' SOL';const cls=v=>v>0?'up':v<0?'dn':'';
const pl=v=>v==null?'—':'<span class="'+cls(v*(1-COST)-1)+'">'+((v*(1-COST)-1)*SIZE>=0?'+':'')+((v*(1-COST)-1)*SIZE).toFixed(2)+'</span> <span class="mut">'+pc(v)+'</span>';
const ago=s=>s<60?s+'s':s<3600?Math.floor(s/60)+'m':(s/3600).toFixed(1)+'h';const hhmm=t=>{const d=new Date(t*1000);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')};
function chart(c){const W=360,H=150,L=38,R=6,T=8,B=20;if(!c||c.length<2)return '<svg class="chart" viewBox="0 0 '+W+' '+H+'"><text x="'+(W/2)+'" y="'+(H/2)+'" fill="#9a8fd0" font-size="12" text-anchor="middle">no closed trades yet</text></svg>';
const xs=c.map(p=>p[0]),ys=c.map(p=>p[1]);const x0=xs[0],x1=xs[xs.length-1],mn=Math.min(0,...ys),mx=Math.max(0,...ys);const X=t=>L+(t-x0)/((x1-x0)||1)*(W-L-R),Y=v=>T+(1-(v-mn)/((mx-mn)||1))*(H-T-B);
const d=c.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');const z=Y(0);const last=ys[ys.length-1];const col=last>=0?'#39ff9c':'#ff4d7a';
const area='M'+X(x0).toFixed(1)+' '+z.toFixed(1)+' '+c.map(p=>'L'+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ')+' L'+X(x1).toFixed(1)+' '+z.toFixed(1)+' Z';
const ticks=[mn,0,mx].filter((v,i,a)=>a.indexOf(v)===i);const tx=[x0,x0+(x1-x0)/2,x1];
return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="g'+(last>=0?'u':'d')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity=".02"/></linearGradient></defs>'+
ticks.map(v=>'<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" stroke="#2e2360" stroke-dasharray="'+(v===0?'0':'3 3')+'"/><text x="'+(L-4)+'" y="'+(Y(v)+4).toFixed(1)+'" fill="#9a8fd0" font-size="10" text-anchor="end">'+(v>0?'+':'')+v.toFixed(1)+'</text>').join('')+
'<path d="'+area+'" fill="url(#g'+(last>=0?'u':'d')+')"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
'<circle cx="'+X(x1).toFixed(1)+'" cy="'+Y(last).toFixed(1)+'" r="3" fill="'+col+'"/>'+
tx.map((t,i)=>'<text x="'+X(t).toFixed(1)+'" y="'+(H-6)+'" fill="#9a8fd0" font-size="10" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+new Date(t*1000).toLocaleDateString(undefined,{weekday:'short'})+' '+hhmm(t)+'</text>').join('')+'</svg>'}
const PCOL={p1:'#ffb84d',p2:'#4ad8ff',p3:'#ff3ea5',p4:'#b48cff',p5:'#39ff9c'};
function combo(pr){const W=900,H=260,L=44,R=10,T=10,B=22;const series=['p1','p2','p3','p4','p5'].map(k=>({k,c:pr[k].curve||[],name:pr[k].name,net:pr[k].net})).filter(s=>s.c.length>1);if(!series.length)return '<svg class="combo"></svg>';
const allx=series.flatMap(s=>s.c.map(p=>p[0])),ally=series.flatMap(s=>s.c.map(p=>p[1]));const x0=Math.min(...allx),x1=Math.max(...allx),mn=Math.min(0,...ally),mx=Math.max(0,...ally);const X=t=>L+(t-x0)/((x1-x0)||1)*(W-L-R),Y=v=>T+(1-(v-mn)/((mx-mn)||1))*(H-T-B);
const step=(mx-mn)>4?1:(mx-mn)>1.5?0.5:0.25;const yt=[];for(let v=Math.ceil(mn/step)*step;v<=mx+1e-9;v+=step)yt.push(+v.toFixed(2));
const nx=6,xt=[];for(let i=0;i<=nx;i++)xt.push(x0+(x1-x0)*i/nx);
let g='<svg class="combo" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">';
g+=yt.map(v=>'<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" stroke="'+(v===0?'#5a4a9a':'#2e2360')+'"/><text x="'+(L-5)+'" y="'+(Y(v)+4).toFixed(1)+'" fill="#9a8fd0" font-size="11" text-anchor="end">'+(v>0?'+':'')+v.toFixed(2)+'</text>').join('');
g+=xt.map(t=>'<line x1="'+X(t).toFixed(1)+'" y1="'+T+'" x2="'+X(t).toFixed(1)+'" y2="'+(H-B)+'" stroke="#2e2360"/>').join('');
g+=xt.map((t,i)=>'<text x="'+X(t).toFixed(1)+'" y="'+(H-6)+'" fill="#9a8fd0" font-size="11" text-anchor="'+(i===0?'start':i===nx?'end':'middle')+'">'+new Date(t*1000).toLocaleDateString(undefined,{weekday:'short'})+' '+hhmm(t)+'</text>').join('');
for(const s of series){const pts=[[s.c[0][0],0]].concat(s.c);const d=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');const last=s.c[s.c.length-1];g+='<path d="'+d+'" fill="none" stroke="'+PCOL[s.k]+'" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="'+X(last[0]).toFixed(1)+'" cy="'+Y(last[1]).toFixed(1)+'" r="3.5" fill="'+PCOL[s.k]+'"/>';}
return g+'</svg>'}
function wl(p){const n=p.wins+p.losses;if(!n)return '';return '<div class="wl"><i class="w" style="width:'+(p.wins/n*100)+'%"></i><i class="l" style="width:'+(p.losses/n*100)+'%"></i></div><div class="wlt"><span class="up">'+p.wins+' profitable</span><span class="dn">'+p.losses+' losses</span></div>'}
async function load(){const r=await fetch('/api/snapshot?key='+encodeURIComponent(key)+'&size='+SIZE+'&cost='+COST);if(!r.ok){$('#sub').textContent='access denied — check the key in the link';return}const d=await r.json();if(VER&&d.version&&VER!==d.version){location.reload();return}VER=d.version;
$('#sub').textContent='v'+d.version+' · updated '+new Date(d.now*1000).toLocaleTimeString()+' · SOL $'+d.sol.toFixed(0)+' · mem '+d.mem+' MB';
$('#combo').innerHTML=combo(d.projects);$('#legend').innerHTML=['p1','p2','p3','p4','p5'].map(k=>'<span class="lg"><i style="background:'+PCOL[k]+'"></i>'+d.projects[k].name+' <b class="'+cls(d.projects[k].net)+'">'+(d.projects[k].n?sol(d.projects[k].net):'—')+'</b></span>').join('');
$('#projects').innerHTML=['p1','p2','p3','p4','p5'].map(k=>{const p=d.projects[k];const f=p.filtered?'<div class="kv" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><span class="mut">with entry filter</span><b class="'+cls(p.filtered.net)+'">'+(p.filtered.n?sol(p.filtered.net)+' <span class="mut">('+p.filtered.n+')</span>':'—')+'</b></div>':'';
const dur=p.durationH<48?Math.round(p.durationH)+' hours':(p.durationH/24).toFixed(1)+' days';
const daysT=p.days&&p.days.length?'<table style="margin-top:10px;font-size:12px"><tr><th>day (UTC)</th><th>trades</th><th>won</th><th>net</th></tr>'+p.days.map(d=>'<tr><td>'+d.day.slice(5)+'</td><td>'+d.n+'</td><td>'+d.wins+'</td><td class="'+cls(d.net)+'">'+sol(d.net)+'</td></tr>').join('')+'</table>':'';
const flt=p.filters?'<div class="flt"><h4>Rules</h4><ol>'+p.filters.map(x=>'<li>'+x+'</li>').join('')+'</ol></div>':'';
const btl=p.backtest?'<div class="bt">back-test 15–16 Oct (filter found on this data — fitted): '+p.backtest.n+' trades · '+(p.backtest.win==null?'—':(p.backtest.win*100).toFixed(0)+'% won')+' · <span class="'+cls(p.backtest.net)+'">'+sol(p.backtest.net)+'</span><br>same period without the filter: '+p.unfiltered.n+' trades · <span class="'+cls(p.unfiltered.net)+'">'+sol(p.unfiltered.net)+'</span>'+(p.vsP1&&p.vsP1.n?'<br>pass test: live filtered trades with this exit <span class="'+cls(p.vsP1.p2)+'">'+sol(p.vsP1.p2)+'</span> vs selling the same '+p.vsP1.n+' at 1.5x <span class="'+cls(p.vsP1.p1)+'">'+sol(p.vsP1.p1)+'</span>':'')+'</div>':'';
return '<div class="card"'+(p.filters?' style="border-color:rgba(57,255,156,.55)"':'')+'><h2>'+p.name+'</h2><div class="rule">'+p.rule+'</div>'+flt+btl+'<div class="mut" style="margin-top:6px">last 24 hours</div><div class="big '+cls(p.net24)+'">'+(p.n24?sol(p.net24):'—')+'</div><div class="mut">'+p.n24+' trades'+(p.open?' · '+p.open+' open now':'')+'</div>'+
'<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line)"><span class="mut">total</span> <b class="'+cls(p.net)+'" style="font-size:20px">'+(p.n?sol(p.net):'—')+'</b> <span class="mut">· '+p.n+' trades · '+(p.n?dur:'—')+'</span></div>'+chart(p.curve)+wl(p)+
'<div class="kv"><span class="mut">win rate</span><b>'+(p.win==null?'—':(p.win*100).toFixed(0)+'%')+'</b><span class="mut">avg per trade</span><b>'+pc(p.avg==null?null:p.avg+1)+'</b><span class="mut">win rate 24h</span><b>'+(p.win24==null?'—':(p.win24*100).toFixed(0)+'%')+'</b><span class="mut">reached 2x / 4x</span><b>'+p.big+' / '+p.cap+'</b><span class="mut">best / worst trade</span><b><span class="up">'+(p.best>=0?'+':'')+p.best.toFixed(2)+'</span> / <span class="dn">'+p.worst.toFixed(2)+'</span></b></div>'+f+(k==='p5'?'<div class="kv" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><span class="mut">same trades, sell all at 1.5x / −40%</span><b class="'+cls(p.alt.net)+'">'+(p.alt.n?sol(p.alt.net)+' <span class="mut">('+p.alt.n+', '+(p.alt.win*100).toFixed(0)+'% won)</span>':'—')+'</b><span class="mut">triggers since restart / too young / sell-heavy</span><b>'+p.fired+' / '+p.young+' / '+p.sellHeavy+'</b></div>'+(p.openList.length?'<table style="margin-top:10px;font-size:12px"><tr><th>open</th><th>age</th><th>now</th><th>status</th></tr>'+p.openList.map(o=>'<tr><td><a class="coin" href="https://fomo.family/tokens/solana/'+o.mint+'" target="_blank" rel="noopener">'+o.name+'</a></td><td>'+ago(o.ageS)+'</td><td class="'+cls(o.mult-1)+'">'+o.mult.toFixed(2)+'x</td><td>'+(o.done!=null?'done '+o.done.toFixed(2)+'x':o.half?'half out · riding':'before 2x')+'</td></tr>').join('')+'</table>':''):'')+(k==='p4'?'<div class="kv" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><span class="mut">triggers taken / skipped</span><b>'+p.taken+' / '+p.skipped+'</b></div>':'')+daysT+'</div>'}).join('');
const pnl=m=>d.size*(m*(1-d.cost)-1);
const cell=z=>{if(!z)return '—';if(z.st==='sold'){const v=pnl(z.m);return '<i class="pill '+(v>=0?'win':'loss')+'">SOLD '+z.m.toFixed(2)+'x</i><span class="sub '+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+v.toFixed(3)+' SOL · '+z.t+'</span>'}if(z.st==='hold'){const v=z.m!=null?pnl(z.m):null;return '<i class="pill hold">HOLDING'+(z.m!=null?' '+z.m.toFixed(2)+'x':'')+'</i><span class="sub '+(v==null?'':v>=0?'up':'dn')+'">'+z.t+(v!=null?' · '+(v>=0?'+':'')+v.toFixed(3)+' if sold now':'')+'</span>'}if(z.st==='wait')return '<i class="pill wait">WAIT</i><span class="sub">'+z.t+'</span>';return '<i class="pill na">—</i><span class="sub">'+z.t+'</span>'};
const coinTd=p=>'<td><a class="coin" href="https://fomo.family/tokens/solana/'+p.mint+'" target="_blank" rel="noopener">'+p.name+'</a>'+(p.core?'':'<span class="tag">non-core</span>')+(p.restored?'<span class="tag" title="rebuilt from the database after a restart">restored</span>':'')+'</td>';
const nowTd=p=>'<td class="'+cls(p.mult-1)+'"><b>'+p.mult.toFixed(2)+'x</b> <span class="mut">$'+fmt(p.lastMc)+(p.pxAge==null?' · no price yet':p.pxAge>45?' · '+(p.pxSrc==='dex'?'dex ':'trade ')+ago(p.pxAge)+' ago':'')+'</span></td>';
const H=d.open.filter(p=>p.holding),SD=d.open.filter(p=>!p.holding);$('#nhold').textContent=H.length;$('#nsold').textContent=SD.length;
$('#open tbody').innerHTML=H.length?H.map(p=>'<tr class="'+(p.mult>1?'win':p.mult<1?'loss':'')+'">'+coinTd(p)+'<td>'+hhmm(p.entryTs)+'</td><td>'+ago(p.ageS)+'</td><td>$'+fmt(p.entryMc)+'</td>'+nowTd(p)+'<td>'+p.peakMult.toFixed(2)+'x</td><td style="color:'+(p.v5<25000?'#ff5f6f':'#ffd75f')+'">$'+fmt(p.v5)+'</td><td>'+cell(p.st.p1)+'</td><td>'+cell(p.st.p2)+'</td><td>'+cell(p.st.p3)+'</td><td>'+cell(p.st.p4)+'</td><td>'+(p.manualSold>=0.999?'<span class="mut">sold</span>':'<span class="seg sell" data-id="'+p.id+'">'+[0.25,0.5,1].map(v=>'<button data-pct="'+v+'">'+(v*100)+'%</button>').join('')+'</span>'+(p.manualSold?'<span class="mut"> '+(p.manualSold*100).toFixed(0)+'% sold</span>':''))+'</td></tr>').join(''):'<tr><td colspan="12" class="mut">nothing held right now</td></tr>';
$('#sold tbody').innerHTML=SD.length?SD.map(p=>'<tr class="allsold">'+coinTd(p)+'<td>'+hhmm(p.entryTs)+'</td><td>$'+fmt(p.entryMc)+'</td><td>'+cell(p.st.p1)+'</td><td>'+cell(p.st.p2)+'</td><td>'+cell(p.st.p3)+'</td><td>'+cell(p.st.p4)+'</td>'+nowTd(p)+'<td>'+p.peakMult.toFixed(2)+'x</td></tr>').join(''):'<tr><td colspan="9" class="mut">none</td></tr>';
$('#recent tbody').innerHTML=d.recent.map(r=>{const ref=r.x_split??r.x_flow4;const rc=ref==null?'':ref>1?'win':'loss';return '<tr class="'+rc+'"><td><a class="coin" href="https://fomo.family/tokens/solana/'+r.mint+'" target="_blank" rel="noopener">'+r.name+'</a></td><td>'+new Date(r.entry_ts*1000).toISOString().slice(5,16).replace('T',' ')+'</td><td>$'+fmt(r.entry_mc||0)+'</td><td>'+r.peak.toFixed(2)+'x</td><td>'+pl(r.x_t15s40)+'</td><td>'+pl(r.x_flow4)+'</td><td>'+pl(r.x_split)+'</td><td>'+pl(r.x_p3d)+'</td><td>'+(r.conf_ok==null?'<span class="mut">—</span>':r.conf_ok?pl(r.p4x):'<span class="mut">skipped '+(r.conf_ratio!=null?r.conf_ratio.toFixed(2)+'x':'')+'</span>')+'</td><td>'+(r.split_branch||'—')+'</td><td>'+(r.core_v40?'yes':'no')+'</td><td class="mut">'+(r.closed?(r.exit_reason||'closed'):'open')+'</td></tr>'}).join('');
$('#params').innerHTML=Object.values(d.params).map(v=>'<div>'+v+'</div>').join('');
$('#foot').textContent='Books start when each exit began recording live: P1/P2 from 15 Oct 12:52 UTC, P3 from 16 Oct 16:00 UTC. Paper trades, no real money. Chart: cumulative net SOL over time at the selected size. Page refreshes every 3 s; trades price instantly, idle coins every 20 s from DexScreener.';}
for(const id of ['size','cost'])$('#'+id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('#'+id).children].forEach(x=>x.classList.remove('on'));b.classList.add('on');if(id==='size')SIZE=Number(b.dataset.v);else COST=Number(b.dataset.v);load()});
$('#alink').href='/analysis?key='+encodeURIComponent(key);$('#hlink').href='/history?key='+encodeURIComponent(key);
$('#open').addEventListener('click',async e=>{const b=e.target.closest('.sell button');if(!b)return;const id=b.closest('.sell').dataset.id,pct=Number(b.dataset.pct);const name=b.closest('tr').querySelector('a.coin').textContent;if(!confirm('Paper-sell '+(pct*100)+'% of '+name+' at the current price?'))return;const r=await fetch('/api/sell?key='+encodeURIComponent(key),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,pct})});const j=await r.json();if(!j.ok)alert(j.error||'failed');load()});
load();setInterval(load,3000);
</script></body></html>`;

const HISTORY = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — sold history</title>
<style>
:root{--line:#2b2b6b;--tx:#e9e6ff;--mut:#8f8fc8;--up:#5fff87;--dn:#ff5f6f;--acc:#5fd7ff;--mag:#ff79f0;--yel:#ffd75f}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:13px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.88);backdrop-filter:blur(8px);z-index:3}h1{font-size:16px;margin:0;color:var(--mag)}
main{padding:12px 16px}.mut{color:var(--mut)}a{color:var(--acc)}select{background:#10104a;color:var(--tx);border:1px solid var(--line);border-radius:6px;padding:4px 8px;font:inherit}
.hbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:16px 0 0;padding:6px 10px;background:#c6c6c6;color:#0b0b2b;border-radius:10px 10px 0 0;font-size:13px}.hbar b{letter-spacing:.08em}.hbar .fk{background:#0b0b2b;color:var(--mag);padding:1px 7px;border-radius:3px;font-weight:700}.hbar .lgd{margin-left:auto;font-size:11px;color:#2a2a4a;white-space:normal}
.tbl{overflow:auto;background:#07072a;border:1px solid var(--line);border-radius:0 0 12px 12px;max-height:78vh}
table{border-collapse:collapse;font-size:12px;width:100%}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #1d1d55;white-space:nowrap}th{color:var(--acc);background:#10104a;position:sticky;top:0;cursor:pointer}tr:hover td{background:rgba(224,124,240,.12)}
a.coin{color:var(--tx);text-decoration:none;border-bottom:1px dotted var(--acc)}a.coin:hover{color:var(--acc)}
.pill{display:inline-block;padding:2px 7px;border-radius:4px;font-weight:700;font-style:normal;font-size:12px}.pill.win{background:var(--up);color:#04140a}.pill.loss{background:var(--dn);color:#1a0008}.pill.na{color:#6c6ca0}
.tag{font-size:10px;padding:1px 5px;border-radius:3px;margin-left:5px;background:#10104a;color:var(--acc)}.tag.p4{color:#b48cff}.tag.p5{color:var(--up)}
.big{color:var(--yel);font-weight:700}.up{color:var(--up)}.dn{color:var(--dn)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px}.kpi{background:#07072a;border:1px solid var(--line);border-radius:10px;padding:10px 12px}.kpi b{display:block;font-size:22px;color:var(--yel)}.kpi span{color:var(--mut);font-size:12px}
</style></head><body>
<header><div><h1>Ismael — sold history <a id="back" href="#" style="font-size:12px;color:var(--acc);margin-left:10px;font-weight:500">← live</a></h1><div class="mut" id="sub">loading…</div></div><div>show last <select id="days"><option>1</option><option selected>3</option><option>7</option><option>14</option><option>30</option></select> days</div></header>
<main>
<div class="kpis" id="kpis"></div>
<div class="hbar"><span class="fk">HIST</span><b>EVERY SOLD COIN — AND WHAT IT DID AFTER</b><span class="lgd"><i class="pill win">1.50x</i> project sold at a profit &nbsp;<i class="pill loss">0.58x</i> at a loss &nbsp;faded = outside that project's current filter &nbsp;<i class="pill na">—</i> not taken &nbsp;· "after" = highest price within 24 h of entry · "now" = last price seen</span></div>
<div class="tbl"><table id="t"><thead><tr><th data-k="name">coin</th><th data-k="entry_ts">entered</th><th data-k="entry_mc">entry MC</th><th data-k="exit_reason">closed by</th><th data-k="x_t15s40">P1</th><th data-k="x_flow4">P2</th><th data-k="x_split">P3</th><th data-k="p45">P4 / P5</th><th data-k="peak_mult">peak while held</th><th data-k="after">peak within 24 h</th><th data-k="after_peak_mc">peak MC</th><th data-k="after_last_mult">now</th><th data-k="miss">left on the table</th></tr></thead><tbody></tbody></table></div>
</main>
<script>
const key=new URLSearchParams(location.search).get('key')||'';const $=s=>document.querySelector(s);$('#back').href='/?key='+encodeURIComponent(key);
const fmt=n=>n==null?'—':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':Math.round(n)+'';
const ts=t=>{const d=new Date(t*1000);return d.toLocaleDateString(undefined,{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};
const pill=(v,on)=>v==null?'<i class="pill na">—</i>':'<i class="pill '+(v>=1?'win':'loss')+'"'+(on?'':' style="opacity:.4" title="outside this project\'s current filter"')+'>'+v.toFixed(2)+'x</i>';
let D=null,SK='entry_ts',SD=-1;
function best(r){const v=[r.proj==='core'?r.x_t15s40:null,r.proj==='core'?r.x_flow4:null,r.proj==='core'?r.x_split:null,r.proj==='P4'?r.x_t15s40:null,r.proj==='P5'?r.x_h2t40:null].filter(x=>x!=null);return v.length?Math.max(...v):null}
function render(){const R=D.rows.map(r=>({...r,p45:r.proj==='P4'?r.x_t15s40:r.proj==='P5'?r.x_h2t40:null,miss:(()=>{const b=best(r);return b&&r.after?r.after/b:null})()}));
R.sort((a,b)=>{const x=a[SK],y=b[SK];return (x==null)-(y==null)||(x>y?1:x<y?-1:0)*SD});
const n=R.length,ran2=R.filter(r=>r.after>=2).length,ran4=R.filter(r=>r.after>=4).length,lv=R.filter(r=>r.exit_reason==='lowvol').length,lvRan=R.filter(r=>r.exit_reason==='lowvol'&&r.after_peak_mult!=null&&r.after_peak_mult>=1.5*(best(r)||1)).length;
$('#kpis').innerHTML='<div class="kpi"><b>'+n+'</b><span>sold coins in '+D.days+' day(s)</span></div><div class="kpi"><b>'+ran2+'</b><span>went to 2x+ of our entry within 24 h</span></div><div class="kpi"><b>'+ran4+'</b><span>went to 4x+ within 24 h</span></div><div class="kpi"><b>'+lv+'</b><span>closed by the golden rule (volume < $25K)</span></div><div class="kpi"><b>'+lvRan+'</b><span>of those later ran 1.5× above our best exit</span></div>';
$('#t tbody').innerHTML=R.length?R.map(r=>'<tr><td><a class="coin" href="https://fomo.family/tokens/solana/'+r.mint+'" target="_blank" rel="noopener">'+r.name+'</a>'+(r.proj!=='core'?'<span class="tag '+r.proj.toLowerCase()+'">'+r.proj+'</span>':'')+'</td><td>'+ts(r.entry_ts)+'</td><td>$'+fmt(r.entry_mc)+'</td><td style="color:'+(r.exit_reason==='lowvol'?'#ffd75f':'#8f8fc8')+'">'+(r.exit_reason||'—')+'</td><td>'+(r.proj==='core'?pill(r.x_t15s40,r.p1in):'<i class="pill na">—</i>')+'</td><td>'+(r.proj==='core'?pill(r.x_flow4,r.p2in):'<i class="pill na">—</i>')+'</td><td>'+(r.proj==='core'?pill(r.x_split,true):'<i class="pill na">—</i>')+'</td><td>'+(r.proj==='core'?'<i class="pill na">—</i>':pill(r.p45,true))+'</td><td>'+(r.peak_mult?r.peak_mult.toFixed(2)+'x':'—')+'</td><td class="'+(r.after>=2?'big':'')+'">'+(r.after?r.after.toFixed(2)+'x':'—')+'</td><td>$'+fmt(r.after_peak_mc)+'</td><td class="'+(r.after_last_mult==null?'':r.after_last_mult>=1?'up':'dn')+'">'+(r.after_last_mult!=null?r.after_last_mult.toFixed(2)+'x':'—')+'</td><td class="'+(r.miss>=1.5?'big':'mut')+'">'+(r.miss?r.miss.toFixed(2)+'× our best exit':'—')+'</td></tr>').join(''):'<tr><td colspan="13" class="mut">no sold coins in this period</td></tr>';
$('#sub').textContent=n+' sold coins · updated '+new Date().toLocaleTimeString()}
document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{const k=th.dataset.k;SD=SK===k?-SD:-1;SK=k;render()});
async function load(){const r=await fetch('/api/history?key='+encodeURIComponent(key)+'&days='+$('#days').value);if(!r.ok){$('#sub').textContent='access denied';return}D=await r.json();render()}
$('#days').onchange=load;load();setInterval(load,30000);
</script></body></html>`;
const ANALYSIS = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — analysis</title>
<style>
:root{--bg:#120a2a;--card:rgba(14,10,40,.72);--line:#3a2a6a;--tx:#e9e6ff;--mut:#9a8fd0;--up:#39ff9c;--dn:#ff4d7a;--acc:#4ad8ff;--mag:#ff3ea5;--amb:#ffb84d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:13px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,'Cascadia Mono','JetBrains Mono',monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.85);backdrop-filter:blur(8px);z-index:2}h1{font-size:16px;margin:0;color:var(--mag)}
main{padding:12px 16px}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}a{color:var(--acc)}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);margin:22px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.card h4{margin:0 0 6px;font-size:13px;color:var(--acc)}
table{border-collapse:collapse;font-size:12px;width:100%}th,td{text-align:left;padding:5px 7px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mag);font-weight:500;cursor:pointer;position:sticky;top:0;background:#160c38}th.on{color:var(--tx)}
.tbl{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:12px;max-height:75vh}a.coin{color:var(--tx);text-decoration:none;border-bottom:1px dotted var(--acc)}a.coin:hover{color:var(--acc)}
tr.win td:first-child{box-shadow:inset 3px 0 0 var(--up)}tr.loss td:first-child{box-shadow:inset 3px 0 0 var(--dn)}
input,select{background:#0f1115;color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:5px 8px;font-size:13px}
.bar{display:inline-block;height:8px;background:linear-gradient(90deg,var(--mag),var(--acc));vertical-align:middle;border-radius:2px;margin-right:4px}
</style></head><body>
<header><div><h1>Ismael — analysis <a id="back" href="#" style="font-size:12px;margin-left:10px;font-weight:500">← live</a></h1><div class="mut" id="sub">loading…</div></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label><input type="checkbox" id="coreonly" checked> core trades only</label> <input id="q" placeholder="filter by name / mint" style="width:200px"> <select id="days"><option value="2">2 days</option><option value="7" selected>7 days</option><option value="30">30 days</option></select> <a id="csv" href="#">download CSV</a></div></header>
<main>
<h3>How the core trades split by each factor <span class="mut" style="text-transform:none;letter-spacing:0">— reach = share of trades whose price touched that multiple after entry; P1/P2/P3 = average result under each exit. Small n means nothing.</span></h3>
<div class="grid" id="brackets"></div>
<h3>Every trade, every recorded factor <span class="mut" style="text-transform:none;letter-spacing:0">— click a column heading to sort</span></h3>
<div class="tbl"><table id="t"><thead></thead><tbody></tbody></table></div>
</main>
<script>
const key=new URLSearchParams(location.search).get('key')||'';const $=s=>document.querySelector(s);$('#back').href='/?key='+encodeURIComponent(key);
const fmt=n=>n==null?'':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));const pct=v=>v==null?'—':(v*100).toFixed(0)+'%';const pc=v=>v==null?'—':((v-1)*100).toFixed(0)+'%';const x=v=>v==null?'—':v.toFixed(2)+'x';
const ts=t=>new Date(t*1000).toISOString().slice(5,16).replace('T',' ');const age=s=>s==null?'—':s<3600?Math.floor(s/60)+'m':s<86400?(s/3600).toFixed(1)+'h':(s/86400).toFixed(0)+'d';
const COLS=[['name','coin',r=>'<a class="coin" href="https://fomo.family/tokens/solana/'+r.mint+'" target="_blank" rel="noopener">'+r.name+'</a>'+(r.core?'':' <span class="mut">(non-core)</span>')],['entry_ts','entered UTC',r=>ts(r.entry_ts)],['venue','pool',r=>r.venue||'pumpswap'],['entry_mc','entry MC',r=>'$'+fmt(r.entry_mc)],['age_s','age',r=>age(r.age_s)],['vol5m_usd','5m vol @entry',r=>'$'+fmt(r.vol5m_usd)],['vol1m_usd','1m vol @entry',r=>'$'+fmt(r.vol1m_usd)],['v120','5m vol @+2m',r=>r.v120==null?'—':'$'+fmt(r.v120)],['v300','5m vol @+5m',r=>r.v300==null?'—':'$'+fmt(r.v300)],['buyers_entry','buyers 5m',r=>r.buyers_entry??'—'],['q_wallets','wallets 5m',r=>r.q_wallets??'—'],['bot_share_entry','bot share',r=>pct(r.bot_share_entry)],['bs_clean_entry','clean buy/sell',r=>r.bs_clean_entry==null?'—':r.bs_clean_entry.toFixed(2)],
['bundle_pct','bundle %',r=>r.bundle_pct==null?'—':r.bundle_pct.toFixed(0)+'%'],['bundle_sol','bundle SOL',r=>r.bundle_sol==null?'—':r.bundle_sol.toFixed(1)],['cluster_held_pct','bundle held %',r=>r.cluster_held_pct==null?'—':r.cluster_held_pct.toFixed(0)+'%'],['cluster_out_entry','bundle SOL out',r=>r.cluster_out_entry==null?'—':r.cluster_out_entry.toFixed(1)],['snipers_n','snipers',r=>r.snipers_n??'—'],['snipers_held_pct','snipers hold %',r=>r.snipers_held_pct==null?'—':r.snipers_held_pct.toFixed(1)+'%'],['fresh_share','fresh wallets',r=>r.fresh_share==null?'—':pct(r.fresh_share)+' <span class="mut">/'+r.fresh_n+'</span>'],['proven_vol_share','proven $ share',r=>pct(r.proven_vol_share)],['dex_paid','dex paid',r=>r.dex_paid==null?'—':r.dex_paid?('yes '+(r.dex_paid_types||'')):'no'],
['holders_entry','holders',r=>r.holders_entry??'—'],['top10_entry','top-10 %',r=>r.top10_entry==null?'—':r.top10_entry.toFixed(0)+'%'],['largest_entry','largest %',r=>r.largest_entry==null?'—':r.largest_entry.toFixed(1)+'%'],['dev_hold_entry','dev hold %',r=>r.dev_hold_entry==null?'—':r.dev_hold_entry.toFixed(1)+'%'],['fee_accrued_entry','fees accrued SOL',r=>r.fee_accrued_entry==null?'—':r.fee_accrued_entry.toFixed(1)],['fee_claims_entry','fee claims',r=>r.fee_claims_entry??'—'],['outside_buyers','launch buyers',r=>r.outside_buyers??'—'],['dev_buy_sol','dev buy SOL',r=>r.dev_buy_sol==null?'—':r.dev_buy_sol.toFixed(2)],['has_socials','socials',r=>r.has_socials==null?'—':r.has_socials?'yes':'no'],
['m30','+30s',r=>x(r.m30)],['m120','+2m',r=>x(r.m120)],['m300','+5m',r=>x(r.m300)],['t_hit15_s','secs to 1.5x',r=>r.t_hit15_s??'—'],['peak','peak',r=>x(r.peak)],['x_t15s40','P1',r=>'<span class="'+(r.x_t15s40>1?'up':r.x_t15s40<1?'dn':'')+'">'+pc(r.x_t15s40)+'</span>'],['x_flow4','P2',r=>'<span class="'+(r.x_flow4>1?'up':r.x_flow4<1?'dn':'')+'">'+pc(r.x_flow4)+'</span>'],['x_split','P3',r=>'<span class="'+(r.x_split>1?'up':r.x_split<1?'dn':'')+'">'+pc(r.x_split)+'</span>'],['x_p3d','P3+dead',r=>'<span class="'+(r.x_p3d>1?'up':r.x_p3d<1?'dn':'')+'">'+pc(r.x_p3d)+'</span>'],['x_dead','dead-only',r=>pc(r.x_dead)],['x_manual','your sell',r=>r.x_manual==null?'—':pc(r.x_manual)+' <span class="mut">('+Math.round((r.manual_pct||0)*100)+'%)</span>'],['split_branch','P3 branch',r=>r.split_branch||'—'],['core_v40','P3 filter',r=>r.core_v40==null?'—':r.core_v40?'yes':'no'],['exit_reason','state',r=>r.closed?(r.exit_reason||'closed'):'open'],['mint','mint',r=>'<a href="https://dexscreener.com/solana/'+r.mint+'" target="_blank">'+r.mint.slice(0,6)+'…</a>']];
let DATA=null,sortK='entry_ts',sortD=-1;
function render(){if(!DATA)return;const q=$('#q').value.toLowerCase(),co=$('#coreonly').checked;let rows=DATA.rows.filter(r=>(!co||r.core===1)&&(!q||(r.name||'').toLowerCase().includes(q)||r.mint.toLowerCase().includes(q)));
rows.sort((a,b)=>{const va=a[sortK],vb=b[sortK];if(va==null&&vb==null)return 0;if(va==null)return 1;if(vb==null)return -1;return (va>vb?1:va<vb?-1:0)*sortD});
$('#t thead').innerHTML='<tr>'+COLS.map(c=>'<th data-k="'+c[0]+'" class="'+(c[0]===sortK?'on':'')+'">'+c[1]+(c[0]===sortK?(sortD>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr>';
$('#t tbody').innerHTML=rows.map(r=>{const ref=r.x_split??r.x_flow4;return '<tr class="'+(ref==null?'':ref>1?'win':'loss')+'">'+COLS.map(c=>'<td>'+c[2](r)+'</td>').join('')+'</tr>'}).join('');
$('#sub').textContent=rows.length+' trades shown · '+DATA.nCore+' core of '+DATA.n+' momentum trades in '+DATA.days+' days · brackets use core trades only';
$('#brackets').innerHTML=DATA.brackets.map(b=>'<div class="card"><h4>'+b.name+'</h4><table><tr><th></th><th>n</th><th>1.5x</th><th>2x</th><th>3x</th><th>P1</th><th>P2</th><th>P3</th></tr>'+b.rows.map(r=>r.n?'<tr><td>'+r.bucket+'</td><td>'+r.n+'</td><td><span class="bar" style="width:'+(r.r15*40)+'px"></span>'+pct(r.r15)+'</td><td>'+pct(r.r2)+'</td><td>'+pct(r.r3)+'</td><td class="'+(r.p1>0?'up':r.p1<0?'dn':'')+'">'+(r.p1==null?'—':(r.p1*100).toFixed(0)+'%')+'</td><td class="'+(r.p2>0?'up':r.p2<0?'dn':'')+'">'+(r.p2==null?'—':(r.p2*100).toFixed(0)+'%')+'</td><td class="'+(r.p3>0?'up':r.p3<0?'dn':'')+'">'+(r.p3==null?'—':(r.p3*100).toFixed(0)+'% <span class="mut">('+r.n3+')</span>')+'</td></tr>':'<tr><td class="mut">'+r.bucket+'</td><td class="mut">0</td><td colspan="6"></td></tr>').join('')+'</table></div>').join('');}
async function load(){const r=await fetch('/api/trades?key='+encodeURIComponent(key)+'&days='+$('#days').value);if(!r.ok){$('#sub').textContent='access denied';return}DATA=await r.json();render()}
$('#t thead').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k;if(sortK===k)sortD=-sortD;else{sortK=k;sortD=-1}render()});
$('#q').oninput=render;$('#coreonly').onchange=render;$('#days').onchange=load;$('#csv').onclick=e=>{e.preventDefault();if(!DATA)return;const cols=Object.keys(DATA.rows[0]||{});const esc=v=>v==null?'':/[",\\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);const csv=[cols.join(',')].concat(DATA.rows.map(r=>cols.map(c=>esc(r[c])).join(','))).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='momentum_trades.csv';a.click()};
load();setInterval(load,60000);
</script></body></html>`;

export function startWeb() {
  if (!KEY()) { console.log("[web] WEB_KEY not set — dashboard disabled"); return; }
  const srv = createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      if (u.searchParams.get("key") !== KEY()) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden"); }
      if (u.pathname === "/api/sell" && req.method === "POST") { let body = ""; req.on("data", (c) => { body += c; if (body.length > 1e4) req.destroy(); }); req.on("end", () => { try { const { id, pct } = JSON.parse(body || "{}"); const r = manualSell(Number(id), Math.min(1, Math.max(0.01, Number(pct) || 1))); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(r)); } catch (e) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: e.message })); } }); return; }
      if (u.pathname === "/api/trades") { const days = Math.min(60, Math.max(1, Number(u.searchParams.get("days")) || 7)); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(tradesDump(days))); }
      if (u.pathname === "/api/history") { const days = Math.min(30, Math.max(1, Number(u.searchParams.get("days")) || 3)); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(history(days))); }
      if (u.pathname === "/history") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(HISTORY); }
      if (u.pathname === "/analysis") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(ANALYSIS); }
      if (u.pathname === "/api/snapshot") { const size = Math.min(5, Math.max(0.01, Number(u.searchParams.get("size")) || 0.25)), cost = Math.min(0.5, Math.max(0, Number(u.searchParams.get("cost") ?? 0.05))); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(snapshot(size, cost))); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(PAGE);
    } catch (e) { res.writeHead(500, { "content-type": "text/plain" }); res.end("error: " + e.message); console.error("[web]", e.message); }
  });
  srv.on("error", (e) => console.error("[web] server error", e.message));
  srv.listen(PORT(), "0.0.0.0", () => console.log(`[web] dashboard on :${PORT()}`));
}
