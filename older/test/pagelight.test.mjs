// THE PAGE MUST STAY USABLE ON A TABLET (owner 27 Nov 2026 15:59 UK: "it's hard to move up and down… try to move it, it doesn't
// move"). Measured on a copy of the site fed with the run's own 895 buys: the page rebuilt all of its ~26,000 elements at every
// 2-second price update and was frozen most of the time; it also downloaded the whole 1.5 MB state every 10 seconds only to show
// the health strip. What these tests hold: the light health answer, the compressed books answer, and the page's own rules.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { gunzipSync } from "node:zlib";
import { startWeb } from "../src/web.mjs";
import { BOOKS_PAGE } from "../src/page.mjs";

const get = (port, path, headers = {}) => new Promise((ok, no) => http.get({ host: "127.0.0.1", port, path, headers }, (r) => { const b = []; r.on("data", (x) => b.push(x)); r.on("end", () => ok({ status: r.statusCode, headers: r.headers, body: Buffer.concat(b) })); }).on("error", no));
const site = async () => { let rows = 0, st = 0; const store = { allEntries: () => { rows++; return []; }, noteCounts: () => { rows++; return []; }, disk: () => ({ db_mb: 7 }) };
  const w = startWeb({ port: 0, store, engine: { entries: new Map() }, status: () => { st++; return { feed: { connected: true }, engine: { coins: 3 } }; }, run: () => null }); await new Promise((r) => w.server.once("listening", r)); return { w, port: w.server.address().port, built: () => rows, asked: () => st }; };

test("/api/health answers with the status and the disk figures only — no result rows are built for it, and it is rebuilt at most every 5 seconds", async () => {
  const s = await site(); try {
    const a = await get(s.port, "/api/health"), j = JSON.parse(a.body); assert.equal(a.status, 200); assert.deepEqual(Object.keys(j).sort(), ["at", "disk", "status"]); assert.equal(j.status.engine.coins, 3); assert.equal(j.disk.db_mb, 7);
    assert.equal(s.built(), 0, "no buys are read and no rows are built"); await get(s.port, "/api/health"); assert.equal(s.asked(), 1, "the second request within 5 s is the same answer");
  } finally { s.w.server.close(); }
});

test("/api/books is sent compressed to a browser that accepts it — the same content — and plain to one that does not", async () => {
  const s = await site(); try {
    const plain = await get(s.port, "/api/books?stop=0.25"), gz = await get(s.port, "/api/books?stop=0.25", { "accept-encoding": "gzip, deflate" });
    assert.equal(plain.headers["content-encoding"], undefined); assert.equal(gz.headers["content-encoding"], "gzip"); assert.equal(gz.headers["content-type"], "application/json");
    assert.equal(gunzipSync(gz.body).toString(), plain.body.toString()); assert.ok(JSON.parse(plain.body).order.length > 0);
  } finally { s.w.server.close(); }
});

test("the page: asks for the light health answer, replaces only the parts of a card that changed, never redraws under a finger, and writes each time with one shared formatter", () => {
  assert.ok(BOOKS_PAGE.includes("fetch('/api/health?'")); assert.ok(!BOOKS_PAGE.includes("fetch('/api/state?'+q2)"), "the page no longer downloads the whole state");
  assert.ok(BOOKS_PAGE.includes("data-sig")); assert.ok(BOOKS_PAGE.includes("PARTS[c[0]+'|0']!==c[1]") && BOOKS_PAGE.includes("PARTS[k+'|1']!==p1"), "a part is rebuilt only when its content changed"); assert.ok(!BOOKS_PAGE.includes("document.getElementById('books').innerHTML=h"), "the whole list is not rebuilt at every update");
  assert.ok(BOOKS_PAGE.includes("Date.now()-BUSY<1000")); for (const ev of ["touchmove", "scroll", "wheel"]) assert.ok(BOOKS_PAGE.includes("'" + ev + "'")); assert.ok(!BOOKS_PAGE.includes("'touchstart'"), "a tap is not a scroll: it must not hold a redraw back");
  // only the cards on or near the screen carry their tables; a selector tap is immediate; the other panels wait for a still page too
  assert.ok(BOOKS_PAGE.includes("new IntersectionObserver(")); assert.ok(BOOKS_PAGE.includes("rootMargin:'1200px 0px 1200px 0px'")); assert.ok(BOOKS_PAGE.includes("if(NEAR[c[0]])fill(c[0])")); assert.ok(BOOKS_PAGE.includes("else CARDS.forEach(function(c){NEAR[c[0]]=1;fill(c[0])})"), "without the observer every card is filled, as before");
  assert.ok(BOOKS_PAGE.includes("FORCE=Date.now()")); assert.ok(BOOKS_PAGE.includes("Date.now()-FORCE>4000")); assert.ok(BOOKS_PAGE.includes("var healthC=calm(health)")); assert.ok(BOOKS_PAGE.includes("var RNC=calm(RN)")); assert.ok(BOOKS_PAGE.includes("while(SEENQ.length>4)"));
  assert.ok(!/toLocale(Time)?String\('en-GB',\{timeZone/.test(BOOKS_PAGE.split("function ukDayStart")[0].split("var TF=")[1] || "x"), "DT / HM / UKT use the shared formatters"); assert.ok(BOOKS_PAGE.includes("function DT(ts){return TFM('d',ts)}"));
  // the script still parses
  const js = BOOKS_PAGE.split("<script>").slice(1).map((x) => x.split("</script>")[0]).join("\n"); assert.doesNotThrow(() => new Function(js));
});

// WHAT EACH BOOK IS (owner 27 Nov 2026 16:46 UK: "a detailed description of what it is so when I'm going through it, I know exactly what we're picking")
test("every book and every view the run shows has a plain description — what it is, which coins, when it buys, when it sells, what to keep in mind — with the rule's own numbers", async () => {
  const { ABOUT, VIEW_NAMES, booksApi } = await import("../src/page.mjs"); const S = await import("../src/spec.mjs");
  const run = { books: [...S.booksOf("VOL100K,VOL300K,VOL500K,FAST-1M,FAST-3M,FAST-5M,RUG450,RUG950,HIT,FOLLOW,FARM"), ...S.NEW_BOOKS], newcoins: true }, j = booksApi([], { stop: 0.25, run });
  for (const k of j.order) { const a = j.about[k]; assert.ok(a, "no description for " + k); for (const f of ["kind", "coins", "buys", "sells", "mind"]) assert.ok(typeof a[f] === "string" && a[f].length > 20, k + " " + f); }
  for (const n of [...VIEW_NAMES, S.NEW_ALL]) { assert.ok(j.order.includes(n), n); assert.match(ABOUT[n].kind, /A view, not a book/); } for (const f of run.books) assert.match(ABOUT[f].kind, /A real paper book/);
  const n5 = S.NEW_COIN[0]; assert.match(ABOUT["NEW-5M"].buys, /At 5 minutes old/); assert.ok(ABOUT["NEW-5M"].buys.includes("between 16% and 30%")); assert.ok(ABOUT["NEW-5M"].buys.includes("more than " + n5.holders_min + " holders")); assert.ok(ABOUT["NEW-20M"].buys.includes("5 SOL or more paid in fees"));
  assert.ok(ABOUT["CONFIRM-30"].buys.includes("1.3×")); assert.ok(ABOUT["WAIT5-UP"].buys.includes("Exactly 5 minutes later")); assert.ok(ABOUT["FARM-90K"].sells.includes("$90K")); assert.ok(ABOUT["HIT100-10M"].buys.includes("10 minutes later") && ABOUT["HIT100-10M"].buys.includes("$100K")); assert.ok(ABOUT["HIT50-NOW"].buys.includes("The moment the coin first reaches $50K"));
  assert.ok(ABOUT["FAST-3M"].buys.includes("last 3 minutes")); assert.ok(ABOUT["FAST-1M"].buys.includes("last 1 minute.")); assert.ok(ABOUT["RUG950"].coins.includes("$950K")); assert.ok(ABOUT["VOL500K"].buys.includes("$500K"));
  assert.ok(BOOKS_PAGE.includes("about(j.about&&j.about[k])")); assert.ok(BOOKS_PAGE.includes("'When it buys'"));
  assert.equal(booksApi([], { stop: 0.25 }).about["AGE-DOUBLE"], undefined, "a book without a description simply shows its one-line rule, as before");
});

test("the site's kept answers do not pile up: one per selection asked for in the last two minutes, older ones dropped", async (t) => {
  const s = await site(); try {
    for (const stop of [0.2, 0.25, 0.3, 0.4]) await get(s.port, "/api/books?stop=" + stop); assert.equal(s.w.cached(), 4);
    const real = Date.now; Date.now = () => real() + 130_000; t.after(() => { Date.now = real; });
    await get(s.port, "/api/books?stop=0.5"); assert.equal(s.w.cached(), 1, "the four answers nobody asked for again are gone"); await get(s.port, "/api/health"); assert.equal(s.w.cached(), 2);
  } finally { s.w.server.close(); }
});

// THE BOOKS ANSWER WITHOUT READING EVERY BUY AGAIN (owner 27 Nov 2026 16:52 UK: "can you make it really super fast?")
test("the books answer keeps the rows of finished buys and reads only what it must — and is the same answer as reading every buy", async (t) => {
  const { mkdtempSync } = await import("node:fs"), { tmpdir } = await import("node:os"), { join } = await import("node:path");
  const { Store } = await import("../src/store.mjs"), { newEntry, COST } = await import("../src/book.mjs"), { booksApi } = await import("../src/page.mjs"), S = await import("../src/spec.mjs");
  const store = new Store(join(mkdtempSync(join(tmpdir(), "older-fast-")), "t.db")), now = Date.now() / 1000, engine = { entries: new Map() };
  const mk = (i, fam, ago, kind) => { const e = newEntry({ mint: "Mint" + i + "x".repeat(38), pool: "P", ag: "A1", t: now - ago, families: [fam], features: {}, mc: 50_000 + i, px: 1 }); e.token = { symbol: "C" + i, xfer_bps: 0 }; e.evidence = { trigger: {} };
    if (kind === "cancelled") { e.status = "cancelled"; e.flags.push("pricing/data timeout"); }
    else { e.status = "filled"; e.fill = { t: now - ago + 1, tok: 1e6, delay_s: 0.1, exec: "reconstructed-pool-state", quote_sol: 100, base: 1e9, px_sol: 2e-7, fee_src: "event" };
      for (const v of e.versions) { v.tok = 1e6; v.peak = COST; v.maxX = 1.2; if (kind !== "open") { v.status = "closed"; v.reason = "trail"; v.exit = { t: now - ago + 90, ret: -0.2 + i / 100, sol: COST * (0.8 + i / 100), last_sol: COST * (0.8 + i / 100), hold_s: 89, delay_s: 0 }; } else { v.lastX = 1.1; v.lastT = now; } }
      if (kind === "done") e.runner.horizonDone = true; }
    store.saveEntry(e); return e; };
  const A = mk(1, "VOL100K", 7200, "done"), B = mk(2, "VOL300K", 3600, "cancelled"), C = mk(3, "VOL100K", 300, "open"), D = mk(4, "RUG450", 120, "done"), E = mk(5, "VOL500K", 5000, "closed"); engine.entries.set(C.id, C);
  assert.deepEqual(store.entryFlags().map((f) => [f.id, f.done]), [[A.id, 1], [B.id, 1], [C.id, 0], [D.id, 1], [E.id, 0]]); assert.deepEqual(store.entriesByIds([E.id, A.id]).map((e) => e.id), [A.id, E.id]);
  const runInfo = { books: ["VOL100K", "VOL300K", "VOL500K", "RUG450"] }, w = startWeb({ port: 0, store, engine, status: () => ({}), run: () => runInfo }); await new Promise((r) => w.server.once("listening", r)); const port = w.server.address().port;
  try {
    const strip = (j) => { const o = JSON.parse(JSON.stringify(j)); o.at = 0; o.build = null; for (const L of Object.values(o.books)) for (const r of L) delete r.sell; return o; };
    const fast = JSON.parse((await get(port, "/api/books?stop=0.25")).body), slow = booksApi(store.allEntries(), { stop: 0.25, policy: "trail", ag: "", pop: "", stake: S.STAKE_SOL, first: false, checks: "all", since: store.since(now), run: runInfo, sellable: false });
    assert.deepEqual(strip(fast), strip(slow)); assert.equal(fast.books.VOL100K.length, 2); assert.equal(fast.books.VOL300K[0].status, "cancelled"); assert.equal(fast.books.RUG450.length, 1); assert.equal(fast.books.VOL500K.length, 1);
    assert.deepEqual(w.books(), { answers: 1, read: 4, kept: 2, live: 1, selections: 1 }, "A and B read once and kept; D (finished two minutes ago) and E (not in memory) read for this answer; C from memory");
    const real = Date.now; Date.now = () => real() + 9000; t.after(() => { Date.now = real; });
    C.versions.find((v) => v.policy === "trail" && v.stop === 0.25).lastX = 1.5; // the open buy moves in memory: no save, no read
    const again = JSON.parse((await get(port, "/api/books?stop=0.25")).body); assert.equal(w.books().read, 6, "only D and E are read again — the kept buys are not"); assert.equal(again.books.VOL100K.find((r) => r.id === C.id).now_x, 1.5);
    await get(port, "/api/books?stop=0.4"); assert.equal(w.books().selections, 2); assert.equal(w.books().read, 10, "a new selection reads the finished buys once");
    for (const p of ["/", "/api/health", "/api/runners"]) { const z = await get(port, p, { "accept-encoding": "gzip" }), plain = await get(port, p); assert.equal(z.headers["content-encoding"], "gzip", p); assert.equal(plain.headers["content-encoding"], undefined); assert.equal(gunzipSync(z.body).toString(), plain.body.toString(), p); }
  } finally { w.server.close(); }
});

// SINCE THE RULE CHANGE, AND THE NEW BOOKS IN THEIR OWN COLOUR (owner 27 Nov 2026 17:17 UK)
test("the page is told when the rules last changed and which books are new — it shows each book's result since that moment first, ranks by it once, and marks the new books", async () => {
  const { booksApi, VIEW_NAMES } = await import("../src/page.mjs"); const S = await import("../src/spec.mjs");
  assert.equal(S.RULE_CHANGE.t, 1795790088); assert.equal(new Date(S.RULE_CHANGE.t * 1000).toISOString(), "2026-11-27T14:34:48.000Z"); assert.deepEqual(S.NEW_TODAY.books, [...S.HIT_BOOKS, ...S.FOLLOW_BOOKS, ...S.FARM_BOOKS]);
  const run = { books: [...S.booksOf("VOL100K,FAST-1M,RUG450,HIT,FOLLOW,FARM"), ...S.NEW_BOOKS], newcoins: true }, j = booksApi([], { stop: 0.25, run });
  assert.deepEqual(j.rule, S.RULE_CHANGE); for (const k of [...S.NEW_TODAY.books, ...VIEW_NAMES]) assert.equal(j.fresh[k], "27 Nov", k); for (const k of ["VOL100K", "FAST-1M", "RUG450", ...S.NEW_BOOKS, S.NEW_ALL]) assert.equal(j.fresh[k], undefined, k + " is not new");
  assert.ok(BOOKS_PAGE.includes('<button data-v="rc">since rule change</button>')); assert.ok(BOOKS_PAGE.includes("if(!SEL.rcSeen){SEL.win='rc';SEL.rcSeen=1}"), "ranked by it once; his own choice of period is kept afterwards");
  assert.ok(BOOKS_PAGE.includes("rc:RC?w(RC):sumR([])")); assert.ok(BOOKS_PAGE.includes("cell('since the rule change · '+UKT(RC),b.rc")); assert.ok(BOOKS_PAGE.includes('<span class="mode new">NEW · ')); assert.ok(BOOKS_PAGE.includes("--new:#c8ff4d"));
  assert.ok(BOOKS_PAGE.includes('<th style="color:var(--new)">since rule change</th>'));
});
