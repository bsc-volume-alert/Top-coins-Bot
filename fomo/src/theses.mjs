// Theses: stored beside the trade they went with and scored at 1 h / 6 h / 24 h. Stage 1 has no live source: cope.capital's API
// (api.cope.capital) did not resolve on 21 Oct 2026 (NXDOMAIN). The client below is kept behind COPE_KEY so a working source can be
// plugged in without touching the page; nothing here runs without a key, and nothing breaks if the source stays dead.
import { CFG } from "./config.mjs";
export const th = { polls: 0, errors: 0, stored: 0, lastErr: "", note: "" };
const TYPES = [["team/dev", /\b(dev|team|founder|doxx|kol|builder|ship)/i], ["chart", /\b(chart|support|resist|breakout|break out|higher low|wick|candle|ath|retest)/i], ["insider claim", /\b(insider|inside info|heard from|source says|trust me|big news coming|announcement soon|wallets? (are )?loading)/i], ["narrative", /\b(narrative|meta|trend|cult|community|meme|viral|tiktok|twitter|x\.com|celebrity|elon|trump)/i]];
export const typeOf = (text) => (TYPES.find(([, re]) => re.test(text || "")) || ["other"])[0];
export const thesesStatus = () => ({ ...th, note: CFG.COPE_KEY ? th.note : "No thesis source yet: cope.capital's API did not resolve on 21 Oct 2026. Theses are recorded when a source exists; they never trigger trades." });
export function startTheses() {
  if (!CFG.COPE_KEY) return;
  // when a source works: poll each watched handle's theses every 5 min, link each to the nearest buy within ±10 min, type it, score it from prices.
  th.note = "COPE_KEY set but no working endpoint; nothing polled.";
}
export const insThesis = (handle, ts, mint, chain, text, tradeId, px0, source) => { try { th.stored++; return db.prepare(`INSERT INTO theses (handle, ts, mint, chain, text, type, trade_id, px0, source) VALUES (?,?,?,?,?,?,?,?,?)`).run(handle, ts, mint, chain, text, typeOf(text), tradeId, px0, source); } catch (e) { th.errors++; th.lastErr = e.message; return null; } };
