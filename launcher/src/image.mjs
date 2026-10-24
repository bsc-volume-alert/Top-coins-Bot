// The coin's picture: a 512×512 PNG drawn in plain JavaScript (pngjs, no fonts or system libraries needed) — a colour gradient picked from the name,
// the ticker in big block letters and the name underneath. Takes a few milliseconds. AI pictures can replace it later.
import { PNG } from "pngjs";

// 5×7 block font: each glyph is 7 rows, 5 bits a row (bit 4 = left column).
const F = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], 0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  "$": [4, 15, 20, 14, 5, 30, 4], "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4], "-": [0, 0, 0, 31, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12], "'": [4, 4, 8, 0, 0, 0, 0], "&": [12, 18, 20, 8, 21, 18, 13], " ": [0, 0, 0, 0, 0, 0, 0],
};
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const hsl = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };

function text(png, str, cx, cy, scale, rgb) {
  const glyphs = [...str.toUpperCase()].map((c) => F[c] || F["?"]), w = glyphs.length * 6 * scale - scale, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 3.5 * scale);
  glyphs.forEach((g, gi) => g.forEach((row, ry) => { for (let rx = 0; rx < 5; rx++) if (row & (16 >> rx)) for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
    const x = x0 + (gi * 6 + rx) * scale + dx, y = y0 + ry * scale + dy; if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
    const i = (y * png.width + x) * 4; png.data[i] = rgb[0]; png.data[i + 1] = rgb[1]; png.data[i + 2] = rgb[2]; png.data[i + 3] = 255; } }));
}
const wrap = (s, max) => { const out = []; let line = ""; for (const w of s.split(/\s+/)) { if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim(); } if (line) out.push(line); return out.slice(0, 3); };

/** PNG bytes for a coin. */
export function coinImage(name, ticker) {
  const S = 512, png = new PNG({ width: S, height: S }), h = hash(name + "|" + ticker), hue = h % 360;
  const c1 = hsl(hue, 0.75, 0.45), c2 = hsl((hue + 40 + (h >> 9) % 80) % 360, 0.8, 0.22);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const t = (x + y) / (2 * S), i = (y * S + x) * 4; for (let k = 0; k < 3; k++) png.data[i + k] = Math.round(c1[k] * (1 - t) + c2[k] * t); png.data[i + 3] = 255; }
  const tk = "$" + ticker.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10), big = Math.max(6, Math.min(22, Math.floor(440 / (tk.length * 6))));
  text(png, tk, S / 2 + 3, S * 0.40 + 3, big, [0, 0, 0]); text(png, tk, S / 2, S * 0.40, big, [255, 255, 255]);
  const lines = wrap(name.replace(/[^A-Za-z0-9 $!?.\-'&]/g, ""), 16), sm = 5;
  lines.forEach((l, i) => text(png, l, S / 2, S * 0.70 + i * 9 * sm, sm, [255, 255, 255]));
  return PNG.sync.write(png);
}
