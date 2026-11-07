// 0.9.46: the streamed CSV / JSONL writer (from index.mjs 0.9.41), shared by the launcher and its export worker thread.
import { openSync, writeSync, closeSync, renameSync, unlinkSync } from "node:fs";
export function streamOut(path, iter, line, header, maxBytes = Infinity) {
  const tmp = path + ".tmp"; const fd = openSync(tmp, "w"); let buf = [], size = 0, bytes = 0, rows = 0, truncated = false, first = true;
  const flush = () => { if (buf.length) { const s = buf.join(""); writeSync(fd, s); bytes += Buffer.byteLength(s); buf = []; size = 0; } };
  try {
    for (const r of iter) {
      let t = line(r); if (first) { const h = header ? header(r) : null; if (h != null) t = h + "\n" + t; first = false; } else t = "\n" + t;
      if (bytes + size + t.length > maxBytes) { truncated = true; break; }
      buf.push(t); size += t.length; rows++; if (size > 1048576) flush();
    }
    flush(); closeSync(fd); renameSync(tmp, path); return { rows, bytes, truncated };
  } catch (e) { try { closeSync(fd); } catch {} try { unlinkSync(tmp); } catch {} throw e; }
}
const csvE = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function csvOut(path, iter, maxBytes) { let cols = null; return streamOut(path, iter, (r) => { if (!cols) cols = Object.keys(r); return cols.map((c) => csvE(r[c])).join(","); }, (r) => Object.keys(r).join(","), maxBytes); }
export function linesOut(path, iter, fn) { return streamOut(path, iter, fn, null); }
