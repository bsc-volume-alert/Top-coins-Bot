// study-migration.mjs — READ-ONLY replay of "buy a migrated coin N minutes after it migrated if it is worth more than $X".
//   node older/scripts/study-migration.mjs [run=valid11] [cap=50000]
// Owner, 26 Nov 2026 22:44–22:46 UK: 5 minutes and 10 minutes after migration, buy if the coin is over $50K ("that kind of
// avoids the immediate rug on migration"); the $100K+ buys are a part of those and are reported as their own band.
// Opens the run's database READ-ONLY (the running bot is not touched, nothing is bought, sold or changed), works from the
// stored one-minute bars, writes <OUT>/pub/study-migration.json (picked up by the 10-minute publisher) and prints a summary.
// No key is read or written and no provider is asked. See src/migstudy.mjs for how a sale is priced from minute bars.
//
// WHICH COINS: only coins whose migration this run SAW —
//   (a) the coin first became known through its pool-creation event (first_seen is that second), or
//   (b) the new-coin books already knew the coin and its pool's first trade came later (moment = that minute, ±60 s).
// A coin that had already migrated when the run began is left out: its first bar here is not its migration.
// MARKET CAP = bar price × 1,000,000,000 (a pump.fun coin's supply; checked below against the bot's own filled buys).
import Database from "better-sqlite3";
import { writeFileSync, mkdirSync } from "node:fs";
import { priceAt, replay, summarise } from "../src/migstudy.mjs";
const RUN = process.argv[2] || "valid11", CAP = Number(process.argv[3] || 50000), OUT = process.env.OLDER_OUT || "/mnt/volume_1794164707392/older", SUPPLY = 1e9;
const db = new Database(`${OUT}/older-${RUN}.db`, { readonly: true, fileMustExist: true });
const now = Date.now() / 1000, r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)), K = (x) => (x == null ? null : Math.round(x));
const runStart = (db.prepare("SELECT MIN(m) m FROM bars").get().m || 0) * 60;
// supply check: the bot's own filled pool buys carry the cap and the price it used
const sup = []; for (const row of db.prepare("SELECT json FROM entries WHERE status = 'filled'").iterate()) { try { const e = JSON.parse(row.json); if (e.signalPx > 0 && e.signalMc > 0 && e.exec !== "routed-quote" && !(e.families || []).some((f) => f.startsWith("NEW"))) sup.push(e.signalMc / e.signalPx); } catch {} }
sup.sort((a, b) => a - b); const supCheck = sup.length ? { n: sup.length, median: Math.round(sup[sup.length >> 1]), p10: Math.round(sup[Math.floor(sup.length * 0.1)]), p90: Math.round(sup[Math.floor(sup.length * 0.9)]) } : null;

const firstBar = db.prepare("SELECT m, o, src FROM bars WHERE mint = ? ORDER BY m LIMIT 1"), barsOf = db.prepare("SELECT m, o, h, l, c, v FROM bars WHERE mint = ? AND m >= ? AND m <= ? ORDER BY m");
const cnt = { coins_with_pool: 0, no_bars: 0, seen_by_pool_event: 0, known_before_pool: 0, not_seen_migrating: 0, backfilled_first_bar: 0, too_recent: 0 };
const migs = [];
for (const c of db.prepare("SELECT mint, create_ts, create_src, pump_origin, first_seen, info FROM coins WHERE pool IS NOT NULL").iterate()) {
  cnt.coins_with_pool++; const fb = firstBar.get(c.mint); if (!fb) { cnt.no_bars++; continue; }
  if (fb.src !== "live") { cnt.backfilled_first_bar++; continue; }
  const t0 = fb.m * 60, gap = c.first_seen == null ? null : t0 - c.first_seen; let T = null, how = null;
  if (c.first_seen != null && c.first_seen >= runStart && gap >= -60 && gap <= 120) { T = c.first_seen; how = "pool event"; cnt.seen_by_pool_event++; }
  else if (c.first_seen != null && c.first_seen >= runStart && gap > 120 && String(c.create_src || "").startsWith("jupiter") && c.pump_origin === "pump.fun") { T = t0; how = "first pool trade"; cnt.known_before_pool++; }
  else { cnt.not_seen_migrating++; continue; }
  if (now - T < 15 * 60) { cnt.too_recent++; continue; }
  let sym = null; try { sym = JSON.parse(c.info || "{}").symbol ?? null; } catch {}
  migs.push({ mint: c.mint, sym, T, how, created: c.create_ts ?? null, m0: fb.m });
}
// the new-coin books' readings of these coins (by the table's index on the coin)
const chkOf = db.prepare("SELECT t, book, j FROM nc_checks WHERE mint = ? ORDER BY t, id"); let checksRead = 0;
for (const g of migs) for (const row of chkOf.all(g.mint)) { let j; try { j = JSON.parse(row.j); } catch { continue; } checksRead++; (g.checks ||= []).push({ t: row.t, book: row.book, ...j }); if (!g.sym && j.sym) g.sym = j.sym; }
const runners = new Map(); try { for (const r of db.prepare("SELECT mint, peak FROM nc_runners").iterate()) runners.set(r.mint, r.peak); } catch {}
const reading = (g, t) => { const cs = (g.checks || []).filter((c) => c.t <= t && (c.fees != null || c.top10 != null || c.g)); if (!cs.length) return null; const c = cs[cs.length - 1], x = c.g || {};
  return { age_s: K(t - c.t), book: c.book, holders: c.holders ?? null, vol: K(c.vol), liq: K(c.liq), fees: r3(c.fees), top10: r3(c.top10), bund: r3(x.bundlers), snip: r3(x.snipers), ins: r3(x.insiders), phish: r3(x.phishing), dev: r3(x.dev_hold) }; };

const rows = [], MARKS = [0, 1, 5, 10, 15, 30, 60];
for (const g of migs) {
  const bars = barsOf.all(g.mint, g.m0, Math.floor(g.T / 60) + 1440 + 20); if (!bars.length) continue;
  const caps = {}; for (const k of MARKS) { const p = k === 0 ? { px: bars[0].o, quiet_min: 0 } : priceAt(bars, g.T + k * 60); caps[k] = p ? K(p.px * SUPPLY) : null; }
  const row = { mint: g.mint.slice(0, 8), sym: g.sym, t: K(g.T), how: g.how, age_at_mig_min: g.created ? K((g.T - g.created) / 60) : null, caps, runner_peak: runners.has(g.mint) ? K(runners.get(g.mint)) : null, buys: {} };
  for (const w of [5, 10]) { const e = priceAt(bars, g.T + w * 60); if (!e) continue; const mc = e.px * SUPPLY; row["quiet_" + w] = e.quiet_min; if (!(mc > CAP)) continue;
    const r = replay(bars, e); row.buys[w] = { mc: K(mc), high: r3(r.high), high_min: r.high_min, low: r3(r.low), at: Object.fromEntries(Object.entries(r.at).map(([k, v]) => [k, r3(v)])), st: Object.fromEntries(Object.entries(r.stops).map(([k, v]) => [k, [r3(v.cautious), r3(v.best), v.hold_min, v.open ? 1 : 0]])), rd: reading(g, g.T + w * 60) };
    g["r" + w] = { r, mc, rd: row.buys[w].rd }; }
  rows.push(row);
}
// ---- summaries
const span = migs.length ? (now - Math.min(...migs.map((x) => x.T))) / 86400 : 0, band = (mc) => (mc < 100e3 ? "$50–100K" : mc < 300e3 ? "$100–300K" : "$300K+");
const dist = (k) => { const v = rows.map((x) => x.caps[k]).filter((x) => x != null), n = v.length || 1, sh = (f) => +(100 * v.filter(f).length / n).toFixed(1); const s = [...v].sort((a, b) => a - b);
  return { n: v.length, median: s[s.length >> 1] ?? null, under_20k_pct: sh((x) => x < 20e3), k20_50_pct: sh((x) => x >= 20e3 && x <= CAP), k50_100_pct: sh((x) => x > CAP && x < 100e3), over_100k_pct: sh((x) => x >= 100e3) }; };
const summary = { caps_after_migration: Object.fromEntries(MARKS.map((k) => [k, dist(k)])), variants: {} };
for (const w of [5, 10]) { const B = migs.filter((g) => g["r" + w]).map((g) => ({ r: g["r" + w].r, mc: g["r" + w].mc, rd: g["r" + w].rd }));
  const v = { all: summarise(B), per_day: span ? +(B.length / span).toFixed(1) : null, bands: {}, with_reading: B.filter((x) => x.rd).length, lines: {} };
  for (const b of ["$50–100K", "$100–300K", "$300K+"]) v.bands[b] = summarise(B.filter((x) => band(x.mc) === b));
  const L = { "fees 5 SOL or more": (d) => d.fees != null && d.fees >= 5, "fees under 5 SOL": (d) => d.fees != null && d.fees < 5, "top 10 over 17.5%": (d) => d.top10 != null && d.top10 > 0.175, "top 10 17.5% or less": (d) => d.top10 != null && d.top10 <= 0.175, "bundlers under 35%": (d) => d.bund != null && d.bund < 0.35, "bundlers 35% or more": (d) => d.bund != null && d.bund >= 0.35, "phishing under 4%": (d) => d.phish != null && d.phish < 0.04, "phishing 4% or more": (d) => d.phish != null && d.phish >= 0.04, "fees 5+ and top 10 over 17.5%": (d) => d.fees >= 5 && d.top10 > 0.175 };
  for (const [k, f] of Object.entries(L)) v.lines[k] = summarise(B.filter((x) => x.rd && f(x.rd)));
  summary.variants[w] = v; }
mkdirSync(`${OUT}/pub`, { recursive: true }); const file = `${OUT}/pub/study-migration.json`;
writeFileSync(file, JSON.stringify({ study: "migration replay", run: RUN, at: Math.round(now), run_start: runStart, days: +span.toFixed(2), cap_line: CAP, supply_assumed: SUPPLY, supply_check: supCheck, counts: { ...cnt, migrations_used: rows.length, checks_joined: checksRead }, method: "one-minute bars; cautious = sold at the close of the minute the stop was hit in when that minute closed under the level, best = sold at the level; no fee or price impact", summary, rows }));
// ---- printed summary (plain)
const P = (s) => console.log(s), line = (nm, s) => { if (!s.n) return P(`  ${nm.padEnd(30)} 0 buys`); const a = s.stops[25], b = s.stops[40]; P(`  ${nm.padEnd(30)} ${String(s.n).padStart(4)} buys | reached 2x ${s.reached_2x_pct}% | never +10% ${s.never_up_10_pct}% | fell 90% ${s.fell_90_pct}% | 25% stop: cautious ${a.cautious_mean}% (median ${a.cautious_median}%, ${a.cautious_wins} won, ${a.cautious_less_best2}% without best 2), best case ${a.best_mean}% | 40% stop: cautious ${b.cautious_mean}%, best case ${b.best_mean}%`); };
P(`migration replay, run ${RUN}: ${rows.length} migrations seen over ${span.toFixed(2)} days (${cnt.seen_by_pool_event} by pool event, ${cnt.known_before_pool} known before; left out: ${cnt.not_seen_migrating} not seen migrating, ${cnt.backfilled_first_bar} backfilled, ${cnt.too_recent} too recent, ${cnt.no_bars} no bars)`);
P(`supply check (cap / price on the bot's own pool buys): ${supCheck ? `median ${supCheck.median.toLocaleString("en-GB")} over ${supCheck.n} buys (10th–90th: ${supCheck.p10.toLocaleString("en-GB")}–${supCheck.p90.toLocaleString("en-GB")})` : "no buys to check against"}`);
for (const k of MARKS) { const d = summary.caps_after_migration[k]; P(`  cap ${String(k).padStart(2)} min after migration: median $${d.median == null ? "?" : Math.round(d.median / 1000) + "K"} | under $20K ${d.under_20k_pct}% | $20K–${CAP / 1000}K ${d.k20_50_pct}% | $${CAP / 1000}K–100K ${d.k50_100_pct}% | $100K+ ${d.over_100k_pct}%`); }
for (const w of [5, 10]) { const v = summary.variants[w]; P(`\nBUY ${w} MINUTES AFTER MIGRATION IF OVER $${CAP / 1000}K — ${v.per_day} buys a day, ${v.with_reading} with a GMGN reading`); line("all", v.all); for (const [b, s] of Object.entries(v.bands)) line("cap " + b, s); for (const [k, s] of Object.entries(v.lines)) line(k, s); }
P(`\nwritten to ${file} — it will be published within 10 minutes. Nothing was changed.`);
