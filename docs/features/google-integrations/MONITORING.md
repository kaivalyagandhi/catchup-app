# Google Sync Optimization Monitoring and Alerting Guide

## Overview

This guide provides comprehensive monitoring and alerting strategies for the Google Sync Optimization feature. Proper monitoring ensures system health, early detection of issues, and optimal performance.

## Table of Contents

1. [Key Metrics](#key-metrics)
2. [Dashboard Setup](#dashboard-setup)
3. [Alert Configuration](#alert-configuration)
4. [Log Analysis](#log-analysis)
5. [Performance Monitoring](#performance-monitoring)
6. [Troubleshooting Workflows](#troubleshooting-workflows)

## Key Metrics

### Sync Health Metrics

#### Total Users with Integrations
**Metric**: `sync.users.total`

**Description**: Count of users with at least one Google integration (Contacts or Calendar)

**Query**:
```sql
SELECT COUNT(DISTINCT user_id) 
FROM oauth_tokens 
WHERE integration_type IN ('google_contacts', 'google_calendar');
```

**Healthy Range**: Steady growth or stable

**Alert Threshold**: Sudden drop > 5%

---

#### Active Integrations
**Metric**: `sync.integrations.active.{contacts|calendar}`

**Description**: Count of active connections per integration type

**Query**:
```sql
SELECT 
  integration_type,
  COUNT(*) as active_count
FROM oauth_tokens
WHERE integration_type IN ('google_contacts', 'google_calendar')
GROUP BY integration_type;
```

**Healthy Range**: Steady growth or stable

**Alert Threshold**: Drop > 10% in 24 hours

---

#### Invalid Tokens
**Metric**: `sync.tokens.invalid.{contacts|calendar}`

**Description**: Count of users with expired or revoked tokens

**Query**:
```sql
SELECT 
  integration_type,
  COUNT(*) as invalid_count
FROM token_health
WHERE status IN ('expired', 'revoked')
GROUP BY integration_type;
```

**Healthy Range**: < 5% of total users

**Alert Thresholds**:
- Warning: > 5% of users
- Critical: > 10% of users

---

#### Open Circuit Breakers
**Metric**: `sync.circuit_breaker.open.{contacts|calendar}`

**Description**: Count of users with circuit breakers in open state

**Query**:
```sql
SELECT 
  integration_type,
  COUNT(*) as open_count
FROM circuit_breaker_state
WHERE state = 'open'
GROUP BY integration_type;
```

**Healthy Range**: < 2% of total users

**Alert Thresholds**:
- Warning: > 2% of users
- Critical: > 5% of users

---

#### Sync Success Rate (24h)
**Metric**: `sync.success_rate.24h.{contacts|calendar}`

**Description**: Percentage of successful syncs in the last 24 hours

**Query**:
```sql
SELECT 
  integration_type,
  (COUNT(*) FILTER (WHERE result = 'success')::float / COUNT(*)) * 100 as success_rate
FROM sync_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY integration_type;
```

**Healthy Range**: > 95%

**Alert Thresholds**:
- Warning: < 90%
- Critical: < 80%

---

#### API Calls Saved
**Metric**: `sync.api_calls_saved.{circuit_breaker|adaptive|webhooks|total}`

**Description**: Estimated API calls saved by optimization features

**Query**:
```sql
SELECT 
  SUM(api_calls_saved) FILTER (WHERE skip_reason = 'circuit_breaker_open') as by_circuit_breaker,
  SUM(api_calls_saved) FILTER (WHERE skip_reason = 'adaptive_scheduling') as by_adaptive,
  SUM(api_calls_saved) FILTER (WHERE sync_type = 'webhook_triggered') as by_webhooks,
  SUM(api_calls_saved) as total
FROM sync_metrics
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Healthy Range**: 70-90% reduction

**Alert Threshold**: < 50% reduction (optimization not working)

---

#### Persistent Failures
**Metric**: `sync.failures.persistent`

**Description**: Users with sync failures lasting > 7 days

**Query**:
```sql
SELECT 
  user_id,
  integration_type,
  last_failure_at,
  failure_count,
  last_failure_reason
FROM circuit_breaker_state
WHERE state = 'open'
  AND last_failure_at < NOW() - INTERVAL '7 days'
ORDER BY last_failure_at ASC;
```

**Healthy Range**: < 10 users

**Alert Thresholds**:
- Warning: > 10 users
- Critical: > 20 users

---

### Performance Metrics

#### Sync Duration
**Metric**: `sync.duration.{p50|p95|p99}.{contacts|calendar}`

**Description**: Sync execution time percentiles

**Query**:
```sql
SELECT 
  integration_type,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
FROM sync_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND result = 'success'
GROUP BY integration_type;
```

**Healthy Range**:
- Contacts: p95 < 30s
- Calendar: p95 < 10s

**Alert Threshold**: p95 > 60s

---

#### Token Refresh Success Rate
**Metric**: `sync.token_refresh.success_rate`

**Description**: Percentage of successful token refreshes

**Query**:
```sql
SELECT 
  (COUNT(*) FILTER (WHERE status = 'valid')::float / COUNT(*)) * 100 as success_rate
FROM token_health
WHERE last_checked > NOW() - INTERVAL '24 hours'
  AND status IN ('valid', 'expired', 'revoked');
```

**Healthy Range**: > 95%

**Alert Thresholds**:
- Warning: < 90%
- Critical: < 80%

---

#### Webhook Renewal Success Rate
**Metric**: `sync.webhook_renewal.success_rate`

**Description**: Percentage of successful webhook renewals

**Query**:
```sql
SELECT 
  (COUNT(*) FILTER (WHERE expiration > NOW())::float / COUNT(*)) * 100 as success_rate
FROM calendar_webhook_subscriptions
WHERE updated_at > NOW() - INTERVAL '24 hours';
```

**Healthy Range**: > 95%

**Alert Thresholds**:
- Warning: < 90%
- Critical: < 80%

---

#### Background Job Duration
**Metric**: `sync.job.duration.{token_refresh|webhook_renewal|notification_reminder|adaptive_sync}`

**Description**: Background job execution time

**Healthy Range**:
- Token refresh: < 5 minutes
- Webhook renewal: < 2 minutes
- Notification reminder: < 1 minute
- Adaptive sync: < 30 minutes

**Alert Threshold**: > 2x healthy range

---

### Error Metrics

#### Sync Failure Rate
**Metric**: `sync.failure_rate.{contacts|calendar}`

**Description**: Percentage of failed syncs

**Query**:
```sql
SELECT 
  integration_type,
  (COUNT(*) FILTER (WHERE result = 'failure')::float / COUNT(*)) * 100 as failure_rate
FROM sync_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY integration_type;
```

**Healthy Range**: < 5%

**Alert Thresholds**:
- Warning: > 10%
- Critical: > 20%

---

#### Error Distribution
**Metric**: `sync.errors.by_type`

**Description**: Count of errors by error message

**Query**:
```sql
SELECT 
  error_message,
  COUNT(*) as error_count
FROM sync_metrics
WHERE result = 'failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY error_count DESC
LIMIT 10;
```

**Use**: Identify most common errors for prioritization

---

## Dashboard Setup

### Admin Sync Health Dashboard

**Location**: `/admin/sync-health.html`

**Sections**:
1. Overview Metrics
2. API Calls Saved
3. Persistent Failures
4. Filters and Export

**Auto-Refresh**: Every 5 minutes

**Access**: Admin role required

### Custom Monitoring Dashboard

Create a custom dashboard with these panels:

#### Panel 1: Sync Success Rate (24h)
```
Graph Type: Line chart
Metrics: sync.success_rate.24h.contacts, sync.success_rate.24h.calendar
Time Range: Last 7 days
Threshold Lines: 95% (green), 90% (yellow), 80% (red)
```

#### Panel 2: Invalid Tokens
```
Graph Type: Stacked bar chart
Metrics: sync.tokens.invalid.contacts, sync.tokens.invalid.calendar
Time Range: Last 30 days
Threshold Lines: 5% (yellow), 10% (red)
```

#### Panel 3: Open Circuit Breakers
```
Graph Type: Stacked bar chart
Metrics: sync.circuit_breaker.open.contacts, sync.circuit_breaker.open.calendar
Time Range: Last 30 days
Threshold Lines: 2% (yellow), 5% (red)
```

#### Panel 4: API Calls Saved
```
Graph Type: Stacked area chart
Metrics: 
  - sync.api_calls_saved.circuit_breaker
  - sync.api_calls_saved.adaptive
  - sync.api_calls_saved.webhooks
Time Range: Last 30 days
```

#### Panel 5: Sync Duration (p95)
```
Graph Type: Line chart
Metrics: sync.duration.p95.contacts, sync.duration.p95.calendar
Time Range: Last 7 days
Threshold Lines: 30s (yellow), 60s (red)
```

#### Panel 6: Persistent Failures
```
Graph Type: Single stat
Metric: sync.failures.persistent
Time Range: Current
Threshold: 10 (yellow), 20 (red)
```

#### Panel 7: Background Job Status
```
Graph Type: Status table
Metrics: 
  - sync.job.last_run.token_refresh
  - sync.job.last_run.webhook_renewal
  - sync.job.last_run.notification_reminder
  - sync.job.last_run.adaptive_sync
Time Range: Last 24 hours
```

#### Panel 8: Error Distribution
```
Graph Type: Pie chart
Metric: sync.errors.by_type
Time Range: Last 24 hours
```

## Alert Configuration

### Critical Alerts

#### Alert 1: Low Sync Success Rate
```yaml
name: Low Sync Success Rate
condition: sync.success_rate.24h < 80%
severity: critical
notification: email, slack, pagerduty
message: |
  Sync success rate has dropped below 80%
  Current rate: {value}%
  Integration: {integration_type}
  Action: Investigate sync failures immediately
```

#### Alert 2: High Invalid Token Count
```yaml
name: High Invalid Token Count
condition: sync.tokens.invalid > 10% of total users
severity: critical
notification: email, slack
message: |
  Invalid token count exceeds 10% of users
  Current count: {value}
  Integration: {integration_type}
  Action: Check token refresh job and notify users
```

#### Alert 3: High Circuit Breaker Open Count
```yaml
name: High Circuit Breaker Open Count
condition: sync.circuit_breaker.open > 5% of total users
severity: critical
notification: email, slack
message: |
  Open circuit breaker count exceeds 5% of users
  Current count: {value}
  Integration: {integration_type}
  Action: Investigate widespread sync failures
```

#### Alert 4: Background Job Failure
```yaml
name: Background Job Failure
condition: job fails 3 consecutive times
severity: critical
notification: email, slack, pagerduty
message: |
  Background job has failed 3 consecutive times
  Job: {job_name}
  Last error: {error_message}
  Action: Check job logs and restart if needed
```

### Warning Alerts

#### Alert 5: Moderate Sync Success Rate
```yaml
name: Moderate Sync Success Rate
condition: sync.success_rate.24h < 90%
severity: warning
notification: email, slack
message: |
  Sync success rate has dropped below 90%
  Current rate: {value}%
  Integration: {integration_type}
  Action: Monitor for further degradation
```

#### Alert 6: Moderate Invalid Token Count
```yaml
name: Moderate Invalid Token Count
condition: sync.tokens.invalid > 5% of total users
severity: warning
notification: email, slack
message: |
  Invalid token count exceeds 5% of users
  Current count: {value}
  Integration: {integration_type}
  Action: Monitor token refresh success rate
```

#### Alert 7: Moderate Circuit Breaker Open Count
```yaml
name: Moderate Circuit Breaker Open Count
condition: sync.circuit_breaker.open > 2% of total users
severity: warning
notification: email, slack
message: |
  Open circuit breaker count exceeds 2% of users
  Current count: {value}
  Integration: {integration_type}
  Action: Review error patterns
```

#### Alert 8: High Sync Duration
```yaml
name: High Sync Duration
condition: sync.duration.p95 > 60s
severity: warning
notification: email, slack
message: |
  Sync duration p95 exceeds 60 seconds
  Current p95: {value}s
  Integration: {integration_type}
  Action: Investigate performance issues
```

#### Alert 9: Low Token Refresh Success Rate
```yaml
name: Low Token Refresh Success Rate
condition: sync.token_refresh.success_rate < 90%
severity: warning
notification: email, slack
message: |
  Token refresh success rate below 90%
  Current rate: {value}%
  Action: Check token refresh job logs
```

#### Alert 10: Low Webhook Renewal Success Rate
```yaml
name: Low Webhook Renewal Success Rate
condition: sync.webhook_renewal.success_rate < 90%
severity: warning
notification: email, slack
message: |
  Webhook renewal success rate below 90%
  Current rate: {value}%
  Action: Check webhook renewal job logs
```

### Alert Notification Channels

#### Email
```yaml
recipients:
  - devops@your-domain.com
  - backend-team@your-domain.com
format: html
include_graphs: true
```

#### Slack
```yaml
channel: #sync-alerts
mention: @backend-team
format: markdown
include_links: true
```

#### PagerDuty
```yaml
service: google-sync-optimization
escalation_policy: backend-on-call
severity_mapping:
  critical: high
  warning: low
```

## Log Analysis

### Log Locations

```bash
# Application logs
logs/app.log

# Sync-specific logs
logs/sync.log

# Admin access logs
logs/admin-access.log

# Background job logs
logs/jobs.log

# Error logs
logs/error.log
```

### Log Formats

#### Sync Log Entry
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "message": "Sync completed",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "integrationType": "contacts",
  "syncType": "incremental",
  "result": "success",
  "duration": 12500,
  "itemsProcessed": 150,
  "apiCallsSaved": 5
}
```

#### Error Log Entry
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "error",
  "message": "Sync failed",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "integrationType": "contacts",
  "error": "Token expired",
  "stack": "Error: Token expired\n  at ..."
}
```

### Log Queries

#### Find Most Common Errors
```bash
# Using grep and sort
grep '"level":"error"' logs/sync.log | \
  jq -r '.error' | \
  sort | uniq -c | sort -rn | head -10
```

#### Find Slowest Syncs
```bash
# Using jq
jq -r 'select(.duration > 30000) | "\(.timestamp) \(.userId) \(.duration)ms"' logs/sync.log | \
  sort -k3 -rn | head -10
```

#### Find Users with Repeated Failures
```bash
# Using jq
jq -r 'select(.result == "failure") | .userId' logs/sync.log | \
  sort | uniq -c | sort -rn | head -10
```

#### Track Token Refresh Success
```bash
# Using grep
grep "Token refresh" logs/jobs.log | \
  grep -o "refreshed: [0-9]*, failed: [0-9]*"
```

### Log Aggregation

Use a log aggregation service (e.g., ELK Stack, Splunk, Datadog) for advanced analysis:

#### Query 1: Sync Success Rate by Hour
```
index=sync_logs result=* 
| timechart span=1h count by result
```

#### Query 2: Error Distribution
```
index=sync_logs level=error 
| stats count by error 
| sort -count
```

#### Query 3: Sync Duration Percentiles
```
index=sync_logs result=success 
| stats p50(duration), p95(duration), p99(duration) by integrationType
```

## Performance Monitoring

### Database Performance

#### Query Performance
```sql
-- Find slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%sync%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### Index Usage
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN (
  'token_health',
  'circuit_breaker_state',
  'sync_schedule',
  'sync_metrics'
)
ORDER BY idx_scan DESC;
```

#### Table Size
```sql
-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'token_health',
  'circuit_breaker_state',
  'sync_schedule',
  'sync_metrics'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### API Performance

#### Response Time
```
Metric: api.response_time.{endpoint}
Healthy Range: p95 < 500ms
Alert Threshold: p95 > 1000ms
```

#### Request Rate
```
Metric: api.requests.{endpoint}
Healthy Range: Steady or growing
Alert Threshold: Sudden spike > 2x normal
```

#### Error Rate
```
Metric: api.errors.{endpoint}
Healthy Range: < 1%
Alert Threshold: > 5%
```

### System Resources

#### CPU Usage
```
Metric: system.cpu.usage
Healthy Range: < 70%
Alert Threshold: > 90%
```

#### Memory Usage
```
Metric: system.memory.usage
Healthy Range: < 80%
Alert Threshold: > 95%
```

#### Disk Usage
```
Metric: system.disk.usage
Healthy Range: < 80%
Alert Threshold: > 90%
```

## Troubleshooting Workflows

### Workflow 1: Low Sync Success Rate

1. **Check Dashboard**: View sync success rate trend
2. **Identify Pattern**: Is it specific to Contacts or Calendar?
3. **Check Error Distribution**: What are the most common errors?
4. **Check Token Health**: Are many tokens invalid?
5. **Check Circuit Breakers**: Are many circuit breakers open?
6. **Check Google API Status**: Is Google having issues?
7. **Review Logs**: Look for error patterns
8. **Take Action**: Based on findings

### Workflow 2: High Invalid Token Count

1. **Check Token Refresh Job**: Is it running?
2. **Check Refresh Success Rate**: Are refreshes failing?
3. **Check Logs**: Look for refresh errors
4. **Verify Refresh Tokens**: Are they stored?
5. **Check Google OAuth**: Are credentials valid?
6. **Notify Users**: Send re-authentication reminders
7. **Monitor**: Track improvement

### Workflow 3: High Circuit Breaker Open Count

1. **Check Error Distribution**: What's causing failures?
2. **Check Token Health**: Are tokens the issue?
3. **Check Google API Status**: Is Google having issues?
4. **Check Network**: Are there connectivity issues?
5. **Review Circuit Breaker Config**: Is threshold too low?
6. **Take Action**: Fix root cause
7. **Reset Circuit Breakers**: If issue resolved

### Workflow 4: Background Job Failure

1. **Check Job Logs**: What's the error?
2. **Check Database**: Is it accessible?
3. **Check Google API**: Is it accessible?
4. **Check Resources**: CPU, memory, disk
5. **Restart Job**: If transient issue
6. **Fix Code**: If bug found
7. **Monitor**: Ensure job succeeds

## Related Documentation

- **Admin Guide**: `docs/features/google-integrations/ADMIN_GUIDE.md`
- **API Reference**: `docs/API.md`
- **Deployment Guide**: `docs/development/SYNC_OPTIMIZATION_DEPLOYMENT.md`
- **Google Integrations**: `.kiro/steering/google-integrations.md`

## Support

For monitoring issues:
- Check dashboard at `/admin/sync-health.html`
- Review logs in `logs/` directory
- Run diagnostic queries
- Contact DevOps team
