// Organic-vs-manufactured features for a 5-minute trade window (same features as src/quality.js).
// w: [{usd, b, w (wallet|null), px}] · seen: wallets seen on this token before the window · viaOther: share of sampled
// trades sent through a contract other than the Flap Portal (terminals, bots, aggregators) — recorded, not scored,
// because on Flap the retail website also calls the Portal directly, so its direction is for the analysis to find.
export function volumeQuality(w, seen = new Set(), viaOther = null) {
  const n = w.length, vol = w.reduce((a, x) => a + x.usd, 0);
  if (!n || !(vol > 0)) return null;
  const byW = new Map();
  for (const x of w) { if (!x.w) continue; const r = byW.get(x.w) || { usd: 0, b: 0, s: 0 }; r.usd += x.usd; if (x.b) r.b++; else r.s++; byW.set(x.w, r); }
  const wallets = byW.size, per10k = wallets / (vol / 1e4);
  const top3 = [...byW.values()].map((r) => r.usd).sort((a, b) => b - a).slice(0, 3).reduce((a, x) => a + x, 0) / vol;
  const roundtrip = [...byW.values()].filter((r) => r.b && r.s).length;
  const mean = vol / n, sizeCv = mean > 0 ? Math.sqrt(w.reduce((a, x) => a + (x.usd - mean) ** 2, 0) / n) / mean : 0;
  const buyers = [...byW.entries()].filter(([, r]) => r.b).map(([k]) => k);
  const newPct = buyers.length ? buyers.filter((k) => !seen.has(k)).length / buyers.length : 0;
  const first = w[0].px, last = w[n - 1].px, pxPer10k = first > 0 ? ((last / first - 1) * 100) / (vol / 1e4) : 0;
  let s = 0; // 0–100 from the parts whose direction is known (Solana weights without the router part, rescaled)
  s += Math.min(per10k / 20, 1) * 25;
  s += (1 - Math.min(top3, 1)) * 20;
  s += Math.max(0, 1 - roundtrip / Math.max(wallets * 0.15, 1)) * 15;
  s += Math.min(Math.max(pxPer10k, 0) / 2, 1) * 10;
  s += Math.min(sizeCv / 1.2, 1) * 5;
  return { wallets, per10k, top3, roundtrip, viaOther, sizeCv, newPct, pxPer10k, score: Math.round((s / 75) * 100) };
}
export function qualityLine(qv) {
  if (!qv) return "";
  const tag = qv.score >= 65 ? "🟢 organic" : qv.score >= 40 ? "🟡 mixed" : "🔴 manufactured";
  return `${tag} ${qv.score} · ${qv.wallets} wallets (${qv.per10k.toFixed(1)}/$10K) · top-3 ${(qv.top3 * 100).toFixed(0)}% · ${qv.roundtrip} round-trip · new ${(qv.newPct * 100).toFixed(0)}% · px ${qv.pxPer10k >= 0 ? "+" : ""}${qv.pxPer10k.toFixed(1)}%/$10K` +
    (qv.viaOther != null ? ` · via bots/terminals ${(qv.viaOther * 100).toFixed(0)}% / direct ${(100 - qv.viaOther * 100).toFixed(0)}%` : "");
}
