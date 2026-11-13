#!/usr/bin/env python3
"""f015 — independent re-derivation of Codex C018 headline figures WITHOUT Codex's code.
Inputs: Claude's own f014 ledger.csv.gz (control spec = E, frozen evaluator through run_launch, a27c504)
        + Codex's published creator_features (the 679 veto flags, c018 @ 03ea372, concatenated partitions)
        + Codex's published trades_candidate / trades_removed / trades_control partitions (for record-level comparison).
Normalisation (Codex's stated R4 accounting): abstain; fill state age > 30 s => unavailable fill (whatever the frozen cat);
cat unknown => uncertain exit if why starts with 'exit' else unavailable fill; exit state age > 30 s => uncertain exit; else resolved.
Writes rederive_f015.json. Counts and sums only."""
import csv, gzip, json, math, statistics, random, sys, collections, decimal, pathlib
ledger, feat_csv, pubdir, out = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]), sys.argv[4]
F = {z['mint']: z for z in csv.DictReader(open(feat_csv))}
assert len(F) == 679
with gzip.open(ledger, 'rt') as f:
    L = [z for z in csv.DictReader(f) if z['spec'] == 'control']
assert len(L) == 3638
E = [z for z in L if z['eligible_E'] == 'True']
assert len(E) == 679 and set(z['mint'] for z in E) == set(F)
def fl(x):
    return None if x in ('', None) else float(x)
def norm(z):
    if z['cat'] == 'abstain': return 'abstain'
    if (fl(z['fill_state_age_s']) or 0) > 30: return 'unavailable_fill'
    if z['cat'] == 'unknown': return 'uncertain_exit' if (z['why'] or '').startswith('exit') else 'unavailable_fill'
    if (fl(z['exit_state_age_s']) or 0) > 30: return 'uncertain_exit'
    return 'resolved'
for z in E:
    z['norm'] = norm(z); z['veto'] = decimal.Decimal(F[z['mint']]['creator_buy_sol']) >= 5
    assert z['veto'] == (F[z['mint']]['veto'] == 'True')
kept = [z for z in E if not z['veto']]; rem = [z for z in E if z['veto']]
assert len(kept) == 605 and len(rem) == 74
def summ(rr):
    c = collections.Counter(z['norm'] for z in rr); x = sorted(fl(z['net_sol']) for z in rr if z['norm'] == 'resolved')
    res = [z for z in rr if z['norm'] == 'resolved']
    o = {'attempted': len(rr), 'filled_after_30s_screen': c['resolved'] + c['uncertain_exit'], 'unavailable_fill': c['unavailable_fill'],
         'uncertain_exits': c['uncertain_exit'], 'resolved': c['resolved'], 'total_net_sol_resolved': math.fsum(x)}
    if x:
        o.update(mean_sol=statistics.mean(x), median_sol=statistics.median(x), mean_ROI=statistics.mean(x) / .2, median_ROI=statistics.median(x) / .2,
                 win_rate=sum(v > 0 for v in x) / len(x), loss_gt50_share=sum(v < -.1 for v in x) / len(x), severe_loss_count=sum(v < -.1 for v in x),
                 without_best1_sol=math.fsum(x[:-1]), without_best3_sol=math.fsum(x[:-3]) if len(x) > 3 else None, worst_sol=x[0],
                 median_resolved_hold_s=statistics.median(fl(z['hold_s']) for z in res), best3=x[-3:])
    return o
def diff(a, b, seed=20261113):
    x = [fl(z['net_sol']) for z in a if z['norm'] == 'resolved']; y = [fl(z['net_sol']) for z in b if z['norm'] == 'resolved']
    o = {'kept_resolved': len(x), 'removed_resolved': len(y)}
    if x and y:
        o['mean_kept_minus_removed_sol'] = statistics.mean(x) - statistics.mean(y)
        o['deep_loss_share_kept_minus_removed'] = sum(v < -.1 for v in x) / len(x) - sum(v < -.1 for v in y) / len(y)
    if len(x) >= 30 and len(y) >= 30:
        # Codex's resampling scheme reproduced exactly (random.Random(seed).choices, kept then removed per draw, 10,000 draws, [250], [9750])
        rng = random.Random(seed); ds = sorted(math.fsum(rng.choices(x, k=len(x))) / len(x) - math.fsum(rng.choices(y, k=len(y))) / len(y) for _ in range(10000))
        o['mean_difference_iid95_codex_scheme'] = [ds[250], ds[9750]]
        xb = [float(v < -.1) for v in x]; yb = [float(v < -.1) for v in y]
        rng = random.Random(seed); ds = sorted(math.fsum(rng.choices(xb, k=len(xb))) / len(xb) - math.fsum(rng.choices(yb, k=len(yb))) / len(yb) for _ in range(10000))
        o['deep_loss_difference_iid95_codex_scheme'] = [ds[250], ds[9750]]
        # Claude's own independent bootstrap (different seed, percentile 2.5/97.5 by linear index), as a sensitivity check
        rng = random.Random(7); ds = sorted(statistics.mean(rng.choices(x, k=len(x))) - statistics.mean(rng.choices(y, k=len(y))) for _ in range(10000))
        o['mean_difference_iid95_claude_seed7'] = [ds[249], ds[9749]]
        rng = random.Random(7); ds = sorted(statistics.mean(rng.choices(xb, k=len(xb))) - statistics.mean(rng.choices(yb, k=len(yb))) for _ in range(10000))
        o['deep_loss_difference_iid95_claude_seed7'] = [ds[249], ds[9749]]
    return o
R = {'inputs': {'claude_f014_ledger': ledger, 'codex_creator_features_partitions': feat_csv},
     'control': summ(E), 'candidate_kept': summ(kept), 'removed': summ(rem),
     'by_half': {h: {'kept': summ([z for z in kept if z['half'] == h]), 'removed': summ([z for z in rem if z['half'] == h]), 'control': summ([z for z in E if z['half'] == h])} for h in ('early', 'late')},
     'by_cell': {c: {'kept': summ([z for z in kept if z['cell'] == c]), 'removed': summ([z for z in rem if z['cell'] == c]), 'control': summ([z for z in E if z['cell'] == c])} for c in 'ABC'},
     'kept_minus_removed': diff(kept, rem), 'by_half_difference': {h: diff([z for z in kept if z['half'] == h], [z for z in rem if z['half'] == h]) for h in ('early', 'late')},
     'by_cell_difference': {c: diff([z for z in kept if z['cell'] == c], [z for z in rem if z['cell'] == c]) for c in 'ABC'},
     'precheck_counts': {'removed': len(rem), 'kept': len(kept), 'share': len(rem) / 679, 'by_half_removed': collections.Counter(z['half'] for z in rem), 'by_cell_removed': collections.Counter(z['cell'] for z in rem),
                         'first_slot_zero': sum(decimal.Decimal(F[m]['creator_buy_sol']) == 0 for m in F), 'first_slot_zero_by_cell': collections.Counter(F[m]['cell'] for m in F if decimal.Decimal(F[m]['creator_buy_sol']) == 0),
                         'tape_census_differ': sum(F[m]['tape_census_diff_gt1e6'] == 'True' for m in F), 'feature_unknown': sum(F[m]['feature_known'] != 'True' for m in F),
                         'size_quantiles_SOL': [float(sorted(decimal.Decimal(F[m]['creator_buy_sol']) for m in F)[int(678 * q)]) for q in (0, .25, .5, .75, .9, 1.0)]},
     'paired_R11': {'both_resolved': sum(1 for z in kept if z['norm'] == 'resolved'), 'difference_sol': 0.0, 'candidate_only_resolved': 0, 'control_only_resolved': sum(1 for z in rem if z['norm'] == 'resolved'),
                    'note': 'entry veto: candidate rows are the control rows on kept mints by construction (verified record-level below)'}}
# record-level comparison against Codex's published partitions (every field Codex publishes vs Claude's f014 control row)
def readparts(prefix):
    rows = []
    for p in sorted(pubdir.glob(prefix + '_*.csv')):
        rows += list(csv.DictReader(open(p)))
    return rows
pub = {name: readparts('trades_' + name) for name in ('control', 'candidate', 'removed')}
mine = {z['mint']: z for z in E}
cmp = {}
for name, rows in pub.items():
    n = 0; mism = []
    for p in rows:
        z = mine[p['mint']]
        assert p['normalized_status'] == z['norm'], (name, p['mint'], p['normalized_status'], z['norm'])
        for k in ['cat', 'why', 'cell', 'half', 'entry_t', 'entry_age_s', 'fill_state_age_s', 'trigger_t', 't_sell', 'hold_s', 'exit_state_age_s', 'net_sol', 'ret', 'exit', 'exit_kind', 'fill_venue', 'exit_venue', 'eligible_E', 'tier', 'created']:
            a, b = p.get(k, ''), z.get(k, '')
            if a in ('', None) and b in ('', None): n += 1; continue
            try:
                ok = abs(float(a) - float(b)) <= 1e-9
            except ValueError:
                ok = str(a) == str(b)
            if ok: n += 1
            else: mism.append((p['mint'], k, a, b))
        assert (p['veto'] == 'True') == z['veto']
    cmp[name] = {'rows': len(rows), 'fields_equal': n, 'mismatches': mism[:10], 'n_mismatch': len(mism)}
R['record_level_vs_codex_partitions'] = cmp
json.dump(R, open(out, 'w'), indent=2, default=str)
print(json.dumps({k: R[k] for k in ('control', 'candidate_kept', 'removed', 'kept_minus_removed', 'precheck_counts', 'record_level_vs_codex_partitions')}, indent=1, default=str))
