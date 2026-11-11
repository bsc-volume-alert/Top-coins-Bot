#!/usr/bin/env python3
"""Gemini-review tests on the 2,127-coin trade history (6-8 Nov). Read-only.
 - wallet ledger from trades: top-3 / top-5 unsold share of supply (1e9) and simulated top-3 dump impact at each trigger second
 - MFE before -40% for R3 / R5 / GRAD entries
 - four specialist books: GRAD-SCALP, SHAKE-REC, R3-FREE (scale-out + moonbag), SMART-CLUSTER (train/test split)
 - R3 with trail30 for reference, with and without the concentration cap
 Execution model: buy lands first trade >= trigger+1 s at price x1.015; sells land first trade >= signal+1 s at x0.985; extra -3% haircut
 applied in the summary (HAIRCUT). Horizon 2 h. Unresolved = no trade after the signal: valued at last price, flagged.
Outputs: out/books14_out.txt, out/books14_entries.csv, out/smart_wallets.csv
"""
import duckdb, pandas as pd, numpy as np, sys, collections
PQ = 'out/trades/trades_entered_dedup.parquet'; SUPPLY = 1e9; H = 7200; HAIRCUT = 0.03
con = duckdb.connect(); con.execute("PRAGMA threads=2; PRAGMA memory_limit='3GB'")
mints = [r[0] for r in con.execute(f"select distinct mint from '{PQ}'").fetchall()]
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else len(mints); mints = mints[:LIMIT]
SPLIT = int(pd.Timestamp('2026-11-07T12:00:00Z').timestamp())

def clean(p):
    p = p[~((p.venue == 'curve') & (p.price_sol > 4.2e-7))].reset_index(drop=True)
    keep = np.ones(len(p), bool); last = None
    for i, v in enumerate(p.price_sol.values):
        if last is not None and (v > 10 * last or v < 0.1 * last): keep[i] = False
        else: last = v
    return p[keep].reset_index(drop=True)

def reserves_tokens(row):
    try:
        if row.venue == 'curve' and row.vtok: return float(row.vtok) / 1e6
        if row.pool_base_raw: return float(row.pool_base_raw) / 10 ** (row.base_dec if row.base_dec == row.base_dec else 6)
    except Exception: pass
    return np.nan

def conc(p, j):
    """wallet balances from trades 0..j: returns top3 share, top5 share, dump impact of top3 (price ratio after they sell all)"""
    d = p.iloc[:j + 1]
    bal = (d.tokens * np.where(d.is_buy == 1, 1, -1)).groupby(d.wallet).sum()
    bal = bal[bal > 0].sort_values(ascending=False)
    top3 = bal.head(3).sum(); top5 = bal.head(5).sum()
    Y = reserves_tokens(p.iloc[j])
    impact = (Y / (Y + top3)) ** 2 if Y == Y and Y > 0 else np.nan
    return top3 / SUPPLY, top5 / SUPPLY, impact, len(bal)

def zero_buy_sellers(p):
    bal = collections.defaultdict(float); zb = 0; zb_tok = 0
    for w, b, t in zip(p.wallet.values, p.is_buy.values, p.tokens.values):
        if b == 1: bal[w] += t
        else:
            if bal[w] < t * 0.5: zb += 1; zb_tok += t
            bal[w] -= t
    return zb, zb_tok / SUPPLY

def sim(seg, entry_px, t_entry, policy, extra=None):
    """returns (multiple after costs, kind, mfe_before_-40, mfe)"""
    ts = seg.ts.values; px = seg.price_sol.values; n = len(ts)
    def land(j):
        k = np.searchsorted(ts, ts[j] + 1, side='left'); return None if k >= n else k
    def val(j, kind):
        k = land(j); return (px[-1] / entry_px * 0.985, kind + '/unresolved') if k is None else (px[k] / entry_px * 0.985, kind)
    x = px / entry_px
    mfe = x.max(); i40 = np.where(x <= 0.6)[0]; mfe40 = x[:i40[0] + 1].max() if len(i40) else mfe
    if policy == 'trail30':
        hi = x[0]
        for j in range(n):
            hi = max(hi, x[j])
            if x[j] <= hi * 0.7: r = val(j, 'trail'); return r + (mfe40, mfe)
        return (x[-1] * 0.985, 'horizon', mfe40, mfe)
    if policy == 'grad_scalp':  # TP 1.45; 90-s stagnation if 0.85..1.15; stop -50%
        k90 = np.searchsorted(ts, t_entry + 90, side='left')
        for j in range(n):
            if x[j] >= 1.45: r = val(j, 'tp'); return r + (mfe40, mfe)
            if x[j] <= 0.5: r = val(j, 'stop'); return r + (mfe40, mfe)
            if j >= k90 and 0.85 <= x[j] <= 1.15: r = val(j, 'stagnation'); return r + (mfe40, mfe)
        return (x[-1] * 0.985, 'horizon', mfe40, mfe)
    if policy == 'r3_free':  # leg A 70%: sell at 1.55x, or all out at 90 s if < 1.15; leg B 30%: floor 0.35x, half at 5x, half at 10x
        k90 = np.searchsorted(ts, t_entry + 90, side='left'); a_done = None
        for j in range(n):
            if x[j] >= 1.55: a_done = (j, val(j, 'tpA')); break
            if j >= k90 and x[j] < 1.15: r = val(j, 'stagnation'); return r + (mfe40, mfe)
            if x[j] <= 0.5: r = val(j, 'stopA'); return r + (mfe40, mfe)
        if a_done is None: return (x[-1] * 0.985, 'horizon', mfe40, mfe)
        j0, (va, ka) = a_done; total = 0.7 * va; rem = 0.3; got5 = False
        for j in range(j0, n):
            if x[j] <= 0.35: vb, kb = val(j, 'floorB'); total += rem * vb; return (total, ka + '+' + kb, mfe40, mfe)
            if not got5 and x[j] >= 5: vb, kb = val(j, 'tp5'); total += 0.15 * vb; rem = 0.15; got5 = True
            if x[j] >= 10: vb, kb = val(j, 'tp10'); total += rem * vb; return (total, ka + '+tp10', mfe40, mfe)
        return (total + rem * x[-1] * 0.985, ka + '+horizonB', mfe40, mfe)
    if policy == 'shake':  # 50% at 2x, remainder 45% trail
        hi = x[0]; total = None; rem = 1.0
        for j in range(n):
            hi = max(hi, x[j])
            if total is None and x[j] >= 2: v, k = val(j, 'tp2'); total = 0.5 * v; rem = 0.5; hi = x[j]
            if x[j] <= hi * 0.55: v, k = val(j, 'trail45'); return ((total or 0) + rem * v, 'trail45', mfe40, mfe)
        return ((total or 0) + rem * x[-1] * 0.985, 'horizon', mfe40, mfe)
    if policy == 'smart':  # 50% at 2.5x; rest when 2 of the smart wallets sell >= 50% (extra = sell index) else trail45
        sell_idx = extra; hi = x[0]; total = None; rem = 1.0
        for j in range(n):
            hi = max(hi, x[j])
            if total is None and x[j] >= 2.5: v, k = val(j, 'tp25'); total = 0.5 * v; rem = 0.5
            if sell_idx is not None and seg.index[j] >= sell_idx: v, k = val(j, 'copyexit'); return ((total or 0) + rem * v, 'copyexit', mfe40, mfe)
            if x[j] <= hi * 0.55: v, k = val(j, 'trail45'); return ((total or 0) + rem * v, 'trail45', mfe40, mfe)
        return ((total or 0) + rem * x[-1] * 0.985, 'horizon', mfe40, mfe)

rows = []; smart_train = collections.defaultdict(lambda: [0, 0]); early_buyers = {}
B = 60
for b in range(0, len(mints), B):
    chunk = mints[b:b + B]
    df = con.execute(f"select mint, ts, slot, ev_idx, row_id, price_sol, is_buy, sol, tokens, wallet, venue, vtok, pool_base_raw, base_dec from '{PQ}' where mint in ({','.join(repr(m) for m in chunk)}) and price_sol > 0 order by mint, slot, ev_idx nulls first, row_id").df()
    for m, p in df.groupby('mint', sort=False):
        p = clean(p)
        if len(p) < 20: continue
        t0 = p.ts.iloc[0]; ts = p.ts.values; px = p.price_sol.values
        if ts[-1] - t0 < 600: continue
        i60 = np.searchsorted(ts, t0 + 60, side='right') - 1
        if i60 < 0: continue
        p60 = px[i60]; peak_all = px[i60:].max() / p60
        zb, zbtok = zero_buy_sellers(p)
        # smart-wallet training: wallets buying 15-180 s, on train coins
        eb = p[(p.ts >= t0 + 15) & (p.ts <= t0 + 180) & (p.is_buy == 1)].groupby('wallet').sol.sum()
        early_buyers[m] = eb
        if t0 < SPLIT:
            for w in eb.index: smart_train[w][0] += 1; smart_train[w][1] += int(peak_all >= 3)
        trig = {}
        for k, name in ((3, 'R3'), (5, 'R5')):
            idx = np.where((px >= k * p60) & (ts > t0 + 60) & (ts <= t0 + 900))[0]; trig[name] = idx[0] if len(idx) else None
        pool = np.where(p.venue.values == 'pumpswap')[0]
        trig['GRAD'] = pool[0] if len(pool) and ts[pool[0]] - t0 <= 3600 else None
        # SHAKE-REC: >=2x p60, then a drop >=35% within 60 s from the running high, then reclaim >=60% of the drop within 180 s with >=15 new buyers
        trig['SHAKE'] = None
        idx2 = np.where((px >= 2 * p60) & (ts > t0 + 60) & (ts <= t0 + 1800))[0]
        if len(idx2):
            hi = px[idx2[0]]; hi_j = idx2[0]
            for j in range(idx2[0], len(p)):
                if px[j] > hi: hi = px[j]; hi_j = j
                if ts[j] - ts[hi_j] <= 60 and px[j] <= hi * 0.65:
                    low = px[j]; buyers_before = set(p.wallet.values[:j + 1][p.is_buy.values[:j + 1] == 1])
                    for q in range(j, len(p)):
                        if ts[q] - ts[j] > 180: break
                        if px[q] >= low + 0.6 * (hi - low):
                            nb = p.iloc[j:q + 1]; newb = set(nb.wallet[nb.is_buy == 1]) - buyers_before
                            if len(newb) >= 15: trig['SHAKE'] = q
                            break
                    break
        for name, j in trig.items():
            if j is None: continue
            k = np.searchsorted(ts, ts[j] + 1, side='left')
            if k >= len(p): continue
            entry_px = px[k] * 1.015; t_entry = ts[k]
            seg = p.iloc[k:]; seg = seg[seg.ts <= t_entry + H]
            if len(seg) < 2: continue
            top3, top5, impact, holders = conc(p, j)
            in_pool = p.venue.values[j] == 'pumpswap'
            w60 = p.iloc[np.searchsorted(ts, ts[j] - 60, side='left'):j + 1]; buyers60 = w60[w60.is_buy == 1].wallet.nunique()
            gap = px[pool[0]] / px[pool[0] - 1] if name == 'GRAD' and pool[0] > 0 else np.nan
            row = dict(mint=m, trigger=name, t0=t0, train=t0 < SPLIT, t_trig=ts[j] - t0, in_pool=in_pool, top3=top3, top5=top5, dump_impact=impact,
                       holders=holders, buyers60=buyers60, grad_gap=gap, zero_buy_sellers=zb, zero_buy_tokens_share=zbtok, peak_all=peak_all)
            pols = {'R3': ['trail30', 'r3_free'], 'R5': ['trail30', 'r3_free'], 'GRAD': ['trail30', 'grad_scalp'], 'SHAKE': ['trail30', 'shake']}[name]
            for pol in pols:
                mult, kind, mfe40, mfe = sim(seg, entry_px, t_entry, pol)
                row[pol] = mult; row[pol + '_kind'] = kind
            row['mfe40'] = mfe40; row['mfe'] = mfe
            rows.append(row)
    print(f'{b + B}/{len(mints)}', flush=True)

e = pd.DataFrame(rows)
# ---- smart wallets: train list, then test entries on test coins
sw = pd.DataFrame([(w, c, h) for w, (c, h) in smart_train.items()], columns=['wallet', 'coins', 'hits3x'])
sw['rate'] = sw.hits3x / sw.coins; smart = sw[(sw.coins >= 8) & (sw.rate >= 0.35)].sort_values('rate', ascending=False)
smart.to_csv('out/smart_wallets.csv', index=False); S = set(smart.wallet)
srows = []
for b in range(0, len(mints), B):
    chunk = [m for m in mints[b:b + B] if m in early_buyers]
    if not chunk: continue
    df = con.execute(f"select mint, ts, slot, ev_idx, row_id, price_sol, is_buy, sol, tokens, wallet, venue from '{PQ}' where mint in ({','.join(repr(m) for m in chunk)}) and price_sol > 0 order by mint, slot, ev_idx nulls first, row_id").df()
    for m, p in df.groupby('mint', sort=False):
        p = clean(p); t0 = p.ts.iloc[0]
        if t0 < SPLIT or len(p) < 20: continue
        ts = p.ts.values; px = p.price_sol.values
        net = collections.defaultdict(float); have = set(); j_entry = None
        for j in range(len(p)):
            if ts[j] - t0 > 180: break
            w = p.wallet.values[j]
            if w in S:
                net[w] += p.sol.values[j] if p.is_buy.values[j] == 1 else -p.sol.values[j]
                if p.is_buy.values[j] == 0: have.discard(w)
                elif net[w] >= 0.5: have.add(w)
                if len(have) >= 3 and ts[j] - t0 >= 10: j_entry = j; break
        if j_entry is None: continue
        k = np.searchsorted(ts, ts[j_entry] + 1, side='left')
        if k >= len(p): continue
        entry_px = px[k] * 1.015; t_entry = ts[k]; seg = p.iloc[k:]; seg = seg[seg.ts <= t_entry + H]
        if len(seg) < 2: continue
        # copy-exit index: when 2 of the tracked wallets have sold >= 50% of their tokens
        tracked = list(have); bought = {w: p.iloc[:j_entry + 1][(p.wallet == w) & (p.is_buy == 1)].tokens.sum() for w in tracked}
        sold = collections.defaultdict(float); nsold = 0; sell_idx = None
        for q in range(j_entry + 1, len(p)):
            w = p.wallet.values[q]
            if w in bought and p.is_buy.values[q] == 0:
                sold[w] += p.tokens.values[q]
                if sold[w] >= 0.5 * bought[w] and bought[w] > 0: nsold += 1; del bought[w]
                if nsold >= 2: sell_idx = q; break
        mult, kind, mfe40, mfe = sim(seg, entry_px, t_entry, 'smart', extra=sell_idx)
        srows.append(dict(mint=m, trigger='SMART', t0=t0, train=False, t_trig=ts[j_entry] - t0, n_smart=len(have), smart=mult, smart_kind=kind, mfe40=mfe40, mfe=mfe, peak_all=px[np.searchsorted(ts, t0 + 60, side='right') - 1:].max() / px[np.searchsorted(ts, t0 + 60, side='right') - 1]))
e = pd.concat([e, pd.DataFrame(srows)], ignore_index=True); e.to_csv('out/books14_entries.csv', index=False)

out = open('out/books14_out.txt', 'w')
def P(*a): print(*a); print(*a, file=out)
def summ(g, pol, label):
    v = g[pol].dropna() - 1 - HAIRCUT
    if len(v) == 0: P(f'  {label:44s} n=0'); return
    unres = g[pol + '_kind'].astype(str).str.contains('unresolved').mean()
    P(f'  {label:44s} n={len(v):4d}  mean {v.mean():+.3f}  cap5x {(v.clip(upper=4)).mean():+.3f}  median {v.median():+.3f}  SOL@0.2 {0.2*v.sum():+.2f}  win% {100*(v>0).mean():4.1f}  severe% {100*(v<=-0.4).mean():4.1f}  unresolved% {100*unres:3.1f}')
P('Population %d mints; entries: %s; haircut %.0f%% applied to every result' % (len(mints), e.trigger.value_counts().to_dict(), 100 * HAIRCUT))
P('\n== MFE: share of entries touching k x before dropping 40% (sim +1 s landing) ==')
for t in ['R3', 'R5', 'GRAD', 'SHAKE']:
    g = e[e.trigger == t]
    if len(g) == 0: continue
    P(f'  {t:6s} n={len(g):4d} ' + '  '.join(f'{k}x: {100*(g.mfe40>=k).mean():4.1f}%' for k in (1.3, 1.5, 1.8, 2.0, 3.0, 5.0)) + f'   (ever: 2x {100*(g.mfe>=2).mean():.1f}%  5x {100*(g.mfe>=5).mean():.1f}%)')
P('\n== concentration at the trigger second (trade-ledger reconstruction) ==')
for t in ['R3', 'R5', 'GRAD', 'SHAKE']:
    g = e[e.trigger == t]
    if len(g) == 0: continue
    sev = g[g.trail30 <= 0.6]; ok = g[g.trail30 > 0.6]; big = g[g.mfe >= 5]
    P(f'  {t:6s} top3 share median: severe {sev.top3.median():.3f} (n={len(sev)}) | others {ok.top3.median():.3f} | 5x-runners {big.top3.median():.3f} (n={len(big)})   dump-impact(top3 sell all) median: severe {sev.dump_impact.median():.2f} | others {ok.dump_impact.median():.2f}   zero-buy sellers: severe {sev.zero_buy_sellers.median():.0f} | others {ok.zero_buy_sellers.median():.0f}')
P('\n== books (haircut applied) ==')
for t, pol in [('R3', 'trail30'), ('R3', 'r3_free'), ('R5', 'trail30'), ('R5', 'r3_free'), ('GRAD', 'trail30'), ('GRAD', 'grad_scalp'), ('SHAKE', 'trail30'), ('SHAKE', 'shake')]:
    g = e[e.trigger == t]
    if len(g) == 0: continue
    summ(g, pol, f'{t} {pol} all')
    summ(g[g.top3 < 0.12], pol, f'{t} {pol} top3<12%')
    summ(g[g.top5 < 0.18], pol, f'{t} {pol} top5<18%')
    summ(g[g.dump_impact >= 0.55], pol, f'{t} {pol} top3-dump would cut price <45%')
    if t == 'GRAD': summ(g[(g.top3 < 0.12) & (g.grad_gap <= 1.35)], pol, f'{t} {pol} top3<12% & pool gap<=35%')
    if t in ('R3', 'R5'):
        summ(g[g.buyers60 >= 25], pol, f'{t} {pol} >=25 buyers in last 60 s'); summ(g[g.in_pool == True], pol, f'{t} {pol} in pool'); summ(g[g.in_pool == False], pol, f'{t} {pol} on curve')
        summ(g[(g.top5 < 0.18) & (g.buyers60 >= 25)], pol, f'{t} {pol} top5<18% & >=25 buyers')
    summ(g[g.train], pol, f'{t} {pol} first half (train)'); summ(g[~g.train], pol, f'{t} {pol} second half (test)')
g = e[e.trigger == 'SMART']
P(f'\n== SMART-CLUSTER: {len(smart)} wallets qualified on the first half (>=8 coins, >=35% of them reached 3x); test-half entries: {len(g)} ==')
if len(g): summ(g, 'smart', 'SMART copy-exit book (test half only)'); P('  entry time median %.0f s; peak>=2x from entry %.1f%%; >=5x %.1f%%' % (g.t_trig.median(), 100 * (g.mfe >= 2).mean(), 100 * (g.mfe >= 5).mean()))
out.close()
