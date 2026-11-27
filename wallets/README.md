# wallets — who bought a pump early (research only)

Separate from the paper bot. Read-only: it reads past transactions through the Helius key already on the server and never signs,
sends or trades anything. Runs as its own pm2 process `wallets` at low priority; it does not touch any other process.

How it is driven: add a line to `wallets/requests.txt` on this branch (contract address, optional window). The server picks it up
within 30 s, collects the coin and pushes the result to the branch `wallets-data` under `coins/<address>/`:
`trades.csv.gz` (every buy/sell), `transfers.csv.gz` (wallet-to-wallet moves), `early.csv` (wallets that bought before the
market-cap line, default $100K, with later sells, current holding, wallet age and first funder), `meta.json` (window, counts, cuts).
`status.json` at the top shows progress while a coin is being read.

Method: balance changes per transaction (works on any exchange or launchpad). Cost: 1 Helius credit per transaction read
(default cap 40,000 per coin). Market caps use one SOL/USD rate for the whole window — approximate.

Install once on the server (owner's paste):
`cd /root && git clone -q -b wallets --single-branch "$(git -C /root/older-review remote get-url origin)" wallets-tool && bash wallets-tool/wallets/start.sh`

Tests: `node --test wallets/test/all.test.mjs`
