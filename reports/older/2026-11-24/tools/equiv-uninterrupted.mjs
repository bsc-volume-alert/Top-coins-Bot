// Evidence that ORDINARY, UNINTERRUPTED behaviour is unchanged by the corrections to older-10.
// A deterministic, strictly chronological synthetic market (no store, no fixtures from test/helpers.mjs) is driven through the
// PRODUCTION Engine of whichever checkout is given, in the order that checkout's own feed uses:
//   3537ada   : engine.noteLag(t, lag) then the transaction's events
//   corrected : engine.tx(t, lag, () => events)
// The stream is measured 1.0–1.3 s behind on every transaction and never interrupted; every coin is a classic SPL token.
// Output: counts and a SHA-256 of the complete ledger (every entry, every stop × exit row, fills, exits, flags), with the
// fields that did not exist at 3537ada removed. Equal hashes = identical ledgers.
// Usage: [EQ_FIRST=0] [EQ_DUMP=ledger.jsonl] node equiv-uninterrupted.mjs <path to older/> [coins=200] [hours=8]
import { createHash } from "node:crypto"; import { pathToFileURL } from "node:url"; import path from "node:path";
const root = path.resolve(process.argv[2]), N = Number(process.argv[3] || 200), HOURS = Number(process.argv[4] || 8);
const { Engine } = await import(pathToFileURL(root + "/src/engine.mjs")); const R = await import(pathToFileURL(root + "/src/risk.mjs"));
const T0 = 1_800_000_000, H = 3600, BASE = 2e8; let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
// COMPLETE LEDGER (Codex's second review, point 4): the engine drops a finished entry from memory once it has been handed to
// the store ("finished entries live in the database only"), so hashing engine.entries alone leaves finished entries out.
// A stand-in store keeps every entry it is handed (by reference: a finished entry is never touched again after its last
// save, and an unfinished one is read in its current state at the end); every other store call is a no-op.
const saved = new Map(); const store = new Proxy({}, { get: (_, k) => (k === "saveEntry" ? (x) => { saved.set(x.id, x); } : k === "tx" ? (f) => f() : () => undefined) });
const e = new Engine({ store, solUsd: () => 100 }); e.feedUp(T0);
// EQ_FIRST=0 leaves the connection unmeasured until the first market transaction (T0 + ~1 s). Default: one transaction that
// carries only a delay measurement arrives at T0 itself, so both checkouts start their price history at the same instant
// (3537ada back-dated the start to the connect; the corrected code starts it at the first measurement — see RESPONSE-3, 4.1).
if (process.env.EQ_FIRST !== "0") (e.tx ? e.tx(T0, 1) : e.noteLag(T0, 1));
const coins = Array.from({ length: N }, (_, i) => ({ mint: "Eq" + i + "pump", pool: "Pool" + i, mc: 15_000 + rnd() * 400_000, drift: 0, next: T0 + 1 + rnd() * 20 }));
for (const c of coins) Object.assign(e.coin(c.mint, { pool: c.pool, createTs: T0 - (1 + rnd() * 60) * H }).info, { token_program: R.SPL_TOKEN });
const tx = (t, lag, evs) => (e.tx ? e.tx(t, lag, () => { for (const x of evs) e.onSwap(x); }) : (e.noteLag(t, lag), evs.forEach((x) => e.onSwap(x))));
let n = 0, tick = T0 + 1; const END = T0 + HOURS * H;
for (;;) {
  let c = coins[0]; for (const x of coins) if (x.next < c.next) c = x; const t = c.next; if (t >= END) break;
  while (tick <= t) { e.tick(tick); if (tick % 60 === 0) e.prune?.(tick); tick += 1; }
  const u = rnd(); if (u < 0.004) c.drift = 0.03 + rnd() * 0.05; else if (u < 0.008) c.drift = -(0.03 + rnd() * 0.05); else if (u < 0.05) c.drift = 0; // runs up, dumps, calm
  c.mc = Math.min(5_000_000, Math.max(6_000, c.mc * (1 + c.drift + (rnd() - 0.5) * 0.04))); if (c.mc >= 5_000_000) c.drift = -0.04;
  tx(t, 1 + rnd() * 0.3, [{ t, mint: c.mint, pool: c.pool, base: BASE, quote: (c.mc / 1e11) * BASE, feeBps: 30, sol: 0.05 + rnd() * 3, isBuy: rnd() < 0.55, user: "w" + Math.floor(rnd() * 400) }]); n++;
  c.next = t + 0.4 + rnd() * (c.drift ? 6 : 40);
}
const NEW = new Set(["risk_read_at", "risk_age_s", "riskAfter", "eval_t", "st_sig", "st_slot"]); // fields added after 3537ada, and eval_t — the wall-clock time of the evaluation (Date.now()), different on every run of the same code
const strip = (o) => Array.isArray(o) ? o.map(strip) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().filter((k) => !NEW.has(k)).map((k) => [k, strip(o[k])])) : o;
for (const x of e.entries.values()) saved.set(x.id, x); // still in memory: their current state
const inMemory = e.entries.size, ents = [...saved.values()].sort((p, q) => p.id - q.id), led = JSON.stringify(ents.map(strip)), rows = ents.flatMap((x) => x.versions ?? []);
if (process.env.EQ_DUMP) (await import("node:fs")).writeFileSync(process.env.EQ_DUMP, ents.map((x) => JSON.stringify(strip(x))).join("\n")); // one entry per line, for a line diff
console.log(JSON.stringify({ code: root, first_measurement_at_connect: process.env.EQ_FIRST !== "0", coins: N, hours: HOURS, transactions: n, entries: ents.length, entries_made: e.stats.entries, finished_and_dropped_from_memory: ents.length - inMemory, filled: ents.filter((x) => x.status === "filled").length, cancelled: ents.filter((x) => x.status === "cancelled").length,
  rows: rows.length, rows_closed: rows.filter((v) => v.status === "closed").length, proceeds_sol_closed: +rows.filter((v) => v.status === "closed").reduce((a, v) => a + (v.exit?.sol ?? 0), 0).toFixed(9),
  stream_gaps: e.cov.gapsIn(T0 + 1, END).length, ledger_bytes: led.length, ledger_sha256: createHash("sha256").update(led).digest("hex") }));
