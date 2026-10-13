// Copy strategy: paper-enter when a watched wallet buys; track on both feeds; same parallel exits.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";
import { onCopy, onCreatorLaunch } from "./wallets.js";
import { newExits, stepExits, finalExits, pc } from "./exits.js";
import { watch as afterWatch } from "./aftercare.js";
import { tg } from "./telegram.js";
import { esc, fmt } from "./launch-monitor.js";
import { solUsdCached } from "./price.js";

const P = new Map(); // mint -> [{id, label, e, w5:[], closed, msgId}]
export const cp = { entries: 0, closes: 0 };

function openCopy(kind, who, mint, name, symbol, price, mc, ts) {
  const r = q.insMom.run(mint, name, symbol, ts, mc, price, null, null, null, null, null, null, null, 0, 0, 0, 0, null, 0, 1, mc);
  q.setPaperExtra.run(null, kind + ":" + who, r.lastInsertRowid);
  q.setStrategy.run(kind, r.lastInsertRowid);
  const pos = { id: r.lastInsertRowid, label: who, e: newExits(price, mc, 0), w5: [], closed: false, lastMc: mc, lastPx: price, name };
  const arr = P.get(mint) || []; arr.push(pos); P.set(mint, arr); cp.entries++;
  afterWatch(mint, pos.id, price, mc);
  setTimeout(() => close(mint, pos, "time"), CFG.MOM_MAX_HOLD_MIN * 60_000);
}
onCopy(({ wallet, label, mint, name, symbol, price, mc, ts }) => openCopy("copy", label || wallet.slice(0, 6), mint, name, symbol, price, mc, ts));
onCreatorLaunch(({ creator, label, mint, name, symbol, price, mc, ts }) => { if (price > 0) openCopy("copycreator", label || creator.slice(0, 6), mint, name, symbol, price, mc, ts); });

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
    if (x.tsl80 != null) close(mint, p, "tsl80");
  }
}
on("trade", (t, tr) => tick(t.mint, tr.price, t.lastMc, tr.sol, tr.isBuy, tr.ts));
onSwap((tr) => tick(tr.mint, tr.price, tr.mc, tr.sol, tr.isBuy, tr.ts));

function close(mint, p, reason) {
  if (p.closed) return; p.closed = true; cp.closes++;
  const mult = p.lastPx / p.e.entry, v = finalExits(p.e, mult), peakMult = p.e.peak / p.e.entry, now = Math.floor(Date.now() / 1000);
  q.updMom.run(p.lastMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, p.lastMc, p.lastPx, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  tg(`${v.half60 >= 1 ? "✅" : "🔴"} <b>COPY CLOSE</b> — ${esc(p.label)} / ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\n½@2x+60%: <b>${pc(v.half60)}</b> · 2-phase ${pc(v.twophase)} · vol-stop ${pc(v.volstop)} · 2x-out ${pc(v.tp)} · trail40 ${pc(v.tsl40)} · hold ${pc(v.time)}`);
  const arr = P.get(mint); if (arr && arr.every((z) => z.closed)) P.delete(mint);
}
export const cpStats = () => ({ ...cp, open: [...P.values()].flat().filter((p) => !p.closed).length });
