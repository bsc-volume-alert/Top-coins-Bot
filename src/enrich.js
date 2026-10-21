// v0.18.19: extra entry-time features for the winners-vs-losers analysis. Recording only, nothing gated.
//  - Dex Paid: has anyone paid DexScreener for this coin (profile / community takeover / ad / boost) and how long before our entry?
//  - Snipers: wallets that bought in the launch slot(s); how many, and what share of supply they still hold at entry.
//  - Fresh wallets: of a sample of the 5m window's buyers, what share are wallets younger than FRESH_WALLET_D days?
//  - Proven wallets: what share of the 5m buy $ came from wallets with a proven record (wallets.js), and how many of them.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { on } from "./launch-monitor.js";
import { balanceOf } from "./holders.js";
import { walletInfo } from "./rpc.js";
import { isProven } from "./wallets.js";

export const en = { dexCalls: 0, dexPaid: 0, dexFail: 0, freshCalls: 0, freshDay: new Date().getUTCDate(), snipers: 0 };
const SN = new Map(); // mint -> Set(sniper wallets)
on("create", (t) => { SN.set(t.mint, new Set()); if (SN.size > 20000) SN.delete(SN.keys().next().value); });
on("trade", (t, tr) => { const s = SN.get(t.mint); if (s && tr.isBuy && tr.slot <= t.slot + CFG.BUNDLE_SLOTS && tr.wallet !== t.creator) { s.add(tr.wallet); en.snipers++; } });
on("expire", (t) => setTimeout(() => SN.delete(t.mint), 2 * 3600_000)); // keep a while past expiry — momentum entries come after the launch window

export function sniperInfo(mint) {
  const s = SN.get(mint);
  // v0.18.172: the in-memory set is lost on every restart (32 restarts in 24 h left snipers_n blank on 58% of AS rows). Fall back to the saved launch data:
  // snipers = launch-bundle wallets minus the creator if the creator bought (matches the live count on 1,295 of 1,308 rows). Held share unknown then.
  if (!s) { try { const m = q.tokenMeta.get(mint); if (m && m.bundle_wallets != null) return { n: Math.max(0, m.bundle_wallets - ((m.dev_buy_sol || 0) > 0 ? 1 : 0)), heldPct: null }; } catch {} return null; }
  let held = 0; for (const w of s) held += Math.max(0, balanceOf(mint, w) || 0);
  return { n: s.size, heldPct: held / CFG.TOTAL_SUPPLY * 100 };
}

export async function dexPaid(mint, entryTs) {
  en.dexCalls++;
  try {
    const r = await fetch(`https://api.dexscreener.com/orders/v1/solana/${mint}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) { en.dexFail++; return null; }
    const arr = await r.json(); if (!Array.isArray(arr)) return { paid: 0, types: "", leadS: null };
    const ok = arr.filter((o) => o.status === "approved");
    const types = [...new Set(ok.map((o) => o.type))].join("|");
    const first = ok.map((o) => { const t = Number(o.paymentTimestamp || 0); return t > 1e12 ? Math.floor(t / 1000) : t; }).filter((x) => x > 0).sort((a, b) => a - b)[0]; // ms or s
    if (ok.length) en.dexPaid++;
    return { paid: ok.length ? 1 : 0, types, leadS: first ? entryTs - first : null };
  } catch { en.dexFail++; return null; }
}

/** Fresh-wallet share of a sample of buyers (RPC, budgeted) */
export async function freshShare(wallets) {
  const d = new Date().getUTCDate(); if (d !== en.freshDay) { en.freshDay = d; en.freshCalls = 0; }
  const uniq = [...new Set(wallets.filter((w) => w && !w.startsWith("tx:")))];
  for (let i = uniq.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [uniq[i], uniq[j]] = [uniq[j], uniq[i]]; }
  const sample = uniq.slice(0, CFG.FRESH_SAMPLE);
  if (!sample.length || en.freshCalls + sample.length > CFG.FRESH_DAILY_BUDGET) return null;
  en.freshCalls += sample.length;
  const infos = await Promise.all(sample.map((w) => walletInfo(w).catch(() => null)));
  const known = infos.filter((x) => x && x.age_s != null);
  if (known.length < 5) return null;
  const fresh = known.filter((x) => x.age_s < CFG.FRESH_WALLET_D * 86400).length;
  return { share: fresh / known.length, n: known.length };
}

export function provenShare(w5) {
  let buy = 0, pv = 0; const ws = new Set();
  for (const z of w5) { if (!z.b) continue; buy += z.usd; if (z.w && isProven(z.w)) { pv += z.usd; ws.add(z.w); } }
  return { share: buy > 0 ? pv / buy : null, n: ws.size };
}

/** Fill the enrichment columns for a paper trade. Sync parts first, async parts as they land. */
export function enrichEntry(id, mint, w5, entryTs) {
  try { const sn = sniperInfo(mint); const pv = provenShare(w5); q.setEnrich1.run(sn?.n ?? null, sn?.heldPct ?? null, pv.share, pv.n, id); } catch (e) { console.error("[enrich]", e.message); }
  dexPaid(mint, entryTs).then((dp) => { if (dp) { try { q.setDexPaid.run(dp.paid, dp.types, dp.leadS, id); } catch {} } });
  freshShare(w5.filter((z) => z.b).map((z) => z.w)).then((fr) => { if (fr) { try { q.setFresh.run(fr.share, fr.n, id); } catch {} } }).catch(() => {});
}
export const enrichLine = (sn, pv) => [sn ? (sn.heldPct == null ? `snipers ${sn.n}` : `snipers ${sn.n} hold ${sn.heldPct.toFixed(1)}%`) : null, pv?.n ? `proven wallets ${pv.n} (${(pv.share * 100).toFixed(0)}% of buys)` : null].filter(Boolean).join(" · ");
