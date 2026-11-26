// gates.mjs — older-11: the owner's holder gates (decisions of 24–25 Nov 2026), read from ONE provider answer per buy signal.
//
// What a reading is. The token-data provider's "token info" answer for the coin (GMGN /v1/token/info, weight 1), asked for at
// the buy signal. Field map verified against the provider's own website panel on 25 Nov 2026 (coin AGmKjJ…Cqxqpump: website
// Top 10 21.87% / Snipers 2.17% / Insiders 0% / Bundler 3.4% / Total Fees 64.72 SOL against 0.2281 / 0.0217 / 0 / 0.0344 /
// 64.56 read 37 minutes earlier):
//   top 10 holders   stat.top_10_holder_rate            fraction 0–1
//   bundlers         stat.top_bundler_trader_percentage fraction 0–1
//   insiders         stat.top_rat_trader_percentage     fraction 0–1 (the provider's "rat traders")
//   snipers          stat.top70_sniper_hold_rate        fraction 0–1
//   total fees       total_fee                          SOL (the "Total Fees" / "F" figure on the provider's pages)
//   Twitter          link.twitter_username              text; a single tweet is stored as "<user>/status/<id>"; "" = none
//   all-time high    ath_price                          USD per token; × 1e9 (a pump.fun coin's initial supply) = market cap,
//                                                       which is how the provider itself states it (dev.ath_token_info.ath_mc)
// A field that is absent, empty or not a number is UNKNOWN (null) — never zero. An unknown figure fails its gate as "missing".
// Nothing here decides alone: engine.mjs applies the verdict to a pending buy at the time of the buy (see _gate).
import { CLOCK } from "./spec.mjs";

// A figure is a number, or text that is a plain decimal number. Anything else — a list, an object, true / false, text that is
// not a number — is UNKNOWN, never coerced (review of bbe1115: Number([]) is 0, so an empty list used to read as "0%").
export const num = (v) => { const n = typeof v === "number" ? v : typeof v === "string" && /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(v) ? Number(v) : NaN; return Number.isFinite(n) ? n : null; }; // "1e999" is text that looks like a number and is not a finite one: unknown
export const PUMP_SUPPLY = 1e9; // a pump.fun coin is created with 1,000,000,000 tokens and can only burn from there
/** the figures the gates use, plus what is recorded beside them. `info` is the provider's answer object. */
/** ALL-TIME-HIGH MARKET CAP (review of bbe1115, finding 5). The provider gives the highest PRICE. A market cap needs a supply,
 *  and none is assumed: `supply` is what the chain reported with the coin's latest swap; failing that, the provider's own
 *  total supply. The figure used is price × that supply, and only when the supply is no more than a pump.fun coin's initial
 *  1,000,000,000 — such a coin can only have burned tokens since its high, so the result is a LOWER bound of the true figure
 *  (never an overstatement; a few per cent under the provider's website figure, which multiplies by the full billion, when
 *  tokens have been burned). No supply evidence, or a supply above the initial one (tokens were minted): UNKNOWN — which fails
 *  the "$100K" gate as missing. The basis is recorded with the reading. */
export function athUsd(athPrice, supplyChain, supplyProvider, pump = false) {
  // burn-only is a property of a verified pump.fun coin, not of "a supply under a billion" (another token could have minted from
  // 100M to 900M after its high): without that evidence the market cap at the high is not established (second opinion, 7)
  if (!pump) return { usd: null, basis: "not a verified pump.fun coin: the market cap at the high is not established" };
  const s = supplyChain > 0 ? supplyChain : supplyProvider > 0 ? supplyProvider : null, src = supplyChain > 0 ? "chain (latest swap)" : supplyProvider > 0 ? "provider total_supply" : null;
  if (athPrice == null) return { usd: null, basis: "no all-time-high price in the reading" };
  if (s == null) return { usd: null, basis: "no supply evidence" };
  if (s > PUMP_SUPPLY * (1 + 1e-6)) return { usd: null, basis: `supply ${Math.round(s)} (${src}) is above 1,000,000,000: tokens were minted, the market cap at the high is not established` };
  return { usd: athPrice * s, basis: `highest price × supply ${Math.round(s)} (${src}) — a lower bound` };
}
/** GMGN's TOKEN AUDIT for one coin (its token-security answer; owner 26 Nov 2026 00:43 UK: "token audit… should be 100%").
 *  The four lines of the audit box on GMGN's page: NoMint (minting given up), No Blacklist (freezing given up), Burnt (the
 *  liquidity burnt), Top 10 (under 30%). Each true / false / null (GMGN did not say). ok = the number that pass, of = the
 *  number GMGN answered. Recorded on the buy; no rule reads it. */
export function parseAudit(sec) {
  const b = (v) => (v === true || v === 1 ? true : v === false || v === 0 ? false : null), t10 = num(sec?.top_10_holder_rate), burn = typeof sec?.burn_status === "string" ? sec.burn_status : null;
  const a = { no_mint: b(sec?.renounced_mint), no_blacklist: b(sec?.renounced_freeze_account), burnt: burn == null || burn === "unknown" ? null : burn === "burn", top10_ok: t10 == null ? null : t10 < 0.30 };
  const known = Object.values(a).filter((v) => v != null);
  return { ...a, ok: known.filter(Boolean).length, of: known.length, top10: t10, burn_status: burn, burn_ratio: num(sec?.burn_ratio), alert: b(sec?.is_show_alert), honeypot: b(sec?.honeypot), buy_tax: num(sec?.buy_tax), sell_tax: num(sec?.sell_tax), locked: num(sec?.lock_summary?.lock_percent) };
}
export function parseInfo(info, supplyChain = null, pump = false) {
  const st = info?.stat ?? null, link = info?.link ?? null, w = info?.wallet_tags_stat ?? null, ath = athUsd(num(info?.ath_price), num(supplyChain), num(info?.total_supply), pump);
  const tw = link && typeof link.twitter_username === "string" ? link.twitter_username.trim() : null; // link block absent = unknown; "" = known: none
  return {
    top10: num(st?.top_10_holder_rate), bundlers: num(st?.top_bundler_trader_percentage), insiders: num(st?.top_rat_trader_percentage), snipers: num(st?.top70_sniper_hold_rate),
    fees_sol: num(info?.total_fee), twitter: tw, ath_usd: ath.usd, ath_basis: ath.basis, ath_price: num(info?.ath_price),
    // recorded, not gated (owner: "everything else recorded with time since these figures change")
    trade_fee_sol: num(info?.trade_fee), holders: num(info?.holder_count ?? st?.holder_count), dev_hold: num(st?.dev_team_hold_rate), creator_hold: num(st?.creator_hold_rate),
    creator_status: info?.dev?.creator_token_status ?? null, sniper_wallets: num(w?.sniper_wallets), insider_wallets: num(w?.rat_trader_wallets), bundler_wallets: num(w?.bundler_wallets),
    total_supply: num(info?.total_supply), created: num(info?.creation_timestamp), pool_opened: num(info?.open_timestamp), launchpad: info?.launchpad ?? null,
    // owner 26 Nov 2026 00:43 UK ("there's also a phishing percentage… include that as well") — recorded, not gated. Field names read
    // from a live answer the same night: GMGN's "phishing" figure is stat.top_entrapment_trader_percentage; beside it the share
    // held by bot wallets, the share of fresh wallets, and GMGN's own liquidity figure for the coin.
    phishing: num(st?.top_entrapment_trader_percentage), bot_degen: num(st?.top_bot_degen_percentage), fresh_wallets: num(st?.fresh_wallet_rate), liq_usd: num(info?.liquidity),
    // owner 26 Nov 2026 04:39 UK ("why don't we use GMGN for the volume") — GMGN's own volume and trade counts, from the same
    // answer (field names read from the live answer of 26 Nov): recorded beside Jupiter's so the two can be compared; no rule reads them.
    vol_1m: num(info?.price?.volume_1m), vol_5m: num(info?.price?.volume_5m), vol_1h: num(info?.price?.volume_1h), buy_vol_1h: num(info?.price?.buy_volume_1h), sell_vol_1h: num(info?.price?.sell_volume_1h),
    buys_1h: num(info?.price?.buys_1h), sells_1h: num(info?.price?.sells_1h), swaps_5m: num(info?.price?.swaps_5m), swaps_1h: num(info?.price?.swaps_1h), price_usd: num(info?.price?.price),
  };
}
const pct = (x) => (x * 100).toFixed(x * 100 < 10 && x !== 0 ? 2 : 1).replace(/\.?0+$/, "") + "%";
const inside = (v, [lo, hi], exHi = false) => v >= lo && (hi == null || (exHi ? v < hi : v <= hi));
const NAMES = { top10: "top 10 holders", bundlers: "bundlers", insiders: "insiders", snipers: "snipers" };
/** the gate settings that apply to one book: the run's gates with the book's own overrides (a clock book uses its base book's) */
export function gatesFor(gates, family) { const f = CLOCK[family]?.base ?? family, o = gates.byFamily?.[f]; return o ? { ...gates, ...o } : gates; }
/** verdict of one reading for one book. { pass, fails: [text], missing: [name], options } — options are the owner's main /
 *  second ranges for bundlers and insiders, true / false / null (figure unknown), recorded on every buy that is filled. */
export function judge(reading, gates, family) {
  const G = gatesFor(gates, family), fails = [], missing = [], r = reading ?? {};
  for (const k of ["top10", "bundlers", "insiders", "snipers"]) { const g = G[k]; if (!g) continue; const v = r[k];
    if (v == null) { missing.push(NAMES[k]); continue; }
    if (!inside(v, g.buy, !!g.exclusiveHi)) fails.push(v < g.buy[0] ? `${NAMES[k]} ${pct(v)}: below ${pct(g.buy[0])}` : `${NAMES[k]} ${pct(v)}: ${g.exclusiveHi ? "not under" : "above"} ${pct(g.buy[1])}`); }
  if (G.fees_sol) { if (r.fees_sol == null) missing.push("total fees"); else if (!inside(r.fees_sol, G.fees_sol.buy)) fails.push(`total fees ${+r.fees_sol.toFixed(2)} SOL: below ${G.fees_sol.buy[0]} SOL`); }
  if (G.twitter) { if (r.twitter == null) missing.push("Twitter link"); else if (!r.twitter) fails.push("no Twitter link"); }
  if (G.ath_usd) { if (r.ath_usd == null) missing.push("all-time high"); else if (!inside(r.ath_usd, G.ath_usd.buy)) fails.push(`all-time high $${Math.round(r.ath_usd / 1000)}K: has not reached $${Math.round(G.ath_usd.buy[0] / 1000)}K`); }
  if (G.bothZeroBlocks && r.bundlers === 0 && r.insiders === 0 && !fails.some((x) => /^bundlers|^insiders/.test(x))) fails.push("bundlers 0% and insiders 0%");
  const opt = (k, which) => (G[k]?.[which] ? (r[k] == null ? null : inside(r[k], G[k][which])) : undefined);
  const options = { bundlers_main: opt("bundlers", "main"), bundlers_second: opt("bundlers", "second"), insiders_main: opt("insiders", "main"), insiders_second: opt("insiders", "second") };
  for (const k of Object.keys(options)) if (options[k] === undefined) delete options[k];
  return { pass: !fails.length && !missing.length, fails, missing, options };
}
