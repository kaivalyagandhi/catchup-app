# User Experience Monitoring Guide

## Overview

This guide provides instructions for monitoring user experience metrics to ensure the sync optimization doesn't negatively impact users while reducing API usage.

## Test Objectives

1. Track onboarding sync success rate (target >95%)
2. Track webhook reliability (target >95%)
3. Monitor user complaints about stale data
4. Track manual sync usage patterns
5. Measure user satisfaction with sync performance

## Key Metrics

### 1. Onboarding Sync Success Rate
**Target**: >95% success rate for first sync

**Why It Matters**: First impressions are critical. Users expect to see their data immediately after connecting.

### 2. Webhook Reliability
**Target**: >95% notification delivery rate

**Why It Matters**: Webhooks are the primary mechanism for real-time calendar updates. Failures mean stale data.

### 3. Data Staleness Complaints
**Target**: <5% of users report stale data

**Why It Matters**: Longer sync frequencies mean data can be stale. We need to ensure this doesn't impact user experience.

### 4. Manual Sync Usage
**Target**: <5% of total syncs are manual

**Why It Matters**: High manual sync usage indicates users don't trust automatic syncs or data is too stale.

## Monitoring Setup

### 1. Database Views for Metrics

```sql
-- Create view for onboarding success rate
CREATE OR REPLACE VIEW onboarding_sync_metrics AS
SELECT 
  DATE(created_at) AS date,
  integration_type,
  COUNT(*) AS total_onboarding_syncs,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_syncs,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed_syncs,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / COUNT(*)) * 100, 2) AS success_rate_percentage
FROM sync_metrics
WHERE sync_type = 'initial'
GROUP BY DATE(created_at), integration_type
ORDER BY date DESC;

-- Create view for webhook reliability
CREATE OR REPLACE VIEW webhook_reliability_metrics AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_notifications,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed_notifications,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / COUNT(*)) * 100, 2) AS reliability_percentage
FROM webhook_notifications
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create view for manual sync usage
CREATE OR REPLACE VIEW manual_sync_usage AS
SELECT 
  DATE(created_at) AS date,
  integration_type,
  COUNT(*) FILTER (WHERE sync_type = 'manual') AS manual_syncs,
  COUNT(*) AS total_syncs,
  ROUND((COUNT(*) FILTER (WHERE sync_type = 'manual')::numeric / COUNT(*)) * 100, 2) AS manual_sync_percentage
FROM sync_metrics
WHERE result = 'success'
GROUP BY DATE(created_at), integration_type
ORDER BY date DESC;
```

### 2. Monitoring Scripts

Create a daily monitoring script:

```bash
#!/bin/bash
# scripts/monitor-user-experience.sh

echo "User Experience Monitoring Report"
echo "=================================="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  exit 1
fi

echo "1. Onboarding Sync Success Rate (Last 7 Days)"
echo "----------------------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  date,
  integration_type,
  total_onboarding_syncs,
  successful_syncs,
  failed_syncs,
  success_rate_percentage
FROM onboarding_sync_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, integration_type;
"

echo ""
echo "2. Webhook Reliability (Last 7 Days)"
echo "-------------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  date,
  total_notifications,
  successful_notifications,
  failed_notifications,
  reliability_percentage
FROM webhook_reliability_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
"

echo ""
echo "3. Manual Sync Usage (Last 7 Days)"
echo "-----------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  date,
  integration_type,
  manual_syncs,
  total_syncs,
  manual_sync_percentage
FROM manual_sync_usage
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, integration_type;
"

echo ""
echo "4. Data Staleness Indicators"
echo "-----------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  COUNT(*) AS users_with_stale_data,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 3600), 2) AS avg_hours_since_sync,
  MAX(EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 3600) AS max_hours_since_sync
FROM sync_schedule
WHERE last_sync_at IS NOT NULL
AND last_sync_at < NOW() - INTERVAL '24 hours'
GROUP BY integration_type;
"

echo ""
echo "5. Circuit Breaker Status"
echo "-------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  state,
  COUNT(*) AS user_count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage
FROM circuit_breaker_state
GROUP BY integration_type, state
ORDER BY integration_type, user_count DESC;
"

echo ""
echo "6. Token Health Status"
echo "----------------------"
psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  status,
  COUNT(*) AS user_count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage
FROM token_health
GROUP BY integration_type, status
ORDER BY integration_type, user_count DESC;
"

echo ""
echo "Report complete."
echo ""

# Check for alerts
echo "Alerts:"
echo "-------"

# Alert if onboarding success rate < 95%
ONBOARDING_SUCCESS=$(psql "$DATABASE_URL" -t -c "
SELECT COALESCE(AVG(success_rate_percentage), 100)
FROM onboarding_sync_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
")

if (( $(echo "$ONBOARDING_SUCCESS < 95" | bc -l) )); then
  echo "⚠️  ALERT: Onboarding success rate is below 95% ($ONBOARDING_SUCCESS%)"
fi

# Alert if webhook reliability < 95%
WEBHOOK_RELIABILITY=$(psql "$DATABASE_URL" -t -c "
SELECT COALESCE(AVG(reliability_percentage), 100)
FROM webhook_reliability_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
")

if (( $(echo "$WEBHOOK_RELIABILITY < 95" | bc -l) )); then
  echo "⚠️  ALERT: Webhook reliability is below 95% ($WEBHOOK_RELIABILITY%)"
fi

# Alert if manual sync usage > 5%
MANUAL_SYNC_USAGE=$(psql "$DATABASE_URL" -t -c "
SELECT COALESCE(AVG(manual_sync_percentage), 0)
FROM manual_sync_usage
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
")

if (( $(echo "$MANUAL_SYNC_USAGE > 5" | bc -l) )); then
  echo "⚠️  ALERT: Manual sync usage is above 5% ($MANUAL_SYNC_USAGE%)"
fi

echo ""
echo "Monitoring complete."
```

## Test 33.4: Monitor User Experience

### Part 1: Track Onboarding Sync Success Rate

#### Step 1: Set Up Monitoring
```bash
# Make script executable
chmod +x scripts/monitor-user-experience.sh

# Run initial baseline
./scripts/monitor-user-experience.sh > ux-baseline.txt
```

#### Step 2: Daily Monitoring
```bash
# Run daily (or set up cron job)
./scripts/monitor-user-experience.sh

# Or set up cron job
crontab -e
# Add: 0 9 * * * /path/to/scripts/monitor-user-experience.sh >> /path/to/logs/ux-monitoring.log
```

#### Step 3: Analyze Onboarding Success Rate
```sql
-- Detailed onboarding analysis
SELECT 
  integration_type,
  result,
  COUNT(*) AS count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage,
  ARRAY_AGG(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) AS error_messages
FROM sync_metrics
WHERE sync_type = 'initial'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY integration_type, result
ORDER BY integration_type, count DESC;
```

**Target**: >95% success rate

**Action Items if Below Target**:
1. Identify common error messages
2. Check token refresh logic
3. Verify OAuth flow
4. Review retry logic
5. Improve error handling

### Part 2: Track Webhook Reliability

#### Step 1: Monitor Webhook Notifications
```sql
-- Webhook notification analysis
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE result = 'success') AS successful,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / COUNT(*)) * 100, 2) AS success_rate
FROM webhook_notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Step 2: Identify Webhook Issues
```sql
-- Common webhook failure reasons
SELECT 
  error_message,
  COUNT(*) AS failure_count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM webhook_notifications WHERE result = 'failure')) * 100, 2) AS percentage
FROM webhook_notifications
WHERE result = 'failure'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY error_message
ORDER BY failure_count DESC;
```

#### Step 3: Check Silent Failures
```sql
-- Users with no recent webhook notifications
SELECT 
  u.id,
  u.email,
  ws.channel_id,
  ws.created_at AS webhook_created_at,
  MAX(wn.created_at) AS last_notification_at,
  EXTRACT(EPOCH FROM (NOW() - MAX(wn.created_at))) / 3600 AS hours_since_last_notification
FROM users u
JOIN calendar_webhook_subscriptions ws ON ws.user_id = u.id
LEFT JOIN webhook_notifications wn ON wn.user_id = u.id
GROUP BY u.id, u.email, ws.channel_id, ws.created_at
HAVING MAX(wn.created_at) < NOW() - INTERVAL '48 hours'
OR MAX(wn.created_at) IS NULL;
```

**Target**: >95% reliability

**Action Items if Below Target**:
1. Check webhook endpoint accessibility
2. Verify webhook registration process
3. Review webhook validation logic
4. Check Google Calendar API status
5. Implement automatic re-registration

### Part 3: Monitor Data Staleness Complaints

#### Step 1: Track User Feedback
Create a feedback mechanism:

```sql
-- Create user feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  feedback_type VARCHAR(50),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track stale data complaints
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS complaint_count
FROM user_feedback
WHERE feedback_type = 'stale_data'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Step 2: Analyze Data Freshness
```sql
-- Data freshness by integration
SELECT 
  integration_type,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE last_sync_at > NOW() - INTERVAL '1 hour') AS synced_last_hour,
  COUNT(*) FILTER (WHERE last_sync_at > NOW() - INTERVAL '24 hours') AS synced_last_day,
  COUNT(*) FILTER (WHERE last_sync_at > NOW() - INTERVAL '7 days') AS synced_last_week,
  COUNT(*) FILTER (WHERE last_sync_at <= NOW() - INTERVAL '7 days' OR last_sync_at IS NULL) AS stale_data,
  ROUND((COUNT(*) FILTER (WHERE last_sync_at <= NOW() - INTERVAL '7 days' OR last_sync_at IS NULL)::numeric / COUNT(*)) * 100, 2) AS stale_percentage
FROM sync_schedule
GROUP BY integration_type;
```

**Target**: <5% of users report stale data

**Action Items if Above Target**:
1. Review adaptive scheduling thresholds
2. Check if webhooks are working
3. Verify sync frequencies are appropriate
4. Consider reducing minimum frequencies
5. Improve manual sync discoverability

### Part 4: Track Manual Sync Usage

#### Step 1: Analyze Manual Sync Patterns
```sql
-- Manual sync usage by user
SELECT 
  u.email,
  COUNT(*) FILTER (WHERE sm.sync_type = 'manual') AS manual_syncs,
  COUNT(*) AS total_syncs,
  ROUND((COUNT(*) FILTER (WHERE sm.sync_type = 'manual')::numeric / COUNT(*)) * 100, 2) AS manual_percentage
FROM users u
JOIN sync_metrics sm ON sm.user_id = u.id
WHERE sm.created_at >= NOW() - INTERVAL '30 days'
AND sm.result = 'success'
GROUP BY u.id, u.email
HAVING COUNT(*) FILTER (WHERE sm.sync_type = 'manual') > 5
ORDER BY manual_syncs DESC;
```

#### Step 2: Identify High Manual Sync Users
```sql
-- Users with high manual sync usage
SELECT 
  u.email,
  sm.integration_type,
  COUNT(*) AS manual_sync_count,
  MAX(sm.created_at) AS last_manual_sync
FROM users u
JOIN sync_metrics sm ON sm.user_id = u.id
WHERE sm.sync_type = 'manual'
AND sm.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, sm.integration_type
HAVING COUNT(*) > 3
ORDER BY manual_sync_count DESC;
```

**Target**: <5% of total syncs are manual

**Action Items if Above Target**:
1. Interview high manual sync users
2. Check if automatic syncs are failing
3. Verify sync frequencies are appropriate
4. Improve sync status visibility
5. Add "last synced" timestamp to UI

### Part 5: User Satisfaction Survey

#### Step 1: Create Survey
Add a simple satisfaction survey to the app:

```typescript
// Survey questions
const syncSatisfactionSurvey = {
  questions: [
    {
      id: 'data_freshness',
      text: 'How satisfied are you with the freshness of your contact and calendar data?',
      type: 'rating',
      scale: 1-5
    },
    {
      id: 'sync_reliability',
      text: 'How reliable do you find the automatic sync?',
      type: 'rating',
      scale: 1-5
    },
    {
      id: 'sync_speed',
      text: 'How satisfied are you with the sync speed?',
      type: 'rating',
      scale: 1-5
    },
    {
      id: 'stale_data_frequency',
      text: 'How often do you notice stale data?',
      type: 'multiple_choice',
      options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']
    },
    {
      id: 'manual_sync_reason',
      text: 'If you use manual sync, why?',
      type: 'multiple_choice',
      options: [
        'Automatic sync is too slow',
        'I don\'t trust automatic sync',
        'I need immediate updates',
        'Automatic sync fails',
        'I don\'t use manual sync'
      ]
    }
  ]
};
```

#### Step 2: Analyze Survey Results
```sql
-- Survey response analysis
SELECT 
  question_id,
  AVG(rating) AS avg_rating,
  COUNT(*) AS response_count
FROM survey_responses
WHERE survey_id = 'sync_satisfaction'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY question_id;
```

**Target**: Average rating >4.0/5.0

## Verification Checklist

### Onboarding Success
- [ ] >95% success rate for first sync
- [ ] Average sync time <30 seconds
- [ ] Error messages are clear and actionable
- [ ] Retry functionality works

### Webhook Reliability
- [ ] >95% notification delivery rate
- [ ] Silent failures detected and recovered
- [ ] Webhook health check runs every 12 hours
- [ ] Automatic re-registration works

### Data Freshness
- [ ] <5% of users report stale data
- [ ] Average data age is acceptable
- [ ] Manual sync is easily accessible
- [ ] Sync status is visible in UI

### Manual Sync Usage
- [ ] <5% of total syncs are manual
- [ ] Manual sync usage is consistent
- [ ] No spike in manual sync usage
- [ ] Users understand automatic sync

### User Satisfaction
- [ ] Average satisfaction rating >4.0/5.0
- [ ] Positive feedback on sync reliability
- [ ] Few complaints about stale data
- [ ] Users trust automatic sync

## Troubleshooting

### High Onboarding Failure Rate
**Check**:
1. Common error messages
2. Token refresh logic
3. OAuth flow
4. Network connectivity

**Debug**:
```sql
-- Identify failure patterns
SELECT 
  error_message,
  COUNT(*) AS failure_count
FROM sync_metrics
WHERE sync_type = 'initial'
AND result = 'failure'
GROUP BY error_message
ORDER BY failure_count DESC;
```

### Low Webhook Reliability
**Check**:
1. Webhook endpoint accessibility
2. Google Calendar API status
3. Webhook validation logic
4. Silent failure detection

**Debug**:
```bash
# Test webhook endpoint
curl -X POST https://your-app.com/api/webhooks/calendar \
  -H "X-Goog-Channel-ID: test" \
  -H "X-Goog-Resource-ID: test" \
  -H "X-Goog-Resource-State: exists"
```

### High Manual Sync Usage
**Check**:
1. Are automatic syncs failing?
2. Are sync frequencies too long?
3. Is sync status visible?
4. Do users understand automatic sync?

**Debug**:
```sql
-- Check automatic sync success rate
SELECT 
  integration_type,
  result,
  COUNT(*) AS count
FROM sync_metrics
WHERE sync_type != 'manual'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY integration_type, result;
```

## Success Criteria

✅ **Pass**: Onboarding success rate >95%
✅ **Pass**: Webhook reliability >95%
✅ **Pass**: <5% users report stale data
✅ **Pass**: <5% of syncs are manual
✅ **Pass**: User satisfaction >4.0/5.0

❌ **Fail**: Any metric below target
❌ **Fail**: Increase in user complaints
❌ **Fail**: Spike in manual sync usage
❌ **Fail**: Decrease in user satisfaction

## Reporting

### Weekly UX Report Template

```markdown
# User Experience Report - Week of [Date]

## Summary
- Onboarding Success Rate: X%
- Webhook Reliability: X%
- Manual Sync Usage: X%
- User Satisfaction: X/5.0

## Highlights
- [Positive findings]

## Issues
- [Any concerns or problems]

## Action Items
- [Steps to address issues]

## Trends
- [Week-over-week changes]
```

## Next Steps

After completing this test:
1. Generate weekly UX reports
2. Address any issues found
3. Continue monitoring trends
4. Iterate on optimization parameters
5. Celebrate success! 🎉
