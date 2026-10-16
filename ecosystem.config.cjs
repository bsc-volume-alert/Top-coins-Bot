module.exports = {
  apps: [
    { name: "tracker", script: "src/index.js", cwd: "/root/tracker", max_memory_restart: "900M", node_args: "--max-old-space-size=450",
      env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true },
    { name: "deployer", script: "deploy.sh", interpreter: "bash", cwd: "/root/tracker", autorestart: true }
  ]
};
