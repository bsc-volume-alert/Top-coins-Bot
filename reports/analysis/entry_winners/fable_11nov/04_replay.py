#!/usr/bin/env python3 -I
"""Trade-level replay of every distinct decision key (mint @ decision second) that has a trade stream.

For each key: fill 0.2 SOL (and 0.02 SOL) at the chain state 1 s after the decision, then compute the position's
after-cost value path x(t) over every later event, and evaluate a documented finite grid of exit policies.
Also records path milestones (gross price multiple vs fill price): 1.3x/2x/3x/4x/5x/10x reached before the
baseline exit, after it (within 2 h and within the whole captured stream), max drawdown, and coverage flags.

Pricing model (documented; sensitivities in 05_exit_grid.py):
  curve  : constant product on the post-trade virtual reserves (vsol, vtok) stored on each curve row;
           fee 1.00 % per leg (pump.fun), + 0.0015 SOL fixed per round trip.
  pool   : event reserves are PRE-trade (POOL_DIAGNOSIS: 98.8 % of consecutive pairs). Post-trade state =
           (Q +/- quote, B -/+ base). Swaps fit constant product on (Q + c, B) with a per-pool offset c estimated
           from that pool's own EARLIER swaps only (median of the last 50 implied c, >= 5 needed; else the
           global default C_DEFAULT with a CAL-FALLBACK tag). Fee 0.30 % per leg (0.25 LP + 0.05 creator).
           Pools whose quote is not SOL (quote_mint != wSOL) are not priced: positions there are 'unknown'.
  migration gap: between the last curve trade and the first pool trade the position cannot be sold; a trigger
           inside the gap executes on the first pool state.
  execution: trigger seen on event i (state after event i); sell lands on the last event with ts <= ts_i + LAND_S.
  horizon : 7200 s after the decision; at the horizon the sale executes on the last state before it, flagged
           'stale' if that state is older than 600 s (quiet exit: proceeds uncertain).
  unknown : no curve/pool state within 300 s before the fill time, or stream ends (last event) more than 600 s
           before the policy's exit time while the position is open -> result 'unresolved' (reported, never dropped).
"""
import numpy as np, pandas as pd, duckdb, json, sys, time, os
OUT = '/home/claude/work/out'
STAKES = [0.2, 0.02]
FIXED = 0.0015; CURVE_FEE = 0.010; POOL_FEE = 0.0030
LAND_S = int(os.environ.get('LAND_S', '1'))        # execution lag in whole seconds after the trigger event's block second
HORIZON = 7200; C_DEFAULT = float(os.environ.get('C_DEFAULT', '17.3')); C_MODE = os.environ.get('C_MODE', 'own')  # own | zero | fixed
WSOL = 'So11111111111111111111111111111111111111112'
TAG = os.environ.get('TAG', 'base')
FILL_KIND = [0]

# ---------------- exit policies (the finite, documented grid) ----------------
# each: name, kind, params. Evaluated on the after-cost value multiple x (0.2 SOL) and on gross price multiple p where stated.
POLICIES = []
for tr in [0.15, 0.20, 0.25, 0.30, 0.40, 0.50]: POLICIES.append((f'T{int(tr*100)}', 'trail', dict(trail=tr)))
POLICIES.append(('TVENUE', 'trail_venue', dict(curve=0.40, pool=0.25)))          # the launcher's baseline exit
for h in [30, 60, 120, 300, 600, 1800, 7200]: POLICIES.append((f'H{h}', 'hold', dict(hold=h)))
for tp in [1.3, 1.5, 2.0, 3.0, 5.0]: POLICIES.append((f'TP{tp}_T40', 'tp_trail', dict(tp=tp, trail=0.40)))
for tp in [1.5, 2.0]: POLICIES.append((f'TP{tp}_H7200', 'tp_hold', dict(tp=tp)))
for sl, tp in [(0.30, 2.0), (0.50, 2.0), (0.30, 1.5), (0.50, 3.0)]: POLICIES.append((f'SL{int(sl*100)}_TP{tp}', 'sl_tp', dict(sl=sl, tp=tp)))
for half_at, tr in [(1.5, 0.40), (2.0, 0.40), (2.0, 0.25), (3.0, 0.40)]: POLICIES.append((f'HALF{half_at}_T{int(tr*100)}', 'half', dict(half=half_at, trail=tr)))
POLICIES.append(('T40_TC600', 'trail_tcap', dict(trail=0.40, tcap=600, need=1.30)))   # trail 40 %, but leave at 600 s unless +30 % by then
POLICIES.append(('T25_TC600', 'trail_tcap', dict(trail=0.25, tcap=600, need=1.30)))
POLICIES.append(('T40_TC300', 'trail_tcap', dict(trail=0.40, tcap=300, need=1.20)))
POLICIES.append(('T40_SL50', 'trail_sl', dict(trail=0.40, sl=0.50)))                   # trail + hard stop at -50 %
POLICIES.append(('T25_SL30', 'trail_sl', dict(trail=0.25, sl=0.30)))
PNAMES = [p[0] for p in POLICIES]

def c_implied(Q, B, is_buy, quote, base):
    """implied effective quote offset c from one swap on pre-trade (Q,B): constant product on (Q+c, B)"""
    with np.errstate(divide='ignore', invalid='ignore'):
        if is_buy: c = B * quote / base - quote - Q        # base out = B*q/(Q+c+q)
        else: c = (B + base) * quote / base - Q           # quote out = (Q+c)*b/(B+b)  -> Q+c = quote*(B+b)/b
    return c

def sell_value(T, state, fee):
    """SOL proceeds (after swap fee) for selling T raw tokens into state (Qeff, B) constant product"""
    Qeff, B = state
    if T <= 0 or B <= 0: return 0.0
    return Qeff * T / (B + T) * (1 - fee)

def buy_tokens(q, state, fee):
    Qeff, B = state
    qn = q * (1 - fee)
    return B * qn / (Qeff + qn)

PQ = f'{OUT}/trades/trades_entered_dedup.parquet'
def stream_mints():
    con = duckdb.connect()
    return [r[0] for r in con.execute(f"SELECT DISTINCT mint FROM read_parquet('{PQ}') ORDER BY mint").fetchall()]

def load_batch(mints):
    """load the ordered event streams of a batch of mints (numeric columns cast in duckdb to keep memory small)"""
    con = duckdb.connect()
    lst = ','.join("'" + m + "'" for m in mints)
    q = f"""SELECT mint, ts, is_buy, sol, tokens, price_sol, TRY_CAST(vsol AS DOUBLE) vsol, TRY_CAST(vtok AS DOUBLE) vtok, venue, pool,
                   TRY_CAST(base_raw AS DOUBLE) base_raw, TRY_CAST(quote_raw AS DOUBLE) quote_raw,
                   TRY_CAST(pool_base_raw AS DOUBLE) pool_base_raw, TRY_CAST(pool_quote_raw AS DOUBLE) pool_quote_raw, quote_mint
            FROM read_parquet('{PQ}') WHERE mint IN ({lst}) ORDER BY mint, slot, ev_idx NULLS FIRST, row_id"""
    return con.execute(q).df()

def build_states(g):
    """per mint: arrays of (ts, kind, Qeff, B, price, valid, cal_fallback) post-trade states in chain order"""
    ts = g.ts.values.astype(np.int64)
    venue = g.venue.fillna('curve').values
    is_curve = (venue != 'pumpswap')
    n = len(g)
    Qeff = np.full(n, np.nan); B = np.full(n, np.nan); price = np.full(n, np.nan)
    kind = np.where(is_curve, 0, 1); valid = np.zeros(n, bool); calfb = np.zeros(n, bool); nonsol = np.zeros(n, bool); noev = np.zeros(n, bool)
    # curve: post-trade virtual reserves in lamports / raw
    vs = g.vsol.values; vt = g.vtok.values
    ok = is_curve & (vs > 0) & (vt > 0)
    Qeff[ok] = vs[ok] / 1e9; B[ok] = vt[ok]; price[ok] = Qeff[ok] / B[ok]; valid[ok] = True
    # curve rows without stored reserves (pre-0.19.2 capture, 5-6 Nov): rebuild the virtual reserves from the trade's own
    # price via the pump.fun invariant k = 30 SOL x 1.073e9 tokens (lamports x raw): vsol = sqrt(p_lamports_per_raw * k)
    miss = is_curve & ~ok & (g.price_sol.values > 0)
    if miss.any():
        K = 30e9 * 1.073e15
        p = g.price_sol.values[miss] * 1e3           # SOL/token -> lamports/raw
        vsol = np.sqrt(p * K); Qeff[miss] = vsol / 1e9; B[miss] = K / vsol; price[miss] = Qeff[miss] / B[miss]; valid[miss] = True
        noev[miss] = True
    # pool: pre-trade reserves -> post-trade; c from own earlier swaps
    pidx = np.where(~is_curve)[0]
    if len(pidx):
        pools = g.pool.values; qm = g.quote_mint.values
        pq = g.pool_quote_raw.values; pb = g.pool_base_raw.values; qr = g.quote_raw.values; br = g.base_raw.values
        ib = g.is_buy.values; sol = g.sol.values; tok = g.tokens.values
        hist = {}
        for i in pidx:
            if isinstance(qm[i], str) and qm[i] != WSOL: nonsol[i] = True; continue
            if pq[i] == pq[i] and pb[i] == pb[i]:
                Q0 = pq[i] / 1e9; B0 = pb[i]
            else:  # pre-0.19.9 pool row: vsol = pool quote reserve (lamports), vtok = base reserve (raw); quote mint unknown
                Q0 = vs[i] / 1e9 if vs[i] == vs[i] else np.nan; B0 = vt[i] if vt[i] == vt[i] else np.nan; noev[i] = True
            q = qr[i] / 1e9 if qr[i] == qr[i] else sol[i]; b = br[i] if br[i] == br[i] else tok[i] * 1e6
            if not (Q0 > 0 and B0 > 0 and q > 0 and b > 0): continue
            h = hist.setdefault(pools[i], [])
            if C_MODE == 'zero': c = 0.0
            elif C_MODE == 'fixed': c = C_DEFAULT
            else:
                if len(h) >= 5: c = float(np.median(h[-50:]))
                else: c = C_DEFAULT; calfb[i] = True
            ci = c_implied(Q0, B0, ib[i] == 1, q, b)
            if np.isfinite(ci) and -Q0 < ci < 10 * Q0 + 200: h.append(ci)
            if ib[i] == 1: Q1, B1 = Q0 + q, B0 - b
            else: Q1, B1 = Q0 - q, B0 + b
            if Q1 > 0 and B1 > 0:
                Qeff[i] = Q1 + c; B[i] = B1; price[i] = Qeff[i] / B[i]; valid[i] = True
    return dict(ts=ts, kind=kind, Qeff=Qeff, B=B, price=price, valid=valid, calfb=calfb, nonsol=nonsol, noev=noev)

def last_idx_leq(ts, t):
    """index of last event with ts <= t, or -1"""
    return int(np.searchsorted(ts, t, side='right')) - 1

def replay_key(S, t0, stakes=STAKES):
    """returns dict of results for one decision key"""
    ts, kind, Qeff, B, price, valid = S['ts'], S['kind'], S['Qeff'], S['B'], S['price'], S['valid']
    res = {}
    # fill state: last valid event with ts <= t0 + 1
    j = last_idx_leq(ts, t0 + 1)
    while j >= 0 and not valid[j]: j -= 1
    if j < 0 or ts[j] < t0 - 300:
        res['fill_status'] = 'unavailable (no state within 300 s before fill)'; return res
    if S['nonsol'][:j+1].any() and kind[j] == 1:
        res['fill_status'] = 'unknown (non-SOL quote pool)'; return res
    fill_kind = kind[j]; fee_in = CURVE_FEE if fill_kind == 0 else POOL_FEE; FILL_KIND[0] = fill_kind
    if fill_kind == 0 and Qeff[j] >= 110.0:   # virtual 30 SOL + >= 80 SOL raised: the curve is complete, a curve buy is impossible
        res['fill_status'] = 'artefact (curve complete at fill: instant graduation, no pool state)'; return res
    res['fill_status'] = 'filled'; res['fill_venue'] = 'curve' if fill_kind == 0 else 'pool'
    res['fill_ts'] = int(ts[j]); res['fill_lag_s'] = int(t0 + 1 - ts[j]); res['fill_calfb'] = bool(S['calfb'][j])
    res['fill_price'] = float(price[j]); res['pool_noevidence_rows'] = int(S['noev'].sum())
    # events after fill (strictly later index) up to the end of stream
    after = np.arange(j + 1, len(ts))
    after = after[valid[after]]
    if len(after) == 0:
        res['path_status'] = 'no later state'; res['fill_status'] = 'unknown (no state after fill)'; return res
    ta = ts[after]; ka = kind[after]; pa = price[after]
    tend = int(ta[-1]); res['stream_end_rel_s'] = int(tend - t0)
    res['first_pool_rel_s'] = int(ta[ka == 1][0] - t0) if (ka == 1).any() else None
    res['migrated_in_2h'] = bool(((ka == 1) & (ta <= t0 + HORIZON)).any()) and fill_kind == 0
    # gross price multiple path and milestones within 2 h and whole stream
    pm = pa / res['fill_price']
    in2h = ta <= t0 + HORIZON
    res['pmax_2h'] = float(pm[in2h].max()) if in2h.any() else None
    res['pmax_all'] = float(pm.max())
    for lv in [1.3, 2, 3, 4, 5, 10]:
        hit = np.where(pm >= lv)[0]
        res[f't{lv}x_rel_s'] = int(ta[hit[0]] - t0) if len(hit) else None
    for stake in stakes:
        sfx = '' if stake == 0.2 else '_02'
        T = buy_tokens(stake, (Qeff[j], B[j]), fee_in)
        # value path (after swap fee and fixed fee) at each later state; curve-> pool switch handled by kind
        fee_out = np.where(ka == 0, CURVE_FEE, POOL_FEE)
        val = Qeff[after] * T / (B[after] + T) * (1 - fee_out)
        x = (val - FIXED) / stake
        res[f'x_land{sfx}'] = float(((Qeff[j] * T / (B[j] + T)) * (1 - fee_in) - FIXED) / stake)  # immediate round trip
        res[f'xmax_2h{sfx}'] = float(x[in2h].max()) if in2h.any() else None
        hi = np.maximum.accumulate(x)
        # ---- policies
        for name, kindp, prm in POLICIES:
            r = eval_policy(kindp, prm, x, hi, ta, ka, t0, stake, T, Qeff, B, after, tend)
            res[f'{name}{sfx}'] = r['r']; res[f'{name}{sfx}_exit_rel_s'] = r['t']; res[f'{name}{sfx}_st'] = r['st']
    return res

def execute(idx_sig, x, ta, ka, t0, stake, T, Qeff, B, after, tend, trail_sig=None):
    """sell on the last state with ts <= ts[idx_sig] + LAND_S. Returns (r, exit_rel_s, status)"""
    t_sig = ta[idx_sig]
    k = int(np.searchsorted(ta, t_sig + LAND_S, side='right')) - 1
    k = max(k, idx_sig)
    fee = CURVE_FEE if ka[k] == 0 else POOL_FEE
    # migration gap: if signal state is curve and the next pool state comes later than the landing, we cannot sell on the
    # completed curve -> execute on the first pool state (if any) else unresolved
    if ka[idx_sig] == 0 and k < len(ta) - 1 and ka[k] == 0 and ka[k + 1] == 1 and ta[k + 1] - ta[k] > 2:
        # was the curve already complete? approximate: price at signal >= 0.9 of curve ceiling is not derivable here; use the
        # next-pool rule only when the curve state is the LAST curve state of the stream
        if not (ka[k + 1:] == 0).any():
            k = k + 1; fee = POOL_FEE
    val = Qeff[after[k]] * T / (B[after[k]] + T) * (1 - fee)
    r = (val - FIXED) / stake - 1.0
    # the sale lands at t_sig + LAND_S; the AMM state at that moment is the last observed state (it only changes on trades).
    t_sale = t_sig + LAND_S
    st = 'closed'
    if t_sale - ta[k] > 600: st = 'stale-quote'          # state used is older than 600 s at the sale time
    if k == len(ta) - 1 and tend - t_sale < 0 and (t_sale - ta[k]) > 60: st = 'last-observed-state'  # nothing captured after the trigger
    return dict(r=float(r), t=int(t_sale - t0), st=st)

def horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, th):
    """time stop decided at t0+th, sale lands at t0+th+LAND_S on the last state observed by then"""
    th = th + LAND_S
    k = int(np.searchsorted(ta, t0 + th, side='right')) - 1
    if k < 0: return dict(r=None, t=None, st='unresolved (no state before exit time)')
    fee = CURVE_FEE if ka[k] == 0 else POOL_FEE
    val = Qeff[after[k]] * T / (B[after[k]] + T) * (1 - fee)
    r = (val - FIXED) / stake - 1.0
    if tend < t0 + th - 600 and ka[k] == 0:
        return dict(r=float(r), t=int(th), st='unresolved (stream ended >600 s before exit; last state used)')
    st = 'stale-quote' if (t0 + th) - ta[k] > 600 else 'closed'
    return dict(r=float(r), t=int(th), st=st)

def eval_policy(kindp, prm, x, hi, ta, ka, t0, stake, T, Qeff, B, after, tend):
    n = len(x); in2h = ta <= t0 + HORIZON
    if kindp == 'hold':
        return horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, prm['hold'])
    if kindp in ('trail', 'trail_venue', 'trail_sl', 'trail_tcap'):
        if kindp == 'trail_venue': trail = prm['curve'] if FILL_KIND[0] == 0 else prm['pool']   # fixed by ENTRY venue, as in the launcher
        else: trail = prm['trail']
        cond = (x <= hi * (1 - trail)) & (hi > 0) & in2h
        if kindp == 'trail_sl': cond |= (x <= (1 - prm['sl'])) & in2h
        if kindp == 'trail_tcap':
            # leave at tcap unless x reached 'need' by then
            tc = t0 + prm['tcap']
            reached = (x[ta <= tc] >= prm['need']).any() if (ta <= tc).any() else False
            if not reached:
                hz = horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, prm['tcap'])
                # but a trail trigger before tcap still counts
                early = np.where(cond & (ta <= tc))[0]
                if len(early): return execute(early[0], x, ta, ka, t0, stake, T, Qeff, B, after, tend)
                return hz
        hit = np.where(cond)[0]
        if len(hit): return execute(hit[0], x, ta, ka, t0, stake, T, Qeff, B, after, tend)
        return horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, HORIZON)
    if kindp in ('tp_trail', 'tp_hold', 'sl_tp'):
        cond = (x >= prm['tp']) & in2h
        if kindp == 'tp_trail': cond |= (x <= hi * (1 - prm['trail'])) & (hi > 0) & in2h
        if kindp == 'sl_tp': cond |= (x <= (1 - prm['sl'])) & in2h
        hit = np.where(cond)[0]
        if len(hit): return execute(hit[0], x, ta, ka, t0, stake, T, Qeff, B, after, tend)
        return horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, HORIZON)
    if kindp == 'half':
        # sell half at x >= half (on the half position's own value), trail the rest; before the half the trail also applies
        cond_h = (x >= prm['half']) & in2h
        cond_t = (x <= hi * (1 - prm['trail'])) & (hi > 0) & in2h
        h1 = np.where(cond_h)[0]; t1 = np.where(cond_t)[0]
        first_t = t1[0] if len(t1) else None; first_h = h1[0] if len(h1) else None
        if first_h is None or (first_t is not None and first_t < first_h):
            if first_t is not None: return execute(first_t, x, ta, ka, t0, stake, T, Qeff, B, after, tend)
            return horizon_exit(x, ta, ka, t0, stake, T, Qeff, B, after, tend, HORIZON)
        # execute half
        e1 = execute(first_h, x, ta, ka, t0, stake / 2, T / 2, Qeff, B, after, tend)
        # remainder: new value path for T/2 from after the half sale (state unchanged approx), trail from its own high after that point
        k1 = int(np.searchsorted(ta, ta[first_h] + LAND_S, side='right')) - 1
        fee_out = np.where(ka == 0, CURVE_FEE, POOL_FEE)
        val2 = Qeff[after] * (T / 2) / (B[after] + T / 2) * (1 - fee_out)
        x2 = (val2 - FIXED / 2) / (stake / 2)
        seg = np.arange(k1 + 1, n)
        if len(seg) == 0:   # no state observed after the half sale: the remainder's path is unobserved
            r2 = x2[k1] - 1.0; t2 = int(ta[k1] + LAND_S - t0); st2 = 'unresolved (remainder unobserved after partial sale; same state used)'
        else:
            hi2 = np.maximum.accumulate(x2[seg]); c2 = (x2[seg] <= hi2 * (1 - prm['trail'])) & in2h[seg]
            hh = np.where(c2)[0]
            if len(hh):
                e2 = execute(seg[hh[0]], x2, ta, ka, t0, stake / 2, T / 2, Qeff, B, after, tend); r2, t2, st2 = e2['r'], e2['t'], e2['st']
            else:
                e2 = horizon_exit(x2, ta, ka, t0, stake / 2, T / 2, Qeff, B, after, tend, HORIZON); r2, t2, st2 = e2['r'], e2['t'], e2['st']
        if r2 is None: return dict(r=None, t=None, st=st2)
        return dict(r=float(0.5 * e1['r'] + 0.5 * r2), t=int(t2), st=('closed' if e1['st'] == 'closed' and st2 == 'closed' else f'{e1["st"]}/{st2}'))
    raise ValueError(kindp)

def main():
    t_start = time.time()
    pos = pd.read_csv(f'{OUT}/positions.csv', low_memory=False)
    keys = pos.drop_duplicates('dec_key')[['dec_key', 'mint', 'entry_ts', 'created_ts']].copy()
    print('decision keys', len(keys))
    allm = stream_mints(); print('mints with streams', len(allm), round(time.time() - t_start), 's')
    lim = os.environ.get('LIMIT_MINTS')
    if lim:
        allm = pd.Series(allm).sample(int(lim), random_state=1).tolist() + ['CdmzERuZnYQwqwa2rxtRjsMjDU6y6qrM5ez6n2mxpump', '7NDQZp7evs1V7J1AnoZhYzCyh6Z4MpizGXhTRyNfpump']
    has = set(allm); keys['has_stream'] = keys.mint.isin(has)
    if lim: keys = keys[keys.has_stream]
    print('keys with stream', keys.has_stream.sum())
    out = []; done = 0
    BATCH = 60
    for b0 in range(0, len(allm), BATCH):
        df = load_batch(allm[b0:b0 + BATCH])
        for mint, g_idx in df.groupby('mint', sort=False).indices.items():
            g = df.iloc[g_idx]
            S = build_states(g)
            for _, k in keys[keys.mint == mint].iterrows():
                r = dict(dec_key=k.dec_key, mint=mint, entry_ts=int(k.entry_ts), n_events=len(g), n_pool_events=int((S['kind'] == 1).sum()),
                         nonsol_pool=bool(S['nonsol'].any()), stream_first_rel_s=int(S['ts'][0] - k.entry_ts), stream_last_rel_s=int(S['ts'][-1] - k.entry_ts))
                try: r.update(replay_key(S, int(k.entry_ts)))
                except Exception as e: r['fill_status'] = f'error: {e!r}'
                out.append(r)
            done += 1
        print(done, 'mints', round(time.time() - t_start), 's', flush=True)
        del df
    R = pd.DataFrame(out)
    nos = keys[~keys.has_stream].copy(); nos['fill_status'] = 'no trade stream exported'
    R = pd.concat([R, nos[['dec_key', 'mint', 'entry_ts', 'fill_status']]], ignore_index=True)
    R.to_csv(f'{OUT}/replay_{TAG}.csv', index=False)
    print('wrote', f'{OUT}/replay_{TAG}.csv', R.shape, round(time.time() - t_start), 's')
    print(R.fill_status.value_counts())

if __name__ == '__main__':
    main()
