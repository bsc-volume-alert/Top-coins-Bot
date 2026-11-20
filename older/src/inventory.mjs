// inventory.mjs — initial discovery of EXISTING pools (a live feed only sees future trades).
// One getProgramAccounts on the PumpSwap program, filtered to SOL-quoted pools (quote mint at offset 75), sliced to the first
// 203 bytes → every PumpSwap/WSOL pool with its token, creator and vault addresses. Then the vaults' token balances
// (getMultipleAccounts, 100 a call, 8 bytes each) give reserves → market cap. Coins at or above INV_MIN_MC_USD (default $5K)
// become the watch population: creation time + back-fill are requested for them. Everything is counted for the coverage report.
// Pump.fun origin is labelled, not assumed: 'suffix' (mint ends in "pump", pump.fun's vanity suffix) or 'unknown'.
import { rpc, parsePool } from "./feed.mjs";
import { WSOL, bs58 } from "./decoder.mjs";
import { PUMPSWAP_PROGRAM } from "./decoder.mjs";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export async function inventory({ store, solUsd, minMc = Number(process.env.INV_MIN_MC_USD || 5000), log = console.log }) {
  const rep = { at: new Date().toISOString(), pools: 0, solPools: 0, pumpSuffix: 0, priced: 0, aboveMin: 0, inBand: 0, errors: 0, minMc };
  const accts = await rpc("getProgramAccounts", [PUMPSWAP_PROGRAM, { encoding: "base64", dataSlice: { offset: 0, length: 203 }, filters: [{ memcmp: { offset: 75, bytes: WSOL } }] }]);
  rep.pools = accts.length; const list = [];
  for (const a of accts) { const p = parsePool(a.account.data[0]); if (!p || p.quoteMint !== WSOL) continue; rep.solPools++; store.savePool(a.pubkey, { mint: p.baseMint, quote: p.quoteMint, creator: p.creator }); list.push({ pool: a.pubkey, ...p }); }
  log(`[inventory] ${rep.solPools} SOL-quoted PumpSwap pools`);
  const su = solUsd(); const out = [];
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50), keys = chunk.flatMap((p) => [p.poolBaseAta, p.poolQuoteAta]);
    let res; try { res = await rpc("getMultipleAccounts", [keys, { encoding: "base64", dataSlice: { offset: 64, length: 8 } }]); } catch { rep.errors++; continue; }
    chunk.forEach((p, j) => {
      const b = res.value[2 * j], q = res.value[2 * j + 1]; if (!b || !q) return;
      const base = Number(Buffer.from(b.data[0], "base64").readBigUInt64LE(0)) / 1e6, quote = Number(Buffer.from(q.data[0], "base64").readBigUInt64LE(0)) / 1e9;
      if (!(base > 0 && quote > 0)) return; rep.priced++;
      const mc = (quote / base) * 1e9 * su; const pump = p.baseMint.endsWith("pump") ? "suffix" : "unknown"; if (pump === "suffix") rep.pumpSuffix++;
      if (mc >= minMc) { rep.aboveMin++; if (mc >= 40000 && mc <= 1e6) rep.inBand++; out.push({ pool: p.pool, mint: p.baseMint, mc, pump }); store.saveCoin(p.baseMint, { pool: p.pool, pumpOrigin: pump }); }
    });
  }
  store.db.prepare("INSERT OR REPLACE INTO meta VALUES ('inventory', ?)").run(JSON.stringify(rep));
  log(`[inventory] ${JSON.stringify(rep)}`);
  return { rep, watch: out };
}
