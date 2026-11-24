// build.mjs — turns the raw database copy (branch older-review-data) into the review package's CSV files.
// Read-only analysis tooling: it never talks to the bot, the server, a wallet or any trading endpoint.
//   node build.mjs <raw-dump-dir> <repo-dir> <out-dir>
// <repo-dir> is a checkout of branch older-coins (the rule constants and the bot's own row mapping are imported from it,
// so the package uses exactly the bot's definitions).
import fs from "node:fs"; import zlib from "node:zlib"; import crypto from "node:crypto"; import path from "node:path";
import { execSync } from "node:child_process";
const [RAW, REPO, OUT] = process.argv.slice(2);
const S = await import(path.resolve(REPO, "older/src/spec.mjs")), B = await import(path.resolve(REPO, "older/src/book.mjs")), PG = await import(path.resolve(REPO, "older/src/page.mjs"));
fs.mkdirSync(OUT, { recursive: true });
const MAN = JSON.parse(fs.readFileSync(RAW + "/manifest.json", "utf8"));
export function* rows(name) { const t = MAN.tables[name]; if (!t) return; for (const f of t.files) { const txt = zlib.gunzipSync(fs.readFileSync(RAW + "/" + f.f)).toString("utf8"); let i = 0; while (i < txt.length) { const j = txt.indexOf("\n", i); if (j < 0) break; const a = JSON.parse(txt.slice(i, j)); i = j + 1; const o = {}; t.cols.forEach((c, k) => (o[c] = a[k])); yield o; } } }
const esc = (v) => { if (v == null) return ""; if (typeof v === "number") return String(v); /* full precision: a 0.7 s schedule must be auditable from the CSV */ if (typeof v === "boolean") return v ? "1" : "0"; const s = typeof v === "string" ? v : JSON.stringify(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const written = {};
function csv(name, cols, data, gz = false) { const body = cols.join(",") + "\n" + data.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n") + "\n"; const f = name + (gz ? ".gz" : ""), buf = gz ? zlib.gzipSync(body) : Buffer.from(body); fs.writeFileSync(OUT + "/" + f, buf); written[f] = { rows: data.length, bytes: buf.length, sha256: crypto.createHash("sha256").update(buf).digest("hex") }; console.log(f, data.length); }
const iso = (t) => (t == null ? null : new Date(t * 1000).toISOString().replace(".000Z", "Z").slice(0, 19) + "Z"), r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4)), r6 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(6)), ts = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3)); // ts: epoch seconds to the millisecond
const COST = B.COST, CUT = Date.parse(MAN.cutoff_utc) / 1000;

// ---------- meta, coins ----------
const meta = {}; for (const r of rows("meta")) meta[r.k] = r.v;
const coins = new Map(); for (const r of rows("coins")) { let info = {}; try { info = JSON.parse(r.info || "{}") || {}; } catch {} coins.set(r.mint, { ...r, info }); }
const sym = (m) => coins.get(m)?.info?.symbol ?? null;

// ---------- books.csv / variants.csv ----------
const POLLED_UNSUPPORTED = new Set(["HH-BREAK", "HH-BREAK-4H", ...S.HH_FAST.map((x) => x[0]), ...S.ANY_AGE]);
const SPEC_ADDED = { "older-1": ["AGE-DOUBLE", "LOW4H", "CONT", "SLOW-BUILD", "HH-BREAK", "CONT-STALL", "LOW4H-LIQ25K"], "older-2": ["FAST-1M", "FAST-3M", "FAST-5M", "FAST150-1M", "FAST150-3M", "FAST150-5M", "SECOND-WAVE"], "older-4": ["FAST-10M", "FAST-30M", "FAST150-10M"], "older-6": ["HH30-5M", "HH30-10M", "HH15-5M"], "older-7": ["HH-BREAK-4H"], "older-8": [...S.ANY_AGE], "fee-book (22 Nov, commit e4a5a3b)": [S.FEE_BOOK] };
const specOf = (f) => Object.entries(SPEC_ADDED).find(([, a]) => a.includes(f))?.[0] ?? null;
const BOOKS = [...S.FAMILIES, S.FEE_BOOK];
csv("books.csv", ["book", "category", "entry_rule", "ages", "band_usd", "observation_method", "stops_pct", "exit_policies", "clock_base", "clock_at_s", "clock_min_peak_x", "added_in", "counting_since_utc", "comparison_rows"], BOOKS.map((f) => {
  const fee = f === S.FEE_BOOK, any = S.ANY_AGE.has(f), ck = S.CLOCK[f], ages = fee ? ["A0", "A1", "A2", "A3", "A4"] : S.agesOf(f).map((a) => a[0]);
  return { book: f, category: fee ? "FEE-COINS (reporting book: every buy of a transfer-fee coin, whichever rule bought it)" : ck ? "clock book (shares the buys of " + ck.base + ", adds a timed sale)" : any ? "any-age rule book (also the first 8 hours, A0)" : "rule book",
    entry_rule: PG.RULES[f], ages: ages.join(" "), band_usd: S.VOL.some((x) => x[0] === f) ? `${S.BAND_LO_USD}-${S.VOL_BAND_HI_USD}` : `${S.BAND_LO_USD}-${S.BAND_HI_USD}`,
    observation_method: fee ? "sampled/routed only (Jupiter prices and quotes); fee coins on live PumpSwap are not entered" : POLLED_UNSUPPORTED.has(f) ? "live PumpSwap only (rule needs per-trade volume; sampled coins are not evaluated)" : "live PumpSwap pool events and sampled/routed (Jupiter) coins",
    stops_pct: S.STOPS.map((s) => s * 100).join(" "), exit_policies: "trail (trailing stop only); scale (sell half at 2x cost, trail the rest)", clock_base: ck?.base ?? null, clock_at_s: ck?.at ?? null, clock_min_peak_x: ck?.minPeak ?? null,
    added_in: specOf(f), counting_since_utc: iso(Number(meta["since:" + f]) || null), comparison_rows: fee ? null : ages.length * S.STOPS.length * S.POLICIES.length }; }));
const variants = []; for (const f of S.FAMILIES) for (const [ag] of S.agesOf(f)) for (const st of S.STOPS) for (const p of S.POLICIES) variants.push({ variant: `${f}|${ag}|${st * 100}|${p}`, family: f, age_group: ag, stop_pct: st * 100, exit_policy: p, stop_counting_since_utc: iso(Number(meta["since:stop:" + st]) || null), website_default: st === 0.3 && p === "trail" ? 1 : 0 });
csv("variants.csv", ["variant", "family", "age_group", "stop_pct", "exit_policy", "stop_counting_since_utc", "website_default"], variants);

// ---------- code_rule_periods.csv (git history of the bot's source) ----------
const SPECAT = (h) => { try { return /SPEC_VER = "([^"]+)"/.exec(execSync(`git -C ${REPO} show ${h}:older/src/spec.mjs`, { encoding: "utf8", maxBuffer: 1e8 }))?.[1] ?? null; } catch { return null; } };
const WEB = /website|page|diagnostics only|Display/i;
const commits = execSync(`git -C ${REPO} log --reverse --format=%H%x09%ct%x09%s origin/older-coins -- older/src`, { encoding: "utf8" }).trim().split("\n").map((l) => { const [h, t, s] = l.split("\t"); return { commit: h.slice(0, 7), committed_utc: iso(+t), t: +t, spec: SPECAT(h), kind: WEB.test(s) && !/spec older|review|fix for|fixes for/i.test(s) ? "website/diagnostics" : "rules/accounting/engine", subject: s }; });

// ---------- feed events → coverage_and_incidents.csv ----------
const feed = [...rows("feed")];
const starts = feed.filter((f) => /restart-gap/.test(f.ev)).map((f) => f.t);
// RECORDED STARTS: since commit ae09be1 (first deployed 20 Nov 17:29 UTC) the program writes a feed row "start" with the commit it runs (main.mjs). These are facts.
// Before the first such record the commit of a start is not recorded: those periods are labelled unknown, with the inferred
// commit (newest source commit before the start) kept in a separate column and marked as an inference.
const startRecs = feed.filter((f) => f.ev === "start").map((f) => ({ t: f.t, commit: (/commit ([0-9a-f]{7,40})/.exec(f.detail || "") || [])[1]?.slice(0, 7) ?? null })).sort((a, b) => a.t - b.t);
{ const out = []; let down = null, pdown = null;
  for (const f of feed) { const r = { t_utc: iso(f.t), t: r4(f.t), event: f.ev, detail: f.detail, duration_s: null };
    if (f.ev === "down") down = f.t; else if (f.ev === "up" && down != null) { r.duration_s = r4(f.t - down); down = null; }
    if (f.ev === "poll-down") pdown = f.t; else if (f.ev === "poll-up" && pdown != null) { r.duration_s = r4(f.t - pdown); pdown = null; }
    if (/restart-gap/.test(f.ev) && Number(f.detail) > 0) { r.duration_s = r4(f.t - Number(f.detail)); r.detail = "program not running from " + iso(Number(f.detail)) + " to this time"; }
    out.push(r); }
  csv("coverage_and_incidents.csv", ["t_utc", "t", "event", "detail", "duration_s"], out); }
// deployed period of a time: the newest source commit committed before the latest program start at or before that time (INFERRED:
// the database does not store the commit of each start; the server's own record is in pub-state.json for the current start only)
const specOfCommit = (h) => commits.find((k) => k.commit === h)?.spec ?? SPECAT(h);
const periodOf = (t) => { let st = null; for (const s of starts) if (s <= t) st = s; if (st == null) st = Number(meta.first_start) || t; let c = null; for (const k of commits) if (k.t <= st) c = k;
  let rec = null; for (const r of startRecs) if (r.t <= t) rec = r;
  return rec ? { commit: rec.commit, spec: specOfCommit(rec.commit), start: rec.t, basis: "recorded start", inferred: c?.commit ?? null } : { commit: null, spec: c?.spec ?? null, start: st, basis: "not recorded (before the first start record)", inferred: c?.commit ?? null }; };
csv("code_rule_periods.csv", ["commit", "committed_utc", "spec", "kind", "recorded_starts", "first_recorded_start_utc", "subject"], commits.map((c) => { const r = startRecs.filter((x) => x.commit === c.commit); return { ...c, recorded_starts: r.length, first_recorded_start_utc: iso(r[0]?.t ?? null) }; }));
csv("program_starts.csv", ["start_utc", "start_t", "commit", "spec", "basis"], [...(Number(meta.first_start) ? [{ start_utc: iso(Number(meta.first_start)), start_t: ts(Number(meta.first_start)), commit: null, spec: null, basis: "first start of this database; commit not recorded" }] : []), ...starts.filter((s) => !startRecs.length || s < startRecs[0].t - 5).map((s) => ({ start_utc: iso(s), start_t: ts(s), commit: null, spec: null, basis: "restart seen in the feed log; commit not recorded" })), ...startRecs.map((r) => ({ start_utc: iso(r.t), start_t: ts(r.t), commit: r.commit, spec: specOfCommit(r.commit), basis: "recorded start" }))]);

// ---------- bars of bought coins ----------
const bars = new Map(); for (const r of rows("bars_bought")) { let a = bars.get(r.mint); if (!a) bars.set(r.mint, (a = [])); a.push(r); }
for (const a of bars.values()) a.sort((x, y) => x.m - y.m);
function pathStats(mint, t0, t1, p0) { // spot path between two times relative to p0 (USD per token); live and accepted back-fill bars only
  const a = bars.get(mint); if (!a || !(p0 > 0) || t1 == null) return null; const m0 = Math.floor(t0 / 60) + 1, m1 = Math.floor(t1 / 60) - 1; /* ONLY minutes wholly inside (t0, t1): the minute containing the fill and the minute containing the sale are left out, because a one-minute bar cannot say which of its prices came before or after that instant. OHLC gives no order of events: never infer a stop/target sequence from it. */ let hi = -Infinity, lo = Infinity, hiM = null, loM = null, n = 0, last = null;
  let i = 0, j = a.length; while (i < j) { const k = (i + j) >> 1; if (a[k].m < m0) i = k + 1; else j = k; }
  for (; i < a.length && a[i].m <= m1; i++) { const b = a[i]; if (b.src === "backfill-rejected") continue; n++; if (b.h > hi) { hi = b.h; hiM = b.m; } if (b.l < lo) { lo = b.l; loM = b.m; } last = b.c; }
  return n ? { n, hi: hi / p0, lo: lo / p0, hi_s: hiM * 60 - t0, lo_s: loM * 60 - t0, last: last / p0 } : { n: 0 }; }

// ---------- entries, fills, sales, positions, features ----------
const E = [], F = [], SL = [], P = [], FE = [], CD = [];
const KNOWN = new Set(["id", "mint", "pool", "ag", "decisionT", "schedT", "families", "features", "signalMc", "signalPx", "evidence", "startup", "status", "fill", "versions", "runner", "flags", "cands", "pop", "mode", "exec", "valuation", "age_basis", "state_approx", "token", "touched", "mark", "again", "snap", "verify", "warm_gap_s"]), extraKeys = {};
const entries = []; for (const r of rows("entries")) { const e = JSON.parse(r.json); e._done = r.done; entries.push(e); }
entries.sort((a, b) => a.id - b.id);
const evc = (x) => (x.est ? "ESTIMATED from one-minute prices (not a measured sale)" : x.exec === "routed-quote" ? "MEASURED: routed quote, quoted amounts saved" : x.pool?.q != null && x.pool?.b != null ? "MEASURED: pool reserves and fee saved with the sale (independently repricable)" : "MEASURED by the bot at the time; pool reserves NOT saved on this leg (cannot be repriced independently)");
const bookOf = (e, f) => (e.token?.xfer_bps > 0 ? S.FEE_BOOK : f);
for (const e of entries) {
  for (const k of Object.keys(e)) if (!KNOWN.has(k) && k !== "_done") extraKeys[k] = (extraKeys[k] || 0) + 1;
  const per = periodOf(e.decisionT), tk = e.token || {}, tr = e.evidence?.trigger || {}, f = e.fill, again = Object.keys(e.again || {});
  const q = []; // evidence-quality flags (machine labels; the bot's own free-text flags are kept in `flags`)
  if (tk.xfer_bps > 0) q.push("fee-coin"); if (e.warm_gap_s > 0) q.push("warm-gap-in-decision-window"); if (e.startup) q.push("startup-24h"); if (e.mode === "polled") q.push("sampled-method");
  if (f && f.fee_src && f.fee_src !== "event" && e.mode !== "polled") q.push("buy-fee-assumed"); if (e.state_approx) q.push("state-approx"); if (e.verify?.suspect) q.push("verify-suspect"); if (e.verify?.error) q.push("verify-error");
  if (f && f.delay_s > 3) q.push("late-buy>3s"); if (tr.block_ts != null && e.decisionT - tr.block_ts > 10) q.push("feed-late>10s-at-signal"); if (f && f.state_age_s > 5) q.push("buy-state-age>5s"); if (tk.risk_status && tk.risk_status !== "ok" && tk.risk_status !== "clean") q.push("risk-status:" + tk.risk_status);
  const rowsN = e.versions.length;
  E.push({ entry_id: e.id, mint: e.mint, symbol: tk.symbol ?? sym(e.mint), pool: e.pool, age_group: e.ag, families: e.families.join("+"), rebuy_families: again.join("+"), is_rebuy_any: again.length ? 1 : 0, rows_carried: rowsN, method: e.mode, population: e.pop, exec_model: e.exec,
    signal_utc: iso(e.decisionT), signal_t: ts(e.decisionT), sched_fill_t: ts(e.schedT), eval_t: ts(tr.eval_t), block_ts: tr.block_ts ?? null, feed_lag_s: tr.block_ts != null ? r4(e.decisionT - tr.block_ts) : null, eval_lag_s: tr.eval_t != null ? r4(tr.eval_t - e.decisionT) : null, status: e.status, done: e._done, startup: e.startup ? 1 : 0,
    signal_mc_usd: Math.round(e.signalMc), signal_px_usd: e.signalPx, sol_usd: tr.sol_usd ?? null, token_age_s: tr.age_s ?? e.features?.age_s ?? null, age_basis: e.age_basis, token_program: tk.token_program, xfer_fee_bps: tk.xfer_bps ?? 0, risk_status: tk.risk_status, origin: tk.origin, venues: tk.venues, cadence_s: tk.cadence_s ?? tr.cadence_s ?? null,
    trigger_kind: tr.kind, trigger_sig: tr.sig, trigger_slot: tr.slot, coverage: tr.coverage, warm_gap_s: e.warm_gap_s ?? null, runner_max_x_24h: r4(e.runner?.maxX), runner_horizon_done: e.runner?.horizonDone ? 1 : 0, runner_partial: e.runner?.partial ? 1 : 0,
    reached_2x_s: e.runner?.reached?.[2] ?? null, reached_3x_s: e.runner?.reached?.[3] ?? null, reached_5x_s: e.runner?.reached?.[5] ?? null, reached_10x_s: e.runner?.reached?.[10] ?? null,
    code_commit: per.commit, code_commit_basis: per.basis, code_commit_inferred: per.inferred, spec: per.spec, program_start_utc: iso(per.start), quality: q.join(";"), flags: (e.flags || []).join(" | "), verify: e.verify ? JSON.stringify(e.verify).slice(0, 300) : null });
  const ft = e.features || {};
  FE.push({ entry_id: e.id, mint: e.mint, families: e.families.join("+"), age_s: ft.age_s, mc: ft.mc, band: ft.band, liq_usd: ft.liq_usd, rt_impact: ft.rt_impact, rise15: ft.rise15, big_candle_60m: ft.big_candle_60m, from_hi1h: ft.from_hi1h, drawdown4h: ft.drawdown4h, recovery4h: ft.recovery4h,
    vol15_usd: ft.vol15_usd, vol60_usd: ft.vol60_usd, vol_surge5: ft.vol_surge5, buys15: ft.buys15, sells15: ft.sells15, buyers15: ft.buyers15, repeat_buyers15: ft.repeat_buyers15,
    ...Object.fromEntries(["w1", "w3", "w5"].flatMap((w) => ["vol_usd", "buys", "sells", "buyers", "top_buyer_share"].map((k) => [w + "_" + k, ft[w]?.[k] ?? null]))),
    evidence_window_s: e.evidence?.window_s ?? null, evidence_obs: e.evidence?.obs?.length ?? null, snap: e.snap ? JSON.stringify(e.snap).slice(0, 600) : null, other_features: JSON.stringify(Object.fromEntries(Object.entries(ft).filter(([k]) => !["w1", "w3", "w5", "age_s", "mc", "band", "liq_usd", "rt_impact", "rise15", "big_candle_60m", "from_hi1h", "drawdown4h", "recovery4h", "vol15_usd", "vol60_usd", "vol_surge5", "buys15", "sells15", "buyers15", "repeat_buyers15"].includes(k)))) });
  for (const c of e.cands || []) CD.push({ entry_id: e.id, mint: e.mint, family: c.family, rebuy: e.again?.[c.family] ? 1 : 0, detail: JSON.stringify(c.detail ?? null) });
  if (f) F.push({ entry_id: e.id, mint: e.mint, fill_utc: iso(f.t), fill_t: ts(f.t), delay_s: f.delay_s, state_age_s: f.state_age_s, exec: f.exec, tokens: f.tok, cost_sol: f.cost, stake_sol: S.STAKE_SOL, tx_cost_sol: S.TX_COST_SOL, px_sol: f.px_sol, fee_buy: f.fee_buy, fee_src: f.fee_src, pool: f.pool, pool_quote_sol: f.quote_sol, pool_base_tok: f.base,
    quote_req_t: f.quote?.req_t ?? null, quote_resp_t: f.quote?.resp_t ?? null, quote_route: f.quote?.route ? JSON.stringify(f.quote.route) : null, quote_router: f.quote?.router ?? null, quote_fee_bps: f.quote?.fee_bps ?? null, quote_xfer_bps: f.quote?.xfer_bps ?? null, quote_raw_tok: f.quote?.raw_tok ?? null, xfer_in_quote: f.quote?.xfer_in_quote ?? null, quote_impact: f.quote?.impact ?? null,
    mark_pool: e.mark ? JSON.stringify(e.mark) : null });
  // rows (positions): the bot's own mapping — versionsFor(entry, family, policy)
  e.versions.forEach((v, i) => (v._i = i));
  for (const fam of e.families) for (const pol of S.POLICIES) for (const v of B.versionsFor(e, fam, pol)) {
    const x = v.exit, closed = v.status === "closed", est = !!x?.est, ret = closed ? x.ret : null, net = closed ? x.sol - COST : null;
    const held1 = closed ? x.t : CUT, ps = f ? pathStats(e.mint, f.t, held1, e.signalPx) : null, after = closed && f ? pathStats(e.mint, x.t, x.t + 86400, e.signalPx) : null;
    const pq = []; if (est) pq.push("estimated-exit"); if (x?.outage_during) pq.push("outage-while-held"); if (x?.was_unresolved_s) pq.push("was-unresolved"); if (v.unresolvedSince) pq.push("unresolved"); if (x && x.delay_s > 5) pq.push("late-sale>5s"); if (x && x.state_age_s > 5) pq.push("sale-state-age>5s"); if (x && x.fee_src && x.fee_src !== "event" && e.mode !== "polled") pq.push("sell-fee-assumed");
    P.push({ entry_id: e.id, row: v._i, mint: e.mint, symbol: tk.symbol ?? sym(e.mint), book: bookOf(e, fam), rule_family: fam, age_group: e.ag, stop_pct: v.stop * 100, exit_policy: pol, clock_tag: v.stall === false ? "" : String(v.stall), rebuy: e.again?.[fam] ? 1 : 0, startup: e.startup ? 1 : 0, method: e.mode,
      entry_status: e.status, row_status: e.status === "filled" ? v.status : e.status, exit_reason: v.reason, estimated_exit: est ? 1 : 0, signal_utc: iso(e.decisionT), fill_t: f ? ts(f.t) : null, trigger_t: ts(v.trigT), exit_t: closed ? ts(x.t) : null, sale_sched_t: ts(v.schedT ?? (closed && x.delay_s != null ? x.t - x.delay_s : null)), hold_s: closed ? x.hold_s : f ? Math.round(CUT - f.t) : null,
      cost_sol: f ? COST : null, proceeds_sol: closed ? r6(x.sol) : null, half_sol: v.half ? r6(v.half.sol) : null, last_leg_sol: closed ? r6(x.last_sol) : null, net_sol: r6(net), ret: r4(ret), trigger_value_sol: r6(x?.trigger_value ?? v.trigValue), trigger_to_sale_sol: closed && x.trigger_value != null ? r6(x.last_sol - x.trigger_value) : null, sale_delay_s: x?.delay_s ?? null,
      peak_x_held: r4(v.maxX), max_eq_x: r4(v.maxEq), last_x: r4(v.lastX), last_valued_utc: iso(v.lastT), open_value_sol: !closed && f && v.lastX != null ? r6(v.lastX * COST) : null, tokens_left: v.tok, banked_sol: r6(v.got),
      spot_hi_held_x: r4(ps?.hi), spot_lo_held_x: r4(ps?.lo), spot_hi_held_s: ps?.hi_s ?? null, spot_lo_held_s: ps?.lo_s ?? null, bars_held: ps?.n ?? null, spot_path_basis: "whole minutes strictly inside the holding; boundary minutes excluded", spot_hi_24h_after_exit_x: r4(after?.hi), spot_lo_24h_after_exit_x: r4(after?.lo),
      runner_max_x_24h: r4(e.runner?.maxX), reached_2x: e.runner?.reached?.[2] != null ? 1 : 0, reached_3x: e.runner?.reached?.[3] != null ? 1 : 0, reached_5x: e.runner?.reached?.[5] != null ? 1 : 0, reached_10x: e.runner?.reached?.[10] != null ? 1 : 0, runner_horizon_done: e.runner?.horizonDone ? 1 : 0,
      code_commit: per.commit, spec: per.spec, quality: [...q, ...pq].join(";") });
  }
  for (const v of e.versions) { const base = { entry_id: e.id, row: v._i, mint: e.mint, stop_pct: v.stop * 100, exit_policy: v.policy, clock_tag: v.stall === false ? "" : String(v.stall) };
    if (v.half) SL.push({ ...base, leg: "half-at-2x", t_utc: iso(v.half.t), t: ts(v.half.t), sol_net_of_tx: r6(v.half.sol), tokens_sold: f ? f.tok * S.SCALE_FRACTION : null, reason: "scale", trigger_t: null, trigger_value_sol: r6(v.half.trigger_value), delay_s: v.half.delay_s, state_age_s: v.half.state_age_s ?? null, exec: v.half.exec, evidence_class: evc(v.half), estimated: v.half.est ? 1 : 0, pool_q: v.half.pool?.q ?? null, pool_b: v.half.pool?.b ?? null, pool_fee: v.half.pool?.f ?? null, quote: v.half.quotes ? JSON.stringify({ quotes: v.half.quotes, spread_s: v.half.quote_spread_s, waits: v.half.waited_for_coherent_quotes }) : null, fee_src: null, outage_during: null });
    if (v.status === "closed" && v.exit) { const x = v.exit; SL.push({ ...base, leg: "exit", t_utc: iso(x.t), t: ts(x.t), sol_net_of_tx: r6(x.last_sol), tokens_sold: f ? (v.half ? f.tok * (1 - S.SCALE_FRACTION) : f.tok) : null, reason: v.reason, trigger_t: ts(v.trigT), trigger_value_sol: r6(x.trigger_value), delay_s: x.delay_s, state_age_s: x.state_age_s ?? null, exec: x.exec, evidence_class: evc(x), estimated: x.est ? 1 : 0, pool_q: x.pool?.q ?? null, pool_b: x.pool?.b ?? null, pool_fee: x.pool?.f ?? null, quote: x.quote ? JSON.stringify(x.quote) : x.est_from ? JSON.stringify(x.est_from) : null, fee_src: x.fee_src, outage_during: x.outage_during ? 1 : 0 }); } }
}
csv("entries.csv", Object.keys(E[0] || {}), E); csv("entry_features.csv", Object.keys(FE[0] || {}), FE); csv("entry_candidates.csv", ["entry_id", "mint", "family", "rebuy", "detail"], CD);
csv("fills.csv", Object.keys(F[0] || { entry_id: 0 }), F); csv("sales.csv", Object.keys(SL[0] || { entry_id: 0 }), SL); csv("positions.csv", Object.keys(P[0] || {}), P);

// ---------- decisions and rejections ----------
const dec = [...rows("decisions")].map((d) => ({ mint: d.mint, symbol: sym(d.mint), age_group: d.ag, family: d.family, t_utc: iso(d.t), t: r4(d.t), entry_id: d.entry_id, detail: d.detail }));
csv("decisions.csv", ["mint", "symbol", "age_group", "family", "t_utc", "t", "entry_id", "detail"], dec);
{ const agg = new Map(), out = []; for (const n of rows("notes")) { out.push({ id: n.id, mint: n.mint, age_group: n.ag, family: n.family, t: Math.round(n.t), reason: n.reason, detail: n.detail }); const k = n.family + "\t" + n.reason.replace(/\d+(\.\d+)?/g, "#"), a = agg.get(k) || agg.set(k, { family: n.family, reason: n.reason.replace(/\d+(\.\d+)?/g, "#"), n: 0, mints: new Set(), first: n.t, last: n.t }).get(k); a.n++; a.mints.add(n.mint); if (n.t < a.first) a.first = n.t; if (n.t > a.last) a.last = n.t; }
  csv("rejections.csv", ["id", "mint", "age_group", "family", "t", "reason", "detail"], out, true);
  csv("rejections_by_book.csv", ["family", "reason", "n", "mints", "first_utc", "last_utc"], [...agg.values()].map((a) => ({ ...a, mints: a.mints.size, first_utc: iso(a.first), last_utc: iso(a.last) })).sort((a, b) => (a.family < b.family ? -1 : a.family > b.family ? 1 : b.n - a.n))); }

// ---------- coin_outcomes.csv: every coin in the database, bought or not ----------
{ const hourly = new Map(); for (const r of rows("bars_hourly")) { let a = hourly.get(r.mint); if (!a) hourly.set(r.mint, (a = [])); a.push(r); }
  const byMint = new Map(); for (const e of entries) { let a = byMint.get(e.mint); if (!a) byMint.set(e.mint, (a = [])); a.push(e); }
  const decM = new Map(); for (const d of dec) decM.set(d.mint, (decM.get(d.mint) || 0) + 1);
  const def = new Map(); for (const p of P) if (p.stop_pct === 30 && p.exit_policy === "trail" && p.clock_tag === "" && p.row_status === "closed" && !p.estimated_exit) { const k = p.mint + "|" + p.entry_id; if (!def.has(k)) def.set(k, p); }
  const netM = new Map(), nM = new Map(); for (const p of def.values()) { netM.set(p.mint, (netM.get(p.mint) || 0) + p.net_sol); nM.set(p.mint, (nM.get(p.mint) || 0) + 1); }
  const out = []; for (const [mint, c] of coins) { const h = hourly.get(mint) || [], es = byMint.get(mint) || [], supply = c.info?.supply ?? null;
    let hi = null, lo = null, hiHr = null, vol = 0, nb = 0, ns = 0, mins = 0, firstHr = null, lastHr = null; for (const r of h) { if (hi == null || r.h > hi) { hi = r.h; hiHr = r.hr; } if (lo == null || r.l < lo) lo = r.l; vol += r.v || 0; nb += r.nb || 0; ns += r.ns || 0; mins += r.n; if (firstHr == null || r.hr < firstHr) firstHr = r.hr; if (lastHr == null || r.hr > lastHr) lastHr = r.hr; }
    // "what happened after it first traded": lowest hourly low up to the peak hour, and the lowest hourly low after the peak hour
    let loBefore = null, loAfter = null; for (const r of h) { if (r.hr <= hiHr && (loBefore == null || r.l < loBefore)) loBefore = r.l; if (r.hr > hiHr && (loAfter == null || r.l < loAfter)) loAfter = r.l; }
    out.push({ mint, symbol: c.info?.symbol ?? null, name: c.info?.name ?? null, pool: c.pool, method: c.info?.mode ?? (c.info?.polled ? "polled" : null), created_utc: iso(c.create_ts), create_src: c.create_src, pump_origin: c.pump_origin, first_seen_utc: iso(c.first_seen), last_px_usd: c.last_px, last_seen_utc: iso(c.last_t), supply,
      token_program: c.info?.token_program ?? null, xfer_fee_bps: c.info?.risk?.fee_bps ?? null, bought: es.length ? 1 : 0, buys: es.filter((e) => e.status === "filled").length, first_buys: es.filter((e) => e.status === "filled" && !e.again).length, books_bought: [...new Set(es.flatMap((e) => e.families))].join("+"), closed_30trail_buys: nM.get(mint) ?? 0, net_sol_30trail_all_buys: r6(netM.get(mint) ?? null), decisions: decM.get(mint) ?? 0,
      bar_minutes: mins, first_bar_hour_utc: iso(firstHr != null ? firstHr * 3600 : null), last_bar_hour_utc: iso(lastHr != null ? lastHr * 3600 : null), px_high_usd: hi, px_high_hour_utc: iso(hiHr != null ? hiHr * 3600 : null), px_low_usd: lo, px_low_to_peak_usd: loBefore, px_low_after_peak_usd: loAfter, peak_over_prior_low_x: hi && loBefore ? r4(hi / loBefore) : null, after_peak_fall: hi && loAfter ? r4(loAfter / hi - 1) : null,
      mc_high_usd: hi && supply ? Math.round(hi * supply) : null, mc_high_usd_if_1bn_supply: hi && /pump$/.test(mint) ? Math.round(hi * 1e9) : null, mc_low_to_peak_usd_if_1bn_supply: loBefore && /pump$/.test(mint) ? Math.round(loBefore * 1e9) : null, vol_usd: Math.round(vol), n_buys: nb, n_sells: ns, info: JSON.stringify(c.info).slice(0, 500) }); }
  csv("coin_outcomes.csv", Object.keys(out[0] || { mint: 0 }), out); }

// ---------- manifest ----------
let srv = null; try { srv = fs.readFileSync(RAW + "/server-commit.txt", "utf8").trim(); } catch {}
fs.writeFileSync(OUT + "/manifest.json", JSON.stringify({ package: "older-coins independent-review data package", export_cutoff_utc: MAN.cutoff_utc, database: { file: "older-shakedown.db (the shakedown run; never reset)", bytes: MAN.db_bytes, first_start_utc: iso(Number(meta.first_start) || null), spec_in_db: meta.spec ?? null }, server_checkout_commit: srv, analysis_repo_commit: execSync(`git -C ${REPO} rev-parse HEAD`, { encoding: "utf8" }).trim(), spec_in_code: S.SPEC_VER, node: process.version, stake_sol: S.STAKE_SOL, cost_sol: COST,
  raw_tables: Object.fromEntries(Object.entries(MAN.tables).map(([k, t]) => [k, { rows: t.rows, sql: t.sql, files: t.files }])), files: written, entry_json_keys_not_mapped_to_columns: extraKeys }, null, 1));
console.log("entries", entries.length, "unmapped keys", extraKeys);
