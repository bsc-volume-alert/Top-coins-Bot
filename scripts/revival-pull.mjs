// v0.18.154 (owner, 20 Oct 09:07 UK): the revival back-test. Pokémon (D42T…) sat at ~$50K for a day, then ran to $2.1M. To test
// "catch the revival" honestly we need the long price history of EVERY coin that could have revived, not just the ones we remember.
// This one-off job pulls 5-minute GMGN candles for every coin that graduated since 18 Oct 00:00 UTC, from launch to now, and writes them
// to data/revival_klines.jsonl.gz (one coin per line). Read-only on the bot: opens the tracker DB read-only, uses only GMGN market data.
// Run by deploy-step.sh when scripts/job-now.txt changes; push-data.sh then publishes the file on the data branch.
import "../src/env.js";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { createGzip } from "node:zlib";
import { createWriteStream, renameSync } from "node:fs";

const KEY = process.env.GMGN_API_KEY || "";
if (!KEY) { console.error("[revival] GMGN_API_KEY not set"); process.exit(1); }
const DB = process.env.DB_PATH || "/root/tracker/data/tracker.db";
const FROM = Number(process.env.FROM_TS || Date.UTC(2026, 9, 18, 0, 0) / 1000);
const OUT = process.env.OUT || "/root/tracker/data/revival_klines.jsonl.gz";
const HOST = "https://openapi.gmgn.ai";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const db = new Database(DB, { readonly: true, fileMustExist: true });
const coins = db.prepare(`SELECT mint, name, symbol, create_ts, peak_mc_usd FROM tokens WHERE graduated=1 AND create_ts>=? ORDER BY create_ts`).all(FROM);
console.log(`[revival] ${coins.length} graduated coins since ${new Date(FROM * 1000).toISOString()}`);

let dbg = 0, MS = false;
async function kline(mint, from, to) {
  if (MS) { from *= 1000; to *= 1000; }
  for (let attempt = 0; attempt < 4; attempt++) {
    const q = new URLSearchParams({ chain: "sol", address: mint, resolution: "5m", from: String(from), to: String(to), timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() });
    try {
      const r = await fetch(`${HOST}/v1/market/token_kline?${q}`, { headers: { "X-APIKEY": KEY, "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
      const txt = await r.text(); if (dbg < 4) { dbg++; console.log(`[revival] debug ${MS ? "ms" : "s"} HTTP ${r.status}: ${txt.slice(0, 700)}`); }
      const j = JSON.parse(txt);
      if (r.status === 429 || /RATE_LIMIT/.test(j.error || "")) { await sleep(5000 * (attempt + 1)); continue; }
      if (j.code !== 0) return { err: `${j.error || j.code}` };
      const d = j.data?.data && !Array.isArray(j.data.data) ? j.data.data : j.data;
      return { list: d?.list || (Array.isArray(d) ? d : []) };
    } catch (e) { await sleep(2000); if (attempt === 3) return { err: e.message }; }
  }
  return { err: "rate limited" };
}

// v0.18.155: the first run got 0 candles for all 1,860 coins — find the time unit that works on a known coin (Pokémon) first
const probeS = await kline("D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1", Math.floor(Date.now() / 1000) - 86400, Math.floor(Date.now() / 1000));
if (!probeS.list?.length) { MS = true; const probeM = await kline("D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1", Math.floor(Date.now() / 1000) - 86400, Math.floor(Date.now() / 1000)); console.log(`[revival] probe: seconds ${probeS.list?.length ?? probeS.err} · ms ${probeM.list?.length ?? probeM.err}`); if (!probeM.list?.length) { console.log("[revival] no candles either way - stopping"); process.exit(1); } } else console.log(`[revival] probe: seconds ok, ${probeS.list.length} candles`);
const gz = createGzip(), tmp = OUT + ".tmp", ws = createWriteStream(tmp); gz.pipe(ws);
const now = Math.floor(Date.now() / 1000); let ok = 0, fail = 0, candles = 0;
for (const [i, c] of coins.entries()) {
  // v0.18.156: GMGN returns at most 100 candles a call (the LAST 100 in the window), so page backwards: 100 x 5 min = 500 min a page, from now back to launch
  const all = []; let err = null;
  for (let to = now; to > c.create_ts - 300; to -= 100 * 300) { // fixed 500-min pages, newest first; an empty page is a quiet spell, not the end
    const r = await kline(c.mint, Math.max(c.create_ts - 300, to - 100 * 300), to); await sleep(150);
    if (r.err) { err = r.err; break; }
    all.push(...r.list);
  }
  if (err && !all.length) fail++; else ok++;
  candles += all.length;
  gz.write(JSON.stringify({ mint: c.mint, name: c.name, symbol: c.symbol, create_ts: c.create_ts, peak_mc_usd: c.peak_mc_usd, err, k: all }) + "\n");
  if (i % 50 === 0) console.log(`[revival] ${i}/${coins.length} · ok ${ok} · failed ${fail} · candles ${candles}`);
}
gz.end(); await new Promise((r) => ws.on("finish", r)); renameSync(tmp, OUT);
console.log(`[revival] done: ${ok} coins, ${fail} failed, ${candles} candles → ${OUT}`);
