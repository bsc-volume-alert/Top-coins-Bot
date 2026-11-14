# trades-archive-pre-20261106

Archive of the tracker's raw `trades` rows with rowid 1 → 4919032 (fixed cutoff; rowids grow with insert time). Trade times 2026-10-13T14:51:57.000Z → 2026-11-06T07:39:59.000Z (UTC). Made 2026-11-14T00:48:22.599Z by reports/tools/archive-trades.mjs (read-only on the database).

| Check | Result |
|---|---|
| rows written | 4919032 |
| COUNT(*) in the database for the range | 4919032 |
| restore check (decompress → parse → re-serialise) rows | 4919032 |
| content SHA-256 at export | `4c7691978d746bb603faea4231f4b090a65a4860bd9b4d664d746717c3e2a799` |
| content SHA-256 after restore | `4c7691978d746bb603faea4231f4b090a65a4860bd9b4d664d746717c3e2a799` |
| malformed rows | 0 |
| **verdict** | **VERIFIED** |

## Files
- `trades_part_NNN.csv.gz` — every column of `trades` exactly as stored (+ `row_id` = tracker rowid), in rowid order. `recv_ms` = when the tracker received the trade (use it for knowable-at-time rules); `ts` = block time.
- `launches.csv.gz` (tokens), `token_life.csv.gz` (lifecycle checkpoints), `token_cp_clock.csv.gz` (clock checkpoints) — every row for the 15556 coins that have trades in this archive (rows: {"launches.csv.gz":15556,"token_life.csv.gz":67949,"token_cp_clock.csv.gz":0,"feed_gaps_all.csv.gz":8853}).
- `feed_gaps_all.csv.gz` — the whole feed_gaps table at export time (socket open/close/idle events; nothing backfilled).
- `SHA256SUMS.txt`, `VERIFIED.json`.

## Restore
```
sha256sum -c SHA256SUMS.txt
python3 - <<'PY'
import csv, gzip, glob, sqlite3
db = sqlite3.connect('trades_restored.db')
for f in sorted(glob.glob('trades_part_*.csv.gz')):
    r = csv.reader(gzip.open(f, 'rt', newline=''))
    h = next(r)
    db.execute('CREATE TABLE IF NOT EXISTS trades (' + ','.join(h) + ')')
    db.executemany('INSERT INTO trades VALUES (' + ','.join('?' * len(h)) + ')', ([None if v == '' else v for v in row] for row in r))
db.commit(); print(db.execute('SELECT COUNT(*) FROM trades').fetchone())
PY
```
The count must equal 4919032. Empty CSV fields are NULL in the database.
