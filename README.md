# bundler-tracker (branch: tracker)
Paper-trading tracker for pump.fun bundle / hand-off patterns. Auto-deploys to the droplet via `deploy.sh` (pm2 process `deployer`), which pulls this branch every 30s.
Secrets live in `/root/tracker/.env` on the server only.
