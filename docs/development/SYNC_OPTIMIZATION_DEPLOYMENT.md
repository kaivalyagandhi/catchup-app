# Google Sync Optimization Deployment Guide

## Overview

This guide provides a comprehensive checklist for deploying the Google Sync Optimization feature to production. Follow these steps in order to ensure a smooth deployment with minimal downtime.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migrations](#database-migrations)
3. [Environment Variables](#environment-variables)
4. [Background Jobs Configuration](#background-jobs-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring Setup](#monitoring-setup)

## Pre-Deployment Checklist

### Code Review
- [ ] All code changes reviewed and approved
- [ ] All tests passing (unit, integration, property-based)
- [ ] No failing PBT tests
- [ ] Code coverage meets requirements (>80%)
- [ ] TypeScript compilation successful
- [ ] Linting passes without errors

### Documentation
- [ ] API documentation updated (`docs/API.md`)
- [ ] Admin guide created (`docs/features/google-integrations/ADMIN_GUIDE.md`)
- [ ] Google integrations documentation updated (`.kiro/steering/google-integrations.md`)
- [ ] Deployment guide created (this document)
- [ ] Monitoring guide created (`docs/features/google-integrations/MONITORING.md`)

### Testing
- [ ] Manual testing completed on staging environment
- [ ] Admin dashboard tested and verified
- [ ] Manual sync tested for Contacts and Calendar
- [ ] Webhook registration tested
- [ ] Token refresh tested
- [ ] Circuit breaker behavior verified
- [ ] Adaptive scheduling verified

### Infrastructure
- [ ] Database backup completed
- [ ] Staging environment matches production
- [ ] Rollback plan documented and tested
- [ ] Monitoring and alerting configured
- [ ] Admin users identified and ready to promote

## Database Migrations

### Migration Order

Run migrations in this exact order:

#### 1. Admin Role Support (038)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/038_add_admin_role_support.sql
```

**What it does:**
- Adds `is_admin`, `admin_promoted_at`, `admin_promoted_by` columns to users table
- Creates index on `is_admin` column

**Verification:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('is_admin', 'admin_promoted_at', 'admin_promoted_by');
```

#### 2. Token Health Table (039)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/039_create_token_health_table.sql
```

**What it does:**
- Creates `token_health` table
- Adds indexes for user_integration, status, and expiring tokens

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'token_health';
SELECT indexname FROM pg_indexes WHERE tablename = 'token_health';
```

#### 3. Circuit Breaker State Table (040)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/040_create_circuit_breaker_state_table.sql
```

**What it does:**
- Creates `circuit_breaker_state` table
- Adds indexes for user_integration, state, and next_retry

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'circuit_breaker_state';
SELECT indexname FROM pg_indexes WHERE tablename = 'circuit_breaker_state';
```

#### 4. Sync Schedule Table (041)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/041_create_sync_schedule_table.sql
```

**What it does:**
- Creates `sync_schedule` table
- Adds indexes for user_integration and next_sync_at

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_schedule';
SELECT indexname FROM pg_indexes WHERE tablename = 'sync_schedule';
```

#### 5. Calendar Webhook Subscriptions Table (042)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/042_create_calendar_webhook_subscriptions_table.sql
```

**What it does:**
- Creates `calendar_webhook_subscriptions` table
- Adds indexes for channel_id, expiration, and user_id

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'calendar_webhook_subscriptions';
SELECT indexname FROM pg_indexes WHERE tablename = 'calendar_webhook_subscriptions';
```

#### 6. Sync Metrics Table (043)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/043_create_sync_metrics_table.sql
```

**What it does:**
- Creates `sync_metrics` table for dashboard
- Adds indexes for user_integration, created_at, and result

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'sync_metrics';
SELECT indexname FROM pg_indexes WHERE tablename = 'sync_metrics';
```

#### 7. Token Health Notifications Table (044)
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/migrations/044_create_token_health_notifications_table.sql
```

**What it does:**
- Creates `token_health_notifications` table
- Adds indexes for user_id, status, and created_at

**Verification:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'token_health_notifications';
SELECT indexname FROM pg_indexes WHERE tablename = 'token_health_notifications';
```

### Migration Verification Script

Run this script to verify all migrations completed successfully:

```bash
#!/bin/bash
# verify-migrations.sh

echo "Verifying Google Sync Optimization migrations..."

# Check tables exist
TABLES=("token_health" "circuit_breaker_state" "sync_schedule" "calendar_webhook_subscriptions" "sync_metrics" "token_health_notifications")

for table in "${TABLES[@]}"; do
  COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
  if [ "$COUNT" -eq 1 ]; then
    echo "✓ Table $table exists"
  else
    echo "✗ Table $table missing"
    exit 1
  fi
done

# Check admin columns exist
COLUMNS=("is_admin" "admin_promoted_at" "admin_promoted_by")

for column in "${COLUMNS[@]}"; do
  COUNT=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = '$column';")
  if [ "$COUNT" -eq 1 ]; then
    echo "✓ Column users.$column exists"
  else
    echo "✗ Column users.$column missing"
    exit 1
  fi
done

echo "All migrations verified successfully!"
```

## Environment Variables

### Required Variables

Add these to your `.env` file or environment configuration:

```bash
# Google OAuth (existing - verify they're set)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CONTACTS_REDIRECT_URI=https://your-domain.com/api/contacts/oauth/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback

# Webhook Configuration (new)
WEBHOOK_BASE_URL=https://your-domain.com
WEBHOOK_VERIFICATION_TOKEN=generate-random-token-here

# Sync Optimization Configuration (new)
SYNC_OPTIMIZATION_ENABLED=true
TOKEN_REFRESH_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true
ADAPTIVE_SCHEDULING_ENABLED=true
CALENDAR_WEBHOOKS_ENABLED=true

# Circuit Breaker Configuration (optional - defaults shown)
CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
CIRCUIT_BREAKER_OPEN_DURATION_MS=3600000  # 1 hour
CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS=1

# Adaptive Scheduling Configuration (optional - defaults shown)
CONTACTS_DEFAULT_FREQUENCY_MS=259200000  # 3 days
CONTACTS_MIN_FREQUENCY_MS=604800000      # 7 days
CONTACTS_MAX_FREQUENCY_MS=86400000       # 1 day
CALENDAR_DEFAULT_FREQUENCY_MS=14400000   # 4 hours
CALENDAR_MIN_FREQUENCY_MS=14400000       # 4 hours
CALENDAR_MAX_FREQUENCY_MS=3600000        # 1 hour
CALENDAR_WEBHOOK_FALLBACK_MS=28800000    # 8 hours

# Token Health Configuration (optional - defaults shown)
TOKEN_EXPIRY_WARNING_HOURS=24
TOKEN_REFRESH_ADVANCE_HOURS=48
TOKEN_REFRESH_CRON_SCHEDULE="0 2 * * *"  # Daily at 2 AM

# Webhook Configuration (optional - defaults shown)
WEBHOOK_RENEWAL_ADVANCE_HOURS=24
WEBHOOK_RENEWAL_CRON_SCHEDULE="0 3 * * *"  # Daily at 3 AM

# Notification Configuration (optional - defaults shown)
NOTIFICATION_REMINDER_DAYS=7
NOTIFICATION_REMINDER_CRON_SCHEDULE="0 9 * * *"  # Daily at 9 AM

# Admin Configuration (optional - defaults shown)
ADMIN_DASHBOARD_REFRESH_INTERVAL_MS=300000  # 5 minutes
```

### Generating Webhook Verification Token

```bash
# Generate a secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variable Verification

```bash
#!/bin/bash
# verify-env.sh

echo "Verifying environment variables..."

REQUIRED_VARS=(
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GOOGLE_CONTACTS_REDIRECT_URI"
  "GOOGLE_CALENDAR_REDIRECT_URI"
  "WEBHOOK_BASE_URL"
  "WEBHOOK_VERIFICATION_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "✗ Missing required variable: $var"
    exit 1
  else
    echo "✓ $var is set"
  fi
done

echo "All required environment variables are set!"
```

## Background Jobs Configuration

### Cron Jobs Setup

Add these cron jobs to your scheduler (e.g., node-cron, crontab, or cloud scheduler):

#### 1. Token Refresh Job
```javascript
// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const monitor = new TokenHealthMonitor();
  const result = await monitor.refreshExpiringTokens();
  console.log(`Token refresh: ${result.refreshed} refreshed, ${result.failed} failed`);
});
```

**Purpose**: Proactively refresh tokens expiring within 48 hours

**Frequency**: Daily at 2 AM (low-traffic time)

**Monitoring**: Alert if failure rate > 10%

#### 2. Webhook Renewal Job
```javascript
// Run daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  const manager = new CalendarWebhookManager();
  const result = await manager.renewExpiringWebhooks();
  console.log(`Webhook renewal: ${result.renewed} renewed, ${result.failed} failed`);
});
```

**Purpose**: Renew webhooks expiring within 24 hours

**Frequency**: Daily at 3 AM

**Monitoring**: Alert if failure rate > 5%

#### 3. Notification Reminder Job
```javascript
// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const service = new TokenHealthNotificationService();
  const result = await service.sendReminders();
  console.log(`Notification reminders: ${result.sent} sent`);
});
```

**Purpose**: Send reminders for unresolved token issues >7 days

**Frequency**: Daily at 9 AM (user-friendly time)

**Monitoring**: Track reminder delivery rate

#### 4. Adaptive Sync Job
```javascript
// Run every 12 hours
cron.schedule('0 */12 * * *', async () => {
  const scheduler = new AdaptiveSyncScheduler();
  
  // Contacts sync
  const contactUsers = await scheduler.getUsersDueForSync('google_contacts');
  for (const userId of contactUsers) {
    await orchestrator.executeSyncJob(userId, 'google_contacts');
  }
  
  // Calendar sync
  const calendarUsers = await scheduler.getUsersDueForSync('google_calendar');
  for (const userId of calendarUsers) {
    await orchestrator.executeSyncJob(userId, 'google_calendar');
  }
});
```

**Purpose**: Execute syncs for users due for sync

**Frequency**: Every 12 hours

**Monitoring**: Track sync duration and success rate

### Job Monitoring

Add monitoring for all background jobs:

```javascript
// Job monitoring wrapper
async function monitoredJob(jobName, jobFn) {
  const startTime = Date.now();
  try {
    const result = await jobFn();
    const duration = Date.now() - startTime;
    
    // Log success
    console.log(`[${jobName}] Success in ${duration}ms`, result);
    
    // Send metrics
    await metrics.recordJobSuccess(jobName, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error
    console.error(`[${jobName}] Failed in ${duration}ms`, error);
    
    // Send metrics and alert
    await metrics.recordJobFailure(jobName, duration, error);
    await alerts.sendJobFailureAlert(jobName, error);
    
    throw error;
  }
}
```

## Deployment Steps

### Step 1: Backup Database

```bash
# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 2: Deploy Code to Staging

```bash
# Deploy to staging
git checkout main
git pull origin main
npm install
npm run build
npm run deploy:staging

# Verify deployment
curl https://staging.your-domain.com/health
```

### Step 3: Run Migrations on Staging

```bash
# Set staging database credentials
export DB_HOST=staging-db-host
export DB_USER=staging-db-user
export DB_NAME=staging-db-name

# Run migrations
./scripts/run-migrations.sh

# Verify migrations
./verify-migrations.sh
```

### Step 4: Test on Staging

```bash
# Run automated tests
npm test

# Manual testing checklist
# - [ ] Admin dashboard loads
# - [ ] Manual sync works
# - [ ] Webhook registration works
# - [ ] Token refresh works
# - [ ] Circuit breaker behavior correct
# - [ ] Metrics display correctly
```

### Step 5: Deploy to Production

```bash
# Deploy to production
git checkout main
npm run deploy:production

# Verify deployment
curl https://your-domain.com/health
```

### Step 6: Run Migrations on Production

```bash
# Set production database credentials
export DB_HOST=production-db-host
export DB_USER=production-db-user
export DB_NAME=production-db-name

# Run migrations
./scripts/run-migrations.sh

# Verify migrations
./verify-migrations.sh
```

### Step 7: Configure Background Jobs

```bash
# Start cron jobs
npm run jobs:start

# Verify jobs are running
npm run jobs:status
```

### Step 8: Promote Admin Users

```bash
# Promote initial admin users
npm run promote-admin -- promote admin@your-domain.com
npm run promote-admin -- promote manager@your-domain.com

# Verify admin users
npm run promote-admin -- list
```

## Post-Deployment Verification

### Verification Checklist

#### Database
- [ ] All tables created successfully
- [ ] All indexes created successfully
- [ ] Admin columns added to users table
- [ ] No migration errors in logs

#### API Endpoints
- [ ] `POST /api/sync/manual` returns 200 OK
- [ ] `POST /api/webhooks/calendar` returns 200 OK (with valid headers)
- [ ] `GET /api/admin/sync-health` returns 200 OK (with admin token)
- [ ] `GET /api/admin/sync-health` returns 403 Forbidden (without admin token)

#### Background Jobs
- [ ] Token refresh job running
- [ ] Webhook renewal job running
- [ ] Notification reminder job running
- [ ] Adaptive sync job running
- [ ] Job logs show successful execution

#### Admin Dashboard
- [ ] Dashboard loads at `/admin/sync-health.html`
- [ ] Metrics display correctly
- [ ] Filters work
- [ ] Auto-refresh works
- [ ] CSV export works

#### Monitoring
- [ ] Metrics being recorded
- [ ] Alerts configured
- [ ] Logs being written
- [ ] Dashboard accessible

### Smoke Tests

Run these smoke tests after deployment:

```bash
# Test manual sync
curl -X POST https://your-domain.com/api/sync/manual \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","integrationType":"contacts"}'

# Test admin dashboard (should return 200)
curl -X GET https://your-domain.com/api/admin/sync-health \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN"

# Test admin dashboard (should return 403)
curl -X GET https://your-domain.com/api/admin/sync-health \
  -H "Authorization: Bearer $NON_ADMIN_JWT_TOKEN"

# Test webhook endpoint (should return 404 - channel not found)
curl -X POST https://your-domain.com/api/webhooks/calendar \
  -H "X-Goog-Channel-ID: test-channel" \
  -H "X-Goog-Resource-ID: test-resource" \
  -H "X-Goog-Resource-State: sync"
```

## Rollback Procedure

### When to Rollback

Rollback if:
- Critical bugs discovered in production
- Database migrations fail
- Background jobs fail repeatedly
- Admin dashboard not accessible
- Sync functionality broken

### Rollback Steps

#### Step 1: Stop Background Jobs

```bash
npm run jobs:stop
```

#### Step 2: Revert Code Deployment

```bash
# Revert to previous version
git checkout <previous-commit-hash>
npm run deploy:production
```

#### Step 3: Rollback Database Migrations

```bash
# Restore from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_YYYYMMDD_HHMMSS.sql

# Or manually drop tables (if backup not available)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
DROP TABLE IF EXISTS token_health_notifications CASCADE;
DROP TABLE IF EXISTS sync_metrics CASCADE;
DROP TABLE IF EXISTS calendar_webhook_subscriptions CASCADE;
DROP TABLE IF EXISTS sync_schedule CASCADE;
DROP TABLE IF EXISTS circuit_breaker_state CASCADE;
DROP TABLE IF EXISTS token_health CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
ALTER TABLE users DROP COLUMN IF EXISTS admin_promoted_at;
ALTER TABLE users DROP COLUMN IF EXISTS admin_promoted_by;
EOF
```

#### Step 4: Verify Rollback

```bash
# Verify old version is running
curl https://your-domain.com/health

# Verify tables are removed
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt token_health"
# Should return: Did not find any relation named "token_health"
```

#### Step 5: Notify Team

- Send notification to team about rollback
- Document rollback reason
- Create incident report
- Plan fix and re-deployment

## Monitoring Setup

### Metrics to Track

#### Sync Health Metrics
- Total users with integrations
- Invalid token count
- Open circuit breaker count
- Sync success rate (24h)
- API calls saved

#### Performance Metrics
- Sync duration (p50, p95, p99)
- API response time
- Database query time
- Background job duration

#### Error Metrics
- Sync failure rate
- Token refresh failure rate
- Webhook renewal failure rate
- Circuit breaker open rate

### Alerts to Configure

#### Critical Alerts
- Sync success rate < 80%
- Invalid tokens > 10% of users
- Open circuit breakers > 5% of users
- Background job failures > 3 consecutive

#### Warning Alerts
- Sync success rate < 90%
- Invalid tokens > 5% of users
- Open circuit breakers > 2% of users
- Token refresh failure rate > 10%

### Logging

Ensure these logs are being written:

```bash
# Application logs
tail -f logs/app.log

# Sync logs
tail -f logs/sync.log

# Admin access logs
tail -f logs/admin-access.log

# Background job logs
tail -f logs/jobs.log
```

## Related Documentation

- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md`
- **API Reference**: `docs/API.md`
- **Google Integrations**: `.kiro/steering/google-integrations.md`
- **Monitoring Guide**: `docs/features/google-integrations/MONITORING.md`

## Support

For deployment issues:
- Check logs in `logs/` directory
- Review error messages in console
- Verify environment variables
- Check database connection
- Contact development team

## Deployment History

| Date | Version | Deployed By | Notes |
|------|---------|-------------|-------|
| YYYY-MM-DD | v1.0.0 | Name | Initial deployment |
