# Steam Skins Price Alert Bot

A Telegram bot that provides real-time CS:GO skin prices from the Steam Community Market. Built with TypeScript and deployed on Vercel as serverless functions.

## Features

- 🎮 Fetch prices from multiple Steam games (CS2, Dota 2, TF2, Rust, PUBG)
- 💰 Support for 40+ currencies worldwide
- 📊 Rich price data (lowest price, volume, median price)
- 🔔 Smart price alerts (absolute, percentage drop, percentage increase)
- 🤖 Simple Telegram bot interface with user registration
- ⚡ Fast response times with serverless deployment
- 🔒 Secure environment variable handling
- 📊 User limits and rate limiting (10 checks/minute, 5 alerts max)
- 💾 Intelligent caching (15-minute cache, historical data)
- 🕐 Automated cron jobs for alert checking

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
- Supabase account for database

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
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   CRON_SECRET=your_cron_secret_key
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

3. Set the environment variables in Vercel dashboard:

   - Go to your project settings
   - Add `BOT_TOKEN` with your Telegram bot token
   - Add `SUPABASE_URL` with your Supabase project URL
   - Add `SUPABASE_ANON_KEY` with your Supabase anon key
   - Add `CRON_SECRET` with a random secret for cron job security

4. Set up the webhook URL in your Telegram bot:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-vercel-domain>/api/telegram
   ```

## Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL commands from `supabase-schema.sql` to create the database tables
4. Copy your project URL and anon key from Settings → API

## Cron Job Setup

To enable automatic price alert checking:

1. Set up a cron job to call `/api/cron` every 5 minutes:

   ```bash
   # Example using cron-job.org or similar service
   # URL: https://your-domain.vercel.app/api/cron
   # Method: POST
   # Headers: x-cron-secret: your_cron_secret_key
   # Schedule: */5 * * * *
   ```

2. The cron job will:
   - Clean up expired cache entries
   - Check all active price alerts
   - Send notifications when prices drop
   - Update current prices in the database

## Usage

1. Start a chat with your bot on Telegram
2. Use `/start` to register and see available commands
3. Send any item name (e.g., "AK-47 | Redline (Field-Tested)")
4. Use `/games` to see supported games
5. Use `/currency` to set your preferred currency
6. Reply to a price check with alert settings:
   - `"50"` - Alert when price reaches $50
   - `"-10%"` - Alert when price drops 10%
   - `"+20%"` - Alert when price increases 20%
7. Use `/alerts` to manage your price alerts
8. Use `/profile` to view your account information

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
