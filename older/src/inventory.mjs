// inventory.mjs — initial discovery of EXISTING canonical PumpSwap pools (a live feed only sees future trades).
// Pages through the PumpSwap program's SOL-quoted pool accounts (quote mint at offset 75; first 261 bytes: token, creator, vaults,
// virtual reserves) and prices each page straight away from the vaults' balances (getMultipleAccounts, 100 accounts a call), so
// memory stays bounded however many pools exist. Uses Helius' paginated getProgramAccountsV2 when the RPC offers it, else the
// plain call (which can be too large for a busy program — a failure is reported, never hidden: the feed then resolves pools as
// they trade, and the page shows the inventory as missing).
// Pump.fun origin is VERIFIED, not assumed: a pool is canonical when pool.creator equals the pump pool-authority PDA of its base
// mint (pump-public-docs). Non-canonical pools are counted. Coins at or above INV_MIN_MC_USD (default $5K) become the watch population.
import { rpc, parsePool, poolClass } from "./feed.mjs";
import { WSOL, PUMPSWAP_PROGRAM } from "./decoder.mjs";

export async function inventory({ store, solUsd, minMc = Number(process.env.INV_MIN_MC_USD || 5000), maxPools = Number(process.env.INV_MAX_POOLS || 0), log = console.log }) {
  const rep = { at: new Date().toISOString(), method: null, pages: 0, pools: 0, solPools: 0, canonical: 0, nonCanonical: 0, pumpSuffix: 0, priced: 0, aboveMin: 0, inBand: 0, errors: 0, minMc, complete: false };
  const su = solUsd(), watch = [], cfg = { encoding: "base64", dataSlice: { offset: 0, length: 261 }, filters: [{ memcmp: { offset: 75, bytes: WSOL } }] };
  async function page(accts) {
    rep.pages++; rep.pools += accts.length; const list = [];
    for (const a of accts) { const p = parsePool(a.account.data[0]); if (!p || p.quoteMint !== WSOL) continue; rep.solPools++; const info = { mint: p.baseMint, quote: p.quoteMint, creator: p.creator }; store.savePool(a.pubkey, info); if (poolClass(info) !== "canonical") { rep.nonCanonical++; continue; } rep.canonical++; list.push({ pool: a.pubkey, ...p }); }
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50), keys = chunk.flatMap((p) => [p.poolBaseAta, p.poolQuoteAta]);
      let res; try { res = await rpc("getMultipleAccounts", [keys, { encoding: "base64", dataSlice: { offset: 64, length: 8 } }]); } catch { rep.errors++; continue; }
      chunk.forEach((p, j) => {
        const b = res.value[2 * j], q = res.value[2 * j + 1]; if (!b || !q) return;
        const base = Number(Buffer.from(b.data[0], "base64").readBigUInt64LE(0)) / 1e6, quote = Number(Buffer.from(q.data[0], "base64").readBigUInt64LE(0) + (p.virtualQuote ?? 0n)) / 1e9; // effective quote reserves
        if (!(base > 0 && quote > 0)) return; rep.priced++; if (p.baseMint.endsWith("pump")) rep.pumpSuffix++;
        const mc = (quote / base) * 1e9 * su; // supply taken as 1e9 here for screening only; the live feed uses each event's base_supply
        if (mc >= minMc) { rep.aboveMin++; if (mc >= 40000 && mc <= 1e6) rep.inBand++; watch.push({ pool: p.pool, mint: p.baseMint, mc }); store.saveCoin(p.baseMint, { pool: p.pool, pumpOrigin: "pump.fun", info: { population: "pumpswap-canonical", origin: "pump.fun", origin_evidence: "canonical pool: creator = pump pool-authority PDA", venues: ["PumpSwap"], discovery_source: "program accounts inventory", price_source: "pool events", monitoring_mode: "live" } }); }
      });
    }
  }
  try { // paginated (Helius getProgramAccountsV2)
    let key = null; rep.method = "getProgramAccountsV2 (paginated)";
    do { const r = await rpc("getProgramAccountsV2", [PUMPSWAP_PROGRAM, { ...cfg, limit: 5000, ...(key ? { paginationKey: key } : {}) }]); const accts = r?.accounts || []; if (!accts.length) break; await page(accts); key = r.paginationKey || null; if (maxPools && rep.pools >= maxPools) { rep.stopped = `INV_MAX_POOLS=${maxPools}`; break; } } while (key);
    rep.complete = !key && !rep.stopped;
  } catch (e) {
    if (rep.pages) rep.error = "pagination stopped: " + String(e.message).slice(0, 120);
    else try { rep.method = "getProgramAccounts (single call)"; await page(await rpc("getProgramAccounts", [PUMPSWAP_PROGRAM, cfg])); rep.complete = true; } catch (e2) { rep.error = "inventory unavailable: " + String(e2.message).slice(0, 120); }
  }
  store.db.prepare("INSERT OR REPLACE INTO meta VALUES ('inventory', ?)").run(JSON.stringify(rep));
  log(`[inventory] ${JSON.stringify(rep)}`);
  return { rep, watch };
}
