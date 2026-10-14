module.exports = {
  apps: [
    { name: "tracker-bsc", script: "bsc/index.js", cwd: "/root/tracker-bsc", max_memory_restart: "800M",
      env: { NODE_ENV: "production", ENV_FILE: "/root/tracker-bsc/.env" }, restart_delay: 5000, autorestart: true },
    { name: "deployer-bsc", script: "bsc/deploy.sh", interpreter: "bash", cwd: "/root/tracker-bsc", autorestart: true }
  ]
};
