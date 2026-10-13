import { readFileSync } from "node:fs";
// Load /root/tracker/.env into process.env (no dependency). Imported first by every entrypoint.
try {
  for (const l of readFileSync("/root/tracker/.env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
