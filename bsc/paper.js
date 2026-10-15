// Paper trading: one position per strategy entry, the same 13 parallel exits as Solana (src/exits.js), close on
// trail-80 or the hold limit, sweeper for anything left open (restarts, dead tokens), Telegram alerts + closes.
import { C } from "./config.js";
import { db, q, X } from "./db.js";
import { tg, esc, fmt, links, pc } from "./telegram.js";
import { newExits, stepExits, finalExits } from "../src/exits.js";
import { levelsStep } from "../src/levels.js";
import { poolPrice } from "./pools.js";
import { quoteUsd } from "./price.js";

export const ps = { opened: 0, closed: 0, alerts: 0, swept: 0, byKind: {} };
const OPEN = new Map(); // id -> position
const BY_TOKEN = new Map(); // token -> Set(id)
const KIND = { // label, emoji, close title
  momentum: ["VOLUME", "📈"], burst: ["BURST", "⚡"], wave2: ["SECOND WAVE", "🌊"], gradrun: ["GRADUATION RUNNER", "🎓🚀"], gradrec: ["GRADUATION RECOVERY", "🔁🎓"],
  revival: ["REVIVAL", "🔁"], slow: ["SLOW BUILD", "📈🔁"], copy: ["COPY", "👁"], copycreator: ["COPY CREATOR", "🧑‍💻"], early: ["EARLY (silent)", "🐣"], grad: ["GRADUATION ENTRY", "🎓"],
};
export const kindName = (k) => (KIND[k] || [k])[0];

/** open a paper position. f = entry features (columns), alertText = message body or null for a silent entry */
export async function open(kind, s, f, alertText) {
  const now = Math.floor(Date.now() / 1000);
  const row = {
    strategy: kind, label: f.label ?? null, token: s.token, name: s.name || s.token.slice(0, 8), symbol: s.symbol || "", venue: s.graduated ? "pancake" : "flap", quote: s.quoteSym || "BNB",
    entry_ts: now, entry_price: s.lastPx, entry_mc: s.lastMc, entry_age_s: s.createTs ? Math.max(0, (s.lastTs || now) - s.createTs) : null, hour_utc: new Date().getUTCHours(), graduated_entry: s.graduated ? 1 : 0,
    vol5m_usd: null, vol1m_usd: null, buys_entry: null, sells_entry: null, buyers_entry: null, bs_ratio_entry: null, new60_entry: null, new5_entry: null,
    bundle_pct: null, bundle_usd: null, bundle_wallets: null, snipers: null, dev_buy_usd: null, tax_bps: null, creator_prior: null, creator_grads: null, proven_entry: null,
    q_score: null, q_wallets: null, q_per10k: null, q_top3: null, q_roundtrip: null, q_router: null, q_size_cv: null, q_new_pct: null, q_px_per10k: null,
    feed_final_pct: null, feed_live_pct: null, feed_polling: null, note: null, alerted: alertText ? 1 : 0, ...f,
  };
  delete row.label; row.label = f.label ?? null;
  const id = q.insTrade.run(row).lastInsertRowid;
  const p = { id, kind, token: s.token, name: row.name, e: newExits(s.lastPx, s.lastMc, row.vol5m_usd || 0), entryTs: now, peakMc: s.lastMc, lastPx: s.lastPx, lastMc: s.lastMc, lastWrite: 0, msgId: null, alerted: !!alertText, cards: {} };
  OPEN.set(id, p); if (!BY_TOKEN.has(s.token)) BY_TOKEN.set(s.token, new Set()); BY_TOKEN.get(s.token).add(id);
  ps.opened++; ps.byKind[kind] = (ps.byKind[kind] || 0) + 1;
  setTimeout(() => close(p, "time"), C.MAX_HOLD_MIN * 60_000);
  for (const m of [5, 15]) setTimeout(() => card(p, m, s), m * 60_000);
  if (alertText) {
    ps.alerts++;
    p.msgId = await tg(alertText + `\n${links(s.token)}`);
    if (p.msgId) q.setMsg.run(p.msgId, id);
    for (const m of C.SCORECARD_MIN) setTimeout(() => scorecard(p, m, s), m * 60_000);
  }
  return p;
}

/** every trade on a token steps its open positions */
export function onTokenTrade(s) {
  const ids = BY_TOKEN.get(s.token); if (!ids) return;
  const w = s.win5, v5 = w.v, bu = w.b, su = w.s;
  for (const id of ids) {
    const p = OPEN.get(id); if (!p) continue;
    p.lastPx = s.lastPx; p.lastMc = s.lastMc; if (s.lastMc > p.peakMc) p.peakMc = s.lastMc;
    if (!p.e.volAtEntry) p.e.volAtEntry = v5;
    stepExits(p.e, s.lastPx, s.lastMc, v5, bu, su);
    const now = Date.now();
    if (now - p.lastWrite > 5000) save(p);
    if (p.e.x.tsl80 != null) close(p, "tsl80");
  }
}
function save(p) {
  const x = p.e.x; p.lastWrite = Date.now();
  q.updTrade.run(p.e.peak / p.e.entry, p.peakMc, p.lastPx, p.lastMc, Math.floor(Date.now() / 1000), ...X.filter((k) => k !== "time").map((k) => x[k] ?? null), p.id);
}
function card(p, m, s) { // after-entry snapshot (NOT an entry feature)
  if (m === 5) q.setCard.run(s.lastMc, null, s.buyers.size, p.id); else q.setCard.run(null, s.lastMc, null, p.id);
}
function scorecard(p, m, s) {
  if (!p.alerted) return;
  const mult = (p.lastPx || p.e.entry) / p.e.entry, peakMult = p.e.peak / p.e.entry, w = s.win5;
  const flags = []; if (w.ns > w.nb) flags.push("⚠️ sells > buys"); if (w.v < 25_000) flags.push("💤 volume faded"); if (!OPEN.has(p.id)) flags.push("closed");
  tg(`⏱ <b>+${m}m</b> ${esc(p.name)} · MC <b>$${fmt(s.lastMc)}</b> (${pc(mult)}, peak ${peakMult.toFixed(2)}x) · 5m vol $${fmt(w.v)} · buys ${w.nb} / sells ${w.ns}` + (flags.length ? `\n${flags.join(" · ")}` : ""), { replyTo: p.msgId });
}

export function close(p, reason, priceOverride = null) {
  if (!OPEN.has(p.id)) return; OPEN.delete(p.id); BY_TOKEN.get(p.token)?.delete(p.id);
  const px = priceOverride ?? p.lastPx ?? p.e.entry, mult = px / p.e.entry, v = finalExits(p.e, mult), peakMult = Math.max(p.e.peak, px) / p.e.entry;
  const mc = p.lastMc * (px / (p.lastPx || px)), now = Math.floor(Date.now() / 1000);
  q.closeTrade.run(peakMult, p.peakMc, px, mc, now, ...X.map((k) => v[k]), now, px, mc, reason, p.id);
  ps.closed++; for (const fn of closeHooks) { try { fn(p); } catch {} }
  if (p.alerted) tg(`${v.combo >= 1 ? "✅" : "🔴"} <b>${kindName(p.kind)} CLOSE</b> — ${esc(p.name)} (${reason}) · peak <b>${peakMult.toFixed(2)}x</b> · now ${mult.toFixed(2)}x\n` +
    `combo <b>${pc(v.combo)}</b> · ½@2x+60% ${pc(v.half60)} · 2-phase ${pc(v.twophase)} · ladder ${pc(v.ladder)} · levels ${pc(v.levels)} · vol-stop ${pc(v.volstop)}\n` +
    `2x-out ${pc(v.tp)} · trail40 ${pc(v.tsl40)} · trail60 ${pc(v.tsl60)} · trail80 ${pc(v.tsl80)} · $1M-out ${pc(v.m1)} · $1M-vol ${pc(v.m1vol)} · hold ${pc(v.time)}`, { replyTo: p.msgId });
}
export const openCount = () => OPEN.size;
export const isOpen = (id) => OPEN.has(id);
const closeHooks = []; export const onClose = (fn) => closeHooks.push(fn);
export const openForToken = (token) => BY_TOKEN.get(token)?.size || 0;
export const openTokens = () => [...BY_TOKEN.entries()].filter(([, v]) => v.size).map(([k]) => k);

/** after a restart: positions back in memory; anything past its hold limit is closed by the sweeper */
export function restore(getState) {
  let n = 0;
  for (const r of q.openTrades.all()) {
    const e = newExits(r.entry_price, r.entry_mc, r.vol5m_usd || 0), pm = r.peak_mult || 1;
    e.peak = r.entry_price * pm; e.half = pm >= 2; e.s3 = pm >= 3; e.armed = pm >= 1.5;
    for (const k of X) if (k !== "time" && r["x_" + k] != null) e.x[k] = r["x_" + k];
    levelsStep(e.lv, r.entry_mc, r.peak_mc || r.entry_mc, pm, 0); if (r.x_levels != null) e.lv.done = r.x_levels;
    const p = { id: r.id, kind: r.strategy, token: r.token, name: r.name, e, entryTs: r.entry_ts, peakMc: r.peak_mc || r.entry_mc, lastPx: r.last_price || r.entry_price, lastMc: r.last_mc || r.entry_mc, lastWrite: 0, msgId: r.msg_id, alerted: !!r.alerted, cards: {} };
    OPEN.set(p.id, p); if (!BY_TOKEN.has(p.token)) BY_TOKEN.set(p.token, new Set()); BY_TOKEN.get(p.token).add(p.id);
    getState(r.token, r); n++;
    const left = r.entry_ts + C.MAX_HOLD_MIN * 60 - Date.now() / 1000; if (left > 0) setTimeout(() => close(p, "time"), left * 1000);
  }
  return n;
}
/** every 5 min: close anything past its hold limit at the real price (curve: last trade price — a curve only moves on trades; pool: reserves) */
export function startSweeper(getState) {
  setInterval(async () => {
    const now = Date.now() / 1000;
    for (const p of [...OPEN.values()]) {
      if (now - p.entryTs < C.MAX_HOLD_MIN * 60 + 60) continue;
      const s = getState(p.token); let px = p.lastPx;
      if (s?.pool) { const pp = await poolPrice(s.pool); if (pp) { px = pp; const qu = quoteUsd(s.quote); if (qu) p.lastMc = pp * C.TOTAL_SUPPLY * qu; } }
      close(p, "sweep", px); ps.swept++;
    }
  }, 300_000);
}
export function invalidate(token, why) { db.prepare(`UPDATE paper_trades SET invalid=1, note=COALESCE(note,'')||? WHERE token=?`).run(` invalid:${why}`, token); for (const id of BY_TOKEN.get(token) || []) { OPEN.delete(id); } BY_TOKEN.delete(token); }
