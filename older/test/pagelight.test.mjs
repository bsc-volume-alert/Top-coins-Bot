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
