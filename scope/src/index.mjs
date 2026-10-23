// Coin scope — a separate website (own pm2 app `scope`, own port) for one job: paste a token contract, get the full diagnosis.
// It reads the chain through Helius with its own daily call budget, and the tracker's database read-only. It never writes anything, and it
// shares nothing with the trading bots except the Helius key and that read-only database file.
import "./env.mjs";
import { createServer } from "node:http";
import { coinReport, coinLive, coinStat } from "./coin.mjs";
import { PAGE } from "./page.mjs";
const PORT = Number(process.env.SCOPE_PORT || 8791), KEY = process.env.SCOPE_KEY || process.env.WEB_KEY || "";
if (!KEY) { console.log("[scope] no SCOPE_KEY / WEB_KEY in .env — not starting"); process.exit(process.env.SCOPE_SMOKE ? 0 : 1); }
const srv = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    if (u.searchParams.get("key") !== KEY) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden — open the link with ?key=…"); }
    if (u.pathname === "/" || u.pathname === "/coin") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(PAGE); }
    if (u.pathname === "/api/coin") { const r = await coinReport(u.searchParams.get("mint"), u.searchParams.get("force") === "1").catch((e) => ({ ok: false, error: e.message })); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r, (k, v) => (typeof v === "bigint" ? v.toString() : v))); }
    if (u.pathname === "/api/live") { const r = await coinLive(u.searchParams.get("mint")).catch((e) => ({ ok: false, error: e.message })); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(r)); }
    if (u.pathname === "/api/status") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ...coinStat, port: PORT })); }
    res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
  } catch (e) { try { res.writeHead(500, { "content-type": "text/plain" }); res.end(e.message); } catch {} }
});
srv.listen(PORT, "0.0.0.0", () => console.log(`[scope] coin scope on :${PORT}`));
if (process.env.SCOPE_SMOKE) setTimeout(() => { console.log("[scope] smoke ok"); process.exit(0); }, Number(process.env.SCOPE_SMOKE_MS || 8000));
