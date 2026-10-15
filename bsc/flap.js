// Flap Portal event decoder. Signatures from docs.flap.sh (TokenBought/TokenSold/TokenCreated/LaunchedToDEX are
// confirmed against published topic hashes); companion events are decoded the same way and counted in /status so a
// wrong guess shows up as "unknown events". Arguments = indexed topics first, then data words (Flap uses no indexed args).
import { word, u, addr, ether, str } from "./rpc.js";

const T = {
  "0x504e7f360b2e5fe33cbaaae4c593bc55305328341bf79009e43e0e3b7f699603": "TokenCreated",      // (ts, creator, nonce, token, name, symbol, meta)
  "0xa800a2038683844fac66747f771bfdfae862eb28b16bcfa387afa9fbacce8ff7": "TokenBought",       // (ts, token, buyer, amount, eth, fee, postPrice)
  "0x03a4693e592f5e75dc7c136acb39b146d2b4966c0e509c34f362dee02b3b861a": "TokenSold",         // (ts, token, seller, amount, eth, fee, postPrice)
  "0x6e4f47630b8745b8cacbd44f42a8a33e7eea7cc08ef22fc7630f4f385784ff7d": "LaunchedToDEX",     // (token, pool, amount, eth)
  "0x3ceb902d3c555c21c3415b6aa839104b18e4825b2f8324011ff979089a507a8c": "TokenQuoteSet",     // (token, quoteToken)
  "0x1546924f4680b1b2e093fd251c437c8781d81a21ed8ad1895e1f2c9b78db0cd0": "FlapTokenTaxSet",   // (token, tax bps)
  "0x6f10bbe11587431707df676556a0551025a4f66551acdddc5793389e20f0d46e": "TokenDexSupplyThreshSet", // (token, thresh)
  "0xcf2372b9357f0d392563d2cedb11e2b3bf0c14d2b8b75eb8bad073bbea9b0ff9": "TokenMigratorSet",  // (token, migratorType)
  "0xb1acc4d02e54a5f769cd0b689d82b8b5d5be55f2557a17d9d202e227cff2d335": "FlapTokenCLPoolCreated", // (token, poolId, sqrtPriceX96)
  "0x71a10912a55f73d3cced0d1515c2b33c396c80342522bad0e295ccbede556f37": "TokenCurveSetV2",
  "0xfaffa0863d521c9f92f81b87ff6e52ce5d5e2a4b856f15cbca113a69f0c813ee": "TokenDexPreferenceSet",
  "0x37502bf23c59a12e1036e7580a8dc056803623dbcd0885abb882adfa069ac89e": "TokenVersionSet",
};
export const flapStats = { byName: {}, unknown: {}, bad: 0 };

export function decodeFlap(l) {
  const name = T[l.topics[0]];
  if (!name) { flapStats.unknown[l.topics[0]] = (flapStats.unknown[l.topics[0]] || 0) + 1; return null; }
  flapStats.byName[name] = (flapStats.byName[name] || 0) + 1;
  const ix = l.topics.slice(1).map((t) => t.slice(2)), nWords = (l.data.length - 2) / 64;
  const arg = (i) => (i < ix.length ? ix[i] : word(l.data, i - ix.length));
  const base = { block: parseInt(l.blockNumber, 16), tx: l.transactionHash, li: parseInt(l.logIndex, 16) };
  try {
    switch (name) {
      case "TokenCreated":
        return { ...base, kind: "create", ts: Number(u(arg(0))), creator: addr(arg(1)), token: addr(arg(3)), name: str(l.data, 4 - ix.length), symbol: str(l.data, 5 - ix.length), meta: str(l.data, 6 - ix.length) };
      case "TokenBought": case "TokenSold": {
        if (nWords + ix.length < 7) { flapStats.bad++; return null; }
        const amount = ether(u(arg(3))), q = ether(u(arg(4))), price = ether(u(arg(6)));
        if (!(amount > 0) || !(q > 0) || !(price > 0)) { flapStats.bad++; return null; }
        return { ...base, kind: "trade", ts: Number(u(arg(0))), token: addr(arg(1)), wallet: addr(arg(2)), isBuy: name === "TokenBought", amount, quoteAmt: q, fee: ether(u(arg(5))), price };
      }
      case "LaunchedToDEX": return { ...base, kind: "grad", token: addr(arg(0)), pool: addr(arg(1)), amount: ether(u(arg(2))), quoteAmt: ether(u(arg(3))) };
      case "TokenQuoteSet": return { ...base, kind: "quote", token: addr(arg(0)), quote: addr(arg(1)) };
      case "FlapTokenTaxSet": return { ...base, kind: "tax", token: addr(arg(0)), bps: Number(u(arg(1))) };
      case "TokenDexSupplyThreshSet": return { ...base, kind: "thresh", token: addr(arg(0)), value: ether(u(arg(1))) };
      case "TokenMigratorSet": return { ...base, kind: "migrator", token: addr(arg(0)), type: Number(u(arg(1))) };
      case "FlapTokenCLPoolCreated": return { ...base, kind: "clpool", token: addr(arg(0)), poolId: "0x" + arg(1) };
      default: return null; // known but not needed
    }
  } catch { flapStats.bad++; return null; }
}
