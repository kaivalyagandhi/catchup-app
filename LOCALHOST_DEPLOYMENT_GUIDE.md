# Google Sync Optimization - Localhost Deployment Guide

## Overview

This guide walks you through deploying and testing the Google Sync Optimization feature on your local machine (localhost). This is perfect for development and testing before deploying to staging or production.

## Prerequisites

### 1. PostgreSQL Running
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Verify it's running
psql -U postgres -c "SELECT version();"
```

### 2. Node.js and npm
```bash
node --version  # Should be v18 or higher
npm --version
```

### 3. Environment Variables
Make sure you have a `.env` file with at least:
```bash
# Database
DB_HOST=localhost
DB_USER=postgres
DB_NAME=catchup_dev
DB_PASSWORD=your-password

# Google OAuth (optional for basic testing)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CONTACTS_REDIRECT_URI=http://localhost:3000/api/contacts/oauth/callback
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Webhook (optional - won't work on localhost without ngrok)
WEBHOOK_BASE_URL=http://localhost:3000
WEBHOOK_VERIFICATION_TOKEN=test-token-for-localhost
```

## Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Run the deployment script
./scripts/deploy-localhost.sh
```

The script will:
1. ✅ Check PostgreSQL connection
2. ✅ Create database if needed
3. ✅ Optionally create backup
4. ✅ Install dependencies
5. ✅ Build application
6. ✅ Run all migrations
7. ✅ Verify migrations
8. ✅ Optionally run tests

### Option 2: Manual Deployment

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE catchup_dev;"

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Run migrations
npm run migrate

# 5. Run tests
npm test -- --run
```

## Post-Deployment Setup

### 1. Start the Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 2. Promote Yourself as Admin

```bash
# Replace with your email
npm run promote-admin -- promote your-email@example.com

# Verify
npm run promote-admin -- list
```

### 3. Access the Application

- **Main App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin/sync-health.html

## Testing the Features

### 1. Test Admin Dashboard

1. Open http://localhost:3000/admin/sync-health.html
2. You should see the sync health dashboard
3. Initially, metrics will be empty (no users yet)

### 2. Test Google Contacts Integration

**Note**: You'll need valid Google OAuth credentials in your `.env` file.

1. Go to http://localhost:3000
2. Click "Connect Google Contacts"
3. Authorize with Google
4. **Immediate First Sync** should trigger
5. Check the progress UI
6. Verify contacts appear in the app

### 3. Test Google Calendar Integration

1. Click "Connect Google Calendar"
2. Authorize with Google
3. **Immediate First Sync** should trigger
4. Verify calendar events appear

**Note**: Webhooks won't work on localhost unless you use ngrok (see below).

### 4. Test Manual Sync

```bash
# Get your JWT token from browser (localStorage or cookies)
JWT_TOKEN="your-jwt-token"

# Test manual sync
curl -X POST http://localhost:3000/api/sync/manual \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"your-user-id","integrationType":"contacts"}'
```

### 5. Test Admin Dashboard Metrics

After connecting integrations and running syncs:

1. Refresh admin dashboard
2. You should see:
   - Total users with integrations
   - Sync metrics
   - Token health
   - Circuit breaker status

### 6. Test Onboarding Flow

1. Create a new user account
2. Connect Google Contacts
3. Verify:
   - Immediate sync triggers
   - Progress UI shows status
   - Contacts appear within seconds
   - Next sync scheduled in 1 hour

## Testing Webhooks on Localhost

Webhooks require a publicly accessible URL. Here's how to test them:

### Option 1: Use ngrok (Recommended)

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start ngrok
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io

# Update your .env
WEBHOOK_BASE_URL=https://abc123.ngrok.io

# Restart your server
npm run dev

# Now webhooks will work!
```

### Option 2: Skip Webhooks

Calendar sync will work fine without webhooks - it will just use polling instead (every 4 hours by default, or 2 hours during onboarding).

## Monitoring on Localhost

You can use the monitoring scripts on localhost too:

```bash
# Set environment
export NODE_ENV=development
export DB_HOST=localhost
export DB_USER=postgres
export DB_NAME=catchup_dev

# Run monitoring
./scripts/monitor-staging.sh
```

This will show you:
- Webhook health (if using ngrok)
- Onboarding success rate
- API usage reduction
- Sync success rate
- Token health
- Circuit breaker status

## Common Issues

### Issue: PostgreSQL not running
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Issue: Database doesn't exist
```bash
psql -U postgres -c "CREATE DATABASE catchup_dev;"
```

### Issue: Migrations fail
```bash
# Check if migrations already ran
psql -U postgres -d catchup_dev -c "\dt"

# If tables exist, migrations already ran
# If not, run migrations manually:
npm run migrate
```

### Issue: Can't connect to database
Check your `.env` file:
```bash
DB_HOST=localhost
DB_USER=postgres
DB_NAME=catchup_dev
DB_PASSWORD=your-password
```

### Issue: Webhooks not working
Either:
1. Use ngrok (see above)
2. Or just test without webhooks (calendar will use polling)

### Issue: Google OAuth not working
Make sure:
1. You have valid credentials in `.env`
2. Redirect URIs match in Google Console
3. For localhost, use: `http://localhost:3000/api/contacts/oauth/callback`

## Differences from Staging/Production

| Feature | Localhost | Staging | Production |
|---------|-----------|---------|------------|
| URL | localhost:3000 | staging.domain.com | domain.com |
| Database | Local PostgreSQL | Remote DB | Remote DB |
| Webhooks | Need ngrok | Work natively | Work natively |
| Users | Just you | Test users | Real users |
| OAuth | Test credentials | Staging credentials | Production credentials |
| Monitoring | Optional | Required (48h) | Required (2 weeks) |
| Backups | Optional | Required | Required |
| Rollback | Just reset DB | Automated script | Automated script |

## Resetting Localhost

If you want to start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE catchup_dev;"
psql -U postgres -c "CREATE DATABASE catchup_dev;"

# Run deployment again
./scripts/deploy-localhost.sh
```

## Next Steps After Localhost Testing

Once you've verified everything works on localhost:

1. **Deploy to Staging**
   ```bash
   export NODE_ENV=staging
   # ... set staging env vars
   ./scripts/deploy-staging.sh
   ```

2. **Monitor Staging for 48 Hours**
   ```bash
   ./scripts/monitor-staging.sh
   ```

3. **Deploy to Production**
   ```bash
   export NODE_ENV=production
   # ... set production env vars
   ./scripts/deploy-production.sh
   ```

## Useful Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test -- --run

# Run specific test
npm test -- --run src/integrations/token-health-monitor.test.ts

# Check database
psql -U postgres -d catchup_dev

# List tables
psql -U postgres -d catchup_dev -c "\dt"

# Check migrations
psql -U postgres -d catchup_dev -c "SELECT * FROM token_health LIMIT 5;"

# Promote admin
npm run promote-admin -- promote your-email@example.com

# List admins
npm run promote-admin -- list

# Monitor metrics
./scripts/monitor-staging.sh
```

## Summary

**Localhost is perfect for**:
- ✅ Development and debugging
- ✅ Testing new features
- ✅ Running tests
- ✅ Verifying migrations
- ✅ Quick iteration

**Staging is needed for**:
- ✅ Final testing before production
- ✅ Testing with production-like setup
- ✅ Webhook testing (without ngrok)
- ✅ Performance testing
- ✅ 48-hour monitoring

**Production is for**:
- ✅ Real users
- ✅ Live data
- ✅ Careful monitoring
- ✅ Rollback readiness

---

**Ready to deploy to localhost?**

```bash
./scripts/deploy-localhost.sh
```
