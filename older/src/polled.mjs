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
import { Series } from "./series.mjs";

/** token decimals are needed to convert quote sizes: null, undefined or a non-integer is NOT valid (note: `null >= 0` is true in JavaScript) */
export const validDec = (d) => Number.isInteger(d) && d >= 0 && d <= 18;
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
  restore() { let n = 0; this.needMeta = []; for (const [mint, c] of this.engine.coins) { if (c.mode !== "polled" || this.watch.has(mint)) continue;
      // a token the provider had stopped pricing is not put back on the list (it would only use up the sampling allowance);
      // discovery brings it back if it trades again. A token with a position is ALWAYS restored.
      if (c.info.unpriced && !this.engine.byMint.get(mint)?.size) { this.stats.restoreSkippedUnpriced = (this.stats.restoreSkippedUnpriced || 0) + 1; continue; }
      // the same for a token pruned as far below the entry band: not restored; discovery re-adds it if it comes back
      if (c.info.pruned_low && !this.engine.byMint.get(mint)?.size) { this.stats.restoreSkippedLow = (this.stats.restoreSkippedLow || 0) + 1; continue; }
      if (!validDec(c.info.decimals)) { if (this.engine.byMint.get(mint)?.size) this.needMeta.push(mint); else this.stats.restoreSkippedNoMeta = (this.stats.restoreSkippedNoMeta || 0) + 1; continue; } // WARM RESTART: a coin whose samples were read back keeps its history, and its last sample time — so the ordinary hole rule
      // (a gap of more than 3 sampling intervals + 5 s restarts the history) judges the restart like any other pause in sampling
      const keep = c.warm && c.series.lastT != null;
      this.watch.set(mint, { decimals: c.info.decimals, circ: c.info.circ_supply ?? null, hot: !!this.engine.byMint.get(mint)?.size, lastT: keep ? c.series.lastT : null, lastReq: 0, miss: 0, mc: null,
        // …judged ONCE with the interval the coin was actually sampled at before the stop (10 s coins get the 10 s rule, not the 60 s one)
        warmTol: keep && c.series.prevT != null ? 3 * Math.min(this.coldEvery, Math.max(this.hotEvery, c.series.lastT - c.series.prevT)) + 5 : null }); this.seen.add(mint); if (!keep) { c.series.histFrom = null; c.series.obsFrom = null; } else this.stats.restoredWarm = (this.stats.restoredWarm || 0) + 1; n++; } this.stats.restored = n; this.stats.restoreNoMeta = this.needMeta.length; return n; }
  /** restored sampled coins whose stored record lacks token metadata (written by an earlier version) are NOT skipped silently:
   *  their metadata is fetched again, positions first. A coin that still has none keeps its positions visible and flagged. */
  async repair() {
    const list = (this.needMeta || []).sort((a, b) => (this.engine.byMint.get(b)?.size || 0) - (this.engine.byMint.get(a)?.size || 0)); this.needMeta = []; let fixed = 0;
    for (let i = 0; i < list.length; i += 100) { const batch = list.slice(i, i + 100); let got = []; try { got = await this.jup.tokens(batch); } catch (e) { this.stats.discErr = String(e.message).slice(0, 120); }
      const by = new Map(got.map((t) => [t.mint, t]));
      for (const mint of batch) { const t = by.get(mint), c = this.engine.coins.get(mint); if (!c || c.mode !== "polled") continue;
        if (t && validDec(t.decimals)) { c.info.decimals = t.decimals; c.info.circ_supply = c.info.circ_supply ?? t.circ_supply ?? null; if (t.circ_supply > 0) c.supply = t.circ_supply; this.store?.saveCoin(mint, { info: c.info });
          this.watch.set(mint, { decimals: t.decimals, circ: c.info.circ_supply, hot: !!this.engine.byMint.get(mint)?.size, lastT: null, lastReq: 0, miss: 0, mc: t.mcap ?? null }); this.seen.add(mint); c.series.histFrom = null; c.series.obsFrom = null; fixed++; }
        else for (const id of this.engine.byMint.get(mint) || []) { const e = this.engine.entries.get(id), f = "sampled position restored without token metadata: it cannot be quoted until the provider returns it"; if (e && !e.flags.includes(f)) { e.flags.push(f); e.touched = true; this.store?.saveEntry(e); } } } }
    this.stats.restoreRepaired = fixed; if (list.length) this.log(`[poller] restored without metadata: ${list.length}, repaired ${fixed}`); return fixed;
  }
  /** register a token from provider metadata (launchpad-neutral). Returns false when it is already observed live. */
  add(tok, source) {
    if (this.watch.has(tok.mint)) return true;
    const live = this.engine.coins.get(tok.mint); if (live && live.mode === "live" && (live.state || live.pool)) { this.stats.skippedLive++; return false; } // observed (or observable) by the live adapter
    if (!validDec(tok.decimals)) { this.stats.noMeta++; return false; }
    // a pump.fun coin still on its bonding curve (first pool = the curve, i.e. the mint itself) is not polled: the moment it
    // graduates, its canonical PumpSwap pool is observed live. Counted, so the gap (curve-stage coins over $40K) is visible.
    if (tok.launchpad === "pump.fun" && tok.first_pool?.id === tok.mint && !(tok.mcap >= S.BAND_LO_USD)) { this.stats.skippedCurve = (this.stats.skippedCurve || 0) + 1; return false; }
    const risk = classifyJupToken(tok), origin = tok.launchpad || "unknown";
    // AGE: the provider gives the FIRST POOL's creation, which is a LOWER BOUND on token age (the token existed before its pool).
    // It can only make a coin look younger than it is, so the 8-hour minimum is never broken; the age group may be understated.
    const createTs = tok.first_pool?.created ?? null, had = this.engine.coins.get(tok.mint);
    this.engine.coin(tok.mint, { mode: "polled", createTs, t: this.now(), info: { unpriced: null, pruned_low: null, population: "solana-wide", symbol: tok.symbol, decimals: tok.decimals, circ_supply: tok.circ_supply ?? null, origin, origin_evidence: tok.launchpad ? "provider launchpad field" : "none", venues: null, token_program: tok.token_program, discovery_source: source, price_source: "jupiter price v3", monitoring_mode: "polled", risk, create_src: createTs ? "jupiter firstPool.createdAt (pool creation: lower bound on token age, UNVERIFIED as token creation)" : null, valuation_def: this.valuation } });
    const c = this.engine.coins.get(tok.mint); if (tok.circ_supply > 0) c.supply = tok.circ_supply;
    // RE-ADMISSION in the same process (the coin was dropped from the list earlier, or left the live adapter): its old history is
    // not continuous with what we are about to sample. It starts again with an empty history; per-age-group entry records are kept.
    if (had) { c.series = new Series(tok.mint, this.engine.pollCov); c.sw = null; c.rug = null; c.state = null; c.lostAt = null; this.stats.readmitted = (this.stats.readmitted || 0) + 1; }
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
    for (const [mint, w] of this.watch) { if (w.mc != null && w.mc >= S.BAND_LO_USD / 4) w.lowSince = null; else if (w.lowSince == null) w.lowSince = now; else if (now - w.lowSince > 7200 && !this.engine.byMint.get(mint)?.size && !this.engine.coins.get(mint)?.sw) { this.watch.delete(mint); this.seen.delete(mint); /* the engine keeps the coin's one-entry flags */ this.stats.pruned = (this.stats.pruned || 0) + 1;
      // recorded on the coin, so a restart does not put it back on the list (measured 21 Nov: a restart restored 1,935 coins, about a
      // thousand of them already pruned as far below the band, and sampling slowed to one price per 88 s for two hours)
      const c = this.engine.coins.get(mint); if (c) { c.info.pruned_low = Math.floor(now); this.store?.saveCoin(mint, { info: c.info }); } } }
    for (const [mint, w] of this.watch) { const c = this.engine.coins.get(mint); w.hot = (w.mc != null && w.mc >= S.BAND_LO_USD / 2 && w.mc <= S.BAND_HI_USD * 2) || !!this.engine.byMint.get(mint)?.size; if (now - w.lastReq >= (w.hot ? this.hotEvery : this.coldEvery) - 0.01 && c) due.push(mint); }
    this.stats.watched = this.watch.size; this.stats.hot = [...this.watch.values()].filter((w) => w.hot).length;
    due.sort((a, b) => (this.watch.get(b).hot - this.watch.get(a).hot) || this.watch.get(a).lastReq - this.watch.get(b).lastReq);
    for (let i = 0; i < due.length; i += 50) {
      const batch = due.slice(i, i + 50); for (const m of batch) this.watch.get(m).lastReq = now;
      let r; try { r = await this.jup.prices(batch); } catch (e) { this.engine.pollDown(this.now(), "price request failed: " + String(e.message).slice(0, 80)); continue; }
      this.engine.pollUp(r.t); this.stats.sweeps++;
      for (const [mint, p] of r.prices) {
        const w = this.watch.get(mint), c = this.engine.coins.get(mint); const gap = w.lastT == null ? null : r.t - w.lastT;
        if (gap != null) { const k = this.stats.cadence; k.n++; k.sum += gap; if (gap > k.max) k.max = gap; const tol = w.warmTol ?? 3 * (w.hot ? this.hotEvery : this.coldEvery) + 5; if (gap > tol) { this.engine.coinLost(mint, r.t); this.stats.lost++; if (w.warmTol != null) this.stats.warmLost = (this.stats.warmLost || 0) + 1; } } w.warmTol = null; // a hole in the samples: the coin's history restarts
        if (c.series.histFrom === null) c.series.startLive(r.t); // sampled history starts at the first sample actually received
        w.lastT = r.t; w.miss = 0; if (!validDec(w.decimals) && validDec(p.decimals)) w.decimals = p.decimals;
        const mc = w.circ > 0 ? p.px * w.circ : null; w.mc = mc;
        this.stats.priced++;
        this.engine.onPrice({ t: r.t, mint, px: p.px, mc, liqUsd: p.liqUsd, supply: w.circ, src: "jupiter price v3", cadence_s: gap == null ? null : +gap.toFixed(1), valuation: this.valuation });
      }
      // an omitted token has NO observation for this sample: its coverage breaks at once (its history restarts when a price
      // returns) — a missing sample is never bridged
      for (const mint of r.omitted) { const w = this.watch.get(mint); w.miss++; this.stats.omitted++; if (w.lastT != null || w.miss === 1) { this.engine.coinLost(mint, r.t); this.stats.lost++; w.lastT = null; } if (w.miss === 1) this.store?.saveNote(mint, { ag: null, family: "*", t: r.t, reason: "price provider omitted this token (missing coverage)", detail: {} });
        // a token omitted OMIT_DROP_AFTER times in a row, with no position and no active setup, leaves the watch list (recorded on the
        // coin so a restart does not bring it back): it cannot be observed, and asking for it costs the others their samples
        if (w.miss >= S.OMIT_DROP_AFTER && !this.engine.byMint.get(mint)?.size && !this.engine.coins.get(mint)?.sw) { this.watch.delete(mint); this.seen.delete(mint); this.stats.droppedUnpriced = (this.stats.droppedUnpriced || 0) + 1; const c = this.engine.coins.get(mint); if (c) { c.info.unpriced = Math.floor(r.t); this.store?.saveCoin(mint, { info: c.info }); } } }
    }
    return due.length;
  }

  /** execution pricing: orders that are due first, then position valuations on their cadence. One request per distinct size.
   *  Every quote is its OWN observation: it keeps the time it was requested and answered, is handed to the engine as soon as it
   *  arrives, and quotes for different quantities are never merged under one timestamp. The engine is given the latest quote
   *  held for each quantity, each with its own times; an order may only use quotes requested at or after its scheduled time. */
  async quotes(which = "all") {
    const now = this.now(), pri = (n) => (n.due != null && n.due <= now ? 0 : 1);
    // TWO independent passes (see start): "urgent" = orders that are DUE, "routine" = position valuations. A routine pass can take
    // many seconds on a slow key (each valuation waits its turn behind price samples); a buy that became due meanwhile must not
    // wait for it — measured live 20 Nov 20:20–20:35 UK: three sampled buys were cancelled at the 5 s limit for exactly that reason.
    const needs = this.engine.quoteNeeds(now).filter((n) => which === "all" || (which === "urgent") === (pri(n) === 0));
    needs.sort((a, b) => pri(a) - pri(b) || (this.quoted.get(a.id) || 0) - (this.quoted.get(b.id) || 0));
    let n = 0;
    for (const need of needs) {
      const last = this.quoted.get(need.id) || 0, urgent = pri(need) === 0;
      // a sale that has had no price for 24 h keeps asking, slowly (it is never abandoned): once every 10 minutes
      const every = need.unresolved ? 600 : urgent ? Math.min(1, this.quoteFast) : this.quoteSlow;
      if (this.now() - last < every) continue;
      const w = this.watch.get(need.mint); if (!w || !validDec(w.decimals)) { this.stats.quoteNoWatch = (this.stats.quoteNoWatch || 0) + 1; continue; } const dec = w.decimals; this.quoted.set(need.id, this.now());
      // TRANSFER FEE (spec XFER_FEE_MAX_BPS): the coin keeps this share of every transfer. The quote is treated as NOT including it, so it is
      // taken off the tokens received at the buy and off the proceeds of each sale. If a router already nets it, the result is too LOW, never too high.
      const xfer = this.engine.coins.get(need.mint)?.info?.risk?.fee_bps || 0, keep = 1 - xfer / 10_000;
      let held = this.held.get(need.id); if (!held) this.held.set(need.id, (held = new Map()));
      if (need.buy_sol) { const q = await this.jup.quote(need.mint, "buy", need.buy_sol * 1e9, { urgent: true }); if (q.ok) { this.stats.quotesOk++; this.engine.onQuote(need.id, { kind: "quote", reqT: q.req, t: q.t, buy: { sol: need.buy_sol, tok: (q.out / 10 ** dec) * keep, xfer_bps: xfer, reqT: q.req, t: q.t, route: q.route, router: q.router, feeBps: q.feeBps, impact: q.impact }, sells: [] }); n++; } else this._fail(need, q); }
      for (const tok of need.sells) {
        const q = await this.jup.quote(need.mint, "sell", tok * 10 ** dec, { urgent: urgent || (need.due != null && need.due <= this.now()) }); // urgency is decided at dispatch: an order that became due while this pass was waiting goes in the first lane
        if (!q.ok) { this._fail(need, q); for (const k of held.keys()) if (Math.abs(tok - k) <= 1e-9 * Math.max(1, tok)) held.delete(k); continue; } // a size whose quote failed has NO current quote: the old one is dropped, never carried forward
        this.stats.quotesOk++; held.set(tok, { tok, sol: (q.out / 1e9) * keep, xfer_bps: xfer, reqT: q.req, t: q.t, route: q.route, router: q.router });
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
    this.repair().catch((e) => this.log("[poller] repair: " + e.message));
    loop(() => this.sweep(), 1); loop(() => this.quotes("urgent"), 0.25); loop(() => this.quotes("routine"), 0.25); loop(() => this.discover({ categories: (this._d = (this._d || 0) + 1) % 20 === 1 ? categories : [] }), discoverEvery);
  }
}
