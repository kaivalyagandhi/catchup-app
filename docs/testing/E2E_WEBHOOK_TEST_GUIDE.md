# End-to-End Calendar Webhook Test Guide

## Overview

This guide provides step-by-step instructions for testing the complete calendar webhook flow including registration, notification handling, health monitoring, and fallback behavior.

## Test Objectives

1. Verify webhook registration on calendar connection
2. Verify webhook registration retry logic
3. Verify 12-hour fallback polling when webhook is active
4. Verify webhook notifications trigger immediate sync
5. Verify webhook health check runs every 12 hours
6. Verify automatic re-registration on failures

## Prerequisites

- Development server running (`npm run dev`)
- PostgreSQL database running
- Google OAuth credentials configured
- Test Google account with calendar
- Publicly accessible webhook endpoint (use ngrok for local testing)

## Setup: Webhook Endpoint Accessibility

### Option 1: Using ngrok (Recommended for Local Testing)
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 3000

# Note the public URL (e.g., https://abc123.ngrok.io)
# Update WEBHOOK_BASE_URL in .env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### Option 2: Deploy to Cloud (Production Testing)
```bash
# Deploy to Google Cloud Run or similar
# Ensure WEBHOOK_BASE_URL points to public URL
WEBHOOK_BASE_URL=https://your-app.run.app
```

## Test 33.2: End-to-End Calendar Webhook Test

### Part 1: Webhook Registration on Connection

#### Step 1: Connect Google Calendar
1. Navigate to onboarding page
2. Click "Connect Google Calendar"
3. Grant calendar.readonly permission
4. Complete OAuth flow

#### Step 2: Verify Webhook Registration
```sql
-- Check webhook subscription was created
SELECT 
  user_id,
  channel_id,
  resource_id,
  expiration,
  created_at
FROM calendar_webhook_subscriptions
WHERE user_id = '<test-user-id>';

-- Expected: One row with valid channel_id and expiration ~7 days in future
```

**Verification Checklist**:
- [ ] Webhook subscription exists in database
- [ ] `channel_id` is a valid UUID
- [ ] `resource_id` matches Google's format
- [ ] `expiration` is ~7 days in future
- [ ] `token` is set for verification

#### Step 3: Check Server Logs
```bash
# Look for webhook registration logs
tail -f logs/app.log | grep "webhook"

# Expected logs:
# "Registering webhook for user <user-id>"
# "Webhook registered successfully: channel_id=<id>"
```

### Part 2: Webhook Registration Retry Logic

#### Step 1: Simulate Registration Failure
```typescript
// Temporarily modify CalendarWebhookManager to force failure
// In src/integrations/calendar-webhook-manager.ts
async registerWebhook(userId: string): Promise<WebhookSubscription> {
  // Add this line to simulate failure
  throw new Error('Simulated registration failure');
  // ... rest of method
}
```

#### Step 2: Connect Calendar
1. Connect Google Calendar with modified code
2. **VERIFY**: Registration fails
3. **VERIFY**: System retries (check logs)
4. **VERIFY**: After max retries, falls back to polling

#### Step 3: Check Fallback Behavior
```sql
-- Check sync schedule uses polling frequency
SELECT 
  current_frequency_ms,
  next_sync_at
FROM sync_schedule
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_calendar';

-- Expected: current_frequency_ms = 14400000 (4 hours, not 12 hours)
-- This indicates webhook registration failed and system fell back
```

#### Step 4: Restore Normal Behavior
```typescript
// Remove the simulated failure
// Reconnect calendar
// Verify webhook registers successfully
```

### Part 3: Verify 12-Hour Fallback Polling

#### Step 1: Successful Webhook Registration
```sql
-- Verify webhook is active
SELECT * FROM calendar_webhook_subscriptions
WHERE user_id = '<test-user-id>';

-- Check sync schedule
SELECT 
  current_frequency_ms,
  next_sync_at
FROM sync_schedule
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_calendar';

-- Expected: current_frequency_ms = 43200000 (12 hours)
```

**Verification**:
- [ ] Webhook subscription exists
- [ ] Sync frequency is 12 hours (43,200,000 ms)
- [ ] This is longer than normal 4-hour polling
- [ ] Indicates webhook is primary, polling is fallback

### Part 4: Webhook Notification Triggers Sync

#### Step 1: Make Calendar Change in Google
1. Open Google Calendar in browser
2. Create a new event (e.g., "Test Event")
3. Save the event

#### Step 2: Monitor Webhook Notification
```bash
# Watch server logs for webhook notification
tail -f logs/app.log | grep "webhook notification"

# Expected within 1-5 seconds:
# "Received webhook notification: channel_id=<id>, resource_state=exists"
# "Triggering immediate sync for user <user-id>"
```

#### Step 3: Verify Immediate Sync
```sql
-- Check sync was triggered
SELECT 
  sync_type,
  result,
  items_processed,
  created_at
FROM sync_metrics
WHERE user_id = '<test-user-id>'
AND integration_type = 'google_calendar'
ORDER BY created_at DESC LIMIT 1;

-- Expected:
-- sync_type: 'webhook_triggered'
-- result: 'success'
-- created_at: within last few seconds
```

#### Step 4: Verify Event Appears in App
1. Navigate to calendar view in app
2. **VERIFY**: New event appears
3. **VERIFY**: Event details are correct
4. **VERIFY**: No manual refresh needed

**Timing Verification**:
- [ ] Webhook notification received within 1-5 seconds
- [ ] Sync triggered immediately
- [ ] Event appears in app within 10-15 seconds total

### Part 5: Webhook Health Check Runs Every 12 Hours

#### Step 1: Check Job Schedule
```sql
-- Verify webhook health check job is scheduled
SELECT * FROM job_schedules
WHERE job_name = 'webhook-health-check';

-- Expected: interval = '12 hours'
```

#### Step 2: Monitor Job Execution
```bash
# Watch for health check execution
tail -f logs/app.log | grep "webhook health check"

# Expected every 12 hours:
# "Starting webhook health check"
# "Checked X webhooks, found Y issues"
# "Webhook health check completed"
```

#### Step 3: Verify Health Metrics
```sql
-- Check webhook health metrics
SELECT 
  user_id,
  total_notifications_24h,
  failed_notifications_24h,
  last_notification_at,
  is_healthy
FROM webhook_health_metrics
WHERE user_id = '<test-user-id>';

-- Expected:
-- total_notifications_24h: > 0 (if calendar changes made)
-- failed_notifications_24h: 0
-- last_notification_at: recent timestamp
-- is_healthy: true
```

#### Step 4: Test Silent Failure Detection

**Simulate Silent Failure**:
```sql
-- Set last_notification_at to >48 hours ago
UPDATE calendar_webhook_subscriptions
SET created_at = NOW() - INTERVAL '3 days'
WHERE user_id = '<test-user-id>';

-- Manually trigger health check
-- (or wait for next scheduled run)
```

**Expected Behavior**:
1. Health check detects silent failure
2. Attempts to re-register webhook
3. Logs warning if re-registration fails
4. Falls back to polling if needed

**Verification**:
```bash
# Check logs for silent failure detection
tail -f logs/app.log | grep "silent failure"

# Expected:
# "Detected silent failure for webhook: channel_id=<id>"
# "Attempting to re-register webhook"
# "Webhook re-registered successfully" OR "Falling back to polling"
```

### Part 6: Automatic Re-Registration on Failures

#### Step 1: Simulate Webhook Expiration
```sql
-- Set expiration to past
UPDATE calendar_webhook_subscriptions
SET expiration = NOW() - INTERVAL '1 hour'
WHERE user_id = '<test-user-id>';
```

#### Step 2: Trigger Renewal Job
```bash
# Manually trigger webhook renewal job
# (or wait for daily scheduled run)
npm run job:webhook-renewal
```

#### Step 3: Verify Re-Registration
```sql
-- Check webhook was renewed
SELECT 
  channel_id,
  expiration,
  updated_at
FROM calendar_webhook_subscriptions
WHERE user_id = '<test-user-id>';

-- Expected:
-- expiration: ~7 days in future
-- updated_at: recent timestamp
```

**Verification**:
- [ ] Webhook expiration was detected
- [ ] Re-registration was attempted
- [ ] New expiration is ~7 days in future
- [ ] No interruption in webhook notifications

### Part 7: Webhook Validation

#### Step 1: Send Invalid Webhook Notification
```bash
# Use curl to send invalid notification
curl -X POST http://localhost:3000/api/webhooks/calendar \
  -H "Content-Type: application/json" \
  -H "X-Goog-Channel-ID: invalid-channel-id" \
  -H "X-Goog-Resource-ID: invalid-resource-id" \
  -H "X-Goog-Resource-State: exists"
```

#### Step 2: Verify Rejection
```bash
# Check logs for rejection
tail -f logs/app.log | grep "webhook validation"

# Expected:
# "Invalid webhook notification: channel_id not found"
# "Webhook notification rejected"
```

**Verification**:
- [ ] Invalid notification is rejected
- [ ] No sync is triggered
- [ ] Error is logged
- [ ] Response is 400 Bad Request

## Test Results Checklist

### Webhook Registration
- [ ] Webhook registers on calendar connection
- [ ] Registration retry logic works
- [ ] Fallback to polling on registration failure
- [ ] Webhook subscription stored in database

### Webhook Notifications
- [ ] Notifications received within 1-5 seconds
- [ ] Immediate sync triggered
- [ ] Events appear in app within 10-15 seconds
- [ ] No manual refresh needed

### Webhook Health Monitoring
- [ ] Health check runs every 12 hours
- [ ] Silent failures detected (>48h no notifications)
- [ ] Automatic re-registration attempted
- [ ] Fallback to polling if re-registration fails
- [ ] Health metrics tracked in database

### Webhook Validation
- [ ] Invalid notifications rejected
- [ ] Valid notifications processed
- [ ] Channel ID and resource ID validated
- [ ] Errors logged appropriately

### Fallback Behavior
- [ ] 12-hour polling when webhook active
- [ ] 4-hour polling when webhook fails
- [ ] Smooth transition between modes
- [ ] No data loss during transitions

## Troubleshooting

### Webhook Not Registering
**Check**:
1. Is `WEBHOOK_BASE_URL` set correctly?
2. Is the URL publicly accessible?
3. Are Google Calendar API credentials valid?

**Debug**:
```bash
# Test webhook URL accessibility
curl https://your-webhook-url.com/api/webhooks/calendar

# Check Google Calendar API quota
# Visit: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas
```

### Notifications Not Received
**Check**:
1. Is webhook still registered in Google?
2. Has webhook expired?
3. Is the endpoint responding?

**Debug**:
```sql
-- Check webhook status
SELECT * FROM calendar_webhook_subscriptions
WHERE user_id = '<test-user-id>';

-- Check if expired
SELECT 
  channel_id,
  expiration,
  expiration < NOW() AS is_expired
FROM calendar_webhook_subscriptions;
```

### Health Check Not Running
**Check**:
1. Is job scheduler running?
2. Is job scheduled correctly?
3. Are there errors in job execution?

**Debug**:
```bash
# Check job scheduler status
npm run job:status

# Manually trigger health check
npm run job:webhook-health-check
```

## Success Criteria

✅ **Pass**: All checklist items verified
✅ **Pass**: Webhook notifications received consistently
✅ **Pass**: Health monitoring detects and recovers from failures
✅ **Pass**: Fallback behavior works correctly

❌ **Fail**: Any checklist item fails
❌ **Fail**: Webhook notifications not received
❌ **Fail**: Health monitoring doesn't detect failures
❌ **Fail**: Fallback behavior doesn't work

## Next Steps

After completing this test:
1. Document any issues found
2. Proceed to Test 33.3 (API Usage Monitoring)
3. Track webhook reliability metrics
4. Monitor user experience with real-time updates
