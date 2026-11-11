// Unit test for chainfill 0.10.1 per-book exit policies: drives apply() on an in-memory DB with synthetic valuations.
// Run: HELIUS_API_KEY=x node test/policy_exits.test.mjs
import Database from "better-sqlite3";
const cf = await import("../src/chainfill.mjs");
const { initChainFill, _apply, setPolicy, BOOK_POLICY, setTrail, TRAIL_OVR } = cf;
const db = new Database(":memory:"); const now = () => Math.floor(Date.now() / 1000);
db.exec("CREATE TABLE vol_paper (id INTEGER PRIMARY KEY, strat TEXT, mint TEXT, entry_ts INTEGER, entry_price REAL, entry_mc REAL, created_ts INTEGER, age_min REAL, row TEXT)");
initChainFill(db);
const LAM = 200_000_000n, LAM02 = 20_000_000n; let id = 0; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pos(strat, ageS) { const mint = "M" + (++id); db.prepare("INSERT INTO vol_paper (id, strat, mint, entry_ts) VALUES (?,?,?,?)").run(id, strat, mint, now() - ageS);
  db.prepare("INSERT INTO chain_fill (vol_id, mint, strat, entry_ts, venue, curve, s_tokens, s_tokens02, s_hi, s_hi02, s_n, done, i02_done) VALUES (?,?,?,?,'curve',1,?,?,1,1,0,0,0)").run(id, mint, strat, now() - ageS, "1000000", "100000");
  if (BOOK_POLICY[strat]) setPolicy(id, BOOK_POLICY[strat]); return { id, mint }; }
async function run(p, xs) { // xs: sequence of (x02 = x) valuations; returns the chain_fill row after landing
  for (const x of xs) { _apply(p.mint, (tok) => BigInt(Math.round(Number(tok === 1000000n ? LAM : LAM02) * x)), "test"); await sleep(750); }
  return db.prepare("SELECT s_exit_reason, s_exit_x, done, i02_exit_reason, i02_done, s_trig_x FROM chain_fill WHERE vol_id=?").get(p.id); }
const out = []; const check = (name, cond, row) => { out.push(`${cond ? "PASS" : "FAIL"} ${name} ${JSON.stringify(row)}`); };
// 1. SW5: no trail on either size — a 40% drawdown does not exit; the hold does, on both sizes, even with no price change
let p = pos("SW5", 100); let r = await run(p, [1.0, 1.5, 0.9, 0.9]); check("SW5 no trail at -40% from high (0.2 and 0.02 both open)", r.done === 0 && r.i02_done === 0, r);
p = pos("SW5", 301); r = await run(p, [0.95, 0.95]); check("SW5 hold fires at 300 s on both sizes", r.s_exit_reason === "hold" && r.done === 1 && r.i02_exit_reason === "hold" && r.i02_done === 1, r);
// 2. G1: take profit, fixed stop (not a trail), stagnation window, continue outside the band
p = pos("G1", 10); r = await run(p, [1.2, 1.46, 1.46]); check("G1 take profit at 1.45", r.s_exit_reason === "tp" && r.done === 1 && r.i02_exit_reason === "tp", r);
p = pos("G1", 10); r = await run(p, [1.4, 0.8, 0.8]); check("G1 1.4 -> 0.8 (43% off the high, above the 0.5 stop) does NOT exit: no trail", r.done === 0 && r.i02_done === 0, r);
p = pos("G1", 10); r = await run(p, [0.8, 0.49, 0.49]); check("G1 fixed stop at 0.50 of entry", r.s_exit_reason === "stop" && r.done === 1 && r.i02_exit_reason === "stop", r);
p = pos("G1", 95); r = await run(p, [1.0, 1.0]); check("G1 stagnation: flat at 95 s exits", r.s_exit_reason === "stagnation" && r.done === 1 && r.i02_exit_reason === "stagnation", r);
p = pos("G1", 95); r = await run(p, [1.3, 1.3]); check("G1 at 95 s outside the band (1.3) continues", r.done === 0, r);
p = pos("G1", 130); r = await run(p, [1.0, 1.0]); check("G1 flat at 130 s (window closed) continues", r.done === 0, r);
// 3. RB and R3C: ordinary 30% trail, unchanged; BL (no policy): default trail
p = pos("RB", 10); r = await run(p, [1.0, 2.0, 1.39, 1.39]); check("RB 30% trail from the high (2.0 -> 1.39)", r.s_exit_reason === "trail" && r.done === 1, r);
p = pos("R3C", 10); setTrail(p.id, 0.30); r = await run(p, [1.0, 2.0, 1.45, 1.45]); check("R3C 27.5% off the high does not exit (trail 30%)", r.done === 0, r);
p = pos("BL", 10); r = await run(p, [1.0, 2.0, 1.0, 1.0]); check("BL default trail exits", r.s_exit_reason === "trail" && r.done === 1, r);
// 4. restart: policies restored from vol_paper by initChainFill
TRAIL_OVR.clear(); cf.POLICY_OVR.clear(); initChainFill(db); p = { id: 1, mint: "M1" }; check("restart restores SW5 policy (trail 1, hold 300)", cf.POLICY_OVR.get(1)?.hold === 300 && TRAIL_OVR.get(1) === 1, { pol: cf.POLICY_OVR.get(1), trail: TRAIL_OVR.get(1) });
console.log(out.join("\n")); process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
