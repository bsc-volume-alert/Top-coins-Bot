// store.mjs — the project's own SQLite database (separate from the old tracker.db). Compact by design:
// minute bars (retained BAR_RETAIN_DAYS), decisions/rejections, entries with their exits, feed events. No raw trade copy.
import Database from "better-sqlite3";
import { statSync, statfsSync } from "node:fs";
import { dirname } from "node:path";
import { BAR_RETAIN_DAYS, SPEC_VER, FAMILIES, STOPS, CLOCK, FEE_BOOK } from "./spec.mjs";
import { setNextId, entryDone } from "./book.mjs";

export class Store {
  constructor(path) {
    this.path = path; const db = (this.db = new Database(path)); db.pragma("journal_mode = WAL"); db.pragma("synchronous = NORMAL"); db.pragma("busy_timeout = 5000");
    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS coins (mint TEXT PRIMARY KEY, pool TEXT, create_ts INTEGER, create_src TEXT, pump_origin TEXT, first_seen INTEGER, last_px REAL, last_t REAL, info TEXT);
      CREATE TABLE IF NOT EXISTS bars (mint TEXT, m INTEGER, o REAL, h REAL, l REAL, c REAL, v REAL, nb INTEGER, ns INTEGER, buyers INTEGER, src TEXT, PRIMARY KEY (mint, m)) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS bars_m ON bars(m);
      CREATE TABLE IF NOT EXISTS decisions (mint TEXT, ag TEXT, family TEXT, t REAL, entry_id INTEGER, detail TEXT, PRIMARY KEY (mint, ag, family)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, mint TEXT, ag TEXT, family TEXT, t REAL, reason TEXT, detail TEXT);
      CREATE INDEX IF NOT EXISTS notes_f ON notes(family, reason);
      CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, mint TEXT, status TEXT, done INTEGER DEFAULT 0, decision_t REAL, json TEXT);
      CREATE TABLE IF NOT EXISTS pools (pool TEXT PRIMARY KEY, mint TEXT, quote TEXT, creator TEXT) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS feed (id INTEGER PRIMARY KEY, t REAL, ev TEXT, detail TEXT);`);
    db.prepare("INSERT OR IGNORE INTO meta VALUES ('spec', ?)").run(SPEC_VER);
    this.q = {
      bar: db.prepare("INSERT OR REPLACE INTO bars VALUES (?,?,?,?,?,?,?,?,?,?,?)"),
      barBf: db.prepare("INSERT INTO bars VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(mint, m) DO UPDATE SET o=excluded.o, h=excluded.h, l=excluded.l, c=excluded.c, v=excluded.v, nb=excluded.nb, ns=excluded.ns, buyers=excluded.buyers, src=excluded.src WHERE bars.src <> 'live'"),
      dec: db.prepare("INSERT OR IGNORE INTO decisions VALUES (?,?,?,?,?,?)"),
      note: db.prepare("INSERT INTO notes (mint, ag, family, t, reason, detail) VALUES (?,?,?,?,?,?)"),
      ent: db.prepare("INSERT OR REPLACE INTO entries (id, mint, status, done, decision_t, json) VALUES (?,?,?,?,?,?)"),
      feed: db.prepare("INSERT INTO feed (t, ev, detail) VALUES (?,?,?)"),
      coin: db.prepare("INSERT INTO coins (mint, pool, create_ts, create_src, pump_origin, first_seen, info) VALUES (?,?,?,?,?,?,?) ON CONFLICT(mint) DO UPDATE SET pool=COALESCE(coins.pool, excluded.pool), create_ts=COALESCE(coins.create_ts, excluded.create_ts), create_src=COALESCE(coins.create_src, excluded.create_src), pump_origin=COALESCE(coins.pump_origin, excluded.pump_origin), info=COALESCE(excluded.info, coins.info)"),
      last: db.prepare("UPDATE coins SET last_px=?, last_t=? WHERE mint=?"),
      mode: db.prepare("UPDATE coins SET pool=COALESCE(?, pool), info=? WHERE mint=?"),
    };
    this.tx = db.transaction((fn) => fn());
  }
  saveBar(mint, m, b) { this.q.bar.run(mint, m, b.o, b.h, b.l, b.c, b.v, b.nb, b.ns, b.nbuyers ?? b.buyers?.size ?? 0, b.bf ? "backfill" : "live"); }
  /** AUDIT copy of a back-filled bar with its acceptance label ('backfill' = accepted into decision history, 'backfill-rejected' =
   *  returned by the provider but NOT used). It never overwrites a live row. Nothing reads these rows back into decisions. */
  saveBackfillBar(mint, m, b, accepted) { this.q.barBf.run(mint, m, b.o, b.h, b.l, b.c, b.v || 0, b.nb || 0, b.ns || 0, 0, accepted ? "backfill" : "backfill-rejected"); }
  saveDecision(mint, ag, family, t, entryId, detail) { this.q.dec.run(mint, ag, family, t, entryId, JSON.stringify(detail ?? null)); }
  /** older-11: a buy cancelled for want of a provider reading does not use up the book's one buy (engine._giveBack): its marks go */
  dropDecisions(entryId) { return this.db.prepare("DELETE FROM decisions WHERE entry_id = ?").run(entryId).changes; }
  saveNote(mint, n) { this.q.note.run(mint, n.ag, n.family, n.t, n.reason, JSON.stringify(n.detail ?? null)); if (n.family === "SLOW-BUILD" || n.family === "LOW4H-LIQ25K" || (n.family === "SECOND-WAVE" && n.reason !== "window not covered")) this.q.dec.run(mint, n.ag, n.family, n.t, null, JSON.stringify({ rejected: n.reason, ...n.detail })); }
  saveEntry(e) { const done = e.status === "cancelled" || (e.status === "filled" && e.versions.every((v) => v.status === "closed") && e.runner.horizonDone && entryDone(e)) ? 1 : 0; /* entryDone: also not while the owner's own sale of the buy is still open */ this.q.ent.run(e.id, e.mint, e.status, done, e.decisionT, JSON.stringify(e)); }
  /** `pumpOrigin` column = launchpad/origin label; `info` = the launchpad-neutral record (venues, token program, sources, mode, risk…) */
  saveCoin(mint, { pool = null, createTs = null, createSrc = null, pumpOrigin = null, firstSeen = null, info = null } = {}) { this.q.coin.run(mint, pool, createTs, createSrc, pumpOrigin, firstSeen, info ? JSON.stringify(info) : null); }
  /** a coin changed observation method (sampled → live): pool and record are overwritten, not merged */
  setCoinMode(mint, pool, info) { this.q.mode.run(pool ?? null, JSON.stringify(info ?? {}), mint); }
  savePool(pool, i) { this.db.prepare("INSERT OR IGNORE INTO pools VALUES (?,?,?,?)").run(pool, i.mint, i.quote, i.creator ?? null); }
  /** quote: only pools quoted in this token (the feed loads SOL-quoted pools only — any other pool is not ours and is kept out of memory) */
  loadPools(quote = null) { const m = new Map(), q = quote ? this.db.prepare("SELECT pool, mint, quote, creator FROM pools WHERE quote = ?").iterate(quote) : this.db.prepare("SELECT pool, mint, quote, creator FROM pools").iterate(); for (const r of q) m.set(r.pool, { mint: r.mint, quote: r.quote, creator: r.creator }); return m; }
  saveLast(mint, c) { this.q.last.run(c.series.lastPx, c.series.lastT, mint); }
  feedEvent(t, ev, detail = "") { this.q.feed.run(t, ev, String(detail).slice(0, 300)); }
  /** restart: reload the one-entry flags, unfinished entries and known coins into an engine */
  restore(engine) {
    // 1) coins with their identity and OBSERVATION MODE first — a sampled coin must come back as sampled, or its positions
    //    would be stranded without quotes (and the live adapter would wrongly claim it)
    for (const r of this.db.prepare("SELECT mint, pool, create_ts, info FROM coins").iterate()) { const info = r.info ? JSON.parse(r.info) : null; engine.coin(r.mint, { pool: r.pool, createTs: r.create_ts, info, mode: info?.monitoring_mode === "polled" ? "polled" : null }); }
    // 2) one-entry flags. First RECONCILE: every stored entry must have its flags (an entry written by a version that did not
    //    commit the two together, or carried in by a migration, may lack them) — otherwise the same book could buy the coin again.
    this.tx(() => { for (const r of this.db.prepare("SELECT id, json FROM entries").all()) { const e = JSON.parse(r.json); if (e.attempt_returned) continue; /* its marks were taken back on purpose (no provider reading) */ for (const f of e.families || []) this.q.dec.run(e.mint, e.ag, f, e.decisionT, e.id, JSON.stringify((e.cands || []).find((c) => c.family === f)?.detail ?? null)); } });
    for (const r of this.db.prepare("SELECT mint, ag, family FROM decisions").iterate()) engine.restoreDone(r.mint, r.ag, r.family);
    // 3) unfinished entries (pending, open, or with a sale still waiting for a price)
    const maxId = this.db.prepare("SELECT MAX(id) m FROM entries").get().m || 0;
    for (const r of this.db.prepare("SELECT id, json FROM entries WHERE done = 0 ORDER BY id").all()) { // .all(): corrections below write to the database
      const e = JSON.parse(r.json), want = e.exec === "routed-quote" ? "polled" : "live", c = engine.coin(e.mint);
      // 4) the entry's own execution method decides how its coin is observed (see engine.forceMode). Two unfinished entries of
      //    different methods on one coin cannot both be served: the first keeps the coin, the other is flagged, never hidden.
      if (c.mode !== want) { if (engine.byMint.get(e.mint)?.size) { const f = "observation-method conflict after restart: this position cannot be priced by the coin's current method"; if (!e.flags.includes(f)) e.flags.push(f); }
        else if (engine.forceMode(e.mint, want, e.pool)) { this.setCoinMode(e.mint, e.pool ?? null, c.info); this.feedEvent(Date.now() / 1000, "restore: coin mode corrected", `${e.mint} → ${want} (entry ${e.id})`); } }
      engine.addEntry(e); }
    setNextId(maxId + 1);
  }
  /** the project's first-ever start (for the 24 h "startup" tag); set once */
  firstStart(now) { this.db.prepare("INSERT OR IGNORE INTO meta VALUES ('first_start', ?)").run(String(now)); return Number(this.db.prepare("SELECT v FROM meta WHERE k='first_start'").get().v); }
  /** WHEN EACH BOOK AND EACH STOP BEGAN COUNTING on this database (display only). Books and stops added after the first start
   *  have no earlier trades, so their totals cover a shorter period — the page shows the start next to each.
   *  Set once per book / stop and then kept. A book's start is the earliest time it was evaluated on this database: its first
   *  recorded refusal or decision (a book writes refusals from its first minute), never earlier than the first start; a book
   *  with nothing on record yet starts now. A stop's start is the first buy that carries it; a stop every buy carries started
   *  with the database. */
  since(now) {
    if (this._since) return this._since;
    const get = (k) => { const r = this.db.prepare("SELECT v FROM meta WHERE k=?").get(k); return r ? Number(r.v) : null; }, put = (k, v) => this.db.prepare("INSERT OR IGNORE INTO meta VALUES (?, ?)").run(k, String(v));
    const first = get("first_start") ?? now, families = {}, stops = {};
    for (const f of FAMILIES) { if (CLOCK[f] && families[CLOCK[f].base] != null) { families[f] = families[CLOCK[f].base]; continue; } // a clock book shares its base book's buys: same start
      let t = get("since:" + f);
      if (t === null) { const a = this.db.prepare("SELECT MIN(t) t FROM notes WHERE family=?").get(f)?.t, b = this.db.prepare("SELECT MIN(t) t FROM decisions WHERE family=?").get(f)?.t;
        const seen = [a, b].filter((x) => x != null); t = Math.max(first, seen.length ? Math.min(...seen) : now); put("since:" + f, t); }
      families[f] = t; }
    { let t = get("since:" + FEE_BOOK); if (t === null) { t = now; put("since:" + FEE_BOOK, t); } families[FEE_BOOK] = t; } // fee coins are bought only from the first start with that rule
    let all = null;
    for (const s of STOPS) { let t = get("since:stop:" + s);
      if (t === null) { all ??= this.allEntries(); const has = all.filter((e) => (e.versions || []).some((v) => v.stop === s)), lacks = all.some((e) => !(e.versions || []).some((v) => v.stop === s));
        t = !lacks ? first : has.length ? Math.min(...has.map((e) => e.decisionT)) : now; put("since:stop:" + s, t); }
      stops[s] = t; }
    return (this._since = { first, families, stops });
  }
  heartbeat(t) { this.db.prepare("INSERT OR REPLACE INTO meta VALUES ('alive', ?)").run(String(t)); }
  /** the time the previous run was last known alive: the restart gap starts there (null on a first run) */
  lastAlive() { const r = this.db.prepare("SELECT v FROM meta WHERE k='alive'").get(); return r ? Number(r.v) : null; }
  allEntries() { return this.db.prepare("SELECT json FROM entries").all().map((r) => JSON.parse(r.json)); }
  noteCounts() { return this.db.prepare("SELECT family, reason, COUNT(*) n FROM notes GROUP BY family, reason ORDER BY family, n DESC").all(); }
  retention(now) { const cut = Math.floor(now / 60) - BAR_RETAIN_DAYS * 1440; return this.db.prepare("DELETE FROM bars WHERE m < ?").run(cut).changes; }
  disk() {
    let db = 0, wal = 0; try { db = statSync(this.path).size; } catch {} try { wal = statSync(this.path + "-wal").size; } catch {}
    let freeGb = null; try { const s = statfsSync(dirname(this.path)); freeGb = +((s.bavail * s.bsize) / 2 ** 30).toFixed(2); } catch {}
    const n = (sql) => { try { return this.db.prepare(sql).get().n; } catch { return null; } };
    return { db_mb: +(db / 2 ** 20).toFixed(1), wal_mb: +(wal / 2 ** 20).toFixed(1), free_gb: freeGb, bars: n("SELECT COUNT(*) n FROM bars"), coins: n("SELECT COUNT(*) n FROM coins"), notes: n("SELECT COUNT(*) n FROM notes"), entries: n("SELECT COUNT(*) n FROM entries") };
  }
}
