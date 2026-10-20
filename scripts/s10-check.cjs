// v0.18.154: why has S10 never fired? For every fingerprint launch (10 bundle wallets, 37–41%, 22–28 SOL, dev < 0.2) since 19 Oct, print the
// token row, every recorded trade in its first 40 s (seconds after launch, MC), whether it graduated, and any paper row. Read-only.
const Database = require("better-sqlite3");
const db = new Database(process.env.DB_PATH || "/root/tracker/data/tracker.db", { readonly: true });
const FROM = Math.floor(Date.UTC(2026, 9, 19) / 1000);
const toks = db.prepare(`SELECT mint, name, create_ts, bundle_pct, bundle_sol, bundle_wallets, dev_buy_sol, tier, finalized, graduated, peak_mc_usd FROM tokens WHERE create_ts>=? AND bundle_wallets=10 AND bundle_pct BETWEEN 37 AND 41 AND bundle_sol BETWEEN 22 AND 28 AND dev_buy_sol<0.2 ORDER BY create_ts`).all(FROM);
console.log(`${toks.length} fingerprint launches since 19 Oct`);
const tr = db.prepare(`SELECT ts, slot, is_buy, sol, price FROM trades WHERE mint=? AND ts<=? ORDER BY ts, slot LIMIT 60`);
const pr = db.prepare(`SELECT id, strategy, entry_ts, entry_mc, x_h5 FROM paper_trades WHERE mint=?`);
for (const t of toks) {
  const trades = tr.all(t.mint, t.create_ts + 40), rows = pr.all(t.mint);
  console.log(`\n== ${t.name} ${t.mint} ${new Date(t.create_ts * 1000).toISOString().slice(5, 19)} tier ${t.tier} finalized ${t.finalized} graduated ${t.graduated} peak $${Math.round(t.peak_mc_usd || 0)} bundle ${t.bundle_pct}% ${t.bundle_sol} SOL ${t.bundle_wallets} w dev ${t.dev_buy_sol}`);
  console.log(`   trades in first 40 s: ${trades.length} · paper rows: ${rows.map((r) => r.strategy + "@" + (r.entry_ts - t.create_ts) + "s").join(", ") || "none"}`);
  const bySec = {}; for (const x of trades) { const a = x.ts - t.create_ts; (bySec[a] ||= []).push(`${x.is_buy ? "B" : "S"}${x.sol.toFixed(1)}@${(x.price * 1e9).toFixed(0)}`); }
  for (const [a, v] of Object.entries(bySec).slice(0, 14)) console.log(`   +${a}s (${v.length}): ${v.slice(0, 6).join(" ")}${v.length > 6 ? " …" : ""}`);
}
