// holders.mjs — HOLDER-CONCENTRATION SNAPSHOT at an entry. RECORD ONLY.
// Nothing in this file is read by a decision, a fill, a stop or an exit: it runs in the background from the engine's onEntry
// hook (the same hook as the existing provider snapshot), is never awaited by the engine, and can only add a field (e.hold)
// to an entry that already exists. OFF unless OLDER_HOLDER_SNAP=1.
//
// WHAT IT RECORDS (once per physical entry — one buy shared by several books and stops is one snapshot; the engine does not
// call onEntry for a pure re-buy):
//   call 1  getTokenLargestAccounts(mint)                       the 20 largest TOKEN ACCOUNTS and their raw balances
//   call 2  getMultipleAccounts([mint, …those 20], jsonParsed)  the mint (supply, decimals) and each account's OWNER
// Both are standard RPC calls. Budget and limits: see HOLDER_BUDGET below and reports/older/2026-11-24/LOGGING-DESIGN.md.
//
// WHAT IT IS NOT. The 20 largest token accounts are not the 20 largest wallets. An owner's other token accounts outside those
// 20 are not included, and several wallets controlled by one person are not linked. The measures are therefore named
// "top-account" measures and carry their completeness; they are never called exact wallet concentration.
// A pool vault is excluded ONLY when verified: the account's owner is this coin's own pool account. Any other large account
// (another pool, an exchange, a lock) stays in and can overstate concentration — that is recorded, not corrected.
//
// AVAILABILITY. A snapshot that arrives after the scheduled buy is diagnostic information: it is marked TOO LATE and is
// never treated as if it had been known before the entry.
import { rpc as feedRpc } from "./feed.mjs";

/** the owner's hypotheses of 24 Nov 2026 — REPORTED beside each snapshot, never applied to an entry */
export const HOLDER_RULES = { top10_max: 0.25, largest_max: 0.05 };
/** credits: 2 calls per snapshot, at most one retry per call → at most 4; daily cap on snapshots (UTC day) */
export const HOLDER_BUDGET = { calls_per_snapshot: 2, max_calls_per_snapshot: 4, max_in_flight: 4, day_cap: () => Number(process.env.OLDER_HOLDER_SNAP_MAX || 1500) };
export const hs = { on: false, asked: 0, ok: 0, failed: 0, skipped_cap: 0, skipped_busy: 0, calls: 0, retries: 0, before_fill: 0, after_fill: 0, ms_sum: 0, ms_max: 0, in_flight: 0, day: null, day_count: 0, last_err: "" };
const FEES_UNRESOLVED = { rule: "total fees ≥ 2 SOL", status: "UNRESOLVED", why: "the owner's figure is GMGN's \"Total Fees\": whether it counts swap fees, priority fees or tips, lifetime or recent, and in which unit, is not established — no proxy is substituted" };
const big = (x) => { try { return BigInt(x); } catch { return null; } };
const share = (num, den) => (den > 0n ? Number((num * 1_000_000n) / den) / 1_000_000 : null);

/** pure: turns the two RPC answers into measures. `largest` = getTokenLargestAccounts value (array), `multi` = getMultipleAccounts
 *  value for [mint, …largest addresses] (jsonParsed). Never throws on a malformed answer: what cannot be read is reported missing. */
export function summariseHolders({ largest, multi, pool }) {
  const out = { ok: false, why: null, supply_raw: null, decimals: null, accounts_returned: 0, owners_resolved: 0, owners_unresolved: 0, excluded: [], top_accounts: [],
    top10_accounts_share: null, largest_account_share: null, top10_owners_share_among_top20: null, largest_owner_share_among_top20: null, pool_vault_raw: null, largest_vs_pool_reserve: null,
    completeness: "the 20 largest TOKEN ACCOUNTS only; an owner's other accounts and wallets linked to one person are not included; only this coin's own pool vault is excluded" };
  if (!Array.isArray(largest) || !Array.isArray(multi) || !multi.length) { out.why = "answer missing or not a list"; return out; }
  const mintInfo = multi[0]?.data?.parsed?.info, supply = big(mintInfo?.supply); if (supply == null || supply <= 0n || !Number.isInteger(mintInfo?.decimals)) { out.why = "mint account not parsed: no supply, so no percentage can be stated"; return out; }
  out.supply_raw = supply.toString(); out.decimals = mintInfo.decimals; out.accounts_returned = largest.length;
  const rows = []; let vault = null;
  largest.forEach((a, i) => { const amt = big(a?.amount); if (typeof a?.address !== "string" || amt == null) return; const info = multi[i + 1]?.data?.parsed?.info, owner = typeof info?.owner === "string" ? info.owner : null;
    if (owner) out.owners_resolved++; else out.owners_unresolved++;
    if (owner && pool && owner === pool) { out.excluded.push({ address: a.address, raw: amt.toString(), why: "pool vault: its owner is this coin's pool account" }); vault = (vault ?? 0n) + amt; return; }
    rows.push({ address: a.address, owner, raw: amt }); });
  rows.sort((p, q) => (q.raw > p.raw ? 1 : q.raw < p.raw ? -1 : 0));
  out.top_accounts = rows.slice(0, 20).map((r) => ({ address: r.address, owner: r.owner, raw: r.raw.toString(), share: share(r.raw, supply) }));
  out.top10_accounts_share = share(rows.slice(0, 10).reduce((s, r) => s + r.raw, 0n), supply); out.largest_account_share = rows.length ? share(rows[0].raw, supply) : 0;
  const by = new Map(); for (const r of rows) { const k = r.owner ?? "account:" + r.address; by.set(k, (by.get(k) ?? 0n) + r.raw); } const owners = [...by.values()].sort((p, q) => (q > p ? 1 : q < p ? -1 : 0));
  out.top10_owners_share_among_top20 = share(owners.slice(0, 10).reduce((s, x) => s + x, 0n), supply); out.largest_owner_share_among_top20 = owners.length ? share(owners[0], supply) : 0;
  if (vault != null) { out.pool_vault_raw = vault.toString(); out.largest_vs_pool_reserve = rows.length ? share(rows[0].raw, vault) : 0; } // how large the biggest holder is against what the pool holds: potential dump pressure
  out.ok = true; return out;
}
/** pure: the owner's two holder hypotheses against one snapshot, with what was and was not knowable before the buy */
export function holderVerdicts(m, availability) {
  const one = (rule, value, max) => { const ifAvail = value == null ? null : value < max || (rule.startsWith("largest") && value <= max) ? "PASS" : "KNOWN FAIL";
    return { rule, value, if_available: ifAvail, status: availability === "missing" || ifAvail == null ? "MISSING" : availability === "after fill" ? "TOO LATE" : ifAvail }; };
  return { top10: one("top 10 holders < 25% (top-account measure)", m.ok ? m.top10_accounts_share : null, HOLDER_RULES.top10_max), largest: one("largest wallet ≤ 5% (largest-owner-among-top-20 measure)", m.ok ? m.largest_owner_share_among_top20 : null, HOLDER_RULES.largest_max), fees: FEES_UNRESOLVED };
}
const call = async (rpc, method, params) => { for (let i = 0; ; i++) { hs.calls++; try { return await rpc(method, params); } catch (x) { if (i >= 1) throw x; hs.retries++; } } };

/** background snapshot for one entry. Resolves when done; NEVER throws and never changes anything except e.hold. */
export async function holderSnapshot(e, c, { rpc = feedRpc, store = null, now = () => Date.now() / 1000 } = {}) {
  hs.on = true; const day = Math.floor(now() / 86400); if (hs.day !== day) { hs.day = day; hs.day_count = 0; }
  const base = { v: 1, decision_t: e.decisionT, sched_fill_t: e.schedT ?? null, mint: e.mint, pool: c?.pool ?? e.pool ?? null };
  const skip = (why, k) => { hs[k]++; e.hold = { ...base, ok: false, availability: "missing", why, verdicts: holderVerdicts({ ok: false }, "missing") }; try { store?.saveEntry(e); } catch {} return e.hold; };
  if (hs.day_count >= HOLDER_BUDGET.day_cap()) return skip("daily snapshot limit reached (credit ceiling)", "skipped_cap");
  if (hs.in_flight >= HOLDER_BUDGET.max_in_flight) return skip("too many snapshots in flight: position management has priority", "skipped_busy");
  hs.asked++; hs.day_count++; hs.in_flight++; const t1 = now(); let rec;
  try {
    const r1 = await call(rpc, "getTokenLargestAccounts", [e.mint, { commitment: "confirmed" }]); const t2 = now(), largest = r1?.value ?? null;
    const addrs = Array.isArray(largest) ? largest.map((a) => a?.address).filter((a) => typeof a === "string") : [];
    const r2 = await call(rpc, "getMultipleAccounts", [[e.mint, ...addrs], { encoding: "jsonParsed", commitment: "confirmed" }]); const t3 = now();
    const m = summariseHolders({ largest, multi: r2?.value ?? null, pool: base.pool }), availability = !m.ok ? "missing" : e.schedT != null && t3 <= e.schedT ? "before fill" : "after fill";
    rec = { ...base, ...m, req_t: +t1.toFixed(3), largest_resp_t: +t2.toFixed(3), owners_resp_t: +t3.toFixed(3), slot_largest: r1?.context?.slot ?? null, slot_owners: r2?.context?.slot ?? null,
      s_after_decision: +(t3 - e.decisionT).toFixed(3), s_before_fill: e.schedT != null ? +(e.schedT - t3).toFixed(3) : null, availability, verdicts: holderVerdicts(m, availability) };
    m.ok ? hs.ok++ : hs.failed++; if (availability === "before fill") hs.before_fill++; else if (availability === "after fill") hs.after_fill++;
    const ms = (t3 - t1) * 1000; hs.ms_sum += ms; if (ms > hs.ms_max) hs.ms_max = Math.round(ms);
  } catch (x) { hs.failed++; hs.last_err = String(x?.message ?? x).slice(0, 120); rec = { ...base, ok: false, availability: "missing", why: hs.last_err, req_t: +t1.toFixed(3), verdicts: holderVerdicts({ ok: false }, "missing") }; }
  finally { hs.in_flight--; }
  e.hold = rec; try { store?.saveEntry(e); } catch {} return rec;
}
