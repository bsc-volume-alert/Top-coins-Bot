// v0.3: cluster tracking, hand-off detection, early-inflow paper entries, parallel paper exits.
import { CFG, OFF_KINDS } from "./config.js"; // v0.18.176 OFF_KINDS: early / secondwave / confirm switched off
import { db, q } from "./db.js";
import { on, esc, fmt, links, live } from "./launch-monitor.js";
const liveToken = (m) => live.get(m);
import { walletInfo, rpcUsed } from "./rpc.js";
import { solUsdCached } from "./price.js";
import { tg } from "./telegram.js";
import { getSocials, socialsLine } from "./socials.js";
import { nextLevel, wallWarning, levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
import { provenCount } from "./wallets.js";
import { stopStep, stopFinal, pathStep } from "./exits.js";
import { feeInfo } from "./fees.js";
import { recordHolders } from "./holders.js";
import { watch as afterWatch, tick as afterTick } from "./aftercare.js";
import { retrySocials } from "./socials.js";

export const sig = { handoffs: 0, entries: 0, closes: 0, graduations: 0 };
const S = new Map(); // mint -> state

function state(t) {
  let s = S.get(t.mint);
  if (!s) {
    s = { cluster: new Set([t.creator]), cIn: 0, cOut: 0, oIn: 0, oOut: 0, oBuyers: new Set(), recentSells: [],
      handoffs: 0, handoffAlerted: false, leaveAlerted: false, win: [], pos: null, lastFlush: 0, buys: 0, sells: 0, buyersAt: {}, wavePeakIn: 0, fadeSince: 0, outflowAt: 0, outflowTs: 0, wave1PeakMc: 0, sw: null, swDone: false, seenBuyers: new Set(), v5: [], psVol5: 0 };
    S.set(t.mint, s);
  }
  return s;
}

on("finalized", (t) => {
  const s = state(t);
  if (t.tier >= 1) walletInfo(t.creator).then((w) => { if (w.age_s != null || w.funder) q.setCreatorFunder.run(w.funder || null, w.age_s ?? null, w.funded_sol ?? null, t.mint); }).catch(() => {});
  for (const tr of t.trades) if (tr.isBuy && tr.slot <= t.slot + CFG.BUNDLE_SLOTS) s.cluster.add(tr.wallet);
  s.cTok = t.trades.filter((x) => s.cluster.has(x.wallet)).reduce((a, x) => a + (x.isBuy ? x.tokens : -x.tokens), 0);
});
const heldPct = (s) => Math.max(0, (s.cTok || 0) / CFG.TOTAL_SUPPLY) * 100;

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
      s.cluster.add(tr.wallet); s.cIn += tr.sol; s.cTok = (s.cTok || 0) + tr.tokens; // rebuy = operator money coming back in
      q.insHandoff.run(t.mint, tr.slot, tr.ts, sell.wallet, tr.wallet, tr.sol, tr.tokens, sell.sig === tr.sig ? 1 : 0);
      q.insCluster.run(t.mint, tr.wallet, "fresh", tr.tokens, tr.sol, tr.slot);
      walletInfo(tr.wallet).then((w) => { if (w.age_s != null) q.updWallet.run(w.funder || null, w.age_s, t.mint, tr.wallet); }).catch(() => {});
      if (s.handoffs >= CFG.HANDOFF_MIN && !s.handoffAlerted) {
        s.handoffAlerted = true;
        if (s.pos?.msgId) tg(`🔁 <b>Hand-off</b> — ${esc(t.name)}: bundle wallets selling, fresh wallets rebuying — <b>${s.handoffs}</b> so far · MC $${fmt(t.lastMc)} · ${age(t)}`, { replyTo: s.pos.msgId });
      }
      return afterTrade(t, s, tr, true);
    }
  }

  // --- cluster token holdings (bundle buys incl. create slot) ---
  if (isCluster) s.cTok = (s.cTok || 0) + (tr.isBuy ? tr.tokens : -tr.tokens);
  // --- flows ---
  if (!inCreateSlot) {
    if (tr.isBuy) s.buys++; else s.sells++;
    if (isCluster) { if (tr.isBuy) s.cIn += tr.sol; else s.cOut += tr.sol; }
    else { if (tr.isBuy) { s.oIn += tr.sol; s.oBuyers.add(tr.wallet); } else s.oOut += tr.sol; }
  }
  afterTrade(t, s, tr, isCluster);
});

function afterTrade(t, s, tr, isCluster) {
  const now = tr.ts;
  s.v5.push({ ts: now, sol: tr.sol, b: tr.isBuy }); while (s.v5.length && now - s.v5[0].ts > 300) s.v5.shift();
  afterTick(t.mint, tr.price, t.lastMc);
  // rolling inflow window (all buys after the create slot)
  if (tr.isBuy && tr.slot > t.slot + CFG.BUNDLE_SLOTS) {
    s.win.push({ ts: now, sol: tr.sol, w: tr.wallet, c: isCluster });
    while (s.win.length && now - s.win[0].ts > CFG.INFLOW_WINDOW_S) s.win.shift();
  }
  const sol60 = s.win.reduce((a, x) => a + x.sol, 0);
  if (sol60 > s.wavePeakIn) s.wavePeakIn = sol60;
  if (t.lastMc > s.wave1PeakMc && now - t.ts <= CFG.ENTRY_WINDOW_MIN * 60) s.wave1PeakMc = t.lastMc;
  // entry trigger (early)
  if (!s.pos && t.finalized && !t.graduated && now - t.ts <= CFG.ENTRY_WINDOW_MIN * 60) {
    const wallets = new Set(s.win.map((x) => x.w)).size;
    if (sol60 >= CFG.INFLOW_SOL && wallets >= CFG.INFLOW_WALLETS && !OFF_KINDS.has("early")) openPaper(t, s, tr, sol60, wallets, "early"); // v0.18.176 (owner go 21 Oct 13:50 UK): early book off
  }
  if (s.pos) updatePaper(t, s, tr);
  if (s.confPos && !s.confPos.closed && s.confPos !== s.pos) { const keep = s.pos; s.pos = s.confPos; updatePaper(t, s, tr); s.pos = keep; }
  // second wave: first wave faded, cluster finished selling, buyers return
  if (!s.swDone && t.finalized && !t.graduated && now - t.ts > CFG.ENTRY_WINDOW_MIN * 60 && now - t.ts <= CFG.SW_WINDOW_MIN * 60 && s.wavePeakIn >= CFG.INFLOW_SOL) {
    const faded = sol60 < CFG.SW_FADE_FRAC * s.wavePeakIn;
    if (faded) { if (!s.fadeSince) s.fadeSince = now; }
    const outflow = s.cOut - s.cIn;
    if (Math.abs(outflow - s.outflowAt) > 0.5) { s.outflowAt = outflow; s.outflowTs = now; }
    const quietLong = s.fadeSince && now - s.fadeSince >= CFG.SW_QUIET_MIN * 60;
    const clusterFlat = now - (s.outflowTs || t.ts) >= CFG.SW_CLUSTER_FLAT_MIN * 60;
    if (s.fadeSince && quietLong && clusterFlat && !faded) {
      const fresh = s.win.filter((x) => x.isBuy !== false && !s.seenBuyers.has(x.w)).map((x) => x.w);
      const wallets = new Set(fresh).size;
      if (sol60 >= CFG.SW_INFLOW_SOL && wallets >= CFG.SW_INFLOW_WALLETS && (!s.pos || s.pos.closed)) {
        s.swDone = true; if (!OFF_KINDS.has("secondwave")) openPaper(t, s, tr, sol60, wallets, "secondwave"); // v0.18.176 (owner go 21 Oct 13:50 UK): secondwave book off (the decision is still made once)
      }
    }
    if (!faded && s.fadeSince && !quietLong) s.fadeSince = 0; // bounce too soon, reset
  }
  if (tr.isBuy && now - t.ts <= CFG.ENTRY_WINDOW_MIN * 60) s.seenBuyers.add(tr.wallet);
  // confirmation: 4–10 min after the raw trigger, MC up ≥1.5× raw entry, buys/sells ≥1.3 (5m), buyers growing
  if (s.rawPosId && !s.confDone && !t.graduated) {
    const dt = now - s.rawEntryTs;
    if (dt > CFG.CONF_MAX_S) s.confDone = true;
    else if (dt >= CFG.CONF_MIN_S) {
      const b5 = s.v5.filter((x) => x.b).length, s5 = s.v5.length - b5, ratio = s5 > 0 ? b5 / s5 : b5;
      const buyersNow = s.oBuyers.size + s.cluster.size;
      if (t.lastMc >= CFG.CONF_MC_MULT * s.rawEntryMc && ratio >= CFG.CONF_BS_RATIO && buyersNow - s.buyersAtRaw >= CFG.CONF_BUYERS_GROW) {
        s.confDone = true;
        if (!OFF_KINDS.has("confirm")) { // v0.18.176 (owner go 21 Oct 13:50 UK): the old curve confirmation book off (not executor A5 / p5c5)
        const prev = s.pos; // raw position keeps running; confirmation is a separate trade
        const sol60 = s.win.reduce((a, x) => a + x.sol, 0), wallets = new Set(s.win.map((x) => x.w)).size;
        openPaper(t, s, tr, sol60, wallets, "confirm");
        s.confPos = s.pos; s.pos = prev && !prev.closed ? prev : s.pos; } // keep raw as primary for updates; confirm tracked via confPos
      }
    }
  }
  // cluster leaving alert (tier-1 only)
  if (t.tier >= 1 && t.bundle && !s.leaveAlerted && s.cOut - s.cIn > (CFG.EXIT_OUTFLOW_PCT / 100) * t.bundle.sol) {
    s.leaveAlerted = true; // logged via exit variants; no alert (operators selling into the pump is expected)
  }
  if (now - s.lastFlush >= 15) { s.lastFlush = now; flush(t, s); }
}

const net = (s) => s.cIn - s.cOut;
const vol5Usd = (s) => (s.psVol5 || s.v5.reduce((a, x) => a + x.sol, 0) * solUsdCached());
const buySellUsd = (s) => s.psBS || [s.v5.filter((x) => x.b).reduce((a, x) => a + x.sol, 0) * solUsdCached(), s.v5.filter((x) => !x.b).reduce((a, x) => a + x.sol, 0) * solUsdCached()];
const age = (t) => { const a = Math.floor(Date.now() / 1000) - t.ts; return a < 90 ? `${a}s` : `${Math.floor(a / 60)}m`; };
function flush(t, s) {
  q.updFlows.run(s.cIn, s.cOut, s.oIn, s.oOut, s.oBuyers.size, s.handoffs, net(s), t.peakMc, t.lastMc, t.mint);
}

function openPaper(t, s, tr, inflowSol, wallets, strategy = "early") {
  const outsideShare = inflowSol > 0 ? s.win.filter((x) => !x.c).reduce((a, x) => a + x.sol, 0) / inflowSol : 0;
  const entryAge = tr.ts - t.ts;
  s.buyersAt.entry = s.oBuyers.size + s.cluster.size;
  const r = q.insPaper.run(t.mint, t.name, tr.ts, t.lastMc, tr.price, t.bundle?.pct ?? 0, t.bundle?.sol ?? 0, s.handoffs, t.tier, t.factory ? 1 : 0, inflowSol, wallets, outsideShare, entryAge, t.lastMc, strategy, nextLevel(t.lastMc), s.wave1PeakMc || null);
  s.pos = { id: r.lastInsertRowid, entry: tr.price, entryMc: t.lastMc, entryTs: tr.ts, peak: tr.price, x: {}, closed: false, msgId: null, alerted: false, half: false, s3: false, lv: newLevels(), strategy, m1: { hit: false } };
  q.setPaperExtra.run(heldPct(s), strategy, r.lastInsertRowid);
  s.pos.volAtEntry = vol5Usd(s); q.setVolEntry.run(s.pos.volAtEntry, r.lastInsertRowid);
  try { s.provenAtEntry = provenCount(t.mint); q.setEntryCounts.run(s.buys, s.sells, s.provenAtEntry, r.lastInsertRowid); } catch {}
  try { const fi = feeInfo(t.mint, t.creator, t.ts); q.setFees.run(fi.accrued, fi.claims, fi.claimedSol, r.lastInsertRowid); } catch {} // v0.18.4
  try { recordHolders(r.lastInsertRowid, t.mint, t.creator); } catch {} // v0.18.5
  try {
    const ch = q.creatorHist.get(t.creator, t.mint, t.ts); s.creatorHist = ch;
    const snipers = t.trades.filter((x) => x.isBuy && x.slot <= t.slot + CFG.BUNDLE_SLOTS && x.wallet !== t.creator).length;
    const bsr = s.sells > 0 ? s.buys / s.sells : s.buys;
    q.setFeatures.run(ch?.n ?? 0, ch?.best ?? null, t.bundle?.devBuy ?? 0, snipers, new Date(tr.ts * 1000).getUTCHours(), s.rawPosId ?? null, bsr, s.oBuyers.size + s.cluster.size, r.lastInsertRowid);
  } catch (e) { console.error("[features]", e.message); }
  if (strategy === "early") { s.rawPosId = r.lastInsertRowid; s.rawEntryMc = t.lastMc; s.rawEntryTs = tr.ts; s.buyersAtRaw = s.oBuyers.size + s.cluster.size; s.confDone = false; }
  afterWatch(t.mint, r.lastInsertRowid, tr.price, t.lastMc);
  t.hold = true; sig.entries++;
  const pRef = s.pos;
  setTimeout(() => closePaper(t, s, "time", pRef), CFG.MAX_HOLD_MIN * 60_000);
  const strong = strategy === "secondwave" || (strategy === "confirm" && s.oBuyers.size + s.cluster.size >= CFG.CONF_ALERT_BUYERS) || (strategy !== "confirm" && (t.tier >= 1 || (inflowSol >= CFG.ALERT_INFLOW_SOL && wallets >= CFG.ALERT_INFLOW_WALLETS))); // v0.15: confirm alerts only with >=250 buyers
  const p = s.pos;
  getSocials(t.mint, t.uri).then(async (soc) => {
    const socStr = JSON.stringify({ t: soc.twitter, w: soc.website, k: soc.tiktok, g: soc.telegram });
    q.setTokenSocials.run(soc.fetched ? (soc.ok ? 1 : 0) : null, socStr, t.mint);
    const alert = strong && (!CFG.ALERT_REQUIRE_SOCIALS || soc.ok || !soc.fetched);
    q.setPaperMeta.run(alert ? 1 : 0, socStr, soc.fetched ? (soc.ok ? 1 : 0) : null, p.id);
    if (!soc.fetched) retrySocials(t.mint, t.uri, (s2) => { const str = JSON.stringify({ t: s2.twitter, w: s2.website, k: s2.tiktok, g: s2.telegram }); q.setTokenSocials.run(s2.ok ? 1 : 0, str, t.mint); q.setPaperSocials.run(str, s2.ok ? 1 : 0, p.id); if (p.msgId) tg(`socials (late): ${socialsLine(s2)}`, { replyTo: p.msgId }); });
    if (!alert) return;
    p.alerted = true;
    const nowMc = t.lastMc, chg = p.entryMc > 0 ? ((nowMc / p.entryMc - 1) * 100).toFixed(0) : "0";
    const wall = wallWarning(p.entryMc);
    const head = strategy === "secondwave" ? "🌊 <b>SECOND WAVE</b>" : strategy === "confirm" ? "✅ <b>CONFIRMED</b>" : "🟢 <b>PAPER ENTRY</b>";
    const waveStr = strategy === "secondwave" && s.wave1PeakMc ? ` · wave-1 peak $${fmt(s.wave1PeakMc)} (${((p.entryMc / s.wave1PeakMc - 1) * 100).toFixed(0)}% from it)` : strategy === "confirm" ? ` · raw entry $${fmt(s.rawEntryMc)} (${((p.entryMc / s.rawEntryMc - 1) * 100).toFixed(0)}% up)` : "";
    p.msgId = await tg(`${head} — ${esc(t.name)} ($${esc(t.symbol)})${t.factory ? " ⚠️factory" : ""}\n` +
      `MC <b>$${fmt(p.entryMc)}</b> · ${entryAge}s after launch · now $${fmt(nowMc)} (${chg >= 0 ? "+" : ""}${chg}%)${waveStr}${wall ? "\n" + wall : ""}\n` +
      `${socialsLine(soc)}\n` +
      `Inflow: <b>${inflowSol.toFixed(1)} SOL</b> / ${wallets} wallets in ${CFG.INFLOW_WINDOW_S}s · buys ${s.buys} / sells ${s.sells}\n` +
      `Bundle ${t.bundle?.pct.toFixed(0) ?? 0}% · ${t.bundle?.sol.toFixed(1) ?? 0} SOL · hand-offs ${s.handoffs} · cluster holds <b>${heldPct(s).toFixed(0)}%</b>` +
      (s.provenAtEntry ? `\n👛 <b>${s.provenAtEntry} proven wallet${s.provenAtEntry > 1 ? "s" : ""}</b> in the first ${CFG.PROVEN_WINDOW_S}s` : "") + (s.creatorHist?.n ? `\n🧑‍💻 creator: ${s.creatorHist.n} prior launches · ${s.creatorHist.grads || 0} graduated · ${s.creatorHist.over100k || 0} over $100K${(s.creatorHist.grads || 0) >= CFG.CREATOR_GRADS_FLAG ? " ⭐ proven" : ""}` : "") + `\n${links(t.mint)}`);
    for (const m of CFG.SCORECARD_MIN) setTimeout(() => scorecard(t, s, m, p), m * 60_000);
  }).catch((e) => console.error("[socials]", e.message));
}

function scorecard(t, s, m, p = s.pos) {
  if (!p) return;
  const px = t.trades.at(-1)?.price ?? p.entry, mult = px / p.entry, peakMult = p.peak / p.entry;
  const buyers = s.oBuyers.size + s.cluster.size;
  const prevBuyers = s.buyersAt[m === CFG.SCORECARD_MIN[0] ? "entry" : CFG.SCORECARD_MIN[0]] ?? s.buyersAt.entry ?? 0;
  s.buyersAt[m] = buyers;
  const flags = [];
  const mcChg = (mult - 1) * 100;
  if (m === CFG.SCORECARD_MIN[0] && mcChg < CFG.FLAT_MC_PCT && peakMult < 1 + CFG.FLAT_MC_PCT / 100) flags.push("💤 MC flat — likely dead");
  const inflow = s.oIn + s.cIn;
  if (buyers - prevBuyers < 5 && inflow > 5) flags.push("⚠️ volume but no new wallets");
  if (s.sells > s.buys) flags.push("⚠️ sells outnumber buys");
  if (t.graduated) flags.push("🎓 graduated to PumpSwap");
  if (p.closed) flags.push(`closed (${p.closeReason})`);
  q.setPaperCard.run(m === 5 ? t.lastMc : null, m === 15 ? t.lastMc : null, m === 5 ? buyers : null, s.buys, s.sells, p.id);
  tg(`⏱ <b>+${m}m</b> ${esc(t.name)} · MC <b>$${fmt(t.lastMc)}</b> (${mcChg >= 0 ? "+" : ""}${mcChg.toFixed(0)}% from entry, peak ${peakMult.toFixed(2)}x)\n` +
     `Buyers ${buyers} (+${buyers - prevBuyers}) · buys ${s.buys} / sells ${s.sells} · outside in ${s.oIn.toFixed(1)} SOL · hand-offs ${s.handoffs} · cluster holds ${heldPct(s).toFixed(0)}%` +
     (flags.length ? `\n${flags.join(" · ")}` : ""), { replyTo: p.msgId });
}

function updatePaper(t, s, tr) {
  const p = s.pos; if (p.closed) return;
  const px = tr.price; if (px > p.peak) p.peak = px;
  const mult = px / p.entry, fromPeak = px / p.peak - 1;
  const x = p.x;
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tsl80 == null && fromPeak <= -0.80) x.tsl80 = mult;
  if (x.tp == null && mult >= CFG.TP_MULT) x.tp = mult;
  if (x.tp15 == null && mult >= 1.5) x.tp15 = 1.5; if (x.tsl25 == null && fromPeak <= -0.25) x.tsl25 = mult; stopStep(x, mult); // v0.18.3
  if (pathStep(p, p.entryTs, tr.ts, mult)) { try { q.setPath.run(JSON.stringify(p.path), p.id); } catch {} } // v0.18.14
  if (x.tp15 != null && !p.hit15Saved) { p.hit15Saved = true; try { q.setHit15.run(tr.ts - p.entryTs, p.id); } catch {} }
  { const key = `${x.tp15}|${x.tsl25}|${x.t15s25}|${x.t15s60}|${x.t2s25}|${x.t2s60}`; if (p.stopsSaved !== key) { p.stopsSaved = key; try { q.setStops.run(x.tp15 ?? null, x.tsl25 ?? null, x.t15s25 ?? null, x.t15s60 ?? null, x.t2s25 ?? null, x.t2s60 ?? null, p.id); } catch {} } }
  if (!p.half && mult >= 2) p.half = true;
  if (!p.s3 && mult >= 3) p.s3 = true;
  if (x.half60 == null && fromPeak <= -0.60) x.half60 = p.half ? 1 + 0.5 * mult : mult;
  if (x.twophase == null) { if (!p.half && fromPeak <= -0.40) x.twophase = mult; else if (p.half && fromPeak <= -0.60) x.twophase = 1 + 0.5 * mult; }
  if (x.ladder == null && fromPeak <= -0.60) x.ladder = (p.half ? 0.5 : 0) + (p.s3 ? 0.75 : 0) + (1 - (p.half ? 0.25 : 0) - (p.s3 ? 0.25 : 0)) * mult;
  if (x.cluster == null && t.bundle && s.cOut - s.cIn > (CFG.EXIT_OUTFLOW_PCT / 100) * Math.max(t.bundle.sol, 1)) x.cluster = mult;
  if (t.graduated && x.grad == null) x.grad = mult;
  x.levels = levelsStep(p.lv, p.entryMc, t.lastMc, mult, fromPeak);
  if (x.m1 == null) { if (t.lastMc >= CFG.M1_EXIT_USD) x.m1 = mult; else if (fromPeak <= -0.60) x.m1 = mult; }
  const v5u = vol5Usd(s);
  if (x.m1vol == null) { if (t.lastMc >= CFG.M1_EXIT_USD && v5u < CFG.M1_HOLD_VOL5M) x.m1vol = mult; else if (fromPeak <= -0.60) x.m1vol = mult; }
  if (x.volstop == null && fromPeak <= -0.60) { const [bu, su] = buySellUsd(s); if (volStopExit(fromPeak, v5u, bu, su, p.volAtEntry)) x.volstop = mult; }
  const peakMult = p.peak / p.entry;
  q.updPaper.run(t.peakMc, peakMult, x.cluster ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tp ?? null, x.time ?? null, x.grad ?? null, null, null, null, null, null, 0, x.tsl80 ?? null, x.half60 ?? null, x.twophase ?? null, x.ladder ?? null, x.levels ?? null, x.m1 ?? null, x.m1vol ?? null, x.volstop ?? null, p.id);
  if (t.graduated && !p.handover) { if (CFG.GRAD_HANDOVER) { p.handover = true; q.setHandover.run(p.id); } else closePaper(t, s, "graduated", p); }
  else if (!t.graduated && x.tsl60 != null && x.cluster != null && x.volstop != null) closePaper(t, s, "all-exits-hit", p);
  else if (t.graduated && x.tsl80 != null) closePaper(t, s, "tsl80", p);
}

function closePaper(t, s, reason, p = s.pos) {
  if (!p || p.closed) return;
  p.closed = true; p.closeReason = reason; sig.closes++;
  const other = p === s.pos ? s.confPos : s.pos; t.hold = !!(other && !other.closed);
  const px = t.trades.at(-1)?.price ?? p.entry; const mult = px / p.entry; const x = p.x;
  if (x.time == null) x.time = mult;
  if (x.half60 == null) x.half60 = p.half ? 1 + 0.5 * mult : mult;
  if (x.twophase == null) x.twophase = p.half ? 1 + 0.5 * mult : mult;
  if (x.ladder == null) x.ladder = (p.half ? 0.5 : 0) + (p.s3 ? 0.75 : 0) + (1 - (p.half ? 0.25 : 0) - (p.s3 ? 0.25 : 0)) * mult;
  x.levels = levelsFinal(p.lv, mult);
  if (x.m1 == null) x.m1 = mult; if (x.m1vol == null) x.m1vol = mult; if (x.volstop == null) x.volstop = mult;
  { const f = stopFinal(x, mult, p.peak / p.entry); try { q.setStops.run(x.tp15 ?? mult, x.tsl25 ?? mult, f.t15s25, f.t15s60, f.t2s25, f.t2s60, p.id); } catch {} }
  const peakMult = p.peak / p.entry;
  const pnl = (v) => (v == null ? "—" : `${((v - 1) * 100).toFixed(0)}%`);
  q.updPaper.run(t.peakMc, peakMult, x.cluster ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tp ?? null, x.time, x.grad ?? null, Math.floor(Date.now() / 1000), t.lastMc, px, reason, (x.time - 1) * 100, 1, x.tsl80 ?? null, x.half60, x.twophase, x.ladder, x.levels, x.m1, x.m1vol, x.volstop, p.id);
  if (p.alerted) tg(`${mult >= 1 ? "✅" : "🔴"} <b>${p.strategy === "secondwave" ? "SECOND WAVE CLOSE" : p.strategy === "confirm" ? "CONFIRMED CLOSE" : "PAPER CLOSE"}</b> — ${esc(t.name)} (${reason})\n` +
     `Entry $${fmt(p.entryMc)} → now $${fmt(t.lastMc)} · peak <b>${peakMult.toFixed(2)}x</b>\n` +
     `½@2x+60% <b>${pnl(x.half60)}</b> · 2-phase ${pnl(x.twophase)} · ladder ${pnl(x.ladder)} · levels ${pnl(x.levels)} · vol-stop ${pnl(x.volstop)}\n2x-out ${pnl(x.tp)} · trail40 ${pnl(x.tsl40)} · trail60 ${pnl(x.tsl60)} · trail80 ${pnl(x.tsl80)} · cluster ${pnl(x.cluster)} · grad ${pnl(x.grad)} · hold ${pnl(x.time)}\n` +
     `Hand-offs ${s.handoffs} · outside in ${s.oIn.toFixed(1)} SOL / ${s.oBuyers.size} buyers · buys ${s.buys} / sells ${s.sells} · cluster net ${net(s).toFixed(1)} SOL · cluster holds ${heldPct(s).toFixed(0)}%`, { replyTo: p.msgId });
}

on("graduated", (t, tr) => {
  sig.graduations++;
  const p = S.get(t.mint)?.pos;
  if (p?.alerted) tg(`🎓 <b>Graduated</b> — ${esc(t.name)} at ${age(t)} · MC $${fmt(t.lastMc)} · now on PumpSwap, position continues`, { replyTo: p.msgId });
});

on("expire", (t) => { const s = S.get(t.mint); if (s) { flush(t, s); S.delete(t.mint); } });

/** Called by the PumpSwap feed: continue curve positions after graduation. */
export function pumpSwapTick(mint, tr, vol5Usd, bs) {
  const s = S.get(mint); if (!s) return;
  afterTick(mint, tr.price, tr.mc);
  const p = s.pos; const c2 = s.confPos; if ((!p || p.closed || !p.handover) && (!c2 || c2.closed || !c2.handover)) return;
  const t = liveToken(mint); if (!t) return;
  t.lastMc = tr.mc; if (tr.mc > t.peakMc) t.peakMc = tr.mc; s.psVol5 = vol5Usd; s.psBS = bs;
  t.trades.push({ sig: tr.sig, slot: tr.slot, ts: tr.ts, wallet: tr.wallet, isBuy: tr.isBuy, sol: tr.sol, tokens: tr.tokens, price: tr.price });
  if (t.trades.length > 2000) t.trades.splice(0, 1000);
  if (p && !p.closed && p.handover) updatePaper(t, s, { price: tr.price, ts: tr.ts });
  if (s.confPos && !s.confPos.closed && s.confPos !== s.pos && s.confPos.handover) { const keep = s.pos; s.pos = s.confPos; updatePaper(t, s, { price: tr.price, ts: tr.ts }); s.pos = keep; }
}
/** v0.17.5: cluster flow snapshot for a tracked token — SOL the bundle/cluster wallets have put in and taken out so far, churn = out / bundle SOL */
export function clusterSnap(mint) {
  const s = S.get(mint); const t = liveToken(mint); if (!s) return null;
  const bundleSol = t?.bundle?.sol ?? 0;
  return { cIn: s.cIn, cOut: s.cOut, bundleSol, churn: bundleSol > 0 ? s.cOut / bundleSol : null, held: heldPct(s), handoffs: s.handoffs };
}
export const memStats = () => { let ob = 0, sb = 0, win = 0, v5 = 0, cl = 0; for (const s of S.values()) { ob += s.oBuyers.size; sb += s.seenBuyers.size; win += s.win.length; v5 += s.v5.length; cl += s.cluster.size; } return { mints: S.size, oBuyers: ob, seenBuyers: sb, win, v5, cluster: cl }; }; // v0.18.18
export const sigStats = () => ({ ...sig, tracked: S.size, open: [...S.values()].reduce((a, s) => a + (s.pos && !s.pos.closed ? 1 : 0) + (s.confPos && !s.confPos.closed && s.confPos !== s.pos ? 1 : 0), 0), rpc: rpcUsed() });
