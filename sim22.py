# replay execution model v2.2 (11 Nov 2026, Codex review 15:06 UK). Replaces World.sim only; research.py v2.1 is kept unchanged.
# (1) SELL LATENCY: a trigger at swap x executes against the pool/curve state after the last swap in slot <= x.slot + 2 (~0.8 s; the live
#     chainfill lands 0.7 s after the trigger). Previously the sale executed at the trigger swap's own state.
# (2) TRAIL BASIS: the trail and the 2x half-sale fire on SELLABLE PROCEEDS (what the tokens held would fetch at that state, fees included),
#     not on spot price. Peak = highest sellable value per token seen so far.
# Everything else (buy 1 s after the decision, fees, gaps, quiet-priced, 2-h max) is unchanged.
import bisect
def sim22(s, m, T, exit_):
    if m not in s.TR: return dict(status='UNAVAILABLE', why='no-trades')
    land = math.floor(T + 1); i0, x0 = s.state(m, land); c0 = s.check(x0, land)
    if c0 in ('none', 'old', 'gap', 'curve-complete'): return dict(status='UNAVAILABLE', why=c0)
    tags = set(); tk0 = s.buy(m, x0, SIZE, tags)
    tr = s.TR[m]; slots = [x[0] for x in tr]
    after = [x for x in tr[i0 + 1:] if land < x[3] <= land + 7200]
    kind, a, b = exit_
    tk, got, half, ex_ts = tk0, 0.0, False, None
    def sell_at(t, amount):
        _, ss = s.state(m, t); c = s.check(ss, t)
        if ss is None or c == 'gap': return None
        if c == 'old': tags.add('QUIET-PRICED')
        return s.sell(m, ss, amount, tags)
    def landed(x):  # state the sale actually meets: last swap in slot <= trigger slot + 2
        j = bisect.bisect_right(slots, x[0] + 2) - 1; return tr[max(j, 0)]
    if kind == 'TIME':
        p = sell_at(land + a, tk); ex_ts = land + a
        if p is None: return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=None)
        return dict(status='FILLED', ret=(p - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], exit_ts=ex_ts, hi=None)
    dummy = set(); v0 = s.sell(m, x0, tk0, dummy) / tk0; peak = v0; hi = v0 * tk0 / SIZE
    for x in after:
        t = x[3]; vt = s.sell(m, x, tk0, dummy) / tk0          # sellable value per token at this state (full-size sale)
        hi = max(hi, vt * tk0 / SIZE)
        fire_tp = kind == 'TP_TRAIL' and not half and vt * tk0 >= b * SIZE
        fire_loss = vt <= peak * (1 - a)
        if fire_tp or fire_loss:
            ss = landed(x); ts_ = ss[3]
            if s.gap_overlap(ss[4], x[3], ts_ + 1): return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=hi)
            if fire_tp: got += s.sell(m, ss, tk / 2, tags); tk /= 2; half = True; peak = max(peak, vt); continue
            got += s.sell(m, ss, tk, tags); tk = 0; ex_ts = ts_; break
        peak = max(peak, vt)
    if tk > 0:
        p = sell_at(land + 7200, tk); ex_ts = land + 7200
        if p is None: return dict(status='UNRESOLVED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], hi=hi)
        got += p
    return dict(status='FILLED', ret=(got - SIZE - FIXED) / SIZE, tags=tags, venue=x0[4], exit_ts=ex_ts, hi=hi)
World.sim = sim22
