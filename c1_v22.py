#!/usr/bin/env python3
"""C1 v2 (11 Nov 2026, Codex review 13:52 UK): the curve-stage candidate re-scored under the rules we would actually run.
Changes from research.py v1:
 (1) Period B eligibility = the live decision rules: only decisions with status 'entered' or 'out of band' (on time: available AND read ≤ create+315 s,
     usable clock reading). Late, unusable-clock and no-market-cap decisions are excluded and counted.
 (2) Venue is decided from checkpoint EVIDENCE, not from "no pool trade seen": B — the clock row's venue (clock decisions) or token_life cp=300
     'graduated' flag (trade-triggered decisions); A — token_life cp=300 'graduated'. In both, the last swap received by the decision must also be a
     curve swap with virtual SOL < 114.9 (curve not complete). Missing evidence → 'venue unknown' (not eligible, counted).
 (3) Full reconciliation: eligible checkpoints → venue unknown → venue pool → no stored trade history → fill unavailable → filled.
 (4) Exit uncertainty: every exit leg priced from a state older than 30 s (QUIET-PRICED) or unresolved is re-scored at 50% and at 0 of its modeled
     proceeds (downside scenarios). Whole-position 25% trail is the primary exit; the half-sale variant pays a second fixed fee (0.0015 SOL).
argv: A_dir B_tr.pkl.gz pkg_dir out_prefix"""
import sys, csv, gzip, collections, statistics as st, math
exec(open('research.py').read().split("if __name__ == '__main__':")[0])
LO, HI = 15e3, 100e3
def tl300(path):
    d = {}
    for r in csv.DictReader(gzip.open(path, 'rt')):
        if r['cp'] == '300': d[r['mint']] = r
    return d
def clock300(path):
    return {r['mint']: r for r in csv.DictReader(gzip.open(path, 'rt')) if r['cp'] == '300'}
def last_received(W, m, T):
    K = W.known(m, T); return K[-1] if K else None
def venue_evidence(W, m, T, ck, tl, src):
    if src == 'clock' and ck: v = 'curve' if ck['venue'] == 'curve' and ck['graduated'] in ('0', '') else 'pool'
    elif tl: v = 'curve' if tl['graduated'] in ('0', '') else 'pool'
    else: return 'unknown', 'no checkpoint venue'
    if v == 'pool': return 'pool', 'checkpoint says graduated'
    x = last_received(W, m, T)
    if x is None: return 'curve-unconfirmed', 'checkpoint says curve; no swap received by the decision'
    if x[4] != 'curve': return 'pool', 'last received swap is a pool swap'
    if x[9] and x[9] / 1e9 >= 114.9: return 'pool', 'curve complete'
    return 'curve', 'checkpoint and last received swap agree'
def sim_full(W, m, T, ex, extra_fee=0.0):
    x = W.sim(m, T, ex)
    if 'ret' in x and extra_fee: x['ret'] -= extra_fee / SIZE
    return x
def scenarios(xs):
    """downside re-scoring: QUIET-PRICED or UNRESOLVED positions keep only the stake-relative loss part … approximated as: base ret; 50%: (1+ret)*0.5-1 for flagged; 0: -1 for flagged"""
    out = {}
    for lab, f in (('modeled', 1.0), ('flagged legs at 50%', 0.5), ('flagged legs at 0', 0.0)):
        v = []
        for x in xs:
            r = x['ret']; flag = x['status'] == 'UNRESOLVED' or 'QUIET-PRICED' in x.get('tags', set())
            v.append((1 + r) * f - 1 if flag and f < 1 else r)
        out[lab] = v
    return out
def summary(v):
    if not v: return 'n=0'
    s = sorted(v); n = len(s)
    return (f"n={n} mean {100*st.mean(s):+.1f}% med {100*st.median(s):+.1f}% win {100*sum(a>0 for a in s)/n:.0f}% sev {100*sum(a<=-.5 for a in s)/n:.0f}% "
            f"tot {SIZE*sum(s):+.3f} SOL | −best {100*st.mean(s[:-1]):+.1f}% −top3 {100*st.mean(s[:-3]) if n>3 else float('nan'):+.1f}%")
def boot_ci(xs, key='ret'):
    B = collections.defaultdict(list)
    for x in xs: B[int(x['T'] // (4 * 3600))].append(x[key])
    ks = list(B)
    if len(ks) < 2: return None
    R = []
    for _ in range(4000):
        v = []
        for _k in ks: v += B[ks[rng.randrange(len(ks))]]
        R.append(sum(v) / len(v))
    R.sort(); return R[int(.025 * len(R))], R[int(.975 * len(R)) - 1], len(ks)
exec(open('sim22.py').read())
if __name__ == '__main__':
    out = []; P = lambda *a: (out.append(' '.join(map(str, a))), print(*a, flush=True))
    WA, WB = build_A(), build_B()
    TLA, TLB, CKB = tl300(os.path.join(A_DIR, 'k100_token_life.csv.gz')), tl300(os.path.join(PKG, 'token_life.csv.gz')), clock300(os.path.join(PKG, 'token_cp_clock.csv.gz'))
    DECB = {r['mint']: r for r in csv.DictReader(gzip.open(os.path.join(PKG, 'decisions_kpaper.csv.gz'), 'rt'))}
    P("C1 v2 — 5-min reading $15–100K, still on the curve (evidence), 0.2 SOL, buy 1 s after the decision; exits as stated. Every count reconciled.")
    pooled = []
    for W, lab in ((WA, 'A'), (WB, 'B')):
        rec = collections.Counter(); ents = []
        if lab == 'A':
            P("\nPeriod A universe: tracker-retained launches with an on-time trade-triggered 5-min reading (cohort.json; clock checkpoint did not exist yet).")
            P("  Already excluded upstream (counts only, bands unknown): ALREADY past $100K before 5 min 209, UNKNOWN_NO_POOL 90, SUSPECT 87, late/missing 5-min reading 1,065.")
            rows = [(r, r['decision_ts'], 'trade') for r in W.COH]
        else:
            P("\nPeriod B universe: every K decision 9 Nov 21:48 → 10 Nov 20:57 UTC (decisions_kpaper).")
            rows = []
            for m, d in DECB.items():
                if not d['create_ts'] or int(d['create_ts']) < 1794260923: continue
                rec['B decisions'] += 1
                if d['status'] not in ('entered', 'out of band'): rec['excluded: not a live-eligible decision (late / unusable clock / no market cap)'] += 1; continue
                if not d['mc5'] or not (LO <= float(d['mc5']) < HI): rec['on time, outside $15–100K'] += 1; continue
                rows.append((dict(mint=m, create_ts=int(d['create_ts']), mc5=float(d['mc5'])), float(d['avail_ts']), d['src'] or 'trade'))
        for r, T, src in rows:
            if lab == 'A' and not (LO <= r['mc5'] < HI): rec['on time, outside $15–100K'] += 1; continue
            rec['eligible checkpoint in $15–100K'] += 1
            m = r['mint']
            if lab == 'B' and m not in W.TR:
                ck, tl = CKB.get(m), TLB.get(m)
                v = 'pool' if (src == 'clock' and ck and ck['venue'] != 'curve') or (src != 'clock' and tl and tl['graduated'] not in ('0', '')) else ('curve' if (ck or tl) else 'unknown')
                rec[f'no stored trade history (checkpoint venue: {v})'] += 1; continue
            v, why = venue_evidence(W, m, T, CKB.get(m) if lab == 'B' else None, (TLB if lab == 'B' else TLA).get(m), src)
            if v != 'curve': rec[f'venue {v}: {why}'] += 1; continue
            rec['curve (evidence)'] += 1; ents.append((r, T))
        res25, resH, resT15 = [], [], []
        for r, T in ents:
            x = sim_full(W, r['mint'], T, ('TRAIL', .25, None)); x['T'] = T; x['mint'] = r['mint']; x['per'] = lab
            if x['status'] == 'UNAVAILABLE': rec[f"fill unavailable ({x['why']})"] += 1; continue
            rec['filled'] += 1; res25.append(x)
            h = sim_full(W, r['mint'], T, ('TP_TRAIL', .25, 2.0)); h['T'] = T
            if 'ret' in h:
                # a second fixed fee only if the half-sale actually happened (price reached 2× the fill)
                if (h.get('hi') or 0) >= 2.0: h['ret'] -= FIXED / SIZE
                resH.append(h)
            t = sim_full(W, r['mint'], T, ('TRAIL', .15, None)); t['T'] = T
            if 'ret' in t: resT15.append(t)
        P(f"Reconciliation {lab}:"); [P(f"  {k}: {v}") for k, v in rec.items()]
        sc = scenarios(res25)
        for k, v in sc.items(): P(f"  {lab} T25 {k:22s} " + summary(v))
        ci = boot_ci(res25); P(f"  {lab} T25 modeled 95% CI (4-h blocks): " + (f"[{100*ci[0]:+.1f}%, {100*ci[1]:+.1f}%] ({ci[2]} blocks)" if ci else '–'))
        fl = sum(1 for x in res25 if x['status'] == 'UNRESOLVED' or 'QUIET-PRICED' in x.get('tags', set())); P(f"  {lab} positions with a flagged (quiet-priced or unresolved) exit: {fl} of {len(res25)}")
        P(f"  {lab} TP2×T25 (+second fee when the half-sale happened) " + summary([x['ret'] for x in resH]))
        P(f"  {lab} T15 (whole position)                         " + summary([x['ret'] for x in resT15]))
        pooled += res25
    sc = scenarios(pooled)
    P("\nPOOLED A+B, T25:"); [P(f"  {k:22s} " + summary(v)) for k, v in sc.items()]
    ci = boot_ci(pooled); P("  95% CI modeled: " + (f"[{100*ci[0]:+.1f}%, {100*ci[1]:+.1f}%] ({ci[2]} blocks)" if ci else '–'))
    top = sorted(pooled, key=lambda x: -x['ret'])[:5]; P("  top 5: " + '; '.join(f"{x['per']} {x['mint'][:8]} {100*x['ret']:+.0f}%" for x in top))
    open(sys.argv[4] + '.txt', 'w').write('\n'.join(out) + '\n')
