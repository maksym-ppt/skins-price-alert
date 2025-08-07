# Steam Skins Price Alert Bot

A Telegram bot that provides real-time CS:GO skin prices from the Steam Community Market. Built with TypeScript and deployed on Vercel as serverless functions.

## Features

- 🎮 Fetch CS:GO skin prices directly from Steam Community Market
- 🤖 Simple Telegram bot interface
- ⚡ Fast response times with serverless deployment
- 🔒 Secure environment variable handling

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Telegraf** - Modern Telegram bot framework
- **Axios** - HTTP client for API requests
- **Vercel** - Serverless deployment platform

## Setup

### Prerequisites

- Node.js 16+ installed
- A Telegram bot token from [@BotFather](https://t.me/botfather)
- Vercel account for deployment

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/maksym-ppt/skins-price-alert.git
   cd skins-price-alert
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:

   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Deploy to Vercel:

   ```bash
   vercel
   ```

3. Set the environment variable in Vercel dashboard:

   - Go to your project settings
   - Add `BOT_TOKEN` with your Telegram bot token

4. Set up the webhook URL in your Telegram bot:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-vercel-domain>/api/telegram
   ```

## Usage

1. Start a chat with your bot on Telegram
2. Send any CS:GO item name (e.g., "AK-47 | Redline (Field-Tested)")
3. The bot will respond with the current lowest price from Steam Community Market

## Project Structure

```
skins-price-alert/
├── api/
│   └── telegram.ts          # Vercel serverless function for Telegram webhook
├── src/
│   └── steam.ts            # Steam Market API integration
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## API Reference

### Steam Market API

The bot uses the Steam Community Market API endpoint:

```
https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name={item_name}
```

- `currency=1` - USD currency
- `appid=730` - CS:GO app ID
- `market_hash_name` - URL-encoded item name

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License - see package.json for details.
