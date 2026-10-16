// v0.18.23: live dashboard. A tiny HTTP server inside the tracker (no extra process) serving one page and one JSON endpoint.
// Read-only; protected by WEB_KEY (.env). Disabled when WEB_KEY is unset. http://<droplet-ip>:<WEB_PORT>/?key=<WEB_KEY>
import { createServer } from "node:http";
import { CFG } from "./config.js";
import { db } from "./db.js";
import { openPositions } from "./momentum.js";
import { solUsdCached } from "./price.js";
import { memMb } from "./commands.js";

const KEY = () => process.env.WEB_KEY || "", PORT = () => Number(process.env.WEB_PORT || 8787);
// Project 2's exit (flow4) exists from v0.18.10 (15 Oct 12:52 UTC); Project 3's (split) from v0.18.22 (16 Oct 16:00 UTC). Earlier rows
// were filled by the sweeper, not scored live, so each project's book starts when its exit started recording.
const P2_FROM = Date.UTC(2026, 9, 15, 12, 52) / 1000, P3_FROM = Date.UTC(2026, 9, 16, 16, 0) / 1000;
const qCore = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, entry_price, peak_mult, after_peak_mult, closed, exit_reason, core_v40, x_t15s40, x_flow4, x_split, split_branch, x_flow4ff, vol1m_usd, age_s, venue
  FROM paper_trades WHERE strategy='momentum' AND core=1 AND COALESCE(invalid,0)=0 AND entry_ts>=? ORDER BY entry_ts`);
const qRecent = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, peak_mult, after_peak_mult, closed, exit_reason, core_v40, x_t15s40, x_flow4, x_split, split_branch FROM paper_trades WHERE strategy='momentum' AND core=1 AND COALESCE(invalid,0)=0 ORDER BY entry_ts DESC LIMIT 25`);

function book(rows, col, from, size, cost) {
  const t = rows.filter((r) => r.entry_ts >= from && r[col] != null);
  const x = t.map((r) => r[col]);
  const w = x.filter((v) => v > 1).length;
  let cum = 0; const curve = t.map((r) => { cum += size * (r[col] * (1 - cost) - 1); return [r.entry_ts, +cum.toFixed(3)]; });
  const day = Math.floor(Date.now() / 1000) - 86400, t24 = t.filter((r) => r.entry_ts >= day), x24 = t24.map((r) => r[col]);
  const sum = (a) => a.reduce((p, c) => p + c, 0);
  return {
    n: t.length, win: t.length ? w / t.length : null, avg: t.length ? sum(x) / t.length - 1 : null,
    net: +sum(x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), gross: +sum(x.map((v) => size * (v - 1))).toFixed(3),
    n24: t24.length, net24: +sum(x24.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), win24: t24.length ? x24.filter((v) => v > 1).length / t24.length : null,
    big: x.filter((v) => v >= 2).length, cap: x.filter((v) => v >= 4).length, curve, open: rows.filter((r) => r.entry_ts >= from && !r.closed).length,
    wins: w, losses: t.length - w, best: t.length ? +Math.max(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0, worst: t.length ? +Math.min(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0,
  };
}
const qAll = db.prepare(`SELECT p.id, p.name, p.symbol, p.mint, p.entry_ts, p.entry_mc, p.entry_price, p.age_s, p.venue, p.trigger_kind, p.core, p.core_v40, p.vol5m_usd, p.vol1m_usd, p.buyers_entry, p.q_wallets, p.q_size_cv, p.q_top3, p.bs_ratio_entry, p.bs_clean_entry, p.bot_share_entry,
  p.bundle_pct, p.bundle_sol, p.handoffs, p.cluster_held_pct, p.cluster_out_entry, p.churn_entry, p.snipers_n, p.snipers_held_pct, p.fresh_share, p.fresh_n, p.proven_vol_share, p.proven_wallets_5m, p.dex_paid, p.dex_paid_types, p.dex_paid_lead_s,
  p.holders_entry, p.top10_entry, p.largest_entry, p.dev_hold_entry, p.fee_accrued_entry, p.fee_claims_entry, p.fee_claimed_entry, p.peak_mult, p.after_peak_mult, p.closed, p.exit_reason, p.x_t15s40, p.x_flow4, p.x_flow4ff, p.x_split, p.split_branch, p.dd_pre15, p.t_hit15_s, p.path,
  t.creator, t.outside_buyers, t.dev_buy_sol, t.creator_funded_sol, t.creator_age_s, t.has_socials
  FROM paper_trades p LEFT JOIN tokens t ON t.mint=p.mint WHERE p.strategy='momentum' AND COALESCE(p.invalid,0)=0 AND p.entry_ts>=? ORDER BY p.entry_ts DESC`);
export function tradesDump(days = 7) {
  const rows = qAll.all(Math.floor(Date.now() / 1000) - days * 86400);
  for (const r of rows) {
    r.peak = Math.max(r.peak_mult || 1, r.after_peak_mult || 1);
    let P = {}; try { P = r.path ? JSON.parse(r.path) : {}; } catch {}
    const m = (k) => { const v = P[k]; return v == null ? null : typeof v === "object" ? v.m : v; }, vv = (k) => (P[k] && typeof P[k] === "object" ? P[k].v : null), cs = (k) => (P[k] && typeof P[k] === "object" ? P[k].cs : null);
    r.m30 = m("30"); r.m120 = m("120"); r.m300 = m("300"); r.m600 = m("600"); r.v120 = vv("120"); r.v300 = vv("300"); r.cs120 = cs("120"); delete r.path;
  }
  const core = rows.filter((r) => r.core === 1);
  const bucket = (name, fn, labels) => { const out = []; for (const lab of labels) { const t = core.filter((r) => fn(r) === lab); if (!t.length) { out.push({ bucket: lab, n: 0 }); continue; } const g = (col) => { const v = t.map((r) => r[col]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length - 1 : null; }; out.push({ bucket: lab, n: t.length, r15: t.filter((r) => r.peak >= 1.5).length / t.length, r2: t.filter((r) => r.peak >= 2).length / t.length, r3: t.filter((r) => r.peak >= 3).length / t.length, p1: g("x_t15s40"), p2: g("x_flow4"), p3: g("x_split"), n3: t.filter((r) => r.x_split != null).length }); } return { name, rows: out }; };
  const brackets = [
    bucket("Entry market cap", (r) => r.entry_mc < 50e3 ? "< $50K" : r.entry_mc < 75e3 ? "$50–75K" : "$75–100K", ["< $50K", "$50–75K", "$75–100K"]),
    bucket("Volume in the last 1 minute at entry", (r) => r.vol1m_usd == null ? "?" : r.vol1m_usd < 20e3 ? "< $20K" : r.vol1m_usd < 40e3 ? "$20–40K" : r.vol1m_usd < 60e3 ? "$40–60K" : "$60K+", ["< $20K", "$20–40K", "$40–60K", "$60K+"]),
    bucket("Age at entry", (r) => r.age_s == null ? "?" : r.age_s < 180 ? "< 3 min" : r.age_s < 300 ? "3–5 min" : r.age_s < 600 ? "5–10 min" : r.age_s < 1800 ? "10–30 min" : "30 min+", ["< 3 min", "3–5 min", "5–10 min", "10–30 min", "30 min+"]),
    bucket("Price 2 minutes after entry", (r) => r.m120 == null ? "no mark" : r.m120 < 0.9 ? "below 0.90×" : r.m120 < 1.2 ? "0.90–1.20×" : "1.20× or more", ["below 0.90×", "0.90–1.20×", "1.20× or more", "no mark"]),
    bucket("Bundle at launch", (r) => r.bundle_pct == null ? "unknown" : r.bundle_pct < 20 ? "< 20%" : r.bundle_pct < 40 ? "20–40%" : r.bundle_pct < 60 ? "40–60%" : "60%+", ["< 20%", "20–40%", "40–60%", "60%+", "unknown"]),
    bucket("Top-10 holders at entry", (r) => r.top10_entry == null ? "unknown" : r.top10_entry < 20 ? "< 20%" : r.top10_entry < 30 ? "20–30%" : r.top10_entry < 45 ? "30–45%" : "45%+", ["< 20%", "20–30%", "30–45%", "45%+", "unknown"]),
    bucket("Snipers still holding at entry", (r) => r.snipers_held_pct == null ? "unknown" : r.snipers_held_pct <= 0.5 ? "0%" : r.snipers_held_pct < 10 ? "0–10%" : "10%+", ["0%", "0–10%", "10%+", "unknown"]),
    bucket("Fresh wallets among buyers", (r) => r.fresh_share == null ? "unknown" : r.fresh_share < 0.1 ? "< 10%" : r.fresh_share < 0.3 ? "10–30%" : "30%+", ["< 10%", "10–30%", "30%+", "unknown"]),
    bucket("Dex Paid before entry", (r) => r.dex_paid == null ? "unknown" : r.dex_paid ? "paid" : "not paid", ["paid", "not paid", "unknown"]),
    bucket("Dev claimed fees before entry", (r) => r.fee_claims_entry == null ? "unknown" : r.fee_claims_entry > 0 ? "yes" : "no", ["yes", "no", "unknown"]),
    bucket("Hour of day (UTC)", (r) => { const h = new Date(r.entry_ts * 1000).getUTCHours(); return h < 6 ? "00–05" : h < 12 ? "06–11" : h < 18 ? "12–17" : "18–23"; }, ["00–05", "06–11", "12–17", "18–23"]),
    bucket("Pool quote asset", (r) => (r.venue || "pumpswap").includes("/") ? "non-SOL (stock/other)" : (r.venue || "pumpswap") === "pumpswap" ? "SOL (PumpSwap)" : "other DEX", ["SOL (PumpSwap)", "non-SOL (stock/other)", "other DEX"]),
  ];
  return { now: Math.floor(Date.now() / 1000), days, n: rows.length, nCore: core.length, brackets, rows };
}
export function snapshot(size = 0.25, cost = 0.05) {
  const rows = qCore.all(P2_FROM - 86400 * 2);
  const projects = {
    p1: { name: "Project 1", rule: "sell at 1.5x · −40% hard stop", ...book(rows, "x_t15s40", P2_FROM, size, cost) },
    p2: { name: "Project 2", rule: "runner: hold while 5m vol ≥ $100K · cap 4x · −40% stop before 1.5x", ...book(rows, "x_flow4", P2_FROM, size, cost) },
    p3: { name: "Project 3", rule: "at 2 min: <0.90× sell · ≥1.20× hold (40% trail, cap 4x) · else half at 1.5x, rest rides", ...book(rows, "x_split", P3_FROM, size, cost) },
  };
  const v40 = rows.filter((r) => r.entry_ts >= P3_FROM && r.core_v40 === 1);
  projects.p3.filtered = { n: v40.filter((r) => r.x_split != null).length, net: +v40.filter((r) => r.x_split != null).reduce((a, r) => a + size * (r.x_split * (1 - cost) - 1), 0).toFixed(3), note: "Project 3 with its entry filter (1m vol ≥ $40K, age < 10 min)" };
  const open = openPositions().map((p) => {
    const r = rows.find((z) => z.id === p.id);
    return { ...p, core: !!r, coreV40: r?.core_v40 === 1, p1: p.x.t15s40 != null ? (p.x.t15s40 >= 1.5 ? "took 1.5x" : `stopped ${p.x.t15s40.toFixed(2)}x`) : p.mult <= 0.6 ? "stopping" : "running",
      p2: p.x.flow4 != null ? `exited ${p.x.flow4.toFixed(2)}x` : p.flowArmed ? "armed (holding)" : "running", p3: p.x.split != null ? `exited ${p.x.split.toFixed(2)}x (${p.splitBranch})` : p.splitBranch ? `${p.splitBranch}${p.splitHalf ? " · half taken" : ""}` : p.ageS < 120 ? `deciding in ${120 - p.ageS}s` : "running" };
  });
  const recent = qRecent.all().map((r) => ({ ...r, peak: Math.max(r.peak_mult || 1, r.after_peak_mult || 1) }));
  return { now: Math.floor(Date.now() / 1000), sol: solUsdCached(), size, cost, mem: memMb(), projects, open, recent,
    params: { trigger: `$${(CFG.VOL5M_USD / 1e3).toFixed(0)}K traded in 5 min`, entryCap: `MC under $${(CFG.MOM_CORE_MC / 1e3).toFixed(0)}K at entry`, first: "first entry on the coin only", minAge: `coin ≥ ${CFG.MOM_MIN_AGE_S}s old`, v40: `P3 filter: 1m vol ≥ $${(CFG.MOM_V40_USD / 1e3).toFixed(0)}K and age < ${CFG.MOM_V40_AGE_S / 60} min`, hold: `max hold ${CFG.MOM_MAX_HOLD_MIN / 60}h`, flow: `P2 hold: 5m vol ≥ $${(CFG.FLOW_MIN_VOL / 1e3).toFixed(0)}K · cap ${CFG.FLOW_CAP}x · 50% trail backstop`, split: "P3: decide at 120s · fail <0.90× · run ≥1.20× · trail 40% · cap 4x · half at 1.5x", costs: `${(cost * 100).toFixed(0)}% round trip assumed · ${size} SOL per trade` } };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — live</title>
<style>
:root{--bg:#120a2a;--card:rgba(14,10,40,.72);--line:#3a2a6a;--tx:#e9e6ff;--mut:#9a8fd0;--up:#39ff9c;--dn:#ff4d7a;--acc:#4ad8ff;--mag:#ff3ea5;--amb:#ffb84d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:14px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,'Cascadia Mono','JetBrains Mono',monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.85);backdrop-filter:blur(8px);z-index:2}
h1{font-size:16px;margin:0;color:var(--mag);letter-spacing:.02em}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}
main{padding:12px 16px;max-width:1280px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 0 0 1px rgba(255,62,165,.08),0 10px 30px rgba(0,0,0,.35)}
.card h2{margin:0 0 2px;font-size:15px;color:var(--acc)}.rule{font-size:12px;color:var(--mut);min-height:32px}
.big{font-size:32px;font-weight:700;margin:6px 0 0}.kv{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:13px;margin-top:10px}.kv b{font-weight:600;color:var(--amb)}.kv b.up{color:var(--up)}.kv b.dn{color:var(--dn)}
svg.chart{width:100%;height:150px;margin-top:10px;display:block}svg.combo{width:100%;height:260px;margin-top:8px;display:block}.lg{display:inline-flex;align-items:center;gap:6px;margin-left:14px}.lg i{display:inline-block;width:18px;height:3px;border-radius:2px}
.wl{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:10px;background:rgba(255,255,255,.08)}.wl i{display:block;height:100%}.wl .w{background:var(--up)}.wl .l{background:var(--dn)}
.wlt{display:flex;justify-content:space-between;font-size:12px;margin-top:4px}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);margin:22px 0 8px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mag);font-weight:500}
tr.win td:first-child{box-shadow:inset 3px 0 0 var(--up)}tr.loss td:first-child{box-shadow:inset 3px 0 0 var(--dn)}
.tbl{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
.tag{display:inline-block;padding:1px 6px;border-radius:6px;background:rgba(74,216,255,.12);color:var(--acc);font-size:11px;margin-left:4px}
.params{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 16px;font-size:13px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}.seg button{background:transparent;color:var(--mut);border:0;padding:6px 10px;font-size:13px;cursor:pointer}.seg button.on{background:rgba(255,62,165,.18);color:#fff}
footer{padding:16px;color:var(--mut);font-size:12px;text-align:center}
</style></head><body>
<header><div><h1>Ismael — live paper trading <a id="alink" href="#" style="font-size:12px;color:var(--acc);margin-left:10px;font-weight:500">analysis →</a></h1><div class="mut" id="sub">loading…</div></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="mut">per trade</span><span class="seg" id="size"><button data-v="0.1">0.1</button><button data-v="0.25" class="on">0.25</button><button data-v="0.5">0.5</button><button data-v="1">1 SOL</button></span><span class="mut">costs</span><span class="seg" id="cost"><button data-v="0">0%</button><button data-v="0.05" class="on">5%</button><button data-v="0.1">10%</button></span></div></header>
<main>
<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px"><h2 style="margin:0;font-size:15px">All three projects — cumulative net SOL</h2><div id="legend" style="font-size:12px"></div></div><div id="combo"></div></div>
<div class="grid" id="projects"></div>
<h3>Live positions</h3><div class="tbl"><table id="open"><thead><tr><th>coin</th><th>entered</th><th>age</th><th>entry MC</th><th>now</th><th>peak</th><th>5m vol</th><th>P1</th><th>P2</th><th>P3</th></tr></thead><tbody></tbody></table></div>
<h3>Last 25 core trades <span class="mut" style="text-transform:none;letter-spacing:0">— P&L per project at the selected size; row colour = Project 3 (or Project 2 before it existed)</span></h3><div class="tbl"><table id="recent"><thead><tr><th>coin</th><th>entered (UTC)</th><th>entry MC</th><th>peak</th><th>P1</th><th>P2</th><th>P3</th><th>P3 branch</th><th>P3 filter</th><th>state</th></tr></thead><tbody></tbody></table></div>
<h3>Parameters</h3><div class="card params" id="params"></div>
</main><footer id="foot"></footer>
<script>
const key=new URLSearchParams(location.search).get('key')||'';let SIZE=0.25,COST=0.05;
const $=s=>document.querySelector(s);const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));
const pc=v=>v==null?'—':((v-1)*100).toFixed(0)+'%';const sol=v=>(v>=0?'+':'')+v.toFixed(2)+' SOL';const cls=v=>v>0?'up':v<0?'dn':'';
const pl=v=>v==null?'—':'<span class="'+cls(v*(1-COST)-1)+'">'+((v*(1-COST)-1)*SIZE>=0?'+':'')+((v*(1-COST)-1)*SIZE).toFixed(2)+'</span> <span class="mut">'+pc(v)+'</span>';
const ago=s=>s<60?s+'s':s<3600?Math.floor(s/60)+'m':(s/3600).toFixed(1)+'h';const hhmm=t=>{const d=new Date(t*1000);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')};
function chart(c){const W=360,H=150,L=38,R=6,T=8,B=20;if(!c||c.length<2)return '<svg class="chart" viewBox="0 0 '+W+' '+H+'"><text x="'+(W/2)+'" y="'+(H/2)+'" fill="#9a8fd0" font-size="12" text-anchor="middle">no closed trades yet</text></svg>';
const xs=c.map(p=>p[0]),ys=c.map(p=>p[1]);const x0=xs[0],x1=xs[xs.length-1],mn=Math.min(0,...ys),mx=Math.max(0,...ys);const X=t=>L+(t-x0)/((x1-x0)||1)*(W-L-R),Y=v=>T+(1-(v-mn)/((mx-mn)||1))*(H-T-B);
const d=c.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');const z=Y(0);const last=ys[ys.length-1];const col=last>=0?'#39ff9c':'#ff4d7a';
const area='M'+X(x0).toFixed(1)+' '+z.toFixed(1)+' '+c.map(p=>'L'+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ')+' L'+X(x1).toFixed(1)+' '+z.toFixed(1)+' Z';
const ticks=[mn,0,mx].filter((v,i,a)=>a.indexOf(v)===i);const tx=[x0,x0+(x1-x0)/2,x1];
return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="g'+(last>=0?'u':'d')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity=".02"/></linearGradient></defs>'+
ticks.map(v=>'<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" stroke="#2e2360" stroke-dasharray="'+(v===0?'0':'3 3')+'"/><text x="'+(L-4)+'" y="'+(Y(v)+4).toFixed(1)+'" fill="#9a8fd0" font-size="10" text-anchor="end">'+(v>0?'+':'')+v.toFixed(1)+'</text>').join('')+
'<path d="'+area+'" fill="url(#g'+(last>=0?'u':'d')+')"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
'<circle cx="'+X(x1).toFixed(1)+'" cy="'+Y(last).toFixed(1)+'" r="3" fill="'+col+'"/>'+
tx.map((t,i)=>'<text x="'+X(t).toFixed(1)+'" y="'+(H-6)+'" fill="#9a8fd0" font-size="10" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+new Date(t*1000).toLocaleDateString(undefined,{weekday:'short'})+' '+hhmm(t)+'</text>').join('')+'</svg>'}
const PCOL={p1:'#ffb84d',p2:'#4ad8ff',p3:'#ff3ea5'};
function combo(pr){const W=900,H=260,L=44,R=10,T=10,B=22;const series=['p1','p2','p3'].map(k=>({k,c:pr[k].curve||[],name:pr[k].name,net:pr[k].net})).filter(s=>s.c.length>1);if(!series.length)return '<svg class="combo"></svg>';
const allx=series.flatMap(s=>s.c.map(p=>p[0])),ally=series.flatMap(s=>s.c.map(p=>p[1]));const x0=Math.min(...allx),x1=Math.max(...allx),mn=Math.min(0,...ally),mx=Math.max(0,...ally);const X=t=>L+(t-x0)/((x1-x0)||1)*(W-L-R),Y=v=>T+(1-(v-mn)/((mx-mn)||1))*(H-T-B);
const step=(mx-mn)>4?1:(mx-mn)>1.5?0.5:0.25;const yt=[];for(let v=Math.ceil(mn/step)*step;v<=mx+1e-9;v+=step)yt.push(+v.toFixed(2));
const nx=6,xt=[];for(let i=0;i<=nx;i++)xt.push(x0+(x1-x0)*i/nx);
let g='<svg class="combo" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">';
g+=yt.map(v=>'<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" stroke="'+(v===0?'#5a4a9a':'#2e2360')+'"/><text x="'+(L-5)+'" y="'+(Y(v)+4).toFixed(1)+'" fill="#9a8fd0" font-size="11" text-anchor="end">'+(v>0?'+':'')+v.toFixed(2)+'</text>').join('');
g+=xt.map(t=>'<line x1="'+X(t).toFixed(1)+'" y1="'+T+'" x2="'+X(t).toFixed(1)+'" y2="'+(H-B)+'" stroke="#2e2360"/>').join('');
g+=xt.map((t,i)=>'<text x="'+X(t).toFixed(1)+'" y="'+(H-6)+'" fill="#9a8fd0" font-size="11" text-anchor="'+(i===0?'start':i===nx?'end':'middle')+'">'+new Date(t*1000).toLocaleDateString(undefined,{weekday:'short'})+' '+hhmm(t)+'</text>').join('');
for(const s of series){const pts=[[s.c[0][0],0]].concat(s.c);const d=pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');const last=s.c[s.c.length-1];g+='<path d="'+d+'" fill="none" stroke="'+PCOL[s.k]+'" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="'+X(last[0]).toFixed(1)+'" cy="'+Y(last[1]).toFixed(1)+'" r="3.5" fill="'+PCOL[s.k]+'"/>';}
return g+'</svg>'}
function wl(p){const n=p.wins+p.losses;if(!n)return '';return '<div class="wl"><i class="w" style="width:'+(p.wins/n*100)+'%"></i><i class="l" style="width:'+(p.losses/n*100)+'%"></i></div><div class="wlt"><span class="up">'+p.wins+' profitable</span><span class="dn">'+p.losses+' losses</span></div>'}
async function load(){const r=await fetch('/api/snapshot?key='+encodeURIComponent(key)+'&size='+SIZE+'&cost='+COST);if(!r.ok){$('#sub').textContent='access denied — check the key in the link';return}const d=await r.json();
$('#sub').textContent='updated '+new Date(d.now*1000).toLocaleTimeString()+' · SOL $'+d.sol.toFixed(0)+' · mem '+d.mem+' MB';
$('#combo').innerHTML=combo(d.projects);$('#legend').innerHTML=['p1','p2','p3'].map(k=>'<span class="lg"><i style="background:'+PCOL[k]+'"></i>'+d.projects[k].name+' <b class="'+cls(d.projects[k].net)+'">'+(d.projects[k].n?sol(d.projects[k].net):'—')+'</b></span>').join('');
$('#projects').innerHTML=['p1','p2','p3'].map(k=>{const p=d.projects[k];const f=p.filtered?'<div class="kv" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><span class="mut">with entry filter</span><b class="'+cls(p.filtered.net)+'">'+(p.filtered.n?sol(p.filtered.net)+' <span class="mut">('+p.filtered.n+')</span>':'—')+'</b></div>':'';
return '<div class="card"><h2>'+p.name+'</h2><div class="rule">'+p.rule+'</div><div class="big '+cls(p.net)+'">'+(p.n?sol(p.net):'—')+'</div><div class="mut">net after costs · '+p.n+' trades'+(p.open?' · '+p.open+' open now':'')+'</div>'+chart(p.curve)+wl(p)+
'<div class="kv"><span class="mut">win rate</span><b>'+(p.win==null?'—':(p.win*100).toFixed(0)+'%')+'</b><span class="mut">avg per trade</span><b>'+pc(p.avg==null?null:p.avg+1)+'</b><span class="mut">last 24h</span><b class="'+cls(p.net24)+'">'+(p.n24?sol(p.net24)+' <span class="mut">('+p.n24+')</span>':'—')+'</b><span class="mut">reached 2x / 4x</span><b>'+p.big+' / '+p.cap+'</b><span class="mut">best / worst trade</span><b><span class="up">'+(p.best>=0?'+':'')+p.best.toFixed(2)+'</span> / <span class="dn">'+p.worst.toFixed(2)+'</span></b></div>'+f+'</div>'}).join('');
$('#open tbody').innerHTML=d.open.length?d.open.map(p=>'<tr class="'+(p.mult>1?'win':p.mult<1?'loss':'')+'"><td>'+p.name+(p.core?'':'<span class="tag">non-core</span>')+(p.coreV40?'<span class="tag">P3 filter</span>':'')+'</td><td>'+hhmm(p.entryTs)+'</td><td>'+ago(p.ageS)+'</td><td>$'+fmt(p.entryMc)+'</td><td class="'+cls(p.mult-1)+'"><b>'+p.mult.toFixed(2)+'x</b> <span class="mut">$'+fmt(p.lastMc)+'</span></td><td>'+p.peakMult.toFixed(2)+'x</td><td>$'+fmt(p.v5)+'</td><td>'+p.p1+'</td><td>'+p.p2+'</td><td>'+p.p3+'</td></tr>').join(''):'<tr><td colspan="10" class="mut">no open positions</td></tr>';
$('#recent tbody').innerHTML=d.recent.map(r=>{const ref=r.x_split??r.x_flow4;const rc=ref==null?'':ref>1?'win':'loss';return '<tr class="'+rc+'"><td>'+r.name+'</td><td>'+new Date(r.entry_ts*1000).toISOString().slice(5,16).replace('T',' ')+'</td><td>$'+fmt(r.entry_mc||0)+'</td><td>'+r.peak.toFixed(2)+'x</td><td>'+pl(r.x_t15s40)+'</td><td>'+pl(r.x_flow4)+'</td><td>'+pl(r.x_split)+'</td><td>'+(r.split_branch||'—')+'</td><td>'+(r.core_v40?'yes':'no')+'</td><td class="mut">'+(r.closed?(r.exit_reason||'closed'):'open')+'</td></tr>'}).join('');
$('#params').innerHTML=Object.values(d.params).map(v=>'<div>'+v+'</div>').join('');
$('#foot').textContent='Books start when each exit began recording live: P1/P2 from 15 Oct 12:52 UTC, P3 from 16 Oct 16:00 UTC. Paper trades, no real money. Chart: cumulative net SOL over time at the selected size. Refreshes every 10 s.';}
for(const id of ['size','cost'])$('#'+id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('#'+id).children].forEach(x=>x.classList.remove('on'));b.classList.add('on');if(id==='size')SIZE=Number(b.dataset.v);else COST=Number(b.dataset.v);load()});
$('#alink').href='/analysis?key='+encodeURIComponent(key);load();setInterval(load,10000);
</script></body></html>`;

const ANALYSIS = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — analysis</title>
<style>
:root{--bg:#120a2a;--card:rgba(14,10,40,.72);--line:#3a2a6a;--tx:#e9e6ff;--mut:#9a8fd0;--up:#39ff9c;--dn:#ff4d7a;--acc:#4ad8ff;--mag:#ff3ea5;--amb:#ffb84d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:13px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,'Cascadia Mono','JetBrains Mono',monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.85);backdrop-filter:blur(8px);z-index:2}h1{font-size:16px;margin:0;color:var(--mag)}
main{padding:12px 16px}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}a{color:var(--acc)}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);margin:22px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.card h4{margin:0 0 6px;font-size:13px;color:var(--acc)}
table{border-collapse:collapse;font-size:12px;width:100%}th,td{text-align:left;padding:5px 7px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mag);font-weight:500;cursor:pointer;position:sticky;top:0;background:#160c38}th.on{color:var(--tx)}
.tbl{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:12px;max-height:75vh}
tr.win td:first-child{box-shadow:inset 3px 0 0 var(--up)}tr.loss td:first-child{box-shadow:inset 3px 0 0 var(--dn)}
input,select{background:#0f1115;color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:5px 8px;font-size:13px}
.bar{display:inline-block;height:8px;background:linear-gradient(90deg,var(--mag),var(--acc));vertical-align:middle;border-radius:2px;margin-right:4px}
</style></head><body>
<header><div><h1>Ismael — analysis <a id="back" href="#" style="font-size:12px;margin-left:10px;font-weight:500">← live</a></h1><div class="mut" id="sub">loading…</div></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label><input type="checkbox" id="coreonly" checked> core trades only</label> <input id="q" placeholder="filter by name / mint" style="width:200px"> <select id="days"><option value="2">2 days</option><option value="7" selected>7 days</option><option value="30">30 days</option></select> <a id="csv" href="#">download CSV</a></div></header>
<main>
<h3>How the core trades split by each factor <span class="mut" style="text-transform:none;letter-spacing:0">— reach = share of trades whose price touched that multiple after entry; P1/P2/P3 = average result under each exit. Small n means nothing.</span></h3>
<div class="grid" id="brackets"></div>
<h3>Every trade, every recorded factor <span class="mut" style="text-transform:none;letter-spacing:0">— click a column heading to sort</span></h3>
<div class="tbl"><table id="t"><thead></thead><tbody></tbody></table></div>
</main>
<script>
const key=new URLSearchParams(location.search).get('key')||'';const $=s=>document.querySelector(s);$('#back').href='/?key='+encodeURIComponent(key);
const fmt=n=>n==null?'':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));const pct=v=>v==null?'—':(v*100).toFixed(0)+'%';const pc=v=>v==null?'—':((v-1)*100).toFixed(0)+'%';const x=v=>v==null?'—':v.toFixed(2)+'x';
const ts=t=>new Date(t*1000).toISOString().slice(5,16).replace('T',' ');const age=s=>s==null?'—':s<3600?Math.floor(s/60)+'m':s<86400?(s/3600).toFixed(1)+'h':(s/86400).toFixed(0)+'d';
const COLS=[['name','coin',r=>r.name+(r.core?'':' <span class="mut">(non-core)</span>')],['entry_ts','entered UTC',r=>ts(r.entry_ts)],['venue','pool',r=>r.venue||'pumpswap'],['entry_mc','entry MC',r=>'$'+fmt(r.entry_mc)],['age_s','age',r=>age(r.age_s)],['vol5m_usd','5m vol @entry',r=>'$'+fmt(r.vol5m_usd)],['vol1m_usd','1m vol @entry',r=>'$'+fmt(r.vol1m_usd)],['v120','5m vol @+2m',r=>r.v120==null?'—':'$'+fmt(r.v120)],['v300','5m vol @+5m',r=>r.v300==null?'—':'$'+fmt(r.v300)],['buyers_entry','buyers 5m',r=>r.buyers_entry??'—'],['q_wallets','wallets 5m',r=>r.q_wallets??'—'],['bot_share_entry','bot share',r=>pct(r.bot_share_entry)],['bs_clean_entry','clean buy/sell',r=>r.bs_clean_entry==null?'—':r.bs_clean_entry.toFixed(2)],
['bundle_pct','bundle %',r=>r.bundle_pct==null?'—':r.bundle_pct.toFixed(0)+'%'],['bundle_sol','bundle SOL',r=>r.bundle_sol==null?'—':r.bundle_sol.toFixed(1)],['cluster_held_pct','bundle held %',r=>r.cluster_held_pct==null?'—':r.cluster_held_pct.toFixed(0)+'%'],['cluster_out_entry','bundle SOL out',r=>r.cluster_out_entry==null?'—':r.cluster_out_entry.toFixed(1)],['snipers_n','snipers',r=>r.snipers_n??'—'],['snipers_held_pct','snipers hold %',r=>r.snipers_held_pct==null?'—':r.snipers_held_pct.toFixed(1)+'%'],['fresh_share','fresh wallets',r=>r.fresh_share==null?'—':pct(r.fresh_share)+' <span class="mut">/'+r.fresh_n+'</span>'],['proven_vol_share','proven $ share',r=>pct(r.proven_vol_share)],['dex_paid','dex paid',r=>r.dex_paid==null?'—':r.dex_paid?('yes '+(r.dex_paid_types||'')):'no'],
['holders_entry','holders',r=>r.holders_entry??'—'],['top10_entry','top-10 %',r=>r.top10_entry==null?'—':r.top10_entry.toFixed(0)+'%'],['largest_entry','largest %',r=>r.largest_entry==null?'—':r.largest_entry.toFixed(1)+'%'],['dev_hold_entry','dev hold %',r=>r.dev_hold_entry==null?'—':r.dev_hold_entry.toFixed(1)+'%'],['fee_accrued_entry','fees accrued SOL',r=>r.fee_accrued_entry==null?'—':r.fee_accrued_entry.toFixed(1)],['fee_claims_entry','fee claims',r=>r.fee_claims_entry??'—'],['outside_buyers','launch buyers',r=>r.outside_buyers??'—'],['dev_buy_sol','dev buy SOL',r=>r.dev_buy_sol==null?'—':r.dev_buy_sol.toFixed(2)],['has_socials','socials',r=>r.has_socials==null?'—':r.has_socials?'yes':'no'],
['m30','+30s',r=>x(r.m30)],['m120','+2m',r=>x(r.m120)],['m300','+5m',r=>x(r.m300)],['t_hit15_s','secs to 1.5x',r=>r.t_hit15_s??'—'],['peak','peak',r=>x(r.peak)],['x_t15s40','P1',r=>'<span class="'+(r.x_t15s40>1?'up':r.x_t15s40<1?'dn':'')+'">'+pc(r.x_t15s40)+'</span>'],['x_flow4','P2',r=>'<span class="'+(r.x_flow4>1?'up':r.x_flow4<1?'dn':'')+'">'+pc(r.x_flow4)+'</span>'],['x_split','P3',r=>'<span class="'+(r.x_split>1?'up':r.x_split<1?'dn':'')+'">'+pc(r.x_split)+'</span>'],['split_branch','P3 branch',r=>r.split_branch||'—'],['core_v40','P3 filter',r=>r.core_v40==null?'—':r.core_v40?'yes':'no'],['exit_reason','state',r=>r.closed?(r.exit_reason||'closed'):'open'],['mint','mint',r=>'<a href="https://dexscreener.com/solana/'+r.mint+'" target="_blank">'+r.mint.slice(0,6)+'…</a>']];
let DATA=null,sortK='entry_ts',sortD=-1;
function render(){if(!DATA)return;const q=$('#q').value.toLowerCase(),co=$('#coreonly').checked;let rows=DATA.rows.filter(r=>(!co||r.core===1)&&(!q||(r.name||'').toLowerCase().includes(q)||r.mint.toLowerCase().includes(q)));
rows.sort((a,b)=>{const va=a[sortK],vb=b[sortK];if(va==null&&vb==null)return 0;if(va==null)return 1;if(vb==null)return -1;return (va>vb?1:va<vb?-1:0)*sortD});
$('#t thead').innerHTML='<tr>'+COLS.map(c=>'<th data-k="'+c[0]+'" class="'+(c[0]===sortK?'on':'')+'">'+c[1]+(c[0]===sortK?(sortD>0?' ▲':' ▼'):'')+'</th>').join('')+'</tr>';
$('#t tbody').innerHTML=rows.map(r=>{const ref=r.x_split??r.x_flow4;return '<tr class="'+(ref==null?'':ref>1?'win':'loss')+'">'+COLS.map(c=>'<td>'+c[2](r)+'</td>').join('')+'</tr>'}).join('');
$('#sub').textContent=rows.length+' trades shown · '+DATA.nCore+' core of '+DATA.n+' momentum trades in '+DATA.days+' days · brackets use core trades only';
$('#brackets').innerHTML=DATA.brackets.map(b=>'<div class="card"><h4>'+b.name+'</h4><table><tr><th></th><th>n</th><th>1.5x</th><th>2x</th><th>3x</th><th>P1</th><th>P2</th><th>P3</th></tr>'+b.rows.map(r=>r.n?'<tr><td>'+r.bucket+'</td><td>'+r.n+'</td><td><span class="bar" style="width:'+(r.r15*40)+'px"></span>'+pct(r.r15)+'</td><td>'+pct(r.r2)+'</td><td>'+pct(r.r3)+'</td><td class="'+(r.p1>0?'up':r.p1<0?'dn':'')+'">'+(r.p1==null?'—':(r.p1*100).toFixed(0)+'%')+'</td><td class="'+(r.p2>0?'up':r.p2<0?'dn':'')+'">'+(r.p2==null?'—':(r.p2*100).toFixed(0)+'%')+'</td><td class="'+(r.p3>0?'up':r.p3<0?'dn':'')+'">'+(r.p3==null?'—':(r.p3*100).toFixed(0)+'% <span class="mut">('+r.n3+')</span>')+'</td></tr>':'<tr><td class="mut">'+r.bucket+'</td><td class="mut">0</td><td colspan="6"></td></tr>').join('')+'</table></div>').join('');}
async function load(){const r=await fetch('/api/trades?key='+encodeURIComponent(key)+'&days='+$('#days').value);if(!r.ok){$('#sub').textContent='access denied';return}DATA=await r.json();render()}
$('#t thead').addEventListener('click',e=>{const th=e.target.closest('th');if(!th)return;const k=th.dataset.k;if(sortK===k)sortD=-sortD;else{sortK=k;sortD=-1}render()});
$('#q').oninput=render;$('#coreonly').onchange=render;$('#days').onchange=load;$('#csv').onclick=e=>{e.preventDefault();if(!DATA)return;const cols=Object.keys(DATA.rows[0]||{});const esc=v=>v==null?'':/[",\\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);const csv=[cols.join(',')].concat(DATA.rows.map(r=>cols.map(c=>esc(r[c])).join(','))).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='momentum_trades.csv';a.click()};
load();setInterval(load,60000);
</script></body></html>`;

export function startWeb() {
  if (!KEY()) { console.log("[web] WEB_KEY not set — dashboard disabled"); return; }
  const srv = createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      if (u.searchParams.get("key") !== KEY()) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden"); }
      if (u.pathname === "/api/trades") { const days = Math.min(60, Math.max(1, Number(u.searchParams.get("days")) || 7)); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(tradesDump(days))); }
      if (u.pathname === "/analysis") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(ANALYSIS); }
      if (u.pathname === "/api/snapshot") { const size = Math.min(5, Math.max(0.01, Number(u.searchParams.get("size")) || 0.25)), cost = Math.min(0.5, Math.max(0, Number(u.searchParams.get("cost") ?? 0.05))); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(snapshot(size, cost))); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(PAGE);
    } catch (e) { res.writeHead(500, { "content-type": "text/plain" }); res.end("error: " + e.message); console.error("[web]", e.message); }
  });
  srv.on("error", (e) => console.error("[web] server error", e.message));
  srv.listen(PORT(), "0.0.0.0", () => console.log(`[web] dashboard on :${PORT()}`));
}
