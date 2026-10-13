import "./env.js";
import { readFileSync } from "node:fs";
import { tg } from "./telegram.js";
const v = JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version;
console.log(`bundler-tracker v${v} starting (node ${process.version})`);
await tg(`🟢 <b>Tracker online</b> v${v}\nAuto-deploy pipeline confirmed. Modules coming next.`);
setInterval(() => console.log("alive", new Date().toISOString()), 60_000);
