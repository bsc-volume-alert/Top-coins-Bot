// pm2 app for coin scope — separate from the tracker, the executor and fomo, so a scope deploy or crash never touches them. Memory-capped.
module.exports = { apps: [{ name: "scope", script: "src/index.mjs", cwd: "/root/tracker/scope", max_memory_restart: "600M", node_args: "--max-old-space-size=512",
  env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true, kill_timeout: 5000, out_file: "/root/.pm2/logs/scope-out.log", error_file: "/root/.pm2/logs/scope-error.log" }] };
