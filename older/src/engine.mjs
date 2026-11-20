// engine.mjs — ties the feed to series, signals, entries and storage. One collector for all 112 books.
// Input: decoded PumpSwap swap states (each swap event reports the pool's reserves AFTER the swap) and a clock tick.
// The engine never fetches anything itself; providers (creation time, back-fill, SOL/USD) are injected.
import * as S from "./spec.mjs";
import { Series, Coverage } from "./series.mjs";
import { newCoin, evaluate } from "./signals.mjs";
import { newEntry, onState, onTick, entryDone } from "./book.mjs";
import { liquidityUsd, roundTripImpact } from "./fills.mjs";

export class Engine {
  constructor({ store = null, solUsd = () => null, needCreation = () => {}, log = () => {} } = {}) {
    this.cov = new Coverage(); this.coins = new Map(); this.entries = new Map(); this.byMint = new Map();
    this.store = store; this.solUsd = solUsd; this.needCreation = needCreation; this.log = log;
    this.stats = { swaps: 0, otherPool: 0, noSolUsd: 0, noCreation: 0, evals: 0, cands: 0, entries: 0, notes: 0, lastSwapT: null };
    this.dirtyBars = new Map(); // mint → Set(minute) for persistence
  }
  /** after a restart: everything between the last heartbeat and now is an outage for every coin and every open position */
  restartGap(from, to) { if (from != null && to > from) { this.cov.gaps.push([from, to]); this.store?.feedEvent(to, "restart-gap", `${from}`); } }
  feedUp(t) { this.cov.up(t); for (const c of this.coins.values()) c.series.startLive(t); this.store?.feedEvent(t, "up"); }
  feedDown(t, why = "") { this.cov.drop(t); this.store?.feedEvent(t, "down", why); }
  /** a coin we may watch: canonical pool + token creation time (null while unknown) */
  coin(mint, { pool = null, createTs = null } = {}) {
    let c = this.coins.get(mint);
    if (!c) { const sr = new Series(mint, this.cov); if (!this.cov.down && this.cov.upSince !== null) sr.startLive(this.cov.upSince); c = newCoin(mint, createTs, sr); c.pool = pool; this.coins.set(mint, c); }
    if (pool && !c.pool) c.pool = pool; if (createTs && !c.createTs) c.createTs = createTs;
    return c;
  }
  /** this coin's own data was lost from t (e.g. swaps on a pool not yet resolved were dropped): its history restarts at t */
  coinLost(mint, t) { const c = this.coin(mint); c.series.histFrom = t; c.series.raw = []; c.series.prevT = null; this.stats.coinLost = (this.stats.coinLost || 0) + 1; }
  /** a pool created after the feed started: before it, the coin traded on the bonding curve, which this feed does not see */
  historyFrom(mint, t) { const c = this.coin(mint); if (c.series.histFrom === null || c.series.histFrom < t) c.series.histFrom = t; }
  /** an AGE-DOUBLE reference taken from back-filled history (set only if not already known) */
  setRef(mint, ag, ref) { const c = this.coin(mint); const g = (c.groups[ag] ||= { ref: null, done: {}, logged: {} }); if (!g.ref || g.ref.status !== "OK") g.ref = ref; }
  /** restore one-entry-per-(mint, family, age group) flags after a restart */
  restoreDone(mint, ag, family) { const c = this.coin(mint); (c.groups[ag] ||= { ref: null, done: {}, logged: {} }).done[family] = 1; }
  addEntry(e) { this.entries.set(e.id, e); let s = this.byMint.get(e.mint); if (!s) this.byMint.set(e.mint, (s = new Set())); s.add(e.id); }

  /** ev: { t (recv seconds), mint, pool, base (whole tokens), quote (SOL), feeBps, sol (SOL traded), isBuy, user } */
  onSwap(ev) {
    this.stats.swaps++; this.stats.lastSwapT = ev.t;
    const c = this.coin(ev.mint, { pool: ev.pool });
    if (c.pool && ev.pool !== c.pool) { this.stats.otherPool++; return; } // price and fills come from the canonical pool only
    const su = this.solUsd(ev.t); if (!su) { this.stats.noSolUsd++; return; }
    const st = { base: ev.base, quote: ev.quote, feeBps: ev.feeBps ?? null, t: ev.t };
    const px = (ev.quote / ev.base) * su; // USD per token at the post-swap mid
    c.state = st; c.series.add(ev.t, px, (ev.sol || 0) * su, ev.isBuy, ev.user);
    (this.dirtyBars.get(ev.mint) || this.dirtyBars.set(ev.mint, new Set()).get(ev.mint)).add(Math.floor(ev.t / 60));
    // positions first (a new entry is scheduled 1 s later and cannot fill on this same state)
    const ids = this.byMint.get(ev.mint);
    if (ids) for (const id of ids) { const e = this.entries.get(id); onState(e, st, ev.t, this.cov); this.store?.saveEntry(e); if (entryDone(e)) ids.delete(id); }
    if (!c.createTs) { this.stats.noCreation++; this.needCreation(ev.mint); return; }
    if (ev.t - c.createTs < S.MIN_AGE_S) return;
    this.stats.evals++;
    const o = { t: ev.t, px, mc: px * c.supply, liqUsd: liquidityUsd(st, su), rtImpact: roundTripImpact(st) };
    const r = evaluate(c, o);
    for (const n of r.notes) { this.stats.notes++; this.store?.saveNote(ev.mint, n); }
    if (r.cands.length) {
      this.stats.cands += r.cands.length;
      const e = newEntry({ mint: ev.mint, pool: c.pool, ag: r.cands[0].ag, t: ev.t, families: r.cands.map((x) => x.family), features: r.cands[0].features, mc: o.mc, px });
      e.cands = r.cands.map((x) => ({ family: x.family, detail: x.detail }));
      this.addEntry(e); this.stats.entries++;
      this.store?.saveEntry(e); for (const x of r.cands) this.store?.saveDecision(ev.mint, x.ag, x.family, ev.t, e.id, x.detail);
      this.log(`[entry ${e.id}] ${ev.mint.slice(0, 6)} ${e.ag} ${e.families.join("+")} mc $${Math.round(o.mc)}`);
    }
  }
  tick(now) {
    for (const [mint, ids] of this.byMint) for (const id of ids) { const e = this.entries.get(id); const before = JSON.stringify([e.status, e.versions.map((v) => v.status)]); onTick(e, now, this.cov); if (JSON.stringify([e.status, e.versions.map((v) => v.status)]) !== before) this.store?.saveEntry(e); if (entryDone(e)) ids.delete(id); }
    // persist completed minute bars, prune memory
    const curM = Math.floor(now / 60);
    if (this.store) for (const [mint, ms] of this.dirtyBars) { const c = this.coins.get(mint); for (const m of ms) if (m < curM) { const b = c.series.bars.get(m); if (b) this.store.saveBar(mint, m, b); ms.delete(m); } if (!ms.size) this.dirtyBars.delete(mint); }
    for (const [mint, c] of this.coins) { c.series.prune(now); if (c.series.lastT !== null && now - c.series.lastT > S.BAR_KEEP_S && !this.byMint.get(mint)?.size) { this.store?.saveLast(mint, c); c.series.raw = []; } }
  }
}
