// v0.18.6: lower-volume variants of the momentum rule ($60K and $80K in 5 min by default), run as independent silent paper
// strategies "mom60" / "mom80" with the same sanity gates as momentum (trades, wallets, age, buy/sell ratio, MC cap, cooldown)
// so the hit rates can be compared like for like against the $100K rule. Alerts: none. Exits: the shared set.
import { CFG } from "./config.js";
import { q } from "./db.js";
import { onSwap } from "./pumpswap.js";
import { solUsdCached } from "./price.js";
import { openCopy } from "./copytrade.js";
const S = new Map(); // mint -> {w5:[], last:{tier: ts}}
export const mt = { entries: 0 };
setInterval(() => { const now = Math.floor(Date.now() / 1000); for (const [m, s] of S) if (now - (s.ts || 0) > 900) S.delete(m); }, 60_000);
onSwap((tr) => {
  const usd = tr.sol * solUsdCached(); if (!(usd > 0)) return;
  const now = tr.ts || Math.floor(Date.now() / 1000);
  let s = S.get(tr.mint); if (!s) { s = { w5: [], last: {} }; S.set(tr.mint, s); }
  s.ts = now; s.w5.push({ ts: now, usd, b: tr.isBuy, w: tr.wallet }); while (s.w5.length && now - s.w5[0].ts > 300) s.w5.shift();
  const v5 = s.w5.reduce((a, x) => a + x.usd, 0);
  for (const tier of CFG.MOM_TIERS) {
    if (v5 < tier || v5 >= CFG.VOL5M_USD) continue; // once it is a full momentum trigger, momentum owns it
    if (now - (s.last[tier] || 0) < CFG.MOM_COOLDOWN_MIN * 60) continue;
    if (tr.mc > CFG.MOM_PAPER_MC_CAP || tr.mc <= 0) continue;
    if (s.w5.length < CFG.MOM_MIN_TRADES5 || new Set(s.w5.map((x) => x.w)).size < CFG.MOM_MIN_WALLETS5) continue;
    const meta = q.tokenMeta.get(tr.mint); if (meta?.create_ts && now - meta.create_ts < CFG.MOM_MIN_AGE_S) continue;
    const bu = s.w5.filter((x) => x.b).reduce((a, x) => a + x.usd, 0), su = v5 - bu; if (su > 0 && bu / su < CFG.MOM_BS_MIN) continue;
    s.last[tier] = now; mt.entries++;
    const kind = "mom" + Math.round(tier / 1000);
    try { openCopy(kind, `$${Math.round(tier / 1000)}K`, tr.mint, meta?.name || tr.mint.slice(0, 8), meta?.symbol || "", tr.price, tr.mc, now, { ageS: meta?.create_ts ? now - meta.create_ts : null, buyers: new Set(s.w5.filter((x) => x.b).map((x) => x.w)).size, bs: su > 0 ? bu / su : null, v5, venue: tr.venue }); } catch (e) { console.error("[momtiers]", e.message); }
  }
});
