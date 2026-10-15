// v0.18: /check <mint> — everything the bot knows about one token right now, plus DexScreener's live view, so
// "did the bot see this?" can be answered from Telegram instead of by reading logs.
import { db, q } from "./db.js";
import { esc, fmt, links } from "./launch-monitor.js";
import { lifeSnap } from "./lifecycle.js";
import { momSnap } from "./momentum.js";
import { dexSnap } from "./dex.js";
import { CFG } from "./config.js";

const qTrades = db.prepare(`SELECT strategy, datetime(entry_ts,'unixepoch') t, entry_mc, peak_mult, closed, exit_reason, venue, trigger_kind FROM paper_trades WHERE mint=? ORDER BY id`);
const qGrad = db.prepare(`SELECT graduated, peak_mc_usd, outside_buyers, creator FROM tokens WHERE mint=?`);
const ago = (ts) => { const d = Math.floor(Date.now() / 1000) - ts; return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${(d / 3600).toFixed(1)}h ago` : `${(d / 86400).toFixed(1)}d ago`; };

export async function checkText(mint) {
  const meta = q.tokenMeta.get(mint), g = qGrad.get(mint);
  let t = `🔎 <b>CHECK</b> — ${esc(meta?.name || mint.slice(0, 8))}${meta?.symbol ? ` ($${esc(meta.symbol)})` : ""}\n`;
  if (meta) t += `Launch seen ${ago(meta.create_ts)} · bundle ${meta.bundle_pct?.toFixed(0) ?? "?"}% / ${meta.bundle_sol?.toFixed(1) ?? "?"} SOL · tier ${meta.tier ?? "?"} · graduated ${g?.graduated ? "yes" : "no"} · peak $${fmt(g?.peak_mc_usd || 0)} · buyers ${g?.outside_buyers ?? "?"}\n`;
  else t += `Not launched on pump.fun while the tracker was running (no launch record).\n`;
  const l = lifeSnap(mint); if (l) t += `Lifecycle: ${l.buyers} buyers · cp5 ${l.cp5 ? "$" + fmt(l.cp5.mc || 0) : "—"}\n`;
  const m = momSnap(mint);
  if (m) t += `Volume feed: 5m <b>$${fmt(m.v5)}</b> · buys ${m.buys} / sells ${m.sells} · ${m.wallets} wallets · last MC $${fmt(m.lastMc)} (${ago(m.lastTs)}) · peak $${fmt(m.peakMc)}\nvenues: ${Object.entries(m.venues).map(([k, v]) => `${k} $${fmt(v)}`).join(" · ") || "—"} · position ${m.open ? "OPEN" : "none"} · momentum trades ${m.trades}\n`;
  else t += `Volume feed: no swaps received in the last 15 min (not in memory).\n`;
  const pools = dexSnap(mint); if (pools.length) t += `DEX pools mapped: ${pools.map((p) => `${p.pool.slice(0, 6)}… (${p.binStep != null ? "dlmm" : p.solSide == null ? "cpmm" : "pool"} · supply ${fmt(p.supply)})`).join(", ")}\n`;
  const tr = qTrades.all(mint);
  t += tr.length ? `Paper trades (${tr.length}):\n` + tr.map((r) => `• ${r.strategy}${r.trigger_kind ? "/" + r.trigger_kind : ""}${r.venue ? " @" + r.venue : ""} ${r.t} UTC · in $${fmt(r.entry_mc || 0)} · peak ${(r.peak_mult || 1).toFixed(2)}x · ${r.closed ? "closed " + (r.exit_reason || "") : "open"}`).join("\n") + "\n" : `Paper trades: none\n`;
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) });
    const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana").sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    if (pairs.length) {
      const p0 = pairs[0];
      t += `\n<b>DexScreener now</b>: ${esc(p0.baseToken?.name || "?")} · MC $${fmt(p0.marketCap || p0.fdv || 0)} · created ${p0.pairCreatedAt ? ago(Math.floor(p0.pairCreatedAt / 1000)) : "?"}\n`;
      for (const p of pairs.slice(0, 5)) t += `• ${p.dexId}${p.labels?.length ? " " + p.labels.join("/") : ""} ${p.quoteToken?.symbol || "?"} pair · liq $${fmt(p.liquidity?.usd || 0)} · vol 5m $${fmt(p.volume?.m5 || 0)} · 1h $${fmt(p.volume?.h1 || 0)} · 24h $${fmt(p.volume?.h24 || 0)} · 5m ${p.priceChange?.m5 ?? "?"}%\n`;
      const total5 = pairs.reduce((a, p) => a + (p.volume?.m5 || 0), 0);
      t += `Total 5m volume across pairs $${fmt(total5)} — trigger is $${fmt(CFG.VOL5M_USD)} in 5 min under $${fmt(CFG.MOM_MC_CAP)} MC.\n`;
    } else t += `\nDexScreener: no Solana pairs found for this mint.\n`;
  } catch (e) { t += `\nDexScreener lookup failed (${esc(e.message)}).\n`; }
  return t + links(mint);
}
