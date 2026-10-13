// Socials: pump.fun API first (fast, no IPFS), then IPFS gateways, then DexScreener. Cached per mint. Retries in background.
const cache = new Map();
const GATEWAYS = (u) => { const m = u.match(/ipfs\/([A-Za-z0-9]+.*)$/); return m ? [`https://pump.mypinata.cloud/ipfs/${m[1]}`, u, `https://ipfs.io/ipfs/${m[1]}`, `https://cloudflare-ipfs.com/ipfs/${m[1]}`] : [u]; };
const mk = () => ({ twitter: null, website: null, telegram: null, tiktok: null, ok: false, fetched: false, src: null });
const take = (out, j) => {
  for (const k of ["twitter", "website", "telegram"]) if (typeof j[k] === "string" && j[k].trim()) out[k] = j[k].trim();
  for (const v of Object.values(j)) if (typeof v === "string" && /tiktok\.com/i.test(v)) out.tiktok = v;
  out.fetched = true; out.ok = !!(out.twitter || out.website || out.tiktok);
};
async function viaPump(mint, out) {
  const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { signal: AbortSignal.timeout(4000), headers: { accept: "application/json", "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("pump " + r.status);
  const j = await r.json(); if (!j || !j.mint) throw new Error("pump empty");
  take(out, j); out.src = "pump";
}
async function viaIpfs(uri, out) {
  if (!uri || !/^https?:\/\//.test(uri)) throw new Error("no uri");
  for (const u of GATEWAYS(uri)) { try { const r = await fetch(u, { signal: AbortSignal.timeout(6000) }); if (!r.ok) continue; take(out, await r.json()); out.src = "ipfs"; return; } catch {} }
  throw new Error("ipfs");
}
async function viaDex(mint, out) {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(5000) });
  const j = await r.json(); const pairs = (j.pairs || []).filter((p) => p.chainId === "solana");
  if (!pairs.length) throw new Error("dex none");
  for (const p of pairs) {
    for (const w of p.info?.websites || []) { if (/tiktok\.com/i.test(w.url)) out.tiktok ||= w.url; else out.website ||= w.url; }
    for (const x of p.info?.socials || []) { if (x.type === "twitter") out.twitter ||= x.url; if (x.type === "telegram") out.telegram ||= x.url; }
  }
  out.fetched = true; out.ok = !!(out.twitter || out.website || out.tiktok); out.src = "dex";
}
export async function getSocials(mint, uri) {
  const c = cache.get(mint); if (c?.fetched) return c;
  const out = mk();
  for (const f of [() => viaPump(mint, out), () => viaIpfs(uri, out), () => viaDex(mint, out)]) { try { await f(); if (out.fetched) break; } catch {} }
  cache.set(mint, out); if (cache.size > 5000) cache.delete(cache.keys().next().value);
  return out;
}
/** Retry in background up to n times; calls onResult(soc) when fetched. */
export function retrySocials(mint, uri, onResult, n = 2, delayMs = 30000) {
  let left = n;
  const tick = async () => { const s = await getSocials(mint, uri); if (s.fetched) return onResult(s); if (--left > 0) setTimeout(tick, delayMs); };
  setTimeout(tick, delayMs);
}
export const socialsLine = (s) => {
  if (!s.fetched) return "socials: ? (metadata unreachable)";
  const parts = [];
  if (s.twitter) parts.push(`<a href="${s.twitter}">🐦 X</a>`);
  if (s.tiktok) parts.push(`<a href="${s.tiktok}">🎵 TikTok</a>`);
  if (s.website && s.website !== s.tiktok) parts.push(`<a href="${s.website}">🌐 web</a>`);
  if (s.telegram) parts.push(`<a href="${s.telegram}">✈️ TG</a>`);
  return parts.length ? parts.join(" · ") : "❌ <b>NO SOCIALS</b>";
};
