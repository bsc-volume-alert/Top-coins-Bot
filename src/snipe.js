// v0.18.119 — Project S: paper snipers (owner, 19 Oct 12:46 UK: "build these paper sniper bots… it must be based on some kind of alpha").
// Every pump.fun launch we see is watched for its first SN_WATCH_S seconds. Five books, each paper-buying at the first tradable moment its
// alpha shows — at the price of the trade that showed it, which is roughly what a bot sending a buy that second pays (the chain confirms a
// slot or two later; the fs*_x columns and the 5-s path measure the rest). Paper only: nothing goes to the executor, nothing to Telegram.
// Costs on the bonding curve are about 10% a round trip (1% fee each way, slippage, a second of latency on a moving curve) — the study prices it so.
//   S1 creator record — the creator's earlier launches: ≥ SN_CREATOR_GRADS graduations, or one that peaked over $100K · enter on the first trade after the create slot
//   S2 proven wallet  — a wallet with a scored record (≥ 8 early buys, ≥ 50% of them 5x within 24 h) buys ≥ 0.2 SOL within 60 s · enter on that trade
//   S3 copycat        — the same name as a coin that peaked ≥ $SN_COPY_PEAK in the last 24 h · enter on the first trade after the create slot
//   S4 clean launch   — bundle < 5% of supply, the dev bought 0.2–3 SOL, ≥ 10 outside buyers and ≥ 5 SOL in within 15 s · enter on the trade that completes it
//   S5 20-s inflow    — ≥ 15 SOL from ≥ 12 wallets within 20 s, create-slot buys excluded · enter on the trade that crosses it
// One entry per coin per book, market cap at entry under SN_MAX_MC, at most SN_MAX_PER_HOUR entries per book per hour (the rest are counted, not taken).
// Everything a book sees at its entry is stored in early_json.sn (→ the data set's sn_* columns); the trace, holders and GMGN (at +90 s) follow as for A.
import { q } from "./db.js";
import { on, holds, fmt } from "./launch-monitor.js";
import { isProven, walletRecord } from "./wallets.js";
import { openCopy, onCopyClose, positionsOf } from "./copytrade.js";
import { triggerContext } from "./momentum.js";
import { gmgnEntry } from "./gmgn.js";
import { solUsdCached } from "./price.js";

const N = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d; };
export const SN = { MAX_MC: N("SN_MAX_MC", 60_000), MAX_PER_HOUR: N("SN_MAX_PER_HOUR", 20), WATCH_S: N("SN_WATCH_S", 120), CREATOR_GRADS: N("SN_CREATOR_GRADS", 2), COPY_PEAK: N("SN_COPY_PEAK", 300_000),
  CLEAN_BUNDLE: N("SN_CLEAN_BUNDLE", 5), CLEAN_DEV_MIN: N("SN_CLEAN_DEV_MIN", 0.2), CLEAN_DEV_MAX: N("SN_CLEAN_DEV_MAX", 3), CLEAN_BUYERS: N("SN_CLEAN_BUYERS", 10), CLEAN_SOL: N("SN_CLEAN_SOL", 5), CLEAN_BY_S: N("SN_CLEAN_BY_S", 15),
  FLOW_SOL: N("SN_FLOW_SOL", 15), FLOW_WALLETS: N("SN_FLOW_WALLETS", 12), FLOW_BY_S: N("SN_FLOW_BY_S", 20), WALLET_MIN_SOL: N("SN_WALLET_MIN_SOL", 0.2), WALLET_BY_S: N("SN_WALLET_BY_S", 60), FIRST_BY_S: N("SN_FIRST_BY_S", 60) };
export const SN_BOOKS = {
  sn1: { id: "S1", name: "creator record", what: `the creator's earlier launches: ${SN.CREATOR_GRADS}+ graduated, or one peaked over $100K — bought on the first trade after the create block` },
  sn2: { id: "S2", name: "proven wallet", what: `a wallet with a scored record (8+ early buys, half of them 5x) buys ≥ ${SN.WALLET_MIN_SOL} SOL within ${SN.WALLET_BY_S} s — bought on that trade` },
  sn3: { id: "S3", name: "copycat", what: `the same name as a coin that peaked ≥ $${fmt(SN.COPY_PEAK)} in the last 24 h — bought on the first trade after the create block` },
  sn4: { id: "S4", name: "clean launch", what: `bundle < ${SN.CLEAN_BUNDLE}%, the dev bought ${SN.CLEAN_DEV_MIN}–${SN.CLEAN_DEV_MAX} SOL, ${SN.CLEAN_BUYERS}+ outside buyers and ${SN.CLEAN_SOL}+ SOL in within ${SN.CLEAN_BY_S} s` },
  sn5: { id: "S5", name: "20-s inflow", what: `${SN.FLOW_SOL}+ SOL from ${SN.FLOW_WALLETS}+ wallets within ${SN.FLOW_BY_S} s (create-block buys excluded)` },
};
export const SN_KINDS = Object.keys(SN_BOOKS);
export const sn = { watched: 0, fired: {}, taken: {}, overMc: {}, capped: {}, open: 0 };
const W = new Map(); // mint -> what the first seconds looked like
const hourly = {}; // book -> entry timestamps in the last hour
const short = (w) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "");

on("create", (t) => {
  if (!t?.mint) return;
  const L = { mint: t.mint, createTs: t.ts, slot: t.slot, buyers: new Map(), outSol: 0, solIn: 0, solOut: 0, sells: 0, n: 0, fired: {}, cr: null, crOk: false, cc: null, ccOk: false, mcFirst: null };
  try { const ch = q.creatorHist.get(t.creator, t.mint, t.ts) || {}; L.cr = { n: ch.n || 0, grads: ch.grads || 0, over100k: ch.over100k || 0, best: ch.best ?? null }; L.crOk = L.cr.grads >= SN.CREATOR_GRADS || L.cr.over100k >= 1; } catch {}
  try { if (t.name) { const cc = q.copycats.get(t.name, t.mint, t.ts - 86400) || {}; L.cc = { n: cc.n || 0, best: cc.best ?? null, min: cc.last ? Math.round((t.ts - cc.last) / 60) : null }; L.ccOk = (cc.best || 0) >= SN.COPY_PEAK; } } catch {}
  W.set(t.mint, L); sn.watched++;
  setTimeout(() => W.delete(t.mint), SN.WATCH_S * 1000);
});

on("trade", (t, tr) => {
  const L = W.get(t.mint); if (!L) return;
  const age = tr.ts - L.createTs, outside = tr.slot > L.slot; L.n++; if (L.mcFirst == null && outside) L.mcFirst = t.lastMc;
  if (tr.isBuy) { L.solIn += tr.sol; if (outside && tr.wallet && tr.wallet !== t.creator) { L.buyers.set(tr.wallet, (L.buyers.get(tr.wallet) || 0) + tr.sol); L.outSol += tr.sol; } }
  else { L.solOut += tr.sol; L.sells++; }
  if (!outside) return; // the create block belongs to the bundle and the sub-second snipers — not a price we could have had
  if (L.crOk && !L.fired.sn1 && age <= SN.FIRST_BY_S) fire("sn1", L, t, tr, age, `creator: ${L.cr.n} earlier launches, ${L.cr.grads} graduated, best $${fmt(L.cr.best || 0)}`, L.cr.grads);
  if (L.ccOk && !L.fired.sn3 && age <= SN.FIRST_BY_S) fire("sn3", L, t, tr, age, `copy of a $${fmt(L.cc.best)} coin launched ${L.cc.min} min ago (${L.cc.n} same-name in 24 h)`, L.cc.best);
  if (tr.isBuy && !L.fired.sn2 && age <= SN.WALLET_BY_S && tr.sol >= SN.WALLET_MIN_SOL && tr.wallet && isProven(tr.wallet)) { const rec = walletRecord(tr.wallet) || {}; fire("sn2", L, t, tr, age, `proven wallet ${short(tr.wallet)} (${rec.x5 ?? "?"}/${rec.n ?? "?"} reached 5x) bought ${tr.sol.toFixed(2)} SOL`, rec.rate ?? null, { wallet: tr.wallet, wallet_n: rec.n ?? null, wallet_x5: rec.x5 ?? null, wallet_x10: rec.x10 ?? null, wallet_rate: rec.rate ?? null }); }
  if (!L.fired.sn4 && age <= SN.CLEAN_BY_S && t.bundle && t.bundle.pct < SN.CLEAN_BUNDLE && t.bundle.devBuy >= SN.CLEAN_DEV_MIN && t.bundle.devBuy <= SN.CLEAN_DEV_MAX && L.buyers.size >= SN.CLEAN_BUYERS && L.outSol >= SN.CLEAN_SOL) fire("sn4", L, t, tr, age, `clean: bundle ${t.bundle.pct.toFixed(1)}%, dev ${t.bundle.devBuy.toFixed(2)} SOL, ${L.buyers.size} buyers / ${L.outSol.toFixed(1)} SOL by ${age} s`, L.buyers.size);
  if (!L.fired.sn5 && age <= SN.FLOW_BY_S && L.buyers.size >= SN.FLOW_WALLETS && L.outSol >= SN.FLOW_SOL) fire("sn5", L, t, tr, age, `${L.outSol.toFixed(1)} SOL from ${L.buyers.size} wallets by ${age} s`, L.outSol);
});

function fire(book, L, t, tr, age, signal, signalN, extra = {}) {
  L.fired[book] = true; sn.fired[book] = (sn.fired[book] || 0) + 1;
  const mc = t.lastMc, now = tr.ts; if (!(tr.price > 0) || !(mc > 0)) return;
  if (mc > SN.MAX_MC) { sn.overMc[book] = (sn.overMc[book] || 0) + 1; return; }
  const h = (hourly[book] = (hourly[book] || []).filter((x) => now - x < 3600)); if (h.length >= SN.MAX_PER_HOUR) { sn.capped[book] = (sn.capped[book] || 0) + 1; return; } h.push(now);
  const feats = { book: SN_BOOKS[book].id, delay_s: age, slot_gap: tr.slot - L.slot, buyers: L.buyers.size, out_sol: +L.outSol.toFixed(2), sol_in: +L.solIn.toFixed(2), sol_out: +L.solOut.toFixed(2), sells: L.sells, trades: L.n, mc_first: L.mcFirst != null ? Math.round(L.mcFirst) : null,
    dev_buy: t.bundle?.devBuy ?? null, bundle_pct: t.bundle?.pct != null ? +t.bundle.pct.toFixed(2) : null, bundle_wallets: t.bundle?.wallets ?? null, bundle_sol: t.bundle?.sol != null ? +t.bundle.sol.toFixed(2) : null, signal, signal_n: signalN, cr: L.cr, cc: L.cc, ...extra };
  let pos = null;
  try { pos = openCopy(book, SN_BOOKS[book].id, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, mc, now, { ageS: age, venue: "pump", v5: Math.round((L.solIn + L.solOut) * solUsdCached()), wall0: Date.now(), blockTs: now, noExec: true, preBuyers: new Set((t.trades || []).filter((x) => x.isBuy && x.wallet).map((x) => x.wallet)), creator: t.creator || null }); } // pre-entry buyers incl. the create block: their selling is the trace's ps / psn
  catch (e) { console.error("[snipe open]", e.message); return; }
  if (!pos?.id) return;
  sn.taken[book] = (sn.taken[book] || 0) + 1; sn.open++; holds.add(t.mint);
  try { q.setEarly.run(JSON.stringify({ sn: feats, ctx: triggerContext(t.mint, { creator: t.creator || null, name: t.name || null, symbol: t.symbol || null }, now, null) }), pos.id); } catch (e) { console.error("[snipe early]", e.message); }
  setTimeout(() => { try { gmgnEntry(t.mint, pos.id); } catch {} }, 90_000); // GMGN knows nothing at T+5 s; by +90 s its security / smart-money flags exist
}
onCopyClose((mint, p) => { if (!SN_KINDS.includes(p.kind)) return; sn.open = Math.max(0, sn.open - 1); if (!positionsOf(mint).some((x) => !x.closed && SN_KINDS.includes(x.kind))) holds.delete(mint); });
export const snStats = () => ({ ...sn, watching: W.size });
