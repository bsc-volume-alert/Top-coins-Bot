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
  assert.ok(BOOKS_PAGE.includes("data-sig")); assert.ok(BOOKS_PAGE.includes("PARTS[c[0]+'|'+i]!==p"), "a part is rebuilt only when its content changed"); assert.ok(!BOOKS_PAGE.includes("document.getElementById('books').innerHTML=h"), "the whole list is not rebuilt at every update");
  assert.ok(BOOKS_PAGE.includes("Date.now()-BUSY<1000")); for (const ev of ["touchstart", "touchmove", "scroll", "wheel"]) assert.ok(BOOKS_PAGE.includes("'" + ev + "'"));
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
