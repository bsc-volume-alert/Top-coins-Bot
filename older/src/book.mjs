// book.mjs — shared entry inventory and independent exit versions (spec older-2).
// One ENTRY per (mint, decision observation, age group): every family whose candidate came from that same observation shares it.
// Each entry carries exit VERSIONS: stop (20/25/30/40/60%) × policy (trail | scale) and, when CONT-STALL is among its families,
// the same set again with the 60-minute stall rule. Versions never affect each other.
//
// EXECUTION MODEL (declared assumptions): buy at signal availability + 1 s, sell at trigger availability + 0.7 s, priced from
// the pool state IN FORCE at that scheduled moment (the latest reconstructed state — a pool can be traded without anyone else
// trading). The state must be trustworthy at that moment (continuous feed coverage since it was observed). If it is not:
//   buy  → the first trustworthy state within 5 s is used (delay recorded); otherwise a pricing/data timeout cancels the entry;
//   sell → stays triggered and waits for the first trustworthy state (delay recorded); unresolved after 24 h. Never dropped.
import * as S from "./spec.mjs";
import { buyTokens, liqValue, sellSol, sellQuote, feeSrc, feeBuy, feeSell, isQuote } from "./fills.mjs";

let NEXT = 1;
export const COST = S.STAKE_SOL + S.TX_COST_SOL; // acquisition cost: stake + buy transaction

export const newVersion = (stop, policy, stall) => ({ stop, policy, stall, status: "open", tok: 0, got: 0, peak: null, maxX: null, half: null, trigT: null, reason: null, schedT: null, exit: null, stallChecked: false });
/** pick(tag, policy, stop): which rows this buy carries (default: all). A first buy carries every row; a re-buy only the rows on
 *  which its book no longer holds the coin (spec REBUY). */
export function newEntry({ mint, pool, ag, t, families, features, mc, px, evidence = null, startup = false, pick = null }) {
  const fam = [...new Set(families)], versions = [];
  const sets = [...new Set(fam.map(S.clockTag))].sort((a, b) => (a === false ? -1 : b === false ? 1 : 0)); // plain versions first, then one set per clock book
  for (const stall of sets) for (const policy of S.POLICIES) for (const stop of S.STOPS) if (!pick || pick(stall, policy, stop)) versions.push(newVersion(stop, policy, stall));
  return { id: NEXT++, mint, pool, ag, decisionT: t, schedT: t + S.BUY_DELAY_MS / 1000, families: fam, features, signalMc: mc, signalPx: px, evidence, startup,
    status: "pending", fill: null, versions, runner: { maxX: null, horizonDone: false, partial: false, reached: {} }, flags: [] };
}
export const versionsFor = (e, family, policy = "trail") => e.versions.filter((v) => v.stall === S.clockTag(family) && v.policy === policy);
export function setNextId(n) { NEXT = Math.max(NEXT, n); }
const live = (v) => v.status === "open" || v.status === "scaling" || v.status === "selling";

function fillBuy(e, st, at, delay, minReq = null) {
  const tok = buyTokens(st, S.STAKE_SOL, minReq);
  if (tok == null) return false; // this state cannot price the 0.2 SOL buy (e.g. a quote state without a buy quote): keep waiting
  if (!(tok > 0)) { e.status = "cancelled"; e.flags.push("pool state could not price the buy"); return true; }
  e.status = "filled";
  const q = isQuote(st);
  e.fill = { t: at, tok, cost: COST, delay_s: +delay.toFixed(3), state_age_s: q ? null : +(at - st.t).toFixed(3), fee_buy: q ? null : feeBuy(st), fee_src: feeSrc(st, "buy"),
    quote_sol: q ? null : st.quote, base: q ? null : st.base, px_sol: q ? S.STAKE_SOL / tok : (S.STAKE_SOL / (1 + feeBuy(st))) / tok,
    exec: q ? "routed-quote" : "reconstructed-pool-state", ...(q ? {} : stRef(st)), ...(q ? { quote: { req_t: st.buy.reqT ?? st.reqT, resp_t: st.buy.t ?? st.t, route: st.buy.route ?? null, router: st.buy.router ?? null, fee_bps: st.buy.feeBps ?? null, xfer_bps: st.buy.xfer_bps ?? 0, raw_tok: st.buy.raw_tok ?? null, xfer_in_quote: st.buy.xfer_in_quote ?? null, impact: st.buy.impact ?? null } } : {}) };
  // the position's first valuation: from the same state when it can price the sale (pool state). A quote-priced entry starts
  // its high-water mark at COST and takes its first real valuation from its first sell quote. This is deliberate: if the price
  // falls between the buy and the first sell quote, the stop must still be measured from what was paid — starting the peak at
  // the first (already fallen) valuation would leave such a position without a stop. A missing valuation is never treated as a fall.
  const v0 = liqValue(st, tok) ?? COST; e.runner.maxX = v0 / COST;
  for (const v of e.versions) { v.tok = tok; v.peak = v0; v.maxX = v0 / COST; v.maxEq = v0 / COST; v.lastX = v0 / COST; v.lastT = at; }
  return true;
}
/** the pool a sale was priced on: effective SOL side, token side and the sell fee in force. Evidence only — kept so the same
 *  trade can be re-priced at another stake (atStake). No decision reads it. */
const stRef = (st) => (st.st_sig ? { st_sig: st.st_sig, st_slot: st.st_slot ?? null } : {}); // which transaction committed the state that priced this (evidence only; absent on routed quotes and on states saved before this field existed)
const poolOf = (st) => ({ q: st.quote, b: st.base, f: feeSell(st), ...stRef(st) });
function trigger(v, t, reason, value) { v.status = "selling"; v.trigT = t; v.reason = reason; v.trigValue = value; v.schedT = t + S.SELL_DELAY_MS / 1000; }
/** returns false when this state cannot price the order (it then stays pending — a sale is never dropped or priced at zero).
 *  minReq (routed quotes): every quote used must have been requested at or after the order's scheduled time. Realised proceeds are
 *  NOT clipped at zero: a near-worthless sale still pays its transaction cost. */
function execSell(e, v, st, at, delay, cov, minReq = null) {
  const q = isQuote(st);
  if (v.status === "scaling") {
    // SCALE-OUT FORMULA. part = half of the ORIGINAL tokens. One sale, one transaction cost:  got += sell(part) − TX.
    // High-water mark: peak_new = peak_old × value(remaining) / value(held before), both valued on this same state.
    // ⇒ drawdown from the peak is IDENTICAL before and after the sale: selling half neither creates a 50% "fall" nor resets the trail.
    const part = e.fill.tok * S.SCALE_FRACTION, qp = sellQuote(st, part, minReq), qb = sellQuote(st, v.tok, minReq), qa = sellQuote(st, v.tok - part, minReq);
    if (!qp || !qb || !qa) return false;
    const val = (x) => Math.max(0, x.sol - S.TX_COST_SOL), before = val(qb), after = val(qa), sol = qp.sol - S.TX_COST_SOL;
    // ROUTED QUOTES: the half, the full holding and the remainder are separate requests. They are one pricing state only if
    // they were requested close together; otherwise the banked proceeds and the rescaled peak would mix different market
    // moments. Too far apart → this order is NOT executed on them: it waits for a fresh, coherent set.
    let spread = null;
    if (q) { const rs = [qp.reqT, qb.reqT, qa.reqT]; spread = Math.max(...rs) - Math.min(...rs);
      if (!(spread <= S.SCALE_QUOTE_MAX_SPREAD_S)) { v.scaleWaits = (v.scaleWaits || 0) + 1; return false; }
      at = Math.max(qp.t, qb.t, qa.t); delay = at - v.schedT; }
    v.got += sol; v.tok -= part; if (before > v.peak) v.peak = before; // a new high seen at execution counts before rescaling
    v.peak = before > 0 ? v.peak * (after / before) : after;
    v.half = { t: at, sol, delay_s: +delay.toFixed(3), trigger_value: v.trigValue, exec: q ? "routed-quote" : "reconstructed-pool-state", ...(q ? { quotes: { half: { req_t: qp.reqT, resp_t: qp.t }, held_before: { req_t: qb.reqT, resp_t: qb.t }, remaining: { req_t: qa.reqT, resp_t: qa.t } }, quote_spread_s: +spread.toFixed(3), waited_for_coherent_quotes: v.scaleWaits || 0 } : { state_age_s: +(at - st.t).toFixed(3), pool: poolOf(st) }) };
    v.status = "open"; v.schedT = null; return true;
  }
  let sol = 0, used = null; if (v.tok > 0) { used = sellQuote(st, v.tok, minReq); if (!used) return false; sol = used.sol - S.TX_COST_SOL; }
  if (q && used) { at = used.t; delay = at - v.schedT; }
  const total = v.got + sol;
  v.status = "closed"; v.tok = 0;
  v.exit = { t: at, sol: total, last_sol: sol, ret: total / COST - 1, delay_s: +delay.toFixed(3), hold_s: Math.round(at - e.fill.t), trigger_value: v.trigValue ?? null, fee_src: feeSrc(st, "sell"), exec: q ? "routed-quote" : "reconstructed-pool-state", ...(q ? { quote: { req_t: used?.reqT ?? null, resp_t: used?.t ?? null, route: used?.route ?? null, xfer_bps: used?.xfer_bps ?? 0, raw_sol: used?.raw_sol ?? null, xfer_in_quote: used?.xfer_in_quote ?? null } } : { state_age_s: +(at - st.t).toFixed(3), pool: poolOf(st) }) };
  if (v.unresolvedSince) v.exit.was_unresolved_s = Math.round(at - v.unresolvedSince);
  if (cov && cov.gapsIn(e.fill.t, at).length) v.exit.outage_during = true;
  return true;
}

/** ───────── MANUAL SALE — PAPER ONLY (owner 25 Nov 2026 13:21–13:23 UK: "a sell now button… sell all and sell a percentage,
 *  maybe sell 50%… a combination of AI and human") ─────────
 *  The owner may sell a filled paper buy himself: a quarter, half or all of WHAT HE STILL HOLDS of it. It is priced exactly
 *  like the program's own sales — on the pool state in force 0.7 s after the request (SELL_DELAY_MS), after the pool's sell
 *  fee and price impact, one declared transaction cost per sale — and only on a state that is trustworthy at that moment;
 *  otherwise the order waits for the first trustworthy state and records its delay. Never priced at zero, never dropped.
 *  It is recorded BESIDE the rules, in e.manual, and changes nothing else: every stop × exit row of the buy carries on as if
 *  he had not touched it, so each book still measures its rule and his selling can be compared with it on the same buys.
 *  A buy he never touches has no manual record. What he has not sold by the 24-hour limit is sold then, like every position.
 *  Pool-priced buys only (a routed-quote buy has quotes for the program's own quantities only).
 *  e.manual = { tok (still held), got (SOL banked), sales: [{ t, req_t, frac, share, tok, sol, delay_s, state_age_s, by, pool }],
 *               order: { frac, req_t, schedT, by } | null, closed: { t, sol, ret, hold_s } | null, lastX, lastT } */
export const MANUAL_FRACS = [0.25, 0.5, 1];
export function requestManual(e, frac, t) {
  if (!e || e.status !== "filled" || !e.fill) return { ok: false, why: "this is not a filled buy" };
  if (e.fill.exec !== "reconstructed-pool-state") return { ok: false, why: "a buy priced from routed quotes cannot be sold by hand (it has quotes for the program's own quantities only)" };
  if (!MANUAL_FRACS.includes(frac)) return { ok: false, why: "sell 25%, 50% or all" };
  if (!(t <= e.fill.t + S.MAX_HOLD_S)) return { ok: false, why: "the 24-hour limit of this buy has passed" };
  const m = (e.manual ||= { tok: e.fill.tok, got: 0, sales: [], order: null, closed: null });
  if (m.closed || !(m.tok > 0)) return { ok: false, why: "you have already sold all of this buy" };
  if (m.order) return { ok: false, why: "a sale of this buy is already waiting for its price" };
  m.order = { frac, req_t: t, schedT: t + S.SELL_DELAY_MS / 1000, by: "manual" };
  return { ok: true, schedT: m.order.schedT, share_of_buy: +((frac >= 1 ? m.tok : m.tok * frac) / e.fill.tok).toFixed(4) };
}
function execManual(e, st, at, delay, cov) {
  const m = e.manual, o = m.order; if (isQuote(st)) return false; const part = o.frac >= 1 ? m.tok : m.tok * o.frac, q = sellQuote(st, part); if (!q) return false;
  const sol = q.sol - S.TX_COST_SOL; m.got += sol; m.tok = o.frac >= 1 ? 0 : m.tok - part; // proceeds are not clipped at zero: a near-worthless sale still pays its transaction cost
  m.sales.push({ t: at, req_t: o.req_t, frac: o.frac, share: part / e.fill.tok, tok: part, sol, delay_s: +delay.toFixed(3), state_age_s: +(at - st.t).toFixed(3), by: o.by, pool: poolOf(st), ...(cov && cov.gapsIn(e.fill.t, at).length ? { outage_during: true } : {}) });
  m.order = null; if (!(m.tok > 0)) m.closed = { t: at, sol: m.got, ret: m.got / COST - 1, hold_s: Math.round(at - e.fill.t) };
  m.lastX = (m.got + (liqValue(st, m.tok) ?? 0)) / COST; m.lastT = at; return true;
}
export const manualOpen = (e) => !!e.manual && (!!e.manual.order || (!e.manual.closed && e.manual.tok > 0));

/** Everything scheduled at or before `upTo` is executed against `st`, the state in force until then. trusted(at) says whether
 *  that state is known-good at time `at`. Called before a new state replaces `st`, and on every clock tick. */
/** Returns true when it changed something that a status comparison does not show (a clock check done, the runner horizon
 *  closed): the engine check-points the entry then. Status changes are detected by the caller. */
export function advance(e, upTo, st, trusted, cov) {
  let mut = false;
  if (e.status === "pending") {
    if (e.schedT > upTo) return false;
    if (st && trusted(e.schedT) && fillBuy(e, st, e.schedT, 0)) { /* filled or cancelled */ }
    else if (upTo > e.schedT + S.BUY_PRICING_TIMEOUT_S) { e.status = "cancelled"; e.flags.push("pricing/data timeout: no trustworthy pool state within 5 s of the scheduled buy"); return false; }
    else return false;
  }
  if (e.status !== "filled") return false;
  for (let guard = 0; guard < 6; guard++) {
    let changed = false;
    for (const v of e.versions) {
      if (v.status === "open" || v.status === "scaling") { // time-based triggers, in time order
        const ck = v.stall ? S.clockOf(v.stall) : null, stallT = ck ? e.fill.t + ck.at : Infinity, endT = e.fill.t + S.MAX_HOLD_S;
        // the clock book's timed sale: at its time, sold if the position never reached minPeak (CONT-STALL) or simply if still open (HH-BREAK-4H)
        if (ck && !v.stallChecked && stallT <= upTo) { v.stallChecked = true; mut = true; if (ck.minPeak == null || v.maxX < ck.minPeak) { trigger(v, stallT, ck.reason, null); changed = true; continue; } }
        if (endT <= upTo) { trigger(v, endT, "max-hold", null); changed = true; continue; }
      }
      if ((v.status === "selling" || v.status === "scaling") && v.schedT != null && v.schedT <= upTo) {
        if (st && trusted(v.schedT) && execSell(e, v, st, v.schedT, 0, cov)) changed = true;
        // 24 h without a price: the order is MARKED unresolved (visible exposure) but stays pending — it keeps asking for a
        // price and still closes when one returns. Unresolved is never a terminal state and never removes the position.
        else if (!v.unresolvedSince && upTo > v.schedT + S.SELL_UNRESOLVED_S) { v.unresolvedSince = v.schedT + S.SELL_UNRESOLVED_S; v.unresolvedWhy = "no trustworthy price for 24 h after the scheduled sale"; e.touched = true; }
      }
    }
    if (!changed) break;
  }
  if (e.manual) { const m = e.manual, endT = e.fill.t + S.MAX_HOLD_S; // the owner's own sale of this buy — beside the rows above, never instead of them
    if (!m.closed && !m.order && m.tok > 0 && endT <= upTo) { m.order = { frac: 1, req_t: endT, schedT: endT + S.SELL_DELAY_MS / 1000, by: "max-hold" }; mut = true; e.touched = true; } // what he still holds at 24 hours is sold then, like every position
    if (m.order && m.order.schedT <= upTo && st && trusted(m.order.schedT) && execManual(e, st, m.order.schedT, 0, cov)) { mut = true; e.touched = true; } }
  if (!e.runner.horizonDone && upTo >= e.fill.t + S.RUNNER_HORIZON_S) { e.runner.horizonDone = true; mut = true; if (cov && cov.gapsIn(e.fill.t, e.fill.t + S.RUNNER_HORIZON_S).length) e.runner.partial = true; }
  return mut;
}

/** A new trustworthy state `st` was observed at time t (after advance() ran with the previous state).
 *  For a routed-quote state, t is when the RESPONSE became available and st.reqT when it was requested: an order may only be
 *  priced by a quote requested at or after its scheduled time (a later quote is never back-dated to the scheduled instant). */
export function observe(e, st, t, cov) {
  const q = isQuote(st);
  if (e.status === "pending") { // scheduled time passed without a trustworthy state: the first one within 5 s prices the buy
    const bt = q ? (st.buy?.t ?? st.t) : t;
    if (bt >= e.schedT && bt <= e.schedT + S.BUY_PRICING_TIMEOUT_S) fillBuy(e, st, bt, bt - e.schedT, q ? e.schedT : null);
    return;
  }
  if (e.status !== "filled") return;
  if (!q) e.mark = { ...poolOf(st), t }; // the latest pool this position was valued on (stake views of open positions only)
  if (e.manual && !q) { const m = e.manual; if (m.order && m.order.schedT <= t) { if (execManual(e, st, t, t - m.order.schedT, cov)) e.touched = true; } // an overdue manual sale: the first trustworthy state prices it, with its real delay
    else if (!m.closed && m.tok > 0) { const val = liqValue(st, m.tok); if (val != null) { m.lastX = (m.got + val) / COST; m.lastT = t; } } }
  const full = liqValue(st, e.fill.tok), age = t - e.fill.t;
  if (full != null) { const x = full / COST; if (age <= S.RUNNER_HORIZON_S) { if (x > e.runner.maxX) e.runner.maxX = x; for (const k of S.RUNNER_X) if (x >= k && !e.runner.reached[k]) e.runner.reached[k] = Math.round(age); } }
  for (const v of e.versions) {
    if ((v.status === "selling" || v.status === "scaling") && v.schedT <= t) { execSell(e, v, st, t, t - v.schedT, cov, q ? v.schedT : null); if (v.status === "closed") continue; } // overdue order: first trustworthy state
    if (v.status !== "open" && v.status !== "scaling") continue;
    const val = liqValue(st, v.tok); if (val == null) continue; // this state does not price this holding: no peak, no trigger
    if (val > v.peak) v.peak = val; if (full != null && full / COST > v.maxX) v.maxX = full / COST;
    if (!(v.maxEq >= (v.got + val) / COST)) v.maxEq = (v.got + val) / COST; // DISPLAY ONLY: the best the row was actually worth (banked half + what is still held); maxX is the full original position
    v.lastX = (v.got + val) / COST; v.lastT = q ? (sellQuote(st, v.tok)?.t ?? t) : t; // what this row would be worth if sold now (banked half included); for a routed quote, the time of THAT quantity's own quote — another quantity's newer reply never makes it look current
    if (val <= v.peak * (1 - v.stop)) trigger(v, t, "trail", val); // also replaces a pending half-sale: one order, never two on the same tokens
    else if (v.status === "open" && v.policy === "scale" && !v.half && full != null && full >= S.SCALE_AT_X * COST) { v.status = "scaling"; v.trigT = t; v.trigValue = full; v.schedT = t + S.SELL_DELAY_MS / 1000; }
  }
}
/** the distinct token quantities an entry currently needs a sell quote for (a routed-quote provider is asked for exactly these) */
export function inventories(e) { if (e.status !== "filled") return []; const s = new Set(); for (const v of e.versions) if (live(v) && v.tok > 0) { s.add(v.tok); if (v.status === "scaling" || (v.policy === "scale" && !v.half)) s.add(e.fill.tok * S.SCALE_FRACTION); } if (!e.runner.horizonDone) s.add(e.fill.tok); return [...s]; }
/** the earliest scheduled order still waiting for a price (buy or sell), or null */
export function dueAt(e) { if (e.status === "pending") return e.schedT; let m = e.manual?.order?.schedT ?? null; if (e.status === "filled") for (const v of e.versions) if ((v.status === "selling" || v.status === "scaling") && v.schedT != null && (m === null || v.schedT < m)) m = v.schedT; return m; }
/** rows still holding tokens whose sale has had no price for 24 h */
export const unresolvedCount = (e) => (e.status === "filled" ? e.versions.filter((v) => live(v) && v.unresolvedSince).length : 0);
export const entryDone = (e) => e.status === "cancelled" || (e.status === "filled" && e.runner.horizonDone && e.versions.every((v) => !live(v)) && !manualOpen(e)); // a manual sale still waiting for its price keeps the buy in memory
export const exposure = (e) => (e.status === "filled" ? e.versions.filter(live).length : 0);

/** STAKE VIEW — website only, never a decision input. What this row's trade is worth at another stake, re-priced with the same
 *  constant-product formulas on the pool reserves SAVED at the recorded trade's own buy, half-sale and exit (open rows: the latest
 *  pool the position was valued on). Fees and price impact therefore scale with the stake; one transaction cost per leg, as in
 *  the paper trade. At STAKE_SOL it reproduces the recorded result exactly.
 *  DECLARED LIMITS: (1) the moments are those of the 0.2 SOL trade — a larger position loses more to impact, so its own stop
 *  would trigger slightly earlier and its half-sale slightly later; (2) each leg is priced on the pool as it was observed, i.e.
 *  WITHOUT the larger buy's own effect on that pool; (3) nobody can know how other traders would have reacted to a larger buy.
 *  It is an estimate of size sensitivity, not a second simulation.
 *  SALES RECORDED BEFORE RESERVES WERE SAVED (owner, 21 Nov 2026: "just do an estimation … we've got statistics now that we
 *  need to keep"): the pool at that sale is rebuilt from the sale itself — the unique constant-product pool with the BUY pool's
 *  k (= quote × base at the buy) on which the recorded tokens fetch the recorded SOL. Exact at 0.2 SOL by construction; at other
 *  stakes it is off by however much k changed between buy and sale (fees accruing to the pool, liquidity added or removed).
 *  Such a result carries est: true.
 *  null = cannot be re-priced: a routed-quote trade (its quotes were for the 0.2 SOL size only). Never scaled linearly. */
export function atStake(e, v, stake) {
  const f = e.fill; if (e.status !== "filled" || !f || f.exec !== "reconstructed-pool-state" || !(f.quote_sol > 0) || !(f.base > 0) || !(stake > 0)) return null;
  const P = (p) => ({ quote: p.q, base: p.b, feeSell: p.f, feeBuy: p.f });
  const tok = buyTokens({ quote: f.quote_sol, base: f.base, feeBuy: f.fee_buy, feeSell: f.fee_buy }, stake), cost = stake + S.TX_COST_SOL;
  let got = 0, left = tok, half = null, est = false;
  // the pool of a sale: saved with it, or rebuilt from it (sold `t0` tokens for `net` SOL after fee and transaction cost)
  const fee0 = f.fee_buy ?? 0.003, k = f.quote_sol * f.base;
  const poolAt = (leg, t0, net) => { if (leg.pool) return P(leg.pool); if (leg.exec !== "reconstructed-pool-state") return null;
    const g = (net + S.TX_COST_SOL) / (1 - fee0); if (!(g > 0) || !(t0 > 0)) return null; est = true;
    const b = (-t0 + Math.sqrt(t0 * t0 + 4 * k * t0 / g)) / 2; return { quote: k / b, base: b, feeSell: fee0, feeBuy: fee0 }; };
  const part0 = f.tok * S.SCALE_FRACTION;
  if (v.half) { const p = poolAt(v.half, part0, v.half.sol); if (!p) return null; const part = tok * S.SCALE_FRACTION; half = sellSol(p, part) - S.TX_COST_SOL; got += half; left -= part; }
  if (v.exit) { const p = poolAt(v.exit, v.half ? f.tok - part0 : f.tok, v.exit.last_sol); if (!p) return null; const sol = got + sellSol(p, left) - S.TX_COST_SOL; return { stake, cost, closed: true, sol, net: sol - cost, ret: sol / cost - 1, half, est }; }
  if (!e.mark) return null;
  return { stake, cost, closed: false, now_x: (got + liqValue(P(e.mark), left)) / cost, half, est };
}
