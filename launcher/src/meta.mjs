// Coin metadata (name, ticker, description, picture, link to the post) on IPFS; returns the metadata URI that goes into create_v2.
// launcher 0.1.2: pump.fun's own upload endpoint answers the server with a Cloudflare challenge (HTTP 403 "Just a moment…", first start 30 Oct 22:19 UK),
// so the upload goes to Pinata (the IPFS service pump.fun itself uses) when PINATA_JWT is in the .env: picture first, then the metadata JSON in pump.fun's
// format pointing at it. Without a Pinata key it still tries pump.fun's endpoint. Bot-detection challenges are not worked around.
import { CFG } from "./config.mjs";

export const metaStat = { uploads: 0, errors: 0, lastErr: "", lastMs: null, via: null };
const PINATA = process.env.PINATA_JWT || "";
const GATEWAY = process.env.LAUNCH_IPFS_GATEWAY || "https://ipfs.io/ipfs/";

async function pin(blob, filename) {
  const fd = new FormData(); fd.append("file", blob, filename); fd.append("network", "public"); fd.append("name", filename);
  const r = await fetch("https://uploads.pinata.cloud/v3/files", { method: "POST", body: fd, headers: { Authorization: `Bearer ${PINATA}` }, signal: AbortSignal.timeout(8000) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j?.data?.cid) throw new Error(`Pinata HTTP ${r.status} ${JSON.stringify(j.error || j).slice(0, 120)}`);
  return j.data.cid;
}
async function viaPinata({ name, symbol, description, png, tweetUrl }) {
  const img = await pin(new Blob([png], { type: "image/png" }), `${symbol}.png`);
  const meta = { name, symbol, description: description || "", image: GATEWAY + img, showName: true, createdOn: "https://pump.fun", twitter: tweetUrl || "", telegram: "", website: "" };
  const cid = await pin(new Blob([JSON.stringify(meta)], { type: "application/json" }), `${symbol}.json`);
  return { uri: GATEWAY + cid, image: meta.image };
}
async function viaPump({ name, symbol, description, png, tweetUrl }) {
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), "coin.png");
  fd.append("name", name); fd.append("symbol", symbol); fd.append("description", description || "");
  if (tweetUrl) fd.append("twitter", tweetUrl);
  fd.append("telegram", ""); fd.append("website", ""); fd.append("showName", "true");
  const r = await fetch(CFG.IPFS_URL, { method: "POST", body: fd, signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch {}
  if (!r.ok || !j?.metadataUri) throw new Error(`pump.fun upload HTTP ${r.status} ${/Just a moment/.test(txt) ? "(Cloudflare challenge — add PINATA_JWT)" : txt.slice(0, 100).replace(/\s+/g, " ")}`);
  return { uri: j.metadataUri, image: j.metadata?.image || null };
}
export async function uploadMeta(m) {
  const t0 = Date.now(); metaStat.uploads++; metaStat.via = PINATA ? "pinata" : "pump.fun";
  try { const out = await (PINATA ? viaPinata(m) : viaPump(m)); metaStat.lastMs = Date.now() - t0; return { ...out, ms: metaStat.lastMs }; }
  catch (e) { metaStat.errors++; metaStat.lastErr = e.message; metaStat.lastMs = Date.now() - t0; throw e; }
}
