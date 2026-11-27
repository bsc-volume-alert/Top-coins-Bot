// the status dump's timing (27 Nov 2026): web.state(pop, buys, tm) reports how long each part held the program and returns the SAME state as without it
import test from "node:test";
import assert from "node:assert/strict";
import { startWeb } from "../src/web.mjs";

test("state() with a timing object: same content, and every part timed once per build", () => {
  let nc = 0, dk = 0, st = 0;
  const store = { noteCounts: () => { nc++; return [{ family: "VOL100K", reason: "x", n: 3 }]; }, disk: () => { dk++; return { db_mb: 1 }; }, allEntries: () => [] };
  const web = startWeb({ port: 0, store, engine: {}, status: () => { st++; return { ok: true }; } });
  try {
    const plain = web.state("a-pop", []), tm = {}, timed = web.state("b-pop", [], tm);
    const strip = (o) => ({ ...o, at: 0, pop: "" });
    assert.deepEqual(strip(timed), strip(plain));                       // nothing in the state changes
    assert.deepEqual(Object.keys(tm).sort(), ["book_rows", "disk", "note_counts", "overlap", "status"]);
    assert.equal(tm.note_counts.n, 2); assert.equal(tm.status.n, 1); assert.equal(tm.disk.n, 1); // the notes are still counted twice per build, as before
    for (const v of Object.values(tm)) { assert.ok(v.ms >= 0 && v.max >= 0 && v.max <= v.ms + 0.11); }
    assert.equal(nc, 4); assert.equal(dk, 2); assert.equal(st, 2);
    const again = {}; web.state("b-pop", [], again); assert.deepEqual(again, {}); // within 15 s the cached state is returned: nothing is built, nothing timed
  } finally { web.server.close(); }
});
