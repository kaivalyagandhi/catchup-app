#!/bin/bash
# User Experience Monitoring Script
# Run daily to track key UX metrics

set -e

echo "User Experience Monitoring Report"
echo "=================================="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL and try again"
  exit 1
fi

echo "1. Onboarding Sync Success Rate (Last 7 Days)"
echo "----------------------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  DATE(created_at) AS date,
  integration_type,
  COUNT(*) AS total_onboarding_syncs,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_syncs,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed_syncs,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS success_rate_percentage
FROM sync_metrics
WHERE sync_type = 'initial'
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), integration_type
ORDER BY date DESC, integration_type;
"

echo ""
echo "2. Webhook Reliability (Last 7 Days)"
echo "-------------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE result = 'success') AS successful_notifications,
  COUNT(*) FILTER (WHERE result = 'failure') AS failed_notifications,
  ROUND((COUNT(*) FILTER (WHERE result = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS reliability_percentage
FROM webhook_notifications
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
"

echo ""
echo "3. Manual Sync Usage (Last 7 Days)"
echo "-----------------------------------"
psql "$DATABASE_URL" -c "
SELECT 
  DATE(created_at) AS date,
  integration_type,
  COUNT(*) FILTER (WHERE sync_type = 'manual') AS manual_syncs,
  COUNT(*) AS total_syncs,
  ROUND((COUNT(*) FILTER (WHERE sync_type = 'manual')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS manual_sync_percentage
FROM sync_metrics
WHERE result = 'success'
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), integration_type
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
  ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - last_sync_at)) / 3600), 2) AS max_hours_since_sync
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
SELECT COALESCE(
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 
    2
  ), 
  100
)
FROM sync_metrics
WHERE sync_type = 'initial'
AND created_at >= CURRENT_DATE - INTERVAL '7 days';
" | tr -d ' ')

if [ -n "$ONBOARDING_SUCCESS" ]; then
  if (( $(echo "$ONBOARDING_SUCCESS < 95" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠️  ALERT: Onboarding success rate is below 95% ($ONBOARDING_SUCCESS%)"
  fi
fi

# Alert if webhook reliability < 95%
WEBHOOK_RELIABILITY=$(psql "$DATABASE_URL" -t -c "
SELECT COALESCE(
  ROUND(
    (COUNT(*) FILTER (WHERE result = 'success')::numeric / NULLIF(COUNT(*), 0)) * 100, 
    2
  ), 
  100
)
FROM webhook_notifications
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
" | tr -d ' ')

if [ -n "$WEBHOOK_RELIABILITY" ]; then
  if (( $(echo "$WEBHOOK_RELIABILITY < 95" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠️  ALERT: Webhook reliability is below 95% ($WEBHOOK_RELIABILITY%)"
  fi
fi

# Alert if manual sync usage > 5%
MANUAL_SYNC_USAGE=$(psql "$DATABASE_URL" -t -c "
SELECT COALESCE(
  ROUND(
    (COUNT(*) FILTER (WHERE sync_type = 'manual')::numeric / NULLIF(COUNT(*), 0)) * 100, 
    2
  ), 
  0
)
FROM sync_metrics
WHERE result = 'success'
AND created_at >= CURRENT_DATE - INTERVAL '7 days';
" | tr -d ' ')

if [ -n "$MANUAL_SYNC_USAGE" ]; then
  if (( $(echo "$MANUAL_SYNC_USAGE > 5" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠️  ALERT: Manual sync usage is above 5% ($MANUAL_SYNC_USAGE%)"
  fi
fi

if [ -z "$ONBOARDING_SUCCESS" ] && [ -z "$WEBHOOK_RELIABILITY" ] && [ -z "$MANUAL_SYNC_USAGE" ]; then
  echo "✅ All metrics within target ranges"
fi

echo ""
echo "Monitoring complete."
echo ""
echo "Target Metrics:"
echo "  - Onboarding Success Rate: >95%"
echo "  - Webhook Reliability: >95%"
echo "  - Manual Sync Usage: <5%"
