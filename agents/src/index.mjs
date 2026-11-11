// agents 0.1.0 (owner, 11 Nov 2026 17:49 UK): a separate website for the research agents (Claude worker, ChatGPT/Codex worker, coordinator).
// Own pm2 app `agents`, own port (AGENTS_PORT, default 8792), same site key as the other pages. Read-only: it git-fetches three branches every
// 10 min and shows what the agents wrote. It never writes to GitHub and never touches the bot, the books or the trading site.
import "./env.mjs";
import { createServer } from "node:http";
import { RESEARCH_PAGE, researchApi, initResearch } from "./research.mjs";
const PORT = Number(process.env.AGENTS_PORT || 8792), KEY = process.env.AGENTS_KEY || process.env.SCOPE_KEY || process.env.WEB_KEY || "";
if (!KEY) { console.log("[agents] no site key in .env — not starting"); process.exit(process.env.AGENTS_SMOKE ? 0 : 1); }
const srv = createServer((req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("key") !== KEY) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden — open the link with ?key=…"); }
    if (u.pathname === "/" || u.pathname === "/research") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(RESEARCH_PAGE); }
    if (u.pathname === "/api/data") { let r; try { r = researchApi(); } catch (e) { r = { ok: false, error: e.message }; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  } catch (e) { try { res.writeHead(500); res.end("error"); } catch {} }
});
srv.listen(PORT, "0.0.0.0", () => console.log(`[agents] research room on :${PORT}`));
if (process.env.AGENTS_SMOKE) setTimeout(() => { console.log("[agents] smoke ok"); process.exit(0); }, Number(process.env.AGENTS_SMOKE_MS || 4000));
else initResearch();
