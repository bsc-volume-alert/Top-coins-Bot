// backfill.mjs — fills in what a live feed cannot know: token creation time, the history before we started watching (or before
// the pool existed: the bonding-curve period), the age-group reference prices, and feed-outage gaps for coins that matter.
// Source: GMGN (token info + 1-minute USD klines). One queue, paced by the GMGN client; priority: open positions → coins in or
// near the band → the rest. Every outcome is counted; nothing is invented when GMGN has no data (the coin stays not-covered / MISSING).
import * as S from "./spec.mjs";
import { creationTime, minuteBars, gmgnOn } from "./gmgn.mjs";
export const bf = { queued: 0, done: 0, created: 0, noCreation: 0, bars: 0, refsOk: 0, refsMissing: 0, gapsPatched: 0, errors: 0, lastErr: "" };

/** WHICH GAPS TO ASK BACK-FILL FOR (Codex's review of 161d545). `gaps` is the engine's SIGNAL-coverage list (engine.cov.gaps) —
 *  the list every coin's hour-scale windows are checked against — and `seen` how many of its entries were handled before.
 *  It must be THIS list, not the pool-trust list (engine.feedCov.gaps):
 *    - a late spell or a silence is a gap in signal coverage only, so the pool-trust list never contains it;
 *    - since older-10 a reconnect's signal gap ends at the first delay measurement, a little AFTER the pool-trust gap ends, and
 *      a repair recorded for the shorter interval does not cover the gap the window test looks for.
 *  New gaps whose minute ranges touch or overlap are merged into ONE request (one set of minute bars covers them all), so a
 *  flapping stream does not multiply requests. Returns the merged [from, to] intervals and the new `seen`.
 *  Repair is by 1-minute bars and therefore only ever satisfies hour-scale windows: exact windows (FAST, fresh crossings) are
 *  never repaired, and nothing here touches pool-state trust. */
export function gapRequests(gaps, seen = 0) {
  const fresh = gaps.slice(seen).filter((g) => g && g[1] > g[0]).map(([a, b]) => [a, b]).sort((p, q) => p[0] - q[0]), out = [];
  for (const g of fresh) { const last = out[out.length - 1]; if (last && Math.floor(g[0] / 60) * 60 <= Math.ceil(last[1] / 60) * 60) { if (g[1] > last[1]) last[1] = g[1]; } else out.push(g); }
  return { requests: out, seen: gaps.length };
}
export function startBackfill({ engine, store, jup = null, log = console.log, paused = () => false }) { // paused(): older-11 — history repair switched off for now (main.mjs): nothing is asked of GMGN here, the queue is kept
  const q = [], inQ = new Set(), needC = new Set(), askedC = new Set();
  // CREATION TIME IN BULK (measured 20 Nov: GMGN's free plan managed 38 coins in 10 minutes, far too slow for thousands).
  // Jupiter's token search takes 100 mints a call. For a pump.fun coin its "first pool" IS the bonding curve (firstPool.id = the
  // mint), created in the same transaction as the token — so that timestamp is token creation, not a later pool listing.
  // Anything else (no record, another launchpad, a first pool that is not the curve) falls back to GMGN and is labelled.
  async function creationLoop() {
    while (true) {
      await new Promise((r) => setTimeout(r, 500));
      const batch = [...needC].slice(0, 100); if (!batch.length) continue; for (const m of batch) { needC.delete(m); askedC.add(m); }
      let got = []; try { got = await jup.tokens(batch); } catch (e) { bf.errors++; bf.lastErr = "jupiter creation: " + String(e.message).slice(0, 120); for (const m of batch) askedC.delete(m); await new Promise((r) => setTimeout(r, 3000)); continue; }
      const by = new Map(got.map((t) => [t.mint, t]));
      for (const m of batch) { const t = by.get(m), c = engine.coin(m);
        if (t?.symbol && !c.info.symbol) c.info.symbol = t.symbol;
        if (t && t.launchpad === "pump.fun" && t.first_pool?.id === m && t.first_pool.created) { if (!c.createTs) { c.createTs = t.first_pool.created; c.info.create_src = "jupiter firstPool = pump.fun bonding curve (token creation)"; c.info.token_program = t.token_program; c.info.symbol = t.symbol; bf.created++; bf.createdJup = (bf.createdJup || 0) + 1; store?.saveCoin(m, { createTs: c.createTs, createSrc: "jupiter curve" }); } if (t.mcap >= 20000 && t.mcap <= 2e6) wantBars(m, 1); }
        else { bf.jupNoCreation = (bf.jupNoCreation || 0) + 1; wantBars(m, 2); } }
    }
  }
  const wantBars = (mint, prio = 1) => { if (inQ.has(mint)) return; inQ.add(mint); q.push({ mint, prio }); q.sort((a, b) => a.prio - b.prio); bf.queued++; };
  // creation first (bulk, fast); history bars (GMGN, slow) are then queued by the creation loop, in-band coins first
  const want = (mint, prio = 1) => { const c = engine.coin(mint); if (jup && !c.createTs && !askedC.has(mint)) { needC.add(mint); return; } if (prio <= 1 || !jup) wantBars(mint, prio); };
  async function one(mint) {
    const c = engine.coin(mint), now = Date.now() / 1000;
    if (!c.createTs) { const r = await creationTime(mint); if (!r) { bf.noCreation++; store?.saveNote(mint, { ag: null, family: "*", t: now, reason: "creation time unavailable", detail: {} }); return; } c.createTs = r.t; bf.created++; store?.saveCoin(mint, { createTs: r.t, createSrc: r.src }); }
    const sr = c.series, liveFrom = sr.histFrom ?? now;
    // history window needed now: 4 h 15 min (+5 min margin) before the live start, but not before creation
    const from = Math.max(c.createTs, Math.floor(liveFrom - (4 * 3600 + 20 * 60))), to = Math.floor(liveFrom);
    if (to > from) { const bars = await minuteBars(mint, from, to); bf.bars += bars.length; const r = sr.addBars(bars, { from, to }); if (!r.accepted) bf.emptyHistory = (bf.emptyHistory || 0) + 1; for (const b of bars) store?.saveBackfillBar(mint, b.m, b, r.accepted && sr.bf.has(b.m)); }
    // AGE-DOUBLE reference for the coin's current group (and the next one if it starts before live coverage)
    const ag = S.ageGroupOf(now - c.createTs);
    if (ag) {
      const b0 = c.createTs + S.ageStartOf(ag);
      if (!sr.covered(b0 - 60, b0)) {
        const bars = await minuteBars(mint, Math.floor(b0 - 3 * 3600), Math.floor(b0)); const last = bars.filter((x) => (x.m + 1) * 60 <= b0).pop();
        if (last) { engine.setRef(mint, ag, { status: "OK", mc: last.c * c.supply, px: last.c, t: last.m * 60 + 59, quietS: Math.round(b0 - (last.m * 60 + 59)), src: "gmgn-1m", boundary: b0 }); bf.refsOk++; }
        else bf.refsMissing++; // stays MISSING: no trade within 3 h before the boundary in GMGN's history
      }
    }
  }
  async function loop() {
    while (true) {
      if (paused()) { bf.paused = true; await new Promise((r) => setTimeout(r, 2000)); continue; } bf.paused = false;
      const it = q.shift(); if (!it) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      inQ.delete(it.mint);
      try { await one(it.mint); bf.done++; } catch (e) { bf.errors++; bf.lastErr = String(e.message).slice(0, 160); if (/rate limited/i.test(e.message)) { q.unshift(it); inQ.add(it.mint); await new Promise((r) => setTimeout(r, 3000)); } }
    }
  }
  /** after an outage: re-fill the gap from 1-minute bars for coins with open positions or near the band */
  async function patchGap(a, b, mints) { if (paused()) { bf.gapsSkippedPaused = (bf.gapsSkippedPaused || 0) + mints.length; return; } for (const mint of mints) { if (paused()) return; try { const bars = await minuteBars(mint, Math.floor(a / 60) * 60, Math.ceil(b / 60) * 60); const r = engine.coin(mint).series.addBars(bars, { from: a, to: b, patchGap: true }); if (r.accepted) bf.gapsPatched++; else bf.gapsNotPatched = (bf.gapsNotPatched || 0) + 1; } catch (e) { bf.errors++; bf.lastErr = String(e.message).slice(0, 160); } } }
  if (jup) creationLoop();
  if (gmgnOn()) loop(); else log("[backfill] no GMGN key: creation times and history cannot be filled — coins stay not-covered");
  return { want, patchGap, size: () => q.length + needC.size };
}
