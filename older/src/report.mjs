// report.mjs — the 112 result rows (family × age group × stop) and the shared-entry overlap, from stored entries.
// Results are after costs (pool fees, impact, declared transaction cost). Returns are per entry on COST (stake + buy tx).
import * as S from "./spec.mjs";
import { versionsFor, COST } from "./book.mjs";

const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4));
const sum = (a) => a.reduce((s, x) => s + x, 0);

export function bookRows(entries, noteCounts = []) {
  const rows = new Map();
  for (const f of S.FAMILIES) for (const [ag] of S.AGES) for (const stop of S.STOPS) rows.set(`${f}|${ag}|${stop}`, { family: f, ag, stop, entries: 0, failed: 0, pending: 0, filled: 0, open: 0, closed: 0, unresolved: 0, mints: new Set(), trades: [], holds: [], runners: { n: 0, partial: 0, x2: 0, x3: 0, x5: 0, x10: 0 }, outage: 0, feeAssumed: 0 });
  for (const e of entries) for (const f of e.families) for (const v of versionsFor(e, f)) {
    const r = rows.get(`${f}|${e.ag}|${v.stop}`); if (!r) continue;
    r.entries++; r.mints.add(e.mint);
    if (e.status === "failed") { r.failed++; continue; } if (e.status === "pending") { r.pending++; continue; }
    r.filled++; if (e.fill.fee_src === "assumed") r.feeAssumed++;
    if (e.runner.horizonDone) { r.runners.n++; if (e.runner.partial) r.runners.partial++; for (const k of S.RUNNER_X) if (e.runner.reached[k]) r.runners["x" + k]++; }
    if (v.status === "open" || v.status === "selling") r.open++;
    else if (v.status === "unresolved") r.unresolved++;
    else if (v.status === "closed") { r.closed++; r.trades.push({ mint: e.mint, t: e.fill.t, ret: v.exit.ret, net: v.exit.sol - COST, reason: v.reason }); r.holds.push(v.exit.hold_s); if (v.exit.outage_during) r.outage++; }
  }
  const notes = {}; for (const n of noteCounts) (notes[n.family] ||= {})[n.reason] = n.n;
  return [...rows.values()].map((r) => {
    const t = r.trades.sort((a, b) => a.t - b.t), rets = t.map((x) => x.ret), n = t.length;
    const byMint = new Map(); for (const x of t) byMint.set(x.mint, (byMint.get(x.mint) || 0) + x.net);
    const top3 = new Set([...byMint].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0])), rest = t.filter((x) => !top3.has(x.mint));
    const h1 = t.slice(0, Math.floor(n / 2)), h2 = t.slice(Math.floor(n / 2));
    const reasons = {}; for (const x of t) reasons[x.reason] = (reasons[x.reason] || 0) + 1;
    return {
      book: `${r.family} · ${r.ag} · ${Math.round(r.stop * 100)}%`, family: r.family, ag: r.ag, stop: r.stop,
      mints: r.mints.size, entries: r.entries, filled: r.filled, open: r.open, closed: n, failed: r.failed, pending: r.pending, unresolved: r.unresolved,
      net_sol: r4(sum(t.map((x) => x.net))), avg_ret: n ? r4(sum(rets) / n) : null, win_rate: n ? r4(rets.filter((x) => x > 0).length / n) : null,
      q10: r4(q(rets, 0.1)), q25: r4(q(rets, 0.25)), median: r4(q(rets, 0.5)), q75: r4(q(rets, 0.75)), q90: r4(q(rets, 0.9)),
      loss40: rets.filter((x) => x <= -0.4).length, loss50: rets.filter((x) => x <= -0.5).length, loss60: rets.filter((x) => x <= -0.6).length,
      ex_top3_net: r4(sum(rest.map((x) => x.net))), ex_top3_avg: rest.length ? r4(sum(rest.map((x) => x.ret)) / rest.length) : null, ex_top3_n: rest.length,
      h1_net: r4(sum(h1.map((x) => x.net))), h1_avg: h1.length ? r4(sum(h1.map((x) => x.ret)) / h1.length) : null, h2_net: r4(sum(h2.map((x) => x.net))), h2_avg: h2.length ? r4(sum(h2.map((x) => x.ret)) / h2.length) : null,
      hold_median_min: r.holds.length ? Math.round(q(r.holds, 0.5) / 60) : null, stake_committed_sol: r4(r.filled * COST),
      runners: r.runners, exit_reasons: reasons, exits_during_outage: r.outage, fee_assumed: r.feeAssumed,
      notes: notes[r.family] || {},
    };
  });
}

/** families sharing mints / entries (correlated comparisons, not independent discoveries) */
export function overlap(entries) {
  const mints = {}, ents = {};
  for (const e of entries) { if (e.status === "failed") continue; for (const f of e.families) (mints[f] ||= new Set()).add(e.mint + "|" + e.ag); }
  const fam = S.FAMILIES, out = [];
  for (let i = 0; i < fam.length; i++) for (let j = i + 1; j < fam.length; j++) {
    const a = fam[i], b = fam[j]; let sm = 0; for (const m of mints[a] || []) if (mints[b]?.has(m)) sm++;
    const se = entries.filter((e) => e.status !== "failed" && e.families.includes(a) && e.families.includes(b)).length;
    out.push({ a, b, shared_mint_ages: sm, shared_entries: se, a_n: mints[a]?.size || 0, b_n: mints[b]?.size || 0 });
  }
  return out;
}
