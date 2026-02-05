# Quick Test Reference Guide

## Overview

This is a quick reference for running all final tests for the Google Sync Optimization feature.

## Prerequisites

```bash
# Ensure environment is set up
export DATABASE_URL="postgresql://user:password@localhost:5432/catchup_db"

# Make scripts executable
chmod +x scripts/measure-api-baseline.sh
chmod +x scripts/measure-api-optimized.sh
chmod +x scripts/monitor-user-experience.sh
```

## Test Execution Order

### 1. Pre-Deployment: Capture Baseline

```bash
# Capture baseline API usage
./scripts/measure-api-baseline.sh > baseline-metrics.txt

# Review baseline
cat baseline-metrics.txt
```

**Expected Output**:
- Contacts API: ~50 calls/user/month
- Calendar API: ~540 calls/user/month
- Total: ~590 calls/user/month

### 2. Deploy Optimization

```bash
# Build and deploy
npm run build
npm run deploy

# Verify migrations
npm run migrate

# Check background jobs
npm run job:status
```

### 3. Day 1-7: Initial Testing

#### Test Onboarding Flow
```bash
# Open test guide
open docs/testing/E2E_ONBOARDING_TEST_GUIDE.md

# Manual testing steps:
# 1. Create new user account
# 2. Connect Google Contacts
# 3. Verify immediate sync
# 4. Check progress UI
# 5. Verify 1-hour frequency
```

#### Test Webhook Flow
```bash
# Open test guide
open docs/testing/E2E_WEBHOOK_TEST_GUIDE.md

# Manual testing steps:
# 1. Connect Google Calendar
# 2. Verify webhook registration
# 3. Make calendar change
# 4. Verify notification received
# 5. Check 12-hour polling
```

#### Daily Monitoring
```bash
# Run daily UX monitoring
./scripts/monitor-user-experience.sh

# Check for alerts
# Review metrics
```

### 4. Day 30: Final Verification

#### Measure Optimized Usage
```bash
# Capture optimized metrics
./scripts/measure-api-optimized.sh > optimized-metrics.txt

# Compare with baseline
diff baseline-metrics.txt optimized-metrics.txt
```

**Expected Results**:
- Contacts API: ~25 calls/user/month (57% reduction)
- Calendar API: ~90 calls/user/month (83% reduction)
- Total: ~115 calls/user/month (80% reduction)

#### Generate Final Report
```bash
# Review all metrics
cat baseline-metrics.txt
cat optimized-metrics.txt

# Check UX metrics
./scripts/monitor-user-experience.sh
```

## Quick Verification Queries

### Check Onboarding Success Rate
```sql
SELECT 
  integration_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE result = 'success') AS successful,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / COUNT(*)) * 100, 2) AS success_rate
FROM sync_metrics
WHERE sync_type = 'initial'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY integration_type;
```

**Target**: >95% success rate

### Check Webhook Reliability
```sql
SELECT 
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE result = 'success') AS successful,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / COUNT(*)) * 100, 2) AS reliability
FROM webhook_notifications
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Target**: >95% reliability

### Check Manual Sync Usage
```sql
SELECT 
  integration_type,
  COUNT(*) FILTER (WHERE sync_type = 'manual') AS manual,
  COUNT(*) AS total,
  ROUND((COUNT(*) FILTER (WHERE sync_type = 'manual')::numeric / COUNT(*)) * 100, 2) AS manual_percentage
FROM sync_metrics
WHERE result = 'success'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY integration_type;
```

**Target**: <5% manual syncs

### Check API Reduction
```sql
SELECT 
  integration_type,
  SUM(api_calls_made) AS total_calls,
  SUM(api_calls_saved) AS total_saved,
  ROUND((SUM(api_calls_saved)::numeric / (SUM(api_calls_made) + SUM(api_calls_saved))) * 100, 2) AS reduction_percentage
FROM sync_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY integration_type;
```

**Target**: 70-85% reduction

## Troubleshooting Commands

### Check Background Jobs
```bash
# List all jobs
npm run job:list

# Check job status
npm run job:status

# Manually trigger jobs
npm run job:webhook-health-check
npm run job:token-refresh
npm run job:webhook-renewal
```

### Check Database State
```sql
-- Webhook subscriptions
SELECT COUNT(*) FROM calendar_webhook_subscriptions;

-- Sync schedules
SELECT integration_type, COUNT(*) FROM sync_schedule GROUP BY integration_type;

-- Circuit breaker states
SELECT integration_type, state, COUNT(*) FROM circuit_breaker_state GROUP BY integration_type, state;

-- Token health
SELECT integration_type, status, COUNT(*) FROM token_health GROUP BY integration_type, status;
```

### Check Logs
```bash
# Application logs
tail -f logs/app.log

# Filter for errors
tail -f logs/app.log | grep ERROR

# Filter for webhooks
tail -f logs/app.log | grep webhook

# Filter for sync
tail -f logs/app.log | grep sync
```

## Success Checklist

### API Usage Reduction
- [ ] Baseline metrics captured
- [ ] Optimized metrics measured after 30 days
- [ ] Contacts API: ~57% reduction
- [ ] Calendar API: ~83% reduction
- [ ] Total: 70-85% reduction

### User Experience
- [ ] Onboarding success rate >95%
- [ ] Webhook reliability >95%
- [ ] <5% stale data complaints
- [ ] <5% manual sync usage
- [ ] User satisfaction >4.0/5.0

### System Health
- [ ] All background jobs running
- [ ] No performance degradation
- [ ] Admin dashboard functional
- [ ] No increase in error rates

## Quick Links

### Documentation
- [Final Testing Summary](./FINAL_TESTING_SUMMARY.md)
- [E2E Onboarding Test](./E2E_ONBOARDING_TEST_GUIDE.md)
- [E2E Webhook Test](./E2E_WEBHOOK_TEST_GUIDE.md)
- [API Usage Monitoring](./API_USAGE_MONITORING_GUIDE.md)
- [User Experience Monitoring](./USER_EXPERIENCE_MONITORING_GUIDE.md)

### Scripts
- `scripts/measure-api-baseline.sh`
- `scripts/measure-api-optimized.sh`
- `scripts/monitor-user-experience.sh`

### Admin Tools
- Admin Dashboard: `/admin/sync-health.html`
- Promote Admin: `npm run promote-admin -- promote user@example.com`

## Support

If you encounter issues:
1. Check the troubleshooting section in each test guide
2. Review logs for error messages
3. Run verification queries to check database state
4. Consult the [Final Testing Summary](./FINAL_TESTING_SUMMARY.md)
