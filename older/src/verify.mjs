// verify.mjs — DIAGNOSTIC account read for each simulated entry (one per unique entry, never per stop version).
// After a fill, ONE batched getMultipleAccounts (pool + its two vaults) is compared with the reconstructed state the fill used.
// The read never replaces the simulated fill (a later, more favourable observation must not rewrite history). A snapshot from a
// later slot may legitimately differ, so the record keeps both slots and the request/response times; only a difference with NO
// intervening event on that pool is evidence of a decoder problem (flagged `suspect`).
import { rpc, parsePool } from "./feed.mjs";
export const vf = { done: 0, failed: 0, within1pct: 0, suspect: 0, calls: 0 };
const atas = new Map(); // pool → { base, quote }

export async function verifyEntry(e, c, { store, lastSlotOf = () => null } = {}) {
  const req = Date.now() / 1000, eventsAtFill = c.eventCount ?? null;
  try {
    let a = atas.get(e.pool);
    if (!a) { vf.calls++; const r = await rpc("getAccountInfo", [e.pool, { encoding: "base64", commitment: "confirmed" }]); const p = r?.value ? parsePool(r.value.data[0]) : null; if (!p) throw new Error("pool account unreadable"); a = { base: p.poolBaseAta, quote: p.poolQuoteAta }; atas.set(e.pool, a); }
    vf.calls++; const r = await rpc("getMultipleAccounts", [[e.pool, a.base, a.quote], { encoding: "base64", commitment: "confirmed" }]);
    const resp = Date.now() / 1000, [pa, ba, qa] = r.value; if (!pa || !ba || !qa) throw new Error("account missing");
    const p = parsePool(pa.data[0]), base = Number(Buffer.from(ba.data[0], "base64").readBigUInt64LE(64)) / 1e6, vault = Buffer.from(qa.data[0], "base64").readBigUInt64LE(64);
    const quoteEff = Number(vault + p.virtualQuote) / 1e9;
    const dBase = base / e.fill.base - 1, dQuote = quoteEff / e.fill.quote_sol - 1, moved = (c.eventCount ?? null) !== eventsAtFill;
    e.verify = { commitment: "confirmed", context_slot: r.context?.slot ?? null, last_event_slot: lastSlotOf(e.mint), req_t: req, resp_t: +resp.toFixed(3), fill_t: e.fill.t, account: { base, quote_vault: Number(vault) / 1e9, virtual_quote: Number(p.virtualQuote) / 1e9, quote_eff: quoteEff }, reconstructed: { base: e.fill.base, quote_eff: e.fill.quote_sol }, diff_base: +dBase.toFixed(5), diff_quote: +dQuote.toFixed(5), events_between: moved };
    const close = Math.abs(dBase) < 0.01 && Math.abs(dQuote) < 0.01; if (close) vf.within1pct++;
    // comparable only when the account snapshot is at or after the last event we reconstructed from AND no event arrived for this
    // coin while the read was in flight; otherwise a difference is expected and the check is recorded as inconclusive
    const aligned = !moved && e.verify.context_slot != null && e.verify.last_event_slot != null && e.verify.context_slot >= e.verify.last_event_slot;
    e.verify.comparable = aligned;
    if (!close && aligned) { e.verify.suspect = true; e.flags.push("entry verification: account state differs from the reconstructed state at a comparable slot"); vf.suspect++; }
    else if (!close) vf.inconclusive = (vf.inconclusive || 0) + 1;
    vf.done++;
  } catch (x) { vf.failed++; e.verify = { error: String(x.message).slice(0, 160), req_t: req }; }
  store?.saveEntry(e);
}
