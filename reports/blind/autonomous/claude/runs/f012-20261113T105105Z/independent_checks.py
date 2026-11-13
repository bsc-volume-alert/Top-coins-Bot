#!/usr/bin/env python3
"""F012 independent checks of Codex C016 (dev_buy_sol provenance), written from scratch (no Codex code).

Inputs (allowlisted only): entry-package-7nov @ 0e3be03 (snapshot3/ and current/ fd_watch.csv.gz, INDEX.md read cutoffs),
entry-all-20261107t2210 @ e678331 (tokens_window.csv.gz census; trades_part_*.csv.gz tape).
Outputs: independent_checks.json (counts only; no outcome field is read; no trade P&L).

Part A re-derives C016's headline counts with independent code.
Part B is an addition Codex did not do: it compares both tables' dev_buy_sol with what the raw trade tape shows
the CREATOR bought in the creation slot (the first received slot of the mint), i.e. a quantity that is knowable
at the creation receipt. Tape coverage is limited to mints with retained trade histories, so Part B is a
subset statement, not a census-wide one.
"""
import sys, gzip, csv, json, collections, statistics
from decimal import Decimal, InvalidOperation

PKG, DATA, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

def dec(s):
    if s is None: return None
    s = str(s).strip()
    if s == '' or s.lower() in ('null', 'none', 'nan'): return None
    try:
        d = Decimal(s)
    except InvalidOperation:
        return None
    return d if d.is_finite() else None

def load_watch(path):
    rows = {}
    dup = 0
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            if r['mint'] in rows: dup += 1
            rows[r['mint']] = r
    return rows, dup

snap, dup_s = load_watch(f'{PKG}/snapshot3/fd_watch.csv.gz')
cur, dup_c = load_watch(f'{PKG}/current/fd_watch.csv.gz')
census = {}
with gzip.open(f'{DATA}/tokens_window.csv.gz', 'rt', newline='') as f:
    for r in csv.DictReader(f):
        census[r['mint']] = r

res = {'inputs': {'snapshot3_rows': len(snap), 'current_rows': len(cur), 'census_rows': len(census),
                  'duplicate_mint_keys': {'snapshot3': dup_s, 'current': dup_c}}}

def pop(rows):
    v = [dec(r['dev_buy_sol']) for r in rows.values()]
    return {'rows': len(v), 'zero': sum(1 for x in v if x is not None and x == 0),
            'positive': sum(1 for x in v if x is not None and x > 0),
            'missing_or_nonfinite': sum(1 for x in v if x is None)}
res['population'] = {'snapshot3': pop(snap), 'current': pop(cur), 'census': pop(census)}

# --- A1: paired fd_watch reads ---
common = snap.keys() & cur.keys()
cats = collections.Counter()
for m in common:
    a, b = dec(snap[m]['dev_buy_sol']), dec(cur[m]['dev_buy_sol'])
    if a is None and b is None: cats['both_missing'] += 1
    elif a is None: cats['empty_to_populated'] += 1
    elif b is None: cats['populated_to_empty'] += 1
    elif a == b: cats['unchanged_numeric'] += 1
    else: cats['changed_numeric'] += 1
res['paired_watch'] = {'common': len(common), 'snapshot3_only': len(snap.keys() - cur.keys()),
                       'current_only': len(cur.keys() - snap.keys()), 'categories': dict(cats)}

# --- A2: watch vs census cross-table ---
def cross(watch, name):
    mm = watch.keys() & census.keys()
    eq = diff = 0
    kinds = collections.Counter()
    absd = []
    for m in mm:
        a, b = dec(watch[m]['dev_buy_sol']), dec(census[m]['dev_buy_sol'])
        if a is None or b is None: kinds['missing'] += 1; continue
        if a == b: eq += 1
        else:
            diff += 1
            kinds['watch_zero_census_positive' if (a == 0 and b > 0) else
                  'watch_positive_census_zero' if (b == 0 and a > 0) else 'both_positive_different'] += 1
            absd.append(abs(b - a))
    absd.sort()
    out = {'overlap': len(mm), 'equal': eq, 'different': diff, 'kinds': dict(kinds)}
    if absd:
        out['abs_diff_sol'] = {'min': str(absd[0]), 'median': str(statistics.median(absd)),
                               'p95': str(absd[int(0.95 * (len(absd) - 1))]), 'max': str(absd[-1]),
                               'count_gt_1e-6': sum(1 for d in absd if d > Decimal('0.000001'))}
    return out
res['cross_table'] = {'snapshot3_vs_census': cross(snap, 'snapshot3'), 'current_vs_census': cross(cur, 'current')}
# of the current-watch disagreements, how many are also in snapshot3 and zero there
cur_diff = [m for m in cur.keys() & census.keys()
            if dec(cur[m]['dev_buy_sol']) is not None and dec(census[m]['dev_buy_sol']) is not None
            and dec(cur[m]['dev_buy_sol']) != dec(census[m]['dev_buy_sol'])]
res['cross_table']['current_disagreements_also_in_snapshot3'] = sum(1 for m in cur_diff if m in snap)
res['cross_table']['current_disagreements_also_zero_in_snapshot3'] = sum(1 for m in cur_diff if m in snap and dec(snap[m]['dev_buy_sol']) == 0)

# --- A3: nested checks ---
def nested(watch):
    nonempty = objs = with_dev = pos_nested_top_zero = 0
    ats = collections.Counter()
    keys = collections.Counter()
    for m, r in watch.items():
        try:
            arr = json.loads(r.get('checks') or '[]')
        except json.JSONDecodeError:
            arr = None
        if not arr: continue
        nonempty += 1
        objs += len(arr)
        anypos = False
        for o in arr:
            if not isinstance(o, dict): continue
            keys.update(o.keys())
            if 'dev_buy' in o:
                with_dev += 1
                d = dec(o['dev_buy'])
                if d is not None and d > 0: anypos = True
            if 'at' in o: ats[str(o['at'])] += 1
        if anypos and dec(r['dev_buy_sol']) == 0: pos_nested_top_zero += 1
    return {'rows_nonempty': nonempty, 'check_objects': objs, 'objects_with_dev_buy': with_dev,
            'mints_positive_nested_dev_buy_but_top_level_zero': pos_nested_top_zero,
            'at_values': dict(ats), 'object_keys': dict(keys)}
res['nested_checks'] = {'snapshot3': nested(snap), 'current': nested(cur)}

# --- A4: row-timestamp descriptives (NOT a dev_buy_sol write clock; descriptive only) ---
def tsdesc(watch):
    out = {}
    for fld in ('scanned_ts', 'trace_ts'):
        d = []
        for r in watch.values():
            a, c = dec(r.get(fld)), dec(r.get('created_ts'))
            if a is not None and c is not None: d.append(float(a - c))
        d.sort()
        if d:
            out[fld + '_minus_created_s'] = {'n': len(d), 'p10': d[int(.1 * (len(d) - 1))], 'median': statistics.median(d),
                                             'p90': d[int(.9 * (len(d) - 1))], 'p99': d[int(.99 * (len(d) - 1))], 'max': d[-1],
                                             'share_le_5s': sum(1 for x in d if x <= 5) / len(d),
                                             'share_le_60s': sum(1 for x in d if x <= 60) / len(d)}
    return out
res['row_timestamps_descriptive'] = {'snapshot3': tsdesc(snap), 'current': tsdesc(cur),
    'note': 'scanned_ts/trace_ts are row-level lookup clocks; they do not date the dev_buy_sol write (Codex C016). Shown only as an upper bound on when the ROW first existed.'}

# --- B: creator buy in the creation slot from the raw tape (knowable at the creation receipt) ---
# first received slot per mint = min slot on the tape; creator = census creator (fd_watch creator cross-checked)
first_slot = {}
creator_buy_first_slot = collections.defaultdict(Decimal)
creator_buy_first_60s = collections.defaultdict(Decimal)
creator_buy_recv_lag = {}   # mint -> recv_ms/1000 - create_ts of the LAST creator buy row in the first slot (when the sum is complete)
any_rows = set()
import glob
for part in sorted(glob.glob(f'{DATA}/trades_part_*.csv.gz')):
    with gzip.open(part, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            m = r['mint']
            if m not in census: continue
            any_rows.add(m)
            s = int(r['slot'])
            if m not in first_slot or s < first_slot[m]: first_slot[m] = s
# second pass to sum creator buys in the first slot (two passes keep memory small)
for part in sorted(glob.glob(f'{DATA}/trades_part_*.csv.gz')):
    with gzip.open(part, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            m = r['mint']
            if m not in first_slot: continue
            if r['venue'] not in ('', 'curve') or r['is_buy'] != '1': continue
            if r['wallet'] != census[m]['creator']: continue
            sol = dec(r['sol']) or Decimal(0)
            if int(r['slot']) == first_slot[m]:
                creator_buy_first_slot[m] += sol
                rv, ct0 = dec(r['recv_ms']), dec(census[m]['create_ts'])
                if rv is not None and ct0 is not None:
                    creator_buy_recv_lag[m] = max(creator_buy_recv_lag.get(m, -1e9), float(rv / 1000 - ct0))
            ts, ct = dec(r['ts']), dec(census[m]['create_ts'])
            if ts is not None and ct is not None and ts - ct <= 60: creator_buy_first_60s[m] += sol

def agree(x, y, tol=Decimal('0.000001')):
    return abs(x - y) <= tol

def compare(table, name):
    mm = [m for m in any_rows if m in table and dec(table[m]['dev_buy_sol']) is not None]
    c = collections.Counter()
    for m in mm:
        v = dec(table[m]['dev_buy_sol']); tape = creator_buy_first_slot.get(m, Decimal(0))
        if agree(v, tape): c['equal_to_creator_buy_in_first_slot'] += 1
        elif v == 0 and tape > 0: c['table_zero_tape_positive'] += 1
        elif v > 0 and tape == 0: c['table_positive_tape_zero'] += 1
        else: c['both_positive_different'] += 1
        c['table_zero'] += (v == 0)
        c['tape_zero'] += (tape == 0)
    return {'mints_on_tape_and_in_table': len(mm), **dict(c)}
res['tape_vs_tables'] = {'mints_in_census_with_tape_rows': len(any_rows),
                         'census': compare(census, 'census'), 'snapshot3': compare(snap, 'snapshot3'), 'current': compare(cur, 'current'),
                         'definition': 'tape creator buy = sum of curve buys by the census creator wallet in the lowest slot on the mint tape (received rows only); tolerance 1e-6 SOL',
                         'caveat': 'tape exists only for retained launches (and book-entered mints); the slot-first buy may miss a creator buy delayed by a slot; not a census-wide statement'}
# the 6,572 current-watch disagreements that have a tape: does the tape show a creator buy?
dd = [m for m in cur_diff if m in any_rows]
res['tape_vs_tables']['current_watch_disagreements_with_tape'] = {
    'n': len(dd),
    'tape_creator_buy_first_slot_positive': sum(1 for m in dd if creator_buy_first_slot.get(m, Decimal(0)) > 0),
    'tape_equals_census_1e-6': sum(1 for m in dd if agree(creator_buy_first_slot.get(m, Decimal(0)), dec(census[m]['dev_buy_sol']))),
    'tape_creator_buy_within_60s_positive': sum(1 for m in dd if creator_buy_first_60s.get(m, Decimal(0)) > 0)}
lags = sorted(creator_buy_recv_lag.values())
if lags:
    res['tape_vs_tables']['creator_first_slot_buy_receipt_minus_create_ts_s'] = {
        'n': len(lags), 'p10': lags[int(.1 * (len(lags) - 1))], 'median': statistics.median(lags),
        'p90': lags[int(.9 * (len(lags) - 1))], 'p99': lags[int(.99 * (len(lags) - 1))], 'max': lags[-1],
        'note': 'create_ts has 1-s granularity; recv_ms is the tracker receipt of the creator buy row; this is when the tape-derived quantity became knowable'}
# creator field agreement between tables (sanity)
res['creator_field_agreement'] = {'snapshot3_vs_census': sum(1 for m in snap.keys() & census.keys() if snap[m]['creator'] == census[m]['creator']),
                                  'snapshot3_vs_census_overlap': len(snap.keys() & census.keys())}
json.dump(res, open(OUT, 'w'), indent=2, default=str)
print(json.dumps(res, indent=2, default=str))
