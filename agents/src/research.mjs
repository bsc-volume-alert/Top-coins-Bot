// agents 0.1.0 (owner 11 Nov 2026 17:49 UK: "build another link for the agents" — its own website, apart from the trading site). READ-ONLY window onto the autonomous research loop.
// Every 10 min: `git fetch` of ONLY research-claude, research-codex and tracker into a separate bare copy (/root/research-mirror, borrowing the
// deployer clone's objects through git alternates, so nothing is downloaded twice). Public GitHub, no tokens, no API credits, never pushes.
// Shown: worker run summaries (SUMMARY.txt, else the README's first paragraph marked "(README)"), new REVIEW_REQUESTS.md paragraphs, the
// coordinator's AUTONOMOUS_STATUS.md top paragraph (tracker), both SCOREBOARD.md tables with the coordinator's verdict. Nothing here writes to GitHub, the bot or any book.
import { execFile } from "node:child_process";
import fs from "node:fs";

const MIRROR = process.env.RESEARCH_MIRROR || "/root/research-mirror", SRC = process.env.RESEARCH_SRC_REPO || "/root/tracker";
const WORKERS = [{ branch: "research-claude", dir: "claude", label: "Claude" }, { branch: "research-codex", dir: "codex", label: "ChatGPT" }];
const COORD = { branch: "tracker", path: "reports/blind/AUTONOMOUS_STATUS.md", label: "Coordinator" };
let cache = { ok: false, fetchedAt: null, fetchErr: "not fetched yet", branches: {}, chat: [], runs: [], exps: [], codexStatus: null }, busy = false;

const git = (args, timeout = 120000) => new Promise((resolve, reject) =>
  execFile("nice", ["-n", "19", "git", "-C", MIRROR, ...args], { timeout, maxBuffer: 64 * 1024 * 1024 }, (e, out, err) => (e ? reject(new Error((err || e.message).toString().trim().slice(0, 300))) : resolve(out.toString()))));
const gitOk = (args) => git(args).catch(() => null);
async function ensureMirror() {
  if (fs.existsSync(MIRROR + "/HEAD")) return;
  fs.mkdirSync(MIRROR, { recursive: true });
  await new Promise((res, rej) => execFile("git", ["init", "-q", "--bare", MIRROR], (e) => (e ? rej(e) : res())));
  const url = await new Promise((res, rej) => execFile("git", ["-C", SRC, "remote", "get-url", "origin"], (e, o) => (e ? rej(e) : res(o.toString().trim()))));
  await git(["remote", "add", "origin", url]);
  if (fs.existsSync(SRC + "/.git/objects")) fs.writeFileSync(MIRROR + "/objects/info/alternates", SRC + "/.git/objects\n");
}
async function fetchAll() {
  const errs = [];
  for (const b of [...WORKERS.map((w) => w.branch), COORD.branch]) {
    try { await git(["fetch", "-q", "--no-tags", "origin", `+refs/heads/${b}:refs/heads/${b}`]); }
    catch (e) { if (!/couldn't find remote ref/i.test(e.message)) errs.push(`${b}: ${e.message}`); }
  }
  return errs;
}
const paragraphs = (txt) => txt.split(/\n\s*\n/).map((p) => p.split("\n").filter((l) => !/^\s*#/.test(l) && !/^\s*\|/.test(l)).join("\n").trim()).filter(Boolean); // heading and table lines dropped, the rest kept
const firstPara = (txt) => paragraphs(txt || "")[0] || "";
async function headOf(b) { const h = await gitOk(["rev-parse", "--verify", "-q", `refs/heads/${b}`]); return h ? h.trim() : null; }

async function workerEntries(w, head) {
  const out = [], base = `reports/blind/autonomous/${w.dir}`;
  // run files: when each was first added (one log call)
  const added = new Map(); let cur = null;
  const log = (await gitOk(["log", "--diff-filter=A", "--name-only", "--format=@@%H %ct", `refs/heads/${w.branch}`, "--", `${base}/runs`])) || "";
  for (const line of log.split("\n")) { if (line.startsWith("@@")) { const [h, t] = line.slice(2).split(" "); cur = { h, t: +t }; } else if (line.trim() && cur && !added.has(line.trim())) added.set(line.trim(), cur); }
  const files = ((await gitOk(["ls-tree", "-r", "--name-only", `refs/heads/${w.branch}`, "--", `${base}/runs`])) || "").split("\n").filter(Boolean);
  const runs = [...new Set(files.map((f) => f.slice(base.length + 6).split("/")[0]).filter(Boolean))];
  for (const id of runs) {
    const sum = `${base}/runs/${id}/SUMMARY.txt`, rd = `${base}/runs/${id}/README.md`;
    let path = null, text = null, kind = "summary";
    if (files.includes(sum)) { path = sum; text = await gitOk(["show", `refs/heads/${w.branch}:${sum}`]); }
    else if (files.includes(rd)) { path = rd; kind = "readme"; text = firstPara(await gitOk(["show", `refs/heads/${w.branch}:${rd}`])); }
    if (!path || !text) continue;
    const a = added.get(path) || { h: head, t: null };
    out.push({ who: w.label, kind, run: id, text: text.trim().slice(0, 4000), ts: a.t, branch: w.branch, commit: a.h.slice(0, 7), file: path });
  }
  // REVIEW_REQUESTS.md: each paragraph a commit added
  const rr = `${base}/REVIEW_REQUESTS.md`;
  const p = (await gitOk(["log", "--reverse", "--format=@@%H %ct", "-p", "--unified=0", `refs/heads/${w.branch}`, "--", rr])) || "";
  let c = null, buf = [];
  const flush = () => { for (const para of paragraphs(buf.join("\n"))) out.push({ who: w.label, kind: "review request", text: para.slice(0, 4000), ts: c?.t ?? null, branch: w.branch, commit: c?.h.slice(0, 7) ?? "", file: rr }); buf = []; };
  for (const line of p.split("\n")) {
    if (line.startsWith("@@") && !line.startsWith("@@ ")) { flush(); const [h, t] = line.slice(2).split(" "); c = { h, t: +t }; }
    else if (line.startsWith("@@ ")) buf.push(""); // hunk boundary = paragraph boundary
    else if (line.startsWith("+") && !line.startsWith("+++")) buf.push(line.slice(1));
  }
  flush();
  // DIALOGUE.md (Idea lab, 11 Nov 2026): each "## <time> UTC — <agent> — <run> — re: …" post a commit added
  const dl = `${base}/DIALOGUE.md`;
  const dp = (await gitOk(["log", "--reverse", "--format=@@%H %ct", "-p", "--unified=0", `refs/heads/${w.branch}`, "--", dl])) || "";
  let dc = null, post = null;
  const push = () => { if (post && (post.head || post.body.join("\n").trim())) { const m = post.head.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/); const t = m ? Date.parse(m[1] + "T" + m[2] + ":00Z") / 1000 : null;
    out.push({ who: w.label, kind: "dialogue", title: post.head.replace(/^##\s*/, "").slice(0, 300), text: post.body.join("\n").trim().slice(0, 6000), ts: t || post.c?.t || null, branch: w.branch, commit: post.c?.h.slice(0, 7) ?? "", file: dl }); } post = null; };
  for (const line of dp.split("\n")) {
    if (line.startsWith("@@") && !line.startsWith("@@ ")) { push(); const [h, t] = line.slice(2).split(" "); dc = { h, t: +t }; }
    else if (line.startsWith("+") && !line.startsWith("+++")) { const l = line.slice(1); if (/^##\s/.test(l)) { push(); post = { head: l, body: [], c: dc }; } else if (post) post.body.push(l); }
  }
  push();
  return out;
}
function expRows(md, who, branch) {
  const rows = [];
  for (const line of (md || "").split("\n")) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line) || /^\|\s*Exp\s*ID\s*\|/i.test(line)) continue;
    const c = line.split("|").slice(1, -1).map((x) => x.trim());
    if (c.length >= 2) rows.push({ who, branch, id: c[0], idea: c[1] || "", data: c[2] || "", trades: c[3] || "", total: c[4] || "", mean: c[5] || "", noTop3: c[6] || "", variants: c[7] || "", verdict: c[8] || "", run: c[9] || "" });
  }
  return rows;
}
function scoreRows(md, who, branch) {
  const rows = [];
  for (const line of (md || "").split("\n")) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line) || /^\|\s*Run\s*\|/i.test(line)) continue;
    const c = line.split("|").slice(1, -1).map((x) => x.trim());
    if (c.length >= 2) rows.push({ who, branch, run: c[0], question: c[1] || "", executed: c[2] || "", profitability: c[3] || "", next: c[4] || "" });
  }
  return rows;
}
async function refresh() {
  if (busy) return; busy = true;
  const next = { ok: true, fetchedAt: Math.floor(Date.now() / 1000), fetchErr: null, branches: {}, chat: [], runs: [], exps: [], codexStatus: null };
  try {
    await ensureMirror();
    const errs = await fetchAll(); if (errs.length) next.fetchErr = errs.join(" · ");
    for (const w of WORKERS) {
      const head = await headOf(w.branch); next.branches[w.branch] = head ? head.slice(0, 7) : null;
      if (!head) continue;
      next.chat.push(...(await workerEntries(w, head)));
      next.runs.push(...scoreRows(await gitOk(["show", `refs/heads/${w.branch}:reports/blind/autonomous/${w.dir}/SCOREBOARD.md`]), w.label, w.branch));
      next.exps.push(...expRows(await gitOk(["show", `refs/heads/${w.branch}:reports/blind/autonomous/${w.dir}/EXPERIMENTS.md`]), w.label, w.branch));
    }
    try { const s = JSON.parse((await gitOk(["show", "refs/heads/research-codex:reports/blind/autonomous/codex/STATUS.json"])) || "null"); if (s) next.codexStatus = { run_id: s.run_id, state: s.state, started_at: s.started_at, completed_at: s.completed_at, next_task: s.next_task, next_run: s.next_run_at || s.next_run || null }; } catch {}
    const th = await headOf(COORD.branch); next.branches[COORD.branch] = th ? th.slice(0, 7) : null;
    let status = "";
    if (th) {
      const hist = ((await gitOk(["log", "-12", "--format=%H %ct", `refs/heads/${COORD.branch}`, "--", COORD.path])) || "").split("\n").filter(Boolean);
      for (const l of hist) { const [h, t] = l.split(" "); const txt = await gitOk(["show", `${h}:${COORD.path}`]); const para = firstPara(txt);
        if (para) next.chat.push({ who: COORD.label, kind: "status", text: para.slice(0, 4000), ts: +t, branch: COORD.branch, commit: h.slice(0, 7), file: COORD.path }); }
      status = (await gitOk(["show", `refs/heads/${COORD.branch}:${COORD.path}`])) || "";
    }
    const lines = status.split("\n");
    for (const r of next.exps) {
      const hit = r.id && lines.find((l) => l.includes(r.id));
      r.coord = !hit ? null : /not\s+reproduced/i.test(hit) ? "not reproduced" : /reproduced/i.test(hit) ? "reproduced" : null;
    }
    for (const r of next.runs) {
      const hit = r.run && lines.find((l) => l.includes(r.run));
      r.verdict = !hit ? null : /not\s+reproduced/i.test(hit) ? "not reproduced" : /reproduced/i.test(hit) ? "reproduced" : null;
      r.verdictLine = hit ? hit.trim().slice(0, 300) : null;
    }
    // de-duplicate coordinator paragraphs that did not change between commits; newest first
    const seen = new Set(); next.chat = next.chat.filter((e) => { if (e.who !== COORD.label) return true; const k = e.text; if (seen.has(k)) return false; seen.add(k); return true; });
    next.chat.sort((a, b) => (b.ts || 0) - (a.ts || 0)); next.chat = next.chat.slice(0, 300);
    cache = next;
  } catch (e) { cache = { ...cache, fetchErr: e.message.slice(0, 300), fetchedAt: Math.floor(Date.now() / 1000) }; }
  finally { busy = false; }
}
export function researchApi() { return { ...cache, now: Math.floor(Date.now() / 1000) }; }
export function initResearch() { setTimeout(() => refresh().catch(() => {}), 30000); setInterval(() => refresh().catch(() => {}), 600000); }

export const RESEARCH_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agents — research room</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--line:#2a2f3a;--tx:#e6e8ec;--mut:#9aa3b2;--ok:#4cc38a;--bad:#ef6b6b;--c:#7aa7ff;--g:#c58bff;--co:#f0b35a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif}
header{padding:14px 16px;border-bottom:1px solid var(--line)}h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:0 0 10px}
.mut{color:var(--mut)}.small{font-size:12px}.wrap{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;padding:14px 16px}
@media(max-width:900px){.wrap{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px}
.msg{border-left:3px solid var(--line);padding:8px 10px;margin:0 0 10px;background:#12151b;border-radius:0 8px 8px 0}
.msg .who{font-weight:600}.msg.Claude{border-color:var(--c)}.msg.ChatGPT{border-color:var(--g)}.msg.Coordinator{border-color:var(--co)}
.Claude .who{color:var(--c)}.ChatGPT .who{color:var(--g)}.Coordinator .who{color:var(--co)}
.msg pre{white-space:pre-wrap;word-wrap:break-word;font:inherit;margin:6px 0 0}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:500}
.ok{color:var(--ok)}.bad{color:var(--bad)}.tag{display:inline-block;font-size:11px;padding:1px 6px;border:1px solid var(--line);border-radius:999px;color:var(--mut);margin-left:6px}
.tbl{overflow-x:auto}.err{color:var(--bad)}
</style></head><body>
<header><h1>Agents — research room <span class="tag">read-only</span></h1><div id="hdr" class="small mut">loading…</div></header>
<div class="wrap"><section class="card"><h2>Dialogue &amp; messages <span class="mut small">— newest first; every entry is something an agent actually wrote on GitHub</span></h2><div id="chat"></div></section>
<section><div class="card" style="margin-bottom:14px"><h2>Experiments — pretend trades on saved coins <span class="mut small">— both EXPERIMENTS.md files, newest last</span></h2><div id="exps" class="tbl"></div></div><div class="card"><h2>Research runs <span class="mut small">— both SCOREBOARD.md files, as written; verdict from AUTONOMOUS_STATUS.md</span></h2><div id="runs" class="tbl"></div></div></section></div>
<script>
var KEY=new URLSearchParams(location.search).get('key')||'';
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function UK(t){if(!t)return '—';return new Date(t*1000).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})}
function sol(v){return (v>=0?'+':'')+v.toFixed(3)}
function nextAt(list){var now=new Date();var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);var m=+p.slice(0,2)*60+ +p.slice(3);for(var i=0;i<list.length;i++){var x=list[i].split(':');if(+x[0]*60+ +x[1]>m)return list[i]}return list[0]+' (tomorrow)'}
var CW=['02:50','06:50','10:50','14:50','18:50','22:50'],CO=['00:35','04:35','08:35','12:35','16:35','20:35'];
function draw(j){
 var cs=j.codexStatus;var br=j.branches||{};
 document.getElementById('hdr').innerHTML='Last fetch: <b>'+UK(j.fetchedAt)+'</b> UK (every 10 min)'+(j.fetchErr?' · <span class="err">'+esc(j.fetchErr)+'</span>':'')+
  '<br>Next: Claude worker <b>'+nextAt(CW)+'</b> (02:50 / 06:50 / 10:50 / 14:50 / 18:50 / 22:50) · Coordinator <b>'+nextAt(CO)+'</b> (00:35 / 04:35 / 08:35 / 12:35 / 16:35 / 20:35) · ChatGPT (Codex): '+(cs&&cs.next_run?esc(cs.next_run):'per its own scheduler')+(cs?' — last run '+esc(cs.run_id)+' '+esc(cs.state)+(cs.completed_at?' at '+UK(Date.parse(cs.completed_at)/1000):'')+(cs.next_task?', next task '+esc(cs.next_task):''):'')+
  '<br>Branches: '+['research-claude','research-codex','tracker'].map(function(b){return b+' '+(br[b]?'<code>'+br[b]+'</code>':'<span class="mut">not on GitHub yet</span>')}).join(' · ');
 var ch=j.chat||[];document.getElementById('chat').innerHTML=ch.length?ch.map(function(e){return '<div class="msg '+e.who+'"><div><span class="who">'+e.who+'</span> <span class="mut small">'+UK(e.ts)+' · '+esc(e.branch)+' @ <code>'+esc(e.commit)+'</code> · '+esc(e.kind==='readme'?'run '+e.run+' (README)':e.kind==='summary'?'run '+e.run:e.kind==='dialogue'?'dialogue · '+(e.title||''):e.kind)+'</span></div><pre>'+esc(e.text)+'</pre></div>'}).join(''):'<div class="mut">Nothing written yet.</div>';
 var X=j.exps||[];document.getElementById('exps').innerHTML=X.length?'<table><tr><th>Agent / ID</th><th>Idea</th><th>Trades</th><th>Total SOL</th><th>Mean / median</th><th>Without best 3</th><th>Verdict</th><th>Coordinator</th></tr>'+X.map(function(r){return '<tr><td><b>'+esc(r.who)+'</b><br><span class="small mut">'+esc(r.id)+'</span></td><td>'+esc(r.idea)+(r.data?'<br><span class="small mut">'+esc(r.data)+(r.variants?' · variants '+esc(r.variants):'')+'</span>':'')+'</td><td class="small">'+esc(r.trades)+'</td><td class="small">'+esc(r.total)+'</td><td class="small">'+esc(r.mean)+'</td><td class="small">'+esc(r.noTop3)+'</td><td class="small">'+esc(r.verdict)+'</td><td class="small">'+(r.coord?'<b class="'+(r.coord==='reproduced'?'ok':'bad')+'">'+r.coord+'</b>':'<span class="mut">—</span>')+'</td></tr>'}).join('')+'</table>':'<div class="mut">No experiments yet — the Idea lab starts with the next runs.</div>';
 var R=j.runs||[];document.getElementById('runs').innerHTML=R.length?'<table><tr><th>Worker / run</th><th>Question</th><th>Executed result</th><th>After-cost / profitability</th><th>Coordinator</th></tr>'+R.map(function(r){return '<tr><td><b>'+esc(r.who)+'</b><br><span class="small mut">'+esc(r.run)+'</span></td><td>'+esc(r.question)+'</td><td class="small">'+esc(r.executed)+'</td><td class="small">'+esc(r.profitability)+'</td><td class="small">'+(r.verdict?'<b class="'+(r.verdict==='reproduced'?'ok':'bad')+'">'+r.verdict+'</b>':'<span class="mut">no verdict yet</span>')+'</td></tr>'}).join('')+'</table>':'<div class="mut">No scoreboard rows yet.</div>';
}
function load(){fetch('/api/data?key='+encodeURIComponent(KEY),{cache:'no-store'}).then(function(r){return r.json()}).then(draw).catch(function(e){document.getElementById('hdr').textContent='error: '+e.message})}
load();setInterval(load,60000);
</script></body></html>`;
