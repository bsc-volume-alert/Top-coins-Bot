# 📊 Solana DEX Alerts Bot

Real-time Telegram alerts for Solana token movements via DexScreener API.

## Features

**Every 10 minutes, two alerts:**

### 🚀 Top 5 Gainers
- Tokens >24 hours old
- 1hr price change ≥15%
- Sorted by % gain

### 🆕 Top 5 New Launches
- Tokens <24 hours old
- Sorted by 6hr volume

### Data per coin:
- Symbol & Price
- 1hr % change
- 6hr % change
- Market Cap
- Volume (1hr & 6hr)
- Age
- Links: DexScreener | Axiom | Twitter

## Setup

### 1. Create Telegram Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the bot token

### 2. Get Your Chat ID
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. Copy your chat ID

### 3. Environment Variables
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com)
3. New → Blueprint → Connect your repo
4. Add environment variables
5. Deploy

## Local Development

```bash
npm install
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=xxx npm start
```

## Configuration

Edit these values in `index.js`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ALERT_INTERVAL_MS` | 600000 | 10 minutes between alerts |
| `MIN_1H_GAIN_PERCENT` | 15 | Minimum 1hr gain for gainers |
| `MAX_AGE_NEW_HOURS` | 24 | Max age for "new" tokens |
| `TOP_N` | 5 | Coins per alert |

## API Usage

Uses DexScreener free API:
- ~5-10 calls per cycle
- Well under 300/min rate limit
- No API key required

## License

MIT
