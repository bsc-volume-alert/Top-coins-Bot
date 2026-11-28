// LIVE LIQUIDITY BESIDE EVERY OPEN POSITION (owner 27 Nov 2026 23:53 UK). Display only: no rule reads it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0, SOLUSD, quoteFor } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { SPL_TOKEN } from "../src/risk.mjs";
import { booksApi, liqRow, BOOKS_PAGE } from "../src/page.mjs";
import * as S from "../src/spec.mjs";

test("the settings: one request every 5 s; amber from 20% below the figure at the buy, red from 50%", () => { assert.equal(S.LIQ_EVERY_S, 5); assert.equal(S.LIQ_WARN, 0.2); assert.equal(S.LIQ_BAD, 0.5); });

test("a pool-priced position: the pool's own liquidity (2 × its SOL side) at every trade, with the figure at the signal beside it", () => {
  const M = "MintAAApump", e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.setBooks(S.booksOf("older-11"));
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 300 });
  const en = [...e.entries.values()].find((x) => x.families.includes("VOL100K")); assert.ok(en, "a volume buy");
  swap(e, T0 + 760, 100_000); swap(e, T0 + 762, 100_000); const L = e.liq.get(M); assert.ok(L && L.src === "pool" && L.usd > 0 && L.t >= T0 + 760);
  assert.ok(Math.abs(L.usd - 2 * quoteFor(100_000) * SOLUSD) / L.usd < 0.05, "2 × the SOL side of the pool, in dollars");
  swap(e, T0 + 770, 50_000, { isBuy: false }); assert.ok(e.liq.get(M).usd < L.usd, "it moves with the pool");
  const r = liqRow(en, e.liq); assert.equal(r.src, "pool"); assert.ok(r.buy > 0 && r.usd > 0 && r.usd < r.buy, "now against the figure at the signal");
  const j = booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 780, run: { name: "t", books: S.booksOf("older-11") }, liq: e.liq }), row = j.books.VOL100K.find((x) => x.id === en.id);
  assert.equal(row.status, "open"); assert.deepEqual(row.liq, r); assert.equal(booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 780, run: { name: "t", books: S.booksOf("older-11") } }).books.VOL100K.find((x) => x.id === en.id).liq, undefined, "no figure known: none shown");
});

test("a quote-priced position: Jupiter's figure, one request for all held coins; a coin left out keeps its last figure and counts a miss; a coin no longer held is forgotten", async () => {
  const w = { t: T0, px: new Map(), liq: new Map(), omit: new Set(), reqs: 0 };
  const tok = (mint) => ({ mint, decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(mint) || 0) * 1e9, launchpad: "meteora-dbc", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false });
  const jup = { prices: async (mints) => { w.reqs++; w.last = mints.slice(); const m = new Map(), om = []; for (const x of mints) { if (w.omit.has(x) || !w.px.has(x)) om.push(x); else m.set(x, { px: w.px.get(x), liqUsd: w.liq.get(x) ?? 60_000, decimals: 6 }); } return { t: w.t, req: w.t, prices: m, omitted: om }; },
    quote: async (mint, side, raw) => { const req = w.t; w.t += 0.3; const px = w.px.get(mint) / 100; return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Meteora DLMM"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Meteora DLMM"], router: "metis" }; }, recent: async () => [], category: async () => [], tokens: async (ms) => ms.map((m) => tok(m)) };
  const eng = mkEngine(), poll = new Poller({ engine: eng, jup, now: () => w.t }), M = "MeteoraCoin1111111111111111111111111111111111";
  const step = async (dt, mc) => { w.t += dt; w.px.set(M, mc / 1e9); await poll.sweep(); eng.tick(w.t); await poll.quotes(); eng.tick(w.t); };
  w.px.set(M, 100_000 / 1e9); poll.add(tok(M), "test"); for (let i = 0; i < 31; i++) await step(10, 100_000); await step(10, 205_000); w.t += 1.1; await poll.quotes();
  const e = [...eng.entries.values()][0]; assert.equal(e.status, "filled"); assert.equal(e.exec, "routed-quote");
  eng.liq.clear(); const before = w.reqs; w.liq.set(M, 41_500); assert.equal(await poll.liquidity(), 1); assert.equal(w.reqs, before + 1, "ONE request"); assert.deepEqual(w.last, [M]);
  assert.deepEqual(eng.liq.get(M), { usd: 41_500, t: w.t, src: "jupiter" }); assert.deepEqual(poll.stats.liq, { asks: 1, read: 1, missed: 0, errors: 0 });
  w.t += 5; w.liq.set(M, 9_000); await poll.liquidity(); assert.equal(eng.liq.get(M).usd, 9_000, "the newest figure");
  const t9 = eng.liq.get(M).t; w.t += 5; w.omit.add(M); await poll.liquidity(); assert.deepEqual(eng.liq.get(M), { usd: 9_000, t: t9, src: "jupiter", miss: 1 }, "left out by Jupiter: the last figure and its time stay, a miss is counted — never zero");
  jup.prices = async () => { throw new Error("HTTP 500"); }; assert.equal(await poll.liquidity(), 0); assert.equal(poll.stats.liq.errors, 1, "a failed request changes nothing");
  assert.equal(e.status, "filled", "nothing was sold or changed by it"); assert.equal(e.liq, undefined, "nothing is written on the buy");
  eng.quoteNeeds = () => []; await poll.liquidity(); assert.equal(eng.liq.has(M), false, "no longer held: forgotten"); assert.equal(poll.liqAsked.size, 0);
});

test("the page: a 'liquidity now' column beside the sell buttons, refreshed with the live prices", () => {
  for (const s of ["<th>liquidity now</th>", "function LQ(t)", "<td>'+LQ(t)+'</td>", "at the buy '+KD(q.buy)", "Jupiter has stopped giving a figure", "if(x[3]&&(!t.liq||x[3].usd!==t.liq.usd||x[3].miss!==t.liq.miss)){t.liq=x[3];ch=true}", "d<=-0.5?'dn':d<=-0.2?'amb':''"]) assert.ok(BOOKS_PAGE.includes(s), "the page has: " + s);
  assert.equal(liqRow({ mint: "X" }, null), undefined); assert.equal(liqRow({ mint: "X" }, new Map()), undefined);
  assert.deepEqual(liqRow({ mint: "X", features: { liq_usd: 8000.4 } }, new Map([["X", { usd: 3999.6, t: 5, src: "jupiter" }]])), { usd: 4000, t: 5, buy: 8000, miss: undefined, src: "jupiter" });
  assert.deepEqual(liqRow({ mint: "X" }, new Map([["X", { usd: null, t: null, src: "jupiter", miss: 2 }]])), { usd: null, t: null, buy: null, miss: 2, src: "jupiter" });
});
