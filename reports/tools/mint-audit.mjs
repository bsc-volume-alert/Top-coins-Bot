// mint-audit.mjs — 10 Nov 2026 (Codex 01:59: audit 3FRaTecs and CRWuYpES). READ-ONLY. For the mints in env AUDIT_MINTS (comma-separated prefixes or
// full mints) writes CSVs of every stored row about them: tracker trades / tokens / token_life / token_cp_clock, and launcher chain_fill / vol_paper /
// kpaper_decisions, into the directory given as argv[2]. Nothing is changed.
import Database from "better-sqlite3"; import { writeFileSync } from "node:fs";
const OUT = process.argv[2], PFX = (process.env.AUDIT_MINTS || "").split(",").filter(Boolean);
const t = new Database("/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); t.pragma("busy_timeout = 5000");
const l = new Database("/root/launcher/launcher.db", { readonly: true, fileMustExist: true }); l.pragma("busy_timeout = 5000");
const csv = (rows) => { if (!rows.length) return ""; const h = Object.keys(rows[0]); const e = (v) => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v); return [h.join(","), ...rows.map((r) => h.map((k) => e(r[k])).join(","))].join("\n") + "\n"; };
const mints = [];
for (const p of PFX) { const m = l.prepare("SELECT DISTINCT mint FROM vol_paper WHERE mint LIKE ?").all(p + "%").map((x) => x.mint); mints.push(...(m.length ? m : t.prepare("SELECT mint FROM tokens WHERE mint LIKE ? LIMIT 1").all(p + "%").map((x) => x.mint))); }
const q = (db, sql) => mints.flatMap((m) => db.prepare(sql).all(m));
const W = (name, rows) => writeFileSync(`${OUT}/${name}.csv`, csv(rows));
W("tokens", q(t, "SELECT * FROM tokens WHERE mint=?"));
W("trades", q(t, "SELECT rowid AS row_id, * FROM trades WHERE mint=? ORDER BY slot, ev_idx, rowid"));
W("token_life", q(t, "SELECT * FROM token_life WHERE mint=? ORDER BY cp"));
try { W("token_cp_clock", q(t, "SELECT * FROM token_cp_clock WHERE mint=?")); } catch {}
W("chain_fill", q(l, "SELECT * FROM chain_fill WHERE mint=?"));
W("vol_paper", q(l, "SELECT * FROM vol_paper WHERE mint=?"));
try { W("kpaper_decisions", q(l, "SELECT * FROM kpaper_decisions WHERE mint=?")); } catch {}
const gaps = t.prepare("SELECT ts, event, detail FROM feed_gaps WHERE ts BETWEEN ? AND ? ORDER BY ts").all(Math.min(...q(t, "SELECT create_ts FROM tokens WHERE mint=?").map((x) => x.create_ts)) - 600, Math.floor(Date.now() / 1000));
W("feed_gaps", gaps.map((g) => ({ ...g, detail: String(g.detail).replace(/api-key=[^ ]*/g, "api-key=***") })));
writeFileSync(`${OUT}/MANIFEST.txt`, `mint-audit ${new Date().toISOString()} mints: ${mints.join(" ")}\n`);
console.log("[audit] mints", mints.length);
