module.exports = {
  apps: [
    { name: "tracker", script: "src/index.js", cwd: "/root/tracker", max_memory_restart: "1800M", node_args: "--max-old-space-size=1500", /* 0.19.7 (7 Nov 00:24 UK, owner "go fix"): 450 MB heap set for the 2 GB box; the droplet is now 2 vCPU / 4 GB and the tracker hit that ceiling twice on 6 Nov (21:24, 23:33 — "heap out of memory" ~1 h 50 min after each start). Why the heap climbs ~450 MB in two hours is the morning's question. */
      env: { NODE_ENV: "production" }, restart_delay: 5000, autorestart: true },
    { name: "deployer", script: "deploy.sh", interpreter: "bash", cwd: "/root/tracker", autorestart: true }
  ]
};
