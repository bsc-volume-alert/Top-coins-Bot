// study-family.mjs — READ-ONLY study of one book: the price path of every filled buy, from the stored one-minute bars.
//   node older/scripts/study-family.mjs [FAMILY=HH-BREAK] [run=shakedown]
// Opens the database read-only (the running bot is not touched), writes <OUT>/pub/study-<FAMILY>.json (picked up by the
// 10-minute publisher) and prints a short summary. No key is read or written. Minute bars are a coarser record than the live
// feed: multiples here are bar closes / highs against the signal price — good for "when did it peak, what was it worth after
// N hours", not for exact fills.
import Database from "better-sqlite3";
import { writeFileSync, mkdirSync } from "node:fs";
const FAM = process.argv[2] || "HH-BREAK", RUN = process.argv[3] || "shakedown", OUT = process.env.OLDER_OUT || "/mnt/volume_1794164707392/older";
const db = new Database(`${OUT}/older-${RUN}.db`, { readonly: true, fileMustExist: true });
const now = Date.now() / 1000, CK = [5, 15, 30, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720, 960, 1200, 1440], r3 = (x) => (x == null || !isFinite(x) ? null : +x.toFixed(3));
const bars = db.prepare("SELECT m, h, l, c, v FROM bars WHERE mint = ? AND m >= ? ORDER BY m");
const out = [];
for (const row of db.prepare("SELECT json FROM entries WHERE status = 'filled'").all()) {
  const e = JSON.parse(row.json); if (!e.families?.includes(FAM) || !e.fill || !(e.signalPx > 0)) continue;
  const m0 = Math.floor(e.fill.t / 60), bs = bars.all(e.mint, m0), px = e.signalPx, age = Math.floor((now - e.fill.t) / 60);
  let peak = 1, peakMin = 0, vol = 0; const at = {}, hiAfter = {}; let last = 1, i = 0;
  for (const k of CK) { if (k > age) break; while (i < bs.length && bs[i].m - m0 <= k) { const b = bs[i], x = b.h / px; if (x > peak) { peak = x; peakMin = b.m - m0; } last = b.c / px; vol += b.v; i++; } at[k] = r3(last); }
  for (; i < bs.length; i++) { const b = bs[i], x = b.h / px; if (x > peak) { peak = x; peakMin = b.m - m0; } last = b.c / px; vol += b.v; }
  for (const k of [60, 120, 180, 240, 360, 480]) { if (k > age) break; let h = null; for (const b of bs) if (b.m - m0 > k && (h === null || b.h > h)) h = b.h; hiAfter[k] = h === null ? null : r3(h / px); } // the best price seen AFTER k minutes
  const ver = {}; for (const v of e.versions || []) { if (v.stall) continue; ver[(v.policy === "trail" ? "t" : "h") + Math.round(v.stop * 100)] = { st: v.status, ret: r3(v.exit?.ret), hold_m: v.exit ? Math.round(v.exit.hold_s / 60) : null, why: v.reason ?? null, now_x: v.exit ? null : r3(v.lastX), max_x: r3(v.maxX) }; }
  out.push({ id: e.id, sym: e.token?.symbol ?? null, mint: e.mint.slice(0, 8), ag: e.ag, fill_t: Math.round(e.fill.t), age_min: age, mc: Math.round(e.signalMc), fams: e.families.length, max_x: r3(e.runner?.maxX), reached: e.runner?.reached ?? {}, bars: bs.length, vol_usd_after: Math.round(vol), peak: r3(peak), peak_min: peakMin, last: r3(last), at, hi_after: hiAfter, ver, v5: e.features?.w5?.vol_usd ?? null });
}
mkdirSync(`${OUT}/pub`, { recursive: true }); const file = `${OUT}/pub/study-${FAM}.json`;
writeFileSync(file, JSON.stringify({ family: FAM, run: RUN, at: Math.round(now), n: out.length, checkpoints_min: CK, entries: out }));
const open = out.filter((x) => x.ver.t40 && x.ver.t40.st !== "closed").length, pk = out.map((x) => x.peak_min).sort((a, b) => a - b);
console.log(`${FAM}: ${out.length} filled buys written to ${file} (${open} still open on the 40% stop; median minutes to the highest price ${pk.length ? pk[pk.length >> 1] : "-"}). It will be published within 10 minutes.`);
