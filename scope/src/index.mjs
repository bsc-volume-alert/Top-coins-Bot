// Coin scope — a separate website (own pm2 app `scope`, own port) for one job: paste a token contract, get the full diagnosis.
// It reads the chain through Helius with its own daily call budget, and the tracker's database read-only. It never writes anything, and it
// shares nothing with the trading bots except the Helius key and that read-only database file.
import "./env.mjs";
import { createServer } from "node:http";
import fs from "node:fs";
import { coinReport, coinLive, coinStat } from "./coin.mjs";
import { PAGE } from "./page.mjs";
import { RADAR_PAGE, radarApi } from "./radarpage.mjs";
import { LAUNCHER_PAGE, launcherApi, launcherAct, launcherSuggest, launcherManual } from "./launcherpage.mjs";
import { FD_PAGE, fdApi } from "./fdpage.mjs"; // 0.10.0: the FD paper-book page (owner, 4 Nov 12:53 UK)
import { RESEARCH_PAGE, researchApi, initResearch } from "./research.mjs"; // 0.14.0: /research (owner go 11 Nov 17:39 UK)
import { FD2_PAGE } from "./fd2page.mjs"; // 0.12.0: the FD page in the old site's design (owner, 5 Nov 12:48 UK)
const LIVE_STOP = (process.env.LAUNCH_HOME || "/root/launcher") + "/live_stop"; // the launcher's kill file for real buys (launcher live.mjs)
const PORT = Number(process.env.SCOPE_PORT || 8791), KEY = process.env.SCOPE_KEY || process.env.WEB_KEY || "";
if (!KEY) { console.log("[scope] no SCOPE_KEY / WEB_KEY in .env — not starting"); process.exit(process.env.SCOPE_SMOKE ? 0 : 1); }
const srv = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("key") !== KEY) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden — open the link with ?key=…"); }
    if (u.pathname === "/coin") { /* 0.8.0: the deep one-coin check lives at /coin; the radar is the home page */ res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(PAGE); }
    if (u.pathname === "/api/coin") { const r = await coinReport(u.searchParams.get("mint"), u.searchParams.get("force") === "1").catch((e) => ({ ok: false, error: e.message })); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r, (k, v) => (typeof v === "bigint" ? v.toString() : v))); }
    if (u.pathname === "/api/live") { const r = await coinLive(u.searchParams.get("mint")).catch((e) => ({ ok: false, error: e.message })); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/" || u.pathname === "/radar") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(RADAR_PAGE); } // 0.7.0
    if (u.pathname === "/api/radar") { let r; try { r = radarApi(Math.min(14, Number(u.searchParams.get("days") || 3))); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname.startsWith("/files/")) { // 0.10.14 (owner, 5 Nov 08:05 UK: the Codex data pack as a link, not a download through the app): files in scope/files/, same key, names only
      const name = u.pathname.slice(7); if (!/^(snap_[A-Za-z0-9_-]+\/)?[A-Za-z0-9._-]+\.(zip|md|csv|json|txt|gz)$/.test(name) || name.includes("..")) { res.writeHead(404); return res.end("no such file"); } // 0.12.11: frozen snapshot folders (snap_*/) and .gz
      const fp = new URL("../files/" + name, import.meta.url); let st; try { st = fs.statSync(fp); } catch { res.writeHead(404); return res.end("no such file"); }
      res.writeHead(200, { "content-type": name.endsWith(".zip") ? "application/zip" : name.endsWith(".gz") ? "application/gzip" : "text/plain; charset=utf-8", "content-length": st.size, "content-disposition": `attachment; filename="${name.split("/").pop()}"`, "cache-control": "no-store" }); return fs.createReadStream(fp).pipe(res); }
    if (u.pathname === "/research") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(RESEARCH_PAGE); } // 0.14.0
    if (u.pathname === "/research/data") { let r; try { r = researchApi(); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/fd2") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(FD2_PAGE); } // 0.12.0
    if (u.pathname === "/api/fd/live") { // 0.12.0: STOP / RESUME real buys — the launcher re-reads its switch every 5 s; open positions still sell on their trail
      if (req.method !== "POST") { res.writeHead(405); return res.end(); } const act = u.searchParams.get("act"); let r;
      try { if (act === "stop") { fs.writeFileSync(LIVE_STOP, new Date().toISOString() + " stopped from /fd2\n"); r = { ok: true, stopped: true }; } else if (act === "resume") { try { fs.unlinkSync(LIVE_STOP); } catch {} r = { ok: true, stopped: false }; } else r = { ok: false, error: "act=stop|resume" }; } catch (e) { r = { ok: false, error: e.message }; }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/fd") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(FD_PAGE); } // 0.10.0
    if (u.pathname === "/api/fd") { let r; try { r = fdApi(Math.min(30, Number(u.searchParams.get("days") || 7))); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/launcher") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(LAUNCHER_PAGE); } // 0.9.0
    if (u.pathname === "/api/launcher") { let r; try { r = launcherApi(Math.min(14, Number(u.searchParams.get("days") || 3))); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/api/launcher/suggest" || u.pathname === "/api/launcher/manual") { // 0.9.3: the Launch-now box (JSON body, picture up to 8 MB)
      if (req.method !== "POST") { res.writeHead(405); return res.end(); }
      const chunks = []; let size = 0; for await (const c of req) { size += c.length; if (size > 12e6) { res.writeHead(413); return res.end(); } chunks.push(c); }
      let b = {}; try { b = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
      let r; try { r = u.pathname.endsWith("suggest") ? await launcherSuggest(b) : launcherManual(b); } catch (e) { r = { ok: false, error: e.message }; }
      res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(r));
    }
    if (u.pathname === "/api/launcher/act") { if (req.method !== "POST") { res.writeHead(405); return res.end(); } let r; try { r = launcherAct(u.searchParams.get("action"), Number(u.searchParams.get("id"))); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/api/status") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ...coinStat, port: PORT })); }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  } catch (e) { try { res.writeHead(500, { "content-type": "text/plain" }); res.end(e.message); } catch {} }
});
srv.listen(PORT, "0.0.0.0", () => console.log(`[scope] coin scope on :${PORT}`)); if (!process.env.SCOPE_SMOKE) initResearch(); // 0.14.0
// 0.6.0: coins listed in scope/relookup.txt are looked up once after a new version starts, so each fix is checked on real coins at once
// (the saved lookups go to the scope-data branch as usual). A done-file stops it repeating on restarts.
if (!process.env.SCOPE_SMOKE) setTimeout(async () => { try { const fs = await import("node:fs"); const ver = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  const mints = fs.readFileSync(new URL("../relookup.txt", import.meta.url), "utf8").split(/\s+/).filter((x) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x)); const done = "/root/tracker/data/scope_relookup_done";
  const key = ver + ":" + mints.join(","); let prev = ""; try { prev = fs.readFileSync(done, "utf8"); } catch {} if (!mints.length || prev === key) return; fs.writeFileSync(done, key);
  for (const m of mints) { console.log("[scope] re-lookup", m); await coinReport(m, true); for (let i = 0; i < 600; i++) { await new Promise((r) => setTimeout(r, 2000)); const r = await coinReport(m); if (!r.pending) break; } } } catch (e) { console.log("[scope] re-lookup:", e.message); } }, 20000);
if (process.env.SCOPE_SMOKE) setTimeout(() => { console.log("[scope] smoke ok"); process.exit(0); }, Number(process.env.SCOPE_SMOKE_MS || 8000));
