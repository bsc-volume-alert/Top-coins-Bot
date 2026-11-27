// collect.mjs — one coin: list every transaction that touched the coin in a time window, read them oldest-first, and write
//   trades.csv.gz      every buy and sell: time, wallet, side, tokens, SOL, market cap
//   transfers.csv.gz   coin moved wallet-to-wallet without a sale (links between wallets)
//   early.csv          every wallet that bought before the coin first reached the market-cap line (default $100K), with what it
//                      did afterwards, what it still holds now, how old the wallet is and who first funded it (top wallets only)
//   meta.json          the window, counts, what was cut short, and the RPC calls used
// Read-only. One standard RPC call per transaction (Helius: 1 credit each).
import { createWriteStream, mkdirSync, writeFileSync, copyFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createGzip } from "node:zlib";
import { once } from "node:events";
import { many, one, stats, scrub } from "./rpc.mjs";
import { parseTx, funderOf } from "./parse.mjs";

const iso = (t) => (t ? new Date(t * 1000).toISOString().replace(".000Z", "Z") : "");
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const toTs = (v) => (v == null ? null : /^\d{9,11}$/.test(v) ? Number(v) : Math.floor(Date.parse(v) / 1000) || null);
async function solUsdNow() {
  try { const j = await (await fetch("https://api.coinbase.com/v2/prices/SOL-USD/spot", { signal: AbortSignal.timeout(8000) })).json(); const v = Number(j?.data?.amount); if (v > 0) return v; } catch {}
  try { const j = await (await fetch("https://api.kraken.com/0/public/Ticker?pair=SOLUSD", { signal: AbortSignal.timeout(8000) })).json(); const v = Number(Object.values(j?.result || {})[0]?.c?.[0]); if (v > 0) return v; } catch {}
  return null;
}
function gz(path) { const g = createGzip({ level: 6 }); const f = createWriteStream(path); g.pipe(f); return { write: (s) => g.write(s), end: async () => { g.end(); await once(f, "finish"); } }; }

export function parseRequest(line) {
  const p = line.trim().split(/\s+/); const o = { mint: p[0] };
  for (const kv of p.slice(1)) { const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }
  o.id = o.mint + (o.run ? "_r" + o.run : "");
  return o;
}

export async function collect(req, dir, { onStatus = () => {} } = {}) {
  mkdirSync(dir, { recursive: true });
  const mint = req.mint, rps = num(req.rps, 30), maxTx = num(req.max, 40000), maxSigs = num(req.maxsigs, 1500000), mcLine = num(req.mc, 100000), top = num(req.top, 60);
  const t0 = Date.now(); const st = { id: req.id, label: req.label || "", stage: "start", started: iso(t0 / 1000) };
  const status = (extra) => { Object.assign(st, extra, { updated: iso(Date.now() / 1000), rpc_calls: stats.calls, rpc_retries: stats.retries, rpc_failed: stats.failed }); onStatus(st); };

  const solUsd = num(req.sol, null) ?? (await solUsdNow());
  const sup = await one("getTokenSupply", [mint]); if (!sup?.value) throw new Error("coin not found on chain (getTokenSupply gave nothing) — check the contract address");
  const supply = Number(sup.value.uiAmountString ?? sup.value.uiAmount);

  // 1) list signatures, newest first, back to the start of the window
  const to = toTs(req.to) ?? Math.floor(Date.now() / 1000); let from = toTs(req.from); const days = num(req.days, 7);
  let before, sigs = [], listed = 0, failedTx = 0, reachedStart = false, exhausted = false;
  status({ stage: "listing" });
  while (listed < maxSigs) {
    const page = await one("getSignaturesForAddress", [mint, { limit: 1000, ...(before ? { before } : {}) }], { rps });
    if (!page) throw new Error("the RPC did not answer the signature listing after retries");
    if (!page.length) { exhausted = true; break; }
    listed += page.length; before = page[page.length - 1].signature;
    if (from == null) { const newest = page.find((s) => s.blockTime)?.blockTime; if (newest) from = Math.min(newest, to) - days * 86400; }
    for (const s of page) { if (!s.blockTime || s.blockTime > to) continue; if (from != null && s.blockTime < from) { reachedStart = true; continue; } if (s.err) { failedTx++; continue; } sigs.push([s.signature, s.blockTime, s.slot]); }
    if (reachedStart) break; if (page.length < 1000) { exhausted = true; break; }
    if (listed % 20000 === 0) status({ listed, kept: sigs.length });
  }
  sigs.reverse(); // oldest first (the listing is newest-first; order inside a slot is the reverse of the listing)
  const listingCut = !reachedStart && !exhausted; // hit maxsigs before reaching the window start: the EARLIEST part is missing
  const fetchN = Math.min(sigs.length, maxTx);
  status({ stage: "reading", listed, in_window: sigs.length, to_read: fetchN, listing_cut: listingCut });

  // 2) read transactions oldest-first
  const tmp = mkdtempSync(tmpdir() + "/wallets-"); // big files are built outside the data folder and moved in at the end, so status pushes stay small
  const T = gz(tmp + "/trades.csv.gz"), X = gz(tmp + "/transfers.csv.gz");
  T.write("ts,slot,sig,wallet,side,tokens,sol,mc_usd,signer,payer\n"); X.write("ts,slot,sig,from,to,tokens\n");
  const W = new Map(); // wallet → totals
  const w = (a) => { let x = W.get(a); if (!x) W.set(a, (x = { wallet: a, first: 0, eb: 0, es: 0, en: 0, etok: 0, emc: 0, b: 0, s: 0, nb: 0, ns: 0, tokb: 0, toks: 0, firstSell: 0, firstSellMc: 0, tin: 0, tout: 0 })); return x; };
  let crossTs = 0, crossMc = 0, streak = 0, streakTs = 0, streakMc = 0, peakMc = 0, lowMc = Infinity, nTrades = 0, nTransfers = 0, nArb = 0, nNone = 0, nMissing = 0, read = 0, lastTs = 0; const links = [];
  const CH = 500;
  for (let k = 0; k < fetchN; k += CH) {
    const chunk = sigs.slice(k, k + CH);
    const txs = await many("getTransaction", chunk.map((s) => [s[0], { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]), { rps });
    for (let i = 0; i < chunk.length; i++) {
      const [sig, ts, slot] = chunk[i], tx = txs[i]; read++; lastTs = ts;
      if (!tx) { nMissing++; continue; }
      const r = parseTx(tx, mint); if (!r) continue;
      if (r.kind === "arb") nArb++; else if (r.kind === "none") nNone++;
      const mc = r.price ? r.price * supply * (solUsd || 0) : 0;
      if (r.kind === "trade" && mc > 0) { if (mc > peakMc) peakMc = mc; if (mc < lowMc) lowMc = mc; }
      const early = !crossTs; // this trade happened before the line was first reached
      for (const t of r.trades) { nTrades++;
        T.write(`${ts},${slot},${sig},${t.wallet},${t.side},${+t.tokens.toPrecision(10)},${+t.sol.toFixed(6)},${Math.round(mc)},${t.signer},${r.payer === t.wallet ? "" : r.payer}\n`);
        const x = w(t.wallet); if (!x.first) x.first = ts;
        if (t.side === "buy") { x.b += t.sol; x.nb++; x.tokb += t.tokens; if (early && (mc < mcLine || !solUsd)) { if (!x.en) x.emc = mc; x.eb += t.sol; x.en++; x.etok += t.tokens; } }
        else { x.s += t.sol; x.ns++; x.toks += t.tokens; if (early) x.es += t.sol; if (!x.firstSell) { x.firstSell = ts; x.firstSellMc = mc; } } }
      for (const t of r.transfers) { nTransfers++; X.write(`${ts},${slot},${sig},${t.from},${t.to},${+t.tokens.toPrecision(10)}\n`); if (t.from && t.from !== "multi") w(t.from).tout += t.tokens; if (t.to) w(t.to).tin += t.tokens; if (t.from && t.to && t.from !== "multi" && links.length < 20000) links.push([t.from, t.to]); }
      if (!crossTs && solUsd && r.kind === "trade") { // the line counts as reached on 3 trades in a row at or above it (one odd print cannot set it)
        if (mc >= mcLine) { if (!streak) { streakTs = ts; streakMc = mc; } if (++streak >= 3) { crossTs = streakTs; crossMc = streakMc; } } else streak = 0; }
    }
    status({ read, trades: nTrades, transfers: nTransfers, wallets: W.size, reached_line_at: iso(crossTs), last_tx_time: iso(lastTs), peak_mc: Math.round(peakMc) });
  }
  await T.end(); await X.end();
  for (const f of ["trades.csv.gz", "transfers.csv.gz"]) { copyFileSync(tmp + "/" + f, dir + "/" + f); unlinkSync(tmp + "/" + f); }

  // 3) the early buyers: everything they did, what they hold now, wallet age and first funder for the biggest ones
  const early = [...W.values()].filter((x) => x.en > 0).sort((a, b) => b.eb - a.eb);
  const pick = early.filter((x, i) => i < top || x.eb >= 1).slice(0, Math.max(top, 150));
  status({ stage: "enriching", early_buyers: early.length, enriching: pick.length });
  const bal = await many("getTokenAccountsByOwner", pick.map((x) => [x.wallet, { mint }, { encoding: "jsonParsed" }]), { rps });
  pick.forEach((x, i) => { x.holdNow = bal[i]?.value ? bal[i].value.reduce((a, v) => a + Number(v.account?.data?.parsed?.info?.tokenAmount?.uiAmountString || 0), 0) : null; });
  // wallet age: up to 3 pages of its history (3,000 transactions). Longer than that = an old, busy wallet (often a bot); not traced.
  for (const x of pick) x.pages = [];
  let live = pick.slice();
  for (let p = 0; p < 3 && live.length; p++) {
    const res = await many("getSignaturesForAddress", live.map((x) => [x.wallet, { limit: 1000, ...(x.before ? { before: x.before } : {}) }]), { rps });
    const next = [];
    live.forEach((x, i) => { const pg = res[i]; if (!pg) { x.ageErr = 1; return; } x.nTx = (x.nTx || 0) + pg.length; if (pg.length) { const o = pg[pg.length - 1]; x.oldestSig = o.signature; x.oldestTs = o.blockTime; x.before = o.signature; } if (pg.length === 1000) next.push(x); else x.complete = 1; });
    live = next;
  }
  const full = pick.filter((x) => x.complete && x.oldestSig);
  const ftx = await many("getTransaction", full.map((x) => [x.oldestSig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]), { rps });
  full.forEach((x, i) => { const f = funderOf(ftx[i], x.wallet); if (f) { x.funder = f.funder; x.funderSol = f.sol; } });

  const cols = ["rank", "wallet", "early_buy_sol", "early_buys", "first_buy_mc_usd", "first_buy_time", "early_sell_sol", "total_buy_sol", "total_sell_sol", "net_sol", "buys", "sells", "first_sell_time", "first_sell_mc_usd", "tokens_bought", "tokens_sold", "tokens_in_by_transfer", "tokens_out_by_transfer", "holds_now", "pct_supply_bought_early", "wallet_tx_count", "wallet_first_seen", "funder", "funder_sol"];
  const rows = early.map((x, i) => [i + 1, x.wallet, x.eb.toFixed(4), x.en, Math.round(x.emc), iso(x.first), x.es.toFixed(4), x.b.toFixed(4), x.s.toFixed(4), (x.s - x.b).toFixed(4), x.nb, x.ns, iso(x.firstSell), Math.round(x.firstSellMc), +x.tokb.toPrecision(8), +x.toks.toPrecision(8), +x.tin.toPrecision(8), +x.tout.toPrecision(8), x.holdNow ?? "", ((100 * x.etok) / supply).toFixed(3), x.nTx == null ? "" : x.complete ? x.nTx : x.nTx + "+", x.complete ? iso(x.oldestTs) : "", x.funder || "", x.funderSol ?? ""]);
  writeFileSync(dir + "/early.csv", cols.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n") + "\n");

  const meta = { id: req.id, mint, label: req.label || "", request: req, finished: iso(Date.now() / 1000), seconds: Math.round((Date.now() - t0) / 1000),
    window: { from: iso(from), to: iso(to), first_tx: iso(sigs[0]?.[1]), last_tx_read: iso(lastTs) },
    supply, sol_usd: solUsd, mc_line_usd: mcLine, reached_line_at: iso(crossTs), reached_line_mc: Math.round(crossMc), low_mc_usd: Number.isFinite(lowMc) ? Math.round(lowMc) : null, peak_mc_usd_in_read: Math.round(peakMc),
    counts: { signatures_listed: listed, failed_tx_skipped: failedTx, in_window: sigs.length, read, not_returned: nMissing, trades: nTrades, transfers: nTransfers, arbitrage_tx: nArb, no_balance_change: nNone, wallets: W.size, early_buyers: early.length, enriched: pick.length },
    cut_short: { listing_hit_cap_before_window_start: listingCut, read_stopped_at_cap: sigs.length > fetchN, unread: sigs.length - fetchN },
    rpc: { ...stats }, note: "mc_usd uses ONE SOL/USD rate for the whole window (the rate at collection time) — approximate. 'early' = buys before the first trade at or above mc_line_usd." };
  writeFileSync(dir + "/meta.json", JSON.stringify(meta, null, 1));
  status({ stage: "done" });
  return meta;
}
export { scrub };
