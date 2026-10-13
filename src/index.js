import { readFileSync } from "node:fs";
import { tg } from "./telegram.js";
// load .env (no dependency)
try { for (const l of readFileSync("/root/tracker/.env","utf8").split("\n")) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]]=m[2]; } } catch {}
const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
console.log(`bundler-tracker v${v} starting (node ${process.version})`);
await tg(`🟢 <b>Tracker online</b> v${v}\nDeploy pipeline working. Modules coming next.`);
setInterval(() => console.log("alive", new Date().toISOString()), 60_000);
