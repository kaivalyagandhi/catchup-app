# API Usage Monitoring Guide

## Overview

This guide provides instructions for monitoring and verifying the API usage reduction achieved by the Google Sync Optimization feature.

## Test Objectives

1. Track API calls before and after deployment
2. Verify 70-85% reduction in total API calls
3. Verify ~57% reduction for Contacts API
4. Verify ~83% reduction for Calendar API
5. Identify optimization sources (circuit breaker, adaptive scheduling, webhooks)

## Baseline Metrics (Before Optimization)

### Expected Baseline (Per User, Per Month)

**Google Contacts API**:
- Sync frequency: 3 days
- Syncs per month: ~10
- API calls per sync: ~5 (pagination, metadata)
- **Total: ~50 calls/month**

**Google Calendar API**:
- Sync frequency: 4 hours
- Syncs per month: ~180
- API calls per sync: ~3 (events, metadata)
- **Total: ~540 calls/month**

**Combined Total: ~590 calls/month per user**

## Target Metrics (After Optimization)

### Expected Reduction

**Google Contacts API**:
- New frequency: 7 days (adaptive can extend to 30 days)
- Circuit breaker prevents failed attempts
- Expected syncs per month: ~4-5
- **Target: ~25 calls/month (57% reduction)**

**Google Calendar API**:
- Webhooks replace most polling
- Fallback polling: 12 hours
- Expected syncs per month: ~60 (mostly webhook-triggered)
- **Target: ~90 calls/month (83% reduction)**

**Combined Total: ~115 calls/month per user (80% reduction)**

## Monitoring Setup

### 1. Enable API Usage Tracking

#### Google Cloud Console
1. Navigate to: https://console.cloud.google.com/apis/dashboard
2. Select your project
3. Click "Google Calendar API" and "People API"
4. View "Metrics" tab
5. Enable detailed logging

#### Application Metrics
```sql
-- Create view for API usage tracking
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
  DATE(created_at) AS date,
  integration_type,
  COUNT(*) AS total_syncs,
  SUM(api_calls_made) AS total_api_calls,
  SUM(api_calls_saved) AS total_api_calls_saved,
  AVG(duration_ms) AS avg_duration_ms,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_syncs,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed_syncs,
  COUNT(*) FILTER (WHERE result = 'skipped') AS skipped_syncs
FROM sync_metrics
GROUP BY DATE(created_at), integration_type
ORDER BY date DESC, integration_type;
```

### 2. Baseline Measurement Script

Create a script to capture baseline metrics:

```bash
#!/bin/bash
# scripts/measure-api-baseline.sh

echo "Measuring API Usage Baseline"
echo "============================="
echo ""

# Get date range (last 30 days)
START_DATE=$(date -d '30 days ago' +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "Date Range: $START_DATE to $END_DATE"
echo ""

# Query database for metrics
psql $DATABASE_URL -c "
SELECT 
  integration_type,
  COUNT(*) AS total_syncs,
  SUM(api_calls_made) AS total_api_calls,
  ROUND(AVG(api_calls_made), 2) AS avg_calls_per_sync,
  COUNT(DISTINCT user_id) AS unique_users,
  ROUND(SUM(api_calls_made)::numeric / COUNT(DISTINCT user_id), 2) AS calls_per_user
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
AND result = 'success'
GROUP BY integration_type;
"

echo ""
echo "Baseline measurement complete. Save these numbers for comparison."
```

### 3. Post-Optimization Measurement Script

```bash
#!/bin/bash
# scripts/measure-api-optimized.sh

echo "Measuring Optimized API Usage"
echo "=============================="
echo ""

# Get date range (last 30 days)
START_DATE=$(date -d '30 days ago' +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "Date Range: $START_DATE to $END_DATE"
echo ""

# Query database for metrics
psql $DATABASE_URL -c "
SELECT 
  integration_type,
  COUNT(*) AS total_syncs,
  SUM(api_calls_made) AS total_api_calls,
  SUM(api_calls_saved) AS total_api_calls_saved,
  ROUND(AVG(api_calls_made), 2) AS avg_calls_per_sync,
  COUNT(DISTINCT user_id) AS unique_users,
  ROUND(SUM(api_calls_made)::numeric / COUNT(DISTINCT user_id), 2) AS calls_per_user,
  ROUND(SUM(api_calls_saved)::numeric / COUNT(DISTINCT user_id), 2) AS saved_per_user,
  ROUND((SUM(api_calls_saved)::numeric / NULLIF(SUM(api_calls_made) + SUM(api_calls_saved), 0)) * 100, 2) AS reduction_percentage
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
GROUP BY integration_type;
"

echo ""
echo "Optimization breakdown:"
echo ""

psql $DATABASE_URL -c "
SELECT 
  integration_type,
  skip_reason,
  COUNT(*) AS count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
AND result = 'skipped'
GROUP BY integration_type, skip_reason
ORDER BY integration_type, count DESC;
"
```

## Test 33.3: Monitor API Usage Reduction

### Part 1: Capture Baseline Metrics

#### Step 1: Run Baseline Measurement
```bash
# Before deploying optimization
chmod +x scripts/measure-api-baseline.sh
./scripts/measure-api-baseline.sh > baseline-metrics.txt

# Save the output
cat baseline-metrics.txt
```

#### Step 2: Record Google Cloud Console Metrics
1. Navigate to Google Cloud Console
2. Go to APIs & Services > Dashboard
3. Select "Google Calendar API"
4. Note "Requests" count for last 30 days
5. Repeat for "People API" (Contacts)
6. Save screenshots

**Expected Baseline**:
```
Contacts API: ~50 calls/user/month
Calendar API: ~540 calls/user/month
Total: ~590 calls/user/month
```

### Part 2: Deploy Optimization

#### Step 1: Deploy Changes
```bash
# Deploy to production
npm run build
npm run deploy

# Or for local testing
npm run dev
```

#### Step 2: Wait for Data Collection
- **Minimum**: 7 days for initial trends
- **Recommended**: 30 days for accurate comparison
- Monitor daily to catch issues early

### Part 3: Measure Optimized Usage

#### Step 1: Run Optimized Measurement
```bash
# After 30 days of optimization
./scripts/measure-api-optimized.sh > optimized-metrics.txt

# Compare with baseline
diff baseline-metrics.txt optimized-metrics.txt
```

#### Step 2: Verify Reduction Targets

**Contacts API**:
```sql
-- Calculate reduction
SELECT 
  'Contacts' AS api,
  baseline.calls_per_user AS baseline_calls,
  optimized.calls_per_user AS optimized_calls,
  baseline.calls_per_user - optimized.calls_per_user AS calls_saved,
  ROUND(((baseline.calls_per_user - optimized.calls_per_user)::numeric / baseline.calls_per_user) * 100, 2) AS reduction_percentage
FROM 
  (SELECT AVG(api_calls_made) AS calls_per_user FROM sync_metrics 
   WHERE integration_type = 'google_contacts' 
   AND created_at < '2026-02-04') AS baseline,
  (SELECT AVG(api_calls_made) AS calls_per_user FROM sync_metrics 
   WHERE integration_type = 'google_contacts' 
   AND created_at >= '2026-02-04') AS optimized;

-- Target: ~57% reduction
```

**Calendar API**:
```sql
-- Calculate reduction
SELECT 
  'Calendar' AS api,
  baseline.calls_per_user AS baseline_calls,
  optimized.calls_per_user AS optimized_calls,
  baseline.calls_per_user - optimized.calls_per_user AS calls_saved,
  ROUND(((baseline.calls_per_user - optimized.calls_per_user)::numeric / baseline.calls_per_user) * 100, 2) AS reduction_percentage
FROM 
  (SELECT AVG(api_calls_made) AS calls_per_user FROM sync_metrics 
   WHERE integration_type = 'google_calendar' 
   AND created_at < '2026-02-04') AS baseline,
  (SELECT AVG(api_calls_made) AS calls_per_user FROM sync_metrics 
   WHERE integration_type = 'google_calendar' 
   AND created_at >= '2026-02-04') AS optimized;

-- Target: ~83% reduction
```

### Part 4: Analyze Optimization Sources

#### Step 1: Circuit Breaker Impact
```sql
-- Count syncs skipped by circuit breaker
SELECT 
  integration_type,
  COUNT(*) AS skipped_syncs,
  COUNT(DISTINCT user_id) AS affected_users,
  ROUND(AVG(api_calls_saved), 2) AS avg_calls_saved_per_skip
FROM sync_metrics
WHERE result = 'skipped'
AND skip_reason = 'circuit_breaker_open'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY integration_type;

-- Expected: 5-10% of total API call reduction
```

#### Step 2: Adaptive Scheduling Impact
```sql
-- Analyze frequency reductions
SELECT 
  integration_type,
  COUNT(*) AS users_with_reduced_frequency,
  AVG(current_frequency_ms) AS avg_frequency_ms,
  AVG(consecutive_no_changes) AS avg_no_change_count
FROM sync_schedule
WHERE current_frequency_ms > default_frequency_ms
GROUP BY integration_type;

-- Expected: 20-30% of total API call reduction
```

#### Step 3: Webhook Impact (Calendar Only)
```sql
-- Count webhook-triggered syncs vs polling
SELECT 
  sync_type,
  COUNT(*) AS sync_count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER ()) * 100, 2) AS percentage
FROM sync_metrics
WHERE integration_type = 'google_calendar'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY sync_type;

-- Expected: 
-- webhook_triggered: 60-70%
-- scheduled: 30-40%
-- manual: <5%
```

#### Step 4: Total Impact Breakdown
```sql
-- Comprehensive breakdown
SELECT 
  'Circuit Breaker' AS optimization_source,
  SUM(api_calls_saved) AS total_calls_saved,
  ROUND((SUM(api_calls_saved)::numeric / (SELECT SUM(api_calls_saved) FROM sync_metrics WHERE created_at >= NOW() - INTERVAL '30 days')) * 100, 2) AS percentage_of_total
FROM sync_metrics
WHERE skip_reason = 'circuit_breaker_open'
AND created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'Adaptive Scheduling',
  SUM(api_calls_saved),
  ROUND((SUM(api_calls_saved)::numeric / (SELECT SUM(api_calls_saved) FROM sync_metrics WHERE created_at >= NOW() - INTERVAL '30 days')) * 100, 2)
FROM sync_metrics
WHERE skip_reason = 'adaptive_frequency_reduced'
AND created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'Webhooks',
  SUM(api_calls_saved),
  ROUND((SUM(api_calls_saved)::numeric / (SELECT SUM(api_calls_saved) FROM sync_metrics WHERE created_at >= NOW() - INTERVAL '30 days')) * 100, 2)
FROM sync_metrics
WHERE sync_type = 'webhook_triggered'
AND created_at >= NOW() - INTERVAL '30 days';
```

### Part 5: Google Cloud Console Verification

#### Step 1: Check API Quotas
1. Navigate to: https://console.cloud.google.com/apis/dashboard
2. Select "Google Calendar API"
3. View "Quotas" tab
4. Compare current usage to baseline

#### Step 2: Check API Metrics
1. View "Metrics" tab
2. Select "Requests" metric
3. Set date range to last 30 days
4. Compare to baseline screenshots

**Expected Results**:
- Calendar API: 83% reduction in requests
- People API: 57% reduction in requests
- No quota limit warnings
- No error rate increase

## Verification Checklist

### Overall Reduction
- [ ] Total API calls reduced by 70-85%
- [ ] Contacts API reduced by ~57%
- [ ] Calendar API reduced by ~83%
- [ ] No increase in error rates

### Optimization Sources
- [ ] Circuit breaker: 5-10% of reduction
- [ ] Adaptive scheduling: 20-30% of reduction
- [ ] Webhooks: 40-60% of reduction (calendar only)
- [ ] All sources working together

### Data Quality
- [ ] No data staleness complaints
- [ ] Sync success rate >95%
- [ ] Webhook reliability >95%
- [ ] Manual sync usage <5% of total

### Cost Impact
- [ ] Google API costs reduced proportionally
- [ ] Server resource usage reduced
- [ ] Database load reduced
- [ ] No performance degradation

## Troubleshooting

### Reduction Below Target
**Check**:
1. Are all optimization features enabled?
2. Are webhooks registering successfully?
3. Is adaptive scheduling working?
4. Are circuit breakers opening when needed?

**Debug**:
```sql
-- Check feature adoption
SELECT 
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM calendar_webhook_subscriptions 
    WHERE calendar_webhook_subscriptions.user_id = users.id
  )) AS users_with_webhooks,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM sync_schedule 
    WHERE sync_schedule.user_id = users.id 
    AND current_frequency_ms > default_frequency_ms
  )) AS users_with_adaptive_frequency,
  COUNT(*) AS total_users
FROM users
WHERE EXISTS (
  SELECT 1 FROM oauth_tokens 
  WHERE oauth_tokens.user_id = users.id
);
```

### Higher Error Rates
**Check**:
1. Are circuit breakers opening too aggressively?
2. Are webhooks failing?
3. Are token refreshes failing?

**Debug**:
```sql
-- Check error patterns
SELECT 
  integration_type,
  error_message,
  COUNT(*) AS error_count
FROM sync_metrics
WHERE result = 'failure'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY integration_type, error_message
ORDER BY error_count DESC;
```

## Success Criteria

✅ **Pass**: 70-85% total API call reduction achieved
✅ **Pass**: Contacts API reduced by ~57%
✅ **Pass**: Calendar API reduced by ~83%
✅ **Pass**: No increase in error rates
✅ **Pass**: No data quality issues

❌ **Fail**: Reduction below 70%
❌ **Fail**: Error rates increased
❌ **Fail**: Data staleness complaints
❌ **Fail**: User experience degraded

## Reporting

### Monthly Report Template

```markdown
# API Usage Reduction Report - [Month Year]

## Summary
- **Total Reduction**: X%
- **Contacts API**: X% reduction
- **Calendar API**: X% reduction
- **Cost Savings**: $X/month

## Breakdown by Optimization
- Circuit Breaker: X% of reduction
- Adaptive Scheduling: X% of reduction
- Webhooks: X% of reduction

## User Impact
- Active Users: X
- Sync Success Rate: X%
- Webhook Reliability: X%
- Manual Sync Usage: X%

## Issues
- [List any issues or concerns]

## Recommendations
- [List any recommendations for improvement]
```

## Next Steps

After completing this test:
1. Generate monthly API usage report
2. Proceed to Test 33.4 (User Experience Monitoring)
3. Continue monitoring for trends
4. Adjust optimization parameters if needed
