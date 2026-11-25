// warm.mjs — WARM RESTART: the price memory survives a planned stop (owner's decision, 22 Nov 2026).
// On SIGINT/SIGTERM every observed coin's Series (exact observations, minute bars, anchors, coverage marks) and its in-memory
// signal state (age-group references, notes already logged, a SECOND-WAVE setup, the RUG peak / armed setup) are written to one
// file. The next start reads it back IF it is recent (spec WARM_MAX_GAP_S) and complete; otherwise the start is cold, as before.
//   - nothing is rounded, summarised or rebuilt: what is read back is exactly what was in memory at the stop
//   - the time away is NOT observed. It stays in the coverage as a gap; Coverage.up() marks it "warm" (tolerated by hour-scale
//     windows, recorded on every decision that spans it) only if observation resumes within WARM_MAX_GAP_S of the stop
//   - exact windows and fresh crossings never span it (Series.continuous is unchanged)
//   - a crash writes no file → cold start. The file is used once: after reading it is renamed (never read by a later start)
//   - a file that is cut short, older than the limit, from the future, or of another format is ignored → cold start
// No key or secret is read or written here. The file holds prices, volumes and buyer wallet addresses already in memory.
import { openSync, writeSync, closeSync, renameSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { Series } from "./series.mjs";
import { WARM_MAX_GAP_S, SPEC_VER } from "./spec.mjs";

const FORMAT = 1;
// EVERY gap is kept, however old (eighth review, C1): state can depend on observation from hours or days back (a RUG peak has
// no time limit), and a gap that is dropped would make a broken stretch look unbroken. They are a few numbers each.
const covOut = (c) => ({ gaps: c.gaps, upSince: c.upSince, down_since: c.down ? c.lastDown : null });

/** write the snapshot (synchronously: the process is stopping). Returns { coins, bytes, ms }. */
export function saveWarm(file, engine, t = Date.now() / 1000) {
  const t0 = Date.now(), tmp = file + ".tmp", fd = openSync(tmp, "w"); let n = 0, bytes = 0;
  const line = (o) => { const s = JSON.stringify(o) + "\n"; bytes += s.length; writeSync(fd, s); };
  try {
    line({ warm: FORMAT, t, spec: SPEC_VER, cov: covOut(engine.cov), pollCov: covOut(engine.pollCov) });
    for (const [mint, c] of engine.coins) { const sr = c.series; if (sr.lastT === null && !sr.bf.size) continue; // never observed: nothing to keep
      const groups = {}; for (const [ag, g] of Object.entries(c.groups || {})) groups[ag] = { ref: g.ref ?? null, done: g.done || {}, logged: g.logged || {} };
      // carried state is saved only while its own provenance holds AT THE STOP: a RUG peak / setup that is no longer steady up to
      // now, or a SECOND-WAVE setup whose exact coverage has broken, is not written (it would be dropped at the next trade anyway)
      const rug = c.rug?.pk && sr.steady(c.rug.pk.t, t) ? c.rug : null, sw = c.sw && sr.covered(c.sw.seedT, t, true) ? c.sw : null;
      line({ m: mint, mode: c.mode, pool: c.pool ?? null, createTs: c.createTs ?? null, supply: c.supply ?? null, lostAt: c.lostAt ?? null, sw, rug, groups, s: sr.dump() }); n++; }
    line({ end: true, coins: n });
  } finally { closeSync(fd); }
  renameSync(tmp, file); // atomic: a file that exists is complete
  return { coins: n, bytes, ms: Date.now() - t0 };
}

/** read the snapshot back into a restored engine. Call AFTER store.restore (coins, modes and one-buy flags come from the
 *  database and win) and BEFORE engine.restartGap / the feed. Returns { loaded, why?, coins, skipped, age_s, stopped_at }. */
/** `fresh` (older-11): the snapshot was written by ANOTHER run's database and is carried into a new one (main.mjs,
 *  OLDER_WARM_FROM). Only what was OBSERVED comes across — prices, bars, coverage, the watched peaks and setups. What the other
 *  run had DECIDED does not: its one-buy marks and its already-logged notes stay behind, so the new run's first buy of a coin is
 *  a first buy and its refusals are logged from the start. */
export function loadWarm(file, engine, now = Date.now() / 1000, { fresh = false } = {}) {
  if (!existsSync(file)) return { loaded: false, why: "no snapshot (first start, or the last stop was not a planned one)" };
  let lines; try { lines = readFileSync(file, "utf8").split("\n").filter(Boolean); } catch (e) { return { loaded: false, why: "snapshot unreadable: " + e.message }; }
  const used = () => { try { renameSync(file, file + ".used"); } catch { try { unlinkSync(file); } catch {} } }; // one use only, whatever happens next
  let h, end; try { h = JSON.parse(lines[0]); end = JSON.parse(lines[lines.length - 1]); } catch { used(); return { loaded: false, why: "snapshot damaged" }; }
  if (h?.warm !== FORMAT) { used(); return { loaded: false, why: "snapshot of another format" }; }
  if (!end?.end || end.coins !== lines.length - 2) { used(); return { loaded: false, why: "snapshot incomplete" }; }
  const age = now - h.t; used();
  if (!(age >= 0)) return { loaded: false, why: "snapshot from the future (clock changed)" };
  if (age > WARM_MAX_GAP_S) return { loaded: false, why: `snapshot is ${Math.round(age)} s old (limit ${WARM_MAX_GAP_S} s)`, age_s: Math.round(age) };
  const rows = []; try { for (let i = 1; i < lines.length - 1; i++) rows.push(JSON.parse(lines[i])); } catch { return { loaded: false, why: "snapshot damaged" }; } // parsed in full before anything is applied
  // coverage: the earlier gaps come back as they were; the stop itself is closed by the next up() — "warm" only if it is short
  // An outage that was ALREADY under way at the stop is an ordinary outage up to the stop — its cause had nothing to do with the
  // restart and it is never forgiven (eighth review, C2). Only the stretch from the stop itself can become a warm gap.
  const back = (cov, s) => { cov.gaps = (s?.gaps || []).map((g) => g.slice()); cov.upSince = s?.upSince ?? null; if (s?.down_since != null && s.down_since < h.t) cov.gaps.push([s.down_since, h.t]); cov.resume(h.t); };
  back(engine.cov, h.cov); back(engine.pollCov, h.pollCov); // sampling: the same rule, closed by the first price reply
  let n = 0, skipped = 0; const curM = Math.floor(now / 60);
  for (const d of rows) {
    const had = engine.coins.has(d.m), c = engine.coin(d.m, { pool: d.pool, createTs: d.createTs, mode: d.mode });
    if (c.mode !== d.mode) { skipped++; continue; } // the database (and an unfinished entry's method) decides how a coin is observed: no mixed evidence
    c.series = Series.load(d.m, d.mode === "polled" ? engine.pollCov : engine.cov, d.s); c.warm = true;
    if (d.supply) c.supply = d.supply; c.lostAt = d.lostAt ?? null; c.sw = d.sw ?? null; c.rug = d.rug ?? null;
    if (!fresh) for (const [ag, g] of Object.entries(d.groups || {})) { const x = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); x.ref = g.ref ?? x.ref; Object.assign(x.done, g.done || {}); Object.assign(x.logged, g.logged || {}); } // one-buy flags: the database's and the snapshot's together
    for (const m of c.series.bars.keys()) if (m >= curM - 1) (engine.dirtyBars.get(d.m) || engine.dirtyBars.set(d.m, new Set()).get(d.m)).add(m); // the stop minute's bar is still to be saved
    if (!had) engine.stats.warmNewCoins = (engine.stats.warmNewCoins || 0) + 1;
    n++;
  }
  engine.stats.warm = { coins: n, skipped, stopped_at: h.t, age_s: +age.toFixed(1), from_spec: h.spec ?? null, carried_from_another_run: fresh || undefined };
  return { loaded: true, coins: n, skipped, age_s: +age.toFixed(1), stopped_at: h.t };
}
