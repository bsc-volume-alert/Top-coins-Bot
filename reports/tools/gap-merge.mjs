// gap-merge.mjs — 10 Nov 2026 (my 04:57 revert copied tracker.db without its un-checkpointed WAL: rows written 04:21–04:57 UTC may be missing from the
// live DB; the volume copy + its WAL still has them). Mode "compare" (read-only): per table, rows in the window in each DB. Mode "merge": inserts into the
// live DB ONLY rows that are absent there (tokens/token_life/token_cp_clock by primary key; trades/feed_gaps by full fingerprint), in small transactions.
import Database from "better-sqlite3";
const MODE = process.argv[2], V = process.argv[3], A = 1794284400, B = 1794286622 + 5; // window 04:20:00 → 04:57:07 UTC
const live = new Database("/root/tracker/data/tracker.db", MODE === "merge" ? {} : { readonly: true }); live.pragma("busy_timeout = 15000");
const vol = new Database(V, { readonly: true, fileMustExist: true });
const T = [["tokens", "create_ts"], ["trades", "ts"], ["token_life", "ts"], ["token_cp_clock", "cutoff_ts"], ["feed_gaps", "ts"], ["sol_px", "ts"]];
for (const [t, c] of T) { try { const a = live.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${c} BETWEEN ? AND ?`).get(A, B).n, b = vol.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${c} BETWEEN ? AND ?`).get(A, B).n; console.log(`[gap] ${t}: live ${a} · volume ${b}`); } catch (e) { console.log(`[gap] ${t}: ${e.message}`); } }
if (MODE === "merge") {
  const cols = (t) => vol.prepare(`PRAGMA table_info(${t})`).all().map((x) => x.name);
  const ins = (t, how) => { const cs = cols(t).filter((c) => live.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c)); return [live.prepare(`INSERT ${how} INTO ${t} (${cs.join(",")}) VALUES (${cs.map(() => "?").join(",")})`), cs]; };
  const merge = (t, c, how, exists) => { const [st, cs] = ins(t, how); let n = 0, k = 0; const rows = vol.prepare(`SELECT * FROM ${t} WHERE ${c} BETWEEN ? AND ?`).all(A, B);
    const tx = live.transaction((batch) => { for (const r of batch) { if (exists && exists(r)) continue; n += st.run(...cs.map((x) => r[x])).changes; } });
    for (let i = 0; i < rows.length; i += 2000) tx(rows.slice(i, i + 2000)); console.log(`[gap] merged ${t}: +${n} of ${rows.length}`); };
  merge("tokens", "create_ts", "OR IGNORE"); merge("token_life", "ts", "OR IGNORE"); try { merge("token_cp_clock", "cutoff_ts", "OR IGNORE"); } catch (e) { console.log("[gap] cp_clock", e.message); }
  merge("sol_px", "ts", "OR IGNORE");
  const ex = live.prepare("SELECT 1 FROM trades WHERE mint=? AND slot=? AND sig=? AND COALESCE(ev_idx,-1)=COALESCE(?,-1) AND is_buy=? AND sol=? AND tokens=? LIMIT 1");
  merge("trades", "ts", "", (r) => !!ex.get(r.mint, r.slot, r.sig, r.ev_idx, r.is_buy, r.sol, r.tokens));
  const eg = live.prepare("SELECT 1 FROM feed_gaps WHERE ts=? AND event=? AND detail=? LIMIT 1");
  merge("feed_gaps", "ts", "", (r) => !!eg.get(r.ts, r.event, r.detail));
  for (const [t, c] of T) { try { console.log(`[gap] after: ${t} live ${live.prepare(`SELECT COUNT(*) n FROM ${t} WHERE ${c} BETWEEN ? AND ?`).get(A, B).n}`); } catch {} }
}
console.log("[gap] done");
