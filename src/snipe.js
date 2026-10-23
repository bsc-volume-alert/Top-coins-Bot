// v0.18.119 — Project S: paper snipers (owner, 19 Oct 12:46 UK: "build these paper sniper bots… it must be based on some kind of alpha").
// Every pump.fun launch we see is watched for its first SN_WATCH_S seconds. Five books, each paper-buying at the first tradable moment its
// alpha shows — at the price of the trade that showed it, which is roughly what a bot sending a buy that second pays (the chain confirms a
// slot or two later; the fs*_x columns and the 5-s path measure the rest). Paper only: nothing goes to the executor, nothing to Telegram.
// Costs on the bonding curve are about 10% a round trip (1% fee each way, slippage, a second of latency on a moving curve) — the study prices it so.
//   S1 creator record — the creator's earlier launches (≤ SN_CREATOR_MAX_N of them: a dev, not a factory): ≥ SN_CREATOR_GRADS graduations or one over $100K, and ≥ SN_CREATOR_RATE of them did · enter on the first trade after the create slot
//   S2 proven wallet  — a wallet with a scored record (≥ 8 early buys, ≥ 50% of them 5x within 24 h) buys ≥ 0.2 SOL within 60 s · enter on that trade
//   S3 copycat        — the same name as a coin that peaked ≥ $SN_COPY_PEAK in the last 24 h · enter on the first trade after the create slot
//   S4 clean launch   — bundle < 5% of supply, the dev bought 0.2–3 SOL, ≥ 10 outside buyers and ≥ 5 SOL in within 15 s · enter on the trade that completes it
//   S5 20-s inflow    — ≥ 15 SOL from ≥ 12 wallets within 20 s, create-slot buys excluded · enter on the trade that crosses it
//   S8 bundled launch — a tier-1 prepared launch (40–79% of supply, ≥ 20 SOL in the create block): enter on the first trade after +4 s, when the bundle is known (the 13:28 study's F2: 604 a day, 16% to 10x by 5 min, 55% graduate)
//   S9 swarm dip      — v0.18.129 (owner, 19 Oct 15:48 UK, from the $5K→$200K study on 43,835 launches): ≥ SN_SWARM_WALLETS outside wallets each ≥ SN_SWARM_MIN_SOL in the first 60 s and a launch bundle under SN_SWARM_BUNDLE% · enter on the first trade at/after +60 s (by +90 s) · sold at 5 min (the h5 rule) · the one S book that goes to the executor (shadow)
//   S6 GMGN smart     — a wallet from smartwallets.js (GMGN-tagged smart / renowned, or early and in profit on ≥ 2 coins that peaked ≥ $300K) buys ≥ 0.2 SOL within 60 s · enter on that trade
// v0.18.130 (owner, 19 Oct 15:57 UK): S1 and S6 also go to the executor as shadow books (S6 was the one positive paper line; S1 reaches 1.5x often but its stops cost); the rest stay paper — shadow can only re-price a book, not rescue one that loses on paper.
// One entry per coin per book, market cap at entry under SN_MAX_MC, at most SN_MAX_PER_HOUR entries per book per hour (the rest are counted, not taken).
// Everything a book sees at its entry is stored in early_json.sn (→ the data set's sn_* columns); the trace, holders and GMGN (at +90 s) follow as for A.
import { q } from "./db.js";
import { on, holds, fmt } from "./launch-monitor.js";
import { isProven, walletRecord } from "./wallets.js";
import { isSmart, smartInfo } from "./smartwallets.js"; // v0.18.121 S6
import { openCopy, onCopyClose, positionsOf } from "./copytrade.js";
import { OFF_KINDS, BOOKS_OFF } from "./config.js";
import { triggerContext } from "./momentum.js";
import { gmgnEntry, walletStatsFor, walletFollowers } from "./gmgn.js";
import { onSmartBuy } from "./smartmoney.js"; // v0.18.122 S7
import { live } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { onSwap } from "./pumpswap.js"; // v0.18.155: S10 buys on the pool

const N = (k, d) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d; };
export const SN = { MAX_MC: N("SN_MAX_MC", 60_000), MAX_PER_HOUR: N("SN_MAX_PER_HOUR", 20), WATCH_S: N("SN_WATCH_S", 120), CREATOR_GRADS: N("SN_CREATOR_GRADS", 2), CREATOR_MAX_N: N("SN_CREATOR_MAX_N", 30), CREATOR_RATE: N("SN_CREATOR_RATE", 0.1), COPY_PEAK: N("SN_COPY_PEAK", 300_000),
  CLEAN_BUNDLE: N("SN_CLEAN_BUNDLE", 5), CLEAN_DEV_MIN: N("SN_CLEAN_DEV_MIN", 0.2), CLEAN_DEV_MAX: N("SN_CLEAN_DEV_MAX", 3), CLEAN_BUYERS: N("SN_CLEAN_BUYERS", 10), CLEAN_SOL: N("SN_CLEAN_SOL", 5), CLEAN_BY_S: N("SN_CLEAN_BY_S", 15),
  SM_AGE_S: N("SN_SM_AGE_S", 600), BUNDLE_MIN: N("SN_BUNDLE_MIN", 40), BUNDLE_MAX: N("SN_BUNDLE_MAX", 79), BUNDLE_SOL: N("SN_BUNDLE_SOL", 20), BUNDLE_BY_S: N("SN_BUNDLE_BY_S", 30), FLOW_SOL: N("SN_FLOW_SOL", 15), FLOW_WALLETS: N("SN_FLOW_WALLETS", 12), FLOW_BY_S: N("SN_FLOW_BY_S", 20), WALLET_MIN_SOL: N("SN_WALLET_MIN_SOL", 0.2), WALLET_BY_S: N("SN_WALLET_BY_S", 60), FIRST_BY_S: N("SN_FIRST_BY_S", 60), SWARM_WALLETS: N("SN_SWARM_WALLETS", 20), SWARM_MIN_SOL: N("SN_SWARM_MIN_SOL", 0.3), SWARM_BUNDLE: N("SN_SWARM_BUNDLE", 20), SWARM_AT_S: N("SN_SWARM_AT_S", 60), SWARM_BY_S: N("SN_SWARM_BY_S", 90) };
export const SN_BOOKS = {
  sn1: { id: "S1", name: "creator record", what: `the creator's earlier launches (at most ${SN.CREATOR_MAX_N}, so a dev, not a factory): ${SN.CREATOR_GRADS}+ graduated or one peaked over $100K, and at least ${Math.round(SN.CREATOR_RATE * 100)}% of them did — bought on the first trade after the create block. Also the executor's shadow book S1 (sold at 5 min, B's rule) from v0.18.130`, exec: true },
  sn2: { id: "S2", name: "proven wallet", what: `a wallet with a scored record (8+ early buys, half of them 5x) buys ≥ ${SN.WALLET_MIN_SOL} SOL within ${SN.WALLET_BY_S} s — bought on that trade` },
  sn3: { id: "S3", name: "copycat", what: `the same name as a coin that peaked ≥ $${fmt(SN.COPY_PEAK)} in the last 24 h — bought on the first trade after the create block. Also the executor's shadow book S3 (sold at 5 min, B's rule) from v0.18.140`, exec: true },
  sn4: { id: "S4", name: "clean launch", what: `bundle < ${SN.CLEAN_BUNDLE}%, the dev bought ${SN.CLEAN_DEV_MIN}–${SN.CLEAN_DEV_MAX} SOL, ${SN.CLEAN_BUYERS}+ outside buyers and ${SN.CLEAN_SOL}+ SOL in within ${SN.CLEAN_BY_S} s. Also the executor's shadow book S4 (sold at 5 min, B's rule) from v0.18.140`, exec: true },
  sn5: { id: "S5", name: "20-s inflow", what: `${SN.FLOW_SOL}+ SOL from ${SN.FLOW_WALLETS}+ wallets within ${SN.FLOW_BY_S} s (create-block buys excluded)` },
  sn7: { id: "S7", name: "GMGN smart-money feed", what: `GMGN's smart-money / KOL feed shows a buy on a coin under ${Math.round(SN.SM_AGE_S / 60)} min old — bought at our feed's current price (the GMGN feed lags the chain by some seconds, recorded in sn_delay_s vs the buy's own time)` },
  sn8: { id: "S8", name: "bundled launch", what: `a prepared (tier-1) launch: ${SN.BUNDLE_MIN}–${SN.BUNDLE_MAX}% of supply bought in the create block with ≥ ${SN.BUNDLE_SOL} SOL — bought on the first trade after the bundle is known (+4 s). The 13:28 study's F2: 604 such launches a day, 16% reached 10x by 5 min, 55% graduated. Its fires reach the executor from v0.18.176 so book BL (bundle 70-80% over 4-10 wallets, $25K+ MC) can shadow them; the executor takes only the BL ones`, exec: true }, // v0.18.176 (owner go 21 Oct 13:50 UK): exec for BL
  sn9: { id: "S9", name: "swarm dip", what: `${SN.SWARM_WALLETS}+ outside wallets each bought ≥ ${SN.SWARM_MIN_SOL} SOL in the first 60 s and the launch bundle was under ${SN.SWARM_BUNDLE}% — bought on the first trade at or after +${SN.SWARM_AT_S} s, sold at 5 min (B's rule). The 15:40 launch study (19 Oct) gave +46% mean / +11% median on 102 launches - that did not transfer to prices that can be bought: paper trading is about -12% a trade on 900+ trades, 20% won (21 Oct). Retired from the page 21 Oct 14:45 UK; still recorded`, exec: true },
  sn10: { id: "S10", name: "10-wallet operator", what: `one operator's launch fingerprint (the 17:41 study's F3: 14 of 14 such launches went past $200K): exactly 10 bundle wallets holding 37–41% of supply with 22–28 SOL, the dev's own buy under 0.2 SOL — bought on the first outside trade once the bundle is known (from +4 s, within 30 s), sold at 5 min (B's rule; the data set also has the 60-s price). The question is whether an outsider can buy near the launch price. Also the executor's shadow book S10. No market-cap cap (v0.18.147): the entry MC it records is the answer to whether an outsider can buy near the launch price`, exec: true, maxMc: 5_000_000 },
  sn3b: { id: "S3b", name: "copycat, not the launch second", what: `S3 bought only on a trade at least 1 s after the launch (the 21:40 study's F7: +13.9% on 62 at 5 min; the same-second entries were −25% on 29 — that price may be the creator's own launch trade, which no outsider gets). Sold at 5 min, paper` },
  sn4b: { id: "S4b", name: "clean launch, bundle < 3%", what: `S4 with a tighter bundle (under 3% of supply) — the 19:41 split: under ~3% +25% (12) vs above −34% (7); a hypothesis on 19 trades. Paper only` },
  sn6b: { id: "S6b", name: "famous smart wallet", what: `S6 when the smart wallet has 1,000+ GMGN followers (looked up when S6 fires, so bought a moment later at our feed's price) — the 20:20 split: +34% on 59 at real costs, +2% without the top 3, vs −17.5% for the rest. Also the executor's shadow book S6b, sold at 5 min — to measure whether famous wallets' coins can be bought near the paper price`, exec: true },
  sn7b: { id: "S7b", name: "unknown feed wallet", exec: true, what: `S7 when the buying wallet has fewer than 100 GMGN followers — the 20:20 split: +7% on 86 vs −23% when a famous (100+) wallet bought. Shadow from 20 Oct 05:30 UK (owner): its two 10x coins were a price error (graduated inside the launch transaction), so corrected it is about -2% on 31; shadow measures whether our feed price is buyable` },
  sn11: { id: "S11", name: "crowd at 1 minute", what: `300+ outside buyers in a launch's first 60 s — bought on the first trade at or after +60 s, sold at 5 min. The owner's Pump Pack idea; the 24-h launch file says −14% at 5 min on 70 (13% doubled, 5.7% reached $200K) — monitored on paper to see whether a tighter version pays` },
  sn6: { id: "S6", name: "GMGN smart wallet", what: `a wallet GMGN tags smart / renowned, or that was early and in profit on 2+ coins that peaked ≥ $300K (harvested from GMGN's top traders), buys ≥ ${SN.WALLET_MIN_SOL} SOL within ${SN.WALLET_BY_S} s — bought on that trade. Also the executor's shadow book S6 (runner exit) from v0.18.130`, exec: true },
};
export const SN_KINDS = Object.keys(SN_BOOKS);
export const sn = { watched: 0, fired: {}, taken: {}, overMc: {}, capped: {}, open: 0 };
const W = new Map(); // mint -> what the first seconds looked like
const hourly = {}; // book -> entry timestamps in the last hour
const short = (w) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : "");

on("create", (t) => {
  if (!t?.mint) return;
  const L = { mint: t.mint, createTs: t.ts, slot: t.slot, buyers: new Map(), outSol: 0, solIn: 0, solOut: 0, sells: 0, n: 0, fired: {}, cr: null, crOk: false, cc: null, ccOk: false, mcFirst: null };
  try { const ch = q.creatorHist.get(t.creator, t.mint, t.ts) || {}; L.cr = { n: ch.n || 0, grads: ch.grads || 0, over100k: ch.over100k || 0, best: ch.best ?? null }; L.crOk = L.cr.n <= SN.CREATOR_MAX_N && (L.cr.grads >= SN.CREATOR_GRADS || L.cr.over100k >= 1) && (L.cr.grads + L.cr.over100k) / Math.max(1, L.cr.n) >= SN.CREATOR_RATE; } catch {} // v0.18.120: a record, not a factory — the first hour's S1 entries were creators with 400–2,400 launches and a dozen graduations by sheer volume
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
  if (L.ccOk && !L.fired.sn3b && age >= 1 && age <= SN.FIRST_BY_S) fire("sn3b", L, t, tr, age, `copy of a $${fmt(L.cc.best)} coin launched ${L.cc.min} min ago, bought ${age} s after the launch`, L.cc.best); // v0.18.146 S3b (F7)
  if (L.ccOk && !L.fired.sn3 && age <= SN.FIRST_BY_S) fire("sn3", L, t, tr, age, `copy of a $${fmt(L.cc.best)} coin launched ${L.cc.min} min ago (${L.cc.n} same-name in 24 h)`, L.cc.best);
  if (tr.isBuy && !L.fired.sn2 && age <= SN.WALLET_BY_S && tr.sol >= SN.WALLET_MIN_SOL && tr.wallet && isProven(tr.wallet)) { const rec = walletRecord(tr.wallet) || {}; fire("sn2", L, t, tr, age, `proven wallet ${short(tr.wallet)} (${rec.x5 ?? "?"}/${rec.n ?? "?"} reached 5x) bought ${tr.sol.toFixed(2)} SOL`, rec.rate ?? null, { wallet: tr.wallet, wallet_n: rec.n ?? null, wallet_x5: rec.x5 ?? null, wallet_x10: rec.x10 ?? null, wallet_rate: rec.rate ?? null }); }
  if (tr.isBuy && !L.fired.sn6 && age <= SN.WALLET_BY_S && tr.sol >= SN.WALLET_MIN_SOL && tr.wallet && isSmart(tr.wallet)) { const si = smartInfo(tr.wallet) || {}; followUp("sn6b", t.mint, tr.wallet, (f) => f >= 1000, (f) => `famous smart wallet ${short(tr.wallet)} (${f} GMGN followers) bought ${tr.sol.toFixed(2)} SOL`); fire("sn6", L, t, tr, age, `smart wallet ${short(tr.wallet)} (${si.wins ?? 0} early wins on ${si.coins ?? 0} big coins${si.gmgn ? ", GMGN-tagged" : ""}) bought ${tr.sol.toFixed(2)} SOL`, si.wins ?? null, { wallet: tr.wallet, wallet_n: si.coins ?? null, wallet_x5: si.wins ?? null, wallet_x10: null, wallet_rate: si.coins ? +((si.wins || 0) / si.coins).toFixed(3) : null }); }
  if (!L.fired.sn8 && age <= SN.BUNDLE_BY_S && t.bundle && t.bundle.pct >= SN.BUNDLE_MIN && t.bundle.pct <= SN.BUNDLE_MAX && t.bundle.sol >= SN.BUNDLE_SOL) fire("sn8", L, t, tr, age, `prepared launch: bundle ${t.bundle.pct.toFixed(1)}% / ${t.bundle.sol.toFixed(1)} SOL in ${t.bundle.wallets} wallets, dev ${t.bundle.devBuy.toFixed(2)} SOL`, t.bundle.pct); // v0.18.123 S8 (the study's F2)
  if (!L.fired.sn4 && age <= SN.CLEAN_BY_S && t.bundle && t.bundle.pct < SN.CLEAN_BUNDLE && t.bundle.devBuy >= SN.CLEAN_DEV_MIN && t.bundle.devBuy <= SN.CLEAN_DEV_MAX && L.buyers.size >= SN.CLEAN_BUYERS && L.outSol >= SN.CLEAN_SOL) fire("sn4", L, t, tr, age, `clean: bundle ${t.bundle.pct.toFixed(1)}%, dev ${t.bundle.devBuy.toFixed(2)} SOL, ${L.buyers.size} buyers / ${L.outSol.toFixed(1)} SOL by ${age} s`, L.buyers.size);
  if (!L.fired.sn9 && age >= SN.SWARM_AT_S && age <= SN.SWARM_BY_S && t.bundle && t.bundle.pct < SN.SWARM_BUNDLE) { let big = 0; for (const v of L.buyers.values()) if (v >= SN.SWARM_MIN_SOL) big++; if (big >= SN.SWARM_WALLETS) fire("sn9", L, t, tr, age, `swarm: ${big} wallets ≥ ${SN.SWARM_MIN_SOL} SOL of ${L.buyers.size} buyers, ${L.outSol.toFixed(1)} SOL in by 60 s, bundle ${t.bundle.pct.toFixed(1)}%`, big, { wal60: L.buyers.size }); else L.fired.sn9 = true; } // v0.18.129 S9: decided once, on the first trade at/after +60 s
  if (!L.fired.sn10 && age <= 30 && t.bundle && t.bundle.wallets === 10 && t.bundle.pct >= 37 && t.bundle.pct <= 41 && t.bundle.sol >= 22 && t.bundle.sol <= 28 && (t.bundle.devBuy ?? 0) < 0.2) fire("sn10", L, t, tr, age, `operator fingerprint: 10 wallets, ${t.bundle.pct.toFixed(1)}% / ${t.bundle.sol.toFixed(1)} SOL, dev ${(t.bundle.devBuy ?? 0).toFixed(2)} SOL`, t.bundle.pct); // v0.18.142 S10 (F3)
  if (L.fired.sn4 && !L.fired.sn4b && t.bundle && t.bundle.pct < 3) fire("sn4b", L, t, tr, age, `clean, bundle ${t.bundle.pct.toFixed(1)}% (< 3%)`, t.bundle.pct); // v0.18.142 S4b: same moment as S4, tighter bundle
  if (!L.fired.sn11 && age >= 60 && age <= 90) { if (L.buyers.size >= 300) fire("sn11", L, t, tr, age, `crowd: ${L.buyers.size} outside buyers by 60 s, MC $${fmt(t.lastMc || 0)}`, L.buyers.size, { wal60: L.buyers.size }); else L.fired.sn11 = true; } // v0.18.143 S11
  if (!L.fired.sn5 && age <= SN.FLOW_BY_S && L.buyers.size >= SN.FLOW_WALLETS && L.outSol >= SN.FLOW_SOL) fire("sn5", L, t, tr, age, `${L.outSol.toFixed(1)} SOL from ${L.buyers.size} wallets by ${age} s`, L.outSol);
});

// v0.18.143: S6b / S7b — look the signal wallet's GMGN followers up, then buy at our feed's price at that moment (the lookup takes ~0.3–1 s; a real bot would wait for it too)
function followUp(book, mint, wallet, ok, sig) {
  walletFollowers(wallet).then((f) => { if (f == null || !ok(f)) return; const t = live.get(mint); if (!t || !(t.lastMc > 0)) return; const last = t.trades?.[t.trades.length - 1]; if (!last?.price) return;
    const L = W.get(mint) || { mint, createTs: t.ts, slot: t.slot, buyers: new Map(), outSol: 0, solIn: 0, solOut: 0, sells: 0, n: t.trades?.length || 0, fired: {}, cr: null, cc: null, mcFirst: null }; if (L.fired[book]) return;
    const now = Math.floor(Date.now() / 1000); fire(book, L, t, { ...last, ts: now, slot: (last.slot || t.slot) + 1, wallet, sol: 0, isBuy: true }, now - (t.ts || now), sig(f), f, { wallet, wallet_n: null, wallet_x5: null, wallet_x10: null, wallet_rate: null, followers: f });
  }).catch(() => {});
}
function fire(book, L, t, tr, age, signal, signalN, extra = {}) {
  L.fired[book] = true; sn.fired[book] = (sn.fired[book] || 0) + 1;
  const mc = extra.pool ? tr.mc : t.lastMc, now = tr.ts;
  if (book === "sn10") console.log(`[sn10] ${t.mint} ${t.name} age ${age}s mc $${Math.round(mc || 0)} price ${tr.price} graduated ${!!t.graduated} bundle ${JSON.stringify(t.bundle)}`); // v0.18.154: every fingerprint decision is logged (29 launches, 0 rows - the executor never saw one)
  if (!(tr.price > 0) || !(mc > 0)) return;
  if (t.graduated && !extra.pool) { sn.graduated = sn.graduated || {}; sn.graduated[book] = (sn.graduated[book] || 0) + 1; return; } // v0.18.149: the coin has already left the curve (KFC, Super Saiyan: 85 SOL dev buy graduated them inside the launch transaction) - the curve's last price is not a price anyone can buy at; real trading was 9x higher on the pool
  if (mc > (SN_BOOKS[book].maxMc ?? SN.MAX_MC)) { sn.overMc[book] = (sn.overMc[book] || 0) + 1; return; } // v0.18.147: per-book cap — S10's coins are past $60K by the time the bundle is known (+4 s), so the global cap rejected all 10 of 19 Oct's evening launches
  const h = (hourly[book] = (hourly[book] || []).filter((x) => now - x < 3600)); if (h.length >= SN.MAX_PER_HOUR) { sn.capped[book] = (sn.capped[book] || 0) + 1; return; } h.push(now);
  const feats = { book: SN_BOOKS[book].id, delay_s: age, slot_gap: tr.slot - L.slot, buyers: L.buyers.size, out_sol: +L.outSol.toFixed(2), sol_in: +L.solIn.toFixed(2), sol_out: +L.solOut.toFixed(2), sells: L.sells, trades: L.n, mc_first: L.mcFirst != null ? Math.round(L.mcFirst) : null,
    dev_buy: t.bundle?.devBuy ?? null, bundle_pct: t.bundle?.pct != null ? +t.bundle.pct.toFixed(2) : null, bundle_wallets: t.bundle?.wallets ?? null, bundle_sol: t.bundle?.sol != null ? +t.bundle.sol.toFixed(2) : null, signal, signal_n: signalN, cr: L.cr, cc: L.cc, ...extra };
  if (BOOKS_OFF || OFF_KINDS.has(book)) return; // v0.18.185 all books off · v0.18.179: retired sniper books no longer open paper positions (the fire is still counted above)
  let pos = null;
  try { pos = openCopy(book, SN_BOOKS[book].id, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, mc, now, { ageS: age, venue: extra.pool ? "pumpswap" : "pump", v5: Math.round((L.solIn + L.solOut) * solUsdCached()), wall0: Date.now(), blockTs: now, noExec: !SN_BOOKS[book].exec, pass: true, bundle: t.bundle?.pct ?? null, bundleWallets: t.bundle?.wallets ?? null, wal60: extra.wal60 ?? L.buyers.size, preBuyers: new Set((t.trades || []).filter((x) => x.isBuy && x.wallet).map((x) => x.wallet)), creator: t.creator || null }); } // pre-entry buyers incl. the create block: their selling is the trace's ps / psn
  catch (e) { console.error("[snipe open]", e.message); return; }
  if (!pos?.id) return;
  sn.taken[book] = (sn.taken[book] || 0) + 1; sn.open++; holds.add(t.mint);
  try { q.setEarly.run(JSON.stringify({ sn: feats, ctx: triggerContext(t.mint, { creator: t.creator || null, name: t.name || null, symbol: t.symbol || null }, now, null) }), pos.id); } catch (e) { console.error("[snipe early]", e.message); }
  setTimeout(() => { try { gmgnEntry(t.mint, pos.id, { holders: true }); } catch {} }, 90_000);
  if (extra.wallet) { try { walletStatsFor(pos.id, "sig", extra.wallet); } catch {} } // v0.18.122: the signal wallet's 7-day GMGN record (gw_sig_*) // GMGN knows nothing at T+5 s; by +90 s its security / smart-money flags exist
}
// v0.18.155 S10 on the pool (owner, 20 Oct 15:55 UK: "get S10 running"). 29 fingerprint launches, 0 rows: the operator's coins graduate within the first
// seconds (25 SOL bundle + the crowd), so by the time the bundle is known (+4 s) there are no more curve trades for the curve handler above to fire on.
// The first PumpSwap swap after the bundle is known is the first moment an outsider can buy; S10 fires on that, at the pool price.
const FP = (b) => b && b.wallets === 10 && b.pct >= 37 && b.pct <= 41 && b.sol >= 22 && b.sol <= 28 && (b.devBuy ?? 0) < 0.2;
onSwap((tr) => {
  const L = W.get(tr.mint); if (!L || L.fired.sn10) return; const t = live.get(tr.mint); if (!t?.bundle) return;
  const age = (tr.ts || Math.floor(Date.now() / 1000)) - L.createTs; if (age > 60 || !(tr.price > 0) || !(tr.mc > 0)) return;
  if (FP(t.bundle)) fire("sn10", L, t, { ...tr, ts: tr.ts || Math.floor(Date.now() / 1000), slot: (tr.slot || t.slot) + 1, isBuy: true, sol: tr.sol || 0 }, age, `operator fingerprint: 10 wallets, ${t.bundle.pct.toFixed(1)}% / ${t.bundle.sol.toFixed(1)} SOL, dev ${(t.bundle.devBuy ?? 0).toFixed(2)} — first pool trade at ${age} s`, t.bundle.pct, { pool: true });
});
// S7: a smart-money / KOL buy from GMGN's feed on a young coin we are tracking from launch → paper-buy at the last price our own feed saw
const fired7 = new Map(); // mint -> ts
onSmartBuy(({ mint, wallet, usd, ts, kind, tags, seenTs }) => {
  const t = live.get(mint); if (!t || fired7.has(mint)) return; const age = seenTs - (t.ts || seenTs); if (age > SN.SM_AGE_S || !(t.lastMc > 0)) return;
  const last = t.trades?.[t.trades.length - 1]; if (!last?.price) return; fired7.set(mint, seenTs); if (fired7.size > 2000) fired7.delete(fired7.keys().next().value);
  const L = W.get(mint) || { mint, createTs: t.ts, slot: t.slot, buyers: new Map(), outSol: 0, solIn: 0, solOut: 0, sells: 0, n: t.trades?.length || 0, fired: {}, cr: null, cc: null, mcFirst: null };
  const tr = { ...last, ts: seenTs, slot: (last.slot || t.slot) + 1, wallet, sol: 0, isBuy: true };
  followUp("sn7b", mint, wallet, (f) => f < 100, (f) => `unknown feed wallet ${short(wallet)} (${f} GMGN followers) bought $${Math.round(usd)}`);
  fire("sn7", L, t, tr, age, `${kind === "kol" ? "KOL" : "smart money"} ${short(wallet)} bought $${Math.round(usd)} ${seenTs - ts} s ago (${tags || kind})`, usd, { wallet, wallet_n: null, wallet_x5: null, wallet_x10: null, wallet_rate: null, feed_lag_s: seenTs - ts });
});
onCopyClose((mint, p) => { if (!SN_KINDS.includes(p.kind)) return; sn.open = Math.max(0, sn.open - 1); if (!positionsOf(mint).some((x) => !x.closed && SN_KINDS.includes(x.kind))) holds.delete(mint); });
export const snStats = () => ({ ...sn, watching: W.size });
