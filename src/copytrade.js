// Copy strategy: paper-enter when a watched wallet buys; track on both feeds; same parallel exits.
import { CFG, OFF_KINDS } from "./config.js"; // v0.18.176 OFF_KINDS: the off-page books open nothing new
import { db, q } from "./db.js";
import { on } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { onCopy, onCreatorLaunch } from "./wallets.js";
import { onClimb, lifeSnap, onWave2, onRevival, onGradRunner, onGradRecovery, onSlowBuild } from "./lifecycle.js";
import { links } from "./launch-monitor.js";
import { newExits, stepExits, finalExits, pc, pathStep, p3dFinal, h5Key } from "./exits.js";
import { watch as afterWatch } from "./aftercare.js";
import { tg } from "./telegram.js";
import { esc, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { clusterSnap } from "./signals.js";
import { dexPrice } from "./sweeper.js"; // v0.18.36
import { gmgnFor, gmgnSummary, gmgnEntry } from "./gmgn.js"; // v0.18.52 · v0.18.56 gmgnEntry
import { feeInfo, feeLine } from "./fees.js";
import { recordHolders, holdersLine, ledgerBal, LEDGER_DUST } from "./holders.js"; // v0.18.176 ledgerBal: creator-sold-out exit (record only)
import { execSend, noteFeed } from "./execlink.js"; // v0.18.90 → executor (live buy/sell bot)
import { startTrace, traceTick, noteClose, sweepTraces, noteExits } from "./p5trace.js"; // v0.18.113 P5 data set

const P = new Map(); // mint -> [{id, label, e, w5:[], closed, msgId}]
export const cp = { entries: 0, closes: 0 };
const closeListeners = []; export const onCopyClose = (fn) => closeListeners.push(fn); // v0.18.119: (mint, pos, reason) when a variant position closes
export const positionsOf = (mint) => P.get(mint) || [];
// v0.18.70 website "sell 100%" for copy-type positions (P5): closes the paper position at the current price (every exit not yet hit takes it)
export function copyManualSell(id) {
  for (const [mint, arr] of P) for (const p of arr) if (p.id === id && !p.closed) { const mult = p.lastPx / p.e.entry; close(mint, p, "manual"); return { ok: true, mult, sold: 1 }; }
  return null;
}
export const openOfKind = (kind) => [...P.entries()].flatMap(([mint, arr]) => arr.filter((p) => !p.closed && p.kind === kind).map((p) => ({ mint, p }))); // v0.18.32

export function openCopy(kind, who, mint, name, symbol, price, mc, ts, note) {
  const ageS = note?.ageS ?? null;
  const r = q.insMom.run(mint, name, symbol, ts, mc, price, null, null, null, null, null, null, null, 0, 0, 0, 0, ageS, 0, 1, mc);
  q.setPaperExtra.run(null, kind + ":" + who, r.lastInsertRowid);
  q.setStrategy.run(kind, r.lastInsertRowid);
  if (note?.v5 != null) { try { q.setVolEntry.run(note.v5, r.lastInsertRowid); q.setVenue.run(note.venue || "pumpswap", r.lastInsertRowid); } catch {} }
  if (note?.buyers != null) { try { q.setFeatures.run(null, null, null, null, new Date(ts * 1000).getUTCHours(), null, note.bs ?? null, note.buyers, r.lastInsertRowid); } catch {} }
  if (note?.mc5 != null || note?.buyers5 != null) { try { q.setPaperCard.run(note.mc5 ?? null, null, note.buyers5 ?? null, note.b5 ?? 0, note.s5 ?? 0, r.lastInsertRowid); } catch {} }
  try { const g = gmgnFor(mint); if (g) q.setGmgn.run(JSON.stringify(gmgnSummary(g)), r.lastInsertRowid); } catch {} // v0.18.52
  if (kind === "momconf" || kind === "mom2m" || String(kind).startsWith("p5")) gmgnEntry(mint, r.lastInsertRowid, { holders: String(kind).startsWith("p5") }); // v0.18.115: every P5 kind incl. p5w30 // v0.18.56: P4 / P5 entries only (other copy kinds are too many)
  let hl = null; try { hl = holdersLine(recordHolders(r.lastInsertRowid, mint)); } catch {} // v0.18.5
  let fi = null; try { fi = feeInfo(mint); q.setFees.run(fi.accrued, fi.claims, fi.claimedSol, r.lastInsertRowid); } catch {} // v0.18.4
  let cs = null; try { cs = clusterSnap(mint); if (cs) q.setChurn.run(cs.churn, cs.cOut, cs.held, cs.handoffs, r.lastInsertRowid); } catch {} // v0.17.5: bundle churn at entry
  const pos = { id: r.lastInsertRowid, label: who, e: newExits(price, mc, 0), w5: [], closed: false, entryTs: ts, lastMc: mc, lastPx: price, lastTs: ts, name, kind, alerted: !String(kind).startsWith("sn") && kind !== "rev" && kind !== "grf" && kind !== "k" && kind !== "pg", noExec: !!note?.noExec }; // v0.18.119: Project S books are quiet and never reach the executor
  if (kind === "climber") { pos.alerted = (note.buyers || 0) >= CFG.CLIMB_ALERT_BUYERS; if (pos.alerted) tg(`🪜 <b>CLIMBER</b> — ${esc(name)} ($${esc(symbol)})\nStairs: ${note.steps} · ${note.buyers} buyers · no burst · entry at +${Math.round(note.cp / 60)}m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  if (kind === "wave2") { pos.alerted = !!note.alert; try { q.setTight.run(note.tight ? 1 : 0, r.lastInsertRowid); } catch {} if (pos.alerted) tg(`🌊 <b>SECOND WAVE</b> — ${esc(name)} ($${esc(symbol)}) · +${Math.round(note.cp / 60)}m\n${note.buyers} buyers (${note.new60} new in 60s) · buy$/sell$ ${note.bs.toFixed(1)} · price ${note.pxChg >= 0 ? "+" : ""}${(note.pxChg * 100).toFixed(0)}% vs 60s ago${note.bundle != null ? ` · bundle ${note.bundle.toFixed(0)}%` : ""}${cs && cs.churn != null ? ` · bundle churn ${(cs.churn * 100).toFixed(0)}%` : ""}\nMC <b>$${fmt(mc)}</b>${fi ? "\n" + feeLine(fi, ts) : ""}${hl ? "\n" + hl : ""}\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  if (kind === "revival") tg(`🔁 <b>REVIVAL</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old\nFell ${((1 - mc / note.peakMc) * 100).toFixed(0)}% from peak $${fmt(note.peakMc)} · ${note.new5} new buyers in 5m · volume ${note.volRatio.toFixed(1)}x previous 5m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "gradrun") tg(`🎓🚀 <b>GRADUATION RUNNER</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.sinceGrad / 60)}m after graduation (${Math.round(note.age / 60)}m old)\n5m vol <b>$${fmt(note.vol5)}</b> · ${note.new2} new buyers in 2m · ${note.buyers} buyers · buy$/sell$ ${note.bs.toFixed(1)}\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "gradrec") tg(`🔁🎓 <b>GRADUATION RECOVERY</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old\nFell ${((1 - mc / note.peakMc) * 100).toFixed(0)}% from post-graduation peak $${fmt(note.peakMc)} · ${note.new5} new buyers in 5m · volume ${note.volRatio.toFixed(1)}x previous 5m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "slow") tg(`📈🔁 <b>SLOW BUILD</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old${note.graduated ? " · graduated" : ""}\nPeak $${fmt(note.peakMc)} → low $${fmt(note.lowMc)} (${Math.round(note.sinceLow / 60)}m ago) → now <b>$${fmt(mc)}</b>\n5m volume ${note.vols.map((v) => "$" + fmt(v)).join(" → ")} · new buyers ${note.nbs.join(" → ")} · ${note.buyers} buyers total\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "grad") { pos.alerted = (note.buyers || 0) >= CFG.GRAD_ALERT_BUYERS; if (pos.alerted) tg(`🎓 <b>GRADUATION ENTRY</b> — ${esc(name)} ($${esc(symbol)})\nGraduated at +${ageS != null ? Math.round(ageS / 60) + "m" : "?"} · ${note.buyers} buyers · 5m-mark MC ${note.mc5 ? "$" + fmt(note.mc5) : "n/a"} · 5m buyers ${note.buyers5 ?? "n/a"} · max 1m burst $${fmt(note.maxBurst || 0)}\nMC <b>$${fmt(mc)}</b> · now trading on PumpSwap\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  if (note?.wall0) { // v0.18.89 P5 live-readiness measurement: lag = how far behind the chain our feed was at the trigger (block time is whole seconds, so ±0.5 s per trade; the average is what counts) · open = ms from seeing the trigger to this paper entry (name / age lookups)
    pos.wall0 = note.wall0; pos.fs = { lag: note.blockTs ? Math.round(note.wall0 - note.blockTs * 1000) : null, open: Date.now() - note.wall0 }; try { q.setFirstSecs.run(JSON.stringify(pos.fs), pos.id); } catch {}
    const fpm = (() => { try { const m = q.tokenMeta.get(mint); return !!m && m.bundle_wallets === 10 && m.bundle_pct >= 37 && m.bundle_pct <= 41 && m.bundle_sol >= 22 && m.bundle_sol <= 28 && (m.dev_buy_sol ?? 0) < 0.2; } catch { return false; } })(); // v0.18.164 (owner, 20 Oct 19:07 UK): the 10-wallet operator's coins are a pump-and-dump (median $218K at 60 s, $4K at 1 h) - no book buys them for real except S10
    if (fpm && kind !== "sn10") pos.noExec = true;
    pos.bl = blOf(kind, note.bundle, note.bundleWallets, mc); // v0.18.176 BL (owner go 21 Oct 13:50 UK): the executor's bundle-launch book takes only S8 fires with this flag
    if (!pos.noExec) execSend({ type: "trigger", id: Number(pos.id), strategy: kind, mint, name, price, mc, ts, wall0: note.wall0, lagMs: pos.fs.lag, venue: note.venue || null, pass: note.pass !== false, skipWhy: note.skipWhy || null, bundle: note.bundle ?? null, wal60: note.wal60 ?? null, bundleWallets: note.bundleWallets ?? null, asStd: note.asStd ?? null, bl: pos.bl }); // v0.18.176 + bl (executor book BL) · v0.18.172 + asStd (executor book AS) · v0.18.124 + bundleWallets (book F) // v0.18.90 → executor (pass = the website's P5 filters)
    try { startTrace(pos.id, mint, ts, price, note.preBuyers || null, note.creator || null); } catch (e) { console.error("[p5trace]", e.message); } } // v0.18.113: the data set's after-entry marks, taken or skipped alike
  const arr = P.get(mint) || []; arr.push(pos); P.set(mint, arr); cp.entries++;
  afterWatch(mint, pos.id, price, mc, null, null, null, ts);
  setTimeout(() => close(mint, pos, "time"), CFG.MOM_MAX_HOLD_MIN * 60_000);
  return pos;
}
// v0.18.176 (owner go 21 Oct 13:50 UK): copy / climber / wave2 / gradrun / gradrec / slow / revival are off-page books switched off — each listener opens nothing while its kind is in OFF_KINDS (open positions still close normally)
onCopy(({ wallet, label, mint, name, symbol, price, mc, ts }) => !OFF_KINDS.has("copy") && openCopy("copy", label || wallet.slice(0, 6), mint, name, symbol, price, mc, ts));
onClimb((c) => { if (c.price > 0 && !OFF_KINDS.has("climber")) openCopy("climber", `${Math.round(c.cp / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, c); });
onWave2((c) => { if (c.price > 0 && !OFF_KINDS.has("wave2")) openCopy("wave2", `${Math.round(c.cp / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, buyers: c.buyers, bs: c.bs }); });
onGradRunner((c) => { if (c.price > 0 && c.mc >= 20000 && !OFF_KINDS.has("gradrun")) openCopy("gradrun", `${Math.round(c.sinceGrad / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age }); });
onGradRecovery((c) => { if (c.price > 0 && !OFF_KINDS.has("gradrec")) openCopy("gradrec", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age, buyers: c.new5 }); });
onSlowBuild((c) => { if (c.price > 0 && !OFF_KINDS.has("slow")) openCopy("slow", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age, buyers: c.buyers }); });
onRevival((c) => { if (c.price > 0 && !OFF_KINDS.has("revival")) openCopy("revival", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, buyers: c.new5 }); });
onCreatorLaunch(({ creator, label, mint, name, symbol, price, mc, ts }) => { if (price > 0) openCopy("copycreator", label || creator.slice(0, 6), mint, name, symbol, price, mc, ts); });
// v0.15: graduation strategy — paper-enter every graduation we watched from launch, with the +5m snapshot as features (alert only when buyers >= GRAD_ALERT_BUYERS)
on("graduated", (t, tr) => {
  if (!(tr?.price > 0) || !(t.lastMc >= 20000)) return; // v0.17.1: entries below $20K are bad prices
  const L = lifeSnap(t.mint); if (!L || L.buyers < 5) return; // only tokens tracked since launch, with real buyers (skips one-shot instant graduations)
  const ts = tr.ts || Math.floor(Date.now() / 1000), ageS = ts - (t.ts || L.createTs);
  const cp5 = L.cp5;
  openCopy("grad", `${Math.round(ageS / 60)}m`, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, t.lastMc, ts,
    { ageS, buyers: L.buyers, mc5: cp5?.mc ?? null, buyers5: cp5?.buyers ?? null, b5: cp5?.b ?? null, s5: cp5?.sl ?? null, maxBurst: L.maxBurst, bs: cp5 && cp5.sl > 0 ? cp5.b / cp5.sl : null });
  // v0.18.148 GR: fast, thin graduations only (272 buyers or fewer AND graduated within 185 s of launch) - the one background slice that held up at real prices (94 trades, +33% mean, +16% median at a 3-min sale, 18 Oct-20 Oct). Shadow answers whether the graduation price can actually be bought on the new pool.
  if (L.buyers <= GR.MAX_BUYERS && ageS <= GR.MAX_AGE_S && ageS >= GR.MIN_AGE_S) openCopy("grf", `${L.buyers}b ${ageS}s`, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, t.lastMc, ts,
    { ageS, buyers: L.buyers, mc5: cp5?.mc ?? null, buyers5: cp5?.buyers ?? null, b5: cp5?.b ?? null, s5: cp5?.sl ?? null, maxBurst: L.maxBurst, bs: cp5 && cp5.sl > 0 ? cp5.b / cp5.sl : null, wall0: Date.now(), blockTs: ts, venue: "pumpswap", pass: true });
});
export const blOf = (kind, bundlePct, bundleWallets, mc) => kind === "sn8" && bundlePct >= 70 && bundlePct < 80 && bundleWallets >= 4 && bundleWallets <= 10 && mc >= 25000; // v0.18.176 BL (owner go 21 Oct 13:50 UK): a launch whose bundle bought 70-80% of the supply over 4-10 wallets, first trade at $25K+ MC - back-test 101 trades +32.9% a trade on paper at a 40% trail from the peak
export const GR = { MAX_BUYERS: 155, MAX_AGE_S: 185, MIN_AGE_S: 10 }; // v0.18.174 (owner go 21 Oct 09:40 UK): under 156 buyers (was 272) - real-quote legs < 156 buyers +16.5% a leg on 52 vs 156+ -9.8% on 11; paper 10-185 s < 156 +37.1% on 92 vs 156-272 -4.4% on 49 // v0.18.153 (owner, 20 Oct 07:27 UK): skip coins that graduate inside their own launch (Leonida, MONUMENTAL EGO: paper took the curve price, the real buy paid +272% / +194%)

// v0.18.146: how far behind the chain the tracker is — newest block time seen on any trade vs the wall clock (normally 1–5 s: block times are whole seconds and lag
// the wall clock; 20 s+ after a restart while the backlog replays). A5 / F6 read a price 5–10 s after a trigger and must not act on a stale one.
let newestBlockTs = 0; export const feedBehindS = () => (newestBlockTs ? Math.floor(Date.now() / 1000) - newestBlockTs : 999);
function tick(mint, price, mc, sol, isBuy, ts, wallet = null, quiet = false) {
  if (!quiet && ts > newestBlockTs) newestBlockTs = ts;
  if (!quiet) try { traceTick(mint, price, sol, sol * solUsdCached(), isBuy, wallet, ts); } catch (e) { console.error("[p5trace]", e.message); } // v0.18.113 (traces outlive the paper position: 10 min after entry)
  const arr = P.get(mint); if (!arr) return;
  for (const p of arr) {
    if (p.closed) continue;
    if (quiet && !(p.e.x.h5 == null && ts - p.entryTs >= 300 && ts - (p.lastTs || 0) >= 5)) continue; // v0.18.140: a clock tick only settles a 5-min sale that no trade arrived to settle
    if (!quiet) p.w5.push({ ts, usd: sol * solUsdCached(), b: isBuy }); while (p.w5.length && ts - p.w5[0].ts > 300) p.w5.shift();
    if (!p.e.volAtEntry) p.e.volAtEntry = p.w5.reduce((a, x) => a + x.usd, 0);
    const v5 = p.w5.reduce((a, x) => a + x.usd, 0), bu = p.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = v5 - bu;
    p.lastMc = mc; p.lastPx = price; p.lastTs = ts;
    if (p.fs && !p.fs.done) { try { const d = Date.now() - p.wall0; let ch = false; for (const k of [1, 2, 5, 10]) if (d >= k * 1000 && p.fs["t" + k] == null) { p.fs["t" + k] = { m: +(price / p.e.entry).toFixed(4), d }; ch = true; } if (p.fs.t10) p.fs.done = true; if (ch) q.setFirstSecs.run(JSON.stringify(p.fs), p.id); } catch {} } // v0.18.89 price seen 1 / 2 / 5 / 10 s after the trigger (wall clock)
    const r = stepExits(p.e, price, mc, v5, bu, su, ts - p.entryTs); const x = p.e.x; // v0.18.17: seconds since entry for the fast-fail exit
    if (p.kind === "grf" && !p.e.g10 && p.fs?.t10) { p.e.g10 = true; if (x.h3 == null && p.fs.t10.m < 1) { x.h3 = p.fs.t10.m; x.h3why = "10s"; } } // v0.18.174 GR 10-second rule (owner go 21 Oct 09:40 UK): price 10 s after the buy below the buy price -> sell now (the 3-min exit's x_h3). 64 real legs: +12.0% -> ~+15.5% a leg, 9 of 18 stops cut to small losses
    if (p.wall0) { try { noteExits(p.id, mint, x, ts - p.entryTs); } catch {} } // v0.18.118: the data set's exit timings
    if (x.s15be != null && p.e.s15Saved !== x.s15be) { p.e.s15Saved = x.s15be; try { q.setS15.run(x.s15be, p.id); } catch {} } // v0.18.49
    { const kh = h5Key(x); if (p.e.h5Saved !== kh) { p.e.h5Saved = kh; try { q.setH5.run(x.h5 ?? null, x.h5f12 ?? null, x.h5f14 ?? null, x.h3 ?? null, x.h15 ?? null, x.h5fast ?? null, p.id); q.setH3L.run(x.h3l ?? null, x.t2n30 ?? null, p.id); } catch {} } } // v0.18.81
    if (p.wall0 && !p.noExec) { if (p.kind === "grf" && x.h3 != null && !p.e.h3Sent) { p.e.h3Sent = true; execSend({ type: "exit", id: Number(p.id), mint, rule: "h3", mult: x.h3, why: x.h3why || null, ts }); } if (x.h5 != null && !p.e.h5Sent) { p.e.h5Sent = true; execSend({ type: "exit", id: Number(p.id), mint, rule: "h5", mult: x.h5, why: x.h5why || null, ts }); } if (x.flow4 != null && !p.e.flow4Sent) { p.e.flow4Sent = true; execSend({ type: "exit", id: Number(p.id), mint, rule: "flow4", mult: x.flow4, why: x.flow4why || null, ts }); } if (p.bl && x.tsl40 != null && !p.e.tslSent) { p.e.tslSent = true; execSend({ type: "exit", id: Number(p.id), mint, rule: "tsl40", mult: x.tsl40, why: "trail", ts }); } } // v0.18.176 BL: tsl40 (40% below the running peak) → executor (owner go 21 Oct 13:50 UK) // v0.18.90 → executor
    if (x.h2t40 != null && p.e.h2Saved !== x.h2t40) { p.e.h2Saved = x.h2t40; try { q.setH2.run(x.h2t40, p.id); } catch {} } // v0.18.35
    if (p.dv !== false && (p.kind === "sn8" || p.kind === "grf") && !quiet && (ts - (p.dvTs || 0) >= 5 || (wallet && wallet === p.dv?.cr))) devOutStep(mint, p, price, ts); // v0.18.176 creator-sold-out exit (record only): every 5 s, or on the creator's own trade
    if (x.flow4ff != null && p.e.ffSaved !== x.flow4ff) { p.e.ffSaved = x.flow4ff; try { q.setFlow4ff.run(x.flow4ff, p.id); } catch {} }
    if ((x.dead != null || x.split != null) && p.e.deadSaved !== `${x.dead}|${x.split}`) { p.e.deadSaved = `${x.dead}|${x.split}`; try { q.setDead.run(x.dead ?? null, p3dFinal(p.e, x, r.mult), p.id); } catch {} } // v0.18.30
    { const ks = `${x.split}|${p.e.splitBranch}`; if (p.e.splitSaved !== ks) { p.e.splitSaved = ks; try { q.setSplit.run(x.split ?? null, p.e.splitBranch ?? null, p.id); } catch {} } } // v0.18.22
    q.updMom.run(Math.max(mc, p.e.peak * CFG.TOTAL_SUPPLY * solUsdCached()), r.peakMult, x.tp ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tsl80 ?? null, x.half60 ?? null, x.twophase ?? null, x.ladder ?? null, null, null, null, null, null, null, 0, x.levels ?? null, x.m1 ?? null, x.m1vol ?? null, x.volstop ?? null, p.id);
    if (pathStep(p.e, p.entryTs, ts, r.mult, v5, v5 > 0 ? su / v5 : null)) { try { q.setPath.run(JSON.stringify(p.e.path), p.id); } catch {} } // v0.18.14
    if (x.tp15 != null && !p.hit15Saved) { p.hit15Saved = true; try { q.setHit15.run(ts - p.entryTs, p.id); } catch {} }
    { const k2 = `${x.flow}|${x.t15s40}|${x.t2s40}|${p.e.ddPre15}|${x.flow4}`; if (p.e.ex2Saved !== k2) { p.e.ex2Saved = k2; try { q.setExits2.run(x.flow ?? null, x.t15s40 ?? null, x.t2s40 ?? null, p.e.ddPre15 ?? null, x.flow4 ?? null, p.id); } catch {} } }
    { const key = `${x.combo}|${x.tp15}|${x.tsl25}|${x.t15s25}|${x.t15s60}|${x.t2s25}|${x.t2s60}`; if (p.e.comboSaved !== key) { p.e.comboSaved = key; try { q.setCombo.run(x.combo ?? null, x.tp15 ?? null, x.tsl25 ?? null, x.t15s25 ?? null, x.t15s60 ?? null, x.t2s25 ?? null, x.t2s60 ?? null, p.id); } catch {} } }
    if (x.tsl80 != null) close(mint, p, "tsl80");
    else if (lowVolCopy(p, ts)) { try { close(mint, p, "lowvol"); } catch (e) { console.error("[lowvol copy]", e.message); } } // v0.18.36
  }
}
on("trade", (t, tr) => { noteFeed(); tick(t.mint, tr.price, t.lastMc, tr.sol, tr.isBuy, tr.ts, tr.wallet || null); });
onSwap((tr) => { noteFeed(); tick(tr.mint, tr.price, tr.mc, tr.sol, tr.isBuy, tr.ts, tr.wallet || null); });
setInterval(() => { try { sweepTraces(); } catch {} }, 5000); // v0.18.113: marks for coins that went quiet
// v0.18.140: the 5-min (h5) sale fired only on a trade, so a bonding-curve coin that went quiet after minute 5 kept its paper sale open and never told the
// executor (19 Oct: 10 of 24 S9 shadow legs sold by the executor's 7-min backstop instead). Every 5 s, a position past 5 min with no h5 yet and no trade for 5 s
// is stepped at its last price on the clock — the sale is booked at the price a seller would have met, and the exit message goes out on time.
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const [mint, arr] of P) { const p = arr.find((x) => !x.closed && x.e?.x?.h5 == null && now - x.entryTs >= 300 && x.lastTs > 0 && now - x.lastTs >= 5 && x.lastPx > 0); if (p) { try { tick(mint, p.lastPx, p.lastMc, 0, true, now, null, true); } catch (e) { console.error("[quiet tick]", e.message); } } } }, 5000); // v0.18.146: x.lastTs > 0 — a position restored after a restart has seen no trade yet, so its last price is only the entry price

// v0.18.176 creator-sold-out exit (record only, S8 / GR): x_devout = price ÷ entry at the first tick (checked at most once every 5 s per position, on trades only) when the creator wallet's
// ledger balance is 0 after it has held tokens (a launch buy, dev_buy_sol > 0, or a balance seen on the ledger). Null when it never sold out while the position was open, when the launch was
// not seen (no ledger), or when the creator never bought. Limitation: the ledger is built from the trades the feeds decode — a sell routed through an aggregator that only shows a "tx:" wallet is missed.
function devOutStep(mint, p, price, ts) {
  p.dvTs = ts;
  if (p.dv === undefined) { try { if (p.restored && q.getDevOut.get(p.id) != null) { p.dv = false; return; } const m = q.tokenMeta.get(mint), cr = m?.creator || null; p.dv = cr ? { cr, held: (m.dev_buy_sol || 0) > 0 } : false; } catch { p.dv = false; } }
  if (!p.dv) return;
  const b = ledgerBal(mint, p.dv.cr); if (b == null) return;
  if (b > LEDGER_DUST) { p.dv.held = true; return; }
  if (!p.dv.held) return;
  const mult = price / p.e.entry; p.e.x.devout = mult; p.dv = false; try { q.setDevOut.run(mult, p.id); } catch {}
}

function close(mint, p, reason) {
  if (p.wall0 && !p.noExec) { try { const cm = (p.lastPx || p.e.entry) / p.e.entry, v = finalExits(p.e, cm); execSend({ type: "close", id: Number(p.id), mint, reason, mult: cm, h5: v.h5 ?? null, flow4: v.flow4 ?? null, h3: p.e.x.h3 ?? cm, tsl40: v.tsl40 ?? cm }); } catch {} } // v0.18.176 + tsl40 (BL) // v0.18.90 → executor (backstop: sell if still held)
  if (p.closed) return; p.closed = true; cp.closes++; try { noteClose(p.id); } catch {}
  const mult = p.lastPx / p.e.entry, v = finalExits(p.e, mult), peakMult = p.e.peak / p.e.entry, now = Math.floor(Date.now() / 1000);
  q.updMom.run(p.lastMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, p.lastMc, p.lastPx, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  try { q.setCombo.run(v.combo, v.tp15, v.tsl25, v.t15s25, v.t15s60, v.t2s25, v.t2s60, p.id); q.setExits2.run(v.flow, v.t15s40, v.t2s40, p.e.ddPre15 ?? null, v.flow4, p.id); q.setFlow4ff.run(v.flow4ff, p.id); q.setH2.run(v.h2t40, p.id); q.setS15.run(v.s15be, p.id); q.setSplit.run(v.split, p.e.splitBranch ?? null, p.id); q.setDead.run(v.dead, v.p3d, p.id); q.setH5.run(v.h5, v.h5f12, v.h5f14, v.h3, v.h15, v.h5fast, p.id); q.setH3L.run(v.h3l ?? null, v.t2n30 ?? null, p.id); } catch {}
  if (p.alerted !== false) tg(`${v.half60 >= 1 ? "✅" : "🔴"} <b>${p.kind === "climber" ? "CLIMBER CLOSE" : p.kind === "grad" ? "GRADUATION CLOSE" : p.kind === "wave2" ? "SECOND WAVE CLOSE" : p.kind === "revival" ? "REVIVAL CLOSE" : p.kind === "gradrun" ? "GRADUATION RUNNER CLOSE" : p.kind === "gradrec" ? "GRADUATION RECOVERY CLOSE" : p.kind === "slow" ? "SLOW BUILD CLOSE" : p.kind === "copycreator" ? "COPY CREATOR CLOSE" : "COPY CLOSE"}</b> — ${esc(p.label)} / ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\ncombo <b>${pc(v.combo)}</b> · ½@2x+60%: ${pc(v.half60)} · 2-phase ${pc(v.twophase)} · vol-stop ${pc(v.volstop)} · 2x-out ${pc(v.tp)} · trail40 ${pc(v.tsl40)} · hold ${pc(v.time)}`, { replyTo: p.msgId });
  const arr = P.get(mint); if (arr && arr.every((z) => z.closed)) P.delete(mint);
  for (const fn of closeListeners) { try { fn(mint, p, reason); } catch (e) { console.error("[copy close listener]", e.message); } }
}
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const arr of P.values()) for (const p of arr) while (p.w5.length && now - p.w5[0].ts > 300) p.w5.shift(); }, 60_000); // v0.18.20
// v0.18.36 low-volume exit: a variant position's window only holds trades since entry (or since a restart), so it applies once that
// window covers a full 5 minutes. Quiet coins (no trades) are re-priced from DexScreener before closing.
const BOOT = Math.floor(Date.now() / 1000);
function lowVolCopy(p, now) {
  if (now - Math.max(p.entryTs, BOOT) < CFG.LOWVOL_WARMUP_S) return false;
  return p.w5.reduce((a, z) => a + (now - z.ts <= 300 ? z.usd : 0), 0) < CFG.LOWVOL_EXIT_USD;
}
let lvBusy = false;
setInterval(async () => {
  if (lvBusy) return; lvBusy = true;
  try {
    const now = Math.floor(Date.now() / 1000); let n = 0;
    for (const [mint, arr] of [...P.entries()]) for (const p of arr) {
      if (p.closed || !lowVolCopy(p, now)) continue;
      if (now - (p.lastTs || 0) > 60 && n < 25) { n++; const px = await dexPrice(mint).catch(() => null); if (px > 0) { p.lastPx = px; p.lastMc = px * CFG.TOTAL_SUPPLY * solUsdCached(); } }
      try { stepExits(p.e, p.lastPx, p.lastMc, 0, 0, 0, now - p.entryTs); } catch {}
      try { close(mint, p, "lowvol"); } catch (e) { console.error("[lowvol copy]", mint, e.message); p.closed = true; }
    }
  } catch (e) { console.error("[lowvol loop]", e.message); } finally { lvBusy = false; }
}, 20_000);

// v0.18.28: variant positions (tiers, dip, re-entry, copy, wave2, grad…) still open in the database are rebuilt on startup, so a restart
// never orphans them. Exits already recorded are kept; tracking resumes from the next swap.
const qOpenCopy = db.prepare(`SELECT p.id, p.strategy, p.mint, p.name, p.entry_ts, p.entry_mc, p.entry_price, p.peak_mult, p.vol_at_entry, p.trigger_kind, p.x_tp, p.x_tp15, p.x_tsl25, p.x_tsl40, p.x_tsl60, p.x_tsl80, p.x_half60, p.x_twophase, p.x_ladder, p.x_levels, p.x_m1, p.x_m1vol, p.x_volstop, p.x_combo, p.x_h2t40, p.x_s15be, p.x_t15s25, p.x_t15s40, p.x_t15s60, p.x_t2s25, p.x_t2s40, p.x_t2s60, p.x_flow, p.x_flow4, p.x_flow4ff, p.x_split, p.split_branch, p.dd_pre15, p.path, p.t_hit15_s, p.x_h5, p.x_h5f12, p.x_h5f14, p.x_h3, p.x_h15, p.x_h5fast, t.bundle_pct tb_pct, t.bundle_wallets tb_wallets
  FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.strategy NOT IN ('momentum','early','confirm','secondwave','p6','p7') AND p.closed=0 AND COALESCE(p.invalid,0)=0 AND p.entry_ts > ? ORDER BY p.entry_ts`); // v0.18.176: + the launch bundle from tokens (paper_trades.bundle_pct is null for copy kinds) so a restored S8 position knows whether it is BL
export function restoreCopyFromDb() {
  const now = Math.floor(Date.now() / 1000); let n = 0;
  try {
    for (const r of qOpenCopy.all(now - CFG.MOM_MAX_HOLD_MIN * 60)) {
      if (!(r.entry_price > 0) || (P.get(r.mint) || []).some((p) => p.id === r.id)) continue;
      const e = newExits(r.entry_price, r.entry_mc, r.vol_at_entry || 0); const pk = Math.max(r.peak_mult || 1, 1); e.peak = r.entry_price * pk; e.half = pk >= 2; e.s3 = pk >= 3;
      for (const k of ["tp", "tp15", "tsl25", "tsl40", "tsl60", "tsl80", "half60", "twophase", "ladder", "levels", "m1", "m1vol", "volstop", "combo", "t15s25", "t15s40", "t15s60", "t2s25", "t2s40", "t2s60", "flow", "flow4", "flow4ff", "split", "h2t40", "s15be", "h5", "h5f12", "h5f14", "h3", "h15", "h5fast"]) if (r["x_" + k] != null) e.x[k] = r["x_" + k]; e.h2Half = pk >= 2; e.s15Half = pk >= 1.5; e.h5Armed = pk >= 1.5;
      e.flowArmed = e.x.tp15 != null; e.ffDone = now - r.entry_ts >= 120; e.splitBranch = r.split_branch && r.split_branch !== "sweep" ? r.split_branch : null; e.splitHalf = r.split_branch === "mid" && pk >= 1.5; e.ddPre15 = r.dd_pre15 ?? null;
      try { e.path = r.path ? JSON.parse(r.path) : {}; } catch { e.path = {}; }
      const pos = { id: r.id, label: (r.trigger_kind || "").split(":").slice(1).join(":") || r.strategy, e, w5: [], closed: false, entryTs: r.entry_ts, lastMc: r.entry_mc, lastPx: r.entry_price, name: r.name, kind: r.strategy, alerted: false, hit15Saved: r.t_hit15_s != null, restored: "db" };
      pos.bl = blOf(r.strategy, r.tb_pct, r.tb_wallets, r.entry_mc); // v0.18.176 BL: recomputed from the launch bundle and the entry MC
      if (/^p5[ewc]\d+$/.test(r.strategy) || /^sn(1|3|4|6|6b|7b|8|9|10)$/.test(r.strategy) || r.strategy === "grf") { pos.wall0 = r.entry_ts * 1000; if (e.x.h3 != null) e.h3Sent = true; if (e.x.h5 != null) e.h5Sent = true; if (e.x.flow4 != null) e.flow4Sent = true; if (e.x.tsl40 != null) e.tslSent = true; } // v0.18.176: + sn8 (BL) and its tsl40 // v0.18.90: a restored P5 position still tells the executor when its exit fires (rules already fired are not re-sent) // v0.18.146: + A5/F6 (p5c*) and the executor's sniper books — before, a restart cut their sell messages and the executor fell back to its 7-min / 6½-h backstop
      const arr = P.get(r.mint) || []; arr.push(pos); P.set(r.mint, arr);
      setTimeout(() => close(r.mint, pos, "time"), Math.max(5_000, CFG.MOM_MAX_HOLD_MIN * 60_000 - (Date.now() - r.entry_ts * 1000))); n++;
    }
  } catch (e) { console.error("[copy restore]", e.message); }
  if (n) console.log(`[copy] rebuilt ${n} open variant positions from the database`);
  return n;
}
setTimeout(restoreCopyFromDb, 1500);
export const memStats = () => { let n = 0, w5 = 0; for (const arr of P.values()) for (const p of arr) { n++; w5 += p.w5.length; } return { mints: P.size, positions: n, w5 }; }; // v0.18.18
export const cpStats = () => ({ ...cp, open: [...P.values()].flat().filter((p) => !p.closed).length });
