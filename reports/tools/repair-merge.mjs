// repair-merge.mjs — 10 Nov 2026. Copies into a sound tracker DB (TARGET) every row that a damaged tracker DB (SOURCE) recorded at/after a cutoff time.
// v1 (07:52) used .all() and ran out of memory. v3 (08:30): streamed in rowid chunks of 2,000; a chunk that hits a damaged page is split in halves down
// to single rows, so only unreadable rows are skipped (counted); rows already in TARGET are skipped (safe to re-run); tables with a declared text primary
// key use INSERT OR IGNORE (TARGET's newer row wins). Safe to run while the tracker writes TARGET (short transactions; better-sqlite3 waits up to 5 s).
// argv: source (damaged) path, target path, cutoff ts.
import Database from "better-sqlite3";
const [SRC, DST, CUT] = [process.argv[2], process.argv[3], Number(process.argv[4])];
const src = new Database(SRC, { readonly: true, fileMustExist: true }), dst = new Database(DST, { fileMustExist: true, timeout: 20000 });
const TCOLS = ["ts", "cutoff_ts", "create_ts", "first_ts", "entry_ts", "added_ts", "found_ts", "ts_first", "seen_ts", "until"];
const tables = dst.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((x) => x.name);
let total = 0, totalBad = 0;
for (const t of tables) {
  try {
    const vi = dst.prepare(`PRAGMA table_info(${t})`).all(), li = src.prepare(`PRAGMA table_info(${t})`).all();
    if (!li.length) { console.log(`[repair] ${t}: not in source DB`); continue; }
    const tc = TCOLS.find((c) => vi.some((x) => x.name === c) && li.some((x) => x.name === c)); if (!tc) { console.log(`[repair] ${t}: no time column — not merged`); continue; }
    let maxR; try { maxR = src.prepare(`SELECT MAX(rowid) r FROM ${t}`).get().r; } catch (e) { console.log(`[repair] ${t}: max rowid unreadable (${e.message})`); continue; }
    if (!maxR) { console.log(`[repair] ${t}: empty`); continue; }
    const at = (r) => src.prepare(`SELECT rowid AS r, ${tc} AS v FROM ${t} WHERE rowid >= ? ORDER BY rowid LIMIT 1`).get(r);
    let lo = 1, hi = maxR; try { while (lo < hi) { const mid = Math.floor((lo + hi) / 2), x = at(mid); if (!x || Number(x.v) >= CUT) hi = mid; else lo = mid + 1; } } catch (e) { console.log(`[repair] ${t}: search hit damage (${e.message}) — scanning from rowid 1`); lo = 1; }
    const pk = vi.filter((x) => x.pk > 0), intPk = pk.length === 1 && /INT/i.test(pk[0].type);
    const cols = vi.map((x) => x.name).filter((c) => li.some((y) => y.name === c)), useCols = intPk ? cols.filter((c) => c !== pk[0].name) : cols;
    const st = dst.prepare(`INSERT ${pk.length && !intPk ? "OR IGNORE " : ""}INTO ${t} (${useCols.join(",")}) VALUES (${useCols.map(() => "?").join(",")})`);
    const ex = pk.length && !intPk ? null : dst.prepare(`SELECT 1 FROM ${t} WHERE ${useCols.map((c) => `${c} IS ?`).join(" AND ")} LIMIT 1`);
    const tx = dst.transaction((rs) => { let n = 0; for (const r of rs) { const v = useCols.map((c) => r[c]); if (ex && ex.get(...v)) continue; n += st.run(...v).changes; } return n; });
    const rd = src.prepare(`SELECT * FROM ${t} WHERE rowid BETWEEN ? AND ? AND ${tc} >= ?`);
    let n = 0, seen = 0, bad = 0;
    const take = (a, b) => { try { const rs = rd.all(a, b, CUT); seen += rs.length; if (rs.length) n += tx(rs); } catch (e) { if (!/corrupt|malformed/i.test(e.message)) throw e; if (a === b) { bad++; return; } const m = Math.floor((a + b) / 2); take(a, m); take(m + 1, b); } };
    for (let a = lo; a <= maxR; a += 2000) take(a, Math.min(maxR, a + 1999));
    total += n; totalBad += bad;
    console.log(`[repair] ${t}: ${seen} source rows since cutoff (${tc}), inserted ${n}${bad ? `, ${bad} unreadable rows skipped` : ""}`);
  } catch (e) { console.log(`[repair] ${t}: ERROR ${e.message}`); }
}
console.log(`[repair] total inserted ${total}, unreadable ${totalBad}`); dst.close(); console.log("[repair] merge done");
