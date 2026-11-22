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
import { WARM_MAX_GAP_S, BAR_KEEP_S, SPEC_VER } from "./spec.mjs";

const FORMAT = 1;
const covOut = (c, keepFrom) => ({ gaps: c.gaps.filter((g) => g[1] >= keepFrom), upSince: c.upSince, down_since: c.down ? c.lastDown : null });

/** write the snapshot (synchronously: the process is stopping). Returns { coins, bytes, ms }. */
export function saveWarm(file, engine, t = Date.now() / 1000) {
  const t0 = Date.now(), tmp = file + ".tmp", fd = openSync(tmp, "w"); let n = 0, bytes = 0;
  const line = (o) => { const s = JSON.stringify(o) + "\n"; bytes += s.length; writeSync(fd, s); };
  try {
    line({ warm: FORMAT, t, spec: SPEC_VER, cov: covOut(engine.cov, t - BAR_KEEP_S - 3600), pollCov: covOut(engine.pollCov, t - BAR_KEEP_S - 3600) });
    for (const [mint, c] of engine.coins) { const sr = c.series; if (sr.lastT === null && !sr.bf.size) continue; // never observed: nothing to keep
      const groups = {}; for (const [ag, g] of Object.entries(c.groups || {})) groups[ag] = { ref: g.ref ?? null, done: g.done || {}, logged: g.logged || {} };
      line({ m: mint, mode: c.mode, pool: c.pool ?? null, createTs: c.createTs ?? null, supply: c.supply ?? null, lostAt: c.lostAt ?? null, sw: c.sw ?? null, rug: c.rug ?? null, groups, s: sr.dump() }); n++; }
    line({ end: true, coins: n });
  } finally { closeSync(fd); }
  renameSync(tmp, file); // atomic: a file that exists is complete
  return { coins: n, bytes, ms: Date.now() - t0 };
}

/** read the snapshot back into a restored engine. Call AFTER store.restore (coins, modes and one-buy flags come from the
 *  database and win) and BEFORE engine.restartGap / the feed. Returns { loaded, why?, coins, skipped, age_s, stopped_at }. */
export function loadWarm(file, engine, now = Date.now() / 1000) {
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
  engine.cov.gaps = h.cov.gaps || []; engine.cov.upSince = h.cov.upSince ?? null; engine.cov.resume(h.cov.down_since ?? h.t);
  engine.pollCov.gaps = h.pollCov?.gaps || []; engine.pollCov.upSince = h.pollCov?.upSince ?? null; engine.pollCov.resume(h.pollCov?.down_since ?? h.t); // sampling: the same rule, closed by the first price reply
  let n = 0, skipped = 0; const curM = Math.floor(now / 60);
  for (const d of rows) {
    const had = engine.coins.has(d.m), c = engine.coin(d.m, { pool: d.pool, createTs: d.createTs, mode: d.mode });
    if (c.mode !== d.mode) { skipped++; continue; } // the database (and an unfinished entry's method) decides how a coin is observed: no mixed evidence
    c.series = Series.load(d.m, d.mode === "polled" ? engine.pollCov : engine.cov, d.s); c.warm = true;
    if (d.supply) c.supply = d.supply; c.lostAt = d.lostAt ?? null; c.sw = d.sw ?? null; c.rug = d.rug ?? null;
    for (const [ag, g] of Object.entries(d.groups || {})) { const x = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); x.ref = g.ref ?? x.ref; Object.assign(x.done, g.done || {}); Object.assign(x.logged, g.logged || {}); } // one-buy flags: the database's and the snapshot's together
    for (const m of c.series.bars.keys()) if (m >= curM - 1) (engine.dirtyBars.get(d.m) || engine.dirtyBars.set(d.m, new Set()).get(d.m)).add(m); // the stop minute's bar is still to be saved
    if (!had) engine.stats.warmNewCoins = (engine.stats.warmNewCoins || 0) + 1;
    n++;
  }
  engine.stats.warm = { coins: n, skipped, stopped_at: h.t, age_s: +age.toFixed(1), from_spec: h.spec ?? null };
  return { loaded: true, coins: n, skipped, age_s: +age.toFixed(1), stopped_at: h.t };
}
