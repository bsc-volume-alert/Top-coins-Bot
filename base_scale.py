"""Tests per BASE_SCALE_SPEC.md (frozen). Exploratory."""
import sys, math, bisect, collections, statistics as st
sys.argv = ['x', 'A', 'B_tr.pkl.gz', '../inv/pkg', 'bs']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':", 1)[0])
exec(open('sim22.py').read())
L_ = []; P = lambda *a: (L_.append(' '.join(map(str, a))), print(*a, flush=True))
def series(W, m):
    xs = sorted((((x[14] or x[3] * 1000) / 1000), x[3], x[8], x[5], x[6]) for x in (W.TR.get(m) or []) if x[8] and x[8] > 0)
    out, prev = [], None
    for s in xs:
        if prev and s[2] > 10 * prev: continue
        out.append(s); prev = s[2]
    return out
def pos(W, m, T, stake0, scale=False, trail=.25):
    """returns dict or None (unavailable). P&L in SOL incl. fixed fees."""
    land = math.floor(T + 1); i0, x0 = W.state(m, land); c0 = W.check(x0, land)
    if c0 in ('none', 'old', 'gap', 'curve-complete'): return None
    tags = set(); dummy = set(); tk = W.buy(m, x0, stake0, tags); tk0 = tk; inv = stake0; adds = 0; add_ts = None
    tr = W.TR[m]; slots = [x[0] for x in tr]
    def landed(x): j = bisect.bisect_right(slots, x[0] + 2) - 1; return tr[max(j, 0)]
    after = [x for x in tr[i0 + 1:] if land < x[3] <= land + 7200]
    val = lambda x: W.sell(m, x, tk0, dummy) / tk0
    v0 = val(x0); peak = v0; hi = v0
    H1 = None; dipped = False; Lo = None; addable = scale
    got = None; ex_ts = None; gapdump = False; unres = False
    for x in after:
        vt = val(x); hi = max(hi, vt)
        if addable:
            if H1 is None:
                if vt >= 1.30 * v0: H1 = vt
            elif not dipped:
                if vt > H1: H1 = vt
                elif vt <= 0.9 * H1: dipped = True; Lo = vt
            else:
                Lo = min(Lo, vt)
                if Lo <= v0: addable = False
                elif vt > H1:
                    ss = landed(x)
                    if not W.gap_overlap(ss[4], x[3], ss[3] + 1):
                        tk += W.buy(m, ss, 0.15, tags); inv += 0.15; adds = 1; add_ts = ss[3]
                    addable = False
        if vt <= peak * (1 - trail):
            ss = landed(x)
            if W.gap_overlap(ss[4], x[3], ss[3] + 1): unres = True; got = 0.0; ex_ts = x[3]; break
            got = W.sell(m, ss, tk, tags); ex_ts = ss[3]
            if val(ss) < 0.85 * peak * (1 - trail): gapdump = True
            break
        peak = max(peak, vt)
    if got is None:
        _, ss = W.state(m, land + 7200); c = W.check(ss, land + 7200); ex_ts = land + 7200
        if ss is None or c == 'gap': unres = True; got = 0.0
        else:
            if c == 'old': tags.add('QUIET-PRICED')
            got = W.sell(m, ss, tk, tags)
    flag = unres or 'QUIET-PRICED' in tags
    pnl = got - inv - FIXED * (1 + adds)
    return dict(pnl=pnl, pnl0=(-inv - FIXED * (1 + adds)) if flag else pnl, inv=inv, adds=adds, t0=land, t1=ex_ts, add_ts=add_ts, stake0=stake0,
                flag=flag, gapdump=gapdump, hi=hi / v0)
def maxexp(R):
    ev = []
    for r in R:
        ev.append((r['t0'], r['stake0'])); ev.append((r['t1'], -r['stake0']))
        if r['adds']: ev.append((r['add_ts'], 0.15)); ev.append((r['t1'], -0.15))
    cur = mx = 0
    for _, d in sorted(ev, key=lambda e: (e[0], e[1])): cur += d; mx = max(mx, cur)
    return mx
def report(lab, R, n_att, unav):
    if not R: P(f"  {lab}: attempts {n_att}, unavailable {unav}, filled 0"); return
    p = sorted(r['pnl'] for r in R); p0 = sorted(r['pnl0'] for r in R); inv = sum(r['inv'] for r in R); n = len(R)
    P(f"  {lab}: attempts {n_att} | unavailable {unav} | filled {n} | profit/opportunity {sum(p)/n:+.4f} SOL (total {sum(p):+.3f}) | "
      f"without top3 {sum(p[:-3])/(n-3) if n>3 else float('nan'):+.4f} | uncertain at 0: {sum(p0)/n:+.4f} (without top3 {sum(p0[:-3])/(n-3) if n>3 else float('nan'):+.4f}) | "
      f"mean invested {inv/n:.3f} | return on invested {100*sum(p)/inv:+.1f}% | median trade {st.median(p):+.4f} | win {100*sum(x>0 for x in p)/n:.0f}% | "
      f"lost>=50% of invested {sum(1 for r in R if r['pnl'] <= -0.5*r['inv'])} | sudden dumps {sum(r['gapdump'] for r in R)} | uncertain {sum(r['flag'] for r in R)} | "
      f"adds {sum(r['adds'] for r in R)} | max simultaneous {maxexp(R):.2f} SOL")
for W, lab in ((build_A(), 'A'), (build_B(), 'B')):
    P(f"\n=== Period {lab} ===")
    brk, mom = [], []
    for r in W.COH:
        m, c = r['mint'], r['create_ts']; S = series(W, m)
        if len(S) < 6: continue
        rv = [s[0] for s in S]; t_start = int(math.ceil(r['decision_ts'] - c)) + 1
        got_b = got_m = False
        for t in range(t_start, 3601, 15):
            T = c + t; k = bisect.bisect_right(rv, T)
            if k == 0: continue
            K = S[:k]; last = K[-1]; px = last[2]; usd = px * 1e9 * W.usd(T)
            if not got_b and 10e3 <= usd < 100e3 and T - 30 <= last[1] <= T:
                base = [s for s in K if T - 210 <= s[1] < T - 30]
                if len(base) >= 5:
                    med = st.median(s[2] for s in base)
                    if all(med / 1.15 <= s[2] <= med * 1.15 for s in base) and px > 1.15 * med:
                        net = sum((s[4] if s[3] else -s[4]) for s in K if s[1] > T - 60)
                        if net > 3:
                            fwd = [s for s in S[k:] if s[1] <= T + 300]
                            brk.append(dict(m=m, T=T, med=med, vol=sum(s[4] for s in base), nb=len(base), false=any(s[2] < med for s in fwd)))
                            got_b = True
            if not got_m and (t - t_start) % 30 == 0 and 10e3 <= usd < 50e3 and last[1] >= T - 120:
                hi = max(s[2] for s in K); win = [s[2] for s in K if s[1] >= T - 900]
                if win and px >= 2 * min(win) and px >= 0.9 * hi: mom.append((m, T)); got_m = True
            if got_b and got_m: break
    # Test 1
    P(f"TEST 1 quiet-base breakout: {len(brk)} signals; base volume median {st.median([b['vol'] for b in brk]) if brk else 0:.1f} SOL "
      f"(p25 {sorted(b['vol'] for b in brk)[len(brk)//4] if brk else 0:.1f}, p75 {sorted(b['vol'] for b in brk)[3*len(brk)//4] if brk else 0:.1f}); "
      f"base swaps median {st.median([b['nb'] for b in brk]) if brk else 0}; false breakouts (back below base median within 5 min) {sum(b['false'] for b in brk)}")
    res = []; un = 0
    for b in brk:
        x = pos(W, b['m'], b['T'], 0.2)
        if x is None: un += 1; continue
        x['vol'] = b['vol']; x['false'] = b['false']; res.append(x)
    report('breakout, all, T25', res, len(brk), un)
    if res:
        vm = st.median(r['vol'] for r in res)
        report('variant: quieter half (base volume <= median)', [r for r in res if r['vol'] <= vm], sum(1 for r in res if r['vol'] <= vm), 0)
        report('variant: busier half', [r for r in res if r['vol'] > vm], sum(1 for r in res if r['vol'] > vm), 0)
        report('of which false breakouts', [r for r in res if r['false']], sum(1 for r in res if r['false']), 0)
    # Test 2
    P(f"TEST 2 identical momentum signals: {len(mom)}")
    for name, st0, sc in (('U 0.2 upfront', 0.2, False), ('S 0.05 no add', 0.05, False), ('I 0.05 + scale-in', 0.05, True)):
        R = []; un = 0
        for m, T in mom:
            x = pos(W, m, T, st0, sc)
            if x is None: un += 1; continue
            R.append(x)
        report(name, R, len(mom), un)
open('out_base_scale.txt', 'w').write('\n'.join(L_) + '\n')
