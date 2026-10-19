// v0.18.114 — the executor's book as JSON (every position since the price fix with its buy/sell orders and the paper trade it copied), for the
// `data` branch the 4-hourly study reads. Read-only. `node scripts/dump-live.cjs > executor.json` from /root/tracker.
const D = require(require("path").join(__dirname, "..", "node_modules", "better-sqlite3"));
const EX = process.env.EXDB || "/root/executor/executor.db", TR = process.env.TRDB || "/root/tracker/data/tracker.db", FROM = Number(process.env.FROM || 1792351500);
const ex = new D(EX, { readonly: true }), tr = new D(TR, { readonly: true });
const J = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const pos = ex.prepare(`SELECT p.*, b.stake_lamports b_stake, b.tip_lamports b_tip, b.from_trigger_ms b_ms, b.send_ms b_send, b.sim_ms b_sim, b.fill_tokens b_tok, b.fill_sol b_sol, b.quote_out b_quote, b.detail b_det, b.ix_kind b_kind, b.ts b_ts,
  s.rule s_rule, s.detail s_det, s.quote_out s_quote, s.min_out s_min, s.fill_sol s_sol, s.send_ms s_send, s.sim_ms s_sim, s.slippage s_slip, s.tip_lamports s_tip, s.status s_status, s.sim_err s_err, s.ts s_ts, s.ix_kind s_kind
  FROM positions p LEFT JOIN orders b ON b.id=p.buy_order LEFT JOIN orders s ON s.id=p.sell_order WHERE p.opened_ts>=? ORDER BY p.opened_ts`).all(FROM);
const paper = tr.prepare(`SELECT id, strategy, name, entry_ts, exit_ts, entry_mc, entry_price, peak_mult, after_peak_mult, exit_reason, closed, venue, x_h5, x_flow4, x_h5f12, x_h5f14, x_h3, x_h15, x_h5fast, x_t15s40, x_split, x_dead, dd_pre15, t_hit15_s, first_secs, early_json, bundle_pct, q_wallets, buyers_entry, sells_entry, bs_ratio_entry, vol5m_usd, vol1m_usd, v2m_usd, age_s, entry_age_s, hour_utc, holders_entry, top10_entry, dev_hold_entry, snipers_n, fresh_share, path, px_suspect, crashloop, invalid FROM paper_trades WHERE id=?`);
const out = { from: FROM, now: Math.floor(Date.now() / 1000), trades: [], skips: ex.prepare(`SELECT book, status, skip_reason r, COUNT(*) n FROM orders WHERE side='buy' AND status IN ('skipped','error','sim-failed','failed','expired') AND ts>=? GROUP BY 1,2,3 ORDER BY n DESC`).all(FROM), events: ex.prepare(`SELECT ts, kind, substr(text,1,160) t FROM events WHERE ts>=? AND kind NOT IN ('skip') ORDER BY id DESC LIMIT 120`).all(FROM) };
for (const p of pos) {
  const pr = paper.get(p.paper_id) || null; let path = null; if (pr && pr.path) { const P = J(pr.path) || {}; path = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v && typeof v === "object" ? v.m : v])); }
  out.trades.push({ id: p.paper_id, book: p.book, exit: p.exit, name: p.name, mint: p.mint, mode: p.mode, st: p.status, o: p.opened_ts, c: p.closed_ts, tok: p.tokens, cost: p.cost_lamports, pro: p.proceeds_lamports, pnl: p.pnl_lamports, rule: p.exit_rule, pm: p.paper_exit_mult, ppx: p.paper_entry_price, venue: p.venue, kind: p.ix_kind,
    buy: { stake: p.b_stake, tip: p.b_tip, ms: p.b_ms, send: p.b_send, sim: p.b_sim, tok: p.b_tok, sol: p.b_sol, quote: p.b_quote, kind: p.b_kind, ts: p.b_ts, d: J(p.b_det) },
    sell: p.sell_order ? { rule: p.s_rule, quote: p.s_quote, min: p.s_min, sol: p.s_sol, send: p.s_send, sim: p.s_sim, slip: p.s_slip, tip: p.s_tip, status: p.s_status, err: p.s_err, ts: p.s_ts, kind: p.s_kind, d: J(p.s_det) } : null,
    paper: pr ? { ...pr, path, first_secs: J(pr.first_secs), early_json: J(pr.early_json) } : null });
}
process.stdout.write(JSON.stringify(out));
