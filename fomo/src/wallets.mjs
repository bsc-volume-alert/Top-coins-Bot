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
// fo../watch/handles.txt (handle | sol | evm | id) is read at every boot, so the owner's chosen traders are always watched whatever happened to the deploy hook
try { const { readFileSync } = await import("node:fs"); for (const l of readFileSync(new URL("../watch/handles.txt", import.meta.url), "utf8").split("\n")) { const t = l.trim(); if (!t || t.startsWith("#")) continue; const [handle, sol] = t.split("|").map((x) => x.trim()); if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(sol || "")) q.addWallet.run(sol, handle, handle, "handles.txt", nowS()); } } catch (e) { console.error("[wallets] handles.txt", e.message); }
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
    const meta = await ensureMeta(leg.mint, 120).catch(() => null); const handle = w.handle || w.label || null;
    let tradeId = null;
    if (leg.side === "buy") {
      if (!(px > 0)) continue;
      const row = openTrade({ wallet: leg.wallet, handle, mint: leg.mint, symbol: meta?.symbol || null, sig, ts, px, usd: leg.usd, mc: meta?.mc_usd ?? null });
      if (row) { tradeId = row.id; wa.buys++; wa.lastTx = ts; console.log(`[wallets] buy ${handle || leg.wallet.slice(0, 6)} ${meta?.symbol || leg.mint.slice(0, 6)} $${leg.usd.toFixed(0)} @ ${px.toExponential(3)}`); }
    } else {
      for (const row of openOf(leg.wallet, leg.mint)) theirSell(row, ts, px, leg.usd);
      wa.sells++; wa.lastTx = ts;
    }
    try { q.insWT.run(sig, leg.wallet, handle, ts, leg.mint, leg.side, leg.usd, px, meta?.mc_usd ?? null, tradeId); } catch (e) { wa.lastLog = "log: " + e.message; }
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
