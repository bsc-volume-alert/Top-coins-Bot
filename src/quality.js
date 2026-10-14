// v0.16: volume-quality ("organic vs manufactured") features for a trade window.
// w: [{ts, usd, b (isBuy), w (wallet), route, px}] ; seen: Set of wallets seen on this token before the window.
import { RETAIL } from "./routes.js";
export function volumeQuality(w, seen = new Set()) {
  const n = w.length, vol = w.reduce((a, x) => a + x.usd, 0);
  if (!n || !(vol > 0)) return null;
  const byW = new Map();
  for (const x of w) { const r = byW.get(x.w) || { usd: 0, b: 0, s: 0 }; r.usd += x.usd; if (x.b) r.b++; else r.s++; byW.set(x.w, r); }
  const wallets = byW.size, per10k = wallets / (vol / 1e4);
  const top3 = [...byW.values()].map((r) => r.usd).sort((a, b) => b - a).slice(0, 3).reduce((a, x) => a + x, 0) / vol;
  const roundtrip = [...byW.values()].filter((r) => r.b && r.s).length;
  const retail = w.filter((x) => RETAIL.has(x.route)).reduce((a, x) => a + x.usd, 0) / vol;
  const custom = w.filter((x) => x.route === "other").reduce((a, x) => a + x.usd, 0) / vol;
  const mean = vol / n, sd = Math.sqrt(w.reduce((a, x) => a + (x.usd - mean) ** 2, 0) / n), sizeCv = mean > 0 ? sd / mean : 0;
  const buyers = [...byW.entries()].filter(([, r]) => r.b).map(([k]) => k);
  const newPct = buyers.length ? buyers.filter((k) => !seen.has(k)).length / buyers.length : 0;
  const first = w[0].px, last = w[n - 1].px, pxPer10k = first > 0 ? ((last / first - 1) * 100) / (vol / 1e4) : 0; // % price move per $10K traded
  const buyUsd = w.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), bs = buyUsd / Math.max(vol - buyUsd, 1);
  // composite 0–100 (for the alert only; analysis uses the raw columns)
  let score = 0;
  score += Math.min(per10k / 20, 1) * 25;            // many wallets per $ → retail
  score += (1 - Math.min(top3, 1)) * 20;             // volume not concentrated
  score += Math.max(0, 1 - roundtrip / Math.max(wallets * 0.15, 1)) * 15; // few round-trippers
  score += Math.min(retail, 1) * 15;                 // via routers
  score += (1 - Math.min(custom, 1)) * 10;           // not via custom programs
  score += Math.min(Math.max(pxPer10k, 0) / 2, 1) * 10; // price actually moves with volume
  score += Math.min(sizeCv / 1.2, 1) * 5;            // sizes vary (humans)
  return { wallets, per10k, top3, roundtrip, retail, custom, sizeCv, newPct, pxPer10k, bs, score: Math.round(score) };
}
export function qualityLine(qv) {
  if (!qv) return "";
  const tag = qv.score >= 65 ? "🟢 organic" : qv.score >= 40 ? "🟡 mixed" : "🔴 manufactured";
  return `${tag} ${qv.score} · ${qv.wallets} wallets (${qv.per10k.toFixed(1)}/$10K) · top-3 ${(qv.top3 * 100).toFixed(0)}% · ${qv.roundtrip} round-trip · routers ${(qv.retail * 100).toFixed(0)}% / custom ${(qv.custom * 100).toFixed(0)}% · new ${(qv.newPct * 100).toFixed(0)}% · px ${qv.pxPer10k >= 0 ? "+" : ""}${qv.pxPer10k.toFixed(1)}%/$10K`;
}
