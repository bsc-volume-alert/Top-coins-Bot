// repair-merge.mjs — 10 Nov 2026. Rebuild a sound tracker DB: the volume copy (+ its WAL; quick_check OK, data to 04:57:02 UTC) receives every row the
// live DB (damaged by my 04:57 copy) recorded after the 04:58:49 restart. Run ONLY with the tracker stopped. argv: live path, volume path, cutoff ts.
// Per table: first live rowid whose time column >= cutoff (binary search on rowid — append-only tables), then rows from there; inserted into the volume DB:
// tables with a declared primary key → INSERT OR REPLACE (newest wins); others → plain INSERT without rowid. Tables without a time column are reported, not merged.
import Database from "better-sqlite3";
const [LIVE, VOL, CUT] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const live = new Database(LIVE, { readonly: true, fileMustExist: true }), vol = new Database(VOL, { fileMustExist: true });
vol.pragma("busy_timeout = 10000");
const TCOLS = ["ts", "cutoff_ts", "create_ts", "first_ts", "entry_ts", "added_ts", "found_ts", "ts_first", "seen_ts", "until"];
const tables = vol.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((x) => x.name);
let total = 0;
for (const t of tables) {
  try {
    const vi = vol.prepare(`PRAGMA table_info(${t})`).all(), li = live.prepare(`PRAGMA table_info(${t})`).all();
    if (!li.length) { console.log(`[repair] ${t}: not in live DB`); continue; }
    const tc = TCOLS.find((c) => vi.some((x) => x.name === c)); if (!tc) { console.log(`[repair] ${t}: no time column — not merged`); continue; }
    const maxR = live.prepare(`SELECT MAX(rowid) r FROM ${t}`).get().r; if (!maxR) { console.log(`[repair] ${t}: empty`); continue; }
    const at = (r) => { const x = live.prepare(`SELECT rowid AS r, ${tc} AS v FROM ${t} WHERE rowid >= ? ORDER BY rowid LIMIT 1`).get(r); return x; };
    let lo = 1, hi = maxR; while (lo < hi) { const mid = Math.floor((lo + hi) / 2), x = at(mid); if (!x || Number(x.v) >= CUT) hi = mid; else lo = mid + 1; }
    // v2 (08:10): STREAMED (the v1 .all() ran out of memory on trades); rows already present are skipped (idempotent re-run, no duplicates)
    const cols = vi.map((x) => x.name).filter((c) => li.some((y) => y.name === c)), hasPk = vi.some((x) => x.pk > 0), intPk = vi.filter((x) => x.pk > 0).length === 1 && /INT/i.test(vi.find((x) => x.pk > 0).type);
    const useCols = intPk ? cols.filter((c) => c !== vi.find((x) => x.pk > 0).name) : cols;
    const st = vol.prepare(`INSERT ${hasPk && !intPk ? "OR REPLACE " : ""}INTO ${t} (${useCols.join(",")}) VALUES (${useCols.map(() => "?").join(",")})`);
    const ex = hasPk && !intPk ? null : vol.prepare(`SELECT 1 FROM ${t} WHERE ${useCols.map((c) => `${c} IS ?`).join(" AND ")} LIMIT 1`);
    const tx = vol.transaction((rs) => { let n = 0; for (const r of rs) { const v = useCols.map((c) => r[c]); if (ex && ex.get(...v)) continue; n += st.run(...v).changes; } return n; });
    let n = 0, seen = 0, batch = [];
    for (const r of live.prepare(`SELECT * FROM ${t} WHERE rowid >= ? AND ${tc} >= ?`).iterate(lo, CUT)) { batch.push(r); seen++; if (batch.length >= 5000) { n += tx(batch); batch = []; } }
    if (batch.length) n += tx(batch); total += n; const rows = { length: seen };
    console.log(`[repair] ${t}: ${rows.length} live rows since cutoff (${tc}), inserted ${n}`);
  } catch (e) { console.log(`[repair] ${t}: ERROR ${e.message}`); }
}
console.log(`[repair] total inserted ${total}; checkpoint`, JSON.stringify(vol.pragma("wal_checkpoint(TRUNCATE)"))); vol.close(); console.log("[repair] merge done");
