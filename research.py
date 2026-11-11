#!/usr/bin/env python3
"""Next-strategy research (11 Nov 2026; owner forwarded Codex's brief 13:19 UK). Design/analysis only — no book is built, live stays off.
Execution model = replay_9nov v2.1 unchanged (curve: virtual reserves; pool: constant product on vault reserves + per-pool calibrated quote offset
from earlier swaps only; fees curve 1.25%, pool 0.55%, fixed 0.0015 SOL; buy lands 1 s after the decision; triggers on post-swap spot; a leg inside a
feed gap is unresolved and adds no proceeds; 2-hour maximum hold). Trades deduplicated by (mint, sig, ev_idx, venue, side, sol, tokens).
Decision-time features use only swaps RECEIVED by the decision (recv_ms ≤ decision); a swap without recv_ms is not used for features.
Periods: A = launches 6 Nov 07:40 → 8 Nov 15:00 UTC (replay cohort, all 5-min bands, development).
         B = launches 9 Nov 21:48 → 10 Nov 20:57 UTC (100K-book period; trades exist only for coins whose 5-min reading was $15–100K) — second period.
Every configuration evaluated is printed. argv: A_dir B_tr.pkl.gz pkg_dir out_prefix"""
import os, sys, json, gzip, pickle, csv, bisect, math, collections, random, statistics as st
A_DIR, B_TR, PKG, OUT = sys.argv[1:5]
FEE_CURVE, FEE_POOL, FIXED, SIZE = 0.0125, 0.0055, 0.0015, 0.2
def load_gaps(files):
    ev = set()
    for f in files:
        for r in csv.DictReader(gzip.open(f, 'rt')): ev.add((int(r['ts']), r['event']))
    ev = sorted(ev)
    def gaps(starts, end):
        G, o = [], None
        for t, e in ev:
            if e in starts and o is None: o = t - 60 if e == 'idle' else t
            elif e == end and o is not None: G.append((o, t)); o = None
        return G
    return {'curve': gaps({'idle', 'closed', 'error'}, 'subscribed'), 'pool': gaps({'pool-closed', 'pool-error'}, 'pool-subscribed')}
def load_solusd(f):
    xs = sorted((int(r['ts']), float(r['usd'])) for r in csv.DictReader(gzip.open(f, 'rt')))
    return [t for t, _ in xs], [u for _, u in xs]
class World:
    def __init__(s, TR, GAP, SOL, COH): s.TR, s.GAP, s.SOL, s.COH = TR, GAP, SOL, COH; s.TS = {m: [x[3] for x in tr] for m, tr in TR.items()}; s.CAL = {}
    def usd(s, t):
        i = bisect.bisect_right(s.SOL[0], t) - 1; return s.SOL[1][max(i, 0)]
    def gap_overlap(s, v, a, b): return any(x <= b and y >= a for x, y in s.GAP['curve' if v == 'curve' else 'pool'])
    def cal(s, m):
        if m not in s.CAL:
            L = []
            for x in s.TR.get(m, []):
                if x[4] != 'pumpswap' or not x[11] or not x[12] or x[6] <= 0.01 or x[7] <= 0: continue
                Q, B, q, b = x[11] / 1e9, x[12] / 1e6, x[6], x[7]
                L.append(((x[0], x[1], x[2]), (B * q / b - q - Q) if x[5] else (q * (B + b) / b - Q)))
            s.CAL[m] = ([k for k, _ in L], [c for _, c in L])
        return s.CAL[m]
    def offset(s, m, x):
        ks, cs = s.cal(m); i = bisect.bisect_right(ks, (x[0], x[1], x[2]))
        return None if i < 5 else st.median(cs[max(0, i - 50):i])
    def eff(s, m, x):
        if not x[11] or not x[12]: return None
        c = s.offset(m, x)
        if c is None: return None
        Q, B = x[11] / 1e9, x[12] / 1e6; Q, B = ((Q + x[6], B - x[7]) if x[5] else (Q - x[6], B + x[7])); return (Q + c, B)
    def spot(s, m, x):
        if x[4] == 'curve': return (x[9] / 1e9) / (x[10] / 1e6) if x[9] and x[10] else x[8]
        e = s.eff(m, x); return e[0] / e[1] if e and e[1] > 0 else x[8]
    def buy(s, m, x, sol, tags):
        if x[4] == 'curve': vs, vt = x[9] / 1e9, x[10] / 1e6; i = sol * (1 - FEE_CURVE); return vt - vs * vt / (vs + i)
        i = sol * (1 - FEE_POOL); e = s.eff(m, x)
        if e: Q, B = e; return B - Q * B / (Q + i)
        tags.add('CAL-FALLBACK'); q = x[11] / 1e9 if x[11] else None; return i / x[8] * (q / (q + i) if q else 1.0)
    def sell(s, m, x, tk, tags):
        if x[4] == 'curve': vs, vt = x[9] / 1e9, x[10] / 1e6; return (vs - vs * vt / (vt + tk)) * (1 - FEE_CURVE)
        e = s.eff(m, x)
        if e: Q, B = e; return (Q - Q * B / (B + tk)) * (1 - FEE_POOL)
        tags.add('CAL-FALLBACK'); b = x[12] / 1e6 if x[12] else None; return tk * x[8] * (b / (b + tk) if b else 1.0) * (1 - FEE_POOL)
    def state(s, m, T):
        i = bisect.bisect_right(s.TS[m], T) - 1; return (i, s.TR[m][i]) if i >= 0 else (None, None)
    def check(s, x, T):
        if x is None: return 'none'
        if T - x[3] > 30: return 'old'
        if s.gap_overlap(x[4], x[3], T): return 'gap'
        if x[4] == 'curve' and x[9] and x[9] / 1e9 >= 114.9: return 'curve-complete'
        return 'stale' if T - x[3] > 5 else 'ok'
    # ---------------- simulation of one entry at decision time T with one exit rule
    def sim(s, m, T, exit_):
        if m not in s.TR: return dict(status='UNAVAILABLE', why='no-trades')
        land = math.floor(T + 1); i0, x0 = s.state(m, land); c0 = s.check(x0, land)
        if c0 in ('none', 'old', 'gap', 'curve-complete'): return dict(status='UNAVAILABLE', why=c0)
        tags = set(); tk0 = s.buy(m, x0, SIZE, tags); pfill = SIZE / tk0; peak = s.spot(m, x0)
        tr = s.TR[m]; after = [x for x in tr[i0 + 1:] if land < x[3] <= land + 7200]
        kind, a, b = exit_
        tk, got, half, ex_ts = tk0, 0.0, False, None
        def sell_at(t, amount):
            _, ss = s.state(m, t); c = s.check(ss, t)
            if ss is None or c == 'gap': return None
            if c == 'old': tags.add('QUIET-PRICED')
            return s.sell(m, ss, amount, tags)
        if kind == 'TIME':
            p = sell_at(land + a, tk); ex_ts = land + a
            if p is None: return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=None)
            return dict(status='FILLED', ret=(p - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], exit_ts=ex_ts, hi=None)
        hi = 1.0
        for x in after:
            t = x[3]; px = s.spot(m, x) if x[4] != 'curve' else ((x[9] / 1e9) / (x[10] / 1e6) if x[9] and x[10] else x[8])
            hi = max(hi, px / pfill)
            trail = a; tp = b
            fire_tp = kind == 'TP_TRAIL' and not half and px >= tp * pfill
            fire_loss = px <= peak * (1 - trail) or (kind == 'TP_TRAIL' and half and px <= peak * (1 - trail))
            if fire_tp or fire_loss:
                _, ss = s.state(m, t)
                if s.check(ss, t) == 'gap': return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=hi)
                if fire_tp: got += s.sell(m, ss, tk / 2, tags); tk /= 2; half = True; peak = max(peak, px); continue
                got += s.sell(m, ss, tk, tags); tk = 0; ex_ts = t; break
            peak = max(peak, px)
        if tk > 0:
            p = sell_at(land + 7200, tk); ex_ts = land + 7200
            if p is None: return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=hi)
            got += p
        return dict(status='FILLED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], exit_ts=ex_ts, hi=hi)
    # ---------------- decision-time view: swaps received by T (recv_ms), deduplicated
    def known(s, m, T):
        return [x for x in s.TR.get(m, []) if x[14] is not None and x[14] <= T * 1000 and x[3] <= T]
    def mc_of(s, x, t): return x[8] * 1e9 * s.usd(t)
    def features(s, r, T):
        m, c = r['mint'], r['create_ts']; K = s.known(m, T)
        if not K: return None
        f = {}
        pool = [x for x in K if x[4] != 'curve']; f['venue_at_T'] = 'pool' if (pool and K[-1][4] != 'curve') else 'curve'
        f['instant'] = int(bool(pool) and pool[0][3] - c <= 5)
        f['graduated_normally'] = int(bool(pool) and pool[0][3] - c > 5)
        px = [x[8] for x in K]; f['mc'] = s.mc_of(K[-1], T); f['vs_peak'] = px[-1] / max(px)
        lo = [x for x in K if x[3] > T - 120]; hi = [x for x in K if T - 300 < x[3] <= T - 120]
        f['buys_2m'] = sum(1 for x in lo if x[5]); f['buys_prev3m_per2m'] = sum(1 for x in hi if x[5]) * 2 / 3  # buy COUNTS (wallets not in the tuples)
        f['net_sol_2m'] = sum(x[6] * (1 if x[5] else -1) for x in lo); f['net_sol_5m'] = sum(x[6] * (1 if x[5] else -1) for x in K if x[3] > T - 300)
        return f
def build_A():
    TR = pickle.load(gzip.open(os.path.join(A_DIR, 'tr.pkl.gz')))
    COH = [r for r in json.load(open(os.path.join(A_DIR, 'cohort.json')))['rows']]
    GAP = load_gaps([os.path.join(A_DIR, f) for f in os.listdir(A_DIR) if f.startswith('feed_gaps_')])
    return World(TR, GAP, load_solusd(os.path.join(A_DIR, 'k100_sol_usd.csv.gz')), COH)
def build_B():
    TR = pickle.load(gzip.open(B_TR)); COH = []
    for r in csv.DictReader(gzip.open(os.path.join(PKG, 'decisions_kpaper.csv.gz'), 'rt')):
        if not r['mc5'] or not r['avail_ts'] or not r['create_ts']: continue
        if int(r['create_ts']) < 1794260923: continue
        COH.append(dict(mint=r['mint'], create_ts=int(r['create_ts']), decision_ts=float(r['avail_ts']), mc5=float(r['mc5']), status=r['status'], in_trades=r['mint'] in TR))
    return World(TR, load_gaps([os.path.join(PKG, 'feed_gaps.csv.gz')]), load_solusd(os.path.join(PKG, 'sol_usd.csv.gz')), COH)
# ---------------- scoring
rng = random.Random(20261111)
def score(rows):
    att = len(rows); fl = [x for x in rows if x['status'] != 'UNAVAILABLE']; un = att - len(fl)
    if not fl: return dict(att=att, un=un, n=0)
    a = sorted(x['ret'] for x in fl); n = len(a)
    blocks = collections.defaultdict(list)
    for x in fl: blocks[int(x['T'] // (4 * 3600))].append(x['ret'])
    ks = list(blocks); R = []
    if len(ks) >= 2:
        for _ in range(4000):
            v = []
            for _k in ks: v += blocks[ks[rng.randrange(len(ks))]]
            R.append(sum(v) / len(v))
        R.sort()
    return dict(att=att, un=un, n=n, ures=sum(x['status'] == 'UNRESOLVED' for x in fl), mean=st.mean(a), med=st.median(a), win=sum(v > 0 for v in a) / n,
                sev=sum(v <= -0.5 for v in a) / n, tot=sum(a) * SIZE, no1=st.mean(a[:-1]) if n > 1 else None, no3=st.mean(a[:-3]) if n > 3 else None,
                big=sum((x.get('hi') or 0) >= 3 for x in fl), lo=R[int(.025 * len(R))] if R else None, hi_=R[int(.975 * len(R)) - 1] if R else None, nb=len(ks))
def fmt(d):
    if not d.get('n'): return f"{d['att']:5d} {d['un']:5d}    0   –"
    ci = f"[{100*d['lo']:+.1f},{100*d['hi_']:+.1f}]" if d['lo'] is not None else "–"
    no3 = f"{100*d['no3']:+6.1f}" if d['no3'] is not None else "   –  "
    return (f"{d['att']:5d} {d['un']:5d} {d['n']:4d} {d['ures']:3d} | {100*d['mean']:+6.1f} {100*d['med']:+6.1f} {100*d['win']:4.0f} {100*d['sev']:4.0f} {d['tot']:+7.3f} | "
            f"{100*d['no1']:+6.1f} {no3} {d['big']:3d} | {ci} {d['nb']}")
HDR = "  att unav fill unr |  mean%   med% win% sev% totSOL | -best% -top3% ≥3× | 95% CI (4h blocks) nblk"
EXITS = [('TRAIL', .25, None), ('TRAIL', .40, None), ('TRAIL', .15, None), ('TP_TRAIL', .40, 2.0), ('TP_TRAIL', .25, 2.0), ('TIME', 900, None), ('TIME', 3600, None)]
EX_NAME = lambda e: f"T{int(e[1]*100)}" if e[0] == 'TRAIL' else (f"TP{e[2]:g}xT{int(e[1]*100)}" if e[0] == 'TP_TRAIL' else f"X{e[1]//60}m")
def entries_5m(W, cond):
    out = []
    for r in W.COH:
        if 'in_trades' in r and not r['in_trades']: continue
        T = r['decision_ts']; f = W.features(r, T)
        if cond(r, f): out.append((r, T, f))
    return out
def entries_cross(W, X, tmin, tmax):
    """continuation: first RECEIVED swap with mc ≥ X between create+tmin and create+tmax (decision = receipt time of that swap)."""
    out = []
    for r in W.COH:
        m = r['mint']
        if m not in W.TR: continue
        c = r['create_ts']
        for x in W.TR[m]:
            if x[14] is None or x[3] < c + tmin: continue
            if x[3] > c + tmax: break
            if W.mc_of(x, x[3]) >= X:
                T = x[14] / 1000; out.append((r, T, W.features(r, T))); break
    return out
def entries_recover(W, t_chk, lo, hi, bounce):
    """recovery: at create+t_chk, mc in [lo, hi) and last price ≥ bounce × the minimum price since create+300 (received data)."""
    out = []
    for r in W.COH:
        m = r['mint']
        if m not in W.TR: continue
        T = r['create_ts'] + t_chk; K = [x for x in W.known(m, T) if x[3] >= r['create_ts'] + 300]
        if len(K) < 5: continue
        mc = W.mc_of(K[-1], T)
        if lo <= mc < hi and K[-1][8] >= bounce * min(x[8] for x in K): out.append((r, T, W.features(r, T)))
    return out
def run_cell(W, ents, ex):
    res = []
    for r, T, f in ents:
        x = W.sim(r['mint'], T, ex); x['T'] = T; res.append(x)
    return score(res)
if __name__ == '__main__':
    out = []; P = lambda *a: (out.append(' '.join(str(v) for v in a)), print(*a, flush=True))
    WA, WB = build_A(), build_B()
    P("NEXT-STRATEGY RESEARCH 11 Nov 2026 — every configuration evaluated is listed. A = 6–8 Nov (dev), B = 9–10 Nov (second period; trades only for 5-min $15–100K).")
    P(f"A cohort {len(WA.COH)} coins with on-time 5-min readings; B decided coins with trades {sum(1 for r in WB.COH if r['in_trades'])} (of {len(WB.COH)} decided)")
    band = lambda lo, hi: (lambda r, f: f is not None and lo <= r['mc5'] < hi)
    FAM = [("Q1/Q2 5-min entry", [
        ("$15-30K all", band(15e3, 30e3)), ("$30-50K all", band(30e3, 50e3)), ("$50-100K all", band(50e3, 100e3)),
        ("$15-100K instant-grad", lambda r, f: f is not None and 15e3 <= r['mc5'] < 100e3 and f['instant']),
        ("$15-100K still on curve", lambda r, f: f is not None and 15e3 <= r['mc5'] < 100e3 and f['venue_at_T'] == 'curve'),
        ("$15-100K graduated normally", lambda r, f: f is not None and 15e3 <= r['mc5'] < 100e3 and f['graduated_normally']),
        ("$15-100K curve + broadening (buys/2 min ≥ previous 3 min rate) + net 2m > 0", lambda r, f: f is not None and 15e3 <= r['mc5'] < 100e3 and f['venue_at_T'] == 'curve' and f['buys_2m'] >= f['buys_prev3m_per2m'] and f['net_sol_2m'] > 0),
        ("$15-100K not instant + near high (≥0.8 peak) + net 5m > 0", lambda r, f: f is not None and 15e3 <= r['mc5'] < 100e3 and not f['instant'] and f['vs_peak'] >= 0.8 and f['net_sol_5m'] > 0)])]
    for W, lab in ((WA, 'A'), (WB, 'B')):
        for fam, conds in FAM:
            P(f"\n=== {fam} — period {lab} ===\n{'group':62s} {'exit':10s}{HDR}")
            for name, cond in conds:
                ents = entries_5m(W, cond)
                for ex in EXITS: P(f"{name[:62]:62s} {EX_NAME(ex):10s}" + fmt(run_cell(W, ents, ex)))
        P(f"\n=== Q3 continuation / recovery entries — period {lab} {'(B: only coins whose 5-min reading was $15–100K have trades — biased subset)' if lab == 'B' else ''} ===\n{'entry':62s} {'exit':10s}{HDR}")
        Q3 = [("first $100K crossing, 5–60 min", lambda: entries_cross(W, 100e3, 300, 3600)), ("first $50K crossing, 5–30 min", lambda: entries_cross(W, 50e3, 300, 1800)),
              ("first $200K crossing, 5–120 min", lambda: entries_cross(W, 200e3, 300, 7200)),
              ("15 min: $30–100K and ≥1.5× low since 5 min", lambda: entries_recover(W, 900, 30e3, 100e3, 1.5)), ("30 min: $30–150K and ≥1.5× low since 5 min", lambda: entries_recover(W, 1800, 30e3, 150e3, 1.5))]
        for name, fn in Q3:
            ents = fn()
            for ex in EXITS: P(f"{name[:62]:62s} {EX_NAME(ex):10s}" + fmt(run_cell(W, ents, ex)))
    open(OUT + '.txt', 'w').write('\n'.join(out) + '\n')
