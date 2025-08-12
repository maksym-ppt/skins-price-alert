# CS2 Skins Price Alert Bot

A Telegram bot that provides real-time CS2 skin prices from the Steam Community Market. Built with TypeScript and deployed on Vercel as serverless functions.

## Features

- 🎮 Fetch prices from CS2 Steam Community Market
- 💰 Support for 40+ currencies worldwide
- 📊 Rich price data (lowest price, volume, median price)
- 🔔 Smart price alerts (absolute, percentage drop, percentage increase)
- 🤖 Simple Telegram bot interface with user registration
- ⚡ Fast response times with serverless deployment
- 🔒 Secure environment variable handling
- 📊 User limits and rate limiting (10-60 checks/minute, 1-20 alerts based on tier)
- 💾 Intelligent caching (15-minute cache, historical data)
- 🕐 Automated cron jobs for alert checking (every 5 minutes)
- 👤 User profile management with tier-based limits

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
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Telegram Bot Configuration
   BOT_TOKEN=your_telegram_bot_token_here

   # Cron Job Configuration
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
   - Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase project URL
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your Supabase anon key
   - Add `SUPABASE_SERVICE_ROLE_KEY` with your Supabase service role key
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

The bot includes automated cron jobs for checking price alerts. The cron job is configured in `vercel.json` and runs every 5 minutes.

### Automatic Setup (Vercel)

The cron job is automatically configured when deployed to Vercel:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Manual Testing

You can test the cron job manually using the provided scripts:

```bash
# Test cron logic locally (without sending notifications)
npx ts-node scripts/test-cron.ts

# Test cron logic locally (with notifications)
npx ts-node scripts/test-cron-local.ts

# Test the deployed API endpoint
npx ts-node scripts/test-cron-api.ts
```

### Cron Job Features

The cron job performs the following tasks:

- 🧹 Clean up expired cache entries
- 📊 Check all active price alerts
- 📱 Send Telegram notifications when alerts are triggered
- 🗑️ Automatically deactivate triggered alerts
- 💾 Update current prices in the database
- ⏱️ Rate limiting (1 second delay between requests)
- 🔒 Secure authentication with CRON_SECRET

## Usage

1. Start a chat with your bot on Telegram
2. Use `/start` to register and see available commands
3. Send any CS2 item name (e.g., "AK-47 | Redline (Field-Tested)")
4. Use `/search` for step-by-step item search
5. Use `/currency` to set your preferred currency
6. Reply to a price check with alert settings:
   - `"50"` - Alert when price reaches $50
   - `"-10%"` - Alert when price drops 10%
   - `"+20%"` - Alert when price increases 20%
7. Use `/alerts` to manage your price alerts
8. Use `/profile` to view your account information and limits

## Project Structure

```
skins-price-alert/
├── api/
│   ├── telegram.ts         # Vercel serverless function for Telegram webhook
│   └── cron.ts            # Vercel serverless function for cron jobs
├── src/
│   ├── database.ts        # Database operations and services
│   ├── steam.ts           # Steam Market API integration
│   ├── search-service.ts  # Item search functionality
│   └── telegram/          # Telegram bot handlers
│       ├── bot.ts         # Bot initialization
│       └── handlers/      # Command and message handlers
├── scripts/               # Testing and utility scripts
├── tests/                 # Test files
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vercel.json           # Vercel deployment configuration
└── README.md             # Project documentation
```

## API Reference

### Steam Market API

The bot uses the Steam Community Market API endpoint:

```
https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name={item_name}
```

- `currency=1` - USD currency
- `appid=730` - CS2 app ID
- `market_hash_name` - URL-encoded item name

### User Tiers and Limits

The bot supports different user tiers with varying limits:

| Tier    | Price Checks/Min | Max Alerts | Features                            |
| ------- | ---------------- | ---------- | ----------------------------------- |
| Free    | 10               | 1          | Basic price checking and alerts     |
| Premium | 30               | 10         | Enhanced limits and features        |
| Pro     | 60               | 20         | Maximum limits and priority support |

### Cron Job API

The cron job endpoint (`/api/cron`) requires authentication:

```
GET /api/cron
Authorization: Bearer <CRON_SECRET>
```

Returns JSON response with processing results.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License - see package.json for details.
