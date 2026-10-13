// v0.3: cluster tracking, hand-off detection, early-inflow paper entries, parallel paper exits.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { on, esc, fmt, links } from "./launch-monitor.js";
import { walletInfo, rpcUsed } from "./rpc.js";
import { solUsdCached } from "./price.js";
import { tg } from "./telegram.js";

export const sig = { handoffs: 0, entries: 0, closes: 0, graduations: 0 };
const S = new Map(); // mint -> state

function state(t) {
  let s = S.get(t.mint);
  if (!s) {
    s = { cluster: new Set([t.creator]), cIn: 0, cOut: 0, oIn: 0, oOut: 0, oBuyers: new Set(), recentSells: [],
      handoffs: 0, handoffAlerted: false, leaveAlerted: false, win: [], pos: null, lastFlush: 0 };
    S.set(t.mint, s);
  }
  return s;
}

on("finalized", (t) => {
  const s = state(t);
  for (const tr of t.trades) if (tr.isBuy && tr.slot <= t.slot + CFG.BUNDLE_SLOTS) s.cluster.add(tr.wallet);
});

on("trade", (t, tr) => {
  const s = state(t);
  const inCreateSlot = tr.slot <= t.slot + CFG.BUNDLE_SLOTS;
  const isCluster = s.cluster.has(tr.wallet);

  // --- hand-off detection: cluster sell followed by non-cluster buy of ~same tokens within N slots ---
  if (isCluster && !tr.isBuy) {
    s.recentSells.push(tr);
    if (s.recentSells.length > 50) s.recentSells.shift();
  } else if (!isCluster && tr.isBuy && !inCreateSlot && s.recentSells.length) {
    const i = s.recentSells.findIndex((x) => tr.slot - x.slot <= CFG.HANDOFF_SLOTS && Math.abs(tr.tokens - x.tokens) <= CFG.HANDOFF_TOL * x.tokens);
    if (i >= 0) {
      const sell = s.recentSells.splice(i, 1)[0];
      s.handoffs++; sig.handoffs++;
      s.cluster.add(tr.wallet); s.cIn += tr.sol; // rebuy = operator money coming back in
      q.insHandoff.run(t.mint, tr.slot, tr.ts, sell.wallet, tr.wallet, tr.sol, tr.tokens, sell.sig === tr.sig ? 1 : 0);
      q.insCluster.run(t.mint, tr.wallet, "fresh", tr.tokens, tr.sol, tr.slot);
      walletInfo(tr.wallet).then((w) => { if (w.age_s != null) q.updWallet.run(w.funder || null, w.age_s, t.mint, tr.wallet); }).catch(() => {});
      if (s.handoffs >= CFG.HANDOFF_MIN && !s.handoffAlerted) {
        s.handoffAlerted = true;
        tg(`🔁 <b>Hand-off</b> — ${esc(t.name)} ($${esc(t.symbol)})\nBundle wallets selling, fresh wallets rebuying: <b>${s.handoffs}</b> so far · cluster net ${net(s).toFixed(1)} SOL\nBundle ${t.bundle?.pct.toFixed(0) ?? "?"}% · ${t.bundle?.sol.toFixed(1) ?? "?"} SOL · MC $${fmt(t.lastMc)} · age ${age(t)}\n${links(t.mint)}`);
      }
      return afterTrade(t, s, tr, true);
    }
  }

  // --- flows ---
  if (!inCreateSlot) {
    if (isCluster) { if (tr.isBuy) s.cIn += tr.sol; else s.cOut += tr.sol; }
    else { if (tr.isBuy) { s.oIn += tr.sol; s.oBuyers.add(tr.wallet); } else s.oOut += tr.sol; }
  }
  afterTrade(t, s, tr, isCluster);
});

function afterTrade(t, s, tr, isCluster) {
  const now = tr.ts;
  // rolling inflow window (all buys after the create slot)
  if (tr.isBuy && tr.slot > t.slot + CFG.BUNDLE_SLOTS) {
    s.win.push({ ts: now, sol: tr.sol, w: tr.wallet, c: isCluster });
    while (s.win.length && now - s.win[0].ts > CFG.INFLOW_WINDOW_S) s.win.shift();
  }
  // entry trigger
  if (!s.pos && t.finalized && !t.graduated && now - t.ts <= CFG.ENTRY_WINDOW_MIN * 60) {
    const sol = s.win.reduce((a, x) => a + x.sol, 0);
    const wallets = new Set(s.win.map((x) => x.w)).size;
    if (sol >= CFG.INFLOW_SOL && wallets >= CFG.INFLOW_WALLETS) openPaper(t, s, tr, sol, wallets);
  }
  if (s.pos) updatePaper(t, s, tr);
  // cluster leaving alert (tier-1 only)
  if (t.tier >= 1 && t.bundle && !s.leaveAlerted && s.cOut - s.cIn > (CFG.EXIT_OUTFLOW_PCT / 100) * t.bundle.sol) {
    s.leaveAlerted = true;
    if (s.pos || s.handoffAlerted) tg(`📤 <b>Cluster leaving</b> — ${esc(t.name)}: bundle wallets net −${(s.cOut - s.cIn).toFixed(1)} SOL (${(((s.cOut - s.cIn) / t.bundle.sol) * 100).toFixed(0)}% of bundle) · MC $${fmt(t.lastMc)}`);
  }
  if (now - s.lastFlush >= 15) { s.lastFlush = now; flush(t, s); }
}

const net = (s) => s.cIn - s.cOut;
const age = (t) => { const a = Math.floor(Date.now() / 1000) - t.ts; return a < 90 ? `${a}s` : `${Math.floor(a / 60)}m`; };
function flush(t, s) {
  q.updFlows.run(s.cIn, s.cOut, s.oIn, s.oOut, s.oBuyers.size, s.handoffs, net(s), t.peakMc, t.lastMc, t.mint);
}

function openPaper(t, s, tr, inflowSol, wallets) {
  const outsideShare = inflowSol > 0 ? s.win.filter((x) => !x.c).reduce((a, x) => a + x.sol, 0) / inflowSol : 0;
  const entryAge = tr.ts - t.ts;
  const r = q.insPaper.run(t.mint, t.name, tr.ts, t.lastMc, tr.price, t.bundle?.pct ?? 0, t.bundle?.sol ?? 0, s.handoffs, t.tier, t.factory ? 1 : 0, inflowSol, wallets, outsideShare, entryAge, t.lastMc);
  s.pos = { id: r.lastInsertRowid, entry: tr.price, entryMc: t.lastMc, entryTs: tr.ts, peak: tr.price, x: {}, closed: false };
  t.hold = true; sig.entries++;
  tg(`🟢 <b>PAPER ENTRY</b> — ${esc(t.name)} ($${esc(t.symbol)})${t.factory ? " ⚠️factory" : ""}\n` +
     `MC <b>$${fmt(t.lastMc)}</b> · ${age(t)} after launch\n` +
     `Inflow: <b>${inflowSol.toFixed(1)} SOL</b> / ${wallets} wallets in ${CFG.INFLOW_WINDOW_S}s (${(outsideShare * 100).toFixed(0)}% outside cluster)\n` +
     `Bundle ${t.bundle?.pct.toFixed(0) ?? 0}% · ${t.bundle?.sol.toFixed(1) ?? 0} SOL · hand-offs ${s.handoffs} · cluster net ${net(s).toFixed(1)} SOL\n${links(t.mint)}`);
  setTimeout(() => closePaper(t, s, "time"), CFG.MAX_HOLD_MIN * 60_000);
}

function updatePaper(t, s, tr) {
  const p = s.pos; if (p.closed) return;
  const px = tr.price; if (px > p.peak) p.peak = px;
  const mult = px / p.entry, fromPeak = px / p.peak - 1;
  const x = p.x;
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tp == null && mult >= CFG.TP_MULT) x.tp = mult;
  if (x.cluster == null && t.bundle && s.cOut - s.cIn > (CFG.EXIT_OUTFLOW_PCT / 100) * Math.max(t.bundle.sol, 1)) x.cluster = mult;
  if (t.graduated && x.grad == null) x.grad = mult;
  const peakMult = p.peak / p.entry;
  q.updPaper.run(t.peakMc, peakMult, x.cluster ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tp ?? null, x.time ?? null, x.grad ?? null, null, null, null, null, null, 0, p.id);
  if (t.graduated) closePaper(t, s, "graduated");
  else if (x.tsl60 != null && x.cluster != null) closePaper(t, s, "all-exits-hit");
}

function closePaper(t, s, reason) {
  const p = s.pos; if (!p || p.closed) return;
  p.closed = true; t.hold = false; sig.closes++;
  const px = t.trades.at(-1)?.price ?? p.entry; const mult = px / p.entry; const x = p.x;
  if (x.time == null) x.time = mult;
  const peakMult = p.peak / p.entry;
  const pnl = (v) => (v == null ? "—" : `${((v - 1) * 100).toFixed(0)}%`);
  q.updPaper.run(t.peakMc, peakMult, x.cluster ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tp ?? null, x.time, x.grad ?? null, Math.floor(Date.now() / 1000), t.lastMc, px, reason, (x.time - 1) * 100, 1, p.id);
  tg(`${mult >= 1 ? "✅" : "🔴"} <b>PAPER CLOSE</b> — ${esc(t.name)} (${reason})\n` +
     `Entry $${fmt(p.entryMc)} → now $${fmt(t.lastMc)} · peak <b>${peakMult.toFixed(2)}x</b>\n` +
     `Exits: cluster-leave ${pnl(x.cluster)} · TSL40 ${pnl(x.tsl40)} · TSL60 ${pnl(x.tsl60)} · TP${CFG.TP_MULT}x ${pnl(x.tp)} · graduation ${pnl(x.grad)} · hold ${pnl(x.time)}\n` +
     `Hand-offs ${s.handoffs} · outside in ${s.oIn.toFixed(1)} SOL / ${s.oBuyers.size} buyers · cluster net ${net(s).toFixed(1)} SOL\n${links(t.mint)}`);
}

on("graduated", (t, tr) => {
  sig.graduations++;
  if (t.tier >= 1 || S.get(t.mint)?.pos) tg(`🎓 <b>Graduated</b> — ${esc(t.name)} ($${esc(t.symbol)}) at ${age(t)} · MC $${fmt(t.lastMc)} · moving to PumpSwap (curve tracking ends)\n${links(t.mint)}`);
});

on("expire", (t) => { const s = S.get(t.mint); if (s) { flush(t, s); S.delete(t.mint); } });

export const sigStats = () => ({ ...sig, tracked: S.size, open: [...S.values()].filter((s) => s.pos && !s.pos.closed).length, rpc: rpcUsed() });
