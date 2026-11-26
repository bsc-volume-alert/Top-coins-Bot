// older-11 — STARTING THE RUN: the site shows only the run's books, the 8-hour books can start at 6 hours, a new run gets a
// new database prepared from the previous one (identities only, nothing deleted, no buys carried), the previous run's price
// memory is carried in without its decisions, and the start script fixes a run's settings at its first start.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, writeFileSync, readFileSync, mkdirSync, chmodSync, statSync } from "node:fs"; import { tmpdir } from "node:os"; import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
import { mkEngine, swap, path, H, T0 } from "./helpers.mjs";
import { Store } from "../src/store.mjs";
import { booksApi } from "../src/page.mjs";
import { bookRows } from "../src/report.mjs";
import { saveWarm, loadWarm } from "../src/warm.mjs";
import { seed } from "../scripts/seed-db.mjs";
import * as S from "../src/spec.mjs";
const M = "MintAAApump", dir = () => mkdtempSync(join(tmpdir(), "older11-")), HERE = dirname(fileURLToPath(import.meta.url));
const fams = (e) => [...e.entries.values()].flatMap((x) => x.families).sort();
// a coin `ageH` hours old: ten quiet minutes at $100K, then a double inside one minute (FAST-1M / 3M / 5M fire), then the fill
const doubled = (ageH, set = () => {}) => { const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - ageH * H }); set(e); path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); swap(e, T0 + 612, 205_000); swap(e, T0 + 615, 205_000); return e; };

test("the site of a run that chose its books shows ONLY those books; FEE-COINS only when it holds a buy; without a run everything is as before", () => {
  const e = doubled(20), all = [...e.entries.values()]; assert.ok(fams(e).includes("FAST-1M"), "the legacy run bought: " + fams(e));
  const old = booksApi(all, { stop: 0.25 }); assert.equal(old.order.length, S.FAMILIES.length + 1); assert.equal(old.order.at(-1), S.FEE_BOOK); assert.equal(old.run, null); assert.equal(old.rows_total, 1380); assert.match(old.rules.VOL100K, /buys only in a run/);
  const run = { name: "older11", books: S.booksOf("older-11"), gates: true, rebuy: false, min_age_h: 6, sampled: false }, j = booksApi(all, { stop: 0.25, run });
  assert.deepEqual(j.order, S.BOOKS_11, "the run's 13 books, nothing else — no empty FEE-COINS card"); assert.deepEqual(Object.keys(j.books).sort(), [...S.BOOKS_11].sort());
  assert.ok(j.books["FAST-1M"].length >= 1); assert.equal(j.books["FAST-10M"], undefined, "a book outside the run is not on the page even though the legacy engine bought for it");
  assert.deepEqual(j.run, { name: "older11", books: S.BOOKS_11, gates: true, gate_mode: "cancel", checks: "all", rebuy: false, min_age_h: 6, sampled: false, newcoins: false }); assert.doesNotMatch(j.rules.VOL100K + j.rules.DIP15K, /buys only in a run/);
  assert.equal(j.rows_total, (7 * 4 + 6 * 5) * 5 * 2, "7 books in 4 age groups + 6 any-age books in 5, × 5 stops × 2 exits");
  const fee = JSON.parse(JSON.stringify(all[0])); fee.token.xfer_bps = 300; const jf = booksApi([fee], { stop: 0.25, run }); assert.equal(jf.order.at(-1), S.FEE_BOOK, "a fee-coin buy is never dropped from the page: its book appears when it has one"); assert.equal(jf.books[S.FEE_BOOK].length, 1);
});

test("the provider reading a buy was judged on is on its row of the page", () => {
  const e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); e.setBooks(S.booksOf("older-11")); e.gates = S.GATES_11; e.clock = () => T0 + 610.2;
  e.readGate = async () => ({ stat: { top_10_holder_rate: 0.22, top_bundler_trader_percentage: 0.06, top_rat_trader_percentage: 0.03, top70_sniper_hold_rate: 0.02 }, total_fee: 64.5, link: { twitter_username: "x" }, ath_price: 0.0005, total_supply: 1e9, holder_count: 1234 });
  path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); const en = [...e.entries.values()][0]; assert.ok(en && en.status === "pending", "the signal opened a pending buy");
  return new Promise((res) => setImmediate(() => { swap(e, T0 + 612, 205_000); swap(e, T0 + 615, 205_000); // the reading arrived 0.2 s after the signal; the buy is 1 s after it
    assert.equal(en.status, "filled", en.flags.join("; ")); assert.equal(en.gate.verdict, "pass");
    const r = booksApi([en], { stop: 0.25, run: { books: S.booksOf("older-11"), gates: true } }).books["FAST-1M"][0];
    assert.deepEqual(r.gate, { v: "pass", ms: 200, late: undefined, top10: 0.22, bund: 0.06, ins: 0.03, snip: 0.02, fees: 64.5, tw: true, ath: 500_000, holders: 1234, phish: null, bot: null, fresh: null, opt: { bundlers_main: false, bundlers_second: true, insiders_main: true, insiders_second: true } });
    res(); }));
});

test("the 8-hour books from 6 hours: off by default (a 7-hour-old coin is not bought), on with the run's setting — in age group A0, never under the run's own age, and the table keeps the buy", () => {
  assert.deepEqual(fams(doubled(7)), [], "default: nothing under 8 hours for the FAST books");
  const on = (x) => { x.minAgeS = S.MIN_AGE_11_S; }, e = doubled(7, on), en = [...e.entries.values()];
  assert.ok(fams(e).includes("FAST-1M") && fams(e).includes("FAST-5M"), "bought at 7 hours: " + fams(e)); assert.ok(en.every((x) => x.ag === "A0")); assert.ok(e.stats.evalsEarly > 0);
  assert.ok(!fams(e).includes("AGE-DOUBLE"), "AGE-DOUBLE needs an age-group start and has none under 8 hours");
  assert.deepEqual(fams(doubled(5, on)), [], "5 hours old is under the run's 6 hours");
  assert.deepEqual(fams(doubled(20, on)), fams(doubled(20)), "a coin over 8 hours old is decided exactly as without the setting");
  swap(e, T0 + 700, 80_000); swap(e, T0 + 702, 80_000); swap(e, T0 + 704, 80_000); // −60%: every stop up to 40% sells
  const rows = bookRows(en), r = rows.find((x) => x.family === "FAST-1M" && x.ag === "A0" && x.stop === 0.25 && x.policy === "trail");
  assert.ok(r && r.filled === 1 && r.closed === 1, "the under-8-hour buy has its own row"); assert.equal(bookRows([]).length, 1380, "and no row is added when there is no such buy");
});

test("a new run's database is prepared from the previous one: coin identities and pools only — no buys, decisions or bars — and the previous database is not changed", () => {
  const d = dir(), A = join(d, "older-a.db"), B = join(d, "older-b.db"), st = new Store(A), e = mkEngine({ store: st }); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 20 * H });
  st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, createSrc: "gmgn", info: { monitoring_mode: "live", token_program: "T" } }); st.saveCoin("Sampled1", { createTs: T0 - 30 * H, info: { monitoring_mode: "polled" } }); st.savePool("PoolA", { mint: M, quote: "SOL", creator: "c" });
  st.db.prepare("INSERT OR REPLACE INTO meta VALUES ('inventory', ?)").run(JSON.stringify({ at: "2026-11-24T20:19:00Z" })); st.firstStart(T0); st.heartbeat(T0 + 900);
  path(e, T0, T0 + 600, () => 100_000, 20); swap(e, T0 + 610, 205_000); swap(e, T0 + 612, 205_000); e.prune(T0 + 700); e.flush();
  const n = (db, t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n, before = ["coins", "pools", "entries", "decisions", "bars"].map((t) => n(st.db, t)); assert.ok(before[2] >= 1 && before[3] >= 1, "the previous run has buys and one-buy marks: " + before); st.db.close();
  const r = seed(A, B, { liveOnly: true }); assert.deepEqual({ seeded: r.seeded, coins: r.coins, skipped: r.skipped_sampled, pools: r.pools, entries: r.entries, decisions: r.decisions, bars: r.bars }, { seeded: true, coins: 1, skipped: 1, pools: 1, entries: 0, decisions: 0, bars: 0 });
  const nb = new Store(B), c = nb.db.prepare("SELECT * FROM coins WHERE mint=?").get(M); assert.equal(c.create_ts, T0 - 20 * H); assert.equal(c.pool, "PoolA"); assert.equal(c.create_src, "gmgn"); assert.equal(JSON.parse(c.info).token_program, "T"); assert.equal(c.last_px, null);
  assert.equal(nb.lastAlive(), null, "the new database has never been alive"); assert.equal(nb.db.prepare("SELECT v FROM meta WHERE k='first_start'").get(), undefined, "its first start is its own"); assert.ok(nb.db.prepare("SELECT v FROM meta WHERE k='inventory'").get(), "the daily pool inventory is not run again at once");
  const e2 = mkEngine({ store: nb }); nb.restore(e2); assert.equal(e2.coins.get(M).createTs, T0 - 20 * H, "the age is known without asking a provider"); assert.equal(e2.entries.size, 0); assert.deepEqual(e2.coins.get(M).groups ?? {}, {}, "no one-buy mark came across"); nb.db.close();
  assert.equal(seed(A, B).seeded, false, "repeating it leaves the new database alone");
  const again = new Store(A); assert.deepEqual(["coins", "pools", "entries", "decisions", "bars"].map((t) => n(again.db, t)), before, "the previous database is exactly as it was"); again.db.close();
  assert.throws(() => seed(join(d, "nope.db"), join(d, "c.db")), /not found/); assert.throws(() => seed(A, A), /different file/);
});

test("price memory carried into a new run: what was observed comes across, what the previous run decided does not — the new run's first buy of the coin is a first buy", () => {
  const d = dir(), stop = T0 + 5 * H, st = new Store(join(d, "older-a.db")), a = mkEngine({ store: st }); a.feedUp(T0); a.coin(M, { pool: "PoolA", createTs: T0 - 20 * H }); st.saveCoin(M, { pool: "PoolA", createTs: T0 - 20 * H, info: {} });
  path(a, T0, T0 + 2 * H, () => 100_000, 60); path(a, T0 + 2 * H, stop - 600, () => 60_000, 60); swap(a, stop - 590, 125_000); swap(a, stop - 585, 125_000); swap(a, stop - 580, 125_000); // LOW4H bought in the previous run (2× the $60K low)
  assert.ok(fams(a).includes("LOW4H"), "previous run: " + fams(a)); path(a, stop - 500, stop, () => 60_000, 60); a.flush(); st.heartbeat(stop);
  const W = join(d, "older-a.db.warm"); saveWarm(W, a, stop); writeFileSync(W + ".copy", readFileSync(W)); st.db.close();
  const start = (fresh) => { const B = join(d, `older-b${fresh ? 1 : 0}.db`); seed(join(d, "older-a.db"), B); const nb = new Store(B), b = mkEngine({ store: nb }); b.rebuy = false; /* the older-11 run: buying again is off */ nb.restore(b); writeFileSync(W, readFileSync(W + ".copy"));
    const r = loadWarm(W, b, stop + 5, { fresh }); assert.ok(r.loaded && r.coins === 1, JSON.stringify(r)); b.restartGap(nb.lastAlive(), stop + 5, { warm: r.loaded }); b.feedUp(stop + 10);
    swap(b, stop + 20, 60_000); swap(b, stop + 40, 125_000); swap(b, stop + 42, 125_000); swap(b, stop + 45, 125_000); return b; };
  const kept = start(false); assert.ok(!fams(kept).includes("LOW4H"), "with the previous run's marks the book would count the coin as already bought");
  const fresh = start(true), en = [...fresh.entries.values()].find((x) => x.families.includes("LOW4H")); assert.ok(en, "carried as a new run: LOW4H buys — the 4-hour low was known from the first minute"); assert.equal(en.again, undefined, "and it is a first buy");
  assert.ok(en.warm_gap_s > 0, "the seconds between the two runs that were not watched are recorded on it"); assert.equal(fresh.stats.warm.carried_from_another_run, true);
});

test("start script: a run's settings are fixed at its first start, an unknown or changed rule set is refused before anything is stopped, and the older-11 settings reach the bot", () => {
  const d = dir(), out = join(d, "out"), bin = join(d, "bin"), logf = join(d, "pm2.log"); mkdirSync(out); mkdirSync(bin);
  writeFileSync(join(bin, "pm2"), `#!/usr/bin/env bash\nif [ "$1" = start ] && [ "$2" = src/main.mjs ]; then echo "START books=$OLDER_BOOKS gates=$OLDER_GATES rebuy=$OLDER_REBUY minage=$OLDER_MIN_AGE_H wide=$OLDER_SOLANA_WIDE db=$(basename "$OLDER_DB") run=$OLDER_RUN_NAME warm=$(basename "$OLDER_WARM_FROM" 2>/dev/null)" >> "${logf}"; touch "$OLDER_DB"; else echo "$1 $2" >> "${logf}"; fi\n`); chmodSync(join(bin, "pm2"), 0o755);
  const run = (...a) => spawnSync("bash", [join(HERE, "../scripts/start.sh"), ...a], { env: { ...process.env, PATH: bin + ":" + process.env.PATH, OLDER_OUT: out }, encoding: "utf8" }), log = () => (existsSync(logf) ? readFileSync(logf, "utf8") : "");
  let r = run("x", "", "older-99"); assert.equal(r.status, 1); assert.match(r.stdout, /unknown settings/); assert.equal(log(), "", "nothing was stopped or started");
  r = run("old"); assert.equal(r.status, 0, r.stderr); assert.match(log(), /START books= gates= rebuy= minage= wide=1 db=older-old\.db run=old warm=\n/, "no settings = the run of older-10: " + log());
  r = run("old", "", "older-11"); assert.equal(r.status, 1); assert.match(r.stdout, /already has a database/); assert.ok(!existsSync(join(out, "old.profile")));
  r = run("new11", "", "older-11", "missing"); assert.equal(r.status, 1); assert.match(r.stdout, /has no database/);
  const st = new Store(join(out, "older-old.db")); st.saveCoin(M, { pool: "PoolA", createTs: T0, info: {} }); st.db.close(); const size = statSync(join(out, "older-old.db")).size; writeFileSync(logf, "");
  r = run("new11", "", "older-11", "old"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /new database prepared: 1 coins/); assert.match(r.stdout, /run 'new11' \(settings older-11\)/);
  assert.match(r.stdout, /cold start: run 'old' had other settings/); assert.match(log(), /START books=older-11 gates=older-11 rebuy=0 minage=6 wide=0 db=older-new11\.db run=new11 warm=\n/, "from the old bot: identities only, NO price memory — " + log()); assert.equal(readFileSync(join(out, "new11.profile"), "utf8").trim(), "older-11");
  assert.ok(log().indexOf("delete older") < log().indexOf("START"), "the previous bot is stopped (and writes its price memory) before the new one starts"); assert.ok(statSync(join(out, "older-old.db")).size >= size, "the previous database is still there");
  writeFileSync(logf, ""); r = run("new11"); assert.equal(r.status, 0); assert.match(log(), /START books=older-11 gates=older-11 rebuy=0 minage=6 wide=0 db=older-new11\.db run=new11 warm=\n/, "a plain restart of the name keeps its settings and carries nothing in again: " + log());
  writeFileSync(logf, ""); r = run("score11", "7", "older-11", "new11"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /price memory will be carried from run 'new11'/);
  assert.match(log(), /START books=older-11 gates=older-11 rebuy=0 minage=6 wide=0 db=older-score11\.db run=score11 warm=older-new11\.db\.warm\n/, "validation run → scored run, same settings: a new database with the validated price memory carried in — " + log()); assert.ok(existsSync(join(out, "score11.until")), "and its seven-day entry window is fixed");
  r = run("new11", "", ""); assert.equal(r.status, 0); r = run("old", "", "older-11"); assert.equal(r.status, 1, "and the old name still cannot be turned into the new rule set");
  // the owner's own list of pool books for a run (setbooks.sh): checked before anything is stopped, replaces the rule set's list, the rest of the rule set stays
  const setb = (...a) => spawnSync("bash", [join(HERE, "../scripts/setbooks.sh"), ...a], { env: { ...process.env, PATH: bin + ":" + process.env.PATH, OLDER_OUT: out }, encoding: "utf8" });
  writeFileSync(logf, ""); r = setb("new11", "VOL100K,NOPE"); assert.equal(r.status, 1); assert.match(r.stdout, /unknown book "NOPE"\. Nothing was changed/); assert.equal(log(), ""); assert.ok(!existsSync(join(out, "new11.books")));
  r = setb("new11", "HH-BREAK-4H,VOL100K"); assert.equal(r.status, 1); assert.match(r.stdout, /shares the buys of HH-BREAK/); r = setb("new11", "VOL100K,NEW-5M"); assert.equal(r.status, 1); assert.match(r.stdout, /newcoins\.sh/); assert.equal(log(), "");
  r = setb("new11", "VOL100K, VOL300K,VOL500K,FAST-1M,FAST-3M,FAST-5M,RUG450,RUG950"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /pool books of this run \(owner's list\): VOL100K,VOL300K/);
  assert.match(log(), /START books=VOL100K,VOL300K,VOL500K,FAST-1M,FAST-3M,FAST-5M,RUG450,RUG950 gates=older-11 rebuy=0 minage=6 wide=0 db=older-new11\.db run=new11/, log());
  writeFileSync(logf, ""); r = run("new11"); assert.match(log(), /START books=VOL100K,VOL300K,VOL500K,FAST-1M,FAST-3M,FAST-5M,RUG450,RUG950 /, "a plain restart keeps the owner's list");
  writeFileSync(logf, ""); r = setb("new11", "default"); assert.equal(r.status, 0); assert.match(log(), /START books=older-11 /); assert.equal(readFileSync(join(out, "new11.books.log"), "utf8").trim().split("\n").length, 2, "every change is kept with its time");
});
