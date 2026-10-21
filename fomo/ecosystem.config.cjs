// pm2 app for the fomo watcher — separate from the tracker's and the executor's ecosystem files, so a fomo deploy never touches them.
// Memory-capped (owner's isolation rule, 21 Oct 2026): a leak restarts fomo, not the box.
module.exports = { apps: [{ name: "fomo", script: "src/index.mjs", cwd: "/root/tracker/fomo", max_memory_restart: "600M", node_args: "--max-old-space-size=400",
  env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true, kill_timeout: 8000, out_file: "/root/.pm2/logs/fomo-out.log", error_file: "/root/.pm2/logs/fomo-error.log" }] };
