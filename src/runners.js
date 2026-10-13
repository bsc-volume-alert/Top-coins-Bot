// v0.14: runner autopsy — for every token that reached RUNNER_MIN_MC within 24h, what it looked like at each gate and which strategies fired.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { esc, fmt } from "./launch-monitor.js";

const cpName = (cp) => (cp < 3600 ? `${cp / 60}m` : `${cp / 3600}h`);
export function runnersText(hours = 24, limit = 10) {
  const from = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = q.runners.all(CFG.RUNNER_MIN_MC, from, limit);
  if (!rows.length) return `🏁 <b>Runners</b> — no token launched in the last ${hours}h has reached $${fmt(CFG.RUNNER_MIN_MC)} yet`;
  let out = `🏁 <b>Runners</b> — launched in last ${hours}h, peak ≥ $${fmt(CFG.RUNNER_MIN_MC)} (${rows.length})\n`;
  for (const r of rows) {
    const life = q.lifeFor.all(r.mint), papers = q.papersFor.all(r.mint);
    out += `\n<b>${esc(r.name || r.mint.slice(0, 8))}</b> ($${esc(r.symbol || "?")}) · peak <b>$${fmt(r.peak_24h)}</b> (30m peak $${fmt(r.peak_30m || 0)})\n`;
    if (r.bundle_pct != null) out += `T+4s: bundle ${Math.round(r.bundle_pct)}% · ${(r.bundle_sol || 0).toFixed(1)} SOL · ${r.bundle_wallets || 0} w · dev ${(r.dev_buy_sol || 0).toFixed(1)} SOL · socials ${r.has_socials === 1 ? "✓" : r.has_socials === 0 ? "✗" : "?"}${r.factory ? " · ⚠️factory" : ""} · hand-offs ${r.handoffs || 0}\n`;
    else out += `T+4s: launched before tracker\n`;
    if (life.length) {
      out += "Path: " + life.map((l) => `${cpName(l.cp)} $${fmt(l.mc || 0)}${l.buyers_total ? `/${l.buyers_total}b` : ""}${l.vol5m_usd >= 100_000 ? " 📈" : ""}`).join(" → ") + "\n";
      const first100 = life.find((l) => (l.vol5m_usd || 0) >= CFG.VOL5M_USD);
      if (first100) out += `First $100K/5m seen at ${cpName(first100.cp)} checkpoint, MC $${fmt(first100.mc)}\n`;
      const hold = life.find((l) => l.top10_pct != null); if (hold) out += `Top-10 holders (excl. pool) at ${cpName(hold.cp)}: ${hold.top10_pct.toFixed(0)}%\n`;
    }
    if (papers.length) {
      out += "Fired: " + papers.map((p) => `${p.strategy}${p.trigger_kind && !p.trigger_kind.startsWith(p.strategy) ? "/" + p.trigger_kind : ""} @$${fmt(p.entry_mc)} (+${Math.max(0, p.entry_ts - r.create_ts)}s, peak ${(p.peak_mult || 1).toFixed(1)}x, ½@2x+60% ${p.x_half60 != null ? ((p.x_half60 - 1) * 100).toFixed(0) + "%" : "open"})`).join(" · ") + "\n";
    } else out += "Fired: <b>none</b> — no strategy entered\n";
    out += `<code>${r.mint}</code>\n`;
  }
  return out;
}
