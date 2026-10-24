// pm2 app for radar — separate from the tracker, the executor, fomo and coin scope; a radar deploy or crash touches none of them.
module.exports = { apps: [{ name: "radar", script: "src/index.mjs", cwd: "/root/tracker/radar", max_memory_restart: "300M", node_args: "--max-old-space-size=256",
  env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true, kill_timeout: 5000, out_file: "/root/.pm2/logs/radar-out.log", error_file: "/root/.pm2/logs/radar-error.log" }] };
