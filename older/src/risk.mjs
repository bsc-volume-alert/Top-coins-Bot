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
