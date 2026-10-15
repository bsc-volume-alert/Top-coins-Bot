// v0.18.4: creator fees. pump.fun pays the coin's creator a share of every trade's fee; it accrues in a per-creator vault and the
// creator must claim it (CollectCreatorFeeEvent on pump.fun, CollectCoinCreatorFeeEvent on PumpSwap). Accrued fees come free from
// the trade events; claims are decoded from the same log streams. Everything is recorded, nothing gated — the analysis decides
// whether "dev has claimed" separates runners from rugs.
import { db, q } from "./db.js";
import { on, live } from "./launch-monitor.js";
import { onSwap } from "./pumpswap.js";

export const fe = { claims: 0, claimsPump: 0, claimsSwap: 0, attributed: 0 };
const accrued = new Map();   // mint -> {sol, n, dirty}
const creatorOf = new Map(); // mint -> creator (from PumpSwap events / tokens table)
let samples = 0;

function acc(mint, sol) {
  if (!(sol > 0)) return;
  let a = accrued.get(mint); if (!a) { a = { sol: 0, n: 0, dirty: false }; accrued.set(mint, a); if (accrued.size > 30000) accrued.delete(accrued.keys().next().value); }
  a.sol += sol; a.n++; a.dirty = true;
}
on("trade", (t, tr) => { if (tr.creatorFee > 0) acc(t.mint, tr.creatorFee); });
onSwap((tr) => { if (tr.creatorFee > 0) acc(tr.mint, tr.creatorFee); });

on("claim", (_, c) => {
  fe.claims++; if (c.venue === "pump") fe.claimsPump++; else fe.claimsSwap++;
  try { q.insClaim.run(c.creator, c.ts, c.sol, c.venue, c.sig); } catch {}
  if (samples < 5) { samples++; console.log("[fee claim]", JSON.stringify({ venue: c.venue, creator: c.creator.slice(0, 8), sol: +c.sol.toFixed(4), ts: c.ts })); }
  // mark the creator's recent tokens dirty so their claim columns refresh
  try { for (const r of q.mintsByCreator.all(c.creator, c.ts - 7 * 86400)) { fe.attributed++; let a = accrued.get(r.mint); if (!a) { a = { sol: 0, n: 0, dirty: true }; accrued.set(r.mint, a); } a.dirty = true; } } catch {}
});

/** Fee picture for a mint at this moment: accrued creator fees (SOL) and the creator's claims since the token launched. */
export function feeInfo(mint, creator = null, createTs = null) {
  const a = accrued.get(mint);
  const meta = creator && createTs ? null : q.tokenMeta.get(mint);
  creator ||= meta?.creator || live.get(mint)?.creator || null; createTs ||= meta?.create_ts || live.get(mint)?.ts || null;
  let claims = { n: 0, sol: 0, first: null, last: null };
  if (creator && createTs) { try { const r = q.claimsSince.get(creator, createTs); claims = { n: r.n || 0, sol: r.sol || 0, first: r.first ?? null, last: r.last ?? null }; } catch {} }
  return { accrued: a?.sol || 0, trades: a?.n || 0, claims: claims.n, claimedSol: claims.sol, firstClaimTs: claims.first, lastClaimTs: claims.last };
}
export function feeLine(fi, now = Math.floor(Date.now() / 1000)) {
  const ago = (ts) => { const d = now - ts; return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d / 60)}m ago` : `${(d / 3600).toFixed(1)}h ago`; };
  return `dev fees: ${fi.accrued.toFixed(2)} SOL accrued · ${fi.claims ? `claimed ${fi.claims}× (${fi.claimedSol.toFixed(2)} SOL), last ${ago(fi.lastClaimTs)}` : "never claimed"}`;
}
// persist accrued/claim columns on the tokens table once a minute for anything that changed
setInterval(() => {
  const dirty = [...accrued.entries()].filter(([, a]) => a.dirty); if (!dirty.length) return;
  try { db.transaction(() => { for (const [mint, a] of dirty) { a.dirty = false; const fi = feeInfo(mint); q.upTokenFees.run(fi.accrued, fi.claims, fi.claimedSol, fi.firstClaimTs, mint); } })(); } catch (e) { console.error("[fees]", e.message); }
}, 60_000);
