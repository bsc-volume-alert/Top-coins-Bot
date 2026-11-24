// verification of Codex's full-export figures (sections 1B, 2, 3, 4)
import { readCsv, sum } from "../lib.mjs";
const D = process.argv[2], P = readCsv(D + "/positions.csv"), FE = new Map(readCsv(D + "/entry_features.csv").map((f) => [f.entry_id, f])), EN = new Map(readCsv(D + "/entries.csv").map((e) => [e.entry_id, e]));
const CUT = Date.parse("2026-11-23T20:19:05Z") / 1000, H = 1795324239, f3 = (x) => x.toFixed(3);
for (const p of P) { p.e = EN.get(p.entry_id); p.f = FE.get(p.entry_id) || {}; p.t = p.e.signal_t; }
const meas = (p) => p.row_status === "closed" && !p.estimated_exit;
const stat = (rows, label, val = (p) => p.net_sol) => { const by = new Map(); for (const r of rows) by.set(r.mint, (by.get(r.mint) || 0) + val(r)); const best = Math.max(...by.values(), -Infinity), net = sum(rows.map(val)), a = rows.filter((r) => r.t < H), b = rows.filter((r) => r.t >= H), c = (x) => new Set(x.map((r) => r.mint)).size;
  console.log(label.padEnd(40), `${rows.length}/${by.size}`.padEnd(8), "net", f3(net).padEnd(7), "exBest", f3(net - best).padEnd(7), "H1", `${a.length}/${c(a)}`.padEnd(7), f3(sum(a.map(val))).padEnd(7), "H2", `${b.length}/${c(b)}`.padEnd(7), f3(sum(b.map(val)))); };
const rows = (book, filt = () => true, mature = false) => P.filter((p) => p.book === book && p.stop_pct === 30 && p.exit_policy === "trail" && !p.rebuy && p.entry_status === "filled" && meas(p) && filt(p) && (!mature || p.fill_t <= CUT - 86400));
const live = [...EN.values()].filter((e) => e.status === "filled" && e.feed_lag_s != null); console.log("fills with signal lag >5 s:", live.filter((e) => e.feed_lag_s > 5).length, ">10 s:", live.filter((e) => e.feed_lag_s > 10).length, ">60 s:", live.filter((e) => e.feed_lag_s > 60).length);
const t22 = [...EN.values()].filter((e) => e.status === "filled" && e.method === "live" && /Tokenz/.test(e.token_program || "") && e.risk_status === "missing"); console.log("live filled, Token-2022, risk missing:", t22.length, "| live filled with NO token program recorded:", [...EN.values()].filter((e) => e.status === "filled" && e.method === "live" && !e.token_program).length);
{ const u = new Map(); for (const p of [...rows("HH15-5M", (p) => p.f.mc >= 200e3), ...rows("HH30-5M", (p) => p.f.mc >= 200e3)]) u.set(p.entry_id, p); stat([...u.values()], "T1 pooled $200K HH15/HH30"); }
stat(rows("FAST150-10M", (p) => p.f.w5_buyers >= 45), "T2 FAST150-10M, 45+ buyers"); stat(rows("FAST150-5M", (p) => p.f.age_s >= 16 * 3600 && p.f.age_s < 36 * 3600), "T3 FAST150-5M, 16–36 h");
stat(rows("HH-BREAK", (p) => p.f.drawdown4h != null && p.f.drawdown4h >= -0.18), "T4 stored field drawdown4h >= -0.18"); console.log("   T4 field missing on", rows("HH-BREAK", (p) => p.f.drawdown4h == null).length, "of", rows("HH-BREAK").length, "HH-BREAK closed first buys");
// current-price distance proxy from the stored (rounded) fields: px/hi4 − 1 = (px/low)·(low/hi4) − 1 = recovery4h·(1+drawdown4h) − 1
stat(rows("HH-BREAK", (p) => p.f.drawdown4h != null && p.f.recovery4h != null && p.f.recovery4h * (1 + p.f.drawdown4h) - 1 >= -0.18), "   proxy: current price within 18% of 4h high");
// HH-BREAK-4H minus HH-BREAK on the same buys, measured rows only
const key = (p) => p.entry_id, hb = new Map(rows("HH-BREAK").map((p) => [key(p), p])), pairs = rows("HH-BREAK-4H").filter((p) => hb.has(key(p)));
stat(pairs, "HH-BREAK-4H minus HH-BREAK, paired", (p) => p.net_sol - hb.get(key(p)).net_sol); stat(pairs.filter((p) => p.fill_t <= CUT - 86400), "  mature pairs", (p) => p.net_sol - hb.get(key(p)).net_sol);
