// TWELFTH REVIEW (ChatGPT / Codex on older-10-review 2328675 and older-11-review bbe1115, 25 Nov 2026) — each finding
// reproduced on the production Engine, and the owner's decision of 25 Nov 11:30 UK (a buy that got no provider reading does
// not use up the book's one buy; it may buy on a fresh signal later).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { parseInfo as parseRaw, judge, num, athUsd } from "../src/gates.mjs";
const parseInfo = (info, supply = null, pump = true) => parseRaw(info, supply, pump); // the readings in these tests are of a verified pump.fun coin unless a test says otherwise
import * as S from "../src/spec.mjs";
import { Poller } from "../src/polled.mjs"; import { SPL_TOKEN } from "../src/risk.mjs";
const M = "MintAAApump", fams = (e) => [...e.entries.values()].flatMap((x) => x.families).sort(), tick = () => new Promise((r) => setImmediate(r));
const GOOD = { ath_price: 0.0004, total_supply: "1000000000", total_fee: "20", link: { twitter_username: "x" }, stat: { top_10_holder_rate: "0.22", top_bundler_trader_percentage: "0.1", top_rat_trader_percentage: "0.05", top70_sniper_hold_rate: "0.01" } };
// a 20-hour-old coin: ten quiet minutes at $100K, then $205K — the FAST books fire at T0 + 610
const quiet = (e, o = {}) => path(e, T0, T0 + 600, () => 100_000, 20, o);
// manual stream: nothing is assumed current — a measurement every 2 s keeps it so, with a trade every 20 s
const drive = (e, t0, t1, mc) => { for (let t = t0; t < t1; t += 2) { if ((t - t0) % 20 === 0) swap(e, t, mc, { lag: 1 }); else e.noteLag(t, 1); } };
const coin = (e, age = 20) => { e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - age * H }); return e; };

test("1 — a trailing high recovered at the end of a late spell is check-pointed (it used to stay unsaved unless something else changed)", () => {
  const e = coin(mkEngine({ stream: "manual" })); const L = { lag: 1 }; drive(e, T0, T0 + 610, 100_000); swap(e, T0 + 610, 205_000, L); swap(e, T0 + 612, 205_000, L); swap(e, T0 + 613, 205_000, L);
  for (let t = T0 + 614; t < T0 + 620; t += 2) e.noteLag(t, 1); const en = [...e.entries.values()][0]; assert.equal(en.status, "filled"); const v = en.versions.find((x) => x.policy === "trail" && x.stop === 0.6 && !x.stall), before = v.peak;
  swap(e, T0 + 620, 300_000, { lag: 12 }); assert.equal(v.peak, before, "the stream is 12 s behind: the state is installed but no peak moves");
  e.dirty.clear(); // everything known so far has been check-pointed
  for (let t = T0 + 621; t <= T0 + 627; t++) e.noteLag(t, 1); // six seconds of good measurements: the late spell ends and positions are valued on the state in force
  assert.ok(v.peak > before * 1.2, `the recovery raised the peak: ${before} → ${v.peak}`); assert.ok(e.dirty.has(en.id), "and the entry is marked for the next checkpoint");
});

test("2 — a transaction whose own delay is unknown creates no signal and no price history; the next measured transaction is judged on its own", () => {
  const e = coin(mkEngine({ stream: "manual" })); drive(e, T0, T0 + 599, 100_000); const obs = e.coins.get(M).series.lastT; assert.equal(obs, T0 + 580);
  const ev = (t, mc) => e.onSwap({ t, mint: M, pool: "PoolA", base: 2e8, quote: (mc / 1e11) * 2e8, feeBps: 30, sol: 1, isBuy: true, user: "u" });
  e.tx(T0 + 600, null, () => ev(T0 + 600, 205_000)); // the doubling arrives in a transaction with no block time, 2 s after a measured one
  assert.deepEqual(fams(e), [], "it does not borrow the freshness of the transaction before it"); assert.equal(e.stats.unmeasuredEvents, 1); assert.equal(e.coins.get(M).series.lastT, obs, "no price observation was recorded from it");
  assert.equal(Math.round(e.coins.get(M).state.quote), Math.round((205_000 / 1e11) * 2e8), "its pool state IS installed: the chain of reserves stays continuous");
  swap(e, T0 + 601, 205_000, { lag: 1 }); assert.ok(fams(e).includes("FAST-1M"), "a measured transaction at the same price is a signal on its own evidence"); assert.equal([...e.entries.values()][0].decisionT, T0 + 601);
});

test("3 — with the gates on, a coin observed by sampling is not entered at all: no ungated buy, no reader call (production Poller)", async () => {
  const SM = "MeteoraCoin1111111111111111111111111111111111";
  const run = async (gated) => { const w = { t: T0, px: new Map() }, tok = (mint) => ({ mint, decimals: 6, token_program: SPL_TOKEN, circ_supply: 1e9, mcap: (w.px.get(mint) || 0) * 1e9, launchpad: "meteora-dbc", first_pool: { id: "P", created: T0 - 9 * H }, mint_authority_disabled: true, freeze_authority_disabled: true, is_sus: false });
    const jup = { prices: async (mints) => { const m = new Map(); for (const x of mints) if (w.px.has(x)) m.set(x, { px: w.px.get(x), liqUsd: 60_000, decimals: 6 }); return { t: w.t, req: w.t, prices: m, omitted: [] }; },
      quote: async (mint, side, raw) => { const req = w.t; w.t += 0.3; const px = w.px.get(mint) / 100; return side === "buy" ? { ok: true, req, t: w.t, in: raw, out: ((raw / 1e9) * 0.99 / px) * 1e6, route: ["Meteora DLMM"], router: "metis", feeBps: 0 } : { ok: true, req, t: w.t, in: raw, out: (raw / 1e6) * px * 0.99 * 1e9, route: ["Meteora DLMM"], router: "metis" }; },
      recent: async () => [], category: async () => [], tokens: async (ms) => ms.map((m) => tok(m)) };
    const e = mkEngine(); let asked = 0; if (gated) { e.setBooks(S.booksOf("older-11")); e.gates = S.GATES_11; e.readGate = async () => { asked++; return GOOD; }; }
    const poll = new Poller({ engine: e, jup, now: () => w.t }), step = async (dt, mc) => { w.t += dt; w.px.set(SM, mc / 1e9); await poll.sweep(); e.tick(w.t); await poll.quotes(); e.tick(w.t); };
    w.px.set(SM, 100_000 / 1e9); poll.add(tok(SM), "test inventory"); for (let i = 0; i < 31; i++) await step(10, 100_000); await step(10, 205_000); // the sampled double
    return { e, asked, all: [...e.entries.values()] }; };
  const plain = await run(false); assert.ok(plain.all.length, "control produced no entry: " + JSON.stringify(plain.e.stats).slice(0, 700)); assert.ok(plain.all.some((x) => x.families.includes("FAST-5M") && x.exec === "routed-quote"), "control — without the gates the sampled method buys");
  const g = await run(true); assert.equal(g.all.length, 0, "with the gates on it does not: no entry, so nothing can fill ungated"); assert.ok(g.e.stats.sampledNotGated >= 1); assert.equal(g.asked, 0);
});

test("4 — a pending gated buy restored after a restart is cancelled cleanly (no crash) and can never fill without a passing verdict", async () => {
  const f = join(mkdtempSync(join(tmpdir(), "older12-")), "r.db"), st = new Store(f), a = coin(mkEngine({ store: st })); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, info: {} });
  a.gates = S.GATES_11; a.clock = () => T0 + 610.1; a.readGate = () => new Promise(() => {}); // the answer never comes before the process stops
  quiet(a); swap(a, T0 + 610, 205_000); const id = [...a.entries.values()][0].id; assert.equal(a.entries.get(id).status, "pending"); a.flush(); st.db.close();
  const st2 = new Store(f), b = mkEngine({ store: st2 }); st2.restore(b); b.gates = S.GATES_11; b.readGate = async () => GOOD; b.feedUp(T0 + 611); const en = b.entries.get(id); assert.ok(en && en.gate && !en.gate.verdict, "restored with its request on record and no answer");
  assert.equal(b.stats.gate, undefined, "this process has asked for no reading itself");
  assert.doesNotThrow(() => swap(b, T0 + 612, 205_000)); swap(b, T0 + 613, 205_000); swap(b, T0 + 614, 205_000);
  assert.equal(en.status, "cancelled"); assert.equal(en.gate.verdict, "no reading"); assert.equal(b.stats.gate.no_reading, 1); assert.ok(en.flags.some((x) => /no provider reading had arrived/.test(x)));
  // fail closed: a verdict other than "pass" already on a pending entry (an interrupted call, a restart) can only cancel it
  const c = coin(mkEngine()); c.gates = S.GATES_11; c.readGate = () => new Promise(() => {}); quiet(c); swap(c, T0 + 610, 205_000); const p = [...c.entries.values()][0]; p.gate.verdict = "no reading";
  swap(c, T0 + 612, 205_000); swap(c, T0 + 613, 205_000); assert.equal(p.status, "cancelled", "the old code returned 'permission' for any verdict that was already set");
  st2.db.close();
});

test("5 — the all-time-high market cap needs supply evidence: price × a billion is not assumed; a minted or unknown supply is 'unknown', which fails the $100K gate", () => {
  assert.equal(Math.round(athUsd(0.00011, 1e6, null, true).usd), 110, "a one-million-token coin at $0.00011 was worth $110, not $110,000");
  assert.equal(judge(parseInfo({ ...GOOD, ath_price: 0.00011, total_supply: "1000000" }), S.GATES_11, "FAST-1M").pass, false);
  assert.equal(Math.round(parseInfo(GOOD, 950_000_000).ath_usd), 380_000, "the chain's supply (950M after burns) is used before the provider's figure: a lower bound"); assert.match(parseInfo(GOOD, 950_000_000).ath_basis, /chain/);
  const none = parseInfo({ ...GOOD, total_supply: undefined }); assert.equal(none.ath_usd, null); assert.deepEqual(judge(none, S.GATES_11, "FAST-1M").missing, ["all-time high"]);
  const minted = parseInfo({ ...GOOD, total_supply: "5000000000" }); assert.equal(minted.ath_usd, null); assert.match(minted.ath_basis, /minted/);
  assert.equal(judge(none, S.GATES_11, "RUG450").missing.includes("all-time high"), false, "the rug books do not ask for it");
});

test("a reading that arrives after the time of the buy is labelled late even when it arrives before the verdict; a malformed figure is unknown, never zero", async () => {
  const e = coin(mkEngine()); e.gates = S.GATES_11; let now = T0; e.clock = () => now; let give; e.readGate = () => new Promise((r) => { give = r; });
  quiet(e); swap(e, T0 + 610, 205_000); const en = [...e.entries.values()][0]; now = en.schedT + 0.3; give(GOOD); await tick(); // 0.3 s after the buy time, before any other event
  swap(e, T0 + 613, 205_000); assert.equal(en.status, "cancelled"); assert.equal(en.gate.verdict, "no reading"); assert.equal(en.gate.late, true); assert.equal(e.stats.gate.late, 1); assert.ok(en.gate.reading, "what it said is kept");
  for (const bad of [[], [5], {}, true, false, "abc", "0x10", " ", NaN, Infinity]) assert.equal(num(bad), null, JSON.stringify(bad) + " is not a figure"); assert.equal(num("0.05"), 0.05); assert.equal(num(0), 0); assert.equal(num("1e-3"), 0.001);
  const r = parseInfo({ ...GOOD, stat: { ...GOOD.stat, top70_sniper_hold_rate: [] } }); assert.equal(r.snipers, null); assert.deepEqual(judge(r, S.GATES_11, "FAST-1M").missing, ["snipers"], "an empty list used to read as 0% snipers and pass");
});

test("owner 25 Nov: a buy that got NO READING does not use up the book's one buy — the book buys on a fresh signal later; a coin that FAILED the gates stays used up", async () => {
  const mk = () => { const e = coin(mkEngine()); e.rebuy = false; e.setBooks(["FAST-1M"]); e.gates = S.GATES_11; let now = T0; e.clock = () => now; e.next = null; e.readGate = async () => { if (e.next instanceof Error) throw e.next; return e.next; }; e.at = async (t) => { now = t; await tick(); }; return e; };
  const cycle = async (e, t, answer) => { e.next = answer; swap(e, t, 205_000); const en = [...e.entries.values()].at(-1); await e.at(t + 0.2); swap(e, t + 2, 205_000); swap(e, t + 3, 205_000); return en; };
  // (a) refused by the provider → cancelled, attempt given back
  const e = mk(); quiet(e); const first = await cycle(e, T0 + 610, new Error("GMGN rate limited")); assert.equal(first.status, "cancelled"); assert.equal(first.gate.verdict, "no reading"); assert.equal(first.attempt_returned, true);
  assert.equal(e.stats.gate.attempts_returned, 1); assert.ok(first.flags.some((x) => /may buy on a fresh signal later/.test(x))); assert.ok(!e.coins.get(M).groups.A2.done["FAST-1M"], "the book's mark for this coin is taken back");
  // the price falls back and doubles again an hour later: a FRESH signal → bought, as a first buy
  path(e, T0 + 700, T0 + 4300, () => 100_000, 20); const second = await cycle(e, T0 + 4310, GOOD); assert.notEqual(second.id, first.id); assert.equal(second.status, "filled"); assert.equal(second.again, undefined); assert.ok(second.families.includes("FAST-1M"));
  // (b) the coin FAILED the gates → that book's one buy is used: the same fresh signal later buys nothing
  const f = mk(); quiet(f); const bad = await cycle(f, T0 + 610, { ...GOOD, stat: { ...GOOD.stat, top_10_holder_rate: "0.5" } }); assert.equal(bad.status, "cancelled"); assert.equal(bad.gate.verdict, "fail"); assert.equal(bad.attempt_returned, undefined);
  path(f, T0 + 700, T0 + 4300, () => 100_000, 20); const n = f.stats.entries; await cycle(f, T0 + 4310, GOOD); assert.equal(f.stats.entries, n, "no second attempt after a genuine fail");
});

test("fresh means fresh: a rule that stays true from trade to trade (5-minute volume) does not re-ask on every trade after a refusal — only once it has stopped firing and fires again", async () => {
  const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.rebuy = false; e.setBooks(["VOL300K"]); e.gates = S.GATES_11; let now = T0, asked = 0, ans = new Error("GMGN rate limited"); e.clock = () => now; e.readGate = async () => { asked++; if (ans instanceof Error) throw ans; return ans; };
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 800 }); // $320K in 90 s → VOL300K fires
  assert.equal(asked, 1); now = T0 + 690.2; await tick(); const en = [...e.entries.values()][0];
  for (let k = 0; k < 20; k++) swap(e, T0 + 700 + k * 5, 100_000, { sol: 50 }); // the 5-minute volume stays above $300K on every one of these trades
  assert.equal(en.status, "cancelled"); assert.equal(en.attempt_returned, true); assert.equal(asked, 1, "no new request while the same volume burst is still in the window"); assert.ok(e.stats.gate.held >= 1);
  path(e, T0 + 1200, T0 + 1800, () => 100_000, 60, { sol: 1 }); ans = GOOD; // the burst has left the 5-minute window: the rule stops firing → the hold is released
  for (let k = 0; k < 4; k++) swap(e, T0 + 1800 + k * 30, 100_000, { sol: 800 }); assert.equal(asked, 2, "a new burst is a new signal"); now = T0 + 1890.2; await tick(); swap(e, T0 + 1895, 100_000, { sol: 1 }); swap(e, T0 + 1897, 100_000, { sol: 1 });
  const again = [...e.entries.values()].at(-1); assert.equal(again.status, "filled"); assert.deepEqual(again.families, ["VOL300K"]);
});

test("the returned attempt survives a restart: the cancelled entry's one-buy marks are not put back from the database", async () => {
  const f = join(mkdtempSync(join(tmpdir(), "older12-")), "g.db"), st = new Store(f), a = coin(mkEngine({ store: st })); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, info: {} }); a.gates = S.GATES_11; a.clock = () => T0 + 610.2; a.readGate = async () => { throw new Error("GMGN rate limited"); };
  quiet(a); swap(a, T0 + 610, 205_000); await tick(); swap(a, T0 + 612, 205_000); swap(a, T0 + 613, 205_000); a.flush();
  assert.equal(st.db.prepare("SELECT COUNT(*) n FROM decisions WHERE family LIKE 'FAST-%'").get().n, 0, "the marks left the database with the cancellation"); assert.equal(st.allEntries()[0].attempt_returned, true); st.db.close();
  const st2 = new Store(f), b = mkEngine({ store: st2 }); st2.restore(b); assert.ok(!b.coins.get(M).groups?.A2?.done?.["FAST-1M"], "and the restart's reconciliation does not write them back"); st2.db.close();
});
