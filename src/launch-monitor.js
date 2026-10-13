import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { eventsFromLogs, lamports, rawTok, priceSol } from "./pump-decoder.js";
import { getSolUsd, solUsdCached } from "./price.js";
import { tg } from "./telegram.js";

/** In-memory token state. mint -> {create, slot, trades:[], finalized, tier, bundle:{...}} */
export const live = new Map();
export const counters = { txs: 0, creates: 0, trades: 0, tier1: 0, decodeErr: 0 };
const listeners = []; // (event, token) => void   event: 'create'|'finalized'|'trade'|'expire'
export const on = (fn) => listeners.push(fn);
const emit = (ev, t, extra) => { for (const fn of listeners) { try { fn(ev, t, extra); } catch (e) { console.error("[listener]", e.message); } } };

const mcUsd = (vsol, vtok) => priceSol(vsol, vtok) * CFG.TOTAL_SUPPLY * solUsdCached();

export function handleTx({ sig, slot, logs, err }) {
  counters.txs++;
  if (err) return;
  const evs = eventsFromLogs(logs);
  if (!evs.length) return;
  const ts = Math.floor(Date.now() / 1000);
  for (const e of evs) {
    if (e.type === "create") {
      counters.creates++;
      const t = { mint: e.mint, name: e.name, symbol: e.symbol, uri: e.uri, creator: e.creator, bc: e.bondingCurve,
        slot, ts: e.ts || ts, sig, trades: [], finalized: false, tier: 0, bundle: null, lastVsol: e.vsol, lastVtok: e.vtok,
        peakMc: 0, lastMc: 0 };
      live.set(e.mint, t);
      q.insToken.run(t.mint, t.name, t.symbol, t.uri, t.creator, t.bc, slot, t.ts, sig);
      setTimeout(() => finalize(t), CFG.FINALIZE_MS);
      setTimeout(() => expire(t), CFG.TRACK_MIN * 60_000);
      emit("create", t);
    } else if (e.type === "trade") {
      counters.trades++;
      const t = live.get(e.mint); if (!t) continue; // not a token we saw created (older launches) — ignore
      const tr = { sig, slot, ts: e.ts || ts, wallet: e.user, isBuy: e.isBuy, sol: lamports(e.sol), tokens: rawTok(e.tokens), price: priceSol(e.vsol, e.vtok) };
      t.lastVsol = e.vsol; t.lastVtok = e.vtok;
      const mc = mcUsd(e.vsol, e.vtok); t.lastMc = mc; if (mc > t.peakMc) t.peakMc = mc;
      if (!t.finalized || t.tier >= 1) t.trades.push(tr);
      if (t.tier >= 1) q.insTrade.run(t.mint, sig, slot, tr.ts, tr.wallet, tr.isBuy ? 1 : 0, tr.sol, tr.tokens, tr.price);
      emit("trade", t, tr);
    }
  }
}

function finalize(t) {
  if (t.finalized) return;
  t.finalized = true;
  const maxSlot = t.slot + CFG.BUNDLE_SLOTS;
  const buys = t.trades.filter((x) => x.isBuy && x.slot <= maxSlot);
  const wallets = new Map();
  let devBuy = 0;
  for (const b of buys) {
    const w = wallets.get(b.wallet) || { tokens: 0, sol: 0, first: b.slot };
    w.tokens += b.tokens; w.sol += b.sol; wallets.set(b.wallet, w);
    if (b.wallet === t.creator) devBuy += b.sol;
  }
  const bundleTokens = [...wallets.values()].reduce((a, w) => a + w.tokens, 0);
  const bundleSol = [...wallets.values()].reduce((a, w) => a + w.sol, 0);
  const pct = (bundleTokens / CFG.TOTAL_SUPPLY) * 100;
  t.bundle = { sol: bundleSol, tokens: bundleTokens, pct, wallets: wallets.size, devBuy };
  t.tier = pct >= CFG.BUNDLE_PCT_MIN && bundleSol >= CFG.BUNDLE_SOL_MIN ? 1 : 0;
  const mc = mcUsd(t.lastVsol, t.lastVtok);
  q.finToken.run(bundleSol, bundleTokens, pct, wallets.size, devBuy, t.tier, mc, t.peakMc || mc, mc, t.mint);
  if (t.tier >= 1) {
    counters.tier1++;
    const ins = db.transaction(() => {
      for (const [w, v] of wallets) q.insCluster.run(t.mint, w, w === t.creator ? "dev" : "bundle", v.tokens, v.sol, v.first);
      for (const tr of t.trades) q.insTrade.run(t.mint, tr.sig, tr.slot, tr.ts, tr.wallet, tr.isBuy ? 1 : 0, tr.sol, tr.tokens, tr.price);
    });
    ins();
    if (CFG.TG_TIER1_ALERTS && bundleSol >= CFG.TG_TIER1_SOL_MIN) tg(
      `🧱 <b>Prepared launch</b> — ${esc(t.name)} ($${esc(t.symbol)})\n` +
      `Bundle: <b>${pct.toFixed(1)}%</b> of supply · <b>${bundleSol.toFixed(1)} SOL</b> · ${wallets.size} wallets (dev ${devBuy.toFixed(1)} SOL)\n` +
      `MC now: $${fmt(mc)} · SOL $${solUsdCached().toFixed(0)}\n` +
      `<a href="https://pump.fun/coin/${t.mint}">pump.fun</a> · <a href="https://solscan.io/token/${t.mint}">solscan</a> · <a href="https://isitbundled.com/token/${t.mint}">isitbundled</a>\n<code>${t.mint}</code>`
    );
  } else {
    t.trades.length = 0; // free memory for the 95%
  }
  emit("finalized", t);
}

function expire(t) { emit("expire", t); live.delete(t.mint); }

export const esc = (s) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
export const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(0));
export function startPriceLoop() { getSolUsd(); setInterval(getSolUsd, 60_000); }
