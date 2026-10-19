// v0.18.114 — the 4-hourly study's number-cruncher. Reads the A–D data set (data/abcd.csv from the `data` branch) and the strategy register
// (reports/strategies.json) and prints every table the study needs as JSON (--json) or Markdown (default). No dependencies, no network.
//   node scripts/study.mjs data/abcd.csv reports/strategies.json [--json] [--since <unix>]
// Cost model (measured live, 19 Oct, 81 legs at 0.1 SOL): fees ≈ 0.0033 SOL a round trip (3.3% at 0.1, scales with 1/stake), entry +2% above the
// paper price, sale below the paper exit: timed −1.6%, floor −3%, stop −4.5%, trail/cap/fade −3%. One rug in 49 booked −100% where paper said −42%.
import { readFileSync, existsSync } from "node:fs";
const args = process.argv.slice(2), csvPath = args[0], regPath = args[1], asJson = args.includes("--json"), sinceArg = args.indexOf("--since");
const SINCE = sinceArg > 0 ? Number(args[sinceArg + 1]) : 0;
function parseCsv(text) { const rows = []; let i = 0, field = "", row = [], q = false; const push = () => { row.push(field); field = ""; };
  while (i < text.length) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true; else if (c === ",") push(); else if (c === "\n") { push(); rows.push(row); row = []; } else if (c !== "\r") field += c; i++; }
  if (field.length || row.length) { push(); rows.push(row); }
  const head = rows[0]; return rows.slice(1).filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] === "" ? null : isNaN(r[k]) ? r[k] : Number(r[k])]))); }
const rows = parseCsv(readFileSync(csvPath, "utf8")).filter((r) => r.entry_ts >= SINCE);
const reg = regPath && existsSync(regPath) ? JSON.parse(readFileSync(regPath, "utf8")) : { strategies: [] };
const A = rows.filter((r) => r.book === "A"), Apass = A.filter((r) => r.pass === 1 && r.closed === 1);
const Cpass = rows.filter((r) => r.book === "C" && r.pass === 1 && r.closed === 1), Dpass = rows.filter((r) => r.book === "D" && r.pass === 1 && r.closed === 1), Epass = rows.filter((r) => r.book === "E" && r.pass === 1 && r.closed === 1);
const STAKE = 0.1, FEES = 0.0033 / STAKE;
const costOf = (x, exitKind = "auto") => FEES + 0.02 + (exitKind === "stop" || (exitKind === "auto" && x <= 0.62) ? 0.045 : exitKind === "floor" || (exitKind === "auto" && x >= 1.2 && x < 1.5) ? 0.03 : exitKind === "time" ? 0.016 : exitKind === "auto" ? 0.016 : 0.03);
const net = (x) => x * (1 - costOf(x)) - 1;
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null), median = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const pct = (v, d = 1) => (v == null ? "—" : (v >= 0 ? "+" : "") + (v * 100).toFixed(d) + "%");
const summ = (rs, col) => { const xs = rs.map((r) => r[col]).filter((x) => x != null); return { n: xs.length, avg: mean(xs.map((x) => x - 1)), net: mean(xs.map(net)), win: xs.length ? xs.filter((x) => x > 1).length / xs.length : null, stop: xs.length ? xs.filter((x) => x <= 0.62).length / xs.length : null, big: xs.length ? xs.filter((x) => x >= 2).length / xs.length : null }; };
const out = { generated: new Date().toISOString(), since: SINCE, counts: {}, exits: {}, bands: {}, live: {}, timing: {}, features: [], strategies: [] };
// 1. counts
const skipCounts = {}; for (const r of rows) if (r.pass !== 1) skipCounts[String(r.skip_why || "?").replace(/\d+ wallets/, "150+ wallets").replace(/bundled \d+%/, "bundled 70%+").replace(/\(.*\)/, "")] = (skipCounts[String(r.skip_why || "?").replace(/\d+ wallets/, "150+ wallets").replace(/bundled \d+%/, "bundled 70%+").replace(/\(.*\)/, "")] || 0) + 1;
out.counts = { triggers: rows.length, A: A.length, A_passed: A.filter((r) => r.pass === 1).length, A_closed_passed: Apass.length, C_passed: Cpass.length, D_passed: Dpass.length, E_passed: Epass.length, skips: skipCounts, live_legs: rows.filter((r) => r.live_mode === "live").length + rows.filter((r) => r.legB_mode === "live").length, shadow_legs: rows.filter((r) => r.live_mode === "shadow").length + rows.filter((r) => r.legB_mode === "shadow").length, first: rows.length ? rows[0].entry_utc : null, last: rows.length ? rows[rows.length - 1].entry_utc : null };
// 2. exits on A's coins (and C, D with the runner exit)
for (const [k, col] of [["A runner (live rule)", "x_flow4"], ["sell at 5 min (B)", "x_h5"], ["sell at 3 min", "x_h3"], ["sell at 15 min", "x_h15"], ["5 min, floor 1.4", "x_h5f14"], ["1.5x / −40%", "x_t15s40"]]) out.exits[k] = summ(Apass, col);
out.exits["C coins, runner"] = summ(Cpass, "x_flow4"); out.exits["D coins, runner"] = summ(Dpass, "x_flow4");
for (const [k, col] of [["E ($100K in 5 min) runner", "x_flow4"], ["E 1.5x / −40%", "x_t15s40"], ["E sell at 5 min", "x_h5"], ["E sell at 3 min", "x_h3"], ["E 2x / −40%", "x_t2s40"], ["E ½ at 2x + 40% trail", "x_h2t40"]]) out.exits[k] = summ(Epass, col);
// 3. time bands (UK)
const band = (a, b) => Apass.filter((r) => a <= b ? r.hour_uk >= a && r.hour_uk < b : r.hour_uk >= a || r.hour_uk < b);
for (const [a, b] of [[0, 6], [6, 12], [12, 18], [18, 24]]) out.bands[`${String(a).padStart(2, "0")}–${String(b).padStart(2, "0")}h`] = { runner: summ(band(a, b), "x_flow4"), h5: summ(band(a, b), "x_h5"), h3: summ(band(a, b), "x_h3") };
// 4. live vs paper on the same trades
// every executor leg: the A/C/D leg of a row (live_*) and B's leg on the same coin (legB_*)
const legs = []; for (const r of rows) { if (r.live_mode && r.live_pnl_sol != null) legs.push({ book: r.live_book, mode: r.live_mode, pnl: r.live_pnl_sol, stake: r.live_stake_sol, entryGap: r.live_entry_gap, exitGap: r.live_exit_gap, why: r.live_why || r.live_rule || "?", pm: r.live_book === "B" ? r.x_h5 : r.x_flow4 });
  if (r.legB_mode && r.legB_pnl_sol != null) legs.push({ book: "B", mode: r.legB_mode, pnl: r.legB_pnl_sol, stake: r.legB_stake_sol, entryGap: r.legB_entry_gap, exitGap: r.legB_exit_gap, why: r.legB_why || r.legB_rule || "?", pm: r.x_h5 }); }
for (const mode of ["live", "shadow"]) { const L = legs.filter((r) => r.mode === mode); if (!L.length) continue; const byBook = {};
  for (const r of L) { const b = byBook[r.book] || (byBook[r.book] = { n: 0, live: 0, paper: 0, entryGap: [], exitGap: [], byWhy: {} }); const pm = r.pm; b.n++; b.live += r.pnl; if (pm != null) b.paper += r.stake * (pm - 1); if (r.entryGap != null) b.entryGap.push(r.entryGap); if (r.exitGap != null) b.exitGap.push(r.exitGap);
    const w = r.why; const g = b.byWhy[w] || (b.byWhy[w] = { n: 0, live: 0, paper: 0, exitGap: [] }); g.n++; g.live += r.pnl; if (pm != null) g.paper += r.stake * (pm - 1); if (r.exitGap != null) g.exitGap.push(r.exitGap); }
  for (const b of Object.values(byBook)) { b.entryGap = mean(b.entryGap); b.exitGap = mean(b.exitGap); for (const g of Object.values(b.byWhy)) g.exitGap = mean(g.exitGap); } out.live[mode] = byBook; }
// 5. sell timing from the after-entry marks (A passed coins with a trace)
const MARKS = [10, 20, 30, 40, 50, 60, 120, 180, 300, 600]; const traced = Apass.filter((r) => r.t60_x != null);
out.timing.n = traced.length; out.timing.marks = {}; for (const m of MARKS) { const xs = traced.map((r) => r[`t${m}_x`]).filter((x) => x != null); out.timing.marks[m] = { n: xs.length, avg: mean(xs.map((x) => x - 1)), median: median(xs), win: xs.length ? xs.filter((x) => x > 1).length / xs.length : null, net_if_sold_here: mean(xs.map((x) => x * (1 - FEES - 0.02 - 0.016) - 1)) }; }
// momentum continuation: state at 60 s → outcome at 300 s and the paper runner result
const cond = (f) => { const t = traced.filter(f); return { n: t.length, x300: mean(t.map((r) => r.t300_x).filter((x) => x != null).map((x) => x - 1)), runner: summ(t, "x_flow4").avg, h5: summ(t, "x_h5").avg, h3: summ(t, "x_h3").avg }; };
out.timing.at60 = { "up ≥20% at 60 s": cond((r) => r.t60_x >= 1.2), "flat (0.9–1.2) at 60 s": cond((r) => r.t60_x >= 0.9 && r.t60_x < 1.2), "down <0.9 at 60 s": cond((r) => r.t60_x < 0.9), "new buyers ≥10 by 60 s": cond((r) => r.t60_nn >= 10), "new buyers <5 by 60 s": cond((r) => r.t60_nn < 5), "more sold than bought by 60 s": cond((r) => r.t60_ss > r.t60_bs), "holders up by 5 min": cond((r) => r.h300_n != null && r.h0_n != null && r.h300_n > r.h0_n), "holders down by 5 min": cond((r) => r.h300_n != null && r.h0_n != null && r.h300_n < r.h0_n) };
// 6. feature buckets (quartiles) on A's passed coins: runner and 5-min results per quartile
const FEATS = ["bundle_pct", "holders_entry", "top10_entry", "largest_entry", "dev_hold_entry", "snipers_n", "fresh_share", "proven_vol_share", "age_s", "entry_mc", "sol60", "wal60", "n60", "max_share", "avg_buy_sol", "sell60", "pre_m1_b", "pre_m1_s", "pre_m1_nb", "pre_m5_b", "pre_m5_nb", "pre_m5_ns", "pre_30sol_t", "pre_30sol_w", "feed_lag_ms", "t1_x", "t5_x", "t10_x", "t10_bs", "t10_nn", "t30_x", "t30_nn", "t30_ss", "t60_x", "t60_bs", "t60_ss", "t60_nn", "t60_mx", "h0_n", "h0_t10", "h60_n"];
for (const f of FEATS) { const v = Apass.filter((r) => r[f] != null && r.x_flow4 != null); if (v.length < 20) continue; const s = [...v].sort((a, b) => a[f] - b[f]); const q = Math.floor(s.length / 4); if (q < 5) continue;
  const quartiles = [s.slice(0, q), s.slice(q, 2 * q), s.slice(2 * q, 3 * q), s.slice(3 * q)].map((t) => ({ lo: t[0][f], hi: t[t.length - 1][f], n: t.length, runner: summ(t, "x_flow4").avg, runnerWin: summ(t, "x_flow4").win, h5: summ(t, "x_h5").avg, h3: summ(t, "x_h3").avg }));
  const lo = s.slice(0, Math.floor(s.length / 2)), hi = s.slice(Math.floor(s.length / 2)); const spread = (summ(hi, "x_flow4").avg ?? 0) - (summ(lo, "x_flow4").avg ?? 0);
  out.features.push({ feature: f, n: v.length, median: median(v.map((r) => r[f])), quartiles, halfSplit: { lo: summ(lo, "x_flow4"), hi: summ(hi, "x_flow4"), spread } }); }
out.features.sort((a, b) => Math.abs(b.halfSplit.spread) - Math.abs(a.halfSplit.spread));
// 7. the strategy register: each rule scored on the trades it was proposed from (in-sample) and on every trade after it (out of sample)
const OPS = { "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "==": (a, b) => a == b, "!=": (a, b) => a != b };
const passes = (r, conds) => (conds || []).every((c) => r[c.f] != null && OPS[c.op] && OPS[c.op](r[c.f], c.v));
for (const st of reg.strategies || []) { const base = (st.book === "C" ? Cpass : st.book === "D" ? Dpass : st.book === "E" ? Epass : Apass); const col = st.exit || "x_flow4";
  const ins = base.filter((r) => r.entry_ts <= st.after_ts && passes(r, st.filter)), oos = base.filter((r) => r.entry_ts > st.after_ts && passes(r, st.filter)), oosAll = base.filter((r) => r.entry_ts > st.after_ts);
  out.strategies.push({ id: st.id, note: st.note, book: st.book || "A", exit: col, filter: st.filter, proposed: st.created, in_sample: summ(ins, col), out_of_sample: summ(oos, col), out_of_sample_baseline: summ(oosAll, col), verdict: oos.length < 40 ? `waiting (${oos.length}/40 trades)` : (summ(oos, col).net ?? -1) > (summ(oosAll, col).net ?? -1) + 0.02 && (summ(oos, col).net ?? -1) > 0 ? "HOLDS UP" : "does not hold up" }); }
if (asJson) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
// Markdown
const f3 = (v) => (v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(3)); const p = (v) => (v == null ? "—" : Math.round(v * 100) + "%");
const L = []; const c = out.counts;
L.push(`## Data`, `Triggers since the price fix: **${c.triggers}** (${c.first} → ${c.last} UTC). A: ${c.A} fired, ${c.A_passed} passed the filters, ${c.A_closed_passed} closed. C passed: ${c.C_passed} · D passed: ${c.D_passed} · E ($100K/5 min) passed: ${c.E_passed}. Live legs: ${c.live_legs} · shadow legs: ${c.shadow_legs}.`, `Skipped by the filters: ${Object.entries(c.skips).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"}.`, "");
L.push(`## Sell rules on A's coins, then C / D / E (paper, before costs → net at 0.1 SOL with the measured costs)`, `| rule | n | avg/trade | net @0.1 | win | stopped | ≥2x |`, `|---|---|---|---|---|---|---|`);
for (const [k, s] of Object.entries(out.exits)) L.push(`| ${k} | ${s.n} | ${pct(s.avg)} | ${pct(s.net)} | ${p(s.win)} | ${p(s.stop)} | ${p(s.big)} |`);
L.push("", `## Time of day (UK) — A's coins`, `| band | n | runner | 5-min | 3-min | runner win |`, `|---|---|---|---|---|---|`);
for (const [k, b] of Object.entries(out.bands)) L.push(`| ${k} | ${b.runner.n} | ${pct(b.runner.avg)} | ${pct(b.h5.avg)} | ${pct(b.h3.avg)} | ${p(b.runner.win)} |`);
for (const mode of ["live", "shadow"]) { if (!out.live[mode]) continue; L.push("", `## ${mode === "live" ? "Live" : "Shadow"} vs paper — the same trades`, `| book | n | ${mode} SOL | paper SOL (0%) | entry gap | exit gap |`, `|---|---|---|---|---|---|`);
  for (const [k, b] of Object.entries(out.live[mode])) L.push(`| ${k} | ${b.n} | ${f3(b.live)} | ${f3(b.paper)} | ${pct(b.entryGap)} | ${pct(b.exitGap)} |`);
  L.push("", `| book · exit | n | ${mode} SOL | paper SOL | exit gap |`, `|---|---|---|---|---|`); for (const [k, b] of Object.entries(out.live[mode])) for (const [w, g] of Object.entries(b.byWhy)) L.push(`| ${k} · ${w} | ${g.n} | ${f3(g.live)} | ${f3(g.paper)} | ${pct(g.exitGap)} |`); }
L.push("", `## When to sell — the price path after entry (A's passed coins with a trace, n ${out.timing.n})`, `| seconds after entry | n | avg | median | above entry | net if sold here @0.1 |`, `|---|---|---|---|---|---|`);
for (const [m, s] of Object.entries(out.timing.marks)) L.push(`| ${m} | ${s.n} | ${pct(s.avg)} | ${s.median == null ? "—" : s.median.toFixed(3)} | ${p(s.win)} | ${pct(s.net_if_sold_here)} |`);
L.push("", `| state at 60 s | n | avg at 5 min | runner | 5-min | 3-min |`, `|---|---|---|---|---|---|`); for (const [k, s] of Object.entries(out.timing.at60)) L.push(`| ${k} | ${s.n} | ${pct(s.x300)} | ${pct(s.runner)} | ${pct(s.h5)} | ${pct(s.h3)} |`);
L.push("", `## Entry features — A's passed coins split at the median (runner result; spread = top half minus bottom half)`, `| feature | n | median | bottom half | top half | spread |`, `|---|---|---|---|---|---|`);
for (const ft of out.features.slice(0, 20)) L.push(`| ${ft.feature} | ${ft.n} | ${typeof ft.median === "number" ? +ft.median.toFixed(3) : ft.median} | ${pct(ft.halfSplit.lo.avg)} (win ${p(ft.halfSplit.lo.win)}) | ${pct(ft.halfSplit.hi.avg)} (win ${p(ft.halfSplit.hi.win)}) | ${pct(ft.halfSplit.spread)} |`);
L.push("", `Quartiles of the five widest spreads:`); for (const ft of out.features.slice(0, 5)) L.push(`- **${ft.feature}**: ${ft.quartiles.map((q) => `${+(+q.lo).toFixed(2)}–${+(+q.hi).toFixed(2)}: ${pct(q.runner)} (n ${q.n})`).join(" · ")}`);
L.push("", `## Strategy register — proposed earlier, scored on the trades that came after`, `| id | rule | proposed | in-sample | out of sample | baseline (all trades since) | verdict |`, `|---|---|---|---|---|---|---|`);
for (const s of out.strategies) L.push(`| ${s.id} | ${s.note} — ${(s.filter || []).map((c) => `${c.f} ${c.op} ${c.v}`).join(" & ") || "no filter"}, exit ${s.exit} | ${s.proposed} | ${pct(s.in_sample.net)} (n ${s.in_sample.n}) | ${pct(s.out_of_sample.net)} (n ${s.out_of_sample.n}) | ${pct(s.out_of_sample_baseline.net)} (n ${s.out_of_sample_baseline.n}) | ${s.verdict} |`);
if (!out.strategies.length) L.push(`| — | nothing registered yet | | | | | |`);
console.log(L.join("\n"));
