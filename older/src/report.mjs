// report.mjs — result rows (family × age group × stop × exit policy) and the shared-entry overlap, from stored entries.
// families × 4 ages × 5 stops pure-trailing rows, and the same under the scale-out policy (21 families × 4 ages + 10 any-age families × 5 ages → 670 + 670 = 1,340 comparisons since older-11 added VOL100K and DIP15K).
// Results are after costs (pool fees, impact, declared transaction cost). Returns are per entry on COST (stake + buy transaction).
import * as S from "./spec.mjs";
import { versionsFor, COST } from "./book.mjs";

const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const r4 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(4));
const sum = (a) => a.reduce((s, x) => s + x, 0);

export function bookRows(entries, noteCounts = []) {
  const rows = new Map();
  for (const policy of S.POLICIES) for (const f of S.FAMILIES) for (const [ag] of S.agesOf(f)) for (const stop of S.STOPS)
    rows.set(`${f}|${ag}|${stop}|${policy}`, { family: f, ag, stop, policy, entries: 0, cancelled: 0, pending: 0, filled: 0, open: 0, closed: 0, unresolved: 0, mints: new Set(), trades: [], holds: [], delays: [], runners: { n: 0, partial: 0, x2: 0, x3: 0, x5: 0, x10: 0 }, outage: 0, estimated: 0, estimatedNet: 0, rebuys: 0, rebuyNet: 0, rebuyOpen: 0, feeAssumed: 0, halves: 0, startup: 0, startupNet: 0, unsupported: 0, unsupportedNet: 0, unsupportedRebuys: 0, unsupportedRebuyNet: 0 });
  for (const e of entries) { if (e.token?.xfer_bps > 0) continue; // transfer-fee coins are reported in their own book (spec FEE_BOOK), not in the rule rows
   for (const f of e.families) for (const policy of S.POLICIES) for (const v of versionsFor(e, f, policy)) {
    const r = rows.get(`${f}|${e.ag}|${v.stop}|${policy}`); if (!r) continue;
    // BUYING AGAIN (older-9): a row's figures are its FIRST buys, exactly as in older-8. Re-buys are counted and summed apart.
    // A re-buy of a coin later found fee-bearing or restricted is separated exactly like a first buy (Codex's review of
    // 161d545: the re-buy branch used to return before that check, so those fee-free results stayed in the re-buy P&L).
    if (e.again?.[f]) { if (e.status === "filled") { if (v.status === "closed") { if (v.exit.est) { /* an estimated sale is not a result */ } else if (e.riskAfter && e.exec !== "routed-quote") { r.unsupportedRebuys++; r.unsupportedRebuyNet += v.exit.sol - COST; } else { r.rebuys++; r.rebuyNet += v.exit.sol - COST; } } else r.rebuyOpen++; } continue; }
    r.entries++; r.mints.add(e.mint);
    if (e.status === "cancelled" || e.status === "failed") { r.cancelled++; continue; } if (e.status === "pending") { r.pending++; continue; }
    r.filled++; if (e.fill.fee_src !== "event") r.feeAssumed++; if (e.startup) r.startup++;
    if (e.runner.horizonDone) { r.runners.n++; if (e.runner.partial) r.runners.partial++; for (const k of S.RUNNER_X) if (e.runner.reached[k]) r.runners["x" + k]++; }
    if (v.half) r.halves++;
    if (v.status === "open" || v.status === "selling" || v.status === "scaling" || v.status === "unresolved") { r.open++; if (v.unresolvedSince || v.status === "unresolved") r.unresolved++; }
    else if (v.status === "closed" && v.exit.est) { r.estimated++; r.estimatedNet += v.exit.sol - COST; } // an ESTIMATED sale is not a result: counted apart, in no total, quantile or win rate (eighth review, A)
    // A coin found fee-bearing or restricted AFTER a live buy (Codex review of 3537ada): the live method models no transfer fee,
    // so this row's fee-free exit is not a supported result. The position and its ledger stay; its result is counted APART and
    // is in no primary total, quantile or win rate — never deleted, never zeroed.
    else if (v.status === "closed" && e.riskAfter && e.exec !== "routed-quote") { r.unsupported++; r.unsupportedNet += v.exit.sol - COST; }
    else if (v.status === "closed") { r.closed++; const net = v.exit.sol - COST; r.trades.push({ mint: e.mint, t: e.fill.t, ret: v.exit.ret, net, reason: v.reason }); r.holds.push(v.exit.hold_s); r.delays.push(v.exit.delay_s); if (v.exit.outage_during) r.outage++; if (e.startup) r.startupNet += net; }
  } }
  const notes = {}; for (const n of noteCounts) (notes[n.family] ||= {})[n.reason] = n.n;
  return [...rows.values()].map((r) => {
    const t = r.trades.sort((a, b) => a.t - b.t), rets = t.map((x) => x.ret), n = t.length;
    const byMint = new Map(); for (const x of t) byMint.set(x.mint, (byMint.get(x.mint) || 0) + x.net);
    const top3 = new Set([...byMint].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0])), rest = t.filter((x) => !top3.has(x.mint));
    const h1 = t.slice(0, Math.floor(n / 2)), h2 = t.slice(Math.floor(n / 2));
    const reasons = {}; for (const x of t) reasons[x.reason] = (reasons[x.reason] || 0) + 1;
    return {
      book: `${r.family} · ${r.ag} · ${Math.round(r.stop * 100)}% · ${r.policy}`, family: r.family, ag: r.ag, stop: r.stop, policy: r.policy,
      mints: r.mints.size, entries: r.entries, filled: r.filled, open: r.open, closed: n, cancelled: r.cancelled, pending: r.pending, unresolved: r.unresolved,
      net_sol: r4(sum(t.map((x) => x.net))), avg_ret: n ? r4(sum(rets) / n) : null, win_rate: n ? r4(rets.filter((x) => x > 0).length / n) : null,
      q10: r4(q(rets, 0.1)), q25: r4(q(rets, 0.25)), median: r4(q(rets, 0.5)), q75: r4(q(rets, 0.75)), q90: r4(q(rets, 0.9)),
      loss40: rets.filter((x) => x <= -0.4).length, loss50: rets.filter((x) => x <= -0.5).length, loss60: rets.filter((x) => x <= -0.6).length,
      ex_top3_net: r4(sum(rest.map((x) => x.net))), ex_top3_avg: rest.length ? r4(sum(rest.map((x) => x.ret)) / rest.length) : null, ex_top3_n: rest.length,
      h1_net: r4(sum(h1.map((x) => x.net))), h1_avg: h1.length ? r4(sum(h1.map((x) => x.ret)) / h1.length) : null, h2_net: r4(sum(h2.map((x) => x.net))), h2_avg: h2.length ? r4(sum(h2.map((x) => x.ret)) / h2.length) : null,
      hold_median_min: r.holds.length ? Math.round(q(r.holds, 0.5) / 60) : null, stake_committed_sol: r4(r.filled * COST), sell_delay_max_s: r.delays.length ? r4(Math.max(...r.delays)) : null,
      runners: r.runners, exit_reasons: reasons, exits_during_outage: r.outage, fee_not_from_event: r.feeAssumed, half_sales: r.halves,
      estimated_exits: r.estimated, estimated_net_sol: r4(r.estimatedNet), // shown apart: never part of closed / net_sol / win_rate above
      unsupported_fee_exits: r.unsupported, unsupported_fee_net_sol: r4(r.unsupportedNet), // live buys of coins later found fee-bearing or restricted: shown apart, never inside net_sol
      unsupported_fee_rebuys: r.unsupportedRebuys, unsupported_fee_rebuys_net_sol: r4(r.unsupportedRebuyNet), // the same for re-buys: never inside rebuys_net_sol
      rebuys_closed: r.rebuys, rebuys_net_sol: r4(r.rebuyNet), rebuys_open: r.rebuyOpen, // older-9 re-buys: beside the row, never inside it
      startup_entries: r.startup, startup_net_sol: r4(r.startupNet), notes: notes[r.family] || {},
    };
  });
}

/** families sharing coins / entries (correlated comparisons, not independent discoveries) */
export function overlap(entries) {
  const mints = {};
  const ok = (e) => e.status !== "cancelled" && e.status !== "failed";
  for (const e of entries) { if (!ok(e)) continue; for (const f of e.families) (mints[f] ||= new Set()).add(e.mint + "|" + e.ag); }
  const fam = S.FAMILIES, out = [];
  for (let i = 0; i < fam.length; i++) for (let j = i + 1; j < fam.length; j++) {
    const a = fam[i], b = fam[j]; let sm = 0; for (const m of mints[a] || []) if (mints[b]?.has(m)) sm++;
    const se = entries.filter((e) => ok(e) && e.families.includes(a) && e.families.includes(b)).length;
    out.push({ a, b, shared_mint_ages: sm, shared_entries: se, a_n: mints[a]?.size || 0, b_n: mints[b]?.size || 0 });
  }
  return out;
}
