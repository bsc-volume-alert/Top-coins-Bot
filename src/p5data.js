// v0.18.113 — the A–D data set as one CSV: every P5 trigger since the price fix (taken or skipped by the filters), one row each, with everything
// recorded before the trigger (early_json, enrichment, holders), after it (trace marks, paper exits, peak) and — when the executor traded or
// simulated it — the real fill, sale and gaps. Read-only. /api/p5data?key=… on the website; `curl` works from the box too.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db.js";
import { MARKS } from "./p5trace.js";
const J = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const PRE = ["m1", "m2", "m3", "m5"], PREK = ["b", "s", "nb", "ns"], LV0 = [30, 40, 50, 80], LV1 = [10, 20, 30, 50], MK = ["x", "b", "s", "bs", "ss", "nb", "nn", "ns", "mx", "ib", "is", "inb", "ins"], HM = [0, 60, 300, 600], HK = ["n", "t10", "t20", "lg", "dev"];
const MINS = [1, 2, 3, 4, 5];
const BASE = ["id", "strategy", "book", "name", "mint", "entry_utc", "entry_ts", "hour_uk", "pass", "skip_why", "venue", "entry_mc", "entry_price", "age_s", "bundle_pct", "holders_entry", "top10_entry", "largest_entry", "dev_hold_entry", "snipers_n", "snipers_held_pct", "fresh_share", "fresh_n", "proven_vol_share", "proven_wallets_5m", "dex_paid", "q_wallets",
  "sol60", "wal60", "n60", "max_share", "avg_buy_sol", "sell60", "feed_lag_ms", "t1_x", "t2_x", "t5_x", "t10_x",
  "peak_mult", "after_peak_mult", "dd_pre15", "t_hit15_s", "exit_reason", "closed", "x_h5", "x_h3", "x_h15", "x_h5f14", "x_flow4", "x_t15s40", "x_t2s40", "x_h2t40", "x_split", "x_tsl40", "x_time",
  "live_book", "live_mode", "live_stake_sol", "live_cost_sol", "live_proceeds_sol", "live_pnl_sol", "live_x", "live_entry_gap", "live_exit_gap", "live_rule", "live_why", "live_fill_ms", "live_opened_utc", "live_closed_utc"];
export const HEADER = [...BASE, ...PRE.flatMap((m) => PREK.map((k) => `pre_${m}_${k}`)), ...MINS.flatMap((m) => PREK.map((k) => `pre_min${m}_${k}`)), ...LV0.flatMap((L) => [`pre_${L}sol_t`, `pre_${L}sol_w`]), ...MARKS.flatMap((m) => MK.map((k) => `t${m}_${k}`)), ...LV1.flatMap((L) => [`after_${L}sol_t`, `after_${L}sol_w`]), ...HM.flatMap((m) => HK.map((k) => `h${m}_${k}`))];
const BOOKS = { p5e30: "A", p5w30: "C", p5e50: "D", p5e80: "80", momentum: "E" }; // v0.18.115: E = the old core trigger, $100K traded in 5 min with MC under $100K (Projects 1A/1B/2A/2B were filter variants of it)
const skipOf = (r, w) => (r.strategy === "momentum" ? (r.tb != null && r.tb >= 70 ? `bundled ${Math.round(r.tb)}%` : "") : r.tb == null ? "launch not seen" : r.tb >= 70 ? `bundled ${Math.round(r.tb)}%` : w != null && w >= 150 ? `${w} wallets` : !(!r.venue || r.venue === "pumpswap" || r.venue === "pump") ? `not SOL-paired (${r.venue})` : "");
// GMGN's token info + security snapshot at entry (gmgn_json): every numeric / boolean scalar becomes a column, gi_<key> (info) and gs_<key> (security)
function gmgnFlat(json) { const o = {}; let g = null; try { g = json ? JSON.parse(json) : null; } catch {} if (!g) return o; for (const [pre, part] of [["gi_", g.info], ["gs_", g.sec]]) { const d = part && typeof part === "object" ? (part.data && typeof part.data === "object" ? part.data : part) : null; if (!d) continue; for (const [k, v] of Object.entries(d)) { if (typeof v === "number") o[pre + k] = v; else if (typeof v === "boolean") o[pre + k] = v ? 1 : 0; else if (typeof v === "string" && v !== "" && !isNaN(v) && v.length < 20) o[pre + k] = Number(v); } } return o; }
const hourUK = (ts) => Number(new Date(ts * 1000).toLocaleString("en-GB", { timeZone: "Europe/London", hour12: false }).slice(12, 14));
const utc = (ts) => (ts ? new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ") : "");
const csv = (v) => { if (v == null) return ""; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const q = db.prepare(`SELECT p.id, p.strategy, p.name, p.mint, p.entry_ts, p.venue, p.entry_mc, p.entry_price, p.entry_age_s, p.age_s, p.holders_entry, p.top10_entry, p.largest_entry, p.dev_hold_entry, p.snipers_n, p.snipers_held_pct, p.fresh_share, p.fresh_n, p.proven_vol_share, p.proven_wallets_5m, p.dex_paid, p.q_wallets, p.early_json, p.first_secs, p.trace,
  p.peak_mult, p.after_peak_mult, p.dd_pre15, p.t_hit15_s, p.exit_reason, p.closed, p.x_h5, p.x_h3, p.x_h15, p.x_h5f14, p.x_flow4, p.x_t15s40, p.x_t2s40, p.x_h2t40, p.x_split, p.x_tsl40, p.x_time, p.gmgn_json, t.bundle_pct tb
  FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE (p.strategy IN ('p5e30','p5w30','p5e50','p5e80') OR (p.strategy='momentum' AND p.core=1)) AND COALESCE(p.invalid,0)=0 AND COALESCE(p.crashloop,0)=0 AND p.entry_ts>=? ORDER BY p.entry_ts`);
function liveRows() { // the executor's book, read-only; one row per leg
  const path = join(process.env.EXEC_HOME || "/root/executor", "executor.db"); if (!existsSync(path)) return new Map();
  let ex = null; try { ex = new Database(path, { readonly: true, fileMustExist: true });
    const rows = ex.prepare(`SELECT p.paper_id, p.book, p.mode, p.opened_ts, p.closed_ts, p.tokens, p.cost_lamports, p.proceeds_lamports, p.pnl_lamports, p.exit_rule, p.paper_exit_mult, p.paper_entry_price, p.status, b.stake_lamports b_stake, b.from_trigger_ms b_ms, s.detail s_det, s.tip_lamports s_tip
      FROM positions p LEFT JOIN orders b ON b.id=p.buy_order LEFT JOIN orders s ON s.id=p.sell_order WHERE p.status='closed'`).all();
    const m = new Map(); for (const r of rows) { const arr = m.get(r.paper_id) || []; arr.push(r); m.set(r.paper_id, arr); } return m; } catch { return new Map(); } finally { try { ex?.close(); } catch {} }
}
export function p5dataCsv(from) {
  const live = liveRows(), all = q.all(from); const gcols = new Set(); const gflat = new Map(); for (const r of all) { const g = gmgnFlat(r.gmgn_json); gflat.set(r.id, g); for (const k of Object.keys(g)) gcols.add(k); }
  const header = [...HEADER, ...[...gcols].sort()]; const out = [header.join(",")];
  for (const r of all) {
    const e = J(r.early_json) || {}, fs = J(r.first_secs) || {}, tr = J(r.trace) || {}, w = e.wal60 ?? null, skip = skipOf(r, w);
    const legs = live.get(r.id) || []; const legChoice = legs.find((l) => l.mode === "live") || legs[0] || null; // one row per paper trade: the live leg if there was one, else the shadow leg
    const base = (() => { if (!legChoice) return {}; const l = legChoice, st = l.b_stake || l.cost_lamports, livePx = l.tokens > 0 ? (st / 1e9) / (l.tokens / 1e6) : null, salePx = l.tokens > 0 && l.proceeds_lamports > 0 ? ((l.proceeds_lamports + (l.s_tip || 0) + 5000) / 1e9) / (l.tokens / 1e6) : null, why = J(l.s_det)?.why || null;
      return { live_book: { runner: "A", hold5: "B", wide: "C", strict: "D" }[l.book] || l.book, live_mode: l.mode, live_stake_sol: st / 1e9, live_cost_sol: l.cost_lamports / 1e9, live_proceeds_sol: (l.proceeds_lamports || 0) / 1e9, live_pnl_sol: (l.pnl_lamports || 0) / 1e9, live_x: l.cost_lamports > 0 ? +((l.proceeds_lamports || 0) / l.cost_lamports).toFixed(4) : null,
        live_entry_gap: livePx && l.paper_entry_price ? +(livePx / l.paper_entry_price - 1).toFixed(4) : null, live_exit_gap: salePx && l.paper_entry_price && l.paper_exit_mult ? +(salePx / (l.paper_entry_price * l.paper_exit_mult) - 1).toFixed(4) : null, live_rule: l.exit_rule, live_why: why, live_fill_ms: l.b_ms, live_opened_utc: utc(l.opened_ts), live_closed_utc: utc(l.closed_ts) }; })();
    const row = { id: r.id, strategy: r.strategy, book: BOOKS[r.strategy] || r.strategy, name: r.name, mint: r.mint, entry_utc: utc(r.entry_ts), entry_ts: r.entry_ts, hour_uk: hourUK(r.entry_ts), pass: skip ? 0 : 1, skip_why: skip, venue: r.venue, entry_mc: r.entry_mc, entry_price: r.entry_price, age_s: r.entry_age_s ?? r.age_s ?? e.age ?? null, bundle_pct: r.tb,
      holders_entry: r.holders_entry, top10_entry: r.top10_entry, largest_entry: r.largest_entry, dev_hold_entry: r.dev_hold_entry, snipers_n: r.snipers_n, snipers_held_pct: r.snipers_held_pct, fresh_share: r.fresh_share, fresh_n: r.fresh_n, proven_vol_share: r.proven_vol_share, proven_wallets_5m: r.proven_wallets_5m, dex_paid: r.dex_paid, q_wallets: r.q_wallets,
      sol60: e.sol60, wal60: e.wal60, n60: e.n60, max_share: e.maxShare, avg_buy_sol: e.avgBuySol, sell60: e.sell60, feed_lag_ms: fs.lag, t1_x: fs.t1?.m, t2_x: fs.t2?.m, t5_x: fs.t5?.m, t10_x: fs.t10?.m,
      peak_mult: r.peak_mult, after_peak_mult: r.after_peak_mult, dd_pre15: r.dd_pre15, t_hit15_s: r.t_hit15_s, exit_reason: r.exit_reason, closed: r.closed, x_h5: r.x_h5, x_h3: r.x_h3, x_h15: r.x_h15, x_h5f14: r.x_h5f14, x_flow4: r.x_flow4, x_t15s40: r.x_t15s40, x_t2s40: r.x_t2s40, x_h2t40: r.x_h2t40, x_split: r.x_split, x_tsl40: r.x_tsl40, x_time: r.x_time, ...base, ...gflat.get(r.id) };
    for (const m of MINS) for (const k of PREK) row[`pre_min${m}_${k}`] = e.pre?.mins?.[m - 1]?.[k];
    for (const m of PRE) for (const k of PREK) row[`pre_${m}_${k}`] = e.pre?.[m]?.[k];
    for (const L of LV0) { row[`pre_${L}sol_t`] = e.lv?.[L]?.t; row[`pre_${L}sol_w`] = e.lv?.[L]?.w; }
    for (const m of MARKS) for (const k of MK) row[`t${m}_${k}`] = tr.m?.[m]?.[k];
    for (const L of LV1) { row[`after_${L}sol_t`] = tr.lv?.[L]?.t; row[`after_${L}sol_w`] = tr.lv?.[L]?.w; }
    for (const m of HM) for (const k of HK) row[`h${m}_${k}`] = tr.h?.[m]?.[k];
    out.push(header.map((h) => csv(row[h])).join(","));
  }
  return out.join("\n") + "\n";
}
