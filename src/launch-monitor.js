import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { eventsFromLogs, lamports, rawTok, priceSol } from "./pump-decoder.js";
import { getSolUsd, solUsdCached } from "./price.js";
import { routeOf } from "./routes.js";
import { tg } from "./telegram.js";
import { getSocials, socialsLine, socialsAtLaunch } from "./socials.js";

/** In-memory token state. mint -> {create, slot, trades:[], finalized, tier, bundle:{...}} */
export const live = new Map();
export const memStats = () => { let trades = 0; for (const t of live.values()) trades += t.trades?.length || 0; return { live: live.size, trades }; }; // v0.18.18
export const counters = { txs: 0, creates: 0, trades: 0, tier1: 0, decodeErr: 0 };
const launchRing = []; // v0.18.118 market heat: pump.fun launches in the last hour / 10 min (in memory)
export function launchHeat(now = Math.floor(Date.now() / 1000)) { let i = 0; while (i < launchRing.length && now - launchRing[i] > 3600) i++; if (i) launchRing.splice(0, i); let m10 = 0; for (let j = launchRing.length - 1; j >= 0 && now - launchRing[j] <= 600; j--) m10++; return { launch1h: launchRing.length, launch10m: m10 }; }
const listeners = new Map(); // event -> [fn(token, extra)]   events: create|finalized|trade|graduated|expire
export const on = (ev, fn) => { if (!listeners.has(ev)) listeners.set(ev, []); listeners.get(ev).push(fn); };
export const emit = (ev, t, extra) => { for (const fn of listeners.get(ev) || []) { try { fn(t, extra); } catch (e) { console.error(`[listener:${ev}]`, e.stack || e.message); } } };

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
        peakMc: 0, lastMc: 0, hold: false, factory: false, graduated: false };
      live.set(e.mint, t); launchRing.push(t.ts);
      q.insToken.run(t.mint, t.name, t.symbol, t.uri, t.creator, t.bc, slot, t.ts, sig);
      if (q.creatorRecent.get(t.creator, t.ts - CFG.FACTORY_WINDOW_MIN * 60, t.mint) >= 1) { t.factory = true; q.setFactory.run(t.mint); }
      setTimeout(() => finalize(t), CFG.FINALIZE_MS);
      socialsAtLaunch(t.mint, t.uri, (soc) => { t.socOk = soc.fetched ? (soc.ok ? 1 : 0) : null; try { q.setTokenSocials.run(t.socOk, JSON.stringify({ t: soc.twitter, w: soc.website, k: soc.tiktok, g: soc.telegram }), t.mint); } catch {} }); // v0.18.156: every launch
      emit("create", t);
    } else if (e.type === "trade") {
      if (e.type === "claim") { emit("claim", null, { ...e, sig, venue: "pump" }); continue; }
      counters.trades++;
      const t = live.get(e.mint); if (!t) continue; // not a token we saw created (older launches) — ignore
      const tr = { sig, slot, ts: e.ts || ts, wallet: e.user, isBuy: e.isBuy, sol: lamports(e.sol), tokens: rawTok(e.tokens), price: priceSol(e.vsol, e.vtok), route: routeOf(logs), creatorFee: lamports(e.creatorFee || 0n) };
      t.lastVsol = e.vsol; t.lastVtok = e.vtok;
      const mc = mcUsd(e.vsol, e.vtok); t.lastMc = mc; if (mc > t.peakMc) t.peakMc = mc;
      t.trades.push(tr);
      if (t.finalized && t.tier >= 1) q.insTrade.run(t.mint, sig, slot, tr.ts, tr.wallet, tr.isBuy ? 1 : 0, tr.sol, tr.tokens, tr.price);
      if (!t.graduated && e.vtok <= BigInt(CFG.GRAD_VTOK) * 1_000_000n) { t.graduated = true; q.setGrad.run(t.mint); emit("graduated", t, tr); }
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
    if (CFG.TG_TIER1_ALERTS && bundleSol >= CFG.TG_TIER1_SOL_MIN) getSocials(t.mint, t.uri).then((soc) => {
      q.setTokenSocials.run(soc.fetched ? (soc.ok ? 1 : 0) : null, JSON.stringify({ t: soc.twitter, w: soc.website, k: soc.tiktok, g: soc.telegram }), t.mint);
      if (CFG.ALERT_REQUIRE_SOCIALS && soc.fetched && !soc.ok) return; // no socials = rug candidate, logged only
      tg(`🧱 <b>Prepared launch</b> — ${esc(t.name)} ($${esc(t.symbol)})\n` +
        `Bundle: <b>${pct.toFixed(1)}%</b> of supply · <b>${bundleSol.toFixed(1)} SOL</b> · ${wallets.size} wallets (dev ${devBuy.toFixed(1)} SOL)\n` +
        `${socialsLine(soc)}\nMC now: $${fmt(mc)} · SOL $${solUsdCached().toFixed(0)}\n` +
        links(t.mint) + (t.factory ? "\n⚠️ factory: same creator launched another token in the last 10 min" : ""));
    }).catch(() => {});
  }
  setTimeout(() => expire(t), (t.tier >= 1 ? CFG.TRACK_MIN : CFG.TRACK_MIN_T0) * 60_000);
  emit("finalized", t);
}

export const holds = new Set(); // v0.18.119: mints other modules (Project S) want kept in memory past the usual 5 / 30 min
function expire(t) {
  if (t.hold || holds.has(t.mint)) return setTimeout(() => expire(t), 60_000); // open paper position keeps it alive
  emit("expire", t); live.delete(t.mint);
}

export const links = (m) => `<a href="https://fomo.family/tokens/solana/${m}">FOMO</a> · <a href="https://axiom.trade/t/${m}">Axiom</a> · <a href="https://dexscreener.com/solana/${m}">DexScreener</a> · <a href="https://solscan.io/token/${m}">Solscan</a>\n<code>${m}</code>`;
export const esc = (s) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
export const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toFixed(0));
export function startPriceLoop() { getSolUsd(); setInterval(getSolUsd, 60_000); }
