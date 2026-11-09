# $100K replay v2 — 9 Nov 2026 evening. Same cohort, clocks, fees, exits and scoring as replay.py (v1, unchanged), with two corrections:
#  C1 (pool pricing, POOL_DIAGNOSIS.md): pump-pool event reserves are PRE-trade. The state after a swap = (Q ± quote, B ∓ base).
#     Swaps execute as constant product on (Q + c, B), where c is a near-constant per-pool quote offset (median ≈ 17 SOL; mechanism unidentified).
#     c is estimated from the SAME pool's own earlier swaps only (median implied offset over the last 50 swaps with ts <= T; at least 5 needed).
#     Fewer than 5 → the pool leg is priced by v1's method and tagged CAL-FALLBACK, reported separately.
#  C3 (triggers): trailing/TP triggers read the post-swap spot of each trade (curve: virtual reserves after the trade; pool: (Q±q + c)/(B∓b)),
#     not the swap's own average price — a pool-draining sell shows its true after-price (v1 missed rugs whose own average price looked normal).
#     Run with TRIGGER=trade (env) to reproduce v2-without-C3.
#  C2 (scoring): a sell leg that falls in a feed gap no longer adds its proceeds; UNRESOLVED keeps only legs already realised before it.
# argv: cohort.json cohort_trades.pkl.gz gapdirs out_prefix
import os, sys, json, gzip, pickle, csv, bisect, math, collections, random, statistics as st
COH = json.load(open(sys.argv[1]))['rows']; TR = pickle.load(gzip.open(sys.argv[2])); GAPDIRS = sys.argv[3].split(','); OUT = sys.argv[4]
FEE_CURVE, FEE_POOL, FIXED = 0.0125, 0.0055, 0.0015
ORIG_BANDS = [('<5K', 0, 5e3), ('5-10K', 5e3, 10e3), ('10-15K', 10e3, 15e3), ('15-20K', 15e3, 20e3), ('20-30K', 20e3, 30e3), ('30-50K', 30e3, 50e3), ('50-100K', 50e3, 100e3)]
EXTRA_BANDS = [('30-40K', 30e3, 40e3), ('40-50K', 40e3, 50e3), ('20-50K', 20e3, 50e3)]
ORIG_EXITS = ['X15', 'X30', 'X60', 'T25', 'T40', 'TP2', 'H2T40']
SEARCH_EXITS = ['T15', 'T20', 'T30', 'T35', 'H2T25', 'H2T20']   # finite search, recorded in full
EXITS = ORIG_EXITS + SEARCH_EXITS
BLOCK0, BLOCK = 1794048300, 4 * 3600
ev = []
for d in GAPDIRS:
    for r in csv.DictReader(gzip.open(d + '/feed_gaps_all.csv.gz', 'rt')): ev.append((int(r['ts']), r['event']))
ev = sorted(set(ev))
def gaps(starts, end):
    G, o = [], None
    for t, e in ev:
        if e in starts and o is None: o = t - 60 if e == 'idle' else t
        elif e == end and o is not None: G.append((o, t)); o = None
    return G
GAP = {'curve': gaps({'idle', 'closed', 'error'}, 'subscribed'), 'pool': gaps({'pool-closed', 'pool-error'}, 'pool-subscribed')}
def gap_overlap(v, a, b): return any(x <= b and y >= a for x, y in GAP['curve' if v == 'curve' else 'pool'])
# ---------- per-pool offset calibration (C1)
CAL = {}
for m, tr in TR.items():
    L = []
    for x in tr:
        if x[4] != 'pumpswap' or not x[11] or not x[12] or x[6] <= 0.01 or x[7] <= 0: continue
        Q, B, q, b = x[11] / 1e9, x[12] / 1e6, x[6], x[7]
        L.append((x[3], (B * q / b - q - Q) if x[5] else (q * (B + b) / b - Q)))
    CAL[m] = ([t for t, _ in L], [c for _, c in L])
def offset(m, T):
    ts, cs = CAL.get(m, ([], []))
    i = bisect.bisect_right(ts, T)
    if i < 5: return None
    return st.median(cs[max(0, i - 50):i])
def pool_post(s):  # reserves after the swap s (event reserves are pre-trade)
    Q, B = s[11] / 1e9, s[12] / 1e6
    return (Q + s[6], B - s[7]) if s[5] else (Q - s[6], B + s[7])
def eff(m, s, T):  # effective (Q, B) after state s, or None → fallback
    if not s[11] or not s[12]: return None
    c = offset(m, T)
    if c is None: return None
    Q, B = pool_post(s); return (Q + c, B)
def post_spot(m, x):  # C3
    if not x[11] or not x[12]: return x[8]
    c = offset(m, x[3])
    if c is None: return x[8]
    Q, B = pool_post(x); return (Q + c) / B if B > 0 else x[8]
def spot(m, s, T):
    if s[4] == 'curve': return (s[9] / 1e9) / (s[10] / 1e6)
    e = eff(m, s, T); return e[0] / e[1] if e else s[8]
def buy(m, s, sol, T, tags):
    if s[4] == 'curve':
        vs, vt = s[9] / 1e9, s[10] / 1e6; i = sol * (1 - FEE_CURVE); return vt - vs * vt / (vs + i)
    i = sol * (1 - FEE_POOL); e = eff(m, s, T)
    if e: Q, B = e; return B - Q * B / (Q + i)
    tags.add('CAL-FALLBACK'); q = s[11] / 1e9 if s[11] else None
    return i / s[8] * (q / (q + i) if q else 1.0)
def sell(m, s, tk, T, tags):
    if s[4] == 'curve':
        vs, vt = s[9] / 1e9, s[10] / 1e6; return (vs - vs * vt / (vt + tk)) * (1 - FEE_CURVE)
    e = eff(m, s, T)
    if e: Q, B = e; return (Q - Q * B / (B + tk)) * (1 - FEE_POOL)
    tags.add('CAL-FALLBACK'); b = s[12] / 1e6 if s[12] else None
    return tk * s[8] * (b / (b + tk) if b else 1.0) * (1 - FEE_POOL)
def state_at(tr, tsl, T):
    i = bisect.bisect_right(tsl, T) - 1
    return (i, tr[i]) if i >= 0 else (None, None)
def check(s, T):
    if s is None: return 'none'
    if T - s[3] > 30: return 'old'
    if gap_overlap(s[4], s[3], T): return 'gap'
    if s[4] == 'curve' and s[9] / 1e9 >= 114.9: return 'curve-complete'
    return 'stale' if T - s[3] > 5 else 'ok'
def run(r, size, exits=EXITS):
    m = r['mint']; tr = TR.get(m, []); tsl = [x[3] for x in tr]
    land = math.floor(r['decision_ts'] + 1)
    i0, s0 = state_at(tr, tsl, land); c0 = check(s0, land)
    if c0 in ('none', 'old', 'gap', 'curve-complete'): return {e: dict(status='UNAVAILABLE', why=c0) for e in exits}
    etags = set(); tk0 = buy(m, s0, size, land, etags); pfill = size / tk0; peak0 = spot(m, s0, land)
    after = [x for x in tr[i0 + 1:] if land < x[3] <= land + 7200]
    res = {}
    for e in exits:
        tk = tk0; got = 0.0; tags = set(etags); done = False; ex_ts = None; unres = None
        def sell_time(T, tk):
            _, s = state_at(tr, tsl, T); c = check(s, T)
            if c == 'gap' or s is None: return None, s
            if c == 'old': tags.add('QUIET-PRICED')
            elif c == 'stale': tags.add('STALE-PRICED')
            return sell(m, s, tk, T, tags), s
        if e[0] == 'X':
            T = land + int(e[1:]) * 60; p, s = sell_time(T, tk); ex_ts = T
            if p is None: unres = s
            else: got = p; tk = 0
        else:
            if e.startswith('H2T'): trail = int(e[3:]) / 100
            elif e[0] == 'T' and e != 'TP2': trail = int(e[1:]) / 100
            else: trail = None
            peak = peak0; half = False
            if e.startswith('H2T'):
                T60 = land + 60; _, s60 = state_at(tr, tsl, T60)
                if s60 is not None and spot(m, s60, T60) < pfill:
                    p, s = sell_time(T60, tk); ex_ts = T60; done = True
                    if p is None: unres = s
                    else: got = p; tk = 0
            if not done:
                for x in after:
                    t = x[3]; px = x[8] if (os.environ.get('TRIGGER') == 'trade' or x[4] == 'curve') else post_spot(m, x)
                    if e.startswith('H2T') and t <= land + 60: peak = max(peak, px); continue
                    loss = (trail is not None and px <= peak * (1 - trail)) or (e == 'TP2' and px <= 0.5 * pfill)
                    win = (e == 'TP2' and px >= 2 * pfill) or (e.startswith('H2T') and not half and px >= 2 * pfill)
                    if loss or win:
                        _, ss = state_at(tr, tsl, t)
                        if check(ss, t) == 'gap':          # C2: leg not executable on evidence → unresolved, no proceeds added
                            unres = ss; ex_ts = t; done = True; break
                        if loss or e == 'TP2':
                            got += sell(m, ss, tk, t, tags); tk = 0; ex_ts = t; done = True; break
                        got += sell(m, ss, tk / 2, t, tags); tk /= 2; half = True
                    peak = max(peak, px)
                if not done:
                    T = land + 7200; p, s = sell_time(T, tk); ex_ts = T
                    if p is None: unres = s
                    else: got += p; tk = 0
        if tk > 0:  # unresolved remainder
            b_val = (sell(m, unres, tk, ex_ts, set()) if unres is not None else 0.0)
            res[e] = dict(status='UNRESOLVED', ret_a=(got - size - FIXED) / size, ret_b=(got + b_val - size - FIXED) / size, exit_ts=ex_ts, tags=sorted(tags), venue=s0[4], pfill=pfill)
        else:
            net = got - size - FIXED
            res[e] = dict(status='FILLED', ret_a=net / size, ret_b=net / size, exit_ts=ex_ts, tags=sorted(tags), venue=s0[4], pfill=pfill)
    return res
rng = random.Random(20261108)
def boot(vals, ncells=49):
    B = collections.defaultdict(list)
    for b, v in vals: B[b].append(v)
    ks = list(B)
    if len(ks) < 2: return None, None, None, len(ks)
    R = []
    for _ in range(10000):
        s = []
        for _k in ks: s += B[ks[rng.randrange(len(ks))]]
        R.append(sum(s) / len(s))
    R.sort(); q = lambda p: R[min(len(R) - 1, max(0, int(p * len(R))))]
    return q(.025), q(.975), q(.05 / ncells), len(ks)
if __name__ == '__main__':
    out = []; P = lambda *a: out.append(' '.join(str(x) for x in a))
    RES = {size: {r['mint']: run(r, size) for r in COH} for size in (0.2, 0.02)}
    GZ = gzip.open(OUT + '_positions.csv.gz', 'wt'); w = csv.writer(GZ)
    w.writerow(['size_sol', 'mint', 'label', 'create_ts', 'decision_ts', 'mc5_usd', 'exit', 'status', 'why', 'entry_venue', 'tags', 'exit_ts', 'ret_zero_remainder', 'ret_last_state_remainder', 'cross_ts'])
    for size, R in RES.items():
        for r in COH:
            for e, x in R[r['mint']].items():
                w.writerow([size, r['mint'], r['label'], r['create_ts'], r['decision_ts'], r['mc5'], e, x['status'], x.get('why', ''), x.get('venue', ''), ';'.join(x.get('tags', [])), x.get('exit_ts', ''), x.get('ret_a', ''), x.get('ret_b', ''), r['cross_ts'] or ''])
    GZ.close()
    def cell(rows, e, size, ncells=49):
        xs = [(r, RES[size][r['mint']][e]) for r in rows]
        un = sum(x['status'] == 'UNAVAILABLE' for _, x in xs); fl = [(r, x) for r, x in xs if x['status'] != 'UNAVAILABLE']
        if not fl: return dict(n=0, att=len(rows), un=un)
        a = [x['ret_a'] for _, x in fl]; b = [x['ret_b'] for _, x in fl]; s = sorted(a)
        lo, hi, lb, nb = boot([(int((r['decision_ts'] - BLOCK0) // BLOCK), x['ret_a'] * size) for r, x in fl], ncells)
        return dict(att=len(rows), un=un, n=len(fl), ures=sum(x['status'] == 'UNRESOLVED' for _, x in fl), quiet=sum('QUIET-PRICED' in x['tags'] for _, x in fl),
                    fb=sum('CAL-FALLBACK' in x['tags'] for _, x in fl), mean=st.mean(a), med=st.median(a), win=sum(v > 0 for v in a) / len(a), nobest=st.mean(s[:-1] or s),
                    sev=sum(v <= -0.5 for v in a) / len(a), tot=sum(a) * size, lo=lo, hi=hi, lb=lb, nb=nb, meanb=st.mean(b))
    fmt = lambda d: (f"{d['att']:5d} {d['un']:5d} {d['n']:4d} {d['ures']:3d} {d['quiet']:4d} {d['fb']:4d} | {100*d['mean']:+6.1f} {100*d['med']:+6.1f} {100*d['win']:4.0f} {100*d['nobest']:+6.1f} {100*d['sev']:4.0f} {d['tot']:+7.3f} | "
                     + (f"[{d['lo']:+.4f},{d['hi']:+.4f}] {d['lb']:+.4f} {d['nb']}" if d['lo'] is not None else '-') + f" | {100*d['meanb']:+6.1f}") if d.get('n') else f"{d['att']:5d} {d['un']:5d}    0  insufficient evidence"
    def band_rows(lo, hi): return [r for r in COH if lo <= r['mc5'] < hi]
    P("$100K REPLAY v2 (corrected pool pricing C1 + unresolved-leg scoring C2). Cohort", len(COH))
    hdr = "band     exit   att unav fill unr quiet calFB | mean%  med%  win% nobest% sev% totalSOL | 95%CI  Bonf-LB(49) blocks | mean% if remainder valued at last state"
    for size in (0.2, 0.02):
        P(f"\n=== ORIGINAL 49 CELLS, {size} SOL ===\n" + hdr)
        for bn, lo, hi in ORIG_BANDS:
            for e in ORIG_EXITS: P(f"{bn:8s} {e:6s} " + fmt(cell(band_rows(lo, hi), e, size)))
    P("\n=== SHORTLIST (identical entries; 0.2 SOL primary, 0.02 SOL secondary) ===\n" + hdr)
    for size in (0.2, 0.02):
        for bn, lo, hi, e in (('30-50K', 30e3, 50e3, 'T25'), ('30-40K', 30e3, 40e3, 'T25'), ('30-40K', 30e3, 40e3, 'T20')):
            P(f"{size} {bn:7s} {e:5s} " + fmt(cell(band_rows(lo, hi), e, size)))
    P("\n=== FINITE SEARCH (exploratory; every configuration tried is listed): bands 20-30K, 30-40K, 40-50K, 30-50K, 20-50K × exits " + ','.join(EXITS) + ", 0.2 SOL ===\n" + hdr)
    for bn, lo, hi in [ORIG_BANDS[4], EXTRA_BANDS[0], EXTRA_BANDS[1], ORIG_BANDS[5], EXTRA_BANDS[2]]:
        for e in EXITS: P(f"{bn:8s} {e:6s} " + fmt(cell(band_rows(lo, hi), e, 0.2, ncells=5 * len(EXITS) + 49)))
    open(OUT + '.txt', 'w').write('\n'.join(out)); print('\n'.join(out))
