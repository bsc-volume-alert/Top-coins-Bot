// Coin metadata (name, ticker, description, picture, link to the post) uploaded to IPFS through pump.fun's own upload endpoint — the same one its
// website uses; no account needed. Returns the metadata URI that goes into create_v2. The response time is recorded so slow uploads show up.
import { CFG } from "./config.mjs";

export const metaStat = { uploads: 0, errors: 0, lastErr: "", lastMs: null };
export async function uploadMeta({ name, symbol, description, png, tweetUrl }) {
  const t0 = Date.now(); metaStat.uploads++;
  try {
    const fd = new FormData();
    fd.append("file", new Blob([png], { type: "image/png" }), "coin.png");
    fd.append("name", name); fd.append("symbol", symbol); fd.append("description", description || "");
    if (tweetUrl) fd.append("twitter", tweetUrl);
    fd.append("telegram", ""); fd.append("website", ""); fd.append("showName", "true");
    const r = await fetch(CFG.IPFS_URL, { method: "POST", body: fd, signal: AbortSignal.timeout(8000), headers: { accept: "application/json", origin: "https://pump.fun", referer: "https://pump.fun/create" } });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch {}
    if (!r.ok || !j?.metadataUri) throw new Error(`HTTP ${r.status} ${txt.slice(0, 120).replace(/\s+/g, " ")}`);
    metaStat.lastMs = Date.now() - t0; return { uri: j.metadataUri, image: j.metadata?.image || null, ms: metaStat.lastMs };
  } catch (e) { metaStat.errors++; metaStat.lastErr = e.message; metaStat.lastMs = Date.now() - t0; throw e; }
}
