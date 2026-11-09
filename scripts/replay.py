# $100K cap-band trading replay — implements REPLAY_SPEC_v1 + Addenda 1–4 (reports/analysis/100k/confirm_8nov). 9 Nov 2026.
# argv: cohort.json  cohort_trades.pkl.gz  feedgaps_dir(s, comma-separated)  out_prefix  [pool_pricing: trade|reserve]
import sys, json, gzip, pickle, csv, bisect, math, collections, random, statistics as st
COH = json.load(open(sys.argv[1]))['rows']; TR = pickle.load(gzip.open(sys.argv[2])); GAPDIRS = sys.argv[3].split(','); OUT = sys.argv[4]
PP = sys.argv[5] if len(sys.argv) > 5 else 'trade'
FEE_CURVE, FEE_POOL, FIXED = 0.0125, 0.0055, 0.0015
BANDS = [(0, 5e3), (5e3, 10e3), (10e3, 15e3), (15e3, 20e3), (20e3, 30e3), (30e3, 50e3), (50e3, 100e3)]
BN = ['<5K', '5-10K', '10-15K', '15-20K', '20-30K', '30-50K', '50-100K']
EXITS = ['X15', 'X30', 'X60', 'T25', 'T40', 'TP2', 'H2T40']
BLOCK0, BLOCK = 1794048300, 4 * 3600
# ---------- feed gaps (A3/D2): curve stream idle-60/closed/error -> next subscribed; pool stream pool-closed/pool-error -> next pool-subscribed
ev = []
for d in GAPDIRS:
    for r in csv.DictReader(gzip.open(d + '/feed_gaps_all.csv.gz', 'rt')): ev.append((int(r['ts']), r['event']))
ev = sorted(set(ev))
def gaps(starts, end):
    G, open_at = [], None
    for t, e in ev:
        if e in starts and open_at is None: open_at = t - 60 if e == 'idle' else t
        elif e == end and open_at is not None: G.append((open_at, t)); open_at = None
    return G
GAP = {'curve': gaps({'idle', 'closed', 'error'}, 'subscribed'), 'pool': gaps({'pool-closed', 'pool-error'}, 'pool-subscribed')}
def gap_overlap(venue, a, b):
    for x, y in GAP['pool' if venue != 'curve' else 'curve']:
        if x <= b and y >= a: return True
    return False
def gap_over(venue, a, b, lim):
    return any(min(y, b) - max(x, a) > lim for x, y in GAP['pool' if venue != 'curve' else 'curve'] if x <= b and y >= a)
# ---------- trade tuple: (slot, ev_idx, row_id, ts, venue, is_buy, sol, tokens, price_sol, vsol, vtok, pq_raw, pb_raw, px_adj)
def spot(s):  # price in SOL/token of a state row
    if s[4] == 'curve': return (s[9] / 1e9) / (s[10] / 1e6)
    if PP == 'reserve' and s[11] and s[12]: return (s[11] / 1e9) / (s[12] / 1e6)
    return s[8]
def buy(s, sol):
    if s[4] == 'curve':
        vs, vt = s[9] / 1e9, s[10] / 1e6; i = sol * (1 - FEE_CURVE); return vt - vs * vt / (vs + i)
    p = spot(s); i = sol * (1 - FEE_POOL); q = s[11] / 1e9 if s[11] else None
    return i / p * (q / (q + i) if q else 1.0)
def sell(s, tk):
    if s[4] == 'curve':
        vs, vt = s[9] / 1e9, s[10] / 1e6; return (vs - vs * vt / (vt + tk)) * (1 - FEE_CURVE)
    p = spot(s); b = s[12] / 1e6 if s[12] else None
    return tk * p * (b / (b + tk) if b else 1.0) * (1 - FEE_POOL)
def state_at(tr, tsl, T):  # last trade with ts <= T
    i = bisect.bisect_right(tsl, T) - 1
    return (i, tr[i]) if i >= 0 else (None, None)
def check_state(s, T):
    if s is None: return 'none'
    age = T - s[3]
    if age > 30: return 'old'
    if gap_overlap(s[4], s[3], T): return 'gap'
    if s[4] == 'curve' and s[9] / 1e9 >= 114.9: return 'curve-complete'
    return 'stale' if age > 5 else 'ok'
def sell_at(tr, tsl, T, tk):  # sell everything at time T (horizon / fixed / time-stop); returns proceeds, tag
    i, s = state_at(tr, tsl, T); c = check_state(s, T)
    if c == 'gap': return None, 'UNRESOLVED', s
    if c == 'old': return sell(s, tk), 'QUIET-PRICED', s
    return sell(s, tk), ('STALE-PRICED' if c == 'stale' else 'ok'), s
def run(r, size):
    m = r['mint']; tr = TR.get(m, []); tsl = [x[3] for x in tr]
    land = math.floor(r['decision_ts'] + 1)
    i0, s0 = state_at(tr, tsl, land); c0 = check_state(s0, land)
    if c0 in ('none', 'old', 'gap', 'curve-complete'): return {e: dict(status='UNAVAILABLE', why=c0) for e in EXITS}
    tk0 = buy(s0, size); pfill = size / tk0; peak0 = spot(s0)
    after = [x for x in tr[i0 + 1:] if land < x[3] <= land + 7200]
    res = {}
    for e in EXITS:
        tk = tk0; proceeds = 0.0; tags = set(); exit_ts = None; last_state = s0
        if e[0] == 'X':
            T = land + int(e[1:]) * 60; p, tag, ls = sell_at(tr, tsl, T, tk); exit_ts = T
            if p is None: res[e] = dict(status='UNRESOLVED', s_last=ls, tk=tk, pfill=pfill, exit_ts=T, entry_venue=s0[4]); continue
            proceeds = p; tags.add(tag)
        else:
            trail = {'T25': .25, 'T40': .40, 'H2T40': .40}.get(e); peak = peak0; half_done = False; done = False
            if e == 'H2T40':
                T60 = land + 60; _, s60 = state_at(tr, tsl, T60)
                if s60 is not None and spot(s60) < pfill:
                    p, tag, ls = sell_at(tr, tsl, T60, tk)
                    if p is None: res[e] = dict(status='UNRESOLVED', s_last=ls, tk=tk, pfill=pfill, exit_ts=T60, entry_venue=s0[4]); continue
                    proceeds = p; tags.add(tag); done = True; exit_ts = T60
            if not done:
                for j, x in enumerate(after):
                    px = x[8]; t = x[3]
                    if e == 'H2T40' and t <= land + 60: peak = max(peak, px); continue  # trail/TP evaluated after the 60-s time stop check
                    loss = (trail is not None and px <= peak * (1 - trail)) or (e == 'TP2' and px <= 0.5 * pfill)
                    win = (e == 'TP2' and px >= 2 * pfill) or (e == 'H2T40' and not half_done and px >= 2 * pfill)
                    if loss or win:
                        _, ss = state_at(tr, tsl, t)  # state after the last trade in the trigger's second (lands t+0.7)
                        c = check_state(ss, t)
                        if c == 'gap': tags.add('UNRESOLVED-LEG');
                        if loss or e == 'TP2':
                            proceeds += sell(ss, tk); tk = 0; exit_ts = t; done = True; break
                        else:  # H2T40 half at 2x
                            proceeds += sell(ss, tk / 2); tk = tk / 2; half_done = True
                    peak = max(peak, px)
                if not done:
                    T = land + 7200; p, tag, ls = sell_at(tr, tsl, T, tk); exit_ts = T
                    if p is None: res[e] = dict(status='UNRESOLVED', s_last=ls, tk=tk, pfill=pfill, exit_ts=T, entry_venue=s0[4], partial=proceeds); continue
                    proceeds += p; tags.add(tag)
        if 'UNRESOLVED-LEG' in tags: res[e] = dict(status='UNRESOLVED', s_last=None, tk=tk, pfill=pfill, exit_ts=exit_ts, entry_venue=s0[4], partial=proceeds); continue
        net = proceeds - size - FIXED
        res[e] = dict(status='FILLED', ret=net / size, net=net, exit_ts=exit_ts, tags=sorted(tags - {'ok'}), entry_venue=s0[4], stale_entry=(c0 == 'stale'))
    return res
def score(x, size):  # primary: UNRESOLVED = zero proceeds; scenario b = last state quote
    if x['status'] == 'FILLED': return x['ret'], x['ret']
    if x['status'] == 'UNRESOLVED':
        a = (x.get('partial', 0) - size - FIXED) / size
        b = a if x.get('s_last') is None else (x.get('partial', 0) + sell(x['s_last'], x['tk']) - size - FIXED) / size
        return a, b
    return None, None
def band(mc):
    for i, (a, b) in enumerate(BANDS):
        if a <= mc < b: return i
    return None
def adequately_observed(r):  # A5: no feed gap > 300 s in the 2 h after creation, on curve stream (and pool stream if migrated)
    c = r['create_ts']; vs = ['curve'] + (['pool'] if r['graduated'] in ('1', 'true') else [])
    return not any(gap_over(v, c, c + 7200, 300) for v in vs)
rng = random.Random(20261108)
def boot(vals):  # vals: list of (block, net_sol); non-overlapping 4-h block bootstrap of the mean
    B = collections.defaultdict(list)
    for b, v in vals: B[b].append(v)
    keys = list(B); R = []
    if len(keys) < 2: return None, None, None, len(keys)
    for _ in range(10000):
        s = [];
        for _k in keys: s += B[keys[rng.randrange(len(keys))]]
        R.append(sum(s) / len(s))
    R.sort(); q = lambda p: R[min(len(R) - 1, max(0, int(p * len(R))))]
    return q(0.025), q(0.975), q(0.05 / 49), len(keys)
out = []; P = lambda *a: out.append(' '.join(str(x) for x in a))
P(f"$100K CAP-BAND REPLAY — pool pricing: {PP}. Cohort {len(COH)} coins (strict, on-time 5-min reading). Spec: REPLAY_SPEC_v1 + Addenda 1–4.")
per = []
for size in (0.2, 0.02):
    R = {r['mint']: run(r, size) for r in COH}
    P(f"\n=== SIZE {size} SOL ({'PRIMARY, tested' if size == 0.2 else 'secondary, descriptive'}) ===")
    P("band     exit   attempted unavail filled unresolved quiet stale | mean%  median%  win%  no-best%  loss>=50%  total SOL | 95% CI SOL/entry | Bonf-LB SOL/entry | blocks | scen-b mean%")
    for bi, bn in enumerate(BN):
        rows = [r for r in COH if band(r['mc5']) == bi]
        for e in EXITS:
            xs = [(r, R[r['mint']][e]) for r in rows]
            un = sum(x['status'] == 'UNAVAILABLE' for _, x in xs); fl = [(r, x) for r, x in xs if x['status'] != 'UNAVAILABLE']
            ures = sum(x['status'] == 'UNRESOLVED' for _, x in fl)
            quiet = sum('QUIET-PRICED' in x.get('tags', []) for _, x in fl); stale = sum(x.get('stale_entry', False) or 'STALE-PRICED' in x.get('tags', []) for _, x in fl)
            sc = [(r, *score(x, size)) for r, x in fl]
            if not sc: P(f"{bn:8s} {e:6s} {len(rows):5d} {un:5d} {0:5d}  insufficient evidence"); continue
            a = [v for _, v, _ in sc]; b = [v for _, _, v in sc]; srt = sorted(a)
            lo, hi, lb, nb = boot([(int((r['decision_ts'] - BLOCK0) // BLOCK), v * size) for r, v, _ in sc]) if size == 0.2 else (None, None, None, None)
            P(f"{bn:8s} {e:6s} {len(rows):5d} {un:5d} {len(fl):5d} {ures:5d} {quiet:5d} {stale:5d} | {100*st.mean(a):+6.1f} {100*st.median(a):+6.1f} {100*sum(v>0 for v in a)/len(a):4.0f} {100*st.mean(srt[:-1] or srt):+7.1f} {100*sum(v<=-0.5 for v in a)/len(a):5.0f} {sum(a)*size:+8.3f} | "
              + (f"[{lo:+.4f}, {hi:+.4f}] | {lb:+.4f} | {nb}" if lo is not None else "- | - | -") + f" | {100*st.mean(b):+6.1f}")
            if size == 0.2: per.append(dict(band=bn, exit=e, n=len(fl), mean=st.mean(a), lb=lb, total=sum(a) * size))
    if size == 0.2:
        # capital saved on adequately observed NOCROSS coins vs holding to 120 min; runners stopped early
        P("\nCAPITAL SAVED vs holding 120 min after entry (NOCROSS_OBS, adequately observed, A5) and POS runners exited before their $100K crossing:")
        H = {r['mint']: run(r, size) for r in COH}  # same as R; reuse
        for e in EXITS:
            sv = []; early = 0; npos = 0; forg = []
            for r in COH:
                x = R[r['mint']][e]
                if x['status'] == 'UNAVAILABLE': continue
                hold = dict(R[r['mint']]['X60']); # placeholder for structure
                if r['label'] == 'NOCROSS_OBS' and adequately_observed(r):
                    a, _ = score(x, size)
                    # hold-to-horizon value: rerun as fixed 120-min exit
                    h = None
                    tr = TR.get(r['mint'], []); tsl = [y[3] for y in tr]; land = math.floor(r['decision_ts'] + 1)
                    _, s0 = state_at(tr, tsl, land); tk0 = buy(s0, size); p, tag, ls = sell_at(tr, tsl, land + 7200, tk0)
                    h = -1.0075 if p is None else (p - size - FIXED) / size
                    sv.append((a - h) * size)
                if r['label'] == 'POS':
                    npos += 1
                    if x.get('exit_ts') and r['cross_ts'] and x['exit_ts'] < r['cross_ts']: early += 1
            unk = sum(1 for r in COH if r['label'] == 'NOCROSS_OBS' and not adequately_observed(r))
            P(f"  {e:6s}: saved on {len(sv)} adequately-observed non-crossers: {sum(sv):+.2f} SOL total ({(st.mean(sv) if sv else 0):+.4f}/coin) | non-crossers not adequately observed (UNKNOWN): {unk} | POS entered {npos}, exited before crossing {early}")
P("\nTOP 8 CELLS by mean net return (exploratory; 49 tried — expect some to look good by chance):")
for d in sorted(per, key=lambda d: -d['mean'])[:8]: P(f"  {d['band']:8s} {d['exit']:6s} n {d['n']:4d} mean {100*d['mean']:+.1f}% total {d['total']:+.2f} SOL Bonf-LB {d['lb']:+.4f} SOL/entry")
P(f"\nCells with Bonferroni lower bound > 0: {sum(1 for d in per if d['lb'] is not None and d['lb'] > 0)} of {len(per)}")
open(OUT + '.txt', 'w').write('\n'.join(out)); json.dump(per, open(OUT + '.json', 'w')); print('\n'.join(out))
