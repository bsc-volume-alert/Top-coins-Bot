import fs from "node:fs"; import zlib from "node:zlib";
export function readCsv(f) { let t = fs.readFileSync(f); if (f.endsWith(".gz")) t = zlib.gunzipSync(t); t = t.toString("utf8"); const out = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); out.push(row); row = []; cur = ""; } else cur += c; }
  const h = out.shift(); return out.map((r) => { const o = {}; h.forEach((k, i) => { const v = r[i]; o[k] = v === "" || v === undefined ? null : /^-?\d+(\.\d+)?(e-?\d+)?$/.test(v) ? +v : v; }); return o; }); }
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
