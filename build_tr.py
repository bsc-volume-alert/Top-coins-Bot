# Build per-mint deduplicated trade tuples (same layout as replay_9nov extract.py + recv_ms at index 14) from raw CSV parts.
# argv: out.pkl.gz part1.csv.gz [part2 ...]   — keeps ALL mints in the parts.
import sys, gzip, csv, pickle, collections
T = collections.defaultdict(list); seen = set(); dup = n = 0
for fn in sys.argv[2:]:
    for r in csv.DictReader(gzip.open(fn, 'rt')):
        m = r['mint']; fp = (m, r['sig'], r['ev_idx'], r['venue'], r['is_buy'], r['sol'], r['tokens'])
        if fp in seen: dup += 1; continue
        seen.add(fp); n += 1
        T[m].append((int(r['slot']), int(r['ev_idx']) if r['ev_idx'] else -1, int(r['row_id']), int(r['ts']), r['venue'], r['is_buy'] == '1', float(r['sol']), float(r['tokens']), float(r['price_sol']),
                     float(r['vsol']) if r['vsol'] else None, float(r['vtok']) if r['vtok'] else None,
                     int(r['pool_quote_raw']) if r['pool_quote_raw'] else None, int(r['pool_base_raw']) if r['pool_base_raw'] else None, r['px_adj'] or None,
                     int(r['recv_ms']) if r.get('recv_ms') else None))
for m in T: T[m].sort(key=lambda x: (x[0], x[1], x[2]))
pickle.dump(dict(T), gzip.open(sys.argv[1], 'wb')); print('mints', len(T), 'rows', n, 'dups', dup)
