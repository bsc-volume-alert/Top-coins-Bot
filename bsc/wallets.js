// Wallet leaderboard (5x / 10x hit rate, bundlers and create-block buys excluded), proven wallets, watch lists,
// creator leaderboard (by graduations) and runner autopsy — same rules as the Solana tracker (analysis/README.md 6–7).
import { C } from "./config.js";
import { db } from "./db.js";
import { esc, fmt } from "./telegram.js";

const W = new Map(), CR = new Map();
const loadWatch = () => { W.clear(); CR.clear(); for (const r of db.prepare(`SELECT * FROM watch_wallets`).all()) W.set(r.wallet, r.label); for (const r of db.prepare(`SELECT * FROM watch_creators`).all()) CR.set(r.creator, r.label); };
loadWatch();
export const isWatchedWallet = (w) => W.has(w);
export const isWatchedCreator = (c) => CR.has(c);
export const walletLabel = (w) => W.get(w) || w.slice(0, 6) + "…" + w.slice(-4);
export const creatorLabel = (c) => CR.get(c) || c.slice(0, 6) + "…" + c.slice(-4);
export function addWatch(w, label) { db.prepare(`INSERT OR REPLACE INTO watch_wallets VALUES (?,?,?)`).run(w.toLowerCase(), label, Math.floor(Date.now() / 1000)); loadWatch(); }
export function removeWatch(w) { db.prepare(`DELETE FROM watch_wallets WHERE wallet=?`).run(w.toLowerCase()); loadWatch(); }
export function addWatchCreator(c, label) { db.prepare(`INSERT OR REPLACE INTO watch_creators VALUES (?,?,?)`).run(c.toLowerCase(), label, Math.floor(Date.now() / 1000)); loadWatch(); }
export function removeWatchCreator(c) { db.prepare(`DELETE FROM watch_creators WHERE creator=?`).run(c.toLowerCase()); loadWatch(); }
export const watchList = () => [...W.entries()], watchCreatorList = () => [...CR.entries()];

// ---- proven wallets: >= WALLET_MIN_BUYS resolved non-bundle early buys, >= PROVEN_RATE of them reached 5x ----
let proven = new Set();
const qWalletStats = (since) => db.prepare(`SELECT wallet, COUNT(*) n, SUM(peak_24h >= entry_mc*5) x5, SUM(peak_24h >= entry_mc*10) x10, SUM(peak_24h >= entry_mc*2) x2, MAX(peak_24h/entry_mc) best
  FROM wallet_buys WHERE resolved=1 AND is_bundle=0 AND age_s >= 1 AND entry_mc > 0 AND ts >= ? GROUP BY wallet HAVING n >= ?`).all(since, C.WALLET_MIN_BUYS);
function refreshProven() { try { proven = new Set(qWalletStats(0).filter((r) => r.x5 / r.n >= C.PROVEN_RATE).map((r) => r.wallet)); } catch {} }
refreshProven(); setInterval(refreshProven, 600_000);
export const provenCount = (wallets) => new Set(wallets.filter((w) => proven.has(w))).size;
export const provenSize = () => proven.size;

export function leaderboardText(days, top) {
  const rows = qWalletStats(Math.floor(Date.now() / 1000) - days * 86400).map((r) => ({ ...r, r5: r.x5 / r.n, r10: r.x10 / r.n })).sort((a, b) => b.r5 - a.r5 || b.r10 - a.r10 || b.n - a.n).slice(0, top);
  const base = db.prepare(`SELECT COUNT(*) n, SUM(peak_24h >= entry_mc*5) x5 FROM wallet_buys WHERE resolved=1 AND is_bundle=0 AND age_s >= 1 AND entry_mc > 0 AND ts >= ?`).get(Math.floor(Date.now() / 1000) - days * 86400);
  if (!rows.length) return `👛 <b>Wallets (${days}d)</b> — not enough resolved buys yet (needs ≥${C.WALLET_MIN_BUYS} early buys per wallet, scored 24h later)`;
  return `👛 <b>Top wallets — ${days}d</b> (early buys, bundlers & create-block buys excluded; base 5x rate ${base.n ? ((base.x5 / base.n) * 100).toFixed(0) : "—"}% of ${base.n})\n` +
    rows.map((r, i) => `${i + 1}. <code>${r.wallet}</code>${W.has(r.wallet) ? " 👁" : ""}${proven.has(r.wallet) ? " ✅" : ""}\n    ${r.n} buys · 5x ${(r.r5 * 100).toFixed(0)}% · 10x ${(r.r10 * 100).toFixed(0)}% · best ${r.best.toFixed(1)}x`).join("\n") + "\n/watch &lt;address&gt; [label] to copy one";
}
export function walletText(w) {
  w = w.toLowerCase();
  const rows = db.prepare(`SELECT b.*, t.name FROM wallet_buys b LEFT JOIN tokens t ON t.token=b.token WHERE wallet=? ORDER BY ts DESC LIMIT 12`).all(w);
  if (!rows.length) return `No early buys recorded for <code>${esc(w)}</code>`;
  const r = rows.filter((x) => x.resolved && !x.is_bundle), x5 = r.filter((x) => x.peak_24h >= x.entry_mc * 5).length;
  return `👛 <code>${esc(w)}</code>${W.has(w) ? " 👁 " + esc(W.get(w)) : ""}${proven.has(w) ? " ✅ proven" : ""}\nResolved ${r.length} · hit 5x ${x5}\n` + rows.map((x) => `• ${esc((x.name || x.token.slice(0, 8)).slice(0, 16))} @${x.age_s}s $${fmt(x.usd)} at MC $${fmt(x.entry_mc)} → peak ${(x.peak_24h / x.entry_mc).toFixed(1)}x${x.is_bundle ? " (bundle)" : ""}${x.resolved ? "" : " (open)"}`).join("\n");
}
export function creatorsText(days, top) {
  const rows = db.prepare(`SELECT creator, COUNT(*) n, SUM(graduated) g, MAX(peak_mc) best, SUM(peak_mc >= 100000) h100 FROM tokens WHERE venue='flap' AND create_ts >= ? AND creator IS NOT NULL GROUP BY creator HAVING n >= 1 ORDER BY g DESC, best DESC LIMIT ?`).all(Math.floor(Date.now() / 1000) - days * 86400, top);
  if (!rows.length) return `🧑‍💻 <b>Creators (${days}d)</b> — none yet`;
  return `🧑‍💻 <b>Top creators — ${days}d</b> (by graduations; ⭐ = ≥${C.CREATOR_GRADS_FLAG})\n` + rows.map((r, i) => `${i + 1}. <code>${r.creator}</code>${CR.has(r.creator) ? " 👁" : ""}${(r.g || 0) >= C.CREATOR_GRADS_FLAG ? " ⭐" : ""}\n    ${r.n} launches · ${r.g || 0} graduated · ${r.h100 || 0} hit $100K · best $${fmt(r.best)}`).join("\n") + "\n/watchcreator &lt;address&gt; [label]";
}
export function creatorText(c) {
  c = c.toLowerCase();
  const rows = db.prepare(`SELECT * FROM tokens WHERE creator=? ORDER BY create_ts DESC LIMIT 12`).all(c);
  if (!rows.length) return `No launches recorded for <code>${esc(c)}</code>`;
  return `🧑‍💻 <code>${esc(c)}</code>${CR.has(c) ? " 👁 " + esc(CR.get(c)) : ""}\n${rows.length} launches shown · ${rows.filter((r) => r.graduated).length} graduated\n` + rows.map((r) => `• ${esc((r.name || "").slice(0, 16))} ${new Date(r.create_ts * 1000).toISOString().slice(5, 16)} · peak $${fmt(r.peak_mc)}${r.graduated ? " 🎓" : ""}`).join("\n");
}
export function runnersText(hours, top) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = db.prepare(`SELECT * FROM tokens WHERE venue='flap' AND create_ts >= ? AND peak_mc >= 100000 ORDER BY peak_mc DESC LIMIT ?`).all(since, top);
  if (!rows.length) return `🏃 <b>Runners (${hours}h)</b> — no Flap launch since start has reached $100K yet`;
  const life = db.prepare(`SELECT cp, mc FROM token_life WHERE token=? AND cp IN (300,900,3600)`), trades = db.prepare(`SELECT strategy, entry_mc, entry_age_s FROM paper_trades WHERE token=? AND invalid=0 ORDER BY entry_ts`);
  return `🏃 <b>Runner autopsy — ${hours}h</b> (Flap launches since start that reached $100K)\n` + rows.map((r) => {
    const l = Object.fromEntries(life.all(r.token).map((x) => [x.cp, x.mc])), tr = trades.all(r.token);
    return `<b>${esc((r.name || r.token.slice(0, 8)).slice(0, 18))}</b> peak $${fmt(r.peak_mc)}${r.graduated ? " 🎓" : ""} · ${r.buyers_total || 0} buyers\n  launch: bundle ${(r.bundle_pct ?? 0).toFixed(0)}% · dev $${fmt(r.dev_buy_usd)} · snipers ${r.snipers ?? "?"} · creator ${r.creator_prior ?? 0} prior/${r.creator_prior_grads ?? 0} grads\n  path: 5m ${l[300] != null ? "$" + fmt(l[300]) : "—"} → 15m ${l[900] != null ? "$" + fmt(l[900]) : "—"} → 1h ${l[3600] != null ? "$" + fmt(l[3600]) : "—"}\n  fired: ${tr.length ? tr.map((t) => `${t.strategy}@$${fmt(t.entry_mc)}`).join(", ") : "none"}`;
  }).join("\n");
}
