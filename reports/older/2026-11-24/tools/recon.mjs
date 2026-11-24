// Reconciliation of the fast/volume and RUG450 cohorts between two snapshots. Usage: node recon.mjs <raw entries ndjson.gz> <published entries.json> <out dir>
import fs from "node:fs"; import zlib from "node:zlib";
const [rawF, pubF, outDir] = process.argv.slice(2); const COST = 0.2005;
const FASTS = ["FAST-1M", "FAST-3M", "FAST-5M", "VOL300K", "VOL300K-UP", "VOL500K", "VOL500K-UP"];
const raw = zlib.gunzipSync(fs.readFileSync(rawF)).toString("utf8").trim().split("\n").map((l) => JSON.parse(JSON.parse(l)[5]));
const pub = JSON.parse(fs.readFileSync(pubF, "utf8"));
const firstFor = (fams, again, set) => fams.filter((f) => set.includes(f) && !(again || []).includes(f));
// ---- RAW (full ledger) cohort
const rawRows = (set) => raw.map((e) => { const fams = firstFor(e.families, e.again ? Object.keys(e.again) : [], set); if (!fams.length || e.status !== "filled") return null; const v = e.versions.find((x) => x.stop === 0.3 && x.policy === "trail" && !x.stall); if (!v) return null;
  return { id: e.id, mint: e.mint, t: e.decisionT, fams, status: v.status, est: !!v.exit?.est, ret: v.exit?.ret ?? null, sol: v.exit?.sol ?? null, heldMax: v.maxX ?? null, runMax: e.runner?.maxX ?? null, fee: e.token?.xfer_bps || 0, exec: e.exec, reason: v.reason ?? null }; }).filter(Boolean);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const describe = (name, rows) => { const closed = rows.filter((r) => r.status === "closed" && !r.est); const net = sum(closed.map((r) => r.sol - COST)); return { name, physical_first_buys: rows.length, closed: closed.length, open_or_pending_sale: rows.filter((r) => r.status !== "closed").length, estimated_excluded: rows.filter((r) => r.status === "closed" && r.est).length, coins: new Set(closed.map((r) => r.mint)).size, won: closed.filter((r) => r.sol > COST).length, net_sol: +net.toFixed(5),
  never_up_10pct_24h: closed.filter((r) => r.runMax < 1.1).length, never_up_10pct_net: +sum(closed.filter((r) => r.runMax < 1.1).map((r) => r.sol - COST)).toFixed(5),
  reached_2x_within_24h: closed.filter((r) => r.runMax >= 2).length, reached_2x_within_24h_profitable: closed.filter((r) => r.runMax >= 2 && r.sol > COST).length,
  reached_2x_while_held: closed.filter((r) => r.heldMax >= 2).length, reached_2x_while_held_profitable: closed.filter((r) => r.heldMax >= 2 && r.sol > COST).length, reached_2x_while_held_net: +sum(closed.filter((r) => r.heldMax >= 2).map((r) => r.sol - COST)).toFixed(5) }; };
const out = { snapshots: { raw: { source: "branch older-review-data", cutoff_utc: "2026-11-23T20:19:05.585Z", entries: raw.length }, published: { source: "branch older-data entries.json", at_utc: new Date(pub.at).toISOString(), bot_commit: pub.commit, entries: pub.entries.length } } };
const rf = rawRows(FASTS), rr = rawRows(["RUG450"]);
out.raw_fast_volume = describe("FAST-1M/3M/5M + VOL300K/-UP + VOL500K/-UP, raw ledger", rf); out.raw_rug450 = describe("RUG450, raw ledger", rr);
// ---- PUBLISHED (compact) cohort, split at the raw cutoff
const CUT = Date.parse("2026-11-23T20:19:05.585Z") / 1000;
const pubRows = (set) => pub.entries.map((e) => { const fams = firstFor(e.fam, e.again, set); if (!fams.length || e.status !== "filled") return null; return { id: e.id, mint: e.mint, t: e.t, fams, ret: e.ret?.t30 ?? null, runMax: e.max, fee: e.fee, mode: e.mode, top5: e.top5, holders: e.holders }; }).filter(Boolean);
const dp = (name, rows) => { const c = rows.filter((r) => r.ret != null); return { name, physical_first_buys: rows.length, closed: c.length, not_closed: rows.length - c.length, coins: new Set(c.map((r) => r.mint)).size, won: c.filter((r) => r.ret > 0).length, net_sol: +sum(c.map((r) => r.ret * COST)).toFixed(5), never_up_10pct_24h: c.filter((r) => r.runMax < 1.1).length, never_up_10pct_net: +sum(c.filter((r) => r.runMax < 1.1).map((r) => r.ret * COST)).toFixed(5), reached_2x_within_24h: c.filter((r) => r.runMax >= 2).length, reached_2x_within_24h_profitable: c.filter((r) => r.runMax >= 2 && r.ret > 0).length, top_buyer_share_known: c.filter((r) => r.top5 != null).length, holder_count_known: c.filter((r) => r.holders != null).length, transfer_fee_coins: c.filter((r) => r.fee > 0).length, sampled_method: c.filter((r) => r.mode !== "live").length }; };
const pf = pubRows(FASTS), pr = pubRows(["RUG450"]);
out.published_fast_volume_all = dp("fast/volume, published, all", pf); out.published_fast_volume_to_cutoff = dp("fast/volume, published, decided ≤ raw cutoff", pf.filter((r) => r.t <= CUT)); out.published_fast_volume_after_cutoff = dp("fast/volume, published, decided after raw cutoff", pf.filter((r) => r.t > CUT));
out.published_rug450_all = dp("RUG450, published, all", pr); out.published_rug450_to_cutoff = dp("RUG450, published, decided ≤ raw cutoff", pr.filter((r) => r.t <= CUT)); out.published_rug450_after_cutoff = dp("RUG450, published, decided after raw cutoff", pr.filter((r) => r.t > CUT));
// entries in the raw cohort that were not closed at the raw cutoff but are closed now, and vice versa
const rawClosed = new Set(rf.filter((r) => r.status === "closed" && !r.est).map((r) => r.id)), pubClosed = new Set(pf.filter((r) => r.ret != null).map((r) => r.id));
out.fast_volume_ids = { closed_in_both: [...rawClosed].filter((i) => pubClosed.has(i)).length, closed_only_in_published_but_decided_before_cutoff: pf.filter((r) => r.ret != null && r.t <= CUT && !rawClosed.has(r.id)).map((r) => r.id), closed_in_raw_missing_from_published: [...rawClosed].filter((i) => !pubClosed.has(i)) };
fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(outDir + "/reconciliation.json", JSON.stringify(out, null, 1));
const csv = (rows, cols) => [cols.join(","), ...rows.map((r) => cols.map((c) => Array.isArray(r[c]) ? r[c].join("+") : r[c] ?? "").join(","))].join("\n");
fs.writeFileSync(outDir + "/fast-volume-raw-cohort.csv", csv(rf, ["id", "mint", "t", "fams", "status", "est", "ret", "sol", "heldMax", "runMax", "reason", "exec", "fee"]));
fs.writeFileSync(outDir + "/rug450-raw-cohort.csv", csv(rr, ["id", "mint", "t", "fams", "status", "est", "ret", "sol", "heldMax", "runMax", "reason", "exec", "fee"]));
fs.writeFileSync(outDir + "/fast-volume-published-cohort.csv", csv(pf, ["id", "mint", "t", "fams", "ret", "runMax", "top5", "holders", "mode", "fee"]));
fs.writeFileSync(outDir + "/rug450-published-cohort.csv", csv(pr, ["id", "mint", "t", "fams", "ret", "runMax", "mode", "fee"]));
console.log(JSON.stringify(out, null, 1));
