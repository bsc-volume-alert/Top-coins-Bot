// v0.5: momentum (volume) strategy on PumpSwap. Rolling 5m/1m USD volume per token → alert + paper trade with parallel exits.
import { CFG } from "./config.js";
import { db, q } from "./db.js";
import { onSwap } from "./pumpswap.js";
import { solUsdCached } from "./price.js";
import { tg } from "./telegram.js";
import { esc, fmt, links } from "./launch-monitor.js";
import { getSocials, socialsLine } from "./socials.js";
import { nextLevel, lastLevel, wallWarning, levelsStep, levelsFinal, newLevels, volStopExit } from "./levels.js";
import { pumpSwapTick } from "./signals.js";
import { watch as afterWatch, tick as afterTick } from "./aftercare.js";
import { retrySocials } from "./socials.js";

export const mom = { alerts: 0, entries: 0, closes: 0, tracked: 0, reentries: 0 };
const T = new Map(); // mint -> state
const dexCache = new Map();

function st(mint) {
  let s = T.get(mint);
  if (!s) { s = { w5: [], w1: [], lastTs: 0, lastAlert: 0, pos: null, trades: [], firstEntryPx: null, belowSince: 0, lastPx: 0, lastMc: 0, rejectedLevel: null, peakMc: 0, posPeakMc: 0 }; T.set(mint, s); }
  return s;
}
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const [m, s] of T) if (!s.pos && now - s.lastTs > 900 && !s.trades.length) T.delete(m); mom.tracked = T.size; }, 60_000);

const qHeld = db.prepare(`SELECT COALESCE(SUM(CASE WHEN tr.is_buy=1 THEN tr.tokens ELSE -tr.tokens END),0) tok FROM trades tr JOIN cluster_wallets c ON c.mint=tr.mint AND c.wallet=tr.wallet WHERE tr.mint=?`);
function clusterHeld(mint) { try { return Math.max(0, qHeld.get(mint).tok / CFG.TOTAL_SUPPLY) * 100; } catch { return null; } }

async function dexInfo(mint) {
  if (dexCache.has(mint)) return dexCache.get(mint);
  let info = { name: null, symbol: null, createdAt: null, socials: null };
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana");
    if (pairs.length) {
      const oldest = pairs.reduce((a, b) => (a.pairCreatedAt < b.pairCreatedAt ? a : b));
      info.name = oldest.baseToken?.name; info.symbol = oldest.baseToken?.symbol; info.createdAt = Math.floor((oldest.pairCreatedAt || 0) / 1000) || null;
      const soc = { twitter: null, website: null, tiktok: null, telegram: null, fetched: true };
      for (const p of pairs) {
        for (const w of p.info?.websites || []) { if (/tiktok\.com/i.test(w.url)) soc.tiktok ||= w.url; else soc.website ||= w.url; }
        for (const x of p.info?.socials || []) { if (x.type === "twitter") soc.twitter ||= x.url; if (x.type === "telegram") soc.telegram ||= x.url; if (/tiktok/i.test(x.type)) soc.tiktok ||= x.url; }
      }
      soc.ok = !!(soc.twitter || soc.website || soc.tiktok); info.socials = soc;
    }
  } catch {}
  dexCache.set(mint, info); if (dexCache.size > 5000) dexCache.delete(dexCache.keys().next().value);
  return info;
}

onSwap((tr) => {
  const s = st(tr.mint), usd = tr.sol * solUsdCached(), now = tr.ts || Math.floor(Date.now() / 1000);
  s.lastTs = now; s.lastPx = tr.price; s.lastMc = tr.mc;
  if (tr.mc > s.peakMc) s.peakMc = tr.mc;
  // level rejection: price fell >30% from a peak that was above a level → that level is "rejected"
  if (s.peakMc > 0 && tr.mc < s.peakMc * 0.7) { const L = lastLevel(s.peakMc); if (L && L > tr.mc) s.rejectedLevel = L; }
  s.w5.push({ ts: now, usd, b: tr.isBuy, w: tr.wallet }); while (s.w5.length && now - s.w5[0].ts > 300) s.w5.shift();
  s.w1.push({ ts: now, usd, b: tr.isBuy }); while (s.w1.length && now - s.w1[0].ts > 60) s.w1.shift();
  if (s.pos) updatePos(tr.mint, s, tr.price, now);
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0);
  const bsu = [s.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), s.w5.filter((x) => !x.b).reduce((a, x) => a + x.usd, 0)];
  pumpSwapTick(tr.mint, tr, v5, bsu); afterTick(tr.mint, tr.price, tr.mc);
  if (usd <= 0) return;
  const v1 = s.w1.reduce((a, x) => a + x.usd, 0);
  const b1 = s.w1.filter((x) => x.b).length, s1 = s.w1.length - b1;
  const burst = CFG.BURST_TRIGGER && v1 >= CFG.VOL1M_BURST_USD && b1 > s1 && tr.mc >= CFG.BURST_MIN_MC && (() => { const m = q.tokenMeta.get(tr.mint); return !m?.create_ts || now - m.create_ts >= CFG.BURST_MIN_AGE_S; })();
  if (v5 < CFG.VOL5M_USD && !burst) return;
  const kind = v5 >= CFG.VOL5M_USD ? "vol5m" : "burst";
  if (tr.mc > CFG.MOM_MC_CAP || tr.mc <= 0) return;
  if (now - s.lastAlert < CFG.MOM_COOLDOWN_MIN * 60) return;
  if (s.pos && !s.pos.closed) return;
  // re-entry rules
  if (s.trades.length) {
    if (s.trades.length > CFG.MOM_REENTRY_MAX) return;
    const last = s.trades.at(-1);
    if (now - last.closedTs < CFG.MOM_REENTRY_QUIET_MIN * 60) return;
    if (tr.price < s.firstEntryPx) return; // second leg must start above the first entry
    if (CFG.MOM_REENTRY_RECLAIM && s.rejectedLevel && tr.mc < s.rejectedLevel) return; // must reclaim the level that rejected it
  }
  s.lastAlert = now;
  trigger(tr.mint, s, tr, v5, now, kind).catch((e) => console.error("[momentum]", e.message));
});

async function trigger(mint, s, tr, v5, now, kind = "vol5m") {
  const v1 = s.w1.reduce((a, x) => a + x.usd, 0);
  const buys = s.w5.filter((x) => x.b), sells = s.w5.filter((x) => !x.b);
  const buyUsd = buys.reduce((a, x) => a + x.usd, 0), sellUsd = sells.reduce((a, x) => a + x.usd, 0);
  const buyers = new Set(buys.map((x) => x.w)).size;
  const meta = q.tokenMeta.get(mint); // known from our firehose?
  let name = meta?.name, symbol = meta?.symbol, createTs = meta?.create_ts, soc = null;
  if (meta?.socials) { try { const j = JSON.parse(meta.socials); soc = { twitter: j.t, website: j.w, tiktok: j.k, telegram: j.g, fetched: true, ok: !!(j.t || j.w || j.k) }; } catch {} }
  if (!name || !soc) { const d = await dexInfo(mint); name ||= d.name; symbol ||= d.symbol; createTs ||= d.createdAt; soc ||= d.socials; }
  if (!soc) soc = { fetched: false, ok: false };
  const ageS = createTs ? now - createTs : null;
  if (ageS != null && ageS > CFG.MOM_MAX_AGE_D * 86400) return;
  const reentry = s.trades.length;
  const alert = !CFG.ALERT_REQUIRE_SOCIALS || soc.ok || !soc.fetched;
  const r = q.insMom.run(mint, name || mint.slice(0, 8), symbol || "", now, tr.mc, tr.price, meta?.bundle_pct ?? null, meta?.bundle_sol ?? null, meta?.handoffs ?? null, meta?.tier ?? null, meta?.factory ?? null,
    soc.fetched ? (soc.ok ? 1 : 0) : null, JSON.stringify({ t: soc.twitter, w: soc.website, k: soc.tiktok, g: soc.telegram }), v5, v1, buys.length, sells.length, ageS, reentry, alert ? 1 : 0, tr.mc);
  const pos = { id: r.lastInsertRowid, entry: tr.price, entryMc: tr.mc, entryTs: now, peak: tr.price, x: {}, lad: { s2: false, s3: false }, tp: { half: false, twoHalf: false }, closed: false, msgId: null, alerted: alert, name: name || mint.slice(0, 8), lv: newLevels(), kind };
  q.setNextLevel.run(nextLevel(tr.mc), pos.id);
  const held = meta ? clusterHeld(mint) : null;
  q.setPaperExtra.run(held, kind + (reentry ? "-re" : ""), pos.id);
  if (reentry) { s.peakMc = tr.mc; s.rejectedLevel = null; }
  try { const h = new Date(now * 1000).getUTCHours(); q.setFeatures.run(null, null, null, null, h, null, buyUsd > 0 ? buyUsd / Math.max(sellUsd, 1) : null, buyers, pos.id); } catch {}
  s.pos = pos; s.posPeakMc = tr.mc; if (!s.firstEntryPx) s.firstEntryPx = tr.price;
  pos.volAtEntry = v5; q.setVolEntry.run(v5, pos.id); afterWatch(mint, pos.id, tr.price, tr.mc);
  if (!soc.fetched) retrySocials(mint, null, (s2) => { const str = JSON.stringify({ t: s2.twitter, w: s2.website, k: s2.tiktok, g: s2.telegram }); q.setPaperSocials.run(str, s2.ok ? 1 : 0, pos.id); if (pos.msgId) tg(`socials (late): ${socialsLine(s2)}`, { replyTo: pos.msgId }); });
  mom.entries++; if (reentry) mom.reentries++;
  setTimeout(() => closePos(mint, s, "time"), CFG.MOM_MAX_HOLD_MIN * 60_000);
  if (!alert) return;
  mom.alerts++;
  const hot = v5 >= CFG.VOL5M_HOT_USD, burst = v1 >= CFG.VOL1M_BURST_USD;
  const heldStr = held != null ? ` · cluster holds <b>${held.toFixed(0)}%</b>` : "";
  const ageStr = ageS == null ? "age ?" : ageS < 3600 ? `${Math.floor(ageS / 60)}m old` : ageS < 86400 ? `${(ageS / 3600).toFixed(1)}h old` : `${(ageS / 86400).toFixed(1)}d old`;
  const wall = wallWarning(tr.mc);
  const reclaimStr = reentry && s.rejectedLevel ? ` · reclaimed $${fmt(s.rejectedLevel)}` : "";
  const bundleStr = meta?.bundle_pct != null ? `Bundle ${meta.bundle_pct.toFixed(0)}% · ${meta.bundle_sol.toFixed(1)} SOL · hand-offs ${meta.handoffs} · cluster net ${((meta.cluster_sol_in || 0) - (meta.cluster_sol_out || 0)).toFixed(1)} SOL` : "Bundle: launched before tracker (no data)";
  pos.msgId = await tg(`${kind === "burst" ? "⚡" : hot ? "🔥" : "📈"} <b>${kind === "burst" ? "BURST" : "VOLUME"}${reentry ? " RE-ENTRY " + reentry : ""}</b> — ${esc(name || mint.slice(0, 8))} ($${esc(symbol || "?")})${burst ? " ⚡" : ""}${meta?.factory ? " ⚠️factory" : ""}\n` +
    `5m vol <b>$${fmt(v5)}</b> (1m $${fmt(v1)}) · buys ${buys.length} / sells ${sells.length} · $${fmt(buyUsd)} in / $${fmt(sellUsd)} out · ${buyers} buyers\n` +
    `MC <b>$${fmt(tr.mc)}</b> · ${ageStr}${reclaimStr}${wall ? "\n" + wall : ""}\n${socialsLine(soc)}\n${bundleStr}${heldStr}\n${links(mint)}`);
  for (const m of CFG.MOM_SCORECARD_MIN) setTimeout(() => scorecard(mint, s, m), m * 60_000);
}

function updatePos(mint, s, px, now) {
  const p = s.pos; if (!p || p.closed) return;
  if (px > p.peak) p.peak = px;
  if (s.lastMc > s.posPeakMc) s.posPeakMc = s.lastMc;
  const mult = px / p.entry, fromPeak = px / p.peak - 1, x = p.x;
  if (x.tp == null && mult >= 2) x.tp = 2;
  if (x.tsl40 == null && fromPeak <= -0.40) x.tsl40 = mult;
  if (x.tsl60 == null && fromPeak <= -0.60) x.tsl60 = mult;
  if (x.tsl80 == null && fromPeak <= -0.80) x.tsl80 = mult;
  // half at 2x + 60% trail on the rest
  if (!p.tp.half && mult >= 2) p.tp.half = true;
  if (x.half60 == null && fromPeak <= -0.60) x.half60 = p.tp.half ? 0.5 * 2 + 0.5 * mult : mult;
  // two-phase: 40% trail until 2x; then half out, 60% trail
  if (!p.tp.twoHalf && mult >= 2) p.tp.twoHalf = true;
  if (x.twophase == null) { if (!p.tp.twoHalf && fromPeak <= -0.40) x.twophase = mult; else if (p.tp.twoHalf && fromPeak <= -0.60) x.twophase = 0.5 * 2 + 0.5 * mult; }
  // ladder: 25% at 2x, 25% at 3x, rest 60% trail
  if (!p.lad.s2 && mult >= 2) p.lad.s2 = true;
  if (!p.lad.s3 && mult >= 3) p.lad.s3 = true;
  if (x.ladder == null && fromPeak <= -0.60) x.ladder = (p.lad.s2 ? 0.25 * 2 : 0) + (p.lad.s3 ? 0.25 * 3 : 0) + (1 - (p.lad.s2 ? 0.25 : 0) - (p.lad.s3 ? 0.25 : 0)) * mult;
  x.levels = levelsStep(p.lv, p.entryMc, s.lastMc, mult, fromPeak);
  if (x.m1 == null) { if (s.lastMc >= CFG.M1_EXIT_USD) x.m1 = mult; else if (fromPeak <= -0.60) x.m1 = mult; }
  const v5 = s.w5.reduce((a, z) => a + z.usd, 0);
  if (x.m1vol == null) { if (s.lastMc >= CFG.M1_EXIT_USD && v5 < CFG.M1_HOLD_VOL5M) x.m1vol = mult; else if (fromPeak <= -0.60) x.m1vol = mult; }
  if (x.volstop == null && fromPeak <= -0.60) { const bu = s.w5.filter((z) => z.b).reduce((a, z) => a + z.usd, 0), su = s.w5.filter((z) => !z.b).reduce((a, z) => a + z.usd, 0); if (volStopExit(fromPeak, v5, bu, su, p.volAtEntry)) x.volstop = mult; }
  q.updMom.run(s.posPeakMc, p.peak / p.entry, x.tp ?? null, x.tsl40 ?? null, x.tsl60 ?? null, x.tsl80 ?? null, x.half60 ?? null, x.twophase ?? null, x.ladder ?? null, null, null, null, null, null, null, 0, x.levels ?? null, x.m1 ?? null, x.m1vol ?? null, x.volstop ?? null, p.id);
  if (x.tsl80 != null) closePos(mint, s, "tsl80");
}

function finalVariants(p, mult) {
  const x = p.x;
  const out = {
    tp: x.tp ?? mult, tsl40: x.tsl40 ?? mult, tsl60: x.tsl60 ?? mult, tsl80: x.tsl80 ?? mult,
    half60: x.half60 ?? (p.tp.half ? 0.5 * 2 + 0.5 * mult : mult),
    twophase: x.twophase ?? (p.tp.twoHalf ? 0.5 * 2 + 0.5 * mult : mult),
    ladder: x.ladder ?? ((p.lad.s2 ? 0.5 : 0) + (p.lad.s3 ? 0.75 : 0) + (1 - (p.lad.s2 ? 0.25 : 0) - (p.lad.s3 ? 0.25 : 0)) * mult),
    time: mult,
    levels: levelsFinal(p.lv, mult),
    m1: x.m1 ?? mult, m1vol: x.m1vol ?? mult, volstop: x.volstop ?? mult,
  };
  return out;
}

function closePos(mint, s, reason) {
  const p = s.pos; if (!p || p.closed) return;
  p.closed = true; mom.closes++;
  const now = Math.floor(Date.now() / 1000), px = s.lastPx || p.entry, mult = px / p.entry, v = finalVariants(p, mult), peakMult = p.peak / p.entry;
  s.trades.push({ id: p.id, closedTs: now });
  q.updMom.run(s.posPeakMc, peakMult, v.tp, v.tsl40, v.tsl60, v.tsl80, v.half60, v.twophase, v.ladder, v.time, now, s.lastMc, px, reason, (v.time - 1) * 100, 1, v.levels, v.m1, v.m1vol, v.volstop, p.id);
  const pc = (m) => `${m >= 1 ? "+" : ""}${((m - 1) * 100).toFixed(0)}%`;
  if (p.alerted) tg(`${v.half60 >= 1 ? "✅" : "🔴"} <b>VOLUME CLOSE</b> — ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\n` +
    `½@2x+60%: <b>${pc(v.half60)}</b> · 2-phase: ${pc(v.twophase)} · ladder: ${pc(v.ladder)} · levels: ${pc(v.levels)}\n$1M-out: ${pc(v.m1)} · $1M-vol: ${pc(v.m1vol)} · vol-stop: ${pc(v.volstop)}\n` +
    `2x out: ${pc(v.tp)} · trail40: ${pc(v.tsl40)} · trail60: ${pc(v.tsl60)} · trail80: ${pc(v.tsl80)} · hold: ${pc(v.time)}`, { replyTo: p.msgId });
}

function scorecard(mint, s, m) {
  const p = s.pos; if (!p || !p.alerted) return;
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0), b = s.w5.filter((x) => x.b).length, sl = s.w5.length - b;
  const mult = (s.lastPx || p.entry) / p.entry, peakMult = p.peak / p.entry;
  const flags = [];
  if (sl > b) flags.push("⚠️ sells > buys");
  if (v5 < CFG.VOL5M_USD * 0.25) flags.push("💤 volume faded");
  if (p.closed) flags.push(`closed`);
  tg(`⏱ <b>+${m}m</b> ${esc(p.name)} · MC <b>$${fmt(s.lastMc)}</b> (${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(0)}%, peak ${peakMult.toFixed(2)}x) · 5m vol $${fmt(v5)} · buys ${b} / sells ${sl}` + (flags.length ? `\n${flags.join(" · ")}` : ""), { replyTo: p.msgId });
}

export const momStats = () => ({ ...mom, open: [...T.values()].filter((s) => s.pos && !s.pos.closed).length });

/** 4-hourly strategy summary text */
export function strategySummary(hours) {
  const to = Math.floor(Date.now() / 1000), from = to - hours * 3600;
  const rows = q.stratSummary.all(from, to + 60);
  const pc = (v) => (v == null ? "—" : `${v >= 1 ? "+" : ""}${((v - 1) * 100).toFixed(0)}%`);
  if (!rows.length) return `📋 <b>${hours}h summary</b> — no paper trades`;
  let t = `📋 <b>${hours}h summary</b> · ${new Date().toISOString().slice(11, 16)} UTC\n`;
  for (const r of rows) {
    t += `\n<b>${r.strategy === "early" ? "EARLY (curve)" : r.strategy === "secondwave" ? "SECOND WAVE (curve)" : r.strategy === "copy" ? "COPY (watched wallets)" : r.strategy === "confirm" ? "CONFIRMED (+5m, curve)" : r.strategy === "copycreator" ? "COPY CREATOR" : r.strategy === "climber" ? "CLIMBER (slow riser)" : "MOMENTUM (volume)"}</b> — ${r.n} trades · ${r.hit2x} hit 2x (${r.n ? ((r.hit2x / r.n) * 100).toFixed(0) : 0}%) · avg peak ${(r.peak || 1).toFixed(2)}x\n`;
    t += `½@2x+60% ${pc(r.xh)} · 2-phase ${pc(r.x2p)} · ladder ${pc(r.xl)} · levels ${pc(r.xlv)} · $1M-out ${pc(r.xm1)} · $1M-vol ${pc(r.xm1v)} · vol-stop ${pc(r.xvs)}\n2x-out ${pc(r.xtp)} · trail40 ${pc(r.x40)} · trail60 ${pc(r.x60)} · trail80 ${pc(r.x80)} · hold ${pc(r.xt)}\nran after entry (24h): avg peak ${(r.ap || 1).toFixed(2)}x · ${r.ap3 || 0} went 3x+\n`;
  }
  return t;
}
