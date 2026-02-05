# Google Sync Optimization Admin Guide

## Overview

This guide is for administrators who need to monitor and manage Google sync health across all users. The Google Sync Optimization feature provides intelligent sync management, token health monitoring, circuit breaker patterns, and comprehensive admin oversight.

## Table of Contents

1. [Admin Role Management](#admin-role-management)
2. [Sync Health Dashboard](#sync-health-dashboard)
3. [Understanding Metrics](#understanding-metrics)
4. [Troubleshooting Common Issues](#troubleshooting-common-issues)
5. [Best Practices](#best-practices)

## Admin Role Management

### Promoting Users to Admin

Only users with the admin role can access the sync health dashboard and admin endpoints. Use the CLI script to promote users:

#### Promote a User

```bash
npm run promote-admin -- promote user@example.com
```

**Output:**
```
✓ User user@example.com promoted to admin
  Promoted at: 2024-01-01T12:00:00Z
  Promoted by: system
```

#### Revoke Admin Access

```bash
npm run promote-admin -- revoke user@example.com
```

**Output:**
```
✓ Admin access revoked for user@example.com
```

#### List All Admins

```bash
npm run promote-admin -- list
```

**Output:**
```
Admins:
  - admin@example.com (promoted 2024-01-01T12:00:00Z by system)
  - manager@example.com (promoted 2024-01-05T10:30:00Z by admin@example.com)
```

### Admin Permissions

Admins have access to:
- Sync health dashboard (`/admin/sync-health`)
- Global sync metrics API (`GET /api/admin/sync-health`)
- User sync status details
- Audit logs for all sync operations

### Security

- All admin access attempts are logged to the audit log
- Admin middleware verifies JWT token and `is_admin` flag
- Non-admin users receive 403 Forbidden when accessing admin endpoints

## Sync Health Dashboard

### Accessing the Dashboard

Navigate to: `http://localhost:3000/admin/sync-health.html` (or your production URL)

The dashboard provides real-time monitoring of sync health across all users.

### Dashboard Sections

#### 1. Overview Metrics

**Total Users**
- Count of users with at least one Google integration (Contacts or Calendar)

**Active Integrations**
- Contacts: Number of users with Google Contacts connected
- Calendar: Number of users with Google Calendar connected

**Invalid Tokens**
- Contacts: Users with expired/revoked Contacts tokens
- Calendar: Users with expired/revoked Calendar tokens

**Open Circuit Breakers**
- Contacts: Users with Contacts circuit breaker in open state
- Calendar: Users with Calendar circuit breaker in open state

**Sync Success Rate (24h)**
- Percentage of successful syncs in the last 24 hours
- Calculated separately for Contacts and Calendar

#### 2. API Calls Saved

Shows estimated API calls saved by optimization features:

**By Circuit Breaker**
- Syncs skipped because circuit breaker was open
- Prevents repeated failed API calls

**By Adaptive Scheduling**
- Syncs skipped due to reduced frequency
- Occurs when no changes detected for 5+ consecutive syncs

**By Webhooks**
- Polling syncs replaced by webhook notifications
- Calendar only (webhooks not available for Contacts)

**Total Saved**
- Sum of all optimization savings
- Represents significant reduction in API usage

#### 2.5. Webhook Health Metrics (Added 2026-02-04)

Shows webhook health and reliability metrics:

**Active Webhooks**
- Number of users with active webhook subscriptions
- Should match number of Calendar integrations

**Webhooks with Silent Failures**
- Webhooks with no notifications received in >48 hours
- Indicates potential webhook issues
- Automatic recovery attempted by health check job

**Webhook Notification Rate (24h)**
- Average notifications received per webhook per day
- Healthy range: 5-50 notifications per day
- Low rate may indicate silent failures

**Failed Notification Percentage**
- Percentage of webhook notifications that failed processing
- Healthy range: <5%
- High rate indicates processing issues

**Last Notification Timestamps**
- Shows most recent notification for each webhook
- Helps identify stale webhooks
- Sorted by oldest first

**Automatic Recovery Attempts**
- Count of webhook re-registrations attempted
- Shows system's self-healing activity
- High count may indicate persistent issues

#### 3. Persistent Failures

Lists users with sync failures lasting more than 7 days:

**Columns:**
- Email: User's email address
- Integration: "contacts" or "calendar"
- Last Success: Date of last successful sync
- Days Since: Days since last successful sync
- Failure Count: Number of consecutive failures
- Last Error: Most recent error message

**Common Errors:**
- "Token expired" - User needs to re-authenticate
- "Token revoked" - User revoked access in Google
- "Rate limit exceeded" - Temporary Google API rate limit
- "Network error" - Connectivity issues

#### 4. Filters

**Integration Type Filter**
- All: Show metrics for both Contacts and Calendar
- Contacts: Show only Contacts metrics
- Calendar: Show only Calendar metrics

#### 5. Auto-Refresh

- Dashboard refreshes automatically daily (was 5 minutes)
- Shows last refresh timestamp
- Manual refresh button available

#### 6. Export

**CSV Export**
- Exports all metrics to CSV file
- Filename includes timestamp: `sync-health-2024-01-01-120000.csv`
- Includes all persistent failures

## Understanding Metrics

### Token Health Status

**Valid**
- Token is active and working
- No action needed

**Expiring Soon**
- Token expires within 24 hours
- System will attempt proactive refresh
- Monitor for refresh success

**Expired**
- Token has expired
- User needs to re-authenticate
- Syncs are skipped

**Revoked**
- User revoked access in Google
- User needs to re-authenticate
- Syncs are skipped

**Unknown**
- Token status cannot be determined
- Usually temporary state during checks

### Circuit Breaker States

**Closed (Normal)**
- Syncs are allowed
- No recent failures
- System operating normally

**Open (Blocked)**
- Syncs are blocked
- 3+ consecutive failures occurred
- System waits 1 hour before retry
- Prevents wasted API calls

**Half-Open (Testing)**
- Testing if issue is resolved
- Allows one sync attempt
- Success → Closed, Failure → Open

### Sync Success Rate

**Calculation:**
```
Success Rate = (Successful Syncs / Total Sync Attempts) × 100
```

**Healthy Ranges:**
- 95-100%: Excellent
- 90-95%: Good
- 80-90%: Fair (investigate)
- <80%: Poor (action required)

**Factors Affecting Success Rate:**
- Token expiration
- Google API rate limits
- Network connectivity
- User disconnections

### API Calls Saved

**Why This Matters:**
- Google APIs have quota limits
- Excessive API calls can incur costs
- Optimization reduces load on Google's servers
- Improves system efficiency

**Typical Savings:**
- Circuit Breaker: 5-10% of calls
- Adaptive Scheduling: 20-30% of calls
- Webhooks (Calendar): 40-60% of calls
- **Total: 70-90% reduction**

## Troubleshooting Common Issues

### High Invalid Token Count

**Symptoms:**
- Many users with expired/revoked tokens
- Low sync success rate
- Persistent failures increasing

**Causes:**
- Tokens expiring naturally (7 days)
- Users revoking access in Google
- Proactive refresh failing

**Solutions:**
1. Check proactive token refresh job is running
2. Verify refresh token is stored for users
3. Send notifications to affected users
4. Monitor token refresh success rate

**Prevention:**
- Ensure token refresh cron job runs daily
- Monitor token expiry dates
- Alert users before tokens expire

### High Circuit Breaker Open Count

**Symptoms:**
- Many users with open circuit breakers
- Syncs being skipped
- API calls saved by circuit breaker increasing

**Causes:**
- Widespread token issues
- Google API outage
- Network connectivity problems
- Rate limiting

**Solutions:**
1. Check Google API status page
2. Verify network connectivity
3. Review error logs for patterns
4. Consider increasing failure threshold if transient issues

**Prevention:**
- Monitor circuit breaker state transitions
- Set up alerts for high open count
- Implement exponential backoff properly

### Low Sync Success Rate

**Symptoms:**
- Success rate below 90%
- Many persistent failures
- User complaints about stale data

**Causes:**
- Token issues (most common)
- Google API rate limits
- Network problems
- Database issues

**Solutions:**
1. Identify failure patterns in persistent failures table
2. Group by error message
3. Address most common errors first
4. Check Google API quota usage

**Investigation Steps:**
```sql
-- Find most common errors
SELECT last_error, COUNT(*) as count
FROM sync_metrics
WHERE result = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY last_error
ORDER BY count DESC;
```

### Persistent Failures Not Resolving

**Symptoms:**
- Users stuck in persistent failures for weeks
- Same users appearing repeatedly
- No improvement over time

**Causes:**
- Users not receiving notifications
- Users ignoring notifications
- Re-authentication flow broken
- Notification delivery issues

**Solutions:**
1. Verify notification service is working
2. Check notification delivery logs
3. Send manual reminder emails
4. Test re-authentication flow
5. Consider in-app notifications

**User Communication:**
```
Subject: Action Required: Reconnect Your Google Account

Your Google [Contacts/Calendar] connection needs to be re-authenticated.

Click here to reconnect: [Re-auth Link]

This will restore automatic syncing of your [contacts/calendar].
```

### Webhook Registration Failures

**Symptoms:**
- Low API calls saved by webhooks
- Calendar polling frequency not reduced
- Webhook registration errors in logs

**Causes:**
- Invalid webhook URL
- Google Calendar API issues
- Network connectivity
- Webhook endpoint not accessible

**Solutions:**
1. Verify webhook URL is publicly accessible
2. Check webhook endpoint is responding
3. Review Google Calendar API logs
4. Test webhook registration manually

**Testing Webhook Registration:**
```bash
# Check webhook endpoint is accessible
curl -X POST https://your-domain.com/api/webhooks/calendar \
  -H "X-Goog-Channel-ID: test-channel" \
  -H "X-Goog-Resource-ID: test-resource" \
  -H "X-Goog-Resource-State: sync"

# Should return 200 OK or 404 (if channel not found)
```

### Webhook Silent Failures (Added 2026-02-04)

**Symptoms:**
- Webhook registered but no notifications received
- Calendar polling not reduced despite active webhook
- No entries in webhook_notifications table for >48 hours
- Users reporting delayed calendar updates

**Causes:**
- Google Calendar not sending notifications
- Webhook expired but not renewed
- Network issues blocking notifications
- Webhook URL became inaccessible
- Google Calendar API issues

**Solutions:**
1. Check webhook health metrics in dashboard
2. Review webhook_notifications table for patterns
3. Verify webhook hasn't expired
4. Check webhook URL is still accessible
5. Manually re-register webhook
6. Review webhook health check job logs

**Investigation Steps:**
```sql
-- Check last webhook notification for user
SELECT user_id, channel_id, MAX(created_at) as last_notification
FROM webhook_notifications
WHERE user_id = 'user-id-here'
GROUP BY user_id, channel_id;

-- Find all silent webhooks (no notifications >48h)
SELECT ws.user_id, ws.channel_id, ws.expiration,
       MAX(wn.created_at) as last_notification
FROM calendar_webhook_subscriptions ws
LEFT JOIN webhook_notifications wn ON ws.channel_id = wn.channel_id
GROUP BY ws.user_id, ws.channel_id, ws.expiration
HAVING MAX(wn.created_at) < NOW() - INTERVAL '48 hours'
   OR MAX(wn.created_at) IS NULL;
```

**Automatic Recovery:**
- Webhook health check job runs every 12 hours
- Detects silent failures (no notifications >48 hours)
- Automatically re-registers broken webhooks
- Falls back to polling if re-registration fails
- Sends admin alerts for persistent issues

**Manual Recovery:**
```bash
# Re-register webhook for specific user
curl -X POST http://localhost:3000/api/webhooks/calendar/register \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

### High Webhook Failure Rate (Added 2026-02-04)

**Symptoms:**
- Many failed webhook notifications in logs
- High percentage of failed notifications in dashboard
- Webhook notifications table shows many errors
- Calendar updates delayed or missing

**Causes:**
- Webhook validation errors
- Database connection issues
- Sync orchestrator errors
- Invalid channel/resource IDs
- Rate limiting

**Solutions:**
1. Review error messages in webhook_notifications table
2. Check webhook validation logic
3. Verify database connectivity
4. Check sync orchestrator health
5. Review rate limiting configuration

**Investigation Steps:**
```sql
-- Find most common webhook errors
SELECT error_message, COUNT(*) as count
FROM webhook_notifications
WHERE result = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY count DESC;

-- Calculate webhook failure rate
SELECT 
  COUNT(*) FILTER (WHERE result = 'success') as success_count,
  COUNT(*) FILTER (WHERE result = 'failure') as failure_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'failure') / COUNT(*), 2) as failure_rate
FROM webhook_notifications
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Thresholds:**
- <5% failure rate: Normal
- 5-10% failure rate: Monitor
- 10-20% failure rate: Investigate
- >20% failure rate: Action required

## Best Practices

### Regular Monitoring

**Daily:**
- Check sync success rate
- Review persistent failures count
- Monitor invalid token count

**Weekly:**
- Review API calls saved trends
- Analyze circuit breaker patterns
- Check webhook renewal success rate

**Monthly:**
- Export metrics for historical analysis
- Review token refresh success rate
- Audit admin access logs

### Alerting Thresholds

Set up alerts for:

**Critical:**
- Sync success rate < 80%
- Invalid tokens > 10% of users
- Open circuit breakers > 5% of users
- Persistent failures > 20 users
- Webhook failure rate > 20%
- Silent webhooks > 10% of active webhooks

**Warning:**
- Sync success rate < 90%
- Invalid tokens > 5% of users
- Open circuit breakers > 2% of users
- Persistent failures > 10 users
- Webhook failure rate > 10%
- Silent webhooks > 5% of active webhooks

**Info:**
- Webhook notification rate < 5 per day (may indicate low calendar activity)
- Webhook re-registration attempts > 5 per day
- Token refresh success rate < 95%

### Proactive Maintenance

**Token Management:**
- Monitor token expiry dates
- Ensure proactive refresh is working
- Send reminders before expiration
- Track refresh success rate

**Circuit Breaker Tuning:**
- Review failure threshold (default: 3)
- Adjust timeout duration (default: 1 hour)
- Monitor false positives
- Consider per-integration thresholds

**Webhook Management:**
- Monitor webhook renewal success
- Check webhook expiration dates
- Verify webhook endpoint health
- Test webhook notifications

### User Communication

**When to Notify Users:**
- Token expired (immediate)
- Token expiring soon (24 hours before)
- Sync failed 3+ times (circuit breaker opens)
- Persistent failure >7 days (weekly reminder)

**Notification Templates:**

**Token Expired:**
```
Your Google [Integration] connection has expired.
Reconnect now to resume syncing: [Link]
```

**Token Expiring Soon:**
```
Your Google [Integration] connection expires in 24 hours.
We'll try to refresh it automatically, but you may need to reconnect.
```

**Circuit Breaker Opened:**
```
We've temporarily paused syncing your Google [Integration] due to repeated errors.
Please reconnect to resume: [Link]
```

**Persistent Failure:**
```
Your Google [Integration] hasn't synced successfully in [X] days.
Reconnect now to get the latest updates: [Link]
```

### Performance Optimization

**Database Queries:**
- Index on `user_id`, `integration_type`
- Index on `status` for token_health
- Index on `state` for circuit_breaker_state
- Index on `created_at` for sync_metrics

**Caching:**
- Cache dashboard metrics (daily)
- Cache user sync status (1 minute)
- Invalidate on sync completion

**Background Jobs:**
- Run token refresh daily at off-peak hours
- Run webhook renewal daily
- Run notification reminders daily
- Stagger job execution to avoid spikes

### Security

**Admin Access:**
- Limit admin role to trusted users
- Audit admin access regularly
- Rotate admin credentials
- Use strong passwords

**Token Storage:**
- Tokens encrypted at rest (AES-256)
- Tokens never exposed to client
- Tokens stored in secure database
- Tokens deleted on disconnection

**Audit Logging:**
- Log all admin access
- Log all token operations
- Log all circuit breaker transitions
- Log all webhook events

## Related Documentation

- **API Reference**: `docs/API.md` - Admin endpoints
- **Google Integrations**: `.kiro/steering/google-integrations.md` - Architecture
- **Onboarding Sync Guide**: `docs/features/google-integrations/ONBOARDING_SYNC.md` - Onboarding behavior
- **Deployment Guide**: `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md` - Setup
- **Monitoring Guide**: `docs/features/google-integrations/MONITORING.md` - Alerts
- **Testing Guide**: `docs/testing/ONBOARDING_SYNC_TESTING_GUIDE.md` - Testing procedures

## Support

For issues or questions:
- Check logs: `logs/sync-health.log`
- Review audit logs: `logs/admin-access.log`
- Contact development team
- File bug report with metrics export
