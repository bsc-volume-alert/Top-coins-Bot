"""Owner's question 11 Nov 16:45 UK: 'the graph is going up — can we capture coins that are visibly running?'
Two parts, both pre-specified before looking at results:
 (1) CONTINUATION: at every 30-s checkpoint from 2 to 60 min after creation, using only swaps RECEIVED by then: is the coin up >= R x over the
     last L minutes and near its high (>= 0.9 x the high so far)? From that moment (first time per coin per bucket), how often does the price
     reach 2x before halving, within 60 min? Compared with all coins at the same checkpoints (base rate).
 (2) TRADING: buy the first checkpoint where the rule holds (0.2 SOL, lands 1 s later, v2.2 execution: sell at slot+2, trail on sellable
     proceeds, fees curve 1.25% / pool 0.55% / 0.0015 SOL), exits 25% and 40% trail, 2-h max. 18 rules = L {5,15} min x R {1.5,2,3} x band
     {$10-50K, $50-200K, >= $200K}. Developed on A (6-8 Nov, 2,019 coins); B (9-10 Nov) is only the 274 coins that were $15-100K at 5 min, so B
     is a partial check. Every rule is reported."""
import sys, math, bisect, collections, statistics as st
sys.argv = ['x', 'A', 'B_tr.pkl.gz', '../inv/pkg', 'mom']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':", 1)[0])
exec(open('sim22.py').read())
L_ = []; P = lambda *a: (L_.append(' '.join(map(str, a))), print(*a, flush=True))
BANDS = [(10e3, 50e3, '$10-50K'), (50e3, 200e3, '$50-200K'), (200e3, 1e12, '>=$200K')]
def series(W, m, c):
    tr = W.TR.get(m) or []
    xs = sorted(((x[14] or x[3] * 1000) / 1000, x[3], x[8], x[0]) for x in tr if x[8] and x[8] > 0)
    out, prev = [], None
    for rv, ts, px, sl in xs:
        if prev and px > 10 * prev: continue          # decode guard
        out.append((rv, ts, px)); prev = px
    return out
def scan(W, lab):
    starts = collections.defaultdict(dict); base = []; cont = collections.defaultdict(list)
    for r in W.COH:
        m, c = r['mint'], r['create_ts']; S = series(W, m, c)
        if len(S) < 3: continue
        rv = [s[0] for s in S]; seen_base = False
        for t in range(int(math.ceil(r["decision_ts"] - c)) + 1, 3601, 30):
            T = c + t; k = bisect.bisect_right(rv, T)
            if k == 0: continue
            K = S[:k]; px = K[-1][2]; hi = max(s[2] for s in K)
            if K[-1][1] < T - 120: continue           # no trade in the last 2 min: dead/quiet, skip
            usd = px * 1e9 * W.usd(T)
            fwd = [s for s in S[k:] if s[1] <= T + 3600]
            def outcome():
                for s in fwd:
                    if s[2] >= 2 * px: return 'up'
                    if s[2] <= 0.5 * px: return 'down'
                return 'neither'
            if not seen_base: base.append(outcome()); seen_base = True
            for L in (5, 15):
                lo = min(s[2] for s in K if s[1] >= T - 60 * L) if any(s[1] >= T - 60 * L for s in K) else px
                for R in (1.5, 2, 3):
                    if px >= R * lo and px >= 0.9 * hi:
                        for a, b, bn in BANDS:
                            key = (L, R, bn)
                            if a <= usd < b and m not in starts[key]:
                                starts[key][m] = T; cont[key].append(outcome())
    return starts, base, cont
def summ(v):
    v = sorted(v); n = len(v)
    if n == 0: return 'n=0'
    return (f"n={n:3d} mean {100*st.mean(v):+6.1f}% med {100*st.median(v):+6.1f}% win {100*sum(a>0 for a in v)/n:3.0f}% "
            f"lost>=50% {100*sum(a<=-.5 for a in v)/n:3.0f}% | -top3 {100*st.mean(v[:-3]) if n>3 else float('nan'):+6.1f}%")
for W, lab in ((build_A(), 'A'), (build_B(), 'B')):
    starts, base, cont = scan(W, lab)
    cb = collections.Counter(base); nb = len(base)
    P(f"\n=== Period {lab} ===\nBASE (every live coin at 5 min): n={nb} reach 2x before halving {100*cb['up']/nb:.0f}% | halve first {100*cb['down']/nb:.0f}% | neither in 60 min {100*cb['neither']/nb:.0f}%")
    P("CONTINUATION when the chart is going up (first time per coin):")
    for key in sorted(cont):
        cc = collections.Counter(cont[key]); n = len(cont[key])
        P(f"  up {key[1]}x in {key[0]:2d} min, near high, {key[2]:9s}: n={n:4d}  2x next {100*cc['up']/n:3.0f}%  halve first {100*cc['down']/n:3.0f}%  neither {100*cc['neither']/n:3.0f}%")
    P("TRADING (0.2 SOL, v2.2 execution):")
    for key in sorted(starts):
        for tr in (.25, .40):
            res = []; un = 0; fl = 0
            for m, T in starts[key].items():
                x = W.sim(m, T, ('TRAIL', tr, None))
                if x['status'] == 'UNAVAILABLE': un += 1; continue
                if x['status'] == 'UNRESOLVED' or 'QUIET-PRICED' in x.get('tags', set()): fl += 1
                res.append(x['ret'])
            P(f"  up {key[1]}x/{key[0]:2d}m {key[2]:9s} T{int(tr*100)}: {summ(res)} | unpriced {un} flagged {fl}")
open('out_momentum_post5.txt', 'w').write('\n'.join(L_) + '\n')
