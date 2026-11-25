// seed-db.mjs — older-11: prepare the database of a NEW run from the database of the previous one.
//   node scripts/seed-db.mjs <previous.db> <new.db> [--live-only]
// The previous database is opened READ-ONLY and is not changed in any way. Copied into the new one: what is known about each
// COIN'S IDENTITY (its pool, its creation time and where that came from, its token program / transfer-fee reading) and the
// list of pools, plus the date of the last daily pool inventory — so the new run does not have to ask the providers again for
// tens of thousands of creation times (it could not buy a coin until it knew its age).
// NOT copied: buys, sales, one-buy marks, refusals, minute bars, feed events, "counting since" dates, the first-start date.
// The new run starts with no trades and no history of decisions. --live-only leaves out coins that were watched by sampling.
// Safe to repeat: if the new database already holds coins it is left alone. No key or secret is read or written.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { Store } from "../src/store.mjs";

export function seed(prevPath, newPath, { liveOnly = false } = {}) {
  if (!existsSync(prevPath)) throw new Error(`previous database not found: ${prevPath}`);
  if (prevPath === newPath) throw new Error("the new database must be a different file");
  const st = new Store(newPath), db = st.db, n = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
  try {
    if (n("entries") > 0) return { seeded: false, why: `the new database already holds ${n("entries")} buys — left alone` };
    if (n("coins") > 0) return { seeded: false, why: `the new database already holds ${n("coins")} coins — left alone` };
    const prev = new Database(prevPath, { readonly: true, fileMustExist: true }); let coins = 0, skipped = 0, pools = 0;
    try {
      const insC = db.prepare("INSERT OR IGNORE INTO coins (mint, pool, create_ts, create_src, pump_origin, first_seen, info) VALUES (?,?,?,?,?,?,?)"), insP = db.prepare("INSERT OR IGNORE INTO pools VALUES (?,?,?,?)");
      db.transaction(() => {
        for (const r of prev.prepare("SELECT mint, pool, create_ts, create_src, pump_origin, first_seen, info FROM coins").iterate()) {
          if (liveOnly && r.info && /"monitoring_mode":"polled"/.test(r.info)) { skipped++; continue; }
          insC.run(r.mint, r.pool, r.create_ts, r.create_src, r.pump_origin, r.first_seen, r.info); coins++; }
        for (const r of prev.prepare("SELECT pool, mint, quote, creator FROM pools").iterate()) { insP.run(r.pool, r.mint, r.quote, r.creator); pools++; }
        const inv = prev.prepare("SELECT v FROM meta WHERE k='inventory'").get(); if (inv) db.prepare("INSERT OR REPLACE INTO meta VALUES ('inventory', ?)").run(inv.v);
        db.prepare("INSERT OR REPLACE INTO meta VALUES ('seeded_from', ?)").run(JSON.stringify({ from: prevPath, at: new Date().toISOString(), coins, pools, live_only: liveOnly }));
      })();
    } finally { prev.close(); }
    return { seeded: true, coins, skipped_sampled: skipped, pools, entries: n("entries"), decisions: n("decisions"), bars: n("bars") };
  } finally { db.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [prev, next, ...rest] = process.argv.slice(2);
  if (!prev || !next) { console.error("usage: node scripts/seed-db.mjs <previous.db> <new.db> [--live-only]"); process.exit(2); }
  try { const r = seed(prev, next, { liveOnly: rest.includes("--live-only") }); console.log(r.seeded ? `new database prepared: ${r.coins} coins and ${r.pools} pools known (no buys, no decisions, no bars)${r.skipped_sampled ? `; ${r.skipped_sampled} sampled coins left out` : ""}` : `not prepared: ${r.why}`); }
  catch (e) { console.error("seed failed: " + e.message); process.exit(1); }
}
