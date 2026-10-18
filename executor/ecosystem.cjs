// pm2 app for the executor — separate from the tracker's ecosystem.config.cjs so tracker deploys never touch it.
module.exports = { apps: [{ name: "executor", script: "src/index.mjs", cwd: "/root/tracker/executor", max_memory_restart: "400M", env: { NODE_ENV: "production" }, restart_delay: 3000, autorestart: true, kill_timeout: 8000 }] };
