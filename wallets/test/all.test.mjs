// node --test wallets/test/ — the transaction reader on hand-built transactions, then the whole collector against a fake RPC.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { parseTx, funderOf, WSOL } from "../src/parse.mjs";

const MINT = "2va3NUJtEcPemDYg2N1RgA79rPKGTGGJKo3gTY5zpump";
const tb = (i, mint, owner, ui) => ({ accountIndex: i, mint, owner, uiTokenAmount: { uiAmountString: String(ui) } });
// keys: list of [pubkey, signer]; lamports: {pubkey:[pre,post]}; tokens: [[idx,mint,owner,pre,post]]
function mk(keys, lamports, tokens, { legacy = false, err = null } = {}) {
  const pre = keys.map(([k]) => lamports[k]?.[0] ?? 1e9), post = keys.map(([k]) => lamports[k]?.[1] ?? 1e9);
  const message = legacy ? { accountKeys: keys.map(([k]) => k), header: { numRequiredSignatures: keys.filter(([, s]) => s).length } } : { accountKeys: keys.map(([k, s]) => ({ pubkey: k, signer: !!s })) };
  return { meta: { err, preBalances: pre, postBalances: post, preTokenBalances: tokens.filter((t) => t[3] != null).map((t) => tb(t[0], t[1], t[2], t[3])), postTokenBalances: tokens.filter((t) => t[4] != null).map((t) => tb(t[0], t[1], t[2], t[4])) }, transaction: { message } };
}
const buy = (user, sol, tok, o) => mk([[user, 1], ["uATA"], ["POOL"], ["pBase"], ["pQuote"]], { [user]: [5e9, 5e9 - sol * 1e9 - 5000] }, [[1, MINT, user, null, tok], [3, MINT, "POOL", 1e6, 1e6 - tok], [4, WSOL, "POOL", 10, 10 + sol]], o);
const sell = (user, sol, tok) => mk([[user, 1], ["uATA"], ["POOL"], ["pBase"], ["pQuote"]], { [user]: [5e9, 5e9 + sol * 1e9 - 5000] }, [[1, MINT, user, tok, 0], [3, MINT, "POOL", 1e6, 1e6 + tok], [4, WSOL, "POOL", 10, 10 - sol]]);

test("pool buy: buyer, SOL and price come from the pool's side", () => {
  const r = parseTx(buy("ALICE", 2, 1000), MINT);
  assert.equal(r.kind, "trade"); assert.equal(r.trades.length, 1);
  assert.deepEqual({ ...r.trades[0], sol: +r.trades[0].sol.toFixed(6) }, { wallet: "ALICE", side: "buy", tokens: 1000, sol: 2, signer: 1 });
  assert.equal(+r.price.toFixed(6), 0.002);
});
test("pool sell", () => { const r = parseTx(sell("BOB", 1.5, 500), MINT); assert.equal(r.trades[0].side, "sell"); assert.equal(+r.trades[0].sol.toFixed(6), 1.5); assert.equal(r.trades[0].wallet, "BOB"); });
test("legacy 'json' shape reads the same", () => { const r = parseTx(buy("ALICE", 2, 1000, { legacy: true }), MINT); assert.equal(r.trades[0].wallet, "ALICE"); assert.equal(r.trades[0].signer, 1); });
test("failed transaction is ignored", () => assert.equal(parseTx(buy("ALICE", 2, 1000, { err: { x: 1 } }), MINT), null));
test("bonding-curve buy: SOL is native lamports on the curve account", () => {
  const tx = mk([["CAROL", 1], ["cATA"], ["CURVE"], ["curveATA"]], { CAROL: [3e9, 3e9 - 0.5e9 - 5000], CURVE: [1e9, 1.5e9] }, [[1, MINT, "CAROL", null, 7000], [3, MINT, "CURVE", 9e8, 9e8 - 7000]]);
  const r = parseTx(tx, MINT); assert.equal(r.kind, "trade"); assert.equal(r.trades[0].wallet, "CAROL"); assert.equal(+r.trades[0].sol.toFixed(6), 0.5);
});
test("a bot that pays from a wrapped-SOL balance is still the buyer, not a pool", () => {
  const tx = mk([["BOT", 1], ["bATA"], ["bW"], ["POOL"], ["pBase"], ["pQuote"]], {}, [[1, MINT, "BOT", 0, 300], [2, WSOL, "BOT", 50, 49], [4, MINT, "POOL", 1e6, 1e6 - 300], [5, WSOL, "POOL", 10, 11]]);
  const r = parseTx(tx, MINT); assert.equal(r.trades.length, 1); assert.equal(r.trades[0].wallet, "BOT"); assert.equal(r.trades[0].side, "buy"); assert.equal(+r.trades[0].sol.toFixed(6), 1);
});
test("a buy delivered to another wallet is recorded for the receiving wallet, marked non-signer, with the payer kept", () => {
  const tx = mk([["PAYER", 1], ["rATA"], ["POOL"], ["pBase"], ["pQuote"]], { PAYER: [5e9, 4e9] }, [[1, MINT, "RECV", null, 400], [3, MINT, "POOL", 1e6, 1e6 - 400], [4, WSOL, "POOL", 10, 11]]);
  const r = parseTx(tx, MINT); assert.equal(r.trades[0].wallet, "RECV"); assert.equal(r.trades[0].signer, 0); assert.equal(r.payer, "PAYER");
});
test("wallet-to-wallet move is a transfer, not a trade", () => {
  const tx = mk([["DAVE", 1], ["dATA"], ["eATA"]], { DAVE: [1e9, 1e9 - 5000] }, [[1, MINT, "DAVE", 900, 0], [2, MINT, "ERIN", null, 900]]);
  const r = parseTx(tx, MINT); assert.equal(r.kind, "transfer"); assert.deepEqual(r.transfers, [{ from: "DAVE", to: "ERIN", tokens: 900 }]); assert.equal(r.trades.length, 0);
});
test("pool-to-pool arbitrage with no outside wallet is not a trade", () => {
  const tx = mk([["ARB", 1], ["P1"], ["P2"], ["a"], ["b"], ["c"], ["d"]], {}, [[3, MINT, "P1", 1000, 900], [4, WSOL, "P1", 10, 10.2], [5, MINT, "P2", 1000, 1100], [6, WSOL, "P2", 10, 9.79]]);
  assert.equal(parseTx(tx, MINT).kind, "arb");
});
test("a transaction that does not move the coin", () => assert.equal(parseTx(mk([["X", 1]], {}, []), MINT).kind, "none"));
test("first funder: the account that lost the SOL the wallet gained", () => {
  const tx = mk([["CEX", 1], ["NEW"]], { CEX: [10e9, 8e9 - 5000], NEW: [0, 2e9] }, []);
  assert.deepEqual(funderOf(tx, "NEW"), { funder: "CEX", sol: 2 }); assert.equal(funderOf(tx, "CEX"), null);
});

test("whole collector against a fake RPC: early buyers, line crossing, transfers, funder, holdings, no key in output", async () => {
  // story: supply 1,000,000; SOL = $100. ALICE buys 2 SOL at a low price, BOB 0.5 SOL, ALICE moves coins to ERIN,
  // then three buys by LATE1..3 at a price above the $100K line, then ALICE sells.
  const P = (tok, sol) => [tok, sol]; // price = sol/tok; mc = price * 1e6 * 100  → $100K needs price 0.001
  const story = [
    ["s1", 1000, buy("ALICE", ...[2, 20000])],      // price 0.0001 → $10K
    ["s2", 1010, buy("BOB", 0.5, 4000)],             // 0.000125 → $12.5K
    ["s3", 1020, mk([["ALICE", 1], ["aATA"], ["eATA"]], {}, [[1, MINT, "ALICE", 20000, 15000], [2, MINT, "ERIN", null, 5000]])],
    ["sF", 1025, buy("FAILED", 9, 9, { err: { e: 1 } })],
    ["s4", 1030, buy("LATE1", 3, 2000)],             // 0.0015 → $150K
    ["s5", 1031, buy("LATE2", 3, 2000)],
    ["s6", 1032, buy("LATE3", 3, 2000)],
    ["s7", 1040, sell("ALICE", 30, 15000)],          // 0.002 → $200K
  ];
  const txBy = Object.fromEntries(story.map(([s, t, tx]) => [s, { ...tx, blockTime: t, slot: t }]));
  txBy.aOld = { ...mk([["CEX", 1], ["ALICE"]], { CEX: [10e9, 7e9], ALICE: [0, 3e9] }, []), blockTime: 900, slot: 900 };
  let batches = 0, fastOn = true, fastCalls = 0, listCalls = 0;
  const answer = (q) => { const [a, b] = q.params; switch (q.method) {
    case "getTransactionsForAddress": { if (!fastOn) return { __error: { code: -32601, message: "Method not found" } }; fastCalls++;
      assert.equal(b.sortOrder, "asc"); assert.equal(b.filters.status, "succeeded"); assert.equal(b.filters.blockTime.gte, 500);
      const ok = story.filter(([, t, tx]) => !tx.meta.err && t >= b.filters.blockTime.gte && t <= b.filters.blockTime.lte); const at = b.paginationToken ? Number(b.paginationToken) : 0; const pg = ok.slice(at, at + b.limit);
      return { data: pg.map(([s, t, tx]) => ({ slot: t, transactionIndex: 0, blockTime: t, meta: tx.meta, transaction: { ...tx.transaction, signatures: [s] } })), paginationToken: at + b.limit < ok.length ? String(at + b.limit) : null }; }
    case "getTokenSupply": return { value: { uiAmountString: "1000000", decimals: 6 } };
    case "getSignaturesForAddress":
      if (a === MINT) listCalls++;
      if (a === MINT) return b.before ? [] : story.slice().reverse().map(([s, t, tx]) => ({ signature: s, blockTime: t, slot: t, err: tx.meta.err }));
      if (a === "ALICE") return b.before ? [] : [{ signature: "s7", blockTime: 1040 }, { signature: "aOld", blockTime: 900 }];
      return b.before ? [] : [{ signature: "x", blockTime: 950 }];
    case "getTransaction": return txBy[a] ?? null;
    case "getTokenAccountsByOwner": return { value: a === "BOB" ? [{ account: { data: { parsed: { info: { tokenAmount: { uiAmountString: "4000" } } } } } }] : [] };
    default: return null; } };
  const srv = http.createServer((req, res) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { const j = JSON.parse(d); if (Array.isArray(j)) batches++; const one = (q) => { const r = answer(q); return r?.__error ? { jsonrpc: "2.0", id: q.id, error: r.__error } : { jsonrpc: "2.0", id: q.id, result: r }; }; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(Array.isArray(j) ? j.map(one) : one(j))); }); });
  await new Promise((r) => srv.listen(0, r));
  process.env.RPC_HTTP = `http://127.0.0.1:${srv.address().port}/?api-key=SECRETSECRET123`;
  const { collect, parseRequest } = await import("../src/collect.mjs");
  const check = (meta, fast) => {
    assert.equal(meta.counts.read, 7); assert.equal(meta.counts.trades, 6); assert.equal(meta.counts.transfers, 1);
    assert.equal(meta.reached_line_at, "1970-01-01T00:17:10Z"); assert.equal(meta.reached_line_mc, 150000); assert.equal(meta.counts.early_buyers, 2);
    assert.equal(meta.cut_short.read_stopped_at_cap, false); assert.equal(meta.source, fast ? "getTransactionsForAddress" : "getSignaturesForAddress + getTransaction");
    assert.equal(meta.window.first_tx, "1970-01-01T00:16:40Z"); };
  // fast path, 3 transactions a page (3 pages); then the same coin with the fast call refused → the listing fallback must give the same answer
  const dir = mkdtempSync(tmpdir() + "/wt-"); const meta = await collect(parseRequest(`${MINT} label=TEST sol=100 from=500 to=2000 rps=500 page=3`), dir);
  check(meta, true); assert.equal(fastCalls, 3); assert.equal(listCalls, 0);
  fastOn = false; const dir2 = mkdtempSync(tmpdir() + "/wt-"); const meta2 = await collect(parseRequest(`${MINT} label=TEST sol=100 from=500 to=2000 rps=500`), dir2);
  check(meta2, false); assert.equal(meta2.counts.failed_tx_skipped, 1); assert.ok(batches > 0); assert.match(meta2.cut_short.fast_read_refused, /not found/i);
  assert.equal(readFileSync(dir + "/early.csv", "utf8"), readFileSync(dir2 + "/early.csv", "utf8"));
  assert.deepEqual(gunzipSync(readFileSync(dir + "/trades.csv.gz")), gunzipSync(readFileSync(dir2 + "/trades.csv.gz")));
  // the cap: stop after 4 transactions and say so
  fastOn = true; const meta3 = await collect(parseRequest(`${MINT} sol=100 from=500 to=2000 rps=500 max=4`), mkdtempSync(tmpdir() + "/wt-")); assert.equal(meta3.counts.read, 4); assert.equal(meta3.cut_short.read_stopped_at_cap, true);
  srv.close();
  const trades = gunzipSync(readFileSync(dir + "/trades.csv.gz")).toString().trim().split("\n");
  assert.equal(trades.length, 7); assert.equal(trades[1], "1000,1000,s1,ALICE,buy,20000,2,10000,1,");
  assert.equal(gunzipSync(readFileSync(dir + "/transfers.csv.gz")).toString().trim().split("\n")[1], "1020,1020,s3,ALICE,ERIN,5000");
  const early = readFileSync(dir + "/early.csv", "utf8").trim().split("\n").map((l) => l.split(",")); const h = early[0], row = (w) => Object.fromEntries(h.map((k, i) => [k, early.find((r) => r[1] === w)[i]]));
  const A = row("ALICE"), B = row("BOB");
  assert.equal(A.rank, "1"); assert.equal(A.early_buy_sol, "2.0000"); assert.equal(A.first_buy_mc_usd, "10000"); assert.equal(A.total_sell_sol, "30.0000"); assert.equal(A.net_sol, "28.0000");
  assert.equal(A.first_sell_mc_usd, "200000"); assert.equal(A.tokens_out_by_transfer, "5000"); assert.equal(A.funder, "CEX"); assert.equal(A.funder_sol, "3"); assert.equal(A.wallet_tx_count, "2"); assert.equal(A.pct_supply_bought_early, "2.000");
  assert.equal(B.holds_now, "4000"); assert.equal(B.sells, "0"); assert.equal(B.funder, "");
  assert.equal(B.holds_value_sol, "8.0000"); assert.equal(B.profit_sol, "7.5000"); assert.equal(A.profit_sol, "28.0000"); assert.equal(meta.last_price_sol, 0.002); // BOB: 4,000 coins at the last price 0.002 = 8 SOL, less the 0.5 SOL he paid
  for (const f of ["meta.json", "early.csv"]) assert.ok(!/SECRET|api-key/.test(readFileSync(dir + "/" + f, "utf8")), f + " must not contain the key");
});
