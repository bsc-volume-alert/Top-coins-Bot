// WRITE-OFF (owner 28 Nov 2026 01:10 UK): a buy that can no longer be priced is closed by him as a total loss.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Poller } from "../src/polled.mjs";
import { SPL_TOKEN } from "../src/risk.mjs";
import { booksApi, BOOKS_PAGE } from "../src/page.mjs";
import { canWriteOff, lastPriced, COST } from "../src/book.mjs";
import * as S from "../src/spec.mjs";

test("a quote-priced buy with no sale price for 10 minutes can be written off: every held row closes at a total loss, a waiting hand sale too; refused while it can still be priced", async () => {
  assert.equal(S.WRITE_OFF_MIN_S, 600);
  const w = { t: T0, px: new Map(), route: true };
  const tok = (mint) => ({ mint, decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(mint) || 0) * 1e9, launchpad: "meteora-dbc", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false });
  const jup = { prices: async (mints) => ({ t: w.t, req: w.t, prices: new Map(mints.filter((x) => w.px.has(x)).map((x) => [x, { px: w.px.get(x), liqUsd: 60_000, decimals: 6 }])), omitted: [] }),
    quote: async (mint, side, raw) => { const req = w.t; w.t += 0.3; if (!w.route) return { ok: false, t: w.t, why: "no route" }; const px = w.px.get(mint) / 100; return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Meteora DLMM"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Meteora DLMM"], router: "metis" }; }, recent: async () => [], category: async () => [], tokens: async (ms) => ms.map((m) => tok(m)) };
  const eng = mkEngine(), poll = new Poller({ engine: eng, jup, now: () => w.t }), M = "MeteoraCoin1111111111111111111111111111111111";
  const step = async (dt, mc) => { w.t += dt; w.px.set(M, mc / 1e9); await poll.sweep(); eng.tick(w.t); await poll.quotes(); eng.tick(w.t); };
  w.px.set(M, 100_000 / 1e9); poll.add(tok(M), "test"); for (let i = 0; i < 31; i++) await step(10, 100_000); await step(10, 205_000); w.t += 1.1; await poll.quotes();
  const e = [...eng.entries.values()][0]; assert.equal(e.status, "filled"); await step(10, 205_000); await step(10, 205_000);
  const open0 = e.versions.filter((v) => v.status !== "closed").length; assert.ok(open0 > 0, "rows are held"); assert.ok(lastPriced(e) > e.fill.t, "its rows have been priced");
  assert.equal(canWriteOff(e, w.t), false); let r = eng.writeOff(e.id, w.t); assert.equal(r.ok, false); assert.match(r.why, /had a sale price in the last 10 minutes: sell it instead/); assert.equal(e.versions.filter((v) => v.status !== "closed").length, open0, "nothing changed");
  // the liquidity goes: no route from here on. He asks to sell all; the order waits. Nine minutes later it still cannot be written off; after ten it can.
  w.route = false; assert.equal(eng.manualSell(e.id, 1, w.t).ok, true); for (let i = 0; i < 54; i++) await step(10, 205_000);
  assert.ok(e.manual.order, "his sale is still waiting for a price"); assert.equal(canWriteOff(e, w.t), false, "nine minutes without a price: not yet"); for (let i = 0; i < 8; i++) await step(10, 205_000); assert.equal(canWriteOff(e, w.t), true);
  const j0 = booksApi([e], { stop: 0.25, now: w.t, sellable: true }), row0 = Object.values(j0.books).flat().find((x) => x.id === e.id && x.status === "open"); assert.equal(row0.wo, 1, "the page is told the cross may be shown");
  r = eng.writeOff(e.id, w.t); assert.deepEqual(r, { ok: true, rows: open0 }); assert.ok(e.versions.every((v) => v.status === "closed"));
  for (const v of e.versions.filter((x) => x.exit.written_off)) { assert.equal(v.reason, "written off: no sale price"); assert.equal(v.exit.exec, "written-off"); assert.ok(Math.abs(v.exit.ret - ((v.got || 0) / COST - 1)) < 1e-12); assert.ok(v.exit.ret <= 0 || v.half, "nothing for what was still held"); assert.equal(v.tok, 0); }
  assert.equal(e.versions.filter((x) => x.exit.written_off).length, open0); assert.equal(e.manual.order, null); assert.equal(e.manual.closed.ret, -1); assert.equal(e.manual.closed.written_off, true); assert.ok(e.flags.includes("written off: no sale price")); assert.equal(e.written_off.rows, open0);
  assert.deepEqual(eng.stats.written_off, { done: 1, refused: 1 }); assert.equal(eng.writeOff(e.id, w.t + 1).ok, false, "once only");
  const j1 = booksApi([e], { stop: 0.25, now: w.t + 1, sellable: true }), row1 = Object.values(j1.books).flat().find((x) => x.id === e.id); assert.equal(row1.status, "closed"); assert.equal(row1.ret, e.versions.find((v) => v.policy === "trail" && v.stop === 0.25).exit.ret); assert.equal(row1.reason, "written off: no sale price"); assert.equal(row1.wo, undefined); assert.equal(row1.man.closed, true);
  assert.equal(eng.writeOff(999999).ok, false);
});
test("a pool-priced buy can always be sold: it is never written off", () => {
  const M = "MintAAApump", e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.setBooks(S.booksOf("older-11"));
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 300 });
  swap(e, T0 + 760, 100_000); swap(e, T0 + 762, 100_000); const en = [...e.entries.values()].find((x) => x.families.includes("VOL100K")); assert.ok(en); assert.equal(en.status, "filled"); assert.equal(canWriteOff(en, T0 + 90_000), false);
  const r = e.writeOff(en.id, T0 + 5000); assert.equal(r.ok, false); assert.match(r.why, /priced on its pool and can always be sold/);
});
test("the page: a cross beside a buy with no sale price, armed by the first tap; the request needs the site key", () => {
  for (const x of ["function WOB(t)", "tap again: write off as a total loss", "fetch('/api/writeoff?'+q,{method:'POST'})", "no sale price yet</span>':'')+WOB(t)", "Written off as a total loss", ".wo.arm{background:var(--dn)"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
});
