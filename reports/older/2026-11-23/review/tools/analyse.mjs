// analyse.mjs — scoreboard, coin ledger with classifications, candidate tests. Reads the CSV package written by build.mjs.
//   node analyse.mjs <package-dir>
// Every figure is per comparison row (book × age × stop × exit). Rows are alternatives on the same buys: they are never added
// together as a portfolio. "Measured" = a closed row whose sale was priced by the bot at the time (not an estimate).
import fs from "node:fs"; import zlib from "node:zlib"; import crypto from "node:crypto";
const D = process.argv[2];
export function readCsv(f) { let t = fs.readFileSync(D + "/" + f); if (f.endsWith(".gz")) t = zlib.gunzipSync(t); t = t.toString("utf8"); const out = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); out.push(row); row = []; cur = ""; } else cur += c; }
  const h = out.shift(); return out.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] === "" || r[i] === undefined ? null : r[i]]))); }
const num = (o, ks) => { for (const k of ks) if (o[k] != null) o[k] = +o[k]; return o; };
const esc = (v) => { if (v == null) return ""; if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toPrecision(8)); const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const man = JSON.parse(fs.readFileSync(D + "/manifest.json", "utf8"));
function csv(name, data, cols = Object.keys(data[0] || {})) { const body = cols.join(",") + "\n" + data.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n") + "\n"; fs.writeFileSync(D + "/" + name, body); man.files[name] = { rows: data.length, bytes: Buffer.byteLength(body), sha256: crypto.createHash("sha256").update(body).digest("hex") }; console.log(name, data.length); }
const COST = man.cost_sol, sum = (a) => a.reduce((s, x) => s + x, 0), med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), pc = (x) => (x == null || !isFinite(x) ? null : +(100 * x).toFixed(1));
const P = readCsv("positions.csv").map((p) => num(p, ["entry_id", "row", "stop_pct", "rebuy", "startup", "estimated_exit", "fill_t", "trigger_t", "exit_t", "hold_s", "cost_sol", "proceeds_sol", "half_sol", "last_leg_sol", "net_sol", "ret", "trigger_value_sol", "trigger_to_sale_sol", "sale_delay_s", "peak_x_held", "max_eq_x", "last_x", "open_value_sol", "spot_hi_held_x", "spot_lo_held_x", "spot_hi_held_s", "spot_lo_held_s", "spot_hi_24h_after_exit_x", "spot_lo_24h_after_exit_x", "runner_max_x_24h", "reached_2x", "reached_3x", "reached_5x", "reached_10x", "runner_horizon_done"]));
const FE = new Map(readCsv("entry_features.csv").map((f) => [+f.entry_id, f])), EN = new Map(readCsv("entries.csv").map((e) => [+e.entry_id, e]));
const BOOKS = readCsv("books.csv").map((b) => b.book), CUT = Date.parse(man.export_cutoff_utc) / 1000;
const NUMF = ["age_s", "mc", "liq_usd", "rt_impact", "rise15", "big_candle_60m", "from_hi1h", "drawdown4h", "recovery4h", "vol15_usd", "vol60_usd", "vol_surge5", "buys15", "sells15", "buyers15", "repeat_buyers15", "w1_vol_usd", "w1_buyers", "w1_top_buyer_share", "w5_vol_usd", "w5_buys", "w5_sells", "w5_buyers", "w5_top_buyer_share"];
for (const f of FE.values()) { num(f, NUMF); f.buy_sell15 = f.buys15 != null && f.sells15 > 0 ? f.buys15 / f.sells15 : null; f.repeat_share15 = f.buyers15 > 0 && f.repeat_buyers15 != null ? f.repeat_buyers15 / f.buyers15 : null; f.vol15_to_liq = f.vol15_usd != null && f.liq_usd > 0 ? f.vol15_usd / f.liq_usd : null; f.mc_to_liq = f.mc != null && f.liq_usd > 0 ? f.mc / f.liq_usd : null; }
const FEATS = [...NUMF, "buy_sell15", "repeat_share15", "vol15_to_liq", "mc_to_liq"];

// ---------- classifications (definitions are in the README; they are labels from recorded fields, not proof of cause) ----------
const measured = (p) => p.row_status === "closed" && !p.estimated_exit;
function classify(p) { const f = FE.get(p.entry_id) || {}, e = EN.get(p.entry_id) || {};
  const fin = p.entry_status !== "filled" ? "not filled (" + p.entry_status + ")" : p.row_status !== "closed" ? (p.row_status === "unresolved" || /unresolved/.test(p.quality || "") ? "unresolved" : "open") : p.estimated_exit ? "estimated (not a measured result)" : p.ret > 0.005 ? "profitable" : p.ret < -0.005 ? "losing" : "flat";
  let path = null, mech = [];
  if (p.entry_status === "filled") { const pk = p.peak_x_held ?? 1, ran = p.reached_2x === 1, closed = p.row_status === "closed";
    const shortfall = closed && p.trigger_to_sale_sol != null ? -p.trigger_to_sale_sol / COST : 0, clock = /stall|clock|max|24|hold|limit/i.test(p.exit_reason || "") && p.exit_reason !== "trail";
    if (!closed) path = ran ? "open: has reached 2x" : "open";
    else if (ran && p.ret >= 0.5) path = "runner captured";
    else if (ran && pk >= 2) path = "runner missed: held through 2x and gave it back";
    else if (ran) path = "runner missed: sold before the run";
    else if (p.ret < 0 && (shortfall >= 0.10 || (pk < 1.1 && p.ret < -(p.stop_pct / 100) - 0.10))) path = "abrupt collapse";
    else if (pk >= 1.3 && p.ret <= 0.05) path = "giveback";
    else if (clock || (Math.abs(p.ret) < 0.10 && pk < 1.15 && p.hold_s >= 3600)) path = "stagnation";
    else if (p.ret < 0) path = "ordinary decline"; else path = "ordinary gain";
    if (closed && p.ret < -0.005) {
      if (/fee-coin/.test(p.quality || "")) mech.push("transfer fee");
      if (/outage|warm-gap|late-|state-age|unresolved|assumed|verify/.test(p.quality || "")) mech.push("feed/quote quality flag");
      if (shortfall >= 0.05) mech.push("sale well below trigger");
      if (f.rt_impact > 0.03 || (f.liq_usd != null && f.liq_usd < 25000)) mech.push("thin pool");
      if (p.rebuy) mech.push("repeat buy (churn)");
      if (f.w5_top_buyer_share >= 0.4) mech.push("one buyer >=40% of 5-min buying");
      if (f.rise15 >= 1.5 || f.from_hi1h >= -0.02) mech.push("bought extended (at the 1-h high or after +50% in 15 min)");
      if (pk < 1.05) mech.push("no follow-through (never +5%)"); else if (pk >= 1.3) mech.push("gave back a gain of 30%+");
      if (p.hold_s != null && p.hold_s < 180) mech.push("stopped within 3 minutes");
      if (!mech.length) mech.push("no defensible explanation from recorded fields"); } }
  return { fin, path, mech: mech.join("; ") }; }
for (const p of P) Object.assign(p, classify(p));

// ---------- scoreboard ----------
function board(rows) { const m = rows.filter(measured), open = rows.filter((p) => p.entry_status === "filled" && p.row_status !== "closed"), est = rows.filter((p) => p.row_status === "closed" && p.estimated_exit);
  const net = sum(m.map((p) => p.net_sol)), by = new Map(); for (const p of m) by.set(p.mint, (by.get(p.mint) || 0) + p.net_sol); const cs = [...by].sort((a, b) => b[1] - a[1]), ex = (k) => net - sum(cs.slice(0, k).map((c) => c[1]));
  const srt = [...m].sort((a, b) => a.exit_t - b.exit_t); let cum = 0, pk = 0, dd = 0; for (const p of srt) { cum += p.net_sol; if (cum > pk) pk = cum; if (pk - cum > dd) dd = pk - cum; }
  const filled = rows.filter((p) => p.entry_status === "filled"), ev = []; for (const p of filled) { ev.push([p.fill_t, 1]); ev.push([p.row_status === "closed" ? p.exit_t : Infinity, -1]); } ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let c = 0, mx = 0; for (const [, d] of ev) { c += d; if (c > mx) mx = c; }
  const ents = new Map(); for (const p of filled) ents.set(p.entry_id, p); const done = [...ents.values()].filter((p) => p.runner_horizon_done === 1), reasons = {}; for (const p of m) reasons[p.exit_reason] = (reasons[p.exit_reason] || 0) + 1;
  const h = srt.length >> 1, h1 = sum(srt.slice(0, h).map((p) => p.net_sol)), h2 = sum(srt.slice(h).map((p) => p.net_sol));
  return { signals: rows.length, mints: new Set(rows.map((p) => p.mint)).size, filled: filled.length, not_filled: rows.length - filled.length, open: open.length, unresolved: open.filter((p) => p.fin === "unresolved").length, estimated: est.length, closed_measured: m.length,
    stake_committed_sol: r3(filled.length * COST), proceeds_sol: r3(sum(m.map((p) => p.proceeds_sol))), net_sol: r3(net), open_cost_sol: r3(open.length * COST), open_value_sol: r3(sum(open.map((p) => p.open_value_sol || 0))), estimated_net_sol: r3(sum(est.map((p) => p.net_sol))),
    mean_ret_pct: pc(m.length ? sum(m.map((p) => p.ret)) / m.length : null), median_ret_pct: pc(med(m.map((p) => p.ret))), wins: m.filter((p) => p.fin === "profitable").length, flat: m.filter((p) => p.fin === "flat").length, losses: m.filter((p) => p.fin === "losing").length, win_pct: pc(m.length ? m.filter((p) => p.fin === "profitable").length / m.length : null),
    avg_win_pct: pc(med(m.filter((p) => p.ret > 0.005).map((p) => p.ret)) == null ? null : sum(m.filter((p) => p.ret > 0.005).map((p) => p.ret)) / m.filter((p) => p.ret > 0.005).length), avg_loss_pct: pc(m.filter((p) => p.ret < -0.005).length ? sum(m.filter((p) => p.ret < -0.005).map((p) => p.ret)) / m.filter((p) => p.ret < -0.005).length : null),
    loss40_pct: pc(m.length ? m.filter((p) => p.ret <= -0.4).length / m.length : null), loss50_pct: pc(m.length ? m.filter((p) => p.ret <= -0.5).length / m.length : null), loss60_pct: pc(m.length ? m.filter((p) => p.ret <= -0.6).length / m.length : null),
    realised_2x: m.filter((p) => p.ret >= 1).length, realised_3x: m.filter((p) => p.ret >= 2).length, realised_5x: m.filter((p) => p.ret >= 4).length, realised_10x: m.filter((p) => p.ret >= 9).length,
    followed_24h: done.length, reachable_2x: done.filter((p) => p.reached_2x).length, reachable_3x: done.filter((p) => p.reached_3x).length, reachable_5x: done.filter((p) => p.reached_5x).length, reachable_10x: done.filter((p) => p.reached_10x).length,
    median_hold_min: r3(med(m.map((p) => p.hold_s)) / 60), exit_reasons: Object.entries(reasons).map(([k, v]) => k + ":" + v).join(" "), median_sale_delay_s: r3(med(m.map((p) => p.sale_delay_s).filter((x) => x != null))), mean_trigger_to_sale_pct: pc(m.filter((p) => p.trigger_to_sale_sol != null).length ? sum(m.filter((p) => p.trigger_to_sale_sol != null).map((p) => p.trigger_to_sale_sol)) / m.filter((p) => p.trigger_to_sale_sol != null).length / COST : null),
    best_mint: cs[0]?.[0] ?? null, best_mint_sol: r3(cs[0]?.[1]), worst_mint: cs.at(-1)?.[0] ?? null, worst_mint_sol: r3(cs.at(-1)?.[1]), net_without_best1: r3(ex(1)), net_without_best3: r3(ex(3)), net_without_best5: r3(ex(5)), mints_positive: cs.filter((c) => c[1] > 0).length, mints_negative: cs.filter((c) => c[1] < 0).length,
    first_half_net: r3(h1), second_half_net: r3(h2), max_drawdown_sol: r3(dd), peak_open_rows: mx, peak_exposure_sol: r3(mx * COST) }; }
const key = (p) => p.book, groups = new Map(); for (const p of P) (groups.get(key(p)) || groups.set(key(p), []).get(key(p))).push(p);
const sb = [], sbv = [], daily = [];
for (const b of BOOKS) { const all = groups.get(b) || [];
  for (const [label, sel] of [["first buys", (p) => !p.rebuy], ["re-buys", (p) => p.rebuy], ["all buys", () => true]]) {
    const def = all.filter((p) => p.stop_pct === 30 && p.exit_policy === "trail" && sel(p)); sb.push({ book: b, buys: label, row: "30% trail, all ages (website default)", ...board(def) });
    for (const st of [20, 25, 30, 40, 60]) for (const pol of ["trail", "scale"]) { const rws = all.filter((p) => p.stop_pct === st && p.exit_policy === pol && sel(p)); if (rws.length) sbv.push({ book: b, buys: label, age_group: "all", stop_pct: st, exit_policy: pol, ...board(rws) }); }
    if (label === "first buys") for (const ag of ["A0", "A1", "A2", "A3", "A4"]) { const rws = all.filter((p) => p.age_group === ag && p.stop_pct === 30 && p.exit_policy === "trail" && sel(p)); if (rws.length) sbv.push({ book: b, buys: label, age_group: ag, stop_pct: 30, exit_policy: "trail", ...board(rws) }); } }
  const byDay = new Map(); for (const p of all.filter((p) => p.stop_pct === 30 && p.exit_policy === "trail" && measured(p))) { const k = p.signal_utc.slice(0, 10) + "|" + (p.rebuy ? "re-buys" : "first buys") + "|" + p.code_commit; (byDay.get(k) || byDay.set(k, []).get(k)).push(p); }
  for (const [k, a] of [...byDay].sort()) { const [day, buys, commit] = k.split("|"); daily.push({ book: b, signal_day_utc: day, buys, code_commit: commit, closed: a.length, wins: a.filter((p) => p.ret > 0.005).length, net_sol: r3(sum(a.map((p) => p.net_sol))), mean_ret_pct: pc(sum(a.map((p) => p.ret)) / a.length) }); } }
csv("scoreboard.csv", sb); csv("scoreboard_variants.csv", sbv); csv("chronology.csv", daily);

// ---------- coin ledger (every row, with both classifications) ----------
csv("coin_ledger.csv", P.map((p) => { const f = FE.get(p.entry_id) || {}; return { book: p.book, rule_family: p.rule_family, mint: p.mint, symbol: p.symbol, entry_id: p.entry_id, age_group: p.age_group, stop_pct: p.stop_pct, exit_policy: p.exit_policy, clock_tag: p.clock_tag, rebuy: p.rebuy, method: p.method, signal_utc: p.signal_utc, financial_outcome: p.fin, price_path_class: p.path, loss_mechanism_labels: p.mech, ret_pct: pc(p.ret), net_sol: p.net_sol, exit_reason: p.exit_reason, hold_min: p.hold_s != null ? r3(p.hold_s / 60) : null, peak_x_held: p.peak_x_held, spot_lo_held_x: p.spot_lo_held_x, runner_max_x_24h: p.runner_max_x_24h, trigger_to_sale_pct: p.trigger_to_sale_sol != null ? pc(p.trigger_to_sale_sol / COST) : null, mc_at_signal: f.mc, liq_usd: f.liq_usd, age_h: f.age_s != null ? r3(f.age_s / 3600) : null, code_commit: p.code_commit, quality: p.quality }; }));

// ---------- overlap between books (default row, first buys): shared buys and shared coins ----------
{ const ov = [], sets = new Map(), mints = new Map(), posM = new Map(); for (const b of BOOKS) { const a = (groups.get(b) || []).filter((p) => p.stop_pct === 30 && p.exit_policy === "trail" && !p.rebuy && p.entry_status === "filled"); sets.set(b, new Set(a.map((p) => p.entry_id))); mints.set(b, new Set(a.map((p) => p.mint))); const pm = new Map(); for (const p of a.filter(measured)) pm.set(p.mint, (pm.get(p.mint) || 0) + p.net_sol); posM.set(b, pm); }
  for (const a of BOOKS) for (const b of BOOKS) if (a !== b && sets.get(a).size) { const sa = sets.get(a), sbk = sets.get(b), ma = mints.get(a), mb = mints.get(b), pa = posM.get(a); const win = [...pa].filter(([, v]) => v > 0);
    ov.push({ book: a, other: b, buys: sa.size, same_buy: [...sa].filter((x) => sbk.has(x)).length, coins: ma.size, coins_also_in_other: [...ma].filter((x) => mb.has(x)).length, profitable_coins: win.length, profitable_coins_not_in_other: win.filter(([m]) => !mb.has(m)).length, net_sol_coins_not_in_other: r3(sum([...pa].filter(([m]) => !mb.has(m)).map(([, v]) => v))) }); }
  csv("book_overlap.csv", ov); }

// ---------- candidate tests: one fixed grid, every test recorded ----------
// Universe per book: first buys, 30% trail row, measured closed. Cuts: the book's own quartiles of each recorded entry feature,
// both directions. "winner" = ret > 0; "runner" = reached 2x within 24 h of the fill. Net per opportunity counts a rejected
// buy as zero. first/second half = by signal time. These are IN-SAMPLE, exploratory searches: none of them is validated.
const tests = [];
for (const b of BOOKS) { const u = (groups.get(b) || []).filter((p) => p.stop_pct === 30 && p.exit_policy === "trail" && !p.rebuy && measured(p)).sort((x, y) => x.fill_t - y.fill_t); if (u.length < 20) { tests.push({ book: b, feature: "(none)", rule: "fewer than 20 measured first buys: no test run", n_universe: u.length }); continue; }
  const W = u.filter((p) => p.ret > 0).length, R = u.filter((p) => p.reached_2x).length, base = sum(u.map((p) => p.net_sol)), half = u.length >> 1, tMid = u[half].fill_t;
  for (const ft of FEATS) { const vals = u.map((p) => FE.get(p.entry_id)?.[ft]).filter((x) => x != null && isFinite(x)); const miss = u.length - vals.length; if (vals.length < 20) { tests.push({ book: b, feature: ft, rule: "recorded on fewer than 20 buys: no test run", n_universe: u.length, missing: miss }); continue; }
    const s = [...vals].sort((x, y) => x - y), qs = [...new Set([0.25, 0.5, 0.75].map((q) => s[Math.floor(q * (s.length - 1))]))];
    for (const cut of qs) for (const dir of [">=", "<"]) { const pass = u.filter((p) => { const v = FE.get(p.entry_id)?.[ft]; return v != null && isFinite(v) && (dir === ">=" ? v >= cut : v < cut); }); if (pass.length < 8 || pass.length === u.length) continue;
      const w = pass.filter((p) => p.ret > 0).length, net = sum(pass.map((p) => p.net_sol)), a = pass.filter((p) => p.fill_t < tMid), z = pass.filter((p) => p.fill_t >= tMid), by = new Map(); for (const p of pass) by.set(p.mint, (by.get(p.mint) || 0) + p.net_sol); const top = Math.max(...by.values());
      tests.push({ book: b, feature: ft, rule: `${ft} ${dir} ${+cut.toPrecision(4)}`, n_universe: u.length, missing: miss, n_pass: pass.length, mints_pass: by.size, winner_recall_pct: pc(W ? w / W : null), precision_pct: pc(w / pass.length), base_precision_pct: pc(W / u.length), severe_loss40_pct: pc(pass.filter((p) => p.ret <= -0.4).length / pass.length), mean_ret_pct: pc(sum(pass.map((p) => p.ret)) / pass.length), median_ret_pct: pc(med(pass.map((p) => p.ret))), net_sol: r3(net), net_sol_parent: r3(base), net_per_opportunity_sol: r4(net / u.length), parent_net_per_opportunity_sol: r4(base / u.length),
        runners_kept: pass.filter((p) => p.reached_2x).length, runners_rejected: R - pass.filter((p) => p.reached_2x).length, first_half_n: a.length, first_half_net: r3(sum(a.map((p) => p.net_sol))), second_half_n: z.length, second_half_net: r3(sum(z.map((p) => p.net_sol))), net_without_best_mint: r3(net - top), status: "exploratory, in-sample" }); } } }
csv("candidate_tests.csv", tests, ["book", "feature", "rule", "n_universe", "missing", "n_pass", "mints_pass", "winner_recall_pct", "precision_pct", "base_precision_pct", "severe_loss40_pct", "mean_ret_pct", "median_ret_pct", "net_sol", "net_sol_parent", "net_per_opportunity_sol", "parent_net_per_opportunity_sol", "runners_kept", "runners_rejected", "first_half_n", "first_half_net", "second_half_n", "second_half_net", "net_without_best_mint", "status"]);

// ---------- exits on identical buys: the bot's own ten rows per buy are measured alternatives ----------
{ const out = []; for (const b of BOOKS) { const all = (groups.get(b) || []).filter((p) => !p.rebuy && p.entry_status === "filled"), byE = new Map(); for (const p of all) (byE.get(p.entry_id) || byE.set(p.entry_id, []).get(p.entry_id)).push(p);
    const full = [...byE.values()].filter((a) => a.length === 10 && a.every(measured)); if (!full.length) continue; // buys on which ALL ten rows are closed and measured: identical buys for every exit
    for (const st of [20, 25, 30, 40, 60]) for (const pol of ["trail", "scale"]) { const r = full.map((a) => a.find((p) => p.stop_pct === st && p.exit_policy === pol)); out.push({ book: b, identical_buys: full.length, stop_pct: st, exit_policy: pol, net_sol: r3(sum(r.map((p) => p.net_sol))), mean_ret_pct: pc(sum(r.map((p) => p.ret)) / r.length), median_ret_pct: pc(med(r.map((p) => p.ret))), win_pct: pc(r.filter((p) => p.ret > 0).length / r.length), loss40_pct: pc(r.filter((p) => p.ret <= -0.4).length / r.length), median_hold_min: r3(med(r.map((p) => p.hold_s)) / 60), halves_taken: r.filter((p) => p.half_sol != null).length }); } }
  csv("exit_comparison_identical_buys.csv", out); }

// ---------- class counts per book (default row) ----------
{ const out = []; for (const b of BOOKS) { const a = (groups.get(b) || []).filter((p) => p.stop_pct === 30 && p.exit_policy === "trail" && p.entry_status === "filled"), c = new Map(); for (const p of a) { const k = (p.rebuy ? "re-buy" : "first buy") + "|" + p.fin + "|" + p.path; const o = c.get(k) || c.set(k, { n: 0, net: 0 }).get(k); o.n++; o.net += p.net_sol || 0; } for (const [k, o] of [...c].sort()) { const [buys, fin, path] = k.split("|"); out.push({ book: b, buys, financial_outcome: fin, price_path_class: path, rows: o.n, net_sol: r3(o.net) }); }
    const mc = new Map(); for (const p of a.filter((p) => p.fin === "losing")) for (const m of p.mech.split("; ")) { const o = mc.get(m) || mc.set(m, { n: 0, net: 0 }).get(m); o.n++; o.net += p.net_sol; } for (const [m, o] of [...mc].sort((x, y) => y[1].n - x[1].n)) out.push({ book: b, buys: "all", financial_outcome: "losing", price_path_class: "LABEL: " + m, rows: o.n, net_sol: r3(o.net) }); }
  csv("class_counts.csv", out); }
fs.writeFileSync(D + "/manifest.json", JSON.stringify(man, null, 1));
