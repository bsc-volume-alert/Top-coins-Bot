// Launch quality of a coin, from the tracker's own database (read-only): bundle share and wallets at launch, dev buy, the creator's prior
// launches and their best peak, latest top-10 holder share and holder count, age since creation. Stamped on every book entry (owner's go,
// 23 Oct 2026 07:27 UK) so winners and losers can be split by launch quality. Missing data is left null — never guessed.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
const PATH = process.env.TRACKER_DB_PATH || "/root/tracker/data/tracker.db";
let tdb = null, qs = null;
function open() {
  if (tdb) return true; if (!existsSync(PATH)) return false;
  try {
    tdb = new Database(PATH, { readonly: true, fileMustExist: true }); tdb.pragma("busy_timeout = 2000");
    qs = {
      token: tdb.prepare(`SELECT creator, create_ts, bundle_pct, bundle_wallets, dev_buy_sol FROM tokens WHERE mint=?`),
      creator: tdb.prepare(`SELECT COUNT(*) n, MAX(peak_mc_usd) best FROM tokens WHERE creator=? AND create_ts<?`),
      life: tdb.prepare(`SELECT top10_pct, holders FROM token_life WHERE mint=? AND top10_pct IS NOT NULL ORDER BY cp DESC LIMIT 1`),
    };
    return true;
  } catch (e) { console.error("[launch] cannot open tracker db:", e.message); tdb = null; return false; }
}
/** @returns {{bundle, bwallets, dev, creator_n, creator_best, top10, holders, age_s, src}|null} */
export function launchInfo(mint, now) {
  if (!open()) return null;
  try {
    const t = qs.token.get(mint); if (!t) return { src: "not in tracker" };
    const c = t.creator ? qs.creator.get(t.creator, t.create_ts || now) : null; const l = qs.life.get(mint);
    return { bundle: t.bundle_pct ?? null, bwallets: t.bundle_wallets ?? null, dev: t.dev_buy_sol ?? null, creator_n: c?.n ?? null, creator_best: c?.best ?? null, top10: l?.top10_pct ?? null, holders: l?.holders ?? null, age_s: t.create_ts ? now - t.create_ts : null, src: "tracker" };
  } catch (e) { return { src: "error: " + e.message.slice(0, 40) }; }
}
