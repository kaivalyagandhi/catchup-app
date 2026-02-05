#!/bin/bash
# Measure API Usage Baseline
# Run this BEFORE deploying sync optimization

set -e

echo "Measuring API Usage Baseline"
echo "============================="
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
  ROUND(AVG(api_calls_made), 2) AS avg_calls_per_sync,
  COUNT(DISTINCT user_id) AS unique_users,
  ROUND(SUM(api_calls_made)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) AS calls_per_user
FROM sync_metrics
WHERE created_at >= '$START_DATE'
AND created_at <= '$END_DATE'
AND result = 'success'
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
echo "Baseline measurement complete."
echo "Save these numbers for comparison after optimization deployment."
echo ""
echo "Expected baseline (per user, per month):"
echo "  Contacts API: ~50 calls"
echo "  Calendar API: ~540 calls"
echo "  Total: ~590 calls"
