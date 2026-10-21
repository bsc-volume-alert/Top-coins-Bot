// Watched wallets: one logsSubscribe per wallet on one socket (Helius when a key is set, else public). Every transaction is decoded
// in full with getTransaction (low volume, budgeted), so the entry is the trader's real fill. A buy opens a paper trade; a sell
// closes that trade's copy exit at the trader's price and records their hold time.
import { CFG } from "./config.mjs";
import { q, nowS } from "./db.mjs";
import { openLogs } from "./ws.mjs";
import { decodeTx } from "./rpc.mjs";
import { ensureMeta, wantPrice } from "./price.mjs";
import { openTrade, openOf, theirSell } from "./score.mjs";
export const wa = { txs: 0, decoded: 0, buys: 0, sells: 0, errors: 0, lastTx: 0, lastLog: "" };
const watched = new Map(); // wallet -> { handle, label }
function reload() { watched.clear(); for (const r of q.listWallets.all()) watched.set(r.wallet, { handle: r.handle, label: r.label }); }
for (const w of CFG.WALLETS) { const [addr, label] = w.split(":"); if (addr) q.addWallet.run(addr, null, label || null, "env", nowS()); }
reload();
let sock = null; const seen = new Set(); let seenOrder = [];
function remember(sig) { if (seen.has(sig)) return false; seen.add(sig); seenOrder.push(sig); if (seenOrder.length > 5000) for (const s of seenOrder.splice(0, 2500)) seen.delete(s); return true; }
async function onTx({ sig, err }) {
  if (err || !remember(sig)) return; wa.txs++;
  let t; try { t = await decodeTx(sig); } catch (e) { wa.errors++; wa.lastLog = e.message; return; }
  if (!t || t.failed) return; wa.decoded++; const ts = t.ts || nowS();
  for (const leg of t.legs) {
    const w = watched.get(leg.wallet); if (!w) continue;
    const px = leg.tokens > 0 && leg.usd > 0 ? leg.usd / leg.tokens : null;
    if (leg.side === "buy") {
      if (!(px > 0)) continue;
      const meta = await ensureMeta(leg.mint, 300).catch(() => null);
      const row = openTrade({ wallet: leg.wallet, handle: w.handle || w.label || null, mint: leg.mint, symbol: meta?.symbol || null, sig, ts, px, usd: leg.usd, mc: meta?.mc_usd ?? null });
      if (row) { wa.buys++; wa.lastTx = ts; console.log(`[wallets] buy ${w.label || w.handle || leg.wallet.slice(0, 6)} ${meta?.symbol || leg.mint.slice(0, 6)} $${leg.usd.toFixed(0)} @ ${px.toExponential(3)}`); }
    } else {
      for (const row of openOf(leg.wallet, leg.mint)) theirSell(row, ts, px, leg.usd);
      wa.sells++; wa.lastTx = ts;
    }
  }
}
export function startWallets() { if (watched.size) openSock(); else wa.lastLog = "no watched wallets yet — add one on the page"; }
function openSock() {
  if (sock) return sock.resubscribe();
  const url = CFG.HELIUS_KEY ? `wss://mainnet.helius-rpc.com/?api-key=${CFG.HELIUS_KEY}` : CFG.PUBLIC_WS;
  const log = (s) => { wa.lastLog = s; console.log("[wallets]", s); };
  sock = openLogs({ url, label: "wallets", addresses: () => [...watched.keys()], onTx, onStatus: log });
}
export function addWallet(wallet, { handle = null, label = null, source = "page" } = {}) { q.addWallet.run(wallet, handle, label, source, nowS()); reload(); openSock(); }
export function removeWallet(wallet) { q.dropWallet.run(wallet); reload(); sock?.resubscribe(); }
export const walletsStatus = () => ({ watched: watched.size, socket: sock?.st || null });
export const watchedList = () => [...watched.entries()].map(([wallet, w]) => ({ wallet, ...w }));
