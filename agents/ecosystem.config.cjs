// pm2 app for the agents' research room — separate from the tracker, the launcher and coin scope, so its deploy or crash never touches them.
module.exports = { apps: [{ name: "agents", script: "src/index.mjs", cwd: "/root/tracker/agents", max_memory_restart: "200M",
  env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true, kill_timeout: 5000, out_file: "/root/.pm2/logs/agents-out.log", error_file: "/root/.pm2/logs/agents-error.log" }] };
