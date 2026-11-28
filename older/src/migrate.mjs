// migrate.mjs — carrying a base book's EXISTING buys into a newly added clock book (owner, 21 Nov 2026: "add the current data
// to it"). Runs once at start-up, before the positions are restored; an entry that already carries the family is left alone.
//
// For every stored buy of the base book, the clock book gets its own exit versions, copied from the plain ones:
//   • the plain version had already stopped out BEFORE the clock time  → the same real result (exact);
//   • the clock time is still in the future                            → a copy of the live position; the engine runs its clock;
//   • the clock time has passed and the plain version was still open then (or closed later) → the clock sale is ESTIMATED:
//       price at the clock = the close of the last one-minute bar COMPLETED before it (no such bar since the buy = unchanged),
//       as a ratio to the signal price; the pool at the clock is the constant-product pool with the buy pool's k at that price;
//       the tokens held then (half already banked if the half-sale happened before the clock) are sold on it, fee and
//       transaction cost charged. Marked exit.est = true and exec "estimated-minute-bar"; shown as "est." on the page.
// LIMITS of an estimated sale: a minute close is not the state 0.7 s after the clock; the bar ratio is in USD (SOL/USD movement
// over the hold is not removed); k is assumed unchanged since the buy. It is an estimate on REAL buys, never a decision input.
import * as S from "./spec.mjs";
import { newVersion, COST } from "./book.mjs";

export function addClockBook(store, family, now) {
  const ck = S.CLOCK[family], out = { base: ck?.base, added: 0, exact: 0, estimated: 0, live: 0 }; if (!ck) return out;
  const db = store.db, lastBar = db.prepare("SELECT m, c, src FROM bars WHERE mint = ? AND m >= ? AND m < ? AND src != 'backfill-rejected' ORDER BY m DESC LIMIT 1"); // minutes COMPLETED before the clock (the minute containing it closes after it), and never a rejected back-fill row
  const dec = db.prepare("INSERT OR IGNORE INTO decisions VALUES (?,?,?,?,?,?)");
  for (const row of db.prepare("SELECT json FROM entries ORDER BY id").all()) {
    const e = JSON.parse(row.json); if (!e.families?.includes(ck.base) || e.families.includes(family)) continue;
    e.families.push(family); const bc = (e.cands || []).find((c) => c.family === ck.base); if (bc) e.cands.push({ family, detail: bc.detail });
    const T = e.fill ? e.fill.t + ck.at : null;
    for (const p of e.versions.filter((v) => v.stall === false)) {
      if (e.status !== "filled") { e.versions.push(newVersion(p.stop, p.policy, ck.tag)); continue; }
      const c = JSON.parse(JSON.stringify(p)); c.stall = ck.tag; c.stallChecked = false;
      if (p.status === "closed" && p.exit && p.exit.t <= T) { c.stallChecked = true; out.exact++; }
      else if (T > now) out.live++;
      else if (!(e.fill.quote_sol > 0) || !(e.fill.base > 0)) { c.stallChecked = true; c.flag = "bought on a routed quote: the clock sale cannot be estimated; this row keeps the plain result"; out.exact++; }
      else {
        const m0 = Math.floor(e.fill.t / 60), bar = lastBar.get(e.mint, m0, Math.floor(T / 60)), r = bar && e.signalPx > 0 ? bar.c / e.signalPx : 1;
        const banked = p.half && p.half.t <= T ? p.half : null, tok = banked ? e.fill.tok * (1 - S.SCALE_FRACTION) : e.fill.tok, got = banked ? banked.sol : 0;
        const k = e.fill.quote_sol * e.fill.base, px = (e.fill.quote_sol / e.fill.base) * r, q = Math.sqrt(k * px), b = Math.sqrt(k / px), fee = e.fill.fee_buy ?? 0.003;
        const sol = (q * tok) / (b + tok) * (1 - fee) - S.TX_COST_SOL, total = got + sol;
        Object.assign(c, { status: "closed", tok: 0, got, half: banked, reason: ck.reason, trigT: T, trigValue: null, schedT: null, stallChecked: true, lastX: total / COST, lastT: T,
          exit: { t: T + S.SELL_DELAY_MS / 1000, sol: total, last_sol: sol, ret: total / COST - 1, delay_s: 0, hold_s: Math.round(ck.at + S.SELL_DELAY_MS / 1000), trigger_value: null, fee_src: "assumed (estimate)",
            exec: "estimated-minute-bar", est: true, est_from: bar ? { minute: bar.m * 60, close: bar.c, src: bar.src, ratio_to_signal: +r.toFixed(4) } : "no trade between the buy and the clock: price unchanged", pool: { q, b, f: fee } } });
        delete c.unresolvedSince; delete c.unresolvedWhy; out.estimated++;
      }
      e.versions.push(c);
    }
    store.tx(() => { store.saveEntry(e); dec.run(e.mint, e.ag, family, e.decisionT, e.id, JSON.stringify(bc?.detail ?? null)); }); out.added++; // the entry and its one-buy flag in one commit
  }
  if (out.added) store.feedEvent?.(now, "migration: clock book added", `${family}: ${out.added} ${ck.base} buys carried in (${out.estimated} clock sales estimated)`);
  return out;
}
