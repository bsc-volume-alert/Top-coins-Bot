// v0.18.84: restart history → quarantine flags on paper trades.
// data/restarts.txt holds one epoch second per bot start (seeded from the pm2 log; the bot appends its own boots from now on).
//   restart_span = how many restarts happened while the trade was open (deploy restarts blind the bot ~5 s and reset the runner's volume window)
//   crashloop    = 1 when the trade was open during a crash loop (≥ 4 restarts no more than 150 s apart) — excluded from every website figure and test
import { readFileSync, appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CFG } from "./config.js";
import { db } from "./db.js";
import { tgAlarm as tg } from "./telegram.js"; // v0.18.91: the restart-loop alarm is an alarm
export const RESTARTS_FILE = join(dirname(CFG.DB_PATH), "restarts.txt");
const LOOP_GAP_S = 150, LOOP_MIN = 4, PAD_BEFORE = 60, PAD_AFTER = 120;
let TS = [];
function load() { try { TS = [...new Set(readFileSync(RESTARTS_FILE, "utf8").split(/\s+/).map(Number).filter((n) => n > 1.7e9))].sort((a, b) => a - b); } catch { TS = []; } }
export function recordBoot() { const now = Math.floor(Date.now() / 1000); try { mkdirSync(dirname(RESTARTS_FILE), { recursive: true }); appendFileSync(RESTARTS_FILE, now + "\n"); } catch (e) { console.error("[restarts]", e.message); } load(); }
export function loopWindows() {
  const W = []; if (!TS.length) return W; let run = [TS[0]];
  for (let i = 1; i <= TS.length; i++) {
    const t = TS[i];
    if (t != null && t - TS[i - 1] <= LOOP_GAP_S) { run.push(t); continue; }
    if (run.length >= LOOP_MIN) W.push([run[0] - PAD_BEFORE, run[run.length - 1] + PAD_AFTER, run.length]);
    run = [t];
  }
  return W;
}
const bisect = (t) => { let lo = 0, hi = TS.length; while (lo < hi) { const m = (lo + hi) >> 1; if (TS[m] < t) lo = m + 1; else hi = m; } return lo; };
export const restartsBetween = (a, b) => Math.max(0, bisect(b + 1) - bisect(a));
export const restartStats = () => ({ restarts: TS.length, loops: loopWindows().map(([a, b, n]) => ({ from: a, to: b, restarts: n })) });
let qRows, qSet;
/** Flag every trade entered since `sinceTs` plus every open trade and every trade not flagged yet. Returns rows changed. */
export function flagTrades(sinceTs = 0) {
  if (!TS.length) return 0;
  qRows ??= db.prepare(`SELECT id, entry_ts, exit_ts, closed FROM paper_trades WHERE entry_ts > 0 AND (entry_ts >= ? OR COALESCE(closed,0)=0 OR restart_span IS NULL OR crashloop IS NULL)`);
  qSet ??= db.prepare(`UPDATE paper_trades SET restart_span=?, crashloop=? WHERE id=? AND (restart_span IS NOT ? OR crashloop IS NOT ?)`);
  const now = Math.floor(Date.now() / 1000), W = loopWindows(); let n = 0;
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      const a = r.entry_ts, b = r.closed ? Math.max(a, r.exit_ts || a) : now;
      const span = restartsBetween(a, b), loop = W.some(([x, y]) => a <= y && b >= x) ? 1 : 0;
      n += qSet.run(span, loop, r.id, span, loop).changes;
    }
  });
  try { tx(qRows.all(sinceTs)); } catch (e) { console.error("[restarts flag]", e.message); }
  return n;
}

/** v0.18.85 loop alarm: ≥ 3 starts in the last 10 minutes → Telegram, at most once per 30 min (data/restart-alarm.txt remembers the last one). */
export function loopAlarm() {
  const now = Math.floor(Date.now() / 1000), recent = restartsBetween(now - 600, now);
  if (recent < 3) return false;
  const f = join(dirname(RESTARTS_FILE), "restart-alarm.txt"); let last = 0; try { last = Number(readFileSync(f, "utf8")) || 0; } catch {}
  if (now - last < 1800) return true;
  try { writeFileSync(f, String(now)); } catch {}
  tg(`🚨 <b>Bot restart loop</b> — ${recent} starts in the last 10 minutes (${restartsBetween(now - 86400, now)} in 24 h). Trades open now are being flagged <code>crashloop</code>. Check <code>pm2 logs tracker --err</code>.`).catch(() => {});
  return true;
}
export const restarts24 = () => { const now = Math.floor(Date.now() / 1000); return restartsBetween(now - 86400, now); };
