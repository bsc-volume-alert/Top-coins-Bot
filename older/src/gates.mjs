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

export const num = (v) => (v == null || v === "" || typeof v === "boolean" || !Number.isFinite(Number(v)) ? null : Number(v));
/** the figures the gates use, plus what is recorded beside them. `info` is the provider's answer object. */
export function parseInfo(info) {
  const st = info?.stat ?? null, link = info?.link ?? null, w = info?.wallet_tags_stat ?? null, ath = num(info?.ath_price);
  const tw = link && typeof link.twitter_username === "string" ? link.twitter_username.trim() : null; // link block absent = unknown; "" = known: none
  return {
    top10: num(st?.top_10_holder_rate), bundlers: num(st?.top_bundler_trader_percentage), insiders: num(st?.top_rat_trader_percentage), snipers: num(st?.top70_sniper_hold_rate),
    fees_sol: num(info?.total_fee), twitter: tw, ath_usd: ath != null ? ath * 1e9 : null,
    // recorded, not gated (owner: "everything else recorded with time since these figures change")
    trade_fee_sol: num(info?.trade_fee), holders: num(info?.holder_count ?? st?.holder_count), dev_hold: num(st?.dev_team_hold_rate), creator_hold: num(st?.creator_hold_rate),
    creator_status: info?.dev?.creator_token_status ?? null, sniper_wallets: num(w?.sniper_wallets), insider_wallets: num(w?.rat_trader_wallets), bundler_wallets: num(w?.bundler_wallets),
    total_supply: num(info?.total_supply), created: num(info?.creation_timestamp), pool_opened: num(info?.open_timestamp), launchpad: info?.launchpad ?? null,
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
