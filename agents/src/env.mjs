import { readFileSync } from "node:fs";
// Loads /root/tracker/.env into process.env (same loader as the tracker's src/env.js). Values already set in the environment win.
try {
  for (const l of readFileSync(process.env.ENV_FILE || "/root/tracker/.env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
} catch {}
