// swpaper.mjs — launcher 0.10.1. SW5 paper book: wallet-led entries with a fixed 5-minute hold. PAPER ONLY, live OFF.
// Hypothesis under test: the 200 wallets that bought 3×+ coins early in the 6–7 Nov half keep picking coins that move, and a fixed exit captures it
// (the historical 30-coin result — +10% at a 5-min hold, 80% wins, −45% with a trail — is the hypothesis, not a forward expectation).
//   Wallet list : launcher/lists/sw5_wallets.json, FROZEN 11 Nov (train half only; ≥ 8 coins bought at 15–180 s, ≥ 35% of them reached 3× the 60-s price).
//   Trigger     : the first trade at which ≥ 3 listed wallets each hold a net position ≥ 0.5 SOL in the coin (buys − sells by that wallet since creation),
//                 none of the three has sold anything yet, and the coin is ≤ 180 s old. One decision per coin.
//   Timeliness  : trades read every 2 s; entered only if read within 5 s of the trigger print, else LATE (recorded, not entered).
//   Entry       : 0.2 SOL (+ independent 0.02), reserves re-read 1 s after the decision, curve or pool maths (whichever venue the coin is on).
//   Exit        : sell at fill + 300 s (the 300 s run from the actual fill, chain_fill.entry_ts); no trail (trail 1), 2-h horizon as the backstop.
//   Recorded    : the listed wallets in, their net SOL, and (as events) when 2 of them have sold ≥ 50% of their tokens (sw5_decisions.copyexit_ts).
import { chainEntry, setPolicy, BOOK_POLICY } from "./chainfill.mjs";
import { onTradeRows } from "./r3paper.mjs";
import { readFileSync } from "node:fs";
const now = () => Math.floor(Date.now() / 1000);
export const SW_VER = "SW5-1"; const BOOK = "SW5", NEED = 3, MIN_NET = 0.5, T_MAX = 180, LATE_S = 5;
export const swStat = { coins: 0, triggers: 0, late: 0, entries: 0, errors: 0, lastErr: "", activated: null, wallets: 0 };
let db = null, tdb = null, LIST = new Set(); const S = new Map(); // mint → { c, net: Map(wallet→sol), sold: Set, bought: Map(wallet→tokens), trig, tracked, soldHalf: Set, done }
export function initSW(d, t) {
  db = d; tdb = t; if (!tdb) return;
  try { LIST = new Set(JSON.parse(readFileSync(new URL("../lists/sw5_wallets.json", import.meta.url), "utf8")).wallets); } catch (e) { swStat.lastErr = "list: " + e.message; }
  swStat.wallets = LIST.size;
  db.exec("CREATE TABLE IF NOT EXISTS sw5_decisions (mint TEXT PRIMARY KEY, create_ts INTEGER, trig_ts INTEGER, read_ts INTEGER, status TEXT, wallets TEXT, net_sol REAL, trig_px REAL, copyexit_ts INTEGER, ver TEXT)");
  const t0 = now();
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES (?,?,?)").run(BOOK, t0, SW_VER);
  db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('SW5_ACTIVATION', ?, ?)").run(t0, SW_VER);
  swStat.activated = db.prepare("SELECT since_ts FROM fd_rules WHERE k='SW5_ACTIVATION'").get()?.since_ts ?? t0;
  onTradeRows(onRows); setInterval(() => { const t = now(); for (const [m, s] of S) if (t - s.seen > 7200) S.delete(m); }, 60000);
}
function solUsd() { try { return tdb.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get()?.usd ?? null; } catch { return null; } }
function onRows(rows, readTs) {
  for (const r of rows) {
    if (!LIST.has(r.wallet)) { const s = S.get(r.mint); if (s) s.seen = readTs; continue; }
    let s = S.get(r.mint);
    if (!s) { const c = tdb.prepare("SELECT create_ts FROM tokens WHERE mint=?").get(r.mint)?.create_ts; s = { c: c || null, net: new Map(), sold: new Set(), bought: new Map(), soldTok: new Map(), trig: null, tracked: null, soldHalf: new Set(), done: !c, seen: readTs }; S.set(r.mint, s); swStat.coins++; }
    s.seen = readTs; if (s.done) continue;
    try {
      const sol = Number(r.sol) || 0, tok = Number(r.tokens) || 0;
      if (r.is_buy) { s.net.set(r.wallet, (s.net.get(r.wallet) || 0) + sol); s.bought.set(r.wallet, (s.bought.get(r.wallet) || 0) + tok); }
      else { s.net.set(r.wallet, (s.net.get(r.wallet) || 0) - sol); s.sold.add(r.wallet); s.soldTok.set(r.wallet, (s.soldTok.get(r.wallet) || 0) + tok);
        if (s.trig && s.tracked.has(r.wallet) && !s.soldHalf.has(r.wallet) && s.soldTok.get(r.wallet) >= 0.5 * (s.bought.get(r.wallet) || 0)) { s.soldHalf.add(r.wallet); // event only (not an exit): 2 of the tracked wallets have sold half their tokens
          if (s.soldHalf.size >= 2) db.prepare("UPDATE sw5_decisions SET copyexit_ts=? WHERE mint=? AND copyexit_ts IS NULL").run(r.ts, r.mint); } }
      if (s.trig) continue;
      if (r.ts - s.c > T_MAX) { s.done = true; continue; }
      const inw = [...s.net].filter(([w, v]) => v >= MIN_NET && !s.sold.has(w)).map(([w]) => w);
      if (inw.length < NEED || r.ts - s.c < 10) continue;
      // ---- trigger
      s.trig = r.ts; s.tracked = new Set(inw); swStat.triggers++;
      const late = readTs > r.ts + LATE_S, px = Number(r.price_sol) || null, netSum = inw.reduce((a, w) => a + s.net.get(w), 0);
      db.prepare("INSERT OR IGNORE INTO sw5_decisions (mint, create_ts, trig_ts, read_ts, status, wallets, net_sol, trig_px, ver) VALUES (?,?,?,?,?,?,?,?,?)").run(r.mint, s.c, r.ts, readTs, late ? "late: read after trigger + 5 s" : "entered", inw.join(","), +netSum.toFixed(3), px, SW_VER);
      if (late) { swStat.late++; continue; }
      const su = solUsd(), usdPx = su && px ? px * su : null;
      db.prepare("INSERT OR IGNORE INTO vol_paper (strat, mint, entry_ts, entry_price, entry_mc, created_ts, age_min, row) VALUES (?,?,?,?,?,?,?,?)")
        .run(BOOK, r.mint, readTs, usdPx, usdPx ? +(usdPx * 1e9).toFixed(0) : null, s.c, +((readTs - s.c) / 60).toFixed(2), JSON.stringify({ sw5: { ver: SW_VER, trig_ts: r.ts, read_ts: readTs, wallets: inw, net_sol: +netSum.toFixed(3), trig_px: px, sol_usd: su } }));
      const id = db.prepare("SELECT id FROM vol_paper WHERE strat=? AND mint=?").get(BOOK, r.mint)?.id;
      if (id) { setPolicy(id, BOOK_POLICY[BOOK]); swStat.entries++; chainEntry(r.mint, [id], usdPx, su, BOOK).catch(() => {}); }
    } catch (e) { swStat.errors++; swStat.lastErr = `${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
  }
}
