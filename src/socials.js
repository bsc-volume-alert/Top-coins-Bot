// Fetch pump.fun token metadata (uri -> JSON) and extract socials. One fetch per token, cached.
const cache = new Map();
const GATEWAYS = (u) => {
  const m = u.match(/ipfs\/([A-Za-z0-9]+.*)$/);
  if (!m) return [u];
  return [u, `https://pump.mypinata.cloud/ipfs/${m[1]}`, `https://ipfs.io/ipfs/${m[1]}`, `https://cloudflare-ipfs.com/ipfs/${m[1]}`];
};
export async function getSocials(mint, uri) {
  if (cache.has(mint)) return cache.get(mint);
  const out = { twitter: null, website: null, telegram: null, tiktok: null, ok: false, fetched: false };
  if (uri && /^https?:\/\//.test(uri)) {
    for (const u of GATEWAYS(uri)) {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(4000) });
        if (!r.ok) continue;
        const j = await r.json(); out.fetched = true;
        const vals = { twitter: j.twitter, website: j.website, telegram: j.telegram };
        for (const [k, v] of Object.entries(vals)) if (typeof v === "string" && v.trim()) out[k] = v.trim();
        for (const v of Object.values(j)) if (typeof v === "string" && /tiktok\.com/i.test(v)) out.tiktok = v;
        if (out.website && /tiktok\.com/i.test(out.website)) out.tiktok = out.website;
        break;
      } catch {}
    }
  }
  out.ok = !!(out.twitter || out.website || out.tiktok);
  cache.set(mint, out);
  if (cache.size > 5000) cache.delete(cache.keys().next().value);
  return out;
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
