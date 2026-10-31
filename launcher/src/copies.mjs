// launcher 0.2.0 (owner, 31 Oct 2026 09:45 UK: "find the runner … someone else with more money will launch the same name"): a PAPER test next to the
// live launcher. For every post we named, it searches GMGN for other pump.fun coins with the same name or ticker made from 1 minute before the post to
// 30 minutes after, at +1, +3, +5, +10 and +30 min, and records each copy (when it was made, early swaps, volume, holders, liquidity).
// At +3 min it makes two paper buys: (a) the first copy made, (b) the copy with the most early buying. At +65 min it scores them from GMGN's 1-minute
// candles (price at 5/15/30/60 min, peak, "2x or −50%", 40% trail), next to our own coin. Nothing is bought or sold — it only records. Read-only on GMGN.
import { gget, gmStat, N } from "./gmgn.mjs";

export const copyStat = { scans: 0, found: 0, picks: 0, scored: 0, errors: 0, lastErr: "", lastRaw: null };
const K = Number(process.env.LAUNCH_COPY_TIME_SCALE || 1); // tests only: shrink the schedule
const SCANS = [60, 180, 300, 600, 1800].map((x) => Math.round(x / K)), PICK_AT = Math.round(180 / K), SCORE_AFTER = Math.round(65 * 60 / K);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function initCopies(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS copies (launch_id INTEGER, mint TEXT, name TEXT, symbol TEXT, created_ts INTEGER, first_seen_ts INTEGER, last_seen_ts INTEGER,
    swaps_1h REAL, volume REAL, holders INTEGER, liquidity REAL, mc REAL, at3_swaps REAL, at3_volume REAL, ours INTEGER DEFAULT 0, PRIMARY KEY (launch_id, mint));
  CREATE TABLE IF NOT EXISTS copy_picks (launch_id INTEGER, kind TEXT, mint TEXT, name TEXT, entry_ts INTEGER, created_ts INTEGER, done INTEGER DEFAULT 0, err TEXT,
    entry_price REAL, x5 REAL, x15 REAL, x30 REAL, x60 REAL, peak60 REAL, x_tp2sl50 REAL, x_trail40 REAL, PRIMARY KEY (launch_id, kind));
  CREATE TABLE IF NOT EXISTS copy_jobs (launch_id INTEGER, due INTEGER, what TEXT, done INTEGER DEFAULT 0, PRIMARY KEY (launch_id, what));`);
}
/** Called once for every post that got a coin name (launched, test, paper or skipped as a repeat). */
export function scheduleCopies(db, L) {
  const t0 = Math.floor((L.t_post_ms || Date.now()) / 1000), ins = db.prepare("INSERT OR IGNORE INTO copy_jobs (launch_id, due, what) VALUES (?, ?, ?)");
  for (const s of SCANS) ins.run(L.id, t0 + s, "scan" + s);
  ins.run(L.id, t0 + PICK_AT + 5, "pick"); ins.run(L.id, t0 + PICK_AT + SCORE_AFTER, "score");
}

async function search(q) {
  const d = await gget("/v1/market/search", { q, chain: "sol" });
  if (!copyStat.lastRaw || (/"coins":\[\]/.test(copyStat.lastRaw) && (d?.coins || []).length)) copyStat.lastRaw = JSON.stringify(d).slice(0, 1500); // the first answer is kept, to check GMGN's fields
  return Array.isArray(d?.coins) ? d.coins : Array.isArray(d?.tokens) ? d.tokens : Array.isArray(d) ? d : [];
}
const tsOf = (c) => { const v = N(c.created_at) || N(c.creation_timestamp) || N(c.open_timestamp) || 0; return v > 1e12 ? Math.floor(v / 1000) : v; };

async function scan(db, L, s) {
  const t0 = Math.floor(L.t_post_ms / 1000), now = Math.floor(Date.now() / 1000), want = [norm(L.name), norm(L.ticker)].filter(Boolean);
  const seen = new Map();
  for (const q of [...new Set([L.name, L.ticker].filter(Boolean))]) for (const c of await search(q)) if (c?.address) seen.set(c.address, c);
  copyStat.scans++;
  const up = db.prepare(`INSERT INTO copies (launch_id, mint, name, symbol, created_ts, first_seen_ts, last_seen_ts, swaps_1h, volume, holders, liquidity, mc, at3_swaps, at3_volume, ours)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(launch_id, mint) DO UPDATE SET last_seen_ts=excluded.last_seen_ts, swaps_1h=excluded.swaps_1h, volume=excluded.volume,
    holders=excluded.holders, liquidity=excluded.liquidity, mc=excluded.mc, at3_swaps=COALESCE(copies.at3_swaps, excluded.at3_swaps), at3_volume=COALESCE(copies.at3_volume, excluded.at3_volume)`);
  for (const c of seen.values()) {
    const nm = norm(c.name), sy = norm(c.symbol), created = tsOf(c);
    if (!want.some((w) => w && (nm === w || sy === w || (w.length >= 5 && nm.includes(w))))) continue; // same name or ticker (a long name may sit inside a longer one)
    if (created && (created < t0 - 60 || created > t0 + 1800)) continue; // made around the post, not an old coin with the same name
    if (!created && s > SCANS[0]) continue; // unknown age: only trust what was already there at the first scan… and even that is marked by created_ts = 0
    const swaps = N(c.swaps_1h), vol = N(c.volume_24h) ?? N(c.volume), at3 = s === PICK_AT;
    up.run(L.id, c.address, String(c.name || "").slice(0, 60), String(c.symbol || "").slice(0, 20), created || 0, now, now, swaps, vol, N(c.holder_count), N(c.liquidity), N(c.market_cap) ?? N(c.usd_market_cap), at3 ? swaps : null, at3 ? vol : null, c.address === L.mint ? 1 : 0);
    copyStat.found++;
  }
}
function pick(db, L) {
  const rows = db.prepare("SELECT * FROM copies WHERE launch_id=? AND ours=0").all(L.id); if (!rows.length) return;
  const entry = Math.floor(Date.now() / 1000), ins = db.prepare("INSERT OR IGNORE INTO copy_picks (launch_id, kind, mint, name, entry_ts, created_ts) VALUES (?,?,?,?,?,?)");
  const dated = rows.filter((r) => r.created_ts > 0).sort((a, b) => a.created_ts - b.created_ts);
  if (dated[0]) ins.run(L.id, "first", dated[0].mint, dated[0].name, entry, dated[0].created_ts);
  const strong = [...rows].sort((a, b) => (b.at3_volume ?? b.volume ?? 0) - (a.at3_volume ?? a.volume ?? 0) || (b.at3_swaps ?? b.swaps_1h ?? 0) - (a.at3_swaps ?? a.swaps_1h ?? 0))[0];
  if (strong) ins.run(L.id, "strongest", strong.mint, strong.name, entry, strong.created_ts);
  copyStat.picks++;
}
async function score(db, L) {
  for (const p of db.prepare("SELECT * FROM copy_picks WHERE launch_id=? AND done=0").all(L.id)) {
    try {
      const d = await gget("/v1/market/token_kline", { chain: "sol", address: p.mint, resolution: "1m", from: String((p.entry_ts - 120) * 1000), to: String((p.entry_ts + 62 * 60) * 1000) });
      const path = (d?.list || (Array.isArray(d) ? d : [])).map((c) => ({ t: Math.floor(Number(c.time) / 1000), o: N(c.open), h: N(c.high), l: N(c.low), c: N(c.close) })).filter((c) => c.h > 0).sort((a, b) => a.t - b.t);
      const start = path.filter((c) => c.t <= p.entry_ts).pop() || path[0];
      if (!start) { db.prepare("UPDATE copy_picks SET done=1, err=? WHERE launch_id=? AND kind=?").run("no candles", p.launch_id, p.kind); continue; }
      const e = start.c, X = (v) => v / e, after = path.filter((c) => c.t >= start.t), at = (m) => { const c = after.filter((x) => x.t <= p.entry_ts + m * 60).pop(); return c ? X(c.c) : null; };
      const peak = Math.max(...after.map((c) => X(c.h)));
      let tp = null; for (const c of after.slice(1)) { if (X(c.l) <= 0.5) { tp = 0.5; break; } if (X(c.h) >= 2) { tp = 2; break; } } if (tp == null) tp = X(after[after.length - 1].c);
      let hi = 1, trail = null; for (const c of after.slice(1)) { if (X(c.l) <= hi * 0.6) { trail = hi * 0.6; break; } hi = Math.max(hi, X(c.h)); } if (trail == null) trail = X(after[after.length - 1].c);
      db.prepare("UPDATE copy_picks SET done=1, entry_price=?, x5=?, x15=?, x30=?, x60=?, peak60=?, x_tp2sl50=?, x_trail40=? WHERE launch_id=? AND kind=?").run(e, at(5), at(15), at(30), at(60), peak, tp, trail, p.launch_id, p.kind);
      copyStat.scored++;
    } catch (er) { if (/rate limited/i.test(er.message)) throw er; db.prepare("UPDATE copy_picks SET done=1, err=? WHERE launch_id=? AND kind=?").run(er.message.slice(0, 120), p.launch_id, p.kind); }
  }
}
let running = false;
/** Runs due jobs; called every 20 s. */
export async function copyTick(db) {
  if (running) return; running = true;
  try {
    for (const j of db.prepare("SELECT * FROM copy_jobs WHERE done=0 AND due<=? ORDER BY due LIMIT 10").all(Math.floor(Date.now() / 1000))) {
      const L = db.prepare("SELECT * FROM launches WHERE id=?").get(j.launch_id);
      try { if (L?.name) { if (j.what.startsWith("scan")) await scan(db, L, Number(j.what.slice(4))); else if (j.what === "pick") pick(db, L); else if (j.what === "score") await score(db, L); } }
      catch (e) { copyStat.errors++; copyStat.lastErr = `${j.what}: ${e.message}`.slice(0, 160); if (/rate limited/i.test(e.message)) break; }
      db.prepare("UPDATE copy_jobs SET done=1 WHERE launch_id=? AND what=?").run(j.launch_id, j.what);
    }
  } finally { running = false; }
}
export const copyStatus = () => ({ ...copyStat, gmgn: gmStat });
