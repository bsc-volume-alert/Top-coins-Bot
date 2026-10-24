// pm2 app for the launcher — separate from the tracker, executor, fomo, scope and radar; a launcher deploy or crash touches none of them.
module.exports = { apps: [{ name: "launcher", script: "src/index.mjs", cwd: "/root/tracker/launcher", max_memory_restart: "300M", node_args: "--max-old-space-size=256",
  env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true, kill_timeout: 8000, out_file: "/root/.pm2/logs/launcher-out.log", error_file: "/root/.pm2/logs/launcher-error.log" }] };
