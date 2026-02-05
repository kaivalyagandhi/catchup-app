#!/bin/bash
# Measure Optimized API Usage
# Run this AFTER deploying sync optimization (wait 30 days for accurate data)

set -e

echo "Measuring Optimized API Usage"
echo "=============================="
echo ""

# Get date range (last 30 days)
START_DATE=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "Date Range: $START_DATE to $END_DATE"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL and try again"
  exit 1
fi

echo "Overall Metrics:"
echo "----------------"

# Query database for metrics
psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  COUNT(*) AS total_syncs,
  SUM(api_calls_made) AS total_api_calls,
  SUM(api_calls_saved) AS total_api_calls_saved,
  ROUND(AVG(api_calls_made), 2) AS avg_calls_per_sync,
  COUNT(DISTINCT user_id) AS unique_users,
  ROUND(SUM(api_calls_made)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) AS calls_per_user,
  ROUND(SUM(api_calls_saved)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) AS saved_per_user,
  ROUND((SUM(api_calls_saved)::numeric / NULLIF(SUM(api_calls_made) + SUM(api_calls_saved), 0)) * 100, 2) AS reduction_percentage
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
GROUP BY integration_type
ORDER BY integration_type;
"

echo ""
echo "Sync Result Breakdown:"
echo "----------------------"

psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  result,
  COUNT(*) AS count,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
GROUP BY integration_type, result
ORDER BY integration_type, count DESC;
"

echo ""
echo "Optimization Breakdown (Skipped Syncs):"
echo "----------------------------------------"

psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  skip_reason,
  COUNT(*) AS count,
  SUM(api_calls_saved) AS total_calls_saved,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY integration_type)) * 100, 2) AS percentage_of_skips
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
AND result = 'skipped'
GROUP BY integration_type, skip_reason
ORDER BY integration_type, count DESC;
"

echo ""
echo "Webhook Impact (Calendar Only):"
echo "--------------------------------"

psql "$DATABASE_URL" -c "
SELECT 
  sync_type,
  COUNT(*) AS sync_count,
  SUM(api_calls_made) AS total_api_calls,
  ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER ()) * 100, 2) AS percentage_of_syncs
FROM sync_metrics
WHERE integration_type = 'google_calendar'
AND created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
AND result = 'success'
GROUP BY sync_type
ORDER BY sync_count DESC;
"

echo ""
echo "Adaptive Scheduling Impact:"
echo "---------------------------"

psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  COUNT(*) AS users_with_reduced_frequency,
  ROUND(AVG(current_frequency_ms) / 3600000.0, 2) AS avg_frequency_hours,
  ROUND(AVG(default_frequency_ms) / 3600000.0, 2) AS default_frequency_hours,
  ROUND(AVG(consecutive_no_changes), 2) AS avg_no_change_count
FROM sync_schedule
WHERE current_frequency_ms > default_frequency_ms
GROUP BY integration_type;
"

echo ""
echo "Circuit Breaker Impact:"
echo "-----------------------"

psql "$DATABASE_URL" -c "
SELECT 
  integration_type,
  state,
  COUNT(*) AS user_count
FROM circuit_breaker_state
GROUP BY integration_type, state
ORDER BY integration_type, user_count DESC;
"

echo ""
echo "Optimization measurement complete."
echo ""
echo "Target reductions:"
echo "  Contacts API: ~57% reduction (~25 calls/user/month)"
echo "  Calendar API: ~83% reduction (~90 calls/user/month)"
echo "  Total: 70-85% reduction (~115 calls/user/month)"
