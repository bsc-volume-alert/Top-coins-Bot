// BANNED NAMES (owner 28 Nov 2026 02:06 UK): "we must have the option on the web page… you can ban and unban".
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, T0, H } from "./helpers.mjs";
import { Bans, banKey } from "../src/bans.mjs";
import { Store } from "../src/store.mjs";
import { SPL_TOKEN } from "../src/risk.mjs";
import { booksApi, BOOKS_PAGE } from "../src/page.mjs";
import * as S from "../src/spec.mjs";

test("a name is matched without regard to capitals, spaces or punctuation; a longer name is a different name", () => {
  assert.equal(banKey(" Space X "), "spacex"); assert.equal(banKey("SPACE-X"), "spacex"); assert.equal(banKey("$Snowball!"), "snowball"); assert.notEqual(banKey("SPACEXLIFE"), banKey("SpaceX")); assert.equal(banKey(null), ""); assert.equal(banKey("  "), "");
  const B = new Bans(); assert.equal(B.match("Snowball"), null); assert.deepEqual(B.add("  ", 1), { ok: false, why: "which name? (a coin without a name cannot be banned)" });
  const a = B.add("Snowball", 100); assert.deepEqual(a, { ok: true, key: "snowball", name: "Snowball" }); assert.equal(B.add("SNOWBALL", 200).already, true); assert.equal(B.map.size, 1);
  assert.equal(B.match("snow ball").key, "snowball"); assert.equal(B.match("Snowballs"), null); assert.equal(B.match(null), null);
  assert.equal(B.remove("nothing").ok, false); assert.equal(B.remove("snowBALL").ok, true); assert.equal(B.match("Snowball"), null);
});
test("what a ban keeps out is written down once per coin, with every book that would have bought it; the list survives a restart", () => {
  const st = new Store(":memory:"), B = new Bans(st); B.add("Snowball", 100); const b = B.match("Snowball");
  B.hit(b, { t: 200, sym: "Snowball", mint: "M1", family: "NEW-5M", mc: 21_400.6 }); B.hit(b, { t: 205, sym: "Snowball", mint: "M1", family: "FARM-90K", mc: 22_000 }); B.hit(b, { t: 300, sym: "SNOWBALL", mint: "M2", family: "FARM-90K", mc: 19_000 });
  const v = B.view(); assert.equal(v.list.length, 1); assert.equal(v.list[0].kept, 2, "two coins"); assert.equal(v.list[0].last, 300); assert.deepEqual(v.hits.map((h) => [h.mint, h.mc, h.books]), [["M2", 19000, ["FARM-90K"]], ["M1", 21401, ["NEW-5M", "FARM-90K"]]]);
  const B2 = new Bans(st); assert.equal(B2.match("snowball").kept, 2); assert.equal(B2.view().hits.length, 2); B2.remove("Snowball"); assert.equal(new Bans(st).match("Snowball"), null); assert.equal(new Bans(st).view().hits.length, 2, "what was kept out stays written down");
  for (let i = 0; i < S.BAN_KEEP + 5; i++) B.hit(b, { t: 400 + i, sym: "Snowball", mint: "X" + i, family: "FARM-90K", mc: 1 }); assert.equal(B.hits.length, S.BAN_KEEP);
});
test("a banned name is not bought by a new-coin book, the book's mark stays free, and after the ban is taken off the same coin can be bought; other names are untouched", () => {
  const e = mkEngine(); e.feedUp(T0); e.setBooks([...S.booksOf("older-11"), S.FARM.family, "NEW-5M"]); const M = "SnowMint1111111111111111111pump", N = "OtherMint111111111111111111pump";
  const reg = (mint, symbol) => e.coin(mint, { createTs: T0 - 600, info: { symbol, decimals: 6, circ_supply: 1e9, origin: "pump.fun", token_program: SPL_TOKEN, risk: { status: "ok", fee_bps: 0, read_at: T0 } } });
  reg(M, "Snowball"); reg(N, "Sunball"); const open = (mint, family, t, out) => e.openDirect({ mint, family, t, mc: 21_000, px: 0.000021, token: { decimals: 6 } }, out);
  assert.deepEqual(e.setBan("snow ball"), { ok: true, key: "snowball", name: "snow ball", on: true, names: 1 });
  const o1 = {}; assert.equal(open(M, S.FARM.family, T0 + 1, o1), null); assert.match(o1.why, /you banned the name "snow ball"/); assert.equal(o1.banned, "snowball"); const o2 = {}; assert.equal(open(M, "NEW-5M", T0 + 2, o2), null);
  assert.equal(e.stats.banned, 2); assert.equal(e.entries.size, 0); const v = e.bans.view(); assert.equal(v.list[0].kept, 1); assert.deepEqual(v.hits[0].books, [S.FARM.family, "NEW-5M"]); assert.equal(v.hits[0].mint, M);
  const o3 = {}, other = open(N, S.FARM.family, T0 + 3, o3); assert.ok(other, "another name is bought as before: " + o3.why);
  assert.equal(e.setBan("Snowball", false).ok, true); assert.equal(e.setBan("Snowball", false).ok, false); const o4 = {}, later = open(M, S.FARM.family, T0 + 4, o4); assert.ok(later, "after the ban is off the coin can be bought: " + o4.why); assert.equal(later.token.symbol, "Snowball");
  assert.deepEqual(e.stats.bans, { added: 1, removed: 1, refused: 1 });
  // the page data: the list and what it kept out; a new-coin row carries the key of its name
  const j = booksApi([other, later], { stop: 0.25, sellable: true, bans: e.bans }); assert.equal(j.bans.list.length, 0); assert.equal(j.bans.hits.length, 1); assert.equal(booksApi([other], { stop: 0.25 }).bans, null);
  assert.equal(later.pop, S.NEW_POP);
});
test("the page: a ban button beside a new-coin buy, a banned names box with unban and a field to type a name; the request needs the site key", () => {
  for (const x of ["function BANB(t)", "banned · undo", "+how(t)+BANB(t)+'</td><td>'+DT(t.fill_t||t.t)", "+how(t)+BANB(t)+(t.man&&t.man.closed?", 'id="bans"', "Banned names</b>", 'id="banin"', 'id="banadd"', "fetch('/api/ban?'+q,{method:'POST'})", "what the bans kept out", "nothing is banned by itself", ">unban</button>"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
  const m = BOOKS_PAGE.match(/<script>([\s\S]*)<\/script>/); assert.ok(m); assert.doesNotThrow(() => new Function(m[1]), "the page script parses");
});
