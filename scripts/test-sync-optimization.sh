#!/bin/bash

# Google Sync Optimization - Quick Test Script
# This script helps you test all the new features locally

set -e

echo "======================================"
echo "Google Sync Optimization Test Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3000/ > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo ""

# Check database tables
echo "2. Checking database tables..."
TABLES=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('token_health', 'circuit_breaker_state', 'sync_schedule', 'calendar_webhook_subscriptions', 'sync_metrics');")
if [ "$TABLES" -eq 5 ]; then
    echo -e "${GREEN}✓ All 5 tables exist${NC}"
else
    echo -e "${RED}✗ Missing tables. Found: $TABLES/5${NC}"
    echo "Run migrations: npm run db:migrate"
fi
echo ""

# Check for admin users
echo "3. Checking for admin users..."
ADMINS=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(*) FROM users WHERE is_admin = true;")
if [ "$ADMINS" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $ADMINS admin user(s)${NC}"
    psql -h localhost -U postgres -d catchup_db -c "SELECT email, name FROM users WHERE is_admin = true;"
else
    echo -e "${YELLOW}⚠ No admin users found${NC}"
    echo "Promote a user: npm run promote-admin -- promote your-email@example.com"
fi
echo ""

# Check for users with Google integrations
echo "4. Checking for users with Google integrations..."
USERS=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(DISTINCT user_id) FROM oauth_tokens WHERE provider IN ('google_contacts', 'google_calendar');")
if [ "$USERS" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $USERS user(s) with Google integrations${NC}"
else
    echo -e "${YELLOW}⚠ No users with Google integrations${NC}"
    echo "Connect Google account through the app first"
fi
echo ""

# Test admin dashboard HTML
echo "5. Testing admin dashboard HTML..."
if curl -s http://localhost:3000/admin/sync-health.html | grep -q "Sync Health Dashboard"; then
    echo -e "${GREEN}✓ Admin dashboard HTML loads${NC}"
    echo "   URL: http://localhost:3000/admin/sync-health.html"
else
    echo -e "${RED}✗ Admin dashboard HTML not found${NC}"
fi
echo ""

# Test manual sync endpoint (without auth - should return 401)
echo "6. Testing manual sync endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"integration_type":"contacts"}' \
    http://localhost:3000/api/sync/manual)
if [ "$RESPONSE" -eq 401 ]; then
    echo -e "${GREEN}✓ Manual sync endpoint responds (401 without auth)${NC}"
    echo "   Endpoint: POST /api/sync/manual"
else
    echo -e "${RED}✗ Unexpected response: $RESPONSE${NC}"
fi
echo ""

# Test admin API endpoint (without auth - should return 401)
echo "7. Testing admin API endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/sync-health)
if [ "$RESPONSE" -eq 401 ]; then
    echo -e "${GREEN}✓ Admin API endpoint responds (401 without auth)${NC}"
    echo "   Endpoint: GET /api/admin/sync-health"
else
    echo -e "${RED}✗ Unexpected response: $RESPONSE${NC}"
fi
echo ""

# Check sync metrics
echo "8. Checking sync metrics..."
METRICS=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(*) FROM sync_metrics;")
if [ "$METRICS" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $METRICS sync metric(s)${NC}"
    echo "Recent metrics:"
    psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, sync_type, result, api_calls_saved, created_at FROM sync_metrics ORDER BY created_at DESC LIMIT 3;"
else
    echo -e "${YELLOW}⚠ No sync metrics yet${NC}"
    echo "Metrics will be recorded after syncs run"
fi
echo ""

# Check token health
echo "9. Checking token health records..."
TOKEN_HEALTH=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(*) FROM token_health;")
if [ "$TOKEN_HEALTH" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $TOKEN_HEALTH token health record(s)${NC}"
    psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, status, last_checked FROM token_health LIMIT 3;"
else
    echo -e "${YELLOW}⚠ No token health records yet${NC}"
    echo "Records will be created when syncs run"
fi
echo ""

# Check circuit breaker state
echo "10. Checking circuit breaker states..."
CB_STATE=$(psql -h localhost -U postgres -d catchup_db -t -c "SELECT COUNT(*) FROM circuit_breaker_state;")
if [ "$CB_STATE" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $CB_STATE circuit breaker state(s)${NC}"
    psql -h localhost -U postgres -d catchup_db -c "SELECT user_id, integration_type, state, failure_count FROM circuit_breaker_state LIMIT 3;"
else
    echo -e "${YELLOW}⚠ No circuit breaker states yet${NC}"
    echo "States will be created when syncs run"
fi
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Login to the app: http://localhost:3000"
echo "2. Connect Google Contacts/Calendar if not already connected"
echo "3. Open admin dashboard: http://localhost:3000/admin/sync-health.html"
echo "4. Wait for automatic syncs to run (or trigger manual sync)"
echo "5. Check the dashboard for metrics and API savings"
echo ""
echo "For detailed testing instructions, see:"
echo "docs/testing/SYNC_OPTIMIZATION_LOCAL_TESTING.md"
echo ""
