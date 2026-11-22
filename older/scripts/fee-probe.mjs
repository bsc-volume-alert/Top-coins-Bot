// fee-probe.mjs — READ-ONLY measurement: does a Jupiter quote already include a coin's Token-2022 transfer fee?
//   node older/scripts/fee-probe.mjs [run=shakedown] [how-many=8]
// For a few coins with a known transfer fee, and a few without one as a control, it asks Jupiter for (1) the price, (2) a quote to
// buy with 0.2 SOL, (3) a quote to sell exactly the tokens that buy quote promised. Nothing is bought, sold, signed or sent: these
// are the same quote requests the paper bot already makes. The database is opened read-only. No key is printed or written.
// HOW TO READ IT: the round trip (SOL back ÷ SOL in) always loses two pool fees and some price impact. If quotes ALREADY INCLUDE
// the coin's fee, a fee coin loses about 2 × its fee MORE than the control coins do; if they do NOT, it loses about the same.
// Output: a table on screen and <OUT>/pub/fee-probe.json (picked up by the 10-minute publisher).
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
for (const f of [process.env.OLDER_ENV || "/root/older/.env", "/root/tracker/.env"]) if (existsSync(f)) for (const l of readFileSync(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const { default: Database } = await import("better-sqlite3"); const J = await import("../src/jupiter.mjs");
const RUN = process.argv[2] || "shakedown", N = Number(process.argv[3] || 8), OUT = process.env.OLDER_OUT || "/mnt/volume_1794164707392/older", STAKE = 0.2;
const db = new Database(`${OUT}/older-${RUN}.db`, { readonly: true, fileMustExist: true });
const fee = [], plain = [];
for (const r of db.prepare("SELECT mint, info FROM coins WHERE info LIKE ?").iterate("%solana-wide%")) { let k; try { k = JSON.parse(r.info); } catch { continue; } if (!Number.isInteger(k.decimals) || k.unpriced || k.pruned_low) continue;
  const rk = k.risk || {}, m = (rk.blocking || []).map((b) => /^transferFee (\d+) bps$/.exec(b)).find(Boolean), bps = rk.fee_bps > 0 ? rk.fee_bps : m ? Number(m[1]) : 0, other = (rk.blocking || []).some((b) => !/^transferFee /.test(b));
  if (bps > 0 && bps <= 1000 && !other) fee.push({ mint: r.mint, sym: k.symbol ?? null, dec: k.decimals, bps, origin: k.origin ?? null });
  else if (!bps && (rk.status === "clean" || rk.status === "flagged") && rk.src === "rpc mint account") plain.push({ mint: r.mint, sym: k.symbol ?? null, dec: k.decimals, bps: 0, origin: k.origin ?? null }); }
fee.sort((a, b) => b.bps - a.bps); // the largest fees first: they separate the two cases most clearly
const pct = (x) => (x == null ? "  n/a" : (x * 100).toFixed(2).padStart(6) + "%"), rows = []; let keys = null;
async function one(c, kind) {
  const p = await J.prices([c.mint, J.WSOL]).catch(() => null), px = p?.prices.get(c.mint)?.px ?? null, sol = p?.prices.get(J.WSOL)?.px ?? null; if (!(px > 0)) return null; // not priced now: skip
  const b = await J.quote(c.mint, "buy", STAKE * 1e9); if (!b.ok) return { ...c, kind, err: "buy: " + b.why };
  const s = await J.quote(c.mint, "sell", b.out); if (!s.ok) return { ...c, kind, err: "sell: " + s.why }; keys ??= b.keys;
  const tok = b.out / 10 ** c.dec, back = s.out / 1e9;
  return { ...c, kind, round_trip_loss: +(1 - back / STAKE).toFixed(5), buy_vs_price: sol > 0 ? +(1 - (tok * px) / (STAKE * sol)).toFixed(5) : null, sell_vs_price: sol > 0 ? +(1 - (back * sol) / (tok * px)).toFixed(5) : null, route_buy: b.route, route_sell: s.route, router: b.router ?? null, impact_buy: b.impact ?? null };
}
for (const [list, kind, want] of [[fee, "fee", N], [plain, "control", Math.max(4, Math.ceil(N / 2))]]) { let got = 0, tried = 0; for (const c of list) { if (got >= want || tried >= want * 4) break; tried++; const r = await one(c, kind); if (!r) continue; rows.push(r); if (!r.err) got++; } }
const ok = rows.filter((r) => !r.err), med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; }, base = med(ok.filter((r) => r.kind === "control").map((r) => r.round_trip_loss));
console.log(`fee-probe: ${ok.filter((r) => r.kind === "fee").length} fee coins, ${ok.filter((r) => r.kind === "control").length} control coins (0.2 SOL in, quotes only)`);
console.log("kind     coin      fee     round trip   minus control   2 x fee   reading                route (buy)");
for (const r of rows) { if (r.err) { console.log(`${r.kind.padEnd(8)} ${String(r.sym || r.mint.slice(0, 6)).slice(0, 8).padEnd(8)} ${pct(r.bps / 1e4)}  no quote (${r.err.slice(0, 50)})`); continue; }
  const extra = base != null ? r.round_trip_loss - base : null, two = (2 * r.bps) / 1e4; r.extra_vs_control = extra != null ? +extra.toFixed(5) : null;
  r.reading = r.kind !== "fee" || extra == null ? "" : extra >= 0.75 * two ? "fee looks INCLUDED" : extra <= 0.25 * two ? "fee looks NOT included" : extra >= 0.35 * two && extra <= 0.65 * two ? "fee on ONE leg only?" : "unclear";
  console.log(`${r.kind.padEnd(8)} ${String(r.sym || r.mint.slice(0, 6)).slice(0, 8).padEnd(8)} ${pct(r.bps / 1e4)}  ${pct(r.round_trip_loss)}      ${pct(extra)}        ${pct(two)}   ${r.reading.padEnd(22)} ${(r.route_buy || []).join(" > ").slice(0, 40)}`); }
console.log(`control round trip (median): ${pct(base)}   quote response fields: ${(keys || []).join(", ")}`);
mkdirSync(`${OUT}/pub`, { recursive: true }); writeFileSync(`${OUT}/pub/fee-probe.json`, JSON.stringify({ at: new Date().toISOString(), run: RUN, stake_sol: STAKE, control_round_trip_median: base, quote_fields: keys, rows }));
console.log(`written: ${OUT}/pub/fee-probe.json`); process.exit(0);
