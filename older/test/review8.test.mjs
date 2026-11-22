// Eighth independent review (ChatGPT on 0a3b8d3, 22 Nov 2026 01:34 UK): reproductions of B1, B2 (evidence), C1, C2, C3 and A's leftover.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs"; import { Store } from "../src/store.mjs"; import { saveWarm, loadWarm } from "../src/warm.mjs";
import { Series, Coverage } from "../src/series.mjs";
import { booksApi } from "../src/page.mjs"; import { bookRows } from "../src/report.mjs";
import { feeKnown, nextRiskRead, classifyMintAccount, TOKEN_2022, SPL_TOKEN } from "../src/risk.mjs";
import { newEntry, advance } from "../src/book.mjs";
import * as S from "../src/spec.mjs";
const M = "MeteoraCoin1111111111111111111111111111111111", MP = "MintAAApump", has = (e, f) => [...e.entries.values()].filter((x) => x.families.includes(f)), dir = () => mkdtempSync(join(tmpdir(), "older-"));
function world(program = SPL_TOKEN) { const w = { t: T0, px: new Map(), quoteDelay: 0.3 };
  w.tok = (mint, o = {}) => ({ mint, decimals: 6, token_program: program, circ_supply: 1e9, mcap: (w.px.get(mint) || 0) * 1e9, launchpad: "raydium-launchlab", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false, ...o });
  w.jup = { prices: async (ms) => { const m = new Map(); for (const x of ms) if (w.px.has(x)) m.set(x, { px: w.px.get(x), liqUsd: 6e4, decimals: 6 }); return { t: w.t, req: w.t, prices: m, omitted: [] }; },
    quote: async (mint, side, raw) => { const req = w.t; w.t += w.quoteDelay; const px = w.px.get(mint) / 100; return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["X"], router: "m", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["X"], router: "m" }; }, recent: async () => [], category: async () => [], tokens: async (ms) => ms.map((m) => w.tok(m)) };
  w.eng = mkEngine(); w.poll = new Poller({ engine: w.eng, jup: w.jup, now: () => w.t }); w.step = async (dt, mint, mc) => { w.t += dt; if (mint) w.px.set(mint, mc / 1e9); await w.poll.sweep(); w.eng.tick(w.t); await w.poll.quotes(); w.eng.tick(w.t); };
  w.flat = async () => { w.px.set(M, 1e-4); w.poll.add(w.tok(M), "t"); for (let i = 0; i < 31; i++) await w.step(10, M, 100_000); }; w.double = async () => { w.t += 10; w.px.set(M, 205_000 / 1e9); await w.poll.sweep(); return [...w.eng.entries.values()][0]; };
  return w; }
const rpcRisk = (bps, extra = []) => classifyMintAccount({ owner: TOKEN_2022, data: { parsed: { info: { decimals: 6, supply: "1000000000000000", extensions: [{ extension: "transferFeeConfig", state: { newerTransferFee: { transferFeeBasisPoints: bps }, olderTransferFee: { transferFeeBasisPoints: bps } } }, ...extra] } } } });

test("B1 unknown is not 'no fee': a Token-2022 coin whose extensions have not been read is not entered; once read (1% fee) it is, as a fee coin", async () => {
  assert.equal(feeKnown({ token_program: SPL_TOKEN }), true); assert.equal(feeKnown({ token_program: TOKEN_2022, risk: { status: "missing" } }), false); assert.equal(feeKnown({ token_program: null }), false, "an unknown token program is not known either"); assert.equal(feeKnown({ token_program: TOKEN_2022, risk: rpcRisk(100) }), true);
  const w = world(TOKEN_2022); await w.flat(); const e0 = await w.double(); assert.equal(e0, undefined, "the double is not bought while the fee is unknown"); assert.ok(w.eng.stats.feeUnknown > 0);
  const k = world(TOKEN_2022); await k.flat(); k.eng.coins.get(M).info.risk = rpcRisk(100); const e = await k.double(); assert.ok(e, "read from the chain: now it is evaluated"); k.t += 1.1; await k.poll.quotes();
  assert.equal(e.status, "filled"); assert.equal(e.token.xfer_bps, 100); assert.equal(booksApi([e], { stop: 0.2, policy: "trail" }).books["FEE-COINS"].length, 1);
});

test("B1 eligibility is checked again at the fill: a fee raised over the limit between decision and fill cancels the buy; a fee that only appears at the fill moves the buy into FEE-COINS", async () => {
  const a = world(); await a.flat(); a.eng.coins.get(M).info.risk = { status: "flagged", blocking: [], fee_bps: 100, src: "rpc mint account" }; const e = await a.double(); assert.equal(e.status, "pending"); assert.equal(e.token.xfer_bps, 100);
  a.eng.coins.get(M).info.risk = { status: "restricted", blocking: ["transferFee 800 bps"], fee_bps: 800, src: "rpc mint account" }; a.t += 1.1; await a.poll.quotes();
  assert.equal(e.status, "cancelled", "8% is over the owner's 5% limit: the pending buy does not fill"); assert.match(e.flags.join(), /restrictions changed between the decision and the fill/); assert.equal(e.fill, null); assert.equal(a.eng.stats.cancelledAtFill, 1);
  const b = world(); await b.flat(); const f = await b.double(); assert.equal(f.token.xfer_bps, 0); b.eng.coins.get(M).info.risk = { status: "flagged", blocking: [], fee_bps: 500, src: "rpc mint account" }; b.t += 1.1; await b.poll.quotes();
  assert.equal(f.status, "filled"); assert.equal(f.fill.quote.xfer_bps, 500); assert.equal(f.token.xfer_bps, 500, "the stored tag follows the fee that was actually applied");
  const api = booksApi([f], { stop: 0.2, policy: "trail" }); assert.equal(api.books["FEE-COINS"].length, 1); assert.equal(api.books["FAST-5M"].length, 0, "…so it is in FEE-COINS and not in an ordinary book"); assert.equal(bookRows([f]).reduce((n, r) => n + r.entries, 0), 0);
  const c = world(); await c.flat(); const g = await c.double(); c.t += 1.1; await c.poll.quotes(); assert.equal(g.token.xfer_bps, 0); c.eng.coins.get(M).info.risk = { status: "flagged", blocking: [], fee_bps: 300, src: "rpc mint account" }; c.t += 11; await c.poll.quotes();
  assert.equal(g.token.xfer_bps, 300, "a fee that starts being applied while the position is open re-classifies it too");
});

test("B1 the next mint to read: a coin with a position first, then unread coins (most recently priced first), then a refresh for coins we hold; a failed read waits a minute", () => {
  const e = mkEngine(), mk = (m, o = {}) => { const c = e.coin(m, { mode: "polled", t: T0, info: { token_program: o.program ?? TOKEN_2022 } }); c.series.lastT = o.lastT ?? null; c.riskRead = !!o.read; c.riskAt = o.at ?? null; return c; };
  mk("Spl", { program: SPL_TOKEN }); mk("Old", { lastT: T0 + 5 }); mk("Fresh", { lastT: T0 + 50 }); const held = mk("Held", { lastT: T0 + 1 }); e.byMint.set("Held", new Set([1]));
  assert.equal(nextRiskRead(e, T0 + 60).mint, "Held"); held.riskRead = true; held.riskAt = T0 + 60;
  assert.equal(nextRiskRead(e, T0 + 61).mint, "Fresh"); e.coins.get("Fresh").riskRead = true; assert.equal(nextRiskRead(e, T0 + 62).mint, "Old"); e.coins.get("Old").riskRetryAt = T0 + 120; assert.equal(nextRiskRead(e, T0 + 63), null, "a failed read is not retried at once; a classic SPL token is never read");
  assert.equal(nextRiskRead(e, T0 + 121).mint, "Old"); e.coins.get("Old").riskRead = true; assert.equal(nextRiskRead(e, T0 + 60 + S.RISK_REFRESH_S + 1).mint, "Held", "a coin we hold is read again after RISK_REFRESH_S");
});

test("B2 the fee is charged exactly once and the evidence is kept: the raw quoted amounts, the fee and the inclusion assumption are on the fill and on the sale", async () => {
  const w = world(); await w.flat(); w.eng.coins.get(M).info.risk = { status: "flagged", blocking: [], fee_bps: 400, src: "rpc mint account" }; const e = await w.double(); w.t += 1.1; await w.poll.quotes();
  const q = e.fill.quote; assert.equal(q.xfer_in_quote, S.XFER_FEE_IN_QUOTE); assert.ok(q.raw_tok > 0); assert.ok(Math.abs(e.fill.tok / q.raw_tok - (S.XFER_FEE_IN_QUOTE ? 1 : 0.96)) < 1e-9, "tokens used = raw quoted tokens, less the fee once (or untouched if the quote is taken as net)");
  w.px.set(M, 75_000 / 1e9); w.t += 11; await w.poll.quotes(); w.t += 0.8; await w.poll.quotes(); const v = e.versions.find((x) => x.policy === "trail" && x.stop === 0.2); assert.equal(v.status, "closed");
  assert.equal(v.exit.quote.xfer_bps, 400); assert.ok(v.exit.quote.raw_sol > 0); assert.ok(Math.abs((v.exit.last_sol + S.TX_COST_SOL) / v.exit.quote.raw_sol - (S.XFER_FEE_IN_QUOTE ? 1 : 0.96)) < 1e-6, "sale proceeds = raw quoted SOL, less the fee once");
});

// warm-restart helpers
const mk = (d, age, build, stop) => { const st = new Store(join(d, "w.db")), e = mkEngine({ store: st }); e.feedUp(T0); e.coin(MP, { pool: "PoolA", createTs: T0 - age }); st.saveCoin(MP, { pool: "PoolA", createTs: T0 - age, info: {} }); build(e); e.flush(); st.heartbeat(stop); saveWarm(join(d, "w.warm"), e, stop); st.db.close(); };
const again = (d, stop, up = 10) => { const st = new Store(join(d, "w.db")), e = mkEngine({ store: st }); st.restore(e); const r = loadWarm(join(d, "w.warm"), e, stop + 5); e.restartGap(st.lastAlive(), stop + 5, { warm: r.loaded }); e.feedUp(stop + up); return e; };
const climb = (e) => { path(e, T0, T0 + 300, (t) => 100_000 + (t - T0) * 1400, 20); swap(e, T0 + 300, 600_000); };

test("C1 an ordinary outage from hours before the stop is still an outage after a warm restart: a RUG peak from before it is not evidence", () => {
  const d = dir(), stop = T0 + 400 + 6 * H; mk(d, 2 * H, (e) => { climb(e); e.feedDown(T0 + 310); e.feedUp(T0 + 400); }, stop); // $600K peak, a 90 s outage, then more than 5.5 quiet hours
  const e = again(d, stop); assert.ok(e.cov.gaps.some(([a, b, k]) => a === T0 + 310 && b === T0 + 400 && k === undefined), "the old outage came back with the snapshot"); assert.equal(e.coins.get(MP).rug ?? null, null, "and the peak that depended on it was not saved");
  swap(e, stop + 12, 150_000); swap(e, stop + 14, 110_000); assert.equal(has(e, "RUG450").length, 0, "the reviewer's case: $150K → $110K is not bought against the $600K peak");
  const d2 = dir(); mk(d2, 2 * H, climb, stop); const k = again(d2, stop); swap(k, stop + 12, 150_000); swap(k, stop + 14, 110_000); assert.equal(has(k, "RUG450").length, 1, "control: the same path with no outage IS bought (marked)");
});
test("C1 a coin's own break that has been pruned from the record still counts: a stretch reaching back before it is not unbroken", () => {
  const cov = new Coverage(); cov.up(0); const s = new Series("M", cov); s.startLive(0); s.add(100, 1); s.breakOpen(200); s.breakClose(260); s.add(260, 1);
  assert.equal(s.steady(100, 300), false); const far = 260 + S.BAR_KEEP_S + 3600 + 10; s.prune(far); assert.equal(s.own.length, 0, "the interval itself is gone"); assert.equal(s.ownCut, 260);
  assert.equal(s.steady(100, far), false, "…but what depended on observation across it is still refused"); assert.equal(s.continuous(100, far), false); assert.equal(s.covered(100, far), false); assert.equal(s.steady(300, far), true, "a stretch that starts after it is fine");
  const r = Series.load("M", cov, JSON.parse(JSON.stringify(s.dump()))); assert.equal(r.ownCut, 260); assert.equal(r.steady(100, far), false, "and it survives a warm restart");
});
test("C2 an outage already under way at the stop stays an ordinary outage up to the stop: only the time away can be warm", () => {
  const d = dir(), stop = T0 + 400; mk(d, 2 * H, (e) => { climb(e); swap(e, T0 + 390, 400_000); e.feedDown(T0 + 395); }, stop); const e = again(d, stop);
  const g = e.cov.gaps.slice(-2); assert.deepEqual(g[0], [T0 + 395, stop], "feed lost at +395, stopped at +400: a plain gap"); assert.deepEqual(g[1], [stop, stop + 10, "warm"], "from the stop to the feed coming back: the warm gap");
  assert.equal(e.coins.get(MP).series.covered(T0 + 300, stop + 14), false, "nothing spans the outage"); swap(e, stop + 12, 150_000); swap(e, stop + 14, 110_000); assert.equal(has(e, "RUG450").length, 0, "and the RUG peak from before it is gone");
});
test("C3 the restart mark follows the observation that supplied the price: a quiet coin's CONT bought on a price from before the restart is marked, although its 1-hour window begins after it", () => {
  const d = dir(), stop = T0 + 3 * H; mk(d, 20 * H, (e) => path(e, T0, stop, () => 100_000, 60), stop); const e = again(d, stop);
  swap(e, stop + 4000, 135_000); const c = has(e, "CONT")[0]; assert.ok(c, "the coin was silent for over an hour, so the $100K standing price dates from before the restart");
  assert.equal(c.cands.find((x) => x.family === "CONT").detail.restart_gap_s, 10); assert.equal(c.warm_gap_s, 10); assert.match(c.flags.join(), /restart gap of 10 s/);
  const d2 = dir(); mk(d2, 20 * H, (x) => path(x, T0, stop, () => 100_000, 60), stop); const k = again(d2, stop); path(k, stop + 20, stop + 4000, () => 100_000, 60); swap(k, stop + 4000, 135_000);
  assert.equal(has(k, "CONT")[0].warm_gap_s ?? 0, 0, "control: with trades after the restart the reference dates from after it — no mark");
});
test("A an estimated sale is not a result in the full table either: counted apart, in no total", () => {
  const s = (q, t) => ({ base: 2e8, quote: q, feeBuy: 0.003, feeSell: 0.003, t }), yes = () => true, h = newEntry({ mint: "H", pool: "P", ag: "A4", t: 0, families: ["HH-BREAK"], features: {}, mc: 1e5, px: 1 }); advance(h, 1.5, s(100, 0), yes);
  for (const v of h.versions) { v.status = "closed"; v.exit = { t: 100, sol: 1, ret: 1 / 0.2005 - 1, est: true, hold_s: 100, delay_s: 0 }; }
  const r = bookRows([h]).find((x) => x.family === "HH-BREAK" && x.ag === "A4" && x.stop === 0.2 && x.policy === "trail");
  assert.equal(r.closed, 0); assert.equal(r.net_sol, 0); assert.equal(r.win_rate, null); assert.equal(r.estimated_exits, 1); assert.ok(Math.abs(r.estimated_net_sol - 0.7995) < 1e-4, "the reviewer's +0.7995 SOL is shown apart");
});
