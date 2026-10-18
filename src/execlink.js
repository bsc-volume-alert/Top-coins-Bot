// v0.18.90: the one bridge between the tracker and the executor (executor/ — the live buy/sell bot, its own pm2 app, its own wallet).
// A local Unix socket: the tracker pushes Project 5 triggers, the exit rules as they fire, paper closes and /live commands; nothing comes back
// that the tracker depends on. If the executor is not running, messages are dropped (triggers are only worth anything for a second or two).
import { connect } from "node:net";
import { existsSync } from "node:fs";
const SOCK = process.env.EXEC_SOCK || "/root/executor/exec.sock";
export const execStats = { connected: false, sent: 0, dropped: 0, reconnects: 0, lastErr: "", lastFeed: 0 };
export const noteFeed = () => { execStats.lastFeed = Date.now(); }; // last trade our feed delivered — sent with every ping so the executor can tell a dead feed from a quiet one
let sock = null, timer = null;
function open() {
  if (process.env.SMOKE || !existsSync(SOCK)) { schedule(); return; }
  try {
    const s = connect(SOCK); sock = s;
    s.on("connect", () => { execStats.connected = true; execStats.reconnects++; console.log("[execlink] connected"); });
    s.on("error", (e) => { execStats.lastErr = e.message; });
    s.on("close", () => { if (sock === s) sock = null; if (execStats.connected) console.log("[execlink] disconnected"); execStats.connected = false; schedule(); });
    s.on("data", () => {}); // pongs etc. — nothing needed yet
  } catch (e) { execStats.lastErr = e.message; schedule(); }
}
function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; open(); }, 3000); }
export function execSend(obj) {
  if (!sock || !execStats.connected) { execStats.dropped++; return false; }
  try { sock.write(JSON.stringify(obj) + "\n"); execStats.sent++; return true; } catch (e) { execStats.lastErr = e.message; execStats.dropped++; return false; }
}
open();
setInterval(() => { if (execStats.connected) execSend({ type: "ping", t: Date.now(), feed: execStats.lastFeed }); }, 15_000);
