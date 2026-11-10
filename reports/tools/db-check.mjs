// db-check.mjs — READ-ONLY integrity check (10 Nov 2026, after "database disk image is malformed" on the live tracker DB). argv: paths.
import Database from "better-sqlite3";
for (const p of process.argv.slice(2)) {
  const t0 = Date.now();
  try { const d = new Database(p, { readonly: true, fileMustExist: true }); d.pragma("busy_timeout = 10000");
    const r = d.pragma("quick_check(30)").map((x) => x.quick_check);
    console.log(`[dbcheck] ${p}: ${r.length === 1 && r[0] === "ok" ? "OK" : r.length + " problem(s)"} in ${Math.round((Date.now() - t0) / 1000)} s`);
    if (!(r.length === 1 && r[0] === "ok")) for (const x of r) console.log(`[dbcheck]   ${String(x).slice(0, 160)}`);
    d.close(); } catch (e) { console.log(`[dbcheck] ${p}: error ${e.message}`); }
}
console.log("[dbcheck] done");
