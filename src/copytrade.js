// Copy strategy: paper-enter when a watched wallet buys; track on both feeds; same parallel exits.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { onCopy, onCreatorLaunch } from "./wallets.js";
import { onClimb, lifeSnap, onWave2, onRevival, onGradRunner, onGradRecovery, onSlowBuild } from "./lifecycle.js";
import { links } from "./launch-monitor.js";
import { newExits, stepExits, finalExits, pc, pathStep } from "./exits.js";
import { watch as afterWatch } from "./aftercare.js";
import { tg } from "./telegram.js";
import { esc, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";
import { clusterSnap } from "./signals.js";
import { feeInfo, feeLine } from "./fees.js";
import { recordHolders, holdersLine } from "./holders.js";

const P = new Map(); // mint -> [{id, label, e, w5:[], closed, msgId}]
export const cp = { entries: 0, closes: 0 };
export const positionsOf = (mint) => P.get(mint) || [];

export function openCopy(kind, who, mint, name, symbol, price, mc, ts, note) {
  const ageS = note?.ageS ?? null;
  const r = q.insMom.run(mint, name, symbol, ts, mc, price, null, null, null, null, null, null, null, 0, 0, 0, 0, ageS, 0, 1, mc);
  q.setPaperExtra.run(null, kind + ":" + who, r.lastInsertRowid);
  q.setStrategy.run(kind, r.lastInsertRowid);
  if (note?.v5 != null) { try { q.setVolEntry.run(note.v5, r.lastInsertRowid); q.setVenue.run(note.venue || "pumpswap", r.lastInsertRowid); } catch {} }
  if (note?.buyers != null) { try { q.setFeatures.run(null, null, null, null, new Date(ts * 1000).getUTCHours(), null, note.bs ?? null, note.buyers, r.lastInsertRowid); } catch {} }
  if (note?.mc5 != null || note?.buyers5 != null) { try { q.setPaperCard.run(note.mc5 ?? null, null, note.buyers5 ?? null, note.b5 ?? 0, note.s5 ?? 0, r.lastInsertRowid); } catch {} }
  let hl = null; try { hl = holdersLine(recordHolders(r.lastInsertRowid, mint)); } catch {} // v0.18.5
  let fi = null; try { fi = feeInfo(mint); q.setFees.run(fi.accrued, fi.claims, fi.claimedSol, r.lastInsertRowid); } catch {} // v0.18.4
  let cs = null; try { cs = clusterSnap(mint); if (cs) q.setChurn.run(cs.churn, cs.cOut, cs.held, cs.handoffs, r.lastInsertRowid); } catch {} // v0.17.5: bundle churn at entry
  const pos = { id: r.lastInsertRowid, label: who, e: newExits(price, mc, 0), w5: [], closed: false, entryTs: ts, lastMc: mc, lastPx: price, name, kind, alerted: true };
  if (kind === "climber") { pos.alerted = (note.buyers || 0) >= CFG.CLIMB_ALERT_BUYERS; if (pos.alerted) tg(`🪜 <b>CLIMBER</b> — ${esc(name)} ($${esc(symbol)})\nStairs: ${note.steps} · ${note.buyers} buyers · no burst · entry at +${Math.round(note.cp / 60)}m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  if (kind === "wave2") { pos.alerted = !!note.alert; try { q.setTight.run(note.tight ? 1 : 0, r.lastInsertRowid); } catch {} if (pos.alerted) tg(`🌊 <b>SECOND WAVE</b> — ${esc(name)} ($${esc(symbol)}) · +${Math.round(note.cp / 60)}m\n${note.buyers} buyers (${note.new60} new in 60s) · buy$/sell$ ${note.bs.toFixed(1)} · price ${note.pxChg >= 0 ? "+" : ""}${(note.pxChg * 100).toFixed(0)}% vs 60s ago${note.bundle != null ? ` · bundle ${note.bundle.toFixed(0)}%` : ""}${cs && cs.churn != null ? ` · bundle churn ${(cs.churn * 100).toFixed(0)}%` : ""}\nMC <b>$${fmt(mc)}</b>${fi ? "\n" + feeLine(fi, ts) : ""}${hl ? "\n" + hl : ""}\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  if (kind === "revival") tg(`🔁 <b>REVIVAL</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old\nFell ${((1 - mc / note.peakMc) * 100).toFixed(0)}% from peak $${fmt(note.peakMc)} · ${note.new5} new buyers in 5m · volume ${note.volRatio.toFixed(1)}x previous 5m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "gradrun") tg(`🎓🚀 <b>GRADUATION RUNNER</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.sinceGrad / 60)}m after graduation (${Math.round(note.age / 60)}m old)\n5m vol <b>$${fmt(note.vol5)}</b> · ${note.new2} new buyers in 2m · ${note.buyers} buyers · buy$/sell$ ${note.bs.toFixed(1)}\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "gradrec") tg(`🔁🎓 <b>GRADUATION RECOVERY</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old\nFell ${((1 - mc / note.peakMc) * 100).toFixed(0)}% from post-graduation peak $${fmt(note.peakMc)} · ${note.new5} new buyers in 5m · volume ${note.volRatio.toFixed(1)}x previous 5m\nMC <b>$${fmt(mc)}</b>\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "slow") tg(`📈🔁 <b>SLOW BUILD</b> — ${esc(name)} ($${esc(symbol)}) · ${Math.round(note.age / 60)}m old${note.graduated ? " · graduated" : ""}\nPeak $${fmt(note.peakMc)} → low $${fmt(note.lowMc)} (${Math.round(note.sinceLow / 60)}m ago) → now <b>$${fmt(mc)}</b>\n5m volume ${note.vols.map((v) => "$" + fmt(v)).join(" → ")} · new buyers ${note.nbs.join(" → ")} · ${note.buyers} buyers total\n${links(mint)}`).then((id) => { pos.msgId = id; });
  if (kind === "grad") { pos.alerted = (note.buyers || 0) >= CFG.GRAD_ALERT_BUYERS; if (pos.alerted) tg(`🎓 <b>GRADUATION ENTRY</b> — ${esc(name)} ($${esc(symbol)})\nGraduated at +${ageS != null ? Math.round(ageS / 60) + "m" : "?"} · ${note.buyers} buyers · 5m-mark MC ${note.mc5 ? "$" + fmt(note.mc5) : "n/a"} · 5m buyers ${note.buyers5 ?? "n/a"} · max 1m burst $${fmt(note.maxBurst || 0)}\nMC <b>$${fmt(mc)}</b> · now trading on PumpSwap\n${links(mint)}`).then((id) => { pos.msgId = id; }); }
  const arr = P.get(mint) || []; arr.push(pos); P.set(mint, arr); cp.entries++;
  afterWatch(mint, pos.id, price, mc);
  setTimeout(() => close(mint, pos, "time"), CFG.MOM_MAX_HOLD_MIN * 60_000);
}
onCopy(({ wallet, label, mint, name, symbol, price, mc, ts }) => openCopy("copy", label || wallet.slice(0, 6), mint, name, symbol, price, mc, ts));
onClimb((c) => { if (c.price > 0) openCopy("climber", `${Math.round(c.cp / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, c); });
onWave2((c) => { if (c.price > 0) openCopy("wave2", `${Math.round(c.cp / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, buyers: c.buyers, bs: c.bs }); });
onGradRunner((c) => { if (c.price > 0 && c.mc >= 20000) openCopy("gradrun", `${Math.round(c.sinceGrad / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age }); });
onGradRecovery((c) => { if (c.price > 0) openCopy("gradrec", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age, buyers: c.new5 }); });
onSlowBuild((c) => { if (c.price > 0) openCopy("slow", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, ageS: c.age, buyers: c.buyers }); });
onRevival((c) => { if (c.price > 0) openCopy("revival", `${Math.round(c.age / 60)}m`, c.mint, c.name, c.symbol, c.price, c.mc, c.ts, { ...c, buyers: c.new5 }); });
onCreatorLaunch(({ creator, label, mint, name, symbol, price, mc, ts }) => { if (price > 0) openCopy("copycreator", label || creator.slice(0, 6), mint, name, symbol, price, mc, ts); });
// v0.15: graduation strategy — paper-enter every graduation we watched from launch, with the +5m snapshot as features (alert only when buyers >= GRAD_ALERT_BUYERS)
on("graduated", (t, tr) => {
  if (!(tr?.price > 0) || !(t.lastMc >= 20000)) return; // v0.17.1: entries below $20K are bad prices
  const L = lifeSnap(t.mint); if (!L || L.buyers < 5) return; // only tokens tracked since launch, with real buyers (skips one-shot instant graduations)
  const ts = tr.ts || Math.floor(Date.now() / 1000), ageS = ts - (t.ts || L.createTs);
  const cp5 = L.cp5;
  openCopy("grad", `${Math.round(ageS / 60)}m`, t.mint, t.name || t.mint.slice(0, 8), t.symbol || "", tr.price, t.lastMc, ts,
    { ageS, buyers: L.buyers, mc5: cp5?.mc ?? null, buyers5: cp5?.buyers ?? null, b5: cp5?.b ?? null, s5: cp5?.sl ?? null, maxBurst: L.maxBurst, bs: cp5 && cp5.sl > 0 ? cp5.b / cp5.sl : null });
});

function tick(mint, price, mc, sol, isBuy, ts) {
  const arr = P.get(mint); if (!arr) return;
  for (const p of arr) {
    if (p.closed) continue;
    p.w5.push({ ts, usd: sol * solUsdCached(), b: isBuy }); while (p.w5.length && ts - p.w5[0].ts > 300) p.w5.shift();
    if (!p.e.volAtEntry) p.e.volAtEntry = p.w5.reduce((a, x) => a + x.usd, 0);
    const v5 = p.w5.reduce((a, x) => a + x.usd, 0), bu = p.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = v5 - bu;
    p.lastMc = mc; p.lastPx = price;
    const r = stepExits(p.e, price, mc, v5, bu, su); const x = p.e.x;
    q.updMom.run(Math.max(mc, p.e.peak * CFG.TOTAL_SUPPLY * solUsdCached()), r.peakMult, x.tp ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tsl80 ?? null, x.half60 ?? null, x.twophase ?? null, x.ladder ?? null, null, null, null, null, null, null, 0, x.levels ?? null, x.m1 ?? null, x.m1vol ?? null, x.volstop ?? null, p.id);
    if (pathStep(p.e, p.entryTs, ts, r.mult, v5, v5 > 0 ? su / v5 : null)) { try { q.setPath.run(JSON.stringify(p.e.path), p.id); } catch {} } // v0.18.14
    if (x.tp15 != null && !p.hit15Saved) { p.hit15Saved = true; try { q.setHit15.run(ts - p.entryTs, p.id); } catch {} }
    { const k2 = `${x.flow}|${x.t15s40}|${x.t2s40}|${p.e.ddPre15}|${x.flow4}`; if (p.e.ex2Saved !== k2) { p.e.ex2Saved = k2; try { q.setExits2.run(x.flow ?? null, x.t15s40 ?? null, x.t2s40 ?? null, p.e.ddPre15 ?? null, x.flow4 ?? null, p.id); } catch {} } }
    { const key = `${x.combo}|${x.tp15}|${x.tsl25}|${x.t15s25}|${x.t15s60}|${x.t2s25}|${x.t2s60}`; if (p.e.comboSaved !== key) { p.e.comboSaved = key; try { q.setCombo.run(x.combo ?? null, x.tp15 ?? null, x.tsl25 ?? null, x.t15s25 ?? null, x.t15s60 ?? null, x.t2s25 ?? null, x.t2s60 ?? null, p.id); } catch {} } }
    if (x.tsl80 != null) close(mint, p, "tsl80");
  }
}
on("trade", (t, tr) => tick(t.mint, tr.price, t.lastMc, tr.sol, tr.isBuy, tr.ts));
onSwap((tr) => tick(tr.mint, tr.price, tr.mc, tr.sol, tr.isBuy, tr.ts));

function close(mint, p, reason) {
  if (p.closed) return; p.closed = true; cp.closes++;
  const mult = p.lastPx / p.e.entry, v = finalExits(p.e, mult), peakMult = p.e.peak / p.e.entry, now = Math.floor(Date.now() / 1000);
  q.updMom.run(p.lastMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, p.lastMc, p.lastPx, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  try { q.setCombo.run(v.combo, v.tp15, v.tsl25, v.t15s25, v.t15s60, v.t2s25, v.t2s60, p.id); q.setExits2.run(v.flow, v.t15s40, v.t2s40, p.e.ddPre15 ?? null, v.flow4, p.id); } catch {}
  if (p.alerted !== false) tg(`${v.half60 >= 1 ? "✅" : "🔴"} <b>${p.kind === "climber" ? "CLIMBER CLOSE" : p.kind === "grad" ? "GRADUATION CLOSE" : p.kind === "wave2" ? "SECOND WAVE CLOSE" : p.kind === "revival" ? "REVIVAL CLOSE" : p.kind === "gradrun" ? "GRADUATION RUNNER CLOSE" : p.kind === "gradrec" ? "GRADUATION RECOVERY CLOSE" : p.kind === "slow" ? "SLOW BUILD CLOSE" : p.kind === "copycreator" ? "COPY CREATOR CLOSE" : "COPY CLOSE"}</b> — ${esc(p.label)} / ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\ncombo <b>${pc(v.combo)}</b> · ½@2x+60%: ${pc(v.half60)} · 2-phase ${pc(v.twophase)} · vol-stop ${pc(v.volstop)} · 2x-out ${pc(v.tp)} · trail40 ${pc(v.tsl40)} · hold ${pc(v.time)}`, { replyTo: p.msgId });
  const arr = P.get(mint); if (arr && arr.every((z) => z.closed)) P.delete(mint);
}
export const cpStats = () => ({ ...cp, open: [...P.values()].flat().filter((p) => !p.closed).length });
