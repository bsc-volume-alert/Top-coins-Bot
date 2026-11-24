// risk.mjs — token risk evidence for broad Solana coverage. Purpose: stop entries whose EXECUTION ASSUMPTION is unsupported
// (the paper book assumes a plain buy and a plain sell). It is not a quality filter and adds no strategy condition.
//   status "restricted" : a known transfer restriction → not entered, counted
//   status "clean"      : checked, none of the restrictions below
//   status "flagged"    : tradeable under our assumption, but with recorded warnings (mint/freeze authority still active, "sus" marker…)
//                         — includes a TRANSFER FEE of at most XFER_FEE_MAX_BPS: entered, fee deducted on the buy and on every sale (fee_bps)
//   status "missing"    : no risk data — recorded as missing, NOT treated as clean; entries proceed with the flag
// Risk flags are evidence, not proof a later sale succeeds.
import { XFER_FEE_MAX_BPS } from "./spec.mjs";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", SPL_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/** IS THE COIN'S TRANSFER FEE KNOWN? (eighth review, B1: "unknown" must never silently mean "no fee".) Known = a classic SPL
 *  token (the program has no transfer fee), or a mint whose extensions were read from the chain. Anything else — a Token-2022
 *  mint not read yet, an unknown token program — is NOT known, and a coin in that state is not entered — on the sampled method (eighth review) and, from older-10, on the live
 *  method too (ninth review, A: 225 live buys of Token-2022 coins were made with the extensions never read). */
export const feeKnown = (info) => info?.token_program === SPL_TOKEN || info?.risk?.src === "rpc mint account";
/** WHICH MINT ACCOUNTS TO READ NEXT (one RPC call for the whole batch), in this order:
 *    1. coins with a pending or open position whose mint account has not been read in this run   (a buy is waiting, or we hold it)
 *    2. coins whose fee is not known: a SAMPLED coin that is being priced, most recently priced first; a LIVE coin only once
 *       a decision has asked for it (engine._decide marks it: feeWanted), most recently asked first — not every pool ever seen
 *    3. coins with a pending or open position last read over refreshS ago     (a fee can be raised while we hold)
 *  Both observation methods (ninth review, A: until 24 Nov 2026 live coins were never read). A classic SPL token needs no
 *  read (the program has no extensions); a read that failed is retried after a minute without holding up the others. */
export function riskQueue(engine, now, refreshS = 600, max = 50) {
  const a = [], b = [], c = [];
  for (const x of engine.coins.values()) { if (x.info?.token_program === SPL_TOKEN || (x.riskRetryAt ?? 0) > now) continue;
    const held = !!engine.byMint.get(x.mint)?.size, live = x.mode !== "polled";
    if (!x.riskRead) { if (held) { a.push(x); continue; } const k = live ? (feeKnown(x.info) ? null : x.feeWanted ?? null) : x.series.lastT; if (k != null) b.push([k, x]); } // sampled: only coins that are actually being priced (a coin off the watch list is read when it comes back)
    else if (held && now - (x.riskAt ?? 0) > refreshS) c.push(x); }
  b.sort((p, q) => q[0] - p[0]); c.sort((p, q) => (p.riskAt ?? 0) - (q.riskAt ?? 0));
  return [...a, ...b.map((p) => p[1]), ...c].slice(0, max);
}
/** the single next coin (the head of riskQueue), or null */
export const nextRiskRead = (engine, now, refreshS = 600) => riskQueue(engine, now, refreshS, 1)[0] ?? null;
/** ONE ROUND of the reader: reads the queued mint accounts in one call and records what they say. Returns how many were asked.
 *  rpc(method, params) is injected (feed.rpc in production). What was known before a failed read stays; a coin whose account
 *  could not be read stays "fee not known" and is therefore not entered. engine.riskUpdated(mint) lets the engine record a
 *  restriction found on a coin it already holds. No dependency on the sampled adapter. */
export async function riskReadOnce(engine, store, rpc, now, refreshS = 600, max = 50) {
  const q = riskQueue(engine, now, refreshS, max); if (!q.length) return 0;
  for (const c of q) { c.riskRead = true; c.riskAt = now; }
  let vals = null; try { vals = (await rpc("getMultipleAccounts", [q.map((c) => c.mint), { encoding: "jsonParsed" }]))?.value ?? null; } catch { vals = null; }
  q.forEach((c, i) => {
    if (!Array.isArray(vals)) { if (!c.info.risk) c.info.risk = { status: "missing", why: "mint account read failed" }; c.riskRead = false; c.riskRetryAt = now + 60; return; } // tried again; what was known before stays
    const k = classifyMintAccount(vals[i]);
    if (k.status !== "missing") { c.info.risk = k; if (k.program) c.info.token_program = k.program; store?.saveCoin(c.mint, { info: c.info }); engine.riskUpdated?.(c.mint); } else if (!c.info.risk) c.info.risk = k; });
  return q.length;
}
const BLOCKING = new Set(["transferHook", "nonTransferable", "permanentDelegate", "pausableConfig", "confidentialTransferMint"]);

/** from an RPC getAccountInfo(mint, jsonParsed) value — the authoritative check for Token-2022 extensions */
export function classifyMintAccount(value) {
  const info = value?.data?.parsed?.info; if (!info) return { status: "missing", why: "mint account not parsed" };
  const program = value.owner, ext = (info.extensions || []).map((x) => x.extension), warn = [], block = []; let fee = 0;
  for (const x of info.extensions || []) {
    if (BLOCKING.has(x.extension)) { if (x.extension === "transferHook" && !x.state?.programId) continue; block.push(x.extension); }
    if (x.extension === "transferFeeConfig") { const bps = Math.max(Number(x.state?.newerTransferFee?.transferFeeBasisPoints || 0), Number(x.state?.olderTransferFee?.transferFeeBasisPoints || 0)); fee = bps; // the HIGHER of the fee in force and the one already scheduled; the per-transfer cap (maximumFee) is ignored, so the fee is never understated
      if (bps > XFER_FEE_MAX_BPS) block.push(`transferFee ${bps} bps`); else if (bps > 0) warn.push(`transfer fee ${bps} bps: taken off the buy and off every sale`); }
    if (x.extension === "defaultAccountState" && x.state?.accountState === "frozen") block.push("defaultAccountState frozen");
  }
  if (info.freezeAuthority) warn.push("freeze authority active"); if (info.mintAuthority) warn.push("mint authority active");
  return { status: block.length ? "restricted" : warn.length ? "flagged" : "clean", program, extensions: ext, blocking: block, warnings: warn, fee_bps: fee, supply: Number(info.supply) / 10 ** info.decimals, decimals: info.decimals, src: "rpc mint account" };
}
/** from Jupiter token metadata — cannot see Token-2022 extensions, so a Token-2022 mint is "missing" until the RPC check has run */
export function classifyJupToken(t) {
  if (!t) return { status: "missing", why: "no provider record" };
  const warn = []; if (t.freeze_authority_disabled === false) warn.push("freeze authority active"); if (t.mint_authority_disabled === false) warn.push("mint authority active"); if (t.is_sus) warn.push("provider 'suspicious' marker");
  if (t.token_program === TOKEN_2022) return { status: "missing", why: "Token-2022 mint: extensions not yet read from the chain", warnings: warn, src: "jupiter tokens" };
  if (t.mint_authority_disabled == null && t.freeze_authority_disabled == null) return { status: "missing", why: "provider gave no audit fields", src: "jupiter tokens" };
  return { status: warn.length ? "flagged" : "clean", warnings: warn, src: "jupiter tokens" };
}
