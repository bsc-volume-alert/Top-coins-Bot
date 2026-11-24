// risk.mjs — token risk evidence for broad Solana coverage. Purpose: stop entries whose EXECUTION ASSUMPTION is unsupported
// (the paper book assumes a plain buy and a plain sell). It is not a quality filter and adds no strategy condition.
//   status "restricted" : a known transfer restriction → not entered, counted
//   status "clean"      : checked, none of the restrictions below
//   status "flagged"    : tradeable under our assumption, but with recorded warnings (mint/freeze authority still active, "sus" marker…)
//                         — includes a TRANSFER FEE of at most XFER_FEE_MAX_BPS: entered, fee deducted on the buy and on every sale (fee_bps)
//   status "missing"    : no risk data — recorded as missing, NOT treated as clean. From older-10 a coin whose token program /
//                         Token-2022 extensions are not known is NOT ENTERED on either method (feeKnown); the reader retries it
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
const LAT_EDGES = [1, 2, 5, 10, 30, 60, 300, Infinity]; // seconds from the first decision that needed a coin to its classification
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
/** reader counters for the status report (bounded): how many accounts were asked for, what came back, and how long a coin
 *  waited between the first decision that needed its classification and the classification arriving */
export const rk = { rounds: 0, asked: 0, classified: 0, transport_fail_rounds: 0, null_account: 0, unparsed: 0, malformed: 0, short_response: 0, retries: 0, max_batch: 0, backoff_max_s: 0,
  rpc_ms_sum: 0, rpc_ms_max: 0, latency_n: 0, latency_sum_s: 0, latency_max_s: 0, latency_hist: LAT_EDGES.map(() => 0), refreshes: 0, refresh_overdue_sum_s: 0, refresh_overdue_max_s: 0 };
/** the reader's part of the status report: the counters above plus the queue as it stands (length, oldest waiting request) */
export const riskStatus = (engine, now, refreshS = 600) => { const q = riskQueue(engine, now, refreshS, Infinity), w = q.map((c) => c.feeWantedFirst).filter((x) => x != null);
  return { ...rk, latency_hist: Object.fromEntries(LAT_EDGES.map((x, i) => [x === Infinity ? ">300" : "<=" + x, rk.latency_hist[i]])), latency_mean_s: rk.latency_n ? +(rk.latency_sum_s / rk.latency_n).toFixed(2) : null, rpc_ms_mean: rk.rounds ? Math.round(rk.rpc_ms_sum / rk.rounds) : null,
    refresh_overdue_mean_s: rk.refreshes ? +(rk.refresh_overdue_sum_s / rk.refreshes).toFixed(1) : null, queue: q.length, queue_oldest_wait_s: w.length ? +(now - Math.min(...w)).toFixed(1) : null, backing_off: [...engine.coins.values()].filter((c) => (c.riskRetryAt ?? 0) > now).length }; };
const WHY = { transport: "mint account read failed", null_account: "the provider returned no account for this mint", unparsed: "mint account not parsed", short_response: "the provider's answer was shorter than the request", malformed: "mint account malformed (a field had an unexpected shape)" };
/** ONE ROUND of the reader: reads the queued mint accounts in one call and records what they say. Returns how many were asked.
 *  rpc(method, params) is injected (feed.rpc in production). No dependency on the sampled adapter.
 *  FAILURES (Codex B5) — a whole-batch failure (transport) and a per-account failure (no account, an account that does not
 *  parse, an answer shorter than the request) are told apart and counted. Either way the coin is tried again with a bounded
 *  back-off (1 min, doubling, at most 1 h), what was known about it before stays, and one bad account never strands the others
 *  in its batch. A coin whose account could not be read stays "fee not known" and is therefore not entered — but it is no
 *  longer dropped from the queue for good. engine.riskUpdated(mint) lets the engine record a restriction found on a coin it holds. */
export async function riskReadOnce(engine, store, rpc, now, refreshS = 600, max = 50) {
  const q = riskQueue(engine, now, refreshS, max); if (!q.length) return 0;
  rk.rounds++; rk.asked += q.length; if (q.length > rk.max_batch) rk.max_batch = q.length;
  for (const c of q) { if (c.riskFails) rk.retries++; else if (c.riskRead && c.riskAt != null) { const late = Math.max(0, now - c.riskAt - refreshS); rk.refreshes++; rk.refresh_overdue_sum_s += late; if (late > rk.refresh_overdue_max_s) rk.refresh_overdue_max_s = +late.toFixed(1); } c.riskRead = true; c.riskAt = now; }
  const p0 = performance.now(); let vals = null; try { vals = (await rpc("getMultipleAccounts", [q.map((c) => c.mint), { encoding: "jsonParsed" }]))?.value ?? null; } catch { vals = null; }
  const took = (performance.now() - p0) / 1000, batchFail = !Array.isArray(vals); if (batchFail) rk.transport_fail_rounds++; rk.rpc_ms_sum += took * 1000; if (took * 1000 > rk.rpc_ms_max) rk.rpc_ms_max = Math.round(took * 1000);
  // back-off: 1 min, doubling, at most 1 h — and for a coin we hold never longer than its normal refresh interval
  const fail = (c, why) => { if (why !== "transport") rk[why]++; c.riskFails = (c.riskFails || 0) + 1; c.riskRead = false; const wait = Math.min(engine.byMint.get(c.mint)?.size ? refreshS : 3600, 60 * 2 ** Math.min(c.riskFails - 1, 10)); c.riskRetryAt = now + wait; if (wait > rk.backoff_max_s) rk.backoff_max_s = wait;
    c.riskFailWhy = why; if (!c.info.risk) c.info.risk = { status: "missing", why: WHY[why] }; };
  // EACH account is handled on its own (Codex's review of 161d545): an answer with an unexpected shape used to throw out of
  // this loop and leave the WHOLE batch marked as read for good. Now it fails that one coin ("malformed"), which is retried
  // like any other failure, and the rest of the batch is classified.
  q.forEach((c, i) => { try {
    if (batchFail) return fail(c, "transport"); if (i >= vals.length) return fail(c, "short_response"); if (vals[i] == null) return fail(c, "null_account");
    const k = classifyMintAccount(vals[i]); if (k.status === "missing") return fail(c, k.malformed ? "malformed" : "unparsed");
    k.read_at = Math.round(now + took); c.info.risk = k; if (k.program) c.info.token_program = k.program; c.riskFails = 0; c.riskFailWhy = null; rk.classified++;
    if (c.feeWantedFirst != null) { const w = Math.max(0, now + took - c.feeWantedFirst); rk.latency_n++; rk.latency_sum_s += w; rk.latency_hist[LAT_EDGES.findIndex((x) => w <= x)]++; if (w > rk.latency_max_s) rk.latency_max_s = +w.toFixed(2); c.feeWantedFirst = null; }
    store?.saveCoin(c.mint, { info: c.info }); engine.riskUpdated?.(c.mint);
  } catch { fail(c, "malformed"); } });
  return q.length;
}
const BLOCKING = new Set(["transferHook", "nonTransferable", "permanentDelegate", "pausableConfig", "confidentialTransferMint"]);

/** from an RPC getAccountInfo(mint, jsonParsed) value — the authoritative check for Token-2022 extensions */
export function classifyMintAccount(value) {
  const info = value?.data?.parsed?.info; if (!info) return { status: "missing", why: "mint account not parsed" };
  // FAIL CLOSED on an unexpected shape: a mint whose extension list, decimals or owner cannot be read is "missing", never "no extensions"
  const bad = (why) => ({ status: "missing", malformed: true, why: "mint account malformed: " + why });
  if (typeof info !== "object") return bad("info is not an object");
  if (info.extensions != null && (!Array.isArray(info.extensions) || info.extensions.some((x) => !x || typeof x !== "object" || typeof x.extension !== "string"))) return bad("extensions is not a list of extensions");
  if (!Number.isInteger(info.decimals) || info.decimals < 0 || info.decimals > 18) return bad("decimals"); if (typeof value.owner !== "string") return bad("owner");
  if (!(Number(info.supply) >= 0)) return bad("supply");
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
