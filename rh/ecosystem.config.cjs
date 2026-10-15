module.exports = {
  apps: [
    { name: "tracker-rh", script: "rh/index.js", cwd: "/root/tracker-rh", max_memory_restart: "500M",
      env: { NODE_ENV: "production", ENV_FILE: "/root/tracker-rh/.env" }, restart_delay: 5000, autorestart: true },
    { name: "deployer-rh", script: "rh/deploy.sh", interpreter: "bash", cwd: "/root/tracker-rh", autorestart: true }
  ]
};
