#!/usr/bin/env python3
"""F012: re-derive Codex L008 (lag veto) headline figures from Codex's PUBLISHED CSVs (research-codex @ d820bda,
runs/c016-lab-20261113T091125Z/trade_{l008,baseline,vetoed}_*.csv, paired_filter_*.csv), with independent code.
Counts and totals only. usage: codex_l008_rederive.py <dir with the CSVs> <out.json>"""
import sys, csv, glob, json, math, statistics, collections

D, OUT = sys.argv[1], sys.argv[2]

def load(prefix):
    rows = []
    for p in sorted(glob.glob(f'{D}/trade_{prefix}_*.csv')):
        with open(p, newline='') as f:
            rows.extend(csv.DictReader(f))
    return rows

A, B, V = load('l008'), load('baseline'), load('vetoed')

def block(rows, half=None):
    rr = [r for r in rows if half is None or r['half'] == half]
    st = collections.Counter(r['status'] for r in rr)
    net = sorted(float(r['net_sol']) for r in rr if r['status'] == 'scored')
    ret = [float(r['ret']) for r in rr if r['status'] == 'scored']
    out = {'attempted': len(rr), 'filled': st['scored'] + st['exit_uncertain'], 'fill_unavailable': st['fill_unavailable'],
           'resolved': st['scored'], 'uncertain_exits': st['exit_uncertain'], 'total_sol': math.fsum(net)}
    if net:
        out.update(mean_sol=statistics.mean(net), median_sol=statistics.median(net),
                   mean_return=statistics.mean(ret), median_return=statistics.median(ret),
                   win_rate=sum(1 for x in net if x > 0) / len(net),
                   share_loss_gt50=sum(1 for x in ret if x < -0.5) / len(net),
                   without_best1=math.fsum(net[:-1]), without_best3=math.fsum(net[:-3]))
    return out

res = {'source': 'research-codex @ d820bda863f680e9e097274412ddcce5c0d47e6a, runs/c016-lab-20261113T091125Z published CSVs',
       'rows': {'l008': len(A), 'baseline': len(B), 'vetoed': len(V)},
       'l008': {h: block(A, None if h == 'all' else h) for h in ('early', 'late', 'all')},
       'vetoed': {h: block(V, None if h == 'all' else h) for h in ('early', 'late', 'all')},
       'baseline': {h: block(B, None if h == 'all' else h) for h in ('early', 'late', 'all')}}
# consistency: l008 + vetoed = baseline, mint-disjoint, shared trades identical
am, vm, bm = {r['mint'] for r in A}, {r['mint'] for r in V}, {r['mint'] for r in B}
res['partition'] = {'l008_plus_vetoed_equals_baseline': am | vm == bm and not (am & vm), 'baseline_mints': len(bm)}
Bm = {r['mint']: r for r in B}
ident = sum(1 for r in A if all(r[k] == Bm[r['mint']][k] for k in r if k not in ('variant',)))
res['l008_rows_identical_to_baseline_row'] = {'identical': ident, 'of': len(A)}
# kept vs removed per-trade
k = [float(r['net_sol']) for r in A if r['status'] == 'scored']; rm = [float(r['net_sol']) for r in V if r['status'] == 'scored']
res['kept_minus_removed_mean_sol'] = statistics.mean(k) - statistics.mean(rm)
res['removed_resolved_lt_30'] = len(rm) < 30
# paired view from paired_filter CSVs
pairs = []
for p in sorted(glob.glob(f'{D}/paired_filter_*.csv')):
    with open(p, newline='') as f: pairs.extend(csv.DictReader(f))
res['paired'] = {'n': len(pairs), 'candidate_total': math.fsum(float(r['candidate_net_sol']) for r in pairs),
                 'baseline_total': math.fsum(float(r['baseline_net_sol']) for r in pairs),
                 'max_abs_difference': max((abs(float(r['difference_sol'])) for r in pairs), default=0.0),
                 'candidate_only_resolved': sum(1 for r in A if r['status'] == 'scored' and Bm[r['mint']]['status'] != 'scored'),
                 'baseline_only_resolved': sum(1 for r in B if r['status'] == 'scored' and r['mint'] in vm)}
# lag feature descriptives (from the published lag_feature JSON column)
lags = [json.loads(r['lag_feature'])['median_lag_s'] for r in B]
res['lag_feature'] = {'n': len(lags), 'median_of_medians_s': statistics.median(lags), 'share_gt_1s': sum(1 for x in lags if x > 1) / len(lags),
                      'min': min(lags), 'max': max(lags), 'veto_count_from_feature': sum(1 for x in lags if x > 1)}
json.dump(res, open(OUT, 'w'), indent=2)
print(json.dumps(res, indent=2))
