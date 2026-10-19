// v0.9: wallet database — scores early buyers by what their entries went on to do (24h peak), leaderboard, watch list / copy alerts.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { on, esc, fmt, links, live } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { tg } from "./telegram.js";
import { solUsdCached } from "./price.js";

export const wb = { recorded: 0, tokensScored: 0, copies: 0 };
const early = new Map();   // mint -> { buyers: Map(wallet -> {ts, age, sol, mc}), cluster:Set, createTs, maxMc, committed }
const peaks = new Map();   // mint -> { createTs, p30: mc, p24: mc, until }
const watch = new Map();   // wallet -> {label, source}
const watchC = new Map();  // creator -> {label}
const copyCooldown = new Map(); // wallet|mint -> ts
let spam = new Set();
const listeners = []; export const onCopy = (fn) => listeners.push(fn);
const cListeners = []; export const onCreatorLaunch = (fn) => cListeners.push(fn);

export function reloadWatch() { watch.clear(); for (const r of q.listWatch.all()) watch.set(r.wallet, { label: r.label, source: r.source }); watchC.clear(); for (const r of q.listWatchCreators.all()) watchC.set(r.creator, { label: r.label }); }
reloadWatch();
// v0.15.1: seed watch lists from config (first-night analysis picks); only adds if not present
try {
  const now0 = Math.floor(Date.now() / 1000);
  for (const w of CFG.WATCH_SEED_WALLETS) if (w.length >= 32 && !watch.has(w)) q.addWatch.run(w, "seed", now0, "seed");
  for (const c of CFG.WATCH_SEED_CREATORS) if (c.length >= 32 && !watchC.has(c)) q.addWatchCreator.run(c, "bundle-group", now0);
  reloadWatch();
} catch (e) { console.error("[watch seed]", e.message); }
export const memStats = () => { let b = 0; for (const e of early.values()) b += e.buyers?.size || 0; return { early: early.size, earlyBuyers: b, peaks: peaks.size }; }; // v0.18.18
export const isWatched = (w) => watch.has(w);
export const watchList = () => [...watch.entries()];

function peakTick(mint, mc, now) {
  let p = peaks.get(mint);
  if (!p) { const t = live.get(mint); const ct = t?.ts ?? (q.tokenMeta.get(mint)?.create_ts) ?? null; if (ct == null) return; p = { createTs: ct, p30: 0, p24: 0, until: ct + 86400, dirty: false }; peaks.set(mint, p); }
  if (now - p.createTs <= 1800 && mc > p.p30) { p.p30 = mc; p.dirty = true; }
  if (now - p.createTs <= 86400 && mc > p.p24) { p.p24 = mc; p.dirty = true; }
}

// --- curve trades: record early buyers ---
on("create", (t) => { early.set(t.mint, { buyers: new Map(), createTs: t.ts, maxMc: 0, committed: false, proven: new Set() }); });
// v0.15.3: proven wallets (>= PROVEN_MIN_BUYS resolved non-bundle early buys, >= PROVEN_MIN_5X of them 5x) — refreshed hourly
let proven = new Set();
const refreshProven = () => { try { proven = new Set(q.provenWallets.all(CFG.PROVEN_MIN_SOL, Math.floor(Date.now() / 1000) - 86400, CFG.WB_MAX_BUYS_PER_DAY, CFG.PROVEN_MIN_BUYS, CFG.PROVEN_MIN_5X).map((r) => r.wallet)); } catch (e) { console.error("[proven]", e.message); } };
refreshProven(); setInterval(refreshProven, 3600_000);
export const provenCount = (mint) => early.get(mint)?.proven.size ?? 0;
export const provenSize = () => proven.size;
export const isProven = (w) => proven.has(w); // v0.18.19
// v0.18.119 Project S: a wallet's scored record — resolved non-bundle early buys (≥ PROVEN_MIN_SOL, ≥ 3 s after launch), how many reached 5x / 10x within 24 h
export function walletRecord(w) { try { const r = q.walletRecord.get(w, CFG.PROVEN_MIN_SOL); return r ? { n: r.n || 0, x5: r.x5 || 0, x10: r.x10 || 0, rate: r.n ? +((r.x5 || 0) / r.n).toFixed(3) : null } : null; } catch { return null; } }
on("trade", (t, tr) => {
  const now = tr.ts;
  peakTick(t.mint, t.lastMc, now);
  const e = early.get(t.mint); if (!e) return;
  if (t.lastMc > e.maxMc) e.maxMc = t.lastMc;
  const age = now - t.ts;
  if (tr.isBuy && age <= CFG.WB_EARLY_S && tr.sol >= CFG.WB_MIN_SOL && !e.buyers.has(tr.wallet) && e.buyers.size < CFG.WB_MAX_PER_TOKEN)
    e.buyers.set(tr.wallet, { ts: now, age, sol: tr.sol, mc: t.lastMc });
  if (tr.isBuy && age <= CFG.PROVEN_WINDOW_S && tr.sol >= CFG.PROVEN_ALERT_MIN_SOL && proven.has(tr.wallet) && !e.proven.has(tr.wallet)) { e.proven.add(tr.wallet); if (e.proven.size === 1 || e.proven.size === 2) tg(`👛 <b>PROVEN WALLET IN</b> — ${esc(t.name)} ($${esc(t.symbol)}) · ${short(tr.wallet)} bought ${tr.sol.toFixed(2)} SOL at ${age}s · MC $${fmt(t.lastMc)} · ${e.proven.size} proven so far\n${links(t.mint)}`); }
  if (tr.isBuy && watch.has(tr.wallet) && tr.sol >= CFG.WB_COPY_MIN_SOL) copySignal(tr.wallet, t.mint, t.name, t.symbol, tr, t.lastMc, "curve");
  if (!e.committed && e.maxMc >= CFG.WB_TOKEN_MIN_MC && age > CFG.WB_EARLY_S) commit(t, e);
});
on("finalized", (t) => {
  const w = watchC.get(t.creator); if (!w) return;
  const a = q.creatorAgg.get(t.creator);
  tg(`🧑‍💻 <b>WATCHED CREATOR LAUNCHED</b> — ${esc(w.label || short(t.creator))}\n${esc(t.name)} ($${esc(t.symbol)}) · bundle ${t.bundle?.pct.toFixed(0) ?? 0}% · ${t.bundle?.sol.toFixed(1) ?? 0} SOL · ${t.bundle?.wallets ?? 0} wallets · MC $${fmt(t.lastMc)}\nCreator record: ${a.n} launches · best $${fmt(a.best || 0)} · ${a.over100k} over $100K · ${a.grads} graduated\n${links(t.mint)}`);
  for (const fn of cListeners) { try { fn({ creator: t.creator, label: w.label, mint: t.mint, name: t.name, symbol: t.symbol, price: t.trades.at(-1)?.price ?? 0, mc: t.lastMc, ts: Math.floor(Date.now() / 1000) }); } catch (e) { console.error("[creator]", e.message); } }
});
on("expire", (t) => { const e = early.get(t.mint); if (e && !e.committed && e.maxMc >= CFG.WB_TOKEN_MIN_MC) commit(t, e); early.delete(t.mint); });
function commit(t, e) {
  e.committed = true;
  const cluster = new Set(db.prepare(`SELECT wallet FROM cluster_wallets WHERE mint=?`).all(t.mint).map((r) => r.wallet)); cluster.add(t.creator);
  const ins = db.transaction(() => { for (const [w, b] of e.buyers) { q.insWB.run(w, t.mint, b.ts, b.age, b.sol, b.mc, cluster.has(w) ? 1 : 0); wb.recorded++; } });
  ins(); wb.tokensScored++;
  const p = peaks.get(t.mint); if (p) q.upPeak.run(t.mint, p.createTs, p.p30, p.p24, p.until);
}

// --- PumpSwap: peaks continue; watched wallets on PumpSwap ---
onSwap((tr) => {
  peakTick(tr.mint, tr.mc, tr.ts);
  if (tr.isBuy && watch.has(tr.wallet) && tr.sol >= CFG.WB_COPY_MIN_SOL) {
    const m = q.tokenMeta.get(tr.mint); copySignal(tr.wallet, tr.mint, m?.name || tr.mint.slice(0, 8), m?.symbol || "", tr, tr.mc, "pumpswap");
  }
});

function copySignal(wallet, mint, name, symbol, tr, mc, venue) {
  const k = wallet + "|" + mint, now = tr.ts; if (now - (copyCooldown.get(k) || 0) < 1800) return; copyCooldown.set(k, now);
  wb.copies++;
  const w = watch.get(wallet);
  tg(`👤 <b>COPY</b> — ${esc(w.label || wallet.slice(0, 6) + "…" + wallet.slice(-4))} bought <b>${tr.sol.toFixed(2)} SOL</b> of ${esc(name)} ($${esc(symbol)}) on ${venue}\nMC <b>$${fmt(mc)}</b> · <a href="https://solscan.io/account/${wallet}">wallet</a>\n${links(mint)}`);
  for (const fn of listeners) { try { fn({ wallet, label: w.label, mint, name, symbol, price: tr.price, mc, ts: now, venue }); } catch (e) { console.error("[copy]", e.message); } }
}

// --- periodic: flush peaks, resolve, prune, refresh spam list ---
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  const tx = db.transaction(() => {
    for (const [mint, p] of peaks) {
      if (p.dirty) { q.upPeak.run(mint, p.createTs, p.p30, p.p24, p.until); p.dirty = false; }
      if (now > p.until) peaks.delete(mint);
    }
    q.resolveWB.run(now);
  });
  tx();
}, 60_000);
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  q.pruneWB.run(now - CFG.WB_RETAIN_D * 86400); q.prunePeaks.run(now - 2 * 86400);
  spam = new Set(q.spamWallets.all(now - 86400, CFG.WB_MAX_BUYS_PER_DAY).map((r) => r.wallet));
}, 3600_000);

const short = (w) => w.slice(0, 4) + "…" + w.slice(-4);
const pct = (x) => `${Math.round((x || 0) * 100)}%`;
export function leaderboardText(days = 7, limit = 10) {
  const from = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = q.leaderboard.all(CFG.WB_MIN_AGE_S, from, CFG.WB_MIN_BUYS, limit * 3).filter((r) => !spam.has(r.wallet)).slice(0, limit);
  if (!rows.length) return `🏆 <b>Wallet leaderboard</b> — not enough resolved data yet (needs ${CFG.WB_MIN_BUYS}+ scored buys per wallet; buys resolve 24h after launch)`;
  let t = `🏆 <b>Wallet leaderboard</b> — last ${days}d · early buys ≤${CFG.WB_EARLY_S}s, ≥${CFG.WB_MIN_SOL} SOL · no bundle/0s buys · ranked by 5x hit rate (base ~25%)\n`;
  rows.forEach((r, i) => {
    const ago = Math.floor((Date.now() / 1000 - r.last_ts) / 3600);
    t += `${i + 1}. <code>${r.wallet}</code>${watch.has(r.wallet) ? " 👁" : ""}\n   ${r.n} buys · 5x <b>${pct(r.r5)}</b> · 10x <b>${pct(r.r10)}</b> · 2x ${pct(r.r2)} · avg peak ${(r.avgpeak || 0).toFixed(1)}x · entry ~$${fmt(r.avgmc)} @${Math.round(r.avgage)}s · ${(r.avgsol).toFixed(1)} SOL · ${ago}h ago\n`;
  });
  t += `\n/watch &lt;wallet&gt; to copy-trade one`;
  return t;
}
export function walletText(wallet) {
  const s = q.walletStats.get(wallet);
  if (!s || !s.n) return `No early buys recorded for <code>${wallet}</code> yet.`;
  const rec = q.walletRecent.all(wallet);
  let t = `👛 <code>${wallet}</code>${watch.has(wallet) ? " 👁 watched" : ""}\n${s.n} scored buys (${s.pending} pending) · 5x ${pct(s.h4 / s.n)} · 10x ${pct(s.h10 / s.n)} · 2x ${pct(s.h2 / s.n)} · avg peak ${(s.avgpeak || 0).toFixed(1)}x · entry ~$${fmt(s.avgmc || 0)}\nRecent:\n`;
  for (const r of rec) t += `• ${esc(r.name || r.mint.slice(0, 8))} @${r.age_s}s $${fmt(r.entry_mc)} ${r.sol.toFixed(1)} SOL → ${r.resolved ? `peak $${fmt(r.peak_24h)} (${(r.peak_24h / r.entry_mc).toFixed(1)}x)` : "pending"}\n`;
  return t;
}
export function addWatch(wallet, label, source = "manual") { q.addWatch.run(wallet, label || null, Math.floor(Date.now() / 1000), source); reloadWatch(); }
export function removeWatch(wallet) { q.delWatch.run(wallet); reloadWatch(); }
export const wbStats = () => ({ ...wb, early: early.size, peaks: peaks.size, watched: watch.size });

export function creatorsText(days = 7, limit = 10) {
  const from = Math.floor(Date.now() / 1000) - days * 86400;
  const rows = q.creatorsTop.all(from, 2, limit);
  if (!rows.length) return "🧑‍💻 <b>Creators</b> — no creators with 2+ launches yet";
  let t = `🧑‍💻 <b>Top creators</b> — last ${days}d · 2+ launches · ranked by graduations (≥2 prior grads ≈ 4× base odds)\n`;
  rows.forEach((r, i) => {
    const ago = Math.floor((Date.now() / 1000 - r.last_ts) / 3600);
    t += `${i + 1}. <code>${r.creator}</code>${watchC.has(r.creator) ? " 👁" : ""}\n   ${r.n} launches · best <b>$${fmt(r.best || 0)}</b> · ${r.over100k} over $100K · ${r.grads} graduated · avg bundle ${Math.round(r.avgbundle || 0)}%${r.fac ? " · ⚠️factory " + r.fac : ""} · ${ago}h ago\n`;
  });
  return t + "\n/watchcreator &lt;address&gt; to be alerted on their next launch";
}
export function creatorText(creator) {
  const a = q.creatorAgg.get(creator); if (!a || !a.n) return `No launches seen from <code>${creator}</code>.`;
  let t = `🧑‍💻 <code>${creator}</code>${watchC.has(creator) ? " 👁 watched" : ""}\n${a.n} launches · best $${fmt(a.best || 0)} · avg peak $${fmt(a.avgpeak || 0)} · ${a.over100k} over $100K · ${a.grads} graduated · first seen ${Math.floor((Date.now() / 1000 - a.first_ts) / 3600)}h ago\nRecent:\n`;
  for (const r of q.creatorTokens.all(creator)) t += `• ${esc(r.name)} ($${esc(r.symbol)}) · bundle ${Math.round(r.bundle_pct || 0)}% ${(r.bundle_sol || 0).toFixed(0)} SOL → peak $${fmt(r.peak_mc_usd || 0)}${r.graduated ? " 🎓" : ""}\n`;
  return t;
}
export function addWatchCreator(c, label) { q.addWatchCreator.run(c, label || null, Math.floor(Date.now() / 1000)); reloadWatch(); }
export function removeWatchCreator(c) { q.delWatchCreator.run(c); reloadWatch(); }
export const watchCreatorList = () => [...watchC.entries()];
