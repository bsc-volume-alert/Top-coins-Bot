// older-9 (22 Nov 2026, owner's decision): BUYING AGAIN. A book that has bought a coin may buy it again when its rule fires and
// it no longer holds the coin — judged separately on each stop and exit. No waiting time. First buys are exactly the older-8 buys.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { booksApi } from "../src/page.mjs"; import { bookRows } from "../src/report.mjs";
import { Poller } from "../src/polled.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", all = (e) => e._all, of = (e, f) => all(e).filter((x) => x.families.includes(f)), firsts = (e, f) => of(e, f).filter((x) => !x.again?.[f]), agains = (e, f) => of(e, f).filter((x) => x.again?.[f]);
const eng = (o = {}) => { const e = mkEngine(o); e._all = []; const add = e.addEntry.bind(e); e.addEntry = (x) => { e._all.push(x); add(x); }; e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - (o.age ?? 20 * H) }); return e; };
const rows = (x) => x.versions.filter((v) => v.stall === false).map((v) => (v.policy === "trail" ? "t" : "h") + Math.round(v.stop * 100)).join(" ");
// five hours watched with a $60K low, then a fresh double: the standard LOW4H buy (shared by other books that fire with it)
const base = (e) => { path(e, T0, T0 + 2 * H, () => 100_000, 60); path(e, T0 + 2 * H, T0 + 5 * H, () => 60_000, 60); swap(e, T0 + 5 * H, 110_000); swap(e, T0 + 5 * H + 2, 125_000); };

test("while a book holds the coin on every row it does not buy again; once a row has sold, the next signal is a re-buy carrying exactly the free rows", () => {
  const e = eng(); base(e); assert.equal(firsts(e, "LOW4H").length, 1); const f = firsts(e, "LOW4H")[0]; e.tick(T0 + 5 * H + 4);
  swap(e, T0 + 5 * H + 10, 118_000); swap(e, T0 + 5 * H + 12, 126_000); assert.equal(agains(e, "LOW4H").length, 0, "nothing sold yet: a second crossing changes nothing");
  path(e, T0 + 5 * H + 20, T0 + 5 * H + 200, () => 80_000, 10);           // −36% from the high: the 20, 25 and 30% stops sell; 40% and 60% still hold
  assert.deepEqual(f.versions.filter((v) => v.stall === false && v.status === "closed").map((v) => v.stop).sort(), [0.2, 0.2, 0.25, 0.25, 0.3, 0.3]);
  swap(e, T0 + 5 * H + 210, 110_000); swap(e, T0 + 5 * H + 212, 125_000);   // LOW4H's rule fires again: 2 × the $60K low, freshly crossed
  const r = agains(e, "LOW4H"); assert.equal(r.length, 1, "one re-buy"); assert.equal(rows(r[0]), "t20 t25 t30 h20 h25 h30", "on the rows that had sold — the 40% and 60% rows are still in the first buy");
  assert.equal(r[0].again.LOW4H, true); assert.ok(r[0].id !== f.id && r[0].decisionT > f.decisionT); assert.equal(firsts(e, "LOW4H").length, 1, "the first buy is untouched");
  e.tick(T0 + 5 * H + 214); assert.equal(r[0].status, "filled"); assert.ok(r[0].fill.t > f.fill.t, "a re-buy is a real new buy at its own time and price");
});

test("the page and the full table: a stop that sold shows the first buy and the re-buy; a stop still holding shows only the first; 'first only' and the 1,240 rows are the older-8 figures", () => {
  const e = eng(); base(e); e.tick(T0 + 5 * H + 4); path(e, T0 + 5 * H + 20, T0 + 5 * H + 200, () => 80_000, 10); swap(e, T0 + 5 * H + 210, 110_000); swap(e, T0 + 5 * H + 212, 125_000); e.tick(T0 + 5 * H + 214);
  path(e, T0 + 5 * H + 220, T0 + 5 * H + 400, () => 85_000, 10);            // the re-buy's 20–30% stops sell too
  const at = (stop, first = false) => booksApi(all(e), { stop, policy: "trail", first }).books.LOW4H;
  assert.equal(at(0.2).length, 2); assert.deepEqual(at(0.2).map((t) => t.again), [false, true]); assert.equal(at(0.6).length, 1, "the 60% row never sold: one buy"); assert.equal(at(0.2, true).length, 1, "first only");
  const row = bookRows(all(e)).find((r) => r.family === "LOW4H" && r.ag === firsts(e, "LOW4H")[0].ag && r.stop === 0.2 && r.policy === "trail");
  assert.equal(row.closed, 1, "the comparison row counts the first buy only"); assert.equal(row.rebuys_closed, 1, "the re-buy is beside it"); assert.ok(Math.abs(row.net_sol + row.rebuys_net_sol - at(0.2).reduce((s, t) => s + t.net, 0)) < 2e-4, "and the page total = first buys + re-buys");
});

test("no waiting time: a volume book stopped out during heavy trading buys again at the next trade, and again — every one marked", () => {
  const e = eng({ age: 2 * H }); path(e, T0, T0 + 600, () => 300_000, 20, { sol: 300 });                  // $30K of volume per trade: the 5-minute volume is over $300K
  assert.equal(firsts(e, "VOL300K").length, 1); let t = T0 + 600, mc = 300_000;
  for (let k = 0; k < 40; k++) { t += 5; mc *= 0.93; swap(e, t, mc, { sol: 300 }); e.tick(t + 2); }       // a slide of 7% per trade, still on huge volume
  const r = agains(e, "VOL300K"); assert.ok(r.length >= 3, `re-bought ${r.length} times on the way down`); assert.ok(r.every((x) => x.again.VOL300K)); assert.equal(firsts(e, "VOL300K").length, 1);
  const t20 = booksApi(all(e), { stop: 0.2, policy: "trail" }).books.VOL300K.filter((x) => x.status === "closed"); assert.ok(t20.length >= 3 && t20.every((x) => x.ret < 0), "each of them a loss here: what 'no wait' costs in a crash is visible, not hidden");
  assert.ok(r.every((x, i) => i === 0 || x.decisionT > r[i - 1].decisionT));
});

test("the safety limit: no more than REBUY_MAX_PER_DAY re-buys of one coin by one book in 24 hours, recorded when it bites; an older re-buy ages out", () => {
  const e = eng(); base(e); e.tick(T0 + 5 * H + 4); path(e, T0 + 5 * H + 20, T0 + 5 * H + 200, () => 80_000, 10); const c = e.coins.get(M);
  c.rebuys = { LOW4H: Array.from({ length: S.REBUY_MAX_PER_DAY }, (_, k) => T0 + 5 * H + k) };            // as if this book had already re-bought it 50 times today
  swap(e, T0 + 5 * H + 210, 110_000); swap(e, T0 + 5 * H + 212, 125_000); assert.equal(agains(e, "LOW4H").length, 0); assert.equal(e.stats.rebuyCapped, 1);
  path(e, T0 + 5 * H + 220, T0 + 5 * H + 400, () => 80_000, 10); c.rebuys.LOW4H = c.rebuys.LOW4H.map(() => T0 - 20 * H); // …more than 24 hours ago
  swap(e, T0 + 5 * H + 410, 110_000); swap(e, T0 + 5 * H + 412, 125_000); assert.equal(agains(e, "LOW4H").length, 1);
});

test("a clock book on its own: CONT-STALL sold at 60 minutes while CONT still holds — the next CONT signal is a CONT-STALL re-buy on its own rows, and no CONT buy", () => {
  const e = eng(); path(e, T0, T0 + 2 * H, () => 100_000, 60); swap(e, T0 + 2 * H, 131_000);              // +31% on 15 minutes ago, at the hour's high: CONT + CONT-STALL
  assert.equal(firsts(e, "CONT").length, 1); const f = firsts(e, "CONT")[0]; assert.ok(f.families.includes("CONT-STALL"));
  path(e, T0 + 2 * H + 10, T0 + 3 * H + 30, () => 128_000, 30);            // an hour sideways, never 1.15×: the stall rows are sold by the clock, the plain rows are all still open
  assert.ok(f.versions.filter((v) => v.stall === true).every((v) => v.status === "closed")); assert.ok(f.versions.filter((v) => v.stall === false).every((v) => v.status !== "closed"));
  path(e, T0 + 3 * H + 40, T0 + 3 * H + 1000, () => 128_000, 30); swap(e, T0 + 3 * H + 1010, 170_000);   // CONT's condition again
  const r = agains(e, "CONT-STALL"); assert.equal(r.length, 1); assert.deepEqual(r[0].families, ["CONT-STALL"]); assert.ok(r[0].versions.length === 10 && r[0].versions.every((v) => v.stall === true), "only the stall rows"); assert.equal(agains(e, "CONT").length, 0, "CONT holds every row: no CONT buy");
});

test("the sampled method buys again too (a non-pump.fun coin priced by quotes)", async () => {
  const w = { t: T0, px: new Map(), quoteDelay: 0.3 }, P = "MeteoraCoin1111111111111111111111111111111111";
  w.jup = { prices: async (ms) => { const m = new Map(); for (const x of ms) if (w.px.has(x)) m.set(x, { px: w.px.get(x), liqUsd: 6e4, decimals: 6 }); return { t: w.t, req: w.t, prices: m, omitted: [] }; },
    quote: async (mint, side, raw) => { const req = w.t; w.t += w.quoteDelay; const px = w.px.get(mint) / 100; return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["X"], router: "m", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["X"], router: "m" }; }, recent: async () => [], category: async () => [], tokens: async () => [] };
  const e = mkEngine(); e._all = []; const add = e.addEntry.bind(e); e.addEntry = (x) => { e._all.push(x); add(x); }; const po = new Poller({ engine: e, jup: w.jup, now: () => w.t });
  const step = async (dt, mc) => { w.t += dt; w.px.set(P, mc / 1e9); await po.sweep(); e.tick(w.t); await po.quotes(); e.tick(w.t); };
  w.px.set(P, 1e-4); po.add({ mint: P, decimals: 6, token_program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", circ_supply: 1e9, mcap: 1e5, launchpad: "raydium-launchlab", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false }, "t");
  for (let i = 0; i < 31; i++) await step(10, 100_000); await step(10, 205_000); await step(2, 205_000); assert.equal(firsts(e, "FAST-5M").length, 1); assert.equal(firsts(e, "FAST-5M")[0].status, "filled");
  for (let i = 0; i < 40; i++) await step(10, 60_000);                       // −70%: every stop sells; five quiet minutes
  await step(10, 125_000); await step(2, 125_000);                           // doubles again inside 5 minutes
  const r = agains(e, "FAST-5M"); assert.equal(r.length, 1); assert.equal(r[0].exec, "routed-quote"); assert.equal(r[0].status, "filled"); assert.equal(rows(r[0]), "t20 t25 t30 t40 t60 h20 h25 h30 h40 h60", "everything had sold: the re-buy carries every row");
});

test("first buys are the older-8 buys: on random markets, the first buys with buying-again switched on are identical to those with it switched off", () => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let run = 0; run < 3; run++) {
    const trades = []; let t = T0, mc = 60_000 + rnd() * 200_000, drift = 0;
    for (let k = 0; k < 6000; k++) { t += 5 + rnd() * 40; if (rnd() < 0.01) drift = (rnd() - 0.45) * 0.08; if (rnd() < 0.003) mc *= 0.35 + rnd() * 0.3; mc = Math.max(8_000, Math.min(4_000_000, mc * (1 + drift + (rnd() - 0.5) * 0.06))); trades.push([t, mc, rnd() < 0.05 ? 200 + rnd() * 400 : 0.5 + rnd() * 5, rnd() < 0.55]); }
    const play = (rebuy) => { const e = eng({ age: 5 * H }); e.rebuy = rebuy; for (const [tt, m, sol, isBuy] of trades) { swap(e, tt, m, { sol, isBuy, user: "u" + (Math.floor(tt) % 37) }); e.tick(tt + 1.5); } return e; };
    const on = play(true), off = play(false), key = (e) => all(e).flatMap((x) => x.families.filter((f) => !x.again?.[f]).map((f) => `${f}|${x.ag}|${x.decisionT.toFixed(3)}`)).sort();
    assert.deepEqual(key(on), key(off), `run ${run}: same first buys`); assert.equal(all(off).filter((x) => x.again).length, 0, "switched off: no re-buy at all");
    if (run === 0) assert.ok(all(on).some((x) => x.again), "and the market was lively enough to produce re-buys");
    for (const x of all(on)) for (const f of x.families) { const tag = S.clockTag(f); assert.ok(x.versions.some((v) => v.stall === tag), `entry ${x.id}: ${f} has rows`); }
    // no book ever holds the same row twice at once (except a first buy in a NEW age group over a still-open earlier one — older-8 allowed that and still does)
    const byFam = new Map(); for (const x of all(on)) for (const f of x.families) (byFam.get(f) || byFam.set(f, []).get(f)).push(x);
    for (const [f, list] of byFam) for (const x of list) { if (!x.again?.[f] || !x.fill) continue; const tag = S.clockTag(f); for (const v of x.versions.filter((v) => v.stall === tag)) for (const y of list) { if (y === x || !y.fill || y.decisionT > x.decisionT) continue; const u = y.versions.find((z) => z.stall === tag && z.policy === v.policy && z.stop === v.stop); if (!u) continue; assert.ok(u.exit && u.exit.t <= x.decisionT + 1e-6, `${f} re-bought row ${v.policy}|${v.stop} at ${x.decisionT} while entry ${y.id} still held it`); } }
  }
});
