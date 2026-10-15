// Per-token state for Flap launches + their PancakeSwap pools after graduation, and every strategy check.
// Same logic and starting parameters as the Solana tracker (src/lifecycle.js, src/momentum.js, src/copytrade.js).
import { C } from "./config.js";
import { db, q } from "./db.js";
import { quoteUsd, quoteSym, quoteDecimals, notePriceMiss, noteLaunchMc, launchCheckOk } from "./price.js";
import { addPool, touchPool } from "./pools.js";
import { volumeQuality, qualityLine } from "./quality.js";
import { txInfo } from "./rpc.js";
import { open, onTokenTrade, openForToken, isOpen, onClose } from "./paper.js";
import { esc, fmt, ageStr } from "./telegram.js";
import { feedSnapshot, backfillAddress } from "./feed.js";
import { isWatchedWallet, isWatchedCreator, provenCount, walletLabel, creatorLabel } from "./wallets.js";

export const ts = { launches: 0, trades: 0, gradEvents: 0, tracked: 0, noUsd: 0, lateTrades: 0 };
export const S = new Map(); // token -> state
const ZERO = "0x0000000000000000000000000000000000000000";
const pendingMeta = new Map(); // token -> {quote, tax, thresh, migrator} (companion events may arrive before/after TokenCreated)
let anchor = { block: 0, ts: 0 }; let blockTime = 0.45;
export const setBlockTime = (bt) => { blockTime = bt; };
const blockTs = (b) => (anchor.block ? anchor.ts + (b - anchor.block) * blockTime : Date.now() / 1000);

function st(token, create = true) {
  let s = S.get(token);
  if (!s && create) {
    s = { token, name: null, symbol: null, creator: null, createTs: null, createBlock: null, quote: null, quoteSym: "BNB", taxBps: null, dexThresh: null, migrator: null,
      trades5: [], win5: { v: 0, b: 0, s: 0, nb: 0, ns: 0 }, trades1: [], v1: 0, b1: 0, s1: 0,
      ring: [], bts: [], buyers: new Set(), seen: new Set(), lastPx: 0, lastMc: 0, lastTs: 0, peakMc: 0, peakTs: 0,
      graduated: false, gradTs: 0, gradPx: 0, gradPeak: 0, pool: null, dumped: false, lowMc: Infinity, lowTs: 0,
      bundle: { usd: 0, tokens: 0, wallets: new Set() }, devBuyUsd: 0, snipers: new Set(), early: [], cp: {}, nextCp: 0, maxBurst: 0,
      w2: new Set(), revDone: false, grDone: false, grecDone: false, slowDone: false, earlyDone: false, lastRev: 0, lastGr: 0, lastSlow: 0,
      mom: { lastAlert: 0, closed: [], firstEntryPx: null }, walletBuys: [], creatorHist: null, copyCreatorPending: false, first100k: null, dirty: true, strategies: new Set() };
    S.set(token, s);
  }
  return s;
}
export const getState = (token, row) => { const s = st(token); if (row && !s.lastPx) { s.lastPx = row.last_price || row.entry_price; s.lastMc = row.last_mc || row.entry_mc; s.name ||= row.name; s.symbol ||= row.symbol; } return s; };
export const peekState = (token) => S.get(token);

// ---------- Flap events ----------
export async function onFlap(ev) {
  if (ev.kind === "trade") { anchor = { block: ev.block, ts: ev.ts }; return trade(ev, "flap"); }
  if (ev.kind === "create") return create(ev);
  if (ev.kind === "grad") return graduate(ev);
  const s = S.get(ev.token), m = pendingMeta.get(ev.token) || {};
  if (ev.kind === "quote") { m.quote = ev.quote; if (s) setQuote(s, ev.quote); }
  if (ev.kind === "tax") { m.tax = ev.bps; if (s) { s.taxBps = ev.bps; q.tokenSet("tax_bps").run(ev.bps, s.token); } }
  if (ev.kind === "thresh") { m.thresh = ev.value; if (s) { s.dexThresh = ev.value; q.tokenSet("dex_thresh").run(ev.value, s.token); } }
  if (ev.kind === "migrator") { m.migrator = ev.type; if (s) { s.migrator = ev.type; q.tokenSet("migrator").run(ev.type, s.token); } }
  if (!s) { pendingMeta.set(ev.token, m); if (pendingMeta.size > 5000) pendingMeta.delete(pendingMeta.keys().next().value); }
}
function setQuote(s, quote) { s.quote = quote && quote !== ZERO ? quote : null; s.quoteSym = quoteSym(s.quote); q.tokenSet("quote").run(s.quote, s.token); q.tokenSet("quote_sym").run(s.quoteSym, s.token); }

function create(ev) {
  const s = st(ev.token); ts.launches++;
  Object.assign(s, { name: ev.name, symbol: ev.symbol, creator: ev.creator, createTs: ev.ts || Math.floor(Date.now() / 1000), createBlock: ev.block });
  q.upsertToken.run({ token: ev.token, venue: "flap", name: ev.name, symbol: ev.symbol, creator: ev.creator, create_ts: s.createTs, create_block: ev.block, meta: ev.meta });
  const m = pendingMeta.get(ev.token); setQuote(s, m?.quote ?? null); if (m) { pendingMeta.delete(ev.token); if (m.tax != null) { s.taxBps = m.tax; q.tokenSet("tax_bps").run(m.tax, s.token); } if (m.thresh != null) s.dexThresh = m.thresh; if (m.migrator != null) s.migrator = m.migrator; }
  const h = q.creatorHist.get(ev.creator, ev.token, s.createTs); s.creatorHist = { n: h.n || 0, grads: h.grads || 0, best: h.best || 0 };
  q.tokenSet("creator_prior").run(s.creatorHist.n, s.token); q.tokenSet("creator_prior_grads").run(s.creatorHist.grads, s.token); q.tokenSet("creator_best_mc").run(s.creatorHist.best, s.token);
  if (isWatchedCreator(ev.creator)) s.copyCreatorPending = true;
}

async function graduate(ev) {
  const s = st(ev.token); ts.gradEvents++;
  if (!s.graduated) { s.graduated = true; s.gradTs = s.lastTs || Math.floor(Date.now() / 1000); s.gradPx = s.lastPx; s.gradPeak = s.lastMc; } // chain time
  s.pool = ev.pool; const p = await addPool(ev.token, ev.pool, s.quote); s.poolKind = p.kind;
  if (p.kind === "v2" || p.kind === "v3") backfillAddress(ev.pool, ev.block); // trades between graduation and the poller picking up the pool
  db.prepare(`UPDATE tokens SET graduated=1, grad_ts=?, grad_mc=?, pool=?, pool_kind=? WHERE token=?`).run(s.gradTs, s.lastMc, ev.pool, p.kind, s.token);
  // silent control: buy every graduation of a token tracked since launch (alert only with many buyers)
  if (s.createTs && s.buyers.size >= C.GRAD_MIN_BUYERS && s.lastMc >= C.GRAD_MIN_MC && s.lastPx > 0) {
    const f = feats(s, "grad"); const alert = s.buyers.size >= C.GRAD_ALERT_BUYERS;
    enter("grad", s, f, alert ? `🎓 <b>GRADUATION ENTRY</b> — ${title(s)}\nGraduated at +${Math.round((Date.now() / 1000 - s.createTs) / 60)}m · ${s.buyers.size} buyers · MC <b>$${fmt(s.lastMc)}</b> · now on PancakeSwap ${p.kind.toUpperCase()}` : null);
  }
}

// ---------- trades (curve + pool) ----------
export function onPoolTrade(t) { t.ts = Math.round(blockTs(t.block)); touchPool(t.pool); return trade(t, t.venue); }

function insertSorted(arr, x) { if (!arr.length || arr[arr.length - 1].ts <= x.ts) arr.push(x); else { let i = arr.length - 1; while (i > 0 && arr[i - 1].ts > x.ts) i--; arr.splice(i, 0, x); } }

function trade(t, venue) {
  const s = st(t.token); ts.trades++;
  // coins launched before the bot started: no TokenQuoteSet seen. A BNB-priced Flap coin can't be worth >$50M on the curve,
  // so a price that implies that is really quoted in a USD stable (USD1/USDT) — mark it inferred.
  if (!s.createBlock && !s.quoteChecked) { s.quoteChecked = true; if (!s.quote && t.price * C.TOTAL_SUPPLY * (quoteUsd(null) || 600) > 5e7) { s.quote = "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d"; s.quoteSym = "USD?"; } }
  const qu = quoteUsd(s.quote), dq = quoteDecimals(s.quote);
  const now = t.ts || Math.floor(Date.now() / 1000), late = s.lastTs && now < s.lastTs - 5; if (late) ts.lateTrades++;
  if (!qu || dq == null || s.badQuote) { ts.noUsd++; notePriceMiss(s.quote); return; }
  if (dq !== 18) { t.quoteAmt *= 10 ** (18 - dq); t.price = t.quoteAmt / t.amount; } // quote token with other decimals: amounts were read as 18-dec
  const usd = t.quoteAmt * qu, mc = t.price * C.TOTAL_SUPPLY * qu;
  if (s.createBlock && !s.launchChecked) { // first priced trade of a fresh launch: sanity-check the quote price
    s.launchChecked = true; noteLaunchMc(s.quote, mc);
    if (!launchCheckOk(s.quote, mc)) { s.badQuote = true; ts.noUsd++; notePriceMiss(s.quote); console.log(`[price] ${s.token} launch MC $${mc.toFixed(0)} implausible for quote ${s.quote} — not priced`); return; }
  }
  if (!(mc > 0) || !isFinite(mc)) return;
  if (!late) { s.lastPx = t.price; s.lastMc = mc; s.lastTs = now; }
  s.dirty = true;
  if (mc > s.peakMc) { s.peakMc = mc; s.peakTs = now; }
  if (s.graduated && mc > s.gradPeak) s.gradPeak = mc;
  if (!s.dumped && s.peakMc > 0 && mc <= s.peakMc * (1 - C.SLOW_DRAWDOWN)) { s.dumped = true; s.lowMc = mc; s.lowTs = now; }
  if (s.dumped && mc < s.lowMc) { s.lowMc = mc; s.lowTs = now; }
  // windows
  const e = { ts: now, usd, b: t.isBuy, w: t.wallet, px: t.price, tx: t.tx };
  insertSorted(s.trades5, e); s.win5.v += usd; if (t.isBuy) { s.win5.b += usd; s.win5.nb++; } else { s.win5.s += usd; s.win5.ns++; }
  const tip = s.lastTs || now;
  while (s.trades5.length && tip - s.trades5[0].ts > 300) { const o = s.trades5.shift(); s.win5.v -= o.usd; if (o.b) { s.win5.b -= o.usd; s.win5.nb--; } else { s.win5.s -= o.usd; s.win5.ns--; } if (o.w && s.seen.size < 50000) s.seen.add(o.w); }
  insertSorted(s.trades1, e); s.v1 += usd; if (t.isBuy) s.b1++; else s.s1++;
  while (s.trades1.length && tip - s.trades1[0].ts > 60) { const o = s.trades1.shift(); s.v1 -= o.usd; if (o.b) s.b1--; else s.s1--; }
  if (s.v1 > s.maxBurst) s.maxBurst = s.v1;
  insertSorted(s.ring, { ts: now, px: t.price, mc, usd, b: t.isBuy }); while (s.ring.length && tip - s.ring[0].ts > 1260) s.ring.shift();
  if (t.isBuy && t.wallet && !s.buyers.has(t.wallet)) { s.buyers.add(t.wallet); insertSorted(s.bts, { ts: now, w: t.wallet }); }
  while (s.bts.length && tip - s.bts[0].ts > 1260) s.bts.shift();
  // launch structure (only for tokens we saw launch)
  if (s.createBlock && t.isBuy && t.wallet) {
    if (t.block === s.createBlock) { if (t.wallet === s.creator) s.devBuyUsd += usd; else { s.bundle.usd += usd; s.bundle.tokens += t.amount; s.bundle.wallets.add(t.wallet); } }
    else if (t.block <= s.createBlock + 5) s.snipers.add(t.wallet);
    if (s.createTs && now - s.createTs <= C.WALLET_WINDOW_S && s.walletBuys.length < 400) {
      const isBundle = t.block === s.createBlock || t.wallet === s.creator ? 1 : 0;
      const id = q.insWalletBuy.run(t.wallet, s.token, now, now - s.createTs, usd, mc, isBundle, mc, mc).lastInsertRowid;
      s.walletBuys.push({ id, ts: now, entryMc: mc, p30: mc, p24: mc, dirty: false });
    }
    if (s.createTs && now - s.createTs <= C.EARLY_WINDOW_S && t.block !== s.createBlock) s.early.push({ ts: now, usd, w: t.wallet });
  }
  for (const b of s.walletBuys) { const age = now - b.ts; if (age <= 1800 && mc > b.p30) { b.p30 = mc; b.dirty = true; } if (age <= 86400 && mc > b.p24) { b.p24 = mc; b.dirty = true; } }
  if (t.isBuy && usd >= C.BIGBUY_USD && t.wallet) q.insBigBuy.run(s.token, t.wallet, now, s.createTs ? now - s.createTs : null, usd, mc, venue);
  if (!s.first100k && s.win5.v >= 100_000) { s.first100k = { ts: now, mc }; }
  onTokenTrade(s);
  if (late) return; // strategy checks only on fresh data
  if (s.copyCreatorPending && s.lastPx > 0) { s.copyCreatorPending = false; enter("copycreator", s, feats(s, "copycreator", { label: creatorLabel(s.creator) }), `🧑‍💻 <b>COPY CREATOR</b> — ${title(s)}\nWatched creator ${esc(creatorLabel(s.creator))} just launched · MC <b>$${fmt(mc)}</b>`); }
  if (t.isBuy && t.wallet && isWatchedWallet(t.wallet)) copy(s, t, usd);
  sample(s, now);
  checkEarly(s, now); checkWave2(s, now); checkMomentum(s, now); checkRevival(s, now); checkGradRunner(s, now); checkGradRecovery(s, now); checkSlow(s, now);
}

// ---------- features recorded at entry (entry-time only) ----------
export function feats(s, kind, extra = {}) {
  const now = Math.floor(Date.now() / 1000), w = s.win5, fh = feedSnapshot();
  const new60 = s.bts.filter((x) => now - x.ts <= 60).length, new5 = s.bts.filter((x) => now - x.ts <= 300).length;
  const ch = s.creatorHist;
  return {
    vol5m_usd: w.v, vol1m_usd: s.v1, buys_entry: w.nb, sells_entry: w.ns, buyers_entry: s.buyers.size, bs_ratio_entry: w.b / Math.max(w.s, 1), new60_entry: new60, new5_entry: new5,
    bundle_pct: s.createBlock ? (s.bundle.tokens / C.TOTAL_SUPPLY) * 100 : null, bundle_usd: s.createBlock ? s.bundle.usd : null, bundle_wallets: s.createBlock ? s.bundle.wallets.size : null,
    snipers: s.createBlock ? s.snipers.size : null, dev_buy_usd: s.createBlock ? s.devBuyUsd : null, tax_bps: s.taxBps,
    creator_prior: ch?.n ?? null, creator_grads: ch?.grads ?? null, proven_entry: s.createTs ? provenCount(s.early.filter((x) => x.ts - s.createTs <= 60).map((x) => x.w)) : null,
    feed_final_pct: fh.finalPct, feed_live_pct: fh.livePct, feed_polling: fh.polling ? 1 : 0, ...extra,
  };
}
const title = (s) => `${esc(s.name || s.token.slice(0, 8))} ($${esc(s.symbol || "?")})${s.taxBps ? ` · tax ${(s.taxBps / 100).toFixed(1)}%` : ""}${s.quoteSym !== "BNB" ? ` · ${s.quoteSym} pair` : ""}`;
const launchLine = (s) => s.createBlock ? `Launch: bundle ${((s.bundle.tokens / C.TOTAL_SUPPLY) * 100).toFixed(1)}% · ${s.bundle.wallets.size} wallets · dev buy $${fmt(s.devBuyUsd)} · snipers ${s.snipers.size}${s.creatorHist ? ` · creator ${s.creatorHist.n} prior / ${s.creatorHist.grads} grads${s.creatorHist.grads >= C.CREATOR_GRADS_FLAG ? " ⭐" : ""}` : ""}` : "Launch: before tracker start (no launch data)";
function enter(kind, s, f, text) { s.strategies.add(kind); return open(kind, s, f, text); }

// ---------- lifecycle checkpoints (honest-replay data) ----------
function sample(s, now) {
  if (!s.createTs) return;
  const cps = C.LIFE_CHECKPOINTS;
  while (s.nextCp < cps.length && now - s.createTs >= cps[s.nextCp]) {
    const cp = cps[s.nextCp++], w = s.trades5.filter((x) => now - x.ts <= 300);
    const by = new Set(w.filter((x) => x.b && x.w).map((x) => x.w)).size, alive = now - s.lastTs <= 300 && w.length ? 1 : 0;
    q.insLife.run(s.token, cp, now, s.lastMc, w.reduce((a, x) => a + x.usd, 0), w.filter((x) => x.b).length, w.filter((x) => !x.b).length, by, s.buyers.size, s.graduated ? 1 : 0, alive);
    s.cp[cp] = { mc: s.lastMc, buyers: s.buyers.size };
  }
}
setInterval(() => { // quiet tokens still get their checkpoints; housekeeping
  const now = Math.floor(Date.now() / 1000);
  for (const [k, s] of S) {
    sample(s, now);
    const idle = now - (s.lastTs || now);
    const keep = openForToken(k) || (s.createTs && now - s.createTs < 86400 && s.walletBuys.length) || idle < 7200 || (s.createTs && s.nextCp < C.LIFE_CHECKPOINTS.length && now - s.createTs < 90000);
    if (!keep) S.delete(k);
  }
  ts.tracked = S.size;
}, 30_000);
setInterval(() => { // persist token summaries + wallet peaks
  const upd = db.prepare(`UPDATE tokens SET buyers_total=?, peak_mc=MAX(COALESCE(peak_mc,0),?), last_ts=?, bundle_pct=?, bundle_usd=?, bundle_wallets=?, dev_buy_usd=?, snipers=? WHERE token=?`);
  const tx = db.transaction(() => {
    for (const s of S.values()) {
      if (s.dirty && s.createTs) { upd.run(s.buyers.size, s.peakMc, s.lastTs, s.createBlock ? (s.bundle.tokens / C.TOTAL_SUPPLY) * 100 : null, s.bundle.usd, s.bundle.wallets.size, s.devBuyUsd, s.snipers.size, s.token); s.dirty = false; }
      for (const b of s.walletBuys) if (b.dirty) { q.updWalletBuy.run(b.p30, b.p24, b.id); b.dirty = false; }
      s.walletBuys = s.walletBuys.filter((b) => Date.now() / 1000 - b.ts <= 86400);
    }
    q.resolveWalletBuys.run(Math.floor(Date.now() / 1000) - 86400);
  });
  try { tx(); } catch (e) { console.error("[persist]", e.message); }
}, 60_000);

// ---------- strategies ----------
function checkEarly(s, now) { // silent sampler: strong inflow in the first 3 minutes (Solana "early")
  if (s.earlyDone || !s.createTs || now - s.createTs > C.EARLY_WINDOW_S) return;
  const w = s.early.filter((x) => now - x.ts <= C.INFLOW_WINDOW_S), usd = w.reduce((a, x) => a + x.usd, 0), wallets = new Set(w.map((x) => x.w)).size;
  if (usd < C.INFLOW_USD || wallets < C.INFLOW_WALLETS) return;
  s.earlyDone = true;
  enter("early", s, feats(s, "early", { note: JSON.stringify({ inflow_usd: Math.round(usd), inflow_wallets: wallets }) }), null);
}

function checkWave2(s, now) {
  if (!s.createTs || s.w2.has("done")) return;
  const age = now - s.createTs, cp = C.W2_CHECKS_S.find((c) => age >= c && age < c + 20 && !s.w2.has(c)); if (!cp) return;
  s.w2.add(cp);
  if (s.lastMc < C.W2_MC_MIN || s.lastMc > C.W2_MC_MAX || s.buyers.size < C.W2_BUYERS_MIN) return;
  const new60 = s.bts.filter((x) => now - x.ts <= 60).length; if (new60 < C.W2_NEW60_MIN) return;
  const r60 = s.ring.filter((x) => now - x.ts <= 60), bu = r60.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = r60.filter((x) => !x.b).reduce((a, x) => a + x.usd, 0);
  if (bu / Math.max(su, 1) < C.W2_BS_MIN) return;
  const ago = s.ring.find((x) => now - x.ts <= 75 && now - x.ts >= 45) || s.ring[0]; if (!ago || !(s.lastPx > ago.px)) return;
  const bundlePct = s.createBlock ? (s.bundle.tokens / C.TOTAL_SUPPLY) * 100 : null; if (bundlePct != null && bundlePct > C.W2_BUNDLE_MAX) return;
  s.w2.add("done");
  const alert = s.buyers.size >= C.W2_ALERT_BUYERS && new60 >= C.W2_ALERT_NEW60;
  enter("wave2", s, feats(s, "wave2", { label: `${Math.round(cp / 60)}m` }), alert ? `🌊 <b>SECOND WAVE</b> — ${title(s)} · +${Math.round(cp / 60)}m\n${s.buyers.size} buyers (${new60} new in 60s) · buy$/sell$ ${(bu / Math.max(su, 1)).toFixed(1)} · price ${((s.lastPx / ago.px - 1) * 100).toFixed(0)}% vs 60s ago\nMC <b>$${fmt(s.lastMc)}</b>\n${launchLine(s)}` : null);
}

function checkMomentum(s, now) {
  const w = s.win5, burst = s.v1 >= C.VOL1M_BURST_USD && s.b1 > s.s1 && s.lastMc >= C.BURST_MIN_MC && (!s.createTs || now - s.createTs >= C.BURST_MIN_AGE_S);
  if (w.v < C.VOL5M_USD && !burst) return;
  const kind = w.v >= C.VOL5M_USD ? "momentum" : "burst";
  if (s.lastMc > C.MOM_MC_CAP || s.lastMc <= 0) return;
  if (s.trades5.length < C.MOM_MIN_TRADES5 || new Set(s.trades5.map((x) => x.w).filter(Boolean)).size < C.MOM_MIN_WALLETS5) return;
  if (s.createTs && now - s.createTs < C.MOM_MIN_AGE_S) return;
  if (w.s > 0 && w.b / w.s < C.MOM_BS_MIN) return; // buyers must outweigh sellers (not dumping)
  const m = s.mom; if (now - m.lastAlert < C.MOM_COOLDOWN_MIN * 60) return;
  if (m.openId && isOpen(m.openId)) return; // one momentum position at a time
  if (m.closed.length) { if (m.closed.length > C.MOM_REENTRY_MAX) return; if (now - m.closed.at(-1) < C.MOM_REENTRY_QUIET_MIN * 60) return; if (m.firstEntryPx && s.lastPx < m.firstEntryPx) return; }
  m.lastAlert = now; if (!m.firstEntryPx) m.firstEntryPx = s.lastPx;
  momentumEntry(s, kind, now).catch((e) => console.error("[momentum]", e.message));
}
async function momentumEntry(s, kind, now) {
  const window = s.trades5.slice(), reentry = s.mom.closed.length;
  // router vs direct: one batched lookup of the window's most recent transactions
  let viaOther = null;
  const txs = [...new Set(window.map((x) => x.tx).filter(Boolean))].slice(-C.ROUTER_SAMPLE);
  if (txs.length) { const info = (await txInfo(txs)).filter(Boolean); if (info.length) viaOther = info.filter((t) => t.to !== C.FLAP_PORTAL && !(s.pool && t.to === s.pool)).length / info.length; }
  const qv = volumeQuality(window, s.seen, viaOther);
  const w = s.win5, hot = w.v >= C.VOL5M_HOT_USD, ageS = s.createTs ? now - s.createTs : null;
  const f = feats(s, kind, { label: reentry ? `re${reentry}` : null, q_score: qv?.score ?? null, q_wallets: qv?.wallets ?? null, q_per10k: qv?.per10k ?? null, q_top3: qv?.top3 ?? null, q_roundtrip: qv?.roundtrip ?? null, q_router: viaOther, q_size_cv: qv?.sizeCv ?? null, q_new_pct: qv?.newPct ?? null, q_px_per10k: qv?.pxPer10k ?? null });
  const icon = kind === "burst" ? "⚡" : hot ? "🔥" : "📈";
  const p = await enter(kind, s, f, `${icon} <b>${kind === "burst" ? "BURST" : "VOLUME"}${reentry ? " RE-ENTRY " + reentry : ""}</b> — ${title(s)}${s.graduated ? " · 🎓 graduated" : ""}\n` +
    `5m vol <b>$${fmt(w.v)}</b> (1m $${fmt(s.v1)}) · buys ${w.nb} / sells ${w.ns} · $${fmt(w.b)} in / $${fmt(w.s)} out · ${s.buyers.size} buyers\n` +
    `MC <b>$${fmt(s.lastMc)}</b> · ${ageStr(ageS)}\n${qualityLine(qv)}\n${launchLine(s)}`);
  s.mom.openId = p?.id ?? null;
}
onClose((p) => { if (p.kind === "momentum" || p.kind === "burst") { const s = S.get(p.token); if (s) { s.mom.closed.push(Math.floor(Date.now() / 1000)); s.mom.openId = null; } } });

function checkRevival(s, now) {
  if (!s.createTs) return; const age = now - s.createTs;
  if (s.revDone || s.graduated || age < C.REV_AGE_MIN_S || age > C.REV_AGE_MAX_S || now - s.lastRev < 30) return;
  s.lastRev = now;
  if (s.lastMc < C.REV_MC_MIN || !(s.peakMc > 0) || s.lastMc > s.peakMc * (1 - C.REV_DRAWDOWN) || now - s.peakTs < C.REV_PEAK_MIN_AGE_S) return;
  const new5 = s.bts.filter((x) => now - x.ts <= 300).length; if (new5 < C.REV_NEW5M_MIN) return;
  const vNow = s.ring.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0), vPrev = s.ring.filter((x) => now - x.ts > 300 && now - x.ts <= 600).reduce((a, x) => a + x.usd, 0);
  if (!(vPrev > 0) || vNow / vPrev < C.REV_VOL_RATIO) return;
  s.revDone = true;
  enter("revival", s, feats(s, "revival", { label: `${Math.round(age / 60)}m`, note: JSON.stringify({ peak_mc: Math.round(s.peakMc), vol_ratio: +(vNow / vPrev).toFixed(2) }) }),
    `🔁 <b>REVIVAL</b> — ${title(s)} · ${Math.round(age / 60)}m old\nFell ${((1 - s.lastMc / s.peakMc) * 100).toFixed(0)}% from peak $${fmt(s.peakMc)} · ${new5} new buyers in 5m · volume ${(vNow / vPrev).toFixed(1)}x previous 5m\nMC <b>$${fmt(s.lastMc)}</b>`);
}

function checkGradRunner(s, now) {
  if (!s.graduated || s.grDone || !s.gradTs || now - s.gradTs > C.GR_WINDOW_S || now - s.lastGr < 10) return;
  s.lastGr = now;
  const r5 = s.ring.filter((x) => now - x.ts <= 300), vol = r5.reduce((a, x) => a + x.usd, 0); if (vol < C.GR_VOL5M_USD) return;
  if (!(s.lastPx >= s.gradPx) || s.lastMc < 20_000) return;
  const new2 = s.bts.filter((x) => now - x.ts <= 120).length; if (new2 < C.GR_NEW2M_MIN) return;
  const bu = r5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = vol - bu; if (bu / Math.max(su, 1) < C.GR_BS_MIN) return;
  s.grDone = true;
  enter("gradrun", s, feats(s, "gradrun", { label: `${Math.round((now - s.gradTs) / 60)}m` }),
    `🎓🚀 <b>GRADUATION RUNNER</b> — ${title(s)} · ${Math.round((now - s.gradTs) / 60)}m after graduation${s.createTs ? ` (${Math.round((now - s.createTs) / 60)}m old)` : ""}\n5m vol <b>$${fmt(vol)}</b> · ${new2} new buyers in 2m · ${s.buyers.size} buyers · buy$/sell$ ${(bu / Math.max(su, 1)).toFixed(1)}\nMC <b>$${fmt(s.lastMc)}</b>`);
}

function checkGradRecovery(s, now) {
  if (!s.graduated || s.grecDone || !s.gradTs || now - s.lastRev < 30) return;
  if (!(s.gradPeak > 0) || s.lastMc > s.gradPeak * (1 - C.GREC_DRAWDOWN) || s.lastMc < C.REV_MC_MIN) return;
  const new5 = s.bts.filter((x) => now - x.ts <= 300).length; if (new5 < C.GREC_NEW5M_MIN) return;
  const vNow = s.ring.filter((x) => now - x.ts <= 300).reduce((a, x) => a + x.usd, 0), vPrev = s.ring.filter((x) => now - x.ts > 300 && now - x.ts <= 600).reduce((a, x) => a + x.usd, 0);
  if (!(vPrev > 0) || vNow / vPrev < C.REV_VOL_RATIO) return;
  s.grecDone = true;
  enter("gradrec", s, feats(s, "gradrec", { note: JSON.stringify({ grad_peak_mc: Math.round(s.gradPeak), vol_ratio: +(vNow / vPrev).toFixed(2) }) }),
    `🔁🎓 <b>GRADUATION RECOVERY</b> — ${title(s)}${s.createTs ? ` · ${Math.round((now - s.createTs) / 60)}m old` : ""}\nFell ${((1 - s.lastMc / s.gradPeak) * 100).toFixed(0)}% from post-graduation peak $${fmt(s.gradPeak)} · ${new5} new buyers in 5m · volume ${(vNow / vPrev).toFixed(1)}x previous 5m\nMC <b>$${fmt(s.lastMc)}</b>`);
}

function checkSlow(s, now) {
  if (!s.createTs || s.slowDone || !s.dumped || now - s.createTs < C.SLOW_MIN_AGE_S || now - s.lowTs < C.SLOW_SINCE_DUMP_S || now - s.lastSlow < 30) return;
  s.lastSlow = now;
  if (s.lastMc < C.SLOW_MC_MIN || !(s.lastMc >= s.lowMc * (1 + C.SLOW_OFF_LOW))) return;
  const W = C.SLOW_WINDOWS, win = [];
  for (let i = 0; i < W; i++) { const a = now - (i + 1) * 300, b = now - i * 300; win.push({ vol: s.ring.filter((x) => x.ts > a && x.ts <= b).reduce((q2, x) => q2 + x.usd, 0), nb: s.bts.filter((x) => x.ts > a && x.ts <= b).length }); }
  for (let i = 0; i < W - 1; i++) if (!(win[i].vol > win[i + 1].vol && win[i].nb > win[i + 1].nb)) return;
  if (!(win[W - 1].vol > 0)) return;
  const new10 = s.bts.filter((x) => now - x.ts <= 600).length; if (new10 < C.SLOW_NEW10M_MIN) return;
  const r10 = s.ring.filter((x) => now - x.ts <= 600), avg10 = r10.reduce((a, x) => a + x.px, 0) / Math.max(r10.length, 1); if (!(s.lastPx > avg10)) return;
  s.slowDone = true;
  const vols = win.map((x) => Math.round(x.vol)).reverse(), nbs = win.map((x) => x.nb).reverse();
  enter("slow", s, feats(s, "slow", { label: `${Math.round((now - s.createTs) / 60)}m`, note: JSON.stringify({ peak_mc: Math.round(s.peakMc), low_mc: Math.round(s.lowMc), vols, nbs }) }),
    `📈🔁 <b>SLOW BUILD</b> — ${title(s)} · ${Math.round((now - s.createTs) / 60)}m old${s.graduated ? " · graduated" : ""}\nPeak $${fmt(s.peakMc)} → low $${fmt(s.lowMc)} (${Math.round((now - s.lowTs) / 60)}m ago) → now <b>$${fmt(s.lastMc)}</b>\n5m volume ${vols.map((v) => "$" + fmt(v)).join(" → ")} · new buyers ${nbs.join(" → ")} · ${s.buyers.size} buyers total`);
}

function copy(s, t, usd) {
  const label = walletLabel(t.wallet);
  enter("copy", s, feats(s, "copy", { label }), `👁 <b>COPY</b> — ${esc(label)} bought $${fmt(usd)} of ${title(s)}\nMC <b>$${fmt(s.lastMc)}</b> · ${ageStr(s.createTs ? (s.lastTs || Math.floor(Date.now() / 1000)) - s.createTs : null)}`);
}
