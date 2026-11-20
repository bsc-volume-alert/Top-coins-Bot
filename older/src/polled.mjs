// polled.mjs — the Solana-wide adapter (launchpad- and exchange-neutral): three separate jobs on one request budget.
//   1. DISCOVERY      Jupiter /tokens/v2/recent (every new first pool, continuously) + category lists + any injected inventory.
//                     NOT a complete inventory of already-existing older coins — that gap is counted and reported, never hidden.
//   2. OBSERVATION    batched current prices (≤ 50 a request). SAMPLED, not continuous: each coin's actual cadence is recorded with
//                     every observation and entry. Hot coins (in/near the band, or held) are sampled faster than cold ones.
//   3. EXECUTION      routed quotes for exact sizes: the 0.2 SOL buy, and each open position's actual full / remaining inventory.
//                     Requested at or after the scheduled time; the response time is the fill time (never back-dated).
// A mint the price API omits is MISSING COVERAGE (counted; after 3 misses its history restarts). A size with no route stays
// visibly unpriced. Mints already observed live by the PumpSwap adapter are not polled twice.
import * as S from "./spec.mjs";
import { classifyJupToken } from "./risk.mjs";

export class Poller {
  constructor({ engine, jup, store = null, now = () => Date.now() / 1000, log = () => {}, hotEvery = 10, coldEvery = 60, quoteFast = 2, quoteSlow = 10, valuation = "jupiter mcap (circulating supply × price)" }) {
    Object.assign(this, { engine, jup, store, now, log, hotEvery, coldEvery, quoteFast, quoteSlow, valuation });
    this.watch = new Map(); // mint → { decimals, circ, hot, lastT, lastReq, miss, mc }
    this.quoted = new Map(); // entry id → last quote request time
    this.held = new Map();   // entry id → Map(quantity → its latest quote, with that quote's own request/response times)
    engine.onOwnership = (mint, mode) => { if (mode === "live" && this.watch.delete(mint)) this.stats.movedToLive = (this.stats.movedToLive || 0) + 1; };
    this.stats = { watched: 0, hot: 0, sweeps: 0, priced: 0, omitted: 0, lost: 0, discovered: 0, skippedLive: 0, noMeta: 0, quotesOk: 0, noRoute: 0, quoteErr: 0, cadence: { n: 0, sum: 0, max: 0 }, by_origin: {}, risk: {} };
    this.seen = new Set();
  }
  /** after a restart: every sampled coin the engine restored goes back on the watch list (positions first), so open and pending
   *  entries keep receiving prices and quotes */
  restore() { let n = 0; for (const [mint, c] of this.engine.coins) { if (c.mode !== "polled" || this.watch.has(mint) || !(c.info.decimals >= 0)) continue; this.watch.set(mint, { decimals: c.info.decimals, circ: c.info.circ_supply ?? null, hot: !!this.engine.byMint.get(mint)?.size, lastT: null, lastReq: 0, miss: 0, mc: null }); this.seen.add(mint); c.series.histFrom = null; n++; } this.stats.restored = n; return n; }
  /** register a token from provider metadata (launchpad-neutral). Returns false when it is already observed live. */
  add(tok, source) {
    if (this.watch.has(tok.mint)) return true;
    const live = this.engine.coins.get(tok.mint); if (live && live.mode === "live" && (live.state || live.pool)) { this.stats.skippedLive++; return false; } // observed (or observable) by the live adapter
    if (!(tok.decimals >= 0)) { this.stats.noMeta++; return false; }
    // a pump.fun coin still on its bonding curve (first pool = the curve, i.e. the mint itself) is not polled: the moment it
    // graduates, its canonical PumpSwap pool is observed live. Counted, so the gap (curve-stage coins over $40K) is visible.
    if (tok.launchpad === "pump.fun" && tok.first_pool?.id === tok.mint && !(tok.mcap >= S.BAND_LO_USD)) { this.stats.skippedCurve = (this.stats.skippedCurve || 0) + 1; return false; }
    const risk = classifyJupToken(tok), origin = tok.launchpad || "unknown";
    // AGE: the provider gives the FIRST POOL's creation, which is a LOWER BOUND on token age (the token existed before its pool).
    // It can only make a coin look younger than it is, so the 8-hour minimum is never broken; the age group may be understated.
    const createTs = tok.first_pool?.created ?? null;
    this.engine.coin(tok.mint, { mode: "polled", createTs, t: this.now(), info: { population: "solana-wide", symbol: tok.symbol, decimals: tok.decimals, circ_supply: tok.circ_supply ?? null, origin, origin_evidence: tok.launchpad ? "provider launchpad field" : "none", venues: null, token_program: tok.token_program, discovery_source: source, price_source: "jupiter price v3", monitoring_mode: "polled", risk, create_src: createTs ? "jupiter firstPool.createdAt (pool creation: lower bound on token age, UNVERIFIED as token creation)" : null, valuation_def: this.valuation } });
    const c = this.engine.coins.get(tok.mint); if (tok.circ_supply > 0) c.supply = tok.circ_supply;
    this.watch.set(tok.mint, { decimals: tok.decimals, circ: tok.circ_supply ?? null, hot: false, lastT: null, lastReq: 0, miss: 0, mc: tok.mcap ?? null });
    this.stats.by_origin[origin] = (this.stats.by_origin[origin] || 0) + 1; this.stats.risk[risk.status] = (this.stats.risk[risk.status] || 0) + 1; this.stats.discovered++;
    this.store?.saveCoin(tok.mint, { createTs, createSrc: "jupiter firstPool", pumpOrigin: origin, firstSeen: Math.floor(this.now()), info: c.info });
    return true;
  }
  /** continuing discovery: every new first pool, plus the provider's active lists; metadata fetched 100 mints at a time */
  async discover({ categories = [] } = {}) {
    const found = [];
    try { for (const t of await this.jup.recent()) if (!this.seen.has(t.mint)) { this.seen.add(t.mint); found.push([t, "jupiter recent (first pool)"]); } } catch (e) { this.stats.discErr = String(e.message).slice(0, 120); }
    for (const [cat, iv] of categories) try { for (const t of await this.jup.category(cat, iv)) if (!this.seen.has(t.mint)) { this.seen.add(t.mint); found.push([t, `jupiter ${cat}/${iv}`]); } } catch (e) { this.stats.discErr = String(e.message).slice(0, 120); }
    for (const [t, src] of found) this.add(t, src);
    return found.length;
  }
  /** an initial inventory from any source (a list of mints): metadata is fetched and each token registered */
  async addMints(mints, source) { for (let i = 0; i < mints.length; i += 100) { const batch = mints.slice(i, i + 100).filter((m) => !this.watch.has(m)); if (!batch.length) continue; try { const got = await this.jup.tokens(batch); const back = new Set(got.map((t) => t.mint)); for (const t of got) { this.seen.add(t.mint); this.add(t, source); } this.stats.noMeta += batch.filter((m) => !back.has(m)).length; } catch (e) { this.stats.discErr = String(e.message).slice(0, 120); } } }

  /** one observation pass: every coin that is due, in batches of 50 */
  async sweep() {
    const now = this.now(), due = [];
    // keep the watch list bounded: a token that has stayed under a quarter of the band's floor for 2 hours, with no position and no
    // active setup, is dropped (counted; discovery can bring it back if it starts trading again)
    for (const [mint, w] of this.watch) { if (w.mc != null && w.mc >= S.BAND_LO_USD / 4) w.lowSince = null; else if (w.lowSince == null) w.lowSince = now; else if (now - w.lowSince > 7200 && !this.engine.byMint.get(mint)?.size && !this.engine.coins.get(mint)?.sw) { this.watch.delete(mint); this.seen.delete(mint); /* the engine keeps the coin's one-entry flags */ this.stats.pruned = (this.stats.pruned || 0) + 1; } }
    for (const [mint, w] of this.watch) { const c = this.engine.coins.get(mint); w.hot = (w.mc != null && w.mc >= S.BAND_LO_USD / 2 && w.mc <= S.BAND_HI_USD * 2) || !!this.engine.byMint.get(mint)?.size; if (now - w.lastReq >= (w.hot ? this.hotEvery : this.coldEvery) - 0.01 && c) due.push(mint); }
    this.stats.watched = this.watch.size; this.stats.hot = [...this.watch.values()].filter((w) => w.hot).length;
    due.sort((a, b) => (this.watch.get(b).hot - this.watch.get(a).hot) || this.watch.get(a).lastReq - this.watch.get(b).lastReq);
    for (let i = 0; i < due.length; i += 50) {
      const batch = due.slice(i, i + 50); for (const m of batch) this.watch.get(m).lastReq = now;
      let r; try { r = await this.jup.prices(batch); } catch (e) { this.engine.pollDown(this.now(), "price request failed: " + String(e.message).slice(0, 80)); continue; }
      this.engine.pollUp(r.t); this.stats.sweeps++;
      for (const [mint, p] of r.prices) {
        const w = this.watch.get(mint), c = this.engine.coins.get(mint); const gap = w.lastT == null ? null : r.t - w.lastT;
        if (gap != null) { const k = this.stats.cadence; k.n++; k.sum += gap; if (gap > k.max) k.max = gap; if (gap > 3 * (w.hot ? this.hotEvery : this.coldEvery) + 5) { this.engine.coinLost(mint, r.t); this.stats.lost++; } } // a hole in the samples: the coin's history restarts
        if (c.series.histFrom === null) c.series.startLive(r.t); // sampled history starts at the first sample actually received
        w.lastT = r.t; w.miss = 0; if (w.decimals == null && p.decimals != null) w.decimals = p.decimals;
        const mc = w.circ > 0 ? p.px * w.circ : null; w.mc = mc;
        this.stats.priced++;
        this.engine.onPrice({ t: r.t, mint, px: p.px, mc, liqUsd: p.liqUsd, supply: w.circ, src: "jupiter price v3", cadence_s: gap == null ? null : +gap.toFixed(1), valuation: this.valuation });
      }
      // an omitted token has NO observation for this sample: its coverage breaks at once (its history restarts when a price
      // returns) — a missing sample is never bridged
      for (const mint of r.omitted) { const w = this.watch.get(mint); w.miss++; this.stats.omitted++; if (w.lastT != null || w.miss === 1) { this.engine.coinLost(mint, r.t); this.stats.lost++; w.lastT = null; } if (w.miss === 1) this.store?.saveNote(mint, { ag: null, family: "*", t: r.t, reason: "price provider omitted this token (missing coverage)", detail: {} }); }
    }
    return due.length;
  }

  /** execution pricing: orders that are due first, then position valuations on their cadence. One request per distinct size.
   *  Every quote is its OWN observation: it keeps the time it was requested and answered, is handed to the engine as soon as it
   *  arrives, and quotes for different quantities are never merged under one timestamp. The engine is given the latest quote
   *  held for each quantity, each with its own times; an order may only use quotes requested at or after its scheduled time. */
  async quotes() {
    const now = this.now(), needs = this.engine.quoteNeeds(now);
    const pri = (n) => (n.due != null && n.due <= now ? 0 : 1);
    needs.sort((a, b) => pri(a) - pri(b) || (this.quoted.get(a.id) || 0) - (this.quoted.get(b.id) || 0));
    let n = 0;
    for (const need of needs) {
      const last = this.quoted.get(need.id) || 0, urgent = pri(need) === 0;
      // a sale that has had no price for 24 h keeps asking, slowly (it is never abandoned): once every 10 minutes
      const every = need.unresolved ? 600 : urgent ? Math.min(1, this.quoteFast) : this.quoteSlow;
      if (this.now() - last < every) continue;
      const w = this.watch.get(need.mint); if (!w) { this.stats.quoteNoWatch = (this.stats.quoteNoWatch || 0) + 1; continue; } const dec = w.decimals; this.quoted.set(need.id, this.now());
      let held = this.held.get(need.id); if (!held) this.held.set(need.id, (held = new Map()));
      if (need.buy_sol) { const q = await this.jup.quote(need.mint, "buy", need.buy_sol * 1e9); if (q.ok) { this.stats.quotesOk++; this.engine.onQuote(need.id, { kind: "quote", reqT: q.req, t: q.t, buy: { sol: need.buy_sol, tok: q.out / 10 ** dec, reqT: q.req, t: q.t, route: q.route, router: q.router, feeBps: q.feeBps, impact: q.impact }, sells: [] }); n++; } else this._fail(need, q); }
      for (const tok of need.sells) {
        const q = await this.jup.quote(need.mint, "sell", tok * 10 ** dec);
        if (!q.ok) { this._fail(need, q); continue; }
        this.stats.quotesOk++; held.set(tok, { tok, sol: q.out / 1e9, reqT: q.req, t: q.t, route: q.route, router: q.router });
        for (const k of held.keys()) if (!need.sells.some((x) => Math.abs(x - k) <= 1e-9 * Math.max(1, x))) held.delete(k); // sizes no longer held
        this.engine.onQuote(need.id, { kind: "quote", reqT: q.req, t: q.t, buy: null, sells: [...held.values()] }); n++;
      }
    }
    for (const id of this.quoted.keys()) if (!this.engine.entries.has(id)) { this.quoted.delete(id); this.held.delete(id); }
    return n;
  }
  _fail(need, q) { if (/rate limited|HTTP 5|timeout|fetch/i.test(q.why || "")) this.stats.quoteErr++; else { this.stats.noRoute++; const e = this.engine.entries.get(need.id); if (e && !e.flags.includes("quote unavailable: " + q.why)) e.flags.push("quote unavailable: " + q.why); } }

  start({ categories = [["toptraded", "1h"], ["toptrending", "1h"]], discoverEvery = 30 } = {}) {
    const loop = async (fn, every) => { while (!this.stopped) { const t0 = Date.now(); try { await fn(); } catch (e) { this.log("[poller] " + e.message); } await new Promise((r) => setTimeout(r, Math.max(50, every * 1000 - (Date.now() - t0)))); } };
    loop(() => this.sweep(), 1); loop(() => this.quotes(), 0.25); loop(() => this.discover({ categories: (this._d = (this._d || 0) + 1) % 20 === 1 ? categories : [] }), discoverEvery);
  }
}
