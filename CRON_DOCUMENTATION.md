# Cron Job Documentation

## Overview

The CS2 Skins Price Alert Bot includes an automated cron job system that checks price alerts every 5 minutes. This system ensures users receive timely notifications when their target prices are reached.

## Architecture

### Components

1. **API Endpoint**: `/api/cron` - Vercel serverless function
2. **Scheduler**: Vercel Cron Jobs (configured in `vercel.json`)
3. **Authentication**: Bearer token with `CRON_SECRET`
4. **Database**: Supabase for storing alerts and cache
5. **Notifications**: Telegram Bot API for sending messages

### File Structure

```
api/
└── cron.ts                 # Main cron job handler
scripts/
├── test-cron.ts           # Local testing (no notifications)
├── test-cron-local.ts     # Local testing (with notifications)
└── test-cron-api.ts       # API endpoint testing
```

## Configuration

### Environment Variables

```env
# Required for cron job
CRON_SECRET=your-secret-key-here
BOT_TOKEN=your-telegram-bot-token

# Required for database access
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Vercel Configuration

The cron job is automatically configured in `vercel.json`:

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

**Schedule**: `*/5 * * * *` means every 5 minutes

- `*/5` - Every 5 minutes
- `*` - Every hour
- `*` - Every day of month
- `*` - Every month
- `*` - Every day of week

## How It Works

### 1. Authentication

- Verifies `Authorization: Bearer <CRON_SECRET>` header
- Returns 401 if secret doesn't match

### 2. Cache Cleanup

- Removes expired price cache entries
- Frees up database space
- Improves performance

### 3. Alert Processing

- Fetches all active alerts from database
- Gets current prices from Steam API
- Compares prices with alert conditions
- Triggers notifications when conditions are met

### 4. Alert Types

#### Absolute Price Alert

```typescript
if (currentPrice <= targetPrice) {
  // Trigger alert
}
```

#### Percentage Drop Alert

```typescript
const dropPercentage = ((basePrice - currentPrice) / basePrice) * 100;
if (dropPercentage >= threshold) {
  // Trigger alert
}
```

#### Percentage Increase Alert

```typescript
const increasePercentage = ((currentPrice - basePrice) / basePrice) * 100;
if (increasePercentage >= threshold) {
  // Trigger alert
}
```

### 5. Notification & Cleanup

- Sends Telegram message to user
- Deactivates the alert (sets `is_active = false`)
- Updates current price in database

## Testing

### Local Testing (No Notifications)

```bash
npx ts-node scripts/test-cron.ts
```

**Features:**

- Tests all cron logic locally
- No actual notifications sent
- Updates database with current prices
- Shows detailed processing logs

### Local Testing (With Notifications)

```bash
npx ts-node scripts/test-cron-local.ts
```

**Features:**

- Tests complete cron functionality
- Sends actual Telegram notifications
- Deactivates triggered alerts
- Use with caution in production

### API Endpoint Testing

```bash
npx ts-node scripts/test-cron-api.ts
```

**Features:**

- Tests the deployed API endpoint
- Requires `CRON_SECRET` to be set
- Works with local or deployed versions

## Error Handling

### Rate Limiting

- 1-second delay between each alert processing
- Prevents Steam API rate limit issues
- Configurable in the code

### Error Recovery

- Individual alert errors don't stop the entire process
- Failed alerts are logged and counted
- Database operations are wrapped in try-catch blocks

### Logging

- Comprehensive console logging
- Error details for debugging
- Processing statistics

## Monitoring

### Response Format

```json
{
  "success": true,
  "processed": 5,
  "triggered": 2,
  "errors": 0
}
```

### Log Output

```
🕐 Starting cron job...
✅ Cleaned up expired cache
📊 Found 5 active alerts
🔍 Processing: AK-47 | Redline (Field-Tested)
   Current price: $45.20
   Target price: $50.00
   ✅ No trigger - updating current price
🎉 ALERT TRIGGERED: Price dropped to $48.50 (target: $50.00)
📱 Notification sent to user 123456789
🗑️ Alert deactivated: alert-id-123
✅ Processed 5 alerts
🔔 Triggered 2 alerts
❌ Errors: 0
```

## Security

### Authentication

- Bearer token authentication required
- `CRON_SECRET` must be set in environment
- Unauthorized requests return 401

### Database Security

- Uses service role key for admin operations
- Row Level Security (RLS) enabled
- Prepared statements prevent SQL injection

### API Security

- HTTPS only in production
- Rate limiting prevents abuse
- Input validation on all parameters

## Troubleshooting

### Common Issues

1. **401 Unauthorized**

   - Check `CRON_SECRET` environment variable
   - Verify Authorization header format

2. **Database Connection Errors**

   - Verify Supabase credentials
   - Check network connectivity
   - Ensure service role key has proper permissions

3. **Telegram Notification Failures**

   - Verify `BOT_TOKEN` is valid
   - Check if bot is blocked by user
   - Ensure bot has permission to send messages

4. **Steam API Errors**
   - Check if Steam API is accessible
   - Verify item names are correct
   - Monitor rate limiting

### Debug Mode

Enable detailed logging by setting:

```env
DEBUG=true
```

This will show additional information about:

- Database queries
- API responses
- Processing steps

## Performance

### Optimization

- Parallel processing of alerts (with rate limiting)
- Efficient database queries
- Caching of Steam API responses
- Minimal memory usage

### Scalability

- Serverless architecture scales automatically
- Database connection pooling
- Stateless processing

### Monitoring

- Response time tracking
- Error rate monitoring
- Alert processing statistics

## Deployment

### Vercel Deployment

1. Push code to repository
2. Vercel automatically detects cron configuration
3. Cron job starts running after deployment
4. Monitor logs in Vercel dashboard

### Manual Deployment

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add CRON_SECRET
vercel env add BOT_TOKEN
# ... other variables
```

## Maintenance

### Regular Tasks

- Monitor cron job logs
- Check error rates
- Verify alert processing
- Update dependencies

### Backup

- Database backups (handled by Supabase)
- Configuration backups
- Log retention

### Updates

- Keep dependencies updated
- Monitor for breaking changes
- Test thoroughly before deployment
